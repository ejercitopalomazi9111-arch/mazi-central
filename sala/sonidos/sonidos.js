/* ══════════════════════════════════════════════════════════════════════════
   LOS SONIDOS DE LAS APPS · cualquier página los usa con `sonar('bien')`
   ──────────────────────────────────────────────────────────────────────────
   Los MP3 los hace `hacer.py` (aquí al lado), con su receta, y son nuestros.
   Reglas del flujo de sonido que pasó Carlos (herramientas/video/SONIDO.md):
   cada sonido tiene una función, los clics van discretos y nada tapa la voz.
   · El iPhone sólo deja sonar si el audio se despierta con un toque: el primer
     toque/clic de la página lo despierta y de paso baja todos los sonidos.
   · Un sonido que no ha llegado no se espera: se salta (la app nunca se traba).
   · `encender(false)` los apaga (el ajuste de cada app).
   ═════════════════════════════════════════════════════════════════════════ */
const BASE = new URL('./', import.meta.url);
export const TODOS = ['toque', 'pop', 'whoosh', 'golpe', 'bien', 'mal', 'logro', 'moneda', 'combo', 'hielo', 'voltear', 'subir'];
let ctx = null, encendido = true, maestro = null;
const buffers = new Map(), pidiendo = new Map();
const ultimo = new Map();

/* ── LA CADENA DE SALIDA (13 nov, Carlos: «variación en los sonidos, un mejor feeling, más smooth») ──
   Todo pasa por: un pasabajos suave (quita lo chillón), un compresor (dos sonidos juntos no
   truenan) y un poquito de cuarto (eco cortito hecho aquí mismo, al 14 %), que es lo que hace
   que suene «redondo» y no a clic de computadora. */
