/* Pruebas de INKWELL Studio en un Chromium de verdad: escribir un libro y hacer un cómic
   de punta a punta, como lo haría una persona.   node inkwell/pruebas-studio.mjs   (CAPTURA=/carpeta) */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(RAIZ) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const BASE = `http://localhost:${srv.address().port}/`;
let bien = 0, mal = 0; const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const desborde = (pg) => pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const br = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 800]]) {
  console.log(`\n${w}×${h}`);
  const ctx = await br.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', acceptDownloads: true });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  pg.on('dialog', (d) => d.accept());
  await pg.goto(BASE + 'studio/');
  await pg.waitForFunction(() => /Todavía no tienes obras/.test(document.querySelector('#obras').textContent), null, { timeout: 10000 }).catch(() => {});
  ok(/Todavía no tienes obras/.test(await pg.textContent('#obras')), 'Studio vacío dice cómo empezar');
  ok(!(await desborde(pg)), 'Studio no se sale de lado');

  /* ── libro ── */
  await pg.click('#nuevoLibro'); await pg.fill('#nTitulo', 'La novela de prueba'); await pg.click('#nCrear');
  await pg.waitForURL(/libro\.html\?obra=/); await pg.waitForSelector('#editor');
  await pg.fill('#capTitulo', 'El comienzo');
  await pg.click('#editor'); await pg.keyboard.type('Había una vez una lectora.');
  await pg.click('.herr [data-cmd="bold"]'); await pg.keyboard.type(' Fuerte');
  await pg.click('#nuevoCap'); await pg.keyboard.type('Segundo capítulo con canción.');
  await pg.waitForTimeout(900);
  ok(/2\. Capítulo 2/.test(await pg.textContent('#caps')) && /1\. El comienzo/.test(await pg.textContent('#caps')), 'capítulos con su título, y se agregan');
  await pg.reload(); await pg.waitForSelector('#editor');
  ok(/Había una vez una lectora/.test(await pg.textContent('#editor')) && await pg.evaluate(() => !!document.querySelector('#editor b, #editor strong')), 'se guarda solo, con su formato, al cerrar y abrir');
  await pg.click('#caps button[data-i="1"]');
  ok(/Segundo capítulo con canción/.test(await pg.textContent('#editor')), 'el segundo capítulo también quedó');
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/studio-libro-${w}.png` });
  ok(!(await desborde(pg)), 'el editor de libro no se sale de lado');
  await pg.click('#botonMenu'); await pg.fill('#autor', 'Autora de prueba');
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 8000 }).catch(() => null), pg.click('#exportar')]);
  ok(dl && /La novela de prueba\.epub$/.test(dl.suggestedFilename()), 'se descarga en EPUB');
  await pg.click('#alLibrero'); await pg.waitForFunction(() => /ya está en tu librero/.test(document.querySelector('#avisoMenu').textContent));
  await pg.goto(BASE + 'libros.html?pruebas'); await pg.waitForSelector('.libro');
  ok(/La novela de prueba/.test(await pg.textContent('#librero')) && /STUDIO/.test(await pg.textContent('#librero')), 'y pasa a tu librero para leerlo en Libros');
  await pg.click('.libro:has-text("La novela de prueba") .abrir'); await pg.waitForSelector('#lector:not([hidden])');
  ok(/Había una vez una lectora/.test(await pg.textContent('#texto')), 'se lee en el lector de Libros');

  /* ── cómic ── */
  await pg.goto(BASE + 'studio/');
  await pg.click('#nuevoComic'); await pg.fill('#nTitulo', 'Mi manhwa'); await pg.selectOption('#nFormato', 'vertical'); await pg.click('#nCrear');
  await pg.waitForURL(/comic\.html\?obra=/); await pg.waitForFunction(() => window.__comic);
  const n = () => pg.evaluate(() => window.__comic.pag().capas.length);
  await pg.click('[data-h="fondo"]'); await pg.click('#elegir button[data-fondo]');
  await pg.waitForFunction(() => window.__comic.pag().capas.length === 1);
  ok(await pg.evaluate(() => window.__comic.pag().capas[0].fondo && window.__comic.pag().capas[0].w >= 800), 'fondo que cubre toda la página');
  await pg.click('#props [data-a="cerrar"]');
  await pg.click('[data-h="personaje"]'); await pg.click('#elegir button[data-quien="female-person"]');
  await pg.waitForFunction(() => window.__comic.pag().capas.length === 2);
  await pg.click('#props button[data-pose="talk"]');
  ok(await pg.evaluate(() => window.__comic.capa().pose === 'talk'), 'personaje con 45 poses: cambia a «Hablando»');
  await pg.click('#props [data-a="cerrar"]');
  await pg.click('[data-h="globo"]'); await pg.fill('#props textarea', '¡Hola, mundo!');
  await pg.click('#props [data-estilo="grito"]'); await pg.click('#props [data-cola="abajo-der"]');
  ok(await pg.evaluate(() => { const c = window.__comic.capa(); return c.texto === '¡Hola, mundo!' && c.estilo === 'grito' && c.cola === 'abajo-der'; }), 'globo de diálogo: texto, tipo «Grito» y cola');
  await pg.click('#props [data-a="cerrar"]');
  await pg.click('[data-h="ono"]'); await pg.fill('#props textarea', '¡CRASH!');
  await pg.click('#props [data-a="cerrar"]');
  await pg.click('[data-h="vestidor"]'); await pg.selectOption('#piezas select[data-pieza="pelo"]', 'hair/braid');
  await pg.selectOption('#vDir', '3'); await pg.click('#vestListo');
  await pg.waitForFunction(() => window.__comic.pag().capas.length === 5);
  ok(await pg.evaluate(() => { const c = window.__comic.capa(); return c.tipo === 'lpc' && c.partes.pelo.base === 'hair/braid' && c.dir === '3'; }), 'vestidor: personaje propio con peinado y vista elegidos');
  ok(await pg.evaluate(() => { const v = document.querySelector('#vistaVest').getContext('2d').getImageData(0, 0, 64, 64).data; let n = 0; for (let i = 3; i < v.length; i += 4) if (v[i]) n++; return n > 300; }), 'el vestidor sí pinta al personaje (no sale en blanco)');
  /* mover con el dedo y deshacer */
  const antes = await pg.evaluate(() => { const c = window.__comic.capa(); return { x: c.x, y: c.y }; });
  const caja = await pg.evaluate(() => { const c = window.__comic.capa(), r = document.querySelector('#marco').getBoundingClientRect(), k = r.width / window.__comic.pag().ancho; return { x: r.left + (c.x + c.w / 2) * k, y: r.top + (c.y + c.h / 2) * k }; });
  await pg.click('#props [data-a="cerrar"]');
  await pg.mouse.move(caja.x, caja.y); await pg.mouse.down(); await pg.mouse.move(caja.x + 40, caja.y + 30, { steps: 5 }); await pg.mouse.up();
  const despues = await pg.evaluate(() => { const c = window.__comic.pag().capas.at(-1); return { x: c.x, y: c.y }; });
  ok(despues.x > antes.x + 20 && despues.y > antes.y + 15, 'se mueve arrastrando con el dedo');
  ok(await pg.evaluate(() => document.querySelector('#props').hidden), 'arrastrar no abre el panel de la capa (estorbaba en el teléfono)');
  { const p2 = await pg.evaluate(() => { const c = window.__comic.pag().capas.at(-1), r = document.querySelector('#marco').getBoundingClientRect(), k = r.width / window.__comic.pag().ancho; return { x: r.left + (c.x + c.w / 2) * k, y: r.top + (c.y + c.h / 2) * k }; });
    await pg.mouse.click(p2.x, p2.y); }
  ok(await pg.evaluate(() => !document.querySelector('#props').hidden), 'un toque sin mover sí lo abre');
  await pg.click('#props [data-a="cerrar"]');
  await pg.click('#deshacer');
  const des = await pg.evaluate(() => { const c = window.__comic.pag().capas.at(-1); return { x: c.x, y: c.y }; });
  ok(des.x === antes.x && des.y === antes.y, '«Deshacer» lo regresa');
  /* lo que se pinta */
  const pinto = await pg.evaluate(() => { const c = document.querySelector('#lienzo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let blanco = 0; for (let i = 0; i < d.length; i += 400) if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) blanco++; return blanco / (d.length / 400); });
  ok(pinto < 0.6, `la página se pinta con sus capas (blanco: ${Math.round(pinto * 100)} %)`);
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/studio-comic-${w}.png` });
  ok(!(await desborde(pg)), 'el editor de cómic no se sale de lado');
  /* páginas, guardado y exportar */
  if (await pg.isVisible('#props')) await pg.click('#props [data-a="cerrar"]');
  await pg.click('#nuevaPag'); await pg.waitForFunction(() => window.__comic.obra.paginas.length === 2);
  ok(await pg.evaluate(() => window.__comic.pag().capas.length === 0), 'página nueva en blanco');
  /* viñetas: una plantilla de 4, un fondo metido en la viñeta 1 y un efecto */
  await pg.click('[data-h="pagina"]'); await pg.click('#props [data-plantilla="4"]');
  await pg.waitForFunction(() => window.__comic.pag().capas.filter((c) => c.tipo === 'marco').length === 4);
  ok(true, 'la plantilla «Cuatro» pone 4 viñetas');
  await pg.click('#props [data-a="cerrar"]');
  await pg.click('[data-h="fondo"]'); await pg.click('#elegir button[data-fondo*="castles"]');
  await pg.waitForFunction(() => window.__comic.pag().capas.length === 5);
  await pg.click('#props button[data-clip]:not([data-clip=""])');
  await pg.waitForTimeout(400);
  const recorte = await pg.evaluate(() => { const c = document.querySelector('#lienzo'), p = window.__comic.pag(), k = c.width / p.ancho, ctx = c.getContext('2d');
    const m = p.capas.filter((x) => x.tipo === 'marco'); const px = (q) => [...ctx.getImageData(Math.round((q.x + q.w / 2) * k), Math.round((q.y + q.h / 2) * k), 1, 1).data];
    return { dentro: px(m[0]), fuera: px(m[3]) }; });
  ok(recorte.fuera.slice(0, 3).every((v) => v > 245) && !recorte.dentro.slice(0, 3).every((v) => v > 245), 'el fondo metido en la viñeta 1 no se sale a las demás');
  await pg.click('#props [data-a="cerrar"]');
  await pg.click('[data-h="efecto"]'); await pg.click('#props [data-modo="noche"]');
  ok(await pg.evaluate(() => window.__comic.capa().tipo === 'efecto' && window.__comic.capa().modo === 'noche'), 'efecto de página: «Noche»');
  await pg.click('#props [data-a="cerrar"]');
  if (process.env.CAPTURA) { await pg.waitForTimeout(300); await pg.screenshot({ path: `${process.env.CAPTURA}/studio-vinetas-${w}.png` }); }
  /* mesa de dibujo: un trazo, una capa nueva, cubeta, deshacer y «Listo» lo mete a la página donde se pintó */
  const antesDib = await n();
  await pg.click('[data-h="dibujar"]'); await pg.waitForSelector('.dj'); await pg.waitForTimeout(200);
  const m = await pg.evaluate(() => { const r = document.querySelector('.dj-hoja').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const trazo = async (x0, y0, x1, y1) => { await pg.mouse.move(m.x + m.w * x0, m.y + m.h * y0); await pg.mouse.down(); await pg.mouse.move(m.x + m.w * x1, m.y + m.h * y1, { steps: 12 }); await pg.mouse.up(); };
  await trazo(.2, .2, .5, .4);
  ok(await pg.evaluate(() => { const v = document.querySelector('.dj-hoja canvas'), d = v.getContext('2d').getImageData(0, 0, v.width, v.height).data; let k = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) k++; return k > 200; }), 'el pincel pinta');
  await pg.click('.dj [data-a="deshacer"]');
  ok(await pg.evaluate(() => { const v = document.querySelector('.dj-hoja canvas'), d = v.getContext('2d').getImageData(0, 0, v.width, v.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; }), '«Deshacer» lo borra');
  await pg.click('.dj [data-a="capas"]'); await pg.click('.dj-capas [data-k="nueva"]');
  ok(await pg.evaluate(() => document.querySelector('.dj').__dj.capas().length === 2), 'se agregan capas');
  await pg.click('.dj [data-a="capas"]');
  await pg.click('.dj [data-m="#e11d48"]'); await trazo(.3, .6, .6, .7);
  await pg.click('.dj [data-h="cubeta"]'); await pg.mouse.click(m.x + m.w * .9, m.y + m.h * .1);
  ok(await pg.evaluate(() => { const v = document.querySelector('.dj-hoja canvas'), d = v.getContext('2d').getImageData(Math.round(v.width * .9), Math.round(v.height * .1), 1, 1).data; return d[0] > 200 && d[1] < 80 && d[3] > 200; }), 'la cubeta rellena con el color elegido');
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/studio-dibujo-${w}.png` });
  await pg.click('.dj [data-a="deshacer"]');
  await pg.click('.dj [data-a="listo"]'); await pg.waitForFunction((a) => window.__comic.pag().capas.length === a + 1, antesDib);
  ok(await pg.evaluate(() => { const c = window.__comic.capa(); return c.tipo === 'imagen' && c.dibujo && c.w < 700 && c.x > 50; }), '«Listo» mete el dibujo a la página, recortado y en su lugar');
  await pg.click('#props [data-a="cerrar"]');
  await pg.evaluate(() => window.__comic.guardarYa());
  await pg.reload(); await pg.waitForFunction(() => window.__comic);
  ok(await pg.evaluate(() => window.__comic.obra.paginas.length === 2 && window.__comic.obra.paginas[0].capas.length === 5 && window.__comic.obra.paginas[1].capas.length === 7), 'todo se guarda al cerrar y abrir');
  await pg.click('#botonMenu');
  const [dpng] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }).catch(() => null), pg.click('#png')]);
  ok(dpng && /Mi manhwa · página 1\.png$/.test(dpng.suggestedFilename()), 'se descarga la página en PNG');
  const [dpdf] = await Promise.all([pg.waitForEvent('download', { timeout: 20000 }).catch(() => null), pg.click('#pdf')]);
  ok(dpdf && /Mi manhwa\.pdf$/.test(dpdf.suggestedFilename()), 'y todo el cómic en PDF');
  await pg.click('#alLibrero'); await pg.waitForFunction(() => /ya está en tu librero/.test(document.querySelector('#avisoMenu').textContent), null, { timeout: 20000 });
  await pg.goto(BASE + 'studio/'); await pg.waitForSelector('.obra');
  ok(await pg.locator('.obra').count() === 2 && await pg.evaluate(() => [...document.querySelectorAll('.obra .tapa img')].length >= 1), 'Studio enseña tus dos obras, el cómic con su portada');
  const chicos = await pg.$$eval('button, .nav a', (els) => els.filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 44 || e.getBoundingClientRect().width < 44)).map((e) => e.textContent.trim() || e.getAttribute('aria-label')));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.join(', ') : ''));
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.slice(0, 4).join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close();
console.log(`\n${bien} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
