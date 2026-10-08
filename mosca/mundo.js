/* EL MUNDO de las tres moscas: la arena, lo que ven, huelen, prueban y sienten, y cómo se mueven.

   Quién decide qué:
     · EL CEREBRO (trabajador.js → cerebro.js) recibe los sentidos en spikes por segundo y devuelve qué
       tan fuerte disparan las neuronas que mandan cada conducta: escape (fibra gigante), reversa (MDN),
       adelante (P9), giro (DNa01/02), acicalarse (DNg12), comer (MN9), volar (DNg02).
     · ESTE ARCHIVO traduce el mundo a sentidos (qué tanto crece algo en el ojo, cuánto olor llega a cada
       antena…) y las tasas a movimiento. Esa traducción es nuestra y está aquí, a la vista.
     · Lo que NO sale del conectoma: el paseo de fondo cuando no pasa nada (una caminata al azar) y la
       física del vuelo. Está marcado como «explorando» para que no se confunda con una decisión.
*/
import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { cargarCuerpo, crearMosca } from './cuerpo.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const R_ARENA = 3;                // cm
const COLORES = ['#ff7a59', '#59c3ff', '#c48bff'];
const NOMBRES = ['Mosca 1', 'Mosca 2', 'Mosca 3'];
const CONDUCTAS = { escape: 'Escape', atras: 'Reversa', adelante: 'Adelante', giro: 'Giro', acicalar: 'Acicalarse', comer: 'Comer', volar: 'Alas' };

// ───────────────────────── escena ─────────────────────────
const contenedor = $('#escena');
const render = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
render.setPixelRatio(Math.min(devicePixelRatio, 2));
render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
render.toneMapping = THREE.ACESFilmicToneMapping; render.outputColorSpace = THREE.SRGBColorSpace;
contenedor.append(render.domElement);
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x07090c);
escena.fog = new THREE.Fog(0x07090c, 14, 30);
const camara = new THREE.PerspectiveCamera(42, 1, 0.01, 200);
camara.position.set(0, 6.2, 7.4);
const controles = new OrbitControls(camara, render.domElement);
controles.target.set(0, 0, 0); controles.enableDamping = true; controles.maxPolarAngle = Math.PI * 0.49;
controles.minDistance = 0.4; controles.maxDistance = 18;

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a1d12, 1.2); escena.add(hemi);
const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(3, 8, 4); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
escena.add(sol);

// el piso de la arena: papel filtro (lo que se usa en el laboratorio)
const piso = new THREE.Mesh(new THREE.CircleGeometry(R_ARENA, 96), new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.95 }));
piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; escena.add(piso);
const mesa = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 1 }));
mesa.rotation.x = -Math.PI / 2; mesa.position.y = -0.01; mesa.receiveShadow = true; escena.add(mesa);

// la pared es una pantalla (un lienzo que se pinta cada cuadro)
const pantallaLienzo = document.createElement('canvas'); pantallaLienzo.width = 1024; pantallaLienzo.height = 192;
const pctx = pantallaLienzo.getContext('2d');
const pantallaTex = new THREE.CanvasTexture(pantallaLienzo); pantallaTex.colorSpace = THREE.SRGBColorSpace;
pantallaTex.wrapS = THREE.RepeatWrapping;
const pared = new THREE.Mesh(new THREE.CylinderGeometry(R_ARENA, R_ARENA, 1.4, 128, 1, true),
  new THREE.MeshBasicMaterial({ map: pantallaTex, side: THREE.BackSide, toneMapped: false }));
pared.position.y = 0.7; escena.add(pared);
const borde = new THREE.Mesh(new THREE.TorusGeometry(R_ARENA, 0.03, 8, 128), new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.6, roughness: 0.3 }));
borde.rotation.x = Math.PI / 2; borde.position.y = 1.4; escena.add(borde);

function ajustar() {
  const w = innerWidth, h = innerHeight;
  render.setSize(w, h); camara.aspect = w / h;
  // en el teléfono la hoja tapa la mitad de abajo: la arena se corre hacia arriba para que se vea entera
  const hoja = document.querySelector('#hoja');
  const tapa = hoja && w < 900 && !hoja.classList.contains('cerrada') ? hoja.getBoundingClientRect().height : 0;
  if (tapa) camara.setViewOffset(w, h, 0, tapa * 0.5, w, h); else camara.clearViewOffset();
  camara.updateProjectionMatrix();
}
addEventListener('resize', ajustar); ajustar();

// ───────────────────────── estado del mundo ─────────────────────────
const mundo = {
  t: 0,                         // s de mundo (siguen al reloj del cerebro)
  temp: 25, viento: 0, humedad: 55, luz: 0.7, luzAntes: 0.7,
  gotas: [],                    // { tipo, x, z, r, malla }
  olores: [],                   // { tipo, x, z, fuerza, malla }
  ruido: 0, polvo: 0, sacudida: 0, destello: 0,
  depredadores: [],             // { tipo, obj, pos, rho, fase, ... }
  pantalla: { modo: 'nada', imagen: null, video: null, t0: 0 },
};
const bitacora = [];
function anotar(texto, clase = '') {
  bitacora.unshift({ t: mundo.t, texto, clase });
  if (bitacora.length > 200) bitacora.pop();
  pintarBitacora();
}

// ───────────────────────── moscas ─────────────────────────
const moscas = [];
let plano = null;
async function crearMoscas() {
  plano = await cargarCuerpo('modelo/');
  for (let k = 0; k < 3; k++) {
    const cuerpo = crearMosca(plano);
    cuerpo.raiz.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const anillo = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.3, 48), new THREE.MeshBasicMaterial({ color: COLORES[k], transparent: true, opacity: 0.85 }));
    anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.003;
    escena.add(cuerpo.raiz); escena.add(anillo);
    const ang = k * 2.1 + 0.4;
    const m = {
      k, cuerpo, anillo, x: Math.cos(ang) * 1.2, z: Math.sin(ang) * 1.2, y: 0, rumbo: Math.random() * 6.28,
      vel: 0, modo: 'explorar', hasta: 0, fase: Math.random() * 6, vuelo: null, tasas: {}, motivo: '',
      sentidos: {}, objetos: new Map(), amenazaDesde: null, amenazaDir: null, atrapada: 0,
      lesiones: new Set(), stats: { escapes: 0, capturas: 0, comiendo: 0, acicalando: 0, latencias: [] },
      paseo: { vel: 0.4, hasta: 0, giro: 0 },
      etiqueta: Object.assign(document.createElement('div'), { className: 'etiqueta' }),
    };
    m.etiqueta.innerHTML = `<i style="background:${COLORES[k]}"></i>${NOMBRES[k]}`;
    document.body.append(m.etiqueta);
    moscas.push(m);
  }
}

