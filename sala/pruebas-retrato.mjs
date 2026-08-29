/* ══ EL RETRATO DE PERFIL, DE PUNTA A PUNTA ════════════════════════════════
   Carlos, e151: «pon iconos de perfil variados para cada integrante […] haz
   que Luis y yo podamos subir una personalizada».

   Son dos cosas y se prueban por separado:
   · el SELLO, que lo tienen todos sin subir nada y sale del nombre;
   · el RETRATO, que sube una persona y tiene que verse en la mesa del otro.

   Lo segundo se prueba con DOS pestañas de verdad. Con una sola pasaría con
   la difusión rota: la que sube ya tiene la foto en la mano. Lo que puede
   fallar —y es lo que Carlos vería— es que él se cambie la cara y Luis siga
   viendo la de antes hasta recargar.

   Hace falta el servidor local:
     LLAVES='carlos:AAA,luis:BBB' node sala/servidor/local.mjs 8787
   y un servidor de archivos en 8792 sobre la raíz del repo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const API  = 'http://127.0.0.1:8787';
const MESA = (llave) => `http://127.0.0.1:8792/sala/?servidor=${encodeURIComponent(API)}&llave=${llave}`;
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
let f = 0;
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

/* ⚠ SALA NUEVA EN CADA CORRIDA. El servidor local guarda la sala en memoria
   mientras vive, así que reusar el código deja dentro las sesiones de la
   corrida anterior — y como se llaman igual, comparten sello (que es lo
   correcto: mismo nombre, misma persona). La primera versión de esto
   comparaba sellos por SESIÓN y se ponía roja sola en la segunda corrida,
   acusando al código de un acierto suyo. */
/* ⚠ EL ALFABETO ES EL DE LA SALA, NO LA A–Z. Le faltan la I, la L y la O a
   propósito —se confunden con el 1 y el 0 al dictar un código por teléfono—,
   así que un generador con las 26 produce códigos que el servidor rechaza con
   «Ese código no existe». Salía una de cada tres corridas y parecía flojera
   del arranque; lo era del alfabeto. */
const SALA = Array.from({ length:6 }, () =>
  'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]).join('');
const abrir = async (llave, nombre) => {
  const pg = await (await b.newContext({ viewport:{ width:1100, height:820 } })).newPage();
  const err = []; pg.on('pageerror', e => err.push(e.message));
  await pg.goto(MESA(llave) + '&sala=' + SALA, { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(400);
  await pg.fill('#nombreIn', nombre);
  await pg.fill('#codigoIn', SALA);
  await pg.click('#bEntrar');
  await pg.waitForTimeout(900);
  return { pg, err };
};

console.log('\n■ el sello, sin subir nada');
const carlos = await abrir('AAA', 'Carlos');
const luis   = await abrir('BBB', 'Luis');

const sellos = await carlos.pg.evaluate(() =>
  Object.values(gente).map(c => ({ n:c.nombre, s:figuraDe(c) })));
ok(sellos.length >= 2, 'los dos están en la mesa');
/* Por NOMBRE y no por sesión: dos sesiones de Carlos son un Carlos. */
const porNombre = new Map(sellos.map(x => [x.n, x.s]));
ok(new Set(porNombre.values()).size === porNombre.size,
   `cada integrante tiene un sello DISTINTO, no el monigote de siempre (${porNombre.size} nombres)`);
ok(sellos.every(x => porNombre.get(x.n) === x.s),
   'y dos sesiones de la misma persona comparten el suyo, que es lo correcto');

/* Lo que hace que sea un icono de perfil y no un adorno: que sea el mismo
   mañana. El id de sesión cambia; el nombre no. */
const mismo = await carlos.pg.evaluate(() => {
  const a = figuraDe({ nombre:'Godines', id:'sesion-de-hoy' });
  const c = figuraDe({ nombre:'Godines', id:'otra-sesion-mañana' });
  const d = figuraDe({ nombre:'godines' });
  return a === c && a === d;
});
ok(mismo, 'el sello cuelga del nombre, así que no cambia al abrir otra sesión');

console.log('\n■ subir una foto');
await carlos.pg.setInputFiles('#archivoRetrato', '/tmp/cara.png');
await carlos.pg.waitForTimeout(1200);

const mio = await carlos.pg.evaluate(() => {
  const i = document.querySelector('#yoPanel .avatar img');
  return i ? { src:i.src.slice(0, 22), largo:i.src.length } : null;
});
ok(!!mio, 'el avatar de quien la sube pasa a ser la foto');
ok(mio && /^data:image\/(webp|jpeg)/.test(mio.src),
   'y va incrustada y comprimida, no en PNG crudo: ' + (mio && mio.src));
ok(mio && mio.largo < 200_000, `y cabe en el tope (${mio && Math.round(mio.largo/1000)} KB)`);

/* El corte al cuadrado: la de prueba es de 40×20, y el avatar es redondo. */
const cuadrada = await carlos.pg.evaluate(() => new Promise(listo => {
  const im = new Image();
  im.onload = () => listo(im.width === im.height);
  im.src = document.querySelector('#yoPanel .avatar img').src;
}));
ok(cuadrada, 'la foto apaisada se recorta al cuadrado del centro, no se aplasta');

console.log('\n■ y llega al otro sin recargar');
await luis.pg.waitForTimeout(900);
const enLaOtra = await luis.pg.evaluate(() => {
  const c = Object.values(gente).find(x => x.nombre === 'Carlos');
  return !!(c && retratos[c.cuenta]);
});
ok(enLaOtra, 'Luis recibe la foto de Carlos por el socket, sin recargar');

const enElHilo = await luis.pg.evaluate(() => !!document.querySelector('.msj .avatar img, .avatar.conFoto img'));
ok(enElHilo, 'y sale también en los mensajes que ya estaban pintados');

console.log('\n■ quién puede ponerla');
const noAgente = await luis.pg.evaluate(async () => {
  const r = await fetch(`${SERVIDOR}/api/sala/${sala}/retrato`, {
    method:'POST', headers: conLlave({ 'content-type':'application/json' }),
    body: JSON.stringify({ de: yo.id, datos:'https://afuera.example/rastro.png' }) });
  return r.status;
});
ok(noAgente === 400, 'una URL de fuera se rechaza también por la vía directa');

console.log('\n■ quitarla');
await carlos.pg.click('#bQuitarFoto');
await carlos.pg.waitForTimeout(800);
const sinFoto = await carlos.pg.evaluate(() => !document.querySelector('#yoPanel .avatar img'));
ok(sinFoto, 'quitar la foto devuelve el sello');
const sinFotoAlla = await luis.pg.evaluate(() => {
  const c = Object.values(gente).find(x => x.nombre === 'Carlos');
  return !(c && retratos[c.cuenta]);
});
ok(sinFotoAlla, 'y también se le quita en la mesa del otro');

const errs = [...carlos.err, ...luis.err];
ok(errs.length === 0, 'ningún error de página' + (errs.length ? ': ' + errs.join(' | ') : ''));

console.log(`\n${f ? '✗' : '✓'}  ${f} fallan\n`);
await b.close();
process.exit(f ? 1 : 0);
