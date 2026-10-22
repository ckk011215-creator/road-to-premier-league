// 測試用模擬器：在 Node 中跑完整生涯（介面以簡化版代替，選擇以固定種子的隨機數決定，結果可重現）
const vm = require('vm');
const { engineSrc } = require('./engine');
const SRC = engineSrc();
function rng(seed){ let s = 0; for(const c of String(seed)) s = (s*31 + c.charCodeAt(0)) | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s>>>15, 1|s); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
function makeGame(opts = {}){
  const ctx = { console, Math, JSON, Object, Array, String, Number, Date, Set, Map };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\n;this.__g = () => ({ S, newGame, newTerm, advance, evaluate, migrateS, SAVE_VER, perkBonus, PERKS, dominance, setAttrSet, ovr, _s, setS:v => { S = v; }, setRs:v => { _s = v; } });', ctx);
  const rand = rng(opts.choiceSeed || 'choices'), out = { pending:[], ended:null, cards:[] };
  ctx.UI = {
    newPage(){}, save(){}, play(){}, autoSim(){ return !!opts.auto; },
    idle(){ out.pending.push(() => ctx.__g().advance()); },
    card(tone, title, html){ if(opts.cards) out.cards.push(title); },
    choose(title, list){ list = list.filter(x => x.f && !x.locked); out.pending.push(() => {
      let ok = list.filter(o => !(o.warn && /放棄|退役/.test(o.t))); if(!ok.length) ok = list;
      const pickFirst = opts.first; (pickFirst ? ok[0] : ok[Math.floor(rand()*ok.length)]).f(); }); },
    pick(title, items, n, cb){ out.pending.push(() => cb(items.map((x,i)=>i).filter(i=>!items[i].dis).slice(0,n))); },
    end(ev){ out.ended = ev; }
  };
  return { ctx, g:() => ctx.__g(), out };
}
const CFG = i => ({ seed:'t'+i, first:'測試', last:'球員', bm:i%12, mat:['early','norm','late','random'][i%4], fatherH:172+i%15, motherH:160+i%10,
  body:['lean','even','solid','stocky'][i%4], foot:['R','L','B'][i%3], pers:{conf:3,disc:3,comp:3,grit:3,calm:3},
  city:['LDN','MAN','LIV','BHM','LDS','NCL','BRS','NOT'][i%8], wealth:i%3, parent:['support','pushy','study','distant'][i%4], sib:['none','bro','sis','young'][i%4],
  car:i%5!==0, heritage:i%3?'none':'IRL', born:'ENG', school:'state', fav:'ARS', diff:'normal', posPref:['CB','FB','DM','CM','AM','W','ST','GK'][i%8] });
/* 跑一段生涯；stopAt(S) 傳回 true 時提早停止（例如測試存檔） */
function runCareer(i, opts = {}){
  const G = makeGame({ choiceSeed:'c'+i, ...opts }), g = G.g();
  g.newGame({ ...CFG(i), ...(opts.cfg||{}) }); g.newTerm(); G.ctx.UI.idle();
  const seen = { aca:false, pro:false };
  let steps = 0;
  while(G.out.pending.length && !G.out.ended && steps < 60000){
    G.out.pending.shift()(); steps++;
    const S = G.g().S; if(S.stage==='ACA') seen.aca = true; if(S.stage==='PRO' && !S.pro.semi) seen.pro = true;
    if(opts.stopAt && opts.stopAt(S)) break;
  }
  return { G, S:G.g().S, ended:G.out.ended, seen, steps };
}
module.exports = { makeGame, runCareer, CFG };
