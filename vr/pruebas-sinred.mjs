/* MAZI VR SIN INTERNET Y RÁPIDO (Carlos, 18 nov: «toco entrar y tarda años en cargar, hazlo que funcione offline»).
   Un Chromium de verdad con el trabajador de fondo PRENDIDO, contra un servidor local que imita a Cloudflare (le quita el
   index.html con un 307):
     1. con red: abre el visor, el trabajador guarda todo (también las manos) y la entrada prende «Sin internet»;
     2. se APAGA EL SERVIDOR de a de veras y el navegador se pone sin red;
     3. se vuelve a abrir: carga, Entrar llega al inicio rápido, y Leer y Cine abren;
     4. la cámara ya no se abre dos veces la segunda vez (se recuerda la gran angular).
   Uso: node vr/pruebas-sinred.mjs */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let pasan = 0, fallan = 0; const ok = (c, t) => { c ? pasan++ : fallan++; console.log((c ? '✓ ' : '✗ ') + t); };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav', '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.wasm': 'application/wasm', '.task': 'application/octet-stream' };
const servidor = http.createServer((q, res) => {
  const u = new URL(q.url, 'http://x');
  if(u.pathname.endsWith('/index.html')){ res.writeHead(307, { location: u.pathname.slice(0, -10) + u.search }); res.end(); return; }   // como Cloudflare
  let f = path.join(raiz, decodeURIComponent(u.pathname));
  if(fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if(!f.startsWith(raiz) || !fs.existsSync(f)){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, r));
const base = `http://localhost:${servidor.address().port}`, URL_VR = `${base}/vr/?sw`;

const nav = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await nav.newContext({ viewport: { width: 844, height: 390 }, permissions: ['camera'] });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
const camaras = []; await ctx.exposeBinding('__contarCamara', () => camaras.push(Date.now()));
await ctx.addInitScript(() => { const o = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices); if(o) navigator.mediaDevices.getUserMedia = (c) => { window.__contarCamara?.(); return o(c); }; });

/* 1 · con red */
await p.goto(URL_VR, { waitUntil: 'load' });
await p.evaluate(() => navigator.serviceWorker.ready);
await p.waitForSelector('#eGuardado.si', { timeout: 90000 }).catch(() => {});
ok(await p.locator('#eGuardado.si').count() === 1, 'con red: todo queda guardado y la entrada dice «Sin internet»');
const guardado = await p.evaluate(async () => { const c = await caches.open((await caches.keys()).find((k) => k.startsWith('mazivr-')));
  return (await c.keys()).map((r) => new URL(r.url).pathname); });
ok(guardado.includes('/vr/') && guardado.some((u) => u.endsWith('hand_landmarker.task')) && guardado.some((u) => u.endsWith('vision_wasm_internal.wasm')),
  `guarda la página y las manos (${guardado.length} archivos)`);
ok(!guardado.includes('/vr/index.html'), 'la página se guarda con su dirección limpia, no la redirigida');
/* la versión: la de la página y la del trabajador son la misma, se ve en la entrada y dice «actualizada» al cambiar */
{ const vPag = +fs.readFileSync(path.join(raiz, 'vr/index.html'), 'utf8').match(/const VERSION = (\d+)/)[1], vSW = +fs.readFileSync(path.join(raiz, 'vr/sw.js'), 'utf8').match(/mazivr-v(\d+)/)[1];
  ok(vPag === vSW, `la versión de la página (${vPag}) y la del trabajador (${vSW}) son la misma`);
  ok((await p.textContent('#version')).trim() === `v${vPag} · actualizada`, `la primera vez dice «v${vPag} · actualizada»`);
  await p.reload({ waitUntil: 'load' });
  ok((await p.textContent('#version')).trim() === `v${vPag}`, `al volver a abrir sólo dice «v${vPag}»`);
  await p.evaluate(() => localStorage.setItem('mazivr.version', '1')); await p.reload({ waitUntil: 'load' });
  ok((await p.textContent('#version')).trim() === `v${vPag} · actualizada`, 'viniendo de una versión vieja, dice «actualizada»'); }
/* una primera entrada con red: aquí se aprende cuál es la cámara */
await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
await p.waitForTimeout(1500);

/* 2 · se apaga el servidor de a de veras */
await new Promise((r) => servidor.close(r)); servidor.closeAllConnections?.();
await ctx.setOffline(true);
camaras.length = 0;

/* 3 · sin red */
const t0 = Date.now();
await p.goto(URL_VR, { waitUntil: 'load' }).catch((e) => errores.push('goto: ' + e.message));
ok(await p.locator('#bEntrar').count() === 1, `sin red: el visor abre (${Date.now() - t0} ms)`);
await p.waitForTimeout(400);
const t1 = Date.now();
await p.click('#bEntrar');
const llego = await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 }).then(() => true).catch(() => false);
const ms = Date.now() - t1;
ok(llego && ms < 3000, `Entrar llega al inicio sin red en ${ms} ms`);
await p.waitForTimeout(1200);
ok(camaras.length === 1, `la cámara se abre una sola vez (${camaras.length})`);
await p.evaluate(() => __vr.ir('leer')); await p.waitForTimeout(800);
ok(await p.evaluate(() => __vr.ahora() === 'leer' && __lector.estado().fase === 'estante'), 'Leer abre sin red');
await p.evaluate(() => __vr.ir('cine')); await p.waitForTimeout(400);
ok(await p.evaluate(() => __vr.ahora() === 'cine'), 'el cine abre sin red');
const manos = await p.waitForFunction(() => window.__manos && (window.__manos.listo || window.__manos.error), null, { timeout: 60000 }).then(() => p.evaluate(() => window.__manos.listo || window.__manos.error)).catch(() => 'no cargó');
ok(manos === true, `las manos cargan sin red (${manos})`);
await p.screenshot({ path: (process.env.CAPS || '/tmp') + '/vr-sinred.png' });
ok(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${pasan} bien · ${fallan} mal`); await nav.close(); process.exit(fallan ? 1 : 0);
