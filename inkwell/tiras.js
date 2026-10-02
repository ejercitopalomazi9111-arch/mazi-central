/* INKWELL · TIRAS — la pantalla, la base del teléfono y el que prepara capítulos. */
import { reconocer, FUENTES, wattpad, limpiarTexto } from './fuentes.js';
import { pdf, epub, tamanoJpeg } from './archivos.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── la red ──────────────────────────────────────────────────────────────
   Webtoon va por el recadero de La Sala. Primero por la PUERTA (la misma
   dirección de la Central: para el iPhone no es otro sitio); si la página se
   abrió desde otro lado y no hay puerta, directo a La Sala. ?servidor= lo fija
   (pruebas). Wattpad, directo: su API da CORS. */
const params = new URLSearchParams(location.search);
const DIRECTO = 'https://sala.palomazi9111.workers.dev';
const FIJO = (params.get('servidor') || '').replace(/\/+$/, '');
let bases = FIJO ? [FIJO] : [...new Set([/^https?:$/.test(location.protocol) ? location.origin : '', DIRECTO].filter(Boolean))];
export async function pedir(u){
  const ruta = '/api/sala/inkwell/traer?url=' + encodeURIComponent(u);
  let ultimo;
  for(const b of bases){
    try{
      const r = await fetch(b + ruta);
      /* la puerta de la Central marca lo que contestó La Sala; sin marca y con
         404 es que aquí no hay puerta (github.io, localhost): se brinca */
      if(!FIJO && b === location.origin && b !== DIRECTO && !r.headers.get('X-Puerta')){ ultimo = new Error('sin puerta'); continue; }
      if(!r.ok){ let m = ''; try{ m = (await r.json()).error; }catch{} throw new Error(m || `Webtoon contestó ${r.status}`); }
      if(bases[0] !== b) bases = [b, ...bases.filter((x) => x !== b)];   // la que sirvió, primero
      return r;
    } catch(e){ ultimo = e; }
  }
  throw ultimo || new Error('No hay conexión con La Sala.');
}
async function directo(u){
  const r = await fetch(u);
  if(!r.ok){ let m = ''; try{ m = (await r.json()).message; }catch{} throw new Error(m || `Wattpad contestó ${r.status}`); }
  return r;
}
const redDe = (s) => s.fuente === 'webtoon' ? pedir : directo;

/* ── la base del teléfono (IndexedDB) ── */
let db;
function abrir(){
  return db ? Promise.resolve(db) : new Promise((ok, mal) => {
    const q = indexedDB.open('inkwell-tiras', 1);
    q.onupgradeneeded = () => {
      const d = q.result;
      d.createObjectStore('series', { keyPath: 'id' });
      d.createObjectStore('caps', { keyPath: 'clave' }).createIndex('serie', 'serie');
    };
    q.onsuccess = () => { db = q.result; ok(db); };
    q.onerror = () => mal(q.error);
  });
}
const tx = async (tienda, modo, fn) => { const d = await abrir(); return new Promise((ok, mal) => {
  const t = d.transaction(tienda, modo), s = t.objectStore(tienda); let res;
  const r = fn(s); if(r) r.onsuccess = () => { res = r.result; };
  t.oncomplete = () => ok(res); t.onerror = () => mal(t.error); t.onabort = () => mal(t.error);
}); };
const todasSeries = async () => ((await tx('series', 'readonly', (s) => s.getAll())) || []).sort((a, b) => a.orden - b.orden);
const guardarSerie = (s) => tx('series', 'readwrite', (st) => st.put(s));
const capDe = (clave) => tx('caps', 'readonly', (s) => s.get(clave));
const clavesDe = async (serie) => new Set((await tx('caps', 'readonly', (s) => s.index('serie').getAllKeys(serie))) || []);
const clave = (s, n) => `${s.id}:${n}`;

/* ── ajustes ── */
const leer = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch{ return d; } };
const escribir = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); } catch{} };
const ajustes = { adelante: 5, orden: 'serie', ...leer('tiras.ajustes', {}) };

