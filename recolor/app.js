/* CAMBIAR COLOR · la pantalla. El cálculo está en motor.js. */
import * as M from './motor.js';
import { partes } from './partes.js';

const MAX = 1600;          // lado mayor con el que se trabaja (el dedo va fluido)
const MAX_SALIDA = 4032;   // lado mayor al descargar: una foto de iPhone entera

const COLORES = [
  ['Negro', '#17120F'], ['Castaño oscuro', '#3B2416'], ['Castaño', '#6A4428'], ['Caramelo', '#A8743F'],
  ['Cobrizo', '#A0482A'], ['Rubio', '#C9A063'], ['Rubio cenizo', '#B8A98A'], ['Platinado', '#E5DCCB'],
  ['Gris plata', '#A9A9AE'], ['Blanco', '#F2F1EE'], ['Vino', '#5E1A2B'], ['Rojo', '#B3202A'],
  ['Rosa', '#E0739F'], ['Naranja', '#E06A1B'], ['Amarillo', '#E8C21D'], ['Verde', '#2F8A58'],
  ['Turquesa', '#1BA4A0'], ['Azul', '#2D5CC0'], ['Marino', '#1C2A55'], ['Morado', '#6A3F9E'],
];
const PISTAS = {
  tocar: 'Toca lo que quieres cambiar —el cabello, la playera—. Entra con todo y sus sombras. Tocar otra parte la suma.',
  pincel: 'Pasa el dedo por encima. Sólo pinta lo que se parece a donde empezaste.',
  pincelLibre: 'Pasa el dedo: pinta todo lo que toque.',
  borrar: 'Pasa el dedo por donde el color se pasó.',
  gotero: 'Toca la foto para tomar ese color.',
};

const $ = (s) => document.querySelector(s);
const vista = $('#vista'), marca = $('#marca'), escenario = $('#escenario'), anillo = $('#anillo');
const cv = vista.getContext('2d', { willReadFrequently: true }), cm = marca.getContext('2d');

let W = 0, H = 0, archivo = null, nombre = 'foto';
let inicial = null;        // la foto como llegó, a tamaño de trabajo (para «Antes»)
let base = null;           // la foto con lo que ya se aplicó
let lab = null;            // base en Lab
let mascara = null;        // lo elegido ahora (0-255)
let ops = [];              // lo aplicado, para repetirlo al tamaño original
let historial = [];
let herramienta = 'tocar', previa = 'tocar';
let destino = null;        // { hex, L, a, b }
let ultimoToque = null;    // { x, y, antes } para que mover «Qué tanto se parece» rehaga el toque
let tonos = null, activos = new Set();
let zoom = { s: 1, x: 0, y: 0 };
let comparando = false;
let zonas = null, turno = 0;   // partes.js: [fondo, cabello, piel, cara, ropa, otros], 0-255

/* ── el color ── */
function ponerColor(hex){
  const [L, a, b] = M.labDe(...M.hexARgb(hex));
  destino = { hex: hex.toUpperCase(), L, a, b };
  for(const b2 of $('#muestras').querySelectorAll('button')) b2.setAttribute('aria-pressed', String(b2.dataset.color === destino.hex));
  const nom = COLORES.find(([, h]) => h === destino.hex)?.[0] || 'Tu color';
  $('#elegido').innerHTML = `<i style="background:${destino.hex}"></i><span>${nom} · ${destino.hex}</span>`;
  $('#propio').value = destino.hex.toLowerCase();
  pintar();
}
function armarMuestras(){
  const caja = $('#muestras');
  caja.replaceChildren(...COLORES.map(([n, h]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.color = h; b.style.background = h; b.title = n; b.setAttribute('aria-label', n);
    return b;
  }));
  const l = document.createElement('label');
  l.title = 'Otro color'; l.innerHTML = '<span aria-hidden="true">＋</span><input type="color" id="propio" aria-label="Otro color">';
  caja.append(l);
  caja.addEventListener('click', (e) => { const b = e.target.closest('button[data-color]'); if(b) ponerColor(b.dataset.color); });
  $('#propio').addEventListener('input', (e) => ponerColor(e.target.value));
}

const opciones = () => ({ intensidad: $('#fuerza').value / 100, igualar: $('#igualar').checked });

