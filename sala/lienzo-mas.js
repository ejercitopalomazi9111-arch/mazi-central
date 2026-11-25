/* LOS 50 ELEMENTOS EXTRA DEL PIZARRÓN · Carlos, 13 nov: «agrega otros 300 elementos extra, aparte de los
 * que va a agregar Luna, para todo lo que sea el pizarrón». Son 50 tipos nuevos (este archivo) y 250 dibujos
 * nuevos en sala/iconos-clase.js.
 *
 * Aparte de lienzo.js A PROPÓSITO: Luna mete los suyos en lienzo.js y así no nos pisamos. lienzo.js los suma
 * a ELEMENTOS con masElementos(herramientas); explica.js le da a la IA CATALOGO_MAS y valida con normalizarMas.
 * EJEMPLOS_MAS tiene uno de cada uno, para las pruebas (sala/pruebas-lienzo-mas.mjs).
 *
 * Todos son puro dibujo en SVG, con las mismas herramientas de trazo a mano que los demás: se dibujan solos
 * mientras la maestra habla, con los mismos cursores. Sin emojis: los símbolos se dibujan.
 */
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmt = (v) => Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
const ROJO = '#D9433A', AMBAR = '#E6A019', VERDE = '#2E9A5E', GRIS = '#4A4656', SUAVE = '#9C93A8';

/* lo que cabe a lo ancho en dos columnas */
export const ANCHOS_MAS = ['plano', 'recta', 'periodo', 'antesdespues', 'consecuencias', 'reaccion', 'cadena', 'oracion', 'dialogo', 'proscontras', 'calendario', 'regla', 'ondas', 'iceberg', 'puente', 'vocabulario', 'conjugacion', 'celula', 'estados'];

