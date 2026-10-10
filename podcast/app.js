/* ESTUDIO · la pantalla
   Dos modos en una sola página: VIDEO (el podcast de la escuela) y AUDIO.
   Lo que se graba o se sube se guarda en el teléfono (IndexedDB) antes de
   procesarlo: cerrar la pestaña por error no puede costar una grabación. El
   trabajo pesado va al trabajador de fondo (trabajo.js). */
import { SR, unir, aWav, tiempo, lufs } from './motor.js';
import { ESTILOS } from './jingle.js';
import { TEMAS, dibujarPortada, aJpeg } from './portada.js';
import { FORMATOS, abrirVideo, planear, exportar, dibujarEntrada, dibujarNombre, dibujarMiniatura, dibujarCuadro, tipoDeVideo } from './video.js';

const $ = (s) => document.querySelector(s);
const ico = (n) => (window.ICONOS ? window.ICONOS.ico(n) : '');
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = ico(el.dataset.ico); });

/* ── avisos chiquitos y la capa de «trabajando» ───────────────────────── */
let tTost = 0;
function aviso(t){ const e = $('#toston'); e.textContent = t; e.classList.add('vivo'); clearTimeout(tTost); tTost = setTimeout(() => e.classList.remove('vivo'), 3400); }
function ocupado(txt, p, cancelar){
  const c = $('#trabajando');
  if(txt === false){ c.hidden = true; $('#bCancelar').hidden = true; return; }
  c.hidden = false; $('#trTexto').textContent = txt; $('#trBarra').style.width = Math.round((p || 0) * 100) + '%';
  $('#bCancelar').hidden = !cancelar; $('#bCancelar').onclick = cancelar || null;
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
const BD = new Promise((si) => {
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

/* ── decodificar cualquier audio (o el audio de un video) a mono 32 kHz ─ */
async function decodificar(blob){
  const buf = await blob.arrayBuffer();
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Off(1, 1, SR);
  const ab = await new Promise((si, no) => { const p = ctx.decodeAudioData(buf, si, no); if(p && p.then) p.then(si, no); });
  const n = ab.length, out = new Float32Array(n);
  for(let c = 0; c < ab.numberOfChannels; c++){ const d = ab.getChannelData(c); for(let i = 0; i < n; i++) out[i] += d[i] / ab.numberOfChannels; }
  return out;
}

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
const urlWav = (x) => URL.createObjectURL(new Blob([aWav(x)], { type: 'audio/wav' }));
let reproductor = null;
function oir(x){
  if(reproductor){ reproductor.pause(); URL.revokeObjectURL(reproductor.src); }
  reproductor = new Audio(urlWav(x)); reproductor.play().catch(() => {});
}
function bajar(blob, nombre){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
const limpiarNombre = (t, def) => (String(t || '').trim() || def).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || def;
const nuevoId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── el modo: video o audio ───────────────────────────────────────────── */
let modo = 'video';
function ponerModo(m){
  modo = m === 'audio' ? 'audio' : 'video';
  document.body.classList.toggle('modo-video', modo === 'video');
  document.body.classList.toggle('modo-audio', modo === 'audio');
  document.querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.modo === modo)));
  guardar('modo', modo);
}
document.querySelector('.modo').addEventListener('click', (e) => { const b = e.target.closest('[data-modo]'); if(b) ponerModo(b.dataset.modo); });

/* ══════════════════════════════════════════════════════════════════════
   LOS DATOS DEL EPISODIO (sirven a la entrada, la portada y la miniatura)
   ═════════════════════════════════════════════════════════════════════ */
let tema = 'noche', foto = null;
const datos = () => ({ nombre: $('#pNombre').value.trim() || 'Mi podcast', episodio: $('#pEpisodio').value.trim(),
  titulo: $('#pTitulo').value.trim(), escuela: $('#pEscuela').value.trim(), tema });
function guardarDatos(){ guardar('portada', { nombre: $('#pNombre').value, episodio: $('#pEpisodio').value, titulo: $('#pTitulo').value, escuela: $('#pEscuela').value, tema }); }
function pintarTemas(){
  $('#temas').innerHTML = Object.entries(TEMAS).map(([id, t]) =>
    '<button class="chip" type="button" role="radio" data-tema="'+id+'" aria-checked="'+(tema === id)+'">'+
    '<span style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,'+t.fondo[0]+','+t.fondo[1]+');box-shadow:0 0 0 2px '+t.acento+'"></span>'+t.nombre+'</button>').join('');
}
let tPintar = 0;
function repintarVistas(){
  clearTimeout(tPintar);
  tPintar = setTimeout(() => { pintarPortada(); pintarMiniatura(); if(!animandoEntrada) dibujarEntrada($('#cvEntrada').getContext('2d'), 1280, 720, 2.6, 8, datos(), 0.3); }, 60);
}
['pNombre', 'pEpisodio', 'pTitulo', 'pEscuela'].forEach(id => $('#' + id).addEventListener('input', () => { repintarVistas(); guardarDatos(); }));
$('#temas').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if(!b) return; tema = b.dataset.tema; pintarTemas(); repintarVistas(); guardarDatos(); });

