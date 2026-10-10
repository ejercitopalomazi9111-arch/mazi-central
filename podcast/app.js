/* ESTUDIO · la pantalla
   Lo que se graba se guarda en el teléfono (IndexedDB) en cuanto se suelta
   el botón: cerrar la pestaña por error a media sesión no puede costar una
   grabación. El trabajo pesado va al trabajador de fondo (trabajo.js). */
import { SR, unir, aWav, tiempo, lufs } from './motor.js';
import { ESTILOS } from './jingle.js';
import { TEMAS, dibujarPortada, aJpeg } from './portada.js';

const $ = (s) => document.querySelector(s);
const ico = (n) => (window.ICONOS ? window.ICONOS.ico(n) : '');
document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = ico(el.dataset.ico); });

/* ── avisos chiquitos y la capa de «trabajando» ───────────────────────── */
let tTost = 0;
function aviso(t){ const e = $('#toston'); e.textContent = t; e.classList.add('vivo'); clearTimeout(tTost); tTost = setTimeout(() => e.classList.remove('vivo'), 3200); }
function ocupado(txt, p){
  const c = $('#trabajando');
  if(txt === false){ c.hidden = true; return; }
  c.hidden = false; $('#trTexto').textContent = txt; $('#trBarra').style.width = Math.round((p || 0) * 100) + '%';
}

/* ── el trabajador de fondo, con respaldo en la página si no se puede ─── */
let trabajador = null, sigId = 1;
const pendientes = new Map();
try{
  trabajador = new Worker(new URL('./trabajo.js', import.meta.url), { type: 'module' });
  trabajador.onmessage = (e) => {
    const m = e.data, p = pendientes.get(m.id); if(!p) return;
    if('avance' in m){ p.avance && p.avance(m.avance); return; }
    pendientes.delete(m.id);
    m.ok ? p.si(m.r) : p.no(new Error(m.error));
  };
  trabajador.onerror = () => { trabajador = null; };
}catch(e){ trabajador = null; }
async function tarea(op, datos, transf = [], avance){
  if(trabajador){
    return new Promise((si, no) => { const id = sigId++; pendientes.set(id, { si, no, avance }); trabajador.postMessage({ id, op, datos }, transf); });
  }
  /* sin trabajador: aquí mismo (más lento para la pantalla, pero funciona) */
  const M = await import('./motor.js'), J = await import('./jingle.js');
  await new Promise(r => setTimeout(r, 30));
  if(op === 'limpiar') return M.limpiar(datos.audio, SR, datos.opciones);
  if(op === 'jingle') return { datos: J.jingle(datos) };
  if(op === 'armar') return M.armar(datos.partes, SR, datos.opciones);
  if(op === 'mp3'){
    if(!window.lamejs) await new Promise((si, no) => { const s = document.createElement('script'); s.src = 'vendor/lame-1.2.1.min.js'; s.onload = si; s.onerror = no; document.head.appendChild(s); });
    return { datos: await M.aMp3(datos.audio, SR, datos.kbps || 96, window.lamejs, avance) };
  }
}

/* ── guardar en el teléfono ───────────────────────────────────────────── */
const BD = new Promise((si, no) => {
  try{
    const r = indexedDB.open('estudio-podcast', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('cosas'); };
    r.onsuccess = () => si(r.result); r.onerror = () => si(null);
  }catch(e){ si(null); }
});
async function guardar(clave, valor){
  const bd = await BD; if(!bd) return;
  try{ await new Promise((si) => { const t = bd.transaction('cosas', 'readwrite'); valor === undefined ? t.objectStore('cosas').delete(clave) : t.objectStore('cosas').put(valor, clave); t.oncomplete = si; t.onerror = si; }); }catch(e){}
}
async function leer(clave){
  const bd = await BD; if(!bd) return undefined;
  try{ return await new Promise((si) => { const r = bd.transaction('cosas').objectStore('cosas').get(clave); r.onsuccess = () => si(r.result); r.onerror = () => si(undefined); }); }catch(e){ return undefined; }
}

