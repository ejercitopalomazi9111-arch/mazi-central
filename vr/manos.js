/* MAZI VR · las manos (fase 2). La cámara de atrás ve tus manos por el hoyo del visor; MediaPipe saca 21 puntos de
   cada una y aquí se vuelven:
     · una mano dibujada encima de la tuya (puntos y huesos, del color de la casa);
     · un PUNTERO: la línea de tu ojo a la punta de tu índice; lo que toca se ilumina;
     · PELLIZCAR (pulgar con índice) = X, elegir;
     · PALMA ABIERTA quieta un momento = Círculo, regresar.
   La distancia a la mano se calcula por su tamaño en la imagen (una mano mide ~8.5 cm de la muñeca al nudillo
   del medio): no es exacto, pero alcanza para apuntar y tocar cosas cercanas. */
import { leer, tamano } from './gestos.js';
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
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#C77DFF'), depthTest: false, transparent: true, opacity: .95 });
  const matP = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
  const bola = new THREE.SphereGeometry(.006, 10, 8);
  const manos = [0, 1].map(() => {
    const g = new THREE.Group(); g.visible = false; g.renderOrder = 90; cabeza.add(g);
    const pts = Array.from({ length: 21 }, (_, i) => { const m = new THREE.Mesh(bola, i === 8 || i === 4 ? matP : mat); m.renderOrder = 91; g.add(m); return m; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(HUESOS.length * 6), 3));
    const lin = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color('#AC27FF'), depthTest: false, transparent: true, opacity: .8 })); lin.renderOrder = 90; g.add(lin);
    return { g, pts, lin, suave: null, pellizco: false, palmaDesde: 0, vista: 0 };
  });
  /* el puntero: una línea fina del ojo a la punta del dedo, y más allá */
  const rayoGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const rayo = new THREE.Line(rayoGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthTest: false })); rayo.renderOrder = 89; rayo.visible = false; cabeza.add(rayo);

  let ultimoT = -1, cuadroN = 0, enfriar = 0;
  const v3 = new THREE.Vector3(), origen = new THREE.Vector3(), dir = new THREE.Vector3();
  /* de un punto de la imagen (0..1) y la distancia estimada, a un punto en el espacio de la cabeza */
  function aEspacio(p, dist, tx, ty, out){
    return out.set((p.x * 2 - 1) * tx * dist, -(p.y * 2 - 1) * ty * dist, -dist + p.z * 2 * tx * dist);
  }
  estado.cuadro = (t) => {
    const video = V.video, ahora = performance.now();
    if(!V.hayCamara() || !V.AJ.manos || video.readyState < 2){ manos.forEach((m) => { m.g.visible = false; }); rayo.visible = false; V.extra.rayo = null; return; }
    /* un cuadro sí y uno no: en el iPhone el rastreo cuesta y la pantalla va a 60 */
    if(++cuadroN % 2 || video.currentTime === ultimoT) return;
    ultimoT = video.currentTime;
    const t0 = performance.now(); let r;
    try{ r = lm.detectForVideo(video, ahora); }catch(e){ estado.error = String(e?.message || e); return; }
    estado.ms = Math.round(performance.now() - t0);
    const asp = video.videoWidth / video.videoHeight, tx = Math.tan(V.campoCamara() * Math.PI / 360), ty = tx / asp;
    const voltear = V.AJ.camVoltear;
    estado.manos = r.landmarks.length; estado.gesto = '';
    let apuntador = null; const botones = [];
    manos.forEach((m, k) => {
      const l = r.landmarks[k];
      if(!l){ m.g.visible = false; m.pellizco = false; m.palmaDesde = 0; m.suave = null; return; }
      const L = voltear ? l.map((p) => ({ x: 1 - p.x, y: 1 - p.y, z: p.z })) : l;
      const s = tamano(L, asp), dist = Math.min(1.2, Math.max(.15, .085 / (s * 2 * tx)));
      /* suavizado: sin esto la mano tiembla */
      const nuevos = L.map((p) => aEspacio(p, dist, tx, ty, new THREE.Vector3()));
      if(!m.suave) m.suave = nuevos; else m.suave.forEach((q, i) => q.lerp(nuevos[i], .55));
      m.suave.forEach((q, i) => m.pts[i].position.copy(q));
      const pos = m.lin.geometry.attributes.position; HUESOS.forEach(([a, b], i) => { pos.setXYZ(i * 2, ...m.suave[a].toArray()); pos.setXYZ(i * 2 + 1, ...m.suave[b].toArray()); }); pos.needsUpdate = true;
      m.g.visible = true;
      /* los gestos */
      const G = leer(L, asp);
      if(!m.pellizco && G.pellizca) m.pellizco = true; else if(m.pellizco && G.suelta) m.pellizco = false;
      if(m.pellizco){ botones[V.B.X] = true; estado.gesto = 'pellizco'; }
      if(G.palma && !m.pellizco){ m.palmaDesde = m.palmaDesde || ahora; if(ahora - m.palmaDesde > 800 && ahora > enfriar){ botones[V.B.O] = true; enfriar = ahora + 1500; m.palmaDesde = 0; estado.gesto = 'palma'; } }
      else m.palmaDesde = 0;
      if(!apuntador && (G.apunta || m.pellizco)) apuntador = m;
      if(!apuntador) apuntador = m;
    });
    V.extra.botones = botones;
    /* el puntero sale del ojo hacia la punta del índice de la primera mano */
    if(apuntador){
      cabeza.getWorldPosition(origen); apuntador.pts[8].getWorldPosition(v3); dir.copy(v3).sub(origen).normalize();
      V.extra.rayo = { origen: origen.clone(), dir: dir.clone() };
      const tip = apuntador.suave[8], lejos = tip.clone().normalize().multiplyScalar(6);
      rayoGeo.attributes.position.setXYZ(0, ...tip.toArray()); rayoGeo.attributes.position.setXYZ(1, ...lejos.toArray()); rayoGeo.attributes.position.needsUpdate = true; rayo.visible = true;
    } else { V.extra.rayo = null; rayo.visible = false; }
  };
  return estado;
}
