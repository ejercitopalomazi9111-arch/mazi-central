/* ARMA LAS 25 OPCIONES DEL CUBO en imagen y PDF.
     python3 -m http.server 8765     (en la raíz del repo)
     node marca/cubo/armar.mjs                      (las 25 del cubo al lado del nombre)
     PAGINA=simbolo node marca/cubo/armar.mjs       (el cubo que es la M)
   Sale en marca/cubo/salida/ (no se sube). El PDF va hecho de una foto: el visor del iPhone no
   tiene nada que pintar mal (CLAUDE.md, regla 12). Revisa que cada logo salga con SU letra. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'salida');
fs.mkdirSync(SAL, { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 2120, height: 1400 }, deviceScaleFactor: 1 }); await red(ctx);
const pg = await ctx.newPage(), errores = [];
pg.on('pageerror', e => errores.push(e.message)); pg.on('requestfailed', r => errores.push('no cargó ' + r.url()));
const PAGINA = process.env.PAGINA || '', NOM = PAGINA ? 'Grupo-Mazi-cubo-M-25-opciones' : 'Grupo-Mazi-cubo-25-opciones';
await pg.goto((process.env.BASE || 'http://localhost:8765') + '/marca/cubo/' + (PAGINA ? PAGINA + '.html' : ''), { waitUntil: 'networkidle' });
await pg.waitForSelector('body[data-listo]');
/* la letra que quedó puesta es la que dice la ficha, y de verdad cargó (mide distinto con dos respaldos) */
const faltan = await pg.evaluate(() => [...document.querySelectorAll('.ficha')].flatMap(f => {
  const quiere = f.querySelector('.fuente').textContent, e = f.querySelector('.logo span');
  if(!e) return [];                                   // el símbolo solo y el ícono no llevan letras
  const puesta = getComputedStyle(e).fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  const c = document.createElement('canvas').getContext('2d'), w = (x) => { c.font = '40px ' + x; return c.measureText('MAZI mazi').width; };
  return puesta === quiere && Math.abs(w(`"${quiere}", monospace`) - w(`"${quiere}", serif`)) < .5 ? [] : [quiere]; }));
if(faltan.length) errores.push('no salieron con su letra: ' + faltan.join(', '));
const jpg = path.join(SAL, NOM + '.jpg');
await (await pg.$('#hoja')).screenshot({ path: jpg, type: 'jpeg', quality: 92 });
const b64 = fs.readFileSync(jpg).toString('base64'), pdf = await ctx.newPage();
const [w, h] = await pdf.evaluate(async (b) => { const i = new Image(); i.src = 'data:image/jpeg;base64,' + b; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, b64);
await pdf.setContent(`<style>@page{size:${w}px ${h}px;margin:0}*{margin:0}img{display:block;width:${w}px;height:${h}px}</style><img src="data:image/jpeg;base64,${b64}">`);
await pdf.pdf({ path: path.join(SAL, NOM + '.pdf'), width: w + 'px', height: h + 'px', printBackground: true });
const n = (fs.readFileSync(path.join(SAL, NOM + '.pdf'), 'latin1').match(/\/SMask/g) || []).length;
console.log(`✓ salida/ · PDF con ${n} máscaras`);
console.log(errores.length ? '✗ ' + errores.join('\n✗ ') : '✓ sin errores y con todas las letras cargadas');
await br.close();
