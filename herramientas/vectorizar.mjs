#!/usr/bin/env node
/**
 * vectorizar.mjs — de PNG plano a SVG con trazos editables.
 *
 *   node herramientas/vectorizar.mjs <entrada.png> <salida.svg> [opciones]
 *
 *   --colores  a,b,c      paleta fija en hex (recomendado para logos)
 *   --n        N          si no se da paleta, cuántos colores cuantizar (def. 6)
 *   --quitar   a,b        colores que NO van al SVG (el fondo, normalmente)
 *   --minarea  N          descarta trazos con menos de N px de área (def. 12)
 *   --suave    N          0 = esquinas duras, 1 = default, 2 = muy redondo
 *   --recortar            recorta el lienzo a lo que quedó dibujado
 *   --sinzona  x,y,w,h    tira los trazos cuyo centro caiga aquí. Para la
 *                         estrellita/marca de agua que las IAs de imagen dejan
 *                         en una esquina. Se puede repetir.
 *   --solozona hex:x,y,w,h  ese color SÓLO sobrevive dentro de esa zona. Para
 *                         cuando un color legítimo de la marca coincide con el
 *                         borde suavizado y ensucia el resto. Se puede repetir.
 *   --fusionar hexA:hexB  antes de trazar, todo píxel del color A pasa a ser B.
 *                         Para los tonos intermedios que la imagen usa como
 *                         delineado: si se descartan quedan HUECOS por donde se
 *                         ve el fondo (rayas negras cruzando la figura); si se
 *                         fusionan con el color de al lado, desaparecen. Se
 *                         puede repetir.
 *   --cerrar   hex:N      cierre morfológico de radio N sobre ese color antes
 *                         de trazar: rellena las ranuras más angostas que 2N y
 *                         deja las anchas. Es la forma honesta de "que las
 *                         plumas se dividan más lejos del cuerpo" — las
 *                         hendiduras de junto al cuerpo son estrechas, las de
 *                         la punta son anchas.
 *   --pulir    hex:N      filtro de mayoría de radio N entre ese color y el
 *                         fondo: cada píxel se queda con lo que sean la mayoría
 *                         de sus vecinos. Quita el dentado de 1-2 px del borde
 *                         —los escalones que parecen z-fighting alrededor de las
 *                         plumas— sin mover la silueta. No toca los demás
 *                         colores, así que la estrella queda intacta.
 *   --tapar    hex:N      rellena con ese color los huecos de fondo de menos de
 *                         N px de área que queden encerrados. Mata las costuras
 *                         de 1-2 px que el cierre no alcanza y que se ven como
 *                         rayas del fondo cruzando la figura.
 *   --capas               agrupa por color en <g fill> — SVG más editable
 *
 * Este es el ADAPTADOR: hoy adentro va imagetracerjs (open source, local). Si
 * mañana lo cambiamos por un motor propio o por Adobe, cambia este archivo y
 * nada más. Ver herramientas/PENDIENTES.md, entrada 1.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ── argumentos ────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const USO = 'Uso: node herramientas/vectorizar.mjs <entrada.png> <salida.svg> '
  + '[--colores hex,hex] [--n N] [--quitar hex,hex] [--minarea N] [--suave N] [--recortar] [--volcar dbg.png]';
const opt = (n, d) => { const i = args.indexOf('--' + n); return i === -1 ? d : args[i + 1]; };
const bandera = n => args.includes('--' + n);

const entrada = args[0];
const salida = opt('salida', args[1]?.startsWith('--') ? undefined : args[1]);
if (!entrada || !salida) {
  if (args[1]?.startsWith('--')) console.error(`Falta la salida: "${args[1]}" es una bandera.`);
  console.error(USO);
  process.exit(1);
}

const hexARgb = h => {
  const s = h.trim().replace('#', '');
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16),
           b: parseInt(s.slice(4, 6), 16), a: 255 };
};
const norm = h => '#' + h.trim().replace('#', '').toUpperCase();

const paleta = opt('colores') ? opt('colores').split(',').map(hexARgb) : null;
const quitar = new Set((opt('quitar') || '').split(',').filter(Boolean).map(norm));
// Las banderas repetibles se juntan a mano; indexOf sólo ve la primera.
const repetida = nombre => args.reduce((acc, a, i) => {
  if (a === '--' + nombre && args[i + 1]) acc.push(args[i + 1]);
  return acc;
}, []);

const sinZona = repetida('sinzona').map(v => {
  const [x, y, w, h] = v.split(',').map(Number);
  return { x, y, w, h };
});

const soloZona = repetida('solozona').map(v => {
  const [hex, caja] = v.split(':');
  const [x, y, w, h] = caja.split(',').map(Number);
  return { color: norm(hex), x, y, w, h };
});

const cerrar = repetida('cerrar').map(v => {
  const [hex, n] = v.split(':');
  return { color: hexARgb(hex), radio: Number(n) };
});

const tapar = repetida('tapar').map(v => {
  const [hex, n] = v.split(':');
  return { color: hexARgb(hex), area: Number(n) };
});

const fusionar = repetida('fusionar').map(v => {
  const [a, b] = v.split(':');
  return { de: hexARgb(a), a: hexARgb(b) };
});

const pulir = repetida('pulir').map(v => {
  const [hex, n] = v.split(':');
  return { color: hexARgb(hex), radio: Number(n) };
});
const minArea = Number(opt('minarea', 12));
const suave = Number(opt('suave', 1));
const nColores = Number(opt('n', 6));

/* ── el motor ──────────────────────────────────────────────────────────── */
// imagetracerjs necesita un ImageData. El único lugar donde tenemos un decoder
// de PNG confiable es el navegador que ya viene en la caja, así que ahí corre
// todo: decodifica, cuantiza y traza.
const RAICES = ['puppeteer', 'puppeteer-core'].flatMap(p => [
  new URL(`./node_modules/${p}/`, import.meta.url).pathname,
  `/home/user/mazi-central/node_modules/${p}/`,
]);
let puppeteer = null;
for (const n of ['puppeteer', 'puppeteer-core']) {
  if (puppeteer) break;
  try { puppeteer = (await import(n)).default; } catch { /* seguimos */ }
}
for (const raiz of RAICES) {
  if (puppeteer) break;
  try {
    const pkg = JSON.parse(readFileSync(raiz + 'package.json', 'utf8'));
    puppeteer = (await import(raiz + (pkg.module || pkg.main))).default;
  } catch { /* siguiente */ }
}
if (!puppeteer) {
  console.error('Falta puppeteer.  cd herramientas && npm i puppeteer-core');
  process.exit(1);
}