/* lo que falta por leer de una serie, en orden */
const pendientes = (s) => { const l = new Set(s.leidos || []); return s.caps.filter((c) => c.n >= (s.desde || 0) && !l.has(c.n)); };

/* ── estado en pantalla ── */
function estado(txt, tipo = ''){ $('#estadoTxt').textContent = txt; $('#estado').className = 'estado ' + tipo; }

/* ── bajar un capítulo ── */
async function bajarCap(s, c, avance){
  const F = FUENTES[s.fuente];
  const r = await F.capitulo(c, redDe(s));
  const reg = { clave: clave(s, c.n), serie: s.id, n: c.n, titulo: c.titulo, tipo: r.tipo, bajado: Date.now() };
  if(r.tipo === 'imagenes'){
    reg.imgs = new Array(r.urls.length);
    let hechas = 0, sig = 0;
    reg.dims = new Array(r.urls.length);
    /* el tamaño de cada imagen se guarda al bajarla: el lector reserva su
       alto antes de pintarla y así no se adelanta capítulos de más */
    const obrero = async () => { while(sig < r.urls.length){
      const i = sig++, b = await (await pedir(r.urls[i])).blob();
      reg.imgs[i] = b; reg.dims[i] = await medida(b); hechas++; avance?.(hechas, r.urls.length);
    } };
    await Promise.all([obrero(), obrero(), obrero(), obrero()]);
  } else reg.html = limpiarTexto(r.html);
  await tx('caps', 'readwrite', (st) => st.put(reg));
  return reg;
}

async function medida(b){
  const t = tamanoJpeg(new Uint8Array(await b.slice(0, 65536).arrayBuffer()));
  if(t) return [t.ancho, t.alto];
  try{ const bm = await createImageBitmap(b); const d = [bm.width, bm.height]; bm.close?.(); return d; } catch{ return null; }
}

/* ── el que prepara: revisa capítulos nuevos y deja listos los que siguen ── */
let preparando = null, otraVez = false;
const VIEJA = 6 * 3600e3;
/* Si se pide mientras ya trabaja —se agregó una serie a media vuelta—, al
   terminar da OTRA vuelta: la que iba ya había leído la lista de series y
   la nueva se quedaba sin preparar hasta la siguiente. */
export function preparar({ forzar = false } = {}){
  if(preparando){ otraVez = true; return preparando; }
  preparando = (async () => {
    if(!navigator.onLine){ estado('Sin internet: puedes leer lo que ya está bajado.'); return; }
    const series = await todasSeries();
    if(!series.length){ estado('Agrega una serie para empezar.'); return; }
    let nuevos = 0, bajados = 0, fallas = 0;
    for(const s of series){
      if(forzar || !s.revisada || Date.now() - s.revisada > VIEJA){
        try{
          estado(`Revisando ${s.titulo}…`, 'trabajando');
          const f = await FUENTES[s.fuente].serie(s.ref, redDe(s));
          const antes = new Set(s.caps.map((c) => c.n));
          nuevos += f.caps.filter((c) => !antes.has(c.n)).length;
          /* se vuelve a leer antes de guardar: mientras Webtoon contestaba, el
             lector pudo marcar capítulos leídos, y guardar la copia vieja los
             borraba */
          const fresca = (await tx('series', 'readonly', (st) => st.get(s.id))) || s;
          fresca.caps = f.caps; fresca.revisada = Date.now();
          await guardarSerie(fresca); Object.assign(s, fresca);
        } catch(e){ fallas++; }
      }
      const tengo = await clavesDe(s.id);
      const faltan = pendientes(s).slice(0, ajustes.adelante).filter((c) => !tengo.has(clave(s, c.n)));
      for(const c of faltan){
        try{
          estado(`Preparando ${s.titulo} · cap. ${c.n}…`, 'trabajando');
          await bajarCap(s, c, (h, t) => estado(`Preparando ${s.titulo} · cap. ${c.n} (${h} de ${t})`, 'trabajando'));
          bajados++; pintarSeries();
        } catch(e){ fallas++; estado(`${s.titulo} · cap. ${c.n}: ${e.message}`); break; }
      }
    }
    const listos = await contarListos();
    estado([listos ? `${listos} capítulo${listos > 1 ? 's' : ''} listo${listos > 1 ? 's' : ''} para leer` : 'Todo leído',
      bajados ? `${bajados} recién bajado${bajados > 1 ? 's' : ''}` : '', nuevos ? `${nuevos} nuevo${nuevos > 1 ? 's' : ''} en tus series` : '',
      fallas ? `${fallas} con error` : ''].filter(Boolean).join(' · '), 'listo');
    await pintarSeries(); espacio();
  })().finally(() => { preparando = null; if(otraVez){ otraVez = false; preparar(); } });
  return preparando;
}
async function contarListos(){
  let n = 0;
  for(const s of await todasSeries()){ const t = await clavesDe(s.id); n += pendientes(s).filter((c) => t.has(clave(s, c.n))).length; }
  return n;
}

