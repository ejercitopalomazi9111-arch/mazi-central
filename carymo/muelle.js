/* muelle.js — LO QUE APARECE NO TAPA NADA (Carlos, 14 nov: «asegúrate que ningún elemento emergente pueda cubrir otro
 * elemento que sea estático, porque eso molesta y estorba»)
 * ===========================================================================
 * Antes cada cosa que aparece (los avisos, el pomodoro, la pastilla de estudiar juntos, el personaje que se asoma, el
 * combo) flotaba ENCIMA de la pantalla y tapaba lo que hubiera. Ahora todas viven en el MUELLE: una franja fija arriba
 * que crece cuando llega algo, y la página se recorre hacia abajo exactamente lo que mide (padding del body con la
 * variable --muelle). Como el relleno está ARRIBA del documento, lo que estabas viendo baja junto con todo y nunca
 * queda debajo. Las capas (cuarto, lecciones), el pizarrón y las hojas empiezan debajo del muelle por la misma variable.
 *
 * Las mascotas que hablan: su globito busca dónde no tape nada (arriba, a un lado, abajo); si no cabe en ningún lado,
 * lo dice en el muelle (mascota.js llama a `decirEnMuelle`).
 * ===========================================================================*/
let muelle = null;
export function muelleArriba(){
  if(muelle && muelle.isConnected) return muelle;
  muelle = document.getElementById('muelle');
  if(!muelle){ muelle = document.createElement('div'); muelle.id = 'muelle'; muelle.className = 'muelle'; document.body.append(muelle); }
  const raiz = document.documentElement;
  let antes = -1;
  /* con el dedo puesto (dibujando, arrastrando) la página no se mueve hacia ARRIBA: si un aviso se va a media raya, el
     muelle se queda abierto (vacío) hasta que sueltes. Si llega algo nuevo sí empuja luego luego, para no tapar. */
  let dedos = 0, pendiente = false;
  addEventListener('pointerdown', () => { dedos++; }, true);
  const suelta = () => { dedos = Math.max(0, dedos - 1); if(!dedos && pendiente){ pendiente = false; medir(); } };
  addEventListener('pointerup', suelta, true); addEventListener('pointercancel', suelta, true);
  const medir = () => {
    const lleno = [...muelle.children].some((c) => c.offsetHeight > 0);
    muelle.classList.toggle('lleno', lleno);
    let h = lleno ? Math.ceil(muelle.getBoundingClientRect().height) : 0;
    if(h < antes && dedos){ pendiente = true; muelle.style.minHeight = antes + 'px'; return; }
    muelle.style.minHeight = '';
    h = lleno ? Math.ceil(muelle.getBoundingClientRect().height) : 0;
    if(h !== antes){ antes = h; raiz.style.setProperty('--muelle', h + 'px'); }
  };
  if('ResizeObserver' in window) new ResizeObserver(medir).observe(muelle);
  new MutationObserver(medir).observe(muelle, { childList: true, subtree: true });
  medir();
  return muelle;
}
/* pone un elemento en el muelle (si ya estaba en otro lado, se muda) */
export function alMuelle(el, { primero = false } = {}){
  const m = muelleArriba();
  if(el.parentElement !== m){ if(primero) m.prepend(el); else m.append(el); }
  return el;
}
/* el globito de una mascota que no cupo sin tapar nada: sale en el muelle un ratito */
export function decirEnMuelle(texto, ms = 2600){
  const m = muelleArriba();
  let fila = m.querySelector('.muelle-dice');
  if(!fila){ fila = document.createElement('div'); fila.className = 'muelle-dice'; fila.setAttribute('aria-live', 'polite'); m.append(fila); }
  fila.textContent = texto;
  clearTimeout(fila._t); fila._t = setTimeout(() => fila.remove(), ms);
}

/* ¿este rectángulo taparía algo de la página? Mira qué hay debajo en una rejilla de puntos y sólo cuenta lo que es
   CONTENIDO (texto de verdad, botones, campos, imágenes y dibujos), no los fondos de las cajas. `fuera` = lo que no cuenta. */
const ES_CONTENIDO = 'button, a, input, textarea, select, img, canvas, video, [role="button"], [role="radio"], [role="tab"], [data-mueble]';
function hayTexto(el, x, y){
  for(const n of el.childNodes){
    if(n.nodeType !== 3 || !n.textContent.trim()) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for(const c of r.getClientRects()) if(x >= c.left - 2 && x <= c.right + 2 && y >= c.top - 2 && y <= c.bottom + 2) return true;
  }
  return false;
}
export function taparia(rect, fuera = []){
  const W = innerWidth, H = innerHeight;
  if(rect.left < 4 || rect.right > W - 4 || rect.top < 0 || rect.bottom > H) return true;
  const m = document.getElementById('muelle');
  if(m && m.children.length && rect.top < m.getBoundingClientRect().bottom) return true;
  for(let i = 0; i <= 3; i++) for(let j = 0; j <= 2; j++){
    const x = rect.left + rect.width * (i / 3) * .9 + rect.width * .05, y = rect.top + rect.height * (j / 2) * .8 + rect.height * .1;
    for(const el of document.elementsFromPoint(x, y)){
      if(fuera.some((f) => f && f.contains(el))) continue;
      if(el.closest('.masc, .pv, .masc-fx, .confeti')) continue;
      if(el === document.body || el === document.documentElement) break;
      const c = el.closest(ES_CONTENIDO) || (el.closest('svg') && !el.closest('.cuarto .pared, .cuarto .piso') ? el.closest('svg') : null);
      if(c) return true;
      if(hayTexto(el, x, y)) return true;
      /* un fondo opaco (tarjeta, capa) ya no deja ver lo de abajo: se deja de buscar en esta pila */
      const bg = getComputedStyle(el).backgroundColor;
      if(bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) break;
    }
  }
  return false;
}
