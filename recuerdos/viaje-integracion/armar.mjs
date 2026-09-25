// Arma la tarjeta del viaje de integración:
//   salida/{mujer,hombre}-{frente,reverso}.png   muestra de cada cara, 44 × 63.6 mm a 300 ppp
//   salida/imprimir.pdf   carta horizontal, 15 por cara (5 × 3): primero las
//                         compañeras (frente, reverso…) y luego los compañeros
// Uso:  node recuerdos/viaje-integracion/armar.mjs
// Necesita junto a este archivo foto.jpg y nombres.txt — ninguno está en el
// repo a propósito: son compañeros menores de edad y el repo es público.
//
// nombres.txt:   [mujer]  un nombre por renglón  [hombre]  un nombre por renglón
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdir, access, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.join(aqui, 'salida');
for(const f of ['foto.jpg', 'nombres.txt'])
  await access(path.join(aqui, f)).catch(() => { console.error(`✗ falta ${f} junto a armar.mjs`); process.exit(1); });
await mkdir(salida, { recursive: true });

// La lista, por secciones.
const NOMBRES = { mujer: [], hombre: [] };
let seccion = null;
for(const r of (await readFile(path.join(aqui, 'nombres.txt'), 'utf8')).split('\n').map((x) => x.trim())){
  if(!r || r.startsWith('#')) continue;
  const m = r.match(/^\[(mujer|hombre)\]$/);
  if(m){ seccion = m[1]; continue; }
  if(!seccion){ console.error('✗ nombres.txt: hay un nombre antes de [mujer] o [hombre]'); process.exit(1); }
  NOMBRES[seccion].push(r);
}
console.log(`· ${NOMBRES.mujer.length} compañeras, ${NOMBRES.hombre.length} compañeros`);

const url = (q) => pathToFileURL(path.join(aqui, 'tarjeta.html')).href + '?' + new URLSearchParams(q);
const navegador = await chromium.launch();
const errores = [];

// 300 ppp: 1 px CSS = 1/96 in, así que la escala es 300/96.
const pagina = await navegador.newPage({ deviceScaleFactor: 300 / 96 });
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('requestfailed', (r) => errores.push('no cargó ' + r.url()));

async function revisar(etiqueta){
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  // Nada se sale de la tarjeta: lo que se sale, se corta al imprimir. Los
  // adornos de fondo (manchas, franjas, el «3.1» gigante) se salen a propósito.
  const fuera = await pagina.evaluate(() => {
    const c = document.querySelector('.cara').getBoundingClientRect();
    return [...document.querySelectorAll('.cara *:not(.mancha):not(.adorno):not(.adorno *):not(.punto):not(.cinta-adhesiva):not(.marca-agua):not(.camion):not(.camion *):not(.fondo):not(.numero)')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.right > c.right + .5 || r.bottom > c.bottom + .5 || r.left < c.left - .5); })
      .map((el) => el.getAttribute('class') || el.tagName);
  });
  if(fuera.length) errores.push(`${etiqueta}: se sale ${fuera.join(', ')}`);
  // Y nada queda cortado DENTRO de una caja: un flex que encoge la caja del
  // mensaje la recorta sin que nada «se salga» (así se perdió el «ustedes.»).
  // Se mide el TEXTO, no scrollHeight: la marca de agua se sale a propósito.
  const cortado = await pagina.evaluate(() => [...document.querySelectorAll('.cara *')]
    .filter((el) => getComputedStyle(el).overflow === 'hidden' && [...el.querySelectorAll('p, span')]
      .some((t) => t.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom + .5))
    .map((el) => el.getAttribute('class') || el.tagName));
  if(cortado.length) errores.push(`${etiqueta}: queda cortado ${cortado.join(', ')}`);
}

for(const v of ['mujer', 'hombre']){
  // Cada nombre de la lista, uno por uno: el largo que no cabe es justo el que
  // nadie probó. Más la de repuesto, sin nombre.
  for(const nombre of [...NOMBRES[v], '']){
    await pagina.goto(url({ ver: 'frente', v, nombre }));
    await revisar(`${v} frente «${nombre || 'sin nombre'}»`);
  }
  // La muestra lleva el nombre más largo: si ése se ve bien, todos.
  const largo = [...NOMBRES[v]].sort((a, b) => b.length - a.length)[0] || '';
  await pagina.goto(url({ ver: 'frente', v, nombre: largo }));
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.locator('.cara').screenshot({ path: path.join(salida, `${v}-frente.png`) });
  await pagina.goto(url({ ver: 'reverso', v }));
  await revisar(`${v} reverso`);
  await pagina.locator('.cara').screenshot({ path: path.join(salida, `${v}-reverso.png`) });
  console.log(`✓ ${v}-frente.png · ${v}-reverso.png`);
}

const hojas = await navegador.newPage();
await hojas.addInitScript((n) => { window.NOMBRES = n; }, NOMBRES);
await hojas.goto(url({ ver: 'hojas' }));
await hojas.evaluate(() => document.fonts.ready);
await hojas.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
const paginas = await hojas.evaluate(() => document.querySelectorAll('.hoja').length);
await hojas.pdf({ path: path.join(salida, 'imprimir.pdf'), width: '279.4mm', height: '215.9mm', printBackground: true, preferCSSPageSize: true });
console.log(`✓ imprimir.pdf · ${paginas} páginas`);
await navegador.close();

if(errores.length){ console.error('✗', errores.join('\n✗ ')); process.exit(1); }
console.log('✓ sin errores');
