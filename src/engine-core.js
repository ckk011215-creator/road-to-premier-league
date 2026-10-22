/* ================= 核心：亂數、狀態、能力模型 ================= */

/* 種子亂數（mulberry32）：同一個種子＋同一組選擇＝同一段人生 */
let _s = 0;
function seedInit(str){ _s = 1779033703; for(let i=0;i<str.length;i++){ _s = Math.imul(_s ^ str.charCodeAt(i), 3432918353); _s = _s<<13 | _s>>>19; } }
function R(){ _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s>>>15, 1|_s); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }
const ri = (a,b) => a + Math.floor(R()*(b-a+1));
const rf = (a,b) => a + R()*(b-a);
const pick = a => a[Math.floor(R()*a.length)];
const chance = p => R()*100 < p;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const N0 = sd => (R()+R()+R()+R()-2)*sd*1.73;
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function wpick(items, wf){ const ws=items.map(wf), tot=ws.reduce((a,b)=>a+b,0); if(tot<=0) return null; let x=R()*tot; for(let i=0;i<items.length;i++){ x-=ws[i]; if(x<=0) return items[i]; } return items.at(-1); }
const r1 = x => Math.round(x*10)/10;
const esc = t => String(t).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

let S = null;

/* ---------- 世界：球會同聯賽 ---------- */
const STR_BAND = { PL:[83,66], CH:[66,57], L1:[58,51], L2:[53,46], NL:[47,41], NON:[40,31] };
const LG_CENTER = { PL:72, CH:61, L1:55, L2:50, NL:44, NON:36 };
function initWorld(){
  const W = { clubs:{} };
  LG_ORDER.forEach(lg => {
    const list = CLUB_DATA.filter(c => c[2]===lg), [top,bot] = STR_BAND[lg];
    list.forEach((c,i) => { W.clubs[c[0]] = { id:c[0], n:c[1], lg, reg:c[3], cat:c[4], str: r1(top-(top-bot)*i/(list.length-1)+N0(1.2)) }; });
  });
  return W;
}
const club = id => S.W.clubs[id];
const clubsIn = lg => Object.values(S.W.clubs).filter(c => c.lg===lg);
const cName = id => id && S.W.clubs[id] ? S.W.clubs[id].n : '';
const catN = c => ({1:'Category 1',2:'Category 2',3:'Category 3',0:'沒有學院'})[c];

/* ---------- 年齡同時間 ---------- */
const TERMS_Y = ['秋季學期','春季學期','夏季學期'];
const TERMS_P = ['季前','上半季','下半季'];
const seasonLabel = y => `${y}/${String((y+1)%100).padStart(2,'0')}`;
const ageGroup = a => `U${a+1}`;
function formatOf(a){ return a<=7?'5 人制':a<=9?'7 人制':a<=11?'9 人制':'11 人制'; }
/* 學年頭出世（9 月）比學年尾（8 月）大成年 */
const relYears = () => (11 - S.bm)/12;
const MAT_SHIFT = { early:0.8, norm:0, late:-0.8 };
function bioAge(age, rel, mat){ return age + (rel??relYears()) - 0.46 + MAT_SHIFT[mat??S.mat]; }
/* 身體成熟度：影響青年期身體類能力嘅實際表現 */
function physF(age, rel, mat){ if(age>=19) return 1; const b = bioAge(age, rel, mat); return clamp(0.55 + 0.45*((b-6)/12.5), 0.5, 1.02); }
/* 精英學院嘅期望能力曲線 */
function E(age){ return age<=18 ? 15 + (age-6)*4.2 : Math.min(79, 65.4 + (age-18)*2.6); }
const CAT_F = { 1:0.98, 2:0.9, 3:0.82, 0:0.78 };

/* ---------- 能力 ---------- */
function eff(k){
  const v = S.ab[k], age = S.age, kind = ATTR_KIND[k];
  let x = v;
  if(age < 19){ const f = physF(age); if(kind==='P') x = v*f; else if(k==='hea') x = v*(0.55+0.45*f); }
  if(S.spurt && S.spurt.on && (k==='tec'||k==='pac')) x *= 0.92;
  /* 身高對頭球／制空的影響：與同齡平均身高比較 */
  if(k==='hea'){ x += (S.h - avgH(age))*0.12; }
  return x;
}
const avgH = a => a>=17 ? 175 : 117 + (a-6)*5.8;
function ovrAt(pos, useEff=true){ const w = POS[pos].w; let v = 0; for(const k in w) v += (useEff?eff(k):S.ab[k])*w[k]; return v; }
function famF(pos){ return 0.86 + 0.14*clamp(S.fam[pos]||0, 0, 1); }
function ovr(useEff=true){ return ovrAt(S.pos, useEff)*famF(S.pos); }
/* 門將與外場球員互不轉換：外場球員只比較外場位置 */
function bestPositions(){ if(S.pos==='GK') return [['GK', ovrAt('GK')]]; return OUT_POS.map(p => [p, ovrAt(p)]).sort((a,b)=>b[1]-a[1]); }
/* 學院眼中嘅表現：能力＋教練印象＋自信 */
/* 左腳球員踢邊路有稀缺優勢 */
const footEdge = () => S.foot==='L' && ['FB','W'].includes(S.pos) ? 1.5 : 0;
/* 學院按位置評估：身體類能力在青年期被發育程度壓低，按該位置對身體的依賴程度作標準化，令不同位置的評估公平 */
function posNorm(){ if(S.age>=19) return 1; const f = physF(S.age, 0.46, 'norm'), w = POS[S.pos].w; let n = 0; for(const k in w) n += w[k]*(ATTR_KIND[k]==='P' ? f : k==='hea' ? 0.55+0.45*f : 1); return n; }
/* 青訓內容（裝備、事件）偏重技術，令進攻位置在青年期較易被看高；按位置校正，19 歲起不再校正 */
const POS_YADJ = { CB:1.15, FB:1.08, DM:1.04, CM:0.98, AM:0.92, W:0.93, ST:1.0, GK:1.08 };
const yAdj = () => S.age>=19 ? 1 : 1 + (POS_YADJ[S.pos]-1)*clamp((19-S.age)/3, 0, 1);
function perf(){ return ovr()/posNorm()*yAdj() + (S.m.coach-50)*0.08 + (S.m.conf-50)*0.03 + footEdge(); }

