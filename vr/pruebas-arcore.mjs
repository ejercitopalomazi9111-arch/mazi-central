/* ARCORE (Carlos, 26 nov: «pónselo ya de predefinido»): con un WebXR «immersive-ar» de mentira (la forma que da Chrome de
   Android), comprueba que al tocar Entrar se abre la sesión, que la pose de ARCore mueve la cabeza (6DoF), que la cámara
   de ARCore llega a la realidad mixta y a las manos, y que al salir de la sesión el visor sigue con el modo de siempre.
   Sin ARCore (computadora, iPhone) se entra como siempre.
     node vr/pruebas-arcore.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
async function abrir(conXR){
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
  await ctx.addInitScript((conXR) => { navigator.getGamepads = () => []; try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ fondo: 1, manos: true })); }catch{}
    if(!conXR) return;
    /* el App Clip de Variant: su objeto VLaunch y la cámara cuadro por cuadro (un JPEG naranja en base64, como lo manda ARKit) */
    if(conXR === 'variant'){
      /* como el de verdad: cada pedido manda UN cuadro (un JPEG en base64) por el evento 'cv_data'; y, como el caso feo que vio
         Carlos (27 nov: «actualiza una vez la imagen y así se queda»), uno de cada tres pedidos SE PIERDE y no manda solo */
      const W = new EventTarget(); let n = 0; window.__cam = { pedidos: 0, mandados: 0 };
      W._requestComputerVisionData = () => { __cam.pedidos++; (__cam.t ||= []).push(Math.round(performance.now())); if(++n % 3 === 0) return;
        setTimeout(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const x = c.getContext('2d'); x.fillStyle = `rgb(200,${100 + (__cam.mandados % 50)},40)`; x.fillRect(0, 0, 64, 48);
          __cam.mandados++; const ev = new Event('cv_data'); ev.detail = { _buffers: [{ size: { width: 64, height: 48 }, _buffer: c.toDataURL('image/jpeg').split(',')[1] }] }; W.dispatchEvent(ev); }, 30); };
      W._startSendingComputerVisionData = () => {};
      window.VLaunch = { appleBrowser: 'launch-viewer', webXR: { _arKitWrapper: W }, requestVideoFrame(cb){ W._requestComputerVisionData(); W.addEventListener('cv_data', (r) => { const b = r.detail._buffers[0]; cb({ width: b.size.width, height: b.size.height, data: b._buffer, format: 'base64Jpeg' }); }, { once: true }); } };
    }
    window.__xr = { pedidos: 0, pos: [0, 1.5, 0], q: [0, 0, 0, 1], fin: null };
    WebGL2RenderingContext.prototype.makeXRCompatible = async function(){};   /* el de verdad truena sin aparato XR */
    /* Chrome de Android: la capa trae SU búfer (opaco); el App Clip de Variant en el iPhone: null (= el lienzo de la página) */
    window.XRWebGLLayer = class { constructor(s, gl){ this.framebufferWidth = 844; this.framebufferHeight = 390;
      if(conXR === 'variant'){ this.framebuffer = null; return; }
      const fb = gl.createFramebuffer(), rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, 844, 390);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb); gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.framebuffer = fb; } };
    /* la «cámara de ARCore»: una textura de 64×48 llena de un color, en el mismo contexto */
    window.XRWebGLBinding = class { constructor(s, gl){ this.gl = gl; } getCameraImage(){ const gl = this.gl; if(!this.t){ this.t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.t);
      const px = new Uint8Array(64 * 48 * 4); for(let i = 0; i < px.length; i += 4){ px[i] = 200; px[i + 1] = 120; px[i + 2] = 40; px[i + 3] = 255; }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 48, 0, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); } return this.t; } };
    const P = new Float32Array([1.2, 0, 0, 0, 0, 2.6, 0, 0, 0, 0, -1, -1, 0, 0, -.1, 0]);
    const sesion = { enabledFeatures: conXR === 'variant' ? ['local', 'local-floor'] : ['local', 'local-floor', 'camera-access'], oyentes: {},   /* el App Clip no da camera-access */
      updateRenderState(){}, async requestReferenceSpace(t){ return { tipo: t }; },
      requestAnimationFrame(f){ return requestAnimationFrame((t) => f(t, { getViewerPose: () => ({ transform: { position: { x: __xr.pos[0], y: __xr.pos[1], z: __xr.pos[2] }, orientation: { x: __xr.q[0], y: __xr.q[1], z: __xr.q[2], w: __xr.q[3] } },
        views: [{ projectionMatrix: P, camera: { width: 640, height: 480 } }] }) }) || window.__trasCuadroXR?.()); },
      addEventListener(e, f){ this.oyentes[e] = f; }, end(){ this.oyentes.end?.(); } };
    window.__xr.sesion = sesion;
    Object.defineProperty(navigator, 'xr', { value: { isSessionSupported: async (m) => m === 'immersive-ar', requestSession: async () => { __xr.pedidos++; return sesion; } } });
  }, conXR);
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if(m.type() === 'error' && !/favicon|getUserMedia|Requested device|NotFound|Permission|404/i.test(m.text())) errores.push(m.text()); });
  await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  return { p, errores, ctx };
}
/* con ARCore */
{ const { p, errores } = await abrir(true);
  sí(await p.evaluate(() => document.getElementById('eAR').textContent === 'ARCore'), 'en la entrada se ve que el teléfono tiene ARCore');
  await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 20000 });
  await p.waitForTimeout(800);
  sí(await p.evaluate(() => __xr.pedidos === 1 && __vr.ar.activo), 'al tocar Entrar se abre la sesión de ARCore (de fábrica)');
  const c0 = await p.evaluate(() => __vr.cabeza.position.toArray());
  await p.evaluate(() => { __xr.pos = [.4, 1.5, -1]; }); await p.waitForTimeout(400);
  const c1 = await p.evaluate(() => __vr.cabeza.position.toArray());
  sí(Math.abs(c0[0]) < 1e-6 && Math.abs(c1[0] - .4) < 1e-6 && Math.abs(c1[2] + 1) < 1e-6, `caminar 1 m al frente y 40 cm a la derecha mueve la cabeza igual (6DoF: ${c1.map((v) => v.toFixed(2)).join(', ')})`);
  await p.evaluate(() => { const a = Math.PI / 4; __xr.q = [0, Math.sin(a / 2), 0, Math.cos(a / 2)]; }); await p.waitForTimeout(300);
  sí(await p.evaluate(() => Math.abs(new __vr.THREE.Euler().setFromQuaternion(__vr.cabeza.quaternion, 'YXZ').y - Math.PI / 4) < 1e-4), 'girar 45° gira la cabeza 45° (la orientación también es de ARCore)');
  sí(await p.evaluate(() => __vr.ar.camaraVista && __vr.hayCamara() && __vr.ar.tex?.isExternalTexture), 'la imagen de la cámara de ARCore llega como textura (para la mixta)');
  sí(await p.evaluate(() => Math.abs(__vr.campoCamara() - 2 * Math.atan(1 / 1.2) * 180 / Math.PI) < .01), `el campo de la cámara sale de la proyección de ARCore (${(await p.evaluate(() => __vr.campoCamara())).toFixed(1)}°)`);
  await p.waitForFunction(() => __vr.fuenteManos.activa, null, { timeout: 5000 }).catch(() => {});
  const px = await p.evaluate(() => { const F = __vr.fuenteManos; if(!F.activa) return null; const d = F.canvas.getContext('2d').getImageData(F.videoWidth / 2, F.videoHeight / 2, 1, 1).data; return [...d]; });
  sí(px && Math.abs(px[0] - 200) < 30 && Math.abs(px[1] - 120) < 30, `las manos reciben la cámara de ARCore en chiquito (pixel ${px})`);
  await p.evaluate(() => { __vr.ponerMixta(true); }); await p.waitForTimeout(300);
  sí(await p.evaluate(() => !__vr.cuarto.visible), 'la realidad mixta se prende con la cámara de ARCore');
  sí(await p.evaluate(() => getComputedStyle(__vr.render.domElement).visibility === 'hidden' && document.documentElement.classList.contains('en-ar')), 'durante AR el lienzo de la página se esconde (pinta la sesión) y la página va de capa encima');
  /* salir de la sesión: regresa el modo de siempre */
  await p.evaluate(() => __xr.sesion.end()); await p.waitForTimeout(600);
  const n0 = await p.evaluate(() => __vr.cabeza.quaternion.toArray().join());
  sí(await p.evaluate(() => !__vr.ar.activo && getComputedStyle(__vr.render.domElement).visibility !== 'hidden' && !__vr.fuenteManos.activa), 'al salir de AR el visor sigue con su modo de siempre');
  const f0 = await p.evaluate(() => { window.__cuadros = 0; __vr.alCuadro.push(() => window.__cuadros++); return 0; }); await p.waitForTimeout(800);
  sí(await p.evaluate(() => window.__cuadros > 2), 'y el ciclo sigue corriendo (lo marca otra vez la ventana)');
  sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : '')); }
