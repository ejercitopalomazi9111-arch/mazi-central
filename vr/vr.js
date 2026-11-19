/* ══════════════════════════════════════════════════════════════════════════
   MAZI VR · el motor
   ──────────────────────────────────────────────────────────────────────────
   Un iPhone dentro de un visor sin pantalla y un control de PlayStation.
   Lo que hace este archivo:
     · Pinta la escena dos veces, una por ojo, y la deforma para el lente
       (si no, las líneas rectas se ven curvas en el visor).
     · Gira la cabeza con el giroscopio del teléfono (3 ejes de giro: mirar
       a los lados, arriba y abajo, e inclinar).
     · Realidad mixta: la cámara de atrás del teléfono va detrás de todo, así
       que los paneles flotan sobre tu cuarto de verdad.
     · Todo se maneja con el control (o mirando fijo a un botón un segundo y
       medio): nunca hay que sacar el teléfono del visor.
   Lo que el iPhone NO deja hacer desde aquí está en PLAN.md: ver otras apps
   adentro, Netflix (su protección pinta negro), y caminar de verdad (eso es
   ARKit, de la app nativa).
   ══════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { crearSeis, ojoPorDefecto } from './seis.js';
import { crearNube } from './nube.js';
import { crearLimites } from './limites.js';
import { crearPredictor } from './prediccion.js';

/* ── ajustes: se guardan en el teléfono (sólo comodidad; si se borran, salen los de fábrica) ── */
const FABRICA = { sep: 62, ancho: 140, k1: .22, k2: .06, campo: 88, camCampo: 0, camVoltear: false, mixta: false, escala: 1, manos: true, menuTam: 1, menuDist: 1, fondo: 0, seis: false, puntos: true, limites: true, zona: 1 };
const AJ = { ...FABRICA };
try{ Object.assign(AJ, JSON.parse(localStorage.getItem('mazivr.ajustes') || '{}')); }catch{}
const guardar = () => { try{ localStorage.setItem('mazivr.ajustes', JSON.stringify(AJ)); }catch{} };

/* ── ERRORES QUE DICEN QUÉ, DÓNDE Y CUÁNDO (Carlos, 19 nov: «que el código de error sea tan claro que sepas exactamente
   dónde falló, cómo y cuándo»). Cada uno lleva:
     código   E-MOTOR, E-VISTA, E-CUADRO, E-6DOF, E-6DOF-VIO, E-CAMARA, E-PAGINA, E-PROMESA
     dónde    la pieza y la función (o archivo:línea)
     cómo     el mensaje del navegador
     cuándo   la hora, la vista en la que estabas y los segundos desde que abriste
   Sale en el visor (aviso de 5 s), en la consola y se guarda en el teléfono: la pantalla de entrada enseña el último. ── */
const T0 = performance.now();
export const bitacora = [];
const ultimaVez = {};
export function fallo(codigo, donde, e){
  const k = codigo + '|' + donde, ahoraMs = performance.now();
  if(ultimaVez[k] && ahoraMs - ultimaVez[k] < 5000) return null;   /* el mismo error en cada cuadro no tapa la vista */
  ultimaVez[k] = ahoraMs;
  const msg = String(e?.message || e || 'sin mensaje').slice(0, 180);
  const linea = String(e?.stack || '').split('\n').map((l) => l.trim()).find((l) => /\.js:\d+/.test(l))?.replace(/^at\s+/, '').replace(location.origin, '') || '';
  let enVista = 'entrada'; try{ enVista = vista || 'entrada'; }catch{}
  const r = { codigo, donde, msg, linea, hora: new Date().toLocaleTimeString('es-MX'), vista: enVista, seg: Math.round((ahoraMs - T0) / 1000) };
  bitacora.push(r); if(bitacora.length > 30) bitacora.shift();
  try{ localStorage.setItem('mazivr.errores', JSON.stringify(bitacora.slice(-10))); }catch{}
  console.warn(`[${codigo}] ${donde} · ${msg}${linea ? ' · ' + linea : ''} · vista «${r.vista}» · ${r.hora} (${r.seg} s)`);
  try{ hud(`${codigo} · ${donde} · ${msg}`.slice(0, 60), 5); }catch{}
  return r;
}
addEventListener('error', (e) => fallo('E-PAGINA', `${String(e.filename || '').split('/').pop() || '?'}:${e.lineno || '?'}`, e.error || e.message));
addEventListener('unhandledrejection', (e) => fallo('E-PROMESA', 'promesa sin atrapar', e.reason));

const C = { fondo: '#170A26', sup: '#24123A', borde: '#3C2652', acento: '#AC27FF', vino: '#7E1735', texto: '#F4EEF2', suave: '#C9B6DA', rosa: '#C77DFF' };

/* ── escena ── */
const lienzo = document.getElementById('gl');
const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
/* la pantalla negra (foto de Carlos, 18 nov): con las manos, el video y la cámara a la vez, el iPhone puede soltar el
   dibujo 3D para recuperar memoria y la página se queda en negro para siempre. Se avisa y se recarga sola */
lienzo.addEventListener('webglcontextlost', (e) => { e.preventDefault();
  const d = document.createElement('div'); d.textContent = 'Recargando…';
  d.style.cssText = 'position:fixed; inset:0; z-index:9; display:grid; place-items:center; background:#0B0513; color:#F4EEF2; font:800 22px system-ui,-apple-system,sans-serif';
  document.body.appendChild(d);
  /* y al volver, entra solo al visor (Carlos, 18 nov: «recarga sola la página y no vuelvo a VR con ningún botón») */
  try{ sessionStorage.setItem('mazivr.volver', String(Date.now())); }catch{}
  setTimeout(() => location.reload(), 1200); });
/* un poco menos de resolución: la memoria de gráficos es lo que se acaba y provoca esa recarga */
render.setPixelRatio(Math.min(devicePixelRatio, 1.6));
render.outputColorSpace = THREE.SRGBColorSpace;
const escena = new THREE.Scene();
const rig = new THREE.Group(); escena.add(rig);            // el cuerpo: se mueve con el stick y gira con el otro
const cabeza = new THREE.PerspectiveCamera(AJ.campo, 1, .05, 200); rig.add(cabeza);
const estereo = new THREE.StereoCamera(); estereo.eyeSep = .063;
escena.add(new THREE.AmbientLight(0xffffff, .9)); const sol = new THREE.DirectionalLight(0xffffff, 1.2); sol.position.set(2, 4, 3); escena.add(sol);