/* ── pintar la pantalla, una vez por cuadro ── */
let pendiente = false, imagen = null;
function pintar(){
  if(pendiente || !base) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    if(!imagen || imagen.width !== W) imagen = cv.createImageData(W, H);
    const d = imagen.data;
    if(comparando) d.set(inicial);
    else if($('#verTonos').checked && tonos){
      const cs = tonos.centros.map((c) => M.hexARgb(c.hex)), e = tonos.etiquetas;
      for(let i = 0, j = 0; i < e.length; i++, j += 4){ const c = cs[e[i]]; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255; }
    } else {
      d.set(base);
      const caja = M.cajaDe(mascara, W, H);
      if(caja && destino) M.recolorear(base, lab, mascara, destino, M.estadisticas(lab, mascara), opciones(), d, caja);
    }
    cv.putImageData(imagen, 0, 0);
    pintarMarca();
    contar();
  });
}
function pintarMarca(){
  cm.clearRect(0, 0, W, H);
  if(!$('#marcar').checked || comparando) return;
  const im = cm.createImageData(W, H), d = im.data;
  for(let i = 0, j = 0; i < mascara.length; i++, j += 4) if(mascara[i]){ d[j] = 214; d[j + 1] = 40; d[j + 2] = 255; d[j + 3] = mascara[i] * 0.55; }
  cm.putImageData(im, 0, 0);
}
let cuanto = 0;
function contar(){
  let n = 0; for(let i = 0; i < mascara.length; i++) if(mascara[i] > 127) n++;
  cuanto = n / mascara.length;
  $('#aplicar').disabled = $('#limpiar').disabled = !n;
  $('#deshacer').disabled = !historial.length;
  $('#estado').textContent = n ? `Elegido: ${(cuanto * 100).toFixed(cuanto < 0.01 ? 1 : 0)} % de la foto.` : (ops.length ? `${ops.length} cambio${ops.length > 1 ? 's' : ''} aplicado${ops.length > 1 ? 's' : ''}.` : '');
}

/* ── tamaño y acercamiento ── */
function encuadrar(){
  if(!W) return;
  const r = escenario.getBoundingClientRect();
  const e = Math.min((r.width - 16) / W, (r.height - 16) / H);
  for(const c of [vista, marca]){
    c.style.width = W * e + 'px'; c.style.height = H * e + 'px';
    c.style.left = (r.width - W * e) / 2 + 'px'; c.style.top = (r.height - H * e) / 2 + 'px';
    c.style.transform = `translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})`;
  }
  $('#encuadre').hidden = zoom.s <= 1.01;
}
new ResizeObserver(encuadrar).observe(escenario);
$('#encuadre').addEventListener('click', () => { zoom = { s: 1, x: 0, y: 0 }; encuadrar(); });

/* ── historial ── */
function guardar(){
  historial.push({ mascara: mascara.slice(), base, ops: ops.length, activos: new Set(activos) });
  if(historial.length > 30) historial.shift();
}
function deshacer(){
  const h = historial.pop(); if(!h) return;
  mascara = h.mascara; ops.length = h.ops; activos = h.activos; ultimoToque = null;
  if(h.base !== base){ base = h.base; lab = M.laboratorio(base, W, H); tonos = null; pintarTonos(); }
  marcarGrupos(); pintar();
}

/* ── el dedo ── */
const aImagen = (cx, cy) => { const r = vista.getBoundingClientRect(); return [(cx - r.left) * W / r.width, (cy - r.top) * H / r.height]; };
const dedos = new Map();
let trazo = null, gesto = null, toque = null;

function verAnillo(cx, cy){
  if(herramienta !== 'pincel' && herramienta !== 'borrar'){ anillo.hidden = true; return; }
  const r = vista.getBoundingClientRect(), e = escenario.getBoundingClientRect(), d = 2 * $('#radio').value * r.width / W;
  anillo.hidden = false; anillo.style.width = anillo.style.height = d + 'px';
  anillo.style.left = cx - e.left + 'px'; anillo.style.top = cy - e.top + 'px';
}

