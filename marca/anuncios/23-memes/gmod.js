/* EL MOTOR DE LOS MEMES TIPO GARRY'S MOD (Carlos, 5 nov: «personajes con exageración en los gestos, que
   suben y bajan los brazos extendidos con un arma para hablar, que se les sube y baja la cabeza… y que
   tiren al otro a una fosa en llamas»). Todo real y libre: cielo y pasto de Poly Haven, gente y pistolas
   de Kenney, fuego y sonidos de Mixkit (preparar.py). Por cuadro y sin reloj propio, como todo lo de
   marca/anuncios: el mismo t da siempre la misma imagen.

     const M = await mundo($('#gl'));
     const jefe = await actor('male-c', { arma: 'blaster-b' });  M.s.add(jefe.obj);
     jefe.pose(t, { plan: [[0, 'idle']], habla: voz(t, 'Jefe'), arma: true });
     const f = await fosa(M); f.pintar(t);
     rayo.pintar(desde, hasta, fuerza) · explosion.pintar(t - t0) · camara(M, t, TOMAS) */
import * as THREE from 'three';
import { HDRLoader } from '../vendor/loaders/HDRLoader.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { persona, actuar, mueble } from '../gente.js';
export { THREE, mueble };
export const W = 1080, H = 1920;
export const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const tramo = (t, a, b) => cl((t - a) / (b - a));
export const sale = (u) => 1 - Math.pow(1 - u, 3);
export const suave = (u) => u * u * (3 - 2 * u);
export const mezcla = (a, b, u) => a + (b - a) * u;
/* ruido repetible: el mismo (t, semilla) da siempre lo mismo */
export const ruido = (t, s = 0) => Math.sin(t * 7.13 + s * 13.7) * .5 + Math.sin(t * 13.37 + s * 3.1) * .3 + Math.sin(t * 29.1 + s * 7.7) * .2;
const aqui = (r) => new URL(r, import.meta.url).href;

