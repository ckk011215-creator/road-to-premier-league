/* ================= 開局、同屆、青訓學期循環 ================= */

const PERS_N = { conf:'自信', disc:'自律', comp:'抗壓', grit:'鬥志', calm:'冷靜' };
const FOOT_N = { R:'右腳', L:'左腳', B:'雙腳' };
const PARENT_N = { support:'支持但不施壓', pushy:'非常投入（經常在場邊吶喊）', study:'重視學業', distant:'不太過問' };
const SIB_N = { none:'獨生', bro:'有哥哥', sis:'有姐姐', young:'有弟妹' };

function newGame(cfg){
  seedInit(cfg.seed);
  S = { v:SAVE_VER, seed:cfg.seed, ver:GAME_VER, diff:cfg.diff||'normal', look:cfg.look ? { ...cfg.look } : null };
  S.W = initWorld();
  /* 父母態度、兄弟姊妹、交通、學校：不由玩家選擇，由種子隨機決定 */
  cfg = { ...cfg };
  if(cfg.posTrait) cfg.pers = persFrom(cfg.posTrait, cfg.negTrait);
  cfg.mat = 'norm'; cfg.born = 'ENG';
  if(!cfg.parent) cfg.parent = wpick(['support','pushy','study','distant'], x => ({support:4,pushy:2,study:2,distant:1})[x]);
  if(!cfg.sib) cfg.sib = wpick(['none','bro','sis','young'], x => ({none:3,bro:2,sis:2,young:2})[x]);
  if(cfg.car==null) cfg.car = chance(cfg.wealth===0 ? 60 : 88);
  if(!cfg.school) cfg.school = cfg.wealth>=3 && chance(35) ? 'private' : 'state';
  Object.assign(S, {
    first:cfg.first, last:cfg.last, bm:cfg.bm, mat:cfg.mat==='random'?pick(['early','norm','norm','late']):cfg.mat, matHidden:cfg.mat==='random',
    fatherH:cfg.fatherH, motherH:cfg.motherH, body:cfg.body, foot:cfg.foot, pers:{...cfg.pers}, posTrait:cfg.posTrait||null, negTrait:cfg.negTrait||null,
    city:cfg.city, wealth:cfg.wealth, parent:cfg.parent, sib:cfg.sib, car:cfg.car, heritage:cfg.heritage, born:cfg.born, school:cfg.school,
    fav:cfg.fav, posPref:cfg.posPref, spot:cfg.spot||null, role:cfg.role||null,
    age:6, year:2026, term:0, stage:'GR', gr:pick(CITIES[cfg.city].gr),
    m:{ fat:15, love:72, conf:30+cfg.pers.conf*6, coach:50, fam:72, study:55, scout:4, mates:50+leadAdj0(cfg), fans:20 }, money:START_MONEY[cfg.wealth] + Math.max(0, CREATE_BUDGET-cfgCost(cfg))*30, items:{}, talent:cfg.talent||0,
    flags:{}, tmp:{}, fam:{}, gain:{}, log:[], hist:[], honours:[], cohort:[], seen:[], aca:null, pro:null, earn:0, caps:0, nt:null
  });
  if(cfg.school==='private'){ S.m.study += 12; S.m.love -= 3; }
  S.m.coach += leadAdj();
  S.adultH = Math.round((cfg.fatherH + cfg.motherH + 13)/2 + N0(3.5));
  S.spurtJit = r1(rf(-0.4,0.4));
  S.h = r1(117 + (S.adultH-176)*0.3);
  /* 隱藏天賦上限，加上體格修正 */
  const C = clamp(60 + N0(12), 36, 96); S.ceil = r1(C);
  /* 天賦上限：共同基數（天賦已計入 capMods）＋每項能力隨機＋各設定修正 */
  const { mods:mod } = capMods(cfg, S.adultH); mod.__ = 0;
  const HC = HERITAGE[cfg.heritage];
  S.pot = {}; S.ab = {};
  ATTRS.forEach(k => { S.pot[k] = r1(clamp(C + ri(-12,5) + mod[k], 28, 97)); S.ab[k] = r1(ri(5,10) + S.pot[k]*0.06 + (cfg.foot==='B'&&(k==='tec'||k==='sho')?1.5:0) + (HC.b&&HC.b[k]?1.5:0)); });
  S.pos = cfg.posPref!=='none' ? cfg.posPref : bestPositions()[0][0];
  setAttrSet(S.pos==='GK');
  S.fam[S.pos] = 0.3;
  for(let i=0;i<6;i++) S.cohort.push(makeNpc('GR', null, i===0?'friend':null));
  S.flags.firstGr = S.gr;
  logLine(`${S.year} 年 9 月，${S.age} 歲，在${CITIES[S.city].n}加入${S.gr}。`);
  return S;
}
const leadAdj0 = cfg => cfg.posTrait==='leader' ? 8 : cfg.negTrait==='selfish' ? -10 : 0;
const leadAdj = () => S.posTrait==='leader' ? 8 : S.negTrait==='selfish' ? -6 : 0;
const fullName = () => `${S.first}・${S.last}`;
function logLine(t){ S.log.push({ y:S.year, age:S.age, t }); }

