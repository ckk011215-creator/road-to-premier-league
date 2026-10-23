/* ================= 職業生涯（包括非聯賽） ================= */
const GAME_VER = '1.2.0';
const ROLES = ['主力','輪換','替補','未入名單'];
const ROLE_MUL = [1, 0.6, 0.3, 0.1];

const curClub = () => S.pro ? (S.pro.loan ? S.pro.loan.club : S.pro.club) : null;
const curLg = () => S.pro ? club(curClub()).lg : null;

function wageFor(cid, o){
  const c = club(cid), L = LG[c.lg], v = o ?? ovr();
  const w = L.wage * clamp(1 + (v - c.str)*0.09, 0.35, 3.2) * (S.age<20?0.55:S.age<22?0.8:1) * (1 + agentWage());
  return Math.max(50, Math.round(w/50)*50);
}
const money = n => n>=1e6 ? `£${(n/1e6).toFixed(n>=1e7?0:1)}m` : n>=1e3 ? `£${Math.round(n/1e3)}k` : `£${n}`;
function startPro(cid, opts={}){
  S.stage = 'PRO';
  S.pro = { club:cid, loan:null, cyrs:opts.yrs||2, wage:0, trust:45+leadAdj(), semi:!!opts.semi, clubYrs:{}, captain:false, lastRt:0, debut:false };
  S.pro.wage = wageFor(cid); mgrOf(cid); ensureSquads(); proMark(club(cid)); S.pro.num = numFor(cid); S.pro.numClub = cid;
}
/* 記錄曾經與英足聯或海外頂級聯賽球會簽約（用於統計職業球員比例） */
function proMark(c){ if(c && (LG[c.lg].lvl<=4 || LG_ABROAD.includes(c.lg)) && !LG[c.lg].pool) S.flags.proSigned = 1; }
function roleCalc(){
  const c = club(curClub()), diff = ovr() - c.str + footEdge() + (S.pro.trust-50)/10 + (S.pro.captain?1:0) - (S.age<18?4:0) + clamp(styleFit(c.id)*0.3, -2, 2) - abroadPen() + dif().roleB + (S.age<=21 ? dif().roleY : 0);
  /* 門將只有一個正選位置：不是正選就是後備，很少輪換 */
  let r = S.pos==='GK' ? (diff>=2?0 : diff>=-3?2 : 3) : diff>=3?0 : diff>=-1.5?1 : diff>=-5?2 : 3;
  return { r, dev: r===3 && S.age<=21 && !S.pro.semi && c.cat>0 };
}
function roleTxt(){ const s = S.season; return s.dev ? `預備組（${curLg()==='PL'?'PL2・U21':'U21 預備組'}）` : ROLES[s.r]; }

