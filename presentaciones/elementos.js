/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · mis elementos
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «que pueda crear los suyos propios para agregarlos». Tres caminos
   para hacer uno, y los tres terminan en la misma lista:

   · DE UNA LÁMINA: lo que armó (una forma con texto, un diseño con sus
     colores, su logo) se guarda tal cual, con el XML de PowerPoint y sus
     imágenes. Al ponerlo en otra presentación sale idéntico, escalado.
   · DIBUJADO CON EL DEDO: trazos → SVG (nítido a cualquier tamaño) + PNG
     (para los programas que no leen SVG).
   · HECHO POR LA IA: se le pide un icono o una ilustración, sale en fondo
     blanco y se le quita el fondo desde las orillas (no todo lo blanco: el
     blanco de adentro del dibujo se queda).

   Se guardan en La Sala (sala/servidor/elementos.js) y no en el teléfono,
   para que se vean igual desde el iPhone y la compu y no los borre Safari.
   ═════════════════════════════════════════════════════════════════════════ */
import * as IA from './ia.js';

/* ── ida y vuelta de los datos: bytes ↔ base64 ── */
export function aEnvio(datos){
  const medios = {};
  for(const [rid, m] of Object.entries(datos.medios || {})) medios[rid] = { mime: m.mime, b64: IA.aB64(m.bytes) };
  return { ...datos, medios };
}
export function deEnvio(datos){
  const medios = {};
  for(const [rid, m] of Object.entries(datos.medios || {})) medios[rid] = { mime: m.mime, bytes: IA.deB64(m.b64) };
  return { ...datos, medios };
}

/* Una imagen (URL) achicada a data: URL, para que la vista quepa en la lista. */
async function chica(src, max = 240){
  try{
    const img = await IA.cargar(src);
    const esc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.naturalWidth * esc)); cv.height = Math.max(1, Math.round(img.naturalHeight * esc));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/png');
  }catch{ return null; }
}

/* LA VISTA: las formas del elemento, ya digeridas, recorridas a su propia
   caja. Es lo que se pinta en la lista sin abrir ningún PowerPoint. */
export async function vistaDe(N, deck, i, cid){
  const m = await N.modelo(deck, i);
  const c = N.cajaDe(deck, i, cid);
  if(!c) return null;
  const formas = m.formas.filter((f) => f.cid === Number(cid));
  const w = Math.max(c.w, 1), alto = Math.max(c.h, w * 0.08);
  const dy = (alto - c.h) / 2;
  const salida = [];
  for(const f of formas){
    const g = { ...f, x: f.x - c.x, y: f.y - c.y + dy };
    delete g.cid; delete g.rutaImagen;
    if(g.imagen) g.imagen = await chica(g.imagen);
    if(g.relleno?.imagen) g.relleno = { ...g.relleno, imagen: await chica(g.relleno.imagen) };
    salida.push(g);
  }
  return { ancho: w, alto, fondo: { nada: true }, formas: salida };
}
/* La vista de un elemento que es UNA imagen (dibujo, icono de IA). */
export async function vistaDeImagen(url, proporcion){
  const ancho = 1000, alto = ancho / proporcion;
  return { ancho, alto, fondo: { nada: true }, formas: [{ tipo: 'pic', x: 0, y: 0, w: ancho, h: alto, imagen: await chica(url, 320) }] };
}

/* Pinta una vista dentro de una caja de w×h px, centrada y sin deformar. */
export function pintarVista(V, vista, w, hh){
  const caja = document.createElement('div');
  caja.className = 'mi-vista';
  Object.assign(caja.style, { width: w + 'px', height: hh + 'px' });
  if(!vista){ caja.textContent = '◇'; return caja; }
  let lz;
  try{ lz = V.pintar(typeof vista === 'string' ? JSON.parse(vista) : vista); }catch{ caja.textContent = '◇'; return caja; }
  const altoLz = parseFloat(lz.style.height) || V.BASE;
  const k = Math.min(w / V.BASE, hh / altoLz);
  Object.assign(lz.style, { transform: `scale(${k})`, left: (w - V.BASE * k) / 2 + 'px', top: (hh - altoLz * k) / 2 + 'px' });
  caja.appendChild(lz);
  return caja;
}

/* ══ DIBUJAR CON EL DEDO ══ */
/* trazos: [{ color, grosor, puntos: [[x,y],…] }] en px del lienzo. → SVG recortado a lo dibujado. */
export function trazosASvg(trazos){
  const usados = trazos.filter((t) => t.puntos.length);
  if(!usados.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for(const t of usados) for(const [x, y] of t.puntos){ const r = t.grosor / 2; x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); }
  const pad = 4; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const n = (v) => Math.round(v * 10) / 10;
  const camino = (ps) => {
    if(ps.length === 1) return `M${n(ps[0][0])} ${n(ps[0][1])}h0.01`;
    // Curvas por los puntos medios: el trazo sale suave aunque el dedo tiemble.
    let d = `M${n(ps[0][0])} ${n(ps[0][1])}`;
    for(let i = 1; i < ps.length - 1; i++){ const [x, y] = ps[i], [a, b] = ps[i + 1]; d += `Q${n(x)} ${n(y)} ${n((x + a) / 2)} ${n((y + b) / 2)}`; }
    const u = ps.at(-1); d += `L${n(u[0])} ${n(u[1])}`;
    return d;
  };
  const w = n(x1 - x0), h = n(y1 - y0);
  const cuerpo = usados.map((t) => `<path d="${camino(t.puntos)}" stroke="${t.color}" stroke-width="${t.grosor}"/>`).join('');
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${n(x0)} ${n(y0)} ${w} ${h}" fill="none" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`, w, h };
}
/* SVG → PNG de hasta `max` px en el lado mayor, con fondo transparente. */
export async function svgAPng(svgTexto, w, h, max = 1024){
  const url = URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml' }));
  try{
    const img = await IA.cargar(url);
    const esc = max / Math.max(w, h);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * esc)); cv.height = Math.max(1, Math.round(h * esc));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const b = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
    return { bytes: new Uint8Array(await b.arrayBuffer()), mime: 'image/png', ancho: cv.width, alto: cv.height };
  }finally{ URL.revokeObjectURL(url); }
}

