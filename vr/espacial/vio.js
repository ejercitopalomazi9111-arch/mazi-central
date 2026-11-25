/* MAZI XR · el rastreo 6DoF como PIEZA DEL MOTOR (sin pantalla propia).
   Es lo mismo que hace la página de visloc-rs (app.js: sensores, cuadros y la pose predicha), sin su interfaz, para que
   el motor de Mazi VR y cualquier experiencia (MONARCH XR) lo usen con LA MISMA cámara que ya abrieron: en el iPhone
   abrir la cámara dos veces calla la primera.
   Lo que entrega: la pose de la CÁMARA en el mundo del VIO (z arriba, marco de OpenCV: x derecha, y abajo, z adelante),
   predicha al momento del cuadro con el giroscopio, y su estado («init», «wait», «track», «coast», «reset…»).
   Licencia de visloc-rs (worker.js, pkg/): MIT / Apache-2.0, en esta carpeta. */
import { detectDevice, loadCalibration, saveCalibration, intrinsics, IMU_DEFAULT } from './profiles.js';

const DEG = Math.PI / 180;
const quatMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
function quatFromRotvec(v){ const a = Math.hypot(v[0], v[1], v[2]); if(a < 1e-12) return [1, .5 * v[0], .5 * v[1], .5 * v[2]]; const s = Math.sin(a / 2) / a; return [Math.cos(a / 2), v[0] * s, v[1] * s, v[2] * s]; }
export function quatRotate(q, v){ const p = quatMul(quatMul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]); return [p[1], p[2], p[3]]; }
/* T_imu_cam de la cámara trasera con la pantalla girada `angle` grados (app.js, imuFromCameraRotation) */
function imuDeCamara(angle){
  const a = angle * DEG, c = Math.cos(a), s = Math.sin(a);
  const m = [[c, -s, 0], [-s, -c, 0], [0, 0, -1]];   /* columnas: x, y, z de la imagen en el aparato */
  const tr = m[0][0] + m[1][1] + m[2][2];
  let w, x, y, z;
  if(tr > 0){ const S = Math.sqrt(tr + 1) * 2; w = .25 * S; x = (m[2][1] - m[1][2]) / S; y = (m[0][2] - m[2][0]) / S; z = (m[1][0] - m[0][1]) / S; }
  else if(m[0][0] > m[1][1] && m[0][0] > m[2][2]){ const S = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; w = (m[2][1] - m[1][2]) / S; x = .25 * S; y = (m[0][1] + m[1][0]) / S; z = (m[0][2] + m[2][0]) / S; }
  else if(m[1][1] > m[2][2]){ const S = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; w = (m[0][2] - m[2][0]) / S; x = (m[0][1] + m[1][0]) / S; y = .25 * S; z = (m[1][2] + m[2][1]) / S; }
  else { const S = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; w = (m[1][0] - m[0][1]) / S; x = (m[0][2] + m[2][0]) / S; y = (m[1][2] + m[2][1]) / S; z = .25 * S; }
  return [w, x, y, z];
}
const anguloPantalla = () => { const a = screen.orientation?.angle ?? window.orientation ?? 0; return ((Math.round(a / 90) * 90) % 360 + 360) % 360; };
const GIRO_EJES = { w3c: [[0, 1, 0], [0, 0, 1], [1, 0, 0]], webkit: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };

