/* CURSOS · pruebas del visor, en un navegador de verdad a tamaño iPhone.
   Necesita `node build.mjs` antes: sirve dist/ por su cuenta.
   Uso: node cursos/pruebas-visor.mjs   (CAPTURAS=dir para guardar fotos) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const RAIZ = new URL('../dist/', import.meta.url).pathname;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.css': 'text/css', '.pdf': 'application/pdf' };
const srv = createServer(async (q, r) => {
  let p = join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  try { if ((await stat(p)).isDirectory()) p = join(p, 'index.html'); r.writeHead(200, { 'content-type': TIPOS[extname(p)] || 'application/octet-stream' }); r.end(await readFile(p)); }
  catch { r.writeHead(404); r.end('no'); }
}).listen(0);
const BASE = `http://127.0.0.1:${srv.address().port}/cursos/`;

let pasan = 0, fallan = 0;
const ok = (c, m) => { if (c) { pasan++; console.log('  ✓', m); } else { fallan++; console.log('  ✗', m); } };
const dir = process.env.CAPTURAS;

const nav = await chromium.launch();
for (const [ancho, alto] of [[390, 844], [1280, 800]]) {
  console.log(`\n── ${ancho}×${alto}`);
  const pag = await nav.newPage({ viewport: { width: ancho, height: alto }, hasTouch: ancho < 500 });
  const errores = [];
  pag.on('pageerror', (e) => errores.push(e.message));
  pag.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  const rotas = [];
  pag.on('response', (r) => r.status() >= 400 && rotas.push(r.url()));

  await pag.goto(BASE);
  const ver = await pag.$$eval('a.boton.si', (as) => as.map((a) => a.getAttribute('href')));
  ok(ver.length === 3 && ver.every((h) => h.startsWith('ver.html?c=')), 'los tres botones principales abren el visor');
  ok(await pag.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Cursos sin desborde');

  for (const [c, n] of [['principal', 85], ['brigada', 90], ['acuatica', 57]]) {
    await pag.goto(BASE + 'ver.html?c=' + c);
    await pag.evaluate(() => { Element.prototype.requestFullscreen = undefined; }); // headless no pinta la pantalla completa en la foto
    await pag.waitForFunction(() => { const i = document.querySelector('.lista img'); return i && i.complete && i.naturalWidth > 0; });
    ok(await pag.$$eval('.lista li', (l) => l.length) === n, `${c}: ${n} láminas en la lista`);
    ok(await pag.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${c}: sin desborde`);
    // las de abajo NO se piden de entrada (eso es lo que hace que abra al instante)
    const pedidas = await pag.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.jpg')).length);
    ok(pedidas < n / 2, `${c}: al abrir pide ${pedidas} de ${n} imágenes, no todas`);
    if (dir && c === 'principal') await pag.screenshot({ path: `${dir}/visor-lista-${ancho}.png` });

    // presentar desde la lámina 3, avanzar, retroceder, salir
    await pag.click('.lista li:nth-child(3) button');
    await pag.waitForFunction(() => document.querySelector('#visor').open && document.querySelector('#grande').complete && document.querySelector('#grande').naturalWidth > 0);
    ok((await pag.textContent('#cuenta')) === `3 / ${n}`, `${c}: presentar desde la 3`);
    await pag.keyboard.press('ArrowRight');
    ok((await pag.textContent('#cuenta')) === `4 / ${n}`, `${c}: flecha → avanza`);
    await pag.click('.zona.ant');
    ok((await pag.textContent('#cuenta')) === `3 / ${n}`, `${c}: tocar la orilla izquierda regresa`);
    if (ancho < 500) {
      // deslizar con el dedo hacia la izquierda = siguiente
      await pag.evaluate(() => {
        const v = document.querySelector('#visor');
        const t = (x) => new Touch({ identifier: 1, target: v, clientX: x, clientY: 400 });
        v.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], changedTouches: [t(300)], bubbles: true }));
        v.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(120)], bubbles: true }));
      });
      ok((await pag.textContent('#cuenta')) === `4 / ${n}`, `${c}: deslizar avanza`);
    }
    await pag.keyboard.press('End');
    ok((await pag.textContent('#cuenta')) === `${n} / ${n}`, `${c}: Fin lleva a la última`);
    await pag.keyboard.press('ArrowRight');
    ok((await pag.textContent('#cuenta')) === `${n} / ${n}`, `${c}: no se pasa de la última`);
    // la última SÍ se pinta: se espera a que llegue y se mide que la escena no esté vacía
    await pag.waitForFunction(() => { const g = document.querySelector('#grande'); return g.complete && g.naturalWidth > 0; });
    const caja = await pag.evaluate(() => { const r = document.querySelector('#grande').getBoundingClientRect(); return r.width * r.height; });
    ok(caja > ancho * alto * 0.2, `${c}: la lámina ocupa la pantalla al presentar`);
    if (dir && c === 'principal') await pag.screenshot({ path: `${dir}/visor-presentar-${ancho}.png` });
    await pag.click('#cerrar');
    ok(!(await pag.evaluate(() => document.querySelector('#visor').open)), `${c}: ✕ sale de presentar`);
  }
  await pag.goto(BASE + 'ver.html?c=nada');
  ok(await pag.$('.error') !== null, 'una clave que no existe dice qué hacer en vez de quedarse en blanco');

  ok(errores.length === 0, 'cero errores de consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  ok(rotas.length === 0, 'ninguna imagen ni archivo da error' + (rotas.length ? ': ' + rotas.slice(0, 3).join(' ') : ''));
  await pag.close();
}
await nav.close();
srv.close();
console.log(`\n${pasan} pasan · ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
