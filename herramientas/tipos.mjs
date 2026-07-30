#!/usr/bin/env node
/**
 * tipos.mjs — la fábrica de tipografías de la casa.
 *
 * No es un generador de logotipos: es el taller donde se define, se edita y se
 * saca cualquier juego de caracteres, con cualquier pincel.
 *
 *   node herramientas/tipos.mjs muestra  [--alfabeto X] [--pincel Y]  → SVG del texto
 *   node herramientas/tipos.mjs juego                                 → todos los caracteres
 *   node herramientas/tipos.mjs catalogo salida.html                  → alfabetos × pinceles
 *   node herramientas/tipos.mjs texto "GRUPO MAZI" salida.svg
 *
 * ── LAS PARTES QUE HAY QUE SEPARAR ────────────────────────────────────────
 *
 * Un error fácil —y el que hubo que corregir aquí— es creer que cambiando el
 * pincel salen tipografías distintas. No: salen versiones de la MISMA letra. Una
 * tipografía son partes independientes:
 *
 *   1 · EL ESQUELETO — la estructura de la letra. Si la O es un círculo o un
 *       hexágono, si la M tiene el vértice a la mitad o hasta abajo, si la A
 *       lleva travesaño alto o bajo. Esto es lo que hace que dos tipografías se
 *       vean distintas de verdad.
 *   2 · EL PINCEL — cómo se engorda ese esqueleto. Grosor uniforme, contraste de
 *       plumilla, presión de pincel real, punta de cuña. Es el acabado.
 *   3 · EL REMATE — lo que se le pega a la punta. Un perfil de grosor no puede
 *       hacer un rombo, y el rombo ES la gótica. Van aparte: diamante, bola,
 *       escuadra, cuña, bigote.
 *   4 · EL RELLENO — macizo o hueco. El hueco es la letra de jaula japonesa.
 *   5 · LAS CERDAS — el trazo abierto en líneas paralelas, para el higemoji.
 *
 * Esqueleto × pincel × remate = la matriz de posibilidades. Cambiar sólo el
 * pincel es cambiar el acabado de la misma letra.
 *
 * ── LA REJILLA ────────────────────────────────────────────────────────────
 *
 * Los glifos se definen sobre una rejilla de nodos, así que escribir una letra es
 * escribir una cadena y editarla es cambiar dos caracteres. Es lo que hace viable
 * tener el juego completo y no nueve letras.
 *
 *   columnas   a=0   b=.25   c=.5   d=.75   e=1        (× ancho del glifo)
 *   filas      0=alto de mayúscula … 6=línea de base
 *              2=altura de la x    7,8=descendente    −1,−2=acentos
 *
 *   columnas   a=0  k=.125  b=.25  l=.375  c=.5  m=.625  d=.75  n=.875  e=1
 *
 *   "a0 a6"              → recta de arriba-izquierda a abajo-izquierda
 *   "c0 e2 e4 c6 a4 a2 c0"  → tres o más nodos = curva suave que pasa por todos
 *   "!a0 c3 e0"          → el "!" quita el suavizado: la esquina queda esquina
 *   "d2.6"               → las filas aceptan decimal
 *   un trazo que acaba donde empieza se cierra solo
 *
 * ── BITMAP Y VECTOR ───────────────────────────────────────────────────────
 *
 * La salida natural es vector. Con `--bitmap N` el glifo se rasteriza a una
 * rejilla de N píxeles de alto, que sirve para dos cosas: tipografía de pantalla
 * tipo pixel-art, y —lo interesante— pasar ese bitmap por `vectorizar.mjs` para
 * que vuelva como vector con textura de trazo real en vez de contorno perfecto.
 * Las dos herramientas se enganchan.
 */

import { writeFileSync } from 'node:fs';

const r2 = n => Math.round(n * 100) / 100;

/* ═══ LA REJILLA ═══════════════════════════════════════════════════════════ */

// Cinco columnas no alcanzaban para la letra gótica ni para las escaleras del
// sello, así que hay nueve: las de en medio son k l m n.
const COL = {
  a: 0, k: 0.125, b: 0.25, l: 0.375, c: 0.5, m: 0.625, d: 0.75, n: 0.875, e: 1,
};
const FILA = f => f / 6;   // 0 = alto de mayúscula, 6 = línea de base

// "c0 e2 e4 c6" → [[0.5,0], [1,0.33], …]. Las filas aceptan decimal ("d2.6")
// porque un remate de diamante no cae nunca en una fila entera.
function nodos(cadena, an) {
  return cadena.trim().split(/\s+/).map(tok => {
    const m = /^([a-z])(-?\d+(?:\.\d+)?)$/.exec(tok);
    if (!m || COL[m[1]] === undefined) throw new Error(`nodo inválido: "${tok}"`);
    return [COL[m[1]] * an, FILA(Number(m[2]))];
  });
}

/* ═══ SUAVIZADO ════════════════════════════════════════════════════════════ */

// Catmull-Rom densificada: tres nodos o más describen una curva que PASA por
// todos, que es lo que hace que definir una letra sea poner puntos y ya.
function suavizar(p, porTramo = 14, cerrado = false) {
  if (p.length === 2) {
    // También aquí el muestreo va con el largo. Con un número fijo, un corte
    // declarado caía en una rejilla gruesa y se comía más trazo del pedido — que
    // fue lo que dejó a la "a" sin asta.
    const pasos = Math.max(porTramo,
      Math.min(40, Math.round(Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) * 130)));
    return Array.from({ length: pasos + 1 }, (_, i) => [
      p[0][0] + (p[1][0] - p[0][0]) * (i / pasos),
      p[0][1] + (p[1][1] - p[0][1]) * (i / pasos),
    ]);
  }
  const n = p.length;
  const at = i => cerrado ? p[(i % n + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
  const salida = [];
  const hasta = cerrado ? n : n - 1;

  // CENTRÍPETA, no uniforme. La Catmull-Rom uniforme reparte el parámetro por
  // partes iguales sin mirar cuánto mide cada tramo, y donde una recta larga se
  // encuentra con una esquina corta —que es EXACTAMENTE la superelipse: lado
  // recto, esquina curva— se pasa de la raya y deja un bulto. La letra de reloj
  // salía con panza. La variante centrípeta reparte el parámetro según la raíz
  // de la distancia y por eso no se pasa nunca: existe justo para este caso.
  const nudo = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-6;

  for (let i = 0; i < hasta; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const t0 = 0, t1 = t0 + nudo(p0, p1), t2 = t1 + nudo(p1, p2), t3 = t2 + nudo(p2, p3);
    // Muestreo segun cuanto mide el tramo, no parejo. Con un numero fijo de
    // muestras, una curva larga sale poligonal y una corta sale con puntos de
    // sobra: en la O grande se veian las facetas del contorno a simple vista.
    const pasos = Math.max(porTramo,
      Math.min(40, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 130)));
    for (let j = 0; j < pasos; j++) {
      const t = t1 + (t2 - t1) * (j / pasos);
      const mez = (u, v, ta, tb) => [
        ((tb - t) * u[0] + (t - ta) * v[0]) / (tb - ta),
        ((tb - t) * u[1] + (t - ta) * v[1]) / (tb - ta),
      ];
      const A1 = mez(p0, p1, t0, t1), A2 = mez(p1, p2, t1, t2), A3 = mez(p2, p3, t2, t3);
      const B1 = mez(A1, A2, t0, t2), B2 = mez(A2, A3, t1, t3);
      salida.push(mez(B1, B2, t1, t2));
    }
  }
  if (!cerrado) salida.push(p[n - 1]);
  return salida;
}

// El trazo QUEBRADO. Un trazo que empieza con "!" no se suaviza: los nodos se
// unen con recta y la esquina queda esquina. Es lo que hace posible la gótica —
// en la Textura del siglo XIII la curva desaparece y sólo quedan cambios de
// dirección abruptos— y las escaleras del sello, que sustituyen la diagonal.
function tieso(p, porTramo = 8, cerrado = false) {
  const q = cerrado ? [...p, p[0]] : p;
  const salida = [];
  for (let i = 0; i < q.length - 1; i++) {
    for (let j = 0; j < porTramo; j++) {
      const t = j / porTramo;
      salida.push([
        q[i][0] + (q[i + 1][0] - q[i][0]) * t,
        q[i][1] + (q[i + 1][1] - q[i][1]) * t,
      ]);
    }
  }
  salida.push(q.at(-1));
  return salida;
}

/* ═══ LOS PINCELES ═════════════════════════════════════════════════════════ */
//
// Un pincel es una función (t, θ) → factor de grosor, con t la posición a lo
// largo del trazo (0 a 1) y θ el ángulo local. Es el mismo concepto que un
// pincel de Photoshop: un perfil que cambia a lo largo del trazo.

const PINCELES = {
  uniforme: {
    nota: 'Grosor constante. La base geométrica.',
    f: () => 1,
  },
  plumilla: {
    nota: 'Plumilla ancha: grueso perpendicular al filo, fino a lo largo de él. '
        + 'De aquí sale el contraste de la tipografía clásica, por física.',
    // `filo` es el ángulo del FILO de la plumilla, en el sistema del SVG (y hacia
    // abajo). El trazo más fino sale cuando se va en la dirección del filo. Filo
    // −40° es el ángulo de pluma de la Textura gótica: astas casi al máximo,
    // diagonales convertidas en pelo. Filo 90 es la plumilla vertical, o sea
    // contraste INVERTIDO: horizontales gordas y astas finas.
    f: (t, th, { filo = 90, contraste = 0.28 }) =>
      contraste + (1 - contraste) * Math.abs(Math.sin(th - filo * Math.PI / 180)),
  },
  cincel: {
    nota: 'Plumilla llevada al extremo: casi cero en las horizontales.',
    f: (t, th, { filo = 90 }) =>
      0.08 + 0.92 * Math.abs(Math.sin(th - filo * Math.PI / 180)) ** 1.6,
  },
  presion: {
    nota: 'Pincel real: entra fino, engorda al centro y sale fino. La presión de '
        + 'la mano, no el ángulo.',
    f: t => 0.30 + 0.70 * Math.sin(Math.PI * t) ** 0.65,
  },
  cuna: {
    nota: 'Entra grueso y sale en punta. La terminación ES una pluma del ave.',
    f: t => 1 - 0.88 * t ** 1.35,
  },
  latigo: {
    nota: 'Asimétrico: fino, engorda pronto y arrastra hasta la punta. Gesto de '
        + 'caligrafía rápida.',
    f: t => 0.22 + 0.78 * Math.sin(Math.PI * Math.min(1, t * 1.45)) ** 1.8,
  },
  gota: {
    nota: 'Fino al entrar y pesado al final. Al revés que la cuña.',
    f: t => 0.28 + 0.72 * t ** 1.2,
  },
  seco: {
    nota: 'Pincel seco: el grosor tiembla a lo largo del trazo. Textura, no '
        + 'geometría perfecta.',
    f: (t, th, op, semilla = 0) =>
      0.72 + 0.28 * (Math.sin(t * 23 + semilla * 7) * 0.5 + Math.sin(t * 41 + semilla * 3) * 0.5),
  },

  // ── Los tres finales del pincel japonés ─────────────────────────────────
  // En caligrafía hay tres maneras de terminar un trazo y son nombres propios,
  // no matices: tome (止め) para, hane (跳ね) rebota, harai (払い) barre.

  harai: {
    nota: 'Harai 払い — barrido: el pincel se sostiene y luego se levanta poco a '
        + 'poco hasta que el trazo se va en un pelo. El final más largo de los tres.',
    f: t => (t < 0.46 ? 1 : Math.max(0.04, ((1 - t) / 0.54) ** 0.85)),
  },
  hane: {
    nota: 'Hane 跳ね — rebote: el trazo se sostiene grueso y en el último tramo el '
        + 'pincel se levanta de golpe. Corte seco, no desvanecido.',
    f: t => (t < 0.84 ? 0.92 + 0.08 * Math.sin(Math.PI * t) : Math.max(0.06, (1 - t) / 0.16 * 0.9)),
  },
  tome: {
    nota: 'Tome 止め — parada: entra con presión, adelgaza al centro y vuelve a '
        + 'apoyarse al detenerse. Los extremos pesan más que el cuerpo.',
    f: t => 0.70 + 0.30 * Math.cos(2 * Math.PI * t) * 0.5 + 0.15,
  },
  higemoji: {
    nota: 'Higemoji 髭文字 — letra de bigote: el perfil que pide el reparto 7-5-3 '
        + 'de las cerdas. Vientre ancho y extremos delgados, para que al abrirse en '
        + 'cerdas queden siete en el cuerpo, cinco al angostarse y tres al acabar.',
    f: t => 0.34 + 0.66 * Math.sin(Math.PI * t) ** 0.55,
  },
  sumi: {
    nota: 'Sumi 墨 — la tinta que se acaba: entra cargado y se va rayando y '
        + 'adelgazando. Tiembla y se desvanece a la vez.',
    f: (t, th, op, semilla = 0) =>
      Math.max(0.08, (1 - 0.62 * t ** 1.2)
        * (0.86 + 0.14 * Math.sin(t * 37 + semilla * 5))),
  },
};

/* ═══ LOS REMATES ══════════════════════════════════════════════════════════ */
//
// Un pincel no puede hacer un remate. El perfil de grosor sólo engorda o
// adelgaza el trazo a lo largo — no le puede pegar un rombo en la punta. Y el
// rombo ES la gótica: "quadrata" viene justo de esos remates en diamante arriba
// y abajo de cada asta, y el nombre "textura" viene de *texere*, tejer, por la
// trama que forman las astas parejas con sus diamantes.
//
// Así que los remates son un mecanismo aparte: piezas que se pegan en los
// extremos LIBRES de cada trazo (nunca en una unión), orientadas con el ángulo
// del trazo y con el filo de la plumilla.

const REMATES = {
  ninguno: () => [],

  diamante: (x, y, th, g, filo) => {
    // La huella de la plumilla apoyada: un rombo cuyo eje largo va sobre el filo.
    const f = filo * Math.PI / 180;
    const cx = x + Math.cos(th) * g * 0.06, cy = y + Math.sin(th) * g * 0.06;
    // Del ancho de la plumilla, no más: un rombo largo deja de ser remate y se
    // vuelve espina. El diamante de la Textura mide más o menos el trazo.
    const L = g * 0.56, S = g * 0.30;
    const fx = Math.cos(f), fy = Math.sin(f);
    const P = (a, b) => `${r2(a)} ${r2(b)}`;
    return [`M ${P(cx + L * fx, cy + L * fy)} L ${P(cx - S * fy, cy + S * fx)}`
      + ` L ${P(cx - L * fx, cy - L * fy)} L ${P(cx + S * fy, cy - S * fx)} Z`];
  },

  bola: (x, y, th, g) => [disco(x + Math.cos(th) * g * 0.18,
    y + Math.sin(th) * g * 0.18, g * 0.56)],

  // Punta redonda exacta: el disco mide justo el trazo y va centrado en el
  // extremo. No es adorno — es la señal de "amable" más fuerte que hay. Un
  // corte a escuadra se lee técnico; el mismo trazo con punta redonda se lee
  // cercano, y no cambió nada más.
  redondo: (x, y, th, g) => [disco(x, y, g * 0.5)],

  escuadra: (x, y, th, g) => {
    // Terminación en ángulo recto: el bloque del kanteiryū, que no desvanece
    // nada — corta cuadrado y llena.
    // `b` es exactamente el medio ancho del trazo: si es más, el bloque asoma
    // por los lados y parece una pestaña pegada.
    const ux = Math.cos(th), uy = Math.sin(th), a = g * 0.15, b = g * 0.5;
    const cx = x + ux * a, cy = y + uy * a;
    const P = (px, py) => `${r2(px)} ${r2(py)}`;
    return [`M ${P(cx + ux * a - uy * b, cy + uy * a + ux * b)}`
      + ` L ${P(cx + ux * a + uy * b, cy + uy * a - ux * b)}`
      + ` L ${P(cx - ux * a + uy * b, cy - uy * a - ux * b)}`
      + ` L ${P(cx - ux * a - uy * b, cy - uy * a + ux * b)} Z`];
  },

  pua: (x, y, th, g, filo) => {
    // Cuña: la serifa medieval que no llegó a rombo. Apunta sobre el filo.
    const f = filo * Math.PI / 180;
    const tx = x + Math.cos(f) * g * 0.86, ty = y + Math.sin(f) * g * 0.86;
    const ux = Math.cos(th), uy = Math.sin(th);
    const P = (px, py) => `${r2(px)} ${r2(py)}`;
    return [`M ${P(tx, ty)} L ${P(x - uy * g * 0.42, y + ux * g * 0.42)}`
      + ` L ${P(x + uy * g * 0.42, y - ux * g * 0.42)} Z`];
  },

  bigote: (x, y, th, g) => {
    // Los pelos del kagomoji 籠文字: tres, cortos, saliendo del extremo.
    const P = (px, py) => `${r2(px)} ${r2(py)}`;
    return [-0.5, 0, 0.5].map(d => {
      const a = th + d, L = g * (d === 0 ? 0.62 : 0.48);
      const bx = -Math.sin(a) * g * 0.075, by = Math.cos(a) * g * 0.075;
      return `M ${P(x + bx, y + by)} L ${P(x + Math.cos(a) * L, y + Math.sin(a) * L)}`
        + ` L ${P(x - bx, y - by)} Z`;
    });
  },
};

/* ═══ LOS ESQUELETOS ═══════════════════════════════════════════════════════ */
//
// `recto` es el alfabeto completo. Los demás HEREDAN de él y sólo redefinen las
// letras que de verdad cambian de estructura — así hay varias tipografías sin
// escribir el juego entero cuatro veces.

