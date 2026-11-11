/* Pruebas del cómic animado (studio/video.js): el orden de lectura, el guion, la vista previa y que de verdad
   salga un archivo de video.  node inkwell/pruebas-video.mjs */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const BASE = `http://localhost:${srv.address().port}/`;
let bien = 0, mal = 0; const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
const pg = await ctx.newPage(); const errores = [];
pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errores.push(m.text()));
await pg.goto(BASE + 'studio/');

console.log('orden de lectura');
const orden = await pg.evaluate(async () => {
  const V = await import('./video.js');
  /* una página de 4: arriba izquierda, arriba derecha, abajo izquierda, abajo derecha (puestas en desorden y un poco chuecas) */
  const ms = [{ id: 'd', x: 410, y: 610, w: 360, h: 500 }, { id: 'a', x: 30, y: 40, w: 360, h: 520 }, { id: 'c', x: 30, y: 620, w: 360, h: 480 }, { id: 'b', x: 410, y: 55, w: 360, h: 500 }];
  return V.ordenLectura(ms).map((m) => m.id).join('');
});
ok(orden === 'abcd', 'las viñetas se leen por renglones y de izquierda a derecha · ' + orden);

console.log('\nguion, vista previa y video');
const id = await pg.evaluate(async () => {
  const O = await import('./obras.js');
  const o = O.nueva('comic', 'La prueba', 'vertical'), p = o.paginas[0];
  const k = (x) => ({ id: Math.random().toString(36).slice(2), rot: 0, opac: 1, filtro: {}, ...x });
  p.capas.push(
    k({ tipo: 'marco', x: 30, y: 30, w: p.ancho - 60, h: 560, grosor: 8, color: '#111111', relleno: '#cfe3ff' }),
    k({ tipo: 'marco', x: 30, y: 640, w: p.ancho - 60, h: 560, grosor: 8, color: '#111111', relleno: '#ffd9cf' }),
    k({ tipo: 'globo', x: 80, y: 80, w: 360, h: 180, estilo: 'normal', texto: '¿Quién anda ahí?', letra: 'Archivo', tam: 30, cola: 'abajo' }),
    k({ tipo: 'globo', x: 300, y: 300, w: 360, h: 180, estilo: 'normal', texto: 'Soy yo.', letra: 'Archivo', tam: 30, cola: 'abajo' }),
    k({ tipo: 'ono', x: 200, y: 800, w: 420, h: 160, rot: -8, texto: '¡BOOM!', letra: 'Bangers', color: '#FFD400', borde: '#111111', grosor: 10 }));
  await O.guardar(o); return o.id;
});
await pg.goto(BASE + 'studio/comic.html?obra=' + encodeURIComponent(id));
await pg.waitForFunction(() => window.__comic);
const g = await pg.evaluate(async () => {
  const V = await import('./video.js'), G = await V.armarGuion(window.__comic.obra, { velocidad: 'rapido' });
  return { tomas: G.tomas.map((t) => ({ items: t.items.length, sacude: t.items.some((i) => i.sacude), dura: t.dura })), total: V.duracion(G) };
});
ok(g.tomas.length === 2 && g.tomas[0].items === 2 && g.tomas[1].items === 1, 'dos viñetas → dos tomas, cada una con SUS globos · ' + JSON.stringify(g.tomas.map((t) => t.items)));
ok(g.tomas[1].sacude && !g.tomas[0].sacude, 'la toma con onomatopeya sacude la cámara');
ok(g.total > 6 && g.total < 20, `dura lo justo para leer · ${g.total.toFixed(1)} s`);
/* el menú → la ventana del video */
await pg.click('#menuBtn, [data-h="menu"], #abrirMenu').catch(() => {});
await pg.evaluate(() => document.querySelector('#dlgMenu').showModal());
await pg.click('#abrirVideo');
await pg.waitForFunction(() => /toma/.test(document.querySelector('#vidAviso').textContent), null, { timeout: 15000 });
ok(/2 tomas/.test(await pg.textContent('#vidAviso')), 'la ventana dice cuántas tomas y cuánto dura · ' + (await pg.textContent('#vidAviso')));
/* cuadros: portada, la primera toma con su globo ya puesto, y que el globo de la toma 1 NO esté antes de tiempo */
const px = await pg.evaluate(async () => {
  const V = await import('./video.js'), G = await V.armarGuion(window.__comic.obra, { velocidad: 'normal' });
  const pluma = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = '../marca/pluma.png'; });
  const c = document.createElement('canvas'); c.width = 360; c.height = 640; const x = c.getContext('2d');
  const muestra = (t) => { V.pintarCuadro(x, G, t, { W: 360, H: 640, pluma }); const d = x.getImageData(0, 0, 360, 640).data; let claros = 0, dist = new Set(); for (let i = 0; i < d.length; i += 16) { if (d[i] + d[i + 1] + d[i + 2] > 600) claros++; dist.add((d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5)); } return { claros, colores: dist.size }; };
  return { portada: muestra(1), toma0inicio: muestra(2.2 + .3), toma0llena: muestra(2.2 + G.tomas[0].dura - .1), cierre: muestra(V.duracion(G) - .5) };
});
ok(px.portada.claros > 200, 'la portada pinta el título');
ok(px.toma0llena.colores > px.toma0inicio.colores || px.toma0llena.claros > px.toma0inicio.claros, 'los globos aparecen a su tiempo, no desde el principio');
ok(px.toma0inicio.colores > 3, 'la toma enseña la viñeta (no un cuadro vacío)');
ok(px.cierre.claros > 200, 'el cierre dice «Hecho en Inkwell»');
if (process.env.CAPTURA) await pg.screenshot({ path: process.env.CAPTURA + '/video.png' });
ok(!(await pg.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('dialog[open] .dlg')].map((d) => d.scrollWidth - d.clientWidth)) > 1)), 'la ventana del video no se sale de lado');
/* portada propia del cómic (desde el menú) */
await pg.evaluate(() => document.querySelector('#dlgVideo').close());
await pg.evaluate(() => document.querySelector('#dlgMenu').showModal());
const fotoC = Buffer.from(await pg.evaluate(async () => { const c = document.createElement('canvas'); c.width = 400; c.height = 600; c.getContext('2d').fillStyle = '#AC27FF'; c.getContext('2d').fillRect(0, 0, 400, 600);
  const b = await new Promise((ok) => c.toBlob(ok, 'image/png')); return [...new Uint8Array(await b.arrayBuffer())]; }));
