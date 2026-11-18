/* MAZI VR · el cine de punta a punta, sin internet: YouTube (La Sala y el reproductor, de mentiras), Internet Archive
   (búsqueda, metadatos y un .mp4 nuestro) y un enlace. Comprueba que el teclado escribe, que los resultados salen como
   tarjetas, que la pantalla de la web se monta con una copia por ojo encima de la pantalla 3D y que Círculo la cierra.
     node vr/pruebas-cine.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module'; import fs from 'fs'; import { execSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const MP4 = '/tmp/mazivr-prueba.webm';   // VP9: el Chromium de las pruebas no trae H.264 (el iPhone sí)
if(!fs.existsSync(MP4)) execSync(`ffmpeg -v error -y -f lavfi -i testsrc=s=320x180:r=15 -f lavfi -i sine=f=440 -t 4 -c:v libvpx-vp9 -b:v 200k -c:a libopus -shortest ${MP4}`);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { window.__pad = { id: 'Wireless Controller', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__pad]; });
/* lo de fuera, de mentiras */
await ctx.route(/sala\.palomazi9111\.workers\.dev\/api\/sala\/vr\/buscar/, (r) => r.fulfill({ json: { bien: true, videos: [
  { id: 'aaaaaaaaaaa', titulo: 'Tráiler de prueba uno', canal: 'Canal', dura: '2:10', mini: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg' },
  { id: 'bbbbbbbbbbb', titulo: 'Tráiler dos', canal: 'Otro', dura: '1:05', mini: 'https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg' }] }, headers: { 'access-control-allow-origin': '*' } }));
await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ body: PNG, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
await ctx.route(/youtube\.com\/iframe_api/, (r) => r.fulfill({ contentType: 'text/javascript', body: `
  window.YT = { Player: function(el, o){ const d = document.createElement('div'); d.className = 'yt-falso'; d.dataset.id = o.videoId; d.style.cssText = 'width:1280px;height:720px;background:#a00'; el.replaceWith(d);
    let t = 0, est = 1; this.getPlayerState = () => est; this.getCurrentTime = () => t; this.playVideo = () => { est = 1; }; this.pauseVideo = () => { est = 2; }; this.seekTo = (s) => { t = s; };
    this.mute = () => {}; this.unMute = () => {}; this.destroy = () => d.remove(); setTimeout(() => o.events?.onReady?.({ target: this }), 50); } };
  setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 10);` }));
await ctx.route(/archive\.org\/advancedsearch/, (r) => r.fulfill({ json: { response: { docs: [{ identifier: 'peli_libre', title: 'Película libre de prueba', year: '1922' }] } }, headers: { 'access-control-allow-origin': '*' } }));
await ctx.route(/archive\.org\/metadata/, (r) => r.fulfill({ json: { files: [{ name: 'peli_512kb.mp4', format: '512Kb MPEG4' }, { name: 'peli.mp4', format: 'h.264' }, { name: 'peli_original.mp4', format: 'MPEG4' }] }, headers: { 'access-control-allow-origin': '*' } }));
await ctx.route(/archive\.org\/download/, (r) => r.fulfill({ body: fs.readFileSync(MP4), contentType: 'video/webm' }));
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const boton = async (i) => { await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(80); await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(160); };
const X = 0, O = 1, IZQ = 14, DER = 15;
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar'); await p.waitForTimeout(1500);
await p.evaluate(() => __vr.ir('cine')); await p.waitForTimeout(400);
/* la primera puerta (YouTube): flechas a la izquierda hasta el tope y X */
for(let i = 0; i < 4; i++) await boton(IZQ);
await boton(X); await p.waitForTimeout(300);
sí(await p.evaluate(() => __vr.ahora()) === 'teclado', 'YouTube abre el teclado');
await p.evaluate(() => __teclado.escribir('trailer'));
await p.keyboard.type(' 2026');                         // y un teclado de verdad también escribe
await p.screenshot({ path: CAPS + '/vr-teclado.png' });
await p.evaluate(() => __teclado.escribir('')); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
sí(await p.evaluate(() => __vr.ahora()) === 'cine', 'Enter manda y regresa al cine');
let e = await p.evaluate(() => __cine.estado()); sí(e.fase === 'resultados' && e.tarjetas === 2, `salen los resultados (${e.tarjetas} tarjetas)`);
await p.waitForTimeout(300); await p.screenshot({ path: CAPS + '/vr-resultados.png' });
for(let i = 0; i < 4; i++) await boton(IZQ);
await boton(X); await p.waitForTimeout(900);
e = await p.evaluate(() => __cine.estado()); sí(e.fase === 'viendo' && e.web === 'youtube', 'elegir un resultado lo pone en la pantalla (YouTube)');
const copias = await p.evaluate(() => [...document.querySelectorAll('.yt-falso')].map((d) => getComputedStyle(d.parentElement).transform));
sí(copias.length === 2 && copias.every((t) => t.startsWith('matrix3d') || t.startsWith('matrix(')), 'una copia por ojo, acomodada en 3D sobre la pantalla' + ' ' + JSON.stringify(copias).slice(0, 160));
await p.screenshot({ path: CAPS + '/vr-youtube.png' });
await boton(X); await p.waitForTimeout(200);
sí(await p.evaluate(() => __web.estado.modo === 'youtube'), 'X pausa sin cerrar');
await boton(O); await p.waitForTimeout(300);
e = await p.evaluate(() => ({ ...__cine.estado(), yt: !!document.querySelector('.yt-falso') })); sí(e.fase === 'estante' && !e.web && !e.yt, 'Círculo cierra y regresa al estante');
/* películas libres (segunda puerta) */
for(let i = 0; i < 4; i++) await boton(IZQ); await boton(DER); await boton(X); await p.waitForTimeout(300);
await p.evaluate(() => __teclado.escribir('nosferatu')); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
e = await p.evaluate(() => __cine.estado()); sí(e.fase === 'resultados' && e.tarjetas === 1, 'Internet Archive da resultados');
await boton(IZQ); await boton(X); await p.waitForTimeout(1500);
const vid = await p.evaluate(() => ({ modo: __web.estado.modo, srcs: [...document.querySelectorAll('video')].map((v) => v.currentSrc).filter((s) => s.includes('archive')), corre: [...document.querySelectorAll('video')].some((v) => v.currentTime > 0) }));
sí(vid.modo === 'video' && vid.srcs.length === 2 && vid.srcs.every((s) => s.endsWith('peli.mp4')), 'abre la copia H.264 (ni la de 512kb ni el original que el iPhone no abre) en los dos ojos');
sí(vid.corre, 'el video corre');
await p.screenshot({ path: CAPS + '/vr-archivo.png' });
await boton(O); await p.waitForTimeout(300);
/* un enlace (tercera puerta) */
for(let i = 0; i < 4; i++) await boton(IZQ); await boton(DER); await boton(DER); await boton(X); await p.waitForTimeout(300);
await p.evaluate(() => __teclado.escribir('youtu.be/ccccccccccc')); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
sí(await p.evaluate(() => __web.estado.modo === 'youtube' && !!document.querySelector('.yt-falso[data-id="ccccccccccc"]')), 'un enlace de YouTube abre YouTube');
await boton(O); await p.waitForTimeout(300);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