// ───────────────────────── los trabajadores con los cerebros ─────────────────────────
// Si la página está aislada (cabeceras COOP/COEP), un trabajador por mosca en paralelo compartiendo el
// conectoma; si no, uno solo con las tres. Ver trabajador.js.
const PARALELO = self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';
const BASE = new URL('./', location.href).href;
const trabajadores = [];          // { w, moscas, t, listo }
const dueno = [];                 // mosca → trabajador
let cerebroListo = false, tCerebro = 0, tCerebroPintado = 0, velocidad = 0, pausado = false;
let ultimoMapa = null, mapaMosca = 0, info = null;
function nuevoTrabajador(moscasDe) {
  const w = new Worker(new URL('./trabajador.js', import.meta.url), { type: 'module' });
  const reg = { w, moscas: moscasDe, t: 0, listo: false, vel: 1 };
  for (const k of moscasDe) dueno[k] = reg;
  w.onmessage = (e) => alRecibir(reg, e.data);
  w.onerror = (e) => { $('#cargaTexto').textContent = 'No se pudo arrancar el cerebro: ' + (e.message || 'error'); };
  trabajadores.push(reg);
  return reg;
}
const aTodos = (m) => trabajadores.forEach((r) => r.w.postMessage(m));
const aDueno = (k, m) => dueno[k]?.w.postMessage(m);
function alRecibir(reg, m) {
  if (m.tipo === 'progreso') {
    if (m.etapa === 'bajando') {
      const mb = m.bajado / 1e6; $('#cargaBarra').style.width = Math.min(100, mb / 31.4 * 90) + '%';
      $('#cargaTexto').textContent = `bajando el cerebro… ${mb.toFixed(1)} de 31.4 MB`;
    } else if (m.etapa === 'descomprimiendo') $('#cargaTexto').textContent = 'descomprimiendo 15 millones de conexiones…';
    else if (m.etapa === 'armando') { $('#cargaBarra').style.width = '96%'; $('#cargaTexto').textContent = 'armando tres cerebros…'; }
    else if (m.etapa === 'instintos') $('#instintosAvance').textContent = `probando sentido ${m.hecho} de ${m.de}…`;
  } else if (m.tipo === 'red') {
    // el primer trabajador ya armó el conectoma en memoria compartida: los otros dos lo usan tal cual
    for (const k of [1, 2]) nuevoTrabajador([k]).w.postMessage({ tipo: 'red', red: m.red, indice: m.indice, moscas: [k] });
  } else if (m.tipo === 'listo') {
    reg.listo = true; info = m;
    if (trabajadores.length === (PARALELO ? 3 : 1) && trabajadores.every((r) => r.listo)) {
      cerebroListo = true; $('#cargaBarra').style.width = '100%';
      setTimeout(() => $('#carga')?.remove(), 300);
      anotar(`Tres cerebros despiertos: ${m.neuronas.toLocaleString('es-MX')} neuronas y ${m.conexiones.toLocaleString('es-MX')} conexiones cada uno${PARALELO ? ', cada uno en su propio núcleo' : ''}.`);
    }
  } else if (m.tipo === 'estado') {
    reg.t = m.t / 1000; reg.vel = m.velocidad;
    tCerebro = Math.min(...trabajadores.map((r) => r.t));           // el mundo va al paso del más lento
    velocidad = Math.min(...trabajadores.map((r) => r.vel));
    for (const [k, d] of Object.entries(m.moscas)) if (moscas[k]) { moscas[k].tasas = d.tasas; moscas[k].activas = d.activas; moscas[k].spikes = d.spikes; }
  } else if (m.tipo === 'mapa') { ultimoMapa = m.m; mapaMosca = m.mosca; pintarMapa(); }
  else if (m.tipo === 'instintos') pintarInstintos(m.filas);
  else if (m.tipo === 'error') { $('#cargaTexto').textContent = 'No se pudo: ' + m.mensaje; anotar('Error del cerebro: ' + m.mensaje, 'mal'); }
}
nuevoTrabajador(PARALELO ? [0] : [0, 1, 2]).w.postMessage({ tipo: 'iniciar', base: BASE, moscas: PARALELO ? [0] : [0, 1, 2], compartir: PARALELO });

// ───────────────────────── modelos de los depredadores ─────────────────────────
const gltf = new GLTFLoader();
const modelos = {};
function cargarGLB(nombre, url) { return new Promise((res) => gltf.load(url, (g) => res((modelos[nombre] = g.scene)), undefined, () => res(null))); }
async function cargarArana() {
  const txt = await (await fetch('depredadores/arana.obj')).text();
  const v = [], idx = [];
  let objeto = '';
  for (const l of txt.split('\n')) {
    const p = l.trim().split(/\s+/);
    if (p[0] === 'o') objeto = p[1];
    if (p[0] === 'v') v.push(+p[1], +p[2], +p[3]);
    // el .obj trae un piso de 4 vértices («Plane») que salía como un cuadro negro: fuera
    else if (p[0] === 'f' && objeto !== 'Plane') { const f = p.slice(1).map((s) => parseInt(s) - 1); for (let i = 1; i < f.length - 1; i++) idx.push(f[0], f[i], f[i + 1]); }
  }
  // sólo los vértices que usa la araña (el piso quedaba en la geometría y la hacía medir 7 cm)
  const mapa = new Map(), v2 = [];
  const idx2 = idx.map((i) => { if (!mapa.has(i)) { mapa.set(i, v2.length / 3); v2.push(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]); } return mapa.get(i); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v2, 3)); g.setIndex(idx2);
  g.computeVertexNormals(); g.computeBoundingBox();
  const b = g.boundingBox;
  const malla = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1b1612, roughness: 0.6, flatShading: true, side: THREE.DoubleSide }));
  malla.castShadow = true;
  const tam = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
  const s = 1.3 / tam; malla.scale.setScalar(s); malla.position.y = -b.min.y * s;
  const o = new THREE.Group(); o.add(malla); modelos.arana = o; return o;
}
const modelosListos = Promise.all([cargarArana(), cargarGLB('pajaro', 'depredadores/pajaro.glb'), cargarGLB('gato', 'depredadores/gato.glb')]);

// ───────────────────────── estímulos ─────────────────────────
const TIPOS_GOTA = { azucar: 0xf5c04a, amargo: 0x9bd26a, agua: 0x8fd3ff, sal: 0xffffff };
function puntoLibre(lejos = 0.6) {
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (R_ARENA - 0.6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (moscas.every((m) => Math.hypot(m.x - x, m.z - z) > lejos)) return { x, z };
  }
  return { x: 0, z: 0 };
}
function ponerGota(tipo, donde) {
  const p = donde || puntoLibre();
  const malla = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: TIPOS_GOTA[tipo], transmission: 0.6, roughness: 0.05, thickness: 0.2, transparent: true, opacity: 0.9 }));
  malla.scale.y = 0.35; malla.position.set(p.x, 0, p.z); escena.add(malla);
  mundo.gotas.push({ tipo, x: p.x, z: p.z, r: 0.28, malla });
  anotar(`Gota de ${{ azucar: 'azúcar', amargo: 'amargo', agua: 'agua', sal: 'sal' }[tipo]} en el piso.`);
}
const COLOR_OLOR = { vinagre: 0xb04a6a, moho: 0x6f7d4a, co2: 0xbfc8d6, feromona: 0xa67bff };
function ponerOlor(tipo, donde) {
  const p = donde || puntoLibre();
  const grupo = new THREE.Group(); grupo.position.set(p.x, 0, p.z);
  const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.25, 24), new THREE.MeshStandardMaterial({ color: COLOR_OLOR[tipo], roughness: 0.4 }));
  vaso.position.y = 0.125; vaso.castShadow = true; grupo.add(vaso);
  const nube = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: COLOR_OLOR[tipo], transparent: true, opacity: 0.07, depthWrite: false }));
  nube.scale.set(1.3, 0.3, 1.3); nube.position.y = 0.15; grupo.add(nube);
  escena.add(grupo);
  mundo.olores.push({ tipo, x: p.x, z: p.z, fuerza: 1, malla: grupo });
  anotar(`Olor a ${{ vinagre: 'vinagre', moho: 'moho', co2: 'CO₂', feromona: 'feromona' }[tipo]}.`);
}
function quitar(lista) { for (const o of lista) escena.remove(o.malla || o.obj); lista.length = 0; }

