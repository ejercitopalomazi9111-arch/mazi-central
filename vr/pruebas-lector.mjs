/* MAZI VR · Leer (INKWELL en el visor). Siembra en el «teléfono» lo que dejaría INKWELL —una serie de Webtoon con dos
   capítulos de imágenes, una de Wattpad en texto y un libro— y la lee con el control: estante, abrir, bajar con el stick,
   que marque leído igual que INKWELL (la serie y el historial), que se arme solo el capítulo siguiente, L1/R1, automático,
   Círculo guarda dónde ibas, y el libro guarda su avance. Al final, que un visor sin nada bajado NO le deje a INKWELL una
   base vacía (sin sus tiendas, las Tiras ya no podrían crearlas).
     node vr/pruebas-lector.mjs     (con el servidor del repo en :8765) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp';
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const PAD = () => { window.__pad = { id: 'Wireless Controller', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__pad]; };
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const X = 0, O = 1, L1 = 4, R1 = 5, IZQ = 14, DER = 15;

/* ── con cosas bajadas ── */
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } }); await ctx.addInitScript(PAD);
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
const boton = async (i) => { await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(80); await p.evaluate((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(180); };
const est = () => p.evaluate(() => __lector.estado());
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' });
await p.evaluate(async () => {
  const abrir = (n, crear) => new Promise((ok) => { const q = indexedDB.open(n, 1); q.onupgradeneeded = () => crear(q.result); q.onsuccess = () => ok(q.result); });
  const poner = (d, t, v) => new Promise((ok) => { const x = d.transaction(t, 'readwrite'); x.objectStore(t).put(v); x.oncomplete = ok; });
  const hoja = async (color, txt, w = 720, h = 1400) => { const c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; x.font = '120px sans-serif'; x.fillText(txt, 60, 300); return c.convertToBlob({ type: 'image/jpeg', quality: .7 }); };
  const dt = await abrir('inkwell-tiras', (d) => { d.createObjectStore('series', { keyPath: 'id' }); d.createObjectStore('caps', { keyPath: 'clave' }).createIndex('serie', 'serie'); });
  await poner(dt, 'series', { id: 'webtoon:1', fuente: 'webtoon', titulo: 'Regres&amp;eacute; de prueba', orden: 0, leidos: [], desde: 0, portadaBlob: await hoja('#c33', 'P', 300, 300),
    caps: [{ n: 1, titulo: 'El inicio' }, { n: 2, titulo: 'Lo que sigue' }, { n: 3, titulo: 'No bajado' }] });
  for(const n of [1, 2]){ const imgs = [await hoja('#ddd', n + 'a'), await hoja('#bbb', n + 'b'), await hoja('#999', n + 'c')]; await poner(dt, 'caps', { clave: 'webtoon:1:' + n, serie: 'webtoon:1', n, titulo: 'cap ' + n, tipo: 'imagenes', imgs, dims: imgs.map(() => [720, 1400]) }); }
  const parrafos = Array.from({ length: 40 }, (_, i) => `<p>Renglón número ${i + 1} de una historia de Wattpad que se lee dentro del visor, con acentos: ñandú, camión.</p>`).join('');
  await poner(dt, 'series', { id: 'wattpad:9', fuente: 'wattpad', titulo: 'Texto largo', orden: 1, leidos: [1], desde: 0, caps: [{ n: 1, titulo: 'Uno' }, { n: 2, titulo: 'Dos' }] });
  await poner(dt, 'caps', { clave: 'wattpad:9:1', serie: 'wattpad:9', n: 1, titulo: 'Uno', tipo: 'texto', html: '<h2>Uno</h2>' + parrafos });
  await poner(dt, 'caps', { clave: 'wattpad:9:2', serie: 'wattpad:9', n: 2, titulo: 'Dos', tipo: 'texto', html: '<h2>Dos</h2>' + parrafos });
  const dl = await abrir('inkwell-libros', (d) => d.createObjectStore('libros', { keyPath: 'id' }));
  await poner(dl, 'libros', { id: 'l1', tipo: 'epub', titulo: 'Un libro', agregado: 1, avance: { cap: 0, y: 0 }, capitulos: [{ titulo: 'Primero', html: parrafos }, { titulo: 'Segundo', html: parrafos }] });
  await poner(dl, 'libros', { id: 'l2', tipo: 'pdf', titulo: 'Un PDF', agregado: 2, pdf: new Blob(['x']) });
});
await p.click('#bEntrar'); await p.waitForTimeout(1500);
sí(await p.evaluate(() => __vr.ahora() === 'inicio'), 'entra al inicio');
await p.evaluate(() => __vr.ir('leer'));
const hasta = async (f, ms = 6000) => { const t0 = Date.now(); let e; do { e = await est(); if(f(e)) return e; await p.waitForTimeout(150); } while(Date.now() - t0 < ms); return e; };
let e = await hasta((e) => e.tarjetas > 0);
sí(e.fase === 'estante' && e.obras === 3 && e.tarjetas === 3, `el estante trae las 3 que se pueden leer, sin el PDF (${e.obras} obras, ${e.tarjetas} tarjetas)`);
await p.waitForTimeout(300); await p.screenshot({ path: CAPS + '/vr-leer-estante.png' });
for(let i = 0; i < 4; i++) await boton(IZQ);
await boton(X); await p.waitForTimeout(1200);
e = await est(); sí(e.fase === 'leyendo' && e.obra === 'webtoon:1' && e.segs[0] === 1, `la serie con capítulos nuevos va primero y abre en el capítulo 1 (${e.obra} · ${e.segs})`);
sí(e.texturas >= 2, `las páginas de cerca ya se pintaron (${e.texturas} de ${e.piezas})`);
await p.screenshot({ path: CAPS + '/vr-leer-tira.png' });
/* bajar con el stick hasta pasar el capítulo 1 */
await p.evaluate(() => { window.__pad.axes[1] = 1; }); e = await hasta((e) => e.scroll > 5000, 15000); await p.evaluate(() => { window.__pad.axes[1] = 0; }); await p.waitForTimeout(800);
e = await est(); sí(e.scroll > 2000, `el stick baja (${e.scroll} px)`);
sí(e.segs.includes(2), `se armó solo el capítulo 2 (${e.segs})`);
const marcas = await p.evaluate(async () => {
  const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-tiras', 1); q.onsuccess = () => ok(q.result); });
  const s = await new Promise((ok) => { const r = d.transaction('series').objectStore('series').get('webtoon:1'); r.onsuccess = () => ok(r.result); });
  return { leidos: s.leidos, hist: JSON.parse(localStorage.getItem('inkwell.historial') || '[]').map(([, i, n]) => `${i}:${n}`) };
});
sí(marcas.leidos.includes(1) && marcas.hist.includes('webtoon:1:1'), `capítulo 1 leído en la serie y en el historial de INKWELL (${JSON.stringify(marcas)})`);
await boton(R1); await p.waitForTimeout(900);
e = await est(); sí(e.actual === 2, `R1 pasa al capítulo 2 (va en ${e.actual})`);
await boton(L1); await p.waitForTimeout(900);
e = await est(); sí(e.actual === 2 || e.actual === 1, `L1 regresa al inicio del capítulo (${e.actual})`);
await p.waitForTimeout(800); const antes = (await est()).scroll; await boton(X); await p.waitForTimeout(1500);
e = await est(); sí(e.auto && e.scroll > antes, `X lee en automático (${antes} → ${e.scroll})`);
await boton(X); await boton(O); await p.waitForTimeout(800);
e = await est(); const guardado = await p.evaluate(() => JSON.parse(localStorage.getItem('mazivr.lector') || '{}'));
sí(e.fase === 'estante' && guardado['webtoon:1'], `Círculo regresa al estante y guarda dónde ibas (${JSON.stringify(guardado['webtoon:1'])})`);
/* texto de Wattpad */
const wat = await p.evaluate(async () => { await __lector.abrir('wattpad:9'); return __lector.estado(); }); await p.waitForTimeout(700);
e = await est(); sí(e.obra === 'wattpad:9' && e.segs[0] === 2 && e.texturas >= 2, `Wattpad abre en el primero sin leer (cap. ${e.segs}) y pinta su texto (${e.texturas} tramos)`);
await p.screenshot({ path: CAPS + '/vr-leer-texto.png' });
await boton(O); await p.waitForTimeout(500);
/* el libro guarda su avance donde lo guarda INKWELL */
await p.evaluate(() => __lector.abrir('l1')); await p.waitForTimeout(800);
await p.evaluate(() => { window.__pad.axes[3] = 1; }); await p.waitForTimeout(1500); await p.evaluate(() => { window.__pad.axes[3] = 0; }); await p.waitForTimeout(300);
await boton(O); await p.waitForTimeout(900);
const av = await p.evaluate(async () => { const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-libros', 1); q.onsuccess = () => ok(q.result); });
  return new Promise((ok) => { const r = d.transaction('libros').objectStore('libros').get('l1'); r.onsuccess = () => ok(r.result.avance); }); });
sí(av && (av.cap > 0 || av.y > 0), `el libro guarda su avance para INKWELL (${JSON.stringify(av)})`);
await p.evaluate(() => __vr.ir('inicio')); await p.waitForTimeout(300);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
await ctx.close();

/* ── un visor sin nada bajado no le estropea la base a INKWELL ── */
const c2 = await b.newContext({ viewport: { width: 844, height: 390 } }); await c2.addInitScript(PAD);
const q = await c2.newPage(); const err2 = []; q.on('pageerror', (e) => err2.push(e.message));
await q.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await q.click('#bEntrar'); await q.waitForTimeout(1300);
await q.evaluate(() => __vr.ir('leer')); await q.waitForTimeout(800);
const vacio = await q.evaluate(() => __lector.estado());
const tiendas = await q.evaluate(() => new Promise((ok) => { const r = indexedDB.open('inkwell-tiras', 1); r.onsuccess = () => ok([...r.result.objectStoreNames]); }));
sí(vacio.obras === 0 && tiendas.includes('series') && tiendas.includes('caps'), `vacío dice «sin capítulos» y la base de INKWELL queda con sus tiendas (${tiendas})`);
await q.screenshot({ path: CAPS + '/vr-leer-vacio.png' });
sí(err2.length === 0, 'sin errores con nada bajado' + (err2.length ? ': ' + err2.join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
