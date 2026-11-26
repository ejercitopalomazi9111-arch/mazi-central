/* La compuerta de la pantalla (skill app-de-campo), con Playwright:
 *   node urban-pest/centro/pruebas-pantalla.mjs
 * 1 · Con datos de muestra camina las seis pestañas a 320, 390 y 414 px y mide: cero errores de
 *     página, cero desborde horizontal, objetivos táctiles de 48 px, campos de 16 px y ningún texto
 *     abajo de 15 px (la barra de abajo, 12 px con su ícono). Un señor de 90 años y un niño (Luis, 23 nov).
 * 2 · SIN INTERNET DE VERDAD: carga con señal contra un servidor de mentiras, corta la red, recarga
 *     (tiene que abrir), marca un servicio como hecho, y al volver la señal comprueba que llegó.
 * 3 · COTIZAR · LA DISTANCIA: «Calcular» llena los km de la zona y «La camioneta sale de» se guarda. El servidor de
 *     mentiras usa el mismo distancia.js del bot con un mapa de mentiras: no sale a internet. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as M from './motor.js';
import { muestra, EXCEL_MUESTRA } from './muestra.js';
import { ponerSalida, distanciaA, kmRecta, lugarConocido, OSM } from '../servidor/src/distancia.js';
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
/* el mapa de mentiras: OSRM da la línea recta × 1.25; Nominatim no conoce nada (lo de la tabla no lo necesita) */
OSM.pausa_ms = 0;
const mapa = async (url) => { const u = new URL(url);
  if (u.hostname === 'router.project-osrm.org') { const [[a, b], [c, e]] = u.pathname.split('/').pop().split(';').map(x => x.split(',').map(Number)); return new Response(JSON.stringify({ code: 'Ok', routes: [{ distance: kmRecta({ lat: b, lon: a }, { lat: e, lon: c }) * 1250, duration: 900 }] })); }
  return new Response('[]'); };
const RUTAS = { 'GET /api/tablero': () => M.tablero(A, HOY), 'GET /api/citas': () => M.listarCitas(A), 'GET /api/insumos': () => M.listarInsumos(A), 'GET /api/vehiculos': () => M.listarVehiculos(A, HOY), 'GET /api/numeros': () => M.numeros(A, HOY),
  'POST /api/citas/estado': b => M.estadoCita(A, b, 'srv', HOY), 'POST /api/insumos/mover': b => M.moverInsumo(A, b, 'srv'),
  'GET /api/tarifas': () => ({ bien: true, tarifas: { excel: EXCEL_MUESTRA } }), 'GET /api/salida': async () => ({ bien: true, salida: (await A.get('salida')) || null }),
  'POST /api/salida': b => ponerSalida(A, b, mapa), 'GET /api/distancia': (b, q) => distanciaA(A, q.donde, mapa) };
const datos = http.createServer((q, r) => {
  const cab = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
  if (q.method === 'OPTIONS') { r.writeHead(204, cab); return r.end(); }
  let cuerpo = ''; q.on('data', c => cuerpo += c); q.on('end', async () => {
    const u = new URL(q.url, 'http://x'), f = RUTAS[q.method + ' ' + u.pathname];
    const j = f ? await f(cuerpo ? JSON.parse(cuerpo) : {}, Object.fromEntries(u.searchParams)) : { bien: false, error: 'Ruta desconocida.', estado: 404 };
    r.writeHead(j.bien ? 200 : (j.estado || 400), cab); r.end(JSON.stringify(j));
  });
}).listen(0);
const URL_SITIO = `http://127.0.0.1:${sitio.address().port}/urban-pest/centro/`, URL_DATOS = `http://127.0.0.1:${datos.address().port}`;

const medir = () => {
  const visibles = [...document.querySelectorAll('button, a, input, select, textarea, summary')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && e.type !== 'hidden'; });
  const nom = e => (e.tagName.toLowerCase() + ' «' + (e.textContent || e.name || e.placeholder || '').trim().slice(0, 22) + '»');
  return { desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    chicos: [...new Set(visibles.filter(e => { const r = e.getBoundingClientRect(); return r.height < 47.5 || r.width < 47.5; }).map(e => nom(e) + ' ' + Math.round(e.getBoundingClientRect().width) + '×' + Math.round(e.getBoundingClientRect().height)))],
    letraChica: [...new Set(visibles.filter(e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => nom(e) + ' ' + getComputedStyle(e).fontSize))],
    /* lo que se lee: todo elemento con texto propio, visible y fuera de lo que sólo es para el lector de pantalla */
    textoChico: [...new Set([...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.checkVisibility() && !e.closest('[aria-hidden="true"], .up-solo-lector, .up-apertura') && e.getBoundingClientRect().width > 0
      && parseFloat(getComputedStyle(e).fontSize) < (e.closest('.barra-inf') ? 12 : 15)).map(e => nom(e) + ' ' + getComputedStyle(e).fontSize))] };
};