async function soltarDepredador(tipo) {
  await modelosListos;
  const vivos = moscas.filter((m) => !m.atrapada);
  const presa = vivos.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0] || moscas[0];
  const a = Math.atan2(presa.z, presa.x) + Math.PI + (Math.random() - 0.5);
  const d = { tipo, presa: presa.k, t0: mundo.t, pos: new THREE.Vector3(), rho: 0.5, obj: new THREE.Group(), vida: 12 };
  if (tipo === 'arana') {
    d.obj.add(modelos.arana.clone()); d.pos.set(Math.cos(a) * (R_ARENA - 0.3), 0.25, Math.sin(a) * (R_ARENA - 0.3)); d.rho = 0.6; d.vida = 25;
    anotar('Entró una araña a la arena.', 'peligro');
  } else if (tipo === 'pajaro') {
    const p = modelos.pajaro.clone(); p.scale.setScalar(2.2); d.obj.add(p);
    d.pos.set(Math.cos(a) * 9, 9, Math.sin(a) * 9); d.rho = 1.4; d.vida = 5; d.desde = d.pos.clone();
    anotar('Un pájaro viene en picada.', 'peligro');
  } else if (tipo === 'sombra') {
    const disco = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide }));
    disco.rotation.x = Math.PI / 2; d.obj.add(disco);
    d.pos.set(presa.x, 12, presa.z); d.rho = 1; d.vida = 3;
    anotar('Una sombra cae sobre la arena.', 'peligro');
  } else if (tipo === 'gato') {
    const g = modelos.gato.clone(); g.scale.setScalar(4.5); d.obj.add(g);
    d.pos.set(Math.cos(a) * 9, 0, Math.sin(a) * 9); d.rho = 2; d.vida = 4; d.desde = d.pos.clone();
    anotar('Se asomó un gato.', 'peligro');
  }
  d.obj.position.copy(d.pos); escena.add(d.obj);
  mundo.depredadores.push(d);
}

function moverDepredadores(dt) {
  for (const d of [...mundo.depredadores]) {
    const s = mundo.t - d.t0;
    const presa = moscas[d.presa];
    if (d.tipo === 'arana') {
      // va tras la mosca viva más cercana, a pasitos
      for (const m of moscas) m.objDist = Math.hypot(m.x - d.pos.x, m.z - d.pos.z);
      const objetivo = moscas.filter((m) => !m.atrapada && m.y < 0.05).sort((a, b) => a.objDist - b.objDist)[0];
      if (objetivo) {
        const dx = objetivo.x - d.pos.x, dz = objetivo.z - d.pos.z, dist = Math.hypot(dx, dz);
        const paso = (Math.sin(s * 3) > -0.3 ? 1.6 : 0.1) * dt;
        d.pos.x += dx / dist * paso; d.pos.z += dz / dist * paso;
        d.obj.rotation.y = Math.atan2(-dz, dx) - Math.PI / 2;
        if (dist < 0.32) {
          objetivo.atrapada = 3.5; objetivo.stats.capturas++; d.vida = 0;
          anotar(`La araña atrapó a la ${NOMBRES[objetivo.k]}.`, 'peligro');
        }
      }
    } else if (d.tipo === 'pajaro') {
      const u = Math.min(1, s / 1.6);
      const objetivo = new THREE.Vector3(presa.x, 0.4, presa.z);
      if (u < 1) d.pos.lerpVectors(d.desde, objetivo, u * u);
      else d.pos.y += 9 * dt;
      d.obj.lookAt(objetivo.x, d.pos.y - 1, objetivo.z);
      if (u > 0.98 && !d.golpe) { d.golpe = true; if (!presa.vuelo && Math.hypot(presa.x - d.pos.x, presa.z - d.pos.z) < 0.5) { presa.atrapada = 3.5; presa.stats.capturas++; anotar(`El pájaro atrapó a la ${NOMBRES[presa.k]}.`, 'peligro'); } }
    } else if (d.tipo === 'sombra') {
      const u = Math.min(1, s / 1.4);
      d.pos.y = 12 - 11.2 * u * u * u;   // acelera: crece cada vez más rápido en el ojo
    } else if (d.tipo === 'gato') {
      const u = Math.min(1, s / 1.2);
      const objetivo = new THREE.Vector3(presa.x * 0.6, 0, presa.z * 0.6);
      d.pos.lerpVectors(d.desde, objetivo, u < 0.7 ? u / 0.7 : 1 - (u - 0.7) / 0.3 * 0.6);
      d.obj.lookAt(presa.x, 0, presa.z);
    }
    d.obj.position.copy(d.pos);
    if (s > d.vida) { escena.remove(d.obj); mundo.depredadores.splice(mundo.depredadores.indexOf(d), 1); }
  }
}

// ───────────────────────── la pantalla de la pared ─────────────────────────
const analisis = document.createElement('canvas'); analisis.width = 64; analisis.height = 8;
const actx = analisis.getContext('2d', { willReadFrequently: true });
let previo = null; const visPantalla = { lum: 0, mov: new Float32Array(64), crece: 0 };
function pintarPantalla() {
  const P = mundo.pantalla, W = pantallaLienzo.width, H = pantallaLienzo.height, s = mundo.t - P.t0;
  pctx.fillStyle = '#20242b'; pctx.fillRect(0, 0, W, H);
  if (P.modo === 'rayas') {
    pctx.fillStyle = '#e6e6e6'; pctx.fillRect(0, 0, W, H); pctx.fillStyle = '#111';
    const off = (s * 120) % 64; for (let x = -64; x < W; x += 64) pctx.fillRect(x + off, 0, 32, H);
  } else if (P.modo === 'circulo') {
    pctx.fillStyle = '#e6e6e6'; pctx.fillRect(0, 0, W, H);
    const r = ((s % 3) / 3) ** 3 * H * 1.6; pctx.fillStyle = '#000';
    for (const cx of [W * 0.125, W * 0.375, W * 0.625, W * 0.875]) { pctx.beginPath(); pctx.arc(cx, H / 2, r, 0, 7); pctx.fill(); }
  } else if (P.modo === 'parpadeo') {
    pctx.fillStyle = Math.floor(s * 4) % 2 ? '#fafafa' : '#050505'; pctx.fillRect(0, 0, W, H);
  } else if (P.modo === 'imagen' && P.imagen) {
    const r = H / P.imagen.height, w = P.imagen.width * r;
    for (let x = 0; x < W; x += w) pctx.drawImage(P.imagen, x, 0, w, H);
  } else if (P.modo === 'video' && P.video && P.video.readyState >= 2) {
    const r = H / P.video.videoHeight, w = P.video.videoWidth * r;
    for (let x = 0; x < W; x += w) pctx.drawImage(P.video, x, 0, w, H);
  }
  pantallaTex.needsUpdate = true;
  // lo que «ve» una mosca de la pared: brillo, movimiento por columna y si algo oscuro crece
  actx.drawImage(pantallaLienzo, 0, 0, 64, 8);
  const d = actx.getImageData(0, 0, 64, 8).data;
  let lum = 0; const col = new Float32Array(64), oscuro = { n: 0 };
  for (let x = 0; x < 64; x++) for (let y = 0; y < 8; y++) {
    const i = (y * 64 + x) * 4, l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    lum += l; col[x] += l / 8; if (l < 0.15) oscuro.n++;
  }
  lum /= 512;
  if (previo) {
    for (let x = 0; x < 64; x++) visPantalla.mov[x] = visPantalla.mov[x] * 0.6 + Math.abs(col[x] - previo.col[x]) * 0.4 * 30;
    visPantalla.crece = visPantalla.crece * 0.7 + Math.max(0, oscuro.n - previo.oscuro) / 512 * 0.3 * 60;
  }
  visPantalla.lum = lum; previo = { col, oscuro: oscuro.n };
}

