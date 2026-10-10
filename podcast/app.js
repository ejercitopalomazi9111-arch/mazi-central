/* ESTUDIO · la pantalla
   Dos modos en una sola página: VIDEO (el podcast de la escuela) y AUDIO.
   Lo que se graba o se sube se guarda en el teléfono (IndexedDB) antes de
   procesarlo: cerrar la pestaña por error no puede costar una grabación. El
   trabajo pesado va al trabajador de fondo (trabajo.js). */
import { SR, unir, aWav, tiempo, lufs } from './motor.js';
import { ESTILOS } from './jingle.js';
import { TEMAS, dibujarPortada, aJpeg } from './portada.js';
import { FORMATOS, abrirVideo, planear, exportar, corteDeError, dibujarEntrada, dibujarNombre, dibujarMiniatura, dibujarCuadro, tipoDeVideo } from './video.js';
import { EPISODIOS, TIEMPOS, PODCAST, cuando, guion } from './episodios.js';

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
/* el logo: el de Radio Divergentes (la paloma, en blanco puro para pintarse
   del color del fondo) o uno que suban; sin logo, la entrada usa el nombre */
let logo = { fuente: null, completo: null, chico: null, mascara: false };
const tintes = new Map();
function tenido(img, color){
  if(!img) return null;
  const k = (img._id || (img._id = Math.random())) + color;
  if(tintes.has(k)) return tintes.get(k);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  if(logo.mascara){ g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); }
  tintes.set(k, c); return c;
}
const datos = () => {
  const T = TEMAS[tema] || TEMAS.noche;
  return { nombre: $('#pNombre').value.trim() || 'Mi podcast', episodio: $('#pEpisodio').value.trim(),
    titulo: $('#pTitulo').value.trim(), escuela: $('#pEscuela').value.trim(), tema,
    logo: tenido(logo.completo, T.tinta), logoChico: tenido(logo.chico, '#FFFFFF'),
    marcaAgua: $('#vMarca').checked };
};
async function cargarImagen(src){
  const im = new Image(); im.src = src; await im.decode(); return im;
}
/* un logo subido: si tiene fondo liso (las cuatro esquinas parecidas), el
   fondo se vuelve transparente; los colores del logo se respetan */
async function prepararLogoPropio(blob){
  const bm = await createImageBitmap(blob), max = 1400, k = Math.min(1, max / Math.max(bm.width, bm.height));
  const c = document.createElement('canvas'); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
  const g = c.getContext('2d'); g.drawImage(bm, 0, 0, c.width, c.height);
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data, W = c.width, H = c.height;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const esq = [px(2, 2), px(W - 3, 2), px(2, H - 3), px(W - 3, H - 3)];
  const fondo = [0, 1, 2].map(j => esq.reduce((s, e) => s + e[j], 0) / 4);
  const parejo = esq.every(e => e[3] > 250 && Math.abs(e[0] - fondo[0]) + Math.abs(e[1] - fondo[1]) + Math.abs(e[2] - fondo[2]) < 40);
  if(parejo){
    for(let i = 0; i < d.length; i += 4){
      const dist = Math.abs(d[i] - fondo[0]) + Math.abs(d[i + 1] - fondo[1]) + Math.abs(d[i + 2] - fondo[2]);
      d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (dist - 30) / 90)));
    }
    g.putImageData(im, 0, 0);
  }
  return c;
}
async function ponerLogo(fuente, blob){
  tintes.clear();
  if(fuente === 'divergentes'){
    logo = { fuente, mascara: true, completo: await cargarImagen('marca/radio-divergentes.png'), chico: await cargarImagen('marca/paloma.png') };
  } else if(fuente === 'propio' && blob){
    const c = await prepararLogoPropio(blob);
    logo = { fuente, mascara: false, completo: c, chico: c };
  } else logo = { fuente: null, completo: null, chico: null, mascara: false };
  pintarLogo(); repintarVistas();
}
function pintarLogo(){
  const cv = $('#cvLogo'), g = cv.getContext('2d'), T = TEMAS[tema] || TEMAS.noche;
  g.fillStyle = T.fondo[0]; g.fillRect(0, 0, 160, 160);
  const L = tenido(logo.completo, T.tinta);
  if(L){ const k = Math.min(140 / L.width, 140 / L.height); g.drawImage(L, 80 - L.width * k / 2, 80 - L.height * k / 2, L.width * k, L.height * k); }
  else { g.fillStyle = T.suave; g.font = '700 22px system-ui'; g.textAlign = 'center'; g.fillText('sin logo', 80, 86); g.textAlign = 'left'; }
  document.querySelectorAll('[data-logo]').forEach(b => b.setAttribute('aria-pressed', String(
    (b.dataset.logo === 'divergentes' && logo.fuente === 'divergentes') || (b.dataset.logo === 'ninguno' && !logo.fuente))));
}
$('#logos').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-logo]'); if(!b) return;
  const f = b.dataset.logo === 'divergentes' ? 'divergentes' : null;
  await ponerLogo(f); guardar('logo', { fuente: f });
});
$('#fLogo').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if(!f) return;
  try{ await ponerLogo('propio', f); await guardar('logo', { fuente: 'propio', blob: f }); aviso('Listo: tu logo va en la entrada, la portada y la miniatura.'); }
  catch(err){ aviso('No pude abrir ese logo.'); }
});
$('#vMarca') && $('#vMarca').addEventListener('change', () => guardar('vmarca', $('#vMarca').checked));
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
$('#temas').addEventListener('click', (e) => { const b = e.target.closest('[data-tema]'); if(!b) return; tema = b.dataset.tema; pintarTemas(); pintarLogo(); repintarVistas(); guardarDatos(); });

