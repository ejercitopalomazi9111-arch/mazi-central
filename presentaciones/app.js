/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · la pantalla
   ──────────────────────────────────────────────────────────────────────────
   Una rejilla de láminas que se eligen tocándolas, y cuatro herramientas
   abajo. Cada herramienta dice SIEMPRE a cuántas láminas se va a aplicar:
   «todas» si no elegiste ninguna, o las que elegiste. Cada cambio es un solo
   paso de deshacer, aunque haya tocado trescientas láminas.
   ═════════════════════════════════════════════════════════════════════════ */
import * as N from './nucleo.js';
import * as V from './vista.js';
import * as IC from './iconos.js';
import * as IA from './ia.js';
import { crearBanco } from './banco.js';
import * as NOTI from './notificaciones.js';
import { crearInsertar } from './insertar.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for(const [k, v] of Object.entries(attrs)){
    if(v == null || v === false) continue;
    if(k === 'on') for(const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if(k === 'style') Object.assign(e.style, v);
    else if(k === 'innerHTML') e.innerHTML = v;   // sólo con los íconos fijos de este archivo, nunca con texto del .pptx
    else if(k in e && k !== 'list' && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for(const c of hijos.flat()) if(c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
};
const OK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
const LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

/* ── estado ── */
let D = null, nombre = '', sel = new Set();
const pintadas = new Map();     // i → versión con la que se pintó
let version = 0;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const objetivo = () => sel.size ? [...sel].sort((a, b) => a - b) : 'todas';
const cuantasObjetivo = () => sel.size || D.laminas.length;
const textoObjetivo = () => sel.size ? `${plural(sel.size, 'lámina elegida', 'láminas elegidas')}` : `las ${D.laminas.length} láminas`;

/* ── avisos y ocupado ── */
function aviso(texto, tipo = '', { accion, ms = 4200, opId } = {}){
  // Todo aviso queda en el panel de notificaciones: el de abajo dura cuatro segundos.
  NOTI.registrar({ texto: String(texto), tipo: opId ? 'cambio' : tipo, opId, archivo: D ? nombre + '.pptx' : '' });
  const a = h('div', { class: `aviso ${tipo}` }, h('span', { class: 'crece' }, texto));
  if(accion) a.append(h('button', { class: 'chip', type: 'button', on: { click: () => { a.remove(); accion.fn(); } } }, accion.texto));
  $('#avisos').append(a);
  // Dos a la vista, nunca más: haciendo cambios seguidos se apilaban ocho y tapaban toda la pantalla.
  const vivos = $$('#avisos .aviso');
  vivos.slice(0, Math.max(0, vivos.length - 2)).forEach((x) => x.remove());
  setTimeout(() => a.remove(), ms);
}
const ocupado = (tx) => { $('#ocupado-tx').textContent = tx || ''; $('#ocupado').hidden = !tx; };

/* ══ ABRIR ════════════════════════════════════════════════════════════════ */
async function abrirArchivo(archivo){
  if(!archivo) return;
  if(/\.ppt$/i.test(archivo.name)){ aviso('Ese es el formato viejo (.ppt). En PowerPoint: Archivo → Guardar como → .pptx, y ábrelo otra vez.', 'mal', { ms: 9000 }); return; }
  ocupado('Abriendo…');
  try{
    const bytes = await archivo.arrayBuffer();
    const d = await N.abrir(bytes);
    if(!d.laminas.length) throw new Error('La presentación no tiene láminas.');
    D = d; nombre = archivo.name.replace(/\.pptx$/i, '') || 'presentacion';
    sel.clear();
    mostrarTrabajo();
    guardarLocal();
  }catch(e){
    aviso(/zip|central directory|signature/i.test(e.message) ? 'Ese archivo no es un .pptx (o viene dañado).' : e.message, 'mal', { ms: 8000 });
  }finally{ ocupado(''); }
}
$$('[data-abrir]').forEach((i) => i.addEventListener('change', () => { abrirArchivo(i.files[0]); i.value = ''; }));
const zona = $('#soltar');
zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('encima'); });
zona.addEventListener('dragleave', () => zona.classList.remove('encima'));
zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('encima'); abrirArchivo(e.dataTransfer.files[0]); });

/* ══ LA REJILLA ═══════════════════════════════════════════════════════════ */
const observador = new IntersectionObserver((entradas) => {
  for(const en of entradas) if(en.isIntersecting) pintarLamina(Number(en.target.dataset.i));
}, { rootMargin: '300px 0px' });
const redim = new ResizeObserver(() => {
  const m = $('#laminas .marco');
  if(m) $('#laminas').style.setProperty('--k', m.clientWidth / V.BASE);
});
redim.observe($('#laminas'));

function mostrarTrabajo(){
  BANCO.ocultar(); $$('.vistas [data-vista]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === 'presentacion')));
  $('#inicio').hidden = true; $('#trabajo').hidden = false; $('#dock').hidden = false;
  $('#b-guardar').hidden = false; $('#b-abrir').hidden = false; $('#b-deshacer').hidden = false;
  $('#archivo').textContent = nombre + '.pptx';
  $('#laminas').style.setProperty('--proporcion', `${D.ancho} / ${D.alto}`);
  construirRejilla();
}
/* Se rehace cuando cambia CUÁNTAS láminas hay (lámina nueva, o deshacerla). */
function construirRejilla(){
  pintadas.clear(); version++;
  const cont = $('#laminas');
  observador.disconnect();
  cont.replaceChildren(...D.laminas.map((_, i) => {
    const marco = h('div', { class: 'marco', 'data-i': i });
    const b = h('button', { class: 'lam', type: 'button', 'aria-pressed': 'false', 'aria-label': `Lámina ${i + 1}`, 'data-i': i,
      on: { click: () => alternar(i) } }, marco, h('span', { class: 'num' }, i + 1), h('span', { class: 'marca-sel', innerHTML: OK }));
    const ver = h('button', { class: 'ver', type: 'button', 'aria-label': `Ver lámina ${i + 1} en grande`, on: { click: () => abrirVisor(i) } }, h('span', { innerHTML: LUPA }));
    observador.observe(marco);
    return h('div', { class: 'tarjeta' }, b, ver);
  }));
  requestAnimationFrame(() => { const m = $('#laminas .marco'); if(m) cont.style.setProperty('--k', m.clientWidth / V.BASE); });
  pintarEleccion();
}
async function pintarLamina(i){
  if(!D || pintadas.get(i) === version) return;
  const v = version;
  pintadas.set(i, v);
  const marco = $(`#laminas .marco[data-i="${i}"]`);
  if(!marco) return;
  try{
    const m = await N.modelo(D, i);
    if(v !== version) return;
    marco.replaceChildren(V.pintar(m));
  }catch(e){
    marco.replaceChildren(h('div', { style: { padding: '8px', color: '#900', font: '12px system-ui' } }, 'No se pudo dibujar'));
    console.warn('lámina', i + 1, e);
  }
}
/* Después de un cambio: se repintan las que están a la vista; las demás, cuando aparezcan. */
function refrescar(){
  if($$('#laminas .lam').length !== D.laminas.length){
    sel = new Set([...sel].filter((i) => i < D.laminas.length));
    construirRejilla();
  }
  version++;
  const alto = innerHeight;
  for(const m of $$('#laminas .marco')){
    const r = m.getBoundingClientRect();
    if(r.bottom > -300 && r.top < alto + 300) pintarLamina(Number(m.dataset.i));
  }
  $('#b-deshacer').disabled = !D.deshacer.length;
  $('#b-deshacer').title = D.deshacer.length ? `Deshacer: ${D.deshacer.at(-1).nombre}` : 'Deshacer';
  if($('#visor').open) pintarVisor();
}
function alternar(i){
  sel.has(i) ? sel.delete(i) : sel.add(i);
  pintarEleccion();
}
function pintarEleccion(){
  $$('#laminas .lam').forEach((b) => b.setAttribute('aria-pressed', String(sel.has(Number(b.dataset.i)))));
  const n = D.laminas.length;
  $('#cuantas').textContent = plural(n, 'lámina', 'láminas');
  $('#eleccion-que').innerHTML = '';
  $('#eleccion-que').append(sel.size
    ? h('span', {}, 'Los cambios van a ', h('b', {}, plural(sel.size, 'lámina elegida', 'láminas elegidas')))
    : h('span', {}, 'Los cambios van a ', h('b', {}, `las ${n}`), '. Toca láminas para elegir sólo algunas.'));
  $('#b-ninguna').hidden = !sel.size;
  $('#b-todas').hidden = sel.size === n;
}
$('#b-todas').addEventListener('click', () => { D.laminas.forEach((_, i) => sel.add(i)); pintarEleccion(); });
$('#b-ninguna').addEventListener('click', () => { sel.clear(); pintarEleccion(); });

/* ══ APLICAR UN CAMBIO ════════════════════════════════════════════════════ */
async function aplicar(nombreOp, fn, mensaje){
  ocupado('Aplicando…');
  try{
    const antes = D.deshacer.length;
    const r = await N.operacion(D, nombreOp, fn);
    // Cada cambio lleva una marca para que el panel pueda «volver a antes de esto».
    let opId;
    if(D.deshacer.length > antes){ const op = D.deshacer.at(-1); op.id = op.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6); opId = op.id; }
    refrescar();
    guardarLocal();
    const tx = typeof mensaje === 'function' ? mensaje(r) : mensaje;
    if(tx) aviso(tx, 'bien', { accion: { texto: 'Deshacer', fn: deshacer }, opId });
    return r;
  }catch(e){
    aviso('No se pudo: ' + e.message, 'mal', { ms: 8000 });
    console.error(e);
  }finally{ ocupado(''); }
}
async function deshacer(){
  if(!D?.deshacer.length) return;
  const n = await N.deshacer(D);
  refrescar(); guardarLocal();
  aviso(`Deshecho: ${n}`);
}
$('#b-deshacer').addEventListener('click', deshacer);
/* Volver a antes de un cambio: se deshace de arriba para abajo hasta quitarlo. */
async function volverA(opId){
  const op = D?.deshacer.find((o) => o.id === opId);
  if(!op) return;
  let n = 0;
  while(D.deshacer.some((o) => o.id === opId)){ await N.deshacer(D); n++; }
  refrescar(); guardarLocal();
  aviso(`Volviste a antes de «${op.nombre}» (${plural(n, 'cambio deshecho', 'cambios deshechos')}).`);
}
addEventListener('keydown', (e) => { if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/input|textarea/i.test(document.activeElement?.tagName)){ e.preventDefault(); deshacer(); } });

