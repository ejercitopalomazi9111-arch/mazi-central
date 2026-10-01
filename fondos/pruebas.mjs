/* Pruebas de QUITAR FONDOS, la página sola (fondos/index.html).
   El motor ya se prueba en presentaciones/pruebas-recorte.mjs; aquí va lo de
   alrededor: elegir varias, que se recorten en fila, descargar un PNG de
   verdad transparente, corregir y quitar. En un navegador a 390 × 844.
   Necesita un servidor en 8791:  python3 -m http.server 8791 --bind 127.0.0.1
     node fondos/pruebas.mjs */
import { mkdirSync, readFileSync } from 'node:fs';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const BASE = process.env.BASE || 'http://127.0.0.1:8791';
const CAPTURAS = process.env.CAPTURAS || '';
if(CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const ruido = /wasm streaming compile failed|falling back to ArrayBuffer|^INFO: /;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true, hasTouch: true });
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
p.on('console', (m) => { if(m.type() === 'error' && !ruido.test(m.text())) errores.push(m.text()); });
await p.goto(BASE + '/fondos/');

console.log('\n· La página');
ok('abre con su título', (await p.textContent('h1')) === 'Quitar fondos');
ok('no se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

/* dos fotos de prueba: un disco rojo y un cuadro verde, sobre azul */
const fotos = await p.evaluate(() => ['disco', 'cuadro'].map((q) => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d');
  x.fillStyle = '#2D6CDF'; x.fillRect(0, 0, 400, 300);
  x.fillStyle = q === 'disco' ? '#E0302B' : '#1FA34A';
  if(q === 'disco'){ x.beginPath(); x.arc(200, 150, 90, 0, Math.PI * 2); x.fill(); } else x.fillRect(130, 80, 140, 140);
  return c.toDataURL('image/png').split(',')[1];
}));
await p.setInputFiles('#archivo', [
  { name: 'disco.png', mimeType: 'image/png', buffer: Buffer.from(fotos[0], 'base64') },
  { name: 'cuadro.png', mimeType: 'image/png', buffer: Buffer.from(fotos[1], 'base64') },
]);

console.log('\n· Varias en fila');
for(const n of [1, 2]){
  await p.waitForSelector('.rc', { timeout: 15000 });
  await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 60000 });
  if(n === 1 && CAPTURAS) await p.screenshot({ path: CAPTURAS + '/fondos-recorte.png' });
  ok(`la ${n}ª se abre sola en la pantalla de recorte`, true);
  await p.click('.rc [data-listo]');
  await p.waitForFunction((k) => document.querySelectorAll('.ficha').length === k, n, { timeout: 15000 });
}
ok('quedan las dos listas', await p.locator('.ficha').count() === 2);
ok('aparece «Descargar todas» cuando hay más de una', await p.locator('#bajarTodas').isVisible());
if(CAPTURAS) await p.screenshot({ path: CAPTURAS + '/fondos-listas.png', fullPage: true });

console.log('\n· Descargar');
const [baja] = await Promise.all([p.waitForEvent('download'), p.locator('.ficha').first().locator('[data-a="bajar"]').click()]);
const ruta = await baja.path();
const bytes = readFileSync(ruta);
ok('se descarga con nombre «…-sin-fondo.png»', /-sin-fondo\.png$/.test(baja.suggestedFilename()), baja.suggestedFilename());
ok('y es un PNG de verdad', bytes.subarray(1, 4).toString() === 'PNG');
const info = await p.evaluate(async (b64) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  return { w: c.width, h: c.height, esquina: x.getImageData(0, 0, 1, 1).data[3], centro: x.getImageData(c.width >> 1, c.height >> 1, 1, 1).data[3] };
}, bytes.toString('base64'));
ok('recortada al borde de lo que se queda (más chica que 400×300)', info.w < 400 && info.h < 300, JSON.stringify(info));
ok('transparente en la orilla y llena en el centro', info.esquina === 0 && info.centro === 255, JSON.stringify(info));

console.log('\n· Corregir y quitar');
await p.locator('.ficha').first().locator('[data-a="editar"]').click();
await p.waitForSelector('.rc', { timeout: 15000 });
ok('«Corregir» vuelve a abrir la pantalla de recorte con la original', true);
await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 60000 });
/* y de paso, un fondo nuevo: color violeta */
await p.click('.rc [data-modo="fondo"]'); await p.click('.rc [data-fondo="color"]'); await p.click('.rc [data-color="#AC27FF"]');
await p.click('.rc [data-listo]');
await p.waitForFunction(() => !document.querySelector('.rc'), null, { timeout: 15000 });
ok('y no se duplica: siguen siendo dos', await p.locator('.ficha').count() === 2);
const nombreNuevo = await p.locator('.ficha').first().locator('.nombre').textContent();
ok('con fondo nuevo, el archivo se llama «…-fondo-nuevo.png»', /-fondo-nuevo\.png$/.test(nombreNuevo), nombreNuevo);
const [baja2] = await Promise.all([p.waitForEvent('download'), p.locator('.ficha').first().locator('[data-a="bajar"]').click()]);
const info2 = await p.evaluate(async (b64) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  return { w: c.width, h: c.height, esquina: [...x.getImageData(0, 0, 1, 1).data] };
}, readFileSync(await baja2.path()).toString('base64'));
ok('y se descarga entera (400×300) con la esquina violeta y opaca', info2.w === 400 && info2.h === 300 && info2.esquina[3] === 255 && Math.abs(info2.esquina[0] - 0xAC) < 4 && Math.abs(info2.esquina[2] - 0xFF) < 4, JSON.stringify(info2));
await p.locator('.ficha').first().locator('[data-a="quitar"]').click();
ok('«Quitar» la saca de la lista', await p.locator('.ficha').count() === 1);

