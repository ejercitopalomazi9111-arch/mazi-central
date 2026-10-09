/* ═══════════════════════════════════════════════════════════════════════════
   CARTELES · MODA — anuncios con caché, para ropa, calzado, bolsas y lociones
   ───────────────────────────────────────────────────────────────────────────
   Carlos (9 de octubre de 2026): «mejora la herramienta de carteles hasta que
   sea capaz de ayudarte de verdad a hacer los anuncios; usa de referencia los
   de Dior, Gucci, Prada, Tommy H, Náutica, MK, Guess, Zara, Liverpool y otros
   que sean de caché».

   Lo que tienen en común esas campañas, y que aquí es regla:
     · la FOTO manda: la prenda grande y limpia, el texto chico;
     · MUCHO AIRE: nada pegado a la orilla, nada amontonado;
     · UNA letra con carácter (una serif fina o una sans muy espaciada) y ya;
     · el logo es una FIRMA, no un letrero: chico, centrado o en una esquina;
     · el llamado a la acción es una línea, no un botón de tienda en línea.

   No se copia ningún logo, monograma ni tipografía registrada de nadie: se
   toma la manera de componer. Cada estilo dice en `para` a qué se parece.

   Campos del producto que se usan (todos opcionales):
     foto · fotos[] (para colección y mosaico) · nombre · frase (el titular)
     kicker (la línea chica de arriba) · cta · precio · antes · promo · color
   ═══════════════════════════════════════════════════════════════════════════ */
import { registrar, rgb, legible, contraste, renglones, recortada, medidas, cajaRedonda, MAY, icono } from './motor.js';

/* ───────────────────────────── letra ───────────────────────────── */
const SERIF = 'Playfair Display', SANS = 'Montserrat', COND = 'Anton';
const f = (fam, peso = 400, it = false) => px => `${it ? 'italic ' : ''}${peso} ${Math.round(px)}px "${fam}"`;
const serif = (peso = 400, it = false) => f(SERIF, peso, it);
const sans = (peso = 500) => f(SANS, peso);

/** Texto con letras separadas (las mayúsculas de lujo). sep en px. Devuelve el ancho. */
export function anchoEsp(ctx, t, sep) { let w = 0; for (const c of t) w += ctx.measureText(c).width; return w + sep * Math.max(0, [...t].length - 1); }
export function espaciado(ctx, t, x, y, sep, alinear = 'left') {
  const cs = [...t], total = anchoEsp(ctx, t, sep);
  let x0 = alinear === 'center' ? x - total / 2 : alinear === 'right' ? x - total : x;
  ctx.save(); ctx.textAlign = 'left';
  if (sep === 0) ctx.fillText(t, x0, y);
  else for (const c of cs) { ctx.fillText(c, x0, y); x0 += ctx.measureText(c).width + sep; }
  ctx.restore(); return total;
}
/** El tamaño mayor (≤max) con el que la línea espaciada cabe en `ancho`. sepRel: separación en «em». */
function tamEsp(ctx, t, fnt, ancho, max, min, sepRel) {
  for (let s = max; s >= min; s -= 1) { ctx.font = fnt(s); if (anchoEsp(ctx, t, s * sepRel) <= ancho) return s; }
  return min;
}
/** Una línea de mayúsculas espaciadas que siempre cabe. Devuelve el alto que ocupó. */
function lineaEsp(ctx, t, x, y, { fnt = sans(600), tam = 22, sep = .32, color = '#000', alinear = 'left', ancho = 900, min = 12 } = {}) {
  if (!t) return 0;
  const T = MAY(t), s = tamEsp(ctx, T, fnt, ancho, tam, min, sep);
  ctx.save(); ctx.font = fnt(s); ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  espaciado(ctx, T, x, y + s * .8, s * sep, alinear); ctx.restore();
  return s;
}
/** Busca el tamaño con el que el texto cabe en la caja en ≤maxR renglones. */
export function caber(ctx, texto, fnt, caja, max, min = 22, inter = 1.08, maxR = 3) {
  const t = String(texto || '').trim();
  for (let s = max; s >= min; s -= 2) {
    ctx.font = fnt(s); const ls = renglones(ctx, t, caja.w);
    if (ls.length <= maxR && ls.length * s * inter <= caja.h && ls.every(l => ctx.measureText(l).width <= caja.w)) return { s, ls, alto: ls.length * s * inter, inter, fnt };
  }
  ctx.font = fnt(min); let ls = renglones(ctx, t, caja.w).slice(0, maxR);
  return { s: min, ls, alto: ls.length * min * inter, inter, fnt };
}
function escribir(ctx, b, x, y, { alinear = 'left', color = '#000', sombra = null } = {}) {
  ctx.save(); ctx.font = b.fnt(b.s); ctx.fillStyle = color; ctx.textAlign = alinear; ctx.textBaseline = 'alphabetic';
  if (sombra) { ctx.shadowColor = sombra; ctx.shadowBlur = b.s * .3; ctx.shadowOffsetY = b.s * .05; }
  b.ls.forEach((l, i) => ctx.fillText(l, x, y + b.s * .82 + i * b.s * b.inter));
  ctx.restore(); return b.alto;
}

