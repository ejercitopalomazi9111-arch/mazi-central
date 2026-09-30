/* Pruebas de QUITAR EL FONDO (recorte.js).
   1. Las cuentas, sin pantalla: por color, por orillas, el borde suave.
   2. La herramienta entera en un navegador de verdad, con el modelo de
      MediaPipe: abre, recorta solo lo del centro, se toca un color, se traza
      con el dedo y sale un PNG con transparencia.
   Necesita un servidor en 8791:  python3 -m http.server 8791 --bind 127.0.0.1
     node presentaciones/pruebas-recorte.mjs */
import { quitarColor, fondoPorOrillas, alfaDeConfianza, suavizar } from './recorte.js';
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
  await b.close();
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
