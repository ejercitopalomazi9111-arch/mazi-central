/* MAZI VR · las manos (fase 2). La cámara de atrás ve tus manos por el hoyo del visor; MediaPipe saca 21 puntos de
   cada una y aquí se vuelven:
     · una mano dibujada encima de la tuya (puntos y huesos, del color de la casa);
     · un PUNTERO: la línea de tu ojo a la punta de tu índice; lo que toca se ilumina;
     · PELLIZCAR (pulgar con índice) = X, elegir;
     · PALMA ABIERTA quieta un momento = Círculo, regresar.
   La distancia a la mano se calcula por su tamaño en la imagen (una mano mide ~8.5 cm de la muñeca al nudillo
   del medio): no es exacto, pero alcanza para apuntar y tocar cosas cercanas. */
import { leer, tamano, contadorPuno } from './gestos.js';
const MP = '../presentaciones/vendor/mediapipe/';
const HUESOS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

export async function iniciarManos(V){
  const { THREE, cabeza } = V;
  const estado = { listo: false, manos: 0, gesto: '', ms: 0, error: '' };
  let lm = null;
  try{
    const { FilesetResolver, HandLandmarker } = await import(MP + 'vision_bundle.mjs');
    const fs = await FilesetResolver.forVisionTasks(MP + 'wasm');
    const op = (delegate) => ({ baseOptions: { modelAssetPath: new URL('modelos/hand_landmarker.task', location.href).href, delegate }, runningMode: 'VIDEO', numHands: 2,
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
    return { g, pts, lin, suave: null, pellizco: false, palmaDesde: 0, vista: 0, puno: contadorPuno() };
  });
  /* el puntero (Carlos, 18 nov: «que el punto blanco lance un rayo como cursor»): sale de entre la punta del índice y la
     del pulgar (los dos puntos blancos), en la dirección hombro → mano, como en los visores de verdad; y donde pega se
     pinta un cursor. Al juntar los dos dedos, clic */
  const rayoGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const rayo = new THREE.Line(rayoGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthTest: false, depthWrite: false })); rayo.renderOrder = 997; rayo.visible = false; cabeza.add(rayo);
  const cursor = new THREE.Mesh(new THREE.RingGeometry(.012, .02, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false }));
  cursor.renderOrder = 999; cursor.visible = false; cabeza.add(cursor);
  const punto = new THREE.Mesh(new THREE.CircleGeometry(.006, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color('#C77DFF'), transparent: true, depthTest: false, depthWrite: false }));
  punto.renderOrder = 999; cursor.add(punto);

  let ultimoT = -1, cuadroN = 0, enfriar = 0;
  const v3 = new THREE.Vector3(), origen = new THREE.Vector3(), dir = new THREE.Vector3();
  /* de un punto de la imagen (0..1) y la distancia estimada, a un punto en el espacio de la cabeza */
  function aEspacio(p, dist, tx, ty, out){
    return out.set((p.x * 2 - 1) * tx * dist, -(p.y * 2 - 1) * ty * dist, -dist + p.z * 2 * tx * dist);
  }
  const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  estado.cuadro = (t) => {
    const video = V.video, ahora = performance.now();
    if(!V.hayCamara() || !V.AJ.manos || video.readyState < 2){ manos.forEach((m) => { m.g.visible = false; }); rayo.visible = false; V.extra.rayo = null; V.extra.manos = []; return; }
    /* un cuadro sí y uno no: en el iPhone el rastreo cuesta y la pantalla va a 60 */
    if(++cuadroN % 2 || video.currentTime === ultimoT) return;
    ultimoT = video.currentTime;
    const t0 = performance.now(); let r;
    try{ r = lm.detectForVideo(video, ahora); }catch(e){ estado.error = String(e?.message || e); return; }
    estado.ms = Math.round(performance.now() - t0);
    const asp = video.videoWidth / video.videoHeight, tx = Math.tan(V.campoCamara() * Math.PI / 360), ty = tx / asp;
    const voltear = V.AJ.camVoltear;
    estado.manos = r.landmarks.length; estado.gesto = '';
    let apuntador = null; const botones = []; const visibles = [];
    manos.forEach((m, k) => {
      const l = r.landmarks[k];
      if(!l){ m.g.visible = false; m.pellizco = false; m.palmaDesde = 0; m.suave = null; return; }
      const L = voltear ? l.map((p) => ({ x: 1 - p.x, y: 1 - p.y, z: p.z })) : l;
      const s = tamano(L, asp), dist = Math.min(1.2, Math.max(.15, .085 / (s * 2 * tx)));
      /* EN tu mano (Carlos, 18 nov): con la mixta, la imagen de la cámara está pintada al fondo (a 20 m) y cada ojo la ve en el
         mismo lugar; los puntos se ponen a esa misma distancia y en la misma dirección, así caen justo encima de tu mano y no
         se desdoblan entre ojos. Sin la mixta no se ve tu mano: se dibujan a la distancia que se calcula, como una mano virtual */
      const mixta = V.AJ.mixta, lejos = 19.5;
      const nuevos = L.map((p) => mixta ? aEspacio({ x: p.x, y: p.y, z: 0 }, lejos, tx, ty, new THREE.Vector3()) : aEspacio(p, dist, tx, ty, new THREE.Vector3()));
      if(!m.suave || m.mixta !== mixta) m.suave = nuevos; else m.suave.forEach((q, i) => q.lerp(nuevos[i], .55));
      m.mixta = mixta;
      m.suave.forEach((q, i) => { m.pts[i].position.copy(q); m.pts[i].scale.setScalar(q.length() * (i === 8 || i === 4 ? .0062 : .0042)); });
      const pos = m.lin.geometry.attributes.position; HUESOS.forEach(([a, b], i) => { pos.setXYZ(i * 2, ...m.suave[a].toArray()); pos.setXYZ(i * 2 + 1, ...m.suave[b].toArray()); }); pos.needsUpdate = true;
      m.g.visible = true;
      /* los gestos */
      const G = leer(L, asp);
      /* el pellizco con la mano EN 3D (metros, de MediaPipe): de frente la punta del pulgar tapa a la del índice y en la
         imagen plana nunca «se tocaban» (por eso no jalaba pellizcar) */
      const W = r.worldLandmarks?.[k];
      if(W){ const p3 = d3(W[4], W[8]); G.pellizca = p3 < .032 && !G.puno; G.suelta = p3 > .05 || G.puno; G.pinza3 = p3; }
      /* puño arriba y abajo 4 veces: el menú se vuelve a poner enfrente de donde miras */
      if(m.puno(G.puno, L[0].y, ahora)){ V.recentrar(); V.hud('Centrado', 1.2); V.sonar('ding', .3); }
      if(!m.pellizco && G.pellizca) m.pellizco = true; else if(m.pellizco && G.suelta) m.pellizco = false;
      /* donde la vista usa el pellizco para otra cosa (el video, leer), sólo es clic si apuntas a un botón */
      if(m.pellizco){ if(!V.extra.gestosVideo || V.extra.sobreBoton) botones[V.B.X] = true; estado.gesto = 'pellizco'; }
      const muneca = L[0], ix = L[8], tp = L[4];
      /* la mano en el espacio, aproximada (para el rayo y para los sables): palma, punta del medio y muñeca */
      const est = (q) => cabeza.localToWorld(aEspacio(q, dist, tx, ty, new THREE.Vector3()));
      const mano = { pellizco: m.pellizco, x: (ix.x + tp.x) / 2, y: (ix.y + tp.y) / 2, palma: G.palma, muneca: { x: muneca.x, y: muneca.y },
        lado: (L[0].x < .5) ? -1 : 1, mundo: { palma: est(L[9]), punta: est(L[12]), muneca: est(L[0]), indice: est({ x: (ix.x + tp.x) / 2, y: (ix.y + tp.y) / 2, z: (ix.z + tp.z) / 2 }) },
        dist, tx, ty };
      m.info = mano; visibles.push(mano);
      if(G.palma && !m.pellizco){ m.palmaDesde = m.palmaDesde || ahora; if(ahora - m.palmaDesde > 800 && ahora > enfriar){ botones[V.B.O] = true; enfriar = ahora + 1500; m.palmaDesde = 0; estado.gesto = 'palma'; } }
      else m.palmaDesde = 0;
      if(!apuntador && (G.apunta || m.pellizco)) apuntador = m;
      if(!apuntador) apuntador = m;
    });
    V.extra.botones = botones; V.extra.manos = visibles;
    /* el rayo: del «hombro» (un poco abajo y del lado de esa mano) a la mano, y de ahí hacia adelante */
    if(apuntador?.info){
      const I = apuntador.info, hombro = cabeza.localToWorld(new THREE.Vector3(I.lado * .17, -.3, .05));
      origen.copy(I.mundo.indice); dir.copy(I.mundo.indice).sub(hombro).normalize();
      /* suavizado aparte: el rayo tiembla más que la mano porque amplifica el giro */
      if(!apuntador.dirSuave) apuntador.dirSuave = dir.clone(); else apuntador.dirSuave.lerp(dir, .45).normalize();
      V.extra.rayo = { origen: origen.clone(), dir: apuntador.dirSuave.clone() };
    } else { V.extra.rayo = null; rayo.visible = false; cursor.visible = false; }
  };
  /* el dibujo del rayo y del cursor va cada cuadro (el rastreo, cada dos), con el punto donde pegó (lo pone vr.js) */
  const pA = new THREE.Vector3(), pB = new THREE.Vector3();
  estado.dibujar = () => {
    const R = V.extra.rayo; if(!R){ rayo.visible = cursor.visible = false; return; }
    pA.copy(R.origen); pB.copy(R.hit || pB.copy(R.dir).multiplyScalar(4).add(R.origen));
    cabeza.worldToLocal(pA); cabeza.worldToLocal(pB);
    rayoGeo.attributes.position.setXYZ(0, pA.x, pA.y, pA.z); rayoGeo.attributes.position.setXYZ(1, pB.x, pB.y, pB.z); rayoGeo.attributes.position.needsUpdate = true;
    rayo.visible = true;
    cursor.visible = !!R.hit; if(R.hit){ cursor.position.copy(pB); cursor.scale.setScalar(Math.max(.4, -pB.z)); }
    const apretado = (V.extra.manos || []).some((m) => m.pellizco); cursor.material.color.set(apretado ? 0xC77DFF : 0xffffff);
  };
  return estado;
}