/* ───────────────────────────── color ───────────────────────────── */
export function hsl(hex) {
  let [r, g, b] = rgb(hex).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s * 100, l * 100];
}
export function deHsl(h, s, l) {
  s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const c = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [c(0), c(8), c(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const tono = (hex, l, sMax = 60) => { const [h, s] = hsl(hex); return deHsl(h, Math.min(s, sMax), l); };
const alfa = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };

/** El color de la prenda: la mediana de los pixeles con color (los grises sólo si no hay otros). */
export function colorDe(img) {
  if (!img) return '#555555';
  if (img._color) return img._color;
  try {
    const c = document.createElement('canvas'), n = 48; c.width = c.height = n;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data, conColor = [], todos = [], rec = recortada(img);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const px = i / 4, cx = px % n, cy = (px / n) | 0;
      if (!rec && (cx < n * .2 || cx > n * .8 || cy < n * .15 || cy > n * .85)) continue;   // sin recorte: sólo el centro
      const p = [d[i], d[i + 1], d[i + 2]], mx = Math.max(...p), mn = Math.min(...p);
      todos.push(p); if (mx - mn > 40 && mx > 50) conColor.push(p);
    }
    const lista = conColor.length > todos.length * .2 ? conColor : todos;
    if (!lista.length) return (img._color = '#555555');
    const med = k => lista.map(p => p[k]).sort((a, b) => a - b)[lista.length >> 1];
    img._color = '#' + [0, 1, 2].map(k => med(k).toString(16).padStart(2, '0')).join('');
  } catch { img._color = '#555555'; }
  return img._color;
}

/* ───────────────────────────── el logo que se adapta ─────────────────────────────
   Un logo blanco sobre cuadro negro (como el de All's fashion) no se puede poner
   sobre un fondo crema. Si el logo trae un fondo liso, se vuelve transparente
   (la distancia al color del fondo es la opacidad) y, si es de una sola tinta,
   se puede pintar del color que pida cada anuncio: blanco, negro, oro. */
export function logoLimpio(img) {
  if (!img) return null;
  if (img._limpio !== undefined) return img._limpio;
  const { w, h } = medidas(img), esc = Math.min(1, 1400 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * esc); c.height = Math.round(h * esc);
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
  let d; try { d = x.getImageData(0, 0, c.width, c.height); } catch { return (img._limpio = { img, tinta: false }); }
  const p = d.data, W = c.width, H = c.height;
  // ¿las cuatro esquinas son opacas y del mismo color? → fondo liso
  const esq = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]].map(([u, v]) => { const i = (v * W + u) * 4; return [p[i], p[i + 1], p[i + 2], p[i + 3]]; });
  const fondoLiso = esq.every(e => e[3] > 250) && esq.every(e => Math.abs(e[0] - esq[0][0]) + Math.abs(e[1] - esq[0][1]) + Math.abs(e[2] - esq[0][2]) < 30);
  if (fondoLiso) {
    const [fr, fg, fb] = esq[0];
    let max = 1;
    for (let i = 0; i < p.length; i += 4) { const dd = Math.abs(p[i] - fr) + Math.abs(p[i + 1] - fg) + Math.abs(p[i + 2] - fb); if (dd > max) max = dd; }
    for (let i = 0; i < p.length; i += 4) {
      const dd = Math.abs(p[i] - fr) + Math.abs(p[i + 1] - fg) + Math.abs(p[i + 2] - fb);
      const a = Math.max(0, Math.min(1, (dd / max - .08) / .8));
      p[i + 3] = Math.round(255 * a);
    }
  }
  // ¿es de una sola tinta? (todo lo opaco con poco color o del mismo tono)
  let opacos = 0, grises = 0; const tonos = [];
  for (let i = 0; i < p.length; i += 4 * 3) {
    if (p[i + 3] < 128) continue; opacos++;
    const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]);
    if (mx - mn < 40) grises++; else tonos.push(hsl('#' + [p[i], p[i + 1], p[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''))[0]);
  }
  let tinta = opacos > 0 && grises / opacos > .9;
  if (!tinta && tonos.length > opacos * .5) { const m = tonos.sort((a, b) => a - b)[tonos.length >> 1]; tinta = tonos.filter(t => Math.min(Math.abs(t - m), 360 - Math.abs(t - m)) < 18).length / tonos.length > .9; }
  if (fondoLiso) x.putImageData(d, 0, 0);
  // recortar a lo que se ve
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let v = 0; v < H; v += 2) for (let u = 0; u < W; u += 2) if (p[(v * W + u) * 4 + 3] > 40) { if (u < x0) x0 = u; if (u > x1) x1 = u; if (v < y0) y0 = v; if (v > y1) y1 = v; }
  if (x1 <= x0) return (img._limpio = { img, tinta: false });
  const o = document.createElement('canvas'); o.width = x1 - x0 + 5; o.height = y1 - y0 + 5;
  o.getContext('2d').drawImage(c, x0 - 2, y0 - 2, o.width, o.height, 0, 0, o.width, o.height);
  o._tintes = new Map();
  return (img._limpio = { img: o, tinta });
}
/** El logo listo para un fondo: pintado de `color` si es de una tinta; si no, tal cual. */
function logoPara(img, color) {
  const L = logoLimpio(img); if (!L) return null;
  if (!L.tinta || !color) return L.img;
  if (!L.img._tintes.has(color)) {
    const c = document.createElement('canvas'); c.width = L.img.width; c.height = L.img.height;
    const x = c.getContext('2d'); x.drawImage(L.img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    L.img._tintes.set(color, c);
  }
  return L.img._tintes.get(color);
}
/** La firma de la marca: el logo (pintado del color pedido) o el nombre en serif espaciada. */
export function firma(ctx, marca, caja, color, alinear = 'center') {
  const im = marca.logo ? logoPara(marca.logo, color) : null;
  if (im) {
    const { w: iw, h: ih } = medidas(im), e = Math.min(caja.w / iw, caja.h / ih), w = iw * e, h = ih * e;
    const x = alinear === 'left' ? caja.x : alinear === 'right' ? caja.x + caja.w - w : caja.x + (caja.w - w) / 2;
    // logo de colores que no se lee sobre el fondo: sobre una placa
    if (!logoLimpio(marca.logo).tinta && marca._placa) { ctx.save(); ctx.fillStyle = marca._placa; cajaRedonda(ctx, x - 18, caja.y + (caja.h - h) / 2 - 14, w + 36, h + 28, 14); ctx.fill(); ctx.restore(); }
    ctx.drawImage(im, x, caja.y + (caja.h - h) / 2, w, h);
    return { x, y: caja.y + (caja.h - h) / 2, w, h };
  }
  const t = MAY(marca.nombre || 'Tu marca'), fnt = serif(500);
  const s = tamEsp(ctx, t, fnt, caja.w, Math.min(caja.h * .7, 90), 16, .22);
  ctx.save(); ctx.font = fnt(s); ctx.fillStyle = color; ctx.textBaseline = 'middle';
  const w = espaciado(ctx, t, alinear === 'left' ? caja.x : alinear === 'right' ? caja.x + caja.w : caja.x + caja.w / 2, caja.y + caja.h / 2, s * .22, alinear);
  ctx.restore();
  return { x: caja.x + (caja.w - w) / 2, y: caja.y, w, h: caja.h };
}

/* ───────────────────────────── la prenda ───────────────────────────── */
/** Pinta la prenda en la caja. Recortada: contenida, parada abajo y con su sombra de piso.
    Foto normal: cubre la caja con las esquinas `rad`. Devuelve dónde quedó. */
export function prenda(ctx, img, caja, { rad = 0, sombra = 'rgba(0,0,0,.35)', piso = true, abajo = true, borde = null, gris = false } = {}) {
  if (!img) { ctx.save(); ctx.strokeStyle = 'rgba(128,128,128,.6)'; ctx.setLineDash([16, 12]); ctx.lineWidth = 3; ctx.strokeRect(caja.x, caja.y, caja.w, caja.h); ctx.restore(); return caja; }
  const src = gris ? enGris(img) : img;
  const { w: iw, h: ih } = medidas(img);
  ctx.save();
  if (recortada(img)) {
    const e = Math.min(caja.w / iw, caja.h / ih), w = iw * e, h = ih * e, x = caja.x + (caja.w - w) / 2, y = abajo ? caja.y + caja.h - h : caja.y + (caja.h - h) / 2;
    if (piso && sombra) {
      const g = ctx.createRadialGradient(x + w / 2, y + h, 0, x + w / 2, y + h, w * .55);
      g.addColorStop(0, sombra); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(x + w / 2, y + h); ctx.scale(1, .12); ctx.translate(-(x + w / 2), -(y + h)); ctx.fillStyle = g; ctx.fillRect(x - w * .1, y + h - w * .6, w * 1.2, w * 1.2); ctx.restore();
    }
    if (sombra) { ctx.shadowColor = sombra; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26; }
    ctx.drawImage(src, x, y, w, h); ctx.restore();
    return { x, y, w, h };
  }
  if (sombra) { ctx.shadowColor = sombra; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; }
  cajaRedonda(ctx, caja.x, caja.y, caja.w, caja.h, rad); ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip();
  const e = Math.max(caja.w / iw, caja.h / ih);
  ctx.drawImage(src, caja.x + (caja.w - iw * e) / 2, caja.y + (caja.h - ih * e) / 2, iw * e, ih * e);
  ctx.restore();
  if (borde) { ctx.save(); cajaRedonda(ctx, caja.x, caja.y, caja.w, caja.h, rad); ctx.lineWidth = 3; ctx.strokeStyle = borde; ctx.stroke(); ctx.restore(); }
  return caja;
}
/** Blanco y negro con contraste, a mano (Safari no tiene ctx.filter). */
function enGris(img) {
  if (img._gris) return img._gris;
  const { w, h } = medidas(img), e = Math.min(1, 1600 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * e); c.height = Math.round(h * e);
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
  try {
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { let v = .3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2]; v = Math.max(0, Math.min(255, (v - 128) * 1.25 + 128)); p[i] = p[i + 1] = p[i + 2] = v; }
    x.putImageData(d, 0, 0);
  } catch {}
  c._recortada = recortada(img);
  return (img._gris = c);
}
/** Grano de película, siempre el mismo (no depende de la semilla). */
let GRANO = null;
function grano(ctx, W, H, a = .07) {
  if (!GRANO) {
    GRANO = document.createElement('canvas'); GRANO.width = GRANO.height = 180;
    const x = GRANO.getContext('2d'), d = x.createImageData(180, 180); let s = 7;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) >>> 0; const v = s >>> 24; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
  }
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(GRANO, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}
function viñeta(ctx, W, H, centro, orilla, cx = .5, cy = .45) {
  const g = ctx.createRadialGradient(W * cx, H * cy, 0, W * cx, H * cy, Math.max(W, H) * .78);
  g.addColorStop(0, centro); g.addColorStop(1, orilla); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* ───────────────────────────── medidas por formato ───────────────────────────── */
/** Márgenes seguros: las historias dejan libre arriba (nombre) y abajo (responder). */
function marco(W, H) {
  const hist = H > 1500, cuad = H <= 1100;
  return { hist, cuad, M: 76, T: hist ? 220 : cuad ? 52 : 70, B: hist ? 340 : cuad ? 56 : 76, k: hist ? 1.12 : cuad ? .86 : 1 };
}
/** El llamado: el del producto, o «Pide por DM», o el WhatsApp si la marca lo trae. */
function llamado(d) {
  if (d.prod.cta) return d.prod.cta;
  if (d.marca.whatsapp) return 'WhatsApp ' + d.marca.whatsapp;
  return 'Pide la tuya por DM';
}
/** Llamado como línea espaciada con subrayado fino (como en las campañas). Devuelve alto. */
function llamadoLinea(ctx, t, x, y, color, alinear = 'center', tam = 22, ancho = 900) {
  const T = MAY(t), fnt = sans(600), s = tamEsp(ctx, T, fnt, ancho, tam, 13, .3);
  ctx.save(); ctx.font = fnt(s); ctx.fillStyle = color; const w = anchoEsp(ctx, T, s * .3);
  espaciado(ctx, T, x, y + s * .8, s * .3, alinear);
  const x0 = alinear === 'center' ? x - w / 2 : alinear === 'right' ? x - w : x;
  ctx.fillRect(x0, y + s * 1.25, w, Math.max(1.5, s * .07)); ctx.restore();
  return s * 1.5;
}
/** Llamado en píldora (para los estilos de tienda). */
function llamadoPildora(ctx, t, cx, y, fondo, letra, { tam = 24, contorno = false, alinear = 'center', ancho = 900 } = {}) {
  const T = MAY(t), fnt = sans(700), s = tamEsp(ctx, T, fnt, ancho - 90, tam, 13, .18);
  ctx.save(); ctx.font = fnt(s); const w = anchoEsp(ctx, T, s * .18) + s * 3.2, h = s * 2.6;
  const x = alinear === 'center' ? cx - w / 2 : alinear === 'right' ? cx - w : cx;
  cajaRedonda(ctx, x, y, w, h, h / 2);
  if (contorno) { ctx.lineWidth = 2.5; ctx.strokeStyle = fondo; ctx.stroke(); } else { ctx.fillStyle = fondo; ctx.fill(); }
  ctx.fillStyle = letra; ctx.textBaseline = 'middle'; espaciado(ctx, T, x + w / 2, y + h / 2 + 1, s * .18, 'center');
  ctx.restore(); return h;
}
/** El precio con el de antes tachado, si lo hay. */
function precio(ctx, p, x, y, { tam = 96, color = '#111', tenue = '#888', alinear = 'left', fam = SERIF, peso = 500 } = {}) {
  if (!p.precio) return 0;
  ctx.save(); ctx.textBaseline = 'alphabetic';
  const pr = String(p.precio).trim(), an = p.antes ? String(p.antes).trim() : '';
  ctx.font = f(fam, peso)(tam); const wp = ctx.measureText(pr).width;
  ctx.font = f(SANS, 500)(tam * .34); const wa = an ? ctx.measureText(an).width + tam * .3 : 0;
  let x0 = alinear === 'center' ? x - (wp + wa) / 2 : alinear === 'right' ? x - wp - wa : x;
  if (an) { ctx.fillStyle = tenue; ctx.fillText(an, x0, y - tam * .05); ctx.fillRect(x0 - 4, y - tam * .05 - tam * .12, wa - tam * .3 + 8, Math.max(2, tam * .03)); x0 += wa; }
  ctx.font = f(fam, peso)(tam); ctx.fillStyle = color; ctx.fillText(pr, x0, y);
  ctx.restore(); return tam;
}
const titular = (p, def) => p.frase || p.nombre || def;

/* ═════════════════════════════ LOS ESTILOS ═════════════════════════════ */

/* MAISON — como Dior: crema, serif fina, el logo como firma arriba, la prenda
   en medio con aire de sobra y un llamado subrayado. */
function maison(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), tinta = '#1F1B16', gris = '#7A7268';
  ctx.fillStyle = d.colores.claro && hsl(d.colores.claro)[2] > 80 ? d.colores.claro : '#F3EEE6'; ctx.fillRect(0, 0, W, H);
  viñeta(ctx, W, H, 'rgba(255,255,255,.55)', 'rgba(120,100,70,.10)');
  const hLogo = 162 * m.k;
  firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hLogo }, tinta);
  // abajo, de abajo hacia arriba: llamado, titular, línea chica
  const tit = caber(ctx, titular(p, 'Nueva colección'), serif(400), { w: W - m.M * 2.4, h: 190 * m.k }, 78 * m.k, 36, 1.12, 2);
  const yCta = H - m.B - 34, yTit = yCta - 44 - tit.alto, yKick = yTit - 54;
  lineaEsp(ctx, p.kicker || 'Nueva colección', W / 2, yKick, { color: gris, alinear: 'center', tam: 20, ancho: W - m.M * 2 });
  escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: tinta });
  llamadoLinea(ctx, llamado(d), W / 2, yCta, tinta, 'center', 20);
  const zona = { x: m.M, y: m.T + hLogo + 50 * m.k, w: W - m.M * 2, h: yKick - 50 * m.k - (m.T + hLogo + 50 * m.k) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { ...zona, x: m.M + 40, w: W - m.M * 2 - 80 }, { sombra: 'rgba(60,40,20,.28)' });
}