/* ── el mundo: «flatgrass» de verdad, cielo HDRI con nubes, pasto PBR y un sol con sombras ── */
export async function mundo(canvas, { cielo = '../hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr', exposicion = 1 } = {}){
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = exposicion;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const s = new THREE.Scene();
  const hdr = await new HDRLoader().loadAsync(aqui(cielo)); hdr.mapping = THREE.EquirectangularReflectionMapping;
  s.background = hdr; s.environment = hdr; s.backgroundIntensity = 1; s.environmentIntensity = .9;
  const sol = new THREE.DirectionalLight('#FFF4E0', 2.6); sol.position.set(-6, 10, 6); sol.castShadow = true;
  const c = sol.shadow.camera; c.left = c.bottom = -8; c.right = c.top = 8; c.near = .5; c.far = 40; c.updateProjectionMatrix();
  sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -.0005; sol.shadow.normalBias = .02; s.add(sol, sol.target);
  /* el pasto: textura de Poly Haven repetida, con su normal y su rugosidad */
  const tl = new THREE.TextureLoader(), tex = (n, color) => { const t = tl.load(aqui(`../texturas/pasto/aerial_grass_rock_${n}_1k.jpg`)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24); t.anisotropy = 8; if(color) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: tex('diff', true), normalMap: tex('nor_gl'), roughnessMap: tex('rough'), roughness: 1 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; s.add(piso);
  const cam = new THREE.PerspectiveCamera(38, W / H, .05, 300);
  await new Promise(ok => { const mira = () => (piso.material.map.image && piso.material.normalMap.image && piso.material.roughnessMap.image) ? ok() : setTimeout(mira, 50); mira(); });
  return { r, s, cam, sol, piso, pintar(){ r.render(s, cam); } };
}

/* ── un actor: una persona de Kenney con las mañas de Garry's Mod ──
   pose(t, { plan, habla: 0..1, arma: 0..1 (brazos al frente con la pistola), tpose: 0..1, trapo: 0..1
   (muñeco de trapo: todo se zangolotea), gira: radianes de la cabeza en y (el giro de 180° del C) }) */
export async function actor(nombre, { alto = 1.5, arma = null, largoArma = .5, manoArma = [.03, -.03, .46], giroArma = Math.PI } = {}){
  const p = await persona(nombre, { alto });
  let pistola = null;
  if(arma){ const g = await new GLTFLoader().loadAsync(aqui(`../modelos/kenney-blaster/${arma}.glb`)); pistola = g.scene;
    pistola.traverse(o => { if(o.isMesh){ o.castShadow = true; } });
    const b = new THREE.Box3().setFromObject(pistola), tam = b.getSize(new THREE.Vector3()), k = largoArma * alto / 1.5 / Math.max(tam.x, tam.y, tam.z);
    /* se calibra en la pose de disparar: la mano queda frente al hombro, el cañón hacia donde mira el
       personaje (+z), y todo se pasa a las unidades del hueso (que viene escalado por el modelo) */
    p.anima([['holding-both-shoot', 0, 1]]); p.obj.updateMatrixWorld(true);
    const brazo = p.hueso('arm-right'), hombro = brazo.getWorldPosition(new THREE.Vector3());
    const mano = hombro.clone().add(new THREE.Vector3(...manoArma).multiplyScalar(alto / 1.5));
    const qb = brazo.getWorldQuaternion(new THREE.Quaternion()), s = brazo.getWorldScale(new THREE.Vector3()).x;
    brazo.add(pistola); pistola.position.copy(brazo.worldToLocal(mano));
    pistola.quaternion.copy(qb.invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, giroArma, 0)))); pistola.scale.setScalar(k / s); }
  const H0 = {}; for(const n of ['head', 'arm-left', 'arm-right', 'leg-left', 'leg-right', 'torso']){ const h = p.hueso(n); if(h) H0[n] = h; }
  return { ...p, pistola,
    pose(t, { plan = [[0, 'idle']], habla = 0, arma = 0, tpose = 0, trapo = 0, gira = 0, mira = 0 } = {}){
      actuar(p, t, plan);
      /* la pistola al frente: el clip de disparar con las dos manos, encima del que toque */
      if(arma > 0){ p.anima([[plan.at(-1)[1], t, 1 - arma], ['holding-both-shoot', 0, arma]]); }
      const h = H0;
      /* al hablar la cabeza sube y baja con cada sílaba, exagerado, y se ladea un poco */
      if(h.head){ h.head.rotation.x += -habla * .38 + Math.sin(t * 19) * habla * .08; h.head.rotation.z += Math.sin(t * 6.3) * habla * .12; h.head.rotation.y += gira + mira; }
      if(arma > 0 && h['arm-right']){ h['arm-right'].rotation.x += -habla * .35 * arma; if(h['arm-left']) h['arm-left'].rotation.x += -habla * .35 * arma; }
      /* la T: los brazos en cruz, tiesos */
      if(tpose > 0){ if(h['arm-left']) h['arm-left'].rotation.set(0, 0, mezcla(h['arm-left'].rotation.z, 1.5, tpose)); if(h['arm-right']) h['arm-right'].rotation.set(0, 0, mezcla(h['arm-right'].rotation.z, -1.5, tpose)); }
      /* el muñeco de trapo: brazos y piernas que se agitan sin control */
      if(trapo > 0) for(const [n, b] of Object.entries(h)){ const k = n === 'torso' ? .3 : n === 'head' ? .6 : 1.6; b.rotation.x += ruido(t * 1.7, n.length) * k * trapo; b.rotation.z += ruido(t * 1.3, n.length + 4) * k * trapo; }
    } };
}

