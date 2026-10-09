/* ═══════════════════════════════════════════════════════════════════════════
   CARTELES · CAMPAÑAS — tandas y encuestas
   ───────────────────────────────────────────────────────────────────────────
   La tanda de Carlos (9 de octubre): «15 días de 15 personas dando todos una
   parte del costo de una playera para que todos podamos conseguir una dando
   poco cada día; luego sudaderas, pantalones, chamarras o lociones».

   Cómo funciona, y así lo cuentan los anuncios: hay N lugares; cada día los N
   ponen 1/N del precio; con eso se compra una prenda y se entrega a uno; a los
   N días todos tienen la suya y cada quien pagó una prenda completa.

   Si se da el precio, el pago diario se calcula (precio ÷ personas, redondeado
   hacia arriba al peso) y sale en los anuncios. Si no, se dice «un pago
   chiquito al día» y nada más: no se inventan cifras. Tampoco se dice cómo se
   decide a quién le toca cada día, porque eso lo decide el dueño.
   ═══════════════════════════════════════════════════════════════════════════ */
import { registrar, MAY, cajaRedonda, icono, contraste } from './motor.js';
import { firma, prenda, caber, escribir, lineaEsp, llamadoPildora, viñeta, grano, serif, sans, hsl } from './moda.js';

const ORO = '#CDAE74', CREMA = '#F2EDE4', TINTA = '#141312';

/* ───────────────────────────── cuentas ───────────────────────────── */
export function pesos(n) { return '$' + Math.round(n).toLocaleString('es-MX'); }
export function leerPrecio(t) { const m = String(t || '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0; }
/** Lo que pone cada quien al día. Redondeado hacia arriba al peso: nadie queda a deber centavos. */
export function pagoDiario(precio, personas) { const p = leerPrecio(precio); return p > 0 && personas > 0 ? Math.ceil(p / personas) : 0; }

/* ───────────────────────────── base ───────────────────────────── */
function marco(W, H) { const hist = H > 1500, cuad = H <= 1100; return { hist, cuad, M: 76, T: hist ? 220 : cuad ? 52 : 66, B: hist ? 340 : cuad ? 56 : 76, k: hist ? 1.12 : cuad ? .84 : 1 }; }
function fondo(ctx, W, H, p, ac) {
  ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, W, H);
  if (p.foto) { ctx.save(); ctx.globalAlpha = .3; prenda(ctx, p.foto, { x: 0, y: 0, w: W, h: H }, { sombra: null }); ctx.restore(); }
  viñeta(ctx, W, H, p.foto ? 'rgba(20,18,15,.35)' : '#24211D', 'rgba(10,10,10,.96)', .5, .4);
  grano(ctx, W, H, .04);
}
const acento = d => { const a = d.colores?.acento; return a && contraste(a, '#0A0A0A') >= 4.5 && hsl(a)[1] < 85 ? a : ORO; };
const num = (p) => ({ personas: +p.personas || 15, dias: +p.dias || +p.personas || 15 });
function circulo(ctx, rec, cx, cy, R, lleno, ic, ac) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
  if (lleno) { ctx.fillStyle = ac; ctx.fill(); } else { ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(205,174,116,.6)'; ctx.stroke(); }
  ctx.restore(); icono(ctx, rec, ic, cx - R * .52, cy - R * .52, R * 1.04, lleno ? TINTA : ac);
}
/** Rejilla de N círculos con el icono; `llenos` los primeros. Devuelve el alto. */
function rejilla(ctx, rec, n, x, y, w, ic, ac, llenos = 0, numeros = false) {
  const cols = n <= 10 ? 5 : n <= 15 ? 5 : n <= 20 ? 5 : 6, filas = Math.ceil(n / cols), paso = w / cols, R = paso * .38;
  for (let i = 0; i < n; i++) {
    const cx = x + paso * (i % cols + .5), cy = y + (paso + (numeros ? 26 : 0)) * Math.floor(i / cols) + paso / 2;
    circulo(ctx, rec, cx, cy, R, i < llenos, ic, ac);
    if (numeros) { ctx.save(); ctx.font = sans(600)(19); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), cx, cy + R + 28); ctx.restore(); }
  }
  return filas * (paso + (numeros ? 26 : 0));
}