/* PASARELA — como Gucci: fondo de color pleno y saturado, grano de película,
   titular en serif cursiva grande y blanco, la prenda enorme. */
const PALETA_PASARELA = ['#0F4D32', '#6B1020', '#1B2F8F', '#B8862B', '#C9708A', '#3E2A1E', '#0E5560'];
function pasarela(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H);
  const cp = p.color || (p.foto ? colorDe(p.foto) : null), [, sat, lum] = cp ? hsl(cp) : [0, 0, 50];
  // si la prenda tiene color propio, el fondo lo acompaña; si es neutra, un color de la paleta
  const base = sat > 28 && lum > 12 && lum < 80 ? tono(cp, 26, 70) : r.uno(PALETA_PASARELA);
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  viñeta(ctx, W, H, 'rgba(255,255,255,.14)', 'rgba(0,0,0,.42)', .5, .5);
  grano(ctx, W, H, .09);
  const izq = r.si();
  const kick = lineaEsp(ctx, p.kicker || 'Otoño · Invierno', izq ? m.M : W - m.M, m.T, { color: 'rgba(255,255,255,.82)', alinear: izq ? 'left' : 'right', tam: 22, ancho: W * .7 });
  const tit = caber(ctx, titular(p, 'La temporada'), serif(500, true), { w: W * .78, h: 360 * m.k }, 124 * m.k, 48, 1.08, 3);
  const yTit = m.T + kick + 26; escribir(ctx, tit, izq ? m.M : W - m.M, yTit, { alinear: izq ? 'left' : 'right', color: '#FFFFFF', sombra: 'rgba(0,0,0,.25)' });
  const hLogo = 124 * m.k, yLogo = H - m.B - hLogo;
  firma(ctx, marca, { x: W * .32, y: yLogo, w: W * .36, h: hLogo }, '#FFFFFF');
  const hCta = 34, yCta = yLogo - 30 - hCta;
  llamadoLinea(ctx, llamado(d), W / 2, yCta, '#FFFFFF', 'center', 20);
  const zona = { x: m.M * .5, y: yTit + tit.alto + 26, w: W - m.M, h: yCta - 36 - (yTit + tit.alto + 26) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { ...zona, x: m.M, w: W - m.M * 2 }, { sombra: 'rgba(0,0,0,.45)' });
}