/* ══ GUARDAR ══════════════════════════════════════════════════════════════ */
async function archivoFinal(){
  const blob = await N.guardar(D);
  return new File([blob], `${nombre} (Mazi).pptx`, { type: blob.type });
}
$('#b-guardar').addEventListener('click', async () => {
  ocupado('Armando el archivo…');
  let f;
  try{ f = await archivoFinal(); }catch(e){ ocupado(''); aviso('No se pudo guardar: ' + e.message, 'mal'); return; }
  ocupado('');
  const descargar = () => {
    const u = URL.createObjectURL(f);
    const a = h('a', { href: u, download: f.name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  };
  const puedeCompartir = navigator.canShare?.({ files: [f] });
  hoja('Guardar', [
    h('p', { class: 'a-quien' }, 'Sale como ', h('b', {}, f.name), ` · ${(f.size / 1048576).toFixed(1)} MB. Tu archivo original no se toca.`),
    h('div', { class: 'fila dos' },
      h('button', { class: 'btn primario', type: 'button', on: { click: () => { descargar(); cerrar('#hoja'); } } }, 'Descargar'),
      puedeCompartir ? h('button', { class: 'btn', type: 'button', on: { click: async () => { try{ await navigator.share({ files: [f], title: f.name }); cerrar('#hoja'); }catch{} } } }, 'Mandar o guardar en Archivos') : null),
    h('p', { class: 'nota' }, 'Se abre en PowerPoint, Keynote, Google Slides y Canva.'),
  ]);
});

/* Autoguardado en este teléfono: Safari mata las pestañas en segundo plano, y
   perder media hora de cambios por contestar un WhatsApp no se vale. */
const BD = () => new Promise((ok, mal) => { const r = indexedDB.open('presentaciones', 1); r.onupgradeneeded = () => r.result.createObjectStore('trabajo'); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
let tGuardar = null;
function guardarLocal(){
  clearTimeout(tGuardar);
  tGuardar = setTimeout(async () => {
    try{
      const blob = await N.guardar(D);
      const db = await BD();
      db.transaction('trabajo', 'readwrite').objectStore('trabajo').put({ nombre, blob, cuando: Date.now() }, 'actual');
    }catch(e){ console.warn('autoguardado', e); }
  }, 1500);
}
(async () => {
  try{
    const db = await BD();
    const t = await new Promise((ok) => { const r = db.transaction('trabajo').objectStore('trabajo').get('actual'); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
    if(!t?.blob) return;
    const hace = Math.round((Date.now() - t.cuando) / 60000);
    const b = $('#b-seguir');
    b.textContent = `Seguir con «${t.nombre}» · ${hace < 1 ? 'hace un momento' : hace < 60 ? `hace ${hace} min` : hace < 1440 ? `hace ${Math.round(hace / 60)} h` : `hace ${Math.round(hace / 1440)} días`}`;
    b.hidden = false;
    b.onclick = () => abrirArchivo(new File([t.blob], t.nombre + '.pptx'));
  }catch{}
})();

/* ══ HOJAS ════════════════════════════════════════════════════════════════ */
function hoja(titulo, contenido, id = '#hoja'){
  const d = $(id);
  $(id + '-titulo').textContent = titulo;
  $(id + '-cuerpo').replaceChildren(...[].concat(contenido));
  if(!d.open) d.showModal();
  $(id + '-cuerpo').scrollTop = 0;
  return d;
}
const cerrar = (id) => { const d = $(id); if(d.open) d.close(); };
$$('dialog').forEach((d) => {
  d.addEventListener('click', (e) => { if(e.target === d || e.target.closest('[data-cerrar]')) d.close(); });
  d.addEventListener('close', () => $$('.dock [data-panel]').forEach((b) => b.setAttribute('aria-expanded', 'false')));
});
const aQuien = () => h('p', { class: 'a-quien' }, 'Se aplica a ', h('b', {}, textoObjetivo()), '.');
const seccion = (titulo, ...hijos) => h('div', { class: 'seccion' }, h('h3', {}, titulo), ...hijos);
function segmento(opciones, valor, alCambiar){
  const s = h('div', { class: 'segmento', role: 'group' });
  const pinta = () => $$('button', s).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === valor)));
  for(const [v, tx] of opciones) s.append(h('button', { type: 'button', 'data-v': v, on: { click: () => { valor = v; pinta(); alCambiar(v); } } }, tx));
  pinta();
  return s;
}
const hexA = (c) => { const x = N.hex6(c); return x ? '#' + x : null; };
const COLORES = ['#FFFFFF', '#F5F2F2', '#E9E4E4', '#100A18', '#1E1428', '#000000', '#AC27FF', '#1E2761', '#002060', '#065A82', '#028090', '#2C5F2D', '#C00000', '#B85042', '#F96167', '#D69A2D'];
function selectorColor(inicial, alCambiar, extra = []){
  let valor = (hexA(inicial) || inicial);
  const lista = [...new Set([...extra.map(hexA).filter(Boolean), ...COLORES])];
  const input = h('input', { type: 'color', value: inicial.toLowerCase(), 'aria-label': 'Otro color', on: { input: () => { valor = input.value.toUpperCase(); pinta(); alCambiar(valor); } } });
  const cont = h('div', { class: 'muestras' });
  const pinta = () => $$('.muestra', cont).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === valor)));
  for(const c of lista) cont.append(h('button', { class: 'muestra', type: 'button', 'data-c': c, 'aria-label': `Color ${c}`, style: { background: c },
    on: { click: () => { valor = c; input.value = c.toLowerCase(); pinta(); alCambiar(c); } } }));
  pinta();
  return h('div', {}, cont, h('label', { class: 'campo' }, 'Otro color', input));
}
$$('.dock [data-panel]').forEach((b) => b.addEventListener('click', () => {
  if(!D) return;
  $$('.dock [data-panel]').forEach((x) => x.setAttribute('aria-expanded', String(x === b)));
  ({ fondo: panelFondo, texto: panelTexto, insertar: () => INS.panel(), acomodar: panelAcomodar, imagenes: panelImagenes, ia: panelIA })[b.dataset.panel]();
}));

/* ══ FONDO ════════════════════════════════════════════════════════════════ */
function panelFondo(){
  let tipo = 'color', color = '#1E1428', c1 = '#1E2761', c2 = '#065A82', angulo = 90, imagen = null;
  const contraste = h('input', { type: 'checkbox', checked: true });
  const plantilla = h('input', { type: 'checkbox' });
  const zonaTipo = h('div');
  const vistaImg = h('div');
  const pintaTipo = () => {
    zonaTipo.replaceChildren(
      tipo === 'color' ? selectorColor(color, (c) => { color = c; }) :
      tipo === 'degradado' ? h('div', {},
        h('div', { class: 'fila dos' },
          h('label', { class: 'campo' }, 'Arriba / izquierda', h('input', { type: 'color', value: c1.toLowerCase(), on: { input: (e) => { c1 = e.target.value; } } })),
          h('label', { class: 'campo' }, 'Abajo / derecha', h('input', { type: 'color', value: c2.toLowerCase(), on: { input: (e) => { c2 = e.target.value; } } }))),
        segmento([['90', 'Hacia abajo'], ['0', 'Hacia la derecha'], ['45', 'En diagonal']], String(angulo), (v) => { angulo = Number(v); })) :
      h('div', {},
        vistaImg,
        h('button', { class: 'btn ancho', type: 'button', on: { click: async () => {
          const r = await elegirImagen({ titulo: 'Imagen de fondo', ancho: D.ancho, alto: D.alto, sugerencia: 'fondo abstracto elegante para presentación, sin texto' });
          if(r){ imagen = r; const u = URL.createObjectURL(new Blob([r.bytes], { type: r.mime })); vistaImg.replaceChildren(h('img', { class: 'grande-img', src: u, alt: 'Fondo elegido' })); }
        } } }, 'Elegir imagen…'),
        h('p', { class: 'nota' }, 'Se recorta sola a la forma de la lámina.')));
  };
  pintaTipo();
  hoja('Fondo', [
    aQuien(),
    segmento([['color', 'Color'], ['degradado', 'Degradado'], ['imagen', 'Imagen']], tipo, (v) => { tipo = v; pintaTipo(); }),
    zonaTipo,
    h('label', { class: 'check' }, contraste, h('span', {}, 'Arreglar el texto que ya no se lea', h('br'), h('small', { class: 'nota' }, 'Si pones fondo oscuro, lo negro pasa a claro (y al revés).'))),
    h('label', { class: 'check' }, plantilla, h('span', {}, 'También en la plantilla', h('br'), h('small', { class: 'nota' }, 'Para que las láminas nuevas salgan con este fondo.'))),
    h('button', { class: 'btn primario ancho', type: 'button', on: { click: async () => {
      if(tipo === 'imagen' && !imagen){ aviso('Primero elige la imagen.', 'mal'); return; }
      const fondo = tipo === 'color' ? { color } : tipo === 'degradado' ? { colores: [c1, c2], angulo } : { imagen };
      const obj = objetivo();
      cerrar('#hoja');
      await aplicar('Fondo', async () => {
        const n = await N.ponerFondo(D, obj, fondo, { enPlantilla: plantilla.checked });
        const c = contraste.checked && tipo !== 'imagen' ? await N.arreglarContraste(D, obj) : 0;
        return { n, c };
      }, (r) => `Fondo nuevo en ${plural(r.n, 'lámina', 'láminas')}${r.c ? ` · ${plural(r.c, 'texto aclarado', 'textos ajustados')} para que se lea` : ''}.`);
    } } }, `Poner fondo en ${plural(cuantasObjetivo(), 'lámina', 'láminas')}`),
  ]);
}

