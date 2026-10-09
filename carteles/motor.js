/* ═══════════════════════════════════════════════════════════════════════════
   CARTELES · el motor
   ───────────────────────────────────────────────────────────────────────────
   Carlos: «necesito hacer cientos de carteles diferentes para cada producto
   para subirlos a redes cada día… de marcas varias diferentes entre sí para no
   aburrir al cliente, de una manera mecanizada y constante».

   Un cartel = marca + producto + estilo + formato + semilla.
     · la MARCA trae logo, colores, juego de letras y contacto;
     · el PRODUCTO trae foto, nombre, frase, precio, promo e ingredientes;
     · el ESTILO es la composición (brocha, gigante, semana, foto, limpio, bloque);
     · la SEMILLA decide lo que varía dentro del estilo —lado de la foto, giro
       del título, qué trazos, qué etiquetas—, así que la misma pareja
       marca/producto da cartel distinto cada día sin que nadie lo diseñe.

   Todo se pinta en un <canvas>: no hay servidor, la foto no sale del teléfono,
   y lo que sale es un PNG listo para subir.
   ═══════════════════════════════════════════════════════════════════════════ */

export const FORMATOS = {
  feed:     { w: 1080, h: 1350, nombre: 'Publicación 4:5' },
  historia: { w: 1080, h: 1920, nombre: 'Historia 9:16' },
  cuadro:   { w: 1080, h: 1080, nombre: 'Cuadrado 1:1' },
};

/* Juegos de letras: título · bloque (condensada) · texto · a mano */
export const LETRAS = {
  brocha:   { titulo: 'Permanent Marker', bloque: 'Anton', texto: 'Montserrat', mano: 'Kalam', tw: 400 },
  impacto:  { titulo: 'Anton', bloque: 'Bebas Neue', texto: 'Oswald', mano: 'Kalam', tw: 400 },
  elegante: { titulo: 'Playfair Display', bloque: 'Montserrat', texto: 'Montserrat', mano: 'Kalam', tw: 800 },
};

export const ESTILOS = [
  { id: 'brocha', grupo: 'comida', nombre: 'Brocha',        para: 'Producto estrella con ingredientes, como el Bananito' },
  { id: 'gigante', nombre: 'Promo gigante', para: '2x1, 3x2, «segundo a $1»: la promo en letras enormes' },
  { id: 'semana',  nombre: 'La semana',     para: 'Las promos de cada día en un solo cartel' },
  { id: 'foto',    nombre: 'Foto limpia',   para: 'La foto manda; logo y nombre discretos' },
  { id: 'limpio',  nombre: 'Claro',         para: 'Fondo claro y editorial, para marcas finas' },
  { id: 'bloque',  nombre: 'Bloques',       para: 'Colores planos en diagonal, muy de redes' },
];

