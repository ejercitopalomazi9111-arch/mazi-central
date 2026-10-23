/* LAS MARCAS DE LA RONDA 4 · vector a mano, de un solo color (currentColor).
   Carlos, 24 de octubre: «haz algunos relacionados a nuestro rubro… otros que pienses en la marca y
   otros que te den ambas sensaciones, así como algunas cosas de mitología que hagan referencia a
   nuestro rubro, como el libro 1984 o un deus ex machina». */
import { svg, R, arco, punto } from '../propuestas3/marcas.js';
export { svg, R, arco, punto };
const RAD = Math.PI / 180;
const pix = (filas, t = 10) => filas.flatMap((f, y) => [...f].map((ch, x) => ch === 'X' ? `<rect x="${x * t}" y="${y * t}" width="${t}" height="${t}" ${R}/>` : '')).join('');
/* la paloma de la casa, de perfil y con el ala arriba: la misma en todos los que la usan */
export const PALOMA = 'M8 44 L18 38 C20 30 30 28 36 34 C42 40 46 46 52 48 C58 30 70 12 92 2 C86 18 80 32 70 46 C84 44 100 48 116 58 C102 62 90 62 80 62 C74 72 56 78 42 72 C30 66 22 56 20 48 Z';
const CURSOR = 'M24 24 L24 96 L42 80 L54 106 L66 100 L54 74 L78 74 Z';