/* ---------- 同屆 NPC ---------- */
function makeNpc(st, clubId, tag){
  const pos = pick(POS_ORDER), pot = clamp(st==='GR' ? 50 + N0(11) : 54 + N0(9), 32, 95);
  const rel = ri(0,11)/12, mat = pick(['early','norm','norm','late']);
  const base = st==='GR' ? r1(ri(8,14)+pot*0.05) : r1(E(S.age)*CAT_F[club(clubId)?.cat||2]*rf(0.86,1.05)/physF(S.age,rel,mat));
  return { n:npcName(), pos, pot:r1(pot), ab:base, rate:r1(rf(0.8,1.2)), rel, mat, st, club:clubId, tag, note:'', hist:[] };
}
function npcPerf(n, age){ return n.ab*(0.75+0.25*physF(age,n.rel,n.mat)); }
function npcNote(n, t){ n.note = t; n.hist.push(`${S.age} 歲：${t}`); }
function updateCohort(){
  const news = [], age = S.age;
  S.cohort.forEach(n => {
    if(n.st==='QUIT') return;
    n.ab = Math.min(99, n.ab + ageEff(age)*n.rate*Math.max(0,(n.pot-n.ab)/n.pot)*5.6 + rf(-0.6,0.6));
    const p = npcPerf(n, age);
    if(n.st==='GR'){
      if(age>=7 && age<=14){ const thr = E(age)*CAT_F[3]; if(p > thr*rf(0.95,1.08) && chance(35)){ const opts = nearAcademies(age>=11); if(opts.length){ const c = pick(opts); n.st='ACA'; n.club=c.id; npcNote(n, `加入${c.n}學院`); news.push(`${n.n}加入${c.n}學院。`); } } }
      if(age>=13 && chance(12)){ n.st='QUIT'; npcNote(n,'不再參加有組織足球'); news.push(`${n.n}決定不再踢球，專心讀書。`); }
      if(age===15 && n.st==='GR'){ if(p>E(age)*0.75 && chance(40)){ n.st='NON'; n.club=pick(clubsIn('NON')).id; npcNote(n,`加入非聯賽球會${cName(n.club)}青年隊`); } else { n.st='QUIT'; npcNote(n,'畢業後不再踢球'); } }
    } else if(n.st==='ACA'){
      const c = club(n.club), thr = E(age)*CAT_F[c.cat||3];
      const review = [8,9,10,12,15].includes(age);
      if(review && p < thr*rf(0.9,1.02)){
        if(age===15){ if(chance(45)){ n.st='NON'; n.club=pick(clubsIn('NON')).id; npcNote(n,`16 歲未獲 Scholarship，加入非聯賽球會${cName(n.club)}`); } else { n.st='QUIT'; npcNote(n,'16 歲被放棄，轉讀 college'); } }
        else { n.st='GR'; npcNote(n,`${age+1} 歲被${c.n}放棄`); }
        news.push(`${n.n}被${c.n}放棄。`);
      } else if(age===15){ n.st='SCH'; npcNote(n,`獲${c.n} Scholarship`); news.push(`${n.n}獲${c.n}簽下 Scholarship。`); }
    } else if(n.st==='SCH'){
      if(age===17){ const c = club(n.club); if(p > E(17)*CAT_F[c.cat||3]*rf(0.9,1.04)){ n.st='PRO'; npcNote(n,`與${c.n}簽訂職業合約`); news.push(`${n.n}與${c.n}簽訂職業合約。`); } else if(chance(35)){ n.st='PRO'; n.club=npcClubFor(n.ab-3); npcNote(n,`被放棄後轉投${cName(n.club)}`); news.push(`${n.n} 18 歲被放棄，轉投${cName(n.club)}。`); } else { n.st='NON'; n.club=pick(clubsIn('NON')).id; npcNote(n,`18 歲被放棄，加入非聯賽球會${cName(n.club)}`); news.push(`${n.n} 18 歲被放棄，降落非聯賽。`); } }
    } else if(n.st==='PRO' || n.st==='NON'){
      if(age>=33 && chance(25+(age-33)*15)){ n.st='QUIT'; npcNote(n,`${age} 歲退役`); news.push(`${n.n}宣布退役。`); return; }
      if(age>=30) n.ab -= rf(0.5,2.2);
      if(chance(30)){ const nc = npcClubFor(n.ab); if(nc!==n.club){ const up = LG[club(nc).lg].lvl < LG[club(n.club).lg].lvl; n.club = nc; n.st = club(nc).lg==='NON'?'NON':'PRO'; npcNote(n,`轉會至${cName(nc)}（${LG[club(nc).lg].short}）`); if(up && club(nc).lg==='PL') news.push(`${n.n}轉會至英超球會${cName(nc)}。`); } }
    }
  });
  return news;
}
function npcClubFor(ab){ const lg = LG_ORDER.find(l => ab >= LG[l].par+1) || 'NON'; return pick(clubsIn(lg)).id; }
function npcStatusTxt(n){
  const m = { GR:'草根球會', ACA:`${cName(n.club)}學院`, SCH:`${cName(n.club)}學徒`, PRO:`${cName(n.club)}（${n.club?LG[club(n.club).lg].short:''}）`, NON:`${cName(n.club)}（非聯賽）`, QUIT:'已離開足球' };
  return m[n.st];
}

