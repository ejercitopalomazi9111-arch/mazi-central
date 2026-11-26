/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · LA DISTANCIA (en qué zona está el cliente y cuántos km hay)
   ───────────────────────────────────────────────────────────────────────────
   BRIEF §B: el precio sale, entre otras cosas, de «la distancia desde la
   bodega». En su Excel la columna «Kilómetros» es la IDA por carretera desde su
   bodega, con decimales, multiplicada UNA vez por su costo por km (Godines lo
   comparó contra el mapa, 23 nov: SMA 66.2 / 63.2, San Juan del Río 55 / 51.4).

   Aquí:
     · lugarConocido(texto)  la tabla de colonias, municipios y parques de la zona
                             (geografía pública de OpenStreetMap, sin datos del cliente)
     · ubicar(A, texto)      la tabla primero; si no está, OpenStreetMap (Nominatim),
                             acotado a la región y con caché en el almacén (geo:<texto>)
     · kmPorCarretera(de, a) OSRM; si no contesta en 4 s, línea recta × 1.3 (por: 'aprox')
     · rumbo(lugar)          centro / norte / noreste / … / «fuera de la ciudad»
     · ponerSalida / distanciaA   las rutas del panel (POST /api/salida, GET /api/distancia)

   PRIVACIDAD: a OpenStreetMap SÓLO se le manda el texto de la colonia (máx. 120
   letras). Nunca el nombre, el teléfono, el chat ni el mensaje del cliente. La
   dirección de la bodega sí, porque es del negocio y sin ella no hay km.

   FALTA del cliente: el domicilio de donde sale la camioneta. Mientras no esté
   guardado (clave «salida»), el bot igual dice la zona y los km son los típicos
   de su Excel, marcados como estimados. NO se deduce ni se inventa.

   Sin dependencias: corre igual en el Worker y en Node (las pruebas le pasan un
   `traer` de mentiras: nunca salen a internet).
   ═══════════════════════════════════════════════════════════════════════════ */

/* El centro de Querétaro (Jardín Zenea / Centro Histórico): de aquí se mide el RUMBO. No es la bodega. */
export const CENTRO_QRO = { lat: 20.593, lon: -100.3916 };

/* Geocodificados con OpenStreetMap el 23 nov (Godines). `a` = cómo lo dice la gente, sin acentos y en minúsculas;
   el nombre también cuenta. Se quitaron a propósito los alias que chocan con calles: «escobedo» (Av. Mariano Escobedo,
   en el Centro) y «benito juarez» (hay calles Juárez en todos lados). Los MUNICIPIOS van aparte (abajo): «Zibatá, El
   Marqués» tiene que ser Zibatá, no el municipio. */