const TRAZADOR = new URL('./node_modules/imagetracerjs/imagetracer_v1.2.6.js', import.meta.url).pathname;
let fuenteTrazador;
try { fuenteTrazador = readFileSync(TRAZADOR, 'utf8'); }
catch {
  console.error('Falta imagetracerjs.  cd herramientas && npm i imagetracerjs');
  process.exit(1);
}

const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const navegador = await puppeteer.launch({
  headless: true, executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const pagina = await navegador.newPage();
await pagina.addScriptTag({ content: fuenteTrazador });

const b64 = readFileSync(resolve(entrada)).toString('base64');

const res = await pagina.evaluate(async (b64, cfg) => {
  const fusionarCfg = cfg.fusionar;
  const pulirCfg = cfg.pulir;
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const datos = ctx.getImageData(0, 0, c.width, c.height);

  // PRE-CUANTIZACIÓN. Sin esto, los bordes suavizados de la imagen (el
  // antialiasing) forman tonos intermedios que el trazador toma por un color
  // más: en la primera prueba salió una capa fantasma de 309 trazos que era
  // puro contorno entre el violeta y el fondo. Aquí cada píxel se manda al
  // color más cercano de la paleta, así que sólo quedan las capas que pedimos.
  if (cfg.paleta) {
    const d = datos.data, pal = cfg.paleta;
    for (let i = 0; i < d.length; i += 4) {
      let mejor = 0, min = Infinity;
      for (let k = 0; k < pal.length; k++) {
        const dr = d[i] - pal[k].r, dg = d[i + 1] - pal[k].g, db = d[i + 2] - pal[k].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < min) { min = dist; mejor = k; }
      }
      d[i] = pal[mejor].r; d[i + 1] = pal[mejor].g; d[i + 2] = pal[mejor].b; d[i + 3] = 255;
    }
    ctx.putImageData(datos, 0, 0);
  }

  // FUSIÓN de colores. Va antes del cierre: si un tono intermedio se fusiona con
  // el color grande, el cierre ya trabaja sobre la figura completa.
  if (fusionarCfg.length) {
    const d = datos.data;
    for (let i = 0; i < d.length; i += 4) {
      for (const { de, a } of fusionarCfg) {
        if (d[i] === de.r && d[i + 1] === de.g && d[i + 2] === de.b) {
          d[i] = a.r; d[i + 1] = a.g; d[i + 2] = a.b; d[i + 3] = 255;
          break;
        }
      }
    }
    ctx.putImageData(datos, 0, 0);
  }

  // CIERRE MORFOLÓGICO por color: dilatar y luego erosionar con el mismo radio.
  // Rellena las hendiduras más angostas que 2·radio y devuelve el contorno
  // exterior a su sitio, así que el ala engorda junto al cuerpo (ranuras
  // estrechas) sin perder la separación de las puntas (ranuras anchas).
  //
  // Se hace con la transformada de distancia por ejes (dos pasadas de mínimos,
  // ida y vuelta) en lugar de barrer un disco por píxel: O(n) en vez de
  // O(n·radio²). Con imágenes de 1400×768 la diferencia es de segundos a
  // instantáneo.
  if (cfg.cerrar.length) {
    const d = datos.data, W = c.width, H = c.height, N = W * H;
    const dist = new Float32Array(N);
    const INF = 1e9;

    // Distancia euclidiana aproximada al conjunto marcado (chamfer 3×3, dos
    // pasadas). Suficiente para radios chicos y sin sesgo diagonal grave.
    const transformada = dentro => {
      for (let i = 0; i < N; i++) dist[i] = dentro[i] ? 0 : INF;
      const paso = (i, j, peso) => {
        const v = dist[j] + peso;
        if (v < dist[i]) dist[i] = v;
      };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (x > 0) paso(i, i - 1, 1);
        if (y > 0) paso(i, i - W, 1);
        if (x > 0 && y > 0) paso(i, i - W - 1, 1.414);
        if (x < W - 1 && y > 0) paso(i, i - W + 1, 1.414);
      }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x;
        if (x < W - 1) paso(i, i + 1, 1);
        if (y < H - 1) paso(i, i + W, 1);
        if (x < W - 1 && y < H - 1) paso(i, i + W + 1, 1.414);
        if (x > 0 && y < H - 1) paso(i, i + W - 1, 1.414);
      }
    };

    for (const { color, radio } of cfg.cerrar) {
      const es = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const p = i * 4;
        es[i] = (d[p] === color.r && d[p + 1] === color.g && d[p + 2] === color.b) ? 1 : 0;
      }
      // Dilatación: todo lo que quede a ≤radio del color, entra.
      transformada(es);
      const dilatado = new Uint8Array(N);
      for (let i = 0; i < N; i++) dilatado[i] = dist[i] <= radio ? 1 : 0;
      // Erosión del dilatado: se mide distancia al COMPLEMENTO y se exige >radio.
      const fuera = new Uint8Array(N);
      for (let i = 0; i < N; i++) fuera[i] = dilatado[i] ? 0 : 1;
      transformada(fuera);
      // Lo que sobrevive al cierre y antes no era del color: se pinta — pero
      // SÓLO sobre el fondo. Sin esta restricción el cierre también rellena los
      // huecos interiores que son parte de la marca: con radio 9 se tragaba la
      // estrella del pecho. El fondo es, por convención, el primer color de la
      // paleta.
      const f = cfg.paleta?.[0];
      for (let i = 0; i < N; i++) {
        if (dist[i] > radio && !es[i]) {
          const p = i * 4;
          if (f && !(d[p] === f.r && d[p + 1] === f.g && d[p + 2] === f.b)) continue;
          d[p] = color.r; d[p + 1] = color.g; d[p + 2] = color.b; d[p + 3] = 255;
        }
      }
    }
    ctx.putImageData(datos, 0, 0);
  }

  // PULIDO por mayoría. El borde que sale del cierre viene escalonado: dientes
  // de uno o dos píxeles que el trazador convierte en zigzag y se leen como
  // z-fighting alrededor de las plumas. Aquí cada píxel se queda con lo que sean
  // la mayoría de sus vecinos, así que los dientes se caen y la silueta se
  // queda donde estaba.
  //
  // El conteo va con imagen integral: el total de una ventana son cuatro
  // lecturas, no (2r+1)² sumas. Sin eso, radio 3 sobre 1408×768 son 50 millones
  // de operaciones por pasada.
  //
  // Sólo intercambia entre el color y el FONDO. Los demás colores no se tocan:
  // si el pulido pudiera comerse cualquier cosa, se llevaría la estrella.
  if (pulirCfg.length) {
    const d = datos.data, W = c.width, H = c.height, N = W * H;
    const f = cfg.paleta?.[0];
    if (f) {
      for (const { color, radio } of pulirCfg) {
        const es = new Uint8Array(N);
        const elegible = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          const p = i * 4;
          const esColor = d[p] === color.r && d[p + 1] === color.g && d[p + 2] === color.b;
          const esFondo = d[p] === f.r && d[p + 1] === f.g && d[p + 2] === f.b;
          es[i] = esColor ? 1 : 0;
          elegible[i] = (esColor || esFondo) ? 1 : 0;
        }
        // Integrales de "es color" y de "es elegible", con borde de ceros.
        const A = (W + 1) * (H + 1);
        const sumaC = new Int32Array(A), sumaE = new Int32Array(A);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x, j = (y + 1) * (W + 1) + (x + 1);
            sumaC[j] = es[i] + sumaC[j - 1] + sumaC[j - W - 1] - sumaC[j - W - 2];
            sumaE[j] = elegible[i] + sumaE[j - 1] + sumaE[j - W - 1] - sumaE[j - W - 2];
          }
        }
        const ventana = (S, x0, y0, x1, y1) => {
          const a = y0 * (W + 1) + x0, b = y0 * (W + 1) + x1 + 1;
          const cc = (y1 + 1) * (W + 1) + x0, dd = (y1 + 1) * (W + 1) + x1 + 1;
          return S[dd] - S[b] - S[cc] + S[a];
        };
        const nuevo = new Uint8Array(es);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (!elegible[i]) continue;
            const x0 = Math.max(0, x - radio), y0 = Math.max(0, y - radio);
            const x1 = Math.min(W - 1, x + radio), y1 = Math.min(H - 1, y + radio);
            const conColor = ventana(sumaC, x0, y0, x1, y1);
            const conVoto = ventana(sumaE, x0, y0, x1, y1);
            if (conVoto > 0) nuevo[i] = conColor * 2 > conVoto ? 1 : 0;
          }
        }
        for (let i = 0; i < N; i++) {
          if (!elegible[i] || nuevo[i] === es[i]) continue;
          const p = i * 4, v = nuevo[i] ? color : f;
          d[p] = v.r; d[p + 1] = v.g; d[p + 2] = v.b; d[p + 3] = 255;
        }
      }
      ctx.putImageData(datos, 0, 0);
    }
  }

  // TAPAR HUECOS. El cierre engorda la figura, pero deja costuras de uno o dos
  // píxeles donde dos regiones casi se tocan; el trazador las convierte en
  // rayas del fondo cruzando el ala. Aquí se etiquetan las manchas de fondo por
  // inundación y se rellenan las que no alcanzan el área mínima. El fondo de
  // verdad es una sola mancha enorme, así que nunca cae en el filtro.
  if (cfg.tapar.length) {
    const d = datos.data, W = c.width, H = c.height, N = W * H;
    const f = cfg.paleta?.[0];
    if (f) {
      const esFondo = i => {
        const p = i * 4;
        return d[p] === f.r && d[p + 1] === f.g && d[p + 2] === f.b;
      };
      const visto = new Uint8Array(N);
      const cola = new Int32Array(N);
      for (const { color, area } of cfg.tapar) {
        for (let inicio = 0; inicio < N; inicio++) {
          if (visto[inicio] || !esFondo(inicio)) continue;
          // Inundación iterativa (con recursión se desborda la pila en 4 vecinos
          // sobre un millón de píxeles).
          let cab = 0, fin = 0, n = 0;
          cola[fin++] = inicio; visto[inicio] = 1;
          const mancha = [];
          while (cab < fin) {
            const i = cola[cab++];
            mancha.push(i); n++;
            const x = i % W, y = (i - x) / W;
            const vecinos = [
              x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1,
              y > 0 ? i - W : -1, y < H - 1 ? i + W : -1,
            ];
            for (const v of vecinos) {
              if (v >= 0 && !visto[v] && esFondo(v)) { visto[v] = 1; cola[fin++] = v; }
            }
          }
          if (n < area) {
            for (const i of mancha) {
              const p = i * 4;
              d[p] = color.r; d[p + 1] = color.g; d[p + 2] = color.b; d[p + 3] = 255;
            }
          }
        }
      }
      ctx.putImageData(datos, 0, 0);
    }
  }

  // Volcado de depuración: la imagen tal como la va a ver el trazador, después
  // de cuantizar, cerrar y tapar. Cuando el SVG sale raro, mirar esto es la
  // diferencia entre arreglarlo y adivinar.
  const volcado = cfg.volcar ? c.toDataURL('image/png') : null;

  const opciones = {
    // Trazo: menos tolerancia = más fiel; los logos aguantan bastante.
    ltres: 0.5 + cfg.suave * 0.5,
    qtres: 0.5 + cfg.suave * 0.5,
    pathomit: cfg.minArea,
    rightangleenhance: true,
    // Color: con paleta fija no hay muestreo, que es lo que mete trazos basura.
    colorsampling: cfg.paleta ? 0 : 2,
    numberofcolors: cfg.paleta ? cfg.paleta.length : cfg.nColores,
    mincolorratio: 0,
    // Con paleta fija, UN ciclo: los ciclos extra son k-means que recentra los
    // colores y me devolvía #AC21EC donde pedí #AD21ED. Chico el corrimiento,
    // pero rompe el descarte por color y contamina la marca.
    colorquantcycles: cfg.paleta ? 1 : 4,
    // Salida
    strokewidth: 0,
    linefilter: true,
    scale: 1,
    blurradius: 0,
    viewbox: true,
    desc: false,
    roundcoords: 2,     // dos decimales: archivo chico sin perder curva
  };
  if (cfg.paleta) opciones.pal = cfg.paleta;

  // Se traza a estructura, no directo a SVG: así se pueden tirar capas por
  // color (el fondo) antes de escribir el archivo.
  const ti = ImageTracer.imagedataToTracedata(datos, opciones);
  const hex = ([r, g, b]) => '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();

  const capas = ti.layers.map((capa, i) => {
    const p = ti.palette[i];
    return { color: hex([p.r, p.g, p.b]), alpha: p.a, trazos: capa.length };
  });

  // Reconstrucción del SVG capa por capa, saltando las descartadas. El descarte
  // compara por CERCANÍA, no por igualdad: si el motor corre el color un par de
  // unidades, el fondo sigue siendo el fondo.
  const cerca = (a, b) => {
    const [r1, g1, b1] = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
    const [r2, g2, b2] = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 < 400;   // ~20 por canal
  };
  // Se devuelve trazo por trazo (no un bloque de texto) para poder filtrar por
  // zona, agrupar por capa y recortar el lienzo del lado de Node.
  const trazos = [];
  for (let i = 0; i < ti.layers.length; i++) {
    const p = ti.palette[i];
    const color = hex([p.r, p.g, p.b]);
    if (p.a < 8 || cfg.quitar.some(q => cerca(color, q))) continue;
    for (let j = 0; j < ti.layers[i].length; j++) {
      // svgpathstring(tracedata, nºcapa, nºtrazo, opciones) — índices, no
      // objetos. Devuelve un <path …/> completo, o vacío si lo filtró.
      const s = ImageTracer.svgpathstring(ti, i, j, opciones);
      const d = s.match(/ d="([^"]+)"/);
      if (d) trazos.push({ color, d: d[1] });
    }
  }

  return { w: c.width, h: c.height, capas, trazos, volcado };
}, b64, { paleta, quitar: [...quitar], minArea, suave, nColores, cerrar, tapar, fusionar, pulir, volcar: !!opt('volcar') });

