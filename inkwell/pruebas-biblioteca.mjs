/* Pruebas de la Biblioteca de INKWELL: listas, favoritas, estrellas, etiquetas, colecciones, meta, calendario,
   exportar e importar, y que Tiras y Libros apunten lo leído.  node inkwell/pruebas-biblioteca.mjs */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const BASE = `http://localhost:${srv.address().port}/`;
let bien = 0, mal = 0; const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'biblio-'));
const br = await chromium.launch();

for (const [w, h] of [[390, 844], [1280, 800]]) {
  console.log(`\n${w}×${h}`);
  const ctx = await br.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', acceptDownloads: true });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errores.push(m.text()));
  await pg.goto(BASE + 'index.html');
  /* tres series (a medias, terminada, sin empezar), un libro empezado y lo leído estos días */
  await pg.evaluate(async () => {
    const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-tiras', 1); q.onupgradeneeded = () => { q.result.createObjectStore('series', { keyPath: 'id' }); q.result.createObjectStore('caps', { keyPath: 'clave' }).createIndex('serie', 'serie'); }; q.onsuccess = () => ok(q.result); });
    const t = d.transaction('series', 'readwrite'), caps = (n) => Array.from({ length: n }, (_, k) => ({ n: k + 1, titulo: 'c' }));
    t.objectStore('series').put({ id: 'webtoon:1', fuente: 'webtoon', titulo: 'Zafiro', autor: 'Ana', orden: 0, caps: caps(20), leidos: [1, 2, 3] });
    t.objectStore('series').put({ id: 'webtoon:2', fuente: 'webtoon', titulo: 'Ámbar', autor: 'Beto', orden: 1, caps: caps(5), leidos: [1, 2, 3, 4, 5] });
    t.objectStore('series').put({ id: 'wattpad:3', fuente: 'wattpad', titulo: 'Cobre', autor: 'Cris', orden: 2, caps: caps(8), leidos: [] });
    await new Promise((ok) => { t.oncomplete = ok; });
    const { guardar } = await import('./libros.js');
    await guardar({ id: 'l1', tipo: 'txt', titulo: 'Libro empezado', autor: 'Dana', agregado: 1, avance: { cap: 1, y: .3 }, capitulos: [{ titulo: 'a', html: '<p>a</p>' }, { titulo: 'b', html: '<p>b</p>' }] });
    const hoy = Date.now(), dia = 864e5;
    localStorage.setItem('inkwell.historial', JSON.stringify([[hoy - 2 * dia, 'webtoon:1', 1], [hoy - dia, 'webtoon:1', 2], [hoy, 'webtoon:1', 3], [hoy - 200 * dia, 'webtoon:2', 1]]));
  });
  await pg.goto(BASE + 'index.html#biblioteca'); await pg.reload();
  await pg.waitForSelector('#bObras .poster');
  const chips = await pg.$$eval('#bVistas .chip', (c) => c.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(chips.includes('Todas4') && chips.includes('Leyendo2') && chips.includes('Pendientes1') && chips.includes('Terminadas1'), 'acomoda sola cada obra en su lista según cómo la llevas · ' + chips.join(' | '));
  ok((await pg.$$('#bObras .poster')).length === 4, 'en «Todas» salen las series y el libro');
  ok(await pg.$$eval('.b-cal i', (x) => x.length >= 78 && x.length <= 84), 'el calendario enseña las últimas 12 semanas');
  ok(/racha de 3 días/.test(await pg.textContent('#bResumen')), 'cuenta la racha de días seguidos leyendo');
  /* meta del mes */
  await pg.fill('#bMeta', '10'); await pg.press('#bMeta', 'Enter'); await pg.locator('#bMeta').blur();
  await pg.waitForSelector('.b-barra');
  ok(/meta 10/.test(await pg.textContent('#bResumen')) && JSON.parse(await pg.evaluate(() => localStorage.getItem('inkwell.biblio'))).meta === 10, 'la meta del mes se pone y se guarda');
  /* la hoja de una obra */
  await pg.click('#bObras .poster[data-id="wattpad:3"]'); await pg.waitForSelector('#dlgObra[open]');
  ok(/Cobre/.test(await pg.textContent('#oTitulo')) && (await pg.getAttribute('#oAbrir', 'href')) === 'tiras.html?ficha=wattpad%3A3', 'tocarla abre su hoja, con «Abrir» que lleva a su ficha');
  await pg.click('#oListas [data-l="pausa"]');
  await pg.click('#oFav');
  await pg.click('#oNota [data-n="4"]');
  await pg.fill('#oEtq', 'Romance, #Drama'); await pg.press('#oEtq', 'Enter');
  const hoja = await pg.evaluate(() => ({ pausa: document.querySelector('#oListas [data-l="pausa"]').getAttribute('aria-checked'), fav: document.querySelector('#oFav').getAttribute('aria-pressed'),
    estrellas: document.querySelectorAll('#oNota .si').length, etq: [...document.querySelectorAll('#oEtiquetas .chip')].map((c) => c.textContent.trim()) }));
  ok(hoja.pausa === 'true' && hoja.fav === 'true' && hoja.estrellas === 4, 'la mueves a «En pausa», la marcas favorita y le das 4 estrellas');
  ok(hoja.etq.join(',') === '#romance,#drama', 'las etiquetas se agregan separadas por coma, sin # y en minúsculas · ' + hoja.etq.join(' '));
  ok(!(await pg.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('dialog[open] .hoja-s')].map((d) => d.scrollWidth - d.clientWidth)) > 0)), 'la hoja no se sale de lado');
  await pg.click('#oEtiquetas [data-quita="drama"]');
  ok((await pg.$$('#oEtiquetas .chip')).length === 1, 'y se quitan con un toque');
  /* colección nueva */
  pg.once('dialog', (d) => d.accept('Para el viaje'));
  await pg.click('#cerrarObra'); await pg.click('#bNuevaCol');
  await pg.waitForSelector('#bVistas [data-v^="col:"]');
  await pg.click('#bObras .poster[data-id="webtoon:1"]'); await pg.waitForSelector('#dlgObra[open]');
  await pg.check('#oCols input'); await pg.click('#cerrarObra');
  await pg.click('#bVistas [data-v^="col:"]');
  ok((await pg.$$eval('#bObras .poster', (p) => p.map((x) => x.dataset.id))).join() === 'webtoon:1', 'una colección tuya guarda las obras que le pongas');
  /* filtros */
  await pg.click('#bVistas [data-v="pausa"]');
  ok((await pg.$$eval('#bObras .poster', (p) => p.map((x) => x.dataset.id))).join() === 'wattpad:3', '«En pausa» enseña sólo la que pusiste en pausa');
  await pg.click('#bVistas [data-v="favoritas"]');
  ok((await pg.$$('#bObras .poster .fav')).length === 1 && (await pg.$$('#bObras .poster .mini-est .ico')).length === 4, 'en favoritas sale con su corazón y sus 4 estrellas');
  await pg.click('#bVistas [data-v="todas"]'); await pg.click('#bEtiquetas [data-t="romance"]');
  ok((await pg.$$('#bObras .poster')).length === 1, 'tocar una etiqueta filtra por ella');
  await pg.click('#bEtiquetas [data-t="romance"]');
  await pg.fill('#bTexto', 'ambar');
  ok((await pg.$$eval('#bObras .poster', (p) => p.map((x) => x.dataset.id))).join() === 'webtoon:2', 'la búsqueda no se fija en acentos («ambar» encuentra «Ámbar»)');
  await pg.fill('#bTexto', ''); await pg.selectOption('#bTipo', 'libro');
  ok((await pg.$$eval('#bObras .poster', (p) => p.map((x) => x.dataset.id))).join() === 'libro:l1', 'el filtro de tipo deja sólo los libros');
  await pg.selectOption('#bTipo', 'todo'); await pg.selectOption('#bOrden', 'titulo');
  ok((await pg.$$eval('#bObras .poster b', (p) => p.map((x) => x.textContent))).join() === 'Ámbar,Cobre,Libro empezado,Zafiro', 'ordena por título como en español');
  await pg.selectOption('#bOrden', 'nota');
  ok((await pg.$$eval('#bObras .poster', (p) => p[0].dataset.id)) === 'wattpad:3', 'y por tu calificación');
  /* recomendaciones: una pendiente con la etiqueta de tu favorita */
  await pg.evaluate(() => { window.__biblio.B.cambiarObra('webtoon:1', { lista: 'pendiente', etiquetas: ['romance'] }); window.__biblio.pintarBiblio(); });
  ok(/Por tus gustos/.test(await pg.textContent('#bSugeridas')) && (await pg.$$eval('#bSugeridas .poster', (p) => p.map((x) => x.dataset.id))).join() === 'webtoon:1', 'sugiere pendientes con las etiquetas de tus favoritas (y no la favorita misma)');
  await pg.evaluate(() => { window.__biblio.B.cambiarObra('webtoon:1', { lista: null, etiquetas: [] }); window.__biblio.pintarBiblio(); });
  /* exportar e importar */
  const [baj] = await Promise.all([pg.waitForEvent('download'), pg.click('#bExportar')]);
  const ruta = path.join(tmp, `listas-${w}.json`); await baj.saveAs(ruta);
  const exp = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  ok(exp.app === 'INKWELL' && exp.obras.length === 4 && exp.obras.find((o) => o.id === 'wattpad:3').fav && exp.colecciones.length === 1, 'exporta tus listas a un archivo · ' + baj.suggestedFilename());
  await pg.evaluate(() => { localStorage.removeItem('inkwell.biblio'); localStorage.removeItem('inkwell.historial'); window.__biblio.pintarBiblio(); });
  ok((await pg.$$('#bObras .poster .fav')).length === 0, '(borradas a propósito)');
  pg.once('dialog', (d) => d.accept());
  await pg.setInputFiles('#bArchivo', ruta);
  await pg.waitForFunction(() => document.querySelectorAll('#bObras .poster .fav').length === 1);
  ok(await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('inkwell.biblio')); return d.colecciones.length === 1 && d.meta === 10 && JSON.parse(localStorage.getItem('inkwell.historial')).length === 4; }), 'importar las devuelve con colecciones, meta e historial');
  fs.writeFileSync(path.join(tmp, 'malo.json'), '{"hola":1}');
  let aviso = ''; pg.once('dialog', (d) => { aviso = d.message(); d.accept(); });
  await pg.setInputFiles('#bArchivo', path.join(tmp, 'malo.json')); await pg.waitForTimeout(300);
  ok(/no es una lista de INKWELL/.test(aviso), 'un archivo que no es de INKWELL se rechaza con su porqué');
  /* el historial cuenta cada capítulo una vez */
  ok(await pg.evaluate(() => { const B = window.__biblio.B; localStorage.removeItem('inkwell.historial'); B.apuntar('x', 1); B.apuntar('x', 1); B.apuntar('x', 2); return B.historial().length === 2; }), 'un capítulo se apunta una sola vez en tu historial');
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'la biblioteca no se sale de lado');
  if (process.env.CAPTURA) { await pg.evaluate(() => scrollTo(0, 0)); await pg.screenshot({ path: `${process.env.CAPTURA}/biblio-${w}.png`, fullPage: true }); }
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
