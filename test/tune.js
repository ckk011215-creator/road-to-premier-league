// 難度調校：兩條程序並行跑模擬，統計各關卡通過率
// 用法：node test/tune.js <難度> <局數> [--full]
const { spawn } = require('child_process'), path = require('path');
const [diff = 'normal', N = 200] = process.argv.slice(2); const full = process.argv.includes('--full');
const W = 2, per = Math.ceil(+N / W);
const run = k => new Promise(res => { let out = '';
  const ch = spawn('node', [path.join(__dirname, 'sim.js'), String(per), `--diff=${diff}`, `--from=${k*per + (+process.env.FROM || 100000)}`, '--json', ...(full ? [] : ['--fast'])]);
  ch.stdout.on('data', d => out += d); ch.on('close', () => { const l = out.trim().split('\n').filter(x => x.startsWith('{')).pop(); res(l ? JSON.parse(l) : null); }); });
Promise.all(Array.from({ length:W }, (_, k) => run(k))).then(rs => {
  const t = rs.filter(Boolean).reduce((a, r) => { for(const k in r) a[k] = (a[k]||0) + r[k]; return a; }, {});
  const p = k => (100*t[k]/t.N).toFixed(k==='pl' || k==='efl' || k==='pro' ? 2 : 1) + '%';
  console.log(`${diff} N=${t.N} 錯誤=${t.err}｜學院 ${p('aca')}｜Scholarship ${p('sch')}｜職業 ${p('pro')}（經學徒 ${p('proS')}）｜英足聯 ${p('efl')}｜英超 ${p('pl')}`);
});
