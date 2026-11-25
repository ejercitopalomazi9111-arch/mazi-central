/* personaje-vivo.js — TU PERSONAJE, VIVO (Carlos, 13 nov: «que el personaje del usuario pueda parpadear,
 * reaccionar a las respuestas, reaccionar a si sube o baja de nivel… aviéntate un muy buen sistema de todo»)
 * ===========================================================================
 * El dibujo es el mismo Avataaars del vestidor (vendor/avatar.js): aquí sólo se le cambian los OJOS, la
 * BOCA y las CEJAS según lo que siente, y el cuerpo se mueve con CSS (index.html, «.pv»). Nada se dibuja
 * a mano: cada gesto es una variante que ya trae el paquete.
 *
 *   configurarPersonaje({ personaje, svg })   una vez: de dónde sale tu personaje y quién lo dibuja
 *   personajeVivo(caja, { tam })              lo pone vivo en esa caja: respira, parpadea, mira de lado,
 *                                             se duerme si no tocas nada y despierta asustado al tocar
 *   reaccion(tipo, { cameo })                 todos los que estén a la vista reaccionan; con «cameo», si no
 *                                             hay ninguno a la vista, se asoma uno por la esquina un momento
 *
 * Los tipos: bien, combo, mal, mareado (tres mal seguidas), piensa, sube (nivel, grado, ranking), baja
 * (perdiste la racha, te pasaron en el ranking), racha, perfecto, regular, sorpresa, guino.
 * Con «reducir movimiento» la cara sí cambia (es información) pero el cuerpo no brinca.
 * ===========================================================================*/
import { alMuelle } from './muelle.js';

/* las caras: sólo lo que cambia respecto a como lo vestiste */
const CARAS = {
  parpadeo: { ojos: 'closed' },
  mira: { ojos: 'side' },
  bien: { ojos: 'happy', boca: 'smile', cejas: 'raisedExcited' },
  combo: { ojos: 'hearts', boca: 'twinkle', cejas: 'raisedExcited' },
  mal: { ojos: 'squint', boca: 'concerned', cejas: 'sadConcerned' },
  mareado: { ojos: 'xDizzy', boca: 'grimace', cejas: 'frownNatural' },
  piensa: { ojos: 'side', boca: 'serious', cejas: 'upDownNatural' },
  sube: { ojos: 'happy', boca: 'screamOpen', cejas: 'raisedExcited' },
  baja: { ojos: 'cry', boca: 'sad', cejas: 'sadConcerned' },
  sorpresa: { ojos: 'surprised', boca: 'disbelief', cejas: 'raisedExcited' },
  guino: { ojos: 'wink', boca: 'smile', cejas: 'defaultNatural' },
  duerme: { ojos: 'closed', boca: 'serious', cejas: 'defaultNatural' },
  /* para el «ya casi»: no llora, se queda pensando y con media sonrisa */
  animo: { ojos: 'default', boca: 'smile', cejas: 'upDownNatural' },
};
/* cada reacción: qué cara, qué movimiento, cuánto dura y qué tanto pesa (una fuerte no la tapa una leve) */
const REACCIONES = {
  bien: { cara: 'bien', mov: 'salta', ms: 1200, peso: 1 },
  combo: { cara: 'combo', mov: 'brinca', ms: 1500, peso: 2, chispas: 5 },
  mal: { cara: 'mal', mov: 'sacude', ms: 1400, peso: 1 },
  mareado: { cara: 'mareado', mov: 'tambalea', ms: 2000, peso: 2 },
  piensa: { cara: 'piensa', mov: 'ladea', ms: 1900, peso: 0 },
  sorpresa: { cara: 'sorpresa', mov: 'salta', ms: 1100, peso: 1 },
  guino: { cara: 'guino', mov: 'ladea', ms: 1000, peso: 0 },
  regular: { cara: 'animo', mov: 'ladea', ms: 2400, peso: 1, luego: 'piensa' },
  sube: { cara: 'sube', mov: 'celebra', ms: 2600, peso: 3, chispas: 9 },
  racha: { cara: 'sube', mov: 'celebra', ms: 2400, peso: 3, chispas: 7 },
  perfecto: { cara: 'combo', mov: 'celebra', ms: 3200, peso: 3, chispas: 12, luego: 'sube' },
  baja: { cara: 'baja', mov: 'cae', ms: 2800, peso: 3 },
};
export const TIPOS_REACCION = Object.keys(REACCIONES);