/* ───────────────────────────── azar con semilla ───────────────────────────── */
export function azar(semilla) {
  let s = (typeof semilla === 'number' ? semilla : hash(String(semilla))) >>> 0 || 1;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  r.entre = (a, b) => a + (b - a) * r();
  r.uno = (lista) => lista[Math.floor(r() * lista.length)];
  r.si = (p = .5) => r() < p;
  return r;
}
export function hash(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ───────────────────────────── color ───────────────────────────── */
export function rgb(hex) { const v = hex.replace('#', ''); const n = parseInt(v.length === 3 ? v.split('').map(c => c + c).join('') : v, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
export function luz(hex) {
  const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
  const [r, g, b] = rgb(hex); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
}
export function contraste(a, b) { const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); }
/** El que más se lee sobre `fondo` entre los candidatos. */
export function legible(fondo, ...candidatos) { return candidatos.reduce((m, c) => contraste(c, fondo) > contraste(m, fondo) ? c : m); }
function rgba(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }

/* ───────────────────────────── texto ───────────────────────────── */
function fuente(px, familia, peso = 400, estilo = '') { return `${estilo} ${peso} ${Math.round(px)}px "${familia}"`.trim(); }
/** El tamaño más grande (≤ max) con el que `texto` cabe en `ancho` en un renglón. */
export function ajustar(ctx, texto, familia, ancho, max, min = 12, peso = 400) {
  let lo = min, hi = max;
  ctx.font = fuente(hi, familia, peso);
  if (ctx.measureText(texto).width <= ancho) return hi;
  for (let i = 0; i < 18; i++) {
    const m = (lo + hi) / 2; ctx.font = fuente(m, familia, peso);
    if (ctx.measureText(texto).width <= ancho) lo = m; else hi = m;
  }
  return Math.floor(lo);
}
/** Parte en renglones que caben en `ancho`. */
export function renglones(ctx, texto, ancho) {
  const palabras = String(texto).split(/\s+/).filter(Boolean), out = [];
  let linea = '';
  for (const p of palabras) {
    const prueba = linea ? linea + ' ' + p : p;
    if (ctx.measureText(prueba).width > ancho && linea) { out.push(linea); linea = p; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}
/** Bloque de texto que cabe en una caja: busca el tamaño mayor con el que caben los renglones. */
export function bloque(ctx, texto, familia, peso, caja, max, min = 14, interlinea = 1.05, maxRenglones = 4) {
  let tam = max, ls;
  for (; tam >= min; tam -= 2) {
    ctx.font = fuente(tam, familia, peso);
    ls = renglones(ctx, texto, caja.w);
    const alto = ls.length * tam * interlinea;
    if (ls.length <= maxRenglones && alto <= caja.h && ls.every(l => ctx.measureText(l).width <= caja.w)) break;
  }
  tam = Math.max(tam, min); ctx.font = fuente(tam, familia, peso); ls = renglones(ctx, texto, caja.w);
  return { tam, lineas: ls, alto: ls.length * tam * interlinea, interlinea };
}
function pintarBloque(ctx, b, x, y, alinear = 'left', familia, peso, color, sombra) {
  ctx.save(); ctx.font = fuente(b.tam, familia, peso); ctx.fillStyle = color; ctx.textAlign = alinear; ctx.textBaseline = 'alphabetic';
  if (sombra) { ctx.shadowColor = sombra; ctx.shadowBlur = b.tam * .25; ctx.shadowOffsetY = b.tam * .06; }
  b.lineas.forEach((l, i) => ctx.fillText(l, x, y + b.tam * .82 + i * b.tam * b.interlinea));
  ctx.restore();
}
const MAY = t => String(t || '').toLocaleUpperCase('es-MX');

/* ───────────────────────────── trazos ───────────────────────────── */
/** Brochazo: rectángulo de orillas rotas con vetas, como pintura con brocha seca. */
export function brochazo(ctx, x, y, w, h, color, r, { inclina = 0, vetas = true } = {}) {
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(inclina); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = color; ctx.beginPath();
  const pasos = Math.max(8, Math.round(w / 18));
  ctx.moveTo(r.entre(0, w * .03), r.entre(0, h * .12));
  for (let i = 1; i <= pasos; i++) ctx.lineTo(w * i / pasos, r.entre(-h * .04, h * .14));
  ctx.lineTo(w + r.entre(0, w * .04), h * r.entre(.3, .7));
  for (let i = pasos; i >= 0; i--) ctx.lineTo(w * i / pasos, h - r.entre(-h * .04, h * .14));
  ctx.lineTo(r.entre(-w * .04, 0), h * r.entre(.3, .7));
  ctx.closePath(); ctx.fill();
  if (vetas) {
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = r.entre(.15, .5); ctx.lineWidth = r.entre(1, 3);
      const yy = r.entre(h * .1, h * .9), x0 = r.entre(-w * .05, w * .5);
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + r.entre(w * .2, w * .7), yy + r.entre(-3, 3)); ctx.stroke();
    }
    // salpicaduras en la punta
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(w + r.entre(4, w * .06), r.entre(0, h), r.entre(1, h * .05), 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
/** Subrayado que adelgaza en las puntas, hecho a mano. */
export function subrayado(ctx, x, y, w, grosor, color, r) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  const cy = y + r.entre(-grosor, grosor);
  ctx.moveTo(x, y + grosor * .2);
  ctx.quadraticCurveTo(x + w * .5, cy - grosor * .6, x + w, y - grosor * .4);
  ctx.quadraticCurveTo(x + w * .5, cy + grosor * .9, x, y + grosor * .2);
  ctx.fill(); ctx.restore();
}
/** Flecha dibujada a mano, de (x1,y1) a (x2,y2). */
export function flecha(ctx, x1, y1, x2, y2, color, grosor, r) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const mx = (x1 + x2) / 2 + r.entre(-30, 30), my = (y1 + y2) / 2 + r.entre(-40, -10);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
  const ang = Math.atan2(y2 - my, x2 - mx), l = grosor * 5;
  ctx.beginPath(); ctx.moveTo(x2 - l * Math.cos(ang - .5), y2 - l * Math.sin(ang - .5)); ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - l * Math.cos(ang + .5), y2 - l * Math.sin(ang + .5)); ctx.stroke(); ctx.restore();
}
/** Rayitas de «¡mira!» alrededor de un punto. */
export function destellos(ctx, cx, cy, radio, color, grosor, r, n = 3, desde = -2.6, hasta = -.5) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = desde + (hasta - desde) * (n === 1 ? .5 : i / (n - 1)) + r.entre(-.08, .08);
    const l = radio * r.entre(.25, .4);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * radio, cy + Math.sin(a) * radio);
    ctx.lineTo(cx + Math.cos(a) * (radio + l), cy + Math.sin(a) * (radio + l)); ctx.stroke();
  }
  ctx.restore();
}
function cajaRedonda(ctx, x, y, w, h, rad) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, rad) : ctx.rect(x, y, w, h); }

/* ───────────────────────────── fondo ───────────────────────────── */
function fondoOscuro(ctx, W, H, color, rec, r, { polvo = true } = {}) {
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  if (rec.textura) {
    ctx.save(); ctx.globalAlpha = .22; ctx.globalCompositeOperation = 'overlay';
    const t = rec.textura, esc = Math.max(W / t.width, H / t.height);
    ctx.drawImage(t, (W - t.width * esc) / 2, (H - t.height * esc) / 2, t.width * esc, t.height * esc); ctx.restore();
  }
  const g = ctx.createRadialGradient(W * r.entre(.35, .65), H * .4, W * .1, W / 2, H / 2, Math.max(W, H) * .75);
  g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (polvo) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 260; i++) { ctx.beginPath(); ctx.arc(r() * W, r() * H, r.entre(.5, 2.2), 0, 7); ctx.fill(); }
    ctx.restore();
  }
}