/* ---------- 地區學院 ---------- */
function regionsInRange(wide){ const c = CITIES[S.city]; return wide ? [...c.near, ...c.mid] : c.near.length ? c.near : c.mid; }
function nearAcademies(wide){ const rs = regionsInRange(wide ?? S.age>=11); return Object.values(S.W.clubs).filter(c => c.cat>0 && rs.includes(c.reg)); }
function isFar(c){ return !CITIES[S.city].near.includes(c.reg); }
function altPos(){
  const bp = bestPositions().filter(([p]) => p!==S.pos);
  const best = bp[0]; if(!best) return null;
  return best[1] > ovrAt(S.pos)*1.04 ? best[0] : null;
}

/* ---------- 流程工具 ---------- */
function runSeq(steps, done){ let i = 0; const go = () => { if(S.done) return; const f = steps[i++]; if(!f){ done&&done(); return; } f(go); }; go(); }

function pageTitle(){
  if(['GR','ACA','SCH'].includes(S.stage)) return `${seasonLabel(S.year)}・${TERMS_Y[S.term]}`;
  return `${seasonLabel(S.year)}・${TERMS_P[S.term]}`;
}
function stageLabel(){
  if(S.stage==='GR') return `${S.gr}・${ageGroup(S.age)}`;
  if(S.stage==='ACA') return `${cName(S.aca.club)}學院・${ageGroup(S.age)}`;
  if(S.stage==='SCH') return `${cName(S.aca.club)}學徒・第 ${S.age-15} 年`;
  if(S.stage==='PRO'){ const c = club(curClub()); return `${c.n}（${LG[c.lg].short}）${S.pro.loan?'・外借':''}`; }
  return '';
}

function termIntro(next){
  if(!S.flags.prologue){ S.flags.prologue = 1;
    const who = S.sib==='bro' ? '哥哥' : S.parent==='distant' ? '祖母' : '父親';
    const rel = S.bm<=2 ? '你在學年初出生，比班上大部分同學年長幾個月，身形也較高大。' : S.bm>=9 ? '你在學年末出生，是全班年紀最小的一批，很多同學比你年長將近一年。' : '';
    const fam = { support:'父母十分支持你，但從不施加壓力。', pushy:'父親非常緊張你的足球，每場比賽都在場邊。', study:'母親經常提醒你：「讀書才是正事。」', distant:'父母工作繁忙，很少來看你比賽。' }[S.parent];
    UI.card('info','序章', `${CITIES[S.city].n}，${S.year} 年 9 月。六歲的你第一次到${esc(S.gr)}試訓，${who}替你付了 £2 試訓費。${S.born==='ABR'?'你在外國出生，年幼時隨家人移居英格蘭。':''}<br>${rel}${fam}${S.wealth===0?'家境拮据，球鞋要穿到破爛才更換。':S.wealth>=2?'家境寬裕，訓練營和私人教練都負擔得起。':''}${HERITAGE[S.heritage].cul?`家人經常跟你談起${HERITAGE[S.heritage].cul}。`:''}`); }
  /* 發育期 */
  growHeight();
  const t = S.age + S.term/3, sp = spurtStart();
  if(!S.spurt && t >= sp){ S.spurt = { on:true, left:3 }; UI.card('info','發育期',`${S.age} 歲，你突然長高了許多，褲管短了一截。雙腿彷彿不屬於自己，跑動時有點失去平衡，觸球也不及以往順暢。<br>隊醫說：「這很正常，大約一年便會穩定。」`); if(S.stage!=='GR'){ UI.choose('如何應對發育期？',[
      { t:'保持耐性，照常訓練', s:'自律越高越穩定', f:()=>{ const tx=fx({conf:S.pers.disc>=4?0:-3}); UI.card('',`照常訓練`,`你沒有急躁，按教練的安排進行訓練。${tx?`<div class="fx">${tx}</div>`:''}`); next2(); } },
      { t:'加練協調與步法', s:'技術、速度；疲勞↑', f:()=>{ const tx=fx({tec:3,pac:2,fat:6}); UI.card('',`加練協調`,`你每天放學後練習繩梯和小欄架。<div class="fx">${tx}</div>`); next2(); } },
      { t:'擔心自己退步', s:'自信↓', f:()=>{ const tx=fx({conf:-6,love:-3}); UI.card('bad','憂慮',`你開始害怕教練不再選用你。<div class="fx">${tx}</div>`); next2(); } } ]); return; } }
  else if(S.spurt && S.spurt.on){ S.spurt.left--; if(S.spurt.left<=0){ S.spurt.on=false; S.spurt.done=true; UI.card('good','發育穩定',`你現在身高 ${Math.round(S.h)} 厘米，身體協調已完全恢復。對抗時，你發現自己不再輕易被撞開。`); } }
  next2();
  function next2(){
    if(S.term===0){
      const lines = [`${ageGroup(S.age)}・${formatOf(S.age)}${S.age<=10?'・不設公開積分榜，只有短期盃賽':''}`];
      if(S.stage==='GR') lines.push(`你繼續在${esc(S.gr)}參加星期日聯賽。`);
      if(S.stage==='ACA') lines.push(`${cName(S.aca.club)}學院（${catN(S.aca.cat)}），每星期訓練${S.age<=10?'兩':'三'}晚。`);
      if(S.stage==='SCH') lines.push(`全職學徒：每日訓練，每星期一天上課，參加 U18 英超聯。`);
      UI.card('', `${S.year} 年 9 月・${S.age} 歲`, lines.join('<br>'));
    }
    if(S.inj && S.inj.w>0){ UI.card('bad','傷患',`你還需要 ${S.inj.w} 星期才能復出。`); }
    next();
  }
}

