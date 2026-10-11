#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LA PANTALLA DE TURNOS Y LA TABLET (10 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Lo que pidió Carlos, convertido en pruebas con varios aparatos a la vez
   (el mostrador, dos alumnos, la pantalla colgada y la tablet de la fila)
   contra el servidor:

     «el turno que toca en una esquina y en grande un episodio del podcast»
     «un timbre al cambiar de turno o al estar listo y que diga el número»
     «que el número de turno marque qué comida está saliendo»
     «opcional si quiere que se vea su nombre, sólo el pedido o sólo el código»
     «toque la pantalla … haga su pedido … le sale el número de turno»
     «¿quieres pedir algo más? cinco segundos y se cambia otra vez»
     «transiciones para los anuncios … un logo girando, como Televisa»

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-tele.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
import fs from 'fs'; import path from 'path'; import os from 'os'; import vm from 'vm';
const { ok, fallas, aparato, tarda, mostrador, alumno, cerrar, CASA } = await abrirMesa('tele');

/* la pantalla: la voz se apunta en vez de sonar (en el servidor de pruebas no hay bocinas) */
async function pantalla(w = 1280, h = 800){
  const p = await aparato('/fadori/pantalla.html', { w, h });
  await p.addInitScript(() => {});
  await p.evaluate(() => {
    window.__dichos = [];
    if('speechSynthesis' in window) speechSynthesis.speak = (u) => window.__dichos.push(u.text);
  });
  await p.waitForFunction(() => window.TELE && window.TELE.listo, null, { timeout: 15000 });
  return p;
}

/* una canción de 4 s con su etiqueta ID3 (título, artista y carátula), hecha
   aquí con el LAME que ya trae el estudio de podcast */
function cancionDePrueba(){
  const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const ctx = { Math, Int8Array, Int16Array, Int32Array, Uint8Array, Float32Array, Float64Array, Array, Object }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(raiz, 'podcast/vendor/lame-1.2.1.min.js'), 'utf8'), ctx);
  const sr = 44100, n = sr * 4, pcm = new Int16Array(n);
  for(let i = 0; i < n; i++) pcm[i] = Math.round(6000 * Math.sin(2 * Math.PI * 440 * i / sr));
  const enc = new ctx.lamejs.Mp3Encoder(1, sr, 96), out = [];
  for(let i = 0; i < n; i += 1152){ const b = enc.encodeBuffer(pcm.subarray(i, i + 1152)); if(b.length) out.push(Buffer.from(b)); }
  out.push(Buffer.from(enc.flush()));
  const marco = (id, d) => Buffer.concat([Buffer.from(id), Buffer.from([(d.length >>> 24) & 255, (d.length >>> 16) & 255, (d.length >>> 8) & 255, d.length & 255, 0, 0]), d]);
  const cuerpo = Buffer.concat([marco('TIT2', Buffer.concat([Buffer.from([3]), Buffer.from('Canción del recreo')])), marco('TPE1', Buffer.concat([Buffer.from([3]), Buffer.from('Grupo 3.1')])),
    marco('APIC', Buffer.concat([Buffer.from([0]), Buffer.from('image/jpeg'), Buffer.from([0, 3, 0]), fs.readFileSync(path.join(raiz, 'fadori/fotos/agua.jpg'))]))]);
  const L = cuerpo.length;
  const f = path.join(os.tmpdir(), 'fadori-cancion-' + process.pid + '.mp3');
  fs.writeFileSync(f, Buffer.concat([Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, (L >> 21) & 127, (L >> 14) & 127, (L >> 7) & 127, L & 127]), cuerpo, ...out]));
  return f;
}

/* el pad: cada número es un toque, como lo haría el de la cooperativa */
async function teclear(pg, cod, donde = 'dialog.fpad-capa'){
  for(const d of cod) await pg.click(donde + ' .fpad-teclas [data-d="' + d + '"]');
}

const most = await mostrador();
const ana = await alumno('Ana Pérez', '3B');
const beto = await alumno('Beto Ruiz', '2C');
const tv = await pantalla();
await tv.click('#bArranque').catch(() => {});

