/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL CENTRO DE OPERACIONES (BRIEF §C)
   ───────────────────────────────────────────────────────────────────────────
   Lo que le da al dueño la confianza de «aquí veo todo lo que está pasando»:
     · servicios: pendientes, hechos y cerrados, con su técnico y su precio;
     · visitas de seguimiento: al marcar un servicio como hecho se agenda sola;
     · inventario de insumos, con mínimo y alerta;
     · revisiones del vehículo, con la próxima por fecha o por kilómetros;
     · el tablero de hoy, que junta eso con lo que hizo el bot.

   El inventario se lleva con MOVIMIENTOS (CLAUDE.md, «gana el más reciente» no sirve
   para un saldo): cada entrada o salida se suma una vez y queda quién y por qué.

   Guarda:
     cita:<id>       un servicio agendado
     insumo:<id>     { nombre, registro, unidad, cantidad, minimo, movimientos[] }
     vehiculo:<id>   { nombre, placas, km, revisiones[] }
   ═══════════════════════════════════════════════════════════════════════════ */

export const ESTADOS_CITA = ['pendiente', 'hecho', 'cerrado', 'cancelado'];
export const TIPOS_REVISION = ['aceite', 'llantas', 'frenos', 'afinación', 'verificación', 'seguro', 'tenencia', 'otro'];
export const SEGUIMIENTO_DIAS = 15;

const azar = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(Date.parse(s));
const num = (v) => { const n = Number(String(v ?? '').replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : null; };
const masDias = (fecha, d) => new Date(Date.parse(fecha + 'T12:00:00Z') + d * 864e5).toISOString().slice(0, 10);
const mal = (error, estado = 400) => ({ bien: false, error, estado });

/* ── servicios ── */
export async function guardarCita(A, b, quien){
  const vieja = b.id ? await A.get('cita:' + b.id) : null;
  if(b.id && !vieja) return mal('No existe ese servicio.', 404);
  const c = { ...(vieja || { id: 'c' + azar(8), estado: 'pendiente', creada: Date.now(), creo: quien || null }) };
  for(const [k, max] of [['cliente', 80], ['telefono', 20], ['direccion', 160], ['zona', 60], ['plaga', 60], ['tecnico', 60], ['nota', 600], ['cotizacion', 16]])
    if(b[k] !== undefined) c[k] = texto(b[k], max);
  if(b.fecha !== undefined){ if(!esFecha(b.fecha)) return mal('La fecha va como AAAA-MM-DD.'); c.fecha = b.fecha; }
  if(b.hora !== undefined){ if(b.hora && !/^\d{1,2}:\d{2}$/.test(b.hora)) return mal('La hora va como 10:30.'); c.hora = b.hora || ''; }
  if(b.precio !== undefined){ const p = num(b.precio); if(p == null || p < 0) return mal('El precio no es un número.'); c.precio = p; }
  if(!c.cliente) return mal('Falta el cliente.');
  if(!c.fecha) return mal('Falta la fecha.');
  await A.put('cita:' + c.id, c);
  return { bien: true, cita: c };
}

/** pendiente → hecho (agenda el seguimiento) → cerrado. «cancelado» desde cualquiera. */
export async function estadoCita(A, b, quien, hoy = new Date().toISOString().slice(0, 10)){
  const c = await A.get('cita:' + b.id); if(!c) return mal('No existe ese servicio.', 404);
  if(!ESTADOS_CITA.includes(b.estado)) return mal('Ese estado no existe.');
  c.estado = b.estado; c.historial = [...(c.historial || []), { estado: b.estado, quien: quien || null, cuando: Date.now(), nota: texto(b.nota, 300) || undefined }];
  if(b.estado === 'hecho' && !c.seguimiento){
    const dias = Math.min(120, Math.max(1, Number(b.seguimiento_dias) || SEGUIMIENTO_DIAS));
    c.seguimiento = { fecha: masDias(c.fecha && c.fecha > hoy ? c.fecha : hoy, dias), hecho: false };
  }
  await A.put('cita:' + c.id, c);
  return { bien: true, cita: c };
}

export async function seguimientoHecho(A, b, quien){
  const c = await A.get('cita:' + b.id); if(!c?.seguimiento) return mal('Ese servicio no tiene seguimiento.', 404);
  c.seguimiento = { ...c.seguimiento, hecho: true, nota: texto(b.nota, 400), quien: quien || null, cuando: Date.now(), sigue_plaga: !!b.sigue_plaga };
  /* si la plaga sigue, la garantía de su página: se regresa sin costo. Queda como servicio nuevo de garantía. */
  let garantia = null;
  if(b.sigue_plaga){
    const r = await guardarCita(A, { cliente: c.cliente, telefono: c.telefono, direccion: c.direccion, zona: c.zona, plaga: c.plaga, fecha: b.fecha || c.seguimiento.fecha, precio: 0, nota: 'Garantía del servicio ' + c.id }, quien);
    garantia = r.cita; c.seguimiento.garantia = garantia?.id;
  }
  await A.put('cita:' + c.id, c);
  return { bien: true, cita: c, garantia };
}

export const listarCitas = async (A) => ({ bien: true, citas: (await A.list('cita:')).map(([, v]) => v).sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || ''))) });

