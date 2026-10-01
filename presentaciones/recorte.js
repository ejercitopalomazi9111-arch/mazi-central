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

   Y lo que se quitó se puede RELLENAR («Fondo nuevo»): con un color, una
   textura, otra imagen, o un color con textura encima.

   Uso:  const r = await recortar(blob | {bytes, mime} | url, { recortarAlContenido })
         → { bytes, mime:'image/png', ancho, alto, fondo }  ·  null si se canceló
         (fondo: 'nada' si quedó transparente; con fondo nuevo no se recorta al contenido)
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

/* ── el borde fino: que las letras salgan nítidas y sin manchas del fondo ──
   Carlos: «deja interiores con color o letras muy borrosas». Era cierto y se
   reprodujo: el modelo trabaja a baja resolución, así que su borde es una
   mancha suave que se come el trazo fino de una letra y deja islas del fondo
   alrededor. Se arregla después del modelo, mirando los COLORES de la foto:
   · si el fondo es liso, el borde lo decide el color de cada pixel (nítido);
   · si no, un filtro guiado pega el borde suave a las orillas de la foto;
   · y los huecos encerrados del color del fondo (el ojo de una O) se quitan. */

/* promedio en una caja de radio r, separable y en O(n) */
export function cajaMedia(src, W, H, r){
  const t = new Float32Array(W * H), o = new Float32Array(W * H), n = 2 * r + 1;
  for(let y = 0; y < H; y++){ const f = y * W; let s = 0;
    for(let x = -r; x <= r; x++) s += src[f + Math.min(W - 1, Math.max(0, x))];
    for(let x = 0; x < W; x++){ t[f + x] = s / n; s += src[f + Math.min(W - 1, x + r + 1)] - src[f + Math.max(0, x - r)]; } }
  for(let x = 0; x < W; x++){ let s = 0;
    for(let y = -r; y <= r; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x];
    for(let y = 0; y < H; y++){ o[y * W + x] = s / n; s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
  return o;
}
const dist3 = (px, i, c) => Math.hypot(px[i] - c[0], px[i + 1] - c[1], px[i + 2] - c[2]);

/* ¿de qué color es lo que se quitó, y es liso? Mira lo que la máscara ya
   tiene como fondo (no las orillas: a veces el objeto toca la orilla). */
export function analizarFondo(px, W, H, m){
  /* Sólo cuenta el fondo PEGADO a la figura (una franja alrededor): en una
     infografía, lo de lejos trae de todo, pero junto a la figura suele ser
     el blanco del cuadro, y ése es el que se tiene que ir. */
  const N = W * H, bin = new Float32Array(N); let hay = 0;
  for(let k = 0; k < N; k++) if(m[k] > 127){ bin[k] = 1; hay++; }
  const cerca = hay ? cajaMedia(bin, W, H, Math.max(4, Math.round(Math.max(W, H) * 0.03))) : null;
  const paso = Math.max(1, Math.floor(Math.sqrt(N / 40000)));
  const R = [], G = [], B = [];
  let fondoTotal = 0;
  for(let y = 0; y < H; y += paso) for(let x = 0; x < W; x += paso){ const k = y * W + x; if(m[k] < 20){ fondoTotal++;
    if(cerca && cerca[k] > 0){ const i = k * 4; R.push(px[i]); G.push(px[i + 1]); B.push(px[i + 2]); } } }
  const total = Math.ceil(W / paso) * Math.ceil(H / paso);
  if(fondoTotal < total * 0.04 || R.length < 16) return { ref: null, liso: false, parte: fondoTotal / total };
  const med = (v) => { const s = v.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  const ref = [med(R), med(G), med(B)];
  /* liso = casi todo el fondo cae cerca del color de en medio */
  let junto = 0; for(let j = 0; j < R.length; j++) if(Math.hypot(R[j] - ref[0], G[j] - ref[1], B[j] - ref[2]) < 30) junto++;
  return { ref, liso: junto / R.length > 0.9, dominante: junto / R.length > 0.55, parte: fondoTotal / total };
}

/* Fondo liso: en la franja del borde (R pixeles a cada lado de lo que dijo el
   modelo) cada pixel vale por su distancia al color del fondo. Lo de adentro
   de la franja se queda lleno —una camisa blanca sobre fondo blanco no se
   agujera— y lo de afuera se va (las islas). */
export function afinarPorColor(px, W, H, m, ref, R = Math.max(3, Math.round(Math.max(W, H) / 90)), tol = 26){
  const bin = new Float32Array(W * H); for(let k = 0; k < W * H; k++) bin[k] = m[k] > 127 ? 1 : 0;
  const cerca = cajaMedia(bin, W, H, R);
  const o = new Uint8ClampedArray(W * H), suave = tol * 0.9;
  for(let k = 0; k < W * H; k++){
    const c = cerca[k];
    if(c <= 0.0001){ o[k] = 0; continue; }                 // lejos de todo: fondo
    if(c >= 0.9999){ o[k] = 255; continue; }                // bien adentro: lleno (el modelo deja «casi» donde está seguro)
    const d = dist3(px, k * 4, ref);
    o[k] = d <= tol ? 0 : d >= tol + suave ? 255 : Math.round(255 * (d - tol) / suave);
  }
  return o;
}

/* Fondo liso, segunda parte: el modelo a veces se come media letra. Desde lo
   que se quedó se crece por los pixeles que claramente NO son del color del
   fondo, hasta `lejos` pixeles: la letra mordida se completa, y una sombra
   lejana o un objeto aparte no se pegan. */
export function crecerPorColor(px, W, H, m, ref, tol = 26, lejos = Math.round(Math.max(W, H) * 0.6), vecino = Math.round(Math.max(W, H) * 0.04)){
  const suave = tol * 0.9, N = W * H, fila = new Int32Array(N), paso = new Uint16Array(N);
  let o = m.slice();
  /* Arranca de lo que se quedó y también de lo que NO es fondo y está a menos
     de `vecino` (la G de un logo que el modelo soltó entera junto a la O que
     sí agarró). Se repite: la G recuperada trae a la letra de junto. */
  for(let vuelta = 0; vuelta < 8; vuelta++){
    const visto = new Uint8Array(N), bin = new Float32Array(N);
    for(let k = 0; k < N; k++) bin[k] = o[k] > 127 ? 1 : 0;
    const cerca = vecino > 0 ? cajaMedia(bin, W, H, vecino) : bin;
    let a = 0, z = 0, nuevos = 0;
    for(let k = 0; k < N; k++){
      if(o[k] > 127){ visto[k] = 1; fila[z++] = k; }
      else if(cerca[k] > 0 && dist3(px, k * 4, ref) >= tol + suave){ visto[k] = 1; o[k] = 255; fila[z++] = k; nuevos++; }
    }
    paso.fill(0);
    while(a < z){
      const k = fila[a++], x = k % W, y = (k - x) / W;
      if(paso[k] >= lejos) continue;
      for(const v of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1]){
        if(v < 0 || visto[v]) continue; visto[v] = 1;
        const d = dist3(px, v * 4, ref), al = d <= tol ? 0 : d >= tol + suave ? 255 : Math.round(255 * (d - tol) / suave);
        if(al > o[v]) o[v] = al;
        if(al === 255){ paso[v] = paso[k] + 1; fila[z++] = v; nuevos++; }
      }
    }
    if(!nuevos || !vecino) break;
  }
  return o;
}

/* Fondo con dibujo: en la franja del borde, cada pixel se explica como una
   mezcla de DOS colores: el de la figura que tiene cerca y el del fondo que
   tiene cerca (promedios de lo que el modelo da por seguro, lejos del borde).
   α = cuánto se parece a la figura sobre la recta entre los dos. Donde los
   dos colores se parecen demasiado no hay con qué decidir y manda el modelo.
   (Un filtro guiado sobre la luz se probó primero: con fondo con textura
   dejaba una rampa de 5 pixeles donde el modelo se pasó.) */
export function afinarDosColores(px, W, H, m, r = Math.max(3, Math.round(Math.max(W, H) / 150))){
  const N = W * H, bin = new Float32Array(N);
  for(let k = 0; k < N; k++) bin[k] = m[k] > 127 ? 1 : 0;
  const c = cajaMedia(bin, W, H, r);
  const seF = new Float32Array(N), seB = new Float32Array(N);
  for(let k = 0; k < N; k++){ seF[k] = c[k] >= 0.999 ? 1 : 0; seB[k] = c[k] <= 0.001 ? 1 : 0; }
  const R = r * 3, nF = cajaMedia(seF, W, H, R), nB = cajaMedia(seB, W, H, R), F = [], B = [];
  for(let q = 0; q < 3; q++){
    const a = new Float32Array(N), b = new Float32Array(N);
    for(let k = 0; k < N; k++){ const v = px[k * 4 + q]; a[k] = v * seF[k]; b[k] = v * seB[k]; }
    F.push(cajaMedia(a, W, H, R)); B.push(cajaMedia(b, W, H, R));
  }
  const o = m.slice();
  for(let k = 0; k < N; k++){
    if(c[k] <= 0 || c[k] >= 1 || nF[k] < 1e-3 || nB[k] < 1e-3) continue;
    let num = 0, den = 0;
    for(let q = 0; q < 3; q++){ const f = F[q][k] / nF[k], b = B[q][k] / nB[k], d = f - b; num += (px[k * 4 + q] - b) * d; den += d * d; }
    const sep = Math.sqrt(den), w = Math.min(1, Math.max(0, (sep - 30) / 60));
    if(!w) continue;
    const a = Math.min(1, Math.max(0, (num / den - 0.1) / 0.8));
    o[k] = Math.round(255 * (w * a + (1 - w) * m[k] / 255));
  }
  return o;
}

/* Huecos: manchas del color del fondo ENCERRADAS en lo que se queda (el ojo
   de una O, el aire entre el brazo y el cuerpo). Sólo las chicas —cada una
   menos del `maxFrac` de lo que se queda— para no agujerar una camisa blanca
   sobre fondo blanco. Devuelve { mascara, huecos }. */
export function quitarHuecos(px, W, H, m, ref, tol = 24, maxFrac = 0.04){
  const N = W * H; let area = 0; for(let k = 0; k < N; k++) if(m[k] > 127) area++;
  const es = (k) => m[k] > 127 && dist3(px, k * 4, ref) <= tol;
  const visto = new Uint8Array(N), fila = new Int32Array(N), o = m.slice();
  const minimo = Math.max(4, Math.round(N * 0.00002));
  const quitar = []; let huecos = 0;
  for(let k0 = 0; k0 < N; k0++){
    if(visto[k0] || !es(k0)) continue;
    let a = 0, z = 0, toca = false, sumaD = 0; fila[z++] = k0; visto[k0] = 1;
    while(a < z){
      const k = fila[a++], x = k % W, y = (k - x) / W;
      sumaD += dist3(px, k * 4, ref);
      if(x === 0 || y === 0 || x === W - 1 || y === H - 1) toca = true;
      for(const v of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1]){
        if(v < 0 || visto[v]) continue;
        if(m[v] <= 127){ toca = true; continue; }          // se asoma al fondo: no está encerrado
        if(es(v)){ visto[v] = 1; fila[z++] = v; }
      }
    }
    /* «idéntico» = el mismo color del fondo, sin sombra ni pliegue (una
       pared lisa, el blanco de una infografía, el ojo de una letra). Una
       camisa blanca sobre blanco tiene sombras: no es idéntica y se queda. */
    const medio = sumaD / z, identico = medio < 9;
    if(toca){ if(identico) quitar.push(fila.slice(0, z)); }                   // isla pegada al fondo
    else if(z >= minimo && ((z <= maxFrac * area && medio < 14) || (identico && z <= 0.35 * area))){ quitar.push(fila.slice(0, z)); huecos++; }
  }
  for(const t of quitar){
    for(const k of t) o[k] = 0;
    /* y su orilla, de un pixel, por color: sin el anillo claro alrededor */
    for(const k of t){ const x = k % W;
      for(const v of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W]){
        if(v < 0 || v >= N || o[v] === 0) continue;
        const d = dist3(px, v * 4, ref); if(d < tol * 2) o[v] = Math.min(o[v], Math.round(255 * Math.max(0, d - tol) / tol));
      } }
  }
  return { mascara: o, huecos, islas: quitar.length - huecos };
}

