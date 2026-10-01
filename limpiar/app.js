/* LIMPIAR FOTOS · la pantalla. El análisis está en analisis.js. */
import * as A from './analisis.js';

const ATAJO = 'Limpiar fotos Mazi';
const $ = (s) => document.querySelector(s);
let fotos = [];          // ver `analizar`
let corriendo = 0;

/* ── leer una foto: lo que hace falta para decidir, y una miniatura ── */
const lienzo = document.createElement('canvas'), cx = lienzo.getContext('2d', { willReadFrequently: true });

function cargarImagen(url){
  return new Promise((ok, mal) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => mal(new Error('no se pudo abrir')); im.src = url; });
}
function gris(datos){ const g = new Uint8Array(datos.length / 4); for(let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (datos[j] * 77 + datos[j + 1] * 150 + datos[j + 2] * 29) >> 8; return g; }
function miniatura(fuente, w, h){
  const k = Math.min(1, 240 / Math.min(w, h)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(fuente, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b ? URL.createObjectURL(b) : ''), 'image/jpeg', 0.72));
}

async function analizarFoto(file, f){
  const cabeza = new Uint8Array(await file.slice(0, 131072).arrayBuffer());
  const ex = A.leerExif(cabeza);
  f.camara = !!(ex.marca || ex.modelo);
  const txt = A.fechaExif(ex.fecha) || A.fechaExif(ex.fechaArchivo);
  /* sólo la fecha de CAPTURA sirve: con ella el atajo encuentra la foto. La
     del archivo, en el iPhone, puede ser la hora en que se eligió. */
  f.fecha = txt ? new Date(txt.replace(' ', 'T')).getTime() : null;
  f.fechaArchivo = file.lastModified || null;
  const url = URL.createObjectURL(file);
  try{
    const im = await cargarImagen(url);
    const w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 512 / Math.max(w, h));
    f.ancho = w; f.alto = h;
    lienzo.width = Math.max(1, Math.round(w * k)); lienzo.height = Math.max(1, Math.round(h * k));
    cx.drawImage(im, 0, 0, lienzo.width, lienzo.height);
    const g = gris(cx.getImageData(0, 0, lienzo.width, lienzo.height).data);
    Object.assign(f, A.medir(g, lienzo.width, lienzo.height));
    f.huella = A.huella(A.reducir(g, lienzo.width, lienzo.height));
    f.captura = !f.camara && (A.diceCaptura(cabeza) || (A.esTamanoDePantalla(w, h) && /png/i.test(file.type)));
    f.mini = await miniatura(lienzo, lienzo.width, lienzo.height);
  } finally { URL.revokeObjectURL(url); }
}

function analizarVideo(file, f){
  f.fecha = null; f.fechaArchivo = file.lastModified || null;
  return new Promise((ok) => {
    const v = document.createElement('video'), url = URL.createObjectURL(file);
    let listo = false;
    const fin = () => { if(listo) return; listo = true; v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); ok(); };
    v.muted = true; v.playsInline = true; v.preload = 'metadata';
    v.onloadedmetadata = () => { f.duracion = v.duration; f.ancho = v.videoWidth; f.alto = v.videoHeight; try{ v.currentTime = Math.min(1, (v.duration || 1) / 3); } catch{ fin(); } };
    v.onseeked = async () => { try{ if(v.videoWidth) f.mini = await miniatura(v, v.videoWidth, v.videoHeight); } catch{} fin(); };
    v.onerror = fin;
    setTimeout(fin, 6000);
    v.src = url;
  });
}

async function analizar(file, id){
  const f = { id, file, nombre: file.name || 'foto', peso: file.size, tipo: file.type.startsWith('video/') ? 'video' : 'foto', borrar: false, razon: '', grupo: -1, mejor: false };
  try{
    if(f.tipo === 'video') await analizarVideo(file, f);
    else await analizarFoto(file, f);
  } catch(e){ f.error = e.message || String(e); }
  return f;
}

