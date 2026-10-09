/* CARTELES · la pantalla. El motor está en motor.js; aquí sólo se juntan los
   datos, se guardan las marcas y se descarga lo que sale. */
import { pintar, ESTILOS, FORMATOS, plan, leerTabla, rgb } from './motor.js';
import { preparar } from './recursos.js';
import './moda.js';
import './campanas.js';
import { iniciarCampana, cambioDeMarca } from './campana-app.js';

const $ = s => document.querySelector(s);
const estado = (t, donde = '#estado') => { $(donde).textContent = t; };

/* ───────────── guardado: IndexedDB para marcas (el logo es un archivo) ───────────── */
const BD = new Promise((ok, mal) => {
  const r = indexedDB.open('carteles', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('marcas', { keyPath: 'id' }); r.result.createObjectStore('cosas'); };
  r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
});
async function tx(tienda, modo, fn) {
  const db = await BD;
  return new Promise((ok, mal) => { const t = db.transaction(tienda, modo), s = t.objectStore(tienda), r = fn(s); t.oncomplete = () => ok(r?.result); t.onerror = () => mal(t.error); });
}
const todasMarcas = () => tx('marcas', 'readonly', s => s.getAll());
const guardarM = m => tx('marcas', 'readwrite', s => s.put(m));
const borrarM = id => tx('marcas', 'readwrite', s => s.delete(id));
const leerCosa = k => tx('cosas', 'readonly', s => s.get(k));
const guardarCosa = (k, v) => tx('cosas', 'readwrite', s => s.put(v, k));

/* ───────────── estado ───────────── */
let rec = null, marcas = [], marca = null, logoImg = null, fotoImg = null, fotoBlob = null;
let estilo = 'maison', formato = 'feed', semilla = 1;
/* En «Un cartel» y en el lote van los de moda y los de comida; los de campaña (tanda, encuesta) viven en Campaña. */
const SUELTOS = () => ESTILOS.filter(e => e.grupo !== 'campana' && !e.varias);
const DEL_GRUPO = () => { const g = (ESTILOS.find(e => e.id === estilo) || {}).grupo || 'moda'; return SUELTOS().filter(e => e.grupo === g); };
const imagenDe = blob => new Promise((ok, mal) => { if (!blob) return ok(null); const u = URL.createObjectURL(blob), i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = u; });

function marcaVacia() {
  return { id: 'm' + Date.now().toString(36), nombre: '', colores: { acento: '#F5B301', fondo: '#0E0E0E', texto: '#FFFFFF' }, letras: 'brocha', whatsapp: '', direccion: '', semana: '', logo: null };
}
function semanaDe(t) {
  return String(t || '').split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0]).map(([dia, grande, linea]) => ({ dia, grande, linea }));
}
function marcaParaMotor() {
  return { nombre: marca.nombre, colores: marca.colores, letras: marca.letras, whatsapp: marca.whatsapp, direccion: marca.direccion, logo: logoImg };
}
const CAMPOS = ['nombre', 'frase', 'promo', 'precio', 'detalle', 'ingredientes', 'dia', 'grande', 'nota', 'lema', 'remate'];
function producto() {
  const p = { foto: fotoImg };
  for (const c of CAMPOS) { const v = $('#p-' + c).value.trim(); if (v) p[c] = v; }
  if (p.ingredientes) p.ingredientes = p.ingredientes.split(',').map(s => s.trim()).filter(Boolean);
  return p;
}

