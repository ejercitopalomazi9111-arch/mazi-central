/* GM-4 · LA PARED: captura en teléfono (390×844 a 2x) la portada y un tramo más abajo de cada proyecto
   nuestro, tal como se ve hoy. Sale a cap/ (ignorado por git).
     node marca/anuncios/30-pared/capturas.mjs [solo-este]     (con el servidor local en :8765)
   Fuera, a propósito: Smiley's (no pagó), lo de Luis y Godines, y lo que Carlos sacó del portafolio. */
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../../herramientas/video/red.mjs';
const D = path.dirname(new URL(import.meta.url).pathname) + '/', C = D + 'cap/', B = 'http://localhost:8765';
fs.mkdirSync(C, { recursive: true });
export const PROYECTOS = [
  ['district-roll', '/district-roll/'], ['casa-brava', '/barberias/casa-brava/'], ['obsidiana', '/barberias/obsidiana/'],
  ['navaja', '/barberias/navaja/'], ['sencilla', '/barberias/sencilla/'], ['urban-pest', '/urban-pest/web/'],
  ['carymo', '/carymo/'], ['tienda', '/tienda/'], ['fadori', '/fadori/'], ['podcast', '/podcast/'], ['inkwell', '/inkwell/'],
  ['sitio', '/sitio/'], ['presentaciones', '/presentaciones/'], ['recolor', '/recolor/'], ['reportes', '/reportes/'],
  ['sociedad', '/sociedad/'], ['carteles', '/carteles/'], ['fondos', '/fondos/'], ['tiempo', '/tiempo/'], ['limpiar', '/limpiar/'],
];
const solo = process.argv[2];
const b = await chromium.launch();
for(const [id, ruta] of PROYECTOS.filter(([id]) => !solo || id === solo)){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  await red(ctx);
  const p = await ctx.newPage();
  try{
    await p.goto(B + ruta, { waitUntil: 'load', timeout: 30000 }); await p.waitForTimeout(3500);
    await p.screenshot({ path: C + id + '-0.jpg', type: 'jpeg', quality: 90 });
    await p.evaluate(() => scrollTo(0, innerHeight * 1.1)); await p.waitForTimeout(1800);
    await p.screenshot({ path: C + id + '-1.jpg', type: 'jpeg', quality: 90 });
    console.log('✓', id);
  }catch(e){ console.log('✗', id, e.message.split('\n')[0]); }
  await ctx.close();
}
await b.close();
