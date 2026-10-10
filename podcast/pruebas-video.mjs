#!/usr/bin/env node
/* ESTUDIO · el modo VIDEO en un navegador de verdad.
   Se fabrica en la propia página un video de prueba —pantalla verde con un
   tono que suena en ráfagas y DOS pausas de 3 segundos— y se le pasa al
   estudio como si fuera de la cámara. Se comprueba lo que vería Carlos:
   que el clip entra, que «Ver cuánto queda» quita las pausas, que el video
   exportado dura entrada + lo hablado + cierre (no lo grabado), que al
   principio sale la entrada y luego la imagen del clip, y que la miniatura y
   los nombres se bajan.
   Correr:  python3 -m http.server 8781 &   node podcast/pruebas-video.mjs [http://localhost:8781] */
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8781';
let bien = 0, mal = 0;
const ok = (q, c, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + q + (!c && extra != null ? ' · ' + extra : '')); c ? bien++ : mal++; };

const px = /^https:/.test(BASE) && process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  ...(px ? { proxy: { server: `${px.protocol}//${px.host}`, username: decodeURIComponent(px.username), password: decodeURIComponent(px.password) } } : {}) });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, hasTouch: true, ignoreHTTPSErrors: !!px });
await ctx.grantPermissions(['camera', 'microphone'], { origin: new URL(BASE).origin }).catch(() => {});
const pg = await ctx.newPage(); const errores = [];
pg.on('dialog', d => d.accept());
pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => { if(m.type() === 'error') errores.push(m.text()); });
await pg.goto(BASE + '/podcast/'); await pg.waitForFunction(() => window.ESTUDIO && window.ESTUDIO.listo);

console.log('\n0 · fabricar el video de prueba (12 s: 3 habla · 3 silencio · 3 habla · 3 silencio)');
const b64 = await pg.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d');
  const ac = new AudioContext(), dest = ac.createMediaStreamDestination(), osc = ac.createOscillator(), gn = ac.createGain();
  osc.frequency.value = 220; osc.connect(gn).connect(dest); gn.gain.value = 0; osc.start();
  const t0 = ac.currentTime + 0.1;
  /* en cada pausa el tono se APAGA: a 0.05 seguiría siendo voz para el estudio (−29 dB) */
  for(const [a, b] of [[0, 3], [6, 9]]){ for(let s = a; s < b; s += 0.25){ gn.gain.setValueAtTime(0.5, t0 + s); gn.gain.setValueAtTime(0.05, t0 + s + 0.18); } gn.gain.setValueAtTime(0, t0 + b); }
  const flujo = new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(flujo, { mimeType: 'video/webm' }), tr = []; rec.ondataavailable = e => tr.push(e.data);
  const fin = new Promise(r => rec.onstop = r); rec.start();
  const ini = performance.now();
  await new Promise(r => { const p = () => { const t = (performance.now() - ini) / 1000; g.fillStyle = '#00C800'; g.fillRect(0, 0, 320, 180);
    g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.fillText(t.toFixed(1), 20, 100); if(t < 12.2) requestAnimationFrame(p); else r(); }; p(); });
  rec.stop(); await fin; ac.close();
  const buf = new Uint8Array(await new Blob(tr, { type: 'video/webm' }).arrayBuffer());
  let s = ''; for(let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
});
ok('se fabricó el video de prueba', b64.length > 10000, b64.length);