/* ══════════════════════════════════════════════════════════════════════
   LOS EPISODIOS · el orden del pizarrón y la escaleta de cada tema
   ═════════════════════════════════════════════════════════════════════ */
let epElegido = 0;
function pintarEpisodios(){
  const porSemana = {};
  EPISODIOS.forEach(ep => { const c = cuando(ep.n); (porSemana[c.semana] = porSemana[c.semana] || []).push([ep, c]); });
  $('#listaEpisodios').innerHTML = Object.entries(porSemana).map(([sem, eps]) =>
    '<p class="semana-t">Semana '+sem+'</p><div class="eps">'+ eps.map(([ep, c]) =>
      '<button class="ep" type="button" data-ep="'+ep.n+'" aria-pressed="'+(epElegido === ep.n)+'">'+
      '<span class="ep-n">'+ep.n+'</span><span><b>'+esc(ep.titulo)+'</b></span>'+
      '<span class="ep-h">hora '+c.hora+'</span></button>').join('') +'</div>').join('');
  const ep = EPISODIOS.find(x => x.n === epElegido), caja = $('#epGuion');
  caja.hidden = !ep;
  if(!ep) return;
  caja.innerHTML = '<h3>'+ep.n+' · '+esc(ep.titulo)+'</h3><p class="gancho">«'+esc(ep.gancho)+'»</p><ol>'+
    TIEMPOS.map(([m, q, d], i) => {
      const txt = i === 1 ? 'Gancho: ' + ep.gancho : i >= 2 && i <= 4 ? ep.bloques[i - 2] : i === 5 ? ep.dilema : d;
      return '<li><time>'+m+'</time><span><b>'+esc(q)+'</b>'+esc(txt)+'</span></li>';
    }).join('') +'</ol>'+
    '<p class="semana-t">Para investigar</p><ul class="inv">'+ep.investigar.map(x => '<li>'+esc(x)+'</li>').join('')+'<li>Fechas y cifras: cada una con su fuente.</li></ul>'+
    (ep.cuidado ? '<p class="cuidado"><b>Ojo:</b> '+esc(ep.cuidado)+'</p>' : '')+
    '<div class="fila-btn"><button class="btn" type="button" id="bCopiarGuion">'+ico('check')+'Copiar el guion</button></div>';
}
$('#listaEpisodios').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ep]'); if(!b) return;
  epElegido = +b.dataset.ep; const ep = EPISODIOS.find(x => x.n === epElegido);
  $('#pEpisodio').value = String(ep.n); $('#pTitulo').value = ep.titulo;
  guardarDatos(); guardar('episodio', epElegido); pintarEpisodios(); repintarVistas();
  $('#epGuion').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
