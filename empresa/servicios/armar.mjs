/* ARMA LA HOJA DE SERVICIOS Y SU ANUNCIO para mandárselos al cliente:
     python3 -m http.server 8765        (en la raíz del repo)
     node empresa/servicios/armar.mjs
   Sale en empresa/servicios/salida/: Grupo-Mazi-servicios-2026.pdf, una imagen por
   hoja (para revisarla o mandarla suelta por WhatsApp) y Grupo-Mazi-anuncio.png. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'salida');
const BASE = (process.env.BASE || 'http://localhost:8765') + '/empresa/servicios/';
fs.mkdirSync(SAL, { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errores = [];
async function abrir(pagina, ancho, alto, escala){
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: escala });
  await red(ctx);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(pagina + ': ' + e.message));
  pg.on('requestfailed', r => errores.push(pagina + ': no cargó ' + r.url()));
  await pg.goto(BASE + pagina, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  return pg;
}
/* la hoja: PDF de verdad (texto seleccionable) y una imagen por página */
const hoja = await abrir('servicios.html', 816, 1056, 2);
await hoja.pdf({ path: path.join(SAL, 'Grupo-Mazi-servicios-2026.pdf'), width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true });
const n = await hoja.$$eval('.hoja', h => h.length);
for(let i = 0; i < n; i++) await (await hoja.$$('.hoja'))[i].screenshot({ path: path.join(SAL, `Grupo-Mazi-servicios-${i + 1}.png`) });
/* lo que no cabe en su hoja se corta callado: se mide */
const desbordes = await hoja.$$eval('.hoja', hs => hs.flatMap((h, i) => { const b = h.getBoundingClientRect();
  return [...h.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.bottom > b.bottom + 1 || r.right > b.right + 1) && !e.closest('.cabeza, .cierre'); })
    .map(e => `hoja ${i + 1}: ${e.className || e.tagName}`).slice(0, 3); }));
/* y lo que queda DEBAJO del pie oscuro tampoco se ve: se mide contra su borde de arriba */
const tapados = await hoja.$$eval('.hoja', hs => hs.flatMap((h, i) => { const c = h.querySelector('.cierre') || h.querySelector('.pie-hoja'); if(!c) return [];
  const tope = c.getBoundingClientRect().top;
  return [...h.querySelectorAll('.pad *')].filter(e => { const r = e.getBoundingClientRect(); return r.height && r.bottom > tope - 6; }).map(e => `hoja ${i + 1}: ${e.className || e.tagName} bajo el pie`).slice(0, 3); }));
desbordes.push(...tapados);
/* el anuncio */
const anuncio = await abrir('anuncio.html', 1080, 1350, 1);
await anuncio.screenshot({ path: path.join(SAL, 'Grupo-Mazi-anuncio.png') });
/* los flyers: uno por sección */
const fl = await abrir('flyers.html', 1080, 1350, 1);
const fs_ = await fl.$$('.fly');
for(let i = 0; i < fs_.length; i++) await fs_[i].screenshot({ path: path.join(SAL, `Grupo-Mazi-flyer-${i + 1}.png`) });
await br.close();
console.log(desbordes.length ? '✗ se sale de la hoja: ' + desbordes.join(' · ') : '✓ nada se sale de su hoja');
console.log(errores.length ? '✗ ' + errores.slice(0, 4).join(' | ') : '✓ sin errores');
console.log('✓', n, 'hojas, el anuncio y los flyers →', path.relative(process.cwd(), SAL));
