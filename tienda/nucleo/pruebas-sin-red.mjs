#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SIN RED · `node tienda/nucleo/pruebas-sin-red.mjs`
   ──────────────────────────────────────────────────────────────────────────
   El mostrador tiene que seguir vendiendo si se cae el internet (Bloque 14):
     1. con red, la app se carga una vez y el trabajador de fondo guarda copia;
     2. se corta el internet y se RECARGA: la app abre, con su catálogo;
     3. se vende: la venta queda en la fila con folio provisional «L…»;
     4. vuelve la red: la venta se sube sola y la fila queda vacía.
   Contra la base real, como caja de la tienda de muestra.

   Las peticiones que hace el trabajador de fondo no pasan por ctx.route a
   menos que Playwright lo permita con una variable (experimental, Chromium):
   se pone aquí mismo antes de cargarlo.
   ═════════════════════════════════════════════════════════════════════════ */
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
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

const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'allow' });
let apagado = false;
await ctx.routeWebSocket(/^wss:\/\//, () => {});
await ctx.route(/^https:\/\//, async (r) => { if(apagado) return r.abort('internetdisconnected'); try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch{ await r.abort(); } });
await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
const p = await ctx.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message));
const listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 });
const fila = () => p.evaluate(() => import('./nucleo/datos.js').then((d) => ({ p: d.filaMostrador.pendientes().length, r: d.filaMostrador.rechazadas().length })));

console.log('\n· Con red');
await p.goto(BASE + '#/'); await listo();
await p.evaluate(() => import('./nucleo/datos.js').then(async (d) => { await d.verComo('cajero'); if(!(await d.miCaja())) await d.abrirCaja(500); }));
await p.goto(BASE + '#/v'); await listo(); await p.waitForTimeout(2500);
ok('el trabajador de fondo quedó instalado y controla la página', await p.evaluate(() => !!navigator.serviceWorker.controller));
await p.reload(); await listo(); await p.waitForTimeout(1500);
const copias = await p.evaluate(async () => { const r = {}; for(const k of await caches.keys()) r[k.split('-').pop()] = (await (await caches.open(k)).keys()).length; return r; });
ok('guardó la app y el catálogo', copias.app > 20 && copias.datos > 0, JSON.stringify(copias));
const antes = await fila();

console.log('\n· Sin red');
apagado = true; await ctx.setOffline(true);
await p.reload(); await listo(); await p.waitForTimeout(800);
ok('la app abre en el mostrador', (await p.$eval('h1', (e) => e.textContent).catch(() => '')) === 'Cobrar');
ok('con sus productos', (await p.$$('.pos-prod')).length > 10);
ok('y la franja dice que no hay internet', await p.$eval('.franja-sin-red', (e) => !e.hidden).catch(() => false));
await p.click('.pos-prod:not(.sin) >> nth=0'); await p.click('[data-cobrar]');   // el primero con piezas: la demo se va agotando con las pruebas
await p.waitForSelector('dialog.hoja[open] [data-confirmar]'); await p.click('dialog.hoja[open] [data-confirmar]');
await p.waitForSelector('dialog.hoja[open] .venta-hecha', { timeout: 15000 }).catch(() => {});
const titulo = await p.$eval('dialog.hoja[open] .hoja-cabeza h2', (e) => e.textContent).catch(() => '');
ok('la venta se hace con folio provisional', /^Venta L\d+ · sin red$/.test(titulo), titulo);
ok('y dice que se sube sola', /se sube sola/.test(await p.$eval('dialog.hoja[open]', (e) => e.innerText).catch(() => '')));
const durante = await fila();
ok('queda una más en la fila', durante.p === antes.p + 1, JSON.stringify({ antes, durante }));

console.log('\n· Vuelve la red');
apagado = false; await ctx.setOffline(false);
// waitForFunction con una promesa la toma como «ya» (una promesa es verdadera): se revisa a mano.
for(let i = 0; i < 40 && (await fila()).p > antes.p; i++) await p.waitForTimeout(500);
const despues = await fila();
ok('se subió sola: la fila quedó vacía', despues.p === 0, JSON.stringify(despues));
ok('y el servidor no rechazó nada', despues.r === antes.r, JSON.stringify(despues));
ok('sin errores en la página', !errores.length, errores.join(' | '));

await nav.close(); await api.dispose(); servidor.close();
console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
