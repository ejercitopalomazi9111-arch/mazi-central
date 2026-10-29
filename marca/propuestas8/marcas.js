/* RONDA 8 · con las referencias de Carlos (28 de octubre): la MZ con cabeza de ave, la paloma de
   circuito y la MZ en hexágono con circuito (imágenes hechas con IA que mandó él: aquí se DIBUJAN en
   vector, para que sean nuestras y se puedan registrar), más el estilo de Black Hat Creative Studio
   (una letra cambiada por una figura, la palabra de abajo volteada y el lema con «/» en vez de «I»).
   Cada símbolo sale de una función con perillas; las variantes son la misma idea, no copias. */
const RAD = Math.PI / 180;
export const svg = (vb, w, cuerpo) => { const [, , a, h] = vb.split(' ').map(Number);
  return `<svg viewBox="${vb}" width="${w}" height="${(w * h / a).toFixed(1)}" fill="currentColor" stroke="none">${cuerpo}</svg>`; };
const linea = (d, sw, mas = '') => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${mas}/>`;
const P = (d, mas = '') => `<path d="${d}" ${mas}/>`;

/* ── la MZ con cabeza de ave: la Z remata arriba en la cabeza de un pájaro que mira a la derecha ──
   o.m: forma de la M ('recta' | 'cortada' | 'fina' | 'piezas'); o.g: grosor; o.pico: largo del pico;
   o.ojo: con ojo; o.junta: la M y la Z comparten trazo; o.ac: color del ave (si va de dos tonos) */
export function mzAve(w, o = {}){
  const g = o.g ?? 15, pico = o.pico ?? 16, c = o.c, ac = o.ac || 'currentColor';
  let M;
  if(o.m === 'fina') M = linea(`M10 92 V18 L42 56 L66 26`, g * .45);
  else if(o.m === 'piezas') M = P(`M6 92 V22 L${6 + g} ${14} V92 Z`) + P(`M${10 + g} 20 L46 50 L${46} ${50 + g * 1.1} L${10 + g} ${20 + g * 1.4} Z`) + P(`M50 50 L66 30 V${30 + g * 1.4} L50 ${50 + g * 1.1} Z`);
  else if(o.m === 'cortada') M = P(`M6 92 V30 L${6 + g} 18 L46 52 L66 28 V${28 + g * 1.5} L46 ${52 + g * 1.3} L${6 + g} ${18 + g * 1.6} V82 Z`);
  else M = P(`M6 92 V16 H${6 + g} L46 52 L66 24 V${24 + g * 1.5} L46 ${52 + g * 1.3} L${6 + g} ${16 + g * 1.6} V92 Z`);
  /* la Z: barra de arriba con la cabeza, diagonal y barra de abajo */
  const zx = 62, top = 24, der = o.lado === 'der';
  /* la cabeza: una cúpula baja con pico largo y fino que mira a la derecha. A la izquierda nace del
     arranque de la barra de la Z; a la derecha (o.lado = 'der') remata la esquina de la barra */
  const hx = der ? zx + 30 : zx;
  const cabeza = `M${hx} ${top} C${hx - 2} ${top - 16} ${hx + 14} ${top - 24} ${hx + 26} ${top - 16} L${hx + 30 + pico} ${top - 8} L${hx + 26} ${top - 5} L${hx + 26} ${top} Z`;
  const barra = `M${zx} ${top} H${zx + 58} V${top + g} H${zx} Z`;
  const diag = `M${zx + 58} ${top + g} L${zx + 6} 92 H${zx - 12} L${zx + 40} ${top + g} Z`;
  const abajo = `M${zx - 12} ${92 - g} H${zx + 58} L${zx + 50} 92 H${zx - 12} Z`;
  const ojo = o.ojo && c ? `<circle cx="${hx + 16}" cy="${top - 12}" r="${Math.max(2.2, g * .17)}" fill="${c}"/>` : '';
  const zz = `<g fill="${ac}">${P(cabeza)}</g>` + P(barra) + P(diag) + P(abajo) + ojo;
  return svg('0 -10 132 104', w, M + zz);
}

/* ── la paloma de circuito: alas de trazos curvos y el cuerpo que se vuelve pistas con terminal ── */
export function palomaCircuito(w, o = {}){
  const sw = o.sw ?? 6, lleno = o.lleno, c = o.c, n = o.plumas ?? 2;
  const hojas = ['M28 26 C38 46 54 54 62 60 C48 61 32 52 28 26 Z', 'M12 44 C22 64 40 72 52 76 C38 79 18 70 12 44 Z', 'M6 64 C14 78 28 84 40 86 C28 90 10 84 6 64 Z'].slice(0, n);
  let s = hojas.map(d => lleno ? P(d) : linea(d, sw * .8)).join('');
  s += linea('M22 6 C36 32 62 42 66 62 C68 78 58 88 40 92 H62', sw);
  const pistas = [['M56 76 L86 46', 92, 40], ['M62 82 L76 68 H92', 98, 68], ['M62 92 H78 L88 84', 94, 84]].slice(0, o.pistas ?? 3);
  for(const [d, x, y] of pistas) s += linea(d, sw * .75) + `<circle cx="${x}" cy="${y}" r="${sw}" fill="none" stroke="currentColor" stroke-width="${sw * .7}"/>`;
  if(o.cabeza) s += P('M18 6 C18 -2 28 -4 32 2 L40 4 L32 8 C30 6 26 6 24 10 Z');
  return svg('0 -8 106 104', w, s);
}

/* ── la MZ dentro de un hexágono roto, con tres terminales de circuito arriba ── */
export function hexMZ(w, o = {}){
  const g = o.g ?? 11, pins = o.pins ?? 3, lleno = o.lleno, c = o.c;
  const H = (r) => Array.from({ length: 6 }, (_, i) => { const a = (-90 + i * 60) * RAD; return [60 + r * Math.cos(a), 62 + r * Math.sin(a)]; });
  const h = H(52);
  let s = '';
  if(lleno) s += `<polygon points="${h.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' ')}"/>`;
  else s += linea(`M${h[5][0].toFixed(1)} ${h[5][1].toFixed(1)} L${h[0][0] - 14} ${h[0][1] + 8} M${h[0][0] + 14} ${h[0][1] + 8} L${h[1][0].toFixed(1)} ${h[1][1].toFixed(1)} V${h[2][1].toFixed(1)} L${h[3][0] + 16} ${h[3][1] - 9} M${h[3][0] - 16} ${h[3][1] - 9} L${h[4][0].toFixed(1)} ${h[4][1].toFixed(1)} V${h[5][1].toFixed(1)}`, g * .8);
  const tinta = lleno ? c : 'currentColor';
  s += `<g fill="none" stroke="${tinta}" stroke-width="${g}" stroke-linejoin="miter" stroke-linecap="butt"><path d="M30 86 V44 L52 66 L66 50"/><path d="M58 46 H90 L58 82 H92"/></g>`;
  const xs = pins === 1 ? [60] : pins === 2 ? [48, 72] : [40, 60, 80];
  xs.forEach((x, i) => { const y = i === 1 || pins === 1 ? -14 : -4;
    s += linea(`M${x} ${y + 9} V${i === 1 || pins === 1 ? 30 : 22}`, g * .45); s += `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="currentColor" stroke-width="${g * .45}"/>`; });
  return svg('0 -26 120 146', w, s);
}

/* ── símbolos solos (hoja 3): las mismas ideas reducidas a una figura que aguante en 32 px ── */
export const SOLOS = {
  cabezaZ: (w, c) => svg('0 -6 100 100', w, P('M16 30 C16 6 50 0 62 18 L84 24 L62 30 C58 22 40 22 38 32 H84 V46 L42 76 H86 V90 H14 V76 L56 46 H16 Z') + `<circle cx="34" cy="18" r="4" fill="${c}"/>`),
  aveM: (w, c) => svg('0 -14 124 114', w, P('M6 92 V22 L22 14 L50 50 L76 18 C78 0 98 -10 110 0 L124 8 L106 10 L94 18 V92 H78 V44 L50 78 L22 44 V92 Z') + `<circle cx="94" cy="2" r="3.5" fill="${c}"/>`),
  alaCircuito: (w) => svg('0 0 120 100', w, linea('M10 8 C24 50 50 70 86 74', 7) + linea('M24 6 C36 38 56 54 80 58', 7) + linea('M40 4 C50 26 64 38 80 42', 7) + linea('M86 74 H106 M80 58 L94 44 H104 M80 42 L92 28', 5) + [[112, 74], [110, 44], [98, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="currentColor" stroke-width="4"/>`).join('')),
  hexPluma: (w, c) => svg('0 0 100 110', w, `<polygon points="50,4 94,29 94,79 50,104 6,79 6,29"/>` + `<path d="M50 22 C66 36 68 66 52 88 C40 70 38 40 50 22 Z" fill="${c}"/><path d="M50 30 V96" stroke="${c}" stroke-width="4"/>`),
  mzLigada: (w) => svg('0 0 120 90', w, linea('M8 86 V8 L40 48 L72 8 H112 L64 86 H112', 9)),
  zCabezaDer: (w, c) => svg('0 -12 110 104', w, P('M6 8 H70 C70 -6 86 -12 96 -4 L110 4 L96 6 V24 L40 76 H104 V92 H6 V76 L62 24 H6 Z') + `<circle cx="84" cy="0" r="3.5" fill="${c}"/>`),
  mAla: (w) => svg('0 0 120 100', w, P('M6 92 V12 H20 L48 48 L70 20 V44 L48 72 L20 38 V92 Z') + P('M74 10 C96 10 112 26 114 50 C104 40 92 36 80 36 C96 44 104 56 106 70 C96 62 86 58 76 58 Z')),
  ojoAve: (w, c) => svg('0 0 100 100', w, `<circle cx="50" cy="50" r="46"/>` + `<path d="M22 58 C22 34 46 24 62 34 L82 38 L64 44 C60 40 50 40 48 48 V70 H22 Z" fill="${c}"/><circle cx="46" cy="38" r="4"/>`),
  mCircuito: (w) => svg('0 0 120 100', w, linea('M10 92 V12 L50 56 L90 12 V92', 10) + linea('M50 56 V80 M90 40 H110', 5) + `<circle cx="50" cy="88" r="7" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="114" cy="40" r="6" fill="none" stroke="currentColor" stroke-width="4"/>`),
  cabezaCircuito: (w) => svg('0 0 110 100', w, linea('M14 90 V54 C14 24 36 10 58 14 C70 16 78 24 82 32 L104 38 L82 44 C78 50 70 54 60 54 H40 V90', 7) + linea('M40 70 H58 L66 78 H80 M28 54 V30', 4.5) + `<circle cx="86" cy="78" r="6" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="28" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="56" cy="30" r="4.5"/>`),
  diamanteAve: (w, c) => svg('0 0 100 100', w, `<path d="M50 4 L96 50 L50 96 L4 50 Z"/>` + `<path d="M30 60 C30 40 52 32 62 44 L78 48 L62 52 C58 48 50 48 48 56 V70 H30 Z" fill="${c}"/>`),
  escudoMZ: (w, c) => svg('0 0 90 110', w, `<path d="M45 4 L86 16 V56 C86 82 66 98 45 106 C24 98 4 82 4 56 V16 Z"/>` + `<g fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="miter"><path d="M22 74 V36 L40 56 L48 46"/><path d="M44 36 H70 L44 76 H70"/></g>`),
};

