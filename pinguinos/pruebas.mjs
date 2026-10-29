// Pruebas de «Mis pingüinos» en un navegador de verdad, a 390 px.
//   python3 -m http.server 8765   (en la raíz del repo)
//   node pinguinos/pruebas.mjs http://localhost:8765
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { writeFileSync } from 'node:fs';
const { chromium } = pw;
const BASE = (process.argv[2] || 'http://localhost:8765') + '/pinguinos/';
let bien = 0, mal = 0;
const ok = (nombre, cond, extra = '') => { cond ? bien++ : mal++; console.log((cond ? '✓ ' : '✗ ') + nombre + (cond || !extra ? '' : ' · ' + extra)); };

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
/* La nube se prueba aparte (pruebas-nube.mjs, contra el servidor de verdad). Aquí se
   corta: estas pruebas son de la app en el teléfono y no deben depender de la red. */
await ctx.route(/^https:\/\/sala\.palomazi9111\.workers\.dev\//, (r) => r.abort('internetdisconnected'));
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
p.on('console', (m) => { if(m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errores.push(m.text()); });

/* una foto de mentiras, hecha con el lienzo del propio navegador */
async function foto(color){
  const datos = await p.evaluate((c) => { const k = document.createElement('canvas'); k.width = 1600; k.height = 1200;
    const g = k.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 1600, 1200); return k.toDataURL('image/png'); }, color);
  return { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(datos.split(',')[1], 'base64') };
}
async function agregar(nombre, color, nota = ''){
  await p.click('#agregar');
  await p.setInputFiles('#fotoIn', await foto(color));
  await p.waitForFunction(() => !document.querySelector('#fotoImg').hidden);
  await p.fill('#nombre', nombre); if(nota) await p.fill('#nota', nota);
  await p.click('#guardar');
  await p.waitForFunction(() => !document.querySelector('#hoja').open);
}
const total = () => p.$eval('#total', (e) => e.textContent);
const desborde = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

await p.goto(BASE);
ok('arranca vacía con el letrero', await p.isVisible('#vacio') && await total() === '0');
ok('sin desborde a 390', await desborde() <= 0);

/* guardar sin foto ni nombre avisa de las dos cosas */
await p.click('#agregar'); await p.click('#guardar');
ok('sin foto ni nombre, avisa de las dos', (await p.textContent('#fotoNota')).includes('foto') && (await p.textContent('#nombreNota')).includes('nombre'));
await p.click('#cancelar');

await agregar('Pingu', '#1b3a4b', 'Me lo regaló mi abuela');
ok('uno: dice «1 pingüino» en singular', await total() === '1' && (await p.textContent('#totalTxt')) === 'pingüino');
await agregar('Capitán', '#e07a22');
await agregar('Hielo', '#88b7d5');
ok('tres: cuenta 3', await total() === '3');
ok('se ven tres tarjetas con su foto', await p.$$eval('.peluche img', (a) => a.length === 3 && a.every((i) => i.src.startsWith('blob:'))));
ok('la foto se achicó a 1000 px', await p.evaluate(async () => { const i = document.querySelector('.peluche img'); await i.decode(); return Math.max(i.naturalWidth, i.naturalHeight) === 1000; }));

/* nombre repetido avisa pero deja */
await p.click('#agregar'); await p.fill('#nombre', 'pingu');
ok('nombre repetido avisa (sin acentos ni mayúsculas)', (await p.textContent('#nombreNota')).includes('Pingu'));
await p.click('#cancelar');

/* sobrevive a recargar */
await p.reload();
await p.waitForFunction(() => document.querySelector('#total').textContent === '3');
ok('después de recargar siguen los 3', await total() === '3');

/* editar el nombre */
await p.click('.peluche >> nth=0');
const viejo = await p.inputValue('#nombre');
await p.fill('#nombre', viejo + ' II'); await p.click('#guardar');
await p.waitForFunction(() => !document.querySelector('#hoja').open);
ok('editar cambia el nombre y no suma', (await p.textContent('#rejilla')).includes(viejo + ' II') && await total() === '3');

/* borrar pide dos toques */
await p.click('.peluche >> nth=0');
await p.click('#borrar');
ok('el primer toque de borrar sólo pregunta', await p.evaluate(() => document.querySelector('#hoja').open) && await total() === '3');
await p.click('#borrar');
await p.waitForFunction(() => document.querySelector('#total').textContent === '2');
ok('el segundo toque borra', await total() === '2');

/* respaldo: sale un archivo y al cargarlo en un teléfono nuevo trae todo */
await p.click('#abrirMenu');
const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#respaldar')]);
const ruta = '/tmp/respaldo-pinguinos.json'; await descarga.saveAs(ruta);
const p2 = await (await navegador.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p2.goto(BASE);
await p2.click('#abrirMenu');
await p2.setInputFiles('#archivoRespaldo', ruta);
await p2.waitForFunction(() => document.querySelector('#total').textContent === '2');
ok('el respaldo se carga en otro teléfono con sus fotos', await p2.$$eval('.peluche img', (a) => a.length === 2));
await p2.setInputFiles('#archivoRespaldo', ruta);
await p2.waitForTimeout(400);
ok('cargar el mismo respaldo dos veces no duplica', await p2.$eval('#total', (e) => e.textContent) === '2');
writeFileSync('/tmp/no-es-respaldo.json', '{"hola":1}');
await p2.setInputFiles('#archivoRespaldo', '/tmp/no-es-respaldo.json');
await p2.waitForTimeout(300);
ok('un archivo cualquiera no se carga', (await p2.textContent('#brindis')).includes('no es un respaldo'));

/* buscador: aparece con 6 o más */
for(const [n, c] of [['Tux', '#333'], ['Nieve', '#fff'], ['Mambo', '#a33'], ['Ártico', '#3a6']]) await agregar(n, c);
ok('con 6 aparece el buscador', await p.isVisible('#buscar'));
await p.fill('#buscar', 'artico');
ok('buscar sin acento encuentra «Ártico»', await p.$$eval('.peluche', (a) => a.length) === 1);
await p.fill('#buscar', '');
await p.selectOption('#orden', 'az');
{ const az = (await p.$$eval('.peluche .nom', (a) => a.map((x) => x.textContent))).join(); ok('A–Z ordena por nombre', az === ['Ártico', 'Capitán', 'Mambo', 'Nieve', 'Pingu', 'Tux'].join(), az); }

ok('sin desborde con la colección llena', await desborde() <= 0);
await p.setViewportSize({ width: 320, height: 640 });
ok('sin desborde a 320', await desborde() <= 0);
await p.screenshot({ path: '/tmp/pinguinos-390.png', fullPage: false });
ok('ni un error de consola', errores.length === 0, errores.join(' | '));

await navegador.close();
console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
