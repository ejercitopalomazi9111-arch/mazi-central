/* MONARCH XR · primera versión (MVP) de la experiencia educativa de la mariposa monarca, con el MISMO motor de Mazi VR.
   Proyecto de Ética y STEAM de Carlos, antes de diciembre de 2026. Plan y datos verificados: are/Documentation/MONARCH_XR.md.
     · Ocho escenas: Bienvenida → La monarca → Migración → Santuario → Amenazas (2) → Decisión → Cuestionario → Final.
     · Cada escena: una foto 360° de fondo (Poly Haven, CC0) o el cielo del motor, un cartel con su texto y botones.
     · NARRADOR (narrador.js): uno con ironía que explica cada escena (Orus) y reacciona con la voz grave (Charon) a lo
       que haces: adelantarte mientras habla, regresar, mirar a otro lado, quedarte quieto, plantar, decidir, contestar.
       Audios hechos de antemano (medios/narrador/), suenan sin internet. Se apaga con «Voz».
     · SÓLO DATOS VERIFICADOS: cada cifra sale de la tabla de MONARCH_XR.md, con su fuente y año. Nada inventado.
     · MODO EXPOSICIÓN: con ?monarca en la dirección (el QR), entra directo y los botones que sacan no sacan. El docente sale
       apretando Opciones (o PS) 5 veces seguidas; en pantalla, tocando 5 veces la esquina de arriba a la izquierda.
       Bloquear el botón de inicio del teléfono no lo puede hacer una página: Acceso guiado (iPhone) o Fijar pantalla
       (Android), ver vr/monarca/DOCENTE.md. */
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { crearNarrador } from './narrador.js';

const AQUI = (f) => new URL(f, import.meta.url).href;
const MORADO = '#AC27FF', VINO = '#7E1735', NARANJA = '#F28C1B';