export function masElementos(h){
  const { lienzoSVG, textoSVG, trazo, relleno, caja, circulo, ovalo, linea, flecha, sector, dibujo, partir, medirTexto, TINTAS, f1 } = h;
  /* un elemento = su alto (número o función del ancho) + cómo se dibuja */
  const hacer = (alto, dibujar) => ({ armar(el, w, z, ctx){
    const W = w, A = typeof alto === 'function' ? alto(W, z) : alto;
    const L = lienzoSVG(el, W, A, z, ctx), t = [];
    const T = (s, x, y, o = {}) => { t.push(...textoSVG(L.svg, L.defs, String(s ?? ''), x, y, o).tareas); };
    const S = (d, o = {}) => { t.push(trazo(L.svg, d, { color: o.color || GRIS, ancho: o.ancho || 2.4, fase: o.fase ?? 0, relleno: o.relleno })); };
    const R = (d, color, fase = 0, op = 1) => { t.push(relleno(L.svg, d, color, fase, op)); };
    const D = (nombre, x, y, lado, color, fase = 1) => { t.push(...dibujo(L.svg, nombre, x, y, lado, color, fase)); };
    dibujar({ W, A, z, ctx, T, S, R, D, tn: (i) => TINTAS[(ctx.n + i) % TINTAS.length] });
    return [...L.tareasTitulo, ...L.mover(t)];
  } });
  const alto = (s, ancho, tam = 15, fam = 'Texto') => partir(String(s ?? ''), ancho, `700 ${tam}px ${fam}`).length * tam * 1.25;
  const pill = (S, R, T, x, y, s, tn, { tam = 14, max = 160, fase = 0 } = {}) => {
    const ren = partir(String(s), max, `700 ${tam}px Texto`), w = Math.min(max, Math.max(...ren.map((r) => medirTexto(r, `700 ${tam}px Texto`)))) + 22, hh = ren.length * tam * 1.25 + 14;
    R(caja(x - w / 2, y - hh / 2, w, hh, 12, 0), tn.c, fase); S(caja(x - w / 2, y - hh / 2, w, hh, 12), { color: tn.t, fase }); T(s, x, y, { tam, maxAncho: max, fase: fase + 2 });
    return { w, h: hh };
  };

  return {
    /* ══ instrumentos y medidas ══ */
    termometro: hacer(250, ({ W, z, T, S, R, ctx }) => {
      const x = Math.min(80, W * .22), y0 = 18, y1 = 180, r = 20, mn = z.min, mx = z.max, k = lim((z.valor - mn) / ((mx - mn) || 1), 0, 1), yv = y1 - (y1 - y0 - 12) * k;
      R(`M${x - 5} ${y1 + 6} V${f1(yv)} H${x + 5} V${y1 + 6} Z`, ROJO, 1); R(circulo(x, y1 + r, r - 4, 0), ROJO, 1);
      S(caja(x - 11, y0, 22, y1 - y0 + 8, 11)); S(circulo(x, y1 + r, r));
      for(let i = 0; i <= 4; i++){ const yy = y1 - (y1 - y0 - 12) * i / 4; S(linea(x + 13, yy, x + 22, yy, .2), { ancho: 1.8 }); T(fmt(mn + (mx - mn) * i / 4) + (z.unidad || ''), x + 28, yy, { tam: 12, ancla: 'start', color: '#6B6677' }); }
      (z.marcas || []).forEach((m, i) => { const yy = y1 - (y1 - y0 - 12) * lim((m.valor - mn) / ((mx - mn) || 1), 0, 1); S(flecha(x + 110, yy, x + 16, yy, { punta: 7 }), { color: ctx.tinta2.t, ancho: 1.8, fase: 3 }); T(m.texto, x + 116, yy, { tam: 14, fam: 'Mano', ancla: 'start', color: ctx.tinta2.t, fase: 3, maxAncho: W - x - 126 }); });
      T(`${fmt(z.valor)} ${z.unidad || ''}`, x, y1 + 2 * r + 20, { tam: 18, color: ROJO, fase: 3 });
    }),
    medidor: hacer(210, ({ W, z, T, S, ctx }) => {
      const cx = W / 2, cy = 150, Rr = Math.min(120, W * .36), col = [VERDE, AMBAR, ROJO];
      for(let i = 0; i < 3; i++){ const a0 = Math.PI * (1 - i / 3), a1 = Math.PI * (1 - (i + 1) / 3);
        S(`M${f1(cx + Rr * Math.cos(a0))} ${f1(cy - Rr * Math.sin(a0))} A${Rr} ${Rr} 0 0 1 ${f1(cx + Rr * Math.cos(a1))} ${f1(cy - Rr * Math.sin(a1))}`, { color: col[i], ancho: 14 }); }
      const a = Math.PI * (1 - lim(z.valor, 0, 100) / 100);
      S(flecha(cx, cy, cx + (Rr - 22) * Math.cos(a), cy - (Rr - 22) * Math.sin(a), { punta: 12 }), { color: GRIS, ancho: 3.4, fase: 1 }); S(circulo(cx, cy, 7, .1), { relleno: GRIS, fase: 1 });
      T(z.izquierda, cx - Rr, cy + 26, { tam: 13, maxAncho: 120, fase: 2 }); T(z.derecha, cx + Rr, cy + 26, { tam: 13, maxAncho: 120, fase: 2 });
      if(z.texto) T(z.texto, cx, cy - Rr * .42, { tam: 16, fam: 'Mano', color: ctx.tinta.t, fase: 3, maxAncho: Rr * 1.3 });
    }),
    semaforo: hacer((W, z) => z.luces.length * 64 + 24, ({ W, z, T, S, R }) => {
      const COL = { rojo: ROJO, amarillo: AMBAR, verde: VERDE }, x = 46, n = z.luces.length;
      R(caja(x - 32, 8, 64, n * 64 + 8, 18, 0), '#2B2433', 0); S(caja(x - 32, 8, 64, n * 64 + 8, 18), { color: '#2B2433' });
      z.luces.forEach((l, i) => { const cy = 44 + i * 64; R(circulo(x, cy, 23, 0), COL[l.color] || SUAVE, 1); S(circulo(x, cy, 23), { color: '#fff', ancho: 2, fase: 1 });
        T(l.texto, x + 50, cy, { tam: 15, ancla: 'start', maxAncho: W - x - 60, fase: 2 }); });
    }),
    bateria: hacer(160, ({ W, z, T, S, R }) => {
      const bw = Math.min(240, W * .62), bh = 86, x = (W - bw) / 2, y = 18, k = lim(z.nivel, 0, 100) / 100, col = k > .6 ? VERDE : k > .25 ? AMBAR : ROJO;
      R(caja(x + 6, y + 6, (bw - 12) * k, bh - 12, 8, 0), col, 1); S(caja(x, y, bw, bh, 14)); S(caja(x + bw, y + bh / 2 - 16, 12, 32, 4));
      T(`${fmt(z.nivel)} %`, x + bw / 2, y + bh / 2, { tam: 24, color: '#1D1B26', fase: 2 });
      if(z.texto) T(z.texto, W / 2, y + bh + 30, { tam: 16, fam: 'Mano', maxAncho: W - 30, fase: 3 });
    }),
    balanza: hacer(220, ({ W, z, T, S, R, tn }) => {
      const cx = W / 2, cy = 70, brazo = Math.min(170, W / 2 - 52), pi = z.izquierda.peso, pd = z.derecha.peso;
      const ang = lim((pd - pi) / (Math.max(Math.abs(pi), Math.abs(pd), 1)) * .22, -.22, .22), dx = Math.cos(ang) * brazo, dy = Math.sin(ang) * brazo;
      S(`M${cx} ${cy} L${cx - 30} 200 L${cx + 30} 200 Z`); S(linea(cx - dx, cy - dy, cx + dx, cy + dy, .3), { ancho: 4 });
      [[-1, z.izquierda, tn(0)], [1, z.derecha, tn(2)]].forEach(([s, l, c]) => { const px = cx + s * dx, py = cy + s * dy;
        S(linea(px, py, px - 30, py + 50, .3), { ancho: 1.6, fase: 1 }); S(linea(px, py, px + 30, py + 50, .3), { ancho: 1.6, fase: 1 });
        R(`M${f1(px - 44)} ${f1(py + 50)} Q${f1(px)} ${f1(py + 82)} ${f1(px + 44)} ${f1(py + 50)} Z`, c.c, 1); S(`M${f1(px - 44)} ${f1(py + 50)} Q${f1(px)} ${f1(py + 82)} ${f1(px + 44)} ${f1(py + 50)} Z`, { color: c.t, fase: 1 });
        T(l.texto, px, py + 100, { tam: 14, maxAncho: brazo * .9, fase: 2 }); });
      if(z.texto) T(z.texto, cx, 18, { tam: 15, fam: 'Mano', maxAncho: W - 30, fase: 3 });
    }),
    reloj: hacer((W) => Math.min(84, W * .26) * 2 + 60, ({ W, z, T, S, R, ctx }) => {
      const r = Math.min(84, W * .26), cx = r + 20, cy = r + 14, [hh, mm] = String(z.hora).split(':').map(Number);
      R(circulo(cx, cy, r, 0), '#fff', 0); S(circulo(cx, cy, r), { ancho: 3 });
      for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; S(linea(cx + Math.sin(a) * (r - 4), cy - Math.cos(a) * (r - 4), cx + Math.sin(a) * (r - (i % 3 ? 10 : 16)), cy - Math.cos(a) * (r - (i % 3 ? 10 : 16)), .1), { ancho: i % 3 ? 1.6 : 2.6, fase: 1 }); }
      [12, 3, 6, 9].forEach((n, i) => { const a = i / 4 * Math.PI * 2; T(String(n), cx + Math.sin(a) * (r - 30), cy - Math.cos(a) * (r - 30), { tam: 14, color: '#6B6677', fase: 1 }); });
      const am = (mm || 0) / 60 * Math.PI * 2, ah = ((hh || 0) % 12 + (mm || 0) / 60) / 12 * Math.PI * 2;
      S(linea(cx, cy, cx + Math.sin(ah) * r * .5, cy - Math.cos(ah) * r * .5, .1), { ancho: 5, fase: 2, color: ctx.tinta.t }); S(linea(cx, cy, cx + Math.sin(am) * r * .78, cy - Math.cos(am) * r * .78, .1), { ancho: 3, fase: 2, color: ctx.tinta2.t });
      T(z.hora, cx + r + 30, cy - 14, { tam: 26, ancla: 'start', color: ctx.tinta.t, fase: 3 });
      if(z.texto) T(z.texto, cx + r + 30, cy + 22, { tam: 15, fam: 'Mano', ancla: 'start', maxAncho: W - cx - r - 40, fase: 3 });
    }),
    regla: hacer(166, ({ W, z, T, S, R, ctx }) => {
      const x0 = 18, x1 = W - 18, y = 52, a = z.desde, b = z.hasta, pasos = Math.min(20, Math.max(2, Math.round(b - a))), X = (v) => x0 + (x1 - x0) * lim((v - a) / ((b - a) || 1), 0, 1);
      R(caja(x0 - 6, y - 26, x1 - x0 + 12, 40, 6, 0), '#FBEFC8', 0); S(caja(x0 - 6, y - 26, x1 - x0 + 12, 40, 6), { color: '#B88A1B' });
      for(let i = 0; i <= pasos; i++){ const v = a + (b - a) * i / pasos, xx = X(v); S(linea(xx, y - 26, xx, y - 26 + (i % 5 === 0 || i === pasos ? 18 : 10), .1), { ancho: 1.4, fase: 1, color: '#6B5414' }); if(i % (pasos > 10 ? 5 : 1) === 0 || i === pasos) T(fmt(v), xx, y + 2, { tam: 11, color: '#6B5414', fase: 1 }); }
      if(z.unidad) T(z.unidad, x1, y - 36, { tam: 12, ancla: 'end', color: '#6B5414', fase: 1 });
      (z.marcas || []).forEach((m, i) => { const xx = X(m.valor), yy = y + 46 + (i % 2) * 34; S(flecha(xx, yy - 14, xx, y + 16, { punta: 7 }), { color: ctx.tinta.t, ancho: 1.8, fase: 3 }); T(m.texto, lim(xx, 64, W - 64), yy, { tam: 14, fam: 'Mano', color: ctx.tinta.t, maxAncho: 140, fase: 3 }); });
    }),
    progreso: hacer((W, z) => z.barras.length * 48 + 8, ({ W, z, T, S, R, tn }) => {
      const lw = Math.min(150, W * .36), x = lw + 16, bw = W - x - 56;
      z.barras.forEach((b, i) => { const y = 14 + i * 48, c = tn(i), k = lim(b.valor, 0, 100) / 100;
        T(b.texto, lw, y + 12, { tam: 14, ancla: 'end', maxAncho: lw - 4, fase: 2 });
        R(caja(x, y, bw, 24, 12, 0), '#EFEAF3', 0); R(caja(x, y, Math.max(24, bw * k), 24, 12, 0), c.c, 1); S(caja(x, y, Math.max(24, bw * k), 24, 12), { color: c.t, fase: 1 });
        T(`${fmt(b.valor)} %`, x + bw + 8, y + 12, { tam: 13, ancla: 'start', color: c.t, fase: 3 }); });
    }),

    /* ══ matemáticas ══ */
    recta: hacer(140, ({ W, z, T, S, R, ctx, tn }) => {
      const x0 = 24, x1 = W - 24, y = 62, a = z.desde, b = z.hasta, X = (v) => x0 + 14 + (x1 - x0 - 28) * lim((v - a) / ((b - a) || 1), 0, 1);
      if(z.intervalo){ const ia = X(z.intervalo.desde), ib = X(z.intervalo.hasta); R(caja(ia, y - 8, ib - ia, 16, 6, 0), ctx.tinta.c, 1, .9); }
      S(flecha(x0 + 20, y, x0, y, { punta: 9 }), { ancho: 2.6 }); S(flecha(x0, y, x1, y, { punta: 9 }), { ancho: 2.6 });
      const paso = (b - a) <= 20 ? 1 : Math.ceil((b - a) / 10);
      for(let v = Math.ceil(a); v <= b; v += paso){ S(linea(X(v), y - 7, X(v), y + 7, .1), { ancho: 1.6, fase: 1 }); T(fmt(v), X(v), y + 22, { tam: 12, color: '#6B6677', fase: 1 }); }
      (z.puntos || []).forEach((p, i) => { const c = tn(i + 1), xx = X(p.valor); S(circulo(xx, y, 6.5, .1), { color: c.t, relleno: c.t, fase: 2 }); if(p.texto) T(p.texto, xx, y - 30 - (i % 2) * 22, { tam: 14, fam: 'Mano', color: c.t, maxAncho: 120, fase: 3 }); });
    }),
    plano: hacer((W) => Math.min(W * .78, 330), ({ W, A, z, T, S, ctx, tn }) => {
      const ps = z.puntos || [], xs = [-5, 5, ...ps.map((p) => p.x)], ys = [-5, 5, ...ps.map((p) => p.y)];
      const mnx = Math.floor(Math.min(...xs)), mxx = Math.ceil(Math.max(...xs)), mny = Math.floor(Math.min(...ys)), mxy = Math.ceil(Math.max(...ys));
      const m = 22, X = (v) => m + (W - 2 * m) * (v - mnx) / ((mxx - mnx) || 1), Y = (v) => A - m - (A - 2 * m) * (v - mny) / ((mxy - mny) || 1);
      for(let v = mnx; v <= mxx; v++) S(linea(X(v), m, X(v), A - m, .1), { color: '#E1DCE8', ancho: 1 });
      for(let v = mny; v <= mxy; v++) S(linea(m, Y(v), W - m, Y(v), .1), { color: '#E1DCE8', ancho: 1 });
      S(flecha(m - 6, Y(0), W - m + 8, Y(0), { punta: 8 }), { ancho: 2.2, fase: 1 }); S(flecha(X(0), A - m + 6, X(0), m - 8, { punta: 8 }), { ancho: 2.2, fase: 1 });
      T('x', W - m + 4, Y(0) + 16, { tam: 13, color: '#6B6677', fase: 1 }); T('y', X(0) + 12, m - 6, { tam: 13, color: '#6B6677', fase: 1 });
      if(z.recta){ const f = (x) => z.recta.m * x + z.recta.b; S(linea(X(mnx), Y(lim(f(mnx), mny, mxy)), X(mxx), Y(lim(f(mxx), mny, mxy)), .3), { color: ctx.tinta.t, ancho: 3, fase: 2 });
        if(z.recta.texto) T(z.recta.texto, W - m, m + 10, { tam: 15, fam: 'Mano', ancla: 'end', color: ctx.tinta.t, fase: 3 }); }
      ps.forEach((p, i) => { const c = tn(i + 1); S(circulo(X(p.x), Y(p.y), 5.5, .1), { color: c.t, relleno: c.t, fase: 2 }); T(p.texto || `(${fmt(p.x)}, ${fmt(p.y)})`, X(p.x) + 9, Y(p.y) - 12, { tam: 13, ancla: 'start', color: c.t, fase: 3 }); });
    }),
    fraccion: hacer((W, z) => z.texto && W < 480 ? 250 : 210, ({ W, z, T, S, R, ctx }) => {
      const d = lim(Math.round(z.denominador), 1, 24), n = lim(Math.round(z.numerador), 0, d), r = Math.min(86, W * .22), cx = r + 18, cy = 104;
      if(d <= 12){ for(let i = 0; i < d; i++){ const a0 = -Math.PI / 2 + i / d * Math.PI * 2, a1 = a0 + Math.PI * 2 / d; if(i < n) R(sector(cx, cy, r, a0, a1), ctx.tinta.c, 1); if(d > 1) S(linea(cx, cy, cx + r * Math.cos(a0), cy + r * Math.sin(a0), .2), { ancho: 1.8, fase: 1 }); } S(circulo(cx, cy, r), { ancho: 2.8 }); }
      else { const bw = cx * 2 - 20, cw = bw / d; for(let i = 0; i < d; i++){ if(i < n) R(caja(10 + i * cw, cy - 20, cw, 40, 2, 0), ctx.tinta.c, 1); S(caja(10 + i * cw, cy - 20, cw, 40, 2, .3), { ancho: 1.4, fase: 1 }); } }
      const fx = cx + r + 50; T(String(z.numerador), fx, cy - 26, { tam: 34, color: ctx.tinta.t, fase: 2 }); S(linea(fx - 26, cy, fx + 26, cy, .2), { ancho: 3, color: ctx.tinta.t, fase: 2 }); T(String(z.denominador), fx, cy + 28, { tam: 34, color: ctx.tinta.t, fase: 2 });
      if(z.texto){ if(W - fx - 50 >= 120) T(z.texto, fx + 40, cy, { tam: 15, fam: 'Mano', ancla: 'start', maxAncho: W - fx - 50, fase: 3 }); else T(z.texto, W / 2, cy + r + 34, { tam: 15, fam: 'Mano', maxAncho: W - 30, fase: 3 }); }
    }),
    operacion: hacer((W, z) => z.numeros.length * 40 + 80, ({ W, z, T, S, ctx }) => {
      const xr = Math.min(W - 30, W / 2 + 80), op = z.operador || '+';
      z.numeros.forEach((n, i) => { const y = 28 + i * 40; T(n, xr, y, { tam: 28, ancla: 'end', fase: 2 }); if(i === z.numeros.length - 1) T(op, xr - 130, y, { tam: 28, color: ctx.tinta.t, fase: 2 }); });
      const yl = 28 + z.numeros.length * 40 - 16; S(linea(xr - 150, yl, xr + 6, yl, .3), { ancho: 3, fase: 1 });
      T(z.resultado, xr, yl + 30, { tam: 30, ancla: 'end', color: ctx.tinta.t, fase: 3 });
      if(z.texto) T(z.texto, 16, yl + 30, { tam: 14, fam: 'Mano', ancla: 'start', maxAncho: Math.max(60, xr - 190), fase: 3 });
    }),
    ecuacion: hacer((W, z) => z.pasos.length * 58 + 60, ({ W, z, T, S, R, ctx }) => {
      z.pasos.forEach((p, i) => { const y = 24 + i * 58; T(p.expresion, W / 2, y, { tam: 22, fase: 2, maxAncho: W - 40 });
        if(p.nota) T(p.nota, W - 12, y + 29, { tam: 13, fam: 'Mano', ancla: 'end', color: ctx.tinta2.t, fase: 3, maxAncho: W / 2 - 30 });
        if(i < z.pasos.length - 1) S(flecha(W / 2, y + 16, W / 2, y + 42, { punta: 7 }), { color: SUAVE, ancho: 2, fase: 1 }); });
      const y = 24 + z.pasos.length * 58, w = Math.min(W - 20, medirTexto(z.resultado, '700 22px Texto') + 40);
      R(caja(W / 2 - w / 2, y - 22, w, 44, 12, 0), ctx.tinta.c, 3); S(caja(W / 2 - w / 2, y - 22, w, 44, 12), { color: ctx.tinta.t, ancho: 2.8, fase: 3 }); T(z.resultado, W / 2, y, { tam: 22, color: ctx.tinta.t, fase: 3 });
    }),
    angulo: hacer(190, ({ W, z, T, S, R, ctx }) => {
      const g = lim(z.grados, 1, 359), a = g * Math.PI / 180, L = Math.min(130, W * .42), vy = g > 180 ? 95 : 150, vx = lim(Math.max(20, 20 - L * Math.cos(a)), 20, W - L - 20);
      R(sector(vx, vy, 44, -a, 0), ctx.tinta.c, 1);
      S(linea(vx, vy, vx + L, vy, .3), { ancho: 3 }); S(linea(vx, vy, vx + L * Math.cos(a), vy - L * Math.sin(a), .3), { ancho: 3 });
      if(g === 90) S(`M${vx + 22} ${vy} V${vy - 22} H${vx}`, { color: ctx.tinta.t, ancho: 2, fase: 1 }); else S(`M${vx + 44} ${vy} A44 44 0 ${g > 180 ? 1 : 0} 0 ${f1(vx + 44 * Math.cos(a))} ${f1(vy - 44 * Math.sin(a))}`, { color: ctx.tinta.t, ancho: 2, fase: 1 });
      T(`${fmt(g)}°`, vx + 64 * Math.cos(a / 2), vy - 64 * Math.sin(a / 2), { tam: 20, color: ctx.tinta.t, fase: 2 });
      const tipo = g < 90 ? 'agudo' : g === 90 ? 'recto' : g < 180 ? 'obtuso' : g === 180 ? 'llano' : 'cóncavo';
      const letrero = z.texto || (new RegExp(tipo, 'i').test(z.titulo || '') ? '' : `Ángulo ${tipo}`); if(letrero) T(letrero, W - 14, 30, { tam: 16, fam: 'Mano', ancla: 'end', maxAncho: W * .45, fase: 3 });
    }),
    triangulo: hacer(220, ({ W, z, T, S, R, ctx }) => {
      const b = Math.min(240, W * .62), x0 = (W - b) / 2, y0 = 180, A_ = [x0, y0], B = [x0 + b, y0], C = [x0, y0 - 140];
      R(`M${A_} L${B} L${C} Z`, ctx.tinta.c, 0, .7); S(`M${A_[0]} ${A_[1]} L${B[0]} ${B[1]} L${C[0]} ${C[1]} Z`, { color: ctx.tinta.t, ancho: 2.8 });
      S(`M${x0 + 18} ${y0} V${y0 - 18} H${x0}`, { ancho: 1.8, fase: 1 });
      const [l1, l2, l3] = z.lados; T(l1, x0 + b / 2, y0 + 20, { tam: 15, fase: 2 }); T(l2, x0 - 12, y0 - 70, { tam: 15, ancla: 'end', fase: 2 }); T(l3, x0 + b / 2 + 16, y0 - 82, { tam: 15, ancla: 'start', fase: 2 });
      if(z.texto) T(z.texto, W / 2, 18, { tam: 16, fam: 'Mano', color: ctx.tinta2.t, maxAncho: W - 30, fase: 3 });
    }),
    figura: hacer(230, ({ W, z, T, S, R, ctx }) => {
      const f = z.figura, m = z.medidas || [], cx = f === 'rectangulo' || f === 'cuadrado' ? Math.min(W / 2, W - 120 - Math.min(150, W * .42) * (f === 'rectangulo' ? .7 : .5)) : W / 2, cy = 100, s = Math.min(150, W * .42, f === 'rectangulo' ? (W - 150) / 1.4 : 999);
      let d;
      if(f === 'circulo'){ d = circulo(cx, cy, s / 2); S(linea(cx, cy, cx + s / 2, cy, .2), { color: ctx.tinta2.t, ancho: 2, fase: 1 }); if(m[0]) T(m[0], cx + s / 4, cy - 14, { tam: 14, color: ctx.tinta2.t, fase: 2 }); }
      else if(f === 'triangulo') d = `M${cx} ${cy - s / 2} L${cx + s / 2} ${cy + s / 2} L${cx - s / 2} ${cy + s / 2} Z`;
      else if(f === 'hexagono') d = [...Array(6)].map((_, i) => { const a = i / 6 * Math.PI * 2; return `${i ? 'L' : 'M'}${f1(cx + s / 2 * Math.cos(a))} ${f1(cy + s / 2 * Math.sin(a))}`; }).join('') + 'Z';
      else if(f === 'rombo') d = `M${cx} ${cy - s / 2} L${cx + s / 2} ${cy} L${cx} ${cy + s / 2} L${cx - s / 2} ${cy} Z`;
      else if(f === 'trapecio') d = `M${cx - s / 4} ${cy - s / 3} L${cx + s / 4} ${cy - s / 3} L${cx + s / 2} ${cy + s / 3} L${cx - s / 2} ${cy + s / 3} Z`;
      else { const ww = f === 'rectangulo' ? s * 1.4 : s, hh = f === 'rectangulo' ? s * .7 : s; d = `M${cx - ww / 2} ${cy - hh / 2} H${cx + ww / 2} V${cy + hh / 2} H${cx - ww / 2} Z`;
        if(m[0]) T(m[0], cx, cy + hh / 2 + 16, { tam: 14, fase: 2 }); if(m[1]) T(m[1], cx + ww / 2 + 10, cy, { tam: 14, ancla: 'start', fase: 2, maxAncho: Math.max(50, W - cx - ww / 2 - 16) }); }
      R(d, ctx.tinta.c, 0, .8); S(d, { color: ctx.tinta.t, ancho: 2.8 });
      if(f !== 'circulo' && f !== 'cuadrado' && f !== 'rectangulo' && m.length) T(m.join(' · '), cx, cy + s / 2 + 18, { tam: 14, fase: 2, maxAncho: W - 30 });
      if(z.formula) T(z.formula, cx, 212, { tam: 18, color: ctx.tinta.t, fase: 3, maxAncho: W - 20 });
    }),
    conjunto: hacer(190, ({ W, z, T, S, R, ctx }) => {
      const cx = W / 2, cy = 104, rx = Math.min(W * .42, 200), ry = 70, es = z.elementos.slice(0, 12);
      R(ovalo(cx, cy, rx, ry, 0), ctx.tinta.c, 0, .7); S(ovalo(cx, cy, rx, ry), { color: ctx.tinta.t, ancho: 2.8 });
      T(z.nombre, cx - rx + 4, cy - ry - 4, { tam: 20, fam: 'Mano', ancla: 'start', color: ctx.tinta.t, fase: 1 });
      const cols = Math.min(4, es.length), filas = Math.ceil(es.length / cols);
      es.forEach((e, i) => { const c = i % cols, f = Math.floor(i / cols); T(e, cx - rx * .62 + (rx * 1.24) * (c + .5) / cols, cy - ry * .5 + (ry) * (f + .5) / filas, { tam: 15, fase: 2, maxAncho: rx * 1.1 / cols }); });
    }),
    porcentaje: hacer(200, ({ W, z, T, S, R, ctx }) => {
      const c = Math.min(16, (W * .5) / 10), x0 = 14, y0 = 14, v = Math.round(lim(z.valor, 0, 100));
      for(let i = 0; i < 100; i++){ const x = x0 + (i % 10) * c, y = y0 + Math.floor(i / 10) * c; if(i < v) R(caja(x + 1, y + 1, c - 2, c - 2, 2, 0), ctx.tinta.t, 1, .85); }
      for(let i = 0; i <= 10; i++){ S(linea(x0 + i * c, y0, x0 + i * c, y0 + 10 * c, .1), { color: '#D3CCDC', ancho: 1 }); S(linea(x0, y0 + i * c, x0 + 10 * c, y0 + i * c, .1), { color: '#D3CCDC', ancho: 1 }); }
      const tx = x0 + 10 * c + 26; T(`${fmt(z.valor)} %`, tx, y0 + 40, { tam: 34, ancla: 'start', color: ctx.tinta.t, fase: 2 });
      if(z.texto) T(z.texto, tx, y0 + 96, { tam: 15, fam: 'Mano', ancla: 'start', maxAncho: Math.max(80, W - tx - 10), fase: 3 });
    }),
    secuencia: hacer(130, ({ W, z, T, S, R, ctx, tn }) => {
      const ts = z.terminos.slice(0, 7), n = ts.length + 1, paso = (W - 20) / n, y = 80, r = Math.min(26, paso * .36);
      ts.forEach((v, i) => { const x = 10 + paso * (i + .5), c = tn(i); R(circulo(x, y, r, 0), c.c, 0); S(circulo(x, y, r), { color: c.t }); T(v, x, y, { tam: 16, fase: 2, maxAncho: r * 1.8 });
        if(i < ts.length - 1){ S(flecha(x + r * .6, y - r - 4, x + paso - r * .6, y - r - 4, { curva: -.25, punta: 7 }), { color: SUAVE, ancho: 1.8, fase: 1 }); if(z.regla) T(z.regla, x + paso / 2, y - r - 26, { tam: 14, fam: 'Mano', color: ctx.tinta2.t, fase: 3 }); } });
      T('…', 10 + paso * (ts.length + .5), y, { tam: 24, color: SUAVE, fase: 3 });
    }),

    /* ══ ciencias ══ */
    atomo: hacer((W, z) => Math.min(70 + z.capas.length * 34, W * .48) * 2 + 40, ({ W, A, z, T, S, R, ctx }) => {
      const n = z.capas.length, rmax = Math.min(70 + n * 34, W * .48) - 12, cx = W - (A / 2 + 30) - rmax < 110 ? W / 2 : A / 2 + 30, cy = A / 2 - 6;
      R(circulo(cx, cy, 30, 0), ctx.tinta.c, 0); S(circulo(cx, cy, 30), { color: ctx.tinta.t, ancho: 2.6 }); T(z.simbolo, cx, cy, { tam: 22, color: ctx.tinta.t, fase: 2 });
      z.capas.forEach((e, i) => { const r = 30 + (rmax - 30) * (i + 1) / n; S(circulo(cx, cy, r, .3), { color: SUAVE, ancho: 1.6, fase: 1 });
        for(let k = 0; k < e; k++){ const a = k / e * Math.PI * 2 + i * .5; S(circulo(cx + r * Math.cos(a), cy + r * Math.sin(a), 5, .1), { color: ctx.tinta2.t, relleno: ctx.tinta2.t, fase: 2 }); } });
      const info = [z.nombre, z.protones != null ? `${z.protones} protones` : '', z.neutrones != null ? `${z.neutrones} neutrones` : '', `${z.capas.reduce((a, b) => a + b, 0)} electrones`].filter(Boolean);
      if(W - (cx + rmax) > 110) info.forEach((s, i) => T(s, cx + rmax + 16, cy - 30 + i * 22, { tam: i ? 13 : 17, ancla: 'start', color: i ? '#6B6677' : ctx.tinta.t, fase: 3, maxAncho: W - cx - rmax - 22 }));
      else T(info.join(' · '), W / 2, A - 24, { tam: 13, fase: 3, maxAncho: W - 20 });
    }),
    elemento: hacer(200, ({ W, z, T, S, R, ctx }) => {
      const s = 150, x = 14, y = 20;
      R(caja(x, y, s, s, 10, 0), ctx.tinta.c, 0); S(caja(x, y, s, s, 10), { color: ctx.tinta.t, ancho: 3 });
      T(String(z.numero ?? ''), x + 12, y + 20, { tam: 18, ancla: 'start', fase: 1 }); T(z.simbolo, x + s / 2, y + s / 2 - 4, { tam: 54, color: ctx.tinta.t, fase: 2 });
      T(z.nombre, x + s / 2, y + s - 34, { tam: 15, fase: 2, maxAncho: s - 12 }); T(z.masa != null ? String(z.masa) : '', x + s / 2, y + s - 14, { tam: 12, color: '#6B6677', fase: 2 });
      if(z.texto && W > s + 120) T(z.texto, x + s + 22, y + s / 2, { tam: 15, fam: 'Mano', ancla: 'start', maxAncho: W - s - 50, fase: 3 });
    }),
    molecula: hacer(230, ({ W, z, T, S, R, tn }) => {
      /* el primero al centro y los demás alrededor; con dos alrededor, en «V» como el agua */
      const at = z.atomos.slice(0, 9), cx = W / 2, cy = 92, rr = Math.min(80, W * .22), m = at.length - 1;
      const ang = (i) => m === 2 ? Math.PI / 2 + (i ? -.92 : .92) : (i / m) * Math.PI * 2 - Math.PI / 2;
      const pos = at.map((_, i) => i === 0 ? [cx, cy] : [cx + rr * Math.cos(ang(i - 1)), cy + rr * Math.sin(ang(i - 1))]);
      if(at.length === 2) pos[1] = [cx + rr * .7, cy], pos[0] = [cx - rr * .7, cy];
      const rad = (i) => i === 0 ? 26 : 20;
      (z.enlaces || at.slice(1).map((_, i) => [0, i + 1])).forEach(([a, b, doble]) => { if(!pos[a] || !pos[b]) return; const [p, q] = [pos[a], pos[b]], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const p1 = [p[0] + ux * rad(a), p[1] + uy * rad(a)], q1 = [q[0] - ux * rad(b), q[1] - uy * rad(b)], o = doble ? 4 : 0;
        S(linea(p1[0] - uy * o, p1[1] + ux * o, q1[0] - uy * o, q1[1] + ux * o, .3), { ancho: 3, fase: 0 }); if(doble) S(linea(p1[0] + uy * o, p1[1] - ux * o, q1[0] + uy * o, q1[1] - ux * o, .3), { ancho: 3, fase: 0 }); });
      const col = {}; let k = 0;
      at.forEach((s, i) => { const c = col[s] || (col[s] = tn(k++)), r = rad(i); R(circulo(...pos[i], r, 0), c.c, 1); S(circulo(...pos[i], r), { color: c.t, fase: 1 }); T(s, ...pos[i], { tam: i === 0 ? 18 : 15, color: c.t, fase: 2 }); });
      T(z.formula, cx, 212, { tam: 20, color: GRIS, fase: 3 });
    }),
    reaccion: hacer((W, z) => W < 520 ? 210 : 120, ({ W, z, T, S, R, ctx, tn }) => {
      const fila = (xs, y, i0) => { const n = xs.length, paso = (W - 20) / n; xs.forEach((s, i) => { const x = 10 + paso * (i + .5); pill(S, R, T, x, y, s, tn(i0 + i), { max: Math.min(140, paso - 26), fase: 0 }); if(i < n - 1) T('+', 10 + paso * (i + 1), y, { tam: 24, color: GRIS, fase: 1 }); }); };
      if(W < 520){ fila(z.reactivos, 30, 0); S(flecha(W / 2, 64, W / 2, 140, { punta: 10 }), { ancho: 3, fase: 1 }); if(z.condicion) T(z.condicion, W / 2 + 12, 102, { tam: 14, fam: 'Mano', ancla: 'start', color: ctx.tinta2.t, fase: 3, maxAncho: W / 2 - 24 }); fila(z.productos, 176, 3); }
      else { const mitad = W / 2, ancho = mitad - 60; const sub = (xs, x0, i0) => { const paso = ancho / xs.length; xs.forEach((s, i) => { const x = x0 + paso * (i + .5); pill(S, R, T, x, 60, s, tn(i0 + i), { max: Math.min(130, paso - 28) }); if(i < xs.length - 1) T('+', x0 + paso * (i + 1), 60, { tam: 22, fase: 1 }); }); };
        sub(z.reactivos, 10, 0); S(flecha(mitad - 40, 60, mitad + 40, 60, { punta: 10 }), { ancho: 3, fase: 1 }); if(z.condicion) T(z.condicion, mitad, 34, { tam: 13, fam: 'Mano', color: ctx.tinta2.t, fase: 3, maxAncho: 120 }); sub(z.productos, mitad + 50, 3); }
    }),
    celula: hacer(270, ({ W, z, T, S, R, ctx, tn }) => {
      const cx = W / 2, cy = 135, rx = Math.min(W * .3, 170), ry = 100, ps = z.partes.slice(0, 8);
      R(ovalo(cx, cy, rx, ry, 0), '#F0F8EC', 0); S(ovalo(cx, cy, rx, ry), { color: VERDE, ancho: 3.2 });
      R(circulo(cx - rx * .15, cy - 6, 32, 0), ctx.tinta.c, 1); S(circulo(cx - rx * .15, cy - 6, 32), { color: ctx.tinta.t, fase: 1 }); S(circulo(cx - rx * .12, cy - 2, 9, .2), { color: ctx.tinta.t, relleno: ctx.tinta.t, fase: 1 });
      const sitios = [[.45, -.35], [.5, .3], [-.55, .45], [-.6, -.4], [.15, .6], [.2, -.65], [.7, 0], [-.75, .05]];
      sitios.slice(0, ps.length).forEach(([sx, sy], i) => { const c = tn(i + 2); S(ovalo(cx + rx * sx, cy + ry * sy, 13, 8, .3), { color: c.t, ancho: 1.8, fase: 1 }); });
      ps.forEach((p, i) => { const izq = i % 2 === 0, [sx, sy] = sitios[i] || [0, 0], px = cx + rx * sx, py = cy + ry * sy, lx = izq ? 6 : W - 6, ly = 20 + Math.floor(i / 2) * 60, c = tn(i + 2);
        const label = i === 0 ? [cx - rx * .15, cy - 6] : [px, py];
        S(linea(izq ? lx + 70 : lx - 70, ly + 8, label[0], label[1], .3), { color: c.t, ancho: 1.4, fase: 3 }); T(p, lx, ly, { tam: 13, ancla: izq ? 'start' : 'end', color: c.t, fase: 3, maxAncho: Math.max(70, (W - rx * 2) / 2 - 10) }); });
    }),
    circuito: hacer(230, ({ W, z, T, S, ctx }) => {
      const x0 = Math.max(40, W * .18), x1 = W - Math.max(40, W * .18), y0 = 40, y1 = 190, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, es = z.elementos.slice(0, 4);
      const slots = [['izq', x0, my], ['arriba', mx, y0], ['der', x1, my], ['abajo', mx, y1]];
      S(`M${x0} ${y0} H${x1} V${y1} H${x0} Z`, { ancho: 2.4 });
      es.forEach((e, i) => { const [lado, x, y] = slots[i], vert = lado === 'izq' || lado === 'der', c = ctx.tinta.t;
        if(vert) S(`M${x - 8} ${y - 18} H${x + 8} M${x - 8} ${y + 18} H${x + 8}`, { color: '#FAF8F4', ancho: 6 });
        if(e.tipo === 'pila'){ S(`M${x - 16} ${y - 4} H${x + 16} M${x - 8} ${y + 6} H${x + 8}`.replace(/H/g, 'H'), { color: c, ancho: 3, fase: 1 }); }
        else if(e.tipo === 'foco'){ S(circulo(x, y, 15), { color: AMBAR, ancho: 2.6, fase: 1 }); S(`M${x - 10} ${y - 10} L${x + 10} ${y + 10} M${x + 10} ${y - 10} L${x - 10} ${y + 10}`, { color: AMBAR, ancho: 2, fase: 1 }); }
        else if(e.tipo === 'interruptor'){ S(circulo(x - 14, y, 3, .1), { color: c, relleno: c, fase: 1 }); S(`M${x - 14} ${y} L${x + 12} ${y - 14}`, { color: c, ancho: 2.6, fase: 1 }); }
        else if(e.tipo === 'resistencia'){ S(vert ? `M${x} ${y - 20} l8 5 -16 7 16 7 -16 7 16 7 -8 4` : `M${x - 20} ${y} l5 -8 7 16 7 -16 7 16 7 -16 4 8`, { color: c, ancho: 2.4, fase: 1 }); }
        else S(caja(x - 14, y - 10, 28, 20, 4), { color: c, fase: 1 });
        /* el nombre va hacia ADENTRO del circuito: afuera no cabe en un teléfono */
        const lx = lado === 'izq' ? x + 26 : lado === 'der' ? x - 26 : x, ly = lado === 'arriba' ? y + 26 : lado === 'abajo' ? y - 24 : y;
        T(e.texto || e.tipo, lx, ly, { tam: 13, fam: 'Mano', ancla: lado === 'izq' ? 'start' : lado === 'der' ? 'end' : 'middle', color: ctx.tinta2.t, fase: 3, maxAncho: lado === 'izq' || lado === 'der' ? (x1 - x0) / 2 - 34 : x1 - x0 - 20 }); });
    }),
    fuerzas: hacer(250, ({ W, z, T, S, R, ctx, tn }) => {
      const cx = W / 2, cy = 125, bw = 90, bh = 64, L = 70, V = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
      R(caja(cx - bw / 2, cy - bh / 2, bw, bh, 8, 0), ctx.tinta.c, 0); S(caja(cx - bw / 2, cy - bh / 2, bw, bh, 8), { color: ctx.tinta.t, ancho: 2.8 }); T(z.objeto, cx, cy, { tam: 14, maxAncho: bw - 8, fase: 1 });
      z.fuerzas.forEach((f, i) => { const [dx, dy] = V[f.direccion] || [0, 1], c = tn(i + 1), sx = cx + dx * (dx ? bw / 2 : 0), sy = cy + dy * (dy ? bh / 2 : 0), ex = sx + dx * L, ey = sy + dy * L;
        S(flecha(sx, sy, ex, ey, { punta: 11 }), { color: c.t, ancho: 3.4, fase: 2 });
        T(f.texto, ex + dx * 10 + (dy ? 10 : 0), ey + dy * 14, { tam: 14, fam: 'Mano', ancla: dx < 0 ? 'end' : 'start', color: c.t, fase: 3, maxAncho: dx ? Math.max(60, W / 2 - bw / 2 - L - 20) : W / 2 - 10 }); });
    }),
    ondas: hacer(180, ({ W, z, T, S, ctx }) => {
      const y = 90, amp = 44, x0 = 20, x1 = W - 20, ciclos = lim(z.ciclos || 2, 1, 5), lon = (x1 - x0) / ciclos;
      S(linea(x0, y, x1, y, .2), { color: '#D3CCDC', ancho: 1.4 });
      let d = `M${x0} ${y}`; for(let x = x0; x <= x1; x += 4) d += ` L${f1(x)} ${f1(y - amp * Math.sin((x - x0) / lon * Math.PI * 2))}`; S(d, { color: ctx.tinta.t, ancho: 3, fase: 1 });
      const xc = x0 + lon / 4; S(flecha(xc, y, xc, y - amp, { punta: 7 }), { color: ctx.tinta2.t, ancho: 1.8, fase: 2 }); T(z.amplitud || 'amplitud', xc + 8, y - amp / 2, { tam: 13, fam: 'Mano', ancla: 'start', color: ctx.tinta2.t, fase: 3 });
      S(`M${f1(xc)} ${y + amp + 14} H${f1(xc + lon)}`, { color: ctx.tinta2.t, ancho: 1.8, fase: 2 }); T(z.longitud || 'longitud de onda', xc + lon / 2, y + amp + 30, { tam: 13, fam: 'Mano', color: ctx.tinta2.t, fase: 3 });
      if(z.texto) T(z.texto, W - 20, 16, { tam: 14, ancla: 'end', maxAncho: W * .6, fase: 3 });
    }),
    capas: hacer((W, z) => z.capas.length * 46 + 8, ({ W, z, T, S, R, tn }) => {
      z.capas.forEach((c, i) => { const y = 4 + i * 46, k = tn(i); R(caja(10, y, W - 20, 42, 8, 0), k.c, 0); S(caja(10, y, W - 20, 42, 8), { color: k.t, ancho: 2, fase: 0 });
        T(c.nombre, 24, y + 21, { tam: 15, ancla: 'start', color: k.t, fase: 1, maxAncho: W * .4 }); if(c.texto) T(c.texto, W - 24, y + 21, { tam: 13, ancla: 'end', fase: 2, maxAncho: W * .5 }); });
    }),
    cadena: hacer((W, z) => Math.ceil(z.eslabones.length / Math.max(1, Math.floor((W - 20) / 150))) * 90 + 10, ({ W, z, T, S, R, tn }) => {
      const porFila = Math.max(1, Math.floor((W - 20) / 150)), cw = (W - 20) / porFila;
      const pos = z.eslabones.map((_, i) => { const f = Math.floor(i / porFila), c = i % porFila, col = f % 2 ? porFila - 1 - c : c; return [10 + cw * (col + .5), 50 + f * 90]; });
      z.eslabones.forEach((s, i) => { pill(S, R, T, ...pos[i], s, tn(i), { max: cw - 40 }); if(pos[i + 1]){ const [a, b] = [pos[i], pos[i + 1]]; S(a[1] === b[1] ? flecha(a[0] + (b[0] > a[0] ? 1 : -1) * (cw / 2 - 12), a[1], b[0] - (b[0] > a[0] ? 1 : -1) * (cw / 2 - 12), b[1], { punta: 8 }) : flecha(a[0], a[1] + 24, b[0], b[1] - 24, { punta: 8 }), { color: SUAVE, ancho: 2, fase: 1 }); } });
    }),
    estados: hacer(270, ({ W, z, T, S, R, ctx, tn }) => {
      const es = z.estados.slice(0, 3), r = Math.min(W * .32, 150), cx = W / 2, cy = 145, pos = [[cx, cy - r * .72], [cx + r, cy + r * .5], [cx - r, cy + r * .5]].map(([x, y]) => [lim(x, 60, W - 60), y]);
      es.forEach((s, i) => pill(S, R, T, ...pos[i], s, tn(i), { max: 120 }));
      (z.cambios || []).slice(0, 6).forEach((c) => { const a = es.indexOf(c.de), b = es.indexOf(c.a); if(a < 0 || b < 0) return; const [p, q] = [pos[a], pos[b]];
        const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        S(flecha(p[0] + ux * 50, p[1] + uy * 26, q[0] - ux * 50, q[1] - uy * 26, { curva: .18, punta: 8 }), { color: SUAVE, ancho: 2, fase: 1 });
        /* el letrero va del lado de AFUERA del triángulo: adentro se enciman */
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, gx = (pos[0][0] + pos[1][0] + pos[2][0]) / 3, gy = (pos[0][1] + pos[1][1] + pos[2][1]) / 3, sg = (-uy * (mx - gx) + ux * (my - gy)) >= 0 ? 1 : -1;
        T(c.texto, lim(mx - uy * 34 * sg, 50, W - 50), my + ux * 34 * sg, { tam: 13, fam: 'Mano', color: ctx.tinta2.t, fase: 3, maxAncho: 110 }); });
    }),

    /* ══ historia, sociales, idiomas ══ */
    personaje: hacer((W, z) => 120 + (z.datos || []).length * 26, ({ W, z, T, S, R, D, ctx }) => {
      R(circulo(54, 58, 42, 0), ctx.tinta.c, 0); S(circulo(54, 58, 42), { color: ctx.tinta.t, ancho: 2.6 }); D('user', 30, 34, 48, ctx.tinta.t, 1);
      T(z.nombre, 112, 36, { tam: 21, ancla: 'start', color: ctx.tinta.t, fase: 2, maxAncho: W - 120 }); if(z.fechas) T(z.fechas, 112, 62, { tam: 14, ancla: 'start', color: '#6B6677', fase: 2 }); if(z.rol) T(z.rol, 112, 86, { tam: 15, fam: 'Mano', ancla: 'start', color: ctx.tinta2.t, fase: 3, maxAncho: W - 120 });
      (z.datos || []).forEach((d, i) => { const y = 124 + i * 26; S(circulo(22, y, 3.5, .1), { color: ctx.tinta.t, relleno: ctx.tinta.t, fase: 3 }); T(d, 34, y, { tam: 14, ancla: 'start', fase: 3, maxAncho: W - 40 }); });
    }),
    periodo: hacer((W, z) => z.etapas.length * 40 + 54, ({ W, A, z, T, S, R, tn }) => {
      const es = z.etapas, mn = Math.min(...es.map((e) => e.desde)), mx = Math.max(...es.map((e) => e.hasta)), x0 = 14, x1 = W - 14, X = (v) => x0 + (x1 - x0) * (v - mn) / ((mx - mn) || 1);
      es.forEach((e, i) => { const y = 10 + i * 40, c = tn(i), a = X(e.desde), b = Math.max(X(e.hasta), a + 30); R(caja(a, y, b - a, 30, 8, 0), c.c, 0); S(caja(a, y, b - a, 30, 8), { color: c.t, ancho: 2, fase: 0 });
        const fuera = medirTexto(e.nombre, '700 13px Texto') > b - a - 10; T(e.nombre, fuera ? (b + 6 < x1 - 60 ? b + 6 : a - 6) : (a + b) / 2, y + 15, { tam: 13, ancla: fuera ? (b + 6 < x1 - 60 ? 'start' : 'end') : 'middle', color: c.t, fase: 2 }); });
      const ya = A - 30; S(flecha(x0, ya, x1 + 4, ya, { punta: 8 }), { ancho: 2, fase: 1 });
      T(fmt(mn), x0, ya + 16, { tam: 12, ancla: 'start', color: '#6B6677', fase: 1 }); T(fmt(mx), x1, ya + 16, { tam: 12, ancla: 'end', color: '#6B6677', fase: 1 });
    }),
    antesdespues: hacer((W, z) => { const n = Math.max(z.antes.length, z.despues.length); return W < 480 ? z.antes.length * 28 + z.despues.length * 28 + 180 : n * 28 + 90; }, ({ W, z, T, S, R, ctx, tn }) => {
      const angosto = W < 480, cw = angosto ? W - 20 : (W - 80) / 2, n = Math.max(z.antes.length, z.despues.length);
      const panel = (titulo, items, x, y, c, cruz) => { const hh = items.length * 28 + 50; R(caja(x, y, cw, hh, 14, 0), c.c, 0, .7); S(caja(x, y, cw, hh, 14), { color: c.t });
        T(titulo, x + 16, y + 22, { tam: 17, fam: 'Mano', ancla: 'start', color: c.t, fase: 1 }); items.forEach((s, i) => T(s, x + 16, y + 50 + i * 28, { tam: 14, ancla: 'start', maxAncho: cw - 28, fase: 2 })); return hh; };
      if(angosto){ const h1 = panel('Antes', z.antes, 10, 6, tn(0)); S(flecha(W / 2, h1 + 12, W / 2, h1 + 50, { punta: 9 }), { ancho: 3, fase: 2 }); if(z.cambio) T(z.cambio, W / 2 + 14, h1 + 31, { tam: 14, fam: 'Mano', ancla: 'start', color: ctx.tinta2.t, fase: 3, maxAncho: W / 2 - 24 }); panel('Después', z.despues, 10, h1 + 58, tn(3)); }
      else { panel('Antes', z.antes, 10, 6, tn(0)); panel('Después', z.despues, W - 10 - cw, 6, tn(3)); const y = 6 + (n * 28 + 50) / 2; S(flecha(cw + 18, y, W - cw - 18, y, { punta: 9 }), { ancho: 3, fase: 2 }); if(z.cambio) T(z.cambio, W / 2, y - 24, { tam: 13, fam: 'Mano', color: ctx.tinta2.t, fase: 3, maxAncho: 60 }); }
    }),
    consecuencias: hacer(230, ({ W, z, T, S, R, ctx, tn }) => {
      const ef = z.efectos.slice(0, 5), n = ef.length, paso = (W - 20) / n;
      pill(S, R, T, W / 2, 34, z.causa, ctx.tinta, { max: Math.min(260, W - 40), tam: 16 });
      ef.forEach((e, i) => { const x = 10 + paso * (i + .5); S(flecha(W / 2, 58, x, 150, { curva: (x - W / 2) / W * .3, punta: 8 }), { color: SUAVE, ancho: 2, fase: 1 }); pill(S, R, T, x, 182, e, tn(i + 1), { max: Math.max(70, paso - 26), tam: 13, fase: 1 }); });
    }),
    conjugacion: hacer((W, z) => z.formas.length * 34 + 64, ({ W, z, T, S, R, ctx }) => {
      const x = 14, w = Math.min(W - 28, 420), c1 = w * .42;
      R(caja(x, 6, w, 40, 10, 0), ctx.tinta.c, 0); T(`${z.verbo}${z.tiempo ? ' · ' + z.tiempo : ''}`, x + w / 2, 26, { tam: 17, color: ctx.tinta.t, fase: 1, maxAncho: w - 20 });
      S(caja(x, 6, w, z.formas.length * 34 + 46, 10), { color: ctx.tinta.t, ancho: 2.4 });
      z.formas.forEach(([p, f], i) => { const y = 64 + i * 34; if(i) S(linea(x + 6, y - 17, x + w - 6, y - 17, .2), { color: '#E1DCE8', ancho: 1 }); T(p, x + c1 - 12, y, { tam: 14, ancla: 'end', color: '#6B6677', fase: 2 }); T(f, x + c1 + 8, y, { tam: 16, ancla: 'start', color: ctx.tinta2.t, fase: 2, maxAncho: w - c1 - 16 }); });
    }),
    palabra: hacer(190, ({ W, z, T, S, R, ctx, tn }) => {
      const ps = z.partes.slice(0, 6), fu = '700 28px Texto', ws = ps.map((p) => medirTexto(p.texto, fu) + 18), tot = ws.reduce((a, b) => a + b, 0), k = Math.min(1, (W - 20) / tot);
      let x = (W - tot * k) / 2;
      ps.forEach((p, i) => { const w = ws[i] * k, c = tn(i); R(caja(x, 30, w - 4, 52, 10, 0), c.c, 0); S(caja(x, 30, w - 4, 52, 10), { color: c.t });
        T(p.texto, x + (w - 4) / 2, 56, { tam: Math.round(28 * k), color: c.t, fase: 1 }); if(p.tipo) T(p.tipo, x + (w - 4) / 2, 100 + (i % 2) * 20, { tam: 13, fam: 'Mano', color: c.t, fase: 2, maxAncho: Math.max(60, w + 20) }); x += w; });
      if(z.significado) T(z.significado, W / 2, 160, { tam: 15, maxAncho: W - 30, fase: 3, color: GRIS });
    }),
    oracion: hacer((W, z) => Math.ceil(z.partes.length / Math.max(1, Math.floor(W / 150))) * 104 + 10, ({ W, z, T, S, tn }) => {
      const fu = '700 18px Texto'; let x = 12, y = 34;
      z.partes.forEach((p, i) => { const w = Math.max(medirTexto(p.texto, fu), medirTexto(p.funcion || '', '700 13px Mano')) + 16, c = tn(i);
        if(x + w > W - 8 && x > 12){ x = 12; y += 104; }
        T(p.texto, x + w / 2, y, { tam: 18, fase: 1, maxAncho: W - 24 }); S(`M${f1(x + 2)} ${y + 16} V${y + 26} H${f1(x + w - 2)} V${y + 16}`, { color: c.t, ancho: 2.2, fase: 2 }); T(p.funcion, x + w / 2, y + 44, { tam: 13, fam: 'Mano', color: c.t, fase: 3, maxAncho: w + 30 }); x += w + 6; });
    }),
    vocabulario: hacer((W, z) => z.pares.length * 38 + 12, ({ W, z, T, S, R, ctx }) => {
      const mid = W / 2;
      z.pares.forEach(([a, b], i) => { const y = 22 + i * 38; if(i % 2 === 0) R(caja(8, y - 17, W - 16, 34, 8, 0), '#F4F0F8', 0);
        T(a, mid - 30, y, { tam: 16, ancla: 'end', color: ctx.tinta.t, fase: 1, maxAncho: mid - 44 }); S(flecha(mid - 20, y, mid + 20, y, { punta: 6 }), { color: SUAVE, ancho: 1.8, fase: 2 }); T(b, mid + 30, y, { tam: 16, ancla: 'start', color: ctx.tinta2.t, fase: 3, maxAncho: mid - 44 }); });
    }),
    dialogo: hacer((W, z) => z.lineas.reduce((a, l) => a + alto(l.texto, W * .62 - 24, 15) + 54, 10), ({ W, z, T, S, R, tn }) => {
      const quienes = [...new Set(z.lineas.map((l) => l.quien))]; let y = 10;
      z.lineas.forEach((l) => { const i = quienes.indexOf(l.quien), der = i % 2 === 1, c = tn(i * 2), bw = W * .62, hh = alto(l.texto, bw - 24, 15) + 22, x = der ? W - bw - 10 : 10;
        T(l.quien, der ? W - 14 : 14, y + 8, { tam: 12, ancla: der ? 'end' : 'start', color: c.t, fase: 1 });
        R(caja(x, y + 20, bw, hh, 14, 0), c.c, 0); S(`${caja(x, y + 20, bw, hh, 14)} M${der ? x + bw - 26 : x + 26} ${y + 20 + hh} l${der ? 8 : -8} 12 l${der ? 4 : -4} -12`, { color: c.t, ancho: 2 });
        T(l.texto, x + 12, y + 20 + hh / 2, { tam: 15, ancla: 'start', maxAncho: bw - 24, fase: 2 }); y += hh + 34; });
    }),

    /* ══ para estudiar ══ */
    proscontras: hacer((W, z) => Math.max(z.pros.length, z.contras.length) * 30 + 70, ({ W, z, T, S, R }) => {
      const cw = (W - 30) / 2;
      [[z.pros, 10, VERDE, '#E3F4EA', 'A favor'], [z.contras, 20 + cw, ROJO, '#FBE4E2', 'En contra']].forEach(([xs, x, col, fondo, tit], k) => {
        R(caja(x, 6, cw, xs.length * 30 + 56, 14, 0), fondo, 0); S(caja(x, 6, cw, xs.length * 30 + 56, 14), { color: col });
        S(circulo(x + 22, 28, 11), { color: col, ancho: 2.2, fase: 1 }); S(k ? `M${x + 16} 28 H${x + 28}` : `M${x + 16} 28 H${x + 28} M${x + 22} 22 V34`, { color: col, ancho: 2.4, fase: 1 });
        T(tit, x + 42, 28, { tam: 16, fam: 'Mano', ancla: 'start', color: col, fase: 1 }); xs.forEach((s, i) => T(s, x + 14, 60 + i * 30, { tam: 14, ancla: 'start', maxAncho: cw - 24, fase: 2 })); });
    }),
    acrostico: hacer((W, z) => z.letras.length * 42 + 10, ({ W, z, T, S, R, tn }) => {
      z.letras.forEach((l, i) => { const y = 8 + i * 42, c = tn(i); R(caja(10, y, 36, 36, 8, 0), c.c, 0); S(caja(10, y, 36, 36, 8), { color: c.t }); T(l.letra, 28, y + 18, { tam: 22, color: c.t, fase: 1 }); T(l.significado, 58, y + 18, { tam: 15, ancla: 'start', maxAncho: W - 66, fase: 2 }); });
    }),
    tarjeta: hacer(180, ({ W, z, T, S, R, ctx }) => {
      const angosto = W < 420, cw = angosto ? W - 40 : (W - 50) / 2, ch = angosto ? 70 : 140;
      const una = (x, y, tit, s, c, fase) => { R(caja(x + 4, y + 5, cw, ch, 14, 0), '#E7E2EC', fase); R(caja(x, y, cw, ch, 14, 0), '#fff', fase); S(caja(x, y, cw, ch, 14), { color: c, ancho: 2.6, fase }); T(tit, x + 14, y + 16, { tam: 11, ancla: 'start', color: '#6B6677', fase }); T(s, x + cw / 2, y + ch / 2 + 6, { tam: 16, maxAncho: cw - 24, fase: fase + 1 }); };
      if(angosto){ una(20, 10, 'FRENTE', z.frente, ctx.tinta.t, 0); una(20, 96, 'REVERSO', z.reverso, ctx.tinta2.t, 2); }
      else { una(15, 14, 'FRENTE', z.frente, ctx.tinta.t, 0); una(35 + cw, 14, 'REVERSO', z.reverso, ctx.tinta2.t, 2); S(flecha(15 + cw - 20, 168, 35 + cw + 20, 168, { curva: .2, punta: 7 }), { color: SUAVE, ancho: 1.8, fase: 2 }); }
    }),
    adivina: hacer((W, z) => z.opciones.length * 46 + 70, ({ W, z, T, S, R, ctx }) => {
      T(z.pregunta, 14, 22, { tam: 16, ancla: 'start', color: ctx.tinta.t, maxAncho: W - 28, fase: 1 });
      z.opciones.forEach((o, i) => { const y = 64 + i * 46, ok = i === z.correcta; S(caja(14, y - 18, W - 28, 38, 12), { color: SUAVE, ancho: 1.8, fase: 1 }); T(String.fromCharCode(65 + i), 34, y, { tam: 15, color: '#6B6677', fase: 1 }); T(o, 54, y, { tam: 15, ancla: 'start', maxAncho: W - 110, fase: 2 });
        if(ok){ R(caja(14, y - 18, W - 28, 38, 12, 0), '#E3F4EA', 3); S(caja(14, y - 18, W - 28, 38, 12), { color: VERDE, ancho: 2.6, fase: 3 }); S(`M${W - 50} ${y} l7 7 l13 -15`, { color: VERDE, ancho: 3.2, fase: 3 }); } });
    }),
    mito: hacer((W, z) => alto(z.mito, W - 70, 15) + alto(z.verdad, W - 70, 15) + 120, ({ W, z, T, S, R }) => {
      const h1 = alto(z.mito, W - 70, 15) + 44, h2 = alto(z.verdad, W - 70, 15) + 44;
      R(caja(10, 6, W - 20, h1, 14, 0), '#FBE4E2', 0); S(caja(10, 6, W - 20, h1, 14), { color: ROJO }); T('Mito', 26, 22, { tam: 14, fam: 'Mano', ancla: 'start', color: ROJO, fase: 1 });
      T(z.mito, 26, 6 + h1 / 2 + 8, { tam: 15, ancla: 'start', maxAncho: W - 70, color: '#6B6677', fase: 1 }); S(`M${W - 44} 18 l20 20 M${W - 24} 18 l-20 20`, { color: ROJO, ancho: 3, fase: 2 });
      const y = h1 + 26; R(caja(10, y, W - 20, h2, 14, 0), '#E3F4EA', 2); S(caja(10, y, W - 20, h2, 14), { color: VERDE, fase: 2 }); T('Verdad', 26, y + 16, { tam: 14, fam: 'Mano', ancla: 'start', color: VERDE, fase: 3 });
      T(z.verdad, 26, y + h2 / 2 + 8, { tam: 15, ancla: 'start', maxAncho: W - 70, fase: 3 }); S(`M${W - 46} ${y + 26} l7 7 l13 -15`, { color: VERDE, ancho: 3.2, fase: 3 });
    }),
    calendario: hacer((W, z) => { const c = Math.min(46, (W - 20) / 7); return Math.ceil(((z.primerDia || 0) + (z.dias || 30)) / 7) * c + 64 + z.marcas.length * 24; }, ({ W, A, z, T, S, R, tn }) => {
      const c = Math.min(46, (W - 20) / 7), x0 = (W - 7 * c) / 2, y0 = 54, p = z.primerDia || 0, n = z.dias || 30;
      T(z.mes, W / 2, 16, { tam: 18, fam: 'Mano', fase: 0 }); ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, i) => T(d, x0 + c * (i + .5), 40, { tam: 12, color: '#6B6677', fase: 0 }));
      for(let d = 1; d <= n; d++){ const k = p + d - 1, x = x0 + c * (k % 7), y = y0 + c * Math.floor(k / 7), m = z.marcas.findIndex((q) => q.dia === d);
        if(m >= 0){ R(circulo(x + c / 2, y + c / 2, c * .42, 0), tn(m).c, 1); S(circulo(x + c / 2, y + c / 2, c * .42), { color: tn(m).t, ancho: 2.2, fase: 1 }); }
        T(String(d), x + c / 2, y + c / 2, { tam: 13, fase: 1 }); }
      const yl = y0 + Math.ceil((p + n) / 7) * c + 14; z.marcas.forEach((q, i) => { S(circulo(x0 + 8, yl + i * 24, 6, .1), { color: tn(i).t, relleno: tn(i).c, fase: 2 }); T(`${q.dia}: ${q.texto}`, x0 + 22, yl + i * 24, { tam: 13, ancla: 'start', maxAncho: W - x0 - 30, fase: 3 }); });
    }),
    podio: hacer(220, ({ W, z, T, S, R, tn }) => {
      const cw = Math.min(110, (W - 40) / 3), x0 = (W - 3 * cw) / 2, alturas = [80, 120, 56], orden = [1, 0, 2];
      orden.forEach((lugar, k) => { const x = x0 + k * cw, hh = alturas[k], y = 210 - hh, c = tn(lugar); if(!z.lugares[lugar]) return;
        R(caja(x + 3, y, cw - 6, hh, 6, 0), c.c, 0); S(caja(x + 3, y, cw - 6, hh, 6), { color: c.t }); T(String(lugar + 1), x + cw / 2, y + hh / 2, { tam: 28, color: c.t, fase: 1 });
        T(z.lugares[lugar], x + cw / 2, y - 22, { tam: 14, fam: 'Mano', maxAncho: cw + 10, fase: 2 }); });
    }),
    escalera: hacer((W, z) => z.escalones.length * 44 + 30, ({ W, A, z, T, S, R, tn }) => {
      const n = z.escalones.length, sw = (W - 40) / n;
      z.escalones.forEach((s, i) => { const x = 20 + i * sw, y = A - 14 - (i + 1) * 44, c = tn(i); R(caja(x, y, sw, (i + 1) * 44, 4, 0), c.c, 0); S(`M${f1(x)} ${A - 14} V${f1(y)} H${f1(x + sw)}`, { color: c.t, ancho: 2.6 });
        T(s, x + sw / 2, y + 22, { tam: 13, maxAncho: sw - 8, fase: 2 }); });
      S(linea(14, A - 14, W - 14, A - 14, .3), { ancho: 2.4 });
    }),
    puente: hacer(200, ({ W, z, T, S, R, ctx, tn }) => {
      const ps = z.pasos.slice(0, 6), xa = Math.min(110, W * .26), xb = W - xa, y = 90;
      R(`M0 ${y} H${xa} L${xa - 20} 200 H0 Z`, '#E9E2D4', 0); R(`M${W} ${y} H${xb} L${xb + 20} 200 H${W} Z`, '#E9E2D4', 0); S(`M0 ${y} H${xa} L${xa - 20} 200`, { color: '#8A7A5C' }); S(`M${W} ${y} H${xb} L${xb + 20} 200`, { color: '#8A7A5C' });
      T(z.desde, xa / 2, y - 22, { tam: 15, fam: 'Mano', color: ctx.tinta.t, maxAncho: xa - 8, fase: 1 }); T(z.hasta, W - xa / 2, y - 22, { tam: 15, fam: 'Mano', color: ctx.tinta2.t, maxAncho: xa - 8, fase: 1 });
      const pw = (xb - xa) / Math.max(1, ps.length);
      ps.forEach((p, i) => { const x = xa + i * pw, c = tn(i + 1); R(caja(x + 2, y - 6, pw - 4, 18, 3, 0), c.c, 1); S(caja(x + 2, y - 6, pw - 4, 18, 3), { color: c.t, ancho: 1.8, fase: 1 }); T(p, x + pw / 2, y + 36 + (i % 2) * 34, { tam: 12.5, maxAncho: pw + 30, fase: 2 }); });
      S(`M${xa} ${y - 6} Q${W / 2} ${y - 60} ${xb} ${y - 6}`, { color: SUAVE, ancho: 1.6, fase: 1 });
    }),
    iceberg: hacer(300, ({ W, z, T, S, R, ctx }) => {
      const cx = W / 2, yw = 96, ww = Math.min(W * .7, 360);
      R(`M0 ${yw} H${W} V300 H0 Z`, '#DCEBFA', 0, .8); S(`M0 ${yw} Q${W * .25} ${yw - 6} ${W / 2} ${yw} T${W} ${yw}`, { color: '#1F5BD1', ancho: 2 });
      /* la punta chiquita arriba del agua y la mole grande abajo */
      const arriba = `M${cx - 52} ${yw} L${cx - 22} 46 L${cx - 4} 58 L${cx + 14} 30 L${cx + 56} ${yw} Z`;
      const abajo = `M${cx - 52} ${yw} L${f1(cx - ww * .42)} 150 L${f1(cx - ww / 2)} 210 L${f1(cx - ww * .3)} 276 L${cx + 10} 292 L${f1(cx + ww * .36)} 262 L${f1(cx + ww / 2)} 190 L${f1(cx + ww * .38)} 130 L${cx + 56} ${yw} Z`;
      R(abajo, '#B9D4F2', 1, .9); S(abajo, { color: '#1F5BD1', ancho: 2.2, fase: 1 }); R(arriba, '#FFFFFF', 1); S(arriba, { color: '#1F5BD1', ancho: 2.4, fase: 1 });
      T(z.visible.join(' · '), cx + 70, 54, { tam: 14, fam: 'Mano', ancla: 'start', maxAncho: W - cx - 80, color: ctx.tinta.t, fase: 2 });
      z.oculto.slice(0, 6).forEach((s, i) => T(s, cx, 130 + i * 26, { tam: 14, maxAncho: ww * .7, color: '#123E91', fase: 3 }));
    }),
    diana: hacer((W, z) => Math.min(W * .3, 110) * 2 + 24, ({ W, A, z, T, S, R, tn }) => {
      const an = z.anillos.slice(0, 5), n = an.length, r = Math.min(W * .3, 110), cx = r + 14, cy = A / 2;
      for(let i = n - 1; i >= 0; i--){ const rr = r * (i + 1) / n, c = tn(i); R(circulo(cx, cy, rr, 0), c.c, 0); S(circulo(cx, cy, rr), { color: c.t, ancho: 2.2 }); }
      an.forEach((s, i) => { const rr = r * (i + .5) / n, y = 22 + i * ((A - 44) / Math.max(1, n - 1)), c = tn(i); S(linea(cx + rr * .7, cy - rr * .7 * (i % 2 ? -1 : 1) * .3, cx + r + 22, y, .3), { color: c.t, ancho: 1.4, fase: 2 }); S(circulo(cx + rr * .7, cy - rr * .7 * (i % 2 ? -1 : 1) * .3, 3, .1), { color: c.t, relleno: c.t, fase: 2 });
        T(s, cx + r + 28, y, { tam: 14, ancla: 'start', color: c.t, maxAncho: W - cx - r - 36, fase: 3 }); });
    }),
  };
}

