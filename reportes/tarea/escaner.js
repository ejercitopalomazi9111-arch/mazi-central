/* escaner.js — DE UNA FOTO DE UNA HOJA, UN ESCANEO (Carlos, 14 nov)
 * ===========================================================================
 * «Mejora la app de reportes para que pueda hacer eso mismo que tú hiciste»: lo de la tarea de física de Lorena,
 * que se hizo a mano con OpenCV en la computadora. Aquí corre en el teléfono, sin servidor y sin librerías:
 *
 *   detectarHoja(foto)   las 4 esquinas de la hoja de encima (lo blanco contra la mesa)
 *   enderezar(foto, q)   la hoja vista de frente, en carta a 200 ppp (1700 × 2200)
 *   limpiar(hoja, modo)  'escaneo'  papel blanco parejo, la tinta con su color y el lápiz reforzado
 *                        'color'    igual de blanco pero sin apagar el marcatextos (formularios)
 *                        'original' sólo enderezada
 *
 * Lo que se aprendió en la mesa y se quedó aquí:
 *   · el fondo NO es parejo (sombra del teléfono, papel curvo): se calcula el papel de cada zona y se divide,
 *     en vez de subir el contraste a lo bruto;
 *   · el lápiz es gris claro: con un umbral fijo desaparece; se refuerza con una curva (lo de Lorena salía
 *     deslavado hasta subirlo);
 *   · el plástico arrugado de la mesa deja manchas grises en las orillas: se blanquean SÓLO si no traen
 *     trazo oscuro (la primera versión se comía la «P» de «Problema 3»).
 * Sin DOM más allá de lo mínimo (lo que entra y sale son ImageData o canvas).
 * ===========================================================================*/
export const ANCHO = 1700, ALTO = 2200;   /* carta a 200 ppp */

const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const gris = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/* ── 1 · dónde está la hoja ───────────────────────────────────────────────── */
/* Otsu: el umbral que mejor parte lo claro (papel) de lo oscuro (mesa) */
function otsu(hist, total){
  let suma = 0; for(let i = 0; i < 256; i++) suma += i * hist[i];
  let sB = 0, wB = 0, mejor = 0, umbral = 128;
  for(let t = 0; t < 256; t++){
    wB += hist[t]; if(!wB) continue;
    const wF = total - wB; if(!wF) break;
    sB += t * hist[t];
    const mB = sB / wB, mF = (suma - sB) / wF, v = wB * wF * (mB - mF) ** 2;
    if(v > mejor){ mejor = v; umbral = t; }
  }
  return umbral;
}
/* devuelve [arribaIzq, arribaDer, abajoDer, abajoIzq] en coordenadas de la foto */
export function detectarHoja(foto){
  const lado = 420, k = Math.min(1, lado / Math.max(foto.width, foto.height));
  const w = Math.max(8, Math.round(foto.width * k)), h = Math.max(8, Math.round(foto.height * k));
  const c = lienzo(w, h), x = c.getContext('2d', { willReadFrequently: true });
  x.filter = 'blur(2px)'; x.drawImage(foto, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h), hist = new Uint32Array(256);
  for(let p = 0; p < w * h; p++){ const v = gris(d, p * 4) | 0; g[p] = v; hist[v]++; }
  const u = otsu(hist, w * h);
  /* la mancha clara más grande (el papel), sin la que toca toda la foto si la foto ES la hoja */
  const etiqueta = new Int32Array(w * h).fill(-1), cola = new Int32Array(w * h);
  let mejor = { n: 0, id: -1 }, id = 0;
  for(let s = 0; s < w * h; s++){
    if(g[s] <= u || etiqueta[s] >= 0) continue;
    let a = 0, b = 0; cola[b++] = s; etiqueta[s] = id;
    while(a < b){
      const p = cola[a++], px = p % w, py = (p / w) | 0;
      for(const q of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1]){
        if(q >= 0 && etiqueta[q] < 0 && g[q] > u){ etiqueta[q] = id; cola[b++] = q; }
      }
    }
    if(b > mejor.n) mejor = { n: b, id };
    id++;
  }
  if(mejor.n < w * h * 0.08) return completa(foto);   /* no hay hoja clara: toda la foto */
  /* las esquinas: los extremos de x+y y x−y de la mancha (aguanta hojas un poco giradas) */
  let tl = [0, 0, Infinity], br = [0, 0, -Infinity], tr = [0, 0, -Infinity], bl = [0, 0, Infinity];
  for(let p = 0; p < w * h; p++){
    if(etiqueta[p] !== mejor.id) continue;
    const px = p % w, py = (p / w) | 0, s = px + py, r = px - py;
    if(s < tl[2]) tl = [px, py, s]; if(s > br[2]) br = [px, py, s];
    if(r > tr[2]) tr = [px, py, r]; if(r < bl[2]) bl = [px, py, r];
  }
  const q = [tl, tr, br, bl].map(([px, py]) => [px / k, py / k]);
  /* un pelito hacia adentro, para no agarrar la orilla de la mesa */
  const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
  return q.map(([px, py]) => [px + (cx - px) * 0.008, py + (cy - py) * 0.008]);
}
export const completa = (foto) => [[0, 0], [foto.width, 0], [foto.width, foto.height], [0, foto.height]];
/* girar la hoja 90° a la derecha = recorrer las esquinas */
export const girarEsquinas = (q) => [q[3], q[0], q[1], q[2]];