/* ---------- 裝備與訓練資源 ---------- */
function itemPassives(){
  if(!S.items) S.items = {};
  SHOP.forEach(x => { if(!S.items[x.id] || !x.per) return; for(const k in x.per){ if(k==='weak') train(weakestKey(), x.per[k]); else train(k, x.per[k]); } if(x.fat) fx({ fat:x.fat }); });
}
function shopAvail(){ return SHOP.filter(x => !S.items[x.id] && (!x.min||S.age>=x.min) && (!x.max||S.age<=x.max) && !(S.stage==='SCH' && ['futsal','camp'].includes(x.id))); }
function shopStep(next){
  if(!S.items) S.items = {};
  if(S.term!==0 || S.age>17) { next(); return; }
  const list = shopAvail().filter(x => x.p <= S.money);
  if(!list.length){ next(); return; }
  const owned = SHOP.filter(x=>S.items[x.id]).map(x=>x.n);
  UI.card('', '新學年・購買裝備', `你有 <b>£${S.money}</b> 零用錢。${owned.length?`已擁有：${owned.join('、')}。`:''}<br><span class="hint">年費項目將於翌年 9 月到期。</span>`);
  const loop = () => {
    const l = shopAvail().filter(x => x.p <= S.money);
    if(!l.length){ next(); return; }
    UI.choose(`想購買甚麼？（餘額 £${S.money}）`, [ ...l.map(x => ({ t:`${x.n}・£${x.p}`, s:`${x.d}${x.yr?'｜一年':''}`, f:()=>{ S.money -= x.p; S.items[x.id] = 1; logLine(`${S.age} 歲購買${x.n}`); UI.card('good', x.n, `已購買！${x.d}。`); loop(); } })),
      { t:'不再購買，保留餘款', main:true, f:next } ]);
  };
  loop();
}

/* ---------- 隨機事件 ---------- */
/* 連鎖事件到期時一定觸發 */
const dueChain = () => (S.evq||[]).find(q => q.t <= (S.tc||0) && EVENTS.some(e => e.id===q.id && e.st.includes(S.stage) && S.age>=e.a[0] && S.age<=e.a[1]));
function maybeEvent(p){ return next => { if(!dueChain() && !chance(p)) { next(); return; } runEvent(next); }; }
function runEvent(next){
  const due = dueChain();
  let e;
  if(due){ S.evq = S.evq.filter(q => q!==due); e = EVENTS.find(x => x.id===due.id); }
  else { const pool = EVENTS.filter(e => !e.chain && e.st.includes(S.stage) && S.age>=e.a[0] && S.age<=e.a[1] && (!e.c || e.c()) && !S.seen.slice(-14).includes(e.id));
    e = wpick(pool, x => typeof x.w==='function' ? x.w() : (x.w||1)); }
  if(!e){ next(); return; }
  S.seen.push(e.id);
  UI.card('event', e.t, e.d());
  const opts = e.o().filter(o => !o.c || o.c());
  UI.choose('你會如何選擇？', opts.map(o => ({ t:o.t, s:o.s, f:() => resolveOpt(o, e, next) })));
}
function resolveOpt(o, e, next){
  if(o.f){ o.f(() => { o.f2 && o.f2(); next(); }); return; }
  let res = o;
  if(o.p!=null){ const p = typeof o.p==='function' ? o.p() : o.p; res = chance(p) ? o.ok : o.ng; }
  const rel = (REL_FX[e.id]||{})[o.t], t = [fx(res.fx||{}), rel ? fx(rel) : ''].filter(Boolean).join('、'); o.f2 && o.f2();
  UI.card(res===o.ng?'bad':'', o.t, `${res.r||''}${t?`<div class="fx">${t}</div>`:''}`);
  next();
}

