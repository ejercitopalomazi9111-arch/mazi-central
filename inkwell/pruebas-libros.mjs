/* Pruebas del lector de libros de INKWELL, en un Chromium de verdad.
   El EPUB de prueba lo arma el mismo epub() de archivos.js (lo que exportan las
   Tiras), y se le mete un <script> para ver que no pasa al lector.
   node inkwell/pruebas-libros.mjs   (CAPTURA=/carpeta guarda capturas) */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  let f = path.join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const BASE = `http://localhost:${srv.address().port}/libros.html?pruebas`;
let bien = 0, mal = 0;
const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
/* la barra vive escondida: como una persona, se toca la pantalla para que salga */
const barra = async (pg) => {
  if (await pg.evaluate(() => document.querySelector('#lector').classList.contains('sinbarra'))) {
    await pg.evaluate(() => document.querySelector('#hoja').click());
    await pg.waitForTimeout(300);
  }
};
/* una voz de mentiras: el Chromium sin pantalla no trae voces, y así se oye qué dice */
const VOZ = () => {
  const dichos = []; let t = null;
  window.SpeechSynthesisUtterance = class { constructor(x){ this.text = x; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    dichos, getVoices: () => [{ lang: 'es-MX', name: 'Paulina' }], addEventListener(){},
    cancel(){ clearTimeout(t); }, speak(u){ dichos.push(u.text); if(!window.__vozLenta) t = setTimeout(() => u.onend && u.onend(), 40); } } });
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'libros-'));
const br = await chromium.launch();