/* 職業期：季前（預備）、上半季開始、半季結束 */
function proStart(sl, next){
  if(S.term===2){ janWindow(next); return; }
  Object.assign(S.season, roleCalc());
  UI.card('', '上半季開始', `${cName(curClub())}・${LG[curLg()].n}｜角色：<b>${roleTxt()}</b>｜主帥信任 ${Math.round(S.pro.trust)}`);
  next();
}
function proEnd(sl, next){
  termEndPro(() => socialStep(() => { if(S.term < 2){ next(); return; } seasonEnd(next); }));
}
function preseason(next){
  S.season = { mo:0, mg:0, ma:0, inj:0, fd:0, lv0:LG[curLg()].lvl };
  S.recent = [];
  const c = club(curClub());
  /* 老化 */
  if(S.age>=30){ const dn = [];
    ATTRS.forEach(k => { const kd = ATTR_KIND[k]; let d = 0;
      if(kd==='P') d = rf(0.8,2.2) + (S.age-30)*0.45; else if(kd==='T' && S.age>=32) d = rf(0.3,1.2) + (S.age-32)*0.3; else if(kd==='M' && S.age>=34) d = rf(0.2,0.8);
      if(S.pers.disc>=4) d *= 0.8;
      if(hasLife('cryo')) d *= 0.85;
      if(hasPerk('vet')) d *= 0.7;
      if(S.pos==='GK') d *= 0.55;   /* 門將衰退較慢 */
      if(d>0){ S.ab[k] = Math.max(1, S.ab[k]-d); if(d>=1.2) dn.push(ATTR_N[k]); } });
    if(S.age<=33) ATTRS.filter(k=>ATTR_KIND[k]==='M').forEach(k => train(k, 1.5));
    if(dn.length) UI.card('bad','歲月', `${S.age} 歲。季前體能測試顯示你的${dn.join('、')}下降了。你開始要依靠經驗比賽。`); }
  /* 換帥 */
  mgrOf(c.id);
  if(chance(12) && S.pro.clubYrs[curClub()]){ S.pro.trust = 45; c.mgr = newMgr(); const st = MSTYLE[c.mgr.st]; UI.card('event','換帥', `${c.n}聘請了新主帥${c.mgr.n}。他主張<b>${st.n}</b>：${st.d}。<br>你與新主帥的戰術契合度：<b>${fitN(styleFit(c.id))}</b>。所有人都要重新證明自己。`); }
  /* 隊長 */
  const rc0 = roleCalc();
  if(!S.pro.captain && !S.pro.loan && S.age>=25 && (S.pro.clubYrs[S.pro.club]||0)>=3 && rc0.r===0 && chance(40)){ S.pro.captain = true; UI.card('gold','隊長', `主帥把隊長臂章交給你。`); logLine(`${S.age} 歲成為${c.n}隊長`); }
  Object.assign(S.season, roleCalc());
  const cTxt = S.pro.loan ? `外借自${cName(S.pro.club)}，至季尾` : `合約尚餘 ${S.pro.cyrs} 年｜週薪 ${money(S.pro.wage)}`;
  UI.card('', `${S.year} 年夏天・${S.age} 歲`, `${c.n}（${LG[c.lg].n}）｜${cTxt}<br>季前預計角色：<b>${roleTxt()}</b><br>主帥${c.mgr?c.mgr.n:''}：${fitTxt(c.id)}${S.pro.semi?'<br>半職業球員：日間上班，晚上訓練。':''}`);
  fx({ fat:-25 });
  S.ss = { app:0, g:0, a:0, cs:0, rt:0 };
  ensureSquads(); seasonTableInit(); migrateAgent(); lifeRenew(); cupInit();
  if(!S.pro.semi) setObjectives();
  if(hasPerk('leader')){ S.pro.trust = clamp(S.pro.trust+4, 0, 100); S.m.mates = clamp((S.m.mates||50)+4, 0, 100); }
  runSeq([abroadPreseason, rivalPreseason, squadNews, clubNews, brandStep, maybeEvent(55)], next);
}
function termEndPro(next){
  settleMeters();
  const ab = S.term>0 ? abroadTick() : '';
  const d = Object.keys(S.m).filter(k=>!['study','scout'].includes(k)).map(k => [k, S.m[k]-S.mStart[k]]).filter(x=>x[1]).map(([k,v]) => `${METER_N[k]} ${v>0?'+':''}${v}`).join('、');
  const se = S.season;
  if(S.term>0) UI.card('summary', `${TERMS_P[S.term]}總結`, `角色：${roleTxt()}｜主帥信任 ${Math.round(S.pro.trust)}${se.mg||se.ma?`｜關鍵時刻 ${se.mg} 球 ${se.ma} 助攻`:''}${ab?`<br>${ab}`:''}${d?`<div class="fx">${d}</div>`:''}`);
  next();
}

/* ---------- 一月轉會窗 ---------- */
function loanOffers(n){
  const o = ovr(), c = club(S.pro.club);
  const cands = Object.values(S.W.clubs).filter(x => x.id!==c.id && x.lg!=='NON' && isEngClub(x) && LG[x.lg].lvl > LG[c.lg].lvl && x.str <= o+1.5 && x.str >= o-9 && o >= LG[x.lg].par-6);
  return shuffle(cands).slice(0, n).filter(() => chance(dif().loan*100));
}
function janWindow(next){
  const se = S.season;
  Object.assign(se, roleCalc());
  if(S.pro.loan || S.age>22 || se.r<2 || S.pro.semi){ next(); return; }
  const offs = loanOffers(S.flags.wantLoan ? ri(2,3) : ri(1,3)); S.flags.wantLoan = 0;
  if(!offs.length){ next(); return; }
  UI.card('event','一月轉會窗', `你在${cName(S.pro.club)}得不到上陣機會。有球會希望外借你半季：`);
  UI.choose('是否外借？', [ ...offs.map(x => ({ t:`外借至${x.n}`, s:`${LG[x.lg].n}｜預計${ROLES[clamp(roleFor(x),0,3)]}`, f:()=>{ S.pro.loan = { club:x.id }; S.pro.trust = 50; Object.assign(se, roleCalc()); logLine(`${S.age} 歲外借至${x.n}（${LG[x.lg].short}）`); UI.card('good',`外借至${x.n}`, `你收拾行李前往${x.n}。第一天主帥便安排你踢${POS[S.pos].n}。`); next(); } })),
    { t:'留隊爭取正選', s:'', f:()=>{ fx({trust:2}); next(); } } ]);
}
function roleFor(x){ const diff = ovr() - x.str; if(S.pos==='GK') return diff>=2?0 : diff>=-3?2 : 3; return diff>=3?0 : diff>=-1.5?1 : diff>=-5?2 : 3; }