/* ══════════════════════════════════════════════════════════════════════
   AUDIO · 1 · LA VOZ
   ═════════════════════════════════════════════════════════════════════ */
let pedazos = [], limpio = null;
function pintarPedazos(){
  const ol = $('#pedazos');
  $('#sinPedazos').hidden = pedazos.length > 0;
  ol.innerHTML = pedazos.map((p, k) =>
    '<li class="pedazo" data-id="'+p.id+'"><span class="orden">'+(k + 1)+'</span>'+
    '<div class="que"><b>'+esc(p.nombre)+'</b><small>'+tiempo(p.audio.length / SR)+'</small><canvas></canvas></div>'+
    '<div class="acc">'+
      '<button class="mini" type="button" data-acc="oir" aria-label="Escuchar">'+ico('play')+'</button>'+
      '<button class="mini" type="button" data-acc="sube" aria-label="Subir"'+(k === 0 ? ' disabled' : '')+'>'+ico('arrow-up')+'</button>'+
      '<button class="mini" type="button" data-acc="borra" aria-label="Borrar">'+ico('trash')+'</button>'+
    '</div></li>').join('');
  ol.querySelectorAll('.pedazo').forEach((li, k) => dibujarOnda(li.querySelector('canvas'), pedazos[k].audio));
  $('#bLimpiar').disabled = !pedazos.length;
  $('#bArmar').disabled = !pedazos.length;
}
$('#pedazos').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-acc]'); if(!b) return;
  const id = b.closest('.pedazo').dataset.id, k = pedazos.findIndex(p => p.id === id);
  if(b.dataset.acc === 'oir') return oir(pedazos[k].audio);
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
  const id = nuevoId('p');
  await guardar('blob:' + id, { blob, nombre });
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