/* MINIMAL — como Zara o Prada: blanco o gris perla, el nombre de la marca
   GIGANTE arriba y la prenda montada encima; casi nada más de texto. */
function minimal(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), tinta = '#111111';
  const fondo = r.si(.6) ? '#F5F5F3' : '#E9E8E4'; ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
  // el nombre gigante, de orilla a orilla
  let yAbajo;
  const L = marca.logo ? logoLimpio(marca.logo) : null;
  if (L && L.tinta) {
    const im = logoPara(marca.logo, tinta), { w: iw, h: ih } = medidas(im), e = Math.min((W - 80) / iw, (H * .26) / ih);
    ctx.drawImage(im, (W - iw * e) / 2, m.T - 10, iw * e, ih * e); yAbajo = m.T - 10 + ih * e;
  } else {
    const t = MAY(marca.nombre || 'Marca'), fnt = serif(800);
    let s = 400; ctx.font = fnt(s); while (s > 60 && anchoEsp(ctx, t, -s * .03) > W - 60) { s -= 4; ctx.font = fnt(s); }
    ctx.save(); ctx.fillStyle = tinta; ctx.textBaseline = 'alphabetic'; espaciado(ctx, t, W / 2, m.T + s * .78, -s * .03, 'center'); ctx.restore();
    yAbajo = m.T + s * .82;
  }
  // abajo: el titular chico a la izquierda, la línea y el llamado a la derecha
  const anchoTxt = W * .5;
  const tit = caber(ctx, titular(p, 'Nueva temporada'), sans(500), { w: anchoTxt, h: 170 * m.k }, 44 * m.k, 24, 1.2, 3);
  const yTxt = H - m.B - tit.alto;
  escribir(ctx, tit, m.M, yTxt, { color: tinta });
  lineaEsp(ctx, p.kicker || 'Nueva temporada', W - m.M, yTxt, { alinear: 'right', color: '#6A6A6A', tam: 21, ancho: W * .36 });
  lineaEsp(ctx, '→ ' + llamado(d), W - m.M, yTxt + 44, { alinear: 'right', color: tinta, tam: 21, ancho: W * .36, fnt: sans(700) });
  const zona = { x: m.M, y: yAbajo - (yAbajo - m.T) * .45, w: W - m.M * 2, h: yTxt - 40 - (yAbajo - (yAbajo - m.T) * .45) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { x: m.M, y: yAbajo + 30, w: W - m.M * 2, h: yTxt - 60 - yAbajo }, { sombra: 'rgba(0,0,0,.18)' });
}

/* PREPPY — como Tommy: blanco arriba, marino abajo, una banderita de tres
   colores y mayúsculas gruesas. La prenda pisa la línea entre los dos. */
const MARINO = '#0C2340', ROJO = '#C8102E';
function bandera(ctx, x, y, w, h) {
  /* un listón de grosgrain: rayas horizontales marino-blanco-rojo-blanco-marino */
  const rayas = [MARINO, '#FFFFFF', ROJO, '#FFFFFF', MARINO], k = h / rayas.length;
  ctx.save(); rayas.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x, y + i * k, w, k + .5); }); ctx.restore();
}
function preppy(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  const hLogo = 135 * m.k; firma(ctx, marca, { x: m.M, y: m.T, w: W * .38, h: hLogo }, MARINO, 'left');
  bandera(ctx, W - m.M - 150, m.T + hLogo / 2 - 22, 150, 44);
  // el bloque marino con el texto
  const tit = caber(ctx, MAY(titular(p, 'Clásicos de siempre')), f(SANS, 800), { w: W - m.M * 2, h: 220 * m.k }, 96 * m.k, 40, 1.0, 2);
  const hCta = 62, yCta = H - m.B - hCta, yTit = yCta - 36 - tit.alto, yKick = yTit - 46;
  const yBloque = yKick - 120 * m.k - (m.hist ? 220 : 120);
  ctx.fillStyle = MARINO; ctx.fillRect(0, yBloque, W, H - yBloque);
  lineaEsp(ctx, p.kicker || 'Nueva temporada', m.M, yKick, { color: '#FF5A6E', tam: 22, ancho: W - m.M * 2, fnt: sans(700) });
  escribir(ctx, tit, m.M, yTit, { color: '#FFFFFF' });
  llamadoPildora(ctx, llamado(d), m.M, yCta, ROJO, '#FFFFFF', { alinear: 'left', tam: 22, ancho: W - m.M * 2 });
  const zona = { x: m.M, y: m.T + hLogo + 40, w: W - m.M * 2, h: yKick - 50 - (m.T + hLogo + 40) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { x: m.M, y: m.T + hLogo + 40, w: W - m.M * 2, h: yBloque + 120 - (m.T + hLogo + 40) }, { sombra: 'rgba(12,35,64,.35)' });
}

/* NÁUTICO — como Náutica: marino profundo, rayas marineras detrás de la
   prenda, mayúsculas espaciadas en blanco y un toque rojo. */
function nautico(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H);
  ctx.fillStyle = '#0B1F3A'; ctx.fillRect(0, 0, W, H);
  viñeta(ctx, W, H, 'rgba(255,255,255,.06)', 'rgba(0,0,0,.35)');
  const hLogo = 135 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hLogo }, '#FFFFFF');
  const tit = caber(ctx, MAY(titular(p, 'Hecho para el viento')), f(SANS, 600), { w: W - m.M * 2, h: 170 * m.k }, 64 * m.k, 30, 1.12, 2);
  const hCta = 62, yCta = H - m.B - hCta, yTit = yCta - 40 - tit.alto, yKick = yTit - 48;
  ctx.fillStyle = ROJO; ctx.fillRect(W / 2 - 14, yKick - 34, 28, 10);
  lineaEsp(ctx, p.kicker || 'Colección', W / 2, yKick, { color: '#9FB3CF', alinear: 'center', tam: 21, ancho: W - m.M * 2 });
  escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: '#FFFFFF' });
  llamadoPildora(ctx, llamado(d), W / 2, yCta, '#FFFFFF', '#FFFFFF', { contorno: true, tam: 21 });
  const zona = { x: m.M, y: m.T + hLogo + 46, w: W - m.M * 2, h: yKick - 70 - (m.T + hLogo + 46) };
  // rayas marineras detrás de la prenda
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.09)';
  const y0 = zona.y + zona.h * .18, y1 = zona.y + zona.h * .82;
  for (let y = y0; y < y1; y += 46) ctx.fillRect(0, y, W, 18);
  ctx.restore();
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { ...zona, x: m.M + 60, w: W - m.M * 2 - 120 }, { sombra: 'rgba(0,0,0,.5)', borde: recortada(p.foto) ? null : '#FFFFFF' });
}

