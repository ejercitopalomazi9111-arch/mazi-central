/* ══════════════════════════════════════════════════════════════════════════
   CAMBIAR COLOR · el motor, aparte de la pantalla
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «una aplicación de dibujo que no encime los colores al ponerlos en
   una imagen y que los separe según la tonalidad. Que permita cambiar colores
   de cosas como cabello o ropa que lleva sombras, tonos, etc.».

   La idea que hace que funcione: se trabaja en Lab, que separa la LUZ (L) del
   COLOR (a, b). Las sombras, los brillos, los hilos de la tela y los
   mechones del cabello viven en la luz; el «de qué color es» vive en a y b.
   · Para ELEGIR se mira sobre todo el color: la sombra de un suéter rojo
     sigue siendo rojo, así que tocar el suéter agarra también su sombra.
   · Para PINTAR se cambia el color y se conserva la variación de la luz: el
     cabello negro pasa a rubio con los mismos mechones, sólo más claros.
   Por eso «no se encima»: nunca se pone un color plano encima de la foto.

   Todo trabaja sobre arreglos planos, para que se pueda probar sin pantalla
   y para que el mismo código sirva al tamaño de trabajo y al de exportar.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── sRGB ⇄ Lab (D65), con tablas para que aguante 2 millones de pixeles ── */
const A_LINEAL = new Float32Array(256);
for(let i = 0; i < 256; i++){ const c = i / 255; A_LINEAL[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
const N_SRGB = 4096, A_SRGB = new Uint8ClampedArray(N_SRGB + 1);
for(let i = 0; i <= N_SRGB; i++){ const c = i / N_SRGB; A_SRGB[i] = Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)); }
const XN = 0.95047, ZN = 1.08883, E = 0.008856, K = 7.787;
const f = (t) => t > E ? Math.cbrt(t) : K * t + 16 / 116;
const fi = (t) => { const t3 = t * t * t; return t3 > E ? t3 : (t - 16 / 116) / K; };