let cfg = { personaje: () => null, svg: async () => '', sueno: 45000 };   /* sueno: a cuántos ms sin tocar nada se duerme */
const vivos = new Set();
const cache = new Map();   /* «personaje+cara» → svg: cambiar de cara es pegar un texto, no volver a dibujar */
let ultimoToque = Date.now();
const reducido = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch{ return false; } };
const azar = (a, b) => a + Math.random() * (b - a);

export function configurarPersonaje(c){ cfg = { ...cfg, ...c }; }

/* lo que tocas despierta a todos (y si alguno dormía, se lleva el susto) */
if(typeof document !== 'undefined'){
  const toque = () => { const dormidos = [...vivos].filter((v) => v.dormido); ultimoToque = Date.now(); dormidos.forEach((v) => v.despertar()); };
  document.addEventListener('pointerdown', toque, { passive: true, capture: true });
  document.addEventListener('keydown', toque, { capture: true });
}

async function dibujo(p, cara){
  const base = JSON.stringify(p);
  const k = base + '|' + cara;
  if(cache.has(k)) return cache.get(k);
  const pr = cfg.svg({ ...p, ...(cara === 'base' ? {} : CARAS[cara]), fondo: 'transparent' }).catch(() => '');
  cache.set(k, pr);
  if(cache.size > 120) cache.delete(cache.keys().next().value);
  return pr;
}