/* ── decodificar cualquier audio a mono de 32 kHz ─────────────────────── */
async function decodificar(blob){
  const buf = await blob.arrayBuffer();
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Off(1, 1, SR);
  const ab = await new Promise((si, no) => { const p = ctx.decodeAudioData(buf, si, no); if(p && p.then) p.then(si, no); });
  const n = ab.length, out = new Float32Array(n);
  for(let c = 0; c < ab.numberOfChannels; c++){ const d = ab.getChannelData(c); for(let i = 0; i < n; i++) out[i] += d[i] / ab.numberOfChannels; }
  return out;
}

/* ── dibujar una onda ─────────────────────────────────────────────────── */
function dibujarOnda(cv, x, color){
  const w = cv.clientWidth || 300, h = cv.clientHeight || 32, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  g.fillStyle = color || getComputedStyle(document.documentElement).getPropertyValue('--acento');
  const barras = Math.floor(w / 3), paso = Math.max(1, Math.floor(x.length / barras));
  for(let b = 0; b < barras; b++){
    let m = 0; for(let i = b * paso; i < (b + 1) * paso && i < x.length; i += 4) m = Math.max(m, Math.abs(x[i]));
    const a = Math.max(1, Math.min(1, m * 1.4) * h);
    g.fillRect(b * 3, (h - a) / 2, 2, a);
  }
}
const urlDe = new WeakMap();
function urlWav(x){ const u = URL.createObjectURL(new Blob([aWav(x)], { type: 'audio/wav' })); return u; }

/* ══════════════════════════════════════════════════════════════════════
   1 · LA VOZ
   ═════════════════════════════════════════════════════════════════════ */
let pedazos = [];          /* {id, nombre, audio} */
let limpio = null;          /* Float32Array del episodio limpio */
function pintarPedazos(){
  const ol = $('#pedazos');
  $('#sinPedazos').hidden = pedazos.length > 0;
  ol.innerHTML = pedazos.map((p, k) =>
    '<li class="pedazo" data-id="'+p.id+'"><span class="orden">'+(k + 1)+'</span>'+
    '<div class="que"><b>'+p.nombre.replace(/[<>&]/g, '')+'</b><small>'+tiempo(p.audio.length / SR)+'</small><canvas></canvas></div>'+
    '<div class="acc">'+
      '<button class="mini" type="button" data-acc="oir" aria-label="Escuchar">'+ico('play')+'</button>'+
      '<button class="mini" type="button" data-acc="sube" aria-label="Subir"'+(k === 0 ? ' disabled' : '')+'>'+ico('arrow-up')+'</button>'+
      '<button class="mini" type="button" data-acc="borra" aria-label="Borrar">'+ico('trash')+'</button>'+
    '</div></li>').join('');
  ol.querySelectorAll('.pedazo').forEach((li, k) => dibujarOnda(li.querySelector('canvas'), pedazos[k].audio));
  $('#bLimpiar').disabled = !pedazos.length;
  $('#bArmar').disabled = !pedazos.length;
}
let reproductor = null;
function oir(x){
  if(reproductor){ reproductor.pause(); URL.revokeObjectURL(reproductor.src); }
  reproductor = new Audio(urlWav(x)); reproductor.play().catch(() => {});
}
$('#pedazos').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-acc]'); if(!b) return;
  const id = b.closest('.pedazo').dataset.id, k = pedazos.findIndex(p => p.id === id);
  if(b.dataset.acc === 'oir') oir(pedazos[k].audio);
  if(b.dataset.acc === 'sube' && k > 0){ [pedazos[k - 1], pedazos[k]] = [pedazos[k], pedazos[k - 1]]; }
  if(b.dataset.acc === 'borra'){
    if(!confirm('¿Borrar «' + pedazos[k].nombre + '»? No se puede deshacer.')) return;
    pedazos.splice(k, 1); await guardar('blob:' + id, undefined);
  }
  limpio = null; $('#resLimpio').hidden = true;
  await guardar('orden', pedazos.map(p => p.id));
  pintarPedazos();
});

