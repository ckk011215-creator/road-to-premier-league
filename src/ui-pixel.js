/* ================= 像素美術：公仔、插圖、比賽動畫 ================= */
const PX = {};
/* 調色盤：k 外框、s 皮膚、h 頭髮、j 球衣、J 球衣深色、w 白、b 波鞋、g 襪、y 金、Y 深金、c 雲、r 紅、R 深紅、u 藍、p 紙、l 線、d 啡 */
PX.base = { k:'#1b1f2a', w:'#f4f4ee', b:'#222', y:'#f2b705', Y:'#a67c00', c:'#d9dee6', r:'#d8433a', R:'#8e2420', u:'#3d7bd9', p:'#f7f2e3', l:'#9aa3b0', d:'#7a5534', G:'#3d8c55' };
PX.sprites = {
  player: [
    '...hhhh...','..hhhhhh..','..hsssss..','..sksssk..','..ssssss..','...ssss...',
    '.jjjjjjjj.','sjjJjjJjjs','sjjjjjjjjs','.jjjjjjjj.','..wwwwww..','..ww..ww..','..gg..gg..','.bbb..bbb.' ],
  kick: [
    '...hhhh...','..hhhhhh..','..hsssss..','..sksssk..','..ssssss..','...ssss...',
    '.jjjjjjjj.','sjjJjjJjjs','sjjjjjjjjs','.jjjjjjjj.','..wwwwww..','..ww..www.','..gg...ggg','.bbb....bb' ],
  ball: [ '..kkkk..','.kwwkwk.','kwwkkwwk','kwwwwwwk','kwkwwkwk','kwwkkwwk','.kwwwwk.','..kkkk..' ],
  trophy: [ '..yyyyyyyy..','yyyyyyyyyyyy','y.yyyyyyyy.y','y.yyyYyyyy.y','.yyyyYyyyyy.','..yyyyyyyy..','...yyyyyy...','.....yy.....','.....yy.....','....yyyy....','...kkkkkk...','...kkkkkk...' ],
  boot: [ '......kkk...','.....kwwk...','....kwwwk...','kkkkkwwwk...','kbbbbbbbbkk.','kbbbbbbbbbbk','kkkkkkkkkkkk','.k.k.k.k.k..' ],
  rain: [ '....cccc....','..cccccccc..','.cccccccccc.','cccccccccccc','cccccccccccc','.cccccccccc.','............','.u...u...u..','u...u...u...','...u...u...u','..u...u...u.' ],
  paper: [ 'kkkkkkkk..','kppppppkk.','kpllllpppk','kppppppppk','kpllllllpk','kppppppppk','kpllllllpk','kppppppppk','kppppprrpk','kpppprpppk','kkkkkkkkkk' ],
  cross: [ '..wwwwww..','.wwwrrwww.','wwwwrrwwww','wwrrrrrrww','wwrrrrrrww','wwwwrrwwww','wwwwrrwwww','.wwwwwwww.','..wwwwww..' ],
  star: [ '.....y.....','....yyy....','....yyy....','yyyyyyyyyyy','.yyyyyyyyy.','..yyyyyyy..','..yyyyyyy..','.yyyy.yyyy.','.yyy...yyy.','yy.......yy' ],
  house: [ '.....rr.....','....rrrr....','...rrrrrr...','..rrrrrrrr..','.rrrrrrrrrr.','rrrrrrrrrrrr','.wwwwwwwwww.','.wuuwwwwuuw.','.wuuwddwuuw.','.wwwwddwwww.','.wwwwddwwww.' ],
  book: [ 'kkkkkkkkkkk.','kuuuuuuuuukk','kuuwwwwwuukp','kuuuuuuuuukp','kuuwwwwuuukp','kuuuuuuuuukp','kuuuuuuuuukp','kuuuuuuuuukp','kkkkkkkkkkkp','.ppppppppppp' ],
  shirt: [ '..kk....kk..','.kjjk..kjjk.','kjjjjkkjjjjk','kjjjjjjjjjjk','.kkjjjjjjkk.','..kjjjjjjk..','..kjjJJjjk..','..kjjjjjjk..','..kjjjjjjk..','..kkkkkkkk..' ],
  whistle: [ '..........kk','.........k.k','..kkkkkkkk..','.kllllllllk.','kllllkkllllk','kllllkkllllk','.kllllllllk.','..kkkkkkkk..' ],
  heart: [ '.rr...rr.','rrrr.rrrr','rrrrrrrrr','rrrrrrrrr','.rrrrrrr.','..rrrrr..','...rrr...','....r....' ],
  coin: [ '..YYYYYY..','.YyyyyyyY.','YyyYYYyyyY','YyyYyyyyyY','YyYYYYyyyY','YyyYyyyyyY','YyYYYYYyyY','.YyyyyyyY.','..YYYYYY..' ],
  bus: [ 'kkkkkkkkkkkk','kuuuuuuuuuuk','kuwwuwwuwwuk','kuwwuwwuwwuk','kuuuuuuuuuuk','kuuuuuuuuuuk','kkkkkkkkkkkk','.kk......kk.' ]
};
const KITS = ['#d8433a','#3d7bd9','#7fb3e8','#f4f4ee','#7b2340','#222','#f2b705','#6a3fb5','#1f3f8f','#e86fa0'];
const SKINS = ['#f1c9a5','#e0ac80','#c68863','#8d5a3b','#5e3a24'];
const HAIRS = ['#2a1d14','#5a3a1e','#9b6a35','#d6b25e','#1b1b1b','#b04a2a'];
function hashN(s){ let h = 2166136261; for(const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h,16777619); } return h>>>0; }
function shade(hex, f){ const n = parseInt(hex.slice(1),16); const r = Math.round(((n>>>16)&255)*f), g = Math.round(((n>>>8)&255)*f), b = Math.round((n&255)*f); return `rgb(${r},${g},${b})`; }
/* 球員外觀：由種子決定 */
function lookOf(seed){ const h = hashN(seed); return { s:SKINS[h%SKINS.length], h:HAIRS[(h>>>5)%HAIRS.length] }; }
function kitOf(id){ return KITS[hashN(id||'x')%KITS.length]; }
function palFor(kit, look){ const j = kit || '#f2b705'; return { ...PX.base, j, J:shade(j,0.7), s:look?look.s:SKINS[1], h:look?look.h:HAIRS[0], g:j, a:(look&&look.hb)||'#f4f4ee', t:'#2b3a55', b:(look&&look.bt)||PX.base.b }; }