for (const [ancho, alto] of [[390, 844], [1280, 800]]) {
  console.log(`\n${ancho}×${alto}`);
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto }, serviceWorkers: 'block' });
  await ctx.addInitScript(VOZ);
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  pg.on('dialog', (d) => d.accept());
  await pg.goto(BASE);
  ok(/Tu librero está vacío/.test(await pg.textContent('#librero')), 'vacío: dice qué hacer');
  /* los archivos de prueba */
  const epub = await pg.evaluate(async () => {
    const { epub } = await import('./archivos.js');
    const caps = Array.from({ length: 3 }, (_, i) => ({ titulo: `Capítulo ${i + 1}`, html: `<p>Texto del capítulo ${i + 1}, con acentos: canción.</p>` + '<p>Relleno de lectura. </p>'.repeat(60) }));
    caps[1].html += '<script>window.__malo = 1</script><p onclick="x()">sin atributos</p>';
    const b = epub({ titulo: 'Mi novela de prueba', autor: 'Autora Equis', id: 'x', capitulos: caps });
    return [...new Uint8Array(await b.arrayBuffer())];
  });
  fs.writeFileSync(path.join(tmp, 'novela.epub'), Buffer.from(epub));
  fs.writeFileSync(path.join(tmp, 'cuento_corto.txt'), 'Capítulo 1\n\nHabía una vez un cuento.\n\nSegundo párrafo.\n\nCapítulo 2\n\nY se acabó.');
  fs.writeFileSync(path.join(tmp, 'manual.pdf'), '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  fs.writeFileSync(path.join(tmp, 'foto.png'), 'no');
  await pg.setInputFiles('#archivo', ['novela.epub', 'cuento_corto.txt', 'manual.pdf', 'foto.png'].map((n) => path.join(tmp, n)));
  await pg.waitForFunction(() => document.querySelectorAll('.libro').length === 3, null, { timeout: 15000 });
  ok(/3 libros agregados/.test(await pg.textContent('#estado')) && /no es EPUB, PDF ni TXT/.test(await pg.textContent('#estado')), 'agrega los tres y avisa del archivo que no es libro');
  const textoLibrero = await pg.textContent('#librero');
  ok(/Mi novela de prueba/.test(textoLibrero) && /Autora Equis/.test(textoLibrero), 'el EPUB trae su título y su autora');
  ok(/cuento corto/.test(textoLibrero) && /2 capítulos/.test(textoLibrero), 'el TXT se parte en sus capítulos');
  ok(/manual/.test(textoLibrero) && /PDF/.test(textoLibrero), 'el PDF queda en el librero');
  ok(/no traen portada: toca el ícono de imagen/.test(await pg.textContent('#estado')), 'avisa cuáles no traen portada y cómo ponérsela');
  /* portada propia: una foto ancha se recorta a libro (2:3) */
  const foto = Buffer.from(await pg.evaluate(async () => { const c = document.createElement('canvas'); c.width = 900; c.height = 500; const x = c.getContext('2d'); x.fillStyle = '#7E1735'; x.fillRect(0, 0, 900, 500);
    const b = await new Promise((ok) => c.toBlob(ok, 'image/png')); return [...new Uint8Array(await b.arrayBuffer())]; }));
  await pg.click('.libro:has-text("cuento corto") .cambiar-portada');
  await pg.setInputFiles('#archivoPortada', { name: 'mi-portada.png', mimeType: 'image/png', buffer: foto });
  await pg.waitForFunction(() => /ya tiene tu portada/.test(document.querySelector('#estado').textContent), null, { timeout: 8000 }).catch(() => {});
  const tapa = await pg.evaluate(async () => { const i = [...document.querySelectorAll('.libro')].find((l) => /cuento corto/.test(l.textContent))?.querySelector('.tapa img'); if(!i) return null; await i.decode().catch(() => {}); return { w: i.naturalWidth, h: i.naturalHeight }; });
  ok(tapa && Math.abs(tapa.w / tapa.h - 2 / 3) < .02, 'ponerle portada propia a un libro: se ve en el librero, recortada a forma de libro · ' + JSON.stringify(tapa));
  /* leer */
  await pg.click('.libro:has-text("Mi novela de prueba") .abrir');
  await pg.waitForSelector('#lector:not([hidden])');
  ok(/Texto del capítulo 1, con acentos: canción/.test(await pg.textContent('#texto')), 'abre en el capítulo 1 con sus acentos');
  ok(/1 de 3/.test(await pg.textContent('#lCap')), 'dice en qué capítulo vas');
  await pg.click('#siguiente');
  ok(/capítulo 2/.test(await pg.textContent('#texto')), '«Siguiente» pasa al capítulo 2');
  ok(await pg.evaluate(() => !document.querySelector('#texto script') && !document.querySelector('#texto [onclick]') && !window.__malo), 'el <script> y los atributos del EPUB no llegan al lector');
  await barra(pg); await pg.click('#botonOpciones'); await pg.click('button[data-tema="sepia"]'); await pg.click('#mas');
  ok(await pg.evaluate(() => document.querySelector('#lector').dataset.tema === 'sepia' && getComputedStyle(document.querySelector('#texto')).fontSize === '22px'), 'tema sepia y letra más grande');
  await pg.evaluate(() => { const h = document.querySelector('#hoja'); h.scrollTop = (h.scrollHeight - h.clientHeight) / 2; h.dispatchEvent(new Event('scroll')); });
  await pg.waitForTimeout(700);
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'el lector no se sale de lado');
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/libros-lector-${ancho}.png` });
  await barra(pg); await pg.click('#cerrar');
  /* vuelve a donde ibas, aunque se cierre la página */
  await pg.reload();
  await pg.waitForFunction(() => document.querySelectorAll('.libro').length === 3);
  await pg.click('.libro:has-text("Mi novela de prueba") .abrir');
  await pg.waitForSelector('#lector:not([hidden])');
  await pg.waitForTimeout(300);
  const donde = await pg.evaluate(() => { const h = document.querySelector('#hoja'); return { cap: document.querySelector('#lCap').textContent, y: h.scrollTop / (h.scrollHeight - h.clientHeight) }; });
  ok(/2 de 3/.test(donde.cap) && Math.abs(donde.y - 0.5) < 0.08, `regresa al capítulo y al lugar donde ibas (${donde.cap}, ${Math.round(donde.y * 100)} %)`);
  ok(await pg.evaluate(() => document.querySelector('#lector').dataset.tema) === 'sepia', 'y recuerda el tema');
  await barra(pg); await pg.click('#botonOpciones'); await pg.selectOption('#capitulos', '2');
  ok(/capítulo 3/.test(await pg.textContent('#texto')) && await pg.isDisabled('#siguiente'), 'el índice salta al último capítulo y «Siguiente» se apaga');
  await barra(pg); await pg.click('#cerrar');
  /* el PDF abre en el visor del teléfono */
  const [pop] = await Promise.all([pg.waitForEvent('popup', { timeout: 5000 }).catch(() => null), pg.click('.libro:has-text("manual") .abrir')]);
  if (pop) await pop.waitForLoadState().catch(() => {});
  ok(!!pop, 'el PDF se abre en otra pestaña, en el visor del teléfono (el Chromium sin pantalla no trae visor de PDF: basta con que abra)' + (pop ? ' · ' + pop.url().slice(0, 30) : ' · no abrió'));
  if (pop) await pop.close();
  /* texto a voz */
  await pg.click('.libro:has-text("Mi novela de prueba") .abrir'); await pg.waitForSelector('#lector:not([hidden])');
  ok(await pg.evaluate(() => document.querySelector('#lector').classList.contains('sinbarra')), 'el libro abre a pantalla completa: la barra sale sólo con un toque');
  await pg.evaluate(() => document.querySelector('#hoja').click()); await pg.waitForTimeout(250);
  ok(!(await pg.evaluate(() => document.querySelector('#lector').classList.contains('sinbarra'))), 'un toque saca la barra');
  await pg.click('#escuchar'); await pg.waitForTimeout(400);
  const v1 = await pg.evaluate(() => ({ visible: !document.querySelector('#voz').hidden, dichos: speechSynthesis.dichos.slice(), marcado: !!document.querySelector('#texto .leyendo') }));
  ok(v1.visible && v1.dichos.length >= 3 && v1.marcado, `«Escuchar» lee párrafo tras párrafo y marca el que va (${v1.dichos.length} leídos)`);
  const elegido = await pg.evaluate(() => { const ps = [...document.querySelectorAll('#texto p')]; const p = ps[ps.length - 5]; p.click(); return p.textContent.trim(); });
  await pg.waitForTimeout(60);
  ok(await pg.evaluate((t) => speechSynthesis.dichos.includes(t), elegido), 'tocar un párrafo la manda a leer desde ahí');
  await pg.click('#vozVel');
  ok(/1,25×/.test(await pg.textContent('#vozVel')), 'la velocidad se cambia (1,25×)');
  await pg.click('#vozPausa');
  ok(await pg.getAttribute('#vozPausa', 'aria-label') === 'Seguir escuchando', 'se puede pausar');
  const guardado = await pg.evaluate(async () => { const l = (await window.__libros.todos()).find((x) => x.titulo === 'Mi novela de prueba'); return l.voz; });
  await pg.click('#vozParar');
  await pg.reload(); await pg.waitForFunction(() => document.querySelectorAll('.libro').length === 3);
  await pg.click('.libro:has-text("Mi novela de prueba") .abrir'); await pg.waitForSelector('#lector:not([hidden])'); await pg.waitForTimeout(300);
  await barra(pg); await pg.click('#escuchar'); await pg.waitForTimeout(20);
  const reanuda = await pg.evaluate((g) => { const bs = [...document.querySelectorAll('#texto p, #texto li, #texto h1, #texto h2, #texto h3, #texto h4, #texto blockquote')].filter((x) => x.textContent.trim()); return speechSynthesis.dichos[0] === bs[g.p]?.textContent.trim(); }, guardado);
  ok(guardado && reanuda, `al volver, la voz sigue donde se quedó (capítulo ${guardado && guardado.cap + 1}, párrafo ${guardado && guardado.p + 1})`);
  /* cambiar de capítulo con la voz prendida: sigue leyendo en el nuevo (Carlos, 11 nov) */
  await pg.click('#vozParar'); await barra(pg);
  await pg.evaluate(() => { window.__vozLenta = true; });
  await pg.click('#escuchar'); await barra(pg);
  const capAntes = await pg.textContent('#lCap');
  await pg.evaluate(() => { speechSynthesis.dichos.length = 0; });
  await pg.click(capAntes.includes('3 de 3') ? '#anterior' : '#siguiente'); await pg.waitForTimeout(150);
  const sigue = await pg.evaluate(() => { const b = [...document.querySelectorAll('#texto p, #texto li, #texto h1, #texto h2, #texto h3, #texto h4, #texto blockquote')].filter((x) => x.textContent.trim())[0];
    return { d0: speechSynthesis.dichos.slice(0, 2), b0: b?.textContent.trim().slice(0, 40), dice: speechSynthesis.dichos[0] === b?.textContent.trim(), voz: !document.querySelector('#voz').hidden, cap: document.querySelector('#lCap').textContent }; });
  ok(sigue.dice && sigue.voz && sigue.cap !== capAntes, 'al cambiar de capítulo con la voz prendida, sigue leyendo el nuevo desde el principio · ' + JSON.stringify(sigue));
  await pg.evaluate(() => { window.__vozLenta = false; });
  await pg.click('#vozParar'); await barra(pg); await pg.click('#cerrar');
  /* quitar */
  await pg.click('.libro:has-text("cuento corto") .quitar');
  await pg.waitForFunction(() => document.querySelectorAll('.libro').length === 2);
  ok(/Quitaste/.test(await pg.textContent('#estado')), '«Quitar» lo saca del librero (con confirmación)');
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'la página no se sale de lado');
  const chicos = await pg.$$eval('button, .subir, .nav a', (els) => els.filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 44 || e.getBoundingClientRect().width < 44)).map((e) => e.textContent.trim() || e.getAttribute('aria-label')));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.join(', ') : ''));
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/libros-${ancho}.png`, fullPage: true });
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
