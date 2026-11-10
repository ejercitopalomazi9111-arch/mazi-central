/* Pruebas del inicio de INKWELL: «Seguir leyendo» deja escoger serie, todo seguido o un libro.
   node inkwell/pruebas-inicio.mjs */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const BASE = `http://localhost:${srv.address().port}/`;
let bien = 0, mal = 0; const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const br = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 800]]) {
  console.log(`\n${w}×${h}`);
  const ctx = await br.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' }); const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errores.push(m.text()));
  await pg.goto(BASE + 'index.html');
  await pg.click('#seguirLeyendo'); await pg.waitForSelector('#dlgSeguir[open]');
  ok(/Nada a medias/.test(await pg.textContent('#opcionesSeguir')), 'sin nada empezado, lo dice');
  await pg.click('#cerrarSeguir');
  /* una serie a medias, una terminada y un libro empezado */
  await pg.evaluate(async () => {
    const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-tiras', 1); q.onupgradeneeded = () => { q.result.createObjectStore('series', { keyPath: 'id' }); q.result.createObjectStore('caps', { keyPath: 'clave' }).createIndex('serie', 'serie'); }; q.onsuccess = () => ok(q.result); });
    const t = d.transaction('series', 'readwrite');
    const caps = (n) => Array.from({ length: n }, (_, k) => ({ n: k + 1, titulo: 'c' }));
    t.objectStore('series').put({ id: 'webtoon:1', fuente: 'webtoon', titulo: 'Serie a medias', orden: 0, caps: caps(20), leidos: [1, 2, 3] });
    t.objectStore('series').put({ id: 'webtoon:2', fuente: 'webtoon', titulo: 'Serie terminada', orden: 1, caps: caps(5), leidos: [1, 2, 3, 4, 5] });
    await new Promise((ok) => { t.oncomplete = ok; });
    const { guardar } = await import('./libros.js');
    await guardar({ id: 'l1', tipo: 'txt', titulo: 'Libro empezado', autor: '', agregado: 1, avance: { cap: 1, y: .3 }, capitulos: [{ titulo: 'a', html: '<p>a</p>' }, { titulo: 'b', html: '<p>b</p>' }] });
  });
  await pg.reload();
  await pg.click('#seguirLeyendo'); await pg.waitForSelector('#dlgSeguir[open]');
  const ops = await pg.$$eval('#opcionesSeguir a', (as) => as.map((a) => ({ t: a.textContent.trim(), h: a.getAttribute('href') })));
  ok(ops.some((o) => /Todo seguido/.test(o.t) && o.h === 'tiras.html?leer=todo'), 'ofrece leer todo seguido');
  ok(ops.some((o) => /Serie a medias/.test(o.t) && /cap\. 4 de 20/.test(o.t) && o.h === 'tiras.html?leer=webtoon%3A1'), 'ofrece la serie a medias, con en qué capítulo vas');
  ok(!ops.some((o) => /Serie terminada/.test(o.t)), 'no ofrece la que ya terminaste');
  ok(ops.some((o) => /Libro empezado/.test(o.t) && /Capítulo 2 de 2/.test(o.t) && o.h === 'libros.html?abrir=l1'), 'y el libro que vas leyendo');
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'no se sale de lado');
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/inicio-seguir-${w}.png` });
  await pg.click('#opcionesSeguir a[href^="libros.html"]');
  await pg.waitForSelector('#lector:not([hidden])', { timeout: 8000 }).catch(() => {});
  ok(await pg.evaluate(() => location.pathname.endsWith('libros.html') && !document.querySelector('#lector').hidden && /2 de 2/.test(document.querySelector('#lCap').textContent)), 'tocar el libro lo abre en el capítulo donde ibas');
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close();
console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