function grabadora(alTerminar, alNivel, alTiempo){
  let rec = null, flujo = null, trozos = [], t0 = 0, reloj = 0, ctx = null, raf = 0;
  return {
    get activa(){ return !!rec; },
    async empezar(){
      flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
      const tipo = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      rec = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
      trozos = []; rec.ondataavailable = (e) => { if(e.data && e.data.size) trozos.push(e.data); };
      rec.onstop = () => { const b = new Blob(trozos, { type: rec.mimeType || 'audio/mp4' }); soltar(); alTerminar(b); };
      rec.start(); t0 = Date.now();
      reloj = setInterval(() => alTiempo((Date.now() - t0) / 1000), 250);
      try{
        ctx = new (window.AudioContext || window.webkitAudioContext)(); const an = ctx.createAnalyser(); an.fftSize = 512;
        ctx.createMediaStreamSource(flujo).connect(an); const d = new Float32Array(an.fftSize);
        const mira = () => { an.getFloatTimeDomainData(d); let m = 0; for(const v of d) m = Math.max(m, Math.abs(v)); alNivel(m); raf = requestAnimationFrame(mira); };
        mira();
      }catch(e){}
    },
    parar(){ if(rec && rec.state !== 'inactive') rec.stop(); },
  };
  function soltar(){
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

/* ── AUDIO · 2 · LIMPIAR ─────────────────────────────────────────────── */
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
   3 · ENTRADA Y CIERRE
   ═════════════════════════════════════════════════════════════════════ */
const ICO_ESTILO = { lofi: 'coffee', pop: 'sparkles', noticiero: 'newspaper', acustico: 'guitar' };
let intro = { estilo: 'lofi', segundos: 8, semilla: 1 }, musicaPropia = null, vozIntro = null, cacheMus = {};
function pintarIntro(){
  $('#estilos').innerHTML = Object.entries(ESTILOS).map(([id, e]) =>
    '<button class="chip" type="button" role="radio" data-estilo="'+id+'" aria-checked="'+(intro.estilo === id && !musicaPropia)+'">'+ico(ICO_ESTILO[id])+e.nombre+'</button>').join('');
  document.querySelectorAll('[data-largo]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.largo === intro.segundos)));
  $('#notaMusica').hidden = !musicaPropia;
  if(musicaPropia) $('#notaMusica').textContent = 'Usando tu música (' + tiempo(musicaPropia.length / SR) + '). Toca un estilo para volver a la nuestra.';
}
$('#estilos').addEventListener('click', (e) => { const b = e.target.closest('[data-estilo]'); if(!b) return;
  intro.estilo = b.dataset.estilo; musicaPropia = null; cacheMus = {}; guardar('intro', intro); guardar('musica', undefined); pintarIntro(); });
$('#largos').addEventListener('click', (e) => { const b = e.target.closest('[data-largo]'); if(!b) return;
  intro.segundos = +b.dataset.largo; cacheMus = {}; guardar('intro', intro); pintarIntro(); });
function prepararMusica(a){
  const m = a.subarray(0, Math.min(a.length, SR * 20)).slice();
  const l = lufs(m); if(Number.isFinite(l)){ const g = Math.pow(10, (-20 - l) / 20); for(let i = 0; i < m.length; i++) m[i] *= g; }
  const fo = Math.min(m.length, Math.round(SR * 2)); for(let i = 0; i < fo; i++) m[m.length - 1 - i] *= i / fo;
  return m;
}
async function laMusica(final = 'golpe'){
  if(musicaPropia) return musicaPropia;
  const clave = JSON.stringify(intro) + final;
  if(cacheMus[clave]) return cacheMus[clave];
  const r = await tarea('jingle', Object.assign({}, intro, final === 'fundido' ? { final, segundos: Math.max(6, intro.segundos) } : { final }));
  cacheMus[clave] = r.datos;
  return r.datos;
}
/* ver la entrada: la animación de verdad, con su música, en la vista previa */
let animandoEntrada = false;
async function verEntrada(){
  const mus = await laMusica('golpe'); ocupado(false);
  const cv = $('#cvEntrada'), g = cv.getContext('2d'), dur = mus.length / SR;
  const AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
  const b = ac.createBuffer(1, mus.length, SR); b.getChannelData(0).set(mus);
  const s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination);
  const an = ac.createAnalyser(); s.connect(an); const d = new Float32Array(256);
  const t0 = ac.currentTime + 0.05; s.start(t0); animandoEntrada = true;
  cv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await new Promise(r => {
    const paso = () => {
      const t = ac.currentTime - t0; an.getFloatTimeDomainData(d); let m = 0; for(const v of d) m = Math.max(m, Math.abs(v));
      dibujarEntrada(g, 1280, 720, Math.max(0, t), dur, datos(), Math.min(1, m * 2.5));
      if(t < dur) requestAnimationFrame(paso); else r();
    };
    paso();
  });
  animandoEntrada = false; ac.close().catch(() => {});
}
$('#bOirIntro').addEventListener('click', async () => {
  ocupado('Componiendo…', 0.5);
  try{ if(modo === 'video') await verEntrada(); else oir(await laMusica()); } finally{ ocupado(false); }
});
$('#bOtraIntro').addEventListener('click', async () => {
  intro.semilla = (intro.semilla % 9973) + 1 + Math.floor(Math.random() * 50); cacheMus = {}; musicaPropia = null;
  guardar('intro', intro); pintarIntro(); ocupado('Componiendo otra…', 0.5);
  try{ if(modo === 'video') await verEntrada(); else oir(await laMusica()); } finally{ ocupado(false); }
});
$('#fMusica').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  ocupado('Leyendo tu música…', 0.4);
  try{ musicaPropia = prepararMusica(await decodificar(f)); await guardar('musica', { blob: f }); pintarIntro(); aviso('Listo: tu música va de entrada.'); }
  catch(err){ aviso('No pude leer esa música.'); }
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

/* ── AUDIO · 4 · ARMAR Y BAJAR ───────────────────────────────────────── */
let final = null, mp3 = null;
$('#eArchivo').addEventListener('input', () => guardar('archivo', $('#eArchivo').value));
$('#bArmar').addEventListener('click', async () => {
  try{
    if(!limpio) await hacerLimpio();
    ocupado('Componiendo la entrada…', 0.25);
    const mus = await laMusica('golpe');
    const cierre = $('#oCierre').checked ? (musicaPropia || await laMusica('fundido')) : null;
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
const nombreAudio = () => limpiarNombre($('#eArchivo').value, 'mi-podcast');
$('#bMp3').addEventListener('click', async () => { try{ bajar(await elMp3(), nombreAudio() + '.mp3'); }catch(e){ aviso('No salió el MP3: ' + e.message); } });
$('#bWav').addEventListener('click', () => final && bajar(new Blob([aWav(final)], { type: 'audio/wav' }), nombreAudio() + '.wav'));
$('#bCompartir').addEventListener('click', async () => {
  try{ const f = new File([await elMp3()], nombreAudio() + '.mp3', { type: 'audio/mpeg' }); await navigator.share({ files: [f], title: nombreAudio() }); }
  catch(e){ if(e && e.name !== 'AbortError') aviso('No se pudo compartir.'); }
});

/* ══════════════════════════════════════════════════════════════════════
   VIDEO · 1 · CLIPS
   ═════════════════════════════════════════════════════════════════════ */
let clips = [];            /* {id, nombre, blob, url, dur, w, h, audio, limpio, mini} */
let vOpc = { formato: 'horizontal', encuadre: 'llenar', alto: false };
let plan = null;
async function miniaturaDe(url, seg = 1){
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = url;
  await new Promise(r => { v.onloadeddata = r; setTimeout(r, 3000); });
  v.currentTime = Math.min(seg, Math.max(0, (v.duration || 2) - 0.1));
  await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); });
  const c = document.createElement('canvas'); c.width = 144; c.height = 96;
  try{ dibujarCuadro(c.getContext('2d'), v, 144, 96, 'llenar'); }catch(e){}
  v.removeAttribute('src'); v.load();
  try{ return c.toDataURL('image/jpeg', 0.7); }catch(e){ return ''; }
}
function pintarClips(){
  $('#sinClips').hidden = clips.length > 0;
  $('#listaClips').innerHTML = clips.map((c, k) =>
    '<li class="pedazo clip" data-id="'+c.id+'">'+
    (c.mini ? '<img class="clip-mini" src="'+c.mini+'" alt="">' : '<span class="clip-mini"></span>')+
    '<div class="que"><b>'+(k + 1)+' · '+esc(c.nombre)+'</b><small>'+tiempo(c.dur)+(c.w ? ' · ' + (c.w >= c.h ? 'horizontal' : 'vertical') : '')+'</small></div>'+
    '<div class="acc">'+
      '<button class="mini" type="button" data-vacc="sube" aria-label="Subir"'+(k === 0 ? ' disabled' : '')+'>'+ico('arrow-up')+'</button>'+
      '<button class="mini" type="button" data-vacc="borra" aria-label="Borrar">'+ico('trash')+'</button>'+
    '</div></li>').join('');
  const hay = clips.length > 0;
  $('#bPlanear').disabled = !hay; $('#bExportar').disabled = !hay; $('#bKitAudio').disabled = !hay;
  pintarMiniatura();
}
async function agregarVideo(blob, nombre){
  const id = nuevoId('v');
  await guardar('vclip:' + id, { blob, nombre });       /* primero se guarda */
  try{
    const info = await abrirVideo(blob, decodificar);
    const c = Object.assign({ id, nombre, blob, limpio: null }, info);
    c.mini = await miniaturaDe(c.url, Math.min(1, c.dur / 3));
    clips.push(c);
    await guardar('vorden', clips.map(x => x.id));
    plan = null; $('#resPlan').hidden = true; pintarClips();
  }catch(err){
    await guardar('vclip:' + id, undefined);
    aviso('No pude abrir «' + nombre + '». Prueba con un .mov o .mp4.');
  }
}
async function subirVideos(fs){
  for(let i = 0; i < fs.length; i++){ ocupado('Abriendo ' + fs[i].name + '…', i / fs.length); await agregarVideo(fs[i], fs[i].name.replace(/\.[^.]+$/, '')); }
  ocupado(false);
}
$('#fVideos').addEventListener('change', (e) => { const fs = [...e.target.files]; e.target.value = ''; subirVideos(fs); });
$('#fCamara').addEventListener('change', (e) => { const fs = [...e.target.files]; e.target.value = ''; subirVideos(fs); });
$('#listaClips').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-vacc]'); if(!b) return;
  const id = b.closest('.pedazo').dataset.id, k = clips.findIndex(c => c.id === id);
  if(b.dataset.vacc === 'sube' && k > 0) [clips[k - 1], clips[k]] = [clips[k], clips[k - 1]];
  if(b.dataset.vacc === 'borra'){
    if(!confirm('¿Borrar «' + clips[k].nombre + '»? No se puede deshacer.')) return;
    URL.revokeObjectURL(clips[k].url); clips.splice(k, 1); await guardar('vclip:' + id, undefined);
  }
  await guardar('vorden', clips.map(c => c.id));
  plan = null; $('#resPlan').hidden = true; pintarClips();
});