// ───────────────────────── sentidos: del mundo a spikes por segundo ─────────────────────────
const limitar = (v, a = 0, b = 150) => Math.max(a, Math.min(b, v));
function adelanteDe(m) { return new THREE.Vector3(Math.cos(m.rumbo), 0, -Math.sin(m.rumbo)); }
function izquierdaDe(m) { return new THREE.Vector3(-Math.sin(m.rumbo), 0, -Math.cos(m.rumbo)); }
function lado(m, x, z) { const l = izquierdaDe(m); return (x - m.x) * l.x + (z - m.z) * l.z >= 0 ? 'izq' : 'der'; }

function sentir(m, dt) {
  const S = {}; const sumar = (n, l, hz) => { S[n] = S[n] || { izq: 0, der: 0 }; if (l === 'ambos') { S[n].izq = Math.max(S[n].izq, hz); S[n].der = Math.max(S[n].der, hz); } else S[n][l] = Math.max(S[n][l], hz); };
  if (m.atrapada) return S;
  const ojo = new THREE.Vector3(m.x, m.y + 0.1, m.z);
  // VISTA · todo lo que tiene tamaño: depredadores y las otras moscas
  const cosas = mundo.depredadores.map((d) => ({ id: 'd' + d.t0, pos: d.pos, rho: d.rho, quien: d.tipo }))
    .concat(moscas.filter((o) => o !== m && !o.atrapada).map((o) => ({ id: 'm' + o.k, pos: new THREE.Vector3(o.x, o.y + 0.05, o.z), rho: 0.15, quien: 'mosca' })));
  let peor = null;
  for (const c of cosas) {
    const dist = Math.max(0.05, c.pos.distanceTo(ojo));
    const alfa = 2 * Math.atan(c.rho / dist);
    const rumbo = Math.atan2(c.pos.z - m.z, c.pos.x - m.x);
    const antes = m.objetos.get(c.id);
    m.objetos.set(c.id, { alfa, rumbo });
    if (!antes || dt <= 0) continue;
    const crece = (alfa - antes.alfa) / dt;                         // rad/s: lo que mide LC4 / LPLC2
    const giro = Math.abs(Math.atan2(Math.sin(rumbo - antes.rumbo), Math.cos(rumbo - antes.rumbo))) / dt;
    const l = c.pos.y > ojo.y + 1 ? 'ambos' : lado(m, c.pos.x, c.pos.z);
    // otra mosca es chiquita: sólo asusta si se viene encima de verdad (si no, se la pasaban despegando)
    const umbral = c.quien === 'mosca' ? 0.5 : 0.15, ganancia = c.quien === 'mosca' ? 45 : 90;
    if (crece > umbral && alfa > (c.quien === 'mosca' ? 0.12 : 0.04)) {
      const hz = limitar(crece * ganancia);
      sumar('acercamiento', l, hz);
      if (!peor || hz > peor.hz) peor = { hz, c };
    }
    if (alfa < 0.35 && giro > 0.3) sumar('objeto_chico', l, limitar(giro * 25, 0, 100));
  }
  if (peor && peor.hz > 30) {
    if (!m.amenazaDesde) m.amenazaDesde = mundo.t;
    m.amenazaDir = new THREE.Vector3(peor.c.pos.x - m.x, 0, peor.c.pos.z - m.z).normalize(); m.amenazaQuien = peor.c.quien;
  } else if (!peor) m.amenazaDesde = null;
  // la pared-pantalla: movimiento por mitad del campo visual y lo oscuro que crece
  let movI = 0, movD = 0;
  for (let x = 0; x < 64; x++) {
    const a = x / 64 * Math.PI * 2;                                   // dónde está esa columna en la pared
    const px = Math.cos(-a) * R_ARENA, pz = Math.sin(-a) * R_ARENA;
    if (lado(m, px, pz) === 'izq') movI += visPantalla.mov[x]; else movD += visPantalla.mov[x];
  }
  if (movI > 0.2) sumar('movimiento', 'izq', limitar(movI * 6, 0, 120));
  if (movD > 0.2) sumar('movimiento', 'der', limitar(movD * 6, 0, 120));
  if (visPantalla.crece > 0.05) sumar('acercamiento', 'ambos', limitar(visPantalla.crece * 200));
  // LUZ · los ocelos responden a los cambios (prender, apagar, destellos)
  const brillo = mundo.luz * (0.5 + 0.5 * visPantalla.lum) + mundo.destello;
  const cambio = Math.abs(brillo - (m.brilloAntes ?? brillo)) / Math.max(dt, 1e-3);
  m.brilloAntes = brillo;
  if (cambio > 0.3) sumar('luz', 'ambos', limitar(cambio * 40));
  // OLFATO · cuánto llega a cada antena
  const ant = adelanteDe(m), izq = izquierdaDe(m);
  for (const o of mundo.olores.concat(mundo.gotas.filter((g) => g.olor).map((g) => ({ tipo: g.olor, x: g.x, z: g.z, fuerza: 0.8 })))) {
    for (const l of ['izq', 'der']) {
      const s = l === 'izq' ? 1 : -1;
      const ax = m.x + ant.x * 0.12 + izq.x * 0.05 * s, az = m.z + ant.z * 0.12 + izq.z * 0.05 * s;
      // el viento lleva el olor: más concentración río abajo
      const d2 = (ax - o.x) ** 2 + (az - o.z) ** 2;
      const c = o.fuerza * Math.exp(-d2 / (2 * 1.1 * 1.1));
      if (c > 0.05) sumar(o.tipo, l, limitar(c * 140));
    }
  }
  // GUSTO · las patas sobre la gota
  for (const g of mundo.gotas) {
    if (Math.hypot(m.x - g.x, m.z - g.z) < g.r && m.y < 0.05) {
      if (g.tipo === 'azucar' || g.tipo === 'fruta') sumar('azucar', 'ambos', 150);
      if (g.tipo === 'fruta') sumar('agua', 'ambos', 80);
      if (g.tipo === 'amargo') sumar('amargo', 'ambos', 150);
      if (g.tipo === 'agua') sumar('agua', 'ambos', 150);
      if (g.tipo === 'sal') sumar('sal', 'ambos', 150);
      m.sobre = g;
    }
  }
  // MECÁNICO
  if (mundo.viento > 0) sumar('viento', 'ambos', limitar(mundo.viento * 130));
  if (mundo.ruido > 0) sumar('sonido', 'ambos', 130);
  if (mundo.sacudida > 0) { sumar('tacto', 'ambos', 130); sumar('sonido', 'ambos', 90); }
  if (mundo.polvo > 0) { sumar('polvo_ojos', 'ambos', 120); sumar('tacto', 'ambos', 80); }
  for (const o of moscas) if (o !== m && !o.atrapada && Math.hypot(o.x - m.x, o.z - m.z) < 0.22 && Math.abs(o.y - m.y) < 0.1) sumar('tacto', lado(m, o.x, o.z), 90);
  for (const d of mundo.depredadores) if (d.tipo === 'pajaro' && d.pos.distanceTo(ojo) < 3) sumar('viento', 'ambos', 140);   // el aire de las alas
  // TEMPERATURA Y HUMEDAD
  if (mundo.temp > 27) sumar('calor', 'ambos', limitar((mundo.temp - 27) * 14));
  if (mundo.temp < 20) sumar('frio', 'ambos', limitar((20 - mundo.temp) * 14));
  if (mundo.humedad < 40) sumar('seco', 'ambos', limitar((40 - mundo.humedad) * 3.5));
  if (mundo.humedad > 70) sumar('humedo', 'ambos', limitar((mundo.humedad - 70) * 4.5));
  return S;
}