/* ══ TEXTO ════════════════════════════════════════════════════════════════ */
const LETRAS = ['Arial', 'Calibri', 'Montserrat', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'Segoe UI', 'Verdana', 'Trebuchet MS', 'Georgia', 'Cambria', 'Times New Roman', 'Century Gothic', 'Bebas Neue'];
function panelTexto(){
  let en = 'todo', color = '#FFFFFF';
  const donde = segmento([['todo', 'Todo'], ['titulos', 'Títulos'], ['texto', 'Lo demás']], en, (v) => { en = v; });
  const letra = h('select', {}, LETRAS.map((f) => h('option', { value: f }, f)));
  const buscar = h('input', { type: 'text', placeholder: 'Buscar…', autocomplete: 'off' });
  const poner = h('input', { type: 'text', placeholder: 'Cambiar por…', autocomplete: 'off' });
  const obj = objetivo;
  hoja('Texto', [
    aQuien(),
    seccion('En qué textos', donde,
      h('p', { class: 'nota' }, 'Si la presentación no marca títulos, cuenta como título el texto más grande de cada lámina.')),
    seccionRecuadro(() => en),
    seccion('Letra', h('div', { class: 'fila dos' }, h('label', { class: 'campo' }, 'Tipo de letra', letra),
      h('button', { class: 'btn', type: 'button', style: { alignSelf: 'end', marginBottom: '10px' }, on: { click: () => {
        const f = letra.value, o = obj(), e = en;
        aplicar('Letra', () => N.ponerFuente(D, o, f, { en: e }), (n) => `Letra ${f} en ${plural(n, 'texto', 'textos')}.`);
      } } }, 'Cambiar letra')),
      h('p', { class: 'nota' }, 'Si en otra compu no tienen esa letra, PowerPoint pone una parecida. Arial y Calibri salen igual en todos lados.')),
    seccion('Color', selectorColor(color, (c) => { color = c; }),
      h('div', { class: 'fila dos' },
        h('button', { class: 'btn', type: 'button', on: { click: () => { const o = obj(), e = en, c = color; aplicar('Color de texto', () => N.ponerColorTexto(D, o, c, { en: e }), (n) => `Color nuevo en ${plural(n, 'texto', 'textos')}.`); } } }, 'Poner este color'),
        h('button', { class: 'btn', type: 'button', on: { click: () => { const o = obj(); aplicar('Contraste', () => N.arreglarContraste(D, o), (n) => n ? `${plural(n, 'texto ajustado', 'textos ajustados')} para que se lea.` : 'Todo se leía bien: no cambié nada.'); } } }, 'Arreglar contraste'))),
    seccion('Tamaño', h('div', { class: 'fila dos' },
      h('button', { class: 'btn', type: 'button', on: { click: () => { const o = obj(), e = en; aplicar('Letra más chica', () => N.escalarTexto(D, o, 0.9, { en: e }), (n) => `${plural(n, 'texto', 'textos')} 10 % más chicos.`); } } }, 'A− Más chica'),
      h('button', { class: 'btn', type: 'button', on: { click: () => { const o = obj(), e = en; aplicar('Letra más grande', () => N.escalarTexto(D, o, 1.1, { en: e }), (n) => `${plural(n, 'texto', 'textos')} 10 % más grandes.`); } } }, 'A+ Más grande'))),
    seccion('Buscar y cambiar', h('label', { class: 'campo' }, 'Buscar', buscar), h('label', { class: 'campo' }, 'Cambiar por', poner),
      h('button', { class: 'btn ancho', type: 'button', on: { click: () => {
        const b = buscar.value, p = poner.value, o = obj();
        if(!b.trim()){ aviso('Escribe qué buscar.', 'mal'); return; }
        aplicar(`Cambiar «${b}»`, () => N.reemplazarTexto(D, o, b, p), (n) => n ? `Cambié ${plural(n, 'vez', 'veces')} «${b}».` : `No encontré «${b}».`);
      } } }, 'Cambiar en todas')),
  ]);
}

/* ── Recuadro detrás del texto: «para que se vean de lujo» (Carlos) ── */
const RECUADROS = [
  ['auto', 'Automático', 'Claro si el texto es oscuro, oscuro si es claro. Nunca se pierde el texto.'],
  ['cristal', 'Cristal oscuro', null], ['claro', 'Cristal claro', null], ['solido', 'Sólido', null], ['pildora', 'Píldora', null], ['propio', 'Tu color', null],
];
function seccionRecuadro(dondeEs){
  let estilo = 'auto', color = '#AC27FF', alfa = 0.85;
  const extra = h('div');
  const contraste = h('input', { type: 'checkbox', checked: true });
  const opciones = h('div', { class: 'recuadros' }, RECUADROS.map(([id, nombre]) => h('button', { class: 'recuadro-op', type: 'button', 'data-recuadro': id, 'aria-pressed': String(id === estilo),
    on: { click: () => { estilo = id; $$('[data-recuadro]', opciones).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.recuadro === id))); pintaExtra(); } } },
    h('span', { class: `muestra-recuadro r-${id}` }, h('i', {}, 'Aa')), h('span', {}, nombre))));
  const pintaExtra = () => extra.replaceChildren(estilo === 'propio' ? h('div', {}, selectorColor(color, (c) => { color = c; }),
    h('label', { class: 'campo' }, 'Qué tan sólido', h('input', { type: 'range', min: '0.3', max: '1', step: '0.05', value: String(alfa), on: { input: (e) => { alfa = Number(e.target.value); } } }))) : '');
  pintaExtra();
  return seccion('Recuadro detrás del texto', opciones, extra,
    h('p', { class: 'nota' }, 'Abraza al texto con sombra suave y esquinas redondas. El texto no se mueve. «En qué textos» de arriba también cuenta.'),
    h('label', { class: 'check' }, contraste, h('span', {}, 'Arreglar el texto que no se lea sobre el recuadro')),
    h('div', { class: 'fila dos' },
      h('button', { class: 'btn primario', type: 'button', 'data-poner-recuadro': '', on: { click: () => {
        const o = objetivo(), en = dondeEs(), e = estilo, op = e === 'propio' ? { estilo: 'solido', color, alfa } : { estilo: e };
        aplicar('Recuadro', async () => {
          const n = await N.ponerRecuadro(D, o, { ...op, en });
          const c = contraste.checked && e !== 'auto' ? await N.arreglarContraste(D, o) : 0;
          return { n, c };
        }, (r) => r.n ? `Recuadro en ${plural(r.n, 'texto', 'textos')}${r.c ? ` · ${plural(r.c, 'texto ajustado', 'textos ajustados')} para que se lea` : ''}.` : 'No encontré textos sueltos a los que ponérselo (los que ya tienen fondo propio se respetan).');
      } } }, 'Poner recuadro'),
      h('button', { class: 'btn', type: 'button', on: { click: () => { const o = objetivo(); aplicar('Quitar recuadros', () => N.quitarRecuadro(D, o), (n) => n ? `${plural(n, 'recuadro quitado', 'recuadros quitados')}.` : 'No había recuadros puestos por aquí.'); } } }, 'Quitar recuadros')));
}

/* ══ ACOMODAR ═════════════════════════════════════════════════════════════
   Cada botón arregla un defecto que se puede medir y dice cuántas cosas tocó.
   Si no encontró nada, lo dice: «no había nada que arreglar» también es un
   resultado, y es mejor que un «listo» que no hizo nada. */
const ACOMODOS = [
  ['todo', '✦', 'Arreglar todo', 'Todo lo de abajo de un jalón, en el orden que no se pisa.', (o) => N.acomodarTodo(D, o),
    (r) => r.total ? `Acomodé ${plural(r.total, 'cosa', 'cosas')}: ${[[r.quepa, 'texto que no cabía'], [r.estiradas, 'foto estirada'], [r.margenes, 'fuera de margen'], [r.alineadas, 'alineada'], [r.titulos, 'título en su lugar'], [r.tamanos, 'tamaño igualado'], [r.aire, 'con más aire']].filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(', ')}.` : 'Todo estaba bien acomodado: no cambié nada.'],
  ['quepa', 'A', 'Que el texto quepa', 'Achica lo justo el texto que se sale de su cuadro. Si el cuadro puede crecer hacia abajo, crece el cuadro y la letra se queda.', (o) => N.textoQueQuepa(D, o), (n) => n ? `${plural(n, 'cuadro arreglado', 'cuadros arreglados')}: ya cabe el texto.` : 'Todo el texto ya cabía.'],
  ['estiradas', '⤢', 'Quitar fotos estiradas', 'Las fotos deformadas se recortan al centro para verse con su forma real, en el mismo hueco.', (o) => N.desestirarImagenes(D, o), (n) => n ? `${plural(n, 'foto', 'fotos')} sin estirar.` : 'Ninguna foto estaba estirada.'],
  ['margenes', '▣', 'Dentro de márgenes', 'El texto se despega del borde y nada se sale de la lámina. Los adornos y fondos se respetan.', (o) => N.meterEnMargenes(D, o), (n) => n ? `${plural(n, 'cosa metida', 'cosas metidas')} en los márgenes.` : 'Nada se salía.'],
  ['alinear', '⫷', 'Alinear lo casi alineado', 'Lo que está a punto de estar alineado queda alineado. Lo que está lejos se deja: es a propósito.', (o) => N.alinearCasi(D, o), (n) => n ? `${plural(n, 'cosa alineada', 'cosas alineadas')}.` : 'Ya estaba alineado.'],
  ['titulos', 'T', 'Títulos en el mismo lugar', 'Al pasar de lámina, el título no brinca: los que estaban cerca quedan en la misma posición.', (o) => N.titulosEnSuLugar(D, o), (n) => n ? `${plural(n, 'título acomodado', 'títulos acomodados')}.` : 'Los títulos ya estaban en su lugar (o están a propósito en otro).'],
  ['tamanos', '≡', 'Igualar tamaños de letra', 'Los títulos que miden casi lo mismo quedan iguales, y lo mismo con el texto. Una nota chica no se vuelve grande.', (o) => N.igualarTamanos(D, o), (n) => n ? `${plural(n, 'tamaño igualado', 'tamaños igualados')}.` : 'Los tamaños ya eran parejos.'],
  ['aire', '↕', 'Más aire entre renglones', 'El texto de varios renglones respira un poco más. Lo que ya tiene su interlineado se respeta.', (o) => N.aireEntreRenglones(D, o), (n) => n ? `${plural(n, 'cuadro', 'cuadros')} con más aire.` : 'Ya tenían su interlineado.'],
];
function panelAcomodar(){
  hoja('Acomodar', [
    aQuien(),
    h('div', { class: 'acciones' }, ACOMODOS.map(([id, ico, titulo, desc, fn, msj]) => h('button', { class: 'accion', type: 'button', 'data-acomodo': id,
      style: id === 'todo' ? { borderColor: 'var(--violeta)' } : null,
      on: { click: async () => { const o = objetivo(); cerrar('#hoja'); await aplicar(titulo, () => fn(o), msj); } } },
      h('i', {}, ico), h('b', {}, titulo), h('span', {}, desc)))),
    h('p', { class: 'nota', style: { marginTop: '12px' } }, 'Todo se deshace con la flecha de arriba. Mueve y ajusta lo que está directo en la lámina; lo de la plantilla se queda.'),
  ]);
}