export const LUGARES = [
  { n: 'Centro Histórico', m: 'Querétaro', lat: 20.593, lon: -100.3916, a: ['centro', 'el centro', 'centro historico'] },
  { n: 'Carretas', m: 'Querétaro', lat: 20.5918, lon: -100.3723 },
  { n: 'Álamos', m: 'Querétaro', lat: 20.6044, lon: -100.3782, a: ['alamos'] },
  { n: 'Jardines de la Hacienda', m: 'Querétaro', lat: 20.571, lon: -100.4133 },
  { n: 'Niños Héroes', m: 'Querétaro', lat: 20.5868, lon: -100.4068 },
  { n: 'Arboledas', m: 'Querétaro', lat: 20.6164, lon: -100.3853 },
  { n: 'Colinas del Cimatario', m: 'Querétaro', lat: 20.5651, lon: -100.3695, a: ['cimatario'] },
  { n: 'Lomas de Casa Blanca', m: 'Querétaro', lat: 20.5699, lon: -100.3927, a: ['casa blanca'] },
  { n: 'Hércules', m: 'Querétaro', lat: 20.6021, lon: -100.3654, a: ['hercules'] },
  { n: 'Calesa', m: 'Querétaro', lat: 20.6009, lon: -100.374 },
  { n: 'Plazas del Sol', m: 'Querétaro', lat: 20.6145, lon: -100.3717 },
  { n: 'San Pablo', m: 'Querétaro', lat: 20.6181, lon: -100.4166 },
  { n: 'Centro Sur', m: 'Querétaro', lat: 20.5691, lon: -100.3655 },
  { n: 'Juriquilla', m: 'Querétaro', lat: 20.7126, lon: -100.4584, a: ['juriquiya'] },
  { n: 'Jurica', m: 'Querétaro', lat: 20.6751, lon: -100.4533 },
  { n: 'Santa Rosa Jáuregui', m: 'Querétaro', lat: 20.7418, lon: -100.4472, a: ['santa rosa jauregui', 'santa rosa'] },
  { n: 'El Salitre', m: 'Querétaro', lat: 20.6665, lon: -100.4218, a: ['salitre'] },
  { n: 'Cumbres del Lago', m: 'Querétaro', lat: 20.7004, lon: -100.467 },
  { n: 'Satélite', m: 'Querétaro', lat: 20.6401, lon: -100.45, a: ['satelite'] },
  { n: 'San Pedrito Peñuelas', m: 'Querétaro', lat: 20.6427, lon: -100.3985, a: ['penuelas', 'san pedrito'] },
  { n: 'Tlacote', m: 'Querétaro', lat: 20.6605, lon: -100.5069, a: ['tlacote'] },
  { n: 'Mompaní', m: 'Querétaro', lat: 20.6936, lon: -100.5058, a: ['mompani'] },
  { n: 'Menchaca', m: 'Querétaro', lat: 20.6337, lon: -100.3906 },
  { n: 'Ciudad del Sol', m: 'Querétaro', lat: 20.6389, lon: -100.4937 },
  { n: 'Bolaños', m: 'Querétaro', lat: 20.6156, lon: -100.3747, a: ['bolanos'] },
  { n: 'El Refugio', m: 'Querétaro', lat: 20.6481, lon: -100.3474, a: ['refugio'] },
  { n: 'Milenio III', m: 'Querétaro', lat: 20.599, lon: -100.3471, a: ['milenio', 'milenio 3', 'milenio iii'] },
  { n: 'El Campanario', m: 'Querétaro', lat: 20.6173, lon: -100.3486, a: ['campanario'] },
  { n: 'Altozano', m: 'Querétaro', lat: 20.6712, lon: -100.397 },
  { n: 'Sonterra', m: 'Querétaro', lat: 20.6197, lon: -100.5012 },
  { n: 'Parque Industrial Benito Juárez', m: 'Querétaro', lat: 20.6468, lon: -100.4298, a: ['parque industrial benito juarez'] },
  { n: 'Parque Industrial Querétaro', m: 'Querétaro', lat: 20.8261, lon: -100.4382, a: ['parque industrial queretaro', 'piq'] },
  { n: 'El Pueblito', m: 'Corregidora', lat: 20.5398, lon: -100.4411, a: ['pueblito'] },
  { n: 'Candiles', m: 'Corregidora', lat: 20.5418, lon: -100.4026 },
  { n: 'Tejeda', m: 'Corregidora', lat: 20.5419, lon: -100.42 },
  { n: 'Pirámides', m: 'Corregidora', lat: 20.541, lon: -100.45, a: ['piramides'] },
  { n: 'Balvanera', m: 'Corregidora', lat: 20.5292, lon: -100.463 },
  { n: 'El Condado', m: 'Corregidora', lat: 20.5133, lon: -100.4006, a: ['condado'] },
  { n: 'Puerta Real', m: 'Corregidora', lat: 20.5607, lon: -100.4375 },
  { n: 'Los Olvera', m: 'Corregidora', lat: 20.5352, lon: -100.4068, a: ['olvera'] },
  { n: 'Charco Blanco', m: 'Corregidora', lat: 20.4344, lon: -100.4711 },
  { n: 'Santa Bárbara', m: 'Corregidora', lat: 20.5239, lon: -100.441, a: ['santa barbara'] },
  { n: 'La Cañada', m: 'El Marqués', lat: 20.6096, lon: -100.3275, a: ['la canada'] },
  { n: 'La Pradera', m: 'El Marqués', lat: 20.6543, lon: -100.3405, a: ['pradera'] },
  { n: 'Zibatá', m: 'El Marqués', lat: 20.6865, lon: -100.3288, a: ['zibata'] },
  { n: 'Ciudad Maderas', m: 'El Marqués', lat: 20.548, lon: -100.3151, a: ['maderas'] },
  { n: 'Amazcala', m: 'El Marqués', lat: 20.7008, lon: -100.2616 },
  { n: 'Chichimequillas', m: 'El Marqués', lat: 20.765, lon: -100.335 },
  { n: 'Parque Industrial El Marqués', m: 'El Marqués', lat: 20.5606, lon: -100.278, a: ['parque industrial el marques'] },
  { n: 'El Colorado', m: 'El Marqués', lat: 20.5655, lon: -100.2454 },
  { n: 'Saldarriaga', m: 'El Marqués', lat: 20.6288, lon: -100.2875 },
  { n: 'Aeropuerto de Querétaro', m: 'Colón', lat: 20.6217, lon: -100.1965, a: ['aeropuerto'] },
  { n: 'Huimilpan', m: 'Huimilpan', lat: 20.4188, lon: -100.3328 },
  { n: 'Colón', m: 'Colón', lat: 20.7497, lon: -100.0797, a: ['colon'] },
  { n: 'Pedro Escobedo', m: 'Pedro Escobedo', lat: 20.4689, lon: -100.1716 },
  { n: 'San Juan del Río', m: 'San Juan del Río', lat: 20.387, lon: -100.012, a: ['san juan del rio', 'sjr', 'san juan'] },
  { n: 'Tequisquiapan', m: 'Tequisquiapan', lat: 20.5422, lon: -99.9479, a: ['tequis'] },
  { n: 'Ezequiel Montes', m: 'Ezequiel Montes', lat: 20.6529, lon: -99.9084 },
  { n: 'Bernal', m: 'Ezequiel Montes', lat: 20.739, lon: -99.9411, a: ['pena de bernal'] },
  { n: 'Cadereyta', m: 'Cadereyta de Montes', lat: 20.7912, lon: -99.666 },
  { n: 'Amealco', m: 'Amealco de Bonfil', lat: 20.1874, lon: -100.0692 },
  { n: 'San Miguel de Allende', m: 'San Miguel de Allende (Gto.)', lat: 20.9131, lon: -100.7357, a: ['sma', 'san miguel'] },
  { n: 'Atotonilco', m: 'San Miguel de Allende (Gto.)', lat: 21.0046, lon: -100.7933 },
  { n: 'Celaya', m: 'Celaya (Gto.)', lat: 20.5223, lon: -100.8308 },
  { n: 'Apaseo el Grande', m: 'Apaseo el Grande (Gto.)', lat: 20.5919, lon: -100.598 },
  { n: 'Apaseo el Alto', m: 'Apaseo el Alto (Gto.)', lat: 20.4326, lon: -100.5922 },
];
/* Sólo cuando no dijo ninguna colonia: el municipio, ubicado en su cabecera */
export const MUNICIPIOS = [
  { n: 'El Marqués', m: 'El Marqués', lat: 20.6096, lon: -100.3275, a: ['el marques', 'marques'] },
  { n: 'Corregidora', m: 'Corregidora', lat: 20.5398, lon: -100.4411, a: ['corregidora'] },
];
/* La zona metropolitana: lo que está fuera de estos municipios (o a más de 30 km del centro) es «fuera de la ciudad» */
const METRO = new Set(['queretaro', 'corregidora', 'el marques']);
/* Demasiado general para ubicar a nadie: no se le pregunta a OpenStreetMap (daría el centroide del estado) */
const GENERAL = new Set(['queretaro', 'qro', 'santiago de queretaro', 'la ciudad', 'ciudad', 'mexico', 'guanajuato', 'aqui', 'casa', 'mi casa']);

