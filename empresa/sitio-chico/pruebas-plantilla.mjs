/* Comprueba en un navegador de verdad las CUATRO promesas de OFERTA.md, más
   las que sostienen el precio. Si una falla, el sitio no se entrega.
     node empresa/sitio-chico/pruebas-plantilla.mjs
   ⚠ Se prueba a 390 px porque es un teléfono, que es donde lo van a abrir. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, 'plantilla');
const PUERTO = 8821;
const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css' };

const servidor = createServer(async (pet, res) => {
  let r = decodeURIComponent(pet.url.split('?')[0]);
  if (r.endsWith('/')) r += 'index.html';
  const f = join(RAIZ, r);
  if (!existsSync(f)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'text/plain' });
  res.end(await readFile(f));
});
await new Promise(r => servidor.listen(PUERTO, r));

const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const NAV = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);

let bien = 0, mal = 0;
const ok = (que, cond, det = '') => {
  if (cond) { bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (det ? '  → ' + det : '')); }
};

const b = await chromium.launch({ executablePath: NAV });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errores = [], fuera = [];
page.on('pageerror', e => errores.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
page.on('request', r => { if (!r.url().startsWith(`http://127.0.0.1:${PUERTO}`)) fuera.push(r.url()); });

const t0 = Date.now();
await page.goto(`http://127.0.0.1:${PUERTO}/`, { waitUntil: 'networkidle' });
const carga = Date.now() - t0;

console.log('\n· Las cuatro promesas de la oferta');
ok(`carga en menos de 2 s (${carga} ms)`, carga < 2000, carga + ' ms');
ok('el botón de WhatsApp apunta al número del negocio',
   await page.evaluate(() => {
     const a = document.querySelector('.barra a.wa');
     return !!a && a.href === 'https://wa.me/' + window.NEGOCIO.whatsapp;
   }));
ok('el enlace del mapa lleva la dirección real',
   await page.evaluate(() => {
     const a = document.getElementById('mapa');
     return !!a && decodeURIComponent(a.href).includes(window.NEGOCIO.direccion);
   }));
const desborde = await page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok('a 390 px no se sale de lado', desborde <= 0, 'sobran ' + desborde + 'px');

console.log('\n· Lo que sostiene el precio');
ok('trae la etiqueta viewport, que es el defecto que vendemos arreglar',
   await page.evaluate(() => !!document.querySelector('meta[name=viewport]')));
ok('NO hace una sola petición a un servidor ajeno',
   fuera.length === 0, fuera.slice(0, 3).join(', '));
ok('dice si está abierto o cerrado ahora mismo',
   await page.evaluate(() => {
     const e = document.getElementById('estado');
     return !e.hidden && /abierto|cerrado/i.test(document.getElementById('estadoTexto').textContent);
   }));
ok('el día de hoy va marcado en la lista de horarios',
   await page.evaluate(() => !!document.querySelector('.horario li.hoy')));
ok('los botones de abajo se pueden tocar: 44 px o más',
   await page.evaluate(() => [...document.querySelectorAll('.barra a')]
     .every(a => a.getBoundingClientRect().height >= 44)));
ok('el título de la pestaña es el del negocio, no «Cargando»',
   await page.evaluate(() => document.title.includes(window.NEGOCIO.nombre)));
ok('ni un error en la consola', errores.length === 0, errores[0] || '');

console.log('\n· Un dato que falta esconde su sección, no deja un hueco');
/* ⚠ NO se toca el DOM a mano para comprobar esto: eso probaría lo que yo
   acabo de escribir, no lo que hace la página. Se INTERCEPTA `negocio.js` y se
   sirve uno sin horarios ni contacto, para que corra el camino de pintado de
   verdad con esos datos. */
await page.route('**/negocio.js', ruta => ruta.fulfill({
  contentType: 'text/javascript',
  body: 'window.NEGOCIO = ' + JSON.stringify({
    nombre: 'Negocio Sin Datos', giro: 'Prueba',
    direccion: 'Calle Prueba 1, Querétaro', servicios: [], porque: [], horarios: [],
    telefono: '', whatsapp: '', hecho: 'Grupo Mazi',
  }) + ';',
}));
await page.goto(`http://127.0.0.1:${PUERTO}/`, { waitUntil: 'networkidle' });
const vacio = await page.evaluate(() => ({
  horario: document.getElementById('secHorario').hidden,
  barra: document.getElementById('barra').hidden,
  servicios: document.getElementById('secServicios').hidden,
  donde: document.getElementById('secDonde').hidden,
  relleno: getComputedStyle(document.body).paddingBottom,
}));
ok('sin horarios, la sección de horarios no se dibuja', vacio.horario);
ok('sin servicios, tampoco se dibuja la suya', vacio.servicios);
ok('sin teléfono ni WhatsApp, la barra de abajo no se dibuja', vacio.barra);
ok('y sin barra, no queda el hueco de la barra abajo',
   vacio.relleno === '0px', 'quedó ' + vacio.relleno);
ok('lo que sí hay —la dirección— se sigue dibujando', vacio.donde === false);
await page.unroute('**/negocio.js');

await page.goto(`http://127.0.0.1:${PUERTO}/`, { waitUntil: 'networkidle' });

/* ⚠ LA BARRA FIJA TAPA CONTENIDO, Y LA FOTO DE PÁGINA COMPLETA NO LO DICE.
   En la captura `fullPage` la barra sale pintada a media página, encima del
   título de Horarios — eso es artefacto de la captura, no del sitio. Pero la
   pregunta de verdad es otra y hay que medirla: al llegar ABAJO DEL TODO,
   ¿queda algo debajo de la barra? Si el relleno del cuerpo no compensa su
   altura, la última línea del pie queda tapada y nadie lo ve hasta que un
   cliente lo dice. */
console.log('\n· La barra fija no se come el final de la página');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
const tape = await page.evaluate(() => {
  const barra = document.getElementById('barra');
  if (barra.hidden) return { hay: false };
  const b = barra.getBoundingClientRect();
  const ultimo = document.querySelector('.pie').lastElementChild.getBoundingClientRect();
  return { hay: true, tapado: +(ultimo.bottom - b.top).toFixed(1) };
});
ok('abajo del todo, el último renglón del pie NO queda debajo de la barra',
   !tape.hay || tape.tapado <= 0, tape.hay ? ('se lo come por ' + tape.tapado + 'px') : '');

await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: join(AQUI, 'plantilla-390.png'), fullPage: true });
console.log('\n  foto: empresa/sitio-chico/plantilla-390.png');

await b.close();
servidor.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
