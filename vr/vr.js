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

/* ── ajustes: se guardan en el teléfono (sólo comodidad; si se borran, salen los de fábrica) ── */
const FABRICA = { sep: 62, ancho: 140, k1: .22, k2: .06, campo: 88, camCampo: 0, camVoltear: false, mixta: false, escala: 1 };
const AJ = { ...FABRICA };
try{ Object.assign(AJ, JSON.parse(localStorage.getItem('mazivr.ajustes') || '{}')); }catch{}
const guardar = () => { try{ localStorage.setItem('mazivr.ajustes', JSON.stringify(AJ)); }catch{} };

const C = { fondo: '#170A26', sup: '#24123A', borde: '#3C2652', acento: '#AC27FF', vino: '#7E1735', texto: '#F4EEF2', suave: '#C9B6DA', rosa: '#C77DFF' };

/* ── escena ── */
const lienzo = document.getElementById('gl');
const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
render.setPixelRatio(Math.min(devicePixelRatio, 2));
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
  fragmentShader: 'uniform vec3 a, b, c; varying vec3 p; void main(){ float y = p.y; vec3 col = mix(c, a, smoothstep(-.35, .25, y)); col = mix(col, b, smoothstep(.25, .9, y)); gl_FragColor = vec4(col, 1.); }' }));
const piso = new THREE.GridHelper(40, 40, 0x6E3AA8, 0x3A1F5A); piso.position.y = -1.5; piso.material.transparent = true; piso.material.opacity = .45;
const cuarto = new THREE.Group(); cuarto.add(domo, piso); escena.add(cuarto);

