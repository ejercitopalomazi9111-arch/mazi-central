/* ropa.js — EL PERSONAJE DE PERFIL: qué se puede escoger y qué cuesta (Carlos, 13 nov, bloque 6)
 * ===========================================================================
 * «Un personaje propio (aparte de la mascota) como foto de perfil», con «ropa y accesorios que se
 * compran». El dibujo NO es nuestro: es Avataaars, de Pablo Stanley (libre para uso personal y
 * comercial, avataaars.com), armado con DiceBear (MIT). Licencias en carymo/vendor/.
 *
 * Este archivo lo leen LOS DOS lados: el teléfono para pintar el vestidor y el servidor
 * (sala/servidor/vestidor.js) para cobrar y para no aceptar una prenda que no compraste. Un solo
 * catálogo, para que el precio que ves sea el que se cobra.
 *
 * Lo de tu cara, tu pelo y tu piel es GRATIS, y el hiyab y el turbante también: son identidad,
 * no adorno, y no se venden.
 * ===========================================================================*/

export const PIELES = ['ffdbb4', 'edb98a', 'f8d25c', 'fd9841', 'd08b5b', 'ae5d29', '614335'];
export const COLORES_PELO = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'c93305', 'e8e1e1', 'ecdcbf', 'f59797'];
export const PEINADOS = ['shortFlat', 'shortRound', 'shortWaved', 'shortCurly', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'shavedSides', 'frizzle', 'shaggy', 'shaggyMullet',
  'dreads01', 'dreads02', 'dreads', 'fro', 'froBand', 'curly', 'curvy', 'bob', 'bun', 'bigHair', 'longButNotTooLong', 'miaWallace', 'straight01', 'straight02', 'straightAndStrand', 'frida', 'hijab', 'turban', ''];