/* ───────────────────────────── foto ───────────────────────────── */
/** ¿La foto trae transparencia (recortada)? Se mira una sola vez y se guarda en el objeto. */
export function recortada(img) {
  if (!img) return false;
  if (img._recortada !== undefined) return img._recortada;
  try {
    const c = document.createElement('canvas'), s = 48; c.width = c.height = s;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, s, s);
    const d = x.getImageData(0, 0, s, s).data; let t = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 200) t++;
    img._recortada = t > s * s * .04;
  } catch { img._recortada = false; }
  return img._recortada;
}
function medidas(img) { return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height }; }
/** Dibuja la foto dentro de la caja: recortada → contenida con sombra; normal → cubre la caja con esquinas. */
function pintarFoto(ctx, img, caja, { rad = 28, sombra = true, borde = null, encuadre = 'cubrir', brillo = null } = {}) {
  if (!img) return;
  const { w: iw, h: ih } = medidas(img);
  ctx.save();
  if (recortada(img) || encuadre === 'contener') {
    const esc = Math.min(caja.w / iw, caja.h / ih), w = iw * esc, h = ih * esc;
    const x = caja.x + (caja.w - w) / 2, y = caja.y + (caja.h - h) / 2;
    if (brillo) {
      const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * .65);
      g.addColorStop(0, brillo); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - w * .3, y - h * .3, w * 1.6, h * 1.6);
    }
    if (sombra) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 24; }
    ctx.drawImage(img, x, y, w, h);
  } else {
    if (sombra) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 18; }
    cajaRedonda(ctx, caja.x, caja.y, caja.w, caja.h, rad); ctx.fillStyle = '#000'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.clip();
    const esc = Math.max(caja.w / iw, caja.h / ih), w = iw * esc, h = ih * esc;
    ctx.drawImage(img, caja.x + (caja.w - w) / 2, caja.y + (caja.h - h) / 2, w, h);
    if (borde) { ctx.restore(); ctx.save(); cajaRedonda(ctx, caja.x, caja.y, caja.w, caja.h, rad); ctx.lineWidth = 6; ctx.strokeStyle = borde; ctx.stroke(); }
  }
  ctx.restore();
}
function hueco(ctx, caja, color, texto, familia) {
  ctx.save(); cajaRedonda(ctx, caja.x, caja.y, caja.w, caja.h, 28); ctx.setLineDash([18, 14]); ctx.lineWidth = 4;
  ctx.strokeStyle = rgba(color, .5); ctx.stroke(); ctx.fillStyle = rgba(color, .6); ctx.textAlign = 'center';
  ctx.font = fuente(36, familia, 600); ctx.fillText(texto, caja.x + caja.w / 2, caja.y + caja.h / 2); ctx.restore();
}