/* ── la paloma M (Carlos, 28 oct, sobre el 029: «une las plumas y parecerán una M, y la Z ya medio
   se divisa; el acomodo de las plumas hace una cara enfadada»). Las plumas se vuelven las cuatro
   patas de la M: la pierna izquierda y la primera diagonal son plumas; la segunda diagonal y la
   pierna derecha son pistas de circuito. El cuello sigue siendo la Z (cabeza, diagonal, base) y
   las terminales quedan donde estaban, que es lo que hace la cara.
   o.m: 'hojas' (plumas llenas) | 'trazo' (todo en línea) | 'filo' (plumas en punta, más agresivas)
   o.sw: grosor; o.base: la base de la Z se alarga hasta la pierna derecha (la M y la Z se unen) */
const cuerpoPalomaM = (o = {}) => {
  const sw = o.sw ?? 6, m = o.m || 'hojas';
  const pluma = (d) => m === 'trazo' ? linea(d, sw * .8) : P(d);
  const filo = m === 'filo';
  /* pierna izquierda y primera diagonal: dos plumas que se tocan arriba */
  let s = pluma(filo ? 'M8 94 C2 66 4 40 16 18 C14 46 14 72 8 94 Z' : 'M8 94 C1 68 4 42 16 18 C19 44 17 70 8 94 Z');
  s += pluma(filo ? 'M16 18 C30 44 46 56 62 64 C40 62 22 48 16 18 Z' : 'M16 18 C28 44 46 56 62 64 C42 68 20 54 16 18 Z');
  /* el cuello: la Z */
  s += linea(`M24 4 C36 30 62 42 66 62 C68 78 58 88 40 92 H${o.base ? 92 : 62}`, sw);
  /* segunda diagonal y pierna derecha: pistas con terminal arriba */
  s += linea('M62 66 L88 40', sw * .8) + linea(`M92 ${40 + sw * 1.2} V${o.base ? 92 : 86}`, sw * .8);
  s += `<circle cx="92" cy="36" r="${sw}" fill="none" stroke="currentColor" stroke-width="${sw * .7}"/>`;
  if(!o.base) s += `<circle cx="92" cy="92" r="${sw * .8}" fill="none" stroke="currentColor" stroke-width="${sw * .6}"/>`;
  /* la segunda terminal, el «ojo» de abajo: adentro de la M, sin tocar la pierna */
  if(o.ojo !== false) s += linea('M66 82 L72 76', sw * .7) + `<circle cx="${74 + sw * .5}" cy="${74 - sw * .5}" r="${sw * .75}" fill="none" stroke="currentColor" stroke-width="${sw * .6}"/>`;
  /* la cabeza, igual que en el 029 */
  return s + P('M20 4 C20 -4 30 -6 34 0 L42 2 L34 6 C32 4 28 4 26 8 Z');
};
export const palomaM = (w, o = {}) => svg('0 -8 106 106', w, cuerpoPalomaM(o));

