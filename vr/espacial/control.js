/* MAZI XR · el DualShock 4 como control ESPACIAL con un marcador impreso (ENGINEERING_LOG 002).
   Safari no da el giroscopio del control; la cámara trasera sí puede VER el control. Un marcador ArUco
   (diccionario ARUCO_MIP_36h12, id 0) pegado plano encima del control da su posición Y orientación en la cámara
   (js-aruco2, BSD: el detector; la pose la calcula este archivo con perspectiva completa). Con la pose de la cámara que da el VIO se pasa al MUNDO:
       T_mundo_marcador = T_mundo_cámara · T_cámara_marcador
   El control tiene así su propia pose, independiente de la cabeza, y un rayo que apunta hacia donde apunta él.
   Ejes del marcador (impreso derecho y pegado con su borde de arriba hacia la barra de luz):
     x = a la derecha del control · y = hacia adelante (a donde apuntas) · z = hacia arriba (fuera del marcador).
   «Calibrar» corrige lo que el marcador quedó torcido: apuntas el control hacia donde miras y se guarda el ajuste.
   Lo que NO hace: inventar la pose cuando el marcador no se ve. Si se pierde, el rayo se apaga. */
export function montarControl({ THREE, escena, video, poseCamara, intrinsecos, objetivos }){
  const AR = window.AR;
  const conf = { tam: Number(localStorage.getItem('mazixr-marcador-cm') || 4) / 100, ancho: 480, hz: 15 };
  const detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12' });
  const lienzo = document.createElement('canvas'), ctx = lienzo.getContext('2d', { willReadFrequently: true });

  /* el control dibujado: una caja del tamaño de un DualShock 4 (16 × 10 × 5 cm) bajo el marcador, y el rayo */
  const grupo = new THREE.Group(); grupo.matrixAutoUpdate = false; grupo.visible = false;
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.05), new THREE.MeshBasicMaterial({ color: 0x2b2b3a, transparent: true, opacity: 0.6 }));
  cuerpo.position.set(0, 0, -0.03); grupo.add(cuerpo);
  grupo.add(new THREE.LineSegments(new THREE.EdgesGeometry(cuerpo.geometry), new THREE.LineBasicMaterial({ color: 0xc77dff })));
  grupo.children[1].position.copy(cuerpo.position);
  const LARGO = 3;
  const rayoGeo = new THREE.BufferGeometry(); rayoGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, LARGO, 0], 3));
  const rayo = new THREE.Line(rayoGeo, new THREE.LineBasicMaterial({ color: 0xac27ff }));
  grupo.add(rayo);
  escena.add(grupo);

  let cal = new THREE.Quaternion();
  try{ const g = JSON.parse(localStorage.getItem('mazixr-control-cal') || 'null'); if(g) cal.fromArray(g); }catch{}
  const estado = { visto: false, perdidoMs: 0, id: null, error: null, distancia: null, pos: null, dir: null, hz: 0, apunta: null, detecciones: 0 };
  let ultimo = 0, vistoEn = 0, cuenta = 0, ventana = performance.now();
  const mundo = new THREE.Matrix4(), suave = { p: null, q: null };
  /* a qué le pega el rayo (su three.js viene sin Raycaster): rayo contra la caja de cada objeto, en el marco del objeto */
  function pegaA(origen, dir, objs){
    let mejor = null, dMin = Infinity; const inv = new THREE.Matrix4();
    for(const o of objs){ if(!o.visible || !o.geometry) continue;
      if(!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox; o.updateMatrixWorld(true); inv.copy(o.matrixWorld).invert();
      const a = origen.clone().applyMatrix4(inv), d = dir.clone().transformDirection(inv);
      const escala = dir.clone().transformDirection(o.matrixWorld).length() || 1;
      let t0 = -Infinity, t1 = Infinity;
      for(const k of ['x', 'y', 'z']){
        if(Math.abs(d[k]) < 1e-9){ if(a[k] < b.min[k] || a[k] > b.max[k]){ t0 = Infinity; break; } continue; }
        let ta = (b.min[k] - a[k]) / d[k], tb = (b.max[k] - a[k]) / d[k]; if(ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      }
      if(t0 <= t1 && t1 > 0){ const t = Math.max(t0, 0); if(t < dMin && t < LARGO){ dMin = t; mejor = o; } }
    }
    return mejor ? { object: mejor, distancia: dMin } : null;
  }

  /* POSE CON PERSPECTIVA COMPLETA (19 nov): POSIT aproxima la perspectiva y con el brazo estirado (70 cm) se iba
     10 % en posición y 3.8° en orientación (vr/pruebas-marcador.mjs). Ahora: homografía de las 4 esquinas →
     giro y posición iniciales → afinado de Gauss-Newton que minimiza el error de reproyección en pixeles.
     Marco de la cámara: OpenCV (x derecha, y abajo, z adelante), el mismo del VIO.
     Marco del marcador: x derecha, y arriba (adelante en el control), z fuera del marcador. */
  function homografia(src, dst){
    const A = [], b = [];
    for(let i = 0; i < 4; i++){ const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
    const h = resolver(A, b); return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
  }
  function resolver(A, b){   /* eliminación de Gauss con pivote */
    const n = b.length, M = A.map((f, i) => [...f, b[i]]);
    for(let c = 0; c < n; c++){ let p = c; for(let r = c + 1; r < n; r++) if(Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12;
      for(let r = 0; r < n; r++) if(r !== c){ const f = M[r][c] / d; for(let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
    return M.map((f, i) => f[n] / (M[i][i] || 1e-12));
  }
  const rodrigues = (w) => { const th = Math.hypot(w[0], w[1], w[2]); if(th < 1e-12) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const [x, y, z] = w.map((v) => v / th), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
    return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]]; };
  const mul3 = (A, B) => A.map((f) => [0, 1, 2].map((j) => f[0] * B[0][j] + f[1] * B[1][j] + f[2] * B[2][j]));
  function poseMarcador(esquinas, fx, cx, cy){
    const h = conf.tam / 2, mod = [[-h, h], [h, h], [h, -h], [-h, -h]];   /* esquinas del detector: arriba-izq y en sentido del reloj */
    const obs = esquinas.map((e) => [(e.x - cx) / fx, (e.y - cy) / fx]);
    const H = homografia(mod, obs);
    const c1 = [H[0][0], H[1][0], H[2][0]], c2 = [H[0][1], H[1][1], H[2][1]], c3 = [H[0][2], H[1][2], H[2][2]];
    const n1 = Math.hypot(...c1), n2 = Math.hypot(...c2), l = 2 / (n1 + n2) * (c3[2] < 0 ? -1 : 1);
    let r1 = c1.map((v) => v * l), r2 = c2.map((v) => v * l); let t = c3.map((v) => v * l);
    /* ortonormalizar r1, r2 simétricamente y r3 = r1 × r2 */
    const nr = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
    r1 = nr(r1); r2 = nr(r2); const sum = nr(r1.map((v, i) => v + r2[i])), dif = nr(r1.map((v, i) => v - r2[i]));
    r1 = nr(sum.map((v, i) => v + dif[i])); r2 = nr(sum.map((v, i) => v - dif[i]));
    const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    let R = [[r1[0], r2[0], r3[0]], [r1[1], r2[1], r3[1]], [r1[2], r2[2], r3[2]]];
    /* afinado: 6 incógnitas (giro pequeño + posición), 8 residuos en pixeles normalizados */
    const residuos = (R, t) => mod.flatMap(([X, Y], i) => { const p = [R[0][0] * X + R[0][1] * Y + t[0], R[1][0] * X + R[1][1] * Y + t[1], R[2][0] * X + R[2][1] * Y + t[2]];
      return [p[0] / p[2] - obs[i][0], p[1] / p[2] - obs[i][1]]; });
    const aplica = (R, t, d) => [mul3(rodrigues(d.slice(0, 3)), R), t.map((v, i) => v + d[3 + i])];
    for(let it = 0; it < 12; it++){
      const r0 = residuos(R, t), J = r0.map(() => []), eps = 1e-6;
      for(let k = 0; k < 6; k++){ const d = [0, 0, 0, 0, 0, 0]; d[k] = eps; const [R2, t2] = aplica(R, t, d); const r = residuos(R2, t2); r.forEach((v, i) => { J[i][k] = (v - r0[i]) / eps; }); }
      const JtJ = [0, 1, 2, 3, 4, 5].map((a) => [0, 1, 2, 3, 4, 5].map((c) => J.reduce((s, f) => s + f[a] * f[c], 0) + (a === c ? 1e-9 : 0)));
      const Jtr = [0, 1, 2, 3, 4, 5].map((a) => -J.reduce((s, f, i) => s + f[a] * r0[i], 0));
      const d = resolver(JtJ, Jtr); [R, t] = aplica(R, t, d);
      if(Math.hypot(...d) < 1e-10) break;
    }
    const err = Math.sqrt(residuos(R, t).reduce((s, v) => s + v * v, 0) / 8) * fx;   /* en pixeles */
    const m = new THREE.Matrix4().set(R[0][0], R[0][1], R[0][2], t[0], R[1][0], R[1][1], R[1][2], t[1], R[2][0], R[2][1], R[2][2], t[2], 0, 0, 0, 1);
    return { m, error: err };
  }

  /* ESQUINAS A FRACCIÓN DE PIXEL: el detector las da redondeadas a pixel entero y con el marcador chiquito (brazo
     estirado, ~23 px) eso solo ya mueve la distancia 4-8 %. Por cada lado se busca el borde real (el salto más
     fuerte de claro a oscuro, afinado con una parábola), se ajusta una recta y las esquinas son los cruces. */
  function refinar(esq, rgba, w, h){
    const I = (x, y) => { if(x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return 0; const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
      const g = (xx, yy) => { const i = (yy * w + xx) * 4; return 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]; };
      return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy; };
    const lineas = [];
    for(let k = 0; k < 4; k++){
      const a = esq[k], b = esq[(k + 1) % 4], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
      if(L < 6) return esq;
      const nx = -dy / L, ny = dx / L, pts = [];
      for(let j = 1; j < 12; j++){
        const t = j / 12, px = a.x + dx * t, py = a.y + dy * t;
        /* n apunta hacia ADENTRO del marcador: se busca el paso de claro (afuera) a oscuro (adentro) más cercano a
           donde estaba el lado, no el más fuerte: el borde negro mide una celda (~4 px de lejos) y el borde interior,
           de negro a blanco, también es fuerte */
        const perfil = []; for(let s = -2.5; s <= 2.501; s += 0.25) perfil.push(I(px + nx * s, py + ny * s));
        const d = (i) => perfil[i - 1] - perfil[i + 1], centro = (perfil.length - 1) / 2;
        let sMejor = -1, mejor = 0;
        for(let i = 2; i < perfil.length - 2; i++){ const v = d(i); if(v > 12 && v >= d(i - 1) && v >= d(i + 1) && (sMejor < 0 || Math.abs(i - centro) < Math.abs(sMejor - centro))){ sMejor = i; mejor = v; } }
        if(sMejor < 0) continue;
        const dm = d(sMejor - 1), d0 = mejor, dp = d(sMejor + 1);
        const off = (dm - dp) / (2 * (dm - 2 * d0 + dp) || 1);   /* vértice de la parábola por los tres */
        const s = -2.5 + (sMejor + Math.max(-0.5, Math.min(0.5, off))) * 0.25;
        pts.push([px + nx * s, py + ny * s]);
      }
      if(pts.length < 4) return esq;
      /* recta por mínimos cuadrados totales: centro + dirección principal */
      const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      let sxx = 0, syy = 0, sxy = 0; for(const [x, y] of pts){ sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); lineas.push({ mx, my, ux: Math.cos(ang), uy: Math.sin(ang) });
    }
    /* la esquina k es el cruce del lado k-1 con el lado k */
    return esq.map((e, k) => { const A = lineas[(k + 3) % 4], B = lineas[k], det = A.ux * -B.uy - A.uy * -B.ux;
      if(Math.abs(det) < 1e-6) return e; const t = ((B.mx - A.mx) * -B.uy - (B.my - A.my) * -B.ux) / det;
      const p = { x: A.mx + A.ux * t, y: A.my + A.uy * t }; return Math.hypot(p.x - e.x, p.y - e.y) < 3 ? p : e; });
  }

  function cuadro(ahora){
    if(ahora - ultimo < 1000 / conf.hz) return; ultimo = ahora;
    const k = intrinsecos(), cam = poseCamara();
    if(!k || !cam || !video.videoWidth){ grupo.visible = false; return; }
    const w = Math.min(conf.ancho, video.videoWidth), h = Math.round(w * video.videoHeight / video.videoWidth);
    if(lienzo.width !== w){ lienzo.width = w; lienzo.height = h; }
    ctx.drawImage(video, 0, 0, w, h);
    const datos = ctx.getImageData(0, 0, w, h).data, marcas = detector.detectImage(w, h, datos).filter((m) => m.id === 0);
    cuenta++; if(ahora - ventana > 1000){ estado.hz = cuenta * 1000 / (ahora - ventana); cuenta = 0; ventana = ahora; }
    if(!marcas.length){
      estado.perdidoMs = ahora - vistoEn; estado.visto = false;
      if(estado.perdidoMs > 300) grupo.visible = false;   // sin marcador no hay pose: no se inventa
      return;
    }
    const s = w / k.ancho, { m: camMarc, error } = poseMarcador(refinar(marcas[0].corners, datos, w, h), k.fx * s, k.cx * s, k.cy * s);
    const T = new THREE.Matrix4().compose(new THREE.Vector3(...cam.p), new THREE.Quaternion(cam.q[1], cam.q[2], cam.q[3], cam.q[0]), new THREE.Vector3(1, 1, 1));
    mundo.multiplyMatrices(T, camMarc);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3();
    mundo.decompose(p, q, e); q.multiply(cal);
    /* un poco de suavizado: el marcador tiembla un par de pixeles entre cuadros */
    if(suave.p && suave.p.distanceTo(p) < 0.3){ suave.p.lerp(p, 0.5); suave.q.slerp(q, 0.5); } else { suave.p = p.clone(); suave.q = q.clone(); }
    grupo.matrix.compose(suave.p, suave.q, new THREE.Vector3(1, 1, 1)); grupo.matrixWorldNeedsUpdate = true; grupo.visible = true;
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(suave.q);
    /* a qué le apunta: el rayo contra lo anclado del mundo */
    const golpe = pegaA(suave.p, dir, objetivos());
    estado.apunta = golpe?.object?.name || null;
    rayo.material.color.set(golpe ? 0xffffff : 0xac27ff);
    vistoEn = ahora; estado.visto = true; estado.perdidoMs = 0; estado.detecciones++;
    estado.id = marcas[0].id; estado.error = +error.toFixed(3);
    estado.distancia = +new THREE.Vector3().setFromMatrixPosition(camMarc).length().toFixed(3);
    estado.pos = suave.p.toArray().map((v) => +v.toFixed(3)); estado.dir = dir.toArray().map((v) => +v.toFixed(3));
  }

  /* apunta el control hacia donde miras y se guarda cuánto quedó torcido el marcador */
  function calibrar(){
    const cam = poseCamara(); if(!cam || !estado.visto || !suave.q) return false;
    const frente = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(cam.q[1], cam.q[2], cam.q[3], cam.q[0]));
    const sinCal = suave.q.clone().multiply(cal.clone().invert());
    const local = frente.applyQuaternion(sinCal.clone().invert()).normalize();
    cal = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), local);
    try{ localStorage.setItem('mazixr-control-cal', JSON.stringify(cal.toArray())); }catch{}
    return true;
  }
  function tamano(cm){ conf.tam = cm / 100; try{ localStorage.setItem('mazixr-marcador-cm', String(cm)); }catch{} }
  return { cuadro, calibrar, tamano, estado, grupo, poseMarcador, refinar, pegaA, conf };
}
