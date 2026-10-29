/* EL ESCENARIO 3D: el fondo (fotos 360° de Poly Haven teñidas según la sección), las Vocaloids
   (modelos de fans de Sketchfab, vía Objaverse) que bailan al golpe, el carril en 3D con sus notas,
   la cámara que nunca se queda quieta y los destellos (partículas de Kenney). Nada se dibuja aquí:
   todo es un modelo, una foto o un sprite importado, y lo que se hace con código es MOVERLO. */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { DISPOSICIONES } from './cartas.js';

export const ESCENARIOS = [
  { id: 'shanghai_bund', nombre: 'Ciudad SONOLUZ', tinte: '#7A4BFF' },
  { id: 'neon_photostudio', nombre: 'Estudio neón', tinte: '#FF3D8B' },
  { id: 'metro_noord', nombre: 'Andén de los ecos', tinte: '#38E1FF' },
  { id: 'mirrored_hall', nombre: 'Salón del Coro Nulo', tinte: '#C9A2FF' },
  { id: 'rooftop_night', nombre: 'Azotea', tinte: '#FF6A3D' },
  { id: 'kloppenheim_07_puresky', nombre: 'Cielo roto', tinte: '#B0164B' },
  { id: 'industrial_sunset_02_puresky', nombre: 'Horizonte', tinte: '#2EFFC7' }
];
export const PERSONAJES = [
  { id: 'gumi', nombre: 'GUMI', faccion: 'Resonantes', rota: Math.PI, alto: 1.75, color: '#7CFF6B', autor: 'Saionji' },
  { id: 'miku', nombre: 'Hatsune Miku', faccion: 'Resonantes', alto: 1.75, color: '#39E5D8', autor: 'A-Z inc.' },
  { id: 'luka', nombre: 'Okurine Luka', faccion: 'Desafinados', alto: 1.8, color: '#FF7AB6', autor: 'kirirato' },
  { id: 'una', nombre: 'Otomachi Una', faccion: 'Ecos', alto: 1.6, color: '#8E9BFF', autor: 'theuniversalmodeler' },
  { id: 'miku-hagane', nombre: 'Hagane Miku', faccion: 'Desafinados', alto: 1.75, color: '#B8B8C8', autor: 'kirirato' },
  { id: 'miku-akuma', nombre: 'Miku Excomulgada', faccion: 'Coro Nulo', alto: 1.85, color: '#FF2D55', autor: 'Tiago.Carneiro', jefe: true }
];
export const COLORES_RIEL = ['#FF3D8B', '#B44BFF', '#38E1FF', '#FFF07A', '#38E1FF', '#B44BFF', '#FF3D8B'];