/* ---------- 自訂外貌 ---------- */
const SKIN_OPTS = ['#f6d7bd','#f1c9a5','#e0ac80','#c68863','#a86f4c','#8d5a3b','#5e3a24','#3f2718'];
const HAIR_OPTS = ['#1b1b1b','#2a1d14','#5a3a1e','#9b6a35','#d6b25e','#f1e3b0','#b04a2a','#8f8f8f','#3d7bd9','#e86fa0'];
const BOOT_OPTS = [['#222','黑色'],['#f4f4ee','白色'],['#f2b705','金色'],['#5ee36a','螢光綠'],['#ff6fb5','粉紅'],['#3d7bd9','藍色'],['#ff7a1a','橙色']];
const BAND_OPTS = [['','沒有'],['#f4f4ee','白色'],['#1b1b1b','黑色'],['#d8433a','紅色'],['#f2b705','金色']];
/* 髮型：頭部六行（10 格闊） */
const HAIR_STYLES = {
  short:  { n:'短髮',   r:['...hhhh...','..hhhhhh..','..hsssss..','..sksssk..','..ssssss..','...ssss...'] },
  side:   { n:'側分',   r:['..hhhhh...','.hhhhhhh..','..hhssss..','..sksssk..','..ssssss..','...ssss...'] },
  buzz:   { n:'寸頭',   r:['..........','..hhhhhh..','..ssssss..','..sksssk..','..ssssss..','...ssss...'] },
  bald:   { n:'光頭',   r:['..........','..ssssss..','..ssssss..','..sksssk..','..ssssss..','...ssss...'] },
  long:   { n:'長髮',   r:['...hhhh...','..hhhhhh..','.hhsssshh.','.hskssskh.','.hssssssh.','.h.ssss.h.'] },
  afro:   { n:'爆炸頭', r:['..hhhhhh..','.hhhhhhhh.','.hhsssshh.','.hskssskh.','..ssssss..','...ssss...'] },
  mohawk: { n:'莫霍克', r:['....hh....','..sshhss..','..ssssss..','..sksssk..','..ssssss..','...ssss...'] },
  bun:    { n:'丸子頭', r:['....hh....','...hhhh...','..hhhhhh..','..sksssk..','..ssssss..','...ssss...'] },
  curly:  { n:'捲髮',   r:['..h.hh.h..','.hhhhhhhh.','..hshssh..','..sksssk..','..ssssss..','...ssss...'] }
};
/* 疊加：'_' 保留原本 */
const FACIAL = { none:{ n:'沒有', o:{} }, mous:{ n:'鬍子', o:{ 4:'____hh____' } }, goatee:{ n:'山羊鬚', o:{ 5:'____hh____' } }, beard:{ n:'絡腮鬍', o:{ 4:'__h____h__', 5:'___hhhh___' } } };
const TATTOO = { none:{ n:'沒有', o:{} }, left:{ n:'左臂', o:{ 7:'t_________', 8:'t_________' } }, both:{ n:'雙臂', o:{ 7:'t________t', 8:'t________t' } } };
function overlay(rows, o){ for(const r in o){ const s = o[r]; rows[r] = rows[r].split('').map((ch, i) => s[i]==='_' || s[i]===undefined ? ch : s[i]).join(''); } return rows; }
function lookRows(base, L){
  let rows = PX.sprites[base].slice(); const hs = (HAIR_STYLES[L.st] || HAIR_STYLES.short).r;
  for(let i=0;i<6;i++) rows[i] = hs[i];
  rows = overlay(rows, (FACIAL[L.f]||FACIAL.none).o);
  if(L.hb) rows = overlay(rows, { 2:'__aaaaaa__' });
  rows = overlay(rows, (TATTOO[L.tat]||TATTOO.none).o);
  return rows;
}
const lookKey = L => [L.st||'short', L.f||'none', L.hb||'', L.tat||'none'].join('-');
/* 註冊這個外貌的公仔，回傳 sprite 名稱 */
function lookSprite(base, L){ const nm = `${base}:${lookKey(L)}`; if(!PX.sprites[nm]) PX.sprites[nm] = lookRows(base, L); return nm; }
function defaultLook(seed){ return { ...lookOf(seed), st:'short', f:'none', hb:'', tat:'none', bt:'#222' }; }
const myLook = () => (S && S.look) || (S ? defaultLook(S.seed) : defaultLook('hero'));
function randLook(){ const r = a => a[Math.floor(Math.random()*a.length)];
  return { s:r(SKIN_OPTS), h:r(HAIR_OPTS.slice(0,8)), st:r(Object.keys(HAIR_STYLES)), f:Math.random()<0.6?'none':r(Object.keys(FACIAL)), hb:Math.random()<0.8?'':r(BAND_OPTS.slice(1))[0], tat:Math.random()<0.75?'none':r(['left','both']), bt:r(BOOT_OPTS)[0] }; }
