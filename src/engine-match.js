/* ================= 行事曆、訓練計劃、比賽、聯賽積分榜 =================
   遊戲以「推進」逐件事前進：每個學期／半季是一張行事曆（S.cal），由開始、比賽、事件、結束組成。
   兩件事之間按訓練計劃自動訓練。 */

const TERM_WEEKS_Y = [14, 12, 12];     /* 秋季、春季、夏季學期 */
const TERM_WEEKS_P = [6, 20, 20];      /* 季前、上半季、下半季 */
const isYouth = () => ['GR','ACA','SCH'].includes(S.stage);
const termWeeks = () => (isYouth() ? TERM_WEEKS_Y : TERM_WEEKS_P)[S.term];

/* 現時日期：例如「2026 年 10 月」 */
function slotDate(wk){
  const w = wk ?? S.wk ?? 0, youth = isYouth();
  const m0 = youth ? [9,1,4][S.term] : [7,8,1][S.term];
  let y = S.year + ((youth ? S.term>0 : S.term===2) ? 1 : 0), m = m0 + Math.floor(w/4.35);
  if(m>12){ m -= 12; y++; }
  return `${y} 年 ${m} 月`;
}

/* ---------- 訓練計劃 ---------- */
const PLAN_OUT = [
  { id:'pos', n:'位置專項', d:'按你位置的關鍵能力平均分配' },
  { id:'sho', n:'射門', w:{ sho:1, tec:.3 } },
  { id:'pas', n:'傳球', w:{ pas:1, iq:.3 } },
  { id:'tec', n:'盤帶技術', w:{ tec:1, pac:.2 } },
  { id:'def', n:'防守', w:{ def:1, iq:.3 } },
  { id:'hea', n:'頭球對抗', w:{ hea:1, str:.3 }, min:9 },
  { id:'pac', n:'速度', w:{ pac:1, sta:.3 } },
  { id:'phy', n:'體能力量', w:{ sta:.7, str:.7 }, min:11 },
  { id:'iq',  n:'戰術閱讀', w:{ iq:1, def:.2, pas:.2 } }
];
const PLAN_GK = [
  { id:'pos', n:'位置專項', d:'按門將的關鍵能力平均分配' },
  { id:'gks', n:'撲救反應', w:{ sho:1, pac:.3 } },
  { id:'gkh', n:'接球', w:{ tec:1, sho:.2 } },
  { id:'gka', n:'制空', w:{ hea:1, str:.3 }, min:9 },
  { id:'gkd', n:'腳下出球', w:{ pas:1, tec:.2 } },
  { id:'gkp', n:'站位指揮', w:{ def:.7, iq:.7 } },
  { id:'gke', n:'爆發力量', w:{ pac:.8, str:.6 }, min:11 }
];
const INTENSITY = {
  light:{ n:'輕鬆', d:'成長較慢，疲勞恢復較多', g:0.7, fat:14, love:1, inj:-1 },
  normal:{ n:'正常', d:'均衡的訓練節奏', g:1, fat:30, love:0, inj:0 },
  hard:{ n:'加練', d:'成長較快；疲勞累積、熱誠下降、受傷風險上升', g:1.3, fat:52, love:-2, inj:2 }
};
/* 課餘時間：數值為每個學期／半季的總效果 */
const OFFTIME = [
  { id:'balance', n:'均衡生活', d:'讀書、家庭、朋友兼顧', fx:{ study:2, fam:3, love:3 } },
  { id:'study',   n:'專心學業', d:'學業↑↑、熱誠↓', fx:{ study:10, love:-3 }, max:17 },
  { id:'family',  n:'陪伴家人', d:'家庭↑↑、疲勞↓', fx:{ fam:9, fat:-6 } },
  { id:'friends', n:'與朋友玩', d:'熱誠↑↑、學業↓', fx:{ love:8, study:-4 } },
  { id:'sport',   n:'其他運動', d:'體能、速度小幅提升；熱誠↑', fx:{ love:4 }, tr:{ sta:1.2, pac:0.8 }, max:13 },
  { id:'extra',   n:'額外練球', d:'訓練成長 +25%；熱誠↓、疲勞↑', fx:{ love:-4 }, gmul:1.25, fatAdd:8 },
  { id:'rest',    n:'休息恢復', d:'疲勞大幅恢復、熱誠↑', fx:{ love:3 }, fatAdd:-10, min:16 }
];
const planList = () => (S.pos==='GK' ? PLAN_GK : PLAN_OUT).filter(p => !p.min || S.age>=p.min);
const offList = () => OFFTIME.filter(o => (!o.min||S.age>=o.min) && (!o.max||S.age<=o.max));
function defaultPlan(){ return { focus:'pos', int:'normal', off:'balance' }; }
function planWeights(id){
  const p = (S.pos==='GK' ? PLAN_GK : PLAN_OUT).find(x => x.id===id);
  if(!p || !p.w){ const w = {}; keyAttrs().slice(0,4).forEach(k => w[k] = 1); return w; }
  return p.w;
}
function fixPlan(){
  if(!S.plan) S.plan = defaultPlan();
  if(!planList().some(p => p.id===S.plan.focus)) S.plan.focus = 'pos';
  if(!offList().some(o => o.id===S.plan.off)) S.plan.off = S.age>=16 ? 'rest' : 'balance';
}
/* 量表的小數累積，避免每星期的小改變被四捨五入吃掉 */
function addMeter(k, v){ S.acc = S.acc || {}; S.acc[k] = (S.acc[k]||0) + v; const n = Math.trunc(S.acc[k]); if(n){ S.acc[k] -= n; S.m[k] = clamp(S.m[k] + n, 0, 100); } }
const TRAIN_BASE = { GR:1.3, ACA:1.4, SCH:1.8, PRO:1.8 };
function planTick(weeks){
  if(!weeks || weeks<=0 || S.done) return;
  fixPlan();
  const f = weeks/termWeeks(), P = S.plan, I = INTENSITY[P.int], O = OFFTIME.find(o => o.id===P.off) || OFFTIME[0];
  const youth = isYouth(), injured = S.inj && S.inj.w>0;
  /* 個人訓練計劃 */
  const base = (S.stage==='PRO' && S.pro && S.pro.semi ? 2.4 : TRAIN_BASE[S.stage]) * 2.4;
  const w = planWeights(P.focus), tot = Object.values(w).reduce((a,b)=>a+b,0);
  const mul = base * I.g * (O.gmul||1) * (hasLife('ptc')?1.15:1) * dif().train * f * (injured ? 0.4 : 1);
  for(const k in w) train(k, mul * w[k]/tot);
  if(O.tr) for(const k in O.tr) train(k, O.tr[k]*f);
  /* 學院／學徒的固定訓練、自然成長 */
  if(S.stage==='ACA' || S.stage==='SCH'){
    const sch = S.stage==='SCH';
    keyAttrs().forEach((k,i) => train(k, ((sch?3.6:2.4) - i*0.25)*f));
    ATTRS.forEach(k => train(k, (sch?1.1:0.6)*f));
    playPos(S.pos, (sch?0.1:0.07)*f);
    if(S.stage==='ACA' && S.flags.far){ addMeter('fat', 4*f); addMeter('study', -2*f); }
  } else if(youth) playPos(S.pos, 0.04*f);
  if(youth) naturalGrowth(f*(S.stage==='ACA'?1.05:S.stage==='SCH'?1.1:1));
  if(S.devc && S.stage==='GR'){ train('tec',1.5*f); train('pas',1*f); }
  /* 量表 */
  for(const k in O.fx) if(k in S.m && !(k==='study' && !youth)) addMeter(k, O.fx[k]*f);
  if(youth) addMeter('study', (50 - S.m.study)*0.08*f);
  addMeter('love', I.love*weeks/4 + (S.m.love>60 ? -4*f : 0));
  const target = clamp(I.fat + (O.fatAdd||0) + (S.stage==='SCH'?6:0) + (S.pro&&S.pro.semi?6:0) - (hasLife('nutri')?5:0), 5, 90);
  /* 職業期：薪金扣除稅項與生活開支、經紀人佣金後存入存款 */
  if(S.stage==='PRO' && S.pro){ const a = agentOf(); S.money = (S.money||0) + Math.round(S.pro.wage*weeks*0.45*(1-(a?a.fee:0))*(S.pro.loan?0.8:1)); }
  if(hasLife('analyst')) train('iq', 1.2*f); if(hasLife('ptc')){ train('sta', 0.8*f); train('str', 0.8*f); }
  if(hasLife('psych')) addMeter('conf', (55 - S.m.conf)*0.15*f);
  S.m.fat = Math.round(S.m.fat + (target - S.m.fat)*(1 - Math.pow(0.82, weeks)));
  /* 傷患復原 */
  if(S.inj && S.inj.w>0){ S.inj.w = Math.max(0, S.inj.w - Math.round(weeks*(hasLife('cryo')?1.4:1))); if(S.inj.w===0){ UI.card('good','傷癒復出', '你終於可以重返球場。'); } }
}

