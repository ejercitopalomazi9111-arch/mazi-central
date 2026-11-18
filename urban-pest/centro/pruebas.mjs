/* Pruebas del centro sin internet:   node urban-pest/centro/pruebas.mjs
 * Sin navegador ni Cloudflare: el «servidor» es el mismo motor sobre un Map, y la señal se
 * prende y se apaga con una variable. Cada trampa lleva DOS casos distintos (skill app-de-campo). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as M from './motor.js';
import { crearRed, describir, LLAVE } from './sin-red.js';
import { muestra, EXCEL_MUESTRA } from './muestra.js';
import { leerXlsx, deExcel, aTarifas, cuenta } from './excel.js';
import { corrida, unidadDe } from './cotizar.js';

let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if (c) { bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const aqui = (f) => fileURLToPath(new URL(f, import.meta.url));
const HOY = '2026-11-13';

/* Un servidor de mentiras: las mismas reglas, su propio almacén y sus propios ids. */
function servidor() {
  const d = new Map(), S = { senal: true, llamadas: [], d, falla: null };
  const A = { get: async k => structuredClone(d.get(k)) ?? null, put: async (k, v) => { d.set(k, structuredClone(v)); },
    list: async p => [...d.keys()].filter(k => k.startsWith(p)).sort().map(k => [k, structuredClone(d.get(k))]) };
  const R = { 'GET /api/tablero': () => M.tablero(A, HOY), 'GET /api/citas': () => M.listarCitas(A), 'GET /api/insumos': () => M.listarInsumos(A),
    'GET /api/vehiculos': () => M.listarVehiculos(A, HOY), 'GET /api/numeros': () => M.numeros(A, HOY),
    'POST /api/citas': b => M.guardarCita(A, b, 'srv'), 'POST /api/citas/estado': b => M.estadoCita(A, b, 'srv', HOY),
    'POST /api/citas/seguimiento': b => M.seguimientoHecho(A, b, 'srv'), 'POST /api/insumos': b => M.guardarInsumo(A, b),
    'POST /api/insumos/mover': b => M.moverInsumo(A, b, 'srv'), 'POST /api/vehiculos': b => M.guardarVehiculo(A, b),
    'POST /api/vehiculos/revision': b => M.revisionVehiculo(A, b, 'srv') };
  S.A = A;
  S.red = async (metodo, ruta, cuerpo) => {
    if (!S.senal) return { bien: false, sinRed: true, error: 'Sin conexión.' };
    S.llamadas.push(metodo + ' ' + ruta);
    if (S.falla) { const f = S.falla; return { bien: false, status: f, error: 'El servidor no contestó bien (' + f + ').' }; }
    const j = await R[metodo + ' ' + ruta.split('?')[0]](cuerpo || {});
    return j.bien ? j : { ...j, status: j.estado || 400 };
  };
  return S;
}
const cajaDe = (m = new Map()) => ({ leer: k => m.get(k) ?? null, poner: (k, v) => { m.set(k, v); }, m });
const telefono = (S, caja = cajaDe(), extra = {}) => crearRed({ red: S.red, motor: M, caja, hoy: () => HOY, autoRefresco: false, ...extra });

console.log('\nLa réplica: lo que llegó con señal se sigue viendo sin señal');
{
  const S = servidor();
  await M.guardarCita(S.A, { cliente: 'Casa uno', fecha: HOY, precio: 500 }); await M.guardarCita(S.A, { cliente: 'Planta dos', fecha: '2026-11-20', precio: 4200 });
  const ins = (await M.guardarInsumo(S.A, { nombre: 'Gel', unidad: 'jeringas', minimo: 4 })).insumo; await M.moverInsumo(S.A, { id: ins.id, delta: 9 });
  const T = telefono(S);
  const conSenal = await T.api('GET', '/api/citas'); await T.api('GET', '/api/insumos');
  S.senal = false;
  const sin = await T.api('GET', '/api/citas'), sinIns = await T.api('GET', '/api/insumos');
  ok('servicios: los mismos dos, en el mismo orden', sin.bien && JSON.stringify(sin.citas) === JSON.stringify(conSenal.citas));
  ok('insumos: la misma cantidad (9 jeringas)', sinIns.bien && sinIns.insumos[0].cantidad === 9 && sinIns.insumos[0].bajo === false);
  ok('y lo dice: estado.sinRed', T.estado().sinRed === true);
  const nuevo = telefono(S, cajaDe());
  const vacio = await nuevo.api('GET', '/api/citas');
  ok('un teléfono que nunca tuvo señal NO enseña una lista vacía: avisa', vacio.bien === false && /todavía no tiene nada guardado/.test(vacio.error), JSON.stringify(vacio));
}

