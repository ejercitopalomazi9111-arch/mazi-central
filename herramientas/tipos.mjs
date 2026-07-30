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
 * ── LAS DOS PARTES QUE HAY QUE SEPARAR ────────────────────────────────────
 *
 * Un error fácil —y el que hubo que corregir aquí— es creer que cambiando el
 * pincel salen tipografías distintas. No: salen versiones de la MISMA letra. Una
 * tipografía es dos cosas independientes:
 *
 *   1 · EL ESQUELETO — la estructura de la letra. Si la O es un círculo o un
 *       hexágono, si la M tiene el vértice a la mitad o hasta abajo, si la A
 *       lleva travesaño alto o bajo. Esto es lo que hace que dos tipografías se
 *       vean distintas de verdad.
 *   2 · EL PINCEL — cómo se engorda ese esqueleto. Grosor uniforme, contraste de
 *       plumilla, presión de pincel real, punta de cuña. Es el acabado.
 *
 * Esqueleto × pincel = la matriz de posibilidades. Cambiar sólo el pincel es
 * cambiar el acabado de la misma letra.
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
 *   "a0 a6"              → recta de arriba-izquierda a abajo-izquierda
 *   "c0 e2 e4 c6 a4 a2 c0"  → tres o más nodos = curva suave que pasa por todos
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

const COL = { a: 0, b: 0.25, c: 0.5, d: 0.75, e: 1 };
const FILA = f => f / 6;   // 0 = alto de mayúscula, 6 = línea de base

// "c0 e2 e4 c6" → [[0.5,0], [1,0.33], …]
function nodos(cadena, an) {
  return cadena.trim().split(/\s+/).map(tok => {
    const m = /^([a-e])(-?\d)$/.exec(tok);
    if (!m) throw new Error(`nodo inválido: "${tok}"`);
    return [COL[m[1]] * an, FILA(Number(m[2]))];
  });
}

/* ═══ SUAVIZADO ════════════════════════════════════════════════════════════ */

// Catmull-Rom densificada: tres nodos o más describen una curva que PASA por
// todos, que es lo que hace que definir una letra sea poner puntos y ya.
function suavizar(p, porTramo = 14, cerrado = false) {
  if (p.length === 2) {
    return Array.from({ length: porTramo + 1 }, (_, i) => [
      p[0][0] + (p[1][0] - p[0][0]) * (i / porTramo),
      p[0][1] + (p[1][1] - p[0][1]) * (i / porTramo),
    ]);
  }
  const n = p.length;
  const at = i => cerrado ? p[(i % n + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
  const salida = [];
  const hasta = cerrado ? n : n - 1;
  for (let i = 0; i < hasta; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let j = 0; j < porTramo; j++) {
      const t = j / porTramo, t2 = t * t, t3 = t2 * t;
      salida.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
          + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
          + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!cerrado) salida.push(p[n - 1]);
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
    f: { an: 0.42, t: ['c1 c6', 'a2 e2'], nudos: ['c2'] },
    g: { an: 0.62, t: ['e2 e7 c8 a7', 'e3 c2 a3 a5 c6 e5'], nudos: ['e3'] },
    h: { an: 0.60, t: ['a0 a6', 'a3 c2 e3 e6'], nudos: ['a3'] },
    i: { an: 0.18, t: ['c2 c6', 'c0 c0'] },
    j: { an: 0.32, t: ['d2 d7 c8 a7', 'd0 d0'] },
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
    '@': { an: 0.86, t: ['d5 b5 b3 d3 d5 e4 e2 c0 a2 a4 c6 e5'] },
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
};

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

function contorno(pts, op) {
  const { grosor, pincel, filo, contraste, punta, cerrado, semilla } = op;
  const n = pts.length;
  const fn = PINCELES[pincel].f;

  const semi = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const t = i / (n - 1);
    let g = grosor * Math.max(0.05, fn(t, th, { filo, contraste }, semilla));
    // La punta de cuña sólo en los extremos LIBRES; donde hay unión, nunca.
    if (!cerrado && punta !== 'ninguno') {
      const z = 0.2;
      if ((punta === 'ambos' || punta === 'inicio') && t < z) g *= 0.15 + 0.85 * (t / z);
      if ((punta === 'ambos' || punta === 'fin') && t > 1 - z) g *= 0.15 + 0.85 * ((1 - t) / z);
    }
    return g / 2;
  };

  const lado = s => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] - dy / L * semi(i) * s, p[1] + dx / L * semi(i) * s];
  });

  const d = v => v.map(p => `${r2(p[0])} ${r2(p[1])}`).join(' L ');
  return `M ${d(lado(1))} L ${d(lado(-1).reverse())} Z`;
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