export function personajeVivo(caja, { tam = 64, personaje = null, cameo = false } = {}){
  if(!caja) return null;
  const p = personaje || cfg.personaje();
  if(!p) return null;
  const el = document.createElement('span');
  el.className = 'pv' + (cameo ? ' pv-cameo' : '');
  el.style.setProperty('--pv', tam + 'px');
  el.setAttribute('aria-hidden', 'true');
  /* el fondo y el aro se quedan quietos (la ventana); adentro brinca él. Las chispas van afuera para que no se corten */
  el.style.setProperty('--pv-fondo', /^[0-9a-f]{6}$/i.test(p.fondo || '') ? '#' + p.fondo : 'var(--sup)');
  el.innerHTML = '<span class="pv-ventana"><span class="pv-cuerpo"><span class="pv-dib"></span></span></span><span class="pv-fx"></span>';
  caja.replaceChildren(el);
  const dib = el.querySelector('.pv-dib'), cuerpo = el.querySelector('.pv-cuerpo'), fx = el.querySelector('.pv-fx');
  let cara = 'base', enReaccion = null, timer = null, finReaccion = null, desconectado = 0, vivo = true;
  let ultimaMira = Date.now();
  const yo = { el, dormido: false, reaccionar, despertar, destruir, get cara(){ return cara; } };

  async function poner(c){
    cara = c;
    const s = await dibujo(p, c);
    if(vivo && cara === c && s) dib.innerHTML = s;
  }
  /* pre-dibuja todas las caras cuando el teléfono descansa: la primera reacción ya no espera */
  poner('base').then(() => {
    const resto = Object.keys(CARAS);
    const uno = () => { if(!vivo || !resto.length) return; dibujo(p, resto.shift()).then(() => (window.requestIdleCallback || setTimeout)(uno)); };
    (window.requestIdleCallback || setTimeout)(uno);
  });

  function visible(){
    if(!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  /* la vida de fondo: parpadea cada 2.5-6 s (a veces doble), mira de lado de vez en cuando y se duerme a los 45 s */
  function vida(){
    if(!vivo) return;
    if(!el.isConnected){ if(++desconectado > 2) return destruir(); timer = setTimeout(vida, 1500); return; }
    desconectado = 0;
    if(document.hidden || enReaccion){ timer = setTimeout(vida, 1200); return; }
    if(!yo.dormido && Date.now() - ultimoToque > cfg.sueno){ dormir(); timer = setTimeout(vida, 4000); return; }
    if(yo.dormido){ timer = setTimeout(vida, 3000); return; }
    const t = Math.random();
    /* mira de lado al azar, pero nunca pasa más de 14 s sin hacerlo: así se nota vivo */
    if(t < .16 || Date.now() - ultimaMira > 14000){
      ultimaMira = Date.now();
      poner('mira'); timer = setTimeout(() => { if(!enReaccion && !yo.dormido) poner('base'); timer = setTimeout(vida, azar(1800, 4200)); }, azar(650, 1100));
    } else {
      const doble = t > .86;
      parpadea(() => doble ? setTimeout(() => parpadea(() => {}), 170) : null);
      timer = setTimeout(vida, azar(2500, 6000));
    }
  }
  function parpadea(luego){
    if(cara !== 'base') return luego();
    poner('parpadeo');
    setTimeout(() => { if(cara === 'parpadeo') poner('base'); luego(); }, 120);
  }
  function dormir(){
    yo.dormido = true; el.classList.add('pv-duerme'); poner('duerme');
    fx.innerHTML = '<i class="pv-z">z</i><i class="pv-z">z</i><i class="pv-z">z</i>';
  }
  function despertar(){
    if(!yo.dormido) return;
    yo.dormido = false; el.classList.remove('pv-duerme'); fx.innerHTML = '';
    reaccionar('sorpresa');
  }
  function chispas(n){
    if(reducido()) return;
    for(let k = 0; k < n; k++){
      const s = document.createElement('i'); s.className = 'pv-chispa';
      const ang = (k / n) * Math.PI * 2 + azar(-.3, .3), d = azar(.55, .9);
      s.style.setProperty('--x', (Math.cos(ang) * d * tam * .75).toFixed(0) + 'px');
      s.style.setProperty('--y', (Math.sin(ang) * d * tam * .75 - tam * .15).toFixed(0) + 'px');
      s.style.animationDelay = (k * 35) + 'ms';
      fx.append(s); setTimeout(() => s.remove(), 1100);
    }
  }
  function reaccionar(tipo){
    const r = REACCIONES[tipo]; if(!r || !vivo) return false;
    if(enReaccion && REACCIONES[enReaccion].peso > r.peso) return false;
    if(yo.dormido){ yo.dormido = false; el.classList.remove('pv-duerme'); fx.innerHTML = ''; }
    enReaccion = tipo; clearTimeout(finReaccion);
    el.dataset.reaccion = tipo;
    poner(r.cara);
    cuerpo.className = 'pv-cuerpo';
    if(!reducido()){ void cuerpo.offsetWidth; cuerpo.classList.add('pv-' + r.mov); }
    if(r.chispas) chispas(r.chispas);
    finReaccion = setTimeout(() => {
      cuerpo.className = 'pv-cuerpo';
      if(r.luego && CARAS[REACCIONES[r.luego]?.cara]){ poner(REACCIONES[r.luego].cara); finReaccion = setTimeout(terminar, 1100); }
      else terminar();
    }, r.ms);
    return true;
  }
  function terminar(){ enReaccion = null; delete el.dataset.reaccion; if(!yo.dormido) poner('base'); }
  function destruir(){ vivo = false; clearTimeout(timer); clearTimeout(finReaccion); vivos.delete(yo); }

  /* tocarlo le saca un guiño */
  el.addEventListener('pointerdown', () => { if(!enReaccion) reaccionar('guino'); }, { passive: true });
  yo.visible = visible;
  vivos.add(yo);
  timer = setTimeout(vida, azar(900, 2200));
  return yo;
}

/* todos los que estén a la vista reaccionan; si ninguno y es algo grande, uno se asoma por la esquina */
export function reaccion(tipo, { cameo = false } = {}){
  let alguno = false;
  for(const v of [...vivos]) if(v.visible()){ v.reaccionar(tipo); alguno = true; }
  if(!alguno && cameo) asomarse(tipo);
  try{ window.dispatchEvent(new CustomEvent('carymo:reaccion', { detail: { tipo } })); }catch{}
  return alguno;
}

let asomado = null;
function asomarse(tipo){
  if(!cfg.personaje()) return;
  if(asomado){ asomado.v.reaccionar(tipo); clearTimeout(asomado.t); asomado.t = setTimeout(irse, (REACCIONES[tipo]?.ms || 2000) + 900); return; }
  /* se asoma en el muelle de arriba (muelle.js): ya no flota encima de la pantalla */
  const caja = document.createElement('div'); caja.className = 'pv-asoma'; alMuelle(caja);
  const v = personajeVivo(caja, { tam: 64, cameo: true }); if(!v){ caja.remove(); return; }
  asomado = { caja, v, t: 0 };
  requestAnimationFrame(() => requestAnimationFrame(() => { caja.classList.add('dentro'); setTimeout(() => v.reaccionar(tipo), 260); }));
  asomado.t = setTimeout(irse, (REACCIONES[tipo]?.ms || 2000) + 1100);
  function irse(){ const a = asomado; if(!a) return; asomado = null; a.caja.classList.remove('dentro'); setTimeout(() => { a.v.destruir(); a.caja.remove(); }, 500); }
}

/* para las pruebas */
export const _interno = { CARAS, REACCIONES, vivos };