export const normal = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]+/g, ' ').replace(/\s+/g, ' ').trim();
const r1 = (n) => Math.round(n * 10) / 10;

const indice = (lista) => lista.flatMap(l => [...new Set([normal(l.n), ...(l.a || [])])].map(a => [a, l]));
const IND_LUGARES = indice(LUGARES), IND_MUNICIPIOS = indice(MUNICIPIOS);

/** La tabla: el alias MÁS LARGO que aparezca como palabra completa («x el centro», «aquí en milenio», «Zibatá, El Marqués»).
    Primero colonias y lugares; sólo si no hay ninguno, el municipio. null si no está. */
export function lugarConocido(texto){
  const t = ' ' + normal(texto) + ' ';
  for(const ind of [IND_LUGARES, IND_MUNICIPIOS]){
    let mejor = null;
    for(const [a, l] of ind) if(t.includes(' ' + a + ' ') && (!mejor || a.length > mejor[0].length)) mejor = [a, l];
    if(mejor){ const l = mejor[1]; return conRumbo({ nombre: l.n, municipio: l.m, lat: l.lat, lon: l.lon, por: 'tabla' }); }
  }
  return null;
}

/** Línea recta en km (haversine). */
export function kmRecta(a, b){
  const R = 6371, rad = (g) => g * Math.PI / 180, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const RUMBOS = ['norte', 'noreste', 'oriente', 'sureste', 'sur', 'suroeste', 'poniente', 'noroeste'];
/** Hacia dónde queda respecto al centro de Querétaro: «centro» (a menos de 2.5 km), uno de los 8 rumbos, o «fuera de la
    ciudad» (a más de 30 km, o en un municipio que no es Querétaro, Corregidora ni El Marqués). */
export function rumbo(lugar){
  if(!lugar || !Number.isFinite(+lugar.lat) || !Number.isFinite(+lugar.lon)) return null;
  const d = kmRecta(CENTRO_QRO, lugar), mun = normal(String(lugar.municipio || '').replace(/\(.*\)/, ''));
  if(d > 30 || (mun && !METRO.has(mun))) return 'fuera de la ciudad';
  if(d <= 2.5) return 'centro';
  const x = (lugar.lon - CENTRO_QRO.lon) * Math.cos(CENTRO_QRO.lat * Math.PI / 180), y = lugar.lat - CENTRO_QRO.lat;
  const grados = (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
  /* los cuatro rumbos de siempre tienen 60°, los de en medio 30°: así lo dice la gente («Juriquilla está al norte»,
     aunque en el mapa quede a 332°), y el noreste es el noreste de verdad (El Refugio, Zibatá) */
  const CORTES = [[30, 0], [60, 1], [120, 2], [150, 3], [210, 4], [240, 5], [300, 6], [330, 7], [360, 0]];
  return RUMBOS[CORTES.find(([hasta]) => grados < hasta)[1]];
}
const conRumbo = (l) => ({ ...l, rumbo: rumbo(l) });

/** Cómo se lo dice el bot al cliente, UNA vez al dar el precio: «Juriquilla, en el norte de Querétaro». */
export function comoDecirlo(l){
  if(!l?.nombre) return null;
  const mun = String(l.municipio || '').replace(/\s*\(.*\)\s*/, '').trim(), mismo = normal(mun) === normal(l.nombre);
  const nombre = /^centro\b/i.test(l.nombre) ? 'el ' + l.nombre : l.nombre;
  if(l.rumbo === 'fuera de la ciudad') return `${nombre}${mun && !mismo ? ', en ' + mun : ''}, fuera de la ciudad`;
  if(l.rumbo === 'centro') return normal(mun) === 'queretaro' && /^el centro/i.test(nombre) ? `${nombre} de Querétaro` : `${nombre}, en el centro de ${normal(mun) === 'queretaro' || !mun ? 'Querétaro' : mun}`;
  if(!l.rumbo) return nombre;
  if(!mun || normal(mun) === 'queretaro') return `${nombre}, en el ${l.rumbo} de Querétaro`;
  return `${nombre}${mismo ? '' : ', en ' + mun}, al ${l.rumbo} de la ciudad`;
}

/* ── OpenStreetMap ──
   Nominatim pide máximo 1 consulta por segundo y un User-Agent que diga quién es. El Durable Object es uno solo, así
   que este turno basta. Las pruebas ponen la pausa en 0. */
export const OSM = { pausa_ms: 1100, tope_ms: 4000, agente: 'cotizador-plagas-qro/1.0', ultimo: 0 };
/* la región: la zona metropolitana, San Juan del Río, Cadereyta, Amealco, San Miguel de Allende y Celaya */
const CAJA = '-101.0,21.2,-99.5,20.1';
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const conTope = (promesa, ms) => Promise.race([promesa, new Promise((_, no) => setTimeout(() => no(new Error(`no contestó en ${ms / 1000} s`)), ms))]);
const traerDeFabrica = (...a) => fetch(...a);   /* envuelto: en el Worker, fetch llamado como método de otro objeto truena */

/** Lo que se le manda a OpenStreetMap: SÓLO la colonia, sin «aquí en», «por», «x», «colonia»… y máximo 120 letras. */
export function paraOSM(texto){
  const p = normal(texto).split(' '), tipo = /^(colonia|col|fracc|fraccionamiento|fracto|zona|unidad)$/;
  for(;;){
    if(p.length > 1 && (tipo.test(p[0]) || /^(aqui|aca|alla|en|por|x|cerca|de|del|rumbo|a|al|mi|casa|esta|queda|vivo|es)$/.test(p[0]))) p.shift();
    else if(p.length > 2 && /^(la|el)$/.test(p[0]) && tipo.test(p[1])) p.splice(0, 2);   /* «la colonia X» → «X»; «El Refugio» se queda */
    else break;
  }
  return p.join(' ').slice(0, 120).trim();
}

async function nominatim(q, traer){
  const falta = OSM.ultimo + OSM.pausa_ms - Date.now(); if(falta > 0) await espera(falta);
  OSM.ultimo = Date.now();
  const u = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'mx', viewbox: CAJA, bounded: '1', addressdetails: '1', 'accept-language': 'es' });
  const r = await conTope(traer(u, { headers: { 'user-agent': OSM.agente, accept: 'application/json' } }), OSM.tope_ms);
  if(!r.ok) throw new Error('OpenStreetMap contestó ' + r.status);
  const j = await r.json(), x = Array.isArray(j) ? j[0] : null;
  /* un estado entero (rango 8) no ubica a nadie; un municipio (12) o una colonia (24) sí */
  if(!x || !(Number(x.place_rank) >= 12)) return null;
  const ad = x.address || {}, estado = normal(ad.state);
  let mun = String(ad.county || ad.municipality || ad.city || ad.town || ad.village || '').replace(/^municipio de\s+/i, '').trim();
  if(mun && estado && estado !== 'queretaro') mun += estado === 'guanajuato' ? ' (Gto.)' : ` (${ad.state})`;
  /* si lo que encontró es una CALLE («Boulevard Villas del Mesón»), al cliente se le dice la colonia o el pueblo donde
     queda («Juriquilla»), no el nombre de la calle */
  const calle = x.category === 'highway' ? ad.neighbourhood || ad.suburb || ad.quarter || ad.town || ad.village : null;
  return { nombre: String(calle || x.name || ad.neighbourhood || ad.suburb || String(x.display_name || '').split(',')[0]).slice(0, 80), municipio: mun.slice(0, 60) || null,
    lat: r1e(+x.lat), lon: r1e(+x.lon), por: 'osm', osm: String(x.display_name || '').split(',').slice(0, 4).join(',').trim().slice(0, 160) };
}
const r1e = (n) => Math.round(n * 1e4) / 1e4;