/* ── la lista de series ── */
const urls = new Set();
const urlDe = (blob) => { const u = URL.createObjectURL(blob); urls.add(u); return u; };
async function pintarSeries(){
  const series = await todasSeries(), caja = $('#series');
  if(!series.length){ caja.innerHTML = '<p class="vacio">Todavía no sigues ninguna. Pega arriba el link de una serie de Webtoon o de Wattpad.</p>'; $('#leerTodo').disabled = true; return; }
  const filas = [];
  let listos = 0;
  for(const s of series){
    const t = await clavesDe(s.id), p = pendientes(s), l = p.filter((c) => t.has(clave(s, c.n))).length;
    listos += l;
    const leidos = (s.leidos || []).length + s.caps.filter((c) => c.n < (s.desde || 0)).length;
    filas.push(`<article class="serie" data-id="${esc(s.id)}">
      <img class="portada" alt="" ${s.portadaBlob ? `src="${urlDe(s.portadaBlob)}"` : ''}>
      <div class="datos"><span class="fuente">${s.fuente === 'webtoon' ? 'Webtoon · cómic' : 'Wattpad · texto'}</span><h3>${esc(s.titulo)}</h3>
        <span class="cuenta">${esc(s.autor || '')}</span>
        <span class="cuenta">${Math.min(leidos, s.caps.length)} de ${s.caps.length} leídos · <b>${l}</b> listo${l === 1 ? '' : 's'}</span></div>
      <div class="botones"><button type="button" data-a="leer"${p.length ? '' : ' disabled'}>▶ Leer</button><button type="button" data-a="archivo">⬇ Archivo</button><button type="button" data-a="mas">⋯ Más</button></div>
    </article>`);
  }
  caja.innerHTML = filas.join('');
  $('#leerTodo').disabled = !listos;
  $('#leerTodo').textContent = listos ? `▶ Leer seguido · ${listos} capítulo${listos > 1 ? 's' : ''}` : '▶ Leer seguido';
}

/* ── agregar ── */
async function agregarRef(r){
  const F = FUENTES[r.fuente];
  estado('Buscando la serie…', 'trabajando');
  const s = await F.serie(r, r.fuente === 'webtoon' ? pedir : directo);
  const ya = await tx('series', 'readonly', (st) => st.get(s.id));
  if(ya){ estado(`Ya sigues ${ya.titulo}.`, 'listo'); return; }
  const series = await todasSeries();
  s.orden = series.length ? series[series.length - 1].orden + 1 : 1;
  s.leidos = []; s.desde = 0; s.revisada = Date.now(); s.agregada = Date.now();
  try{ if(s.portada) s.portadaBlob = await (await (s.fuente === 'webtoon' ? pedir(s.portada) : directo(s.portada))).blob(); } catch{}
  await guardarSerie(s);
  $('#buscar').value = ''; $('#resultados').replaceChildren();
  estado(`Agregada: ${s.titulo} · ${s.caps.length} capítulos.`, 'listo');
  await pintarSeries();
  preparar();
}
$('#formAgregar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = $('#buscar').value.trim(); if(!t) return;
  const r = reconocer(t);
  try{
    if(r) return await agregarRef(r);
    if(/^https?:/i.test(t)){ estado('Ese link no es de una serie de Webtoon ni de Wattpad.'); return; }
    estado(`Buscando «${t}» en Wattpad…`, 'trabajando');
    const rs = await wattpad.buscar(t, directo);
    $('#resultados').innerHTML = rs.length ? rs.map((x, i) => `<div class="resultado"><img alt="" src="${esc(x.portada)}"><div><b>${esc(x.titulo)}</b><span>${esc(x.autor || '')} · ${x.partes} parte${x.partes === 1 ? '' : 's'}</span></div><button type="button" class="si" data-i="${i}">Seguir</button></div>`).join('')
      : '<p class="vacio">No encontré nada con ese nombre en Wattpad.</p>';
    $('#resultados').onclick = (ev) => { const b = ev.target.closest('button[data-i]'); if(b) agregarRef({ fuente: 'wattpad', story: rs[+b.dataset.i].story }).catch((er) => estado(er.message)); };
    estado(rs.length ? `${rs.length} resultados en Wattpad.` : '', 'listo');
  } catch(er){ estado('No se pudo: ' + er.message); }
});

