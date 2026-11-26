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
    window.__xr = { pedidos: 0, pos: [0, 1.5, 0], q: [0, 0, 0, 1], fin: null };
    WebGL2RenderingContext.prototype.makeXRCompatible = async function(){};   /* el de verdad truena sin aparato XR */
    window.XRWebGLLayer = class { constructor(s, gl){ this.framebuffer = null; this.framebufferWidth = 844; this.framebufferHeight = 390; } };
    /* la «cámara de ARCore»: una textura de 64×48 llena de un color, en el mismo contexto */
    window.XRWebGLBinding = class { constructor(s, gl){ this.gl = gl; } getCameraImage(){ const gl = this.gl; if(!this.t){ this.t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.t);
      const px = new Uint8Array(64 * 48 * 4); for(let i = 0; i < px.length; i += 4){ px[i] = 200; px[i + 1] = 120; px[i + 2] = 40; px[i + 3] = 255; }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 48, 0, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); } return this.t; } };
    const P = new Float32Array([1.2, 0, 0, 0, 0, 2.6, 0, 0, 0, 0, -1, -1, 0, 0, -.1, 0]);
    const sesion = { enabledFeatures: ['local', 'local-floor', 'camera-access'], oyentes: {},
      updateRenderState(){}, async requestReferenceSpace(t){ return { tipo: t }; },
      requestAnimationFrame(f){ return requestAnimationFrame((t) => f(t, { getViewerPose: () => ({ transform: { position: { x: __xr.pos[0], y: __xr.pos[1], z: __xr.pos[2] }, orientation: { x: __xr.q[0], y: __xr.q[1], z: __xr.q[2], w: __xr.q[3] } },
        views: [{ projectionMatrix: P, camera: { width: 640, height: 480 } }] }) })); },
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
/* sin ARCore: como siempre */
{ const { p, errores } = await abrir(false);
  sí(await p.evaluate(() => document.getElementById('eAR').textContent === 'Sin ARCore'), 'sin ARCore la entrada lo dice');
  await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 20000 });
  sí(await p.evaluate(() => !__vr.ar.activo), 'y se entra con el modo de siempre');
  sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : '')); }
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