/* ---------- 季末 ---------- */
function simSeason(){
  const se = S.season, c = club(curClub()), lg = LG[c.lg], pos = S.pos;
  const injF = clamp(1 - se.inj/40, 0, 1);
  let app, mpg, lvl;
  if(se.dev){ app = Math.round(ri(10,22)*injF); mpg = 80; lvl = E(S.age)*0.97; }
  else if(pos==='GK'){ const pct = [[.85,.98],[.4,.6],[.04,.14],[0,.03]][se.r]; app = Math.round(lg.g*rf(...pct)*injF); mpg = 90; lvl = lg.par; }
  else { const pct = [[.78,.95],[.45,.7],[.15,.38],[0,.06]][se.r]; app = Math.round(lg.g*rf(...pct)*injF); mpg = [86,72,26,20][se.r]; lvl = lg.par; }
  const n90 = app*mpg/90;
  const g = Math.max(se.dev?0:se.mg, Math.round(GOAL90[pos]*clamp(1+(eff('sho')-lvl)*0.035,0.3,2.3)*n90*rf(0.85,1.15)*(1+(S.m.conf-50)/250)));
  const a = Math.max(se.dev?0:se.ma, Math.round(AST90[pos]*clamp(1+((eff('pas')+eff('iq'))/2-lvl)*0.03,0.3,2.1)*n90*rf(0.85,1.15)));
  const dB = ['CB','FB','DM'].includes(pos) ? 0.12 : 0;
  /* 門將：零封場數取決於球隊實力與個人能力 */
  const csR = pos==='GK' ? clamp(0.24 + (c.str - lg.par)*0.018 + (ovr()-lvl)*0.012, 0.06, 0.58) : 0;
  const cs = pos==='GK' ? Math.round(app*csR*rf(0.85,1.15)) : 0;
  let rt = app ? clamp(6.55 + clamp(ovr()-lvl,-15,15)*0.045 + (g+a*0.6)/Math.max(1,app)*0.7 + (pos==='GK' ? cs/Math.max(1,app)*0.7 - 0.05 : 0) + dB + se.mo + N0(0.12) - (S.m.fat>70?0.1:0), 5.6, 8.9) : 0;
  /* 親自上陣／模擬過的比賽評分佔四成 */
  if(app && S.ss && S.ss.app && !se.dev) rt = clamp(rt*0.6 + (S.ss.rt/S.ss.app)*0.4, 5.6, 8.9);
  const row = { y:S.year, age:S.age, club:c.id, lg:se.dev?'DEV':c.lg, loan:!!S.pro.loan, role:se.dev?'預備組':ROLES[se.r], r:se.r, app, g, a, cs, gk:pos==='GK', rt:+rt.toFixed(2), fd:se.fd };
  /* 上陣時間帶來的成長 */
  const minsF = clamp(app*mpg/(lg.g*90), 0, 1);
  const semiF = S.pro.semi ? 0.5 : 1; keyAttrs().forEach(k => train(k, ((se.dev?3:6)*minsF + 1)*semiF));
  playPos(pos, 0.1+minsF*0.2);
  return row;
}
const PROMO = [['PL','CH',3,2,[2,5]], ['CH','L1',3,2,[2,5]], ['L1','L2',4,3,[3,6]], ['L2','NL',2,1,[1,6]], ['NL','NON',4,4,null]];
function simLeagues(row){
  leagueFinish();
  const T = {};
  LG_TABLES.forEach(lg => { T[lg] = tableOf(lg).map(r => [r.id, r.pts]); });
  const moves = [];
  PROMO.forEach(([up, lo, nDown, nAuto, po]) => {
    const down = T[up].slice(-nDown).map(x=>x[0]);
    let ups = T[lo].slice(0, nAuto).map(x=>x[0]);
    if(po){ const pool = T[lo].slice(po[0], po[1]+1); const mn = Math.min(...pool.map(x=>x[1])); const w = wpick(pool, x => x[1]-mn+4); ups.push(w[0]); }
    down.forEach(id => { S.W.clubs[id].lg = lo; moves.push([id, up, lo]); });
    ups.forEach(id => { S.W.clubs[id].lg = up; moves.push([id, lo, up]); });
  });
  abroadPromo(T, moves);
  S.lastMoves = moves;
  Object.values(S.W.clubs).forEach(c => { c.str = r1(c.str + (LG_CENTER[c.lg]+ (c.str>LG_CENTER[c.lg]?2:-2) - c.str)*0.12 + N0(1.6)); });
  worldSeason(T);
  S.tables = T;
  return { T, moves };
}
function addHonour(t, opt={}){ S.honours.push({ y:S.year+1, t, ...opt }); }
function seasonEnd(done){
  UI.newPage(`${seasonLabel(S.year)}・季末`);
  const row = simSeason(), c = club(curClub()), lgKey = c.lg;
  S.hist.push(row); S.pro.lastRt = row.rt;
  S.earn += S.pro.wage*52 * (S.pro.loan?0.6:1);
  if(!S.pro.loan) S.pro.clubYrs[S.pro.club] = (S.pro.clubYrs[S.pro.club]||0) + 1;
  if(isAbroad()) S.abroad.n++;
  UI.card('report', `${seasonLabel(S.year)} 賽季數據`, `<div class="statline"><span><b>${row.app}</b>出場</span>${row.gk?`<span><b>${row.cs}</b>零封</span>`:`<span><b>${row.g}</b>入球</span><span><b>${row.a}</b>助攻</span>`}<span><b>${row.app?row.rt.toFixed(2):'—'}</b>平均評分</span></div><p>${c.n}・${row.lg==='DEV'?roleTxt():LG[lgKey].n}・${row.role}${row.fd?`｜一隊上陣 ${row.fd} 次`:''}</p>`);
  const { T, moves } = simLeagues(row);
  const pos = T[lgKey].findIndex(x=>x[0]===c.id)+1, champ = club(T[lgKey][0][0]);
  const mv = moves.find(m=>m[0]===c.id);
  const played = row.lg!=='DEV' && row.app>=5;
  let tTxt = `${LG[lgKey].n}：${c.n}排名第 ${pos}。冠軍是${champ.n}。`;
  if(mv) tTxt += LG[mv[2]].lvl < LG[mv[1]].lvl ? `<br><b>${c.n}升上${LG[mv[2]].n}！</b>` : `<br>${c.n}降至${LG[mv[2]].n}。`;
  UI.card('', '聯賽結果', tTxt);
  objectivesEnd(row, pos);
  if(row.app >= LG[lgKey].g*0.85 && row.lg!=='DEV') pst().iron++;
  rivalSeason(row);
  if(S.agent){ S.agent.rel = clamp(S.agent.rel + (row.rt>=7.2?4:row.rt<6.5?-3:0), 0, 100); }
  if(pos===1){ addHonour(`${LG[lgKey].short}冠軍`, { club:c.id, lg:lgKey, role:played?row.r:3 }); UI.card('gold', `${LG[lgKey].n}冠軍`, `${c.n}奪得${LG[lgKey].n}冠軍！${played?'你是冠軍隊伍的一分子。':'你今季甚少上陣。'}`); logLine(`${S.year+1} 年${LG[lgKey].short}冠軍（${c.n}）`); }
  else if(mv && LG[mv[2]].lvl < LG[mv[1]].lvl) addHonour(`${LG[lgKey].short}升級`, { club:c.id, lg:lgKey, role:played?row.r:3 });
  /* 盃賽 */
  if(S.cup && S.cup.y===S.year){ S.cupWin = cupWinners(); }
  else { /* 舊存檔：本季沒有盃賽紀錄，沿用隨機結果 */
    const fa = wpick(Object.values(S.W.clubs).filter(x=>['PL','CH','L1'].includes(x.lg)), x => Math.pow(Math.max(1,x.str-50),2.6));
    const lc = wpick(Object.values(S.W.clubs).filter(x=>['PL','CH'].includes(x.lg)), x => Math.pow(Math.max(1,x.str-55),2.2));
    S.cupWin = { fa:fa.id, lc:lc.id };
    if(fa.id===c.id){ addHonour('FA Cup 冠軍', { club:c.id, role:played?row.r:3 }); UI.card('gold','FA Cup 冠軍', `溫布萊球場決賽，${c.n}捧起 FA Cup！`); logLine(`${S.year+1} 年 FA Cup 冠軍`); }
    if(lc.id===c.id){ addHonour('聯賽盃冠軍', { club:c.id, role:played?row.r:3 }); UI.card('gold','聯賽盃冠軍', `${c.n}贏得聯賽盃。`); } }
  const cupT = S.season.cup;
  if(cupT && cupT.app) UI.card('', '盃賽數據', `本季盃賽出場 ${cupT.app} 次，入球 ${cupT.g}，助攻 ${cupT.a}。`);
  row.cup = cupT || null;
  /* 個人獎項 */
  const aw = [], topG = S.W.boots && S.W.boots[lgKey] && S.W.boots[lgKey][0] ? S.W.boots[lgKey][0].g : 22;
  if(played && row.app>=20){
    if(lgKey==='PL'){
      if(row.g >= Math.max(15, topG)) aw.push('英超金靴');
      if(row.gk && row.cs >= ri(15,19)) aw.push('英超金手套');
      if(row.rt>=(row.gk?7.75:7.6) && row.app>=30 && chance((row.gk?25:55)+(row.rt-7.6)*200+(S.m.fans-50)*0.3)) aw.push('PFA 年度最佳球員');
      if(S.age<=23 && row.rt>=7.3 && row.app>=25 && chance(60)) aw.push('PFA 年度最佳年輕球員');
      if(row.rt>=7.35 && row.app>=28) aw.push('英超年度最佳陣容');
    } else {
      if(row.rt>=7.3 && row.app>=30) aw.push(`${LG[lgKey].short}年度最佳陣容`);
      if(row.g >= (lgKey==='NON' ? 25 : Math.max(15, topG))) aw.push(`${LG[lgKey].short}金靴`);
      if(row.gk && row.cs >= 19) aw.push(`${LG[lgKey].short}金手套`);
      if(isAbroadLg(lgKey) && row.rt>=(row.gk?7.75:7.6) && row.app>=28 && chance((row.gk?25:50)+(row.rt-7.6)*200)) aw.push(`${LG[lgKey].short}年度最佳球員`);
    }
  }
  aw.forEach(t => { addHonour(t, { lg:lgKey }); logLine(`${S.year+1} 年${t}`); });
  if(aw.length) UI.card('gold','年度獎項', aw.join('<br>'));
  if(S.pro.captain && lgKey==='PL' && !S.pro.loan) addHonour('英超隊長', { lg:'PL', silent:true });
  dealsPayout();
  seasonPaper({ row, pos, mv, aw, champ, lgKey, c });
  legendSeason();
  runSeq([intlDuty, cohortNews, contractTime], done);
}
function cohortNews(next){ const news = updateCohort(); if(news.length) UI.card('cohort','同屆消息', news.slice(0,4).map(esc).join('<br>')); next(); }