console.log('\n0b · Radio Divergentes viene puesto');
ok('el nombre del podcast ya dice Radio Divergentes', await pg.inputValue('#pNombre') === 'Radio Divergentes');
ok('con la paloma de logo', await pg.getAttribute('[data-logo="divergentes"]', 'aria-pressed') === 'true');
ok('y los colores Divergentes', await pg.getAttribute('[data-tema="divergentes"]', 'aria-checked') === 'true');
ok('los 12 episodios en el orden del pizarrón, en dos semanas', await pg.locator('.ep').count() === 12 && await pg.locator('.semana-t').count() >= 2);
await pg.click('[data-ep="5"]');
ok('tocar «Chernóbil» pone episodio 5 y su título', await pg.inputValue('#pEpisodio') === '5' && await pg.inputValue('#pTitulo') === 'Chernóbil');
const g = await pg.textContent('#epGuion');
ok('y enseña su escaleta de 30 minutos con el dilema', /24:00/.test(g) && /El dilema/.test(g) && /verdad o evitar el pánico/.test(g));
const pinta = await pg.evaluate(() => { const c = document.querySelector('#cvLogo'), d = c.getContext('2d').getImageData(0, 0, 160, 160).data;
  let claros = 0; for(let i = 0; i < d.length; i += 4) if(d[i] > 180 && d[i + 1] > 170) claros++; return claros; });
ok('la paloma se dibuja (trazos claros sobre el fondo)', pinta > 300, pinta);

console.log('\n1 · el clip entra');
ok('el modo video viene de entrada', await pg.evaluate(() => document.body.classList.contains('modo-video')));
await pg.setInputFiles('#fVideos', { name: 'charla.webm', mimeType: 'video/webm', buffer: Buffer.from(b64, 'base64') });
await pg.waitForSelector('#listaClips .pedazo', { timeout: 20000 });
const dur = await pg.evaluate(() => window.ESTUDIO.clips()[0].dur);
ok('aparece con su duración (~12 s)', dur > 11 && dur < 13.5, dur.toFixed(2));
ok('con su miniatura', await pg.evaluate(() => !!document.querySelector('#listaClips img.clip-mini')));

console.log('\n2 · edición');
await pg.click('#bPlanear');
await pg.waitForSelector('#resPlan:not([hidden])');
const pl = await pg.evaluate(() => window.ESTUDIO.plan());
ok('las pausas de 3 s se van: quedan ~7 s de 12', pl.total > 5.5 && pl.total < 8.5, pl.total.toFixed(2));
ok('en dos tramos (o tres)', pl.tramos.length >= 2 && pl.tramos.length <= 3, pl.tramos.length);
await pg.click('[data-formato="horizontal"]');

console.log('\n2b · editar el clip a mano');
await pg.click('#listaClips [data-vacc="edita"]');
await pg.waitForSelector('#editor:not([hidden])');
await pg.waitForFunction(() => document.querySelector('#edVideo').readyState >= 1, null, { timeout: 10000 });
const fija = async (t) => { await pg.evaluate((t) => { const v = document.querySelector('#edVideo'); v.pause(); v.currentTime = t; }, t);
  await pg.waitForFunction((t) => Math.abs(document.querySelector('#edVideo').currentTime - t) < 0.3, t, { timeout: 8000 }).catch(() => {}); };