/* ══ IMÁGENES ═════════════════════════════════════════════════════════════ */
const NO_EDITABLE = /x-emf|x-wmf|tiff|svg/;
async function panelImagenes(){
  const todas = await N.imagenes(D);
  const lista = sel.size ? todas.filter((x) => x.laminas.some((i) => sel.has(i))) : todas;
  const elegidas = new Set();
  const rejilla = h('div', { class: 'rejilla-img' });
  const barraLote = h('div', { class: 'fila', style: { marginBottom: '12px' } });
  const pintaLote = () => barraLote.replaceChildren(
    elegidas.size
      ? h('button', { class: 'btn primario ancho', type: 'button', on: { click: () => rehacerLote([...elegidas]) } }, `Rehacer ${plural(elegidas.size, 'imagen', 'imágenes')} con IA`)
      : h('p', { class: 'nota', style: { margin: 0 } }, 'Toca una imagen para cambiarla. Mantén el dedo (o marca el círculo) para elegir varias y rehacerlas con IA de un jalón.'));
  for(const im of lista){
    const u = await N.urlDe(D, im.ruta);
    const carta = h('button', { class: 'img-carta', type: 'button', 'aria-pressed': 'false', 'data-ruta': im.ruta },
      h('img', { src: u, alt: '', loading: 'lazy' }),
      h('span', {}, im.laminas.length ? `en ${plural(im.laminas.length, 'lámina', 'láminas')}` : 'sin usar', im.enPlantilla ? ' · plantilla' : ''),
      h('span', { class: 'marca-sel', innerHTML: OK, role: 'checkbox', 'aria-label': 'Elegir para rehacer con IA' }));
    let apretado = null, largo = false;
    const elegir = () => {
      if(NO_EDITABLE.test(im.mime)){ aviso('Esa es un dibujo de Office (EMF/WMF/SVG): la IA no la puede leer. Cámbiala subiendo otra.', 'mal'); return; }
      elegidas.has(im.ruta) ? elegidas.delete(im.ruta) : elegidas.add(im.ruta);
      carta.setAttribute('aria-pressed', String(elegidas.has(im.ruta))); pintaLote();
    };
    carta.addEventListener('pointerdown', () => { largo = false; apretado = setTimeout(() => { largo = true; elegir(); }, 450); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => carta.addEventListener(ev, () => clearTimeout(apretado)));
    carta.addEventListener('contextmenu', (e) => e.preventDefault());
    carta.addEventListener('click', (e) => {
      if(largo){ largo = false; return; }
      if(e.target.closest('.marca-sel') || elegidas.size) return elegir();
      panelUnaImagen(im);
    });
    rejilla.append(carta);
  }
  pintaLote();
  hoja('Imágenes', [
    h('p', { class: 'a-quien' }, sel.size ? `${plural(lista.length, 'imagen', 'imágenes')} en las láminas elegidas.` : `${plural(lista.length, 'imagen', 'imágenes')} en la presentación.`, ' Cambiar una la cambia en todas las láminas donde sale.'),
    barraLote,
    lista.length ? rejilla : h('p', {}, 'No hay imágenes aquí.'),
  ]);
}
async function medidas(ruta){
  try{ const i = await IA.cargar(await N.urlDe(D, ruta)); return { ancho: i.naturalWidth, alto: i.naturalHeight }; }catch{ return { ancho: 4, alto: 3 }; }
}
async function panelUnaImagen(im, { soloLamina = null } = {}){
  const u = await N.urlDe(D, im.ruta), med = await medidas(im.ruta);
  const donde = soloLamina != null ? `sólo en la lámina ${soloLamina + 1}` : `en ${plural(im.laminas.length, 'lámina', 'láminas')}`;
  hoja('Cambiar imagen', [
    h('img', { class: 'grande-img', src: u, alt: 'Imagen actual' }),
    h('p', { class: 'a-quien' }, 'Se cambia ', h('b', {}, donde), im.laminas.length > 1 && soloLamina == null ? ` (${im.laminas.slice(0, 12).map((i) => i + 1).join(', ')}${im.laminas.length > 12 ? '…' : ''})` : '', '. La nueva se recorta a la misma forma.'),
    h('button', { class: 'btn primario ancho', type: 'button', on: { click: async () => {
      const r = await elegirImagen({ titulo: 'Imagen nueva', ancho: med.ancho, alto: med.alto, original: NO_EDITABLE.test(im.mime) ? null : { ruta: im.ruta, mime: im.mime } });
      if(!r) return;
      cerrar('#hoja');
      if(soloLamina != null) await aplicar('Imagen', () => N.cambiarImagenEn(D, soloLamina, im.ruta, r), 'Imagen cambiada en esa lámina.');
      else await aplicar('Imagen', () => N.cambiarImagen(D, im.ruta, r), `Imagen cambiada ${donde}.`);
    } } }, 'Cambiar por otra…'),
    h('div', { style: { height: '8px' } }),
    h('button', { class: 'btn ancho', type: 'button', on: { click: async () => {
      const obj = soloLamina != null ? [soloLamina] : objetivo();
      cerrar('#hoja');
      await aplicar('Quitar imagen', () => N.quitarImagen(D, obj, im.ruta), (n) => n ? `Quitada de ${plural(n, 'lugar', 'lugares')}.` : 'Esa imagen es de la plantilla: cámbiala en vez de quitarla.');
    } } }, 'Quitarla de las láminas'),
  ]);
}

/* ¿De dónde sale la imagen nueva? Subida, buscada o hecha con IA. Regresa
   { bytes, mime } ya recortada a ancho×alto, o null si se canceló. */
function elegirImagen({ titulo, ancho, alto, original = null, sugerencia = '' }){
  return new Promise((resolver) => {
    let listo = false;
    const d = $('#hoja2');
    const terminar = (r) => { listo = true; resolver(r); cerrar('#hoja2'); };
    d.addEventListener('close', () => { if(!listo) resolver(null); }, { once: true });
    const recortar = async (b) => { ocupado('Acomodando la imagen…'); try{ return await IA.ajustar(b.bytes, b.mime, { ancho, alto }); }finally{ ocupado(''); } };
    const aspecto = IA.aspectoCercano(ancho, alto);
    const subir = h('input', { class: 'oculto', type: 'file', accept: 'image/*', on: { change: async () => {
      const f = subir.files[0]; if(!f) return;
      try{ terminar(await recortar({ bytes: new Uint8Array(await f.arrayBuffer()), mime: f.type || 'image/jpeg' })); }catch(e){ aviso(e.message, 'mal'); }
    } } });
    const zona = h('div');
    const vistaBuscar = () => {
      const q = h('input', { class: 'entrada', type: 'search', placeholder: 'Ej. estudiantes en laboratorio', enterkeyhint: 'search' });
      const res = h('div', { class: 'resultados' });
      const credito = h('p', { class: 'credito' }, 'Fotos con licencia libre de Openverse y Wikimedia. Pon el crédito del autor en tu última lámina.');
      const ir = async () => {
        res.replaceChildren(h('span', { class: 'pensando' }, h('i'), h('i'), h('i')));
        try{
          const fotos = await IA.buscarFotos(q.value);
          if(!fotos.length){ res.replaceChildren(h('p', {}, 'Nada. Prueba con otras palabras (en inglés salen más).')); return; }
          res.replaceChildren(...fotos.map((f) => h('button', { type: 'button', title: `${f.titulo} · ${f.autor} · ${f.licencia}`, on: { click: async () => {
            ocupado('Bajando la foto…');
            try{ const b = await IA.bajar(f); ocupado(''); const r = await recortar(b); aviso(`Foto de ${f.autor || 'autor desconocido'} (${f.licencia}, ${f.fuente}).`, '', { ms: 9000 }); terminar(r); }
            catch(e){ ocupado(''); aviso(e.message, 'mal'); }
          } } }, h('img', { src: f.miniatura, alt: f.titulo, loading: 'lazy' }))));
        }catch(e){ res.replaceChildren(h('p', {}, e.message)); }
      };
      q.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); ir(); } });
      zona.replaceChildren(h('div', { class: 'fila', style: { flexWrap: 'nowrap' } }, q, h('button', { class: 'btn', type: 'button', on: { click: ir } }, 'Buscar')), credito, res);
      q.focus();
    };
    const vistaIA = (rehacer) => {
      const p = h('textarea', { class: 'entrada', placeholder: rehacer ? 'Ej. hazla más actual y nítida, estilo foto profesional' : 'Describe la imagen: qué sale, estilo, colores…' },
        rehacer ? 'Rehaz esta imagen para que se vea actual, nítida y profesional. Mismo tema y misma idea; sin texto encima.' : sugerencia);
      const tam = h('select', { class: 'entrada' }, h('option', { value: '1K' }, 'Normal (más rápida)'), h('option', { value: '2K' }, 'Alta calidad'));
      zona.replaceChildren(
        h('label', { class: 'campo' }, rehacer ? 'Qué le cambio' : 'Qué imagen quieres', p),
        h('label', { class: 'campo' }, 'Calidad', tam),
        h('button', { class: 'btn primario ancho', type: 'button', on: { click: async () => {
          if(!p.value.trim()){ aviso('Escribe qué imagen quieres.', 'mal'); return; }
          ocupado(rehacer ? 'Paulina está rehaciendo la imagen… (hasta 1 min)' : 'Paulina está haciendo la imagen… (hasta 1 min)');
          try{
            const imagenes = [];
            if(rehacer){ const x = await IA.paraIA(await N.bytesDe(D, original.ruta), original.mime); if(x) imagenes.push(x); }
            const r = await IA.imagen({ prompt: p.value, imagenes, aspecto, tamano: tam.value });
            ocupado('');
            terminar(await recortar(r));
          }catch(e){ ocupado(''); aviso(e.message, 'mal', { ms: 9000 }); if(e.llave) panelIA(); }
        } } }, rehacer ? 'Rehacer con IA' : 'Crear con IA'),
        h('p', { class: 'nota' }, 'Hecha por Gemini. Forma: ', aspecto, '.'));
      p.focus();
    };
    hoja(titulo, [
      h('div', { class: 'fuentes' },
        h('button', { class: 'btn de-banco', type: 'button', on: { click: () => BANCO.elegir(zona, async (b, f) => {
          try{ const r = await recortar(b); aviso(`«${f.titulo || f.nombre}» del banco.`); terminar(r); }catch(e){ aviso(e.message, 'mal'); }
        }) } }, 'De mi banco', h('small', {}, 'tus imágenes registradas')),
        h('label', { class: 'btn' }, 'Subir', h('small', {}, 'de tu teléfono'), subir),
        h('button', { class: 'btn', type: 'button', on: { click: vistaBuscar } }, 'Buscar', h('small', {}, 'fotos libres')),
        h('button', { class: 'btn', type: 'button', on: { click: () => vistaIA(false) } }, 'Crear con IA', h('small', {}, 'desde cero')),
        original ? h('button', { class: 'btn', type: 'button', on: { click: () => vistaIA(true) } }, 'Rehacer con IA', h('small', {}, 'mejorar la actual')) : null),
      h('div', { style: { height: '16px' } }),
      zona,
    ], '#hoja2');
  });
}
async function rehacerLote(rutas){
  const p = h('textarea', { class: 'entrada' }, 'Rehaz esta imagen para que se vea actual, nítida y profesional. Mismo tema y misma idea; sin texto encima.');
  const lista = h('ul', { class: 'progreso' });
  const boton = h('button', { class: 'btn primario ancho', type: 'button', on: { click: async () => {
    boton.disabled = true;
    const filas = rutas.map((r) => { const li = h('li', {}, h('span', {}, '·'), h('span', {}, r.split('/').pop())); lista.append(li); return li; });
    let bien = 0;
    for(const [k, ruta] of rutas.entries()){
      const li = filas[k];
      li.firstChild.replaceWith(h('span', { class: 'pensando' }, h('i'), h('i'), h('i')));
      try{
        const med = await medidas(ruta);
        const x = await IA.paraIA(await N.bytesDe(D, ruta), N.mimeDe(ruta));
        if(!x) throw new Error('no se pudo leer');
        const r = await IA.imagen({ prompt: p.value, imagenes: [x], aspecto: IA.aspectoCercano(med.ancho, med.alto) });
        const aj = await IA.ajustar(r.bytes, r.mime, med);
        await N.operacion(D, 'Rehacer imagen con IA', () => N.cambiarImagen(D, ruta, aj));
        refrescar(); guardarLocal();
        li.firstChild.replaceWith(h('span', { style: { color: 'var(--bien)' } }, '✓')); bien++;
      }catch(e){
        li.firstChild.replaceWith(h('span', { style: { color: 'var(--mal)' } }, '✗'));
        li.append(h('span', { class: 'nota', style: { margin: 0 } }, ' — ' + e.message));
        if(e.llave) break;
      }
    }
    boton.disabled = false; boton.textContent = 'Listo';
    boton.onclick = () => cerrar('#hoja');
    aviso(`${plural(bien, 'imagen rehecha', 'imágenes rehechas')} de ${rutas.length}. Cada una se deshace por separado.`, bien ? 'bien' : 'mal', { ms: 7000 });
  } } }, `Rehacer ${plural(rutas.length, 'imagen', 'imágenes')}`);
  hoja('Rehacer con IA', [
    h('p', { class: 'a-quien' }, 'Paulina rehace una por una (casi un minuto cada una). Puedes ir viendo cómo quedan.'),
    h('label', { class: 'campo' }, 'Qué les cambio', p), boton, lista,
  ]);
}

