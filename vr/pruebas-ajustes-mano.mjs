/* AJUSTES CON LA VISTA Y CON LA MANO, de verdad (Carlos, 19 nov: «todavía no puedo manejar ajustes desde la mano o con
   la vista» y «cada vez que pellizco el aire se activa y se desactiva»):
     · mirar fijo el «›» de un número lo sube; mirar fijo un Sí/No lo voltea;
     · pellizcar apuntando a un renglón lo cambia;
     · pellizcar el aire en Ajustes, en el Cine y en el Lector no cambia NADA (antes la X del pellizco volteaba el renglón,
       pausaba el video y prendía el modo solo);
     · la X del control sí sigue funcionando.
     node vr/pruebas-ajustes-mano.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => [];
  try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1 })); }catch{} });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio');
await p.evaluate(() => __vr.ir('ajustes')); await p.waitForTimeout(600);
/* voltear la cabeza hacia una zona (como si la miraras) */
const mirar = (titulo, cual = -1) => p.evaluate(([t, c]) => { const V = __vr, T = V.THREE;
  const zs = __ajustes.elegibles().filter((z) => z.userData.panel.titulo === t), z = zs.at(c);
  const pos = z.getWorldPosition(new T.Vector3()), ojo = V.cabeza.getWorldPosition(new T.Vector3()), d = pos.sub(ojo).normalize();
  /* el giro de la cabeza es el del rig + el simulado: se resta el del rig */
  const yawRig = V.cabeza.parent ? new T.Euler().setFromQuaternion(V.cabeza.parent.getWorldQuaternion(new T.Quaternion()), 'YXZ').y : 0;
  V.sim.yaw = Math.atan2(-d.x, -d.z) - yawRig; V.sim.pitch = Math.asin(d.y); return zs.length; }, [titulo, cual]);
const esperar = (ms) => p.waitForTimeout(ms);
const k1 = await p.evaluate(() => __vr.AJ.k1);
await mirar('Lente', -1); await esperar(400);
sí(await p.evaluate(() => __vr.focoActual()) === 'Lente', `al mirar el «›» de Lente se enfoca (${await p.evaluate(() => __vr.focoActual())})`);
await esperar(2900);
const k1b = await p.evaluate(() => __vr.AJ.k1);
sí(k1b > k1, `mirar fijo el «›» sube Lente (${k1} → ${k1b})`);
/* Sí/No mirando: Mano 3D */
const m0 = await p.evaluate(() => __vr.AJ.manoModelo !== false);
await mirar('Mano 3D'); await esperar(3300);
const m1 = await p.evaluate(() => __vr.AJ.manoModelo !== false);
sí(m0 !== m1, `mirar fijo «Mano 3D» la voltea (${m0} → ${m1})`);
/* pellizcar apuntando: el rayo de la mano a la zona de Mano 3D */
const pellizco = (apuntar) => p.evaluate(async ([t]) => { const V = __vr, T = V.THREE;
  let R = null;
  if(t){ const z = __ajustes.elegibles().find((x) => x.userData.panel.titulo === t), pos = z.getWorldPosition(new T.Vector3()), o = V.cabeza.getWorldPosition(new T.Vector3());
    R = { origen: o, dir: pos.sub(o).normalize(), pellizco: false }; }
  else R = { origen: new T.Vector3(0, 0, 0), dir: new T.Vector3(0, -1, 0), pellizco: false };
  const cuadro = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  V.extra.rayo = R; V.extra.rayos = [R]; V.extra.botones = []; await cuadro();
  R.pellizco = true; V.extra.botones = Object.assign([], { [V.B.X]: true }); await cuadro(); await cuadro();
  R.pellizco = false; V.extra.botones = []; await cuadro();
  V.extra.rayo = null; V.extra.rayos = []; await cuadro(); }, [apuntar]);
/* lejos de todo para que la mirada no cuente */
await p.evaluate(() => { __vr.sim.yaw = Math.PI; __vr.sim.pitch = 0; }); await esperar(300);
const m2 = await p.evaluate(() => __vr.AJ.manoModelo !== false);
await pellizco('Mano 3D'); await esperar(200);
const m3 = await p.evaluate(() => __vr.AJ.manoModelo !== false);
sí(m2 !== m3, `pellizcar apuntando a «Mano 3D» la voltea (${m2} → ${m3})`);
/* pellizcar el aire: nada cambia */
const antes = await p.evaluate(() => JSON.stringify(__vr.AJ));
for(let i = 0; i < 4; i++) await pellizco(null);
sí(await p.evaluate(() => JSON.stringify(__vr.AJ)) === antes, 'pellizcar el aire en Ajustes no cambia ningún renglón');
/* la X del control (Enter) sí: el renglón de Mano 3D con Enter no hace nada raro, pero la flecha sí cambia */
const m4 = await p.evaluate(() => __vr.AJ.manoModelo !== false);
await mirar('Mano 3D'); await esperar(300); await p.keyboard.press('ArrowRight'); await esperar(200);
sí(await p.evaluate(() => __vr.AJ.manoModelo !== false) !== m4, 'con el control (flecha) también se cambia');
await p.evaluate(() => { __vr.AJ.manoModelo = true; __vr.guardar(); });
/* Cine y Lector: pellizcar el aire no pausa ni prende el modo solo */
for(const vista of ['cine', 'leer']){
  await p.evaluate((v) => { __vr.sim.yaw = Math.PI; __vr.ir(v); }, vista); await esperar(500);
  const hud0 = await p.evaluate(() => document.querySelector('#hud')?.textContent || '');
  let cambios = 0; await p.exposeFunction?.('x', () => {}).catch(() => {});
  const ahora0 = await p.evaluate(() => __vr.ahora());
  for(let i = 0; i < 3; i++) await pellizco(null);
  const hud1 = await p.evaluate(() => document.querySelector('#hud')?.textContent || '');
  sí(await p.evaluate(() => __vr.ahora()) === ahora0 && !/Pausa|Solo/.test(hud1.replace(hud0, '')), `pellizcar el aire en «${vista}» no hace nada (${ahora0})`);
}
sí(!errores.length, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
