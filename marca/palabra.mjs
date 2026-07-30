// Generador del logotipo de GRUPO MAZI.
//
// Las letras se definen como ESQUELETO —una polilínea por trazo— y el grosor se
// calcula después. Eso permite sacar muchas familias del mismo dibujo cambiando
// sólo cómo se engorda el esqueleto, que es exactamente lo que hacía falta:
// Carlos quiere ver varias y decidir.
//
// El grosor no es constante: se modela como una PLUMILLA. Una plumilla ancha deja
// trazo grueso cuando se mueve perpendicular a su filo y fino cuando se mueve a
// lo largo de él. Ese es el origen del contraste en tipografía, y aquí sale de la
// física, no de dibujar dos grosores a mano:
//
//     grosor(θ) = min + (max − min) · |sen(θ − φ)|
//
// con θ el ángulo del trazo y φ el ángulo del filo. Con max = min queda un trazo
// monolineal (geométrico); con max ≫ min queda caligráfico.
//
// De ahí sale la conexión con el logo que pidió Carlos: **pluma de escribir y
// pluma de ave son la misma palabra y aquí son la misma geometría.** Si el trazo
// termina en cuña —el grosor cayendo a cero— la terminación ES una pluma del ave.
//
//   node marca/palabra.mjs [salida.html]

import { writeFileSync } from 'node:fs';

const VIOLETA = '#AD21ED', HUESO = '#EAE5E3', VACIO = '#120C1A', NEGRO = '#010101';
const r2 = n => Math.round(n * 100) / 100;

/* ── geometría de apoyo ────────────────────────────────────────────────── */

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Densifica una recta en n puntos: todo el motor trabaja sobre polilíneas, así
// rectas y curvas se tratan igual.
function recta(a, b, n = 12) {
  return Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));
}

// Arco de elipse, de grados a grados. 0° = derecha, 90° = abajo (SVG).
function arco(cx, cy, rx, ry, g0, g1, n = 40) {
  const a0 = g0 * Math.PI / 180, a1 = g1 * Math.PI / 180;
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * (i / n);
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}

/* ── el esqueleto de cada letra ────────────────────────────────────────── */
//
// Caja de cada letra: x de 0 a `an`, y de 0 (altura de mayúscula) a 1 (línea de
// base). Un trazo = una polilínea. `abierto` marca los extremos que reciben la
// terminación (cuña, punta, recta); los cerrados —como la O— no tienen extremo.

const ALFABETO = {
  // `punta` por trazo dice DÓNDE puede afinarse: sólo en los extremos libres.
  // Un extremo que se une con otro trazo nunca se afina, o la esquina queda
  // mocha. Y `nudos` son los puntos de unión: ahí se pone un disco del grosor
  // local para que la esquina cierre limpia, igual que un stroke-linejoin.
  G: { an: 0.80, nudos: [[0.762, 0.53]], trazos: [
    { p: arco(0.40, 0.50, 0.37, 0.50, -12, 243), punta: 'fin' },
    { p: [...recta([0.762, 0.395], [0.762, 0.53], 6), ...recta([0.762, 0.53], [0.46, 0.53], 10)],
      punta: 'fin' },
  ] },
  R: { an: 0.74, nudos: [[0.07, 0], [0.09, 0.55]], trazos: [
    { p: recta([0.07, 1], [0.07, 0], 16), punta: 'inicio' },
    { p: [[0.07, 0], ...arco(0.07, 0.28, 0.40, 0.28, -90, 90, 26)], punta: 'ninguno' },
    { p: recta([0.09, 0.55], [0.68, 1], 14), punta: 'fin' },
  ] },
  U: { an: 0.78, trazos: [
    { p: [...recta([0.07, 0], [0.07, 0.60], 10), ...arco(0.39, 0.60, 0.32, 0.40, 180, 0, 28),
          ...recta([0.71, 0.60], [0.71, 0], 10)], punta: 'ambos' },
  ] },
  P: { an: 0.68, nudos: [[0.07, 0], [0.07, 0.56]], trazos: [
    { p: recta([0.07, 1], [0.07, 0], 16), punta: 'inicio' },
    { p: [[0.07, 0], ...arco(0.07, 0.28, 0.42, 0.28, -90, 90, 26)], punta: 'ninguno' },
  ] },
  O: { an: 0.82, trazos: [
    { p: arco(0.41, 0.50, 0.37, 0.50, 0, 360, 56), punta: 'ninguno', cerrado: true },
  ] },
  M: { an: 0.98, nudos: [[0.06, 0], [0.49, 0.66], [0.92, 0]], trazos: [
    { p: recta([0.06, 1], [0.06, 0], 16), punta: 'inicio' },
    { p: recta([0.06, 0], [0.49, 0.66], 14), punta: 'ninguno' },
    { p: recta([0.49, 0.66], [0.92, 0], 14), punta: 'ninguno' },
    { p: recta([0.92, 0], [0.92, 1], 16), punta: 'fin' },
  ] },
  A: { an: 0.80, nudos: [[0.40, 0]], trazos: [
    { p: recta([0.04, 1], [0.40, 0], 16), punta: 'inicio' },
    { p: recta([0.40, 0], [0.76, 1], 16), punta: 'fin' },
    { p: recta([0.17, 0.66], [0.63, 0.66], 10), punta: 'ninguno' },
  ] },
  Z: { an: 0.70, nudos: [[0.65, 0], [0.05, 1]], trazos: [
    { p: recta([0.05, 0], [0.65, 0], 12), punta: 'inicio' },
    { p: recta([0.65, 0], [0.05, 1], 18), punta: 'ninguno' },
    { p: recta([0.05, 1], [0.65, 1], 12), punta: 'fin' },
  ] },
  I: { an: 0.20, trazos: [
    { p: recta([0.10, 0], [0.10, 1], 16), punta: 'ambos' },
  ] },
  ' ': { an: 0.34, trazos: [] },
};