await fija(1); await pg.click('#edIni');
await fija(6.5); await pg.click('#edCorte');
ok('el botón cambia a «Hasta aquí» mientras se marca', await pg.waitForFunction(() => /Hasta aquí/.test(document.querySelector('#edCorte').textContent), null, { timeout: 3000 }).then(() => true, () => false));
await fija(7.5); await pg.click('#edCorte');
await pg.waitForTimeout(100);
ok('aparece el pedazo que se quita (6.5 – 7.5)', await pg.evaluate(() => { const c = window.ESTUDIO.editor().cortes; return c.length === 1 && Math.abs(c[0][0] - 6.5) < 0.3 && Math.abs(c[0][1] - 7.5) < 0.3; }) && /Se quita/.test(await pg.textContent('#edCortes')), await pg.textContent('#edCortes'));
const linea = await pg.evaluate(() => { const c = document.querySelector('#edLinea'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let pinta = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 0) pinta++; return pinta; });
ok('la línea de tiempo dibuja la onda y lo que se va', linea > 500, linea);
await pg.click('#edSugerencias [data-cartel="Bloque 1"]');
ok('la sugerencia llena el cartel', await pg.inputValue('#edCartel') === 'Bloque 1');
await pg.click('#edListo');
ok('el editor se cierra', await pg.waitForSelector('#editor', { state: 'hidden', timeout: 5000 }).then(() => true, () => false));
const etq = await pg.textContent('#listaClips .pedazo');
ok('el clip enseña sus etiquetas: recortado, pedazo fuera y cartel', /Recortado/.test(etq) && /1 pedazo fuera/.test(etq) && /Cartel: Bloque 1/.test(etq), etq);
await pg.click('#bPlanear');
const pl2 = await pg.evaluate(() => window.ESTUDIO.plan());
ok('el plan pierde lo recortado (~2 s menos)', pl2.total < pl.total - 1.3 && pl2.total > pl.total - 2.7, pl.total.toFixed(2) + ' → ' + pl2.total.toFixed(2));
ok('y el cartel va antes del clip', pl2.orden[0].tipo === 'cartel' && pl2.orden[0].texto === 'Bloque 1' && pl2.carteles === 1);
ok('ningún tramo cae en lo quitado', pl2.tramos.every(t => t.a >= 0.99 && (t.b <= 6.55 || t.a >= 7.45)), JSON.stringify(pl2.tramos));

console.log('\n3 · entrada, nombres y exportar');
await pg.fill('#pNombre', 'Voces del 3.1'); await pg.fill('#pEpisodio', '2'); await pg.fill('#pTitulo', 'La comida de la cooperativa');
await pg.click('[data-largo="6"]');
await pg.click('#bMasNombre');
await pg.fill('#listaNombres input[data-n="nombre"]', 'Ana Pérez'); await pg.fill('#listaNombres input[data-n="rol"]', 'Conduce');
await pg.fill('#listaNombres input[data-n="en"]', '1');
await pg.click('[data-alto="0"]');
const t0 = Date.now();
await pg.click('#bExportar');
await pg.waitForSelector('#finalV:not([hidden])', { timeout: 120000 });
const tard = (Date.now() - t0) / 1000;
const info = await pg.evaluate(async () => {
  const b = window.ESTUDIO.video(), v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(b);
  await new Promise(r => v.onloadedmetadata = r);
  if(!Number.isFinite(v.duration)){ v.currentTime = 1e7; await new Promise(r => { v.ontimeupdate = r; setTimeout(r, 3000); }); }
  const d = v.duration; v.currentTime = 0;
  const muestra = async (t) => { v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); });
    const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 64, 36);
    return Array.from(g.getImageData(40, 30, 1, 1).data.slice(0, 3)); };
  const enEntrada = await muestra(2.5), enCartel = await muestra(7.2), enClip = await muestra(13);
  return { d, size: b.size, tipo: b.type, w: v.videoWidth, h: v.videoHeight, enEntrada, enCartel, enClip };
});
ok('sale un video (' + info.tipo + ', ' + (info.size / 1024).toFixed(0) + ' KB)', info.size > 50000);
ok('de 1280 × 720', info.w === 1280 && info.h === 720, info.w + 'x' + info.h);
ok('dura entrada + cartel + lo hablado + cierre (~6 + 2.5 + ~5 + ~6), no lo grabado', info.d > 15 && info.d < 24, info.d.toFixed(1));
ok('tardó lo que dura (se graba en tiempo real)', tard > info.d * 0.8 && tard < info.d * 3 + 20, tard.toFixed(0) + ' s');
const verde = ([r, g, b]) => g > 150 && r < 90 && b < 90;
ok('a los 2.5 s se ve la entrada, no el clip', !verde(info.enEntrada), JSON.stringify(info.enEntrada));
ok('a los 7 s, el cartel (no el clip)', !verde(info.enCartel), JSON.stringify(info.enCartel));
ok('a los 13 s ya se ve el clip (verde)', verde(info.enClip), JSON.stringify(info.enClip));
const [dV] = await Promise.all([pg.waitForEvent('download'), pg.click('#bBajarVideo')]);
ok('el video se baja con el nombre del podcast', /^voces-del-3-1-ep2\.(mp4|webm)$/.test(dV.suggestedFilename()), dV.suggestedFilename());
if(process.env.CAPTURAS) await dV.saveAs(process.env.CAPTURAS + '/final.' + dV.suggestedFilename().split('.').pop());

