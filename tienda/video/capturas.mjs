/* CAPTURAS DE LA TIENDA para su video (Carlos, 15 nov: «hazme un video de la tienda que hicimos tipo Amazon para poder
   presentarla»). Teléfono de 390×844 a 3x, contra la base de muestra de verdad (por red.mjs).
     python3 -m http.server 8765 ; node tienda/video/capturas.mjs
   Sale en tienda/video/cap/<nombre>.png (no va al repo). */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'cap');
fs.mkdirSync(SAL, { recursive: true });
const BASE = (process.env.BASE || 'http://localhost:8765') + '/tienda/index.html?negocio=barberia';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await red(ctx);
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', e => err.push(e.message));
await pg.goto(BASE, { waitUntil: 'load' }); await pg.waitForTimeout(6000);
const RUTAS = (process.env.RUTAS || '/,/buscar,/otra-vez,/carrito,/pedidos,/r,/r/ruta,/v,/v/ventas,/a,/a/inventario,/a/surtir,/a/repartidores,/a/clientes').split(',');
for(const r of RUTAS){
  await pg.evaluate((r) => { location.hash = '#' + r; }, r); await pg.waitForTimeout(3500);
  const n = r === '/' ? 'inicio' : r.slice(1).replace(/\//g, '-');
  await pg.screenshot({ path: path.join(SAL, n + '.png') }); console.log('✓', n, await pg.evaluate(() => document.title));
}
console.log('errores:', err.slice(0, 5));
await br.close();
