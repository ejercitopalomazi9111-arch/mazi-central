#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LOS ATAQUES. Lo que haría un alumno con ganas de molestar.
   ──────────────────────────────────────────────────────────────────────────
   Cada ataque tiene que salir BLOQUEADO, y el uso normal —80 alumnos pidiendo
   dos veces cada uno desde el mismo wifi de la escuela— tiene que salir BIEN.
   Las dos cosas en la misma corrida: un candado que también le cierra la
   puerta al alumno honesto no sirve.

       cd servidor
       npx wrangler dev --port 8791 --local      (en una terminal)
       node ataques.mjs                          (en otra)

   Pidió Carlos (9 de octubre): «prepara el servidor y la app para ataques de
   pendejos que quieran hacer muchos pedidos a la vez o ataques sencillos».
   Antes de esto, una sola llamada sin contraseña devolvía el pasador del
   mostrador y los códigos de todos los alumnos.
   ═════════════════════════════════════════════════════════════════════════ */
import crypto from 'crypto';
const API = process.env.API || 'http://127.0.0.1:8791';
const CASA = 'ataque-' + Date.now();
let bien = 0, mal = 0;
const ok = (q, c, extra) => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (extra ? ' · ' + extra : '')); } };
const aparato = () => crypto.randomBytes(16).toString('hex');
const ahora = Date.now;
const cod = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');