/* ══ IA ═══════════════════════════════════════════════════════════════════ */
const SISTEMA = `Eres el asistente de una herramienta para editar presentaciones de PowerPoint de Grupo Mazi. Te paso el contenido de las láminas en JSON: "lamina" es el número, "forma" es el número de cuadro de texto dentro de esa lámina y "titulo" dice si es el título.

Contesta SOLO con un objeto JSON, sin nada antes ni después:
{"explicacion":"una o dos frases de lo que vas a hacer","cambios":[ ... ]}

Cada cambio es uno de estos:
{"op":"texto","lamina":3,"forma":1,"texto":"el texto COMPLETO nuevo del cuadro; separa renglones o viñetas con \\n"}
{"op":"reemplazar","buscar":"palabra","poner":"otra","laminas":"todas"}
{"op":"fondo","color":"#1E2761","laminas":"todas"}
{"op":"fondo","colores":["#1E2761","#065A82"],"angulo":90,"laminas":[1,2]}
{"op":"letra","familia":"Montserrat","en":"todo","laminas":"todas"}
{"op":"colorTexto","color":"#FFFFFF","en":"titulos","laminas":"todas"}
{"op":"tamano","factor":1.1,"en":"texto","laminas":"todas"}
{"op":"contraste","laminas":"todas"}
{"op":"recuadro","estilo":"auto","en":"titulos","laminas":"todas"}   (recuadro con sombra detrás del texto; estilo: auto, cristal, claro, solido o pildora)
{"op":"laminaNueva","copiaDe":4,"despues":6,"textos":["Título de la lámina","renglón 1\nrenglón 2"]}   (lámina nueva con el diseño de la lámina «copiaDe», puesta después de la lámina «despues»; «textos» va en orden: primero el título y luego los demás cuadros)

Reglas:
- "laminas" es "todas" o una lista de números de lámina. "en" es "todo", "titulos" o "texto".
- Para cambiar la redacción usa "texto" con el texto completo del cuadro y conserva el mismo número de renglones cuando se pueda: cada renglón suele ser una viñeta.
- Sólo propone cambios en las láminas que te paso.
- No inventes datos, nombres, fechas ni cifras que no estén en la presentación.
- Si cambias el fondo a oscuro o a claro, agrega también {"op":"contraste"} para las mismas láminas.
- Para sumar un apartado usa "laminaNueva": copia el diseño de una lámina que tenga la misma forma (título + viñetas se copia de una de título + viñetas) y no inventes cifras: si hace falta un dato, deja un renglón como «[dato por confirmar]».
- Si te piden algo que no se puede con estas órdenes (animaciones, borrar láminas, imágenes), dilo en "explicacion" y deja "cambios" vacío. Para imágenes di que usen la pestaña Imágenes; para acomodar tamaños y márgenes, la pestaña Acomodar.
- Si sólo te hacen una pregunta, contéstala en "explicacion" con "cambios" vacío.
- Español de México, con buena ortografía y acentos.`;
/* Modo opinión: Carlos quiere «preguntarle a la IA qué opina de la
   presentación, consejos para mejorar el diseño o qué apartados sumar». La
   IA no ve las láminas, así que además de los textos recibe lo que se MIDE
   del archivo (informeDiseno): tamaños, letras, colores, fondos, imágenes,
   texto que no cabe. Con eso opina de lo que hay, no de lo que imagina. */
const SISTEMA_OPINION = `Eres directora de arte y coach de presentaciones en Grupo Mazi. Te paso los textos de una presentación de PowerPoint y un informe de su diseño medido del archivo (tamaños de letra en pt, letras usadas, colores, fondos, imágenes y problemas por lámina).

Da tu opinión honesta y útil, como alguien que sabe y quiere que la presentación se vea profesional. Estructura tu respuesta así, en texto plano (sin #, sin **, sin tablas), con viñetas «•»:

LO QUE FUNCIONA
• dos o tres cosas concretas

LO QUE MEJORARÍA DEL DISEÑO
• cada punto con el número de lámina y qué hacer exactamente (tamaño, espacio, jerarquía, contraste, consistencia, cantidad de texto, imágenes)

APARTADOS QUE LE SUMARÍA
• cada apartado con por qué hace falta y qué llevaría (si falta un dato, dilo; no lo inventes)

SIGUIENTES TRES PASOS
• los tres cambios que más se notarían, en orden

Reglas: menos de 30 palabras en una lámina se lee bien; más de 60 es mucho. Un título de menos de 28 pt en 16:9 se ve chico; texto de menos de 14 pt no se lee proyectado. Más de dos letras distintas se ve desordenado. Si te hacen una pregunta concreta, contéstala primero. Español de México, directo, sin relleno.`;
let chat = [];            // [{ de:'tu'|'yo', texto, propuesta?, opinion? }]
let motor = 'gemini';
let modoIA = 'cambios';
const EJEMPLOS = ['Corrige ortografía y acentos', 'Hazla más formal', 'Acorta los textos largos', 'Fondo azul marino y letra blanca', 'Recuadro de lujo en los títulos'];
const PREGUNTAS = ['¿Qué opinas de mi presentación?', '¿Qué apartados le faltan?', '¿Cómo mejoro el diseño?', '¿Sirve para exponer 10 minutos?', '¿Qué lámina está más floja?'];

