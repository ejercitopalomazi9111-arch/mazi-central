/* EL ESCENARIO 3D: el fondo (fotos 360° de Poly Haven teñidas según la sección), las Vocaloids
   (modelos de fans de Sketchfab, vía Objaverse) que bailan al golpe, el carril en 3D con sus notas,
   la cámara que nunca se queda quieta y los destellos (partículas de Kenney). Nada se dibuja aquí:
   todo es un modelo, una foto o un sprite importado, y lo que se hace con código es MOVERLO. */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { DISPOSICIONES } from './cartas.js';
import { clone as clonarEsqueleto } from '../vendor/utils/SkeletonUtils.js';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';
import { crearCine, CINES } from './cine.js';

export const ESCENARIOS = [
  { id: 'shanghai_bund', nombre: 'Ciudad SONOLUZ', tinte: '#7A4BFF' },
  { id: 'neon_photostudio', nombre: 'Estudio neón', tinte: '#FF3D8B' },
  { id: 'metro_noord', nombre: 'Andén de los ecos', tinte: '#38E1FF' },
  { id: 'mirrored_hall', nombre: 'Salón del Coro Nulo', tinte: '#C9A2FF' },
  { id: 'rooftop_night', nombre: 'Azotea', tinte: '#FF6A3D' },
  { id: 'kloppenheim_07_puresky', nombre: 'Cielo roto', tinte: '#B0164B' },
  { id: 'industrial_sunset_02_puresky', nombre: 'Horizonte', tinte: '#2EFFC7' },
  { id: 'music_hall_01', nombre: 'Sala de conciertos', tinte: '#FFB04A' },
  { id: 'old_hall', nombre: 'Salón de los retratos', tinte: '#E8C27A' },
  { id: 'dresden_station_night', nombre: 'La estación', tinte: '#6FB7FF' },
  { id: 'modern_buildings_night', nombre: 'Ribera de cristal', tinte: '#38E1FF' },
  { id: 'st_peters_square_night', nombre: 'Plaza del obelisco', tinte: '#C9A2FF' }
];
export const PERSONAJES = [
  { id: 'gumi', nombre: 'GUMI', faccion: 'Resonantes', rota: Math.PI, alto: 1.75, color: '#7CFF6B', autor: 'Saionji' },
  { id: 'miku', nombre: 'Hatsune Miku', faccion: 'Resonantes', alto: 1.75, color: '#39E5D8', autor: 'A-Z inc.' },
  { id: 'luka', nombre: 'Okurine Luka', faccion: 'Desafinados', alto: 1.8, color: '#FF7AB6', autor: 'kirirato' },
  { id: 'una', nombre: 'Otomachi Una', faccion: 'Ecos', alto: 1.6, color: '#8E9BFF', autor: 'theuniversalmodeler' },
  { id: 'miku-hagane', nombre: 'Hagane Miku', faccion: 'Desafinados', alto: 1.75, color: '#B8B8C8', autor: 'kirirato' },
  { id: 'miku-akuma', nombre: 'Miku Excomulgada', faccion: 'Coro Nulo', alto: 1.85, color: '#FF2D55', autor: 'Tiago.Carneiro', jefe: true },
  /* el secreto de Palomazi: Temmie (Undertale) no se saca en ninguna máquina. Va sin esqueleto y vibra, como en su juego */
  { id: 'temmie', nombre: 'Temmie', faccion: 'Tem Village', alto: 1.2, color: '#9AD7FF', autor: 'Stewie_Box', secreto: true, sinBrazos: true, vibra: true },
  /* y la de la tienda: la Temmie del TEM SHOP dentro de su caja, recargada en el mostrador (Carlos, 30 oct) */
  { id: 'temmie-tienda', nombre: 'Temmie del Tem Shop', faccion: 'Tem Village', alto: 1.9, color: '#7FB6C9', autor: 'xunbile', secreto: true, vibra: true }
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

/* LAS FORMAS DE NOTA (cosmético) que son modelos de verdad (Sketchfab, CC BY: ver CREDITOS.md). `pie`: va parado de
   frente a la cámara; si no, acostado en el carril como las gemas de Guitar Hero. `fijo`: los materiales que no se
   pintan del color del carril (el aro del botón va plateado). `sinMapa`: la textura del autor es oscura y con ella el
   color del carril no se ve. `caja`: se ajusta a ese ancho × alto × fondo (en anchos de carril), y `gira` lo voltea
   sobre su eje vertical antes. Los ids son los de siempre, para no romper lo que ya tiene cada jugador.
   NINGUNA nota se dibuja por código (Carlos, 30 oct: «cualquier modelo hecho por ti hay que quitarlo y poner uno de
   licencia gratuita»): hasta la barra de fábrica es un modelo, un lingote low poly acostado de lado a lado */
export const MODELOS_NOTA = {
  barra: { archivo: 'lingote', gira: Math.PI / 2, caja: [1.12, .17, .36], sinMapa: true },
  pildora: { archivo: 'arcade', ancho: .9, fijo: /Aro/ }, doble: { archivo: 'holo', ancho: .96 }, diamante: { archivo: 'brillante', ancho: .82, grueso: .62, sinMapa: true },
  disco: { archivo: 'disco', ancho: .96 }, cristal: { archivo: 'cristal', pie: true, alto: .62, sinMapa: true }, gema: { archivo: 'gema', pie: true, alto: .6, sinMapa: true },
  estrella: { archivo: 'estrella', acuesta: true, ancho: .92 }, nota: { archivo: 'nota', pie: true, alto: .66, sinMapa: true },
  temmie: { archivo: 'flakes', pie: true, alto: .7, propio: true }
};
/* el material del autor, listo para pintarse: sin transparencia de vidrio ni metal espejo (en una pista oscura se ven
   negros) y con brillo propio del color, que es lo que hace que se lea a lo lejos */
export function materialDeNota(base, F, color){ const n = base.clone(); n.side = THREE.DoubleSide; n.transparent = true; n.opacity = 1;
  if('metalness' in n){ n.metalness = Math.min(n.metalness ?? 0, .35); n.roughness = Math.max(.22, n.roughness ?? .5); }
  if('transmission' in n) n.transmission = 0;
  if(F.sinMapa){ n.map = n.metalnessMap = n.roughnessMap = n.aoMap = null; }
  n.userData.fijo = F.fijo ? F.fijo.test(base.name) : false; n.userData.propio = !!F.propio; pintarMaterial(n, color); n.needsUpdate = true; return n; }
const blanco = new THREE.Color('#FFFFFF'), plata = new THREE.Color('#E6E3F0');
export function pintarMaterial(n, color){
  if(n.userData.fijo){ n.color.copy(plata); if(n.emissive) n.emissive.setRGB(.1, .1, .12); return; }
  /* las que traen su dibujo (la caja de Temmie Flakes) no se pintan: el carril sólo les da un brillo de su color */
  if(n.userData.propio){ n.color.copy(blanco); if(n.emissive) n.emissive.copy(color).multiplyScalar(.12); return; }
  n.color.copy(color).lerp(blanco, .25); if(n.emissive) n.emissive.copy(color).multiplyScalar(.4); }

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
  /* los siete de siempre se cargan al entrar; los de las salas de piano, cuando se piden (4 MB menos al abrir el juego) */
  const fondos = await Promise.all(ESCENARIOS.slice(0, 7).map(e => tex(`escenarios/${e.id}.jpg`)));
  const pedirFondo = (i) => { if(fondos[i] === undefined && ESCENARIOS[i]){ fondos[i] = null; tex(`escenarios/${ESCENARIOS[i].id}.jpg`).then(t => { fondos[i] = t; }); } };
  uni.mapa.value = uni.mapa2.value = fondos[0];

  /* ── la luz ── */
  const hemi = new THREE.HemisphereLight('#E9DCFF', '#22102E', 1.1); s.add(hemi);
  const llave = new THREE.DirectionalLight('#FFFFFF', 2.2); llave.position.set(-3, 6, 6); s.add(llave);
  const borde1 = new THREE.PointLight('#FF3D8B', 30, 18, 1.6), borde2 = new THREE.PointLight('#38E1FF', 30, 18, 1.6); borde1.position.set(-5, 3, -9); borde2.position.set(5, 3, -9); s.add(borde1, borde2);

  /* ── el escenario de las cantantes: una tarima con sus luces, detrás del carril ── */
  /* van AL FONDO, más allá del final de la pista y más grandes (Carlos, 29 oct: «bailando más al fondo, como si algo
     estuviera pasando relevante a la historia»): detrás del final de la pista (que llega a z = −29), nunca paradas encima de ella */
  const tarima = new THREE.Group(); tarima.position.set(0, -.8, -36); tarima.scale.setScalar(2.3); s.add(tarima);
  const reflejo = await tex('sprites/p_circle_05.png');
  const piso = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshBasicMaterial({ map: reflejo, color: '#B44BFF', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  piso.rotation.x = -Math.PI / 2; tarima.add(piso);
  const cantantes = [];
  /* las cinemáticas de fondo de la Historia (cine.js): ciudad que cae, plaga, diluvio, robots, concierto, videojuego */
  const cine = crearCine({ s, tex, cargador, clonarEsqueleto });
  /* los haces de luz que barren desde la tarima (planos con el trazo de Kenney, sumados), y las chispas
     que flotan todo el tiempo: el escenario nunca está quieto */
  const tHaz = await tex('sprites/p_trace_04.png'), tPolvo = await tex('sprites/p_spark_05.png');
  const haces = []; for(let i = 0; i < 6; i++){ const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 26), new THREE.MeshBasicMaterial({ map: tHaz, color: ['#FF2D7A', '#38E1FF', '#B44BFF'][i % 3], transparent: true, opacity: .0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.geometry.translate(0, 13, 0); m.position.set((i - 2.5) * 2.6, -.5, -2); tarima.add(m); haces.push(m); }
  const polvo = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: tPolvo, size: .45, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, color: '#E9C8FF', fog: false }));
  { const n = 220, p = new Float32Array(n * 3); for(let i = 0; i < n; i++){ p[i * 3] = (Math.random() - .5) * 30; p[i * 3 + 1] = Math.random() * 12 - 2; p[i * 3 + 2] = -Math.random() * 30 + 4; } polvo.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); }
  s.add(polvo);

  async function modelo(id){
    const P = PERSONAJES.find(p => p.id === id) || PERSONAJES[0];
    const g = await (cacheM[id] ||= cargador.loadAsync(`modelos/${id}.glb`));
    const m = clonarEsqueleto(g.scene);   /* con esqueleto: clone() normal deja la piel pegada a los huesos del original */
    m.traverse(o => { if(o.isMesh || o.isSkinnedMesh){ o.frustumCulled = false; const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(mt => { if(mt.map) mt.map.anisotropy = 4; if(mt.transparent && mt.opacity > .95){ mt.alphaTest = .4; mt.transparent = false; } mt.side = THREE.DoubleSide; }); } });
    m.updateMatrixWorld(true);
    const pose = g.animations.length || P.sinBrazos ? null : brazosAbajo(m);
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
    /* LOS BAILES: desde el 30 de octubre cada cantante trae esqueleto y cinco bailes capturados de bailarines reales
       (herramientas/riggear.py; CMU Graphics Lab Motion Capture Database): macarena, salsa, lambada, lindy hop y ballet */
    const mezclador = g.animations.length ? new THREE.AnimationMixer(m) : null;
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
  /* las notas: la reserva se llena con la forma puesta (MODELOS_NOTA, arriba); la de fábrica es la barra, un rectángulo
     acostado que sobresale un poco del carril (Carlos, 29 oct: «rectangulitos horizontales que sobresalgan un poco») */
  for(let i = 0; i < 160; i++){ const m = new THREE.Mesh(new THREE.BufferGeometry(), []); m.visible = false; carril.add(m); reserva.push(m); }
  const cacheForma = {};
  /* un modelo → UNA geometría con un grupo por material (así cabe en la misma reserva de mallas) y la lista de materiales */
  async function formaDeModelo(id){
    const F = MODELOS_NOTA[id]; const g = await (cacheM['nota:' + F.archivo] ||= cargador.loadAsync(`modelos/notas/${F.archivo}.glb`));
    g.scene.updateMatrixWorld(true); const geos = [], mats = [];
    g.scene.traverse(o => { if(!o.isMesh) return; const ge = o.geometry.clone();
      for(const k of Object.keys(ge.attributes)) if(!['position', 'normal', 'uv'].includes(k)) ge.deleteAttribute(k);
      for(const k of ['position', 'normal', 'uv']){ const at = ge.attributes[k]; if(!at) continue; const n = at.itemSize, f = new Float32Array(at.count * n);
        for(let i = 0; i < at.count; i++) for(let c = 0; c < n; c++) f[i * n + c] = at.getComponent(i, c); ge.setAttribute(k, new THREE.BufferAttribute(f, n)); }
      if(!ge.attributes.uv) ge.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ge.attributes.position.count * 2), 2));
      if(!ge.attributes.normal) ge.computeVertexNormals();
      ge.applyMatrix4(o.matrixWorld); geos.push(ge.index ? ge.toNonIndexed() : ge); mats.push(o.material); });
    const geo = mergeGeometries(geos, true); if(F.gira) geo.rotateY(F.gira); if(F.acuesta) geo.rotateX(-Math.PI / 2);   /* acostada: lo que veía a la cámara ahora ve al cielo */
    geo.computeBoundingBox(); const b = geo.boundingBox, c = b.getCenter(new THREE.Vector3()), t = b.getSize(new THREE.Vector3());
    geo.translate(-c.x, -c.y, -c.z);
    /* caja: a esa medida exacta; parado: de frente a la cámara, con el alto pedido; acostado: del ancho del carril, sin pasar de .3 de grueso */
    if(F.caja){ geo.scale(ANCHO * F.caja[0] / t.x, F.caja[1] / t.y, ANCHO * F.caja[2] / t.z); t.y = F.caja[1]; }
    else { let k = F.pie ? F.alto / t.y : Math.min(ANCHO * F.ancho / Math.max(t.x, t.z), (F.grueso || .3) / t.y);
      if(F.pie) k = Math.min(k, ANCHO * .95 / t.x);
      geo.scale(k, k, k); t.y *= k; }
    geo.translate(0, t.y / 2 - .07, 0);   /* apoyado en la pista (la nota va a .08 de altura) */
    return { geo, mats, F };
  }
  let formaActual = 'barra';
  async function ponerForma(id){
    if(!MODELOS_NOTA[id]) id = 'barra'; formaActual = id;
    const F = await (cacheForma[id] ||= formaDeModelo(id)); if(formaActual !== id) return;
    for(const m of reserva){ m.geometry = F.geo;
      /* cada nota con sus propios materiales: el color y la transparencia cambian nota por nota */
      const ms = F.mats.map(base => materialDeNota(base, F.F, cTmp.set('#B44BFF')));
      m.material = ms; m.userData.modelo = ms; } }
  const cTmp = new THREE.Color();
  function pintaNota(m, color, alfa, esc){ cTmp.set(color); for(const mt of m.userData.modelo || []){ mt.opacity = alfa; pintarMaterial(mt, cTmp); } m.scale.setScalar(esc); }
  await ponerForma('barra');
  for(let i = 0; i < 40; i++) cuerpos.push(pieza(null, ANCHO * .4, 1, true));
  for(let i = 0; i < 60; i++){ const f = pieza(tFlecha, ANCHO * .62, ANCHO * .62); f.material.depthTest = false; f.renderOrder = 40; flechas.push(f); }

  /* destellos 3D (al acertar) */
  const chispas = [];
  for(let i = 0; i < 48; i++){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: [tChispa, tEstrella, tMagia][i % 3], color: '#fff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); sp.visible = false; s.add(sp); chispas.push({ sp, t0: -9, v: new THREE.Vector3() }); }
  let siguiente = 0;
  function chispa(pos, color, n = 6, fuerza = 1){ for(let k = 0; k < n; k++){ const c = chispas[siguiente++ % chispas.length]; c.sp.position.copy(pos); c.sp.material.color.set(color); c.t0 = performance.now();
    c.v.set((Math.random() - .5) * 4, 2 + Math.random() * 4, (Math.random() - .5) * 2).multiplyScalar(fuerza); c.vida = 380 + Math.random() * 300; c.esc = .5 + Math.random() * .9; c.sp.visible = true; } }

  /* ── el estado visual del carril, que se arma cada cuadro desde los eventos ── */
  const E = { zoom: 1, centro: 0, movido: 99, carriles: 5, ang: 0, giro: 0, abanico: 0, espejo: 0, oculta: null, vel: 1, visible: 1, camara: 0, camaraT: 0, glitch: 0, compas: '' };
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

  /* un punto de la pista en el sistema de un carril (ladeado o torcido) → el sistema del carril entero */
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qC = new THREE.Quaternion(), ejeZ = new THREE.Vector3(0, 0, 1), eB = new THREE.Euler(), qPlano = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  function enCarrilDe(R, z, abre, out){ return out.set(R.x * ANCHO * abre, .08, z).applyMatrix4(R.g.matrix); }
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
  let vertical = true, escActual = -1, escCambio = 0, cambioCam = -9, camDe = { p: new THREE.Vector3(...CAMS[0].p), m: new THREE.Vector3(...CAMS[0].m) };

  /* EL HUEVO DE PASCUA (Carlos, 29 oct: «al tocar el logo 10 veces que salga y camine hacia la pantalla y
     se quede viendo un rato, luego se ría y se vaya como si saltara hacia abajo»). La Miku «Shiteyanyo»
     de Seafoam (Sketchfab, CC BY) trae su propia caminata hacia el frente; va colgada de la cámara para
     que camine hacia la pantalla venga de donde venga la cámara. Tiempos en segundos desde que sale. */
  /* RESOLUCIÓN AUTOMÁTICA, para los teléfonos que no alcanzan: si el cuadro tarda en promedio más de 22 ms
     (menos de ~45 por segundo) durante 2 s, se baja la nitidez del 3D un cuarto; si sobra (menos de 12 ms)
     durante 6 s, se sube. Las notas y el juicio no dependen de esto: van con el reloj del audio. */
  let tam = [1, 1], ultimo = 0, media = 16, lento = 0, holgado = 0, dtS = 1 / 60, dtC = 1 / 60;
  const tope = Math.min(2, devicePixelRatio || 1); let razon = tope;
  function calidad(ahora){ const dt = ultimo ? Math.min(100, ahora - ultimo) : 16; ultimo = ahora; dtS = Math.min(.05, dt / 1000); dtC = Math.min(.3, dt / 1000);
    media += (dt - media) * .05;
    if(media > 22){ lento += dt; holgado = 0; } else if(media < 12){ holgado += dt; lento = 0; } else { lento = holgado = 0; }
    const nueva = lento > 2000 ? Math.max(.75, razon - .25) : holgado > 6000 ? Math.min(tope, razon + .25) : razon;
    if(nueva !== razon){ razon = nueva; lento = holgado = 0; r.setPixelRatio(razon); r.setSize(tam[0], tam[1], false); } }

  s.add(cam);
  let susto = null;
  const SUSTO = { camina: 3.4, mira: 6.0, rie: 7.6, salta: 9.2 };
  async function asustar(){
    if(susto) return null;
    const g = await (cacheM['susto'] ||= cargador.loadAsync('modelos/miku-susto.glb'));
    const m = clonarEsqueleto(g.scene); m.traverse(o => { if(o.isMesh){ o.frustumCulled = false; o.renderOrder = 50; } });
    const mezclador = new THREE.AnimationMixer(m), paso = mezclador.clipAction(g.animations[0]); paso.play();
    m.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(m, true), k = 1.7 / (b.max.y - b.min.y), c = b.getCenter(new THREE.Vector3());
    const cuerpo = new THREE.Group(); m.position.set(-c.x, -b.min.y, -c.z); cuerpo.add(m); cuerpo.scale.setScalar(k);
    const raiz = new THREE.Group(); raiz.add(cuerpo); cam.add(raiz);
    susto = { raiz, cuerpo, mezclador, t0: performance.now() };
    return SUSTO;
  }
  function moverSusto(){
    if(!susto) return;
    const t = window.__sustoT ?? (performance.now() - susto.t0) / 1000, { raiz, cuerpo, mezclador } = susto, S = SUSTO;   // __sustoT: las pruebas congelan el instante
    const sale = (u) => 1 - Math.pow(1 - u, 3), cl = (u) => Math.min(1, Math.max(0, u));
    let z = -2.4, y = -1.45, giro = 0, esc = 1;
    if(t < S.camina){ const u = t / S.camina; z = -18 + (18 - 2.4) * u; mezclador.setTime(t % 1.25); y += Math.abs(Math.sin(t * Math.PI / .625)) * .04; }
    else if(t < S.mira){ const u = cl((t - S.camina) / 1.4); mezclador.setTime(.62); z = -2.4 + .7 * sale(u); giro = .32 * sale(u) * Math.sin(Math.min(1, (t - S.camina) / 2.2) * Math.PI / 2); y += .2 * sale(u); }      // se acerca y ladea la cabeza
    else if(t < S.rie){ z = -1.7; mezclador.setTime(.62 + Math.sin(t * 40) * .05); giro = .32 * Math.cos((t - S.mira) * 9); y += .2 + Math.abs(Math.sin(t * 26)) * .07; esc = 1 + .04 * Math.sin(t * 30); }    // la risa: tiembla de risa
    else if(t < S.salta){ const u = (t - S.rie) / (S.salta - S.rie); mezclador.setTime(1.0);
      /* se agacha, brinca un poco y se deja caer hacia abajo, fuera de la pantalla */
      const agacha = u < .18 ? Math.sin(u / .18 * Math.PI) * .18 : 0, vuela = u >= .18 ? (u - .18) / .82 : 0;
      z = -1.7 - vuela * 1.4; y += .2 * (1 - vuela) - agacha + (vuela < .3 ? Math.sin(vuela / .3 * Math.PI / 2) * .5 : .5 - Math.pow((vuela - .3) / .7, 2) * 7); giro = vuela * .5; esc = 1 - agacha * .3; }
    else { cam.remove(raiz); susto = null; return; }
    /* gira desde los pies: se corre de lado para que la cara no se salga de cuadro al ladear la cabeza */
    raiz.position.set(Math.sin(giro) * 1.3, y, z); raiz.rotation.z = giro; raiz.scale.set(esc, 2 - esc, esc);
  }

  return { ponerCine: (c) => { if(c) pedirFondo(CINES[c]?.escenario); return cine.poner(c); }, precargar: (ns) => ns.forEach(pedirFondo), ponerForma, r, s, cam, carril, piezas, cantantes, ponerCantantes, E, chispa, uni, prepararVelocidad, pos, LARGO, ANCHO, asustar, SUSTO,
    /* proyecta un punto del carril (riel r en la línea) a la pantalla, en px CSS */
    receptor(r, ancho, alto){ const R = piezas.rieles[r]; v3.set(R.x * ANCHO, 0, 0); carril.localToWorld(v3); v3.project(cam); return [(v3.x + 1) / 2 * ancho, (1 - v3.y) / 2 * alto, R.vis]; },
    proyectar(p, ancho, alto){ v3.copy(p).project(cam); return [(v3.x + 1) / 2 * ancho, (1 - v3.y) / 2 * alto]; },
    medir(ancho, alto){ tam = [ancho, alto]; r.setSize(ancho, alto, false); cam.aspect = ancho / alto; vertical = ancho < alto; cam.fov = vertical ? 64 : 50; cam.updateProjectionMatrix(); },

    /* UN CUADRO. t = segundo de la canción; an = análisis; carta (o null en el menú); est = estado del juego */
    pintar(t, { an, carta, est, modo, bajos }){
      const ahoraMs = performance.now(), ev = carta ? carta.eventos : [];
      const { i: gi, fase } = an ? golpeDe(an.golpes, t) : { i: Math.floor(t * 2), fase: (t * 2) % 1 };
      const latido = Math.pow(1 - fase, 3), compas = gi % 4 === 0 ? 1 : .55;
      /* el golpe del grave: la cámara salta un poco (precalculado: los ataques graves fuertes) */
      let sacudida = 0; if(bajos){ for(let k = bajos.i || 0; k < bajos.length; k++){ const b = bajos[k]; if(b[0] > t) break; if(t - b[0] < .18) sacudida = Math.max(sacudida, b[1] * (1 - (t - b[0]) / .18)); } }
      /* los eventos vivos en este instante */
      let movT = -9, ang = 0, giro = 0, abanico = 0, peraltes = [], aleja = 0, espejo = 0, oculta = null, glitch = 0, compasTxt = '', camN = 0, camT = -9, esc = 0, escT = 0, tono = 0, destelloT = -9;
      const blando = (e, d = .35) => { const u = Math.min(1, (t - e.t) / d), v = e.dur ? Math.min(1, (e.t + e.dur - t) / d) : 1; return Math.max(0, Math.min(u, v)); };
      for(const e of ev){ if(e.t > t + .001) break;
        const vivo = !e.dur || t < e.t + e.dur;
        if(e.tipo === 'escenario'){ esc = e.n; escT = e.t; tono = e.tono; }
        if(['carriles', 'gira', 'espejo', 'inclina', 'abanico', 'peralte', 'aleja'].includes(e.tipo) && e.t > 0) movT = e.t;
        if(e.tipo === 'destello') destelloT = e.t;
        if(e.tipo === 'camara'){ camN = e.n; camT = e.t; }
        if(!vivo) continue;
        if(e.tipo === 'inclina') ang += e.ang * blando(e);
        /* girar 90° acuesta la pista y la línea de golpe se sale de la pantalla, en vertical y en horizontal
           (Carlos, 29 oct): un cuarto de vuelta se vuelve un ladeo fuerte; de cabeza (π) sí cabe y se queda */
        if(e.tipo === 'gira') giro += (Math.abs(Math.abs(e.ang) - Math.PI / 2) < .1 ? Math.sign(e.ang) * .38 : e.ang) * blando(e, .45);
        if(e.tipo === 'aleja') aleja = Math.max(aleja, blando(e, .7));
        if(e.tipo === 'peralte' || e.tipo === 'onda') peraltes.push({ forma: e.forma || 'ola', f: e.fuerza * blando(e, .5), t0: e.t });
        if(e.tipo === 'abanico') abanico += e.fuerza * blando(e);
        if(e.tipo === 'espejo') espejo = Math.max(espejo, blando(e, .3));
        if(e.tipo === 'oculta') oculta = { cual: e.cual, u: blando(e) };
        if(e.tipo === 'glitch') glitch = Math.max(glitch, 1 - (t - e.t) / e.dur);
        if(e.tipo === 'compas') compasTxt = e.texto;
      }
      if(cine.tipo && carta) esc = CINES[cine.tipo].escenario;
      E.movido = t - movT; if(vertical) ang = Math.max(-.45, Math.min(.45, ang));
      E.compas = compasTxt; E.glitch = glitch; E.destello = Math.max(0, 1 - (t - destelloT) / .45);
      /* los haces: barren al compás y se encienden con el golpe */
      haces.forEach((h, k) => { const lado = k % 2 ? 1 : -1; h.rotation.z = Math.sin(t * (.6 + k * .07) + k) * .55 + lado * .25 * Math.sin((gi + fase) * Math.PI / 4); h.rotation.x = -.25 + Math.sin(t * .4 + k) * .15;
        h.material.opacity = (.12 + .35 * latido * (gi % 2 === k % 2 ? 1 : .4)) * (carta ? 1 : .6) + E.destello * .5; });
      { const P = polvo.geometry.attributes.position; for(let i = 0; i < P.count; i++){ let y = P.getY(i) + .012 + latido * .02; if(y > 10) y = -2; P.setY(i, y); P.setX(i, P.getX(i) + Math.sin(t + i) * .004); } P.needsUpdate = true; polvo.material.size = .35 + latido * .3; }
      /* el fondo: cambia de foto con un fundido, y late */
      pedirFondo(esc);
      if(esc !== escActual && fondos[esc]){ uni.mapa2.value = uni.mapa.value; uni.mapa.value = fondos[esc]; escActual = esc; escCambio = ahoraMs; uni.tinte.value.set(ESCENARIOS[esc]?.tinte || '#7A4BFF'); }
      uni.mezcla.value = Math.max(0, 1 - (ahoraMs - escCambio) / 600);
      uni.pulso.value = latido * compas * (carta ? 1 : .5) + E.destello * .8; uni.giro.value = t * .004 + tono; uni.glitch.value = glitch;
      uni.oscuro.value = .5 - latido * .08; uni.sat.value = 1.2;
      cine.ver(!!carta);
      if(cine.tipo && carta){ { const C = CINES[cine.tipo]; uni.tinte.value.set(C.tinte); uni.oscuro.value = C.oscuro - latido * .08; uni.sat.value = C.sat;
        uni.pulso.value += cine.cuadro(t, dtS, { gi, latido, compas }) * .9; } }
      borde1.intensity = 20 + 60 * latido * compas; borde2.intensity = 20 + 60 * latido * (1 - compas + .45);
      borde1.position.x = -5 + Math.sin(t * .9) * 2; borde2.position.x = 5 + Math.cos(t * .8) * 2;

      /* el carril: visible sólo en el modo Carril (sube o se hunde al cambiar de reglas) */
      const enCarril = modo === 'carril';
      E.visible += ((enCarril ? 1 : 0) - E.visible) * .12;
      carril.visible = E.visible > .02; carril.position.y = (1 - E.visible) * -6 - latido * compas * .06 - sacudida * .08;
      /* LAS NOTAS SE ALEJAN (Carlos, 30 oct: «que las notas fluyan lejos del jugador y se toquen al alejarse hasta el
         botón»): la pista entera da media vuelta y sus botones se van al fondo; las notas salen de junto a la cámara y se
         van hacia ellos. Al voltearse, los carriles también quedan al revés */
      const al = aleja * aleja * (3 - 2 * aleja); E.aleja = al; carril.rotation.y = Math.PI * al; carril.position.z = -15 * al;
      const D = disposicion(ev, t); E.carriles = D.n;
      /* EL PERALTE: cada carril gira sobre su botón (que se queda en la línea, así el dedo no se mueve): se ladea
         como curva de carreras, se tuerce en diagonal o sube como rampa. En vertical lo diagonal va más suave */
      let pf = 0; const yawK = vertical ? .6 : 1;
      piezas.rieles.forEach((R, r) => { const d = D.rieles[r]; const x = d.x * (1 - 2 * espejo); R.x = x; R.vis = d.vis;
        R.g.position.x = x * ANCHO; R.g.visible = d.vis > .02;
        let ladeo = 0, tuerce = 0, rampa = 0; const par = r % 2 ? 1 : -1;
        for(const P of peraltes){ const f = P.f, u = t - P.t0;
          if(P.forma === 'ola'){ ladeo += .55 * f * Math.sin(u * 3.1 - d.x * .9); rampa += .07 * f * Math.sin(u * 2.3 - d.x); }
          if(P.forma === 'tuerce'){ ladeo += .5 * f * par * Math.min(1, u * 2); tuerce += .05 * f * par; }
          if(P.forma === 'abre') tuerce -= .075 * f * d.x;
          if(P.forma === 'cierra') tuerce += .07 * f * d.x;
          if(P.forma === 'rampa'){ rampa += .13 * f * par; ladeo += .18 * f * Math.sin(u * 1.7 + d.x); }
          if(P.forma === 'trenza') tuerce += .11 * f * Math.sin(u * 2.4 + d.x * Math.PI / 2);
          pf = Math.max(pf, f); }
        R.g.rotation.set(rampa, tuerce * yawK, ladeo, 'YXZ'); R.g.updateMatrix();
        R.fondoR.material.opacity = (.06 + .08 * latido) * d.vis; R.lado.material.opacity = (.35 + .4 * latido) * d.vis;
        const dg = R.tenido ? 0 : (ahoraMs - R.golpe) / 1000;   /* mientras el dedo siga apretado, el carril sigue encendido */ R.brillo.material.opacity = Math.max(0, 1 - dg * 5) * d.vis; R.haz.material.opacity = Math.max(0, .8 - dg * 4) * d.vis;
        R.rec.scale.setScalar(1 + .12 * latido + Math.max(0, .35 - dg * 2)); R.rec.material.opacity = d.vis; });
      const anchoTotal = (Math.max(...D.rieles.map((d, r) => d.vis > .5 ? Math.abs(d.x) : 0)) * 2 + 1.2) * ANCHO;
      /* con 6 o 7 carriles, en el teléfono se angostan para que quepan (el toque sigue la proyección) */
      /* el carril siempre cabe: lo que la cámara alcanza a ver a lo ancho en la línea de golpe, menos un margen
         (en un teléfono vertical, cinco carriles de ancho normal se salían: el de la orilla quedaba en x = −69) */
      const dLinea = Math.hypot(cam.position.y, cam.position.z) || 5, visto = 2 * dLinea * Math.tan(cam.fov * Math.PI / 360) * cam.aspect;
      const fac = Math.min(1.15, visto * .9 / anchoTotal); carril.scale.x += (fac - carril.scale.x) * .15;
      linea.scale.set(anchoTotal, 1 + latido * 1.5, 1); linea.material.opacity = .6 + .4 * latido;
      /* las rayas de compás, con la misma integral que las notas */
      if(an){ const p0 = pos(t), vel = 9 * (est?.vel || 1); let k = 0;
        for(let j = Math.max(0, gi - 1); j < an.golpes.length && k < rayas.length; j++){ const z = -(pos(an.golpes[j]) - p0) * vel; if(z > 1) continue; if(z < -LARGO) break; const R = rayas[k++];
          R.visible = true; R.position.z = z; R.scale.set(anchoTotal * (1 + abanico * -z / LARGO * .6), (j % 4 === 0 ? 2.4 : 1), 1); R.material.opacity = (j % 4 === 0 ? .4 : .15) * Math.min(1, (LARGO + z) / 6) * (1 - Math.min(1, pf * 1.5)); }
        for(; k < rayas.length; k++) rayas[k].visible = false; }

      /* las notas */
      let ir = 0, ic = 0, iff = 0;
      if(carta && est && E.visible > .02){
        const p0 = pos(t), vel = 9 * (est.vel || 1);
        for(let k = est.desde; k < carta.notas.length; k++){ const n = carta.notas[k];
          if(n.modo !== 'carril') continue;
          const z = -(pos(n.t) - p0) * vel; if(z < -LARGO - 2) break;
          const zf = n.fin ? -(pos(n.fin) - p0) * vel : z;
          const st = est.estado[n.id]; if(st === 'hecha' || (st === 'fallada' || st === 'pendiente') && !n.fin) continue;
          if(z > 2.5 && !(n.fin && zf < 1)) continue;
          const R = piezas.rieles[n.r], abre = abanico * -z / LARGO * .6;
          let alfa = 1;
          if(oculta && oculta.cual === 'hidden') alfa = Math.min(1, Math.max(0, (-z - 4) / 4)) * oculta.u + (1 - oculta.u);
          if(oculta && oculta.cual === 'sudden') alfa = Math.min(1, Math.max(0, (14 + z) / 4)) * oculta.u + (1 - oculta.u);
          const zc = st === 'sosteniendo' ? 0 : z;
          /* dónde va: en el sistema de SU carril (que puede estar ladeado o torcido); la que viaja va mezclada entre
             el carril de donde sale y el suyo, y se asienta `asiento` segundos antes de la línea */
          enCarrilDe(R, zc, abre, vA); qA.copy(R.g.quaternion); let w = 0, color = n.prec ? '#FFFFFF' : COLORES_RIEL[n.r], vis = R.vis;
          if(n.viaja){ const O = piezas.rieles[n.viaja.de], asZ = n.viaja.asiento * vel, dist = -z;
            const u = Math.min(1, Math.max(0, (dist - asZ) / Math.max(.5, LARGO * .8 - asZ)));
            w = n.viaja.forma === 'zigzag' ? .5 - .5 * Math.cos(u * Math.PI * 3) : u * u * (3 - 2 * u);
            if(w > .001){ enCarrilDe(O, zc, abre, vB); vA.lerp(vB, w); qA.slerp(O.g.quaternion, w); vis = Math.max(R.vis, O.vis * w);
              if(n.viaja.ciega && u > 0) color = '#E9E4F0'; } }
          if(ir < reserva.length && !(st === 'sosteniendo')){ const m = reserva[ir++]; m.visible = true; m.position.copy(vA); m.quaternion.copy(qA); pintaNota(m, color, alfa * vis, n.prec ? .82 : 1); }
          if(n.fin && ic < cuerpos.length){ const c = cuerpos[ic++]; const a = Math.min(zc, 0.0001), b = Math.max(zf, -LARGO); const largo = Math.max(.01, a - b);
            enCarrilDe(R, (a + b) / 2, abre, vB); vB.y = .02 + (vB.y - .08); c.visible = true; c.position.copy(vB); c.quaternion.copy(R.g.quaternion).multiply(qPlano); c.scale.set(1, largo, 1); c.material.color.set(COLORES_RIEL[n.r]); c.material.opacity = (st === 'sosteniendo' ? .95 : .6) * alfa * R.vis; }
          /* LA FLECHA DE DESLIZAR: parada de frente a la pantalla (acostada en la pista no se leía) y girada hacia donde hay
             que deslizar EN LA PANTALLA, igual que la juzga el juez; se asoma un poco hacia esa dirección, como empujando */
          if(n.tipo === 'flick' && iff < flechas.length){ const f = flechas[iff++], a = -n.dir * Math.PI / 4, emp = .12 * Math.sin(ahoraMs / 90);
            f.visible = true; carril.worldToLocal(f.position.copy(vA).applyMatrix4(carril.matrixWorld).add(v3.set(0, .62, 0)));
            qB.setFromAxisAngle(ejeZ, a); qC.copy(carril.quaternion).invert().multiply(cam.quaternion).multiply(qB); f.quaternion.copy(qC);
            f.translateY(emp); f.material.opacity = alfa * vis; f.scale.setScalar(1.55 + .25 * latido); }
        }
      }
      for(; ir < reserva.length; ir++) reserva[ir].visible = false;
      for(; ic < cuerpos.length; ic++) cuerpos[ic].visible = false;
      for(; iff < flechas.length; iff++) flechas[iff].visible = false;

      /* la cámara: se acerca a la nueva posición cuando cambia la sección, flota y salta con el grave */
      if(camT !== cambioCam){ camDe.p.copy(cam.position); camDe.m.copy(mira); cambioCam = camT; }
      const C = CAMS[enCarril ? camN : 5] || CAMS[0], uc = Math.min(1, (t - camT) / 1.1), ec = 1 - Math.pow(1 - Math.max(0, uc), 3);
      objetivoCam.p.set(...C.p); objetivoCam.m.set(...C.m);
      /* en vertical las cámaras laterales empujaban los receptores de la orilla fuera de la pantalla: ahí van más
         cerca del centro, y la mira se corre hacia donde están de verdad los receptores */
      if(vertical && carta){ objetivoCam.p.x *= .45; objetivoCam.m.x *= .3; objetivoCam.m.x += E.centro * 1.6; }
      if(carta && E.aleja){ objetivoCam.m.z -= 7 * E.aleja; objetivoCam.p.y += 1.5 * E.aleja; }
      if(!carta){ objetivoCam.p.set(Math.sin(t * .15) * 4, 4.5, -16); objetivoCam.m.set(0, 4, -36); }
      cam.position.lerpVectors(camDe.p, objetivoCam.p, carta ? ec : .03 + .97 * ec);
      mira.lerpVectors(camDe.m, objetivoCam.m, carta ? ec : .03 + .97 * ec);
      cam.position.x += Math.sin(t * .7) * .25 + (Math.random() - .5) * sacudida * .12; cam.position.y += Math.sin(t * 1.1) * .12 + sacudida * .08;
      const roll = ang + giro + Math.sin(t * .5) * .02;
      cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(mira);
      /* la cámara se aleja sola si algún botón de toque se sale de la pantalla (giros, inclinaciones, abanicos)
         y regresa despacio cuando vuelven a caber */
      const fov0 = (vertical ? 64 : 50) - latido * compas * 1.6 + sacudida * 2;
      cam.fov = 2 * Math.atan(Math.tan(fov0 * Math.PI / 360) * E.zoom) * 180 / Math.PI; cam.updateProjectionMatrix();
      if(carta && enCarril){ let fuera = false; for(const R of piezas.rieles){ if(R.vis < .5) continue; v3.set(R.x * ANCHO, 0, 0); carril.localToWorld(v3); v3.project(cam); if(Math.abs(v3.x) > .88 || v3.y < -.9 || v3.y > .8) { fuera = true; break; } }
        /* por TIEMPO, no por cuadro: en un teléfono lento (o a 4 cuadros por segundo) la corrección llegaba tarde */
        E.zoom = fuera ? Math.min(1.9, E.zoom + 3 * dtC) : Math.max(1, E.zoom - .35 * dtC);
        /* dónde cae el centro de los receptores en la pantalla (−1 a 1): la mira lo persigue poco a poco */
        let cx = 0, k = 0; for(const R of piezas.rieles){ if(R.vis < .5) continue; v3.set(R.x * ANCHO, 0, 0); carril.localToWorld(v3); v3.project(cam); cx += v3.x; k++; }
        E.centro += (k ? cx / k : 0) * 3.2 * dtC; E.centro = Math.max(-1.5, Math.min(1.5, E.centro)); } else { E.zoom += (1 - E.zoom) * .05; E.centro *= .9; }

      /* las cantantes: rebotan al golpe, se balancean y brincan en los acentos */
      cantantes.forEach((c, k) => { const lado = k % 2 ? -1 : 1, sal = Math.max(0, Math.sin(fase * Math.PI)) * (gi % 2 === k % 2 ? 1 : .4);
        const giroSec = Math.max(0, 1 - (t - escT) / .9), vuelta = giroSec > 0 && t >= escT ? (1 - Math.pow(giroSec, 3)) * Math.PI * 2 : 0;
        c.raiz.position.y = sal * .18 + sacudida * .55 + Math.sin(Math.min(1, (t - escT) / .9) * Math.PI) * (t >= escT && t - escT < .9 ? .9 : 0); c.cuerpo.rotation.z = Math.sin((gi + fase) * Math.PI / 2) * .05 * lado;
        c.raiz.rotation.y = Math.sin(t * .6 + k) * (c.mezclador ? .12 : .35) + vuelta * (k % 2 ? -1 : 1) + (est?.ultimoGolpe && ahoraMs - est.ultimoGolpe < 140 ? .06 : 0);
        const sq = 1 + latido * .05, base = c.base || (c.base = c.raiz.scale.x); c.raiz.scale.set(base * sq, base / sq, base * sq);
        if(c.P.vibra){ c.cuerpo.position.x = (Math.random() - .5) * .04; c.cuerpo.position.z = (Math.random() - .5) * .04; }
        /* un baile por sección: cambia cuando cambia el escenario, y cada cantante baila uno distinto */
        if(c.mezclador){ const A = c.g.animations, i = (k + Math.floor(Math.max(0, escT) * 7.3) + (c.P.jefe ? 0 : 1)) % A.length;
          if(c.baile !== i){ c.mezclador.stopAllAction(); c.mezclador.clipAction(A[i]).play(); c.baile = i; c.baileT0 = t > 0 ? t : ahoraMs / 1000; }
          c.mezclador.setTime(((t > 0 ? t : ahoraMs / 1000) - c.baileT0) % (A[i].duration || 1)); }
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
        c.sp.position.addScaledVector(c.v, dtS); c.v.y -= 9 * dtS; c.sp.material.opacity = 1 - u; c.sp.scale.setScalar(c.esc * (1 + u)); }
      moverSusto(); r.render(s, cam); calidad(ahoraMs);
      return { latido, fase, gi, compas, sacudida };
    },
    /* el destello de un riel al acertar */
    golpeRiel(r, color){ const R = piezas.rieles[r]; R.golpe = performance.now(); v3.set(R.x * ANCHO, .2, 0); carril.localToWorld(v3); chispa(v3.clone(), color || COLORES_RIEL[r], 5, .8); }
  };
}