/* ───────────────────────────── logo, iconos y contacto ───────────────────────────── */
function pintarLogo(ctx, marca, caja, color, L, centrado = true) {
  if (marca.logo) {
    const { w: iw, h: ih } = medidas(marca.logo), esc = Math.min(caja.w / iw, caja.h / ih);
    const w = iw * esc, h = ih * esc, x = centrado ? caja.x + (caja.w - w) / 2 : caja.x;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 16; ctx.drawImage(marca.logo, x, caja.y + (caja.h - h) / 2, w, h); ctx.restore();
    return { x, y: caja.y + (caja.h - h) / 2, w, h };
  }
  const t = MAY(marca.nombre || 'Tu marca');
  const tam = ajustar(ctx, t, L.bloque, caja.w, caja.h * .8, 18);
  ctx.save(); ctx.font = fuente(tam, L.bloque); ctx.fillStyle = color; ctx.textAlign = centrado ? 'center' : 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(t, centrado ? caja.x + caja.w / 2 : caja.x, caja.y + caja.h / 2); ctx.restore();
  return { x: caja.x, y: caja.y, w: caja.w, h: caja.h };
}
function icono(ctx, rec, nombre, x, y, tam, color) {
  const im = rec.icono && rec.icono(nombre, color);
  if (im && (im.complete === undefined || im.complete)) ctx.drawImage(im, x, y, tam, tam);
}
/** Barra de contacto: WhatsApp y dirección. Devuelve el alto que ocupó. */
function pintarContacto(ctx, W, y, marca, colores, L, rec, { linea = true, alto = 110, margen = 70 } = {}) {
  const tel = (marca.whatsapp || '').trim(), dir = (marca.direccion || '').trim();
  if (!tel && !dir) return 0;
  ctx.save();
  if (linea) { ctx.strokeStyle = rgba(colores.acento, .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(margen, y); ctx.lineTo(W - margen, y); ctx.stroke(); }
  const cy = y + alto / 2 + 6, ic = 56;
  const partes = [tel && { ic: 'message-circle', t: tel }, dir && { ic: 'map-pin', t: dir }].filter(Boolean);
  const anchoCol = (W - margen * 2) / partes.length;
  partes.forEach((p, i) => {
    const x0 = margen + anchoCol * i + (partes.length === 1 ? anchoCol / 2 - 200 : 0);
    icono(ctx, rec, p.ic, x0, cy - ic / 2, ic, colores.acento);
    const tam = ajustar(ctx, p.t, L.texto, anchoCol - ic - 40, 40, 20, 700);
    ctx.font = fuente(tam, L.texto, 700); ctx.fillStyle = colores.texto; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(p.t, x0 + ic + 18, cy);
    if (i > 0 && partes.length > 1) { ctx.strokeStyle = rgba(colores.acento, .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 - 24, cy - 34); ctx.lineTo(x0 - 24, cy + 34); ctx.stroke(); }
  });
  ctx.restore();
  return alto;
}
/** El precio grande: «$109», con el signo más chico. */
function pintarPrecio(ctx, precio, x, y, tam, familia, color, alinear = 'left', sombra = 'rgba(0,0,0,.5)') {
  const t = String(precio || '').trim(); if (!t) return 0;
  const m = t.match(/^\$?\s*([\d.,]+)(.*)$/);
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  if (sombra) { ctx.shadowColor = sombra; ctx.shadowBlur = tam * .12; ctx.shadowOffsetY = tam * .04; }
  if (m) {
    const [, num, resto] = m, chico = tam * .55;
    ctx.font = fuente(chico, familia); const ws = ctx.measureText('$').width;
    ctx.font = fuente(tam, familia); const wn = ctx.measureText(num).width;
    ctx.font = fuente(chico * .7, familia); const wr = resto ? ctx.measureText(resto).width : 0;
    const total = ws + wn + wr + 6;
    let x0 = alinear === 'center' ? x - total / 2 : alinear === 'right' ? x - total : x;
    ctx.textAlign = 'left';
    ctx.font = fuente(chico, familia); ctx.fillText('$', x0, y - tam * .32); x0 += ws + 6;
    ctx.font = fuente(tam, familia); ctx.fillText(num, x0, y); x0 += wn;
    if (resto) { ctx.font = fuente(chico * .7, familia); ctx.fillText(resto, x0, y); }
    ctx.restore(); return total;
  }
  ctx.font = fuente(tam, familia); ctx.textAlign = alinear; ctx.fillText(t, x, y); const w = ctx.measureText(t).width; ctx.restore(); return w;
}

/* ═════════════════════════════ LOS ESTILOS ═════════════════════════════ */

/* BROCHA — el del Bananito: fondo oscuro con textura, título a brocha, foto al
   centro, ingredientes señalados con flechas a mano y la promo abajo. */
function estiloBrocha(ctx, W, H, d, r, rec) {
  const { marca, prod, colores: C, L } = d, M = 64, alto = H > 1500, cuadro = H <= 1100;
  fondoOscuro(ctx, W, H, C.fondo, rec, r);
  // logo, y la frase chica a mano en el hueco de un lado
  const yLogo = alto ? 90 : 40, hLogo = alto ? 200 : cuadro ? 120 : 150, wLogo = W * .46;
  pintarLogo(ctx, marca, { x: (W - wLogo) / 2, y: yLogo, w: wLogo, h: hLogo }, C.acento, L);
  const lado = r.si() ? 1 : -1;
  if (prod.lema) {
    const wL = (W - wLogo) / 2 - M - 10;
    ctx.save(); ctx.translate(lado > 0 ? M : W - M, yLogo + 10); ctx.rotate(-.1 * lado);
    const b = bloque(ctx, prod.lema, L.mano, 700, { w: wL, h: hLogo - 10 }, 42, 20, 1.05, 3);
    pintarBloque(ctx, b, 0, 0, lado > 0 ? 'left' : 'right', L.mano, 700, C.acento);
    ctx.restore();
  }
  // título
  const yT = yLogo + hLogo + (alto ? 50 : 14), giro = r.entre(-.06, .02);
  const nombre = MAY(prod.nombre || 'Producto');
  const tamT = ajustar(ctx, nombre, L.titulo, W - M * 2.6, alto ? 230 : cuadro ? 150 : 190, 56, L.tw);
  ctx.save(); ctx.translate(W / 2, yT + tamT * .8); ctx.rotate(giro);
  ctx.font = fuente(tamT, L.titulo, L.tw); ctx.textAlign = 'center'; ctx.fillStyle = C.acento;
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.fillText(nombre, 0, 0);
  const anchoT = ctx.measureText(nombre).width;
  ctx.shadowColor = 'transparent'; subrayado(ctx, -anchoT / 2, tamT * .2, anchoT, 14, C.acento, r);
  if (r.si(.6)) icono(ctx, rec, 'crown', anchoT / 2 - 34, -tamT * 1.02, tamT * .38, C.acento);
  ctx.restore();
  let y = yT + tamT * 1.15;
  if (prod.frase) {
    const f = MAY(prod.frase), tam = ajustar(ctx, f, L.texto, W * .7, 32, 16, 700);
    ctx.save(); ctx.font = fuente(tam, L.texto, 700); ctx.fillStyle = C.texto; ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
    ctx.translate(W / 2, y + 30); ctx.rotate(giro); ctx.fillText(f, 0, 0); ctx.restore(); y += 56;
  }
  // abajo: contacto; arriba de él, la promo (se mide antes para repartir el alto)
  const yContacto = H - (alto ? 220 : cuadro ? 120 : 140);
  const wPromo = W * .6;
  const enc = prod.promo ? MAY(prod.promo) : '';
  const det = prod.detalle ? bloque(ctx, MAY(prod.detalle), L.bloque, 400, { w: wPromo, h: alto ? 250 : cuadro ? 120 : 180 }, alto ? 104 : 88, 36, 1.0, 3) : null;
  const tamP = prod.precio ? (alto ? 190 : cuadro ? 120 : 150) : 0;
  const hPromo = (enc ? 96 : 0) + (det ? det.alto + 4 : 0) + (tamP ? tamP * 1.02 : 0);
  const yPromo = yContacto - 24 - hPromo;
  // la foto: recortada se deja crecer detrás de la promo; normal se queda arriba de ella
  const ingr = (prod.ingredientes || []).filter(Boolean).slice(0, 4);
  const colIzq = ingr.length ? W * .3 : 0;
  const esRecorte = prod.foto && recortada(prod.foto);
  const zonaFoto = { x: lado > 0 ? M + colIzq : M, y: y + 6, w: W - M * 2 - colIzq, h: (esRecorte ? yContacto - 40 : yPromo - 16) - (y + 6) };
  if (lado < 0 && colIzq) zonaFoto.x = M;
  if (prod.foto) pintarFoto(ctx, prod.foto, zonaFoto, { brillo: rgba(C.acento, .22) }); else hueco(ctx, zonaFoto, C.texto, 'Aquí va la foto', L.texto);
  // ingredientes con flechas a mano, en su columna y arriba de la promo
  const yIngFin = Math.min(yPromo - 20, zonaFoto.y + zonaFoto.h);
  ingr.forEach((t, i) => {
    const yy = zonaFoto.y + 30 + (yIngFin - zonaFoto.y - 70) * (ingr.length === 1 ? .5 : i / (ingr.length - 1));
    const xT = lado > 0 ? M : W - M;
    ctx.save(); ctx.font = fuente(30, L.mano, 700); ctx.fillStyle = C.texto; ctx.textAlign = lado > 0 ? 'left' : 'right';
    const ls = renglones(ctx, MAY(t), colIzq - 50); ls.forEach((l, k) => ctx.fillText(l, xT, yy + k * 32));
    const wl = Math.max(...ls.map(l => ctx.measureText(l).width));
    ctx.restore();
    const x1 = lado > 0 ? M + wl + 12 : W - M - wl - 12, x2 = lado > 0 ? zonaFoto.x + zonaFoto.w * .12 : zonaFoto.x + zonaFoto.w * .88;
    flecha(ctx, x1, yy - 8, x2, yy + 10, C.acento, 4, r);
  });
  // la promo
  const xP = M; let yy = yPromo;
  if (enc) {
    ctx.font = fuente(54, L.bloque); const w = Math.min(ctx.measureText(enc).width + 60, wPromo);
    brochazo(ctx, xP - 10, yy, w, 82, C.acento, r, { inclina: -.03 });
    ctx.save(); ctx.font = fuente(ajustar(ctx, enc, L.bloque, w - 50, 52, 24), L.bloque); ctx.fillStyle = legible(C.acento, '#111111', '#FFFFFF');
    ctx.textBaseline = 'middle'; ctx.fillText(enc, xP + 16, yy + 44); ctx.restore(); yy += 96;
  }
  if (det) { pintarBloque(ctx, det, xP, yy, 'left', L.bloque, 400, C.texto, 'rgba(0,0,0,.6)'); yy += det.alto + 4; }
  if (tamP) {
    const w = pintarPrecio(ctx, prod.precio, xP + 50, yy + tamP * .86, tamP, L.bloque, C.texto);
    subrayado(ctx, xP + 30, yy + tamP * .96, w + 50, 11, C.acento, r);
    destellos(ctx, xP + 50, yy + tamP * .5, tamP * .55, C.acento, 6, r, 3, 2.6, 3.7);
  }
  // remate a mano, del otro lado de la promo
  if (prod.remate) {
    ctx.save(); ctx.translate(W - M, yContacto - 30); ctx.rotate(-.08);
    const b = bloque(ctx, MAY(prod.remate), L.mano, 700, { w: W - wPromo - M * 2 - 20, h: hPromo * .8 }, 44, 22, 1.05, 4);
    pintarBloque(ctx, b, 0, -b.alto, 'right', L.mano, 700, C.acento); ctx.restore();
  }
  pintarContacto(ctx, W, yContacto, marca, C, L, rec, { alto: H - yContacto - 10 });
}

/* PROMO GIGANTE — «MARTES 2X1»: la promo ocupa medio cartel. */
function estiloGigante(ctx, W, H, d, r, rec) {
  const { marca, prod, colores: C, L } = d, M = 64, alto = H > 1500;
  fondoOscuro(ctx, W, H, C.fondo, rec, r);
  pintarLogo(ctx, marca, { x: W * .3, y: 40, w: W * .4, h: alto ? 170 : 120 }, C.acento, L);
  let y = alto ? 260 : 180;
  // «PROMOCIÓN» + día
  const enc = MAY(prod.promo || 'Promoción');
  let tam = ajustar(ctx, enc, L.bloque, W - M * 2, 110, 40);
  ctx.save(); ctx.font = fuente(tam, L.bloque); ctx.textAlign = 'center'; ctx.fillStyle = C.texto; ctx.fillText(enc, W / 2, y + tam * .85); ctx.restore();
  y += tam * 1.0;
  if (prod.dia) {
    const t = MAY(prod.dia); tam = ajustar(ctx, t, L.bloque, W - M * 2, 220, 60);
    ctx.save(); ctx.font = fuente(tam, L.bloque); ctx.textAlign = 'center'; ctx.fillStyle = C.acento;
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20; ctx.fillText(t, W / 2, y + tam * .85); ctx.restore();
    destellos(ctx, W / 2 - ctx.measureText(t).width / 2, y + tam * .5, 60, C.acento, 7, r, 3, 2.5, 3.8);
    y += tam * 1.0;
  }
  // la cifra gigante: «2X1» con la X en acento
  const grande = MAY(prod.grande || prod.precio || '2x1');
  tam = ajustar(ctx, grande, L.bloque, W - M * 2, alto ? 520 : 420, 120);
  ctx.save(); ctx.font = fuente(tam, L.bloque); ctx.textBaseline = 'alphabetic';
  const partes = grande.match(/^(\d+)\s*(X)\s*(\d+)$/i);
  const yG = y + tam * .9;
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  if (partes) {
    const [, a, x, b] = partes, wa = ctx.measureText(a).width, wx = ctx.measureText(x).width, wb = ctx.measureText(b).width;
    let x0 = W / 2 - (wa + wx + wb) / 2; ctx.textAlign = 'left';
    ctx.fillStyle = C.texto; ctx.fillText(a, x0, yG); x0 += wa;
    ctx.fillStyle = C.acento; ctx.fillText(x, x0, yG); x0 += wx;
    ctx.fillStyle = C.texto; ctx.fillText(b, x0, yG);
  } else if (/^\$|^\d/.test(grande)) { ctx.restore(); ctx.save(); pintarPrecio(ctx, grande, W / 2, yG, tam, L.bloque, C.texto, 'center'); }
  else { ctx.textAlign = 'center'; ctx.fillStyle = C.texto; ctx.fillText(grande, W / 2, yG); }
  ctx.restore();
  y = yG + 30;
  // a qué aplica
  if (prod.nombre || prod.detalle) {
    const t = MAY(prod.detalle || prod.nombre); const b = bloque(ctx, t, L.bloque, 400, { w: W - M * 2, h: 170 }, 90, 36, 1, 2);
    pintarBloque(ctx, b, W / 2, y, 'center', L.bloque, 400, C.texto); y += b.alto + 20;
  }
  // franja con nota (envío, «sólo recolección»…)
  if (prod.nota) {
    const t = MAY(prod.nota); ctx.font = fuente(46, L.bloque); const w = Math.min(ctx.measureText(t).width + 90, W - M * 2);
    brochazo(ctx, (W - w) / 2, y, w, 90, C.acento, r, { inclina: r.entre(-.03, .03) });
    ctx.save(); ctx.font = fuente(ajustar(ctx, t, L.bloque, w - 60, 46, 22), L.bloque); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = legible(C.acento, '#111111', '#FFFFFF'); ctx.fillText(t, W / 2, y + 48); ctx.restore(); y += 110;
  }
  // foto abajo
  const yC = H - (alto ? 200 : 130);
  const caja = { x: M, y: y + 10, w: W - M * 2, h: yC - y - 30 };
  if (caja.h > 120) { if (prod.foto) pintarFoto(ctx, prod.foto, caja, { brillo: rgba(C.acento, .18) }); else hueco(ctx, caja, C.texto, 'Aquí va la foto', L.texto); }
  pintarContacto(ctx, W, yC, marca, C, L, rec, { linea: false, alto: alto ? 140 : 110 });
}

/* LA SEMANA — las promos de cada día alrededor de la foto. */
function estiloSemana(ctx, W, H, d, r, rec) {
  const { marca, prod, colores: C, L } = d, M = 44, alto = H > 1500;
  fondoOscuro(ctx, W, H, C.fondo, rec, r);
  pintarLogo(ctx, marca, { x: W * .3, y: 30, w: W * .4, h: alto ? 160 : 120 }, C.acento, L);
  const dias = (d.semana || []).filter(x => x && (x.dia || x.grande)).slice(0, 6);
  let y = alto ? 210 : 160;
  const tit = MAY(prod.nombre || 'Tus favoritos');
  const tam = ajustar(ctx, tit, L.titulo, W * .9, 130, 50, L.tw);
  ctx.save(); ctx.font = fuente(tam, L.titulo, L.tw); ctx.textAlign = 'center'; ctx.fillStyle = C.acento; ctx.fillText(tit, W / 2, y + tam * .85); ctx.restore();
  y += tam * 1.05;
  if (prod.frase) {
    const t = MAY(prod.frase); ctx.font = fuente(44, L.bloque); const w = Math.min(ctx.measureText(t).width + 70, W - M * 2);
    brochazo(ctx, (W - w) / 2, y, w, 74, C.texto, r);
    ctx.save(); ctx.font = fuente(ajustar(ctx, t, L.bloque, w - 50, 44, 20), L.bloque); ctx.fillStyle = legible(C.texto, '#111111', '#FFFFFF'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t, W / 2, y + 40); ctx.restore(); y += 92;
  }
  const yC = H - (alto ? 170 : 120), col = 2, filas = Math.ceil(dias.length / col) || 1;
  const altoZona = yC - y - 20, hTar = Math.min(altoZona / filas - 16, 330), wTar = (W - M * 3) / 2;
  // foto al fondo, al centro
  const foto = { x: W * .2, y: y + altoZona * .2, w: W * .6, h: altoZona * .6 };
  if (prod.foto) { ctx.save(); ctx.globalAlpha = .9; pintarFoto(ctx, prod.foto, foto, { brillo: rgba(C.acento, .2) }); ctx.restore(); }
  dias.forEach((dd, i) => {
    const c = i % col, f = Math.floor(i / col), x = M + c * (wTar + M), yy = y + f * (hTar + 16);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.72)'; cajaRedonda(ctx, x, yy, wTar, hTar, 20); ctx.fill(); ctx.restore();
    const t = MAY(dd.dia || ''); ctx.font = fuente(46, L.bloque);
    const wd = Math.min(ctx.measureText(t).width + 50, wTar - 30);
    brochazo(ctx, x + (wTar - wd) / 2, yy - 18, wd, 66, C.acento, r, { inclina: r.entre(-.04, .04) });
    ctx.save(); ctx.font = fuente(ajustar(ctx, t, L.bloque, wd - 30, 46, 20), L.bloque); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = legible(C.acento, '#111111', '#FFFFFF'); ctx.fillText(t, x + wTar / 2, yy + 16); ctx.restore();
    const g = MAY(dd.grande || ''); const tg = ajustar(ctx, g, L.bloque, wTar - 40, hTar * .42, 30);
    ctx.save(); ctx.font = fuente(tg, L.bloque); ctx.textAlign = 'center'; ctx.fillStyle = C.texto; ctx.fillText(g, x + wTar / 2, yy + 40 + tg * .9); ctx.restore();
    if (dd.linea) {
      const b = bloque(ctx, MAY(dd.linea), L.bloque, 400, { w: wTar - 40, h: hTar - 60 - tg }, 40, 18, 1, 2);
      pintarBloque(ctx, b, x + wTar / 2, yy + 50 + tg, 'center', L.bloque, 400, C.acento);
    }
  });
  pintarContacto(ctx, W, yC, marca, C, L, rec, { alto: alto ? 140 : 110 });
}

