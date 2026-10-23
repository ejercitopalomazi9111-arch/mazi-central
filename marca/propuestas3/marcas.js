/* LAS MARCAS DE LA RONDA 3 · dibujadas a mano en vector, de un solo color (currentColor).
   Cada función regresa un <svg> listo. Carlos, 24 de octubre: «haz uno que sea la mitad una
   aureola rota y la otra mitad un cuerno, y haz otros 100 misma rúbrica… algunos que recuerden a
   Temmie (Undertale) y algunos a Detroit: Become Human». De esos dos van GUIÑOS, no copias: el
   personaje y la marca de cada juego son de sus dueños (lo mismo que pasó con Torre Infinita). */
const RAD = Math.PI / 180;
export const arco = (cx, cy, r, a0, a1, ry = r) => {
  const p = (a) => [cx + r * Math.cos(a * RAD), cy + ry * Math.sin(a * RAD)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1), large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${ry} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
export const svg = (vb, w, cuerpo, sw = 4) => { const [x, y, a, h] = vb.split(' ').map(Number);
  return `<svg viewBox="${vb}" width="${w}" height="${(w * h / a).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`; };
export const R = 'fill="currentColor" stroke="none"';
export const punto = (x, y, r = 3.5) => `<circle cx="${x}" cy="${y}" r="${r}" ${R}/>`;
const anillo = (cx, cy, r, tramos, ry) => tramos.map(([a, b]) => `<path d="${arco(cx, cy, r, a, b, ry)}"/>`).join('');

/* ── la principal: mitad aureola rota, mitad cuerno ── */
export const HALO_CUERNO = (w = 120, sw = 5) => svg('0 -12 140 124', w,
  anillo(60, 62, 44, [[262, 226], [212, 170], [156, 112]]) + `<path d="M74 104 A44 44 0 0 0 82 24 C90 12 102 2 118 -6 C112 8 110 20 112 34 C122 60 108 96 74 104 Z" ${R}/>`, sw);
export const HALO_CUERNO_B = (w = 120, sw = 5) => svg('0 -16 140 130', w,
  anillo(60, 62, 44, [[268, 218], [204, 154], [140, 98]]) + `<path d="M58 106.5 A44.5 44.5 0 0 0 98 40 C104 22 112 8 124 -6 C126 18 128 44 120 68 C110 96 86 108 58 106.5 Z" ${R}/>`, sw);
export const HALO_CUERNO_C = (w = 120, sw = 5) => svg('0 -16 140 130', w,
  anillo(60, 62, 44, [[268, 218], [204, 154], [140, 98]]) + `<path d="M60 106 A44 44 0 0 0 94 34 C98 20 102 6 108 -10 C118 10 124 38 118 64 C110 92 88 106 60 106 Z" ${R}/>`, sw);

/* ── piezas ── */
const CUERNO = (x = 0, y = 0, s = 1, rot = 0) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0 0 C-2 -36 10 -68 40 -90 C28 -62 24 -32 28 0 Z" ${R}/>`;
const PLUMA = (cx, cy, s = 1, rot = 0, lleno = false, sw) => `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})"><path d="M0 -46 C16 -26 16 18 0 40 C-16 18 -16 -26 0 -46 Z" ${lleno ? R : ''}/><path d="M0 -40 V54"${sw ? ` stroke-width="${sw}"` : ''}/></g>`;

export const M = {
  /* aureolas */
  haloDos: (w) => svg('0 0 120 40', w, `<path d="${arco(60, 26, 52, 186, 262, 14)}"/><path d="${arco(60, 26, 52, 278, 354, 14)}"/>`, 4),
  haloTres: (w) => svg('0 0 120 44', w, anillo(60, 24, 52, [[190, 240], [252, 300], [312, 350]], 16), 4),
  haloInclinado: (w) => svg('0 0 120 70', w, `<g transform="rotate(-14 60 35)">${anillo(60, 35, 50, [[0, 150], [170, 330]], 16)}</g>`, 3.5),
  haloPuntos: (w) => svg('0 0 120 40', w, Array.from({ length: 13 }, (_, i) => { const a = (190 + i * 13) * RAD; return punto(60 + 52 * Math.cos(a), 30 + 18 * Math.sin(a), i === 6 ? 0 : 3); }).join('')),
  haloGrieta: (w) => svg('0 0 120 44', w, `<path d="${arco(60, 28, 52, 190, 266, 16)}"/><path d="M60 12 L66 20 L58 24 L64 32" stroke-width="2.5"/><path d="${arco(60, 28, 52, 280, 350, 16)}"/>`, 4),
  haloChispas: (w) => svg('0 0 120 60', w, `<path d="${arco(60, 40, 50, 200, 340, 14)}"/><path d="M60 4 V14 M46 8 L50 16 M74 8 L70 16"/>`, 3.5),
  haloDoble: (w) => svg('0 0 120 50', w, `<path d="${arco(60, 30, 52, 200, 330, 16)}"/><path d="${arco(60, 30, 40, 214, 300, 11)}" stroke-width="2.5"/>`, 4),
  haloSombra: (w) => svg('0 0 120 60', w, `<path d="${arco(60, 20, 46, 190, 350, 12)}"/><path d="M26 54 H94" stroke-dasharray="6 7" stroke-width="3"/>`, 4),
  haloCorona: (w) => svg('0 0 120 60', w, `<path d="${arco(60, 44, 52, 196, 344, 14)}"/><path d="M30 34 L40 12 L52 28 L60 6 L68 28 L80 12 L90 34" stroke-width="3"/>`, 3.5),
  haloSobreM: (w) => svg('0 0 100 100', w, `<path d="${arco(50, 18, 36, 192, 270, 10)}"/><path d="${arco(50, 18, 36, 284, 348, 10)}"/><path d="M14 94 V40 L50 76 L86 40 V94"/>`, 6),
  /* cuernos */
  cuernoSolo: (w) => svg('0 -94 50 98', w, CUERNO(4, 0)),
  cuernoLinea: (w) => svg('-4 -96 54 102', w, `<path d="M0 0 C-2 -36 10 -68 40 -90 C28 -62 24 -32 28 0 Z"/>`, 3),
  cuernoCircuito: (w) => svg('-4 -96 54 102', w, `<path d="M0 0 C-2 -36 10 -68 40 -90 C28 -62 24 -32 28 0 Z"/><path d="M10 -6 V-26 L18 -34"/>${punto(18, -34, 3)}<path d="M20 -8 V-20 L26 -26"/>${punto(26, -26, 2.6)}<path d="M14 -42 L22 -52 V-62"/>${punto(22, -62, 2.6)}`, 2.5),
  cuernoGrietas: (w, c) => svg('-2 -94 50 98', w, CUERNO(2, 0) + `<path d="M8 -8 L14 -20 L10 -30 L18 -44" stroke="${c}" stroke-width="2.5"/><path d="M22 -50 L26 -62" stroke="${c}" stroke-width="2.5"/>`),
  cuernoEspiral: (w) => svg('0 0 90 90', w, `<path d="M46 86 C14 84 6 52 20 32 C34 12 70 14 74 42 C78 64 56 74 46 60 C38 50 48 38 56 44"/>`, 5),
  cuernosPar: (w) => svg('0 -94 110 98', w, CUERNO(10, 0, 1, 0) + `<g transform="translate(100 0) scale(-1 1)">${CUERNO(0, 0)}</g>`),
  cuernoCirculo: (w) => svg('0 0 100 100', w, `<circle cx="44" cy="60" r="32"/><path d="M62 34 C68 18 80 8 98 2 C90 14 86 26 86 40 Z" ${R}/>`, 4),
  cuernoAnillos: (w) => svg('-4 -96 54 102', w, `<path d="M0 0 C-2 -36 10 -68 40 -90 C28 -62 24 -32 28 0 Z"/><path d="M1 -14 H27 M1 -30 L26 -27 M4 -46 L26 -40 M10 -60 L28 -52 M18 -72 L32 -64"/>`, 2.5),
  cuernoPixel: (w) => svg('0 0 70 100', w, [[0, 90], [10, 90], [20, 90], [0, 80], [10, 80], [20, 80], [10, 70], [20, 70], [10, 60], [20, 60], [30, 60], [20, 50], [30, 50], [20, 40], [30, 40], [40, 40], [30, 30], [40, 30], [40, 20], [50, 20], [50, 10], [60, 0]].map(([x, y]) => `<rect x="${x}" y="${y}" width="10" height="10" ${R}/>`).join('')),
  cuernoCorte: (w, c) => svg('-2 -94 50 98', w, CUERNO(2, 0) + `<path d="M-4 -40 L48 -54" stroke="${c}" stroke-width="5"/>`),
  /* mezclas aureola + cuerno */
  mezclaElipse: (w) => svg('0 0 140 80', w, `<path d="${arco(64, 54, 56, 176, 262, 18)}"/><path d="${arco(64, 54, 56, 100, 160, 18)}"/><path d="M64 36 C96 36 118 42 120 54 C122 64 100 72 64 72 C94 66 108 60 106 52 C104 44 92 40 80 38 C100 30 116 18 126 2 C124 20 114 32 96 40 Z" ${R}/>`, 3.5),
  mezclaMitad: (w) => svg('0 0 100 100', w, `<path d="${arco(50, 50, 40, 100, 160)}"/><path d="${arco(50, 50, 40, 176, 260)}"/><path d="M50 10 V90" stroke-width="2"/><path d="M54 90 C80 88 92 70 90 48 C88 30 76 18 90 2 C70 10 60 26 62 44 C64 62 58 80 54 90 Z" ${R}/>`, 4),
  mezclaDiadema: (w) => svg('0 0 120 60', w, `<path d="${arco(60, 44, 46, 196, 270, 14)}"/><path d="M68 30 C80 26 92 16 98 2 C100 16 96 28 88 36 Z" ${R}/><path d="${arco(60, 44, 46, 300, 344, 14)}"/>`, 4),
  /* plumas */
  plumaLinea: (w) => svg('0 0 60 110', w, PLUMA(30, 52, 1, 18), 2.5),
  plumaSolida: (w) => svg('0 0 60 110', w, PLUMA(30, 52, 1, -16, true), 3),
  plumaCircuito: (w) => svg('0 0 100 110', w, `<path d="M18 104 L84 12"/><path d="M38 76 L28 66 V56"/>${punto(28, 53)}<path d="M52 56 L42 46 V36"/>${punto(42, 33)}<path d="M66 36 L58 28 V20"/>${punto(58, 17)}<path d="M46 66 L62 70 H72"/>${punto(75, 70)}<path d="M60 46 L76 50 H84"/>${punto(87, 50)}`, 2.5),
  plumaPixel: (w) => svg('0 0 70 100', w, [[30, 0], [20, 10], [30, 10], [40, 10], [20, 20], [30, 20], [40, 20], [10, 30], [20, 30], [30, 30], [40, 30], [10, 40], [20, 40], [30, 40], [40, 40], [20, 50], [30, 50], [40, 50], [20, 60], [30, 60], [30, 70], [30, 80], [30, 90]].map(([x, y]) => `<rect x="${x}" y="${y}" width="10" height="10" ${R}/>`).join('')),
  plumaHueco: (w, c) => svg('0 0 60 110', w, PLUMA(30, 52, 1, 20, true) + `<path d="M8 50 L52 36" stroke="${c}" stroke-width="5" transform="rotate(20 30 52)"/>`, 3),
  plumaLineas: (w) => svg('0 0 80 110', w, `<path d="M40 6 V104"/>` + Array.from({ length: 7 }, (_, i) => { const y = 16 + i * 11, a = 18 - Math.abs(i - 3) * 3; return `<path d="M40 ${y + 8} L${40 - a} ${y}"/><path d="M40 ${y + 8} L${40 + a} ${y}"/>`; }).join(''), 2.5),
  plumaTinta: (w) => svg('0 0 70 120', w, PLUMA(30, 48, 0.9, 24) + `<path d="M50 108 C44 100 44 92 50 86 C56 92 56 100 50 108 Z" ${R}/>`, 2.5),
  plumasCruzadas: (w) => svg('0 0 110 100', w, PLUMA(36, 50, 0.9, -24) + PLUMA(74, 50, 0.9, 24), 2.5),
  plumaCirculo: (w, c) => svg('0 0 100 100', w, `<circle cx="50" cy="50" r="46" ${R}/>` + `<g style="color:${c}">${PLUMA(50, 52, 0.8, 30, true)}</g>`.replace(/currentColor/g, c), 3),
  plumaM: (w) => svg('0 0 120 100', w, `<path d="M10 94 V20 L60 74"/><path d="M60 74 L110 20 V94"/><path d="M110 20 C96 26 88 40 86 56 C96 46 106 34 110 20 Z" ${R}/>`, 6),
  /* alas */
  alaTres: (w) => svg('0 0 140 90', w, `<path d="M136 86 Q80 78 6 10"/><path d="M136 86 Q92 68 38 30"/><path d="M136 86 Q104 62 74 46"/>`, 4),
  alaAngular: (w) => svg('0 0 110 70', w, `<path d="M6 64 L60 10 H104 L70 34 H96 L44 64 Z" ${R}/>`),
  alaPixel: (w) => svg('0 0 100 60', w, [[0, 0], [10, 0], [20, 0], [30, 0], [40, 0], [50, 0], [60, 0], [10, 10], [20, 10], [30, 10], [40, 10], [50, 10], [60, 10], [70, 10], [30, 20], [40, 20], [50, 20], [60, 20], [70, 20], [80, 20], [50, 30], [60, 30], [70, 30], [80, 30], [90, 30], [70, 40], [80, 40], [90, 40]].map(([x, y]) => `<rect x="${x}" y="${y}" width="10" height="10" ${R}/>`).join('')),
  alaPildoras: (w) => svg('0 0 110 70', w, `<g transform="rotate(-14 55 35)"><rect x="4" y="6" width="96" height="13" rx="6.5" ${R}/><rect x="22" y="27" width="78" height="13" rx="6.5" ${R}/><rect x="40" y="48" width="60" height="13" rx="6.5" ${R}/></g>`),
  alaHoja: (w) => svg('0 0 160 50', w, `<path d="M4 44 Q80 -6 156 6 Q90 20 4 44 Z" ${R}/>`),
  alaCirculo: (w) => svg('0 0 120 90', w, `<circle cx="40" cy="50" r="30"/><path d="M68 40 Q92 22 118 18 M68 52 Q94 40 112 40 M66 64 Q86 58 102 60"/>`, 4),
  alaPlumas: (w) => svg('0 0 130 80', w, Array.from({ length: 6 }, (_, i) => `<path d="M${12 + i * 20} 76 C${8 + i * 20} ${50 - i * 6} ${18 + i * 20} ${30 - i * 4} ${30 + i * 18} ${14 - i * 1}" />`).join(''), 4),
  alaMecanica: (w) => svg('0 0 140 80', w, `<path d="M8 72 L40 20 L54 28 L24 76 Z M44 70 L78 14 L92 22 L60 74 Z M80 66 L116 8 L130 16 L96 70 Z" />`, 3),
  /* colas */
  colaAbanico: (w) => svg('0 0 124 68', w, [10, 32, 62, 92, 114].map((x, i) => `<path d="M62 64 L${x} ${[22, 8, 4, 8, 22][i]}"/>`).join(''), 3.5),
  colaGolondrina: (w) => svg('0 0 60 90', w, `<path d="M30 4 L54 60 L42 86 L30 66 L18 86 L6 60 Z" ${R}/>`),
  colaPuntos: (w) => svg('0 0 120 70', w, [[60, 64, 5]].concat(Array.from({ length: 9 }, (_, i) => { const a = (200 + i * 17.5) * RAD; return [60 + 54 * Math.cos(a), 64 + 58 * Math.sin(a), 4]; })).map(([x, y, r]) => punto(x.toFixed(1), y.toFixed(1), r)).join('')),
  colaCometa: (w) => svg('0 0 140 50', w, `<circle cx="120" cy="25" r="14" ${R}/><path d="M104 20 H10 M104 30 H30 M100 25 H50" />`, 3),
  colaOjo: (w) => svg('0 0 100 110', w, `<path d="M50 6 C80 30 84 70 50 104 C16 70 20 30 50 6 Z"/><circle cx="50" cy="52" r="14"/><circle cx="50" cy="52" r="5" ${R}/>`, 3),
  /* circuito / placa madre */
  circuitoM: (w) => svg('0 0 112 92', w, `<path d="M10 82 V18 H30 L56 50 L82 18 H102 V82"/><path d="M56 50 V82"/>${punto(10, 84, 5)}${punto(56, 84, 5)}${punto(102, 84, 5)}`, 3.5),
  chip: (w) => svg('0 0 100 100', w, `<rect x="26" y="26" width="48" height="48" rx="6"/><path d="M38 26 V10 M50 26 V10 M62 26 V10 M38 74 V90 M50 74 V90 M62 74 V90 M26 38 H10 M26 50 H10 M26 62 H10 M74 38 H90 M74 50 H90 M74 62 H90"/><path d="M40 60 V40 L50 52 L60 40 V60" stroke-width="3"/>`, 3),
  vias: (w) => svg('0 0 100 100', w, Array.from({ length: 16 }, (_, i) => punto(16 + (i % 4) * 22, 16 + Math.floor(i / 4) * 22, 3)).join('') + `<path d="M16 82 V60 L38 38 H60 L82 16"/>`, 3.5),
  circuitoG: (w) => svg('0 0 100 100', w, `<path d="M84 22 H30 L14 38 V64 L30 80 H84 V52 H56"/>${punto(56, 52, 5)}`, 4),
  esquinaPCB: (w) => svg('0 0 100 100', w, `<path d="M6 94 V40 L40 6 H94"/><path d="M22 94 V48 L48 22 H94"/><path d="M38 94 V56 L56 38 H94"/>${punto(94, 6)}${punto(94, 22)}${punto(94, 38)}`, 3),
  circuitoFlecha: (w) => svg('0 0 120 60', w, `<path d="M6 30 H40 L54 14 H86"/><path d="M6 30 H96"/><path d="M40 30 L54 46 H86"/><path d="M96 18 L112 30 L96 42"/>${punto(86, 14)}${punto(86, 46)}`, 3),
  bga: (w) => svg('0 0 100 100', w, `<rect x="6" y="6" width="88" height="88" rx="10"/>` + Array.from({ length: 25 }, (_, i) => [2, 6, 7, 8, 12, 16, 17, 18, 22].includes(i) ? '' : punto(22 + (i % 5) * 14, 22 + Math.floor(i / 5) * 14, 4)).join(''), 3),
  /* Iron Man */
  reactor: (w) => svg('0 0 92 92', w, `<circle cx="46" cy="46" r="42"/><circle cx="46" cy="46" r="31" stroke-dasharray="11 6"/><circle cx="46" cy="46" r="12" ${R}/>`, 2.4),
  reactorTriangulo: (w) => svg('0 0 80 80', w, `<circle cx="40" cy="42" r="34"/><path d="M40 16 L62 56 H18 Z"/>`, 3.5),
  ojos: (w) => svg('0 0 130 34', w, `<path d="M8 6 L56 12 L52 30 L14 24 Z" ${R}/><path d="M122 6 L74 12 L78 30 L116 24 Z" ${R}/>`),
  mascara: (w) => svg('0 0 80 100', w, `<path d="M40 4 L72 14 L74 52 L58 94 H22 L6 52 L8 14 Z"/><path d="M18 40 L34 45"/><path d="M62 40 L46 45"/><path d="M30 74 H50"/>`, 2.6),
  repulsor: (w) => svg('0 0 100 100', w, `<circle cx="50" cy="50" r="16"/>` + Array.from({ length: 12 }, (_, i) => { const a = i * 30 * RAD; return `<path d="M${(50 + 24 * Math.cos(a)).toFixed(1)} ${(50 + 24 * Math.sin(a)).toFixed(1)} L${(50 + (i % 2 ? 36 : 44) * Math.cos(a)).toFixed(1)} ${(50 + (i % 2 ? 36 : 44) * Math.sin(a)).toFixed(1)}"/>`; }).join(''), 3),
  hud: (w) => svg('0 0 120 70', w, `<path d="M4 20 V4 H24 M96 4 H116 V20 M116 50 V66 H96 M24 66 H4 V50"/><path d="M40 35 H80 M60 20 V50" stroke-width="1.6"/><circle cx="60" cy="35" r="8" stroke-width="1.6"/>`, 3),
  casco: (w) => svg('0 0 90 100', w, `<path d="M45 4 C72 4 84 22 84 46 L78 74 L60 96 H30 L12 74 L6 46 C6 22 18 4 45 4 Z"/><path d="M18 44 L38 48 L36 56 L20 54 Z M72 44 L52 48 L54 56 L70 54 Z" ${R}/>`, 2.8),
  energia: (w) => svg('0 0 120 60', w, `<path d="M4 50 C30 50 34 10 60 10 C86 10 90 50 116 50"/><path d="M50 36 L60 22 L70 36" stroke-width="2"/>${punto(60, 10, 5)}`, 3),
  /* Detroit: Become Human (guiños: el aro LED, la banda, el número de serie) */
  led: (w) => svg('0 0 80 80', w, `<circle cx="40" cy="40" r="32" stroke-width="3" opacity=".35"/><path d="${arco(40, 40, 32, -90, 120)}" stroke-width="7"/>`),
  ledPerfil: (w) => svg('0 0 90 110', w, `<path d="M52 104 V86 C64 84 72 76 72 66 L80 60 L72 52 C72 24 58 6 36 6 C18 6 8 22 8 42 C8 62 18 74 30 80 V104"/><circle cx="44" cy="44" r="8" stroke-width="3.5"/>`, 3),
  banda: (w) => svg('0 0 120 60', w, `<path d="M4 18 H116 M4 42 H116" stroke-width="3"/><path d="M60 10 L76 38 H44 Z" ${R}/>`),
  serie: (w) => svg('0 0 120 40', w, `<rect x="3" y="3" width="114" height="34" rx="6"/><path d="M14 12 V28 M20 12 V28 M24 12 V28 M32 12 V28 M36 12 V28" stroke-width="2"/>`, 2.5),
  ledAnillos: (w) => svg('0 0 90 90', w, `<path d="${arco(45, 45, 40, -80, 60)}"/><path d="${arco(45, 45, 28, 100, 250)}"/><path d="${arco(45, 45, 16, -60, 160)}"/>`, 4.5),
  caraDividida: (w) => svg('0 0 80 100', w, `<path d="M40 4 C64 4 74 24 74 48 C74 76 58 96 40 96"/><path d="M40 4 C16 4 6 24 6 48 C6 76 22 96 40 96" stroke-dasharray="4 6"/><path d="M40 4 V96" stroke-width="1.5"/><circle cx="56" cy="40" r="5" ${R}/>`, 3),
  hexCelda: (w) => svg('0 0 100 90', w, `<path d="M28 6 H72 L94 45 L72 84 H28 L6 45 Z"/><path d="M40 28 H60 L70 45 L60 62 H40 L30 45 Z" ${R}/>`, 3),
  ledGota: (w) => svg('0 0 60 90', w, `<path d="M30 4 C48 30 54 46 54 58 C54 74 42 86 30 86 C18 86 6 74 6 58 C6 46 12 30 30 4 Z"/><circle cx="30" cy="60" r="12" stroke-width="5"/>`, 3),
  /* guiños a Temmie (una criatura de garabato: orejas caídas, ojos de punto, bigotes) */
  criatura: (w) => svg('0 0 120 100', w, `<path d="M30 30 C30 12 90 12 90 30 C104 34 108 70 92 84 C76 96 44 96 28 84 C12 70 16 34 30 30 Z"/><path d="M30 30 C14 30 4 44 6 62 M90 30 C106 30 116 44 114 62"/>${punto(46, 54, 4.5)}${punto(74, 54, 4.5)}<path d="M56 68 Q60 72 64 68"/><path d="M28 60 H12 M28 68 H14 M92 60 H108 M92 68 H106" stroke-width="2"/>`, 3),
  criaturaPixel: (w) => svg('0 0 100 90', w, [[20, 0], [70, 0], [10, 10], [20, 10], [30, 10], [60, 10], [70, 10], [80, 10]].concat(Array.from({ length: 48 }, (_, i) => [10 + (i % 8) * 10, 20 + Math.floor(i / 8) * 10])).filter(([x, y]) => !((x === 30 || x === 60) && y === 40) && !(y === 60 && x >= 40 && x <= 50)).map(([x, y]) => `<rect x="${x}" y="${y}" width="10" height="10" ${R}/>`).join('')),
  hoi: (w) => svg('0 0 120 90', w, `<path d="M10 10 H110 V62 H46 L28 82 V62 H10 Z"/><path d="M28 24 V48 M28 36 H40 M40 24 V48 M56 26 C66 26 66 46 56 46 C46 46 46 26 56 26 M76 24 V42 M76 48 V49" stroke-width="3.5"/>`, 3),
  huella: (w) => svg('0 0 100 100', w, `<path d="M30 70 C30 52 70 52 72 70 C74 88 30 90 30 70 Z" ${R}/><ellipse cx="22" cy="42" rx="9" ry="12" ${R}/><ellipse cx="42" cy="26" rx="9" ry="12" ${R}/><ellipse cx="64" cy="26" rx="9" ry="12" ${R}/><ellipse cx="82" cy="44" rx="9" ry="12" ${R}/>`),
  asomada: (w) => svg('0 0 120 50', w, `<path d="M20 50 C20 12 100 12 100 50"/><path d="M20 30 C6 30 0 40 2 50 M100 30 C114 30 120 40 118 50"/>${punto(46, 34, 4)}${punto(74, 34, 4)}<path d="M54 44 Q60 48 66 44"/>`, 3),
  criaturaHalo: (w) => svg('0 0 120 110', w, `<path d="${arco(60, 14, 30, 190, 350, 7)}"/><path d="M34 40 C34 26 86 26 86 40 C98 44 102 76 88 88 C74 100 46 100 32 88 C18 76 22 44 34 40 Z"/>${punto(50, 62)}${punto(70, 62)}<path d="M56 74 Q60 78 64 74"/>`, 3),
  copo: (w) => svg('0 0 100 100', w, `<path d="M50 6 V94 M12 28 L88 72 M88 28 L12 72"/><path d="M42 14 L50 22 L58 14 M42 86 L50 78 L58 86" stroke-width="2.5"/>`, 4),
  bigotes: (w) => svg('0 0 120 50', w, `<path d="M52 24 H8 M52 32 L12 42 M52 16 L12 6 M68 24 H112 M68 32 L108 42 M68 16 L108 6"/><path d="M54 28 Q60 34 66 28"/>`, 3),
  /* otros */
  mDeCuernos: (w) => svg('0 0 120 100', w, `<path d="M12 96 C10 60 20 26 50 6 C40 34 38 62 40 96 Z" ${R}/><path d="M108 96 C110 60 100 26 70 6 C80 34 82 62 80 96 Z" ${R}/><path d="M42 50 L60 72 L78 50" stroke-width="7"/>`),
  mDeArcos: (w) => svg('0 0 120 90', w, `<path d="M8 86 V50 A26 26 0 0 1 60 50 V86"/><path d="M60 50 A26 26 0 0 1 112 50 V86" stroke-dasharray="40 8"/>`, 6),
  juntos: (w) => svg('0 0 120 80', w, `<circle cx="44" cy="40" r="30"/><circle cx="76" cy="40" r="30"/>`, 4),
  manos: (w) => svg('0 0 120 70', w, `<path d="M6 40 H40 C50 40 56 30 64 30 H84 C90 30 90 40 84 40 H66"/><path d="M114 30 H80 C70 30 64 40 56 40 H36 C30 40 30 30 36 30 H54"/>`, 4),
  chispa: (w) => svg('0 0 80 80', w, `<path d="M40 4 C44 30 50 36 76 40 C50 44 44 50 40 76 C36 50 30 44 4 40 C30 36 36 30 40 4 Z" ${R}/>`),
  ojo: (w) => svg('0 0 120 60', w, `<path d="M4 30 C30 2 90 2 116 30 C90 58 30 58 4 30 Z"/><circle cx="60" cy="30" r="12" ${R}/>`, 3.5),
  escudo: (w) => svg('0 0 80 100', w, `<path d="M40 4 L74 16 V48 C74 72 58 88 40 96 C22 88 6 72 6 48 V16 Z"/><path d="M40 22 V78" stroke-width="2"/>`, 3.5),
  flama: (w) => svg('0 0 70 100', w, `<path d="M36 4 C46 30 66 40 64 64 C62 86 46 96 34 96 C18 96 6 82 8 64 C10 48 22 42 24 28 C30 36 32 44 32 52 C40 40 42 22 36 4 Z" ${R}/>`),
  rayo: (w) => svg('0 0 60 100', w, `<path d="M36 4 L8 56 H30 L22 96 L52 40 H30 Z" ${R}/>`),
  infinito: (w) => svg('0 0 140 60', w, `<path d="M70 30 C52 6 14 6 14 30 C14 54 52 54 70 30 C88 6 126 6 126 30 C126 54 88 54 70 30 Z"/>`, 5),
  diamante: (w) => svg('0 0 100 90', w, `<path d="M24 6 H76 L96 30 L50 86 L4 30 Z"/><path d="M4 30 H96 M36 6 L50 30 L64 6 M50 30 V86" stroke-width="2"/>`, 3),
  orbita: (w) => svg('0 0 110 70', w, `<ellipse cx="55" cy="35" rx="50" ry="16" transform="rotate(-16 55 35)"/><circle cx="55" cy="35" r="12" ${R}/>`, 3),
  luna: (w) => svg('0 0 80 80', w, `<path d="M58 6 A36 36 0 1 0 74 62 A28 28 0 1 1 58 6 Z" ${R}/>`),
  montana: (w) => svg('0 0 120 70', w, `<path d="M4 66 L44 14 L64 40 L78 24 L116 66 Z" ${R}/>`),
  comillas: (w) => svg('0 0 90 70', w, `<path d="M8 64 C8 40 16 18 38 6 C30 22 30 34 34 44 C40 54 30 66 20 64 Z M50 64 C50 40 58 18 80 6 C72 22 72 34 76 44 C82 54 72 66 62 64 Z" ${R}/>`),
  corona: (w) => svg('0 0 120 70', w, `<path d="M8 62 L14 12 L38 38 L60 6 L82 38 L106 12 L112 62 Z"/><path d="M60 6 L66 18" stroke-width="2"/>`, 3.5),
  estrellaRota: (w) => svg('0 0 100 100', w, `<path d="M50 4 L62 38 H96 L68 58 L80 94 L50 72"/><path d="M44 68 L20 94 L32 58 L4 38 H38 L46 16"/>`, 3.5),
  ancla: (w) => svg('0 0 80 100', w, `<circle cx="40" cy="14" r="9"/><path d="M40 24 V94 M20 40 H60 M8 66 C10 84 26 94 40 94 C54 94 70 84 72 66"/>`, 4),
  llave: (w) => svg('0 0 120 60', w, `<circle cx="26" cy="30" r="20"/><path d="M46 30 H114 M96 30 V46 M82 30 V42"/>`, 4),
  pulso: (w) => svg('0 0 140 50', w, `<path d="M4 26 H40 L50 6 L62 44 L72 26 H136"/>`, 4),
};