/* ---------- 行事曆 ---------- */
/* 每個學年／賽季開始記錄一次能力評估，供成長曲線使用 */
function recordGrowth(){ S.grow = S.grow || []; if(!S.grow.length || S.grow.at(-1).age !== S.age) S.grow.push({ age:S.age, v:Math.round(ovr()) }); else S.grow.at(-1).v = Math.round(ovr()); }
function newTerm(){
  if(S.m.mates==null) S.m.mates = 50; if(S.m.fans==null) S.m.fans = 20;
  S.gain = {}; S.mStart = { ...S.m }; S.tmp = S.tmp || {}; S.tc = (S.tc||0) + 1;
  /* 隊友關係影響主帥信任；球迷人氣慢慢回落 */
  if(S.pro && !S.pro.semi){ if(S.m.mates>=70) S.pro.trust = clamp(S.pro.trust+1,0,100); if(S.m.mates<=30) S.pro.trust = clamp(S.pro.trust-1,0,100); }
  S.m.fans = Math.round(S.m.fans + ((S.stage==='PRO' ? 30 : 15) - S.m.fans)*0.06);
  setAttrSet(S.pos==='GK'); fixPlan();
  buildCal();
}
function buildCal(){
  const cal = [], W = termWeeks();
  if(isYouth()){
    const nM = S.stage==='SCH' ? 4 : 3, evAt = chance(S.stage==='GR'?30:45) ? ri(0, nM-2) : -1;
    cal.push({ k:'start', wk:0 });
    for(let i=0;i<nM;i++){ cal.push({ k:'match', wk:Math.round(W*(i+0.7)/(nM+0.4)), fx:youthFixture() }); if(i===evAt) cal.push({ k:'event' }); }
    cal.push({ k:'end', wk:W });
  } else if(S.term===0){
    cal.push({ k:'pre', wk:0 }, { k:'match', wk:4, friendly:true }, { k:'end', wk:W });
  } else {
    const n = 5, evAt = chance(S.term===1?70:60) ? ri(1, n-2) : -1;
    cal.push({ k:'start', wk:0 });
    for(let i=0;i<n;i++){ cal.push({ k:'match', wk:Math.round(W*(i+0.6)/(n+0.2)), p:(S.term-1)*0.5 + 0.5*(i+0.5)/n }); if(i===evAt) cal.push({ k:'event' }); }
    /* 盃賽按週數插入 */
    cupSlots(S.term).forEach(cs => { const j = cal.findIndex(s => s.wk!=null && s.wk > cs.wk); cal.splice(j<0 ? cal.length : j, 0, cs); });
    cal.push({ k:'end', wk:W });
  }
  /* 事件沒有固定日期：沿用前一件事的日期 */
  cal.forEach((s,i) => { if(s.wk==null) s.wk = i ? cal[i-1].wk : 0; });
  S.cal = cal; S.ci = 0; S.wk = 0;
}
const SLOTS = {
  start: (sl, next) => isYouth() ? youthStart(sl, next) : proStart(sl, next),
  pre:   (sl, next) => preseason(next),
  match: (sl, next) => isYouth() ? youthMatch(sl, next) : proFixtureRun(sl, next),
  event: (sl, next) => runEvent(next),
  cup:   (sl, next) => cupRun(sl, next),
  end:   (sl, next) => isYouth() ? youthEnd(sl, next) : proEnd(sl, next)
};
const nextSlot = () => S && S.cal ? S.cal[S.ci] : null;
/* 推進至下一件事 */
function advance(){
  if(!S || S.done || S.busy) return false;
  if(!S.cal || !S.cal[S.ci]) newTerm();
  S.busy = true;
  UI.newPage(`${slotDate(S.cal[S.ci].wk)}・${pageTitle()}`);
  runSlot(() => { S.busy = false; const pk = checkPerks(); pk.forEach(p => UI.card('gold', `解鎖特技：${p.n}`, `${p.d}。<br><span class="hint">條件：${p.need}</span>`)); const got = checkAch(); if(got.length) UI.card('gold', '成就解鎖', got.map(n => `★ ${n}`).join('<br>')); recordGrowth(); UI.idle(); });
  return true;
}
/* 執行一件事；學期／半季結束後，緊接執行下一個學期的開始，減少按鍵次數 */
function runSlot(done){
  const sl = S.cal[S.ci];
  planTick(Math.max(0, sl.wk - S.wk)); S.wk = Math.max(S.wk, sl.wk);
  SLOTS[sl.k](sl, () => {
    if(S.done) return;
    if(sl.k==='end'){
      if(S.term < 2) S.term++; else { S.term = 0; S.age++; S.year++; }
      newTerm();
      UI.newPage(`${slotDate(0)}・${pageTitle()}`);
      runSlot(done); return;
    }
    S.ci++;
    done();
  });
}

