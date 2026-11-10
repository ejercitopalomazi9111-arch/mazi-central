/* INKWELL · TIRAS — la pantalla, la base del teléfono y el que prepara capítulos. */
import { reconocer, FUENTES, wattpad, limpiarTexto, desentidad } from './fuentes.js';
import { pdf, epub, tamanoJpeg } from './archivos.js';
import { icono } from './iconos.js';
import { pintarMuelle } from './muelle.js';
import { plumilla } from './tinta.js';
import { apuntar } from './biblioteca.js';
import { codigoDe, leerCodigo, seriesDeRanking, elegirNuevas, GENEROS, seriesDeGenero } from './compartir.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── la red ──────────────────────────────────────────────────────────────
   Webtoon va por el recadero de La Sala. Primero por la PUERTA (la misma
   dirección de la Central: para el iPhone no es otro sitio); si la página se
   abrió desde otro lado y no hay puerta, directo a La Sala. ?servidor= lo fija
   (pruebas). Wattpad, directo: su API da CORS. */
const params = new URLSearchParams(location.search);
import { pedir, recomendar } from './red.js';
export { pedir };
/* Wattpad: directo si deja (antes su API daba CORS); si no, por el recadero de La Sala, igual que Webtoon */
async function directo(u){
  let r = null;
  try{ r = await fetch(u); }catch{ r = null; }
  if(!r || r.type === 'opaque' || !r.ok){ try{ r = await pedir(u); }catch(e){ throw new Error('No pude llegar a Wattpad: ' + e.message); } }
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
/* lo guardado antes del 5 nov puede traer «&eacute;» en el título: se limpia al leer */
const limpia = (s) => { if(!s) return s; s.titulo = desentidad(s.titulo || ''); if(s.autor) s.autor = desentidad(s.autor); for(const c of s.caps || []) c.titulo = desentidad(c.titulo || ''); return s; };
let ultimoTop = 0;   /* dónde iba el scroll del lector (ver la barra que se esconde) */
const todasSeries = async () => ((await tx('series', 'readonly', (s) => s.getAll())) || []).map(limpia).sort((a, b) => a.orden - b.orden);
const guardarSerie = (s) => tx('series', 'readwrite', (st) => st.put(s));
const capDe = (clave) => tx('caps', 'readonly', (s) => s.get(clave));
const clavesDe = async (serie) => new Set((await tx('caps', 'readonly', (s) => s.index('serie').getAllKeys(serie))) || []);
const clave = (s, n) => `${s.id}:${n}`;

/* ── ajustes ── */
const leer = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch{ return d; } };
const escribir = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); } catch{} };
const ajustes = { adelante: 5, orden: 'serie', descubrir: '1', compacto: 'si', ...leer('tiras.ajustes', {}) };

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
      const i = sig++, b = await compactar(await (await pedir(r.urls[i])).blob());
      reg.imgs[i] = b; reg.dims[i] = await medida(b); hechas++; avance?.(hechas, r.urls.length);
    } };
    await Promise.all([obrero(), obrero(), obrero(), obrero(), obrero(), obrero()]);
  } else reg.html = limpiarTexto(r.html);
  await tx('caps', 'readwrite', (st) => st.put(reg));
  return reg;
}

/* ── que quepa más (Carlos, 9 nov: «guardar las imágenes para tener más cosas a la vez») ──
   Cada página se vuelve a guardar en JPEG más ligero con un ancho tope: la página de Webtoon llega a
   ~800 px y calidad alta, y en un teléfono no se nota la diferencia. Sale
   entre la mitad y un tercio del peso. Si no queda más chica, se guarda la
   original. «Guardarlas como texto» (base64) pesaría un 33 % MÁS: lo que
   ahorra es recomprimir, no cambiar de formato. JPEG y no WebP a propósito:
   el PDF lleva JPEG tal cual, así que armar el archivo sólo copia bytes en vez
   de redibujar cada página (era lo que hacía tardar «años» en computadora). */