/* GLAMOUR — como Guess: blanco y negro con mucho contraste, mayúsculas serif
   enormes y un solo toque rojo. La foto completa en gris, o la prenda a color
   sobre negro. */
function glamour(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), rojo = '#D0112B';
  const rec = recortada(p.foto);
  if (p.foto && !rec) {
    prenda(ctx, p.foto, { x: 0, y: 0, w: W, h: H }, { sombra: null, gris: true });
    const g = ctx.createLinearGradient(0, H * .45, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.88)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createLinearGradient(0, 0, 0, H * .25); g2.addColorStop(0, 'rgba(0,0,0,.55)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H * .25);
  } else { ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H); viñeta(ctx, W, H, 'rgba(255,255,255,.10)', 'rgba(0,0,0,.6)'); }
  grano(ctx, W, H, .06);
  const hLogo = 130 * m.k; firma(ctx, marca, { x: W * .32, y: m.T, w: W * .36, h: hLogo }, '#FFFFFF');
  const tit = caber(ctx, MAY(titular(p, 'Hecha para mirarte')), serif(900), { w: W - m.M * 2, h: 260 * m.k }, 120 * m.k, 44, .98, 2);
  const yCta = H - m.B - 34, yTit = yCta - 40 - tit.alto, yKick = yTit - 54;
  // el triángulo rojo invertido como acento (genérico, no el de nadie)
  ctx.save(); ctx.fillStyle = rojo; ctx.beginPath(); ctx.moveTo(m.M, yKick + 4); ctx.lineTo(m.M + 30, yKick + 4); ctx.lineTo(m.M + 15, yKick + 28); ctx.closePath(); ctx.fill(); ctx.restore();
  lineaEsp(ctx, p.kicker || 'Nueva colección', m.M + 48, yKick, { color: '#FFFFFF', tam: 22, ancho: W - m.M * 2 - 48 });
  escribir(ctx, tit, m.M, yTit, { color: '#FFFFFF' });
  llamadoLinea(ctx, llamado(d), m.M, yCta, '#FFFFFF', 'left', 20);
  if (rec || !p.foto) prenda(ctx, p.foto, { x: m.M, y: m.T + hLogo + 40, w: W - m.M * 2, h: yKick - 60 - (m.T + hLogo + 40) }, { sombra: 'rgba(0,0,0,.7)' });
}

/* DORADO — como Michael Kors: arena y camello, letras finas muy espaciadas,
   oro en los detalles. */
function oro(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#8A6630'); g.addColorStop(.35, '#D8B66C'); g.addColorStop(.5, '#F4E3AA'); g.addColorStop(.65, '#C9A55A'); g.addColorStop(1, '#8A6630');
  return g;
}
function dorado(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), cafe = '#3E2D1E';
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#EDE3D2'); g.addColorStop(1, '#CDB491'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  viñeta(ctx, W, H, 'rgba(255,255,255,.35)', 'rgba(90,60,30,.12)');
  const hLogo = 140 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hLogo }, cafe);
  ctx.fillStyle = oro(ctx, W * .4, 0, W * .6, 0); ctx.fillRect(W / 2 - 60, m.T + hLogo + 26, 120, 2);
  const T = MAY(titular(p, 'Lujo para diario')), fnt = sans(300);
  const tit = caber(ctx, T, fnt, { w: W - m.M * 2.2, h: 170 * m.k }, 66 * m.k, 28, 1.25, 2);
  const yCta = H - m.B - 62, yTit = yCta - 44 - tit.alto, yKick = yTit - 50;
  ctx.save(); ctx.font = fnt(tit.s); ctx.fillStyle = cafe; ctx.textBaseline = 'alphabetic';
  tit.ls.forEach((l, i) => { const sep = tit.s * .14, w = anchoEsp(ctx, l, sep); espaciado(ctx, l, W / 2 - Math.min(w, W - m.M * 2) / 2, yTit + tit.s * .82 + i * tit.s * tit.inter, w > W - m.M * 2 ? 0 : sep, 'left'); });
  ctx.restore();
  ctx.save(); ctx.font = sans(700)(21); const kT = MAY(p.kicker || 'Colección especial'), sk = tamEsp(ctx, kT, sans(700), W - m.M * 2, 21, 13, .34); ctx.font = sans(700)(sk);
  ctx.fillStyle = oro(ctx, W * .25, 0, W * .75, 0); espaciado(ctx, kT, W / 2, yKick + sk * .8, sk * .34, 'center'); ctx.restore();
  llamadoPildora(ctx, llamado(d), W / 2, yCta, '#B08D4A', cafe, { contorno: true, tam: 21 });
  const zona = { x: m.M, y: m.T + hLogo + 60, w: W - m.M * 2, h: yKick - 50 - (m.T + hLogo + 60) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { ...zona, x: m.M + 50, w: W - m.M * 2 - 100 }, { sombra: 'rgba(80,50,20,.3)', rad: recortada(p.foto) ? 0 : 6 });
}

/* REBAJA — como la temporada de rebajas de Zara: blanco, la palabra enorme
   en negro y la prenda chica. El precio tachado, si lo hay. */
function rebaja(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), tinta = '#0A0A0A';
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  const hLogo = 113 * m.k; firma(ctx, marca, { x: W * .34, y: m.T, w: W * .32, h: hLogo }, tinta);
  const palabra = MAY(p.promo || (p.antes ? 'Rebajas' : 'Nueva temporada'));
  const tit = caber(ctx, palabra, f(COND), { w: W - m.M * 2, h: (m.hist ? 560 : m.cuad ? 300 : 420) }, m.hist ? 300 : 260, 70, .92, 2);
  const yTit = m.T + hLogo + 40; escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: tinta });
  const yCta = H - m.B - 62; let yAbajo = yCta - 30;
  if (p.precio) { precio(ctx, p, W / 2, yAbajo - 10, { tam: 92 * m.k, color: tinta, alinear: 'center' }); yAbajo -= 110 * m.k; }
  const nom = p.frase || p.nombre; if (nom) { const b = caber(ctx, nom, sans(500), { w: W - m.M * 2, h: 90 }, 32, 20, 1.2, 2); yAbajo -= b.alto + 14; escribir(ctx, b, W / 2, yAbajo, { alinear: 'center', color: '#444' }); }
  llamadoPildora(ctx, llamado(d), W / 2, yCta, tinta, '#FFFFFF', { tam: 22 });
  const zona = { x: m.M * 2, y: yTit + tit.alto + 30, w: W - m.M * 4, h: yAbajo - 30 - (yTit + tit.alto + 30) };
  prenda(ctx, p.foto, zona, { sombra: 'rgba(0,0,0,.18)' });
}

/* DEPARTAMENTAL — como las ventas especiales de las tiendas departamentales:
   rosa fuerte, letras blancas grandes, la prenda sobre una placa blanca. */
