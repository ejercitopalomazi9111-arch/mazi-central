/* Pruebas de QUITAR EL FONDO (recorte.js).
   1. Las cuentas, sin pantalla: por color, por orillas, el borde suave.
   2. La herramienta entera en un navegador de verdad, con el modelo de
      MediaPipe: abre, recorta solo lo del centro, se toca un color, se traza
      con el dedo y sale un PNG con transparencia.
   Necesita un servidor en 8791:  python3 -m http.server 8791 --bind 127.0.0.1
     node presentaciones/pruebas-recorte.mjs */
import { quitarColor, fondoPorOrillas, alfaDeConfianza, suavizar, analizarFondo, afinarPorColor, crecerPorColor, quitarHuecos, afinarDosColores, descontaminar, afinar } from './recorte.js';
import { readFileSync, mkdirSync } from 'node:fs';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };

console.log('\n· Las cuentas');
{
  /* 10×10: fondo verde, un cuadro rojo de 4×4 al centro, y un pixel verde
     suelto adentro del rojo (no conectado con el fondo) */
  const W = 10, H = 10, px = new Uint8ClampedArray(W * H * 4);
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    const i = (y * W + x) * 4, rojo = x >= 3 && x <= 6 && y >= 3 && y <= 6;
    px.set(rojo ? [220, 20, 30, 255] : [20, 200, 60, 255], i);
  }
  px.set([20, 200, 60, 255], (4 * W + 4) * 4);                 // el verde suelto, dentro del rojo
  const todo = new Uint8ClampedArray(W * H).fill(255);
  const junto = quitarColor(px, W, H, todo, 0, 0, 30, true);
  ok('por color, sólo la zona: el fondo verde se va', junto[0] === 0 && junto[W * H - 1] === 0);
  ok('y el rojo se queda', junto[3 * W + 3] === 255);
  ok('y el verde suelto de adentro NO (no está conectado)', junto[4 * W + 4] === 255, String(junto[4 * W + 4]));
  const global = quitarColor(px, W, H, todo, 0, 0, 30, false);
  ok('en toda la imagen: se va también el verde suelto', global[4 * W + 4] === 0);
  ok('nunca devuelve lo que ya se había quitado', quitarColor(px, W, H, junto, 4, 4, 30, true)[0] === 0);
  const orillas = fondoPorOrillas(px, W, H);
  ok('plan B por orillas: se va el fondo y se queda el centro', orillas[0] === 0 && orillas[5 * W + 5] === 255);
  const a = alfaDeConfianza(new Float32Array([0, 0.3, 0.5, 0.7, 1]));
  ok('confianza → transparencia con borde suave entre .3 y .7', a[0] === 0 && a[1] === 0 && a[2] > 100 && a[2] < 160 && a[3] === 255 && a[4] === 255, [...a].join(','));
  const s = suavizar(junto, W, H, 1);
  ok('el borde suave deja valores intermedios en la orilla del objeto', s[2 * W + 3] > 0 && s[2 * W + 3] < 255, String(s[2 * W + 3]));
  ok('borde suave 0 no toca nada', suavizar(junto, W, H, 0) === junto);
}