// ───────────────────────── conducta: de las tasas al movimiento ─────────────────────────
const tasa = (m, n, l = 'todos') => m.tasas?.[`${n}:${l}`] || 0;
function decidir(m, dt) {
  if (m.atrapada) {
    m.atrapada -= dt; m.modo = 'atrapada'; m.motivo = 'la atraparon';
    if (m.atrapada <= 0) { m.atrapada = 0; const p = puntoLibre(1); m.x = p.x; m.z = p.z; m.y = 0; m.modo = 'explorar'; anotar(`La ${NOMBRES[m.k]} volvió a la arena (una nueva).`); }
    return;
  }
  const esc = tasa(m, 'escape'), comer = tasa(m, 'comer'), aci = tasa(m, 'acicalar'), atras = tasa(m, 'atras');
  const adelante = tasa(m, 'adelante'), gi = tasa(m, 'giro', 'izq'), gd = tasa(m, 'giro', 'der'), alas = tasa(m, 'volar');
  // 1 · escapar manda sobre todo (la fibra gigante es un atajo directo a las patas de salto)
  if (!m.vuelo && esc > 25 && !m.lesiones.has('escape')) {
    const lejos = m.amenazaDir ? m.amenazaDir.clone().multiplyScalar(-1) : adelanteDe(m).multiplyScalar(-1);
    lejos.add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6)).normalize();
    m.vuelo = { t: 0, dur: 0.9 + Math.random() * 0.8, dir: lejos, alto: 0.8 + Math.random() * 0.8 };
    m.rumbo = Math.atan2(-lejos.z, lejos.x);
    m.stats.escapes++;
    const lat = m.amenazaDesde != null ? Math.round((mundo.t - m.amenazaDesde) * 1000) : null;
    if (lat != null) m.stats.latencias.push(lat);
    anotar(`La ${NOMBRES[m.k]} despegó${m.amenazaQuien ? ` huyendo de ${{ arana: 'la araña', pajaro: 'el pájaro', sombra: 'la sombra', gato: 'el gato', mosca: 'otra mosca' }[m.amenazaQuien] || 'algo'}` : ''} — fibra gigante a ${esc.toFixed(0)} Hz${lat != null ? `, ${lat} ms después de verlo venir` : ''}.`, 'peligro');
    m.amenazaDesde = null;
  }
  if (m.vuelo) {
    const v = m.vuelo; v.t += dt; const u = v.t / v.dur;
    m.x += v.dir.x * 4.5 * dt; m.z += v.dir.z * 4.5 * dt; m.y = Math.sin(Math.min(1, u) * Math.PI) * v.alto;
    m.modo = 'volar'; m.motivo = `fibra gigante ${esc.toFixed(0)} Hz`;
    if (u >= 1) { m.vuelo = null; m.y = 0; }
    rebotar(m); return;
  }
  // 2 · lo demás compite; gana la más fuerte
  const opciones = [
    { modo: 'comer', fuerza: m.sobre && !m.lesiones.has('comer') ? comer / 4 : 0, motivo: `MN9 ${comer.toFixed(0)} Hz` },
    { modo: 'acicalar', fuerza: m.lesiones.has('acicalar') ? 0 : aci / 1.5, motivo: `DNg12 ${aci.toFixed(1)} Hz` },
    { modo: 'reversa', fuerza: m.lesiones.has('atras') ? 0 : atras / 4, motivo: `MDN ${atras.toFixed(0)} Hz` },
  ].sort((a, b) => b.fuerza - a.fuerza);
  const gana = opciones[0];
  m.sobre = null;
  if (gana.fuerza >= 1) { m.modo = gana.modo; m.motivo = gana.motivo; }
  else m.modo = 'explorar';
  // velocidad y giro
  let vel = 0, giro = 0;
  if (m.modo === 'reversa') vel = -0.9;
  else if (m.modo === 'explorar') {
    // EL PASEO NO SALE DEL CONECTOMA: el modelo no tiene actividad propia. Es una caminata al azar.
    const p = m.paseo;
    if (mundo.t > p.hasta) { p.vel = Math.random() < 0.3 ? 0 : 0.3 + Math.random() * 0.5; p.giro = (Math.random() - 0.5) * 1.5; p.hasta = mundo.t + 0.8 + Math.random() * 2.5; }
    vel = p.vel; giro = p.giro;
    m.motivo = adelante > 3 ? `P9 ${adelante.toFixed(0)} Hz` : (gi + gd > 3 ? `DNa ${gi.toFixed(0)}/${gd.toFixed(0)} Hz` : 'explorando (no sale del conectoma)');
  }
  vel += limitar(adelante / 20, 0, 1.5);
  giro += limitar((gi - gd) / 10, -4, 4);          // DNa02 manda girar hacia su lado
  m.alas = alas;
  m.vel += (vel - m.vel) * Math.min(1, dt * 6);
  m.rumbo += giro * dt;
  const f = adelanteDe(m); m.x += f.x * m.vel * dt; m.z += f.z * m.vel * dt;
  if (m.modo === 'comer') m.stats.comiendo += dt;
  if (m.modo === 'acicalar') m.stats.acicalando += dt;
  rebotar(m);
}
function rebotar(m) {
  const r = Math.hypot(m.x, m.z), max = R_ARENA - 0.25;
  if (r > max) { m.x *= max / r; m.z *= max / r; const n = Math.atan2(-m.z, m.x); m.rumbo = n + Math.PI + (Math.random() - 0.5); }
  for (const o of moscas) if (o !== m) {
    const dx = m.x - o.x, dz = m.z - o.z, d = Math.hypot(dx, dz);
    if (d < 0.2 && d > 0 && Math.abs(m.y - o.y) < 0.1) { m.x += dx / d * (0.2 - d) / 2; m.z += dz / d * (0.2 - d) / 2; }
  }
}

