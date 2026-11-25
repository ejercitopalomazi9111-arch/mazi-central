/* Pantallas LLENAS para el video de la tienda: se quita la franja de muestra, se agregan productos al carrito y se
   captura el producto, el carrito y el inicio ya bajado (sin la oferta, cuya foto no carga en la muestra). */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const SAL = path.join(path.dirname(new URL(import.meta.url).pathname), 'cap');
const BASE = (process.env.BASE || 'http://localhost:8765') + '/tienda/index.html?negocio=barberia';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await red(ctx);
await ctx.addInitScript(() => { const s = document.createElement('style'); s.textContent = '.franja-muestra{display:none!important}.avisos{display:none!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', e => err.push(e.message));
const ir = async (r, ms = 3500) => { await pg.evaluate((r) => { location.hash = '#' + r; }, r); await pg.waitForTimeout(ms); };
const foto = (n) => pg.screenshot({ path: path.join(SAL, n + '.png') });
await pg.goto(BASE, { waitUntil: 'load' }); await pg.waitForTimeout(6000);
await ir('/'); await foto('inicio-limpio');
await pg.evaluate(() => scrollTo(0, 300)); await pg.waitForTimeout(800); await foto('inicio-bajado');
const ids = await pg.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="#/p/"]')].map(a => a.getAttribute('href').split('#/p/')[1]))].slice(0, 14));
console.log('productos', ids.length);
let k = 0;
for(const id of ids){
  await ir('/p/' + id, 3000);
  const b = await pg.$('[data-agregar]:not([disabled])'); if(!b) continue;
  /* sólo productos con foto que sí cargó: en la muestra algunas no cargan y se ven rotas */
  const conFoto = await pg.evaluate(() => [...document.querySelectorAll('main img, .pantalla img')].some(i => i.complete && i.naturalWidth > 50 && i.getBoundingClientRect().width > 200));
  if(!conFoto) continue;
  if(k === 0) await foto('producto');
  await b.click(); await pg.waitForTimeout(900); if(++k >= 3) break;
}
await ir('/carrito'); await foto('carrito-lleno');
for(const r of ['/a', '/a/surtir', '/a/repartidores', '/a/inventario', '/v', '/buscar']){ await ir(r); await foto('limpia' + r.replace(/\//g, '-')); }
console.log('agregados', k, 'errores', err.slice(0, 3));
await br.close();
