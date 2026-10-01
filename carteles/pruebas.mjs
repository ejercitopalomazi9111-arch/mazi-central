/* CARTELES · pruebas en un navegador de verdad (teléfono 390×844 y compu 1280×800).
   Comprueba el EFECTO de cada cosa, no que el botón exista:
   que la foto subida aparece en el cartel, que cambiar de estilo cambia los pixeles,
   que «Otra versión» da otro cartel, que la descarga es un PNG del tamaño pedido,
   que el lote hace los carteles que dice y empareja las fotos por nombre, y que la
   marca sobrevive a recargar.
     node carteles/pruebas.mjs                                                   */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TIPOS = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm', '.tflite': 'application/octet-stream' };
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(RAIZ, u); if (!f.startsWith(RAIZ)) { s.writeHead(403); s.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); s.end(d); });
}).listen(0);
const BASE = `http://localhost:${srv.address().port}/carteles/`;

let bien = 0, mal = 0;
const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

/* una foto de prueba: un plato amarillo sobre gris, hecha aquí para no depender de nada */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carteles-'));
async function fotoPrueba(pg, nombre, color) {
  const b64 = await pg.evaluate(c => { const k = document.createElement('canvas'); k.width = 800; k.height = 600; const x = k.getContext('2d'); x.fillStyle = '#777'; x.fillRect(0, 0, 800, 600); x.fillStyle = c; x.beginPath(); x.arc(400, 300, 200, 0, 7); x.fill(); return k.toDataURL('image/jpeg', .9).split(',')[1]; }, color);
  const f = path.join(tmp, nombre); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f;
}
const huella = pg => pg.evaluate(() => { const c = document.querySelector('#lienzo'), x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 997) h = (h * 31 + d[i]) >>> 0; return h; });
const desborde = pg => pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);