/* ───────────────────────────── los estilos ───────────────────────────── */
/* CÓMO FUNCIONA — los N lugares y los tres pasos. */
function tandaComo(ctx, W, H, d, r, rec) {
  const { marca, prod: p } = d, m = marco(W, H), ac = acento(d), { personas } = num(p);
  fondo(ctx, W, H, {}, ac);
  const hL = 120 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hL }, '#FFFFFF');
  let y = m.T + hL + 30 * m.k;
  y += lineaEsp(ctx, p.kicker || 'Tanda', W / 2, y, { color: ac, alinear: 'center', tam: 24, ancho: W - m.M * 2 }) + 18;
  const tit = caber(ctx, p.frase || 'Estrena dando poquito cada día', serif(600, true), { w: W - m.M * 2, h: 200 * m.k }, 84 * m.k, 40, 1.04, 2);
  y += escribir(ctx, tit, W / 2, y, { alinear: 'center', color: '#FFFFFF' }) + 30 * m.k;
  const anchoR = m.cuad ? 480 : m.hist ? 760 : 600;
  y += rejilla(ctx, rec, personas, (W - anchoR) / 2, y, anchoR, p.icono || 'shirt', ac) + 30 * m.k;
  const pasos = p.pasos || [];
  const tamP = m.cuad ? 26 : 30;
  for (let i = 0; i < pasos.length; i++) {
    const b = caber(ctx, pasos[i], sans(500), { w: W - m.M * 2 - 100, h: tamP * 2.6 }, tamP, 18, 1.22, 2);
    ctx.save(); ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(m.M + 32, y + Math.max(b.alto, 64) / 2, 30, 0, 7); ctx.fill();
    ctx.font = serif(600)(32); ctx.fillStyle = TINTA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), m.M + 32, y + Math.max(b.alto, 64) / 2 + 2); ctx.restore();
    escribir(ctx, b, m.M + 92, y + (Math.max(b.alto, 64) - b.alto) / 2, { color: '#FFFFFF' });
    y += Math.max(b.alto, 64) + 16 * m.k;
  }
  llamadoPildora(ctx, p.cta || 'Aparta tu lugar por DM', W / 2, Math.min(y + 20, H - m.B - 62), ac, TINTA, { tam: 22 });
}

/* LAS CUENTAS — «1 playera ÷ 15 días = $30 al día». */
function tandaCuentas(ctx, W, H, d, r, rec) {
  const { marca, prod: p } = d, m = marco(W, H), ac = acento(d), { personas, dias } = num(p);
  fondo(ctx, W, H, {}, ac);
  const hL = 120 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hL }, '#FFFFFF');
  const pago = pagoDiario(p.precio, personas);
  const f1 = caber(ctx, `1 ${p.cosa || 'prenda'}`, serif(500, true), { w: W - m.M * 2, h: 190 }, 150 * m.k, 50, 1.14, 1);
  const f2 = caber(ctx, `÷ ${dias} días`, serif(500, true), { w: W - m.M * 2, h: 190 }, 150 * m.k, 50, 1.14, 1);
  const res = caber(ctx, pago ? `= ${pesos(pago)} al día` : '= un pago chiquito al día', serif(600, true), { w: W - m.M * 2, h: 200 }, pago ? 110 * m.k : 80 * m.k, 36, 1.04, 2);
  const sub = caber(ctx, p.sub || (pago ? `Tu ${p.cosa} de ${pesos(leerPrecio(p.precio))} en ${dias} pagos` : `Tu ${p.cosa || 'prenda'} en ${dias} partes, sin sentirlo`), sans(500), { w: W - m.M * 2, h: 90 }, 32, 20, 1.3, 2);
  const kH = 30, alto = kH + 30 + f1.alto + f2.alto + 30 + res.alto + 24 + sub.alto + 40 + 62;
  let y = Math.max(m.T + hL + 40, (m.T + hL + H - m.B) / 2 - alto / 2);
  y += lineaEsp(ctx, p.kicker || 'Tanda', W / 2, y, { color: ac, alinear: 'center', tam: 24, ancho: W - m.M * 2 }) + 30;
  y += escribir(ctx, f1, W / 2, y, { alinear: 'center', color: '#FFFFFF' });
  y += escribir(ctx, f2, W / 2, y, { alinear: 'center', color: '#FFFFFF' }) + 30;
  y += escribir(ctx, res, W / 2, y, { alinear: 'center', color: ac }) + 24;
  y += escribir(ctx, sub, W / 2, y, { alinear: 'center', color: 'rgba(255,255,255,.86)' }) + 40;
  llamadoPildora(ctx, p.cta || 'Aparta tu lugar', W / 2, y, ac, TINTA, { tam: 22 });
}

