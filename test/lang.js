// 語言檢查：跑多段生涯，收集所有顯示文字，找出口語字同英文字
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = require('./engine').engineSrc();
const ctx = { console, Math, JSON, Object, Array, String, Number, Date, Set }; vm.createContext(ctx);
vm.runInContext(src + '\n;this.__get = () => ({ S, newGame, newTerm, advance, POS_ORDER, FIRST, LAST });', ctx);
const texts = new Set(); let pending = [], ended = null;
const add = s => { if(s) texts.add(String(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()); };
ctx.UI = { newPage:add, save(){}, play(){}, autoSim(){ return false; }, idle(){ pending.push(() => ctx.__get().advance()); }, card(t,ti,h){ add(ti); add(h); }, choose(p,o){ add(p); o.forEach(x=>{add(x.t);add(x.s);}); o=o.filter(x=>x.f); pending.push(()=>{ const ok=o.filter(x=>!(x.warn)); (ok.length?ok:o)[Math.floor(Math.random()*(ok.length||o.length))].f(); }); },
  pick(p,items,n,cb){ add(p); items.forEach(x=>{add(x.t);add(x.s);}); pending.push(()=>cb(items.map((x,i)=>i).filter(i=>!items[i].dis).slice(0,n))); }, end(){ ended=1; } };
const g = ctx.__get(), cities = ['LDN','MAN','LIV','BHM','LDS','NCL','BRS','NOT','SOT','NWC','SHF','TWN'];
for(let i=0;i<+(process.argv[2]||120);i++){ ended=null; pending=[];
  g.newGame({ seed:'lang'+i, first:g.FIRST[i%40], last:g.LAST[i%40], bm:i%12, fatherH:172+i%18, motherH:160+i%12, body:'even', foot:['R','L','B'][i%3], posTrait:['disc','big','fighter','cool','bold','leader'][i%6], negTrait:['lazy','nerves','fragile','hothead','shy','selfish'][(i+1)%6], city:cities[i%12], wealth:i%4, heritage:i%2?'none':['IRL','HKG','BR','NG','JP'][i%5], fav:'ARS', posPref:g.POS_ORDER[i%8] });
  ctx.__get().newTerm(); ctx.UI.idle(); let s=0; while(pending.length && !ended && s<20000){ pending.shift()(); s++; } }
const marks = /[嘅係唔冇佢咗喺嚟啲嗰揀撳俾睇諗搵攞拎咁啱晒嘢乜仲瞓嬲畀噃喇吖囉啦㗎喎咩嘞攰甩郁黐掟慳蝕哋埋咪噉冚揸啩]/;
const ALLOW = /Match of the Day|Category|GCSE|A\*|Scholarship|college|Boxing Day|U\d+|PL2|FA Youth Cup|FA Cup|PFA|BTEC|Distinction|St George's Park|VS|tiki-taka|Catenaccio|potrero|garra|£[\d.]+[km]?/g;
const bad = [...texts].filter(t => marks.test(t.replace(/關係/g,'')) || /[A-Za-z]{2,}/.test(t.replace(ALLOW,'')));
console.log('文字條目', texts.size, '有問題', bad.length); bad.slice(0,40).forEach(t => console.log(' ·', t.slice(0,140)));
