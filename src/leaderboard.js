/* ================= 排行榜 =================
   全球排行榜使用 Supabase（免費方案）。把專案網址及 anon（公開）key 填入 LB_CFG 即可啟用；
   未填寫時只顯示本機紀錄。資料表設定見 setup/leaderboard.sql。 */
const LB_CFG = { url:'https://mukstblfcejgxwhkiajo.supabase.co', key:'sb_publishable_5tGW1c45cz5CHgAkR1Tvqw_1n_GW2GM' };
const lbOn = () => !!(LB_CFG.url && LB_CFG.key);
/* 新式 publishable key 不是 JWT，只放在 apikey 標頭 */
const lbHead = () => LB_CFG.key.startsWith('eyJ') ? { apikey:LB_CFG.key, Authorization:`Bearer ${LB_CFG.key}` } : { apikey:LB_CFG.key };
const LB_KEY = 'g2p-rec';
function recAll(){ try{ return JSON.parse(localStorage.getItem(LB_KEY)||'[]'); }catch(e){ return []; } }
function recSave(list){ try{ localStorage.setItem(LB_KEY, JSON.stringify(list.slice(0,30))); }catch(e){} }
/* 生涯結束時的紀錄 */
function careerRecord(ev){
  const cs = ev.cs, pl = ev.pl, top = S.honours.filter(h=>!h.silent).map(h=>h.t.replace(/^\d+ /,''));
  const pts = t => { const r = HONOUR_PTS.find(([re]) => re.test(t)); return r ? r[1] : 1; };
  const uniq = [...new Set(top)].sort((a,b) => pts(b)-pts(a)).slice(0,3);
  return { id:`${S.seed}-${S.year}-${ev.sc}`, name:fullName(), score:ev.sc, tier:ev.tier, pos:POS[S.pos].n, diff:S.diff||'normal',
    pl_apps:pl.app, goals:S.pos==='GK' ? cs.cs : cs.g, caps:S.caps||0, honours:uniq.join('、').slice(0,190), ver:GAME_VER, d:new Date().toISOString().slice(0,10) };
}
function recAdd(r){ const list = recAll().filter(x => x.id!==r.id); list.push(r); list.sort((a,b) => b.score-a.score); recSave(list); return list.findIndex(x => x.id===r.id) + 1; }
async function lbFetch(diff){
  const q = `${LB_CFG.url}/rest/v1/scores?select=name,score,tier,pos,diff,pl_apps,goals,caps,honours,created_at&order=score.desc&limit=50${diff ? `&diff=eq.${diff}` : ''}`;
  const r = await fetch(q, { headers:lbHead() });
  if(!r.ok) throw new Error(String(r.status)); return r.json();
}
async function lbSubmit(rec, name){
  const body = { name:name.slice(0,16), score:rec.score, tier:rec.tier, pos:rec.pos, diff:rec.diff, pl_apps:rec.pl_apps, goals:rec.goals, caps:rec.caps, honours:rec.honours, ver:rec.ver };
  const r = await fetch(`${LB_CFG.url}/rest/v1/scores`, { method:'POST', headers:{ ...lbHead(), 'Content-Type':'application/json', Prefer:'return=minimal' }, body:JSON.stringify(body) });
  if(!r.ok) throw new Error(String(r.status));
}

/* ================= 雲端存檔（同步碼） =================
   同步碼就像密碼：任何人有同一個同步碼，都可以讀取及覆蓋這組存檔。伺服器只保存同步碼的雜湊值。 */
const SYNC_KEY = 'g2p-sync';
const syncCfg = () => { try{ return JSON.parse(localStorage.getItem(SYNC_KEY)||'null'); }catch(e){ return null; } };
const syncSave = v => { try{ if(v) localStorage.setItem(SYNC_KEY, JSON.stringify(v)); else localStorage.removeItem(SYNC_KEY); }catch(e){} };
const B32 = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newSyncCode(){ const a = new Uint8Array(26); crypto.getRandomValues(a); const s = [...a].map(x => B32[x % B32.length]).join(''); return s.match(/.{1,5}/g).join('-'); }
const normCode = c => String(c||'').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,5}/g)?.join('-') || '';
async function rpc(fn, body){
  const r = await fetch(`${LB_CFG.url}/rest/v1/rpc/${fn}`, { method:'POST', headers:{ ...lbHead(), 'Content-Type':'application/json' }, body:JSON.stringify(body) });
  if(!r.ok) throw new Error(String(r.status)); return r.json();
}
async function cloudPack(){
  const slots = Array.from({ length:3 }, (_,i) => { try{ return JSON.parse(localStorage.getItem(`g2p-slot-${i}`)||'null'); }catch(e){ return null; } });
  let ach = {}; try{ ach = JSON.parse(localStorage.getItem('g2p-ach')||'{}'); }catch(e){}
  const json = JSON.stringify({ app:'R2PL-cloud', v:SAVE_VER, ver:GAME_VER, t:Date.now(), slots, ach });
  if(typeof CompressionStream !== 'undefined'){ const u8 = new Uint8Array(await new Response(new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    let s = ''; for(let i=0;i<u8.length;i+=0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i+0x8000)); return 'g.' + btoa(s); }
  return 'r.' + json;
}
async function cloudUnpack(data){
  let json = data.slice(2);
  if(data.startsWith('g.')){ const u8 = Uint8Array.from(atob(json), c => c.charCodeAt(0)); json = new TextDecoder().decode(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }
  const p = JSON.parse(json); if(!p || p.app!=='R2PL-cloud') throw new Error('bad'); return p;
}
async function cloudPush(){
  const cfg = syncCfg(); if(!cfg || !lbOn()) return null;
  const t = await rpc('cloud_put', { p_key:cfg.code, p_data:await cloudPack() });
  cfg.last = Date.now(); cfg.pushed = t; syncSave(cfg); return t;
}
async function cloudPull(code){
  const rows = await rpc('cloud_get', { p_key:code || (syncCfg()||{}).code }); if(!rows || !rows.length) return null;
  return { p:await cloudUnpack(rows[0].data), at:rows[0].updated_at };
}
/* 自動上載：存檔後 20 秒內合併成一次 */
let CLOUD_T = null;
function cloudQueue(){ if(!syncCfg() || !lbOn() || !navigator.onLine) return; clearTimeout(CLOUD_T); CLOUD_T = setTimeout(() => cloudPush().catch(() => {}), 20000); }
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden' && CLOUD_T){ clearTimeout(CLOUD_T); CLOUD_T = null; cloudPush().catch(() => {}); } });