console.log('\n4 · miniatura y nombres');
const [dMini] = await Promise.all([pg.waitForEvent('download'), pg.click('#bMini')]);
const jpg = fs.readFileSync(await dMini.path());
let lado = ''; for(let i = 2; i < jpg.length - 9; i++){ if(jpg[i] === 0xFF && (jpg[i + 1] === 0xC0 || jpg[i + 1] === 0xC2)){ lado = jpg.readUInt16BE(i + 7) + 'x' + jpg.readUInt16BE(i + 5); break; } }
ok('la miniatura para YouTube mide 1280 × 720', lado === '1280x720', lado);
await pg.click('.kit summary');
const [dN] = await Promise.all([pg.waitForEvent('download'), pg.click('#bKitNombres')]);
const png = fs.readFileSync(await dN.path());
ok('el nombre sale como PNG transparente para CapCut', png[1] === 0x50 && png[2] === 0x4E && dN.suggestedFilename() === 'nombre-ana-perez.png', dN.suggestedFilename());

console.log('\n5 · recargar');
await pg.reload(); await pg.waitForFunction(() => window.ESTUDIO && window.ESTUDIO.listo && window.ESTUDIO.clips().length === 1, null, { timeout: 20000 }).catch(() => {});
ok('el clip sigue ahí', await pg.locator('#listaClips .pedazo').count() === 1);
ok('y la persona de los nombres', await pg.inputValue('#listaNombres input[data-n="nombre"]').catch(() => '') === 'Ana Pérez');
ok('y su edición y su cartel', await pg.evaluate(() => { const c = window.ESTUDIO.clips()[0]; return c.cartel === 'Bloque 1' && c.edicion && c.edicion.ini === 1 && c.edicion.cortes.length === 1; }));