await pg.setInputFiles('#archivoPortadaC', { name: 'portada.png', mimeType: 'image/png', buffer: fotoC });
await pg.waitForFunction(() => /ya tiene su portada/.test(document.querySelector('#avisoMenu').textContent), null, { timeout: 8000 }).catch(() => {});
ok(await pg.evaluate(async () => { const o = window.__comic.obra; if(!o.portadaPropia || o.portada !== o.portadaPropia) return false; const b = await createImageBitmap(o.portada); return b.height / b.width > 1.4; }), 'el cómic acepta portada propia y la usa en lugar de la página 1');
await pg.evaluate(() => { document.querySelector('#dlgMenu').close(); document.querySelector('#dlgVideo').showModal(); });
/* grabar de verdad (rápido, para que la prueba no tarde) */
await pg.click('#dlgVideo [data-vel="rapido"]');
await pg.waitForFunction(() => /toma/.test(document.querySelector('#vidAviso').textContent));
const baja = pg.waitForEvent('download', { timeout: 60000 }).catch(() => null);
await pg.click('#vidGrabar');
await pg.waitForFunction(() => /Listo|No se pudo/.test(document.querySelector('#vidAviso').textContent), null, { timeout: 60000 });
const aviso = await pg.textContent('#vidAviso'), d = await baja;
const info = await pg.evaluate(() => window.__ultimoVideo ? { n: window.__ultimoVideo.size, tipo: window.__ultimoVideo.type, nombre: window.__ultimoVideo.name } : null);
ok(info && info.n > 20000 && /^video\//.test(info.tipo), 'sale un archivo de video de verdad · ' + aviso);
ok(!!d && /\(video\)\.(mp4|webm)$/.test(d.suggestedFilename()), 'y se descarga con el nombre de la obra · ' + (d && d.suggestedFilename()));
ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
await br.close(); srv.close();
console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