/* el cuarto virtual (sólo en modo VR): un domo con degradado de la casa y un piso de rejilla fina */
const domo = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
  uniforms: { a: { value: new THREE.Color('#2A1142') }, b: { value: new THREE.Color('#0B0513') }, c: { value: new THREE.Color('#4A0E22') } },
  vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform vec3 a, b, c; varying vec3 p;
    float h(vec3 q){ return fract(sin(dot(q, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    void main(){ float y = p.y; vec3 col = mix(c, a, smoothstep(-.35, .15, y)); col = mix(col, b, smoothstep(.15, .85, y));
      col += vec3(.67, .15, 1.) * .5 * exp(-abs(y) * 16.);                       // el horizonte brilla: se sabe dónde es «enfrente»
      float e = step(.9965, h(floor(p * 170.))) * smoothstep(.04, .35, y); col += vec3(.95, .9, 1.) * e * .85;   // estrellas
      gl_FragColor = vec4(col, 1.); }` }));
/* «¿estoy adentro?» (Carlos, 18 nov: cuando no se ven botones no se nota que estás en el visor): un piso con rejilla que se
   apaga a lo lejos, un aro bajo tus pies, el horizonte que brilla y estrellas */
const piso = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShaderMaterial({ depthWrite: false, transparent: true,
  vertexShader: 'varying vec3 w; void main(){ vec4 q = modelMatrix * vec4(position, 1.); w = q.xyz; gl_Position = projectionMatrix * viewMatrix * q; }',
  fragmentShader: `varying vec3 w; void main(){ vec2 g = abs(fract(w.xz - .5) - .5) / fwidth(w.xz); float l = 1. - min(min(g.x, g.y), 1.);
    float d = length(w.xz); float f = exp(-d * .07);
    vec3 col = mix(vec3(.05, .02, .09), vec3(.72, .3, 1.), l * .8) * f; gl_FragColor = vec4(col, .92); }` }));
piso.rotation.x = -Math.PI / 2; piso.position.y = -1.5;
const aro = new THREE.Mesh(new THREE.RingGeometry(.55, .6, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#C77DFF'), transparent: true, opacity: .7, toneMapped: false }));
aro.rotation.x = -Math.PI / 2; aro.position.y = -1.49;
const cuarto = new THREE.Group(); cuarto.add(domo, piso); escena.add(cuarto); rig.add(aro);

/* ── la cámara del teléfono (realidad mixta): pegada a la cabeza, al fondo de todo ── */
const video = document.createElement('video'); video.playsInline = true; video.muted = true; video.setAttribute('playsinline', '');
/* va DENTRO de la página aunque no se vea: el iPhone deja de darle cuadros a un video suelto, y sin cuadros las manos no
   jalaban en el cuarto virtual (sin la mixta) */
video.style.cssText = 'position:fixed; left:0; bottom:0; width:2px; height:2px; opacity:.01; pointer-events:none; z-index:0';
(document.body ? document.body.appendChild(video) : addEventListener('DOMContentLoaded', () => document.body.appendChild(video)));
let camTex = null, camNuevo = true, flujo = null, ultra = false, camVIO = false;
/* lo que abre la cámara de lado. En Android casi nunca se reconoce la gran angular por su nombre y la imagen salía como
   una ventanita en medio de la vista (foto de Carlos, 18 nov): si la cámara abre menos que el ojo, se estira hasta
   llenarlo. Las manos usan esta misma medida, así que siguen cayendo sobre tu mano */
const ojoH = () => 2 * Math.atan(Math.tan(AJ.campo * Math.PI / 360) * Math.max(.5, (W / 2) / Math.max(1, H))) * 180 / Math.PI;
/* con 6DoF la imagen va a su campo REAL (el de la lente principal): así los puntitos y lo 3D caen justo sobre tus cosas */
const campoVIO = () => { const k = camVIO && seis?.vio?.intrinsecos?.(640, 480); return k ? 2 * Math.atan(320 / k.fx) * 180 / Math.PI : 0; };
export const campoCamara = () => AJ.camCampo || campoVIO() || (ultra ? 104 : Math.max(69, Math.min(110, ojoH())));
const pared = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: false, depthTest: false, toneMapped: false }));
pared.renderOrder = -10; pared.position.z = -20; pared.visible = false; cabeza.add(pared);
/* los puntitos del rastreo (nube.js): los que sigue la cámara, sobre la imagen; y el mapa del cuarto que se va dibujando */
export const nube = crearNube({ THREE, escena, rig, pared });
/* OBSTÁCULOS Y ZONA SEGURA (limites.js), con ese mismo mapa: puntos rojos en lo que tienes cerca y la pared morada de la
   zona cuando te acercas a su orilla. Sólo con 6DoF (sin él no se sabe dónde estás). */
export const limites = crearLimites();
const limVis = (() => {
  const MAX = 4000, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3)); g.setDrawRange(0, 0);
  const m = new THREE.PointsMaterial({ color: 0xFF4A5A, size: 9, sizeAttenuation: false, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  const rojos = new THREE.Points(g, m); rojos.frustumCulled = false; rojos.renderOrder = 8; escena.add(rojos);
  const pared = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.4, 48, 8, true), new THREE.MeshBasicMaterial({ color: 0xAC27FF, wireframe: true, transparent: true, opacity: 0, depthWrite: false }));
  pared.visible = false; pared.renderOrder = 7; escena.add(pared);
  return { rojos, pared, MAX, en: 0, cuenta: 0 };
})();
const cabezaMundo = new THREE.Vector3();
function vigilarLimites(){
  const ahora = performance.now(); if(ahora - limVis.en < 100) return; limVis.en = ahora;
  const prendido = AJ.limites !== false && seis.vio?.S.listo;
  if(!prendido){ limVis.rojos.visible = limVis.pared.visible = false; return; }
  const d = nube.datos(); if(d.n < limites.st.leidos) limites.olvidar(); limites.agregar(d.pos, d.n);
  cabeza.getWorldPosition(cabezaMundo); const c = cabezaMundo.toArray();
  if(!limites.st.zona) limites.ponerZona(c, AJ.zona || 1);
  const aviso = limites.paso(c);
  limites.st.aviso = aviso || null;   /* lo lee el narrador de MONARCH (travesuras.js) */
  if(aviso === 'obstaculo'){ hud('Cuidado', 1.4); sonar('toque', .35); }
  if(aviso === 'zona'){ hud('Fuera de zona', 1.6); sonar('toque', .35); }
  /* los rojos: cada casilla cercana como una columna de puntos del piso hasta arriba de tus ojos (si sólo llegaran a la
     altura del obstáculo, a 35 cm quedan abajo de la vista y no se ven), más fuertes mientras más cerca */
  const cerca = limites.st.cerca, k = Math.max(0, Math.min(1, (1 - cerca) / .5));
  limVis.rojos.visible = k > 0;
  if(k > 0){ const P = limVis.rojos.geometry.attributes.position.array, piso = limites.st.piso ?? (c[1] - 1.5); let n = 0;
    const alto = c[1] + .25 - (piso + .15), pasos = Math.max(4, Math.round(alto / .15));
    for(const q of limites.cercanas(c, 1.2)){ for(let h = 0; h <= pasos && n < limVis.MAX; h++){ P[n * 3] = q.x; P[n * 3 + 1] = piso + .15 + alto * h / pasos; P[n * 3 + 2] = q.z; n++; } }
    limVis.rojos.geometry.attributes.position.needsUpdate = true; limVis.rojos.geometry.setDrawRange(0, n); limVis.rojos.material.opacity = .35 + .6 * k; limVis.cuenta = n; }
  const z = limites.st.zona, p = limites.st.pared; limVis.pared.visible = !!z && p > 0;
  if(z && p > 0){ limVis.pared.position.set(z.x, (limites.st.piso ?? c[1] - 1.5) + 1.2, z.z); limVis.pared.scale.set(z.radio, 1, z.radio); limVis.pared.material.opacity = .15 + .5 * p; }
}
export async function abrirCamara(){
  if(flujo) return true;
  /* con 6DoF, la cámara PRINCIPAL a 640×480 y 60 cuadros: su lente es la que conoce el rastreo (vio.js) */
  if(AJ.seis) try{ const { abrirCamaraVIO } = await import('./espacial/vio.js'); flujo = await abrirCamaraVIO(); ultra = false; camVIO = true; return await ponerFlujo(); }catch(e){ console.warn('cámara 6DoF', e); flujo = null; }
  camVIO = false;
  try{
    /* la ultra gran angular llena la vista del visor (la normal abre ~69°, el ojo en el visor ~90°). La primera vez hay que
       abrir la normal para que el teléfono diga los nombres de sus cámaras; luego se recuerda cuál es y se abre de un jalón
       (abrir la cámara dos veces era lo que más tardaba al tocar Entrar) */
    const tam = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    let recordada = null; try{ recordada = localStorage.getItem('mazivr.camara'); }catch{}
    if(recordada){ try{ flujo = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: recordada }, ...tam }, audio: false }); ultra = true; }catch{ flujo = null; try{ localStorage.removeItem('mazivr.camara'); }catch{} } }
    if(!flujo){
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', ...tam }, audio: false });
      try{
        const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
        const uw = devs.find((d) => /ultra|gran angular/i.test(d.label));
        if(uw){ flujo.getTracks().forEach((t) => t.stop()); flujo = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: uw.deviceId }, ...tam }, audio: false }); ultra = true; try{ localStorage.setItem('mazivr.camara', uw.deviceId); }catch{} }
      }catch(e){ console.warn('ultra gran angular', e); }
    }
    return await ponerFlujo();
  }catch(e){ fallo('E-CAMARA', 'abrirCamara', e); return false; }
}
async function ponerFlujo(){
  video.srcObject = flujo; await video.play();
  /* textura a mano (no VideoTexture): se repinta cuando llega un cuadro nuevo de la cámara, o —con una mano a la vista en la
     mixta— sólo cuando el rastreo de manos leyó ESE cuadro (manos.js, camSinc), para que los puntos caigan sobre tu mano */
  if(!camTex){ camTex = new THREE.Texture(video); camTex.colorSpace = THREE.SRGBColorSpace; camTex.minFilter = camTex.magFilter = THREE.LinearFilter; camTex.generateMipmaps = false;
    if(video.requestVideoFrameCallback){ const nuevo = () => { camNuevo = true; video.requestVideoFrameCallback(nuevo); }; video.requestVideoFrameCallback(nuevo); } else camNuevo = null; }
  pared.material.map = camTex; pared.material.color.set(0xffffff); pared.material.needsUpdate = true;
  ponerMixta(AJ.mixta);   /* la cámara llega después de entrar: si la mixta ya estaba puesta, ahora sí se ve */
  return true;
}
/* cambiar de cámara (prender o apagar el 6DoF cambia de lente): se cierra la de antes y se abre la que toca */
export async function reabrirCamara(){ flujo?.getTracks().forEach((t) => t.stop()); flujo = null; return abrirCamara(); }
function medirPared(){
  const d = -pared.position.z, ancho = 2 * d * Math.tan(campoCamara() * Math.PI / 360);
  const asp = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
  pared.scale.set(ancho, ancho / asp, 1); pared.rotation.z = AJ.camVoltear ? Math.PI : 0;
}
function ponerMixta(si){
  AJ.mixta = si; guardar();
  cuarto.visible = !si; pared.visible = si && !!camTex;
  /* la cámara sigue prendida si las manos la usan, aunque no se vea */
  if(flujo) flujo.getVideoTracks().forEach((t) => { t.enabled = si || AJ.manos; });
  aro.visible = !si;
  if(flujo && video.paused) video.play().catch(() => {});
}

/* ── ojos a la textura y la deformación del lente ── */
let rtI, rtD, W = 1, H = 1;
const pase = new THREE.ShaderMaterial({
  uniforms: { tI: { value: null }, tD: { value: null }, k1: { value: AJ.k1 }, k2: { value: AJ.k2 }, off: { value: 0 }, asp: { value: 1 }, esc: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D tI, tD; uniform float k1, k2, off, asp, esc; varying vec2 vUv;
    void main(){
      bool der = vUv.x > .5; vec2 e = vec2(der ? (vUv.x - .5) * 2. : vUv.x * 2., vUv.y);
      vec2 c = vec2(.5 + (der ? -off : off), .5);
      vec2 d = e - c; d.x *= asp; float r2 = dot(d, d); d *= (1. + k1 * r2 + k2 * r2 * r2) / esc; d.x /= asp;
      vec2 s = d + vec2(.5);
      if(s.x < 0. || s.x > 1. || s.y < 0. || s.y > 1.){ gl_FragColor = vec4(0., 0., 0., 1.); return; }
      gl_FragColor = der ? texture2D(tD, s) : texture2D(tI, s);
    }` });
const paseEsc = new THREE.Scene(), paseCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
paseEsc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pase));
function medir(){
  W = innerWidth; H = innerHeight; render.setSize(W, H, false);
  const pr = render.getPixelRatio(), ew = Math.round(W / 2 * pr), eh = Math.round(H * pr);
  rtI?.dispose(); rtD?.dispose();
  const op = { colorSpace: THREE.SRGBColorSpace, samples: 4 };
  rtI = new THREE.WebGLRenderTarget(ew, eh, op); rtD = new THREE.WebGLRenderTarget(ew, eh, op);
  pase.uniforms.tI.value = rtI.texture; pase.uniforms.tD.value = rtD.texture;
  cabeza.aspect = modo.mono ? W / H : (W / 2) / H; aplicarAjustes();
}
function aplicarAjustes(){
  cabeza.fov = AJ.campo; cabeza.updateProjectionMatrix();
  pase.uniforms.k1.value = AJ.k1; pase.uniforms.k2.value = AJ.k2; pase.uniforms.esc.value = AJ.escala;
  pase.uniforms.asp.value = (W / 2) / H;
  const mitad = AJ.ancho / 2; pase.uniforms.off.value = Math.max(-.3, Math.min(.3, .5 - AJ.sep / 2 / mitad));
  estereo.eyeSep = AJ.sep / 1000;
  medirPared();
}

