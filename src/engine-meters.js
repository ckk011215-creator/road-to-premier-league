/* ================= 四項狀態對比賽的影響 =================
   自信：關鍵時刻成功率 ±10%
   疲勞：疲勞越高成功率越低；比賽後段再按體能下降
   熱誠：熱誠高可多作一個「全力以赴」選項；熱誠低則提不起勁冒險，冒險選項消失
   教練印象：青訓比賽的正選機會（職業階段改由主帥信任決定角色） */
const LOVE_HI = 70, LOVE_LO = 40;
const confMod = () => Math.round((S.m.conf - 50) / 5);
const fatMod = () => -Math.round(Math.max(0, S.m.fat - 30) * 0.25);
const lateMod = min => min > 60 ? -Math.round((min - 60) / 30 * 6 * clamp(1.15 - eff('sta') / 100, 0.2, 1)) : 0;
const loveTier = () => S.m.love >= LOVE_HI ? 'hi' : S.m.love < LOVE_LO ? 'lo' : 'mid';
/* 熱誠帶來的額外選項（按場面類別） */
const HEART_O = {
  ATT: { t:'不放棄任何皮球，全力衝刺', m:'norm', ab:['sta','pac'], k:'G', heart:true, ok:'你比所有人都更渴望皮球，搶先一步把皮球送入網窩！', ng:'你拼盡全力，但皮球還是差了一點點。' },
  MID: { t:'不停跑動，全場接應', m:'norm', ab:['sta','iq'], k:'N', heart:true, then:'BUILD', ok:'你不斷跑出空位，隊友終於把皮球交到你腳下。', ng:'你跑了很多，但隊友沒有看到你。' },
  DEF: { t:'拼盡全力封堵', m:'norm', ab:['sta','def'], k:'D', heart:true, ok:'你飛身擋在皮球前面，看台響起掌聲。', ng:'你拼盡全力，但對方還是快了半步。' },
  GK:  { t:'奮不顧身撲救', m:'norm', ab:['pac','sho'], k:'S', heart:true, ok:'你不顧一切地撲向皮球，把必入球擋出！', ng:'你撲到了，但皮球的力量太大。' }
};
/* 關鍵時刻的選項：熱誠決定選項數目 */
function momentList(sc, grp, follow){
  let list = sc.o.slice(), note = '';
  const tier = loveTier();
  if(tier==='lo' && list.length > 2){ const i = list.findIndex(o => o.m==='bold'); if(i >= 0){ list.splice(i, 1); note = 'lo'; } }
  if(tier==='hi' && !follow) list.push(HEART_O[grp] || HEART_O[POS[S.pos].g]);
  return { list, note };
}
/* 青訓比賽的正選機會（%） */
function startChance(){
  if(S.stage==='GR' && S.age <= 9) return 100;
  return Math.round(clamp(25 + (S.m.coach - 30)*1.6 + (S.stage==='GR' ? 15 : 0), 12, 98));
}
/* 正選、後備入替或全場坐在後備席 */
function youthRole(){
  if(chance(startChance())) return 'start';
  if(S.pos==='GK') return chance(30) ? 'sub' : 'out';
  return chance(S.m.coach < 30 ? 50 : 80) ? 'sub' : 'out';
}
/* 側欄與賽前的效果說明 */
function meterHint(k){
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) + '%';
  if(k==='conf') return `成功率 ${sg(confMod())}`;
  if(k==='fat') return `成功率 ${sg(fatMod())}`;
  if(k==='love') return loveTier()==='hi' ? '比賽多一個選項' : loveTier()==='lo' ? '冒險選項消失' : `${LOVE_HI} 以上多一個選項`;
  if(k==='coach') return `正選機會 ${startChance()}%`;
  if(k==='trust') return S.season && !S.season.dev ? `角色：${ROLES[S.season.r]}` : '影響上陣機會';
  return '';
}
