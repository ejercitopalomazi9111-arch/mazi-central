/* MAZI VR · el ANCLA DEL CUARTO (ancla.js): se dibuja la hoja (ArUco id 1, 14 cm) en un lugar conocido del cuarto, se
   ve con una cámara en un lugar conocido, y se comprueba: 1) que la hoja cae donde está; 2) que si el 6DoF se desvió
   (la cámara «cree» estar 25 cm y 6° de donde está), la corrección regresa el mundo a menos de 2 cm y 0.5°.
     node vr/pruebas-ancla.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 700, height: 520 } });
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<script src="/vr/espacial/vendor/aruco/cv.js"></script><script src="/vr/espacial/vendor/aruco/aruco.js"></script>
</head><body style="margin:0"><canvas id="c" width="640" height="480"></canvas>
<script type="module">
import * as THREE from "/vr/vendor/three.module.min.js"; import { montarControl } from "/vr/espacial/control.js"; import { crearAncla } from "/vr/ancla.js";
localStorage.setItem('mazixr-ancla-cm', '14');
const W = 640, H = 480, FOV = 60, fx = (H / 2) / Math.tan(FOV * Math.PI / 360);
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), preserveDrawingBuffer: true }); r.setClearColor(0xbbbbbb, 1);
const escena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 20);
const svg = new AR.Dictionary('ARUCO_MIP_36h12').generateSVG(1);
const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(svg); await img.decode();
const lz = document.createElement('canvas'); lz.width = lz.height = 400; const g = lz.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 400); g.drawImage(img, 50, 50, 300, 300);
const tex = new THREE.CanvasTexture(lz); tex.magFilter = THREE.NearestFilter;
const L = 0.14 * 400 / 240;   /* el cuadro NEGRO (80 % del SVG, 240 de 400 px) mide 14 cm */
const hoja = new THREE.Mesh(new THREE.PlaneGeometry(L, L), new THREE.MeshBasicMaterial({ map: tex })); escena.add(hoja);
const ancla = crearAncla({ THREE, montarControl });
const lee = document.createElement('canvas'); lee.width = W; lee.height = H; const lc = lee.getContext('2d', { willReadFrequently: true });
const K = { fx, fy: fx, cx: W / 2, cy: H / 2 };
const yawDe = (v) => Math.atan2(-v.z, v.x);
function foto(c){ cam.position.copy(c.pos); cam.quaternion.copy(c.quat); cam.updateMatrixWorld(true); r.render(escena, cam); lc.drawImage(r.domElement, 0, 0); return lc.getImageData(0, 0, W, H).data; }
const verdadYaw = () => { const x = new THREE.Vector3(1, 0, 0).applyQuaternion(hoja.quaternion); return yawDe(Math.abs(new THREE.Vector3(0, 0, 1).applyQuaternion(hoja.quaternion).y) > .7 ? new THREE.Vector3(x.x, 0, x.z).normalize() : x); };
const poner = (pos, euler) => { hoja.position.set(...pos); hoja.rotation.set(...euler, 'YXZ'); hoja.updateMatrixWorld(true); };
/* deriva: el motor ve el mundo con «cuerpo · verdadera»; cada corrección gira alrededor de la cabeza y traslada (vr.js) */
function corregirHasta(verdadera, cuerpo, n = 10){
  const creida = () => { const m = new THREE.Matrix4().compose(verdadera.pos, verdadera.quat, new THREE.Vector3(1, 1, 1)).premultiply(cuerpo); const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.decompose(p, q, s); return { pos: p, quat: q }; };
  const pasos = [];
  for(let i = 0; i < n; i++){ const c = creida(), o = ancla.observar(foto(verdadera), W, H, K, c); if(!o) { pasos.push('nada'); continue; }
    pasos.push(+o.pos.distanceTo(ancla.st.a0.pos).toFixed(3));
    const k = ancla.corregir(o, c.pos, { quieta: true }); if(!k) continue;
    const giro = new THREE.Matrix4().makeTranslation(c.pos.x, c.pos.y, c.pos.z).multiply(new THREE.Matrix4().makeRotationY(k.dYaw)).multiply(new THREE.Matrix4().makeTranslation(-c.pos.x, -c.pos.y, -c.pos.z));
    cuerpo.premultiply(giro).premultiply(new THREE.Matrix4().makeTranslation(k.dPos.x, k.dPos.y, k.dPos.z)); }
  /* cuánto se movió el mundo: dónde pone el motor un punto fijo (la hoja) y hacia dónde mira el cuerpo */
  const c = creida(), o = ancla.observar(foto(verdadera), W, H, K, c);
  const q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(); cuerpo.decompose(p, q, s);
  /* lo que importa es que el mundo regrese a como lo vio la PRIMERA vez (la lectura trae su propio sesgo de ~2 %, igual siempre) */
  return { pasos, finPos: o ? o.pos.distanceTo(ancla.st.a0.pos) : 9, giroCuerpo: Math.abs(2 * Math.asin(q.y)) * 180 / Math.PI };
}
const cuerpoCon = (x, z, yaw) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
const camara = (pos, euler) => ({ pos: new THREE.Vector3(...pos), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler, 'YXZ')) });
window.prueba = () => {
  const out = {};
  /* A. pared vista de lado (40° de la hoja, cámara girada 6°): posición y giro confiables */
  poner([-.2, .1, -1.3], [0, .8, 0]); ancla.olvidar();   /* hoja girada 46° en la pared */
  const ca = camara([.1, 0, 0], [.1, -.05, 0]), oa = ancla.observar(foto(ca), W, H, K, ca);
  out.A = oa && { pos: oa.pos.distanceTo(hoja.position), yaw: Math.abs(oa.yaw - verdadYaw()) * 180 / Math.PI, fiable: oa.giroFiable, px: oa.error };
  /* B. pared DE FRENTE: la posición sí, el giro NO se toma por bueno */
  poner([-.2, .1, -1.3], [0, .15, 0]); ancla.olvidar();
  const cb = camara([.1, 0, 0], [.1, -.05, 0]), ob = ancla.observar(foto(cb), W, H, K, cb);
  out.B = ob && { pos: ob.pos.distanceTo(hoja.position), fiable: ob.giroFiable };
  /* C. hoja acostada en el escritorio: se mira hacia abajo; su giro en el plano sí es confiable */
  poner([.05, -.55, -.75], [-Math.PI / 2, .4, 0]); ancla.olvidar();
  const cc = camara([0, 0, 0], [-.6, 0, 0]), oc = ancla.observar(foto(cc), W, H, K, cc);
  out.C = oc && { pos: oc.pos.distanceTo(hoja.position), yaw: Math.abs(oc.yaw - verdadYaw()) * 180 / Math.PI, fiable: oc.giroFiable, acostada: oc.acostada };
  /* D. deriva de 25 cm y 6° con la hoja del escritorio: se corrige todo */
  ancla.olvidar(); ancla.corregir(ancla.observar(foto(cc), W, H, K, cc), cc.pos, { quieta: true });
  out.D = corregirHasta(cc, cuerpoCon(.18, .17, .105));
  /* E. deriva SÓLO de lugar (25 cm) con la hoja de frente en la pared: se corrige el lugar */
  poner([-.2, .1, -1.3], [0, .15, 0]); ancla.olvidar(); ancla.corregir(ancla.observar(foto(cb), W, H, K, cb), cb.pos, { quieta: true });
  out.E = corregirHasta(cb, cuerpoCon(.18, .17, 0));
  /* F. con la cabeza girando rápido no se corrige */
  out.F = ancla.corregir(ancla.observar(foto(cb), W, H, K, cb), cb.pos, { quieta: false });
  return out;
};
window.listo = true;
</script></body></html>`;
await ctx.route(/\/prueba-ancla\.html$/, (r) => r.fulfill({ body: HTML, contentType: 'text/html' }));
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/prueba-ancla.html'); await p.waitForFunction(() => window.listo, null, { timeout: 15000 });
const o = await p.evaluate(() => window.prueba()); if(process.env.VER) console.log(JSON.stringify(o));
await p.screenshot({ path: '/tmp/ancla-ultima.png' });
const cm = (x) => (x * 100).toFixed(1) + ' cm', gr = (x) => x?.toFixed(2) + '°';
sí(o.A && o.A.pos < .04 && o.A.yaw < 2 && o.A.fiable, `pared vista de lado (46°, a 1.4 m): la hoja cae a ${o.A && cm(o.A.pos)} y su giro a ${o.A && gr(o.A.yaw)} (reproyección ${o.A?.px.toFixed(2)} px)`);
sí(o.B && o.B.pos < .04 && !o.B.fiable, `pared de frente: el lugar sí (${o.B && cm(o.B.pos)}), el giro no se toma por bueno`);
sí(o.C && o.C.pos < .03 && o.C.yaw < 2 && o.C.acostada, `hoja en el escritorio: ${o.C && cm(o.C.pos)} y ${o.C && gr(o.C.yaw)}`);
sí(o.D.finPos < .02 && o.D.giroCuerpo < .5, `deriva de 25 cm y 6° (escritorio): el mundo regresa a ${cm(o.D.finPos)} de donde se vio la primera vez y ${gr(o.D.giroCuerpo)} · pasos ${o.D.pasos.join(' → ')} m`);
sí(o.D.pasos[1] < o.D.pasos[0] && o.D.pasos[0] - o.D.pasos[1] < o.D.pasos[0] * .8, 'corrige a pasos (no de un brinco)');
sí(o.E.finPos < .01, `deriva de 25 cm (pared de frente): el mundo regresa a ${cm(o.E.finPos)} de donde se vio la primera vez · pasos ${o.E.pasos.join(' → ')} m`);
sí(o.F === null, 'con la cabeza girando rápido no corrige (la imagen y la pose no coinciden en el tiempo)');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