vista.addEventListener('pointerdown', (e) => {
  if(!base) return;
  e.preventDefault(); vista.setPointerCapture(e.pointerId);
  dedos.set(e.pointerId, [e.clientX, e.clientY]);
  if(dedos.size === 2){
    if(trazo){ deshacer(); trazo = null; }          // el primer dedo no era un trazo: era el principio de acercar
    toque = null;
    const [a, b] = [...dedos.values()];
    gesto = { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, zoom: { ...zoom } };
    anillo.hidden = true; return;
  }
  if(dedos.size > 2) return;
  const [x, y] = aImagen(e.clientX, e.clientY);
  if(x < 0 || y < 0 || x >= W || y >= H) return;
  /* «Tocar» y «Tomar color» se hacen al LEVANTAR el dedo: el primer dedo de
     un pellizco para acercar también baja primero, y elegía lo de abajo. */
  if(herramienta === 'gotero' || herramienta === 'tocar'){ toque = { id: e.pointerId, x, y, cx: e.clientX, cy: e.clientY }; return; }
  guardar(); ultimoToque = null;
  const ref = M.referencia(lab, Math.floor(x), Math.floor(y));
  trazo = { x, y, ref, zona: zonaEn(x, y) };
  M.pincelada(mascara, lab, x, y, x, y, { radio: +$('#radio').value, ref, zona: trazo.zona, tol: +$('#tol').value, quitar: herramienta === 'borrar', respetar: herramienta === 'pincel' && $('#respetar').checked });
  verAnillo(e.clientX, e.clientY); pintar();
});
vista.addEventListener('pointermove', (e) => {
  if(e.pointerType === 'mouse' && !dedos.size){ verAnillo(e.clientX, e.clientY); return; }
  if(!dedos.has(e.pointerId)) return;
  dedos.set(e.pointerId, [e.clientX, e.clientY]);
  if(dedos.size === 2 && gesto){
    const [a, b] = [...dedos.values()], cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    const s = Math.min(8, Math.max(1, gesto.zoom.s * d / gesto.d)), k = s / gesto.zoom.s;
    const r = escenario.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    /* el punto que estaba bajo los dedos se queda bajo los dedos */
    zoom = { s, x: cx - ox - k * (gesto.cx - ox - gesto.zoom.x), y: cy - oy - k * (gesto.cy - oy - gesto.zoom.y) };
    if(s === 1) zoom.x = zoom.y = 0;
    encuadrar(); return;
  }
  if(!trazo) return;
  const [x, y] = aImagen(e.clientX, e.clientY);
  M.pincelada(mascara, lab, trazo.x, trazo.y, x, y, { radio: +$('#radio').value, ref: trazo.ref, zona: trazo.zona, tol: +$('#tol').value, quitar: herramienta === 'borrar', respetar: herramienta === 'pincel' && $('#respetar').checked });
  trazo.x = x; trazo.y = y;
  verAnillo(e.clientX, e.clientY); pintar();
});
function hacerToque({ x, y }){
  if(herramienta === 'gotero'){
    const d = cv.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 5, 5).data;
    let r = 0, g = 0, b = 0, n = 0; for(let k = 0; k < d.length; k += 4){ r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
    ponerColor(M.rgbAHex(r / n, g / n, b / n)); elegir(previa); return;
  }
  guardar();
  ultimoToque = { x, y, antes: mascara.slice(), zona: zonaEn(x, y) };
  tocarCon(ultimoToque);
}
function soltar(e){
  if(!dedos.has(e.pointerId)) return;
  const eran = dedos.size;
  dedos.delete(e.pointerId);
  if(toque && toque.id === e.pointerId){
    const t = toque; toque = null;
    if(eran === 1 && e.type === 'pointerup' && Math.hypot(e.clientX - t.cx, e.clientY - t.cy) < 12) hacerToque(t);
  }
  if(dedos.size < 2) gesto = null;
  if(!dedos.size){ trazo = null; if(e.pointerType !== 'mouse') anillo.hidden = true; contar(); }
}
vista.addEventListener('pointerup', soltar);
vista.addEventListener('pointercancel', soltar);
vista.addEventListener('pointerleave', (e) => { if(e.pointerType === 'mouse' && !dedos.size) anillo.hidden = true; });