const br = await chromium.launch();
for (const [ancho, alto, nombre] of [[390, 844, 'teléfono'], [1280, 800, 'computadora']]) {
  console.log(`\n${nombre} ${ancho}×${alto}`);
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => m.type() === 'error' && errores.push(m.text()));
  await pg.goto(BASE); await pg.waitForFunction(() => document.querySelectorAll('#variantes img').length === 6, null, { timeout: 30000 });
  ok(true, 'arranca y pinta las seis variantes');
  ok(await desborde(pg) <= 0, 'nada se sale de la pantalla');
  const chicos = await pg.evaluate(() => [...document.querySelectorAll('button:not(.variantes button), select, input[type=text]')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.id || e.textContent.trim()));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.join(', ') : ''));

  // escribir el producto cambia el cartel
  const h0 = await huella(pg);
  await pg.fill('#p-nombre', 'Bananito'); await pg.fill('#p-precio', '$109'); await pg.fill('#p-promo', 'Promoción');
  await pg.fill('#p-ingredientes', 'Plátano natural, Arroz de sushi, Chocolate');
  await pg.waitForTimeout(500);
  const h1 = await huella(pg); ok(h1 !== h0, 'escribir el nombre y el precio cambia el cartel');

  // subir foto
  const f = await fotoPrueba(pg, 'bananito.jpg', '#F2C200');
  const [sel] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#p-foto')]); await sel.setFiles(f);
  await pg.waitForFunction(() => document.querySelector('#p-fotoVer')?.tagName === 'IMG');
  await pg.waitForTimeout(500);
  const amarillo = await pg.evaluate(() => { const c = document.querySelector('#lienzo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 170 && d[i + 1] < 215 && d[i + 2] < 60) n++; return n; });
  ok(amarillo > 20000, `la foto subida aparece en el cartel (${amarillo} pixeles del plato)`);

  // estilos y versiones
  const antes = await huella(pg);
  await pg.click('#estilos button[data-id="gigante"]'); await pg.waitForTimeout(300);
  ok(await huella(pg) !== antes, 'cambiar de estilo cambia el cartel');
  const g1 = await huella(pg); await pg.click('#otra'); await pg.waitForTimeout(300);
  ok(await huella(pg) !== g1, '«Otra versión» da otro cartel');
  await pg.click('#variantes button:nth-child(4)'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => document.querySelector('#estilos button[data-id="foto"]').getAttribute('aria-pressed')) === 'true', 'tocar una variante la elige');
  await pg.click('#formatos button[data-id="historia"]'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => [lienzo.width, lienzo.height].join('x')) === '1080x1920', 'el tamaño Historia da 1080×1920');

  // descargar
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#descargar')]);
  const ruta = await dl.path(), png = fs.readFileSync(ruta);
  ok(png.slice(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) === 1920, `«Descargar» da un PNG de 1080×1920 (${dl.suggestedFilename()})`);

  // marca: nombre y color se guardan y sobreviven a recargar
  await pg.click('[data-pestana="marca"]');
  await pg.fill('#m-nombre', 'District Roll'); await pg.fill('#m-whatsapp', '+52 461 344 1619');
  await pg.evaluate(() => { const i = document.querySelector('#m-acento'); i.value = '#ff2200'; i.dispatchEvent(new Event('input')); });
  await pg.click('#guardarMarca'); await pg.waitForTimeout(400);
  await pg.reload(); await pg.waitForFunction(() => document.querySelectorAll('#variantes img').length === 6, null, { timeout: 30000 });
  ok(await pg.inputValue('#m-nombre') === 'District Roll' && await pg.inputValue('#m-acento') === '#ff2200', 'la marca sobrevive a recargar');
  ok(await pg.inputValue('#p-nombre') === 'Bananito' && await pg.evaluate(() => document.querySelector('#p-fotoVer').tagName === 'IMG'), 'el producto y su foto también');

  // lote
  await pg.click('[data-pestana="lote"]');
  await pg.fill('#tabla', 'Producto\tPrecio\tFoto\nBananito\t$109\tbananito.jpg\nRollo Mango\t$129\tmango.jpg');
  const f2 = await fotoPrueba(pg, 'mango.jpg', '#FF8800');
  const [sel2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#subirFotos')]); await sel2.setFiles([f, f2]);
  await pg.selectOption('#porProducto', '3');
  await pg.click('#hacerLote');
  await pg.waitForFunction(() => /Listos/.test(document.querySelector('#estadoLote').textContent), null, { timeout: 60000 });
  const n = await pg.locator('#galeria img').count(), est = await pg.textContent('#estadoLote');
  ok(n === 6, `el lote hace 2 productos × 3 = ${n} carteles`);
  ok(!/sin foto/.test(est), 'las fotos se emparejan por nombre de archivo');
  const [zip] = await Promise.all([pg.waitForEvent('download'), pg.click('#bajarLote')]);
  const zb = fs.readFileSync(await zip.path());
  ok(zb.slice(0, 2).toString() === 'PK' && (zb.toString('latin1').match(/\.png/g) || []).length >= 6, `el ZIP trae los carteles (${zip.suggestedFilename()})`);
  ok(await desborde(pg) <= 0, 'el lote tampoco se sale de la pantalla');
  const tanda1 = await pg.evaluate(() => [...document.querySelectorAll('#galeria img')].map(i => i.src));
  const pixeles = srcs => pg.evaluate(async ss => Promise.all(ss.map(async s => { const b = await (await fetch(s)).arrayBuffer(); let h = 0; const v = new Uint8Array(b); for (let i = 0; i < v.length; i += 211) h = (h * 31 + v[i]) >>> 0; return h; })), srcs);
  const t1 = await pixeles(tanda1);
  await pg.fill('#tanda', '2'); await pg.click('#hacerLote');
  await pg.waitForFunction(old => /Listos/.test(document.querySelector('#estadoLote').textContent) && document.querySelector('#galeria img')?.src !== old, tanda1[0], { timeout: 60000 });
  const t2 = await pixeles(await pg.evaluate(() => [...document.querySelectorAll('#galeria img')].map(i => i.src)));
  ok(t1.filter((h, i) => h !== t2[i]).length >= 5, `otra «Tanda» da carteles distintos (${t1.filter((h, i) => h !== t2[i]).length} de 6 cambiaron)`);

  ok(!errores.length, 'ni un error en la consola' + (errores.length ? ' — ' + errores.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