// Disco de relleno para los nudos, con cúbicas (nada de arcos `A`).
function disco(cx, cy, r) {
  const k = 0.5522847498 * r;
  const P = (x, y) => `${r2(x)} ${r2(y)}`;
  return `M ${P(cx - r, cy)}`
    + ` C ${P(cx - r, cy - k)} ${P(cx - k, cy - r)} ${P(cx, cy - r)}`
    + ` C ${P(cx + k, cy - r)} ${P(cx + r, cy - k)} ${P(cx + r, cy)}`
    + ` C ${P(cx + r, cy + k)} ${P(cx + k, cy + r)} ${P(cx, cy + r)}`
    + ` C ${P(cx - k, cy + r)} ${P(cx - r, cy + k)} ${P(cx - r, cy)} Z`;
}

/* ── engordar el esqueleto ─────────────────────────────────────────────── */

// Devuelve el contorno relleno de una polilínea, con grosor según la plumilla y
// la terminación pedida.
function engordar(pts, op) {
  const { grueso, fino, filo, punta, cerrado } = op;
  const n = pts.length;
  const fi = filo * Math.PI / 180;

  const semi = i => {
    // Tangente por diferencias centradas: el grosor depende del ángulo local.
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    let g = fino + (grueso - fino) * Math.abs(Math.sin(th - fi));
    // La terminación en cuña es lo que vuelve el trazo una PLUMA: el grosor cae
    // a cero en el extremo. Se aplica sobre el último 22% del trazo.
    if (!cerrado && punta !== 'ninguno') {
      const t = i / (n - 1), z = 0.22;
      const caeInicio = (punta === 'ambos' || punta === 'inicio') && t < z;
      const caeFin = (punta === 'ambos' || punta === 'fin') && t > 1 - z;
      if (caeInicio) g *= 0.18 + 0.82 * (t / z);
      if (caeFin) g *= 0.18 + 0.82 * ((1 - t) / z);
    }
    return g / 2;
  };

  const lado = signo => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, s = semi(i) * signo;
    return [p[0] + nx * s, p[1] + ny * s];
  });

  const A = lado(1), B = lado(-1).reverse();
  const dibujo = v => v.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L ');
  return `M ${dibujo(A)} L ${dibujo(B)} Z`;
}

/* ── armar la palabra ──────────────────────────────────────────────────── */

