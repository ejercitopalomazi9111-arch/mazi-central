/* EL LOGO EN 3D, de verdad y no un dibujo con sombra: las letras de MAZI salen de las mismas rutas
   que el logo (marca/cubo/final/piezas.js) extruidas, y el cubo es un cubo de verdad partido en dos
   piezas — la M (el cubo con la esquina de enfrente mordida) y la cuña que llena la mordida —, de
   modo que visto en isométrico desde (1, 1, 1) se ve EXACTAMENTE como el logo plano.
     const L = logo3d();  escena.add(L.grupo);
     L.colocar(camara)    // pone las letras de frente a la cámara isométrica, junto al cubo
   rutaAFormas(d) sirve para cualquier ruta SVG (M L H V Q C Z absolutas, como las de fontTools). */
import * as THREE from 'three';
import { PIEZAS, PAL, logo2d, HDR } from './motor.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';

/* ── rutas SVG → formas de three (con hoyos: la A, la O, la B…) ── */
export function rutaAFormas(d, { k = .01 } = {}){
  const tok = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const contornos = []; let c = null, x = 0, y = 0, i = 0, cmd = '';
  const num = () => Number(tok[i++]);
  const P = (px, py) => new THREE.Vector2(px * k, -py * k);
  while(i < tok.length){
    if(/[A-Z]/i.test(tok[i])) cmd = tok[i++];
    else if(cmd === 'M') cmd = 'L';                                   // coordenadas sueltas tras una M son L
    if(cmd === 'M'){ x = num(); y = num(); c = new THREE.Path(); c.moveTo(...P(x, y).toArray()); contornos.push(c); }
    else if(cmd === 'L'){ x = num(); y = num(); c.lineTo(...P(x, y).toArray()); }
    else if(cmd === 'H'){ x = num(); c.lineTo(...P(x, y).toArray()); }
    else if(cmd === 'V'){ y = num(); c.lineTo(...P(x, y).toArray()); }
    else if(cmd === 'Q'){ const a = P(num(), num()); x = num(); y = num(); const b = P(x, y); c.quadraticCurveTo(a.x, a.y, b.x, b.y); }
    else if(cmd === 'C'){ const a = P(num(), num()), b = P(num(), num()); x = num(); y = num(); const e = P(x, y); c.bezierCurveTo(a.x, a.y, b.x, b.y, e.x, e.y); }
    else if(cmd === 'Z'){ c.closePath(); }
  }
  /* el más grande que lo contiene es su dueño: si un contorno cae dentro de otro, es hoyo */
  const datos = contornos.map(p => { const pts = p.getPoints(12); return { p, pts, area: Math.abs(THREE.ShapeUtils.area(pts)) }; }).sort((a, b) => b.area - a.area);
  const dentro = (pt, poly) => { let s = false; for(let a = 0, b = poly.length - 1; a < poly.length; b = a++){ const A = poly[a], B = poly[b]; if((A.y > pt.y) !== (B.y > pt.y) && pt.x < (B.x - A.x) * (pt.y - A.y) / (B.y - A.y) + A.x) s = !s; } return s; };
  const formas = [];
  for(const o of datos){
    const nivel = datos.filter(q => q !== o && q.area > o.area && dentro(o.pts[0], q.pts));
    if(nivel.length % 2 === 0){ const f = new THREE.Shape(o.pts); o.forma = f; formas.push(f); }
    else { const dueño = nivel.sort((a, b) => a.area - b.area)[0]; dueño.forma?.holes.push(new THREE.Path(o.pts)); }
  }
  return formas;
}
export function extruir(d, { k = .01, hondo = .22, bisel = .018 } = {}){
  const g = new THREE.ExtrudeGeometry(rutaAFormas(d, { k }), { depth: hondo, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel * .8, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -hondo / 2); return g;
}

/* ── el cubo partido: un sólido por cada caja, con material según hacia dónde mira cada cara ── */
const A = 20 / 42, hA = 1 - .3914, h1 = 1 - .48;                     // medidas sacadas del logo plano
function solido(caras){
  const pos = [], grupos = [[], [], [], []];                          // 0 techo · 1 izquierda (+z) · 2 derecha (+x) · 3 resto
  const centro = new THREE.Vector3(); let n = 0; caras.flat().forEach(p => { centro.add(new THREE.Vector3(...p)); n++; }); centro.divideScalar(n);
  for(const cara of caras){
    const v = cara.map(p => new THREE.Vector3(...p)), c = v.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(v.length);
    let nor = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).normalize();
    if(nor.dot(new THREE.Vector3().subVectors(c, centro)) < 0){ v.reverse(); nor.negate(); }
    const m = nor.y > .7 ? 0 : nor.z > .7 ? 1 : nor.x > .7 ? 2 : 3;
    for(let t = 1; t < v.length - 1; t++) grupos[m].push(v[0], v[t], v[t + 1]);
  }
  const g = new THREE.BufferGeometry(); let ini = 0;
  grupos.forEach((tri, m) => { tri.forEach(p => pos.push(p.x - .5, p.y - .5, p.z - .5)); g.addGroup(ini, tri.length, m); ini += tri.length; });
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
const caja = (x0, x1, y0, y1, z0, z1) => [
  [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
  [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
  [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]];
/* la cuña: la columna de la esquina de enfrente, con el techo que baja hacia la arista (la V de la M) */
const T1 = [A, hA, A], T2 = [1, hA, A], T3 = [1, h1, 1], T4 = [A, hA, 1];
const caraCuna = [[[A, 0, A], [1, 0, A], [1, 0, 1], [A, 0, 1]], [T1, T2, T3], [T1, T3, T4],
  [[A, 0, A], [1, 0, A], T2, T1], [[1, 0, A], [1, 0, 1], T3, T2], [[1, 0, 1], [A, 0, 1], T4, T3], [[A, 0, 1], [A, 0, A], T1, T4]];
const caraTapa = [[T1, T3, T2], [T1, T4, T3], [[A, 1, A], [1, 1, A], [1, 1, 1], [A, 1, 1]],
  [T2, T3, [1, 1, 1], [1, 1, A]], [T4, T3, [1, 1, 1], [A, 1, 1]], [T1, T2, [1, 1, A], [A, 1, A]], [T1, T4, [A, 1, 1], [A, 1, A]]];

export function materialesCubo(){
  const m = (c, e = .3) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .08, emissive: c, emissiveIntensity: e, side: THREE.DoubleSide });
  return [m(PAL.techo, .35), m(PAL.izq, .25), m(PAL.der, .25), m('#1B1B21', .1)];
}
export function piezasCubo(){
  const mat = materialesCubo();
  const mG = [solido(caja(0, A, 0, 1, 0, A)), solido(caja(A, 1, 0, 1, 0, A)), solido(caja(0, A, 0, 1, A, 1)), solido(caraTapa)];
  const m = new THREE.Group(); mG.forEach(g => m.add(new THREE.Mesh(g, mat)));
  const cuna = new THREE.Mesh(solido(caraCuna), mat);
  return { m, cuna, mat };
}

/* ── el logo entero: letras + cubo, armado para la cámara isométrica ── */
export const ISO = new THREE.Vector3(1, 1, 1).normalize();
export function logo3d({ hondo = .2, color = PAL.claro } = {}){
  const grupo = new THREE.Group(), plano = new THREE.Group(); grupo.add(plano);
  const matL = [new THREE.MeshStandardMaterial({ color, roughness: .32, metalness: .1, emissive: color, emissiveIntensity: .18 }),
    new THREE.MeshStandardMaterial({ color: '#B9AEC4', roughness: .4, metalness: .2 })];
  const kc = 100 / 98, s = .84 * kc / Math.SQRT2;                      // lado del cubo: su ancho isométrico es el del dibujo
  const cuCentro = (PIEZAS.ancho + 24 + 50 * kc) / 100, medio = (cuCentro + s * Math.SQRT2 / 2) / 2;
  const letras = PIEZAS.mazi.map(d => { const g = extruir(d, { hondo }); const me = new THREE.Mesh(g, matL);
    g.computeBoundingBox(); const b = g.boundingBox; const cx = (b.min.x + b.max.x) / 2; g.translate(-cx, 0, 0);
    const h = new THREE.Group(); h.add(me); h.position.set(cx - medio, -.5, 0); h.userData.casa = h.position.clone(); plano.add(h); return h; });
  const { m, cuna, mat } = piezasCubo();
  const cubo = new THREE.Group(); cubo.add(m, cuna); cubo.scale.setScalar(s); grupo.add(cubo);
  const L = { grupo, plano, letras, cubo, m, cuna, mat, matL, lado: s, medio, cuCentro,
    /* la casa del cubo: donde cae en el plano de las letras, visto desde la dirección isométrica */
    colocar(dir = ISO){
      /* la base del plano: z hacia la cámara, x a la derecha de la pantalla, y hacia arriba */
      const z = dir.clone().normalize(), u = new THREE.Vector3(0, 1, 0).cross(z).normalize(), v = z.clone().cross(u);
      plano.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, z));
      cubo.position.copy(u.multiplyScalar(cuCentro - medio)); cubo.userData.casa = cubo.position.clone();
    } };
  L.colocar();
  return L;
}

