/* MAZI VR · MÚSICA (Carlos, 18 nov: «mete un menú de música»). Sin internet: el directorio de radios, la estación, la
   búsqueda de La Sala y el reproductor de YouTube son de mentiras. Comprueba que Música sale en el inicio, que Radio trae
   sólo estaciones con dirección segura, que una suena, se pausa y sigue, que la música sigue al salir a otra parte, que
   las canciones del teléfono suenan y que una de YouTube se pone en el reproductor escondido.
     node vr/pruebas-musica.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const WAV = fs.readFileSync(new URL('./sonidos/ding.wav', import.meta.url));
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => []; try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false })); }catch{} });
const cors = { 'access-control-allow-origin': '*' };
await ctx.route(/radio-browser\.info/, (r) => r.fulfill({ headers: cors, json: [
  { name: 'Radio Uno ', url_resolved: 'https://radio.prueba/uno', state: 'Querétaro', tags: 'pop,rock' },
  { name: 'Radio Insegura', url_resolved: 'http://radio.prueba/dos', state: 'CDMX', tags: '' },
  { name: 'Radio Tres', url_resolved: 'https://radio.prueba/tres', state: 'Jalisco', tags: 'banda' }] }));
await ctx.route(/sala\.palomazi9111\.workers\.dev\/api\/sala\/vr\/buscar/, (r) => r.fulfill({ headers: cors, json: { bien: true, videos: [
  { id: 'ccccccccccc', titulo: 'Éxito uno', canal: 'Canal', dura: '3:20' }, { id: 'ddddddddddd', titulo: 'En vivo', canal: 'Radio', dura: '', envivo: true }, { id: 'eeeeeeeeeee', titulo: 'Éxito dos', canal: 'Canal', dura: '4:01' }] } }));
await ctx.route(/radio\.prueba/, (r) => r.fulfill({ headers: cors, body: WAV, contentType: 'audio/wav' }));
await ctx.route(/youtube\.com\/iframe_api/, (r) => r.fulfill({ contentType: 'text/javascript', body: `
  window.YT = { Player: function(el, o){ const d = document.createElement('div'); d.className = 'yt-musica'; d.dataset.id = o.videoId; el.replaceWith(d);
    let est = -1; this.getPlayerState = () => est; this.playVideo = () => { est = 1; }; this.pauseVideo = () => { est = 2; }; this.stopVideo = () => { est = 0; };
    this.loadVideoById = (id) => { d.dataset.id = id; est = 1; }; this.setVolume = () => {}; setTimeout(() => o.events?.onReady?.({ target: this }), 30); } };
  setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 10);` }));
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' });
/* una canción del teléfono, como si se eligiera en la entrada */
await p.setInputFiles('#iVideos', { name: 'Mi canción.wav', mimeType: 'audio/wav', buffer: WAV });
sí((await p.textContent('#eVideos')).includes('1 canción'), `la entrada cuenta la canción (${await p.textContent('#eVideos')})`);
await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });
await p.evaluate(() => __vr.ir('musica')); await p.evaluate(() => __musica.armado); await p.waitForTimeout(300);
sí(await p.evaluate(() => __vr.ahora()) === 'musica', 'Música abre');
await p.evaluate(() => __musica.radio()); await p.waitForTimeout(500);
let e = await p.evaluate(() => __musica.estado());
sí(e.fase === 'resultados' && e.tarjetas === 2, `Radio trae sólo las estaciones seguras (${e.tarjetas} de 3)`);
await p.screenshot({ path: CAPS + '/vr-musica-radio.png' });
await p.evaluate(() => __musica.elegir(0)); await p.waitForTimeout(800);
e = await p.evaluate(() => __musica.estado());
sí(e.sonando && e.tipo === 'radio' && e.audio.src === 'uno' && !e.audio.pausado, `una estación suena (${e.titulo}, ${e.audio.src})`);
await p.evaluate(() => __musica.pausa()); await p.waitForTimeout(200); e = await p.evaluate(() => __musica.estado());
sí(!e.sonando && e.audio.pausado, 'Pausa la detiene');
await p.evaluate(() => __musica.pausa()); await p.waitForTimeout(300); e = await p.evaluate(() => __musica.estado());
sí(e.sonando && !e.audio.pausado, 'y Seguir la regresa');
await p.evaluate(() => __vr.ir('inicio')); await p.waitForTimeout(400); e = await p.evaluate(() => __musica.estado());
sí(e.sonando && !e.audio.pausado, 'sigue sonando al salir al inicio');
await p.evaluate(() => __vr.ir('musica')); await p.waitForTimeout(200);
await p.evaluate(() => __musica.atras()); await p.waitForTimeout(200);
await p.evaluate(() => { const c = __musica.elegibles().find((m) => m.userData.panel?.titulo === 'Mis canciones'); c.userData.accion(); }); await p.waitForTimeout(300);
await p.evaluate(() => __musica.elegir(0)); await p.waitForTimeout(600); e = await p.evaluate(() => __musica.estado());
sí(e.tipo === 'archivo' && e.titulo === 'Mi canción' && !e.audio.pausado, `las canciones del teléfono suenan (${e.titulo})`);
/* una de YouTube (lo que daría «Buscar») */
await p.evaluate(() => __musica.mostrar([{ tipo: 'youtube', id: 'aaaaaaaaaaa', titulo: 'Canción de prueba', sub: 'Canal' }, { tipo: 'youtube', id: 'bbbbbbbbbbb', titulo: 'Otra', sub: '' }]));
await p.evaluate(() => __musica.elegir(0)); await p.waitForTimeout(800);
e = await p.evaluate(() => ({ ...__musica.estado(), yt: document.querySelector('.yt-musica')?.dataset.id }));
sí(e.tipo === 'youtube' && e.yt === 'aaaaaaaaaaa' && e.audio.pausado, `una de YouTube va al reproductor escondido y la radio se calla (${e.yt})`);
await p.evaluate(() => window.__vr.control); /* siguiente con R1 no hay control: se llama directo */
await p.evaluate(() => __musica.tocar(1)); await p.waitForTimeout(300);
e = await p.evaluate(() => document.querySelector('.yt-musica')?.dataset.id); sí(e === 'bbbbbbbbbbb', 'Siguiente pone la que sigue');
await p.screenshot({ path: CAPS + '/vr-musica.png' });
/* Explorar: géneros de un toque que empiezan a sonar solos */
await p.evaluate(() => __musica.explorar()); await p.waitForTimeout(400); e = await p.evaluate(() => __musica.estado());
sí(e.fase === 'resultados' && e.tarjetas === 12, `Explorar enseña los géneros (${e.tarjetas})`);
await p.screenshot({ path: CAPS + '/vr-musica-explorar.png' });
await p.evaluate(() => __musica.elegir(0)); await p.waitForTimeout(900);
e = await p.evaluate(() => ({ ...__musica.estado(), yt: document.querySelector('.yt-musica')?.dataset.id }));
sí(e.tipo === 'youtube' && e.sonando && e.cola > 0 && e.yt, `un género arma la lista y suena solo (${e.cola} en cola, ${e.titulo})`);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
