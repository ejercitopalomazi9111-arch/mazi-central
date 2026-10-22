// Pinta img/compartir.jpg (1200×630) desde scripts/compartir.html, con el logo de img/logo.svg.
//   node smileys/scripts/compartir.mjs   (con la página servida en http://localhost:8765)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const aqui = fileURLToPath(new URL('.', import.meta.url));
const svg = readFileSync(aqui + '../img/logo.svg', 'utf8');
const vb = svg.match(/viewBox="([^"]+)"/)[1], g = svg.match(/(<g[^>]*>[\s\S]*<\/g>)/)[1];
writeFileSync(aqui + 'compartir-armado.html', readFileSync(aqui + 'compartir.html', 'utf8').replace('@@VB@@', vb).replace('@@LOGO@@', g));
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const br = await (pw.chromium || pw.default.chromium).launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await br.newPage({ viewport: { width: 1200, height: 630 } });
await pg.goto('http://localhost:8765/smileys/scripts/compartir-armado.html', { waitUntil: 'networkidle' });
await pg.waitForTimeout(500);
await pg.screenshot({ path: aqui + '../img/compartir.jpg', type: 'jpeg', quality: 86 });
await br.close();
console.log('✓ img/compartir.jpg');