// ───────────────────────── animación del cuerpo ─────────────────────────
const PATAS = ['T1', 'T2', 'T3'];
function animar(m, dt, tReal) {
  const c = m.cuerpo;
  c.raiz.visible = !m.atrapada;
  m.anillo.visible = !m.atrapada;
  c.raiz.position.set(m.x, m.y + 0.11, m.z);
  c.raiz.rotation.y = m.rumbo;
  m.anillo.position.set(m.x, 0.003, m.z);
  const camina = Math.abs(m.vel) > 0.05 && !m.vuelo;
  m.fase += dt * (camina ? Math.abs(m.vel) * 28 : 0);
  for (const p of PATAS) for (const s of ['left', 'right']) {
    const tripode = (p === 'T2') === (s === 'left') ? 0 : Math.PI;
    const ph = m.fase + tripode;
    const amp = camina ? 0.35 : 0;
    c.poner(`coxa_${p}_${s}`, Math.sin(ph) * amp * (m.vel < 0 ? -1 : 1));
    c.poner(`femur_${p}_${s}`, Math.max(0, Math.cos(ph)) * amp * 0.8);
    c.poner(`tibia_${p}_${s}`, 0);
  }
  // acicalarse: las patas de adelante se frotan sobre la cabeza
  if (m.modo === 'acicalar') {
    const fr = Math.sin(tReal * 18) * 0.25;
    for (const s of ['left', 'right']) { c.poner(`coxa_T1_${s}`, -0.2 + fr); c.poner(`femur_T1_${s}`, 1.6); c.poner(`tibia_T1_${s}`, 1.1 + fr); }
    c.poner('head', -0.25);
  } else c.poner('head', 0);
  // comer: la trompa se estira
  const trompa = m.modo === 'comer' ? 1 : 0;
  c.poner('rostrum', -1.2 * trompa); c.poner('haustellum', -1.0 * trompa);
  // alas: plegadas al caminar, aleteo en vuelo (y un temblor con DNg02)
  if (m.vuelo) {
    const a = Math.sin(tReal * 140);
    for (const s of ['left', 'right']) { c.poner(`wing_yaw_${s}`, -1.4); c.poner(`wing_roll_${s}`, a * 0.9); c.poner(`wing_pitch_${s}`, 0.6 + a * 0.4); }
  } else {
    const temblor = limitar(m.alas || 0, 0, 30) / 30 * Math.sin(tReal * 60) * 0.3;
    for (const s of ['left', 'right']) { c.poner(`wing_yaw_${s}`, temblor); c.poner(`wing_roll_${s}`, 0); c.poner(`wing_pitch_${s}`, 0); }
  }
  c.actualizar();
}

// ───────────────────────── bucle principal ─────────────────────────
let antes = performance.now(), ultimoEnvio = 0, seguir = null;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  const tReal = ahora / 1000; const dtReal = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
  // el mundo avanza al paso del cerebro: si el cerebro va lento, el mundo va en cámara lenta
  let dt = 0;
  if (cerebroListo && !pausado) { dt = Math.min(0.1, Math.max(0, tCerebro - tCerebroPintado)); tCerebroPintado += dt; }
  mundo.t += dt;
  if (dt > 0) {
    mundo.destello = Math.max(0, mundo.destello - dt * 4);
    for (const k of ['ruido', 'polvo', 'sacudida']) mundo[k] = Math.max(0, mundo[k] - dt);
    pintarPantalla();
    moverDepredadores(dt);
    for (const m of moscas) { m.sentidos = sentir(m, dt); decidir(m, dt); }
    if (ahora - ultimoEnvio > 40) {
      ultimoEnvio = ahora;
      moscas.forEach((m, k) => {
        const s = {}; for (const [n, v] of Object.entries(m.sentidos)) s[n] = v;
        if (m.atrapada) for (const n of Object.keys(s)) delete s[n];
        aDueno(k, { tipo: 'sentidos', mosca: k, s });
      });
    }
  }
  for (const m of moscas) animar(m, dt, tReal);
  if (mundo.pantalla.modo === 'video' || mundo.pantalla.modo === 'imagen') pintarPantalla();
  if (seguir != null) { const m = moscas[seguir]; controles.target.lerp(new THREE.Vector3(m.x, m.y, m.z), Math.min(1, dtReal * 4)); }
  controles.update();
  render.render(escena, camara);
  // etiquetas encima de cada mosca
  for (const m of moscas) {
    const p = new THREE.Vector3(m.x, m.y + 0.4, m.z).project(camara);
    const vis = p.z < 1 && !m.atrapada;
    m.etiqueta.style.display = vis ? '' : 'none';
    if (vis) m.etiqueta.style.transform = `translate(${(p.x + 1) / 2 * innerWidth}px, ${(1 - p.y) / 2 * innerHeight}px) translate(-50%,-100%)`;
  }
  pintarPaneles(ahora);
}

// ───────────────────────── paneles ─────────────────────────
for (const t of $$('.pestanas [role=tab]')) t.addEventListener('click', () => {
  for (const o of $$('.pestanas [role=tab]')) o.setAttribute('aria-selected', o === t);
  for (const p of $$('[data-panel]')) p.hidden = p.dataset.panel !== t.dataset.p;
  $('#hoja').classList.remove('cerrada'); $('#plegar').textContent = '▾'; ajustar();
  if (t.dataset.p === 'cerebro') iniciarVistaCerebro();
});
$('#plegar').addEventListener('click', () => { const h = $('#hoja'); h.classList.toggle('cerrada'); $('#plegar').textContent = h.classList.contains('cerrada') ? '▴' : '▾'; ajustar(); });
$('#pausa').addEventListener('click', () => {
  pausado = !pausado; aTodos({ tipo: 'pausa', si: pausado });
  $('#pausa').textContent = pausado ? '▶' : '❚❚'; $('#pausa').setAttribute('aria-label', pausado ? 'Seguir' : 'Pausar');
});