/** { lugar } si lo encontró, { nada: true } si OpenStreetMap dice que no existe (se guarda), { error } si no hubo red
    (NO se guarda: la siguiente vez se vuelve a preguntar). */
export async function buscarLugar(A, texto, traer = traerDeFabrica){
  const conocido = lugarConocido(String(texto ?? '').slice(0, 200));
  if(conocido) return { lugar: conocido };
  const q = paraOSM(texto);
  if(q.length < 3 || GENERAL.has(q)) return { nada: true };
  const clave = 'geo:' + q, guardado = await A.get(clave);
  if(guardado?.nada && Date.now() - (guardado.cuando || 0) < 30 * 864e5) return { nada: true };
  if(guardado?.lat != null) return { lugar: conRumbo(guardado) };
  try {
    const l = await nominatim(q, traer);
    await A.put(clave, l ? { ...l, cuando: Date.now() } : { nada: true, cuando: Date.now() });
    return l ? { lugar: conRumbo(l) } : { nada: true };
  } catch(e){ return { error: String(e?.message || e) }; }
}

/** El lugar de la colonia que dijo (con su rumbo), o null. Nunca lanza. */
export async function ubicar(A, texto, traer = traerDeFabrica){ return (await buscarLugar(A, texto, traer)).lugar || null; }

