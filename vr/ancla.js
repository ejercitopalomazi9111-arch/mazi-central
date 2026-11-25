/* MAZI VR · el ANCLA DEL CUARTO: una hoja impresa (marcador ArUco id 1, 14 cm) pegada en la pared o en el escritorio.
   Para qué: el 6DoF por cámara (VIO) se va desviando poco a poco, sobre todo en zonas con poca textura (Carlos, 19 nov:
   «a veces comenzaba a deslizarse al azar lejos de mí»). La hoja SÍ es un punto fijo del cuarto real: cada vez que la
   cámara la ve bien, se mide dónde la ve el motor y se regresa el mundo virtual a donde estaba la primera vez.
     · La primera vez que se ve, se guarda dónde quedó (en el mundo del motor).
     · Después, si se ve corrida, se mueve TU CUERPO (rig) para cancelar la diferencia: la mitad cada vez, para que no brinque.
     · Sólo con buena lectura: error de reproyección < 1.5 px, a menos de 3 m, la hoja de más de 40 px y la cabeza casi quieta.
     · Una diferencia de más de 1.5 m se toma como lectura mala, salvo que se repita 5 veces seguida (entonces era deriva real).
   Marcos: cámara de OpenCV (y abajo, z adelante) → cámara de three (y arriba, −z adelante): voltear y y z. */
export const ANCLA_ID = 1;
const envolver = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function crearAncla({ THREE, montarControl, AR = window.AR }){
  const ctl = montarControl({ THREE, escena: new THREE.Scene(), video: {}, poseCamara: () => null, intrinsecos: () => null, objetivos: () => [] });
  const leerCm = () => { try{ return Number(localStorage.getItem('mazixr-ancla-cm') || 14); }catch{ return 14; } };
  const detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12' });
  const st = { a0: null, vista: 0, correcciones: 0, ultima: null, rechazos: 0, grandes: 0, error: null, distancia: null, corregido: 0 };
  const F = new THREE.Matrix4().makeScale(1, -1, -1);
  /* el yaw de un vector horizontal: girar el mundo por θ alrededor de +y le SUMA θ */
  const yawDe = (v) => Math.atan2(-v.z, v.x);

  /** Lee la hoja en una imagen y la pone en el mundo. cam: { pos: Vector3, quat: Quaternion } de la CÁMARA en el mundo. */
  function observar(rgba, w, h, k, cam){
    const ms = detector.detectImage(w, h, rgba).filter((m) => m.id === ANCLA_ID);
    if(!ms.length) return null;
    ctl.conf.tam = leerCm() / 100;
    const esq = ctl.refinar(ms[0].corners, rgba, w, h);
    const lado = Math.hypot(esq[0].x - esq[1].x, esq[0].y - esq[1].y);
    const { m, error } = ctl.poseMarcador(esq, k.fx, k.cx, k.cy);
    const enCam = new THREE.Matrix4().multiplyMatrices(F, m);              /* marcador en el marco de la cámara de three */
    const camM = new THREE.Matrix4().compose(cam.pos, cam.quat, new THREE.Vector3(1, 1, 1));
    const mundo = new THREE.Matrix4().multiplyMatrices(camM, enCam);
    const pos = new THREE.Vector3().setFromMatrixPosition(mundo), x = new THREE.Vector3().setFromMatrixColumn(mundo, 0).normalize();
    const n = new THREE.Vector3().setFromMatrixColumn(mundo, 2).normalize();
    const distancia = new THREE.Vector3().setFromMatrixPosition(enCam).length();
    /* ¿el giro de la lectura es confiable? Una hoja plana vista DE FRENTE no delata bien hacia dónde mira (8.6° de error
       medido en pruebas-ancla.mjs, aunque la posición salga a 4 mm). Acostada en un escritorio, su giro es el giro EN su
       plano (eso sí se lee bien); en la pared, sólo si se ve de lado (más de 25°) */
    const acostada = Math.abs(n.y) > .7;
    const haciaCam = cam.pos.clone().sub(pos).normalize(), oblicua = Math.acos(Math.min(1, Math.abs(haciaCam.dot(n)))) * 180 / Math.PI;
    const giroFiable = acostada || oblicua > 25;
    st.error = error; st.distancia = distancia;
    return { pos, yaw: yawDe(acostada ? new THREE.Vector3(x.x, 0, x.z).normalize() : x), error, distancia, lado, acostada, oblicua, giroFiable };
  }

  /** Con una lectura buena, cuánto hay que girar y mover tu cuerpo para que la hoja vuelva a su lugar.
      cabeza: posición de tu cabeza en el mundo (el giro se hace alrededor de ella). Devuelve null si no toca corregir. */
  function corregir(obs, cabeza, { quieta = true, ganancia = .5 } = {}){
    if(!obs) return null;
    if(obs.error > 1.5 || obs.distancia > 3 || obs.lado < 40 || !quieta){ st.rechazos++; return null; }
    st.vista++;
    if(!st.a0){ st.a0 = { pos: obs.pos.clone(), yaw: obs.giroFiable ? obs.yaw : null }; return { dYaw: 0, dPos: new THREE.Vector3(), primera: true }; }
    /* el giro sólo se corrige con lecturas confiables (la primera confiable se vuelve la referencia) */
    if(obs.giroFiable && st.a0.yaw == null) st.a0.yaw = obs.yaw;
    const dYawTotal = obs.giroFiable && st.a0.yaw != null ? envolver(obs.yaw - st.a0.yaw) : 0;
    /* dónde quedaría la hoja si se gira tu cuerpo alrededor de tu cabeza */
    const giro = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -dYawTotal);
    const tras = obs.pos.clone().sub(cabeza).applyQuaternion(giro).add(cabeza);
    const e = tras.sub(st.a0.pos);
    if(e.length() > 1.5){ if(++st.grandes < 5){ st.rechazos++; return null; } }   /* lectura rara… salvo que se repita */
    st.grandes = 0;
    const g = st.grandes === 0 && e.length() > 1.5 ? 1 : ganancia;
    st.correcciones++; st.corregido = e.length();
    st.ultima = { dYaw: -dYawTotal * g, dPos: e.multiplyScalar(-g) };
    return st.ultima;
  }
  const olvidar = () => { st.a0 = null; st.vista = 0; st.correcciones = 0; };
  return { st, observar, corregir, olvidar, tamano: leerCm };
}

