/* ================= 職業期：賽季目標、經紀人、存款與生活商店 ================= */

/* ---------- 賽季目標：季前由主帥訂立，季尾結算 ---------- */
function setObjectives(){
  const se = S.season, c = club(curClub()), pos = S.pos, g = POS[pos].g, O = [];
  if(se.dev){ O.push({ k:'rt', n:'預備組平均評分 6.8 或以上', v:6.8 }); O.push({ k:'fd', n:'爭取一隊上陣機會', v:1 }); }
  else {
    const pj = seasonProj(), appT = Math.round(pj.app*0.97); if(appT>0) O.push({ k:'app', n:`聯賽出場 ${appT} 場`, v:appT });
    if(pos==='GK'){ const t = Math.max(1, Math.round(pj.cs*1.05)); O.push({ k:'cs', n:`零封 ${t} 場`, v:t }); }
    else if(g==='ATT' || pos==='AM'){ const t = Math.max(1, Math.round(pj.g*1.15)); O.push({ k:'g', n:`入球 ${t} 個`, v:t }); }
    else if(g==='MID'){ const t = Math.max(1, Math.round(pj.a*1.15)); O.push({ k:'a', n:`助攻 ${t} 次`, v:t }); }
    else O.push({ k:'rt', n:'平均評分 6.9 或以上', v:6.9 });
    const list = clubsIn(c.lg).slice().sort((a,b)=>b.str-a.str), n = list.length, rank = list.findIndex(x=>x.id===c.id)+1;
    const t = clamp(rank+1, 1, n-3); O.push({ k:'pos', n: t<=1 ? '奪得聯賽冠軍' : t>=n-3 ? `成功護級（第 ${t} 或更高）` : `聯賽排名第 ${t} 或更高`, v:t });
  }
  se.obj = O;
  UI.card('event', '賽季目標', `主帥在季前會議上為你訂下目標：<br>${O.map(o=>`・${o.n}`).join('<br>')}<br><span class="hint">季尾逐項結算：達成可提升主帥信任、球迷人氣並獲得獎金。</span>`);
}
/* 按現時角色推算整季數據（不含隨機），用於主頁顯示進度 */
function seasonProj(){
  const se = S.season; if(!se || se.dev || se.r==null) return null;
  const c = club(curClub()), lg = LG[c.lg], pos = S.pos, gk = pos==='GK';
  const app = lg.g*(gk ? [.915,.5,.09,.015] : [.865,.575,.265,.03])[se.r], mpg = gk ? 90 : [86,72,26,20][se.r], n90 = app*mpg/90, lvl = lg.par;
  return { app, g:GOAL90[pos]*clamp(1+(eff('sho')-lvl)*0.035,0.3,2.3)*n90, a:AST90[pos]*clamp(1+((eff('pas')+eff('iq'))/2-lvl)*0.03,0.3,2.1)*n90,
    cs: gk ? app*clamp(0.24 + (c.str - lg.par)*0.018 + (ovr()-lvl)*0.012, 0.06, 0.58) : 0 };
}
function objectiveStatus(o){
  const se = S.season, pj = seasonProj(), lg = curLg();
  if(o.k==='pos'){ const rows = tableOf(lg), i = rows.findIndex(r=>r.id===curClub()); return { now:i>=0 ? `現時第 ${i+1}` : '—', ok:i>=0 && i+1<=o.v }; }
  if(o.k==='rt'){ const r = S.ss && S.ss.app ? S.ss.rt/S.ss.app : 0; return { now:r ? `親自比賽平均 ${r.toFixed(2)}` : '—', ok:r>=o.v }; }
  if(o.k==='fd') return { now:se.fd ? `已上陣 ${se.fd} 次` : '未有', ok:se.fd>=1 };
  if(!pj) return { now:'—', ok:false };
  const v = pj[o.k]; return { now:`按現時角色，預計季尾約 ${Math.round(v)}`, ok:v>=o.v };
}
function objectivesEnd(row, pos){
  const se = S.season; if(!se || !se.obj || !se.obj.length) return;
  const val = { app:row.app, g:row.g, a:row.a, cs:row.cs||0, rt:row.rt, fd:row.fd||0 };
  let hit = 0; const lines = se.obj.map(o => { const ok = o.k==='pos' ? pos<=o.v : (val[o.k]||0) >= o.v; if(ok) hit++; return `${ok?'✓':'✗'} ${o.n}${o.k==='pos'?`（第 ${pos}）`:o.k==='rt'?`（${(val.rt||0).toFixed(2)}）`:`（${val[o.k]||0}）`}`; });
  const bonus = hit * S.pro.wage * 3;
  const t = fx({ trust:hit*3 + (hit===se.obj.length?3:0) - (se.obj.length-hit>=2?5:0), fans:hit*2 });
  if(bonus) S.money = (S.money||0) + bonus;
  UI.card(hit===se.obj.length?'gold':hit?'':'bad', hit===se.obj.length?'賽季目標全部達成':'賽季目標結算', `${lines.join('<br>')}${bonus?`<br>目標獎金 ${money(bonus)}`:''}${t?`<div class="fx">${t}</div>`:''}`);
  if(hit===se.obj.length) S.flags.objAll = (S.flags.objAll||0) + 1;
}

