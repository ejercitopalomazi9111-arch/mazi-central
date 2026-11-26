/* La compuerta de la hoja de cotización (la que abre EL CLIENTE), con Playwright:
 *   node urban-pest/cotizacion/pruebas-pantalla.mjs
 * Corre contra el servidor de verdad (servidor/src/index.js) sobre un almacén en memoria, con datos DE MUESTRA:
 * no sale a internet. Mide lo que pidió Luis el 23 nov («que la use un señor de 90 años o un niño»):
 * 1 · a 360, 390 y 768 px: nada que se lea abajo de 15 px, botones de 48 px, sin desborde; y con la letra al 200 %
 *     (195 px) nada se sale de lado. «Agendar por WhatsApp» es el botón principal.
 * 2 · la cotización a mano: el renglón que se quita, si ya traía algo escrito, pregunta antes; el nuevo se despliega.
 * 3 · nada aparece de golpe: la silueta de la hoja se vuelve la hoja (View Transition); con «reducir movimiento», no.
 * 4 · al imprimir (el PDF) la hoja queda como estaba: sin botones y con su letra de papel. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if (c) { bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };

const sitio = http.createServer(async (q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(path.join(RAIZ, p)); r.writeHead(200, { 'content-type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end('no'); }
}).listen(0);
const URL_SITIO = `http://127.0.0.1:${sitio.address().port}`;
/* el servidor de Urban Pest tal cual, con un almacén en memoria */
const mod = await import('../servidor/src/index.js');
const mapa = new Map();
const storage = { get: async k => structuredClone(mapa.get(k)), put: async (k, v) => { mapa.set(k, structuredClone(v)); }, delete: async k => mapa.delete(k),
  list: async ({ prefix }) => new Map([...mapa.keys()].filter(k => k.startsWith(prefix)).sort().map(k => [k, structuredClone(mapa.get(k))])) };
const env = { LLAVE_PANEL: 'llave-de-prueba', ORIGENES: URL_SITIO };
const desp = new mod.Despacho({ storage, blockConcurrencyWhile: async f => f() }, env); env.DESPACHO = { idFromName: () => 'x', get: () => desp };
const datos = http.createServer((q, r) => { let c = ''; q.on('data', x => c += x); q.on('end', async () => {
  const res = await mod.default.fetch(new Request('http://d' + q.url, { method: q.method, headers: q.headers, body: q.method === 'POST' ? c : undefined }), env, { waitUntil: () => {} });
  r.writeHead(res.status, Object.fromEntries(res.headers)); r.end(await res.text()); }); }).listen(0);
const URL_DATOS = `http://127.0.0.1:${datos.address().port}`;
const llamar = async (ruta, b) => (await mod.default.fetch(new Request('http://d' + ruta, { method: 'POST', headers: { 'content-type': 'application/json', 'x-llave': 'llave-de-prueba' }, body: JSON.stringify(b) }), env, {})).json();
/* un teléfono de muestra (no es el del cliente) para que salga «Agendar por WhatsApp» */
await llamar('/api/negocio', { negocio: { nombre: 'Urban Pest Control', telefono: '442 000 0000' } });
const mano = (await llamar('/api/cotizaciones', { cliente: 'Cliente de muestra', lugar: 'Bodega', zona: 'Parque industrial', concepto: 'Programa de control de plagas', iva: 'mas',
  renglones: [{ concepto: 'Servicio mensual de control de plagas', cantidad: 12, precio: 3500 }, { concepto: 'Estaciones de cebo', cantidad: 20, precio: 180 }] })).cotizacion.codigo;
const srv = '&servidor=' + encodeURIComponent(URL_DATOS);
const HOJA = `${URL_SITIO}/urban-pest/cotizacion/?c=${mano}${srv}`, NUEVA = `${URL_SITIO}/urban-pest/cotizacion/?nueva${srv}`;

const medir = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility(); };
  const nom = (e) => e.tagName.toLowerCase() + ' «' + (e.textContent || e.placeholder || '').trim().slice(0, 24) + '»';
  return { desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    chicos: [...document.querySelectorAll('button, a[href], input, select, textarea')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.width < 47.5 || r.height < 47.5; }).map(e => nom(e) + ' ' + Math.round(e.getBoundingClientRect().width) + '×' + Math.round(e.getBoundingClientRect().height)),
    letra: [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e) && !e.closest('[aria-hidden="true"], .oculto') && parseFloat(getComputedStyle(e).fontSize) < 15).map(e => nom(e) + ' ' + getComputedStyle(e).fontSize) };
};
const nav = await chromium.launch({ args: ['--no-sandbox'] });
const abrir = async (url, extra = {}) => { const ctx = await nav.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, ...extra });
  await ctx.addInitScript(() => { localStorage.setItem('up_llave', 'llave-de-prueba'); window.__vt = 0; const o = Document.prototype.startViewTransition; if (o) Document.prototype.startViewTransition = function (f) { window.__vt++; return o.call(this, f); }; });
  const pg = await ctx.newPage(); pg.errores = []; pg.on('pageerror', e => pg.errores.push(e.message)); await pg.goto(url); await pg.waitForSelector('.hoja:not(.esqueleto)'); await pg.waitForTimeout(400); return { ctx, pg }; };

