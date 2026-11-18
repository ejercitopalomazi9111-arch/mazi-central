/* Primer vistazo: la pantalla de entrada de cada herramienta, para escoger qué enseñar en GM-2 */
import { createRequire } from 'module';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const B = 'http://localhost:8765/', OUT = process.argv[2];
const R = ['fondos/', 'presentaciones/', 'recolor/', 'limpiar/', 'reportes/', 'carteles/', 'podcast/', 'tiempo/', 'urban-pest/centro/', 'urban-pest/cotizacion/'];
const b = await chromium.launch();
for(const r of R){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
  try { await p.goto(B + r, { waitUntil: 'load', timeout: 20000 }); await p.waitForTimeout(1500); } catch(e){ err.push(e.message); }
  await p.screenshot({ path: `${OUT}/${r.replace(/\//g, '_')}.png` }); console.log(r, err.slice(0, 2).join(' | ')); await ctx.close();
}
await b.close();
