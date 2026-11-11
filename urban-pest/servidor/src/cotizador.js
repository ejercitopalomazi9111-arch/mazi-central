/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL COTIZADOR
   ───────────────────────────────────────────────────────────────────────────
   El precio sale de cuatro cosas (lo dijo el dueño): el producto que se gasta,
   el tipo de plaga, los metros cuadrados y la distancia desde la bodega
   (gasolina y desgaste del vehículo, dentro de su radio).

   Las tarifas NO están aquí: salen de su Excel (FALTA) y viven en el servidor.
   Sin tarifas, el cotizador no inventa: dice qué falta.

   Lo que da es un precio APROXIMADO (nunca «desde», que suena a que va a subir):
   si los datos están bien, ése es el costo; el técnico lo confirma al ver el lugar. Y decide si vale la pena ir a medir (industria sí; una casa de $500 no).
   ═══════════════════════════════════════════════════════════════════════════ */

/* Forma de las tarifas (se llena con el Excel):
   { minimo, mano_obra_m2, costo_km, radio_km, margen, umbral_visita_m2,
     plagas: { cucaracha: { litros_m2, precio_litro }, … },
     tipos: { casa: { factor }, negocio: { factor }, industria: { factor, visita: true } } } */

/* Cómo le dice la gente a cada plaga → la clave de las tarifas. Se amplía en
   las tarifas (`alias`) sin tocar código: lo que se oiga en la calle, se agrega. */
export const ALIAS = {
  cucaracha: ['cucaracha', 'cucarachita', 'cuca', 'guerita', 'alemana', 'americana'],
  chinche: ['chinche', 'chinche de cama'],
  alacran: ['alacran', 'escorpion'],
  roedor: ['rata', 'raton', 'roedor', 'tuza'],
  hormiga: ['hormiga'],
  termita: ['termita', 'comejen', 'polilla de la madera'],
  pulga: ['pulga', 'garrapata'],
  arana: ['arana', 'viuda negra'],
  mosco: ['mosco', 'mosquito', 'zancudo'],
  mosca: ['mosca'],
};
const sinAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
/** «cucarachitas güeritas» → 'cucaracha'. null si no se reconoce. */
export function aPlaga(texto, extra = {}){
  const t = sinAcento(texto).replace(/(es|s)\b/g, '');
  for(const [clave, dichos] of Object.entries({ ...ALIAS, ...extra })){
    if(t === clave || dichos.some(d => t.includes(sinAcento(d)))) return clave;
  }
  return null;
}

export function cotizar(p, t){
  const falta = [];
  if(!t || !t.plagas) return { bien: false, falta: ['tarifas (el Excel del cliente)'] };
  const plaga = t.plagas[p.plaga] || t.plagas[aPlaga(p.plaga, t.alias)];
  if(!plaga) falta.push('plaga');
  if(!(p.m2 > 0)) falta.push('metros cuadrados');
  if(!(p.km >= 0)) falta.push('zona o distancia');
  if(falta.length) return { bien: false, falta };

  const tipo = (t.tipos || {})[p.tipo || 'casa'] || { factor: 1 };
  const producto = p.m2 * plaga.litros_m2 * plaga.precio_litro;
  const mano = p.m2 * (t.mano_obra_m2 || 0);
  const traslado = p.km * 2 * (t.costo_km || 0);
  const costo = (producto + mano) * (tipo.factor || 1) + traslado;
  const desde = Math.max(t.minimo || 0, redondear(costo * (1 + (t.margen || 0))));
  const fueraDeRadio = t.radio_km != null && p.km > t.radio_km;
  /* Fuera de la zona (Carlos, 11 nov): industria sí, con visita para confirmar; casa NO, salvo
     que sea un proyecto grande, y ése se ve caso por caso con el dueño. Siempre cuesta más por
     el traslado, y se le avisa al cliente con tacto. */
  const grande = p.m2 >= (t.fuera_m2_minimo ?? 200);
  const atiende = !fueraDeRadio ? 'si' : p.tipo === 'industria' ? 'si' : grande ? 'caso-por-caso' : 'no';
  return {
    bien: true, desde, moneda: 'MXN', ...(t.ejemplo ? { ejemplo: true } : {}),
    desglose: { producto: redondear(producto), mano_de_obra: redondear(mano), traslado: redondear(traslado) },
    visita: !!tipo.visita || (t.umbral_visita_m2 != null && p.m2 >= t.umbral_visita_m2),
    fueraDeRadio, atiende,
    ...(p.m2Estimado ? { m2: p.m2, m2Estimado: true } : {}),
    nota: 'Precio aproximado: si los datos que dio son correctos, ése es más o menos el costo. El técnico lo confirma al ver el lugar.'
      + (p.m2Estimado ? ' Los metros son estimados por lo que contó.' : ''),
  };
}

/* a la decena hacia arriba: $487 → $490 */
const redondear = (n) => Math.ceil(n / 10) * 10;