/* FOTO LIMPIA — la foto a todo el cartel, logo en una esquina y una franja. */
function estiloFoto(ctx, W, H, d, r, rec) {
  const { marca, prod, colores: C, L } = d;
  ctx.fillStyle = C.fondo; ctx.fillRect(0, 0, W, H);
  if (prod.foto) {
    const { w: iw, h: ih } = medidas(prod.foto);
    if (recortada(prod.foto)) { fondoOscuro(ctx, W, H, C.fondo, rec, r, { polvo: false }); pintarFoto(ctx, prod.foto, { x: 40, y: H * .12, w: W - 80, h: H * .66 }, { brillo: rgba(C.acento, .25) }); }
    else { const esc = Math.max(W / iw, H / ih); ctx.drawImage(prod.foto, (W - iw * esc) / 2, (H - ih * esc) / 2, iw * esc, ih * esc); }
  } else hueco(ctx, { x: 40, y: 40, w: W - 80, h: H - 80 }, C.texto, 'Aquí va la foto', L.texto);
  const esquina = r.si() ? 'der' : 'izq';
  ctx.save(); const g = ctx.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 320); ctx.restore();
  pintarLogo(ctx, marca, { x: esquina === 'der' ? W - 420 : 40, y: 36, w: 380, h: 170 }, C.acento, L, false);
  // franja de abajo
  const hF = H > 1500 ? 380 : 300, yF = H - hF;
  ctx.save(); const g2 = ctx.createLinearGradient(0, yF - 120, 0, H); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(.35, 'rgba(0,0,0,.78)'); g2.addColorStop(1, 'rgba(0,0,0,.92)');
  ctx.fillStyle = g2; ctx.fillRect(0, yF - 120, W, hF + 120); ctx.restore();
  const nombre = prod.nombre || '';
  if (nombre) {
    const anchoN = prod.precio ? W - 470 : W - 120, tam = ajustar(ctx, MAY(nombre), L.titulo, anchoN, 130, 40, L.tw);
    ctx.save(); ctx.font = fuente(tam, L.titulo, L.tw); ctx.fillStyle = C.acento; ctx.fillText(MAY(nombre), 60, yF + tam * .9); ctx.restore();
    if (prod.frase) { const b = bloque(ctx, prod.frase, L.texto, 600, { w: anchoN, h: 110 }, 36, 20, 1.15, 2); pintarBloque(ctx, b, 60, yF + tam * 1.05, 'left', L.texto, 600, C.texto); }
  }
  if (prod.precio) {
    const tam = 120; ctx.save(); ctx.fillStyle = C.acento; const w = 330, x = W - w - 50, y = yF + 20;
    brochazo(ctx, x, y, w, 170, C.acento, r, { inclina: -.04 });
    pintarPrecio(ctx, prod.precio, x + w / 2, y + 130, tam, L.bloque, legible(C.acento, '#111111', '#FFFFFF'), 'center', null); ctx.restore();
  }
  const tel = marca.whatsapp; if (tel) { ctx.save(); icono(ctx, rec, 'message-circle', 60, H - 86, 46, C.acento); ctx.font = fuente(34, L.texto, 700); ctx.fillStyle = C.texto; ctx.textBaseline = 'middle'; ctx.fillText(tel, 120, H - 62); ctx.restore(); }
}

