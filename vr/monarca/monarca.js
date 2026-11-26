/* MONARCH XR · la experiencia educativa de la mariposa monarca, con el MISMO motor de Mazi VR.
   Proyecto de Ética y STEAM de Carlos. Plan y datos verificados: are/Documentation/MONARCH_XR.md y vr/monarca/CIENCIA.md.
     · ARRANQUE (Carlos, 25 nov): el OPERADOR elige el idioma (español o inglés), sale una cuenta de 5 s para entregar el
       visor, y empieza el TUTORIAL (vr/tutorial.js: mirar, manos, apuntar, elegir). El gesto de atrás (palma arriba o
       Círculo) lo salta.
     · SIN CARTELES (Carlos, 25 nov): lo cuenta el narrador con subtítulos; en el aire sólo flotan el título y las cifras
       clave, cuando el narrador las dice (rotulos.js).
     · NARRADOR (narrador.js / narrador-en.js): explica (Orus) y reacciona a lo que haces (Charon), recuerda lo que hiciste
       y te lo saca después (memoria.js), y no le pasa una (travesuras.js). Amable y chistoso; nunca grosero.
     · ECOSISTEMA (ecosistema.js): mariposas de ambiente, una guía que se posa donde hay que actuar, todas hacia el sur en
       la migración y racimos colgados en el santuario. Se alejan de tu mano.
     · MATERIAS: cada escena dice de qué materia es; «¿Y si fueras tú?» (educación física y matemáticas) y los botones del
       final (materias, mantenimiento de cómputo, expresión y comunicación).
     · SÓLO DATOS VERIFICADOS: cada cifra de guion.js está en MONARCH_XR.md (la prueba lo revisa).
     · MODO EXPOSICIÓN: con ?monarca entra directo y los botones que sacan no sacan. El docente sale con Opciones (o PS) 5
       veces seguidas, o 5 toques en la esquina de arriba a la izquierda. */
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { crearNarrador } from './narrador.js';
import { crearTravesuras } from './travesuras.js';
import { crearMemoria } from './memoria.js';
import { crearEcosistema } from './ecosistema.js';
import { crearRotulos } from './rotulos.js';
import { crearTutorial } from '../tutorial.js';
import { crearCiclo } from './ciclo.js';
import { crearMaceta } from './maceta.js';
import { crearEspejo } from '../espejo.js';
import { t as tr, UI, ESCENAS, PREGUNTAS, MATERIAS, NOMBRE_MATERIA, FUNCIONA, CONTAMOS, CREDITOS } from './guion.js';

const AQUI = (f) => new URL(f, import.meta.url).href;
const MORADO = '#AC27FF', NARANJA = '#F28C1B';
/* las fotos del ciclo (Flickr, CC BY 2.0; créditos en medios/ciclo/CREDITOS.json) */
const FOTO_ETAPA = ['huevo.jpg', 'sidpix-06.jpg', 'sidpix-11.jpg', 'sidpix-16.jpg'];

