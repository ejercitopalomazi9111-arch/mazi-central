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
//   node marca/armar.mjs <ave.svg> <arco.svg> <salida.svg> [--arco ancho,abajo] [--encima] [--barras y,dentro,fuera,grosor] [--negro hex] [--estrella factor] [--contorno hex,grosor] [--romo]
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
const bandera = n => args.includes('--' + n);

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

// INVARIANTE DE TODO ESTE ARCHIVO: cada path se compone sólo de comandos con
// coordenadas ABSOLUTAS EN PARES — M, L, Q, C, Z. Nada de `A` (arco), cuyos
// parámetros son `rx ry rotación bandera bandera x y` y descuadran cualquier
// lectura por pares, ni comandos relativos. De eso dependen `mover` y `cajaDe`,
// y con ellos el recorte del lienzo y la colocación del arco. Los círculos y las
// puntas redondas se hacen con cúbicas (ver `circulo` y `domo`).
//
// Aplica escala + traslación a todos los pares de coordenadas de un path.
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

// Círculo con cuatro cúbicas. kappa = 4/3·(√2−1) es la constante de siempre
// para que una cúbica pase por el cuarto de circunferencia.
function circulo(cx, cy, r) {
  const k = 0.5522847498 * r;
  const P = (x, y) => `${r2(x)} ${r2(y)}`;
  return `M ${P(cx - r, cy)}`
    + ` C ${P(cx - r, cy - k)} ${P(cx - k, cy - r)} ${P(cx, cy - r)}`
    + ` C ${P(cx + k, cy - r)} ${P(cx + r, cy - k)} ${P(cx + r, cy)}`
    + ` C ${P(cx + r, cy + k)} ${P(cx + k, cy + r)} ${P(cx, cy + r)}`
    + ` C ${P(cx - k, cy + r)} ${P(cx - r, cy + k)} ${P(cx - r, cy)} Z`;
}

