/* MAZI VR · SIN CONTROL, SÓLO MIRANDO (Carlos, 18 nov: «al picarle a uno de los botones mirándolo desaparecieron todos
   menos el de sala, que quedó oscurecido, y siguió roto»). Miró «La Sala», entró a una pantalla de relleno y no había
   cómo regresar: atrás sólo era el Círculo del control.
   Sin control conectado se gira la cabeza con el ratón (como en la computadora) y se elige mirando fijo:
     · mirar «La Sala» dice «Pronto» y NO te saca del inicio;
     · mirar «Leer», «Cine» y «Ajustes» entra, y en cada una se regresa mirando «Atrás».
     node vr/pruebas-mirada.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => [];   // sin control
  /* y sin manos: la cámara de mentiras a veces «parece» una mano y el puntero de la mano le gana a la mirada; y con el fondo
     simple: el navegador de pruebas no tiene tarjeta gráfica y el Tem Shop le baja tanto los cuadros que el giro llega tarde
     (el Tem Shop tiene su propia prueba) */
  try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1 })); }catch{} });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio');
/* sin control, quedarse quieto 2.5 s frente a «Leer» lo abre (así lo pidió Carlos): la prueba gira enseguida */
await p.waitForTimeout(200);
/* girar la cabeza: arrastrar el ratón (0.005 rad por pixel) */
let mx = 422, my = 195;
const girar = async (dx, dy) => { await p.mouse.move(mx, my); await p.mouse.down(); mx += dx; my += dy; await p.mouse.move(mx, my, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); };
const grados = (g) => Math.round(g * Math.PI / 180 / .005);
/* el foco se pone en el cuadro siguiente al giro: se espera hasta 1.5 s a que aparezca */
const foco = async () => { let f = null; for(let i = 0; i < 10 && !f; i++){ f = await p.evaluate(() => __vr.focoActual()); if(!f) await p.waitForTimeout(150); } return f; };
const fijo = async () => p.waitForTimeout(2300);
const volverAlCentro = async () => { await girar(422 - mx, 195 - my); mx = 422; my = 195; };

sí(await p.evaluate(() => __vr.ahora()) === 'inicio', 'entra al inicio');
await girar(grados(21), 0);
sí(await foco() === 'La Sala', `mirar a la derecha enfoca «La Sala» (${await foco()})`);
await fijo();
sí(await p.evaluate(() => __vr.ahora()) === 'inicio', 'mirar fijo «La Sala» dice «Pronto» y te deja en el inicio');
await p.screenshot({ path: CAPS + '/vr-mirada-pronto.png' });
await girar(grados(-21), 0);
const centroF = await foco(); sí(centroF === 'Leer', `al centro está «Leer» (${centroF})`);
await fijo();
sí(await p.evaluate(() => __vr.ahora()) === 'leer', 'mirar fijo «Leer» entra');
/* «Atrás» abajo y enfrente */
await girar(0, grados(29));
let f = await foco(); if(f !== 'Atrás'){ await girar(0, grados(-58)); f = await foco(); }
sí(f === 'Atrás', `mirando abajo está «Atrás» (${f})`);
await p.screenshot({ path: CAPS + '/vr-mirada-atras.png' });
await fijo();
sí(await p.evaluate(() => __vr.ahora()) === 'inicio', 'mirar fijo «Atrás» regresa al inicio');
const abajo = my - 195;
/* lo mismo en Cine y en Ajustes */
for(const [nombre, g] of [['Cine', -21], ['Ajustes', 63]]){
  await girar(422 + grados(g) - mx, 195 - my);   /* directo, sin quedarse en «Leer» al pasar por el centro */
  const ff = await foco(); await fijo();
  const dentro = await p.evaluate(() => __vr.ahora());
  await girar(422 - mx, 195 + abajo - my); await p.waitForTimeout(200);   /* directo a «Atrás» */
  const fa = await foco(); await fijo();
  sí(ff === nombre && dentro !== 'inicio' && fa === 'Atrás' && await p.evaluate(() => __vr.ahora()) === 'inicio', `«${nombre}»: entra mirándolo y sale mirando «Atrás» (${ff} → ${dentro} → ${fa})`);
}
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