async function agregarBlob(blob, nombre){
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await guardar('blob:' + id, { blob, nombre });       /* primero se guarda, luego se procesa */
  try{
    const audio = await decodificar(blob);
    if(audio.length < SR * 0.3) throw new Error('muy corto');
    pedazos.push({ id, nombre, audio });
    await guardar('orden', pedazos.map(p => p.id));
    limpio = null; $('#resLimpio').hidden = true;
    pintarPedazos();
  }catch(err){
    await guardar('blob:' + id, undefined);
    aviso('No pude leer «' + nombre + '». Prueba con otro formato (m4a, mp3, wav).');
  }
}
$('#fSubir').addEventListener('change', async (e) => {
  const fs = [...e.target.files]; e.target.value = '';
  for(let i = 0; i < fs.length; i++){ ocupado('Leyendo ' + fs[i].name + '…', i / fs.length); await agregarBlob(fs[i], fs[i].name.replace(/\.[^.]+$/, '')); }
  ocupado(false);
});

/* la grabadora: sirve para el episodio y para la frase de entrada */
function grabadora(alTerminar, alNivel, alTiempo){
  let rec = null, flujo = null, trozos = [], t0 = 0, reloj = 0, ctx = null, an = null, raf = 0;
  return {
    get activa(){ return !!rec; },
    async empezar(){
      flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
      const tipo = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      rec = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
      trozos = []; rec.ondataavailable = (e) => { if(e.data && e.data.size) trozos.push(e.data); };
      rec.onstop = () => { const b = new Blob(trozos, { type: rec.mimeType || 'audio/mp4' }); limpiarTodo(); alTerminar(b); };
      rec.start(1000); t0 = Date.now();
      reloj = setInterval(() => alTiempo((Date.now() - t0) / 1000), 250);
      try{
        ctx = new (window.AudioContext || window.webkitAudioContext)(); an = ctx.createAnalyser(); an.fftSize = 512;
        ctx.createMediaStreamSource(flujo).connect(an); const d = new Float32Array(an.fftSize);
        const mira = () => { an.getFloatTimeDomainData(d); let m = 0; for(const v of d) m = Math.max(m, Math.abs(v)); alNivel(m); raf = requestAnimationFrame(mira); };
        mira();
      }catch(e){}
    },
    parar(){ if(rec && rec.state !== 'inactive') rec.stop(); },
  };
  function limpiarTodo(){
    clearInterval(reloj); cancelAnimationFrame(raf); alNivel(0);
    if(flujo) flujo.getTracks().forEach(t => t.stop());
    if(ctx) ctx.close().catch(() => {});
    rec = null; flujo = null; ctx = null;
  }
}
let nGrab = 0;
const grabEp = grabadora(
  async (blob) => {
    $('#bGrabar').classList.remove('grabando'); $('#bGrabar').setAttribute('aria-label', 'Grabar');
    $('#recEstado').textContent = 'Guardado. Toca para grabar otro pedazo';
    await agregarBlob(blob, 'Grabación ' + (++nGrab));
  },
  (m) => { $('#recNivel').style.width = Math.min(100, Math.round(m * 140)) + '%'; },
  (s) => { $('#recTiempo').textContent = tiempo(s); },
);
$('#bGrabar').addEventListener('click', async () => {
  if(grabEp.activa){ grabEp.parar(); return; }
  try{
    await grabEp.empezar();
    $('#bGrabar').classList.add('grabando'); $('#bGrabar').setAttribute('aria-label', 'Parar');
    $('#recEstado').textContent = 'Grabando… toca para parar';
  }catch(e){ aviso('No hay permiso para el micrófono. Revísalo en los ajustes del navegador.'); }
});

/* ══════════════════════════════════════════════════════════════════════
   2 · LIMPIAR
   ═════════════════════════════════════════════════════════════════════ */
const opciones = () => ({ silencios: $('#oSilencios').checked, parejo: $('#oParejo').checked, ruido: $('#oRuido').checked, zumbido: $('#oZumbido').checked });
['oSilencios', 'oParejo', 'oRuido', 'oZumbido'].forEach(id => $('#' + id).addEventListener('change', () => {
  limpio = null; $('#resLimpio').hidden = true; guardar('opciones', opciones());
}));
async function hacerLimpio(){
  const crudo = unir(pedazos.map(p => p.audio), SR);
  ocupado('Limpiando ' + tiempo(crudo.length / SR) + ' de audio…', 0.3);
  const crudoCopia = Float32Array.from(crudo);
  const r = await tarea('limpiar', { audio: crudo, opciones: opciones() }, [crudo.buffer]);
  limpio = r.datos;
  ocupado(false);
  const caja = $('#resLimpio'); caja.hidden = false;
  caja.innerHTML = '<div class="cifras">'+
    '<div><b>'+tiempo(r.antes.segundos)+'</b><span>antes</span></div>'+
    '<div><b>'+tiempo(r.despues.segundos)+'</b><span>después</span></div>'+
    '<div><b>'+(r.quitado >= 1 ? '−' + tiempo(r.quitado) : '0:00')+'</b><span>silencio quitado</span></div></div>'+
    '<div class="ab"><label>Antes</label><audio controls preload="none" src="'+urlWav(crudoCopia)+'"></audio>'+
    '<label>Después</label><audio controls preload="none" src="'+urlWav(limpio)+'"></audio></div>';
  return limpio;
}
$('#bLimpiar').addEventListener('click', async () => {
  try{ await hacerLimpio(); aviso('Listo: compáralo con «Antes» y «Después».'); }
  catch(e){ ocupado(false); aviso('Algo falló al limpiar: ' + e.message); }
});

