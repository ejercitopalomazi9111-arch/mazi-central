/* ═══════════════════════════════════════════════════════════════════════════
   CARTELES · RECORTE EN LOTE — quitar el fondo a muchas fotos sin tocarlas
   ───────────────────────────────────────────────────────────────────────────
   El mismo recorte de Presentaciones (MediaPipe «magic touch», en el teléfono,
   sin servidor), pero sin pantalla: se toca solo en los puntos donde suele
   estar la prenda según su categoría, se afina el borde con los colores de la
   foto y se tiran las manchas sueltas.

   Lo que se aprendió con las 129 de All's fashion:
     · una sudadera en maniquí sale perfecta tocando el pecho y la capucha;
     · los tenis van en par: tres toques (centro y los dos zapatos);
     · un pantalón sobre mármol se lleva el mármol: el recorte que toca la
       orilla de la foto en buena parte de su contorno es fondo que se quedó,
       y entonces se usa la foto completa (malo: true);
     · las fotos de muchas cosas (repisas, playeras dobladas en fila) no se
       recortan: se lucen enteras.
   ═══════════════════════════════════════════════════════════════════════════ */
const MAX = 1400;

const PUNTOS = {
  tenis: [[.5, .5], [.38, .46], [.62, .56]], zapatos: [[.5, .5], [.38, .46], [.62, .56]], sandalias: [[.5, .5], [.38, .46], [.62, .56]],
  sudadera: [[.5, .55], [.5, .35]], chamarra: [[.5, .55], [.5, .35]], playera: [[.5, .5], [.5, .32]], camisa: [[.5, .5], [.5, .32]], polo: [[.5, .5], [.5, .32]], blusa: [[.5, .5], [.5, .32]], vestido: [[.5, .45], [.5, .7]],
  pantalon: [[.5, .5], [.5, .3], [.5, .72]], botas: [[.5, .5], [.4, .45], [.6, .55]],
};
/** ¿Esta foto es de muchas cosas (no se recorta)? Por lo que dice de ella. */
export function esDeMuchas(texto) {
  return /\b(varias|varios|organizad|exhibici|estante|anaquel|repisa|bodega|fila[s]?|montón|monton|coleccion de|mesa con|muestrario|tienda|seis|tres|cuatro|cinco)\b/i.test(String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, ''));
}

let rec = null;
async function modulo() { return rec ||= await import('../presentaciones/recorte.js'); }

/** Imagen (blob o Image) → lienzo de trabajo de ≤MAX px. */
export async function aLienzo(fuente, max = MAX) {
  const bm = fuente instanceof Blob ? await createImageBitmap(fuente) : fuente;
  const w = bm.naturalWidth || bm.width, h = bm.naturalHeight || bm.height, e = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * e); c.height = Math.round(h * e);
  c.getContext('2d', { willReadFrequently: true }).drawImage(bm, 0, 0, c.width, c.height);
  if (bm.close) bm.close();
  return c;
}

/* Componentes conectados: se quedan los grandes (≥8 % del mayor); lo demás era fondo. */
function soloLoGrande(m, W, H) {
  const et = new Int32Array(W * H), tam = [0]; let n = 0; const pila = [];
  for (let i = 0; i < W * H; i++) {
    if (m[i] < 60 || et[i]) continue;
    n++; tam.push(0); et[i] = n; pila.push(i);
    while (pila.length) {
      const k = pila.pop(); tam[n]++; const x = k % W, y = (k / W) | 0;
      if (x > 0 && !et[k - 1] && m[k - 1] >= 60) { et[k - 1] = n; pila.push(k - 1); }
      if (x < W - 1 && !et[k + 1] && m[k + 1] >= 60) { et[k + 1] = n; pila.push(k + 1); }
      if (y > 0 && !et[k - W] && m[k - W] >= 60) { et[k - W] = n; pila.push(k - W); }
      if (y < H - 1 && !et[k + W] && m[k + W] >= 60) { et[k + W] = n; pila.push(k + W); }
    }
  }
  if (n <= 1) return m;
  const mayor = Math.max(...tam), quedan = tam.map(t => t >= mayor * .08);
  const o = new Uint8ClampedArray(m.length);
  // se queda lo grande y su borde suave (3 px alrededor)
  for (let i = 0; i < m.length; i++) if (quedan[et[i]] && et[i]) o[i] = m[i];
  for (let pasada = 0; pasada < 3; pasada++) for (let i = 0; i < m.length; i++) if (!o[i] && m[i] && m[i] < 60) {
    const x = i % W; if ((x > 0 && o[i - 1] >= 60) || (x < W - 1 && o[i + 1] >= 60) || (i >= W && o[i - W] >= 60) || (i + W < m.length && o[i + W] >= 60)) o[i] = m[i];
  }
  return o;
}

