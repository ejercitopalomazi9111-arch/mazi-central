/* ══ FUSIONAR DOS SESIONES ═════════════════════════════════════════════════
   Carlos, e156: «Esa cuenta vieja y la mía se llaman igual fusionalas».

   Lo que se comprueba aquí, y que las pruebas del servidor no pueden ver: que
   después de fusionar, la mesa PINTA los mensajes viejos con la identidad de
   la sesión que quedó — sin recargar y sin haber tocado el hilo.

   Necesita el servidor local en 8787 con LLAVES='carlos:AAA,luis:BBB' y los
   archivos servidos en 8792. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const API  = 'http://127.0.0.1:8787';
/* ⚠ EL ALFABETO ES EL DE LA SALA, NO LA A–Z. Le faltan la I, la L y la O a
   propósito —se confunden con el 1 y el 0 al dictar un código por teléfono—,
   así que un generador con las 26 produce códigos que el servidor rechaza con
   «Ese código no existe». Salía una de cada tres corridas y parecía flojera
   del arranque; lo era del alfabeto. */
const SALA = Array.from({ length:6 }, () =>
  'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]).join('');
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
let f = 0;
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

async function abrir(llave, nombre){
  const pg = await (await b.newContext({ viewport:{ width:1100, height:820 } })).newPage();
  const err = []; pg.on('pageerror', e => err.push(e.message));
  await pg.goto(`http://127.0.0.1:8792/sala/?servidor=${encodeURIComponent(API)}&llave=${llave}&sala=${SALA}`,
                { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(350);
  await pg.fill('#nombreIn', nombre); await pg.fill('#codigoIn', SALA);
  await pg.click('#bEntrar'); await pg.waitForTimeout(1200);
  const puerta = await pg.locator('#puerta').isVisible().catch(() => false);
  if(puerta){
    const q = await pg.locator('#error').textContent().catch(() => '');
    throw new Error(`no pudo entrar "${nombre}": ${q || 'la puerta sigue puesta'}`);
  }
  return { pg, err };
}

/* ⚠ NOMBRES DISTINTOS A PROPÓSITO, aunque el caso real de Carlos sean dos
   pestañas llamadas igual. Con los dos nombres iguales, «se pinta con la
   identidad de la que quedó» PASA SIN QUE HAYA PASADO NADA: comparten nombre,
   cuenta, color y —desde el cambio de sellos— hasta figura. La prueba no
   podía distinguir la fusión de su ausencia, y de hecho estuvo verde mientras
   el servidor contestaba «no existe esa ruta». Con nombres distintos, el
   mensaje viejo sólo puede decir «Carlos» si el alias se resolvió. */
const vieja = await abrir('AAA', 'Carlos de ayer');
await vieja.pg.fill('#texto', 'esto lo dije con la pestaña vieja');
await vieja.pg.click('#bEnviar'); await vieja.pg.waitForTimeout(700);

const nueva = await abrir('AAA', 'Carlos');
const luis  = await abrir('BBB', 'Luis');
await nueva.pg.waitForTimeout(600);

const idVieja = await vieja.pg.evaluate(() => yo.id);
const idNueva = await nueva.pg.evaluate(() => yo.id);
ok(idVieja !== idNueva, 'son dos sesiones distintas de la misma persona');

const antes = await luis.pg.evaluate(() =>
  Object.values(gente).filter(p => p.cuenta === 'carlos' && p.tipo === 'humano').length);
ok(antes === 2, 'y antes de fusionar, Luis ve DOS sesiones suyas en la mesa');

console.log('\n■ fusionar desde el panel, como lo haría él');
await nueva.pg.evaluate((id) => verPantalla(id), idVieja);
await nueva.pg.waitForTimeout(400);
const hayBoton = await nueva.pg.locator('[data-fusionar]').count();
ok(hayBoton === 1, 'el panel de esa sesión ofrece fusionarla');

nueva.pg.on('dialog', d => d.accept());
await nueva.pg.locator('[data-fusionar]').click();
await nueva.pg.waitForTimeout(900);
await luis.pg.waitForTimeout(700);

const despues = await luis.pg.evaluate(() =>
  Object.values(gente).filter(p => p.cuenta === 'carlos' && p.tipo === 'humano').length);
ok(despues === 1, 'después queda UNA en la mesa de Luis, sin recargar');

/* Lo que de verdad se pidió: que el mensaje viejo se vea como suyo. */
const pintado = await luis.pg.evaluate((idNueva) => {
  const ev = hilo.find(e => (e.texto || '').includes('pestaña vieja'));
  const cred = credencial(ev.de);
  return { autorGuardado: ev.de.id, nombreGuardado: ev.de.nombre, nombre: cred.nombre,
           mismoSello: figuraDe(cred) === figuraDe(credencial({ id:idNueva })) };
}, idNueva);
ok(pintado.autorGuardado === idVieja && pintado.nombreGuardado === 'Carlos de ayer',
   'el hilo NO se reescribió: el evento guarda la sesión y el nombre con que se dijo');
ok(pintado.nombre === 'Carlos' && pintado.mismoSello,
   'pero se PINTA con el nombre y la figura de la que quedó (no «Carlos de ayer»)');

console.log('\n■ lo que no se puede');
const ajena = await luis.pg.evaluate(async (id) => {
  try{ await alServidor('fusionar', { de: yo.id, cual: id }); return 'pasó'; }
  catch(e){ return e.message; }
}, idNueva);
ok(/otra cuenta/i.test(ajena), 'Luis no puede absorber la sesión de Carlos: ' + ajena);

const errs = [...vieja.err, ...nueva.err, ...luis.err];
ok(errs.length === 0, 'ningún error de página' + (errs.length ? ': ' + errs.join(' | ') : ''));

console.log(`\n${f ? '✗' : '✓'}  ${f} fallan\n`);
await b.close();
process.exit(f ? 1 : 0);