/* CLARO — fondo hueso, editorial: para marcas que no son de comida rápida. */
function estiloLimpio(ctx, W, H, d, r, rec) {
  const { marca, prod, colores: C0, L } = d, M = 70;
  const C = { ...C0, fondo: d.colores.claro || '#F4EFE6', texto: '#1A1A1A' };
  ctx.fillStyle = C.fondo; ctx.fillRect(0, 0, W, H);
  if (rec.textura) { ctx.save(); ctx.globalAlpha = .08; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(rec.textura, 0, 0, W, H); ctx.restore(); }
  const arriba = r.si(.5);
  const caja = arriba ? { x: M, y: 200, w: W - M * 2, h: H * .5 } : { x: M, y: H * .38, w: W - M * 2, h: H * .46 };
  ctx.save(); ctx.fillStyle = C.acento; ctx.globalAlpha = .9; const rc = r.entre(.55, .8);
  ctx.beginPath(); ctx.arc(caja.x + caja.w * r.entre(.3, .7), caja.y + caja.h / 2, Math.min(caja.w, caja.h) * rc / 2, 0, 7); ctx.fill(); ctx.restore();
  if (prod.foto) pintarFoto(ctx, prod.foto, caja, { rad: 36, sombra: true }); else hueco(ctx, caja, '#1A1A1A', 'Aquí va la foto', L.texto);
  pintarLogo(ctx, marca, { x: M, y: 50, w: 360, h: 120 }, '#1A1A1A', L, false);
  let y = arriba ? caja.y + caja.h + 50 : 220;
  const nombre = prod.nombre || 'Producto';
  const b = bloque(ctx, nombre, 'Playfair Display', 800, { w: W - M * 2, h: arriba ? 240 : H * .17 }, 140, 50, 1.0, 2);
  pintarBloque(ctx, b, M, y, 'left', 'Playfair Display', 800, '#1A1A1A'); y += b.alto + 18;
  if (prod.frase) { const f = bloque(ctx, prod.frase, L.texto, 500, { w: W * .7, h: 120 }, 38, 22, 1.25, 3); pintarBloque(ctx, f, M, y, 'left', L.texto, 500, '#3A3A3A'); y += f.alto + 20; }
  if (prod.precio) {
    const yy = arriba ? Math.min(y + 20, H - 180) : caja.y + caja.h + 40;
    ctx.save(); ctx.fillStyle = '#1A1A1A'; cajaRedonda(ctx, M, yy, 330, 120, 60); ctx.fill(); ctx.restore();
    pintarPrecio(ctx, prod.precio, M + 165, yy + 92, 92, L.bloque, '#FFFFFF', 'center', null);
    if (prod.promo) { ctx.save(); ctx.font = fuente(30, L.texto, 700); ctx.fillStyle = '#1A1A1A'; ctx.fillText(MAY(prod.promo), M + 360, yy + 72); ctx.restore(); }
  }
  const tel = marca.whatsapp, dir = marca.direccion;
  ctx.save(); ctx.font = fuente(28, L.texto, 600); ctx.fillStyle = '#3A3A3A'; ctx.textAlign = 'right';
  if (tel) ctx.fillText(tel, W - M, H - 70); if (dir) ctx.fillText(dir, W - M, H - 32); ctx.restore();
}

