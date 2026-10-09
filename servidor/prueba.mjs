#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   Las pruebas del servidor.
   Las cuatro pantallas traen las suyas y corren solas al cargar; el servidor
   no puede hacer eso, así que las suyas van aquí y se corren a mano:

       cd servidor
       npx wrangler dev --port 8791 --local     (en una terminal)
       node prueba.mjs                          (en otra)

   Prueban el CONTRATO, que es donde se pierden los pedidos: quién pone el
   turno, qué pasa con un aparato sin red, y que dos que piden al mismo tiempo
   no choquen.
   ═════════════════════════════════════════════════════════════════════════ */
const API = process.env.API || 'http://127.0.0.1:8791';
const CASA = 'prueba-' + Date.now();
let bien = 0, mal = 0;
const ok = (q, c) => { if(c) bien++; else { mal++; console.error('✗ ' + q); } };

/* Desde el 9 de octubre el servidor no le cree a cualquiera: estas pruebas
   del contrato van como el MOSTRADOR (con su llave). Lo que puede y no puede
   un teléfono de alumno lo prueba ataques.mjs. */
let LLAVE = '';
const cabezas = () => ({ 'content-type': 'application/json', 'x-fadori-aparato': 'a'.repeat(32), 'x-fadori-admin': LLAVE });
const sync = async (desde, cambios) => {
  const r = await fetch(API + '/api/sync?casa=' + CASA, {
    method: 'POST', headers: cabezas(),
    body: JSON.stringify({ desde, cambios }),
  });
  if(!r.ok) throw new Error('el servidor contestó ' + r.status);
  return r.json();
};
const todoDe = async (casa) => (await fetch(API + '/api/todo?casa=' + (casa || CASA), { headers: cabezas() })).json();
const pedidoDe = (res, id) => (res.cambios.pedidos || []).find(p => p.id === id);

/* ── está vivo ─────────────────────────────────────────────────────────── */
const salud = await (await fetch(API + '/api/salud')).json();
ok('el servidor contesta que está vivo', salud.bien === true && salud.quien === 'fadori');
LLAVE = (await (await fetch(API + '/api/entrar?casa=' + CASA, { method: 'POST', headers: cabezas(), body: JSON.stringify({ pasador: '1234' }) })).json()).token || '';
ok('el mostrador entra con su pasador', /^[a-f0-9]{64}$/.test(LLAVE));

/* ── el turno lo pone el servidor ──────────────────────────────────────── */
const ahora = Date.now();
const r1 = await sync(0, { pedidos: [
  { id:'a1', t:ahora, creado:ahora, turno:null, nombre:'Ana', estado:'en_cola' },
]});
const a1 = pedidoDe(r1, 'a1');
ok('un pedido que llega sin turno sale con turno', a1 && a1.turno === 1);
ok('y el servidor le adelanta la hora al ponérselo, para que le llegue de '+
   'regreso al teléfono que lo mandó', a1 && a1.t > ahora);

/* ── dos aparatos al mismo tiempo ──────────────────────────────────────── */
const [r2, r3] = await Promise.all([
  sync(r1.reloj, { pedidos: [{ id:'b1', t:ahora+1, creado:ahora, turno:null, nombre:'Beto' }]}),
  sync(r1.reloj, { pedidos: [{ id:'c1', t:ahora+1, creado:ahora, turno:null, nombre:'Caro' }]}),
]);
const todo = await todoDe();
const turnos = todo.cambios.pedidos.map(p => p.turno).sort((x,y) => x-y);
ok('dos aparatos pidiendo a la vez NUNCA reciben el mismo turno',
   new Set(turnos).size === turnos.length);
ok('y los turnos van seguidos, sin huecos', JSON.stringify(turnos) === '[1,2,3]');

/* ── el aparato sin red que reedita su pedido ──────────────────────────── */
const r4 = await sync(0, { pedidos: [
  { id:'a1', t:ahora+9999, creado:ahora, turno:null, nombre:'Ana', nota:'sin chile' },
]});
const a1b = pedidoDe(r4, 'a1');
ok('un pedido reeditado sin red CONSERVA su turno, no le dan otro',
   a1b && a1b.turno === 1);
ok('y su edición sí entra', a1b && a1b.nota === 'sin chile');
const todo2 = await todoDe();
ok('el contador de turnos no avanzó de más',
   Math.max(...todo2.cambios.pedidos.map(p => p.turno)) === 3);

/* ── último en escribir gana, por registro ─────────────────────────────── */
await sync(0, { productos: [{ id:'p1', t:1000, nombre:'Pozole', precio:5000 }] });
await sync(0, { productos: [{ id:'p1', t:500,  nombre:'VIEJO',  precio:1 }] });
const todo3 = await todoDe();
const p1 = todo3.cambios.productos.find(p => p.id === 'p1');
ok('lo más viejo no pisa lo más nuevo', p1 && p1.nombre === 'Pozole');
await sync(0, { productos: [{ id:'p1', t:2000, nombre:'NUEVO', precio:9 }] });
const todo4 = await todoDe();
ok('pero lo más nuevo sí pisa lo viejo',
   todo4.cambios.productos.find(p => p.id === 'p1').nombre === 'NUEVO');

/* ── sólo sale lo que cambió desde tu reloj ────────────────────────────── */
const reloj = todo4.reloj;
const r5 = await sync(reloj, {});
ok('pedir desde tu reloj no te devuelve lo que ya tenías',
   (r5.cambios.pedidos || []).length === 0 && (r5.cambios.productos || []).length === 0);

/* ── cada escuela por su lado ──────────────────────────────────────────── */
const otra = await todoDe('otra-escuela-' + Date.now());
ok('una escuela NUNCA ve los pedidos de otra: la llave de una no abre la otra',
   !otra.cambios && /mostrador/i.test(otra.error || ''));

/* ── la puerta ─────────────────────────────────────────────────────────── */
const permiso = async (origen) => {
  const r = await fetch(API + '/api/salud', { headers:{ Origin: origen }});
  return r.headers.get('access-control-allow-origin');
};

ok('un origen que no está en la lista NO recibe permiso de CORS',
   !await permiso('https://ratero.example'));

/* las vistas previas del propio proyecto sí, para poder probar antes de
   publicar; las de cualquier otro, no */
ok('una vista previa del propio proyecto SÍ pasa',
   await permiso('https://d2ace14a-mazi-central.palomazi9111.workers.dev') ===
   'https://d2ace14a-mazi-central.palomazi9111.workers.dev');
ok('y la de una rama también',
   !!await permiso('https://claude-mi-rama-mazi-central.palomazi9111.workers.dev'));
ok('pero un nombre que sólo TERMINA parecido no pasa',
   !await permiso('https://ratero-mazi-central.palomazi9111.workers.dev.malo.example'));
ok('ni el mismo nombre por http en vez de https',
   !await permiso('http://d2ace14a-mazi-central.palomazi9111.workers.dev'));
ok('ni la vista previa de OTRA cuenta de Cloudflare',
   !await permiso('https://algo-mazi-central.otracuenta.workers.dev'));

console.log((mal ? '✗' : '✓') + ' servidor · ' + bien + '/' + (bien + mal) + ' pruebas');
process.exit(mal ? 1 : 0);
