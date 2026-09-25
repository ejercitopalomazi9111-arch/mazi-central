#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   ACCESIBILIDAD · `node tienda/nucleo/pruebas-a11y.mjs`
   ──────────────────────────────────────────────────────────────────────────
   axe-core 4.13 (Deque, MPL-2.0; vive en datos/vendor-pruebas y NO se
   publica) sobre cada pantalla del cliente y las principales del personal, a
   390 px, en claro y en oscuro. Falla con cualquier hallazgo «serious» o
   «critical» de WCAG 2 A/AA: contraste, botones sin nombre, campos sin
   etiqueta, ids repetidos. Es lo que le pasa a un señor que ve poco o a
   quien usa el lector de pantalla del teléfono.
   TODO=1 enseña también los «moderate».
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const TIENDA = join(dirname(fileURLToPath(import.meta.url)), '..');
const AXE = join(TIENDA, 'datos/vendor-pruebas/axe-4.13.0.min.js');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : `\n      ${d}`}`); };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!ruta.startsWith(TIENDA)){ res.writeHead(403).end(); return; }
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(readFileSync(ruta)); }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const api = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } });
const b = await chromium.launch();
const GRAVES = process.env.TODO ? ['moderate', 'serious', 'critical'] : ['serious', 'critical'];

async function recorrer(tema, rol, rutas){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.routeWebSocket(/^wss:\/\//, () => {});
  await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch(e){ await r.abort(); } });
  await ctx.addInitScript((t) => { try{ sessionStorage.setItem('tienda-presentacion', '1'); localStorage.setItem('tienda-tema', t); }catch(e){} }, tema);
  const p = await ctx.newPage();
  const listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 }).catch(() => {});
  await p.goto(BASE + '#/'); await listo();
  if(rol) await p.evaluate(async (r) => (await import('./nucleo/datos.js')).verComo(r), rol);
  const hallazgos = new Map();
  for(const ruta of rutas){
    await p.goto(BASE + '#' + ruta); await listo(); await p.waitForTimeout(600);
    await p.addScriptTag({ path: AXE });
    const r = await p.evaluate(async (graves) => {
      const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
      return res.violations.filter((v) => graves.includes(v.impact)).map((v) => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 3).map((n) => n.target.join(' ') + (n.any?.[0]?.message ? ` — ${n.any[0].message.slice(0, 110)}` : '')), cuantos: v.nodes.length }));
    }, GRAVES);
    for(const v of r){
      const k = v.id, prev = hallazgos.get(k) || { ...v, rutas: [] };
      prev.rutas.push(`${ruta} (${v.cuantos})`); hallazgos.set(k, prev);
    }
  }
  await ctx.close();
  return hallazgos;
}

const CLIENTE = ['/', '/buscar', '/buscar?q=tinte', '/c/color', '/carrito', '/pagar', '/favoritos', '/pedidos', '/cuenta', '/ayuda', '/otra-vez'];
for(const tema of ['claro', 'oscuro']){
  console.log(`\n· Tienda del cliente, tema ${tema}`);
  const h = await recorrer(tema, null, CLIENTE);
  ok(`${CLIENTE.length} pantallas sin hallazgos graves de WCAG 2 AA`, !h.size, [...h.values()].map((v) => `[${v.impacto}] ${v.id}: ${v.ayuda}\n        en ${v.rutas.join(', ')}\n        ${v.nodos.join('\n        ')}`).join('\n      '));
}
for(const [rol, rutas] of [['cajero', ['/v', '/v/caja', '/v/ventas', '/v/cotizar', '/v/impresora', '/v/devolucion']], ['repartidor', ['/r', '/r/ruta', '/r/turno', '/r/historial']],
  ['admin', ['/a', '/a/pedidos', '/a/productos', '/a/inventario', '/a/surtir', '/a/etiquetas', '/a/importar', '/a/categorias', '/a/repartidores', '/a/turnos',
    '/a/clientes', '/a/descuentos', '/a/sorteos', '/a/conversaciones', '/a/redes', '/a/reportes', '/a/manual', '/a/ajustes']]]){
  console.log(`\n· ${rol}`);
  const h = await recorrer('claro', rol, rutas);
  ok(`${rutas.length} pantallas sin hallazgos graves de WCAG 2 AA`, !h.size, [...h.values()].map((v) => `[${v.impacto}] ${v.id}: ${v.ayuda}\n        en ${v.rutas.join(', ')}\n        ${v.nodos.join('\n        ')}`).join('\n      '));
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
await b.close(); await api.dispose(); servidor.close();
process.exit(mal ? 1 : 0);