/* Lo que pide el rastreo a la cámara: la PRINCIPAL (su lente es la que describe el perfil), 640×480, 60 cuadros */
export const restriccionesVIO = () => ({ width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60, max: 60 } });
/* Abre la cámara principal (no la gran angular, ni la «triple» virtual del iPhone): app.js, preferMainCamera */
export async function abrirCamaraVIO(){
  let s = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, ...restriccionesVIO() } });
  try{
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    const atrasId = (l) => { const m = /facing back.*?(\d+)|(\d+).*facing back/i.exec(l); return m ? Number(m[1] ?? m[2]) : null; };
    const androides = cams.filter((d) => atrasId(d.label) !== null).sort((a, b) => atrasId(a.label) - atrasId(b.label));
    const principal = cams.find((d) => d.label === 'Back Camera') ?? androides[0];
    const pista = s.getVideoTracks()[0];
    if(principal && pista && pista.label !== principal.label){
      s.getTracks().forEach((t) => t.stop());
      try{ s = await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: { exact: principal.deviceId }, ...restriccionesVIO() } }); }
      catch{ s = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, ...restriccionesVIO() } }); }
    }
  }catch(e){ console.warn('cámara principal', e); }
  return s;
}

/**
 * crearVIO({ video, demo? }) → servicio de 6DoF.
 *   video: el <video> que YA muestra la cámara (o el video grabado de la demo).
 *   demo:  { fps, frameTimes, imu, rig, source } (la caminata grabada de la página de visloc-rs) para probar sin teléfono.
 */
