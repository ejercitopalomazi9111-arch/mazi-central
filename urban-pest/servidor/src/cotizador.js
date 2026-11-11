/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL COTIZADOR
   ───────────────────────────────────────────────────────────────────────────
   El precio sale de cuatro cosas (lo dijo el dueño): el producto que se gasta,
   el tipo de plaga, los metros cuadrados y la distancia desde la bodega
   (gasolina y desgaste del vehículo, dentro de su radio).

   Las tarifas NO están aquí: salen de su Excel (FALTA) y viven en el servidor.
   Sin tarifas, el cotizador no inventa: dice qué falta.

   Lo que da siempre es un «DESDE»: el precio final lo confirma el técnico al ver
   el lugar. Y decide si vale la pena ir a medir (industria sí; una casa de $500 no).
   ═══════════════════════════════════════════════════════════════════════════ */

/* Forma de las tarifas (se llena con el Excel):
   { minimo, mano_obra_m2, costo_km, radio_km, margen, umbral_visita_m2,
     plagas: { cucaracha: { litros_m2, precio_litro }, … },
     tipos: { casa: { factor }, negocio: { factor }, industria: { factor, visita: true } } } */

export function cotizar(p, t){
  const falta = [];
  if(!t || !t.plagas) return { bien: false, falta: ['tarifas (el Excel del cliente)'] };
  const plaga = t.plagas[p.plaga];
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
  return {
    bien: true, desde, moneda: 'MXN',
    desglose: { producto: redondear(producto), mano_de_obra: redondear(mano), traslado: redondear(traslado) },
    visita: !!tipo.visita || (t.umbral_visita_m2 != null && p.m2 >= t.umbral_visita_m2),
    fueraDeRadio,
    nota: 'Precio desde. El total lo confirma un técnico al ver el lugar.',
  };
}

/* a la decena hacia arriba: $487 → $490 */
const redondear = (n) => Math.ceil(n / 10) * 10;
