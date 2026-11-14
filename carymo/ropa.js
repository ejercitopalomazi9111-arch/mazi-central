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

/* LOS TONOS DE PIEL: sólo tonos humanos, del más claro al más oscuro (Carlos, 14 nov). Avataaars trae de fábrica un
   amarillo (f8d25c), un naranja (fd9841) y un café anaranjado (ae5d29) de caricatura; como tono de piel se pueden leer como burla, así que NO van.
   Quien ya los tenía puestos regresa a su tono de arranque (normalizarPersonaje no acepta lo que no está aquí). */
export const PIELES = ['fff0e6', 'fbe3d3', 'ffdbb4', 'f6d2b8', 'f0c8a0', 'edb98a', 'e7b98f', 'dfa679', 'd08b5b', 'c99064',
  'b77b4f', 'a06a45', '8a5638', '73452c', '614335', '5e3a26', '4b2e1f', '3a2418', '2b1b12'];
/* LOS DETALLES DE LA PIEL (Carlos, 14 nov: «pon cosas como el vitiligo y otras situaciones de la piel para hacerlo más
   inclusivo»): gratis, como la piel, porque son identidad y no adorno. Se dibujan encima, en detallesPiel(), sin tapar
   ojos, cejas ni boca. El aparato auditivo va aquí también: es de la persona, no un accesorio de tienda. */
export const DETALLES = ['', 'vitiligo', 'pecas', 'lunar', 'mancha', 'rubor', 'acne', 'cicatriz', 'audifono'];
export const NOMBRE_DETALLE = { '': 'Ninguno', vitiligo: 'Vitíligo', pecas: 'Pecas', lunar: 'Lunar', mancha: 'Mancha de nacimiento', rubor: 'Rosácea', acne: 'Acné', cicatriz: 'Cicatriz', audifono: 'Aparato auditivo' };
export const COLORES_PELO = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'c93305', 'e8e1e1', 'ecdcbf', 'f59797',
  '0b0806', '5a3a22', '8b5a2b', 'e2c290', 'f5ecd5', 'ffffff', '9aa3ad', 'ac27ff', '6c5ce7', '3498db', '00b894', 'fd79a8', 'e84393', 'ff7675', 'fdcb6e'];
export const PEINADOS = ['shortFlat', 'shortRound', 'shortWaved', 'shortCurly', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'shavedSides', 'frizzle', 'shaggy', 'shaggyMullet',
  'dreads01', 'dreads02', 'dreads', 'fro', 'froBand', 'curly', 'curvy', 'bob', 'bun', 'bigHair', 'longButNotTooLong', 'miaWallace', 'straight01', 'straight02', 'straightAndStrand', 'frida', 'hijab', 'turban', ''];
