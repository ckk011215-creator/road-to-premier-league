/* ================= 歐洲及世界球會賽事 =================
   歐聯、歐霸、歐協聯：聯賽階段（36 隊、每隊 8 或 6 場）→ 附加賽 → 十六強 → 八強 → 四強（兩回合）→ 決賽（單場）。
   另有歐洲超級盃（季前）、洲際盃（12 月）及每四年一屆的世冠盃（夏天）。
   五大聯賽以外的球會不作本地模擬，只以實力數值參賽。 */
const EXT_EU = [['XBEN','本菲加',77],['XPOR','波圖',76],['XSCP','士砵亭',76],['XPSV','燕豪芬',76],['XAJA','阿積士',74],['XFEY','飛燕諾',74],
  ['XGAL','加拉塔沙雷',74],['XFEN','費倫巴治',73],['XBRU','布魯日',73],['XCEL','些路迪',72],['XSAL','薩爾斯堡',72],['XSHA','薩克達',71],
  ['XBRA','布拉加',71],['XRAN','格拉斯哥流浪',70],['XOLY','奧林比亞高斯',70],['XAZ','阿爾克馬爾',70],['XUNI','聖吉爾斯聯',70],['XDZG','薩格勒布戴拿模',69],
  ['XCZV','貝爾格萊德紅星',69],['XSPA','布拉格斯巴達',69],['XSLA','布拉格斯拉維亞',69],['XAND','安德列治',69],['XBOD','波杜基林特',69],['XFCK','哥本哈根',68],
  ['XMID','中日德蘭',68],['XPAO','帕奧克',68],['XGNK','根特',68],['XYB','年青人',67],['XBAS','巴塞爾',67],['XFTC','費倫斯華路士',66],
  ['XLEG','華沙利亞',66],['XSTU','格拉茨',66],['XQAR','卡拉巴克',66],['XMAL','馬模',65],['XAPO','阿普爾',64],['XLUD','盧多格德斯',63]];
const EXT_WORLD = [['WFLA','弗林明高',74],['WPAL','巴爾梅拉斯',74],['WHIL','阿希拉爾',72],['WRIV','河床',72],['WBOC','博卡青年',71],['WBOT','博塔弗戈',70],
  ['WFLU','富明尼斯',69],['WAHL','阿赫利',68],['WMON','蒙特雷',68],['WMIA','邁阿密國際',67],['WMAM','馬梅洛迪日落',66],['WURA','浦和紅鑽',65],
  ['WAIN','艾恩',64],['WULS','蔚山現代',64],['WJEO','全北現代',64],['WSEA','西雅圖海灣者',64],['WEST','突尼斯希望',63],['WPAC','柏捷卡',60],['WAUC','奧克蘭城',50]];
const EXT_CLUBS = Object.fromEntries([...EXT_EU, ...EXT_WORLD].map(([id, n, str]) => [id, { id, n, str, lg:'EXT', ext:true }]));
/* 任何球會（包括不作本地模擬的球會） */
const anyClub = id => (S && S.W && S.W.clubs[id]) || EXT_CLUBS[id] || null;
const ctyOf = c => !c ? null : c.ext ? 'EXT' : (LG[c.lg] && LG[c.lg].cty) || 'EN';

const EURO = {
  ucl:  { n:'歐聯', md:8, slots:{ PL:4, ES:4, IT:4, DE:4, FR:3 }, extTop:true, gold:8, ven:['布達佩斯普斯卡什球場','馬德里大都會球場','溫布萊','慕尼黑安聯球場','伊斯坦堡奧林匹克球場','法蘭西球場'] },
  uel:  { n:'歐霸', md:8, slots:{ PL:2, ES:2, IT:2, DE:2, FR:2 }, gold:7, ven:['畢爾包聖馬美斯球場','伊斯坦堡比錫達斯球場','都柏林球場','塞維爾球場'] },
  uecl: { n:'歐協聯', md:6, slots:{ PL:1, ES:1, IT:1, DE:1, FR:1 }, gold:6, ven:['萊比錫球場','布拉格伊甸球場','雅典奧林匹克球場','華沙國家球場'] }
};
const EU_KEYS = ['ucl','uel','uecl'];
const KO_ST = ['playoff','r16','qf','sf','final'];
const KO_N = { playoff:'淘汰賽附加賽', r16:'十六強', qf:'八強', sf:'四強', final:'決賽' };
const EU_WK = {
  lg8: [[1,3],[1,6],[1,9],[1,12],[1,15],[1,18],[2,2],[2,4]], lg6: [[1,3],[1,6],[1,9],[1,12],[1,15],[1,18]],
  playoff: [[2,6],[2,7]], r16: [[2,9],[2,10]], qf: [[2,12],[2,13]], sf: [[2,15],[2,16]], final: [[2,19]]
};
const EU_LGS = ['PL','ES','IT','DE','FR'];