/* ── 2 · de frente ───────────────────────────────────────────────────────── */
/* la homografía que lleva el rectángulo de salida a las 4 esquinas de la foto */
function homografia(q, W, H){
  const src = [[0, 0], [W, 0], [W, H], [0, H]], A = [], B = [];
  for(let i = 0; i < 4; i++){
    const [x, y] = src[i], [u, v] = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
  }
  /* Gauss con pivote */
  for(let i = 0; i < 8; i++){
    let m = i; for(let r = i + 1; r < 8; r++) if(Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]]; [B[i], B[m]] = [B[m], B[i]];
    for(let r = 0; r < 8; r++){
      if(r === i) continue; const f = A[r][i] / A[i][i];
      for(let c = i; c < 8; c++) A[r][c] -= f * A[i][c]; B[r] -= f * B[i];
    }
  }
  return B.map((b, i) => b / A[i][i]);
}
export function enderezar(foto, q, W = ANCHO, H = ALTO){
  const fw = foto.width, fh = foto.height;
  const fc = lienzo(fw, fh), fx = fc.getContext('2d', { willReadFrequently: true }); fx.drawImage(foto, 0, 0);
  const s = fx.getImageData(0, 0, fw, fh).data;
  const out = new ImageData(W, H), o = out.data;
  const [a, b, c, d, e, f, g, h] = homografia(q, W, H);
  for(let y = 0; y < H; y++){
    for(let x = 0; x < W; x++){
      const z = g * x + h * y + 1, u = (a * x + b * y + c) / z, v = (d * x + e * y + f) / z;
      const i = (y * W + x) * 4;
      if(u < 0 || v < 0 || u >= fw - 1 || v >= fh - 1){ o[i] = o[i + 1] = o[i + 2] = 255; o[i + 3] = 255; continue; }
      const x0 = u | 0, y0 = v | 0, dx = u - x0, dy = v - y0;
      const p00 = (y0 * fw + x0) * 4, p10 = p00 + 4, p01 = p00 + fw * 4, p11 = p01 + 4;
      for(let k = 0; k < 3; k++){
        o[i + k] = (s[p00 + k] * (1 - dx) + s[p10 + k] * dx) * (1 - dy) + (s[p01 + k] * (1 - dx) + s[p11 + k] * dx) * dy;
      }
      o[i + 3] = 255;
    }
  }
  return out;
}

