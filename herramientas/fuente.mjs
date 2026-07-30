#!/usr/bin/env node
/**
 * fuente.mjs — HERRAMIENTA MAZI · la fundidora.
 * ----------------------------------------------------------------------------
 * Convierte un alfabeto de `tipos.mjs` en una FUENTE DE VERDAD: un .ttf y un
 * .woff2 que se instalan en el sistema y se cargan en el navegador con
 * @font-face. Hasta hoy la tipografía de la casa sólo existía como SVG, o sea
 * que cada texto había que generarlo pieza por pieza. Con esto se escribe y ya.
 *
 * Era el pendiente #3 de `herramientas/PENDIENTES.md`, anotado con la condición
 * de construirlo "cuando haya un documento real que lo pida". El sitio lo pide.
 *
 *   node herramientas/fuente.mjs                      → mazi a sitio/fuente/
 *   node herramientas/fuente.mjs norma sitio/fuente   → otro alfabeto, otra ruta
 *
 * Sale: <nombre>.ttf · <nombre>.woff2 · <nombre>.css · prueba.html
 *
 * ── LA REGLA ──────────────────────────────────────────────────────────────
 * `opentype.js` y `wawoff2` son librerías abiertas que corren en nuestra
 * máquina: no hay servicio de nadie en medio, no hay cuenta que nos cierren, no
 * hay nada que subir. Eso es stack propio (`CLAUDE.md` §2). Lo que sí es nuestro
 * y no se delega es la parte de criterio, que son las cuatro trampas de abajo.
 *
 * ── LAS CUATRO TRAMPAS ────────────────────────────────────────────────────
 *
 * 1 · SENTIDO DE GIRO. Un glifo nuestro son varios trazos sueltos, y donde dos
 *     se cruzan —la X, la barra del 4— el relleno de TrueType usa regla de no
 *     cero: si los dos contornos giran al revés uno del otro, el cruce sale
 *     HUECO en vez de macizo. Hay que normalizar el giro de todos.
 *
 * 2 · PERO LOS ANILLOS NO SE TOCAN. El contorno de la O es un solo camino que
 *     va por fuera y regresa por dentro, y esa pareja al revés es justamente lo
 *     que le hace el hueco. Normalizar por el área firmada TOTAL respeta eso,
 *     porque voltea las dos mitades juntas y la relación se conserva.
 *
 * 3 · LOS DISCOS SON CURVAS. Los nudos y el punto de la i se dibujan con
 *     Béziers cúbicas, no con rectas. Hay que aplanarlas al leer el camino o el
 *     glifo sale con agujeros donde iban los discos.
 *
 * 4 · EL PESO. Nuestros contornos vienen densificados a propósito para que no
 *     se vean facetados en un logotipo de 400 px. En una fuente eso son miles de
 *     puntos por glifo y un archivo absurdo. Se simplifican con
 *     Ramer-Douglas-Peucker a una tolerancia que a tamaño de texto no se ve.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import opentype from 'opentype.js';
import { compress } from 'wawoff2';
import { componer, resolver, ALFABETOS } from './tipos.mjs';

/* ═══ MEDIDAS ══════════════════════════════════════════════════════════════ */
//
// En la rejilla de `tipos.mjs` la fila 0 es el alto de mayúscula y la 6 es la
// línea de base, así que un em nuestro mide 1.0 de mayúscula. En una fuente la
// mayúscula ocupa ~0.7 del em, y de ahí sale la escala.

const EM = 1000;
const CAJA = 700;                 // alto de mayúscula en unidades de la fuente
const ASC = 950;                  // deja aire para los acentos, que llegan a 933
const DESC = -260;                // los descendentes bajan a −233

const r0 = n => Math.round(n);

/* ═══ LEER EL CAMINO ═══════════════════════════════════════════════════════ */
//
// Trampa 3: hay que entender `C` además de `M L Z`, y aplanarla.