/* ── elegir y analizar, de dos en dos para no ahogar al teléfono ── */
async function empezar(archivos){
  const lista = [...archivos].filter((f) => /^(image|video)\//.test(f.type));
  if(!lista.length){ $('#estado').textContent = 'Eso no son fotos ni videos.'; $('#avance').hidden = false; return; }
  const turno = ++corriendo;
  for(const f of fotos){ if(f.mini) URL.revokeObjectURL(f.mini); }
  fotos = [];
  $('#inicio').hidden = true; $('#resultado').hidden = true; $('#pie').hidden = true; $('#avance').hidden = false;
  let hechas = 0, sig = 0;
  const avanzar = () => { $('#barra').style.width = (100 * hechas / lista.length) + '%'; $('#estado').textContent = `Revisando ${hechas} de ${lista.length}…`; };
  avanzar();
  const obrero = async () => {
    while(sig < lista.length && turno === corriendo){
      const i = sig++, f = await analizar(lista[i], i);
      fotos[i] = f; hechas++; avanzar();
    }
  };
  await Promise.all([obrero(), obrero()]);
  if(turno !== corriendo) return;
  const malas = fotos.filter((f) => f.error);
  fotos = fotos.filter((f) => !f.error);
  const { veredicto } = A.decidir(fotos);
  for(const f of fotos) Object.assign(f, veredicto.get(f.id));
  $('#avance').hidden = true;
  if(malas.length){ $('#avance').hidden = false; $('#barra').style.width = '100%'; $('#estado').textContent = `${malas.length} no se pudieron abrir y se dejan como están.`; }
  pintar();
}

/* ── la pantalla de resultados ── */
const CATS = [
  { id: 'parecidas', titulo: 'Repetidas y parecidas', que: 'Ráfagas y la misma toma varias veces. De cada grupo se queda la más nítida y mejor iluminada.' },
  { id: 'borrosas', titulo: 'Borrosas o movidas', que: 'Salieron movidas o fuera de foco.' },
  { id: 'negras', titulo: 'Negras o quemadas', que: 'Fotos de bolsillo, casi negras o casi blancas.' },
  { id: 'capturas', titulo: 'Capturas de pantalla', que: 'Las de más de un mes van marcadas; las recientes se quedan.' },
  { id: 'videos', titulo: 'Videos, del más pesado al más ligero', que: 'Ninguno va marcado: tú decides. Son lo que más espacio ocupa.' },
];
function categoria(f){
  if(f.tipo === 'video') return 'videos';
  if(f.grupo >= 0) return 'parecidas';
  if(f.captura) return 'capturas';
  if(/Casi negra|Quemada/.test(f.razon)) return 'negras';
  if(/Borrosa/.test(f.razon)) return 'borrosas';
  return null;
}
const duracion = (s) => !isFinite(s) ? '' : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `0:${String(Math.round(s)).padStart(2, '0')}`;

function tarjeta(f){
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'foto'; b.dataset.id = f.id;
  b.innerHTML = `<img alt="" loading="lazy" decoding="async"><span class="sello"></span><span class="lupa" aria-hidden="true">🔍</span>${f.tipo === 'video' ? `<span class="dur">▶ ${duracion(f.duracion)}</span>` : ''}`;
  if(f.mini) b.querySelector('img').src = f.mini;
  sellar(b, f);
  return b;
}
function sellar(b, f){
  b.setAttribute('aria-pressed', String(f.borrar));
  const s = f.borrar ? '✕ Se va' : f.mejor ? '★ Se queda' : '✓ Se queda';
  b.querySelector('.sello').textContent = f.tipo === 'video' ? `${s} · ${A.peso(f.peso)}` : s;
  b.setAttribute('aria-label', `${f.nombre}: ${f.borrar ? 'se va' : 'se queda'}${f.razon ? '. ' + f.razon : ''}`);
}

function pintar(){
  const cont = $('#categorias');
  cont.replaceChildren();
  const porCat = Object.fromEntries(CATS.map((c) => [c.id, []]));
  for(const f of fotos){ const c = categoria(f); if(c) porCat[c].push(f); }
  porCat.videos.sort((a, b) => b.peso - a.peso);
  for(const c of CATS){
    const lista = porCat[c.id];
    if(!lista.length) continue;
    const s = document.createElement('section');
    s.className = 'cat'; s.dataset.cat = c.id;
    s.innerHTML = `<header><h2>${c.titulo}<small></small></h2><div class="todas"><button type="button" data-todas="va">Todas se van</button><button type="button" data-todas="queda">Todas se quedan</button></div></header><p class="que">${c.que}</p>`;
    if(c.id === 'parecidas'){
      const grupos = new Map();
      for(const f of lista){ if(!grupos.has(f.grupo)) grupos.set(f.grupo, []); grupos.get(f.grupo).push(f); }
      for(const g of grupos.values()){
        g.sort((a, b) => (b.mejor - a.mejor));
        const d = document.createElement('div'); d.className = 'grupo';
        const r = document.createElement('div'); r.className = 'rejilla'; r.append(...g.map(tarjeta));
        d.append(r); s.append(d);
      }
    } else {
      const r = document.createElement('div'); r.className = 'rejilla'; r.append(...lista.map(tarjeta)); s.append(r);
    }
    cont.append(s);
  }
  const quedan = fotos.filter((f) => !categoria(f)).length;
  if(quedan){
    const p = document.createElement('p'); p.className = 'vacio';
    p.textContent = quedan === 1 ? 'Y 1 foto más que está bien: se queda sin tocarla.' : `Y ${quedan} fotos más que están bien: se quedan sin tocarlas.`;
    cont.append(p);
  }
  if(!cont.querySelector('section')){
    const p = document.createElement('p'); p.className = 'vacio';
    p.textContent = 'No encontré nada que sobre: ni repetidas, ni borrosas, ni capturas viejas.';
    cont.prepend(p);
  }
  $('#resultado').hidden = false;
  contar();
}

function contar(){
  const van = fotos.filter((f) => f.borrar), libera = van.reduce((s, f) => s + f.peso, 0);
  const total = fotos.reduce((s, f) => s + f.peso, 0);
  const nf = fotos.filter((f) => f.tipo === 'foto').length, nv = fotos.length - nf;
  const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  $('#resumen').innerHTML = `<div class="cifra"><b>${fotos.length}</b><span>revisadas${nv ? ` (${pl(nf, 'foto', 'fotos')}, ${pl(nv, 'video', 'videos')})` : ''}</span></div>`
    + `<div class="cifra va"><b>${van.length}</b><span>se van</span></div>`
    + `<div class="cifra va"><b>${A.peso(libera)}</b><span>que liberas, aprox. (de ${A.peso(total)})</span></div>`;
  for(const s of document.querySelectorAll('section.cat')){
    const fs = [...s.querySelectorAll('.foto')].map((b) => porId(b.dataset.id));
    s.querySelector('h2 small').textContent = `${fs.filter((f) => f.borrar).length} de ${fs.length} se van`;
  }
  $('#pie').hidden = !fotos.length;
  $('#cuenta').innerHTML = van.length ? `Se van <b>${van.length}</b><span>liberas ~${A.peso(libera)}</span>` : 'Nada marcado para borrar<span>toca una foto para marcarla</span>';
  $('#borrar').disabled = !van.length;
}
const porId = (id) => fotos.find((f) => String(f.id) === String(id));

$('#categorias').addEventListener('click', (e) => {
  const todas = e.target.closest('button[data-todas]');
  if(todas){
    const s = todas.closest('section');
    for(const b of s.querySelectorAll('.foto')){ const f = porId(b.dataset.id); f.borrar = todas.dataset.todas === 'va'; sellar(b, f); }
    contar(); return;
  }
  const b = e.target.closest('.foto'); if(!b) return;
  const f = porId(b.dataset.id);
  if(e.target.closest('.lupa')){ ver(f); return; }
  f.borrar = !f.borrar; sellar(b, f); contar();
});

/* ── ver en grande ── */
let viendo = null, urlGrande = '';
function ver(f){
  viendo = f;
  if(urlGrande) URL.revokeObjectURL(urlGrande);
  urlGrande = URL.createObjectURL(f.file);
  const g = $('#grande');
  g.innerHTML = f.tipo === 'video' ? '<video controls playsinline></video>' : '<img alt="">';
  g.firstChild.src = urlGrande;
  $('#tVer').textContent = f.nombre;
  const fecha = f.fecha ? new Date(f.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'sin fecha de captura';
  $('#razonVer').textContent = [f.razon || (f.mejor ? 'La mejor de su grupo' : ''), fecha, A.peso(f.peso)].filter(Boolean).join(' · ');
  pintarVer();
  $('#dlgVer').showModal();
}
function pintarVer(){ $('#alternarVer').textContent = viendo.borrar ? '✓ Mejor que se quede' : '✕ Que se vaya'; }
$('#alternarVer').addEventListener('click', () => {
  viendo.borrar = !viendo.borrar; pintarVer();
  const b = document.querySelector(`.foto[data-id="${viendo.id}"]`); if(b) sellar(b, viendo);
  contar();
});
$('#cerrarVer').addEventListener('click', () => $('#dlgVer').close());
$('#dlgVer').addEventListener('close', () => { $('#grande').replaceChildren(); if(urlGrande){ URL.revokeObjectURL(urlGrande); urlGrande = ''; } });

/* ── borrar: la lista para el atajo ── */
$('#borrar').addEventListener('click', () => {
  const van = fotos.filter((f) => f.borrar), conFecha = van.filter((f) => f.fecha), sin = van.filter((f) => !f.fecha);
  $('#resumenBorrar').textContent = `${van.length} marcada${van.length > 1 ? 's' : ''} para borrar · liberas ~${A.peso(van.reduce((s, f) => s + f.peso, 0))}.`;
  $('#sinFecha').hidden = !sin.length;
  $('#nSinFecha').textContent = sin.length === 1 ? '1 de ellas no trae' : `${sin.length} de ellas no traen`;
  $('#listaSinFecha').replaceChildren(...sin.map((f) => { const i = document.createElement('img'); i.alt = f.nombre; if(f.mini) i.src = f.mini; return i; }));
  $('#copiarAbrir').disabled = !conFecha.length;
  $('#avisoCopia').textContent = '';
  $('#dlgBorrar').showModal();
});
const textoLista = () => A.lista(fotos.filter((f) => f.borrar));
window.__abrir = (u) => { location.href = u; };
$('#copiarAbrir').addEventListener('click', async () => {
  const t = textoLista();
  try{
    await navigator.clipboard.writeText(t);
    $('#avisoCopia').textContent = `Copiadas ${t.split('\n').length} fechas. Abriendo Atajos…`;
  } catch{
    $('#avisoCopia').textContent = 'No se pudo copiar solo. Usa «Bajar la lista» y pásala al portapapeles.';
    return;
  }
  window.__abrir(`shortcuts://run-shortcut?name=${encodeURIComponent(ATAJO)}&input=clipboard`);
});
$('#bajarLista').addEventListener('click', () => {
  const u = URL.createObjectURL(new Blob([textoLista() + '\n'], { type: 'text/plain' })), a = document.createElement('a');
  a.href = u; a.download = 'fotos-para-borrar.txt'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
});
$('#cerrarBorrar').addEventListener('click', () => $('#dlgBorrar').close());

/* ── abrir ── */
$('#archivo').addEventListener('change', (e) => { empezar(e.target.files); e.target.value = ''; });
$('#otra').addEventListener('click', () => $('#archivo').click());
const zona = $('#soltar');
zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('encima'); });
zona.addEventListener('dragleave', () => zona.classList.remove('encima'));
zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('encima'); empezar(e.dataTransfer.files); });

window.__limpiar = { get fotos(){ return fotos; }, textoLista };