export const OJOS = ['default', 'happy', 'wink', 'side', 'squint', 'surprised', 'hearts', 'closed'];
export const CEJAS = ['defaultNatural', 'default', 'raisedExcitedNatural', 'flatNatural', 'upDownNatural', 'sadConcernedNatural', 'unibrowNatural', 'frownNatural', 'angryNatural'];
export const BOCAS = ['smile', 'default', 'twinkle', 'serious', 'tongue', 'eating', 'concerned', 'disbelief'];
export const BARBAS = ['', 'beardLight', 'beardMedium', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'];
export const ROPA_LIBRE = ['shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck', 'hoodie'];
export const COLORES_ROPA = ['7e1735', 'ac27ff', '170a26', '262e33', '3c4f5c', '5199e4', '65c9ff', '25557c', 'a7ffc4', 'ffffb1', 'ffafb9', 'ff5c5c', 'e6e6e6', 'ffffff'];
export const FONDOS = ['170a26', '2a1a3d', '7e1735', 'ac27ff', 'c77dff', '25557c', '1f5e4a', 'd69a2d', 'e9e4e4'];

/* lo que se compra con cubitos. `parte` es la pieza de Avataaars, `valor` lo que se le pone */
export const TIENDA_ROPA = {
  'ropa:graphicShirt': { nombre: 'Playera con estampado', grupo: 'Ropa', parte: 'ropa', valor: 'graphicShirt', precio: 10 },
  'ropa:overall': { nombre: 'Overol', grupo: 'Ropa', parte: 'ropa', valor: 'overall', precio: 14 },
  'ropa:collarAndSweater': { nombre: 'Suéter con cuello', grupo: 'Ropa', parte: 'ropa', valor: 'collarAndSweater', precio: 18 },
  'ropa:blazerAndSweater': { nombre: 'Saco con suéter', grupo: 'Ropa', parte: 'ropa', valor: 'blazerAndSweater', precio: 24 },
  'ropa:blazerAndShirt': { nombre: 'Saco y camisa', grupo: 'Ropa', parte: 'ropa', valor: 'blazerAndShirt', precio: 28 },
  'estampa:pizza': { nombre: 'Pizza', grupo: 'Estampados', parte: 'estampa', valor: 'pizza', precio: 6 },
  'estampa:bear': { nombre: 'Oso', grupo: 'Estampados', parte: 'estampa', valor: 'bear', precio: 6 },
  'estampa:deer': { nombre: 'Venado', grupo: 'Estampados', parte: 'estampa', valor: 'deer', precio: 6 },
  'estampa:hola': { nombre: '¡Hola!', grupo: 'Estampados', parte: 'estampa', valor: 'hola', precio: 6 },
  'estampa:cumbia': { nombre: 'Cumbia', grupo: 'Estampados', parte: 'estampa', valor: 'cumbia', precio: 8 },
  'estampa:diamond': { nombre: 'Diamante', grupo: 'Estampados', parte: 'estampa', valor: 'diamond', precio: 10 },
  'estampa:bat': { nombre: 'Murciélago', grupo: 'Estampados', parte: 'estampa', valor: 'bat', precio: 8 },
  'estampa:skullOutline': { nombre: 'Calaverita', grupo: 'Estampados', parte: 'estampa', valor: 'skullOutline', precio: 8 },
  'gorro:hat': { nombre: 'Sombrero', grupo: 'Gorros', parte: 'gorro', valor: 'hat', precio: 10 },
  'gorro:winterHat1': { nombre: 'Gorro de invierno', grupo: 'Gorros', parte: 'gorro', valor: 'winterHat1', precio: 12 },
  'gorro:winterHat02': { nombre: 'Gorro con pompón', grupo: 'Gorros', parte: 'gorro', valor: 'winterHat02', precio: 14 },
  'gorro:winterHat03': { nombre: 'Gorro con orejeras', grupo: 'Gorros', parte: 'gorro', valor: 'winterHat03', precio: 14 },
  'gorro:winterHat04': { nombre: 'Gorro de gato', grupo: 'Gorros', parte: 'gorro', valor: 'winterHat04', precio: 18 },
  'lentes:prescription01': { nombre: 'Lentes de armazón', grupo: 'Lentes', parte: 'lentes', valor: 'prescription01', precio: 8 },
  'lentes:prescription02': { nombre: 'Lentes delgados', grupo: 'Lentes', parte: 'lentes', valor: 'prescription02', precio: 8 },
  'lentes:round': { nombre: 'Lentes redondos', grupo: 'Lentes', parte: 'lentes', valor: 'round', precio: 10 },
  'lentes:wayfarers': { nombre: 'Lentes de sol clásicos', grupo: 'Lentes', parte: 'lentes', valor: 'wayfarers', precio: 12 },
  'lentes:sunglasses': { nombre: 'Lentes de sol', grupo: 'Lentes', parte: 'lentes', valor: 'sunglasses', precio: 14 },
  'lentes:kurt': { nombre: 'Lentes de rockero', grupo: 'Lentes', parte: 'lentes', valor: 'kurt', precio: 16 },
  'lentes:eyepatch': { nombre: 'Parche de pirata', grupo: 'Lentes', parte: 'lentes', valor: 'eyepatch', precio: 12 },
  /* DE REGALO (precio null): no se venden; los da la casa (Carlos, 14 nov: «yo debo tener una gorra que le salga cabello
     por los lados y tenga estampado de Grupo Mazi, y la camisa o sudadera con estampado de la marca»). Los dibuja
     extrasMazi() encima de Avataaars, porque Avataaars no trae gorra de beisbol ni nuestro logo. */
  'gorro:gorraMazi': { nombre: 'Gorra Grupo Mazi', grupo: 'Gorros', parte: 'gorro', valor: 'gorraMazi', precio: null, regalo: true },
  'estampa:mazi': { nombre: 'Grupo Mazi', grupo: 'Estampados', parte: 'estampa', valor: 'mazi', precio: null, regalo: true },
};
/* de una parte y un valor, el artículo de la tienda (si es de paga) */
export const articuloDe = (parte, valor) => Object.entries(TIENDA_ROPA).find(([, a]) => a.parte === parte && a.valor === valor)?.[0] || '';

/* las opciones de cada parte: libres y de paga, en el orden del vestidor */
export const OPCIONES = {
  piel: PIELES, pelo: PEINADOS, colorPelo: COLORES_PELO, ojos: OJOS, cejas: CEJAS, boca: BOCAS, barba: BARBAS,
  ropa: [...ROPA_LIBRE, ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'ropa').map((a) => a.valor)],
  colorRopa: COLORES_ROPA,
  estampa: ['', ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'estampa').map((a) => a.valor)],
  gorro: ['', ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'gorro').map((a) => a.valor)],
  colorGorro: COLORES_ROPA,
  lentes: ['', ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'lentes').map((a) => a.valor)],
  fondo: FONDOS,
};