/* ── VIDEO · 2 · EDICIÓN ─────────────────────────────────────────────── */
function pintarOpcionesVideo(){
  $('#formatos').innerHTML = Object.entries(FORMATOS).map(([id, f]) =>
    '<button class="chip" type="button" role="radio" data-formato="'+id+'" aria-checked="'+(vOpc.formato === id)+'">'+
    ico(id === 'horizontal' ? 'rectangle-horizontal' : 'rectangle-vertical')+f.nombre+'</button>').join('');
  document.querySelectorAll('[data-encuadre]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.encuadre === vOpc.encuadre)));
  document.querySelectorAll('[data-alto]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.alto === '1') === !!vOpc.alto)));
}
$('#formatos').addEventListener('click', (e) => { const b = e.target.closest('[data-formato]'); if(!b) return; vOpc.formato = b.dataset.formato; pintarOpcionesVideo(); guardar('vopc', vOpc); });
$('#encuadres').addEventListener('click', (e) => { const b = e.target.closest('[data-encuadre]'); if(!b) return; vOpc.encuadre = b.dataset.encuadre; pintarOpcionesVideo(); guardar('vopc', vOpc); });
$('#calidades').addEventListener('click', (e) => { const b = e.target.closest('[data-alto]'); if(!b) return; vOpc.alto = b.dataset.alto === '1'; pintarOpcionesVideo(); guardar('vopc', vOpc); });
['vCortar', 'vLimpiar'].forEach(id => $('#' + id).addEventListener('change', () => {
  plan = null; $('#resPlan').hidden = true; if(id === 'vLimpiar') clips.forEach(c => { c.limpio = null; });
  guardar('vlimpio', { cortar: $('#vCortar').checked, limpiar: $('#vLimpiar').checked });
}));
function hacerPlan(){
  plan = planear(clips, { cortar: $('#vCortar').checked });
  const original = clips.reduce((s, c) => s + c.dur, 0);
  const caja = $('#resPlan'); caja.hidden = false;
  caja.innerHTML = '<div class="cifras">'+
    '<div><b>'+tiempo(original)+'</b><span>grabado</span></div>'+
    '<div><b>'+tiempo(plan.total)+'</b><span>queda</span></div>'+
    '<div><b>'+(plan.quitado >= 1 ? '−' + tiempo(plan.quitado) : '0:00')+'</b><span>'+(plan.tramos.length - clips.length > 0 ? (plan.tramos.length - clips.length) + (plan.tramos.length - clips.length === 1 ? ' corte' : ' cortes') : 'sin cortes')+'</span></div></div>';
  return plan;
}
$('#bPlanear').addEventListener('click', () => { hacerPlan(); aviso('Así queda. Los cortes se hacen al exportar.'); });
/* el audio limpio de cada clip, SIN quitar silencios: tiene que durar lo
   mismo que el video para que la boca y la voz coincidan */
async function audiosLimpios(){
  const limpiar = $('#vLimpiar').checked;
  for(let i = 0; i < clips.length; i++){
    const c = clips[i];
    if(c.limpio) continue;
    if(!limpiar){ c.limpio = c.audio; continue; }
    ocupado('Limpiando el audio del clip ' + (i + 1) + ' de ' + clips.length + '…', i / clips.length);
    const r = await tarea('limpiar', { audio: Float32Array.from(c.audio), opciones: { silencios: false, parejo: true, ruido: true, zumbido: true } });
    c.limpio = r.datos;
  }
}

/* ── VIDEO · 4 · NOMBRES ─────────────────────────────────────────────── */
let nombres = [];
function pintarNombres(){
  $('#listaNombres').innerHTML = nombres.map((n, k) =>
    '<li class="nombre-fila" data-k="'+k+'">'+
    '<label class="campo">Nombre<input data-n="nombre" maxlength="30" value="'+esc(n.nombre)+'" placeholder="Ana Pérez"></label>'+
    '<label class="campo">Qué hace<input data-n="rol" maxlength="30" value="'+esc(n.rol)+'" placeholder="Conduce"></label>'+
    '<label class="campo">Segundo<input data-n="en" inputmode="numeric" maxlength="5" value="'+esc(n.en)+'"></label>'+
    '<button class="mini" type="button" data-quita="'+k+'" aria-label="Quitar a '+esc(n.nombre || 'esta persona')+'">'+ico('trash')+'</button></li>').join('');
}
$('#listaNombres').addEventListener('input', (e) => {
  const i = e.target.closest('[data-n]'); if(!i) return; const k = +i.closest('[data-k]').dataset.k;
  nombres[k][i.dataset.n] = i.dataset.n === 'en' ? i.value.replace(/[^0-9]/g, '') : i.value; guardar('nombres', nombres);
});
$('#listaNombres').addEventListener('click', (e) => { const b = e.target.closest('[data-quita]'); if(!b) return; nombres.splice(+b.dataset.quita, 1); pintarNombres(); guardar('nombres', nombres); });
$('#bMasNombre').addEventListener('click', () => {
  const ultimo = nombres[nombres.length - 1];
  nombres.push({ nombre: '', rol: '', en: String(ultimo ? (+ultimo.en || 0) + 6 : 2) });
  pintarNombres(); guardar('nombres', nombres);
  const ins = $('#listaNombres').querySelectorAll('input[data-n="nombre"]'); ins[ins.length - 1].focus();
});
const nombresListos = () => nombres.filter(n => n.nombre.trim()).map(n => ({ nombre: n.nombre.trim(), rol: n.rol.trim(), en: +n.en || 0, dura: 5 }));

/* ── VIDEO · 5 · EXPORTAR ────────────────────────────────────────────── */
let videoFinal = null;
const nombreVideo = () => limpiarNombre($('#eArchivoV').value, limpiarNombre(datos().nombre + (datos().episodio ? '-ep' + datos().episodio : ''), 'mi-podcast'));
const extDe = (b) => /mp4/.test(b.type) ? 'mp4' : 'webm';
$('#eArchivoV').addEventListener('input', () => guardar('archivoV', $('#eArchivoV').value));
async function piezasDe({ entrada = true, tramos = true, cierre = true }){
  const p = [];
  if(entrada){ ocupado('Componiendo la entrada…', 0.1); const m = await laMusica('golpe'); p.push({ tipo: 'entrada', audio: m, dur: m.length / SR }); }
  if(tramos){ if(!plan) hacerPlan(); plan.tramos.forEach(t => p.push(Object.assign({ tipo: 'tramo' }, t))); }
  if(cierre){ ocupado('Componiendo el cierre…', 0.2); const m = musicaPropia || await laMusica('fundido'); p.push({ tipo: 'cierre', audio: m, dur: Math.max(5, m.length / SR) }); }
  return p;
}
let bloqueo = null;
async function grabarVideo(piezas, que){
  if(!tipoDeVideo()){ aviso('Este navegador no puede hacer video. Prueba en Safari o Chrome actualizados.'); return null; }
  try{ bloqueo = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; }catch(e){ bloqueo = null; }
  const senal = {};
  const total = piezas.reduce((s, p) => s + (p.tipo === 'tramo' ? p.b - p.a : p.dur), 0);
  ocupado('Grabando ' + que + '… 0:00 de ' + tiempo(total), 0, () => senal.cancelar && senal.cancelar());
  try{
    const blob = await exportar({ piezas, clips: clips.map(c => ({ url: c.url, audioLimpio: c.limpio })), formato: vOpc.formato,
      modo: vOpc.encuadre, datos: datos(), nombres: nombresListos(), alto: vOpc.alto },
      (p, t, T) => ocupado('Grabando ' + que + '… ' + tiempo(t) + ' de ' + tiempo(T), p, () => senal.cancelar && senal.cancelar()), senal);
    return blob;
  } finally{
    ocupado(false);
    try{ bloqueo && bloqueo.release(); }catch(e){}
  }
}
$('#bExportar').addEventListener('click', async () => {
  try{
    await audiosLimpios();
    const piezas = await piezasDe({ entrada: true, tramos: true, cierre: $('#oCierre').checked });
    const b = await grabarVideo(piezas, 'el video');
    if(!b){ aviso('Cancelado.'); return; }
    videoFinal = b;
    const v = $('#verFinal'); if(v.src) URL.revokeObjectURL(v.src); v.src = URL.createObjectURL(b);
    $('#finalV').hidden = false;
    $('#datosFinalV').textContent = 'Listo · ' + (b.size / 1048576).toFixed(1) + ' MB · ' + extDe(b).toUpperCase();
    $('#bCompartirVideo').hidden = !(navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(8)], 'x.' + extDe(b), { type: b.type })] }));
    $('#finalV').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }catch(e){ ocupado(false); aviso('Algo falló al hacer el video: ' + e.message); }
});
$('#bBajarVideo').addEventListener('click', () => videoFinal && bajar(videoFinal, nombreVideo() + '.' + extDe(videoFinal)));
$('#bCompartirVideo').addEventListener('click', async () => {
  try{ await navigator.share({ files: [new File([videoFinal], nombreVideo() + '.' + extDe(videoFinal), { type: videoFinal.type })] }); }
  catch(e){ if(e && e.name !== 'AbortError') aviso('No se pudo compartir.'); }
});
/* el kit para CapCut o iMovie */
$('#bKitEntrada').addEventListener('click', async () => {
  try{ const b = await grabarVideo(await piezasDe({ entrada: true, tramos: false, cierre: false }), 'la entrada'); if(b) bajar(b, nombreVideo() + '-entrada.' + extDe(b)); }
  catch(e){ ocupado(false); aviso('No salió la entrada: ' + e.message); }
});
$('#bKitCierre').addEventListener('click', async () => {
  try{ const b = await grabarVideo(await piezasDe({ entrada: false, tramos: false, cierre: true }), 'el cierre'); if(b) bajar(b, nombreVideo() + '-cierre.' + extDe(b)); }
  catch(e){ ocupado(false); aviso('No salió el cierre: ' + e.message); }
});
$('#bKitAudio').addEventListener('click', async () => {
  try{
    await audiosLimpios();
    for(let i = 0; i < clips.length; i++){
      ocupado('Haciendo el MP3 del clip ' + (i + 1) + '…', i / clips.length);
      const r = await tarea('mp3', { audio: clips[i].limpio.slice(), kbps: 128 });
      bajar(new Blob([r.datos], { type: 'audio/mpeg' }), nombreVideo() + '-audio-' + (i + 1) + '.mp3');
    }
  } catch(e){ aviso('No salió el audio: ' + e.message); } finally{ ocupado(false); }
});
$('#bKitNombres').addEventListener('click', async () => {
  const ns = nombresListos(); if(!ns.length){ aviso('Primero agrega a alguien en «Nombres en pantalla».'); return; }
  const F = FORMATOS[vOpc.formato];
  for(const n of ns){
    const c = document.createElement('canvas'); c.width = F.w * 1.5; c.height = F.h * 1.5;
    dibujarNombre(c.getContext('2d'), c.width, c.height, 2, 5, n, tema);
    const b = await new Promise(r => c.toBlob(r, 'image/png'));
    bajar(b, 'nombre-' + limpiarNombre(n.nombre, 'persona') + '.png');
    await new Promise(r => setTimeout(r, 300));
  }
});

