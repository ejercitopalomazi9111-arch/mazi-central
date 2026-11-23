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
   { minimo, radio_km, margen, umbral_visita_m2,
     plagas: { cucaracha: { material, litros_m2, precio_litro }, … },   ← qué producto lleva cada plaga y cuánto se gasta
     tecnico: { costo_hora, m2_hora, minimo_horas, personas },           ← el tiempo de su gente
     vehiculo: { gasolina_km, llantas_km, balatas_km, motor_km },        ← lo que se gasta la camioneta por km
     tipos: { casa: { factor }, negocio: { factor }, industria: { factor, visita: true } } }
   Carlos, 12 nov: «todo se cuenta: gasolina, balatas, llantas, motor, la distancia, el tiempo de los empleados
   y el material». Si las tarifas todavía vienen en la forma vieja (mano_obra_m2 y costo_km), se usa ésa. */

/* Cómo le dice la gente a cada plaga → la clave de las tarifas. Se amplía en
   las tarifas (`alias`) sin tocar código: lo que se oiga en la calle, se agrega. */
import { corrida } from './corrida.js';

export const ALIAS = {
  /* «cucharachas», «chucharachas»: así lo escribió Carlos probándolo (17 nov) */
  cucaracha: ['cucaracha', 'cucarachita', 'cuca', 'guerita', 'alemana', 'americana', 'cucharacha', 'chucharacha'],
  chinche: ['chinche', 'chinche de cama'],
  alacran: ['alacran', 'escorpion'],
  roedor: ['rata', 'raton', 'roedor', 'tuza'],
  hormiga: ['hormiga', 'hormiguita'],
  termita: ['termita', 'comejen', 'polilla de la madera'],
  pulga: ['pulga', 'garrapata'],
  arana: ['arana', 'aranita', 'viuda negra'],
  mosco: ['mosco', 'mosquito', 'zancudo', 'zancudito'],
  mosca: ['mosca', 'mosquita'],
};
const sinAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
/** «cucarachitas güeritas» → 'cucaracha'. null si no se reconoce. */
export function aPlaga(texto, extra = {}){
  /* el plural se quita de las dos formas: «chinches» → «chinche» (sin s), «ratones» → «raton» (sin es).
     Antes sólo se quitaba «es» y «chinches» quedaba «chinch»: el bot no cotizaba chinches (12 nov) */
  const base = sinAcento(texto), formas = [base, base.replace(/s\b/g, ''), base.replace(/es\b/g, '')];
  for(const [clave, dichos] of Object.entries({ ...ALIAS, ...extra })){
    if(formas.some(t => t === clave || dichos.some(d => t.includes(sinAcento(d))))) return clave;
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
  const deExcel = t.formula?.tipo === 'excel' && t.formula.x > 0 && t.formula.entre > 0;
  /* el material: el de esa plaga, por metro. Con su Excel, los litros van a 2 decimales ANTES de calcular: así lo que
     se le enseña al dueño («3.43 L») es exactamente lo que entró a la cuenta, y en su Excel le da lo mismo. */
  const litros = deExcel ? Math.round(p.m2 * plaga.litros_m2 * 100) / 100 : p.m2 * plaga.litros_m2, producto = litros * plaga.precio_litro;
  /* la gente: horas (de media en media) × personas × lo que cuesta su hora */
  let mano, tecnico = null;
  if(t.tecnico?.costo_hora){
    const personas = t.tecnico.personas || (p.m2 > 600 ? 2 : 1);
    const horas = Math.max(t.tecnico.minimo_horas || 1, Math.ceil(p.m2 / (t.tecnico.m2_hora || 60) / personas * 2) / 2);
    mano = horas * personas * t.tecnico.costo_hora; tecnico = { horas, personas, costo_hora: t.tecnico.costo_hora };
  } else mano = p.m2 * (t.mano_obra_m2 || 0);
  /* la camioneta: ida y vuelta, y cada cosa que se gasta por kilómetro */
  const kmTotal = p.km * 2;
  let traslado, vehiculo = null;
  if(t.vehiculo){
    vehiculo = { km: kmTotal };
    for(const k of ['gasolina', 'llantas', 'balatas', 'motor']) vehiculo[k] = kmTotal * (t.vehiculo[k + '_km'] || 0);
    traslado = vehiculo.gasolina + vehiculo.llantas + vehiculo.balatas + vehiculo.motor;
  } else traslado = kmTotal * (t.costo_km || 0);
  let costo = (producto + mano) * (tipo.factor || 1) + traslado;
  let desde = Math.max(t.minimo || 0, redondear(costo * (1 + (t.margen || 0))));
  /* SU EXCEL (17 nov, Godines): «Cotización convencional» = (químicos + mano de obra) × su multiplicador + km × su
     costo por km. Los números salen de su Excel al cargarlo en el centro (centro/excel.js), no de aquí. El km es el que
     él anota en su Excel (de su bodega al lugar), sin ida y vuelta: así lo cobra él.
     La cuenta la hace corrida.js, el MISMO archivo que usa la pestaña «Cotizar» (copia exacta, la prueba lo exige):
     con las mismas horas, km y litros, el bot, la herramienta y su Excel dan el mismo precio, al centavo. Por eso aquí
     no hay mínimo ni redondeo: su Excel no los tiene. */
  let excel = null;
  if(deExcel){
    const f = t.formula, horas = tecnico ? tecnico.horas * tecnico.personas : 0;
    const ex = { catalogo: [{ id: plaga.producto || '_', nombre: plaga.material || '', unidad: 'ml/lt', por_unidad: plaga.precio_litro }],
      convencional: { mano_hora: t.tecnico?.costo_hora || 0, km: f.km || 0, x: f.x, entre: f.entre, traslado_aparte: f.traslado_aparte, costos: f.costos ?? null } };
    const c = corrida({ horas, km: p.km, renglones: [{ plaga: plaga.columna || p.plaga, producto: plaga.producto || '_', cantidad: litros }] }, ex);
    traslado = c.traslado; vehiculo = null; mano = c.mano;
    costo = c.directo; desde = c.cotizacion;
    excel = { x: f.x, entre: f.entre, km: f.km, exacto: c.cotizacion, costos: c.costos, utilidad: c.utilidad,
      /* lo que hay que poner en su Excel (o en «Cotizar») para que dé este mismo precio */
      corrida: { horas, km: p.km, producto: plaga.producto || null, material: plaga.material || null, columna: plaga.columna || null, cantidad: litros } };
  }
  const fueraDeRadio = t.radio_km != null && p.km > t.radio_km;
  /* Fuera de la zona (Carlos, 11 nov): industria sí, con visita para confirmar; casa NO, salvo
     que sea un proyecto grande, y ése se ve caso por caso con el dueño. Siempre cuesta más por
     el traslado, y se le avisa al cliente con tacto. */
  const grande = p.m2 >= (t.fuera_m2_minimo ?? 200);
  /* Un lugar enorme no se cotiza solo (prueba de seguridad, 23 nov: «mi casa mide 99999999 metros» daba $384,711,032.18
     y una hoja). Arriba de m2_maximo_auto (1,500 m² en casa; 20,000 en negocio o industria) lo revisa el encargado. */
  const enorme = p.m2 > (t.m2_maximo_auto ?? ((p.tipo || 'casa') === 'casa' ? 1500 : 20000));
  const atiende = enorme ? 'caso-por-caso' : !fueraDeRadio ? 'si' : p.tipo === 'industria' ? 'si' : grande ? 'caso-por-caso' : 'no';
  return {
    bien: true, desde, moneda: 'MXN', ...(t.ejemplo ? { ejemplo: true } : {}),
    desglose: excel ? { producto: r2(producto), mano_de_obra: r2(mano), traslado: r2(traslado),
      material: { nombre: plaga.material || null, litros, costo: r2(producto) }, tecnico, vehiculo: null, factor: 1,
      costo: r2(costo), ganancia: r2(desde - costo), excel } : { producto: redondear(producto), mano_de_obra: redondear(mano), traslado: redondear(traslado),
      material: { nombre: plaga.material || null, litros: Math.round(litros * 100) / 100, costo: Math.round(producto) },
      tecnico, vehiculo: vehiculo && Object.fromEntries(Object.entries(vehiculo).map(([k, v]) => [k, Math.round(v * 10) / 10])),
      factor: tipo.factor || 1, costo: Math.round(costo), ganancia: Math.round(desde - costo) },
    visita: !!tipo.visita || enorme || (t.umbral_visita_m2 != null && p.m2 >= t.umbral_visita_m2), ...(enorme ? { enorme: true } : {}),
    fueraDeRadio, atiende,
    ...(p.m2Estimado ? { m2: p.m2, m2Estimado: true } : {}), ...(p.kmEstimado ? { kmEstimado: true } : {}),
    nota: 'Precio aproximado: si los datos que dio son correctos, ése es más o menos el costo. El técnico lo confirma al ver el lugar.'
      + (p.m2Estimado ? ' Los metros son estimados por lo que contó.' : '')
      + (p.kmEstimado ? ' La distancia también es estimada: falta la zona exacta.' : ''),
  };
}

/* a la decena hacia arriba: $487 → $490 (sólo con las tarifas de antes; con su Excel va al centavo, como su hoja) */
const redondear = (n) => Math.ceil(n / 10) * 10;
const r2 = (n) => Math.round(n * 100) / 100;