/* ---------- 比賽 ---------- */
/* 卜瓦松分佈（反函數法，每次只用一個亂數） */
function poisson(l){ let p = Math.exp(-l), s = p, k = 0; const u = R(); while(u > s && k < 11){ k++; p *= l/k; s += p; } return k; }
/* 青訓比賽的對手（建立行事曆時決定，方便主頁預告） */
function youthFixture(){
  const a = S.age;
  if(S.stage==='GR') return { tag: a<=10 ? `${ageGroup(a)} ${pick(['星期日聯賽','足球節盃賽','友誼賽'])}` : `${ageGroup(a)} 星期日聯賽`, home:S.gr, opp:pick(CITIES[S.city].gr.filter(x=>x!==S.gr)), lvl:E(a)*0.78, diff:r1(rf(-5,5)), n:2 };
  if(S.stage==='ACA'){ const o = pick(nearAcademies(true).filter(c=>c.id!==S.aca.club)) || pick(clubsIn('CH'));
    return { tag:`${ageGroup(a)} 學院賽`, home:`${cName(S.aca.club)} ${ageGroup(a)}`, opp:`${o.n} ${ageGroup(a)}`, oppId:o.id, lvl:E(a)*CAT_F[S.aca.cat]*rf(0.95,1.05), diff:r1((S.W.clubs[S.aca.club].str - o.str)*0.3 + rf(-3,3)), n:2 }; }
  const cup = S.term===1 && chance(40), o = pick(Object.values(S.W.clubs).filter(c=>c.cat>0&&c.cat<=2&&c.id!==S.aca.club&&isEngClub(c)));
  return { tag: cup?'FA Youth Cup':'U18 英超聯', home:`${cName(S.aca.club)} U18`, opp:`${o.n} U18`, oppId:o.id, lvl:E(a)*0.97, diff:r1((S.W.clubs[S.aca.club].str - o.str)*0.3 + rf(-3,3)), stake:cup?2:1, n:3 };
}
function youthMatch(sl, next){
  const f = sl.fx;
  playMatch({ tag:f.tag, home:f.home, opp:f.opp, lvl:f.lvl, diff:f.diff, stake:f.stake||1, youth:true, n:f.n }, next);
}
/* 職業比賽的對手：如外借後聯賽改變，重新抽選 */
function fixtureOpp(sl){
  const c = club(curClub());
  if(sl.friendly){ if(!sl.opp || !S.W.clubs[sl.opp]) sl.opp = pick(Object.values(S.W.clubs).filter(x => x.id!==c.id && Math.abs(LG[x.lg].lvl-LG[c.lg].lvl)<=1)).id; return { o:club(sl.opp) }; }
  if(!sl.opp || club(sl.opp).lg!==c.lg || sl.opp===c.id){
    const d = DERBIES.find(x => (x[0]===c.id||x[1]===c.id) && club(x[0]===c.id?x[1]:x[0]).lg===c.lg);
    if(d && chance(18)){ sl.opp = d[0]===c.id?d[1]:d[0]; sl.derby = d[2]; }
    else { sl.opp = pick(clubsIn(c.lg).filter(x=>x.id!==c.id)).id; sl.derby = null; }
  }
  return { o:club(sl.opp), derby:sl.derby };
}
function proFixtureRun(sl, next){
  const se = S.season, c = club(curClub()), lg = LG[c.lg];
  if(!sl.friendly) leagueAdvance(sl.p);
  const { o, derby } = fixtureOpp(sl);
  const lvlFirst = (o.str + lg.par)/2;
  const leagueGame = !sl.friendly;
  const done = r => { if(leagueGame && r && r.league) leagueForced(c.lg, c.id, o.id, r.gf, r.ga); else if(leagueGame) leagueRoundFor(c.lg); next(); };
  const rested = () => { UI.card('bad','傷停', `你仍在養傷（尚餘 ${S.inj.w} 星期），只能看着隊友對${o.n}。`); done(null); };
  if(S.inj && S.inj.w>0){ if(S.inj.w<=3 && !sl.friendly && !se.dev && se.r<=1 && (derby || isRivalClub(o.id) || chance(25))){ playHurt(derby || `對${o.n}的宿敵對決`, () => proPlay(sl, se, c, lg, o, derby, lvlFirst, done), rested); return; } rested(); return; }
  proPlay(sl, se, c, lg, o, derby, lvlFirst, done);
}
function proPlay(sl, se, c, lg, o, derby, lvlFirst, done){
  if(sl.friendly){ playMatch({ tag:'季前熱身賽', home:c.n, opp:o.n, lvl:lvlFirst, diff:c.str-o.str, stake:1, youth:false, n:2, friendly:true }, done); return; }
  if(se.dev){
    if(!S.pro.debut && chance(16*dif().debut) && ovr() >= c.str-9){
      const gkx = S.pos==='GK';
      UI.card('gold','一隊傷兵', gkx ? `正選門將與後備門將同時受傷，主帥在賽前告訴你：「今晚由你正選。」` : `一隊有數人受傷，主帥說今晚你會坐在後備席。第 70 分鐘，他叫你熱身。`);
      playMatch({ tag:gkx ? `${lg.short}・緊急正選` : `${lg.short}・後備入替`, home:c.n, opp:o.n, lvl:lvlFirst, diff:c.str-o.str, stake:2, youth:false, n:gkx?3:1, sub:!gkx, league:true,
        after:() => { se.fd++; S.pro.debut = true; logLine(`${S.age} 歲${c.n}一隊首秀（對${o.n}）`); } }, done); return; }
    const opp = pick(Object.values(S.W.clubs).filter(x=>x.cat>0&&x.id!==c.id&&x.lg===c.lg || x.cat>0&&x.id!==c.id&&isEngClub(c)&&isEngClub(x)));
    playMatch({ tag:c.lg==='PL'?'PL2':'U21 預備組', home:`${c.n} U21`, opp:`${opp.n} U21`, lvl:E(S.age)*0.97, diff:rf(-4,4), stake:1, youth:false, n:2, reserve:true }, done); return;
  }
  if(se.r===3){ playMatch({ tag:'預備組友誼賽', home:`${c.n} 預備組`, opp:`${o.n} 預備組`, lvl:lg.par-3, diff:rf(-3,3), stake:1, youth:false, n:1, reserve:true }, done); return; }
  const n = se.r===0 ? 3 : se.r===1 ? 2 : 1;
  const tag = derby ? `${lg.short}・${derby}` : se.r===2 && S.pos==='GK' ? `${isAbroadLg(c.lg)?'盃賽':'聯賽盃'}・後備門將上陣` : `${lg.short}・第 ${S.lt ? S.lt.T[c.lg][c.id].p+1 : '—'} 輪`;
  if(!S.pro.debut){ S.pro.debut = true; logLine(`${S.age} 歲${c.n}一隊首秀`); }
  const rv = isRivalClub(o.id);
  playMatch({ tag: rv ? `${lg.short}・宿敵對決` : tag, hc:c.id, oc:o.id, home:c.n, opp:o.n, lvl:lvlFirst, diff:c.str-o.str + clubBonus(), stake:derby||rv?2:1, youth:false, n, sub:se.r===2, league:!(se.r===2 && S.pos==='GK') }, r => { if(rv && r) rivalAfter(r); pressConf(r, { rv, derby }, () => done(r)); });
}

/* 一場比賽：先選親自上陣或模擬，然後 n 個關鍵時刻，最後戰報
   m：{ tag, home, opp, lvl, diff, stake, youth, n, sub, league, reserve, friendly, after } */
