/* El cartel de Fadori · `node armar.mjs`
   Renderiza `cartel.html` a PNG con nuestro propio navegador. Sin Canva, sin
   plantillas de nadie: la marca, los códigos y el papel son de la casa.
   Sale a 2480 × 3508, o sea A4 a 300 dpi — se imprime sin verse pixeleado y
   también se manda por WhatsApp tal cual. */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const AQUI = dirname(fileURLToPath(import.meta.url));

const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const pg = await (await b.newContext({
  viewport:{ width:1240, height:1754 }, deviceScaleFactor:2 })).newPage();
pg.on('pageerror', e => console.log('ERR', e.message));
const rotos = [];
pg.on('response', r => { if(r.status() >= 400) rotos.push(r.status() + ' ' + r.url()); });

await pg.goto('file://' + join(AQUI, 'cartel.html'));
await pg.waitForTimeout(700);

/* Que ninguna pieza falte en silencio: un cartel con el hueco de un QR es peor
   que no tener cartel. */
const faltan = await pg.evaluate(() => [...document.images]
  .filter(i => !i.complete || i.naturalWidth === 0)
  .map(i => i.getAttribute('src')));
if(faltan.length || rotos.length){
  console.error('✗ faltan piezas:', faltan.concat(rotos).join(', '));
  await b.close(); process.exit(1);
}

const salida = join(AQUI, 'cartel-fadori.png');
await pg.screenshot({ path: salida });
await b.close();
console.log('✓', salida, '· 2480 × 3508 (A4 a 300 dpi)');