async function llamar(ruta, cuerpo, { ap, admin, metodo, crudo } = {}){
  const h = { 'content-type': 'application/json' };
  if(ap) h['x-fadori-aparato'] = ap;
  if(admin) h['x-fadori-admin'] = admin;
  const r = await fetch(`${API}${ruta}${ruta.includes('?') ? '&' : '?'}casa=${CASA}`, {
    method: metodo || (cuerpo === undefined ? 'GET' : 'POST'), headers: h,
    body: crudo !== undefined ? crudo : cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  let j = null; try{ j = await r.json(); }catch(e){}
  return { status: r.status, j };
}
const sync = (ap, cambios, extra = {}) => llamar('/api/sync', { desde: extra.desde || 0, cambios }, { ap, admin: extra.admin });
const rechazo = (res, id) => (res.j?.rechazados || []).find(x => x.id === id);
const pedidoEn = (res, id) => (res.j?.cambios?.pedidos || []).find(p => p.id === id);

/* ── preparar: la cooperativa entra y sube su menú ─────────────────────── */
console.log('\nPreparar · la cooperativa entra con su pasador y sube el menú');
const mostrador = aparato();
let r = await llamar('/api/entrar', { pasador: '1234' }, { ap: mostrador });
ok('el mostrador entra con el pasador de fábrica y recibe su llave', r.status === 200 && typeof r.j?.token === 'string', JSON.stringify(r));
const ADMIN = r.j?.token;
const T = ahora();
const menu = [
  { id: 'pb-torta', nombre: 'Torta', precio: 3500, disponible: true, t: T },
  { id: 'pb-agua', nombre: 'Agua', precio: 1500, disponible: true, t: T },
  { id: 'pb-pizza', nombre: 'Pizza', precio: 4000, disponible: false, t: T },
];
r = await sync(mostrador, { productos: menu, config: { recreoInicia: '10:00', recreoMinutos: 30, topeporAlumno: 3, pasador: '9999', t: T } }, { admin: ADMIN });
ok('el mostrador sube el menú', r.status === 200 && !(r.j?.rechazados || []).length, JSON.stringify(r.j?.rechazados));

/* ── un alumno honesto ─────────────────────────────────────────────────── */
const ana = aparato(), ANA = cod();
r = await sync(ana, { alumnos: [{ id: ANA, codigo: ANA, nombre: 'Ana', grupo: '3B', terminos: T, t: T }] });
ok('un alumno se registra', r.status === 200 && (r.j.cambios.alumnos || []).some(a => a.codigo === ANA));
const pAna = { id: 'o' + aparato().slice(0, 12), folio: 'AB12', alumno: ANA, renglones: [{ prod: 'pb-torta', cant: 1 }], total: 3500, creado: ahora(), estado: 'en_cola', turno: null, t: ahora() };
r = await sync(ana, { pedidos: [pAna] });
ok('y pide: le llega con turno', pedidoEn(r, pAna.id)?.turno === 1, JSON.stringify(r.j?.rechazados));

console.log('\n1 · Fuga de datos');
const fisgon = aparato();
r = await llamar('/api/todo', undefined, { ap: fisgon });
ok('/api/todo sin llave del mostrador: NO', r.status === 401 || r.status === 403, 'status ' + r.status);
r = await sync(fisgon, {});
const texto = JSON.stringify(r.j);
ok('un aparato cualquiera NO ve el pasador', !/9999|1234|pasador/.test(texto));
ok('ni el nombre de Ana', !texto.includes('"Ana"'));
ok('ni su código', !texto.includes(ANA));
ok('pero sí ve la fila (turnos) y el menú', (r.j.cambios.pedidos || []).some(p => p.turno === 1) && (r.j.cambios.productos || []).length === 3);
r = await sync(mostrador, {}, { admin: ADMIN });
ok('el mostrador sí ve el nombre (lo necesita para despachar)', JSON.stringify(r.j).includes('"Ana"'));
ok('y tampoco a él le viaja el pasador', !/9999|"pasador"/.test(JSON.stringify(r.j)));

console.log('\n2 · Tocar lo que es de la cooperativa');
r = await sync(fisgon, { productos: [{ ...menu[0], precio: 0, t: ahora() + 10 ** 9 }] });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('un alumno NO puede poner la torta en $0', r.j.cambios.productos.find(p => p.id === 'pb-torta').precio === 3500);
r = await sync(fisgon, { config: { topeporAlumno: 99, recreoInicia: '06:00', t: ahora() + 10 ** 9 } });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('ni cambiar los ajustes', r.j.cambios.config?.topeporAlumno === 3);
r = await sync(fisgon, { conteos: [{ id: 'c-falso', t: ahora(), n: 999 }] });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('ni meter conteos falsos', !(r.j.cambios.conteos || []).some(c => c.id === 'c-falso'));

console.log('\n3 · Meterse con el pedido de otro');
r = await sync(fisgon, { pedidos: [{ ...pAna, estado: 'cancelado', t: ahora() + 10 ** 9 }] });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('otro aparato NO puede cancelarle el pedido a Ana', pedidoEn(r, pAna.id).estado === 'en_cola');
r = await sync(fisgon, { alumnos: [{ id: ANA, codigo: ANA, nombre: 'Ana la fea', grupo: '3B', deuda: -99999, t: ahora() + 10 ** 9 }] });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('ni cambiarle el nombre ni la deuda', (r.j.cambios.alumnos || []).find(a => a.codigo === ANA)?.nombre === 'Ana');

console.log('\n4 · Hacer trampa con su propio pedido');
r = await sync(ana, { pedidos: [{ ...pAna, estado: 'entregado', pagado: 3500, t: ahora() }] });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('Ana NO puede marcar su pedido como entregado y pagado', pedidoEn(r, pAna.id).estado === 'en_cola' && pedidoEn(r, pAna.id).pagado === 0);
r = await sync(ana, { pedidos: [{ ...pAna, turno: -5, renglones: [{ prod: 'pb-torta', cant: 10 }, { prod: 'pb-agua', cant: 10 }], t: ahora() + 5 }] });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('ni cambiarse el turno', pedidoEn(r, pAna.id).turno === 1);
ok('ni agregarle cosas después de pedido', pedidoEn(r, pAna.id).renglones.length === 1 && pedidoEn(r, pAna.id).renglones[0].cant === 1);
const bea = aparato(), BEA = cod();
await sync(bea, { alumnos: [{ id: BEA, codigo: BEA, nombre: 'Bea', grupo: '3B', terminos: T, t: T }] });
const pBea = { id: 'o' + aparato().slice(0, 12), folio: 'CD34', alumno: BEA, renglones: [{ prod: 'pb-torta', cant: 2 }], total: 1, pagado: 7000, estado: 'listo', creado: 0, anticipado: true, turno: 0, despachador: 'yo', t: ahora() };
r = await sync(bea, { pedidos: [pBea] });
const pb = pedidoEn(r, pBea.id);
ok('el total lo calcula el servidor (2 tortas = $70, no $0.01)', pb?.total === 7000, JSON.stringify(pb));
ok('nace sin pagar, en la fila y sin despachador', pb?.pagado === 0 && pb?.estado === 'en_cola' && !pb?.despachador);
ok('no se puede colar con una hora de las 7 am', pb && pb.creado > ahora() - 15 * 60 * 1000);
ok('y su turno lo pone el servidor', pb?.turno === 2);
r = await sync(bea, { pedidos: [{ id: 'o' + aparato().slice(0, 12), folio: 'EF56', alumno: BEA, renglones: [{ prod: 'pb-pizza', cant: 1 }], creado: ahora(), estado: 'en_cola', t: ahora() }] });
ok('no se puede pedir lo que está agotado', (r.j.rechazados || []).length === 1);
r = await sync(bea, { pedidos: [{ id: 'o' + aparato().slice(0, 12), folio: 'EF57', alumno: BEA, renglones: [{ prod: 'no-existe', cant: 1 }], creado: ahora(), estado: 'en_cola', t: ahora() }] });
ok('ni algo que no existe', (r.j.rechazados || []).length === 1);
r = await sync(bea, { pedidos: [{ id: 'o' + aparato().slice(0, 12), folio: 'EF58', alumno: ANA, renglones: [{ prod: 'pb-agua', cant: 1 }], creado: ahora(), estado: 'en_cola', t: ahora() }] });
ok('ni pedir a nombre de otro alumno', (r.j.rechazados || []).length === 1);

console.log('\n5 · Inundar');
const troll = aparato(), TROLL = cod();
await sync(troll, { alumnos: [{ id: TROLL, codigo: TROLL, nombre: 'Troll', grupo: '1A', terminos: T, t: T }] });
const muchos = Array.from({ length: 50 }, (_, i) => ({ id: 'o' + aparato().slice(0, 12), folio: 'ZZ' + String(i).padStart(2, '0').slice(-2), alumno: TROLL, renglones: [{ prod: 'pb-agua', cant: 1 }], creado: ahora(), estado: 'en_cola', t: ahora() }));
r = await sync(troll, { pedidos: muchos });
const entraron = muchos.filter(p => !rechazo(r, p.id)).length;
ok(`50 pedidos de un jalón: entran sólo los del tope (${entraron})`, entraron === 3);
const alumnosFalsos = Array.from({ length: 40 }, (_, i) => { const c = cod(); return { id: c, codigo: c, nombre: 'Falso ' + i, grupo: '1A', terminos: T, t: T }; });
r = await sync(troll, { alumnos: alumnosFalsos });
const creados = alumnosFalsos.filter(a => !rechazo(r, a.id)).length;
ok(`40 alumnos falsos desde un teléfono: entran pocos (${creados})`, creados <= 5);
r = await llamar('/api/sync', { desde: 0, cambios: { eventos: Array.from({ length: 5000 }, (_, i) => ({ id: 'e' + i, t: ahora(), tipo: 'pedido', basura: 'x'.repeat(200) })) } }, { ap: troll });
ok('un cuerpo de 1 MB de basura se rechaza', r.status === 413, 'status ' + r.status);
r = await llamar('/api/sync', undefined, { ap: troll, metodo: 'POST', crudo: '{"desde":0,"cambios":{"pedidos":[{"id":' });
ok('JSON roto: se contesta con error y no tumba nada', r.status === 400);
r = await sync(troll, { alumnos: [{ id: cod(), codigo: 'ZZZZ', nombre: 'N'.repeat(5000), grupo: 'G'.repeat(500), t: T }] });
ok('un nombre de 5,000 letras no entra tal cual', !JSON.stringify(r.j).includes('N'.repeat(100)));
r = await llamar('/api/salud');
ok('el servidor sigue vivo', r.status === 200);

console.log('\n6 · Robar identidad con el código');
const ladron = aparato();
let bloqueado = false, adivino = false;
for(let i = 0; i < 40; i++){
  const x = await llamar('/api/codigo', { codigo: cod() }, { ap: ladron });
  if(x.status === 429){ bloqueado = true; break; }
  if(x.status === 200) adivino = true;
}
ok('adivinar códigos a lo loco: se le cierra la puerta pronto', bloqueado && !adivino);
const otroTel = aparato();
r = await llamar('/api/codigo', { codigo: ANA }, { ap: otroTel });
ok('Ana sí entra con su código desde otro teléfono', r.status === 200 && r.j?.alumno?.nombre === 'Ana');
r = await sync(otroTel, { pedidos: [{ ...pAna, estado: 'cancelado', t: ahora() + 1000 }] });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('y desde ahí puede cancelar su pedido', pedidoEn(r, pAna.id).estado === 'cancelado');

console.log('\n7 · Uso normal en el recreo: 80 alumnos, mismo wifi, 2 pedidos cada uno');
const alumnos = Array.from({ length: 80 }, () => ({ ap: aparato(), c: cod() }));
await Promise.all(alumnos.map(a => sync(a.ap, { alumnos: [{ id: a.c, codigo: a.c, nombre: 'Alumno ' + a.c, grupo: '2A', terminos: T, t: T }] })));
const t0 = ahora();
const res = await Promise.all(alumnos.flatMap(a => [0, 1].map(k => sync(a.ap, { pedidos: [{ id: 'o' + aparato().slice(0, 12), folio: 'Q' + k + a.c.slice(0, 2), alumno: a.c, renglones: [{ prod: k ? 'pb-agua' : 'pb-torta', cant: 1 }], creado: ahora(), estado: 'en_cola', t: ahora() }] }))));
const seg = (ahora() - t0) / 1000;
const rech = res.filter(x => x.status !== 200 || (x.j.rechazados || []).length);
ok(`160 pedidos casi a la vez: entran todos (${160 - rech.length}/160 en ${seg.toFixed(1)} s)`, !rech.length, JSON.stringify(rech[0]?.j || rech[0]?.status));
r = await sync(mostrador, {}, { admin: ADMIN });
const turnos = (r.j.cambios.pedidos || []).map(p => p.turno).filter(Boolean);
ok('sin turnos repetidos', new Set(turnos).size === turnos.length, `${turnos.length} turnos`);

console.log('\n8 · El pasador');
r = await llamar('/api/pasador', { nuevo: '482913' }, { ap: fisgon });
ok('un alumno NO puede cambiar el pasador', r.status === 401 || r.status === 403);
r = await llamar('/api/pasador', { nuevo: '482913' }, { ap: mostrador, admin: ADMIN });
ok('el mostrador sí', r.status === 200);
r = await llamar('/api/entrar', { pasador: '1234' }, { ap: fisgon });
ok('con el pasador viejo ya no se entra', r.status === 401);
bloqueado = false; let entro = false;
for(let i = 0; i < 40; i++){
  const x = await llamar('/api/entrar', { pasador: String(100000 + i) }, { ap: aparato() });
  if(x.status === 429){ bloqueado = true; break; }
  if(x.status === 200) entro = true;
}
ok('adivinar el pasador a lo loco: se bloquea pronto', bloqueado && !entro);
r = await sync(fisgon, { productos: [{ ...menu[1], precio: 1, t: ahora() + 10 ** 9 }] }, { admin: 'llave-inventada-' + 'a'.repeat(40) });
r = await sync(mostrador, {}, { admin: ADMIN });
ok('una llave de mostrador inventada no sirve', r.j.cambios.productos.find(p => p.id === 'pb-agua').precio === 1500);

console.log(`\n${mal ? '✗' : '✓'} ataques · ${bien}/${bien + mal}`);
process.exit(mal ? 1 : 0);