/* uno de arranque, distinto para cada quien (sale de su nombre de cuenta, siempre el mismo) */
export function personajeDeArranque(cuenta = ''){
  let h = 2166136261; for(const ch of String(cuenta)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  /* ⚠ el `>>> 0` va ANTES del módulo: un XOR puede dar negativo, y lista[-3] es undefined */
  const de = (lista, sal) => lista[(((h >>> sal) ^ Math.imul(h, sal + 7)) >>> 0) % lista.length];
  return { piel: de(PIELES, 1), pelo: de(PEINADOS.slice(0, 27), 3), colorPelo: de(COLORES_PELO.slice(0, 7), 5), ojos: 'happy', cejas: 'defaultNatural', boca: 'smile', barba: '',
    ropa: de(ROPA_LIBRE, 7), colorRopa: de(COLORES_ROPA.slice(0, 8), 9), estampa: '', gorro: '', colorGorro: '25557c', lentes: '', fondo: de(FONDOS.slice(0, 6), 11) };
}

/* deja sólo lo que existe y lo que es tuyo; lo demás se queda como lo tenías (o como el de arranque) */
export function normalizarPersonaje(cfg, comprados = [], cuenta = '', anterior = null){
  const base = { ...personajeDeArranque(cuenta) }, r = {}, tengo = new Set(comprados || []);
  if(anterior && typeof anterior === 'object') for(const k of Object.keys(OPCIONES)) if(OPCIONES[k].includes(anterior[k])) base[k] = anterior[k];
  for(const [k, lista] of Object.entries(OPCIONES)){
    const v = cfg && typeof cfg[k] === 'string' ? cfg[k] : undefined;
    let ok = v !== undefined && lista.includes(v);
    const art = ok && ['ropa', 'estampa', 'gorro', 'lentes'].includes(k) ? articuloDe(k, v) : '';
    if(art && !tengo.has(art)) ok = false;
    /* lo de paga que ya no es tuyo tampoco se queda por venir de antes */
    const artBase = ['ropa', 'estampa', 'gorro', 'lentes'].includes(k) ? articuloDe(k, base[k]) : '';
    r[k] = ok ? v : (artBase && !tengo.has(artBase) ? personajeDeArranque(cuenta)[k] : base[k]);
  }
  return r;
}

/* el personaje → las opciones de Avataaars */
export function opcionesAvataaars(p){
  /* la gorra Mazi va encima del pelo: debajo se pinta un peinado corto que asome por los lados */
  const gorraMazi = p.gorro === 'gorraMazi', estampaMazi = p.estampa === 'mazi';
  const top = gorraMazi ? 'sides' : (p.gorro || p.pelo);
  return {
    skinColor: [p.piel], hairColor: [p.colorPelo], facialHairColor: [p.colorPelo], hatColor: [p.colorGorro],
    top: top ? [top] : ['shortFlat'], topProbability: top ? 100 : 0,
    eyes: [p.ojos], eyebrows: [p.cejas], mouth: [p.boca],
    facialHair: p.barba ? [p.barba] : ['beardLight'], facialHairProbability: p.barba ? 100 : 0,
    clothing: [estampaMazi && p.ropa === 'graphicShirt' ? 'shirtCrewNeck' : p.ropa], clothesColor: [p.colorRopa], clothingGraphic: [estampaMazi ? 'bear' : (p.estampa || 'bear')],
    accessories: p.lentes ? [p.lentes] : ['round'], accessoriesProbability: p.lentes ? 100 : 0, accessoriesColor: ['262e33'],
    backgroundColor: [p.fondo], radius: 50,
  };
}


/* el cubo de la marca (la M cubo): techo morado claro, cara vino, cara oscura y la M en hueso */
function cuboMazi(cx, cy, r){
  const h = r * .5, R = (n) => n.toFixed(1);
  return `<path d="M${R(cx)} ${R(cy - r)} L${R(cx + r)} ${R(cy - h)} L${R(cx)} ${R(cy)} L${R(cx - r)} ${R(cy - h)}Z" fill="#AC27FF"/>`
    + `<path d="M${R(cx - r)} ${R(cy - h)} L${R(cx)} ${R(cy)} L${R(cx)} ${R(cy + r)} L${R(cx - r)} ${R(cy + h)}Z" fill="#7E1735"/>`
    + `<path d="M${R(cx + r)} ${R(cy - h)} L${R(cx)} ${R(cy)} L${R(cx)} ${R(cy + r)} L${R(cx + r)} ${R(cy + h)}Z" fill="#2A1640"/>`
    + `<path d="M${R(cx - r * .74)} ${R(cy + h * .95)} V${R(cy - h * .12)} L${R(cx - r * .37)} ${R(cy + h * .5)} L${R(cx)} ${R(cy + h * .08)} V${R(cy + r * .82)}" fill="none" stroke="#F1ECF4" stroke-width="${R(r * .13)}" stroke-linejoin="round" stroke-linecap="round"/>`;
}
const oscurecer = (hex, k) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
/* lo que va ENCIMA del dibujo de Avataaars (mismas medidas: lienzo de 280, la cabeza va de x 84 a 196 y arriba en y 36) */
export function extrasMazi(p){
  let s = '';
  if(p.estampa === 'mazi'){
    /* el logo en el pecho, con «GRUPO MAZI» abajo */
    /* el cubo en el pecho y «MAZI» abajo: angosto, para que quepa entre los cordones de la sudadera y dentro del círculo */
    s += `<g data-extra="estampaMazi">${cuboMazi(140, 234, 13)}<text x="140" y="261" text-anchor="middle" font-family="Montserrat, Titulo, Arial, sans-serif" font-weight="900" font-size="9" letter-spacing="1.4" fill="#F1ECF4">MAZI</text></g>`;
  }
  if(p.gorro === 'gorraMazi'){
    const c = /^[0-9a-f]{6}$/i.test(p.colorGorro || '') ? p.colorGorro : '170a26', base = '#' + c, sombra = oscurecer(c, .72), visera = oscurecer(c, .55);
    const pelo = '#' + (/^[0-9a-f]{6}$/i.test(p.colorPelo || '') ? p.colorPelo : '2c1b18');
    /* el pelo que asoma por los lados (patillas y mechones arriba de las orejas), luego la copa, la costura, el botón
       y la visera vista de frente, más angosta que la copa para que el pelo se vea */
    const mechones = (x, d) => `<path d="M${x} 84 C${x - 9 * d} 92 ${x - 10 * d} 104 ${x - 5 * d} 116 C${x - 3 * d} 108 ${x + 1 * d} 104 ${x + 3 * d} 110 C${x + 2 * d} 102 ${x + 6 * d} 98 ${x + 9 * d} 104 C${x + 10 * d} 96 ${x + 8 * d} 88 ${x + 4 * d} 84 Z" fill="${pelo}"/>`;
    s += `<g data-extra="gorraMazi">${mechones(86, 1)}${mechones(194, -1)}`
      + `<path d="M78 90 C78 46 106 22 140 22 C174 22 202 46 202 90 Z" fill="${base}"/>`
      + `<path d="M78 90 C78 62 90 40 110 30 C100 48 98 68 99 90 Z" fill="${sombra}" opacity=".55"/>`
      + `<path d="M140 23 V84" stroke="${sombra}" stroke-width="1.6"/><circle cx="140" cy="23.5" r="3.4" fill="${sombra}"/>`
      + `<path d="M92 89 C92 81 114 78 140 78 C166 78 188 81 188 89 C188 98 166 102 140 102 C114 102 92 98 92 89 Z" fill="${visera}"/>`
      + `<path d="M98 88 C110 84 124 83 140 83 C156 83 170 84 182 88" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.4"/>`
      + cuboMazi(140, 54, 15) + `</g>`;
  }
  return s;
}
