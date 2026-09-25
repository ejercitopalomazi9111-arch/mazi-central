#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LA LISTA DE TICKETS · `node tienda/nucleo/pruebas-ventas-lista.mjs`
   ──────────────────────────────────────────────────────────────────────────
   «Ventas de hoy» enseñaba TODOS los tickets de corrido: con 133 la página
   medía 60 pantallas de teléfono. Ahora van de 20 en 20 y se buscan por folio
   o por producto. Las ventas se inventan interceptando la consulta (45
   tickets fijos), para que la prueba no dependa de cuánto se vendió hoy en la
   base de muestra; todo lo demás va a la base real.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const TIENDA = join(dirname(new URL(import.meta.url).pathname), '..');
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' };
const servidor = createServer((req, res) => {
  const r = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'application/octet-stream' }).end(readFileSync(r)); }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const nav = await chromium.launch();

const ahora = Date.now();
const VENTAS = Array.from({ length: 45 }, (_, k) => ({
  id: `00000000-0000-4000-8000-${String(k).padStart(12, '0')}`, folio: 1045 - k, canal: 'pos', estado: 'entregado',
  total: 100, forma_pago: 'efectivo', pagado: true, creado: new Date(ahora - (k < 30 ? k * 60000 : 3 * 3600000 + k * 1000)).toISOString(),
  renglones: [{ producto_id: null, nombre: k === 30 ? 'Navaja Dorada de Prueba' : 'Gel fijador', precio: 100, cantidad: 1, importe: 100 }], cobros: [],
}));

const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await ctx.routeWebSocket(/^wss:\/\//, () => {});
await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch{ await r.abort(); } });
// Registrada después, gana: la consulta de ventasDesde() (la única que pide pedidos con cobros).
await ctx.route((u) => /\/rest\/v1\/pedidos\?/.test(u.href) && /cobros/.test(decodeURIComponent(u.search)) && /creado=gte/.test(u.search),
  (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(VENTAS) }));
await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
const p = await ctx.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message));

try{
  await p.goto(BASE + '#/');
  await p.waitForFunction(() => document.querySelector('#contenido')?.children.length, null, { timeout: 30000 });
  await p.evaluate(async () => (await import('/nucleo/datos.js')).verComo('cajero'));
  await p.goto(BASE + '#/v/ventas');
  await p.waitForSelector('#tickets .lista', { timeout: 30000 });
  const filas = () => p.locator('#tickets [data-ticket]').count();

  console.log('\n· De 20 en 20');
  ok('enseña 20 de 45, no todos', (await filas()) === 20, String(await filas()));
  ok('el botón dice cuántos faltan', /Ver 20 más · quedan 25/.test(await p.locator('[data-mas-tickets]').textContent()));
  await p.click('[data-mas-tickets]');
  ok('«Ver más» agrega 20', (await filas()) === 40);
  await p.click('[data-mas-tickets]');
  ok('al final enseña los 45 y el botón se va', (await filas()) === 45 && !(await p.locator('[data-mas-tickets]').count()));

  console.log('\n· La gráfica por hora');
  // 30 tickets en la última media hora y 15 hace tres horas: dos horas con
  // venta y una el doble de la otra. Las barras tienen que medir distinto.
  const barras = await p.evaluate(() => [...document.querySelectorAll('.grafica-horas li')].map((li) => ({ alto: li.style.getPropertyValue('--alto'), px: li.querySelector('.barra').getBoundingClientRect().height })));
  const tope = Math.max(...barras.map((b) => b.px)), llenas = barras.filter((b) => b.px > tope * 0.9).length;
  ok('las barras miden según lo vendido, no todas al tope', llenas <= 2 && barras.some((b) => b.px < 10), JSON.stringify(barras.map((b) => `${b.alto}=${Math.round(b.px)}`)));
  const b100 = barras.find((b) => b.alto === '100%'), b0 = barras.find((b) => b.alto === '0%');
  ok('la de 100 % es la más alta y una de 0 % casi no se ve', b100 && b100.px === tope && (!b0 || b0.px <= 4));

  console.log('\n· Buscar');
  await p.locator('#q-ticket').pressSequentially('1030');
  ok('por folio: sale sólo ese', (await filas()) === 1 && /#1030/.test(await p.locator('#tickets [data-ticket]').first().textContent()));
  ok('escribir no le quita el foco al buscador', await p.evaluate(() => document.activeElement?.id === 'q-ticket'));
  await p.fill('#q-ticket', '#1015');
  ok('con «#» adelante también', (await filas()) === 1 && /#1015/.test(await p.locator('#tickets [data-ticket]').first().textContent()));
  await p.fill('#q-ticket', 'navaja dorada');
  ok('por producto y sin mayúsculas', (await filas()) === 1 && /#1015/.test(await p.locator('#tickets [data-ticket]').first().textContent()));
  await p.fill('#q-ticket', 'zzzz');
  ok('si no hay, lo dice', (await filas()) === 0 && /Ningún ticket de hoy tiene «zzzz»/.test(await p.locator('[data-sin-tickets]').textContent()));
  await p.fill('#q-ticket', '');
  ok('al borrar regresa a los primeros 20', (await filas()) === 20);
  await p.locator('#tickets [data-ticket]').nth(3).click();
  ok('tocar un ticket abre su detalle', await p.getByText('Ticket #1042').isVisible().catch(() => false));
  await p.keyboard.press('Escape');

  console.log('\n· Caja');
  await p.goto(BASE + '#/v/caja');
  await p.waitForFunction(() => document.querySelector('#titulo')?.textContent && !document.querySelector('#contenido [aria-busy="true"]'), null, { timeout: 30000 });
  const cajon = p.locator('[data-abrir-cajon]');
  if(await cajon.count()){
    const [h, bt] = await Promise.all([p.locator('.cabeza-cierre h2').boundingBox(), cajon.boundingBox()]);
    ok('«Abrir cajón» va en el renglón del título, no flotando arriba', h && bt && Math.abs((h.y + h.height / 2) - (bt.y + bt.height / 2)) < 12, JSON.stringify({ h, bt }));
  }else ok('(la caja de muestra está cerrada: no hay botón que medir)', true);
  ok('ni un error de consola', !errores.length, errores.join(' | '));
}finally{
  await nav.close(); await api.dispose(); servidor.close();
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