export function componer(texto, op = {}) {
  const {
    alfabeto = 'recto', pincel = 'uniforme', grosor = 0.13, filo = 90,
    contraste = 0.28, tracking = 0.05, anchoGlifo = 1, inclinacion = 0,
    punta = 'ninguno', alto = 100,
  } = op;

  const A = resolver(alfabeto);
  const esc = (A.escalaAncho ?? 1) * anchoGlifo;
  const partes = [];
  let x = grosor / 2;
  let sem = 0;

  for (const ch of texto) {
    let G = A.glifos[ch];
    if (!G) G = A.glifos[ch.toUpperCase()] || A.glifos[' '];
    const an = G.an * esc;
    const base = G.hereda ? A.glifos[G.hereda] : G;
    const trazos = base.t || [];
    const nudosG = base.nudos || [];

    for (const cadena of trazos) {
      const p = nodos(cadena, an);
      const cerrado = p.length > 2
        && Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]) < 1e-9;
      const pts = suavizar(cerrado ? p.slice(0, -1) : p, 14, cerrado)
        .map(([px, py]) => [px + x, py]);
      // Un punto solo (el punto de la i, el de la coma) se dibuja como disco.
      if (p.length === 2 && Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) < 1e-9) {
        partes.push(disco(p[0][0] + x, p[0][1], grosor * 0.62));
        continue;
      }
      partes.push(contorno(pts, { grosor, pincel, filo, contraste, punta, cerrado, semilla: sem++ }));
    }
    for (const nd of nudosG) {
      const [[nx, ny]] = nodos(nd, an);
      partes.push(disco(nx + x, ny, grosor / 2));
    }
    if (G.acento) {
      for (const p of ACENTOS[G.acento](an)) {
        const pts = suavizar(p, 10).map(([px, py]) => [px + x, py]);
        if (Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) < 1e-9) {
          partes.push(disco(p[0][0] + x, p[0][1], grosor * 0.55));
        } else {
          partes.push(contorno(pts, { grosor: grosor * 0.85, pincel, filo, contraste,
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

  return { ancho: ancho * alto + Math.abs(sh) * alto, alto, ds: partes.map(tr) };
}

export function svg(texto, op = {}, tinta = '#EAE5E3') {
  const p = componer(texto, op);
  const m = (op.alto ?? 100) * 0.18;
  const y0 = -m - (op.alto ?? 100) * 0.34;   // sitio para acentos
  const h = p.alto * 1.34 + m * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${y0} ${p.ancho + m * 2} ${h}">`
    + p.ds.map(d => `<path d="${d}" fill="${tinta}"/>`).join('') + '</svg>';
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
  { a: 'recto', p: 'plumilla', g: 0.19, filo: 90, nota: 'Contraste vertical clásico.' },
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
  .lock{display:flex;align-items:center;gap:16px;background:#120C1A;border:1px solid #2A2036}
  .lock img{height:46px}
  .lock svg{height:26px}
  article p{color:#A99FB4;font-size:13px;margin:10px 0 0}
  .juego{background:#1a1024;border:1px solid #2A2036;border-radius:10px;padding:20px 24px}
  .juego svg{height:46px;width:auto;display:block;margin:0 0 10px}
</style>
<div class="wrap">
  <h1>tipos.mjs · la fábrica de tipografías</h1>
  <p class="sub">Dos cosas independientes, y confundirlas fue el error que hubo que corregir:
  el <b>esqueleto</b> es la estructura de la letra —si la O es círculo o hexágono, si la M baja
  hasta la base— y el <b>pincel</b> es cómo se engorda. Cambiar sólo el pincel da versiones de la
  misma letra; cambiar el esqueleto da tipografías distintas. Aquí hay
  <b>${Object.keys(ALFABETOS).length} esqueletos × ${Object.keys(PINCELES).length} pinceles</b>,
  sobre un juego de <b>${Object.keys(juego).length} caracteres</b> editable desde una rejilla.</p>

  <h3>El juego completo · esqueleto recto</h3>
  <div class="juego">
    ${filas.map(f => svg(f, { grosor: 0.13 }, '#EAE5E3')).join('\n    ')}
  </div>

  <h3>Los ${COMBOS.length} tipos</h3>
  ${COMBOS.map(bloqueCombo).join('\n')}
</div>
`);
  console.log(`✒  ${salida}  ·  ${COMBOS.length} tipos`);
}

/* ═══ CLI ══════════════════════════════════════════════════════════════════ */

const [, , cmd, ...resto] = process.argv;
const opt = (n, d) => { const i = resto.indexOf('--' + n); return i === -1 ? d : resto[i + 1]; };

if (cmd === 'catalogo') {
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
    alfabeto: opt('alfabeto', 'recto'), pincel: opt('pincel', 'uniforme'),
    grosor: +opt('grosor', 0.13), filo: +opt('filo', 90),
    tracking: +opt('tracking', 0.05), inclinacion: +opt('inclinacion', 0),
    punta: opt('punta', 'ninguno'), anchoGlifo: +opt('ancho', 1),
  }));
  console.log(`✒  ${salida}`);
} else {
  console.log(`tipos.mjs — la fábrica de tipografías

  catalogo  salida.html        hoja visual: esqueletos × pinceles + juego completo
  juego     [--alfabeto X]     lista los glifos disponibles
  pinceles                     lista los pinceles y qué hace cada uno
  bitmap    "texto" [--filas N]  rasteriza a rejilla ASCII
  texto     "texto" salida.svg   [--alfabeto --pincel --grosor --filo
                                  --tracking --inclinacion --punta --ancho]

  alfabetos: ${Object.keys(ALFABETOS).join(', ')}
  pinceles:  ${Object.keys(PINCELES).join(', ')}`);
}

export { ALFABETOS, PINCELES, resolver };