/* BLOQUES — color plano en diagonal, foto encima, letras gruesas. */
function estiloBloque(ctx, W, H, d, r, rec) {
  const { marca, prod, colores: C, L } = d, M = 60;
  ctx.fillStyle = C.fondo; ctx.fillRect(0, 0, W, H);
  const corte = r.entre(.42, .55), sube = r.si();
  ctx.save(); ctx.fillStyle = C.acento; ctx.beginPath();
  if (sube) { ctx.moveTo(0, H * (corte + .12)); ctx.lineTo(W, H * (corte - .12)); ctx.lineTo(W, H); ctx.lineTo(0, H); }
  else { ctx.moveTo(0, H * (corte - .12)); ctx.lineTo(W, H * (corte + .12)); ctx.lineTo(W, H); ctx.lineTo(0, H); }
  ctx.fill(); ctx.restore();
  if (rec.textura) { ctx.save(); ctx.globalAlpha = .12; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(rec.textura, 0, 0, W, H); ctx.restore(); }
  pintarLogo(ctx, marca, { x: M, y: 40, w: 340, h: 120 }, C.acento, L, false);
  const nombre = MAY(prod.nombre || 'Producto');
  const b = bloque(ctx, nombre, L.bloque, 400, { w: W - M * 2, h: H * .26 }, 200, 60, .95, 2);
  pintarBloque(ctx, b, M, 190, 'left', L.bloque, 400, C.texto, 'rgba(0,0,0,.35)');
  const caja = { x: W * .12, y: 190 + b.alto + 10, w: W * .76, h: H - (190 + b.alto + 10) - (H > 1500 ? 420 : 330) };
  if (prod.foto) pintarFoto(ctx, prod.foto, caja, { rad: 30, borde: C.texto }); else hueco(ctx, caja, C.texto, 'Aquí va la foto', L.texto);
  const cAc = legible(C.acento, '#111111', '#FFFFFF');
  let y = caja.y + caja.h + 40;
  if (prod.frase) { const f = bloque(ctx, MAY(prod.frase), L.bloque, 400, { w: prod.precio ? W * .5 : W - M * 2, h: H - y - 130 }, 64, 26, 1, 3); pintarBloque(ctx, f, M, y, 'left', L.bloque, 400, cAc); }
  if (prod.precio) pintarPrecio(ctx, prod.precio, W - M, H - 120, 170, L.bloque, cAc, 'right', null);
  if (marca.whatsapp) { ctx.save(); icono(ctx, rec, 'message-circle', M, H - 96, 46, cAc); ctx.font = fuente(34, L.texto, 700); ctx.fillStyle = cAc; ctx.textBaseline = 'middle'; ctx.fillText(marca.whatsapp, M + 60, H - 72); ctx.restore(); }
}