console.log('\n1 · Fácil de leer y de tocar');
for (const [ancho, url, que] of [[360, HOJA, 'la hoja'], [390, HOJA, 'la hoja'], [768, HOJA, 'la hoja'], [390, NUEVA, 'la cotización a mano']]) {
  const { ctx, pg } = await abrir(url, { viewport: { width: ancho, height: 800 } }); const m = await pg.evaluate(medir);
  ok(`${que} a ${ancho} px: nada abajo de 15 px, botones de 48 px, sin desborde`, !m.letra.length && !m.chicos.length && m.desborde <= 0, [...m.letra.slice(0, 3), ...m.chicos.slice(0, 3), m.desborde > 0 ? 'desborde ' + m.desborde : ''].filter(Boolean).join(' | '));
  if (ancho === 390 && url === HOJA) {
    const primero = await pg.locator('.acc .btn').first();
    ok('«Agendar por WhatsApp» es lo primero y el botón principal; «Guardar como PDF» va después', /Agendar por WhatsApp/.test(await primero.innerText()) && !(await primero.getAttribute('class')).includes('b2'));
    ok('dice las cosas completas: «Cantidad», «Válida hasta el», sin «Cant.» ni «MXN»', /Válida hasta el/.test(await pg.locator('.folio').innerText()) && !/Cant\.|MXN/.test(await pg.locator('.hoja').innerText()));
  }
  ok(`${que} a ${ancho} px: sin errores de página`, !pg.errores.length, pg.errores.join(' | '));
  await ctx.close();
}
for (const [url, que] of [[HOJA, 'la hoja'], [NUEVA, 'la cotización a mano']]) {
  const { ctx, pg } = await abrir(url, { viewport: { width: 195, height: 600 } });
  ok(`${que} con la letra al 200 % (195 px): nada se sale de lado`, (await pg.evaluate(medir)).desborde <= 0, String((await pg.evaluate(medir)).desborde));
  await ctx.close();
}

console.log('\n2 · La cotización a mano');
{
  const { ctx, pg } = await abrir(NUEVA);
  await pg.click('#mas'); await pg.waitForTimeout(60);
  ok('«Agregar renglón» lo despliega (no aparece de golpe)', await pg.evaluate(() => document.querySelector('#rens').lastElementChild.classList.contains('nueva') && document.querySelector('#rens').lastElementChild.getAnimations().length > 0));
  await pg.locator('.ren').nth(1).locator('[name=concepto]').fill('Algo escrito');
  await pg.locator('.ren').nth(1).locator('[data-quitar]').click(); await pg.waitForTimeout(250);
  ok('quitar un renglón con algo escrito pregunta primero («Sí, quitar»)', await pg.locator('.ren').count() === 2 && /Sí, quitar/.test(await pg.locator('.ren').nth(1).locator('[data-quitar]').innerText()));
  await pg.locator('.ren').nth(1).locator('[data-quitar]').click(); await pg.waitForTimeout(350);
  ok('y al segundo toque sale de lado y se va', await pg.locator('.ren').count() === 1);
  await pg.fill('[name=cliente]', 'Cliente de muestra'); await pg.fill('[name=concepto]', 'Servicio de muestra'); await pg.fill('[name=precio]', '1500');
  await pg.click('[type=submit]'); await pg.waitForSelector('#msj .btn.wa');
  ok('al crearla, ofrece «Mandarla por WhatsApp» y «Ver cómo la ve», con botones grandes', await pg.locator('#msj .btn').count() === 2 && (await pg.locator('#msj .btn.wa').boundingBox()).height >= 48);
  ok('sin errores de página', !pg.errores.length, pg.errores.join(' | '));
  await ctx.close();
}

console.log('\n3 · Nada aparece de golpe');
{
  const { ctx, pg } = await abrir(HOJA);
  ok('la silueta de la hoja se vuelve la hoja con una View Transition', await pg.evaluate(() => window.__vt) >= 1);
  await ctx.close();
  const r = await abrir(HOJA, { reducedMotion: 'reduce' });
  const vt = await r.pg.evaluate(() => window.__vt); await r.pg.click('body'); await r.ctx.close();
  const n = await abrir(NUEVA, { reducedMotion: 'reduce' }); await n.pg.click('#mas'); await n.pg.waitForTimeout(40);
  const anim = await n.pg.evaluate(() => document.querySelector('#rens').lastElementChild.getAnimations().length);
  ok('con «reducir movimiento» no hay transición ni despliegue', vt === 0 && anim === 0, `transiciones ${vt}, animaciones ${anim}`);
  await n.ctx.close();
}

console.log('\n4 · Al imprimir queda como estaba');
{
  const { ctx, pg } = await abrir(HOJA); await pg.emulateMedia({ media: 'print' });
  const p = await pg.evaluate(() => ({ letra: getComputedStyle(document.body).fontSize, botones: [...document.querySelectorAll('.no-imp')].every(e => getComputedStyle(e).display === 'none'), tabla: getComputedStyle(document.querySelector('thead')).display }));
  ok('en papel: letra de 12 px, sin botones y con la tabla de siempre', p.letra === '12px' && p.botones && p.tabla === 'table-header-group', JSON.stringify(p));
  await ctx.close();
}
await nav.close(); sitio.close(); datos.close();
console.log(`\n${bien} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
