#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   ¿A NOMBRE DE QUIÉN? EN LA CAJA · `node tienda/nucleo/pruebas-a-nombre.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Contra la base de demo de verdad (vende una pieza): la caja busca a un
   cliente, lo elige, cobra, y la venta queda en SU ficha como compra de
   mostrador — que es lo que la hace contar para la recompra y el sorteo.
   También: Enter en el buscador no cobra, el alta pide WhatsApp, un número
   que ya existe no duplica, y sin 0013 el alta lo dice claro.
   ANCHO=1280 para computadora (390 por omisión).
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const TIENDA = join(dirname(fileURLToPath(import.meta.url)), '..');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!ruta.startsWith(TIENDA)){ res.writeHead(403).end(); return; }
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(readFileSync(ruta)); }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const CAPTURA = process.env.CAPTURA;
const api = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } });
const b = await chromium.launch();
const ANCHO = Number(process.env.ANCHO || 390);
const ctx = await b.newContext({ viewport: { width: ANCHO, height: ANCHO > 500 ? 800 : 844 }, serviceWorkers: 'block' });
await ctx.routeWebSocket(/^wss:\/\//, () => {});
await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch(e){ await r.abort(); } });
await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
const p = await ctx.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });
p.on('dialog', (d) => d.accept());
const listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 });
await p.goto(BASE + '#/'); await listo();
const clientes = await p.evaluate(async () => { const d = await import('./nucleo/datos.js'); await d.verComo('cajero'); if(!(await d.miCaja())) await d.abrirCaja(500); return d.clientesMostrador(); });
ok('la caja lee los clientes del negocio', clientes.length > 0, clientes.length);
const conNombre = clientes.find((c) => c.nombre && c.nombre.trim().length > 2);
console.log('  cliente de prueba:', conNombre?.nombre, conNombre?.telefono ? '(con tel)' : '(sin tel)');
await p.goto(BASE + '#/v'); await listo(); await p.waitForTimeout(400);
await p.click('.pos-prod:not(.sin)');
await p.click(ANCHO > 900 ? '#pos-ticket [data-cobrar]' : '[data-ver-ticket]');
if(ANCHO <= 900) await p.click('.hoja-ticket [data-cobrar]');
await p.waitForSelector('.hoja-cobro [data-abrir]');
ok('el cobro ofrece «¿A nombre de quién?»', /A nombre de quién/.test(await p.$eval('.hoja-cobro', (e) => e.innerText)));
await p.click('.hoja-cobro [data-abrir]');
await p.waitForSelector('#q-cliente');
await p.waitForFunction(() => !document.querySelector('.hoja-cobro [aria-busy]'));
const palabra = conNombre.nombre.trim().split(/\s+/)[0].slice(0, 4);
await p.fill('#q-cliente', palabra.toLowerCase()); await p.waitForTimeout(150);
const hallados = await p.$$eval('.hoja-cobro [data-elegir]', (l) => l.map((x) => x.innerText.split('\n')[0]));
ok(`buscar «${palabra.toLowerCase()}» encuentra a ${conNombre.nombre}`, hallados.includes(conNombre.nombre), hallados.join(', '));
// Enter con varios resultados no cobra
const abiertaAntes = await p.$('.hoja-cobro [data-confirmar]');
await p.press('#q-cliente', 'Enter'); await p.waitForTimeout(300);
ok('Enter en el buscador de clientes NO cobra', !!(await p.$('.hoja-cobro [data-confirmar]')) && !(await p.$('.venta-hecha')));
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `n-buscar-${ANCHO}.png`) });
await p.click(`.hoja-cobro [data-elegir="${conNombre.id}"]`);
ok('elegido: se ve a nombre de quién va', (await p.$eval('.cliente-elegido', (e) => e.innerText)).includes(conNombre.nombre));
// alta: sin 0013 debe decir qué hacer
await p.click('.hoja-cobro [data-cambiar]'); await p.fill('#q-cliente', 'Zacarías Prueba'); await p.click('.hoja-cobro [data-nuevo]');
ok('el alta se prellena con lo que se escribió', await p.$eval('#alta-nombre', (e) => e.value) === 'Zacarías Prueba');
await p.click('.hoja-cobro [data-guardar-alta]');
ok('sin WhatsApp no deja guardar y lo dice', /Falta su WhatsApp/.test(await p.$eval('[data-falta]', (e) => e.textContent)));
await p.fill('#alta-tel', conNombre.telefono); await p.click('.hoja-cobro [data-guardar-alta]'); await p.waitForTimeout(300);
ok('un WhatsApp que ya existe usa a ese cliente, no lo duplica', (await p.$eval('.hoja-cobro .cobro-cliente', (e) => e.innerText)).includes(conNombre.nombre));
await p.click('.hoja-cobro [data-cambiar]'); await p.fill('#q-cliente', 'Zacarías Prueba'); await p.click('.hoja-cobro [data-nuevo]');
const libre = '44' + String(Date.now()).slice(-8);
await p.fill('#alta-tel', libre); await p.click('.hoja-cobro [data-guardar-alta]'); await p.waitForTimeout(1500);
const tras = await p.$eval('.hoja-cobro .cobro-cliente', (e) => e.innerText);
ok('sin la parte del servidor (0013) lo dice claro, sin error feo', /todavía no está encendido/.test(tras), tras.slice(0, 160));
// el mismo número de alguien que ya existe: se usa ése, no se duplica
await p.click('.hoja-cobro [data-volver]').catch(() => {});
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `n-alta-${ANCHO}.png`) });
await p.fill('#q-cliente', palabra); await p.waitForTimeout(100);
await p.click(`.hoja-cobro [data-elegir="${conNombre.id}"]`);
await p.click('.hoja-cobro [data-recibi]');
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `n-elegido-${ANCHO}.png`) });
await p.click('.hoja-cobro [data-confirmar]');
await p.waitForSelector('.venta-hecha', { timeout: 20000 });
const hecha = await p.$eval('.venta-hecha', (e) => e.innerText);
ok('la venta hecha dice a nombre de quién', hecha.includes(conNombre.nombre), hecha);
const folio = Number((await p.$eval('.hoja-cobro .hoja-cabeza h2', (e) => e.textContent)).replace(/\D/g, ''));
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `n-hecha-${ANCHO}.png`) });
const suyo = await p.evaluate(async ({ id, folio }) => { const d = await import('./nucleo/datos.js'); await d.verComo('admin'); const cs = await d.clientesNegocio(); return cs.find((c) => c.id === id)?.pedidos.find((x) => x.folio === folio) || null; }, { id: conNombre.id, folio });
ok(`el pedido #${folio} quedó en la ficha del cliente, canal mostrador`, suyo?.canal === 'pos', JSON.stringify(suyo)?.slice(0, 120));
// la siguiente venta arranca sin nombre
await p.click('.venta-hecha [data-cerrar-hoja]');
await p.evaluate(() => import('./nucleo/datos.js').then((d) => d.verComo('cajero')));
await p.click('.pos-prod:not(.sin)');
await p.click(ANCHO > 900 ? '#pos-ticket [data-cobrar]' : '[data-ver-ticket]'); if(ANCHO <= 900) await p.click('.hoja-ticket [data-cobrar]');
ok('la siguiente venta arranca sin nombre', !!(await p.waitForSelector('.hoja-cobro [data-abrir]')));
ok('nada se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await p.keyboard.press('Escape');
await p.evaluate(() => { try{ localStorage.removeItem(Object.keys(localStorage).find((k) => k.startsWith('tienda-pos-ticket'))); }catch(e){} });
ok('cero errores de consola', !errores.filter((x) => !/404|PGRST202|alta_cliente/.test(x)).length, errores.join(' | '));
console.log(`\n${bien} pasan · ${mal} fallan\n`);
await b.close(); await api.dispose(); servidor.close();
process.exit(mal ? 1 : 0);