console.log('\n1 · el turno en la esquina, con lo que pidió y el nombre sólo si quiso');
const pedir = (pg, ver, prods) => pg.evaluate(([v, ps]) => {
  const F = FADORI, disp = F.productos(true).filter(p => p.disponible);
  return F.pedir(F.yo().codigo, ps.map(([i, c]) => ({ prod: disp[i].id, cant: c })), { ver: v }).id;
}, [ver, prods]);
const idA = await pedir(ana, 'nombre', [[0, 2], [1, 1]]);
const idB = await pedir(beto, 'pedido', [[2, 1]]);
ok('a la pantalla le llegan los dos pedidos', (await tarda(tv, ([a, b]) => !!FADORI.pedido(a) && !!FADORI.pedido(b), [idA, idB])) != null);
await tarda(most, ([a, b]) => !!FADORI.pedido(a) && !!FADORI.pedido(b), [idA, idB]);
await most.evaluate(id => { const F = FADORI; F.tomar(id, 'prueba'); F.marcarListo(id); }, idA);
const ms = await tarda(tv, id => document.querySelector('#llamando').dataset.turno === id, idA);
ok(`el de Ana sale en «Ya puede pasar» (${ms} ms)`, ms != null);
const esquina = await tv.textContent('#llamando');
ok('con su primer nombre, porque ella eligió «mi nombre»', /Ana/.test(esquina), esquina);
ok('sin su apellido ni su grupo', !/Pérez|3B/.test(await tv.textContent('body')));
ok('y con lo que pidió («2 …» del primer platillo)', /2 \S/.test(esquina), esquina);
ok('salió el letrero grande encima del programa', (await tarda(tv, () => document.querySelector('#llamado').classList.contains('sale'), null, 4000)) != null);
const dicho = await tarda(tv, () => window.__dichos.length > 0, null, 6000);
ok('y la voz dice el turno y su nombre', dicho != null && await tv.evaluate(() => /^Turno \d+\. Ana, tu pedido está listo\.$/.test(window.__dichos[0])), await tv.evaluate(() => window.__dichos.join(' | ')));
await most.evaluate(id => { const F = FADORI; F.tomar(id, 'prueba'); F.marcarListo(id); }, idB);
await tarda(tv, id => document.querySelector('#llamando').dataset.turno === id, idB);
const esq2 = await tv.textContent('#llamando');
ok('el de Beto sale con lo que pidió y SIN nombre (eligió «sólo mi pedido»)', !/Beto/.test(esq2) && esq2.length > 20, esq2);
await tv.waitForTimeout(7600);
ok('los avisos van en fila: también se dijo el de Beto, sin nombre', await tv.evaluate(() => window.__dichos.length >= 2 && /^Turno \d+\. tu pedido está listo\.$/.test(window.__dichos[1])), await tv.evaluate(() => window.__dichos.join(' | ')));
ok('Ana pasa a «También listos»', /Ana/.test(await tv.textContent('#bListos')));

console.log('\n2 · la tanda de anuncios con el logo que gira');
await tv.evaluate(() => { window.TELE.Programa.corte(); });
await tv.waitForTimeout(1400);
const enCorte = await tv.evaluate(() => { const c = document.querySelector('#tanda'); if(c.hidden) return null;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let luz = 0; for(let i = 0; i < d.length; i += 400) luz += d[i] + d[i + 1] + d[i + 2]; return luz; });
ok('la tanda se ve encima del programa (no en negro)', enCorte > 10000, enCorte);
ok('abre y cierra con el logo del canal, con anuncios en medio', await tv.evaluate(() => { const p = (window.__corte || {}).piezas || []; return p[0] === 'canal:rembrandt' && p[p.length - 1] === 'canal:rembrandt' && p.some(x => /^anuncio:/.test(x)) && p.some(x => /^ident:/.test(x)); }),
  await tv.evaluate(() => JSON.stringify(window.__corte)));
const t1 = await tv.evaluate(() => window.__corte.t);
ok('al terminar, como no hay episodios, empieza otra: la pantalla nunca se queda vacía', (await tarda(tv, t => window.__corte.t !== t, t1, 35000)) != null);

