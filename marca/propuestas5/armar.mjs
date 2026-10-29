/* ARMA LA RONDA 5: 200 logos en 8 hojas, en imágenes y un PDF.
     python3 -m http.server 8765     (en la raíz del repo)
     node marca/propuestas5/armar.mjs
   Sale en marca/propuestas5/salida/ (no se sube al repo). El PDF va hecho de FOTOS de cada hoja:
   así el visor del iPhone no tiene nada que pintar mal (CLAUDE.md, la tabla de la regla 12). */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'salida');
const BASE = (process.env.BASE || 'http://localhost:8765') + '/marca/propuestas5/';
fs.mkdirSync(SAL, { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 2120, height: 1400 }, deviceScaleFactor: 1 }); await red(ctx);
const errores = [], fotos = [];
const HOJAS = [1, 2, 3, 4, 5, 6, 7, 8].map(h => [h, 'hoja-' + h]);
for(const [h, nombre] of HOJAS){
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`hoja ${h}: ${e.message}`));
  pg.on('requestfailed', r => errores.push(`hoja ${h}: no cargó ${r.url()}`));
  await pg.goto(BASE + '?hoja=' + h, { waitUntil: 'networkidle' });
  await pg.waitForSelector('body[data-listo]');
  /* que cada logo esté escrito CON SU letra: se compara el nombre de la ficha con la letra que de
     verdad quedó puesta y con document.fonts. La primera versión revisaba la letra que «quedó» y
     era la del sistema: unas comillas dobles rompían el estilo y las 25 salieron iguales. */
  const faltan = await pg.evaluate(() => [...document.querySelectorAll('.ficha')].flatMap(f => {
    const quiere = f.querySelector('.fuente').textContent, e = f.querySelector('[style*="font-family"]');
    const puesta = e ? getComputedStyle(e).fontFamily.split(',')[0].replace(/['"]/g, '').trim() : '';
    /* lo que se ve: la palabra escrita con esa letra mide distinto que con la de respaldo.
       document.fonts.check() decía que no con Dela Gothic (japonesa, en cien pedazos) y sí la usaba */
    const c = document.createElement('canvas').getContext('2d'), w = (x) => { c.font = '40px ' + x; return c.measureText('GRUPO Mazi grupo').width; };
    /* si la letra está puesta, el respaldo no importa: con monospace y con serif mide lo mismo.
       (Comparar contra el respaldo solo falló con Sora: midió igual que monospace por casualidad.) */
    return puesta === quiere && Math.abs(w(`"${quiere}", monospace`) - w(`"${quiere}", serif`)) < .5 ? [] : [quiere]; }));
  /* que nada se salga de su ficha: lo que el acomodo tuvo que encoger demasiado es que no cabía */
  const chicos = await pg.evaluate(() => [...document.querySelectorAll('.ficha')].filter(f => +(f.querySelector('.logo').style.transform.match(/scale\(([\d.]+)/) || [0, 1])[1] < .45).map(f => f.querySelector('.num').textContent));
  if(chicos.length) console.log(`  hoja ${h}: muy encogidos ${chicos.join(', ')}`);
  if(faltan.length) errores.push(`hoja ${h}: no salieron con su letra ${[...new Set(faltan)].join(', ')}`);
  const hoja = await pg.$('#hoja');
  const archivo = path.join(SAL, `Grupo-Mazi-r5-${nombre}.jpg`);
  await hoja.screenshot({ path: archivo, type: 'jpeg', quality: 90 });
  fotos.push(fs.readFileSync(archivo).toString('base64'));
  await pg.close();
}
/* el PDF: una hoja por página, apaisada, cada una una foto opaca */
const pdf = await ctx.newPage();
const dim = await pdf.evaluate(async (b64) => { const i = new Image(); i.src = 'data:image/jpeg;base64,' + b64; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, fotos[0]);
await pdf.setContent(`<style>@page{size:${dim[0]}px ${dim[1]}px;margin:0}*{margin:0}img{display:block;width:${dim[0]}px;height:${dim[1]}px;object-fit:contain;background:#100A18;break-after:page}</style>` +
  fotos.map(f => `<img src="data:image/jpeg;base64,${f}">`).join(''));
await pdf.pdf({ path: path.join(SAL, 'Grupo-Mazi-200-logos-ronda-5.pdf'), width: dim[0] + 'px', height: dim[1] + 'px', printBackground: true });
const p = fs.readFileSync(path.join(SAL, 'Grupo-Mazi-200-logos-ronda-5.pdf'), 'latin1');
console.log(`✓ ${HOJAS.length} hojas → salida/ · PDF ${(fs.statSync(path.join(SAL, 'Grupo-Mazi-200-logos-ronda-5.pdf')).size / 1e6).toFixed(1)} MB, ${(p.match(/\/SMask/g) || []).length} máscaras`);
console.log(errores.length ? '✗ ' + errores.join('\n✗ ') : '✓ sin errores y con todas las letras cargadas');
await br.close();