console.log('\nLas mismas reglas sin señal: el inventario no queda en negativo');
{
  const S = servidor();
  const gel = (await M.guardarInsumo(S.A, { nombre: 'Gel', unidad: 'jeringas' })).insumo; await M.moverInsumo(S.A, { id: gel.id, delta: 3 });
  const liq = (await M.guardarInsumo(S.A, { nombre: 'Líquido', unidad: 'L' })).insumo; await M.moverInsumo(S.A, { id: liq.id, delta: 1.5 });
  const T = telefono(S); await T.api('GET', '/api/insumos'); S.senal = false;
  const a = await T.api('POST', '/api/insumos/mover', { id: gel.id, delta: -2, motivo: 'Servicio' });
  ok('salen 2 de 3 jeringas: queda 1 y se apunta como pendiente', a.bien && a.pendiente && a.insumo.cantidad === 1);
  const b = await T.api('POST', '/api/insumos/mover', { id: gel.id, delta: -2 });
  ok('salir 2 más se rechaza AQUÍ con el mensaje del servidor, y no se encola', !b.bien && /Sólo hay 1 jeringas/.test(b.error) && T.estado().pendientes === 1, b.error);
  const c = await T.api('POST', '/api/insumos/mover', { id: liq.id, delta: -2 });
  ok('otro producto, otra unidad: 2 L de 1.5 L tampoco', !c.bien && /Sólo hay 1.5 L/.test(c.error));
  const d = await T.api('POST', '/api/insumos/mover', { id: liq.id, delta: -0.5 });
  ok('y medio litro sí: queda 1 L', d.bien && d.insumo.cantidad === 1 && T.estado().pendientes === 2);
  S.senal = true; await T.enviarCola();
  const srv = (await M.listarInsumos(S.A)).insumos;
  ok('al volver la señal el servidor queda igual: 1 jeringa y 1 L', srv.find(i => i.id === gel.id).cantidad === 1 && srv.find(i => i.id === liq.id).cantidad === 1 && T.estado().pendientes === 0);
  ok('cada salida llegó UNA vez', S.llamadas.filter(l => l === 'POST /api/insumos/mover').length === 2, S.llamadas.join(', '));
}

console.log('\nLa cola va en orden, y lo creado sin señal viaja con el id del servidor');
{
  const S = servidor(); const T = telefono(S); await T.api('GET', '/api/citas'); S.senal = false;
  const n = await T.api('POST', '/api/citas', { cliente: 'Casa nueva', fecha: HOY, precio: 500 });
  const h = await T.api('POST', '/api/citas/estado', { id: n.cita.id, estado: 'hecho' });
  ok('servicio nuevo y «ya se hizo», los dos sin señal', n.bien && h.bien && h.cita.seguimiento.fecha === '2026-11-28' && T.estado().pendientes === 2);
  const tab = await T.api('GET', '/api/tablero');
  ok('el tablero de aquí ya lo cuenta como «por cobrar»', tab.bien && tab.por_cobrar.length === 1 && tab.servicios_hoy.length === 0);
  S.senal = true; await T.enviarCola();
  const citas = (await M.listarCitas(S.A)).citas;
  ok('en el servidor hay UN servicio, hecho y con su seguimiento a 15 días', citas.length === 1 && citas[0].estado === 'hecho' && citas[0].seguimiento?.fecha === '2026-11-28', JSON.stringify(citas));
  ok('su id es el del servidor, no el del teléfono', citas[0].id !== n.cita.id);
  const veh = servidor(); const V = telefono(veh); await V.api('GET', '/api/vehiculos'); veh.senal = false;
  const cam = await V.api('POST', '/api/vehiculos', { nombre: 'Camioneta', km: 1000 });
  await V.api('POST', '/api/vehiculos/revision', { vehiculo: cam.vehiculo.id, tipo: 'aceite', fecha: HOY, km: 1200, proxima_km: 6200 });
  veh.senal = true; await V.enviarCola();
  const vs = (await M.listarVehiculos(veh.A, HOY)).vehiculos;
  ok('otro caso: vehículo nuevo y su revisión de aceite', vs.length === 1 && vs[0].revisiones.length === 1 && vs[0].km === 1200 && V.estado().pendientes === 0, JSON.stringify(vs));
}

