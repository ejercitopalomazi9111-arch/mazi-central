/* GM-3 · capturas de la herramienta de presentaciones DE VERDAD: cada lámina de la presentación de ventas
   antes y después de cambiarles el fondo a todas de un jalón. Sale a cap/ (ignorado por git).
     node marca/anuncios/29-danos-tu-problema/capturas.mjs [color]    (con el servidor local en :8765) */
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const D = path.dirname(new URL(import.meta.url).pathname) + '/', C = D + 'cap/', B = 'http://localhost:8765';
fs.mkdirSync(C, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('E', e.message));
await p.goto(B + '/presentaciones/');
await p.setInputFiles('#soltar input', D + '../../../empresa/ventas/Vender-con-Grupo-Mazi.pptx');
await p.waitForSelector('#laminas .marco .lienzo', { timeout: 30000 }); await p.waitForTimeout(2000);
const fotos = async (pre) => {
  /* sólo la lámina: fuera el número, la palomita y la lupa de la app */
  await p.addStyleTag({ content: '#laminas .num, #laminas .marca-sel, #laminas .ver{ display:none !important }' });
  const ms = await p.$$('#laminas .marco');
  for(let i = 0; i < ms.length; i++){ await ms[i].scrollIntoViewIfNeeded(); await ms[i].screenshot({ path: C + pre + '-' + String(i).padStart(2, '0') + '.png' }); }
  return ms.length;
};
console.log('antes', await fotos('antes'));
await p.click('.dock [data-panel="fondo"]'); await p.waitForTimeout(500);
const colores = await p.$$eval('#hoja .muestra[data-c]', (m) => m.map((x) => x.dataset.c)); console.log(colores.join(' '));
const elegido = process.argv[2] || colores.find((c) => /7E1735/i.test(c)) || colores[0]; console.log('color', elegido);
await p.locator('#hoja .muestra[data-c="' + elegido + '"]').first().click();
await p.getByRole('button', { name: /Poner fondo/ }).click(); await p.waitForTimeout(2500);
await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(400);
console.log('despues', await fotos('despues'));
await b.close();