function palabra(texto, op) {
  const {
    alto = 100, grueso = 0.19, fino = 0.19, filo = 90, tracking = 0.03,
    ancho = 1, inclinacion = 0, punta = 'ninguno', hendidura = 0,
  } = op;

  const ds = [];
  // El esqueleto está definido en su caja, pero al engordarlo el trazo sobresale
  // medio grosor por cada lado. Si se avanza sólo por el ancho declarado, las
  // letras se traslapan — y con grosores altos se vuelven ilegibles. Así que el
  // grosor se paga: medio de sangría al empezar y el resto en el avance.
  const sangria = grueso / 2;
  let x = sangria;

  for (const ch of texto.toUpperCase()) {
    const L = ALFABETO[ch];
    if (!L) continue;
    for (const t of L.trazos) {
      // Al esqueleto se le aplica el ancho y la posición; la inclinación va
      // después, sobre el resultado, para que no deforme el grosor.
      const pts = t.p.map(([px, py]) => [(x + px) * ancho, py]);
      const modo = t.punta === undefined ? punta
        : (punta === 'ninguno' ? 'ninguno' : t.punta);
      ds.push(engordar(pts, { grueso, fino, filo, punta: modo, cerrado: t.cerrado }));

      // La hendidura: un corte fino a lo largo del trazo, como la separación
      // entre las plumas del ave. Se dibuja del color del fondo, encima.
      if (hendidura > 0) {
        ds.push({ hendidura: engordar(pts, {
          grueso: grueso * hendidura, fino: fino * hendidura, filo,
          punta: modo, cerrado: t.cerrado,
        }) });
      }
    }
    // Los nudos van al final de la letra, encima de sus trazos.
    for (const [nx, ny] of (L.nudos || [])) {
      ds.push(disco((x + nx) * ancho, ny, Math.max(grueso, fino) / 2));
    }
    x += L.an + tracking + grueso;
  }

  const totalAncho = (x - tracking - grueso + sangria) * ancho;
  // Escala a la altura pedida y aplica la inclinación como cizalla.
  const k = alto;
  const sh = Math.tan(inclinacion * Math.PI / 180);
  const tr = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) => {
    const px = +a, py = +b;
    return `${r2((px - sh * (py - 0.5)) * k)} ${r2(py * k)}`;
  });

  return {
    ancho: totalAncho * k + Math.abs(sh) * k,
    alto: k,
    trazos: ds.map(d => (typeof d === 'string'
      ? { d: tr(d), tipo: 'trazo' }
      : { d: tr(d.hendidura), tipo: 'hendidura' })),
  };
}

/* ── las familias ──────────────────────────────────────────────────────── */

const FAMILIAS = [
  { id: 'bloque', nombre: 'Bloque',
    nota: 'Monolineal y apretada. El punto de partida: sin gracia y sin ruido.',
    op: { grueso: 0.20, fino: 0.20, tracking: 0.02 } },

  { id: 'pluma', nombre: 'Pluma',
    nota: 'Cada trazo termina en cuña, como las plumas del ave. Pluma de escribir '
        + 'y pluma de ave son la misma palabra y aquí la misma geometría.',
    op: { grueso: 0.23, fino: 0.23, tracking: 0.035, punta: 'ambos' } },

  { id: 'plumilla', nombre: 'Plumilla',
    nota: 'Contraste real de plumilla ancha: grueso en las verticales, fino en las '
        + 'horizontales. Sale del ángulo del trazo, no de dibujarlo a mano.',
    op: { grueso: 0.26, fino: 0.07, filo: 90, tracking: 0.04 } },

  { id: 'plumilla-inclinada', nombre: 'Plumilla inclinada',
    nota: 'La misma plumilla girada 20° — el filo en diagonal, como se sostiene de '
        + 'verdad. Ahí el contraste cae en las diagonales de la M, la A y la Z.',
    op: { grueso: 0.27, fino: 0.06, filo: 70, tracking: 0.04, inclinacion: 8 } },

  { id: 'pluma-modulada', nombre: 'Pluma modulada',
    nota: 'Las dos ideas juntas: contraste de plumilla Y terminación en cuña.',
    op: { grueso: 0.27, fino: 0.09, filo: 78, tracking: 0.045, punta: 'ambos' } },

  { id: 'hendida', nombre: 'Hendida',
    nota: 'Una hendidura a lo largo de cada trazo, igual que la separación entre '
        + 'las plumas del ave. La letra se lee como dos plumas pegadas.',
    op: { grueso: 0.30, fino: 0.30, tracking: 0.05, hendidura: 0.26 } },

  { id: 'hendida-pluma', nombre: 'Hendida y en cuña',
    nota: 'Hendidura más punta de pluma. La más literal de todas.',
    op: { grueso: 0.32, fino: 0.32, tracking: 0.055, punta: 'ambos', hendidura: 0.24 } },

  { id: 'ligera', nombre: 'Ligera',
    nota: 'Trazo fino y tracking amplio. Es la que se ve más cara y la que peor '
        + 'aguanta el tamaño chico.',
    op: { grueso: 0.085, fino: 0.085, tracking: 0.13 } },

  { id: 'ligera-pluma', nombre: 'Ligera en cuña',
    nota: 'La ligera con las puntas afiladas. Delicada; casi caligrafía.',
    op: { grueso: 0.10, fino: 0.10, tracking: 0.12, punta: 'ambos' } },

  { id: 'condensada', nombre: 'Condensada',
    nota: 'Estrecha y alta. La que más aguanta en un espacio angosto.',
    op: { grueso: 0.22, fino: 0.22, tracking: 0.01, ancho: 0.74 } },

  { id: 'ancha', nombre: 'Ancha',
    nota: 'Estirada y con aire. Se lee de lejos mejor que ninguna.',
    op: { grueso: 0.19, fino: 0.19, tracking: 0.06, ancho: 1.22 } },

  { id: 'italica', nombre: 'Itálica al ángulo del logo',
    nota: 'Inclinada 12°, con las puntas en cuña. Comparte el gesto diagonal de '
        + 'las barras de la cadera.',
    op: { grueso: 0.24, fino: 0.13, filo: 76, tracking: 0.05, punta: 'ambos', inclinacion: 12 } },
];

