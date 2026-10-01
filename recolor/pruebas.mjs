/* CAMBIAR COLOR · pruebas en un navegador de verdad (teléfono 390×844 y compu 1280×800).
   Comprueba el EFECTO, no que el botón exista: que tocar el cabello agarra el
   cabello con sus sombras y nada más, que el color nuevo conserva la textura
   (la luz de antes y la de después van juntas), que el pincel no se sale a la
   playera, que «Separar por tono» separa, que deshacer deshace y que la
   descarga sale al tamaño ORIGINAL con el cambio puesto.
     node recolor/pruebas.mjs                                                   */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TIPOS = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.wasm': 'application/wasm', '.tflite': 'application/octet-stream' };
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(RAIZ, u); if (!f.startsWith(RAIZ)) { s.writeHead(403); s.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); s.end(d); });
}).listen(0);
const BASE = `http://localhost:${srv.address().port}/recolor/`;

let bien = 0, mal = 0;
const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

/* La foto de prueba, 2400×1600 (más grande que el tamaño de trabajo, para ver
   que la descarga sale entera): a la izquierda «cabello» café con mechones de
   luz y sombra, a la derecha una «playera» azul, y fondo gris claro. */
const OW = 2400, OH = 1600;
const zona = `(x, y) => x < .45 * W && y < .8 * H ? 'cabello' : x >= .55 * W ? 'playera' : 'fondo'`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recolor-'));
async function fotoPrueba(pg){
  const b64 = await pg.evaluate(([W, H, zona]) => {
    const z = eval(zona), k = document.createElement('canvas'); k.width = W; k.height = H;
    const x = k.getContext('2d'), im = x.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) {
      const j = (y * W + X) * 4, q = z(X, y); let c = [220, 220, 215];
      if (q === 'cabello') { const l = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(X / 23)) * (0.55 + 0.45 * Math.cos(y / 41) ** 2); c = [130 * l, 78 * l, 44 * l]; }
      else if (q === 'playera') { const l = 0.6 + 0.4 * Math.sin(y / 30) ** 2; c = [40 * l, 80 * l, 205 * l]; }
      d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
    }
    x.putImageData(im, 0, 0); return k.toDataURL('image/png').split(',')[1];
  }, [OW, OH, zona]);
  const f = path.join(tmp, 'retrato.png'); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f;
}

/* qué fracción de cada zona está elegida (máscara > 127) */
const elegido = (pg) => pg.evaluate((zona) => {
  const { mascara: m, W, H } = window.__color, z = eval(zona), r = { cabello: [0, 0], playera: [0, 0], fondo: [0, 0] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = r[z(x, y)]; q[1]++; if (m[y * W + x] > 127) q[0]++; }
  return Object.fromEntries(Object.entries(r).map(([k, [a, b]]) => [k, a / b]));
}, zona);
/* lo que se ve en pantalla comparado con la foto original, zona por zona */
const pantalla = (pg) => pg.evaluate((zona) => {
  const c = document.querySelector('#vista'), W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data;
  const z = eval(zona), ini = window.__inicial;
  const r = { cabello: { n: 0, R: 0, G: 0, B: 0, igual: 0, lx: [], ly: [] }, playera: { n: 0, R: 0, G: 0, B: 0, igual: 0 }, fondo: { n: 0, R: 0, G: 0, B: 0, igual: 0 } };
  for (let y = 4; y < H - 4; y += 3) for (let x = 4; x < W - 4; x += 3) {
    const q = z(x, y), j = (y * W + x) * 4, s = r[q];
    // lejos de las orillas entre zonas, donde el borde suave mezcla
    if (q !== z(x - 6, y) || q !== z(x + 6, y) || q !== z(x, y - 6) || q !== z(x, y + 6)) continue;
    s.n++; s.R += d[j]; s.G += d[j + 1]; s.B += d[j + 2];
    if (Math.abs(d[j] - ini[j]) + Math.abs(d[j + 1] - ini[j + 1]) + Math.abs(d[j + 2] - ini[j + 2]) <= 3) s.igual++;
    if (s.lx) { s.lx.push(.3 * ini[j] + .59 * ini[j + 1] + .11 * ini[j + 2]); s.ly.push(.3 * d[j] + .59 * d[j + 1] + .11 * d[j + 2]); }
  }
  const corr = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n; let sab = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb); };
  const res = {};
  for (const [k, s] of Object.entries(r)) res[k] = { R: s.R / s.n, G: s.G / s.n, B: s.B / s.n, igual: s.igual / s.n, ...(s.lx ? { corr: corr(s.lx, s.ly) } : {}) };
  return res;
}, zona);
/* pantalla ← coordenadas de la imagen de trabajo */
const enPantalla = (pg, fx, fy) => pg.evaluate(([fx, fy]) => { const r = document.querySelector('#vista').getBoundingClientRect(); return [r.left + fx * r.width, r.top + fy * r.height]; }, [fx, fy]);
const desborde = (pg) => pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);

