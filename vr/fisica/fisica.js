/* SIMULADOR DE FÍSICA EN MAZI VR · v2 (Carlos, 26 nov, para enseñarlo el viernes):
     «meterlo en realidad mixta, acercar los botones, un pequeño menú del lado izquierdo… como Job Simulator… botones
      pequeños son molestos»; «modelos 3D a los proyectiles»; «que la parábola no esté previamente marcada, sino que se
      marque conforme va pasando, y si lo vuelves a tirar… se vea»; «comparar objetos»; «densidad de aire, de atmósfera,
      resistencias»; «VR, teléfono, computadora y el control»; «lo más sencillo posible».
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   · A LA IZQUIERDA, CERCA (a un brazo), una columna de botones GRANDES: Lanzar, el objeto, el movimiento, los números,
     el planeta, el aire, y abajo Lento / Borrar / Mixta. Cada renglón es [‹ − ] [ qué y cuánto ] [ + › ]; tocar el centro
     también avanza. Los botones se crean UNA vez y sólo se repintan (regla 13: cero parpadeo).
   · ENFRENTE, el campo con su regla. NADA se dibuja antes: el rastro aparece detrás del objeto mientras vuela. Cada tiro
     deja su rastro de su color y su marca donde cayó (hasta 5): tirar otra vez, cambiar el ángulo, el objeto o el aire, y
     se comparan lado a lado. Cambiar de movimiento o «Borrar» limpia.
   · Las cuentas, en motor.js: sin aire son las fórmulas del libro; con aire, paso a paso (probado en vr/pruebas-fisica.mjs).
   · Control: R2 lanza, L1/R1 cambian el objeto, ← → el ángulo (o lo primero que se pueda mover), ↑ ↓ la velocidad,
     △ la realidad mixta (como en todo Mazi VR). Teclado: Q/E objeto, flechas, Enter elige. */
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { estado, resumen, trayectoria, simular, enInstante, enTiempo, OBJETOS, LUGARES } from './motor.js';
import { crearLab } from './lab.js';
const AQUI = (f) => new URL(f, import.meta.url).href;
const MORADO = '#AC27FF', NARANJA = '#F7A23B', VINO = '#7E1735', FONDO = '#24123A', TEXTO = '#F4EEF2', SUAVE = '#C9B6DA';
const LETRA = 'system-ui, -apple-system, sans-serif';
/* los tiros y, después, los demás temas de 3.er semestre (lab.js) */
const MODOS = [['parabolico', 'Tiro parabólico'], ['vertical', 'Tiro vertical'], ['caida', 'Caída libre'], ['mrua', 'MRUA'], ['mru', 'MRU'],
  ['circular', 'Circular (MCU)'], ['plano', 'Plano inclinado'], ['pendulo', 'Péndulo y energía'], ['resorte', 'Resorte (Hooke)'], ['choque', 'Choques']];