/* el guion: lo que dice cada cartel (y lo que lee la voz) */
const ESCENAS = [
  { id: 'bienvenida', cielo: 'alps_field', titulo: 'MONARCH XR', texto: ['Viaja con la mariposa monarca.', 'Mira a tu alrededor. Elige con la mirada, la mano, el control o tocando.'], boton: 'Empezar', monarca: 'vuela' },
  { id: 'mariposa', cielo: 'alps_field', titulo: 'La monarca', texto: ['La hembra pone sus huevos sólo en el algodoncillo (asclepia).', 'Es lo único que comen sus orugas. Ya adulta, toma néctar de muchas flores.'], fuente: 'National Park Service', monarca: 'cerca' },
  { id: 'ciclo', cielo: 'alps_field', titulo: 'Su ciclo de vida', texto: ['Del huevo sale una oruga que sólo come algodoncillo y muda de piel 5 veces para crecer. Luego se vuelve crisálida y de ahí sale la mariposa.', 'En verano, de huevo a adulta tarda menos de 30 días; con frío, más.'], fuente: 'U.S. Forest Service · USFWS', etapas: [['Huevo', '~4 días'], ['Oruga', '9 a 14 días'], ['Crisálida', '9 a 15 días'], ['Adulta', 'vuela']], monarca: 'cerca' },
  { id: 'flores', cielo: 'alps_field', titulo: 'Flores en el camino', texto: ['Ya adulta, la monarca toma néctar de muchas flores.', 'Planta cinco flores: elige dónde y mira cómo llega.'], fuente: 'National Park Service', juego: 'flores', monarca: 'vuela' },
  { id: 'migracion', cielo: null, titulo: 'La migración', texto: ['Cada otoño viajan más de 3,000 km hasta el centro de México; desde Canadá, unos 4,500.', 'Ninguna hace sola la ida y la vuelta: es un viaje de varias generaciones. La que viaja al sur vive hasta unos 9 meses; las de verano, semanas.'], fuente: 'U.S. Fish & Wildlife Service, 2024', mapa: true },
  { id: 'santuario', cielo: 'misty_pines', titulo: 'El santuario', texto: ['Pasan el invierno en 11 o 12 montañas de Michoacán y el Estado de México, de octubre a finales de marzo, en bosques de oyamel.', 'La Reserva de la Biosfera Mariposa Monarca mide 56,259 ha y es Patrimonio Mundial desde 2008.'], fuente: 'U.S. Forest Service · UNESCO', monarca: 'colonia' },
  { id: 'tala', cielo: 'barnaslingan_02', titulo: 'Amenaza: el bosque', texto: ['Entre febrero de 2024 y febrero de 2025 se degradaron 2.55 ha del corazón de la reserva:', 'tala ilegal 1.85 ha, incendios 0.58 ha y sequía 0.11 ha.'], fuente: 'WWF México y UNAM, 2026' },
  { id: 'campo', cielo: 'misty_farm_road', titulo: 'Amenaza: sin algodoncillo', texto: ['Sin algodoncillo no hay orugas, y sin orugas no hay migración.', 'En 2022 la UICN la puso En Peligro; en 2023, Vulnerable.'], fuente: 'National Park Service · UICN' },
  { id: 'decision', cielo: 'misty_pines', titulo: 'Tú decides', texto: ['Tu familia tiene un terreno con oyameles junto al santuario.', 'Una empresa ofrece pagar por talarlo. ¿Qué haces?'], opciones: [
    ['Talar', 'Hay dinero ahora, pero el bosque tarda décadas en volver y las mariposas pierden su refugio de invierno.'],
    ['Conservar', 'El bosque queda, pero tu familia no recibe nada por cuidarlo. ¿Quién debería pagar por conservar?'],
    ['Turismo', 'Visitas guiadas pueden dar ingresos sin talar, si se respetan los límites para no molestar a las colonias.']] },
  { id: 'cuestionario', cielo: 'alps_field', titulo: 'Cuestionario' },
  { id: 'final', cielo: 'misty_pines', titulo: 'Final', texto: ['Temporada 2025-2026: 2.93 ha de colonias, 64 % más que el año anterior.', 'Pero una temporada buena no es una tendencia: el máximo fue 18.19 ha (1996-97) y el mínimo 0.67 ha (2013-14).'], fuente: 'WWF México y CONANP, 2026', monarca: 'vuela' },
];
/* el cuestionario: sólo lo que se contó */
const PREGUNTAS = [
  ['¿Dónde pone sus huevos la monarca?', ['En cualquier flor', 'En el algodoncillo', 'En el oyamel'], 1],
  ['¿En qué orden cambia la monarca?', ['Oruga, huevo, mariposa', 'Huevo, oruga, crisálida, mariposa', 'Crisálida, oruga, mariposa'], 1],
  ['¿Una sola mariposa hace la ida y la vuelta?', ['Sí, cada año', 'No: son varias generaciones', 'Sólo las de verano'], 1],
  ['¿Qué árbol domina en su santuario?', ['El oyamel', 'El pino de playa', 'La palmera'], 0],
  ['¿Qué degradó más bosque en 2024-2025?', ['La sequía', 'Los incendios', 'La tala ilegal'], 2],
];
const CREDITOS = 'Monarca escaneada: Virginia Tech University Libraries (CC BY 4.0). Flores: Poly Haven, Rico Cilliers y Jenelle van Heerden (CC0). Fotos 360°: Poly Haven (CC0). Mapa: Natural Earth. Datos: USFWS, US Forest Service, UNESCO, WWF México, CONANP, UNAM, UICN, NPS.';