/* ── lo que la IA puede pedir (va en la instrucción de Explica) ── */
export const CATALOGO_MAS = `MÁS TIPOS (úsalos cuando el tema lo pida; un pizarrón con variedad se entiende mejor):
- termometro { titulo, valor, min, max, unidad, marcas: [{ valor, texto }] }
- medidor { titulo, valor (0-100), izquierda, derecha, texto } · un velocímetro de poco a mucho
- semaforo { titulo, luces: [{ color: "rojo" | "amarillo" | "verde", texto }] }
- bateria { titulo, nivel (0-100), texto }
- balanza { titulo, izquierda: { texto, peso }, derecha: { texto, peso }, texto } · se inclina hacia lo que pesa más
- reloj { titulo, hora: "HH:MM", texto }
- regla { titulo, desde, hasta, unidad, marcas: [{ valor, texto }] }
- progreso { titulo, barras: [{ texto, valor (0-100) }] }
- recta { titulo, desde, hasta, puntos: [{ valor, texto }], intervalo: { desde, hasta } } · recta numérica
- plano { titulo, puntos: [{ x, y, texto }], recta: { m, b, texto } } · plano cartesiano
- fraccion { titulo, numerador, denominador, texto }
- operacion { titulo, numeros: [], operador: "+" | "−" | "×", resultado, texto } · operación en vertical
- ecuacion { titulo, pasos: [{ expresion, nota }], resultado } · despejar paso a paso
- angulo { titulo, grados, texto }
- triangulo { titulo, lados: [base, altura, hipotenusa], texto } · triángulo rectángulo
- figura { titulo, figura: "circulo" | "cuadrado" | "rectangulo" | "triangulo" | "hexagono" | "rombo" | "trapecio", medidas: [], formula }
- conjunto { titulo, nombre, elementos: [] }
- porcentaje { titulo, valor (0-100), texto } · cuadrícula de 100
- secuencia { titulo, terminos: [], regla } · patrón (ej. regla "+3")
- atomo { titulo, nombre, simbolo, protones, neutrones, capas: [2, 8, 1] } · modelo de Bohr
- elemento { simbolo, nombre, numero, masa, texto } · casilla de la tabla periódica
- molecula { titulo, formula, atomos: ["O", "H", "H"], enlaces: [[0, 1], [0, 2]] } · el primero va al centro; [a, b, true] = doble
- reaccion { titulo, reactivos: [], productos: [], condicion }
- celula { titulo, partes: [] } · célula con sus partes señaladas (núcleo primero)
- circuito { titulo, elementos: [{ tipo: "pila" | "foco" | "interruptor" | "resistencia", texto }] } · hasta 4
- fuerzas { titulo, objeto, fuerzas: [{ direccion: "arriba" | "abajo" | "izquierda" | "derecha", texto }] } · diagrama de cuerpo libre
- ondas { titulo, ciclos, amplitud, longitud, texto }
- capas { titulo, capas: [{ nombre, texto }] } · de arriba hacia abajo (atmósfera, Tierra, suelo…)
- cadena { titulo, eslabones: [] } · cadena alimenticia o de sucesos
- estados { titulo, estados: [3 nombres], cambios: [{ de, a, texto }] } · tres cosas y cómo pasan de una a otra
- personaje { nombre, fechas, rol, datos: [] } · ficha de una persona histórica real
- periodo { titulo, etapas: [{ nombre, desde, hasta }] } · años como números (antes de Cristo, en negativo)
- antesdespues { titulo, antes: [], despues: [], cambio }
- consecuencias { titulo, causa, efectos: [] } · una causa y lo que provocó
- conjugacion { verbo, tiempo, formas: [["yo", "como"], ["tú", "comes"]] }
- palabra { titulo, partes: [{ texto, tipo }], significado } · sílabas, prefijo, raíz, sufijo
- oracion { titulo, partes: [{ texto, funcion }] } · análisis de una oración
- vocabulario { titulo, pares: [["apple", "manzana"]] }
- dialogo { titulo, lineas: [{ quien, texto }] } · máx 6 líneas
- proscontras { titulo, pros: [], contras: [] }
- acrostico { titulo, letras: [{ letra, significado }] } · truco para memorizar
- tarjeta { frente, reverso } · tarjeta de estudio
- adivina { pregunta, opciones: [], correcta (índice desde 0) } · la correcta se marca al final
- mito { titulo, mito, verdad }
- calendario { mes, dias, primerDia (0 = lunes), marcas: [{ dia, texto }] }
- podio { titulo, lugares: [primero, segundo, tercero] }
- escalera { titulo, escalones: [] } · de lo básico a lo avanzado
- puente { titulo, desde, hasta, pasos: [] } · cómo se llega de un punto a otro
- iceberg { titulo, visible: [], oculto: [] } · lo que se ve y lo que no
- diana { titulo, anillos: [] } · del centro (lo esencial) hacia afuera`;