/* ── EL CIERRE VIVO: el logo se arma en 3D y termina EXACTAMENTE en el logo plano ──
   Reemplaza a logo2d() en el cierre de cada anuncio:  logoVivo(c2, { t, desde, cx, cy, ancho })
   Cae la cuña, cae la M encima y destella el techo, las letras se voltean una por una y la cámara
   barre hasta el isométrico; al final se funde con logo2d en el mismo lugar y del mismo tamaño. */
const AN = 1080, AL = 720, FOV = 14;
let V = null;
const _cl = (v) => Math.min(1, Math.max(0, v)), _tr = (t, a, b) => _cl((t - a) / (b - a));
const _suave = (u) => u * u * (3 - 2 * u), _sale = (u) => 1 - Math.pow(1 - u, 3);
const _cae = (u, alto) => { if(u <= 0) return alto; if(u < .62){ const v = u / .62; return alto * (1 - v * v); } const v = (u - .62) / .38; return Math.abs(Math.sin(v * Math.PI * 2)) * alto * .05 * (1 - v) * (1 - v); };
function preparar(){
  const lienzo = document.createElement('canvas'); lienzo.width = AN; lienzo.height = AL;
  const r = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(AN, AL, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping;
  const s = new THREE.Scene(), pm = new THREE.PMREMGenerator(r); s.environment = HDR ? pm.fromEquirectangular(HDR).texture : pm.fromScene(new RoomEnvironment(), .04).texture; s.environmentIntensity = HDR ? .75 : .55;
  s.add(new THREE.HemisphereLight('#E8DDF5', '#2A0E1E', .6)); const k = new THREE.DirectionalLight('#FFFFFF', 2); k.position.set(-4, 6, 6); s.add(k);
  const b = new THREE.DirectionalLight(PAL.vino2, 1.4); b.position.set(5, 2, -4); s.add(b);
  const cam = new THREE.PerspectiveCamera(FOV, AN / AL, .1, 400), L = logo3d(); s.add(L.grupo);
  V = { lienzo, r, s, cam, L, casa: L.cubo.userData.casa.clone(), ancho: L.medio * 2 };
}
export function logoVivo(x, { t, desde, cx, cy, ancho, dur = 2.9, alfa = 1 }){
  const u = t - desde; if(u < 0) return;
  const k = _suave(_tr(u, dur - .4, dur));
  if(k < 1){
    if(!V) preparar();
    const { L, cam, casa } = V, s = L.lado;
    /* Carlos, 29 oct: «siempre permite que se note la M cubo convirtiéndose en el cubo completo».
       La M entra y SE QUEDA flotando encima, de frente, para que se lea como M; luego baja sobre la
       cuña, encaja y destella: ahí se vuelve el cubo. */
    const flota = _sale(_tr(u, .35, .7)), baja = _tr(u, .95, 1.3);
    L.cuna.position.y = _cae(_tr(u, 0, .45), 5 / s);
    L.m.position.y = baja > 0 ? _cae(baja, 1.15 / s) : (1.15 + (1 - flota) * 3) / s;
    L.cuna.visible = true; L.m.visible = u >= .35;
    L.mat[0].emissiveIntensity = .35 + 2.4 * Math.max(0, 1 - Math.abs(u - 1.2) / .22);
    L.letras.forEach((h, i) => { const v = _tr(u, 1.3 + i * .11, 1.75 + i * .11); h.visible = v > 0; h.position.copy(h.userData.casa); h.position.y += (1 - _sale(v)) * -.35;
      const ov = v >= 1 ? 0 : Math.sin(v * Math.PI) * .25; h.rotation.set((1 - _sale(v)) * -Math.PI / 2 - ov, 0, 0); });
    /* la cámara: de cerca y de lado sobre el cubo, a isométrico con todo el logo */
    const w = _suave(_tr(u, 1.1, 2.4)), d = V.ancho * AN / ancho / (2 * Math.tan(FOV * Math.PI / 360) * (AN / AL));
    const yaw = Math.PI / 4 + (1 - w) * .22, pitch = Math.asin(1 / Math.sqrt(3)) + (1 - w) * .06;          // casi de frente: la M se lee
    const mira = casa.clone().multiplyScalar(1 - w);
    cam.position.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)).multiplyScalar(d * (.42 + .58 * w)).add(mira); cam.lookAt(mira);
    V.r.render(V.s, cam);
    x.save(); x.globalAlpha = alfa * _sale(_tr(u, 0, .15)); x.drawImage(V.lienzo, cx - AN / 2, cy - AL / 2); x.restore();
  }
  if(k > 0) logo2d(x, { cx, cy, ancho, alfa: alfa * k });
}
