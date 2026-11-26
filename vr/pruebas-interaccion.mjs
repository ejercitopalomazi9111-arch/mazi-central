/* LAS REGLAS DE INTERACCIÓN DE TODO MAZI ARE1 (prompt maestro de Carlos §2.3-2.4; y 25 nov: «está haciendo click
   instantáneo»):
     · un pellizco sólo elige si llevabas AJ.estable ms (720, Carlos 26 nov) apuntando a eso: apuntar y pellizcar de golpe y
       quitarse no elige; si sigues apuntando, se elige al cumplirse la espera (no se pierde el clic);
     · con las manos, apuntar fijo NO elige solo (Carlos, 26 nov: «que no se presionen automáticamente»);
     · dos elecciones seguidas necesitan AJ.enfriar ms (250) entre ellas;
     · tras elegir, 350 ms sin clics por pellizco (anti-cascada);
     · el tono de foco y el de elegir existen y respetan «Sonidos: No».
     node vr/pruebas-interaccion.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => [];
  window.__tonos = 0; const st = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function(...a){ window.__tonos++; return st.apply(this, a); };
  try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1 })); }catch{} });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio');
await p.evaluate(() => __vr.despertarAudio());
await p.evaluate(() => __vr.ir('ajustes')); await p.waitForTimeout(600);
/* la mirada lejos de todo, para que el foco lo dé sólo la mano */
await p.evaluate(() => { __vr.sim.yaw = 2.5; __vr.sim.pitch = -1.2; });
/* apuntar con la mano a un renglón `espera` ms y luego pellizcar `veces` veces, separadas por `entre` ms */
const pellizcar = (titulo, espera, veces = 1, entre = 0, despues = 0) => p.evaluate(async ([t, espera, veces, entre, despues]) => { const V = __vr, T = V.THREE;
  const z = __ajustes.elegibles().find((x) => x.userData.panel.titulo === t), g = z.geometry.parameters, pos = z.localToWorld(new T.Vector3(g.width * .15, -g.height * .15, 0)), o = V.cabeza.getWorldPosition(new T.Vector3());
  const R = { origen: o, dir: pos.sub(o).normalize(), pellizco: false }; let botones = [];
  const poner = () => { V.extra.rayo = R; V.extra.rayos = [R]; V.extra.botones = botones; }; V.alCuadro.push(poner);
  /* un cuadro de verdad (en este Chromium sin tarjeta gráfica, ~100 ms cada uno) */
  const cuadro = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  if(espera){ await cuadro(); await dormir(espera); }   /* con espera 0: apunta y pellizca en el MISMO cuadro */
  const uno = () => new Promise((r) => requestAnimationFrame(r));
  for(let i = 0; i < veces; i++){ R.pellizco = true; botones = Object.assign([], { [V.B.X]: true }); await (veces > 1 ? uno() : cuadro()); R.pellizco = false; botones = []; await (veces > 1 ? uno() : cuadro()); if(entre) await dormir(entre); }
  if(despues) await dormir(despues);
  V.alCuadro.splice(V.alCuadro.indexOf(poner), 1); V.extra.rayo = null; V.extra.rayos = []; V.extra.botones = []; await cuadro(); }, [titulo, espera, veces, entre, despues]);
const mano3d = () => p.evaluate(() => __vr.AJ.manoModelo !== false);
let a = await mano3d(); await pellizcar('Mano 3D', 0);
sí(await mano3d() === a, 'apuntar, pellizcar de golpe y quitarse NO elige: ya no hay clic instantáneo');
await p.waitForTimeout(500);
a = await mano3d(); await pellizcar('Mano 3D', 0, 1, 0, 1100);
sí(await mano3d() !== a, 'pellizcar de golpe y SEGUIR apuntando sí elige, al cumplirse la espera (el clic no se pierde)');
await p.waitForTimeout(500);
a = await mano3d(); await pellizcar('Mano 3D', 0, 0, 0, 3400);
sí(await mano3d() === a, 'apuntar fijo 3.4 s con la mano, sin pellizcar, NO elige solo');
await p.waitForTimeout(500);
a = await mano3d(); await pellizcar('Mano 3D', 820);
sí(await mano3d() !== a, 'apuntando 820 ms y luego pellizcando, sí elige al instante');
await p.waitForTimeout(500);
a = await mano3d(); await pellizcar('Mano 3D', 820, 2, 0);
sí(await mano3d() !== a, 'dos pellizcos seguidos (soltar y volver a juntar en un par de cuadros) cuentan UNA vez');
await p.waitForTimeout(500);
const t0 = await p.evaluate(() => window.__tonos); await pellizcar('Mano 3D', 820);
sí(await p.evaluate(() => window.__tonos) > t0, 'al apuntar y elegir suena su tono suave');
await p.evaluate(() => { __vr.AJ.tonos = false; }); await p.waitForTimeout(400);
const t1 = await p.evaluate(() => window.__tonos); await pellizcar('Mano 3D', 820);
sí(await p.evaluate(() => window.__tonos) === t1, 'con «Sonidos: No» no suena nada');
await p.evaluate(() => { __vr.AJ.tonos = true; __vr.AJ.manoModelo = true; __vr.guardar(); });
sí(!errores.length, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