function tocarCon(t){
  const nueva = M.porToque(lab, t.x, t.y, { tol: +$('#tol').value, contiguo: $('#contiguo').checked, zona: t.zona });
  mascara = t.antes.slice();
  for(let i = 0; i < nueva.length; i++) if(nueva[i] > mascara[i]) mascara[i] = nueva[i];
  pintar();
}
/* Mover «Qué tanto se parece» justo después de tocar rehace ese toque: se ve crecer o encoger la zona. */
for(const id of ['tol', 'contiguo']) $('#' + id).addEventListener('input', () => { if(ultimoToque) tocarCon(ultimoToque); });

/* ── las partes de la foto (partes.js) ── */
/* La parte donde cayó el dedo, o null si es fondo o el modelo no está seguro:
   en el fondo no se restringe nada, se elige sólo por color. */
function zonaEn(x, y){
  if(!zonas) return null;
  const i = Math.min(H - 1, Math.floor(y)) * W + Math.min(W - 1, Math.floor(x));
  let k = 0; for(let c = 1; c < zonas.length; c++) if(zonas[c][i] > zonas[k][i]) k = c;
  return k > 0 && zonas[k][i] >= 128 ? zonas[k] : null;
}
function piel(){ const a = zonas[2], b = zonas[3], o = new Uint8Array(a.length); for(let i = 0; i < o.length; i++) o[i] = Math.max(a[i], b[i]); return o; }
function ponerZonas(z){
  zonas = z;
  const caja = $('#partes'), t = $('#partesEstado');
  if(!z){ caja.hidden = true; return; }
  const parte = (k) => { let n = 0; for(let i = 0; i < z[k].length; i += 7) if(z[k][i] >= 128) n++; return n * 7 / z[k].length; };
  const hay = { 1: parte(1), piel: Math.max(parte(2), parte(3)), 4: parte(4) };
  const alguna = hay[1] + hay.piel + hay[4] > 0.005;
  for(const b of caja.querySelectorAll('button[data-p]')){ b.disabled = false; b.hidden = !alguna || (b.dataset.p !== '0' && hay[b.dataset.p] < 0.002); }
  t.textContent = alguna ? 'Elegir de un toque. Y al tocar la foto, lo elegido se queda en su parte: el cabello no se sale a la cara.' : 'No encontré a una persona en la foto: se elige por color.';
}
async function reconocer(){
  const mio = ++turno, caja = $('#partes');
  caja.hidden = false; $('#partesEstado').textContent = 'Reconociendo cabello, piel y ropa…';
  for(const b of caja.querySelectorAll('button[data-p]')){ b.disabled = true; b.hidden = false; }
  try{
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(inicial), W, H), 0, 0);
    const z = await partes(c);
    if(mio === turno) ponerZonas(z);
  } catch(e){
    if(mio === turno) ponerZonas(null);
  }
}
$('#partes').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-p]'); if(!b || !zonas) return;
  const z = b.dataset.p === 'piel' ? piel() : zonas[+b.dataset.p], nueva = M.mascaraDeZona(z);
  guardar(); ultimoToque = null;
  for(let i = 0; i < nueva.length; i++) if(nueva[i] > mascara[i]) mascara[i] = nueva[i];
  pintar();
});

/* ── herramientas ── */
function elegir(h){
  if(h === 'gotero' && herramienta !== 'gotero') previa = herramienta;
  herramienta = h;
  for(const b of $('#herramientas').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.h === h));
  $('#c-radio').hidden = !(h === 'pincel' || h === 'borrar');
  $('#c-respetar').hidden = h !== 'pincel';
  $('#c-contiguo').hidden = h !== 'tocar';
  $('#c-tol').hidden = h === 'borrar' || h === 'gotero';
  ponerPista();
}
function ponerPista(){
  const p = herramienta === 'pincel' && !$('#respetar').checked ? PISTAS.pincelLibre : PISTAS[herramienta];
  $('#pista').textContent = p + (zoom.s > 1.01 ? '' : ' · Dos dedos: acercar.');
}
$('#herramientas').addEventListener('click', (e) => { const b = e.target.closest('button[data-h]'); if(b) elegir(b.dataset.h); });
$('#respetar').addEventListener('change', ponerPista);

