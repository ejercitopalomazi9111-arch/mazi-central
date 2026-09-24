#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LA ÚLTIMA PIEZA · `node tienda/nucleo/pruebas-concurrencia.mjs`
   ──────────────────────────────────────────────────────────────────────────
   La promesa de vender(): dos cajas que cobran la última pieza al mismo tiempo
   → una pasa, la otra recibe «ya no alcanzan». Sin eso, el inventario miente
   y se vende lo que no hay.

   Contra la base REAL del negocio de muestra, con dos navegadores distintos
   (dos sesiones, dos conexiones) disparando a la vez. Deja las existencias
   del producto como estaban.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

const TIENDA = join(dirname(new URL(import.meta.url).pathname), '..');
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${d ? ` — ${d}` : ''}`); };

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' };
const servidor = createServer((req, res) => {
  const r = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'application/octet-stream' }).end(readFileSync(r)); }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const nav = await chromium.launch();

async function caja(){
  const ctx = await nav.newContext({ serviceWorkers: 'block' });   // el modo sin red se prueba aparte (pruebas-sin-red.mjs)
  await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch{ await r.abort(); } });
  await ctx.routeWebSocket(/^wss:\/\//, () => {});
  await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
  const p = await ctx.newPage();
  await p.goto(BASE + '#/v/ventas');
  await p.waitForFunction(() => document.querySelector('#titulo')?.textContent === 'Ventas de hoy', null, { timeout: 30000 });
  await p.evaluate(async () => { const d = await import('/nucleo/datos.js'); await d.verComo('admin'); });
  return p;
}
const [a, b] = await Promise.all([caja(), caja()]);

// Un producto activo cualquiera: se le ponen N piezas, se prueba y se regresa.
const { id, era, nombre } = await a.evaluate(async () => {
  const d = await import('/nucleo/datos.js');
  const c = await d.catalogoAdmin();
  const p = c.productos.find((x) => x.activo && x.existencia.apartado === 0 && x.categoria_id);
  return { id: p.id, era: p.existencia.cantidad, nombre: p.nombre };
});
console.log(`\n· Producto de prueba: ${nombre} (tenía ${era})`);
const poner = (n) => a.evaluate(async ([id, n]) => (await import('/nucleo/datos.js')).contarInventario(id, n, 'Prueba de concurrencia'), [id, n]);
const vender = (p, n = 1) => p.evaluate(async ([id, n]) => {
  const d = await import('/nucleo/datos.js');
  try{ const r = await d.venderMostrador({ renglones: [{ id, cantidad: n }], caja: null, cobro: { metodo: 'tarjeta' } }); return { ok: true, folio: r.folio }; }
  catch(e){ return { ok: false, error: e.message }; }
}, [id, n]);
const hay = () => a.evaluate(async (id) => { const d = await import('/nucleo/datos.js'); return (await d.catalogoAdmin()).porId.get(id).existencia.cantidad; }, id);

try{
  console.log('\n· Dos cajas, la última pieza, al mismo tiempo');
  for(let vuelta = 1; vuelta <= 3; vuelta++){
    await poner(1);
    const r = await Promise.all([vender(a), vender(b)]);
    const pasaron = r.filter((x) => x.ok).length;
    ok(`vuelta ${vuelta}: pasa una sola`, pasaron === 1, JSON.stringify(r.map((x) => x.ok ? '#' + x.folio : x.error)));
    ok(`vuelta ${vuelta}: la que no pasa dice por qué`, r.some((x) => !x.ok && /alcanzan/i.test(x.error)));
    ok(`vuelta ${vuelta}: quedan 0, nunca −1`, (await hay()) === 0);
  }

  console.log('\n· Seis ventas a la vez sobre 4 piezas');
  await poner(4);
  const r = await Promise.all([vender(a), vender(b), vender(a), vender(b), vender(a), vender(b)]);
  ok('pasan exactamente 4', r.filter((x) => x.ok).length === 4, `${r.filter((x) => x.ok).length} pasaron`);
  ok('quedan 0', (await hay()) === 0);

  console.log('\n· Una venta de 3 con sólo 2');
  await poner(2);
  const x = await vender(a, 3);
  ok('no se vende a medias: se rechaza completa', !x.ok && (await hay()) === 2, x.error || 'pasó');
}finally{
  await poner(era);
  console.log(`\n  (existencias regresadas a ${await hay()})`);
  await nav.close(); await api.dispose(); servidor.close();
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