/* ---------- 國家隊 ---------- */
function intlDuty(next){
  if(S.age<18){ next(); return; }
  const row = S.hist.at(-1), lg = curLg();
  if(S.nt!=='HER'){
    const cs = ovr() - 74 + (lg==='PL'?0:isAbroadLg(lg)?-1:-3) + (row.r===0?1:row.r===1?0:-4) + (S.caps?1.5:0);
    if(cs>=0 && row.lg!=='DEV'){ const n = ri(3,8), first = !S.caps; S.caps += n; S.nt = 'ENG'; rivalIntl();
      if(first){ UI.card('gold','英格蘭國家隊', `你獲英格蘭國家隊徵召。第一次在溫布萊球場聆聽國歌，你想起兒時在公園踢球的日子。`); logLine(`${S.age} 歲英格蘭國家隊首秀`); }
      else UI.card('', '英格蘭國家隊', `今季為英格蘭出場 ${n} 次（累計 ${S.caps}）。`);
      tourney('英格蘭', cs>=5 ? 0 : cs>=2 ? 1 : 2, next); return; }
    if(S.age<=21 && ovr()>=63 && !S.flags.u21){ S.flags.u21 = 1; UI.card('good','英格蘭 U21', '你入選英格蘭 U21。'); logLine(`${S.age} 歲入選英格蘭 U21`); }
    if(!S.caps && S.heritage!=='none' && S.age>=21 && ovr()>=herThr()+2 && !S.flags.herAsk){ S.flags.herAsk = 1; const H = HERITAGE[S.heritage];
      UI.card('event', `${H.nt}足總來電`, `${H.nt}國家隊得知你擁有${H.n}血統，希望你代表他們出賽。一旦踢過正式比賽，便不能再轉投英格蘭。`);
      UI.choose('代表哪一隊？', [
        { t:`代表${H.nt}`, s:'即時獲得國際賽機會', f:()=>{ S.nt = 'HER'; logLine(`${S.age} 歲決定代表${H.nt}`); UI.card('good', H.nt, `你接受了${H.nt}的徵召。`); next(); } },
        { t:'等待英格蘭', s:'可能永遠等不到', f:()=>{ UI.card('','等待英格蘭','你決定繼續等待。'); next(); } } ]); return; }
    next(); return;
  }
  if(ovr()>=herThr()){ const n = ri(4,9), d = ovr()-herThr(); S.caps += n; UI.card('', `${HERITAGE[S.heritage].nt}國家隊`, `今季為${HERITAGE[S.heritage].nt}出場 ${n} 次（累計 ${S.caps}）。`); tourney(HERITAGE[S.heritage].nt, d>=5 ? 0 : d>=1 ? 1 : 2, next); return; }
  next();
}
function herThr(){ return [74,71,67,63,59,55][HERITAGE[S.heritage].tier ?? 3]; }