$('#epGuion').addEventListener('click', async (e) => {
  if(!e.target.closest('#bCopiarGuion')) return;
  const ep = EPISODIOS.find(x => x.n === epElegido);
  try{ await navigator.clipboard.writeText(guion(ep)); aviso('Guion copiado: pégalo en las notas del equipo.'); }
  catch(err){ aviso('No se pudo copiar; mantén presionado el texto para copiarlo.'); }
});

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
    '<div class="que"><b>'+(k + 1)+' · '+esc(c.nombre)+'</b><small>'+tiempo(c.dur)+(c.w ? ' · ' + (c.w >= c.h ? 'horizontal' : 'vertical') : '')+'</small>'+
      etiquetasDe(c)+'</div>'+
    '<div class="acc">'+
      '<button class="mini" type="button" data-vacc="edita" aria-label="Editar «'+esc(c.nombre)+'»">'+ico('pencil')+'</button>'+
      '<button class="mini" type="button" data-vacc="sube" aria-label="Subir"'+(k === 0 ? ' disabled' : '')+'>'+ico('arrow-up')+'</button>'+
      '<button class="mini" type="button" data-vacc="borra" aria-label="Borrar">'+ico('trash')+'</button>'+
    '</div></li>').join('');
  const hay = clips.length > 0;
  $('#bPlanear').disabled = !hay; $('#bExportar').disabled = !hay; $('#bKitAudio').disabled = !hay;
  pintarMiniatura();
}
function etiquetasDe(c){
  const e = c.edicion || {}, t = [];
  if((+e.ini || 0) > 0.05 || (e.fin && e.fin < c.dur - 0.05)) t.push(ico('scissors') + 'Recortado');
  if(e.cortes && e.cortes.length) t.push(ico('scissors') + e.cortes.length + (e.cortes.length === 1 ? ' pedazo fuera' : ' pedazos fuera'));
  if(c.marcas && c.marcas.length) t.push(ico('undo-2') + c.marcas.length + (c.marcas.length === 1 ? ' error borrado' : ' errores borrados'));
  if(c.cartel) t.push(ico('flag') + 'Cartel: ' + esc(c.cartel));
  return t.length ? '<span class="etiquetas">' + t.map(x => '<span class="etiqueta">' + x + '</span>').join('') + '</span>' : '';
}
const metaDe = (c) => ({ edicion: c.edicion || null, marcas: c.marcas || [], cartel: c.cartel || '' });
async function agregarVideo(blob, nombre, meta){
  const id = nuevoId('v');
  await guardar('vclip:' + id, { blob, nombre });       /* primero se guarda */
  if(meta) await guardar('vmeta:' + id, meta);
  try{
    const info = await abrirVideo(blob, decodificar);
    const c = Object.assign({ id, nombre, blob, limpio: null }, meta || {}, info);
    c.mini = await miniaturaDe(c.url, Math.min(1, c.dur / 3));
    clips.push(c);
    await guardar('vorden', clips.map(x => x.id));
    plan = null; $('#resPlan').hidden = true; pintarClips();
  }catch(err){
    await guardar('vclip:' + id, undefined); await guardar('vmeta:' + id, undefined);
    aviso('No pude abrir «' + nombre + '». Prueba con un .mov o .mp4.');
    return false;
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
  if(b.dataset.vacc === 'edita'){ abrirEditor(clips[k]); return; }
  if(b.dataset.vacc === 'sube' && k > 0) [clips[k - 1], clips[k]] = [clips[k], clips[k - 1]];
  if(b.dataset.vacc === 'borra'){
    if(!confirm('¿Borrar «' + clips[k].nombre + '»? No se puede deshacer.')) return;
    URL.revokeObjectURL(clips[k].url); clips.splice(k, 1); await guardar('vclip:' + id, undefined); await guardar('vmeta:' + id, undefined);
  }
  await guardar('vorden', clips.map(c => c.id));
  plan = null; $('#resPlan').hidden = true; pintarClips();
});

/* ── VIDEO · 1b · LA CABINA ──────────────────────────────────────────────
   Grabar aquí mismo: la cámara de frente, el guion del episodio encima y un
   botón de «me equivoqué». Cada segundo lo grabado se guarda en el teléfono: si
   se cierra la pestaña o se acaba la pila, al volver se recupera. */
const cab = { flujo: null, rec: null, id: null, n: 0, trozos: [], cola: Promise.resolve(), t0: 0, reloj: 0,
  marcas: [], frente: true, ac: null, raf: 0, bloqueo: null, manual: -1, guion: true, nombre: '' };
