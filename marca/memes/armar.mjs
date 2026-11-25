/* Saca cada meme de marca/memes/index.html a PNG de 1080 × 1350.
     node marca/memes/armar.mjs            → marca/anuncios/salida/memes/
   Necesita el servidor local en :8765 y los cuadros del tráiler (carymo/trailer/preparar.py) para las fotos. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const SAL = 'marca/anuncios/salida/memes'; fs.mkdirSync(SAL, { recursive: true });
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.goto('http://localhost:8765/marca/memes/?n=0'); await pg.waitForFunction(() => window.listo);
const nombres = await pg.evaluate(() => window.MEMES);
for(let i = 0; i < nombres.length; i++){
  await pg.goto(`http://localhost:8765/marca/memes/?n=${i}`); await pg.waitForFunction(() => window.listo); await pg.waitForTimeout(650);
  await pg.screenshot({ path: `${SAL}/${String(i + 1).padStart(2, '0')}-${nombres[i]}.png` }); console.log('✓', nombres[i]);
}
console.log(err.length ? 'errores: ' + err.join(' | ') : 'sin errores');
await b.close();
