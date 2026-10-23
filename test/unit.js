// 單元測試：存檔轉換、可重現性、讀檔後繼續、特技上限
const assert = require('assert');
const { makeGame, runCareer } = require('./harness');
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('✓', name); };

ok('舊版（v1）存檔可轉換到最新版本', () => {
  const g = makeGame().g();
  const S = { v:1, seed:'abc', m:{ fat:20 }, flags:{ agentSigned:1 }, pro:{ club:'X' } };
  const r = g.migrateS(S);
  assert.ok(r.ok); assert.strictEqual(S.v, g.SAVE_VER); assert.strictEqual(S.m.mates, 50); assert.ok(Array.isArray(S.hist)); assert.ok(S.agent && S.agent.type==='indie');
});
ok('較新版本的存檔會被拒絕', () => {
  const g = makeGame().g(); const r = g.migrateS({ v:999, seed:'x' }); assert.strictEqual(r.ok, false);
});
ok('同一種子、同一組選擇，結果完全相同', () => {
  const a = runCareer(3, { first:true }), b = runCareer(3, { first:true });
  assert.ok(a.ended && b.ended, '生涯應該完結');
  assert.strictEqual(JSON.stringify(a.S.hist), JSON.stringify(b.S.hist));
  assert.strictEqual(a.ended.sc, b.ended.sc);
});
ok('中途存檔（JSON）後讀回，可以繼續玩到退役', () => {
  const a = runCareer(5, { stopAt:S => S.stage==='PRO' && S.hist.length>=2 });
  const saved = JSON.stringify({ S:a.S, rs:a.G.ctx.__g()._s });
  const B = makeGame({ choiceSeed:'resume' }), g = B.g(), sv = JSON.parse(saved);
  assert.ok(g.migrateS(sv.S).ok);
  g.setS(sv.S); g.setRs(sv.rs); sv.S.busy = false; g.setAttrSet(sv.S.pos==='GK');
  B.ctx.UI.idle(); let steps = 0;
  while(B.out.pending.length && !B.out.ended && steps < 60000){ B.out.pending.shift()(); steps++; }
  assert.ok(B.out.ended, '讀檔後應能完成生涯');
});
ok('特技加成不超過上限', () => {
  const G = runCareer(1, { stopAt:S => S.stage==='PRO' }), g = G.G.g();
  G.S.perks = Object.fromEntries(g.PERKS.map(p => [p.id, 2030]));
  const b = g.perkBonus({ k:'G', m:'bold', ab:['sho'] }, { stake:3, sub:true, trail:true, sc:'主罰十二碼' });
  assert.ok(b.v <= 14, `加成 ${b.v}`);
});
ok('海外生涯：加盟西甲後可以完成生涯，並記錄西甲數據', () => {
  const vm = require('vm'); let R = null;
  for(let i=0; i<20 && !R; i++){ const r = runCareer(i, { stopAt:S => S.stage==='PRO' && S.pro && !S.pro.semi && S.age>=21 && S.term===0 }); if(r.S.stage==='PRO' && !r.ended && r.S.age>=21) R = r; }
  assert.ok(R, '找不到合適的職業生涯');
  const G = R.G; vm.runInContext("contractNext = () => {}; sign(club('ERMA'), 4, 30000);", G.ctx);
  let steps = 0; while(G.out.pending.length && !G.out.ended && steps < 60000){ G.out.pending.shift()(); steps++; }
  const S = G.g().S;
  assert.ok(G.out.ended, '生涯應該完結');
  assert.ok(S.flags.wentAbroad, '應記錄曾經出國');
  assert.ok(S.hist.some(r => r.lg==='ES' || r.club==='ERMA'), '應有西甲紀錄');
  assert.ok(S.langs && S.langs.ES > 5, '語言應有進步');
});
ok('1.0 版存檔（v2）讀入後補上海外球會與積分榜', () => {
  const vm = require('vm'); const r = runCareer(2, { stopAt:S => S.stage==='PRO' }), G = r.G, S = G.g().S;
  Object.keys(S.W.clubs).filter(id => vm.runInContext(`isAbroadLg(S.W.clubs['${id}'].lg)`, G.ctx)).forEach(id => delete S.W.clubs[id]);
  if(S.lt) ['ES','IT','DE','FR'].forEach(l => { delete S.lt.T[l]; delete S.lt.done[l]; });
  S.v = 2; assert.ok(G.g().migrateS(S).ok);
  assert.ok(S.W.clubs.ERMA && S.W.clubs.ERMA.lg==='ES', '應加入皇家馬德里');
  assert.strictEqual(Object.values(S.W.clubs).filter(c => c.lg==='DE').length, 18);
  if(S.lt) assert.ok(S.lt.T.ES && Object.keys(S.lt.T.ES).length===20, '應建立西甲積分榜');
});
console.log(`單元測試全部通過（${n} 項）`);