/* ── 3 · limpio ─────────────────────────────────────────────────────────── */
/* el papel de cada zona: el máximo de cada cuadrito de 8 px (así la letra no cuenta), suavizado */
function fondoDe(img, B = 8){
  const W = img.width, H = img.height, d = img.data, w = Math.ceil(W / B), h = Math.ceil(H / B);
  let f = new Float32Array(w * h * 3);
  for(let by = 0; by < h; by++) for(let bx = 0; bx < w; bx++){
    let m0 = 0, m1 = 0, m2 = 0;
    for(let y = by * B; y < Math.min(H, by * B + B); y++) for(let x = bx * B; x < Math.min(W, bx * B + B); x++){
      const i = (y * W + x) * 4; if(d[i] > m0) m0 = d[i]; if(d[i + 1] > m1) m1 = d[i + 1]; if(d[i + 2] > m2) m2 = d[i + 2];
    }
    const j = (by * w + bx) * 3; f[j] = m0; f[j + 1] = m1; f[j + 2] = m2;
  }
  /* mediana chica para tumbar letras gordas (un renglón subrayado con marcador) y luego un promedio */
  const caja = (src, r) => {
    const out = new Float32Array(src.length);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) for(let k = 0; k < 3; k++){
      let s = 0, n = 0;
      for(let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) for(let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++){ s += src[(yy * w + xx) * 3 + k]; n++; }
      out[(y * w + x) * 3 + k] = s / n;
    }
    return out;
  };
  const maxi = (src, r) => {
    const out = new Float32Array(src.length);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) for(let k = 0; k < 3; k++){
      let m = 0;
      for(let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) for(let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++){ const v = src[(yy * w + xx) * 3 + k]; if(v > m) m = v; }
      out[(y * w + x) * 3 + k] = m;
    }
    return out;
  };
  f = caja(caja(maxi(f, 1), 2), 2);
  /* de vuelta al tamaño de la hoja, interpolando */
  return (x, y, k) => {
    const gx = Math.min(w - 1.001, Math.max(0, x / B - 0.5)), gy = Math.min(h - 1.001, Math.max(0, y / B - 0.5));
    const x0 = gx | 0, y0 = gy | 0, dx = gx - x0, dy = gy - y0, i = (y0 * w + x0) * 3 + k, j = i + w * 3;
    return (f[i] * (1 - dx) + f[i + 3] * dx) * (1 - dy) + (f[j] * (1 - dx) + f[j + 3] * dx) * dy;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export function limpiar(img, modo = 'escaneo'){
  if(modo === 'original') return img;
  const W = img.width, H = img.height, d = img.data, out = new ImageData(W, H), o = out.data;
  const fondo = fondoDe(img), n = W * H;
  /* 1 · la hoja dividida entre su papel: la sombra se va y queda sólo lo escrito */
  const R = new Float32Array(n * 3), L = new Float32Array(n);
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    const p = y * W + x, i = p * 4;
    for(let k = 0; k < 3; k++) R[p * 3 + k] = clamp(d[i + k] / Math.max(1, fondo(x, y, k)) * 255, 0, 255);
    L[p] = 0.299 * R[p * 3] + 0.587 * R[p * 3 + 1] + 0.114 * R[p * 3 + 2];
  }
  if(modo === 'color'){
    for(let p = 0; p < n; p++){
      const i = p * 4, m = (R[p * 3] + R[p * 3 + 1] + R[p * 3 + 2]) / 3;
      /* más contraste y un poco más de color, para que el marcatextos no se lave */
      const mv = clamp((m - 20) * 255 / 215, 0, 255);
      for(let k = 0; k < 3; k++){ const v = clamp((R[p * 3 + k] - 20) * 255 / 215, 0, 255); o[i + k] = clamp(v + (v - mv) * 0.35, 0, 255); }
      o[i + 3] = 255;
    }
    orillas(out);
    return out;
  }
  /* 2 · ¿dónde hay TRAZO? (Lorena, 14 nov: «el texto no es legible»: el lápiz salía gris claro y delgadito)
     El sombrero negro —cerrar la hoja con un cuadro de 11 px y restarle la original— enciende sólo lo delgado y más
     oscuro que su alrededor: letras y rayas. Las manchas anchas (borrón, lo que se transparenta del otro lado) no. */
  const cerrada = minFiltro(maxFiltro(L, W, H, 5), W, H, 5);
  let t = new Float32Array(n);
  for(let p = 0; p < n; p++){
    const bh = cerrada[p] - L[p];
    t[p] = Math.max(Math.pow(clamp((bh - 14) / 20, 0, 1), 0.6), clamp((150 - L[p]) / 40, 0, 1));
  }
  t = suave3(t, W, H);
  /* 3 · el trazo se engorda un pixel, para que el lápiz delgado se lea desde lejos */
  const gordo = maxFiltro(t, W, H, 1);
  for(let p = 0; p < n; p++){
    const k = Math.max(t[p], gordo[p] * 0.55), i = p * 4;
    for(let c = 0; c < 3; c++) o[i + c] = clamp((R[p * 3 + c] - 90) * 255 / 115, 0, 255) * 0.42 * k + 255 * (1 - k);
    o[i + 3] = 255;
  }
  orillas(out);
  return out;
}
/* máximo y mínimo en un cuadro de (2r+1), separados en renglón y columna para que sea rápido */
function filtroCuadro(src, W, H, r, mayor){
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  const mejor = mayor ? (a, b) => (a > b ? a : b) : (a, b) => (a < b ? a : b);
  for(let y = 0; y < H; y++){ const f = y * W; for(let x = 0; x < W; x++){ let m = src[f + x]; for(let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) m = mejor(m, src[f + k]); tmp[f + x] = m; } }
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ let m = tmp[y * W + x]; for(let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) m = mejor(m, tmp[k * W + x]); out[y * W + x] = m; }
  return out;
}
const maxFiltro = (s, W, H, r) => filtroCuadro(s, W, H, r, true);
const minFiltro = (s, W, H, r) => filtroCuadro(s, W, H, r, false);
/* desenfoque gaussiano de 3×3 (1-2-1) */
function suave3(s, W, H){
  const tmp = new Float32Array(s.length), out = new Float32Array(s.length);
  for(let y = 0; y < H; y++){ const f = y * W; for(let x = 0; x < W; x++) tmp[f + x] = (s[f + Math.max(0, x - 1)] + 2 * s[f + x] + s[f + Math.min(W - 1, x + 1)]) / 4; }
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) out[y * W + x] = (tmp[Math.max(0, y - 1) * W + x] + 2 * tmp[y * W + x] + tmp[Math.min(H - 1, y + 1) * W + x]) / 4;
  return out;
}
/* las manchas que tocan la orilla y no traen trazo oscuro (plástico, sombra de otra hoja) se van; 12 px de margen blanco */
function orillas(img, banda = 160){
  const W = img.width, H = img.height, d = img.data, n = W * H;
  const m = new Uint8Array(n); for(let p = 0; p < n; p++) m[p] = gris(d, p * 4) < 235 ? 1 : 0;
  const visto = new Uint8Array(n), cola = new Int32Array(n);
  for(let s = 0; s < n; s++){
    if(!m[s] || visto[s]) continue;
    let a = 0, b = 0; cola[b++] = s; visto[s] = 1;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, oscuros = 0;
    while(a < b){
      const p = cola[a++], px = p % W, py = (p / W) | 0;
      if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py;
      if(gris(d, p * 4) < 150) oscuros++;
      for(const q of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, py > 0 ? p - W : -1, py < H - 1 ? p + W : -1]){
        if(q >= 0 && m[q] && !visto[q]){ visto[q] = 1; cola[b++] = q; }
      }
    }
    const enOrilla = x0 < banda || y0 < banda || x1 > W - banda || y1 > H - banda;
    if(enOrilla && oscuros < b * 0.1){ for(let k = 0; k < b; k++){ const i = cola[k] * 4; d[i] = d[i + 1] = d[i + 2] = 255; } }
  }
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    if(x < 12 || y < 12 || x >= W - 12 || y >= H - 12){ const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; }
  }
}

/* foto acostada → parada (la hoja escrita casi siempre es vertical): se gira a la izquierda; si quedó de cabeza
   o al revés, el botón «Girar» la vuelve */
export function pararFoto(img){
  if(img.width <= img.height) return img;
  const c = lienzo(img.height, img.width), x = c.getContext('2d');
  x.translate(0, img.width); x.rotate(-Math.PI / 2); x.drawImage(img, 0, 0);
  return c;
}