const CON_G = ['caida', 'vertical', 'parabolico'];
/* [clave, nombre, mínimo, máximo, paso, unidad] */
const PARAMS = {
  mru: [['v', 'Velocidad', .5, 10, .5, 'm/s']],
  mrua: [['v0', 'Velocidad inicial', 0, 20, 1, 'm/s'], ['a', 'Aceleración', -5, 5, .5, 'm/s²']],
  caida: [['h', 'Altura', 1, 60, 1, 'm']],
  vertical: [['v0', 'Velocidad', 1, 30, 1, 'm/s'], ['h', 'Altura', 0, 20, 1, 'm']],
  parabolico: [['v0', 'Velocidad', 1, 30, 1, 'm/s'], ['angulo', 'Ángulo', 5, 85, 5, '°'], ['h', 'Altura', 0, 20, 1, 'm']],
};
/* qué tanto aire: veces la densidad del lugar (en la Luna no hay, por más que se suba) */
const AIRES = [[0, 'Sin aire'], [1, 'Normal'], [5, 'Espeso'], [25, 'Muy espeso']];
const OBJ = Object.keys(OBJETOS), LUG = Object.keys(LUGARES);
const MAX_RASTROS = 5;
const f2 = (n) => (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');
const rho = (n) => (n === 0 ? '0' : n < .1 ? n.toFixed(3) : n < 10 ? n.toFixed(2) : n.toFixed(0));

export function montarFisica(V){
  const { THREE } = V;
  const F = { grupo: new THREE.Group(), modo: 'parabolico', objeto: 'balon', lugar: 'tierra', aire: 1,
    p: { v: 3, v0: 15, a: 1.5, h: 0, angulo: 45, r: 2, T: 4, ang: 30, mu: .2, F: 0, L: 2, th0: 30, k: 40, x0: .4, v1: 3, m2: 1, v2: 0 }, t: 0, corriendo: false, lento: false, rebote: true, rastros: [], rapidez: 1 };
  const conG = () => CON_G.includes(F.modo);
  const densidad = () => LUGARES[F.lugar].rho * AIRES[F.aire][0];
  const prm = () => ({ ...F.p, g: LUGARES[F.lugar].g, rho: densidad(), objeto: OBJETOS[F.objeto], rebote: F.rebote });

  /* ═══ EL CAMPO, enfrente y un poco a la derecha (la izquierda es del menú) ═══ */
  /* (26 nov) el campo va más a la derecha y un poco más angosto: el menú de la izquierda se comía el arranque del tiro */
  const campo = new THREE.Group(); campo.position.set(.72, -.6, -2.3); F.grupo.add(campo);
  const ANCHO = 2.6, ORIGEN = -1.3, ALTO_MAX = 1.3;
  let escala = 1;   /* metros de la simulación → metros en el visor */
  const M = { minX: 0, minY: 0, dx: 0 };   /* dx: los temas se centran en el campo; los tiros salen de la orilla */   /* lo más a la izquierda y lo más abajo que hay que enseñar (los tiros salen de 0, 0) */
  const lab = crearLab({ V, THREE, campo }); for(const [k, t] of Object.entries(lab.TEMAS)) PARAMS[k] = t.params;
  const tema = () => lab.TEMAS[F.modo]; const esLab = () => !!tema();
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO + .4, .55), new THREE.MeshBasicMaterial({ color: 0x24123A, transparent: true, opacity: .8 }));
  piso.rotation.x = -Math.PI / 2; piso.position.set(0, -.005, -.1); campo.add(piso);
  const regla = new V.Panel(ANCHO + .4, .2, 360); regla.malla.position.set(0, -.12, .2); campo.add(regla.malla);
  let reglaPintada = '';
  function pintarRegla(){
    regla.malla.visible = !tema()?.sinRegla; piso.visible = !tema()?.sinRegla;
    const metros = ANCHO / escala, paso = [.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((s) => metros / s <= 8) || 1000;
    const llave = metros.toFixed(3); if(llave === reglaPintada) return; reglaPintada = llave;
    const { x, cv } = regla, w = cv.width; x.clearRect(0, 0, w, cv.height);
    const px = (m) => (.2 + m * escala) / (ANCHO + .4) * w;   /* la regla cuenta desde lo más a la izquierda */
    x.strokeStyle = SUAVE; x.lineWidth = 3; x.beginPath(); x.moveTo(px(0), 6); x.lineTo(px(metros), 6); x.stroke();
    x.fillStyle = TEXTO; x.font = `800 30px ${LETRA}`; x.textAlign = 'center'; x.textBaseline = 'top';
    for(let m = 0; m <= metros + 1e-6; m += paso){ x.beginPath(); x.moveTo(px(m), 0); x.lineTo(px(m), 20); x.stroke(); x.fillText(`${+m.toFixed(1)} m`, px(m), 26); }
    regla.listo();
  }
  /* de la simulación al visor: x a lo largo de la regla; la altura con la misma escala; cada rastro en su carril */
  const aVisor = (s, carril, out) => out.set(ORIGEN + M.dx + (s.x - M.minX) * escala, (s.y - M.minY) * escala, -carril * .07);
  const aV = (x, y) => new THREE.Vector3(ORIGEN + M.dx + (x - M.minX) * escala, (y - M.minY) * escala, 0);

  /* la salida: un poste si hay altura y una flecha que dice hacia dónde y qué tan fuerte (indicador, no dibujo) */
  const salida = new THREE.Group(); campo.add(salida); salida.position.x = ORIGEN;
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 10), new THREE.MeshBasicMaterial({ color: 0x7E6A96 })); salida.add(poste);
  const flecha = new THREE.Group(); salida.add(flecha);
  const cuerpoF = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1, 8), new THREE.MeshBasicMaterial({ color: 0xC77DFF, transparent: true, opacity: .75 }));
  const puntaF = new THREE.Mesh(new THREE.ConeGeometry(.026, .07, 12), new THREE.MeshBasicMaterial({ color: 0xC77DFF, transparent: true, opacity: .75 }));
  flecha.add(cuerpoF, puntaF);
  function ponerSalida(){
    if(esLab()){ poste.visible = flecha.visible = false; return; }
    const h = (conG() ? F.p.h : 0) * escala; poste.visible = h > .01; poste.scale.y = Math.max(.001, h); poste.position.y = h / 2;
    const ang = F.modo === 'parabolico' ? F.p.angulo : F.modo === 'vertical' ? 90 : 0, v = F.modo === 'mru' ? F.p.v : F.modo === 'caida' ? 0 : F.p.v0;
    flecha.visible = v > 0; const L = .12 + v * .012;
    flecha.position.set(0, h, 0); flecha.rotation.z = (ang - 90) * Math.PI / 180;
    cuerpoF.scale.y = L; cuerpoF.position.y = L / 2; puntaF.position.y = L + .03;
  }

  /* ═══ LOS OBJETOS: modelos reales de Poly Haven (CC0), cada uno a un tamaño que se vea ═══ */
  const TAM = { balon: .16, beisbol: .085, manzana: .095, americano: .2, piedra: .12 };
  const modelos = {}, cargando = {}, cargador = new GLTFLoader();
  function modelo(k){
    if(modelos[k]) return Promise.resolve(modelos[k]);
    return cargando[k] ||= cargador.loadAsync(AQUI('medios/' + OBJETOS[k].archivo)).then((gl) => {
      const s = gl.scene, b = new THREE.Box3().setFromObject(s), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const kk = TAM[k] / Math.max(t.x, t.y, t.z); s.scale.setScalar(kk); s.position.copy(c.multiplyScalar(-kk));
      s.traverse((o) => { if(o.isMesh){ const m = o.material; o.material = new THREE.MeshBasicMaterial({ map: m.map || null, color: m.map ? 0xffffff : m.color }); } });
      const g = new THREE.Group(); g.add(s); return (modelos[k] = g);
    }).catch((e) => { V.fallo?.('E-FISICA', 'cargar ' + OBJETOS[k].archivo, e); const g = new THREE.Mesh(new THREE.SphereGeometry(TAM[k] / 2, 16, 12), new THREE.MeshBasicMaterial({ color: OBJETOS[k].color })); return (modelos[k] = g); });
  }
  const proyectil = new THREE.Group(); campo.add(proyectil);
  let enMano = null;
  async function ponerObjeto(){
    const k = F.objeto, m = await modelo(k); if(k !== F.objeto) return;
    if(enMano === m) return; if(enMano) proyectil.remove(enMano); enMano = m; proyectil.add(m); m.rotation.set(0, 0, 0);
  }

  /* ═══ LOS RASTROS: se dibujan conforme vuela (puntos gordos: una línea de 1 pixel no se ve en el visor) ═══ */
  let vuelo = null;   /* el rastro que va volando */
  function nuevoRastro(sim){
    const o = OBJETOS[F.objeto], carril = F.rastros.length;
    const pts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: o.color, size: .026, sizeAttenuation: true, transparent: true, opacity: .95 }));
    const marca = new V.Panel(.62, .12, 520); marca.malla.visible = false; marca.malla.material.depthTest = false; marca.malla.renderOrder = 15;
    const r = { rebote: F.rebote, sim, carril, color: o.color, objeto: F.objeto, modo: F.modo, pts, marca, tiempos: [], aire: densidad(), lugar: F.lugar, angulo: F.p.angulo, v0: F.p.v0 };
    campo.add(pts, marca.malla); return r;
  }
  /* los puntos de un rastro, separados ~1.2 cm en el visor (no cada 1/240 s: a escala chica serían miles encimados) */
  function armarPuntos(r){
    const P = r.sim.puntos, pos = [], tiempos = [], v = new THREE.Vector3(), antes = new THREE.Vector3(Infinity, 0, 0);
    for(let i = 0; i < P.length; i++){ aVisor(P[i], r.carril, v); if(i === P.length - 1 || v.distanceTo(antes) >= .012){ pos.push(v.x, v.y, v.z); tiempos.push(P[i].t); antes.copy(v); } }
    r.pts.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.tiempos = tiempos;
    r.pts.geometry.setDrawRange(0, r === vuelo ? contar(r, F.t) : tiempos.length);
    aVisor(P.at(-1), r.carril, v);
    r.marca.malla.position.set(Math.min(ANCHO / 2 + .1, v.x), v.y + .1 + r.carril * .03, v.z + .02);
  }
  const contar = (r, t) => { let n = 0; while(n < r.tiempos.length && r.tiempos[n] <= t) n++; return n; };
  function pintarMarca(r){
    const { x, cv } = r.marca, w = cv.width, h = cv.height, s = r.sim, nom = OBJETOS[r.objeto].nombre;
    const t = lab.TEMAS[r.modo] ? lab.TEMAS[r.modo].marca(s, nom) : CON_G.includes(r.modo) ? `${nom} ${r.modo === 'parabolico' ? f2(s.primero ?? s.alcance) + ' m' : f2(s.tPrimero || s.tVuelo) + ' s'}${s.botes ? ` · ${s.botes} bote${s.botes > 1 ? 's' : ''}` : ''}` : `${nom} ${f2(s.puntos.at(-1).x)} m`;
    x.clearRect(0, 0, w, h); x.font = `800 46px ${LETRA}`; const tw = Math.min(w - 8, x.measureText(t).width + 40);
    V.redondo(x, (w - tw) / 2, 4, tw, h - 8, (h - 8) / 2); x.fillStyle = 'rgba(23,10,38,.9)'; x.fill(); x.lineWidth = 5; x.strokeStyle = r.color; x.stroke();
    x.fillStyle = r.color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, w / 2, h / 2 + 2); r.marca.listo(); r.marca.malla.visible = true;
  }
  function quitarRastro(r){ campo.remove(r.pts, r.marca.malla); r.pts.geometry.dispose(); r.pts.material.dispose(); r.marca.malla.material.map?.dispose(); r.marca.malla.material.dispose(); }
  function borrarRastros(){ F.rastros.forEach(quitarRastro); F.rastros = []; vuelo = null; }

  /* ═══ LOS NÚMEROS QUE FLOTAN junto al objeto, y arriba la fórmula y el resultado ═══ */
  const etiqueta = new V.Panel(1.0, .3, 560); etiqueta.malla.material.depthTest = false; etiqueta.malla.renderOrder = 20; campo.add(etiqueta.malla);
  const formula = new V.Panel(3.0, .2, 560); formula.malla.position.set(0, ALTO_MAX + .42, -.25); campo.add(formula.malla);
  const datos = new V.Panel(3.0, .17, 560); datos.malla.position.set(0, ALTO_MAX + .24, -.25); campo.add(datos.malla);
  const escritos = new Map();
  function escribir(P, lineas, tam = 44, color = '#FFFFFF'){
    const llave = lineas.join('|') + tam + color; if(escritos.get(P) === llave) return; escritos.set(P, llave);
    const { x, cv } = P, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    lineas.forEach((l, i) => { let t = tam; x.font = `800 ${t}px ${LETRA}`; while(x.measureText(l).width > w - 20 && t > 16){ t -= 2; x.font = `800 ${t}px ${LETRA}`; }
      const y = h * (i + .5) / lineas.length; x.lineWidth = t * .18; x.strokeStyle = 'rgba(12,5,20,.92)'; x.strokeText(l, w / 2, y); x.fillStyle = i ? '#FFFFFF' : color; x.fillText(l, w / 2, y); });
    P.listo();
  }

  /* ═══ LA GRÁFICA, a la derecha: cada tiro con su color ═══ */
  const graf = new V.Panel(1.05, .8, 460); graf.malla.position.set(2.05, .05, -1.05); graf.malla.lookAt(0, 0, 0); F.grupo.add(graf.malla);
  function pintarGrafica(){
    const { x, cv } = graf, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    V.redondo(x, 4, 4, w - 8, h - 8, 26); x.fillStyle = 'rgba(23,10,38,.88)'; x.fill();
    const tray = F.modo === 'parabolico', vert = F.modo === 'caida' || F.modo === 'vertical', G = tema()?.grafica;
    x.fillStyle = NARANJA; x.font = `800 30px ${LETRA}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillText(G ? G.titulo : tray ? 'Trayectoria (y contra x)' : vert ? 'Altura contra tiempo' : 'Posición contra tiempo', 24, 44);
    const L = 64, R = w - 24, T = 70, B = h - 50;
    x.strokeStyle = '#7E6A96'; x.lineWidth = 2; x.beginPath(); x.moveTo(L, T); x.lineTo(L, B); x.lineTo(R, B); x.stroke();
    x.fillStyle = SUAVE; x.font = `600 22px ${LETRA}`; x.fillText(G ? G.ejeX : tray ? 'x (m)' : 't (s)', R - 70, B + 34); x.fillText(G ? G.ejeY : tray || vert ? 'y (m)' : 'x (m)', 8, T - 8);
    const X = (s) => (tray ? s.x : s.t);
    /* las series: en los tiros, una por tiro (de su color); en los temas, la suya (el péndulo grafica tres energías del último) */
    const series = (r) => G?.series ? G.series : [[G?.Y || ((s) => (tray || vert ? s.y : s.x)), r.color]];
    const cuales = G?.series ? F.rastros.slice(-1) : F.rastros;
    let mx = 1e-6, my = 1e-6, ny = 0; for(const r of cuales) for(const [Y] of series(r)) for(const s of r.sim.puntos){ if(X(s) > mx) mx = X(s); const y = Y(s); if(y > my) my = y; if(y < ny) ny = y; }
    if(G?.conNegativos){ const a = Math.max(my, -ny); my = a; ny = -a; } else ny = 0;
    const px = (v) => L + v / mx * (R - L), py = (v) => B - (v - ny) / (my - ny) * (B - T);
    if(ny < 0){ x.strokeStyle = '#4A3A5E'; x.beginPath(); x.moveTo(L, py(0)); x.lineTo(R, py(0)); x.stroke(); }
    for(const r of cuales) for(const [Y, color] of series(r)){
      const hasta = r === vuelo ? F.t : Infinity, P = r.sim.puntos, paso = Math.max(1, Math.floor(P.length / 200));
      x.strokeStyle = color; x.lineWidth = r === F.rastros.at(-1) ? 6 : 3.5; x.beginPath();
      for(let i = 0; i < P.length && P[i].t <= hasta; i += paso) (i ? x.lineTo : x.moveTo).call(x, px(X(P[i])), py(Y(P[i])));
      const u = hasta < Infinity ? (esLab() ? enTiempo(r.sim, hasta) : enInstante(r.sim, hasta)) : P.at(-1); x.lineTo(px(X(u)), py(Y(u))); x.stroke();
      if(r === vuelo){ x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(px(X(u)), py(Y(u)), 8, 0, Math.PI * 2); x.fill(); }
    }
    if(!F.rastros.length){ x.fillStyle = SUAVE; x.font = `700 28px ${LETRA}`; x.textAlign = 'center'; x.fillText(esLab() ? 'Empieza para ver la gráfica' : 'Lanza para ver la gráfica', (L + R) / 2, (T + B) / 2); }
    else { x.fillStyle = SUAVE; x.font = `600 20px ${LETRA}`; x.textAlign = 'right'; x.fillText(f2(mx), R, B + 22); x.textAlign = 'left'; x.fillText(f2(my), 8, T + 18); if(ny < 0) x.fillText(f2(ny), 8, B - 4); }
    graf.listo();
  }

  /* ═══ EL MENÚ DE LA IZQUIERDA: botones grandes, a un brazo ═══ */
  const menu = new THREE.Group(); F.grupo.add(menu);
  menu.position.set(-.56, -.2, -.54); menu.lookAt(0, -.2, 0);   /* un Object3D mira con +z: queda de frente a ti */
  const botones = [];
  /* el menú va en CURVA, como el tablero de un coche: cada renglón a la misma distancia de tu cabeza y de frente a ti,
     así los de abajo no quedan lejos (en plano, el último quedaba a 1.1 m) */
  const D = menu.position.length();
  const enCurva = (m, x, y) => { const z = D - Math.sqrt(Math.max(0, D * D - y * y)); m.position.set(x, y, z); m.rotation.set(Math.atan2(y, D - z), 0, 0); };
  /* un botón que se pinta sólo cuando cambia lo que dice o si está enfocado */
  function Boton(w, h, accion, { repetir = false, fuerte = false } = {}){
    const p = new V.Panel(w, h, 1400);   /* a 1400 px por metro: la letra se lee nítida de cerca */ p._f = false; p.dice = {}; p.fuerte = fuerte; p.alto = h;
    p.pintar = () => {
      const d = p.dice, { x, cv } = p, W = cv.width, H = cv.height, f = p._f, act = d.activo;
      x.clearRect(0, 0, W, H); V.redondo(x, 5, 5, W - 10, H - 10, Math.min(36, (H - 10) / 2.4));
      x.fillStyle = p.fuerte ? (f ? '#A3214A' : VINO) : act ? '#4A1F73' : f ? '#3A1A5C' : FONDO; x.fill();
      x.lineWidth = f ? 9 : 4; x.strokeStyle = f ? MORADO : act ? '#8A4DC0' : '#3C2652'; x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const ajusta = (t, tam, peso = 800) => { x.font = `${peso} ${tam}px ${LETRA}`; while(x.measureText(t).width > W - 30 && tam > 18){ tam -= 2; x.font = `${peso} ${tam}px ${LETRA}`; } };
      const valor = d.valor ?? '';
      if(d.arriba){ ajusta(d.arriba, H * .28, 700); x.fillStyle = SUAVE; x.fillText(d.arriba, W / 2, H * .29); ajusta(valor, H * .42); x.fillStyle = d.color || TEXTO; x.fillText(valor, W / 2, H * .68); }
      else { ajusta(valor, d.tam || H * .5); x.fillStyle = d.color || TEXTO; x.fillText(valor, W / 2, H / 2 + 2); }
      p.listo();
    };
    p.poner = (d) => { const a = JSON.stringify(d); if(a === p._llave) return; p._llave = a; p.dice = d; p.titulo = d.valor; p.pintar(); };   /* titulo: lo que dice (lectores y la persona simulada) */
    p.foco = (f) => { if(p._f === f) return; p._f = f; p.pintar(); };
    p.malla.userData.accion = accion; if(repetir) p.malla.userData.repetir = true;
    botones.push(p.malla); menu.add(p.malla); return p;
  }
  const ANCHO_M = .56, ALTO_R = .095, HUECO = .014, FLECHA = .1;
  /* renglón [‹][ qué = cuánto ][›] */
  function Renglon(menos, mas, centro, { flechas = ['‹', '›'] } = {}){
    const r = { a: Boton(FLECHA, ALTO_R, menos, { repetir: true }), c: Boton(ANCHO_M - 2 * FLECHA - 2 * HUECO, ALTO_R, centro || mas), b: Boton(FLECHA, ALTO_R, mas, { repetir: true }) };
    r.a.poner({ valor: flechas[0], tam: 64 }); r.b.poner({ valor: flechas[1], tam: 64 });
    r.poner = (arriba, valor, color) => { r.c.poner({ arriba, valor, color }); r.c.titulo = `${arriba}: ${valor}`; r.a.titulo = `${arriba} ${r.a.dice.valor}`; r.b.titulo = `${arriba} ${r.b.dice.valor}`; };
    r.mostrar = (si) => { [r.a, r.b, r.c].forEach((p) => { p.malla.visible = si; }); };
    r.en = (y) => { enCurva(r.a.malla, -ANCHO_M / 2 + FLECHA / 2, y); enCurva(r.c.malla, 0, y); enCurva(r.b.malla, ANCHO_M / 2 - FLECHA / 2, y); };
    r.alto = ALTO_R; return r;
  }
  const vuelta = (lista, k, d) => lista[(lista.indexOf(k) + d + lista.length) % lista.length];
  const lanzarB = Boton(ANCHO_M, .13, () => lanzar(), { fuerte: true });
  const rObjeto = Renglon(() => cambiar(() => { F.objeto = vuelta(OBJ, F.objeto, -1); }), () => cambiar(() => { F.objeto = vuelta(OBJ, F.objeto, 1); }));
  const rModo = Renglon(() => cambiarModo(-1), () => cambiarModo(1));
  /* cada número tiene su renglón (Velocidad de MRU es «v» y la de los tiros «v0»: son dos claves, dos renglones) */
  const rParam = {}; for(const lista of Object.values(PARAMS)) for(const [k, , mn, mx, paso] of lista) rParam[k] ||= Renglon(
    () => cambiar(() => { F.p[k] = Math.max(mn, +(F.p[k] - paso).toFixed(3)); }), () => cambiar(() => { F.p[k] = Math.min(mx, +(F.p[k] + paso).toFixed(3)); }), () => {}, { flechas: ['−', '+'] });
  const rLugar = Renglon(() => cambiar(() => { F.lugar = vuelta(LUG, F.lugar, -1); }), () => cambiar(() => { F.lugar = vuelta(LUG, F.lugar, 1); }));
  const rAire = Renglon(() => cambiar(() => { F.aire = (F.aire + AIRES.length - 1) % AIRES.length; }), () => cambiar(() => { F.aire = (F.aire + 1) % AIRES.length; }));
  const W3 = (ANCHO_M - 3 * HUECO) / 4;
  const lentoB = Boton(W3, ALTO_R, () => { F.lento = !F.lento; pintarMenu(); });
  const reboteB = Boton(W3, ALTO_R, () => { if(!conG() && F.modo !== 'choque'){ V.hud?.('Aquí no hay rebote'); return; } cambiar(() => { F.rebote = !F.rebote; }); });
  const borrarB = Boton(W3, ALTO_R, () => { if(F.corriendo) terminar(); borrarRastros(); reiniciar(); });
  const mixtaB = Boton(W3, ALTO_R, () => { if(V.camTex){ V.ponerMixta(!V.AJ.mixta); V.cuarto.visible = !V.AJ.mixta; V.hud?.(V.AJ.mixta ? 'Realidad mixta' : 'Realidad virtual'); } else V.hud?.('Sin cámara'); pintarMenu(); });
  const utiles = { alto: ALTO_R, en: (y) => { [lentoB, reboteB, borrarB, mixtaB].forEach((b, i) => enCurva(b.malla, -ANCHO_M / 2 + W3 / 2 + i * (W3 + HUECO), y)); } };
  function acomodar(){
    const filas = [{ alto: lanzarB.alto, en: (y) => enCurva(lanzarB.malla, 0, y) }, rObjeto, rModo, ...PARAMS[F.modo].map(([k]) => rParam[k])];
    if(conG()) filas.push(rLugar, rAire); else if(tema()?.conLugar) filas.push(rLugar);
    filas.push(utiles);
    Object.values(rParam).forEach((r) => r.mostrar(false)); rLugar.mostrar(conG() || !!tema()?.conLugar); rAire.mostrar(conG()); lab.mostrar(F.modo);
    PARAMS[F.modo].forEach(([k]) => rParam[k].mostrar(true));
    const total = filas.reduce((t, f) => t + f.alto + HUECO, -HUECO); let y = Math.min(.42, total / 2 + .05); for(const f of filas){ f.en(y - f.alto / 2); y -= f.alto + HUECO; }
  }
  function pintarMenu(){
    const o = OBJETOS[F.objeto];
    lanzarB.poner({ valor: esLab() ? (F.corriendo ? 'En marcha…' : F.rastros.length ? 'Otra vez' : 'Empezar') : F.corriendo ? 'Volando…' : F.rastros.length ? 'Lanzar otra vez' : 'Lanzar', tam: 62 });
    rObjeto.poner('Objeto', `${o.nombre} · ${o.m >= 1 ? o.m + ' kg' : Math.round(o.m * 1000) + ' g'}`, o.color);
    rModo.poner('Movimiento', MODOS.find(([k]) => k === F.modo)[1]);
    for(const [k, nom, , , , u] of PARAMS[F.modo]) rParam[k].poner(nom, `${f2(F.p[k])} ${u}`.replace(' °', '°'));
    const L = LUGARES[F.lugar]; rLugar.poner('Lugar', `${L.nombre} · g ${L.g} m/s²`);
    rAire.poner('Aire', L.rho === 0 ? 'No hay aire' : `${AIRES[F.aire][1]} · ${rho(densidad())} kg/m³`);
    lentoB.poner({ valor: 'Lento', activo: F.lento }); reboteB.poner({ valor: F.modo === 'choque' ? (F.rebote ? 'Rebotan' : 'Se pegan') : 'Rebote', activo: F.rebote && (conG() || F.modo === 'choque') }); borrarB.poner({ valor: 'Borrar' });
    mixtaB.poner({ valor: 'Mixta', activo: V.AJ.mixta });
  }

  /* ═══ CAMBIOS Y TIROS ═══ */
  function cambiar(fn){ if(F.corriendo) terminar(); fn(); ponerObjeto(); preparar(); pintarMenu(); }
  function cambiarModo(d){ if(F.corriendo) terminar(); F.modo = vuelta(MODOS.map(([k]) => k), F.modo, d); borrarRastros(); acomodar(); preparar(); pintarMenu(); }
  /* MRU y MRUA no terminan solos: se ven 6 s (o hasta que se detiene) */
  const tMax = () => { if(F.modo === 'mrua'){ const r = resumen('mrua', F.p); return r.tAlto ? Math.min(8, r.tAlto + 1) : 6; } return 6; };
  function hacerSim(){
    if(esLab()) return tema().sim(F.p, { m: OBJETOS[F.objeto].m, g: LUGARES[F.lugar].g, rebote: F.rebote });
    if(conG()) return simular(F.modo, prm());
    const n = Math.round(tMax() * 240), P = trayectoria(F.modo, F.p, n, n / 240);
    return { puntos: P, tVuelo: n / 240, alcance: P.at(-1).x, hMax: 0, vFinal: Math.hypot(P.at(-1).vx, P.at(-1).vy) };
  }
  /* la escala que cabe: el tiro que viene y los que ya están */
  function ajustarEscala(extra){
    let a = 0, b = .5, c = 0, d = .5;
    for(const s of [...F.rastros.map((r) => r.sim), extra].filter(Boolean)){
      if(esLab()){ const m = tema().marco(s); a = Math.min(a, m.minX); b = Math.max(b, m.maxX); c = Math.min(c, m.minY); d = Math.max(d, m.maxY); }
      else for(const q of s.puntos){ if(q.x > b) b = q.x; if(q.y > d) d = q.y; } }
    if(esLab()){ a = Math.min(a, b - .5); }
    const nueva = Math.min(ANCHO / (b - a), ALTO_MAX / (d - c));
    const dx = esLab() ? (ANCHO - (b - a) * nueva) / 2 : 0;
    if(Math.abs(nueva - escala) > 1e-9 || a !== M.minX || c !== M.minY || dx !== M.dx){ escala = nueva; M.minX = a; M.minY = c; M.dx = dx; F.rastros.forEach((r) => armarPuntos(r)); }
    pintarRegla();
  }
  function preparar(){
    /* antes de lanzar: el objeto en la salida, la flecha, la escala para que quepa lo que va a pasar (sin enseñarlo) */
    const s = hacerSim(); ajustarEscala(s); ponerSalida(); F.t = 0; simVista = s;
    if(esLab()) tema().armar(s, aV, escala, TAM[F.objeto], modelo);
    colocar(s.puntos[0], F.rastros.length); etiqueta.malla.visible = false;
    escribirFormula(); if(!F.rastros.length) escribir(datos, [esLab() ? 'Toca «Empezar»' : 'Lanza para ver qué pasa'], 56, NARANJA);
    pintarGrafica();
  }
  function lanzar(){
    if(F.corriendo) return;
    if(F.rastros.length >= MAX_RASTROS){ quitarRastro(F.rastros.shift()); F.rastros.forEach((r, i) => { r.carril = i; }); }
    const s = hacerSim(); vuelo = nuevoRastro(s); F.rastros.push(vuelo);
    ajustarEscala(s); F.rastros.forEach((r) => armarPuntos(r)); simVista = s;
    if(esLab()) tema().armar(s, aV, escala, TAM[F.objeto], modelo);
    F.t = 0; F.corriendo = true; etiqueta.malla.visible = true; if(esLab()) escribir(datos, [' '], 56, NARANJA);
    /* que ningún tiro tarde más de ~5 s de verdad (en la Luna un tiro dura 20 s); los temas, hasta ~10 s */
    F.rapidez = Math.max(1, s.tVuelo / (esLab() ? 10 : 5));
    pintarMenu();
  }
  function terminar(){
    const r = vuelo; if(!r) return; F.t = r.sim.tVuelo; F.corriendo = false; vuelo = null;
    r.pts.geometry.setDrawRange(0, r.tiempos.length); colocar(r.sim.puntos.at(-1), r.carril); pintarMarca(r); escribirResultado(r); pintarGrafica(); pintarMenu();
  }
  let simVista = null;   /* lo que se está enseñando ahora (el último preparado o el que corre) */
  function escribirFormula(){
    if(esLab()){ escribir(formula, [simVista?.formula || ''], 64, '#C77DFF'); return; }
    const r = resumen(F.modo, { ...F.p, g: LUGARES[F.lugar].g });
    const conAire = conG() && densidad() > 0;
    escribir(formula, [r.formula + (r.formulaV ? '   ' + r.formulaV : '') + (conAire ? '   + el aire frena: ½·ρ·Cd·A·v²' : '')], 64, '#C77DFF');
  }
  function escribirResultado(r){
    const s = r.sim, nom = OBJETOS[r.objeto].nombre, d = [];
    if(lab.TEMAS[r.modo]){ escribir(datos, [lab.TEMAS[r.modo].resultado(s, nom).join('  ·  ')], 56, r.color); return; }
    if(r.modo === 'parabolico') d.push(`${nom}: cayó a ${f2(s.primero ?? s.alcance)} m`, `subió ${f2(s.hMax)} m`, `${f2(s.tPrimero || s.tVuelo)} s en el aire`, ...(s.botes ? [`rebotó ${s.botes} veces y paró a ${f2(s.alcance)} m`] : []));
    else if(r.modo === 'vertical') d.push(`${nom}: subió hasta ${f2(s.hMax)} m`, `${f2(s.tPrimero || s.tVuelo)} s en el aire`, ...(s.botes ? [`rebotó ${s.botes} veces`] : []));
    else if(r.modo === 'caida') d.push(`${nom}: cayó en ${f2(s.tPrimero || s.tVuelo)} s`, `llegó a ${f2(s.vFinal)} m/s`, ...(s.botes ? [`rebotó ${s.botes} veces`] : []));
    else if(r.modo === 'mrua'){ const q = resumen('mrua', F.p); d.push(q.tAlto ? `se detuvo en ${f2(q.tAlto)} s, a ${f2(q.distanciaAlto)} m` : `en ${f2(s.tVuelo)} s recorrió ${f2(s.alcance)} m`); }
    else d.push(`en ${f2(s.tVuelo)} s recorrió ${f2(s.alcance)} m`);
    if(CON_G.includes(r.modo) && r.aire > 0){ const sin = simular(r.modo, { ...F.p, angulo: r.angulo, v0: r.v0, g: LUGARES[r.lugar].g, rho: 0, objeto: OBJETOS[r.objeto] });
      d.push(r.modo === 'parabolico' ? `sin aire: ${f2(sin.primero)} m` : r.modo === 'vertical' ? `sin aire: ${f2(sin.hMax)} m` : `sin aire: ${f2(sin.tPrimero)} s`); }
    escribir(datos, [d.join('  ·  ')], 56, r.color);
  }
  const pos = new THREE.Vector3();
  function colocar(s, carril){
    aVisor(s, carril, pos); const T_ = tema(), tam = TAM[F.objeto];
    if(T_?.ajuste) T_.ajuste(pos, simVista, tam);
    proyectil.position.copy(pos);
    if(T_){ if(simVista) T_.poner(s, simVista, aV, escala, pos, tam); if(enMano && !T_.sinGiro) enMano.rotation.z = -(s.th || 0) * 3;
      escribir(etiqueta, T_.etiqueta(s, simVista).split('|'), 50, NARANJA); const e = T_.etiquetaEn?.(pos, simVista, aV) || pos.clone().add(new THREE.Vector3(0, .26, 0)); etiqueta.malla.position.set(Math.min(1.3, Math.max(-1.3, e.x)), e.y, pos.z + .1); return; }
    if(enMano){ const v = Math.hypot(s.vx, s.vy);
      if(F.objeto === 'americano'){ if(v > .01) enMano.rotation.set(0, 0, Math.atan2(s.vy, s.vx)); }   /* en espiral: la punta por delante */
      else enMano.rotation.z = -s.x * escala / (TAM[F.objeto] / 2) - (conG() ? s.t * 2 : 0); }
    const txt = `t ${f2(s.t)} s · x ${f2(s.x)} m` + (conG() ? ` · y ${f2(s.y)} m` : '') + `|v ${f2(Math.hypot(s.vx, s.vy))} m/s` + (F.rapidez > 1.05 && F.corriendo ? `  (×${f2(F.rapidez)} más rápido)` : '');
    escribir(etiqueta, txt.split('|'), 50, NARANJA);
    etiqueta.malla.position.set(Math.min(1.3, Math.max(-1.3, pos.x)), pos.y + .26, pos.z + .1);
  }

  /* ═══ CADA CUADRO ═══ */
  let tAntes = 0, cuentaGraf = 0;
  F.cuadro = () => {
    const ahora = performance.now() / 1000, dt = tAntes ? Math.min(.05, ahora - tAntes) : 0; tAntes = ahora;
    if(!F.corriendo || !vuelo) return;
    F.t = Math.min(vuelo.sim.tVuelo, F.t + dt * (F.lento ? .25 : 1) * (F.rapidez || 1));
    const s = esLab() ? enTiempo(vuelo.sim, F.t) : enInstante(vuelo.sim, F.t); colocar(s, vuelo.carril);
    vuelo.pts.geometry.setDrawRange(0, contar(vuelo, F.t));
    if(++cuentaGraf % 4 === 0) pintarGrafica();
    if(F.t >= vuelo.sim.tVuelo - 1e-9) terminar();
  };
  /* el control: R2 lanza, L1/R1 objeto, ← → ángulo (o la altura / la aceleración), ↑ ↓ velocidad */
  F.control = (c) => {
    const B = V.B; if(!B) return {};
    if(c.oprimidoPad[B.R2]) lanzar();
    if(c.oprimidoPad[B.L1]) cambiar(() => { F.objeto = vuelta(OBJ, F.objeto, -1); });
    if(c.oprimidoPad[B.R1]) cambiar(() => { F.objeto = vuelta(OBJ, F.objeto, 1); });
    const L = PARAMS[F.modo], horiz = esLab() ? L[1] : L.find(([k]) => k === 'angulo') || L.find(([k]) => k === 'a' || k === 'h'), vert = esLab() ? L[0] : L.find(([k]) => k === 'v0' || k === 'v') || null;
    const mover = (def, d) => { if(!def) return; const [k, , mn, mx, paso] = def; cambiar(() => { F.p[k] = Math.min(mx, Math.max(mn, +(F.p[k] + d * paso).toFixed(3))); }); };
    if(c.oprimidoPad[B.IZQ]) mover(horiz, -1); if(c.oprimidoPad[B.DER]) mover(horiz, 1);
    if(c.oprimidoPad[B.ARRIBA]) mover(vert || horiz, 1); if(c.oprimidoPad[B.ABAJO]) mover(vert || horiz, -1);
    if(c.oprimido[B.TRIANGULO]) setTimeout(pintarMenu, 0);   /* △ cambia la mixta en todo Mazi VR: el botón lo refleja */
    return { flechas: true };
  };
  function reiniciar(){ F.corriendo = false; vuelo = null; ponerObjeto(); preparar(); pintarMenu(); }
  /* la mano fantasma enseña a pellizcar «Lanzar» hasta el primer tiro */
  let maestro = null, tiros = 0; import('../maestro.js').then(({ crearMaestro }) => crearMaestro(V, F.grupo)).then((m) => { maestro = m; }).catch(() => {});
  const cuadroAntes = F.cuadro; let entroEn = 0;
  F.cuadro = () => { cuadroAntes(); if(!maestro) return; if(F.rastros.length) tiros = 1;
    if(!tiros && performance.now() - entroEn > 4000){ const p = F.grupo.worldToLocal(lanzarB.malla.getWorldPosition(new THREE.Vector3())); if(maestro.activo !== 'pellizcar') maestro.mostrar('pellizcar', p, { base: p.clone().add(new THREE.Vector3(.22, -.05, .1)) }); maestro.cuadro(); }
    else if(maestro.activo) maestro.ocultar(); };
  F.entrar = () => { entroEn = performance.now(); V.cuarto.visible = !V.AJ.mixta; acomodar(); reiniciar(); };   /* respeta la realidad mixta (antes la tapaba con el cuarto) */
  F.salir = () => { if(F.corriendo) terminar(); };
  F.elegibles = () => botones.filter((b) => b.visible); F.F_todos = () => botones;
  F.atras = () => V.ir('juegos');
  F.reiniciar = reiniciar; F.lanzar = lanzar; F.terminar = terminar; F.motor = { estado, resumen, simular };
  F.botones = { reboteB, lanzarB, rObjeto, rModo, rParam, rLugar, rAire, lentoB, borrarB, mixtaB };
  V.registrar('fisica', F);
  window.__fisica = F;
  return F;
}