function marcar(boton, si) { boton.setAttribute('aria-pressed', si ? 'true' : 'false'); }
for (const b of $$('[data-e]')) b.addEventListener('click', () => {
  const [que, cual] = b.dataset.e.split(':');
  if (['arana', 'pajaro', 'sombra', 'gato'].includes(que)) soltarDepredador(que);
  else if (que === 'gota') ponerGota(cual);
  else if (que === 'fruta') { ponerGota('azucar'); const g = mundo.gotas.at(-1); g.tipo = 'fruta'; g.olor = 'vinagre'; g.malla.material.color.set(0xd9b44a); anotar('…es un pedazo de plátano fermentado: dulce y huele a vinagre.'); }
  else if (que === 'olor') ponerOlor(cual);
  else if (que === 'ruido') { mundo.ruido = 3; anotar('Zumbido fuerte por 3 s.'); }
  else if (que === 'polvo') { mundo.polvo = 3; anotar('Les cayó polvo encima.'); }
  else if (que === 'sacudida') { mundo.sacudida = 0.4; anotar('Golpe a la mesa.'); }
  else if (que === 'destello') { mundo.destello = 1.5; anotar('Destello de luz.'); }
  else if (que === 'pantalla') { mundo.pantalla.modo = cual; mundo.pantalla.t0 = mundo.t; $$('[data-e^="pantalla:"]').forEach((o) => marcar(o, o === b && cual !== 'nada')); anotar(cual === 'nada' ? 'Pantalla apagada.' : `En la pantalla: ${{ rayas: 'rayas que giran', circulo: 'un círculo negro que crece', parpadeo: 'parpadeo' }[cual]}.`); }
  if (['arana', 'pajaro', 'sombra', 'gato', 'ruido', 'polvo', 'sacudida', 'destello'].includes(que)) { marcar(b, true); setTimeout(() => marcar(b, false), 600); }
});
$('#archivoImagen').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image(); img.onload = () => { mundo.pantalla = { modo: 'imagen', imagen: img, t0: mundo.t }; anotar(`En la pantalla: tu imagen (${f.name}).`); };
  img.src = URL.createObjectURL(f);
});
$('#archivoVideo').addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const v = document.createElement('video'); v.src = URL.createObjectURL(f); v.loop = true; v.muted = true; v.playsInline = true; v.play();
  mundo.pantalla = { modo: 'video', video: v, t0: mundo.t }; anotar(`En la pantalla: tu video (${f.name}).`);
});
for (const id of ['temp', 'viento', 'humedad', 'luz']) {
  const i = $('#' + id), o = i.nextElementSibling;
  const leer = () => {
    const v = +i.value;
    if (id === 'temp') { mundo.temp = v; o.textContent = v + ' °C'; }
    if (id === 'viento') { mundo.viento = v / 100; o.textContent = v + ' %'; }
    if (id === 'humedad') { mundo.humedad = v; o.textContent = v + ' %'; }
    if (id === 'luz') { mundo.luz = v / 100; o.textContent = v + ' %'; hemi.intensity = 0.2 + v / 100 * 1.2; sol.intensity = 0.3 + v / 100 * 2.4; }
  };
  i.addEventListener('input', leer); i.addEventListener('change', () => anotar(`${{ temp: 'Temperatura', viento: 'Viento', humedad: 'Humedad', luz: 'Luz' }[id]}: ${o.textContent}.`)); leer();
}
$('#limpiar').addEventListener('click', () => {
  quitar(mundo.gotas); quitar(mundo.olores);
  for (const d of mundo.depredadores) escena.remove(d.obj); mundo.depredadores.length = 0;
  mundo.pantalla = { modo: 'nada', t0: mundo.t }; $$('[aria-pressed=true]').forEach((b) => marcar(b, false));
  for (const [id, v] of [['temp', 25], ['viento', 0], ['humedad', 55], ['luz', 70]]) { $('#' + id).value = v; $('#' + id).dispatchEvent(new Event('input')); }
  anotar('Arena limpia.');
});

// tarjetas de las moscas
const LESIONES = [['escape', 'sin fibra gigante'], ['comer', 'sin MN9 (no come)'], ['acicalar', 'sin DNg12'], ['atras', 'sin MDN']];
function armarTarjetas() {
  $('#tarjetas').innerHTML = moscas.map((m) => `
    <article class="tarjeta" data-k="${m.k}">
      <header><i style="background:${COLORES[m.k]}"></i><b>${NOMBRES[m.k]}</b><button class="mini" data-seguir="${m.k}">Seguir</button></header>
      <p class="estado" aria-live="polite"></p>
      <div class="barras">${Object.entries(CONDUCTAS).map(([k, n]) => `<div class="barra-c" data-c="${k}"><span>${n}</span><div class="riel"><div></div></div><output>0</output></div>`).join('')}</div>
      <div class="lesiones">${LESIONES.map(([g, n]) => `<label><input type="checkbox" data-lesion="${g}"> ${n}</label>`).join('')}</div>
    </article>`).join('');
  for (const b of $$('[data-seguir]')) b.addEventListener('click', () => {
    const k = +b.dataset.seguir; seguir = seguir === k ? null : k;
    $$('[data-seguir]').forEach((o) => { o.textContent = +o.dataset.seguir === seguir ? 'Soltar' : 'Seguir'; });
    if (seguir != null) { const m = moscas[k]; camara.position.set(m.x + 1.2, 1, m.z + 1.4); }
  });
  for (const c of $$('[data-lesion]')) c.addEventListener('change', () => {
    const k = +c.closest('[data-k]').dataset.k, g = c.dataset.lesion;
    moscas[k].lesiones[c.checked ? 'add' : 'delete'](g);
    aDueno(k, { tipo: 'silenciar', mosca: k, grupo: g, si: c.checked });
    anotar(`${NOMBRES[k]}: ${c.checked ? 'se apagaron' : 'se prendieron otra vez'} las neuronas de «${CONDUCTAS[g]}».`);
  });
  $('#selCerebro').innerHTML = moscas.map((m) => `<label><input type="radio" name="cerebro" value="${m.k}" ${m.k === 0 ? 'checked' : ''}> <i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLORES[m.k]}"></i> ${NOMBRES[m.k]}</label>`).join('');
  for (const r of $$('[name=cerebro]')) r.addEventListener('change', () => aDueno(+r.value, { tipo: 'mapa', mosca: +r.value }));
}
const ETIQUETA_MODO = { explorar: 'Caminando', volar: 'Volando — escapó', comer: 'Comiendo (trompa afuera)', acicalar: 'Limpiándose', reversa: 'Retrocede', atrapada: 'Atrapada' };
let ultimoPanel = 0;
function pintarPaneles(ahora) {
  if (ahora - ultimoPanel < 150) return; ultimoPanel = ahora;
  $('#velocidad').innerHTML = cerebroListo ? (pausado ? 'en pausa' : `<b>${velocidad.toFixed(2)}×</b> tiempo real`) : 'cargando';
  if (!$('[data-panel=moscas]').hidden) for (const m of moscas) {
    const t = $(`.tarjeta[data-k="${m.k}"]`); if (!t) continue;
    t.querySelector('.estado').innerHTML = `${ETIQUETA_MODO[m.modo] || m.modo}<small>${m.motivo || ''}${m.activas ? ` · ${m.activas.toLocaleString('es-MX')} neuronas activas` : ''}</small>`;
    for (const [k] of Object.entries(CONDUCTAS)) {
      const v = tasa(m, k), b = t.querySelector(`[data-c="${k}"]`);
      b.querySelector('.riel div').style.width = Math.min(100, v / 1.2) + '%';
      b.querySelector('output').textContent = v.toFixed(v < 10 ? 1 : 0);
    }
  }
  if (!$('[data-panel=bitacora]').hidden) pintarResumen();
}
function pintarBitacora() {
  const ol = $('#log'); if (!ol) return;
  ol.innerHTML = bitacora.slice(0, 80).map((e) => `<li class="${e.clase}"><time>${e.t.toFixed(1)} s</time>${e.texto}</li>`).join('');
}
function pintarResumen() {
  $('#resumen').innerHTML = moscas.map((m) => {
    const l = m.stats.latencias; const med = l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null;
    return `<div class="cifra" style="border-color:${COLORES[m.k]}55"><span>${NOMBRES[m.k]}</span><b>${m.stats.escapes} escapes</b><span>${med != null ? `reacciona en ${med} ms` : 'sin escapes medidos'} · ${m.stats.capturas} capturas · ${m.stats.comiendo.toFixed(1)} s comiendo · ${m.stats.acicalando.toFixed(1)} s limpiándose</span></div>`;
  }).join('');
}