const nav = await chromium.launch({ args: ['--no-sandbox'] });
console.log('\n1 · Con datos de muestra, las seis pestañas en tres anchos');
for (const ancho of [320, 390, 414]) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 760 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  await pg.goto(URL_SITIO + '?muestra'); await pg.waitForSelector('.barra-inf:not([hidden])');
  const fallas = [];
  for (const p of ['hoy', 'servicios', 'inventario', 'vehiculo', 'cotizar', 'numeros']) {
    await pg.click(`.barra-inf [data-p="${p}"]`); await pg.waitForTimeout(350);
    const m = await pg.evaluate(medir);
    if (m.desborde > 0) fallas.push(`${p}: se desborda ${m.desborde}px`);
    if (m.chicos.length) fallas.push(`${p}: objetivos chicos: ${m.chicos.slice(0, 4).join(', ')}`);
    if (m.letraChica.length) fallas.push(`${p}: campos con letra chica: ${m.letraChica.slice(0, 3).join(', ')}`);
    if (m.textoChico.length) fallas.push(`${p}: texto abajo de 15 px: ${m.textoChico.slice(0, 3).join(', ')}`);
    if (await pg.locator('.vacio button').count()) fallas.push(`${p}: salió la pantalla de error`);
  }
  ok(`${ancho}px: sin desbordes, objetivos de 48 px, campos de 16 px y nada que se lea abajo de 15 px`, !fallas.length, fallas.join(' | '));
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
console.log('\n3 · Cotizar: la distancia');
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', deviceScaleFactor: 2 });
  const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', e => errores.push(e.message));
  await pg.goto(URL_SITIO + '?servidor=' + encodeURIComponent(URL_DATOS)); await pg.waitForSelector('.barra-inf:not([hidden])');
  await pg.click('.barra-inf [data-p="cotizar"]'); await pg.waitForSelector('#calcKm');
  ok('sin bodega guardada lo dice: «Falta tu bodega»', /Falta tu bodega/.test(await pg.locator('#msjSalida').innerText()));
  const kmAntes = await pg.inputValue('[name=km]');
  await pg.fill('[name=zona]', 'por juriquilla'); await pg.click('#calcKm'); await pg.waitForFunction(() => /Juriquilla/.test(document.getElementById('msjKm').textContent));
  const sinSalida = await pg.locator('#msjKm').innerText();
  ok('«Calcular» sin bodega: dice la zona y el rumbo, pide la bodega y no toca los km', /Juriquilla · norte/.test(sinSalida) && /sale la camioneta/.test(sinSalida) && await pg.inputValue('[name=km]') === kmAntes, sinSalida);
  await pg.fill('#salida', '20.5930, -100.3916'); await pg.click('#guardaSalida'); await pg.waitForFunction(() => /Guardada|No /.test(document.getElementById('msjSalida').textContent));
  ok('«Guardar» la bodega: se guarda en el servidor y dice lo que entendió', /Guardada\. Entendí/.test(await pg.locator('#msjSalida').innerText()) && alm.get('salida')?.lat === 20.593, await pg.locator('#msjSalida').innerText());
  await pg.click('#calcKm'); await pg.waitForFunction(() => /km por carretera/.test(document.getElementById('msjKm').textContent));
  const km = Math.round(kmRecta({ lat: 20.593, lon: -100.3916 }, lugarConocido('juriquilla')) * 1.25 * 10) / 10;
  const dicho = await pg.locator('#msjKm').innerText(), total = await pg.locator('#total').innerText();
  ok('«Calcular» con bodega: llena los km de ida por carretera y lo dice («Juriquilla · norte · X km por carretera»)', await pg.inputValue('[name=km]') === String(km) && dicho === `Juriquilla · norte · ${km} km por carretera`, dicho);
  ok('…y la cotización se recalcula con esos km', total.includes(`Camioneta · ${km} km`), total.slice(0, 200));
  await pg.locator('#calcKm').scrollIntoViewIfNeeded(); await pg.evaluate(() => window.scrollBy(0, -170));
  if (process.env.CAPTURA_COTIZAR) await pg.screenshot({ path: process.env.CAPTURA_COTIZAR });
  ok('sin errores de página en Cotizar', !errores.length, errores.slice(0, 2).join(' | '));
  await ctx.close();
}
console.log('\n4 · Fácil de usar y nada aparece de golpe');
{
  /* cuenta las View Transitions que pide la página; con `sinVT` el navegador «no las sabe hacer» (Safari 17) */
  const contexto = async (extra = {}, sinVT = false) => { const ctx = await nav.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', ...extra });
    await ctx.addInitScript((sinVT) => { sessionStorage.setItem('up-visto', '1'); window.__vt = 0;
      if (sinVT) delete Document.prototype.startViewTransition;
      else { const o = Document.prototype.startViewTransition; Document.prototype.startViewTransition = function (f) { window.__vt++; return o.call(this, f); }; } }, sinVT);
    const pg = await ctx.newPage(); pg.errores = []; pg.on('pageerror', e => pg.errores.push(e.message));
    await pg.goto(URL_SITIO + '?muestra'); await pg.waitForSelector('.barra-inf:not([hidden])'); await pg.waitForSelector('[data-est="hecho"]'); await pg.waitForTimeout(400); return { ctx, pg }; };
  /* lo que anima el código a mano (FLIP, el nivel del insumo): las animaciones que no son de CSS */
  const aMano = (pg) => pg.evaluate(() => document.getAnimations().filter(a => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)).length);
  {
    const { ctx, pg } = await contexto();
    const pendientes = await pg.locator('[data-est="cancelado"]').count();
    await pg.locator('[data-est="cancelado"]').first().click(); await pg.waitForTimeout(400);
    ok('«Cancelar servicio» no cancela de un toque: pregunta y el botón se vuelve «Sí, cancelarlo» junto a «No, déjalo así»',
      await pg.locator('[data-est="cancelado"]').count() === pendientes && /Sí, cancelarlo/.test(await pg.locator('[data-seguro]').innerText()) && await pg.locator('[data-no]').isVisible() && /¿Seguro que quieres cancelar/.test(await pg.locator('.up-pregunta').innerText()));
    await pg.locator('[data-no]').click(); await pg.waitForTimeout(400);
    ok('«No» lo deja como estaba', !(await pg.locator('.up-pregunta').count()) && !(await pg.locator('[data-seguro]').count()) && await pg.locator('li.item:has([data-est="cancelado"]) [data-est="hecho"]').first().isVisible());
    await pg.locator('[data-est="cancelado"]').first().click(); await pg.waitForTimeout(400); await pg.locator('[data-seguro]').click(); await pg.waitForTimeout(700);
    ok('y «Sí, cancelarlo» sí cancela', await pg.locator('[data-est="cancelado"]').count() === pendientes - 1);
    const vt0 = await pg.evaluate(() => window.__vt);
    await pg.click('.barra-inf [data-p="inventario"]'); await pg.waitForTimeout(500);
    await pg.locator('form.mov [name=delta]').first().fill('2'); await pg.locator('form.mov button[value="-1"]').first().click(); await pg.waitForTimeout(120);
    const nivel = await aMano(pg); await pg.waitForTimeout(600);
    ok('cambiar de pestaña y sacar un insumo se transforman (View Transition) y el nivel baja desde donde estaba', await pg.evaluate(() => window.__vt) >= vt0 + 2 && nivel >= 1, `transiciones ${await pg.evaluate(() => window.__vt) - vt0}, animaciones a mano ${nivel}`);
    ok('sin errores de página al transformar', !pg.errores.length, pg.errores.slice(0, 2).join(' | '));
    await ctx.close();
  }
  {
    const { ctx, pg } = await contexto({}, true);
    await pg.locator('#lHoy [data-est="hecho"]').first().click(); await pg.waitForTimeout(260);
    const n = await aMano(pg); await pg.waitForTimeout(500);
    ok('sin View Transitions (Safari 17): las tarjetas viajan con FLIP a mano', n >= 1 && !pg.errores.length, `animaciones ${n} ${pg.errores.join(' | ')}`);
    await ctx.close();
  }
  {
    const { ctx, pg } = await contexto({ reducedMotion: 'reduce' });
    await pg.locator('#lHoy [data-est="hecho"]').first().click(); await pg.waitForTimeout(150);
    const n1 = await aMano(pg); await pg.click('.barra-inf [data-p="inventario"]'); await pg.waitForTimeout(400);
    await pg.locator('form.mov [name=delta]').first().fill('1'); await pg.locator('form.mov button[value="-1"]').first().click(); await pg.waitForTimeout(150);
    const n2 = await aMano(pg), vt = await pg.evaluate(() => window.__vt);
    ok('con «reducir movimiento» no corre ninguna transición nueva: ni View Transitions ni FLIP ni el nivel', vt === 0 && n1 === 0 && n2 === 0, `transiciones ${vt}, animaciones ${n1}/${n2}`);
    await ctx.close();
  }
  {
    /* la letra del teléfono al 200 %: un teléfono de 390 se vuelve de 195 */
    const { ctx, pg } = await contexto({ viewport: { width: 195, height: 420 } });
    const fallas = [];
    for (const p of ['hoy', 'servicios', 'inventario', 'vehiculo', 'cotizar', 'numeros']) {
      await pg.click(`.barra-inf [data-p="${p}"]`); await pg.waitForTimeout(500);
      const m = await pg.evaluate(() => { const b = document.querySelector('.barra-inf [aria-current="page"]').getBoundingClientRect(), r = document.querySelector('.barra-inf').getBoundingClientRect();
        return { desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth, aLaVista: b.left >= r.left - 1 && b.right <= r.right + 1 }; });
      if (m.desborde > 0) fallas.push(`${p}: se desborda ${m.desborde}px`); if (!m.aLaVista) fallas.push(`${p}: su pestaña quedó fuera de la barra`);
    }
    ok('con la letra al 200 % nada se sale de lado y la pestaña en la que estás queda a la vista', !fallas.length, fallas.join(' | '));
    await ctx.close();
  }
}
await nav.close(); sitio.close(); datos.close();
console.log(`\n${bien} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
