/* ══ LA GALERÍA DE LA LUPA ═════════════════════════════════════════════════
   Carlos, e151: pasar entre las imágenes de un mensaje deslizando izquierda o
   derecha, y salir deslizando de arriba hacia abajo.

   ── POR QUÉ ESTA PRUEBA ARRASTRA DE VERDAD ───────────────────────────────
   Sería mucho más corto llamar a `irA(2)` y comprobar el contador. Y pasaría
   con el gesto completamente roto: `irA` es la parte que ya funcionaba. Lo
   que puede fallar es el reconocimiento del gesto —el candado de eje, el
   umbral, la captura del puntero, el `pointercancel`— y eso sólo se toca
   moviendo un puntero.

   Se mide además el TRANSFORM PINTADO y no sólo el contador: el contador es
   una variable, el transform es dónde quedó la imagen. Ya me pasó una vez
   dar por buena una animación porque la clase estaba puesta. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true });
const pg = await ctx.newPage();
const err = []; pg.on('pageerror', e => err.push(e.message));
let f = 0;
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

await pg.goto('http://127.0.0.1:8792/sala/?sala=PRUEBA', { waitUntil:'domcontentloaded' });
await pg.waitForTimeout(400);

/* Tres imágenes distintas de verdad, pintadas por la MISMA función que usa la
   app para los adjuntos. Inventar el marcado a mano probaría mi marcado, no
   el suyo. */
const PIX = {
  rojo:  'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="#d22"/></svg>').toString('base64'),
  verde: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="#2a2"/></svg>').toString('base64'),
  azul:  'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="#24d"/></svg>').toString('base64'),
};

async function sembrar(cuantas){
  await pg.evaluate(({ PIX, cuantas }) => {
    const cuales = [PIX.rojo, PIX.verde, PIX.azul].slice(0, cuantas);
    const html = cuales.map((d, k) => tarjetaAdjunto({
      clase:'imagen', datos:d, mime:'image/svg+xml',
      nombre:'foto' + k, ancho:80, alto:60 })).join('');
    /* La puerta de entrada tapa todo mientras no estás en una sala, y aquí
       no se está probando entrar. Se aparta, no se finge que no existe. */
    const puerta = document.getElementById('puerta');
    if(puerta) puerta.style.display = 'none';

    let caja = document.getElementById('cajaPrueba');
    if(!caja){
      caja = document.createElement('div');
      caja.id = 'cajaPrueba';
      document.body.appendChild(caja);
    }
    caja.className = 'adjuntos' + (cuantas > 1 ? ' varias' : '');
    caja.innerHTML = html;
  }, { PIX, cuantas });
}

/* Un deslizamiento con puntero real: baja, se mueve por pasos —hace falta,
   porque el candado de eje necesita más de un `pointermove` para decidir— y
   suelta. `pasos` alto para que la velocidad salga baja y sea la DISTANCIA la
   que decide; así el umbral se prueba por separado de la velocidad. */
async function deslizar(dx, dy, pasos = 12, esperaMs = 12){
  const caja = await pg.locator('.lupa-vista').boundingBox();
  const x = caja.x + caja.width / 2, y = caja.y + caja.height / 2;
  await pg.mouse.move(x, y);
  await pg.mouse.down();
  for(let k = 1; k <= pasos; k++){
    await pg.mouse.move(x + dx * k / pasos, y + dy * k / pasos);
    await pg.waitForTimeout(esperaMs);
  }
  await pg.mouse.up();
  await pg.waitForTimeout(420);            /* que termine la transición */
}

const estado = () => pg.evaluate(() => ({
  abierta: document.getElementById('lupa').classList.contains('abierta'),
  cuenta:  document.getElementById('lupaCuenta').textContent,
  i:       lupa.i,
  laminas: document.querySelectorAll('.lupa-dia').length,
  tx:      new DOMMatrixReadOnly(getComputedStyle(document.getElementById('lupaPista')).transform).m41,
  ancho:   document.querySelector('.lupa-vista').clientWidth,
  inerte:  document.querySelector('.app').hasAttribute('inert'),
  puntoHoy:[...document.querySelectorAll('.lupa-puntos span')].findIndex(s => s.classList.contains('hoy')),
}));