/* ── inventario ── */
export async function guardarInsumo(A, b){
  const viejo = b.id ? await A.get('insumo:' + b.id) : null;
  if(b.id && !viejo) return mal('No existe ese insumo.', 404);
  const i = { ...(viejo || { id: 'i' + azar(8), cantidad: 0, movimientos: [] }) };
  for(const [k, max] of [['nombre', 80], ['registro', 40], ['unidad', 20]]) if(b[k] !== undefined) i[k] = texto(b[k], max);
  if(b.minimo !== undefined){ const m = num(b.minimo); if(m == null || m < 0) return mal('El mínimo no es un número.'); i.minimo = m; }
  if(!i.nombre) return mal('Falta el nombre del insumo.');
  i.unidad ||= 'pzas';
  await A.put('insumo:' + i.id, i);
  return { bien: true, insumo: i };
}

/** Entrada (+) o salida (−). No deja quedar en negativo: eso es un error de captura, no inventario. */
export async function moverInsumo(A, b, quien){
  const i = await A.get('insumo:' + b.id); if(!i) return mal('No existe ese insumo.', 404);
  const d = num(b.delta); if(!d) return mal('Pon cuánto entra (+) o sale (−).');
  if(i.cantidad + d < 0) return mal(`Sólo hay ${i.cantidad} ${i.unidad}; no pueden salir ${-d}.`);
  i.cantidad = Math.round((i.cantidad + d) * 1000) / 1000;
  i.movimientos = [...i.movimientos, { delta: d, motivo: texto(b.motivo, 120) || (d > 0 ? 'Entrada' : 'Salida'), cita: texto(b.cita, 16) || undefined, quien: quien || null, cuando: Date.now() }].slice(-300);
  await A.put('insumo:' + i.id, i);
  return { bien: true, insumo: i };
}

export const listarInsumos = async (A) => ({ bien: true, insumos: (await A.list('insumo:')).map(([, v]) => ({ ...v, bajo: v.minimo != null && v.cantidad <= v.minimo, movimientos: v.movimientos.slice(-20) })).sort((a, b) => (b.bajo - a.bajo) || a.nombre.localeCompare(b.nombre)) });

/* ── vehículo ── */
export async function guardarVehiculo(A, b){
  const viejo = b.id ? await A.get('vehiculo:' + b.id) : null;
  if(b.id && !viejo) return mal('No existe ese vehículo.', 404);
  const v = { ...(viejo || { id: 'v' + azar(8), revisiones: [] }) };
  for(const [k, max] of [['nombre', 60], ['placas', 12]]) if(b[k] !== undefined) v[k] = texto(b[k], max);
  if(b.km !== undefined){ const k = num(b.km); if(k == null || k < 0) return mal('El kilometraje no es un número.'); v.km = k; }
  if(!v.nombre) return mal('Falta el nombre (ej. «Camioneta blanca»).');
  await A.put('vehiculo:' + v.id, v);
  return { bien: true, vehiculo: v };
}

