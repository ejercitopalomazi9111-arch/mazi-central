/* SIMULADOR DE FÍSICA EN MAZI VR (Carlos, 25 nov: «movimiento parabólico, rectilíneo uniformemente acelerado, entre otros;
   gráfico, interactivo; de preferencia en VR»). Entra desde Juegos → Física; también sirve sin visor (modo pantalla).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   · Las cuentas viven en motor.js (probadas contra las fórmulas del libro). Aquí sólo se ve y se toca.
   · Sin carteles: arriba los modos, abajo los controles (−/+), y los números FLOTAN junto al balón mientras se mueve;
     a un lado, la gráfica que se va dibujando (x–t, v–t o la trayectoria y–x).
   · El balón es un modelo real (Poly Haven, CC0). La regla del piso marca los metros con la escala que quepa.
   · Gravedad de la Tierra, la Luna, Marte o Júpiter: el mismo tiro, otros números. */
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { estado, resumen, trayectoria, tiempoVuelo, GRAVEDADES } from './motor.js';
const AQUI = (f) => new URL(f, import.meta.url).href;
const MORADO = '#AC27FF', NARANJA = '#F7A23B';
const NOMBRES = { mru: 'MRU', mrua: 'MRUA', caida: 'Caída libre', vertical: 'Tiro vertical', parabolico: 'Tiro parabólico' };
const PARAMS = {
  mru: [['v', 'v', .5, 10, .5, 'm/s']],
  mrua: [['v0', 'v₀', 0, 20, 1, 'm/s'], ['a', 'a', -5, 5, .5, 'm/s²']],
  caida: [['h', 'h', 1, 60, 1, 'm']],
  vertical: [['v0', 'v₀', 1, 30, 1, 'm/s'], ['h', 'h', 0, 20, 1, 'm']],
  parabolico: [['v0', 'v₀', 1, 30, 1, 'm/s'], ['angulo', 'θ', 5, 85, 5, '°'], ['h', 'h', 0, 20, 1, 'm']],
};
const PLANETAS = [['tierra', 'Tierra'], ['luna', 'Luna'], ['marte', 'Marte'], ['jupiter', 'Júpiter']];
const f2 = (n) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2)).replace(/\.00$/, '');