/* ---------- 合約、轉會、外借 ---------- */
function genOffers(n, allowDown){
  const o = ovr(), cur = club(S.pro.club), rt = S.pro.lastRt;
  const lvNow = LG[club(curClub()).lg].lvl, jump = rt>=7.45 ? 2 : 1;
  const pb = x => x.lg==='PL' ? dif().plB : 0;   /* 難度：英超球會對你的要求放寬多少 */
  const cands = Object.values(S.W.clubs).filter(x => x.id!==cur.id && x.id!==curClub() && isEngClub(x) && (x.lg!=='NON' || o < LG.NL.par-2) && LG[x.lg].lvl >= lvNow-jump
    && o >= LG[x.lg].par-(LG[x.lg].lvl<lvNow?3:6)-pb(x) && !(LG[x.lg].lvl<=4 && lvNow>=5 && (rt<7.1 || (S.age>27 && rt<7.4))) && (x.str <= club(curClub()).str ? o >= x.str-4 : o >= x.str-1.5-pb(x) && rt>=6.95-pb(x)*0.1) && (x.str<77 || (o>=x.str-1-pb(x) && rt>=7.25-pb(x)*0.1)) && (allowDown || x.str >= cur.str-4));
  const out = [];
  for(let i=0; i<n*6 && out.length<n; i++){ const x = wpick(cands, c => Math.pow(Math.max(1, c.str-30), 2)*(1+pb(c)*0.3)); if(x && !out.includes(x)) out.push(x); }
  return out.filter(diffGate);
}
/* 難度關卡：非聯賽球員獲職業球會報價、非英超球員獲英超報價，都要先過這一關 */
const lvStart = () => (S.season && S.season.lv0) || LG[curLg()].lvl;
function diffGate(x){
  if((S.pro.wasNL || lvStart() >= 5) && LG[x.lg].lvl <= 4 && !isAbroadLg(x.lg)) return seasonGate('nl');
  if(x.lg==='PL' && curLg()!=='PL') return seasonGate('pl');
  return true;
}
/* 每個夏天只擲一次：同一季的報價一起通過或一起落空 */
function seasonGate(k){ S.pro.gate = S.pro.gate && S.pro.gate.y===S.year ? S.pro.gate : { y:S.year }; if(S.pro.gate[k]==null) S.pro.gate[k] = chance(dif()[k]*100); return S.pro.gate[k]; }
function offerCount(fa){ const rt = S.pro.lastRt; return Math.max(0, (rt>=7.4?ri(1,3):rt>=7.0?ri(0,2):ri(0,1)) + (fa?1:0) - (S.age>=33?1:0) + (S.m.fans>=70 && rt>=7.0 ? 1 : 0)); }
function offerOpt(x, yrs, note){
  const w = wageFor(x.id), role = ROLES[roleFor(x)]; mgrOf(x.id);
  return { t:`${note||'簽約'}${x.n}`, s:`${isAbroadLg(x.lg) ? `${CTY[LG[x.lg].cty].n}・` : ''}${LG[x.lg].n}｜${yrs} 年｜週薪 ${money(w)}｜預計${role}｜主帥打法：${fitTxt(x.id)}`, confirm:x.id!==S.pro.club, f:()=>sign(x, yrs, w) };
}
function sign(x, yrs, w){
  const moved = x.id!==S.pro.club, oldId = S.pro.club;
  if(moved) legendFarewell(oldId);
  S.pro.club = x.id; S.pro.cyrs = yrs; S.pro.wage = w; S.pro.loan = null; S.pro.semi = x.lg==='NON'; S.pro.wasNL = false; proMark(x);
  if(moved){ S.pro.trust = 48+leadAdj(); S.pro.captain = false; S.pro.num = numFor(x.id); S.pro.numClub = x.id; if(!isAbroadLg(x.lg)) logLine(`${S.age} 歲加盟${x.n}（${LG[x.lg].short}）`); }
  UI.card('good', moved?`加盟${x.n}`:`與${x.n}續約`, `${yrs} 年合約，週薪 ${money(w)}。`);
  if(moved) abroadAfterSign(x, () => contractNext()); else contractNext();
}
let contractNext = () => {};
function contractTime(done){
  contractNext = done;
  const cur = club(S.pro.club), o = ovr(), age = S.age;
  if(S.pro.loan){ UI.card('', '外借結束', `你返回${cur.n}。`); S.pro.loan = null; }
  S.pro.cyrs--;
  let relClause = !!LG[cur.lg].pool;
  if(relClause){ S.pro.cyrs = 0; UI.card('event', '降班條款', `${cur.n}降落${LG[cur.lg].n}。你的合約有降班解約條款，可以自由轉會。`); }
  /* 隨球會由英議聯升上英足聯：難度越高，越可能不獲新一季合約 */
  else if(!S.pro.loan && (S.lastMoves||[]).some(m => m[0]===cur.id && m[1]==='NL' && LG[m[2]].lvl<=4) && !chance(dif().keep*100)){
    relClause = true; S.pro.cyrs = 0; S.pro.wasNL = true; UI.card('bad', '升班後大換血', `${cur.n}升上${LG[cur.lg].n}後大幅換血，你被告知不在新一季的計劃之內。`); }
  /* 隨球會升上英超：現實難度下，球會可能大換血而不再需要你 */
  else if(!S.pro.loan && (S.lastMoves||[]).some(m => m[0]===cur.id && m[2]==='PL') && !chance((dif().plKeep ?? 1)*100)){
    relClause = true; S.pro.cyrs = 0; UI.card('bad', '升班後大換血', `${cur.n}升上英超後斥資引入多名球員，你被告知不在新一季的計劃之內。`); }
  /* 年輕職業球員合約屆滿：從未在英足聯一隊站穩，難度越高越可能被放棄 */
  const noFirst = age<=22 && LG[cur.lg].lvl<=4 && !isAbroadLg(cur.lg) && !S.hist.some(r => r.lg!=='DEV' && LG[r.lg] && LG[r.lg].lvl<=4 && r.app>=5);
  if(!relClause && S.pro.cyrs<=0 && noFirst && !chance(dif().young*100)){
    relClause = true; S.pro.wasNL = true; UI.card('bad', '不獲續約', `${cur.n}決定不與你續約。沒有一隊上陣經驗的你，要到低級別聯賽重新證明自己。`); logLine(`${age+1} 歲不獲${cur.n}續約`); }
  if(!relClause && !S.pro.loan) proMark(cur);
  if(age>=(S.pos==='GK'?40:38) || (age>=(S.pos==='GK'?37:35) && o < LG.NL.par-4)){ endGame(`${age+1} 歲，身體告訴你是時候停下來了。`); return; }
  const opts = [];
  const young = age<=21 && roleCalc().r>=2 && !S.pro.semi;
  if(S.pro.cyrs>0){
    opts.push({ t:`留在${cur.n}`, main:true, s:`合約尚餘 ${S.pro.cyrs} 年`, f:()=>{ UI.card('', '留隊', `你留在${cur.n}。`); done(); } });
    const ag = agentOffers(), lst = S.pro.listed===S.year ? 2 : 0, n = offerCount(false) + ag + lst + (isAbroad() && S.flags.homeWish===S.year ? 1 : 0);
    if(lst) UI.card('', '轉會要求', `你早前已向${cur.n}提出轉會要求。`);
    if(n>0){ const offs = genOffers(n, ag>0 || lst>0).filter(x => x.str > cur.str+1 || S.pro.lastRt>=7.2 || ag>0 || lst>0 || (isAbroad() && S.flags.homeWish===S.year));
      if(offs.length){ UI.card('event', ag ? '經紀人帶來報價' : '轉會傳聞', ag ? `${agentOf().n}按你的要求聯絡了多間球會：` : `有球會向${cur.n}提出報價：`); offs.forEach(x => opts.push(offerOpt(x, ri(3,5), '轉會至'))); if(ag && S.agent) S.agent.rel = clamp(S.agent.rel+3,0,100); }
      else if(ag) UI.card('', '經紀人回報', '經紀人聯絡了幾間球會，但暫時沒有合適的報價。'); }
    abroadOffers().forEach(x => opts.push(offerOpt(x, ri(3,5), '轉會至')));
    if(young){ const lo = loanOffers(ri(1,2)); lo.forEach(x => opts.push({ t:`外借至${x.n}一季`, s:`${LG[x.lg].n}｜預計${ROLES[clamp(roleFor(x),0,3)]}`, f:()=>{ S.pro.loan = { club:x.id }; S.pro.trust = 50; logLine(`${age+1} 歲外借至${x.n}（${LG[x.lg].short}）`); UI.card('good',`外借至${x.n}`, `下季你將效力${x.n}。`); done(); } })); }
  } else {
    if(!relClause) UI.card('event','合約到期', `你與${cur.n}的合約已經屆滿。`);
    if(!relClause && o >= cur.str-5 && S.pro.trust>=30 && age<36) opts.push(offerOpt(cur, age>=32?1:ri(2,4), '續約'));
    genOffers(offerCount(true) + agentOffers() + (relClause?1:0), true).forEach(x => opts.push(offerOpt(x, age>=32?ri(1,2):ri(2,4))));
    abroadOffers().forEach(x => opts.push(offerOpt(x, age>=32?ri(1,2):ri(2,4))));
    if(!opts.length){ const lower = shuffle(Object.values(S.W.clubs).filter(x => !LG[x.lg].pool && x.id!==cur.id && o >= x.str-3 && o >= LG[x.lg].par-5 && x.str < cur.str)).slice(0,2).filter(diffGate); lower.forEach(x => opts.push(offerOpt(x, 1))); }
    if(!opts.length){ endGame(`${age+1} 歲合約到期，再沒有球會報價，宣布退役。`); return; }
  }
  if(age>=32) opts.push({ t:'宣布退役', warn:true, s:'生涯結束', f:()=>endGame(`${age+1} 歲夏天宣布退役。`) });
  UI.choose('夏季轉會窗：你的決定？', opts);
}

