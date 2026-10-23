/* ================= 球會收購、財政危機、國際大賽、轉會市場 ================= */

/* 設定（由介面讀寫；模擬環境沒有 localStorage 時使用預設值） */
const SET = (() => { try{ return JSON.parse(localStorage.getItem('g2p-set')||'{}'); }catch(e){ return {}; } })();

/* ---------- 球會易主與財政危機（季前） ---------- */
const OWNERS = ['中東財團', '美國投資基金', '亞洲財團', '本地富商'];
/* 每季季前：收購帶來的實力提升逐年生效 */
function ownerTick(){
  Object.values(S.W.clubs).forEach(c => { if(c.boost && c.boost.n>0){ c.str = r1(c.str + c.boost.v); c.boost.n--; } });
}
function clubNews(next){
  ownerTick();
  const c = club(curClub()), mine = !S.pro.loan;
  /* 其他球會易主：只報道同一聯賽的消息 */
  if(chance(14)){ const x = pick(Object.values(S.W.clubs).filter(k => k.id!==c.id && !k.owner && ['CH','L1','L2'].includes(k.lg)));
    if(x){ x.owner = pick(OWNERS); x.boost = { n:3, v:1.8 }; x.str = r1(x.str + 2);
      if(x.lg===c.lg) UI.card('event', '聯賽消息', `${x.owner}收購了${x.n}，並承諾在轉會市場投放巨額資金。今季的${LG[x.lg].n}多了一個勁敵。`); } }
  if(!mine || S.pro.semi){ next(); return; }
  if(!c.owner && c.str < 84 && chance(4)){ takeover(c, next); return; }
  if(!c.owner && ['CH','L1','L2','NL'].includes(c.lg) && chance(2.5)){ crisis(c, next); return; }
  next();
}
function takeover(c, next){
  const who = pick(OWNERS), goal = c.lg==='PL' ? '爭奪英超冠軍' : isAbroadLg(c.lg) ? `爭奪${LG[c.lg].n}冠軍` : '三年內升上英超';
  c.owner = who; c.boost = { n:3, v:LG[c.lg].lvl===1?1.2:2 }; c.str = r1(c.str + ri(2,4));
  logLine(`${S.age} 歲：${who}收購${c.n}`);
  UI.card('event', '球會易主', `${who}完成收購${c.n}。新老闆在記者會上承諾大灑金錢，目標是${goal}。<br>更衣室內議論紛紛：新老闆會帶來新球星，還是新機會？`);
  UI.choose('你的反應？', [
    { t:'主動與新老闆會面，表明留隊決心', s:'主帥信任↑、球迷人氣↑', f:()=>{ const t = fx({ trust:5, fans:3 }); UI.card('good', '新老闆的承諾', `新老闆拍着你的肩膀說：「你是這個計劃的一部分。」${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'要求加薪，與球會一同成長', s:`週薪約 +25%｜主帥信任↓`, f:()=>{ S.pro.wage = Math.round(S.pro.wage*1.25/50)*50; const t = fx({ trust:-4 }); UI.card('', '新合約條款', `球會同意調整你的週薪至 ${money(S.pro.wage)}，但主帥對你在這個時候談錢不太高興。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'保持低調，專心訓練', s:'看新老闆的轉會動作', f:()=>{
      if(chance(50)){ const t = fx({ trust:-8, conf:-3 }); UI.card('bad', '新援到隊', `球會斥巨資簽入一名與你同位置的國腳。你的正選位置受到威脅。${t?`<div class="fx">${t}</div>`:''}`); }
      else { const t = fx({ trust:3 }); UI.card('good', '穩定軍心', `新老闆的簽約集中在其他位置。主帥欣賞你的專注。${t?`<div class="fx">${t}</div>`:''}`); }
      next(); } } ]);
}
function crisis(c, next){
  c.str = r1(c.str - ri(2,4)); c.boost = { n:2, v:-1 }; c.crisis = S.year;
  if(S.lt && S.lt.T[c.lg] && S.lt.T[c.lg][c.id]) S.lt.T[c.lg][c.id].pts -= 10;
  logLine(`${S.age} 歲：${c.n}進入行政接管`);
  UI.card('bad', '財政危機', `${c.n}被宣布進入行政接管，聯賽即時扣 10 分。管理人要求球員減薪，否則將出售主力球員以償還債務。`);
  UI.choose('你的決定？', [
    { t:'同意減薪 30%，與球會共渡時艱', s:'週薪↓｜球迷人氣↑↑、隊友關係↑', f:()=>{ S.pro.wage = Math.max(50, Math.round(S.pro.wage*0.7/50)*50); const t = fx({ fans:8, mates:6, trust:4 }); UI.card('good', '共渡時艱', `球迷在社交媒體上稱讚你的忠誠。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'拒絕減薪，要求離隊', s:'主帥信任↓↓｜夏季轉會窗報價增加', f:()=>{ S.pro.listed = S.year; const t = fx({ trust:-10, fans:-6 }); UI.card('bad', '要求離隊', `你的經紀人通知管理人：你希望在夏天離開。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'暫不表態', s:'', f:()=>{ const t = fx({ mates:-3 }); UI.card('', '沉默', `你沒有公開表態。部分隊友覺得你只顧自己。${t?`<div class="fx">${t}</div>`:''}`); next(); } } ]);
}

/* ---------- 國際大賽：分組賽＋淘汰賽，可親自上陣 ---------- */
const NATIONS = [['法國',87,1],['西班牙',87,1],['阿根廷',86,0],['巴西',85,0],['葡萄牙',84,1],['德國',84,1],['荷蘭',83,1],['意大利',82,1],['比利時',81,1],['克羅地亞',80,1],
  ['烏拉圭',80,0],['哥倫比亞',79,0],['摩洛哥',79,0],['丹麥',79,1],['日本',78,0],['塞內加爾',78,0],['瑞士',78,1],['奧地利',78,1],['美國',77,0],['墨西哥',77,0],
  ['土耳其',77,1],['波蘭',77,1],['塞爾維亞',77,1],['象牙海岸',77,0],['厄瓜多爾',76,0],['尼日利亞',76,0],['南韓',75,0],['阿爾及利亞',75,0],['蘇格蘭',74,1],['加拿大',74,0],
  ['埃及',74,0],['加納',74,0],['喀麥隆',74,0],['澳洲',73,0],['威爾斯',73,1],['捷克',75,1],['挪威',77,1],['烏克蘭',76,1],['愛爾蘭',72,1],['北愛爾蘭',68,1],['匈牙利',74,1],['伊朗',72,0],['沙地阿拉伯',70,0],['卡塔爾',68,0]]
  .map(([n,s,eu]) => ({ n, s, eu:!!eu }));
const intlStr = () => S.nt==='HER' ? [87,83,79,75,71,67][HERITAGE[S.heritage].tier ?? 3] : 85;
function tourney(team, role, next){
  const yr = S.year+1; if(yr%2){ next(); return; }
  const euro = yr%4===0, name = euro ? '歐洲國家盃' : '世界盃', ts = intlStr();
  const me = NATIONS.find(x => x.n===team), isEu = team==='英格蘭' || (me ? me.eu : false);
  if(euro && !isEu){ next(); return; }
  const qual = team==='英格蘭' ? 97 : [95,92,80,55,40,25][HERITAGE[S.heritage].tier ?? 3];
  if(!chance(qual)){ UI.card('bad', `${yr} ${name}外圍賽`, `${team}在外圍賽出局，無緣${yr} 年${name}。`); logLine(`${yr} ${name}：${team}外圍賽出局`); next(); return; }
  const pool = NATIONS.filter(x => x.n!==team && (!euro || x.eu));
  const pickIn = (lo, hi, used) => { const c = pool.filter(x => x.s>=lo && x.s<=hi && !used.includes(x)); return c.length ? pick(c) : pick(pool.filter(x => !used.includes(x))); };
  const grp = []; grp.push(pickIn(80, 88, grp)); grp.push(pickIn(74, 80, grp)); grp.push(pickIn(66, 75, grp));
  const T = { g:0, a:0, app:0, rt:0 };
  const roleN = ['正選','輪換球員','後備'][role];
  UI.card('gold', `${yr} ${name}`, `${team}公布大賽名單，你榜上有名，預計擔任<b>${roleN}</b>。<br>分組賽對手：${grp.map(x=>x.n).join('、')}。`);
  /* 一場比賽：視乎角色決定是否上陣 */
  const game = (o, tag, ko, done) => {
    const play = role===0 || (role===1 ? chance(70) : chance(40)), sub = role===2 || (role===1 && chance(35));
    UI.newPage(`${yr} ${name}・${tag}`);
    if(!play){ const gf = poisson(clamp(1.35+(ts-o.s)*0.07,0.3,3)), ga = poisson(clamp(1.3-(ts-o.s)*0.07,0.3,3));
      UI.card('', `${tag}：${team} ${gf}–${ga} ${o.n}`, `你整場坐在後備席上。`); done({ gf, ga, played:false }); return; }
    playMatch({ tag:`${name}・${tag}`, home:team, opp:o.n, lvl:o.s-3, diff:ts-o.s, stake:ko?3:2, youth:false, n:sub?1:(ko?3:2), sub, intl:true },
      r => { T.app++; T.g += r.g; T.a += r.a; T.rt += r.rt; done({ ...r, played:true }); });
  };
  /* 分組賽 */
  const tab = [{ n:team, s:ts, me:true }, ...grp].map(x => ({ ...x, p:0, gd:0, gf:0 }));
  const add = (a, b, ga, gb) => { a.gf += ga; b.gf += gb; a.gd += ga-gb; b.gd += gb-ga; if(ga>gb) a.p += 3; else if(gb>ga) b.p += 3; else { a.p++; b.p++; } };
  const others = [[1,2],[1,3],[2,3]];
  let gi = 0;
  const groupStep = () => {
    if(gi>=3) return groupEnd();
    const o = tab[gi+1], [x,y] = others[gi];
    game(o, `分組賽第 ${gi+1} 場`, false, r => { add(tab[0], o, r.gf, r.ga);
      const a = tab[x], b = tab[y]; add(a, b, poisson(clamp(1.3+(a.s-b.s)*0.07,0.3,3)), poisson(clamp(1.3-(a.s-b.s)*0.07,0.3,3)));
      gi++; groupStep(); });
  };
  const groupEnd = () => {
    const rk = tab.slice().sort((a,b) => b.p-a.p || b.gd-a.gd || b.gf-a.gf || R()-0.5), pos = rk.findIndex(x => x.me)+1;
    UI.newPage(`${yr} ${name}・分組賽結束`);
    UI.card(pos<=2 ? 'good' : pos===3 && tab[0].p>=4 ? '' : 'bad', '分組賽排名', `<div class="lt"><table><thead><tr><th></th><th>球隊</th><th>得失</th><th>分</th></tr></thead><tbody>${rk.map((x,i) => `<tr class="${x.me?'me':''}"><td>${i+1}</td><td>${x.n}</td><td>${x.gd>0?'+':''}${x.gd}</td><td><b>${x.p}</b></td></tr>`).join('')}</tbody></table></div>`);
    if(pos<=2 || (pos===3 && tab[0].p>=4)) ko(0); else finish('分組賽出局');
  };
  /* 淘汰賽：打和便加時，再和便互射十二碼 */
  const KO = [['16 強',[74,84]],['8 強',[78,86]],['4 強',[80,88]],['決賽',[81,88]]], used = [...grp];
  const ko = i => {
    if(i>=KO.length) return finish('冠軍');
    const [rn, [lo,hi]] = KO[i], o = pickIn(lo, hi, used); used.push(o);
    if(i===2) UI.card('event', '四強', `全國都在談論${team}。街頭酒吧掛滿國旗，你的家人也飛來觀戰。`);
    if(i===3) UI.card('event', '決賽前夜', `${name}決賽。對手是${o.n}。你躺在酒店房間，想起六歲那年在公園第一次踢波的下午。`);
    game(o, rn==='決賽' ? '決賽' : `${rn}淘汰賽`, true, r => {
      const go = win => { if(win){ UI.card('good', `${team}晉級`, rn==='決賽' ? '' : `${team}淘汰${o.n}。`); ko(i+1); } else finish(rn==='決賽' ? '亞軍' : rn); };
      if(r.gf!==r.ga){ go(r.gf>r.ga); return; }
      if(chance(35)){ const w = chance(clamp(50 + (ts-o.s)*3, 20, 80)); UI.card(w?'good':'bad', '加時賽', w ? `第 ${ri(95,119)} 分鐘，${team}攻入致勝一球！` : `第 ${ri(95,119)} 分鐘，${o.n}在加時階段絕殺。`); go(w); return; }
      UI.card('event', '加時賽', '加時 30 分鐘雙方都沒有再入球。比賽要以互射十二碼決勝。');
      shootout(team, o.n, ts-o.s, r.played, go);
    });
  };
  const finish = res => {
    UI.newPage(`${yr} ${name}・總結`);
    addHonour(`${yr} ${name}（${res}）`, { intl:true, win:res==='冠軍' });
    logLine(`${yr} ${name}：${res}`);
    const avg = T.app ? T.rt/T.app : 0;
    if(T.g>=5){ addHonour(`${yr} ${name}金靴`, { intl:true }); logLine(`${yr} ${name}金靴（${T.g} 球）`); }
    if(['冠軍','亞軍'].includes(res) && avg>=7.6 && T.app>=5) addHonour(`${yr} ${name}最佳球員`, { intl:true });
    const t = fx(res==='冠軍' ? { fans:15, conf:10, love:5 } : res==='分組賽出局' ? { fans:-3, conf:-3 } : { fans:['亞軍','4 強'].includes(res)?6:2 });
    UI.card(res==='冠軍'?'gold':res==='分組賽出局'?'bad':'', `${yr} ${name}：${res}`,
      `${res==='冠軍' ? `${team}奪得${name}！全國如同放假一樣歡騰，你捧起獎盃的照片登上了每一份報章的頭版。` : res==='分組賽出局' ? `${team}在分組賽出局，傳媒的批評鋪天蓋地。` : `${team}在${name}止步${res}。`}
      <div class="statline"><span><b>${T.app}</b>出場</span><span><b>${T.g}</b>入球</span><span><b>${T.a}</b>助攻</span><span><b>${T.app?avg.toFixed(2):'—'}</b>平均評分</span></div>${t?`<div class="fx">${t}</div>`:''}`);
    if(T.g>=5) UI.card('gold', `${name}金靴`, `你在${name}攻入 ${T.g} 球，成為大賽神射手。`);
    next();
  };
  groupStep();
}
/* 互射十二碼：你負責第四球（門將則負責撲第四球） */
function shootout(team, opp, diff, onPitch, done){
  const mp = 0.76 + diff*0.004, op = 0.76 - diff*0.004, A = [], B = [], k = p => R() < p;
  for(let i=0;i<3;i++){ A.push(k(mp)); B.push(k(op)); }
  const sum = a => a.filter(Boolean).length, dots = a => a.map(x => x ? '●' : '○').join(' ');
  const board = () => `<div class="pens"><span>${team}</span><b>${dots(A)}</b><span>${opp}</span><b>${dots(B)}</b></div>`;
  const rest = mine => {
    if(S.pos==='GK'){ B.push(!mine); A.push(k(mp)); } else { A.push(mine); B.push(k(op)); }
    for(let i=4; i<5; i++){ A.push(k(mp)); B.push(k(op)); }
    let n = 0; while(sum(A)===sum(B) && n<12){ A.push(k(mp)); B.push(k(op)); n++; if(A.at(-1)!==B.at(-1)) break; }
    if(sum(A)===sum(B)) A[A.length-1] = !B.at(-1);
    const win = sum(A) > sum(B);
    UI.card(win?'gold':'bad', win ? `${team}互射十二碼勝出` : `${team}互射十二碼落敗`, `${board()}<p>${sum(A)}–${sum(B)}</p>`);
    done(win);
  };
  if(!onPitch){ UI.card('event', '互射十二碼', `你在場邊與隊友手牽手觀看。首三輪過後 ${sum(A)}–${sum(B)}。${board()}`); rest(k(S.pos==='GK'?0.24:mp)); return; }
  UI.card('event', '互射十二碼', `首三輪過後 ${sum(A)}–${sum(B)}。${board()}${S.pos==='GK' ? `${opp}第四名球員把皮球放在十二碼點上。你站在龍門線上，全場九萬人屏息靜氣。` : '主帥指着你：「第四球，你來。」你由中圈慢慢走向十二碼點。'}`);
  const conf = (S.m.conf-50)*0.002, calm = ((S.pers.calm||3)-3)*0.03, odds = SET.odds!==false;
  const opts = S.pos==='GK'
    ? [['撲向左邊', 0.24 + (eff('sho')-60)*0.003], ['撲向右邊', 0.24 + (eff('sho')-60)*0.003], ['企定中間', 0.17 + (eff('tec')-60)*0.002 + calm]]
    : [['射向左下角（穩陣）', 0.80 + (eff('sho')-60)*0.003 + conf + calm], ['大力射向右上角（冒險）', 0.70 + (eff('sho')-60)*0.007 + conf], ['輕挑射向中路（招牌）', 0.64 + (S.m.conf-50)*0.006 + calm*1.5]];
  UI.choose(S.pos==='GK' ? '撲向哪一邊？' : '射向哪裏？', opts.map(([t, p], i) => { p = clamp(p, 0.05, 0.95);
    return { t, s: odds ? `${S.pos==='GK'?'撲出機會':'成功率'} ${Math.round(p*100)}%` : '', pct: odds ? Math.round(p*100) : null, f:() => {
      const ok = R() < p;
      if(S.pos==='GK') UI.card(ok?'good':'bad', ok?'撲出十二碼！':'被射入', ok ? '你撲中方向，用指尖把皮球托出！' : '對方把皮球射進另一邊。');
      else { UI.card(ok?'good':'bad', ok?'射入！':'射失！', ok ? (i===2 ? '你輕輕一挑，皮球緩緩飛入網窩，門將早已撲向一邊！' : '皮球應聲入網，你向看台握拳怒吼。') : (i===1 ? '皮球高出橫樑。你雙手掩面。' : '門將撲中方向，把你的射門擋出。'));
        if(ok && i===2) fx({ fans:6 }); }
      if(ok){ S.flags.penHero = 1; pst().sp++; }
      rest(S.pos==='GK' ? ok : ok); } }; }));
}

/* ---------- 轉會市場 ---------- */
function marketValue(){
  const o = ovr(), a = S.age, af = a<=21?1.4 : a<=24?1.3 : a<=27?1.1 : a<=30?0.8 : a<=32?0.5 : 0.3;
  let v = 1e6 * Math.exp((o-60)*0.15) * af * (S.pro && S.pro.cyrs<=1 ? 0.65 : 1) * (S.pos==='GK'?0.7:1);
  v = v>=1e6 ? Math.round(v/1e5)*1e5 : Math.max(10000, Math.round(v/5e3)*5e3);
  return v;
}
/* 有興趣的球會（不使用隨機數，避免影響存檔的隨機序列） */
function interestList(){
  if(!S.pro) return [];
  const o = ovr(), lvNow = LG[club(curClub()).lg].lvl, hs = s => { let h = 2166136261; for(const ch of s){ h ^= ch.charCodeAt(0); h = Math.imul(h,16777619); } return (h>>>0)%1000/1000; };
  const ss = S.ss && S.ss.app ? S.ss.rt/S.ss.app : S.pro.lastRt || 6.6, form = (ss-6.6)*12 + (S.m.fans-40)*0.2 + (S.pro.listed===S.year?12:0) + (S.agent?6:0);
  return Object.values(S.W.clubs).filter(x => x.id!==S.pro.club && x.id!==curClub() && x.lg!=='NON' && !LG[x.lg].pool && (isEngClub(x) || (S.age>=18 && !S.pro.semi)) && LG[x.lg].lvl >= lvNow-2 && o >= x.str-4 && x.str >= Math.min(o, club(curClub()).str) - (S.pro.listed===S.year ? 8 : 3))
    .map(x => ({ x, sc: -Math.abs(x.str - o - 1) + hs(`${S.year}${x.id}`)*6 }))
    .sort((a,b) => b.sc-a.sc).slice(0,5)
    .map(({x}, i) => { const lv = form - i*6 + hs(`${S.year}${S.term}${x.id}`)*20; return { c:x, lv: lv>=18?2 : lv>=4?1 : 0 }; });
}
/* 主動要求續約 */
function askRenew(){
  if(!S.pro || S.pro.loan || S.pro.semi || S.pro.renewAsk===S.year) return null;
  S.pro.renewAsk = S.year;
  const rc = roleCalc(), cur = club(S.pro.club);
  if(S.pro.trust>=60 && rc.r<=1){ const w = Math.max(S.pro.wage, wageFor(cur.id)), yrs = S.age>=31 ? 2 : ri(3,5);
    S.pro.wage = Math.round(w*1.05/50)*50; S.pro.cyrs = yrs; logLine(`${S.age} 歲與${cur.n}續約 ${yrs} 年`); fx({ conf:3 });
    return { ok:true, t:`${cur.n}與你續約 ${yrs} 年，週薪 ${money(S.pro.wage)}。` }; }
  fx({ trust:-1 });
  return { ok:false, t: rc.r>1 ? '主帥表示：「先爭取正選位置，再談新合約。」' : '球會表示要先觀察你今季的表現，夏天再談。' };
}
function requestTransfer(){ if(!S.pro || S.pro.loan || S.pro.listed===S.year) return; S.pro.listed = S.year; fx({ trust:-8, fans:-3, mates:-2 }); logLine(`${S.age} 歲向${cName(S.pro.club)}提出轉會要求`); }
