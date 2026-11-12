/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · LA CARPETA DE CUMPLIMIENTO (industria)
   ───────────────────────────────────────────────────────────────────────────
   Es lo que se le promete a cada planta en la hoja de industria y en los correos
   (urban-pest/venta/): «cada servicio queda en una carpeta en línea; su jefe de
   calidad la consulta cuando quiera». La NOM-251-SSA1-2009, numeral 5.10, pide:
     · un programa de control de plagas (5.10.7),
     · plaguicidas con registro (5.10.9),
     · si el servicio es contratado, constancia de cada servicio con el número de
       licencia sanitaria de quien lo da (5.10.11).
   Por eso cada servicio guarda productos CON su registro, y la constancia imprime la
   licencia sanitaria de Urban Pest (de «documentos»; si falta, lo dice, no inventa).

   Guarda en el mismo almacén del bot:
     planta:<id>            { id, nombre, giro, direccion, contacto, codigo, estaciones:[{n, zona, tipo}], ejemplo? }
     carpeta:<codigo>       <id>            (el link de consulta de la planta → su id)
     servicio:<id>:<folio>  { folio, fecha, tecnico, tipo, productos, estaciones, hallazgos, recomendaciones, recibio, firma }
     documentos             { razon_social, licencia_sanitaria, repse, responsable_tecnico }
     folio                  último folio usado
   El link de consulta es sólo de lectura y sólo de ESA planta.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ESTADOS = ['sin actividad', 'con actividad', 'captura', 'dañada', 'faltante'];
export const TIPOS_ESTACION = ['cebadera', 'trampa de pegamento', 'trampa de luz', 'trampa mecánica', 'monitoreo'];
const TOPE_FIRMA = 80_000; /* una firma con el dedo en PNG pesa 5-25 KB; más que esto no es una firma */

const azar = (n, abc = 'abcdefghjkmnpqrstuvwxyz23456789') => [...crypto.getRandomValues(new Uint8Array(n))].map(x => abc[x % abc.length]).join('');
const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export async function crearPlanta(A, b){
  const nombre = texto(b.nombre, 120); if(!nombre) return { bien: false, error: 'Falta el nombre de la planta.', estado: 400 };
  const id = 'p' + azar(8), codigo = azar(14);
  const planta = { id, nombre, giro: texto(b.giro, 80), direccion: texto(b.direccion, 200), contacto: texto(b.contacto, 120), codigo, estaciones: [], creada: Date.now(), ...(b.ejemplo ? { ejemplo: true } : {}) };
  await A.put('planta:' + id, planta); await A.put('carpeta:' + codigo, id);
  return { bien: true, planta };
}

export async function listarPlantas(A){
  const plantas = (await A.list('planta:')).map(([, p]) => p);
  for(const p of plantas) p.servicios = (await A.list(`servicio:${p.id}:`)).length;
  return { bien: true, plantas: plantas.sort((a, b) => a.nombre.localeCompare(b.nombre)) };
}

export async function ponerEstaciones(A, b){
  const p = await A.get('planta:' + b.planta); if(!p) return { bien: false, error: 'No existe esa planta.', estado: 404 };
  if(!Array.isArray(b.estaciones) || b.estaciones.length > 400) return { bien: false, error: 'Las estaciones van en una lista (máximo 400).', estado: 400 };
  const vistas = new Set();
  p.estaciones = b.estaciones.map((e, i) => ({ n: Number(e.n) || i + 1, zona: texto(e.zona, 60), tipo: TIPOS_ESTACION.includes(e.tipo) ? e.tipo : 'monitoreo' }))
    .filter(e => !vistas.has(e.n) && vistas.add(e.n)).sort((a, b) => a.n - b.n);
  await A.put('planta:' + p.id, p);
  return { bien: true, estaciones: p.estaciones.length };
}

export async function ponerDocumentos(A, b){
  const d = { ...((await A.get('documentos')) || {}) };
  for(const k of ['razon_social', 'licencia_sanitaria', 'repse', 'responsable_tecnico']) if(b[k] !== undefined) d[k] = texto(b[k], 120);
  await A.put('documentos', d); return { bien: true, documentos: d };
}

/** Un servicio en la planta. Lo que la NOM pide se exige aquí; lo demás se guarda si viene. */
export async function registrarServicio(A, b, quien){
  const p = await A.get('planta:' + b.planta); if(!p) return { bien: false, error: 'No existe esa planta.', estado: 404 };
  const fecha = texto(b.fecha, 10); if(!esFecha(fecha)) return { bien: false, error: 'La fecha va como AAAA-MM-DD.', estado: 400 };
  const tecnico = texto(b.tecnico, 80); if(!tecnico) return { bien: false, error: 'Falta el nombre del técnico.', estado: 400 };
  const productos = (Array.isArray(b.productos) ? b.productos : []).slice(0, 20).map(x => ({ nombre: texto(x.nombre, 80), registro: texto(x.registro, 40), cantidad: texto(x.cantidad, 30) })).filter(x => x.nombre);
  /* 5.10.9: plaguicidas con registro. Un producto sin registro no entra a una constancia. */
  const sinRegistro = productos.filter(x => !x.registro).map(x => x.nombre);
  if(sinRegistro.length) return { bien: false, error: `Falta el registro de: ${sinRegistro.join(', ')}.`, estado: 400 };
  const numeros = new Set(p.estaciones.map(e => e.n));
  const estaciones = (Array.isArray(b.estaciones) ? b.estaciones : []).filter(e => numeros.has(Number(e.n)))
    .map(e => ({ n: Number(e.n), estado: ESTADOS.includes(e.estado) ? e.estado : 'sin actividad', nota: texto(e.nota, 120) }));
  const firma = typeof b.firma === 'string' && b.firma.startsWith('data:image/png;base64,') && b.firma.length <= TOPE_FIRMA ? b.firma : null;
  const recibio = { nombre: texto(b.recibio?.nombre, 80), puesto: texto(b.recibio?.puesto, 60) };
  if(!recibio.nombre) return { bien: false, error: 'Falta quién recibió el servicio.', estado: 400 };
  const folio = ((await A.get('folio')) || 0) + 1; await A.put('folio', folio);
  const s = { folio, fecha, tecnico, tipo: texto(b.tipo, 60) || 'Servicio de control de plagas', productos, estaciones,
    hallazgos: texto(b.hallazgos, 1500), recomendaciones: texto(b.recomendaciones, 1500), recibio, firma, capturo: quien || null, creado: Date.now(),
    ...(p.ejemplo ? { ejemplo: true } : {}) };
  await A.put(`servicio:${p.id}:${String(folio).padStart(6, '0')}`, s);
  return { bien: true, folio };
}

