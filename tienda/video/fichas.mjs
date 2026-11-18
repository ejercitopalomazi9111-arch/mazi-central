/* Las FICHAS de producto sueltas (sólo las que traen foto), para que floten en el gancho del video de la tienda. */
import { createRequire } from 'module'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const SAL = path.join(path.dirname(new URL(import.meta.url).pathname), 'cap');
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await red(ctx);
const pg = await ctx.newPage();
await pg.goto((process.env.BASE || 'http://localhost:8765') + '/tienda/index.html?negocio=barberia#/buscar', { waitUntil: 'load' }); await pg.waitForTimeout(6000);
await pg.evaluate(() => { location.hash = '#/c/' + (document.querySelector('a[href*="#/c/"]')?.getAttribute('href').split('#/c/')[1] || ''); }); await pg.waitForTimeout(4000);
/* la tarjeta = el ancestro más chico de cada foto que también trae el precio */
const n = await pg.evaluate(() => {
  const out = [];
  for(const img of document.querySelectorAll('img')){
    if(!(img.complete && img.naturalWidth > 50)) continue;
    let el = img; while(el && el !== document.body && !/\$\s?\d/.test(el.textContent || '')) el = el.parentElement;
    if(!el || el === document.body) continue; const r = el.getBoundingClientRect(); if(r.width < 120 || r.width > 380 || r.height > 420) continue;
    if(!out.includes(el)) out.push(el);
  }
  out.forEach((el, i) => el.setAttribute('data-ficha', i)); return out.length;
});
let k = 0; for(let i = 0; i < n && k < 10; i++){ const el = await pg.$(`[data-ficha="${i}"]`); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: path.join(SAL, `ficha${k++}.png`) }); }
console.log('fichas', k); await br.close();