export async function revisionVehiculo(A, b, quien){
  const v = await A.get('vehiculo:' + b.vehiculo); if(!v) return mal('No existe ese vehículo.', 404);
  if(!TIPOS_REVISION.includes(b.tipo)) return mal('Ese tipo de revisión no existe.');
  if(!esFecha(b.fecha)) return mal('La fecha va como AAAA-MM-DD.');
  if(b.proxima_fecha && !esFecha(b.proxima_fecha)) return mal('La próxima fecha va como AAAA-MM-DD.');
  const km = b.km !== undefined && b.km !== '' ? num(b.km) : null;
  const r = { id: 'r' + azar(6), tipo: b.tipo, fecha: b.fecha, km, costo: b.costo !== undefined && b.costo !== '' ? num(b.costo) : null, nota: texto(b.nota, 300),
    proxima_fecha: b.proxima_fecha || null, proxima_km: b.proxima_km ? num(b.proxima_km) : null, quien: quien || null };
  v.revisiones = [...v.revisiones, r].slice(-200);
  if(km != null && km > (v.km || 0)) v.km = km;
  await A.put('vehiculo:' + v.id, v);
  return { bien: true, vehiculo: v };
}

/** La próxima de cada tipo: la última revisión de ese tipo manda. */
export function proximas(v, hoy){
  const ult = new Map(); for(const r of v.revisiones) ult.set(r.tipo, r);
  return [...ult.values()].filter(r => r.proxima_fecha || r.proxima_km).map(r => {
    const dias = r.proxima_fecha ? Math.round((Date.parse(r.proxima_fecha) - Date.parse(hoy)) / 864e5) : null;
    const faltanKm = r.proxima_km != null && v.km != null ? r.proxima_km - v.km : null;
    return { tipo: r.tipo, fecha: r.proxima_fecha, km: r.proxima_km, dias, faltanKm, urge: (dias != null && dias <= 7) || (faltanKm != null && faltanKm <= 500) };
  });
}

export const listarVehiculos = async (A, hoy = new Date().toISOString().slice(0, 10)) =>
  ({ bien: true, vehiculos: (await A.list('vehiculo:')).map(([, v]) => ({ ...v, revisiones: v.revisiones.slice(-30), proximas: proximas(v, hoy) })) });

/* ── el tablero de hoy ── */
export async function tablero(A, hoy = new Date().toISOString().slice(0, 10)){
  const citas = (await listarCitas(A)).citas, insumos = (await listarInsumos(A)).insumos, vehiculos = (await listarVehiculos(A, hoy)).vehiculos;
  const inicio = Date.parse(hoy + 'T06:00:00Z');                                   /* medianoche en Querétaro (UTC−6) */
  const convs = (await A.list('conv:')).map(([, v]) => v).filter(c => c.canal !== 'prueba');
  const deHoy = convs.flatMap(c => c.mensajes.filter(m => m.cuando >= inicio));
  const avisos = (await A.list('aviso:')).map(([id, v]) => ({ id, ...v })).filter(a => a.estado === 'nuevo');
  const cots = (await A.list('cotdoc:')).map(([, v]) => v).filter(c => c.fecha === hoy);
  return { bien: true, hoy,
    servicios_hoy: citas.filter(c => c.fecha === hoy && c.estado === 'pendiente'),
    atrasados: citas.filter(c => c.fecha < hoy && c.estado === 'pendiente'),
    seguimientos: citas.filter(c => c.seguimiento && !c.seguimiento.hecho && c.seguimiento.fecha <= hoy),
    por_cobrar: citas.filter(c => c.estado === 'hecho'),
    insumos_bajos: insumos.filter(i => i.bajo).map(({ movimientos, ...i }) => i),
    vehiculo: vehiculos.flatMap(v => v.proximas.filter(p => p.urge).map(p => ({ vehiculo: v.nombre, ...p }))),
    bot: { chats: new Set(convs.filter(c => c.mensajes.some(m => m.cuando >= inicio)).map(c => c.chat)).size,
      reflejo: deHoy.filter(m => m.via === 'reflejo').length, ia: deHoy.filter(m => m.via === 'cerebro').length,
      tu: deHoy.filter(m => m.via === 'dueno').length, cotizaciones: cots.length },
    avisos: avisos.length };
}
