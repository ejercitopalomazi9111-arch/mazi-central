/* URBAN PEST · arma la campaña: las láminas de cada carrusel (JPG de 1080 × 1350, listas para Instagram y Facebook)
   y el documento completo en PDF (para el dueño y el editor).
   Uso: node urban-pest/campana/armar.mjs [n]   (n = sólo ese carrusel; sin n, todos y el PDF)
   Necesita el servidor local en la raíz del repo: python3 -m http.server 8765 --bind 127.0.0.1 */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const AQUI = path.dirname(new URL(import.meta.url).pathname), BASE = 'http://127.0.0.1:8765/urban-pest/campana/';
const { CARRUSELES } = await import('./plan.js');
const solo = +process.argv[2] || 0;
const sal = path.join(AQUI, 'carruseles'); fs.mkdirSync(sal, { recursive: true });
const b = await chromium.launch(); const errores = [];
for(const C of CARRUSELES){
  if(solo && C.n !== solo) continue;
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  pg.on('pageerror', (e) => errores.push(`${C.n}: ${e.message}`));
  await pg.goto(BASE + 'carrusel.html?n=' + C.n); await pg.evaluate(() => window.listo);
  const lams = await pg.$$('.lam');
  for(let i = 0; i < lams.length; i++) await lams[i].screenshot({ path: path.join(sal, `${String(C.n).padStart(2, '0')}-${i + 1}.jpg`), type: 'jpeg', quality: 90 });
  console.log(`✓ carrusel ${C.n} · ${C.titulo}: ${lams.length} láminas`);
  await pg.close();
}
if(!solo){
  const pg = await b.newPage(); pg.on('pageerror', (e) => errores.push('doc: ' + e.message));
  await pg.goto(BASE + 'index.html'); await pg.evaluate(() => window.listo);
  await pg.pdf({ path: path.join(AQUI, 'Campana-Urban-Pest.pdf'), format: 'Letter', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '13mm', right: '13mm' } });
  console.log('✓ Campana-Urban-Pest.pdf');
}
await b.close();
if(errores.length){ console.log('✗ errores:', errores); process.exit(1); }
