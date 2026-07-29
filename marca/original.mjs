// Reconstrucción del logo original de Palomazi (2011), a partir de la memoria de Carlos.
// Especificación que él confirmó:
//   · ave simétrica de frente, alas abiertas y barridas hacia arriba
//   · 7 plumas por ala (no lo recordaba: "7 8 9 o 14"; 14 se hace lodo a 32px)
//   · 5 plumas de cola, la de en medio sobre el eje
//   · estrella de 5 puntas en el pecho
//   · dos comillas en diagonal en la cintura, espejadas
//   · un arco bajo entre las alas por encima de la cabeza, puntas hacia abajo
//     tocando las alas por dentro. Mitad izquierda (su izquierda al mirarlo)
//     oscura con filo blanco; mitad derecha hueso sólido.
//   · cuerpo violeta/magenta brillante
//
// Todo es paramétrico a propósito: si dice "más filoso" o "9 plumas", se cambia
// un número, no se redibuja. Cuando llegue la imagen que él eligió, esto sirve
// para afinarla contra su referencia — y para sacar la versión chica, que es
// donde los logos se mueren.

import { writeFileSync } from 'node:fs';

const VACIO = '#100A18', SUPERFICIE = '#1E1428', VIOLETA = '#AC27FF', HUESO = '#E9E4E4';
const CX = 200;                       // eje de simetría
const r2 = n => Math.round(n * 10) / 10;

/* ── geometría ─────────────────────────────────────────────────────────── */

// Catmull-Rom a Bézier cúbica, cerrada. Curvas orgánicas sin pelearme con los
// puntos de control a mano.
function splineCerrada(p, tension = 1) {
  const n = p.length, at = i => p[(i % n + n) % n];
  let d = `M ${r2(p[0][0])} ${r2(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const k = tension / 6;
    d += ` C ${r2(p1[0] + (p2[0] - p0[0]) * k)} ${r2(p1[1] + (p2[1] - p0[1]) * k)}`
      +  ` ${r2(p2[0] - (p3[0] - p1[0]) * k)} ${r2(p2[1] - (p3[1] - p1[1]) * k)}`
      +  ` ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + ' Z';
}

// Media silueta derecha (arriba → abajo) → contorno cerrado y simétrico.
function espejar(mitad) {
  const izq = mitad.slice(1, -1).reverse().map(([x, y]) => [2 * CX - x, y]);
  return [...mitad, ...izq];
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function bezier3(p0, p1, p2, p3, t) {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0],
          a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]];
}

// Una pluma: panza curva, punta afilada. Base plana (la tapa el cuerpo).
function pluma([bx, by], [tx, ty], ancho, curva) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const h = ancho / 2, m = 0.45, panza = h + curva;
  const mx = bx + ux * L * m, my = by + uy * L * m;
  return `M ${r2(bx + px * h)} ${r2(by + py * h)}`
    + ` Q ${r2(mx + px * panza)} ${r2(my + py * panza)} ${r2(tx)} ${r2(ty)}`
    + ` Q ${r2(mx - px * panza)} ${r2(my - py * panza)} ${r2(bx - px * h)} ${r2(by - py * h)} Z`;
}