export const OJOS = ['default', 'happy', 'wink', 'side', 'squint', 'surprised', 'hearts', 'closed', 'eyeRoll', 'cry', 'xDizzy'];
export const CEJAS = ['defaultNatural', 'default', 'raisedExcitedNatural', 'flatNatural', 'upDownNatural', 'sadConcernedNatural', 'unibrowNatural', 'frownNatural', 'angryNatural', 'angry', 'raisedExcited', 'sadConcerned', 'upDown'];
export const BOCAS = ['smile', 'default', 'twinkle', 'serious', 'tongue', 'eating', 'concerned', 'disbelief', 'grimace', 'sad', 'screamOpen'];
export const BARBAS = ['', 'beardLight', 'beardMedium', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'];
export const ROPA_LIBRE = ['shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck', 'hoodie'];
export const COLORES_ROPA = ['7e1735', 'ac27ff', '170a26', '262e33', '3c4f5c', '5199e4', '65c9ff', '25557c', 'a7ffc4', 'ffffb1', 'ffafb9', 'ff5c5c', 'e6e6e6', 'ffffff',
  'c77dff', '6c5ce7', '00b894', '16a085', '2d6a4f', 'fdcb6e', 'f39c12', 'd35400', 'c0392b', 'fd79a8', '8d6e63', '000000'];
export const FONDOS = ['170a26', '2a1a3d', '7e1735', 'ac27ff', 'c77dff', '25557c', '1f5e4a', 'd69a2d', 'e9e4e4',
  '0f3d3e', '1b2a49', '3b1f5c', '5c1a33', 'f6b4cf', 'a7ffc4', '65c9ff', 'ffd166', 'ff7675', '000000', 'ffffff'];

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
  'estampa:resist': { nombre: 'Resiste', grupo: 'Estampados', parte: 'estampa', valor: 'resist', precio: 8 },
  'estampa:skull': { nombre: 'Calavera', grupo: 'Estampados', parte: 'estampa', valor: 'skull', precio: 10 },
  /* LOS EXTRAS (Carlos, 14 nov: «muchos más cosméticos»): Avataaars no los trae; se dibujan encima en extrasMazi() */
  'extra:chispas': { nombre: 'Chispas', grupo: 'Extras', parte: 'extra', valor: 'chispas', precio: 12 },
  'extra:flor': { nombre: 'Flor en el pelo', grupo: 'Extras', parte: 'extra', valor: 'flor', precio: 14 },
  'extra:gato': { nombre: 'Orejas de gato', grupo: 'Extras', parte: 'extra', valor: 'gato', precio: 18 },
  'extra:audifonos': { nombre: 'Audífonos', grupo: 'Extras', parte: 'extra', valor: 'audifonos', precio: 20 },
  'extra:cuernitos': { nombre: 'Cuernitos', grupo: 'Extras', parte: 'extra', valor: 'cuernitos', precio: 22 },
  'extra:aureola': { nombre: 'Aureola', grupo: 'Extras', parte: 'extra', valor: 'aureola', precio: 25 },
  'extra:corona': { nombre: 'Corona', grupo: 'Extras', parte: 'extra', valor: 'corona', precio: 40 },
  'gorro:gorraMazi': { nombre: 'Gorra Grupo Mazi', grupo: 'Gorros', parte: 'gorro', valor: 'gorraMazi', precio: null, regalo: true },
  'estampa:mazi': { nombre: 'Grupo Mazi', grupo: 'Estampados', parte: 'estampa', valor: 'mazi', precio: null, regalo: true },
};
/* de una parte y un valor, el artículo de la tienda (si es de paga) */
export const articuloDe = (parte, valor) => Object.entries(TIENDA_ROPA).find(([, a]) => a.parte === parte && a.valor === valor)?.[0] || '';

/* las opciones de cada parte: libres y de paga, en el orden del vestidor */
export const OPCIONES = {
  piel: PIELES, detalle: DETALLES, pelo: PEINADOS, colorPelo: COLORES_PELO, ojos: OJOS, cejas: CEJAS, boca: BOCAS, barba: BARBAS,
  ropa: [...ROPA_LIBRE, ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'ropa').map((a) => a.valor)],
  colorRopa: COLORES_ROPA,
  estampa: ['', ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'estampa').map((a) => a.valor)],
  gorro: ['', ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'gorro').map((a) => a.valor)],
  colorGorro: COLORES_ROPA,
  lentes: ['', ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'lentes').map((a) => a.valor)],
  extra: ['', ...Object.values(TIENDA_ROPA).filter((a) => a.parte === 'extra').map((a) => a.valor)],
  fondo: FONDOS,
};

