// Ensambla el logo de Grupo Mazi a partir de las piezas vectorizadas:
//
//   · el AVE viene de la imagen plana (la del color bueno): trazos limpios,
//     estrella en el pecho, sin comillas (Carlos las quitó), con las plumas
//     cerradas de radio 5 para que se dividan más lejos del cuerpo.
//   · el ARCO viene de la imagen 4, que es la que él eligió: una media luna
//     que adelgaza hacia las puntas en vez de una banda de grosor constante.
//
// El arco se trae con su geometría transformada NUMÉRICAMENTE, no con un
// atributo transform: así todo el archivo vive en un solo sistema de
// coordenadas y se puede recortar, medir y editar sin sorpresas.
//
//   node marca/armar.mjs <ave.svg> <arco.svg> <salida.svg> [--arco ancho,abajo]
//
// --arco  ancho,abajo   ancho del arco y a qué altura quedan sus puntas, en
//                       coordenadas de la imagen del ave. Siempre centrado en
//                       el eje del ave. Para iterar hasta que las puntas se
//                       apoyen en las alas.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const [avePath, arcoPath, salidaPath] = args;
if (!avePath || !arcoPath || !salidaPath) {
  console.error('Uso: node marca/armar.mjs <ave.svg> <arco.svg> <salida.svg> [--arco ancho,abajo]');
  process.exit(1);
}
const opt = (n, d) => { const i = args.indexOf('--' + n); return i === -1 ? d : args[i + 1]; };

const r2 = n => Math.round(n * 100) / 100;

/* ── leer piezas ───────────────────────────────────────────────────────── */

// Devuelve [{ color, d }] y el viewBox de un SVG generado por vectorizar.mjs.
function leer(ruta) {
  const txt = readFileSync(resolve(ruta), 'utf8');
  const vb = txt.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number) ?? [0, 0, 0, 0];
  const trazos = [];
  // Los <g fill> agrupan por capa; los <path> pueden traer su propio fill.
  const bloques = [...txt.matchAll(/<g fill="([^"]+)">([\s\S]*?)<\/g>/g)];
  for (const [, color, dentro] of bloques) {
    for (const m of dentro.matchAll(/<path d="([^"]+)"\s*\/>/g)) trazos.push({ color, d: m[1] });
  }
  for (const m of txt.matchAll(/<path fill="([^"]+)" d="([^"]+)"\s*\/>/g)) {
    trazos.push({ color: m[1], d: m[2] });
  }
  return { vb, trazos };
}

// Aplica escala + traslación a todos los pares de coordenadas de un path.
// Todos los comandos que emite el trazador (M, L, Q, Z) usan coordenadas
// absolutas en pares, así que basta transformarlos en orden.
function mover(d, s, tx, ty) {
  let pares = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, n => {
    const v = Number(n);
    const esX = pares++ % 2 === 0;
    return String(r2(esX ? v * s + tx : v * s + ty));
  });
}

function cajaDe(trazos) {
  const xs = [], ys = [];
  for (const t of trazos) {
    const nums = [...t.d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)];
    for (const m of nums) { xs.push(+m[1]); ys.push(+m[2]); }
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const ave = leer(avePath);
const arco = leer(arcoPath);

/* ── colocar el arco ───────────────────────────────────────────────────── */

// El punto de partida salió de medir el hueco que dejaba el arco de la imagen
// plana (462..946 en x, abajo en 237), pero ese arco era una banda de grosor
// constante y el de la 4 es más plano: al escalarlo uniformemente sus puntas
// quedaban en el aire. Así que ancho y altura se ajustan a ojo verificando la
// captura, que para esto es lo único que sirve.
const [anchoDestino, abajoDestino] = (opt('arco', '560,255')).split(',').map(Number);

const cajaAve = cajaDe(ave.trazos);
const ejeAve = (cajaAve.x0 + cajaAve.x1) / 2;

const cajaArco = cajaDe(arco.trazos);
const anchoArco = cajaArco.x1 - cajaArco.x0;
const altoArco = cajaArco.y1 - cajaArco.y0;

// Escala UNIFORME. Estirar el arco en vertical para llenar el hueco lo
// deformaría y se perdería justo lo que Carlos escogió de él.
const s = anchoDestino / anchoArco;
const tx = ejeAve - (cajaArco.x0 + anchoArco / 2) * s;   // centrado en el eje del ave
const ty = abajoDestino - (cajaArco.y0 + altoArco) * s;

const arcoPuesto = arco.trazos.map(t => ({ color: t.color, d: mover(t.d, s, tx, ty) }));

/* ── componer ──────────────────────────────────────────────────────────── */

// El ARCO PRIMERO: va detrás del ave, como en la imagen 4. Encima quedaba
// cruzando el ala izquierda y se leía como si le atravesara el cuerpo; detrás,
// sus puntas se meten tras las alas y el conjunto respira.
const todo = [...arcoPuesto, ...ave.trazos];

const c = cajaDe(todo);
const pad = 6;
const vb = [r2(c.x0 - pad), r2(c.y0 - pad), r2(c.x1 - c.x0 + pad * 2), r2(c.y1 - c.y0 + pad * 2)];

// Agrupado por color, en el orden en que aparecieron.
const porColor = new Map();
for (const t of todo) {
  if (!porColor.has(t.color)) porColor.set(t.color, []);
  porColor.get(t.color).push(t.d);
}

const cuerpo = [...porColor].map(([color, ds]) =>
  `  <g fill="${color}">\n${ds.map(d => `    <path d="${d}"/>`).join('\n')}\n  </g>`).join('\n');

writeFileSync(resolve(salidaPath),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">\n${cuerpo}\n</svg>\n`);

console.log(`🕊  ${salidaPath}`);
console.log(`   arco: escala ${r2(s)}, movido a (${r2(tx)}, ${r2(ty)})`);
console.log(`   viewBox ${vb.join(' ')}`);
console.log(`   ${todo.length} trazos en ${porColor.size} capas: ${[...porColor.keys()].join(' ')}`);
