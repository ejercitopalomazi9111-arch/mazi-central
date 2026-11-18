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
/* la mano de mentiras: palma abajo-enfrente, sable hacia arriba, barriendo de lado a lado a ~3 m/s */
await p.evaluate(() => {
  const V = __vr, T = V.THREE;
  V.alCuadro.unshift(() => {});   // (nada: las manos se ponen antes de cada cuadro, abajo)
  const mover = () => {
    const t = performance.now() / 1000, x = Math.sin(t * 5) * .6;
    const enCabeza = (x, y, z) => V.cabeza.localToWorld(new T.Vector3(x, y, z));
    V.extra.manos = [{ lado: 1, pellizco: false, x: .5, y: .5, mundo: { palma: enCabeza(x, -.45, -.55), muneca: enCabeza(x, -.6, -.5), punta: enCabeza(x, -.25, -.6) } }];
    requestAnimationFrame(mover);
  };
  mover();
});
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
await p.evaluate(() => __vr.ir('juegos')); await p.waitForTimeout(300);
sí(await p.evaluate(() => __vr.ahora()) === 'juegos', 'Círculo/Atrás regresa a Juegos');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