/* ───────────── marca: formulario ───────────── */
function llenarMarca() {
  $('#marcas').replaceChildren(...marcas.map(m => Object.assign(document.createElement('option'), { value: m.id, textContent: m.nombre || 'Sin nombre', selected: m.id === marca.id })));
  $('#m-nombre').value = marca.nombre; $('#m-acento').value = marca.colores.acento; $('#m-fondo').value = marca.colores.fondo; $('#m-texto').value = marca.colores.texto;
  $('#m-letras').value = marca.letras; $('#m-whatsapp').value = marca.whatsapp; $('#m-direccion').value = marca.direccion; $('#m-semana').value = marca.semana || '';
  verLogo();
}
function verLogo() {
  const v = $('#m-logoVer');
  if (logoImg) { const i = document.createElement('img'); i.src = logoImg.src; i.alt = 'Logo'; i.id = 'm-logoVer'; v.replaceWith(i); }
  else if (v.tagName === 'IMG') { const s = document.createElement('span'); s.className = 'vacio'; s.id = 'm-logoVer'; s.textContent = 'Sin logo'; v.replaceWith(s); }
  $('#m-logoFondo').hidden = $('#m-logoQuitar').hidden = $('#m-colores').hidden = !logoImg;
}
function leerMarca() {
  marca.nombre = $('#m-nombre').value.trim(); marca.letras = $('#m-letras').value;
  marca.colores = { acento: $('#m-acento').value, fondo: $('#m-fondo').value, texto: $('#m-texto').value };
  marca.whatsapp = $('#m-whatsapp').value.trim(); marca.direccion = $('#m-direccion').value.trim(); marca.semana = $('#m-semana').value;
}
async function usarMarca(id) {
  marca = marcas.find(m => m.id === id) || marcas[0];
  logoImg = await imagenDe(marca.logo);
  await guardarCosa('marcaActual', marca.id);
  llenarMarca(); redibujar(); cambioDeMarca();
}
/** El color con más presencia y saturación del logo → acento. */
function coloresDelLogo(img) {
  const c = document.createElement('canvas'), s = 64; c.width = c.height = s;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, s, s);
  const d = x.getImageData(0, 0, s, s).data, cubetas = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0; if (sat < .35 || mx < 70) continue;
    const k = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5), v = cubetas.get(k) || { peso: 0, r: 0, g: 0, b: 0, n: 0 };
    v.peso += sat; v.r += r; v.g += g; v.b += b; v.n++; cubetas.set(k, v);
  }
  const m = [...cubetas.values()].sort((a, b) => b.peso - a.peso)[0];
  if (!m) return null;
  return '#' + [m.r, m.g, m.b].map(v => Math.round(v / m.n).toString(16).padStart(2, '0')).join('');
}

/* ───────────── elegir archivos ───────────── */
function elegir(accept, multiple = false) {
  return new Promise(ok => {
    const a = $('#archivo'); a.accept = accept; a.multiple = multiple; a.value = '';
    a.onchange = () => ok([...a.files]); a.click();
  });
}
async function quitarFondo(blob) {
  const { recortar } = await import('../presentaciones/recorte.js');
  const r = await recortar(blob, { recortarAlContenido: true, titulo: 'Quitar el fondo' });
  return r ? r.blob : null;
}

