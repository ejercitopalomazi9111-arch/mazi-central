/* mascota-ropa.js — LO QUE SE LE PONE A LA MASCOTA Y SU HUEVO (Carlos, 14 nov: «accesorios, customizables, skins»;
 * «que empiecen como bebés y vayan creciendo: en gallinas sería huevo, pollito, gallina»)
 * ===========================================================================
 * Cada accesorio es un SVG dibujado aquí (como las mascotas: nada recortado), acomodado con las medidas de la
 * cabeza de cada animal. Va DENTRO del grupo de la cabeza, así que se mueve, gira y brinca con ella. La bufanda y
 * el corbatín van en el cuerpo. El huevo es otro dibujo: se mece y se va cuarteando conforme sube de XP.
 * ===========================================================================*/

/* dónde está la coronilla, qué tan ancha es la cabeza y dónde va el cuello (medido en el viewBox 0 0 200 220) */
export const CABEZAS = {
  tigre: { top: 52, w: 112, cuello: 134 },
  gatito: { top: 52, w: 112, cuello: 134 },
  conejo: { top: 56, w: 104, cuello: 134 },
  perrito: { top: 48, w: 114, cuello: 134 },
  paloma: { top: 42, w: 84, cuello: 114 },
  pinguino: { top: 36, w: 100, cuello: 136 },
  foca: { top: 42, w: 104, cuello: 142 },
  ballena: { top: 34, w: 100, cuello: 138, enCuerpo: true },
};
/* los colores de la casa (vino, morado, oro) y un par de acentos */
const V = '#7E1735', M = '#5B2A86', O = '#E8B54A', OO = '#B9800F', N = '#1E1428';

