/* MAZI VR · botones con la mano: agarrar YA NO es clic (27 nov, Carlos: «los clic fantasma… nunca, jamás deben pasar por
   accidente»; con el dedo apuntando, MediaPipe a veces lee «puño»). Sólo el pellizco elige.
     node vr/pruebas-agarrar.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => []; });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
await p.evaluate(() => __vr.ir('juegos')); await p.waitForTimeout(500);
/* agarrar: la mano apuntaba a «Atrás» y se cierra → ya NO es clic (se queda en Juegos) */
await p.evaluate(() => { const V = __vr, malla = V.atras.isMesh ? V.atras : V.atras.children.find((m) => m.isMesh) || V.atras;
  const mano = { agarro: performance.now(), objetoAntes: malla };
  let puesto = false; const R = { origen: V.cabeza.getWorldPosition(new V.THREE.Vector3()), dir: new V.THREE.Vector3(0, 1, 0), pellizco: false, mano };
  V.extra.rayo = R; V.extra.rayos = [R]; V.extra.botones = []; V.extra.botones[V.B.X] = true; });
await p.waitForTimeout(400);
sí(await p.evaluate(() => __vr.ahora()) === 'juegos', `cerrar la mano sobre «Atrás» ya no es clic (${await p.evaluate(() => __vr.ahora())})`);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