export function montarMonarca(V){
  const { THREE } = V;
  const m = { grupo: new THREE.Group(), estado: { escena: 0, puntos: 0, pregunta: 0, eleccion: null, voz: true, cargados: 0 } };
  const st = m.estado;
  const narr = crearNarrador({ actx: V.audio, base: (id) => AQUI(`medios/narrador/${id}.mp3`), sinVoz: () => !st.voz });
  m.narrador = narr;
  /* lo que hace la persona, para que el narrador se dé cuenta */
  const ahora = () => performance.now() / 1000;
  const vez = { prisa: 0, lejos: 0, quieto: 0, bien: 0 };
  let tocoEn = 0, calladoDesde = 0, quietosAqui = 0, lejosDesde = 0, lejosAqui = false, florHablo = false, atrasEn = -99;
  const turno = (pre, n) => `${pre}-${(vez[pre.slice(2)]++ % n) + 1}`;

  /* ── el cielo 360° ── */
  const texs = {}, cargador = new THREE.TextureLoader();
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, toneMapped: false }));
  cielo.renderOrder = -5; cielo.visible = false; m.grupo.add(cielo);
  const textura = (nombre) => texs[nombre] || (texs[nombre] = new Promise((ok) => cargador.load(AQUI(`medios/cielos/${nombre}.webp`), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; st.cargados++; ok(t); }, undefined, () => ok(null))));
  async function ponerCielo(nombre){
    if(!nombre){ cielo.visible = false; return; }
    const t = await textura(nombre); if(ESCENAS[st.escena].cielo !== nombre) return;
    cielo.material.map = t; cielo.material.needsUpdate = true; cielo.visible = !!t;
  }

  /* ── el cartel: título, texto en renglones y la fuente ── */
  const cartel = new V.Panel(1.8, 1.05, 560); cartel.malla.position.set(0, .42, -2.2); m.grupo.add(cartel.malla);
  function renglones(x, texto, ancho){ const out = []; let r = ''; for(const p of texto.split(' ')){ const n = r ? r + ' ' + p : p; if(x.measureText(n).width > ancho && r){ out.push(r); r = p; } else r = n; } if(r) out.push(r); return out; }
  function pintarCartel(titulo, texto = [], fuente = ''){
    const { x, cv } = cartel, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    V.redondo(x, 6, 6, w - 12, h - 12, 40); x.fillStyle = 'rgba(23,10,38,.92)'; x.fill(); x.lineWidth = 4; x.strokeStyle = MORADO; x.stroke();
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = NARANJA; x.font = '900 58px system-ui, -apple-system, sans-serif'; x.fillText(titulo, 50, 92);
    /* la letra más grande que quepa (de 46 a 28 px): así el texto largo nunca se sale y el corto se lee de lejos */
    let tam = 46, lineas;
    for(; tam >= 28; tam -= 2){ x.font = `600 ${tam}px system-ui, -apple-system, sans-serif`; lineas = texto.map((p) => renglones(x, p, w - 100));
      const alto = lineas.reduce((s, l) => s + l.length * tam * 1.3 + tam * .4, 0); if(150 + alto < h - 60) break; }
    let y = 150 + tam; x.fillStyle = '#F4EEF2';
    for(const ls of lineas){ for(const r of ls){ x.fillText(r, 50, y); y += tam * 1.3; } y += tam * .4; }
    if(fuente){ x.fillStyle = '#C9B6DA'; x.font = '500 24px system-ui, -apple-system, sans-serif'; x.fillText('Fuente: ' + fuente, 50, h - 36); }
    cartel.listo();
  }

  /* ── los botones: fila debajo del cartel ── */
  let botones = [];
  function boton(texto, accion, ancho = .5){
    /* «Voz» se vuelve a pintar sola, sin volver a armar la escena (si no, las flores plantadas se borraban) */
    const p = new V.Panel(ancho, .16, 520); p.titulo = texto;
    const pintar = (f) => { const { x, cv } = p, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); V.redondo(x, 4, 4, w - 8, h - 8, (h - 8) / 2);
      x.fillStyle = f ? '#3A1A5C' : '#24123A'; x.fill(); x.lineWidth = f ? 7 : 3; x.strokeStyle = f ? MORADO : '#3C2652'; x.stroke();
      x.fillStyle = '#F4EEF2'; x.font = `800 ${texto.length > 22 ? 28 : 36}px system-ui, -apple-system, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, w / 2, h / 2 + 2); p.listo(); };
    p.foco = (f) => { if(p._f === f) return; p._f = f; pintar(f); }; p._f = false; pintar(false);
    p.malla.userData.accion = () => { V.sonar('toque', .3); tocoEn = ahora(); accion(); };
    p.malla.userData.retitular = (t) => { texto = t; p.titulo = t; pintar(p._f); };
    return p.malla;
  }
  function ponerBotones(lista, y = -.38){
    botones.forEach((b) => m.grupo.remove(b)); botones = lista;
    const ancho = lista.reduce((s, b) => s + b.geometry.parameters.width + .06, -.06);
    let x = -ancho / 2; for(const b of lista){ const w = b.geometry.parameters.width; b.position.set(x + w / 2, y, -2.1); x += w + .06; m.grupo.add(b); }
  }

  /* ── la monarca: el ejemplar escaneado, y una colonia de copias en el santuario ── */
  const mariposa = new THREE.Group(), colonia = new THREE.Group(); m.grupo.add(mariposa, colonia); mariposa.visible = colonia.visible = false;
  let modelo = null;
  m.armado = new GLTFLoader().loadAsync(AQUI('medios/monarca.glb')).then((g) => {
    const s = g.scene, caja = new THREE.Box3().setFromObject(s), tam = caja.getSize(new THREE.Vector3()), c = caja.getCenter(new THREE.Vector3());
    const piv = new THREE.Group(); s.position.sub(c); piv.add(s); piv.scale.setScalar(.32 / Math.max(tam.x, tam.y, tam.z));
    s.traverse((o) => { if(o.isMesh){ const v = o.material; o.material = new THREE.MeshBasicMaterial({ map: v.map || null, color: v.map ? 0xffffff : v.color, side: THREE.DoubleSide, transparent: v.transparent, alphaTest: .3 }); } });
    modelo = piv; mariposa.add(piv);
    /* la colonia: 18 copias (la escaneada pesa 24 mil triángulos; más copias tiran los cuadros en el teléfono) */
    let k = 3; const az = () => (k = (k * 16807) % 2147483647) / 2147483647;
    for(let i = 0; i < 18; i++){ const c2 = piv.clone(); const a = (az() - .5) * 2.4, r = 1.3 + az() * 2;   /* sobre todo enfrente (±70°) */
      c2.userData.base = new THREE.Vector3(Math.sin(a) * r, -.3 + az() * 1.6, -Math.cos(a) * r); c2.userData.fase = az() * 6; c2.scale.multiplyScalar(.6 + az() * .5); colonia.add(c2); }
  }).catch((e) => { V.fallo?.('E-MONARCA', 'cargar monarca.glb', e); });

  /* ── el minijuego «Flores en el camino»: cinco lugares en el pasto; al elegir uno crece una flor (Poly Haven, cinco
     variedades de Empodium) y la monarca vuela a tomar néctar ── */
  const flores = new THREE.Group(); m.grupo.add(flores); let variedades = [], lugares = [], plantadas = 0, objetivo = null;
  m.armadoFlores = new GLTFLoader().loadAsync(AQUI('medios/flores.glb')).then((g) => {
    g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => { if(!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); const b = geo.boundingBox, c = b.getCenter(new THREE.Vector3());
      geo.translate(-c.x, -b.min.y, -c.z); const alto = b.max.y - b.min.y || 1; geo.scale(.6 / alto, .6 / alto, .6 / alto);
      variedades.push(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: o.material.map || null, side: THREE.DoubleSide, alphaTest: .4 }))); });
  }).catch((e) => V.fallo?.('E-MONARCA', 'cargar flores.glb', e));
  /* cerca y a la vista (más abajo y más a los lados se salían de lo que se ve con el visor) */
  const PASTO = [-38, -19, 0, 19, 38].map((g, i) => { const a = g * Math.PI / 180, d = i % 2 ? 1.35 : 1.7; return new THREE.Vector3(Math.sin(a) * d, -.95, -Math.cos(a) * d); });
  function juegoFlores(){
    flores.clear(); plantadas = 0; objetivo = null;
    lugares = PASTO.map((p, i) => { const b = boton('Plantar', () => plantar(i, b), .34); b.position.copy(p).add(new THREE.Vector3(0, .3, 0)); b.lookAt(0, b.position.y * .3, 0); m.grupo.add(b); return b; });
  }
  function plantar(i, b){
    m.grupo.remove(b); lugares = lugares.filter((x) => x !== b);
    const v = variedades[i % Math.max(1, variedades.length)]; if(v){ const f = v.clone(); f.position.copy(PASTO[i]); f.scale.setScalar(.01); f.userData.nace = performance.now() / 1000; flores.add(f); }
    objetivo = PASTO[i].clone().add(new THREE.Vector3(0, .5, 0)); plantadas++; V.sonar('ding', .3);
    if(plantadas < PASTO.length){
      if(narr.actual === 'e-flores' && narr.falta() > 2 && !florHablo){ florHablo = true; narr.interrumpir('r-flor-hablando'); }
      else if(plantadas === 1 && !narr.actual) narr.decir(['r-flor-1']);
    }
    if(plantadas >= PASTO.length){ objetivo = null; const E = ESCENAS[st.escena];
      pintarCartel('¡Listo!', ['Cinco flores en su camino: cinco lugares para tomar néctar.'], E.fuente); narr.decir(['r-flores-todas']);
      ponerBotones([boton('Siguiente', () => mostrar(st.escena + 1)), vozBoton()]); }
  }
  const quitarLugares = () => { lugares.forEach((b) => m.grupo.remove(b)); lugares = []; };

  /* ── el mapa de la migración: Norteamérica de Natural Earth y la ruta que se dibuja sola ── */
  const mapaP = new V.Panel(1.3, 1.0, 500); mapaP.malla.position.set(0, .42, -2.25); mapaP.malla.visible = false; m.grupo.add(mapaP.malla);
  let mapa = null; fetch(AQUI('medios/mapa.json')).then((r) => r.json()).then((j) => { mapa = j; }).catch((e) => V.fallo?.('E-MONARCA', 'cargar mapa.json', e));
  /* la ruta oriental, aproximada: del sur de Canadá a las montañas de Michoacán (lon, lat) */
  const RUTA = [[-79.5, 46], [-84, 42], [-90, 37.5], [-97, 32.5], [-99.5, 27], [-100.2, 19.6]];
  function pintarMapa(k){
    const { x, cv } = mapaP, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    V.redondo(x, 6, 6, w - 12, h - 12, 34); x.fillStyle = 'rgba(23,10,38,.94)'; x.fill(); x.lineWidth = 4; x.strokeStyle = MORADO; x.stroke();
    if(!mapa){ mapaP.listo(); return; }
    const c = mapa.caja, px = (lon) => 30 + (lon - c.x0) / (c.x1 - c.x0) * (w - 60), py = (lat) => 30 + (c.y1 - lat) / (c.y1 - c.y0) * (h - 60);
    x.lineWidth = 2; x.strokeStyle = '#7E6A96'; x.fillStyle = 'rgba(172,39,255,.12)';
    for(const anillos of Object.values(mapa.paises)) for(const a of anillos){ x.beginPath(); a.forEach(([lo, la], i) => i ? x.lineTo(px(lo), py(la)) : x.moveTo(px(lo), py(la))); x.closePath(); x.fill(); x.stroke(); }
    /* la ruta hasta donde va (k de 0 a 1) */
    const n = (RUTA.length - 1) * Math.min(1, k); x.strokeStyle = NARANJA; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath();
    for(let i = 0; i <= Math.floor(n); i++) i ? x.lineTo(px(RUTA[i][0]), py(RUTA[i][1])) : x.moveTo(px(RUTA[i][0]), py(RUTA[i][1]));
    const f = n - Math.floor(n), i0 = Math.floor(n); if(i0 < RUTA.length - 1){ const a = RUTA[i0], b = RUTA[i0 + 1]; x.lineTo(px(a[0] + (b[0] - a[0]) * f), py(a[1] + (b[1] - a[1]) * f)); }
    x.stroke();
    const fin = RUTA[RUTA.length - 1]; x.fillStyle = k >= 1 ? NARANJA : '#7E6A96'; x.beginPath(); x.arc(px(fin[0]), py(fin[1]), 10, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#F4EEF2'; x.font = '700 24px system-ui, -apple-system, sans-serif'; x.fillText('Canadá', px(-84), py(52)); x.fillText('Michoacán y Edomex', px(-108), py(16.5));
    mapaP.listo();
  }

  /* ── las etapas del ciclo: cuatro tarjetitas debajo del cartel; se enciende una tras otra ── */
  const etapas = new THREE.Group(); m.grupo.add(etapas); let etapasP = [];
  function ponerEtapas(lista){
    etapas.clear(); etapasP = [];
    if(!lista) return;
    const w = .4, sep = .05, total = lista.length * w + (lista.length - 1) * sep;
    lista.forEach(([nombre, dias], k) => { const p = new V.Panel(w, .2, 520); p.malla.position.set(-total / 2 + w / 2 + k * (w + sep), -.2, -2.15); etapas.add(p.malla); etapasP.push({ p, nombre, dias, on: null }); });
  }
  function pintarEtapas(activa){
    etapasP.forEach((e, k) => { const on = k === activa; if(e.on === on) return; e.on = on;
      const { x, cv } = e.p, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); V.redondo(x, 4, 4, w - 8, h - 8, 26);
      x.fillStyle = on ? '#3A1A5C' : 'rgba(23,10,38,.9)'; x.fill(); x.lineWidth = on ? 6 : 3; x.strokeStyle = on ? NARANJA : '#3C2652'; x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = on ? NARANJA : '#F4EEF2'; x.font = '800 34px system-ui, -apple-system, sans-serif'; x.fillText(e.nombre, w / 2, h * .38);
      x.fillStyle = '#C9B6DA'; x.font = '600 24px system-ui, -apple-system, sans-serif'; x.fillText(e.dias, w / 2, h * .72); e.p.listo(); });
  }

  /* ── la voz: el narrador ── */
  const vozBoton = () => { const b = boton(st.voz ? 'Voz: Sí' : 'Voz: No', () => {
    if(st.voz){ narr.decir(['r-voz-off']); st.voz = false; }   /* se despide y se calla (lo que ya pidió sí suena) */
    else { st.voz = true; narr.decir(['r-voz-on']); }
    b.userData.retitular(st.voz ? 'Voz: Sí' : 'Voz: No'); }, .36); return b; };

  /* ── las escenas ── */
  let t0 = 0;
  function mostrar(i, pre = []){
    /* ¿se adelantó mientras explicaba? ¿regresó? el narrador lo dice antes de seguir */
    const ant = st.escena, explicando = narr.actual && narr.actual.startsWith('e-') && narr.falta() > 2.5;
    if(!pre.length && i === ant + 1 && explicando) pre = [turno('r-prisa', 3)];
    else if(!pre.length && i === ant - 1 && ahora() - atrasEn > 40){ pre = ['r-atras']; atrasEn = ahora(); }
    quietosAqui = 0; lejosAqui = false; lejosDesde = 0; florHablo = false; calladoDesde = ahora();
    st.escena = i; const E = ESCENAS[i]; t0 = performance.now() / 1000;
    const decir = () => narr.decir([...pre, 'e-' + E.id]);
    /* sin foto 360°, el cielo del motor (si no, se ve negro) */
    ponerCielo(E.cielo); V.cuarto.visible = !E.cielo; mapaP.malla.visible = !!E.mapa; cartel.malla.position.set(E.mapa ? -.92 : 0, .42, E.mapa ? -2.3 : -2.2); cartel.malla.lookAt(0, .42 * .3, 0);
    mariposa.visible = E.monarca === 'vuela' || E.monarca === 'cerca'; colonia.visible = E.monarca === 'colonia';
    if(E.mapa){ mapaP.malla.position.set(.72, .42, -2.3); mapaP.malla.lookAt(0, .42 * .3, 0); }
    const siguiente = () => mostrar(i + 1);
    ponerEtapas(E.etapas); if(E.etapas) pintarEtapas(0);
    quitarLugares(); flores.visible = E.juego === 'flores'; if(E.juego !== 'flores') objetivo = null;
    if(E.juego === 'flores'){ cartel.malla.position.set(0, .62, -2.3); juegoFlores(); pintarCartel(E.titulo, E.texto, E.fuente); decir(); ponerBotones([boton('Atrás', () => mostrar(i - 1), .36), vozBoton()], -.2); return; }
    if(E.id === 'cuestionario') return preguntar([...pre, 'e-cuestionario']);
    if(E.id === 'decision' && st.eleccion == null){
      pintarCartel(E.titulo, E.texto); decir();
      ponerBotones(E.opciones.map(([t, que], k) => boton(t, () => { st.eleccion = k; pintarCartel(t, [que]); narr.decir([['r-talar', 'r-conservar', 'r-turismo'][k]]); ponerBotones([boton('Siguiente', () => { mostrar(i + 1); }), vozBoton()]); }, .44)));
      return;
    }
    pintarCartel(E.titulo, E.texto, E.fuente);
    if(E.id === 'final'){ narr.decir([...pre, 'e-final', st.puntos === PREGUNTAS.length ? 'r-perfecto' : st.puntos === 0 ? 'r-cero' : 'r-medio']);
      ponerBotones([boton(`${st.puntos} de ${PREGUNTAS.length}`, () => {}, .4), boton('Créditos', () => { pintarCartel('Créditos', [CREDITOS]); narr.decir(['r-creditos']); }, .4), boton('Otra vez', () => reiniciar(), .4)]); return; }
    decir();
    ponerBotones([...(i > 0 ? [boton('Atrás', () => mostrar(i - 1), .36)] : []), boton(E.boton || 'Siguiente', siguiente), vozBoton()], E.etapas ? -.44 : -.38);
  }
  function preguntar(pre = []){
    const E = ESCENAS[st.escena], q = PREGUNTAS[st.pregunta], n = st.pregunta + 1;
    if(!q){ mostrar(st.escena + 1); return; }
    pintarCartel(`${E.titulo} · ${n} de ${PREGUNTAS.length}`, [q[0]]); narr.decir([...pre, 'q-' + n]);
    ponerBotones(q[1].map((t, k) => boton(t, () => {
      const bien = k === q[2]; if(bien) st.puntos++; V.sonar(bien ? 'ding' : 'toque', .35);
      pintarCartel(bien ? 'Correcto' : 'Casi', [bien ? q[1][k] : `Era: ${q[1][q[2]]}`]); narr.decir([bien ? turno('r-bien', 4) : `q-${n}-mal`]);
      ponerBotones([boton('Siguiente', () => { st.pregunta++; preguntar(); })]);
    }, .62)), -.38);
  }
  function reiniciar(){ st.puntos = 0; st.pregunta = 0; st.eleccion = null; mostrar(0, st.escena ? ['r-otra-vez'] : []); }

  /* ── cada cuadro: la mariposa vuela, la colonia aletea, la ruta se dibuja ── */
  let rutaK = -1;
  m.cuadro = () => {
    const t = performance.now() / 1000, E = ESCENAS[st.escena];
    if(modelo && mariposa.visible){
      if(E.monarca === 'cerca'){ mariposa.position.set(.95, .1, -1.3); mariposa.rotation.set(.3, t * .6, Math.sin(t * 9) * .12); mariposa.scale.setScalar(1.6); }
      else if(objetivo){ mariposa.position.lerp(new THREE.Vector3(objetivo.x + Math.sin(t * 2) * .12, objetivo.y + Math.sin(t * 3.1) * .06, objetivo.z + Math.cos(t * 2) * .12), .04); mariposa.rotation.set(0, t * 2, Math.sin(t * 12) * .25); mariposa.scale.setScalar(.8); }
      else { const a = t * .5; mariposa.position.set(Math.sin(a) * 1.1, .9 + Math.sin(t * 1.3) * .15, -1.8 + Math.cos(a) * .6); mariposa.rotation.set(0, a + Math.PI / 2, Math.sin(t * 12) * .25); mariposa.scale.setScalar(1); }
    }
    if(E.etapas) pintarEtapas(Math.floor((t - t0) / 1.6) % E.etapas.length);
    for(const f of flores.children){ const k = Math.min(1, (t - f.userData.nace) / .8); f.scale.setScalar(Math.max(.01, 1 - Math.pow(1 - k, 3))); }
    if(colonia.visible) for(const c of colonia.children){ const b = c.userData.base, f = c.userData.fase;
      c.position.set(b.x + Math.sin(t * .4 + f) * .25, b.y + Math.sin(t * .9 + f) * .12, b.z + Math.cos(t * .4 + f) * .25); c.rotation.set(0, t * .4 + f, Math.sin(t * 11 + f) * .3); }
    vigilar(t, E);
    if(E.mapa){ const k = Math.min(1, (t - t0) / 6); if(Math.abs(k - rutaK) > .01 || (k >= 1 && rutaK < 1)){ rutaK = k; pintarMapa(k); } } else rutaK = -1;
  };

  /* ── el narrador se da cuenta: mirar a otro lado mientras explica, o quedarse quieto cuando ya terminó ── */
  const dirCabeza = new THREE.Vector3(), dirCartel = new THREE.Vector3(), ojo = new THREE.Vector3();
  function vigilar(t, E){
    if(!st.voz || !m.grupo.visible) return;
    /* mirar lejos: más de 75° del cartel por 3 s mientras explica (no en las escenas que piden mirar alrededor) */
    if(narr.actual && narr.actual.startsWith('e-') && !lejosAqui && !['bienvenida', 'santuario', 'flores'].includes(E.id)){
      V.cabeza.getWorldPosition(ojo); V.cabeza.getWorldDirection(dirCabeza); cartel.malla.getWorldPosition(dirCartel).sub(ojo);
      dirCabeza.y = 0; dirCartel.y = 0;
      const ang = dirCabeza.lengthSq() > 1e-4 && dirCartel.lengthSq() > 1e-4 ? dirCabeza.angleTo(dirCartel) : 0;
      if(ang > 75 * Math.PI / 180){ if(!lejosDesde) lejosDesde = t; if(t - lejosDesde > 3){ lejosAqui = true; narr.interrumpir(turno('r-lejos', 2)); } }
      else lejosDesde = 0;
    }
    /* quieto: 25 s callados sin tocar nada (dos veces por escena como mucho; en el final, no) */
    if(narr.ocupado) calladoDesde = t;
    else if(E.id !== 'final' && quietosAqui < 2 && t - calladoDesde > 25 && t - tocoEn > 25){ quietosAqui++; calladoDesde = t; narr.decir([turno('r-quieto', 2)]); }
  }
  m.vigilar = vigilar;

  /* ── entrar y salir: se apaga el cuarto del motor y la mixta; al salir, todo vuelve ── */
  let antes = null;
  m.entrar = () => {
    antes = { cuarto: V.cuarto.visible, tem: window.__temshop?.grupo.visible, mixta: V.AJ.mixta };
    if(V.AJ.mixta) V.ponerMixta(false); V.cuarto.visible = false; if(window.__temshop) window.__temshop.grupo.visible = false;
    mostrar(st.escena); narr.precargar();
  };
  m.salir = () => {
    narr.callar();
    if(antes){ V.cuarto.visible = antes.cuarto; if(window.__temshop) window.__temshop.grupo.visible = !!antes.tem; if(antes.mixta) V.ponerMixta(true); }
  };
  m.elegibles = () => [...botones, ...lugares];
  /* en exposición no hay «Atrás» (ni el botón ni el Círculo): sólo la salida del docente */
  Object.defineProperty(m, 'atras', { get: () => (V.kiosco.activo ? undefined : () => V.ir('juegos')), configurable: true });
  m.atrasEn = [0, -1.25, -1.7];
  m.mostrar = mostrar; m.reiniciar = reiniciar; m.ESCENAS = ESCENAS; m.PREGUNTAS = PREGUNTAS;

  /* ── modo exposición: el docente sale con Opciones/PS 5 veces seguidas, o 5 toques en la esquina ── */
  let toques = [];
  const intentoSalir = () => { const t = performance.now(); toques = toques.filter((x) => t - x < 3000); toques.push(t);
    if(toques.length >= 5){ toques = []; V.kiosco.activo = false; V.kiosco.alPS = null; V.hud('Exposición apagada', 2); V.ir('inicio'); }
    else V.hud('Modo exposición', 1); };
  m.exposicion = (si) => { V.kiosco.activo = !!si; V.kiosco.alPS = si ? intentoSalir : null; };
  addEventListener('pointerdown', (e) => { if(V.kiosco.activo && e.clientX < 80 && e.clientY < 80) intentoSalir(); });

  V.registrar('monarca', m);
  window.__monarca = m;
  return m;
}