/* ---------- 經紀人 ---------- */
const AGENTS = {
  big:{ n:'大型經紀公司', fee:0.10, net:2, wage:0.12, d:'人脈最廣：物色球會時報價最多、薪金較高；收取 10% 佣金。' },
  indie:{ n:'獨立經紀人', fee:0.05, net:1, wage:0.06, d:'熟悉低級別聯賽：報價與薪金略有提升；收取 5% 佣金。' },
  dad:{ n:'由父親代理', fee:0, net:0, wage:0, d:'不收佣金，家庭關係更好；但人脈有限，物色球會的成效較低。' }
};
const agentOf = () => S.agent && AGENTS[S.agent.type] ? AGENTS[S.agent.type] : null;
function migrateAgent(){ if(!S.agent && S.flags.agentSigned) S.agent = { type:'indie', rel:60 }; }
const agentWage = () => { const a = agentOf(); return a ? a.wage*clamp(S.agent.rel/60, 0.4, 1.3) : 0; };
function hireAgent(type){ S.agent = { type, rel:type==='dad'?75:60 }; if(type==='dad') fx({ fam:5 }); S.flags.agentSigned = 1; logLine(`${S.age} 歲聘請${AGENTS[type].n}`); }
function fireAgent(){ if(S.agent){ logLine(`${S.age} 歲與${AGENTS[S.agent.type].n}解約`); if(S.agent.type==='dad') fx({ fam:-6 }); } S.agent = null; }
/* 物色球會：在夏季轉會窗額外帶來報價 */
function askAgent(){ if(!S.agent || !S.pro) return; S.pro.agentAsk = S.year; S.agent.rel = clamp(S.agent.rel + (S.pro.agentAskLast===S.year-1 ? -3 : 0), 0, 100); S.pro.agentAskLast = S.year; }
function agentOffers(){
  if(!S.pro || S.pro.agentAsk!==S.year || !agentOf()) return 0;
  const a = agentOf(); return Math.max(0, a.net + (S.agent.rel>=70?1:0) - (S.agent.rel<35?1:0) + (a.net===0 && chance(50)?1:0));
}

/* ---------- 生活商店（職業期）：價格以英鎊計；yr＝每年續費 ---------- */
const LIFE = [
  { id:'nutri',   n:'私人營養師',   p:12000,  yr:true, d:'疲勞恢復更快，受傷風險下降' },
  { id:'psych',   n:'運動心理師',   p:15000,  yr:true, d:'自信較穩定，壓力大時表現下降較少' },
  { id:'ptc',     n:'私人體能教練', p:30000,  yr:true, d:'訓練成長 +15%，體能、力量小幅提升' },
  { id:'analyst', n:'數據分析團隊', p:45000,  yr:true, d:'球商提升；能力估算範圍收窄' },
  { id:'charity', n:'成立慈善基金', p:80000,  yr:true, d:'每年球迷人氣↑、熱誠↑' },
  { id:'cryo',    n:'冷凍治療設備', p:90000,  d:'傷患復原更快；30 歲後衰退較慢' },
  { id:'car',     n:'名貴跑車',     p:160000, d:'熱誠↑、球迷人氣↑（一次性）' },
  { id:'house',   n:'家庭新居',     p:450000, d:'家庭↑↑、熱誠↑（一次性）' }
];
const hasLife = id => S.life && S.life[id];
function buyLife(id){
  const x = LIFE.find(l => l.id===id); if(!x || hasLife(id) || (S.money||0) < x.p) return false;
  S.money -= x.p; S.life = S.life || {}; S.life[id] = S.year; logLine(`${S.age} 歲購買${x.n}`);
  if(id==='car') fx({ love:5, fans:4 }); if(id==='house') fx({ fam:12, love:4 }); if(id==='charity') fx({ fans:6, love:2 });
  return true;
}
/* 每季季前：續費年費項目（存款不足便停止） */
function lifeRenew(){
  if(!S.life) return; const out = [];
  LIFE.filter(x => x.yr && S.life[x.id] && S.life[x.id] < S.year).forEach(x => {
    if((S.money||0) >= x.p){ S.money -= x.p; S.life[x.id] = S.year; if(x.id==='charity') fx({ fans:4, love:2 }); }
    else { delete S.life[x.id]; out.push(x.n); } });
  if(out.length) UI.card('bad', '停止服務', `存款不足，以下服務已停止：${out.join('、')}。`);
}
