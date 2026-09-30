/* ══════════════════════════════════════════════════════════════════════════
   QUITAR EL FONDO · una pieza que sirve en Presentaciones, el banco y Reportes
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «una función para quitar fondos que pueda seleccionar por croma o
   trazar con el dedo la figura que quiero que se quede, y que al abrir la
   imagen haga una selección automática de lo que considere central, como los
   stickers de WhatsApp o el recorte mágico de Paint 3D o remove.bg».

   Tres maneras, y se combinan:
   · AUTOMÁTICO · el modelo «magic touch» de MediaPipe (Google, Apache 2.0)
     corre DENTRO del teléfono: se le da un punto y separa el objeto que hay
     ahí. Al abrir se toca solo el centro. Tocar otra cosa la suma (o la
     quita). Copiado en vendor/mediapipe: se baja una vez y queda guardado,
     sin depender de ningún servicio (regla §2).
   · POR COLOR · se toca un color y se vuelve transparente, sólo la zona que
     toca o en toda la imagen, con su tolerancia.
   · CON EL DEDO · se traza el contorno de lo que se queda y lo de afuera se
     borra (o al revés).
   Si el modelo no carga —sin internet la primera vez, o un teléfono viejo—, lo
   automático cae a un plan B que toma el color de las orillas como fondo.

   Uso:  const r = await recortar(blob | {bytes, mime} | url, { recortarAlContenido })
         → { bytes, mime:'image/png', ancho, alto }  ·  null si se canceló
   ═════════════════════════════════════════════════════════════════════════ */
const AQUI = new URL('.', import.meta.url).href;
const MAX = 1600;             // lado mayor con el que se trabaja; se exporta al tamaño original

/* ── el modelo, una sola vez por visita ── */
let segmentador = null, cargando = null;
export function cargarModelo(){
  if(segmentador) return Promise.resolve(segmentador);
  if(cargando) return cargando;
  cargando = (async () => {
    const { InteractiveSegmenterLegacy, FilesetResolver } = await import(AQUI + 'vendor/mediapipe/vision_bundle.mjs');
    const fs = await FilesetResolver.forVisionTasks(AQUI + 'vendor/mediapipe/wasm');
    /* «Legacy» y no el nuevo: el nuevo exige el paquete interactive_segmentation.task,
       que no está publicado; con magic_touch.tflite el nuevo truena al crearse. */
    segmentador = await InteractiveSegmenterLegacy.createFromOptions(fs, {
      baseOptions: { modelAssetPath: AQUI + 'vendor/mediapipe/magic_touch.tflite', delegate: 'CPU' },
      outputCategoryMask: false, outputConfidenceMasks: true,
    });
    return segmentador;
  })();
  cargando.catch(() => { cargando = null; });
  return cargando;
}

/* ── lo que se puede probar sin pantalla ── */
/* confianza (0-1) → alfa (0-255), con el borde suave entre .3 y .7 */
export function alfaDeConfianza(conf){
  const a = new Uint8ClampedArray(conf.length);
  for(let i = 0; i < conf.length; i++) a[i] = Math.round(255 * Math.min(1, Math.max(0, (conf[i] - 0.3) / 0.4)));
  return a;
}
/* Plan B de lo automático: el fondo es lo que se parece al color de las
   orillas y se toca con ellas. Sirve bien con fondos lisos. */
