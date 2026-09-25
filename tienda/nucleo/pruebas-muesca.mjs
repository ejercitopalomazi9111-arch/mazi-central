#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LA MUESCA DEL IPHONE · `node tienda/nucleo/pruebas-muesca.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Carlos, con su iPhone 13 y la app instalada: «la parte donde dice el nombre
   y el botón del menú se cubren por la hora, y hasta arriba lo de productos
   reales también». Chromium no simula la muesca, así que aquí se reescribe el
   CSS con los 47 px que mide la del iPhone 13 en lugar de
   env(safe-area-inset-top), y se mide que nada que se toque o se lea empiece
   arriba de esa raya. Sin el arreglo, las tres cosas quedan en y < 47.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const TIENDA = join(dirname(new URL(import.meta.url).pathname), '..');
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const MUESCA = 47;

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const servidor = createServer((req, res) => {
  const r = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  try{
    let cuerpo = readFileSync(r);
    if(extname(r) === '.css') cuerpo = cuerpo.toString().replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g, MUESCA + 'px');
    res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'application/octet-stream' }).end(cuerpo);
  }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
await ctx.routeWebSocket(/^wss:\/\//, () => {});
await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch{ await r.abort(); } });
await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
const p = await ctx.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message));
const arriba = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if(!e) return null; const r = e.getBoundingClientRect(); return r.width ? Math.round(r.top) : null; }, sel);

try{
  await p.goto(BASE + '#/');
  await p.waitForFunction(() => document.querySelector('#contenido')?.children.length, null, { timeout: 30000 });
  await p.waitForTimeout(600);

  console.log('\n· Hasta arriba de la tienda');
  const menu = await arriba('[data-abrir-menu]');
  ok('el botón del menú queda abajo de la hora', menu != null && menu >= MUESCA, String(menu));
  const franja = await arriba('.franja-muestra');
  ok('la franja de muestra se lee (no queda bajo la muesca)', franja == null || franja >= MUESCA, String(franja));
  const color = await p.evaluate(() => getComputedStyle(document.querySelector('.arriba')).backgroundColor);
  ok('la barra pinta su color detrás de la hora (no se ve el contenido pasar)', !/rgba\(0, 0, 0, 0\)|transparent/.test(color), color);
  if(process.env.CAPTURAS) await p.screenshot({ path: process.env.CAPTURAS + '/muesca-1.png', clip: { x: 0, y: 0, width: 390, height: 300 } });

  console.log('\n· Con la página ya bajada');
  await p.evaluate(() => scrollTo(0, 1200));
  await p.waitForTimeout(300);
  const menu2 = await arriba('[data-abrir-menu]');
  ok('la barra pegada arriba deja el botón del menú abajo de la hora', menu2 != null && menu2 >= MUESCA, String(menu2));

  console.log('\n· El menú lateral');
  await p.evaluate(() => scrollTo(0, 0));
  await p.click('[data-abrir-menu]');
  await p.waitForTimeout(500);
  const marca = await arriba('.lateral .cabeza .marca');
  ok('el nombre del negocio en el menú queda abajo de la hora', marca != null && marca >= MUESCA, String(marca));
  const cerrar = await arriba('.lateral .cabeza button');
  ok('y el botón de cerrar también', cerrar == null || cerrar >= MUESCA, String(cerrar));
  if(process.env.CAPTURAS) await p.screenshot({ path: process.env.CAPTURAS + '/muesca-2.png', clip: { x: 0, y: 0, width: 390, height: 300 } });
  ok('ni un error de consola', !errores.length, errores.join(' | '));
}finally{
  await nav.close(); await api.dispose(); servidor.close();
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