function playMatch(m, next){
  const gk = S.pos==='GK', lamF = clamp(1.35 + m.diff*0.06, 0.35, 3.2), lamA = clamp(1.3 - m.diff*0.06, 0.3, 3.2);
  const st = { a:0, b:0, myG:0, myA:0, ok:0, ng:0, log:[], fat0:S.m.fat, m0:{ ...S.m }, tr0:S.pro ? S.pro.trust : 0,
    otherF:Array.from({ length:poisson(lamF*0.72) }, () => ri(1,90)), otherA:Array.from({ length:poisson(lamA*0.8) }, () => ri(1,90)), extraA:[] };
  const mins = m.sub ? [ri(66,88)] : Array.from({ length:m.n }, () => ri(6,88)).sort((x,y)=>x-y);
  for(let i=1;i<mins.length;i++) if(mins[i] <= mins[i-1]) mins[i] = Math.min(89, mins[i-1]+3);
  st.mins = m.sub ? 90 - mins[0] + 2 : 90;
  const ctx = { tag:m.tag, opp:m.opp, lvl:m.lvl, stake:m.stake||1, youth:m.youth, ms:0.22, ts:0.08, home:m.home, sub:!!m.sub, oc:m.oc };
  UI.card('prematch', m.tag, prematchHTML(m), null, { m });
  const run = manual => {
    let i = 0;
    const step = () => {
      if(i >= mins.length) return finish();
      const min = mins[i++];
      st.a = st.otherF.filter(x=>x<min).length + st.myG + st.myA;
      st.b = st.otherA.filter(x=>x<min).length + st.extraA.filter(x=>x<min).length;
      const after = r => { record(r, min); step(); };
      if(manual) momentStep(ctx, { min, a:st.a, b:st.b }, after);
      else after(autoMoment(ctx, { min, a:st.a, b:st.b }));
    };
    const record = (r, min) => {
      const all = [r, ...(r.chain ? [r.chain] : [])];
      /* 冒險成功對評分幫助較大；穩健失敗扣分較多 */
      all.forEach(x => { if(x.ok){ st.ok += ({ safe:0.5, norm:1, bold:1.5, sig:1.6 })[x.m] || 1; if(x.k==='G') st.myG++; if(x.k==='A') st.myA++; } else { st.ng += ({ safe:1.3, norm:1, bold:0.7, sig:0.7 })[x.m] || 1; if((x.k==='S' && chance(gk?70:100)) || (x.k==='D' && chance(55))) st.extraA.push(min); } });
      all.forEach(x => perkTrack(x, x.sc, st.a < st.b));
      st.log.push({ min, sc:r.sc, o:r.o + (r.chain ? `→${r.chain.o}` : ''), ok:r.chain ? r.chain.ok : r.ok, k:r.chain ? r.chain.k : r.k, g:r.grp });
    };
    const finish = () => {
      const gf = st.otherF.length + st.myG + st.myA, ga = st.otherA.length + st.extraA.length;
      /* 評分按位置公平計算：防守球員的成功防守與零封加分較多 */
      const g = POS[S.pos].g, dw = g==='DEF' ? 1.75 : g==='GK' ? 1.65 : g==='MID' ? 1.2 : 1;
      let rt = 6.3 + clamp(ovr()-m.lvl,-12,12)*0.035 + st.myG*0.75 + st.myA*0.45 + st.ok*0.18*dw - st.ng*0.22 + (gf>ga?0.2:gf<ga?-0.15:0) + (gk ? 0.2 + (ga===0?0.5:-ga*0.08) : g==='DEF' ? (ga===0?0.4:-ga*0.05) : 0) + N0(0.18);
      if(m.sub) rt = 6.4 + (rt-6.4)*0.6;
      rt = r1(clamp(rt, 4.8, 9.8));
      const cs = gk && ga===0 && st.mins>=60;
      const motmN = motmPick(gf>=ga ? m.hc : m.oc, gf>=ga), motm = rt >= 7.6 && (gf>=ga || rt>=8.4) ? '你' : `${motmN}（${gf>=ga?m.home:m.opp}）`;
      /* 賽後效果 */
      const out = [];
      if(m.youth){ out.push(meter('coach', (rt-6.6)*2.2), meter('conf', (rt-6.6)*1.6)); if(S.stage==='GR') out.push(meter('scout', Math.max(0, rt-6.9)*1.6)); }
      else if(m.intl){ out.push(meter('conf', (rt-6.7)*2)); }
      else if(!m.reserve){ const tr = S.pro.trust; S.pro.trust = clamp(tr + (rt-6.7)*(m.friendly?1.2:2), 0, 100); const d = Math.round(S.pro.trust - tr); if(d) out.push(`主帥信任 ${d>0?'+':''}${d}`); out.push(meter('conf', (rt-6.7)*1.5)); if(S.season && !m.friendly) S.season.mo += (rt-6.8)*0.012; }
      out.push(meter('fat', st.mins/90*9));
      if(!m.friendly){ if(rt>=7.4) out.push(meter('mates', 1)); if(!m.youth && !m.reserve) out.push(meter('fans', (rt>=7.8?3:rt>=7.2?1.5:rt<6.2?-2:0)*(m.intl?2:1))); if(motm==='你') out.push(meter('fans', m.youth?1:2)); }
      if(S.stage==='PRO' && motm==='你' && ((m.stake||1)>=2 || m.intl)) pst().bigM++;
      if(S.stage==='PRO' && m.sub && st.myG+st.myA>0) pst().subGA++;
      if(m.after) m.after(rt);
      const res = { d:slotDate(), tag:m.tag, home:m.home, opp:m.opp, gf, ga, rt, g:st.myG, a:st.myA, cs, mins:st.mins, motm, motmN, motmH:gf>=ga, league:!!m.league };
      recordResult(res, m);
      UI.card('mreport', '賽後戰報', reportHTML(res, st, m, out.filter(Boolean)), gf>ga && st.myG ? 'goal' : null);
      hurtAfter();
      matchInjury(m, () => next(res));
    };
    step();
  };
  if(UI.autoSim && UI.autoSim()) { run(false); return; }
  if(SET.match==='play'){ run(true); return; } if(SET.match==='sim'){ run(false); return; }
  UI.choose('', [
    { t:'親自上陣', main:true, s:`${mins.length} 個關鍵時刻｜由你作出每一個選擇`, f:() => run(true) },
    { t:'模擬比賽', s:'自動選擇成功率最高的方案，直接看戰報', f:() => run(false) } ]);
}
function recordResult(r, m){
  if(r.g>=3) S.flags.hat = 1; if(r.rt>=9) S.flags.r9 = 1; if(r.motm==='你') S.flags.motm = (S.flags.motm||0) + 1;
  S.recent = S.recent || []; S.recent.unshift({ rt:r.rt, gf:r.gf, ga:r.ga, opp:r.opp, g:r.g, a:r.a, tag:r.tag });
  S.recent = S.recent.slice(0, 8);
  if(m.friendly || m.intl || m.cup) return;
  S.ss = S.ss || { app:0, g:0, a:0, cs:0, rt:0 };
  S.ss.app++; S.ss.g += r.g; S.ss.a += r.a; S.ss.cs += r.cs?1:0; S.ss.rt += r.rt;
}
function matchInjury(m, cont){
  cont = cont || (() => {});
  const pro = !m.youth, inten = INTENSITY[(S.plan||{}).int||'normal'].inj;
  const p = pro ? clamp(2.6 + (S.m.fat-45)*0.12 + Math.max(0,S.age-28)*0.35 + (S.tmpInj||0) + inten + (S.body==='lean'?0.5:0) - (hasLife('nutri')?0.8:0), 0.8, 16)
                : clamp(1.2 + (S.m.fat-40)*0.08 + (S.age>=13?0.6:0) + (S.tmpInj||0)*0.4 + inten*0.6 - (S.flags.multi?0.6:0) - (S.items&&S.items.food?0.4:0), 0.4, 10);
  S.tmpInj = 0;
  if(!chance((p + (S.flags.weak>=S.year ? 2.5 : 0))*(hasPerk('iron')?0.65:1)*dif().inj)){ cont(); return; }
  if(chance(pro?7:6)){ const w = ri(16,32), n = pick(['膝部十字韌帶','腳踝韌帶','跟腱']); S.inj = { w, n:`${n}受傷` }; if(pro && S.season) S.season.inj += w;
    const t = fx(pro ? {conf:-6,love:-5,trust:-3} : {conf:-8,love:-6,coach:-3}); UI.card('bad','重傷', `比賽中一次落地，你感到一陣劇痛。醫生診斷為${n}受傷，需要休息 ${w} 星期。<div class="fx">${t}</div>`); logLine(`${S.age} 歲重傷（${n}），休息 ${w} 星期`);
    if(pro && S.age>=27 && chance(45)){ S.ab.pac = Math.max(1,S.ab.pac-ri(1,3)); UI.card('bad','後遺症','傷癒之後，你的爆發力已大不如前。'); }
    if(pro && S.stage==='PRO'){ injuryChoice('severe', w, n, cont); return; } }
  else { const w = ri(1,5); S.inj = { w, n:'肌肉拉傷' }; if(pro && S.season) S.season.inj += w; UI.card('bad','輕傷', `賽後發現肌肉拉傷，需要休息 ${w} 星期。`);
    if(pro && S.stage==='PRO' && w>=3){ injuryChoice('mid', w, '肌肉拉傷', cont); return; } }
  cont();
}
const COACH_SAY = [[8.0,'「這是你的比賽。保持這種水平，你會走得很遠。」'],[7.2,'「表現很好，關鍵時刻做出了正確的選擇。」'],[6.6,'「中規中矩，下一場我想看到更多。」'],[0,'「今天不是你的日子。回去看片段，找出問題。」']];
const MEDIA = ['《英倫體育報》','《三獅週刊》','《看台日報》','《星期日球場》','《每日足球》'];
function prematchHTML(m){
  const role = m.youth ? '' : m.reserve ? '預備組' : m.sub ? '後備' : '正選';
  return `<div class="pm"><div class="pm-team"><b>${esc(m.home)}</b><small>主隊</small></div><div class="pm-vs">VS<small>${m.diff>2?'我方較強':m.diff<-2?'對手較強':'實力相若'}</small></div><div class="pm-team r"><b>${esc(m.opp)}</b><small>客隊</small></div></div>
  <div class="pm-chips"><span>對手水平 ${Math.round(m.lvl)}</span><span>你的能力 ${Math.round(ovr())}</span>${role?`<span>你的角色：${role}</span>`:''}<span>體能 ${100-S.m.fat}</span><span>自信 ${S.m.conf}</span></div>`;
}
function reportHTML(r, st, m, out){
  const gk = S.pos==='GK', res = r.gf>r.ga?'勝':r.gf<r.ga?'負':'和';
  const say = COACH_SAY.find(([v]) => r.rt>=v)[1];
  const log = st.log.map(x => `<li><i>${x.min}'</i><b>${esc(x.sc)}</b><span>${esc(x.o)}</span><em class="${x.ok?'ok':'ng'}">${x.ok?'成功':'失敗'}</em>${x.g?`<button class="rp" data-rp="${x.g}|${x.k}|${x.ok?1:0}" aria-label="回放">▶ 回放</button>`:''}</li>`).join('');
  const media = m.youth ? (S.stage==='GR' ? `家長群組：「${r.rt>=7.5?`今日 ${esc(S.first)} 踢得真好！`:r.rt>=6.6?'孩子們都盡力了。':'下星期再努力。'}」` : '')
    : m.reserve || m.friendly ? '' : `${pick(MEDIA)}：「${r.rt>=7.8?`${esc(fullName())}是全場焦點。`:r.rt>=6.8?`${esc(fullName())}表現穩定。`:`${esc(fullName())}需要證明自己。`}」`;
  const tabs = `<div class="mr-tabs" role="tablist"><button data-mtab="0" aria-selected="true">戰報</button><button data-mtab="1" aria-selected="false">技術統計</button><button data-mtab="2" aria-selected="false">雙方陣容</button></div>`;
  const cr = (id, sz) => id && typeof crestSVG==='function' ? crestSVG(id, sz) : '';
  return `<div class="mr-head"><span class="mr-res ${res==='勝'?'w':res==='負'?'l':'d'}">${res}</span><div class="mr-score"><b>${cr(m.hc, 22)}${esc(r.home)}</b><strong>${r.gf} – ${r.ga}</strong><b>${esc(r.opp)}${cr(m.oc, 22)}</b></div></div>
  <div class="mr-grid"><div class="mr-rt ${r.rt>=7.5?'hi':r.rt<6.2?'lo':''}"><strong>${r.rt.toFixed(1)}</strong><small>評分</small></div>
    <div class="mr-st"><span><b>${gk?(r.cs?'是':'否'):r.g}</b>${gk?'零封':'入球'}</span><span><b>${r.a}</b>助攻</span><span><b>${r.mins}'</b>上陣</span></div>
    <div class="mr-motm"><small>全場最佳</small><b>${r.motm==='你'?'★ 你':esc(r.motm)}</b></div></div>
  ${tabs}<div class="mr-pane" data-mpane="0">
  ${log?`<h5>關鍵時刻回顧</h5><ul class="mr-log">${log}</ul>`:''}
  <h5>教練點評</h5><p>${say}</p>${media?`<p class="mr-media">${media}</p>`:''}${out.length?`<div class="fx">${out.join('、')}</div>`:''}</div>
  <div class="mr-pane" data-mpane="1" hidden>${statsHTML(r, st, m)}</div><div class="mr-pane" data-mpane="2" hidden>${lineupHTML(r, st, m)}</div>`;
}