/* ---------- 結局 ---------- */
function plStats(){ return S.hist.filter(r=>r.lg==='PL').reduce((t,r)=>({ app:t.app+r.app, g:t.g+r.g, a:t.a+r.a, cs:t.cs+(r.cs||0) }), { app:0, g:0, a:0, cs:0 }); }
function careerStats(){ return S.hist.filter(r=>r.lg!=='DEV').reduce((t,r)=>({ app:t.app+r.app, g:t.g+r.g, a:t.a+r.a, cs:t.cs+(r.cs||0) }), { app:0, g:0, a:0, cs:0 }); }
const HONOUR_PTS = [[/^英超冠軍/,120,true],[/^(西甲|意甲|德甲|法甲)冠軍/,100,true],[/^(國王盃|意大利盃|德國盃|法國盃)冠軍/,25,true],[/^(西甲|意甲|德甲|法甲)金靴/,50],[/^(西甲|意甲|德甲|法甲)金手套/,50],[/^(西甲|意甲|德甲|法甲)年度最佳球員/,75],[/^(西甲|意甲|德甲|法甲)年度最佳陣容/,20],[/^FA Cup/,30,true],[/^聯賽盃/,15,true],[/^英超金靴/,60],[/^英超金手套/,60],[/^PFA 年度最佳球員/,90],[/^PFA 年度最佳年輕/,30],[/^英超年度最佳陣容/,25],[/^英超隊長/,12],
  [/球衣退役/,60],[/銅像/,80],[/十年服務/,15],[/告別賽/,10],[/(世界盃|歐洲國家盃)金靴/,40],[/(世界盃|歐洲國家盃)最佳球員/,60],[/^英冠冠軍/,25,true],[/^英甲冠軍/,15,true],[/^英乙冠軍/,10,true],[/^英議聯冠軍/,8,true],[/升級/,10,true],[/年度最佳陣容/,8],[/金靴|金手套/,8],[/冠軍）$/,100],[/（亞軍）$/,40],[/（4 強）$/,20]];