/* EL CALENDARIO — cada día, alguien estrena. */
function tandaCalendario(ctx, W, H, d, r, rec) {
  const { marca, prod: p } = d, m = marco(W, H), ac = acento(d), { dias } = num(p);
  fondo(ctx, W, H, {}, ac);
  const hL = 110 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hL }, '#FFFFFF');
  let y = m.T + hL + 24 * m.k;
  y += lineaEsp(ctx, p.kicker || 'Tanda', W / 2, y, { color: ac, alinear: 'center', tam: 24, ancho: W - m.M * 2 }) + 16;
  const tit = caber(ctx, p.frase || 'Cada día alguien estrena', serif(600, true), { w: W - m.M * 2, h: 180 * m.k }, 76 * m.k, 36, 1.04, 2);
  y += escribir(ctx, tit, W / 2, y, { alinear: 'center', color: '#FFFFFF' }) + 26 * m.k;
  const cols = 5, filas = Math.ceil(dias / cols), gw = W - m.M * 2 + 40, gap = 12, cw = (gw - gap * (cols - 1)) / cols;
  const ch = Math.min(cw * 1.02, (H - m.B - 62 - 150 - y) / filas - gap);
  for (let i = 0; i < dias; i++) {
    const x = m.M - 20 + (i % cols) * (cw + gap), yy = y + Math.floor(i / cols) * (ch + gap);
    ctx.save(); cajaRedonda(ctx, x, yy, cw, ch, 16); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(205,174,116,.5)'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = sans(700)(Math.min(18, ch * .16)); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('DÍA', x + cw / 2, yy + ch * .24);
    ctx.font = serif(500)(Math.min(46, ch * .34)); ctx.fillStyle = ac; ctx.fillText(String(i + 1), x + cw / 2, yy + ch * .58); ctx.restore();
    icono(ctx, rec, p.icono || 'shirt', x + cw / 2 - ch * .13, yy + ch * .66, ch * .26, '#FFFFFF');
  }
  y += filas * (ch + gap) + 24;
  const sub = caber(ctx, p.sub || `${dias} días · ${num(p).personas} personas · todos con la suya`, sans(500), { w: W - m.M * 2, h: 90 }, 30, 18, 1.3, 2);
  y += escribir(ctx, sub, W / 2, y, { alinear: 'center', color: 'rgba(255,255,255,.86)' }) + 28;
  llamadoPildora(ctx, p.cta || 'Aparta tu lugar por DM', W / 2, Math.min(y, H - m.B - 62), ac, TINTA, { tam: 22 });
}

