/* LA CUENTA DE LA CASA (Carlos, 6 nov): «a la cuenta de grupomazi.oficial@gmail.com dale absolutamente todo,
 * cosméticos, cartas, etc.». Se entra con el correo (el servidor lo traduce al apodo GrupoMazi, que no sale en
 * las tablas). La contraseña NO vive en el repo: se pasa al correrlo.
 *   CLAVE_CASA=… node juegos/guerra-de-puercos/v2/pruebas/cuenta-casa.mjs [servidor]
 * Si la cuenta ya existe, entra y le vuelve a llenar todo. */
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const SRV = (process.argv[2] || 'https://ppuercos.palomazi9111.workers.dev').replace(/\/+$/, '');
const PAG = process.env.PAG || 'http://127.0.0.1:8765/juegos/guerra-de-puercos/v2/';
const pin = process.env.CLAVE_CASA; if(!pin){ console.error('Falta CLAVE_CASA'); process.exit(1); }

/* todo, armado con los módulos del propio juego (así no se desfasa del catálogo) */
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await br.newContext()).newPage();
await pg.goto(PAG + '?servidor=http://127.0.0.1:1', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
const datos = await pg.evaluate(async () => {
  const col = await import('./coleccion.js'), t = await import('./tienda.js'), { LIDERES } = await import('./lideres.js');
  await t.cargarCatalogo();
  const { C } = col, d = JSON.parse(JSON.stringify(C));
  d.cartas = {}; for(const f of t.CAT.puercos) d.cartas[col.llaveDe(f)] = t.MAX_COPIAS;
  d.cosmeticos = {}; for(const k of col.COSMETICOS) d.cosmeticos[k.id] = 1;
  d.lideres = {}; for(const l of LIDERES) d.lideres[l.id] = 1;
  d.lider = d.lider || 'rey';
  d.soporte = { bono: 5, castigo: 5 };
  d.monedas = 999999;
  d.regalo = true; d.bienvenida = true; d.regalo30 = true;
  d.sobres = [t.sortearSobre('lideres'), t.sortearSobre('fino'), t.sortearSobre('bueno')].filter(Boolean);
  d.mazoPropio = false; d.mazo = [];
  return d;
});
await br.close();
console.log('cartas', Object.keys(datos.cartas).length, '· cosméticos', Object.keys(datos.cosmeticos).length, '· líderes', Object.keys(datos.lideres).length);

const post = async (ruta, cuerpo) => { const r = await fetch(SRV + '/api/puercos/' + ruta, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return { status: r.status, j: await r.json().catch(() => ({})) }; };
let r = await post('cuenta/crear', { apodo: 'GrupoMazi', pin, datos });
if(r.status === 409){
  const e = await post('cuenta/entrar', { apodo: 'grupomazi.oficial@gmail.com', pin });
  if(e.status !== 200){ console.error('no pude entrar', e.status, e.j.error); process.exit(1); }
  const rev = e.j.rev ?? e.j.datos?.rev ?? 0;
  r = await post('cuenta/guardar', { token: e.j.token, desde: rev, datos: { ...datos, rev } });
}
console.log('guardar', r.status, r.j.error || 'bien');
const prueba = await post('cuenta/entrar', { apodo: 'grupomazi.oficial@gmail.com', pin });
const dd = prueba.j.datos || {};
console.log('entrar con el correo →', prueba.status, prueba.j.apodo, '· cartas', Object.keys(dd.cartas || {}).length, '· líderes', Object.keys(dd.lideres || {}).length, '· monedas', dd.monedas);
process.exit(prueba.status === 200 && Object.keys(dd.lideres || {}).length === 10 ? 0 : 1);
