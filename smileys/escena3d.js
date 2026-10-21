/* ══════════════════════════════════════════════════════════════════════════
   SMILEY'S · la caja y la pizza en 3D
   ──────────────────────────────────────────────────────────────────────────
   Pedido de Carlos (21 de octubre): «usa un modelo 3D gratuito de caja de pizza y de
   una pizza … un modelo de pizza que pueda dividirse por rebanadas, usa una foto de la
   pizza como textura … calidad excelente».

   Modelos: Food Kit de Kenney (CC0): la caja trae la tapa como pieza aparte y la pizza
   viene en 8 rebanadas sueltas, así que sí se separan de verdad. Ver 3d/LICENCIA-kenney.txt.
   Textura: una foto real de Pexels (img/pizza-textura.jpg, de scripts/textura-pizza.py) proyectada desde
   arriba sobre las rebanadas; los pepperonis de bulto del modelo se aplanan bajo el queso
   para que manden los de la foto.

   El scroll es una perilla, no un secuestro: la sección mide varias pantallas y lo que se ve
   depende de dónde va el visitante. Si suelta, se queda ahí.
     0.06–0.30  se abre la tapa
     0.30–0.44  la pizza sube de la caja
     0.42–0.56  pasa el cortador
     0.54–0.72  se separan las rebanadas
     0.72–0.92  una rebanada sube hacia ti
   Arrastrar de lado gira la caja; tocar una rebanada la hace brincar.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sec = document.getElementById('caja');
const marco = document.getElementById('escena3d');
if (sec && marco) arrancar().catch((e) => { console.warn('3D apagado:', e); marco.remove(); });

const lim = (x) => Math.max(0, Math.min(1, x));
const suave = (a, b, x) => { const t = lim((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mezcla = (a, b, t) => a + (b - a) * t;

async function arrancar() {
  const lienzo = marco.querySelector('canvas');
  let r;
  try {
    r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { throw new Error('sin WebGL'); }
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.98;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(r);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 0.55;

  const sol = new THREE.DirectionalLight(0xffe2bf, 2.1);
  sol.position.set(1.6, 3.2, 1.9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.left = -1.2; sol.shadow.camera.right = 1.2;
  sol.shadow.camera.top = 1.2; sol.shadow.camera.bottom = -1.2;
  sol.shadow.camera.near = 0.5; sol.shadow.camera.far = 8;
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02; sol.shadow.radius = 5;
  escena.add(sol);
  const contra = new THREE.DirectionalLight(0xff5a3c, 0.9);       /* el rojo de la marca, por detrás */
  contra.position.set(-2.2, 1.2, -1.6);
  escena.add(contra);
  escena.add(new THREE.HemisphereLight(0xfff4e6, 0x2a1d14, 0.35));

  const piso = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.42 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true;
  escena.add(piso);

  const camara = new THREE.PerspectiveCamera(33, 1, 0.05, 30);

  /* ── texturas ── */
  const cargaTex = new THREE.TextureLoader();
  const tex = (url) => new Promise((ok, mal) => cargaTex.load(url, ok, undefined, mal));
  const [fotoPizza, kraft, logo, sonrisa, gl] = await Promise.all([
    tex('img/pizza-textura.jpg'), tex('img/kraft.jpg'),
    imagen('img/logo.svg'), imagen('img/sonrisa.svg'),
    Promise.all([new GLTFLoader().loadAsync('3d/pizza-box.glb'), new GLTFLoader().loadAsync('3d/pizza.glb'), new GLTFLoader().loadAsync('3d/pizza-cutter.glb')])
  ]);
  fotoPizza.colorSpace = THREE.SRGBColorSpace;
  fotoPizza.anisotropy = r.capabilities.getMaxAnisotropy();
  kraft.colorSpace = THREE.SRGBColorSpace;
  kraft.wrapS = kraft.wrapT = THREE.RepeatWrapping;
  kraft.anisotropy = 8;
  const [gCaja, gPizza, gCortador] = gl;

  /* ── la caja: kraft en todas sus caras, con la sonrisa y el logo impresos en la tapa ── */
  const matKraft = new THREE.MeshStandardMaterial({ map: kraft, color: 0xd6b383, roughness: 0.92, metalness: 0 });
  const caja = gCaja.scene;
  caja.traverse((o) => { if (o.isMesh) { proyeccionCaja(o.geometry, 1.25); o.material = matKraft; o.castShadow = o.receiveShadow = true; } });
  /* la tapa viene abierta ~60°; su bisagra está en el borde de atrás, arriba (x = -0.471, y = 0.09) */
  const tapa = caja.getObjectByName('lid');
  const bisagra = new THREE.Group();
  bisagra.position.set(-0.471, 0.09, 0);
  tapa.parent.add(bisagra);
  bisagra.add(tapa);
  tapa.position.set(0.457, 0, 0);
  tapa.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
  const impreso = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.88), new THREE.MeshStandardMaterial({
    map: lienzoTapa(logo, sonrisa), transparent: true, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2
  }));
  impreso.rotation.x = Math.PI / 2;                 /* mira hacia -y de la tapa = hacia arriba con la tapa cerrada */
  impreso.rotation.z = Math.PI / 2;
  impreso.position.set(0, -0.0015, 0);
  tapa.add(impreso);
  escena.add(caja);

  /* ── la pizza: 8 rebanadas con la foto encima ── */
  const pizza = gPizza.scene;
  let R = 0;
  pizza.traverse((o) => { if (o.isMesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) R = Math.max(R, Math.hypot(p.getX(i), p.getZ(i))); } });
  const matPizza = new THREE.MeshPhysicalMaterial({ map: fotoPizza, color: 0xece6de, roughness: 0.6, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.5 });
  /* el corte de cada rebanada (los lados planos): masa dorada abajo, pan, y salsa con queso arriba.
     Con la foto proyectada desde arriba esos lados salían como rayas estiradas */
  const matCorte = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const rebanadas = [];
  pizza.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry, p = g.attributes.position, n = g.attributes.normal;
    const uv = new Float32Array(p.count * 2);
    let cx = 0, cz = 0;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z);
      if (rr < R * 0.84 && y > 0.027) p.setY(i, 0.0252);          /* pepperoni de bulto → bajo el queso */
      if (n.getY(i) < -0.7) { uv[i * 2] = 0.985; uv[i * 2 + 1] = 0.5; }   /* abajo: color de la orilla */
      else { uv[i * 2] = 0.5 + x / (2 * R); uv[i * 2 + 1] = 0.5 - z / (2 * R); }
      cx += x; cz += z;
    }
    p.needsUpdate = true;
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    o.geometry = conCorte(g, R);
    o.material = [matPizza, matCorte]; o.castShadow = o.receiveShadow = true;
    const ang = Math.atan2(cz / p.count, cx / p.count);
    rebanadas.push({ malla: o, dir: new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)), brinco: 0, vel: 0 });
  });
  rebanadas.sort((a, b) => Math.atan2(a.dir.z, a.dir.x) - Math.atan2(b.dir.z, b.dir.x));
  const heroe = rebanadas.reduce((m, s) => (s.dir.x + s.dir.z > m.dir.x + m.dir.z ? s : m));   /* la que mira a la cámara */
  pizza.position.y = 0.021;
  escena.add(pizza);

  const cortador = gCortador.scene;
  cortador.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.material) { o.material.metalness = 0.35; o.material.roughness = 0.35; } } });
  cortador.scale.setScalar(1.35);
  escena.add(cortador);

  /* ── tamaño ── */
  let ancho = 0, alto = 0;
  const medir = () => {
    const w = Math.round(marco.clientWidth), h = Math.round(marco.clientHeight);
    if (w === ancho && h === alto) return;          /* asignar el tamaño BORRA el lienzo: sólo si cambió */
    ancho = w; alto = h;
    r.setSize(w, h, false);
    camara.aspect = w / h; camara.updateProjectionMatrix();
    pedir();
  };
  new ResizeObserver(medir).observe(marco);

  /* ── el visitante: arrastrar gira, tocar una rebanada la hace brincar ── */
  let giroUsuario = 0, giroVel = 0, arrastre = null;
  lienzo.addEventListener('pointerdown', (e) => { arrastre = { x: e.clientX, y: e.clientY, t: performance.now(), movio: false }; });
  addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x;
    if (Math.abs(dx) > 6) arrastre.movio = true;
    giroVel = dx * 0.006; giroUsuario += dx * 0.006; arrastre.x = e.clientX; pedir();
  });
  addEventListener('pointerup', (e) => {
    if (arrastre && !arrastre.movio) tocar(e);
    arrastre = null;
  });
  const rayo = new THREE.Raycaster(), punto = new THREE.Vector2();
  function tocar(e) {
    const b = lienzo.getBoundingClientRect();
    punto.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    rayo.setFromCamera(punto, camara);
    const g = rayo.intersectObjects(rebanadas.map((s) => s.malla))[0];
    if (g) { const s = rebanadas.find((x) => x.malla === g.object); s.vel = 2.6; pedir(); }
  }

  /* ── el cuadro ── */
  let visible = false, corriendo = false, previo = performance.now();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; pedir(); }, { rootMargin: '100px' }).observe(marco);
  addEventListener('scroll', pedir, { passive: true });
  function pedir() { if (!corriendo && visible) { corriendo = true; previo = performance.now(); requestAnimationFrame(cuadro); } }

  const avance = () => {
    if (quieto) return 0.66;
    const b = sec.getBoundingClientRect();
    return lim(-b.top / Math.max(1, b.height - innerHeight));
  };
  const objetivo = new THREE.Vector3();

  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora;
    const p = avance(), t = ahora / 1000;

    const abre = suave(0.06, 0.30, p);
    const sube = suave(0.30, 0.44, p);
    const corte = suave(0.42, 0.56, p);
    const separa = suave(0.54, 0.72, p) * (1 - 0.55 * suave(0.80, 0.95, p));
    const alza = suave(0.72, 0.92, p);

    bisagra.rotation.z = abre * THREE.MathUtils.degToRad(108);
    pizza.position.y = 0.021 + sube * 0.16;
    pizza.rotation.y = sube * 0.35;

    /* el cortador cruza la pizza de lado a lado y se va */
    const enCorte = corte > 0 && corte < 1;
    cortador.visible = enCorte;
    if (enCorte) {
      const x = mezcla(-0.75, 0.75, corte);
      cortador.position.set(x, pizza.position.y + 0.05, 0.02);
      cortador.rotation.set(0, Math.PI, 0.55);
    }

    for (const s of rebanadas) {
      /* brinco de resorte al tocar */
      s.vel += (-s.brinco * 60 - s.vel * 7) * dt; s.brinco += s.vel * dt;
      const esHeroe = s === heroe;
      const d = separa * 0.085 + (esHeroe ? alza * 0.2 : 0);
      s.malla.position.set(s.dir.x * d, Math.max(0, s.brinco) + (esHeroe ? alza * 0.3 : 0), s.dir.z * d);
      /* la que sube se inclina hacia la cámara, como cuando la levantas para morderla */
      s.malla.rotation.set(esHeroe ? alza * 0.5 * s.dir.z : 0, 0, esHeroe ? -alza * 0.5 * s.dir.x : 0);
    }

    /* cámara: de tres cuartos a cerca, girando poco a poco con el scroll y con el dedo */
    if (!arrastre) { giroVel *= 0.92; giroUsuario += giroVel; }
    const giro = -0.62 + p * 0.9 + giroUsuario + (quieto ? 0 : Math.sin(t * 0.35) * 0.04);
    const dist = mezcla(2.7, 2.4, suave(0.25, 0.75, p)) - alza * 0.1;
    const altura = mezcla(1.6, 1.25, suave(0.2, 0.9, p));
    camara.position.set(Math.sin(giro) * dist, altura, Math.cos(giro) * dist);
    objetivo.set(0, 0.1 + abre * 0.12 + sube * 0.06, 0);
    camara.lookAt(objetivo);

    r.render(escena, camara);
    const sigue = visible && (!quieto) && (arrastre || Math.abs(giroVel) > 1e-4 || rebanadas.some((s) => Math.abs(s.vel) > 1e-3 || Math.abs(s.brinco) > 1e-4) || true);
    if (sigue) requestAnimationFrame(cuadro); else corriendo = false;
  }

  medir();
  sec.classList.add('con3d');
  pedir();
}