export const M = {
  /* ── el rubro: lo que hacemos ── */
  navegador: (dentro) => `<div style="border:3px solid currentColor;border-radius:14px;overflow:hidden"><div style="display:flex;gap:8px;padding:10px 14px;border-bottom:3px solid currentColor">${[0, 1, 2].map(() => '<span style="width:11px;height:11px;border-radius:50%;background:currentColor;display:block"></span>').join('')}</div><div style="padding:20px 38px 24px">${dentro}</div></div>`,
  visor: (w) => svg('0 0 120 84', w, `<rect x="4" y="4" width="112" height="76" rx="8"/><path d="M41.3 4 V80 M78.6 4 V80 M4 29.3 H116 M4 54.6 H116" stroke-width="1.5"/>${punto(78.6, 29.3, 6)}`, 3.5),
  gantt: (w) => svg('0 0 120 70', w, `<rect x="4" y="2" width="64" height="14" rx="7" ${R}/><rect x="30" y="27" width="72" height="14" rx="7" ${R}/><rect x="58" y="52" width="58" height="14" rx="7" ${R}/>`),
  megafono: (w) => svg('0 0 120 84', w, `<path d="M8 30 H28 L84 6 V74 L28 50 H8 Z"/><path d="M30 52 L38 78 H48 L44 56"/><path d="${arco(86, 40, 16, -40, 40)}"/><path d="${arco(86, 40, 28, -40, 40)}"/>`, 4),
  diafragma: (w) => svg('0 0 100 100', w, `<circle cx="50" cy="50" r="44"/>` + Array.from({ length: 6 }, (_, i) => { const a = i * 60 * RAD, b = (i * 60 + 105) * RAD;
    return `<path d="M${(50 + 44 * Math.cos(a)).toFixed(1)} ${(50 + 44 * Math.sin(a)).toFixed(1)} L${(50 + 17 * Math.cos(b)).toFixed(1)} ${(50 + 17 * Math.sin(b)).toFixed(1)}"/>`; }).join(''), 3.5),
  cursor: (w) => svg('-4 -8 90 118', w, `<path d="${CURSOR}" ${R}/><path d="M14 8 L8 0 M8 20 L-1 18 M22 6 L24 -4"/>`, 4),
  pelicula: (w) => svg('0 0 64 120', w, `<path fill-rule="evenodd" ${R} d="M0 0 H64 V120 H0 Z ${[8, 32, 56, 80, 102].map(y => `M6 ${y} h8 v10 h-8 Z M50 ${y} h8 v10 h-8 Z`).join(' ')} M20 12 h24 v44 h-24 Z M20 64 h24 v44 h-24 Z"/>`),
  movimiento: (w) => svg('0 0 134 80', w, `${punto(10, 62, 8)}<path d="M22 56 C52 8 88 96 120 26" stroke-dasharray="1 11"/><path d="M106 22 L122 24 L120 40"/>`, 4.5),
  /* ── la marca: lo que somos ── */
  paloma: (w) => svg('0 0 120 80', w, `<path d="${PALOMA}" ${R}/>`),
  olivo: (w) => svg('0 0 110 100', w, `<path d="M8 94 C36 74 66 44 100 8"/>` + [[30, 78, -50], [44, 64, 40], [58, 52, -55], [72, 38, 35], [86, 26, -60], [100, 8, -45]].map(([x, y, r], i) => `<ellipse cx="${x + (i % 2 ? 9 : -9)}" cy="${y + (i % 2 ? 4 : -6)}" rx="12" ry="5" transform="rotate(${r} ${x + (i % 2 ? 9 : -9)} ${y + (i % 2 ? 4 : -6)})" ${R}/>`).join(''), 3.5),
  mz: (w) => svg('0 0 120 90', w, `<path d="M10 84 V8 L40 48 L70 8 H112 L70 84 H112"/>`, 7),
  mAlas: (w) => svg('0 0 120 90', w, `<path d="M8 84 C8 44 18 16 32 8 C38 30 48 48 60 60 C72 48 82 30 88 8 C102 16 112 44 112 84"/>`, 6),
  alaHalo: (w) => svg('0 0 120 100', w, `<path d="${arco(40, 14, 30, 190, 260, 8)}"/><path d="${arco(40, 14, 30, 280, 350, 8)}"/><path d="M10 86 C8 50 44 30 112 30 C104 40 96 44 86 46 C92 52 88 58 78 60 C82 66 76 72 66 72 C66 80 56 84 46 82 C40 90 24 92 10 86 Z" ${R}/>`, 4),
  mitad: (w) => svg('0 0 100 100', w, `<path d="M50 8 A42 42 0 0 1 50 92 Z" ${R}/><path d="M50 8 A42 42 0 0 0 50 92"/>`, 4),
  martillo: (w) => svg('0 0 100 110', w, `<g transform="rotate(-30 50 55)"><rect x="44" y="36" width="12" height="72" rx="5" ${R}/><rect x="16" y="10" width="68" height="26" rx="5" ${R}/></g>`),
  eslabones: (w) => svg('0 0 120 60', w, `<rect x="4" y="10" width="68" height="40" rx="20"/><rect x="48" y="10" width="68" height="40" rx="20"/>`, 7),
  entrega: (w) => svg('0 0 260 30', w, `<path d="M8 15 H44" stroke-width="14"/><path d="M60 15 H244" stroke-width="2.5"/>${punto(250, 15, 5)}`),
  anillito: (w) => svg('0 0 40 24', w, `<path d="${arco(20, 12, 15, 200, 300, 7)}"/><path d="${arco(20, 12, 15, 320, 520, 7)}"/>`, 3.5),
  /* ── el rubro y la marca a la vez ── */
  llaveCircuito: (w) => svg('0 0 120 120', w, `<path d="${arco(30, 30, 20, 70, 330)}" stroke-width="9"/><path d="M44 44 L78 78" stroke-width="9"/><path d="M78 78 H98 L106 70 M78 78 V98 L70 106 M78 78 L100 100"/>${punto(106, 70)}${punto(70, 106)}${punto(102, 102)}`, 3),
  palomaPixel: (w) => { /* la misma paloma de la casa, pasada a cuadritos: se mide qué cuadros caen dentro del trazo */
    const c = document.createElement('canvas').getContext('2d'), p = new Path2D(PALOMA), t = 6, out = [];
    for(let y = 0; y < 80; y += t) for(let x = 0; x < 120; x += t) if(c.isPointInPath(p, x + t / 2, y + t / 2)) out.push(`<rect x="${x}" y="${y}" width="${t}" height="${t}" ${R}/>`);
    return svg('0 0 120 80', w, out.join('')); },
  cursorHalo: (w) => svg('-4 -8 100 118', w, `<ellipse cx="30" cy="2" rx="20" ry="6"/><path d="${CURSOR}" ${R}/>`, 4),
  mensajera: (w, c) => svg('0 0 130 100', w, `<path d="${PALOMA}" ${R}/><g transform="translate(56 64) rotate(-8)"><rect x="0" y="0" width="44" height="30" rx="3" ${R}/><path d="M2 3 L22 18 L42 3" stroke="${c}" stroke-width="3"/></g>`),
  plumaPunta: (w) => svg('0 0 80 110', w, `<path d="M40 4 C62 20 62 54 48 68 H32 C18 54 18 20 40 4 Z" ${R}/><path d="M32 72 H48 L40 106 Z"/><path d="M40 84 V98" stroke-width="2"/>`, 3),
  cornucopia: (w, c) => svg('0 0 116 100', w, `<path d="M16 26 C8 26 4 14 12 8 C10 16 14 22 22 22 C34 34 56 38 86 36 L78 78 C40 80 16 58 16 26 Z" ${R}/><ellipse cx="82" cy="57" rx="8" ry="21" transform="rotate(10 82 57)" fill="${c}" stroke-width="3.5"/>${punto(100, 50, 7)}${punto(106, 72, 6)}${punto(94, 90, 5)}`),
  wifiHalo: (w) => svg('0 0 120 80', w, `${punto(60, 72, 6)}<path d="${arco(60, 72, 20, 225, 315)}"/><path d="${arco(60, 72, 36, 222, 258)}"/><path d="${arco(60, 72, 36, 274, 318)}"/><path d="${arco(60, 72, 52, 220, 236)}"/><path d="${arco(60, 72, 52, 252, 320)}"/>`, 5),
  cargando: (w) => svg('0 0 100 100', w, Array.from({ length: 8 }, (_, i) => { const a = (i * 45 - 90) * RAD;
    return `<path d="M${(50 + 26 * Math.cos(a)).toFixed(1)} ${(50 + 26 * Math.sin(a)).toFixed(1)} L${(50 + 44 * Math.cos(a)).toFixed(1)} ${(50 + 44 * Math.sin(a)).toFixed(1)}" opacity="${(1 - i * .11).toFixed(2)}"/>`; }).join(''), 8),
  cornetin: (w) => svg('0 0 140 80', w, `<path d="M4 40 L12 34 C40 38 62 32 84 10 L90 70 C66 50 40 46 12 46 Z" ${R}/><path d="${arco(92, 40, 18, -45, 45)}"/><path d="${arco(92, 40, 32, -45, 45)}"/><path d="${arco(92, 40, 46, -40, 40)}"/>`, 4),
  palomaVentana: (w) => svg('0 0 130 100', w, `<rect x="4" y="34" width="74" height="62" rx="7"/><path d="M4 50 H78"/><g transform="translate(64 0) scale(.55)"><path d="${PALOMA}" ${R}/></g>`, 3.5),
  bezier: (w) => svg('0 0 124 104', w, `<path d="M12 92 C20 34 70 14 112 14"/><path d="M12 92 C46 76 84 50 112 14"/><path d="M12 92 L20 34 M112 14 L70 10" stroke-width="1.5"/>${punto(20, 34, 4)}${punto(70, 10, 4)}<rect x="6" y="86" width="12" height="12" ${R}/><rect x="106" y="8" width="12" height="12" ${R}/>`, 3),
  mGrafica: (w) => svg('0 0 112 92', w, `<path d="M4 88 H108" stroke-width="2"/><path d="M8 80 L32 14 L56 56 L80 14 L104 80"/>${[[8, 80], [32, 14], [56, 56], [80, 14], [104, 80]].map(([x, y]) => punto(x, y, 5.5)).join('')}`, 4),
  /* ── mitos, libros y leyendas que hablan de lo que hacemos ── */
  yunque: (w) => svg('0 0 100 80', w, `<path d="M4 22 H88 V32 C78 36 70 38 64 40 V52 L74 66 H26 L36 52 V40 C24 40 14 32 4 22 Z" ${R}/><path d="M72 12 L76 2 M84 14 L94 6 M64 12 L60 4"/>`, 3.5),
  antorcha: (w) => svg('0 0 80 112', w, `<path d="M40 4 C48 18 58 24 56 40 C54 52 46 58 40 58 C32 58 24 50 26 40 C28 30 36 26 36 16 C40 22 40 28 40 32 C46 24 46 14 40 4 Z" ${R}/><path d="M26 64 H54 L46 110 H34 Z" ${R}/>`),
  alaDedalo: (w) => svg('0 0 120 90', w, `<path d="M4 8 H116" stroke-width="5"/>` + Array.from({ length: 7 }, (_, i) => `<path d="M${12 + i * 16} 8 V${82 - i * 10}"/>`).join('') + `<path d="M4 30 H64" stroke-width="2"/>`, 4),
  telepantalla: (w) => svg('0 0 120 100', w, `<rect x="4" y="4" width="112" height="78" rx="12"/><path d="M26 43 C42 22 78 22 94 43 C78 64 42 64 26 43 Z"/>${punto(60, 43, 9)}<path d="M38 82 L30 96 M82 82 L90 96"/>`, 3.5),
  grua: (w) => svg('0 0 110 110', w, `<path d="M18 106 V40 M4 106 H32"/><path d="M18 40 L96 8"/><path d="M18 56 L96 8" stroke-width="2"/>${[0,1,2,3].map(i => { const x = 30 + i * 17, y1 = 40 - (x - 18) * 32 / 78, y2 = 56 - (x - 18) * 48 / 78; return `<path d="M${x} ${y1.toFixed(1)} L${x + 8} ${(y2 - 4).toFixed(1)}" stroke-width="2"/>`; }).join('')}<circle cx="96" cy="8" r="5"/><path d="M96 13 V58" stroke-width="2"/><path d="M96 64 l4 9 10 1 -8 6 3 10 -9 -6 -9 6 3 -10 -8 -6 10 -1 Z" fill="currentColor" stroke="none"/>`, 4),
  golem: (w, c) => svg('0 0 100 104', w, `<circle cx="50" cy="18" r="14" ${R}/><path d="M22 36 H78 L88 74 H72 L70 100 H54 V80 H46 V100 H30 L28 74 H12 Z" ${R}/><rect x="38" y="46" width="24" height="16" rx="2" fill="none" stroke="${c}" stroke-width="2.5"/>`),
  serpiente: (w, c) => svg('0 0 124 100', w, `<path d="M8 74 C24 96 50 92 58 70 C66 48 86 38 104 46" stroke-width="9"/><circle cx="108" cy="47" r="10" ${R}/>${`<circle cx="111" cy="45" r="2.6" fill="${c}" stroke="none"/>`}<path d="M103 38 C99 24 92 16 84 12 M108 37 C108 24 105 14 99 6 M113 38 C117 26 118 18 115 10"/>`, 3),
  espejo: (w) => svg('0 -18 80 124', w, `<circle cx="40" cy="40" r="30" ${R}/><circle cx="40" cy="40" r="36"/><path d="M40 76 V104" stroke-width="8"/><path d="M26 2 C18 -6 30 -10 24 -16 M40 0 C34 -8 46 -12 40 -18 M54 2 C62 -6 50 -10 56 -16"/>`, 2.5),
  ollin: (w, c) => svg('0 0 100 100', w, `<path d="M20 20 L80 80 M80 20 L20 80" stroke-width="16"/><circle cx="50" cy="50" r="17" fill="${c}" stroke-width="4"/>${punto(50, 50, 5.5)}`),
  petaso: (w) => svg('0 0 124 80', w, `<path d="M22 66 A38 38 0 0 1 98 66 Z" ${R}/><path d="M10 70 H110" stroke-width="5"/><path d="M90 46 C102 36 110 26 118 12 M92 52 C104 46 112 40 120 30 M94 58 C104 56 112 52 118 46"/>`, 4),
  argos: (w) => svg('0 0 130 100', w, [-2, -1, 0, 1, 2].map(i => { const a = (-90 + i * 30) * RAD, x = 65 + 62 * Math.cos(a), y = 98 + 62 * Math.sin(a), g = -90 + i * 30 + 90;
    return `<path d="M65 98 L${(65 + 48 * Math.cos(a)).toFixed(1)} ${(98 + 48 * Math.sin(a)).toFixed(1)}" stroke-width="1.6"/><ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="9" ry="13" transform="rotate(${g} ${x.toFixed(1)} ${y.toFixed(1)})"/>${punto(x.toFixed(1), y.toFixed(1), 3.5)}`; }).join(''), 3),
  uroboros: (w, c) => svg('0 0 100 100', w, `<path d="${arco(50, 50, 38, 16, 330)}" stroke-width="8"/><ellipse cx="${(50 + 38 * Math.cos(338 * RAD)).toFixed(1)}" cy="${(50 + 38 * Math.sin(338 * RAD)).toFixed(1)}" rx="13" ry="9" transform="rotate(70 ${(50 + 38 * Math.cos(338 * RAD)).toFixed(1)} ${(50 + 38 * Math.sin(338 * RAD)).toFixed(1)})" ${R}/><circle cx="${(50 + 38 * Math.cos(338 * RAD) - 2).toFixed(1)}" cy="${(50 + 38 * Math.sin(338 * RAD) - 4).toFixed(1)}" r="2.4" fill="${c}" stroke="none"/>`),
  laberinto: (w) => svg('0 -8 100 116', w, `<path d="${arco(50, 50, 40, -78, 258)}"/><path d="${arco(50, 50, 28, 102, 438)}"/><path d="${arco(50, 50, 16, -70, 250)}"/><path d="M50 -6 V16 A34 34 0 0 1 50 84 V72 A22 22 0 0 1 50 28 V44" stroke-width="2" stroke-dasharray="3 5"/>${punto(50, 50, 4.5)}`, 4),
  reloj: (w) => svg('0 0 124 100', w, `<path d="M38 6 H86 L62 50 L86 94 H38 L62 50 Z"/><path d="M50 88 H74 L62 74 Z" ${R}/><path d="M52 50 C40 38 26 34 6 38 C20 46 34 52 52 52 Z M72 50 C84 38 98 34 118 38 C104 46 90 52 72 52 Z" ${R}/>`, 4),
};