/* ---------- 參賽資格 ---------- */
/* 季尾按聯賽排名、盃賽冠軍及歐聯冠軍決定下季參賽球會 */
function euroQualify(T){
  const q = { y:S.year+1, ucl:[], uel:[], uecl:[] }, used = new Set();
  const put = (k, id) => { if(id && !used.has(id) && anyClub(id)){ q[k].push(id); used.add(id); } };
  const lw = S.euWin && S.euWin.y===S.year ? S.euWin : null;
  if(lw){ put('ucl', lw.ucl); put('ucl', lw.uel); }
  EU_LGS.forEach(lg => { const ids = (T[lg] || []).map(x => x[0]); let i = 0;
    EU_KEYS.forEach(k => { for(let n=0; n<EURO[k].slots[lg]; n++){ while(i < ids.length && used.has(ids[i])) i++; put(k, ids[i]); i++; } }); });
  const cw = S.cupWin || {};
  put('uel', cw.fa); put('uecl', cw.lc); ['es','it','de','fr'].forEach(k => put('uel', cw[k]));
  S.euQ = q;
}
/* 舊存檔或第一個職業賽季：沒有上季排名時，按球會實力推算 */
function euroQualifyByStrength(){
  const T = {}; EU_LGS.forEach(lg => { T[lg] = clubsIn(lg).slice().sort((a,b) => b.str-a.str).map(c => [c.id, 0]); });
  const keep = S.euWin; S.euWin = null; euroQualify(T); S.euWin = keep; S.euQ.y = S.year;
}
/* 該項賽事的全部參賽者（本地模擬球會不足 36 隊時，以其他歐洲球會補足） */
function euroField(k){
  const q = S.euQ || {}, mine = (q[k] || []).slice(), ext = EXT_EU.map(x => x[0]);
  const need = 36 - mine.length;
  const pool = k==='ucl' ? ext.slice(0, need+4) : k==='uel' ? ext.slice(6, 6+need+6) : ext.slice(14);
  return [...mine, ...shuffle(pool.slice()).slice(0, Math.max(0, need))];
}

/* ---------- 季前：抽籤 ---------- */
function euroInit(){
  if(!S.pro || S.pro.semi) { S.eu = null; return; }
  if(!S.euQ || S.euQ.y!==S.year) euroQualifyByStrength();
  const me = curClub(), k = EU_KEYS.find(x => (S.euQ[x] || []).includes(me));
  if(!k){ S.eu = null; return; }
  const field = euroField(k), my = anyClub(me), cty = ctyOf(my);
  const others = field.filter(id => id!==me && ctyOf(anyClub(id))!==cty).map(id => anyClub(id)).sort((a,b) => b.str-a.str);
  const md = EURO[k].md, per = md/4, pots = [0,1,2,3].map(p => others.slice(Math.floor(p*others.length/4), Math.floor((p+1)*others.length/4)));
  let opps = shuffle(pots.flatMap(pt => shuffle(pt.slice()).slice(0, Math.ceil(per))).map(c => c.id)).slice(0, md);
  for(const c of shuffle(others.slice())){ if(opps.length >= md) break; if(!opps.includes(c.id)) opps.push(c.id); }
  S.eu = { y:S.year, comp:k, club:me, field, opps, md:0, pts:0, gf:0, ga:0, w:0, d:0, l:0, out:false, won:false, ko:null, g:0, a:0, app:0 };
}
const euroOn = () => !!(S.eu && S.eu.y===S.year && !S.eu.out && !S.eu.won);
/* 學期日程：聯賽階段及淘汰賽（淘汰賽日程先排好，出局後刪除） */
function euroSlots(term){
  const E = S.eu, out = [];
  if(term===1 && S.pro && S.euWin && S.euWin.y===S.year-1 && S.euWin.ucl===curClub() && !(E && E.y===S.year && E.icc)) out.push({ k:'euro', wk:17, ph:'icc' });
  if(!E || E.y!==S.year || E.out || E.won || !E.comp) return out;
  const md = EURO[E.comp].md;
  (md===8 ? EU_WK.lg8 : EU_WK.lg6).forEach(([t, wk], i) => { if(t===term && i>=E.md) out.push({ k:'euro', wk, ph:'lg', i }); });
  if(term===2) KO_ST.forEach(st => EU_WK[st].forEach(([, wk], j) => out.push({ k:'euro', wk, ph:'ko', st, leg: st==='final' ? 0 : j+1 })));
  return out;
}
function euroOut(){ S.eu.out = true; if(S.cal) S.cal = S.cal.filter((s,i) => i<=S.ci || s.k!=='euro' || s.ph==='icc'); }