for(const [id, fmt] of [['tol', (v) => v], ['radio', (v) => v + ' px'], ['fuerza', (v) => v + ' %']]){
  const i = $('#' + id), o = $('#o-' + id), ver = () => { o.textContent = fmt(i.value); };
  i.addEventListener('input', () => { ver(); if(id === 'fuerza') pintar(); }); ver();
}
for(const id of ['igualar', 'marcar', 'verTonos']) $('#' + id).addEventListener('change', pintar);

/* ── acciones ── */
$('#deshacer').addEventListener('click', deshacer);
$('#limpiar').addEventListener('click', () => { guardar(); mascara = new Uint8Array(W * H); activos.clear(); ultimoToque = null; marcarGrupos(); pintar(); });
$('#aplicar').addEventListener('click', () => {
  const est = M.estadisticas(lab, mascara); if(!est || !destino) return;
  guardar();
  const op = { mascara: mascara.slice(), destino: { ...destino }, est, ...opciones() };
  base = M.recolorear(base, lab, mascara, destino, est, op, new Uint8ClampedArray(base));
  ops.push(op);
  lab = M.laboratorio(base, W, H);
  mascara = new Uint8Array(W * H); activos.clear(); ultimoToque = null;
  if(tonos){ tonos = null; pintarTonos(); }
  pintar();
});
const comparar = $('#comparar');
comparar.addEventListener('pointerdown', (e) => { e.preventDefault(); comparando = true; pintar(); });
for(const ev of ['pointerup', 'pointerleave', 'pointercancel']) comparar.addEventListener(ev, () => { if(comparando){ comparando = false; pintar(); } });
comparar.addEventListener('keydown', (e) => { if(e.key === ' ' || e.key === 'Enter'){ comparando = true; pintar(); } });
comparar.addEventListener('keyup', () => { comparando = false; pintar(); });

/* ── separar por tono ── */
function pintarTonos(){
  const abierto = !$('#panelTonos').hidden;
  if(abierto && !tonos) tonos = M.grupos(lab, 8);
  const g = $('#grupos');
  if(!tonos){ g.replaceChildren(); return; }
  g.replaceChildren(...tonos.centros.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.g = i; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `Tono ${i + 1}, ${Math.round(c.parte * 100)} % de la foto`);
    b.innerHTML = `<i style="background:${c.hex}"></i>${Math.max(1, Math.round(c.parte * 100))} %`;
    return b;
  }));
  marcarGrupos();
}
function marcarGrupos(){ for(const b of $('#grupos').querySelectorAll('button')) b.setAttribute('aria-pressed', String(activos.has(+b.dataset.g))); }
$('#tonos').addEventListener('click', () => {
  const p = $('#panelTonos'); p.hidden = !p.hidden; $('#tonos').setAttribute('aria-expanded', String(!p.hidden));
  if(!p.hidden){ $('#estado').textContent = 'Separando por tono…'; setTimeout(() => { pintarTonos(); contar(); }, 30); }
  else if($('#verTonos').checked){ $('#verTonos').checked = false; pintar(); }
});
$('#grupos').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-g]'); if(!b || !tonos) return;
  const id = +b.dataset.g, et = tonos.etiquetas;
  guardar(); ultimoToque = null;
  if(activos.has(id)){ activos.delete(id); for(let i = 0; i < et.length; i++) if(et[i] === id) mascara[i] = 0; }
  else { activos.add(id); for(let i = 0; i < et.length; i++) if(et[i] === id) mascara[i] = 255; }
  marcarGrupos(); pintar();
});

