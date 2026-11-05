/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LA ESCENA 3D QUE PARECE 2D
   ───────────────────────────────────────────────────────────────────────────
   Carlos: «cambiamos a formato 3D simulando 2D para agregar modelos 3D, por
   ejemplo los de los puercos que corren». Una cámara con lente muy cerrado y
   lejos: de frente se ve plano, como un juego de cartas de siempre, pero las
   cartas tienen grosor, se voltean de verdad, chocan y los cerditos corren
   con su sombra.

   Un solo lienzo y un solo renderizador para todo el juego. El iPhone deja
   pocos contextos WebGL vivos y tira el más viejo sin avisar: crear uno por
   pantalla es cómo una pantalla se queda en blanco a la tercera visita.
   ═══════════════════════════════════════════════════════════════════════════ */
import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { clone as clonarEsqueleto } from './vendor/utils/SkeletonUtils.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
export { THREE };

export const CARTA_W = 1, CARTA_H = 582 / 420;     /* la proporción del arte de la autora */

/* ── EL MOTOR DE TIEMPO: un solo bucle, y todo lo que se mueve se cuelga de él ── */
const tareas = new Set();
export const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const sale = (u) => 1 - Math.pow(1 - u, 3);
export const entra = (u) => u * u * u;
export const suave = (u) => u * u * (3 - 2 * u);
export const resorte = (u) => u >= 1 ? 1 : 1 - Math.cos(u * Math.PI * 2.4) * Math.exp(-u * 5.5);
export const mezcla = (a, b, u) => a + (b - a) * u;

/* animar({ dur, ease, cada(u), fin }) → promesa. `cada` recibe 0..1 ya suavizado. */
export function animar({ dur = .4, ease = sale, cada, retraso = 0 }){
  return new Promise((ok) => {
    const t0 = performance.now() + retraso * 1000;
    const t = { paso(ahora){ const u = cl((ahora - t0) / (dur * 1000)); if(ahora < t0) return; cada && cada(ease(u), u); if(u >= 1){ tareas.delete(t); ok(); } } };
    tareas.add(t);
  });
}
export const esperar = (s) => new Promise(ok => setTimeout(ok, s * 1000));
/* Lo que se mueve siempre (los cerditos, el brillo del sobre): `cadaCuadro(fn)` → quitar() */
const siempre = new Set();
export const cadaCuadro = (fn) => { siempre.add(fn); return () => siempre.delete(fn); };

/* ── EL RENDERIZADOR ─────────────────────────────────────────────────────── */
export const E = {};
export function arrancar(canvas){
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const s = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  s.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  /* El lente: 18° desde lejos. Se ve casi plano (2D) pero con profundidad. */
  const cam = new THREE.PerspectiveCamera(18, 1, .1, 200);
  cam.position.set(0, 0, 22);
  const sol = new THREE.DirectionalLight('#FFF3E8', 2.2); sol.position.set(-3, 6, 9); sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024); const sc = sol.shadow.camera; sc.left = sc.bottom = -8; sc.right = sc.top = 8; sc.near = 1; sc.far = 40;
  sol.shadow.bias = -.0008; s.add(sol, sol.target);
  s.add(new THREE.HemisphereLight('#FFE6F0', '#2A1020', .9));
  Object.assign(E, { r, s, cam, sol, canvas, ancho: 1, alto: 1 });
  const medir = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if(w === E.ancho && h === E.alto) return;
    E.ancho = w; E.alto = h;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    for(const f of alMedir) f();
  };
  new ResizeObserver(medir).observe(canvas); medir();
  /* el paso entre cuadros se mide a mano: THREE.Clock ya viene marcado como
     obsoleto en esta versión de three.js */
  let antes = performance.now();
  r.setAnimationLoop(() => {
    const ahora = performance.now(), dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    for(const t of [...tareas]) t.paso(ahora);
    for(const f of [...siempre]) f(dt, ahora / 1000);
    r.render(s, cam);
  });
  return E;
}
const alMedir = new Set();
export const alCambiarTamano = (fn) => { alMedir.add(fn); return () => alMedir.delete(fn); };

/* Cuánto mundo se ve a la distancia del plano z = 0: para acomodar cosas en
   «la orilla izquierda» sin adivinar números. */
export function vista(z = 0){
  const d = E.cam.position.z - z, alto = 2 * d * Math.tan(THREE.MathUtils.degToRad(E.cam.fov / 2));
  return { alto, ancho: alto * E.cam.aspect };
}
/* De pixeles de la pantalla a mundo (z = 0) y al revés. */
export function aMundo(x, y, z = 0){
  const v = vista(z);
  return new THREE.Vector3((x / E.ancho - .5) * v.ancho, (.5 - y / E.alto) * v.alto, z);
}
export function aPantalla(p){
  const v = p.clone().project(E.cam);
  return { x: (v.x + 1) / 2 * E.ancho, y: (1 - v.y) / 2 * E.alto };
}