/* ══════════════════════════════════════════════════════════════════════
   3 · INTRO Y CIERRE
   ═════════════════════════════════════════════════════════════════════ */
const ICO_ESTILO = { lofi: 'coffee', pop: 'sparkles', noticiero: 'newspaper', acustico: 'guitar' };
let intro = { estilo: 'lofi', segundos: 12, semilla: 1 }, musicaPropia = null, vozIntro = null, cacheIntro = null;
function pintarIntro(){
  $('#estilos').innerHTML = Object.entries(ESTILOS).map(([id, e]) =>
    '<button class="chip" type="button" role="radio" data-estilo="'+id+'" aria-checked="'+(intro.estilo === id && !musicaPropia)+'">'+ico(ICO_ESTILO[id])+e.nombre+'</button>').join('');
  document.querySelectorAll('[data-largo]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.largo === intro.segundos)));
  $('#notaMusica').hidden = !musicaPropia;
  if(musicaPropia) $('#notaMusica').textContent = 'Usando tu música (' + tiempo(musicaPropia.length / SR) + '). Toca un estilo para volver a la nuestra.';
}
$('#estilos').addEventListener('click', (e) => { const b = e.target.closest('[data-estilo]'); if(!b) return;
  intro.estilo = b.dataset.estilo; musicaPropia = null; cacheIntro = null; guardar('intro', intro); guardar('musica', undefined); pintarIntro(); });
$('#largos').addEventListener('click', (e) => { const b = e.target.closest('[data-largo]'); if(!b) return;
  intro.segundos = +b.dataset.largo; cacheIntro = null; guardar('intro', intro); pintarIntro(); });
/* tu música: sólo los primeros 20 s (una intro no es una canción completa),
   al nivel de fondo y con salida suave */
function prepararMusica(a){
  const m = a.subarray(0, Math.min(a.length, SR * 20)).slice();
  const l = lufs(m); if(Number.isFinite(l)){ const g = Math.pow(10, (-20 - l) / 20); for(let i = 0; i < m.length; i++) m[i] *= g; }
  const fo = Math.min(m.length, Math.round(SR * 2)); for(let i = 0; i < fo; i++) m[m.length - 1 - i] *= i / fo;
  return m;
}
async function laIntro(final = 'golpe'){
  if(musicaPropia) return musicaPropia;
  const clave = JSON.stringify(intro) + final;
  if(cacheIntro && cacheIntro.clave === clave) return cacheIntro.datos;
  const r = await tarea('jingle', Object.assign({}, intro, { final }));
  if(final === 'golpe') cacheIntro = { clave, datos: r.datos };
  return r.datos;
}
$('#bOirIntro').addEventListener('click', async () => { ocupado('Componiendo…', 0.5); try{ oir(await laIntro()); } finally{ ocupado(false); } });
$('#bOtraIntro').addEventListener('click', async () => {
  intro.semilla = (intro.semilla % 9973) + 1 + Math.floor(Math.random() * 50); cacheIntro = null; musicaPropia = null;
  guardar('intro', intro); pintarIntro(); ocupado('Componiendo otra…', 0.5);
  try{ oir(await laIntro()); } finally{ ocupado(false); }
});
$('#fMusica').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  ocupado('Leyendo tu música…', 0.4);
  try{
    musicaPropia = prepararMusica(await decodificar(f));
    await guardar('musica', { blob: f });
    pintarIntro(); aviso('Listo: tu música va de entrada.');
  }catch(err){ aviso('No pude leer esa música.'); }
  ocupado(false);
});
const grabFrase = grabadora(
  async (blob) => {
    $('#bGrabarFrase').innerHTML = ico('mic') + 'Grabar frase';
    try{ vozIntro = await decodificar(blob); await guardar('frase', { blob }); pintarFrase(); aviso('Frase guardada.'); }
    catch(e){ aviso('No pude leer la grabación.'); }
  }, () => {}, (s) => { $('#bGrabarFrase').innerHTML = ico('square') + 'Parar · ' + tiempo(s); });
