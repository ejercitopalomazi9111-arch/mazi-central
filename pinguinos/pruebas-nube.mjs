// La nube de «Mis pingüinos», probada en un navegador de verdad contra el
// SERVIDOR DE VERDAD (sala/servidor: index.js + pinguinos.js), con un almacén de
// mentiras en lugar del de Cloudflare. Las peticiones a sala.palomazi9111 se
// atrapan con `ctx.route` y las contesta el mismo `fetch` del trabajador, CORS
// incluido: si el permiso de origen faltara, el navegador lo bloquearía igual
// que en el iPhone.
//   python3 -m http.server 8765   (en la raíz del repo)
//   node pinguinos/pruebas-nube.mjs http://localhost:8765
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { manejar } from '../sala/servidor/pinguinos.js';
import trabajador from '../sala/servidor/index.js';
const { chromium } = pw;
const RAIZ = process.argv[2] || 'http://localhost:8765';
const BASE = RAIZ + '/pinguinos/';
let bien = 0, mal = 0;
const ok = (nombre, cond, extra = '') => { cond ? bien++ : mal++; console.log((cond ? '✓ ' : '✗ ') + nombre + (cond || !extra ? '' : ' · ' + extra)); };

/* ── el servidor, con un almacén de mentiras por colección ─────────────────── */
function almacen(){
  const m = new Map();
  return { m,
    async get(k){ return m.get(k); }, async put(k, v){ m.set(k, v); },
    async delete(k){ for(const x of [].concat(k)) m.delete(x); },
    async list({ prefix = '', limit = Infinity } = {}){ const r = new Map();
      for(const [k, v] of [...m].sort()) if(k.startsWith(prefix) && r.size < limit) r.set(k, v); return r; } };
}
const colecciones = new Map();
let modo = 'bien';                 /* 'bien' · 'sin-red' · 'apagada' (503: el objeto no está desplegado) */
const env = () => ({ ORIGENES: RAIZ,
  PINGUINOS: modo === 'apagada' ? undefined : { idFromName: (n) => n,
    get: (id) => ({ fetch: (p) => { if(!colecciones.has(id)) colecciones.set(id, almacen()); return manejar(colecciones.get(id), p); } }) } });
const enNube = (cod) => { const a = colecciones.get(cod); if(!a) return [];
  return [...a.m].filter(([k]) => k.startsWith('p:')).map(([, v]) => v); };
const fotoEnNube = (cod, id) => colecciones.get(cod)?.m.has('f:' + id);

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
async function telefono(){
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/^https:\/\/sala\.palomazi9111\.workers\.dev\//, async (ruta) => {
    if(modo === 'sin-red') return ruta.abort('internetdisconnected');
    const q = ruta.request();
    const r = await trabajador.fetch(new Request(q.url(), { method: q.method(), headers: q.headers(),
      body: ['GET', 'HEAD', 'OPTIONS'].includes(q.method()) ? undefined : q.postDataBuffer() }), env());
    await ruta.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) });
  });
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(e.message));
  p.on('console', (m) => { if(m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text())) p.errores.push(m.text()); });
  await p.goto(BASE);
  return p;
}
async function agregar(p, nombre, color){
  const datos = await p.evaluate((c) => { const k = document.createElement('canvas'); k.width = 800; k.height = 600;
    const g = k.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 800, 600); return k.toDataURL('image/png'); }, color);
  await p.click('#agregar');
  await p.setInputFiles('#fotoIn', { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(datos.split(',')[1], 'base64') });
  await p.waitForFunction(() => !document.querySelector('#fotoImg').hidden);
  await p.fill('#nombre', nombre); await p.click('#guardar');
  await p.waitForFunction(() => !document.querySelector('#hoja').open);
}
const fila = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pin-fila') || '[]').length);
const codigo = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pin-codigo') || '""'));
const nube = (p) => p.$eval('#nube', (e) => e.hidden ? '' : e.textContent);
/* espera a que la fila se vacíe (o a que el letrero diga lo que debe) */
const hasta = (p, f, ms = 6000) => p.waitForFunction(f, null, { timeout: ms }).then(() => true, () => false);

/* ── 1 · un teléfono sube lo que guarda ─────────────────────────────────────── */
const A = await telefono();
await agregar(A, 'Pingu', '#1b3a4b');
await agregar(A, 'Capitán', '#e07a22');
await hasta(A, () => JSON.parse(localStorage.getItem('pin-fila') || '[]').length === 0);
const codA = await codigo(A);
ok('nace un código de 20 letras', /^[A-HJ-NP-Z2-9]{20}$/.test(codA), codA);
ok('los dos pingüinos llegaron a la nube', enNube(codA).length === 2, JSON.stringify(enNube(codA).map((x) => x.nombre)));
ok('con su foto', enNube(codA).every((x) => fotoEnNube(codA, x.id)));
ok('el letrero dice que están respaldados', (await nube(A)).includes('Respaldados'), await nube(A));