/* LOS LUGARES — un boleto «LUGAR __ DE 15». */
function tandaLugares(ctx, W, H, d, r, rec) {
  const { marca, prod: p } = d, m = marco(W, H), ac = acento(d), { personas } = num(p);
  fondo(ctx, W, H, p, ac);
  const hL = 120 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hL }, '#FFFFFF');
  const tit = caber(ctx, p.frase || `Sólo hay ${personas} lugares`, serif(600, true), { w: W - m.M * 2, h: 200 * m.k }, 92 * m.k, 40, 1.04, 2);
  const bw = W - m.M * 2, bh = m.cuad ? 260 : 320;
  const sub = caber(ctx, p.sub || `Cuando se llenan los ${personas}, arranca`, sans(500), { w: W - m.M * 2, h: 90 }, 32, 18, 1.3, 2);
  const alto = 30 + 20 + tit.alto + 40 + bh + 40 + sub.alto + 40 + 62;
  let y = Math.max(m.T + hL + 30, (m.T + hL + H - m.B) / 2 - alto / 2);
  y += lineaEsp(ctx, p.kicker || 'Tanda', W / 2, y, { color: ac, alinear: 'center', tam: 24, ancho: W - m.M * 2 }) + 20;
  y += escribir(ctx, tit, W / 2, y, { alinear: 'center', color: '#FFFFFF', sombra: 'rgba(0,0,0,.6)' }) + 40;
  // el boleto, con muescas a los lados
  const x = m.M; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  ctx.beginPath(); cajaRedonda(ctx, x, y, bw, bh, 26); ctx.fillStyle = CREMA; ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y + bh / 2, 34, 0, 7); ctx.arc(x + bw, y + bh / 2, 34, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y + bh / 2, 34, 0, 7); ctx.arc(x + bw, y + bh / 2, 34, 0, 7); ctx.fillStyle = 'rgba(10,10,10,.85)'; ctx.fill(); ctx.restore();
  const der = 230, xs = x + bw - der;
  ctx.save(); ctx.setLineDash([10, 10]); ctx.lineWidth = 3; ctx.strokeStyle = '#C9BFAE'; ctx.beginPath(); ctx.moveTo(xs, y + 26); ctx.lineTo(xs, y + bh - 26); ctx.stroke(); ctx.restore();
  lineaEsp(ctx, p.kicker || 'Tanda', x + 70, y + bh * .26, { color: '#9A7B45', tam: 20, ancho: bw - der - 110, fnt: sans(700) });
  const b2 = caber(ctx, p.boleto || 'Tu lugar te espera', serif(600, true), { w: bw - der - 110, h: bh * .48 }, 64, 30, 1.02, 2);
  escribir(ctx, b2, x + 70, y + bh * .38, { color: TINTA });
  lineaEsp(ctx, 'Lugar', xs + der / 2, y + bh * .2, { color: '#6B655C', alinear: 'center', tam: 20, ancho: der - 40, fnt: sans(600) });
  ctx.fillStyle = TINTA; ctx.fillRect(xs + der / 2 - 60, y + bh * .62, 120, 4);
  lineaEsp(ctx, `de ${personas}`, xs + der / 2, y + bh * .7, { color: '#6B655C', alinear: 'center', tam: 20, ancho: der - 40, fnt: sans(600) });
  y += bh + 40;
  y += escribir(ctx, sub, W / 2, y, { alinear: 'center', color: 'rgba(255,255,255,.9)', sombra: 'rgba(0,0,0,.6)' }) + 40;
  llamadoPildora(ctx, p.cta || 'Aparta el tuyo', W / 2, Math.min(y, H - m.B - 62), ac, TINTA, { tam: 22 });
}

/* EL NÚMERO — «15» enorme y el resumen: personas, días, una para cada quien. */
function tandaNumero(ctx, W, H, d, r, rec) {
  const { marca, prod: p } = d, m = marco(W, H), ac = acento(d), { personas, dias } = num(p);
  fondo(ctx, W, H, p, ac);
  const hL = 120 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hL }, '#FFFFFF');
  const grande = m.cuad ? 380 : 520 * m.k, pago = pagoDiario(p.precio, personas);
  const sub = caber(ctx, p.sub || `Das poquito al día y en ${dias} días todos tienen su ${p.cosa || 'prenda'}`, sans(500), { w: W - m.M * 2, h: 100 }, 32, 18, 1.3, 2);
  const alto = 30 + 20 + grande * .95 + 50 + 130 + 40 + sub.alto + 40 + 62;
  let y = Math.max(m.T + hL + 30, (m.T + hL + H - m.B) / 2 - alto / 2);
  y += lineaEsp(ctx, p.kicker || 'Tanda', W / 2, y, { color: ac, alinear: 'center', tam: 24, ancho: W - m.M * 2 }) + 20;
  ctx.save(); ctx.font = serif(500)(grande); ctx.fillStyle = ac; ctx.textAlign = 'center'; ctx.fillText(String(personas), W / 2, y + grande * .74); ctx.restore();
  y += grande * .95 + 50;
  const cols = [[String(personas), 'personas'], [String(dias), 'días'], pago ? [pesos(pago), 'al día'] : ['1', `${p.cosa || 'prenda'} c/u`]];
  const cw = (W - m.M * 2) / 3;
  cols.forEach(([n, t], i) => {
    const cx = m.M + cw * (i + .5);
    const bn = caber(ctx, n, serif(500), { w: cw - 30, h: 100 }, 84, 30, 1, 1); escribir(ctx, bn, cx, y, { alinear: 'center', color: ac });
    lineaEsp(ctx, t, cx, y + 92, { color: '#FFFFFF', alinear: 'center', tam: 20, ancho: cw - 30, fnt: sans(600) });
    if (i) { ctx.fillStyle = 'rgba(205,174,116,.4)'; ctx.fillRect(m.M + cw * i, y, 1.5, 120); }
  });
  y += 130 + 40;
  y += escribir(ctx, sub, W / 2, y, { alinear: 'center', color: 'rgba(255,255,255,.9)', sombra: 'rgba(0,0,0,.6)' }) + 40;
  llamadoPildora(ctx, p.cta || 'Quiero mi lugar', W / 2, Math.min(y, H - m.B - 62), ac, TINTA, { tam: 22 });
}