/**
 * Quita el fondo. Devuelve { blob (PNG transparente, recortado al contenido), frac, orilla, malo }.
 * malo = el recorte no sirve (se comió el fondo o no encontró nada): usar la foto completa.
 */
export async function recortarAuto(fuente, cat = 'producto') {
  const { cargarModelo, alfaDeConfianza, afinar, suavizar, descontaminar } = await modulo();
  const s = await cargarModelo();
  const base = await aLienzo(fuente), W = base.width, H = base.height;
  const px = base.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  let m = null;
  for (const [x, y] of PUNTOS[cat] || [[.5, .5]]) {
    let conf; s.segment(base, { keypoint: { x, y } }, (r) => { conf = r.confidenceMasks[0].getAsFloat32Array().slice(); r.close?.(); });
    const a = afinar(px, W, H, alfaDeConfianza(conf)).mascara;
    if (!m) m = a.slice(); else for (let i = 0; i < m.length; i++) if (a[i] > m[i]) m[i] = a[i];
  }
  m = soloLoGrande(m, W, H);
  let area = 0; for (const v of m) if (v > 127) area++;
  // ¿cuánto del contorno de la foto quedó opaco? (fondo que se quedó)
  let orilla = 0, total = 0;
  for (let x = 0; x < W; x += 2) { total += 2; if (m[x] > 127) orilla++; if (m[(H - 1) * W + x] > 127) orilla++; }
  for (let y = 0; y < H; y += 2) { total += 2; if (m[y * W] > 127) orilla++; if (m[y * W + W - 1] > 127) orilla++; }
  const frac = area / (W * H), fOrilla = orilla / total;
  const lado = (f) => { let n = 0, t = 0; f((i) => { t++; if (m[i] > 127) n++; }); return n / t; };
  const lados = [lado(cb => { for (let x = 0; x < W; x += 2) cb(x); }), lado(cb => { for (let x = 0; x < W; x += 2) cb((H - 1) * W + x); }),
    lado(cb => { for (let y = 0; y < H; y += 2) cb(y * W); }), lado(cb => { for (let y = 0; y < H; y += 2) cb(y * W + W - 1); })];
  /* ¿lo que se quedó se parece a lo que se quitó? Si una buena parte sí, se quedó fondo (el mármol). */
  const fuera = [[], [], []];
  for (let i = 0; i < W * H; i += 7) if (m[i] < 30) { fuera[0].push(px[i * 4]); fuera[1].push(px[i * 4 + 1]); fuera[2].push(px[i * 4 + 2]); }
  let pareceFondo = 0;
  if (fuera[0].length > 50) {
    const med = fuera.map(a => a.sort((x, y) => x - y)[a.length >> 1]);
    let n = 0, t = 0;
    for (let i = 0; i < W * H; i += 5) if (m[i] > 200) { t++; if (Math.abs(px[i * 4] - med[0]) + Math.abs(px[i * 4 + 1] - med[1]) + Math.abs(px[i * 4 + 2] - med[2]) < 45) n++; }
    pareceFondo = t ? n / t : 0;
  }
  /* lo que va acostado sobre una mesa (pantalón, short) casi nunca llena la foto: si «llenó» más de
     70 %, se llevó la mesa. Una sudadera en maniquí sí la llena y está bien. */
  const acostado = ['pantalon', 'short', 'cinturon'].includes(cat) && frac > .7;
  const malo = frac < .03 || frac > .9 || pareceFondo > .2 || acostado;
  const ms = suavizar(m, W, H, 1), rgb = descontaminar(px, W, H, ms);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const d = g.createImageData(W, H), o = d.data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0, j = 0; i < W * H; i++, j += 4) {
    o[j] = rgb[j]; o[j + 1] = rgb[j + 1]; o[j + 2] = rgb[j + 2]; o[j + 3] = ms[i];
    if (ms[i] > 40) { const xx = i % W, yy = (i / W) | 0; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  }
  g.putImageData(d, 0, 0);
  if (x1 <= x0) return { blob: null, frac, orilla: fOrilla, malo: true };
  const p = 6; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(W - 1, x1 + p); y1 = Math.min(H - 1, y1 + p);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const blob = await new Promise(ok => out.toBlob(ok, 'image/png'));
  return { blob, frac, orilla: fOrilla, lados, pareceFondo, malo };
}

/** Achica una foto para trabajar (los carteles miden 1080: más de 1600 px sólo gasta memoria). */
export async function achicar(blob, max = 1600) {
  const c = await aLienzo(blob, max);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', .9));
}
