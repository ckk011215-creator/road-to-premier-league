// 事件檢查：逐一執行每個事件的每個選項（包括成功及失敗兩種結果），確認不會出錯、
// 故事線的下一段確實存在，並檢查所有文字是書面語。
const vm = require('vm');
const { engineSrc } = require('./engine');
const { runCareer } = require('./harness');

/* 先跑幾段生涯，在各階段留下狀態快照 */
const snaps = {};
for(let i = 0; i < 12 && !(snaps.GR && snaps.ACA && snaps.SCH && snaps.PRO); i++){
  runCareer(i, { stopAt:S => {
    const k = S.stage === 'PRO' ? (S.pro && !S.pro.semi && S.age >= 22 ? 'PRO' : null) : S.stage;
    if(k && !snaps[k] && S.age >= ({ GR:8, ACA:12, SCH:16, PRO:22 })[k]) snaps[k] = JSON.stringify(S);
    return !!(snaps.GR && snaps.ACA && snaps.SCH && snaps.PRO);
  } });
}
const missing = ['GR','ACA','SCH','PRO'].filter(k => !snaps[k]);
if(missing.length){ console.error('找不到階段快照：', missing.join('、')); process.exit(1); }

/* 海外快照：把職業快照改為效力西甲球會 */
{ const A = JSON.parse(snaps.PRO); A.pro.club = 'ERMA'; A.pro.loan = null; A.abroad = { cty:'ES', adapt:40, fam:'with', y:A.year, n:1, tutor:false, first:false };
  A.langs = { ES:72 }; Object.assign(A.flags, { partner:'married', married:true, pname:'艾美', baby:1 }); A.inj = { w:0, n:'' }; snaps.ABR = JSON.stringify(A); }
const abroadEv = e => /^(a_|s_fam|s_kid)/.test(e.id);
const ctx = { console, Math, JSON, Object, Array, String, Number, Date, Set, Map };
vm.createContext(ctx);
vm.runInContext(engineSrc().replace('const chance = p =>', 'let chance = p =>') + '\n;this.__g = () => ({ EVENTS, resolveOpt, setS:v => { S = v; }, getS:() => S, setChance:f => { chance = f; } });', ctx);
const texts = new Set(), add = s => { if(s) texts.add(String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); };
let pend = [];
ctx.UI = { newPage(){}, save(){}, play(){}, autoSim(){ return false; }, idle(){},
  card(t, ti, h){ add(ti); add(h); }, choose(p, o){ o.forEach(x => { add(x.t); add(x.s); }); pend.push(o.filter(x => x.f)[0]); },
  pick(p, items, n, cb){ cb([]); }, end(){} };
const g = ctx.__g(), ids = new Set(g.EVENTS.map(e => e.id));
let errors = 0, runs = 0, skipped = 0;
/* 條件不成立的事件（例如需要特定位置）若出錯只會略過，不算失敗 */
const condOk = e => { try { return !e.c || !!e.c(); } catch(err){ return false; } };
const fail = (e, msg) => { errors++; console.log(`✗ ${e.id}：${msg}`); };
const origChance = vm.runInContext('chance', ctx);

for(const e of g.EVENTS){
  const stage = abroadEv(e) ? 'ABR' : e.st.find(s => snaps[s]) || e.st[0];
  const age = Math.max(e.a[0], Math.min(e.a[1], ({ GR:9, ACA:13, SCH:17, PRO:26, ABR:27 })[stage]));
  /* 每個選項：成功一次、失敗一次 */
  const injOn = S => { if(e.inj) S.inj = { w:8, n:'大腿後肌拉傷', sev:'major' }; if(e.inj && S.stage==='PRO' && !S.season) S.season = { inj:0 }; };
  const nOpts = (() => { const S = JSON.parse(snaps[stage]); S.age = age; S.money = 1e7; injOn(S); g.setS(S); try { return e.o().length; } catch(err){ if(condOk(e)) fail(e, err.message); else skipped++; return 0; } })();
  for(let k = 0; k < nOpts; k++) for(const luck of [true, false]){
    const S = JSON.parse(snaps[stage]); S.age = age; S.money = 1e7; S.evq = []; injOn(S); g.setS(S);
    g.setChance(p => luck);
    try {
      add(e.t); add(e.d());
      const o = e.o()[k]; add(o.t); add(o.s);
      let done = false; pend = [];
      g.resolveOpt(o, e, () => { done = true; });
      for(let j = 0; j < 20 && !done && pend.length; j++) pend.shift().f();
      if(!done) fail(e, `選項「${o.t}」沒有完成`);
      (g.getS().evq || []).forEach(q => { if(!ids.has(q.id)) fail(e, `故事線的下一段「${q.id}」不存在`); });
      runs++;
    } catch(err){ if(condOk(e)) fail(e, `選項 ${k}：${err.message}`); else skipped++; }
  }
}
g.setChance(origChance);

/* 文字檢查（與 lang.js 相同規則） */
const marks = /[嘅係唔冇佢咗喺嚟啲嗰揀撳俾睇諗搵攞拎咁啱晒嘢乜仲瞓嬲畀噃喇吖囉啦㗎喎咩嘞攰甩郁黐掟慳蝕哋埋咪噉冚揸啩]/;
const ALLOW = /AC 米蘭|Match of the Day|Category|GCSE|A\*|Scholarship|college|Boxing Day|U\d+|PL2|FA Youth Cup|FA Cup|PFA|BTEC|Distinction|St George's Park|VS|tiki-taka|Catenaccio|potrero|garra|£[\d.,]+[km]?/g;
const bad = [...texts].filter(t => marks.test(t.replace(/關係/g, '')) || /[A-Za-z]{2,}/.test(t.replace(ALLOW, '')) || /undefined|NaN|\[object/.test(t));
bad.slice(0, 20).forEach(t => console.log('  文字問題：', t.slice(0, 120)));
const chains = g.EVENTS.filter(e => e.chain).length;
console.log(`事件 ${g.EVENTS.length} 個（故事線分段 ${chains} 個）｜執行 ${runs} 次｜條件不符略過 ${skipped}｜錯誤 ${errors}｜文字問題 ${bad.length}`);
if(g.EVENTS.length < 300) { console.log('事件少於 300 個'); errors++; }
process.exit(errors || bad.length ? 1 : 0);
