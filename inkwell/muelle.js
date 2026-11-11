/* INKWELL · el muelle: la barra de secciones flotante con la pluma al centro para escribir.
   Una sola definición para todas las páginas.

   Carlos, 11 nov: «al cambiar, la gotita de tinta y la luz del ícono en el que estoy deben pasar al que voy,
   juicy, smooth, súper suave; rápido al inicio, lento al final» y «que la página en la que estoy se desarme
   por partes y se construya la nueva». Por eso:
   · la luz y la gota son piezas de verdad (no un ::after) que viajan de un ícono al otro (FLIP), y la gota se
     estira como tinta a medio camino;
   · desarmar() saca los bloques de la página uno tras otro y construir() mete los nuevos igual;
   · entre páginas distintas (Tiras, Libros, Studio) se guarda de dónde salió la luz, y la página nueva la
     termina de traer y se construye sola. */
import { icono } from './iconos.js';
export const SECCIONES = [['inicio', 'Inicio', 'house'], ['explorar', 'Explorar', 'compass'], ['crear', 'Escribir', 'pen-tool'], ['biblioteca', 'Estante', 'library'], ['comunidad', 'Comunidad', 'users']];
export const SUAVE = 'cubic-bezier(.16,1,.3,1)';           /* rápido al inicio, lento al final */
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const CLAVE = 'inkwell.muelle';

/* raiz: dónde está index.html desde esta página ('' en el inicio, './' en Tiras, '../' en Studio).
   actual: la sección encendida. En el inicio los enlaces son sólo #seccion. */
export function pintarMuelle(nav, { raiz = '', actual = null } = {}){
  nav.classList.add('muelle');
  nav.innerHTML = SECCIONES.map(([id, n, ic]) => {
    const href = raiz === '' ? '#' + id : id === 'crear' ? raiz + 'studio/' : raiz + '#' + id;
    const cur = id === actual ? ' aria-current="page"' : '';
    if(id === 'crear') return `<a class="pluma" href="${href}" data-ir="${id}"${cur} aria-label="${n} en Studio"><span class="disco"><img src="${raiz}marca/pluma.png" alt=""></span><span>${n}</span></a>`;
    return `<a href="${href}" data-ir="${id}"${cur}>${icono(ic)}<span>${n}</span></a>`;
  }).join('');
  ponerMarca(nav);
  /* entre páginas: se anima aquí, se guarda de dónde salió la luz y luego se navega */
  if(raiz !== ''){
    nav.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-ir]'); if(!a || a.getAttribute('aria-current') === 'page' || e.metaKey || e.ctrlKey) return;
      if(quieto()) return;
      e.preventDefault();
      const luz = nav.querySelector('.m-luz'); if(luz){ const r = luz.getBoundingClientRect(); try{ sessionStorage.setItem(CLAVE, JSON.stringify({ x: r.left + r.width / 2, t: Date.now() })); }catch{} }
      moverMarca(nav, a.dataset.ir);
      desarmar(document.querySelector('main') || document.body);
      setTimeout(() => { location.href = a.href; }, 280);
    });
  }
  llegar(nav);
}

/* la luz y la gota viven dentro del ícono encendido */
function ponerMarca(nav){
  let luz = nav.querySelector('.m-luz'), gota = nav.querySelector('.m-gota');
  if(!luz){ luz = document.createElement('span'); luz.className = 'm-luz'; luz.setAttribute('aria-hidden', 'true'); }
  if(!gota){ gota = document.createElement('span'); gota.className = 'm-gota'; gota.setAttribute('aria-hidden', 'true'); }
  const a = nav.querySelector('a[aria-current="page"]');
  if(a){ a.prepend(luz); a.append(gota); luz.hidden = gota.hidden = false; }
  else { luz.hidden = gota.hidden = true; nav.append(luz, gota); }
  return { luz, gota, a };
}
/* cambia el ícono encendido y hace viajar la luz y la gota desde donde estaban */
export function moverMarca(nav, id){
  const { luz, gota } = ponerMarca(nav);
  const antes = luz.hidden ? null : luz.getBoundingClientRect(), rg = gota.hidden ? null : gota.getBoundingClientRect(), antesG = rg && rg.width ? rg : null;
  nav.querySelectorAll('a[data-ir]').forEach((a) => { if(a.dataset.ir === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const m = ponerMarca(nav);
  if(antes && !quieto()) viajar(m, antes.left + antes.width / 2, antesG ? antesG.left + antesG.width / 2 : null);
}
function viajar({ luz, gota, a }, xLuz, xGota){
  if(!a) return;
  const r = luz.getBoundingClientRect(), dx = xLuz - (r.left + r.width / 2);
  if(Math.abs(dx) < 2) return;
  luz.animate([{ transform: `translateX(${dx}px) scale(.85)`, opacity: .55 }, { transform: `translateX(${dx * .25}px) scale(1.15)`, opacity: 1, offset: .35 }, { transform: 'none', opacity: 1 }], { duration: 720, easing: SUAVE });
  const rg = gota.getBoundingClientRect(), dg = (xGota ?? xLuz) - (rg.left + rg.width / 2);
  /* la tinta se estira a medio camino y llega con un rebotito */
  gota.animate([{ transform: `translateX(${dg}px) scaleX(1)` }, { transform: `translateX(${dg * .45}px) scaleX(2.4) scaleY(.7)`, offset: .3 }, { transform: 'translateX(0) scaleX(.8) scaleY(1.2)', offset: .75 }, { transform: 'none' }], { duration: 780, easing: SUAVE });
  const ic = a.querySelector('.ico, .disco');
  if(ic) ic.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1.12)', offset: .45 }, { transform: 'none' }], { duration: 560, easing: SUAVE });
}
/* al llegar de otra página: la luz termina su viaje y la página se construye */
function llegar(nav){
  let v = null; try{ v = JSON.parse(sessionStorage.getItem(CLAVE)); sessionStorage.removeItem(CLAVE); }catch{}
  if(!v || Date.now() - v.t > 4000 || quieto()) return;
  requestAnimationFrame(() => {
    const m = ponerMarca(nav); if(!m.a) return;
    viajar(m, v.x, null);
    construir(document.querySelector('main') || document.body);
  });
}

/* ── la página se desarma por partes y la nueva se construye ── */
function piezas(raiz){
  const sel = [':scope > *', ':scope > section:not([hidden]) > *', ':scope > section:not([hidden]) > .pad > *', ':scope > .pad > *'];
  const vistos = new Set(), out = [];
  for(const s of sel) for(const el of raiz.querySelectorAll(s)){
    if(vistos.has(el) || el.matches('nav, script, style, dialog, [hidden], .nav, section, .pad')) continue;
    const r = el.getBoundingClientRect();
    if(!r.height || r.bottom < 0 || r.top > innerHeight) continue;          // sólo lo que se ve
    vistos.add(el); out.push(el);
  }
  return out.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).slice(0, 14);
}
export function desarmar(raiz){
  if(quieto() || !raiz) return Promise.resolve();
  const ps = piezas(raiz);
  const as = ps.map((el, i) => el.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-12px) scale(.97)', filter: 'blur(5px)' }],
    { duration: 170, delay: i * 18, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }));
  return Promise.all(as.map((a) => a.finished.catch(() => {}))).then(() => as);
}
export function construir(raiz){
  if(quieto() || !raiz) return;
  piezas(raiz).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(26px) scale(.98)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
    { duration: 520, delay: i * 42, easing: SUAVE, fill: 'backwards' }));
}
