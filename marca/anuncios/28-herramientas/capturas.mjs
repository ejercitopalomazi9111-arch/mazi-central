/* GM-2 · usa las herramientas DE VERDAD con fotos reales de All's fashion (banco de La Sala) y guarda
   pantallas y resultados en cap/ (ignorado por git). Corre contra el servidor local en :8765. */
import { createRequire } from 'module'; import fs from 'fs';
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const B = 'http://localhost:8765', D = new URL('.', import.meta.url).pathname, C = D + 'cap/';
fs.mkdirSync(C, { recursive: true });
const b = await chromium.launch();
const nuevo = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', acceptDownloads: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('E', e.message)); return p; };
const que = process.argv[2] || 'todo';

if(que === 'todo' || que === 'fondos'){
  const p = await nuevo(); await p.goto(B + '/fondos/'); await p.screenshot({ path: C + 'fondos-0.png' });
  await p.setInputFiles('#archivo', D + 'fotos/' + (process.env.FOTO || 'p11') + '.jpg');
  await p.waitForSelector('.rc', { timeout: 20000 });
  await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 90000 });
  await p.waitForTimeout(800); await p.screenshot({ path: C + 'fondos-1-' + (process.env.FOTO || 'p11') + '.png' });
  await p.click('.rc [data-listo]'); await p.waitForSelector('.ficha'); await p.waitForTimeout(600);
  await p.screenshot({ path: C + 'fondos-2.png' });
  const [d] = await Promise.all([p.waitForEvent('download'), p.locator('.ficha [data-a="bajar"]').first().click()]);
  await d.saveAs(C + (process.env.FOTO || 'p11') + '-sin-fondo.png'); console.log('✓ fondos');
}
if(que === 'todo' || que === 'recolor'){
  const p = await nuevo(); await p.goto(B + '/recolor/');
  const [sel] = await Promise.all([p.waitForEvent('filechooser'), p.click('#soltar')]); await sel.setFiles(D + 'fotos/p20.jpg');
  await p.waitForFunction(() => !document.querySelector('#editor').hidden && window.__color.W > 0);
  await p.waitForFunction(() => !/Reconociendo/.test(document.querySelector('#partesEstado').textContent), null, { timeout: 90000 });
  await p.waitForTimeout(500); await p.screenshot({ path: C + 'recolor-0.png' });
  const en = (fx, fy) => p.evaluate(([fx, fy]) => { const r = document.querySelector('#vista').getBoundingClientRect(); return [r.left + fx * r.width, r.top + fy * r.height]; }, [fx, fy]);
  await p.mouse.click(...await en(.4, .62)); await p.waitForTimeout(400);
  const colores = await p.$$eval('#muestras button[data-color]', (bs) => bs.map((x) => x.dataset.color)); console.log('colores', colores.join(' '));
  const quiero = colores.find((c) => /6A3F9E/i.test(c)) || colores[0];
  await p.click(`#muestras button[data-color="${quiero}"]`); await p.waitForTimeout(600);
  await p.screenshot({ path: C + 'recolor-1.png' });
  await p.click('#aplicar').catch(() => {}); await p.waitForTimeout(400);
  const [d] = await Promise.all([p.waitForEvent('download'), p.click('#bajar')]);
  await d.saveAs(C + 'chamarra-color.' + (d.suggestedFilename().split('.').pop())); console.log('✓ recolor', quiero);
}
await b.close();
/* presentaciones: abre la presentación de ventas (nuestra), todas las láminas; luego fondo nuevo a todas */
if(process.argv[2] === 'pres'){
  const b2 = await chromium.launch();
  const ctx = await b2.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('E', e.message));
  await p.goto(B + '/presentaciones/');
  await p.setInputFiles('#soltar input', D + '../../../empresa/ventas/Vender-con-Grupo-Mazi.pptx');
  await p.waitForSelector('#laminas .marco .lienzo', { timeout: 30000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: C + 'pres-0.png' });
  await p.click('.dock [data-panel="fondo"]'); await p.waitForTimeout(500); await p.screenshot({ path: C + 'pres-1.png' });
  const colores = await p.$$eval('#hoja .muestra[data-c]', (m) => m.map((x) => x.dataset.c)); console.log(colores.join(' '));
  await p.locator('#hoja .muestra[data-c="' + (colores.find((c) => /170A26|7E1735|1C2A55|0E/i.test(c)) || colores[0]) + '"]').click();
  await p.getByRole('button', { name: /Poner fondo/ }).click(); await p.waitForTimeout(1500);
  await p.screenshot({ path: C + 'pres-2.png' });
  await p.evaluate(() => scrollTo(0, 500)); await p.waitForTimeout(500); await p.screenshot({ path: C + 'pres-3.png' });
  console.log('✓ pres'); await b2.close();
}