function lookURL(L, kit, sc=3, kick=false){ return iconURL(lookSprite(kick?'kick':'player', L), palFor(kit, L), sc); }
function drawSprite(g, rows, pal, x, y, sc=1, flip=false){
  rows.forEach((row, r) => { for(let c=0; c<row.length; c++){ const ch = row[flip ? row.length-1-c : c]; if(ch==='.') continue; const col = pal[ch]; if(!col) continue; g.fillStyle = col; g.fillRect(x + c*sc, y + r*sc, sc, sc); } });
}
const ICON_CACHE = {};
function iconURL(name, pal, sc=3){
  const key = name + JSON.stringify(pal||{}) + sc; if(ICON_CACHE[key]) return ICON_CACHE[key];
  const rows = PX.sprites[name], w = Math.max(...rows.map(r=>r.length)), h = rows.length;
  const cv = document.createElement('canvas'); cv.width = w*sc; cv.height = h*sc;
  drawSprite(cv.getContext('2d'), rows, pal || PX.base, 0, 0, sc);
  return ICON_CACHE[key] = cv.toDataURL();
}
/* 卡片插圖：按事件或者標題配對 */
const EVENT_ICON = { '雨天取消':'rain','場邊的父親':'whistle','鐵籠足球':'ball','小息網球':'ball','學期中訓練營':'star','另一支球隊招攬':'shirt','生日派對撞期盃賽':'heart','學校板球隊':'ball','本場由你把守球門':'shirt','哥哥的球友':'house','球鞋破了':'boot','後園練球':'house','區際學界選拔':'star','車程':'bus','測驗撞期訓練':'book','教練建議轉位':'shirt','對手高你一個頭':'ball','後園撲救':'house','教練叫你踢外場':'shirt','門將教練特訓':'whistle','經紀人登門':'paper','英格蘭青年隊訓練營':'star','GCSE 衝刺':'book','同學派對':'heart','片段走紅':'star','入住寄宿家庭':'house','清潔球鞋':'boot','隨一隊訓練':'whistle','學徒課程':'book','聖誕密集賽程':'ball','電台球迷熱線':'whistle','贏球之夜':'heart','老將指點':'star','新人獻唱':'heart','日間工作':'coin','指導小朋友':'ball' };
function iconFor(tone, title){
  if(!title) return null;
  if(EVENT_ICON[title]) return EVENT_ICON[title];
  if(/傷|復健|後遺症/.test(title)) return 'cross';
  if(/冠軍|獎|金靴|隊長/.test(title)) return 'trophy';
  if(/合約|Scholarship|簽|續約|放棄|保留|挖角|轉會|外借/.test(title)) return 'paper';
  if(/學院|試訓|發展中心|國家隊|U21/.test(title)) return 'shirt';
  if(/裝備|買/.test(title)) return 'coin';
  if(/GCSE|報告/.test(title)) return 'book';
  if(/序章/.test(title)) return 'house';
  if(tone==='gold') return 'star';
  return null;
}
const GK_KIT = '#7c5cff';   /* 門將球衣 */
function playerURL(sc=3, kick=false){ if(!S) return iconURL('player', palFor('#f2b705'), sc); return lookURL(myLook(), S.pos==='GK' ? GK_KIT : kitOf(S.stage==='PRO'?curClub():S.stage==='GR'?S.gr:S.aca&&S.aca.club), sc, kick); }