console.log('\nNada se pierde callado');
{
  const S = servidor();
  const gel = (await M.guardarInsumo(S.A, { nombre: 'Gel', unidad: 'jeringas' })).insumo; await M.moverInsumo(S.A, { id: gel.id, delta: 3 });
  const c = (await M.guardarCita(S.A, { cliente: 'Casa', fecha: HOY })).cita;
  const caja = cajaDe(); const T = telefono(S, caja); await T.api('GET', '/api/insumos'); await T.api('GET', '/api/citas'); S.senal = false;
  await T.api('POST', '/api/insumos/mover', { id: gel.id, delta: -3, motivo: 'Servicio' });
  await T.api('POST', '/api/citas/estado', { id: c.id, estado: 'hecho' });
  await M.moverInsumo(S.A, { id: gel.id, delta: -2, motivo: 'Otro teléfono' });          /* mientras tanto alguien más sacó 2 */
  S.senal = true; await T.enviarCola();
  const e = T.estado();
  ok('lo que el servidor no aceptó queda en «no entró», con su porqué', e.rechazados.length === 1 && /Salida de 3 jeringas de Gel/.test(e.rechazados[0].que) && /Sólo hay 1/.test(e.rechazados[0].error), JSON.stringify(e.rechazados));
  ok('y lo que seguía en la cola sí entró', e.pendientes === 0 && (await M.listarCitas(S.A)).citas[0].estado === 'hecho');
  ok('la réplica vuelve a la verdad del servidor: 1 jeringa', (await T.api('GET', '/api/insumos')).insumos[0].cantidad === 1);

  S.senal = false;
  await T.api('POST', '/api/insumos/mover', { id: gel.id, delta: -1 }); await T.api('POST', '/api/citas/estado', { id: c.id, estado: 'cerrado' });
  await T.enviarCola();
  ok('sin señal la cola se queda entera y en orden', T.estado().pendientes === 2 && /Salida/.test(T.estado().cola[0]) && /ya se cobró/.test(T.estado().cola[1]), T.estado().cola.join(' | '));
  S.senal = true; S.falla = 503; await T.enviarCola();
  ok('servidor caído (503): tampoco se tira nada ni se marca como rechazado', T.estado().pendientes === 2 && T.estado().rechazados.length === 1);
  S.falla = 401; await T.enviarCola();
  ok('sin permiso (401): igual, se espera', T.estado().pendientes === 2);
  const otro = telefono(S, caja);                                                          /* se cerró la app y se volvió a abrir */
  ok('cerrar y abrir la app conserva la cola', otro.estado().pendientes === 2);
  S.falla = null; await otro.enviarCola();
  ok('y al fin sale: 0 jeringas, servicio cobrado', otro.estado().pendientes === 0 && (await M.listarInsumos(S.A)).insumos[0].cantidad === 0 && (await M.listarCitas(S.A)).citas[0].estado === 'cerrado');
}

console.log('\nCon cambios pendientes, lo de aquí no se pisa');
{
  const S = servidor(); const c = (await M.guardarCita(S.A, { cliente: 'Casa', fecha: HOY, precio: 500 })).cita;
  const T = telefono(S); await T.api('GET', '/api/citas'); S.senal = false;
  await T.api('POST', '/api/citas/estado', { id: c.id, estado: 'hecho' });
  const sin = await T.api('GET', '/api/citas');
  ok('sin señal se ve «hecho» aunque el servidor diga «pendiente»', sin.citas[0].estado === 'hecho' && (await M.listarCitas(S.A)).citas[0].estado === 'pendiente');
  S.senal = true; const con = await T.api('GET', '/api/citas');
  ok('con señal primero se manda lo pendiente y luego se lee: «hecho» en los dos lados', con.citas[0].estado === 'hecho' && (await M.listarCitas(S.A)).citas[0].estado === 'hecho' && S.llamadas.indexOf('POST /api/citas/estado') < S.llamadas.lastIndexOf('GET /api/citas'));
}