export function svgAccesorio(k, g, ojos){
  const { top: t, w } = g, x0 = 100, eyY = (ojos.I[1] + ojos.D[1]) / 2, eL = ojos.I[0], eR = ojos.D[0];
  const W = (f) => (w * f).toFixed(1);
  switch(k){
    case 'birrete': return `<g data-acc="birrete"><rect x="${x0 - w * .2}" y="${t - 8}" width="${W(.4)}" height="12" rx="4" fill="#2A1A3A"/>
      <path d="M${x0 - w * .46} ${t - 9} L${x0} ${t - 22} L${x0 + w * .46} ${t - 9} L${x0} ${t + 3}Z" fill="${N}" stroke="#3A2650" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="${x0}" cy="${t - 9}" r="2.6" fill="${O}"/><path d="M${x0} ${t - 9} Q${x0 + w * .3} ${t - 6} ${x0 + w * .36} ${t + 8}" fill="none" stroke="${O}" stroke-width="2"/><path d="M${x0 + w * .36 - 3} ${t + 6} h6 l-1 9 h-4z" fill="${O}"/></g>`;
    case 'corona': return `<g data-acc="corona"><path d="M${x0 - w * .3} ${t + 2} L${x0 - w * .32} ${t - 18} L${x0 - w * .14} ${t - 6} L${x0} ${t - 24} L${x0 + w * .14} ${t - 6} L${x0 + w * .32} ${t - 18} L${x0 + w * .3} ${t + 2}Z" fill="${O}" stroke="${OO}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="${x0}" cy="${t - 6}" r="3.6" fill="${V}"/><circle cx="${x0 - w * .19}" cy="${t - 3}" r="2.6" fill="#AC27FF"/><circle cx="${x0 + w * .19}" cy="${t - 3}" r="2.6" fill="#AC27FF"/>
      <path d="M${x0 - w * .28} ${t - 1} H${x0 + w * .28}" stroke="#FFF1C8" stroke-width="2" opacity=".7"/></g>`;
    case 'fiesta': return `<g data-acc="fiesta" transform="rotate(-12 ${x0} ${t})"><path d="M${x0 - w * .2} ${t + 2} L${x0} ${t - 40} L${x0 + w * .2} ${t + 2}Z" fill="#AC27FF" stroke="${M}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M${x0 - w * .12} ${t - 14} L${x0 + w * .13} ${t - 9} M${x0 - w * .06} ${t - 27} L${x0 + w * .07} ${t - 24}" stroke="${O}" stroke-width="4" stroke-linecap="round"/><circle cx="${x0}" cy="${t - 42}" r="6" fill="${O}"/></g>`;
    case 'sombrero': return `<g data-acc="sombrero"><ellipse cx="${x0}" cy="${t + 1}" rx="${W(.62)}" ry="9" fill="#8A5A2B" stroke="#5E3A16" stroke-width="2"/>
      <path d="M${x0 - w * .3} ${t + 1} Q${x0 - w * .3} ${t - 26} ${x0} ${t - 28} Q${x0 + w * .3} ${t - 26} ${x0 + w * .3} ${t + 1}Z" fill="#A36B32" stroke="#5E3A16" stroke-width="2"/>
      <path d="M${x0 - w * .3} ${t - 5} Q${x0} ${t - 1} ${x0 + w * .3} ${t - 5}" stroke="${V}" stroke-width="6" fill="none"/></g>`;
    case 'gorra': return `<g data-acc="gorra"><path d="M${x0 - w * .4} ${t + 6} Q${x0 - w * .4} ${t - 24} ${x0} ${t - 26} Q${x0 + w * .4} ${t - 24} ${x0 + w * .4} ${t + 6}Z" fill="${V}" stroke="#4E0D20" stroke-width="2"/>
      <path d="M${x0 + w * .1} ${t + 5} Q${x0 + w * .55} ${t + 2} ${x0 + w * .72} ${t + 12} Q${x0 + w * .4} ${t + 14} ${x0 + w * .1} ${t + 10}Z" fill="#5E1027" stroke="#4E0D20" stroke-width="2"/>
      <circle cx="${x0}" cy="${t - 25}" r="3.5" fill="#4E0D20"/><path d="M${x0 - 6} ${t - 12} h12" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/></g>`;
    case 'mono': { const cx = x0 - w * .34, cy = t + 6; return `<g data-acc="mono"><path d="M${cx} ${cy} L${cx - 14} ${cy - 9} L${cx - 14} ${cy + 9}Z M${cx} ${cy} L${cx + 14} ${cy - 9} L${cx + 14} ${cy + 9}Z" fill="${V}" stroke="#4E0D20" stroke-width="2" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="#B0274D" stroke="#4E0D20" stroke-width="1.5"/></g>`; }
    case 'flor': { const cx = x0 + w * .34, cy = t + 8; let s = ''; for(let i = 0; i < 5; i++){ const a = i * 72 * Math.PI / 180; s += `<circle cx="${(cx + Math.cos(a) * 6).toFixed(1)}" cy="${(cy + Math.sin(a) * 6).toFixed(1)}" r="5" fill="#C77DFF"/>`; } return `<g data-acc="flor">${s}<circle cx="${cx}" cy="${cy}" r="4" fill="${O}"/></g>`; }
    case 'lentes': return `<g data-acc="lentes" fill="none" stroke="${N}" stroke-width="3"><circle cx="${eL}" cy="${eyY}" r="13"/><circle cx="${eR}" cy="${eyY}" r="13"/><path d="M${eL + 13} ${eyY} Q${x0} ${eyY - 5} ${eR - 13} ${eyY}"/><circle cx="${eL - 4}" cy="${eyY - 5}" r="3" fill="#fff" stroke="none" opacity=".5"/></g>`;
    case 'lentesSol': return `<g data-acc="lentesSol"><rect x="${eL - 15}" y="${eyY - 10}" width="30" height="20" rx="8" fill="${N}"/><rect x="${eR - 15}" y="${eyY - 10}" width="30" height="20" rx="8" fill="${N}"/>
      <path d="M${eL + 15} ${eyY - 3} H${eR - 15}" stroke="${N}" stroke-width="4"/><path d="M${eL - 9} ${eyY - 4} l6 -3 M${eR - 9} ${eyY - 4} l6 -3" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/></g>`;
    case 'audifonos': return `<g data-acc="audifonos"><path d="M${x0 - w * .46} ${eyY - 4} Q${x0 - w * .5} ${t - 18} ${x0} ${t - 20} Q${x0 + w * .5} ${t - 18} ${x0 + w * .46} ${eyY - 4}" fill="none" stroke="${M}" stroke-width="7" stroke-linecap="round"/>
      <rect x="${x0 - w * .55}" y="${eyY - 14}" width="16" height="26" rx="7" fill="#AC27FF" stroke="${M}" stroke-width="2"/><rect x="${x0 + w * .55 - 16}" y="${eyY - 14}" width="16" height="26" rx="7" fill="#AC27FF" stroke="${M}" stroke-width="2"/></g>`;
    /* ── los de regalo (no se venden): los pone la casa a mano (titulos.js) ── */
    case 'boina': { /* la boina de artista de Sandra, con tres gotitas de pintura */
      const cx = x0 - w * .06, cy = t - 4;
      return `<g data-acc="boina" transform="rotate(-10 ${x0} ${t})"><ellipse cx="${cx}" cy="${cy}" rx="${W(.5)}" ry="15" fill="#2A1A3A" stroke="#160C22" stroke-width="2"/>
      <path d="M${cx - w * .46} ${cy + 3} Q${cx} ${cy + 14} ${cx + w * .46} ${cy + 3}" fill="none" stroke="#3E2A55" stroke-width="3"/>
      <path d="M${cx + 2} ${cy - 15} q3 -7 7 -6" fill="none" stroke="#2A1A3A" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${cx - w * .2}" cy="${cy - 3}" r="4" fill="#E5484D"/><circle cx="${cx - w * .05}" cy="${cy - 7}" r="3.2" fill="#F5C842"/><circle cx="${cx + w * .12}" cy="${cy - 4}" r="3.6" fill="#3B82F6"/></g>`; }
    case 'coronaMazi': { /* la de Carlos: morado y vino de la casa, con la M cubo en medio */
      const cy = t - 10;
      return `<g data-acc="coronaMazi"><path d="M${x0 - w * .32} ${t + 2} L${x0 - w * .34} ${t - 20} L${x0 - w * .16} ${t - 8} L${x0} ${t - 26} L${x0 + w * .16} ${t - 8} L${x0 + w * .34} ${t - 20} L${x0 + w * .32} ${t + 2}Z" fill="#AC27FF" stroke="#4A1470" stroke-width="2" stroke-linejoin="round"/>
      <path d="M${x0 - w * .32} ${t - 3} H${x0 + w * .32} V${t + 3} H${x0 - w * .32}Z" fill="${V}" stroke="#4A1470" stroke-width="1.5"/>
      <circle cx="${x0 - w * .34}" cy="${t - 21}" r="2.6" fill="#E9E4E4"/><circle cx="${x0 + w * .34}" cy="${t - 21}" r="2.6" fill="#E9E4E4"/>${cubo(x0, cy, 7)}</g>`; }
    case 'sabio': return `<g data-acc="sabio" fill="none" stroke="${OO}" stroke-width="2"><circle cx="${eL}" cy="${eyY + 2}" r="11"/><circle cx="${eR}" cy="${eyY + 2}" r="11"/><path d="M${eL + 11} ${eyY + 1} Q${x0} ${eyY - 3} ${eR - 11} ${eyY + 1}"/></g>`;
    default: return '';
  }
}
/* lo del cuello va en el cuerpo (no gira con la cabeza) */
export function svgCuello(k, g){
  const y = g.cuello, x0 = 100, w = g.w;
  if(k === 'bufanda') return `<g data-acc="bufanda"><path d="M${x0 - w * .38} ${y - 6} Q${x0} ${y + 8} ${x0 + w * .38} ${y - 6} L${x0 + w * .36} ${y + 6} Q${x0} ${y + 20} ${x0 - w * .36} ${y + 6}Z" fill="${V}" stroke="#4E0D20" stroke-width="2"/>
    <path d="M${x0 + w * .16} ${y + 8} l6 30 l12 -3 l-6 -26z" fill="#9A1E42" stroke="#4E0D20" stroke-width="2" stroke-linejoin="round"/><path d="M${x0 - w * .25} ${y + 2} v8 M${x0 - w * .1} ${y + 6} v8 M${x0 + w * .05} ${y + 7} v8" stroke="#F2C6D2" stroke-width="2" opacity=".6"/></g>`;
  if(k === 'corbatin') return `<g data-acc="corbatin"><path d="M${x0} ${y} L${x0 - 16} ${y - 9} L${x0 - 16} ${y + 9}Z M${x0} ${y} L${x0 + 16} ${y - 9} L${x0 + 16} ${y + 9}Z" fill="${M}" stroke="#2A1240" stroke-width="2" stroke-linejoin="round"/><circle cx="${x0}" cy="${y}" r="4.5" fill="#AC27FF" stroke="#2A1240" stroke-width="1.5"/></g>`;
  if(k === 'perlas'){ /* el collar de perlas (Mónica: «detalles de blanco») */
    let c = ''; for(let i = 0; i <= 10; i++){ const a = i / 10, px = x0 - w * .36 + w * .72 * a, py = y - 4 + Math.sin(a * Math.PI) * 12;
      c += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${i === 5 ? 5.2 : 4}" fill="#FBF8F2" stroke="#CFC6B8" stroke-width="1.2"/><circle cx="${(px - 1.3).toFixed(1)}" cy="${(py - 1.4).toFixed(1)}" r="1.3" fill="#fff"/>`; }
    return `<g data-acc="perlas">${c}</g>`;
  }
  return '';
}
export const DEL_CUELLO = new Set(['bufanda', 'corbatin', 'perlas']);

/* la M cubo de Grupo Mazi en chiquito (la usan la corona y el broche de la capa): techo morado claro, caras vino y oscuro */
function cubo(cx, cy, r){
  const h = r * .5, R = (n) => n.toFixed(1);
  return `<g data-cubo><path d="M${R(cx)} ${R(cy - r)} L${R(cx + r)} ${R(cy - h)} L${R(cx)} ${R(cy)} L${R(cx - r)} ${R(cy - h)}Z" fill="#AC27FF"/>
    <path d="M${R(cx - r)} ${R(cy - h)} L${R(cx)} ${R(cy)} L${R(cx)} ${R(cy + r)} L${R(cx - r)} ${R(cy + h)}Z" fill="#7E1735"/>
    <path d="M${R(cx + r)} ${R(cy - h)} L${R(cx)} ${R(cy)} L${R(cx)} ${R(cy + r)} L${R(cx + r)} ${R(cy + h)}Z" fill="#170A26"/>
    <path d="M${R(cx - r * .7)} ${R(cy + h * .9)} V${R(cy - h * .1)} L${R(cx - r * .35)} ${R(cy + h * .5)} L${R(cx)} ${R(cy + h * .1)} V${R(cy + r * .8)}" fill="none" stroke="#E9E4E4" stroke-width="1.1" stroke-linejoin="round" opacity=".9"/></g>`;
}

/* ── lo de la espalda: se dibuja DETRÁS del cuerpo (asoma por los lados) y se mueve con él ── */
export const DE_ESPALDA = new Set(['pincel', 'capaMazi']);
export function svgEspalda(k, g){
  const y = g.cuello, x0 = 100, w = g.w;
  if(k === 'pincel') /* el pincel de Sandra, cruzado en la espalda: mango de madera, casquillo y la punta con pintura de colores */
    return `<g data-acc="pincel" transform="rotate(38 ${x0} ${y + 20})"><rect x="${x0 - 6}" y="${y - 70}" width="12" height="150" rx="6" fill="#C98B4E" stroke="#7A4E22" stroke-width="2"/>
      <path d="M${x0 - 3} ${y - 60} V${y + 70}" stroke="#E6B27C" stroke-width="2.5" opacity=".7"/>
      <rect x="${x0 - 8}" y="${y - 88}" width="16" height="22" rx="3" fill="#C9CDD6" stroke="#7D8494" stroke-width="2"/>
      <path d="M${x0 - 9} ${y - 88} Q${x0 - 11} ${y - 112} ${x0} ${y - 126} Q${x0 + 11} ${y - 112} ${x0 + 9} ${y - 88}Z" fill="#6B4A2A" stroke="#3E2A16" stroke-width="2"/>
      <path d="M${x0 - 7} ${y - 104} Q${x0 - 6} ${y - 118} ${x0} ${y - 126} Q${x0 + 6} ${y - 118} ${x0 + 7} ${y - 104} Q${x0} ${y - 98} ${x0 - 7} ${y - 104}Z" fill="#E5484D"/>
      <path d="M${x0 - 4.5} ${y - 114} Q${x0} ${y - 110} ${x0 + 4.5} ${y - 114}" stroke="#F5C842" stroke-width="3" fill="none"/><path d="M${x0 - 2.5} ${y - 120} Q${x0} ${y - 118} ${x0 + 2.5} ${y - 120}" stroke="#3B82F6" stroke-width="2.5" fill="none"/></g>`;
  if(k === 'capaMazi') /* la capa de Carlos: vino por fuera, morado por dentro */
    return `<g data-acc="capaMazi"><path d="M${x0 - w * .3} ${y - 4} Q${x0 - w * .62} ${y + 40} ${x0 - w * .7} ${y + 78} Q${x0} ${y + 92} ${x0 + w * .7} ${y + 78} Q${x0 + w * .62} ${y + 40} ${x0 + w * .3} ${y - 4}Z" fill="${V}" stroke="#4E0D20" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M${x0 - w * .66} ${y + 74} Q${x0} ${y + 86} ${x0 + w * .66} ${y + 74} Q${x0} ${y + 80} ${x0 - w * .66} ${y + 74}Z" fill="#5B2A86"/></g>`;
  return '';
}
/* lo que va al frente de lo de la espalda (el broche de la capa) */
export function svgBroche(k, g){
  if(k === 'capaMazi') return `<g data-acc="broche">${cubo(100 - g.w * .3, g.cuello - 2, 6)}${cubo(100 + g.w * .3, g.cuello - 2, 6)}<path d="M${100 - g.w * .3 + 6} ${g.cuello} Q100 ${g.cuello + 6} ${100 + g.w * .3 - 6} ${g.cuello}" fill="none" stroke="#E8B54A" stroke-width="2"/></g>`;
  return '';
}

/* ── el huevo: se mece, se cuartea con la XP y al final asoman los ojos ── */
const COLOR_HUEVO = { paloma: ['#E9DDF6', '#B98BE0'], pinguino: ['#EAF1F7', '#7FA6C9'], default: ['#F5EEDC', '#D4B483'] };
export function svgHuevo(especie, progreso = 0){
  const [c1, c2] = COLOR_HUEVO[especie] || COLOR_HUEVO.default, k = Math.max(0, Math.min(1, progreso));
  const grieta = k > .25 ? `<path d="M74 118 L86 128 L80 138 L94 146 L88 156" fill="none" stroke="#5A4A3A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${(k * 90).toFixed(0)} 200"/>` : '';
  const ojos = k > .7 ? `<g><circle cx="91" cy="132" r="4" fill="#2A1240"/><circle cx="109" cy="132" r="4" fill="#2A1240"/><circle cx="92.4" cy="130.6" r="1.4" fill="#fff"/><circle cx="110.4" cy="130.6" r="1.4" fill="#fff"/></g>` : '';
  return `<svg viewBox="0 0 200 220" aria-hidden="true"><ellipse cx="100" cy="207" rx="46" ry="7" fill="#0003"/>
    <g class="huevo-mece"><path d="M100 70 C134 70 154 122 154 152 C154 186 130 206 100 206 C70 206 46 186 46 152 C46 122 66 70 100 70Z" fill="${c1}" stroke="#00000022" stroke-width="2"/>
    <circle cx="78" cy="112" r="7" fill="${c2}" opacity=".55"/><circle cx="122" cy="102" r="5" fill="${c2}" opacity=".55"/><circle cx="128" cy="160" r="8" fill="${c2}" opacity=".5"/><circle cx="70" cy="170" r="5" fill="${c2}" opacity=".5"/>
    <path d="M70 100 Q78 84 92 80" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>${grieta}${ojos}</g></svg>`;
}
