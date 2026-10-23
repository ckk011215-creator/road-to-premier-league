/* ================= 海外生涯：報價、搬家、語言與適應、降班條款 =================
   S.abroad = { cty, adapt, fam, y, n, tutor, first }；S.langs[國家] = 語言程度（0–100，離開後保留） */
const abroadCty = () => S.abroad ? S.abroad.cty : null;
const isAbroad = () => !!(S.pro && S.abroad && isAbroadLg(curLg()));
const langOf = cty => Math.round((S.langs && S.langs[cty]) || 0);
/* 適應不足會令主帥較少起用你（最多 −1.5） */
function abroadPen(){
  if(!isAbroad()) return 0;
  const a = S.abroad, l = langOf(a.cty);
  return clamp((50 - (a.adapt*0.6 + l*0.4)) / 14, 0, 1.5);
}
const adaptN = v => v>=80 ? '如魚得水' : v>=60 ? '漸入佳境' : v>=40 ? '仍在適應' : '水土不服';

/* ---------- 夏季轉會窗：海外報價 ---------- */
function abroadOffers(){
  if(!S.pro || S.pro.semi || S.age<18 || S.age>33 || (!isAbroad() && (LG[curLg()].lvl > 4 || lvStart() > 4 || S.pro.wasNL))) return [];
  const o = ovr(), rt = S.pro.lastRt || 6.6, wish = S.flags.abroadWish===S.year, cur = club(S.pro.club);
  let n = 0;
  if(wish) n += rt>=6.8 ? ri(1,2) : (chance(50) ? 1 : 0);
  if(chance(clamp(4 + (rt-6.9)*35 + (o-68)*1.2 + (isAbroad() ? 15 : 0), 0, 40))) n++;
  if(!n) return [];
  const cands = Object.values(S.W.clubs).filter(x => LG_ABROAD.includes(x.lg) && x.id!==cur.id && x.str >= LG[x.lg].par-3 && o >= x.str-3 && x.str >= Math.min(o, cur.str)-6
    && (x.str<78 || (o >= x.str-1 && rt>=7.2)));
  const out = [];
  for(let i=0; i<n*6 && out.length<n; i++){ const x = wpick(cands, c => Math.pow(Math.max(1, c.str-45), 2)); if(x && !out.includes(x)) out.push(x); }
  return out;
}
/* 簽約後：出國、轉往另一個國家或回流英格蘭 */
function abroadAfterSign(x, next){
  const go = isAbroadLg(x.lg), was = !!S.abroad;
  S.langs = S.langs || {};
  if(!go){
    if(was){ const yrs = Math.max(1, S.year - S.abroad.y), from = CTY[S.abroad.cty].n; logLine(`${S.age} 歲回流英格蘭，加盟${x.n}`); S.flags.returned = 1; S.flags.retY = S.year; S.abroad = null;
      UI.card('good', '回到英格蘭', `在${from}度過 ${yrs} 年之後，你重新聽到熟悉的口音、吃到熟悉的炸魚薯條。英格蘭球迷都在等着看你學到了甚麼。`); }
    next(); return;
  }
  const cty = LG[x.lg].cty, same = was && S.abroad.cty===cty;
  S.flags.wentAbroad = 1; S.flags.lastCty = cty;
  S.flags.ctys = Array.from(new Set([...(S.flags.ctys || []), cty]));
  S.langs[cty] = S.langs[cty] || 5;
  if(same){ next(); return; }
  S.abroad = { cty, adapt: 20 + Math.round(langOf(cty)/4), fam:null, y:S.year, n:0, tutor:false, first:true };
  logLine(`${S.age} 歲遠赴${CTY[cty].n}，加盟${x.n}（${LG[x.lg].short}）`);
  const who = S.flags.married || S.flags.partner ? pName() : S.parent==='distant' ? '祖母' : '父母';
  UI.card('event', `遠赴${CTY[cty].n}`, `你即將搬到${x.city || CTY[cty].n}。你不會說${CTY[cty].lang}，也不認識任何人。${who}問你：「我們一起去嗎？」`);
  UI.choose('家人怎樣安排？', [
    { t:`${who}一起搬過去`, s:'適應較快、家庭↑；家人要放下原本的生活', f:()=>{ S.abroad.fam = 'with'; S.abroad.adapt += 10; const t = fx({ fam:4 }); UI.card('good', '一家人的新生活', `你們在${x.city || '新城市'}租了一間有花園的房子。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'獨自出發', s:'全心投入足球；家庭關係會慢慢轉淡', f:()=>{ S.abroad.fam = 'alone'; const t = fx({ fam:-4, love:2 }); UI.card('', '獨自上路', `機場的道別比你想像中難受。你答應每天打電話回家。${t?`<div class="fx">${t}</div>`:''}`); next(); } }
  ]);
}

/* ---------- 季前：海外生活安排（只在每個國家的第一季） ---------- */
function abroadPreseason(next){
  if(!isAbroad()){ next(); return; }
  const a = S.abroad, cty = CTY[a.cty];
  if(a.tutor){ const fee = Math.round(S.pro.wage*2/50)*50; if((S.money||0) >= fee){ S.money -= fee; } else { a.tutor = false; UI.card('', '語言課程', '存款不足，你停止了私人語言課程。'); } }
  if(!a.first){ next(); return; }
  a.first = false;
  const fee = Math.round(S.pro.wage*2/50)*50;
  UI.card('event', '異鄉的第一個夏天', `在${cty.n}，${cty.food}。更衣室裏大部分人都說${cty.lang}，主帥的戰術會議也有一半你聽不懂。`);
  UI.choose('你打算怎樣學語言？', [
    { t:'聘請私人語言老師', s:`每季約 ${money(fee)}｜語言進步最快`, c:(S.money||0) >= fee, f:()=>{ S.money -= fee; a.tutor = true; S.langs[a.cty] += 8; UI.card('good', '每天一課', `老師每天下午到你家上課。第一課學的是：「傳給我！」`); next(); } },
    { t:'參加球會安排的語言班', s:'免費｜與其他外援一起上課', f:()=>{ S.langs[a.cty] += 5; const t = fx({ mates:3 }); UI.card('', '外援語言班', `同班有一個巴西人、一個日本人和一個丹麥人，大家用半鹹淡的${cty.lang}聊天。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'依靠翻譯，專心踢波', s:'語言進步很慢；隊友覺得你有距離', f:()=>{ const t = fx({ mates:-3 }); UI.card('', '翻譯', `球會為你安排了翻譯，但你在更衣室總是像個局外人。${t?`<div class="fx">${t}</div>`:''}`); next(); } }
  ].filter(o => o.c !== false));
}
/* 每個半季結束：語言與適應進步 */
function abroadTick(){
  if(!isAbroad()) return '';
  const a = S.abroad, c = a.cty, d = S.pers.disc || 3;
  const l0 = langOf(c), a0 = a.adapt;
  S.langs[c] = clamp((S.langs[c]||0) + 5 + (a.tutor ? 7 : 0) + (d-3), 0, 100);
  a.adapt = clamp(a.adapt + 6 + langOf(c)/15 + (a.fam==='with' ? 4 : a.fam==='alone' ? -1 : 0) + ((S.m.mates||50) - 50)/12, 0, 100);
  if(a.fam==='alone') fx({ fam:-2 });
  if(a.adapt < 40) fx({ conf:-1 });
  return `${CTY[c].lang} ${l0}→${langOf(c)}｜適應 ${Math.round(a0)}→${Math.round(a.adapt)}`;
}

/* ---------- 季尾：海外聯賽升降班（與次級聯賽名單互換） ---------- */
function abroadPromo(T, moves){
  LG_ABROAD.forEach(lg => {
    const rows = T[lg]; if(!rows || !rows.length) return;
    const pool = clubsIn(LG_POOL[lg]); if(pool.length < 3) return;
    const down = rows.slice(-3).map(x => x[0]);
    const ups = [];
    for(let i=0; i<3; i++){ const u = wpick(pool.filter(c => !ups.includes(c.id)), c => Math.pow(Math.max(1, c.str-45), 2)); if(u) ups.push(u.id); }
    down.forEach(id => { const c = S.W.clubs[id]; c.lg = LG_POOL[lg]; if(id !== curClubSafe()) delete c.sq; moves.push([id, lg, LG_POOL[lg]]); });
    ups.forEach(id => { S.W.clubs[id].lg = lg; moves.push([id, LG_POOL[lg], lg]); });
  });
}
/* 生涯統計：五大聯賽（不含英超） */
function abroadStats(){ return S.hist.filter(r => LG_ABROAD.includes(r.lg)).reduce((t,r)=>({ app:t.app+r.app, g:t.g+r.g, a:t.a+r.a, cs:t.cs+(r.cs||0) }), { app:0, g:0, a:0, cs:0 }); }