/* ---------- 比賽 ---------- */
/* 按角色決定是否上陣（與國內盃賽相同）；cb({ gf, ga, played, sim }) */
function euroMatch(o, tag, opt, cb){
  const c = club(curClub()), se = S.season || {}, lg = LG[c.lg];
  let n = 2, sub = false, plays = true;
  if(injSev()==='major') plays = false;
  else if(se.dev) plays = false;
  else if(se.r===0) n = opt.final ? 3 : chance(50) ? 3 : 2;
  else if(se.r===1){ n = 2; plays = chance(80); }
  else if(se.r===2){ n = 1; sub = true; plays = chance(65); }
  else plays = chance(10);
  const venue = opt.neutral ? 0 : opt.home ? 1 : -1, diff = c.str - o.str + venue;
  if(!plays){
    const gf = poisson(clamp(1.35 + diff*0.06, 0.35, 3.2)), ga = poisson(clamp(1.3 - diff*0.06, 0.3, 3.2));
    UI.card('', `${tag}：${c.n} ${gf}–${ga} ${o.n}`, injSev()==='major' ? '你仍在養傷，只能在看台觀戰。' : se.dev ? '你仍在預備組，沒有入選歐洲賽名單。' : '你今場沒有上陣。');
    cb({ gf, ga, played:false, sim:true }); return;
  }
  playMatch({ tag, hc:c.id, oc:o.ext ? null : o.id, home:c.n, opp:o.n, lvl:(o.str + Math.max(lg.par, 66))/2 + 1, diff, stake: opt.final ? 3 : 2, youth:false, n, sub, cup:true, euro:true },
    r => { const E = S.eu; if(E && E.y===S.year){ E.app++; E.g += r.g; E.a += r.a; } pst().eu = (pst().eu||0) + 1; cb({ ...r, played:true }); });
}
/* 打和時：加時或互射十二碼 */
function euroDecider(c, o, onPitch, done){
  if(chance(40)){ const w = chance(clamp(50 + (c.str-o.str)*3, 15, 85)); UI.card(w?'good':'bad', '加時賽', w ? `第 ${ri(95,119)} 分鐘，${c.n}攻入致勝一球！` : `第 ${ri(95,119)} 分鐘，${o.n}在加時階段絕殺。`); done(w); return; }
  UI.card('event', '加時賽', '加時 30 分鐘雙方都沒有再入球，要以互射十二碼決勝。');
  shootout(c.n, o.n, c.str-o.str, onPitch, done);
}
function euroRun(sl, next){
  const E = S.eu;
  if(sl.ph==='icc'){ intercontinental(next); return; }
  if(!E || E.y!==S.year || E.out || E.won){ next(); return; }
  const cu = EURO[E.comp], c = club(curClub());
  if(curClub()!==E.club){ UI.card('', cu.n, `你本季已轉投其他球會，不能再為${cName(E.club)}出戰${cu.n}。`); euroOut(); next(); return; }
  if(sl.ph==='lg'){
    if(sl.i!==E.md){ next(); return; }
    const o = anyClub(E.opps[sl.i]), home = sl.i%2===0;
    euroMatch(o, `${cu.n}・聯賽階段第 ${sl.i+1} 輪${home?'（主場）':'（作客）'}`, { home }, r => {
      E.md++; E.gf += r.gf; E.ga += r.ga; if(r.gf>r.ga){ E.w++; E.pts += 3; } else if(r.gf===r.ga){ E.d++; E.pts++; } else E.l++;
      if(E.md >= cu.md) euroLeagueEnd(next); else next(); });
    return;
  }
  if(!E.ko || sl.st!==E.ko.st){ next(); return; }
  const K = E.ko, o = anyClub(K.opp);
  if(sl.st==='final'){
    const ven = pick(cu.ven);
    UI.card('event', `${cu.n}決賽`, `${ven}，全場座無虛席。${c.n}對${o.n}。歐洲的目光都在這裏。你在通道裏與對方球員並排站着，聽到${cu.n}主題曲響起。`);
    euroMatch(o, `${cu.n}決賽`, { neutral:true, final:true, ko:true }, r => {
      const fin = win => { if(win) euroChamp(next); else { UI.card('bad', `${cu.n}決賽落敗`, `${c.n}在決賽不敵${o.n}，與冠軍擦身而過。`); addHonour(`${cu.n}亞軍`, { club:c.id }); E.out = true; next(); } };
      if(r.gf!==r.ga){ fin(r.gf>r.ga); return; } euroDecider(c, o, r.played, fin); });
    return;
  }
  if(sl.leg===1){
    euroMatch(o, `${cu.n}${KO_N[sl.st]}・首回合`, { home:K.home1, ko:true }, r => { K.l1 = { gf:r.gf, ga:r.ga }; UI.card('', '首回合結束', `${c.n} ${r.gf}–${r.ga} ${o.n}。次回合${K.home1?'作客':'回到主場'}。`); next(); });
    return;
  }
  euroMatch(o, `${cu.n}${KO_N[sl.st]}・次回合`, { home:!K.home1, ko:true }, r => {
    const gf = K.l1.gf + r.gf, ga = K.l1.ga + r.ga;
    const res = win => { if(win){ UI.card('good', `${cu.n}晉級`, `兩回合總比分 ${gf}–${ga}，${c.n}淘汰${o.n}。`); euroNext(next); } else { UI.card('bad', `${cu.n}出局`, `兩回合總比分 ${gf}–${ga}，${c.n}被${o.n}淘汰。`); euroOut(); next(); } };
    if(gf!==ga){ res(gf>ga); return; }
    UI.card('event', '總比分打和', `兩回合總比分 ${gf}–${ga}。`); euroDecider(c, o, r.played, res); });
}
/* 聯賽階段結束：模擬其他球隊積分，計算排名 */
function euroLeagueEnd(next){
  const E = S.eu, cu = EURO[E.comp], others = E.field.filter(id => id!==E.club).map(id => anyClub(id));
  const avg = others.reduce((s,c) => s + c.str, 0) / Math.max(1, others.length);
  const tab = others.map(c => { let p = 0, gd = 0; for(let i=0;i<cu.md;i++){ const d = c.str - (avg + N0(4)), a = poisson(clamp(1.35 + d*0.06, 0.3, 3.2)), b = poisson(clamp(1.3 - d*0.06, 0.3, 3.2)); p += a>b?3:a===b?1:0; gd += a-b; } return { id:c.id, p, gd }; });
  tab.push({ id:E.club, p:E.pts, gd:E.gf-E.ga, me:true });
  tab.sort((a,b) => b.p-a.p || b.gd-a.gd || R()-0.5);
  const pos = tab.findIndex(x => x.me) + 1; E.pos = pos;
  const top = tab.slice(0, 8).map((x,i) => `${i+1}. ${esc(x.me ? cName(E.club) : anyClub(x.id).n)} ${x.p} 分`).join('<br>');
  UI.card(pos<=8 ? 'gold' : pos<=24 ? 'good' : 'bad', `${cu.n}聯賽階段結束`, `${cName(E.club)}以 ${E.w} 勝 ${E.d} 和 ${E.l} 負、${E.pts} 分排名第 <b>${pos}</b>（共 36 隊）。<br>${pos<=8 ? '直接晉身十六強！' : pos<=24 ? '要踢淘汰賽附加賽。' : '排名第 25 或以下，出局。'}<div class="hint">${top}</div>`);
  if(pos>24){ euroOut(); next(); return; }
  if(pos<=8 && S.cal) S.cal = S.cal.filter((s,i) => i<=S.ci || !(s.k==='euro' && s.st==='playoff'));
  E.alive = tab.filter((x,i) => !x.me && i<24).map(x => x.id);
  euroSetKO(pos<=8 ? 'r16' : 'playoff');
  next();
}
function euroSetKO(st){
  const E = S.eu, f = KO_ST.indexOf(st)/4, alive = (E.alive || E.field).filter(id => id!==E.club);
  const opp = wpick(alive.map(id => anyClub(id)), c => Math.pow(Math.max(1, c.str-50), 1 + f*4)) || anyClub(pick(alive));
  E.ko = { st, opp:opp.id, home1:chance(50) };
  E.alive = alive.filter(id => id!==opp.id);
  if(st!=='playoff') UI.card('event', `${EURO[E.comp].n}${KO_N[st]}抽籤`, `對手：<b>${esc(opp.n)}</b>（實力 ${Math.round(opp.str)}）。${st==='final' ? '' : `首回合${E.ko.home1?'在主場':'作客'}進行。`}`);
  else UI.card('event', `${EURO[E.comp].n}附加賽抽籤`, `對手：<b>${esc(opp.n)}</b>（實力 ${Math.round(opp.str)}）。勝方晉身十六強。`);
}
function euroNext(next){ const E = S.eu, i = KO_ST.indexOf(E.ko.st); euroSetKO(KO_ST[i+1]); next(); }
function euroChamp(next){
  const E = S.eu, cu = EURO[E.comp], c = club(curClub()), se = S.season || {}, plays = !se.dev && se.r<=2;
  E.won = true;
  addHonour(`${cu.n}冠軍`, { club:c.id, role: plays ? (se.r ?? 2) : 3 });
  logLine(`${S.year+1} 年${cu.n}冠軍（${c.n}）`);
  const t = fx({ fans:12, love:5, conf:6 });
  UI.card('gold', `${cu.n}冠軍`, `${c.n}登上歐洲之巔！${plays ? '你高舉大耳獎盃的照片傳遍全世界。' : '雖然你上陣不多，仍然是冠軍隊伍的一分子。'}${t?`<div class="fx">${t}</div>`:''}`);
  next();
}