/* ---------- 關鍵時刻像素球場 ---------- */
const PITCH_W = 192, PITCH_H = 104;
function sceneLayout(scene, seed){
  const h = hashN(seed), jx = (h%24)-12;
  /* ATT／MID：攻上方龍門；DEF：守下方龍門 */
  /* GK：你在下方球門前，對方在禁區前起腳 */
  if(scene==='GK') return { goal:'bottom', me:[96, 90], ball:[98+jx, 56], opp:[[96+jx, 50],[56, 46]], mate:[[136, 70]], gk:null, keeper:true };
  if(scene==='DEF') return { goal:'bottom', me:[96+jx*0.5, 66], ball:[100+jx, 56], opp:[[100+jx, 48],[60, 40]], mate:[[150, 76]], gk:[96, 92] };
  if(scene==='MID') return { goal:'top', me:[96+jx, 64], ball:[102+jx, 70], opp:[[84+jx, 58],[112+jx, 60],[70, 30]], mate:[[150, 34],[46, 44]], gk:[96, 8] };
  return { goal:'top', me:[96+jx, 36], ball:[102+jx, 44], opp:[[80+jx, 30],[118+jx, 28]], mate:[[150, 48]], gk:[96, 8] };
}
function drawPxPitch(g, L){
  for(let i=0;i<8;i++){ g.fillStyle = i%2 ? '#3f8f4f' : '#479a57'; g.fillRect(0, i*13, PITCH_W, 13); }
  g.fillStyle = '#e8f0e0';
  const box = (y, top) => { g.fillRect(56, y, 80, 1); g.fillRect(56, top?0:y, 1, top?y:PITCH_H-y); g.fillRect(135, top?0:y, 1, top?y:PITCH_H-y); };
  if(L.goal==='top'){ box(26, true); g.fillRect(0,0,PITCH_W,1); g.fillStyle='#f4f4ee'; g.fillRect(78,0,36,3); g.fillStyle='#c9d3c4'; for(let x=79;x<113;x+=3) g.fillRect(x,0,1,3); }
  else { box(PITCH_H-26, false); g.fillRect(0,PITCH_H-1,PITCH_W,1); g.fillStyle='#f4f4ee'; g.fillRect(78,PITCH_H-3,36,3); g.fillStyle='#c9d3c4'; for(let x=79;x<113;x+=3) g.fillRect(x,PITCH_H-3,1,3); }
  if(L.goal==='top'){ g.fillStyle='#e8f0e0'; g.fillRect(0, PITCH_H-1, PITCH_W, 1); g.beginPath(); g.arc(96, PITCH_H+6, 18, Math.PI, 2*Math.PI); g.strokeStyle='#e8f0e0'; g.lineWidth=1; g.stroke(); }
}
function drawScene(cv, st, t){
  const g = cv.getContext('2d'), L = st.L; g.imageSmoothingEnabled = false;
  drawPxPitch(g, L);
  const bob = n => (Math.floor(t/280 + n) % 2);
  const myPal = palFor(st.kit, st.look), oppPal = palFor(st.oppKit, { s:SKINS[(st.h>>>3)%5], h:HAIRS[(st.h>>>7)%6] }), gkPal = palFor('#f08a24', { s:SKINS[(st.h>>>9)%5], h:HAIRS[(st.h>>>11)%6] });
  const P = (rows, pal, [x,y], n, flip) => drawSprite(g, rows, pal, Math.round(x-5), Math.round(y-14 + bob(n)), 1, flip);
  if(L.gk) P(PX.sprites.player, gkPal, L.gk, 3);
  L.opp.forEach((p,i) => P(PX.sprites.player, oppPal, p, i, i%2===0));
  const matePal = palFor(st.kit, { s:SKINS[(st.h>>>13)%5], h:HAIRS[(st.h>>>15)%6] });
  L.mate.forEach((p,i) => P(PX.sprites.player, matePal, p, i+2));
  P(PX.sprites[lookSprite(st.kicked ? 'kick' : 'player', st.look)], L.keeper ? palFor(GK_KIT, st.look) : myPal, L.me, 1);
  const b = st.ballPos || L.ball;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(Math.round(b[0])-2, Math.round(b[1])+3, 5, 1);
  drawSprite(g, PX.sprites.ball, PX.base, Math.round(b[0])-4, Math.round(b[1] - (st.lift||0))-4, 1);
}
function mountScene(card, scene, force){
  if(SET.anim===false && !force) return;
  const cv = document.createElement('canvas'); cv.width = PITCH_W; cv.height = PITCH_H; cv.className = 'pxpitch'; cv.setAttribute('aria-hidden','true');
  const wrap = document.createElement('div'); wrap.className = 'pxwrap'; wrap.appendChild(cv);
  const fx = document.createElement('div'); fx.className = 'pxfx'; wrap.appendChild(fx);
  card.querySelector('h4').after(wrap);
  const seed = (S?S.seed:'') + S.age + S.term + Math.random();
  const st = { L:sceneLayout(scene, seed), kit:kitOf(S.stage==='PRO'?curClub():S.stage==='GR'?S.gr:S.aca&&S.aca.club), oppKit:KITS[hashN(seed)%KITS.length], look:myLook(), h:hashN(seed) };
  if(st.oppKit===st.kit) st.oppKit = '#f4f4ee';
  card._px = { cv, st, fx, running:true };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = ts => { if(!card.isConnected || !card._px.running){ return; } drawScene(cv, st, calm ? 0 : ts); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
/* 選擇之後：皮球按結果飛行（門將撲救：成功飛向你，失敗入網） */
function playScene(card, r){
  const px = card && card._px; if(!px) return;
  const { st, fx } = px, L = st.L, from = (L.keeper && r.k!=='S') ? L.me.slice() : L.ball.slice();
  const goalY = L.goal==='top' ? 1 : PITCH_H-2;
  let to, lift = 0, label, cls;
  if(r.k==='S'){ to = r.ok ? [L.me[0], L.me[1]-8] : [L.me[0] + (st.h%2 ? -14 : 14), PITCH_H-2]; lift = 6; label = r.ok ? 'SAVE!' : 'CONCEDED'; }
  else if(r.k==='G'){ to = r.ok ? [90 + (st.h%14), goalY] : [r.ok ? 96 : (st.h%2 ? 70 : 124), L.goal==='top' ? -6 : PITCH_H+6]; lift = 8; label = r.ok ? 'GOAL!' : 'MISS'; }
  else if(r.k==='A'){ to = r.ok ? L.mate[0].slice() : L.opp[0].slice(); lift = 4; label = r.ok ? 'ASSIST!' : 'LOST IT'; }
  else if(r.k==='D'){ to = r.ok ? [st.h%2 ? 10 : 182, L.goal==='top' ? 60 : 30] : [96, goalY]; lift = r.ok ? 10 : 2; label = r.ok ? 'CLEARED!' : 'DANGER'; }
  else { to = r.ok ? L.mate[0].slice() : L.opp[0].slice(); label = r.ok ? 'NICE!' : 'TURNOVER'; }
  cls = r.ok ? 'ok' : 'ng';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches, dur = calm ? 0 : 750, t0 = performance.now();
  st.kicked = true;
  const step = now => { const k = dur ? Math.min(1, (now - t0)/dur) : 1, e = 1 - Math.pow(1-k, 2);
    st.ballPos = [from[0] + (to[0]-from[0])*e, from[1] + (to[1]-from[1])*e]; st.lift = Math.sin(Math.PI*k)*lift;
    if(k < 1) requestAnimationFrame(step); else { fx.textContent = label; fx.className = `pxfx show ${cls}`; setTimeout(() => { st.kicked = false; }, 400); } };
  requestAnimationFrame(step);
}
