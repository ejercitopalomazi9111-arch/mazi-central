/* ARMA LA PRINCIPAL (aureola y cuerno): las dos hojas en imagen y un PDF hecho de fotos (0 máscaras).
     python3 -m http.server 8765   (en la raíz del repo)  ·  node marca/principal/armar.mjs */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from '../../herramientas/video/red.mjs';
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'salida');
fs.mkdirSync(SAL, { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 2120, height: 1400 } }); await red(ctx);
const fotos = [], errores = [];
for(const h of [1, 2]){
  const pg = await ctx.newPage(); pg.on('pageerror', e => errores.push(e.message));
  await pg.goto(`http://localhost:8765/marca/principal/?hoja=${h}`, { waitUntil: 'networkidle' }); await pg.waitForSelector('body[data-listo]');
  const f = path.join(SAL, `Grupo-Mazi-aureola-cuerno-${h}.jpg`); await (await pg.$('#hoja')).screenshot({ path: f, type: 'jpeg', quality: 90 });
  fotos.push(fs.readFileSync(f).toString('base64')); await pg.close();
}
const pdf = await ctx.newPage();
await pdf.setContent(`<style>@page{size:2120px 1529px;margin:0}*{margin:0}img{display:block;width:2120px;height:1529px;object-fit:contain;background:#100A18;break-after:page}</style>` + fotos.map(f => `<img src="data:image/jpeg;base64,${f}">`).join(''));
await pdf.pdf({ path: path.join(SAL, 'Grupo-Mazi-aureola-cuerno.pdf'), width: '2120px', height: '1529px', printBackground: true });
console.log(errores.length ? '✗ ' + errores.join(' · ') : '✓ 2 hojas y el PDF en salida/');
await br.close();
