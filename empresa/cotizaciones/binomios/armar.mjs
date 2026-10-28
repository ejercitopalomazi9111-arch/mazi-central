/* ARMA LA COTIZACIÓN DE LA APP DE BINOMIOS:
     python3 -m http.server 8765        (en la raíz del repo)
     node empresa/cotizaciones/binomios/armar.mjs                        (la de precio normal)
     PAGINA=cotizacion-amiga node empresa/cotizaciones/binomios/armar.mjs  (la de precio especial)
   Sale en salida/ (no se sube): el PDF que se manda por WhatsApp, hecho de una foto por hoja (el
   visor del iPhone pinta mal las transparencias; ver CLAUDE.md, regla 12), otro con texto para
   imprimir y una imagen por hoja. Revisa que nada se salga de su hoja. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'salida');
const BASE = (process.env.BASE || 'http://localhost:8765') + '/empresa/cotizaciones/binomios/';
fs.mkdirSync(SAL, { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2.5 }); await red(ctx);
const pg = await ctx.newPage(), errores = [];
pg.on('pageerror', e => errores.push(e.message)); pg.on('requestfailed', r => errores.push('no cargó ' + r.url()));
const PAGINA = process.env.PAGINA || 'cotizacion', NOM = PAGINA === 'cotizacion' ? 'Cotizacion-app-binomios' : 'Cotizacion-app-binomios-precio-especial';
await pg.goto(BASE + PAGINA + '.html', { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready);
/* que nada se salga: cada bloque tiene que quedar arriba del pie de su hoja */
const salidos = await pg.evaluate(() => [...document.querySelectorAll('.hoja')].flatMap((h, i) => {
  const pie = h.querySelector('.pie-hoja').getBoundingClientRect().top, caja = h.getBoundingClientRect();
  return [...h.querySelectorAll('.pad > *, .opciones, .modulos, .firma, .tabla, .letra')].filter(e => e.getBoundingClientRect().bottom > pie - 6 || e.getBoundingClientRect().right > caja.right + 1)
    .map(e => `hoja ${i + 1}: ${e.className || e.tagName} se sale ${Math.round(e.getBoundingClientRect().bottom - pie + 6)} px`); }));
await pg.pdf({ path: path.join(SAL, NOM + '-para-imprimir.pdf'), width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true });
const fotos = [];
for(const [i, h] of (await pg.$$('.hoja')).entries()){
  const f = path.join(SAL, `${NOM}-${i + 1}.jpg`);
  await h.screenshot({ path: f, type: 'jpeg', quality: 90 }); fotos.push(fs.readFileSync(f).toString('base64'));
}
const pdf = await ctx.newPage();
await pdf.setContent(`<style>@page{size:8.5in 11in;margin:0}*{margin:0}img{display:block;width:8.5in;height:11in;break-after:page}</style>` + fotos.map(f => `<img src="data:image/jpeg;base64,${f}">`).join(''));
await pdf.pdf({ path: path.join(SAL, NOM + '.pdf'), width: '8.5in', height: '11in', printBackground: true });
const n = (fs.readFileSync(path.join(SAL, NOM + '.pdf'), 'latin1').match(/\/SMask/g) || []).length;
console.log(`✓ ${fotos.length} hojas · el PDF que se manda trae ${n} máscaras`);
console.log(errores.length || salidos.length ? '✗ ' + errores.concat(salidos).join('\n✗ ') : '✓ sin errores y nada se sale de su hoja');
await br.close();