/* ---------- 季尾：冠軍、射手獎、下季資格 ---------- */
function euroSeasonEnd(T){
  const w = { y:S.year };
  EU_KEYS.forEach(k => {
    if(S.eu && S.eu.y===S.year && S.eu.comp===k && S.eu.won){ w[k] = S.eu.club; return; }
    const field = (S.euQ && S.euQ.y===S.year ? euroField(k) : []).filter(id => !(S.eu && S.eu.y===S.year && S.eu.comp===k && id===S.eu.club));
    const c = wpick(field.map(id => anyClub(id)).filter(Boolean), x => Math.pow(Math.max(1, x.str-55), 3));
    w[k] = c ? c.id : null;
  });
  S.euWin = w;
  S.euHist = (S.euHist || []).concat([{ y:S.year, ucl:w.ucl, uel:w.uel, uecl:w.uecl }]).slice(-40);
  const E = S.eu;
  if(E && E.y===S.year && E.app){
    UI.card('', `${EURO[E.comp].n}數據`, `本季${EURO[E.comp].n}出場 ${E.app} 次，入球 ${E.g}，助攻 ${E.a}。${E.pos ? `聯賽階段排名第 ${E.pos}。` : ''}`);
    if(E.g >= EURO[E.comp].gold && S.pos!=='GK'){ addHonour(`${EURO[E.comp].n}金靴`, {}); logLine(`${S.year+1} 年${EURO[E.comp].n}金靴（${E.g} 球）`); UI.card('gold', `${EURO[E.comp].n}金靴`, `你在${EURO[E.comp].n}攻入 ${E.g} 球，成為本屆神射手。`); }
  }
  euroQualify(T);
}
/* 年度世界最佳球員：頂級聯賽表現＋冠軍＋國際賽 */
function worldAward(row){
  if(!row || row.lg==='DEV' || !['PL',...LG_ABROAD].includes(row.lg) || row.app<25) return;
  const yr = S.year+1, hon = S.honours.filter(h => h.y===yr);
  let sc = (row.rt - 7.2)*10 + (hon.some(h => /^歐聯冠軍/.test(h.t)) ? 6 : 0) + (hon.some(h => /^(英超|西甲|意甲|德甲|法甲)冠軍/.test(h.t)) ? 3 : 0)
    + (hon.some(h => /(世界盃|歐洲國家盃)（冠軍）/.test(h.t)) ? 6 : 0) + (S.pos==='GK' ? -4 : 0) + Math.min(5, (row.g + row.a*0.5)/8);
  if(sc >= 8 && chance(clamp(30 + (sc-8)*12, 10, 90))){ addHonour(`${yr} 年度世界足球先生`, {}); logLine(`${yr} 年當選年度世界足球先生`); UI.card('gold', '年度世界足球先生', `你在頒獎禮上從傳奇球星手中接過獎座。全世界都知道你的名字。`); }
  else if(sc >= 5){ UI.card('', '年度世界足球先生', `你入圍了最後三十人名單，最終排名第 ${ri(4, 15)}。`); }
}

