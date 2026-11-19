/* LA CÁMARA DE LA MIXTA NO SE CONGELA (Carlos, 19 nov: «la realidad mixta anda valiendo verga», fondo negro).
   Se simula el iPhone que nunca avisa de cuadros nuevos (requestVideoFrameCallback que no llama): la cámara de pruebas
   se mueve sola, así que dos fotos separadas deben salir DISTINTAS y no negras.
     node vr/pruebas-camara-mixta.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
for(const sinAviso of [true, false]){
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
  await ctx.addInitScript((s) => { navigator.getGamepads = () => [];
    if(s) HTMLVideoElement.prototype.requestVideoFrameCallback = function(){ return 0; };   /* el iPhone que nunca avisa */
    try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1, mixta: true })); }catch{} }, sinAviso);
  const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
  await p.waitForFunction(() => window.__vr?.ahora() === 'inicio' && __vr.hayCamara());
  await p.evaluate(() => { __vr.ponerMixta(true); __vr.sim.pitch = -1.1; }); await p.waitForTimeout(1500);   /* abajo: sólo se ve la cámara */
  /* lo que se ve en el lienzo: promedio y diferencia entre dos momentos */
  /* (el lienzo de WebGL no se deja leer directo: se toma la captura de pantalla y se lee en un lienzo 2D) */
  const foto = async () => { const png = (await p.screenshot()).toString('base64');
    return p.evaluate(async (d) => { const im = new Image(); im.src = 'data:image/png;base64,' + d; await im.decode();
      const t = document.createElement('canvas'); t.width = 64; t.height = 32; const x = t.getContext('2d'); x.drawImage(im, 0, 0, 64, 32);
      return [...x.getImageData(0, 0, 64, 32).data]; }, png); };
  const a = await foto(); await p.waitForTimeout(1200); const c2 = await foto();
  const brillo = a.reduce((s, v, i) => i % 4 === 3 ? s : s + v, 0) / (a.length * .75);
  const dif = a.reduce((s, v, i) => s + Math.abs(v - c2[i]), 0) / a.length;
  const nombre = sinAviso ? 'sin aviso de cuadros (iPhone)' : 'con aviso de cuadros';
  sí(brillo > 8, `${nombre}: la cámara se ve, no negra (brillo ${brillo.toFixed(0)})`);
  sí(dif > .5, `${nombre}: la cámara se mueve, no está congelada (cambio ${dif.toFixed(2)})`);
  sí(!errores.length, `${nombre}: sin errores` + (errores.length ? ': ' + errores[0] : ''));
  await ctx.close();
}
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