export function labDe(r, g, b){
  const R = A_LINEAL[r], G = A_LINEAL[g], B = A_LINEAL[b];
  const x = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN);
  const y = f(0.2126729 * R + 0.7151522 * G + 0.0721750 * B);
  const z = f((0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / ZN);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/* Lab → sRGB en `sal[j..j+2]`. Si el color no cabe en la pantalla (un azul
   muy vivo en una sombra muy oscura), se le baja el color poco a poco en vez
   de cortar cada canal por su lado, que es lo que cambia el tono. */
export function rgbDe(L, a, b, sal = [0, 0, 0], j = 0){
  for(let intento = 0; intento < 7; intento++){
    const fy = (L + 16) / 116, X = XN * fi(fy + a / 500), Y = fi(fy), Z = ZN * fi(fy - b / 200);
    const R = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
    const G = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
    const B = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
    const fuera = R < -0.002 || G < -0.002 || B < -0.002 || R > 1.002 || G > 1.002 || B > 1.002;
    if(!fuera || intento === 6){
      sal[j] = A_SRGB[Math.round(Math.min(1, Math.max(0, R)) * N_SRGB)];
      sal[j + 1] = A_SRGB[Math.round(Math.min(1, Math.max(0, G)) * N_SRGB)];
      sal[j + 2] = A_SRGB[Math.round(Math.min(1, Math.max(0, B)) * N_SRGB)];
      return sal;
    }
    a *= 0.8; b *= 0.8;
  }
  return sal;
}

export function hexARgb(hex){ const n = parseInt(String(hex).replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function rgbAHex(r, g, b){ return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''); }

/* La imagen entera en Lab, una vez. Se rehace sólo cuando se aplica un color.
   Además guarda la CROMATICIDAD (r, g divididos entre r+g+b), que es lo que
   se usa para ELEGIR: una sombra multiplica los tres canales por lo mismo y la
   división se lo come, así que la sombra de un suéter rojo da el mismo número
   que su parte iluminada. En Lab no: lo oscuro pierde color (a y b se
   encogen), y tocar un cabello con mechones agarraba sólo el 8 %.
   El `+ OSC` acerca a gris lo muy oscuro, donde el ruido de la cámara manda. */
const OSC = 30;
export function laboratorio(datos, w, h){
  const n = w * h, L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  const C1 = new Float32Array(n), C2 = new Float32Array(n);
  for(let i = 0, j = 0; i < n; i++, j += 4){
    const r = datos[j], g = datos[j + 1], b = datos[j + 2];
    const [l, a, bb] = labDe(r, g, b);
    L[i] = l; A[i] = a; B[i] = bb;
    const s = r + g + b + OSC;
    C1[i] = (r + OSC / 3) / s; C2[i] = (g + OSC / 3) / s;
  }
  return { L, A, B, C1, C2, w, h };
}

/* El color de referencia de un toque: el promedio de un cuadrito, para que
   un pixel suelto de ruido no decida lo que se elige. */
export function referencia(lab, x, y, radio = 2){
  const { w, h } = lab; let L = 0, a = 0, b = 0, c1 = 0, c2 = 0, n = 0;
  for(let yy = Math.max(0, y - radio); yy <= Math.min(h - 1, y + radio); yy++)
    for(let xx = Math.max(0, x - radio); xx <= Math.min(w - 1, x + radio); xx++){
      const i = yy * w + xx; L += lab.L[i]; a += lab.A[i]; b += lab.B[i]; c1 += lab.C1[i]; c2 += lab.C2[i]; n++;
    }
  return { L: L / n, a: a / n, b: b / n, c1: c1 / n, c2: c2 / n };
}

/* Qué tan distinto es un pixel de la referencia. El COLOR (cromaticidad)
   pesa entero y la LUZ pesa un cuarto: así la sombra del mismo color queda
   cerca, y el negro y el blanco (que tienen la misma cromaticidad, gris) se
   siguen distinguiendo entre sí. ESCALA lleva la cromaticidad a la misma
   medida que Lab: café contra gris claro da ~27, café contra azul ~55. */
export const PESO_LUZ = 0.25, ESCALA = 150;
export function distancia(lab, i, ref){
  const d1 = lab.C1[i] - ref.c1, d2 = lab.C2[i] - ref.c2;
  return ESCALA * Math.sqrt(d1 * d1 + d2 * d2) + PESO_LUZ * Math.abs(lab.L[i] - ref.L);
}

/* Suavidad del borde: de `tol` a `tol·BORDE` el pixel entra a medias. */
const BORDE = 1.35;
const peso = (d, tol) => d <= tol ? 255 : d >= tol * BORDE ? 0 : Math.round(255 * (tol * BORDE - d) / (tol * (BORDE - 1)));

/* Tocar: todo lo del color tocado. `contiguo` = sólo la mancha que toca el
   dedo (el cabello y no la bolsa del mismo color al otro lado de la foto).
   `zona` (0-255, de partes.js) es la PARTE donde cayó el dedo —el cabello, la
   ropa—: lo de afuera no entra aunque sea del mismo color, y como la orilla
   ya la pone el modelo, adentro se puede ser más permisivo con el color
   (`holgura`): así entran los jeans gastados y los mechones claros. */
const ZMIN = 40, ZRANGO = 120;
const enZona = (zona, i) => zona ? Math.max(0, Math.min(1, (zona[i] - ZMIN) / ZRANGO)) : 1;
export function porToque(lab, x, y, { tol = 18, contiguo = true, zona = null, holgura = 1.7 } = {}){
  const { w, h } = lab, n = w * h, m = new Uint8Array(n);
  x = Math.max(0, Math.min(w - 1, Math.round(x))); y = Math.max(0, Math.min(h - 1, Math.round(y)));
  const ref = referencia(lab, x, y);
  if(zona) tol *= holgura;
  if(!contiguo){
    for(let i = 0; i < n; i++) m[i] = peso(distancia(lab, i, ref), tol) * enZona(zona, i);
    return m;
  }
  const visto = new Uint8Array(n), pila = new Int32Array(n); let tope = 0;
  const lim = tol * BORDE;
  const s = y * w + x; pila[tope++] = s; visto[s] = 1;
  while(tope){
    const i = pila[--tope], d = distancia(lab, i, ref);
    if(d >= lim || (zona && zona[i] < ZMIN)) continue;
    m[i] = peso(d, tol) * enZona(zona, i);
    if(d > tol) continue;                       // el borde suave no sigue creciendo
    const px = i % w;
    if(px > 0 && !visto[i - 1]){ visto[i - 1] = 1; pila[tope++] = i - 1; }
    if(px < w - 1 && !visto[i + 1]){ visto[i + 1] = 1; pila[tope++] = i + 1; }
    if(i >= w && !visto[i - w]){ visto[i - w] = 1; pila[tope++] = i - w; }
    if(i < n - w && !visto[i + w]){ visto[i + w] = 1; pila[tope++] = i + w; }
  }
  return m;
}

/* Una parte entera (lo que da partes.js), con la orilla suave. */
export function mascaraDeZona(zona){ const m = new Uint8Array(zona.length); for(let i = 0; i < zona.length; i++) m[i] = 255 * enZona(zona, i); return m; }

/* Pincel de (x0,y0) a (x1,y1). Con `respetar`, sólo pinta lo que se parece a
   donde EMPEZÓ el trazo —y, con `zona`, lo que es de la misma parte—: se pasa
   el dedo por el cabello y la frente de al lado no se pinta aunque el dedo
   se salga. Devuelve la caja que cambió. */
export function pincelada(m, lab, x0, y0, x1, y1, { radio = 20, ref = null, tol = 18, quitar = false, respetar = true, zona = null } = {}){
  const { w, h } = lab, r2 = radio * radio, dura = radio * 0.6;
  const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, radio / 3)));
  const caja = [w, h, -1, -1];
  for(let p = 0; p <= pasos; p++){
    const cx = x0 + (x1 - x0) * p / pasos, cy = y0 + (y1 - y0) * p / pasos;
    const xa = Math.max(0, Math.floor(cx - radio)), xb = Math.min(w - 1, Math.ceil(cx + radio));
    const ya = Math.max(0, Math.floor(cy - radio)), yb = Math.min(h - 1, Math.ceil(cy + radio));
    if(xa < caja[0]) caja[0] = xa; if(ya < caja[1]) caja[1] = ya; if(xb > caja[2]) caja[2] = xb; if(yb > caja[3]) caja[3] = yb;
    for(let y = ya; y <= yb; y++) for(let x = xa; x <= xb; x++){
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if(d2 > r2) continue;
      const i = y * w + x, dd = Math.sqrt(d2);
      let v = dd <= dura ? 255 : Math.round(255 * (radio - dd) / (radio - dura));   // orilla del pincel suave
      if(respetar && ref) v = Math.min(v, peso(distancia(lab, i, ref), zona ? tol * 1.7 : tol) * enZona(zona, i));
      if(quitar) m[i] = Math.min(m[i], 255 - v);
      else if(v > m[i]) m[i] = v;
    }
  }
  return caja;
}