/* ── el lector: un solo scroll con todos los capítulos listos ──────────
   Los capítulos se van poniendo conforme se acerca el final, y los que ya
   quedaron muy arriba se quitan (con sus imágenes) para que el teléfono no
   se ahogue en un maratón de cien capítulos. Al pasar el final de uno, se
   marca leído. */
let cola = [], enLector = [], observador, final, soloSerie = null;
async function armarCola(){
  const series = (await todasSeries()).filter((s) => !soloSerie || s.id === soloSerie);
  const porSerie = [];
  for(const s of series){ const t = await clavesDe(s.id); porSerie.push(pendientes(s).filter((c) => t.has(clave(s, c.n))).map((c) => ({ s, c }))); }
  if(ajustes.orden === 'intercalado'){
    const out = []; for(let i = 0; porSerie.some((l) => l[i]); i++) for(const l of porSerie) if(l[i]) out.push(l[i]);
    return out;
  }
  return porSerie.flat();
}
async function abrirLector(serieId = null){
  soloSerie = serieId;
  cola = await armarCola();
  enLector = [];
  const sc = $('#scroll'); sc.replaceChildren(); sc.scrollTop = 0;
  final = document.createElement('div'); final.className = 'al-final'; sc.append(final);
  $('#lector').hidden = false; document.body.style.overflow = 'hidden';
  /* El observador sólo CARGA (ve 1200 px por adelantado). Lo leído se decide
     aparte, al moverse (`alMover`): con el mismo observador un capítulo se
     daba por leído en cuanto quedaba a 1200 px de aparecer, y con uno sin
     margen, un dedazo rápido se brincaba el final sin que nadie lo viera. */
  observador?.disconnect();
  observador = new IntersectionObserver((xs) => { for(const x of xs) if(x.isIntersecting) siguiente(); }, { root: sc, rootMargin: '0px 0px 1200px 0px' });
  observador.observe(final);
  await siguiente();
  if(!enLector.length){ final.textContent = 'No hay capítulos listos. Conéctate a internet y se preparan solos.'; preparar(); }
}
let poniendo = false;
async function siguiente(){
  if(poniendo) return; poniendo = true;
  try{
    const x = cola.shift();
    if(!x){
      final.textContent = navigator.onLine ? 'Preparando más capítulos…' : 'Ya leíste todo lo bajado. Con internet se preparan más.';
      if(navigator.onLine){ await preparar(); const mas = (await armarCola()).filter((y) => !enLector.some((z) => z.clave === clave(y.s, y.c.n))); if(mas.length){ cola = mas; poniendo = false; return siguiente(); } final.textContent = 'Ya leíste todo lo que hay. Cuando salgan capítulos nuevos, aquí aparecen.'; }
      return;
    }
    const reg = await capDe(clave(x.s, x.c.n)); if(!reg){ poniendo = false; return siguiente(); }
    const art = document.createElement('article');
    art.className = 'cap'; art.dataset.clave = reg.clave; art.dataset.serie = x.s.id; art.dataset.n = reg.n;
    art.dataset.titulo = x.s.titulo; art.dataset.cap = `Cap. ${reg.n} · ${reg.titulo}`;
    art.innerHTML = `<header class="cap-cab"><small>${esc(x.s.titulo)} · cap. ${reg.n}</small><b>${esc(reg.titulo)}</b></header>`;
    const mis = [];
    if(reg.tipo === 'imagenes') reg.imgs.forEach((b, k) => {
      const i = document.createElement('img'); i.alt = ''; i.decoding = 'async';
      const d = reg.dims && reg.dims[k]; if(d){ i.width = d[0]; i.height = d[1]; }
      const u = URL.createObjectURL(b); mis.push(u); i.src = u; art.append(i);
    });
    else { const d = document.createElement('div'); d.className = 'texto'; d.innerHTML = reg.html; art.append(d); }
    const fin = document.createElement('div'); fin.className = 'fin-cap'; art.append(fin);
    art._urls = mis;
    final.before(art);
    enLector.push({ clave: reg.clave, art });
    if(enLector.length === 1) cabecera(art);
    /* se quitan los que ya quedaron MUY arriba —nunca el que se lee—, sin
       que salte lo que está en pantalla */
    const sc = $('#scroll');
    while(enLector.length > 6 && enLector[0].art.offsetTop + enLector[0].art.offsetHeight < sc.scrollTop - 2000){
      const v = enLector.shift(), alto = v.art.offsetHeight;
      v.art._urls.forEach((u) => URL.revokeObjectURL(u)); v.art.remove(); sc.scrollTop -= alto;
    }
  } finally { poniendo = false; }
  /* si el capítulo fue corto y el final sigue a la vista, el observador no
     vuelve a avisar (no cambió de estado): se pide el que sigue a mano */
  if(cola.length) requestAnimationFrame(() => { const sc = $('#scroll'); if(final.getBoundingClientRect().top < sc.getBoundingClientRect().bottom + 1200) siguiente(); });
}
/* Leído = su final ya pasó arriba de la mitad de la pantalla. Arriba se
   pone el capítulo cuya cabecera fue la última en pasar. */
