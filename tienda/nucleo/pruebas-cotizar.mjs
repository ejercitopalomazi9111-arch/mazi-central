#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   COTIZAR EN PANTALLA · `node tienda/nucleo/pruebas-cotizar.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Contra el catálogo de demo (sólo LEE: no vende). Arma una cotización,
   la manda por WhatsApp al número del cliente, la imprime, sale y vuelve,
   y la pasa a Cobrar: el ticket del mostrador trae sus productos y el cobro
   ya sabe a nombre de quién va. Y si un precio cambió desde que se cotizó,
   lo dice antes de cobrar. ANCHO=1280 para computadora.
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
const errores = []; p.on('pageerror', (e) => errores.push(e.message + (process.env.PILA ? ' @ ' + String(e.stack).split('\n').slice(0,5).join(' < ') : ''))); p.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });
p.on('dialog', (d) => d.accept());
const listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 });
await p.goto(BASE + '#/'); await listo();
await p.addInitScript(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; }; window.print = () => { window.__impreso = true; }; });
await p.evaluate(async () => { const d = await import('./nucleo/datos.js'); await d.verComo('cajero'); for(const k of Object.keys(localStorage)) if(/cotizaci|pos-ticket/.test(k)) localStorage.removeItem(k); });
const clientes = await p.evaluate(async () => (await import('./nucleo/datos.js')).clientesMostrador());
const cliente = clientes.find((c) => c.nombre?.trim().length > 2 && c.telefono);
const prods = (await p.evaluate(async () => (await import('./nucleo/datos.js')).catalogo().then((c) => c.productos.filter((x) => x.q >= 3).slice(0, 2).map((x) => ({ id: x.id, n: x.n, p: x.p })))));
await p.reload(); await p.goto(BASE + '#/v/cotizar'); await listo(); await p.waitForTimeout(300);