const cargador = new GLTFLoader(), cacheT = {}, cacheM = {};
const tex = (url, srgb = true) => cacheT[url] ||= new Promise(r => new THREE.TextureLoader().load(url, t => { if(srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; r(t); }, undefined, () => r(null)));
export const textura = tex;

/* LOS BRAZOS ABAJO: casi todos los modelos de fans vienen en pose de T y sin esqueleto. En vez de
   dejarlos tiesos, se mide dónde están sus hombros (la altura donde el modelo es más ancho) y el
   vértice de cada brazo se gira alrededor del hombro en la tarjeta de video; así bajan los brazos,
   se balancean y la cabeza sigue el golpe. Es MOVER el modelo, no redibujarlo. */
function brazosAbajo(m){
  const mallas = []; m.traverse(o => { if(o.isMesh) mallas.push(o); }); if(!mallas.length || mallas.some(o => o.isSkinnedMesh)) return null;
  /* todo a un mismo sistema: la geometría se hornea en el espacio del modelo */
  const plano = new THREE.Group(); const inv = new THREE.Matrix4().copy(m.matrixWorld).invert();
  /* los modelos vienen cuantizados (enteros de 16 bits): antes de moverlos se pasan a flotantes, o se aplastan */
  const flotar = (g) => { for(const k of ['position', 'normal']){ const at = g.attributes[k]; if(!at || (at.array instanceof Float32Array && !at.isInterleavedBufferAttribute && !at.normalized)) continue;
    const f = new Float32Array(at.count * 3); for(let i = 0; i < at.count; i++){ f[i * 3] = at.getX(i); f[i * 3 + 1] = at.getY(i); f[i * 3 + 2] = at.getZ(i); } g.setAttribute(k, new THREE.BufferAttribute(f, 3)); } return g; };
  for(const o of mallas){ const g = flotar(o.geometry.clone()); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); const n = new THREE.Mesh(g, o.material); n.frustumCulled = false; plano.add(n); o.visible = false; }
  m.add(plano); plano.matrixAutoUpdate = false;
  const pts = []; plano.children.forEach(o => { const p = o.geometry.attributes.position; for(let i = 0; i < p.count; i += 3) pts.push([p.getX(i), p.getY(i), p.getZ(i)]); });
  let y0 = 1e9, y1 = -1e9, cx = 0; for(const q of pts){ y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); cx += q[0]; } cx /= pts.length; const H = y1 - y0;
  const bins = Array(50).fill(0); for(const q of pts){ const i = Math.min(49, Math.floor((q[1] - y0) / H * 50)); bins[i] = Math.max(bins[i], Math.abs(q[0] - cx)); }
  let mx = 0, mi = 0; for(let i = 25; i < 48; i++) if(bins[i] > mx){ mx = bins[i]; mi = i; }
  const torso = bins[Math.max(0, mi - 6)]; if(mx < torso * 1.7) return null;          // no está en T: se deja como viene
  let a = mi, z = mi; while(a > 0 && bins[a - 1] > mx * .55) a--; while(z < 49 && bins[z + 1] > mx * .55) z++;
  const yS = y0 + (a + z + 1) / 2 / 50 * H, banda = Math.max(H * .035, (z - a + 1) / 50 * H * .75), piv = Math.max(torso * .95, H * .07);
  const u = { uC: { value: cx }, uYS: { value: yS }, uPiv: { value: piv }, uBanda: { value: banda }, uRampa: { value: H * .05 }, uYN: { value: yS + H * .045 },
    uAngI: { value: 1.15 }, uAngD: { value: 1.15 }, uVaiven: { value: 0 }, uCab: { value: 0 }, uCabY: { value: 0 } };
  const vistos = new Set();
  plano.children.forEach(o => { const ms = Array.isArray(o.material) ? o.material : [o.material]; o.material = ms.map(mt => { const n = mt.clone(); n.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    const cab = `uniform float uC, uYS, uPiv, uBanda, uRampa, uYN, uAngI, uAngD, uVaiven, uCab, uCabY;
      vec2 rot2(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
      float pesoBrazo(vec3 p){ return smoothstep(uPiv, uPiv + uRampa, abs(p.x - uC)) * (1.0 - smoothstep(uBanda, uBanda * 1.7, abs(p.y - uYS))); }
      vec3 posar(vec3 p, out float wB, out float wH, out float ang){ float lado = sign(p.x - uC); wB = pesoBrazo(p); ang = (lado > 0.0 ? -uAngD : uAngI) * wB;
        vec2 pv = vec2(uC + lado * uPiv, uYS); p.xy = pv + rot2(p.xy - pv, ang); p.yz = vec2(uYS, 0.0) + rot2(p.yz - vec2(uYS, 0.0), uVaiven * wB * lado);
        wH = smoothstep(uYN, uYN + uRampa, p.y) * (1.0 - wB); vec2 hv = vec2(uC, uYN); p.xy = hv + rot2(p.xy - hv, uCab * wH); p.xz = vec2(uC, 0.0) + rot2(p.xz - vec2(uC, 0.0), uCabY * wH); return p; }\n`;
    sh.vertexShader = cab + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float wB_, wH_, ang_; transformed = posar(transformed, wB_, wH_, ang_);`).replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      { float l_ = sign(position.x - uC), w_ = pesoBrazo(position), a_ = (l_ > 0.0 ? -uAngD : uAngI) * w_; objectNormal.xy = rot2(objectNormal.xy, a_); }`); }; return n; });
    if(o.material.length === 1) o.material = o.material[0]; });
  return { u, plano };
}