const br = await chromium.launch();
let foto;
for (const [ancho, alto, nombre] of [[390, 844, 'teléfono'], [1280, 800, 'computadora']]) {
  console.log(`\n${nombre} ${ancho}×${alto}`);
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true, hasTouch: true });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); /* MediaPipe escribe sus avisos de arranque (INFO, W1001…) por console.error: no son errores */
  pg.on('console', (m) => m.type() === 'error' && !/^(INFO|[IWE]\d{4}) |XNNPACK|Feedback manager/.test(m.text()) && errores.push(m.text()));
  await pg.goto(BASE);
  foto ??= await fotoPrueba(pg);
  ok(await desborde(pg) <= 0, 'la portada no se sale de la pantalla');

  // abrir
  const [sel] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#soltar')]); await sel.setFiles(foto);
  await pg.waitForFunction(() => !document.querySelector('#editor').hidden && window.__color.W > 0);
  await pg.evaluate(() => { window.__inicial = window.__color.base.slice(); });
  // el modelo de partes corre en el teléfono; en esta foto no hay persona
  await pg.waitForFunction(() => !/Reconociendo/.test(document.querySelector('#partesEstado').textContent), null, { timeout: 60000 });
  const zs = await pg.evaluate(() => window.__color.zonas && window.__color.zonas.map((z) => z.length));
  ok(zs && zs.length === 6 && zs.every((n) => n === 1600 * 1067), `el modelo reconoce las seis partes de la foto (${zs ? zs.length : 'no cargó'})`);
  ok(/No encontré a una persona/.test(await pg.textContent('#partesEstado')) && !(await pg.isVisible('#partes [data-p="1"]')), 'sin persona en la foto, lo dice y esconde «Cabello», «Piel» y «Ropa»');
  const [W, H] = await pg.evaluate(() => [window.__color.W, window.__color.H]);
  ok(W === 1600 && H === 1067, `se trabaja a 1600 px de lado (${W}×${H})`);
  await pg.waitForTimeout(200);
  ok(await desborde(pg) <= 0, 'el editor no se sale de la pantalla');
  const chicos = await pg.evaluate(() => [...document.querySelectorAll('#editor button, #editor .interruptor, #editor input[type=range], .muestras label')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 20)));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.join(', ') : ''));
  const enVista = await pg.evaluate(() => { const r = document.querySelector('#vista').getBoundingClientRect(), e = document.querySelector('#escenario').getBoundingClientRect(); return r.width > 200 && r.left >= e.left - 1 && r.right <= e.right + 1 && r.bottom <= e.bottom + 1; });
  ok(enVista, 'la foto cabe entera en su recuadro');

  // tocar el cabello
  await pg.mouse.click(...await enPantalla(pg, 0.2, 0.4)); await pg.waitForTimeout(250);
  let e = await elegido(pg);
  ok(e.cabello > 0.97, `tocar el cabello agarra el cabello con sus sombras (${(e.cabello * 100).toFixed(1)} %)`);
  ok(e.playera === 0 && e.fondo < 0.003, `y nada de la playera ni del fondo (${(e.playera * 100).toFixed(2)} % · ${(e.fondo * 100).toFixed(2)} %)`);
  let v = await pantalla(pg);
  ok(v.cabello.B > v.cabello.R + 30, `se ve azul, el color elegido de entrada (R ${v.cabello.R | 0} · B ${v.cabello.B | 0})`);
  ok(v.cabello.corr > 0.95, `conserva la textura: la luz de antes y la de después van juntas (${v.cabello.corr.toFixed(3)})`);
  ok(v.playera.igual === 1 && v.fondo.igual === 1, 'la playera y el fondo no cambian ni un pixel');

  // la tolerancia rehace el toque
  await pg.fill('#tol', '4'); await pg.dispatchEvent('#tol', 'input'); await pg.waitForTimeout(200);
  const chico = (await elegido(pg)).cabello;
  await pg.fill('#tol', '18'); await pg.dispatchEvent('#tol', 'input'); await pg.waitForTimeout(200);
  ok(chico < 0.9 && (await elegido(pg)).cabello > 0.97, `mover «Qué tanto se parece» rehace el toque (${(chico * 100).toFixed(0)} % → entero)`);

  // otro color
  await pg.click('#muestras button[data-color="#C9A063"]'); await pg.waitForTimeout(200);
  v = await pantalla(pg);
  ok(v.cabello.R > v.cabello.B + 40 && v.cabello.R > 150, `«Rubio» lo vuelve rubio y más claro (R ${v.cabello.R | 0} · B ${v.cabello.B | 0})`);
  ok(v.cabello.corr > 0.95, `con los mismos mechones (${v.cabello.corr.toFixed(3)})`);
  await pg.uncheck('#igualar'); await pg.waitForTimeout(200);
  const sinIgualar = await pantalla(pg);
  ok(sinIgualar.cabello.R < v.cabello.R - 40, 'sin «Igualar la luz» se cambia el tono y lo oscuro sigue oscuro');
  await pg.check('#igualar');

  // antes
  const cb = await pg.locator('#comparar').boundingBox();
  await pg.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await pg.mouse.down(); await pg.waitForTimeout(200);
  ok((await pantalla(pg)).cabello.igual === 1, 'mantener «Antes» enseña la foto como estaba');
  await pg.mouse.up(); await pg.waitForTimeout(200);
  ok((await pantalla(pg)).cabello.igual < 0.1, 'y al soltar vuelve el color');

  // aplicar y deshacer
  await pg.click('#aplicar'); await pg.waitForTimeout(250);
  e = await elegido(pg);
  ok(e.cabello === 0 && await pg.evaluate(() => window.__color.ops.length) === 1, '«Listo» deja el color puesto y suelta lo elegido');
  ok((await pantalla(pg)).cabello.R > 150, 'el cabello se queda rubio');
  await pg.click('#deshacer'); await pg.waitForTimeout(250);
  ok((await elegido(pg)).cabello > 0.97 && await pg.evaluate(() => window.__color.ops.length) === 0, '«Deshacer» regresa a antes de aplicar');
  await pg.click('#aplicar'); await pg.waitForTimeout(250);

  // pincel que respeta los bordes
  await pg.click('#herramientas [data-h="pincel"]');
  await pg.fill('#radio', '120'); await pg.dispatchEvent('#radio', 'input');
  const trazo = async () => { const a = await enPantalla(pg, 0.3, 0.5), b = await enPantalla(pg, 0.8, 0.5); await pg.mouse.move(...a); await pg.mouse.down(); for (let k = 1; k <= 12; k++) await pg.mouse.move(a[0] + (b[0] - a[0]) * k / 12, a[1]); await pg.mouse.up(); await pg.waitForTimeout(200); };
  await trazo();
  e = await elegido(pg);
  ok(e.cabello > 0.05 && e.playera === 0, `el pincel pinta el cabello y no se sale a la playera (${(e.cabello * 100).toFixed(1)} % · ${(e.playera * 100).toFixed(2)} %)`);
  await pg.click('#deshacer');
  await pg.uncheck('#respetar'); await trazo();
  ok((await elegido(pg)).playera > 0.05, 'sin «respeta los bordes» pinta todo lo que toca');
  await pg.click('#deshacer'); await pg.check('#respetar');
  ok((await elegido(pg)).playera === 0, 'y «Deshacer» quita el trazo');

  // borrar
  await pg.click('#herramientas [data-h="tocar"]');
  await pg.mouse.click(...await enPantalla(pg, 0.8, 0.5)); await pg.waitForTimeout(200);
  const llena = (await elegido(pg)).playera;
  await pg.click('#herramientas [data-h="borrar"]'); await trazo();
  ok(llena > 0.97 && (await elegido(pg)).playera < llena - 0.1, `«Borrar» quita de lo elegido (${(llena * 100).toFixed(0)} % → ${((await elegido(pg)).playera * 100).toFixed(0)} %)`);
  await pg.click('#limpiar');
  ok((await elegido(pg)).playera === 0, '«Soltar lo elegido» lo suelta todo');

  // tomar color
  await pg.click('#herramientas [data-h="tocar"]');
  await pg.click('#herramientas [data-h="gotero"]');
  await pg.mouse.click(...await enPantalla(pg, 0.5, 0.9)); await pg.waitForTimeout(200);
  const tomado = await pg.textContent('#elegido');
  const vuelve = await pg.evaluate(() => document.querySelector('#herramientas [aria-pressed="true"]').dataset.h);
  ok(/#D[89A-F]D[89A-F]D[5-9A-F]/i.test(tomado) && vuelve === 'tocar', `«Tomar color» toma el gris del fondo y regresa a «Tocar» (${tomado.trim()})`);

  // separar por tono
  await pg.click('#tonos');
  await pg.waitForFunction(() => document.querySelectorAll('#grupos button').length >= 3, null, { timeout: 15000 });
  const gs = await pg.evaluate(() => window.__color.tonos.centros.map((c) => c.hex));
  const azul = gs.findIndex((h) => { const n = parseInt(h.slice(1), 16), r = n >> 16, b = n & 255; return b > r + 80; });
  ok(azul >= 0, `«Separar por tono» encuentra el azul de la playera aparte (${gs.join(' ')})`);
  await pg.click(`#grupos button[data-g="${azul}"]`); await pg.waitForTimeout(200);
  e = await elegido(pg);
  // la orilla de la playera (una columna de pixeles mezclados azul-gris) sí es azulada: 0.33 % del fondo
  ok(e.playera > 0.95 && e.cabello === 0 && e.fondo < 0.005, `tocar ese tono elige la playera entera y sólo eso (${(e.playera * 100).toFixed(1)} % · cabello ${(e.cabello * 100).toFixed(2)} % · fondo ${(e.fondo * 100).toFixed(2)} %)`);
  await pg.check('#verTonos'); await pg.waitForTimeout(200);
  const colores = await pg.evaluate(() => { const c = document.querySelector('#vista'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, s = new Set(); for (let i = 0; i < d.length; i += 4 * 97) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size; });
  ok(colores <= 8, `«Ver la foto separada por tonos» la pinta con ${colores} colores`);
  await pg.uncheck('#verTonos');
  await pg.click('#muestras button[data-color="#B3202A"]'); await pg.waitForTimeout(200);

  // acercar con dos dedos
  const cdp = await ctx.newCDPSession(pg);
  const toque = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const [cx, cy] = await enPantalla(pg, 0.5, 0.5);
  const suma = () => pg.evaluate(() => window.__color.mascara.reduce((s, v) => s + v, 0));
  const antesDeAcercar = await suma();
  await toque('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
  for (let k = 1; k <= 6; k++) await toque('touchMove', [[cx - 30 - k * 14, cy], [cx + 30 + k * 14, cy]]);
  await toque('touchEnd', []); await pg.waitForTimeout(200);
  const z = await pg.evaluate(() => window.__color.zoom.s);
  ok(z > 1.5 && await pg.isVisible('#encuadre'), `dos dedos acercan la foto (×${z.toFixed(2)})`);
  ok(await suma() === antesDeAcercar, 'y acercar no elige ni suelta nada (el primer dedo no cuenta como toque)');
  await pg.click('#encuadre');
  ok(await pg.evaluate(() => window.__color.zoom.s) === 1, '«Ver completa» la regresa');

  // descargar, al tamaño original
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 60000 }), pg.click('#bajar')]);
  const bytes = fs.readFileSync(await dl.path());
  ok(bytes.slice(1, 4).toString() === 'PNG' && bytes.readUInt32BE(16) === OW && bytes.readUInt32BE(20) === OH, `«Descargar» da la foto al tamaño original, ${OW}×${OH} (${dl.suggestedFilename()})`);
  const sal = await pg.evaluate(async ([b64, OW, OH, zona]) => {
    const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
    const c = new OffscreenCanvas(OW, OH), x = c.getContext('2d'); x.drawImage(bm, 0, 0);
    const p = (fx, fy) => [...x.getImageData(Math.round(fx * OW), Math.round(fy * OH), 1, 1).data.slice(0, 3)];
    return { cabello: p(0.2, 0.4), playera: p(0.8, 0.5), fondo: p(0.5, 0.9) };
  }, [bytes.toString('base64'), OW, OH, zona]);
  ok(sal.cabello[0] > sal.cabello[2] + 40 && sal.cabello[0] > 140, `y el cabello sale rubio (${sal.cabello})`);
  ok(sal.playera[0] > sal.playera[2] + 40, `la playera, roja aunque todavía no se le dio «Listo» (${sal.playera})`);
  ok(sal.fondo.every((c, i) => Math.abs(c - [220, 220, 215][i]) <= 1), `y el fondo intacto (${sal.fondo})`);

  // las partes de la foto: aquí se le dan a mano (una «zona de cabello» que
  // cubre sólo la mitad izquierda del cabello) para ver que el toque, el
  // pincel y el botón la respetan
  await pg.click('#limpiar').catch(() => {});
  await pg.evaluate((zona) => {
    const { W, H } = window.__color, z = eval(zona), ps = Array.from({ length: 6 }, () => new Uint8Array(W * H));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, q = z(x, y); const k = q === 'cabello' && x < .25 * W ? 1 : q === 'playera' ? 4 : 0; ps[k][i] = 255; }
    window.__color.ponerZonas(ps);
  }, zona);
  ok(await pg.isVisible('#partes [data-p="1"]') && await pg.isVisible('#partes [data-p="4"]') && !(await pg.isVisible('#partes [data-p="piel"]')), 'con persona aparecen «Cabello» y «Ropa» (y «Piel» no, porque no hay)');
  const mitad = () => pg.evaluate(() => { const { mascara: m, W, H } = window.__color; let a = 0, b = 0, na = 0, nb = 0; for (let y = 0; y < .8 * H; y++) for (let x = 0; x < .45 * W; x++) { const v = m[y * W + x] > 127; if (x < .24 * W) { na++; a += v; } else if (x > .26 * W) { nb++; b += v; } } return [a / na, b / nb]; });
  await pg.click('#herramientas [data-h="tocar"]');
  await pg.mouse.click(...await enPantalla(pg, 0.1, 0.4)); await pg.waitForTimeout(250);
  let [dentro, fuera] = await mitad();
  ok(dentro > 0.97 && fuera === 0, `tocar se queda en su parte aunque el color siga (${(dentro * 100).toFixed(0)} % adentro · ${(fuera * 100).toFixed(1)} % afuera)`);
  await pg.click('#limpiar');
  await pg.click('#partes [data-p="4"]'); await pg.waitForTimeout(200);
  e = await elegido(pg);
  ok(e.playera > 0.97 && e.cabello === 0, `«Ropa» elige la ropa de un toque (${(e.playera * 100).toFixed(0)} %)`);
  await pg.click('#limpiar');
  await pg.click('#herramientas [data-h="pincel"]');
  { const a = await enPantalla(pg, 0.1, 0.4), b = await enPantalla(pg, 0.4, 0.4); await pg.mouse.move(...a); await pg.mouse.down(); for (let k = 1; k <= 12; k++) await pg.mouse.move(a[0] + (b[0] - a[0]) * k / 12, a[1]); await pg.mouse.up(); await pg.waitForTimeout(200); }
  [dentro, fuera] = await mitad();
  ok(dentro > 0.02 && fuera === 0, `el pincel tampoco se sale de la parte donde empezó (${(fuera * 100).toFixed(1)} % afuera)`);

  ok(await desborde(pg) <= 0, 'al final tampoco se sale nada de la pantalla');
  ok(!errores.length, 'ni un error en la consola' + (errores.length ? ' — ' + errores.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