/* Lo que sale del modelo pasa por aquí antes de pintarse */
export function afinar(px, W, H, m){
  const f = analizarFondo(px, W, H, m);
  if(!f.ref) return { mascara: m, huecos: 0, liso: false };
  /* liso: todo por color. Con un color que manda pero no solo (el blanco de
     una infografía junto a otros dibujos): el borde guiado, y luego se quitan
     las manchas de ESE color; no se crece, que se pegaría el dibujo de junto. */
  const fina = f.liso ? crecerPorColor(px, W, H, afinarPorColor(px, W, H, m, f.ref), f.ref) : afinarDosColores(px, W, H, m);
  const h = f.liso || f.dominante ? quitarHuecos(px, W, H, fina, f.ref) : { mascara: fina, huecos: 0, islas: 0 };
  return { mascara: h.mascara, huecos: h.huecos, islas: h.islas, liso: f.liso, ref: f.ref };
}

/* Sin halo: en la orilla, el color de la foto trae mezclado el del fondo
   viejo. Se le resta (F = (I − (1−α)·B) / α, con B el fondo de alrededor),
   para que sobre un fondo nuevo no se vea el contorno del anterior. */
/* el color del fondo de alrededor de cada pixel (promedio de lo quitado) */
export function fondoLocal(px, W, H, m, r = 6){
  const N = W * H, fuera = new Float32Array(N), c = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  for(let k = 0; k < N; k++){ const b = 1 - m[k] / 255; fuera[k] = b; for(let q = 0; q < 3; q++) c[q][k] = px[k * 4 + q] * b; }
  return { W, H, mf: cajaMedia(fuera, W, H, r), mc: c.map((v) => cajaMedia(v, W, H, r)) };
}
/* `px` y `m` pueden ser más grandes que `fondo` (la foto original contra la
   versión de trabajo): el fondo de alrededor se lee en su lugar proporcional. */