console.log('\n· El borde fino (letras nítidas, sin manchas del fondo)');
{
  /* 240×160, fondo crema liso. Una «O» oscura (anillo) con su hueco crema
     adentro, y a su lado una «I» oscura que el «modelo» NO agarró. */
  const W = 240, H = 160, px = new Uint8ClampedArray(W * H * 4), CREMA = [233, 223, 201], TINTA = [43, 22, 64];
  const anillo = (x, y) => { const d = Math.hypot(x - 80, y - 80); return d >= 28 && d <= 48; };
  const palo = (x, y) => x >= 138 && x <= 150 && y >= 40 && y <= 120;
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) px.set([...(anillo(x, y) || palo(x, y) ? TINTA : CREMA), 255], (y * W + x) * 4);
  /* lo que daría el modelo: un disco borroso que cubre la O y su hueco,
     y además una isla crema pegada a la orilla de abajo */
  const m = new Uint8ClampedArray(W * H);
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    const d = Math.hypot(x - 80, y - 80); m[y * W + x] = d <= 40 ? 255 : d <= 60 ? Math.round(255 * (60 - d) / 20) : 0;
    if(x >= 16 && x <= 40 && y >= 136) m[y * W + x] = 255;
  }
  const f = analizarFondo(px, W, H, m);
  ok('lee el color del fondo y que es liso', f.liso && Math.hypot(f.ref[0] - 233, f.ref[1] - 223, f.ref[2] - 201) < 3, JSON.stringify(f));
  const a = afinar(px, W, H, m), r = a.mascara;
  ok('el hueco de la O (crema encerrado) se quita', r[80 * W + 80] === 0, String(r[80 * W + 80]));
  ok('el trazo de la O queda entero y lleno, aunque el modelo lo dejó borroso', r[80 * W + 126] === 255 && r[80 * W + 34] === 255 && r[126 * W + 80] === 255, `${r[80 * W + 126]} ${r[80 * W + 34]} ${r[126 * W + 80]}`);
  ok('la I que el modelo soltó, pegadita, se recupera', r[80 * W + 144] === 255, String(r[80 * W + 144]));
  ok('la isla crema pegada al fondo se va', r[148 * W + 28] === 0, String(r[148 * W + 28]));
  ok('y lo avisa: huecos e islas contados', a.huecos >= 1 && a.islas >= 1, JSON.stringify({ h: a.huecos, i: a.islas }));
  let medios = 0; for(const v of r) if(v > 10 && v < 245) medios++;
  ok('el borde sale nítido: casi nada a medias', medios < 40, String(medios));

  /* una camisa blanca sobre fondo blanco, con sombras: no se agujera */
  const P = new Uint8ClampedArray(W * H * 4), M = new Uint8ClampedArray(W * H);
  let camisa = 0;
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    const dentro = x >= 60 && x <= 180 && y >= 20 && y <= 140, v = dentro ? 236 + ((x * 7 + y * 3) % 17) - 8 : 250;
    P.set([v, v, v, 255], (y * W + x) * 4); M[y * W + x] = dentro ? 255 : 0; if(dentro) camisa++;
  }
  const c = quitarHuecos(P, W, H, M, [250, 250, 250]);
  let quedan = 0; for(let k = 0; k < W * H; k++) if(M[k] && c.mascara[k] > 127) quedan++;
  ok('una camisa blanca con sombras sobre blanco NO se agujera', quedan > 0.95 * camisa, `${quedan} de ${camisa}`);

  /* fondo con textura: el borde se decide por los dos colores de alrededor */
  const Q = new Uint8ClampedArray(W * H * 4), MQ = new Uint8ClampedArray(W * H);
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    const obj = x >= 80 && x < 160, v = obj ? 30 : 200 + ((x * 13 + y * 29) % 50);
    Q.set([v, v, v, 255], (y * W + x) * 4); MQ[y * W + x] = x >= 77 && x < 163 ? 255 : 0;   // el modelo se pasó 3 px
  }
  const g = afinarDosColores(Q, W, H, MQ, 3), fila = [...g.slice(80 * W + 74, 80 * W + 84)];
  ok('fondo con textura: lo que el modelo agarró de más se va, sin rampa', g[80 * W + 77] < 40 && g[80 * W + 78] < 40 && g[80 * W + 79] < 40, fila.join(' '));
  ok('y la figura queda llena hasta su orilla', g[80 * W + 80] === 255 && g[80 * W + 120] === 255 && g[80 * W + 10] === 0, fila.join(' '));

  /* sin halo: un pixel de orilla mitad rojo, mitad azul de fondo → rojo */
  const R2 = new Uint8ClampedArray(9 * 9 * 4), M2 = new Uint8ClampedArray(81);
  for(let k = 0; k < 81; k++){ const x = k % 9; const a2 = x < 4 ? 1 : x === 4 ? 0.5 : 0;
    R2.set([Math.round(220 * a2 + 30 * (1 - a2)), Math.round(20 * a2 + 90 * (1 - a2)), Math.round(30 * a2 + 220 * (1 - a2)), 255], k * 4); M2[k] = Math.round(255 * a2); }
  const d2 = descontaminar(R2, 9, 9, M2, 3), i2 = (4 * 9 + 4) * 4;
  ok('sin halo: la orilla pierde el azul del fondo viejo', d2[i2] > 200 && d2[i2 + 2] < 60, `${d2[i2]},${d2[i2 + 1]},${d2[i2 + 2]}`);
}