/* ── TEXTURAS, CON CACHÉ ─────────────────────────────────────────────────── */
const cache = new Map(), carga = new THREE.TextureLoader();
export function textura(url){
  if(cache.has(url)) return cache.get(url);
  const t = carga.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  cache.set(url, t); return t;
}
export async function texturaLista(url){
  const t = textura(url);
  if(t.image && t.image.complete !== false && (t.image.width || t.image.naturalWidth)) return t;
  await new Promise((ok) => { const mira = () => (t.image && (t.image.width || t.image.naturalWidth)) ? ok() : setTimeout(mira, 30); mira(); });
  return t;
}
export function texturaDeLienzo(lienzo){
  const t = new THREE.CanvasTexture(lienzo); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/* ── LA CARTA ────────────────────────────────────────────────────────────────
   Una placa con esquinas redondas, cara y dorso, y un canto de verdad: al
   voltearse se nota que es un cartón y no una imagen girando. */
function placaRedonda(w, h, r, seg = 6){
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, seg), p = g.attributes.position, uv = g.attributes.uv;
  for(let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x) / w, (p.getY(i) - y) / h);
  return g;
}
const GEO = { cara: placaRedonda(CARTA_W, CARTA_H, .07), canto: null };
{
  const s = new THREE.Shape(), w = CARTA_W, h = CARTA_H, r = .07, x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  GEO.canto = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: false, curveSegments: 6 });
  GEO.canto.translate(0, 0, -.01);
}
const matCanto = new THREE.MeshStandardMaterial({ color: '#F4E9EE', roughness: .7 });

export function carta(frente, dorso){
  const g = new THREE.Group();
  const mf = new THREE.MeshStandardMaterial({ map: frente || null, roughness: .55, metalness: 0, color: frente ? '#ffffff' : '#ddd' });
  const md = new THREE.MeshStandardMaterial({ map: dorso || null, roughness: .6, color: dorso ? '#ffffff' : '#E84A8A' });
  const cara = new THREE.Mesh(GEO.cara, mf); cara.position.z = .0105; cara.castShadow = true;
  const atras = new THREE.Mesh(GEO.cara, md); atras.rotation.y = Math.PI; atras.position.z = -.0105;
  const canto = new THREE.Mesh(GEO.canto, matCanto); canto.castShadow = true;
  g.add(canto, cara, atras);
  g.userData = { cara, atras, mf, md };
  return g;
}
export function ponerFrente(c, tex){ c.userData.mf.map = tex; c.userData.mf.color.set('#fff'); c.userData.mf.needsUpdate = true; }
export function ponerDorso(c, tex){ c.userData.md.map = tex; c.userData.md.color.set('#fff'); c.userData.md.needsUpdate = true; }

/* ── EL BRILLO DE LA CARTA BUENA: un halo detrás que respira ── */
export function halo(color = '#FFD54A', tam = 2.2){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam * 1.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  return m;
}

/* ── CHISPAS: un estallido de puntitos que vuelan y caen ─────────────────── */
export function chispas(donde, { color = '#FFD54A', cuantas = 60, fuerza = 3, vida = 1.1, tam = .09 } = {}){
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(cuantas * 3), vel = [];
  for(let i = 0; i < cuantas; i++){
    pos.set([donde.x, donde.y, donde.z + .2], i * 3);
    const a = Math.random() * Math.PI * 2, v = fuerza * (.4 + Math.random() * .8);
    vel.push(new THREE.Vector3(Math.cos(a) * v, Math.sin(a) * v + 1, (Math.random() - .3) * v));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: tam, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  E.s.add(m);
  let t = 0;
  const quitar = cadaCuadro((dt) => {
    t += dt; const p = geo.attributes.position;
    for(let i = 0; i < cuantas; i++){ vel[i].y -= 6 * dt; p.setXYZ(i, p.getX(i) + vel[i].x * dt, p.getY(i) + vel[i].y * dt, p.getZ(i) + vel[i].z * dt); }
    p.needsUpdate = true; m.material.opacity = cl(1 - t / vida);
    if(t >= vida){ quitar(); E.s.remove(m); geo.dispose(); m.material.dispose(); }
  });
}

/* ── LOS CERDITOS: Kenney «Cube Pets», con sus animaciones de verdad ──────── */
const gltf = new GLTFLoader(), modelos = new Map();
export async function mascota(url){
  if(!modelos.has(url)) modelos.set(url, gltf.loadAsync(url));
  const g = await modelos.get(url);
  const obj = clonarEsqueleto(g.scene);
  obj.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; if(o.material.map) o.material.map.anisotropy = 8; } });
  const mixer = new THREE.AnimationMixer(obj), clips = Object.fromEntries(g.animations.map(a => [a.name, a]));
  let actual = null;
  const quitar = cadaCuadro((dt) => mixer.update(dt));
  return {
    obj, clips,
    hacer(nombre, { fundido = .2, vel = 1 } = {}){
      const c = clips[nombre]; if(!c) return;
      const a = mixer.clipAction(c); a.timeScale = vel;
      if(actual === a) return;
      a.reset().fadeIn(fundido).play(); if(actual) actual.fadeOut(fundido);
      actual = a;
    },
    soltar(){ quitar(); obj.removeFromParent(); },
  };
}

/* ── EL TAPETE: la mesa del fondo, con la tela que traigas puesta ────────── */
export function tapete(url){
  const t = textura(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 6);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.MeshStandardMaterial({ map: t, roughness: .9, color: '#bbb' }));
  m.position.z = -2; m.receiveShadow = true;
  return m;
}
export function cambiarTapete(m, url){
  const t = textura(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 6);
  m.material.map = t; m.material.needsUpdate = true;
}

/* ── ¿QUÉ TOCÓ EL DEDO? ───────────────────────────────────────────────────── */
const rayo = new THREE.Raycaster();
export function tocado(x, y, objetos){
  rayo.setFromCamera(new THREE.Vector2(x / E.ancho * 2 - 1, -(y / E.alto) * 2 + 1), E.cam);
  return rayo.intersectObjects(objetos, true)[0] || null;
}