export function montarFisica(V){
  const { THREE } = V;
  const F = { grupo: new THREE.Group(), modo: 'parabolico', p: { v: 3, v0: 15, a: 1.5, h: 0, angulo: 45, planeta: 'tierra' }, t: 0, corriendo: false, lento: false };
  const g = () => GRAVEDADES[F.p.planeta];
  const prm = () => ({ ...F.p, g: g() });

  /* ── el campo: una franja enfrente, de −2.4 a 2.4 m, a 3.2 m; la escala se ajusta a lo que vaya a recorrer ── */
  const campo = new THREE.Group(); campo.position.set(-.25, -.45, -2.8); F.grupo.add(campo);
  const ANCHO = 3.4, ORIGEN = -1.7, ALTO_MAX = 1.35;
  let escala = 1;   /* metros de la simulación → metros en el visor */
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO + .4, .5), new THREE.MeshBasicMaterial({ color: 0x24123A, transparent: true, opacity: .85 }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(0, -.005, 0); campo.add(piso);
  const regla = new V.Panel(ANCHO + .4, .26, 360); regla.malla.position.set(0, -.15, .12); campo.add(regla.malla);
  function pintarRegla(){
    const { x, cv } = regla, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    const metros = ANCHO / escala, paso = [1, 2, 5, 10, 20, 25, 50, 100, 200].find((s) => metros / s <= 10) || 500;
    const px = (m) => (.2 + m * escala) / (ANCHO + .4) * w;
    x.strokeStyle = '#C9B6DA'; x.lineWidth = 3; x.beginPath(); x.moveTo(px(0), 8); x.lineTo(px(metros), 8); x.stroke();
    x.fillStyle = '#F4EEF2'; x.font = '800 36px system-ui, -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top';
    for(let m = 0; m <= metros + 1e-6; m += paso){ x.beginPath(); x.moveTo(px(m), 0); x.lineTo(px(m), 26); x.stroke(); x.fillText(`${m} m`, px(m), 32); }
    regla.listo();
  }
  /* el balón (Poly Haven) y su estela */
  const balon = new THREE.Group(); campo.add(balon);
  new GLTFLoader().loadAsync(AQUI('medios/balon.glb')).then((gl) => { const s = gl.scene, b = new THREE.Box3().setFromObject(s), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = .14 / Math.max(t.x, t.y, t.z); s.scale.setScalar(k); s.position.copy(c.multiplyScalar(-k));
    s.traverse((o) => { if(o.isMesh){ const m = o.material; o.material = new THREE.MeshBasicMaterial({ map: m.map || null, color: m.map ? 0xffffff : m.color }); } }); balon.add(s); })
    .catch((e) => V.fallo?.('E-FISICA', 'cargar balon.glb', e));
  const N = 240, estelaGeo = new THREE.BufferGeometry(); estelaGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); estelaGeo.setDrawRange(0, 0);
  const estela = new THREE.Points(estelaGeo, new THREE.PointsMaterial({ color: 0xF7A23B, size: .03 })); campo.add(estela);
  const curvaGeo = new THREE.BufferGeometry(); curvaGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(81 * 3), 3));
  const curva = new THREE.Line(curvaGeo, new THREE.LineDashedMaterial({ color: 0xC77DFF, dashSize: .05, gapSize: .04, transparent: true, opacity: .7 })); campo.add(curva);
  /* de la simulación al visor: x a lo largo de la regla; la altura con la misma escala (o el piso si es caída) */
  const aVisor = (s, out) => out.set(ORIGEN + s.x * escala, s.y * escala + .08, 0);

  /* ── los números que flotan junto al balón, y la fórmula arriba ── */
  const etiqueta = new V.Panel(1.0, .36, 620); etiqueta.malla.material.depthTest = false; etiqueta.malla.renderOrder = 20; campo.add(etiqueta.malla);
  const formula = new V.Panel(2.8, .22, 620); formula.malla.position.set(.25, 1.82, .2); campo.add(formula.malla);
  const datos = new V.Panel(2.8, .2, 620); datos.malla.position.set(.25, 1.6, .2); campo.add(datos.malla);
  function escribir(P, lineas, tam = 44, color = '#FFFFFF'){
    const { x, cv } = P, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    lineas.forEach((l, i) => { let t = tam; x.font = `800 ${t}px system-ui, -apple-system, sans-serif`; while(x.measureText(l).width > w - 20 && t > 18){ t -= 2; x.font = `800 ${t}px system-ui, -apple-system, sans-serif`; }
      const y = h * (i + .5) / lineas.length; x.lineWidth = t * .18; x.strokeStyle = 'rgba(12,5,20,.92)'; x.strokeText(l, w / 2, y); x.fillStyle = i ? '#FFFFFF' : color; x.fillText(l, w / 2, y); });
    P.listo();
  }
  let ultimaEtiqueta = '';

  /* ── la gráfica que se va dibujando ── */
  const graf = new V.Panel(1.1, .82, 460); graf.malla.position.set(1.95, .25, -2.2); graf.malla.lookAt(0, .2, 0); F.grupo.add(graf.malla);
  let puntos = [];
  function pintarGrafica(){
    const { x, cv } = graf, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    V.redondo(x, 4, 4, w - 8, h - 8, 26); x.fillStyle = 'rgba(23,10,38,.85)'; x.fill();
    const tray = F.modo === 'parabolico', vert = F.modo === 'caida' || F.modo === 'vertical';
    const titulo = tray ? 'Trayectoria (y contra x)' : vert ? 'Altura y contra t' : 'Posición x contra t';
    x.fillStyle = NARANJA; x.font = '800 30px system-ui, -apple-system, sans-serif'; x.textAlign = 'left'; x.fillText(titulo, 24, 44);
    const L = 60, R = w - 24, T = 70, B = h - 50;
    x.strokeStyle = '#7E6A96'; x.lineWidth = 2; x.beginPath(); x.moveTo(L, T); x.lineTo(L, B); x.lineTo(R, B); x.stroke();
    x.fillStyle = '#C9B6DA'; x.font = '600 22px system-ui, -apple-system, sans-serif'; x.fillText(tray ? 'x (m)' : 't (s)', R - 70, B + 34); x.fillText(tray || vert ? 'y (m)' : 'x (m)', 8, T - 6);
    const pred = trayectoria(F.modo, prm(), 80, F.modo === 'mru' || F.modo === 'mrua' ? tMax() : null);
    const X = (s) => (tray ? s.x : s.t), Y = (s) => (tray || vert ? s.y : s.x);
    const mx = Math.max(1e-6, ...pred.map(X)), my = Math.max(1e-6, ...pred.map(Y));
    const px = (v) => L + v / mx * (R - L), py = (v) => B - v / my * (B - T);
    x.setLineDash([8, 6]); x.strokeStyle = 'rgba(199,125,255,.6)'; x.beginPath(); pred.forEach((s, i) => (i ? x.lineTo : x.moveTo).call(x, px(X(s)), py(Y(s)))); x.stroke(); x.setLineDash([]);
    if(puntos.length){ x.strokeStyle = NARANJA; x.lineWidth = 5; x.beginPath(); puntos.forEach((s, i) => (i ? x.lineTo : x.moveTo).call(x, px(X(s)), py(Y(s)))); x.stroke();
      const u = puntos.at(-1); x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(px(X(u)), py(Y(u)), 9, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#C9B6DA'; x.font = '600 20px system-ui, -apple-system, sans-serif'; x.textAlign = 'right'; x.fillText(f2(mx), R, B + 22); x.textAlign = 'left'; x.fillText(f2(my), 8, T + 18);
    graf.listo();
  }
  /* MRU y MRUA no terminan solos: se ven 6 s (o hasta que se detiene) */
  const tMax = () => { if(F.modo === 'mrua'){ const r = resumen('mrua', prm()); return r.tAlto ? Math.min(8, r.tAlto + 1) : 6; } if(F.modo === 'mru') return 6; return tiempoVuelo(F.modo, prm()); };

  /* ── los controles: modos arriba, parámetros abajo ── */
  let botones = [];
  function boton(texto, accion, ancho = .4, alto = .16){
    const p = new V.Panel(ancho, alto, 520); p.titulo = texto;
    const pintar = (f) => { const { x, cv } = p, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); V.redondo(x, 4, 4, w - 8, h - 8, (h - 8) / 2);
      x.fillStyle = p.activo ? '#4A1F73' : f ? '#3A1A5C' : '#24123A'; x.fill(); x.lineWidth = f || p.activo ? 6 : 3; x.strokeStyle = f || p.activo ? MORADO : '#3C2652'; x.stroke();
      x.fillStyle = '#F4EEF2'; let tam = 42; x.font = `800 ${tam}px system-ui, -apple-system, sans-serif`; while(x.measureText(texto).width > w - 28 && tam > 20){ tam -= 2; x.font = `800 ${tam}px system-ui, -apple-system, sans-serif`; } x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, w / 2, h / 2 + 2); p.listo(); };
    p.foco = (f) => { if(p._f === f) return; p._f = f; pintar(f); }; p._f = false; pintar(false);
    p.malla.userData.accion = accion; p.malla.userData.pintar = () => pintar(p._f);
    return p;
  }
  function fila(lista, y, z = -1.9){
    const ancho = lista.reduce((s, b) => s + b.malla.geometry.parameters.width + .05, -.05); let x = -ancho / 2;
    for(const b of lista){ const w = b.malla.geometry.parameters.width; b.malla.position.set(x + w / 2, y, z); b.malla.lookAt(0, y * .2, 0); x += w + .05; F.grupo.add(b.malla); botones.push(b.malla); }
  }
  function armarControles(){
    botones.forEach((b) => F.grupo.remove(b)); botones = [];
    fila(Object.entries(NOMBRES).map(([k, n]) => { const b = boton(n, () => { F.modo = k; reiniciar(); armarControles(); }, k === 'parabolico' ? .5 : .4); b.activo = F.modo === k; b.malla.userData.pintar(); return b; }), 1.62, -2.4);
    const ctrl = [];
    for(const [k, nom, mn, mx, paso, u] of PARAMS[F.modo]){
      const val = boton(`${nom} = ${f2(F.p[k])} ${u}`, () => {}, .46);
      ctrl.push(boton('−', () => { F.p[k] = Math.max(mn, +(F.p[k] - paso).toFixed(3)); reiniciar(); armarControles(); }, .14), val, boton('+', () => { F.p[k] = Math.min(mx, +(F.p[k] + paso).toFixed(3)); reiniciar(); armarControles(); }, .14));
    }
    fila(ctrl, -.74);
    const acc = [boton(F.corriendo ? 'Pausa' : 'Lanzar', () => { if(F.t >= tMax() - 1e-6) reiniciar(); F.corriendo = !F.corriendo; armarControles(); }, .4),
      boton('Reiniciar', () => { reiniciar(); armarControles(); }, .4), boton(F.lento ? 'Normal' : 'Lento', () => { F.lento = !F.lento; armarControles(); }, .36)];
    if(!['mru', 'mrua'].includes(F.modo)){ const i = PLANETAS.findIndex(([k]) => k === F.p.planeta); acc.push(boton(`g: ${PLANETAS[i][1]}`, () => { F.p.planeta = PLANETAS[(i + 1) % PLANETAS.length][0]; reiniciar(); armarControles(); }, .46)); }
    fila(acc, -.94);
  }
  function reiniciar(){
    F.t = 0; F.corriendo = false; puntos = []; estelaGeo.setDrawRange(0, 0);
    const pred = trayectoria(F.modo, prm(), 80, F.modo === 'mru' || F.modo === 'mrua' ? tMax() : null);
    const maxX = Math.max(.5, ...pred.map((s) => s.x)), maxY = Math.max(.5, ...pred.map((s) => s.y));
    escala = Math.min(ANCHO / maxX, ALTO_MAX / maxY);
    pintarRegla();
    const a = curvaGeo.attributes.position, v = new THREE.Vector3(); pred.forEach((s, i) => { aVisor(s, v); a.setXYZ(i, v.x, v.y, v.z); }); a.needsUpdate = true; curva.computeLineDistances();
    const r = resumen(F.modo, prm());
    escribir(formula, [r.formula + (r.formulaV ? '   ' + r.formulaV : '')], 70, '#C77DFF');
    const d = [];
    if(r.alcance != null) d.push(`alcance ${f2(r.alcance)} m`); if(r.hMax != null) d.push(`altura máx. ${f2(r.hMax)} m`); if(r.tVuelo != null) d.push(`tiempo de vuelo ${f2(r.tVuelo)} s`);
    if(r.vFinal != null) d.push(`llega a ${f2(r.vFinal)} m/s`); if(r.tAlto != null) d.push(`se detiene en ${f2(r.tAlto)} s, a ${f2(r.distanciaAlto)} m`);
    if(F.modo === 'mru') d.push(`en 6 s recorre ${f2(F.p.v * 6)} m`);
    escribir(datos, [d.join('  ·  ') || ' '], 64, NARANJA);
    pintarGrafica(); colocar(estado(F.modo, prm(), 0)); ultimaEtiqueta = '';
  }
  const pos = new THREE.Vector3();
  function colocar(s){
    aVisor(s, pos); balon.position.copy(pos);
    const txt = `t ${f2(s.t)} s · x ${f2(s.x)} m` + (['caida', 'vertical', 'parabolico'].includes(F.modo) ? ` · y ${f2(s.y)} m` : '') + `|v ${f2(Math.hypot(s.vx, s.vy))} m/s`;
    if(txt !== ultimaEtiqueta){ ultimaEtiqueta = txt; escribir(etiqueta, txt.split('|'), 54, NARANJA); }
    etiqueta.malla.position.set(Math.min(1.4, Math.max(-1.4, pos.x)), pos.y + .3, .1);
  }

  /* ── cada cuadro ── */
  let tAntes = 0, cuentaGraf = 0;
  F.cuadro = () => {
    const ahora = performance.now() / 1000, dt = tAntes ? Math.min(.05, ahora - tAntes) : 0; tAntes = ahora;
    if(!F.corriendo) return;
    F.t = Math.min(tMax(), F.t + dt * (F.lento ? .25 : 1));
    const s = estado(F.modo, prm(), F.t); colocar(s);
    puntos.push(s); const a = estelaGeo.attributes.position, n = Math.min(N, puntos.length); aVisor(s, pos); a.setXYZ((puntos.length - 1) % N, pos.x, pos.y, pos.z); a.needsUpdate = true; estelaGeo.setDrawRange(0, n);
    if(++cuentaGraf % 4 === 0) pintarGrafica();
    if(F.t >= tMax() - 1e-6){ F.corriendo = false; pintarGrafica(); armarControles(); }
  };
  F.entrar = () => { V.cuarto.visible = true; reiniciar(); armarControles(); };
  F.salir = () => { F.corriendo = false; };
  F.elegibles = () => botones;
  F.atras = () => V.ir('juegos');
  F.reiniciar = reiniciar; F.motor = { estado, resumen };
  V.registrar('fisica', F);
  window.__fisica = F;
  return F;
}