const recto = {
  nombre: 'Recto',
  nota: 'Geométrico y neutro: círculos y rectas. El juego completo vive aquí.',
  glifos: {
    A: { an: 0.72, t: ['a6 c0', 'c0 e6', 'a4 e4'], nudos: ['c0'] },
    B: { an: 0.66, t: ['a0 a6', 'a0 d0 d1 c3 a3', 'a3 d3 d5 c6 a6'], nudos: ['a0', 'a3', 'a6'] },
    C: { an: 0.70, t: ['e1 c0 a2 a4 c6 e5'] },
    D: { an: 0.70, t: ['a0 a6', 'a0 c0 e2 e4 c6 a6'], nudos: ['a0', 'a6'] },
    E: { an: 0.62, t: ['a0 a6', 'a0 e0', 'a3 d3', 'a6 e6'], nudos: ['a0', 'a3', 'a6'] },
    F: { an: 0.58, t: ['a0 a6', 'a0 e0', 'a3 d3'], nudos: ['a0', 'a3'] },
    G: { an: 0.74, t: ['e1 c0 a2 a4 c6 e5 e3', 'e3 c3'], nudos: ['e3'] },
    H: { an: 0.70, t: ['a0 a6', 'e0 e6', 'a3 e3'], nudos: ['a3', 'e3'] },
    I: { an: 0.18, t: ['c0 c6'] },
    J: { an: 0.54, t: ['d0 d4 c6 a5'] },
    K: { an: 0.66, t: ['a0 a6', 'e0 a3', 'a3 e6'], nudos: ['a3'] },
    L: { an: 0.56, t: ['a0 a6', 'a6 e6'], nudos: ['a6'] },
    M: { an: 0.88, t: ['a6 a0', 'a0 c4', 'c4 e0', 'e0 e6'], nudos: ['a0', 'c4', 'e0'] },
    N: { an: 0.72, t: ['a6 a0', 'a0 e6', 'e6 e0'], nudos: ['a0', 'e6'] },
    O: { an: 0.76, t: ['c0 e2 e4 c6 a4 a2 c0'] },
    P: { an: 0.62, t: ['a0 a6', 'a0 d0 d2 c3 a3'], nudos: ['a0', 'a3'] },
    Q: { an: 0.76, t: ['c0 e2 e4 c6 a4 a2 c0', 'c4 e6'] },
    R: { an: 0.66, t: ['a0 a6', 'a0 d0 d2 c3 a3', 'a3 e6'], nudos: ['a0', 'a3'] },
    S: { an: 0.62, t: ['e1 c0 a1 a2 c3 e4 e5 c6 a5'] },
    T: { an: 0.62, t: ['a0 e0', 'c0 c6'], nudos: ['c0'] },
    U: { an: 0.72, t: ['a0 a4 c6 e4 e0'] },
    V: { an: 0.72, t: ['a0 c6', 'c6 e0'], nudos: ['c6'] },
    W: { an: 0.96, t: ['a0 b6', 'b6 c2', 'c2 d6', 'd6 e0'], nudos: ['b6', 'c2', 'd6'] },
    X: { an: 0.70, t: ['a0 e6', 'e0 a6'] },
    Y: { an: 0.70, t: ['a0 c3', 'e0 c3', 'c3 c6'], nudos: ['c3'] },
    Z: { an: 0.64, t: ['a0 e0', 'e0 a6', 'a6 e6'], nudos: ['e0', 'a6'] },

    a: { an: 0.60, t: ['a3 c2 e3 e6', 'e5 c6 a5 a4 c3 e4'], nudos: ['e3'] },
    b: { an: 0.62, t: ['a0 a6', 'a3 c2 e3 e5 c6 a5'], nudos: ['a3', 'a5'] },
    c: { an: 0.56, t: ['e3 c2 a3 a5 c6 e5'] },
    d: { an: 0.62, t: ['e0 e6', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3', 'e5'] },
    e: { an: 0.58, t: ['a4 e4 e3 c2 a3 a5 c6 e5'] },
    // La f tenía asta recta y travesaño, o sea EXACTAMENTE la t sin pie: en
    // "software" se leía "sottware". Con el arco de arriba ya se distingue. Es un
    // defecto de legibilidad, no un gusto, así que se arregla en la base y lo
    // heredan todos los alfabetos.
    f: { an: 0.46, t: ['e0.2 d0 c0.9 c6', 'a2.2 e2.2'], nudos: ['c2.2'] },
    g: { an: 0.62, t: ['e2 e7 c8 a7', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3'] },
    h: { an: 0.60, t: ['a0 a6', 'a3 c2 e3 e6'], nudos: ['a3'] },
    // El punto estaba en la fila 0, o sea a altura de MAYÚSCULA: flotaba lejísimos
    // de su asta. Sube apenas por encima de la altura de x, que es donde va.
    i: { an: 0.18, t: ['c2 c6', 'c0.8 c0.8'] },
    j: { an: 0.32, t: ['d2 d7 c8 a7', 'd0.8 d0.8'] },
    k: { an: 0.58, t: ['a0 a6', 'e2 a4', 'a4 e6'], nudos: ['a4'] },
    l: { an: 0.20, t: ['c0 c6'] },
    m: { an: 0.92, t: ['a2 a6', 'a3 b2 c3 c6', 'c3 d2 e3 e6'], nudos: ['a3', 'c3'] },
    n: { an: 0.60, t: ['a2 a6', 'a3 c2 e3 e6'], nudos: ['a3'] },
    o: { an: 0.62, t: ['c2 e3 e5 c6 a5 a3 c2'] },
    p: { an: 0.62, t: ['a2 a8', 'a3 c2 e3 e5 c6 a5'], nudos: ['a3', 'a5'] },
    q: { an: 0.62, t: ['e2 e8', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3', 'e5'] },
    r: { an: 0.42, t: ['a2 a6', 'a3 c2 e2'], nudos: ['a3'] },
    s: { an: 0.52, t: ['e3 c2 a3 c4 e5 c6 a5'] },
    t: { an: 0.42, t: ['c0 c5 d6', 'a2 e2'], nudos: ['c2'] },
    u: { an: 0.60, t: ['a2 a5 c6 e5 e2', 'e5 e6'], nudos: ['e5'] },
    v: { an: 0.58, t: ['a2 c6', 'c6 e2'], nudos: ['c6'] },
    w: { an: 0.84, t: ['a2 b6', 'b6 c3', 'c3 d6', 'd6 e2'], nudos: ['b6', 'c3', 'd6'] },
    x: { an: 0.56, t: ['a2 e6', 'e2 a6'] },
    y: { an: 0.58, t: ['a2 c6', 'e2 c6 b8'], nudos: ['c6'] },
    z: { an: 0.54, t: ['a2 e2', 'e2 a6', 'a6 e6'], nudos: ['e2', 'a6'] },

    0: { an: 0.66, t: ['c0 e2 e4 c6 a4 a2 c0'] },
    1: { an: 0.40, t: ['a1 c0 c6'], nudos: ['c0'] },
    2: { an: 0.62, t: ['a1 c0 e1 e2 a6', 'a6 e6'], nudos: ['a6'] },
    3: { an: 0.62, t: ['a1 c0 e1 c3 e4 e5 c6 a5', 'c3 b3'] },
    4: { an: 0.66, t: ['d0 a4', 'a4 e4', 'd0 d6'], nudos: ['a4', 'd4'] },
    5: { an: 0.60, t: ['e0 a0 a3 c2 e3 e5 c6 a5'], nudos: ['a0'] },
    6: { an: 0.64, t: ['d0 b1 a3 a5 c6 e5 e4 c3 a4'] },
    7: { an: 0.58, t: ['a0 e0', 'e0 b6'], nudos: ['e0'] },
    8: { an: 0.64, t: ['c3 e2 e1 c0 a1 a2 c3 e4 e5 c6 a5 a4 c3'] },
    9: { an: 0.64, t: ['b6 d5 e3 e1 c0 a1 a2 c3 e2'] },

    'Á': { an: 0.72, hereda: 'A', acento: 'agudo' },
    'É': { an: 0.62, hereda: 'E', acento: 'agudo' },
    'Í': { an: 0.18, hereda: 'I', acento: 'agudo' },
    'Ó': { an: 0.76, hereda: 'O', acento: 'agudo' },
    'Ú': { an: 0.72, hereda: 'U', acento: 'agudo' },
    'Ü': { an: 0.72, hereda: 'U', acento: 'dieresis' },
    'Ñ': { an: 0.72, hereda: 'N', acento: 'tilde' },
    'á': { an: 0.60, hereda: 'a', acento: 'agudo' },
    'é': { an: 0.58, hereda: 'e', acento: 'agudo' },
    'í': { an: 0.18, hereda: 'l', acento: 'agudo' },
    'ó': { an: 0.62, hereda: 'o', acento: 'agudo' },
    'ú': { an: 0.60, hereda: 'u', acento: 'agudo' },
    'ü': { an: 0.60, hereda: 'u', acento: 'dieresis' },
    'ñ': { an: 0.60, hereda: 'n', acento: 'tilde' },

    '.': { an: 0.22, t: ['c6 c6'] },
    ',': { an: 0.22, t: ['c6 b7'] },
    ':': { an: 0.22, t: ['c3 c3', 'c6 c6'] },
    ';': { an: 0.22, t: ['c3 c3', 'c6 b7'] },
    '-': { an: 0.36, t: ['a4 e4'] },
    '–': { an: 0.56, t: ['a4 e4'] },
    '·': { an: 0.24, t: ['c4 c4'] },
    '!': { an: 0.22, t: ['c0 c4', 'c6 c6'] },
    '¡': { an: 0.22, t: ['c2 c6', 'c0 c0'] },
    '?': { an: 0.50, t: ['a1 c0 e1 c3 c4', 'c6 c6'] },
    '¿': { an: 0.50, t: ['e5 c6 a5 c3 c2', 'c0 c0'] },
    '(': { an: 0.32, t: ['d0 b3 d6'] },
    ')': { an: 0.32, t: ['b0 d3 b6'] },
    '/': { an: 0.46, t: ['a6 e0'] },
    '&': { an: 0.74, t: ['e6 b2 c0 d1 a5 c6 e4'] },
    '@': { an: 0.88, t: ['c2.4 d3 d4.2 c5 b4.2 b3 c2.4',
      'd2.8 d4.6 e4.4 e2.6 c0.6 a2.6 a4.4 c6.4 e5.8'] },
    "'": { an: 0.18, t: ['c0 c1'] },
    '"': { an: 0.30, t: ['b0 b1', 'd0 d1'] },
    ' ': { an: 0.30, t: [] },

    // Griego: μαζί es "juntos", y de ahí viene el nombre. Las nueve letras de
    // GRUPO MAZI tienen equivalente griego directo, así que el juego lo incluye.
    'Γ': { an: 0.58, t: ['a0 a6', 'a0 e0'], nudos: ['a0'] },
    'Δ': { an: 0.76, t: ['c0 a6', 'a6 e6', 'e6 c0'], nudos: ['c0', 'a6', 'e6'] },
    'Θ': { an: 0.76, t: ['c0 e2 e4 c6 a4 a2 c0', 'b3 d3'] },
    'Λ': { an: 0.72, t: ['a6 c0', 'c0 e6'], nudos: ['c0'] },
    'Ξ': { an: 0.62, t: ['a0 e0', 'b3 d3', 'a6 e6'] },
    'Π': { an: 0.72, t: ['a6 a0', 'a0 e0', 'e0 e6'], nudos: ['a0', 'e0'] },
    'Σ': { an: 0.64, t: ['e0 a0 c3 a6 e6'] },
    'Υ': { an: 0.70, t: ['a0 c3', 'e0 c3', 'c3 c6'], nudos: ['c3'] },
    'Φ': { an: 0.78, t: ['c0 c6', 'c1 e3 c5 a3 c1'], nudos: [] },
    'Ω': { an: 0.78, t: ['a6 b6 b4 c1 d4 d6 e6'] },
    'μ': { an: 0.62, t: ['a2 a8', 'a5 c6 e5 e2', 'e5 e6'], nudos: ['e5'] },
    'ζ': { an: 0.50, t: ['a1 d1 b4 d5 c8 a7'] },
  },
};

// Cada alfabeto nuevo hereda el juego completo y sólo redefine lo que de verdad
// cambia de estructura. Eso es lo que hace que sean tipografías distintas y no
// el mismo dibujo con otro acabado.
const ALFABETOS = {
  recto,

  deco: {
    nombre: 'Deco',
    nota: 'Alta y estrecha, vértices agudos y travesaños altos. La M baja hasta la '
        + 'base y la A cierra en punta: el gesto de los años treinta.',
    base: 'recto',
    escalaAncho: 0.82,
    glifos: {
      A: { an: 0.66, t: ['a6 c0', 'c0 e6', 'a5 e5'], nudos: ['c0'] },
      M: { an: 0.92, t: ['a6 a0', 'a0 c6', 'c6 e0', 'e0 e6'], nudos: ['a0', 'c6', 'e0'] },
      E: { an: 0.58, t: ['a0 a6', 'a0 e0', 'a2 c2', 'a6 e6'], nudos: ['a0', 'a2', 'a6'] },
      G: { an: 0.70, t: ['e1 c0 a2 a4 c6 e5 e2', 'e2 c2'], nudos: ['e2'] },
      R: { an: 0.62, t: ['a0 a6', 'a0 d0 d1 c2 a2', 'a2 e6'], nudos: ['a0', 'a2'] },
      P: { an: 0.60, t: ['a0 a6', 'a0 d0 d1 c2 a2'], nudos: ['a0', 'a2'] },
      B: { an: 0.62, t: ['a0 a6', 'a0 d0 d1 c2 a2', 'a2 d2 d5 c6 a6'], nudos: ['a0', 'a2', 'a6'] },
      S: { an: 0.58, t: ['e1 c0 a1 c2 e4 e5 c6 a5'] },
      W: { an: 0.92, t: ['a0 b6', 'b6 c0', 'c0 d6', 'd6 e0'], nudos: ['b6', 'c0', 'd6'] },
      O: { an: 0.64, t: ['c0 e2 e4 c6 a4 a2 c0'] },
      U: { an: 0.66, t: ['a0 a5 c6 e5 e0'] },
    },
  },

  angular: {
    nombre: 'Angular',
    nota: 'Cero curvas: la O es un hexágono y la C y la G son hexágonos abiertos. '
        + 'Facetada, tecnológica, dura.',
    base: 'recto',
    glifos: {
      O: { an: 0.76, t: ['b0 d0 e2 e4 d6 b6 a4 a2 b0'] },
      Q: { an: 0.76, t: ['b0 d0 e2 e4 d6 b6 a4 a2 b0', 'c4 e6'] },
      C: { an: 0.70, t: ['e0 b0 a2 a4 b6 e6'] },
      G: { an: 0.74, t: ['e0 b0 a2 a4 b6 e6 e3', 'e3 c3'], nudos: ['e3'] },
      S: { an: 0.62, t: ['e0 a0 a3 e3 e6 a6'], nudos: ['a3', 'e3'] },
      D: { an: 0.70, t: ['a0 a6', 'a0 c0 e2 e4 c6 a6'], nudos: ['a0', 'a6'] },
      U: { an: 0.72, t: ['a0 a5 b6 d6 e5 e0'] },
      B: { an: 0.66, t: ['a0 a6', 'a0 c0 d1 c3 a3', 'a3 c3 d5 c6 a6'], nudos: ['a0', 'a3', 'a6'] },
      R: { an: 0.66, t: ['a0 a6', 'a0 c0 d1 c3 a3', 'a3 e6'], nudos: ['a0', 'a3'] },
      P: { an: 0.62, t: ['a0 a6', 'a0 c0 d1 c3 a3'], nudos: ['a0', 'a3'] },
      o: { an: 0.62, t: ['b2 d2 e3 e5 d6 b6 a5 a3 b2'] },
      e: { an: 0.58, t: ['a4 e4 e3 d2 b2 a3 a5 b6 d6 e5'] },
      c: { an: 0.56, t: ['e2 b2 a3 a5 b6 e6'] },
      a: { an: 0.60, t: ['a2 e2 e6', 'e5 b6 a5 a4 b3 e3'], nudos: ['e2'] },
      s: { an: 0.52, t: ['e2 a2 a4 e4 e6 a6'], nudos: ['a4', 'e4'] },
    },
  },

  humanista: {
    nombre: 'Humanista',
    nota: 'Proporciones clásicas: anchos desiguales, cuencos algo más abiertos y '
        + 'la E con el travesaño del medio más corto. Se lee más cálida.',
    base: 'recto',
    glifos: {
      E: { an: 0.60, t: ['a0 a6', 'a0 e0', 'a3 c3', 'a6 e6'], nudos: ['a0', 'a3', 'a6'] },
      M: { an: 0.94, t: ['a6 a0', 'a0 c5', 'c5 e0', 'e0 e6'], nudos: ['a0', 'c5', 'e0'] },
      A: { an: 0.76, t: ['a6 c0', 'c0 e6', 'a4 e4'], nudos: ['c0'] },
      G: { an: 0.78, t: ['e1 c0 a2 a4 c6 e5 e3', 'e3 d3'], nudos: ['e3'] },
      O: { an: 0.80, t: ['c0 e2 e4 c6 a4 a2 c0'] },
      R: { an: 0.70, t: ['a0 a6', 'a0 d0 d2 c3 a3', 'b3 e6'], nudos: ['a0', 'a3'] },
      S: { an: 0.64, t: ['e1 c0 a1 b2 d4 e4 e5 c6 a5'] },
      W: { an: 1.00, t: ['a0 b6', 'b6 c1', 'c1 d6', 'd6 e0'], nudos: ['b6', 'c1', 'd6'] },
    },
  },

  griego: {
    nombre: 'Griego',
    nota: 'El nombre viene de μαζί, "juntos". Aquí las nueve letras de GRUPO MAZI '
        + 'se escriben con sus formas griegas: ΓΡΥΠΟ ΜΑΖΙ. No es adorno, es la raíz.',
    base: 'recto',
    glifos: {
      G: { an: 0.58, t: ['a0 a6', 'a0 e0'], nudos: ['a0'] },       // Γ
      R: { an: 0.62, t: ['a0 a6', 'a0 d0 d2 c3 a3'], nudos: ['a0', 'a3'] }, // Ρ
      U: { an: 0.70, t: ['a0 c3', 'e0 c3', 'c3 c6'], nudos: ['c3'] },       // Υ
      P: { an: 0.72, t: ['a6 a0', 'a0 e0', 'e0 e6'], nudos: ['a0', 'e0'] }, // Π
      A: { an: 0.72, t: ['a6 c0', 'c0 e6'], nudos: ['c0'] },                // Λ
      S: { an: 0.64, t: ['e0 a0 c3 a6 e6'] },                                // Σ
      D: { an: 0.76, t: ['c0 a6', 'a6 e6', 'e6 c0'], nudos: ['c0', 'a6', 'e6'] }, // Δ
    },
  },

  /* ── 篆書 TENSHO · escritura de sello ──────────────────────────────────
     La más vieja de las cinco escrituras clásicas: Zhou y Qin, la que sigue
     usándose para los hanko. Su ley es que NO HAY DIAGONALES: todo es vertical
     u horizontal, las vueltas se redondean, y donde la letra necesitaría un
     trazo oblicuo se pone una ESCALERA. Alta, estrecha, simétrica, grosor
     parejo. Es lo más lejano que existe de una marca sencilla. */
  tensho: {
    nombre: 'Tensho 篆書',
    nota: 'Escritura de sello, dinastía Qin. Sin una sola diagonal: lo oblicuo se '
        + 'vuelve escalera y las vueltas se redondean. Alta, estrecha y simétrica, '
        + 'de grosor parejo. Es la lógica del hanko aplicada al alfabeto latino.',
    base: 'recto',
    glifos: {
      A: { an: 0.68, t: ['b6 b1 c0 d1 d6', 'b3.6 d3.6'] },
      B: { an: 0.66, t: ['b0 b6', 'b0 d0 d2.6 b2.6', 'b3.4 d3.4 d6 b6'] },
      C: { an: 0.62, t: ['d0 b0 b6 d6'] },
      D: { an: 0.66, t: ['b0 b6', 'b0 d0 d6 b6'] },
      E: { an: 0.60, t: ['b0 b6', 'b0 d0', 'b3 c3', 'b6 d6'] },
      F: { an: 0.58, t: ['b0 b6', 'b0 d0', 'b3 c3'] },
      G: { an: 0.66, t: ['d0 b0 b6 d6 d3.4', 'd3.4 c3.4'] },
      H: { an: 0.66, t: ['b0 b6', 'd0 d6', 'b3 d3'] },
      I: { an: 0.20, t: ['c0 c6'] },
      J: { an: 0.52, t: ['d0 d5 c6 b5'] },
      K: { an: 0.64, t: ['!b0 b6', '!d0 d2 b2', '!b4 d4 d6'] },
      L: { an: 0.56, t: ['b0 b6 d6'] },
      M: { an: 0.84, t: ['a6 a0 e0 e6', 'c0 c3.6'] },
      N: { an: 0.70, t: ['b0 b6', 'd0 d6', '!b1 c1 c5 d5'] },
      O: { an: 0.70, t: ['b0 d0 d6 b6 b0'] },
      P: { an: 0.60, t: ['b0 b6', 'b0 d0 d3 b3'] },
      Q: { an: 0.70, t: ['b0 d0 d6 b6 b0', 'c6 c7.4'] },
      R: { an: 0.66, t: ['b0 b6', 'b0 d0 d3 b3', '!c3 c4 d4 d6'] },
      S: { an: 0.62, t: ['d0 b0 b3 d3 d6 b6'] },
      T: { an: 0.62, t: ['a0 e0', 'c0 c6'] },
      U: { an: 0.66, t: ['b0 b6 d6 d0'] },
      V: { an: 0.72, t: ['!a0 a3 b3 b6 d6 d3 e3 e0'] },
      W: { an: 1.00, t: ['!a0 a4 b4 b6 c6 c2 d2 d4 e4 e0'] },
      X: { an: 0.78, t: ['!a0 b0 b2.6 c2.6', '!c3.4 d3.4 d6 e6',
        '!e0 d0 d2.6 c2.6', '!c3.4 b3.4 b6 a6'] },
      Y: { an: 0.70, t: ['!a0 a2 c2 c6', '!e0 e2 c2'] },
      // Con un solo escalón la Z salía un 工 chino: el tramo central quedaba
      // vertical y larguísimo. Con tres escalones la escalera se lee como Z.
      Z: { an: 0.72, t: ['a0 e0', '!e0 e1 d1 d2.6 c2.6 c4 b4 b5.4 a5.4 a6', 'a6 e6'] },
    },
    porDefecto: { pincel: 'uniforme', grosor: 0.085, tracking: 0.15, filo: 90 },
  },

  /* ── 勘亭流 KANTEIRYŪ · el cartel de kabuki ───────────────────────────
     Escritura inventada en el Edo para los carteles de kabuki y de rakugo. La
     idea no es estética: los trazos son gordos y se curvan HACIA ADENTRO para
     que no quede hueco en el cartel, porque el hueco significaba butaca vacía.
     Termina en ángulo recto, nunca en punta. Pesa, ocupa y aguanta de lejos. */
  kanteiryu: {
    nombre: 'Kanteiryū 勘亭流',
    nota: 'Cartel de kabuki del Edo. Trazo gordo que se curva hacia adentro y '
        + 'termina en ángulo recto: se diseñó para no dejar hueco en el papel, '
        + 'porque el hueco significaba butaca vacía. Se lee a media calle.',
    base: 'recto',
    glifos: {
      A: { an: 0.82, t: ['a6 l3 c0', 'c0 m3 e6', 'b4.5 d4.5'], nudos: ['c0'] },
      B: { an: 0.78, t: ['b0 l3 b6', 'b0 d0 e1 d2.8 b2.8', 'b2.8 d2.8 e4.4 d6 b6'],
        nudos: ['b0', 'b2.8', 'b6'] },
      C: { an: 0.78, t: ['e1 d0 b0 a2 a4 b6 d6 e5'] },
      D: { an: 0.80, t: ['b0 l3 b6', 'b0 d0 e2 e4 d6 b6'], nudos: ['b0', 'b6'] },
      E: { an: 0.74, t: ['b0 l3 b6', 'b0 e0', 'b3 d3', 'b6 e6'], nudos: ['b0', 'b3', 'b6'] },
      F: { an: 0.70, t: ['b0 l3 b6', 'b0 e0', 'b3 d3'], nudos: ['b0', 'b3'] },
      G: { an: 0.84, t: ['e1 d0 b0 a2 a4 b6 d6 e5 e3.4', 'e3.4 c3.4'], nudos: ['e3.4'] },
      H: { an: 0.80, t: ['b0 l3 b6', 'd0 m3 d6', 'b3 d3'], nudos: ['b3', 'd3'] },
      I: { an: 0.28, t: ['c0 c6'] },
      J: { an: 0.62, t: ['d0 d4 b6 a4.6'] },
      K: { an: 0.78, t: ['b0 l3 b6', 'e0 b3', 'b3 e6'], nudos: ['b3'] },
      L: { an: 0.70, t: ['b0 l3 b6', 'b6 e6'], nudos: ['b6'] },
      M: { an: 0.98, t: ['a6 k3 a0', 'a0 c4', 'c4 e0', 'e0 n3 e6'],
        nudos: ['a0', 'c4', 'e0'] },
      N: { an: 0.82, t: ['a6 k3 a0', 'a0 e6', 'e6 n3 e0'], nudos: ['a0', 'e6'] },
      O: { an: 0.86, t: ['b0 d0 e1 e5 d6 b6 a5 a1 b0'] },
      P: { an: 0.74, t: ['b0 l3 b6', 'b0 d0 e1 d3 b3'], nudos: ['b0', 'b3'] },
      Q: { an: 0.86, t: ['b0 d0 e1 e5 d6 b6 a5 a1 b0', 'c4.6 e6.4'] },
      R: { an: 0.80, t: ['b0 l3 b6', 'b0 d0 e1 d3 b3', 'b3 e6'], nudos: ['b0', 'b3'] },
      S: { an: 0.74, t: ['e1 c0 a1.4 c3 e4.6 c6 a5'] },
      T: { an: 0.76, t: ['a0 e0', 'c0 c6'], nudos: ['c0'] },
      U: { an: 0.80, t: ['a0 k3.5 a4 c6 e4 n3.5 e0'] },
      V: { an: 0.80, t: ['a0 l3 c6', 'c6 m3 e0'], nudos: ['c6'] },
      W: { an: 1.02, t: ['a0 b6', 'b6 c2', 'c2 d6', 'd6 e0'], nudos: ['b6', 'c2', 'd6'] },
      X: { an: 0.80, t: ['a0 b3 e6', 'e0 d3 a6'] },
      Y: { an: 0.80, t: ['a0 c3', 'e0 c3', 'c3 c6'], nudos: ['c3'] },
      Z: { an: 0.74, t: ['a0 e0', 'e0 c3.4 a6', 'a6 e6'], nudos: ['e0', 'a6'] },
    },
    porDefecto: {
      pincel: 'uniforme', grosor: 0.30, tracking: 0.015, remate: 'escuadra', filo: 90,
    },
  },

  /* ── 草書 SŌSHO · cursiva de aliento ──────────────────────────────────
     La quinta escritura: la que se escribe de corrido, donde el trazo no se
     levanta y la forma se abrevia hasta quedar en el gesto. Aquí cada letra es
     UN solo movimiento cuando se puede — la Z entera es un trazo. Va con harai
     o con látigo, porque lo que la define es la velocidad. */
  sosho: {
    nombre: 'Sōsho 草書',
    nota: 'La cursiva clásica, la que se escribe sin levantar el pincel. Cada letra '
        + 'es un solo movimiento donde se puede: la Z entera es un trazo. Lo que la '
        + 'define no es la forma, es la velocidad.',
    base: 'recto',
    glifos: {
      A: { an: 0.76, t: ['a6 c0 e6 c4.4 a4.6'] },
      B: { an: 0.70, t: ['a6 a0 c0 d1.4 c3 a3.2 c3.4 d4.6 c6 a6'] },
      C: { an: 0.70, t: ['e1 c0 a2 a4.4 c6 e5'] },
      D: { an: 0.74, t: ['a6 a0 c0.4 e2 e4 c6 a5.6'] },
      E: { an: 0.66, t: ['e0.6 b0 a1.4 a3 c3 a3.4 a5 b6 e5.6'] },
      F: { an: 0.60, t: ['e0.6 b0 a1.4 a6', 'a3 c3'] },
      G: { an: 0.76, t: ['e1 c0 a2 a4.4 c6 e4.8 e3.2 c3.4'] },
      H: { an: 0.74, t: ['a0 a6 a3.2 e2.8 e0 e6'] },
      I: { an: 0.20, t: ['c0 c6'] },
      J: { an: 0.54, t: ['d0 d4.6 c6 a5'] },
      K: { an: 0.70, t: ['a0 a6 a3.4 e0.4', 'a3.2 e6'] },
      L: { an: 0.60, t: ['a0 a5.6 c6 e5.2'] },
      M: { an: 0.92, t: ['a6 a1 b0 c4 d0 e1 e6'] },
      N: { an: 0.76, t: ['a6 a0 e6 e0'] },
      O: { an: 0.76, t: ['c0 e2 e4 c6 a4 a2 c0'] },
      P: { an: 0.66, t: ['a6 a0 c0 d1.4 c3.2 a3.4'] },
      Q: { an: 0.76, t: ['c0 e2 e4 c6 a4 a2 c0', 'c4.4 e6.6'] },
      R: { an: 0.72, t: ['a6 a0 c0 d1.4 c3.2 a3.4 e6'] },
      S: { an: 0.64, t: ['e1 c0 a1.2 c3 e4.6 c6 a5'] },
      T: { an: 0.64, t: ['a0.4 e0', 'c0 c6'] },
      U: { an: 0.74, t: ['a0 a4.4 c6 e4.4 e0 e6'] },
      V: { an: 0.72, t: ['a0 c6 e0'] },
      W: { an: 0.94, t: ['a0 b6 c1.6 d6 e0'] },
      X: { an: 0.70, t: ['a0 e6', 'e0 a6'] },
      Y: { an: 0.70, t: ['a0 c3.4 c6', 'e0 c3.4'] },
      Z: { an: 0.70, t: ['a0 e0 a6 e6'] },
    },
    porDefecto: { pincel: 'harai', grosor: 0.22, inclinacion: 10, tracking: 0.03 },
  },

  /* ── TEXTURA QUADRATA · la gótica del siglo XIII ──────────────────────
     "Textura" viene de *texere*, tejer: la página de astas parejas y apretadas
     forma una trama, un tejido. "Quadrata" viene de los REMATES EN DIAMANTE
     arriba y abajo de cada asta. Para el XIII la curva ya había desaparecido:
     sólo quedan cambios de dirección abruptos, y por eso aquí casi todo trazo
     va con "!". Pluma de filo ancho a −40°, estrechísima, negrísima. */
  textura: {
    nombre: 'Textura Quadrata',
    nota: 'La gótica del siglo XIII. El nombre viene de texere, tejer: las astas '
        + 'parejas y apretadas hacen una trama en la página. "Quadrata" es por los '
        + 'remates en diamante. Para entonces la curva ya no existía — sólo quiebres.',
    base: 'recto',
    // La Textura es negra y apretada: el hueco de la letra mide casi lo mismo
    // que el asta. Con grosor de tipografía normal se ve gótica desganada.
    escalaAncho: 0.74,
    glifos: {
      A: { an: 0.74, t: ['!a6 c0', '!c0 e6', '!b4 d4'], nudos: ['c0'] },
      B: { an: 0.66, t: ['!a0 a6', '!a0 c0 d0.6 d2.4 c3 a3', '!a3 c3 d3.6 d5.4 c6 a6'],
        nudos: ['a0', 'a3', 'a6'] },
      C: { an: 0.66, t: ['!e0.8 d0 b0 a1.6 a4.4 b6 d6 e5.2'] },
      D: { an: 0.70, t: ['!a0 a6', '!a0 c0 e1.6 e4.4 c6 a6'], nudos: ['a0', 'a6'] },
      E: { an: 0.62, t: ['!a0 a6', '!a0 e0', '!a3 c3', '!a6 e6'], nudos: ['a0', 'a3', 'a6'] },
      F: { an: 0.58, t: ['!a0 a6', '!a0 e0', '!a3 c3'], nudos: ['a0', 'a3'] },
      G: { an: 0.72, t: ['!e0.8 d0 b0 a1.6 a4.4 b6 d6 e5 e3', '!e3 c3'], nudos: ['e3'] },
      H: { an: 0.70, t: ['!a0 a6', '!e0 e6', '!a3 e3'], nudos: ['a3', 'e3'] },
      I: { an: 0.26, t: ['!c0 c6'] },
      J: { an: 0.50, t: ['!d0 d4.6 c6 a5'] },
      K: { an: 0.66, t: ['!a0 a6', '!e0 a3', '!a3 e6'], nudos: ['a3'] },
      L: { an: 0.56, t: ['!a0 a6', '!a6 e6'], nudos: ['a6'] },
      M: { an: 0.92, t: ['!a6 a0', '!a0 c4', '!c4 e0', '!e0 e6'], nudos: ['a0', 'c4', 'e0'] },
      N: { an: 0.72, t: ['!a6 a0', '!a0 e6', '!e6 e0'], nudos: ['a0', 'e6'] },
      O: { an: 0.72, t: ['!b0 d0 e1.6 e4.4 d6 b6 a4.4 a1.6 b0'] },
      P: { an: 0.62, t: ['!a0 a6', '!a0 c0 d0.6 d2.4 c3 a3'], nudos: ['a0', 'a3'] },
      Q: { an: 0.72, t: ['!b0 d0 e1.6 e4.4 d6 b6 a4.4 a1.6 b0', '!c4.6 e6.4'] },
      R: { an: 0.66, t: ['!a0 a6', '!a0 c0 d0.6 d2.4 c3 a3', '!a3 e6'], nudos: ['a0', 'a3'] },
      S: { an: 0.60, t: ['!e0.8 d0 b0 a1.2 b2.4 d3.6 e4.8 d6 b6 a5.2'] },
      T: { an: 0.62, t: ['!a0 e0', '!c0 c6'], nudos: ['c0'] },
      U: { an: 0.70, t: ['!a0 a4.4 b6 d6 e4.4 e0'] },
      V: { an: 0.70, t: ['!a0 c6', '!c6 e0'], nudos: ['c6'] },
      W: { an: 0.94, t: ['!a0 b6', '!b6 c2', '!c2 d6', '!d6 e0'], nudos: ['b6', 'c2', 'd6'] },
      X: { an: 0.68, t: ['!a0 e6', '!e0 a6'] },
      Y: { an: 0.68, t: ['!a0 c3', '!e0 c3', '!c3 c6'], nudos: ['c3'] },
      Z: { an: 0.64, t: ['!a0 e0', '!e0 a6', '!a6 e6'], nudos: ['e0', 'a6'] },

      // Aquí vive de verdad la Textura: la minúscula. Todas comparten el mismo
      // asta y el mismo hombro quebrado, y de esa repetición sale el tejido.
      a: { an: 0.58, t: ['!b2 e2', '!e2 e6', '!a3.4 b2', '!a4.6 a6 c6 e5.2'] },
      b: { an: 0.62, t: ['!a0 a6', '!a3 b2 d2 e3 e5 d6 b6 a5'], nudos: ['a3', 'a5'] },
      c: { an: 0.52, t: ['!e2.8 d2 b2 a3 a5 b6 d6 e5.2'] },
      d: { an: 0.62, t: ['!e0 e6', '!e3 d2 b2 a3 a5 b6 d6 e5'], nudos: ['e3', 'e5'] },
      e: { an: 0.56, t: ['!e5 d6 b6 a5 a3 b2 d2 e3', '!a4 e4'] },
      f: { an: 0.42, t: ['!c1 c6', '!a2.6 e2.6'], nudos: ['c2.6'] },
      g: { an: 0.60, t: ['!e2.6 d2 b2 a3 a5 b6 d6 e5',
        '!e2.6 e6.6 d7.6 b7.6 a7'] },
      h: { an: 0.62, t: ['!a0 a6', '!a3 b2 d2 e3', '!e3 e6'], nudos: ['a3', 'e3'] },
      // El punto de la i en Textura no es un punto: es una rayita al ángulo de la
      // pluma. Un disco a este grosor sale del tamaño de una canica.
      i: { an: 0.26, t: ['!c2 c6', '!b0.4 d1'] },
      j: { an: 0.32, t: ['!c2 c6.6 b7.6 a7', '!b0.4 d1'] },
      k: { an: 0.58, t: ['!a0 a6', '!e2 a4', '!a4 d6'], nudos: ['a4'] },
      l: { an: 0.26, t: ['!c0 c6'] },
      m: { an: 0.94, t: ['!a2 a6', '!a3 b2 c2.6 c3', '!c3 c6', '!c3 d2 e2.6 e3', '!e3 e6'],
        nudos: ['a3', 'c3', 'e3'] },
      n: { an: 0.62, t: ['!a2 a6', '!a3 b2 d2 e3', '!e3 e6'], nudos: ['a3', 'e3'] },
      o: { an: 0.60, t: ['!b2 d2 e3 e5 d6 b6 a5 a3 b2'] },
      p: { an: 0.62, t: ['!a2 a8', '!a3 b2 d2 e3 e5 d6 b6 a5'], nudos: ['a3', 'a5'] },
      q: { an: 0.62, t: ['!e2 e8', '!e3 d2 b2 a3 a5 b6 d6 e5'], nudos: ['e3', 'e5'] },
      r: { an: 0.46, t: ['!a2 a6', '!a3 b2 d2 d2.8'], nudos: ['a3'] },
      s: { an: 0.50, t: ['!e2.6 d2 b2 a2.8 b3.6 d4.4 e5.2 d6 b6 a5.4'] },
      t: { an: 0.42, t: ['!c1 c5.4 d6', '!a2.6 e2.6'], nudos: ['c2.6'] },
      u: { an: 0.62, t: ['!a2 a5 b6 d6 e5', '!e2 e6'], nudos: ['e5'] },
      v: { an: 0.58, t: ['!a2 a5 b6 d6 e5 e2'] },
      w: { an: 0.86, t: ['!a2 a5 b6 c5 c2', '!c2.6 c5 d6 e5 e2'] },
      x: { an: 0.56, t: ['!a2 e6', '!e2 a6'] },
      y: { an: 0.58, t: ['!a2 a5 b6 d6 e5 e2', '!e2 e6.6 d7.6 b7.6 a7'] },
      z: { an: 0.54, t: ['!a2 e2', '!e2 a6', '!a6 e6'], nudos: ['e2', 'a6'] },
    },
    porDefecto: {
      pincel: 'plumilla', grosor: 0.26, filo: -40, contraste: 0.38,
      tracking: 0.008, remate: 'diamante',
    },
  },

  /* ── ROTUNDA · la gótica del sur ──────────────────────────────────────
     La otra rama: menos comprimida, los cuencos vuelven a ser redondos y los
     bordes se suavizan. Hereda de la Textura y sólo devuelve la curva donde la
     Textura la había quebrado — que es exactamente la diferencia histórica
     entre las dos. Remate de bola en vez de diamante, filo más plano. */
  rotunda: {
    nombre: 'Rotunda',
    nota: 'La gótica del sur de Europa: la misma familia que la Textura pero con el '
        + 'cuenco redondo otra vez y menos comprimida. Aquí sólo se devuelve la curva '
        + 'donde la Textura la había quebrado: esa es la diferencia, literalmente.',
    base: 'textura',
    escalaAncho: 0.96,
    glifos: {
      C: { an: 0.72, t: ['e1 c0 a2 a4 c6 e5'] },
      D: { an: 0.76, t: ['!a0 a6', 'a0 c0 e2 e4 c6 a6'], nudos: ['a0', 'a6'] },
      G: { an: 0.78, t: ['e1 c0 a2 a4 c6 e5 e3', '!e3 c3'], nudos: ['e3'] },
      O: { an: 0.78, t: ['c0 e2 e4 c6 a4 a2 c0'] },
      Q: { an: 0.78, t: ['c0 e2 e4 c6 a4 a2 c0', 'c4.6 e6.4'] },
      S: { an: 0.64, t: ['e1 c0 a1.2 c3 e4.4 e5 c6 a5'] },
      U: { an: 0.74, t: ['a0 a4 c6 e4 e0'] },
      B: { an: 0.70, t: ['!a0 a6', 'a0 d0 d1 c3 a3', 'a3 d3 d5 c6 a6'],
        nudos: ['a0', 'a3', 'a6'] },
      P: { an: 0.66, t: ['!a0 a6', 'a0 d0 d2 c3 a3'], nudos: ['a0', 'a3'] },
      R: { an: 0.70, t: ['!a0 a6', 'a0 d0 d2 c3 a3', '!a3 e6'], nudos: ['a0', 'a3'] },
      a: { an: 0.62, t: ['a3 c2 e3 e6', 'e5 c6 a5 a4 c3 e4'], nudos: ['e3'] },
      b: { an: 0.66, t: ['!a0 a6', 'a3 c2 e3 e5 c6 a5'], nudos: ['a3', 'a5'] },
      c: { an: 0.56, t: ['e3 c2 a3 a5 c6 e5'] },
      d: { an: 0.66, t: ['!e0 e6', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3', 'e5'] },
      e: { an: 0.60, t: ['a4 e4 e3 c2 a3 a5 c6 e5'] },
      g: { an: 0.64, t: ['e3 c2 a3 a5 c6 e5', 'e2.6 e6.6 c7.8 a7'] },
      o: { an: 0.64, t: ['c2 e3 e5 c6 a5 a3 c2'] },
      p: { an: 0.66, t: ['!a2 a8', 'a3 c2 e3 e5 c6 a5'], nudos: ['a3', 'a5'] },
      q: { an: 0.66, t: ['!e2 e8', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3', 'e5'] },
      s: { an: 0.54, t: ['e3 c2 a3 c4 e5 c6 a5'] },
      u: { an: 0.64, t: ['!a2 a5 c6 e5', '!e2 e6'], nudos: ['e5'] },
      m: { an: 0.96, t: ['!a2 a6', 'a3 b2 c3 c6', 'c3 d2 e3 e6'], nudos: ['a3', 'c3'] },
      n: { an: 0.64, t: ['!a2 a6', 'a3 c2 e3 e6'], nudos: ['a3'] },
      h: { an: 0.64, t: ['!a0 a6', 'a3 c2 e3 e6'], nudos: ['a3'] },
      r: { an: 0.46, t: ['!a2 a6', 'a3 c2 e2'], nudos: ['a3'] },
    },
    porDefecto: {
      pincel: 'plumilla', grosor: 0.22, filo: -25, contraste: 0.40,
      tracking: 0.035, remate: 'bola',
    },
  },

  /* ── UNCIAL · la mayúscula del manuscrito ─────────────────────────────
     Antes de la gótica: la letra ancha y redonda de los códices, sin diferencia
     entre caja alta y baja porque no la había. Poco contraste, remate de cuña.
     Es lo contrario de la Textura: donde una aprieta, la otra abre. */
  uncial: {
    nombre: 'Uncial',
    nota: 'La letra de los códices, anterior a la gótica: ancha, redonda y sin '
        + 'distinción entre mayúscula y minúscula porque todavía no existía. Poco '
        + 'contraste y remate de cuña. Es el opuesto exacto de la Textura.',
    base: 'recto',
    escalaAncho: 1.06,
    glifos: {
      // La uncial tiene dos formas de A. La de cuenco —un "ɑ" con asta— sale
      // idéntica a la D: en la prueba "MAZI" se leyó "mdZI". Así que va la otra,
      // la de arco redondeado con travesaño, que se lee A y sigue siendo uncial.
      A: { an: 0.82, t: ['a6 a4 b1 c0 d1.6 e4 e6', 'b4.4 d4.4'] },
      B: { an: 0.74, t: ['a0 a6', 'a0 c0 d1.4 c2.8 a2.8', 'a2.8 c2.8 d4.4 c6 a6'],
        nudos: ['a0', 'a2.8', 'a6'] },
      C: { an: 0.78, t: ['e1 c0 a2 a4 c6 e5'] },
      D: { an: 0.80, t: ['e0.6 e6', 'e1.6 c0.6 a2.4 a4.6 c6 e5'], nudos: ['e1.6', 'e5'] },
      E: { an: 0.72, t: ['e1 c0 a2 a4 c6 e5', 'a3.4 c3.4'] },
      F: { an: 0.66, t: ['b0 b8', 'b0.6 d0 e1.4', 'a3 d3'], nudos: ['b3'] },
      G: { an: 0.76, t: ['e1.4 c0 a2 a4 c6 e5 e3.2', 'e3.2 c3.4'], nudos: ['e3.2'] },
      H: { an: 0.78, t: ['a0 a6', 'a3 c2.4 e3.4 e6'], nudos: ['a3'] },
      I: { an: 0.26, t: ['c0 c6'] },
      J: { an: 0.44, t: ['c0 c6.6 b7.8 a7'] },
      K: { an: 0.72, t: ['a0 a6', 'e2 a3.8', 'a3.8 e6'], nudos: ['a3.8'] },
      L: { an: 0.62, t: ['a0 a5.4 c6 e5.2'] },
      M: { an: 0.98, t: ['a6 a2 b0.8 c2.4 c6', 'c2.4 d0.8 e2 e6'], nudos: ['c2.4'] },
      N: { an: 0.80, t: ['a0 a6', 'a1 e5', 'e0 e6'], nudos: ['a1', 'e5'] },
      O: { an: 0.86, t: ['c0 e2 e4 c6 a4 a2 c0'] },
      P: { an: 0.70, t: ['b0 b8', 'b0 d0 e1.4 d2.8 b2.8'], nudos: ['b0', 'b2.8'] },
      Q: { an: 0.86, t: ['c0 e2 e4 c6 a4 a2 c0', 'c5.6 c8'] },
      R: { an: 0.76, t: ['a0 a6', 'a0 c0 d1.4 c2.8 a2.8', 'a2.8 e6'], nudos: ['a0', 'a2.8'] },
      S: { an: 0.68, t: ['e1 c0 a1.4 c3 e4.6 c6 a5'] },
      T: { an: 0.74, t: ['a0.8 c0 e0.8', 'c0 c6'], nudos: ['c0'] },
      U: { an: 0.82, t: ['a0 a4 c6 e4 e0'] },
      V: { an: 0.80, t: ['a0 a3 c6', 'c6 e3 e0'], nudos: ['c6'] },
      W: { an: 1.04, t: ['a0 a3 b6', 'b6 c2.6', 'c2.6 d6', 'd6 e3 e0'],
        nudos: ['b6', 'c2.6', 'd6'] },
      X: { an: 0.76, t: ['a0 c3 e6', 'e0 c3 a6'], nudos: ['c3'] },
      Y: { an: 0.78, t: ['a0 c3.2', 'e0 c3.2', 'c3.2 c6'], nudos: ['c3.2'] },
      Z: { an: 0.70, t: ['a0.6 c0 e0.6', 'e0.6 a5.4', 'a5.4 c6 e5.4'], nudos: ['e0.6', 'a5.4'] },
    },
    porDefecto: {
      pincel: 'plumilla', grosor: 0.19, filo: -22, contraste: 0.52,
      tracking: 0.07, remate: 'pua',
    },
  },
  /* ═══════════════════════════════════════════════════════════════════════
     LAS TRES TECNOLÓGICAS

     Lo que la investigación dejó claro y vale copiar:

     · EUROSTILE — la forma clave no es el cuadrado ni el círculo: es la
       SUPERELIPSE. Lado recto, esquina curva. Y ligeramente extendida. Esa es
       *la* letra tecnológica, y de ahí sale casi todo lo demás.
     · BANK GOTHIC — geometría escuadrada y arquitectónica. Comunica fuerza y
       autoridad. Nació sin minúscula, para rótulo.
     · DIN — geometría simplificada que viene de la NORMALIZACIÓN INDUSTRIAL,
       no del gusto de nadie. De ahí la sensación de instrumento.
     · Rótulo deportivo y de esports — condensada, esquina biselada, corte
       sesgado, corte de estencil, contraforma estrecha.
     · Y el dato que decide: la "sans-ificación" de 2024-25 dejó a las marcas
       tecnológicas con la MISMA cara. Limpias e indistinguibles. Así que la
       profesional tiene que ser limpia y guardarse un movimiento propio, o no
       es nada. Aquí ese movimiento es la superelipse llevada a todo el juego.
     ═══════════════════════════════════════════════════════════════════════ */

  /* ── 1 · CERCANA · la familiar ────────────────────────────────────────
     Lo que hace que una letra se sienta cercana no es que sea "bonita": son
     tres cosas medibles. Punta REDONDA (el disco mide justo el trazo). Apertura
     ABIERTA — la C y la S no se cierran sobre sí mismas, y eso quita la
     sensación de instrumento. Y contraforma GENEROSA con travesaño bajo, que
     baja el aire de autoridad. Nada más. La estructura es geométrica igual. */
  cercana: {
    nombre: 'Cercana',
    nota: 'La familiar. Punta redonda, apertura abierta y contraforma generosa: las '
        + 'tres cosas que hacen que una letra se sienta amable, sin dejar de ser '
        + 'geométrica. Es la que se puede poner en un mensaje de WhatsApp a un cliente.',
    base: 'recto',
    glifos: {
      A: { an: 0.78, t: ['a6 c0', 'c0 e6', 'b4.2 d4.2'], nudos: ['c0'] },
      B: { an: 0.70, t: ['a0 a6', 'a0 c0 e1.4 c2.9 a2.9', 'a2.9 c2.9 e4.5 c6 a6'],
        nudos: ['a0', 'a2.9', 'a6'] },
      C: { an: 0.76, t: ['e1.3 c0 a2 a4 c6 e4.7'] },
      D: { an: 0.76, t: ['a0 a6', 'a0 c0 e2 e4 c6 a6'], nudos: ['a0', 'a6'] },
      E: { an: 0.66, t: ['a0 a6', 'a0 e0', 'a3 d3', 'a6 e6'], nudos: ['a0', 'a3', 'a6'] },
      F: { an: 0.62, t: ['a0 a6', 'a0 e0', 'a3 d3'], nudos: ['a0', 'a3'] },
      G: { an: 0.80, t: ['e1.3 c0 a2 a4 c6 e4.8 e3.2', 'e3.2 b3.2'], nudos: ['e3.2'] },
      H: { an: 0.76, t: ['a0 a6', 'e0 e6', 'a3 e3'], nudos: ['a3', 'e3'] },
      I: { an: 0.22, t: ['c0 c6'] },
      J: { an: 0.56, t: ['d0 d4.2 c6 a4.8'] },
      K: { an: 0.70, t: ['a0 a6', 'e0 a3.3', 'a3.3 e6'], nudos: ['a3.3'] },
      L: { an: 0.60, t: ['a0 a6', 'a6 e6'], nudos: ['a6'] },
      M: { an: 0.92, t: ['a6 a0', 'a0 c4', 'c4 e0', 'e0 e6'], nudos: ['a0', 'c4', 'e0'] },
      N: { an: 0.78, t: ['a6 a0', 'a0 e6', 'e6 e0'], nudos: ['a0', 'e6'] },
      O: { an: 0.82, t: ['c0 e2 e4 c6 a4 a2 c0'] },
      P: { an: 0.68, t: ['a0 a6', 'a0 c0 e1.4 c2.9 a2.9'], nudos: ['a0', 'a2.9'] },
      Q: { an: 0.82, t: ['c0 e2 e4 c6 a4 a2 c0', 'c4.8 e6.4'] },
      R: { an: 0.72, t: ['a0 a6', 'a0 c0 e1.4 c2.9 a2.9', 'b2.9 e6'], nudos: ['a0', 'a2.9'] },
      S: { an: 0.68, t: ['e1.2 c0 a1.3 a2.2 c3.2 e4.2 e5 c6 a4.9'] },
      T: { an: 0.68, t: ['a0 e0', 'c0 c6'], nudos: ['c0'] },
      U: { an: 0.78, t: ['a0 a4 c6 e4 e0'] },
      V: { an: 0.78, t: ['a0 c6', 'c6 e0'], nudos: ['c6'] },
      W: { an: 1.02, t: ['a0 b6', 'b6 c2.2', 'c2.2 d6', 'd6 e0'], nudos: ['b6', 'c2.2', 'd6'] },
      X: { an: 0.74, t: ['a0 e6', 'e0 a6'] },
      Y: { an: 0.74, t: ['a0 c3.2', 'e0 c3.2', 'c3.2 c6'], nudos: ['c3.2'] },
      Z: { an: 0.70, t: ['a0 e0', 'e0 a6', 'a6 e6'], nudos: ['e0', 'a6'] },

      // La minúscula de una sola planta —la "a" que es un círculo con un asta
      // que no sube— es la más amable que existe. Es la que usan las marcas que
      // quieren que no les tengas miedo.
      a: { an: 0.64, t: ['e2 e6', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3', 'e5'] },
      b: { an: 0.66, t: ['a0 a6', 'a3 c2 e3 e5 c6 a5'], nudos: ['a3', 'a5'] },
      c: { an: 0.60, t: ['e2.8 c2 a3 a5 c6 e5.2'] },
      d: { an: 0.66, t: ['e0 e6', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3', 'e5'] },
      e: { an: 0.62, t: ['a4.1 e4.1 e3 c2 a3 a5 c6 e5.2'] },
      f: { an: 0.46, t: ['d0.8 c1.6 c6', 'a2.2 e2.2'], nudos: ['c2.2'] },
      g: { an: 0.66, t: ['e2.8 c2 a3 a5 c6 e5.2', 'e2.8 e6.8 c8 a7.2'] },
      h: { an: 0.64, t: ['a0 a6', 'a3 c2 e3 e6'], nudos: ['a3'] },
      i: { an: 0.22, t: ['c2 c6', 'c0.6 c0.6'] },
      j: { an: 0.34, t: ['c2 c6.8 b8 a7.2', 'c0.6 c0.6'] },
      k: { an: 0.62, t: ['a0 a6', 'e2 a4.2', 'a4.2 e6'], nudos: ['a4.2'] },
      l: { an: 0.24, t: ['c0 c6'] },
      m: { an: 0.98, t: ['a2 a6', 'a3 b2 c3 c6', 'c3 d2 e3 e6'], nudos: ['a3', 'c3'] },
      n: { an: 0.64, t: ['a2 a6', 'a3 c2 e3 e6'], nudos: ['a3'] },
      o: { an: 0.66, t: ['c2 e3 e5 c6 a5 a3 c2'] },
      p: { an: 0.66, t: ['a2 a8', 'a3 c2 e3 e5 c6 a5'], nudos: ['a3', 'a5'] },
      q: { an: 0.66, t: ['e2 e8', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3', 'e5'] },
      r: { an: 0.46, t: ['a2 a6', 'a3 c2 e2.4'], nudos: ['a3'] },
      s: { an: 0.56, t: ['e2.8 c2 a2.9 c4 e5.1 c6 a5.2'] },
      t: { an: 0.46, t: ['c0.6 c5.2 d6', 'a2.2 e2.2'], nudos: ['c2.2'] },
      u: { an: 0.64, t: ['a2 a5 c6 e5 e2', 'e5 e6'], nudos: ['e5'] },
      v: { an: 0.62, t: ['a2 c6', 'c6 e2'], nudos: ['c6'] },
      w: { an: 0.90, t: ['a2 b6', 'b6 c3.2', 'c3.2 d6', 'd6 e2'], nudos: ['b6', 'c3.2', 'd6'] },
      x: { an: 0.60, t: ['a2 e6', 'e2 a6'] },
      y: { an: 0.62, t: ['a2 c6', 'e2 c6 b8'], nudos: ['c6'] },
      z: { an: 0.58, t: ['a2 e2', 'e2 a6', 'a6 e6'], nudos: ['e2', 'a6'] },
    },
    porDefecto: {
      pincel: 'uniforme', grosor: 0.12, tracking: 0.075, remate: 'redondo',
    },
  },

  /* ── 2 · REACTOR · la tecnológica y agresiva ──────────────────────────
     Aquí van juntas las cuatro señales del rótulo deportivo, y cada una hace un
     trabajo distinto: BISEL (la esquina de 90° cortada a 45°, que quita lo
     blando), CONDENSADA (contraforma estrecha, que da velocidad), CORTE SESGADO
     en las puntas libres (que da dirección) y CORTE DE ESTENCIL (el puente, que
     da lo militar). Con una sola de las cuatro no pasa nada; juntas cambian la
     letra de gremio. */
  reactor: {
    nombre: 'Reactor',
    nota: 'La tecnológica y agresiva. Esquina biselada, condensada, punta cortada en '
        + 'diagonal y cortes de estencil. Las cuatro señales del rótulo deportivo, y '
        + 'ninguna es adorno: bisel quita lo blando, condensar da velocidad, el sesgo '
        + 'da dirección y el estencil da lo militar.',
    base: 'recto',
    escalaAncho: 0.84,
    glifos: {
      A: { an: 0.78, t: ['!a6 b1.2 c0 d1.2 e6', '!b4.2 d4.2'] },
      B: { an: 0.72, t: ['!a0 a6', '!a0 c0 d0.5 d2.4 c2.9 a2.9',
        '!a2.9 c2.9 d3.4 d5.5 c6 a6'], nudos: ['a0', 'a2.9', 'a6'] },
      C: { an: 0.74, t: ['!e0.6 d0 b0 a1 a5 b6 d6 e5.4'] },
      D: { an: 0.76, t: ['!a0 a6', '!a0 c0 e1.4 e4.6 c6 a6'], nudos: ['a0', 'a6'] },
      E: { an: 0.66, t: ['!a0 a6', '!a0 e0', '!a3 c3', '!a6 e6'], nudos: ['a0', 'a3', 'a6'] },
      F: { an: 0.62, t: ['!a0 a6', '!a0 e0', '!a3 c3'], nudos: ['a0', 'a3'] },
      G: { an: 0.78, t: ['!e0.6 d0 b0 a1 a5 b6 d6 e5 e3', '!e3 b3'], nudos: ['e3'] },
      H: { an: 0.76, t: ['!a0 a6', '!e0 e6', '!a3 e3'], nudos: ['a3', 'e3'] },
      I: { an: 0.26, t: ['!c0 c6'] },
      J: { an: 0.56, t: ['!d0 d5 c6 b6 a5'] },
      K: { an: 0.72, t: ['!a0 a6', '!e0 a3.2', '!a3.2 e6'], nudos: ['a3.2'] },
      L: { an: 0.60, t: ['!a0 a6', '!a6 e6'], nudos: ['a6'] },
      M: { an: 0.96, t: ['!a6 a0', '!a0 c3.6', '!c3.6 e0', '!e0 e6'],
        nudos: ['a0', 'c3.6', 'e0'] },
      N: { an: 0.78, t: ['!a6 a0', '!a0 e6', '!e6 e0'], nudos: ['a0', 'e6'] },
      O: { an: 0.80, t: ['!b0 d0 e1 e5 d6 b6 a5 a1 b0'] },
      P: { an: 0.68, t: ['!a0 a6', '!a0 c0 d0.5 d2.4 c2.9 a2.9'], nudos: ['a0', 'a2.9'] },
      Q: { an: 0.80, t: ['!b0 d0 e1 e5 d6 b6 a5 a1 b0', '!c4.6 e6.4'] },
      R: { an: 0.74, t: ['!a0 a6', '!a0 c0 d0.5 d2.4 c2.9 a2.9', '!a2.9 e6'],
        nudos: ['a0'], cortes: ['a2.9'] },
      S: { an: 0.68, t: ['!e0.6 d0 b0 a1 a2 b2.9 d3.1 e4 e5 d6 b6 a5.4'] },
      T: { an: 0.68, t: ['!a0 e0', '!c0 c6'], nudos: ['c0'] },
      U: { an: 0.76, t: ['!a0 a5 b6 d6 e5 e0'] },
      V: { an: 0.76, t: ['!a0 b5 c6', '!c6 d5 e0'], nudos: ['c6'] },
      W: { an: 1.00, t: ['!a0 a4.6 b6', '!b6 c1.8', '!c1.8 d6', '!d6 e4.6 e0'],
        nudos: ['b6', 'c1.8', 'd6'] },
      X: { an: 0.72, t: ['!a0 e6', '!e0 a6'] },
      Y: { an: 0.72, t: ['!a0 c3.2', '!e0 c3.2', '!c3.2 c6'], nudos: ['c3.2'] },
      Z: { an: 0.68, t: ['!a0 e0', '!e0 a6', '!a6 e6'], nudos: ['e0', 'a6'] },
    },
    porDefecto: {
      pincel: 'uniforme', grosor: 0.21, tracking: 0.045, corte: 'sesgo', sesgo: 20,
      estencil: 1, inclinacion: 7,
    },
  },

  /* ── 3 · NORMA · la profesional ───────────────────────────────────────
     El nombre viene de DIN, que es el instituto alemán de NORMAS: esa letra no
     se diseñó para gustar, se diseñó para que un tornillo rotulado en Hamburgo
     se leyera igual en Veracruz.
     El movimiento propio —lo que la salva de ser otra sans indistinguible— es
     la SUPERELIPSE aplicada a TODO el juego, no sólo a la O: lado recto y
     esquina curva en cada letra redonda. Ancha, de peso parejo, apretada de
     espacio. Se ve como instrumento, no como cartel. */
  norma: {
    nombre: 'Norma',
    nota: 'La profesional. Toda la familia construida sobre la superelipse de Eurostile '
        + '—lado recto, esquina curva— más el ancho arquitectónico de Bank Gothic. El '
        + 'nombre viene del instituto alemán de normas: esa letra no se hizo para gustar, '
        + 'se hizo para leerse igual en todas partes.',
    base: 'recto',
    escalaAncho: 1.06,
    glifos: {
      A: { an: 0.82, t: ['a6 b1 c0 d1 e6', 'b4.3 d4.3'] },
      B: { an: 0.74, t: ['a0 a6', 'a0 c0 e1.2 e2 c2.9 a2.9', 'a2.9 c2.9 e4 e5 c6 a6'],
        nudos: ['a0', 'a2.9', 'a6'] },
      C: { an: 0.78, t: ['e1 d0 b0 a1.2 a4.8 b6 d6 e5'] },
      D: { an: 0.80, t: ['a0 a6', 'a0 c0 e1.2 e4.8 c6 a6'], nudos: ['a0', 'a6'] },
      E: { an: 0.68, t: ['a0 a6', 'a0 e0', 'a3 d3', 'a6 e6'], nudos: ['a0', 'a3', 'a6'] },
      F: { an: 0.64, t: ['a0 a6', 'a0 e0', 'a3 d3'], nudos: ['a0', 'a3'] },
      G: { an: 0.82, t: ['e1 d0 b0 a1.2 a4.8 b6 d6 e5 e3.2', 'e3.2 b3.2'], nudos: ['e3.2'] },
      H: { an: 0.80, t: ['a0 a6', 'e0 e6', 'a3 e3'], nudos: ['a3', 'e3'] },
      I: { an: 0.24, t: ['c0 c6'] },
      J: { an: 0.58, t: ['d0 d4.8 c6 a4.8'] },
      K: { an: 0.74, t: ['a0 a6', 'e0 a3.2', 'a3.2 e6'], nudos: ['a3.2'] },
      L: { an: 0.62, t: ['a0 a6', 'a6 e6'], nudos: ['a6'] },
      M: { an: 1.00, t: ['a6 a0', 'a0 c3.4', 'c3.4 e0', 'e0 e6'], nudos: ['a0', 'c3.4', 'e0'] },
      N: { an: 0.82, t: ['a6 a0', 'a0 e6', 'e6 e0'], nudos: ['a0', 'e6'] },
      O: { an: 0.86, t: ['b0 d0 e1.2 e4.8 d6 b6 a4.8 a1.2 b0'] },
      P: { an: 0.70, t: ['a0 a6', 'a0 c0 e1.2 e2 c2.9 a2.9'], nudos: ['a0', 'a2.9'] },
      Q: { an: 0.86, t: ['b0 d0 e1.2 e4.8 d6 b6 a4.8 a1.2 b0', 'c4.8 e6.3'] },
      R: { an: 0.76, t: ['a0 a6', 'a0 c0 e1.2 e2 c2.9 a2.9', 'a2.9 e6'], nudos: ['a0', 'a2.9'] },
      S: { an: 0.70, t: ['e1 d0 b0 a1.2 a2 b2.9 d3.1 e4 e4.8 d6 b6 a5'] },
      T: { an: 0.70, t: ['a0 e0', 'c0 c6'], nudos: ['c0'] },
      U: { an: 0.80, t: ['a0 a4.8 b6 d6 e4.8 e0'] },
      V: { an: 0.80, t: ['a0 c6', 'c6 e0'], nudos: ['c6'] },
      W: { an: 1.06, t: ['a0 b6', 'b6 c1.8', 'c1.8 d6', 'd6 e0'], nudos: ['b6', 'c1.8', 'd6'] },
      X: { an: 0.76, t: ['a0 e6', 'e0 a6'] },
      Y: { an: 0.76, t: ['a0 c3.2', 'e0 c3.2', 'c3.2 c6'], nudos: ['c3.2'] },
      Z: { an: 0.70, t: ['a0 e0', 'e0 a6', 'a6 e6'], nudos: ['e0', 'a6'] },

      // La minúscula redonda también va a superelipse: si la O es superelipse y
      // la o es un círculo, se nota, y se nota mal.
      a: { an: 0.68, t: ['a2.9 b2 d2 e3 e6', 'e5 d6 b6 a5 a4.1 b3.2 e4'], nudos: ['e3'] },
      b: { an: 0.70, t: ['a0 a6', 'a3 b2 d2 e3 e5 d6 b6 a5'], nudos: ['a3', 'a5'] },
      c: { an: 0.62, t: ['e2.8 d2 b2 a3 a5 b6 d6 e5.2'] },
      d: { an: 0.70, t: ['e0 e6', 'e3 d2 b2 a3 a5 b6 d6 e5'], nudos: ['e3', 'e5'] },
      e: { an: 0.64, t: ['a4.1 e4.1 e3 d2 b2 a3 a5 b6 d6 e5.2'] },
      g: { an: 0.68, t: ['e2.8 d2 b2 a3 a5 b6 d6 e5.2', 'e2.8 e6.8 d8 b8 a7.2'] },
      o: { an: 0.70, t: ['b2 d2 e3 e5 d6 b6 a5 a3 b2'] },
      p: { an: 0.70, t: ['a2 a8', 'a3 b2 d2 e3 e5 d6 b6 a5'], nudos: ['a3', 'a5'] },
      q: { an: 0.70, t: ['e2 e8', 'e3 d2 b2 a3 a5 b6 d6 e5'], nudos: ['e3', 'e5'] },
      s: { an: 0.58, t: ['e2.8 d2 b2 a2.8 b3.6 d4.4 e5.2 d6 b6 a5.4'] },
      u: { an: 0.68, t: ['a2 a5 b6 d6 e5 e2', 'e5 e6'], nudos: ['e5'] },
      n: { an: 0.68, t: ['a2 a6', 'a3 b2 d2 e3 e6'], nudos: ['a3'] },
      m: { an: 1.02, t: ['a2 a6', 'a3 b2 c2.6 c3', 'c3 c6', 'c3 d2 e2.6 e3', 'e3 e6'],
        nudos: ['a3', 'c3', 'e3'] },
      h: { an: 0.68, t: ['a0 a6', 'a3 b2 d2 e3 e6'], nudos: ['a3'] },
      r: { an: 0.48, t: ['a2 a6', 'a3 b2 d2 e2.6'], nudos: ['a3'] },
    },
    porDefecto: {
      pincel: 'uniforme', grosor: 0.15, tracking: 0.035,
    },
  },

  /* ── MAZI · la combinación ────────────────────────────────────────────
     Carlos eligió como base "la que parece reloj", que es Norma: la superelipse
     de tablero de instrumento. Sobre ese esqueleto entran las otras dos, y cada
     una entra por UNA puerta, no por todas — combinar es elegir qué se toma de
     cada quien, no promediar tres cosas hasta que no quede ninguna.

       de NORMA  ── el esqueleto entero: superelipse en cada letra redonda,
                    peso parejo, ritmo idéntico. Es la base y se nota.
       de REACTOR ── el bisel, pero mudado de la esquina de la letra a la PUNTA
                    del trazo: el ochavo. Da lo maquinado sin condensar ni
                    inclinar, que era lo que rompía la letra de reloj.
       de CERCANA ── la apertura abierta en C, G, S y su minúscula. Es lo único
                    que le baja lo frío a un instrumento sin volverlo blando.

     Y dos ajustes que salen de la mezcla, no de ninguna de las tres: el ancho
     baja de 106% a 100% —lo justo para que quepa en un favicon cuadrado— y el
     grosor sube de 0.15 a 0.175, que es el peso mínimo para aguantar 24 px con
     el ochavo comiéndose las esquinas. */
  mazi: {
    nombre: 'Mazi',
    nota: 'La de la casa. Esqueleto de Norma —la superelipse de tablero—, el bisel de '
        + 'Reactor mudado a la punta del trazo, y la apertura abierta de Cercana. '
        + 'Instrumento con trato, que es exactamente lo que vende Grupo Mazi.',
    base: 'norma',
    escalaAncho: 1.0,
    glifos: {
      // Aperturas de Cercana: la C y la S dejan de morderse la cola. Un
      // instrumento con la boca cerrada se siente hostil.
      C: { an: 0.78, t: ['e1.2 d0 b0 a1.2 a4.8 b6 d6 e4.8'] },
      G: { an: 0.82, t: ['e1.2 d0 b0 a1.2 a4.8 b6 d6 e4.9 e3.2', 'e3.2 b3.2'], nudos: ['e3.2'] },
      S: { an: 0.70, t: ['e1.1 d0 b0 a1.2 a2 b2.9 d3.1 e4 e4.9 d6 b6 a4.9'] },
      // El vértice de la M baja un poco: Norma lo tenía muy alto y con el ochavo
      // se cerraba. Éste es el punto medio con Cercana.
      M: { an: 1.0, t: ['a6 a0', 'a0 c3.8', 'c3.8 e0', 'e0 e6'], nudos: ['a0', 'c3.8', 'e0'] },
      // La única división que no puede salir de una regla: el punto donde el
      // asta, el cuenco y la pierna de la R se juntan. Cortando los tres ahí,
      // la unión se lee.
      R: { an: 0.76, t: ['a0 a6', 'a0 c0 e1.2 e2 c2.9 a2.9', 'a2.9 e6'],
        nudos: ['a0'], cortes: ['a2.9'] },

      // La T. Su nudo caía a MEDIA barra, no en una punta, así que el corte le
      // partía el travesaño en dos justo arriba del asta: quedaban dos muñones y un
      // palo, y de lejos no se leía T. El travesaño ya tapaba el arranque del asta,
      // o sea que ese nudo nunca hizo falta. Sin él, el travesaño queda entero y la
      // división se la queda el asta —que mide altura completa y sí aguanta el
      // puente— exactamente como en la E, la F y la H, donde sí funciona.
      T: { an: 0.70, t: ['a0 e0', 'c0 c6'] },

      // La M: silueta de triángulo con la punta plana. Las astas ya no son
      // verticales, se abren hacia la base — la letra es ancha abajo y angosta
      // arriba— y el vértice del medio se queda a media altura para que las patas
      // no se separen del todo. Antes eran dos astas paralelas con un hueco
      // enorme entre las patitas; ahora es UNA figura.
      M: { an: 0.92, t: ['a6 b0', 'b0 c3.5 d0', 'd0 e6'], nudos: ['b0', 'd0'] },

      // La I, a la manera del reloj. En un display de segmentos el 1 no es una
      // barra: son DOS barras apiladas con un hueco en medio, y las puntas que se
      // miran van cortadas en diagonal porque si no los segmentos se tocarían.
      // Aquí sale solo: la división declarada al centro, y el ochavo ya le pone
      // el corte diagonal a las dos puntas nuevas. Es la excepción a la regla de
      // que una letra de un solo trazo no se parte — en este alfabeto, partida ES
      // la letra.
      I: { an: 0.24, t: ['c0 c6'], cortes: ['c3'] },

      /* ── LOS DÍGITOS ────────────────────────────────────────────────────
         Venían del esqueleto neutro, o sea circulares, igual que pasó con la caja
         baja. Y en una cara de reloj eso no se puede dejar: el dígito ES lo que un
         reloj enseña. Van rehechos con la misma superelipse, y el 1 es el 1 del
         reloj — una barra partida al centro, sin banderita. Sale idéntico a la I,
         como en el display de verdad. */
      // El 0 y el 1 se quedan como están — Carlos los aprobó tal cual.
      0: { an: 0.72, t: ['b0 d0 e1.2 e4.8 d6 b6 a4.8 a1.2 b0'], cortes: ['b0', 'd6'] },
      1: { an: 0.30, t: ['c0 c6'], cortes: ['c3'] },
      // Del 2 al 9, más cuadrados y con la unión a la vista: lados rectos, esquina
      // corta, y cada dígito partido en los puntos donde de verdad se une, que es
      // como el display enciende sus palitos por separado.
      2: { an: 0.68, t: ['a1 b0 d0 e1 e2.3 d3.2 b3.2 a3.4', 'a3.4 a4.9 b6 d6 e6'],
        nudos: ['a3.4'] },
      3: { an: 0.68, t: ['a1 b0 d0 e1 e2.2 d3 b3', 'b3 d3 e4 e5 d6 b6 a5'], nudos: ['b3'] },
      4: { an: 0.72, t: ['a0 a3.4', 'a3.4 e3.4', 'e0 e6'], nudos: ['a3.4', 'e3.4'] },
      5: { an: 0.68, t: ['e0 b0 a1 a3', 'a3 e3', 'e3 e5 d6 b6 a5'], nudos: ['a3', 'e3'] },
      6: { an: 0.70, t: ['d0 b0 a1 a3.2', 'a3.2 a4.9 b6 d6 e4.9 e3.6 d3.2 b3.2 a3.2'],
        nudos: ['a3.2'] },
      7: { an: 0.64, t: ['a0 e0', 'e0 d6'], nudos: ['e0'] },
      8: { an: 0.70, t: ['b0 d0 e1 e2.2 d3 b3 a2.2 a1 b0', 'b3 d3 e4 e5 d6 b6 a5 a4 b3'],
        nudos: ['b3', 'd3'] },
      9: { an: 0.70, t: ['b3.2 d3.2 e2.4 e1 d0 b0 a1 a2.4 b3.2', 'e2.4 e5 d6 b6 a5'],
        nudos: ['e2.4'] },

      // Los acentos venían con los anchos del esqueleto neutro, así que la Ñ y la
      // ñ salían más angostas que su propia N y n — y la ñ es la letra que más
      // falta en español. Aquí cada una toma el ancho de la letra que hereda.
      'Á': { an: 0.82, hereda: 'A', acento: 'agudo' },
      'É': { an: 0.68, hereda: 'E', acento: 'agudo' },
      'Í': { an: 0.24, hereda: 'I', acento: 'agudo' },
      'Ó': { an: 0.86, hereda: 'O', acento: 'agudo' },
      'Ú': { an: 0.80, hereda: 'U', acento: 'agudo' },
      'Ü': { an: 0.80, hereda: 'U', acento: 'dieresis' },
      'Ñ': { an: 0.82, hereda: 'N', acento: 'tilde' },
      'á': { an: 0.70, hereda: 'a', acento: 'agudo' },
      'é': { an: 0.64, hereda: 'e', acento: 'agudo' },
      'í': { an: 0.24, hereda: 'l', acento: 'agudo' },
      'ó': { an: 0.70, hereda: 'o', acento: 'agudo' },
      'ú': { an: 0.70, hereda: 'u', acento: 'agudo' },
      'ü': { an: 0.70, hereda: 'u', acento: 'dieresis' },
      'ñ': { an: 0.70, hereda: 'n', acento: 'tilde' },

      /* ── LA CAJA BAJA ───────────────────────────────────────────────────
         Venía heredada de `recto`, que es circular, y por eso no encajaba: una O
         de superelipse junto a una o de compás cantan. Aquí va el juego completo
         rehecho con la misma ley que la mayúscula — cuenco de lado recto y
         esquina curva, hombro de techo plano, asta derecha.

         Y la g, que se leía como q. La razón era concreta y no de gusto: su cola
         arrancaba a la altura de x, así que todo el lado derecho de la letra era
         una recta larga de arriba abajo — que es exactamente el asta de la q.
         Ahora el cuenco es un anillo CERRADO y la cola nace del PIE del cuenco.
         Eso es lo único que de verdad las separa.

         Y el nudo que NO va. En modo segmentos cada nudo se vuelve corte, así que
         un nudo puesto SOBRE un asta la parte — y a la altura de x el trozo del
         medio queda tan corto que el chaflán se lo come y sale un rombo. La "a" se
         quedaba sin asta y se leía "c". Sólo llevan nudo las uniones punta con
         punta, donde de verdad se topan dos trazos; sobre un asta el nudo nunca
         hizo falta, porque el asta ya tapaba el encuentro. */

      // La "a" DE DOS PLANTAS, y no por gusto. La de una planta —círculo con asta a
      // la derecha, la de Futura— se lee porque el cuenco redondo contrasta con el
      // asta recta. Aquí el cuenco es superelipse, o sea que su lado derecho YA es
      // recto: el asta se le pega y desaparece, y la letra sale siendo una "o".
      // Esa forma es estructuralmente imposible en esta tipografía. Así que va el
      // gancho de arriba curvando a la izquierda, que es lo que la vuelve
      // inconfundible: dos contraformas en vez de una.
      // Con la apertura de arriba ABIERTA, y esto es aritmética: la altura de x mide
      // 0.667 em y el trazo 0.19, así que tres barras horizontales se comen 0.57 y
      // quedan 0.1 para repartir entre dos huecos. No caben dos contraformas
      // cerradas. El gancho termina libre arriba a la izquierda y el hueco de abajo
      // se queda con todo el espacio — que además es la apertura abierta que aportó
      // Cercana a esta tipografía.
      a: { an: 0.70, t: ['a3.2 a2.6 b2 d2 e2.6 e6', 'e3.9 c3.85 a4.4 a5.3 b6 d6 e5.15'] },
      b: { an: 0.70, t: ['a0 a6', 'a2.9 b2 d2 e3 e5 d6 b6 a5.1'] },
      c: { an: 0.62, t: ['e2.7 d2 b2 a3 a5 b6 d6 e5.3'] },
      d: { an: 0.70, t: ['e0 e6', 'e2.9 d2 b2 a3 a5 b6 d6 e5.1'] },
      e: { an: 0.64, t: ['a4.05 e4.05 e3 d2 b2 a3 a5 b6 d6 e5.3'] },
      f: { an: 0.46, t: ['e0.2 d0 c1 c6', 'a2.2 e2.2'] },
      g: { an: 0.70, t: ['b2 d2 e3 e5 d6 b6 a5 a3 b2', 'd6.1 e6.7 e7.3 d8 b8 a7.3'] },
      h: { an: 0.70, t: ['a0 a6', 'a2.9 a2.2 c2 e2.2 e2.9', 'e2.9 e6'],
        nudos: ['e2.9'] },
      i: { an: 0.24, t: ['c2 c6', 'c0.8 c0.8'] },
      j: { an: 0.34, t: ['c2 c6.9 b8 a7.3', 'c0.8 c0.8'] },
      k: { an: 0.64, t: ['a0 a6', 'e2 a4.1', 'a4.1 e6'] },
      l: { an: 0.24, t: ['c0 c6'] },
      m: { an: 1.04, t: ['a2 a6', 'a2.9 a2.2 b2 c2.2 c2.9', 'c2.9 c6',
        'c2.9 c2.2 d2 e2.2 e2.9', 'e2.9 e6'], nudos: ['c2.9', 'e2.9'] },
      n: { an: 0.70, t: ['a2 a6', 'a2.9 a2.2 c2 e2.2 e2.9', 'e2.9 e6'],
        nudos: ['e2.9'] },
      o: { an: 0.70, t: ['b2 d2 e3 e5 d6 b6 a5 a3 b2'] },
      p: { an: 0.70, t: ['a2 a8', 'a2.9 b2 d2 e3 e5 d6 b6 a5.1'] },
      q: { an: 0.70, t: ['e2 e8', 'e2.9 d2 b2 a3 a5 b6 d6 e5.1'] },
      r: { an: 0.42, t: ['a2 a6', 'a2.9 a2.2 c2 e2.3'] },
      s: { an: 0.60, t: ['e2.7 d2 b2 a2.8 b3.6 d4.4 e5.2 d6 b6 a5.3'] },
      t: { an: 0.48, t: ['c0.8 c5.2 d6', 'a2.2 e2.2'] },
      u: { an: 0.70, t: ['a2 a4.9 b6 d6 e4.9 e2', 'e2 e6'] },
      // La v y la w llevan la punta plana de la M, para que la familia se note.
      v: { an: 0.64, t: ['a2 b5.7 c6 d5.7 e2'] },
      w: { an: 0.98, t: ['a2 b6', 'b6 c2.5', 'c2.5 d6', 'd6 e2'],
        nudos: ['b6', 'c2.5', 'd6'] },
      x: { an: 0.62, t: ['a2 e6', 'e2 a6'] },
      y: { an: 0.64, t: ['a2 c5.6', 'e2 c5.6', 'c5.6 c6.9 b8 a7.3'], nudos: ['c5.6'] },
      z: { an: 0.60, t: ['a2 e2', 'e2 a6', 'a6 e6'], nudos: ['e2', 'a6'] },
    },
    porDefecto: {
      pincel: 'uniforme', grosor: 0.19, tracking: 0.055, corte: 'ochavo', ochavo: 0.72,
      estencil: 1, segmentos: true,
    },
  },
};

// Tensho, kanteiryū y sōsho son escrituras de rótulo: no tienen caja baja, igual
// que la uncial tampoco la tenía. En vez de dejarlas heredando la minúscula de
// `recto` —que se vería como otra tipografía metida a fuerzas— la minúscula
// apunta a su propia mayúscula.
function sinCajaBaja(id) {
  ALFABETOS[id].soloAlta = true;
  const g = ALFABETOS[id].glifos;
  for (const [k, v] of Object.entries({ ...g })) {
    if (/^[A-Z]$/.test(k)) g[k.toLowerCase()] = { an: v.an, hereda: k };
  }
}
// Reactor entra en la lista por lo mismo que Bank Gothic no tenía minúscula: es
// letra de rótulo. En caja baja el bisel y el estencil no caben.
['tensho', 'kanteiryu', 'sosho', 'uncial', 'reactor'].forEach(sinCajaBaja);

// Resuelve la herencia: el alfabeto pedido sobre el juego completo.
function resolver(id) {
  const A = ALFABETOS[id];
  if (!A) throw new Error(`alfabeto desconocido: ${id}`);
  const glifos = A.base ? { ...resolver(A.base).glifos, ...A.glifos } : { ...A.glifos };
  return { ...A, glifos };
}

/* ═══ ACENTOS ══════════════════════════════════════════════════════════════ */

const ACENTOS = {
  agudo: an => [nodos('b-1 c-2', an)],
  dieresis: an => [nodos('b-1 b-1', an), nodos('d-1 d-1', an)],
  tilde: an => [nodos('a-1 b-2 d-1 e-2', an)],
};

/* ═══ ENGORDAR ═════════════════════════════════════════════════════════════ */

// Medio ancho y normal en cada punto del trazo. Se calcula una sola vez porque
// lo usan tres cosas: el contorno, las cerdas y los remates.
function geometria(pts, op) {
  const { grosor, pincel, filo, contraste, punta, cerrado, semilla } = op;
  const n = pts.length;
  const fn = PINCELES[pincel].f;
  const h = [], nor = [], tan = [];

  // En un trazo cerrado los vecinos dan la vuelta. Si no, en la costura los dos
  // lados del contorno no coinciden y queda una muesca — que era justo el
  // pellizco que se veía arriba de cada O.
  const m = cerrado ? n - 1 : n;
  const vec = i => (cerrado ? pts[((i % m) + m) % m] : pts[Math.max(0, Math.min(n - 1, i))]);

  for (let i = 0; i < n; i++) {
    const a = vec(i - 1), b = vec(i + 1);
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const th = Math.atan2(dy, dx);
    const t = i / (n - 1);
    // Un anillo no tiene principio ni fin, así que un pincel que entra grueso y
    // sale en pelo —harai, cuña, sumi— dejaba la O más flaca que sus vecinas.
    // Aquí el recorrido del perfil se vuelve una onda que empieza y acaba en el
    // mismo valor: modula igual, pero cierra parejo.
    const tp = cerrado ? 0.5 + 0.35 * Math.sin(2 * Math.PI * t) : t;
    let g = grosor * Math.max(0.05, fn(tp, th, { filo, contraste }, semilla));
    // La punta de cuña sólo en los extremos LIBRES; donde hay unión, nunca.
    if (!cerrado && punta !== 'ninguno') {
      const z = 0.2;
      if ((punta === 'ambos' || punta === 'inicio') && t < z) g *= 0.15 + 0.85 * (t / z);
      if ((punta === 'ambos' || punta === 'fin') && t > 1 - z) g *= 0.15 + 0.85 * ((1 - t) / z);
    }
    h.push(g / 2);
    nor.push([-dy / L, dx / L]);
    tan.push([dx / L, dy / L]);
  }
  return { h, nor, tan };
}

function contorno(pts, op) {
  const { h, nor, tan } = op.geo ?? geometria(pts, op);
  const { corte = 'recto', sesgo = 22, ochavo = 0.4, cerrado, cortaEn = [true, true] } = op;
  const lado = s => pts.map((p, i) => [p[0] + nor[i][0] * h[i] * s, p[1] + nor[i][1] * h[i] * s]);
  const A = lado(1), B = lado(-1);

  // LOS CORTES DE PUNTA — ochavo y sesgo.
  //
  // El ochavo es el bisel de Reactor mudado de la esquina de la letra a la PUNTA
  // del trazo: el extremo deja de ser un corte a escuadra y le salen dos
  // chaflanes de 45°. El sesgo es la terminación en diagonal del rótulo
  // deportivo. Los dos van sólo en puntas de verdad libres — en una unión dejan
  // muesca, y por eso `cortaEn` llega desde afuera ya sabiendo cuál está sola.
  //
  // La trampa, que costó una espina en cada S y cada U: cuando un lado tiene que
  // RETROCEDER, no basta con mover el último punto. El contorno está densificado,
  // así que el último punto está a fracciones de píxel del penúltimo; empujarlo
  // hacia atrás lo pasa por encima de sus vecinos y el contorno se cruza consigo
  // mismo. Hay que RECORTAR el lado hasta la distancia pedida —medida sobre el
  // recorrido, no sobre índices— y ahí empezar el chaflán.
  if (!cerrado && corte !== 'recto' && pts.length > 2) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) {
      L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = L.at(-1) || 1;
    const u = pts.length - 1;
    // Nunca más del 28% de cada punta: al 40%, un trozo corto se quedaba sin nada
    // de plano y salía convertido en rombo.
    const tope = total * 0.28;
    const dist = i => Math.min(tope, corte === 'ochavo'
      ? h[i] * Math.min(ochavo, 0.9)
      : h[i] * Math.tan(sesgo * Math.PI / 180));

    const recortaFin = (arr, d) => { let k = u; while (k > 0 && total - L[k] < d) k--; arr.length = k + 1; };
    const recortaIni = (arr, d) => { let k = 0; while (k < arr.length - 1 && L[k] < d) k++; arr.splice(0, k); };

    // Qué lado retrocede y qué lado avanza depende del corte, y equivocarse de
    // lado cruza el contorno. En el OCHAVO retroceden los dos, simétricos. En el
    // SESGO uno avanza y el otro retrocede — eso es lo que hace la diagonal.
    if (cortaEn[1]) {
      const c = dist(u), P = pts[u], n = nor[u], t = tan[u];
      if (corte === 'ochavo') {
        recortaFin(A, c); recortaFin(B, c);
        A.push([P[0] + n[0] * (h[u] - c), P[1] + n[1] * (h[u] - c)]);
        B.push([P[0] - n[0] * (h[u] - c), P[1] - n[1] * (h[u] - c)]);
      } else {
        A.push([P[0] + n[0] * h[u] + t[0] * c, P[1] + n[1] * h[u] + t[1] * c]);
        recortaFin(B, c);
      }
    }
    if (cortaEn[0]) {
      const c = dist(0), P = pts[0], n = nor[0], t = tan[0];
      if (corte === 'ochavo') {
        recortaIni(A, c); recortaIni(B, c);
        A.unshift([P[0] + n[0] * (h[0] - c), P[1] + n[1] * (h[0] - c)]);
        B.unshift([P[0] - n[0] * (h[0] - c), P[1] - n[1] * (h[0] - c)]);
      } else {
        A.unshift([P[0] + n[0] * h[0] - t[0] * c, P[1] + n[1] * h[0] - t[1] * c]);
        recortaIni(B, c);
      }
    }
  }

  const d = v => v.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L ');
  return `M ${d(A)} L ${d(B.reverse())} Z`;
}

// CORTES DE ESTENCIL. Los huecos se miden por LARGO DE ARCO, no por índice: si se
// midieran por índice, un trazo corto tendría el mismo hueco proporcional que uno
// largo y los puentes saldrían de tamaños distintos en la misma letra. Un trazo
// que no da para sus cortes se deja entero — más vale sin estencil que en migajas.
// Qué trazo admite estencil. Un anillo o una curva partidos por la mitad no se
// leen como puente: se leen como GRIETA — la O quedaba rajada en diagonal y la
// letra parecía dañada, no estarcida. El estencil de verdad, el militar, pone el
// puente en astas, barras y diagonales, o sea en trazos derechos. Así que se mide
// la rectitud: largo del recorrido contra distancia entre las dos puntas.
function rectoLargo(pts, cerrado) {
  if (cerrado) return false;
  let arco = 0;
  for (let i = 1; i < pts.length; i++) {
    arco += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  const dx = pts.at(-1)[0] - pts[0][0], dy = pts.at(-1)[1] - pts[0][1];
  const cuerda = Math.hypot(dx, dy);
  if (!cuerda || arco / cuerda >= 1.05) return false;
  // Y además derecho de a de veras: vertical u horizontal, con 22° de tolerancia.
  // En una diagonal condensada el puente no se lee como puente, se lee como que a
  // la letra le falta un pedazo. En el estencil militar el puente va en el asta.
  // Y largo de asta, no de brazo. Un brazo de E cortado a la mitad no se lee
  // estarcido: se lee roto, y la letra deja de ser una E. En Reactor esto no
  // pasaba porque va condensada al 84% y los brazos no llegaban al mínimo; en
  // una letra ancha sí llegan. El puente pertenece al asta de altura completa.
  if (arco < 0.82) return false;
  // Y vertical de verdad, con 8° de tolerancia, no 22. Las astas abiertas de la M
  // van a 13° y con la tolerancia vieja calificaban: el puente les cortaba la
  // patita y quedaba un pedacito suelto abajo, que es exactamente lo contrario de
  // "que no se separen por completo". El puente pertenece al asta recta.
  const g = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI) % 180;
  const a = Math.min(g, 180 - g);
  return a < 8 || Math.abs(a - 90) < 8;
}

// DIVISIÓN DECLARADA. El estencil automático pone el puente a media asta, y eso
// deja fuera justo el sitio donde una letra pide una división: el punto donde se
// juntan todos sus trazos. La R es el caso: el asta, el cuenco y la pierna
// coinciden en un nodo, y aunque el puente cayera ahí, el cuenco y la pierna lo
// tapan con su propia tinta. Para que la división se vea hay que cortar los TRES
// trazos en el mismo punto — y eso no lo puede adivinar una regla: se declara en
// el glifo, con `cortes`.
function partirEnNodos(pts, focos, radio) {
  if (!focos.length) return [pts];
  const piezas = [];
  let actual = [];
  for (const q of pts) {
    const dentro = focos.some(f => Math.hypot(q[0] - f[0], q[1] - f[1]) < radio);
    if (dentro) { if (actual.length >= 3) piezas.push(actual); actual = []; }
    else actual.push(q);
  }
  if (actual.length >= 3) piezas.push(actual);
  return piezas.length ? piezas : [pts];
}

function partirEstencil(pts, cortes, hueco) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) {
    L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = L.at(-1);
  if (total < (cortes + 1) * hueco * 3.2) return [pts];

  const zonas = Array.from({ length: cortes }, (_, j) => {
    const c = (total * (j + 1)) / (cortes + 1);
    return [c - hueco / 2, c + hueco / 2];
  });
  const piezas = [];
  let actual = [];
  for (let i = 0; i < pts.length; i++) {
    if (zonas.some(([a, b]) => L[i] >= a && L[i] <= b)) {
      if (actual.length >= 3) piezas.push(actual);
      actual = [];
    } else actual.push(pts[i]);
  }
  if (actual.length >= 3) piezas.push(actual);
  return piezas.length ? piezas : [pts];
}

// El higemoji 髭文字 —la letra de los carteles de hielo raspado y de sake— no se
// dibuja como una masa sino como CERDAS: el pincel se abre y deja líneas
// paralelas. Y no son las que caigan: el oficio manda un reparto de 7-5-3, siete
// en el cuerpo del trazo, cinco donde se angosta y tres al terminar.
//
// Aquí eso no se programa a mano: cada cerda existe sólo donde el trazo es lo
// bastante ancho para ella —las de la orilla necesitan más ancho que las del
// centro—, así que el 7-5-3 sale del propio adelgazamiento del trazo.
function cerdasDe(pts, op, K = 7) {
  const { h, nor } = op.geo ?? geometria(pts, op);
  const hmax = Math.max(...h) || 1;
  const salida = [];

  for (let j = 0; j < K; j++) {
    const u = K === 1 ? 0 : -1 + (2 * j) / (K - 1);
    const umbral = 0.30 + 0.64 * Math.abs(u);
    let corrida = [];
    const cerrar = () => {
      if (corrida.length >= 5) {
        salida.push(contorno(corrida, {
          grosor: op.grosor * 0.095, pincel: 'uniforme', filo: 0, contraste: 1,
          punta: 'ambos', cerrado: false, semilla: 0,
        }));
      }
      corrida = [];
    };
    for (let i = 0; i < pts.length; i++) {
      if (h[i] >= hmax * umbral) {
        corrida.push([pts[i][0] + nor[i][0] * u * h[i] * 0.84,
          pts[i][1] + nor[i][1] * u * h[i] * 0.84]);
      } else cerrar();
    }
    cerrar();
  }
  return salida;
}

function disco(cx, cy, r) {
  const k = 0.5522847498 * r, P = (x, y) => `${r2(x)} ${r2(y)}`;
  return `M ${P(cx - r, cy)}`
    + ` C ${P(cx - r, cy - k)} ${P(cx - k, cy - r)} ${P(cx, cy - r)}`
    + ` C ${P(cx + k, cy - r)} ${P(cx + r, cy - k)} ${P(cx + r, cy)}`
    + ` C ${P(cx + r, cy + k)} ${P(cx + k, cy + r)} ${P(cx, cy + r)}`
    + ` C ${P(cx - k, cy + r)} ${P(cx - r, cy + k)} ${P(cx - r, cy)} Z`;
}

/* ═══ COMPONER ═════════════════════════════════════════════════════════════ */

const PORDEFECTO = {
  alfabeto: 'recto', pincel: 'uniforme', grosor: 0.13, filo: 90, contraste: 0.28,
  tracking: 0.05, anchoGlifo: 1, inclinacion: 0, punta: 'ninguno', alto: 100,
  remate: 'ninguno', cerdas: 0, relleno: 'solido',
  corte: 'recto', sesgo: 22, ochavo: 0.4, estencil: 0, segmentos: false,
};

export function componer(texto, op = {}) {
  const A = resolver(op.alfabeto || 'recto');
  // Cada alfabeto histórico trae su propio ajuste de fábrica —la Textura sin filo
  // a −40° y sin diamante no es Textura— pero lo que se pida a mano siempre gana.
  const dado = Object.fromEntries(Object.entries(op).filter(([, v]) => v !== undefined));
  const {
    pincel, grosor, filo, contraste, tracking, anchoGlifo, inclinacion,
    punta, alto, remate, cerdas, relleno, corte, sesgo, ochavo, estencil, segmentos,
  } = { ...PORDEFECTO, ...(A.porDefecto || {}), ...dado };

  const hueco = relleno === 'hueco';
  const esc = (A.escalaAncho ?? 1) * anchoGlifo;
  const partes = [];
  const cuerpo = d => partes.push({ d, hueco });
  const tinta = d => partes.push({ d, hueco: false });
  let x = grosor / 2;
  let sem = 0;

  for (const ch of texto) {
    let G = A.glifos[ch];
    if (!G) G = A.glifos[ch.toUpperCase()] || A.glifos[' '];
    const an = G.an * esc;
    // La herencia puede ser de dos saltos: "á" hereda "a", y en un alfabeto sin
    // caja baja "a" hereda "A". Hay que seguir la cadena o el acento sale solo.
    let base = G, salto = 0;
    while (base.hereda && salto++ < 4) base = A.glifos[base.hereda] || base;
    const trazos = base.t || [];
    const trazos_n = trazos.length;
    const nudosG = base.nudos || [];
    // Los puntos donde el glifo pide partirse, ya en coordenadas de la línea.
    //
    // MODO SEGMENTOS. En un reloj de siete segmentos la letra no es un dibujo
    // continuo: son barras sueltas que NUNCA se tocan, con hueco en cada unión y
    // las puntas cortadas en diagonal. Aquí eso no hay que inventarlo — la lista
    // de `nudos` de cada glifo YA es la lista de sus uniones, porque para eso se
    // escribió: para taparlas con un disco. Con `segmentos` se hace lo contrario:
    // cada nudo se vuelve un corte y el disco no se dibuja. Un campo que servía
    // para pegar, usado para separar.
    const cortesG = [...(base.cortes || []), ...(segmentos ? nudosG : [])].map(nd => {
      const [[cx, cy]] = nodos(nd, an);
      return [cx + x, cy];
    });
    // El hueco de la foto es una raya fina, no un mordisco: 0.62 dejaba un vacío
    // más ancho que el propio trazo y las letras se caían en pedazos.
    const radioCorte = grosor * 0.27;
    const enCorte = (px, py) => cortesG.some(f => Math.hypot(px - f[0], py - f[1]) < radioCorte);

    // Un remate va en un extremo LIBRE. Si dos trazos acaban en el mismo punto
    // eso es una unión, no un final — y ahí un diamante o un pelo se ve como un
    // error. Así que primero se juntan todos los extremos del glifo y luego se
    // pregunta si el punto está solo. (Fue lo que llenó de púas al kagomoji.)
    const extremos = [];
    for (const cadena of trazos) {
      const p = nodos(cadena.replace(/^!/, ''), an);
      if (p.length < 2) continue;
      if (p.length > 2 && Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]) < 1e-9) continue;
      extremos.push([p[0][0] + x, p[0][1]], [p.at(-1)[0] + x, p.at(-1)[1]]);
    }
    const solo = (px, py) => extremos.filter(q =>
      Math.hypot(q[0] - px, q[1] - py) < grosor * 0.5).length <= 1;

    for (const cadena of trazos) {
      const quebrado = cadena.startsWith('!');
      const p = nodos(quebrado ? cadena.slice(1) : cadena, an);
      // Un punto solo (el punto de la i, el de la coma) se dibuja como disco.
      if (p.length === 2 && Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) < 1e-9) {
        cuerpo(disco(p[0][0] + x, p[0][1], grosor * 0.62));
        continue;
      }
      const cerrado = p.length > 2
        && Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]) < 1e-9;
      const crudo = cerrado ? p.slice(0, -1) : p;
      const pts = (quebrado ? tieso(crudo, 8, cerrado) : suavizar(crudo, 14, cerrado))
        .map(([px, py]) => [px + x, py]);
      // El anillo tiene que volver a su punto de partida para que el contorno
      // cierre; si no, queda abierto justo en la costura.
      if (cerrado) pts.push([...pts[0]]);

      const cfg = { grosor, pincel, filo, contraste, punta, cerrado, corte, sesgo, ochavo,
        semilla: sem++ };
      cfg.geo = geometria(pts, cfg);
      // Qué punta está sola de verdad. Lo usan el corte sesgado y el remate: en
      // una unión, los dos dejan muesca.
      // Una punta que cae dentro de un corte declarado SÍ se achaflana: ahí ya no
      // hay unión, hay hueco, y una punta a escuadra frente a otra delata que la
      // letra era continua.
      const librePunta = (px, py) => solo(px, py) || enCorte(px, py);
      const libres = cerrado ? [false, false]
        : [librePunta(pts[0][0], pts[0][1]), librePunta(pts.at(-1)[0], pts.at(-1)[1])];

      // Una división declarada manda sobre el estencil automático: si el glifo
      // dice dónde quiere partirse, no se le pone además un puente al azar.
      const enNodo = cortesG.length
        && cortesG.some(f => pts.some(q => Math.hypot(q[0] - f[0], q[1] - f[1]) < radioCorte));

      if (cerdas > 0) {
        cerdasDe(pts, cfg, cerdas).forEach(cuerpo);
      } else {
        let trozos;
        if (enNodo) {
          trozos = partirEnNodos(pts, cortesG, radioCorte);
        // Una letra de un solo trazo —la I, la l— partida por la mitad no queda
        // estarcida: queda partida, y ya no se sabe qué letra es. El puente
        // necesita que quede letra alrededor.
        } else if (estencil > 0 && trazos_n > 1 && rectoLargo(pts, cerrado)) {
          trozos = partirEstencil(pts, estencil, grosor * 0.34);
        } else {
          trozos = null;
        }

        if (!trozos) {
          cuerpo(contorno(pts, { ...cfg, cortaEn: libres }));
        } else {
          const ultimo = trozos.length - 1;
          trozos.forEach((tz, k) => {
            // El corte interior SÍ se remata: ahí está el efecto.
            const c2 = { ...cfg, cerrado: false,
              cortaEn: [k === 0 ? libres[0] : true, k === ultimo ? libres[1] : true] };
            c2.geo = geometria(tz, c2);
            cuerpo(contorno(tz, c2));
          });
        }
      }

      // Los remates van en los extremos LIBRES, con el ángulo hacia afuera, y
      // siempre en tinta llena: en el kagomoji el cuerpo va hueco y los pelos no.
      if (!cerrado && remate !== 'ninguno') {
        const fin = pts.length - 1;
        for (const [i, s] of [[0, -1], [fin, 1]]) {
          if (!solo(pts[i][0], pts[i][1])) continue;
          const th = Math.atan2(cfg.geo.tan[i][1] * s, cfg.geo.tan[i][0] * s);
          REMATES[remate](pts[i][0], pts[i][1], th, cfg.geo.h[i] * 2, filo).forEach(tinta);
        }
      }
    }
    for (const nd of nudosG) {
      // Ni en jaula ni en cerdas: un disco macizo en cada unión es una burbuja en
      // la primera y un borrón que se come el 7-5-3 en la segunda.
      if (hueco || cerdas > 0 || segmentos) break;
      const [[nx, ny]] = nodos(nd, an);
      // Un disco de unión encima de una división declarada la vuelve a tapar,
      // que es exactamente por lo que la R parecía no tener corte.
      if (cortesG.some(f => Math.hypot(nx + x - f[0], ny - f[1]) < radioCorte)) continue;
      cuerpo(disco(nx + x, ny, grosor / 2));
    }
    if (G.acento) {
      for (const p of ACENTOS[G.acento](an)) {
        const pts = suavizar(p, 10).map(([px, py]) => [px + x, py]);
        if (Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) < 1e-9) {
          cuerpo(disco(p[0][0] + x, p[0][1], grosor * 0.55));
        } else {
          cuerpo(contorno(pts, { grosor: grosor * 0.85, pincel, filo, contraste,
            punta: 'ninguno', cerrado: false, semilla: sem++ }));
        }
      }
    }
    x += an + tracking + grosor;
  }

  const ancho = x - tracking - grosor + grosor / 2;
  const sh = Math.tan(inclinacion * Math.PI / 180);
  const tr = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) =>
    `${r2((+a - sh * (+b - 0.5)) * alto)} ${r2(+b * alto)}`);

  const piezas = partes.map(z => ({ d: tr(z.d), hueco: z.hueco }));
  return {
    ancho: ancho * alto + Math.abs(sh) * alto, alto, piezas,
    trazoHueco: r2(grosor * 0.135 * alto),
    ds: piezas.map(z => z.d),   // compatibilidad: el bitmap y la marca usan esto
  };
}

// `papel` sólo hace falta en modo hueco, y hace mucho: la letra de jaula se
// dibuja trazo por trazo, así que los cruces de un trazo con otro se veían por
// dentro y parecían un armazón. Rellenando cada trazo del color del fondo ANTES
// de delinearlo, cada trazo tapa las líneas que le caen encima y queda un solo
// contorno — que es como se pintaba. Sin unión de polígonos: sólo orden.
export function svg(texto, op = {}, tinta = '#EAE5E3', papel = null) {
  const p = componer(texto, op);
  const m = (op.alto ?? 100) * 0.18;
  // El lienzo tiene que caber TODO: los acentos llegan a la fila -2 (-0.33 em) y
  // los descendentes a la fila 8 (1.33 em), más medio grosor de trazo en cada
  // punta. El alto era 1.34 em y por eso la cola de la g, la j, la p, la q y la y
  // quedaba cortada por el borde del viewBox en todos los alfabetos.
  const y0 = -m - (op.alto ?? 100) * 0.34;
  const h = p.alto * 1.74 + m * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${y0} ${p.ancho + m * 2} ${h}">`
    + p.piezas.map(z => (z.hueco
      ? `<path d="${z.d}" fill="${papel || 'none'}" stroke="${tinta}"`
        + ` stroke-width="${p.trazoHueco}" stroke-linejoin="round"/>`
      : `<path d="${z.d}" fill="${tinta}"/>`)).join('') + '</svg>';
}

/* ═══ BITMAP ═══════════════════════════════════════════════════════════════ */
//
// Rasteriza el texto a una rejilla. Sirve para tipografía de pantalla y, sobre
// todo, para pasar el resultado por vectorizar.mjs y recuperarlo con textura de
// trazo en vez de contorno perfecto.

export function bitmap(texto, op = {}, filas = 24) {
  const p = componer(texto, { ...op, alto: 1 });
  // El lienzo va de −0.34 (acentos) a 1.34 (descendentes): 1.68 de alto total.
  // `filas` es la altura de MAYÚSCULA, así que la rejilla necesita más.
  const ARRIBA = 0.34, ABAJO = 0.34, total = Math.round(filas * (1 + ARRIBA + ABAJO));
  const cols = Math.ceil(p.ancho * filas);
  // Relleno por regla del par-impar sobre los contornos ya calculados.
  const polis = p.ds.map(d => [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)]
    .map(m => [+m[1], +m[2]]));
  const rejilla = [];
  for (let f = 0; f < total; f++) {
    let linea = '';
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / filas, y = (f + 0.5) / filas - ARRIBA;
      let dentro = false;
      for (const poli of polis) {
        let d = false;
        for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
          const [xi, yi] = poli[i], [xj, yj] = poli[j];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d;
        }
        if (d) dentro = true;
      }
      linea += dentro ? '#' : '.';
    }
    rejilla.push(linea);
  }
  return rejilla;
}


/* ═══ CATÁLOGO ═════════════════════════════════════════════════════════════ */

const MUESTRA = 'GRUPO MAZI';

const COMBOS = [
  { a: 'recto', p: 'uniforme', g: 0.13, nota: 'La base: estructura neutra, grosor plano.' },
  { a: 'recto', p: 'plumilla', g: 0.19, filo: 90, nota: 'Plumilla vertical: contraste invertido, horizontales gordas.' },
  { a: 'recto', p: 'cincel', g: 0.24, filo: 72, nota: 'Contraste extremo, filo en diagonal.' },
  { a: 'recto', p: 'presion', g: 0.20, nota: 'Presión de mano: engorda al centro del trazo.' },
  { a: 'recto', p: 'cuna', g: 0.20, punta: 'ninguno', nota: 'Cada trazo sale en punta de pluma.' },
  { a: 'recto', p: 'latigo', g: 0.21, nota: 'Gesto rápido, arrastre hasta la punta.' },
  { a: 'recto', p: 'gota', g: 0.19, nota: 'Peso al final del trazo.' },
  { a: 'recto', p: 'seco', g: 0.20, nota: 'Pincel seco: el grosor tiembla.' },
  { a: 'deco', p: 'uniforme', g: 0.11, nota: 'Deco: alta, estrecha, vértices agudos.' },
  { a: 'deco', p: 'cincel', g: 0.22, filo: 90, nota: 'Deco con contraste: años treinta.' },
  { a: 'angular', p: 'uniforme', g: 0.13, nota: 'Facetada: la O es un hexágono.' },
  { a: 'angular', p: 'cuna', g: 0.19, nota: 'Facetada con puntas: dura y afilada.' },
  { a: 'humanista', p: 'plumilla', g: 0.20, filo: 78, nota: 'Cálida, proporciones clásicas.' },
  { a: 'humanista', p: 'presion', g: 0.19, nota: 'Humanista con presión: casi escrita a mano.' },
  { a: 'griego', p: 'uniforme', g: 0.13, nota: 'ΓΡΥΠΟ ΜΑΖΙ — la raíz del nombre.' },
  { a: 'griego', p: 'cincel', g: 0.23, filo: 90, nota: 'Griega lapidaria, como una inscripción.' },
  { a: 'recto', p: 'cuna', g: 0.20, incl: 12, nota: 'Cursiva: inclinada 12° con punta de pluma.' },
  { a: 'humanista', p: 'latigo', g: 0.21, incl: 15, nota: 'Cursiva de gesto, la más caligráfica.' },
  { a: 'deco', p: 'uniforme', g: 0.09, tr: 0.16, nota: 'Deco ligera y espaciada: la más elegante.' },
  { a: 'recto', p: 'uniforme', g: 0.26, tr: 0.02, nota: 'Muy gorda y apretada: máximo peso.' },
];

// Los históricos. Aquí el pincel casi no se toca: lo que cambia es el ESQUELETO,
// que es lo que hace que se vean de siglos distintos y no del mismo dibujo.
const COMBOS_HIST = [
  { a: 'tensho', t: 'Sello de la dinastía Qin',
    nota: 'Tensho 篆書, la más vieja de las cinco escrituras clásicas. Ni una diagonal: '
        + 'la N y la Z resuelven lo oblicuo con escalera, como los sellos de piedra.' },
  { a: 'tensho', g: 0.30, tr: 0.06, t: 'Kakuji: el sello macizo',
    nota: 'El mismo esqueleto con el trazo engordado hasta que el hueco casi se cierra: '
        + 'es el kakuji 角字, la versión de bloque que se usa para grabar.' },
  { a: 'kanteiryu', t: 'Cartel de kabuki',
    nota: 'Kanteiryū 勘亭流, del Edo. Trazo gordo curvado hacia adentro y terminación en '
        + 'ángulo recto: no dejar hueco significaba no dejar butaca vacía.' },
  { a: 'kanteiryu', hueco: true, remate: 'bigote', t: 'Kagomoji: letra de jaula',
    nota: 'Kagomoji 籠文字, la letra "de canasta": el mismo cuerpo pero sólo su contorno, '
        + 'con los pelos afuera. Se pintaba así para luego rellenarla a mano.' },
  { a: 'kanteiryu', p: 'higemoji', cerdas: 7, g: 0.34, remate: 'ninguno',
    t: 'Higemoji: el reparto 7-5-3',
    nota: 'Higemoji 髭文字, la letra de bigote de los puestos de hielo raspado y de sake. '
        + 'El oficio manda siete cerdas en el cuerpo del trazo, cinco donde se angosta y '
        + 'tres al terminar — y aquí eso no está escrito a mano: sale de que cada cerda '
        + 'sólo existe donde el trazo da para ella.' },
  { a: 'sosho', t: 'Cursiva de aliento',
    nota: 'Sōsho 草書, la que se escribe sin levantar el pincel. La Z entera es un trazo. '
        + 'Termina en harai 払い: el pincel se levanta poco a poco y la línea se va en un pelo.' },
  { a: 'sosho', p: 'sumi', g: 0.26, incl: 14, t: 'La tinta que se acaba',
    nota: 'La misma cursiva con el pincel sumi 墨: entra cargado y se va rayando. Es el trazo '
        + 'que delata que hubo una mano y no una máquina.' },
  { a: 'textura', m: 'Grupo Mazi', t: 'Textura Quadrata · siglo XIII',
    nota: 'La gótica de verdad vive en la minúscula: astas parejas, hombros quebrados y el '
        + 'remate en diamante. De ahí los dos nombres — texere, tejer, por la trama; y '
        + 'quadrata, por los diamantes.' },
  { a: 'textura', t: 'Textura en caja alta',
    nota: 'El mismo esqueleto todo en mayúscula: se pierde la trama y gana peso de escudo. '
        + 'Pluma de filo ancho a −40°, que es el ángulo real de la gótica.' },
  { a: 'rotunda', m: 'Grupo Mazi', t: 'Rotunda · la gótica del sur',
    nota: 'La otra rama de la misma familia: el cuenco vuelve a ser redondo y el remate es de '
        + 'bola. La diferencia con la Textura es, literalmente, dónde se devolvió la curva.' },
  { a: 'uncial', t: 'Uncial · la letra del códice',
    nota: 'Anterior a la gótica y su opuesto: ancha, redonda, de poco contraste y con remate '
        + 'de cuña. No tiene minúscula porque cuando se usaba todavía no existía.' },
  { a: 'textura', p: 'hane', g: 0.24, remate: 'ninguno', t: 'Gótica con rebote japonés',
    nota: 'El cruce que sólo se puede hacer teniendo las dos partes separadas: esqueleto de '
        + 'gótica del XIII con el final hane 跳ね, donde el pincel se levanta de golpe. '
        + 'Ninguna fundidora vende esto.' },
];

function opDe(c) {
  return {
    alfabeto: c.a, pincel: c.p, grosor: c.g, filo: c.filo, tracking: c.tr,
    inclinacion: c.incl, punta: c.punta, remate: c.remate, cerdas: c.cerdas,
    relleno: c.hueco ? 'hueco' : undefined,
  };
}

function bloqueCombo(c, i) {
  const op = {
    alfabeto: c.a, pincel: c.p, grosor: c.g, filo: c.filo ?? 90,
    tracking: c.tr ?? 0.05, inclinacion: c.incl ?? 0, punta: c.punta ?? 'ninguno',
  };
  return `<article>
    <h2><b>${String(i + 1).padStart(2, '0')}</b> ${c.a} · ${c.p}
      <span>grosor ${c.g}${c.filo && c.p.match(/plumilla|cincel/) ? ` · filo ${c.filo}°` : ''}${c.incl ? ` · ${c.incl}°` : ''}</span></h2>
    <div class="o">${svg(MUESTRA, op, '#EAE5E3')}</div>
    <div class="c">${svg(MUESTRA, op, '#120C1A')}</div>
    <div class="lock"><img src="../marca/logo/paloma.svg" alt="">${svg(MUESTRA, op, '#EAE5E3')}</div>
    <p>${c.nota}</p>
  </article>`;
}

function bloqueHist(c, i) {
  const op = opDe(c);
  const A = ALFABETOS[c.a];
  const m = c.m || MUESTRA;
  return `<article class="hist">
    <h2><b>H${String(i + 1).padStart(2, '0')}</b> ${c.t}
      <span>${A.nombre}${c.p ? ` · ${c.p}` : ''}</span></h2>
    <div class="o big">${svg(m, op, '#EAE5E3', '#120C1A')}</div>
    <div class="c big">${svg(m, op, '#120C1A', '#EAE5E3')}</div>
    <div class="lock"><img src="../marca/logo/paloma.svg" alt="">${svg(m, op, '#EAE5E3', '#120C1A')}</div>
    <p>${c.nota}</p>
  </article>`;
}

function catalogo(salida) {
  const juego = resolver('recto').glifos;
  const filas = [
    'ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz',
    '0123456789', 'ÁÉÍÓÚÜÑ áéíóúüñ', '.,:;-–·!¡?¿()/&@', 'ΓΔΘΛΞΠΣΥΦΩ μζ',
  ];
  writeFileSync(salida, `<meta charset="utf-8">
<title>tipos.mjs — la fábrica de tipografías</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#120C1A;color:#EAE5E3;
       font:400 14px/1.6 "Segoe UI",system-ui,sans-serif;padding:38px 26px 80px}
  .wrap{max-width:1120px;margin:0 auto}
  h1{font-size:23px;font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
  .sub{color:#A99FB4;max-width:76ch;margin:0 0 30px}
  .sub b{color:#EAE5E3}
  h3{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#8B8296;
     margin:34px 0 14px;border-top:1px solid #2A2036;padding-top:16px}
  article{margin:0 0 34px;border-top:1px solid #2A2036;padding-top:16px}
  h2{font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:#8B8296;
     font-weight:600;margin:0 0 14px;display:flex;gap:10px;align-items:baseline}
  h2 b{color:#AD21ED}
  h2 span{margin-left:auto;font-size:9.5px;letter-spacing:.08em;color:#5C5468;text-transform:none}
  article>div{padding:20px 24px;border-radius:10px;margin:0 0 8px}
  .o{background:#120C1A;border:1px solid #2A2036}
  .c{background:#EAE5E3}
  article svg{height:60px;width:auto;display:block}
  .big svg{height:104px}
  .hist h2 b{color:#F2B03C}
  .fuentes{color:#6E657C;font-size:12px;line-height:1.9;margin:26px 0 0}
  .fuentes a{color:#8B8296}
  .lock{display:flex;align-items:center;gap:16px;background:#120C1A;border:1px solid #2A2036}
  .lock img{height:46px}
  .lock svg{height:26px}
  article p{color:#A99FB4;font-size:13px;margin:10px 0 0}
  .juego{background:#1a1024;border:1px solid #2A2036;border-radius:10px;padding:20px 24px}
  .juego svg{height:46px;width:auto;display:block;margin:0 0 10px}
</style>
<div class="wrap">
  <h1>tipos.mjs · la fábrica de tipografías</h1>
  <p class="sub">Partes independientes, y confundirlas fue el error que hubo que corregir:
  el <b>esqueleto</b> es la estructura de la letra —si la O es círculo o hexágono, si la M baja
  hasta la base—, el <b>pincel</b> es cómo se engorda, y el <b>remate</b> es lo que se le pega a la
  punta, porque un perfil de grosor no puede hacer un rombo y el rombo es la gótica. Cambiar sólo
  el pincel da versiones de la misma letra; cambiar el esqueleto da tipografías distintas. Aquí hay
  <b>${Object.keys(ALFABETOS).length} esqueletos × ${Object.keys(PINCELES).length} pinceles ×
  ${Object.keys(REMATES).length} remates</b>, más relleno hueco y trazo abierto en cerdas, sobre un
  juego de <b>${Object.keys(juego).length} caracteres</b> editable desde una rejilla.</p>

  <h3>El juego completo · esqueleto recto</h3>
  <div class="juego">
    ${filas.map(f => svg(f, { grosor: 0.13 }, '#EAE5E3')).join('\n    ')}
  </div>

  <h3>Los históricos · escritura clásica japonesa y letra medieval</h3>
  <p class="sub">Estos no son otro acabado: son otra <b>estructura</b>. Salieron de investigar
  las cinco escrituras clásicas japonesas —tensho 篆書 el sello, reisho, kaisho, gyōsho y sōsho
  草書 la cursiva—, los <b>edomoji</b>, que son las letras que se inventaron en el Edo
  <i>para anunciar</i>, y las dos ramas de la gótica europea. Cada uno resolvió un problema
  concreto de su siglo, y ese problema es lo que les dio la forma.</p>
  ${COMBOS_HIST.map(bloqueHist).join('\n')}

  <p class="fuentes">De dónde salió: <a href="https://en.wikipedia.org/wiki/Edomoji">Edomoji</a> ·
  <a href="https://craft.city.taito.lg.jp/center/en/list/%E6%B1%9F%E6%88%B8%E6%96%87%E5%AD%97en/">Centro
  de Artesanía Tradicional de Edo-Taito</a> ·
  <a href="https://theslowbrush.com/posts/five-classical-styles-japanese-calligraphy/">las cinco
  escrituras clásicas</a> ·
  <a href="https://www.calligraphytokyo.com/blogs/magazine/5-scripts-of-japanese-calligraphy">Calligraphy
  Tokyo</a> · <a href="https://www.lttrink.com/blog/comprehensive-guide-blackletter/">guía de
  blackletter de LTTR/INK</a> ·
  <a href="https://youblob.com/us/blueprints/gothic-blackletter-calligraphy">Textura Quadrata</a>.</p>

  <h3>Los ${COMBOS.length} tipos de la primera vuelta</h3>
  ${COMBOS.map(bloqueCombo).join('\n')}
</div>
`);
  console.log(`✒  ${salida}  ·  ${COMBOS_HIST.length} históricos + ${COMBOS.length} tipos`);
}

/* ═══ CLI ══════════════════════════════════════════════════════════════════ */

const [, , cmd, ...resto] = process.argv;
const opt = (n, d) => { const i = resto.indexOf('--' + n); return i === -1 ? d : resto[i + 1]; };
const num = n => (opt(n) === undefined ? undefined : +opt(n));

// Sólo cuando se corre a mano. Sin esta guarda, cualquier archivo que importe
// `svg` o `componer` imprime la ayuda de la herramienta en su propia salida.
const directo = process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (!directo) {
  /* importada: no se corre nada */
} else if (cmd === 'catalogo') {
  catalogo(resto[0] || 'tipos.html');
} else if (cmd === 'juego') {
  const al = opt('alfabeto', 'recto');
  const g = resolver(al).glifos;
  console.log(`Alfabeto "${al}" · ${Object.keys(g).length} glifos`);
  console.log(Object.keys(g).join(' '));
} else if (cmd === 'pinceles') {
  for (const [k, v] of Object.entries(PINCELES)) console.log(`  ${k.padEnd(10)} ${v.nota}`);
} else if (cmd === 'bitmap') {
  const t = resto[0] || 'Mazi';
  for (const l of bitmap(t, { alfabeto: opt('alfabeto', 'recto'), grosor: +opt('grosor', 0.13) },
    +opt('filas', 22))) console.log(l);
} else if (cmd === 'texto') {
  const t = resto[0] || 'GRUPO MAZI';
  const salida = resto[1] || 'texto.svg';
  writeFileSync(salida, svg(t, {
    // Nada de valores por omisión aquí: lo que no se pida a mano lo pone el
    // ajuste de fábrica del alfabeto, que para los históricos es la mitad del
    // estilo. `--alfabeto textura` a secas ya sale con filo −40° y diamante.
    alfabeto: opt('alfabeto', 'recto'), pincel: opt('pincel'),
    grosor: num('grosor'), filo: num('filo'), tracking: num('tracking'),
    inclinacion: num('inclinacion'), punta: opt('punta'), anchoGlifo: num('ancho'),
    remate: opt('remate'), cerdas: num('cerdas'),
    relleno: resto.includes('--hueco') ? 'hueco' : undefined,
  }));
  console.log(`✒  ${salida}`);
} else {
  console.log(`tipos.mjs — la fábrica de tipografías

  catalogo  salida.html        hoja visual: esqueletos × pinceles + juego completo
  juego     [--alfabeto X]     lista los glifos disponibles
  pinceles                     lista los pinceles y qué hace cada uno
  bitmap    "texto" [--filas N]  rasteriza a rejilla ASCII
  texto     "texto" salida.svg   [--alfabeto --pincel --grosor --filo --tracking
                                  --inclinacion --punta --ancho --remate
                                  --cerdas N --hueco]

  alfabetos: ${Object.keys(ALFABETOS).join(', ')}
  pinceles:  ${Object.keys(PINCELES).join(', ')}
  remates:   ${Object.keys(REMATES).join(', ')}

  Cada alfabeto trae su ajuste de fábrica (pincel, filo, remate): "--alfabeto
  textura" a secas ya sale con filo −40° y remate de diamante.`);
}

export { ALFABETOS, PINCELES, resolver };
