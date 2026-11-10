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
  const ctx = await br.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' }); /* sin La Sala de verdad en las pruebas: «Para ti» se queda escondido */
  await ctx.route(/sala\.palomazi9111\.workers\.dev|\/api\/sala\//, (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  const pg = await ctx.newPage(); const errores = [];
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
  /* perfil */
  await pg.goto(BASE + 'index.html#perfil'); await pg.waitForFunction(() => document.querySelectorAll('#stats .stat').length === 4);
  const st = await pg.$$eval('#stats .stat b', (bs) => bs.map((b) => +b.textContent));
  ok(st[0] === 2 && st[1] === 8 && st[2] === 1 && st[3] === 0, `el perfil cuenta tus series, capítulos leídos, libros y obras (${st.join(', ')})`);
  await pg.fill('#miNombre', 'Carlos'); await pg.click('#avatares [data-q="robot"]');
  await pg.reload(); await pg.waitForFunction(() => document.querySelectorAll('#stats .stat').length === 4);
  ok(await pg.inputValue('#miNombre') === 'Carlos' && /robot/.test(await pg.getAttribute('#avatarImg', 'src')), 'tu nombre y tu foto se quedan');
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'el perfil no se sale de lado');
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/perfil-${w}.png`, fullPage: true });
  /* el banner pasa solo a la siguiente serie cada 10 s (con el reloj adelantado) */
  await pg.goto(BASE + 'index.html');
  await pg.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 30; c.height = 40; c.getContext('2d').fillRect(0, 0, 30, 40);
    const b = await new Promise((ok) => c.toBlob(ok, 'image/png'));
    const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-tiras', 1); q.onsuccess = () => ok(q.result); });
    const t = d.transaction('series', 'readwrite'), st = t.objectStore('series');
    for (const id of ['webtoon:1', 'webtoon:2']) { const r = await new Promise((ok) => { const g = st.get(id); g.onsuccess = () => ok(g.result); }); r.portadaBlob = b; st.put(r); }
    await new Promise((ok) => { t.oncomplete = ok; });
  });
  const pg2 = await ctx.newPage(); await pg2.clock.install(); await pg2.goto(BASE + 'index.html');
  await pg2.waitForFunction(() => document.querySelectorAll('#pistas .diapo').length === 2);
  await pg2.evaluate(() => { document.querySelector('#pistas').style.scrollBehavior = 'auto'; });
  const x0 = await pg2.evaluate(() => document.querySelector('#pistas').scrollLeft);
  await pg2.clock.runFor(10500); await pg2.waitForTimeout(400);
  const x1 = await pg2.evaluate(() => document.querySelector('#pistas').scrollLeft);
  ok(x0 === 0 && x1 > 100, `el banner cambia solo de serie a los 10 segundos (${x0} → ${Math.round(x1)})`);
  await pg2.close();
  /* claro ↔ oscuro: con su animación de círculo, y se guarda */
  await pg.evaluate(() => { window.__vt = 0; const o = document.startViewTransition.bind(document); document.startViewTransition = (f) => { window.__vt++; return o(f); }; });
  const antes = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await pg.click('#tema');
  await pg.waitForTimeout(300);
  const aMitad = await pg.evaluate(() => document.documentElement.classList.contains('vt-tema'));
  await pg.waitForTimeout(1200);
  const despues = await pg.evaluate(() => ({ fondo: getComputedStyle(document.body).backgroundColor, vt: window.__vt, clase: document.documentElement.classList.contains('vt-tema'), guardado: localStorage.getItem('inkwell.tema') }));
  ok(despues.vt === 1 && aMitad && !despues.clase, 'el cambio de tema va con su animación y al terminar no deja nada puesto');
  ok(despues.fondo !== antes && /claro|oscuro/.test(despues.guardado), `cambia el tema y lo guarda · ${antes} → ${despues.fondo}`);
  await pg.click('#tema'); await pg.waitForTimeout(1300);
  ok((await pg.evaluate(() => getComputedStyle(document.body).backgroundColor)) === antes, 'y regresa al tocar otra vez');
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close();
}
/* «Para ti»: sin buscar nada, el inicio y Explorar enseñan series que todavía no sigues */
console.log('\npara ti');
{
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const png = fs.readFileSync(path.join(RAIZ, 'icon-192.png'));
  const tarjeta = (n, t) => `<li><a href="https://www.webtoons.com/es/romance/serie-${n}/list?title_no=${n}" class="link"><img src="https://swebtoon-phinf.pstatic.net/p${n}.jpg"><strong class="title">${t}</strong><div class="author">Autora ${n}</div></a></li>`;
  await ctx.route(/sala\.palomazi9111\.workers\.dev|\/api\/sala\//, (r) => {
    const u = new URL(r.request().url()).searchParams.get('url') || '';
    if (/\/genres\//.test(u)) return r.fulfill({ contentType: 'text/html', body: `<ul>${tarjeta(101, 'La que sigues')}${tarjeta(102, 'Nueva uno')}${tarjeta(103, 'Nueva dos')}</ul>` });
    if (/pstatic/.test(u)) return r.fulfill({ contentType: 'image/png', body: png });
    return r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', (e) => errores.push(e.message));
  await pg.goto(BASE + 'index.html');
  await pg.evaluate(async () => {
    localStorage.removeItem('inkwell.recomendadas');
    const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-tiras', 1); q.onupgradeneeded = () => { q.result.createObjectStore('series', { keyPath: 'id' }); q.result.createObjectStore('caps', { keyPath: 'clave' }).createIndex('serie', 'serie'); }; q.onsuccess = () => ok(q.result); });
    const t = d.transaction('series', 'readwrite');
    t.objectStore('series').put({ id: 'webtoon:101', fuente: 'webtoon', titulo: 'La que sigues', orden: 0, caps: [{ n: 1 }], leidos: [], ref: { fuente: 'webtoon', lang: 'es', genero: 'romance', slug: 'serie-101', titleNo: '101' } });
    await new Promise((ok) => { t.oncomplete = ok; });
  });
  await pg.reload();
  await pg.waitForFunction(() => !document.querySelector('#bloqueParaTi').hidden, null, { timeout: 15000 }).catch(() => {});
  const ti = await pg.$$eval('#paraTi .poster', (a) => a.map((x) => ({ t: x.querySelector('b').textContent, h: x.getAttribute('href') })));
  ok(ti.length === 2 && ti.every((x) => /^Nueva/.test(x.t)), 'el inicio enseña series que no sigues, sin buscar · ' + ti.map((x) => x.t).join(', '));
  ok(ti[0] && ti[0].h.startsWith('tiras.html?ver=') && decodeURIComponent(ti[0].h).includes('title_no=102'), 'tocar una abre su ficha de Explorar');
  await pg.locator('#paraTi').scrollIntoViewIfNeeded();
  await pg.waitForFunction(() => document.querySelector('#paraTi .poster img'), null, { timeout: 10000 }).catch(() => {});
  ok(!!(await pg.$('#paraTi .poster img')), 'con su portada');
  ok(await pg.evaluate(() => !document.querySelector('#v-inicio .avance, #v-inicio .plumilla, #v-inicio [role=progressbar]') && !/por leer| de \d+ cap/i.test(document.querySelector('#v-inicio').textContent)), 'el inicio no enseña cuánto le falta a una serie (sólo en los submenús)');
  await pg.goto(BASE + 'index.html#explorar'); await pg.reload();
  await pg.waitForFunction(() => document.querySelectorAll('#explorarTi .poster').length === 2, null, { timeout: 15000 }).catch(() => {});
  ok((await pg.$$('#explorarTi .poster')).length === 2 && await pg.isVisible('#explorarTi'), 'Explorar también trae recomendaciones de base');
  ok(!(await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'no se sale de lado');
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close();
console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
