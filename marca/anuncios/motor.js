/* EL MOTOR DE LOS ANUNCIOS DE GRUPO MAZI. Cada anuncio es una página de 1080 × 1920 que
   herramientas/video/armar.mjs pinta cuadro por cuadro (window.pintar(t)). Aquí vive lo que
   comparten todos:
     · la paleta nueva (morado oscuro, vino y claro; el techo del cubo en morado)
     · la escena 3D (three.js): el cubo del logo, teléfonos y laptops con trabajo REAL en la
       pantalla (las tomas grabadas en marca/video/rec, smileys/video/rec y fadori-campana)
     · el guion: las voces de cada renglón (voz/NN.mp3, de voces.mjs), cuándo entra cada una,
       y los subtítulos quemados (en redes casi todos ven sin sonido)
     · el tiempo: tramos, curvas y el grano de película encima de todo
   Las letras del logo salen de marca/cubo/final/piezas.js, las mismas del logo. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { HDRLoader } from './vendor/loaders/HDRLoader.js';
/* LA LUZ DE ESTUDIO: un HDRI de verdad (Poly Haven, «Studio Small 09» de Sergej Majboroda, CC0) en
   vez de la habitación de mentira de three. Carlos, 29 oct: «aprende a usar bien las texturas e
   iluminación». Se carga una vez, antes que todo (el await de arriba detiene a quien importe esto). */
const HDR = await new HDRLoader().loadAsync(new URL('./hdri/studio_small_09_1k.hdr', import.meta.url).href).catch(() => null);
if(HDR) HDR.mapping = THREE.EquirectangularReflectionMapping;
import { PIEZAS } from '../cubo/final/piezas.js';
export { THREE, PIEZAS, HDR };

export const PAL = {
  oscuro: '#170A26', oscuro2: '#241036', negro: '#0B0B0F',
  vino: '#7E1735', vino2: '#A8264B', claro: '#F4EEF2', gris: '#B9AFC4',
  techo: '#AC27FF', izq: '#34343D', der: '#52525D',
};
export const W = 1080, H = 1920;

/* ── el tiempo ── */
export const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const tramo = (t, a, b) => cl((t - a) / (b - a));
export const suave = (u) => u * u * (3 - 2 * u);
export const sale = (u) => 1 - Math.pow(1 - u, 3);
export const entra = (u) => u * u * u;
export const resorte = (u) => u >= 1 ? 1 : 1 - Math.cos(u * Math.PI * 2.6) * Math.exp(-u * 6);
export const mezcla = (a, b, u) => a + (b - a) * u;
export const vida = (t, a, b, ent = .35, sal = .3) => Math.min(sale(tramo(t, a, a + ent)), 1 - entra(tramo(t, b - sal, b)));
let semilla = 1; export const azar = (s) => { if(s !== undefined) semilla = s; return (semilla = (semilla * 16807) % 2147483647) / 2147483647; };

/* ── la escena 3D ── */
export function escena3d(canvas, { fov = 30, z = 9 } = {}){
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1;   /* ACES volvía rosa el morado */
  const s = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r); s.environment = HDR ? pm.fromEquirectangular(HDR).texture : pm.fromScene(new RoomEnvironment(), .04).texture; s.environmentIntensity = HDR ? .75 : .55;
  const cam = new THREE.PerspectiveCamera(fov, W / H, .1, 200); cam.position.set(0, 0, z);
  s.add(new THREE.HemisphereLight('#E8DDF5', '#2A0E1E', .6));
  const llave = new THREE.DirectionalLight('#FFFFFF', HDR ? 1.7 : 2.2); llave.position.set(-4, 6, 6); s.add(llave);
  const borde = new THREE.DirectionalLight(PAL.vino2, 3.2); borde.position.set(5, 2, -4); s.add(borde);
  const morado = new THREE.PointLight(PAL.techo, 4, 12); morado.position.set(0, 4, 2); s.add(morado);
  return { r, s, cam, luces: { llave, borde, morado }, pintar(){ r.render(s, cam); } };
}

/* el cubo del logo: techo morado que brilla un poco, caras oscuras; las aristas casi filosas */
export function cubo(tam = 1){
  const m = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: .42, metalness: .15, emissive: c, emissiveIntensity: e });
  const techo = m(PAL.techo, .12), lado = m('#3A3A46'), lado2 = m('#5A5A67'), fondo = m('#1B1B21');
  const caja = new THREE.BoxGeometry(tam, tam, tam), g = new THREE.Mesh(caja, [lado2, lado, techo, fondo, lado2, lado]);
  /* un filito claro en las aristas: sobre el morado oscuro, las caras solas se pierden */
  const filo = new THREE.LineSegments(new THREE.EdgesGeometry(caja), new THREE.LineBasicMaterial({ color: '#E9DDF7', transparent: true, opacity: .28 }));
  const grupo = new THREE.Group(); grupo.add(g, filo); grupo.userData = { techo, filo };
  return grupo;
}