function departamental(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), rosa = '#E1007A';
  ctx.fillStyle = rosa; ctx.fillRect(0, 0, W, H);
  viñeta(ctx, W, H, 'rgba(255,255,255,.12)', 'rgba(80,0,40,.25)');
  const hLogo = 122 * m.k; firma(ctx, marca, { x: W * .32, y: m.T, w: W * .36, h: hLogo }, '#FFFFFF');
  const kick = lineaEsp(ctx, p.kicker || 'Precio especial', W / 2, m.T + hLogo + 36, { color: '#FFE3F0', alinear: 'center', tam: 24, ancho: W - m.M * 2, fnt: sans(700) });
  const tit = caber(ctx, MAY(p.promo || titular(p, 'Lo nuevo ya llegó')), f(SANS, 900), { w: W - m.M * 2, h: 260 * m.k }, 130 * m.k, 44, .98, 2);
  const yTit = m.T + hLogo + 36 + kick + 20; escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: '#FFFFFF' });
  const yCta = H - m.B - 62; let yAb = yCta - 30;
  if (p.precio) { precio(ctx, p, W / 2, yAb - 6, { tam: 96 * m.k, color: '#FFFFFF', tenue: '#FFC2DD', alinear: 'center', fam: SANS, peso: 800 }); yAb -= 116 * m.k; }
  llamadoPildora(ctx, llamado(d), W / 2, yCta, '#FFFFFF', rosa, { tam: 22 });
  const placa = { x: m.M, y: yTit + tit.alto + 30, w: W - m.M * 2, h: yAb - 26 - (yTit + tit.alto + 30) };
  ctx.save(); ctx.shadowColor = 'rgba(90,0,45,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; ctx.fillStyle = '#FFFFFF'; cajaRedonda(ctx, placa.x, placa.y, placa.w, placa.h, 28); ctx.fill(); ctx.restore();
  prenda(ctx, p.foto, recortada(p.foto) ? { x: placa.x + 30, y: placa.y + 30, w: placa.w - 60, h: placa.h - 50 } : { x: placa.x + 14, y: placa.y + 14, w: placa.w - 28, h: placa.h - 28 }, { rad: 18, sombra: recortada(p.foto) ? 'rgba(0,0,0,.18)' : null });
}

/* ESTUDIO — la prenda bajo una luz de estudio sobre negro, letra serif
   cursiva y el acento de la marca. (El que mejor salió con All's fashion.) */
function estudio(ctx, W, H, d, r) {
  const { marca, prod: p, colores: C } = d, m = marco(W, H), ac = d.acentoModa;
  ctx.fillStyle = '#070707'; ctx.fillRect(0, 0, W, H);
  viñeta(ctx, W, H, '#2C2A27', 'rgba(7,7,7,1)', .5, .44);
  const hLogo = 148 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hLogo }, '#FFFFFF');
  const tit = caber(ctx, titular(p, 'Recién llegada'), serif(500, true), { w: W - m.M * 2, h: 210 * m.k }, 92 * m.k, 40, 1.04, 2);
  const yCta = H - m.B - 62, yTit = yCta - 36 - tit.alto, yKick = yTit - 50;
  lineaEsp(ctx, p.kicker || 'Nuevo en tienda', W / 2, yKick, { color: ac, alinear: 'center', tam: 22, ancho: W - m.M * 2 });
  escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: '#FFFFFF' });
  llamadoPildora(ctx, llamado(d), W / 2, yCta, ac, ac, { contorno: true, tam: 22 });
  const zona = { x: m.M * .6, y: m.T + hLogo + 30, w: W - m.M * 1.2, h: yKick - 40 - (m.T + hLogo + 30) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { ...zona, x: m.M + 30, w: W - m.M * 2 - 60 }, { sombra: 'rgba(0,0,0,.75)', rad: 10 });
}

/* REVISTA — portada: el logo de cabecera enorme, la prenda montada encima,
   líneas de portada a la izquierda y un sello redondo. */
function revista(ctx, W, H, d, r, rec, o) {
  const { marca, prod: p } = d, m = marco(W, H), claro = r.si(), ac = d.acentoModa;
  const tinta = claro ? '#151412' : '#FFFFFF';
  if (claro) { ctx.fillStyle = '#F2EDE4'; ctx.fillRect(0, 0, W, H); } else { ctx.fillStyle = '#0B0B0B'; ctx.fillRect(0, 0, W, H); viñeta(ctx, W, H, '#26231F', 'rgba(11,11,11,1)', .5, .6); }
  const sello = claro ? '#9A7B45' : ac;
  lineaEsp(ctx, `Edición Nº ${String(o.numero || 1).padStart(2, '0')}`, m.M - 12, m.T - 26, { color: sello, tam: 19, ancho: W * .4 });
  lineaEsp(ctx, p.temporada || 'Otoño · Invierno', W - m.M + 12, m.T - 26, { color: sello, tam: 19, ancho: W * .4, alinear: 'right' });
  const mast = firma(ctx, marca, { x: m.M, y: m.T + 6, w: W - m.M * 2, h: H * (m.hist ? .2 : m.cuad ? .2 : .25) }, tinta);
  const lineas = [[p.kicker || 'Lo nuevo', p.nombre || titular(p, 'De temporada')], [p.linea2a || 'Pregunta', p.linea2b || 'Por la tuya, por DM']];
  const xL = m.M, anchoL = W * .34;
  let yL = H - m.B - 20;
  const bloques = lineas.map(([a, b]) => ({ a, b: caber(ctx, b, serif(500, true), { w: anchoL, h: 130 }, 44 * m.k, 24, 1.05, 3) }));
  for (let i = bloques.length - 1; i >= 0; i--) { yL -= bloques[i].b.alto + 30; bloques[i].y = yL; }
  const zona = { x: W * .3, y: mast.y + mast.h * .55, w: W * .66, h: H - m.B - (mast.y + mast.h * .55) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { x: m.M + W * .34 + 30, y: mast.y + mast.h + 20, w: W - m.M * 2 - W * .34 - 30, h: H - m.B - (mast.y + mast.h + 20) }, { sombra: 'rgba(0,0,0,.45)', rad: 6 });
  bloques.forEach(({ a, b, y }) => {
    lineaEsp(ctx, a, xL, y, { color: sello, tam: 18, ancho: anchoL, fnt: sans(700) });
    escribir(ctx, b, xL, y + 30, { color: tinta, sombra: claro ? null : 'rgba(0,0,0,.8)' });
  });
  // sello redondo
  const R = 104, cx = W - m.M - R + 20, cy = H - m.B - R + 10;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.18); ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
  ctx.fillStyle = '#141312'; const st = MAY(o.formato === 'historia' ? 'Responde y aparta' : (p.cta || 'Pide por DM'));
  const b = caber(ctx, st, sans(800), { w: R * 1.45, h: R * 1.1 }, 30, 15, 1.12, 3); escribir(ctx, b, 0, -b.alto / 2, { alinear: 'center', color: '#141312' });
  ctx.restore();
}