/** Km de IDA por carretera (OSRM), con un decimal, como su Excel. Si no contesta: línea recta × 1.3, marcado por: 'aprox'. */
export async function kmPorCarretera(de, a, traer = traerDeFabrica){
  const aprox = () => ({ km: r1(kmRecta(de, a) * 1.3), por: 'aprox' });
  if(![de?.lat, de?.lon, a?.lat, a?.lon].every(v => Number.isFinite(+v))) return { km: null, por: null };
  try {
    const u = `https://router.project-osrm.org/route/v1/driving/${+de.lon},${+de.lat};${+a.lon},${+a.lat}?overview=false`;
    const r = await conTope(traer(u, { headers: { 'user-agent': OSM.agente } }), OSM.tope_ms);
    if(!r.ok) return aprox();
    const j = await r.json(), m = j?.code === 'Ok' ? Number(j.routes?.[0]?.distance) : NaN;
    if(!(m >= 0)) return aprox();
    return { km: r1(m / 1000), por: 'carretera', minutos: Math.round(Number(j.routes[0].duration || 0) / 60) };
  } catch { return aprox(); }
}

/* «20.5930, -100.3916» pegado de Google Maps: también sirve para la bodega */
const coordenadas = (t) => { const m = String(t).match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/); return m ? { lat: +m[1], lon: +m[2] } : null; };