export function limpiarOrilla(px, W, H, m, fondo){
  const o = new Uint8ClampedArray(px), sx = fondo.W / W, sy = fondo.H / H;
  for(let y = 0; y < H; y++){
    const fy = Math.min(fondo.H - 1, Math.floor(y * sy)) * fondo.W;
    for(let x = 0; x < W; x++){
      const k = y * W + x, a = m[k] / 255; if(a <= 0.012 || a >= 0.988) continue;
      const f = fy + Math.min(fondo.W - 1, Math.floor(x * sx)), mf = fondo.mf[f]; if(mf < 1e-4) continue;
      for(let q = 0; q < 3; q++) o[k * 4 + q] = (px[k * 4 + q] - (1 - a) * fondo.mc[q][f] / mf) / a;
    }
  }
  return o;
}
export function descontaminar(px, W, H, m, r = 6){ return limpiarOrilla(px, W, H, m, fondoLocal(px, W, H, m, r)); }

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
.rc-lienzo canvas{max-width:100%; max-height:100%; display:block; image-rendering:auto; transform-origin:center center}
.rc-leyenda{display:flex; gap:12px; flex:1 1 100%; font-size:13px; color:#B9B0C6}
.rc-leyenda i{display:inline-block; width:14px; height:14px; border-radius:4px; vertical-align:-2px; margin-right:4px}
.rc-estado{position:absolute; left:50%; bottom:12px; transform:translateX(-50%); background:rgba(11,7,16,.86); color:#fff;
  padding:8px 14px; border-radius:999px; font-size:14px; white-space:nowrap; max-width:92%; overflow:hidden; text-overflow:ellipsis; pointer-events:none}
.rc-estado:empty{display:none}
.rc-modos{display:flex; flex-wrap:wrap; gap:6px; padding:10px 12px 0}
.rc-modos button{flex:1 1 auto; white-space:nowrap; padding:0 8px}
.rc-tipos{flex:1 1 100%; display:flex; flex-wrap:wrap; gap:6px}
.rc-tipos button{flex:1 1 auto; white-space:nowrap; padding:0 12px}
.rc-fila{flex:1 1 100%; display:flex; gap:8px; overflow-x:auto; padding:2px 0 4px; scrollbar-width:thin}
.rc .rc-muestra{flex:none; width:44px; height:44px; min-height:44px; padding:0; border-radius:50%; border:2px solid #3A2C4A; background-size:cover; background-position:center}
.rc .rc-muestra.cuadro{border-radius:10px}
.rc .rc-muestra[aria-pressed="true"]{border-color:#fff; box-shadow:0 0 0 2px #AC27FF}
.rc-otro{flex:none; position:relative; width:44px; height:44px; border-radius:50%; overflow:hidden; border:2px dashed #6B5A80;
  display:grid; place-items:center; font-size:20px; cursor:pointer}
.rc-otro input{position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; border:0; padding:0}
.rc-panel > button{flex:1 1 auto; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 8px}
.rc-panel{padding:6px 12px 2px; display:flex; flex-wrap:wrap; gap:6px 8px; align-items:center}
.rc-panel p{margin:0; flex:1 1 100%; font-size:13px; color:#B9B0C6}
.rc-panel label{display:flex; align-items:center; gap:8px; flex:1 1 180px; font-size:14px}
.rc-panel input[type=range]{flex:1; min-width:0; accent-color:#AC27FF; height:44px}
.rc-pie{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; padding:6px 12px 12px}
.rc-pie button{white-space:nowrap; padding:0 6px; overflow:hidden; text-overflow:ellipsis}
`;
/* ── el fondo nuevo ── */
const MUESTRAS = [['Blanco', '#FFFFFF'], ['Hueso', '#F4EBDD'], ['Gris claro', '#E6E6EA'], ['Negro', '#111111'],
  ['Violeta', '#AC27FF'], ['Rojo', '#C1121F'], ['Azul', '#1F4FD8'], ['Verde', '#2E9E5B'], ['Amarillo', '#F2C14E']];
const TEXTURAS = ['madera', 'marmol', 'concreto', 'papel', 'tela', 'piel', 'ladrillo', 'azulejo', 'metal', 'tierra'];
const texturas = {};
function cargarTextura(n){
  if(!texturas[n]) texturas[n] = aImagen(AQUI + 'texturas/' + n + '.jpg').then((im) => (texturas[n] = im), (e) => { delete texturas[n]; throw e; });
  return Promise.resolve(texturas[n]);
}
/* pinta el fondo nuevo en todo el lienzo; la textura se repite con un mosaico
   de un cuarto del lado mayor, para que se vea igual en la vista y al guardar */
export function pintarFondo(g, W, H, f){
  if(!f || f.tipo === 'nada') return;
  g.save();
  if(f.tipo === 'color' || f.tipo === 'mezcla'){ g.fillStyle = f.color; g.fillRect(0, 0, W, H); }
  const tx = texturas[f.textura];
  if((f.tipo === 'textura' || f.tipo === 'mezcla') && tx instanceof HTMLImageElement){
    const lado = Math.max(64, Math.round(Math.max(W, H) / 4));
    const t = document.createElement('canvas'); t.width = t.height = lado; t.getContext('2d').drawImage(tx, 0, 0, lado, lado);
    if(f.tipo === 'mezcla'){ g.globalCompositeOperation = 'overlay'; g.globalAlpha = f.fuerza / 100; }
    g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(0, 0, W, H);
  }
  if(f.tipo === 'imagen' && f.imagen){
    const iw = f.imagen.naturalWidth, ih = f.imagen.naturalHeight, e = Math.max(W / iw, H / ih);   // cubre, sin estirar
    g.drawImage(f.imagen, (W - iw * e) / 2, (H - ih * e) / 2, iw * e, ih * e);
  }
  g.restore();
}

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
  let modo = 'auto', sumar = true, juntos = true, tol = 40, suave = 0, dentro = true;
  /* Fondo nuevo: lo que se quitó se rellena. tipo: nada · color · textura · imagen · mezcla */
  const fondo = { tipo: 'nada', color: '#FFFFFF', textura: 'madera', imagen: null, fuerza: 55 };
  /* Dónde va el recorte sobre el fondo nuevo (en pixeles de la imagen de trabajo): se mueve con un dedo y
     se agranda con dos, en el modo «Fondo». Y el acercamiento de la vista, para trazar fino en los demás. */
  const pos = { x: 0, y: 0, s: 1 };
  const zoom = { s: 1, x: 0, y: 0 };

  const vista = h('canvas', { 'aria-label': 'La imagen; toca o traza sobre ella' }); vista.width = W; vista.height = H;
  const vx = vista.getContext('2d');
  const estado = h('div', { class: 'rc-estado', role: 'status' });
  const lienzo = h('div', { class: 'rc-lienzo' }, vista, estado);
  const panel = h('div', { class: 'rc-panel' });
  const elegirImagen = h('input', { type: 'file', accept: 'image/*', hidden: true, on: { change: async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if(!f) return;
    try{ cambiarFondo({ tipo: 'imagen', imagen: await aImagen(f) }); }catch{ estado.textContent = 'Esa imagen no se pudo abrir.'; }
  } } });

  const botonModo = (id, tx) => h('button', { type: 'button', 'data-modo': id, 'aria-pressed': String(id === modo), on: { click: () => { modo = id; pintarPanel(); } } }, tx);
  const modos = h('div', { class: 'rc-modos', role: 'group', 'aria-label': 'Cómo quitar el fondo' },
    botonModo('auto', '✦ Auto'), botonModo('color', 'Por color'), botonModo('dedo', 'Con el dedo'), botonModo('fondo', 'Fondo'));
  let sucio = true;                      // la máscara cambió: hay que volver a componer
  const deshacer = h('button', { type: 'button', disabled: true, on: { click: () => { if(historia.length){ mascara = historia.pop(); sucio = true; pintar(); } } } }, '↶ Deshacer');
  const guardarPaso = () => { historia.push(mascara); if(historia.length > 25) historia.shift(); deshacer.disabled = false; };
  const cambiar = (nueva) => { guardarPaso(); mascara = nueva; sucio = true; pintar(); };

  let terminar;
  const fin = new Promise((ok) => { terminar = ok; });
  const raiz = h('dialog', { class: 'rc', 'aria-label': titulo },
    h('div', { class: 'rc-barra' },
      h('button', { type: 'button', on: { click: () => terminar(null) } }, 'Cancelar'),
      h('h2', {}, titulo),
      h('button', { type: 'button', class: 'rc-si', 'data-listo': true, on: { click: () => terminar('listo') } }, 'Listo')),
    lienzo, modos, panel, elegirImagen,
    h('div', { class: 'rc-pie' }, deshacer,
      h('button', { type: 'button', on: { click: () => cambiar(mascara.map((v) => 255 - v)) } }, '⇄ Invertir'),
      h('button', { type: 'button', on: { click: () => cambiar(new Uint8ClampedArray(W * H).fill(255)) } }, '↺ Original')));
  document.body.append(raiz);
  if(raiz.showModal) raiz.showModal(); else raiz.setAttribute('open', '');
  const onKey = (e) => { e.preventDefault(); terminar(null); };      // Escape en un diálogo = «cancel»
  raiz.addEventListener('cancel', onKey);

  /* ── pintar: la imagen con la máscara encima, sobre el cuadriculado o el
     fondo nuevo. Lo caro (suavizar y limpiar la orilla) se compone sólo
     cuando cambia la máscara; el trazo del dedo se pinta encima cada cuadro. */
  const capa = h('canvas'); capa.width = W; capa.height = H;
  const cx = capa.getContext('2d');
  function componer(){
    const m = suavizar(mascara, W, H, suave);
    const rgb = descontaminar(px, W, H, m);
    const d = cx.createImageData(W, H), o = d.data;
    for(let i = 0, j = 0; i < W * H; i++, j += 4){ o[j] = rgb[j]; o[j + 1] = rgb[j + 1]; o[j + 2] = rgb[j + 2]; o[j + 3] = m[i] * px[j + 3] / 255; }
    cx.putImageData(d, 0, 0); sucio = false;
  }
  let fant = null;
  const fantasma = () => {
    if(fant) return fant;
    fant = h('canvas'); fant.width = W; fant.height = H; const g = fant.getContext('2d');
    g.drawImage(base, 0, 0); g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(225,29,72,.45)'; g.fillRect(0, 0, W, H);
    return fant;
  };
  let cuadro = 0;
  function pintar(){
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      if(sucio) componer();
      vx.clearRect(0, 0, W, H);
      pintarFondo(vx, W, H, fondo);
      if(modo === 'fondo'){
        vx.save(); vx.translate(W / 2 + pos.x, H / 2 + pos.y); vx.scale(pos.s, pos.s); vx.drawImage(capa, -W / 2, -H / 2); vx.restore();
      } else {
        /* lo que se quita se sigue viendo, deslavado y en rojo: así se sabe qué queda adentro */
        if(fondo.tipo === 'nada'){ vx.save(); vx.globalAlpha = .55; vx.drawImage(fantasma(), 0, 0); vx.restore(); }
        vx.drawImage(capa, 0, 0);
      }
      if(trazo.length > 1){
        vx.save(); vx.lineWidth = Math.max(2, W / 220); vx.strokeStyle = '#AC27FF'; vx.setLineDash([vx.lineWidth * 3, vx.lineWidth * 2]);
        vx.beginPath(); trazo.forEach(([x, y], n) => n ? vx.lineTo(x, y) : vx.moveTo(x, y)); vx.stroke(); vx.restore();
      }
    });
  }
  const cambiarFondo = async (cambio) => {
    Object.assign(fondo, cambio);
    if(fondo.tipo === 'textura' || fondo.tipo === 'mezcla') try{ await cargarTextura(fondo.textura); }catch{ estado.textContent = 'No cargó esa textura.'; }
    pintarPanel(); pintar();
  };
  function pintarPanel(){
    modos.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
    const rango = (et, min, max, val, al) => h('label', {}, et, h('input', { type: 'range', min, max, value: val, on: { input: (e) => al(+e.target.value) } }));
    const par = (a, b, v, al) => [
      h('button', { type: 'button', 'aria-pressed': String(v), on: { click: () => { al(true); pintarPanel(); } } }, a),
      h('button', { type: 'button', 'aria-pressed': String(!v), on: { click: () => { al(false); pintarPanel(); } } }, b)];
    const suaveR = rango('Borde suave', 0, 6, suave, (v) => { suave = v; sucio = true; pintar(); });
    if(modo === 'auto') panel.replaceChildren(
      h('p', {}, 'Toca lo que quieres dejar. ＋ suma lo que toques; － lo quita.'),
      ...par('＋ Sumar', '－ Quitar', sumar, (v) => { sumar = v; }),
      h('button', { type: 'button', on: { click: () => automatico(0.5, 0.5, 'nuevo') } }, '✦ Detectar otra vez'), suaveR);
    else if(modo === 'color') panel.replaceChildren(
      h('p', {}, 'Toca el color que quieres volver transparente.'),
      ...par('Sólo esa zona', 'En toda la imagen', juntos, (v) => { juntos = v; }),
      rango('Tolerancia', 4, 140, tol, (v) => { tol = v; }), suaveR);
    else if(modo === 'dedo') panel.replaceChildren(
      h('p', {}, dentro ? 'Traza con el dedo el contorno de lo que se queda. Lo de afuera se borra.' : 'Traza con el dedo lo que quieres borrar.'),
      ...par('Adentro se queda', 'Adentro se borra', dentro, (v) => { dentro = v; }), suaveR);
    else panel.replaceChildren(...panelFondo());
    if(modo !== 'fondo') panel.append(leyenda());
    lienzo.classList.toggle('rc-mueve', modo === 'fondo');
    vista.setAttribute('aria-label', modo === 'fondo' ? 'El recorte sobre el fondo nuevo: muévelo con un dedo, agrándalo con dos' : 'La imagen; toca o traza sobre ella');
    pintar();
  }

  function leyenda(){
    const e = h('p', { class: 'rc-leyenda' });
    e.innerHTML = '<span><i style="background:linear-gradient(135deg,#F2C14E,#2E9E5B)"></i>a todo color: se queda</span><span><i style="background:rgba(225,29,72,.55)"></i>deslavado en rojo: se borra</span>' + (zoom.s > 1 ? '' : '<span>· dos dedos: acercar</span>');
    return e;
  }
  /* ── acomodar el recorte sobre el fondo nuevo ── */
  function cajaRecorte(){
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(mascara[y * W + x] > 8){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
  function centrar(){
    const c = cajaRecorte(); if(!c) return;
    pos.x = -pos.s * ((c.x0 + c.x1) / 2 - W / 2); pos.y = -pos.s * ((c.y0 + c.y1) / 2 - H / 2); pintar();
  }
  function llenar(){
    const c = cajaRecorte(); if(!c) return;
    pos.s = Math.min(4, .9 * Math.min(W / (c.x1 - c.x0 + 1), H / (c.y1 - c.y0 + 1))); centrar();
  }
  function panelFondo(){
    const t = fondo.tipo;
    const tipo = (id, tx) => h('button', { type: 'button', 'data-fondo': id, 'aria-pressed': String(t === id), on: { click: () => {
      if(id === 'imagen' && !fondo.imagen) return elegirImagen.click();
      cambiarFondo({ tipo: id }); } } }, tx);
    const colores = () => h('div', { class: 'rc-fila', role: 'group', 'aria-label': 'Color' },
      ...MUESTRAS.map(([n, c]) => h('button', { type: 'button', class: 'rc-muestra', 'aria-label': n, title: n, 'data-color': c,
        'aria-pressed': String(fondo.color.toUpperCase() === c), style: `background:${c}`, on: { click: () => cambiarFondo({ color: c }) } })),
      h('label', { class: 'rc-otro', title: 'Otro color' }, '＋', h('span', { class: 'rc-oculto', style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)' }, 'Otro color'),
        h('input', { type: 'color', value: fondo.color, on: { input: (e) => { fondo.color = e.target.value.toUpperCase(); pintar(); }, change: () => pintarPanel() } })));
    const texturas = () => h('div', { class: 'rc-fila', role: 'group', 'aria-label': 'Textura' },
      ...TEXTURAS.map((n) => h('button', { type: 'button', class: 'rc-muestra cuadro', 'aria-label': n, title: n, 'data-textura': n,
        'aria-pressed': String(fondo.textura === n), style: `background-image:url(${AQUI}texturas/${n}.jpg)`, on: { click: () => cambiarFondo({ textura: n }) } })));
    const lista = [
      h('p', {}, t === 'nada' ? 'Lo que quitaste queda transparente. Elige con qué rellenarlo:' : 'Lo que quitaste se rellena con:'),
      h('div', { class: 'rc-tipos', role: 'group', 'aria-label': 'Con qué se rellena' },
        tipo('nada', 'Transparente'), tipo('color', 'Color'), tipo('textura', 'Textura'),
        tipo('imagen', 'Imagen'), tipo('mezcla', 'Color + textura')),
    ];
    if(t === 'color') lista.push(colores());
    if(t === 'textura') lista.push(texturas());
    if(t === 'mezcla') lista.push(colores(), texturas(),
      h('label', {}, 'Textura', h('input', { type: 'range', min: 10, max: 100, value: fondo.fuerza, 'aria-label': 'Cuánta textura', on: { input: (e) => { fondo.fuerza = +e.target.value; pintar(); } } })));
    if(t === 'imagen') lista.push(h('button', { type: 'button', on: { click: () => elegirImagen.click() } }, fondo.imagen ? 'Cambiar la imagen…' : 'Elegir imagen…'));
    lista.push(h('p', {}, 'Mueve el recorte con un dedo; con dos lo agrandas o achicas.'),
      h('button', { type: 'button', 'data-acomodo': 'centrar', on: { click: centrar } }, '⊕ Centrar'),
      h('button', { type: 'button', 'data-acomodo': 'llenar', on: { click: llenar } }, '⤢ Llenar'),
      h('button', { type: 'button', 'data-acomodo': 'menos', 'aria-label': 'Más chico', on: { click: () => { pos.s = Math.max(.1, pos.s / 1.15); pintar(); } } }, '－'),
      h('button', { type: 'button', 'data-acomodo': 'mas', 'aria-label': 'Más grande', on: { click: () => { pos.s = Math.min(6, pos.s * 1.15); pintar(); } } }, '＋'),
      h('button', { type: 'button', 'data-acomodo': 'inicio', on: { click: () => { pos.x = pos.y = 0; pos.s = 1; pintar(); } } }, '↺ Como estaba'));
    return lista;
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
      else if(como === 'nuevo'){
        const f = afinar(px, W, H, a); cambiar(f.mascara);
        const dijo = [f.huecos && `${f.huecos} hueco${f.huecos > 1 ? 's' : ''}`, f.islas && `${f.islas} mancha${f.islas > 1 ? 's' : ''} del fondo`].filter(Boolean);
        if(dijo.length) estado.textContent = `Quité ${dijo.join(' y ')}. Si no eran fondo: ↶ Deshacer.`;
      }
      else { const f = afinar(px, W, H, a).mascara, m = mascara.slice();
        if(como === 'sumar'){ for(let i = 0; i < m.length; i++) if(f[i] > m[i]) m[i] = f[i]; }
        else for(let i = 0; i < m.length; i++) m[i] = Math.min(m[i], 255 - f[i]);
        cambiar(m); }
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
  const dedos = new Map();               // pointerId → [clientX, clientY]
  let gesto = null;                      // dos dedos: dónde empezaron
  const vistaZoom = () => { vista.style.transform = zoom.s === 1 && !zoom.x && !zoom.y ? '' : `translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})`; };
  const mitad = () => { const [a, b] = [...dedos.values()]; return { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; };
  vista.addEventListener('pointerdown', (e) => {
    e.preventDefault(); vista.setPointerCapture(e.pointerId); dedos.set(e.pointerId, [e.clientX, e.clientY]);
    if(dedos.size === 2){ abajo = null; trazo = []; const m = mitad(); gesto = { ...m, zoom: { ...zoom }, pos: { ...pos } }; pintar(); return; }
    if(dedos.size > 2) return;
    abajo = aImg(e); trazo = modo === 'dedo' ? [abajo] : [];
    if(modo === 'fondo') gesto = { solo: true, x: e.clientX, y: e.clientY, pos: { ...pos } };
  });
  vista.addEventListener('pointermove', (e) => {
    if(!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    const r = vista.getBoundingClientRect(), porPx = W / r.width;     // pixeles de imagen por pixel de pantalla
    if(dedos.size === 2 && gesto && !gesto.solo){
      const m = mitad(), k = m.d / gesto.d;
      if(modo === 'fondo'){ pos.s = Math.min(6, Math.max(.1, gesto.pos.s * k)); pos.x = gesto.pos.x + (m.cx - gesto.cx) * porPx; pos.y = gesto.pos.y + (m.cy - gesto.cy) * porPx; pintar(); }
      else { zoom.s = Math.min(8, Math.max(1, gesto.zoom.s * k)); zoom.x = gesto.zoom.x + (m.cx - gesto.cx); zoom.y = gesto.zoom.y + (m.cy - gesto.cy); if(zoom.s === 1){ zoom.x = zoom.y = 0; } vistaZoom(); }
      return;
    }
    if(modo === 'fondo' && gesto && gesto.solo){ pos.x = gesto.pos.x + (e.clientX - gesto.x) * porPx; pos.y = gesto.pos.y + (e.clientY - gesto.y) * porPx; pintar(); return; }
    if(!abajo || modo !== 'dedo') return; trazo.push(aImg(e)); pintar();
  });
  const soltar = (e) => {
    const eran = dedos.size; dedos.delete(e.pointerId);
    if(eran >= 2){ if(!dedos.size){ gesto = null; if(modo !== 'fondo') pintarPanel(); } abajo = null; trazo = []; return; }
    gesto = null;
    if(!abajo || modo === 'fondo'){ abajo = null; return; }
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
  };
  vista.addEventListener('pointerup', soltar);
  vista.addEventListener('pointercancel', (e) => { dedos.delete(e.pointerId); gesto = null; abajo = null; trazo = []; pintar(); });
  /* doble toque con la vista acercada: regresa a verla entera */
  vista.addEventListener('dblclick', () => { if(modo !== 'fondo' && zoom.s !== 1){ zoom.s = 1; zoom.x = zoom.y = 0; vistaZoom(); pintarPanel(); } });

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
  await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok)));   // que se alcance a ver «Guardando…»
  /* A tamaño original (topado a 16 millones de pixeles, el límite de un lienzo
     en el iPhone). La máscara se estira y, si el fondo era liso, su orilla se
     vuelve a decidir por color A ESA RESOLUCIÓN: así una letra sale nítida
     aunque la foto sea cuatro veces más grande que la versión de trabajo. */
  const m = suavizar(mascara, W, H, suave);
  const ke = Math.min(1, Math.sqrt(16e6 / (OW * OH)));
  const EW = Math.max(1, Math.round(OW * ke)), EH = Math.max(1, Math.round(OH * ke));
  const out = h('canvas'); out.width = EW; out.height = EH;
  const ox = out.getContext('2d', { willReadFrequently: true });
  ox.drawImage(img, 0, 0, EW, EH);
  const foto = ox.getImageData(0, 0, EW, EH), fpx = foto.data;
  let M = m;
  if(EW !== W || EH !== H){
    const mc = h('canvas'); mc.width = W; mc.height = H;
    const md = mc.getContext('2d').createImageData(W, H);
    for(let i = 0; i < W * H; i++){ md.data[i * 4 + 3] = m[i]; }
    mc.getContext('2d').putImageData(md, 0, 0);
    const gc = h('canvas'); gc.width = EW; gc.height = EH; const gx = gc.getContext('2d', { willReadFrequently: true });
    gx.imageSmoothingQuality = 'high'; gx.drawImage(mc, 0, 0, EW, EH);
    const ga = gx.getImageData(0, 0, EW, EH).data; M = new Uint8ClampedArray(EW * EH);
    for(let i = 0; i < EW * EH; i++) M[i] = ga[i * 4 + 3];
    const f = analizarFondo(px, W, H, m);
    if(f.liso && !suave) M = afinarPorColor(fpx, EW, EH, M, f.ref, Math.ceil(EW / W) + 1);
  }
  const limpio = limpiarOrilla(fpx, EW, EH, M, fondoLocal(px, W, H, m));
  for(let i = 0, j = 0; i < EW * EH; i++, j += 4){ fpx[j] = limpio[j]; fpx[j + 1] = limpio[j + 1]; fpx[j + 2] = limpio[j + 2]; fpx[j + 3] = M[i] * fpx[j + 3] / 255; }
  let final = out;
  if(fondo.tipo !== 'nada'){
    const fg = h('canvas'); fg.width = EW; fg.height = EH; fg.getContext('2d').putImageData(foto, 0, 0);
    ox.clearRect(0, 0, EW, EH); pintarFondo(ox, EW, EH, fondo);
    const ke2 = EW / W;                  // el acomodo se hizo en la imagen de trabajo: se lleva al tamaño final
    ox.save(); ox.translate(EW / 2 + pos.x * ke2, EH / 2 + pos.y * ke2); ox.scale(pos.s, pos.s); ox.drawImage(fg, -EW / 2, -EH / 2); ox.restore();
  } else {
    ox.putImageData(foto, 0, 0);
    if(recortarAlContenido){
      let x0 = EW, y0 = EH, x1 = -1, y1 = -1;
      for(let y = 0; y < EH; y++) for(let x = 0; x < EW; x++) if(M[y * EW + x] > 8){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
      if(x1 >= 0){
        const pad = Math.round(Math.max(EW, EH) * 0.015);
        const X0 = Math.max(0, x0 - pad), Y0 = Math.max(0, y0 - pad), X1 = Math.min(EW, x1 + 1 + pad), Y1 = Math.min(EH, y1 + 1 + pad);
        final = h('canvas'); final.width = X1 - X0; final.height = Y1 - Y0;
        final.getContext('2d').drawImage(out, X0, Y0, X1 - X0, Y1 - Y0, 0, 0, X1 - X0, Y1 - Y0);
      }
    }
  }
  const blob = await new Promise((ok) => final.toBlob(ok, 'image/png'));
  raiz.remove();
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: 'image/png', ancho: final.width, alto: final.height, blob, fondo: fondo.tipo };
}