const aSeg = (m) => { const [a, b] = m.split(':').map(Number); return a * 60 + b; };
function seccionesDelGuion(){
  const ep = EPISODIOS.find(x => x.n === epElegido);
  if(!ep) return null;
  return TIEMPOS.slice(1).map(([m, q, d], j) => { const i = j + 1;
    return { ini: aSeg(m), que: q, txt: i === 1 ? ep.gancho : i >= 2 && i <= 4 ? ep.bloques[i - 2] : i === 5 ? ep.dilema : d }; });
}
/* en qué parte del episodio vas: lo que ya está grabado + lo de ahora */
function pintarApuntador(seg){
  const caja = $('#cabApuntador'), S = seccionesDelGuion();
  caja.hidden = !cab.guion;
  if(!S){ caja.innerHTML = '<span class="ap-que">Sin guion</span><span class="ap-txt">Elige el episodio arriba y aquí sale su guion mientras grabas.</span>'; return; }
  const yaHay = clips.reduce((s, c) => s + c.dur, 0), tEp = 15 + yaHay + seg;
  let i = 0; S.forEach((x, k) => { if(tEp >= x.ini) i = k; });
  if(cab.manual > i) i = Math.min(S.length - 1, cab.manual);
  const fin = S[i + 1] ? S[i + 1].ini : 30 * 60, queda = Math.max(0, fin - tEp);
  caja.innerHTML = '<span class="ap-que">'+esc(S[i].que)+(cab.manual > -1 || seg > 0 ? ' · quedan ' + tiempo(queda) : '')+'</span>'+
    '<span class="ap-txt">'+esc(S[i].txt)+'</span>'+
    (S[i + 1] ? '<span class="ap-sig">Sigue: '+esc(S[i + 1].que)+' — toca para pasar</span>' : '');
  caja.dataset.i = i;
}
$('#cabApuntador').addEventListener('click', () => { const S = seccionesDelGuion(); if(!S) return; cab.manual = Math.min(S.length - 1, (+$('#cabApuntador').dataset.i || 0) + 1); pintarApuntador(cab.rec ? (Date.now() - cab.t0) / 1000 : 0); });
function tipoDeCamara(){
  const M = window.MediaRecorder; if(!M || !M.isTypeSupported) return '';
  return ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => M.isTypeSupported(t)) || '';
}
function revisarGiro(){
  const h = vOpc.formato !== 'vertical', parado = innerHeight > innerWidth, g = $('#cabGirar');
  g.hidden = h ? !parado : parado;
  g.lastChild.textContent = h ? 'Gira el teléfono: el video es horizontal' : 'Pon el teléfono vertical: el video es vertical';
}
function apagarCamara(){
  cancelAnimationFrame(cab.raf);
  if(cab.flujo) cab.flujo.getTracks().forEach(t => t.stop());
  if(cab.ac) cab.ac.close().catch(() => {});
  cab.flujo = null; cab.ac = null; $('#cabNivel').style.width = '0%';
}
async function prenderCamara(){
  apagarCamara();
  const h = vOpc.formato !== 'vertical';
  cab.flujo = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: cab.frente ? 'user' : 'environment', width: { ideal: h ? 1280 : 720 }, height: { ideal: h ? 720 : 1280 }, frameRate: { ideal: 30 } },
    audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
  const v = $('#cabVista'); v.srcObject = cab.flujo; v.classList.toggle('espejo', cab.frente); v.play().catch(() => {});
  try{
    cab.ac = new (window.AudioContext || window.webkitAudioContext)(); const an = cab.ac.createAnalyser(); an.fftSize = 512;
    cab.ac.createMediaStreamSource(cab.flujo).connect(an); const d = new Float32Array(an.fftSize);
    const mira = () => { an.getFloatTimeDomainData(d); let m = 0; for(const x of d) m = Math.max(m, Math.abs(x));
      $('#cabNivel').style.width = Math.min(100, Math.round(m * 140)) + '%'; cab.raf = requestAnimationFrame(mira); };
    mira();
  }catch(e){}
}
async function abrirCabina(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){ aviso('Este navegador no deja grabar aquí. Usa «Cámara del teléfono».'); return; }
  cab.manual = -1; $('#cabina').hidden = false; document.body.classList.add('sin-scroll');
  $('#cabTiempo').textContent = '0:00'; $('#cabAviso').textContent = ''; pintarApuntador(0); revisarGiro();
  try{ await prenderCamara(); }
  catch(e){ cerrarCabina(); aviso('No hay permiso para la cámara o el micrófono. Revísalo en los ajustes del navegador.'); return; }
  try{ cab.bloqueo = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; }catch(e){ cab.bloqueo = null; }
}
async function cerrarCabina(){
  if(cab.rec) await pararCabina();
  apagarCamara(); $('#cabVista').srcObject = null;
  try{ cab.bloqueo && cab.bloqueo.release(); }catch(e){} cab.bloqueo = null;
  $('#cabina').hidden = true; document.body.classList.remove('sin-scroll');
}
const encabezado = () => ({ id: cab.id, tipo: cab.rec ? cab.rec.mimeType : '', n: cab.n, marcas: cab.marcas, nombre: cab.nombre });
function empezarCabina(){
  const tipo = tipoDeCamara();
  cab.id = nuevoId('v'); cab.n = 0; cab.trozos = []; cab.marcas = []; cab.cola = Promise.resolve();
  const ep = EPISODIOS.find(x => x.n === epElegido);
  cab.nombre = (ep ? 'Ep ' + ep.n + ' · ' : '') + 'Toma ' + (clips.length + 1);
  cab.rec = new MediaRecorder(cab.flujo, tipo ? { mimeType: tipo, videoBitsPerSecond: 4e6, audioBitsPerSecond: 128000 } : undefined);
  const id = cab.id;
  cab.rec.ondataavailable = (e) => {
    if(!e.data || !e.data.size) return;
    const k = cab.n++, trozo = e.data; cab.trozos.push(trozo);
    const cab0 = encabezado();
    cab.cola = cab.cola.then(() => guardar('vtrozo:' + id + ':' + k, trozo)).then(() => guardar('grabando', cab0));
  };
  cab.cola = cab.cola.then(() => guardar('grabando', encabezado()));
  cab.rec.start(1000); cab.t0 = Date.now();
  $('#cabina').classList.add('grabando'); $('#cabGrabar').setAttribute('aria-label', 'Parar');
  $('#cabError').disabled = false; $('#cabCamara').disabled = true;
  cab.reloj = setInterval(() => { const s = (Date.now() - cab.t0) / 1000; $('#cabTiempo').textContent = tiempo(s); pintarApuntador(s); }, 250);
}
async function pararCabina(){
  const rec = cab.rec; if(!rec) return;
  const listo = new Promise(r => { rec.onstop = r; });
  if(rec.state !== 'inactive') rec.stop();
  await listo; clearInterval(cab.reloj);
  cab.rec = null;
  $('#cabina').classList.remove('grabando'); $('#cabGrabar').setAttribute('aria-label', 'Grabar');
  $('#cabError').disabled = true; $('#cabCamara').disabled = false;
  await cab.cola;
  const blob = new Blob(cab.trozos, { type: (rec.mimeType || 'video/mp4').split(';')[0] });
  const marcas = cab.marcas.slice(), id = cab.id, n = cab.n;
  $('#cabAviso').textContent = 'Guardando la toma…';
  const ok = await agregarVideo(blob, cab.nombre, { edicion: null, marcas, cartel: '' });
  for(let k = 0; k < n; k++) await guardar('vtrozo:' + id + ':' + k, undefined);
  await guardar('grabando', undefined);
  cab.trozos = [];
  $('#cabAviso').textContent = ok === false ? 'No se pudo abrir la toma' : 'Toma guardada' + (marcas.length ? ' · ' + marcas.length + (marcas.length === 1 ? ' error se borra solo' : ' errores se borran solos') : '');
}
$('#bCabina').addEventListener('click', abrirCabina);
$('#cabCerrar').addEventListener('click', cerrarCabina);
$('#cabGrabar').addEventListener('click', async () => {
  if(cab.rec){ await pararCabina(); return; }
  if(!cab.flujo) return;
  try{ empezarCabina(); }catch(e){ aviso('No se pudo empezar a grabar: ' + e.message); }
});
let tAvisoCab = 0;
$('#cabError').addEventListener('click', () => {
  if(!cab.rec) return;
  const t = (Date.now() - cab.t0) / 1000; cab.marcas.push(+t.toFixed(2));
  cab.cola = cab.cola.then(() => guardar('grabando', encabezado()));
  const a = $('#cabAviso'); a.textContent = 'Listo: esa frase se borra sola. Repítela.'; clearTimeout(tAvisoCab);
  tAvisoCab = setTimeout(() => { a.textContent = ''; }, 2600);
  if(navigator.vibrate) navigator.vibrate(40);
});
$('#cabCamara').addEventListener('click', async () => {
  if(cab.rec) return; cab.frente = !cab.frente;
  try{ await prenderCamara(); }catch(e){ cab.frente = !cab.frente; aviso('No se pudo cambiar de cámara.'); try{ await prenderCamara(); }catch(x){} }
});
$('#cabGuion').addEventListener('click', () => { cab.guion = !cab.guion; $('#cabGuion').setAttribute('aria-pressed', String(cab.guion)); pintarApuntador(cab.rec ? (Date.now() - cab.t0) / 1000 : 0); });
addEventListener('resize', () => { if(!$('#cabina').hidden) revisarGiro(); });
/* si la pestaña se fue a segundo plano a media toma, se cierra la toma: iOS
   corta la cámara y lo grabado hasta ahí ya está a salvo */