console.log('\n■ abrir por la foto que se tocó');
await sembrar(3);
await pg.locator('#cajaPrueba .foto').nth(1).click();
await pg.waitForTimeout(320);
let e = await estado();
ok(e.abierta, 'la lupa se abre');
ok(e.laminas === 3, 'y pinta las tres láminas del mensaje, no sólo la tocada');
ok(e.i === 1 && e.cuenta === '2 / 3', 'y arranca en la que se tocó, no en la primera');
ok(Math.abs(e.tx - (-e.ancho)) < 2, 'la pista está corrida un ancho exacto');
ok(e.inerte, 'el resto de la página queda inerte mientras la lupa está encima');
ok(e.puntoHoy === 1, 'y el puntito encendido es el segundo');
/* ⚠ NO basta con que el botón exista y esté «visible»: la cabecera lo tapaba
   por z-index y seguía siendo visible para el DOM. Se pregunta QUIÉN recibe el
   toque en ese punto, que es lo único que decide si se puede cerrar. */
ok(await pg.evaluate(() => {
  const b = document.getElementById('bCerrarLupa'), r = b.getBoundingClientRect();
  const encima = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
  return b.contains(encima) || encima === b;
}), 'y el botón de cerrar recibe el toque, no lo tapa la cabecera');

console.log('\n■ deslizar de lado');
await deslizar(-200, 0);
e = await estado();
ok(e.i === 2 && e.cuenta === '3 / 3', 'arrastrar hacia la izquierda pasa a la siguiente');
ok(Math.abs(e.tx - (-2 * e.ancho)) < 2, 'y la pista quedó pintada en la tercera lámina');

await deslizar(200, 0);
e = await estado();
ok(e.i === 1 && e.cuenta === '2 / 3', 'y hacia la derecha regresa');

console.log('\n■ los topes y el umbral');
await deslizar(-200, 0); await deslizar(-200, 0);   /* llega al final y empuja */
e = await estado();
ok(e.i === 2, 'en la última, seguir empujando no se sale del final');
ok(Math.abs(e.tx - (-2 * e.ancho)) < 2, 'y vuelve a su sitio, sin quedarse a medias');

await deslizar(60, 0);                    /* 60 < 22% de 390 = 86 */
e = await estado();
ok(e.i === 2, 'un arrastre corto NO cambia de imagen');
ok(Math.abs(e.tx - (-2 * e.ancho)) < 2, 'y la pista vuelve exactamente a donde estaba');

console.log('\n■ salir hacia abajo, y sólo hacia abajo');
await deslizar(0, -260);
e = await estado();
ok(e.abierta, 'deslizar hacia ARRIBA no cierra: Carlos pidió abajo');

await deslizar(0, 240);
e = await estado();
ok(!e.abierta, 'deslizar hacia abajo cierra');
ok(!e.inerte, 'y la página vuelve a existir para el teclado');

console.log('\n■ teclado');
await pg.locator('#cajaPrueba .foto').nth(0).click();
await pg.waitForTimeout(300);
await pg.keyboard.press('ArrowRight');
await pg.waitForTimeout(320);
e = await estado();
ok(e.i === 1, 'la flecha derecha pasa a la siguiente');
await pg.keyboard.press('Escape');
await pg.waitForTimeout(200);
e = await estado();
ok(!e.abierta, 'Escape cierra');
const vuelve = await pg.evaluate(() =>
  document.activeElement === document.querySelectorAll('#cajaPrueba .foto')[0]);
ok(vuelve, 'y el foco vuelve a la foto desde la que se abrió');

console.log('\n■ un mensaje con UNA sola imagen');
await sembrar(1);
await pg.locator('#cajaPrueba .foto').first().click();
await pg.waitForTimeout(300);
e = await estado();
ok(e.abierta && e.laminas === 1, 'abre igual');
ok(e.cuenta === '', 'sin contador: «1 / 1» no le dice nada a nadie');
ok(await pg.locator('#lupaDer').isHidden(), 'y sin flechas');
await deslizar(-200, 0);
e = await estado();
ok(e.abierta && e.i === 0, 'deslizar de lado no la saca de la única que hay');
await deslizar(0, 240);
e = await estado();
ok(!e.abierta, 'pero salir hacia abajo sigue funcionando con una sola');

ok(err.length === 0, 'ningún error de página' + (err.length ? ': ' + err.join(' | ') : ''));

console.log(`\n${f ? '✗' : '✓'}  ${f} fallan\n`);
await b.close();
process.exit(f ? 1 : 0);
