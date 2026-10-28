/* EL CUBO QUE ES UNA M. Las dos caras de los lados de un cubo isométrico, con las patas planas, son
   una M; la cara de arriba es el techo. Todo en una retícula isométrica (30°) de 100 × 110:
   arriba (50,6) · hombros (8,30) y (92,30) · centro (50,54) · pies en y = 104.
   Cada versión recibe (tinta, acento, fondo) y devuelve el interior del SVG. */
export const VB = '0 0 100 110';
export const CUERPO = { arriba: 30, abajo: 104 };     // la M sola (sin techo) va de 30 a 104

const S = 20;                                          // grueso de las patas de la M
/* la M en dos mitades: cada una es una cara del cubo (luz de un lado, sombra del otro) */
const M_IZQ = `M8 30 L50 54 V78 L${8 + S} 61 V104 H8 Z`;
const M_DER = `M92 30 L50 54 V78 L${92 - S} 61 V104 H92 Z`;
const M_TODA = `M8 30 L50 54 L92 30 V104 H${92 - S} V61 L50 78 L${8 + S} 61 V104 H8 Z`;
const TECHO = 'M50 6 L92 30 L50 54 L8 30 Z';
const TECHO_SEP = 'M50 8 L86 28.6 L50 49.2 L14 28.6 Z';   // el techo separado por una rendija
const HEX = 'M50 6 L92 30 V104 H8 V30 Z';

export const SIMBOLOS = [
  ['cubo M', (t, a) => `<path d="${TECHO}" fill="${a}"/><path d="${M_IZQ}" fill="${t}"/><path d="${M_DER}" fill="${t}" opacity=".62"/>`],
  ['cubo M, techo aparte', (t, a) => `<path d="${TECHO_SEP}" fill="${a}"/><path d="${M_TODA}" fill="${t}"/>`],
  ['cubo M de línea', (t, a, f, g) => `<path d="M8 104 V30 L50 54 L92 30 V104" fill="none" stroke="${t}" stroke-width="${g}" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="M8 30 L50 6 L92 30" fill="none" stroke="${a}" stroke-width="${g}" stroke-linejoin="miter" stroke-miterlimit="3"/>`],
  ['bloque calado', (t, a, f, g) => `<path d="${HEX}" fill="${t}"/><path d="M8 30 L50 54 L92 30" fill="none" stroke="${f}" stroke-width="${g}"/><path d="M${8 + S + 6} 104 V66 L50 84 L${92 - S - 6} 66 V104 Z" fill="${f}"/>`],
  ['sólo la M', (t, a) => `<path d="${M_IZQ}" fill="${t}"/><path d="${M_DER}" fill="${t}" opacity=".62"/><path d="M50 22 L64 30 L50 38 L36 30 Z" fill="${a}"/>`],
  ['M plana', (t, a) => `<path d="${M_TODA}" fill="${t}"/><path d="${TECHO}" fill="none" stroke="${a}" stroke-width="5"/>`],
];
