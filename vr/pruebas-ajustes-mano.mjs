/* AJUSTES CON LA VISTA Y CON LA MANO, de verdad (Carlos, 19 nov: «todavía no puedo manejar ajustes desde la mano o con
   la vista» y «cada vez que pellizco el aire se activa y se desactiva»):
     · mirar fijo el «›» de un número lo sube; mirar fijo un Sí/No lo voltea;
     · pellizcar apuntando a un renglón lo cambia;
     · pellizcar el aire en Ajustes, en el Cine y en el Lector no cambia NADA (antes la X del pellizco volteaba el renglón,
       pausaba el video y prendía el modo solo);
     · la X del control sí sigue funcionando;
     · el renglón no se suelta por un temblor de la cabeza;
     · y nada de eso hace ruido.
     node vr/pruebas-ajustes-mano.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => [];
  /* cuenta cada sonido que arranca (Carlos: «quita todo sonido de interacción») */
  window.__sonidos = 0; const st = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function(...a){ window.__sonidos++; return st.apply(this, a); };
  try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1 })); }catch{} });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio');
await p.evaluate(() => __vr.ir('ajustes')); await p.waitForTimeout(600);
/* voltear la cabeza hacia una zona (como si la miraras) */
const mirar = (titulo, cual = -1) => p.evaluate(([t, c]) => { const V = __vr, T = V.THREE;
  const zs = __ajustes.elegibles().filter((z) => z.userData.panel.titulo === t), z = zs.at(c);
  /* un poco fuera del centro: el centro exacto cae en la diagonal donde se juntan los dos triángulos del plano y el rayo,
     por redondeo, puede no tocar ninguno (en el visor nunca miras a 1e-16 de esa línea) */
  const g = z.geometry.parameters, pos = z.localToWorld(new T.Vector3(g.width * .15, -g.height * .15, 0)), ojo = V.cabeza.getWorldPosition(new T.Vector3()), d = pos.sub(ojo).normalize();
  V.sim.yaw = Math.atan2(-d.x, -d.z); V.sim.pitch = Math.asin(d.y); return zs.length; }, [titulo, cual]);
const esperar = (ms) => p.waitForTimeout(ms);
const k1 = await p.evaluate(() => __vr.AJ.k1);
await mirar('Lente', -1); await esperar(400);
sí(await p.evaluate(() => __vr.focoActual()) === 'Lente', `al mirar el «›» de Lente se enfoca (${await p.evaluate(() => __vr.focoActual())})`);
await esperar(2900);
const k1b = await p.evaluate(() => __vr.AJ.k1);
sí(k1b > k1, `mirar fijo el «›» sube Lente (${k1} → ${k1b})`);
/* temblor: la mirada se sale 2 cm hacia el renglón de abajo y regresa, cada 120 ms; el «›» no se suelta y sigue subiendo */
const k1c = await p.evaluate(() => __vr.AJ.k1);
await p.evaluate(async () => { const V = __vr, T = V.THREE, z = __ajustes.elegibles().filter((x) => x.userData.panel.titulo === 'Lente').at(-1), g = z.geometry.parameters;
  const apunta = (y) => { const pos = z.localToWorld(new T.Vector3(g.width * .15, y, 0)), o = V.cabeza.getWorldPosition(new T.Vector3()), d = pos.sub(o).normalize();
    V.sim.yaw = Math.atan2(-d.x, -d.z); V.sim.pitch = Math.asin(d.y); };
  for(let i = 0; i < 30; i++){ apunta(i % 2 ? -g.height / 2 - .02 : -g.height * .15); await new Promise((r) => setTimeout(r, 120)); } });
const k1d = await p.evaluate(() => __vr.AJ.k1);
sí(k1d > k1c, `con la cabeza temblando entre dos renglones, el «›» de Lente no se suelta y sigue subiendo (${k1c} → ${k1d})`);
/* Sí/No mirando: Mano 3D */
const m0 = await p.evaluate(() => __vr.AJ.manoModelo !== false);
await mirar('Mano 3D'); await esperar(3300);
const m1 = await p.evaluate(() => __vr.AJ.manoModelo !== false);
sí(m0 !== m1, `mirar fijo «Mano 3D» la voltea (${m0} → ${m1})`);
/* pellizcar apuntando: el rayo de la mano a la zona de Mano 3D */
const pellizco = (apuntar) => p.evaluate(async ([t]) => { const V = __vr, T = V.THREE;
  let R = null;
  if(t){ const z = __ajustes.elegibles().find((x) => x.userData.panel.titulo === t), g = z.geometry.parameters, pos = z.localToWorld(new T.Vector3(g.width * .15, -g.height * .15, 0)), o = V.cabeza.getWorldPosition(new T.Vector3());
    R = { origen: o, dir: pos.sub(o).normalize(), pellizco: false }; }
  else R = { origen: new T.Vector3(0, 0, 0), dir: new T.Vector3(0, -1, 0), pellizco: false };
  /* la mano de mentiras se pone DESPUÉS de manos.js en cada cuadro (con las manos apagadas, manos.js borra el rayo) */
  let botones = [];
  const poner = () => { V.extra.rayo = R; V.extra.rayos = [R]; V.extra.botones = botones; }; V.alCuadro.push(poner);
  const cuadro = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await cuadro(); await cuadro(); await new Promise((r) => setTimeout(r, 350));   /* 27 nov: el pellizco elige lo que llevas apuntando de corrido 250 ms */
  R.pellizco = true; botones = Object.assign([], { [V.B.X]: true }); await cuadro(); await cuadro();
  R.pellizco = false; botones = []; await cuadro();
  V.alCuadro.splice(V.alCuadro.indexOf(poner), 1); V.extra.rayo = null; V.extra.rayos = []; V.extra.botones = []; await cuadro(); }, [apuntar]);
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
sí(await p.evaluate(() => window.__sonidos) === 0, `ni un sonido al mirar, pellizcar, cambiar renglones ni entrar a las vistas (${await p.evaluate(() => window.__sonidos)})`);
sí(!errores.length, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
