/* MAZI XR · 6DoF en el navegador (vr/espacial/, el VIO de visloc-rs) con la caminata grabada de un iPhone que
   trae la propia demo: sin sensores ni cámara, se comprueba que el VIO rastrea, que el cubo y lo de MAZI quedan
   anclados al MUNDO mientras la cámara se mueve metros, y que el modo visor pinta los dos ojos.
   La caminata (advio-02, ~8 MB) NO va en el repo: se baja a /tmp y se pasa a VP9 (este Chromium no trae H.264).
     node vr/pruebas-espacial.mjs     (con el servidor del repo en :8765; pide ffmpeg) */
import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp', D = '/tmp/mazixr-demo';
fs.mkdirSync(D, { recursive: true });
const DEMO = 'https://rsasaki0109.github.io/visloc-rs/slam/demo/advio-02';
if(!fs.existsSync(D + '/advio-02.json')) execSync(`curl -sS -o ${D}/advio-02.json ${DEMO}.json`);
if(!fs.existsSync(D + '/advio-02.webm')){
  execSync(`curl -sS -o ${D}/advio-02.mp4 ${DEMO}.mp4`);
  execSync(`ffmpeg -v error -y -i ${D}/advio-02.mp4 -c:v libvpx-vp9 -b:v 2M -deadline realtime -cpu-used 8 -an ${D}/advio-02.webm`);
}

const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.route(/\/vr\/espacial\/demo\/advio-02\.json/, (r) => r.fulfill({ path: D + '/advio-02.json', contentType: 'application/json' }));
await ctx.route(/\/vr\/espacial\/demo\/advio-02\.mp4/, (r) => r.fulfill({ path: D + '/advio-02.webm', contentType: 'video/webm' }));
const p = await ctx.newPage(); const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
p.on('console', (m) => { if(m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(m.text()); });
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };

await p.goto(BASE + '/vr/espacial/', { waitUntil: 'networkidle' });
sí(await p.title() === 'MAZI XR · 6DoF', 'abre la página de MAZI XR');
await p.waitForSelector('#b-demo:not([hidden])', { timeout: 15000 });
await p.click('#b-demo');
/* el VIO tiene que llegar a «track» (posición) con la caminata */
let estado = null;
for(let i = 0; i < 120 && estado !== 'track'; i++){ await p.waitForTimeout(500); estado = await p.evaluate(() => window.__mazi?.estado()); }
sí(estado === 'track', `el VIO rastrea la caminata del iPhone (estado ${estado})`);

/* modo visor, justo al aparecer el cubo (1 m enfrente): los dos ojos tienen que ver lo anclado */
await p.click('#b-visor'); await p.waitForTimeout(400);
const ojos = await p.evaluate(() => ({ visor: document.body.classList.contains('visor'), ...window.__mazi.muestreo() }));
sí(ojos.visor && ojos.izq > 20 && ojos.der > 20, `el visor pinta los dos ojos (izq ${ojos.izq}, der ${ojos.der} pixeles morados de lo anclado)`);
await p.screenshot({ path: CAPS + '/mazixr-visor.png' });
/* anclado: lo de MAZI se queda en su lugar del mundo mientras la cámara recorre metros */
const muestra = () => p.evaluate(() => { const po = window.__mazi.pose(); return po && { p: po.p, cubo: window.__mazi.anclado?.() }; });
const a = await muestra(); await p.waitForTimeout(6000); const c = await muestra();
const recorrido = a && c ? Math.hypot(c.p[0] - a.p[0], c.p[1] - a.p[1], c.p[2] - a.p[2]) : 0;
sí(recorrido > 0.3, `la cámara se movió en el mundo (${recorrido.toFixed(2)} m en 6 s)`);
const anc = await p.evaluate(() => window.__mazi.anclado());
await p.waitForTimeout(2000);
const anc2 = await p.evaluate(() => window.__mazi.anclado());
sí(anc && anc2 && anc.visible && Math.hypot(anc2.x - anc.x, anc2.y - anc.y, anc2.z - anc.z) < 1e-9, `lo anclado no se mueve mientras caminas (${anc && anc.x.toFixed(2)}, ${anc && anc.y.toFixed(2)}, ${anc && anc.z.toFixed(2)})`);
await p.screenshot({ path: CAPS + '/mazixr-ar.png' });

sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
