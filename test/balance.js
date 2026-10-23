// 平衡測試：跑一批生涯，確認沒有錯誤、主要通過率在合理範圍
const { runCareer } = require('./harness');
const N = +process.argv[2] || 80;
let aca = 0, pro = 0, pl = 0, done = 0, err = 0;
for(let i=0;i<N;i++){
  try{ const r = runCareer(100+i); if(!r.ended){ err++; console.log('未完結', i, r.S.age, r.S.stage); continue; }
    done++; if(r.seen.aca) aca++; if(r.S.flags.proSigned) pro++; if(r.S.hist.some(h => h.lg==='PL' && h.app>0)) pl++; }
  catch(e){ err++; console.log('錯誤', i, e.stack.split('\n').slice(0,3).join(' | ')); }
}
const p = x => Math.round(x/N*100);
console.log(`N=${N} 錯誤 ${err}｜入學院 ${p(aca)}%｜職業 ${p(pro)}%｜踢過英超 ${p(pl)}%`);
const bad = [];
if(err) bad.push('有錯誤或未完結的生涯');
if(p(aca) < 18 || p(aca) > 55) bad.push('入學院比例異常');   /* 標準難度目標約 35% */
if(p(pro) < 22 || p(pro) > 60) bad.push('職業合約比例異常');   /* 目標約 40% */
if(p(pl) < 4 || p(pl) > 30) bad.push('英超比例異常');   /* 目標約 15% */
if(bad.length){ console.log('✗', bad.join('；')); process.exit(1); }
console.log('✓ 平衡測試通過');