/* uno de arranque, distinto para cada quien (sale de su nombre de cuenta, siempre el mismo) */
export function personajeDeArranque(cuenta = ''){
  let h = 2166136261; for(const ch of String(cuenta)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  /* ⚠ el `>>> 0` va ANTES del módulo: un XOR puede dar negativo, y lista[-3] es undefined */
  const de = (lista, sal) => lista[(((h >>> sal) ^ Math.imul(h, sal + 7)) >>> 0) % lista.length];
  return { piel: de(PIELES, 1), pelo: de(PEINADOS.slice(0, 27), 3), colorPelo: de(COLORES_PELO.slice(0, 7), 5), ojos: 'happy', cejas: 'defaultNatural', boca: 'smile', barba: '', detalle: '',
    ropa: de(ROPA_LIBRE, 7), colorRopa: de(COLORES_ROPA.slice(0, 8), 9), estampa: '', gorro: '', colorGorro: '25557c', lentes: '', extra: '', fondo: de(FONDOS.slice(0, 6), 11) };
}

/* deja sólo lo que existe y lo que es tuyo; lo demás se queda como lo tenías (o como el de arranque) */
export function normalizarPersonaje(cfg, comprados = [], cuenta = '', anterior = null){
  const base = { ...personajeDeArranque(cuenta) }, r = {}, tengo = new Set(comprados || []);
  if(anterior && typeof anterior === 'object') for(const k of Object.keys(OPCIONES)) if(OPCIONES[k].includes(anterior[k])) base[k] = anterior[k];
  for(const [k, lista] of Object.entries(OPCIONES)){
    const v = cfg && typeof cfg[k] === 'string' ? cfg[k] : undefined;
    let ok = v !== undefined && lista.includes(v);
    const art = ok && ['ropa', 'estampa', 'gorro', 'lentes', 'extra'].includes(k) ? articuloDe(k, v) : '';
    if(art && !tengo.has(art)) ok = false;
    /* lo de paga que ya no es tuyo tampoco se queda por venir de antes */
    const artBase = ['ropa', 'estampa', 'gorro', 'lentes', 'extra'].includes(k) ? articuloDe(k, base[k]) : '';
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
const mezclaHex = (a, b, k) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
/* las coordenadas son las del lienzo de Avataaars (280): cara de x 84 a 196, ojos en y ~110 (x 110 y 170), cejas en ~92,
   nariz en ~133, boca de 118 a 162 en y 145-168, barbilla en ~184, cuello de x 116 a 164 */
export function detallesPiel(p){
  const piel = /^[0-9a-f]{6}$/i.test(p.piel || '') ? p.piel : 'edb98a';
  const claro = mezclaHex(piel, 'fbf1e9', .72), oscuro = mezclaHex(piel, '2b1408', .45);
  const mancha = (cx, cy, rx, ry, rot = 0) => `<path d="M${cx - rx} ${cy} C${cx - rx} ${cy - ry * 1.1} ${cx - rx * .2} ${cy - ry * 1.2} ${cx + rx * .3} ${cy - ry * .9} C${cx + rx * 1.1} ${cy - ry * .7} ${cx + rx * 1.05} ${cy + ry * .4} ${cx + rx * .5} ${cy + ry * .9} C${cx} ${cy + ry * 1.3} ${cx - rx * .9} ${cy + ry} ${cx - rx} ${cy} Z" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const D = {
    vitiligo: () => `<g fill="${claro}">${mancha(101, 143, 13, 9, -15)}${mancha(156, 176, 10, 6, 10)}${mancha(84, 122, 5, 9)}${mancha(128, 208, 12, 10, 20)}${mancha(154, 196, 6, 8)}${mancha(190, 104, 5, 7, 10)}</g>`,
    pecas: () => `<g fill="${oscuro}" opacity=".55">${[[100, 130], [106, 136], [112, 131], [98, 139], [109, 141], [118, 128], [180, 130], [174, 136], [168, 131], [182, 139], [171, 141], [162, 128], [134, 126], [146, 126], [140, 122]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.1}"/>`).join('')}</g>`,
    lunar: () => `<circle cx="170" cy="150" r="2.6" fill="${mezclaHex(piel, '1a0c06', .7)}"/>`,
    mancha: () => `<g fill="#9B2C4A" opacity=".32">${mancha(102, 140, 15, 11, -10)}${mancha(92, 128, 6, 7)}</g>`,
    rubor: () => `<g fill="#D9455F" opacity=".26"><ellipse cx="104" cy="137" rx="15" ry="9"/><ellipse cx="176" cy="137" rx="15" ry="9"/><ellipse cx="140" cy="134" rx="9" ry="5"/></g>`,
    acne: () => `<g fill="#C4475A" opacity=".55">${[[98, 136], [104, 145], [178, 140], [172, 147], [184, 132], [158, 176], [124, 176], [150, 70], [132, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join('')}</g>`,
    cicatriz: () => `<path d="M168 126 L176 146" stroke="${claro}" stroke-width="2.6" stroke-linecap="round"/><path d="M168 132 L174 130 M170 138 L176 136 M172 143 L177 141" stroke="${claro}" stroke-width="1.4" stroke-linecap="round"/>`,
    audifono: () => `<path d="M198 104 C206 104 208 116 204 124 C202 128 198 128 197 124 Z" fill="#E6D3C2" stroke="#8C7A6B" stroke-width="1"/><path d="M197 118 C193 119 191 121 190 124" stroke="#8C7A6B" stroke-width="1.6" fill="none"/>`,
  };
  return D[p.detalle] ? `<g data-extra="piel-${p.detalle}">${D[p.detalle]()}</g>` : '';
}
export function extrasMazi(p){
  let s = detallesPiel(p);
  /* los extras dibujados (mismo lienzo de 280: la cabeza va de x 84 a 196 y su coronilla en y ~36) */
  const ex = {
    chispas: () => [[70, 60, 9], [210, 48, 7], [62, 140, 6], [218, 128, 8]].map(([x, y, r]) => `<path d="M${x} ${y - r} Q${x + r * .2} ${y - r * .2} ${x + r} ${y} Q${x + r * .2} ${y + r * .2} ${x} ${y + r} Q${x - r * .2} ${y + r * .2} ${x - r} ${y} Q${x - r * .2} ${y - r * .2} ${x} ${y - r}Z" fill="#FFE27A"/>`).join(''),
    flor: () => `<g transform="translate(182 56)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-9" rx="6" ry="9" fill="#FF8FB8" transform="rotate(${a})"/>`).join('')}<circle r="5.5" fill="#FFD166"/></g>`,
    gato: () => `<path d="M92 52 L98 14 L124 38 Z" fill="#2B2033"/><path d="M98 44 L101 24 L115 37 Z" fill="#F6B4CF"/><path d="M188 52 L182 14 L156 38 Z" fill="#2B2033"/><path d="M182 44 L179 24 L165 37 Z" fill="#F6B4CF"/>`,
    audifonos: () => `<path d="M80 122 C76 50 108 24 140 24 C172 24 204 50 200 122" fill="none" stroke="#2B2033" stroke-width="9" stroke-linecap="round"/><rect x="68" y="104" width="22" height="40" rx="10" fill="#AC27FF"/><rect x="190" y="104" width="22" height="40" rx="10" fill="#AC27FF"/><rect x="72" y="110" width="8" height="28" rx="4" fill="#C77DFF"/><rect x="200" y="110" width="8" height="28" rx="4" fill="#C77DFF"/>`,
    cuernitos: () => `<path d="M104 46 C96 30 98 18 106 8 C108 22 114 32 120 40 Z" fill="#E2506A"/><path d="M176 46 C184 30 182 18 174 8 C172 22 166 32 160 40 Z" fill="#E2506A"/>`,
    aureola: () => `<ellipse cx="140" cy="14" rx="40" ry="9" fill="none" stroke="#FFE27A" stroke-width="6"/><ellipse cx="140" cy="14" rx="40" ry="9" fill="none" stroke="#FFF6C9" stroke-width="2"/>`,
    corona: () => `<path d="M104 40 L100 6 L120 24 L140 0 L160 24 L180 6 L176 40 Z" fill="#F5C542" stroke="#C99A1C" stroke-width="2.5" stroke-linejoin="round"/><circle cx="140" cy="28" r="5" fill="#E2506A"/><circle cx="118" cy="32" r="3.5" fill="#AC27FF"/><circle cx="162" cy="32" r="3.5" fill="#AC27FF"/>`,
  };
  if(ex[p.extra]) s += `<g data-extra="${p.extra}">${ex[p.extra]()}</g>`;
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