console.log('\n· La herramienta, en un navegador');
{
  const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
  const BASE = process.env.BASE || 'http://127.0.0.1:8791';
  const CAPTURAS = process.env.CAPTURAS || '';
  if(CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  await p.goto(BASE + '/presentaciones/');
  /* una foto de prueba: disco rojo sobre fondo azul liso */
  const foto = await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d');
    x.fillStyle = '#2D6CDF'; x.fillRect(0, 0, 400, 300);
    x.fillStyle = '#E0302B'; x.beginPath(); x.arc(200, 150, 90, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#F4F1E8'; x.fillRect(20, 20, 40, 40);               // un cuadrito crema en una esquina
    return c.toDataURL('image/png');
  });
  /* se abre ENCIMA de otro diálogo modal, como pasa desde el editor de láminas */
  await p.evaluate(() => { const d = document.createElement('dialog'); d.id = 'estorbo'; d.style.cssText = 'width:100vw;height:100vh;max-width:none;max-height:none;margin:0';
    d.innerHTML = '<button style="width:100%;height:100%">el editor</button>'; document.body.append(d); d.showModal(); });
  await p.evaluate((f) => { window.__rc = import('./recorte.js').then((RC) => RC.recortar(f, { recortarAlContenido: false })); }, foto);
  await p.waitForSelector('.rc', { timeout: 10000 });
  await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 60000 });
  await p.waitForTimeout(400);
  if(CAPTURAS) await p.screenshot({ path: CAPTURAS + '/recorte-auto.png' });
  const alfa = (x, y) => p.evaluate(([x, y]) => { const c = document.querySelector('.rc canvas'); return c.getContext('2d').getImageData(Math.round(x * c.width), Math.round(y * c.height), 1, 1).data[3]; }, [x, y]);
  ok('al abrir, lo del centro (el disco) se queda', await alfa(0.5, 0.5) > 200);
  ok('y el fondo se va solo', await alfa(0.97, 0.95) < 40, String(await alfa(0.97, 0.95)));
  ok('sin un solo error de consola', !errores.length, errores.join(' | '));
  ok('queda ENCIMA de otro diálogo abierto: «Listo» se puede tocar', await p.evaluate(() => { const b = document.querySelector('.rc [data-listo]').getBoundingClientRect();
    return !!document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('.rc'); }));
  const aviso = await p.textContent('.rc-estado');
  ok('usó el modelo, no el plan B', !/orillas/.test(aviso), aviso);

  /* por color: tocar el cuadrito crema (si quedó) lo quita */
  await p.click('.rc [data-modo="color"]');
  const caja = await p.locator('.rc canvas').boundingBox();
  const tocar = (fx, fy) => p.mouse.click(caja.x + caja.width * fx, caja.y + caja.height * fy);
  await p.click('.rc button:has-text("↺ Original")');
  await tocar(0.1, 0.13);                                             // el crema
  await p.waitForTimeout(300);
  ok('por color: tocar el cuadrito crema lo vuelve transparente', await alfa(0.1, 0.13) < 20, String(await alfa(0.1, 0.13)));
  ok('y el resto sigue', await alfa(0.9, 0.9) > 200);
  await p.click('.rc button:has-text("↶ Deshacer")'); await p.waitForTimeout(200);
  ok('deshacer lo regresa', await alfa(0.1, 0.13) > 200);

  /* con el dedo: se traza un cuadro alrededor del centro y lo de afuera se va */
  await p.click('.rc [data-modo="dedo"]');
  const pts = [[.3, .3], [.7, .3], [.7, .7], [.3, .7], [.3, .31]];
  await p.mouse.move(caja.x + caja.width * pts[0][0], caja.y + caja.height * pts[0][1]); await p.mouse.down();
  for(const [x, y] of pts.slice(1)) await p.mouse.move(caja.x + caja.width * x, caja.y + caja.height * y, { steps: 6 });
  await p.mouse.up(); await p.waitForTimeout(300);
  ok('con el dedo: lo de adentro del trazo se queda', await alfa(0.5, 0.5) > 200);
  ok('y lo de afuera se borra', await alfa(0.1, 0.9) < 20);
  if(CAPTURAS) await p.screenshot({ path: CAPTURAS + '/recorte-dedo.png' });
  ok('la pantalla no se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const chicos = await p.evaluate(() => [...document.querySelectorAll('.rc button')].filter((x) => x.getBoundingClientRect().height < 44).map((x) => x.textContent));
  ok('ningún botón de menos de 44 px', !chicos.length, chicos.join(' · '));

  await p.click('.rc [data-listo]');
  const r = await p.evaluate(async () => { const r = await window.__rc; if(!r) return null;
    const im = new Image(); im.src = URL.createObjectURL(r.blob); await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    return { mime: r.mime, ancho: r.ancho, alto: r.alto, esquina: x.getImageData(2, 2, 1, 1).data[3], centro: x.getImageData(200, 150, 1, 1).data[3] }; });
  ok('«Listo» entrega un PNG del tamaño original', r && r.mime === 'image/png' && r.ancho === 400 && r.alto === 300, JSON.stringify(r));
  ok('con transparencia de verdad: esquina vacía, centro lleno', r && r.esquina === 0 && r.centro === 255, JSON.stringify(r));
  ok('y la pantalla de recorte se cierra', !(await p.$('.rc')));

  /* ── letras sobre fondo liso: lo que reportó Carlos ── */
  const letras = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const x = c.getContext('2d');
    x.fillStyle = '#E9DFC9'; x.fillRect(0, 0, 1200, 800);
    x.fillStyle = '#2B1640'; x.font = 'bold 230px sans-serif'; x.textAlign = 'center'; x.fillText('GOBO', 600, 330);
    x.lineWidth = 34; x.strokeStyle = '#C1121F'; x.beginPath(); x.arc(600, 560, 150, 0, Math.PI * 2); x.stroke();
    return c.toDataURL('image/png');
  });
  await p.evaluate((f) => { window.__rc = import('./recorte.js').then((RC) => RC.recortar(f, { recortarAlContenido: false })); }, letras);
  await p.waitForSelector('.rc');
  await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 60000 });
  await p.waitForTimeout(300);
  if(CAPTURAS) await p.screenshot({ path: CAPTURAS + '/recorte-letras.png' });
  const etiquetas = await p.evaluate(() => [...document.querySelectorAll('.rc button')].filter((x) => x.offsetParent && x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent));
  ok('ningún botón con el nombre cortado («Autom…»)', !etiquetas.length, etiquetas.join(' · '));
  await p.click('.rc [data-listo]');
  const L = await p.evaluate(async () => { const r = await window.__rc;
    const im = new Image(); im.src = URL.createObjectURL(r.blob); await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, a = (X, Y) => d[(Y * c.width + X) * 4 + 3];
    /* cada letra: ¿hay tinta opaca en su columna? */
    const tinta = (x0, x1) => { let n = 0; for(let Y = 150; Y < 340; Y++) for(let X = x0; X < x1; X++) if(a(X, Y) > 200) n++; return n; };
    let islas = 0, medios = 0;
    for(let i = 3; i < d.length; i += 4){ const k = (i - 3) / 4, X = k % c.width, Y = (k - X) / c.width;
      if(d[i] > 10 && d[i] < 245) medios++;
      if(d[i] > 127 && Math.hypot(d[i - 3] - 233, d[i - 2] - 223, d[i - 1] - 201) < 20) islas++; }
    return { G: tinta(250, 420), O: tinta(440, 600), hueco: a(600, 560), islas, medios };
  });
  ok('la G y la O quedan con tinta (el modelo no se las come)', L.G > 4000 && L.O > 4000, JSON.stringify(L));
  ok('el hueco del anillo queda transparente', L.hueco === 0, JSON.stringify(L));
  ok('cero manchas del color del fondo', L.islas < 200, JSON.stringify(L));
  ok('letras nítidas: pocos pixeles a medias', L.medios < 9000, JSON.stringify(L));

  /* ── fondo nuevo ── */
  const pixel = (x, y) => p.evaluate(([x, y]) => { const c = document.querySelector('.rc canvas'); return [...c.getContext('2d').getImageData(Math.round(x * c.width), Math.round(y * c.height), 1, 1).data]; }, [x, y]);
  const abrir = async () => {
    await p.evaluate((f) => { window.__rc = import('./recorte.js').then((RC) => RC.recortar(f, { recortarAlContenido: true })); }, foto);
    await p.waitForSelector('.rc');
    await p.waitForFunction(() => !/Buscando|Cargando/.test(document.querySelector('.rc-estado').textContent), null, { timeout: 60000 });
    await p.click('.rc [data-modo="fondo"]');
  };
  await abrir();
  await p.click('.rc [data-fondo="color"]'); await p.click('.rc [data-color="#AC27FF"]'); await p.waitForTimeout(250);
  const v = await pixel(0.97, 0.95);
  ok('color: lo quitado se pinta del color elegido en la vista', Math.abs(v[0] - 0xAC) < 4 && Math.abs(v[1] - 0x27) < 4 && Math.abs(v[2] - 0xFF) < 4, v.join(','));
  ok('y la figura sigue encima', (await pixel(0.5, 0.5))[0] > 180);
  if(CAPTURAS) await p.screenshot({ path: CAPTURAS + '/recorte-fondo-color.png' });
  await p.click('.rc [data-fondo="textura"]'); await p.click('.rc [data-textura="madera"]'); await p.waitForTimeout(300);
  const t1 = await pixel(0.95, 0.9), t2 = await pixel(0.9, 0.95);
  ok('textura: se ve madera, no un color plano ni transparente', t1[3] === 255 && (t1[0] !== t2[0] || t1[1] !== t2[1]), t1 + ' / ' + t2);
  await p.click('.rc [data-fondo="mezcla"]'); await p.click('.rc [data-color="#1F4FD8"]'); await p.waitForTimeout(300);
  const mz = await pixel(0.95, 0.9);
  ok('color + textura: domina el color (azul) con la textura encima', mz[2] > mz[0] + 40, mz.join(','));
  if(CAPTURAS) await p.screenshot({ path: CAPTURAS + '/recorte-fondo-mezcla.png' });
  ok('el panel no se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const chicos2 = await p.evaluate(() => [...document.querySelectorAll('.rc button, .rc-otro')].filter((x) => x.offsetParent && x.getBoundingClientRect().height < 44).map((x) => x.textContent || x.getAttribute('aria-label')));
  ok('con el panel de fondo, nada de menos de 44 px', !chicos2.length, chicos2.join(' · '));
  /* imagen: una foto verde de fondo */
  const verde = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 80; c.height = 50; const x = c.getContext('2d'); x.fillStyle = '#12A150'; x.fillRect(0, 0, 80, 50); return c.toDataURL('image/png').split(',')[1]; });
  await p.setInputFiles('.rc input[type=file]', { name: 'pasto.png', mimeType: 'image/png', buffer: Buffer.from(verde, 'base64') });
  await p.waitForFunction(() => document.querySelector('.rc [data-fondo="imagen"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
  await p.waitForTimeout(250);
  const im1 = await pixel(0.97, 0.95);
  ok('imagen: lo quitado se rellena con la foto elegida', Math.abs(im1[0] - 0x12) < 6 && Math.abs(im1[1] - 0xA1) < 6, im1.join(','));
  await p.click('.rc [data-listo]');
  const R3 = await p.evaluate(async () => { const r = await window.__rc;
    const im = new Image(); im.src = URL.createObjectURL(r.blob); await im.decode();
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    return { fondo: r.fondo, w: r.ancho, h: r.alto, esquina: [...x.getImageData(395, 295, 1, 1).data], centro: [...x.getImageData(200, 150, 1, 1).data] }; });
  ok('al guardar: la imagen entera, sin recortar al contenido, y dice qué fondo lleva', R3.fondo === 'imagen' && R3.w === 400 && R3.h === 300, JSON.stringify(R3));
  ok('con el fondo nuevo horneado (opaco y verde en la esquina) y la figura encima', R3.esquina[3] === 255 && Math.abs(R3.esquina[1] - 0xA1) < 6 && R3.centro[0] > 180, JSON.stringify(R3));
  ok('sin un solo error de consola al final', !errores.length, errores.join(' | '));
  await b.close();
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
