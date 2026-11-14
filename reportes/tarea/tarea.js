/* tarea.js — MODO «TAREA» DE REPORTES (Carlos, 14 nov)
 * ===========================================================================
 * «Mejora la app de reportes para que pueda hacer eso mismo que tú hiciste ahorita: acomodar formato APA, mejorar
 * imágenes de documentos, etc.» Lo de la tarea de física de Lorena, sin la computadora:
 *   1. fotos de las hojas → cada una se recorta, se endereza y queda como escaneo (escaner.js), en el teléfono;
 *   2. se acomodan (mover, girar, esquinas a mano si la detección falló, escaneo / color / original, quitar);
 *   3. portada institucional (logo de la escuela arriba al centro, datos abajo; regla de Carlos del 14 nov) y
 *      formato APA 7: carta, márgenes de 2.54 cm, Times 12, número de página arriba a la derecha;
 *   4. un PDF que se llama «Tema_Apellidos» (Tiro_Parabolico_Gutierrez_Avila).
 * Las fotos viven sólo en la memoria de la página (pesan mucho); los datos de la portada sí se recuerdan.
 * ===========================================================================*/
import { detectarHoja, enderezar, limpiar, pararFoto, girarEsquinas, completa, ANCHO, ALTO } from './escaner.js';
import { pdfDeLienzos } from './pdf.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const guarda = { leer(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } }, poner(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} } };
const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const espera = () => new Promise((r) => setTimeout(r, 0));
const LLAVE = 'reportes.tarea.portada';
const hoyLargo = () => { const d = new Date(); return `${d.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getMonth()]} de ${d.getFullYear()}`; };
const CAMPOS = [
  ['escuela', 'Escuela', 'Universidad Tecnológica de Querétaro'], ['carrera', 'Carrera', ''], ['materia', 'Asignatura', ''],
  ['tema', 'Tema', ''], ['subtitulo', 'Subtítulo', ''], ['alumno', 'Alumno(a)', ''], ['matricula', 'Matrícula', ''],
  ['grupo', 'Grupo', ''], ['profesor', 'Profesor(a)', ''], ['fecha', 'Fecha', ''], ['lugar', 'Lugar', 'Santiago de Querétaro, Qro.'],
];
const MODOS = { escaneo: 'Escaneo', color: 'Color', original: 'Original' };

let hojas = [], siguiente = 1, portada = guarda.leer(LLAVE, {}), logoPropio = guarda.leer(LLAVE + '.logo', null);
const panel = () => $('#panel-tarea');

