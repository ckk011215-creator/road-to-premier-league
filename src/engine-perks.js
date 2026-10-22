/* ================= 特技與宿敵 ================= */

/* ---------- 特技：達成條件後永久解鎖，影響關鍵時刻成功率等 ----------
   pst：特技進度計數（關鍵時刻與比賽中累積） */
const pst = () => (S.pst = S.pst || { bG:0, sp:0, D:0, S:0, trail:0, bigM:0, subGA:0, iron:0, rv:0 });
const PERKS = [
  { id:'clinical', n:'冷靜殺手', d:'穩健或標準的射門選項成功率 +6%', need:'職業聯賽累計入球 80 個', out:true,
    prog:() => [careerStats().g, 80], b:(o,c) => o.k==='G' && (o.m==='safe'||o.m==='norm') ? 6 : 0 },
  { id:'long', n:'遠射專家', d:'冒險的射門選項成功率 +8%', need:'職業比賽中冒險射門成功 18 次', out:true,
    prog:() => [pst().bG, 18], b:(o,c) => o.k==='G' && o.m==='bold' ? 8 : 0 },
  { id:'setp', n:'定位球大師', d:'定位球及十二碼場面成功率 +10%', need:'職業比賽中定位球或十二碼成功 20 次',
    prog:() => [pst().sp, 20], b:(o,c) => /定位球主罰|主罰十二碼|^十二碼$/.test(c.sc||'') ? 10 : 0 },
  { id:'play', n:'傳球大師', d:'傳送助攻選項成功率 +6%', need:'職業聯賽累計助攻 70 次', out:true,
    prog:() => [careerStats().a, 70], b:(o,c) => o.k==='A' ? 6 : 0 },
  { id:'wall', n:'防守大師', d:'防守選項成功率 +6%', need:'職業比賽中防守成功 70 次', out:true,
    prog:() => [pst().D, 70], b:(o,c) => o.k==='D' ? 6 : 0 },
  { id:'reflex', n:'神級反應', d:'撲救選項成功率 +6%', need:'職業比賽中撲救成功 80 次', gk:true,
    prog:() => [pst().S, 80], b:(o,c) => o.k==='S' ? 6 : 0 },
  { id:'clutch', n:'逆境之王', d:'球隊落後時所有選項成功率 +6%', need:'職業比賽中球隊落後時成功 60 次',
    prog:() => [pst().trail, 60], b:(o,c) => c.trail ? 6 : 0 },
  { id:'big', n:'大賽型球員', d:'打吡、宿敵對決、國際賽等重要比賽成功率 +6%', need:'重要比賽獲選全場最佳 2 次',
    prog:() => [pst().bigM, 2], b:(o,c) => (c.stake||1)>=2 ? 6 : 0 },
  { id:'sub', n:'後備奇兵', d:'後備入替時成功率 +10%', need:'後備入替後入球或助攻 3 次', out:true,
    prog:() => [pst().subGA, 3], b:(o,c) => c.sub ? 10 : 0 },
  { id:'leader', n:'更衣室領袖', d:'每季季前主帥信任 +4、隊友關係 +4；傳送配合 +3%', need:'成為隊長，而且隊友關係達 75',
    prog:() => [S.pro&&S.pro.captain && (S.m.mates||0)>=75 ? 1 : 0, 1], b:(o,c) => o.k==='A' ? 3 : 0 },
  { id:'iron', n:'鐵人', d:'受傷機會 −35%', need:'五季聯賽出場達 85% 以上',
    prog:() => [pst().iron, 5], b:() => 0 },
  { id:'vet', n:'老而彌堅', d:'30 歲後能力衰退減慢 30%', need:'31 歲或以上，職業出場 450 場',
    prog:() => [S.age>=31 ? careerStats().app : Math.min(careerStats().app, 449), 450], b:() => 0 }
];
const perkFor = p => !(p.out && S.pos==='GK') && !(p.gk && S.pos!=='GK');
const hasPerk = id => !!(S && S.perks && S.perks[id]);
/* 某個選項在這個情境下的特技加成：{ v, n:[特技名] } */
function perkBonus(o, c){
  if(!S.perks) return { v:0, n:[] };
  let v = 0; const n = [];
  PERKS.forEach(p => { if(!S.perks[p.id]) return; const x = p.b(o, c||{}); if(x){ v += x; n.push(p.n); } });
  return { v:Math.min(v, 14), n };
}
function checkPerks(){
  S.perks = S.perks || {}; const got = [];
  PERKS.forEach(p => { if(S.perks[p.id] || !perkFor(p)) return; const [a, b] = p.prog(); if(a >= b){ S.perks[p.id] = S.year; got.push(p); logLine(`${S.age} 歲解鎖特技「${p.n}」`); } });
  return got;
}
/* 比賽中記錄特技進度 */
function perkTrack(x, sc, trail){
  const P = pst(); if(!x.ok || S.stage!=='PRO') return;
  if(x.k==='G' && x.m==='bold') P.bG++;
  if(x.k==='D') P.D++;
  if(x.k==='S') P.S++;
  if(/定位球主罰|主罰十二碼|^十二碼$/.test(sc||'')) P.sp++;
  if(trail) P.trail++;
}