console.log(`\n· Cotizar a ${ANCHO} px`);
ok('sin cotizaciones, lo dice y enseña para qué sirve', /Todavía no hay cotizaciones/.test(await p.$eval('#contenido', (e) => e.innerText)));
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `k-vacia-${ANCHO}.png`) });
await p.click('[data-nueva]');
const buscar = async (pr) => { await p.fill('#cot-q', pr.n.split(' ').slice(0, 3).join(' ')); await p.waitForTimeout(120); await p.click(`[data-agregar="${pr.id}"]`); await p.waitForTimeout(120); };
await buscar(prods[0]); await buscar(prods[1]);
await p.click(`[data-mas="${prods[0].id}"]`); await p.waitForTimeout(80);
const total = Math.round((prods[0].p * 2 + prods[1].p) * 100);
const txt = await p.$eval('.cot-hoja', (e) => e.innerText);
ok('se agregan dos productos, uno ×2, y el total cuadra', txt.includes(prods[0].n) && txt.includes(prods[1].n) && /3 piezas/.test(txt), txt.slice(0, 200));
const totalPant = await p.$eval('.cot-hoja .pos-total strong', (e) => Math.round(Number(e.textContent.replace(/[^\d.]/g, '')) * 100));
ok('el total en pantalla es el de la cuenta', totalPant === total, `${totalPant} vs ${total}`);
await p.click('.cot-hoja [data-abrir]'); await p.waitForSelector('#q-cliente');
await p.waitForFunction(() => !document.querySelector('.cot-hoja [aria-busy]'));
await p.fill('#q-cliente', cliente.telefono.slice(-4)); await p.waitForTimeout(100);
await p.click(`.cot-hoja [data-elegir="${cliente.id}"]`);
ok('el cliente queda en la cotización', (await p.$eval('.cliente-elegido', (e) => e.innerText)).includes(cliente.nombre));
await p.fill('#cot-notas', 'Envío sin costo en tu zona.');
await p.selectOption('#cot-dias', '15');
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `k-editor-${ANCHO}.png`), fullPage: true });
await p.click('[data-whatsapp]'); await p.waitForTimeout(300);
const url = (await p.evaluate(() => window.__abiertas))[0] || '';
const texto = decodeURIComponent(url.split('text=')[1] || '');
ok('WhatsApp se abre al número del cliente', url.startsWith('https://wa.me/52' + cliente.telefono.replace(/\D/g, '').slice(-10)), url.slice(0, 40));
ok('el mensaje lleva folio C1, el cliente, los productos y el total', /^\*Cotización C1\*/.test(texto) && texto.includes(cliente.nombre) && texto.includes(prods[1].n) && /\*Total: \$/.test(texto), texto.slice(0, 160));
ok('y la nota y la vigencia de 15 días', texto.includes('Envío sin costo') && /válidos hasta el/.test(texto));
ok('el título ya dice su folio', /Cotización C1/.test(await p.$eval('.cot-hoja h2', (e) => e.textContent)));
await p.click('[data-imprimir]'); await p.waitForTimeout(1500);
ok('se manda a imprimir (la ventana de imprimir del navegador) sin tronar', await p.evaluate(() => window.__impreso === true) && !errores.length, errores.join(' | '));
ok('el ticket de la cotización se dibujó', !!(await p.$('.ticket-papel img')));
await p.keyboard.press('Escape').catch(() => {});
// Sale a la lista y vuelve
await p.click('[data-cerrar-cot]'); await p.waitForTimeout(150);
const lista = await p.$eval('#contenido', (e) => e.innerText);
ok('en la lista: C1, el cliente, vigente', /C1 · /.test(lista) && lista.includes(cliente.nombre) && /Vigente/.test(lista), lista.slice(0, 200));
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `k-lista-${ANCHO}.png`) });
// Sobrevive a recargar a mitad de una cotización
await p.click('[data-abrir]'); await p.reload(); await listo(); await p.waitForTimeout(300);
ok('recargar a media cotización no la pierde', (await p.$eval('#contenido', (e) => e.innerText)).includes(prods[1].n));
// Un precio cambió desde que se cotizó: se simula bajándolo en lo guardado
await p.evaluate((id) => { for(const k of Object.keys(localStorage)) if(/cotizaci/.test(k)){ const v = JSON.parse(localStorage.getItem(k)); const cs = v?.cots || [v]; for(const c of cs) for(const r of c?.renglones || []) if(r.id === id) r.precio = 1; localStorage.setItem(k, JSON.stringify(v)); } }, prods[0].id);
await p.reload(); await listo(); await p.waitForTimeout(300);
await p.click('[data-cobrar]');
await p.waitForSelector('.hoja-cambios', { timeout: 5000 }).catch(() => {});
const aviso = await p.$eval('.hoja-cambios', (e) => e.innerText).catch(() => '');
ok('antes de cobrar dice que cambió el precio, con el de antes y el de hoy', aviso.includes(prods[0].n) && /cambió de precio: \$1 → /.test(aviso), aviso.slice(0, 200));
if(CAPTURA){ await p.waitForTimeout(600); await p.screenshot({ path: join(CAPTURA, `k-cambios-${ANCHO}.png`) }); }
await p.click('.hoja-cambios [data-seguir]');
await p.waitForFunction(() => location.hash === '#/v', null, { timeout: 5000 }).catch(() => {});
await listo(); await p.waitForTimeout(500);
const pos = await p.$eval('#contenido', (e) => e.innerText);
ok('Cobrar abre con los productos de la cotización en el ticket', pos.includes(prods[0].n) && pos.includes(prods[1].n), pos.slice(0, 200));
const ticket = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('tienda-pos-ticket'))) || '[]'));
ok('el ticket trae 2 y 1 piezas', JSON.stringify(ticket.map((r) => r.cantidad)) === '[2,1]', JSON.stringify(ticket));
await p.click(ANCHO > 900 ? '#pos-ticket [data-cobrar]' : '[data-ver-ticket]'); if(ANCHO <= 900) await p.click('.hoja-ticket [data-cobrar]');
await p.waitForSelector('.hoja-cobro');
ok('y el cobro ya sabe a nombre de quién va', ((await p.$eval('.hoja-cobro .cobro-cliente', (e) => e.innerText)) || '').includes(cliente.nombre));
const totalCobro = await p.$eval('.hoja-cobro .cobro-total strong', (e) => Math.round(Number(e.textContent.replace(/[^\d.]/g, '')) * 100));
ok('el cobro es con el precio de HOY, no con el de la cotización', totalCobro === total, `${totalCobro} vs ${total}`);
await p.keyboard.press('Escape');
await p.goto(BASE + '#/v/cotizar'); await listo(); await p.waitForTimeout(200);
ok('en la lista queda marcada: pasó a cobro', /Pasó a cobro/.test(await p.$eval('#contenido', (e) => e.innerText)));
ok('nada se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await p.evaluate(() => { for(const k of Object.keys(localStorage)) if(/cotizaci|pos-ticket/.test(k)) localStorage.removeItem(k); });
ok('cero errores de consola', !errores.length, errores.join(' | '));
console.log(`\n${bien} pasan · ${mal} fallan\n`);
await b.close(); await api.dispose(); servidor.close();
process.exit(mal ? 1 : 0);