/* ---------- 歐洲超級盃（季前）、洲際盃（12 月） ---------- */
function superCup(next){
  const w = S.euWin; if(!S.pro || S.pro.semi || !w || w.y!==S.year-1 || (w.ucl!==curClub() && w.uel!==curClub()) || w.ucl===w.uel){ next(); return; }
  const c = club(curClub()), o = anyClub(w.ucl===c.id ? w.uel : w.ucl); if(!o){ next(); return; }
  UI.card('event', '歐洲超級盃', `上季歐聯冠軍對歐霸冠軍：${c.n}對${o.n}。新球季的第一個錦標就在眼前。`);
  euroMatch(o, '歐洲超級盃', { neutral:true, final:true }, r => {
    const fin = win => { if(win){ addHonour('歐洲超級盃冠軍', { club:c.id, role:(S.season||{}).r ?? 2 }); logLine(`${S.year} 年歐洲超級盃冠軍`); UI.card('gold', '歐洲超級盃冠軍', `${c.n}贏得歐洲超級盃。`); } else UI.card('bad', '歐洲超級盃', `${c.n}不敵${o.n}。`); next(); };
    if(r.gf!==r.ga){ fin(r.gf>r.ga); return; } shootoutOnly(c, o, r.played, fin); });
}
function shootoutOnly(c, o, onPitch, done){ UI.card('event', '互射十二碼', '九十分鐘打和，直接以互射十二碼決勝。'); shootout(c.n, o.n, c.str-o.str, onPitch, done); }
function intercontinental(next){
  if(!S.eu || S.eu.y!==S.year) S.eu = { y:S.year, out:true }; if(S.eu.icc){ next(); return; } S.eu.icc = true;
  const c = club(curClub()), o = anyClub(pick(['WFLA','WPAL','WRIV','WBOC','WHIL','WMON'].filter(id => EXT_CLUBS[id])));
  UI.card('event', '洲際盃決賽', `作為歐聯冠軍，${c.n}遠赴中東，與其他洲份的冠軍爭奪洲際盃。決賽對手是${o.n}。`);
  euroMatch(o, '洲際盃決賽', { neutral:true, final:true }, r => {
    const fin = win => { if(win){ addHonour('洲際盃冠軍', { club:c.id, role:(S.season||{}).r ?? 2 }); logLine(`${S.year} 年洲際盃冠軍`); UI.card('gold', '洲際盃冠軍', `${c.n}成為世界最佳球會。`); } else UI.card('bad', '洲際盃', `${c.n}在決賽不敵${o.n}。`); next(); };
    if(r.gf!==r.ga){ fin(r.gf>r.ga); return; } euroDecider(c, o, r.played, fin); });
}

