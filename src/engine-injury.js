/* ================= 傷患 =================
   輕傷（minor，3–6 星期）：仍可上陣，但能力下降、較難取得正選，每次帶傷比賽都有機會令傷勢加重。
   重傷（major，5 星期以上）：不能參加任何比賽，養傷期間會遇到各種事件。 */
const injSev = () => !S || !S.inj || !(S.inj.w > 0) ? null : (S.inj.sev || (S.inj.w >= 5 ? 'major' : 'minor'));
/* 輕傷時的能力扣減：身體能力扣得較多 */
const injPen = k => injSev()==='minor' ? (ATTR_KIND[k]==='P' ? 5 : 2) : 0;
function setInj(w, n, sev){
  S.inj = { w, n, sev: sev || (w >= 5 ? 'major' : 'minor') };
  if(S.inj.sev==='major' && S.stage==='PRO' && S.season) S.season.inj = (S.season.inj||0) + w;
}
/* 調整養傷時間：重傷最少保留 1 星期 */
function injAdj(n){
  if(!S.inj || !(S.inj.w > 0)) return;
  S.inj.w = Math.max(S.inj.sev==='major' ? 1 : 0, S.inj.w + n);
  if(n > 0 && S.stage==='PRO' && S.season && S.inj.sev==='major') S.season.inj = (S.season.inj||0) + n;
}
const injTxt = () => { const s = injSev(); return !s ? '' : s==='major' ? `${S.inj.n}，尚餘 ${S.inj.w} 星期，不能比賽` : `${S.inj.n}（輕傷），尚餘 ${S.inj.w} 星期，可帶傷上陣`; };

/* 比賽中受傷 */
const INJ_MINOR = ['大腿撞傷','腳踝輕微扭傷','小腿抽筋','膝部撞傷','腳趾瘀傷','背部繃緊'];
const INJ_MID = ['大腿後肌拉傷','腳踝扭傷','腹股溝拉傷','小腿肌肉撕裂','肩膀脫臼','肋骨骨裂'];
const INJ_SEVERE = ['膝部十字韌帶','腳踝韌帶','跟腱','蹠骨骨折'];
function matchInjury(m, cont){
  cont = cont || (() => {});
  if(injSev()) { cont(); return; }
  const pro = !m.youth, inten = INTENSITY[(S.plan||{}).int||'normal'].inj;
  const p = pro ? clamp(2.6 + (S.m.fat-45)*0.12 + Math.max(0,S.age-28)*0.35 + (S.tmpInj||0) + inten + (S.body==='lean'?0.5:0) - (hasLife('nutri')?0.8:0), 0.8, 16)
                : clamp(1.2 + (S.m.fat-40)*0.08 + (S.age>=13?0.6:0) + (S.tmpInj||0)*0.4 + inten*0.6 - (S.flags.multi?0.6:0) - (S.items&&S.items.food?0.4:0), 0.4, 10);
  S.tmpInj = 0;
  if(!chance((p + (S.flags.weak>=S.year ? 2.5 : 0))*(hasPerk('iron')?0.65:1)*dif().inj)){ cont(); return; }
  if(chance(pro?7:6)){ const w = ri(16,32), n = pick(INJ_SEVERE); setInj(w, `${n}受傷`, 'major');
    const t = fx(pro ? {conf:-6,love:-5,trust:-3} : {conf:-8,love:-6,coach:-3}); UI.card('bad','重傷', `比賽中一次落地，你感到一陣劇痛。醫生診斷為${n}受傷，需要休息 ${w} 星期，期間不能參加任何比賽。<div class="fx">${t}</div>`); logLine(`${S.age} 歲重傷（${n}），休息 ${w} 星期`);
    if(pro && S.age>=27 && chance(45)){ S.ab.pac = Math.max(1,S.ab.pac-ri(1,3)); UI.card('bad','後遺症','傷癒之後，你的爆發力已大不如前。'); }
    if(pro && S.stage==='PRO'){ injuryChoice('severe', w, n, cont); return; }
    cont(); return; }
  if(chance(60)){ const w = ri(3,6), n = pick(INJ_MINOR); setInj(w, n, 'minor');
    UI.card('bad','輕傷', `賽後發現${n}，大約 ${w} 星期才會完全康復。<br>你仍然可以上陣，但表現會受影響（身體能力 −5、其他能力 −2），主帥亦較少起用你；帶傷比賽有機會令傷勢加重。`);
    cont(); return; }
  const w = ri(5,10), n = pick(INJ_MID); setInj(w, n, 'major');
  UI.card('bad','傷患', `賽後檢查發現${n}，需要休息 ${w} 星期，期間不能比賽。`);
  if(pro && S.stage==='PRO'){ injuryChoice('mid', w, n, cont); return; }
  cont();
}
/* 帶輕傷比賽後：有機會加重 */
function injAggravate(){
  if(injSev()!=='minor') return;
  const p = clamp(18 + (S.m.fat-50)*0.3 + (S.flags.weak>=S.year ? 10 : 0) - (hasLife('nutri') ? 4 : 0), 6, 45);
  if(!chance(p)) return;
  const add = ri(3,7), n = S.inj.n.replace(/（加重）$/, '');
  setInj(S.inj.w + add, `${n}（加重）`, 'major');
  const t = fx({ conf:-3 });
  UI.card('bad', '傷勢加重', `帶傷比賽的代價：${n}明顯惡化，現在需要休息 ${S.inj.w} 星期，期間不能比賽。${t?`<div class="fx">${t}</div>`:''}`);
}
/* 輕傷時：帶傷上陣還是休息？ */
function minorChoice(tag, play, rest){
  const p = clamp(18 + (S.m.fat-50)*0.3 + (S.flags.weak>=S.year ? 10 : 0), 6, 45);
  UI.card('event', '帶傷上陣？', `${tag}前，你的${esc(S.inj.n)}仍未完全康復（尚餘 ${S.inj.w} 星期）。`);
  UI.choose('你的決定？', [
    { t:'帶傷上陣', main:true, s:`身體能力 −5、其他能力 −2｜傷勢加重機會約 ${Math.round(p)}%`, f:play },
    { t:'休息這一場', s:'多休息有助康復（養傷時間 −1 星期）', f:() => { injAdj(-1); UI.card('', '休息', S.inj.w > 0 ? `你留在場邊，預計再過 ${S.inj.w} 星期便完全康復。` : '休息過後，傷患已經痊癒。'); rest(); } } ]);
}
/* 重傷養傷期間：在缺陣的比賽日有機會遇到事件 */
function injuryEvent(next){
  if(injSev()!=='major' || !chance(40)){ next(); return; }
  const pool = EVENTS.filter(e => e.inj && e.st.includes(S.stage) && S.age>=e.a[0] && S.age<=e.a[1] && (!e.c || e.c()) && !S.seen.slice(-20).includes(e.id));
  const e = pick(pool); if(!e){ next(); return; }
  S.seen.push(e.id);
  UI.card('event', e.t, e.d());
  const opts = e.o().filter(o => !o.c || o.c());
  UI.choose('你會如何選擇？', opts.map(o => ({ t:o.t, s:o.s, f:() => resolveOpt(o, e, next) })));
}
