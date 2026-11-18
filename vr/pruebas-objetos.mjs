/* MAZI VR · OBJETOS (agarrar y la pistola). Sin cámara: manos de mentiras que apuntan, pellizcan, mueven y sueltan.
   Comprueba que Juegos → Objetos abre con la mesa y sus cosas, que pellizcar apuntando a una caja la agarra y la mueve con
   la mano, que al soltarla cae, que la pistola se queda en la mano sin pellizcar, que doblar el índice dispara y le da a
   una diana, y que Atrás primero suelta y luego regresa.
     node vr/pruebas-objetos.mjs     (con el servidor del repo en :8765) */
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
await p.evaluate(() => __vr.ir('juegos')); await p.waitForTimeout(300);
await p.evaluate(() => __vr.ir('objetos')); await p.evaluate(() => __objetos.armado); await p.waitForTimeout(1500);
let e = await p.evaluate(() => __objetos.estado());
sí(e.listo && e.objetos === 8, `Objetos abre con la mesa y sus cosas (${e.objetos})`);
const sobreMesa = Object.entries(e.pos).filter(([k, v]) => v[1] > e.mesa - .02 && v[1] < e.mesa + .25).length;
sí(sobreMesa === 8, `todo descansa en la mesa (${sobreMesa} de 8, mesa a ${e.mesa})`);
await p.screenshot({ path: CAPS + '/vr-objetos.png' });

/* una mano de mentiras: apunta en la dirección dada desde la cabeza */
const mano = (dir, pellizco, ejes) => p.evaluate(([dir, pellizco, ejes]) => { const V = window.__vr, T = V.THREE;
  if(!window.__falsasPuesto){ window.__falsasPuesto = true; let real = []; Object.defineProperty(V.extra, 'manos', { get: () => window.__falsas ?? real, set: (v) => { real = v; }, configurable: true }); }
  if(!dir){ window.__falsas = []; return; }
  const c = V.cabeza.getWorldPosition(new T.Vector3()), d = new T.Vector3(...dir).normalize();
  const E = ejes && { adelante: new T.Vector3(...ejes.adelante).normalize(), lado: new T.Vector3(...ejes.lado).normalize(), indice: new T.Vector3(...ejes.adelante).normalize(), doblez: ejes.doblez };
  window.__falsas = [{ pellizco, x: .5, y: .5, dist: .5, mundo: { indice: c.clone().addScaledVector(d, .5) }, ejes: E }];
}, [dir, pellizco, ejes]);
const hacia = (w) => p.evaluate((w) => { const c = __vr.cabeza.getWorldPosition(new __vr.THREE.Vector3()); return new __vr.THREE.Vector3(...w).sub(c).normalize().toArray(); }, w);

/* agarrar la caja */
let dCaja = await hacia(await p.evaluate(() => __objetos.donde('caja')));
await mano(dCaja, false); await p.waitForTimeout(150); await mano(dCaja, true); await p.waitForTimeout(200);
e = await p.evaluate(() => __objetos.estado()); sí(e.sostenidos.includes('caja'), `pellizcar apuntando a la caja la agarra (${e.sostenidos})`);
const antes = await p.evaluate(() => __objetos.donde('caja'));
const arriba = [dCaja[0] + .3, dCaja[1] + .7, dCaja[2]];
for(let k = 1; k <= 6; k++){ await mano(dCaja.map((v, i) => v + (arriba[i] - v) * k / 6), true); await p.waitForTimeout(60); }
await p.waitForTimeout(200);
const despues = await p.evaluate(() => __objetos.donde('caja'));
sí(despues[1] > antes[1] + .2, `la caja sigue a la mano (sube de ${antes[1].toFixed(2)} a ${despues[1].toFixed(2)})`);
await mano(arriba, false); await p.waitForTimeout(1500);
e = await p.evaluate(() => __objetos.estado()); const cae = await p.evaluate(() => __objetos.donde('caja'));
sí(!e.sostenidos.includes('caja') && cae[1] < despues[1] - .2, `al soltarla cae (${despues[1].toFixed(2)} → ${cae[1].toFixed(2)})`);
await mano(null); await p.waitForTimeout(200);

/* la pistola */
const dPis = await hacia(await p.evaluate(() => __objetos.donde('pistola')));
await mano(dPis, false); await p.waitForTimeout(150); await mano(dPis, true); await p.waitForTimeout(200);
const blanco = (await p.evaluate(() => __objetos.dianas()))[0]; const dDi = await hacia(blanco);
const ejes = (doblez) => ({ adelante: dDi, lado: [0, 1, 0], doblez });
await mano(dDi, false, ejes(5)); await p.waitForTimeout(700);
e = await p.evaluate(() => __objetos.estado()); sí(e.sostenidos.includes('pistola'), 'la pistola se queda en la mano aunque sueltes el pellizco');
await p.screenshot({ path: CAPS + '/vr-objetos-pistola.png' });
await mano(dDi, false, ejes(75)); await p.waitForTimeout(150);
e = await p.evaluate(() => __objetos.estado()); sí(e.disparos === 1, `doblar el índice dispara (${e.disparos})`);
sí(e.aciertos === 1, `y le da a la diana que apuntas (${e.aciertos})`);
await mano(dDi, false, ejes(80)); await p.waitForTimeout(150);
e = await p.evaluate(() => __objetos.estado()); sí(e.disparos === 1, 'dejar el índice doblado no sigue disparando');
await mano(dDi, false, ejes(10)); await p.waitForTimeout(150); await mano(dDi, false, ejes(70)); await p.waitForTimeout(150);
e = await p.evaluate(() => __objetos.estado()); sí(e.disparos === 2, `estirar y volver a doblar dispara otra vez (${e.disparos})`);
await p.evaluate(() => __vr.vistaActual?.()?.atras?.() ?? __objetos.atras()); await p.waitForTimeout(200);
e = await p.evaluate(() => __objetos.estado()); sí(e.sostenidos.length === 0 && await p.evaluate(() => __vr.ahora()) === 'objetos', 'Atrás primero suelta la pistola');
await mano(null); await p.evaluate(() => __objetos.atras()); await p.waitForTimeout(200);
sí(await p.evaluate(() => __vr.ahora()) === 'juegos', 'y luego regresa a Juegos');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
