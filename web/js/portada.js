/* LA PORTADA EN 3D: el logo se arma en vivo (cae la cuña, cae la M encima y destella el techo, se
   voltean las letras y la cámara barre hasta el isométrico), y luego se queda vivo: sigue el dedo o
   el mouse, y al tocarlo se desarma y se vuelve a armar. Es la misma pieza que cierra los anuncios
   (marca/anuncios/logo3d.js), aquí en tiempo real. Con «reducir movimiento» sale ya armado y quieto. */
import * as THREE from 'three';
import { logo3d } from './logo3d.js';
import { HDRLoader } from './vendor/loaders/HDRLoader.js';

const lienzo = document.getElementById('cubo3d');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping;
const s = new THREE.Scene(), pm = new THREE.PMREMGenerator(r);
/* luz de estudio de verdad: un HDRI de Poly Haven (Studio Small 09, de Sergej Majboroda, CC0) */
new HDRLoader().load(new URL('../hdri/studio_small_09_1k.hdr', import.meta.url).href, (h) => { h.mapping = THREE.EquirectangularReflectionMapping; s.environment = pm.fromEquirectangular(h).texture; h.dispose(); });
s.environmentIntensity = .7;
s.add(new THREE.HemisphereLight('#E8DDF5', '#2A0E1E', .6));
const llave = new THREE.DirectionalLight('#FFFFFF', 2); llave.position.set(-4, 6, 6); s.add(llave);
const borde = new THREE.DirectionalLight('#A8264B', 1.6); borde.position.set(5, 2, -4); s.add(borde);
const cam = new THREE.PerspectiveCamera(16, 1, .1, 400);
const L = logo3d(); s.add(L.grupo);
const casa = L.cubo.userData.casa.clone(), lado = L.lado;
/* armado y quieto, el cubo se dibuja de UNA pieza: las cinco piezas juntas dejan ver sus costuras con
   la luz de estudio. Las piezas sólo salen cuando se mueven (al armarse o al tocarlo). */
const entero = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [2, 3, 0, 3, 1, 3].map(i => L.mat[i])); L.cubo.add(entero);

const cl = (v) => Math.min(1, Math.max(0, v)), tr = (t, a, b) => cl((t - a) / (b - a));
const suave = (u) => u * u * (3 - 2 * u), sale = (u) => 1 - Math.pow(1 - u, 3);
const cae = (u, alto) => { if(u <= 0) return alto; if(u < .62){ const v = u / .62; return alto * (1 - v * v); } const v = (u - .62) / .38; return Math.abs(Math.sin(v * Math.PI * 2)) * alto * .05 * (1 - v) * (1 - v); };

let ancho = 1, alto = 1;
function medir(){ const b = lienzo.getBoundingClientRect(); ancho = Math.max(1, b.width); alto = Math.max(1, b.height); r.setSize(ancho, alto, false); cam.aspect = ancho / alto; cam.updateProjectionMatrix(); }
new ResizeObserver(medir).observe(lienzo); medir();

/* el dedo o el mouse inclinan el logo; tocarlo lo desarma */
let px = 0, py = 0, tx = 0, ty = 0, toque = -10;
addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
lienzo.addEventListener('pointerdown', () => { toque = reloj; });
lienzo.style.cursor = 'pointer';

let reloj = 0, antes = performance.now(), visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(lienzo);
const ARMADO = quieto ? 0 : 3.2;                                     // cuánto dura el armado inicial
function cuadro(ahora){
  requestAnimationFrame(cuadro);
  const dt = Math.min(.1, (ahora - antes) / 1000); antes = ahora; if(!visible) return;
  reloj += dt; const u = quieto ? 9 : reloj;
  /* el armado: la cuña, la M encima con destello, las letras que se voltean */
  /* la M llega, se queda flotando de frente para que se lea, y baja sobre la cuña: ahí se vuelve el cubo */
  const flota = sale(tr(u, .6, 1)), baja = tr(u, 1.25, 1.65);
  L.cuna.position.set(0, cae(tr(u, .2, .65), 5 / lado), 0); L.m.position.set(0, baja > 0 ? cae(baja, .5 / lado) : (.5 + (1 - flota) * 2.5) / lado, 0);
  L.m.visible = u >= .6;
  L.mat[0].emissiveIntensity = .35 + 2.4 * Math.max(0, 1 - Math.abs(u - 1.55) / .22);
  L.letras.forEach((h, i) => { const v = tr(u, 1.65 + i * .11, 2.1 + i * .11); h.visible = v > 0; h.position.copy(h.userData.casa); h.position.y += (1 - sale(v)) * -.35;
    h.rotation.set((1 - sale(v)) * -Math.PI / 2 - (v < 1 ? Math.sin(v * Math.PI) * .25 : 0), 0, 0); });
  /* al tocarlo: la cuña sale, la M sube y todo regresa con su golpe */
  const d = reloj - toque, abre = d < 1.1 ? Math.sin(Math.PI * cl(d / 1.1)) ** 2 : 0;
  if(abre > 0){ L.cuna.position.add(new THREE.Vector3(abre * .6, -abre * .1, abre * .6)); L.m.position.y += abre * .45; L.m.rotation.y = abre * .4; L.letras.forEach((h, i) => { h.position.z += abre * (i % 2 ? .25 : -.25); h.rotation.y = abre * (i % 2 ? .3 : -.3); }); }
  else L.m.rotation.y = 0;
  /* la cámara: de cerca y de lado al cubo, barre a isométrico; luego sigue al dedo, poquito */
  px += (tx - px) * .06; py += (ty - py) * .06;
  const w = suave(tr(u, 1.4, ARMADO)), margen = ancho < 600 ? 1.12 : 1.25;
  const dist = (L.medio * 2 * margen) / (2 * Math.tan(cam.fov * Math.PI / 360) * cam.aspect);
  const yaw = Math.PI / 4 + (1 - w) * .22 + px * .18 * w, pitch = Math.asin(1 / Math.sqrt(3)) + (1 - w) * .06 + py * .08 * w;
  const mira = casa.clone().multiplyScalar(1 - w);
  cam.position.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)).multiplyScalar(dist * (.45 + .55 * w)).add(mira); cam.lookAt(mira);
  L.grupo.position.y = Math.sin(reloj * 1.2) * .02 * w;
  const quieta = u > 1.9 && abre === 0; entero.visible = quieta; L.m.visible = L.m.visible && !quieta; L.cuna.visible = !quieta;
  r.render(s, cam);
}
requestAnimationFrame(cuadro);
