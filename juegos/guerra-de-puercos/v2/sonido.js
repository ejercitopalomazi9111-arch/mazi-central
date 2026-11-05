/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LOS SONIDOS, HECHOS CON EL NAVEGADOR
   Sin archivos: el rasgado es ruido filtrado, el volteo un soplido, la carta
   buena una campanita. Así el juego pesa lo mismo con sonido que sin él.
   ⚠ El iPhone no suena hasta que alguien SUELTA un toque (CLAUDE.md, VS
   TILES): `despertar()` se llama en cada `pointerup` y nunca se espera.
   ═══════════════════════════════════════════════════════════════════════════ */
let ctx = null, apagado = false;
try{ apagado = localStorage.getItem('puercos2_mudo') === '1'; }catch(e){}
export const estaApagado = () => apagado;
export function alternar(){ apagado = !apagado; try{ localStorage.setItem('puercos2_mudo', apagado ? '1' : '0'); }catch(e){} return apagado; }
export function despertar(){
  try{
    if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if(ctx.state === 'suspended') ctx.resume();
  }catch(e){}
}
addEventListener('pointerup', despertar, { passive: true });
addEventListener('click', despertar, { passive: true });

function tono({ f = 440, a = 0, d = .18, tipo = 'sine', vol = .4, hasta = null }){
  if(!ctx || apagado) return;
  const t = ctx.currentTime + a, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t); if(hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + .05);
}
function ruido({ a = 0, d = .2, vol = .3, de = 800, hasta = 4000, q = .7 }){
  if(!ctx || apagado) return;
  const t = ctx.currentTime + a, n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
  for(let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(de, t); f.frequency.exponentialRampToValueAtTime(hasta, t + d);
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(ctx.destination); s.start(t);
}

export const SON = {
  toque(){ tono({ f: 520, d: .07, tipo: 'triangle', vol: .18 }); },
  rasga(u){ ruido({ d: .09, vol: .18 + u * .2, de: 1200 + u * 2000, hasta: 3000 + u * 3000, q: 1.4 }); },
  abre(){ ruido({ d: .35, vol: .45, de: 900, hasta: 6000, q: .9 }); tono({ f: 300, d: .3, tipo: 'sine', vol: .15, hasta: 700 }); },
  saca(){ ruido({ d: .25, vol: .25, de: 400, hasta: 1800, q: .6 }); },
  sube(){ ruido({ d: .14, vol: .15, de: 600, hasta: 2400, q: 1 }); },
  volteo(){ ruido({ d: .16, vol: .25, de: 2500, hasta: 700, q: .8 }); },
  normal(){ tono({ f: 660, d: .16, tipo: 'triangle', vol: .2 }); },
  rara(){ [660, 880].forEach((f, i) => tono({ f, a: i * .07, d: .25, tipo: 'triangle', vol: .22 })); },
  epica(){ [523, 659, 784, 1046].forEach((f, i) => tono({ f, a: i * .07, d: .4, tipo: 'triangle', vol: .24 })); },
  legendaria(){ [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tono({ f, a: i * .08, d: .6, tipo: 'sawtooth', vol: .1 })); ruido({ a: .1, d: .8, vol: .2, de: 3000, hasta: 9000 }); },
  aterriza(){ tono({ f: 180, d: .09, tipo: 'sine', vol: .25, hasta: 90 }); },
  moneda(){ tono({ f: 1320, d: .08, tipo: 'square', vol: .08 }); tono({ f: 1760, a: .07, d: .12, tipo: 'square', vol: .08 }); },
  error(){ tono({ f: 220, d: .16, tipo: 'square', vol: .1, hasta: 160 }); },
  choque(){ ruido({ d: .3, vol: .5, de: 200, hasta: 1200, q: .5 }); tono({ f: 110, d: .3, tipo: 'sine', vol: .4, hasta: 50 }); },
  forcejeo(){ ruido({ d: .12, vol: .12, de: 300, hasta: 600, q: 2 }); },
  rompe(){ ruido({ d: .5, vol: .5, de: 3000, hasta: 300, q: .6 }); },
  golpe(){ tono({ f: 90, d: .35, tipo: 'sine', vol: .5, hasta: 40 }); ruido({ d: .2, vol: .3, de: 500, hasta: 200 }); },
  roba(){ ruido({ d: .12, vol: .16, de: 1500, hasta: 3500, q: 1.2 }); },
  gana(){ [523, 659, 784, 1046, 1318].forEach((f, i) => tono({ f, a: i * .1, d: .5, tipo: 'triangle', vol: .22 })); },
  pierde(){ [392, 349, 311, 262].forEach((f, i) => tono({ f, a: i * .14, d: .4, tipo: 'triangle', vol: .2 })); },
};
