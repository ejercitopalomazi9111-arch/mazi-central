/* La compuerta de la pantalla (skill app-de-campo), con Playwright:
 *   node urban-pest/centro/pruebas-pantalla.mjs
 * 1 · Con datos de muestra camina las cinco pestañas a 320, 390 y 414 px y mide: cero errores de
 *     página, cero desborde horizontal, objetivos táctiles de 44 px y campos de 16 px (computados).
 * 2 · SIN INTERNET DE VERDAD: carga con señal contra un servidor de mentiras, corta la red, recarga
 *     (tiene que abrir), marca un servicio como hecho, y al volver la señal comprueba que llegó. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as M from './motor.js';
import { muestra } from './muestra.js';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if (c) { bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const d = new Date(), HOY = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

/* el sitio, servido tal cual está en el repo */
const sitio = http.createServer(async (q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(path.join(RAIZ, p)); r.writeHead(200, { 'content-type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end('no'); }
}).listen(0);
/* el servidor de datos de mentiras: el mismo motor sobre un Map */
const alm = new Map(Object.entries(muestra(HOY).datos));
const A = { get: async k => structuredClone(alm.get(k)) ?? null, put: async (k, v) => { alm.set(k, structuredClone(v)); }, list: async p => [...alm.keys()].filter(k => k.startsWith(p)).sort().map(k => [k, structuredClone(alm.get(k))]) };
const RUTAS = { 'GET /api/tablero': () => M.tablero(A, HOY), 'GET /api/citas': () => M.listarCitas(A), 'GET /api/insumos': () => M.listarInsumos(A), 'GET /api/vehiculos': () => M.listarVehiculos(A, HOY), 'GET /api/numeros': () => M.numeros(A, HOY),
  'POST /api/citas/estado': b => M.estadoCita(A, b, 'srv', HOY), 'POST /api/insumos/mover': b => M.moverInsumo(A, b, 'srv') };
const datos = http.createServer((q, r) => {
  const cab = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
  if (q.method === 'OPTIONS') { r.writeHead(204, cab); return r.end(); }
  let cuerpo = ''; q.on('data', c => cuerpo += c); q.on('end', async () => {
    const f = RUTAS[q.method + ' ' + new URL(q.url, 'http://x').pathname];
    const j = f ? await f(cuerpo ? JSON.parse(cuerpo) : {}) : { bien: false, error: 'Ruta desconocida.', estado: 404 };
    r.writeHead(j.bien ? 200 : (j.estado || 400), cab); r.end(JSON.stringify(j));
  });
}).listen(0);
const URL_SITIO = `http://127.0.0.1:${sitio.address().port}/urban-pest/centro/`, URL_DATOS = `http://127.0.0.1:${datos.address().port}`;

const medir = () => {
  const visibles = [...document.querySelectorAll('button, a, input, select, textarea, summary')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && e.type !== 'hidden'; });
  const nom = e => (e.tagName.toLowerCase() + ' «' + (e.textContent || e.name || e.placeholder || '').trim().slice(0, 22) + '»');
  return { desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    chicos: [...new Set(visibles.filter(e => { const r = e.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).map(e => nom(e) + ' ' + Math.round(e.getBoundingClientRect().width) + '×' + Math.round(e.getBoundingClientRect().height)))],
    letraChica: [...new Set(visibles.filter(e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => nom(e) + ' ' + getComputedStyle(e).fontSize))] };
};

const nav = await chromium.launch({ args: ['--no-sandbox'] });
console.log('\n1 · Con datos de muestra, las cinco pestañas en tres anchos');
for (const ancho of [320, 390, 414]) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 760 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  await pg.goto(URL_SITIO + '?muestra'); await pg.waitForSelector('.barra-inf:not([hidden])');
  const fallas = [];
  for (const p of ['hoy', 'servicios', 'inventario', 'vehiculo', 'numeros']) {
    await pg.click(`.barra-inf [data-p="${p}"]`); await pg.waitForTimeout(350);
    const m = await pg.evaluate(medir);
    if (m.desborde > 0) fallas.push(`${p}: se desborda ${m.desborde}px`);
    if (m.chicos.length) fallas.push(`${p}: objetivos chicos: ${m.chicos.slice(0, 4).join(', ')}`);
    if (m.letraChica.length) fallas.push(`${p}: campos con letra chica: ${m.letraChica.slice(0, 3).join(', ')}`);
    if (await pg.locator('.vacio button').count()) fallas.push(`${p}: salió la pantalla de error`);
  }
  ok(`${ancho}px: sin desbordes, objetivos de 44 px y campos de 16 px`, !fallas.length, fallas.join(' | '));
  ok(`${ancho}px: sin errores de página`, !errores.length, errores.slice(0, 2).join(' | '));
  if (ancho === 390) {
    ok('la franja dice que son datos de muestra', /Datos de muestra/.test(await pg.locator('#red').innerText()));
    await pg.click('.barra-inf [data-p="hoy"]'); await pg.waitForTimeout(300);
    const antes = await pg.locator('[data-est="hecho"]').count();
    await pg.locator('[data-est="hecho"]').first().click(); await pg.waitForTimeout(600);
    ok('en la muestra «Ya se hizo» sí hace algo', await pg.locator('[data-est="hecho"]').count() === antes - 1);
    await pg.screenshot({ path: process.env.CAPTURA || '/tmp/centro-muestra.png' });
  }
  await ctx.close();
}

console.log('\n2 · Sin internet de verdad');
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', e => errores.push(e.message));
  const U = URL_SITIO + '?servidor=' + encodeURIComponent(URL_DATOS);
  await pg.goto(U); await pg.waitForSelector('.barra-inf:not([hidden])');
  await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(1500);       /* el cascarón y la réplica se guardan */
  await pg.reload(); await pg.waitForSelector('[data-est="hecho"]'); await pg.waitForTimeout(1200);
  ok('con señal no hay franja', await pg.locator('#red').isHidden());

  await ctx.setOffline(true);
  await pg.reload().catch(() => {}); 
  const abrio = await pg.waitForSelector('[data-est="hecho"]', { timeout: 8000 }).then(() => true, () => false);
  ok('sin señal la página ABRE y enseña los servicios guardados', abrio, await pg.locator('body').innerText().then(t => t.slice(0, 120)).catch(() => 'no cargó'));
  ok('y lo dice: «Sin internet. Ves lo guardado…»', /Sin internet\. Ves lo guardado/.test(await pg.locator('#red').innerText().catch(() => '')));
  const cliente = await pg.locator('li.item:has([data-est="hecho"]) b').first().innerText();
  await pg.locator('[data-est="hecho"]').first().click(); await pg.waitForTimeout(900);
  const franja = await pg.locator('#red').innerText();
  ok('marcar «Ya se hizo» sin señal: queda como 1 cambio por enviar', /1 cambio por enviar/.test(franja) && franja.includes(cliente), franja.replace(/\s+/g, ' ').slice(0, 160));
  const idCita = [...alm.values()].find(c => c.cliente === cliente)?.id;
  ok('el servidor todavía no sabe nada', alm.get('cita:' + idCita).estado === 'pendiente');
  await pg.click('.barra-inf [data-p="servicios"]'); await pg.waitForTimeout(500);
  ok('la pestaña Servicios también abre sin señal', await pg.locator('li.item').count() > 0 && !(await pg.locator('.vacio button').count()));

  await ctx.setOffline(false); await pg.waitForTimeout(2500);
  ok('al volver la señal el cambio llega solo al servidor, con su seguimiento', alm.get('cita:' + idCita).estado === 'hecho' && !!alm.get('cita:' + idCita).seguimiento, JSON.stringify(alm.get('cita:' + idCita)).slice(0, 140));
  ok('y la franja se quita', await pg.locator('#red').isHidden(), await pg.locator('#red').innerText().catch(() => ''));
  ok('sin errores de página en todo el recorrido', !errores.length, errores.slice(0, 2).join(' | '));
  await ctx.close();
}
await nav.close(); sitio.close(); datos.close();
console.log(`\n${bien} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