// Semicírculo de A a B (diametralmente opuestos) abombado hacia `dir`. Con una
// sola cúbica y controles a 4r/3 la aproximación es indistinguible a este tamaño.
function domo(ax, ay, bx, by, dx, dy, r) {
  const d = (4 / 3) * r;
  return ` C ${r2(ax + dx * d)} ${r2(ay + dy * d)}`
    + ` ${r2(bx + dx * d)} ${r2(by + dy * d)} ${r2(bx)} ${r2(by)}`;
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

// --negro cambia el negro de la marca. En fondo oscuro el #010101 desaparece:
// la mitad oscura del arco y las barras de la cintura dejan de existir. Para esa
// versión se sube a un tono que sí contrasta, conservando la dualidad
// oscuro/claro que el logo original tenía.
const NEGRO_DE = '#010101';
const negro = opt('negro', NEGRO_DE);
const arcoPuesto = arco.trazos.map(t => ({
  color: t.color === NEGRO_DE ? negro : t.color,
  d: mover(t.d, s, tx, ty),
}));

/* ── las barras de la cintura ──────────────────────────────────────────── */

// Dos líneas perpendiculares al eje, una por lado, que nacen DENTRO del ave y
// apuntan hacia afuera. Negras, como el arco.
//
// La altura y el alcance no son a ojo: se midió el ave fila por fila. La cintura
// —lo más angosto del cuerpo antes de la cola— está en y=470, donde el cuerpo va
// de 675 a 732 y el ala no vuelve a empezar hasta 833. Ahí caben 100 px de barra
// sin chocar con nada.
//
// Son DOS por lado, como un signo igual, en diagonal hacia afuera y abajo. No
// son rectángulos: cada una es una cuña curva — nace fina dentro del ave, se
// ensancha hacia afuera y se arquea.
//
//   --barras  y,dentro,fuera,grosor[,angulo,separacion]
//   --barras  y,dentro,fuera,grosorDentro,grosorFuera,angulo,separacion,curva
//
// dentro/fuera son distancias desde el eje; el ángulo va en grados y baja hacia
// afuera; la separación es PERPENDICULAR a la barra, no vertical, que es lo que
// hace que el par se lea como un "=" inclinado y no como dos rayas sueltas;
// `curva` desplaza el punto medio — positiva arquea hacia afuera (convexa hacia
// el exterior del ave), negativa al revés.
// Con cuatro o seis valores sale la barra recta de grosor constante.
const barras = [];
if (opt('barras')) {
  const v = opt('barras').split(',').map(Number);
  const [y, dentro, fuera] = v;
  const largos = v.length >= 8;
  const g0 = v[3];
  const g1 = largos ? v[4] : v[3];
  const angulo = largos ? v[5] : (v[4] ?? 0);
  const sep = largos ? v[6] : (v[5] ?? 0);
  const curva = largos ? v[7] : 0;
  // retranqueo: si viene, las dos barras de cada lado APUNTAN a un mismo vértice
  // pero arrancan a esta distancia de él, así que nunca se tocan. Sin él siguen
  // siendo paralelas separadas por `sep`.
  //
  // La primera versión de esto ponía un disco en el vértice y las barras naciendo
  // pegadas a él: se combinaban en una sola pieza, que es justo lo que Carlos NO
  // quería. Apuntar no es tocarse.
  const retranqueo = v[8] ?? 0;
  const conVertice = retranqueo > 0;

  const NEGRO = opt('negro', '#010101');
  const cuantas = sep > 0 || conVertice ? 2 : 1;

  // Con vértice, `dentro` y `fuera` se miden desde ÉL, no desde el eje, y la
  // apertura se calcula para que la separación al final sea `sep`. En el inicio
  // la separación queda proporcional: sep · retranqueo / fuera. Ese número tiene
  // que superar el grosor inicial o las barras se tocan otra vez.
  const apertura = conVertice ? 2 * Math.asin(Math.min(1, sep / (2 * fuera))) : 0;
  const huecoInicio = conVertice ? 2 * retranqueo * Math.sin(apertura / 2) - g0 : null;
  if (conVertice && huecoInicio <= 0) {
    console.warn(`   ⚠ las barras se tocan en el nacimiento (falta ${r2(-huecoInicio)} px):`
      + ' sube el retranqueo o la separación');
  }

  for (const lado of [1, -1]) {
    for (let k = 0; k < cuantas; k++) {
      // Con vértice el par diverge en ángulo; sin vértice se corre en paralelo.
      const grados = angulo * Math.PI / 180
        + (conVertice ? (k === 0 ? -apertura / 2 : apertura / 2) : 0);
      const ux = lado * Math.cos(grados), uy = Math.sin(grados);
      let px = -uy, py = ux;
      if (py < 0) { px = -px; py = -py; }

      const corrimiento = conVertice ? 0 : k * sep;
      const desde = conVertice ? retranqueo : dentro;
      const largo = conVertice ? fuera - retranqueo : fuera - dentro;

      // El vértice al que apuntan las cuatro barras: sobre el eje del ave.
      const vx = conVertice ? ejeAve : ejeAve + lado * dentro;
      const ax = vx + (conVertice ? ux * desde : 0) + px * corrimiento;
      const ay = y + (conVertice ? uy * desde : 0) + py * corrimiento;
      const bx = ax + ux * largo, by = ay + uy * largo;
      const mx = (ax + bx) / 2 + px * curva, my = (ay + by) / 2 + py * curva;
      const h0 = g0 / 2, h1 = g1 / 2, hm = (h0 + h1) / 2;

      // Punta redonda: un domo en el extremo exterior en vez del corte recto,
      // abombado en la dirección de la barra para que salga hacia AFUERA.
      const punta = bandera('romo')
        ? ` L ${r2(bx - px * h1)} ${r2(by - py * h1)}`
        : domo(bx + px * h1, by + py * h1, bx - px * h1, by - py * h1, ux, uy, h1);

      barras.push({ color: NEGRO, d:
          `M ${r2(ax + px * h0)} ${r2(ay + py * h0)}`
        + ` Q ${r2(mx + px * hm)} ${r2(my + py * hm)} ${r2(bx + px * h1)} ${r2(by + py * h1)}`
        + punta
        + ` Q ${r2(mx - px * hm)} ${r2(my - py * hm)} ${r2(ax - px * h0)} ${r2(ay - py * h0)} Z` });
    }
  }
}

/* ── la estrella ───────────────────────────────────────────────────────── */

// La estrella del pecho es el único trazo hueso que trae el ave (el arco usa su
// propio blanco). Se escala respecto a su propio centro, así que agrandarla no
// la mueve de sitio.
if (opt('estrella')) {
  const factor = Number(opt('estrella'));
  const HUESO = '#EAE5E3';
  for (const t of ave.trazos) {
    if (t.color !== HUESO) continue;
    const b = cajaDe([t]);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    let pares = 0;
    t.d = t.d.replace(/-?\d+(?:\.\d+)?/g, n => {
      const val = Number(n);
      const esX = pares++ % 2 === 0;
      const c = esX ? cx : cy;
      return String(r2(c + (val - c) * factor));
    });
  }
}

/* ── componer ──────────────────────────────────────────────────────────── */

// Orden de pintado. Detrás, las puntas del arco asoman por los huecos ENTRE las
// plumas y el arco parece entretejido con el ala — eso es lo que se ve mal.
// Encima, la punta se lee continua sobre el ala, como en la imagen 4.
// Las barras van SIEMPRE encima del ave: nacen dentro y tienen que verse sobre
// el violeta, que es donde su tramo interior existe.
const todo = bandera('encima')
  ? [...ave.trazos, ...arcoPuesto, ...barras]
  : [...arcoPuesto, ...ave.trazos, ...barras];

const c = cajaDe(todo);
const pad = 6;
const vb = [r2(c.x0 - pad), r2(c.y0 - pad), r2(c.x1 - c.x0 + pad * 2), r2(c.y1 - c.y0 + pad * 2)];

// Agrupado por color RESPETANDO EL ORDEN DE PINTADO. Un Map por color no sirve:
// las barras son negras igual que la mitad oscura del arco, así que se meterían
// en su grupo y acabarían pintándose donde va el arco — detrás del ave. Aquí un
// color repetido abre un grupo nuevo si en medio hubo otro color.
const grupos = [];
for (const t of todo) {
  const ultimo = grupos[grupos.length - 1];
  if (ultimo && ultimo.color === t.color) ultimo.ds.push(t.d);
  else grupos.push({ color: t.color, ds: [t.d] });
}

// --contorno hex,grosor: el filo claro alrededor de la figura, como en las
// referencias de Carlos. Es lo que hace que la marca exista sobre fondo oscuro
// sin tener que cambiarle los colores: el negro sigue siendo negro y el contorno
// lo dibuja.
//
// El trazo va CENTRADO, así que la mitad se come la silueta; por eso los grupos
// se pintan dos veces — primero sólo el contorno, con el trazo al doble, y
// encima el relleno limpio. El resultado es un filo por fuera de la forma.
const [contornoColor, contornoGrosor] = (opt('contorno') || '').split(',');
const conFilo = Boolean(contornoColor);

const pintar = ({ color, ds }, extra = '') =>
  `  <g fill="${color}"${extra}>\n${ds.map(d => `    <path d="${d}"/>`).join('\n')}\n  </g>`;

let cuerpo;
if (conFilo) {
  const g = Number(contornoGrosor || 6);
  const filo = ` stroke="${contornoColor}" stroke-width="${g * 2}"`
    + ' stroke-linejoin="round" stroke-linecap="round"';
  cuerpo = [
    ...grupos.map(gr => pintar({ color: contornoColor, ds: gr.ds }, filo)),
    ...grupos.map(gr => pintar(gr)),
  ].join('\n');
} else {
  cuerpo = grupos.map(gr => pintar(gr)).join('\n');
}

writeFileSync(resolve(salidaPath),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">\n${cuerpo}\n</svg>\n`);

console.log(`🕊  ${salidaPath}`);
console.log(`   arco: escala ${r2(s)}, movido a (${r2(tx)}, ${r2(ty)})`);
console.log(`   viewBox ${vb.join(' ')}`);
console.log(`   ${todo.length} trazos en ${grupos.length} capas: ${grupos.map(g => g.color).join(' ')}`);

// Verificación por MEDIDA, no por fórmula: ninguna barra debe cruzar el eje del
// ave, o las del lado izquierdo se encuentran con las del derecho y forman una
// punta y un rombo en el centro. Ya pasó una vez con el script viejo y la fórmula
// del hueco no lo detectaba, porque mide la distancia entre las dos barras de un
// mismo lado, no la de cada barra al eje.
for (let i = 0; i < barras.length; i++) {
  const b = cajaDe([barras[i]]);
  const cruza = b.x0 < ejeAve && b.x1 > ejeAve;
  if (cruza) {
    console.warn(`   ⚠ la barra ${i} CRUZA el eje (${r2(b.x0 - ejeAve)}..${r2(b.x1 - ejeAve)}):`
      + ' las de un lado se van a juntar con las del otro. Sube el retranqueo.');
  }
}