/* ---------- 青訓學期：開始（保留學期事件）、比賽、結束 ---------- */
function youthStart(sl, next){
  S.money += ALLOW[S.wealth];
  if(S.term===0) S.ss = { app:0, g:0, a:0, cs:0, rt:0 };
  if(S.parent==='study') fx({study:2});
  if(S.parent==='pushy' && S.stage!=='SCH') fx({fam:-1, love:-1});
  runSeq([termIntro, shopStep, maybeEvent(85)], next);
}
function youthEnd(sl, next){
  itemPassives();
  termEnd(() => { if(S.term < 2){ next(); return; } yearEndYouth(next); });
}
function coachLine(){
  const ratio = perf()/(E(S.age)*(S.stage==='ACA'?CAT_F[S.aca.cat]:S.stage==='SCH'?0.97:0.8));
  const ks = keyAttrs(), best = ks.slice().sort((a,b)=>eff(b)-eff(a))[0], worst = ks.slice().sort((a,b)=>eff(a)-eff(b))[0];
  const tone = ratio>=1.12?`「你是這個年齡組最出色的幾人之一。」`:ratio>=1.02?`「你做得不錯，繼續保持。」`:ratio>=0.94?`「有進步，但需要更穩定。」`:`「你要加把勁，其他人正在追趕你。」`;
  return `教練：${tone}他稱讚你的${ATTR_N[best]}，並叫你多練習${ATTR_N[worst]}。`;
}
function settleMeters(){ S.m.conf = Math.round(S.m.conf + (55 - S.m.conf)*0.12); S.m.love = Math.round(S.m.love + (62 - S.m.love)*0.06); }
function termEnd(next){
  settleMeters();
  const d = Object.keys(S.m).map(k => [k, S.m[k]-S.mStart[k]]).filter(x=>x[1]).map(([k,v]) => `${METER_N[k]} ${v>0?'+':''}${v}`).join('、');
  const ups = Object.entries(S.gain).filter(([,g])=>g>=1.1).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k])=>ATTR_N[k]);
  UI.card('summary', `${TERMS_Y[S.term]}總結`, `${S.stage!=='GR'||S.age>=8?coachLine():'你玩得很開心，每個星期都期待星期日的到來。'}${ups.length?`<br>本學期明顯進步：${ups.join('、')}`:''}${d?`<div class="fx">${d}</div>`:''}`);
  if(S.m.love < 22 && !S.flags.burn){ S.flags.burn = 1; UI.card('bad','不想再踢','有一晚你對母親說：「我不想再去訓練了。」踢球變成了一份工作。');
    UI.choose('怎麼辦？', [
      { t:'休息一個月', s:'熱誠↑↑、教練印象↓', f:()=>{ const t=fx({love:25,fat:-20,coach:-6}); UI.card('','休息',`你一個月沒有碰過足球。回來後的第一課，你發現自己十分想念它。<div class="fx">${t}</div>`); next(); } },
      { t:'咬緊牙關繼續', s:'鬥志越高越能堅持', f:()=>{ const t=fx({love:S.pers.grit>=4?8:-4,conf:-2}); UI.card('','繼續',`你強迫自己出席。${t?`<div class="fx">${t}</div>`:''}`); next(); } } ]); return; }
  next();
}
/* ---------- 學年終結 ---------- */
function gradeOf(v, ref){ const r = v/ref; return r>=1.18?'A+':r>=1.07?'A':r>=0.97?'B':r>=0.87?'C':r>=0.77?'D':'E'; }
function reportCard(){
  const ref = E(S.age)*0.95, ks = keyAttrs();
  const rows = ATTRS.map(k => { let g = gradeOf(eff(k), ref); if(chance(18)){ const gs=['A+','A','B','C','D','E'], i=gs.indexOf(g); g = gs[clamp(i+pick([-1,1]),0,5)]; } return `<span class="gr ${ks.includes(k)?'key':''}"><i>${ATTR_N[k]}</i><b class="g-${g.replace('+','p')}">${g}</b></span>`; }).join('');
  const bp = bestPositions().slice(0,3).map(([p])=>POS[p].n).join('、');
  UI.card('report', `${ageGroup(S.age)} 年度報告`, `<div class="grades">${rows}</div><p>身高 ${Math.round(S.h)} 厘米。教練認為你最適合：${bp}。</p><p class="hint">評級是教練與同齡球員比較後的主觀判斷，未必準確；粗體為你現時位置的關鍵能力。</p>`);
}
function yearEndYouth(done){
  UI.newPage(`${seasonLabel(S.year)}・學年結束`);
  if(S.items && S.items.camp){ const t = fx(S.stage==='GR' ? { scout:9, tec:2, conf:3 } : { coach:5, tec:2, iq:1 }); UI.card('good','暑期精英訓練營', `你在訓練營練習了一個星期，${S.stage==='GR'?'場邊有幾名學院球探。':'學院教練收到營主任的好評。'}<div class="fx">${t}</div>`); }
  if(S.items) SHOP.filter(x=>x.yr).forEach(x => delete S.items[x.id]);
  if(S.age>=7) reportCard();
  const news = updateCohort();
  if(news.length) UI.card('cohort','同屆消息', news.slice(0,5).map(esc).join('<br>'));
  const steps = [];
  if(S.age===15) steps.push(gcse);
  if(S.stage==='GR') steps.push(grassrootsYearEnd);
  else if(S.stage==='ACA') steps.push(academyYearEnd);
  else if(S.stage==='SCH') steps.push(scholarYearEnd);
  runSeq(steps, done);
}
function gcse(next){
  const s = S.m.study, g = s>=80?'7 科 A* 至 A':s>=62?'6 科合格，數學與英文均合格':s>=45?'4 科合格，英文不合格':'只有 2 科合格';
  S.gcse = s;
  UI.card(s>=45?'':'bad','GCSE 放榜', `你的 GCSE 成績：${g}。${s<45?'母親沉默了很久。':''}`);
  logLine(`GCSE：${g}`);
  next();
}
/* 草根期：球探邀請 */
function grassrootsYearEnd(next){
  const a = S.age;
  if(a<=6){ if(S.m.scout>=22 && !S.devc){ const c = pick(nearAcademies(false).filter(x=>x.cat<=2).length?nearAcademies(false).filter(x=>x.cat<=2):nearAcademies(true)); if(c){ S.devc = c.id; UI.card('good','發展中心', `${c.n}的球探看了你幾場比賽，邀請你參加他們的預備學院發展中心，逢星期六訓練。`); logLine(`加入${c.n}發展中心`); } } next(); return; }
  if(a>=15){ sixteenNoScholar(next); return; }
  const cands = nearAcademies(a>=10);
  const p0 = perf();
  const invites = shuffle(cands.slice()).filter(c => { const thr = E(a+1)*CAT_F[c.cat]; const pr = clamp(S.m.scout*0.3 + (p0/thr - 0.96)*140 + (S.devc===c.id?18:0) + (S.flags.campSeen===c.id?10:0), 0, 45); return chance(pr); }).slice(0,3);
  if(!invites.length){ UI.card('','沒有學院邀請', a<=8 ? '今年沒有學院球探聯絡你。你繼續參加星期日聯賽。':'又一年沒有學院聯絡你。星期日聯賽繼續，球探或許就在場邊。'); next(); return; }
  trialMenu(invites, '學院試訓邀請', `今年夏天有 ${invites.length} 間學院邀請你試訓（為期六星期）：`, next);
}
function trialMenu(list, title, txt, next, onFailAll){
  UI.card('good', title, txt + '<br>' + list.map(c => `・${c.n}（${catN(c.cat)}${isFar(c)?'，車程較遠':''}）`).join('<br>'));
  UI.choose('到哪一間試訓？', [...list.map(c => ({ t:c.n, s:`${catN(c.cat)}${isFar(c)?'｜車程較遠':''}`, f:()=>runTrial(c, ok => { if(ok) { next(); return; } const rest = list.filter(x=>x!==c); if(rest.length) trialMenu(rest, '其他邀請', '你還可以前往：', next, onFailAll); else { onFailAll ? onFailAll(next) : next(); } }) })),
    { t:'今年不去', s:'留在草根球會', f:()=>{ UI.card('','留下',`你決定在${esc(S.gr)}多留一年。`); onFailAll ? onFailAll(next) : next(); } }]);
}
function runTrial(c, cb){
  const a = S.age + 1, thr = E(a)*CAT_F[c.cat];
  UI.card('', `${c.n}試訓`, `為期六星期的試訓。第一晚你見到二三十名同齡孩子，每人都是自己球隊中最出色的一個。`);
  moment({ tag:`${c.n}試訓`, opp:'試訓分組賽', lvl:thr, stake:2, youth:true }, () => {
    const pr = perf()/thr, p = clamp(35 + (pr-1)*240 + (S.m.coach-50)*0.2, 3, 90);
    if(chance(p)){
      UI.card('good','試訓成功', `${c.n}學院經理與你的父母商談了二十分鐘：他們希望與你簽訂${a<=10?'一':'兩'}年註冊。`);
      UI.choose(`加入${c.n}學院？`, [
        { t:'加入', main:true, s:`${catN(c.cat)}${isFar(c)?'｜車程較遠，疲勞↑學業↓':''}`, f:()=>{ joinAcademy(c); cb(true); } },
        { t:'婉拒', s:'等待其他機會', f:()=>cb(false) } ]);
    } else {
      const wk = ATTR_N[weakestKey()];
      UI.card('bad','試訓失敗', `${c.n}教練說：「我們這次不會選你。你的${wk}需要再進步。」${a>=12?'':'他叫你的父母不要灰心，很多球員都經歷過這一步。'}`); fx({conf:-4+(S.pers.grit-3)});
      cb(false);
    }
  });
}
function joinAcademy(c){
  const prev = S.stage;
  S.stage = 'ACA'; S.aca = { club:c.id, cat:c.cat, since:S.age+1 };
  S.flags.far = isFar(c);
  S.m.coach = 52 + leadAdj(); S.m.scout = 0;
  if(relYears() < 0.34 && !S.flags.underdog){ S.flags.underdog = 1; }
  /* 學院同屆 */
  S.cohort = S.cohort.filter(n => n.st!=='ACA' || n.club!==c.id);
  for(let i=0;i<7;i++) S.cohort.push(makeNpc('ACA', c.id, i===0 && !S.cohort.some(n=>n.tag==='rival') ? 'rival' : null));
  S.cohort.forEach(n => { if(n.tag==='rival' && !n.posFix){ n.pos = S.pos; n.posFix = 1; } });
  const rv = S.cohort.find(n=>n.tag==='rival'); if(rv){ rv.pos = S.pos; }
  logLine(`${S.age+1} 歲加入${c.n}學院（${catN(c.cat)}）`);
  UI.card('gold', `加入${c.n}學院`, `你在學院辦公室簽名，父母在後面拍照。${prev==='ACA'?'':'由下個學年起，你不可以再代表星期日聯賽球隊參加正式比賽。'}${S.flags.underdog?'<br>你是隊中出生月份最遲的幾人之一，但你早已習慣比別人更努力。':''}`);
}
/* 學院：保留或放棄 */
function retainP(extraBias=0){
  const thr = E(S.age)*CAT_F[S.aca.cat], ratio = perf()/thr;
  const z = (ratio-1)*18 + (S.m.coach-50)/18 - 0.2 + extraBias;
  return { p: Math.round(100/(1+Math.exp(-z))), ratio };
}
function academyYearEnd(next){
  const a = S.age, c = club(S.aca.club);
  if(a===15){ scholarshipDecision(next); return; }
  const review = [8,9,10,12].includes(a);
  if(!review){ poachCheck(next); return; }
  const { p } = retainP();
  if(chance(p)){
    const yrs = a<=9?1:2;
    UI.card('good','獲得保留', `學院經理與你的父母會面：${c.n}將與你續簽 ${yrs} 年註冊。<br>${coachLine()}`);
    logLine(`${a+1} 歲獲${c.n}續約`);
    poachCheck(next);
  } else releaseMeeting(next);
}
function releaseMeeting(next){
  const c = club(S.aca.club), a = S.age;
  UI.card('bad','被學院放棄', `訓練結束後，教練在更衣室門口叫你的名字。學院經理的辦公室內，你的父母已經坐在那裏。<br>「我們決定不與你續簽註冊。」<br>十分鐘後，你提着球袋走出停車場。`);
  logLine(`${a+1} 歲被${c.n}放棄`);
  const t = fx({ conf:-14+(S.pers.grit-3)*3, love:-10+(S.pers.grit-3)*2 });
  if(t) UI.card('', '', `<div class="fx">${t}</div>`);
  S.stage = 'GR'; const oldClub = S.aca.club; S.aca = null; S.m.scout = 10; S.m.coach = 50; S.flags.released = 1;
  S.gr = pick(CITIES[S.city].gr);
  const others = nearAcademies(a>=10).filter(x => x.id!==oldClub && x.cat>=c.cat);
  UI.choose('下一步如何走？', [
    { t:'立即尋找其他學院試訓', s: others.length?`${others.length} 間可供試訓`:'車程範圍內沒有其他學院', c:others.length>0, f:()=>{ trialMenu(shuffle(others).slice(0,3), '其他學院', '經理替你寫了推薦信，以下學院願意給你試訓機會：', next); } },
    { t:`回到草根球會（${S.gr}）`, s:'繼續參加星期日聯賽，等待球探', f:()=>{ fx({love:6}); UI.card('',`回到${esc(S.gr)}`,'你回到泥地球場，昔日的隊友與你擊掌。你想起原來踢球可以這麼快樂。'); next(); } } ].filter(o=>o.c!==false));
}
function poachCheck(next){
  const a = S.age, cur = club(S.aca.club);
  if(a>=14 || cur.cat===1){ next(); return; }
  const cands = nearAcademies(a>=10).filter(x => x.cat < cur.cat && perf() > E(a+1)*CAT_F[x.cat]*1.02);
  if(!cands.length || !chance(35)){ next(); return; }
  const c = pick(cands), fee = (a+1<=11?3000:12500) * Math.max(1, a+2-S.aca.since);
  UI.card('event','挖角', `${c.n}學院（${catN(c.cat)}）希望簽下你，需要向${cur.n}支付約 £${fee.toLocaleString()} 補償費。`);
  UI.choose('是否轉會？', [
    { t:`轉投${c.n}`, s:'更高級別的學院，競爭更激烈', f:()=>{ joinAcademy(c); next(); } },
    { t:`留在${cur.n}`, s:'教練印象↑', f:()=>{ fx({coach:5}); UI.card('','留下',`${cur.n}教練得知你拒絕了邀請，對你更有信心。`); next(); } } ]);
}
function scholarshipDecision(next){
  const c = club(S.aca.club), { p } = retainP(-0.9);
  if(chance(p)){
    UI.card('gold','獲得 Scholarship', `${c.n}與你簽訂兩年 Scholarship（全職學徒合約）。九月起，你將成為全職學徒：每日訓練，每星期一天上課。`);
    logLine(`16 歲獲${c.n} Scholarship`);
    S.stage = 'SCH'; next();
  } else {
    UI.card('bad','未獲 Scholarship', `學院經理說：「我們今年只會簽六個人，你不在名單之內。」七年的學院生涯，在一次十分鐘的會面中結束。`);
    logLine(`16 歲未獲${c.n} Scholarship`); fx({ conf:-12+(S.pers.grit-3)*3, love:-8 });
    S.stage = 'GR'; S.aca = null; S.flags.released = 1; sixteenNoScholar(next);
  }
}
function sixteenNoScholar(next){
  const cands = nearAcademies(true).filter(c => c.cat>=2);
  const opts = [];
  if(cands.length) opts.push({ t:'到其他球會爭取 Scholarship', s:'Category 2／3 學院', f:()=>{ const list = shuffle(cands).slice(0,2);
    UI.card('', 'Scholarship 試訓', `你的父母打了許多電話，以下球會願意給你試訓機會：<br>${list.map(c=>`・${c.n}（${catN(c.cat)}）`).join('<br>')}`);
    let i = 0; const tryNext = () => { const c = list[i++]; if(!c){ UI.card('bad','全部失敗','沒有球會願意給你 Scholarship。'); nonLeagueStart(next); return; }
      moment({ tag:`${c.n}試訓`, opp:'U18 試訓賽', lvl:E(16)*CAT_F[c.cat], stake:2, youth:true }, () => {
        const pr = perf()/(E(16)*CAT_F[c.cat]*1.04); if(chance(clamp(15+(pr-1)*220,2,70))){ UI.card('gold','獲得 Scholarship',`${c.n}與你簽訂兩年 Scholarship。`); S.aca = { club:c.id, cat:c.cat, since:16 }; S.flags.far = isFar(c); S.stage='SCH'; S.m.coach=50; logLine(`16 歲獲${c.n} Scholarship`); next(); }
        else { UI.card('bad','試訓失敗',`${c.n}認為你水平未達標準。`); tryNext(); } }); };
    tryNext(); } });
  opts.push({ t:'讀 college，同時踢非聯賽', s:'雲迪、明斯走過的路', f:()=>nonLeagueStart(next) });
  opts.push({ t:'放棄足球，專心讀書', warn:true, s:'生涯結束', f:()=>endGame('16 歲放棄職業足球夢，專心讀書。') });
  UI.choose('16 歲，沒有 Scholarship。你如何選擇？', opts);
}
function nonLeagueStart(next){
  const rs = regionsInRange(true), cands = clubsIn('NON').filter(c=>rs.includes(c.reg));
  const c = pick(cands.length?cands:clubsIn('NON'));
  UI.card('', `加入${c.n}`, `你一邊讀 college，一邊加入非聯賽球會${c.n}的青年隊，17 歲便可升上一隊參加成人比賽。`);
  logLine(`${S.age+1} 歲加入非聯賽球會${c.n}`);
  startPro(c.id, { semi:true, yrs:2 });
  next();
}
/* 學徒：職業合約 */
function scholarYearEnd(next){
  const c = club(S.aca.club), a = S.age;
  const thr = E(17)*CAT_F[S.aca.cat], ratio = perf()/thr;
  if(a===16){
    if(ratio >= 1.06 && chance(70)){ UI.card('gold','職業合約', `17 歲生日當天，${c.n}與你簽訂了第一份職業合約。`); logLine(`17 歲與${c.n}簽訂職業合約`); S.flags.earlyPro = 1; }
    else UI.card('', '學徒第一年結束', `學院經理說：「明年是關鍵的一年。」`);
    next(); return;
  }
  if(a===17){
    if(S.flags.earlyPro || chance(clamp(25+(ratio-1)*240+(S.m.coach-50)*0.4,3,90))){
      if(!S.flags.earlyPro){ UI.card('gold','職業合約', `${c.n}與你簽訂兩年職業合約。你終於成為職業球員。`); logLine(`18 歲與${c.n}簽訂職業合約`); }
      startPro(c.id, { yrs:2 }); next(); return;
    }
    UI.card('bad','未獲職業合約', `兩年學徒期結束，${c.n}不會與你簽訂職業合約。你在學院踢了這麼多年，最後一天的會面又是十分鐘。`);
    logLine(`18 歲未獲${c.n}職業合約`); fx({ conf:-10+(S.pers.grit-3)*3 }); S.flags.released = 1;
    const offers = shuffle(Object.values(S.W.clubs).filter(x => ['L1','L2','NL'].includes(x.lg) && ovr() >= x.str-4)).slice(0,2);
    const opts = offers.map(o => ({ t:`到${o.n}試訓`, s:LG[o.lg].n, f:()=>{ moment({ tag:`${o.n}試訓`, opp:'預備組', lvl:o.str-4, stake:2, youth:true }, () => { if(chance(clamp(30+(ovr()-o.str+2)*8,5,80))){ UI.card('good','試訓成功',`${o.n}與你簽訂一年合約。`); logLine(`18 歲加入${o.n}`); startPro(o.id,{yrs:1}); } else { UI.card('bad','試訓失敗',`${o.n}決定不簽下你。`); nonLeagueStart(()=>{}); } next(); }); } }));
    opts.push({ t:'到非聯賽重新出發', s:'工作之餘踢半職業足球', f:()=>{ nonLeagueStart(next); } });
    opts.push({ t:'放棄足球', warn:true, s:'生涯結束', f:()=>endGame('18 歲未獲職業合約，決定離開足球。') });
    UI.choose('18 歲，下一步？', opts); return;
  }
  next();
}