/* ══════════════════════════════════════════════════════════════════════
   PORTADA Y MINIATURA
   ═════════════════════════════════════════════════════════════════════ */
function pintarPortada(){
  dibujarPortada($('#cvPortada'), Object.assign(datos(), { foto, onda: final || limpio || (pedazos[0] && pedazos[0].audio) || (clips[0] && clips[0].audio) || null }));
  $('#bSinFoto').hidden = !foto;
}
let vMini = null, tMini = 0;
async function pintarMiniatura(){
  clearTimeout(tMini);
  tMini = setTimeout(async () => {
    const cv = $('#cvMini');
    if(clips[0]){
      if(!vMini || vMini.dataset.url !== clips[0].url){
        vMini = document.createElement('video'); vMini.muted = true; vMini.playsInline = true; vMini.src = clips[0].url; vMini.dataset.url = clips[0].url;
        await new Promise(r => { vMini.onloadeddata = r; setTimeout(r, 3000); });
      }
      vMini.currentTime = Math.max(0, Math.min(clips[0].dur - 0.1, clips[0].dur * (+$('#rMini').value / 100)));
      await new Promise(r => { vMini.onseeked = r; setTimeout(r, 2000); });
    }
    dibujarMiniatura(cv, clips[0] ? vMini : null, datos());
  }, 80);
}
$('#rMini').addEventListener('input', pintarMiniatura);
$('#bMini').addEventListener('click', async () => {
  const b = await new Promise(r => $('#cvMini').toBlob(r, 'image/jpeg', 0.9));
  bajar(b, 'miniatura-' + nombreVideo() + '.jpg');
});
$('#fFoto').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  try{ foto = await createImageBitmap(f); pintarPortada(); }catch(err){ aviso('No pude abrir esa foto.'); }
});
$('#bSinFoto').addEventListener('click', () => { foto = null; pintarPortada(); });
$('#bPortada').addEventListener('click', async () => {
  ocupado('Haciendo la portada en 3000 px…', 0.5);
  try{
    const cv = document.createElement('canvas'); cv.width = cv.height = 3000;
    dibujarPortada(cv, Object.assign(datos(), { foto, onda: final || limpio || (pedazos[0] && pedazos[0].audio) || (clips[0] && clips[0].audio) || null }));
    bajar(await aJpeg(cv), 'portada-' + (modo === 'video' ? nombreVideo() : nombreAudio()) + '.jpg');
  } finally{ ocupado(false); }
});