function estrella(cx, cy, R, puntas = 5, arriba = true) {
  const r = R * 0.382, pts = [];
  for (let i = 0; i < puntas * 2; i++) {
    const rad = i % 2 ? r : R;
    const ang = -Math.PI / 2 + (arriba ? 0 : Math.PI) + (i * Math.PI) / puntas;
    pts.push(`${r2(cx + rad * Math.cos(ang))} ${r2(cy + rad * Math.sin(ang))}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

/* ── las piezas ────────────────────────────────────────────────────────── */

function cuerpo() {
  // Mitad derecha, de la coronilla al arranque de la cola.
  const mitad = [
    [200,  86],  // coronilla
    [220,  92],
    [231, 114],  // ancho de la cabeza
    [222, 141],  // cuello
    [233, 159],  // hombro
    [247, 190],  // pecho, lo más ancho
    [241, 221],
    [223, 245],  // cintura
    [200, 256],  // arranque de la cola
  ];
  return splineCerrada(espejar(mitad), 1);
}

function ala({ plumas = 7, ancho = 30, estrecha = 10, curva = 5, tips } = {}) {
  const S = [214, 163];                       // hombro
  const W = [287, 103];                       // muñeca
  const [P0, P1, P2, P3] = tips ?? [[269, 208], [333, 170], [357, 86], [375, 14]];
  const d = [];
  for (let i = 0; i < plumas; i++) {
    const t = plumas === 1 ? 0 : i / (plumas - 1);
    d.push(pluma(lerp(S, W, t), bezier3(P0, P1, P2, P3, t), ancho - estrecha * t, curva));
  }
  return d;
}

// Cola: 5 plumas, la de en medio sobre el eje. Cortas y bien abiertas — si son
// largas y juntas se traslapan y el resultado se lee como un aguijón, no como
// una cola de cinco plumas.
function cola({ plumas = 5, largo = 56, corto = 40, abre = 25 } = {}) {
  const base = [200, 252], d = [], mitad = (plumas - 1) / 2;
  for (let i = 0; i < plumas; i++) {
    const k = i - mitad;                       // 0 = sobre el eje
    const ang = (90 + k * abre) * Math.PI / 180;
    const L = largo - (largo - corto) * Math.abs(k) / mitad;
    const o = [base[0] + k * 9, base[1]];
    d.push(pluma(o, [o[0] + L * Math.cos(ang), o[1] + L * Math.sin(ang)],
                 18 - Math.abs(k) * 2, 3));
  }
  return d;
}

// El arco: media luna baja entre las alas, por encima de la cabeza, puntas
// hacia abajo tocando las alas por dentro.
//
// Se traza como UNA curva con grosor constante y puntas redondas, no como un
// polígono que adelgaza hacia los extremos: eso último producía una hoz —
// literalmente parecía que el ave traía un machete encima.
//
// Las dos mitades: se pinta la curva completa en hueso y encima se "vacía" la
// mitad izquierda con un trazo más delgado del color del fondo. Queda mitad
// izquierda oscura con filo hueso, mitad derecha hueso sólida. Como lo pediste.
function arco({ span = 100, alto = 30, grosor = 14, y = 104, recorte = 0.10 } = {}) {
  const P0 = [CX - span, y], P2 = [CX + span, y];
  const P1 = [CX, 2 * (y - alto) - y];          // control: la curva pasa por la cima
  const en = t => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  // Subdivisión de una cuadrática al tramo [t0,t1].
  const tramo = (t0, t1) => {
    const c = lerp(lerp(P0, P1, t0), lerp(P1, P2, t0), t1);
    const a = en(t0), b = en(t1);
    return `M ${r2(a[0])} ${r2(a[1])} Q ${r2(c[0])} ${r2(c[1])} ${r2(b[0])} ${r2(b[1])}`;
  };
  return {
    entero: tramo(0, 1),
    huecoIzq: tramo(recorte, 0.5),
    grosor,
  };
}

function comillas({ y1 = 211, y2 = 232, dx = 11, sep = 25 } = {}) {
  return [`M ${CX + sep} ${y1} L ${CX + sep + dx} ${y2}`,
          `M ${CX - sep} ${y1} L ${CX - sep - dx} ${y2}`];
}

/* ── ensamble ──────────────────────────────────────────────────────────── */

function marca(op = {}) {
  // `fondo` es el color de la mitad oscura del arco. Va fijo al vacío de la
  // marca, no al fondo de la página: así el logo es autocontenido y "mitad
  // negra, mitad blanca" se cumple en cualquier soporte.
  const { id, plumas = 7, curva = 5, ancho = 30, estrecha = 10, fondo = VACIO,
          conArco = true, conEstrella = true, conComillas = true, tips } = op;

  const alaDer = ala({ plumas, ancho, estrecha, curva, tips });
  const arc = arco();
  const [cDer, cIzq] = comillas();
  const alas = alaDer.map(d => `<path d="${d}"/>`).join('');

  return `
  <g id="${id}">
    <g fill="${VIOLETA}">
      ${cola().map(d => `<path d="${d}"/>`).join('')}
      <g>${alas}</g>
      <g transform="translate(${2 * CX},0) scale(-1,1)">${alas}</g>
      <path d="${cuerpo()}"/>
    </g>
    ${conEstrella ? `<path d="${estrella(CX, 186, 25)}" fill="${HUESO}"/>` : ''}
    ${conComillas ? `<g stroke="${HUESO}" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="${cDer}"/><path d="${cIzq}"/></g>` : ''}
    ${conArco ? `<g fill="none" stroke-linecap="round">
      <path d="${arc.entero}" stroke="${HUESO}" stroke-width="${arc.grosor}"/>
      <path d="${arc.huecoIzq}" stroke="${fondo}" stroke-width="${arc.grosor - 5}"/></g>` : ''}
  </g>`;
}

const VARIANTES = [
  { id: 'v-clasico', titulo: '7 plumas · como lo describiste',
    nota: 'La lectura base: 7 cuchillas por ala, panza curva y punta afilada.' },
  { id: 'v-filoso', titulo: 'filoso', plumas: 7, curva: 1.5, ancho: 26, estrecha: 12,
    tips: [[272, 202], [340, 158], [362, 78], [381, 8]],
    nota: 'Menos panza, más navaja — el temple de tu referencia angular.' },
  { id: 'v-suave', titulo: 'suave', plumas: 7, curva: 9, ancho: 34, estrecha: 9,
    nota: 'Plumas más gordas y redondas. Aguanta mejor el tamaño chico.' },
  { id: 'v-denso', titulo: '9 plumas', plumas: 9, ancho: 26, estrecha: 9,
    nota: 'Por si tu memoria pesa más que mi consejo. A 32 px empieza a cerrarse.' },
  { id: 'v-desnudo', titulo: 'sólo la silueta', conArco: false, conEstrella: false,
    conComillas: false, nota: 'Sin arco, estrella ni comillas: para juzgar el ave sola.' },
];

const VB = '0 0 400 340';
const defs = VARIANTES.map(v => marca(v)).join('\n');
const tarjeta = (v, w = 300, fondo = 'caja') => `
  <div><div class="${fondo}"><svg viewBox="${VB}" width="${w}"><use href="#${v.id}"/></svg></div>
  <p class="pie">${v.titulo}</p></div>`;

const html = `<meta charset="utf-8">
<title>Grupo Mazi — el logo original, reconstruido</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{ --vacio:${VACIO}; --superficie:${SUPERFICIE}; --violeta:${VIOLETA}; --hueso:${HUESO}; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--vacio);color:var(--hueso);
       font-family:"Segoe UI",system-ui,-apple-system,sans-serif;padding:48px 32px 96px}
  .wrap{max-width:1180px;margin:0 auto}
  h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
  .sub{font-size:14px;color:#A99FB4;max-width:70ch;line-height:1.65;margin:0 0 40px}
  h2{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#8B8296;
     font-weight:600;margin:56px 0 20px;padding-bottom:10px;border-bottom:1px solid #2A2036}
  .fila{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start}
  .caja{background:var(--superficie);border:1px solid #2A2036;border-radius:12px;
        padding:20px;display:grid;place-items:center}
  .caja.claro{background:var(--hueso);border-color:#CFC9C9}
  .pie{font-size:10.5px;color:#8B8296;letter-spacing:.12em;text-transform:uppercase;
       margin:12px 0 0;text-align:center}
  .nota{font-size:13.5px;color:#A99FB4;line-height:1.65;max-width:66ch;margin:14px 0 0}
  .nota b{color:var(--hueso);font-weight:600}
  .escalas{display:flex;gap:30px;align-items:flex-end}
  .escalas .n{font-size:10px;color:#8B8296;margin-top:10px;text-align:center}
  .sw{width:150px;height:88px;border-radius:8px;border:1px solid #2A2036}
  .lock{display:flex;align-items:center;gap:22px}
  .palabra{font-weight:800;letter-spacing:-.035em;line-height:1;text-transform:uppercase;
           white-space:nowrap;font-size:40px}
  .palabra .g{color:#9A90A6;margin-right:.24em}
  .palabra .m{color:var(--hueso)}
</style>
<svg width="0" height="0" style="position:absolute"><defs>${defs}</defs></svg>

<div class="wrap">
  <h1>El logo original, reconstruido</h1>
  <p class="sub">Nadie tiene el archivo, así que esto no es una copia: es tu descripción vuelta
  geometría. Todo está parametrizado — plumas, filo, apertura, grosor del arco. Dime qué está
  mal y se mueve el número, no se redibuja.</p>

  <h2>Variantes</h2>
  <div class="fila">${VARIANTES.map(v => tarjeta(v)).join('')}</div>
  ${VARIANTES.map(v => `<p class="nota"><b>${v.titulo}:</b> ${v.nota}</p>`).join('')}

  <h2>Invertido · impresión y fondo claro</h2>
  <div class="fila">${tarjeta(VARIANTES[0], 300, 'caja claro')}${tarjeta(VARIANTES[1], 300, 'caja claro')}</div>

  <h2>Prueba de tamaño — donde se mueren los logos</h2>
  <div class="caja" style="justify-items:start;padding:34px 42px">
    <div class="escalas">
      ${[16, 24, 32, 48, 64, 96, 128].map(s =>
        `<div><svg viewBox="${VB}" width="${s}"><use href="#v-clasico"/></svg><div class="n">${s}</div></div>`
      ).join('')}
    </div>
  </div>
  <p class="nota">Si a 32 px el arco y la estrella se vuelven manchas, hace falta una
  <b>versión reducida</b>: menos plumas, arco más grueso, estrella más grande. Se resuelve con
  parámetros — pero primero hay que acertarle a la forma.</p>

  <h2>Bloqueo · marca + palabra</h2>
  <div class="fila"><div><div class="caja" style="padding:30px 40px"><div class="lock">
    <svg viewBox="${VB}" width="92"><use href="#v-clasico"/></svg>
    <div class="palabra"><span class="g">Grupo</span><span class="m">Mazi</span></div>
  </div></div><p class="pie">horizontal</p></div></div>

  <h2>Paleta</h2>
  <div class="fila">
    <div><div class="sw" style="background:${VACIO}"></div><p class="pie">${VACIO} vacío</p></div>
    <div><div class="sw" style="background:${SUPERFICIE}"></div><p class="pie">${SUPERFICIE} superficie</p></div>
    <div><div class="sw" style="background:${VIOLETA}"></div><p class="pie">${VIOLETA} violeta</p></div>
    <div><div class="sw" style="background:${HUESO}"></div><p class="pie">${HUESO} hueso</p></div>
  </div>
</div>
`;

writeFileSync(new URL('./original.html', import.meta.url), html);

for (const v of VARIANTES) {
  writeFileSync(new URL(`./logo/${v.id}.svg`, import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" width="400" height="340">${marca(v)}</svg>`);
}

console.log(`marca/original.html + ${VARIANTES.length} SVG en marca/logo/`);