function pintarFrase(){ $('#bOirFrase').hidden = !vozIntro; $('#bBorrarFrase').hidden = !vozIntro; }
$('#bGrabarFrase').addEventListener('click', async () => {
  if(grabFrase.activa){ grabFrase.parar(); return; }
  try{ await grabFrase.empezar(); $('#bGrabarFrase').innerHTML = ico('square') + 'Parar'; }
  catch(e){ aviso('No hay permiso para el micrófono.'); }
});
$('#bOirFrase').addEventListener('click', () => vozIntro && oir(vozIntro));
$('#bBorrarFrase').addEventListener('click', async () => { vozIntro = null; await guardar('frase', undefined); pintarFrase(); });

/* ══════════════════════════════════════════════════════════════════════
   4 · ARMAR Y BAJAR
   ═════════════════════════════════════════════════════════════════════ */
let final = null, mp3 = null;
const nombreArchivo = () => ($('#eArchivo').value.trim() || 'mi-podcast').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mi-podcast';
$('#eArchivo').addEventListener('input', () => guardar('archivo', $('#eArchivo').value));
$('#bArmar').addEventListener('click', async () => {
  try{
    if(!limpio) await hacerLimpio();
    ocupado('Componiendo la entrada…', 0.25);
    const mus = await laIntro('golpe');
    const cierre = $('#oCierre').checked ? (musicaPropia || await laIntro('fundido')) : null;
    let vi = null;
    if(vozIntro){ ocupado('Limpiando tu frase…', 0.45); vi = (await tarea('limpiar', { audio: Float32Array.from(vozIntro), opciones: { silencios: true, parejo: true, ruido: true, zumbido: true } })).datos; }
    ocupado('Juntando todo…', 0.7);
    const r = await tarea('armar', { partes: { intro: mus.slice(), vozIntro: vi, episodio: limpio.slice(), cierre: cierre ? cierre.slice() : null } });
    final = r.datos; mp3 = null;
    ocupado(false);
    $('#final').hidden = false;
    dibujarOnda($('#ondaFinal'), final);
    const a = $('#oirFinal'); if(a.src) URL.revokeObjectURL(a.src); a.src = urlWav(final);
    $('#datosFinal').textContent = 'Dura ' + tiempo(final.length / SR) + ' · volumen de plataforma (−16 LUFS) · listo para subir';
    $('#bCompartir').hidden = !(navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(8)], 'x.mp3', { type: 'audio/mpeg' })] }));
    pintarPortada();
    $('#final').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }catch(e){ ocupado(false); aviso('Algo falló al armar: ' + e.message); }
});
async function elMp3(){
  if(mp3) return mp3;
  ocupado('Haciendo el MP3…', 0);
  try{
    const r = await tarea('mp3', { audio: final.slice(), kbps: 96 }, [], (p) => ocupado('Haciendo el MP3… ' + Math.round(p * 100) + '%', p));
    mp3 = new Blob([r.datos], { type: 'audio/mpeg' });
  } finally{ ocupado(false); }
  return mp3;
}
function bajar(blob, nombre){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
$('#bMp3').addEventListener('click', async () => { try{ bajar(await elMp3(), nombreArchivo() + '.mp3'); }catch(e){ aviso('No salió el MP3: ' + e.message); } });
$('#bWav').addEventListener('click', () => final && bajar(new Blob([aWav(final)], { type: 'audio/wav' }), nombreArchivo() + '.wav'));
$('#bCompartir').addEventListener('click', async () => {
  try{ const f = new File([await elMp3()], nombreArchivo() + '.mp3', { type: 'audio/mpeg' }); await navigator.share({ files: [f], title: nombreArchivo() }); }
  catch(e){ if(e && e.name !== 'AbortError') aviso('No se pudo compartir.'); }
});

/* ══════════════════════════════════════════════════════════════════════
   5 · PORTADA
   ═════════════════════════════════════════════════════════════════════ */
let tema = 'noche', foto = null;
function datosPortada(){ return { nombre: $('#pNombre').value.trim() || 'Mi podcast', episodio: $('#pEpisodio').value.trim(),
  titulo: $('#pTitulo').value.trim(), escuela: $('#pEscuela').value.trim(), tema, foto,
  onda: final || limpio || (pedazos[0] && pedazos[0].audio) || null }; }
function pintarPortada(){
  $('#temas').innerHTML = Object.entries(TEMAS).map(([id, t]) =>
    '<button class="chip" type="button" role="radio" data-tema="'+id+'" aria-checked="'+(tema === id)+'">'+
    '<span style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,'+t.fondo[0]+','+t.fondo[1]+');box-shadow:0 0 0 2px '+t.acento+'"></span>'+t.nombre+'</button>').join('');
  dibujarPortada($('#cvPortada'), datosPortada());
  $('#bSinFoto').hidden = !foto;
}
['pNombre', 'pEpisodio', 'pTitulo', 'pEscuela'].forEach(id => $('#' + id).addEventListener('input', () => {
  pintarPortada(); guardar('portada', { nombre: $('#pNombre').value, episodio: $('#pEpisodio').value, titulo: $('#pTitulo').value, escuela: $('#pEscuela').value, tema });
}));
$('#temas').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if(!b) return; tema = b.dataset.tema; pintarPortada();
  guardar('portada', { nombre: $('#pNombre').value, episodio: $('#pEpisodio').value, titulo: $('#pTitulo').value, escuela: $('#pEscuela').value, tema }); });