function panelIA(prellenado = '', enviarYa = false){
  const cuerpo = [];
  const escribir = h('textarea', { class: 'entrada', placeholder: '¿Qué le hago a la presentación?', rows: 3 }, prellenado);
  const chatEl = h('div', { class: 'chat' });
  const pintaChat = () => {
    chatEl.replaceChildren(...chat.map((m) => {
      if(m.de === 'tu') return h('div', { class: 'msj tu' }, m.texto);
      if(m.error) return h('div', { class: 'msj yo error' }, m.texto);
      if(m.opinion){
        const caja = h('div', { class: 'msj yo opinion' }, m.texto);
        if(!m.aplicando) caja.append(h('div', { style: { height: '10px' } }), h('button', { class: 'btn primario ancho', type: 'button', on: { click: () => { m.aplicando = true;
          enviar('Aplica los consejos que acabas de darme que se puedan hacer con las órdenes, incluidas las láminas nuevas para los apartados que propusiste.', 'cambios'); } } }, '✦ Aplícalo'),
          h('p', { class: 'nota' }, 'Te enseña los cambios antes de ponerlos, y tú eliges.'));
        return caja;
      }
      const caja = h('div', { class: 'msj yo' }, m.propuesta?.explicacion || m.texto);
      if(m.propuesta?.cambios?.length && !m.aplicado){
        const checks = m.propuesta.cambios.map((c) => ({ c, input: h('input', { type: 'checkbox', checked: true }) }));
        caja.append(h('ul', { class: 'cambios' }, checks.map(({ c, input }) => h('li', {}, h('label', {}, input, h('span', {}, ...describir(c)))))),
          h('div', { style: { height: '8px' } }),
          h('button', { class: 'btn primario ancho', type: 'button', on: { click: async () => {
            const elegidos = checks.filter((x) => x.input.checked).map((x) => x.c);
            if(!elegidos.length) return;
            const r = await aplicar('IA: ' + (m.pregunta || '').slice(0, 40), () => aplicarCambios(elegidos), (n) => `La IA hizo ${plural(n, 'cambio', 'cambios')}.`);
            if(r != null){ m.aplicado = true; pintaChat(); }
          } } }, `Aplicar ${plural(checks.length, 'cambio', 'cambios')}`));
      }else if(m.aplicado) caja.append(h('p', { class: 'nota' }, '✓ Aplicado. Si no te gustó, «Deshacer» lo quita completo.'));
      return caja;
    }));
    chatEl.lastElementChild?.scrollIntoView({ block: 'end' });
  };
  async function enviar(textoDirecto, modo = modoIA){
    const t = (typeof textoDirecto === 'string' ? textoDirecto : escribir.value).trim();
    if(!t) return;
    if(typeof textoDirecto !== 'string') escribir.value = '';
    chat.push({ de: 'tu', texto: t });
    pintaChat();
    chatEl.append(h('div', { class: 'msj yo' }, h('span', { class: 'pensando' }, h('i'), h('i'), h('i')), ` ${motor === 'gemini' ? 'Paulina' : 'Negro'} está ${modo === 'opinion' ? 'revisando tu presentación' : 'pensando'}…`));
    try{
      const sistema = modo === 'opinion'
        ? SISTEMA_OPINION + '\n\n' + contexto() + '\n\nINFORME DE DISEÑO (medido del archivo):\n' + JSON.stringify(await informe())
        : SISTEMA + '\n\n' + contexto();
      const res = await IA.texto({ motor, sistema, tope: 8000,
        mensajes: chat.filter((m) => !m.error).map((m) => ({ de: m.de, texto: m.de === 'yo' ? (m.crudo || m.texto) : m.texto })) });
      if(modo === 'opinion'){ chat.push({ de: 'yo', texto: res.replace(/\*\*/g, '').replace(/^#+\s*/gm, ''), opinion: true, pregunta: t }); pintaChat(); return; }
      const j = IA.sacarJson(res);
      const propuesta = j && Array.isArray(j.cambios) ? { explicacion: String(j.explicacion || ''), cambios: j.cambios.filter(valido) } : null;
      chat.push({ de: 'yo', texto: propuesta ? propuesta.explicacion : res, crudo: res, propuesta, pregunta: t });
    }catch(e){
      chat.push({ de: 'yo', texto: e.message, error: true });
      if(e.llave) pintaLlave(true);
    }
    pintaChat();
  }
  const zonaLlave = h('div');
  const pintaLlave = (forzar = false) => {
    if(IA.llave() && !forzar){ zonaLlave.replaceChildren(); return; }
    const inp = h('input', { class: 'entrada', type: 'text', placeholder: 'Pega aquí el link de La Sala o la llave', autocomplete: 'off' });
    zonaLlave.replaceChildren(h('div', { class: 'a-quien' },
      h('b', {}, 'Para usar la IA, conecta La Sala una vez. '), 'Pega el link con el que entras a la sala (o sólo la llave). Se guarda en este teléfono; la llave de Gemini y Groq nunca sale del servidor.',
      h('div', { style: { height: '8px' } }), inp, h('div', { style: { height: '8px' } }),
      h('button', { class: 'btn ancho', type: 'button', on: { click: () => { if(IA.ponerLlave(inp.value)){ aviso('Listo, La Sala quedó conectada.', 'bien'); pintaLlave(); } else aviso('No encontré la llave en eso.', 'mal'); } } }, 'Conectar')));
  };
  pintaLlave();
  const ejemplos = h('div', { class: 'ejemplos' });
  const explica = h('p', { class: 'a-quien' });
  const botonPedir = h('button', { class: 'btn primario', type: 'button', on: { click: () => enviar() } });
  const pintaModo = () => {
    const op = modoIA === 'opinion';
    explica.replaceChildren(...(op ? ['La IA revisa ', h('b', {}, textoObjetivo()), ' y te dice qué funciona, qué mejorar del diseño y qué apartados sumar. Luego, si quieres, lo aplica.']
      : ['La IA ve el texto de ', h('b', {}, textoObjetivo()), ' y te propone cambios. Tú decides cuáles se ponen.']));
    ejemplos.replaceChildren(...(op ? PREGUNTAS : EJEMPLOS).map((e) => h('button', { class: 'chip', type: 'button', on: { click: () => { if(op){ enviar(e, 'opinion'); } else { escribir.value = e; escribir.focus(); } } } }, e)));
    escribir.placeholder = op ? 'Pregúntale lo que quieras de tu presentación' : '¿Qué le hago a la presentación?';
    botonPedir.textContent = op ? 'Preguntar' : 'Pedir';
  };
  pintaModo();
  cuerpo.push(
    segmento([['cambios', 'Pedir cambios'], ['opinion', 'Opinión y consejos']], modoIA, (v) => { modoIA = v; pintaModo(); }),
    explica,
    zonaLlave,
    segmento([['gemini', 'Paulina · Gemini'], ['groq', 'Negro · Groq']], motor, (v) => { motor = v; }),
    chatEl,
    ejemplos,
    escribir,
    h('div', { style: { height: '8px' } }),
    h('div', { class: 'fila dos' },
      botonPedir,
      h('button', { class: 'btn', type: 'button', on: { click: () => { chat = []; pintaChat(); } } }, 'Empezar de nuevo')),
  );
  hoja('IA', cuerpo);
  escribir.addEventListener('keydown', (e) => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); enviar(); } });
  pintaChat();
  if(enviarYa) enviar();
}
async function informe(){
  const inf = await N.informeDiseno(D);
  const idx = new Set(N.cuales(D, objetivo()));
  return { ...inf, porLamina: inf.porLamina.filter((x) => idx.has(x.lamina - 1)) };
}
/* Lo que ve la IA: los textos de las láminas a las que se aplica. */
function contexto(){
  const idx = N.cuales(D, objetivo());
  const todas = N.resumen(D);
  let datos = idx.map((i) => todas[i]);
  let json = JSON.stringify(datos);
  let recorte = '';
  if(json.length > 60000){
    while(json.length > 60000 && datos.length > 1){ datos = datos.slice(0, Math.floor(datos.length * 0.8)); json = JSON.stringify(datos); }
    recorte = ` (sólo te paso las primeras ${datos.length}: la presentación es muy larga; que elijan menos láminas si quieren las demás)`;
  }
  return `La presentación tiene ${D.laminas.length} láminas. Te paso ${datos.length}${recorte}:\n${json}`;
}
const esHex = (c) => !!N.hex6(c);
const lams = (x) => x === 'todas' || x == null ? 'todas' : (Array.isArray(x) ? x : [x]).map((n) => Number(n) - 1).filter((i) => i >= 0 && i < D.laminas.length);
const EN = new Set(['todo', 'titulos', 'texto']);
function valido(c){
  if(!c || typeof c !== 'object') return false;
  switch(c.op){
    case 'texto': { const i = Number(c.lamina) - 1; return i >= 0 && i < D.laminas.length && typeof c.texto === 'string' && N.textos(D, i).some((t) => t.id === Number(c.forma)); }
    case 'reemplazar': return typeof c.buscar === 'string' && c.buscar.length > 0 && typeof c.poner === 'string';
    case 'fondo': return esHex(c.color) || (Array.isArray(c.colores) && c.colores.length >= 2 && c.colores.every(esHex));
    case 'letra': return typeof c.familia === 'string' && c.familia.trim().length > 1;
    case 'colorTexto': return esHex(c.color);
    case 'tamano': return Number(c.factor) > 0.3 && Number(c.factor) < 3;
    case 'contraste': return true;
    case 'recuadro': return !c.estilo || ['auto', 'cristal', 'claro', 'solido', 'pildora'].includes(c.estilo);
    case 'laminaNueva': { const k = Number(c.copiaDe) - 1, d = Number(c.despues ?? c.copiaDe); return k >= 0 && k < D.laminas.length && d >= 0 && d <= D.laminas.length && Array.isArray(c.textos) && c.textos.length > 0 && c.textos.length <= 12 && c.textos.every((t) => typeof t === 'string'); }
    default: return false;
  }
}
const donde = (c) => c.laminas === 'todas' || c.laminas == null ? 'todas las láminas' : `lámina${[].concat(c.laminas).length > 1 ? 's' : ''} ${[].concat(c.laminas).join(', ')}`;
const muestra = (hex) => h('span', { style: { display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: '#' + N.hex6(hex), verticalAlign: '-2px', border: '1px solid #fff5' } });
function describir(c){
  const enTx = { todo: 'todo el texto', titulos: 'los títulos', texto: 'el texto' }[c.en] || 'todo el texto';
  switch(c.op){
    case 'texto': {
      const antes = N.textos(D, Number(c.lamina) - 1).find((t) => t.id === Number(c.forma))?.texto || '';
      return [h('b', {}, `Lámina ${c.lamina}: `), h('del', {}, antes.slice(0, 140)), ' → ', c.texto.slice(0, 280)];
    }
    case 'reemplazar': return [`Cambiar «${c.buscar}» por «${c.poner}» en ${donde(c)}`];
    case 'fondo': return c.colores ? ['Fondo degradado ', ...c.colores.map(muestra), ` en ${donde(c)}`] : ['Fondo ', muestra(c.color), ` en ${donde(c)}`];
    case 'letra': return [`Letra ${c.familia} en ${enTx} de ${donde(c)}`];
    case 'colorTexto': return ['Color ', muestra(c.color), ` en ${enTx} de ${donde(c)}`];
    case 'tamano': return [`${c.factor > 1 ? 'Agrandar' : 'Achicar'} ${enTx} ${Math.round(Math.abs(c.factor - 1) * 100)} % en ${donde(c)}`];
    case 'contraste': return [`Arreglar contraste en ${donde(c)}`];
    case 'recuadro': return [`Recuadro ${{ auto: 'automático', cristal: 'de cristal oscuro', claro: 'de cristal claro', solido: 'sólido', pildora: 'de píldora' }[c.estilo || 'auto']} detrás de ${enTx} en ${donde(c)}`];
    case 'laminaNueva': return [h('b', {}, `Lámina nueva después de la ${Number(c.despues ?? c.copiaDe)}: `), `«${String(c.textos[0]).slice(0, 80)}»`, c.textos.length > 1 ? ` — ${c.textos.slice(1).join(' / ').replace(/\n/g, ' · ').slice(0, 200)}` : '', h('span', { class: 'nota' }, ` (con el diseño de la ${c.copiaDe})`)];
  }
  return [JSON.stringify(c)];
}
async function aplicarCambios(cambios){
  let n = 0;
  /* Las láminas nuevas van AL FINAL y de atrás para adelante: meter una
     recorre los números de las que siguen, y los demás cambios hablan de los
     números de antes. */
  const nuevas = cambios.filter((c) => c.op === 'laminaNueva').sort((a, b) => Number(b.despues ?? b.copiaDe) - Number(a.despues ?? a.copiaDe));
  for(const c of [...cambios.filter((c) => c.op !== 'laminaNueva'), ...nuevas]){
    const L = lams(c.laminas), en = EN.has(c.en) ? c.en : 'todo';
    switch(c.op){
      case 'texto': n += await N.ponerTexto(D, Number(c.lamina) - 1, Number(c.forma), c.texto); break;
      case 'reemplazar': n += (await N.reemplazarTexto(D, L, c.buscar, c.poner)) ? 1 : 0; break;
      case 'fondo': await N.ponerFondo(D, L, c.colores ? { colores: c.colores, angulo: Number(c.angulo) || 90 } : { color: c.color }); n++; break;
      case 'letra': await N.ponerFuente(D, L, c.familia, { en }); n++; break;
      case 'colorTexto': await N.ponerColorTexto(D, L, c.color, { en }); n++; break;
      case 'tamano': await N.escalarTexto(D, L, Number(c.factor), { en }); n++; break;
      case 'contraste': await N.arreglarContraste(D, L); n++; break;
      case 'recuadro': n += (await N.ponerRecuadro(D, L, { estilo: c.estilo || 'auto', en })) ? 1 : 0; break;
      case 'laminaNueva': {
        const copia = Number(c.copiaDe) - 1, desp = Number(c.despues ?? c.copiaDe) - 1;
        await N.laminaNueva(D, { copiaDe: copia >= 0 ? copia : 0, despues: desp, textos: c.textos.map(String) });
        n++; break;
      }
    }
  }
  return n;
}

/* ══ VISOR (una lámina en grande) ═════════════════════════════════════════ */
let actual = 0;
function abrirVisor(i){ actual = i; pintarVisor(); if(!$('#visor').open) $('#visor').showModal(); }
async function pintarVisor(){
  const i = actual;
  $('#visor-titulo').textContent = `Lámina ${i + 1} de ${D.laminas.length}`;
  $('#v-ant').disabled = i === 0; $('#v-sig').disabled = i === D.laminas.length - 1;
  const marco = h('div', { class: 'marco', style: { '--proporcion': `${D.ancho} / ${D.alto}` } });
  marco.style.setProperty('--proporcion', `${D.ancho} / ${D.alto}`);
  const m = await N.modelo(D, i);
  marco.append(V.pintar(m));
  modeloVisor = m;
  const textos = N.textos(D, i);
  const areas = textos.map((t) => ({ t, a: h('textarea', { class: 'entrada', rows: Math.min(8, t.texto.split('\n').length + 1) }, t.texto) }));
  const elegida = sel.has(i);
  $('#visor-cuerpo').replaceChildren(
    marco,
    h('div', { class: 'nav-visor' },
      h('button', { class: 'btn', type: 'button', 'aria-pressed': String(elegida), on: { click: () => { alternar(i); pintarVisor(); } } }, elegida ? '✓ Elegida' : 'Elegir esta'),
      h('button', { class: 'btn', type: 'button', on: { click: async () => {
        const r = await aplicar('Lámina nueva', () => N.duplicarLamina(D, i, { despues: i }), (j) => `Lámina ${j + 1} nueva, igual a la ${i + 1}. Cámbiale los textos aquí abajo.`);
        if(r != null){ actual = r; pintarVisor(); }
      } } }, '＋ Lámina igual'),
      h('button', { class: 'btn', type: 'button', on: { click: () => { sel = new Set([i]); pintarEleccion(); $('#visor').close(); panelIA(`Mejora la redacción de la lámina ${i + 1}: más clara y directa, sin cambiar el sentido ni inventar datos.`, true); } } }, '✦ Mejorar con IA'),
      h('button', { class: 'btn', type: 'button', on: { click: () => { $('#visor').close(); INS.presentar(i); } } }, '▶ Presentar')),
    h('div', { id: 'barra-elemento', class: 'barra-elemento', hidden: true }),
    h('p', { class: 'nota' }, 'Toca cualquier cosa de la lámina para moverla, cambiarle el tamaño o el color.'),
    textos.length ? h('div', { class: 'seccion', style: { marginTop: '16px' } }, h('h3', {}, 'Textos de la lámina'),
      h('div', { class: 'textos-lamina' }, areas.map(({ t, a }) => h('label', {}, t.titulo ? 'Título' : `Cuadro ${t.id + 1}`, a))),
      h('div', { style: { height: '10px' } }),
      h('button', { class: 'btn primario ancho', type: 'button', on: { click: async () => {
        const cambiados = areas.filter(({ t, a }) => a.value !== t.texto);
        if(!cambiados.length){ aviso('No cambiaste nada.'); return; }
        await aplicar(`Textos de la lámina ${i + 1}`, async () => { for(const { t, a } of cambiados) await N.ponerTexto(D, i, t.id, a.value); return cambiados.length; }, (n) => `${plural(n, 'texto guardado', 'textos guardados')}.`);
      } } }, 'Guardar textos')) : null,
  );
  requestAnimationFrame(() => marco.style.setProperty('--k', marco.clientWidth / V.BASE));
  INS.montarEditor(marco, i, () => pintarVisor());
}
let modeloVisor = null;
const guardarElemento = (i, cid) => INS.guardarDeLamina(i, cid);
/* La barra del elemento elegido, debajo de la lámina grande. */
function pintarBarraElemento(cid){
  const b = $('#barra-elemento');
  if(!b) return;
  if(cid == null){ b.hidden = true; b.replaceChildren(); return; }
  const c = N.cajaDe(D, actual, cid);
  if(!c){ b.hidden = true; return; }
  b.hidden = false;
  const boton = (acc, tx, extra = {}) => h('button', { class: 'chip', type: 'button', 'data-accion': acc, on: { click: () => accionElemento(acc) }, ...extra }, tx);
  const tipo = c.tabla ? 'Tabla' : c.grafica ? 'Gráfica' : c.icono ? 'Icono' : c.grupo ? 'Diseño' : c.imagen ? 'Imagen' : c.tipo === 'cxnSp' ? 'Línea' : c.texto && !c.relleno ? 'Texto' : 'Forma';
  const marco = c.tabla || c.grafica;
  b.replaceChildren(...[h('b', {}, tipo),
    c.tabla ? boton('tabla', '▦ Editar tabla', { class: 'chip primario' }) : null,
    c.grafica ? boton('grafica', '📊 Editar datos', { class: 'chip primario' }) : null,
    (!c.imagen || c.icono) && !marco ? boton('color', '● Color') : null,
    (c.texto || c.grupo) && !marco ? boton('colorTexto', 'A Color de letra') : null,
    boton('enlace', c.enlace ? '🔗 Cambiar enlace' : '🔗 Enlace'),
    c.imagen && !c.icono ? boton('imagen', '⇄ Cambiar imagen') : null,
    boton('duplicar', '⧉ Duplicar'), boton('frente', '↑ Al frente'), boton('atras', '↓ Atrás'),
    boton('guardar', '★ A mis elementos'),
    boton('borrar', '🗑 Borrar', { class: 'chip peligro' })].filter(Boolean));
}
async function accionElemento(acc){
  const sel0 = INS.elegido;
  if(!sel0) return;
  const { lamina: i, cid } = sel0;
  const c = N.cajaDe(D, i, cid);
  const repinta = () => pintarVisor();
  if(acc === 'borrar'){ INS.fijarSeleccion(i, null); await aplicar('Borrar elemento', () => N.borrarForma(D, i, cid), 'Elemento borrado.'); return repinta(); }
  if(acc === 'duplicar'){ const n = await aplicar('Duplicar', () => N.duplicarForma(D, i, cid), 'Duplicado.'); if(n) INS.fijarSeleccion(i, n); return repinta(); }
  if(acc === 'frente' || acc === 'atras'){ await aplicar(acc === 'frente' ? 'Al frente' : 'Atrás', () => N.ordenForma(D, i, cid, acc), acc === 'frente' ? 'Hasta el frente.' : 'Hasta atrás.'); return repinta(); }
  if(acc === 'imagen'){
    const f = modeloVisor?.formas.find((x) => x.cid === cid && x.rutaImagen);
    const im = f && (await N.imagenes(D)).find((x) => x.ruta === f.rutaImagen);
    if(im) panelUnaImagen(im, { soloLamina: im.laminas.length > 1 ? i : null });
    return;
  }
  if(acc === 'guardar') return guardarElemento(i, cid);
  if(acc === 'tabla') return INS.editarTabla(i, cid, repinta);
  if(acc === 'grafica') return INS.editarGrafica(i, cid, repinta);
  if(acc === 'enlace') return INS.editarEnlace(i, cid, repinta);
  if(acc === 'color' || acc === 'colorTexto'){
    const pal = N.paletaTema(D);
    const deTema = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'dk2', 'lt2'].map((k) => pal[k] && '#' + pal[k]).filter(Boolean);
    let elegido = deTema[0] || '#AC27FF';
    hoja(acc === 'color' ? 'Color' : 'Color de letra', [selectorColor(elegido, (v) => { elegido = v; }, deTema),
      h('button', { class: 'btn primario ancho', type: 'button', on: { click: async () => {
        cerrar('#hoja2');
        if(acc === 'colorTexto') await aplicar('Color de letra', () => N.colorTextoForma(D, i, cid, elegido), 'Color de letra cambiado.');
        else if(c.icono){
          ocupado('Recoloreando el icono…');
          let arch; try{ arch = await IC.archivos(c.icono, { color: elegido }); }finally{ ocupado(''); }
          await aplicar('Color del icono', () => N.cambiarMediosDe(D, i, cid, arch), 'Icono recoloreado.');
        }else await aplicar('Color', () => N.colorForma(D, i, cid, elegido), (n) => n ? 'Color cambiado.' : 'Ese elemento no tiene color que cambiar.');
        repinta();
      } } }, 'Poner este color')], '#hoja2');
  }
}
$('#v-ant').addEventListener('click', () => { if(actual > 0){ actual--; pintarVisor(); } });
$('#v-sig').addEventListener('click', () => { if(actual < D.laminas.length - 1){ actual++; pintarVisor(); } });
$('#visor').addEventListener('keydown', (e) => {
  if(/textarea|input/i.test(e.target.tagName)) return;
  if(e.key === 'ArrowLeft') $('#v-ant').click();
  if(e.key === 'ArrowRight') $('#v-sig').click();
});
addEventListener('resize', () => { const m = $('#visor .marco'); if(m) m.style.setProperty('--k', m.clientWidth / V.BASE); });