/* ---------- 關鍵時刻 ---------- */
const WHEN_N = { trail:'球隊落後', lead:'球隊領先', level:'雙方打和', late:'比賽尾段', trailLate:'落後・最後階段', leadLate:'領先・最後階段' };
/* 比分情境：落後、領先、打和、第 80 分鐘後 */
function whenOk(w, st){
  if(!w) return true; if(!st) return false;
  const d = (st.a||0) - (st.b||0), late = (st.min||0) >= 80;
  return { trail:d<0, lead:d>0, level:d===0, late, trailLate:d<0&&late, leadLate:d>0&&late }[w] || false;
}
function sceneFor(st){
  const g = POS[S.pos].g, groups = { DEF:['DEF','DEF','MID'], MID:['MID','MID','ATT','DEF'], ATT:['ATT','ATT','MID'], GK:['GK'] }[g];
  S.recentSc = S.recentSc || [];
  const pool = [...new Set(groups)].flatMap(k => SCENES[k].map(sc => ({ sc, w:groups.filter(x=>x===k).length })));
  /* 符合比分情境的場面優先出現 */
  const ctxPool = pool.filter(x => x.sc.when && whenOk(x.sc.when, st) && !S.recentSc.includes(x.sc.t));
  let pickd = ctxPool.length && chance(55) ? pick(ctxPool).sc : null;
  /* 同一場面短期內不重複 */
  for(let t=0; !pickd && t<10; t++){ const x = wpick(pool.filter(p => !p.sc.when), p => p.w); if(!S.recentSc.includes(x.sc.t) || t===9) pickd = x.sc; }
  S.recentSc = [pickd.t, ...S.recentSc].slice(0,10);
  return pickd;
}
const groupOf = sc => Object.keys(SCENES).find(g => SCENES[g].includes(sc)) || (POS[S.pos].g==='GK' ? 'GK' : 'ATT');
/* 成功率：模式基數＋能力對比對手水平＋自信、性格、疲勞、裝備；強項（能力高於對手 4／8 分）再加 5／10% */
function oddsOf(o, lvl, cx){
  const a = o.ab.reduce((s,k)=>s+eff(k),0)/o.ab.length, main = eff(o.ab[0]) - lvl;
  let p = MODE_BASE[o.m] + clamp((a - lvl)*(o.m==='sig'?2.6:2.2), -28, o.m==='sig'?30:24) + (S.m.conf-50)/6 + (S.pers.comp-3)*2;
  /* 隊友關係好，傳送配合較易成功 */
  if(o.k==='A') p += clamp(((S.m.mates??50)-50)/8, -4, 4);
  const strong = main>=8 ? 10 : main>=4 ? 5 : 0;
  p += strong;
  if(S.m.fat>70) p -= 6;
  if(S.spurt && S.spurt.on) p -= 4;
  if(S.items && S.items.boots && S.age<19) p += 2;
  const pk = cx ? perkBonus(o, cx) : { v:0, n:[] }; p += pk.v + dif().odds;
  return { p:clamp(Math.round(p), 5, 95), strong, pk };
}
function sigState(sc, lvl){
  const sg = SCENE_SIG[sc.t]; if(!sg) return null;
  const v = Math.min(...sg.ab.map(k => eff(k))), gap = v - lvl;
  if(gap >= SIG_GAP) return { o:{ ...sg, m:'sig' }, open:true };
  if(gap >= SIG_NEAR) return { o:{ ...sg, m:'sig' }, open:false, short:Math.ceil(SIG_GAP-gap) };
  return null;
}
const RISK_N = { safe:'穩健', norm:'標準', bold:'冒險', sig:'招牌' };
/* 單一關鍵時刻（試訓等使用）：ctx：{tag, opp, lvl, stake, youth} */
function moment(ctx, next){ momentStep({ ...ctx, ms:1, noChain:true }, { min:ri(8,88), a:ri(0,2), b:ri(0,2) }, () => next()); }
function momentStep(ctx, st, done, scIn){
  const sc = scIn || sceneFor(st), grp = scIn ? (scIn.grp || groupOf(sc)) : groupOf(sc);
  const avg = Math.round(sc.o[0].ab.reduce((s,k)=>s+eff(k),0)/sc.o[0].ab.length);
  const mc = UI.card('moment', `${ctx.tag}・對${esc(ctx.opp)}`, `<div class="score"><span>第 ${st.min} 分鐘</span><b>${st.a} – ${st.b}</b></div><p class="sc-t">${sc.t}</p><p>${sc.d}</p>
    <div class="vsbar"><div><small>你（相關能力）</small><b>${avg}</b></div><i>VS</i><div class="r"><small>對手水平</small><b>${Math.round(ctx.lvl)}</b></div></div>
    <div class="pm-chips">${sc.when?`<span class="ctx">${WHEN_N[sc.when]}</span>`:''}<span>體能 ${100-S.m.fat}</span><span>自信 ${S.m.conf}</span>${S.spurt&&S.spurt.on?'<span>發育期 −4%</span>':''}</div>`, null, { scene:grp, min:st.min, oc:ctx.oc });
  const sg = scIn ? null : sigState(sc, ctx.lvl), list = sc.o.slice();
  if(sg && sg.open) list.unshift(sg.o);
  const cx = { stake:ctx.stake, sub:ctx.sub, trail:st.a<st.b, sc:sc.t };
  const optsOut = list.map(o => { const { p, strong, pk } = oddsOf(o, ctx.lvl, cx);
    return { t:(o.m==='sig'?'★ ':'') + o.t, pct:SET.odds===false ? null : p, risk:RISK_N[o.m], main:o.m==='sig', s:`${SET.odds===false ? (p>=70?'把握較大':p>=50?'機會一半':'把握較小') : `成功率 ${p}%`}｜${o.ab.map(k=>`${ATTR_N[k]} ${Math.round(eff(k))}`).join('、')}${strong?`｜強項 +${strong}%`:''}${pk.v?`｜特技「${pk.n.join('、')}」+${pk.v}%`:''}${o.then?'｜成功後可再作一個選擇':''}${o.m==='sig'?'｜招牌：成功效果最大':''}`, f:() => resolveMoment(o, p, ctx, mc, grp, sc, st, done) }; });
  if(sg && !sg.open) optsOut.push({ t:sg.o.t, s:`招牌選項：${sg.o.ab.map(k=>ATTR_N[k]).join('、')}再提升約 ${sg.short} 分即可解鎖`, locked:true });
  UI.choose('你的選擇？', optsOut);
}
/* 套用一次關鍵時刻的效果，回傳效果文字 */
function momentEffects(o, ok, ctx){
  const ms = ctx.ms ?? 1, mag = { safe:1, norm:2, bold:3, sig:3 }[o.m]*(ctx.stake||1), out = [];
  o.ab.forEach(k => train(k, (ok?0.9*mag:0.4)*(ctx.ts ?? ms)));
  if(ctx.youth){
    if(ok){ out.push(meter('conf', (1+mag*1.6+(o.m==='sig'?2:0))*ms), meter('coach', (mag*1.4+(o.m==='sig'?2:0))*ms)); if(S.stage==='GR') out.push(meter('scout', (1+mag*1.7+(o.m==='sig'?3:0))*ms)); }
    else out.push(meter('conf', (-mag*(o.m==='sig'?1:1.6)+(S.pers.grit-3))*ms), meter('coach', (o.m==='bold'?-2:-0.6)*ms));
  } else if(S.season){
    const se = S.season;
    if(ok){ se.mo += (o.m==='sig' ? 0.1 : [0,0.03,0.05,0.08][Math.min(3,mag)])*ms; if(o.k==='G') se.mg++; if(o.k==='A') se.ma++; if(o.k==='S') se.ms = (se.ms||0) + 1; out.push(meter('conf', mag*1.5*ms)); const tr=S.pro.trust; S.pro.trust=clamp(tr+(mag*1.4+(o.m==='sig'?2:0))*ms,0,100); if(Math.round(S.pro.trust-tr)>0) out.push(`主帥信任 +${Math.round(S.pro.trust-tr)}`); }
    else { se.mo -= (o.m==='bold'?0.05:0.03)*ms; out.push(meter('conf', -mag*ms)); S.pro.trust = clamp(S.pro.trust-(o.m==='bold'?2:1)*ms*dif().trust,0,100); }
  }
  if(o.k==='G' && ok) S.flags.goals = (S.flags.goals||0)+1;
  if(o.m==='sig' && ok) S.flags.sigs = (S.flags.sigs||0)+1;
  return out.filter(Boolean);
}
function resolveMoment(o, p, ctx, mc, grp, sc, st, done){
  const ok = chance(p), t = momentEffects(o, ok, ctx).join('、');
  UI.play && UI.play(mc, { scene:grp, k:o.k, ok });
  const title = ok ? (o.k==='G'?'入球！':o.k==='A'?'助攻！':o.k==='S'?'撲救成功！':o.then?'機會來了':'表現出色') : (o.k==='S'?'失球':'功虧一簣');
  UI.card(ok?'good':'bad', title, `${ok?o.ok:o.ng}${t?`<div class="fx">${t}</div>`:''}`, ok&&o.k==='G'?'goal':null);
  const res = { sc:sc.t, o:o.t, ok, k:o.k, m:o.m, grp };
  if(ok && o.then && FOLLOW[o.then] && !ctx.noChain){
    const fsc = { ...FOLLOW[o.then], grp };
    momentStep(ctx, { ...st, min:Math.min(90, st.min+1) }, r2 => done({ ...res, chain:r2 }), fsc); return;
  }
  done(res);
}
/* 模擬：自動選擇成功率最高的方案（不顯示畫面） */
function autoMoment(ctx, st, scIn){
  const sc = scIn || sceneFor(st), grp = scIn ? (scIn.grp || groupOf(sc)) : groupOf(sc), sg = scIn ? null : sigState(sc, ctx.lvl), list = sc.o.slice();
  if(sg && sg.open) list.unshift(sg.o);
  const cx = { stake:ctx.stake, sub:ctx.sub, trail:st.a<st.b, sc:sc.t };
  const scored = list.map(o => ({ o, p:oddsOf(o, ctx.lvl, cx).p })).sort((a,b) => b.p - a.p);
  const { o, p } = scored[0], ok = chance(p);
  momentEffects(o, ok, ctx);
  const res = { sc:sc.t, o:o.t, ok, k:o.k, m:o.m, grp };
  if(ok && o.then && FOLLOW[o.then] && !ctx.noChain) res.chain = autoMoment(ctx, st, { ...FOLLOW[o.then], grp });
  return res;
}