/* ---------- 宿敵 ---------- */
const rivalOf = () => S.cohort.find(n => n.tag==='rival' && n.st!=='QUIT') || null;
function rvState(){ return (S.rv = S.rv || { w:0, d:0, l:0, last:null, seasons:[] }); }
/* 職業期開始時，若宿敵已離開足球，便安排一名同年出道的同位置新星 */
function ensureRival(){
  if(S.stage!=='PRO' || S.age>26) return;
  const cur = S.cohort.find(n => n.tag==='rival');
  if(cur && ['PRO','SCH','ACA'].includes(cur.st)) return;
  if(S.flags.rvNew) return;
  if(cur) cur.tag = null;
  const lg = club(curClub()).lg, c = pick(clubsIn(lg).filter(x => x.id!==curClub()));
  const n = { n:npcName(), pos:S.pos, pot:r1(clamp(avgPot() + N0(3), 40, 95)), ab:r1(ovr() + N0(2.5)), rate:r1(rf(0.95,1.2)), rel:ri(0,11)/12, mat:'norm', st:'PRO', club:c.id, tag:'rival', note:'', hist:[] };
  npcNote(n, `U18 聯賽時期的對手，與${c.n}簽訂職業合約`);
  S.cohort.push(n); S.flags.rvNew = 1;
  UI.card('event', '宿敵登場', `${c.n}的${POS[S.pos].n}${n.n}與你同年出道。U18 聯賽時你們交手過多次，傳媒已經開始把你們比較。`);
}
function avgPot(){ const v = Object.values(S.pot||{}); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 60; }
/* 季前：宿敵與你同一聯賽便預告對決 */
function rivalPreseason(next){
  ensureRival();
  const n = rivalOf(); if(!n || S.stage!=='PRO' || !n.club){ next(); return; }
  if(n.club===curClub()){ const c = pick(clubsIn(club(curClub()).lg).filter(x => x.id!==curClub())); n.club = c.id; npcNote(n, `轉會至${c.n}`); }
  if(club(n.club).lg===club(curClub()).lg && n.st==='PRO'){ const r = rvState();
    UI.card('event', '宿敵同場', `${n.n}今季效力${cName(n.club)}。傳媒已把你們的兩次交手圈起來。${r.w+r.l+r.d ? `<br>對決紀錄：你 ${r.w} 勝 ${r.d} 和 ${r.l} 負。` : ''}`); }
  next();
}
/* 對手球會是宿敵所屬球會？ */
const isRivalClub = id => { const n = rivalOf(); return !!(n && n.st==='PRO' && n.club===id); };
/* 宿敵對決之後：比較兩人評分 */
function rivalAfter(r){
  const n = rivalOf(); if(!n || !r) return;
  const p = npcPerf(n, S.age), lv = club(n.club).str;
  const rr = r1(clamp(6.6 + (p - lv)*0.06 + (r.ga>r.gf?0.25:r.ga<r.gf?-0.25:0) + N0(0.55), 5.2, 9.3));
  const rg = chance(clamp((p-50)*0.8 + (POS[n.pos].g==='ATT'?18:4), 2, 45)) ? 1 : 0;
  const R0 = rvState(), win = r.rt > rr + 0.15, lose = rr > r.rt + 0.15;
  if(win) R0.w++; else if(lose) R0.l++; else R0.d++;
  R0.last = { y:S.year, me:r.rt, rv:rr };
  if(win) pst().rv++;
  const t = fx(win ? { fans:3, conf:3 } : lose ? { conf:-2 } : {});
  UI.card(win?'good':lose?'bad':'', '宿敵對決', `<div class="rvd"><div><b>${r.rt.toFixed(1)}</b><small>你</small></div><i>VS</i><div><b>${rr.toFixed(1)}</b><small>${esc(n.n)}</small></div></div>
    ${win ? `賽後傳媒一致認為你贏了這場個人對決。${n.n}離場時沒有和你握手。` : lose ? `${n.n}${rg?'更攻入一球，':''}搶盡風頭。社交媒體上滿是你們兩人的對比片段。` : '兩人表現旗鼓相當，傳媒說這場對決沒有勝負。'}
    <p class="hint">對決紀錄：你 ${R0.w} 勝 ${R0.d} 和 ${R0.l} 負</p>${t?`<div class="fx">${t}</div>`:''}`);
}
/* 季尾：同屆之爭（只在兩人都踢職業聯賽時） */
function rivalSeason(row){
  const n = rivalOf(); if(!n || n.st!=='PRO' || !row || row.lg==='DEV' || !n.club) return;
  const p = npcPerf(n, S.age), lg = club(n.club).lg, lv = club(n.club).str;
  const rrt = r1(clamp(6.75 + (p - lv)*0.045 + N0(0.2), 6.0, 8.2)), app = Math.round(LG[lg].g*clamp(0.5 + (p-lv)*0.05, 0.1, 0.95));
  const att = POS[n.pos].g==='ATT' || n.pos==='AM', gl = Math.round(app*(att?clamp(0.28 + (p-lv)*0.02,0.05,0.75):0.04));
  rvState().seasons.push({ y:S.year, lg, app, g:gl, rt:rrt, me:row.rt });
  if(LG[lg].lvl>2 && LG[club(curClub()).lg].lvl>2) return;
  const meBetter = row.rt > rrt;
  UI.card('event', '同屆之爭', `<div class="rvt"><div><small>你</small><b>${row.app ? row.rt.toFixed(2) : '—'}</b><span>${LG[row.lg]?LG[row.lg].short:'預備組'}・${row.app} 場${row.gk?`・${row.cs||0} 次零封`:`・${row.g} 球`}</span></div><div><small>${esc(n.n)}</small><b>${rrt.toFixed(2)}</b><span>${LG[lg].short}・${app} 場${n.pos==='GK'?'':`・${gl} 球`}</span></div></div>
    ${meBetter ? '傳媒的賽季總結說：「這一年，同屆之中你走得更前。」' : `傳媒的賽季總結說：「${n.n}暫時領先。」`}`);
  if(!meBetter && lg==='PL' && S.age<=23 && rrt>=7.3 && !S.honours.some(h => h.y===S.year+1 && /PFA 年度最佳年輕/.test(h.t)) && chance(45)){
    npcNote(n, '獲選 PFA 年度最佳年輕球員'); fx({ conf:-2, love:2 });
    UI.card('bad', 'PFA 年度最佳年輕球員', `獎項頒給了${n.n}。你在台下鼓掌，心裏暗暗發誓明年要站在台上。`); }
}
/* 國家隊：宿敵同樣入選 */
function rivalIntl(){
  const n = rivalOf(); if(!n || S.flags.rvIntl || n.st!=='PRO' || npcPerf(n, S.age) < 72) return;
  S.flags.rvIntl = 1; npcNote(n, '入選英格蘭國家隊');
  UI.card('event', '宿敵亦入選', `${n.n}同樣入選國家隊。在訓練營裏，你們第一次穿上同一款球衣。`);
}