/* «Tiro parabólico» + «Lorena Geraldy Gutiérrez Ávila» → Tiro_Parabolico_Gutierrez_Avila */
const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const palabra = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
export function nombreArchivo(tema, alumno){
  const t = sinAcentos(tema).replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean).map(palabra);
  const n = sinAcentos(alumno).replace(/[^A-Za-z ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const ap = (n.length >= 3 ? n.slice(-2) : n.slice(-1)).map(palabra);
  return [...t, ...ap].join('_') || 'Tarea';
}

/* ── pintar el panel ── */
function pintar(){
  const p = panel(); if(!p) return;
  const datos = { ...Object.fromEntries(CAMPOS.map(([k, , d]) => [k, d])), fecha: hoyLargo(), ...portada };
  p.innerHTML = `
    <h2 class="rotulo">Hojas <span class="regla"></span><small>foto → escaneo</small></h2>
    <label class="btn fuerte t-ancho" for="tArchivo">Agregar fotos</label>
    <input type="file" id="tArchivo" accept="image/*" multiple hidden>
    <p class="t-pista">Se recortan y limpian solas. Chueca: «Esquinas».</p>
    <div class="t-hojas" id="tHojas"></div>
    <h2 class="rotulo">Portada <span class="regla"></span><small>APA 7</small></h2>
    <label class="t-check"><input type="checkbox" id="tConPortada" ${portada.sinPortada ? '' : 'checked'}> Con portada</label>
    <label class="campo"><span>Logo</span><select id="tLogo"><option value="uteq">UTEQ</option><option value="propio">${logoPropio ? 'El mío' : 'Subir otro'}</option><option value="no">Sin logo</option></select></label>
    <input type="file" id="tLogoArchivo" accept="image/*" hidden>
    <div class="t-campos">${CAMPOS.map(([k, t]) => `<label class="campo"><span>${t}</span><input type="text" data-p="${k}" value="${esc(datos[k] || '')}" autocomplete="off"></label>`).join('')}</div>
    <h2 class="rotulo">Archivo <span class="regla"></span></h2>
    <label class="campo"><span>Nombre</span><input type="text" id="tNombre" autocomplete="off"></label>
    <div class="t-acciones"><button class="btn fuerte" id="tPDF" type="button">Descargar PDF</button><button class="btn" id="tCompartir" type="button" hidden>Compartir</button></div>
    <p class="t-estado" id="tEstado" role="status"></p>`;
  $('#tLogo', p).value = portada.logo || 'uteq';
  ponerNombre();
  if(navigator.canShare) $('#tCompartir', p).hidden = false;
  pintarHojas();
}
function ponerNombre(){
  const i = $('#tNombre'); if(!i) return;
  if(!portada.nombreAMano) i.value = nombreArchivo(portada.tema ?? '', portada.alumno ?? '');
  else i.value = portada.nombre || '';
}
function pintarHojas(){
  const caja = $('#tHojas'); if(!caja) return;
  caja.innerHTML = hojas.length ? hojas.map((h, i) => `<div class="t-hoja" data-id="${h.id}">
      <div class="t-mini">${h.mini ? `<img src="${h.mini}" alt="Hoja ${i + 1}">` : '<span class="t-cargando">Limpiando…</span>'}<b class="t-num">${i + 1}</b></div>
      <div class="t-bts">
        <button class="btn chico" data-t="antes" ${i ? '' : 'disabled'} aria-label="Mover antes">←</button>
        <button class="btn chico" data-t="despues" ${i < hojas.length - 1 ? '' : 'disabled'} aria-label="Mover después">→</button>
        <button class="btn chico" data-t="girar">Girar</button>
        <button class="btn chico" data-t="esquinas">Esquinas</button>
        <select data-t="modo" aria-label="Cómo se limpia">${Object.entries(MODOS).map(([k, t]) => `<option value="${k}"${h.modo === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <button class="btn chico borrar" data-t="quitar">Quitar</button>
      </div></div>`).join('') : '<p class="t-vacio">Todavía no hay hojas.</p>';
}
const estado = (t) => { const e = $('#tEstado'); if(e) e.textContent = t; };

/* ── las fotos ── */
const cargar = (archivo) => new Promise((ok, mal) => {
  const url = URL.createObjectURL(archivo), img = new Image();
  img.onload = () => { const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = lienzo(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); ok(pararFoto(c)); };
  img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo abrir la foto')); };
  img.src = url;
});
let fila = Promise.resolve();
async function procesar(h){
  h.mini = null; pintarHojas(); await espera();
  const plana = enderezar(h.foto, h.q);
  const limpia = limpiar(plana, h.modo);
  const c = lienzo(ANCHO, ALTO); c.getContext('2d').putImageData(limpia, 0, 0);
  h.lista = c;
  const m = lienzo(255, 330); m.getContext('2d').drawImage(c, 0, 0, 255, 330); h.mini = m.toDataURL('image/jpeg', 0.75);
  pintarHojas();
}
const encolar = (h) => (fila = fila.then(() => procesar(h)).catch((e) => estado(e.message)));
export async function agregar(archivos){
  for(const a of archivos){
    try{
      const foto = await cargar(a);
      const h = { id: siguiente++, foto, q: detectarHoja(foto), modo: 'escaneo', mini: null, lista: null };
      hojas.push(h); pintarHojas(); encolar(h);
    }catch(e){ estado(e.message); }
  }
  return fila;
}

/* ── esquinas a mano ── */
function editarEsquinas(h){
  const capa = document.createElement('div'); capa.className = 't-capa';
  capa.innerHTML = `<div class="t-lienzo"><canvas></canvas><svg><polygon/></svg>${[0, 1, 2, 3].map((i) => `<span class="t-punto" data-i="${i}"></span>`).join('')}</div>
    <div class="t-capa-bts"><button class="btn" data-c="toda" type="button">Toda la foto</button><button class="btn" data-c="cancelar" type="button">Cancelar</button><button class="btn fuerte" data-c="listo" type="button">Listo</button></div>`;
  document.body.append(capa);
  const caja = $('.t-lienzo', capa), cv = $('canvas', caja), pol = $('polygon', caja);
  const maxW = Math.min(innerWidth - 32, 900), maxH = innerHeight - 140, k = Math.min(maxW / h.foto.width, maxH / h.foto.height);
  cv.width = Math.round(h.foto.width * k); cv.height = Math.round(h.foto.height * k); cv.getContext('2d').drawImage(h.foto, 0, 0, cv.width, cv.height);
  caja.style.width = cv.width + 'px'; caja.style.height = cv.height + 'px';
  let q = h.q.map((p) => [...p]);
  const dibujar = () => {
    pol.setAttribute('points', q.map(([x, y]) => `${x * k},${y * k}`).join(' '));
    capa.querySelectorAll('.t-punto').forEach((p, i) => { p.style.left = q[i][0] * k + 'px'; p.style.top = q[i][1] * k + 'px'; });
  };
  dibujar();
  let arrastra = -1;
  caja.addEventListener('pointerdown', (e) => { const p = e.target.closest('.t-punto'); if(!p) return; arrastra = +p.dataset.i; try{ p.setPointerCapture(e.pointerId); }catch{} e.preventDefault(); });
  caja.addEventListener('pointermove', (e) => {
    if(arrastra < 0) return; const r = cv.getBoundingClientRect();
    q[arrastra] = [Math.max(0, Math.min(h.foto.width, (e.clientX - r.left) / k)), Math.max(0, Math.min(h.foto.height, (e.clientY - r.top) / k))]; dibujar();
  });
  const soltar = () => { arrastra = -1; };
  caja.addEventListener('pointerup', soltar); caja.addEventListener('pointercancel', soltar);
  capa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if(!b) return;
    if(b.dataset.c === 'toda'){ q = completa(h.foto); dibujar(); return; }
    if(b.dataset.c === 'listo'){ h.q = q; encolar(h); }
    capa.remove();
  });
}

/* ── las páginas: portada y hojas, en carta a 200 ppp ── */
const PT = 200 / 72, MARGEN = 200, LETRA = 'Times New Roman, Times, Liberation Serif, serif';
function numero(x, n){ x.fillStyle = '#111'; x.font = `${12 * PT}px ${LETRA}`; x.textAlign = 'right'; x.textBaseline = 'alphabetic'; x.fillText(String(n), ANCHO - MARGEN, 130); }
function renglones(x, texto, ancho){
  const out = []; let r = '';
  for(const w of String(texto).split(/\s+/)){ const p = r ? r + ' ' + w : w; if(x.measureText(p).width > ancho && r){ out.push(r); r = w; } else r = p; }
  if(r) out.push(r); return out;
}
const cargarImg = (src) => new Promise((ok) => { if(!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
async function hacerPortada(d){
  const c = lienzo(ANCHO, ALTO), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, ANCHO, ALTO);
  numero(x, 1);
  const logo = d.logo === 'no' ? null : await cargarImg(d.logo === 'propio' && logoPropio ? logoPropio : new URL('./logo-uteq.png', import.meta.url).href);
  let y = MARGEN + 30;
  if(logo){ const w = 330, h = w * logo.naturalHeight / logo.naturalWidth; x.drawImage(logo, (ANCHO - w) / 2, y, w, h); y += h + 70; } else y += 120;
  x.textAlign = 'center'; x.fillStyle = '#111'; x.textBaseline = 'alphabetic';
  const linea = (t, px, peso = '', estilo = '', alto = 1.45) => { x.font = `${estilo} ${peso} ${px}px ${LETRA}`; for(const r of renglones(x, t, ANCHO - 2 * MARGEN - 80)){ y += px * alto; x.fillText(r, ANCHO / 2, y); } };
  if(d.escuela) linea(String(d.escuela).toUpperCase(), 14 * PT, 'bold');
  y += 14;
  if(d.carrera) linea(`Carrera: ${d.carrera}`, 12 * PT);
  if(d.materia) linea(`Asignatura: ${d.materia}`, 12 * PT);
  y = Math.max(y + 160, 960);
  if(d.tema) linea(d.tema, 16 * PT, 'bold', '', 1.4);
  if(d.subtitulo){ y += 10; linea(d.subtitulo, 12 * PT, '', 'italic'); }
  /* los datos, abajo, en dos columnas */
  const filas = [['Alumno(a):', d.alumno], ['Matrícula:', d.matricula], ['Grupo:', d.grupo], ['Profesor(a):', d.profesor], ['Fecha:', d.fecha], ['Lugar:', d.lugar]].filter(([, v]) => v);
  const alto = 12 * PT * 2, x0 = 360, x1 = 720;
  let yy = ALTO - MARGEN - 40 - filas.length * alto;
  x.textAlign = 'left';
  for(const [k, v] of filas){ yy += alto; x.font = `bold ${12 * PT}px ${LETRA}`; x.fillText(k, x0, yy); x.font = `${12 * PT}px ${LETRA}`; x.fillText(String(v), x1, yy); }
  return c;
}
function hacerHoja(h, n){
  const c = lienzo(ANCHO, ALTO), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, ANCHO, ALTO);
  numero(x, n);
  const aw = ANCHO - 2 * MARGEN, ah = ALTO - 2 * MARGEN, k = Math.min(aw / h.lista.width, ah / h.lista.height);
  const w = h.lista.width * k, hh = h.lista.height * k, px = (ANCHO - w) / 2, py = MARGEN + (ah - hh) / 2;
  x.drawImage(h.lista, px, py, w, hh); x.strokeStyle = '#c9c9c9'; x.lineWidth = 1.5; x.strokeRect(px, py, w, hh);
  return c;
}
export async function armar(){
  await fila;
  const d = { ...Object.fromEntries(CAMPOS.map(([k, , def]) => [k, def])), fecha: hoyLargo(), ...portada };
  const paginas = [];
  if(!portada.sinPortada) paginas.push(await hacerPortada(d));
  hojas.forEach((h) => { if(h.lista) paginas.push(hacerHoja(h, paginas.length + 1)); });
  const nombre = (($('#tNombre') && $('#tNombre').value.trim()) || nombreArchivo(d.tema, d.alumno)).replace(/[\\/:*?"<>|]+/g, '_') + '.pdf';
  const blob = await pdfDeLienzos(paginas, { titulo: d.tema || 'Tarea', autor: d.alumno || '' });
  return { blob, nombre, paginas: paginas.length };
}
export async function descargar(compartir = false){
  if(!hojas.length && portada.sinPortada){ estado('Agrega fotos o deja la portada.'); return; }
  estado('Armando el PDF…'); await espera();
  const { blob, nombre, paginas } = await armar();
  const archivo = new File([blob], nombre, { type: 'application/pdf' });
  if(compartir && navigator.canShare && navigator.canShare({ files: [archivo] })){
    try{ await navigator.share({ files: [archivo], title: nombre }); estado(`Listo: ${paginas} páginas.`); return; }catch{}
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  estado(`Listo: ${nombre} · ${paginas} páginas.`);
}

/* ── los toques ── */
document.addEventListener('change', async (e) => {
  const p = panel(); if(!p || !p.contains(e.target)) return;
  if(e.target.id === 'tArchivo'){ const fs = [...e.target.files]; e.target.value = ''; estado(`Limpiando ${fs.length} hoja${fs.length === 1 ? '' : 's'}…`); await agregar(fs); estado(`${hojas.length} hoja${hojas.length === 1 ? '' : 's'} lista${hojas.length === 1 ? '' : 's'}.`); return; }
  if(e.target.id === 'tConPortada'){ portada.sinPortada = !e.target.checked; guarda.poner(LLAVE, portada); return; }
  if(e.target.id === 'tLogo'){
    portada.logo = e.target.value; guarda.poner(LLAVE, portada);
    if(e.target.value === 'propio' && !logoPropio) $('#tLogoArchivo').click();
    return;
  }
  if(e.target.id === 'tLogoArchivo' && e.target.files[0]){
    const img = await cargar(e.target.files[0]); const k = Math.min(1, 500 / Math.max(img.width, img.height));
    const c = lienzo(Math.round(img.width * k), Math.round(img.height * k)), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    logoPropio = c.toDataURL('image/png'); guarda.poner(LLAVE + '.logo', logoPropio); estado('Logo guardado.'); return;
  }
  const s = e.target.closest('[data-t="modo"]');
  if(s){ const h = hojas.find((x) => x.id === +s.closest('.t-hoja').dataset.id); if(h){ h.modo = s.value; encolar(h); } }
});
document.addEventListener('input', (e) => {
  const p = panel(); if(!p || !p.contains(e.target)) return;
  if(e.target.dataset.p){ portada[e.target.dataset.p] = e.target.value; guarda.poner(LLAVE, portada); if(['tema', 'alumno'].includes(e.target.dataset.p)) ponerNombre(); }
  if(e.target.id === 'tNombre'){ portada.nombreAMano = !!e.target.value.trim(); portada.nombre = e.target.value; guarda.poner(LLAVE, portada); }
});
document.addEventListener('click', (e) => {
  const p = panel(); if(!p || !p.contains(e.target)) return;
  if(e.target.closest('#tPDF')){ descargar(false); return; }
  if(e.target.closest('#tCompartir')){ descargar(true); return; }
  const b = e.target.closest('button[data-t]'); if(!b) return;
  const i = hojas.findIndex((x) => x.id === +b.closest('.t-hoja').dataset.id), h = hojas[i]; if(!h) return;
  const t = b.dataset.t;
  if(t === 'antes' && i > 0){ [hojas[i - 1], hojas[i]] = [hojas[i], hojas[i - 1]]; pintarHojas(); }
  else if(t === 'despues' && i < hojas.length - 1){ [hojas[i + 1], hojas[i]] = [hojas[i], hojas[i + 1]]; pintarHojas(); }
  else if(t === 'girar'){ h.q = girarEsquinas(h.q); encolar(h); }
  else if(t === 'esquinas') editarEsquinas(h);
  else if(t === 'quitar'){ hojas.splice(i, 1); pintarHojas(); }
});

pintar();
window.__tarea = { agregar, armar, descargar, nombreArchivo, hojas: () => hojas, listo: () => fila };