/* el iPhone con el App Clip de Variant (27 nov): la capa no tiene búfer propio; lo que se ve encima de la cámara es el LIENZO */
{ const { p, errores } = await abrir('variant');
  await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 20000 }); await p.waitForTimeout(800);
  sí(await p.evaluate(() => __vr.ar.activo && __vr.ar.enLienzo && getComputedStyle(__vr.render.domElement).visibility !== 'hidden'), 'con el App Clip del iPhone el lienzo NO se esconde (es lo que se ve encima de la cámara)');
  /* se lee el lienzo justo después de pintar el cuadro (antes de que el navegador lo presente y lo borre) */
  const px = await p.evaluate(() => new Promise((ok) => { window.__trasCuadroXR = () => { window.__trasCuadroXR = null; const c = __vr.render.domElement, g = __vr.render.getContext(); const b = new Uint8Array(4);
    g.bindFramebuffer(g.FRAMEBUFFER, null); g.readPixels(c.width >> 2, c.height >> 1, 1, 1, g.RGBA, g.UNSIGNED_BYTE, b); ok([...b]); }; }));
  sí(px[3] > 0 && px[0] + px[1] + px[2] > 0, `y Mazi VR se pinta en el lienzo (pixel ${px})`);
  await p.waitForTimeout(800);
  const cam = await p.evaluate(() => ({ vista: __vr.ar.camaraVista, n: __vr.ar.camaraVariant?.(), manos: __vr.fuenteManos.activa && __vr.fuenteManos.videoWidth, tex: __vr.ar.texVariant?.image?.width }));
  sí(cam.vista && cam.n?.pintados >= 3 && cam.manos === 320 && cam.tex === 64, `la cámara del App Clip llega cuadro por cuadro a la realidad mixta y a las manos (${JSON.stringify(cam)})`);
  await p.waitForFunction(() => window.__manos?.listo, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1500);   /* MediaPipe tarda en cargar y frena todo mientras */
  const p0 = await p.evaluate(() => __vr.ar.camaraVariant().pintados); await p.waitForTimeout(5000); const p1 = await p.evaluate(() => __vr.ar.camaraVariant().pintados);
  /* (este navegador sin tarjeta gráfica, con MediaPipe corriendo, va lentísimo: se pide poco, pero que NO se quede quieto) */
  sí(p1 - p0 >= 3, `y SIGUE llegando aunque el App Clip pierda pedidos (${p1 - p0} cuadros nuevos en 5 s; ${JSON.stringify(await p.evaluate(() => [__vr.ar.camaraVariant(), __cam]))})`);
  await p.evaluate(() => { __vr.ponerMixta(true); }); await p.waitForTimeout(300);
  sí(await p.evaluate(() => !__vr.cuarto.visible), 'y la realidad mixta se prende con esa cámara');
  sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : '')); }
/* sin ARCore: como siempre */
{ const { p, errores } = await abrir(false);
  sí(await p.evaluate(() => document.getElementById('eAR').textContent === 'Sin ARCore'), 'sin ARCore la entrada lo dice');
  await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 20000 });
  sí(await p.evaluate(() => !__vr.ar.activo), 'y se entra con el modo de siempre');
  sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : '')); }
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