let seco = null;
function cuarto(c){
  const seg = 0.9, n = Math.floor(c.sampleRate * seg), ir = c.createBuffer(2, n, c.sampleRate);
  for(let k = 0; k < 2; k++){ const d = ir.getChannelData(k); for(let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) * .5; }
  const v = c.createConvolver(); v.buffer = ir; return v;
}
function contexto(){
  if(!ctx){
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return null;
    ctx = new C();
    maestro = ctx.createGain(); maestro.gain.value = .9;
    const suave = ctx.createBiquadFilter(); suave.type = 'lowpass'; suave.frequency.value = 9500; suave.Q.value = .5;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .2;
    seco = ctx.createGain(); seco.gain.value = 1;
    const eco = cuarto(ctx), mojado = ctx.createGain(); mojado.gain.value = .14;
    maestro.connect(suave); suave.connect(seco).connect(comp); suave.connect(eco).connect(mojado).connect(comp); comp.connect(ctx.destination);
  }
  if(ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function cargar(nombre){
  if(buffers.has(nombre)) return Promise.resolve(buffers.get(nombre));
  if(pidiendo.has(nombre)) return pidiendo.get(nombre);
  const c = contexto(); if(!c) return Promise.resolve(null);
  const p = fetch(new URL(nombre + '.mp3', BASE)).then((r) => r.ok ? r.arrayBuffer() : null)
    .then((ab) => ab && new Promise((ok, mal) => c.decodeAudioData(ab, ok, mal)))
    .then((b) => { if(b) buffers.set(nombre, b); return b; })
    .catch(() => null).finally(() => pidiendo.delete(nombre));
  pidiendo.set(nombre, p); return p;
}
export function precargar(nombres = TODOS){ return Promise.all(nombres.map(cargar)); }
export function encender(v){ encendido = !!v; }
export const estaEncendido = () => encendido;
/* ── LA VARIACIÓN ──
   Un sonido idéntico veinte veces seguidas cansa: el oído lo nota como «máquina». Cada vez:
   · el tono se mueve un poquito (±2.5 %) y el volumen otro poquito (±12 %), y se abre un pelo a
     la izquierda o a la derecha;
   · los que llevan escalera (bien, combo, moneda, pop) SUBEN por una escala pentatónica cuando
     caen seguidos (do re mi sol la…), y vuelven a empezar tras un rato de calma: cada acierto
     seguido suena más arriba, como un juego;
   · entra con un fundido de 4 ms y sale con otro: sin «clic» al arrancar ni al cortar. */
const ESCALA = [0, 2, 4, 7, 9, 12];
/* cuánto dura la escalera de cada uno: un acierto tarda en llegar, un «pop» no (combo ya sube solo) */
const ESCALERA = new Map([['bien', 15000], ['moneda', 2500], ['pop', 2500], ['toque', 900]]);
const racha = new Map();
const nota = new Map();
const ARRIBA = [7, 9, 12, 14, 16];   /* la pentatónica de arriba, donde se pasea un combo largo */
const azar = (r) => 1 + (Math.random() * 2 - 1) * r;
/* sonar: vol de 0 a 1; tono 1 = normal; cada = ms mínimos entre dos iguales; fijo = sin variación */
export function sonar(nombre, { vol = .7, tono = 1, cada = 40, fijo = false } = {}){
  if(!encendido) return;
  const c = contexto(); if(!c) return;
  const ahora = performance.now();
  const antes = ultimo.get(nombre) || 0;
  if(ahora - antes < cada) return;
  ultimo.set(nombre, ahora);
  if(nombre === 'mal') racha.set('bien', -1);   /* fallar regresa la escalera de aciertos al inicio */
  const b = buffers.get(nombre);
  if(!b){ cargar(nombre); return; }
  let semis = 0;
  if(ESCALERA.has(nombre) && !fijo){
    const r = ahora - antes < ESCALERA.get(nombre) ? (racha.get(nombre) ?? -1) + 1 : 0, tope = nombre === 'toque' ? 2 : ESCALA.length - 1;
    racha.set(nombre, r);
    if(r <= tope) semis = ESCALA[r];
    else {
      /* ya arriba (Carlos, 13 nov: «el agudo se queda pegado»): pasea por la pentatónica alta, sube y baja
         como melodía, nunca la misma nota dos veces seguidas y sin regresar al piso */
      const antes2 = nota.get(nombre) ?? ESCALA[tope], cerca = ARRIBA.filter((x) => x !== antes2 && Math.abs(x - antes2) <= 5);
      semis = cerca[Math.floor(Math.random() * cerca.length)];
    }
    nota.set(nombre, semis);
  }
  const t0 = c.currentTime, s = c.createBufferSource(), g = c.createGain();
  const p = c.createStereoPanner ? c.createStereoPanner() : null;
  s.buffer = b;
  s.playbackRate.value = tono * Math.pow(2, semis / 12) * (fijo ? 1 : azar(.025));
  const v = Math.max(0, Math.min(1, vol * (fijo ? 1 : azar(.12))));
  const dura = b.duration / s.playbackRate.value;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .004);
  g.gain.setValueAtTime(v, t0 + Math.max(.005, dura - .03)); g.gain.linearRampToValueAtTime(0, t0 + dura);
  /* el TIMBRE también cambia (Carlos, 13 nov: «si vas a repetir un sonido cambia el timbre, tono, etc.
     para que sea diferente cada vez»): cada vez un color distinto al de la vez anterior de ese sonido */
  let entrada = g;
  if(!fijo){
    const ya = colorAnterior.get(nombre), opciones = COLORES.filter((_, i) => i !== ya);
    const k = COLORES.indexOf(opciones[Math.floor(Math.random() * opciones.length)]); colorAnterior.set(nombre, k);
    entrada = COLORES[k](c, g, s, t0, dura, v);
  }
  if(p){ p.pan.value = fijo ? 0 : (Math.random() * 2 - 1) * .18; entrada.connect(p).connect(maestro); }
  else entrada.connect(maestro);
  s.connect(g);
  s.start(t0);
}
/* los colores: un filtro distinto, o una segunda voz (coro u octava) muy por debajo */
const colorAnterior = new Map();
const filtro = (c, tipo, f, q, gan) => { const b = c.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; if(gan != null) b.gain.value = gan; return b; };
const segunda = (c, s, t0, dura, v, cents, nivel) => {
  const s2 = c.createBufferSource(), g2 = c.createGain(); s2.buffer = s.buffer; s2.playbackRate.value = s.playbackRate.value * Math.pow(2, cents / 1200);
  g2.gain.setValueAtTime(0, t0); g2.gain.linearRampToValueAtTime(v * nivel, t0 + .006); g2.gain.linearRampToValueAtTime(0, t0 + Math.max(.02, dura * .9));
  s2.connect(g2); s2.start(t0); return g2;
};
const COLORES = [
  /* claro: brillo arriba */  (c, g) => g.connect(filtro(c, 'highshelf', 3800 + Math.random() * 1500, .7, 3 + Math.random() * 2)),
  /* cálido: menos agudos */ (c, g) => g.connect(filtro(c, 'lowpass', 3800 + Math.random() * 2500, .5)),
  /* nariz: un pico en medios */ (c, g) => g.connect(filtro(c, 'peaking', 900 + Math.random() * 1800, 1.4, 4 + Math.random() * 2)),
  /* coro: una segunda voz desafinada tantito */ (c, g, s, t0, dura, v) => { const m = c.createGain(); g.connect(m); segunda(c, s, t0, dura, v, 7 + Math.random() * 6, .45).connect(m); return m; },
  /* octava: un brillito una octava arriba */ (c, g, s, t0, dura, v) => { const m = c.createGain(); g.connect(m); segunda(c, s, t0, dura, v, 1200, .16).connect(m); return m; },
];
/* el primer toque despierta el audio y trae todos los sonidos */
function despertar(){ contexto(); precargar(); }
for(const ev of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, despertar, { once: true, passive: true });