/* ── la revisión de lo que mandó la IA: lo que no sirve se descarta (devuelve null) ── */
export const TIPOS_MAS = ['termometro', 'medidor', 'semaforo', 'bateria', 'balanza', 'reloj', 'regla', 'progreso', 'recta', 'plano', 'fraccion', 'operacion', 'ecuacion', 'angulo', 'triangulo', 'figura', 'conjunto', 'porcentaje', 'secuencia',
  'atomo', 'elemento', 'molecula', 'reaccion', 'celula', 'circuito', 'fuerzas', 'ondas', 'capas', 'cadena', 'estados', 'personaje', 'periodo', 'antesdespues', 'consecuencias', 'conjugacion', 'palabra', 'oracion', 'vocabulario', 'dialogo',
  'proscontras', 'acrostico', 'tarjeta', 'adivina', 'mito', 'calendario', 'podio', 'escalera', 'puente', 'iceberg', 'diana'];
export const SINONIMOS_MAS = { velocimetro: 'medidor', tablaperiodica: 'elemento', rectanumerica: 'recta', cartesiano: 'plano', planocartesiano: 'plano', 'cuerpo libre': 'fuerzas', mnemotecnia: 'acrostico', 'antes y despues': 'antesdespues', 'pros y contras': 'proscontras', flashcard: 'tarjeta', quiz: 'adivina', 'mito y verdad': 'mito' };

