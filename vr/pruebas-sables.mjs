/* MAZI VR · SABLES (demo con las manos). Sin cámara de verdad: una «mano» de mentiras que barre de lado a lado frente
   a ti a la altura de los bloques. Comprueba que Juegos → Sables abre, que la partida arranca con su cuenta, que salen
   bloques con su tiempo de vuelo, que el sable corta (aciertos o «Mal», según la flecha) y que no truena nada.
     node vr/pruebas-sables.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const b = await chromium.launch();     // sin cámara: así las manos de mentiras no compiten con el rastreo
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { window.__pad = { id: 'Wireless Controller', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__pad]; });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
await p.evaluate(() => { __vr.ir('juegos'); }); await p.waitForTimeout(300);
await p.evaluate(() => { __vr.ir('sables'); }); await p.waitForTimeout(400);
sí(await p.evaluate(() => __vr.ahora()) === 'sables', 'Juegos → Sables abre');
/* con control: los dos sticks barren de lado a lado (como quien corta rápido con los pulgares) */
await p.evaluate(() => { const mover = () => { const t = performance.now() / 1000, v = Math.sin(t * 7);
  window.__pad.axes[0] = v; window.__pad.axes[2] = -v; window.__pad.axes[1] = .2; window.__pad.axes[3] = .2; requestAnimationFrame(mover); }; mover(); });
await p.evaluate(() => __sables.empezar());
await p.waitForTimeout(1500);
let e = await p.evaluate(() => __sables.estado());
sí(e.estado === 'jugando' && e.bloques > 0, `la partida arranca y salen bloques (${e.bloques})`);
await p.screenshot({ path: CAPS + '/vr-sables.png' });
await p.waitForTimeout(7000);
e = await p.evaluate(() => __sables.estado());
sí(e.aciertos + e.fallas > 0, `el sable corta o se le pasan bloques (${e.aciertos} cortes bien, ${e.fallas} mal o pasados, ${e.puntos} puntos)`);
sí(e.aciertos > 0, `al menos un corte bueno (${e.aciertos})`);
await p.screenshot({ path: CAPS + '/vr-sables-2.png' });
/* salir con Círculo DE VERDAD (por el control, como Carlos): los sables se tienen que apagar y quedarse apagados */
sí((await p.evaluate(() => __sables.estado())).prendidos === 2, 'con control se ven los dos sables');
await p.evaluate(() => { window.__pad.buttons[1] = { pressed: true, value: 1 }; }); await p.waitForTimeout(120);
await p.evaluate(() => { window.__pad.buttons[1] = { pressed: false, value: 0 }; }); await p.waitForTimeout(400);
sí(await p.evaluate(() => __vr.ahora()) === 'juegos', 'Círculo regresa a Juegos');
sí((await p.evaluate(() => __sables.estado())).prendidos === 0, 'y ningún sable se queda flotando en el menú');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