/* ---------- 聯賽積分榜（逐輪模擬） ---------- */
function seasonTableInit(){
  const T = {};
  LG_TABLES.forEach(lg => { T[lg] = {}; clubsIn(lg).forEach(c => T[lg][c.id] = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0, s:r1(c.str + N0(2.5)) }); });
  S.lt = { T, done:Object.fromEntries(LG_TABLES.map(l => [l, 0])) };
}
function clubBonus(){
  const se = S.season; if(!se || se.dev || se.r>=2 || !S.recent || !S.recent.length) return 0;
  const avg = S.recent.slice(0,5).reduce((s,x)=>s+x.rt,0)/Math.min(5,S.recent.length);
  return clamp((avg-6.8)*[2.5,1.5][se.r], -3, 3);
}
function playPair(T, a, b, gfa, gfb){
  if(gfa==null){ const d = (T[a].s + (a===curClub()?clubBonus():0)) - (T[b].s + (b===curClub()?clubBonus():0)); gfa = poisson(clamp(1.35 + d*0.055, 0.25, 3.4)); gfb = poisson(clamp(1.25 - d*0.055, 0.25, 3.4)); }
  const A = T[a], B = T[b]; A.p++; B.p++; A.gf += gfa; A.ga += gfb; B.gf += gfb; B.ga += gfa;
  if(gfa>gfb){ A.w++; B.l++; A.pts += 3; } else if(gfa<gfb){ B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
}
function simRound(lg, forced){
  const T = S.lt.T[lg]; let ids = Object.keys(T);
  if(forced){ playPair(T, forced[0], forced[1], forced[2], forced[3]); ids = ids.filter(x => x!==forced[0] && x!==forced[1]); }
  shuffle(ids); for(let i=0;i+1<ids.length;i+=2) playPair(T, ids[i], ids[i+1]);
  S.lt.done[lg]++;
}
/* 季中只逐輪模擬你所在的聯賽（積分榜會顯示）；其他聯賽在季尾一次過結算，節省運算 */
function leagueAdvance(p){
  if(!S.lt) seasonTableInit();
  const lg = S.pro ? curLg() : null; if(!lg || !S.lt.T[lg]) return;
  const target = Math.min(LG[lg].g, Math.floor(p*LG[lg].g)); while(S.lt.done[lg] < target) simRound(lg);
}
function leagueFinish(){
  if(!S.lt) seasonTableInit();
  LG_TABLES.forEach(lg => { if(!S.lt.T[lg]) return;
    if(S.lt.done[lg] > 0 || (S.pro && curLg()===lg)){ while(S.lt.done[lg] < LG[lg].g) simRound(lg); }
    else fastSeason(lg); });
}
/* 快速結算整季：按球會實力與聯賽平均的差距，推算勝和負及入球 */
function fastSeason(lg){
  const T = S.lt.T[lg], ids = Object.keys(T), g = LG[lg].g; if(!ids.length) return;
  const mean = ids.reduce((a,id) => a + T[id].s, 0) / ids.length;
  ids.forEach(id => { const r = T[id], d = r.s - mean;
    const pw = clamp(0.37 + d*0.028, 0.04, 0.88), pd = clamp(0.27 - Math.abs(d)*0.004, 0.12, 0.3);
    let w = Math.round(g*pw + N0(Math.sqrt(g*pw*(1-pw)))), dr = Math.round(g*pd + N0(Math.sqrt(g*pd*(1-pd))));
    w = clamp(w, 0, g); dr = clamp(dr, 0, g-w);
    const lf = clamp(1.35 + d*0.055, 0.25, 3.4)*g, la = clamp(1.25 - d*0.055, 0.25, 3.4)*g;
    Object.assign(r, { p:g, w, d:dr, l:g-w-dr, pts:w*3+dr, gf:Math.max(0, Math.round(lf + N0(Math.sqrt(lf)))), ga:Math.max(0, Math.round(la + N0(Math.sqrt(la)))) }); });
  S.lt.done[lg] = g;
}
function leagueForced(lg, a, b, gfa, gfb){ if(!S.lt) seasonTableInit(); if(S.lt.done[lg] < LG[lg].g && S.lt.T[lg][a] && S.lt.T[lg][b]) simRound(lg, [a, b, gfa, gfb]); }
function leagueRoundFor(lg){ if(!S.lt) seasonTableInit(); if(S.lt.done[lg] < LG[lg].g) simRound(lg); }
function tableOf(lg){
  if(!S.lt || !S.lt.T[lg]) return [];
  return Object.entries(S.lt.T[lg]).map(([id,r]) => ({ id, ...r })).sort((a,b) => b.pts-a.pts || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf);
}

/* ---------- 戰報：技術統計與雙方陣容 ---------- */
function statsHTML(r, st, m){
  const d = clamp(m.diff, -12, 12), gk = S.pos==='GK', sh = S.ab.sho;
  const pos = clamp(Math.round(50 + d*1.3 + N0(4)), 28, 72);
  const shF = Math.max(r.gf + ri(2,5), Math.round(9 + d*0.45 + N0(2.5))), shA = Math.max(r.ga + ri(2,5), Math.round(9 - d*0.45 + N0(2.5)));
  const onF = clamp(r.gf + ri(1,4), r.gf, shF), onA = clamp(r.ga + ri(1,4), r.ga, shA);
  const T = [['控球率', pos, 100-pos, '%'], ['射門', shF, shA], ['射中目標', onF, onA], ['角球', clamp(Math.round(5 + d*0.2 + N0(2)),0,14), clamp(Math.round(5 - d*0.2 + N0(2)),0,14)],
    ['犯規', ri(7,15), ri(7,15)], ['黃牌', ri(0,3), ri(0,3)]];
  const bar = ([n, a, b, u]) => { const t = a+b || 1; return `<div class="st-row"><b>${a}${u||''}</b><span>${n}<i><em style="width:${a/t*100}%"></em></i></span><b>${b}${u||''}</b></div>`; };
  const f = st.mins/90, ok = st.ok, ng = st.ng;
  /* 個人數據按能力與關鍵時刻表現推算 */
  let me;
  if(gk){ const sv = Math.max(0, onA - r.ga); me = [['撲救', sv], ['失球', r.ga], ['接住傳中', ri(1,5)], ['出球成功率', `${clamp(Math.round(58 + S.ab.pas*0.35 + N0(5)),40,96)}%`], ['上陣', `${st.mins}'`]]; }
  else { const pa = Math.max(4, Math.round((POS[S.pos].g==='MID'?52:POS[S.pos].g==='DEF'?44:28)*f + N0(5))), pc = clamp(Math.round(68 + (S.ab.pas-50)*0.4 + ok*2 - ng*2 + N0(4)), 50, 97);
    const g = POS[S.pos].g;
    me = [['傳球', `${Math.round(pa*pc/100)}/${pa}`], ['傳球成功率', `${pc}%`], ['射門', r.g + Math.max(0, Math.round((g==='ATT'?2.4:g==='MID'?1:0.3)*f + (sh-50)*0.02 + N0(0.8)))],
      ['關鍵傳球', r.a + Math.max(0, Math.round((g==='MID'?1.6:g==='ATT'?1:0.4)*f + N0(0.8)))], ['搶斷', Math.max(0, Math.round((g==='DEF'?3.2:g==='MID'?2:0.6)*f + N0(1)))], ['上陣', `${st.mins}'`]]; }
  return `<div class="st-teams"><b>${esc(r.home)}</b><b>${esc(r.opp)}</b></div>${T.map(bar).join('')}
  <h5>個人數據</h5><div class="st-me">${me.map(([n,v]) => `<div><b>${v}</b><small>${n}</small></div>`).join('')}</div>`;
}
const LINEUP = { 11:['GK','RB','CB','CB','LB','DM','CM','RW','AM','LW','ST'], 9:['GK','RB','CB','LB','DM','CM','RW','LW','ST'], 7:['GK','RB','CB','LB','CM','AM','ST'], 5:['GK','CB','CM','CM','ST'] };
const SLOT_N = { GK:'門將', RB:'右閘', LB:'左閘', CB:'中堅', DM:'後腰', CM:'中場', AM:'前腰', RW:'右翼', LW:'左翼', ST:'中鋒' };
const POS_SLOT = { GK:'GK', CB:'CB', FB:'RB', DM:'DM', CM:'CM', AM:'AM', W:'RW', ST:'ST' };
function lineupHTML(r, st, m){
  const n = S.stage==='GR' ? (S.age<=7 ? 5 : S.age<=9 ? 7 : 9) : 11, slots = LINEUP[n];
  const mine = POS_SLOT[S.pos] || 'CM', myIdx = slots.indexOf(mine) >= 0 ? slots.indexOf(mine) : 1;
  const base = (gf, ga) => 6.6 + (gf>ga?0.3:gf<ga?-0.3:0);
  const W = { ST:5, AM:3, RW:3, LW:3, CM:1.5, DM:0.7, CB:0.6, RB:0.4, LB:0.4, GK:0 };
  const scorers = (skip, cnt) => { const out = {}, w = slots.map((s,i) => i===skip ? 0 : W[s]), tot = w.reduce((a,b)=>a+b,0);
    for(let c=0; c<cnt; c++){ let t = R()*tot, j = 0; for(; j<w.length-1; j++){ t -= w[j]; if(t<=0) break; } out[j] = (out[j]||0) + 1; } return out; };
  const inMin = 92 - st.mins;
  const side = (mine, gf, ga) => { const sc = mine ? scorers(myIdx, st.otherF.length + st.myA) : scorers(-1, gf);
    if(mine && !m.sub && r.g) sc[myIdx] = r.g;
    const li = (pos, nm, rt, g, cls) => `<li class="${cls||''}"><i>${pos}</i><b>${esc(nm)}${g?` <em>${'⚽'.repeat(Math.min(4,g))}</em>`:''}</b><span class="${rt>=7.5?'hi':rt<6.2?'lo':''}">${rt.toFixed(1)}</span></li>`;
    const names = n===11 ? slotNames(mine ? m.hc : m.oc, slots, mine ? myIdx : -1) : null;
    const rows = slots.map((s,i) => { const me = mine && i===myIdx && !m.sub, nm0 = names && names[i] || npcName();
      return { p:SLOT_N[s], me, nm: me ? `★ ${fullName()}` : mine && i===myIdx ? `${nm0}（${inMin}' 換出）` : nm0, rt: me ? r.rt : r1(clamp(base(gf, ga) + N0(0.45) + (sc[i]||0)*0.6, 5.2, 9.2)), g:sc[i] }; });
    /* 全場最佳球員必定在陣容之中，而且評分最高 */
    if(r.motm!=='你' && r.motmN && mine===r.motmH){ const c = rows.find(x => !x.me && x.nm.startsWith(r.motmN)) || rows.filter(x => !x.me).sort((a,b) => b.rt-a.rt)[0]; if(!c.nm.startsWith(r.motmN)) c.nm = r.motmN; c.rt = r1(Math.max(c.rt, r.rt+0.2, 7.4)); }
    return rows.map(x => li(x.p, x.nm, x.rt, x.g, x.me ? 'me' : '')).join('')
      + (mine && m.sub ? li('後備', `★ ${fullName()}（${inMin}' 入替）`, r.rt, r.g, 'me') : ''); };
  return `<div class="lu"><div><h5>${esc(r.home)}</h5><ul>${side(true, r.gf, r.ga)}</ul></div><div><h5>${esc(r.opp)}</h5><ul>${side(false, r.ga, r.gf)}</ul></div></div>
  <p class="hint">${n<11?`${n} 人制比賽。`:''}評分只供參考。</p>`;
}
