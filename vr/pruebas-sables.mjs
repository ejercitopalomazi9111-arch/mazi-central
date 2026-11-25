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
/* CON LAS MANOS (sin control): el sable sale del marco de la palma; «Calibrar» guarda cómo lo agarras y se queda guardado */
{ const c2 = await b.newContext({ viewport: { width: 844, height: 390 } });
  await c2.addInitScript(() => { navigator.getGamepads = () => []; });
  const q = await c2.newPage(); const err2 = []; q.on('pageerror', (e) => err2.push(e.message));
  await q.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await q.click('#bEntrar');
  await q.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
  /* una mano derecha de mentiras: la palma frente a ti, en puño, con su «lado» (meñique → índice) hacia donde se diga */
  const mano = (adelante, lado) => q.evaluate(([a, l]) => { const V = window.__vr, T = V.THREE;
    window.__mano = a ? [{ lado: 1, mundo: { palma: V.cabeza.localToWorld(new T.Vector3(.15, -.1, -.4)), punta: new T.Vector3(), muneca: new T.Vector3(0, -9, 0) }, ejes: { adelante: new T.Vector3(...a).normalize(), lado: new T.Vector3(...l).normalize() } }] : [];
    if(!window.__fijo){ window.__fijo = true; Object.defineProperty(V.extra, 'manos', { get: () => window.__mano, set(){}, configurable: true }); } }, [adelante, lado]);
  const hoja = () => q.evaluate(() => { const h = window.__sables.deMano['1'].st; return { dir: h.dir, local: h.local }; });
  const grados = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI;
  await q.evaluate(() => { __vr.ir('juegos'); __vr.ir('sables'); }); await q.waitForTimeout(400);
  await mano([0, 0, -1], [0, 1, 0]); await q.waitForTimeout(300);
  let h = await hoja();
  sí(h.dir && grados(h.dir, [0, 0, -1]) < 2, `sin calibrar, el sable sale hacia adelante de la palma (${h.dir ? grados(h.dir, [0, 0, -1]).toFixed(1) : '—'}°)`);
  sí((await q.evaluate(() => __sables.elegibles().map((m) => m.userData.panel?.titulo || '').length)) === 2, 'en el menú de Sables están Jugar y Calibrar');
  await q.evaluate(() => __sables.calibrar()); await q.waitForTimeout(2500);
  const est = await q.evaluate(() => __sables.estado().estado);
  h = await hoja();
  sí(est === 'listo' && grados(h.local, [1, 0, 0]) < 3, `Calibrar con el puño (pulgar arriba) termina solo y guarda ese agarre (${est}, ${grados(h.local, [1, 0, 0]).toFixed(1)}° del lado)`);
  await mano([0, 0, -1], [1, 0, 0]); await q.waitForTimeout(1200); h = await hoja();
  sí(grados(h.dir, [1, 0, 0]) < 3, `ya calibrado, girar la mano gira el sable con ella (${grados(h.dir, [1, 0, 0]).toFixed(1)}°)`);
  /* la mano se pierde un instante: el sable se queda; se pierde más: se apaga */
  /* se mira en el primer cuadro sin mano (el navegador de pruebas va a ~6 cuadros por segundo) */
  await q.evaluate(() => { const c = __sables.cuadro; window.__vistos = []; __sables.cuadro = (...x) => { const r = c(...x); window.__vistos.push([__sables.estado().prendidos, performance.now() / 1000 - __sables.deMano['1'].st.visto]); return r; }; });
  await mano(null); await q.evaluate(() => { window.__vistos = []; });
  await q.waitForFunction(() => window.__vistos.length > 0); const [sigue, hueco] = await q.evaluate(() => window.__vistos[0]); console.log('   primer cuadro sin mano, a', hueco.toFixed(2), 's de la última lectura');
  await q.waitForTimeout(600); const apagado = (await q.evaluate(() => __sables.estado())).prendidos;
  /* este navegador va tan lento (medio segundo entre cuadros) que el «instante» casi nunca cabe: eso lo mide pruebas-sable-mano.mjs */
  sí((hueco > .3 || sigue === 1) && apagado === 0, `la mano se pierde: el sable se queda si fue un instante (${hueco <= .3 ? sigue : 'no cupo'}) y se apaga si tarda (${apagado})`);
  await q.reload({ waitUntil: 'networkidle' }); await q.click('#bEntrar');
  await q.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
  await q.evaluate(() => { __vr.ir('juegos'); __vr.ir('sables'); }); await q.waitForTimeout(300); h = await hoja();
  sí(grados(h.local, [1, 0, 0]) < 3, 'la calibración se queda guardada al volver a abrir');
  sí(err2.length === 0, 'sin errores con las manos' + (err2.length ? ': ' + err2.slice(0, 3).join(' | ') : ''));
  await c2.close(); }
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