console.log('\n· Ver qué queda adentro, y acomodar con los dedos');
await p.locator('.ficha').first().locator('[data-a="editar"]').click();
await p.waitForSelector('.rc', { timeout: 15000 });
await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 60000 });
await p.click('.rc [data-modo="fondo"]'); await p.click('.rc [data-fondo="nada"]');
await p.click('.rc [data-modo="dedo"]'); await p.waitForTimeout(300);
const esquinaVista = () => p.evaluate(() => { const c = document.querySelector('.rc canvas'); return [...c.getContext('2d').getImageData(4, 4, 1, 1).data]; });
const fant = await esquinaVista();
ok('lo que se borra se sigue viendo, deslavado en rojo (no sólo el cuadriculado)', fant[3] > 60 && fant[0] > fant[2], JSON.stringify(fant));
ok('con la leyenda de qué es qué', await p.locator('.rc .rc-leyenda').isVisible());
const caja0 = await p.locator('.rc canvas').boundingBox();
const cx = caja0.x + caja0.width / 2, cy = caja0.y + caja0.height / 2;
const cdp = await ctx.newCDPSession(p);
const toque = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
await toque('touchStart', [[cx - 40, cy], [cx + 40, cy]]);
for(let k = 1; k <= 6; k++) await toque('touchMove', [[cx - 40 - k * 12, cy], [cx + 40 + k * 12, cy]]);
await toque('touchEnd', []);
const caja1 = await p.locator('.rc canvas').boundingBox();
ok('con dos dedos se acerca la imagen para trazar fino', caja1.width > caja0.width * 1.5, `${Math.round(caja0.width)} → ${Math.round(caja1.width)}`);
await p.dblclick('.rc canvas');
ok('y con doble toque regresa a verse entera', Math.abs((await p.locator('.rc canvas').boundingBox()).width - caja0.width) < 2);
await p.click('.rc [data-modo="fondo"]'); await p.click('.rc [data-fondo="color"]'); await p.click('.rc [data-color="#111111"]');
/* el recorte estaba al centro: se arrastra a la derecha con un dedo */
await toque('touchStart', [[cx, cy]]);
for(let k = 1; k <= 6; k++) await toque('touchMove', [[cx + k * 15, cy]]);
await toque('touchEnd', []);
const verde = (b64) => p.evaluate(async (b) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b; await im.decode();
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data; let sx = 0, n = 0;
  for(let i = 0; i < d.length; i += 4) if(Math.abs(d[i] - 17) + Math.abs(d[i + 1] - 17) + Math.abs(d[i + 2] - 17) > 90) { sx += (i / 4) % c.width; n++; }   // lo que no es el fondo negro
  return { w: c.width, cx: n ? sx / n : -1, n };
}, b64);
const bajarPrimera = async () => { await p.click('.rc [data-listo]'); await p.waitForFunction(() => !document.querySelector('.rc'), null, { timeout: 15000 });
  const [d] = await Promise.all([p.waitForEvent('download'), p.locator('.ficha').first().locator('[data-a="bajar"]').click()]); return readFileSync(await d.path()).toString('base64'); };
const movido = await verde(await bajarPrimera());
ok('lo que arrastras con el dedo queda así en el archivo (se fue a la derecha)', movido.n > 1000 && movido.cx > movido.w / 2 + 40, JSON.stringify(movido));
await p.locator('.ficha').first().locator('[data-a="editar"]').click();
await p.waitForSelector('.rc', { timeout: 15000 });
await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 60000 });
await p.click('.rc [data-modo="fondo"]'); await p.click('.rc [data-fondo="color"]');
await toque('touchStart', [[cx, cy]]); for(let k = 1; k <= 6; k++) await toque('touchMove', [[cx - k * 15, cy + k * 5]]); await toque('touchEnd', []);
await p.click('.rc [data-acomodo="centrar"]');
const centrado = await verde(await bajarPrimera());
ok('«Centrar» lo deja en medio aunque lo hayas movido', Math.abs(centrado.cx - centrado.w / 2) < 6, JSON.stringify(centrado));
ok('con una sola, se esconde «Descargar todas»', !(await p.locator('#bajarTodas').isVisible()));

console.log('\n· Tamaños');
const chicos = await p.evaluate(() => [...document.querySelectorAll('button, .soltar, .opcion, .volver')].filter((x) => x.offsetParent && x.getBoundingClientRect().height < 44).map((x) => x.textContent.trim().slice(0, 20)));
ok('ningún control de menos de 44 px', !chicos.length, chicos.join(' · '));
ok('no se sale a lo ancho con fichas', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
ok('ni un error de consola', !errores.length, errores.join(' | '));

await b.close();
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