export function fondoPorOrillas(px, W, H, tol = 42){
  const orilla = [];
  for(let x = 0; x < W; x += Math.max(1, W >> 6)){ orilla.push((0 * W + x) * 4, ((H - 1) * W + x) * 4); }
  for(let y = 0; y < H; y += Math.max(1, H >> 6)){ orilla.push((y * W) * 4, (y * W + W - 1) * 4); }
  const mediana = (k) => { const v = orilla.map((i) => px[i + k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const ref = [mediana(0), mediana(1), mediana(2)];
  const m = new Uint8ClampedArray(W * H).fill(255);
  const visto = new Uint8Array(W * H), fila = new Int32Array(W * H);
  let a = 0, z = 0;
  const d = (k) => { const i = k * 4; return Math.hypot(px[i] - ref[0], px[i + 1] - ref[1], px[i + 2] - ref[2]); };
  const meter = (k) => { if(visto[k]) return; visto[k] = 1; if(d(k) <= tol * 1.5) fila[z++] = k; };
  for(let x = 0; x < W; x++){ meter(x); meter((H - 1) * W + x); }
  for(let y = 0; y < H; y++){ meter(y * W); meter(y * W + W - 1); }
  while(a < z){
    const k = fila[a++], x = k % W, dist = d(k);
    m[k] = dist <= tol ? 0 : Math.round(255 * Math.min(1, (dist - tol) / (tol * 0.5)));
    if(dist > tol) continue;
    if(x > 0) meter(k - 1); if(x < W - 1) meter(k + 1); if(k >= W) meter(k - W); if(k < W * (H - 1)) meter(k + W);
  }
  return m;
}
/* Por color: vuelve transparente lo parecido al color tocado. `juntos` = sólo
   lo conectado con el punto; si no, en toda la imagen. Devuelve la máscara
   nueva (nunca devuelve lo que ya se había quitado). */
export function quitarColor(px, W, H, mascara, x0, y0, tol, juntos){
  const i0 = (y0 * W + x0) * 4, ref = [px[i0], px[i0 + 1], px[i0 + 2]];
  const suave = Math.max(4, tol * 0.5), m = mascara.slice();
  const f = (k) => { const i = k * 4; const d = Math.hypot(px[i] - ref[0], px[i + 1] - ref[1], px[i + 2] - ref[2]); return d <= tol ? 0 : d >= tol + suave ? 1 : (d - tol) / suave; };
  if(!juntos){
    for(let k = 0; k < W * H; k++){ const v = f(k); if(v < 1) m[k] = Math.min(m[k], Math.round(255 * v)); }
    return m;
  }
  const visto = new Uint8Array(W * H), fila = new Int32Array(W * H);
  let a = 0, z = 0;
  const meter = (k) => { if(visto[k]) return; visto[k] = 1; if(f(k) < 1) fila[z++] = k; };
  meter(y0 * W + x0);
  while(a < z){
    const k = fila[a++], x = k % W, v = f(k);
    m[k] = Math.min(m[k], Math.round(255 * v));
    if(v > 0) continue;                  // en la orilla se suaviza, pero no se sigue
    if(x > 0) meter(k - 1); if(x < W - 1) meter(k + 1); if(k >= W) meter(k - W); if(k < W * (H - 1)) meter(k + W);
  }
  return m;
}
/* suaviza el borde: caja separable de radio r (0 = nada) */
export function suavizar(m, W, H, r){
  if(!r) return m;
  const t = new Float32Array(W * H), o = new Uint8ClampedArray(W * H), n = 2 * r + 1;
  for(let y = 0; y < H; y++){ let s = 0; for(let x = -r; x <= r; x++) s += m[y * W + Math.min(W - 1, Math.max(0, x))];
    for(let x = 0; x < W; x++){ t[y * W + x] = s / n; s += m[y * W + Math.min(W - 1, x + r + 1)] - m[y * W + Math.max(0, x - r)]; } }
  for(let x = 0; x < W; x++){ let s = 0; for(let y = -r; y <= r; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x];
    for(let y = 0; y < H; y++){ o[y * W + x] = s / n; s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
  return o;
}

/* ── la pantalla ── */
const CSS = `
/* Es un <dialog> abierto con showModal(): así queda en la capa de encima aunque
   lo llamen desde otro diálogo abierto (el editor de láminas lo es). Con un
   div de z-index enorme quedaba DEBAJO del editor y «Listo» no se podía tocar. */
.rc{position:fixed; inset:0; z-index:2147483000; background:#0B0710; color:#EDEAF2; display:flex; flex-direction:column;
  width:100%; height:100%; max-width:none; max-height:none; margin:0; border:0; overflow:hidden;
  font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.rc *{box-sizing:border-box}
.rc::backdrop{background:#0B0710}
.rc-barra{display:flex; align-items:center; gap:8px; padding:10px 12px}
.rc-barra h2{flex:1; margin:0; font-size:17px; text-align:center}
.rc button{font:inherit; color:inherit; background:#1E1428; border:1px solid #3A2C4A; border-radius:12px; min-height:44px; padding:0 14px; cursor:pointer}
.rc button.rc-si{background:#AC27FF; border-color:#AC27FF; color:#fff; font-weight:700}
.rc button[aria-pressed="true"]{background:#3A1F55; border-color:#AC27FF}
.rc button:disabled{opacity:.5}
.rc-lienzo{flex:1; min-height:0; position:relative; display:grid; place-items:center; overflow:hidden; touch-action:none;
  background-color:#fff; background-image:linear-gradient(45deg,#D9DCE3 25%,transparent 25%,transparent 75%,#D9DCE3 75%),linear-gradient(45deg,#D9DCE3 25%,transparent 25%,transparent 75%,#D9DCE3 75%);
  background-size:20px 20px; background-position:0 0,10px 10px}
.rc-lienzo canvas{max-width:100%; max-height:100%; display:block; image-rendering:auto}
.rc-estado{position:absolute; left:50%; bottom:12px; transform:translateX(-50%); background:rgba(11,7,16,.86); color:#fff;
  padding:8px 14px; border-radius:999px; font-size:14px; white-space:nowrap; max-width:92%; overflow:hidden; text-overflow:ellipsis; pointer-events:none}
.rc-estado:empty{display:none}
.rc-modos{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; padding:10px 12px 0}
.rc-modos button{white-space:nowrap; padding:0 6px; overflow:hidden; text-overflow:ellipsis}
.rc-panel > button{flex:1 1 40%; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 8px}
.rc-panel{padding:6px 12px 2px; display:flex; flex-wrap:wrap; gap:6px 8px; align-items:center}
.rc-panel p{margin:0; flex:1 1 100%; font-size:13px; color:#B9B0C6}
.rc-panel label{display:flex; align-items:center; gap:8px; flex:1 1 180px; font-size:14px}
.rc-panel input[type=range]{flex:1; min-width:0; accent-color:#AC27FF; height:44px}
.rc-pie{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; padding:6px 12px 12px}
.rc-pie button{white-space:nowrap; padding:0 6px; overflow:hidden; text-overflow:ellipsis}
`;
function h(tag, props = {}, ...hijos){
  const el = document.createElement(tag);
  for(const [k, v] of Object.entries(props)){
    if(k === 'on') for(const [e, f] of Object.entries(v)) el.addEventListener(e, f);
    else if(k === 'class') el.className = v;
    else if(v === true) el.setAttribute(k, '');
    else if(v !== false && v != null) el.setAttribute(k, v);
  }
  for(const x of hijos.flat()) if(x != null && x !== false) el.append(x);
  return el;
}
async function aImagen(fuente){
  let url, propia = false;
  if(typeof fuente === 'string') url = fuente;
  else { url = URL.createObjectURL(fuente instanceof Blob ? fuente : new Blob([fuente.bytes], { type: fuente.mime || 'image/png' })); propia = true; }
  try{ const im = new Image(); im.decoding = 'async'; im.src = url; await im.decode(); return im; }
  finally{ if(propia) setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

export async function recortar(fuente, { recortarAlContenido = true, titulo = 'Quitar el fondo' } = {}){
  const img = await aImagen(fuente);
  const OW = img.naturalWidth, OH = img.naturalHeight;
  const k = Math.min(1, MAX / Math.max(OW, OH));
  const W = Math.max(1, Math.round(OW * k)), H = Math.max(1, Math.round(OH * k));
  const base = h('canvas'); base.width = W; base.height = H;
  const bx = base.getContext('2d', { willReadFrequently: true }); bx.drawImage(img, 0, 0, W, H);
  const px = bx.getImageData(0, 0, W, H).data;

  if(!document.getElementById('rc-estilo')) document.head.append(h('style', { id: 'rc-estilo' }, CSS));
  let mascara = new Uint8ClampedArray(W * H).fill(255);
  const historia = [];
  let modo = 'auto', sumar = true, juntos = true, tol = 40, suave = 1, dentro = true;

  const vista = h('canvas', { 'aria-label': 'La imagen; toca o traza sobre ella' }); vista.width = W; vista.height = H;
  const vx = vista.getContext('2d');
  const estado = h('div', { class: 'rc-estado', role: 'status' });
  const lienzo = h('div', { class: 'rc-lienzo' }, vista, estado);
  const panel = h('div', { class: 'rc-panel' });
  const botonModo = (id, tx) => h('button', { type: 'button', 'data-modo': id, 'aria-pressed': String(id === modo), on: { click: () => { modo = id; pintarPanel(); } } }, tx);
  const modos = h('div', { class: 'rc-modos', role: 'group', 'aria-label': 'Cómo quitar el fondo' },
    botonModo('auto', '✦ Automático'), botonModo('color', 'Por color'), botonModo('dedo', 'Con el dedo'));
  const deshacer = h('button', { type: 'button', disabled: true, on: { click: () => { if(historia.length){ mascara = historia.pop(); pintar(); } } } }, '↶ Deshacer');
  const guardarPaso = () => { historia.push(mascara); if(historia.length > 25) historia.shift(); deshacer.disabled = false; };
  const cambiar = (nueva) => { guardarPaso(); mascara = nueva; pintar(); };

  let terminar;
  const fin = new Promise((ok) => { terminar = ok; });
  const raiz = h('dialog', { class: 'rc', 'aria-label': titulo },
    h('div', { class: 'rc-barra' },
      h('button', { type: 'button', on: { click: () => terminar(null) } }, 'Cancelar'),
      h('h2', {}, titulo),
      h('button', { type: 'button', class: 'rc-si', 'data-listo': true, on: { click: () => terminar('listo') } }, 'Listo')),
    lienzo, modos, panel,
    h('div', { class: 'rc-pie' }, deshacer,
      h('button', { type: 'button', on: { click: () => cambiar(mascara.map((v) => 255 - v)) } }, '⇄ Invertir'),
      h('button', { type: 'button', on: { click: () => cambiar(new Uint8ClampedArray(W * H).fill(255)) } }, '↺ Original')));
  document.body.append(raiz);
  if(raiz.showModal) raiz.showModal(); else raiz.setAttribute('open', '');
  const onKey = (e) => { e.preventDefault(); terminar(null); };      // Escape en un diálogo = «cancel»
  raiz.addEventListener('cancel', onKey);

  /* ── pintar: la imagen con la máscara encima, sobre el cuadriculado ── */
  let cuadro = 0;
  function pintar(){
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      const m = suavizar(mascara, W, H, suave);
      const d = vx.createImageData(W, H), o = d.data;
      for(let i = 0, j = 0; i < W * H; i++, j += 4){ o[j] = px[j]; o[j + 1] = px[j + 1]; o[j + 2] = px[j + 2]; o[j + 3] = m[i] * px[j + 3] / 255; }
      vx.putImageData(d, 0, 0);
      if(trazo.length > 1){
        vx.save(); vx.lineWidth = Math.max(2, W / 220); vx.strokeStyle = '#AC27FF'; vx.setLineDash([vx.lineWidth * 3, vx.lineWidth * 2]);
        vx.beginPath(); trazo.forEach(([x, y], n) => n ? vx.lineTo(x, y) : vx.moveTo(x, y)); vx.stroke(); vx.restore();
      }
    });
  }

  function pintarPanel(){
    modos.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
    const rango = (et, min, max, val, al) => h('label', {}, et, h('input', { type: 'range', min, max, value: val, on: { input: (e) => al(+e.target.value) } }));
    const par = (a, b, v, al) => [
      h('button', { type: 'button', 'aria-pressed': String(v), on: { click: () => { al(true); pintarPanel(); } } }, a),
      h('button', { type: 'button', 'aria-pressed': String(!v), on: { click: () => { al(false); pintarPanel(); } } }, b)];
    const suaveR = rango('Borde suave', 0, 6, suave, (v) => { suave = v; pintar(); });
    if(modo === 'auto') panel.replaceChildren(
      h('p', {}, 'Toca lo que quieres dejar. ＋ suma lo que toques; － lo quita.'),
      ...par('＋ Sumar', '－ Quitar', sumar, (v) => { sumar = v; }),
      h('button', { type: 'button', on: { click: () => automatico(0.5, 0.5, 'nuevo') } }, '✦ Detectar otra vez'), suaveR);
    else if(modo === 'color') panel.replaceChildren(
      h('p', {}, 'Toca el color que quieres volver transparente.'),
      ...par('Sólo esa zona', 'En toda la imagen', juntos, (v) => { juntos = v; }),
      rango('Tolerancia', 4, 140, tol, (v) => { tol = v; }), suaveR);
    else panel.replaceChildren(
      h('p', {}, dentro ? 'Traza con el dedo el contorno de lo que se queda. Lo de afuera se borra.' : 'Traza con el dedo lo que quieres borrar.'),
      ...par('Adentro se queda', 'Adentro se borra', dentro, (v) => { dentro = v; }), suaveR);
  }

  /* ── automático ── */
  async function automatico(nx, ny, como){
    estado.textContent = segmentador ? 'Buscando…' : 'Cargando el recorte automático (la primera vez tarda)…';
    try{
      const s = await cargarModelo();
      let conf;
      s.segment(base, { keypoint: { x: nx, y: ny } }, (r) => { conf = r.confidenceMasks[0].getAsFloat32Array().slice(); r.close?.(); });
      const a = alfaDeConfianza(conf);
      let area = 0; for(const v of a) if(v > 127) area++;
      const frac = area / (W * H);
      if(como === 'nuevo' && (frac < 0.01 || frac > 0.985)){ cambiar(fondoPorOrillas(px, W, H)); estado.textContent = 'No encontré un objeto claro: quité el color de las orillas.'; }
      else if(como === 'nuevo') cambiar(a);
      else if(como === 'sumar'){ const m = mascara.slice(); for(let i = 0; i < m.length; i++) if(a[i] > m[i]) m[i] = a[i]; cambiar(m); }
      else { const m = mascara.slice(); for(let i = 0; i < m.length; i++) m[i] = Math.min(m[i], 255 - a[i]); cambiar(m); }
      if(estado.textContent.startsWith('Buscando') || estado.textContent.startsWith('Cargando')) estado.textContent = '';
    }catch(e){
      if(como === 'nuevo') cambiar(fondoPorOrillas(px, W, H));
      estado.textContent = 'Sin el recorte automático (' + (e && e.message ? e.message.slice(0, 60) : 'no cargó') + '): usé el color de las orillas.';
    }
    setTimeout(() => { if(!/^(Buscando|Cargando)/.test(estado.textContent)) estado.textContent = ''; }, 4000);
  }

  /* ── el dedo sobre la imagen ── */
  const aImg = (e) => { const r = vista.getBoundingClientRect();
    return [Math.min(W - 1, Math.max(0, (e.clientX - r.left) / r.width * W)), Math.min(H - 1, Math.max(0, (e.clientY - r.top) / r.height * H))]; };
  let trazo = [], abajo = null;
  vista.addEventListener('pointerdown', (e) => { e.preventDefault(); vista.setPointerCapture(e.pointerId); abajo = aImg(e); trazo = modo === 'dedo' ? [abajo] : []; });
  vista.addEventListener('pointermove', (e) => { if(!abajo || modo !== 'dedo') return; trazo.push(aImg(e)); pintar(); });
  vista.addEventListener('pointerup', (e) => {
    if(!abajo) return;
    const [x, y] = aImg(e); const toque = Math.hypot(x - abajo[0], y - abajo[1]) < W / 60;
    abajo = null;
    if(modo === 'auto' && toque) automatico(x / W, y / H, sumar ? 'sumar' : 'quitar');
    else if(modo === 'color' && toque) cambiar(quitarColor(px, W, H, mascara, Math.round(x), Math.round(y), tol, juntos));
    else if(modo === 'dedo' && trazo.length > 4){
      const c = h('canvas'); c.width = W; c.height = H; const x2 = c.getContext('2d', { willReadFrequently: true });
      x2.beginPath(); trazo.forEach(([a, b], n) => n ? x2.lineTo(a, b) : x2.moveTo(a, b)); x2.closePath(); x2.fillStyle = '#000'; x2.fill();
      const p = x2.getImageData(0, 0, W, H).data, m = mascara.slice();
      /* adentro se queda TAL CUAL la imagen (aunque antes se hubiera quitado);
         lo de afuera se borra. O al revés con «se borra lo de adentro». */
      for(let i = 0; i < W * H; i++){ const a = p[i * 4 + 3]; m[i] = dentro ? a : Math.min(m[i], 255 - a); }
      trazo = []; cambiar(m);
    } else { trazo = []; pintar(); }
  });

  /* que la imagen llene su espacio aunque sea chica (y el dedo tenga dónde trazar) */
  const ajustar = () => {
    const r = lienzo.getBoundingClientRect(), e = Math.min((r.width - 16) / W, (r.height - 16) / H);
    if(e > 0){ vista.style.width = Math.floor(W * e) + 'px'; vista.style.height = Math.floor(H * e) + 'px'; }
  };
  const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustar) : null;
  if(obs) obs.observe(lienzo); else addEventListener('resize', ajustar);
  pintarPanel(); pintar(); ajustar();
  automatico(0.5, 0.5, 'nuevo');       // la selección automática, sola, al abrir

  const r = await fin;
  raiz.removeEventListener('cancel', onKey);
  if(obs) obs.disconnect(); else removeEventListener('resize', ajustar);
  if(!r){ raiz.remove(); return null; }
  estado.textContent = 'Guardando…';
  /* a tamaño original: la máscara se estira al tamaño de la imagen original */
  const m = suavizar(mascara, W, H, suave);
  const mc = h('canvas'); mc.width = W; mc.height = H;
  const md = mc.getContext('2d').createImageData(W, H);
  for(let i = 0; i < W * H; i++){ md.data[i * 4 + 3] = m[i]; }
  mc.getContext('2d').putImageData(md, 0, 0);
  const out = h('canvas'); out.width = OW; out.height = OH;
  const ox = out.getContext('2d');
  ox.drawImage(img, 0, 0, OW, OH);
  ox.globalCompositeOperation = 'destination-in';
  ox.imageSmoothingQuality = 'high';
  ox.drawImage(mc, 0, 0, OW, OH);
  let final = out;
  if(recortarAlContenido){
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(m[y * W + x] > 8){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    if(x1 >= 0){
      const s = OW / W, pad = Math.round(Math.max(OW, OH) * 0.015);
      const X0 = Math.max(0, Math.floor(x0 * s) - pad), Y0 = Math.max(0, Math.floor(y0 * s) - pad);
      const X1 = Math.min(OW, Math.ceil((x1 + 1) * s) + pad), Y1 = Math.min(OH, Math.ceil((y1 + 1) * s) + pad);
      final = h('canvas'); final.width = X1 - X0; final.height = Y1 - Y0;
      final.getContext('2d').drawImage(out, X0, Y0, X1 - X0, Y1 - Y0, 0, 0, X1 - X0, Y1 - Y0);
    }
  }
  const blob = await new Promise((ok) => final.toBlob(ok, 'image/png'));
  raiz.remove();
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: 'image/png', ancho: final.width, alto: final.height, blob };
}