/* ── todo junto, como la última referencia de Carlos (la MZ en hexágono con terminales arriba):
   la paloma M adentro de un hexágono. o.lleno: hexágono relleno y la paloma calada en o.c;
   o.pins: 0 a 3 terminales arriba; o.roto: el contorno con cortes como en la referencia */
export function hexPaloma(w, o = {}){
  const g = o.g ?? 7, pins = o.pins ?? 3, c = o.c;
  const H = (r) => Array.from({ length: 6 }, (_, i) => { const a = (-90 + i * 60) * RAD; return [60 + r * Math.cos(a), 64 + r * Math.sin(a)]; });
  const h = H(54), f = (v) => v.toFixed(1);
  let s = '';
  if(o.lleno) s += `<polygon points="${h.map(q => q.map(f).join(' ')).join(' ')}" stroke="currentColor" stroke-width="${g}" stroke-linejoin="round"/>`;
  else if(o.roto) s += linea(`M${f(h[5][0])} ${f(h[5][1])} L${f(h[0][0] - 16)} ${f(h[0][1] + 9)} M${f(h[0][0] + 16)} ${f(h[0][1] + 9)} L${f(h[1][0])} ${f(h[1][1])} V${f(h[2][1])} L${f(h[3][0] + 16)} ${f(h[3][1] - 9)} M${f(h[3][0] - 16)} ${f(h[3][1] - 9)} L${f(h[4][0])} ${f(h[4][1])} V${f(h[5][1])}`, g);
  else s += `<polygon points="${h.map(q => q.map(f).join(' ')).join(' ')}" fill="none" stroke="currentColor" stroke-width="${g}" stroke-linejoin="round"/>`;
  s += `<g transform="translate(26 33) scale(.68)"${o.lleno ? ` fill="${c}" color="${c}"` : ''}>${cuerpoPalomaM(o)}</g>`;
  const xs = pins === 1 ? [60] : pins === 2 ? [50, 70] : pins === 3 ? [44, 60, 76] : [];
  xs.forEach((x, i) => { const alto = pins === 1 || i === 1, y = alto ? -16 : -6;
    s += linea(`M${x} ${y + 7} V${(alto ? 10 : 18) + (o.lleno ? 4 : 0)}`, g * .6) + `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="currentColor" stroke-width="${g * .6}"/>`; });
  return svg('0 -26 120 150', w, s);
}