export function crearVIO({ video, demo = null, ancho = 360 } = {}){
  const S = {
    estado: null, puntos: 0, listo: false, corriendo: false, error: '', resets: 0, ms: 0,
    /* quietud del aparato: desviación del acelerómetro (m/s²) y giro (rad/s) en el último medio segundo */
    agitado: 0, giro: 0,
  };
  let worker = null, workerListo = null, calib = null, aparato = null, rig = null;
  let accelSigno = 1, lastAccel = [0, 0, 9.81], orientacion = null;
  const imuHist = []; let imuLote = []; let ultimoMov = null, periodoMov = 0, relojMov = null;
  let nube = null, nubeN = 0;   /* los puntos 3D que el rastreo tiene ubicados (cada medio segundo, o en cada cuadro clave) */
  let ultimo = null, tCuadro = 0, latenciaVideo = 15, enVuelo = 0, ultimoPostT = -Infinity, rvfc = 0, raf = 0;
  const lienzo = document.createElement('canvas'), ctx = lienzo.getContext('2d', { willReadFrequently: true });
  let fw = 0, fh = 0;

  function crearWorker(){
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => { const m = e.data;
      if(m.type === 'ready') workerListo = m;
      else if(m.type === 'dropped') enVuelo = Math.max(0, enVuelo - 1);
      else if(m.type === 'result'){ enVuelo = Math.max(0, enVuelo - 1); ultimo = m; if(m.landmarks){ nube = m.landmarks; nubeN++; } S.estado = m.status; S.puntos = m.connected; S.ms = m.ms; if(String(m.status).startsWith('reset')) S.resets++; }
      else if(m.type === 'error'){ if(m.frameT != null) enVuelo = Math.max(0, enVuelo - 1); S.error = String(m.message || '').slice(0, 120); console.warn('[vio]', m.message); } };
    worker.onerror = (e) => { S.error = e.message || 'el trabajador del VIO no cargó'; };
    /* sin aislamiento entre orígenes (COOP/COEP) no hay hilos: el worker cae solo a uno */
    worker.postMessage({ type: 'init', threads: true });
  }

  /* ── sensores: devicemotion con la misma limpieza de tiempos que app.js ── */
  function alMovimiento(e){
    const a = e.accelerationIncludingGravity, r = e.rotationRate, ahora = performance.now();
    if(!a || !r || a.x == null || r.alpha == null) return;
    if(relojMov === null){ relojMov = Math.abs(e.timeStamp - ahora) < 1000 ? 'evento' : 'llegada'; periodoMov = e.interval > 0 ? (e.interval < 1 ? e.interval * 1000 : e.interval) : 16.67; }
    const crudo = relojMov === 'evento' ? e.timeStamp : ahora;
    let t = crudo;
    if(ultimoMov){ const hueco = crudo - ultimoMov.crudo; if(hueco > 0 && hueco < 200) periodoMov += .02 * (hueco - periodoMov);
      const modelo = ultimoMov.t + periodoMov; t = modelo + .1 * (crudo - modelo); if(Math.abs(t - crudo) > 40) t = crudo; t = Math.max(t, ultimoMov.t + .25 * periodoMov); }
    ultimoMov = { t, crudo };
    const filas = GIRO_EJES[calib?.gyroAxes] || GIRO_EJES.webkit;
    const g = filas.map((f) => (f[0] * r.alpha + f[1] * r.beta + f[2] * r.gamma) * DEG);
    lastAccel = [a.x, a.y, a.z];
    const ac = [accelSigno * a.x, accelSigno * a.y, accelSigno * a.z];
    imuHist.push({ t, g, a: ac }); if(imuHist.length > 240) imuHist.splice(0, imuHist.length - 240);
    medirQuietud();
    if(!S.corriendo || demo) return;
    imuLote.push(Math.round(t * 1e6), g[0], g[1], g[2], ac[0], ac[1], ac[2]);
    if(imuLote.length >= 21) mandarImu();
  }
  function medirQuietud(){
    const n = Math.min(30, imuHist.length); if(n < 5) return;
    let sa = 0, sa2 = 0, sg = 0;
    for(let i = imuHist.length - n; i < imuHist.length; i++){ const s = imuHist[i], m = Math.hypot(s.a[0], s.a[1], s.a[2]); sa += m; sa2 += m * m; sg += Math.hypot(s.g[0], s.g[1], s.g[2]); }
    const med = sa / n; S.agitado = Math.sqrt(Math.max(0, sa2 / n - med * med)); S.giro = sg / n;
  }
  function mandarImu(){ if(!imuLote.length || !worker) return; const b = new Float64Array(imuLote); imuLote = []; worker.postMessage({ type: 'imu', samples: b.buffer }, [b.buffer]); }
  const alOrientacion = (e) => { if(e.beta != null) orientacion = { beta: e.beta, gamma: e.gamma }; };
  function decidirSigno(){
    if(calib.accelSign === 1 || calib.accelSign === -1) return calib.accelSign;
    const a = lastAccel; let arriba;
    if(orientacion){ const b = orientacion.beta * DEG, g = orientacion.gamma * DEG; arriba = [-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)]; }
    else arriba = Math.abs(a[1]) > Math.abs(a[2]) ? [0, 1, 0] : [0, 0, 1];
    return a[0] * arriba[0] + a[1] * arriba[1] + a[2] * arriba[2] >= 0 ? 1 : -1;
  }
  /* la demo: las muestras grabadas hasta `t` (s) */
  function alimentarDemo(t){
    while(demo.next < demo.imu.length && demo.imu[demo.next][0] <= t){
      const [ts, gx, gy, gz, ax, ay, az] = demo.imu[demo.next++];
      imuHist.push({ t: ts * 1000, g: [gx, gy, gz], a: [ax, ay, az] }); if(imuHist.length > 240) imuHist.splice(0, imuHist.length - 240);
      imuLote.push(Math.round(ts * 1e9), gx, gy, gz, ax, ay, az);
    }
    medirQuietud(); mandarImu();
  }

  /* ── sesión ── */
  function empezarSesion(){
    const vw = video.videoWidth, vh = video.videoHeight; ultimo = null; S.estado = 'init';
    if(demo){ rig = { ...demo.rig, accelBiasWalk: IMU_DEFAULT.accelBiasWalk, gyroBiasWalk: IMU_DEFAULT.gyroBiasWalk }; fw = rig.width; fh = rig.height; demo.next = 0; imuLote = []; }
    else {
      const k0 = ancho / Math.min(vw, vh); fw = Math.round(vw * k0); fh = Math.round(vh * k0);
      accelSigno = decidirSigno(); const n = calib.noiseScale;
      rig = { width: fw, height: fh, ...intrinsics(fw, fh, calib.focal35), distortion: [0, 0, 0, 0],
        imuFromCamera: [...imuDeCamara(anguloPantalla()), ...calib.cameraOffset],
        imuRateHz: Math.max(20, Math.round(periodoMov > 0 ? 1000 / periodoMov : 60)),
        accelNoise: IMU_DEFAULT.accelNoise * n, gyroNoise: IMU_DEFAULT.gyroNoise * n, accelBiasWalk: IMU_DEFAULT.accelBiasWalk * n, gyroBiasWalk: IMU_DEFAULT.gyroBiasWalk * n,
        frameRateHz: 60 };
    }
    lienzo.width = fw; lienzo.height = fh;
    worker.postMessage({ type: 'start', rig, gpu: true, estimateEvery: 1, watchdog: { enabled: true, stillStart: !demo } });
    if(!demo){ const desde = (ultimoMov?.t ?? 0) - 600; imuLote = [...imuHist.filter((s) => s.t > desde).flatMap((s) => [Math.round(s.t * 1e6), ...s.g, ...s.a]), ...imuLote]; mandarImu(); }
    S.corriendo = true; enVuelo = 0; ultimoPostT = -Infinity;
    if(rvfc && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(rvfc); if(raf) cancelAnimationFrame(raf);
    pedirCuadro();
  }
  function pedirCuadro(){ if(!S.corriendo) return; if(video.requestVideoFrameCallback) rvfc = video.requestVideoFrameCallback(alCuadro); else raf = requestAnimationFrame((n) => alCuadro(n, null)); }
  let relojCuadro = 0, ultimoRelojT = -Infinity;
  const RELOJES = ['capture', 'presentation', 'callback'];
  function tiempoCuadro(ahora, meta){
    const perf = performance.now();
    for(;;){ const n = RELOJES[relojCuadro], t = n === 'capture' ? meta?.captureTime : n === 'presentation' ? meta?.presentationTime : ahora;
      if(n === 'callback' || (Number.isFinite(t) && Math.abs(t - perf) < 1000 && t > ultimoRelojT)){ ultimoRelojT = t; return t; } relojCuadro++; }
  }
  let llaveAntes = '';
  function alCuadro(ahora, meta){
    if(!S.corriendo) return; pedirCuadro();
    if(meta){ const k = `${meta.presentedFrames}/${meta.mediaTime}`; if(k === llaveAntes) return; llaveAntes = k; }
    let t;
    if(demo){ const n = Math.min(demo.frameTimes.length - 1, Math.round((meta?.mediaTime ?? video.currentTime) * demo.fps)); t = demo.frameTimes[n] * 1000; alimentarDemo(demo.frameTimes[n] + .05); }
    else t = tiempoCuadro(ahora, meta) + calib.timeOffsetMs;
    tCuadro = t;
    if(!demo && Number.isFinite(meta?.captureTime)){ const l = performance.now() - meta.captureTime; if(l > 0 && l < 200) latenciaVideo += .05 * (l - latenciaVideo); }
    if(enVuelo >= 2) return;                                    /* el trabajador va atrasado: este cuadro se salta */
    ctx.drawImage(video, 0, 0, fw, fh);
    const rgba = ctx.getImageData(0, 0, fw, fh).data, gris = new Uint8Array(fw * fh);
    for(let i = 0, j = 0; i < gris.length; i++, j += 4) gris[i] = (77 * rgba[j] + 150 * rgba[j + 1] + 29 * rgba[j + 2]) >> 8;
    mandarImu(); enVuelo++; ultimoPostT = t;
    worker.postMessage({ type: 'frame', t: Math.round(t * 1e6), gray: gris.buffer, width: fw, height: fh }, [gris.buffer]);
  }

  /* la pose de la cámara al momento `rafNow` (app.js, overlayTime + predictedCameraPose) */
  const conPose = (s) => s && s !== 'init' && s !== 'wait' && !String(s).startsWith('reset');
  function pose(rafNow){
    const m = ultimo; if(!m || !rig || !conPose(m.status)) return null;
    const t = demo || !Number.isFinite(rafNow) ? tCuadro : rafNow + 16.7 - latenciaVideo + calib.timeOffsetMs;
    const tf = m.t / 1e6, meta = Math.max(tf, Math.min(t, tf + 250));
    let qi = [m.imu[0], m.imu[1], m.imu[2], m.imu[3]]; const bg = m.gyroBias;
    const girar = (g, h) => { qi = quatMul(qi, quatFromRotvec([(g[0] - bg[0]) * h, (g[1] - bg[1]) * h, (g[2] - bg[2]) * h])); };
    let cubierto = tf;
    for(let k = 1; k < imuHist.length; k++){ const a = imuHist[k - 1], b = imuHist[k]; if(b.t <= tf || a.t >= meta) continue; const t0 = Math.max(a.t, tf), t1 = Math.min(b.t, meta); girar(b.g, (t1 - t0) / 1000); cubierto = t1; }
    const nuevo = imuHist[imuHist.length - 1]; if(nuevo && cubierto < meta) girar(nuevo.g, (meta - cubierto) / 1000);
    const dt = (meta - tf) / 1000;
    const q = quatMul(qi, rig.imuFromCamera.slice(0, 4)), off = quatRotate(qi, rig.imuFromCamera.slice(4, 7));
    return { q, p: [0, 1, 2].map((i) => m.imu[4 + i] + m.velocity[i] * dt + off[i]), v: m.velocity.slice(0, 3), estado: m.status, t: tf };
  }

  async function iniciar(){
    if(!worker) crearWorker();
    if(!demo){
      aparato = await detectDevice(); calib = loadCalibration(aparato);
      addEventListener('devicemotion', alMovimiento); addEventListener('deviceorientation', alOrientacion);
      const t0 = performance.now(); while(imuHist.length <= 10){ if(performance.now() - t0 > 10000) throw new Error('No llegan los sensores de movimiento'); await new Promise((r) => setTimeout(r, 50)); }
    } else calib = { timeOffsetMs: 0 };
    const t1 = performance.now(); while(!workerListo){ if(performance.now() - t1 > 20000) throw new Error('El rastreo no cargó'); await new Promise((r) => setTimeout(r, 50)); }
    const t2 = performance.now(); while(!(video.videoWidth > 0)){ if(performance.now() - t2 > 8000) throw new Error('La cámara no arrancó'); await new Promise((r) => setTimeout(r, 50)); }
    S.listo = true; empezarSesion();
  }
  function parar(){ S.corriendo = false; removeEventListener('devicemotion', alMovimiento); removeEventListener('deviceorientation', alOrientacion); worker?.postMessage({ type: 'stop' }); S.estado = null; ultimo = null; }
  /* volver a empezar (perdió el rastreo para siempre, o el usuario lo pidió) */
  function reiniciar(){ if(S.listo) empezarSesion(); }
  /* las del lente principal para una imagen de w×h (para leer marcadores con la misma cámara) */
  const intrinsecos = (w, h) => demo && rig ? { fx: rig.fx * w / rig.width, fy: rig.fy * w / rig.width, cx: (w - 1) / 2, cy: (h - 1) / 2 } : intrinsics(w, h, calib?.focal35 ?? 26);
  /* LO QUE VE EL RASTREO (Carlos, 19 nov: «que aparezcan los puntitos mientras se hace el mapeo»): los puntos que sigue
     en la imagen (pixeles del cuadro chico, en CADA cuadro) y la nube 3D de los que ya ubicó */
  const vistos = () => ultimo && ultimo.trackXY ? { xy: ultimo.trackXY, w: ultimo.width, h: ultimo.height, estado: ultimo.status, conectados: ultimo.connected } : null;
  const nube3D = () => nube ? { pts: nube, n: nubeN } : null;
  return { S, iniciar, parar, reiniciar, pose, intrinsecos, vistos, nube3D, get aparato(){ return aparato; }, get calib(){ return calib; }, guardarCalib: () => aparato && saveCalibration(aparato, calib) };
}