/* ── separar por tono: k-medias sobre la cromaticidad y un poco de luz ──
   Con la misma medida que el toque, una playera con pliegues es UN grupo y no
   tres (con a, b y L salía partida en clara, media y oscura).
   Determinista (semilla fija) para que la misma foto dé los mismos grupos. */
export function grupos(lab, k = 8, semilla = 7){
  const { w, h } = lab, n = w * h;
  let s = semilla >>> 0 || 1; const azar = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const paso = Math.max(1, Math.floor(n / 20000)), mu = [];
  for(let i = 0; i < n; i += paso) mu.push(i);
  const v = (i) => [lab.C1[i] * ESCALA, lab.C2[i] * ESCALA, lab.L[i] * 0.3];
  const d2 = (p, c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
  const pts = mu.map(v);
  /* k-medias++: cada centro nuevo lejos de los que ya hay */
  const cs = [pts[Math.floor(azar() * pts.length)].slice()];
  const dm = pts.map((p) => d2(p, cs[0]));
  while(cs.length < k){
    let tot = 0; for(const d of dm) tot += d;
    if(tot <= 0) break;
    let r = azar() * tot, j = 0; while(j < dm.length - 1 && (r -= dm[j]) > 0) j++;
    cs.push(pts[j].slice());
    for(let q = 0; q < pts.length; q++) dm[q] = Math.min(dm[q], d2(pts[q], cs[cs.length - 1]));
  }
  const cerca = (p) => { let mejor = 0, md = Infinity; for(let c = 0; c < cs.length; c++){ const d = d2(p, cs[c]); if(d < md){ md = d; mejor = c; } } return mejor; };
  for(let it = 0; it < 14; it++){
    const sum = cs.map(() => [0, 0, 0, 0]);
    for(const p of pts){ const c = cerca(p), S = sum[c]; S[0] += p[0]; S[1] += p[1]; S[2] += p[2]; S[3]++; }
    let movio = 0;
    sum.forEach((S, c) => { if(!S[3]) return; const nv = [S[0] / S[3], S[1] / S[3], S[2] / S[3]]; movio += d2(nv, cs[c]); cs[c] = nv; });
    if(movio < 0.01) break;
  }
  const etq = new Uint8Array(n), K = cs.length, p = [0, 0, 0];
  const g = Array.from({ length: K }, () => ({ n: 0, L: 0, a: 0, b: 0, c1: 0, c2: 0 }));
  for(let i = 0; i < n; i++){
    p[0] = lab.C1[i] * ESCALA; p[1] = lab.C2[i] * ESCALA; p[2] = lab.L[i] * 0.3;
    const c = cerca(p), G = g[c]; etq[i] = c;
    G.n++; G.L += lab.L[i]; G.a += lab.A[i]; G.b += lab.B[i]; G.c1 += lab.C1[i]; G.c2 += lab.C2[i];
  }
  /* Juntar los grupos que son el MISMO tono con distinta luz: k-medias parte
     en dos lo más grande aunque sea una sola playera (clara y en sombra).
     Se juntan de a dos, los más parecidos primero; el negro y el blanco no se
     juntan porque la luz los separa (|ΔL| ≥ 30). */
  const raiz = g.map((_, i) => i);
  const vivo = g.map((G) => G.n > 0);
  for(;;){
    let mejor = null, md = 9;
    for(let i = 0; i < K; i++) if(vivo[i]) for(let j = i + 1; j < K; j++) if(vivo[j]){
      const A = g[i], B = g[j];
      const d = ESCALA * Math.hypot(A.c1 / A.n - B.c1 / B.n, A.c2 / A.n - B.c2 / B.n);
      if(d < md && Math.abs(A.L / A.n - B.L / B.n) < 30){ md = d; mejor = [i, j]; }
    }
    if(!mejor) break;
    const [i, j] = mejor, A = g[i], B = g[j];
    for(const k of ['n', 'L', 'a', 'b', 'c1', 'c2']) A[k] += B[k];
    vivo[j] = false; for(let q = 0; q < K; q++) if(raiz[q] === j) raiz[q] = i;
  }
  /* del más grande al más chico */
  const orden = g.map((_, i) => i).filter((i) => vivo[i]).sort((x, y) => g[y].n - g[x].n);
  const nuevo = new Uint8Array(K); for(let q = 0; q < K; q++) nuevo[q] = orden.indexOf(raiz[q]);
  for(let i = 0; i < n; i++) etq[i] = nuevo[etq[i]];
  /* el color que se enseña es el promedio real del grupo, en Lab */
  const centros = orden.map((c) => { const G = g[c], L = G.L / G.n, a = G.a / G.n, b = G.b / G.n; return { L, a, b, n: G.n, parte: G.n / n, hex: rgbAHex(...rgbDe(L, a, b)) }; });
  return { etiquetas: etq, centros };
}

export function mascaraDeGrupo(etq, id){ const m = new Uint8Array(etq.length); for(let i = 0; i < etq.length; i++) if(etq[i] === id) m[i] = 255; return m; }

/* Promedio de la zona elegida, y hasta dónde llega su luz (percentiles 2 y
   98, para que un brillo suelto no aplaste todo lo demás). */
export function estadisticas(lab, m){
  let sw = 0, L = 0, a = 0, b = 0; const hist = new Float64Array(101);
  for(let i = 0; i < m.length; i++){
    const p = m[i]; if(!p) continue;
    sw += p; L += p * lab.L[i]; a += p * lab.A[i]; b += p * lab.B[i];
    hist[Math.max(0, Math.min(100, Math.round(lab.L[i])))] += p;
  }
  if(!sw) return null;
  const pct = (q) => { let acc = 0; for(let i = 0; i <= 100; i++){ acc += hist[i]; if(acc >= q * sw) return i; } return 100; };
  return { L: L / sw, a: a / sw, b: b / sw, bajo: pct(0.02), alto: pct(0.98), peso: sw / 255 };
}

/* Pintar. Para cada pixel elegido:
   · LUZ: con `igualar`, toda la zona se corre a la luz del color elegido
     CONSERVANDO cuánto más clara u oscura era cada parte (los mechones, los
     pliegues). Si el rango no cabe —de cabello rubio a negro— se comprime,
     nunca se corta: el orden de claro a oscuro se respeta siempre.
     Sin `igualar`, la luz se queda exactamente como estaba.
   · COLOR: el elegido, más la mitad de lo que ese pixel se apartaba del
     promedio, para que la zona no quede de un solo color plano.
   `intensidad` (0-1) mezcla con la foto; la máscara da los bordes suaves. */
export function recolorear(src, lab, m, destino, est, { intensidad = 1, igualar = true, variacion = 0.5 } = {}, dst = new Uint8ClampedArray(src), caja = null){
  if(!est) return dst;
  const { w } = lab;
  const [x0, y0, x1, y1] = caja || [0, 0, w - 1, lab.h - 1];
  const sube = Math.min(1, (98 - destino.L) / Math.max(1, est.alto - est.L));
  const baja = Math.min(1, (destino.L - 2) / Math.max(1, est.L - est.bajo));
  const sal = [0, 0, 0];
  for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++){
    const i = y * w + x, p = m[i]; if(!p) continue;
    const j = i * 4, t = (p / 255) * intensidad;
    let L = lab.L[i];
    if(igualar){ const d = L - est.L; L = destino.L + d * (d > 0 ? Math.max(0, sube) : Math.max(0, baja)); }
    rgbDe(L, destino.a + (lab.A[i] - est.a) * variacion, destino.b + (lab.B[i] - est.b) * variacion, sal);
    dst[j] = src[j] + (sal[0] - src[j]) * t;
    dst[j + 1] = src[j + 1] + (sal[1] - src[j + 1]) * t;
    dst[j + 2] = src[j + 2] + (sal[2] - src[j + 2]) * t;
    dst[j + 3] = src[j + 3];
  }
  return dst;
}

