/* RONDA 6 · LA Z. Carlos, 24 de octubre: «enfócate más en la Z que en la M en algunos».
   Z: 25 símbolos hechos de la Z (hoja 1). ZI: 25 maneras de que la Z de «MAZI» mande dentro de la
   palabra (hoja 2). Vector a mano, de un solo color; ninguno repite uno de las rondas 1 a 5. */
import { svg, R, punto } from '../propuestas3/marcas.js';
export { svg, R };
const B = '0 0 100 100';
const F = (d, mas = '') => `<path d="${d}" ${R} ${mas}/>`;
const L = (d, sw) => `<path d="${d}"${sw ? ` stroke-width="${sw}"` : ''}/>`;
const hueco = (d, c, sw = 6, mas = '') => `<path d="${d}" stroke="${c}" stroke-width="${sw}" fill="none" ${mas}/>`;
const pix = (filas, t = 20) => filas.flatMap((f, y) => [...f].map((ch, x) => ch === 'X' ? `<rect x="${x * t}" y="${y * t}" width="${t + .4}" height="${t + .4}" ${R}/>` : '')).join('');
const ZP = 'M8 8 H92 V24 L34 76 H92 V92 H8 V76 L66 24 H8 Z';       /* la Z llena */
const ZL = 'M14 14 H86 L14 86 H86';                                  /* la Z de un trazo */
const poli = (n, r, cx = 50, cy = 50, g = -90) => Array.from({ length: n }, (_, i) => { const a = (g + i * 360 / n) * Math.PI / 180; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');

export const Z = [
  ['Z de cuadritos', (w) => svg(B, w, pix(['XXXXX', '...X.', '..X..', '.X...', 'XXXXX']))],
  ['Z de un trazo con vértices', (w) => svg(B, w, L(ZL, 3) + [[14, 14], [86, 14], [14, 86], [86, 86]].map(([x, y]) => punto(x, y, 7)).join(''))],
  ['Z de tres piezas', (w) => svg(B, w, F('M8 8 H92 V24 H8 Z') + F('M66 32 H92 L34 68 H8 Z') + F('M8 76 H92 V92 H8 Z'))],
  ['Z doblada', (w) => svg(B, w, F('M8 10 H92 L80 26 H8 Z') + F('M80 26 H92 L20 74 H8 Z', 'opacity=".5"') + F('M20 74 H92 V90 H8 Z'))],
  ['Z calada en un círculo', (w, c) => svg(B, w, `<circle cx="50" cy="50" r="46" ${R}/>` + hueco('M30 30 H70 L30 70 H70', c, 10))],
  ['Z en ficha de app', (w, c) => svg(B, w, `<rect x="4" y="4" width="92" height="92" rx="26" ${R}/>` + hueco('M30 30 H70 L30 70 H70', c, 9, 'stroke-linejoin="round" stroke-linecap="round"'))],
  ['Z en negativo', (w) => svg(B, w, F('M6 6 H94 L6 62 Z') + F('M94 38 V94 H6 Z'))],
  ['Z de carretera', (w, c) => svg(B, w, L(ZL, 20) + hueco(ZL, c, 2.5, 'stroke-dasharray="6 7"'))],
  ['Z con sombra', (w) => svg('0 0 110 110', w, `<g transform="translate(14 14)">${F(ZP)}</g>` + `<path d="${ZP}" stroke-width="2.5"/>`)],
  ['Z de esténcil', (w, c) => svg(B, w, F(ZP) + hueco('M60 16 V32 M40 68 V84', c, 5))],
  ['Z en relieve', (w) => svg('0 0 112 104', w, L('M10 14 H80 L10 84 H80', 6) + L('M10 14 L24 4 H94 L80 14 M94 4 L36 74 M80 84 L94 74 V64', 2.5))],
  ['Z gordita', (w) => svg(B, w, L('M22 22 H78 L22 78 H78', 20))],
  ['Z con remates', (w) => svg(B, w, L(ZL, 4) + L('M14 14 V30 M86 86 V70', 4))],
  ['Z de puntos', (w) => svg(B, w, [[14, 14], [38, 14], [62, 14], [86, 14], [62, 38], [38, 62], [14, 86], [38, 86], [62, 86], [86, 86]].map(([x, y]) => punto(x, y, 8)).join(''))],
  ['Z de neón', (w, c) => svg(B, w, L(ZL, 16) + hueco(ZL, c, 8))],
  ['Z partida', (w) => svg('0 0 110 100', w, F('M4 8 H88 V24 L64 46 H40 L62 24 H4 Z') + F('M48 54 H72 L50 76 H106 V92 H22 V76 Z'))],
  ['Z en hexágono', (w) => svg(B, w, `<polygon points="${poli(6, 47)}" stroke-width="3"/>` + L('M32 32 H68 L32 68 H68', 7))],
  ['Z de contorno', (w) => svg(B, w, `<path d="${ZP}" stroke-width="3"/>`)],
  ['Z caligráfica', (w) => svg('0 0 100 110', w, L('M14 20 C30 10 60 24 86 14 L24 80 C40 70 54 96 72 88 C84 82 88 70 80 64', 6))],
  ['Z en rombo', (w) => svg(B, w, `<path d="M50 3 L97 50 L50 97 L3 50 Z" stroke-width="3"/>` + L('M36 36 H64 L36 64 H64', 7))],
  ['Z de tres líneas', (w, c) => svg(B, w, L(ZL, 22) + hueco(ZL, c, 14) + L(ZL, 5))],
  ['Z de rombos', (w) => svg(B, w, [[14, 14], [36, 14], [58, 14], [80, 14], [62, 34], [44, 52], [26, 70], [14, 86], [36, 86], [58, 86], [80, 86]].map(([x, y]) => `<path d="M${x} ${y - 9} L${x + 9} ${y} L${x} ${y + 9} L${x - 9} ${y} Z" ${R}/>`).join(''))],
  ['Z con estela', (w) => svg('0 0 140 100', w, `<g transform="skewX(-14)">${F('M52 10 H132 V24 L82 76 H132 V90 H52 V76 L102 24 H52 Z')}</g>` + L('M6 30 H34 M14 50 H30 M2 70 H24', 4))],
  ['Z de origami', (w) => svg(B, w, F('M8 8 H92 L66 24 Z') + F('M8 8 L66 24 H8 Z', 'opacity=".55"') + F('M66 24 H92 L34 76 Z', 'opacity=".55"') + F('M92 24 L34 76 H8 Z') + F('M8 92 H92 L34 76 Z') + F('M34 76 H92 V92 Z', 'opacity=".55"'))],
  ['Z en cuadrícula', (w) => svg(B, w, Array.from({ length: 9 }, (_, i) => `<path d="M${10 + i * 10} 4 V96 M4 ${10 + i * 10} H96" stroke-width="0.8" opacity=".4"/>`).join('') + L('M20 20 H80 L20 80 H80', 10))],
];

/* para meter dentro de la palabra: a la altura de las mayúsculas (≈ 0.7 del tamaño de letra) */
export const ZD = {
  pix: (h) => svg(B, h, pix(['XXXXX', '...X.', '..X..', '.X...', 'XXXXX'])),
  estencil: (h, c) => svg(B, h, F(ZP) + hueco('M60 16 V32 M40 68 V84', c, 6)),
  doble: (h, c) => svg(B, h, L('M10 10 H90 L10 90 H90', 18) + hueco('M10 10 H90 L10 90 H90', c, 8)),
  puntos: (h) => svg(B, h, [[10, 10], [36, 10], [62, 10], [90, 10], [63, 37], [37, 63], [10, 90], [36, 90], [62, 90], [90, 90]].map(([x, y]) => punto(x, y, 8)).join('')),
  redonda: (h) => svg(B, h, L('M14 14 H86 L14 86 H86', 18)),
  doblada: (h) => svg(B, h, F('M4 4 H96 L82 20 H4 Z') + F('M82 20 H96 L18 80 H4 Z', 'opacity=".5"') + F('M18 80 H96 V96 H4 Z')),
  barra: (h) => svg(B, h, F(ZP) + F('M24 42 H76 V58 H24 Z')),
  larga: (h) => svg('0 0 260 100', h * 2.6, F('M8 8 H92 V24 L34 76 H252 V92 H8 V76 L66 24 H8 Z')),
  chispa: (h) => svg('0 -20 120 120', h * 1.2, F(ZP) + F('M108 -18 C109 -8 110 -7 120 -6 C110 -5 109 -4 108 6 C107 -4 106 -5 96 -6 C106 -7 107 -8 108 -18 Z')),
};