export function normalizarMas(z){
  const c = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const L = (v, n = 80, m = 8) => (Array.isArray(v) ? v : []).map((x) => c(typeof x === 'string' || typeof x === 'number' ? x : x && (x.texto || x.nombre), n)).filter(Boolean).slice(0, m);
  const N = num, arr = (v) => Array.isArray(v) ? v : [];
  switch(z.tipo){
    case 'termometro': z.min = N(z.min) ?? 0; z.max = N(z.max) ?? 100; z.valor = N(z.valor); z.unidad = c(z.unidad, 8); z.marcas = arr(z.marcas).map((m) => ({ valor: N(m && m.valor), texto: c(m && m.texto, 50) })).filter((m) => m.valor != null && m.texto).slice(0, 4); if(z.valor == null || z.max <= z.min) return null; break;
    case 'medidor': z.valor = N(z.valor); z.izquierda = c(z.izquierda, 30); z.derecha = c(z.derecha, 30); z.texto = c(z.texto, 80); if(z.valor == null) return null; break;
    case 'semaforo': z.luces = arr(z.luces).map((l) => ({ color: String(l && l.color || '').toLowerCase(), texto: c(l && l.texto, 120) })).filter((l) => l.texto).slice(0, 4); if(!z.luces.length) return null; break;
    case 'bateria': z.nivel = N(z.nivel); z.texto = c(z.texto, 120); if(z.nivel == null) return null; break;
    case 'balanza': for(const k of ['izquierda', 'derecha']){ const v = z[k] || {}; z[k] = { texto: c(v.texto || v.nombre || (typeof v === 'string' ? v : ''), 60), peso: N(v.peso) ?? 1 }; } z.texto = c(z.texto, 100); if(!z.izquierda.texto || !z.derecha.texto) return null; break;
    case 'reloj': z.hora = c(z.hora, 5); z.texto = c(z.texto, 100); if(!/^\d{1,2}:\d{2}$/.test(z.hora)) return null; break;
    case 'regla': z.desde = N(z.desde) ?? 0; z.hasta = N(z.hasta) ?? 10; z.unidad = c(z.unidad, 10); z.marcas = arr(z.marcas).map((m) => ({ valor: N(m && m.valor), texto: c(m && m.texto, 40) })).filter((m) => m.valor != null && m.texto).slice(0, 5); if(z.hasta <= z.desde) return null; break;
    case 'progreso': z.barras = arr(z.barras).map((b) => ({ texto: c(b && (b.texto || b.etiqueta), 40), valor: N(b && b.valor) })).filter((b) => b.texto && b.valor != null).slice(0, 6); if(!z.barras.length) return null; break;
    case 'recta': z.desde = N(z.desde) ?? -5; z.hasta = N(z.hasta) ?? 5; z.puntos = arr(z.puntos).map((p) => ({ valor: N(p && p.valor), texto: c(p && p.texto, 30) })).filter((p) => p.valor != null).slice(0, 5);
      z.intervalo = z.intervalo && N(z.intervalo.desde) != null && N(z.intervalo.hasta) != null ? { desde: N(z.intervalo.desde), hasta: N(z.intervalo.hasta) } : null; if(z.hasta <= z.desde) return null; break;
    case 'plano': z.puntos = arr(z.puntos).map((p) => ({ x: N(p && p.x), y: N(p && p.y), texto: c(p && p.texto, 24) })).filter((p) => p.x != null && p.y != null && Math.abs(p.x) <= 50 && Math.abs(p.y) <= 50).slice(0, 6);
      z.recta = z.recta && N(z.recta.m) != null ? { m: N(z.recta.m), b: N(z.recta.b) ?? 0, texto: c(z.recta.texto, 30) } : null; if(!z.puntos.length && !z.recta) return null; break;
    case 'fraccion': z.numerador = N(z.numerador); z.denominador = N(z.denominador); z.texto = c(z.texto, 100); if(z.numerador == null || !z.denominador || z.denominador < 1 || z.denominador > 24) return null; break;
    case 'operacion': z.numeros = L(z.numeros, 14, 4); z.operador = c(z.operador, 2) || '+'; z.resultado = c(z.resultado, 14); z.texto = c(z.texto, 80); if(z.numeros.length < 2 || !z.resultado) return null; break;
    case 'ecuacion': z.pasos = arr(z.pasos).map((p) => typeof p === 'string' ? { expresion: c(p, 60), nota: '' } : { expresion: c(p && p.expresion, 60), nota: c(p && p.nota, 50) }).filter((p) => p.expresion).slice(0, 6); z.resultado = c(z.resultado, 40); if(!z.pasos.length || !z.resultado) return null; break;
    case 'angulo': z.grados = N(z.grados); z.texto = c(z.texto, 60); if(z.grados == null) return null; break;
    case 'triangulo': z.lados = L(z.lados, 16, 3); while(z.lados.length < 3) z.lados.push(''); z.texto = c(z.texto, 90); break;
    case 'figura': z.figura = String(z.figura || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); if(!['circulo', 'cuadrado', 'rectangulo', 'triangulo', 'hexagono', 'rombo', 'trapecio'].includes(z.figura)) z.figura = 'cuadrado'; z.medidas = L(z.medidas, 20, 3); z.formula = c(z.formula, 50); break;
    case 'conjunto': z.nombre = c(z.nombre, 20) || 'A'; z.elementos = L(z.elementos, 20, 12); if(!z.elementos.length) return null; break;
    case 'porcentaje': z.valor = N(z.valor); z.texto = c(z.texto, 120); if(z.valor == null) return null; break;
    case 'secuencia': z.terminos = L(z.terminos, 10, 7); z.regla = c(z.regla, 12); if(z.terminos.length < 3) return null; break;
    case 'atomo': z.simbolo = c(z.simbolo, 3); z.nombre = c(z.nombre, 30); z.protones = N(z.protones); z.neutrones = N(z.neutrones); z.capas = arr(z.capas).map(N).filter((x) => x != null && x >= 0 && x <= 32).slice(0, 5); if(!z.simbolo || !z.capas.length) return null; break;
    case 'elemento': z.simbolo = c(z.simbolo, 3); z.nombre = c(z.nombre, 30); z.numero = N(z.numero); z.masa = N(z.masa); z.texto = c(z.texto, 120); if(!z.simbolo) return null; break;
    case 'molecula': z.atomos = L(z.atomos, 3, 9); z.formula = c(z.formula, 20); z.enlaces = Array.isArray(z.enlaces) ? z.enlaces.filter((e) => Array.isArray(e) && Number.isInteger(e[0]) && Number.isInteger(e[1]) && e[0] < z.atomos.length && e[1] < z.atomos.length).slice(0, 12) : null; if(z.atomos.length < 2) return null; break;
    case 'reaccion': z.reactivos = L(z.reactivos, 30, 3); z.productos = L(z.productos, 30, 3); z.condicion = c(z.condicion, 30); if(!z.reactivos.length || !z.productos.length) return null; break;
    case 'celula': z.partes = L(z.partes, 30, 8); if(z.partes.length < 2) return null; break;
    case 'circuito': z.elementos = arr(z.elementos).map((e) => typeof e === 'string' ? { tipo: e.toLowerCase(), texto: '' } : { tipo: String(e && e.tipo || '').toLowerCase(), texto: c(e && e.texto, 30) }).filter((e) => e.tipo).slice(0, 4); if(!z.elementos.length) return null; break;
    case 'fuerzas': z.objeto = c(z.objeto, 20) || 'objeto'; z.fuerzas = arr(z.fuerzas).map((f) => ({ direccion: String(f && f.direccion || '').toLowerCase(), texto: c(f && f.texto, 40) })).filter((f) => f.texto && ['arriba', 'abajo', 'izquierda', 'derecha'].includes(f.direccion)).slice(0, 4); if(!z.fuerzas.length) return null; break;
    case 'ondas': z.ciclos = N(z.ciclos) ?? 2; z.amplitud = c(z.amplitud, 30); z.longitud = c(z.longitud, 30); z.texto = c(z.texto, 100); break;
    case 'capas': z.capas = arr(z.capas).map((x) => typeof x === 'string' ? { nombre: c(x, 40), texto: '' } : { nombre: c(x && x.nombre, 40), texto: c(x && x.texto, 70) }).filter((x) => x.nombre).slice(0, 7); if(z.capas.length < 2) return null; break;
    case 'cadena': z.eslabones = L(z.eslabones, 40, 8); if(z.eslabones.length < 2) return null; break;
    case 'estados': z.estados = L(z.estados, 24, 3); z.cambios = arr(z.cambios).map((x) => ({ de: c(x && x.de, 24), a: c(x && x.a, 24), texto: c(x && x.texto, 24) })).filter((x) => x.de && x.a).slice(0, 6); if(z.estados.length < 3) return null; break;
    case 'personaje': z.nombre = c(z.nombre, 60); z.fechas = c(z.fechas, 30); z.rol = c(z.rol, 80); z.datos = L(z.datos, 120, 5); if(!z.nombre) return null; break;
    case 'periodo': z.etapas = arr(z.etapas).map((e) => ({ nombre: c(e && e.nombre, 40), desde: N(e && e.desde), hasta: N(e && e.hasta) })).filter((e) => e.nombre && e.desde != null && e.hasta != null && e.hasta >= e.desde).slice(0, 7); if(!z.etapas.length) return null; break;
    case 'antesdespues': z.antes = L(z.antes, 90, 5); z.despues = L(z.despues, 90, 5); z.cambio = c(z.cambio, 40); if(!z.antes.length || !z.despues.length) return null; break;
    case 'consecuencias': z.causa = c(z.causa, 80); z.efectos = L(z.efectos, 60, 5); if(!z.causa || !z.efectos.length) return null; break;
    case 'conjugacion': z.verbo = c(z.verbo, 30); z.tiempo = c(z.tiempo, 40); z.formas = arr(z.formas).map((f) => Array.isArray(f) ? [c(f[0], 24), c(f[1], 40)] : f && typeof f === 'object' ? [c(f.persona, 24), c(f.forma, 40)] : null).filter((f) => f && f[0] && f[1]).slice(0, 8); if(!z.verbo || !z.formas.length) return null; break;
    case 'palabra': z.partes = arr(z.partes).map((p) => typeof p === 'string' ? { texto: c(p, 20), tipo: '' } : { texto: c(p && p.texto, 20), tipo: c(p && p.tipo, 20) }).filter((p) => p.texto).slice(0, 6); z.significado = c(z.significado, 140); if(z.partes.length < 2) return null; break;
    case 'oracion': z.partes = arr(z.partes).map((p) => ({ texto: c(p && p.texto, 50), funcion: c(p && p.funcion, 30) })).filter((p) => p.texto).slice(0, 8); if(z.partes.length < 2) return null; break;
    case 'vocabulario': z.pares = arr(z.pares).map((p) => Array.isArray(p) ? [c(p[0], 30), c(p[1], 30)] : p && typeof p === 'object' ? [c(p.palabra || p.a, 30), c(p.traduccion || p.b, 30)] : null).filter((p) => p && p[0] && p[1]).slice(0, 10); if(!z.pares.length) return null; break;
    case 'dialogo': z.lineas = arr(z.lineas).map((l) => ({ quien: c(l && l.quien, 20) || 'A', texto: c(l && l.texto, 160) })).filter((l) => l.texto).slice(0, 6); if(!z.lineas.length) return null; break;
    case 'proscontras': z.pros = L(z.pros, 90, 5); z.contras = L(z.contras, 90, 5); if(!z.pros.length && !z.contras.length) return null; break;
    case 'acrostico': z.letras = arr(z.letras).map((l) => ({ letra: c(l && l.letra, 2), significado: c(l && l.significado, 80) })).filter((l) => l.letra && l.significado).slice(0, 10); if(z.letras.length < 2) return null; break;
    case 'tarjeta': z.frente = c(z.frente, 120); z.reverso = c(z.reverso, 200); if(!z.frente || !z.reverso) return null; break;
    case 'adivina': z.pregunta = c(z.pregunta, 200); z.opciones = L(z.opciones, 80, 4); z.correcta = N(z.correcta); if(!z.pregunta || z.opciones.length < 2 || z.correcta == null || z.correcta < 0 || z.correcta >= z.opciones.length) return null; break;
    case 'mito': z.mito = c(z.mito, 200); z.verdad = c(z.verdad, 240); if(!z.mito || !z.verdad) return null; break;
    case 'calendario': z.mes = c(z.mes, 30) || 'Mes'; z.dias = lim(N(z.dias) ?? 30, 28, 31); z.primerDia = lim(N(z.primerDia) ?? 0, 0, 6); z.marcas = arr(z.marcas).map((m) => ({ dia: N(m && m.dia), texto: c(m && m.texto, 60) })).filter((m) => m.dia >= 1 && m.dia <= z.dias && m.texto).slice(0, 5); if(!z.marcas.length) return null; break;
    case 'podio': z.lugares = L(z.lugares, 40, 3); if(z.lugares.length < 2) return null; break;
    case 'escalera': z.escalones = L(z.escalones, 40, 6); if(z.escalones.length < 2) return null; break;
    case 'puente': z.desde = c(z.desde, 30); z.hasta = c(z.hasta, 30); z.pasos = L(z.pasos, 40, 6); if(!z.desde || !z.hasta || !z.pasos.length) return null; break;
    case 'iceberg': z.visible = L(z.visible, 40, 3); z.oculto = L(z.oculto, 50, 6); if(!z.visible.length || !z.oculto.length) return null; break;
    case 'diana': z.anillos = L(z.anillos, 50, 5); if(z.anillos.length < 2) return null; break;
  }
  return z;
}

