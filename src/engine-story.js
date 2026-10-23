/* ================= 主帥風格、難度、記者會、傷患決策、代言、球會傳奇、退役後、報紙 ================= */

/* ---------- 難度 ---------- */
/* aca＝學院邀請倍數；trial＝試訓成功率加減；ret＝學院保留偏差；sch＝Scholarship 偏差；pro＝18 歲職業合約加減；
   nl＝非聯賽球員每年獲職業球會報價的機會；pl＝非英超球員每年獲英超球會報價的機會 */
const DIFF = {
  easy:   { n:'輕鬆', odds:6,  train:1.2,  inj:0.8,  trust:0.7,  aca:1, acaY:0.45, trial:0,   ret:0,    sch:0,  pro:0,   retCap:100, schCap:90, proCap:90, nl:0.1,    keep:0.2, plKeep:1,    young:0.5,  loan:0.8, debut:0.8, pl:1,     plB:3,  roleB:0,  roleY:-1.5,
            d:'成長較快、受傷較少、主帥較寬容。約一半人可以入到學院，約五分一可以踢上英超。' },
  normal: { n:'標準', odds:0,  train:1.1,  inj:1,    trust:1,    aca:1, acaY:0.40, trial:0,   ret:0,    sch:0,  pro:0,   retCap:100, schCap:88, proCap:90, nl:0.04,   keep:0.16, plKeep:1,   young:0.3,  loan:0.7, debut:0.7, pl:1,     plB:4,  roleB:0,  roleY:0,
            d:'原本的平衡。約三分一可以入到學院，約七分一可以踢上英超。' },
  hard:   { n:'困難', odds:-5, train:1,    inj:1.2,  trust:1.3,  aca:1, acaY:0.37, trial:0,   ret:0,    sch:0,  pro:0,   retCap:92,  schCap:60, proCap:70, nl:0.03,   keep:0.1, plKeep:1,    young:0.05, loan:0.5, debut:0.5, pl:1,     plB:11, roleB:0,  roleY:-1,
            d:'關鍵時刻成功率 −5%、受傷較多、主帥較嚴厲。約五分一可以入到學院，約十分一可以踢上英超。' },
  real:   { n:'現實', odds:-6, train:0.8,  inj:1.25, trust:1.35, aca:1, acaY:0.5,  trial:-10, ret:-1.2, sch:-1, pro:-30, retCap:85,  schCap:38, proCap:20, nl:0.0003, keep:0.0015, plKeep:0.5, young:0.1,  loan:0.2, debut:0.1, pl:0.003, plB:-3, roleB:-4, roleY:-7,
            d:'參考現實世界的比例（已放寬五倍）：約十分一入到學院，約六十人之中一人簽到職業合約，約七百人之中只有一人踢上英超。' }
};
const dif = () => DIFF[(S && S.diff) || 'normal'] || DIFF.normal;

/* ---------- 主帥風格 ---------- */
const MSTYLE = {
  press:   { n:'高位壓迫', d:'要求全隊不停走動、前場搶球', w:{ sta:1, pac:0.7, def:0.5 }, gw:{ pas:0.8, pac:1, iq:0.5 } },
  poss:    { n:'控球主導', d:'短傳滲透，重視腳下技術與視野', w:{ tec:1, pas:1, iq:0.8 }, gw:{ pas:1, tec:0.8, iq:0.5 } },
  counter: { n:'防守反擊', d:'穩守之後快速反擊，重視速度與紀律', w:{ pac:1, def:0.8, iq:0.6 }, gw:{ def:1, sho:0.8, iq:0.5 } },
  direct:  { n:'長傳衝擊', d:'直接打法，重視身體對抗與頭球', w:{ str:1, hea:1, sho:0.5 }, gw:{ hea:1, str:0.8, def:0.5 } }
};
function newMgr(){ return { n:`${pick(COACH_FIRST)}・${pick(LAST)}`, st:pick(Object.keys(MSTYLE)) }; }
function mgrOf(id){ const c = club(id); if(!c) return null; if(!c.mgr) c.mgr = newMgr(); return c.mgr; }
/* 戰術契合度：主帥重視的能力比你的整體能力高多少（正數＝契合） */
function styleFit(id){
  const c = club(id); if(!c || !c.mgr) return 0;
  const st = MSTYLE[c.mgr.st], w = S.pos==='GK' ? st.gw : st.w; let s = 0, t = 0;
  for(const k in w){ s += eff(k)*w[k]; t += w[k]; } return s/t - ovr();
}
const fitN = f => f>=3 ? '非常契合' : f>=0.5 ? '契合' : f>=-2.5 ? '一般' : '不太契合';
const fitTxt = id => { const m = club(id) && club(id).mgr; return m ? `${MSTYLE[m.st].n}（${fitN(styleFit(id))}）` : '未知'; };
const styleAttrs = id => { const m = club(id) && club(id).mgr; if(!m) return []; const w = S.pos==='GK' ? MSTYLE[m.st].gw : MSTYLE[m.st].w; return Object.keys(w).map(k => ATTR_N[k]); };