export function montarMonarca(V){
  const { THREE } = V;
  const m = { grupo: new THREE.Group(), estado: { escena: 0, puntos: 0, pregunta: 0, eleccion: null, voz: true, cargados: 0, fase: 'idioma', idioma: 'es', cuerpo: null } };
  const st = m.estado;
  const L = (x) => tr(x, st.idioma);
  let avisoVoz = false;
  const narr = crearNarrador({ actx: V.audio, idioma: () => st.idioma,
    base: (id, l) => AQUI(`medios/narrador/${l === 'en' ? 'en/' : ''}${id}.mp3`), sinVoz: () => !st.voz,
    /* un audio que todavía no se genera (404) lo lee la voz del teléfono, sin avisar: no es una falla */
    alFallar: (x) => { if(avisoVoz || /HTTP 404/.test(x)) return; avisoVoz = true; V.hud('Voz: ' + x.slice(0, 40), 4); } });
  m.narrador = narr;
  /* decir y avisar al terminar (el tutorial espera a que se acabe de explicar) */
  let alCallar = null;
  const decirY = (ids, fin) => { narr.decir(ids); alCallar = fin || null; if(!st.voz || !ids.length){ const f = alCallar; alCallar = null; f && setTimeout(f, 300); } };
  const ahora = () => performance.now() / 1000;
  const vez = { prisa: 0, bien: 0 };
  let florHablo = false, atrasEn = -99, avanzarSolo = false;
  const trav = crearTravesuras(); m.travesuras = trav;
  const memo = crearMemoria({ orden: ESCENAS.map((e) => e.id) }); m.memoria = memo;
  const ev = (tipo, d = {}) => trav.evento(tipo, { t: ahora(), ...d });
  /* decir una reacción: si está explicando, la pausa y luego sigue donde iba; quieto-5 además avanza solo al terminar */
  function reaccionar(id){
    if(!id || !st.voz || st.fase !== 'escenas') return;
    memo.apuntar(id, ESCENAS[st.escena]?.id, ahora());
    if(id === 'r-quieto-5') avanzarSolo = true;
    if(narr.actual && narr.actual.startsWith('e-')) narr.interrumpir(id); else narr.decir([id]);
  }
  const turno = (pre, n) => `${pre}-${(vez[pre.slice(2)]++ % n) + 1}`;

  /* ── el cielo 360° ── */
  const texs = {}, cargador = new THREE.TextureLoader();
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, toneMapped: false }));
  cielo.renderOrder = -5; cielo.visible = false; m.grupo.add(cielo);
  const textura = (nombre) => texs[nombre] || (texs[nombre] = new Promise((ok) => cargador.load(AQUI(`medios/cielos/${nombre}.webp`), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; st.cargados++; ok(t); }, undefined, () => ok(null))));
  let cieloPedido = null;
  async function ponerCielo(nombre){
    cieloPedido = nombre;
    if(!nombre){ cielo.visible = false; return; }
    const t = await textura(nombre); if(cieloPedido !== nombre) return;
    cielo.material.map = t; cielo.material.needsUpdate = true; cielo.visible = !!t;
  }

  /* ── el ancla de lo que se cuenta (antes era el cartel; ya no se ve, pero las travesuras miden contra ella) ── */
  const ancla = new THREE.Object3D(); ancla.position.set(0, .42, -2.2); m.grupo.add(ancla);
  const rot = crearRotulos({ THREE, V, grupo: m.grupo }); m.rotulos = rot;
  const materiasDe = (E) => (E.materias || []).map((k) => L(NOMBRE_MATERIA[k]));
  const fuenteDe = (f) => (f ? `${L(UI.fuente)}: ${L(f)}` : '');

  /* ── los botones: píldoras flotantes; al recibir el foco se encienden (y avisan al tutorial) ── */
  let botones = [];
  function boton(texto, accion, ancho = .5, { alto = .16 } = {}){
    const p = new V.Panel(ancho, alto, 520); p.titulo = texto;
    /* la letra: la más grande que quepa en uno o dos renglones (antes, un texto largo bajaba a 28 px en un renglón) */
    const pintar = (f) => { const { x, cv } = p, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); V.redondo(x, 4, 4, w - 8, h - 8, Math.min((h - 8) / 2, 40));
      x.fillStyle = f ? '#3A1A5C' : '#24123A'; x.fill(); x.lineWidth = f ? 7 : 3; x.strokeStyle = f ? MORADO : '#3C2652'; x.stroke();
      x.fillStyle = '#F4EEF2'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const dos = h > 100; let tam = dos ? 50 : 36, rs = [texto];
      for(; tam > 22; tam -= 2){ x.font = `800 ${tam}px system-ui, -apple-system, sans-serif`;
        if(x.measureText(texto).width <= w - 50){ rs = [texto]; break; }
        if(dos){ const pal = texto.split(' '); let mejor = null; for(let c = 1; c < pal.length; c++){ const a = pal.slice(0, c).join(' '), b = pal.slice(c).join(' '); const m = Math.max(x.measureText(a).width, x.measureText(b).width); if(!mejor || m < mejor[0]) mejor = [m, a, b]; }
          if(mejor && mejor[0] <= w - 50 && tam * 2.3 <= h - 10){ rs = [mejor[1], mejor[2]]; break; } } }
      rs.forEach((r, j) => x.fillText(r, w / 2, h / 2 + 2 + (j - (rs.length - 1) / 2) * tam * 1.12)); p.listo(); };
    p.foco = (f) => { if(p._f === f) return; p._f = f; pintar(f); if(f) p.malla.userData.alFoco?.(); }; p._f = false; pintar(false);
    p.malla.userData.accion = () => { V.sonar('toque', .3); ev('boton'); accion(); };
    p.malla.userData.retitular = (t) => { texto = t; p.titulo = t; pintar(p._f); };
    return p.malla;
  }
  function ponerBotones(lista, y = -.42){
    botones.forEach((b) => m.grupo.remove(b)); botones = lista;
    /* si no caben en 1.9 m (lo que se ve cómodo de frente), se parten en filas de arriba hacia abajo */
    const filas = [[]]; let an = 0;
    for(const b of lista){ const w = b.geometry.parameters.width + .06; if(an + w > 1.96 && filas.at(-1).length){ filas.push([]); an = 0; } filas.at(-1).push(b); an += w; }
    const paso = Math.max(.16, ...lista.map((b) => b.geometry.parameters.height)) + .05;   /* botones altos: filas más separadas */
    filas.forEach((fila, k) => { const ancho = fila.reduce((s, b) => s + b.geometry.parameters.width + .06, -.06);
      let x = -ancho / 2; for(const b of fila){ const w = b.geometry.parameters.width; b.position.set(x + w / 2, y - k * paso, -2.1); x += w + .06; m.grupo.add(b); } });
  }

  /* ── la monarca: el ejemplar escaneado, y una colonia de copias si el ecosistema no pudiera armarse ── */
  const mariposa = new THREE.Group(), colonia = new THREE.Group(); m.grupo.add(mariposa, colonia); mariposa.visible = colonia.visible = false;
  let modelo = null;
  /* EL ECOSISTEMA (ecosistema.js) */
  const eco = crearEcosistema({ THREE, render: V.render, grupo: m.grupo, cabeza: V.cabeza, N: 96 }); m.eco = eco;
  /* MUCHAS MÁS (Carlos, 26 nov: «hay muy pocas mariposas… faltan muchas más, las interactivas»): de 4-14 a 14-70 por escena */
  const PAPEL = { bienvenida: ['ambiente', 30], mariposa: ['ambiente', 18], ciclo: ['ambiente', 14], flores: ['ambiente', 26], migracion: ['rumbo', 70],
    cuerpo: ['ambiente', 22], maceta: ['ambiente', 14], santuario: ['racimo'], tala: ['ambiente', 3], campo: ['ambiente', 8], decision: ['ambiente', 14], cuestionario: ['ambiente', 10], final: ['ambiente', 70] };
  function papelDe(E){ const [p, n] = PAPEL[E.id] || ['nada']; eco.poner(p, { cuantas: n }); eco.guiar(null); if(eco.listo && E.monarca === 'colonia') colonia.visible = false; }
  let tocoEco = false;
  eco.alTocar = () => { memo.apuntar('mariposa', ESCENAS[st.escena]?.id, ahora()); if(!tocoEco){ tocoEco = true; reaccionar('r-tocar-mariposa'); } };
  m.armado = new GLTFLoader().loadAsync(AQUI('medios/monarca.glb')).then((g) => {
    const s = g.scene, caja = new THREE.Box3().setFromObject(s), tam = caja.getSize(new THREE.Vector3()), c = caja.getCenter(new THREE.Vector3());
    const piv = new THREE.Group(); s.position.sub(c); piv.add(s); piv.scale.setScalar(.32 / Math.max(tam.x, tam.y, tam.z));
    s.traverse((o) => { if(o.isMesh){ const v = o.material; o.material = new THREE.MeshBasicMaterial({ map: v.map || null, color: v.map ? 0xffffff : v.color, side: THREE.DoubleSide, transparent: v.transparent, alphaTest: .3 }); } });
    modelo = piv; mariposa.add(piv);
    let k = 3; const az = () => (k = (k * 16807) % 2147483647) / 2147483647;
    for(let i = 0; i < 18; i++){ const c2 = piv.clone(); const a = (az() - .5) * 2.4, r = 1.3 + az() * 2;
      c2.userData.base = new THREE.Vector3(Math.sin(a) * r, -.3 + az() * 1.6, -Math.cos(a) * r); c2.userData.fase = az() * 6; c2.scale.multiplyScalar(.6 + az() * .5); colonia.add(c2); }
    if(eco.desdeModelo(piv)){ colonia.visible = false; if(st.fase === 'escenas') papelDe(ESCENAS[st.escena]); else eco.poner('ambiente', { cuantas: 24 }); }
  }).catch((e) => { V.fallo?.('E-MONARCA', 'cargar monarca.glb', e); });

  /* ── el minijuego «Flores en el camino»: cinco lugares en el pasto; al elegir uno crece una flor (Poly Haven) y la
     monarca vuela a tomar néctar. La guía se posa en el siguiente lugar libre ── */
  const flores = new THREE.Group(); m.grupo.add(flores); let variedades = [], lugares = [], plantadas = 0, objetivo = null;
  m.armadoFlores = new GLTFLoader().loadAsync(AQUI('medios/flores.glb')).then((g) => {
    g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => { if(!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); const b = geo.boundingBox, c = b.getCenter(new THREE.Vector3());
      geo.translate(-c.x, -b.min.y, -c.z); const alto = b.max.y - b.min.y || 1; geo.scale(.6 / alto, .6 / alto, .6 / alto);
      variedades.push(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: o.material.map || null, side: THREE.DoubleSide, alphaTest: .4 }))); });
  }).catch((e) => V.fallo?.('E-MONARCA', 'cargar flores.glb', e));
  const PASTO = [-38, -19, 0, 19, 38].map((g, i) => { const a = g * Math.PI / 180, d = i % 2 ? 1.35 : 1.7; return new THREE.Vector3(Math.sin(a) * d, -.95, -Math.cos(a) * d); });
  const guiarFlor = () => { const b = lugares[0]; if(!b){ eco.guiar(null); return; } eco.guiar(b.position.clone().add(new THREE.Vector3(0, .14, 0))); };
  function juegoFlores(){
    flores.clear(); plantadas = 0; objetivo = null;
    lugares = PASTO.map((p, i) => { const b = boton(L(UI.plantar), () => plantar(i, b), .34); b.position.copy(p).add(new THREE.Vector3(0, .3, 0)); b.lookAt(0, b.position.y * .3, 0); m.grupo.add(b); return b; });
    guiarFlor();
  }
  function plantar(i, b){
    m.grupo.remove(b); lugares = lugares.filter((x) => x !== b);
    const v = variedades[i % Math.max(1, variedades.length)]; if(v){ const f = v.clone(); f.position.copy(PASTO[i]); f.scale.setScalar(.01); f.userData.nace = performance.now() / 1000; flores.add(f); }
    objetivo = PASTO[i].clone().add(new THREE.Vector3(0, .5, 0)); plantadas++; V.sonar('ding', .3); guiarFlor();
    const rapido = ev('planta');
    if(plantadas < PASTO.length){
      if(narr.actual === 'e-flores' && narr.falta() > 2 && !florHablo){ florHablo = true; narr.interrumpir('r-flor-hablando'); }
      else if(plantadas === 1 && !narr.actual) narr.decir(['r-flor-1']);
    }
    if(plantadas >= PASTO.length){ objetivo = null;
      rot.mensaje(L(UI.listo), [st.idioma === 'en' ? 'Five flowers on her way: five places to drink nectar.' : 'Cinco flores en su camino: cinco lugares para tomar néctar.']);
      narr.decir([rapido || 'r-flores-todas']);
      ponerBotones([boton(L(UI.siguiente), () => mostrar(st.escena + 1)), vozBoton()]); }
  }
  const quitarLugares = () => { lugares.forEach((b) => m.grupo.remove(b)); lugares = []; };

  /* ── el mapa de la migración: Norteamérica de Natural Earth y la ruta que se dibuja sola ── */
  const mapaP = new V.Panel(1.3, 1.0, 500); mapaP.malla.position.set(0, .3, -2.3); mapaP.malla.visible = false; m.grupo.add(mapaP.malla);
  let mapa = null; fetch(AQUI('medios/mapa.json')).then((r) => r.json()).then((j) => { mapa = j; }).catch((e) => V.fallo?.('E-MONARCA', 'cargar mapa.json', e));
  const RUTA = [[-79.5, 46], [-84, 42], [-90, 37.5], [-97, 32.5], [-99.5, 27], [-100.2, 19.6]];
  function pintarMapa(k){
    const { x, cv } = mapaP, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    V.redondo(x, 6, 6, w - 12, h - 12, 34); x.fillStyle = 'rgba(23,10,38,.82)'; x.fill();
    if(!mapa){ mapaP.listo(); return; }
    const c = mapa.caja, px = (lon) => 30 + (lon - c.x0) / (c.x1 - c.x0) * (w - 60), py = (lat) => 30 + (c.y1 - lat) / (c.y1 - c.y0) * (h - 60);
    x.lineWidth = 2; x.strokeStyle = '#7E6A96'; x.fillStyle = 'rgba(172,39,255,.12)';
    for(const anillos of Object.values(mapa.paises)) for(const a of anillos){ x.beginPath(); a.forEach(([lo, la], i) => i ? x.lineTo(px(lo), py(la)) : x.moveTo(px(lo), py(la))); x.closePath(); x.fill(); x.stroke(); }
    const n = (RUTA.length - 1) * Math.min(1, k); x.strokeStyle = NARANJA; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath();
    for(let i = 0; i <= Math.floor(n); i++) i ? x.lineTo(px(RUTA[i][0]), py(RUTA[i][1])) : x.moveTo(px(RUTA[i][0]), py(RUTA[i][1]));
    const f = n - Math.floor(n), i0 = Math.floor(n); if(i0 < RUTA.length - 1){ const a = RUTA[i0], b = RUTA[i0 + 1]; x.lineTo(px(a[0] + (b[0] - a[0]) * f), py(a[1] + (b[1] - a[1]) * f)); }
    x.stroke();
    const fin = RUTA[RUTA.length - 1]; x.fillStyle = k >= 1 ? NARANJA : '#7E6A96'; x.beginPath(); x.arc(px(fin[0]), py(fin[1]), 10, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#F4EEF2'; x.font = '700 24px system-ui, -apple-system, sans-serif';
    x.fillText(st.idioma === 'en' ? 'Canada' : 'Canadá', px(-84), py(52)); x.fillText(st.idioma === 'en' ? 'Michoacán and State of Mexico' : 'Michoacán y Edomex', px(-112), py(16.5));
    mapaP.listo();
  }

  /* ── las etapas del ciclo: la FOTO real de cada etapa (Flickr, CC BY), se encienden una tras otra ── */
  const etapas = new THREE.Group(); m.grupo.add(etapas); let etapasP = [];
  const fotos = {}; const foto = (f) => fotos[f] || (fotos[f] = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = AQUI('medios/ciclo/' + f); }));
  function ponerEtapas(lista){
    etapas.clear(); etapasP = [];
    if(!lista) return;
    const w = .42, sep = .06, total = lista.length * w + (lista.length - 1) * sep;
    lista.forEach(([nombre, dias], k) => { const p = new V.Panel(w, .5, 520); p.malla.position.set(-total / 2 + w / 2 + k * (w + sep), .02, -2.15); etapas.add(p.malla);
      const e = { p, nombre: L(nombre), dias: L(dias), on: null, img: null }; etapasP.push(e); foto(FOTO_ETAPA[k]).then((i) => { e.img = i; e.on = null; }); });
  }
  function pintarEtapas(activa){
    etapasP.forEach((e, k) => { const on = k === activa; if(e.on === on) return; e.on = on;
      const { x, cv } = e.p, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
      x.save(); V.redondo(x, 6, 6, w - 12, h * .7, 24); x.clip();
      if(e.img){ const s = Math.max((w - 12) / e.img.width, (h * .7) / e.img.height); x.globalAlpha = on ? 1 : .5; x.drawImage(e.img, 6 + (w - 12 - e.img.width * s) / 2, 6 + (h * .7 - e.img.height * s) / 2, e.img.width * s, e.img.height * s); }
      x.restore(); x.globalAlpha = 1;
      if(on){ V.redondo(x, 6, 6, w - 12, h * .7, 24); x.lineWidth = 7; x.strokeStyle = NARANJA; x.stroke(); }
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.font = '800 40px system-ui, -apple-system, sans-serif'; x.lineWidth = 8; x.strokeStyle = 'rgba(12,5,20,.9)'; x.strokeText(e.nombre, w / 2, h * .8); x.fillStyle = on ? NARANJA : '#F4EEF2'; x.fillText(e.nombre, w / 2, h * .8);
      x.font = '700 28px system-ui, -apple-system, sans-serif'; x.strokeText(e.dias, w / 2, h * .92); x.fillStyle = '#E8DCF2'; x.fillText(e.dias, w / 2, h * .92); e.p.listo(); });
  }

  /* ── el ciclo completo: 16 etapas con fotos reales y día y noche (ciclo.js) ── */
  const ciclo = crearCiclo({ THREE, V, grupo: m.grupo, eco, aqui: AQUI, idioma: () => st.idioma, cielo }); m.ciclo = ciclo;

  /* ── la maceta: sembrar con tus manos (maceta.js) ── */
  const maceta = crearMaceta({ THREE, V, grupo: m.grupo, aqui: AQUI, eco, idioma: () => st.idioma,
    cargar: (u) => new GLTFLoader().loadAsync(u),
    /* LOS TIEMPOS DE LA VOZ (27 nov, Carlos: «se está saturando de audios… mide bien los tiempos»): una corrección («ésa no»,
       «primero lo primero», «tardas») NUNCA corta lo que se está diciendo y no se repite antes de 8 s; los pasos («ahora la
       pala») sí entran, pero esperan a que termine la frase que va (no la cortan) salvo que sea una explicación larga */
    decir: (id) => { if(!st.voz) return; const t = performance.now(), correccion = /^(k-otra|k-primero|r-tarda)/.test(id);
      if(correccion){ if(narr.ocupado || t - (m.ultimaCorreccion || 0) < 8000) return; m.ultimaCorreccion = t; narr.decir([id]); return; }
      if(narr.actual && narr.actual.startsWith('e-')) narr.interrumpir(id);
      else if(narr.ocupado && !/^(k-otra|k-primero|r-tarda)/.test(narr.actual || '')) narr.encolar ? narr.encolar(id) : narr.decir([id]);
      else narr.decir([id]); },
    /* la planta que crece: la variedad más llena de las flores (la que tiene más vértices) */
    flor: () => { const v = [...variedades].sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count)[0]; if(!v) return null; const f = new THREE.Group(); const c = v.clone(); c.scale.setScalar(1.25); f.add(c); return f; },
    alTerminar: () => { if(ESCENAS[st.escena]?.id === 'maceta') ponerBotones([boton(L(UI.siguiente), () => mostrar(st.escena + 1)), vozBoton()], -.2); } });
  m.maceta = maceta;

  /* ── la voz ── */
  const vozBoton = () => { const b = boton(L(st.voz ? UI.vozSi : UI.vozNo), () => {
    const juega = ev('voz', { prendida: !st.voz });
    if(st.voz){ narr.decir(['r-voz-off']); st.voz = false; }
    else { st.voz = true; narr.decir([juega || 'r-voz-on']); }
    b.userData.retitular(L(st.voz ? UI.vozSi : UI.vozNo)); }, .4); return b; };

  /* ── EL ARRANQUE: idioma (operador) → 5 s para entregar el visor → tutorial → la historia ── */
  let cuentaT0 = 0, cuentaN = -1;
  function pedirIdioma(){
    st.fase = 'idioma'; narr.callar(); limpiarEscena(); ponerCielo('alps_field'); V.cuarto.visible = false;
    const cod = espejo.abrir();
    rot.mensaje('MONARCH', ['Idioma · Language', `Docente · Teacher: ${cod}`]);
    ponerBotones([boton('Español', () => elegirIdioma('es'), .6), boton('English', () => elegirIdioma('en'), .6)], -.2);
  }
  /* EL IDIOMA → «LISTO» → LA CUENTA (Carlos, 26 nov: «que sea listo, ... 5, 4, con un sonidito como de tic de reloj»): el
     operador elige el idioma, le pone el visor al alumno y toca «Listo»; ahí empieza la cuenta, con un tic cada segundo. */
  function elegirIdioma(l){ st.idioma = l; st.fase = 'listo'; narr.precargar(); V.despertarAudio?.();
    rot.mensaje('MONARCH', [L(UI.ponte)]);
    ponerBotones([boton(L(UI.listoOperador), empezarCuenta, .7)], -.2); }
  function empezarCuenta(){ st.fase = 'cuenta'; cuentaT0 = ahora(); cuentaN = -1; ponerBotones([]); }
  const tut = crearTutorial({ THREE, V, grupo: m.grupo,
    decir: (ids, fin) => decirY(ids, fin),
    boton: (txt, acc, an) => boton(L(UI.aqui), acc, an),
    guia: (p) => eco.guiar(p, { posarse: false }),
    alTerminar: () => empezarHistoria() });
  m.tutorial = tut;
  function empezarTutorial(){
    /* el tutorial es OBLIGATORIO (Carlos, 26 nov: «se pasa aleatoriamente… quita por completo el gesto para esquipearlo») */
    st.fase = 'tutorial';
    rot.mensaje(L(UI.tutorial), [], { chico: true });
    setTimeout(() => { if(st.fase === 'tutorial') rot.limpiar(); }, 4500);
    tut.empezar();
  }
  function empezarHistoria(){ st.fase = 'escenas'; st.escena = 0; mostrar(0); }
  /* para las pruebas y para el docente: entrar directo a la historia (o al tutorial) */
  m.arrancar = ({ idioma = 'es', tutorial = false } = {}) => { st.idioma = idioma; if(tutorial) empezarTutorial(); else empezarHistoria(); };

  /* ── las escenas ── */
  let t0 = 0;
  function limpiarEscena(){ rot.limpiar(); ponerEtapas(null); ciclo.parar(); maceta.parar(); quitarLugares(); flores.visible = false; objetivo = null; mapaP.malla.visible = false; mariposa.visible = colonia.visible = false; eco.guiar(null); }
  /* la mano fantasma también enseña en la historia: «palma arriba» para que se te pose una mariposa (si nadie lo ha hecho) */
  const maestroH = null;   /* (27 nov, Carlos: «la mano fantasma sólo en Monarch en el tutorial») fuera de las escenas */
  let escenaEn = 0, posadasAlEntrar = 0;
  eco.alAtrapar = () => { if(!tocoEco){ tocoEco = true; reaccionar('r-tocar-mariposa'); } };
  function mostrar(i, pre = []){
    escenaEn = ahora(); posadasAlEntrar = (eco.posadas || 0) + (eco.atrapadas || 0); maestroH?.ocultar();
    const ant = st.escena, explicando = narr.actual && narr.actual.startsWith('e-') && narr.falta() > 2.5;
    const pp = i === ant + 1 ? ev('siguiente') : i === ant - 1 ? ev('atras') : null;
    if(!pre.length && pp) pre = [pp];
    else if(!pre.length && i === ant + 1 && explicando) pre = [turno('r-prisa', 3)];
    else if(!pre.length && i === ant - 1 && ahora() - atrasEn > 40){ pre = ['r-atras']; atrasEn = ahora(); }
    ev('escena', { id: ESCENAS[i]?.id, saltada: i === ant + 1 && explicando });
    florHablo = false; avanzarSolo = false;
    st.escena = i; const E = ESCENAS[i]; t0 = ahora();
    pre.forEach((x) => memo.apuntar(x, ESCENAS[ant]?.id, ahora()));
    const recuerdo = i !== ant ? memo.alEntrar(E.id) : null;
    const decir = () => narr.decir([...pre, 'e-' + E.id, ...(recuerdo ? [recuerdo] : [])]);
    limpiarEscena();
    ponerCielo(E.cielo); V.cuarto.visible = !E.cielo; mapaP.malla.visible = !!E.mapa;
    mariposa.visible = E.monarca === 'vuela' || E.monarca === 'cerca'; colonia.visible = E.monarca === 'colonia'; tocoEco = false; papelDe(E);
    rot.titulo(L(E.titulo), materiasDe(E)); rot.claves((E.claves || []).map((c) => ({ ...c, grande: L(c.grande), chico: L(c.chico) }))); rot.fuente(fuenteDe(E.fuente)); rot.avanzar(0);
    const siguiente = () => mostrar(i + 1);
    if(E.id === 'ciclo') ciclo.empezar();
    flores.visible = E.juego === 'flores';
    if(E.juego === 'flores'){ juegoFlores(); decir(); ponerBotones([boton(L(UI.atras), () => mostrar(i - 1), .36), vozBoton()], -.2); return; }
    if(E.juego === 'maceta'){ maceta.empezar(); decir(); ponerBotones([boton(L(UI.atras), () => mostrar(i - 1), .36), vozBoton()], .62); return; }
    if(E.id === 'cuestionario') return preguntar([...pre, 'e-cuestionario']);
    if(E.id === 'cuerpo'){
      decir();
      const elegir = (k) => { st.cuerpo = k; ev('cuerpo');
        rot.claves(E.opciones[k][1].map((c, j) => ({ grande: L(c.grande), chico: L(c.chico), en: 0, pos: [[-1, .55], [0, .85], [1, .55]][j] }))); rot.mostrarTodo();
        narr.decir([['r-cuerpo-camina', 'r-cuerpo-corre'][k]]);
        ponerBotones([boton(L(E.opciones[1 - k][0]), () => elegir(1 - k), .44), boton(L(UI.siguiente), siguiente), vozBoton()]); };
      ponerBotones([...E.opciones.map(([op], k) => boton(L(op), () => elegir(k), .44)), vozBoton()]);
      return;
    }
    if(E.id === 'decision' && st.eleccion == null){
      decir();
      ponerBotones(E.opciones.map(([op, que], k) => boton(L(op), () => { st.eleccion = k; rot.mensaje(L(op), [L(que)]); narr.decir([['r-talar', 'r-conservar', 'r-turismo'][k]]); ponerBotones([boton(L(UI.siguiente), () => { mostrar(i + 1); }), vozBoton()]); }, .44)));
      return;
    }
    if(E.id === 'final'){ const extra = ev('final', { puntos: st.puntos, total: PREGUNTAS.length });
      narr.decir([...pre, 'e-final', st.puntos === PREGUNTAS.length ? 'r-perfecto' : st.puntos === 0 ? 'r-cero' : 'r-medio', ...(extra ? [extra] : [])]);
      ponerBotones([boton(`${st.puntos} ${L(UI.de)} ${PREGUNTAS.length}`, () => reaccionar(ev('puntaje')), .58, { alto: .2 }),
        boton(L(UI.materias), () => { info('materias', MATERIAS.map(([k, d]) => `${L(NOMBRE_MATERIA[k])}: ${L(d)}`), () => narr.decir(['r-materias'])); }, .58, { alto: .2 }),
        boton(L(UI.funciona), () => { info('funciona', L(FUNCIONA), () => narr.decir(['r-como-funciona'])); }, .58, { alto: .2 }),
        boton(L(UI.contamos), () => { info('contamos', L(CONTAMOS), () => narr.decir(['r-como-contamos'])); }, .58, { alto: .2 }),
        boton(L(UI.creditos), () => { info('creditos', L(CREDITOS), () => narr.decir([ev('creditos') || 'r-creditos'])); }, .58, { alto: .2 }),
        boton(L(UI.otraVez), () => reiniciar(), .58, { alto: .2 })]); return; }
    decir();
    ponerBotones([...(i > 0 ? [boton(L(UI.atras), () => mostrar(i - 1), .36)] : []), boton(L(E.boton || UI.siguiente), siguiente), vozBoton()], E.id === 'ciclo' ? -.76 : -.42);
  }
  /* un mensaje largo del final: la primera vez dice la voz; tocar otra vez el mismo botón pasa a la página siguiente */
  let infoAbierta = null;
  function info(clave, lineas, voz){
    const P = rot.paginas, sigue = infoAbierta === clave && P;
    rot.mensaje(L(UI[clave]), lineas, { chico: true, hasta: -.28, pagina: sigue ? P.pg + 1 : 0 });
    if(!sigue){ infoAbierta = clave; voz(); }
  }
  function preguntar(pre = []){
    const E = ESCENAS[st.escena], q = PREGUNTAS[st.pregunta], n = st.pregunta + 1;
    if(!q){ mostrar(st.escena + 1); return; }
    rot.mensaje(`${L(E.titulo)} · ${n} ${L(UI.de)} ${PREGUNTAS.length}`, [L(q[0])], { hasta: -.14 }); narr.decir([...pre, 'q-' + n]); ev('pregunta');
    ponerBotones(q[1].map((op, k) => boton(L(op), () => {
      const bien = k === q[2]; if(bien) st.puntos++; V.sonar(bien ? 'ding' : 'toque', .35);
      const sinLeer = ev('respuesta');
      rot.mensaje(L(bien ? UI.correcto : UI.casi), [bien ? L(q[1][k]) : `${L(UI.era)}: ${L(q[1][q[2]])}`]); narr.decir([bien ? turno('r-bien', 4) : `q-${n}-mal`, ...(sinLeer ? [sinLeer] : [])]);
      ponerBotones([boton(L(UI.siguiente), () => { st.pregunta++; preguntar(); })]);
    }, .92, { alto: .26 })), -.3);   /* (27 nov, Carlos: «las opciones del cuestionario se ven muy chicas») */
  }
  /* «Otra vez»: para la siguiente persona, el operador vuelve a elegir idioma */
  function reiniciar(){ const otra = st.escena ? ev('otraVez') : null; m.ultimoOtraVez = otra; st.puntos = 0; st.pregunta = 0; st.eleccion = null; st.cuerpo = null; st.escena = 0; memo.reiniciar(); pedirIdioma(); }

  /* ── SUBTÍTULOS QUE SIGUEN TU VISTA (Carlos, 19 nov): ahora son LA forma de leer lo que se cuenta ── */
  const subt = new V.Panel(1.5, .3, 560); subt.malla.material.depthTest = false; subt.malla.material.depthWrite = false;
  subt.malla.renderOrder = 30; subt.malla.visible = false; V.escena.add(subt.malla);
  const subQ = new THREE.Quaternion(), subP = new THREE.Vector3(), subC = new THREE.Vector3(), subD = new THREE.Vector3(), subUp = new THREE.Vector3(0, 1, 0);
  let subPuesto = '', subNuevo = true;
  function renglones(x, texto, ancho){ const out = []; let r = ''; for(const p of texto.split(' ')){ const n = r ? r + ' ' + p : p; if(x.measureText(n).width > ancho && r){ out.push(r); r = p; } else r = n; } if(r) out.push(r); return out; }
  function pintarSub(texto, n){
    const { x, cv } = subt, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    x.font = '700 40px system-ui, -apple-system, sans-serif';
    const palabras = texto.split(' '), dicho = palabras.slice(0, n).join(' ');
    let ls = renglones(x, dicho, w - 80); ls = ls.slice(-2);
    if(!ls.length || !dicho){ subt.listo(); return; }
    const alto = ls.length * 52 + 36, y0 = h - alto;
    V.redondo(x, 10, y0, w - 20, alto - 6, 28); x.fillStyle = 'rgba(11,5,19,.78)'; x.fill();
    x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'top';
    ls.forEach((r, k) => x.fillText(r, w / 2, y0 + 18 + k * 52));
    subt.listo();
  }
  function subtitulos(dt){
    const pr = narr.progreso(), ver = !!pr && st.voz;
    subt.malla.visible = ver; if(!ver){ subPuesto = ''; subNuevo = true; return; }
    const palabras = pr.texto.split(' '), n = Math.min(palabras.length, Math.ceil(palabras.length * Math.min(1, pr.f * 1.08 + .04)));
    const clave = pr.id + '|' + n; if(clave !== subPuesto){ subPuesto = clave; pintarSub(pr.texto, n); }
    V.cabeza.getWorldPosition(subC); V.cabeza.getWorldQuaternion(subQ);
    /* QUE NO TAPE LOS BOTONES (27 nov): el subtítulo va abajo de lo que ves; si en esa franja hay botones (las opciones del
       cuestionario, los del final), se baja a DEBAJO del último (arriba tapaba la pregunta) */
    let ang = -.2;   /* −0.32 m a 1.6 m */
    for(const bt of botones){ if(!bt.parent) continue; const l = V.cabeza.worldToLocal(bt.getWorldPosition(subD)); if(l.z >= 0) continue;
      const hz = Math.atan2(l.x, -l.z), d = -l.z, medio = bt.geometry.parameters.height / 2, abajo = Math.atan2(l.y - medio, d), arribaB = Math.atan2(l.y + medio, d);
      if(Math.abs(hz) < .6 && arribaB > ang - .1 && abajo < ang + .1) ang = Math.min(ang, abajo - .11); }
    subD.set(0, Math.tan(ang) * 1.6, -1.6).applyQuaternion(subQ); subP.copy(subC).add(subD);
    const k = subNuevo ? 1 : 1 - Math.exp(-(dt || 1 / 60) * 3.5); subNuevo = false;
    subt.malla.position.lerp(subP, k);
    subt.malla.up.copy(subUp); subt.malla.lookAt(subC);
  }

  /* ── cada cuadro ── */
  let rutaK = -1, tSub = 0;
  m.cuadro = () => {
    const t = ahora(), E = ESCENAS[st.escena];
    if(maestroH && st.fase === 'escenas'){ const conMariposas = ['bienvenida', 'mariposa', 'flores', 'final'].includes(E?.id) && !narr.ocupado && t - escenaEn > 8 && (eco.posadas || 0) + (eco.atrapadas || 0) === posadasAlEntrar;
      if(conMariposas){ if(maestroH.activo !== 'palma') maestroH.mostrar('palma'); maestroH.cuadro(); } else if(maestroH.activo) maestroH.ocultar(); }
    subtitulos(tSub ? Math.min(.1, t - tSub) : 1 / 60); tSub = t;
    rot.cuadro(t); eco.cuadro(t, V.extra.manos || []); V.extra.narrando = narr.ocupado;   /* los tonos bajan cuando habla */
    if(alCallar && !narr.ocupado){ const f = alCallar; alCallar = null; f(); }
    if(st.fase === 'cuenta'){
      const n = 5 - Math.floor(t - cuentaT0);
      if(n !== cuentaN && n >= 1){ cuentaN = n; rot.mensaje(String(n), []); V.tic?.(); }
      if(n < 1){ rot.limpiar(); empezarTutorial(); }
      return;
    }
    if(st.fase === 'tutorial'){ tut.cuadro(); return; }
    if(st.fase !== 'escenas') return;
    if(modelo && mariposa.visible){
      if(E.monarca === 'cerca'){ mariposa.position.set(.95, .1, -1.3); mariposa.rotation.set(.3, t * .6, Math.sin(t * 9) * .12); mariposa.scale.setScalar(1.6); }
      else if(objetivo){ mariposa.position.lerp(new THREE.Vector3(objetivo.x + Math.sin(t * 2) * .12, objetivo.y + Math.sin(t * 3.1) * .06, objetivo.z + Math.cos(t * 2) * .12), .04); mariposa.rotation.set(0, t * 2, Math.sin(t * 12) * .25); mariposa.scale.setScalar(.8); }
      else { const a = t * .5; mariposa.position.set(Math.sin(a) * 1.1, .9 + Math.sin(t * 1.3) * .15, -1.8 + Math.cos(a) * .6); mariposa.rotation.set(0, a + Math.PI / 2, Math.sin(t * 12) * .25); mariposa.scale.setScalar(1); }
    }
    /* las cifras salen cuando el narrador las dice; con la voz apagada, una cada pocos segundos */
    const pr = narr.progreso(); if(pr && pr.id === 'e-' + E.id) rot.avanzar(pr.f); else if(!st.voz) rot.avanzar((t - t0) / 14); else if(!narr.ocupado && t - t0 > 2) rot.avanzar(1);
    ciclo.cuadro(t); maceta.cuadro(t, V.extra.manos || []);
    for(const f of flores.children){ const k = Math.min(1, (t - f.userData.nace) / .8); f.scale.setScalar(Math.max(.01, 1 - Math.pow(1 - k, 3))); }
    if(colonia.visible) for(const c of colonia.children){ const b = c.userData.base, f = c.userData.fase;
      c.position.set(b.x + Math.sin(t * .4 + f) * .25, b.y + Math.sin(t * .9 + f) * .12, b.z + Math.cos(t * .4 + f) * .25); c.rotation.set(0, t * .4 + f, Math.sin(t * 11 + f) * .3); }
    vigilar(t, E);
    if(E.mapa){ const k = Math.min(1, (t - t0) / 6); if(Math.abs(k - rutaK) > .01 || (k >= 1 && rutaK < 1)){ rutaK = k; pintarMapa(k); } } else rutaK = -1;
  };

  /* ── el narrador se da cuenta (travesuras.js): una «foto» del jugador por cuadro ── */
  const dirCabeza = new THREE.Vector3(), dirCartel = new THREE.Vector3(), ojo = new THREE.Vector3(), lado = new THREE.Vector3(), pm = new THREE.Vector3(), mm = new THREE.Vector3();
  const cvLuz = document.createElement('canvas'); cvLuz.width = 8; cvLuz.height = 6; const xLuz = cvLuz.getContext('2d', { willReadFrequently: true });
  let luz = null, luzEn = 0, sacudida = 0;
  addEventListener('devicemotion', (e) => { const a = e.acceleration; if(a && a.x != null) sacudida = Math.max(sacudida * .9, Math.hypot(a.x, a.y, a.z)); });
  document.addEventListener('visibilitychange', () => { if(!m.grupo.visible) return; reaccionar(ev(document.hidden ? 'oculto' : 'visible')); });
  function medirLuz(t){
    if(t - luzEn < 1) return luz; luzEn = t;
    try{ const v = V.video; if(!V.hayCamara?.() || !v || v.readyState < 2){ luz = null; return luz; }
      xLuz.drawImage(v, 0, 0, 8, 6); const d = xLuz.getImageData(0, 0, 8, 6).data; let s2 = 0; for(let i = 0; i < d.length; i += 4) s2 += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
      luz = s2 / (d.length / 4) / 255; }catch{ luz = null; }
    return luz;
  }
  function vigilar(t, E){
    if(!m.grupo.visible) return;
    if(avanzarSolo && !narr.ocupado){ avanzarSolo = false; if(!['decision', 'cuestionario', 'final'].includes(E.id)) mostrar(st.escena + 1); }
    if(!st.voz) return;
    V.cabeza.getWorldPosition(ojo); V.cabeza.getWorldDirection(dirCabeza); ancla.getWorldPosition(dirCartel).sub(ojo);
    const pitch = Math.asin(Math.max(-1, Math.min(1, dirCabeza.y)));
    lado.set(1, 0, 0).applyQuaternion(V.cabeza.getWorldQuaternion(new THREE.Quaternion())); const roll = Math.asin(Math.max(-1, Math.min(1, lado.y)));
    const yaw = Math.atan2(dirCabeza.x * dirCartel.z - dirCabeza.z * dirCartel.x, dirCabeza.x * dirCartel.x + dirCabeza.z * dirCartel.z);
    const conPos = V.AJ.seis && V.seis?.vio?.S?.listo;
    const manos = (V.extra.manos || []).map((h) => { const p = h.mundo?.palma; const o = { pellizco: !!h.pellizco, palma: !!h.palma, puno: !!h.puno, x: h.x };
      if(p){ o.alto = p.y - ojo.y; if(mariposa.visible && modelo){ mariposa.getWorldPosition(mm); o.dMariposa = pm.copy(p).distanceTo(mm); } }
      return o; });
    const ang = (screen.orientation?.angle ?? window.orientation ?? 90) % 180 === 0;
    const r = trav.paso({ t, escena: E.id, explicando: !!(narr.actual && narr.actual.startsWith('e-')), mirarLibre: ['bienvenida', 'santuario', 'flores'].includes(E.id),
      ocupado: narr.ocupado, final: E.id === 'final', yaw, pitch, roll, conGiro: !!V.hayGiro?.(),
      pos: conPos ? ojo.toArray() : null, dCartel: conPos ? Math.hypot(dirCartel.x, dirCartel.z) : null,
      manos, luz: medirLuz(t), zona: V.limites?.st?.aviso || null,
      ejes: Math.max(Math.hypot(V.control.ejes[0] || 0, V.control.ejes[1] || 0), Math.hypot(V.control.ejes[2] || 0, V.control.ejes[3] || 0)),
      vertical: ang && innerHeight > innerWidth, sacudida });
    reaccionar(r);
  }
  m.vigilar = vigilar;

  /* ── EL ESPEJO PARA EL DOCENTE (espejo.js y vr/operador.html): ve en su teléfono lo que ves, y guía la explicación ── */
  const ordenes = {
    idioma: (o) => { if(st.fase === 'idioma') elegirIdioma(o.l === 'en' ? 'en' : 'es'); },
    listo: () => { if(st.fase === 'listo') empezarCuenta(); },
    saltarTutorial: () => { if(st.fase === 'tutorial'){ tut.activo = false; empezarHistoria(); } },
    siguiente: () => { if(st.fase === 'escenas' && st.escena < ESCENAS.length - 1) mostrar(st.escena + 1); },
    atras: () => { if(st.fase === 'escenas' && st.escena > 0) mostrar(st.escena - 1); },
    repetir: () => { if(st.fase === 'escenas') mostrar(st.escena); },
    callar: () => narr.callar(),
    escena: (o) => { const n = Math.max(0, Math.min(ESCENAS.length - 1, o.n | 0)); if(st.fase === 'tutorial'){ tut.activo = false; st.fase = 'escenas'; } if(st.fase === 'escenas') mostrar(n); },
    reiniciar: () => reiniciar(),
  };
  const espejo = crearEspejo(V, { alOrden: (o) => ordenes[o.accion]?.(o),
    estado: () => ({ fase: st.fase, escena: st.escena, idioma: st.idioma, titulo: st.fase === 'escenas' ? L(ESCENAS[st.escena].titulo) : '',
      escenas: ESCENAS.map((e) => tr(e.titulo, st.idioma)), habla: !!narr.ocupado }) });
  m.espejo = espejo; m.ordenes = ordenes;

  /* ── entrar y salir: se apaga el cuarto del motor y la mixta; al salir, todo vuelve ── */
  let antes = null;
  m.entrar = () => {
    antes = { cuarto: V.cuarto.visible, tem: window.__temshop?.grupo.visible, mixta: V.AJ.mixta };
    if(V.AJ.mixta) V.ponerMixta(false); V.cuarto.visible = false; if(window.__temshop) window.__temshop.grupo.visible = false;
    if(st.fase === 'escenas') mostrar(st.escena); else pedirIdioma();
    /* ADENTRO DE MONARCH NO SE SALE (Carlos, 26 nov: «a cada rato te saca… apaga eso de que pueda salirme con el botón de
       atrás o con el gesto»): al entrar se cierra como en exposición. Sólo el docente sale (Opciones/PS 5 veces, o 5 toques
       en la esquina de arriba a la izquierda del teléfono); salir del navegador o cerrar la app del teléfono sigue igual. */
    m.exposicion(true);
    reaccionar(ev('entrar'));
  };
  m.salir = () => {
    narr.callar(); ev('salir'); subt.malla.visible = false; espejo.cerrar(); V.kiosco.activo = false; V.kiosco.alPS = null; if(tut.activo){ tut.activo = false; }
    if(st.fase !== 'escenas') st.fase = 'idioma';
    if(antes){ V.cuarto.visible = antes.cuarto; if(window.__temshop) window.__temshop.grupo.visible = !!antes.tem; if(antes.mixta) V.ponerMixta(true); }
  };
  m.elegibles = () => [...botones, ...lugares, ...tut.elegibles(), ...maceta.elegibles()];
  /* ATRÁS: no hay (Carlos, 26 nov). Ni Círculo, ni la palma, ni un botón: sólo la salida del docente */
  Object.defineProperty(m, 'atras', { get: () => undefined, configurable: true });
  m.atrasEn = [0, -1.25, -1.7];
  m.mostrar = mostrar; m.reiniciar = reiniciar; m.ESCENAS = ESCENAS; m.PREGUNTAS = PREGUNTAS; m.MATERIAS = MATERIAS; m.elegirIdioma = elegirIdioma;

  /* ── modo exposición: el docente sale con Opciones/PS 5 veces seguidas, o 5 toques en la esquina ── */
  let toques = [];
  const intentoSalir = () => { const t = performance.now(); toques = toques.filter((x) => t - x < 3000); toques.push(t); if(toques.length === 1) reaccionar(ev('opciones'));
    if(toques.length >= 5){ toques = []; V.kiosco.activo = false; V.kiosco.alPS = null; V.hud('Exposición apagada', 2); V.ir('inicio'); }
    else V.hud('Modo exposición', 1); };
  m.exposicion = (si) => { V.kiosco.activo = !!si; V.kiosco.alPS = si ? intentoSalir : null; };
  addEventListener('pointerdown', (e) => { if(V.kiosco.activo && e.clientX < 80 && e.clientY < 80) intentoSalir(); });

  V.registrar('monarca', m);
  m.subt = subt;
  window.__monarca = m;
  return m;
}