/** POST /api/salida { direccion }: de dónde sale la camioneta. Se guarda APARTE (clave «salida»): no en `tarifas` (el
    centro las reescribe al cargar el Excel) ni en `negocio` (eso se le pasa a la IA). Regresa lo que entendió, para que el
    dueño confirme que es su bodega. */
export async function ponerSalida(A, b = {}, traer = traerDeFabrica){
  const direccion = String(b.direccion ?? '').trim().slice(0, 160);
  if(!direccion) return { bien: false, error: 'Escribe la dirección de donde sale la camioneta.', estado: 400 };
  let s = coordenadas(direccion), aproximada = false;
  if(s){ if(kmRecta(CENTRO_QRO, s) > 150) return { bien: false, error: 'Esas coordenadas quedan muy lejos de Querétaro. Revísalas.', estado: 400 }; s = { ...s, nombre: 'Coordenadas', municipio: null, por: 'coordenadas' }; }
  else {
    let error = null;
    try { s = await nominatim(direccion, traer); } catch(e){ error = String(e?.message || e); }
    /* sin la calle exacta, al menos la colonia (de la tabla), y se le dice que es aproximada */
    if(!s){ const c = lugarConocido(direccion); if(c){ s = c; aproximada = true; } }
    if(!s) return error ? { bien: false, error: 'No pude preguntarle al mapa (' + error + '). Intenta en un rato o pega las coordenadas de Google Maps (ej. 20.59, -100.39).', estado: 502 }
      : { bien: false, error: 'No encontré esa dirección. Escríbela con calle, número, colonia y municipio, o pega las coordenadas de Google Maps (ej. 20.59, -100.39).', estado: 404 };
  }
  const salida = { direccion, nombre: s.nombre || null, municipio: s.municipio || null, lat: s.lat, lon: s.lon, por: s.por, ...(aproximada ? { aproximada: true } : {}), cuando: Date.now() };
  await A.put('salida', salida);
  const entendi = (s.osm || [s.nombre, s.municipio].filter(Boolean).join(', ') || `${s.lat}, ${s.lon}`) + (aproximada ? ' (sólo la colonia: escribe la calle para que sea exacto)' : '');
  return { bien: true, salida: { ...salida, rumbo: rumbo(salida) }, entendi };
}

/** GET /api/distancia?donde=: el lugar, su municipio, su rumbo y, si ya está la salida, los km de ida por carretera. */
export async function distanciaA(A, donde, traer = traerDeFabrica){
  const texto = String(donde ?? '').trim().slice(0, 120);
  if(!texto) return { bien: false, error: 'Escribe la colonia o el lugar.', estado: 400 };
  const r = await buscarLugar(A, texto, traer);
  if(!r.lugar) return r.error ? { bien: false, error: 'No pude preguntarle al mapa: ' + r.error, estado: 502 }
    : { bien: false, error: `No encontré «${texto}». Escribe la colonia y el municipio (ej. «Jurica, Querétaro»).`, estado: 404 };
  const l = r.lugar, salida = (await A.get('salida')) || null;
  const k = salida ? await kmPorCarretera(salida, l, traer) : { km: null, por: null };
  return { bien: true, lugar: l.nombre, municipio: l.municipio, rumbo: l.rumbo, lat: l.lat, lon: l.lon, de: l.por, km: k.km, por: k.por,
    salida: salida?.direccion || null, ...(salida ? {} : { falta: 'Falta de dónde sale la camioneta: guárdalo para calcular los km.' }) };
}

/** Lo que va en la nota del dueño: «Juriquilla · norte · 18.5 km por carretera». */
export function notaDistancia(lugar, km, por){
  const como = { carretera: 'por carretera', aprox: 'aproximados (el mapa no contestó)', zonas: 'de tu tabla de zonas', tipico: 'típicos de tu Excel (falta de dónde sale la camioneta)' }[por] || '';
  return [lugar?.nombre, lugar?.rumbo, km != null ? `${km} km ${como}`.trim() : null].filter(Boolean).join(' · ') || null;
}