/* ---------- 世冠盃（每四年一屆，夏天） ---------- */
function clubWorldCup(next){
  const yr = S.year+1; if(yr % 4 !== 1 || !S.pro || S.pro.semi || S.pro.loan){ next(); return; }
  const c = club(curClub()); if(!c || !['PL',...LG_ABROAD].includes(c.lg)){ next(); return; }
  const recent = (S.euHist || []).filter(h => h.y >= S.year-3).map(h => h.ucl);
  const elite = EU_LGS.flatMap(lg => clubsIn(lg)).sort((a,b) => b.str-a.str).slice(0, 10).map(x => x.id);
  if(!recent.includes(c.id) && !elite.includes(c.id)){ next(); return; }
  const se = S.season || {}, role = se.dev ? 3 : (se.r ?? 2);
  UI.newPage(`${yr} 世冠盃`);
  UI.card('gold', `${yr} 世冠盃`, `${c.n}獲邀參加四年一度的世冠盃，三十二支來自六大洲的球會爭奪世界冠軍。`);
  const world = shuffle(EXT_WORLD.map(x => anyClub(x[0])));
  const grp = [world[0], world[1], anyClub(pick(EXT_EU.slice(0, 12))[0])].filter(Boolean);
  let pts = 0, gd = 0, gi = 0;
  const game = (o, tag, ko, done) => {
    const play = injSev()!=='major' && (role===0 || (role===1 && chance(75)) || (role===2 && chance(40)));
    if(!play){ const d = c.str-o.str, gf = poisson(clamp(1.35+d*0.06,0.3,3.2)), ga = poisson(clamp(1.3-d*0.06,0.3,3.2)); UI.card('', `${tag}：${c.n} ${gf}–${ga} ${o.n}`, '你今場沒有上陣。'); done({ gf, ga, played:false }); return; }
    playMatch({ tag:`世冠盃・${tag}`, hc:c.id, oc:o.ext ? null : o.id, home:c.n, opp:o.n, lvl:(o.str+70)/2+1, diff:c.str-o.str, stake:2, youth:false, n:role===0?2:1, sub:role===2, cup:true, intl:true },
      r => done({ ...r, played:true }));
  };
  const finish = res => { addHonour(`${yr} 世冠盃（${res}）`, { club:c.id }); logLine(`${yr} 世冠盃：${res}`); if(res==='冠軍'){ addHonour('世冠盃冠軍', { club:c.id, role }); UI.card('gold', '世冠盃冠軍', `${c.n}成為世界冠軍球會！`); fx({ fans:10, conf:5 }); } next(); };
  const step = () => {
    if(gi >= grp.length){ const adv = pts>=6 || (pts>=4 && gd>=0) || (pts>=3 && chance(30)); UI.card(adv?'good':'bad', '分組賽結束', `${c.n}在分組賽取得 ${pts} 分。${adv?'晉身十六強！':'未能出線。'}`); if(adv) ko(0); else finish('分組賽出局'); return; }
    const o = grp[gi++]; game(o, `分組賽第 ${gi} 場`, false, r => { pts += r.gf>r.ga?3:r.gf===r.ga?1:0; gd += r.gf-r.ga; step(); });
  };
  const KO = ['十六強','八強','四強','決賽'];
  const ko = i => {
    if(i >= KO.length){ finish('冠軍'); return; }
    const pool = i>=2 ? EU_LGS.flatMap(lg => clubsIn(lg)).filter(x => x.id!==c.id && x.str>=78) : world.slice(2);
    const o = (i>=2 ? wpick(pool, x => x.str) : pick(pool)) || pick(world);
    game(o, KO[i], true, r => { const go = win => { if(win){ UI.card('good', '世冠盃晉級', `${c.n}淘汰${o.n}。`); ko(i+1); } else finish(KO[i]==='決賽' ? '亞軍' : KO[i]); };
      if(r.gf!==r.ga){ go(r.gf>r.ga); return; } euroDecider(c, o, r.played, go); });
  };
  step();
}