/* ── uno de cada uno, para las pruebas y para ver cómo se ven ── */
export const EJEMPLOS_MAS = [
  { tipo: 'termometro', titulo: 'El agua cambia de estado', valor: 37, min: -20, max: 120, unidad: '°C', marcas: [{ valor: 0, texto: 'Se congela' }, { valor: 100, texto: 'Hierve' }] },
  { tipo: 'medidor', titulo: 'Riesgo de deshidratación', valor: 70, izquierda: 'bajo', derecha: 'alto', texto: 'Con calor y ejercicio' },
  { tipo: 'semaforo', titulo: 'Alimentos', luces: [{ color: 'rojo', texto: 'Refrescos y frituras: casi nunca' }, { color: 'amarillo', texto: 'Pan y tortilla: con medida' }, { color: 'verde', texto: 'Frutas y verduras: diario' }] },
  { tipo: 'bateria', titulo: 'Tu energía al día', nivel: 35, texto: 'Sin desayuno, la batería baja rápido' },
  { tipo: 'balanza', titulo: 'Oferta y demanda', izquierda: { texto: 'Oferta', peso: 2 }, derecha: { texto: 'Demanda', peso: 5 }, texto: 'Más demanda: sube el precio' },
  { tipo: 'reloj', titulo: 'La hora del examen', hora: '07:30', texto: 'Llega 10 minutos antes' },
  { tipo: 'regla', titulo: 'Escala de pH', desde: 0, hasta: 14, unidad: 'pH', marcas: [{ valor: 2, texto: 'Limón' }, { valor: 7, texto: 'Agua' }, { valor: 12, texto: 'Jabón' }] },
  { tipo: 'progreso', titulo: 'Tu avance', barras: [{ texto: 'Biología', valor: 80 }, { texto: 'Historia', valor: 45 }, { texto: 'Química', valor: 20 }] },
  { tipo: 'recta', titulo: 'Desigualdad x > 2', desde: -3, hasta: 8, puntos: [{ valor: 2, texto: 'x = 2' }], intervalo: { desde: 2, hasta: 8 } },
  { tipo: 'plano', titulo: 'y = 2x + 1', puntos: [{ x: 0, y: 1 }, { x: 2, y: 5 }], recta: { m: 2, b: 1, texto: 'y = 2x + 1' } },
  { tipo: 'fraccion', titulo: 'Tres cuartos', numerador: 3, denominador: 4, texto: 'De 4 rebanadas, te comiste 3' },
  { tipo: 'operacion', titulo: 'Suma con decimales', numeros: ['12.50', '7.25'], operador: '+', resultado: '19.75', texto: 'Alinea los puntos' },
  { tipo: 'ecuacion', titulo: 'Despeja x', pasos: [{ expresion: '2x + 3 = 11', nota: 'restamos 3' }, { expresion: '2x = 8', nota: 'dividimos entre 2' }], resultado: 'x = 4' },
  { tipo: 'angulo', titulo: 'Ángulo obtuso', grados: 120 },
  { tipo: 'triangulo', titulo: 'Pitágoras', lados: ['a = 4', 'b = 3', 'c = 5'], texto: 'a² + b² = c²' },
  { tipo: 'figura', titulo: 'Área del rectángulo', figura: 'rectangulo', medidas: ['base 8 cm', 'altura 3 cm'], formula: 'A = b × h = 24 cm²' },
  { tipo: 'conjunto', titulo: 'Números primos', nombre: 'P', elementos: ['2', '3', '5', '7', '11', '13'] },
  { tipo: 'porcentaje', titulo: 'Agua en el cuerpo', valor: 60, texto: 'Más de la mitad de ti es agua' },
  { tipo: 'secuencia', titulo: 'Sucesión aritmética', terminos: ['2', '5', '8', '11', '14'], regla: '+3' },
  { tipo: 'atomo', titulo: 'Sodio', nombre: 'Sodio', simbolo: 'Na', protones: 11, neutrones: 12, capas: [2, 8, 1] },
  { tipo: 'elemento', simbolo: 'O', nombre: 'Oxígeno', numero: 8, masa: 15.999, texto: 'El que respiras' },
  { tipo: 'molecula', titulo: 'Agua', formula: 'H₂O', atomos: ['O', 'H', 'H'], enlaces: [[0, 1], [0, 2]] },
  { tipo: 'reaccion', titulo: 'Fotosíntesis', reactivos: ['CO₂', 'H₂O'], productos: ['Glucosa', 'O₂'], condicion: 'luz solar' },
  { tipo: 'celula', titulo: 'Célula animal', partes: ['Núcleo', 'Mitocondria', 'Membrana', 'Ribosomas'] },
  { tipo: 'circuito', titulo: 'Circuito en serie', elementos: [{ tipo: 'pila', texto: 'Pila' }, { tipo: 'foco', texto: 'Foco' }, { tipo: 'interruptor', texto: 'Interruptor' }, { tipo: 'resistencia', texto: 'Resistencia' }] },
  { tipo: 'fuerzas', titulo: 'Un libro en la mesa', objeto: 'Libro', fuerzas: [{ direccion: 'abajo', texto: 'Peso' }, { direccion: 'arriba', texto: 'Normal' }] },
  { tipo: 'ondas', titulo: 'Una onda', ciclos: 2, amplitud: 'amplitud', longitud: 'longitud de onda', texto: 'El sonido viaja así' },
  { tipo: 'capas', titulo: 'Capas de la Tierra', capas: [{ nombre: 'Corteza', texto: 'donde vivimos' }, { nombre: 'Manto', texto: 'roca caliente' }, { nombre: 'Núcleo', texto: 'hierro y níquel' }] },
  { tipo: 'cadena', titulo: 'Cadena alimenticia', eslabones: ['Pasto', 'Conejo', 'Zorro', 'Águila'] },
  { tipo: 'estados', titulo: 'Estados del agua', estados: ['Sólido', 'Líquido', 'Gas'], cambios: [{ de: 'Sólido', a: 'Líquido', texto: 'fusión' }, { de: 'Líquido', a: 'Gas', texto: 'evaporación' }, { de: 'Gas', a: 'Sólido', texto: 'deposición' }] },
  { tipo: 'personaje', nombre: 'Benito Juárez', fechas: '1806 – 1872', rol: 'Presidente de México', datos: ['Nació en Guelatao, Oaxaca', 'Promovió las Leyes de Reforma'] },
  { tipo: 'periodo', titulo: 'México en el siglo XIX', etapas: [{ nombre: 'Independencia', desde: 1810, hasta: 1821 }, { nombre: 'Reforma', desde: 1857, hasta: 1861 }, { nombre: 'Porfiriato', desde: 1876, hasta: 1911 }] },
  { tipo: 'antesdespues', titulo: 'La Revolución Industrial', antes: ['Trabajo a mano', 'Talleres pequeños'], despues: ['Máquinas de vapor', 'Fábricas grandes'], cambio: 'máquinas' },
  { tipo: 'consecuencias', titulo: 'Deforestación', causa: 'Talar bosques', efectos: ['Menos lluvia', 'Erosión', 'Animales sin hogar'] },
  { tipo: 'conjugacion', verbo: 'to be', tiempo: 'presente', formas: [['I', 'am'], ['you', 'are'], ['he / she', 'is']] },
  { tipo: 'palabra', titulo: 'Partes de la palabra', partes: [{ texto: 'in', tipo: 'prefijo' }, { texto: 'creí', tipo: 'raíz' }, { texto: 'ble', tipo: 'sufijo' }], significado: 'Que no se puede creer' },
  { tipo: 'oracion', titulo: 'Analiza la oración', partes: [{ texto: 'Mi hermana', funcion: 'sujeto' }, { texto: 'compró', funcion: 'verbo' }, { texto: 'un libro', funcion: 'objeto directo' }] },
  { tipo: 'vocabulario', titulo: 'En la escuela', pares: [['school', 'escuela'], ['teacher', 'maestro'], ['homework', 'tarea']] },
  { tipo: 'dialogo', titulo: 'En la tienda', lineas: [{ quien: 'Ana', texto: 'How much is it?' }, { quien: 'Vendedor', texto: 'It is ten dollars.' }] },
  { tipo: 'proscontras', titulo: 'Redes sociales', pros: ['Te comunicas rápido', 'Aprendes cosas'], contras: ['Te distraen', 'Noticias falsas'] },
  { tipo: 'acrostico', titulo: 'Para recordar', letras: [{ letra: 'O', significado: 'Observar' }, { letra: 'H', significado: 'Hipótesis' }, { letra: 'E', significado: 'Experimentar' }] },
  { tipo: 'tarjeta', frente: '¿Qué es la fotosíntesis?', reverso: 'Cuando las plantas hacen su alimento con luz' },
  { tipo: 'adivina', pregunta: '¿Cuál es el planeta más grande?', opciones: ['Marte', 'Júpiter', 'Venus'], correcta: 1 },
  { tipo: 'mito', titulo: 'Mito o verdad', mito: 'Sólo usamos el 10 % del cerebro', verdad: 'Usamos casi todo el cerebro, sólo que no todo al mismo tiempo' },
  { tipo: 'calendario', mes: 'Noviembre', dias: 30, primerDia: 5, marcas: [{ dia: 20, texto: 'Revolución Mexicana' }, { dia: 28, texto: 'Examen' }] },
  { tipo: 'podio', titulo: 'Los más poblados', lugares: ['India', 'China', 'Estados Unidos'] },
  { tipo: 'escalera', titulo: 'Taxonomía de Bloom', escalones: ['Recordar', 'Entender', 'Aplicar', 'Analizar', 'Crear'] },
  { tipo: 'puente', titulo: 'Del problema a la solución', desde: 'Problema', hasta: 'Solución', pasos: ['Entender', 'Planear', 'Hacer', 'Revisar'] },
  { tipo: 'iceberg', titulo: 'El éxito', visible: ['Resultados'], oculto: ['Disciplina', 'Fracasos', 'Horas de estudio'] },
  { tipo: 'diana', titulo: 'Lo que entra en el examen', anillos: ['Fórmulas', 'Ejemplos', 'Historia del tema'] },
];
