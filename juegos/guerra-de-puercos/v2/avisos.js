/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · CÓMO SE AVISAN LAS COSAS
   ───────────────────────────────────────────────────────────────────────────
   Carlos: «vamos a quitar TANTOS avisos del recuadro amarillo y vamos a usar
   otro sistema para avisar las cosas». El de antes era un globo con botón de
   «Entendido» que tapaba la mesa y había que cerrar para seguir jugando.

   Ahora hay DOS formas, y ninguna detiene el juego:
   · `aviso(texto)`  — una pastilla arriba que se va sola en dos segundos. Para
     lo que pasó («Repetida: +8 monedas», «Esa carta no se combina»).
   · `pista(nodo, texto)` — un dedo que señala lo que hay que hacer, con UNA
     línea al lado. Se quita sola en cuanto la persona hace eso. Es lo que
     enseña a jugar sin leer un párrafo.
   Una pista sólo se enseña las primeras veces (`vecesPista`): a la quinta
   partida ya nadie necesita que le señalen la mano.
   ═══════════════════════════════════════════════════════════════════════════ */
let caja = null;
function asegurar(){
  if(caja) return caja;
  caja = document.createElement('div'); caja.className = 'avisos'; caja.setAttribute('aria-live', 'polite');
  document.body.appendChild(caja); return caja;
}
export function aviso(texto, { tipo = 'info', icono = null, dura = 2.2 } = {}){
  const c = asegurar(), p = document.createElement('div');
  p.className = 'pastilla ' + tipo;
  p.innerHTML = (icono ? '<img alt="" src="' + icono + '">' : '') + '<span></span>';
  p.querySelector('span').textContent = texto;
  c.appendChild(p);
  while(c.children.length > 3) c.firstChild.remove();
  requestAnimationFrame(() => p.classList.add('ve'));
  setTimeout(() => { p.classList.remove('ve'); setTimeout(() => p.remove(), 300); }, dura * 1000);
}

const VISTAS = (() => { try{ return JSON.parse(localStorage.getItem('puercos2_pistas') || '{}'); }catch(e){ return {}; } })();
const guardarVistas = () => { try{ localStorage.setItem('puercos2_pistas', JSON.stringify(VISTAS)); }catch(e){} };
let actual = null;
/* donde: { x, y } en pixeles o un nodo. gesto: 'toca' | 'desliza-der' | 'desliza-abajo' | 'arrastra' */
export function pista(id, donde, texto, { gesto = 'toca', veces = 3, hacia = null } = {}){
  quitarPista();
  if((VISTAS[id] | 0) >= veces) return null;
  const p = document.createElement('div'); p.className = 'pista ' + gesto;
  p.innerHTML = '<i class="dedo"></i><b></b>';
  p.querySelector('b').textContent = texto;
  document.body.appendChild(p);
  const poner = () => {
    const r = donde instanceof Element ? donde.getBoundingClientRect() : { left: donde.x, top: donde.y, width: 0, height: 0 };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    p.style.left = cx + 'px'; p.style.top = cy + 'px';
    if(hacia) p.style.setProperty('--hacia-x', hacia.x + 'px'), p.style.setProperty('--hacia-y', hacia.y + 'px');
    /* el letrero no se sale de la pantalla: se corre hacia dentro */
    const b = p.querySelector('b'), w = b.offsetWidth, m = 10;
    const izq = cx - w / 2, der = cx + w / 2;
    const corre = izq < m ? m - izq : der > innerWidth - m ? innerWidth - m - der : 0;
    b.style.transform = `translateX(calc(-50% + ${corre}px))`;
    if(w > innerWidth - 2 * m){ b.style.whiteSpace = 'normal'; b.style.width = (innerWidth - 2 * m) + 'px'; b.style.textAlign = 'center'; }
  };
  poner();
  actual = { id, p, poner };
  requestAnimationFrame(() => p.classList.add('ve'));
  return p;
}
/* La persona hizo lo que decía la pista: cuenta una vez y se quita. */
export function cumplida(id){
  if(actual && actual.id === id){ VISTAS[id] = (VISTAS[id] | 0) + 1; guardarVistas(); quitarPista(); }
}
export function quitarPista(){
  if(!actual) return;
  const p = actual.p; p.classList.remove('ve'); setTimeout(() => p.remove(), 250); actual = null;
}
export const olvidarPistas = () => { for(const k of Object.keys(VISTAS)) delete VISTAS[k]; guardarVistas(); };