await navegador.close();

if (opt('volcar') && res.volcado) {
  const b = Buffer.from(res.volcado.split(',')[1], 'base64');
  writeFileSync(resolve(opt('volcar')), b);
  console.log(`🔍 volcado: ${opt('volcar')}`);
}

/* ── filtro por zona, recorte y escritura ──────────────────────────────── */
const caja = d => {
  const n = [...d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)];
  if (!n.length) return null;
  const xs = n.map(m => +m[1]), ys = n.map(m => +m[2]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

const enCaja = (cx, cy, z) => cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h;

let tirados = 0;
const vivos = res.trazos.filter(t => {
  const b = caja(t.d);
  if (!b) return true;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;

  if (sinZona.some(z => enCaja(cx, cy, z))) { tirados++; return false; }

  // Si este color tiene zonas permitidas, fuera de ellas no existe.
  const permitidas = soloZona.filter(z => z.color === t.color);
  if (permitidas.length && !permitidas.some(z => enCaja(cx, cy, z))) { tirados++; return false; }

  return true;
});

let vb = `0 0 ${res.w} ${res.h}`;
if (bandera('recortar') && vivos.length) {
  const cajas = vivos.map(t => caja(t.d)).filter(Boolean);
  const pad = 4;
  const x0 = Math.max(0, Math.min(...cajas.map(b => b.x0)) - pad);
  const y0 = Math.max(0, Math.min(...cajas.map(b => b.y0)) - pad);
  const x1 = Math.min(res.w, Math.max(...cajas.map(b => b.x1)) + pad);
  const y1 = Math.min(res.h, Math.max(...cajas.map(b => b.y1)) + pad);
  vb = `${x0} ${y0} ${+(x1 - x0).toFixed(1)} ${+(y1 - y0).toFixed(1)}`;
}

// Agrupado por color: un <g fill> por capa deja el archivo editable a mano
// (cambiar el violeta de la marca es cambiar un atributo, no 40).
let cuerpo;
if (bandera('capas')) {
  const porColor = new Map();
  for (const t of vivos) (porColor.get(t.color) ?? porColor.set(t.color, []).get(t.color)).push(t.d);
  cuerpo = [...porColor].map(([color, ds]) =>
    `  <g fill="${color}">\n${ds.map(d => `    <path d="${d}"/>`).join('\n')}\n  </g>`).join('\n');
} else {
  cuerpo = vivos.map(t => `  <path fill="${t.color}" d="${t.d}"/>`).join('\n');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">\n${cuerpo}\n</svg>\n`;
writeFileSync(resolve(salida), svg);

console.log(`🖊  ${salida}`);
console.log(`   ${res.w}×${res.h} → viewBox ${vb}`);
console.log(`   ${vivos.length} trazos, ${(svg.length / 1024).toFixed(1)} KB`
  + (tirados ? `  (${tirados} tirados por zona)` : ''));
console.log('   capas detectadas:');
for (const c of res.capas) {
  const fuera = [...quitar].some(q => q === c.color) ? ' (descartada)' : '';
  const quedan = vivos.filter(t => t.color === c.color).length;
  console.log(`     ${c.color}  ${String(c.trazos).padStart(4)} trazos → ${quedan} en el SVG${fuera}`);
}