$('#fFoto').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  try{ foto = await createImageBitmap(f); pintarPortada(); }catch(err){ aviso('No pude abrir esa foto.'); }
});
$('#bSinFoto').addEventListener('click', () => { foto = null; pintarPortada(); });
$('#bPortada').addEventListener('click', async () => {
  ocupado('Haciendo la portada en 3000 px…', 0.5);
  try{
    const cv = document.createElement('canvas'); cv.width = cv.height = 3000;
    dibujarPortada(cv, datosPortada());
    const b = await aJpeg(cv);
    bajar(b, 'portada-' + nombreArchivo() + '.jpg');
  } finally{ ocupado(false); }
});

/* ══════════════════════════════════════════════════════════════════════
   AL ABRIR: recuperar lo que había
   ═════════════════════════════════════════════════════════════════════ */
(async function(){
  const op = await leer('opciones'); if(op) Object.entries({ oSilencios: op.silencios, oParejo: op.parejo, oRuido: op.ruido, oZumbido: op.zumbido }).forEach(([k, v]) => { $('#' + k).checked = v !== false; });
  const it = await leer('intro'); if(it) intro = Object.assign(intro, it);
  const ar = await leer('archivo'); if(ar) $('#eArchivo').value = ar;
  const po = await leer('portada'); if(po){ $('#pNombre').value = po.nombre || ''; $('#pEpisodio').value = po.episodio || ''; $('#pTitulo').value = po.titulo || ''; $('#pEscuela').value = po.escuela || ''; tema = po.tema || tema; }
  pintarIntro(); pintarPedazos(); pintarFrase(); pintarPortada();
  const orden = (await leer('orden')) || [];
  if(orden.length) ocupado('Recuperando tus grabaciones…', 0.2);
  for(const id of orden){
    const g = await leer('blob:' + id); if(!g) continue;
    try{ pedazos.push({ id, nombre: g.nombre, audio: await decodificar(g.blob) }); }catch(e){}
  }
  const fr = await leer('frase'); if(fr){ try{ vozIntro = await decodificar(fr.blob); }catch(e){} }
  const mu = await leer('musica'); if(mu){ try{ musicaPropia = prepararMusica(await decodificar(mu.blob)); }catch(e){} }
  ocupado(false);
  pintarIntro(); pintarPedazos(); pintarFrase(); pintarPortada();
  window.ESTUDIO = { pedazos: () => pedazos, final: () => final, agregarBlob, listo: true };
})();
