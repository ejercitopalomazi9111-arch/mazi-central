/* MAZI VR · el 6DoF DENTRO del motor, con la caminata grabada de un iPhone (la demo de visloc-rs, ADVIO, CC BY-NC: no
   va en el repo, se baja a /tmp como en pruebas-espacial.mjs). También el modo sin visor (tocar elige) y el modo
   exposición (los botones que sacan no sacan).
     node vr/pruebas-seis-motor.mjs     (con el servidor del repo en :8765; pide ffmpeg la primera vez) */
import { createRequire } from 'module'; import { execSync } from 'child_process'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', D = '/tmp/mazixr-demo';
fs.mkdirSync(D, { recursive: true });
const DEMO = 'https://rsasaki0109.github.io/visloc-rs/slam/demo/advio-02';
if(!fs.existsSync(D + '/advio-02.json')) execSync(`curl -sS -o ${D}/advio-02.json ${DEMO}.json`);
if(!fs.existsSync(D + '/advio-02.webm')){ execSync(`curl -sS -o ${D}/advio-02.mp4 ${DEMO}.mp4`); execSync(`ffmpeg -v error -y -i ${D}/advio-02.mp4 -c:v libvpx-vp9 -b:v 2M -deadline realtime -cpu-used 8 -an ${D}/advio-02.webm`); }
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
async function pagina(url){
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
  await ctx.addInitScript(() => { try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ fondo: 1, manos: false })); }catch{} });
  await ctx.route(/\/vr\/espacial\/demo\/advio-02\.json/, (r) => r.fulfill({ path: D + '/advio-02.json', contentType: 'application/json' }));
  await ctx.route(/\/vr\/espacial\/demo\/advio-02\.mp4/, (r) => r.fulfill({ path: D + '/advio-02.webm', contentType: 'video/webm' }));
  const p = await ctx.newPage(); p.errores = [];
  p.on('pageerror', (e) => p.errores.push(e.message));
  p.on('console', (m) => { if(m.type() === 'error' && !/favicon|404|getUserMedia|Permission|NotAllowed|NotFound|Requested device/i.test(m.text())) p.errores.push(m.text()); });
  await p.goto(BASE + url, { waitUntil: 'domcontentloaded' }); return p;
}

/* 1. 6DoF con la caminata grabada */
{
  const p = await pagina('/vr/?demo6=advio-02');
  await p.click('#bEntrar');
  let est = null;
  for(let i = 0; i < 120 && est !== 'track'; i++){ await p.waitForTimeout(500); est = await p.evaluate(() => window.__vr.seis.vio?.S.estado ?? null); }
  sí(est === 'track', `el motor rastrea en 6DoF con la caminata del iPhone (estado ${est})`);
  const leer = () => p.evaluate(() => { const V = window.__vr, c = new V.THREE.Vector3(); V.cabeza.getWorldPosition(c);
    const t = new V.THREE.Vector3(); V.hub.children.find((g) => g.visible)?.children[1]?.getWorldPosition(t); return { c: c.toArray(), t: t.toArray(), st: { ...V.seis.filtro.st, pos: V.seis.filtro.st.pos } }; });
  const a = await leer(); await p.waitForTimeout(6000); const z = await leer();
  const mov = Math.hypot(z.c[0] - a.c[0], z.c[1] - a.c[1], z.c[2] - a.c[2]);
  sí(mov > .3 && z.c.every(Number.isFinite), `tus ojos se mueven por el cuarto (${mov.toFixed(2)} m en 6 s; recorrido total ${z.st.recorrido.toFixed(2)} m)`);
  sí(Math.hypot(z.t[0] - a.t[0], z.t[1] - a.t[1], z.t[2] - a.t[2]) < 1e-9, 'el menú se queda en su lugar del cuarto mientras caminas');
  console.log('   tirado por el filtro:', JSON.stringify(z.st.tirado));
  const an = await p.evaluate(() => ({ cargada: !!window.__vr.seis.ancla, fallos: window.__vr.bitacora.filter((f) => f.codigo !== 'E-CAMARA').map((f) => `${f.codigo} ${f.donde}: ${f.msg}`) }));
  sí(an.cargada && !an.fallos.length, `el ancla del cuarto se busca durante el 6DoF sin errores${an.fallos.length ? ': ' + an.fallos.join(' | ') : ''}`);
  await p.screenshot({ path: '/tmp/mazivr-6dof.png' });
  sí(p.errores.length === 0, 'sin errores' + (p.errores.length ? ': ' + p.errores.slice(0, 3).join(' | ') : ''));
}
/* 2. sin visor: una sola vista y tocar una tarjeta la abre */
{
  const p = await pagina('/vr/');
  await p.click('#bPantalla'); await p.waitForFunction(() => window.__vr?.ahora?.() === 'inicio', null, { timeout: 15000 }); await p.waitForTimeout(800);
  const pt = await p.evaluate(() => { const V = window.__vr; const m = V.hub.children.find((g) => g.visible && g.children.length > 5).children.find((c) => c.userData.panel?.titulo === 'Leer');
    const v = new V.THREE.Vector3(); m.getWorldPosition(v); v.project(V.cabeza); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, mono: V.modo.mono }; });
  await p.waitForTimeout(2600); const antesDeTocar = await p.evaluate(() => window.__vr.ahora());
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(500);
  const ahora = await p.evaluate(() => window.__vr.ahora());
  sí(pt.mono && ahora === 'leer' && antesDeTocar === 'inicio', `sin visor, nada se abre solo (${antesDeTocar}) y tocar «Leer» lo abre (${ahora})`);
  /* 3. modo exposición: Opciones/PS no sacan a nadie */
  /* el botón Opciones del control, puesto un instante (Leer usa el teclado para escribir: por eso no se usa la tecla) */
  const opciones = async () => { await p.evaluate(() => { window.__vr.extra.botones[9] = true; }); await p.waitForTimeout(200); await p.evaluate(() => { window.__vr.extra.botones[9] = false; }); await p.waitForTimeout(200); };
  await p.evaluate(() => { window.__vr.kiosco.activo = true; }); await opciones();
  const tras = await p.evaluate(() => window.__vr.ahora());
  await p.evaluate(() => { window.__vr.kiosco.activo = false; }); await opciones();
  const libre = await p.evaluate(() => window.__vr.ahora());
  sí(tras === 'leer' && libre === 'inicio', `en exposición, Opciones no saca (${tras}); fuera de ella, sí (${libre})`);
  sí(p.errores.length === 0, 'sin errores sin visor' + (p.errores.length ? ': ' + p.errores.slice(0, 3).join(' | ') : ''));
}
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
