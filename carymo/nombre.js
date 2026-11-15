/* nombre.js — CÓMO SE PINTA EL NOMBRE DE ALGUIEN Y SUS TÍTULOS (Carlos, 14 nov)
 * ===========================================================================
 * «A Sandra… su nombre va a salir en arcoíris, estilo dibujado, porque ella es nuestra artista principal»;
 * «el usuario Carlos soy yo, ya sabes lo que me gusta» (los colores de la casa y la M cubo); «Mónica… detalles de
 * blanco» (perla). Y la etiqueta de Alfa tester / Beta tester para los que llegaron antes de que sea de paga.
 * El estilo y los títulos los decide el servidor (titulos.js); aquí sólo se pintan. Lo usan el ranking, Tú y el
 * perfil de otra persona.
 * ===========================================================================*/
import { TITULOS, ESTILOS_NOMBRE } from './titulos.js';

const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/* la M cubo en chiquito, para el nombre de Carlos (techo morado claro, caras vino y oscuro) */
const CUBO_MINI = '<svg class="nom-cubo" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1 19 5.5 10 10 1 5.5Z" fill="#AC27FF"/><path d="M1 5.5 10 10v9L1 14.5Z" fill="#7E1735"/><path d="M19 5.5 10 10v9l9-4.5Z" fill="#2A1640"/><path d="M3 13.5V8l3.5 3.2L10 8.6v8" fill="none" stroke="#F1ECF4" stroke-width="1.3" stroke-linejoin="round"/></svg>';

const CORAZON = '<svg class="nom-corazon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.2 0 3.6 1.2 5.4 3.2 1.8-2 3.2-3.2 5.4-3.2 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21Z" fill="#F0477A"/><path d="M7 8.2c.6-.9 1.6-1.3 2.4-1.1" stroke="#fff" stroke-opacity=".7" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';
/* el nombre con su estilo (o normal si no tiene) */
export function nombreHTML(nombre, estilo){
  const n = escapar(nombre || '?');
  if(!estilo || !ESTILOS_NOMBRE[estilo]) return `<span class="nom-txt">${n}</span>`;
  if(estilo === 'mazi') return `<span class="nom-txt nom-mazi">${CUBO_MINI}<span>${n}</span></span>`;
  /* Mónica: su nombre en perla entre dos corazones que laten */
  if(estilo === 'perlaCorazones') return `<span class="nom-txt nom-corazones">${CORAZON}<span class="nom-perla">${n}</span>${CORAZON}</span>`;
  return `<span class="nom-txt nom-${estilo}">${n}</span>`;
}
/* las etiquetas: `corto` en las filas del ranking (sólo el icono y una palabra) */
export function insigniasHTML(titulos, ico, { corto = false } = {}){
  return (titulos || []).filter((t) => TITULOS[t]).map((t) => {
    const T = TITULOS[t], txt = corto ? T.nombre.split(' ')[0] : T.nombre;
    return `<span class="insignia ins-${t}" title="${escapar(T.nombre)}">${ico(T.ico)}${escapar(txt)}</span>`;
  }).join('');
}
