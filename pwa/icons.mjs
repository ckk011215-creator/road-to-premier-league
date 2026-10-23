// 由像素公仔產生 PWA 圖示（不需要額外套件：自行編碼 PNG）
import { deflateSync } from 'node:zlib';
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for(let k=0;k<8;k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xFFFFFFFF; for(const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data){ const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); }
function png(w, h, px){ // px: (x,y) => [r,g,b,a]
  const raw = Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){ raw[y*(w*4+1)] = 0; for(let x=0;x<w;x++){ const [r,g,b,a] = px(x,y), o = y*(w*4+1)+1+x*4; raw[o]=r; raw[o+1]=g; raw[o+2]=b; raw[o+3]=a; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16), 255];
const PAL = { h:'#2a1d14', s:'#e0ac80', k:'#1b1f2a', j:'#f2b705', J:'#a67c00', w:'#f4f4ee', g:'#f2b705', b:'#222222' };
const SPR = ['...hhhh...','..hhhhhh..','..hsssss..','..sksssk..','..ssssss..','...ssss...','.jjjjjjjj.','sjjJjjJjjs','sjjjjjjjjs','.jjjjjjjj.','..wwwwww..','..ww..ww..','..gg..gg..','.bbb..bbb.'];
const BALL = ['..kkkk..','.kwwkwk.','kwwkkwwk','kwwwwwwk','kwkwwkwk','kwwkkwwk','.kwwwwk.','..kkkk..'];
/* 32×32 的像素畫布，再放大 */
export function iconPNG(size, maskable){
  const G = 32, grid = Array.from({ length:G }, () => Array(G).fill(null));
  const put = (spr, ox, oy) => spr.forEach((row, y) => [...row].forEach((ch, x) => { if(ch!=='.' && PAL[ch]) grid[oy+y][ox+x] = PAL[ch]; }));
  const off = maskable ? 0 : 0; put(SPR, 8+off, 12); put(BALL, 19, 18);
  const bg = hex('#111A2E'), pitch = hex('#2E7D4F'), sc = size / G;
  return png(size, size, (x, y) => { const gx = Math.floor(x/sc), gy = Math.floor(y/sc), c = grid[gy] && grid[gy][gx];
    if(c) return hex(c);
    if(!maskable){ const r = size*0.18, cx = Math.min(x, size-1-x), cy = Math.min(y, size-1-y); if(cx < r && cy < r && Math.hypot(r-cx, r-cy) > r) return [0,0,0,0]; }
    return gy >= 26 ? pitch : bg; });
}