/* ETIQUETA — la prenda con una etiqueta de cartón colgando de un hilo. */
function etiqueta(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), ac = d.acentoModa;
  ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H); viñeta(ctx, W, H, '#2A2825', 'rgba(8,8,8,1)', .42, .45);
  const hLogo = 135 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hLogo }, '#FFFFFF');
  const tit = caber(ctx, titular(p, 'Pregunta por la tuya'), serif(500, true), { w: W - m.M * 2, h: 190 * m.k }, 80 * m.k, 36, 1.05, 2);
  const yCta = H - m.B - 62, yTit = yCta - 36 - tit.alto;
  escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: '#FFFFFF' });
  llamadoPildora(ctx, llamado(d), W / 2, yCta, ac, ac, { contorno: true, tam: 22 });
  const zona = { x: m.M * .5, y: m.T + hLogo + 30, w: W * .66, h: yTit - 40 - (m.T + hLogo + 30) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { ...zona, x: m.M }, { sombra: 'rgba(0,0,0,.7)', rad: 8 });
  // la etiqueta
  const tw = 300, th = 400, tx = W - m.M - tw + 30, ty = zona.y + zona.h * .5 - th / 2;
  ctx.save(); ctx.strokeStyle = ac; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx + tw / 2, ty + 36); ctx.quadraticCurveTo(tx - 40, ty - 60, zona.x + zona.w * .62, zona.y + 40); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(tx + tw / 2, ty + th / 2); ctx.rotate(.09); ctx.translate(-tw / 2, -th / 2);
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18; ctx.fillStyle = '#F2EDE4';
  ctx.beginPath(); ctx.moveTo(tw * .22, 0); ctx.lineTo(tw * .78, 0); ctx.lineTo(tw, th * .14); ctx.lineTo(tw, th); ctx.lineTo(0, th); ctx.lineTo(0, th * .14); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.fillStyle = '#1A1917'; ctx.beginPath(); ctx.arc(tw / 2, 36, 15, 0, 7); ctx.fill();
  lineaEsp(ctx, p.precio ? 'Precio' : 'Precio y tallas', tw / 2, 88, { color: '#9A7B45', alinear: 'center', tam: 19, ancho: tw - 40, fnt: sans(700) });
  if (p.precio) { let t = 92; ctx.font = serif(500)(t); while (t > 40 && ctx.measureText(String(p.precio)).width + (p.antes ? t * 1.6 : 0) > tw - 40) { t -= 4; ctx.font = serif(500)(t); } precio(ctx, p, tw / 2, 230, { tam: t, color: '#151412', alinear: 'center' }); }
  else escribir(ctx, caber(ctx, 'Por DM', serif(600, true), { w: tw - 40, h: 120 }, 62, 30, 1, 1), tw / 2, 140, { alinear: 'center', color: '#151412' });
  lineaEsp(ctx, p.nombre || 'Te contestamos', tw / 2, th - 90, { color: '#6B655C', alinear: 'center', tam: 18, ancho: tw - 50 });
  ctx.restore();
}

/* COLOR — el fondo es el color de la prenda, oscurecido, con una palabra
   gigante calada detrás. */
function color(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H);
  const c = p.color || (p.foto ? colorDe(p.foto) : '#444444');
  const g = ctx.createRadialGradient(W / 2, H * .46, 0, W / 2, H * .46, Math.max(W, H) * .75); g.addColorStop(0, tono(c, 30, 55)); g.addColorStop(1, tono(c, 11, 55));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); grano(ctx, W, H, .05);
  const hLogo = 140 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hLogo }, '#FFFFFF');
  const palabra = MAY(p.palabra || p.categoria || 'Style');
  ctx.save(); let s = 360; ctx.font = f(COND)(s); while (s > 100 && ctx.measureText(palabra).width > W * 1.1) { s -= 10; ctx.font = f(COND)(s); }
  ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 3; ctx.textAlign = 'center'; ctx.strokeText(palabra, W / 2, H * .44 + s * .35); ctx.restore();
  const tit = caber(ctx, titular(p, 'Esta no dura'), serif(900), { w: W - m.M * 2, h: 200 * m.k }, 88 * m.k, 38, 1.0, 2);
  const yCta = H - m.B - 62, yTit = yCta - 36 - tit.alto, yKick = yTit - 50;
  lineaEsp(ctx, p.kicker || 'Recién llegada', W / 2, yKick, { color: 'rgba(255,255,255,.78)', alinear: 'center', tam: 22, ancho: W - m.M * 2 });
  escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: '#FFFFFF' });
  llamadoPildora(ctx, llamado(d), W / 2, yCta, '#FFFFFF', tono(c, 18, 55), { tam: 22 });
  const zona = { x: m.M * .6, y: m.T + hLogo + 30, w: W - m.M * 1.2, h: yKick - 40 - (m.T + hLogo + 30) };
  prenda(ctx, p.foto, recortada(p.foto) ? zona : { ...zona, x: m.M + 30, w: W - m.M * 2 - 60 }, { sombra: 'rgba(0,0,0,.5)', rad: 10 });
}

/* COLECCIÓN — dos o tres prendas juntas, «escoge tu color». */
function coleccion(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), claro = r.si(), ac = d.acentoModa;
  const tinta = claro ? '#151412' : '#FFFFFF';
  if (claro) { ctx.fillStyle = '#F2EDE4'; ctx.fillRect(0, 0, W, H); } else { ctx.fillStyle = '#0B0B0B'; ctx.fillRect(0, 0, W, H); viñeta(ctx, W, H, '#26231F', 'rgba(11,11,11,1)'); }
  const hLogo = 130 * m.k; firma(ctx, marca, { x: W * .32, y: m.T, w: W * .36, h: hLogo }, tinta);
  const kick = lineaEsp(ctx, p.kicker || 'Mismo modelo', W / 2, m.T + hLogo + 34, { color: claro ? '#9A7B45' : ac, alinear: 'center', tam: 21, ancho: W - m.M * 2 });
  const tit = caber(ctx, titular(p, 'Escoge tu color'), serif(900), { w: W - m.M * 2, h: 180 * m.k }, 84 * m.k, 36, 1.0, 2);
  const yTit = m.T + hLogo + 34 + kick + 18; escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: tinta });
  const yCta = H - m.B - 62;
  llamadoPildora(ctx, llamado(d), W / 2, yCta, claro ? '#151412' : ac, claro ? '#FFFFFF' : ac, { tam: 22, contorno: !claro });
  const fotos = (p.fotos && p.fotos.length ? p.fotos : [p.foto]).filter(Boolean).slice(0, 3);
  const zona = { x: m.M * .3, y: yTit + tit.alto + 30, w: W - m.M * .6, h: yCta - 34 - (yTit + tit.alto + 30) };
  const n = Math.max(1, fotos.length), solape = n > 1 ? .14 : 0, w1 = zona.w / (n - solape * (n - 1));
  const orden = n === 3 ? [0, 2, 1] : fotos.map((_, i) => i);      // la de en medio al frente
  orden.forEach(i => {
    const alto = n === 3 && i === 1 ? zona.h : zona.h * .9;
    prenda(ctx, fotos[i], { x: zona.x + i * w1 * (1 - solape), y: zona.y + zona.h - alto, w: w1, h: alto }, { sombra: claro ? 'rgba(60,40,10,.3)' : 'rgba(0,0,0,.6)', rad: 8, piso: i === 1 || n < 3 });
  });
  if (!fotos.length) prenda(ctx, null, zona);
}

/* MOSAICO — cuatro (o seis, en historia) fotos y el logo en una medalla. */
function mosaico(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), ac = d.acentoModa;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const filas = m.hist ? 3 : 2, tira = m.hist ? 300 : 110, g = 10;
  const fotos = (p.fotos && p.fotos.length ? p.fotos : [p.foto]).filter(Boolean);
  const cw = (W - g * 3) / 2, ch = (H - tira - g * (filas + 1)) / filas;
  for (let i = 0; i < filas * 2; i++) {
    const im = fotos[i % Math.max(1, fotos.length)], x = g + (i % 2) * (cw + g), y = g + Math.floor(i / 2) * (ch + g);
    if (!im) continue;
    if (recortada(im)) { ctx.fillStyle = i % 3 === 0 ? '#F2EDE4' : '#1A1917'; ctx.fillRect(x, y, cw, ch); prenda(ctx, im, { x: x + 20, y: y + 20, w: cw - 40, h: ch - 30 }, { sombra: 'rgba(0,0,0,.35)' }); }
    else prenda(ctx, im, { x, y, w: cw, h: ch }, { sombra: null });
  }
  const R = 160, cx = W / 2, cy = g + (H - tira - g) / 2;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, 7); ctx.fillStyle = '#000'; ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = ac; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = '#0B0B0C'; ctx.fill(); ctx.restore();
  firma(ctx, marca, { x: cx - R * .78, y: cy - R * .5, w: R * 1.56, h: R }, '#FFFFFF');
  ctx.fillStyle = '#0B0B0C'; ctx.fillRect(0, H - tira, W, tira);
  lineaEsp(ctx, p.frase || p.kicker || '¿Cuál te llevas?', W / 2, H - tira + (m.hist ? 40 : 38), { color: ac, alinear: 'center', tam: 25, ancho: W - 100, fnt: sans(700) });
}

