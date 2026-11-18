/* MAZI VR · las manos de punta a punta: la cámara simulada transmite una foto de una mano que apunta (muestra
   de MediaPipe, se baja a /tmp; no va en el repo) y se comprueba que el modelo carga, ve la mano y que el
   puntero del índice da foco a una tarjeta del inicio.
     node vr/pruebas-manos.mjs     (con el servidor del repo en :8765; pide ffmpeg) */
import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', T = '/tmp/mazivr-manos';
fs.mkdirSync(T, { recursive: true });
if(!fs.existsSync(T + '/mano.y4m')){
  execSync(`curl -sS -o ${T}/mano.jpg https://storage.googleapis.com/mediapipe-assets/pointing_up.jpg`);
  execSync(`ffmpeg -v error -y -loop 1 -i ${T}/mano.jpg -t 3 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -r 15 ${T}/mano.y4m`);
}
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${T}/mano.y4m`, '--enable-unsafe-swiftshader'] });
const ctxM = await b.newContext({ viewport: { width: 844, height: 390 } });
/* con control conectado: mirar fijo no elige solo mientras carga el modelo (si no, a los 2.5 s abre lo de enfrente y la prueba ya no está en el inicio) */
await ctxM.addInitScript(() => { window.__pad = { id: 'Wireless Controller', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__pad]; });
const p = await ctxM.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__manos && (window.__manos.listo || window.__manos.error), null, { timeout: 90000 });
sí(await p.evaluate(() => __manos.listo), 'el modelo de manos carga' + (await p.evaluate(() => __manos.error) ? ': ' + await p.evaluate(() => __manos.error) : ''));
let vistas = 0; for(let i = 0; i < 60 && !vistas; i++){ await p.waitForTimeout(250); vistas = await p.evaluate(() => __manos.manos); }
sí(vistas >= 1, 've la mano de la cámara');
sí(await p.evaluate(() => !!__vr.extra.rayo), 'el índice hace de puntero');
const desde = await p.evaluate(() => { const R = __vr.extra.rayo, P = __manos.punta; return R && P ? Math.hypot(R.origen.x - P[0], R.origen.y - P[1], R.origen.z - P[2]) : 99; });
sí(desde < .02, `el rayo sale de la punta del índice, no de entre el índice y el pulgar (a ${(desde * 100).toFixed(1)} cm)`);
const dirY = await p.evaluate(() => { const d = __vr.extra.rayo.dir.clone().transformDirection(__vr.cabeza.matrixWorldInverse); return d.y; });
sí(dirY > .5, `el dedo apunta hacia arriba y el rayo también (y = ${dirY.toFixed(2)})`);
sí(await p.evaluate(() => !!__vr.focoActual()), 'el puntero da foco a una tarjeta (' + await p.evaluate(() => __vr.focoActual()) + ')');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