/* EL AVANCE — «Día 5 de 15»: los que ya estrenaron, llenos. */
function tandaDia(ctx, W, H, d, r, rec) {
  const { marca, prod: p } = d, m = marco(W, H), ac = acento(d), { personas, dias } = num(p), n = Math.max(1, Math.min(dias, +p.dia || 1));
  fondo(ctx, W, H, {}, ac);
  const hL = 120 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hL }, '#FFFFFF');
  const anchoR = m.cuad ? 500 : 720, filas = Math.ceil(dias / 5), altoR = filas * (anchoR / 5 + 26);
  const tit = caber(ctx, p.frase || `Hoy se entrega ${p.cosa ? (p.genero === 'el' ? 'el' : 'la') + ' ' + p.cosa : 'la prenda'} #${n}`, serif(500, true), { w: W - m.M * 2, h: 170 * m.k }, 72 * m.k, 34, 1.06, 2);
  const sub = n >= dias ? '¡Tanda completa! Gracias por cumplir' : (p.sub || `Faltan ${dias - n} · ¡Gracias por cumplir!`);
  const alto = 30 + 18 + 130 + 50 + altoR + 40 + tit.alto + 16 + 40;
  let y = Math.max(m.T + hL + 30, (m.T + hL + H - m.B) / 2 - alto / 2);
  y += lineaEsp(ctx, p.kicker || 'Tanda', W / 2, y, { color: ac, alinear: 'center', tam: 26, ancho: W - m.M * 2, fnt: sans(700) }) + 18;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.font = serif(500, true)(130); const a = 'Día ', b = String(n), c = ` de ${dias}`;
  const wa = ctx.measureText(a).width, wb = (ctx.font = serif(600)(130), ctx.measureText(b).width), wc = (ctx.font = serif(500, true)(64), ctx.measureText(c).width);
  let x = W / 2 - (wa + wb + wc) / 2; ctx.font = serif(500, true)(130); ctx.fillStyle = '#FFFFFF'; ctx.fillText(a, x, y + 110); x += wa;
  ctx.font = serif(600)(130); ctx.fillStyle = ac; ctx.fillText(b, x, y + 110); x += wb; ctx.font = serif(500, true)(64); ctx.fillStyle = '#FFFFFF'; ctx.fillText(c, x, y + 110); ctx.restore();
  y += 130 + 50;
  y += rejilla(ctx, rec, dias, (W - anchoR) / 2, y, anchoR, p.icono || 'shirt', ac, n, true) + 40;
  y += escribir(ctx, tit, W / 2, y, { alinear: 'center', color: '#FFFFFF' }) + 16;
  lineaEsp(ctx, sub, W / 2, y, { color: 'rgba(255,255,255,.75)', alinear: 'center', tam: 22, ancho: W - m.M * 2, fnt: sans(600), sep: .12 });
}