console.log('\nLa caja del teléfono');
{
  const S = servidor(); const m = new Map([[LLAVE, '{esto no es json']]);
  const T = telefono(S, cajaDe(m));
  ok('lo guardado ilegible no truena: arranca vacío, lo dice y aparta lo viejo', T.estado().cajaRota === true && m.get(LLAVE + '.roto') === '{esto no es json');
  const llena = { leer: () => null, poner: () => { throw new Error('QuotaExceededError'); } };
  const L = telefono(S, llena); await L.api('GET', '/api/citas');
  ok('sin espacio para guardar: lo dice (sinEspacio) y sigue contestando', L.estado().sinEspacio === true && (await L.api('GET', '/api/citas')).bien);
}

console.log('\nLos datos de muestra');
{
  const S = servidor(); const caja = cajaDe();
  const T = crearRed({ red: S.red, motor: M, caja, hoy: () => HOY, soloLocal: true, llave: 'm', semilla: muestra(HOY) });
  const t = await T.api('GET', '/api/tablero');
  ok('el tablero trae de todo: hoy, atrasado, seguimiento, por cobrar, insumo bajo y vehículo', t.servicios_hoy.length === 2 && t.atrasados.length === 1 && t.seguimientos.length === 1 && t.por_cobrar.length === 1 && t.insumos_bajos.length === 2 && t.vehiculo.length === 2, JSON.stringify({ h: t.servicios_hoy.length, a: t.atrasados.length, s: t.seguimientos.length, c: t.por_cobrar.length, i: t.insumos_bajos.length, v: t.vehiculo.length }));
  await T.api('POST', '/api/citas/estado', { id: 'm1', estado: 'hecho' });
  ok('se puede usar de verdad, y NUNCA toca la red', (await T.api('GET', '/api/tablero')).por_cobrar.length === 2 && S.llamadas.length === 0 && T.estado().pendientes === 0);
  const sinNombreReal = JSON.stringify(muestra(HOY));
  ok('lo que sólo sabe el cliente va como FALTA (registros y placas)', (sinNombreReal.match(/FALTA/g) || []).length === 4);
}

console.log('\nLas dos compuertas de la copia');
{
  ok('motor.js es copia EXACTA de servidor/src/centro.js', readFileSync(aqui('./motor.js'), 'utf8') === readFileSync(aqui('../servidor/src/centro.js'), 'utf8'), 'vuelve a copiarlo: cp urban-pest/servidor/src/centro.js urban-pest/centro/motor.js');
  ok('cada cambio pendiente se describe en cristiano', describir('/api/insumos/mover', { id: 'x', delta: -2 }, { 'insumo:x': { nombre: 'Gel', unidad: 'jeringas' } }) === 'Salida de 2 jeringas de Gel' && describir('/api/citas/estado', { id: 'c', estado: 'cerrado' }, { 'cita:c': { cliente: 'Casa' } }) === 'Servicio de Casa: ya se cobró');
}

/* ── COTIZAR (17 nov): su Excel dentro del centro ───────────────────────────────────────────
   Un Excel de MENTIRAS con la misma forma que el suyo (sus datos no van en el repo: es público).
   Se arma aquí mismo como ZIP sin comprimir, con una fórmula compartida como las que guarda Excel. */
