/* INKWELL · el muelle: la barra de secciones flotante con la pluma al centro para escribir.
   Una sola definición para todas las páginas (antes había cuatro copias). */
import { icono } from './iconos.js';
export const SECCIONES = [['inicio', 'Inicio', 'house'], ['explorar', 'Explorar', 'compass'], ['crear', 'Escribir', 'pen-tool'], ['biblioteca', 'Estante', 'library'], ['comunidad', 'Comunidad', 'users']];
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
}
