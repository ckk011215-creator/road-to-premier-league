/* ================= 世界模擬：球會陣容、NPC 球員、轉會市場、射手榜與紀錄 =================
   每間聯賽球會（英超至英議聯）有 20 人名單。球員每季成長、老化、退役；
   夏天有轉會市場，青訓球員補上空缺；球會實力一半由陣容決定。 */
const SQ_POS = ['GK','GK','CB','CB','CB','CB','FB','FB','FB','DM','DM','CM','CM','AM','AM','W','W','W','ST','ST'];
const XI_POS = ['GK','FB','CB','CB','FB','DM','CM','AM','W','W','ST'];
const SQ_LGS = ['PL','CH','L1','L2','NL'];
const GOAL_W = { ST:5, W:3, AM:3, CM:1.4, DM:0.6, CB:0.5, FB:0.35, GK:0 };
const hasSquad = c => c && SQ_LGS.includes(c.lg);
function mkPlayer(pos, age, v, pot){ const W = S.W; W.pid = (W.pid||0) + 1;
  return { id:W.pid, n:npcName(), p:pos, a:age, v:r1(v), t:r1(Math.max(v, pot)), g:0, ap:0, cg:0, ca:0 }; }
function genSquad(c){
  const seen = {}, sq = SQ_POS.map(pos => { const k = seen[pos] = (seen[pos]||0) + 1;
    const first = k===1 || (pos==='CB' && k===2) || (pos==='FB' && k===2) || (pos==='W' && k===2);
    if(!first && R() < 0.22){ const v = c.str - 11 + N0(3); return mkPlayer(pos, ri(17,19), v, c.str + ri(-3, 9) + (c.cat===1?3:0)); }
    const age = first ? ri(21,32) : ri(18,34), v = first ? c.str + N0(2.2) : c.str - 5 + N0(3);
    return mkPlayer(pos, age, v, age<=23 ? v + ri(1,8) : v); });
  c.sq = sq;
  const d = c.str - squadStr(c); sq.forEach(p => { p.v = r1(p.v + d); p.t = r1(Math.max(p.t + d, p.v)); });
}
/* 最佳正選十一人 */
function xiOf(c){
  const used = new Set(), xi = [];
  XI_POS.forEach(pos => { const best = c.sq.filter(p => !used.has(p.id) && p.p===pos).sort((a,b) => b.v-a.v)[0]
    || c.sq.filter(p => !used.has(p.id) && p.p!=='GK').sort((a,b) => b.v-a.v)[0];
    if(best){ used.add(best.id); xi.push(best); } });
  return xi;
}
const squadStr = c => { const xi = xiOf(c); return xi.length ? xi.reduce((s,p)=>s+p.v,0)/xi.length : c.str; };
function ensureSquads(){ if(!S.W) return; Object.values(S.W.clubs).forEach(c => { if(hasSquad(c) && !c.sq) genSquad(c); }); S.W.hist = S.W.hist || []; S.W.hof = S.W.hof || []; }