console.log('cotizar');
function zip(archivos) {
  const enc = new TextEncoder(), partes = [], centro = []; let off = 0;
  for (const [nombre, texto] of Object.entries(archivos)) {
    const n = enc.encode(nombre), d = enc.encode(texto), h = new Uint8Array(30 + n.length), v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(8, 0, true); v.setUint32(18, d.length, true); v.setUint32(22, d.length, true); v.setUint16(26, n.length, true); h.set(n, 30);
    const c = new Uint8Array(46 + n.length), w = new DataView(c.buffer);
    w.setUint32(0, 0x02014b50, true); w.setUint16(10, 0, true); w.setUint32(20, d.length, true); w.setUint32(24, d.length, true); w.setUint16(28, n.length, true); w.setUint32(42, off, true); c.set(n, 46);
    partes.push(h, d); centro.push(c); off += h.length + d.length;
  }
  const tc = centro.reduce((s, c) => s + c.length, 0), fin = new Uint8Array(22), f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, centro.length, true); f.setUint16(10, centro.length, true); f.setUint32(12, tc, true); f.setUint32(16, off, true);
  const todo = new Uint8Array(off + tc + 22); let p = 0; for (const x of [...partes, ...centro, fin]) { todo.set(x, p); p += x.length; } return todo;
}
const celda = (r, v, f) => `<c r="${r}"${typeof v === 'string' ? ' t="str"' : ''}>${f ? `<f>${f}</f>` : ''}${v != null ? `<v>${v}</v>` : ''}</c>`;
const fila = (n, cs) => `<row r="${n}">${cs.join('')}</row>`;
const hoja = [
  fila(1, ['A', 'B', 'D', 'E', 'F', 'J', 'P', 'Q', 'R', 'S', 'T', 'U'].map((l, i) => `<c r="${l}1" t="s"><v>${i}</v></c>`)),
  /* dos cotizaciones viejas (otra tarifa) y tres de ahora; la Q de la última es fórmula COMPARTIDA (sin texto) */
  fila(2, [celda('A2', 'Cliente viejo'), celda('B2', 1), celda('Q2', '25', 'B2*25'), celda('R2', 5), celda('S2', '30', 'R2*6'), celda('T2', '1000', '((SUM(P2+Q2+S2))*2)/0.5')]),
  fila(3, [celda('A3', 'Casa de un cliente'), celda('B3', 2), celda('D3', 20), celda('J3', '160', 'D3*F21'), celda('P3', '160', 'SUM(E3:O3)'), `<c r="Q3"><f t="shared" ref="Q3:Q5" si="0">B3*80</f><v>160</v></c>`,
    celda('R3', 10), celda('S3', '70', 'R3*7'), celda('T3', '1403.33', '((((SUM(P3+Q3))*2.5)/0.6)+S3)'), celda('U3', '1', 'T3*0.7')]),
  fila(4, [celda('A4', 'Planta de un cliente'), celda('B4', 3), celda('J4', '40', '5*F22'), `<c r="Q4"><f t="shared" si="0"/><v>240</v></c>`, celda('R4', 30), celda('S4', '210', 'R4*7'), celda('T4', '1', '((((SUM(P4+Q4))*2.5)/0.6)+S4)'), celda('U4', '1', 'T4*0.7')]),
  fila(5, [celda('A5', 'Hotel de un cliente'), celda('B5', 1), celda('J5', '16', '2*F21'), `<c r="Q5"><f t="shared" si="0"/><v>80</v></c>`, celda('R5', 20), celda('S5', '140', 'R5*7'), celda('T5', '1', '((((SUM(P5+Q5))*2.5)/0.6)+S5)'), celda('U5', '1', 'T5*0.7')]),
  fila(20, ['A', 'B', 'C', 'D', 'E', 'F'].map((l, i) => `<c r="${l}20" t="s"><v>${12 + i}</v></c>`)),
  fila(21, [celda('A21', 'Insecticida A'), celda('B21', 800), celda('C21', 1000), celda('D21', 10), celda('E21', 'ml/lt'), celda('F21', '8.00', '(B21*D21)/C21')]),
  fila(22, [celda('A22', 'Cebo B'), celda('B22', 1460), celda('C22', 473), celda('D22', 8), celda('E22', 'gr/bloque'), celda('F22', '24.69', '(B22*D22)/C22')]),
  fila(23, [celda('A23', 'Trampa C'), celda('F23', 5)]),
  fila(24, [celda('A24', 'Sin precio'), celda('C24', 500), celda('D24', 1), celda('F24', '0.00', '(B24*D24)/C24')]),
].join('');
const cad = ['Edificio', 'Mano de Obra', 'Consumo', 'Roedores', 'Cucaracha alemana', 'Insectos rastreros', 'Total Químicos', 'Costo de Mano de Obra', 'Kilómetros', 'Costo gasolina y auto', 'Cotización', 'Costos', 'Producto', 'Costo del producto', 'Contenido del envase', 'Dosis', 'Unidades', 'Costo por unidad de aplicación'];
const XLSX = zip({
  'xl/workbook.xml': '<workbook><sheets><sheet name="Cotización convencional" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/sharedStrings.xml': `<sst>${cad.map(t => `<si><t>${t}</t></si>`).join('')}</sst>`,
  'xl/worksheets/sheet1.xml': `<worksheet><sheetData>${hoja}</sheetData></worksheet>`,
});
{
  const ex = deExcel(await leerXlsx(XLSX), 'CorridaCotizacion.xlsx');
  ok('lee su catálogo: costo por aplicación con TODOS los decimales (no el 24.69 redondeado que guarda el Excel)',
    ex.catalogo.length === 3 && ex.catalogo.find(p => p.nombre === 'Cebo B').por_unidad === 1460 * 8 / 473, JSON.stringify(ex.catalogo));
  ok('un producto sin precio no entra; una trampa con sólo su precio sí', !ex.catalogo.some(p => p.nombre === 'Sin precio') && ex.catalogo.find(p => p.nombre === 'Trampa C').por_unidad === 5);
  ok('su fórmula sale de SUS fórmulas, la de ahora y no la vieja (también de una fórmula compartida)',
    ex.convencional.mano_hora === 80 && ex.convencional.km === 7 && ex.convencional.x === 2.5 && ex.convencional.entre === .6 && ex.convencional.costos === .7 && ex.convencional.traslado_aparte, JSON.stringify(ex.convencional));
  ok('sabe qué producto usa en cada columna de plaga', ex.columnas.find(c => c.nombre === 'Insectos rastreros').producto === ex.catalogo.find(p => p.nombre === 'Insecticida A').id);
  ok('NO se lleva los nombres de sus clientes', !/cliente|Casa de|Planta de|Hotel de/i.test(JSON.stringify(ex)));
  const c = corrida({ horas: 2, km: 10, renglones: [{ producto: ex.catalogo.find(p => p.nombre === 'Insecticida A').id, cantidad: 20 }] }, ex);
  ok('la corrida da lo mismo que una fila de su Excel: (160 + 160) × 2.5 ÷ 0.6 + 70 = 1,403.33', c.cotizacion === 1403.33 && c.precio === 1403.33 && c.costos === 982.33, JSON.stringify(c));
  ok('la unidad se dice como la mide el técnico', unidadDe({ unidad: 'ml/lt' }) === 'L de mezcla' && unidadDe({ unidad: 'gr/bloque' }) === 'bloques' && unidadDe({ unidad: 'gr/m2' }) === 'm²');
  const t = aTarifas(ex, { zonas: { centro: 6 }, ejemplo: false });
  ok('para el bot: su fórmula, su hora, y las zonas que ya había no se pierden', t.formula.tipo === 'excel' && t.tecnico.costo_hora === 80 && t.zonas.centro === 6 && t.plagas.alacran?.material === 'Insecticida A');
  ok('las tarifas de EJEMPLO no se mezclan con las suyas', !('zonas' in aTarifas(ex, { ejemplo: true, zonas: { x: 1 } })));
  let error = ''; try { await leerXlsx(new TextEncoder().encode('esto no es un excel')); } catch (e) { error = e.message; }
  ok('un archivo que no es Excel se dice en cristiano', /no es un Excel/.test(error));
  ok('la muestra trae la misma forma y dice que es muestra', EXCEL_MUESTRA.muestra && corrida({ horas: 1, km: 0, renglones: [] }, EXCEL_MUESTRA).precio === 250);
ok('UNA sola cuenta: centro/cotizar.js es copia EXACTA de servidor/src/corrida.js (el bot)', readFileSync(aqui('./cotizar.js'), 'utf8') === readFileSync(aqui('../servidor/src/corrida.js'), 'utf8'), 'cp urban-pest/centro/cotizar.js urban-pest/servidor/src/corrida.js');
ok('una dosis que es cuenta (=11/10000) se calcula con todos sus decimales', cuenta('11/10000') === 0.0011 && cuenta('=1000/3000') === 1000 / 3000 && cuenta('B3*2') === null);
}

console.log(`\n${bien} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