/* ── una secuencia de cuadros (el fuego de Mixkit) como textura que cambia con t ── */
export class Secuencia {
  constructor(dir, n, fps = 30){ this.dir = dir; this.n = n; this.fps = fps; this.i = -1; this.tex = new THREE.Texture(); this.tex.colorSpace = THREE.SRGBColorSpace; this.cache = new Map(); }
  async en(t, { vuelta = true } = {}){ let i = Math.floor(t * this.fps); i = vuelta ? ((i % this.n) + this.n) % this.n : cl(i, 0, this.n - 1); if(i === this.i) return; this.i = i;
    let im = this.cache.get(i); if(!im){ im = new Image(); im.src = this.dir + String(i + 1).padStart(5, '0') + '.jpg'; await im.decode(); if(this.cache.size > 200) this.cache.clear(); this.cache.set(i, im); }
    this.tex.image = im; this.tex.needsUpdate = true; }
}
/* lo que suma luz (fuego, chispas): el fondo del video casi nunca es negro puro (las brasas traen un rojo de 50),
   así que se le resta un umbral y se apagan las orillas en círculo; si no, se ve el cuadro del video */
const aditivo = (tex, color = '#ffffff', umbral = .08) => { const m = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => { s.uniforms.umbral = { value: umbral };
    s.fragmentShader = 'uniform float umbral;\n' + s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb = max(diffuseColor.rgb - umbral, 0.) / (1. - umbral);
      diffuseColor.rgb *= 1. - smoothstep(.36, .5, length(vMapUv - .5));`); };
  m.customProgramCacheKey = () => 'aditivo' + umbral; return m; };
export async function fx(){ return await (await fetch(aqui('./fx/indice.json'))).json(); }

/* ── la fosa en llamas: un hoyo negro con borde de piedra, llamas de verdad y luz naranja que tiembla ── */
export async function fosa(M, { x = 0, z = 0, radio = 1.3 } = {}){
  const I = await fx(), g = new THREE.Group(); g.position.set(x, 0, z); M.s.add(g);
  const hoyo = new THREE.Mesh(new THREE.CircleGeometry(radio, 48), new THREE.MeshBasicMaterial({ color: '#050302' })); hoyo.rotation.x = -Math.PI / 2; hoyo.position.y = .012; g.add(hoyo);
  const brasa = new THREE.Mesh(new THREE.CircleGeometry(radio * .92, 48), new THREE.MeshBasicMaterial({ color: '#FF5A12', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); brasa.rotation.x = -Math.PI / 2; brasa.position.y = .02; g.add(brasa);
  const borde = new THREE.Mesh(new THREE.TorusGeometry(radio, .16, 8, 32), new THREE.MeshStandardMaterial({ color: '#3d3a36', roughness: .95 })); borde.rotation.x = -Math.PI / 2; borde.position.y = .04; borde.castShadow = borde.receiveShadow = true; g.add(borde);
  const sec = [new Secuencia(aqui('./fx/llamas/'), I.llamas), new Secuencia(aqui('./fx/fogata/'), I.fogata), new Secuencia(aqui('./fx/brasas/'), I.brasas)];
  const llamas = [];
  for(let k = 0; k < 7; k++){ const s = sec[k % 2], a = k / 7 * Math.PI * 2, rr = k === 0 ? 0 : radio * .55, tam = k === 0 ? radio * 2.6 : radio * 1.6;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), aditivo(s.tex, k ? '#FFC9A0' : '#ffffff')); m.position.set(Math.cos(a) * rr, tam * .42, Math.sin(a) * rr); m.userData = { s, d: k * .37 }; g.add(m); llamas.push(m); }
  const chispas = new THREE.Mesh(new THREE.PlaneGeometry(radio * 3, radio * 3), aditivo(sec[2].tex, '#ffffff', .32)); chispas.position.y = radio * 1.8; g.add(chispas);
  const luz = new THREE.PointLight('#FF7A2A', 30, radio * 9, 1.6); luz.position.y = .8; g.add(luz);
  return { g, luz, radio, async pintar(t, cam){
    await Promise.all(sec.map((s, i) => s.en(t + i * .5)));
    for(const m of [...llamas, chispas]){ m.quaternion.copy(cam.quaternion); }
    luz.intensity = 26 + ruido(t * 2.2, 3) * 10; brasa.material.opacity = .45 + ruido(t * 3, 1) * .15;
  } };
}

/* ── la explosión: la bola de fuego de Mixkit y un fogonazo de luz ── */
export async function explosion(M, { tam = 5 } = {}){
  const I = await fx(), s = new Secuencia(aqui('./fx/bola/'), I.bola), m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), aditivo(s.tex)); m.visible = false; M.s.add(m);
  const luz = new THREE.PointLight('#FFB050', 0, 30, 1.2); M.s.add(luz);
  return { m, async pintar(u, donde, cam){ const ve = u >= 0 && u < I.bola / 30; m.visible = ve; luz.intensity = ve ? Math.max(0, 260 * (1 - u / 1.2)) : 0;
    if(!ve) return; await s.en(u, { vuelta: false }); m.position.copy(donde); m.position.y += tam * .35; luz.position.copy(donde).add(new THREE.Vector3(0, 1.5, 0)); m.quaternion.copy(cam.quaternion); m.scale.setScalar(.6 + sale(cl(u / .5)) * .7); } };
}

/* ── el rayo de la pistola (la que levanta cosas): un tubo azul que se dobla hacia lo que carga ── */
export function rayo(M){
  const mat = new THREE.MeshBasicMaterial({ color: '#5CC8FF', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const mat2 = new THREE.MeshBasicMaterial({ color: '#C9F0FF', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const g = new THREE.Group(); let a = null, b = null; M.s.add(g);
  const luz = new THREE.PointLight('#5CC8FF', 0, 6, 1.5); g.add(luz);
  return { pintar(desde, hasta, f = 1, t = 0){
    if(a){ g.remove(a); a.geometry.dispose(); } if(b){ g.remove(b); b.geometry.dispose(); }
    if(f <= 0){ luz.intensity = 0; return; }
    const medio = desde.clone().lerp(hasta, .5); medio.y += .4 + Math.sin(t * 9) * .08;
    const curva = new THREE.QuadraticBezierCurve3(desde, medio, hasta);
    a = new THREE.Mesh(new THREE.TubeGeometry(curva, 32, .045 * f + Math.sin(t * 40) * .008, 8), mat); b = new THREE.Mesh(new THREE.TubeGeometry(curva, 32, .016 * f, 6), mat2);
    g.add(a, b); luz.position.copy(hasta); luz.intensity = 6 * f;
  } };
}

/* ── la cámara: tomas con corte seco, temblor de mano y «zoom de golpe» ──
   tomas: [[desde, { pos: [x,y,z], mira: [x,y,z], fov, tiembla, zoom: [t0, cuánto] }], …] */
export function camara(M, t, tomas, { sacudida = 0 } = {}){
  let k = 0; for(let i = 0; i < tomas.length; i++) if(t >= tomas[i][0]) k = i;
  const [t0, o] = tomas[k], sig = tomas[k + 1], dur = sig ? sig[0] - t0 : 4, u = tramo(t, t0, t0 + dur);
  const p = new THREE.Vector3(...o.pos), m = new THREE.Vector3(...o.mira);
  if(o.hasta){ p.lerp(new THREE.Vector3(...o.hasta), suave(u)); }
  const tb = (o.tiembla ?? .02) + sacudida;
  p.x += ruido(t * .9, 1) * tb; p.y += ruido(t * .8, 2) * tb; m.x += ruido(t * .7, 3) * tb * .6;
  M.cam.position.copy(p); M.cam.lookAt(m);
  let fov = o.fov ?? 38; if(o.zoom){ const [zt, zk] = o.zoom; fov /= 1 + (zk - 1) * sale(tramo(t, zt, zt + .12)); }
  M.cam.fov = fov; M.cam.updateProjectionMatrix();
}

/* ── la voz: cuánto suena cada quien en el segundo t (la envolvente de envolvente.py) ── */
export async function voces(G){
  const env = await (await fetch('voz/env.json')).json();
  return (t, quien) => { let v = 0; for(const l of G.lineas){ if(quien && l.voz !== quien) continue; if(t < l.t0 || t > l.t1) continue; const e = env[l.id]; if(!e) continue; v = Math.max(v, e[Math.min(e.length - 1, Math.floor((t - l.t0) * 30))] || 0); } return v; };
}