let moverPendiente = false;
function alMover(){
  if(moverPendiente) return; moverPendiente = true;
  requestAnimationFrame(() => {
    moverPendiente = false;
    const r = $('#scroll').getBoundingClientRect(), mitad = r.top + r.height * 0.5;
    let actual = enLector[0]?.art;
    for(const { art } of enLector){
      if(art.querySelector('.cap-cab').getBoundingClientRect().top <= r.top + 80) actual = art;
      if(!art.dataset.leido && art.querySelector('.fin-cap').getBoundingClientRect().top < mitad) leido(art);
    }
    if(actual) cabecera(actual);
  });
}
$('#scroll').addEventListener('scroll', alMover, { passive: true });
function cabecera(art){ $('#lTitulo').textContent = art.dataset.titulo; $('#lSub').textContent = art.dataset.cap; }
async function leido(art){
  if(!art || art.dataset.leido) return;
  art.dataset.leido = '1';
  const s = await tx('series', 'readonly', (st) => st.get(art.dataset.serie)); if(!s) return;
  const n = +art.dataset.n;
  if(!(s.leidos || []).includes(n)){ s.leidos = [...(s.leidos || []), n]; await guardarSerie(s); }
  escribir('tiras.ultimo', art.dataset.clave);
}
$('#cerrarLector').addEventListener('click', () => {
  observador?.disconnect();
  for(const v of enLector) v.art._urls.forEach((u) => URL.revokeObjectURL(u));
  enLector = []; $('#scroll').replaceChildren();
  $('#lector').hidden = true; document.body.style.overflow = '';
  pintarSeries(); preparar();
});
$('#leerTodo').addEventListener('click', () => abrirLector());