function contornosDe(d) {
  const fichas = d.match(/[MLCZ]|-?\d+(?:\.\d+)?/g) || [];
  const contornos = [];
  let actual = null, x = 0, y = 0, i = 0;
  const num = () => Number(fichas[i++]);

  while (i < fichas.length) {
    const op = fichas[i++];
    if (op === 'M') {
      if (actual && actual.length > 2) contornos.push(actual);
      x = num(); y = num();
      actual = [[x, y]];
    } else if (op === 'L') {
      x = num(); y = num();
      actual.push([x, y]);
    } else if (op === 'C') {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
      const P = 12;   // aplanado: doce tramos por cúbica sobra a tamaño de texto
      for (let k = 1; k <= P; k++) {
        const t = k / P, u = 1 - t;
        actual.push([
          u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      x = x3; y = y3;
    } else if (op === 'Z') {
      if (actual && actual.length > 2) contornos.push(actual);
      actual = null;
    }
  }
  if (actual && actual.length > 2) contornos.push(actual);
  return contornos;
}

/* ═══ ADELGAZAR ════════════════════════════════════════════════════════════ */
//
// Trampa 4: Ramer-Douglas-Peucker. Se queda el punto que más se aparta de la
// recta entre los extremos, y si ni el peor se aparta más que la tolerancia, todo
// ese tramo era una recta disfrazada de cien puntos.

function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts.at(-1);
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let peor = 0, idx = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    let dist;
    if (L2 === 0) dist = Math.hypot(px - ax, py - ay);
    else {
      let t = ((px - ax) * dx + (py - ay) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      dist = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }
    if (dist > peor) { peor = dist; idx = i; }
  }
  if (peor <= tol) return [pts[0], pts.at(-1)];
  return [...rdp(pts.slice(0, idx + 1), tol).slice(0, -1), ...rdp(pts.slice(idx), tol)];
}

const areaFirmada = pts => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return a / 2;
};

/* ═══ UN GLIFO ═════════════════════════════════════════════════════════════ */

function glifoDe(ch, op, tol) {
  // `componer` de un solo carácter, con alto 1: las coordenadas quedan en em
  // nuestros y la línea de base en y = 1.
  const p = componer(ch, { ...op, alto: 1 });
  const camino = new opentype.Path();

  for (const pieza of p.piezas) {
    for (let c of contornosDe(pieza.d)) {
      // a unidades de fuente: y hacia arriba, base en 0
      c = c.map(([x, y]) => [x * CAJA, (1 - y) * CAJA]);
      // el último punto repetido no aporta nada a un contorno cerrado
      if (c.length > 2 && Math.hypot(c[0][0] - c.at(-1)[0], c[0][1] - c.at(-1)[1]) < 0.01) c.pop();
      c = rdp(c, tol);
      if (c.length < 3) continue;
      // Trampas 1 y 2: giro normalizado por el área firmada TOTAL. En TrueType el
      // contorno de fuera va en sentido de reloj, o sea área negativa con y arriba.
      if (areaFirmada(c) > 0) c.reverse();
      camino.moveTo(r0(c[0][0]), r0(c[0][1]));
      for (let i = 1; i < c.length; i++) camino.lineTo(r0(c[i][0]), r0(c[i][1]));
      camino.close();
    }
  }

  const avance = (p.ancho + (op.tracking ?? 0)) * CAJA;
  return { camino, avance: r0(avance) };
}

/* ═══ FUNDIR ═══════════════════════════════════════════════════════════════ */

export function fundir(idAlfabeto = 'mazi', tol = 1.6) {
  const A = resolver(idAlfabeto);
  const op = { alfabeto: idAlfabeto };
  // El tracking del alfabeto se mete en el avance de cada glifo, para que el
  // texto salga bien espaciado sin pedirle `letter-spacing` a nadie.
  const tracking = (A.porDefecto || {}).tracking ?? 0.05;

  const glifos = [new opentype.Glyph({
    name: '.notdef', unicode: 0, advanceWidth: r0(0.4 * CAJA), path: new opentype.Path(),
  })];

  const saltar = new Set([' ']);
  const nombres = { ' ': 'space' };

  for (const ch of Object.keys(A.glifos)) {
    if (ch.length !== 1) continue;
    const { camino, avance } = glifoDe(ch, { ...op, tracking }, tol);
    glifos.push(new opentype.Glyph({
      name: nombres[ch] || `uni${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
      unicode: ch.codePointAt(0),
      advanceWidth: Math.max(1, avance),
      path: saltar.has(ch) ? new opentype.Path() : camino,
    }));
  }

  const nombre = (A.nombre || idAlfabeto).replace(/\s+/g, '');
  const fuente = new opentype.Font({
    familyName: nombre.startsWith("Mazi") ? nombre : `Mazi ${nombre}`,
    styleName: 'Regular',
    unitsPerEm: EM,
    ascender: ASC,
    descender: DESC,
    glyphs: glifos,
  });

  return { fuente, glifos, nombre };
}

/* ═══ CSS Y PRUEBA ═════════════════════════════════════════════════════════ */

const css = (familia, base) => `/* ${familia} — la tipografía de la casa.
   Generada por herramientas/fuente.mjs desde el alfabeto de tipos.mjs.
   No se edita a mano: se regenera. */

@font-face {
  font-family: "${familia}";
  src: url("${base}.woff2") format("woff2"),
       url("${base}.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* El tracking ya viene metido en el avance de cada glifo, así que no hace falta
   letter-spacing. Para titulares grandes, apretar un poco cae bien. */
:root { --mazi: "${familia}", system-ui, sans-serif; }
`;

const prueba = (familia, base) => `<!doctype html>
<meta charset="utf-8">
<title>${familia} — prueba de fuente</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${base}.css">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#120C1A;color:#EAE5E3;padding:40px 26px 70px;
       font:400 15px/1.6 system-ui,sans-serif}
  .wrap{max-width:1000px;margin:0 auto}
  h1{font:400 15px/1.4 system-ui;letter-spacing:.2em;text-transform:uppercase;
     color:#8B8296;margin:0 0 26px}
  section{border-top:1px solid #2A2036;padding:20px 0 6px;margin:0 0 14px}
  .et{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#8B8296;
      margin:0 0 12px}
  .m{font-family:var(--mazi);color:#EAE5E3;line-height:1.15;margin:0 0 10px}
  .t96{font-size:96px}.t56{font-size:56px}.t32{font-size:32px}
  .t20{font-size:20px}.t15{font-size:15px}.t11{font-size:11px}
  .reloj{background:#0b0b0d;border:1px solid #22222a;border-radius:12px;
         padding:26px;text-align:center}
  .reloj .m{color:#E8232A;font-size:120px;margin:0}
  .claro{background:#EAE5E3;border-radius:12px;padding:22px 26px}
  .claro .m{color:#120C1A}
  p.nota{color:#8B8296;font-size:13px;max-width:80ch}
</style>
<div class="wrap">
  <h1>${familia} · prueba de fuente real</h1>
  <p class="nota">Esto NO es SVG: es la fuente cargada con <code>@font-face</code> y el texto
  escrito como texto. Se puede seleccionar, copiar, buscar y leer con lector de pantalla.</p>

  <section>
    <p class="et">De dónde viene</p>
    <div class="reloj"><p class="m">10:23</p></div>
  </section>

  <section>
    <p class="et">Escala</p>
    <p class="m t96">GRUPO MAZI</p>
    <p class="m t56">Grupo Mazi</p>
    <p class="m t32">No lo hacemos en corto, lo hacemos a la larga.</p>
    <p class="m t20">Web · software · marketing · video · fotografía · gestión de negocios</p>
    <p class="m t15">Si no existe la herramienta, se construye la herramienta.</p>
    <p class="m t11">442 883 3786 · grupomazi.oficial@gmail.com</p>
  </section>

  <section>
    <p class="et">Fondo claro</p>
    <div class="claro">
      <p class="m t56">Grupo Mazi</p>
      <p class="m t20">Mañana · niño · año · español · ¿cuánto? · ¡órale!</p>
    </div>
  </section>

  <section>
    <p class="et">El juego completo</p>
    <p class="m t32">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
    <p class="m t32">abcdefghijklmnopqrstuvwxyz</p>
    <p class="m t32">0123456789 ¿? ¡! &amp; @ · /</p>
    <p class="m t32">ÁÉÍÓÚÜÑ áéíóúüñ</p>
  </section>
</div>
`;

/* ═══ CLI ══════════════════════════════════════════════════════════════════ */

const directo = process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (directo) {
  const id = process.argv[2] || 'mazi';
  const salida = process.argv[3] || 'sitio/fuente';
  if (!ALFABETOS[id]) {
    console.error(`No hay alfabeto "${id}". Hay: ${Object.keys(ALFABETOS).join(', ')}`);
    process.exit(1);
  }

  const { fuente, glifos, nombre } = fundir(id);
  const base = id;
  mkdirSync(salida, { recursive: true });

  const ttf = Buffer.from(fuente.toArrayBuffer());
  writeFileSync(join(salida, `${base}.ttf`), ttf);
  const woff2 = Buffer.from(await compress(ttf));
  writeFileSync(join(salida, `${base}.woff2`), woff2);

  const familia = nombre.startsWith("Mazi") ? nombre : `Mazi ${nombre}`;
  writeFileSync(join(salida, `${base}.css`), css(familia, base));
  writeFileSync(join(salida, 'prueba.html'), prueba(familia, base));

  const kb = n => `${(n / 1024).toFixed(1)} KB`;
  console.log(`✒  ${familia}  ·  ${glifos.length - 1} glifos`);
  console.log(`   ${join(salida, base)}.ttf    ${kb(ttf.length)}`);
  console.log(`   ${join(salida, base)}.woff2  ${kb(woff2.length)}   ← el que usa el sitio`);
  console.log(`   ${join(salida, base)}.css    @font-face listo`);
  console.log(`   ${join(salida, 'prueba.html')}   ábrelo para verla de verdad`);
}