console.log('\n3 · el programa: un episodio cargado en la tablet, y el corte cada tantos minutos');
await tv.evaluate(async () => {
  /* un «episodio» de 6 s fabricado aquí mismo */
  const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d');
  const rec = new MediaRecorder(c.captureStream(20), { mimeType: 'video/webm' }), tr = []; rec.ondataavailable = e => tr.push(e.data);
  const fin = new Promise(r => rec.onstop = r); rec.start();
  const t0 = performance.now(); await new Promise(r => { const p = () => { g.fillStyle = '#0A6'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#fff'; g.fillText(((performance.now() - t0) / 1000).toFixed(1), 20, 90); if(performance.now() - t0 < 6000) requestAnimationFrame(p); else r(); }; p(); });
  rec.stop(); await fin;
  const blob = new Blob(tr, { type: 'video/webm' });
  const bd = await new Promise(r => { const q = indexedDB.open('fadori-tele', 1); q.onsuccess = () => r(q.result); });
  await new Promise(r => { const t = bd.transaction('cosas', 'readwrite'); t.objectStore('cosas').put({ blob, nombre: 'Episodio 5' }, 'ep:prueba'); t.objectStore('cosas').put(['ep:prueba'.slice(3)], 'eps'); t.oncomplete = r; });
  const cfg = JSON.parse(localStorage.getItem('fadori_tele') || '{}'); cfg.cadaMin = 0.05; localStorage.setItem('fadori_tele', JSON.stringify(cfg));
});
await tv.reload(); await tv.waitForFunction(() => window.TELE && window.TELE.listo);
await tv.evaluate(() => { window.__dichos = []; });
await tv.click('#bArranque').catch(() => {});
ok('el episodio sale con su nombre en el marco', /Episodio 5/.test(await tv.textContent('#progQue')), await tv.textContent('#progQue'));
ok('y avanza', (await tarda(tv, () => document.querySelector('#prog').currentTime > 1, null, 8000)) != null);
ok('a los 3 s de programa (así lo pusimos) entra la tanda sola', (await tarda(tv, () => window.TELE.Programa.enCorte, null, 10000)) != null);
ok('y el programa sigue donde se quedó', (await tarda(tv, () => !window.TELE.Programa.enCorte && !document.querySelector('#prog').paused, null, 40000)) != null);

console.log('\n3b · sin episodio nuevo: música con su carátula, YouTube, y el aviso de Fadori a un lado');
const mp3 = cancionDePrueba();
await tv.evaluate(() => { const T = window.TELE; T.cfg.cadaMin = 99; T.cfg.porCorte = 1; });
await tv.click('#bAjustes');
await tv.setInputFiles('#ajRelArch', mp3);
/* el título va en un campo editable: se lee su VALOR, que textContent no trae */
ok('la canción subida trae su nombre y artista de adentro del MP3', (await tarda(tv, () => { const i = document.querySelector('#ajRell input[data-nombre-rel]'); return i && i.value === 'Canción del recreo' && /Grupo 3\.1/.test(document.querySelector('#ajRell').textContent); }, null, 6000)) != null,
  await tv.evaluate(() => [...document.querySelectorAll('#ajRell input')].map(i => i.value).join('|') + ' · ' + document.querySelector('#ajRell').textContent));
ok('…y su carátula', await tv.evaluate(() => /^blob:/.test((document.querySelector('#ajRell img') || {}).src || '')));
ok('pero mientras haya un episodio nuevo, sigue el episodio', await tv.evaluate(() => window.TELE.Programa.actual && window.TELE.Programa.actual.tipo === 'ep'));
await tv.click('#ajCerrar');
await tv.evaluate(() => { const v = document.querySelector('#prog'); if(v.duration) v.currentTime = Math.max(0, v.duration - 0.5); });
ok('al acabarse el episodio (ya no es nuevo) pasa la música', (await tarda(tv, () => { const a = window.TELE.Programa.actual; return a && a.tipo === 'archivo' && !document.querySelector('#portada').hidden; }, null, 45000)) != null,
  await tv.evaluate(() => JSON.stringify(window.TELE.Programa.actual && { n: window.TELE.Programa.actual.nombre, t: window.TELE.Programa.actual.tipo })));
ok('con la carátula en grande, el título y el artista', await tv.evaluate(() => /^blob:/.test(document.querySelector('#ptTapa').src) && document.querySelector('#ptTitulo').textContent === 'Canción del recreo' && document.querySelector('#ptArtista').textContent === 'Grupo 3.1'));
ok('y suena', (await tarda(tv, () => document.querySelector('#prog').currentTime > 0.5 && !document.querySelector('#prog').paused, null, 8000)) != null);
ok('el episodio quedó como «ya se pasó»', await tv.evaluate(() => !!JSON.parse(localStorage.getItem('fadori_tele_vistos') || '{}').prueba));

/* el aviso de Fadori */
await tv.evaluate(() => window.TELE.verPop());
await tv.waitForTimeout(900);
const pop = await tv.evaluate(() => { const p = document.querySelector('#popFadori').getBoundingClientRect(), m = document.querySelector('#marco').getBoundingClientRect(), t = document.querySelector('#ptTapa').getBoundingClientRect();
  const cruza = !(p.right < t.left || p.left > t.right || p.bottom < t.top || p.top > t.bottom);
  return { sale: document.querySelector('#popFadori').classList.contains('sale'), dentro: p.left >= m.left - 1 && p.right <= m.right + 1 && p.top >= m.top && p.bottom <= m.bottom, ancho: p.width / m.width, cruza }; });
ok('el aviso de Fadori sale a un lado del programa', pop.sale && pop.dentro, JSON.stringify(pop));
ok('sin tapar más de un tercio de la pantalla', pop.ancho < 0.34, pop.ancho.toFixed(2));
ok('y con una canción, por el lado donde no está la carátula', !pop.cruza, JSON.stringify(pop));
ok('trae la hamburguesa armándose y el código para pedir', await tv.evaluate(() => document.querySelectorAll('#popFadori .burger .cap').length === 7 && /qr\/abrir/.test(document.querySelector('#popFadori .pf-qr').src)));
ok('y se va sola', (await tarda(tv, () => !document.querySelector('#popFadori').classList.contains('sale'), null, 14000)) != null);
await tv.evaluate(() => { window.TELE.Programa.enCorte = true; });
ok('nunca sale en medio de la tanda', await tv.evaluate(() => window.TELE.verPop() === false));
await tv.evaluate(() => { window.TELE.Programa.enCorte = false; });

/* «Repetir los episodios» en vez de música */
await tv.click('#bAjustes');
await tv.click('[data-cfg="alAcabar"][data-v="repetir"]');
ok('si se elige «Repetir los episodios», vuelve el episodio en ese momento', await tv.evaluate(() => window.TELE.Programa.actual.tipo === 'ep' && document.querySelector('#portada').hidden));
await tv.click('[data-cfg="alAcabar"][data-v="relleno"]');
ok('y de regreso a la música', await tv.evaluate(() => window.TELE.Programa.actual.tipo === 'archivo'));

/* enlaces */
await tv.fill('#ajRelUrl', 'https://www.google.com/');
await tv.click('#ajRelAgrega');
ok('un enlace que no es de YouTube ni Spotify se dice, no se guarda', /no es de YouTube/.test(await tv.textContent('#ajRelMsg')) && await tv.evaluate(() => window.TELE.Programa.rell.length === 1));
await tv.fill('#ajRelUrl', 'https://youtu.be/dQw4w9WgXcQ');
await tv.click('#ajRelAgrega');
ok('uno de YouTube entra a la lista', (await tarda(tv, () => window.TELE.Programa.rell.some(r => r.tipo === 'youtube'), null, 4000)) != null);
await tv.click('#ajSiguiente');
ok('«Pasar al siguiente» lo pone: el video de YouTube en el marco', await tv.evaluate(() => { const w = document.querySelector('#progWeb');
  return !w.hidden && /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?.*enablejsapi=1/.test(w.src) && document.querySelector('#prog').paused && document.querySelector('#portada').hidden; }),
  await tv.evaluate(() => document.querySelector('#progWeb').src));
await tv.click('#ajSiguiente');
ok('y al pasar a la canción, YouTube se apaga del todo (no sigue sonando escondido)', await tv.evaluate(() => { const w = document.querySelector('#progWeb'); return w.hidden && /about:blank/.test(w.src); }));
await tv.click('#ajCerrar');

console.log('\n3c · lo que Carlos sube desde su teléfono llega solo a la tablet');
const cel = await pantalla(390, 844);
cel.on('dialog', d => d.accept());
const tablita = await pantalla();
await tablita.evaluate(() => FADORI.entrarMostrador('121026'));
await cel.click('#bArranque').catch(() => {});
await cel.click('#bAjustes');
await cel.click('#ajNubePase');
await teclear(cel, '121026');
ok('en el teléfono, con el pasador, dice que lo que suba llega a las demás', (await tarda(cel, () => /llega solo a las otras pantallas/.test(document.querySelector('#ajCuerpo').textContent), null, 6000)) != null);
await cel.setInputFiles('#ajRelArch', mp3);
ok('la canción se sube al buzón', (await tarda(cel, () => /ya está en el buzón/.test(document.querySelector('#ajNube').textContent), null, 20000)) != null, await cel.textContent('#ajNube'));
ok('la tablet la baja sola, con su nombre y su carátula', (await tarda(tablita, () => window.TELE.Nube.revisar() && window.TELE.Programa.rell.some(r => r.nombre === 'Canción del recreo' && /^blob:/.test(r.tapa || '')), null, 20000)) != null,
  await tablita.evaluate(() => JSON.stringify(window.__nube)) + ' · cel: ' + await cel.evaluate(async () => { const r = await FADORI.alServidor('/api/medios/lista', { cuerpo: {} }); return document.querySelectorAll('#ajRell [data-rquita]').length + ' ' + JSON.stringify((await r.json()).medios.map(m => m.nombre)) + ' ' + window.TELE.Nube.estado; }));
ok('…y se oye: el archivo llegó entero', await tablita.evaluate(async () => { const r = window.TELE.Programa.rell[0]; const a = new Audio(r.url); await new Promise(x => { a.onloadedmetadata = x; a.onerror = x; setTimeout(x, 4000); }); return a.duration > 3.5 && a.duration < 4.6; }));
await cel.click('#bAjustes').catch(() => {});
await cel.waitForSelector('#ajRell [data-rquita]');
await cel.click('#ajRell [data-rquita]');
ok('«Quitar» pide un segundo toque (antes nunca quitaba nada)', /Seguro/.test(await cel.textContent('#ajRell [data-rquita]')));
await cel.click('#ajRell [data-rquita]');
await cel.waitForTimeout(800);
await tarda(cel, () => !document.querySelector('#ajRell [data-rquita]'), null, 5000);
await cel.waitForTimeout(800);
/* la tablet revisa el buzón cada 2 minutos; aquí se le pide sin esperar (si
   ya iba revisando, la vuelta siguiente lo ve) */
ok('si la borra en el teléfono, se borra también en la tablet', (await tarda(tablita, () => { window.TELE.Nube.revisar(); return !window.TELE.Programa.rell.some(r => r.nombre === 'Canción del recreo'); }, null, 15000)) != null,
  await tablita.evaluate(() => JSON.stringify(window.__nube)) + ' · cel: ' + await cel.evaluate(async () => { const r = await FADORI.alServidor('/api/medios/lista', { cuerpo: {} }); return document.querySelectorAll('#ajRell [data-rquita]').length + ' ' + JSON.stringify((await r.json()).medios.map(m => m.nombre)) + ' ' + window.TELE.Nube.estado; }));

/* el Estudio de podcast manda su episodio con fadori/buzon.js */
const desdeEstudio = await cel.evaluate(async () => {
  const B = await import('./buzon.js');
  const c = document.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d');
  const rec = new MediaRecorder(c.captureStream(15), { mimeType: 'video/webm' }), tr = []; rec.ondataavailable = e => tr.push(e.data);
  const fin = new Promise(r => rec.onstop = r); rec.start();
  await new Promise(r => { const t0 = performance.now(); const p = () => { g.fillStyle = '#C2410C'; g.fillRect(0, 0, 160, 90); if(performance.now() - t0 < 2500) requestAnimationFrame(p); else r(); }; p(); });
  rec.stop(); await fin;
  return { llave: B.hayLlave(), id: await B.mandar(new Blob(tr, { type: 'video/webm' }), { nombre: 'Episodio 7 · Verdad o felicidad' }) };
});
ok('el Estudio manda su episodio al buzón con la llave que ya tenía el teléfono', desdeEstudio.llave && /^e[a-z0-9]+$/.test(desdeEstudio.id), JSON.stringify(desdeEstudio));
ok('…y la tablet lo baja como episodio NUEVO', (await tarda(tablita, () => { window.TELE.Nube.revisar(); return window.TELE.Programa.eps.some(e => e.nombre === 'Episodio 7 · Verdad o felicidad'); }, null, 20000)) != null);

console.log('\n4 · la tablet de la fila: tocar, pedir y ver el turno');
const tab = await pantalla();
await tab.click('#bArranque').catch(() => {});
await tab.click('#bAjustes');
await tab.click('#ajTabletSi');
ok('prender el modo tablet abre el pad de números, no el teclado', (await tarda(tab, () => !!document.querySelector('dialog.fpad-capa[open]'), null, 3000)) != null);
ok('y no hay ningún campo de texto donde escribir el pasador', await tab.evaluate(() => !document.querySelector('dialog.fpad-capa input')));
await teclear(tab, '999999');
ok('un pasador malo no entra: el pad se queda y lo dice', (await tarda(tab, () => /no es/.test(document.querySelector('.fpad-msg').textContent), null, 5000)) != null);
await teclear(tab, '121026'); await tab.click('dialog.fpad-capa .fpad-ok');
ok('con el pasador, el modo tablet se prende', (await tarda(tab, () => document.body.classList.contains('con-tablet'), null, 10000)) != null);
ok('y la tablet queda con la llave de la cooperativa', await tab.evaluate(() => !!FADORI.llaveMostrador()));
await tab.click('#ajCerrar');
await tab.waitForTimeout(800);
await tab.mouse.click(420, 360);
ok('al tocar la pantalla se abre la app para pedir', (await tarda(tab, () => !document.querySelector('#kCapa').hidden, null, 4000)) != null);
const k = tab.frame({ url: /kiosco/ });
await k.waitForFunction(() => window.KIOSCO, null, { timeout: 15000 });
ok('arriba a la izquierda, en chiquito, quién ya puede pasar', /Ya puede pasar/.test(await tab.textContent('#kMini')));
ok('en la tablet no se pide cuenta ni términos: va directo al menú', await k.evaluate(() => !document.querySelector('#p-menu').hidden && document.querySelector('#p-entrada').hidden));
ok('pero primero la cooperativa anota quién va a pedir', await k.evaluate(() => !document.querySelector('#kAnota').hidden));
await k.click('#kaListo');
ok('sin nombre no deja seguir', await k.evaluate(() => !document.querySelector('#kAnota').hidden));
await k.fill('#kaNombre', 'Val');
ok('con tres letras busca entre los alumnos (sin nadie que se llame así, no sale nadie)', await k.evaluate(() => !document.querySelectorAll('#kaLista [data-ka]').length));
await k.fill('#kaNombre', 'Valeria'); await k.fill('#kaGrupo', '2A');
await k.click('#kaListo');
ok('con nombre y grupo, ya puede pedir', await k.evaluate(() => document.querySelector('#kAnota').hidden));
const mas = k.locator('#rejilla button[aria-label^="Agregar"]');
await mas.nth(0).click(); await mas.nth(3).click();
await k.click('#bPedir');
ok('en el carrito dice quién pide, y no se puede escribir otro nombre ahí', /Valeria/.test(await k.textContent('#kPide')) && !(await k.$('#kNombreIn')));
await k.click('[data-ver="nombre"]');
ok('la muestra dice cómo se va a ver en la pantalla', /Valeria/.test(await k.textContent('#verMuestra')));
await k.click('#bConfirmar');
ok('sale el ticket con el número de turno (lo pone el servidor)', (await tarda(tab, () => { const f = document.querySelector('#kMarco').contentDocument; const n = f && f.querySelector('#kNum'); return n && /^\d+$/.test(n.textContent); }, null, 10000)) != null);
ok('con lo que pidió y su código para anotarlo', / · /.test(await k.textContent('#kPidio')) && /^[A-Z0-9]{4,6}$/.test(await k.textContent('#kFolio')), (await k.textContent('#kPidio')) + ' / ' + (await k.textContent('#kFolio')));
const turnoK = await k.textContent('#kNum');
await k.click('#kOk');
ok('luego pregunta «¿Quieres pedir algo más?»', !(await k.evaluate(() => document.querySelector('#kMas').hidden)));
const t5 = Date.now();
ok('y si nadie contesta, a los 5 s regresa sola a la pantalla', (await tarda(tab, () => document.querySelector('#kCapa').hidden, null, 9000)) != null);
const seg = (Date.now() - t5) / 1000;
ok(`… en ~5 s, no antes (${seg.toFixed(1)} s)`, seg > 4 && seg < 8.5);
ok('el turno nuevo está en la fila de la pantalla', (await tarda(tab, n => [...document.querySelectorAll('#bFila .numeros b')].some(b => b.textContent === n), turnoK, 6000)) != null, turnoK + ' / ' + await tab.textContent('#bFila'));
ok('a la cooperativa le llega como pedido de la tablet, con el nombre', (await tarda(most, () => FADORI.estado().pedidos.some(p => p.origen === 'kiosco' && p.nombre === 'Valeria'), null, 10000)) != null);
const pK = await most.evaluate(() => FADORI.estado().pedidos.find(p => p.origen === 'kiosco'));
ok('y con lo que eligió para la pantalla', pK && pK.ver === 'nombre', JSON.stringify(pK && { ver: pK.ver, origen: pK.origen }));

/* «¿algo más?» → sí: otra persona pide sin volver a la pantalla */
await tab.mouse.click(420, 360);
await k.waitForFunction(() => !document.querySelector('#p-menu').hidden);
ok('la siguiente persona empieza en blanco (sin el nombre de la anterior)', await k.evaluate(() => document.querySelector('#cestaCuantos').textContent === '0'));
ok('y no queda nada de la persona anterior en la página', !(await k.evaluate(() => document.body.innerHTML.includes('Valeria'))),
  await k.evaluate(() => [...document.querySelectorAll('body *')].filter(e => !e.children.length && /Valeria/.test(e.textContent + (e.value || ''))).map(e => e.id || e.className).join(',')));
ok('…y la cooperativa vuelve a anotar quién sigue, en blanco', await k.evaluate(() => !document.querySelector('#kAnota').hidden) && (await k.inputValue('#kaNombre')) === '');
/* esta vez es una alumna que ya tiene cuenta: se escoge de la lista y el pedido es SUYO */
const codAna = await ana.evaluate(() => FADORI.yo().codigo);
await k.fill('#kaNombre', 'ana p');
ok('al escribir «ana p» sale Ana de la lista', (await tarda(tab, () => { const d = document.querySelector('#kMarco').contentDocument; return d && /Ana Pérez/.test(d.querySelector('#kaLista').textContent); }, null, 3000)) != null);
await k.click('#kaLista [data-ka]');
await k.click('#kaListo');
await k.locator('#rejilla button[aria-label^="Agregar"]').nth(1).click();
await k.waitForFunction(() => document.querySelector('#cestaCuantos').textContent === '1');
await k.click('#bPedir');
ok('…ni el nombre de la anterior en el carrito: dice Ana', /Ana/.test(await k.textContent('#kPide')) && !/Valeria/.test(await k.textContent('#kPide')));
await k.click('#bConfirmar');
ok('el pedido de la tablet queda a nombre de la cuenta de Ana (cuenta en sus pedidos)', (await tarda(most, (c) => FADORI.estado().pedidos.some(p => p.origen === 'kiosco' && p.alumno === c), codAna, 10000)) != null);
await k.click('#kOk').catch(() => {}); await k.click('#kNo').catch(() => {});
await tarda(tab, () => document.querySelector('#kCapa').hidden, null, 4000);
await tab.mouse.click(420, 360);
await tarda(tab, () => !document.querySelector('#kCapa').hidden, null, 4000);
await tab.click('#kCerrar');
ok('«Volver a la pantalla» la cierra', (await tarda(tab, () => document.querySelector('#kCapa').hidden, null, 3000)) != null);

console.log('\n4b · nadie la toca: «¿sigues ahí?» y 10 segundos');
await tab.evaluate(() => { localStorage.setItem('fadori_kiosco_espera', '4'); document.querySelector('#kMarco').contentWindow.location.reload(); });
await tab.waitForTimeout(500);
await k.waitForFunction(() => window.KIOSCO, null, { timeout: 15000 });
await tab.mouse.click(420, 360);
await tarda(tab, () => !document.querySelector('#kCapa').hidden, null, 4000);
const tq = Date.now();
ok('sin tocar nada, pregunta «¿Sigues ahí?»', (await tarda(tab, () => { const d = document.querySelector('#kMarco').contentDocument; return d && !d.querySelector('#kTicket').hidden && !d.querySelector('#kSigues').hidden; }, null, 9000)) != null);
ok(`… a la espera que se puso (${((Date.now() - tq) / 1000).toFixed(1)} s)`, (Date.now() - tq) / 1000 > 3.5);
await k.click('#kTicket', { position: { x: 30, y: 30 } });
ok('tocar donde sea cuenta como «aquí sigo»', await k.evaluate(() => document.querySelector('#kTicket').hidden) && !(await tab.evaluate(() => document.querySelector('#kCapa').hidden)));
await k.fill('#kaNombre', 'Prueba'); await k.click('#kaListo');
await k.locator('#rejilla button[aria-label^="Agregar"]').nth(0).click();
ok('con algo en el carrito vuelve a preguntar', (await tarda(tab, () => { const d = document.querySelector('#kMarco').contentDocument; return d && !d.querySelector('#kTicket').hidden && !d.querySelector('#kSigues').hidden; }, null, 9000)) != null,
  JSON.stringify(await k.evaluate(() => ({ t: document.querySelector('#kTicket').hidden, c: document.querySelector('#cestaCuantos').textContent }))));
ok('y avisa que se va a borrar avisa que se va a borrar', /se borra tu pedido/.test(await k.textContent('#kSiguesQue')), await k.textContent('#kSiguesQue'));
const t10 = Date.now();
ok('y si nadie toca, regresa sola a la pantalla de turnos', (await tarda(tab, () => document.querySelector('#kCapa').hidden, null, 14000)) != null);
const s10 = (Date.now() - t10) / 1000;
ok(`… a los 10 s (${s10.toFixed(1)} s)`, s10 > 8.5 && s10 < 12.5);
ok('sin dejar nada en el carrito', await k.evaluate(() => document.querySelector('#cestaCuantos').textContent === '0'));
await tab.evaluate(() => localStorage.removeItem('fadori_kiosco_espera'));

console.log('\n4c · la puerta escondida al mostrador (dedo 2 s sobre «Lo anota la cooperativa»)');
await tab.mouse.click(420, 360);
await tarda(tab, () => !document.querySelector('#kCapa').hidden, null, 4000);
/* al abrir, la tarjeta de «¿quién va a pedir?» tapa el encabezado: la
   puerta vive también en su etiqueta de arriba */
const marca = k.locator('#kAnota .k-que');
await marca.hover();
await tab.mouse.down(); await tab.waitForTimeout(600); await tab.mouse.up();
ok('un toque corto en el logo no abre nada', !(await tab.evaluate(() => !!document.querySelector('dialog.fpad-capa[open]'))));
await marca.hover(); await tab.mouse.down(); await tab.waitForTimeout(2300); await tab.mouse.up();
ok('dejando el dedo 2 s sale el pad del pasador', (await tarda(tab, () => !!document.querySelector('dialog.fpad-capa[open]'), null, 3000)) != null);
await teclear(tab, '121026');
ok('con el pasador abre el mostrador', (await tarda(tab, () => /mostrador\.html\?desde=pantalla/.test(location.href) && document.querySelector('#cuerpoMostrador') && !document.querySelector('#cuerpoMostrador').hidden, null, 10000)) != null, await tab.evaluate(() => location.href));
ok('y trae el botón para volver a la pantalla de turnos', await tab.isVisible('#bVolverTele'));

console.log('\n4d · la reja del mostrador también es con el pad');
const reja = await aparato('/fadori/mostrador.html', { w: 820, h: 1180 });
await reja.waitForSelector('#rPad .fpad-teclas', { timeout: 10000 });
ok('la reja trae el pad', await reja.isVisible('#rPad .fpad-teclas'));
ok('y el campo no saca el teclado del teléfono', (await reja.getAttribute('#rPase', 'inputmode')) === 'none');
const t4 = await reja.evaluate(() => [...document.querySelectorAll('#rPad .fpad-teclas button')].map(b => b.getBoundingClientRect()).every(r => r.width >= 64 && r.height >= 64));
ok('con teclas grandes (≥ 64 px)', t4);
await teclear(reja, '121026', '#rPad');
ok('con los 6 números entra sola, sin buscar el botón', (await tarda(reja, () => !document.querySelector('#cuerpoMostrador').hidden, null, 10000)) != null);

console.log('\n5 · tamaños y errores');
for(const [w, h] of [[1280, 800], [1920, 1080], [800, 1280]]){
  await tv.setViewportSize({ width: w, height: h }); await tv.waitForTimeout(300);
  const d = await tv.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }));
  ok(`nada se sale a ${w}×${h}`, d.x <= 0 && d.y <= 2, JSON.stringify(d));
}
for(const [n, pg] of [['pantalla', tv], ['tablet', tab], ['mostrador', most], ['reja', reja], ['Ana', ana], ['Beto', beto], ['teléfono de Carlos', cel], ['tablet que baja', tablita]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);

console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