console.log('\n5b · la cabina: grabar aquí con el guion encima');
await pg.click('[data-ep="5"]');
await pg.click('#bCabina');
await pg.waitForSelector('#cabina:not([hidden])');
await pg.waitForFunction(() => document.querySelector('#cabVista').videoWidth > 0, null, { timeout: 10000 }).catch(() => {});
if(!await pg.evaluate(() => document.querySelector('#cabVista').videoWidth > 0)){
  ok('la cámara se prende (¿la deja `_headers`? Permissions-Policy camera=(self))', false);
  await br.close(); console.log(`\n✗ estudio · video · ${bien} pasan · ${mal} fallan`); process.exit(1);
}
ok('la cámara se prende', await pg.evaluate(() => document.querySelector('#cabVista').videoWidth > 0));
ok('el apuntador enseña el gancho del episodio', /decir la verdad o evitar el pánico/.test(await pg.textContent('#cabApuntador')), await pg.textContent('#cabApuntador'));
await pg.click('#cabApuntador');
ok('tocarlo pasa al Bloque 1', /Bloque 1/.test(await pg.textContent('#cabApuntador')) && /reactor 4/.test(await pg.textContent('#cabApuntador')));
ok('«Me equivoqué» está apagado si no se graba', await pg.isDisabled('#cabError'));
await pg.click('#cabGrabar');
await pg.waitForTimeout(3200);
await pg.click('#cabError');
ok('al tocar «Me equivoqué» avisa que se borra solo', /se borra sola/.test(await pg.textContent('#cabAviso')));
ok('y no se puede cambiar de cámara a media toma', await pg.isDisabled('#cabCamara'));
await pg.waitForTimeout(2200);
const trozos = await pg.evaluate(() => new Promise(si => { const r = indexedDB.open('estudio-podcast'); r.onsuccess = () => { const q = r.result.transaction('cosas').objectStore('cosas').get('grabando'); q.onsuccess = () => si(q.result); }; }));
ok('lo grabado se va guardando en el teléfono mientras graba', trozos && trozos.n >= 1 && trozos.marcas.length === 1, JSON.stringify(trozos && { n: trozos.n, m: trozos.marcas }));
await pg.click('#cabGrabar');
await pg.waitForFunction(() => window.ESTUDIO.clips().length === 2, null, { timeout: 20000 }).catch(() => {});
const toma = await pg.evaluate(() => { const c = window.ESTUDIO.clips()[1]; return c && { dur: c.dur, marcas: c.marcas, nombre: c.nombre }; });
ok('la toma entra como clip 2 (~5 s)', toma && toma.dur > 4 && toma.dur < 7.5, JSON.stringify(toma));
ok('con el error marcado y el nombre del episodio', toma && toma.marcas.length === 1 && toma.marcas[0] > 2.5 && toma.marcas[0] < 4.5 && /^Ep 5 · Toma 2/.test(toma.nombre), JSON.stringify(toma));
await pg.waitForTimeout(500);
ok('y ya no queda nada «a medio guardar»', await pg.evaluate(() => new Promise(si => { const r = indexedDB.open('estudio-podcast'); r.onsuccess = () => { const q = r.result.transaction('cosas').objectStore('cosas').get('grabando'); q.onsuccess = () => si(!q.result); }; })));
await pg.screenshot({ path: process.env.CAPTURAS ? process.env.CAPTURAS + '/cabina.png' : '/dev/null' }).catch(() => {});
await pg.click('#cabCerrar');
ok('la cabina se cierra y apaga la cámara', await pg.isHidden('#cabina') && await pg.evaluate(() => !document.querySelector('#cabVista').srcObject));
ok('el clip enseña «1 error borrado»', /1 error borrado/.test(await pg.locator('#listaClips .pedazo').nth(1).textContent()));
await pg.locator('#listaClips .pedazo').nth(1).locator('[data-vacc="edita"]').click();
await pg.waitForSelector('#editor:not([hidden])');
ok('en el editor sale el error con lo que se quita', /Me equivoqué a los 0:0[2-4] · se quita/.test(await pg.textContent('#edCortes')), await pg.textContent('#edCortes'));
await pg.screenshot({ path: process.env.CAPTURAS ? process.env.CAPTURAS + '/editor.png' : '/dev/null' }).catch(() => {});
await pg.click('#edCerrar');

console.log('\n5c · si se cierra a media toma, se recupera');
await pg.click('#bCabina');
await pg.waitForFunction(() => document.querySelector('#cabVista').videoWidth > 0, null, { timeout: 10000 });
await pg.click('#cabGrabar');
await pg.waitForTimeout(6000);
await pg.reload(); await pg.waitForFunction(() => window.ESTUDIO && window.ESTUDIO.listo, null, { timeout: 30000 });
const rec = await pg.evaluate(() => window.ESTUDIO.clips().map(c => c.nombre));
ok('la toma interrumpida vuelve como clip «recuperada»', rec.length === 3 && /recuperada/.test(rec[2]), JSON.stringify(rec));
ok('y la toma con su error sigue con su marca', await pg.evaluate(() => (window.ESTUDIO.clips()[1].marcas || []).length === 1));

console.log('\n6 · tamaños');
for(const w of [320, 390, 1280]){ await pg.setViewportSize({ width: w, height: 800 }); await pg.waitForTimeout(200);
  const d = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok('nada se sale a ' + w + ' px', d <= 0, d); }
ok('ni un error de consola', !errores.length, errores.join(' | '));

await br.close();
console.log(`\n${mal ? '✗' : '✓'} estudio · video · ${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