/* El lienzo para dibujar. Devuelve { nodo, trazos(), deshacer(), limpiar() }. */
export function lienzoDibujo({ color = () => '#AC27FF', grosor = () => 8, alCambiar = () => {} } = {}){
  const cv = document.createElement('canvas');
  cv.className = 'dibujo';
  const trazos = [];
  let actual = null;
  const ctx = cv.getContext('2d');
  const medir = () => {
    const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
    if(!r.width) return;
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    pintar();
  };
  const pintar = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for(const t of trazos){
      ctx.strokeStyle = t.color; ctx.lineWidth = t.grosor;
      ctx.beginPath();
      t.puntos.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      if(t.puntos.length === 1) ctx.lineTo(t.puntos[0][0] + 0.01, t.puntos[0][1]);
      ctx.stroke();
    }
  };
  const punto = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); actual = { color: color(), grosor: grosor(), puntos: [punto(e)] }; trazos.push(actual); pintar(); });
  cv.addEventListener('pointermove', (e) => {
    if(!actual) return;
    const p = punto(e), u = actual.puntos.at(-1);
    if(Math.hypot(p[0] - u[0], p[1] - u[1]) < 1.5) return;
    actual.puntos.push(p); pintar();
  });
  const soltar = () => { if(actual){ actual = null; alCambiar(); } };
  cv.addEventListener('pointerup', soltar);
  cv.addEventListener('pointercancel', soltar);
  new ResizeObserver(medir).observe(cv);
  return { nodo: cv, trazos: () => trazos, deshacer: () => { trazos.pop(); pintar(); alCambiar(); }, limpiar: () => { trazos.length = 0; pintar(); alCambiar(); } };
}

/* ══ ICONO CON IA ══ */
export const ESTILOS_IA = [
  ['plano', 'Plano', 'flat vector icon, solid colors, simple shapes, no gradients'],
  ['linea', 'De línea', 'minimal line icon, uniform stroke, no fill, monoline'],
  ['3d', '3D suave', 'soft 3D clay style icon, gentle shading, rounded'],
  ['ilustracion', 'Ilustración', 'friendly flat illustration, a few colors'],
];
export function promptIcono(que, estilo, color){
  const e = (ESTILOS_IA.find((x) => x[0] === estilo) || ESTILOS_IA[0])[2];
  return `${e}. Subject: ${que}. Main color ${color}. Centered, fills most of the frame, isolated on a pure white (#FFFFFF) background, no shadow on the background, no text, no letters, no watermark, no frame.`;
}
/* Quita el fondo casi blanco que TOCA las orillas (relleno por inundación),
   con borde suave. El blanco de adentro del dibujo no se toca. */
export async function quitarFondo(bytes, mime = 'image/png', { tolerancia = 38 } = {}){
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  try{
    const img = await IA.cargar(url);
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const im = c.getImageData(0, 0, W, H), px = im.data;
    const dist = (i) => { const r = 255 - px[i], g = 255 - px[i + 1], b = 255 - px[i + 2]; return Math.sqrt(r * r + g * g + b * b); };
    const visto = new Uint8Array(W * H), fila = new Int32Array(W * H);
    let a = 0, z = 0;
    const meter = (x, y) => { const k = y * W + x; if(visto[k]) return; visto[k] = 1; if(dist(k * 4) <= tolerancia * 2) fila[z++] = k; };
    for(let x = 0; x < W; x++){ meter(x, 0); meter(x, H - 1); }
    for(let y = 0; y < H; y++){ meter(0, y); meter(W - 1, y); }
    while(a < z){
      const k = fila[a++], x = k % W, y = (k / W) | 0, d = dist(k * 4);
      // Cerca del blanco: transparente; en la orilla del dibujo, a medias.
      px[k * 4 + 3] = d <= tolerancia ? 0 : Math.round(255 * Math.min(1, (d - tolerancia) / tolerancia));
      if(d > tolerancia) continue;           // no se sigue por dentro del dibujo
      if(x > 0) meter(x - 1, y); if(x < W - 1) meter(x + 1, y); if(y > 0) meter(x, y - 1); if(y < H - 1) meter(x, y + 1);
    }
    c.putImageData(im, 0, 0);
    // Se recorta a lo que quedó visible, con un poco de aire.
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(px[(y * W + x) * 4 + 3] > 16){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    if(x1 < 0) throw new Error('La imagen salió vacía.');
    const pad = Math.round(Math.max(W, H) * 0.02);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    const b = await new Promise((ok) => out.toBlob(ok, 'image/png'));
    return { bytes: new Uint8Array(await b.arrayBuffer()), mime: 'image/png', ancho: out.width, alto: out.height };
  }finally{ URL.revokeObjectURL(url); }
}