/* ── botones de cada serie ── */
let actual = null;
$('#series').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-a]'); if(!b) return;
  const id = b.closest('.serie').dataset.id;
  actual = await tx('series', 'readonly', (st) => st.get(id));
  if(b.dataset.a === 'leer'){
    const t = await clavesDe(id), p = pendientes(actual);
    if(p.length && !t.has(clave(actual, p[0].n))){
      try{ estado(`Bajando ${actual.titulo} · cap. ${p[0].n}…`, 'trabajando'); await bajarCap(actual, p[0]); estado('', 'listo'); }
      catch(er){ estado('No se pudo bajar: ' + er.message); return; }
    }
    abrirLector(id);
  } else if(b.dataset.a === 'archivo') abrirArchivo();
  else {
    $('#tSerie').textContent = actual.titulo;
    $('#serieDesc').textContent = `${actual.caps.length} capítulos · ${actual.enlace}`;
    $('#sDesde').value = actual.desde || actual.caps[0]?.n || 1;
    $('#dlgSerie').showModal();
  }
});
$('#guardarDesde').addEventListener('click', async () => {
  actual.desde = Math.max(0, +$('#sDesde').value || 0);
  await guardarSerie(actual); $('#dlgSerie').close(); await pintarSeries(); preparar();
});
$('#quitarSerie').addEventListener('click', async () => {
  if(!confirm(`¿Quitar «${actual.titulo}» y todo lo bajado de ella?`)) return;
  const ks = [...await clavesDe(actual.id)];
  await tx('caps', 'readwrite', (st) => { ks.forEach((k) => st.delete(k)); });
  await tx('series', 'readwrite', (st) => st.delete(actual.id));
  $('#dlgSerie').close(); await pintarSeries(); espacio();
  const n = await contarListos(); estado(n ? `${n} capítulo${n > 1 ? 's' : ''} listo${n > 1 ? 's' : ''} para leer` : 'Nada pendiente por leer.', 'listo');
});
$('#cerrarSerie').addEventListener('click', () => $('#dlgSerie').close());