/* ── giroscopio → cabeza ── */
const ori = { a: 0, b: 90, g: 0, hay: false, t: 0, nuevo: false };
/* el giro PREDICHO (prediccion.js, investigación R2), PRENDIDO de fábrica: se apagó un rato el 19 nov porque «estaba mejor
   antes», pero Carlos lo pidió de vuelta: lo que se veía mal eran las manos (dedos congelados y en espejo, ya arreglados en
   manos-estables.js), no esto. ?nopred lo apaga para comparar. */
const pred = crearPredictor(), conPred = !new URLSearchParams(location.search).has('nopred');
const zee = new THREE.Vector3(0, 0, 1), eul = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
addEventListener('deviceorientation', (e) => { if(e.alpha == null) return; ori.a = e.alpha; ori.b = e.beta; ori.g = e.gamma; ori.hay = true; ori.t = performance.now(); ori.nuevo = true; });
const angPantalla = () => (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
let guinada = 0;                                             // el giro extra: stick derecho y «recentrar»
const qCab = new THREE.Quaternion(), qG = new THREE.Quaternion(), yUp = new THREE.Vector3(0, 1, 0);
const sim = { yaw: 0, pitch: 0 };                            // sin giroscopio (pruebas y computadora): ratón y flechas
function leerCabeza(){
  if(ori.hay){
    const D = THREE.MathUtils.DEG2RAD; eul.set(ori.b * D, ori.a * D, -ori.g * D, 'YXZ');
    qCab.setFromEuler(eul); qCab.multiply(q1); qCab.multiply(q0.setFromAxisAngle(zee, -angPantalla()));
    if(ori.nuevo){ ori.nuevo = false; try{ pred.muestra(qCab, ori.t); }catch(e){ fallo('E-PREDICCION', 'pred.muestra (giroscopio)', e); } }
  } else qCab.setFromEuler(eul.set(sim.pitch, sim.yaw, 0, 'YXZ'));
  const qp = ori.hay && conPred ? pred.predecir(performance.now()) : null;
  if(qp) cabeza.quaternion.set(qp.x, qp.y, qp.z, qp.w); else cabeza.quaternion.copy(qCab);
  rig.quaternion.copy(qG.setFromAxisAngle(yUp, guinada));
  /* 6DoF: el giro sigue saliendo del giroscopio; del VIO sale DÓNDE están tus ojos (seis.js) */
  if(seis.vio){
    const pose = seis.vio.S.corriendo ? seis.vio.pose(performance.now()) : null;
    const st = seis.filtro.paso(pose, [qCab.w, qCab.x, qCab.y, qCab.z], seis.vio.S, performance.now(), seis.ojo || ojoPorDefecto((((screen.orientation?.angle ?? window.orientation ?? 90) % 360) + 360) % 360));
    cabeza.position.set(st.pos[0], st.pos[1], st.pos[2]);
    if(seis.vio.S.listo) try{ vigilarAncla(); }catch(e){ fallo('E-ANCLA', 'vigilarAncla', e); }
    try{ const ns = nube.cuadro(seis.vio, seis.filtro, { mostrar: AJ.puntos !== false });
      /* LUGAR DIFÍCIL (investigación R4): con pocos puntos vivos el rastreo está por caerse; se avisa ANTES (cada 8 s como mucho) */
      const ahoraP = performance.now();
      if(ns && AJ.puntos !== false && seis.vio.S.estado === 'track' && ns.vivos < 25){ seis.pocos = seis.pocos || ahoraP; if(ahoraP - seis.pocos > 1500 && ahoraP - (seis.pocosAviso || 0) > 8000){ seis.pocosAviso = ahoraP; hud('Poca textura', 2); } }
      else seis.pocos = 0;
    }catch(e){ fallo('E-NUBE', 'nube.cuadro', e); }
    try{ vigilarLimites(); }catch(e){ fallo('E-LIMITES', 'vigilarLimites (obstáculos y zona)', e); }
    if(seis.vio.S.error && seis.vio.S.error !== seis.errorVisto){ seis.errorVisto = seis.vio.S.error; fallo('E-6DOF-VIO', 'trabajador del rastreo (worker.js)', seis.vio.S.error); }
    const e = seis.vio.S.estado, aviso6 = !seis.vio.S.listo ? '' : e === 'track' ? '6DoF' : e === 'coast' ? 'Muévete despacio' : e === 'wait' ? 'Quédate quieto' : e === 'init' ? 'Mueve el teléfono de lado' : String(e || '').startsWith('reset') ? 'Rastreo perdido' : '';
    if(aviso6 && aviso6 !== seis.aviso && performance.now() - seis.avisoEn > 1500){ seis.aviso = aviso6; seis.avisoEn = performance.now(); hud(aviso6, 1.6); }
  } else { if(cabeza.position.lengthSq()) cabeza.position.set(0, 0, 0); if(nube.vivos.visible || nube.mapa.visible) nube.cuadro(null); limVis.rojos.visible = limVis.pared.visible = false; }
}
/* ── 6DoF (ENGINEERING_LOG 006): el VIO de visloc-rs con la MISMA cámara, y el filtro que no te deja salir volando ── */
export const seis = { vio: null, filtro: crearSeis(), ojo: null, aviso: '', avisoEn: 0, error: '', ancla: null, anclaEn: 0, anclaCargando: false, salaPuesta: false, anclaVista: false };
/* EL MENÚ EN SU LUGAR DEL CUARTO entre sesiones (ancla.js): en cuanto la hoja se ve con giro confiable, el inicio se
   pone donde quedó la vez pasada respecto a ella; si no había nada guardado, se guarda donde está. «Al centro» (Cuadro)
   lo vuelve a guardar donde lo dejes */
function poseHub(){ return { pos: [hub.position.x, hub.position.y, hub.position.z], yaw: hub.rotation.y }; }
function anclaConGiro(){ const a0 = seis.ancla?.st.a0; return a0 && a0.yaw != null ? a0 : null; }
async function guardarSala(){ const a0 = anclaConGiro(); if(!a0) return false; const { respectoAncla, LLAVE_SALA } = await import('./ancla.js');
  try{ localStorage.setItem(LLAVE_SALA, JSON.stringify({ hub: respectoAncla(poseHub(), a0) })); }catch{} return true; }
function ponerSala(){
  if(seis.salaPuesta) return; const a0 = anclaConGiro(); if(!a0) return;
  seis.salaPuesta = true;
  import('./ancla.js').then(({ desdeAncla, LLAVE_SALA }) => {
    let g = null; try{ g = JSON.parse(localStorage.getItem(LLAVE_SALA) || 'null'); }catch{}
    if(!g?.hub){ guardarSala(); hud('Cuarto guardado', 1.6); return; }
    const p = desdeAncla(g.hub, a0); hub.position.set(...p.pos); hub.rotation.y = p.yaw; hud('Menú en su lugar', 1.6);
  }).catch((e) => fallo('E-ANCLA', 'ponerSala', e));
}
/* mover TU CUERPO para corregir la deriva (ancla.js): girar alrededor de tu cabeza y luego trasladar */
export function corregirCuerpo(dYaw, dPos){
  const h = new THREE.Vector3(); cabeza.getWorldPosition(h);
  guinada += dYaw; rig.quaternion.setFromAxisAngle(yUp, guinada); rig.updateMatrixWorld(true);
  const h2 = new THREE.Vector3(); cabeza.getWorldPosition(h2);
  rig.position.add(h.sub(h2)).add(dPos); rig.updateMatrixWorld(true);
}
/* EL ANCLA DEL CUARTO (ancla.js): con 6DoF prendido, 4 veces por segundo se busca la hoja impresa (ArUco id 1) en la
   imagen de la cámara; si se ve bien, se corrige la deriva hacia donde estaba la primera vez */
const lienzoAncla = document.createElement('canvas'), ctxAncla = lienzoAncla.getContext('2d', { willReadFrequently: true });
const ojoThree = () => { const o = seis.ojo || ojoPorDefecto((((screen.orientation?.angle ?? window.orientation ?? 90) % 360) + 360) % 360); return new THREE.Vector3(o[0], -o[1], -o[2]); };
function vigilarAncla(){
  const ahoraMs = performance.now(); if(ahoraMs - seis.anclaEn < 250) return; seis.anclaEn = ahoraMs;
  const fuente = seis.videoFuente || video;
  if(!seis.ancla){ if(seis.anclaCargando) return; seis.anclaCargando = true;
    Promise.all([import('./ancla.js'), import('./espacial/control.js')]).then(async ([A, C]) => { await A.cargarAruco(new URL('./espacial/vendor/aruco/', import.meta.url).href); seis.ancla = A.crearAncla({ THREE, montarControl: C.montarControl }); })
      .catch((e) => fallo('E-ANCLA', 'cargar el detector (ancla.js, aruco)', e)); return; }
  if(!fuente.videoWidth || !seis.vio?.intrinsecos) return;
  const w = Math.min(640, fuente.videoWidth), h = Math.round(fuente.videoHeight * w / fuente.videoWidth);
  lienzoAncla.width = w; lienzoAncla.height = h; ctxAncla.drawImage(fuente, 0, 0, w, h);
  const rgba = ctxAncla.getImageData(0, 0, w, h).data;
  const hp = new THREE.Vector3(), hq = new THREE.Quaternion(); cabeza.getWorldPosition(hp); cabeza.getWorldQuaternion(hq);
  const cam = { pos: hp.clone().add(ojoThree().negate().applyQuaternion(hq)), quat: hq };
  const obs = seis.ancla.observar(rgba, w, h, seis.vio.intrinsecos(w, h), cam);
  const r = seis.ancla.corregir(obs, hp, { quieta: (seis.vio.S.giro ?? 0) < .6 });
  if(r) seis.anclaVista = true;
  ponerSala();
  if(!r) return;
  if(r.primera){ hud('Ancla vista', 1.6); return; }
  corregirCuerpo(r.dYaw, r.dPos);
  const cm = Math.round(r.dPos.length() * 200);   /* lo que faltaba (se corrige la mitad cada vez) */
  if(cm >= 10) hud(`Ancla: corregí ${cm} cm`, 1.4);
}
export async function ponerSeis(si, { demo = null, videoDemo = null } = {}){
  AJ.seis = !!si && !demo ? true : (demo ? AJ.seis : false); if(!demo) guardar();
  if(seis.vio){ seis.vio.parar(); seis.vio = null; }
  seis.filtro = crearSeis(); limites.st.zona = null; seis.aviso = ''; seis.error = ''; seis.ancla?.olvidar(); seis.salaPuesta = false; seis.anclaVista = false;
  if(!si){ if(!demo && camVIO) await reabrirCamara(); return true; }
  let paso = 'cargar vio.js';
  try{
    const { crearVIO } = await import('./espacial/vio.js');
    paso = 'abrir la cámara principal';
    if(!demo){ if(!camVIO || !flujo) await reabrirCamara(); if(!flujo) throw new Error('Sin cámara'); }
    paso = 'arrancar el rastreo (sensores, WebAssembly, video)';
    const v = crearVIO({ video: demo ? videoDemo : video, demo }); seis.videoFuente = demo ? videoDemo : null;
    seis.vio = v; hud('Preparando 6DoF', 2);
    await v.iniciar();
    return true;
  }catch(e){ seis.error = String(e.message || e); fallo('E-6DOF', paso, e); if(seis.vio){ seis.vio.parar(); seis.vio = null; } if(!demo){ AJ.seis = false; guardar(); } return false; }
}
/* hacia dónde ve la cabeza en el mundo, sólo de lado (para recentrar y caminar) */
const adelante = new THREE.Vector3();
const rumbo = () => { cabeza.getWorldDirection(adelante); return Math.atan2(-adelante.x, -adelante.z); };
/* PREPARAR TODO DE UNA VEZ (Carlos, 18 nov: «se traba muy fuerte al salir de un apartado»): la primera vez que se dibuja
   algo nuevo el teléfono arma sus sombreadores y sube sus texturas, y eso congela unos cuadros (Objetos: 267 ms en el
   navegador de pruebas; en el teléfono, más). Se hace al cargar, con todo prendido un instante, en vez de al entrar. */
export function precalentar(){
  const antes = Object.values(vistas).map((v) => [v.grupo, v.grupo.visible]);
  antes.forEach(([g]) => { g.visible = true; });
  try{ render.compile(escena, cabeza); }catch(e){ console.warn('precalentar', e); }
  antes.forEach(([g, vis]) => { g.visible = vis; });
}
export function recentrar(){
  /* el menú queda enfrente de donde ves ahora */
  const r = rumbo(); hub.rotation.y = r; cabeza.getWorldPosition(hub.position); hub.position.y = rig.position.y; hud('Al centro');
  /* y las pantallas que se movieron con las manos regresan enfrente y a su tamaño */
  for(const v of Object.values(vistas)) v.alRecentrar?.();
  /* y la zona segura se vuelve a poner alrededor de donde estás */
  if(seis.vio) limites.ponerZona(cabeza.getWorldPosition(new THREE.Vector3()).toArray(), AJ.zona || 1);
  /* con la hoja del ancla vista, «Al centro» también guarda dónde quedó el menú en tu cuarto */
  if(seis.vio && anclaConGiro()) guardarSala().then((ok) => ok && hud('Al centro · guardado', 1.6));
}

/* ── texto y tarjetas en lienzos ── */
const ICONOS = {};
export const iconos = (o) => Object.assign(ICONOS, o);
function svgImg(nombre, color){
  return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null);
    i.src = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONOS[nombre] || ''}</svg>`); });
}
function redondo(x, cx, cy, w, h, r){ x.beginPath(); x.moveTo(cx + r, cy); x.arcTo(cx + w, cy, cx + w, cy + h, r); x.arcTo(cx + w, cy + h, cx, cy + h, r); x.arcTo(cx, cy + h, cx, cy, r); x.arcTo(cx, cy, cx + w, cy, r); x.closePath(); }
class Panel {
  constructor(w, h, pxPorM = 512){ this.cv = document.createElement('canvas'); this.cv.width = Math.round(w * pxPorM); this.cv.height = Math.round(h * pxPorM);
    this.x = this.cv.getContext('2d'); this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.malla = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false }));
    this.malla.userData.panel = this; }
  listo(){ this.tex.needsUpdate = true; }
}
async function tarjeta({ titulo, icono, sub = '', foco = false, apagada = false }){
  const p = new Panel(.62, .62); const { x, cv } = p, W2 = cv.width, H2 = cv.height;
  const dibujar = async (f) => {
    x.clearRect(0, 0, W2, H2);
    redondo(x, 8, 8, W2 - 16, H2 - 16, 46); x.fillStyle = f ? '#3A1A5C' : C.sup; x.fill();
    x.lineWidth = f ? 10 : 4; x.strokeStyle = f ? C.acento : C.borde; x.stroke();
    const ic = await svgImg(icono, apagada ? '#7E6A96' : (f ? '#FFFFFF' : C.rosa)); if(ic) x.drawImage(ic, W2 / 2 - 64, 64, 128, 128);
    x.fillStyle = apagada ? '#9C8EA6' : C.texto; x.textAlign = 'center'; x.font = '800 44px system-ui, -apple-system, sans-serif'; x.fillText(titulo, W2 / 2, 250);
    if(sub){ x.fillStyle = C.suave; x.font = '600 28px system-ui, -apple-system, sans-serif'; x.fillText(sub, W2 / 2, 292); }
    p.listo();
  };
  p.titulo = titulo;
  await dibujar(foco); p.foco = async (f) => { if(p._f === f) return; p._f = f; await dibujar(f); }; p._f = foco;
  return p;
}

/* ── HUD: la mira al centro (con su anillo que se llena al mirar fijo) y los avisos ── */
const mira = new THREE.Mesh(new THREE.RingGeometry(.008, .013, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: .9 }));
mira.renderOrder = 99; mira.position.z = -1; cabeza.add(mira);
const anillo = new THREE.Mesh(new THREE.RingGeometry(.016, .021, 48, 1, Math.PI / 2, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.acento), depthTest: false, transparent: true }));
anillo.renderOrder = 99; anillo.position.z = -1; cabeza.add(anillo);
const aviso = new Panel(.9, .12, 600); aviso.malla.position.set(0, -.32, -1.2); aviso.malla.material.depthTest = false; aviso.malla.renderOrder = 98; aviso.malla.visible = false; cabeza.add(aviso.malla);
let avisoHasta = 0;
let avisoTexto = '';
export function hud(txt, seg = 2.2){
  avisoTexto = txt;
  const { x, cv } = aviso; x.clearRect(0, 0, cv.width, cv.height); x.font = '700 34px system-ui, -apple-system, sans-serif';
  const w = Math.min(cv.width - 8, x.measureText(txt).width + 70); redondo(x, (cv.width - w) / 2, 4, w, cv.height - 8, 30); x.fillStyle = 'rgba(23,10,38,.88)'; x.fill();
  x.strokeStyle = C.acento; x.lineWidth = 3; x.stroke(); x.fillStyle = C.texto; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cv.width / 2, cv.height / 2 + 2);
  aviso.listo(); aviso.malla.visible = true; avisoHasta = performance.now() + seg * 1000;
}

/* ── el control ── */
const B = { X: 0, O: 1, CUADRO: 2, TRIANGULO: 3, L1: 4, R1: 5, L2: 6, R2: 7, SHARE: 8, OPTIONS: 9, L3: 10, R3: 11, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15, PS: 16 };
export { B };
const antes = [];
let padVisto = false;
export const control = { ejes: [0, 0, 0, 0], apretado: () => false, oprimido: [] };
/* cuál es EL control (Carlos, 18 nov: «tengo el control pero no detecta ni pulsaciones ni al propio control»): varios
   Android reportan como «control» cosas que no lo son (el lector de huella, los botones de volumen), y el primero de la
   lista no siempre es el tuyo. Se queda el que parece un control de verdad: conectado, con 10 botones o más y, si hay
   varios, el de mapa estándar y el que se usó más recientemente. */
export function elegirPad(){
  const todos = navigator.getGamepads ? [...navigator.getGamepads()].filter((p) => p && p.connected !== false) : [];
  const reales = todos.filter((p) => p.buttons.length >= 10 && p.axes.length >= 2);
  const L = reales.length ? reales : todos.filter((p) => p.buttons.some((b) => b.pressed));
  return L.sort((a, b) => (b.mapping === 'standard') - (a.mapping === 'standard') || (b.timestamp || 0) - (a.timestamp || 0))[0] || null;
}
export const nombrePad = (p) => !p ? '' : /dualsense/i.test(p.id) ? 'DualSense' : /wireless controller|054c|sony|dualshock|playstation/i.test(p.id) ? 'PlayStation' : /xbox|045e/i.test(p.id) ? 'Xbox' : p.id.replace(/\(.*?\)/g, '').trim().slice(0, 24) || 'Control';
addEventListener('gamepadconnected', (e) => { if(e.gamepad?.buttons?.length >= 10) hud(`Control: ${nombrePad(e.gamepad)}`, 1.6); });
addEventListener('gamepaddisconnected', () => { if(!elegirPad()){ padVisto = false; hud('Control desconectado', 1.6); } });
function leerControl(){
  /* el arreglo va LLENO de falsos: con huecos, map/forEach se los saltan y `antes` se quedaba en «apretado» para siempre,
     así que sin control conectado un gesto de las manos (o una tecla) sólo funcionaba la PRIMERA vez (19 nov) */
  const p = elegirPad(); const ahora = new Array(Math.max(17, p?.buttons.length || 0)).fill(false);
  if(p){ if(!padVisto){ padVisto = true; hud(`Control: ${nombrePad(p)}`, 1.6); } p.buttons.forEach((b, i) => { ahora[i] = b.pressed || b.value > .5; }); control.ejes = [...p.axes].map((v) => Math.abs(v) < .18 ? 0 : v); }
  else control.ejes = [0, 0, 0, 0];
  teclas.forEach((v, i) => { if(v) ahora[i] = true; });
  (extra.botones || []).forEach((v, i) => { if(v) ahora[i] = true; });   // los gestos de las manos
  control.oprimido = ahora.map((v, i) => v && !antes[i]); ahora.forEach((v, i) => { antes[i] = v; });
  control.apretado = (i) => !!ahora[i];
}
/* el teclado hace de control para probar en la computadora */
/* lo que llega de fuera del control: los gestos (botones) y el puntero de la mano (rayo) */
export const extra = { botones: [], rayo: null };
export const alCuadro = [];
/* después de pintar: lo que va encima de la escena (la pantalla de la web) se acomoda con las cámaras de cada ojo */
export const trasCuadro = [];
const teclas = []; const MAPA = { Enter: B.X, Escape: B.O, Backspace: B.O, KeyR: B.CUADRO, KeyM: B.TRIANGULO, KeyH: B.OPTIONS, KeyQ: B.L1, KeyE: B.R1, ArrowUp: B.ARRIBA, ArrowDown: B.ABAJO, ArrowLeft: B.IZQ, ArrowRight: B.DER };
/* mientras el teclado del visor está abierto, las teclas de un teclado de verdad escriben (no hacen de botones) */
export const texto = { activo: false };
addEventListener('keydown', (e) => { if(texto.activo && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter')) return; if(e.code in MAPA){ teclas[MAPA[e.code]] = true; e.preventDefault(); } });
addEventListener('keyup', (e) => { if(e.code in MAPA) teclas[MAPA[e.code]] = false; });
/* SIN VISOR (modo pantalla): una sola vista, el teléfono es una ventana que se mueve con el giroscopio, y TOCAR un
   botón lo elige. CON visor, tocar la pantalla (el botón de algunos visores de cartón la toca) es «X». */
export const modo = { mono: false };
export function ponerPantalla(si){ modo.mono = !!si; if(W > 1) medir(); }
/* MODO EXPOSICIÓN (MONARCH XR y lo que venga): los botones que sacan de la experiencia no hacen nada; la salida del
   docente la pone la experiencia (kiosco.alSalir) */
export const kiosco = { activo: false, alPS: null };
let toqueIni = null;
addEventListener('pointerdown', (e) => { toqueIni = [e.clientX, e.clientY, performance.now()]; });
addEventListener('pointerup', (e) => { const t = toqueIni; toqueIni = null; if(!t || !document.body.classList.contains('dentro')) return;
  if(Math.hypot(e.clientX - t[0], e.clientY - t[1]) > 12 || performance.now() - t[2] > 600) return;
  if(modo.mono){ const L = elegibles(); if(!L.length) return; ray.setFromCamera(new THREE.Vector2((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1), cabeza);
    const h = ray.intersectObjects(L, false)[0]; if(h){ darFoco(h.object); activar(h.object); } }
  else if(foco) activar(foco); });
let arrastre = null;
addEventListener('pointerdown', (e) => { if(!ori.hay) arrastre = [e.clientX, e.clientY]; });
addEventListener('pointermove', (e) => { if(!arrastre) return; sim.yaw += (arrastre[0] - e.clientX) * .005; sim.pitch = Math.max(-1.4, Math.min(1.4, sim.pitch + (arrastre[1] - e.clientY) * .005)); arrastre = [e.clientX, e.clientY]; });
addEventListener('pointerup', () => { arrastre = null; });

/* ── sonidos (los de la casa) ── */
/* se bajan y se preparan al abrir la página (los tres a la vez); el toque de Entrar sólo despierta el audio */
let actx = null; const sonidos = {};
const cargaSonidos = (async () => {
  try{ actx = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(['toque', 'whoosh', 'ding'].map(async (n) => { sonidos[n] = await actx.decodeAudioData(await (await fetch(new URL(`sonidos/${n}.wav`, import.meta.url))).arrayBuffer()); }));
  }catch(e){ console.warn('audio', e); }
})();
export function despertarAudio(){
  /* con el iPhone en silencio, el sonido de la página se apaga salvo que se pida como «reproducción» (Safari 17+) */
  try{ if(navigator.audioSession) navigator.audioSession.type = 'playback'; }catch{}
  try{ actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx.resume().catch(() => {}); }catch{ return Promise.resolve(); }
}
export const sonidosListos = () => cargaSonidos;
export const audio = () => actx;
export function sonar(n, vol = .5){ if(!actx || !sonidos[n]) return; const s = actx.createBufferSource(), g = actx.createGain(); g.gain.value = vol; s.buffer = sonidos[n]; s.connect(g).connect(actx.destination); s.start(); }

/* ── las vistas: el inicio (hub), el cine, los ajustes y las que vienen ── */
const hub = new THREE.Group(); escena.add(hub);
const vistas = {}; let vista = null;
export function registrar(nombre, v){ vistas[nombre] = v; v.grupo = v.grupo || new THREE.Group(); v.grupo.visible = false; hub.add(v.grupo); }
export function ir(nombre){
  if(vista === nombre) return;
  if(vista){ vistas[vista].grupo.visible = false; vistas[vista].salir?.(); }
  vista = nombre; const v = vistas[nombre]; v.grupo.visible = true; v.entrar?.(); sonar('whoosh', .25); foco?.userData.panel?.foco?.(false); foco = null; bloquearMirada();
  ponerAtras();
}

/* «Atrás» en todas las pantallas menos el inicio (Carlos, 18 nov: miró «La Sala» sin control y se quedó atorado: atrás
   sólo era el Círculo). Se elige como todo lo demás: mirándolo fijo, con la mano o con el control. Cada vista puede
   decir dónde va (atrasEn: [x, y, z]); si no, abajo y enfrente, debajo de todo lo que pone el inicio o el cine. */
const atrasP = new Panel(.46, .15, 500); atrasP.titulo = 'Atrás';
const atras = atrasP.malla; atras.visible = false; atras.userData.accion = () => { const v = vistas[vista]; (v?.cerrar?.() || v?.atras?.()); };
const pintarAtras = async (f) => { const { x, cv } = atrasP, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
  redondo(x, 4, 4, w - 8, h - 8, (h - 8) / 2); x.fillStyle = f ? '#3A1A5C' : C.sup; x.fill(); x.lineWidth = f ? 7 : 3; x.strokeStyle = f ? C.acento : C.borde; x.stroke();
  const ic = await svgImg('arrow-left', f ? '#FFFFFF' : C.rosa); if(ic) x.drawImage(ic, 30, h / 2 - 24, 48, 48);
  x.fillStyle = C.texto; x.font = '800 38px system-ui, -apple-system, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText('Atrás', 96, h / 2 + 2); atrasP.listo(); };
atrasP.foco = (f) => { if(atrasP._f === f) return; atrasP._f = f; pintarAtras(f); };
hub.add(atras);   /* se pinta la primera vez que sale: los iconos se registran después de cargar este módulo */
function ponerAtras(){
  const v = vistas[vista]; atras.visible = !!v && vista !== 'inicio' && !!(v.atras || v.cerrar);
  if(!atras.visible) return;
  if(atrasP._f === undefined){ atrasP._f = false; pintarAtras(false); }
  const [x, y, z] = v.atrasEn || [0, -.95, -1.7]; atras.position.set(x, y, z); atras.lookAt(0, y * .3, 0);
}
export { ponerAtras, atras };
export const ahora = () => vista;

/* lo que se puede elegir: cada vista da sus objetos; la mira o las flechas les dan el foco */
const ray = new THREE.Raycaster(); const centro = new THREE.Vector2(0, 0);
let foco = null, focoDesde = 0, focoPorFlechas = -1e9, ultimoGiro = new THREE.Quaternion();
function elegibles(){ const L = vistas[vista]?.elegibles?.() || []; return atras.visible ? [...L, atras] : L; }
const historialMira = []; let xManoAntes = false;
let mirarBloqueado = true;                                   // al abrir una vista, lo que ya tenías enfrente no se elige solo
/* …hasta que la cabeza se mueva. Antes sólo se soltaba al pasar de un botón a OTRO: si llegabas a «Atrás» desde el vacío,
   seguía bloqueado y sin control no había salida (Carlos, 18 nov) */
const giroAlBloquear = new THREE.Quaternion();
let bloqueadoHasta = 0;
/* …o hasta que pase un momento: Carlos (18 nov) se quedaba viendo lo que ya estaba iluminado al entrar y no se abría
   hasta mirar otro y regresar. Ahora espera 0.9 s y luego cuenta como siempre (2.5 s en total), con el anillo llenándose */
/* MIRAR FIJO NO ELIGE HASTA MOVER LA CABEZA (Carlos, 19 nov: «al abrir el modo VR casi siempre te mete a Leer» y «la
   siguiente diapositiva se pasa casi casi viéndola de reojo»): al cambiar de pantalla, lo que quedó enfrente NO se elige
   solo hasta que muevas la cabeza; después de elegir algo, para volver a elegir lo mismo mirando hay que esperar `ms`
   (o mover la cabeza). Y mirar fijo tarda 2.5 s, no 1.6. */
/* y lo PRIMERO que quede bajo la mira después de cambiar de pantalla o de elegir algo tampoco se elige mirándolo: hay que
   quitarle la vista y volver (el botón «Siguiente» de la diapositiva nueva sale en el mismo lugar que el de antes y,
   como es otro objeto, se elegía solo) */
/* Si MOVISTE la cabeza desde entonces, ya cuenta (fuiste tú a verlo); sólo al entrar al visor (`estricto`) hay que
   quitarle la vista sí o sí: al ponerse el visor la cabeza se mueve mucho y «Leer» queda enfrente */
let primerFoco = null, primerEstricto = false;
function bloquearMirada(ms = Infinity, estricto = false){ mirarBloqueado = true; giroAlBloquear.copy(cabeza.quaternion); bloqueadoHasta = performance.now() + ms; primerFoco = 'pendiente'; primerEstricto = estricto; }
export function mirarAlEntrar(){ bloquearMirada(Infinity, true); }
export const MIRAR_MS = 2500;
function darFoco(o){ if(foco === o) return; if(o && primerFoco === 'pendiente') primerFoco = o; else if(primerFoco !== 'pendiente') primerFoco = null; if(foco || !o) mirarBloqueado = false; foco?.userData.panel?.foco?.(false); foco = o; focoDesde = performance.now(); o?.userData.panel?.foco?.(true); }   /* sin «tiuk» al ver algo (Carlos, 19 nov) */
function moverFoco(dx, dy){
  const L = elegibles(); if(!L.length) return;
  focoPorFlechas = performance.now(); ultimoGiro.copy(cabeza.quaternion);
  if(!foco || !L.includes(foco)){ darFoco(L[0]); return; }
  const p = new THREE.Vector3(); foco.getWorldPosition(p); let mejor = null, md = 1e9;
  for(const o of L){ if(o === foco) continue; const q = new THREE.Vector3(); o.getWorldPosition(q);
    const v = q.clone().sub(p).applyQuaternion(hub.quaternion.clone().invert()); const along = dx ? v.x * dx : v.y * dy;
    if(along <= .01) continue; const d = along + Math.abs(dx ? v.y : v.x) * 2; if(d < md){ md = d; mejor = o; } }
  if(mejor) darFoco(mejor);
}
function activar(o){ if(!o) return;
  /* lo que se repite mirándolo (las flechas de Ajustes): sin bloqueo, la siguiente vez a los 0.9 s */
  if(o.userData.repetir){ focoDesde = performance.now() - MIRAR_MS + 900; o.userData.accion?.(); return; }
  bloquearMirada(3000); o.userData.accion?.(); }   /* sin campanita al tocar (Carlos, 19 nov: «súper castroso») */

/* ── el ciclo ── */
let giroArmado = true, ultimo = performance.now();
const mirar = { activo: true };
export { mirar };
function cuadro(t){
  const dt = Math.min(.05, (t - ultimo) / 1000); ultimo = t;
  leerControl(); leerCabeza();
  const v = vistas[vista];
  /* botones que valen en todas partes */
  if(control.oprimido[B.OPTIONS] || control.oprimido[B.PS]){ if(kiosco.activo) kiosco.alPS?.(); else ir('inicio'); }
  if(control.oprimido[B.CUADRO]) recentrar();
  if(control.oprimido[B.TRIANGULO] && !kiosco.activo){ if(camTex){ ponerMixta(!AJ.mixta); hud(AJ.mixta ? 'Realidad mixta' : 'Realidad virtual'); } else hud('Sin cámara'); }
  /* girar con el stick derecho, a saltos de 30° (marea menos que girar suave) */
  const rx = control.ejes[2];
  if(Math.abs(rx) > .7 && giroArmado && !v?.ocupaGiro){ guinada -= Math.sign(rx) * Math.PI / 6; giroArmado = false; sonar('toque', .15); }
  if(Math.abs(rx) < .3) giroArmado = true;
  /* caminar con el izquierdo (sólo en el cuarto virtual: en la realidad mixta caminas tú) */
  if(!AJ.mixta && (control.ejes[0] || control.ejes[1]) && !v?.ocupaStick){
    const r = rumbo(), vx = control.ejes[0], vz = control.ejes[1], vel = 1.6 * dt;
    rig.position.x += (Math.cos(r) * vx + Math.sin(r) * vz) * vel; rig.position.z += (-Math.sin(r) * vx + Math.cos(r) * vz) * vel;
  }
  /* la vista recibe el control primero; lo que no use, mueve el foco */
  const usado = v?.control?.(control, dt) || {};
  if(!usado.flechas){
    if(control.oprimido[B.IZQ]) moverFoco(-1, 0); if(control.oprimido[B.DER]) moverFoco(1, 0);
    if(control.oprimido[B.ARRIBA]) moverFoco(0, 1); if(control.oprimido[B.ABAJO]) moverFoco(0, -1);
  }
  if(control.oprimido[B.X] && !usado.x && !(extra.rayo && extra.botones?.[B.X])) activar(foco);
  if(control.oprimido[B.O] && !usado.o) v?.atras?.();
  /* la mira: lo que ves al centro toma el foco, salvo justo después de usar las flechas sin mover la cabeza */
  if(mirarBloqueado && (cabeza.quaternion.angleTo(giroAlBloquear) > .14 || performance.now() > bloqueadoHasta)){ mirarBloqueado = false; focoDesde = performance.now(); }   /* el reloj de mirar fijo empieza al soltarse, no antes */
  const L = elegibles(); let viendo = null;
  /* sin visor no hay mira: se elige tocando (mirar fijo al centro abría «Leer» solo al entrar) */
  if(mirar.activo && L.length && !modo.mono){
    const flechasRecientes = performance.now() - focoPorFlechas < 4000 && cabeza.quaternion.angleTo(ultimoGiro) < .12;
    /* cada mano con su rayo: cada uno sabe a qué le pega; el foco lo da el principal (o la mira, sin manos) */
    for(const R of extra.rayos || []){ ray.set(R.origen, R.dir); let hh = ray.intersectObjects(L, false)[0];
      /* (el imán de 5° se quitó el 19 nov: Carlos, «estaba mejor antes del imán») */
      R.hit = hh ? hh.point.clone() : null; R.objeto = hh?.object || null;
      if(R.objeto && R.mano){ R.mano.objetoAntes = R.objeto; R.mano.objetoEn = performance.now(); } }
    let h;
    if(extra.rayo){ h = extra.rayo.objeto !== undefined ? (extra.rayo.objeto ? { object: extra.rayo.objeto } : null) : (ray.set(extra.rayo.origen, extra.rayo.dir), ray.intersectObjects(L, false)[0]);
      if(h && !extra.rayo.hit && h.point) extra.rayo.hit = h.point.clone(); }
    else { ray.setFromCamera(centro, cabeza); h = ray.intersectObjects(L, false)[0]; }
    extra.sobreBoton = !!(extra.rayos || []).some((R) => R.objeto) || !!(extra.rayo && h);
    if(h && (!flechasRecientes || extra.rayo)){ viendo = h.object; darFoco(viendo); }
  }
  if(!extra.rayo) extra.sobreBoton = false;
  /* el clic con pellizco elige a lo que apuntabas UN INSTANTE ANTES: al juntar los dedos la mano se mueve y el rayo se
     brincaba de la tarjeta (Carlos, 18 nov: «haz que pellizcar sea un click») */
  const ahoraMs = performance.now(); historialMira.push([ahoraMs, viendo]); while(historialMira.length > 30) historialMira.shift();
  const xMano = !!extra.botones?.[B.X], clicMano = xMano && !xManoAntes; xManoAntes = xMano;
  if(clicMano && !usado.x && extra.rayo){
    /* el clic va a lo que apunta LA MANO QUE PELLIZCA (su rayo ya está congelado en hacia dónde apuntaba antes de juntar los dedos) */
    const quien = (extra.rayos || []).find((R) => R.pellizco && R.objeto)
      || (extra.rayos || []).filter((R) => R.mano?.agarro && ahoraMs - R.mano.agarro < 250).map((R) => ({ objeto: R.mano.objetoAntes }))[0];
    const antes = quien ? null : historialMira.find(([t, o]) => ahoraMs - t <= 260 && ahoraMs - t >= 90 && o);
    /* PELLIZCAR EL AIRE NO ELIGE NADA (Carlos, 19 nov: en MONARCH «se aburren, juegan con sus manos y omiten el video por
       accidente»): antes, sin nada bajo el rayo, el clic caía en lo último que tuvo el foco (el «Siguiente»). Ahora sólo
       cuenta lo que la mano apuntaba en ese instante. */
    const o = quien?.objeto || antes?.[1]; if(o){ darFoco(o); activar(o); } usado.x = true; }
  /* MIRAR O APUNTAR FIJO 1.6 s ELIGE, SIEMPRE (Carlos, 18 nov: «si apunto hacia un elemento unos segundos, que se clique, además
     del pellizcar; y que se pueda seguir pulsando sólo quedándote viendo»): antes se apagaba con el control conectado o con
     las manos a la vista. Con las manos cuenta a lo que apunta el rayo principal; sin manos, a lo que ve la mira. */
  /* con L2 apretado estás moviendo o agrandando algo: mirar fijo no elige (si no, al acomodar el menú se metía a lo que veías) */
  if(control.apretado(B.L2)) focoDesde = performance.now();
  if(!viendo && primerFoco && primerFoco !== 'pendiente') primerFoco = null;   /* le quitaste la vista: ya cuenta */
  if(primerFoco && !primerEstricto && cabeza.quaternion.angleTo(giroAlBloquear) > .14) primerFoco = null;   /* giraste la cabeza: ya cuenta */
  const fijo = !mirarBloqueado && viendo && viendo === foco && viendo !== primerFoco && !(extra.rayo && extra.rayo.pellizco) ? Math.max(0, (performance.now() - focoDesde) / MIRAR_MS) : 0;
  anillo.visible = fijo > .05;
  /* el anillo se llena donde estás apuntando: en el cursor del rayo, o en la mira */
  if(anillo.visible && extra.rayo?.hit){ const pl = cabeza.worldToLocal(extra.rayo.hit.clone()); const k = Math.max(.3, -pl.z); anillo.position.copy(pl).multiplyScalar(.98); anillo.scale.setScalar(k); }
  else { anillo.position.set(0, 0, -1); anillo.scale.setScalar(1); }
  if(anillo.visible){ anillo.geometry.dispose(); anillo.geometry = new THREE.RingGeometry(.016, .021, 48, 1, Math.PI / 2, -Math.min(1, fijo) * Math.PI * 2); }
  fijoAhora = fijo;
  if(fijo >= 1) activar(viendo);
  /* la vista de AHORA: si Círculo, la palma o un clic cambiaron de pantalla en este cuadro, la de antes ya salió y no
     le toca otro turno (Carlos, 18 nov: un sable morado gigante se quedaba flotando en el menú, porque Sables volvía a
     prenderlo después de su propio salir) */
  const va = vistas[vista];
  try{ va?.cuadro?.(t / 1000, dt); }catch(e){ fallo('E-VISTA', `${vista}.cuadro`, e); }
  ponerAtras();   /* cada cuadro: al volver de un capítulo al estante, Atrás se quedaba a un lado, fuera de la vista */
  for(const f of alCuadro) try{ f(t / 1000, dt); }catch(e){ fallo('E-CUADRO', f.name || 'alCuadro', e); }
  /* la mira sólo cuando estás viendo un botón (Carlos, 18 nov: «si no estoy mirando a ningún botón, que el cursor desaparezca, es molesto») */
  mira.visible = !extra.rayo && !!viendo;
  if(aviso.malla.visible && performance.now() > avisoHasta) aviso.malla.visible = false;
  if(pared.visible){ medirPared();
    /* camNuevo === null: sin aviso de cuadros (navegador viejo), se repinta siempre */
    if(extra.camSinc ? extra.camFresco : camNuevo !== false){ if(video.readyState >= 2) camTex.needsUpdate = true; if(camNuevo) camNuevo = false; }
  }
  extra.camFresco = false;

  /* dos ojos a dos texturas, y el pase del lente a la pantalla */
  rig.updateMatrixWorld(true);
  if(modo.mono){ render.setRenderTarget(null); render.render(escena, cabeza); for(const f of trasCuadro) f([cabeza], W, H); capaEncima.style.display = 'none'; return; }
  estereo.update(cabeza);
  render.setRenderTarget(rtI); render.render(escena, estereo.cameraL);
  render.setRenderTarget(rtD); render.render(escena, estereo.cameraR);
  render.setRenderTarget(null); render.render(paseEsc, paseCam);
  for(const f of trasCuadro) f([estereo.cameraL, estereo.cameraR], W / 2, H);
  ponerEncima([estereo.cameraL, estereo.cameraR], W / 2, H);
}

/* ── encima de todo: la mira, su anillo y los avisos, pintados en la página (Carlos, 18 nov: «los cursores se esconden
   atrás de la pantalla cuando la miras»). La pantalla de la web es de la página, no de la escena, así que tapa lo 3D;
   mientras está puesta, la mira y el aviso se dibujan también en la página, uno por ojo, con la curva del lente ── */
let fijoAhora = 0;
export const encima = { activa: false };
const capaEncima = document.createElement('div'); capaEncima.style.cssText = 'position:fixed; inset:0; z-index:4; pointer-events:none; display:none';
const ojosEncima = [0, 1].map((i) => { const o = document.createElement('div'); o.style.cssText = `position:absolute; top:0; ${i ? 'left:50%' : 'left:0'}; width:50%; height:100%; overflow:hidden`;
  const m = document.createElement('div'); m.style.cssText = 'position:absolute; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%; box-shadow:0 0 0 2px #fff, 0 0 0 4px rgba(0,0,0,.45)';
  const a = document.createElement('div'); a.style.cssText = 'position:absolute; width:30px; height:30px; margin:-15px 0 0 -15px; border-radius:50%; -webkit-mask:radial-gradient(circle, transparent 10px, #000 11px); mask:radial-gradient(circle, transparent 10px, #000 11px)';
  const t = document.createElement('div'); t.style.cssText = 'position:absolute; transform:translate(-50%,-50%); padding:6px 14px; border-radius:99px; background:rgba(30,20,40,.92); box-shadow:inset 0 0 0 2px #AC27FF; color:#F4EEF2; font:800 15px system-ui,-apple-system,sans-serif; white-space:nowrap';
  o.append(m, a, t); capaEncima.appendChild(o); return { m, a, t }; });
(document.body ? document.body.appendChild(capaEncima) : addEventListener('DOMContentLoaded', () => document.body.appendChild(capaEncima)));
const pEnc = new THREE.Vector3(), invEnc = new THREE.Matrix4();
function aPantalla(obj, cam, i, ancho, alto){
  obj.getWorldPosition(pEnc); invEnc.copy(cam.matrixWorld).invert(); pEnc.applyMatrix4(invEnc); if(pEnc.z > -.01) return null;
  pEnc.applyMatrix4(cam.projectionMatrix); const [u, v] = alLente((pEnc.x + 1) / 2, (pEnc.y + 1) / 2, i === 1); return [u * ancho, (1 - v) * alto];
}
function ponerEncima(camaras, ancho, alto){
  capaEncima.style.display = encima.activa ? 'block' : 'none'; if(!encima.activa) return;
  camaras.forEach((cam, i) => {
    const o = ojosEncima[i], pm = mira.visible ? aPantalla(mira, cam, i, ancho, alto) : null;
    o.m.style.display = pm ? 'block' : 'none'; if(pm){ o.m.style.left = pm[0] + 'px'; o.m.style.top = pm[1] + 'px'; }
    const lleno = pm && fijoAhora > .05; o.a.style.display = lleno ? 'block' : 'none';
    if(lleno){ o.a.style.left = pm[0] + 'px'; o.a.style.top = pm[1] + 'px'; o.a.style.background = `conic-gradient(#AC27FF ${Math.min(1, fijoAhora) * 360}deg, transparent 0)`; }
    const pa = aviso.malla.visible ? aPantalla(aviso.malla, cam, i, ancho, alto) : null;
    o.t.style.display = pa ? 'block' : 'none'; if(pa){ o.t.style.left = pa[0] + 'px'; o.t.style.top = pa[1] + 'px'; if(o.t.textContent !== avisoTexto) o.t.textContent = avisoTexto; }
  });
}