/* ══ NOTIFICACIONES ═══════════════════════════════════════════════════════ */
const TIPO_ICONO = { cambio: '✓', bien: '✓', mal: '!', '': '•' };
function pintarCampana(){
  const n = NOTI.novedadesSinVer() + NOTI.todas().filter((e) => e.tipo === 'mal' && !e.leida).length;
  const b = $('#b-noti .contador');
  b.textContent = n > 9 ? '9+' : String(n);
  b.hidden = !n;
  $('#b-noti').setAttribute('aria-label', n ? `Notificaciones, ${n} sin ver` : 'Notificaciones');
}
NOTI.alCambiar(pintarCampana);
pintarCampana();
let pestanaNoti = 'cambios', filtroNoti = 'todo';
function panelNotificaciones(){
  const cuerpo = h('div');
  const pinta = () => {
    const todas = NOTI.todas();
    if(pestanaNoti === 'novedades'){
      const sinVer = NOTI.novedadesSinVer();
      cuerpo.replaceChildren(h('ul', { class: 'notis' }, NOTI.NOVEDADES.map((nv, k) => h('li', { class: `noti novedad${k < sinVer ? ' nueva' : ''}` },
        h('i', { 'aria-hidden': 'true' }, '✦'),
        h('div', { class: 'crece' }, h('b', {}, nv.titulo), h('p', {}, nv.texto),
          h('span', { class: 'nota' }, new Date(nv.fecha + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }), k < sinVer ? ' · nuevo' : ''))))));
      NOTI.verNovedades();
      return;
    }
    const lista = todas.filter((e) => filtroNoti === 'todo' || (filtroNoti === 'cambios' ? e.tipo === 'cambio' : e.tipo === 'mal'));
    const grupos = [];
    for(const e of lista){ const d = NOTI.dia(e.cuando); if(grupos.at(-1)?.dia !== d) grupos.push({ dia: d, items: [] }); grupos.at(-1).items.push(e); }
    cuerpo.replaceChildren(
      h('div', { class: 'ejemplos' }, [['todo', `Todo · ${todas.length}`], ['cambios', 'Cambios'], ['errores', 'Errores']].map(([v, t]) =>
        h('button', { class: 'chip', type: 'button', 'aria-pressed': String(filtroNoti === v), on: { click: () => { filtroNoti = v; pinta(); } } }, t))),
      lista.length ? h('div', {}, grupos.map((g) => h('section', { class: 'grupo-noti' }, h('h3', {}, g.dia),
        h('ul', { class: 'notis' }, g.items.map((e) => {
          const vivo = e.opId && D?.deshacer.some((o) => o.id === e.opId);
          return h('li', { class: `noti t-${e.tipo || 'info'}${e.leida ? '' : ' nueva'}` },
            h('i', { 'aria-hidden': 'true' }, TIPO_ICONO[e.tipo] ?? '•'),
            h('div', { class: 'crece' }, h('p', {}, e.texto), h('span', { class: 'nota' }, NOTI.cuando(e.cuando), e.archivo ? ` · ${e.archivo}` : ''),
              vivo ? h('button', { class: 'chip', type: 'button', style: { marginTop: '6px' }, on: { click: async () => { await volverA(e.opId); pinta(); } } }, '↶ Volver a antes de esto') : null));
        })))))
        : h('p', { class: 'nota', style: { padding: '12px 0' } }, filtroNoti === 'errores' ? 'Nada ha fallado. 👌' : 'Todavía no hay nada. Lo que cambies va a aparecer aquí.'),
      todas.length ? h('button', { class: 'btn ancho fantasma', type: 'button', style: { marginTop: '12px' }, on: { click: (ev) => {
        const b = ev.currentTarget;
        if(b.dataset.seguro !== '1'){ b.dataset.seguro = '1'; b.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { b.dataset.seguro = ''; b.textContent = 'Borrar el historial'; }, 4000); return; }
        NOTI.borrarTodo(); pinta();
      } } }, 'Borrar el historial') : null);
    NOTI.marcarLeidas();
  };
  hoja('Notificaciones', [segmento([['cambios', 'Tus cambios'], ['novedades', `Novedades${NOTI.novedadesSinVer() ? ` · ${NOTI.novedadesSinVer()}` : ''}`]], pestanaNoti, (v) => { pestanaNoti = v; pinta(); }), cuerpo]);
  pinta();
}
$('#b-noti').addEventListener('click', panelNotificaciones);