/* LA ENCUESTA — «¿Qué tanda sigue? A o B». */
function encuesta(ctx, W, H, d, r, rec) {
  const { marca, prod: p } = d, m = marco(W, H), ac = acento(d);
  fondo(ctx, W, H, {}, ac);
  const hL = 110 * m.k; firma(ctx, marca, { x: W * .3, y: m.T, w: W * .4, h: hL }, '#FFFFFF');
  let y = m.T + hL + 26 * m.k;
  y += lineaEsp(ctx, p.kicker || 'Tú decides', W / 2, y, { color: ac, alinear: 'center', tam: 24, ancho: W - m.M * 2 }) + 16;
  const tit = caber(ctx, p.frase || '¿Cuál sigue?', serif(600, true), { w: W - m.M * 2, h: 180 * m.k }, 88 * m.k, 40, 1.04, 2);
  y += escribir(ctx, tit, W / 2, y, { alinear: 'center', color: '#FFFFFF' }) + 30 * m.k;
  const lados = [[p.opcionA || 'Opción A', p.fotosA || []], [p.opcionB || 'Opción B', p.fotosB || []]];
  const sub = caber(ctx, p.sub || 'Vota en los comentarios: A o B', sans(500), { w: W - m.M * 2, h: 80 }, 30, 18, 1.3, 2);
  const yFin = H - m.B - sub.alto - 20, cw = W / 2;
  lados.forEach(([nombre, fotos], i) => {
    const x0 = i * cw, cx = x0 + cw / 2;
    ctx.save(); ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(cx, y + 42, 42, 0, 7); ctx.fill(); ctx.font = sans(800)(42); ctx.fillStyle = TINTA; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i ? 'B' : 'A', cx, y + 45); ctx.restore();
    const bn = caber(ctx, nombre, serif(600, true), { w: cw - 60, h: 90 }, 66 * m.k, 30, 1, 1);
    const zona = { x: x0 + 30, y: y + 110, w: cw - 60, h: yFin - bn.alto - 30 - (y + 110) };
    const n = Math.max(1, fotos.length), ancho = zona.w / n;
    fotos.forEach((f, k) => prenda(ctx, f, { x: zona.x + k * ancho, y: zona.y, w: ancho, h: zona.h }, { sombra: 'rgba(0,0,0,.6)', rad: 12 }));
    escribir(ctx, bn, cx, zona.y + zona.h + 20, { alinear: 'center', color: '#FFFFFF' });
  });
  ctx.fillStyle = 'rgba(205,174,116,.35)'; ctx.fillRect(W / 2 - 1, y + 100, 2, yFin - y - 110);
  escribir(ctx, sub, W / 2, yFin + 10, { alinear: 'center', color: 'rgba(255,255,255,.88)' });
}

export const ESTILOS_CAMPANA = [
  { id: 'tanda-como', nombre: 'Tanda: cómo funciona', fn: tandaComo },
  { id: 'tanda-numero', nombre: 'Tanda: el número', fn: tandaNumero },
  { id: 'tanda-cuentas', nombre: 'Tanda: las cuentas', fn: tandaCuentas },
  { id: 'tanda-calendario', nombre: 'Tanda: calendario', fn: tandaCalendario },
  { id: 'tanda-lugares', nombre: 'Tanda: los lugares', fn: tandaLugares },
  { id: 'tanda-dia', nombre: 'Tanda: avance del día', fn: tandaDia },
  { id: 'encuesta', nombre: 'Encuesta A o B', fn: encuesta },
];
for (const e of ESTILOS_CAMPANA) registrar({ id: e.id, nombre: e.nombre, para: 'Campaña', grupo: 'campana' }, e.fn);

/* ───────────────────────────── los paquetes ─────────────────────────────
   Devuelven anuncios con la misma forma que el calendario: {nombre, formato,
   estilo, fotos:[ids], prod}. La pantalla pone las fotos. */
const ICONO = { playera: 'shirt', sudadera: 'shirt', chamarra: 'shirt', camisa: 'shirt', polo: 'shirt', blusa: 'shirt', vestido: 'shirt', pantalon: 'tag', short: 'tag',
  tenis: 'footprints', botas: 'footprints', zapatos: 'footprints', sandalias: 'footprints', bolsa: 'handbag', cartera: 'handbag', mochila: 'backpack',
  locion: 'sparkles', cosmetico: 'sparkles', reloj: 'watch', joyeria: 'gem', lentes: 'glasses', termo: 'cup-soda' };
export function iconoDe(cat) { return ICONO[cat] || 'gift'; }

/**
 * @param {{cat, cosa, plural, genero, personas, dias, precio, fondo:id, fotos:[ids], whatsapp, avance:boolean}} t
 */
