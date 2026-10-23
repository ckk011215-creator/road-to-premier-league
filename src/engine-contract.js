/* ================= 合約談判 =================
   接受報價前可以討價還價：加薪、合約年期、獎金、解約金條款、簽字費。
   每次要求都會消耗球會的耐性；耐性用盡，球會會發出「最後通牒」。 */
let CT_OPTS = [];          /* 夏季轉會窗的選項（拒絕報價後返回） */
const CT_ASKS = {
  pay10: { t:'要求加薪一成', d:0, cost:16, f:N => { N.w = Math.round(N.w*1.1/50)*50; } },
  pay25: { t:'要求大幅加薪（約 25%）', d:-18, cost:28, f:N => { N.w = Math.round(N.w*1.25/50)*50; } },
  long:  { t:'要求延長合約一年', d:5, cost:10, c:N => N.yrs < 5 && S.age < 31, f:N => { N.yrs++; } },
  short: { t:'要求縮短合約一年', d:12, cost:6, c:N => N.yrs > 1, f:N => { N.yrs--; } },
  bonus: { t:() => ['ST','W','AM','CM'].includes(S.pos) ? '要求入球獎金' : '要求出場獎金', d:2, cost:12, c:N => !N.bonusG && !N.bonusApp,
           f:N => { if(['ST','W','AM','CM'].includes(S.pos)) N.bonusG = Math.round(N.w*0.6/50)*50; else N.bonusApp = Math.round(N.w*0.2/50)*50; } },
  rc:    { t:'加入解約金條款', d:-10, cost:18, c:N => !N.rc, f:N => { N.rc = true; } },
  fee:   { t:'要求簽字費', d:-6, cost:14, c:N => !N.fee, f:N => { N.fee = Math.round(N.w*10/50)*50; } }
};
/* 議價能力：能力高於球會、上季表現好、人氣高、年輕、有經紀人，球會越願意讓步 */
function leverage(x){
  const o = ovr(), rt = S.pro.lastRt || 6.6, a = agentOf();
  return clamp((o - x.str)*3 + (rt-6.9)*20 + ((S.m.fans||50)-50)*0.25 + (a ? a.net*5 + (S.agent.rel-50)*0.1 : 0) + (S.age<=24 ? 5 : S.age>=31 ? -8 : 0) + (CT_OPTS.length>2 ? 6 : 0), -30, 40);
}
const termsTxt = N => `${N.yrs} 年｜週薪 ${money(N.w)}${N.bonusG?`｜每個入球 ${money(N.bonusG)}`:''}${N.bonusApp?`｜每次上陣 ${money(N.bonusApp)}`:''}${N.rc?'｜設解約金條款':''}${N.fee?`｜簽字費 ${money(N.fee)}`:''}`;
function negotiate(x, yrs, w, me){
  const lev = leverage(x);
  const N = { x, yrs, w, bonusG:0, bonusApp:0, rc:false, fee:0, pat:clamp(55 + lev, 20, 95), asked:{}, me };
  UI.card('event', `與${x.n}談判`, `${x.n}的初步報價：<b>${termsTxt(N)}</b><br>${lev>=15 ? '你的經紀人說：「他們很想要你，可以爭取多一點。」' : lev>=0 ? '經紀人提醒：「條件合理，適可而止。」' : '對方態度強硬，你的議價空間不大。'}`);
  negoStep(N);
}
function negoStep(N){
  const x = N.x, lev = leverage(x);
  const bar = `<div class="rel"><span>球會的耐性<b>${Math.round(N.pat)}</b></span><i><u style="width:${clamp(N.pat,0,100)}%"></u></i><small>${N.pat>=60?'對方仍然樂意商討':N.pat>=30?'對方開始不耐煩':'對方快要失去耐性'}</small></div>`;
  if(N.pat <= 0){
    UI.card('bad', '最後通牒', `${x.n}表示不會再讓步：「這是我們最後的報價。」<br>${termsTxt(N)}`);
    const opts = [{ t:'接受最後報價', main:true, s:termsTxt(N), f:() => negoSign(N) }];
    const others = CT_OPTS.filter(o => o!==N.me);
    if(others.length) opts.push({ t:'拒絕，考慮其他選擇', s:'這份報價會作廢', f:() => { CT_OPTS = others; UI.choose('夏季轉會窗：你的決定？', others); } });
    UI.choose('你的決定？', opts); return;
  }
  const asks = Object.entries(CT_ASKS).filter(([k, a]) => !N.asked[k] && (!a.c || a.c(N)) && !(k==='pay25' && N.asked.pay10) && !(k==='pay10' && N.asked.pay25) && !(k==='short' && N.asked.long) && !(k==='long' && N.asked.short));
  const rounds = Object.keys(N.asked).length;
  const opts = [{ t:'接受條款並簽約', main:true, s:termsTxt(N), f:() => negoSign(N) }];
  if(rounds < 4) asks.forEach(([k, a]) => { const p = clamp(50 + lev*1.1 + a.d - rounds*8, 5, 92);
    opts.push({ t:typeof a.t==='function' ? a.t() : a.t, s:`${SET.odds===false ? (p>=70?'對方大概會答應':p>=45?'機會一半':'對方多數會拒絕') : `對方答應機會 ${p}%`}｜耐性 −${a.cost}${k==='rc'?'｜將來較易轉投大球會':k==='fee'?'｜一次過存入存款':''}`, f:() => {
      N.asked[k] = 1; N.pat -= a.cost;
      if(chance(p)){ a.f(N); UI.card('good', '對方答應', `${x.n}接受了你的要求。<br>${termsTxt(N)}`); }
      else { N.pat -= 10; UI.card('bad', '對方拒絕', `${x.n}拒絕了這項要求，談判氣氛有點緊張。`); }
      negoStep(N); } }); });
  const others = CT_OPTS.filter(o => o!==N.me);
  if(others.length) opts.push({ t:'拒絕報價', s:'返回其他選擇', f:() => { CT_OPTS = others; UI.choose('夏季轉會窗：你的決定？', others); } });
  UI.card('', '談判桌', `目前條款：<b>${termsTxt(N)}</b>${bar}`);
  UI.choose('下一步？', opts);
}
function negoSign(N){
  if(N.fee){ S.money = (S.money||0) + N.fee; }
  S.pro.terms = { bonusG:N.bonusG, bonusApp:N.bonusApp, rc:N.rc }; S.pro.keepTerms = true;
  if(N.rc) logLine(`${S.age} 歲的合約加入解約金條款`);
  sign(N.x, N.yrs, N.w);
}
/* 季尾：發放合約獎金 */
function contractBonus(row){
  const t = S.pro && S.pro.terms; if(!t || !row || row.lg==='DEV') return;
  const v = (t.bonusG||0)*row.g + (t.bonusApp||0)*row.app; if(!v) return;
  S.money = (S.money||0) + v; S.earn = (S.earn||0) + v;
  UI.card('', '合約獎金', `按合約條款，本季獎金合共 ${money(v)}（${t.bonusG ? `${row.g} 個入球` : `${row.app} 次上陣`}）。`);
}