function dominance(){
  let s = 0; const parts = {};
  S.honours.forEach(h => { const rule = HONOUR_PTS.find(([re]) => re.test(h.t)); if(!rule) return; const v = rule[1]*(rule[2]&&h.role!=null?ROLE_MUL[h.role]:1); s += v; parts[h.t.replace(/^\d+ /,'')] = (parts[h.t.replace(/^\d+ /,'')]||0) + v; });
  const pl = plStats(), ab = abroadStats(); s += pl.app*0.6 + pl.g*1.2 + pl.a*0.6 + pl.cs*1.6 + S.caps*1.5 + ab.app*0.5 + ab.g*1 + ab.a*0.5 + ab.cs*1.3;
  return Math.round(s);
}
function evaluate(){
  const sc = dominance(), pl = plStats(), cs = careerStats();
  const pro = S.hist.some(r => ['PL','CH','L1','L2',...LG_ABROAD].includes(r.lg) && r.app>0), ab = abroadStats();
  const nonl = S.hist.some(r => ['NL','NON'].includes(r.lg) && r.app>0);
  const eu = ab.app > pl.app && ab.app>=30;
  const tier = eu ? (sc>=1600?'歐洲傳奇' : sc>=900?'歐洲巨星' : sc>=450?'歐洲名將' : '五大聯賽球員')
    : sc>=1600?'英超傳奇' : sc>=900?'英超巨星' : sc>=450?'英超名將' : pl.app>=30?'英超球員' : pro?'職業球員' : nonl?'非聯賽球員' : '未能成為職業球員';
  return { sc, tier, pl, cs, ab };
}
function endGame(reason){
  S.endReason = reason; logLine(reason);
  afterCareer(() => { S.done = true; checkAch(); UI.save(); UI.end(evaluate()); });
}
