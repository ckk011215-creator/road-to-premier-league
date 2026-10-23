/* ================= 聲音：全部以 WebAudio 即時合成，不需要音效檔 ================= */
const AUD = { ctx:null, last:{}, music:null, master:null };
function ac(){
  if(!AUD.ctx){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; AUD.ctx = new C(); AUD.master = AUD.ctx.createGain(); AUD.master.gain.value = 0.7; AUD.master.connect(AUD.ctx.destination); }
  if(AUD.ctx.state === 'suspended') AUD.ctx.resume();
  return AUD.ctx;
}
function tone(c, f, d, { type='square', v=0.06, at=0, to=null, out=AUD.master } = {}){
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, t); if(to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
}
function noise(c, d, { v=0.2, at=0, f=1200, q=0.7, swell=0.05, type='bandpass' } = {}){
  const len = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), x = buf.getChannelData(0);
  for(let i=0;i<len;i++) x[i] = Math.random()*2 - 1;
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at;
  s.buffer = buf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + swell); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl); fl.connect(g); g.connect(AUD.master); s.start(t); s.stop(t + d + 0.05);
}
const SFX = {
  click:   c => tone(c, 880, 0.05, { v:0.03 }),
  kick:    c => { noise(c, 0.12, { v:0.35, f:180, type:'lowpass' }); tone(c, 120, 0.1, { type:'sine', v:0.15, to:60 }); },
  whistle: c => { [0, 0.18].forEach(at => { tone(c, 2200, 0.14, { type:'sine', v:0.05, at }); tone(c, 2260, 0.14, { type:'sine', v:0.03, at }); }); },
  whistle2:c => { [0, 0.22, 0.44].forEach((at,i) => tone(c, 2200, i===2 ? 0.5 : 0.16, { type:'sine', v:0.05, at })); },
  goal:    c => { noise(c, 2.2, { v:0.28, f:900, q:0.4, swell:0.35 }); [523, 659, 784, 1047].forEach((f,i) => tone(c, f, 0.35, { v:0.05, at:0.1 + i*0.09 })); },
  save:    c => { noise(c, 0.9, { v:0.18, f:700, q:0.5, swell:0.15 }); tone(c, 330, 0.25, { type:'triangle', v:0.08, to:440 }); },
  cheer:   c => { noise(c, 0.8, { v:0.12, f:1000, q:0.5, swell:0.2 }); tone(c, 660, 0.12, { v:0.04 }); tone(c, 880, 0.15, { v:0.04, at:0.1 }); },
  miss:    c => { noise(c, 0.7, { v:0.1, f:500, q:0.6, swell:0.1 }); tone(c, 330, 0.35, { type:'triangle', v:0.07, to:180 }); },
  level:   c => { [523, 659, 784, 1047, 1319].forEach((f,i) => tone(c, f, 0.18, { v:0.05, at:i*0.08 })); },
  coin:    c => { tone(c, 988, 0.08, { v:0.05 }); tone(c, 1319, 0.25, { v:0.05, at:0.08 }); }
};
function sfx(n){
  if(SET.sfx === false || (typeof UI !== 'undefined' && UI.auto && n !== 'level')) return;
  const now = performance.now(); if(now - (AUD.last[n]||0) < 200) return; AUD.last[n] = now;
  const c = ac(); if(!c || !SFX[n]) return; try{ SFX[n](c); }catch(e){}
}
/* ---------- 背景音樂：簡單的 8 小節循環（方波旋律＋三角波低音） ---------- */
const SONG = { bpm:108, lead:[76,79,81,79, 76,74,72,74, 76,79,81,83, 84,83,81,79, 77,76,74,72, 74,76,77,79, 81,79,77,76, 74,72,74,0],
  bass:[48,48,55,55, 45,45,52,52, 41,41,48,48, 43,43,50,50] };
const midi = n => 440 * Math.pow(2, (n-69)/12);
function musicStart(){
  if(AUD.music || SET.music !== true) return; const c = ac(); if(!c) return;
  const bus = c.createGain(); bus.gain.value = 0.35; bus.connect(AUD.master);
  const beat = 60 / SONG.bpm / 2; let step = 0, next = c.currentTime + 0.1;
  const tick = () => { while(next < c.currentTime + 0.4){ const l = SONG.lead[step % SONG.lead.length], b = SONG.bass[Math.floor(step/2) % SONG.bass.length];
      const at = next - c.currentTime; if(l) tone(c, midi(l), beat*0.9, { v:0.025, at, out:bus }); if(step % 2 === 0) tone(c, midi(b), beat*1.8, { type:'triangle', v:0.06, at, out:bus });
      step++; next += beat; } };
  AUD.music = { id:setInterval(tick, 100), bus }; tick();
}
function musicStop(){ if(!AUD.music) return; clearInterval(AUD.music.id); try{ AUD.music.bus.disconnect(); }catch(e){} AUD.music = null; }
/* 瀏覽器要求先有用戶操作才可播放聲音 */
document.addEventListener('pointerdown', () => { if(SET.music === true) musicStart(); }, { once:false, passive:true });