/* LO QUE SE QUEDA EN SU LUGAR ENTRE SESIONES: el menú (o lo que sea) se guarda RESPECTO a la hoja. Hace falta saber
   hacia dónde mira la hoja (giro confiable): por eso la hoja acostada en el escritorio es la que mejor sirve.
   pose: { pos: [x,y,z], yaw }  ·  ancla: { pos: Vector3|[x,y,z], yaw } */
const xyz = (v) => Array.isArray(v) ? v : [v.x, v.y, v.z];
export function respectoAncla(pose, ancla){
  const [px, py, pz] = xyz(pose.pos), [ax, ay, az] = xyz(ancla.pos), c = Math.cos(-ancla.yaw), s = Math.sin(-ancla.yaw);
  const dx = px - ax, dz = pz - az;
  return { pos: [c * dx + s * dz, py - ay, -s * dx + c * dz], yaw: envolver(pose.yaw - ancla.yaw) };
}
export function desdeAncla(rel, ancla){
  const [rx, ry, rz] = rel.pos, [ax, ay, az] = xyz(ancla.pos), c = Math.cos(ancla.yaw), s = Math.sin(ancla.yaw);
  return { pos: [ax + c * rx + s * rz, ay + ry, az - s * rx + c * rz], yaw: envolver(rel.yaw + ancla.yaw) };
}
export const LLAVE_SALA = 'mazixr-ancla-sala';

/* carga el detector de js-aruco2 (scripts clásicos, BSD) una vez */
let cargaAR = null;
export function cargarAruco(base){
  if(window.AR?.Detector) return Promise.resolve(window.AR);
  return cargaAR ||= ['cv.js', 'aruco.js'].reduce((p, f) => p.then(() => new Promise((ok, mal) => {
    const s = document.createElement('script'); s.src = base + f; s.onload = ok; s.onerror = () => mal(new Error('no cargó ' + f)); document.head.appendChild(s); })), Promise.resolve()).then(() => window.AR);
}
