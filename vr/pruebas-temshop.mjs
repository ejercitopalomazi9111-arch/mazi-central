/* MAZI VR · el Tem Shop de fondo: carga, se ve en el cuarto virtual y se apaga con Ajustes → Fondo.
     node vr/pruebas-temshop.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => []; });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
p.on('console', (m) => { if(/Tem Shop/.test(m.text())) errores.push(m.text()); });
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
await p.evaluate(() => __temshop.armado); await p.waitForTimeout(600);
let e = await p.evaluate(() => __temshop.estado());
sí(e.visible && e.temmies === 5 && e.piezas >= 8, `el Tem Shop está de fondo (${e.piezas} piezas, ${e.temmies} Temmies)`);
sí(await p.evaluate(() => !__vr.piso.visible), 'la rejilla del espacio se apaga');
await p.screenshot({ path: CAPS + '/vr-temshop.png' });
await p.evaluate(() => { __vr.hub.visible = false; }); await p.waitForTimeout(300); await p.screenshot({ path: CAPS + '/vr-temshop-solo.png' });
await p.evaluate(() => { __vr.rig.rotation.y = Math.PI * .55; }); await p.waitForTimeout(300); await p.screenshot({ path: CAPS + '/vr-temshop-lado.png' });
await p.evaluate(() => { __vr.rig.rotation.y = 0; __vr.hub.visible = true; });
/* las Temmies vibran */
const a = await p.evaluate(() => __temshop.grupo.children.filter((o) => o.userData.base).map((o) => o.position.x).join());
await p.waitForTimeout(200);
sí(a !== await p.evaluate(() => __temshop.grupo.children.filter((o) => o.userData.base).map((o) => o.position.x).join()), 'las Temmies vibran');
/* Ajustes → Fondo: Espacio */
await p.evaluate(() => { __vr.AJ.fondo = true; }); await p.waitForTimeout(300);
e = await p.evaluate(() => ({ ...__temshop.estado(), piso: __vr.piso.visible }));
sí(!e.visible && e.piso, 'en Ajustes se regresa al espacio');
await p.evaluate(() => { __vr.AJ.fondo = 0; }); await p.waitForTimeout(300);
sí(await p.evaluate(() => __temshop.estado().visible), 'y vuelve al Tem Shop');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
