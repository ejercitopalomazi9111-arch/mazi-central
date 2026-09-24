// Arma la tarjeta del viaje de integración:
//   salida/frente.png · salida/reverso.png   una tarjeta, 52 × 75 mm a 300 ppp
//   salida/imprimir.pdf                      carta horizontal, 10 por cara (5 × 2), hoja 1 frente y hoja 2 reverso
// Uso:  node recuerdos/viaje-integracion/armar.mjs
// Necesita foto.jpg junto a este archivo (no está en el repo a propósito).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdir, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.join(aqui, 'salida');
await access(path.join(aqui, 'foto.jpg')).catch(() => { console.error('✗ falta foto.jpg junto a armar.mjs'); process.exit(1); });
await mkdir(salida, { recursive: true });

const url = (ver) => pathToFileURL(path.join(aqui, 'tarjeta.html')).href + '?ver=' + ver;
const navegador = await chromium.launch();
const errores = [];

// 300 ppp: 1 px CSS = 1/96 in, así que la escala es 300/96.
const pagina = await navegador.newPage({ deviceScaleFactor: 300 / 96 });
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('requestfailed', (r) => errores.push('no cargó ' + r.url()));
for(const ver of ['frente', 'reverso']){
  await pagina.goto(url(ver));
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  // Nada se sale de la tarjeta: lo que se sale, se corta al imprimir.
  const fuera = await pagina.evaluate(() => {
    const c = document.querySelector('.cara').getBoundingClientRect();
    return [...document.querySelectorAll('.cara *:not(.mancha):not(.adorno):not(.adorno *):not(.punto):not(.cinta-adhesiva):not(.pie):not(.pie *):not(.marca-agua):not(.camion):not(.camion *)')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.right > c.right + .5 || r.bottom > c.bottom + .5 || r.left < c.left - .5); })
      .map((el) => el.getAttribute('class') || el.tagName);
  });
  if(fuera.length) errores.push(`${ver}: se sale ${fuera.join(', ')}`);
  // Y nada queda cortado DENTRO de una caja: un flex que encoge la caja del
  // mensaje la recorta sin que nada «se salga» (así se perdió el «ustedes.»).
  const cortado = await pagina.evaluate(() => [...document.querySelectorAll('.cara *')]
    // Se mide el TEXTO, no scrollHeight: la marca de agua se sale a propósito.
    .filter((el) => getComputedStyle(el).overflow === 'hidden' && [...el.querySelectorAll('p, span')]
      .some((t) => t.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom + .5))
    .map((el) => el.getAttribute('class') || el.tagName));
  if(cortado.length) errores.push(`${ver}: queda cortado ${cortado.join(', ')}`);
  await pagina.locator('.cara').screenshot({ path: path.join(salida, ver + '.png') });
  console.log('✓', ver + '.png');
}

const hojas = await navegador.newPage();
await hojas.goto(url('hojas'));
await hojas.evaluate(() => document.fonts.ready);
await hojas.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
await hojas.pdf({ path: path.join(salida, 'imprimir.pdf'), width: '279.4mm', height: '215.9mm', printBackground: true, preferCSSPageSize: true });
console.log('✓ imprimir.pdf');
await navegador.close();

if(errores.length){ console.error('✗', errores.join('\n✗ ')); process.exit(1); }
console.log('✓ sin errores');