/* ── 2 · editar y borrar también se suben ───────────────────────────────────── */
await A.click('.peluche >> nth=0');
const viejo = await A.inputValue('#nombre');
await A.fill('#nombre', viejo + ' II'); await A.click('#guardar');
await A.waitForFunction(() => !document.querySelector('#hoja').open);
await hasta(A, () => JSON.parse(localStorage.getItem('pin-fila') || '[]').length === 0);
ok('cambiar el nombre llega a la nube', enNube(codA).some((x) => x.nombre === viejo + ' II'));
ok('y la foto sigue allá', enNube(codA).every((x) => fotoEnNube(codA, x.id)));
await A.click('.peluche >> nth=0'); await A.click('#borrar'); await A.click('#borrar');
await A.waitForFunction(() => document.querySelector('#total').textContent === '1');
await hasta(A, () => JSON.parse(localStorage.getItem('pin-fila') || '[]').length === 0);
ok('borrar lo quita de la nube, foto incluida', enNube(codA).length === 1 && [...colecciones.get(codA).m.keys()].filter((k) => k.startsWith('f:')).length === 1);

/* ── 3 · sin internet se guarda en la fila y sube al volver ────────────────── */
modo = 'sin-red';
await agregar(A, 'Hielo', '#88b7d5');
await A.waitForTimeout(400);
ok('sin red: se guarda en el teléfono y queda 1 por subir', await A.$eval('#total', (e) => e.textContent) === '2' && await fila(A) === 1);
ok('y la nube todavía no lo tiene', enNube(codA).length === 1);
const letreroSinRed = await nube(A);
ok('el letrero no dice «respaldados» mientras falta uno', !letreroSinRed.includes('Respaldados'), letreroSinRed);
modo = 'bien';
await A.evaluate(() => dispatchEvent(new Event('online')));
ok('al volver la red se sube solo', await hasta(A, () => JSON.parse(localStorage.getItem('pin-fila') || '[]').length === 0) && enNube(codA).length === 2);
ok('sobrevive a cerrar la app con cosas pendientes', await (async () => {
  modo = 'sin-red'; await agregar(A, 'Nieve', '#dddddd'); await A.waitForTimeout(300);
  modo = 'bien'; await A.reload();
  return await hasta(A, () => JSON.parse(localStorage.getItem('pin-fila') || '[]').length === 0) && enNube(codA).length === 3;
})());

/* ── 4 · otro teléfono trae la colección con el código ──────────────────────── */
const B = await telefono();
await agregar(B, 'Tux', '#222222');               /* B ya tenía uno suyo */
await hasta(B, () => JSON.parse(localStorage.getItem('pin-fila') || '[]').length === 0);
await B.click('#abrirMenu');
await B.fill('#codigoTraer', 'NOVALE');
await B.click('#formaTraer button[type="submit"]');
ok('un código mal escrito se explica', (await B.textContent('#notaTraer')).includes('20'));
await B.fill('#codigoTraer', codA.replace(/(.{5})/g, '$1 ').toLowerCase());   /* con espacios y en minúsculas, como lo dicta alguien */
await B.click('#formaTraer button[type="submit"]');
await B.waitForFunction(() => !document.querySelector('#menu').open, null, { timeout: 8000 }).catch(() => {});
ok('llegaron los 3 de la nube más el suyo', await B.$eval('#total', (e) => e.textContent) === '4');
ok('con sus fotos', await B.$$eval('.peluche img', (a) => a.length === 4));
ok('el teléfono B adopta el código de A', await codigo(B) === codA);
ok('y su pingüino propio se sube a la colección compartida',
   await hasta(B, () => JSON.parse(localStorage.getItem('pin-fila') || '[]').length === 0) && enNube(codA).some((x) => x.nombre === 'Tux'));
await B.click('#abrirMenu');
await B.fill('#codigoTraer', codA);
await B.click('#formaTraer button[type="submit"]');
await B.waitForTimeout(800);
ok('traerla otra vez no duplica', await B.$eval('#total', (e) => e.textContent) === '4');

/* ── 5 · con el servidor sin desplegar, lo dice y no pierde nada ───────────── */
modo = 'apagada';
const C = await telefono();
await agregar(C, 'Mambo', '#aa3355');
await C.waitForTimeout(500);
ok('nube apagada: el letrero lo dice', (await nube(C)).includes('todavía no está lista'), await nube(C));
ok('y el pingüino queda guardado y en la fila', await C.$eval('#total', (e) => e.textContent) === '1' && await fila(C) === 1);
modo = 'bien';

for(const [n, p] of [['A', A], ['B', B], ['C', C]]) ok(`ni un error en el teléfono ${n}`, p.errores.length === 0, p.errores.join(' | '));
await navegador.close();
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
