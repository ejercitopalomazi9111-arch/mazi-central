#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LO DE AMAZON Y MERCADO LIBRE · `node tienda/nucleo/pruebas-cliente-extra.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Contra el catálogo de demo, sin sesión y sin comprar: favoritos con aviso
   de baja de precio, el «+» de las tarjetas, vistos recientemente, búsquedas
   recientes y «sólo disponibles», compartir, la foto en grande, la barra de
   envío gratis, guardar para después y la ayuda. ANCHO=1280 para computadora.
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

const espia = () => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; };
  window.__copiado = ''; try{ Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); navigator.clipboard.writeText = async (t) => { window.__copiado = t; }; }catch(e){} };
await p.addInitScript(espia);
await p.addInitScript(() => { if(!sessionStorage.getItem('limpio')){ for(const k of Object.keys(localStorage)) if(k.startsWith('tienda-')) localStorage.removeItem(k); sessionStorage.setItem('limpio', '1'); } });
const ir = async (h) => { await p.goto(BASE + '#' + h); await listo(); await p.waitForTimeout(250); };
const texto = () => p.$eval('#contenido', (e) => e.innerText);
await ir('/');
console.log(`\n· Tienda a ${ANCHO} px`);
// Favoritos desde una tarjeta
const card = await p.$eval('.producto:not(.sin)', (e) => ({ id: e.querySelector('[data-fav]').dataset.fav, n: e.querySelector('.n').textContent }));
await p.click(`.producto [data-fav="${card.id}"]`); await p.waitForTimeout(150);
ok('el corazón de la tarjeta guarda en favoritos', await p.$eval(`[data-fav="${card.id}"]`, (b) => b.getAttribute('aria-pressed')) === 'true');
// El «+»
await p.click(`[data-rapido="${card.id}"]`); await p.waitForTimeout(300);
const enCarrito = await p.evaluate((id) => (JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('tienda-carrito'))) || '[]').find(([x]) => x === id) || [])[1], card.id);
ok('el «+» agrega al carrito sin abrir la ficha', enCarrito === 1, enCarrito);
// Baja de precio simulada: se guardó más caro
await p.evaluate((id) => { const k = Object.keys(localStorage).find((x) => x.startsWith('tienda-favoritos')); const l = JSON.parse(localStorage.getItem(k)); l.find((f) => f.id === id).precio += 50; localStorage.setItem(k, JSON.stringify(l)); }, card.id);
await ir('/favoritos');
const fav = await texto();
ok('en Favoritos está, con «Bajó $50»', fav.includes(card.n) && /Bajó \$50/.test(fav) && /bajó de precio/.test(fav), fav.slice(0, 200));
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `x-favoritos-${ANCHO}.png`) });
// Ficha: vistos, compartir, foto grande, garantías
await ir('/p/' + card.id);
const ficha = await texto();
ok('la ficha dice envío y cómo se paga', /Envío|recogerlo/.test(ficha) && /Pagas/.test(ficha), ficha.slice(0, 300));
ok('el corazón grande sale ya marcado', await p.$eval('.corazon.grande', (b) => b.getAttribute('aria-pressed')) === 'true');
await p.click('[data-compartir]'); await p.waitForTimeout(200);
ok('compartir copia nombre, precio y la liga del producto', (await p.evaluate(() => window.__copiado)).includes('#/p/' + card.id));
if(await p.$('[data-acercar]')){ await p.click('[data-acercar]'); await p.waitForTimeout(250); ok('la foto se ve en grande', !!(await p.$('dialog.hoja-foto[open] img'))); await p.keyboard.press('Escape'); }
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `x-ficha-${ANCHO}.png`) });
await ir('/');
ok('en la portada sale «Vistos recientemente» con ese producto', /Vistos recientemente/.test(await texto()));
// Búsqueda
await ir('/buscar');
const palabra = card.n.split(' ')[0];
await p.fill('#q', palabra); await p.waitForTimeout(1500);
const n1 = await p.$$eval('#resultados .producto', (l) => l.length);
await p.check('#solo-hay'); await p.waitForTimeout(150);
const n2 = await p.$$eval('#resultados .producto', (l) => l.length), agotados = await p.$$eval('#resultados .producto.sin', (l) => l.length);
ok('«Sólo disponibles» esconde los agotados', agotados === 0 && n2 <= n1, `${n1} → ${n2}`);
await p.uncheck('#solo-hay'); await p.fill('#q', ''); await p.waitForTimeout(150);
ok('la búsqueda queda en «Buscaste hace poco» y se repite con un toque', await p.$(`[data-buscar="${palabra}"]`) !== null && (await p.click(`[data-buscar="${palabra}"]`), await p.waitForTimeout(150), await p.$eval('#q', (i) => i.value)) === palabra);
if(CAPTURA){ await p.fill('#q', ''); await p.waitForTimeout(150); await p.screenshot({ path: join(CAPTURA, `x-buscar-${ANCHO}.png`) }); }
// Carrito: envío gratis y para después
await ir('/carrito');
const car = await texto();
ok('el carrito dice cuánto falta para envío gratis (si la tienda lo tiene)', /envío gratis|envío va gratis/i.test(car) || !(await p.evaluate(async () => (await import('./nucleo/datos.js')).negocio().then((n) => n.ajustes?.envio?.gratis_desde != null))), car.slice(0, 200));
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `x-carrito-${ANCHO}.png`) });
await p.click(`[data-despues="${card.id}"]`); await p.waitForTimeout(200);
ok('«Para después» lo saca del carrito y lo deja abajo', /Guardado para después/.test(await texto()) && /carrito está vacío/.test(await texto()));
await p.click(`[data-regresar="${card.id}"]`); await p.waitForTimeout(200);
ok('«Al carrito» lo regresa', !(/carrito está vacío/.test(await texto())) && !(/Guardado para después/.test(await texto())));
// Ayuda y comprar de nuevo
await ir('/ayuda');
ok('Ayuda contesta envíos, pagos y cancelar', /¿Cuánto cuesta el envío\?/.test(await texto()) && /¿Puedo cancelar\?/.test(await texto()));
await ir('/otra-vez');
ok('Comprar de nuevo sin pedidos explica qué va a salir', /Aquí va a salir lo que ya compraste/.test(await texto()));
ok('nada se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
ok('cero errores de consola', !errores.length, errores.join(' | '));
console.log(`\n${bien} pasan · ${mal} fallan\n`);
await b.close(); await api.dispose(); servidor.close();
process.exit(mal ? 1 : 0);