document.addEventListener('visibilitychange', () => { if(document.hidden && cab.rec) pararCabina(); });
addEventListener('pagehide', () => { try{ if(cab.rec && cab.rec.state === 'recording') cab.rec.requestData(); }catch(e){} });
async function recuperarToma(){
  const g = await leer('grabando'); if(!g || !g.id) return;
  const trozos = [];
  for(let k = 0; k < (g.n || 0); k++){ const t = await leer('vtrozo:' + g.id + ':' + k); if(t) trozos.push(t); }
  if(trozos.length){
    const ok = await agregarVideo(new Blob(trozos, { type: (g.tipo || 'video/mp4').split(';')[0] }), (g.nombre || 'Toma') + ' (recuperada)', { edicion: null, marcas: g.marcas || [], cartel: '' });
    if(ok !== false) aviso('Recuperé una toma que no se alcanzó a guardar.');
  }
  for(let k = 0; k < (g.n || 0); k++) await guardar('vtrozo:' + g.id + ':' + k, undefined);
  await guardar('grabando', undefined);
}

/* ── VIDEO · 1c · EDITAR UN CLIP ─────────────────────────────────────────
   Lo mínimo que se pide al editar: dónde empieza, dónde acaba, quitar un
   pedazo de en medio y un cartel antes. Nada se corta aquí: se apunta, y el
   corte se hace al exportar. Al reproducir, se brinca lo que se va. */