/* ══════════════════════════════════════════════════════════════════════
   AL ABRIR: recuperar lo que había
   ═════════════════════════════════════════════════════════════════════ */
(async function(){
  const m = await leer('modo'); ponerModo(m || 'video');
  const op = await leer('opciones'); if(op) Object.entries({ oSilencios: op.silencios, oParejo: op.parejo, oRuido: op.ruido, oZumbido: op.zumbido }).forEach(([k, v]) => { $('#' + k).checked = v !== false; });
  const vl = await leer('vlimpio'); if(vl){ $('#vCortar').checked = vl.cortar !== false; $('#vLimpiar').checked = vl.limpiar !== false; }
  const it = await leer('intro'); if(it) intro = Object.assign(intro, it);
  const vo = await leer('vopc'); if(vo) vOpc = Object.assign(vOpc, vo);
  const ar = await leer('archivo'); if(ar) $('#eArchivo').value = ar;
  const av = await leer('archivoV'); if(av) $('#eArchivoV').value = av;
  const po = await leer('portada'); if(po){ $('#pNombre').value = po.nombre || ''; $('#pEpisodio').value = po.episodio || ''; $('#pTitulo').value = po.titulo || ''; $('#pEscuela').value = po.escuela || ''; tema = po.tema || tema; }
  nombres = (await leer('nombres')) || [];
  pintarTemas(); pintarIntro(); pintarOpcionesVideo(); pintarNombres(); pintarPedazos(); pintarClips(); pintarFrase(); repintarVistas();
  const orden = (await leer('orden')) || [], vorden = (await leer('vorden')) || [];
  if(orden.length || vorden.length) ocupado('Recuperando lo que tenías…', 0.2);
  for(const id of orden){
    const g = await leer('blob:' + id); if(!g) continue;
    try{ pedazos.push({ id, nombre: g.nombre, audio: await decodificar(g.blob) }); }catch(e){}
  }
  for(const id of vorden){
    const g = await leer('vclip:' + id); if(!g) continue;
    try{ const info = await abrirVideo(g.blob, decodificar); const c = Object.assign({ id, nombre: g.nombre, blob: g.blob, limpio: null }, info); c.mini = await miniaturaDe(c.url, Math.min(1, c.dur / 3)); clips.push(c); }catch(e){}
  }
  const fr = await leer('frase'); if(fr){ try{ vozIntro = await decodificar(fr.blob); }catch(e){} }
  const mu = await leer('musica'); if(mu){ try{ musicaPropia = prepararMusica(await decodificar(mu.blob)); }catch(e){} }
  ocupado(false);
  pintarIntro(); pintarPedazos(); pintarClips(); pintarFrase(); repintarVistas();
  window.ESTUDIO = { pedazos: () => pedazos, clips: () => clips, final: () => final, video: () => videoFinal, plan: () => plan, listo: true };
})();