/* ── abrir ── */
async function abrir(f){
  if(!f || !f.type.startsWith('image/')){ $('#estado').textContent = 'Eso no es una imagen.'; return; }
  let bmp;
  try{ bmp = await createImageBitmap(f); }
  catch{ alert('No se pudo abrir esa imagen.'); return; }
  archivo = f; nombre = (f.name || 'foto').replace(/\.[^.]+$/, '');
  const e = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  W = Math.max(1, Math.round(bmp.width * e)); H = Math.max(1, Math.round(bmp.height * e));
  vista.width = marca.width = W; vista.height = marca.height = H;
  cv.drawImage(bmp, 0, 0, W, H); bmp.close?.();
  base = cv.getImageData(0, 0, W, H).data; inicial = base.slice();
  lab = M.laboratorio(base, W, H);
  mascara = new Uint8Array(W * H); ops = []; historial = []; activos.clear(); tonos = null; ultimoToque = null;
  zoom = { s: 1, x: 0, y: 0 };
  $('#soltar').hidden = true; $('#editor').hidden = false;
  $('#panelTonos').hidden = true; $('#tonos').setAttribute('aria-expanded', 'false'); $('#verTonos').checked = false; pintarTonos();
  encuadrar(); elegir('tocar'); pintar();
  zonas = null; reconocer();
  if(innerWidth < 900) $('#editor').scrollIntoView({ block: 'start' });   // la foto arriba, los controles abajo
}
$('#archivo').addEventListener('change', (e) => { abrir(e.target.files[0]); e.target.value = ''; });
const zona = $('#soltar');
zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('encima'); });
zona.addEventListener('dragleave', () => zona.classList.remove('encima'));
zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('encima'); abrir(e.dataTransfer.files[0]); });
addEventListener('paste', (e) => { const f = e.clipboardData?.files?.[0]; if(f) abrir(f); });
$('#otra').addEventListener('click', () => $('#archivo').click());

/* ── guardar: se repite todo sobre la foto original ── */
async function exportar(){
  const bmp = await createImageBitmap(archivo);
  const e = Math.min(1, MAX_SALIDA / Math.max(bmp.width, bmp.height));
  const SW = Math.round(bmp.width * e), SH = Math.round(bmp.height * e);
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0, SW, SH); bmp.close?.();
  const todo = [...ops];
  const est = M.estadisticas(lab, mascara);
  if(est && destino) todo.push({ mascara, destino, est, ...opciones() });
  if(todo.length){
    const im = x.getImageData(0, 0, SW, SH);
    /* la máscara de trabajo se agranda con el suavizado del navegador: el borde queda igual de suave */
    const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
    const mx = mc.getContext('2d', { willReadFrequently: true });
    const gc = document.createElement('canvas'); gc.width = SW; gc.height = SH;
    const gx = gc.getContext('2d', { willReadFrequently: true });
    for(const op of todo){
      const md = mx.createImageData(W, H);
      for(let i = 0; i < op.mascara.length; i++) md.data[i * 4 + 3] = op.mascara[i];
      mx.putImageData(md, 0, 0);
      gx.clearRect(0, 0, SW, SH); gx.imageSmoothingQuality = 'high'; gx.drawImage(mc, 0, 0, SW, SH);
      const ga = gx.getImageData(0, 0, SW, SH).data, m = new Uint8Array(SW * SH);
      for(let i = 0; i < m.length; i++) m[i] = ga[i * 4 + 3];
      M.recolorearDirecto(im.data, m, op.destino, op.est, op);
    }
    x.putImageData(im, 0, 0);
  }
  const png = archivo.type === 'image/png';
  const blob = await new Promise((ok) => c.toBlob(ok, png ? 'image/png' : 'image/jpeg', 0.92));
  return new File([blob], `${nombre}-color.${png ? 'png' : 'jpg'}`, { type: blob.type });
}
async function conEstado(fn){
  const b1 = $('#bajar'), b2 = $('#fotos'); b1.disabled = b2.disabled = true;
  $('#estado').textContent = 'Preparando la foto a tamaño completo…';
  try{ await fn(await exportar()); $('#estado').textContent = 'Lista.'; }
  catch(e){ if(e?.name !== 'AbortError') $('#estado').textContent = 'No se pudo guardar: ' + (e?.message || e); }
  finally{ b1.disabled = b2.disabled = false; }
}
function bajar(f){
  const u = URL.createObjectURL(f), a = document.createElement('a');
  a.href = u; a.download = f.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}
$('#bajar').addEventListener('click', () => conEstado(bajar));
$('#fotos').addEventListener('click', () => conEstado(async (f) => {
  if(navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
  else bajar(f);
}));

armarMuestras();
ponerColor('#2D5CC0');
elegir('tocar');
window.__color = { get mascara(){ return mascara; }, get base(){ return base; }, get ops(){ return ops; }, get W(){ return W; }, get H(){ return H; }, get zoom(){ return zoom; }, get tonos(){ return tonos; }, get zonas(){ return zonas; }, ponerZonas };