/* Lo mismo, pero sin tener la imagen en Lab: para exportar al tamaño
   original, donde guardar tres arreglos de 12 millones no cabe en un iPhone. */
export function recolorearDirecto(datos, m, destino, est, op){
  const n = m.length, sal = [0, 0, 0];
  const sube = Math.min(1, (98 - destino.L) / Math.max(1, est.alto - est.L));
  const baja = Math.min(1, (destino.L - 2) / Math.max(1, est.L - est.bajo));
  const { intensidad = 1, igualar = true, variacion = 0.5 } = op;
  for(let i = 0, j = 0; i < n; i++, j += 4){
    const p = m[i]; if(!p) continue;
    let [L, a, b] = labDe(datos[j], datos[j + 1], datos[j + 2]);
    if(igualar){ const d = L - est.L; L = destino.L + d * (d > 0 ? Math.max(0, sube) : Math.max(0, baja)); }
    rgbDe(L, destino.a + (a - est.a) * variacion, destino.b + (b - est.b) * variacion, sal);
    const t = (p / 255) * intensidad;
    datos[j] += (sal[0] - datos[j]) * t; datos[j + 1] += (sal[1] - datos[j + 1]) * t; datos[j + 2] += (sal[2] - datos[j + 2]) * t;
  }
  return datos;
}

/* Caja que encierra la máscara, o null si está vacía. */
export function cajaDe(m, w, h){
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for(let y = 0, i = 0; y < h; y++) for(let x = 0; x < w; x++, i++) if(m[i]){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