/* ---------- 每季結算（季尾、升降級之後） ---------- */
function worldSeason(T){
  ensureSquads();
  const W = S.W, yr = S.year, clubs = Object.values(W.clubs).filter(hasSquad), boots = {};
  /* 1. 入球與出場分配給球員 */
  clubs.forEach(c => {
    const row = (S.lt && S.lt.T[c.lg] && S.lt.T[c.lg][c.id]) || null, gf = row ? row.gf : Math.round(LG[c.lg].g*1.3);
    const xi = new Set(xiOf(c).map(p => p.id)), avg = c.str || 50;
    const w = c.sq.map(p => GOAL_W[p.p] * Math.pow(Math.max(0.3, p.v/avg), 3) * (xi.has(p.id) ? 1 : 0.22));
    const tot = w.reduce((a,b)=>a+b,0) || 1;
    c.sq.forEach((p,i) => { p.g = Math.round(gf * w[i]/tot * rf(0.75,1.25)); p.ap = xi.has(p.id) ? ri(Math.round(LG[c.lg].g*0.7), LG[c.lg].g) : ri(2, Math.round(LG[c.lg].g*0.45)); p.cg += p.g; });
  });
  SQ_LGS.forEach(lg => { const all = clubs.filter(c => c.lg===lg).flatMap(c => c.sq.map(p => ({ p, c }))).sort((a,b) => b.p.g-a.p.g);
    boots[lg] = all.slice(0,3).map(({p,c}) => ({ n:p.n, c:c.id, g:p.g, id:p.id })); });
  W.boots = boots;
  /* 2. 成長、老化、退役 */
  const moves = [];
  clubs.forEach(c => { c.sq = c.sq.filter(p => {
    const a = p.a;
    if(a<=21) p.v += (p.t-p.v)*rf(0.15,0.35) + N0(0.4);
    else if(a<=26) p.v += (p.t-p.v)*rf(0.08,0.22) + N0(0.6);
    else if(a<=30) p.v += N0(0.7);
    else p.v -= rf(0.4,1.8)*(1+(a-31)*0.3);
    p.v = r1(clamp(p.v, 20, 95)); p.a++;
    const retire = p.a>=38 || (p.a>=34 && chance(25+(p.a-34)*20)) || (p.a>=30 && p.v < LG_CENTER.NL-8 && chance(50));
    if(retire){ if(p.cg>=120 || p.ca>=40) W.hof.push({ n:p.n, c:c.id, cg:p.cg, ca:p.ca, y:yr+1, pos:p.p }); if(c.id===curClubSafe()) moves.push({ t:'out', n:p.n, why:'退役' }); return false; }
    return true; }); });
  /* 3. 轉會市場：比球會好得多的球員轉投較強球會（與對方同位置最弱的球員對調） */
  const mine = curClubSafe(); let n = 0;
  const byStr = clubs.slice().sort((a,b) => a.str-b.str);
  for(const c of byStr){ if(n>=160) break;
    for(const p of c.sq.slice()){
      if(p.a>31 || p.v < c.str + 4.5 || !chance(45)) continue;
      const cands = clubs.filter(b => b.id!==c.id && b.str >= c.str+1 && b.str <= p.v+3 && b.str >= p.v-4);
      const b = cands.length ? pick(cands) : null; if(!b) continue;
      const w = b.sq.filter(x => x.p===p.p).sort((x,y) => x.v-y.v)[0]; if(!w || w.v >= p.v) continue;
      b.sq.splice(b.sq.indexOf(w), 1, p); c.sq.splice(c.sq.indexOf(p), 1, w); n++;
      if(b.id===mine) moves.push({ t:'in', n:p.n, from:c.id, p:p.p, v:p.v });
      if(c.id===mine) moves.push({ t:'out', n:p.n, to:b.id, why:'轉會' });
    } }
  /* 收購球會額外簽入球員 */
  clubs.filter(c => c.boost && c.boost.v>0).forEach(c => { for(let k=0;k<2;k++){
    const weakest = c.sq.slice().sort((a,b)=>a.v-b.v)[0], pool = clubs.filter(o => o.id!==c.id && o.str < c.str+8).flatMap(o => o.sq.filter(p => p.p===weakest.p && p.v > weakest.v+3 && p.v <= c.str+7 && p.a<=30).map(p => ({ p, o })));
    if(!pool.length) break; const { p, o } = pick(pool); o.sq.splice(o.sq.indexOf(p), 1, weakest); c.sq.splice(c.sq.indexOf(weakest), 1, p);
    if(c.id===mine) moves.push({ t:'in', n:p.n, from:o.id, p:p.p, v:p.v }); } });
  /* 4. 青訓補充 */
  clubs.forEach(c => { const cnt = {}; c.sq.forEach(p => cnt[p.p] = (cnt[p.p]||0) + 1);
    const need = {}; SQ_POS.forEach(pos => need[pos] = (need[pos]||0) + 1);
    Object.keys(need).forEach(pos => { while((cnt[pos]||0) < need[pos]){ cnt[pos] = (cnt[pos]||0) + 1;
      const v = c.str - 10 + N0(3), p = mkPlayer(pos, ri(17,18), v, c.str + ri(-2, 8) + (c.cat===1?4:c.cat===2?2:0)); c.sq.push(p);
      if(c.id===mine && p.t >= c.str+4) moves.push({ t:'youth', n:p.n, p:pos }); } }); });
  /* 5. 球會實力：一半由陣容決定 */
  clubs.forEach(c => { c.str = r1(c.str*0.5 + squadStr(c)*0.5); });
  /* 6. 聯賽水平校正：人才流動會令頂級聯賽越來越強，把各聯賽平均拉回原本水平（球員能力一併調整） */
  SQ_LGS.forEach(lg => { const cs = clubs.filter(c => c.lg===lg); if(!cs.length) return;
    const d = (LG_CENTER[lg] + 0.8 - cs.reduce((s,c)=>s+c.str,0)/cs.length) * 0.7;
    cs.forEach(c => { c.str = r1(c.str + d); c.sq.forEach(p => { p.v = r1(p.v + d); p.t = r1(Math.max(p.v, p.t + d)); }); }); });
  /* 7. 紀錄 */
  SQ_LGS.forEach(lg => { const t = T && T[lg] && T[lg][0]; if(!t) return; const bt = boots[lg][0];
    W.hist.push({ y:yr, lg, champ:t[0], boot:bt ? { n:bt.n, c:bt.c, g:bt.g } : null }); });
  W.hist = W.hist.slice(-SQ_LGS.length*40);
  W.hof = W.hof.sort((a,b) => b.cg-a.cg).slice(0,30);
  W.moves = moves;
}
const curClubSafe = () => S.pro ? curClub() : null;
/* 季前：通知你所屬球會的轉會動態 */
function squadNews(next){
  const mv = S.W && S.W.moves; if(!mv || !mv.length || !S.pro){ next(); return; }
  const posN = p => POS[p] ? POS[p].n : p;
  const lines = mv.slice(0,6).map(x => x.t==='in' ? `＋ 簽入${posN(x.p)}${x.n}（來自${cName(x.from)}）${x.p===S.pos?'・與你同位置':''}`
    : x.t==='youth' ? `＋ 青訓升上一隊：${posN(x.p)}${x.n}` : `－ ${x.n}${x.why==='退役'?'退役':`轉投${cName(x.to)}`}`);
  UI.card('event', '夏季轉會動態', `${cName(curClub())}的轉會窗：<br>${lines.join('<br>')}`);
  S.W.moves = []; next();
}
/* 與你爭位的隊友 */
function rivalsAtPos(){ const c = club(curClub()); if(!hasSquad(c) || !c.sq) return []; return c.sq.filter(p => p.p===S.pos).sort((a,b) => b.v-a.v); }
/* 你的球隊某位置的正選（戰報陣容用） */
function lineupFor(cid){ const c = club(cid); if(!hasSquad(c)) return null; ensureSquads(); return xiOf(c); }
/* 戰報：按陣容位置填入真實球員名字；宿敵在對方陣中便會出場 */
const SLOT_POS = { GK:'GK', RB:'FB', LB:'FB', CB:'CB', DM:'DM', CM:'CM', AM:'AM', RW:'W', LW:'W', ST:'ST' };
function slotNames(cid, slots, skip){
  const c = cid && club(cid); if(!hasSquad(c)) return null; ensureSquads();
  const used = new Set(), xi = xiOf(c), out = slots.map((s,i) => { const pos = SLOT_POS[s];
    const p = xi.find(x => !used.has(x.id) && x.p===pos) || c.sq.filter(x => !used.has(x.id) && x.p===pos).sort((a,b)=>b.v-a.v)[0];
    if(p){ used.add(p.id); return p.n; } return null; });
  const rv = typeof rivalOf==='function' ? rivalOf() : null;
  if(rv && rv.st==='PRO' && rv.club===cid){ const k = slots.findIndex(s => SLOT_POS[s]===rv.pos); if(k>=0 && k!==skip) out[k] = rv.n; }
  return out;
}
/* 全場最佳：從勝方陣容中選出（我方則避開你的位置） */
function motmPick(cid, mineSide){
  const xi = cid ? lineupFor(cid) : null; if(!xi || !xi.length) return npcName();
  const pool = xi.filter(p => p.p!=='GK' && !(mineSide && cid===curClubSafe() && p.p===S.pos));
  const w = p => (GOAL_W[p.p]+1) * p.v; return (wpick(pool.length ? pool : xi, w) || xi[0]).n;
}
