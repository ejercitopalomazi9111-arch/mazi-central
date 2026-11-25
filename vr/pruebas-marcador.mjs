/* MAZI XR · ¿la pose del marcador del control sale bien? Se dibuja el marcador ArUco (id 0, 4 cm) con three.js en
   poses CONOCIDAS frente a una cámara de focal conocida, se detecta con js-aruco2 y se calcula la pose con
   control.js (POSIT); luego se compara contra la verdad: posición (cm), y hacia dónde quedan sus ejes (grados).
   También el rayo: apuntando a una caja le pega; apuntando al lado, no.
     node vr/pruebas-marcador.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 700, height: 500 } });
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{ "imports": { "three": "/vr/espacial/vendor/three.js" } }</script>
<script src="/vr/espacial/vendor/aruco/cv.js"></script><script src="/vr/espacial/vendor/aruco/aruco.js"></script>
<script src="/vr/espacial/vendor/aruco/svd.js"></script><script src="/vr/espacial/vendor/aruco/posit2.js"></script>
</head><body style="margin:0;background:#888"><canvas id="c" width="640" height="480"></canvas>
<script type="module">
import * as THREE from "/vr/vendor/three.module.min.js"; import * as RECORTADO from "three"; import { montarControl } from "/vr/espacial/control.js";
/* three completo sólo para DIBUJAR el marcador; el control usa el three recortado de la página real */
const W = 640, H = 480, FOV = 60, fx = (H / 2) / Math.tan(FOV * Math.PI / 360);
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), preserveDrawingBuffer: true });
r.setClearColor(0xbbbbbb, 1);
const escena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(FOV, W / H, 0.01, 10);
/* el marcador: el SVG del propio diccionario, en un cuadro de 4 cm (con su margen blanco alrededor) */
const svg = new AR.Dictionary('ARUCO_MIP_36h12').generateSVG(0);
const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(svg); await img.decode();
const lz = document.createElement('canvas'); lz.width = lz.height = 400; const g = lz.getContext('2d');
g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 400); g.drawImage(img, 50, 50, 300, 300);
const tex = new THREE.CanvasTexture(lz); tex.magFilter = THREE.NearestFilter ?? tex.magFilter;
const L = 0.04 * 400 / 240;   /* el SVG trae margen blanco propio: el cuadro NEGRO es el 80 % de los 300 px (240 px) y ése mide 4 cm */
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute([-L/2,-L/2,0, L/2,-L/2,0, L/2,L/2,0, -L/2,-L/2,0, L/2,L/2,0, -L/2,L/2,0], 3));
geo.setAttribute('uv', new THREE.Float32BufferAttribute([0,0, 1,0, 1,1, 0,0, 1,1, 0,1], 2));
const marca = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })); escena.add(marca);
const ctl = montarControl({ THREE: RECORTADO, escena: new RECORTADO.Scene(), video: {}, poseCamara: () => null, intrinsecos: () => null, objetivos: () => [] });
const det = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12' });
const lee = document.createElement('canvas'); lee.width = W; lee.height = H; const lc = lee.getContext('2d');
window.medir = (pos, giro) => {
  marca.position.set(...pos); marca.rotation.set(...giro); marca.updateMatrixWorld(true);
  r.render(escena, cam); lc.drawImage(r.domElement, 0, 0);
  const datos = lc.getImageData(0, 0, W, H).data, ms = det.detectImage(W, H, datos);
  if(!ms.length) return { visto: false };
  const { m: m0 } = ctl.poseMarcador(ctl.refinar(ms[0].corners, datos, W, H), fx, W / 2, H / 2); const m = new THREE.Matrix4().fromArray(m0.elements);
  /* verdad en el marco OpenCV (x derecha, y ABAJO, z adelante) = three (x, y arriba, −z adelante) con y, z volteados */
  const cv = (v) => new THREE.Vector3(v.x, -v.y, -v.z);
  const tVerdad = cv(marca.position), tCalc = new THREE.Vector3().setFromMatrixPosition(m);
  const ejes = (i) => { const e = new THREE.Vector3().setFromMatrixColumn(marca.matrixWorld, i).normalize(); return cv(e); };
  const calc = (i) => new THREE.Vector3().setFromMatrixColumn(m, i).normalize();
  const gr = (a, b) => a.angleTo(b) * 180 / Math.PI;
  return { visto: true, id: ms[0].id, errCm: tVerdad.distanceTo(tCalc) * 100, ejeX: gr(ejes(0), calc(0)), ejeY: gr(ejes(1), calc(1)), ejeZ: gr(ejes(2), calc(2)) };
};
/* el rayo contra una caja: de frente le pega, de lado no */
const R = RECORTADO, cajaR = new R.Mesh(new R.BoxGeometry(0.2, 0.2, 0.2), new R.MeshBasicMaterial()); cajaR.position.set(0, 1, 0); cajaR.updateMatrixWorld(true);
window.rayo = () => [ctl.pegaA(new R.Vector3(0, 0, 0), new R.Vector3(0, 1, 0), [cajaR]), ctl.pegaA(new R.Vector3(0, 0, 0), new R.Vector3(1, 0, 0), [cajaR])].map((x) => !!x);
window.listo = true;
</script></body></html>`;
await ctx.route(/\/prueba-marcador\.html$/, (r) => r.fulfill({ body: HTML, contentType: 'text/html' }));
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => { errores.push(e.message); console.log('ERR', e.message); }); p.on('console', (m) => { if(m.type() === 'error') console.log('CONSOLA', m.text()); });
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/prueba-marcador.html'); await p.waitForFunction(() => window.listo, null, { timeout: 15000 });
const POSES = [
  ['de frente a 30 cm', [0, 0, -0.30], [0, 0, 0]],
  ['a 50 cm, a un lado y abajo', [0.06, -0.05, -0.50], [0, 0, 0]],
  ['acostado 45° (como en el control)', [0, -0.03, -0.35], [-Math.PI / 4, 0, 0]],
  ['acostado 60° y girado 30°', [0.03, -0.04, -0.40], [-Math.PI / 3, 0, Math.PI / 6]],
  ['ladeado 35° de costado', [-0.04, 0, -0.35], [0, Math.PI * 35 / 180, 0]],
  ['lejos: 70 cm (brazo estirado)', [0.05, -0.08, -0.70], [-Math.PI / 4, 0, 0]],
];
for(const [nombre, pos, giro] of POSES){
  const m = await p.evaluate(([a, c]) => window.medir(a, c), [pos, giro]);
  /* el error de POSICIÓN crece con la distancia (el marcador ocupa menos pixeles): se pide menos de 5 % de la
     distancia; la ORIENTACIÓN, que es lo que da el rayo, menos de 3° en cada eje */
  const distCm = Math.hypot(...pos) * 100;
  /* LIMITACIÓN CONOCIDA de un marcador plano: visto DE FRENTE, la perspectiva casi no delata la inclinación y una
     décima de pixel la mueve varios grados. Ahí se toleran 8° en los ejes x y z; el eje y (el RAYO) siempre < 3° */
  const deFrente = giro.every((g) => Math.abs(g) < 0.05), tope = deFrente ? 8 : 3;
  sí(m.visto && m.errCm < 0.05 * distCm && m.ejeY < 3 && m.ejeX < tope && m.ejeZ < tope,
    `${nombre}${deFrente ? ' [de frente: inclinación débil]' : ''}: ${m.visto ? `posición a ${m.errCm.toFixed(2)} cm (${(100 * m.errCm / distCm).toFixed(1)} % de ${distCm.toFixed(0)} cm), ejes a ${m.ejeX.toFixed(1)}° ${m.ejeY.toFixed(1)}° ${m.ejeZ.toFixed(1)}°` : 'no se vio'}`);
}
const [pega, noPega] = await p.evaluate(() => window.rayo());
sí(pega && !noPega, 'el rayo le pega a la caja que tiene enfrente y no a la de al lado');
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
