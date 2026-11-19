/* MAZI VR · botones con la mano: el imán (el rayo que pasa cerca de un botón cuenta) y agarrar = clic.
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
/* un rayo desde la cabeza que pasa 3° por debajo de la orilla de «Atrás» */
const r = await p.evaluate(() => { const V = __vr, T = V.THREE, o = V.cabeza.getWorldPosition(new T.Vector3()), c = V.atras.getWorldPosition(new T.Vector3());
  const d = c.clone().sub(o).normalize(), lado = new T.Vector3(0, 1, 0).cross(d).normalize(), abajo = d.clone().cross(lado).normalize();
  const malla = V.atras.isMesh ? V.atras : V.atras.children.find((m) => m.isMesh) || V.atras;
  const g = malla.geometry; g.computeBoundingBox(); const alto = (g.boundingBox.max.y - g.boundingBox.min.y) * malla.getWorldScale(new T.Vector3()).y / 2;
  const ang = Math.atan(alto / c.distanceTo(o)) + 3 * Math.PI / 180;
  const dCerca = d.clone().applyAxisAngle(lado, -ang), dLejos = d.clone().applyAxisAngle(lado, -(ang + 10 * Math.PI / 180));
  const L = [malla]; return { cerca: V.iman(o, dCerca, L)?.object === malla, lejos: !!V.iman(o, dLejos, L), directo: new T.Raycaster(o, dCerca).intersectObjects(L, false).length };
});
sí(r.directo === 0 && r.cerca, 'un rayo que pasa 3° fuera de «Atrás» igual lo agarra (imán)');
sí(!r.lejos, 'pero uno a 13° ya no');
/* agarrar: la mano apuntaba a «Atrás» y se cierra → clic en «Atrás» (regresa al inicio) */
await p.evaluate(() => { const V = __vr, malla = V.atras.isMesh ? V.atras : V.atras.children.find((m) => m.isMesh) || V.atras;
  const mano = { agarro: performance.now(), objetoAntes: malla };
  let puesto = false; const R = { origen: V.cabeza.getWorldPosition(new V.THREE.Vector3()), dir: new V.THREE.Vector3(0, 1, 0), pellizco: false, mano };
  V.extra.rayo = R; V.extra.rayos = [R]; V.extra.botones = []; V.extra.botones[V.B.X] = true; });
await p.waitForTimeout(400);
sí(await p.evaluate(() => __vr.ahora()) === 'inicio', `cerrar la mano sobre «Atrás» regresa (${await p.evaluate(() => __vr.ahora())})`);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
