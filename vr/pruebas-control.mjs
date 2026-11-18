/* MAZI VR · EL CONTROL CORRECTO (Carlos, 18 nov: «tengo el control pero no detecta ni pulsaciones ni al propio control»).
   Varios Android reportan como «control» el lector de huella o los botones de volumen, y antes se usaba el primero de la
   lista. Aquí el primero es uno falso de 3 botones y el segundo es el PlayStation: la entrada tiene que nombrar al
   PlayStation y sus botones tienen que mover el foco y elegir.
     node vr/pruebas-control.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { const bot = (n) => Array.from({ length: n }, () => ({ pressed: false, value: 0 }));
  window.__huella = { id: 'uinput-fpc', index: 0, connected: true, mapping: '', buttons: bot(3), axes: [], timestamp: 1 };
  window.__pad = { id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', index: 1, connected: true, mapping: 'standard', buttons: bot(17), axes: [0, 0, 0, 0], timestamp: 2 };
  navigator.getGamepads = () => [window.__huella, window.__pad]; });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const boton = async (i) => { await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(100);
  await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(250); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
const chip = await p.textContent('#eControl'); sí(chip === 'PlayStation', `la entrada nombra al control de verdad (${chip})`);
await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
sí(await p.evaluate(() => __vr.hayControl()), 'el visor lo toma como control');
const f0 = await p.evaluate(() => __vr.focoActual()); await boton(14); const f1 = await p.evaluate(() => __vr.focoActual());
sí(f0 !== f1 && f1, `la flecha izquierda mueve el foco (${f0} → ${f1})`);
await boton(0); await p.waitForTimeout(300);
sí(await p.evaluate(() => __vr.ahora()) !== 'inicio', `X entra a «${f1}» (${await p.evaluate(() => __vr.ahora())})`);
await boton(1); await p.waitForTimeout(300);
sí(await p.evaluate(() => __vr.ahora()) === 'inicio', 'Círculo regresa');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