/* Proyecta la textura de cartón por la cara dominante de cada vértice: los modelos de Kenney
   traen coordenadas que apuntan a su paleta de colores, no a una textura que se repita. */
function proyeccionCaja(g, escala) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * escala; uv[i * 2 + 1] = v * escala;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/* Separa las caras de una rebanada en dos grupos: arriba/abajo/orilla con la foto (material 0)
   y los dos cortes rectos con color de corte (material 1). Un corte es una cara de lado cuya
   normal NO apunta hacia afuera del centro (la orilla sí apunta hacia afuera). */
function conCorte(g, R) {
  const gg = g.index ? g.toNonIndexed() : g;
  const p = gg.attributes.position, n = gg.attributes.normal, uv = gg.attributes.uv;
  const tris = p.count / 3, foto = [], corte = [], orilla = {};
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nf = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(p, t * 3); b.fromBufferAttribute(p, t * 3 + 1); c.fromBufferAttribute(p, t * 3 + 2);
    nf.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const mx = (a.x + b.x + c.x) / 3, mz = (a.z + b.z + c.z) / 3, rr = Math.hypot(mx, mz) || 1;
    const radial = Math.abs((nf.x * mx + nf.z * mz) / rr);
    if (Math.abs(nf.y) >= 0.5) foto.push(t);
    else { (radial < 0.5 && rr < R * 0.97 ? corte : corte).push(t); orilla[t] = radial >= 0.5 || rr >= R * 0.97; }
  }
  const orden = foto.concat(corte), N = orden.length * 3;
  const P = new Float32Array(N * 3), NN = new Float32Array(N * 3), U = new Float32Array(N * 2), C = new Float32Array(N * 3);
  const masa = new THREE.Color(0xc98a3e), pan = new THREE.Color(0xf0d6a0), queso = new THREE.Color(0xe8a13a), salsa = new THREE.Color(0xc0452b), tmp = new THREE.Color();
  const dorada = new THREE.Color(0xb46e2a), tostada = new THREE.Color(0xdba45a);
  orden.forEach((t, k) => {
    for (let v = 0; v < 3; v++) {
      const i = t * 3 + v, j = k * 3 + v, y = p.getY(i);
      P.set([p.getX(i), y, p.getZ(i)], j * 3); NN.set([n.getX(i), n.getY(i), n.getZ(i)], j * 3); U.set([uv.getX(i), uv.getY(i)], j * 2);
      if (orilla[t]) tmp.copy(dorada).lerp(tostada, Math.min(1, y / 0.044));   /* la orilla: de dorada abajo a tostada arriba */
      else if (y < 0.006) tmp.copy(masa); else if (y < 0.018) tmp.copy(pan).lerp(masa, 0.15); else if (y < 0.024) tmp.copy(salsa); else tmp.copy(queso);
      C.set([tmp.r, tmp.g, tmp.b], j * 3);
    }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(NN, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.addGroup(0, foto.length * 3, 0);
  out.addGroup(foto.length * 3, corte.length * 3, 1);
  out.computeVertexNormals();
  return out;
}

function imagen(url) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
}

/* Lo impreso en la tapa, como la caja de verdad: el logo arriba a la izquierda y la sonrisa
   grande cruzando, en tinta café oscura. Los SVG son de una sola tinta (negro); se tiñen aquí. */
function lienzoTapa(logo, sonrisa) {
  const L = 2048, c = document.createElement('canvas'); c.width = c.height = L;
  const x = c.getContext('2d');
  const tinta = (img, dx, dy, w, rot) => {
    const h = w * (img.naturalHeight / img.naturalWidth || 0.4);
    const t = document.createElement('canvas'); t.width = Math.ceil(w); t.height = Math.ceil(h);
    const tx = t.getContext('2d'); tx.drawImage(img, 0, 0, w, h);
    tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#2b241f'; tx.fillRect(0, 0, w, h);
    x.save(); x.translate(dx, dy); x.rotate(rot || 0); x.globalAlpha = 0.9; x.drawImage(t, -w / 2, -h / 2); x.restore();
  };
  tinta(logo, L * 0.27, L * 0.16, L * 0.4, -0.05);
  tinta(sonrisa, L * 0.5, L * 0.56, L * 1.02, -0.12);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