const ed = { c: null, ini: 0, fin: 0, cortes: [], marcas: [], zonas: [], desde: null, picos: null, raf: 0 };
const edV = $('#edVideo');
const fino = (s) => { const d = Math.max(0, s); return Math.floor(d / 60) + ':' + String(Math.floor(d % 60)).padStart(2, '0') + '.' + Math.floor((d * 10) % 10); };
function quitadosEd(){
  const c = ed.c, z = [];
  if(ed.ini > 0) z.push([0, ed.ini, 'recorte']);
  if(ed.fin < c.dur) z.push([ed.fin, c.dur, 'recorte']);
  ed.cortes.forEach(([a, b]) => z.push([a, b, 'corte']));
  ed.zonas.forEach(([a, b]) => z.push([a, b, 'error']));
  return z;
}
function quedaEd(){
  const z = quitadosEd().map(([a, b]) => [Math.max(0, a), Math.min(ed.c.dur, b)]).sort((x, y) => x[0] - y[0]);
  let fuera = 0, hasta = 0; for(const [a, b] of z){ const A = Math.max(a, hasta); if(b > A) fuera += b - A; hasta = Math.max(hasta, b); }
  return Math.max(0, ed.c.dur - fuera);
}
function abrirEditor(c){
  ed.c = c; const e = c.edicion || {};
  ed.ini = +e.ini || 0; ed.fin = e.fin ? +e.fin : c.dur; ed.cortes = (e.cortes || []).map(x => x.slice());
  ed.marcas = (c.marcas || []).slice(); ed.zonas = ed.marcas.map(t => corteDeError(c.audio, t)); ed.desde = null; ed.picos = null;
  $('#edTitulo').textContent = c.nombre; $('#edCartel').value = c.cartel || '';
  $('#edSugerencias').innerHTML = ['Saludo', 'Bloque 1', 'Bloque 2', 'Bloque 3', 'El dilema', 'Cierre']
    .map(t => '<button class="chip" type="button" data-cartel="'+t+'">'+t+'</button>').join('');
  edV.src = c.url; edV.currentTime = 0;
  $('#editor').hidden = false; document.body.classList.add('sin-scroll');
  pintarEd(); vigilarEd();
}
function cerrarEditor(){ edV.pause(); cancelAnimationFrame(ed.raf); $('#editor').hidden = true; document.body.classList.remove('sin-scroll'); ed.c = null; }
function pintarEd(){
  if(!ed.c) return;
  const c = ed.c, cv = $('#edLinea'), dpr = Math.min(2, devicePixelRatio || 1), W = Math.max(100, Math.round(cv.clientWidth * dpr)), H = Math.round(72 * dpr);
  if(cv.width !== W) cv.width = W;      /* asignar el ancho BORRA el lienzo: sólo si cambió */
  if(cv.height !== H) cv.height = H;
  const g = cv.getContext('2d'), est = getComputedStyle(document.body);
  const tinta = est.getPropertyValue('--tenue').trim() || '#999', acento = est.getPropertyValue('--acento').trim() || '#f55';
  if(!ed.picos || ed.picos.length !== W){
    ed.picos = new Float32Array(W); const por = c.audio.length / W;
    for(let x = 0; x < W; x++){ let m = 0; const a = Math.floor(x * por), b = Math.min(c.audio.length, Math.floor((x + 1) * por)); for(let i = a; i < b; i += 4) m = Math.max(m, Math.abs(c.audio[i])); ed.picos[x] = m; }
  }
  g.clearRect(0, 0, W, H);
  const aX = (t) => t / c.dur * W;
  quitadosEd().forEach(([a, b, q]) => { g.fillStyle = q === 'error' ? 'rgba(255,170,0,.30)' : 'rgba(255,59,48,.26)'; g.fillRect(aX(a), 0, Math.max(2, aX(b) - aX(a)), H); });
  if(ed.desde != null){ const a = Math.min(ed.desde, edV.currentTime), b = Math.max(ed.desde, edV.currentTime); g.fillStyle = 'rgba(255,59,48,.45)'; g.fillRect(aX(a), 0, Math.max(2, aX(b) - aX(a)), H); }
  g.fillStyle = tinta;
  for(let x = 0; x < W; x++){ const h = Math.max(1, Math.min(1, ed.picos[x] * 1.6) * (H - 8)); g.fillRect(x, (H - h) / 2, 1, h); }
  g.fillStyle = acento; const px = aX(edV.currentTime || 0); g.fillRect(Math.round(px) - dpr, 0, 2 * dpr, H);
  $('#edTiempo').textContent = fino(edV.currentTime || 0) + ' / ' + tiempo(c.dur);
  $('#edCorte').lastChild.textContent = ed.desde == null ? 'Quitar desde aquí' : 'Hasta aquí';
  $('#edCorte').classList.toggle('fuerte', ed.desde != null);
  const filas = ed.cortes.map(([a, b], k) => '<li><span>'+ico('scissors')+' Se quita '+fino(a)+' – '+fino(b)+'</span>'+
      '<button class="mini" type="button" data-ir="'+a+'" aria-label="Ver ese pedazo">'+ico('play')+'</button>'+
      '<button class="mini" type="button" data-quita-corte="'+k+'" aria-label="Dejar ese pedazo">'+ico('trash')+'</button></li>')
    .concat(ed.marcas.map((t, k) => '<li><span>'+ico('undo-2')+' Me equivoqué a los '+tiempo(t)+' · se quita '+fino(ed.zonas[k][0])+' – '+fino(Math.min(c.dur, ed.zonas[k][1]))+'</span>'+
      '<button class="mini" type="button" data-ir="'+ed.zonas[k][0]+'" aria-label="Ver ese pedazo">'+ico('play')+'</button>'+
      '<button class="mini" type="button" data-quita-marca="'+k+'" aria-label="Dejar esa frase">'+ico('trash')+'</button></li>'));
  $('#edCortes').innerHTML = filas.join('') + '<li class="ed-queda"><span>Queda <b>'+fino(quedaEd())+'</b> de '+fino(c.dur)+
    (ed.ini > 0 || ed.fin < c.dur ? ' · empieza en '+tiempo(ed.ini)+' y termina en '+tiempo(ed.fin) : '')+'</span></li>';
}
/* mientras suena: brincar lo que se va, y parar al final */
function vigilarEd(){
  cancelAnimationFrame(ed.raf);
  const paso = () => {
    if(!ed.c) return;
    if(!edV.paused && ed.desde == null){
      const t = edV.currentTime, z = quitadosEd().find(([a, b]) => t >= a && t < b - 0.05);
      if(z){ if(z[1] >= ed.c.dur - 0.05 || z[0] >= ed.fin){ edV.pause(); } else edV.currentTime = z[1]; }
    }
    pintarEd(); ed.raf = requestAnimationFrame(paso);
  };
  paso();
}
function irEd(t){ edV.currentTime = Math.max(0, Math.min(ed.c.dur, t)); }
(function(){
  const cv = $('#edLinea'); let arrastra = false;
  const mover = (e) => { const r = cv.getBoundingClientRect(); irEd((e.clientX - r.left) / r.width * ed.c.dur); };
  cv.addEventListener('pointerdown', (e) => { if(!ed.c) return; arrastra = true; try{ cv.setPointerCapture(e.pointerId); }catch(x){} edV.pause(); mover(e); });
  cv.addEventListener('pointermove', (e) => { if(arrastra) mover(e); });
  cv.addEventListener('pointerup', () => { arrastra = false; });
  cv.addEventListener('pointercancel', () => { arrastra = false; });
})();
edV.addEventListener('play', () => { $('#edPlay').innerHTML = ico('pause'); $('#edPlay').setAttribute('aria-label', 'Pausar'); });
edV.addEventListener('pause', () => { $('#edPlay').innerHTML = ico('play'); $('#edPlay').setAttribute('aria-label', 'Reproducir'); });
$('#edPlay').addEventListener('click', () => { if(edV.paused){ if(edV.currentTime >= ed.fin - 0.05) irEd(ed.ini); edV.play().catch(() => {}); } else edV.pause(); });
$('#edAtras').addEventListener('click', () => irEd(edV.currentTime - 1));
$('#edAdelante').addEventListener('click', () => irEd(edV.currentTime + 1));
$('#edIni').addEventListener('click', () => { ed.ini = Math.max(0, Math.min(edV.currentTime, ed.fin - 0.5)); aviso('El clip empieza en ' + tiempo(ed.ini) + '.'); });
$('#edFin').addEventListener('click', () => { ed.fin = Math.min(ed.c.dur, Math.max(edV.currentTime, ed.ini + 0.5)); aviso('El clip termina en ' + tiempo(ed.fin) + '.'); });
$('#edCorte').addEventListener('click', () => {
  if(ed.desde == null){ ed.desde = edV.currentTime; aviso('Avanza hasta donde acaba lo que quitas y toca «Hasta aquí».'); return; }
  const a = Math.min(ed.desde, edV.currentTime), b = Math.max(ed.desde, edV.currentTime); ed.desde = null;
  if(b - a < 0.2){ aviso('Ese pedazo es muy chico: mueve el video antes de tocar «Hasta aquí».'); return; }
  ed.cortes.push([+a.toFixed(2), +b.toFixed(2)]); ed.cortes.sort((x, y) => x[0] - y[0]);
});
$('#edCortes').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if(!b) return;
  if(b.dataset.ir != null){ irEd(+b.dataset.ir); edV.play().catch(() => {}); }
  if(b.dataset.quitaCorte != null) ed.cortes.splice(+b.dataset.quitaCorte, 1);
  if(b.dataset.quitaMarca != null){ ed.marcas.splice(+b.dataset.quitaMarca, 1); ed.zonas.splice(+b.dataset.quitaMarca, 1); }
});
$('#edSugerencias').addEventListener('click', (e) => { const b = e.target.closest('[data-cartel]'); if(b) $('#edCartel').value = b.dataset.cartel; });
$('#edBorrar').addEventListener('click', () => { ed.ini = 0; ed.fin = ed.c.dur; ed.cortes = []; ed.marcas = []; ed.zonas = []; ed.desde = null; $('#edCartel').value = ''; });
$('#edCerrar').addEventListener('click', cerrarEditor);
$('#editor').addEventListener('click', (e) => { if(e.target.id === 'editor') cerrarEditor(); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && ed.c) cerrarEditor(); });
$('#edListo').addEventListener('click', async () => {
  const c = ed.c, sinNada = ed.ini <= 0.05 && ed.fin >= c.dur - 0.05 && !ed.cortes.length;
  c.edicion = sinNada ? null : { ini: +ed.ini.toFixed(2), fin: +ed.fin.toFixed(2), cortes: ed.cortes };
  c.marcas = ed.marcas; c.cartel = $('#edCartel').value.trim();
  await guardar('vmeta:' + c.id, metaDe(c));
  cerrarEditor(); plan = null; $('#resPlan').hidden = true; pintarClips();
  aviso('Guardado. Los cortes se hacen al exportar.');
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
    '<div><b>'+(plan.quitado >= 1 ? '−' + tiempo(plan.quitado) : '0:00')+'</b><span>'+(plan.tramos.length - clips.length > 0 ? (plan.tramos.length - clips.length) + (plan.tramos.length - clips.length === 1 ? ' corte' : ' cortes') : 'sin cortes')+'</span></div></div>'+
    (plan.carteles ? '<p class="nota">'+plan.carteles+(plan.carteles === 1 ? ' cartel' : ' carteles')+' entre bloques (+'+tiempo(plan.carteles * 2.5)+')</p>' : '');
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
  if(tramos){ if(!plan) hacerPlan(); plan.orden.forEach(o => p.push(Object.assign({}, o))); }
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
  const po = await leer('portada');
  if(po){ $('#pNombre').value = po.nombre || ''; $('#pEpisodio').value = po.episodio || ''; $('#pTitulo').value = po.titulo || ''; $('#pEscuela').value = po.escuela || ''; tema = po.tema || tema; }
  else { $('#pNombre').value = PODCAST.nombre; tema = 'divergentes'; }   /* la primera vez: el podcast de Carlos ya puesto */
  const lg = await leer('logo');
  try{ await ponerLogo(lg ? lg.fuente : 'divergentes', lg && lg.blob); }catch(e){ await ponerLogo(null); }
  const vm = await leer('vmarca'); if(vm === false) $('#vMarca').checked = false;
  epElegido = (await leer('episodio')) || 0;
  nombres = (await leer('nombres')) || [];
  pintarTemas(); pintarLogo(); pintarEpisodios(); pintarIntro(); pintarOpcionesVideo(); pintarNombres(); pintarPedazos(); pintarClips(); pintarFrase(); repintarVistas();
  const orden = (await leer('orden')) || [], vorden = (await leer('vorden')) || [];
  if(orden.length || vorden.length) ocupado('Recuperando lo que tenías…', 0.2);
  for(const id of orden){
    const g = await leer('blob:' + id); if(!g) continue;
    try{ pedazos.push({ id, nombre: g.nombre, audio: await decodificar(g.blob) }); }catch(e){}
  }
  for(const id of vorden){
    const g = await leer('vclip:' + id); if(!g) continue;
    const meta = await leer('vmeta:' + id);
    try{ const info = await abrirVideo(g.blob, decodificar); const c = Object.assign({ id, nombre: g.nombre, blob: g.blob, limpio: null }, meta || {}, info); c.mini = await miniaturaDe(c.url, Math.min(1, c.dur / 3)); clips.push(c); }catch(e){}
  }
  await recuperarToma();
  const fr = await leer('frase'); if(fr){ try{ vozIntro = await decodificar(fr.blob); }catch(e){} }
  const mu = await leer('musica'); if(mu){ try{ musicaPropia = prepararMusica(await decodificar(mu.blob)); }catch(e){} }
  ocupado(false);
  pintarIntro(); pintarPedazos(); pintarClips(); pintarFrase(); repintarVistas();
  window.ESTUDIO = { pedazos: () => pedazos, clips: () => clips, editor: () => ed, final: () => final, video: () => videoFinal, plan: () => plan, listo: true };
})();
