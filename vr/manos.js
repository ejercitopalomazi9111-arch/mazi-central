/* MAZI VR · las manos (fase 2). La cámara de atrás ve tus manos por el hoyo del visor; MediaPipe saca 21 puntos de
   cada una y aquí se vuelven:
     · una mano dibujada encima de la tuya (puntos y huesos, del color de la casa);
     · un PUNTERO: la línea de tu ojo a la punta de tu índice; lo que toca se ilumina;
     · PELLIZCAR (pulgar con índice) = X, elegir;
     · PALMA ABIERTA quieta un momento = Círculo, regresar.
   La distancia a la mano se calcula por su tamaño en la imagen (una mano mide ~8.5 cm de la muñeca al nudillo
   del medio): no es exacto, pero alcanza para apuntar y tocar cosas cercanas. */
import { leer, tamano, contadorPuno } from './gestos.js';
import { crearEstable } from './manos-estables.js';
const MP = '../presentaciones/vendor/mediapipe/';
const HUESOS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

export async function iniciarManos(V){
  const { THREE, cabeza } = V;
  const estado = { listo: false, manos: 0, gesto: '', ms: 0, error: '' };
  let lm = null;
  try{
    const { FilesetResolver, HandLandmarker } = await import(MP + 'vision_bundle.mjs');
    const fs = await FilesetResolver.forVisionTasks(MP + 'wasm');
    const op = (delegate) => ({ baseOptions: { modelAssetPath: new URL('modelos/hand_landmarker.task', location.href).href, delegate }, runningMode: 'VIDEO', numHands: 4,
      minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
    try{ lm = await HandLandmarker.createFromOptions(fs, op('GPU')); }catch{ lm = await HandLandmarker.createFromOptions(fs, op('CPU')); }
    estado.listo = true;
  }catch(e){ estado.error = String(e?.message || e); console.warn('manos', e); return estado; }

  /* las dos manos dibujadas: 21 bolitas y sus huesos, pegadas a la cabeza (están en el espacio de la cámara) */
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#C77DFF'), depthTest: false, depthWrite: false, transparent: true, opacity: .95 });
  /* todo lo de las manos va al ÚLTIMO y encima (transparente + orden alto): el punto blanco era opaco, se pintaba antes que los
     botones (que son transparentes) y quedaba ATRÁS de ellos (Carlos, 18 nov) */
  const matP = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true, opacity: 1 });
  /* bolitas de radio 1: se escalan con la distancia para que se vean siempre del mismo tamaño, chiquitas (Carlos, 18 nov) */
  const bola = new THREE.SphereGeometry(1, 10, 8);
  const manos = [0, 1].map(() => {
    const g = new THREE.Group(); g.visible = false; g.renderOrder = 998; cabeza.add(g);
    const pts = Array.from({ length: 21 }, (_, i) => { const m = new THREE.Mesh(bola, i === 8 || i === 4 ? matP : mat); m.renderOrder = 999; g.add(m); return m; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(HUESOS.length * 6), 3));
    const lin = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color('#AC27FF'), depthTest: false, transparent: true, opacity: .8 })); lin.renderOrder = 998; g.add(lin);
    return { g, pts, lin, suave: null, pellizco: false, palmaDesde: 0, vista: 0, puno: contadorPuno(), estable: crearEstable() };
  });
  /* el puntero (Carlos, 18 nov: «que el punto blanco lance un rayo como cursor»): sale de entre la punta del índice y la
     del pulgar (los dos puntos blancos), en la dirección hombro → mano, como en los visores de verdad; y donde pega se
     pinta un cursor. Al juntar los dos dedos, clic */
  const rayosVis = [0, 1].map(() => {
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthTest: false, depthWrite: false }));
    linea.renderOrder = 997; linea.visible = false; cabeza.add(linea);
    const cursor = new THREE.Mesh(new THREE.RingGeometry(.012, .02, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false }));
    cursor.renderOrder = 999; cursor.visible = false; cabeza.add(cursor);
    const punto = new THREE.Mesh(new THREE.CircleGeometry(.006, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color('#C77DFF'), transparent: true, depthTest: false, depthWrite: false }));
    punto.renderOrder = 999; cursor.add(punto);
    return { linea, cursor };
  });
  let principalAntes = null;

  let ultimoT = -1, cuadroN = 0, enfriar = 0;
  const v3 = new THREE.Vector3(), origen = new THREE.Vector3(), dir = new THREE.Vector3();
  /* de un punto de la imagen (0..1) y la distancia estimada, a un punto en el espacio de la cabeza */
  function aEspacio(p, dist, tx, ty, out){
    return out.set((p.x * 2 - 1) * tx * dist, -(p.y * 2 - 1) * ty * dist, -dist + p.z * 2 * tx * dist);
  }
  const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  /* ── EL RASTREO CON MEMORIA (Carlos, 18 nov: «el tracker no guarda contexto de dónde estaba el dedo antes; si se tapa un
     pedazo lo marca en otra posición») ──
     · Filtro «un euro» en cada punto: quieto casi no tiembla; rápido, no se atrasa (Casiez et al., 2012).
     · Un dedo que BRINCA sin que se mueva la mano (lo que hace MediaPipe cuando adivina un dedo tapado) se toma con
       desconfianza: se acerca poco a poco al nuevo lugar en vez de saltar.
     · Si la mano se pierde un instante (≤ 0.35 s), se sostiene donde iba: no se suelta lo que traías ni desaparece el cursor. */
  const UE = { minCorte: 1.4, beta: 9, dCorte: 1 };
  const alfa = (corte, dt) => { const r = 2 * Math.PI * corte * dt; return r / (r + 1); };
  function filtrar(m, L, ahora){
    const f = m.filtro, dt = f ? Math.max(1 / 120, (ahora - f.t) / 1000) : 1 / 30;
    if(!f){ m.filtro = { t: ahora, p: L.map((q) => ({ x: q.x, y: q.y, z: q.z, dx: 0, dy: 0, dz: 0 })) }; return L.map((q) => ({ ...q })); }
    const escala = Math.hypot(L[9].x - L[0].x, L[9].y - L[0].y) || .1, mw = Math.hypot(L[0].x - f.p[0].x, L[0].y - f.p[0].y);
    const out = L.map((q, i) => {
      const P = f.p[i]; let x = q.x, y = q.y, z = q.z;
      /* brinco de un solo dedo: más de un tercio de mano lejos de donde iba, con la muñeca casi quieta */
      const salto = Math.hypot(x - P.x, y - P.y) - mw; if(i > 4 && salto > escala * .35){ x = P.x + (x - P.x) * .25; y = P.y + (y - P.y) * .25; z = P.z + (z - P.z) * .25; }
      const ad = alfa(UE.dCorte, dt);
      P.dx += ad * ((x - P.x) / dt - P.dx); P.dy += ad * ((y - P.y) / dt - P.dy); P.dz += ad * ((z - P.z) / dt - P.dz);
      const vel = Math.hypot(P.dx, P.dy), a = alfa(UE.minCorte + UE.beta * vel, dt);
      P.x += a * (x - P.x); P.y += a * (y - P.y); P.z += a * (z - P.z);
      return { x: P.x, y: P.y, z: P.z };
    });
    f.t = ahora; return out;
  }
  /* las de MediaPipe en metros (W) sólo se suavizan un poco: con ellas se mide el pellizco y el gatillo */
  function filtrarW(m, W){ if(!W) return W; if(!m.fW){ m.fW = W.map((q) => ({ x: q.x, y: q.y, z: q.z })); return m.fW.map((q) => ({ ...q })); }
    m.fW.forEach((P, i) => { P.x += (W[i].x - P.x) * .6; P.y += (W[i].y - P.y) * .6; P.z += (W[i].z - P.z) * .6; }); return m.fW.map((q) => ({ ...q })); }
  estado.cuadro = (t) => {
    const video = V.video, ahora = performance.now();
    if(!V.hayCamara() || !V.AJ.manos || video.readyState < 2){ manos.forEach((m) => { m.g.visible = false; }); rayosVis.forEach((x) => { x.linea.visible = x.cursor.visible = false; }); V.extra.rayo = null; V.extra.rayos = []; V.extra.manos = []; return; }
    /* un cuadro sí y uno no: en el iPhone el rastreo cuesta y la pantalla va a 60 */
    /* y si el teléfono va lento (el rastreo tarda más de 28 ms), uno de cada tres: que el visor no se trabe por las manos */
    /* MÁS SEGUIDO SI SE PUEDE (guía de Carlos: «aumentar la frecuencia del tracking»): si el rastreo tarda menos de 14 ms,
       en cada cuadro; si tarda más, uno sí y uno no; si pasa de 28 ms, uno de cada tres */
    if(++cuadroN % (estado.ms > 28 ? 3 : estado.ms > 14 ? 2 : 1) || video.currentTime === ultimoT) return;
    ultimoT = video.currentTime;
    const t0 = performance.now(); let r;
    try{ r = lm.detectForVideo(video, ahora); }catch(e){ estado.error = String(e?.message || e); return; }
    estado.ms = Math.round(performance.now() - t0);
    const asp = video.videoWidth / video.videoHeight, tx = Math.tan(V.campoCamara() * Math.PI / 360), ty = tx / asp;
    const voltear = V.AJ.camVoltear;
    estado.manos = r.landmarks.length; estado.gesto = '';
    const botones = []; const visibles = [];
    /* LAS TUYAS, aunque se cuelen otras (Carlos, 18 nov: «si se cuela otra mano se me quita una de las mías»): se ven
       hasta 4 y se quedan las dos que son tuyas: las más grandes (más cerca de la cámara) y las que entran por abajo
       de la imagen (de tu cuerpo). Cada una sigue en su lugar mientras se mueva poco entre cuadros */
    const hd = r.handedness || r.handednesses || [];
    const cand = r.landmarks.map((l, i) => { const L = voltear ? l.map((p) => ({ x: 1 - p.x, y: 1 - p.y, z: p.z })) : l;
      return { L, W: r.worldLandmarks?.[i], s: tamano(L, asp), wx: L[0].x, wy: L[0].y, etiqueta: hd[i]?.[0]?.categoryName || '', seguro: hd[i]?.[0]?.score ?? 0 }; });
    cand.forEach((c) => { c.nota = c.s * 4 + c.wy * .8; });
    /* CON LAS MANOS JUNTAS (Carlos, 18 nov: «si mis dos manos se acercan mucho, se rompe»): MediaPipe a veces ve la MISMA mano
       dos veces; si dos detecciones comparten muñeca y palma, se queda la mejor */
    const unicas = [];
    for(const c of cand.sort((a, b) => b.nota - a.nota))
      if(!unicas.some((u) => Math.hypot(u.wx - c.wx, u.wy - c.wy) < .035 && Math.hypot(u.L[9].x - c.L[9].x, u.L[9].y - c.L[9].y) < .035)) unicas.push(c);
    const mias = unicas.slice(0, 2), asign = [null, null];
    /* y se reparten por la combinación que menos se movió, contando si es izquierda o derecha: antes cada ranura agarraba la
       primera mano que tuviera cerca, y juntas, una se robaba la de la otra y se cruzaban */
    const costo = (c, k) => { const m = manos[k]; if(!m.ult) return .5;
      return Math.hypot(c.wx - m.ult.x, c.wy - m.ult.y) + (m.etiqueta && c.etiqueta && c.seguro > .7 && m.etiqueta !== c.etiqueta ? .6 : 0); };
    if(mias.length === 1){ asign[costo(mias[0], 0) <= costo(mias[0], 1) ? 0 : 1] = mias[0]; }
    else if(mias.length === 2){ const [a, b] = mias; if(costo(a, 0) + costo(b, 1) <= costo(a, 1) + costo(b, 0)){ asign[0] = a; asign[1] = b; } else { asign[0] = b; asign[1] = a; } }
    estado.vistas = cand.length;
    manos.forEach((m, k) => {
      const c = asign[k];
      /* perdida un instante: se sostiene como iba (no se suelta lo agarrado, el cursor no parpadea) */
      if(!c && m.info && ahora - (m.vistaEn || 0) < 350){ m.info.estimada = true; visibles.push(m.info); return; }
      if(!c){ m.g.visible = false; m.pellizco = false; m.palmaDesde = 0; m.suave = null; m.ult = null; m.info = null; m.fijo = null; m.hist = null; m.etiqueta = ''; m.G = null; m.filtro = null; m.fW = null; m.estable = crearEstable(); return; }
      m.vistaEn = ahora;
      /* antes de suavizar: dedos inventados, palma volteada de golpe y lado que brinca (manos-estables.js) */
      const E = m.estable.paso(c.L, c.W, c.etiqueta, c.seguro); m.dudosos = E.dudosos; m.sostenida = E.sostenida;
      const L = filtrar(m, E.L, ahora); m.ult = { x: c.wx, y: c.wy }; m.W = filtrarW(m, E.W); if(E.lado) m.etiqueta = E.lado;
      const s = tamano(L, asp), dist = Math.min(1.2, Math.max(.15, .085 / (s * 2 * tx)));
      /* EN tu mano (Carlos, 18 nov): con la mixta, la imagen de la cámara está pintada al fondo (a 20 m) y cada ojo la ve en el
         mismo lugar; los puntos se ponen a esa misma distancia y en la misma dirección, así caen justo encima de tu mano y no
         se desdoblan entre ojos. Sin la mixta no se ve tu mano: se dibujan a la distancia que se calcula, como una mano virtual */
      const mixta = V.AJ.mixta, lejos = 19.5;
      const nuevos = L.map((p) => mixta ? aEspacio({ x: p.x, y: p.y, z: 0 }, lejos, tx, ty, new THREE.Vector3()) : aEspacio(p, dist, tx, ty, new THREE.Vector3()));
      m.suave = nuevos;   /* ya viene filtrado (un euro): sin otra capa de retraso */
      m.mixta = mixta;
      m.suave.forEach((q, i) => { m.pts[i].position.copy(q); m.pts[i].scale.setScalar(q.length() * (i === 8 || i === 4 ? .0062 : .0042)); });
      const pos = m.lin.geometry.attributes.position; HUESOS.forEach(([a, b], i) => { pos.setXYZ(i * 2, ...m.suave[a].toArray()); pos.setXYZ(i * 2 + 1, ...m.suave[b].toArray()); }); pos.needsUpdate = true;
      m.g.visible = true;
      /* los gestos */
      const G = leer(L, asp); m.G = G;
      /* el pellizco con la mano EN 3D (metros, de MediaPipe): de frente la punta del pulgar tapa a la del índice y en la
         imagen plana nunca «se tocaban» (por eso no jalaba pellizcar) */
      const W = m.W;
      /* más fácil de captar (Carlos, 18 nov: «a veces no lo captura»): cuenta si se tocan en 3D o en la imagen */
      if(W){ const p3 = d3(W[4], W[8]); G.pellizca = !G.puno && (p3 < .038 || G.pinza < .3); G.suelta = G.puno || (p3 > .058 && G.pinza > .45); G.pinza3 = p3; }
      /* puño arriba y abajo 4 veces: el menú se vuelve a poner enfrente de donde miras */
      /* AGARRAR UN BOTÓN ES CLIC (Carlos, 19 nov: «casi casi trato de agarrar el botón para que salga y aún así no quiere»):
         cerrar la mano encima de un botón se leía como puño y no hacía nada. Ahora, si la mano apuntaba a un botón hace un
         momento y se cierra, es clic sobre ESE botón. */
      const cierra = G.puno && !m.punoAntes; m.punoAntes = G.puno;
      if(cierra && m.objetoAntes && ahora - (m.objetoEn || 0) < 450 && !V.extra.gestosVideo){ m.agarro = ahora; botones[V.B.X] = true; estado.gesto = 'agarrar'; }
      if(m.puno(G.puno, L[0].y, ahora)){ V.recentrar(); V.hud('Centrado', 1.2); V.sonar('ding', .3); }
      if(!m.pellizco && G.pellizca) m.pellizco = true; else if(m.pellizco && G.suelta) m.pellizco = false;
      /* donde la vista usa el pellizco para otra cosa (el video, leer), sólo es clic si apuntas a un botón */
      if(m.pellizco){ if(!V.extra.gestosVideo || V.extra.sobreBoton) botones[V.B.X] = true; estado.gesto = 'pellizco'; }
      const muneca = L[0], ix = L[8], tp = L[4];
      /* la mano en el espacio, aproximada (para el rayo y para los sables): palma, punta del medio y muñeca */
      const est = (q) => cabeza.localToWorld(aEspacio(q, dist, tx, ty, new THREE.Vector3()));
      const mano = { pellizco: m.pellizco, x: (ix.x + tp.x) / 2, y: (ix.y + tp.y) / 2, palma: G.palma, muneca: { x: muneca.x, y: muneca.y },
        lado: (L[0].x < .5) ? -1 : 1, mundo: { palma: est(L[9]), punta: est(L[12]), muneca: est(L[0]), dedo: est(L[8]), indice: est({ x: (ix.x + tp.x) / 2, y: (ix.y + tp.y) / 2, z: (ix.z + tp.z) / 2 }) },
        dist, tx, ty };
      /* la orientación de la mano y el gatillo (objetos.js): adelante = muñeca → nudillo del índice, lado = nudillo del
         meñique → nudillo del índice, índice = nudillo → punta; doblez = cuánto se dobla el índice (0 estirado, ~90 doblado) */
      if(W){ const sx = voltear ? -1 : 1, aM = (a, b) => new THREE.Vector3(sx * (W[b].x - W[a].x), -sx * (W[b].y - W[a].y), -(W[b].z - W[a].z)).normalize().transformDirection(cabeza.matrixWorld);
        const v1 = aM(5, 6), v2 = aM(6, 8);
        /* recto: qué tan estirado está el índice (1 recto, ~.5 doblado), medido por lo largo contra la suma de sus huesos;
           pulgar: qué tan pegado está el pulgar al costado del índice (chico = apretado, como un botón) */
        const largo = d3(W[5], W[6]) + d3(W[6], W[7]) + d3(W[7], W[8]) || 1, palma = d3(W[0], W[5]) || 1;
        mano.ejes = { adelante: aM(0, 5), lado: aM(17, 5), indice: aM(5, 8), doblez: v1.angleTo(v2) * 180 / Math.PI,
          recto: d3(W[5], W[8]) / largo, pulgar: Math.min(d3(W[4], W[6]), d3(W[4], W[5])) / palma }; }
      /* hacia dónde quedan la punta y el nudillo del índice VISTOS DESDE TU CABEZA (lo que sirve para apuntar aunque el
         dedo esté de frente y su dirección 3D falle) */
      { const ojo = cabeza.getWorldPosition(new THREE.Vector3()), dirDe = (i) => cabeza.localToWorld(m.suave[i].clone()).sub(ojo).normalize();
        mano.vista = { punta: dirDe(8), nudillo: dirDe(5), muneca: dirDe(0) }; }
      m.info = mano; visibles.push(mano);
      if(G.palma && !m.pellizco){ m.palmaDesde = m.palmaDesde || ahora; if(ahora - m.palmaDesde > 800 && ahora > enfriar){ botones[V.B.O] = true; enfriar = ahora + 1500; m.palmaDesde = 0; estado.gesto = 'palma'; } }
      else m.palmaDesde = 0;
    });
    V.extra.botones = botones; V.extra.manos = visibles;
    /* UN RAYO POR MANO (Carlos, 18 nov: «solamente aparece un rayo a la vez; haz que sea el derecho o que los dos tengan»).
       Cada mano lleva el suyo, desde la punta del índice y en su dirección. El principal (el que da el foco y el que llena
       el anillo de apuntar fijo) es el de la mano que pellizca; si ninguna, el de la que apunta; si no, el que ya lo era;
       si no, el de la mano derecha de la imagen. */
    const rayos = [];
    for(const m of manos){
      if(!m.info) continue;
      /* A TRAVÉS DEL DEDO (Carlos, 18 nov: «el rayo en el ojo derecho está más a la derecha y en el izquierdo más a la
         izquierda que el dedo»; «cuando apunto hacia adelante la mano no se traquea bien y el rayo sale hacia cualquier
         lado»). El rayo sale de tu cabeza y pasa por la punta de tu índice tal como la ve la cámara: el cursor cae justo
         donde tu dedo tapa algo. Con la mixta tu mano se ve en la imagen de la cámara, igual en los dos ojos; un rayo
         que sale del dedo en 3D se desdobla, uno por ojo. Y la punta en la imagen se ve aunque el dedo apunte de frente,
         que es justo cuando su dirección 3D falla. */
      const I = m.info, o = cabeza.getWorldPosition(new THREE.Vector3()), d = new THREE.Vector3();
      if(m.suave?.[8]) d.copy(cabeza.localToWorld(m.suave[8].clone())).sub(o).normalize(); else d.copy(I.mundo.dedo).sub(o).normalize();
      /* AL PELLIZCAR EL RAYO SE CONGELA (Carlos, 18 nov: «cuando apunto y hago el click no sirve»): para juntar los dedos el
         índice se dobla hacia el pulgar y el rayo se iba para otro lado justo en el clic. Mientras dura el pellizco se usa
         hacia dónde apuntaba ~200 ms antes de que se notara; sólo se traslada con la muñeca (para arrastrar). */
      const H = m.hist || (m.hist = []);
      H.push({ t: ahora, o: o.clone(), d: d.clone(), w: I.mundo.muneca.clone() }); while(H.length > 2 && ahora - H[0].t > 700) H.shift();
      if(m.pellizco){
        if(!m.fijo){ const e = H.filter((x) => ahora - x.t >= 200).pop() || H[0]; m.fijo = { o: e.o.clone(), d: e.d.clone(), w: e.w.clone(), desde: ahora }; m.dirSuave = e.d.clone(); }
        /* congelado: lo que se mueve la MANO (la muñeca vista desde tu cabeza) gira el rayo, para poder arrastrar */
        const w0 = m.fijo.w.clone().sub(o).normalize(), w1 = I.mundo.muneca.clone().sub(o).normalize();
        d.copy(m.fijo.d).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(w0, w1));
      } else m.fijo = null;
      /* suavizado aparte: el rayo tiembla más que la mano porque amplifica el giro */
      if(m.fijo) m.dirSuave.copy(d); else if(!m.dirSuave) m.dirSuave = d.clone(); else m.dirSuave.lerp(d, .45).normalize();
      const R = { origen: o, dir: m.dirSuave.clone(), lado: I.lado, pellizco: m.pellizco, mano: m };
      m.rayo = R; rayos.push(R);
    }
    const conPellizco = rayos.filter((R) => R.mano.fijo).sort((a, b) => b.mano.fijo.desde - a.mano.fijo.desde)[0];
    const principal = conPellizco || rayos.find((R) => R.mano.G?.apunta) || rayos.find((R) => R.mano === principalAntes) || rayos.find((R) => R.lado > 0) || rayos[0] || null;
    principalAntes = principal?.mano || null;
    V.extra.rayos = rayos; V.extra.rayo = principal;
    estado.rayos = rayos.length; estado.congelado = !!principal?.mano.fijo; estado.punta = principal ? principal.mano.info.mundo.dedo.toArray() : null;
    if(!principal){ rayosVis.forEach((x) => { x.linea.visible = x.cursor.visible = false; }); }
  };
  /* el dibujo de los rayos y sus cursores va cada cuadro (el rastreo, cada dos), con el punto donde pegó (lo pone vr.js) */
  const pA = new THREE.Vector3(), pB = new THREE.Vector3();
  estado.dibujar = () => {
    const L = V.extra.rayos || [];
    rayosVis.forEach((x, i) => {
      const R = L[i]; if(!R){ x.linea.visible = x.cursor.visible = false; return; }
      pA.copy(R.origen); pB.copy(R.hit || pB.copy(R.dir).multiplyScalar(4).add(R.origen));
      cabeza.worldToLocal(pA); cabeza.worldToLocal(pB);
      const P = x.linea.geometry.attributes.position; P.setXYZ(0, pA.x, pA.y, pA.z); P.setXYZ(1, pB.x, pB.y, pB.z); P.needsUpdate = true;
      /* sin línea: el cursor sale sólo sobre un botón (Carlos, 18 nov: «si no estoy mirando a ningún botón, que el cursor desaparezca») */
      x.linea.visible = false;
      x.cursor.visible = !!R.hit; if(R.hit){ x.cursor.position.copy(pB); x.cursor.scale.setScalar(Math.max(.4, -pB.z)); }
      x.cursor.material.color.set(R.pellizco ? 0xC77DFF : 0xffffff);
    });
  };
  return estado;
}