function ageEff(a){ return a<=7?0.8 : a<=10?1.0 : a<=12?1.15 : a<=17?1.3 : a<=20?1.05 : a<=23?0.75 : a<=26?0.45 : a<=29?0.25 : 0.1; }
function learnMult(){
  let m = 0.85 + 0.06*S.pers.disc;
  if(S.m.love < 30) m *= 0.8;
  if(S.m.fat > 70) m *= 0.85;
  if(S.flags.underdog) m *= 1.08;
  if(S.inj && S.inj.w>0) m *= 0.6;
  return m;
}
/* 訓練：投入 pts 點到能力 k；接近潛力上限就越來越慢 */
function train(k, pts){
  if(!(k in S.ab) || pts<=0) return 0;
  const pot = S.pot[k], room = Math.max(0, (pot - S.ab[k])/pot);
  const g = pts * 0.54 * ageEff(S.age) * learnMult() * room * 1.5;
  S.ab[k] = Math.min(99, S.ab[k] + g); S.gain[k] = (S.gain[k]||0) + g; return g;
}
/* 自然成長：細路仔踢波就會進步 */
function naturalGrowth(mult=1){ ATTRS.forEach(k => { const room = Math.max(0,(S.pot[k]-S.ab[k])/S.pot[k]); const g = 0.64*ageEff(S.age)*room*learnMult()*mult*(ATTR_KIND[k]==='P'&&S.spurt&&S.spurt.done&&S.age<19?1.3:1); S.ab[k]=Math.min(99,S.ab[k]+g); S.gain[k]=(S.gain[k]||0)+g; }); }
function keyAttrs(pos){ return Object.entries(POS[pos||S.pos].w).sort((a,b)=>b[1]-a[1]).map(x=>x[0]); }
function weakestKey(){ const ks = keyAttrs(); return ks.slice().sort((a,b)=>S.ab[a]/S.pot[a]-S.ab[b]/S.pot[b])[0]; }

/* ---------- 量表 ---------- */
const METER_N = { fat:'疲勞', love:'熱誠', conf:'自信', coach:'教練印象', fam:'家庭', study:'學業', scout:'球探注意', mates:'隊友關係', fans:'球迷人氣' };
function meter(k, d){ if(!d) return ''; const o = S.m[k]; S.m[k] = clamp(Math.round(o + d), 0, 100); const real = S.m[k]-o; if(!real) return ''; return `${METER_N[k]} ${real>0?'+':''}${real}`; }
/* 一次過套用效果，回傳文字 */
function fx(o){
  const out = [];
  for(const k in o){
    const v = o[k];
    if(k in METER_N){ const t = meter(k, v); if(t) out.push(t); }
    else if(k==='money'){ S.money = Math.max(0, S.money + v); out.push(`零用錢 ${v>0?'+':'−'}£${Math.abs(v)}`); }
    else if(k==='trust'){ if(S.pro){ const o2=S.pro.trust; S.pro.trust=clamp(S.pro.trust+v,0,100); const d=S.pro.trust-o2; if(d) out.push(`主帥信任 ${d>0?'+':''}${d}`); } }
    else if(k in ATTR_N){ const g = train(k, v); if(g>0.05) out.push(`${ATTR_N[k]}進步`); else if(v<0){ S.ab[k]=Math.max(1,S.ab[k]+v); out.push(`${ATTR_N[k]}退步`); } }
  }
  return out.join('、');
}

/* ---------- 身高同發育 ---------- */
function spurtStart(){ return { early:11.4, norm:12.9, late:14.4 }[S.mat] + S.spurtJit; }
function growHeight(){
  const t = S.age + S.term/3, sp = spurtStart();
  if(t < sp) S.h += 1.75;
  else if(t < sp+1) S.h += 3.1;
  else S.h += Math.max(0, (S.adultH - S.h)*0.3);
  if(t >= sp+3.2) S.h = Math.max(S.h, S.adultH);
  S.h = Math.min(S.h, S.adultH);
}

/* ---------- 位置熟悉度 ---------- */
function playPos(pos, amt){ S.fam[pos] = clamp((S.fam[pos]||0) + amt, 0, 1); POS_ORDER.forEach(p => { if(p!==pos) S.fam[p] = Math.max(0, (S.fam[p]||0) - amt*0.15); }); }

/* ---------- 隊友名字 ---------- */
function npcName(){ return `${pick(FIRST)}・${pick(LAST)}`; }