/* ── una serie en un archivo ── */
const TOPE = 300;   // capítulos por archivo: más que eso no cabe en la memoria de un iPhone
function abrirArchivo(){
  const ns = actual.caps.map((c) => c.n), p = pendientes(actual);
  $('#tArchivo').textContent = `${actual.titulo} en un archivo`;
  $('#archivoQue').textContent = actual.fuente === 'webtoon' ? 'Sale un PDF: la tira completa, capítulo tras capítulo. Ábrelo en Libros y elige «Desplazamiento vertical».' : 'Sale un EPUB: el libro completo, con su índice. Se abre en Libros.';
  $('#aDesde').value = p[0]?.n ?? ns[0]; $('#aHasta').value = Math.min(ns[ns.length - 1], (p[0]?.n ?? ns[0]) + 49);
  $('#archivoNota').textContent = `Hay ${ns.length} capítulos (del ${ns[0]} al ${ns[ns.length - 1]}). Lo que no esté bajado se baja primero; hasta ${TOPE} por archivo.`;
  $('#aEstado').textContent = ''; $('#aBarra').style.width = '0';
  $('#armar').disabled = false;
  $('#dlgArchivo').showModal();
}
async function aJpeg(blob){
  const b = new Uint8Array(await blob.arrayBuffer()), t = tamanoJpeg(b);
  if(t && (t.componentes === 3 || t.componentes === 1)) return { jpeg: b, ancho: t.ancho, alto: t.alto, gris: t.componentes === 1 };
  const bm = await createImageBitmap(blob), c = document.createElement('canvas');
  c.width = bm.width; c.height = bm.height;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bm, 0, 0); bm.close?.();
  const j = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
  return { jpeg: new Uint8Array(await j.arrayBuffer()), ancho: c.width, alto: c.height };
}
$('#armar').addEventListener('click', async () => {
  const de = +$('#aDesde').value, a = +$('#aHasta').value;
  const caps = actual.caps.filter((c) => c.n >= Math.min(de, a) && c.n <= Math.max(de, a)).slice(0, TOPE);
  if(!caps.length){ $('#aEstado').textContent = 'Ese rango no tiene capítulos.'; return; }
  $('#armar').disabled = true;
  try{
    const tengo = await clavesDe(actual.id), regs = [];
    for(const [i, c] of caps.entries()){
      $('#aBarra').style.width = (100 * i / caps.length) + '%';
      let r = tengo.has(clave(actual, c.n)) ? await capDe(clave(actual, c.n)) : null;
      if(!r){
        if(!navigator.onLine) throw new Error(`el cap. ${c.n} no está bajado y no hay internet`);
        $('#aEstado').textContent = `Bajando cap. ${c.n} (${i + 1} de ${caps.length})…`;
        r = await bajarCap(actual, c);
      } else $('#aEstado').textContent = `Juntando cap. ${c.n} (${i + 1} de ${caps.length})…`;
      regs.push(r);
    }
    $('#aEstado').textContent = 'Armando el archivo…';
    let blob, nombre;
    const base = `${actual.titulo} (${caps[0].n}-${caps[caps.length - 1].n})`.replace(/[\\/:*?"<>|]+/g, ' ');
    if(actual.fuente === 'webtoon'){
      const paginas = [];
      for(const r of regs){
        const imgs = []; for(const b of r.imgs) imgs.push({ tipo: 'imagen', ...(await aJpeg(b)) });
        paginas.push({ tipo: 'titulo', texto: `Capítulo ${r.n}`, sub: r.titulo }, ...imgs);
      }
      const ancho = paginas.find((p) => p.tipo === 'imagen')?.ancho || 800;
      blob = pdf(paginas, { titulo: actual.titulo, ancho }); nombre = base + '.pdf';
    } else {
      blob = epub({ titulo: actual.titulo, autor: actual.autor, id: actual.id, capitulos: regs.map((r) => ({ titulo: `${r.n}. ${r.titulo}`, html: r.html })) });
      nombre = base + '.epub';
    }
    $('#aBarra').style.width = '100%';
    const f = new File([blob], nombre, { type: blob.type });
    if(navigator.canShare?.({ files: [f] }) && /iPhone|iPad/.test(navigator.userAgent)){
      $('#aEstado').textContent = 'Listo. Elige «Guardar en Archivos» o «Libros».';
      try{ await navigator.share({ files: [f] }); } catch(er){ if(er.name !== 'AbortError') bajar(f); }
    } else { bajar(f); $('#aEstado').textContent = `Listo: ${nombre} (${Math.round(blob.size / 1e6) || 1} MB).`; }
    pintarSeries();
  } catch(er){ $('#aEstado').textContent = 'No se pudo: ' + er.message; }
  finally{ $('#armar').disabled = false; }
});
function bajar(f){ const u = URL.createObjectURL(f), a = document.createElement('a'); a.href = u; a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
$('#cerrarArchivo').addEventListener('click', () => $('#dlgArchivo').close());

/* ── ajustes ── */
$('#adelante').value = String(ajustes.adelante); $('#orden').value = ajustes.orden;
$('#adelante').addEventListener('change', (e) => { ajustes.adelante = +e.target.value; escribir('tiras.ajustes', ajustes); preparar(); });
$('#orden').addEventListener('change', (e) => { ajustes.orden = e.target.value; escribir('tiras.ajustes', ajustes); });
$('#revisar').addEventListener('click', () => preparar({ forzar: true }));

async function espacio(){
  try{
    const e = await navigator.storage?.estimate?.();
    if(e) $('#espacio').textContent = `Lo bajado ocupa ${e.usage > 1e9 ? (e.usage / 1e9).toFixed(1) + ' GB' : e.usage < 1e6 ? 'menos de 1 MB' : Math.round(e.usage / 1e6) + ' MB'} en este teléfono.`;
  } catch{}
}

/* ── arranque: y cada vez que vuelva el internet, o cada 15 minutos con la página abierta ── */
navigator.storage?.persist?.().catch(() => {});
addEventListener('online', () => preparar());
setInterval(() => { if(document.visibilityState === 'visible') preparar(); }, 15 * 60e3);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') preparar(); });
if('serviceWorker' in navigator && !params.has('servidor')) navigator.serviceWorker.register('sw.js').catch(() => {});
await pintarSeries(); espacio();
preparar();
window.__tiras = { preparar, todasSeries, clavesDe, get cola(){ return cola; }, get ocupado(){ return !!preparando || otraVez; } };