const PINTORES = { brocha: estiloBrocha, gigante: estiloGigante, semana: estiloSemana, foto: estiloFoto, limpio: estiloLimpio, bloque: estiloBloque };
ESTILOS.forEach(e => { e.grupo ||= 'comida'; });
/* Otros módulos (moda.js, campanas.js) suman sus estilos aquí sin tocar éste. */
export function registrar(meta, fn) {
  if (!ESTILOS.some(e => e.id === meta.id)) ESTILOS.push({ grupo: 'comida', ...meta });
  else Object.assign(ESTILOS.find(e => e.id === meta.id), meta);
  PINTORES[meta.id] = fn;
}
/* Lo que los otros estilos reusan del motor. */
export { rgba, fuente, pintarBloque, MAY, cajaRedonda, fondoOscuro, medidas, pintarFoto, hueco, pintarLogo, icono, pintarPrecio };

/** Lo que necesita un cartel, con valores por omisión que no truenan. */
export function normalizar(marca = {}, prod = {}) {
  marca = marca || {}; prod = prod || {};
  const colores = { acento: '#F5B301', fondo: '#0E0E0E', texto: '#FFFFFF', claro: '#F4EFE6', ...(marca.colores || {}) };
  const L = LETRAS[marca.letras] || LETRAS.brocha;
  return { marca, prod, colores, L };
}

/**
 * Pinta un cartel en `canvas`.
 * @param {HTMLCanvasElement} canvas
 * @param {{marca, prod, estilo, formato, semilla, semana}} o
 * @param {{textura?: CanvasImageSource, icono?: (nombre, color) => CanvasImageSource}} rec
 */
export function pintar(canvas, o, rec = {}) {
  const f = FORMATOS[o.formato] || FORMATOS.feed;
  canvas.width = f.w; canvas.height = f.h;
  const ctx = canvas.getContext('2d');
  const d = normalizar(o.marca, o.prod); d.semana = o.semana || [];
  const r = azar(`${o.semilla ?? 1}|${o.estilo}|${o.prod?.nombre || ''}`);
  (PINTORES[o.estilo] || estiloBrocha)(ctx, f.w, f.h, d, r, rec, o);
  return canvas;
}

/** Para el lote: cada producto × estilos × formato, con semilla distinta por día. */
export function plan(productos, estilos, { formato = 'feed', semilla = 1, porProducto = 1 } = {}) {
  const out = [];
  productos.forEach((p, i) => {
    for (let k = 0; k < porProducto; k++) {
      const estilo = estilos[(i + k) % estilos.length];
      out.push({ prod: p, estilo, formato, semilla: semilla * 7919 + i * 31 + k });
    }
  });
  return out;
}

/** Lee una tabla pegada de Excel/Sheets (tabuladores) o CSV a productos. La primera fila son los encabezados. */
export function leerTabla(texto) {
  const filas = String(texto || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!filas.length) return [];
  const sep = filas[0].includes('\t') ? '\t' : filas[0].includes(';') ? ';' : ',';
  const partir = l => sep === ',' ? (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')).slice(0, -1 || undefined) : l.split(sep);
  const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const enc = partir(filas[0]).map(sinAcentos);
  const campo = { producto: 'nombre', nombre: 'nombre', platillo: 'nombre', frase: 'frase', eslogan: 'frase', precio: 'precio', promo: 'promo', promocion: 'promo',
    detalle: 'detalle', ingredientes: 'ingredientes', foto: 'archivo', archivo: 'archivo', imagen: 'archivo', dia: 'dia', grande: 'grande', nota: 'nota', lema: 'lema', remate: 'remate' };
  return filas.slice(1).map(l => {
    const c = partir(l), p = {};
    enc.forEach((e, i) => { const k = campo[e]; if (k && c[i] !== undefined && String(c[i]).trim()) p[k] = String(c[i]).trim(); });
    if (p.ingredientes) p.ingredientes = p.ingredientes.split(/[|,·]/).map(s => s.trim()).filter(Boolean);
    return p;
  }).filter(p => p.nombre);
}