/* ── la cámara del teléfono (realidad mixta): pegada a la cabeza, al fondo de todo ── */
const video = document.createElement('video'); video.playsInline = true; video.muted = true; video.setAttribute('playsinline', '');
let camTex = null, flujo = null, ultra = false;
export const campoCamara = () => AJ.camCampo || (ultra ? 104 : 69);
const pared = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: false, depthTest: false, toneMapped: false }));
pared.renderOrder = -10; pared.position.z = -20; pared.visible = false; cabeza.add(pared);
export async function abrirCamara(){
  if(flujo) return true;
  try{
    flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    /* la ultra gran angular llena la vista del visor (la normal abre ~69°, el ojo en el visor ~90°); si el teléfono la ofrece, se cambia a ella */
    try{
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const uw = devs.find((d) => /ultra|gran angular/i.test(d.label));
      if(uw){ flujo.getTracks().forEach((t) => t.stop()); flujo = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: uw.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); ultra = true; }
    }catch(e){ console.warn('ultra gran angular', e); }
    video.srcObject = flujo; await video.play();
    camTex = new THREE.VideoTexture(video); camTex.colorSpace = THREE.SRGBColorSpace;
    pared.material.map = camTex; pared.material.color.set(0xffffff); pared.material.needsUpdate = true;
    return true;
  }catch(e){ console.warn('cámara', e); return false; }
}
function medirPared(){
  const d = -pared.position.z, ancho = 2 * d * Math.tan(campoCamara() * Math.PI / 360);
  const asp = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
  pared.scale.set(ancho, ancho / asp, 1); pared.rotation.z = AJ.camVoltear ? Math.PI : 0;
}
function ponerMixta(si){
  AJ.mixta = si; guardar();
  cuarto.visible = !si; pared.visible = si && !!camTex;
  if(flujo) flujo.getVideoTracks().forEach((t) => { t.enabled = si; });
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
  cabeza.aspect = (W / 2) / H; aplicarAjustes();
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
const ori = { a: 0, b: 90, g: 0, hay: false };
const zee = new THREE.Vector3(0, 0, 1), eul = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
addEventListener('deviceorientation', (e) => { if(e.alpha == null) return; ori.a = e.alpha; ori.b = e.beta; ori.g = e.gamma; ori.hay = true; });
const angPantalla = () => (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
let guinada = 0;                                             // el giro extra: stick derecho y «recentrar»
const qCab = new THREE.Quaternion(), qG = new THREE.Quaternion(), yUp = new THREE.Vector3(0, 1, 0);
const sim = { yaw: 0, pitch: 0 };                            // sin giroscopio (pruebas y computadora): ratón y flechas
function leerCabeza(){
  if(ori.hay){
    const D = THREE.MathUtils.DEG2RAD; eul.set(ori.b * D, ori.a * D, -ori.g * D, 'YXZ');
    qCab.setFromEuler(eul); qCab.multiply(q1); qCab.multiply(q0.setFromAxisAngle(zee, -angPantalla()));
  } else qCab.setFromEuler(eul.set(sim.pitch, sim.yaw, 0, 'YXZ'));
  cabeza.quaternion.copy(qCab);
  rig.quaternion.copy(qG.setFromAxisAngle(yUp, guinada));
}
/* hacia dónde ve la cabeza en el mundo, sólo de lado (para recentrar y caminar) */
const adelante = new THREE.Vector3();
const rumbo = () => { cabeza.getWorldDirection(adelante); return Math.atan2(-adelante.x, -adelante.z); };
export function recentrar(){
  /* el menú queda enfrente de donde ves ahora */
  const r = rumbo(); hub.rotation.y = r; hub.position.copy(rig.position); hud('Al centro');
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
export function hud(txt, seg = 2.2){
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
function leerControl(){
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const p = pads[0]; const ahora = [];
  if(p){ if(!padVisto){ padVisto = true; hud('Control conectado'); } p.buttons.forEach((b, i) => { ahora[i] = b.pressed || b.value > .5; }); control.ejes = [...p.axes].map((v) => Math.abs(v) < .18 ? 0 : v); }
  else control.ejes = [0, 0, 0, 0];
  teclas.forEach((v, i) => { if(v) ahora[i] = true; });
  control.oprimido = ahora.map((v, i) => v && !antes[i]); ahora.forEach((v, i) => { antes[i] = v; });
  control.apretado = (i) => !!ahora[i];
}
/* el teclado hace de control para probar en la computadora */
const teclas = []; const MAPA = { Enter: B.X, Escape: B.O, Backspace: B.O, KeyR: B.CUADRO, KeyM: B.TRIANGULO, KeyH: B.OPTIONS, KeyQ: B.L1, KeyE: B.R1, ArrowUp: B.ARRIBA, ArrowDown: B.ABAJO, ArrowLeft: B.IZQ, ArrowRight: B.DER };
addEventListener('keydown', (e) => { if(e.code in MAPA){ teclas[MAPA[e.code]] = true; e.preventDefault(); } });
addEventListener('keyup', (e) => { if(e.code in MAPA) teclas[MAPA[e.code]] = false; });
let arrastre = null;
addEventListener('pointerdown', (e) => { if(!ori.hay) arrastre = [e.clientX, e.clientY]; });
addEventListener('pointermove', (e) => { if(!arrastre) return; sim.yaw += (arrastre[0] - e.clientX) * .005; sim.pitch = Math.max(-1.4, Math.min(1.4, sim.pitch + (arrastre[1] - e.clientY) * .005)); arrastre = [e.clientX, e.clientY]; });
addEventListener('pointerup', () => { arrastre = null; });

/* ── sonidos (los de la casa) ── */
let actx = null; const sonidos = {};
export async function despertarAudio(){
  try{ actx = actx || new (window.AudioContext || window.webkitAudioContext)(); await actx.resume();
    for(const n of ['toque', 'whoosh', 'ding']) if(!sonidos[n]) sonidos[n] = await actx.decodeAudioData(await (await fetch(`sonidos/${n}.wav`)).arrayBuffer());
  }catch(e){ console.warn('audio', e); }
}
export function sonar(n, vol = .5){ if(!actx || !sonidos[n]) return; const s = actx.createBufferSource(), g = actx.createGain(); g.gain.value = vol; s.buffer = sonidos[n]; s.connect(g).connect(actx.destination); s.start(); }

/* ── las vistas: el inicio (hub), el cine, los ajustes y las que vienen ── */
const hub = new THREE.Group(); escena.add(hub);
const vistas = {}; let vista = null;
export function registrar(nombre, v){ vistas[nombre] = v; v.grupo = v.grupo || new THREE.Group(); v.grupo.visible = false; hub.add(v.grupo); }
export function ir(nombre){
  if(vista === nombre) return;
  if(vista){ vistas[vista].grupo.visible = false; vistas[vista].salir?.(); }
  vista = nombre; const v = vistas[nombre]; v.grupo.visible = true; v.entrar?.(); sonar('whoosh', .25); foco?.userData.panel?.foco?.(false); foco = null; mirarBloqueado = true;
}
export const ahora = () => vista;

/* lo que se puede elegir: cada vista da sus objetos; la mira o las flechas les dan el foco */
const ray = new THREE.Raycaster(); const centro = new THREE.Vector2(0, 0);
let foco = null, focoDesde = 0, focoPorFlechas = -1e9, ultimoGiro = new THREE.Quaternion();
function elegibles(){ return vistas[vista]?.elegibles?.() || []; }
let mirarBloqueado = true;                                   // al abrir una vista, lo que ya tenías enfrente no se elige solo
function darFoco(o){ if(foco === o) return; if(foco || !o) mirarBloqueado = false; foco?.userData.panel?.foco?.(false); foco = o; focoDesde = performance.now(); o?.userData.panel?.foco?.(true); if(o) sonar('toque', .18); }
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
function activar(o){ if(!o) return; sonar('ding', .3); mirarBloqueado = true; o.userData.accion?.(); }

/* ── el ciclo ── */
let giroArmado = true, ultimo = performance.now();
const mirar = { activo: true };
export { mirar };
function cuadro(t){
  const dt = Math.min(.05, (t - ultimo) / 1000); ultimo = t;
  leerControl(); leerCabeza();
  const v = vistas[vista];
  /* botones que valen en todas partes */
  if(control.oprimido[B.OPTIONS] || control.oprimido[B.PS]) ir('inicio');
  if(control.oprimido[B.CUADRO]) recentrar();
  if(control.oprimido[B.TRIANGULO]){ if(camTex){ ponerMixta(!AJ.mixta); hud(AJ.mixta ? 'Realidad mixta' : 'Realidad virtual'); } else hud('Sin cámara'); }
  /* girar con el stick derecho, a saltos de 30° (marea menos que girar suave) */
  const rx = control.ejes[2];
  if(Math.abs(rx) > .7 && giroArmado){ guinada -= Math.sign(rx) * Math.PI / 6; giroArmado = false; sonar('toque', .15); }
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
  if(control.oprimido[B.X] && !usado.x) activar(foco);
  if(control.oprimido[B.O] && !usado.o) v?.atras?.();
  /* la mira: lo que ves al centro toma el foco, salvo justo después de usar las flechas sin mover la cabeza */
  const L = elegibles(); let viendo = null;
  if(mirar.activo && L.length){
    const flechasRecientes = performance.now() - focoPorFlechas < 4000 && cabeza.quaternion.angleTo(ultimoGiro) < .12;
    ray.setFromCamera(centro, cabeza); const h = ray.intersectObjects(L, false)[0];
    if(h && !flechasRecientes){ viendo = h.object; darFoco(viendo); }
  }
  /* mirar fijo 1.6 s también elige (para cuando no tienes el control a la mano) */
  /* sólo sin control: con el control se elige con X y mirar fijo estorba */
  const fijo = !padVisto && !mirarBloqueado && viendo && viendo === foco ? Math.max(0, (performance.now() - focoDesde) / 1600) : 0;
  anillo.visible = fijo > .05;
  if(anillo.visible){ anillo.geometry.dispose(); anillo.geometry = new THREE.RingGeometry(.016, .021, 48, 1, Math.PI / 2, -Math.min(1, fijo) * Math.PI * 2); }
  if(fijo >= 1) activar(viendo);
  v?.cuadro?.(t / 1000, dt);
  if(aviso.malla.visible && performance.now() > avisoHasta) aviso.malla.visible = false;
  if(pared.visible) medirPared();

  /* dos ojos a dos texturas, y el pase del lente a la pantalla */
  rig.updateMatrixWorld(true); estereo.update(cabeza);
  render.setRenderTarget(rtI); render.render(escena, estereo.cameraL);
  render.setRenderTarget(rtD); render.render(escena, estereo.cameraR);
  render.setRenderTarget(null); render.render(paseEsc, paseCam);
}

/* ── arrancar ── */
export function arrancar(){
  medir(); addEventListener('resize', medir); screen.orientation?.addEventListener?.('change', medir);
  ponerMixta(AJ.mixta && !!camTex);
  render.setAnimationLoop(cuadro);
}
export { THREE, escena, cabeza, rig, hub, AJ, FABRICA, guardar, aplicarAjustes, ponerMixta, tarjeta, Panel, redondo, svgImg, C, camTex, video };
export const hayCamara = () => !!camTex;
export const focoActual = () => foco?.userData.panel?.titulo || null;
export const enfrente = (dist, alto = 0) => { const p = new THREE.Vector3(0, alto, -dist); return p; };