/* ── salida ────────────────────────────────────────────────────────────── */

function svg(f, texto, fondo, tinta) {
  const p = palabra(texto, { alto: 100, ...f.op });
  const m = 14;
  const cuerpo = p.trazos.map(t =>
    `<path d="${t.d}" fill="${t.tipo === 'hendidura' ? fondo : tinta}"/>`).join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${-m} ${p.ancho + m * 2} ${p.alto + m * 2}">
    ${cuerpo}
  </svg>`;
}

const salida = process.argv[2] || 'marca/palabra.html';

const bloques = FAMILIAS.map(f => `
  <article>
    <h2>${f.nombre} <span>· ${f.id}</span></h2>
    <div class="oscuro">${svg(f, 'GRUPO MAZI', VACIO, HUESO)}</div>
    <div class="claro">${svg(f, 'GRUPO MAZI', HUESO, VACIO)}</div>
    <div class="oscuro chico">${svg(f, 'GRUPO MAZI', VACIO, VIOLETA)}</div>
    <p>${f.nota}</p>
  </article>`).join('');

writeFileSync(salida, `<meta charset="utf-8">
<title>GRUPO MAZI — familias de logotipo</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{--vacio:${VACIO};--hueso:${HUESO};--violeta:${VIOLETA}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--vacio);color:var(--hueso);
       font:400 14px/1.6 "Segoe UI",system-ui,sans-serif;padding:40px 28px 80px}
  .wrap{max-width:1100px;margin:0 auto}
  h1{font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
  .sub{color:#A99FB4;max-width:74ch;margin:0 0 36px}
  article{margin:0 0 44px;border-top:1px solid #2A2036;padding-top:20px}
  h2{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#8B8296;
     font-weight:600;margin:0 0 16px;display:flex;gap:12px;align-items:baseline}
  h2 span{font-size:9.5px;letter-spacing:.1em;color:#5C5468;text-transform:none}
  article>div{padding:22px 26px;border-radius:10px;margin:0 0 10px}
  .oscuro{background:var(--vacio);border:1px solid #2A2036}
  .claro{background:var(--hueso)}
  .chico svg{height:26px;width:auto}
  article svg{height:74px;width:auto;display:block}
  article p{color:#A99FB4;font-size:13px;max-width:72ch;margin:12px 0 0}
  .lock{display:flex;align-items:center;gap:18px;background:var(--vacio);
        border:1px solid #2A2036;border-radius:10px;padding:16px 22px;margin:0 0 8px}
  .lock img{height:52px;width:auto}
  .lock svg{height:30px}
  .lock .et{margin-left:auto;font-size:9.5px;letter-spacing:.14em;color:#5C5468}
</style>
<div class="wrap">
  <h1>GRUPO MAZI · familias de logotipo</h1>
  <p class="sub">Doce familias del mismo esqueleto. El grosor se calcula como una plumilla
  —grueso al moverse perpendicular al filo, fino a lo largo de él— así que el contraste sale de
  la física del instrumento y no de dibujar dos pesos a mano. Cuando el trazo termina en cuña, la
  terminación <b>es</b> una pluma del ave: pluma de escribir y pluma de ave, la misma palabra y
  la misma geometría. Cada una en oscuro, en claro y en chico.</p>
  ${bloques}

  <article>
    <h2>El bloqueo <span>· símbolo + palabra</span></h2>
    <p style="margin:0 0 18px">Cada familia junto a la Paloma Mazi, al tamaño en que se va a usar
    de verdad: una firma de correo, un encabezado, una tarjeta.</p>
    ${FAMILIAS.map(f => `
    <div class="lock">
      <img src="logo/paloma.svg" alt="">
      ${svg(f, 'GRUPO MAZI', VACIO, HUESO)}
      <span class="et">${f.id}</span>
    </div>`).join('')}
  </article>
</div>
`);

console.log(`✒  ${salida}  ·  ${FAMILIAS.length} familias`);
for (const f of FAMILIAS) {
  const p = palabra('GRUPO MAZI', { alto: 100, ...f.op });
  console.log(`   ${f.id.padEnd(20)} ${p.trazos.length} trazos, ${r2(p.ancho / p.alto)}× de ancho`);
}
