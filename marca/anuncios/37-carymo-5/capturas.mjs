/* CARYMO 5 · DE LA VERSIÓN 1 A HOY: captura la primera versión de CARYMO (commit bff2eb40, 12 nov, sacada con
   `git archive bff2eb40 carymo sala | tar -x -C /tmp/claude-0/v1`) y la de hoy, en teléfono, con la misma pantalla.
     node marca/anuncios/37-carymo-5/capturas.mjs      (v1 en :8766 desde /tmp/claude-0/v1; hoy en :8765)
   Sale a cap/ (ignorado por git). */
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const C = path.dirname(new URL(import.meta.url).pathname) + '/cap/';
fs.mkdirSync(C, { recursive: true });
const b = await chromium.launch();
for(const [nombre, base] of [['v1', 'http://localhost:8766'], ['hoy', 'http://localhost:8765']]){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try{ localStorage.setItem('salaLlave', 'demo'); sessionStorage.setItem('carymo.entrada', '1'); }catch{} });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log(nombre, 'E', e.message));
  await p.goto(base + '/carymo/', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  await p.screenshot({ path: C + nombre + '-0.jpg', type: 'jpeg', quality: 90 });
  await p.evaluate(() => scrollTo(0, innerHeight * .9)); await p.waitForTimeout(1200);
  await p.screenshot({ path: C + nombre + '-1.jpg', type: 'jpeg', quality: 90 });
  console.log('✓', nombre); await ctx.close();
}
await b.close();