const NIVELES = { si: { q: 0.7, tope: 900 }, maximo: { q: 0.5, tope: 720 } };
export async function compactar(b, nivel = ajustes.compacto){
  const n = NIVELES[nivel]; if(!n || typeof createImageBitmap !== 'function') return b;
  try{
    const bm = await createImageBitmap(b);
    let w = bm.width, h = bm.height; if(w > n.tope){ h = Math.round(h * n.tope / w); w = n.tope; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(bm, 0, 0, w, h); bm.close?.();
    const enc = (t) => new Promise((ok) => c.toBlob(ok, t, n.q));
    const r = await enc('image/jpeg');
    c.width = c.height = 0;   // suelta la memoria del lienzo ya, sin esperar al recolector
    return r && r.size < b.size * 0.95 ? r : b;
  } catch{ return b; }
}
/* lo que ya estaba bajado también se aprieta, capítulo por capítulo */
async function compactarTodo(avisa = () => {}){
  const regs = (await tx('caps', 'readonly', (st) => st.getAll())).filter((r) => r.tipo === 'imagenes' && r.imgs?.length && !r.compacto);
  let antes = 0, despues = 0, k = 0;
  for(const r of regs){
    for(let i = 0; i < r.imgs.length; i++){ const b = r.imgs[i]; if(!b) continue; antes += b.size; const n = await compactar(b); r.imgs[i] = n; despues += n.size; if(n !== b) r.dims[i] = await medida(n); }
    r.compacto = ajustes.compacto; await tx('caps', 'readwrite', (st) => st.put(r)); avisa(++k, regs.length);
  }
  return { caps: regs.length, antes, despues };
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
      /* dos capítulos a la vez (cada uno con 6 imágenes a la vez): con 1000 por
         delante, de uno en uno no acababa nunca. Al primer error se para la serie. */
      let k = 0, roto = false, pintado = 0;
      const obrero = async () => { while(!roto && k < faltan.length){
        const c = faltan[k++];
        try{
          await bajarCap(s, c, (h, t) => estado(`Preparando ${s.titulo} · cap. ${c.n} (${h} de ${t}) · ${bajados} listos`, 'trabajando'));
          bajados++; if(Date.now() - pintado > 3000){ pintado = Date.now(); pintarSeries(); }
        } catch(e){ fallas++; roto = true; estado(`${s.titulo} · cap. ${c.n}: ${e.message}`); }
      } };
      await Promise.all([obrero(), obrero()]);
    }
    /* si ya queda poco, se busca un cómic nuevo y se le bajan capítulos en la siguiente vuelta */
    let nuevasSeries = 0; try{ nuevasSeries = await descubrir(); }catch{}
    if(nuevasSeries) otraVez = true;
    const listos = await contarListos();
    estado([nuevasSeries ? `${nuevasSeries} cómic${nuevasSeries > 1 ? 's' : ''} nuevo${nuevasSeries > 1 ? 's' : ''} para ti` : '', listos ? `${listos} capítulo${listos > 1 ? 's' : ''} listo${listos > 1 ? 's' : ''} para leer` : 'Todo leído',
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
  if(!series.length){ caja.innerHTML = '<p class="vacio" style="grid-column:1/-1">Todavía no sigues ninguna. Busca arriba un cómic o una historia.</p>'; $('#leerTodo').disabled = true; $('#bannerImg').removeAttribute('src'); return; }
  const filas = [];
  let listos = 0;
  for(const s of series){
    const t = await clavesDe(s.id), p = pendientes(s), l = p.filter((c) => t.has(clave(s, c.n))).length;
    listos += l;
    const leidos = (s.leidos || []).length + s.caps.filter((c) => c.n < (s.desde || 0)).length;
    filas.push(`<article class="serie" data-id="${esc(s.id)}">
      <img class="portada" alt="" ${s.portadaBlob ? `src="${urlDe(s.portadaBlob)}"` : ''}>
      <div class="datos"><span class="fuente">${s.fuente === 'webtoon' ? 'Webtoon · cómic' : 'Wattpad · texto'}${s.descubierta ? ' · sugerida para ti' : ''}</span><h3>${esc(s.titulo)}</h3>
        <span class="cuenta">${esc(s.autor || '')}</span>
        <span class="cuenta">${Math.min(leidos, s.caps.length)} de ${s.caps.length} leídos · <b>${l}</b> listo${l === 1 ? '' : 's'}</span>
        <div class="barrita" aria-hidden="true"><i style="width:${s.caps.length ? Math.round(100 * Math.min(leidos, s.caps.length) / s.caps.length) : 0}%"></i></div></div>
      <div class="botones"><button type="button" data-a="leer"${p.length ? '' : ' disabled'}>${icono('play')}Leer</button><button type="button" data-a="archivo">${icono('download')}Archivo</button><button type="button" data-a="mas">${icono('settings')}Más</button></div>
    </article>`);
  }
  caja.innerHTML = filas.join('');
  /* el banner lleva la portada de la primera serie que tiene algo listo */
  const conListos = [];
  for(const s of series){ const t = await clavesDe(s.id); if(s.portadaBlob && pendientes(s).some((c) => t.has(clave(s, c.n)))) conListos.push(s); }
  const ban = conListos[0] || series.find((s) => s.portadaBlob);
  if(ban) $('#bannerImg').src = urlDe(ban.portadaBlob); else $('#bannerImg').removeAttribute('src');
  $('#tBanner').textContent = conListos[0] ? conListos[0].titulo : 'Tus cómics e historias, sin internet';
  $('#leerTodo').disabled = !listos;
  $('#leerTodo').innerHTML = icono('book-open') + (listos ? `Leer seguido · ${listos} capítulo${listos > 1 ? 's' : ''}` : 'Leer seguido');
}

/* ── la barra de secciones de INKWELL: Tiras vive dentro de Biblioteca ── */
pintarMuelle($('#nav'), { raiz: './', actual: 'biblioteca' });
$('#cerrarLector').innerHTML = icono('x'); $('#brillo').innerHTML = icono('sun');
/* brillo de la pantalla y tamaño de letra de las historias de texto (se recuerdan) */
const BRILLOS = [1, .85, .7, .55];
let brillo = leer('tiras.brillo', 1), letra = leer('tiras.letra', 18);
const ponerLector = () => { $('#scroll').style.setProperty('--brillo', brillo); $('#scroll').style.setProperty('--letra', letra + 'px');
  $('#brillo').setAttribute('aria-label', `Brillo: ${Math.round(brillo * 100)} %`); };
$('#brillo').addEventListener('click', () => { brillo = BRILLOS[(BRILLOS.indexOf(brillo) + 1) % BRILLOS.length]; escribir('tiras.brillo', brillo); ponerLector(); });
$('#letraMenos').addEventListener('click', () => { letra = Math.max(14, letra - 2); escribir('tiras.letra', letra); ponerLector(); });
$('#letraMas').addEventListener('click', () => { letra = Math.min(30, letra + 2); escribir('tiras.letra', letra); ponerLector(); });
ponerLector();
document.querySelectorAll('.ic[data-ic]').forEach((e) => { e.outerHTML = icono(e.dataset.ic); });
$('#fCerrar').innerHTML = icono('x'); $('#fArchivo').innerHTML = icono('download'); $('#fMas').innerHTML = icono('settings');
$('#leerTodo').innerHTML = icono('book-open') + 'Leer seguido';

/* ── agregar ── */
async function agregarRef(r, { varias = false, descubierta = false } = {}){
  const F = FUENTES[r.fuente];
  estado('Buscando la serie…', 'trabajando');
  const s = await F.serie(r, r.fuente === 'webtoon' ? pedir : directo);
  const ya = await tx('series', 'readonly', (st) => st.get(s.id));
  if(ya){ if(!varias) estado(`Ya sigues ${ya.titulo}.`, 'listo'); return null; }
  const series = await todasSeries();
  s.orden = series.length ? series[series.length - 1].orden + 1 : 1;
  s.leidos = []; s.desde = 0; s.revisada = Date.now(); s.agregada = Date.now();
  if(descubierta) s.descubierta = true;
  try{ if(s.portada) s.portadaBlob = await (await (s.fuente === 'webtoon' ? pedir(s.portada) : directo(s.portada))).blob(); } catch{}
  await guardarSerie(s);
  if(varias) return s;
  $('#buscar').value = ''; $('#resultados').replaceChildren();
  estado(`Agregada: ${s.titulo} · ${s.caps.length} capítulos.`, 'listo');
  await pintarSeries();
  preparar();
  return s;
}

/* ── compartir: un código con la LISTA de series (nada de lo bajado ni lo leído) ── */
async function importar(refs){
  let n = 0, ya = 0, mal = 0;
  for(const [i, r] of refs.entries()){
    estado(`Agregando ${i + 1} de ${refs.length}…`, 'trabajando');
    try{ (await agregarRef(r, { varias: true })) ? n++ : ya++; }catch{ mal++; }
  }
  $('#buscar').value = '';
  estado([`Listo: ${n} serie${n === 1 ? '' : 's'} nueva${n === 1 ? '' : 's'}`, ya ? `${ya} ya las tenías` : '', mal ? `${mal} no se encontraron` : ''].filter(Boolean).join(' · ') + '. Bajando capítulos…', 'listo');
  await pintarSeries(); preparar();
}
$('#compartir').addEventListener('click', async () => {
  const series = await todasSeries();
  if(!series.length){ estado('Todavía no sigues ninguna serie para compartir.'); return; }
  const codigo = codigoDe(series), link = location.origin + location.pathname + '#series=' + codigo;
  $('#codigoCaja').hidden = false; $('#codigo').value = link;
  const texto = `Mis ${series.length} series de INKWELL. Ábrelo y se bajan todas: ${link}`;
  try{ if(navigator.share){ await navigator.share({ title: 'Mis series de INKWELL', text: texto }); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
  try{ await navigator.clipboard.writeText(texto); estado('Link copiado: pégalo en WhatsApp a quien quieras.', 'listo'); }
  catch{ $('#codigo').select(); estado('Copia el link de abajo y mándalo.', 'listo'); }
});

/* ── descubrir: cuando ya queda poco por leer, agrega sola un cómic del ranking de Webtoon ── */
async function descubrir(){
  const porDia = +ajustes.descubrir || 0; if(!porDia || !navigator.onLine) return 0;
  if(await contarListos() >= 6) return 0;
  const hoy = new Date().toISOString().slice(0, 10), reg = leer('tiras.descubiertas', { dia: '', n: 0 });
  if(reg.dia !== hoy){ reg.dia = hoy; reg.n = 0; }
  if(reg.n >= porDia) return 0;
  const series = await todasSeries(), webtoons = series.filter((x) => x.fuente === 'webtoon');
  const lang = (webtoons[0] && webtoons[0].ref.lang) || 'es';
  let candidatas = [];
  for(const r of ['trending', 'popular']){
    try{ candidatas = candidatas.concat(seriesDeRanking(await (await pedir(`https://www.webtoons.com/${lang}/ranking/${r}`)).text())); }catch{}
  }
  const elegidas = elegirNuevas(candidatas, { sigo: series.map((x) => x.id), descartadas: leer('tiras.descartadas', []), generos: webtoons.map((x) => x.ref.genero), cuantas: porDia - reg.n });
  let n = 0;
  for(const r of elegidas){
    try{ estado('Buscándote algo nuevo que leer…', 'trabajando'); if(await agregarRef(r, { varias: true, descubierta: true })){ n++; reg.n++; } }catch{}
  }
  escribir('tiras.descubiertas', reg);
  return n;
}
$('#formAgregar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = $('#buscar').value.trim(); if(!t) return;
  const r = reconocer(t), cod = leerCodigo(t);
  try{
    if(cod) return await importar(cod);
    if(r) return await agregarRef(r);
    if(/^https?:/i.test(t)){ estado('Ese link no es de una serie de Webtoon ni de Wattpad.'); return; }
    /* por nombre: cómics en Webtoon y textos en Wattpad, a la vez (4 nov: «le pedí que buscara series y nada») */
    estado(`Buscando «${t}» en Webtoon y Wattpad…`, 'trabajando');
    const lang = ((await todasSeries()).find((x) => x.fuente === 'webtoon') || { ref: { lang: 'es' } }).ref.lang;
    const [wt, wp] = await Promise.all([
      pedir(`https://www.webtoons.com/${lang}/search?keyword=${encodeURIComponent(t)}`).then((r) => r.text()).then((h) => seriesDeGenero(h).slice(0, 20)).catch(() => []),
      wattpad.buscar(t, directo).catch(() => []),
    ]);
    const rs = [...wt.map((x) => ({ ref: x.ref, titulo: x.titulo, sub: 'Webtoon · cómic' + (x.autor ? ' · ' + x.autor : ''), portada: x.portada, porRecadero: true })),
      ...wp.map((x) => ({ ref: { fuente: 'wattpad', story: String(x.story) }, titulo: x.titulo, sub: `Wattpad · texto · ${x.autor || ''} · ${x.partes} parte${x.partes === 1 ? '' : 's'}`, portada: x.portada }))];
    $('#resultados').innerHTML = rs.length ? rs.map((x, i) => `<div class="resultado" data-v="${i}"><img alt="" data-p="${i}"><div><b>${esc(x.titulo)}</b><span>${esc(x.sub)}</span></div><button type="button" class="si" data-i="${i}">Seguir</button></div>`).join('')
      : '<p class="vacio">No encontré nada con ese nombre en Webtoon ni en Wattpad.</p>';
    for(const img of $('#resultados').querySelectorAll('img[data-p]')){ const x = rs[+img.dataset.p]; if(!x.portada) continue;
      if(x.porRecadero) pedir(x.portada).then((r) => r.blob()).then((b) => { img.src = urlDe(b); }).catch(() => {}); else img.src = x.portada; }
    $('#resultados').onclick = (ev) => { const b = ev.target.closest('button[data-i]');
      if(!b){ const t = ev.target.closest('.resultado[data-v]'); if(t){ const x = rs[+t.dataset.v]; abrirVista(x.ref, { ...x, autor: x.sub.split(' · ')[2] || '' }); } return; } b.disabled = true; b.textContent = 'Agregando…'; agregarRef(rs[+b.dataset.i].ref).then(() => { b.textContent = 'Ya la sigues'; }).catch((er) => { b.disabled = false; b.textContent = 'Seguir'; estado(er.message); }); };
    estado(rs.length ? `${wt.length} en Webtoon · ${wp.length} en Wattpad.` : '', 'listo');
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
  /* desde la ficha: a partir del episodio elegido, leído o no, lo que esté bajado */
  if(desdeN != null && series[0]){ const s = series[0], t = await clavesDe(s.id); return s.caps.filter((c) => c.n >= desdeN && t.has(clave(s, c.n))).map((c) => ({ s, c })); }
  const porSerie = [];
  for(const s of series){ const t = await clavesDe(s.id); porSerie.push(pendientes(s).filter((c) => t.has(clave(s, c.n))).map((c) => ({ s, c }))); }
  if(ajustes.orden === 'intercalado'){
    const out = []; for(let i = 0; porSerie.some((l) => l[i]); i++) for(const l of porSerie) if(l[i]) out.push(l[i]);
    return out;
  }
  return porSerie.flat();
}
let desdeN = null;
async function abrirLector(serieId = null, desde = null){
  soloSerie = serieId; desdeN = desde;
  cola = await armarCola();
  enLector = [];
  const sc = $('#scroll'); sc.replaceChildren(); sc.scrollTop = 0;
  final = document.createElement('div'); final.className = 'al-final'; sc.append(final);
  $('#lector').hidden = false; document.body.classList.add('lee'); $('#lector').classList.add('sinbarra'); ultimoTop = 0; document.body.style.overflow = 'hidden';
  /* El observador sólo CARGA (ve 1200 px por adelantado). Lo leído se decide
     aparte, al moverse (`alMover`): con el mismo observador un capítulo se
     daba por leído en cuanto quedaba a 1200 px de aparecer, y con uno sin
     margen, un dedazo rápido se brincaba el final sin que nadie lo viera. */
  observador?.disconnect();
  observador = new IntersectionObserver((xs) => { for(const x of xs) if(x.isIntersecting) siguiente(); }, { root: sc, rootMargin: '0px 0px 1200px 0px' });
  observador.observe(final);
  const m = leer(MARCA, null), hayMarca = m && m.clave && cola.some((x) => clave(x.s, x.c.n) === m.clave);
  await siguiente();
  if(!enLector.length){ final.textContent = 'No hay capítulos listos. Conéctate a internet y se preparan solos.'; preparar(); }
  else if(hayMarca && desdeN == null) await irAMarca(m);
}
/* ── el marcador: dónde ibas, para volver ahí (Carlos, 5 nov) ──────────
   Se guarda el capítulo que está arriba en la pantalla y qué tanto de él ya pasó (0 a 1), al
   moverse, al salir de la app y al cerrar el lector. Si cerraste la app CON el lector abierto,
   al volver a abrirla te regresa solo; si lo cerraste tú, te regresa al abrir el lector. */
const MARCA = 'tiras.marcador';
function guardarMarca(abierto = true){
  if($('#lector').hidden || !enLector.length) return;
  const y = $('#scroll').scrollTop, v = enLector.find(({ art }) => art.offsetTop + art.offsetHeight > y + 1);
  if(!v) return;
  const a = v.art, frac = Math.max(0, Math.min(1, (y - a.offsetTop) / Math.max(1, a.offsetHeight)));
  escribir(MARCA, { serie: soloSerie, clave: a.dataset.clave, frac: Math.round(frac * 1e4) / 1e4, abierto, t: Date.now() });
}
async function irAMarca(m){
  for(let i = 0; i < 40 && !enLector.some((v) => v.clave === m.clave); i++){
    if(poniendo){ await new Promise((r) => setTimeout(r, 30)); continue; }
    if(!cola.length) break;
    await siguiente();
  }
  const v = enLector.find((x) => x.clave === m.clave); if(!v) return false;
  /* lo de abajo tiene que existir: si no, el navegador topa el scroll y te deja más arriba */
  if(cola.length && enLector[enLector.length - 1] === v){ while(poniendo) await new Promise((r) => setTimeout(r, 30)); await siguiente(); }
  const sc = $('#scroll'), meta = () => v.art.offsetTop + m.frac * v.art.offsetHeight;
  for(let k = 0; k < 8; k++){
    await new Promise((r) => requestAnimationFrame(r));
    if(Math.abs(sc.scrollTop - meta()) > 3) sc.scrollTop = meta();
  }
  ultimoTop = sc.scrollTop;
  cabecera(v.art);
  const se = $('#sello'); se.hidden = true; void se.offsetWidth; se.hidden = false;
  clearTimeout(irAMarca.t); irAMarca.t = setTimeout(() => { se.hidden = true; }, 2700);
  return true;
}
let marcaT = 0;
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
      v.art._urls.forEach((u) => URL.revokeObjectURL(u)); v.art.remove(); sc.scrollTop -= alto; ultimoTop -= alto;
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
$('#scroll').addEventListener('scroll', () => { clearTimeout(marcaT); marcaT = setTimeout(() => guardarMarca(true), 700); }, { passive: true });
addEventListener('pagehide', () => guardarMarca(true));
/* La barra de arriba (título, capítulo y la ✕) vive escondida: aparece si tocas la pantalla y
   se va si vuelves a tocar (Carlos, 10 nov: «que solo aparezca si pico la pantalla»). Deslizar ya
   no la saca: estorbaba al leer. */
$('#scroll').addEventListener('click', (e) => { if(!e.target.closest('a,button')) $('#lector').classList.toggle('sinbarra'); });
function cabecera(art){ $('#lTitulo').textContent = art.dataset.titulo; $('#lSub').textContent = art.dataset.cap; }
async function leido(art){
  if(!art || art.dataset.leido) return;
  art.dataset.leido = '1';
  const s = limpia(await tx('series', 'readonly', (st) => st.get(art.dataset.serie))); if(!s) return;
  const n = +art.dataset.n;
  if(!(s.leidos || []).includes(n)){ s.leidos = [...(s.leidos || []), n]; await guardarSerie(s); apuntar(s.id, n); }
  escribir('tiras.ultimo', art.dataset.clave);
}
$('#cerrarLector').addEventListener('click', () => {
  clearTimeout(marcaT); guardarMarca(false); $('#sello').hidden = true;
  observador?.disconnect();
  for(const v of enLector) v.art._urls.forEach((u) => URL.revokeObjectURL(u));
  enLector = []; $('#scroll').replaceChildren();
  $('#lector').hidden = true; document.body.classList.remove('lee'); document.body.style.overflow = '';
  pintarSeries(); preparar();
});
$('#leerTodo').addEventListener('click', () => abrirLector());

/* ── botones de cada serie ── */
let actual = null;
$('#series').addEventListener('click', async (e) => {
  const art = e.target.closest('.serie'); if(!art) return;
  const b = e.target.closest('button[data-a]');
  if(b) return accion(b.dataset.a, art.dataset.id);
  abrirFicha(art.dataset.id);                 // tocar la portada o el nombre abre la ficha
});
async function accion(a, id){
  actual = limpia(await tx('series', 'readonly', (st) => st.get(id)));
  if(a === 'leer'){
    const t = await clavesDe(id), p = pendientes(actual);
    if(p.length && !t.has(clave(actual, p[0].n))){
      try{ estado(`Bajando ${actual.titulo} · cap. ${p[0].n}…`, 'trabajando'); await bajarCap(actual, p[0]); estado('', 'listo'); }
      catch(er){ estado('No se pudo bajar: ' + er.message); return; }
    }
    abrirLector(id);
  } else if(a === 'archivo') abrirArchivo();
  else {
    $('#tSerie').textContent = actual.titulo;
    $('#serieDesc').textContent = `${actual.caps.length} capítulos · ${actual.enlace}`;
    $('#sDesde').value = actual.desde || actual.caps[0]?.n || 1;
    $('#dlgSerie').showModal();
  }
}

/* ── la ficha de la serie: portada en grande, sus datos y TODOS los episodios en orden
   para saltar rápido (Carlos, 10 nov). Tocar un episodio abre el lector ahí. ── */
let fichaId = null;
async function abrirFicha(id){
  const s = limpia(await tx('series', 'readonly', (st) => st.get(id))); if(!s) return;
  fichaId = id;
  const t = await clavesDe(id), leidosSet = new Set(s.leidos || []);
  const esLeido = (c) => leidosSet.has(c.n) || c.n < (s.desde || 0);
  const nLeidos = s.caps.filter(esLeido).length, pct = s.caps.length ? Math.round(100 * nLeidos / s.caps.length) : 0;
  const u = s.portadaBlob ? urlDe(s.portadaBlob) : '';
  if(u){ $('#fPortada').src = u; $('#fFondo').src = u; } else { $('#fPortada').removeAttribute('src'); $('#fFondo').removeAttribute('src'); }
  $('#fFuente').textContent = s.fuente === 'webtoon' ? 'Webtoon · cómic' : 'Wattpad · texto';
  $('#fTitulo').textContent = s.titulo; $('#fAutor').textContent = s.autor || '';
  /* el avance, como la plumilla que se llena de tinta (nada de barrita: Carlos, 10 nov) */
  $('#fTinta').innerHTML = nLeidos ? plumilla(pct / 100) : '';
  $('#fAvance').textContent = !nLeidos ? 'Todavía no la empiezas' : pendientes(s)[0] ? `Vas en el capítulo ${pendientes(s)[0].n}` : 'La terminaste';
  const sig = pendientes(s)[0];
  $('#fLeer').innerHTML = icono('play') + (sig ? (nLeidos ? `Seguir · cap. ${sig.n}` : 'Empezar a leer') : 'Ya la leíste toda');
  $('#fLeer').disabled = !sig;
  $('#fNum').textContent = `${s.caps.length} episodio${s.caps.length === 1 ? '' : 's'}`;
  $('#fCaps').innerHTML = s.caps.map((c) => {
    const est = esLeido(c) ? ['leido', 'Leído'] : t.has(clave(s, c.n)) ? ['listo', 'Listo'] : ['nube', 'Por bajar'];
    return `<button type="button" class="f-cap${sig && c.n === sig.n ? ' sigue' : ''}" data-n="${c.n}"><span class="num">${c.n}</span><span class="tt">${esc(c.titulo)}</span><span class="etq ${est[0]}">${est[1]}</span></button>`;
  }).join('');
  $('#ficha').hidden = false; $('#ficha').scrollTop = 0; document.body.style.overflow = 'hidden';
  const elSig = $('#fCaps .sigue'); if(elSig && s.caps.length > 12) requestAnimationFrame(() => { $('#ficha').scrollTop = Math.max(0, elSig.offsetTop - 260); });
}
function cerrarFicha(){ $('#ficha').hidden = true; document.body.style.overflow = ''; fichaId = null; }
$('#fCerrar').addEventListener('click', cerrarFicha);
$('#fLeer').addEventListener('click', () => { const id = fichaId; cerrarFicha(); accion('leer', id); });
$('#fArchivo').addEventListener('click', () => accion('archivo', fichaId));
$('#fMas').addEventListener('click', () => accion('mas', fichaId));
$('#fCaps').addEventListener('click', async (e) => {
  const b = e.target.closest('.f-cap'); if(!b) return;
  const s = limpia(await tx('series', 'readonly', (st) => st.get(fichaId))), n = +b.dataset.n, c = s.caps.find((x) => x.n === n);
  if(!(await clavesDe(s.id)).has(clave(s, n))){
    if(!navigator.onLine){ estado('Ese episodio no está bajado y no hay internet.'); return; }
    b.querySelector('.etq').textContent = 'Bajando…';
    try{ await bajarCap(s, c); }catch(er){ b.querySelector('.etq').textContent = 'No se pudo'; estado('No se pudo bajar: ' + er.message); return; }
  }
  cerrarFicha(); abrirLector(s.id, n);
});
$('#guardarDesde').addEventListener('click', async () => {
  actual.desde = Math.max(0, +$('#sDesde').value || 0);
  await guardarSerie(actual); $('#dlgSerie').close(); await pintarSeries(); if(fichaId) abrirFicha(fichaId); preparar();
});
$('#quitarSerie').addEventListener('click', async () => {
  if(!confirm(`¿Quitar «${actual.titulo}» y todo lo bajado de ella?`)) return;
  /* una sugerida que quitas no vuelve a aparecer */
  if(actual.descubierta) escribir('tiras.descartadas', [...new Set([...leer('tiras.descartadas', []), actual.id])].slice(-500));
  const ks = [...await clavesDe(actual.id)];
  await tx('caps', 'readwrite', (st) => { ks.forEach((k) => st.delete(k)); });
  await tx('series', 'readwrite', (st) => st.delete(actual.id));
  $('#dlgSerie').close(); if(fichaId) cerrarFicha(); await pintarSeries(); espacio();
  const n = await contarListos(); estado(n ? `${n} capítulo${n > 1 ? 's' : ''} listo${n > 1 ? 's' : ''} para leer` : 'Nada pendiente por leer.', 'listo');
});
$('#cerrarSerie').addEventListener('click', () => $('#dlgSerie').close());

/* ── una serie en un archivo ── */
const TOPE = 300;   // capítulos por archivo (en cómic, el iPhone parte en 25: ver PARTE)
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
/* junta los capítulos (bajando los que falten) y arma el archivo de una serie */
async function armarArchivo(serie, caps, avisa = () => {}){
  /* 1) lo que falte se baja primero, tres capítulos a la vez */
  const tengo = await clavesDe(serie.id);
  const faltan = caps.filter((c) => !tengo.has(clave(serie, c.n)));
  if(faltan.length && !navigator.onLine) throw new Error(`el cap. ${faltan[0].n} no está bajado y no hay internet`);
  let k = 0, hechos = 0;
  const obrero = async () => { while(k < faltan.length){ const c = faltan[k++]; await bajarCap(serie, c); hechos++;
    avisa(`Bajando ${serie.titulo} · ${hechos} de ${faltan.length} capítulos que faltaban…`, 0.7 * hechos / faltan.length); } };
  await Promise.all([obrero(), obrero(), obrero()]);
  /* 2) se junta de uno en uno y se suelta cada capítulo en cuanto se usa: con
     todos en la mano a la vez, el iPhone cerraba la pestaña antes de los 40 */
  const base = `${serie.titulo} (${caps[0].n}-${caps[caps.length - 1].n})`.replace(/[\\/:*?"<>|]+/g, ' ');
  const paginas = [], capitulos = [];
  for(const [i, c] of caps.entries()){
    const r = await capDe(clave(serie, c.n));
    if(!r) throw new Error(`no encontré el cap. ${c.n}`);
    avisa(`Juntando ${serie.titulo} · cap. ${c.n} (${i + 1} de ${caps.length})…`, 0.7 + 0.3 * (i + 1) / caps.length);
    if(serie.fuente === 'webtoon'){
      paginas.push({ tipo: 'titulo', texto: `Capítulo ${r.n}`, sub: r.titulo });
      for(const b of r.imgs) paginas.push({ tipo: 'imagen', ...(await aJpeg(b)) });
    } else capitulos.push({ titulo: `${r.n}. ${r.titulo}`, html: r.html });
  }
  avisa('Armando el archivo…', 1);
  let blob, nombre;
  if(serie.fuente === 'webtoon'){
    const ancho = paginas.find((p) => p.tipo === 'imagen')?.ancho || 800;
    blob = pdf(paginas, { titulo: serie.titulo, ancho }); nombre = base + '.pdf';
  } else {
    blob = epub({ titulo: serie.titulo, autor: serie.autor, id: serie.id, capitulos });
    nombre = base + '.epub';
  }
  paginas.length = 0;
  return new File([blob], nombre, { type: blob.type });
}
/* en el iPhone se guarda con la hoja de compartir (Archivos o Libros); en computadora, se descarga */
async function entregar(f){
  if(navigator.canShare?.({ files: [f] }) && /iPhone|iPad/.test(navigator.userAgent)){
    try{ await navigator.share({ files: [f] }); return 'compartido'; } catch(er){ if(er.name === 'AbortError') return 'cancelado'; }
  }
  bajar(f); return 'bajado';
}
$('#armar').addEventListener('click', async () => {
  const de = +$('#aDesde').value, a = +$('#aHasta').value;
  const caps = actual.caps.filter((c) => c.n >= Math.min(de, a) && c.n <= Math.max(de, a)).slice(0, TOPE);
  if(!caps.length){ $('#aEstado').textContent = 'Ese rango no tiene capítulos.'; return; }
  $('#armar').disabled = true;
  try{
    const f = await armarArchivo(actual, caps, (t, x) => { $('#aEstado').textContent = t; $('#aBarra').style.width = (100 * x) + '%'; });
    $('#aBarra').style.width = '100%';
    const como = await entregar(f);
    $('#aEstado').textContent = como === 'bajado' ? `Listo: ${f.name} (${Math.round(f.size / 1e6) || 1} MB).` : 'Listo.';
    pintarSeries();
  } catch(er){ $('#aEstado').textContent = 'No se pudo: ' + er.message; }
  finally{ $('#armar').disabled = false; }
});

/* ── TODO en archivos: todas las series, todos los capítulos ──
   Un cómic de Webtoon pesa mucho (decenas de imágenes por capítulo): cada PDF lleva hasta 100 capítulos;
   el texto, hasta 300. En el iPhone cada archivo listo se guarda con su botón: la hoja de compartir
   sólo abre si la pide un toque, así que no se pueden soltar diez seguidos. */
/* en el iPhone, partes más chicas: un PDF de 100 capítulos de cómic pasa de 1 GB y Safari cierra la pestaña */
const IPHONE = /iPhone|iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const PARTE = IPHONE ? { webtoon: 25, wattpad: 200 } : { webtoon: 100, wattpad: 300 };
let todoListos = [];
$('#todoArchivo').addEventListener('click', async () => {
  const ss = await todasSeries();
  const total = ss.reduce((n, s) => n + s.caps.length, 0);
  $('#todoNota').textContent = ss.length ? `${ss.length} serie${ss.length > 1 ? 's' : ''}, ${total} capítulos en total. Lo que no esté bajado se baja; con mucho, tarda. Deja la pantalla prendida.` : 'Todavía no sigues ninguna serie.';
  $('#todoEmpezar').disabled = !ss.length; $('#tEstado').textContent = ''; $('#tBarra').style.width = '0';
  $('#dlgTodo').showModal();
});
$('#todoEmpezar').addEventListener('click', async () => {
  $('#todoEmpezar').disabled = true; todoListos = []; $('#tListos').replaceChildren();
  let candado = null; try{ candado = await navigator.wakeLock?.request('screen'); }catch{}
  try{
    const ss = await todasSeries();
    const trabajos = [];
    for(const s of ss){ const t = PARTE[s.fuente] || 100; for(let i = 0; i < s.caps.length; i += t) trabajos.push({ s, caps: s.caps.slice(i, i + t) }); }
    for(const [k, w] of trabajos.entries()){
      const f = await armarArchivo(w.s, w.caps, (t, x) => { $('#tEstado').textContent = `Archivo ${k + 1} de ${trabajos.length} · ${t}`; $('#tBarra').style.width = (100 * (k + x) / trabajos.length) + '%'; });
      todoListos.push(f);
      const fila = document.createElement('div'); fila.className = 'resultado';
      fila.innerHTML = `<span></span><div><b>${esc(f.name)}</b><span>${Math.round(f.size / 1e6) || 1} MB</span></div><button type="button" class="si" data-i="${todoListos.length - 1}">Guardar</button>`;
      $('#tListos').append(fila);
      if(!/iPhone|iPad/.test(navigator.userAgent)) bajar(f);
    }
    $('#tBarra').style.width = '100%';
    $('#tEstado').textContent = `Listo: ${todoListos.length} archivo${todoListos.length > 1 ? 's' : ''}.` + (/iPhone|iPad/.test(navigator.userAgent) ? ' Toca «Guardar» en cada uno (Archivos o Libros).' : '');
  } catch(er){ $('#tEstado').textContent = 'No se pudo: ' + er.message; }
  finally{ $('#todoEmpezar').disabled = false; try{ await candado?.release(); }catch{} pintarSeries(); }
});
$('#tListos').addEventListener('click', async (e) => { const b = e.target.closest('button[data-i]'); if(!b) return; const r = await entregar(todoListos[+b.dataset.i]); if(r !== 'cancelado'){ b.textContent = 'Guardado'; } });
$('#cerrarTodo').addEventListener('click', () => $('#dlgTodo').close());

/* ── explorar por categoría ── */
$('#genero').innerHTML = GENEROS.map(([k, t]) => `<option value="${k}">${t}</option>`).join('');
let porGenero = [];
$('#formGenero').addEventListener('submit', async (e) => {
  e.preventDefault();
  const g = $('#genero').value, caja = $('#porGenero');
  const lang = ((await todasSeries()).find((x) => x.fuente === 'webtoon') || { ref: { lang: 'es' } }).ref.lang;
  caja.innerHTML = '<p class="vacio">Buscando…</p>';
  try{
    const sigo = new Set((await todasSeries()).map((x) => x.id));
    porGenero = seriesDeGenero(await (await pedir(`https://www.webtoons.com/${lang}/genres/${g}?sortOrder=LIKEIT`)).text()).slice(0, 60);
    pintarPorGenero(sigo);
  } catch(er){ caja.innerHTML = `<p class="vacio">No se pudo: ${esc(er.message)}</p>`; }
});
function pintarPorGenero(sigo, aviso = ''){
  const caja = $('#porGenero');
    caja.innerHTML = aviso + (porGenero.length ? porGenero.map((x, i) => `<div class="resultado" data-v="${i}"><img alt="" data-p="${i}"><div><b>${esc(x.titulo)}</b><span>${esc(x.autor)}</span></div>${sigo.has('webtoon:' + x.ref.titleNo) ? '<button type="button" disabled>Ya la sigues</button>' : `<button type="button" class="si" data-i="${i}">Seguir</button>`}</div>`).join('')
      : '<p class="vacio">No encontré cómics en esa categoría.</p>');
    /* las portadas piden venir «de webtoons.com»: van por el recadero, de a poco */
    for(const img of caja.querySelectorAll('img[data-p]')){ const x = porGenero[+img.dataset.p]; if(!x.portada) continue; pedir(x.portada).then((r) => r.blob()).then((b) => { img.src = urlDe(b); }).catch(() => {}); }
}
/* de base, sin buscar: recomendaciones de tus géneros que todavía no sigues */
async function recomendacionesBase(){
  if(!navigator.onLine || $('#porGenero').children.length) return;
  const ss = await todasSeries(), wt = ss.filter((x) => x.fuente === 'webtoon');
  const cuenta = new Map(); for(const x of wt) cuenta.set(x.ref.genero, (cuenta.get(x.ref.genero) || 0) + 1);
  try{
    porGenero = await recomendar({ sigo: ss.map((x) => x.id), descartadas: leer('tiras.descartadas', []), generos: [...cuenta].sort((a, b) => b[1] - a[1]).map(([k]) => k).filter((k) => !/canvas|challenge/.test(k)), lang: wt[0]?.ref.lang || 'es', cuantas: 24 });
  }catch{ porGenero = []; }
  if(porGenero.length && !$('#porGenero').children.length) pintarPorGenero(new Set(ss.map((x) => x.id)), '<p class="lema-rec">Para ti: lo más querido de tus géneros que aún no sigues. Toca una para ver su ficha.</p>');
}
$('#porGenero').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-i]');
  if(!b){ const t = e.target.closest('.resultado[data-v]'); if(t) abrirVista(porGenero[+t.dataset.v].ref, porGenero[+t.dataset.v]); return; }
  b.disabled = true; b.textContent = 'Agregando…';
  try{ await agregarRef(porGenero[+b.dataset.i].ref); b.textContent = 'Ya la sigues'; }catch(er){ b.disabled = false; b.textContent = 'Seguir'; estado('No se pudo: ' + er.message); }
});
/* ── la ficha de Explorar: la serie ANTES de seguirla ─────────────────────
   Al tocar un cómic de la búsqueda o de un género se abre como su página en
   Webtoon: portada, género, vistas, suscriptores, estado, sinopsis y los
   episodios con miniatura, fecha y likes. Los primeros PRUEBA se leen de
   probadita sin seguirla (no se guardan); para el resto, se sigue y se bajan. */
const PRUEBA = 3;
let vistaDe = null, previoUrls = [];
const cifraMx = (t) => String(t || '').replace(/(\d)\s*K$/i, '$1 mil').replace(/(\d)\s*M$/i, '$1 M').replace(/(\d)\s*B$/i, '$1 mil M');
const fechaMx = (f) => f ? new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const GENEROS_ES = { fantasy: 'Fantasía', romance: 'Romance', drama: 'Drama', action: 'Acción', comedy: 'Comedia', thriller: 'Suspenso', horror: 'Terror', 'slice of life': 'Vida cotidiana', 'sci-fi': 'Ciencia ficción', supernatural: 'Sobrenatural', mystery: 'Misterio', sports: 'Deportes', superhero: 'Superhéroes', 'historical': 'Histórico', 'heartwarming': 'Conmovedor', 'informative': 'Informativo', 'graphic novel': 'Novela gráfica', 'school': 'Escolar', 'local': 'Local', 'bl / gl': 'BL / GL' };
function imgPor(img, u, wt){ if(!u) return; if(!wt){ img.src = u; return; } pedir(u).then((r) => r.blob()).then((b) => { img.src = urlDe(b); }).catch(() => {}); }
async function abrirVista(ref, base = {}){
  const id = ref.fuente === 'webtoon' ? FUENTES.webtoon.id(ref) : ref.story ? wattpad.id(ref.story) : null;
  if(id && await tx('series', 'readonly', (st) => st.get(id))){ abrirFicha(id); return; }
  const wt = ref.fuente === 'webtoon';
  vistaDe = { ref, f: null, wt };
  for(const k of ['vPortada', 'vFondo']) $('#' + k).removeAttribute('src');
  imgPor($('#vPortada'), base.portada, wt && base.porRecadero !== false); imgPor($('#vFondo'), base.portada, wt && base.porRecadero !== false);
  $('#vGenero').textContent = wt ? 'Webtoon · cómic' : 'Wattpad · texto';
  $('#vTitulo').textContent = base.titulo || ''; $('#vAutor').textContent = base.autor || ''; $('#vEstado').textContent = '';
  $('#vCifras').replaceChildren(); $('#vSinopsis').textContent = ''; $('#vNota').textContent = ''; $('#vNum').textContent = '';
  $('#vSeguir').disabled = false; $('#vSeguir').innerHTML = icono('plus') + 'Seguir';
  $('#vProbar').disabled = true; $('#vProbar').textContent = 'Probar el 1';
  $('#vCaps').innerHTML = '<p class="vacio">Cargando los episodios…</p>';
  $('#vista').hidden = false; $('#vista').scrollTop = 0; document.body.style.overflow = 'hidden';
  try{
    const f = wt ? await FUENTES.webtoon.ficha(ref, pedir) : await wattpad.serie(ref, directo);
    if(!vistaDe || vistaDe.ref !== ref) return;
    vistaDe.f = f; pintarVista(f, base);
  } catch(er){ if(vistaDe && vistaDe.ref === ref) $('#vCaps').innerHTML = `<p class="vacio">No se pudo abrir: ${esc(er.message)}</p>`; }
}
function pintarVista(f, base){
  const { wt } = vistaDe;
  $('#vTitulo').textContent = f.titulo; $('#vAutor').textContent = f.autor || '';
  if(f.genero) $('#vGenero').textContent = GENEROS_ES[f.genero.toLowerCase()] || f.genero;
  $('#vEstado').textContent = f.estado || '';
  if(f.fondo) imgPor($('#vFondo'), f.fondo, wt);
  if(!base.portada && f.portada){ imgPor($('#vPortada'), f.portada, wt); if(!f.fondo) imgPor($('#vFondo'), f.portada, wt); }
  const cifras = [[cifraMx(f.vistas), 'vistas'], [cifraMx(f.suscriptores), 'suscriptores'], [String(f.caps.length), f.caps.length === 1 ? 'episodio' : 'episodios']].filter(([v]) => v && v !== '0');
  $('#vCifras').innerHTML = cifras.map(([v, t]) => `<div><b>${esc(v)}</b><span>${t}</span></div>`).join('');
  const sin = f.sinopsis || f.descripcion || '';
  $('#vSinopsis').textContent = sin; $('#vSinopsis').classList.toggle('corta', sin.length > 260);
  $('#vNum').textContent = `${f.caps.length}`;
  $('#vNota').textContent = f.caps.length > PRUEBA ? `Los primeros ${PRUEBA} se leen de probadita. Para el resto, síguela y se bajan a tu teléfono.` : '';
  $('#vProbar').disabled = !f.caps.length; $('#vProbar').innerHTML = icono('play') + 'Probar el 1';
  $('#vCaps').innerHTML = f.caps.map((c, i) => `<button type="button" class="f-cap v-ep${i < PRUEBA ? '' : ' cerrado'}" data-i="${i}">
      ${wt ? `<img alt="" data-m="${i}">` : ''}<span class="tx"><b>${esc(c.titulo)}</b><small>${[fechaMx(c.fecha), c.likes ? c.likes + ' likes' : ''].filter(Boolean).join(' · ')}</small></span>
      ${i < PRUEBA ? '<span class="gratis">Probar</span>' : ''}<span class="n">#${c.n}</span></button>`).join('');
  /* miniaturas: sólo las que se asoman (una serie larga trae cientos) */
  if(wt){
    const io = new IntersectionObserver((es) => { for(const e of es){ if(!e.isIntersecting) continue; io.unobserve(e.target); imgPor(e.target, f.caps[+e.target.dataset.m].miniatura, true); } }, { root: $('#vista'), rootMargin: '400px' });
    vistaDe.io = io; $('#vCaps').querySelectorAll('img[data-m]').forEach((im) => io.observe(im));
  }
}
function cerrarVista(){ if(vistaDe && vistaDe.io) vistaDe.io.disconnect(); vistaDe = null; $('#vista').hidden = true; document.body.style.overflow = ''; }
$('#vCerrar').innerHTML = icono('x'); $('#pCerrar').innerHTML = icono('x');
$('#vCerrar').addEventListener('click', cerrarVista);
$('#vSinopsis').addEventListener('click', (e) => e.currentTarget.classList.remove('corta'));
async function seguirVista(){
  if(!vistaDe) return;
  const { ref } = vistaDe, b = $('#vSeguir');
  b.disabled = true; b.textContent = 'Agregando…';
  try{
    const s = await agregarRef(ref);
    const id = s ? s.id : (ref.fuente === 'webtoon' ? FUENTES.webtoon.id(ref) : wattpad.id(ref.story));
    cerrarPrevio(); cerrarVista(); abrirFicha(id);
  } catch(er){ b.disabled = false; b.innerHTML = icono('plus') + 'Seguir'; estado('No se pudo: ' + er.message); }
}
$('#vSeguir').addEventListener('click', seguirVista);
$('#vProbar').addEventListener('click', () => abrirPrevio(0));
$('#vCaps').addEventListener('click', (e) => {
  const b = e.target.closest('.v-ep'); if(!b || !vistaDe || !vistaDe.f) return;
  const i = +b.dataset.i;
  if(i < PRUEBA) return abrirPrevio(i);
  $('#vNota').textContent = `El capítulo ${vistaDe.f.caps[i].n} ya es para quien la sigue: toca «Seguir» y se baja a tu teléfono.`;
  $('#vSeguir').focus(); $('#vista').scrollTo({ top: 0, behavior: 'smooth' });
});
async function abrirPrevio(i){
  if(!vistaDe || !vistaDe.f) return;
  const { f, wt } = vistaDe, c = f.caps[i], caja = $('#pScroll');
  cerrarPrevio(true);
  $('#pTitulo').textContent = f.titulo; $('#pSub').textContent = `Probadita · cap. ${c.n} · ${c.titulo}`;
  caja.innerHTML = '<p class="vacio">Cargando el capítulo…</p>'; caja.scrollTop = 0; $('#previo').hidden = false;
  const fin = `<div class="fin"><p>${i + 1 < Math.min(PRUEBA, f.caps.length) ? '¿Le sigues?' : f.caps.length > PRUEBA ? `Hasta aquí la probadita. Quedan ${f.caps.length - (i + 1)} capítulos.` : 'Es todo lo que hay por ahora.'}</p>
    ${i + 1 < Math.min(PRUEBA, f.caps.length) ? `<button type="button" class="si" data-sig="${i + 1}">Siguiente · cap. ${f.caps[i + 1].n}</button>` : ''}
    <button type="button" ${i + 1 < Math.min(PRUEBA, f.caps.length) ? '' : 'class="si"'} data-seguir>Seguir la serie</button></div>`;
  try{
    const r = await FUENTES[f.ref.fuente].capitulo(c, wt ? pedir : directo);
    if($('#previo').hidden) return;
    if(r.tipo === 'imagenes'){
      caja.innerHTML = r.urls.map(() => '<img alt="">').join('') + fin;
      const imgs = [...caja.querySelectorAll('img')]; let k = 0;
      const otra = async () => { while(k < imgs.length && !$('#previo').hidden){ const j = k++;
        try{ const u = URL.createObjectURL(await (await pedir(r.urls[j])).blob()); previoUrls.push(u); imgs[j].src = u; }catch{} } };
      otra(); otra(); otra();
    } else caja.innerHTML = `<div class="texto">${limpiarTexto(r.html)}</div>` + fin;
  } catch(er){ caja.innerHTML = `<p class="vacio">No se pudo abrir el capítulo: ${esc(er.message)}</p>` + fin; }
}
function cerrarPrevio(sigue = false){ if(!sigue) $('#previo').hidden = true; previoUrls.forEach((u) => URL.revokeObjectURL(u)); previoUrls = []; $('#pScroll').replaceChildren(); }
$('#pCerrar').addEventListener('click', () => cerrarPrevio());
$('#pScroll').addEventListener('click', (e) => {
  const sig = e.target.closest('[data-sig]'); if(sig) return abrirPrevio(+sig.dataset.sig);
  if(e.target.closest('[data-seguir]')) seguirVista();
});

function bajar(f){ const u = URL.createObjectURL(f), a = document.createElement('a'); a.href = u; a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
$('#cerrarArchivo').addEventListener('click', () => $('#dlgArchivo').close());

/* ── ajustes ── */
$('#adelante').value = String(ajustes.adelante); $('#orden').value = ajustes.orden;
$('#adelante').addEventListener('change', (e) => { ajustes.adelante = +e.target.value; escribir('tiras.ajustes', ajustes); preparar(); });
$('#orden').addEventListener('change', (e) => { ajustes.orden = e.target.value; escribir('tiras.ajustes', ajustes); });
$('#descubrir').value = String(ajustes.descubrir);
$('#descubrir').addEventListener('change', (e) => { ajustes.descubrir = e.target.value; escribir('tiras.ajustes', ajustes); preparar(); });
$('#revisar').addEventListener('click', () => preparar({ forzar: true }));
$('#compacto').value = ajustes.compacto;
$('#compacto').addEventListener('change', (e) => { ajustes.compacto = e.target.value; escribir('tiras.ajustes', ajustes); });
const mb = (n) => n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(n / 1e6)) + ' MB';
$('#apretar').addEventListener('click', async (e) => {
  const b = e.currentTarget; b.disabled = true;
  try{
    const r = await compactarTodo((k, t) => estado(`Apretando lo bajado: capítulo ${k} de ${t}…`, 'trabajando'));
    estado(r.caps ? `Listo: ${r.caps} capítulos pasaron de ${mb(r.antes)} a ${mb(r.despues)}.` : 'Ya estaba todo apretado.', 'listo'); espacio();
  } catch(er){ estado('No se pudo apretar: ' + er.message); }
  b.disabled = false;
});

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
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') preparar(); else guardarMarca(true); });
if('serviceWorker' in navigator && !params.has('servidor')) navigator.serviceWorker.register('sw.js').catch(() => {});
/* para las pruebas; va antes del arranque porque importar un link puede tardar */
window.__tiras = { abrirFicha, abrirVista, preparar, todasSeries, clavesDe, get cola(){ return cola; }, get ocupado(){ return !!preparando || otraVez; } };
await pintarSeries(); espacio(); recomendacionesBase();
/* desde el inicio: ?leer=todo | ?leer=<serie> | ?ficha=<serie> */
const pideLeer = params.get('leer'), pideFicha = params.get('ficha');
if(pideLeer || pideFicha) history.replaceState(null, '', location.pathname + (params.get('servidor') ? '?servidor=' + encodeURIComponent(params.get('servidor')) : ''));
if(pideLeer === 'todo') abrirLector(); else if(pideLeer) accion('leer', pideLeer); else if(pideFicha) abrirFicha(pideFicha);
{ const v = params.get('ver'), r = v && reconocer(v); if(r && r.fuente === 'webtoon') abrirVista(r); }
/* vienen de Explorar en el inicio (tiras.html?buscar=…): se busca de una vez */
if(params.get('buscar')){ $('#buscar').value = params.get('buscar'); $('#formAgregar').requestSubmit(); }
{ const m = leer(MARCA, null);
  if(m && m.abierto && m.clave && Date.now() - (m.t || 0) < 30 * 864e5 && !location.hash.includes('series=') && !pideLeer && !pideFicha && !params.get('ver')) abrirLector(m.serie || null); }
/* abrieron un link compartido (#series=…): se agregan todas de un jalón */
{ const cod = leerCodigo(location.hash);
  if(cod && cod.length && confirm(`Te compartieron ${cod.length} serie${cod.length > 1 ? 's' : ''}. ¿Agregarlas y empezar a bajarlas?`)){ history.replaceState(null, '', location.pathname + location.search); await importar(cod); }
  else preparar(); }