/* VITRINA — una foto del lugar o del montón, en un marco con filo de oro. */
function vitrina(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), ac = d.acentoModa;
  ctx.fillStyle = '#0B0B0C'; ctx.fillRect(0, 0, W, H);
  const hLogo = 140 * m.k; firma(ctx, marca, { x: W * .32, y: m.T, w: W * .36, h: hLogo }, '#FFFFFF');
  const tit = caber(ctx, titular(p, 'Todo en un solo lugar'), serif(500, true), { w: W - m.M * 2, h: 180 * m.k }, 84 * m.k, 36, 1.04, 2);
  const lista = p.lista || p.kicker || 'Ropa · Tenis · Bolsas · Lociones · y más';
  const yCta = H - m.B - 62, yLista = yCta - 50, yTit = yLista - 22 - tit.alto;
  escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: '#FFFFFF' });
  lineaEsp(ctx, lista, W / 2, yLista, { color: ac, alinear: 'center', tam: 22, ancho: W - m.M * 2, fnt: sans(600) });
  llamadoPildora(ctx, llamado(d), W / 2, yCta, ac, '#141312', { tam: 22 });
  const caja = { x: m.M - 12, y: m.T + hLogo + 34, w: W - (m.M - 12) * 2, h: yTit - 36 - (m.T + hLogo + 34) };
  if (p.foto && recortada(p.foto)) { ctx.fillStyle = '#1A1917'; cajaRedonda(ctx, caja.x, caja.y, caja.w, caja.h, 26); ctx.fill(); prenda(ctx, p.foto, { x: caja.x + 30, y: caja.y + 30, w: caja.w - 60, h: caja.h - 40 }, { sombra: 'rgba(0,0,0,.6)' }); }
  else prenda(ctx, p.foto, caja, { rad: 26, sombra: null });
  ctx.save(); cajaRedonda(ctx, caja.x, caja.y, caja.w, caja.h, 26); ctx.lineWidth = 2.5; ctx.strokeStyle = ac; ctx.stroke(); ctx.restore();
}

/* PORTADA — la foto a sangre, oscurecida abajo, con el titular encima. */
function portada(ctx, W, H, d, r) {
  const { marca, prod: p } = d, m = marco(W, H), ac = d.acentoModa;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (p.foto && recortada(p.foto)) { viñeta(ctx, W, H, tono(colorDe(p.foto), 28, 50), '#050505'); prenda(ctx, p.foto, { x: 40, y: m.T + 60, w: W - 80, h: H * .62 }, { sombra: 'rgba(0,0,0,.7)' }); }
  else prenda(ctx, p.foto, { x: 0, y: 0, w: W, h: H }, { sombra: null });
  const g = ctx.createLinearGradient(0, H * .4, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, 'rgba(0,0,0,.66)'); g.addColorStop(1, 'rgba(0,0,0,.93)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createLinearGradient(0, 0, 0, H * .24); g2.addColorStop(0, 'rgba(0,0,0,.62)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H * .24);
  const hLogo = 140 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hLogo }, '#FFFFFF');
  const tit = caber(ctx, titular(p, 'Lo nuevo'), serif(500, true), { w: W - m.M * 2, h: 210 * m.k }, 92 * m.k, 40, 1.04, 2);
  const yCta = H - m.B - 62, yTit = yCta - 36 - tit.alto, yKick = yTit - 50;
  lineaEsp(ctx, p.kicker || 'Nuevo en tienda', W / 2, yKick, { color: ac, alinear: 'center', tam: 22, ancho: W - m.M * 2 });
  escribir(ctx, tit, W / 2, yTit, { alinear: 'center', color: '#FFFFFF', sombra: 'rgba(0,0,0,.5)' });
  llamadoPildora(ctx, llamado(d), W / 2, yCta, ac, '#141312', { tam: 22 });
}

/* ───────────────────────────── registro ───────────────────────────── */
/* El acento de los estilos oscuros: el de la marca si se lee sobre negro; si no, champaña. */
function conAcento(fn) {
  return (ctx, W, H, d, r, rec, o) => {
    const a = d.colores.acento;
    d.acentoModa = a && contraste(a, '#0B0B0B') >= 4.5 && hsl(a)[1] < 85 ? a : '#CDAE74';
    return fn(ctx, W, H, d, r, rec, o || {});
  };
}
export const ESTILOS_MODA = [
  { id: 'maison', nombre: 'Maison', para: 'Lujo francés: crema, serif fina y mucho aire (como Dior)', fn: maison },
  { id: 'pasarela', nombre: 'Pasarela', para: 'Color pleno, grano de película y cursiva grande (como Gucci)', fn: pasarela },
  { id: 'minimal', nombre: 'Minimal', para: 'Tu nombre gigante y la prenda encima; casi sin texto (como Zara o Prada)', fn: minimal },
  { id: 'preppy', nombre: 'Preppy', para: 'Blanco y marino con banderita de tres colores (como Tommy)', fn: preppy },
  { id: 'nautico', nombre: 'Náutico', para: 'Marino con rayas marineras y un toque rojo (como Náutica)', fn: nautico },
  { id: 'glamour', nombre: 'Glamour', para: 'Blanco y negro, serif enorme y un toque rojo (como Guess)', fn: glamour },
  { id: 'dorado', nombre: 'Dorado', para: 'Arena, camello y oro, letra fina muy espaciada (como Michael Kors)', fn: dorado },
  { id: 'rebaja', nombre: 'Rebaja', para: 'Blanco, la palabra enorme en negro y el precio tachado (como las rebajas de Zara)', fn: rebaja },
  { id: 'departamental', nombre: 'Departamental', para: 'Rosa fuerte y letras blancas, venta especial (como las tiendas departamentales)', fn: departamental },
  { id: 'estudio', nombre: 'Estudio', para: 'La prenda bajo luz de estudio sobre negro', fn: estudio },
  { id: 'revista', nombre: 'Revista', para: 'Portada de revista con tu logo de cabecera', fn: revista },
  { id: 'etiqueta', nombre: 'Etiqueta', para: 'La prenda con su etiqueta de cartón colgando', fn: etiqueta },
  { id: 'color', nombre: 'Su color', para: 'El fondo del color de la prenda, con palabra calada', fn: color },
  { id: 'coleccion', nombre: 'Colección', para: 'Dos o tres prendas juntas: escoge tu color', fn: coleccion, varias: true },
  { id: 'mosaico', nombre: 'Mosaico', para: 'Cuatro o seis fotos con tu logo en medalla', fn: mosaico, varias: true },
  { id: 'vitrina', nombre: 'Vitrina', para: 'Una foto del lugar o del montón, enmarcada', fn: vitrina },
  { id: 'portada', nombre: 'Portada', para: 'La foto completa con el titular encima', fn: portada },
];
for (const e of ESTILOS_MODA) registrar({ id: e.id, nombre: e.nombre, para: e.para, grupo: 'moda', varias: !!e.varias }, conAcento(e.fn));
