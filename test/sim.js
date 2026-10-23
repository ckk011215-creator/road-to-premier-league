// 自動模擬：用隨機（略偏好訓練）嘅選擇跑 N 段生涯，統計各關卡通過率
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = require('./engine').engineSrc();
const FORCE_POS = (process.argv.find(a=>a.startsWith('--pos='))||'').slice(6) || null;
const SMART = process.argv.includes('--smart');
const N = +process.argv[2] || 300, VERBOSE = process.argv.includes('-v');
const FAST = process.argv.includes('--fast'), FROM = +((process.argv.find(a=>a.startsWith('--from='))||'').slice(7) || 0), JSONOUT = process.argv.includes('--json');

function makeCtx(){
  const ctx = { console, Math, JSON, Object, Array, String, Number, Date, Set };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__keys = () => keyAttrs().slice(0,3).map(k=>ATTR_N[k]); this.__get = () => ({ S, hireAgent, buyLife, askAgent, LIFE, newGame, newTerm, advance, evaluate, ovr, E, perf, POS_ORDER });', ctx);
  return ctx;
}
const ctx = makeCtx();
if(process.env.DIFFX){ const d = (process.argv.find(a=>a.startsWith('--diff='))||'').slice(7)||'normal'; vm.runInContext(`Object.assign(DIFF['${d}'], ${process.env.DIFFX})`, ctx); }
const AUTO = process.argv.includes('--auto'); let advCount = 0;
let pending = [], ended = null, cards = []; const TT = {}, PK = []; const OBJ = { n:0, ok:0, all:0, full:0, ag:0 }, MONEY = [];
ctx.UI = {
  newPage(){}, save(){}, play(){}, autoSim(){ return AUTO; }, idle(){ pending.push(() => { advCount++; const G = ctx.__get(), S = G.S; if(S && S.stage==='PRO' && !S.done){ if(!S.agent && Math.random()<0.05) G.hireAgent(['big','indie','dad'][Math.floor(Math.random()*3)]); if(S.agent && Math.random()<0.03) G.askAgent(); if(Math.random()<0.04){ const x = G.LIFE[Math.floor(Math.random()*G.LIFE.length)]; G.buyLife(x.id); } } G.advance(); }); },
  card(tone, title, html){ const mt = /^(\d+ )?(世界盃|歐洲國家盃)：(.+)$/.exec(title||''); if(mt) TT[mt[3]] = (TT[mt[3]]||0)+1; if(/^(球會易主|財政危機|互射十二碼|外圍賽)$|外圍賽$/.test(title||'')) TT[title.replace(/^\d+ /,'')] = (TT[title.replace(/^\d+ /,'')]||0)+1; if(/^FA Cup冠軍$|^聯賽盃冠軍$|^FA Cup晉級$|^聯賽盃晉級$|^FA Cup出局$|^聯賽盃出局$|^夏季轉會動態$|^賽後訪問$|^帶傷上陣？$|^代言邀請$|^球會傳奇$|^多年以後$|^十年老臣$|^片段爆紅$|^網上惡評$|^舊帖文被翻出$|^傷勢惡化$|^帶傷作戰$|^換帥$|^解鎖特技：|^宿敵對決$|^同屆之爭$|^宿敵登場$|^宿敵同場$|^PFA 年度最佳年輕球員$|^遠赴|^回到英格蘭$|^降班條款$|^(國王盃|意大利盃|德國盃|法國盃)冠軍$|^異鄉的第一個夏天$/.test(title||'')) TT[title] = (TT[title]||0)+1; if(/^賽季目標(結算|全部)/.test(title)){ const h = String(html); OBJ.n++; OBJ.ok += (h.match(/✓/g)||[]).length; OBJ.all += (h.match(/[✓✗]/g)||[]).length; if(title.includes('全部')) OBJ.full++; } if(/經紀人帶來報價|經紀人回報/.test(title)) OBJ.ag++; if(VERBOSE) cards.push(`[${tone}] ${title}: ${String(html).replace(/<[^>]+>/g,' ').slice(0,120)}`); },
  choose(title, opts){ opts=opts.filter(x=>x.f); pending.push(() => {
    let ok = opts.filter(o => !(o.warn && /放棄|退役/.test(o.t)));
    if(!ok.length) ok = opts;
    const S = ctx.__get().S;
    const ret = opts.find(o => /退役/.test(o.t)); if(ret && S.age>=34 && Math.random()<0.5) return ret.f();
    const main = ok.find(o=>o.main);
    (main && Math.random()<0.4 ? main : ok[Math.floor(Math.random()*ok.length)]).f();
  }); },
  pick(title, items, n, cb){ pending.push(() => { const idx = items.map((x,i)=>i).filter(i=>!items[i].dis); idx.sort(()=>Math.random()-0.5);
    if(SMART){ const keys = ctx.__keys(); idx.sort((a,b)=>score(items[b])-score(items[a])); function score(it){ return (it.tags||[]).filter(t=>keys.includes(t)).length + Math.random()*0.5; } }
    cb(idx.slice(0,n)); }); },
  end(ev){ ended = ev; }
};
const g = ctx.__get();
const stats = { aca:0, sch:0, pro:0, efl:0, pl:0, tiers:{}, ovr18:[], ovr24:[], errors:0, plApps:[] };
const pots = ['early','norm','late','random'], cities = ['LDN','MAN','LIV','BHM','LDS','NCL','BRS','NOT','SOT','NWC','SHF','TWN'];
for(let i=FROM;i<FROM+N;i++){
  ended = null; pending = []; cards = [];
  const cfg = { seed:'sim'+i, first:'Test', last:'Player', bm:Math.floor(Math.random()*12), mat:pots[i%4], fatherH:170+Math.floor(Math.random()*20), motherH:158+Math.floor(Math.random()*16),
    body:['lean','even','solid','stocky'][i%4], foot:['R','L','B'][i%3], pers:{conf:3,disc:3,comp:3,grit:3,calm:3}, city:cities[i%cities.length], wealth:i%3, parent:['support','pushy','study','distant'][i%4],
    sib:['none','bro','sis','young'][i%4], car:i%5!==0, heritage:i%3?'none':'IRL', born:'ENG', school:'state', fav:'ARS', diff:(process.argv.find(a=>a.startsWith('--diff='))||'').slice(7)||'normal', posPref:FORCE_POS || (i%2?'none':g.POS_ORDER[i%8]) };
  try{
    g.newGame(cfg); g.newTerm(); advCount = 0; ctx.UI.idle();
    let steps = 0, seenAca=false, seenSch=false, seenPro=false, o18=null, o24=null;
    while(pending.length && !ended && steps < 40000){ const f = pending.shift(); f(); steps++;
      const S = ctx.__get().S;
      if(S.stage==='ACA') seenAca = true; if(S.stage==='SCH') seenSch = true; if(S.flags && S.flags.proSigned) seenPro = true;
      if(S.age===18 && o18===null) o18 = g.ovr(); if(S.age===24 && o24===null) o24 = g.ovr();
      if(FAST && (S.age>=31 || (S.hist && S.hist.some(r=>r.lg==='PL'&&r.app>0)))){ ended = ended || { tier:'(fast)', pl:{ app:0 } }; break; }
    }
    const S = ctx.__get().S;
    stats.steps=(stats.steps||0)+steps; stats.adv=(stats.adv||0)+advCount; if(!ended){ console.log('NOT ENDED', i, 'steps', steps, 'age', S.age, S.stage, 'pending', pending.length); stats.errors++; continue; }
    if(seenAca) stats.aca++; if(seenSch) stats.sch++; if(seenPro) stats.pro++; if(seenPro && seenSch) stats.proS=(stats.proS||0)+1;
    if(S.hist.some(r=>['PL','CH','L1','L2'].includes(r.lg)&&r.app>0)) stats.efl++;
    if(S.hist.some(r=>r.lg==='PL'&&r.app>0)){ stats.pl++; if(process.env.PLDUMP) console.error('PL', i, S.log.filter(l=>/學院|Scholarship|職業合約|加盟|外借|首秀|續約/.test(l.t)).map(l=>`${l.age}:${l.t}`).join(' / '), '|', S.hist.filter(r=>r.app>0).map(r=>`${r.age}${r.lg}${r.loan?'借':''}:${r.app}`).join(' ')); }
    if(S.hist.some(r=>['ES','IT','DE','FR'].includes(r.lg)&&r.app>0)) stats.abroad=(stats.abroad||0)+1; if(S.flags.returned) stats.ret=(stats.ret||0)+1;
    stats.tiers[ended.tier] = (stats.tiers[ended.tier]||0)+1;
    if(o18!==null) stats.ovr18.push(o18); if(o24!==null) stats.ovr24.push(o24);
    stats.plApps.push(ended.pl.app); PK.push({ p:S.pst||{}, per:Object.fromEntries(Object.entries(S.perks||{}).map(([k,y])=>[k, y-(S.year-S.age)])), pos:S.pos }); MONEY.push(Math.round(S.money||0)); stats.life = (stats.life||0) + Object.keys(S.life||{}).length;
    if(VERBOSE && i<2){ console.log(S.log.map(l=>`${l.age}: ${l.t}`).join('\n')); console.log(S.hist.map(r=>`${r.age} ${r.club} ${r.lg} ${r.role} ${r.app}/${r.g}/${r.a} ${r.rt}`).join('\n')); console.log(ended); }
  } catch(e){ stats.errors++; console.log('ERROR seed', i, e.stack.split('\n').slice(0,4).join('\n')); if(stats.errors>5) break; }
}
if(JSONOUT){ console.log(JSON.stringify({ N, aca:stats.aca, sch:stats.sch, pro:stats.pro, proS:stats.proS||0, efl:stats.efl, pl:stats.pl, err:stats.errors })); process.exit(0); }
const pct = x => (100*x/N).toFixed(1)+'%';
const q = (a,p) => { const s=a.slice().sort((x,y)=>x-y); return s.length? s[Math.floor(p*(s.length-1))].toFixed(1):'-'; };
console.log(`N=${N} errors=${stats.errors} 平均操作數=${(stats.steps/N).toFixed(0)}（其中推進 ${(stats.adv/N).toFixed(0)}）`);
console.log(`入學院 ${pct(stats.aca)}｜scholarship ${pct(stats.sch)}｜職業約 ${pct(stats.pro)}｜踢過 EFL/英超 ${pct(stats.efl)}｜踢過英超 ${pct(stats.pl)}`);
console.log(`海外上陣 ${pct(stats.abroad||0)}｜回流 ${pct(stats.ret||0)}`);
console.log('評級', stats.tiers);
console.log('18 歲綜合 p10/p50/p90', q(stats.ovr18,.1), q(stats.ovr18,.5), q(stats.ovr18,.9), '｜24 歲', q(stats.ovr24,.1), q(stats.ovr24,.5), q(stats.ovr24,.9));

MONEY.sort((a,b)=>a-b); console.log('目標', JSON.stringify(OBJ), '達成率', (OBJ.ok/Math.max(1,OBJ.all)*100).toFixed(1)+'%', '退役存款 p50/p90', MONEY[MONEY.length>>1], MONEY[Math.floor(MONEY.length*0.9)], '生活項目', stats.life);
console.log('大賽與球會', JSON.stringify(TT));
{ const keys = ['bG','sp','D','S','trail','bigM','subGA','iron','rv']; const q=(a,f)=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor(a.length*f)]};
  console.log('pst 退役時 p25/p50/p75', keys.map(k=>`${k}:${q(PK.map(x=>x.p[k]||0),.25)}/${q(PK.map(x=>x.p[k]||0),.5)}/${q(PK.map(x=>x.p[k]||0),.75)}`).join(' '));
  const ids = [...new Set(PK.flatMap(x=>Object.keys(x.per)))]; console.log('特技 解鎖率/中位年齡', ids.map(id=>{const a=PK.filter(x=>x.per[id]!=null).map(x=>x.per[id]); return `${id}:${Math.round(a.length/PK.length*100)}%@${q(a,.5)}`}).join(' ')); }