/** Quitar un servicio capturado por error. Queda en el registro de quitados (quién y cuándo): en una carpeta de
    auditoría no se borra nada en silencio. */
export async function quitarServicio(A, b, quien){
  const k = `servicio:${b.planta}:${String(Number(b.folio) || 0).padStart(6, '0')}`, s = await A.get(k);
  if(!s) return { bien: false, error: 'No existe ese servicio.', estado: 404 };
  await A.put('quitado:' + k, { ...s, quitado: { por: quien || null, cuando: Date.now(), motivo: texto(b.motivo, 200) } });
  await A.del(k); return { bien: true };
}

/** Lo que ve el jefe de calidad con su link. Sólo lectura, sólo su planta. */
export async function carpetaPublica(A, codigo){
  const id = /^[a-z0-9]{10,20}$/.test(String(codigo || '')) ? await A.get('carpeta:' + codigo) : null;
  const p = id && await A.get('planta:' + id);
  if(!p) return { bien: false, error: 'Ese link de carpeta no existe. Pídele el suyo a Urban Pest.', estado: 404 };
  const servicios = (await A.list(`servicio:${p.id}:`)).map(([, s]) => s).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.folio - a.folio);
  const ultimo = new Map();
  for(const s of [...servicios].reverse()) for(const e of s.estaciones) ultimo.set(e.n, { estado: e.estado, fecha: s.fecha });
  return { bien: true,
    planta: { nombre: p.nombre, giro: p.giro, direccion: p.direccion, ...(p.ejemplo ? { ejemplo: true } : {}) },
    documentos: (await A.get('documentos')) || {},
    estaciones: p.estaciones.map(e => ({ ...e, ultimo: ultimo.get(e.n) || null })),
    servicios, tendencia: tendencia(servicios) };
}

/** Por mes: cuántas estaciones con actividad o captura. Es lo que un auditor quiere ver bajar. */
export function tendencia(servicios){
  const m = new Map();
  for(const s of servicios){
    const k = s.fecha.slice(0, 7), t = m.get(k) || { mes: k, revisadas: 0, actividad: 0 };
    t.revisadas += s.estaciones.length; t.actividad += s.estaciones.filter(e => e.estado === 'con actividad' || e.estado === 'captura').length;
    m.set(k, t);
  }
  return [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Una planta de muestra para enseñarle a un prospecto «así se ve tu carpeta». Va marcada como ejemplo. */
export async function plantaEjemplo(A){
  for(const [k, id] of await A.list('carpeta:')){ const p = await A.get('planta:' + id); if(p?.ejemplo) return { bien: true, planta: p, ya: true }; }
  const { planta } = await crearPlanta(A, { nombre: 'Planta de ejemplo · Alimentos', giro: 'Industria alimentaria', direccion: 'Parque industrial, Querétaro', contacto: 'Jefe de calidad', ejemplo: true });
  const zonas = [['Recepción', 4], ['Almacén de materia prima', 6], ['Producción', 6], ['Andén de embarque', 4], ['Perímetro', 8]];
  let n = 0; const estaciones = [];
  for(const [zona, k] of zonas) for(let i = 0; i < k; i++) estaciones.push({ n: ++n, zona, tipo: zona === 'Perímetro' ? 'cebadera' : zona === 'Producción' ? 'trampa de luz' : 'trampa mecánica' });
  await ponerEstaciones(A, { planta: planta.id, estaciones });
  const productos = [{ nombre: 'Cebo rodenticida en bloque', registro: 'RSCO-EJEMPLO-01', cantidad: '8 bloques' }, { nombre: 'Gel cucarachicida', registro: 'RSCO-EJEMPLO-02', cantidad: '30 g' }];
  const visitas = [['2026-09-10', [3, 17, 22]], ['2026-10-08', [17]], ['2026-11-05', []]];
  for(const [fecha, activas] of visitas){
    await registrarServicio(A, { planta: planta.id, fecha, tecnico: 'Técnico de ejemplo', productos,
      estaciones: estaciones.map(e => ({ n: e.n, estado: activas.includes(e.n) ? 'con actividad' : 'sin actividad' })),
      hallazgos: activas.length ? `Actividad de roedor en ${activas.length} estación(es); se reforzó el cebo y se revisa en la siguiente visita.` : 'Sin actividad en ninguna estación.',
      recomendaciones: 'Mantener cerrada la puerta del andén y retirar tarimas del perímetro.',
      recibio: { nombre: 'Jefe de calidad (ejemplo)', puesto: 'Calidad e inocuidad' } }, 'ejemplo');
  }
  return { bien: true, planta: await A.get('planta:' + planta.id) };
}
