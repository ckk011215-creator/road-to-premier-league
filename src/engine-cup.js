/* ================= 國內盃賽：FA Cup 與聯賽盃 =================
   季前決定參賽資格；每圈抽籤，親自上陣，打和便加時，再和便互射十二碼。
   落敗即出局，之後的盃賽日程自動刪除。 */
const CUPS = {
  fa: { n:'FA Cup', rounds:['第一圈','第二圈','第三圈','第四圈','第五圈','八強','四強','決賽'],
        wk:[[1,12],[1,16],[2,1],[2,5],[2,9],[2,12],[2,15],[2,19]], entry:lg => ({ PL:2, CH:2, L1:0, L2:0, NL:0 })[lg], wembley:6, ven:'溫布萊',
        lgs:r => r<=1 ? ['L1','L2','NL'] : ['PL','CH','L1','L2','NL'], win:['PL','CH','L1'] },
  lc: { n:'聯賽盃', rounds:['第一圈','第二圈','第三圈','第四圈','八強','四強','決賽'],
        wk:[[1,2],[1,5],[1,9],[1,13],[1,18],[2,6],[2,10]], entry:lg => ({ PL:1, CH:0, L1:0, L2:0 })[lg], wembley:6, ven:'溫布萊',
        lgs:() => ['PL','CH','L1','L2'], win:['PL','CH'] },
  es: { n:'國王盃', rounds:['第一圈','第二圈','三十二強','十六強','八強','四強','決賽'],
        wk:[[1,8],[1,12],[2,1],[2,4],[2,8],[2,12],[2,18]], entry:lg => ({ ES:0 })[lg], wembley:6, ven:'中立球場',
        lgs:() => ['ES','ES2'], win:['ES'] },
  it: { n:'意大利盃', rounds:['三十二強','十六強','八強','四強','決賽'],
        wk:[[1,10],[2,2],[2,6],[2,12],[2,18]], entry:lg => ({ IT:0 })[lg], wembley:4, ven:'羅馬奧林匹克球場',
        lgs:() => ['IT','IT2'], win:['IT'] },
  de: { n:'德國盃', rounds:['第一圈','第二圈','十六強','八強','四強','決賽'],
        wk:[[1,3],[1,10],[2,1],[2,6],[2,12],[2,18]], entry:lg => ({ DE:0 })[lg], wembley:5, ven:'柏林奧林匹克球場',
        lgs:() => ['DE','DE2'], win:['DE'] },
  fr: { n:'法國盃', rounds:['六十四強','三十二強','十六強','八強','四強','決賽'],
        wk:[[1,14],[2,1],[2,4],[2,8],[2,12],[2,18]], entry:lg => ({ FR:0 })[lg], wembley:5, ven:'法蘭西球場',
        lgs:() => ['FR','FR2'], win:['FR'] }
};
/* 季前：按所屬球會的聯賽決定參賽資格並抽第一個對手 */
function cupInit(){
  const c = club(curClub()); S.cup = { y:S.year, club:c.id };
  Object.entries(CUPS).forEach(([k, cu]) => { const e = cu.entry(c.lg);
    S.cup[k] = e==null || S.pro.semi ? { in:false } : { in:true, r:e, out:false, won:false, log:[] };
    if(S.cup[k].in) S.cup[k].opp = cupDraw(k, e); });
}
/* 抽籤：早圈多數是低級別球會，越後越強 */
function cupDraw(k, r){
  const cu = CUPS[k], f = r/(cu.rounds.length-1), me = curClub();
  const lgs = cu.lgs(r);
  const pool = Object.values(S.W.clubs).filter(c => c.id!==me && lgs.includes(c.lg));
  const o = wpick(pool, c => Math.pow(Math.max(1, c.str-30), 1 + f*4)) || pick(pool);
  return o.id;
}
/* 學期日程加入盃賽 */
function cupSlots(term){
  if(!S.cup || S.cup.y!==S.year) return [];
  const out = [];
  Object.entries(CUPS).forEach(([k, cu]) => { const st = S.cup[k]; if(!st || !st.in || st.out || st.won) return;
    cu.wk.forEach(([t, wk], r) => { if(t===term && r>=st.r) out.push({ k:'cup', wk, cup:k, r }); }); });
  return out;
}
const cupRoundName = (k, r) => `${CUPS[k].n}・${CUPS[k].rounds[r]}`;
/* 出局：刪除之後的盃賽日程 */
function cupOut(k){ S.cup[k].out = true; if(S.cal) S.cal = S.cal.filter((s,i) => i<=S.ci || !(s.k==='cup' && s.cup===k)); }
function cupRun(sl, next){
  const k = sl.cup, st = S.cup && S.cup[k], cu = CUPS[k];
  if(!st || !st.in || st.out || st.won || st.r!==sl.r){ next(); return; }
  const c = club(curClub()), o = club(st.opp), se = S.season || {}, lg = LG[c.lg];
  if(curClub()!==S.cup.club){ UI.card('', cupRoundName(k, sl.r), `你本季已代表${cName(S.cup.club)}參加${cu.n}，按規例不能再為新球會上陣。`); cupOut(k); next(); return; }
  const final = sl.r===cu.rounds.length-1, wem = sl.r>=cu.wembley, home = !wem && chance(50);
  const tag = `${cupRoundName(k, sl.r)}${wem ? `（${cu.ven}）` : home ? '（主場）' : '（作客）'}`;
  /* 角色：聯賽盃早圈會讓後備及年輕球員上陣 */
  const early = k==='lc' && sl.r<=2 && c.lg==='PL';
  let n, sub = false, plays = true;
  if(injSev()==='major') plays = false;
  else if(se.dev){ plays = early || (k==='fa' && sl.r<=3 && chance(30)); n = 2; sub = !early && chance(50); }
  else if(se.r===0){ n = early && chance(50) ? 1 : 3; sub = n===1; }
  else if(se.r===1){ n = 2; }
  else if(se.r===2){ n = early || sl.r<=3 ? 2 : 1; sub = !early && sl.r>3; }
  else { plays = early || chance(25); n = 2; }
  if(final) UI.card('event', `${cu.n}決賽`, `${cu.ven==='溫布萊' ? '溫布萊球場，九萬名球迷' : `${cu.ven}，全場座無虛席`}。${c.n}對${o.n}。你在球員通道裏聽到看台的歌聲，雙腿有點發軟。`);
  const after = r => {
    const done = win => {
      st.log.push({ r:sl.r, opp:o.id, gf:r.gf, ga:r.ga, win });
      if(win){
        if(final){ st.won = true; addHonour(`${cu.n}冠軍`, { club:c.id, role: plays ? (se.r ?? 2) : 3 }); logLine(`${S.year+1} 年${cu.n}冠軍（${c.n}）`);
          const t = fx({ fans:8, love:4, conf:4 }); UI.card('gold', `${cu.n}冠軍`, `${c.n}捧起${cu.n}！${plays?`你在${cu.ven==='溫布萊'?'溫布萊':'看台前'}高舉獎盃，這一刻你會記住一輩子。`:'你雖然沒有上陣，仍然是冠軍隊伍的一分子。'}${t?`<div class="fx">${t}</div>`:''}`); }
        else { st.r = sl.r + 1; st.opp = cupDraw(k, st.r); const no = club(st.opp);
          UI.card('good', `${cu.n}晉級`, `${c.n}晉身${cu.rounds[st.r]}。抽籤結果：對<b>${no.n}</b>（${LG[no.lg].short}）。`); }
      } else { UI.card('bad', `${cu.n}出局`, `${c.n}在${cu.rounds[sl.r]}被${o.n}淘汰。`); cupOut(k); }
      next();
    };
    if(r.gf!==r.ga){ done(r.gf>r.ga); return; }
    if(chance(35)){ const w = chance(clamp(50 + (c.str-o.str)*3, 15, 85)); UI.card(w?'good':'bad', '加時賽', w ? `第 ${ri(95,119)} 分鐘，${c.n}攻入致勝一球！` : `第 ${ri(95,119)} 分鐘，${o.n}在加時階段絕殺。`); done(w); return; }
    UI.card('event', '加時賽', '加時 30 分鐘雙方都沒有再入球，要以互射十二碼決勝。');
    shootout(c.n, o.n, c.str-o.str, plays && !r.sim, done);
  };
  if(!plays){
    const lamF = clamp(1.35 + (c.str-o.str)*0.06, 0.35, 3.2), lamA = clamp(1.3 - (c.str-o.str)*0.06, 0.3, 3.2), gf = poisson(lamF), ga = poisson(lamA);
    UI.card('', `${tag}：${c.n} ${gf}–${ga} ${o.n}`, injSev()==='major' ? '你仍在養傷，只能在看台觀戰。' : '你沒有入選這場盃賽的大軍名單。');
    after({ gf, ga, sim:true }); return;
  }
  playMatch({ tag, hc:c.id, oc:o.id, home:c.n, opp:o.n, lvl:(o.str + lg.par)/2, diff:c.str-o.str + (wem?0:home?1:-1),
    stake: final ? 3 : sl.r>=cu.rounds.length-3 ? 2 : 1, youth:false, n, sub, cup:true,
    after:() => { if(se.dev && !S.pro.debut){ S.pro.debut = true; se.fd = (se.fd||0) + 1; logLine(`${S.age} 歲在${cu.n}完成一隊首秀`); } } },
    r => { S.season.cup = S.season.cup || { app:0, g:0, a:0 }; S.season.cup.app++; S.season.cup.g += r.g; S.season.cup.a += r.a; after(r); });
}
/* 季尾：沒有奪冠時顯示盃賽冠軍 */
function cupWinners(){
  const out = {}; if(!S.cup || S.cup.y!==S.year) return out;
  Object.entries(CUPS).forEach(([k, cu]) => { const st = S.cup[k];
    if(st && st.won) out[k] = S.cup.club;
    else { const lgs = cu.win; out[k] = (wpick(Object.values(S.W.clubs).filter(x => lgs.includes(x.lg) && x.id!==S.cup.club), x => Math.pow(Math.max(1,x.str-50), 2.6)) || {}).id; } });
  return out;
}