/* ---------- 賽後記者會 ---------- */
function pressConf(r, info, next){
  const se = S.season || {};
  /* 上一場放話之後的結果 */
  if(S.hype && r){ S.hype = 0;
    if(r.rt < 6.6){ const t = fx({ fans:-5, conf:-3 }); UI.card('bad', '說話太早', `賽前的豪言壯語被傳媒翻出來。今場只得 ${r.rt.toFixed(1)} 分，社交媒體上的嘲笑排山倒海。${t?`<div class="fx">${t}</div>`:''}`); }
    else if(r.rt >= 7.4){ const t = fx({ fans:3 }); UI.card('good', '說到做到', `你兌現了賽前的說話。球迷高唱你的名字。${t?`<div class="fx">${t}</div>`:''}`); } }
  if(!r || se.dev || (se.press||0) >= 2) { next(); return; }
  const big = r.rt>=7.8 || r.rt<=6.0 || info.rv || info.derby || r.g>=2;
  if(!big || !chance(22)){ next(); return; }
  se.press = (se.press||0) + 1;
  const rv = info.rv ? rivalOf() : null, bench = se.r>=2, lost = r.gf < r.ga, good = r.rt >= 7.2;
  const q = rv ? `記者問：「今天與${rv.n}的對決，你怎樣評價自己和他的表現？」`
    : bench ? '記者問：「你最近上陣時間不多，對主帥的安排滿意嗎？」'
    : good ? `記者問：「今天${r.g>=2?`梅開二度`:'表現出色'}，你覺得自己已經是這支球隊最重要的球員嗎？」`
    : '記者問：「今天表現不理想，外界質疑你的狀態，你有甚麼回應？」';
  UI.card('event', '賽後訪問', q);
  const opts = [
    { t:'謙虛低調', s:'主帥信任↑、隊友關係↑', f:()=>{ const t = fx({ trust:2, mates:2 }); UI.card('', '謙虛低調', `「這是全隊努力的成果，我只是做好自己的本分。」${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'自信放話', s:'球迷人氣↑、自信↑｜下一場表現差會被嘲笑', f:()=>{ S.hype = 1; const t = fx({ fans:4, conf:2, trust:-1 });
      UI.card('', '自信放話', rv ? `「他很好，但我更好。下次見面，我會證明給所有人看。」${rv.n}的球迷在網上炸開了鍋。` : `「我知道自己的能力，下一場我會做得更好。」${t?`<div class="fx">${t}</div>`:''}`); if(rv){ rvState().heat = (rvState().heat||0) + 1; } next(); } } ];
  if(bench || lost) opts.push({ t:bench ? '公開表達不滿' : '批評球隊戰術', s:'球迷人氣↑｜主帥信任↓↓、隊友關係↓', warn:false, f:()=>{ const t = fx({ fans:2, trust:-8, mates:-3 });
    UI.card('bad', '公開表態', `${bench ? '「我需要上陣時間，我相信自己應該是正選。」' : '「我們今天的戰術安排有問題。」'}第二天，主帥在記者會上冷冷地說：「有意見可以來辦公室找我。」${t?`<div class="fx">${t}</div>`:''}`); next(); } });
  else opts.push({ t:'把功勞歸於隊友', s:'隊友關係↑↑', f:()=>{ const t = fx({ mates:4, fans:1 }); UI.card('', '歸功隊友', `「沒有隊友的傳送和掩護，我甚麼也做不到。」${t?`<div class="fx">${t}</div>`:''}`); next(); } });
  UI.choose('怎樣回答？', opts);
}

/* ---------- 傷患決策 ---------- */
/* 嚴重傷患：手術或保守治療；中度傷患：打止痛針或休息 */
function injuryChoice(kind, w, n, cont){
  if(kind==='severe'){
    UI.choose('治療方案？', [
      { t:'接受手術', s:`休息 ${w} 星期｜完全康復`, f:()=>{ UI.card('', '手術', `手術順利。漫長的康復期開始了。`); cont(); } },
      { t:'保守治療', s:`約 ${Math.round(w*0.55)} 星期復出｜兩季內再受傷機會較高`, f:()=>{ S.inj.w = Math.round(w*0.55); S.flags.weak = S.year + 2;
        UI.card('', '保守治療', `醫生不太贊成，但你想盡快回到球場。預計 ${S.inj.w} 星期後復出。`); cont(); } } ]);
    return;
  }
  UI.choose('隊醫問你：繼續比賽嗎？', [
    { t:'打止痛針繼續', s:'只缺陣約 1 星期｜有機會令傷勢惡化', f:()=>{
      if(chance(30)){ S.inj.w = w + ri(3,6); S.inj.n = `${n}（惡化）`; const t = fx({ trust:-2 }); UI.card('bad', '傷勢惡化', `止痛針藥力過後，傷勢明顯惡化。你需要休息 ${S.inj.w} 星期。${t?`<div class="fx">${t}</div>`:''}`); }
      else { S.inj.w = 1; const t = fx({ trust:3, fans:2 }); UI.card('good', '帶傷作戰', `你咬緊牙關踢下去。主帥和球迷都看在眼裏。${t?`<div class="fx">${t}</div>`:''}`); }
      cont(); } },
    { t:'按醫囑休息', s:`休息 ${w} 星期`, f:()=>{ UI.card('', '休息', `你接受了隊醫的建議。`); cont(); } } ]);
}
/* 重要比賽前仍有輕傷：帶傷上陣？ */
function playHurt(tag, yes, no){
  UI.card('event', '帶傷上陣？', `${tag}前，你的傷勢仍未完全康復（尚餘 ${S.inj.w} 星期）。主帥問你能否上陣。`);
  UI.choose('你的決定？', [
    { t:'帶傷上陣', s:'疲勞↑｜賽後有機會傷勢加重', f:()=>{ S.inj = { w:0, n:'' }; S.m.fat = clamp(S.m.fat+15, 0, 100); S.hurtPlay = 1; yes(); } },
    { t:'休息，不冒險', s:'', f:()=>{ UI.card('', '休息', '你在看台上觀看這場比賽。'); no(); } } ]);
}
function hurtAfter(){ if(!S.hurtPlay) return; S.hurtPlay = 0; if(chance(40)){ S.inj = { w:ri(3,7), n:'舊傷復發' }; if(S.season) S.season.inj += S.inj.w; UI.card('bad', '舊傷復發', `帶傷上陣的代價：你需要休息 ${S.inj.w} 星期。`); } }

/* ---------- 代言與社交媒體 ---------- */
const BRANDS = [
  { n:'運動品牌球鞋代言', k:1 }, { n:'能量飲品廣告', k:0.8 }, { n:'電子遊戲封面球員', k:1.2, min:75 }, { n:'時裝品牌大使', k:1, min:70 },
  { n:'博彩公司廣告', k:1.8, bad:true }
];
function dealPay(k){ const lg = club(curClub()).lg, f = S.m.fans||0; return Math.round(f*f*8*k*({ PL:3, CH:1.2, L1:0.6, L2:0.4 }[lg]||0.2)/500)*500; }
function brandStep(next){
  if(!S.pro || S.pro.semi){ next(); return; }
  S.deals = S.deals || [];
  /* 人氣下跌：品牌終止合約 */
  if(S.deals.length && (S.m.fans||0) < 35){ const d = S.deals.shift(); UI.card('bad', '代言終止', `${d.n}以「形象考慮」為由終止合約。`); }
  const own = S.deals.map(d => d.n), cand = BRANDS.filter(b => !own.includes(b.n) && (S.m.fans||0) >= (b.min||55));
  if(S.deals.length>=2 || !cand.length || !chance(45)){ next(); return; }
  const b = pick(cand), pay = dealPay(b.k);
  UI.card('event', '代言邀請', `${b.bad ? '一間博彩公司' : '一個品牌'}希望你擔任「${b.n}」，每季酬金 ${money(pay)}。${b.bad ? '<br>不過，家人對博彩廣告有保留。' : ''}`);
  UI.choose('接受嗎？', [
    { t:'簽約', s:`每季 ${money(pay)}${b.bad?'｜家庭↓、球迷人氣↓':''}`, f:()=>{ S.deals.push({ n:b.n, pay, y:S.year, bad:!!b.bad }); logLine(`${S.age} 歲成為${b.n}`); const t = fx(b.bad ? { fam:-4, fans:-2 } : { fans:1 }); UI.card('good', '代言', `你簽下了代言合約。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'婉拒', s:b.bad ? '家庭↑' : '', f:()=>{ const t = b.bad ? fx({ fam:3 }) : ''; UI.card('', '婉拒', `你婉拒了邀請，專心踢波。${t?`<div class="fx">${t}</div>`:''}`); next(); } } ]);
}
function dealsPayout(){ if(!S.deals || !S.deals.length) return; const sum = S.deals.reduce((s,d)=>s+d.pay,0); S.money = (S.money||0) + sum; S.earn += sum; UI.card('', '代言收入', `${S.deals.map(d=>d.n).join('、')}：今季合共 ${money(sum)}。`); }
/* 半季結束：社交媒體事件 */
function socialStep(next){
  if(!S.pro || S.pro.semi || !chance(12)){ next(); return; }
  const r = (S.recent||[])[0], good = r && r.rt >= 7.5, bad = r && r.rt < 6.4;
  if(good){ const t = fx({ fans:5 }); UI.card('good', '片段爆紅', `你上一場的精彩片段在社交媒體瘋傳，觀看次數超過一千萬。${t?`<div class="fx">${t}</div>`:''}`); next(); return; }
  if(bad){ UI.card('event', '網上惡評', '上一場表現不佳，你的社交媒體湧入大量惡評，有人甚至針對你的家人。');
    UI.choose('怎樣處理？', [
      { t:'關閉留言，專心比賽', s:'自信↑', f:()=>{ const t = fx({ conf:2, fans:-1 }); UI.card('', '關閉留言', `你暫時遠離社交媒體。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
      { t:'公開回應惡評', s:'可能贏得支持，也可能越描越黑', f:()=>{ const ok = chance(50), t = fx(ok ? { fans:4, conf:1 } : { fans:-4, conf:-2 }); UI.card(ok?'good':'bad', ok?'獲得支持':'越描越黑', `${ok ? '你冷靜而得體的回應獲得大量支持。' : '你的回應被斷章取義，引來更多罵戰。'}${t?`<div class="fx">${t}</div>`:''}`); next(); } } ]); return; }
  if(chance(50)){ UI.card('event', '舊帖文被翻出', '有網民翻出你十多歲時在社交媒體發布的不當言論。');
    UI.choose('怎樣處理？', [
      { t:'公開道歉', s:'球迷人氣小幅下跌', f:()=>{ const t = fx({ fans:-2 }); UI.card('', '道歉', `你發出聲明道歉，事件很快平息。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
      { t:'刪除帖文，不作回應', s:'可能影響代言', f:()=>{ const t = fx({ fans:-6 }); if(S.deals && S.deals.length && chance(50)){ const d = S.deals.shift(); UI.card('bad', '代言終止', `${d.n}終止了與你的合約。`); } UI.card('bad', '沉默', `傳媒批評你逃避責任。${t?`<div class="fx">${t}</div>`:''}`); next(); } } ]); return; }
  UI.card('event', '慈善探訪', '球會邀請你到兒童醫院探訪。');
  UI.choose('參加嗎？', [
    { t:'參加', s:'球迷人氣↑、熱誠↑｜疲勞↑', f:()=>{ const t = fx({ fans:3, love:3, fat:3 }); UI.card('good', '慈善探訪', `孩子們見到你時的笑容，讓你記起自己為甚麼踢足球。${t?`<div class="fx">${t}</div>`:''}`); next(); } },
    { t:'婉拒，專心休息', s:'', f:()=>{ UI.card('', '婉拒', '你留在家中休息。'); next(); } } ]);
}

/* ---------- 球衣號碼與球會傳奇 ---------- */
const NUM_POS = { GK:[1], CB:[4,5,6], FB:[2,3], DM:[6,4], CM:[8,14], AM:[10,7], W:[7,11], ST:[9,10] };
function numFor(cid){
  const r = roleFor(club(cid)); const pool = NUM_POS[S.pos] || [8];
  return r<=1 && S.age>=20 ? pool[ri(0, pool.length-1)] : (S.pos==='GK' ? pick([13,25,31]) : ri(14,39));
}
const clubApps = id => S.hist.filter(r => r.club===id && !r.loan && r.lg!=='DEV').reduce((s,r)=>s+r.app, 0);
/* 季尾：效力年期里程碑 */
function legendSeason(){
  if(!S.pro || S.pro.loan) return;
  const id = S.pro.club, y = S.pro.clubYrs[id]||0, c = club(id);
  if(!S.pro.num || S.pro.numClub!==id){ S.pro.num = numFor(id); S.pro.numClub = id; }
  if(y===5){ const t = fx({ fans:3, mates:2 }); UI.card('good', '效力五年', `你已經為${c.n}效力五個賽季。主場球迷開始為你創作專屬歌曲。${t?`<div class="fx">${t}</div>`:''}`); }
  if(y===10){ addHonour(`${c.n}十年服務`, { club:id }); logLine(`${S.age} 歲：為${c.n}效力滿十年`); const t = fx({ fans:6, love:4 });
    UI.card('gold', '十年老臣', `十個賽季，同一件球衣。${c.n}在主場賽前為你舉行了致敬儀式。${t?`<div class="fx">${t}</div>`:''}`); }
  /* 球衣號碼升級：成為正選後換上主力號碼 */
  const pool = NUM_POS[S.pos] || [];
  if(S.season && S.season.r===0 && !pool.includes(S.pro.num) && S.age>=20 && chance(60)){ const n = pool[0]; S.pro.num = n; UI.card('good', '新號碼', `球會把 ${n} 號球衣交給你。`); }
}
/* 離開效力多年的球會 */
function legendFarewell(oldId){
  const y = (S.pro.clubYrs||{})[oldId]||0; if(y < 8) return;
  UI.card('event', '告別', `離開${cName(oldId)}的那天，球迷在練習場外拉起橫額：「${y} 年，謝謝你，${S.last}。」`);
}
/* 退役時：告別賽、號碼退役、銅像 */
function legendRetire(){
  if(!S.pro) return [];
  const id = S.pro.club, y = (S.pro.clubYrs||{})[id]||0, c = club(id), apps = clubApps(id), out = [];
  if(y >= 8){ addHonour(`${c.n}告別賽`, { club:id }); out.push(`${c.n}為你舉行告別賽，${c.lg==='PL'?'六萬':'兩萬'}名球迷入場，與你一起唱完最後一首歌。`); }
  if(y >= 10 && apps >= 300 && (S.m.fans||0) >= 55 && S.pro.num){ addHonour(`${c.n} ${S.pro.num} 號球衣退役`, { club:id }); out.push(`${c.n}宣布把 ${S.pro.num} 號球衣永久退役。`); }
  const big = S.honours.some(h => h.club===id && /英超冠軍|FA Cup|升級/.test(h.t)) ;
  if(y >= 10 && big && dominance() >= 400){ addHonour(`${c.n}球場外銅像`, { club:id }); out.push(`十年後，${c.n}在球場外為你豎立了一座銅像。`); }
  return out;
}

/* ---------- 退役後章節 ---------- */
function afterCareer(done){
  if(S.after || S.stage!=='PRO' || careerStats().app < 60){ done(); return; }
  const lt = legendRetire();
  UI.newPage('退役之後');
  if(lt.length) UI.card('gold', '球會傳奇', lt.join('<br>'));
  UI.card('event', '下一章', `${S.age} 歲，你掛靴了。足球以外的人生才剛剛開始。`);
  const fame = dominance(), aca = S.aca && S.aca.club ? club(S.aca.club) : null;
  const end = (path, t, tone) => { S.after = { path, t }; logLine(`退役後：${t}`); UI.card(tone||'', '多年以後', t); done(); };
  UI.choose('退役後想做甚麼？', [
    { t:'考取教練牌照，執教球會', s:'由低級別球會開始', f:()=>{
      const startLg = fame>=900 ? 'CH' : fame>=300 ? 'L1' : 'L2', cl = pick(clubsIn(startLg));
      UI.card('', '教練之路', `你在聖佐治公園考取了歐洲足協職業教練牌照。${cl.n}（${LG[startLg].short}）邀請你出任主帥。`);
      UI.choose('你的執教哲學？', Object.entries(MSTYLE).map(([k, st]) => ({ t:st.n, s:st.d, f:()=>{
        const sk = (eff('iq') - 60)*0.6 + (fame/100) + (k===(S.pro&&club(S.pro.club).mgr||{}).st ? 6 : 0) + N0(12);
        UI.card('event', '大球會招手', `執教第三年，${cl.n}成績亮眼。一間英超球會向你招手。`);
        UI.choose('離開嗎？', [
          { t:'接受英超球會邀請', s:'風險更高、舞台更大', f:()=>{ const big = pick(clubsIn('PL').filter(x=>x.str>=78)) || pick(clubsIn('PL'));
            end('coach', sk>=12 ? `你帶領${big.n}奪得英超冠軍，成為少數以球員及主帥身份都登上頂峰的人。` : sk>=0 ? `你在${big.n}執教四年，帶隊打進歐洲賽，之後轉任英格蘭 U21 主帥。` : `${big.n}開季十二場只得兩勝，你被辭退。之後你回到低級別聯賽，慢慢重建聲譽。`, sk>=12?'gold':''); } },
          { t:`留在${cl.n}`, s:'忠誠與穩定', f:()=>{ end('coach', sk>=4 ? `你帶領${cl.n}連升兩級打上英超，球迷視你為球會歷史上最偉大的主帥。` : `你在${cl.n}執教八年，雖然始終未能升上英超，但建立了一支踢得漂亮的球隊。`, sk>=4?'gold':''); } } ]); } })));
    } },
    { t:'電視評述員', s:'在 Match of the Day 分析比賽', f:()=>{
      UI.choose('你的評述風格？', [
        { t:'持平分析', s:'專業、細膩', f:()=>end('pundit', '你的戰術分析細膩持平，成為 Match of the Day 的長青評述員，被譽為「最會看比賽的前球員」。') },
        { t:'敢言毒舌', s:'話題性高、爭議亦多', f:()=>end('pundit', chance(55) ? '你的毒舌評論每星期都成為頭條，社交媒體追隨者突破五百萬。' : '你一次失言引來軒然大波，電視台與你解約。你轉戰網上節目，反而更受年輕人歡迎。') } ]); } },
    { t:'青訓總監', s:aca ? `回到${aca.n}學院` : '培育下一代', f:()=>{
      UI.choose('培訓方向？', [
        { t:'重視技術與球商', s:'', f:()=>end('youth', `十年後，你在${aca?aca.n:'學院'}帶出的球員之中，有 ${ri(4,9)} 人在英超上陣，其中一人入選英格蘭國家隊。`, 'gold') },
        { t:'重視身體與鬥志', s:'', f:()=>end('youth', `你的學院以拚勁見稱，${ri(6,12)} 名球員踢上職業聯賽。他們說，你教會了他們永不放棄。`) } ]); } },
    { t:'陪伴家人', s:'遠離鎂光燈', f:()=>end('family', `你搬回${CITIES[S.city].n}。星期日早上，你在${S.gr}擔任義務教練，看着一群六歲的孩子在泥地上追着皮球，就像當年的你。`) }
  ]);
}

/* ---------- 每季報紙頭版 ---------- */
const PAPERS = ['英倫體育報', '三獅週刊', '看台日報', '星期日球場'];
function seasonPaper(o){
  const { row, pos, mv, aw, champ, lgKey, c } = o, sn = S.last || S.first, se = S.season||{};
  if(row.lg==='DEV' && row.app<3) return;
  const up = mv && LG[mv[2]].lvl < LG[mv[1]].lvl, down = mv && !up, played = row.app>=10;
  const yr = S.year+1, hon = S.honours.filter(h => h.y===yr);
  let hl, sub;
  if(pos===1 && played) hl = `${sn}助${c.n}稱王`;
  else if(hon.some(h=>/^歐聯冠軍/.test(h.t))) hl = `歐洲之巔！${sn}高舉大耳盃`;
  else if(hon.some(h=>/年度世界足球先生/.test(h.t))) hl = `${sn}當選世界足球先生`;
  else if(hon.some(h=>/FA Cup/.test(h.t)) && played) hl = `溫布萊之夜！${sn}捧起 FA Cup`;
  else if(hon.some(h=>/^(國王盃|意大利盃|德國盃|法國盃)冠軍/.test(h.t)) && played) hl = `${sn}捧起${hon.find(h=>/^(國王盃|意大利盃|德國盃|法國盃)冠軍/.test(h.t)).t.replace('冠軍','')}`;
  else if(aw.some(a=>/金靴/.test(a))) hl = `${row.g} 球！${sn}奪得金靴`;
  else if(aw.some(a=>/PFA 年度最佳球員/.test(a))) hl = `${sn}當選 PFA 年度最佳球員`;
  else if(up && played) hl = `${c.n}升班！${sn}功不可沒`;
  else if(down && played) hl = `${c.n}降班　${sn}前途成疑`;
  else if(se.inj>=16) hl = `傷患纏身　${sn}的失落一季`;
  else if(S.age<=19 && row.app>=8 && row.rt>=6.9) hl = `${S.age} 歲小將一戰成名`;
  else if(row.rt>=7.4 && played) hl = `${sn}：本季最佳球員之一`;
  else if(row.app<=5 && row.lg!=='DEV') hl = `坐穿板凳　${sn}何去何從？`;
  else if(row.rt<6.5 && played) hl = `${sn}陷入低潮`;
  else hl = `${sn}穩步成長`;
  sub = `${c.n}・${row.lg==='DEV'?'預備組':LG[lgKey].n}｜${row.app} 場${row.gk?`・${row.cs} 次零封`:`・${row.g} 球 ${row.a} 助攻`}・平均評分 ${row.app?row.rt.toFixed(2):'—'}`;
  const rv = rivalOf(), rs = S.rv && S.rv.seasons && S.rv.seasons.at(-1);
  const bt = S.W.boots && S.W.boots[lgKey] && S.W.boots[lgKey][0];
  const side = [`${LG[lgKey].n}冠軍：${champ.n}`, bt ? `${LG[lgKey].short}金靴：${bt.n}（${cName(bt.c)}）${bt.g} 球` : '', ...Object.keys(CUPS).filter(k => isAbroadLg(lgKey) ? CUPS[k].win.includes(lgKey) : ['fa','lc'].includes(k)).map(k => S.cupWin && S.cupWin[k] ? `${CUPS[k].n}冠軍：${cName(S.cupWin[k])}` : ''), rs && rv ? `同屆宿敵${rv.n}：平均評分 ${rs.rt.toFixed(2)}` : '', S.deals && S.deals.length ? `場外：${S.deals[0].n}` : ''].filter(Boolean);
  const paper = isAbroadLg(lgKey) ? CTY[LG[lgKey].cty].paper : PAPERS[S.year % PAPERS.length];
  UI.card('paper', '', `<div class="np"><div class="np-mast"><b>《${paper}》</b><span>${yr} 年 5 月・季終特刊</span></div><h2 class="np-hl">${esc(hl)}</h2><p class="np-sub">${esc(sub)}</p>
    <div class="np-body"><img src="${typeof playerURL==='function' ? playerURL(5) : ''}" alt=""><p>${esc(c.n)}今季於${LG[lgKey].n}排名第 ${pos}${up?'，成功升級':down?'，不幸降級':''}。${aw.length?`${esc(sn)}獲得${esc(aw.join('、'))}。`:''}${se.inj>=8?`季內因傷缺陣約 ${se.inj} 星期。`:''}</p></div>
    ${side.length?`<ul class="np-side">${side.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</div>`);
}