// instintos
$('#correrInstintos').addEventListener('click', () => {
  $('#correrInstintos').disabled = true; $('#instintosAvance').textContent = 'probando…';
  trabajadores[0].w.postMessage({ tipo: 'instintos' });
});
const NOMBRE_SENTIDO = { azucar: 'Azúcar', amargo: 'Amargo', agua: 'Agua', sal: 'Sal', vinagre: 'Vinagre', moho: 'Moho', co2: 'CO₂', feromona: 'Feromona',
  viento: 'Viento', sonido: 'Sonido', tacto: 'Tacto', polvo_ojos: 'Polvo en los ojos', calor: 'Calor', frio: 'Frío', seco: 'Seco', humedo: 'Húmedo',
  luz: 'Luz (ocelos)', acercamiento: 'Algo que se acerca', objeto_chico: 'Algo chico que se mueve', movimiento: 'Movimiento' };
function pintarInstintos(filas) {
  $('#correrInstintos').disabled = false; $('#instintosAvance').textContent = 'Listo. Más oscuro = la conducta se encendió más.';
  const cols = Object.keys(CONDUCTAS);
  const max = Math.max(1, ...filas.flatMap((f) => cols.map((c) => f.salidas[c])));
  $('#tablaInstintos').innerHTML = `<table class="tabla-i"><thead><tr><th>Sentido</th><th>Neuronas que se encienden</th>${cols.map((c) => `<th>${CONDUCTAS[c]}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr><td>${NOMBRE_SENTIDO[f.sentido] || f.sentido}</td><td>${(f.neuronas || 0).toLocaleString('es-MX')}</td>${cols.map((c) => {
    const v = f.salidas[c], a = Math.min(1, v / Math.min(max, 60));
    return `<td style="background:rgba(124,242,195,${(a * 0.85).toFixed(2)});color:${a > 0.5 ? '#04120c' : 'inherit'}">${v ? v.toFixed(v < 10 ? 1 : 0) : '·'}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
  anotar('Prueba de instintos terminada.');
}

// ───────────────────────── vista del cerebro ─────────────────────────
let vistaCerebro = null;
const COLOR_SUPER = { optic: '#3a6ea5', central: '#9b7bd4', sensory: '#e0a33a', visual_projection: '#4fb3a9', ascending: '#d46a6a', descending: '#ff5d5d',
  sensory_ascending: '#e0a33a', visual_centrifugal: '#4fb3a9', motor: '#ffcf5c', endocrine: '#7cf2c3' };
async function iniciarVistaCerebro() {
  if (vistaCerebro) return;
  vistaCerebro = { listo: false };
  const [indice, buf] = await Promise.all([
    fetch('datos/indice.json').then((r) => r.json()),
    fetch('datos/neuronas.bin').then((r) => r.body.pipeThrough(new DecompressionStream('gzip'))).then((s) => new Response(s).arrayBuffer()),
  ]);
  const dv = new DataView(buf), N = indice.neuronas;
  const pos = new Float32Array(N * 3), base = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const c = new THREE.Color();
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < N; i++) { cx += dv.getInt16(i * 12, true); cy += dv.getInt16(i * 12 + 2, true); cz += dv.getInt16(i * 12 + 4, true); }
  cx /= N; cy /= N; cz /= N;
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (dv.getInt16(i * 12, true) - cx) / 300; pos[i * 3 + 1] = -(dv.getInt16(i * 12 + 2, true) - cy) / 300; pos[i * 3 + 2] = -(dv.getInt16(i * 12 + 4, true) - cz) / 300;
    c.set(COLOR_SUPER[indice.superclases[dv.getUint8(i * 12 + 8)]] || '#666').multiplyScalar(0.28);
    base.set([c.r, c.g, c.b], i * 3); col.set([c.r, c.g, c.b], i * 3);
  }
  const lienzo = $('#lienzoCerebro');
  const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const e = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 2, 0.1, 50); cam.position.set(0, 0.3, 4.2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const puntos = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  e.add(puntos);
  const ctl = new OrbitControls(cam, lienzo); ctl.autoRotate = true; ctl.autoRotateSpeed = 0.6; ctl.enableDamping = true;
  Object.assign(vistaCerebro, { r, e, cam, ctl, g, col, base, N, indice, listo: true, brillo: new Float32Array(N) });
  $('#leyenda').innerHTML = Object.entries({ optic: 'vista (lóbulos ópticos)', central: 'centro', sensory: 'sentidos', visual_projection: 'proyección visual', descending: 'mandan al cuerpo', motor: 'motoras' })
    .map(([k, n]) => `<span><i style="background:${COLOR_SUPER[k]}"></i>${n}</span>`).join('');
  (function giro() {
    requestAnimationFrame(giro);
    if ($('[data-panel=cerebro]').hidden) return;
    const w = lienzo.clientWidth, h = lienzo.clientHeight;
    if (lienzo.width !== Math.round(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const v = vistaCerebro;
    for (let i = 0; i < v.N; i++) {
      const b = v.brillo[i]; if (!b) continue;
      v.brillo[i] = b < 0.02 ? 0 : b * 0.9;
      v.col[i * 3] = v.base[i * 3] + b; v.col[i * 3 + 1] = v.base[i * 3 + 1] + b * 0.95; v.col[i * 3 + 2] = v.base[i * 3 + 2] + b * 0.7;
    }
    v.g.attributes.color.needsUpdate = true; ctl.update(); r.render(e, cam);
  })();
}
function pintarMapa() {
  if (!vistaCerebro?.listo || !ultimoMapa) return;
  let disparan = 0, total = 0;
  for (let i = 0; i < ultimoMapa.length; i++) if (ultimoMapa[i]) { disparan++; total += ultimoMapa[i]; vistaCerebro.brillo[i] = Math.min(1.5, 0.5 + ultimoMapa[i] * 0.25); }
  const m = moscas[mapaMosca];
  $('#cifras').innerHTML = `<div class="cifra"><b>${disparan.toLocaleString('es-MX')}</b><span>neuronas dispararon (0.2 s)</span></div>
    <div class="cifra"><b>${Math.round(total * 5).toLocaleString('es-MX')}</b><span>spikes por segundo</span></div>
    <div class="cifra"><b>${(m?.activas || 0).toLocaleString('es-MX')}</b><span>neuronas con voltaje moviéndose</span></div>`;
}

// ───────────────────────── arranque ─────────────────────────
await crearMoscas();
armarTarjetas();
ajustar();
requestAnimationFrame(cuadro);
window.__mosca = { mundo, moscas, bitacora, soltarDepredador, ponerGota, ponerOlor };