export function planTanda(t) {
  const personas = +t.personas || 15, dias = +t.dias || personas, cosa = t.cosa || 'prenda', plural = t.plural || cosa + 's';
  const g = t.genero === 'el' ? 'el' : 'la', un = g === 'el' ? 'un' : 'una', su = 'su';
  const k = `Tanda de ${plural}`, icono = iconoDe(t.cat), pago = pagoDiario(t.precio, personas);
  const estrena = cosa.startsWith('par de ') ? cosa.slice(7) : cosa;   // «estrena zapatos», no «estrena par de zapatos»
  const base = { kicker: k, cosa, genero: g, personas, dias, icono, ...(t.precio ? { precio: t.precio } : {}) };
  const pasos = [`Apartas uno de los ${personas} lugares`, pago ? `Cada día das ${pesos(pago)}` : 'Cada día das tu parte', `Cada día alguien estrena, hasta que los ${personas} tengan ${su} ${cosa}`];
  const fondo = t.fondo ? [t.fondo] : [];
  const out = [];
  const add = (nombre, formato, estilo, prod, fotos = []) => out.push({ nombre, formato, estilo, fotos, prod: { ...base, ...prod } });
  add('01-como-funciona', 'feed', 'tanda-como', { frase: `Estrena ${estrena} dando poquito cada día`, pasos, cta: 'Aparta tu lugar por DM' });
  add('02-el-numero', 'feed', 'tanda-numero', { sub: pago ? `${pesos(pago)} al día y en ${dias} días todos tienen ${su} ${cosa} de marca` : `Das poquito al día y en ${dias} días todos tienen ${su} ${cosa} de marca`, cta: 'Quiero mi lugar' }, fondo);
  add('03-las-cuentas', 'feed', 'tanda-cuentas', { cta: 'Aparta tu lugar' });
  add('04-calendario', 'feed', 'tanda-calendario', { frase: `Cada día alguien estrena ${estrena}`, sub: `${dias} días · ${personas} personas · todos con ${su} ${cosa}`, cta: 'Aparta tu lugar por DM' });
  add('05-lugares', 'feed', 'tanda-lugares', { frase: `Sólo hay ${personas} lugares`, boleto: 'Tu lugar te espera', cta: 'Aparta el tuyo' }, fondo);
  add('06-como-funciona', 'historia', 'tanda-como', { frase: `Estrena ${estrena} dando poquito cada día`, pasos, cta: 'Responde «YO» para entrar' });
  add('07-el-numero', 'historia', 'tanda-numero', { cta: 'Responde para apartar' }, fondo);
  add('08-las-cuentas', 'historia', 'tanda-cuentas', { cta: 'Responde para apartar' });
  add('09-quedan-pocos', 'historia', 'tanda-lugares', { frase: 'Quedan pocos lugares', boleto: '¿Te apuntas?', cta: 'Responde para apartar' }, fondo);
  // con dos o más recortadas, en colección; si los recortes no salieron, con las fotos completas en mosaico
  if (t.fotos && t.fotos.length >= 2) out.push({ nombre: '10-proxima-tanda', formato: 'feed', estilo: 'coleccion', fotos: t.fotos.slice(0, 3),
    prod: { kicker: 'Próxima tanda', frase: k, cta: 'Aparta tu lugar', categoria: t.cat } });
  else if (t.completas && t.completas.length >= 2) out.push({ nombre: '10-proxima-tanda', formato: 'feed', estilo: 'mosaico', fotos: t.completas.slice(0, 4),
    prod: { kicker: 'Próxima tanda', frase: `Próxima tanda: ${plural} · Aparta tu lugar`, categoria: t.cat } });
  if (t.avance !== false) for (let n = 1; n <= dias; n++) add(`Avance diario/Dia ${String(n).padStart(2, '0')}`, 'historia', 'tanda-dia', { dia: n, frase: `Hoy se entrega ${g} ${cosa} #${n}` });
  return out;
}
/** «¿Qué tanda sigue?» entre dos opciones. */
export function planEncuesta({ titulo = '¿Qué tanda sigue?', kicker = 'Tú decides', a, b, fotosA = [], fotosB = [] }) {
  const prod = { kicker, frase: titulo, opcionA: a, opcionB: b };
  return [
    { nombre: 'encuesta-publicacion', formato: 'feed', estilo: 'encuesta', fotos: [], fotosA, fotosB, prod: { ...prod, sub: 'Vota en los comentarios: A o B' } },
    { nombre: 'encuesta-historia', formato: 'historia', estilo: 'encuesta', fotos: [], fotosA, fotosB, prod: { ...prod, sub: 'Responde A o B' } },
  ];
}