/* ───────────── el cartel ───────────── */
const lienzo = $('#lienzo');
let pendiente = 0;
async function redibujar() {
  if (!rec || !marca) return;
  const yo = ++pendiente;
  const o = { marca: marcaParaMotor(), prod: producto(), estilo, formato, semilla, semana: semanaDe(marca.semana) };
  pintar(lienzo, o, rec);
  if (await rec.listos() && yo === pendiente) pintar(lienzo, o, rec);
  guardarBorrador();
  clearTimeout(redibujar.t); redibujar.t = setTimeout(variantes, 250);
}
async function variantes() {
  const cont = $('#variantes'), o = { marca: marcaParaMotor(), prod: producto(), formato, semilla, semana: semanaDe(marca.semana) };
  const c = document.createElement('canvas'), botones = [];
  for (const e of DEL_GRUPO()) {
    pintar(c, { ...o, estilo: e.id }, rec);
    const chico = document.createElement('canvas'); chico.width = 270; chico.height = Math.round(270 * c.height / c.width);
    chico.getContext('2d').drawImage(c, 0, 0, chico.width, chico.height);
    const b = document.createElement('button'); b.setAttribute('aria-pressed', e.id === estilo); b.title = e.nombre;
    const i = document.createElement('img'); i.alt = e.nombre; i.src = chico.toDataURL('image/jpeg', .7); b.append(i);
    b.onclick = () => { estilo = e.id; marcarChips(); redibujar(); };
    botones.push(b);
  }
  cont.replaceChildren(...botones);
}
function marcarChips() {
  document.querySelectorAll('#estilos button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === estilo));
  document.querySelectorAll('#formatos button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === formato));
}
function chips() {
  $('#estilos').replaceChildren(...['moda', 'comida'].flatMap(g => [Object.assign(document.createElement('span'), { className: 'grupoChips', textContent: g === 'moda' ? 'Moda' : 'Comida' }),
    ...SUELTOS().filter(e => e.grupo === g).map(e => { const b = document.createElement('button'); b.dataset.id = e.id; b.textContent = e.nombre; b.title = e.para; b.onclick = () => { estilo = e.id; marcarChips(); redibujar(); }; return b; })]));
  $('#formatos').replaceChildren(...Object.entries(FORMATOS).map(([id, f]) => { const b = document.createElement('button'); b.dataset.id = id; b.textContent = f.nombre; b.onclick = () => { formato = id; marcarChips(); redibujar(); }; return b; }));
  $('#estilosLote').replaceChildren(...SUELTOS().filter(e => e.id !== 'semana').map(e => { const b = document.createElement('button'); b.dataset.id = e.id; b.textContent = e.nombre; b.setAttribute('aria-pressed', 'true'); b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); return b; }));
  $('#formatoLote').replaceChildren(...Object.entries(FORMATOS).map(([id, f]) => Object.assign(document.createElement('option'), { value: id, textContent: f.nombre })));
  marcarChips();
}
const nombreArchivo = (p, e, n = '') => `${(marca.nombre || 'marca')}-${p.nombre || 'cartel'}-${e}${n}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase() + '.png';
const aBlob = c => new Promise(ok => c.toBlob(ok, 'image/png'));
function bajar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

/* ───────────── borrador del producto (para no perderlo al cerrar) ───────────── */
function guardarBorrador() {
  const t = {}; for (const c of CAMPOS) t[c] = $('#p-' + c).value;
  try { localStorage.setItem('carteles.borrador', JSON.stringify({ t, estilo, formato, semilla })); } catch {}
}
async function leerBorrador() {
  try {
    const b = JSON.parse(localStorage.getItem('carteles.borrador') || 'null');
    if (b) { for (const c of CAMPOS) if (b.t?.[c] != null) $('#p-' + c).value = b.t[c]; estilo = b.estilo || estilo; formato = b.formato || formato; semilla = b.semilla || 1; }
  } catch {}
  fotoBlob = await leerCosa('foto').catch(() => null); fotoImg = await imagenDe(fotoBlob); verFoto();
}
function verFoto() {
  const v = $('#p-fotoVer');
  if (fotoImg) { const i = document.createElement('img'); i.src = fotoImg.src; i.alt = 'Foto del producto'; i.id = 'p-fotoVer'; v.replaceWith(i); }
  $('#p-fotoFondo').hidden = !fotoImg;
}

/* ───────────── lote ───────────── */
let fotosLote = new Map(), hechos = [];
const clave = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '');
async function hacerLote() {
  const prods = leerTabla($('#tabla').value);
  if (!prods.length) { estado('La tabla no trae productos: revisa que la primera fila tenga «Producto».', '#estadoLote'); return; }
  const estilos = [...document.querySelectorAll('#estilosLote button[aria-pressed="true"]')].map(b => b.dataset.id);
  if (!estilos.length) { estado('Elige al menos un estilo.', '#estadoLote'); return; }
  const tanda = parseInt($('#tanda').value, 10) || 1, por = parseInt($('#porProducto').value, 10) || 1;
  for (const p of prods) {
    const f = fotosLote.get(clave(p.archivo)) || fotosLote.get(clave(p.nombre));
    p.foto = f ? await imagenDe(f) : null;
  }
  const trabajos = plan(prods, estilos, { formato: $('#formatoLote').value, semilla: tanda, porProducto: por });
  hechos = []; const gal = $('#galeria'); gal.replaceChildren(); $('#bajarLote').hidden = true;
  const c = document.createElement('canvas'), m = marcaParaMotor(), sem = semanaDe(marca.semana);
  for (let i = 0; i < trabajos.length; i++) {
    const t = trabajos[i];
    estado(`Haciendo ${i + 1} de ${trabajos.length}…`, '#estadoLote');
    pintar(c, { ...t, marca: m, semana: sem }, rec);
    if (await rec.listos()) pintar(c, { ...t, marca: m, semana: sem }, rec);
    const blob = await aBlob(c); hechos.push({ nombre: nombreArchivo(t.prod, t.estilo, '-' + (i + 1)), blob });
    const img = document.createElement('img'); img.alt = `${t.prod.nombre} · ${t.estilo}`; img.src = URL.createObjectURL(blob); gal.append(img);
    await new Promise(r => setTimeout(r));
  }
  const sinFoto = prods.filter(p => !p.foto).length;
  estado(`Listos ${hechos.length} carteles.` + (sinFoto ? ` ${sinFoto} producto(s) sin foto: su nombre o la columna «Foto» no coincide con ningún archivo.` : ''), '#estadoLote');
  $('#bajarLote').hidden = !hechos.length;
}
async function bajarLote() {
  if (!window.JSZip) { estado('Falta el compresor; recarga la página.', '#estadoLote'); return; }
  const z = new JSZip(); hechos.forEach(h => z.file(h.nombre, h.blob));
  bajar(await z.generateAsync({ type: 'blob' }), `carteles-${(marca.nombre || 'marca').toLowerCase().replace(/[^\w]+/g, '-')}.zip`);
}
async function leerArchivoTabla(f) {
  if (/\.(csv|tsv|txt)$/i.test(f.name)) return f.text();
  if (!window.XLSX) await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = '../tienda/nucleo/vendor/xlsx-0.20.3.core.min.js'; s.onload = ok; s.onerror = mal; document.head.append(s); });
  const wb = XLSX.read(await f.arrayBuffer()); return XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS: '\t' });
}

/* ───────────── arranque ───────────── */
async function iniciar() {
  chips();
  estado('Cargando letras…');
  rec = await preparar();
  marcas = await todasMarcas();
  if (!marcas.length) { const m = marcaVacia(); m.nombre = 'Mi marca'; await guardarM(m); marcas = [m]; }
  const actual = await leerCosa('marcaActual').catch(() => null);
  await leerBorrador();
  marcarChips();
  await usarMarca(actual && marcas.some(m => m.id === actual) ? actual : marcas[0].id);
  estado('');
  if (navigator.canShare) $('#compartir').hidden = false;
  await iniciarCampana({ marcaParaMotor, marcaId: () => marca.id, rec });
}

document.querySelectorAll('[data-pestana]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-pestana]').forEach(x => x.setAttribute('aria-selected', x === b));
  for (const id of ['campana', 'uno', 'marca', 'lote']) $('#p-' + id).hidden = id !== b.dataset.pestana;
});
for (const c of CAMPOS) $('#p-' + c).addEventListener('input', () => { clearTimeout(redibujar.e); redibujar.e = setTimeout(redibujar, 120); });
$('#p-foto').onclick = async () => { const [f] = await elegir('image/*'); if (!f) return; fotoBlob = f; fotoImg = await imagenDe(f); await guardarCosa('foto', f); verFoto(); redibujar(); };
$('#p-fotoFondo').onclick = async () => { const b = await quitarFondo(fotoBlob); if (!b) return; fotoBlob = b; fotoImg = await imagenDe(b); await guardarCosa('foto', b); verFoto(); redibujar(); };
$('#otra').onclick = () => { semilla++; redibujar(); };
$('#descargar').onclick = async () => bajar(await aBlob(lienzo), nombreArchivo(producto(), estilo, '-' + semilla));
$('#compartir').onclick = async () => {
  const f = new File([await aBlob(lienzo)], nombreArchivo(producto(), estilo, '-' + semilla), { type: 'image/png' });
  try { await navigator.share({ files: [f] }); } catch {}
};
$('#marcas').onchange = e => usarMarca(e.target.value);
$('#nuevaMarca').onclick = async () => { const m = marcaVacia(); m.nombre = 'Marca nueva'; await guardarM(m); marcas = await todasMarcas(); await usarMarca(m.id); $('#m-nombre').focus(); };
$('#guardarMarca').onclick = async () => { leerMarca(); await guardarM(marca); marcas = await todasMarcas(); llenarMarca(); redibujar(); estado('Marca guardada.', '#estadoMarca'); };
$('#borrarMarca').onclick = async () => {
  if (marcas.length < 2) { estado('Es la única marca; crea otra antes de borrar ésta.', '#estadoMarca'); return; }
  if (!confirm(`¿Borrar la marca «${marca.nombre}»? Se pierden su logo y sus colores.`)) return;
  await borrarM(marca.id); marcas = await todasMarcas(); await usarMarca(marcas[0].id);
};
for (const id of ['m-acento', 'm-fondo', 'm-texto', 'm-letras', 'm-nombre', 'm-whatsapp', 'm-direccion', 'm-semana'])
  $('#' + id).addEventListener('input', () => { leerMarca(); clearTimeout(redibujar.m); redibujar.m = setTimeout(async () => { await guardarM(marca); redibujar(); }, 300); });
$('#m-logo').onclick = async () => { const [f] = await elegir('image/*'); if (!f) return; marca.logo = f; logoImg = await imagenDe(f); await guardarM(marca); verLogo(); redibujar(); };
$('#m-logoFondo').onclick = async () => { const b = await quitarFondo(marca.logo); if (!b) return; marca.logo = b; logoImg = await imagenDe(b); await guardarM(marca); verLogo(); redibujar(); };
$('#m-logoQuitar').onclick = async () => { marca.logo = null; logoImg = null; await guardarM(marca); verLogo(); redibujar(); };
$('#m-colores').onclick = async () => {
  const c = logoImg && coloresDelLogo(logoImg);
  if (!c) { estado('El logo no trae un color fuerte para usar de acento.', '#estadoMarca'); return; }
  $('#m-acento').value = c; leerMarca(); await guardarM(marca); redibujar(); estado(`Acento tomado del logo: ${c}.`, '#estadoMarca');
};
$('#exportarMarca').onclick = async () => {
  const datos = { ...marca, logo: marca.logo ? await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(marca.logo); }) : null };
  bajar(new Blob([JSON.stringify(datos)], { type: 'application/json' }), `marca-${(marca.nombre || 'marca').toLowerCase().replace(/[^\w]+/g, '-')}.json`);
};
$('#importarMarca').onclick = async () => {
  const [f] = await elegir('application/json,.json'); if (!f) return;
  try {
    const d = JSON.parse(await f.text()); const m = { ...marcaVacia(), ...d, id: 'm' + Date.now().toString(36) };
    if (typeof d.logo === 'string' && d.logo.startsWith('data:')) m.logo = await (await fetch(d.logo)).blob();
    m.colores = { ...marcaVacia().colores, ...(d.colores || {}) }; rgb(m.colores.acento);
    await guardarM(m); marcas = await todasMarcas(); await usarMarca(m.id); estado('Marca importada.', '#estadoMarca');
  } catch { estado('Ese archivo no es una marca exportada de aquí.', '#estadoMarca'); }
};
$('#subirTabla').onclick = async () => { const [f] = await elegir('.csv,.tsv,.txt,.xlsx,.xls'); if (!f) return; try { $('#tabla').value = await leerArchivoTabla(f); estado(`Tabla «${f.name}» lista.`, '#estadoLote'); } catch { estado('No se pudo leer ese archivo.', '#estadoLote'); } };
$('#subirFotos').onclick = async () => { const fs = await elegir('image/*', true); fs.forEach(f => fotosLote.set(clave(f.name), f)); $('#cuantasFotos').textContent = `${fotosLote.size} foto(s)`; };
$('#hacerLote').onclick = () => hacerLote().catch(e => estado('Algo falló: ' + (e.message || e), '#estadoLote'));
$('#bajarLote').onclick = bajarLote;

iniciar().catch(e => estado('No arrancó: ' + (e.message || e)));
