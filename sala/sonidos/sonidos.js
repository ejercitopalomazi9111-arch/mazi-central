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

function contexto(){
  if(!ctx){
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return null;
    ctx = new C(); maestro = ctx.createGain(); maestro.gain.value = .9; maestro.connect(ctx.destination);
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
/* sonar: vol de 0 a 1; tono 1 = normal (combo más alto mientras más largo); cada = ms mínimos entre dos iguales */
export function sonar(nombre, { vol = .7, tono = 1, cada = 40 } = {}){
  if(!encendido) return;
  const c = contexto(); if(!c) return;
  const ahora = performance.now();
  if(ahora - (ultimo.get(nombre) || 0) < cada) return;
  ultimo.set(nombre, ahora);
  const b = buffers.get(nombre);
  if(!b){ cargar(nombre); return; }
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = b; s.playbackRate.value = tono; g.gain.value = vol;
  s.connect(g).connect(maestro); s.start();
}
/* el primer toque despierta el audio y trae todos los sonidos */
function despertar(){ contexto(); precargar(); }
for(const ev of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, despertar, { once: true, passive: true });
