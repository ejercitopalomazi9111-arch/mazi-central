/* Pruebas del respaldo del Estante en la cuenta (Carlos, 11 nov: que no se pierda si Safari borra y que se vea
   igual en otro teléfono). Dos teléfonos de verdad (dos navegadores aparte) contra el servidor de la Comunidad
   corriendo en Node con SQLite.  node inkwell/pruebas-respaldo.mjs */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
import { DatabaseSync } from 'node:sqlite';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const { manejar, ESQUEMA } = await import(path.join(RAIZ, '../sala/servidor/comunidad.js'));
const db = new DatabaseSync(':memory:'); db.exec(ESQUEMA);
const q = (sql, ...v) => db.prepare(sql).all(...v);
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let caido = false;
const srv = http.createServer(async (pq, r) => {
  const u = new URL(pq.url, 'http://x');
  if (u.pathname.startsWith('/api/sala/comunidad/')) {
    if (caido) { r.writeHead(503, { 'content-type': 'application/json' }); return r.end('{"bien":false,"error":"caído"}'); }
    const cuerpo = await new Promise((ok) => { let b = ''; pq.on('data', (c) => b += c); pq.on('end', () => ok(b)); });
    const res = await manejar(q, new Request('http://x' + pq.url, { method: pq.method, headers: pq.headers, body: pq.method === 'POST' ? cuerpo : undefined }));
    r.writeHead(res.status, { 'content-type': res.headers.get('content-type') }); r.end(Buffer.from(await res.arrayBuffer())); return;
  }
  if (u.pathname.startsWith('/api/')) { r.writeHead(404, { 'content-type': 'application/json' }); return r.end('{}'); }
  let f = path.join(RAIZ, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const O = `http://localhost:${srv.address().port}`, S = '?servidor=' + encodeURIComponent(O);
let bien = 0, mal = 0; const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const br = await chromium.launch();

/* la cuenta se crea directo en el servidor; cada teléfono entra con su propia sesión */
const pedir = async (accion, datos) => (await manejar(q, new Request('http://x/api/sala/comunidad/' + accion, { method: 'POST', body: JSON.stringify(datos) }))).json();
await pedir('registro', { usuario: 'palomazi', nombre: 'Carlos', clave: 'muybuena123' });
async function telefono(nombre){
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.route(/sala\.palomazi9111/, (r) => r.fulfill({ status: 404, body: '{}' }));
  const pg = await ctx.newPage(); pg.errores = [];
  pg.on('pageerror', (e) => pg.errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/40\d|503/.test(m.text()) && pg.errores.push(m.text()));
  await pg.goto(O + '/index.html' + S + '#biblioteca');
  await pg.waitForFunction(() => window.__biblio);
  pg.nombre = nombre; return pg;
}
const entrar = async (pg) => { const t = (await pedir('entrar', { usuario: 'palomazi', clave: 'muybuena123' })).token; await pg.evaluate((t) => localStorage.setItem('inkwell.cuenta', JSON.stringify({ usuario: 'palomazi', nombre: 'Carlos', token: t })), t); };
const sync = (pg) => pg.evaluate(() => window.__biblio.B.sincronizar());
const biblio = (pg) => pg.evaluate(() => window.__biblio.B.datos());
const hist = (pg) => pg.evaluate(() => window.__biblio.B.historial());

console.log('sin cuenta');
const A = await telefono('A');
await A.evaluate(() => { const B = window.__biblio.B; B.cambiarObra('webtoon:1', { nota: 5, fav: true, etiquetas: ['acción'] }); B.apuntar('webtoon:1', 1); B.apuntar('webtoon:1', 2); });
ok((await sync(A)).sinCuenta, 'sin cuenta no se intenta respaldar');
await A.evaluate(() => window.__biblio.respaldar());
ok(/sólo vive en este teléfono/.test(await A.textContent('#bRespaldo')), 'el Estante dice que sólo vive en este teléfono y ofrece entrar');

console.log('primer respaldo');
await entrar(A);
let r = await sync(A);
ok(r.subio && !r.cambioAqui, 'al entrar, lo de este teléfono sube a la cuenta');
const guardado = JSON.parse(q("SELECT datos FROM respaldos WHERE usuario = 'palomazi'")[0].datos);
ok(guardado.biblio.obras['webtoon:1'].nota === 5 && guardado.historial.length === 2, 'en el servidor quedan la nota y los 2 capítulos');
await A.evaluate(() => window.__biblio.respaldar());
ok(/Respaldado en tu cuenta/.test(await A.textContent('#bRespaldo')), 'el Estante dice «Respaldado en tu cuenta»');

console.log('otro teléfono');
const T = await telefono('B');
await T.evaluate(() => { const B = window.__biblio.B; B.cambiarObra('wattpad:9', { lista: 'pendiente', nota: 3 }); B.apuntar('wattpad:9', 7); B.nuevaColeccion('Para el viaje'); });
await entrar(T);
r = await sync(T);
ok(r.cambioAqui && r.subio, 'el segundo teléfono baja lo del primero y sube lo suyo');
let d = await biblio(T);
ok(d.obras['webtoon:1']?.nota === 5 && d.obras['wattpad:9']?.nota === 3 && d.colecciones.some((c) => c.nombre === 'Para el viaje'), 'en el segundo teléfono están las obras de los dos y su colección');
ok((await hist(T)).length === 3, 'y el historial de los dos, sin repetir (3 capítulos)');
r = await sync(A);
d = await biblio(A);
ok(r.cambioAqui && d.obras['wattpad:9']?.nota === 3 && d.colecciones.length === 1, 'el primero, al volver, recibe lo del segundo');
ok(!(await sync(A)).subio, 'si nada cambió, no se vuelve a subir');

console.log('cambios cruzados');
await A.evaluate(() => window.__biblio.B.cambiarObra('webtoon:1', { nota: 2 }));
await new Promise((ok) => setTimeout(ok, 30));
await T.evaluate(() => window.__biblio.B.cambiarObra('webtoon:1', { nota: 4 }));
await sync(A); await sync(T); await sync(A);
ok((await biblio(A)).obras['webtoon:1'].nota === 4 && (await biblio(T)).obras['webtoon:1'].nota === 4, 'si los dos cambian la misma nota, gana la última (4) en los dos');
await T.evaluate(() => { const B = window.__biblio.B; const c = B.datos().colecciones[0]; B.borrarColeccion(c.id); });
await sync(T); await sync(A);
ok((await biblio(A)).colecciones.length === 0, 'una colección borrada en un teléfono se borra en el otro (no revive)');
await A.evaluate(() => window.__biblio.B.ponerMeta(30));
await sync(A); await sync(T);
ok((await biblio(T)).meta === 30, 'la meta del mes viaja');

console.log('Safari borró todo');
await A.evaluate(() => { localStorage.removeItem('inkwell.biblio'); localStorage.removeItem('inkwell.historial'); });
r = await sync(A);
d = await biblio(A);
ok(r.cambioAqui && d.obras['webtoon:1']?.nota === 4 && (await hist(A)).length === 3, 'con el teléfono vacío, todo regresa de la cuenta');

console.log('solo, después de un cambio');
await A.evaluate(() => window.__biblio.B.cambiarObra('webtoon:5', { fav: true }));
await A.waitForTimeout(3500);
ok(!!JSON.parse(q("SELECT datos FROM respaldos WHERE usuario = 'palomazi'")[0].datos).biblio.obras['webtoon:5'], 'un cambio se sube solo a los segundos, sin tocar nada');

console.log('sin conexión');
caido = true;
await A.evaluate(() => window.__biblio.B.cambiarObra('webtoon:6', { nota: 1 }));
await A.evaluate(() => window.__biblio.respaldar());
ok(/No se pudo respaldar/.test(await A.textContent('#bRespaldo')) && (await biblio(A)).obras['webtoon:6']?.nota === 1, 'si la cuenta no contesta, se avisa y lo de aquí no se pierde');
caido = false;
await A.evaluate(() => window.__biblio.respaldar());
ok(!!JSON.parse(q("SELECT datos FROM respaldos WHERE usuario = 'palomazi'")[0].datos).biblio.obras['webtoon:6'], 'al volver la conexión, sube lo pendiente');
ok(await A.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'el aviso del respaldo no saca la página de lado');

console.log('historial largo');
await A.evaluate(() => { const h = []; for (let i = 0; i < 12000; i++) h.push([1788900000000 + i, 'webtoon:777', i]); localStorage.setItem('inkwell.historial', JSON.stringify(h)); });
r = await sync(A).catch((e) => ({ error: e.message }));
const nube = JSON.parse(q("SELECT datos FROM respaldos WHERE usuario = 'palomazi'")[0].datos);
ok(!r.error && nube.historial.length === 8000, 'con 12,000 capítulos leídos, sube los últimos 8,000 sin pasarse del tope');
ok((await hist(A)).length >= 12000, 'y en el teléfono no se pierde ninguno');

const errores = [...A.errores, ...T.errores];
ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
await br.close(); srv.close();
console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