/* ══ LAS DOS VISTAS: la presentación y el banco ════════════════════════════ */
const BANCO = crearBanco({ h, $, $$, hoja, cerrar, aviso, ocupado, segmento, plural, OK });
function verVista(v){
  $$('.vistas [data-vista]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === v)));
  const enBanco = v === 'banco';
  if(enBanco){ $('#inicio').hidden = true; $('#trabajo').hidden = true; $('#dock').hidden = true; BANCO.mostrar(); }
  else{ BANCO.ocultar(); if(D){ $('#trabajo').hidden = false; $('#dock').hidden = false; } else $('#inicio').hidden = false; }
  $('#b-guardar').hidden = enBanco || !D; $('#b-deshacer').hidden = enBanco || !D;
  try{ history.replaceState(null, '', enBanco ? '#banco' : location.pathname + location.search); }catch{}
  scrollTo(0, 0);
}
$$('.vistas [data-vista]').forEach((b) => b.addEventListener('click', () => verVista(b.dataset.vista)));
if(location.hash === '#banco') verVista('banco');

/* Color en un solo renglón: los de la presentación primero, y «otro». Para
   Insertar, donde el selector grande empujaba las formas hasta abajo. */
function colorCompacto(inicial, alCambiar, extra = []){
  let valor = hexA(inicial) || inicial;
  const lista = [...new Set([...extra.map(hexA).filter(Boolean), '#FFFFFF', '#141018', '#AC27FF', '#1E2761', '#C00000', '#2C5F2D', '#D69A2D'])].slice(0, 12);
  const fila = h('div', { class: 'colores-fila' });
  const pinta = () => $$('.muestra', fila).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === valor)));
  const otro = h('input', { type: 'color', value: valor.toLowerCase(), 'aria-label': 'Otro color', title: 'Otro color', on: { input: () => { valor = otro.value.toUpperCase(); pinta(); alCambiar(valor); } } });
  for(const c of lista) fila.append(h('button', { class: 'muestra', type: 'button', 'data-c': c, 'aria-label': `Color ${c}`, style: { background: c }, on: { click: () => { valor = c; otro.value = c.toLowerCase(); pinta(); alCambiar(c); } } }));
  fila.append(h('label', { class: 'muestra otro' }, '+', otro));
  pinta();
  return fila;
}

/* ══ INSERTAR (insertar.js) ══ */
const INS = crearInsertar({ h, $, $$, hoja, cerrar, aviso, ocupado, segmento, plural, selectorColor: colorCompacto, aplicar, N, V,
  D: () => D, abrirVisor, objetivo, sel: () => sel, actual: () => actual, pintarBarraElemento, accionElemento });
$('#b-presentar').addEventListener('click', () => INS.presentar(sel.size ? Math.min(...sel) : 0));
$('#presentar-cerrar').addEventListener('click', () => $('#presentar').close());

/* Para las pruebas: el estado a la vista, sin exponer nada del teléfono. */
window.__pres = { get D(){ return D; }, get sel(){ return sel; }, N, BANCO, NOTI, INS };
