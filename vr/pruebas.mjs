/* MAZI VR · pruebas en un navegador de verdad, con un control de PlayStation y una cámara simulados.
     node vr/pruebas.mjs          (con el servidor del repo en :8765; capturas a CAPS, por defecto /tmp)
   Comprueba: que entra sin errores, que el control mueve el foco y elige, los ajustes cambian y se guardan,
   la realidad mixta prende con la cámara, el cine dice que no hay videos y Options regresa al inicio. */
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, permissions: ['camera'] });
await ctx.addInitScript(() => {
  /* el control: 17 botones y 4 ejes, como el mapeo estándar de un DualSense en Safari */
  window.__pad = { id: 'DualSense Wireless Controller', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [window.__pad, null, null, null];
});
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });
let ok = 0, mal = 0; const sí = (c, t) => { if(c){ ok++; console.log('✓', t); } else { mal++; console.log('✗', t); } };
const boton = async (i) => { await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, touched: true, value: 1 }; }, i); await p.waitForTimeout(80);
  await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, touched: false, value: 0 }; }, i); await p.waitForTimeout(160); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' });
sí(await p.locator('#eControl.si').count() === 1, 'la entrada ve el control');
await p.click('#bEntrar'); await p.waitForTimeout(2500);
sí(await p.evaluate(() => window.__vr.ahora()) === 'inicio', 'entra al inicio');
await p.screenshot({ path: CAPS + '/vr-inicio.png' });
/* foco con flechas: la mira empieza en «Cine»… se mueve a la derecha dos veces y llega a Ajustes */
await boton(15); await boton(15); await boton(15); await boton(15);
await boton(0); await p.waitForTimeout(400);
sí(await p.evaluate(() => window.__vr.ahora()) === 'ajustes', 'X sobre Ajustes abre los ajustes');
const k1 = await p.evaluate(() => window.__vr.AJ.k1); await boton(15); await p.waitForTimeout(200);
sí(Math.abs(await p.evaluate(() => window.__vr.AJ.k1) - k1 - .02) < 1e-6, 'la flecha derecha sube el lente');
sí((await p.evaluate(() => JSON.parse(localStorage.getItem('mazivr.ajustes')).k1)) > k1, 'el ajuste se guarda');
await p.screenshot({ path: CAPS + '/vr-ajustes.png' });
await boton(9); await p.waitForTimeout(300);
sí(await p.evaluate(() => window.__vr.ahora()) === 'inicio', 'Options regresa al inicio');
await boton(3); await p.waitForTimeout(1200);
sí(await p.evaluate(() => window.__vr.AJ.mixta) === true, 'triángulo prende la realidad mixta');
await p.screenshot({ path: CAPS + '/vr-mixta.png' });
await boton(3); await p.waitForTimeout(300);
await boton(14); await boton(14); await boton(14); await boton(14); await boton(15); await p.waitForTimeout(200); await boton(0); await p.waitForTimeout(600);
sí(await p.evaluate(() => window.__vr.ahora()) === 'cine', 'X sobre Cine abre el cine');
await p.screenshot({ path: CAPS + '/vr-cine.png' });
await boton(1); await p.waitForTimeout(300);
sí(await p.evaluate(() => window.__vr.ahora()) === 'inicio', 'círculo regresa');
/* el stick derecho gira 30° */
const antes = await p.evaluate(() => window.__vr.rig.rotation.y);
await p.evaluate(() => { window.__pad.axes[2] = 1; }); await p.waitForTimeout(200); await p.evaluate(() => { window.__pad.axes[2] = 0; }); await p.waitForTimeout(200);
sí(Math.abs(Math.abs(await p.evaluate(() => window.__vr.rig.rotation.y) - antes) - Math.PI / 6) < .01, 'el stick derecho gira 30°');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`);
await b.close(); process.exit(mal ? 1 : 0);