/* un rectángulo redondeado como figura (para teléfonos y pantallas) */
function redondo(w, h, r){
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
/* una pantalla: figura redondeada con la imagen estirada exacto (u, v de 0 a 1) */
function pantalla(w, h, r, mat){
  const g = new THREE.ShapeGeometry(redondo(w, h, r), 12), p = g.attributes.position, uv = g.attributes.uv;
  for(let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  return new THREE.Mesh(g, mat);
}
const metal = () => new THREE.MeshStandardMaterial({ color: '#1C1822', roughness: .3, metalness: .75 });
const vidrio = (tex) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

/* el teléfono: 0.78 × 1.69 (la proporción de las tomas, 780 × 1688) */
export function telefono(tex){
  const g = new THREE.Group(), w = .84, h = 1.75;
  const cuerpo = new THREE.Mesh(new THREE.ExtrudeGeometry(redondo(w, h, .13), { depth: .07, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 3, curveSegments: 16 }), metal());
  cuerpo.position.z = -.07; g.add(cuerpo);
  const p = pantalla(.78, 1.688, .1, vidrio(tex)); p.position.z = .022; g.add(p);
  const isla = new THREE.Mesh(new THREE.ShapeGeometry(redondo(.2, .055, .027), 8), new THREE.MeshBasicMaterial({ color: '#000' })); isla.position.set(0, .79, .024); g.add(isla);
  g.userData.pantalla = p; return g;
}
/* la laptop: la tapa de 16:10 (las tomas de compu son 2160 × 1350) sobre su base, abierta a 100° */
export function laptop(tex, { ratio = 1.6 } = {}){
  const g = new THREE.Group(), w = 2.2, h = w / ratio;
  const tapa = new THREE.Group();
  const marco = new THREE.Mesh(new THREE.ExtrudeGeometry(redondo(w + .08, h + .12, .05), { depth: .03, bevelEnabled: false }), metal());
  marco.position.set(0, h / 2 + .06, -.03); tapa.add(marco);
  const p = pantalla(w, h, .02, vidrio(tex)); p.position.set(0, h / 2 + .07, .002); tapa.add(p);
  tapa.rotation.x = -.18; g.add(tapa);
  const base = new THREE.Mesh(new THREE.ExtrudeGeometry(redondo(w + .2, 1.45, .06), { depth: .05, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2 }), metal());
  base.rotation.x = -Math.PI / 2; base.position.set(0, -.03, .73); g.add(base);
  g.userData.pantalla = p; return g;
}

/* ── las tomas: el trabajo real, un cuadro por momento, como textura de la pantalla ── */
const TOMAS = {
  'smileys-tel': ['../../../smileys/video/rec/completa/', 2553], 'smileys-basica': ['../../../smileys/video/rec/basica/', 1234],
  'district-tel': ['../../video/rec/district-tel/', 432], 'district-pc': ['../../video/rec/district-pc/', 353],
  'arco-pc': ['../../video/rec/arco-pc/', 527], 'arco-tel': ['../../video/rec/arco-tel/', 327],
  'fadori-tel': ['../../../fadori-campana/salida/rec/app/', 2313],
};
export class Toma {
  constructor(nombre, { desde = 0, vel = 1 } = {}){
    const [dir, n] = TOMAS[nombre]; this.dir = dir; this.n = n; this.desde = desde; this.vel = vel;
    this.tex = new THREE.Texture(); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4; this.ultimo = -1;
  }
  /* deja en la textura el cuadro del segundo t de la toma (se queda en el último al acabarse) */
  async en(t){
    const i = Math.max(0, Math.min(this.n - 1, Math.floor((this.desde + t * this.vel) * 60)));
    if(i === this.ultimo) return; this.ultimo = i;
    const img = new Image(); img.src = this.dir + String(i).padStart(5, '0') + '.jpg'; await img.decode();
    this.tex.image = img; this.tex.needsUpdate = true;
  }
}
/* una textura de una imagen fija o de un lienzo dibujado */
export const imagen = async (src) => { const img = new Image(); img.src = src; await img.decode(); const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };

/* ── el guion: voces, tiempos y subtítulos ──
   guion.json: { "voces": { "nombre": "id de ElevenLabs" }, "lineas": [{ "id": "01", "voz": "…", "txt": "…",
   "pausa": 0.3, "en": 1.2 }] }. «en» fija cuándo entra; si no, entra al acabar la anterior + pausa.
   En el texto, *palabra* sale resaltada en los subtítulos (la voz no lee los asteriscos). */
export async function guion(dir = '.'){
  const g = await (await fetch(dir + '/guion.json')).json();
  const dur = await (await fetch(dir + '/voz/duraciones.json')).json();
  let t = 0;
  for(const l of g.lineas){ l.t0 = l.en ?? (t + (l.pausa ?? .25)); l.dur = dur[l.id]; l.t1 = l.t0 + l.dur; t = l.t1; }
  g.fin = t; g.de = (id) => g.lineas.find(l => l.id === id);
  return g;
}
export const sonidosVoz = (g, vol = 1) => g.lineas.map(l => [`voz/${l.id}.mp3`, l.t0, l.vol ?? vol, 'voz']);

/* los subtítulos: el renglón en pedazos de hasta 4 palabras, cada uno en su parte del tiempo */
export function subtitulos(el, g, { estilo = 'normal' } = {}){
  const trozos = [];
  for(const l of g.lineas){
    if(l.sinSub) continue;
    const pal = l.txt.split(/\s+/), grupos = [];
    for(let i = 0; i < pal.length;){ let n = Math.min(4, pal.length - i); if(pal.length - i - n === 1) n = Math.min(pal.length - i, n + 1); grupos.push(pal.slice(i, i + n)); i += n; }
    const total = grupos.reduce((a, gr) => a + gr.join(' ').length, 0); let t = l.t0;
    for(const gr of grupos){ const d = l.dur * gr.join(' ').length / total; trozos.push({ t0: t, t1: t + d, pal: gr, quien: l.quien }); t += d; }
  }
  let actual = null;
  return (t) => {
    const k = trozos.find(z => t >= z.t0 && t < z.t1 + .08);
    if(k !== actual){ actual = k;
      el.innerHTML = k ? (k.quien ? `<b class="quien">${k.quien}</b>` : '') + k.pal.map(p => /^\*.*\*[.,!?…:;]*$/.test(p) ? `<em>${p.replace(/\*/g, '')}</em>` : p.replace(/\*/g, '')).join(' ') : ''; }
    if(k){ const u = tramo(t, k.t0, k.t0 + .12); el.style.transform = `translateX(-50%) scale(${(.92 + .08 * sale(u)).toFixed(3)})`; el.style.opacity = 1; }
    else el.style.opacity = 0;
  };
}

/* ── el grano: cuatro lienzos de ruido que se turnan, para que no se vea digital ── */
export function grano(el, fuerza = .07){
  const lienzos = Array.from({ length: 4 }, (_, k) => { const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d'), d = x.createImageData(270, 480);
    azar(17 + k); for(let i = 0; i < d.data.length; i += 4){ const v = azar() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c.toDataURL(); });
  el.style.cssText += `;position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:${fuerza};background-size:540px 960px;image-rendering:pixelated;z-index:50`;
  return (t) => { el.style.backgroundImage = `url(${lienzos[Math.floor(t * 24) % 4]})`; };
}

/* el logo en un lienzo 2D (las mismas piezas que marca/cubo/final): nombre + cubo, o sólo el cubo */
const rutas = {};
const pth = (d) => rutas[d] || (rutas[d] = new Path2D(d));
export function logo2d(x, { cx, cy, ancho, soloCubo = false, letra = PAL.claro, partes = null, alfa = 1 }){
  const kc = 100 / 98, total = soloCubo ? 92 : PIEZAS.ancho + 24 + 92 * kc, e = ancho / total;
  x.save(); x.globalAlpha = alfa; x.translate(cx - ancho / 2, cy + 50 * e);
  if(!soloCubo){ x.save(); x.scale(e, e); x.fillStyle = letra; x.fill(pth(PIEZAS.mazi.join(' '))); x.restore(); x.translate((PIEZAS.ancho + 24) * e, 0); }
  x.translate(0, -(100 + 6 * kc) * e); x.scale(kc * e, kc * e);
  if(soloCubo) x.translate(-8, 0);
  const C = { arriba: PAL.techo, izq: PAL.izq, der: PAL.der };
  for(const [k, d] of Object.entries(partes || PIEZAS.cubo)){ x.fillStyle = C[k]; x.fill(pth(d)); }
  x.restore();
}