/* ── arrancar ── */
export function arrancar(){
  medir(); addEventListener('resize', medir); screen.orientation?.addEventListener?.('change', medir);
  ponerMixta(AJ.mixta && !!camTex);
  render.setAnimationLoop((t) => { try{ cuadro(t); }catch(e){ fallo('E-MOTOR', 'cuadro', e); } });
}
export const hayControl = () => padVisto;
export const hayGiro = () => ori.hay;   /* ¿la cabeza la mueve el giroscopio de verdad? (sin él, la mueve el ratón) */
export { cuarto, domo, piso };
export { render, THREE, escena, cabeza, rig, hub, AJ, FABRICA, guardar, aplicarAjustes, ponerMixta, tarjeta, Panel, redondo, svgImg, C, camTex, video };
export const hayCamara = () => !!camTex;
/* dónde cae en la PANTALLA del teléfono un punto de la imagen de un ojo, ya pasado por el lente (el pase de arriba,
   al revés). Lo usa la pantalla de la web, que va encima sin pasar por el lente, para que sus esquinas caigan justo
   sobre las de la pantalla 3D. u, v de 0 a 1 (v hacia arriba); der = ojo derecho. */
export function alLente(u, v, der){
  const off = pase.uniforms.off.value, asp = pase.uniforms.asp.value, k1 = AJ.k1, k2 = AJ.k2, esc = AJ.escala;
  const cx = .5 + (der ? -off : off), tx = (u - .5) * asp, ty = v - .5;
  let ex = tx, ey = ty;                                   // (e - c) con x en unidades de alto
  for(let i = 0; i < 8; i++){ const r2 = ex * ex + ey * ey, f = (1 + k1 * r2 + k2 * r2 * r2) / esc; ex = tx / f; ey = ty / f; }
  return [cx + ex / asp, .5 + ey];
}
export const focoActual = () => foco?.userData.panel?.titulo || null;
export const enfrente = (dist, alto = 0) => { const p = new THREE.Vector3(0, alto, -dist); return p; };