export async function crearEscena(lienzo){
  const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(58, 1, .05, 400);
  s.fog = new THREE.Fog('#080410', 30, 90);

  /* ── el fondo: una esfera por dentro con la foto 360°, teñida y pulsando con la música ── */
  const uni = { mapa: { value: null }, mapa2: { value: null }, mezcla: { value: 0 }, tinte: { value: new THREE.Color('#7A4BFF') }, oscuro: { value: .55 }, pulso: { value: 0 }, giro: { value: 0 }, glitch: { value: 0 }, sat: { value: 1 } };
  const fondo = new THREE.Mesh(new THREE.SphereGeometry(200, 64, 32), new THREE.ShaderMaterial({ uniforms: uni, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D mapa, mapa2; uniform float mezcla, oscuro, pulso, giro, glitch, sat; uniform vec3 tinte; varying vec2 vUv;
      vec3 de(sampler2D m, vec2 uv){ return texture2D(m, uv).rgb; }
      void main(){ vec2 uv = vec2(fract(vUv.x + giro), vUv.y);
        if(glitch > 0.0){ float b = floor(uv.y * 40.0); uv.x += (fract(sin(b * 91.7 + glitch * 13.0) * 4375.5) - .5) * .08 * glitch; }
        vec3 c = mix(de(mapa, uv), de(mapa2, uv), mezcla);
        c = pow(c, vec3(2.2));
        float l = dot(c, vec3(.3, .59, .11)); c = mix(vec3(l), c, sat);
        c = mix(c, c * tinte * 2.2, .55) * (1.0 - oscuro) + tinte * pulso * .35;
        gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0); }` }));
  s.add(fondo);
  const fondos = await Promise.all(ESCENARIOS.map(e => tex(`escenarios/${e.id}.jpg`)));
  uni.mapa.value = uni.mapa2.value = fondos[0];

  /* ── la luz ── */
  const hemi = new THREE.HemisphereLight('#E9DCFF', '#22102E', 1.1); s.add(hemi);
  const llave = new THREE.DirectionalLight('#FFFFFF', 2.2); llave.position.set(-3, 6, 6); s.add(llave);
  const borde1 = new THREE.PointLight('#FF3D8B', 30, 18, 1.6), borde2 = new THREE.PointLight('#38E1FF', 30, 18, 1.6); borde1.position.set(-5, 3, -9); borde2.position.set(5, 3, -9); s.add(borde1, borde2);

  /* ── el escenario de las cantantes: una tarima con sus luces, detrás del carril ── */
  const tarima = new THREE.Group(); tarima.position.set(0, -1.2, -11); s.add(tarima);
  const reflejo = await tex('sprites/p_circle_05.png');
  const piso = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshBasicMaterial({ map: reflejo, color: '#B44BFF', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  piso.rotation.x = -Math.PI / 2; tarima.add(piso);
  const cantantes = [];

  async function modelo(id){
    const P = PERSONAJES.find(p => p.id === id) || PERSONAJES[0];
    const g = await (cacheM[id] ||= cargador.loadAsync(`modelos/${id}.glb`));
    const m = g.scene.clone(true);
    m.traverse(o => { if(o.isMesh || o.isSkinnedMesh){ o.frustumCulled = false; const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(mt => { if(mt.map) mt.map.anisotropy = 4; if(mt.transparent && mt.opacity > .95){ mt.alphaTest = .4; mt.transparent = false; } mt.side = THREE.DoubleSide; }); } });
    m.updateMatrixWorld(true);
    const pose = g.animations.length ? null : brazosAbajo(m);
    m.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(m, true), k = P.alto / Math.max(.01, b.max.y - b.min.y), c = b.getCenter(new THREE.Vector3());
    const cuerpo = new THREE.Group(); m.position.set(-c.x, -b.min.y, -c.z); cuerpo.add(m); cuerpo.scale.setScalar(k);
    const raiz = new THREE.Group(); cuerpo.rotation.y = P.rota || 0; raiz.add(cuerpo);
    /* los huesos que se pueden mover (si el modelo tiene esqueleto): por nombre, en inglés o japonés */
    const huesos = {}; m.traverse(o => { if(!o.isBone) return; const n = o.name.toLowerCase();
      const pon = (k) => { if(!huesos[k]) { huesos[k] = o; o.userData.base = o.quaternion.clone(); } };
      if(/head|頭/.test(n)) pon('cabeza'); else if(/neck|首/.test(n)) pon('cuello');
      else if(/(spine|chest|上半身)/.test(n)) pon('pecho'); else if(/(hips|pelvis|下半身|center|センター)/.test(n)) pon('cadera');
      else if(/(shoulder_l|shoulder\.l|l upperarm|upperarm_l|arm left shoulder 1|leftarm|左腕)/.test(n) && !/part|fore|lower/.test(n)) pon('brazoI');
      else if(/(shoulder_r|shoulder\.r|r upperarm|upperarm_r|arm right shoulder 1|rightarm|右腕)/.test(n) && !/part|fore|lower/.test(n)) pon('brazoD'); });
    const mezclador = g.animations.length ? new THREE.AnimationMixer(m) : null; let accion = null;
    if(mezclador){ accion = mezclador.clipAction(g.animations[0]); accion.play(); }
    return { P, raiz, cuerpo, huesos, mezclador, g, pose };
  }
  async function ponerCantantes(ids){
    cantantes.splice(0).forEach(c => tarima.remove(c.raiz));
    const xs = ids.length === 1 ? [0] : ids.length === 2 ? [-2.4, 2.4] : [-3.4, 0, 3.4];
    for(const [i, id] of ids.entries()){ const c = await modelo(id); c.raiz.position.set(xs[i], 0, i === 1 && ids.length === 3 ? -1.2 : 0); c.raiz.scale.setScalar(ids.length === 3 && i === 1 ? 2.3 : 2.1); c.i = i; tarima.add(c.raiz); cantantes.push(c); }
    return cantantes;
  }

  /* ── EL CARRIL: siete rieles; la disposición dice dónde está cada uno ── */
  const LARGO = 30, ANCHO = 1.05;
  const carril = new THREE.Group(); s.add(carril);
  const [tNota, tAro, tLinea, tLuz, tFlecha, tChispa, tEstrella, tMagia] = await Promise.all(['sprites/gen_circle_fill.png', 'sprites/gen_circle_outline.png', 'sprites/p_trace_01.png', 'sprites/p_light_01.png', 'sprites/tecla_arrow_up.png', 'sprites/p_spark_05.png', 'sprites/p_star_06.png', 'sprites/p_magic_03.png'].map(u => tex(u)));
  const piezas = { rieles: [], receptores: [], separadores: [] };
  for(let i = 0; i < 7; i++){
    const g = new THREE.Group(); carril.add(g);
    const fondoR = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * .96, LARGO), new THREE.MeshBasicMaterial({ color: COLORES_RIEL[i], transparent: true, opacity: .1, depthWrite: false, blending: THREE.AdditiveBlending }));
    fondoR.rotation.x = -Math.PI / 2; fondoR.position.z = -LARGO / 2 + 1; g.add(fondoR);
    const lado = new THREE.Mesh(new THREE.PlaneGeometry(.05, LARGO), new THREE.MeshBasicMaterial({ color: COLORES_RIEL[i], transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
    lado.rotation.x = -Math.PI / 2; lado.position.set(ANCHO / 2, .002, -LARGO / 2 + 1); g.add(lado);
    const rec = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * .9, ANCHO * .9), new THREE.MeshBasicMaterial({ map: tAro, color: COLORES_RIEL[i], transparent: true, depthWrite: false }));
    rec.rotation.x = -Math.PI / 2; rec.position.y = .01; g.add(rec);
    const brillo = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * 2.2, ANCHO * 2.2), new THREE.MeshBasicMaterial({ map: tLuz, color: COLORES_RIEL[i], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    brillo.rotation.x = -Math.PI / 2; brillo.position.y = .02; g.add(brillo);
    const haz = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO * .9, 6), new THREE.MeshBasicMaterial({ map: tLinea, color: COLORES_RIEL[i], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    haz.position.set(0, 3, 0); g.add(haz);
    piezas.rieles.push({ g, fondoR, lado, rec, brillo, haz, x: 0, vis: 0, golpe: -9 });
  }
  /* la línea de golpe, que late */
  const linea = new THREE.Mesh(new THREE.PlaneGeometry(1, .16), new THREE.MeshBasicMaterial({ map: tLinea, color: '#FFFFFF', transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  linea.rotation.x = -Math.PI / 2; linea.rotation.z = 0; linea.position.y = .015; carril.add(linea);
  /* las rayas de compás que viajan */
  const rayas = []; for(let i = 0; i < 24; i++){ const m = new THREE.Mesh(new THREE.PlaneGeometry(1, .05), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .25, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .004; carril.add(m); rayas.push(m); }

  /* las notas: una reserva de piezas que se reparten cada cuadro */
  const reserva = [], cuerpos = [], flechas = [];
  const pieza = (map, w, h, add = false) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); m.rotation.x = -Math.PI / 2; m.visible = false; carril.add(m); return m; };
  for(let i = 0; i < 160; i++) reserva.push(pieza(tNota, ANCHO * .82, ANCHO * .82));
  for(let i = 0; i < 40; i++) cuerpos.push(pieza(null, ANCHO * .4, 1, true));
  for(let i = 0; i < 60; i++) flechas.push(pieza(tFlecha, ANCHO * .62, ANCHO * .62));

  /* destellos 3D (al acertar) */
  const chispas = [];
  for(let i = 0; i < 48; i++){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: [tChispa, tEstrella, tMagia][i % 3], color: '#fff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); sp.visible = false; s.add(sp); chispas.push({ sp, t0: -9, v: new THREE.Vector3() }); }
  let siguiente = 0;
  function chispa(pos, color, n = 6, fuerza = 1){ for(let k = 0; k < n; k++){ const c = chispas[siguiente++ % chispas.length]; c.sp.position.copy(pos); c.sp.material.color.set(color); c.t0 = performance.now();
    c.v.set((Math.random() - .5) * 4, 2 + Math.random() * 4, (Math.random() - .5) * 2).multiplyScalar(fuerza); c.vida = 380 + Math.random() * 300; c.esc = .5 + Math.random() * .9; c.sp.visible = true; } }

  /* ── el estado visual del carril, que se arma cada cuadro desde los eventos ── */
  const E = { carriles: 5, ang: 0, giro: 0, onda: 0, abanico: 0, espejo: 0, oculta: null, vel: 1, visible: 1, camara: 0, camaraT: 0, glitch: 0, compas: '' };
  function disposicion(eventos, t){
    /* el último cambio de carriles y el anterior, para animar el paso */
    let antes = 5, ahora = 5, tc = -99, dur = .5;
    for(const e of eventos){ if(e.tipo !== 'carriles') continue; if(e.t <= t){ antes = ahora; ahora = e.n; tc = e.t; dur = e.dur; } else break; }
    const u = Math.min(1, Math.max(0, (t - tc) / dur)), ease = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    const A = DISPOSICIONES[antes], B = DISPOSICIONES[ahora], out = [];
    for(let r = 0; r < 7; r++){ const ia = A.rieles.indexOf(r), ib = B.rieles.indexOf(r);
      const xa = ia >= 0 ? A.x[ia] : (ib >= 0 ? B.x[ib] : 0), xb = ib >= 0 ? B.x[ib] : xa;
      out.push({ x: xa + (xb - xa) * ease, vis: (ia >= 0 ? 1 : 0) * (1 - ease) + (ib >= 0 ? 1 : 0) * ease }); }
    return { rieles: out, n: ahora, u: ease };
  }
  /* la posición de scroll: la integral de la velocidad (cambios de velocidad, altos y reversa) */
  let tramos = null;
  function prepararVelocidad(eventos){ tramos = [];
    for(const e of eventos){ if(e.tipo === 'velocidad') tramos.push({ a: e.t, b: e.t + e.dur, v: e.v }); if(e.tipo === 'alto') tramos.push({ a: e.t, b: e.t + e.dur, v: 0 }); if(e.tipo === 'reversa') tramos.push({ a: e.t, b: e.t + Math.min(e.dur, .9), v: -1.2 }); }
    tramos.sort((x, y) => x.a - y.a); }
  function pos(t){ let p = t; if(!tramos) return p; for(const tr of tramos){ if(t <= tr.a) break; const fin = Math.min(t, tr.b); p += (fin - tr.a) * (tr.v - 1); } return p; }

  const v3 = new THREE.Vector3(), mira = new THREE.Vector3(), objetivoCam = { p: new THREE.Vector3(), m: new THREE.Vector3() };
  const CAMS = [
    { p: [0, 3.6, 4.6], m: [0, 0, -7] },       // detrás, la de siempre
    { p: [0, 1.4, 4.4], m: [0, .5, -10] },     // baja, el carril como pista de carreras
    { p: [0, 9, 1.8], m: [0, 0, -5.5] },       // M075 · cenital
    { p: [-3.4, 3, 4.2], m: [.6, 0, -8] },     // M074 · lateral
    { p: [3.4, 3, 4.2], m: [-.6, 0, -8] },
    { p: [0, 5.4, 7.6], m: [0, 0, -9] }        // lejos
  ];
  const golpeDe = (golpes, t) => { let i = 0, lo = 0, hi = golpes.length - 1; while(hi - lo > 1){ const m = (lo + hi) >> 1; if(golpes[m] < t) lo = m; else hi = m; } i = golpes[hi] <= t ? hi : lo; const a = golpes[i] ?? 0, b = golpes[i + 1] ?? a + .5; return { i, fase: Math.min(1, Math.max(0, (t - a) / Math.max(.05, b - a))) }; };
  let escActual = -1, escCambio = 0, cambioCam = -9, camDe = { p: new THREE.Vector3(...CAMS[0].p), m: new THREE.Vector3(...CAMS[0].m) };

  return { r, s, cam, carril, piezas, cantantes, ponerCantantes, E, chispa, uni, prepararVelocidad, pos, LARGO, ANCHO,
    /* proyecta un punto del carril (riel r en la línea) a la pantalla, en px CSS */
    receptor(r, ancho, alto){ const R = piezas.rieles[r]; v3.set(R.x * ANCHO, 0, 0); carril.localToWorld(v3); v3.project(cam); return [(v3.x + 1) / 2 * ancho, (1 - v3.y) / 2 * alto, R.vis]; },
    proyectar(p, ancho, alto){ v3.copy(p).project(cam); return [(v3.x + 1) / 2 * ancho, (1 - v3.y) / 2 * alto]; },
    medir(ancho, alto){ r.setSize(ancho, alto, false); cam.aspect = ancho / alto; cam.fov = ancho < alto ? 64 : 50; cam.updateProjectionMatrix(); },

    /* UN CUADRO. t = segundo de la canción; an = análisis; carta (o null en el menú); est = estado del juego */
    pintar(t, { an, carta, est, modo, bajos }){
      const ahoraMs = performance.now(), ev = carta ? carta.eventos : [];
      const { i: gi, fase } = an ? golpeDe(an.golpes, t) : { i: Math.floor(t * 2), fase: (t * 2) % 1 };
      const latido = Math.pow(1 - fase, 3), compas = gi % 4 === 0 ? 1 : .55;
      /* el golpe del grave: la cámara salta un poco (precalculado: los ataques graves fuertes) */
      let sacudida = 0; if(bajos){ for(let k = bajos.i || 0; k < bajos.length; k++){ const b = bajos[k]; if(b[0] > t) break; if(t - b[0] < .18) sacudida = Math.max(sacudida, b[1] * (1 - (t - b[0]) / .18)); } }
      /* los eventos vivos en este instante */
      let ang = 0, giro = 0, onda = 0, abanico = 0, espejo = 0, oculta = null, glitch = 0, compasTxt = '', camN = 0, camT = -9, esc = 0, escT = 0, tono = 0;
      const blando = (e, d = .35) => { const u = Math.min(1, (t - e.t) / d), v = e.dur ? Math.min(1, (e.t + e.dur - t) / d) : 1; return Math.max(0, Math.min(u, v)); };
      for(const e of ev){ if(e.t > t + .001) break;
        const vivo = !e.dur || t < e.t + e.dur;
        if(e.tipo === 'escenario'){ esc = e.n; escT = e.t; tono = e.tono; }
        if(e.tipo === 'camara'){ camN = e.n; camT = e.t; }
        if(!vivo) continue;
        if(e.tipo === 'inclina') ang += e.ang * blando(e);
        if(e.tipo === 'gira') giro += e.ang * blando(e, .45);
        if(e.tipo === 'onda') onda += e.fuerza * blando(e);
        if(e.tipo === 'abanico') abanico += e.fuerza * blando(e);
        if(e.tipo === 'espejo') espejo = Math.max(espejo, blando(e, .3));
        if(e.tipo === 'oculta') oculta = { cual: e.cual, u: blando(e) };
        if(e.tipo === 'glitch') glitch = Math.max(glitch, 1 - (t - e.t) / e.dur);
        if(e.tipo === 'compas') compasTxt = e.texto;
      }
      E.compas = compasTxt; E.glitch = glitch;
      /* el fondo: cambia de foto con un fundido, y late */
      if(esc !== escActual){ uni.mapa2.value = uni.mapa.value; uni.mapa.value = fondos[esc] || fondos[0]; escActual = esc; escCambio = ahoraMs; uni.tinte.value.set(ESCENARIOS[esc]?.tinte || '#7A4BFF'); }
      uni.mezcla.value = Math.max(0, 1 - (ahoraMs - escCambio) / 600);
      uni.pulso.value = latido * compas * (carta ? 1 : .5); uni.giro.value = t * .004 + tono; uni.glitch.value = glitch;
      uni.oscuro.value = .5 - latido * .08; uni.sat.value = 1.2;
      borde1.intensity = 20 + 60 * latido * compas; borde2.intensity = 20 + 60 * latido * (1 - compas + .45);
      borde1.position.x = -5 + Math.sin(t * .9) * 2; borde2.position.x = 5 + Math.cos(t * .8) * 2;

      /* el carril: visible sólo en el modo Carril (sube o se hunde al cambiar de reglas) */
      const enCarril = modo === 'carril';
      E.visible += ((enCarril ? 1 : 0) - E.visible) * .12;
      carril.visible = E.visible > .02; carril.position.y = (1 - E.visible) * -6; carril.position.z = 0;
      const D = disposicion(ev, t); E.carriles = D.n;
      piezas.rieles.forEach((R, r) => { const d = D.rieles[r]; const x = d.x * (1 - 2 * espejo); R.x = x; R.vis = d.vis;
        R.g.position.x = x * ANCHO; R.g.visible = d.vis > .02;
        R.fondoR.material.opacity = (.06 + .08 * latido) * d.vis; R.lado.material.opacity = (.35 + .4 * latido) * d.vis;
        const dg = (ahoraMs - R.golpe) / 1000; R.brillo.material.opacity = Math.max(0, 1 - dg * 5) * d.vis; R.haz.material.opacity = Math.max(0, .8 - dg * 4) * d.vis;
        R.rec.scale.setScalar(1 + .12 * latido + Math.max(0, .35 - dg * 2)); R.rec.material.opacity = d.vis; });
      const anchoTotal = (Math.max(...D.rieles.map((d, r) => d.vis > .5 ? Math.abs(d.x) : 0)) * 2 + 1.2) * ANCHO;
      /* con 6 o 7 carriles, en el teléfono se angostan para que quepan (el toque sigue la proyección) */
      const fac = Math.min(1, (innerWidth < innerHeight ? 5.6 : 8) * ANCHO / anchoTotal); carril.scale.x += (fac - carril.scale.x) * .1;
      linea.scale.set(anchoTotal, 1 + latido * 1.5, 1); linea.material.opacity = .6 + .4 * latido;
      /* las rayas de compás, con la misma integral que las notas */
      if(an){ const p0 = pos(t), vel = 9 * (est?.vel || 1); let k = 0;
        for(let j = Math.max(0, gi - 1); j < an.golpes.length && k < rayas.length; j++){ const z = -(pos(an.golpes[j]) - p0) * vel; if(z > 1) continue; if(z < -LARGO) break; const R = rayas[k++];
          R.visible = true; R.position.z = z; R.scale.set(anchoTotal * (1 + abanico * -z / LARGO * .6), (j % 4 === 0 ? 2.4 : 1), 1); R.material.opacity = (j % 4 === 0 ? .4 : .15) * Math.min(1, (LARGO + z) / 6); }
        for(; k < rayas.length; k++) rayas[k].visible = false; }

      /* las notas */
      let ir = 0, ic = 0, iff = 0;
      if(carta && est && E.visible > .02){
        const p0 = pos(t), vel = 9 * (est.vel || 1);
        for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k];
          if(n.modo !== 'carril') continue;
          const z = -(pos(n.t) - p0) * vel; if(z < -LARGO - 2) break;
          const zf = n.fin ? -(pos(n.fin) - p0) * vel : z;
          const st = est.estado[n.id]; if(st === 'hecha' || st === 'fallada' && !n.fin) continue;
          if(z > 2.5 && !(n.fin && zf < 1)) continue;
          const R = piezas.rieles[n.r], ox = Math.sin(z * .35 + t * 2.2) * onda * .9 * (-z / LARGO), fx = R.x * ANCHO * (1 + abanico * -z / LARGO * .6);
          let alfa = 1;
          if(oculta && oculta.cual === 'hidden') alfa = Math.min(1, Math.max(0, (-z - 4) / 4)) * oculta.u + (1 - oculta.u);
          if(oculta && oculta.cual === 'sudden') alfa = Math.min(1, Math.max(0, (14 + z) / 4)) * oculta.u + (1 - oculta.u);
          const zc = st === 'sosteniendo' ? 0 : z;
          if(ir < reserva.length && !(st === 'sosteniendo')){ const m = reserva[ir++]; m.visible = true; m.position.set(fx + ox, .03, zc); m.material.color.set(n.prec ? '#FFFFFF' : COLORES_RIEL[n.r]); m.material.opacity = alfa * R.vis; m.scale.setScalar(n.prec ? .8 : 1); }
          if(n.fin && ic < cuerpos.length){ const c = cuerpos[ic++]; const a = Math.min(zc, 0.0001), b = Math.max(zf, -LARGO); const largo = Math.max(.01, a - b);
            c.visible = true; c.position.set(fx + ox, .02, (a + b) / 2); c.scale.set(1, largo, 1); c.material.color.set(COLORES_RIEL[n.r]); c.material.opacity = (st === 'sosteniendo' ? .95 : .6) * alfa * R.vis; }
          if(n.tipo === 'flick' && iff < flechas.length){ const f = flechas[iff++]; f.visible = true; f.position.set(fx + ox, .05, z); f.rotation.set(-Math.PI / 2, 0, -n.dir * Math.PI / 4); f.material.opacity = alfa * R.vis; f.scale.setScalar(1 + .2 * latido); }
        }
      }
      for(; ir < reserva.length; ir++) reserva[ir].visible = false;
      for(; ic < cuerpos.length; ic++) cuerpos[ic].visible = false;
      for(; iff < flechas.length; iff++) flechas[iff].visible = false;

      /* la cámara: se acerca a la nueva posición cuando cambia la sección, flota y salta con el grave */
      if(camT !== cambioCam){ camDe.p.copy(cam.position); camDe.m.copy(mira); cambioCam = camT; }
      const C = CAMS[enCarril ? camN : 5] || CAMS[0], uc = Math.min(1, (t - camT) / 1.1), ec = 1 - Math.pow(1 - Math.max(0, uc), 3);
      objetivoCam.p.set(...C.p); objetivoCam.m.set(...C.m);
      if(!carta){ objetivoCam.p.set(Math.sin(t * .15) * 3, 2.6, 6.5); objetivoCam.m.set(0, 1.6, -11); }
      cam.position.lerpVectors(camDe.p, objetivoCam.p, carta ? ec : .03 + .97 * ec);
      mira.lerpVectors(camDe.m, objetivoCam.m, carta ? ec : .03 + .97 * ec);
      cam.position.x += Math.sin(t * .7) * .25 + (Math.random() - .5) * sacudida * .12; cam.position.y += Math.sin(t * 1.1) * .12 + sacudida * .08;
      const roll = ang + giro + Math.sin(t * .5) * .02;
      cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(mira);
      cam.fov = (innerWidth < innerHeight ? 64 : 50) - latido * compas * 1.6 + sacudida * 2; cam.updateProjectionMatrix();

      /* las cantantes: rebotan al golpe, se balancean y brincan en los acentos */
      cantantes.forEach((c, k) => { const lado = k % 2 ? -1 : 1, sal = Math.max(0, Math.sin(fase * Math.PI)) * (gi % 2 === k % 2 ? 1 : .4);
        c.raiz.position.y = sal * .18 + sacudida * .25; c.cuerpo.rotation.z = Math.sin((gi + fase) * Math.PI / 2) * .05 * lado;
        c.raiz.rotation.y = Math.sin(t * .6 + k) * .35 + (est?.ultimoGolpe && ahoraMs - est.ultimoGolpe < 140 ? .06 : 0);
        const sq = 1 + latido * .05, base = c.base || (c.base = c.raiz.scale.x); c.raiz.scale.set(base * sq, base / sq, base * sq);
        if(c.mezclador) { c.mezclador.setTime((t > 0 ? t : ahoraMs / 1000) % (c.g.animations[0].duration || 1)); }
        if(c.pose){ const b = Math.sin((gi + fase) * Math.PI), b2 = Math.sin((gi + fase) * Math.PI / 2), sube = gi % 8 >= 6 ? 1 : 0;
          const U = c.pose.u; U.uAngI.value = 1.15 - .45 * Math.max(0, b) * (k % 2 ? 1 : .6) - sube * 1.6 * latido; U.uAngD.value = 1.15 - .45 * Math.max(0, -b) - sube * 1.6 * latido;
          U.uVaiven.value = .35 * b2; U.uCab.value = .1 * b + .08 * latido; U.uCabY.value = .25 * b2; }
        const H = c.huesos, q = new THREE.Quaternion(), e = new THREE.Euler();
        const ponH = (h, x, y, z) => { if(!h) return; e.set(x, y, z); q.setFromEuler(e); h.quaternion.copy(h.userData.base).multiply(q); };
        if(!c.mezclador){ const b = Math.sin((gi + fase) * Math.PI), b2 = Math.sin((gi + fase) * Math.PI / 2);
          ponH(H.cabeza, .12 * latido, .25 * b2, .08 * b); ponH(H.pecho, .05 * latido, .15 * b2, .05 * b);
          ponH(H.brazoI, 0, .2 * b, -.5 - .5 * Math.max(0, b)); ponH(H.brazoD, 0, -.2 * b, .5 + .5 * Math.max(0, -b)); ponH(H.cadera, 0, .2 * b2, 0); }
      });
      tarima.rotation.y = Math.sin(t * .2) * .15; piso.material.opacity = .35 + .45 * latido;

      /* destellos */
      for(const c of chispas){ if(!c.sp.visible) continue; const u = (ahoraMs - c.t0) / c.vida; if(u >= 1){ c.sp.visible = false; continue; }
        c.sp.position.addScaledVector(c.v, 1 / 60); c.v.y -= 9 / 60; c.sp.material.opacity = 1 - u; c.sp.scale.setScalar(c.esc * (1 + u)); }
      r.render(s, cam);
      return { latido, fase, gi, compas, sacudida };
    },
    /* el destello de un riel al acertar */
    golpeRiel(r, color){ const R = piezas.rieles[r]; R.golpe = performance.now(); v3.set(R.x * ANCHO, .2, 0); carril.localToWorld(v3); chispa(v3.clone(), color || COLORES_RIEL[r], 5, .8); }
  };
}
