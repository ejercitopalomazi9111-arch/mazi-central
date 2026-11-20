/* La pizarra que corrige (corrige.js): lo que arma la IA se limpia, y el recorrido completo a 390×844 con la IA de mentiras:
   escribir con el dedo, revisar, la elipse roja sobre el error, la pista y «Ver resultado».   node carymo/pruebas-corrige.mjs  (FOTOS=carpeta) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const RESP = { veredicto: 'casi', resumen: 'Vas bien, pero el signo se te volteó al despejar.',
  pasos: [{ lee: '2x + 3 = 11', ok: true, nota: 'Bien planteado.' }, { lee: '2x = 11 + 3', ok: false, nota: 'El 3 pasa restando, no sumando.' }, { lee: 'x = 7', ok: false, nota: 'Sale de lo anterior.' }, { lee: '', ok: true }],
  fallo: { paso: 2, zona: { x: .1, y: .3, w: .5, h: .12 } }, pista: '¿Qué operación es la contraria de sumar 3?', correcto: 'x = 4' };

console.log('La lógica');
const C = await import('./corrige.js');
{ const r = C.revisarCorrige(RESP);
  ok(r.pasos.length === 3 && r.pasos.filter((p) => !p.ok).length === 2, 'renglones vacíos se tiran y se conserva cuál está bien');
  ok(r.veredicto === 'casi' && r.fallo.paso === 2 && r.fallo.zona.w === .5, 'veredicto, paso del error y su zona se conservan');
  ok(r.pista && r.correcto === 'x = 4', 'pista y resultado se conservan'); }
{ const r = C.revisarCorrige({ veredicto: 'bien', pasos: [{ lee: 'a', ok: true }, { lee: 'b', ok: false }], fallo: { paso: 9, zona: { x: 1.4, y: -2, w: 3, h: .001 } } });
  ok(r.veredicto === 'casi', 'si dice «bien» pero marcó un renglón malo, cuenta como «casi»');
  ok(r.fallo.paso === 2 && r.fallo.zona.x + r.fallo.zona.w <= 1 && r.fallo.zona.y >= 0 && r.fallo.zona.h >= .03, 'una zona fuera de la pizarra se mete adentro'); }
{ const r = C.revisarCorrige({ pasos: [{ lee: 'a', ok: true }], fallo: { paso: 1, zona: { x: .1, y: .1, w: .2, h: .2 } } });
  ok(r.veredicto === 'bien' && r.fallo === null, 'sin errores no hay círculo rojo aunque la IA mande zona'); }
{ let e = null; try{ C.revisarCorrige({ ilegible: 'La pizarra está vacía' }); }catch(x){ e = x; } ok(e && e.sinReintento && /vacía/.test(e.message), 'si no se lee, se dice tal cual y no se reintenta'); }
{ let tiro = false; try{ C.revisarCorrige({ pasos: [] }); }catch{ tiro = true; } ok(tiro, 'sin renglones es error (y se pide otra vez)'); }
{ const e = C.elipseDe({ x: .1, y: .3, w: .5, h: .12 }, 1080, 1200); ok(e.cx > 108 && e.cx < 108 + 540 && e.rx > 270 && e.ry > 72, 'la elipse encierra la zona con aire'); }

console.log('La pantalla');
const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 9, cuidado: { hambre: 80, limpieza: 80, animo: 70, t: Date.now() } };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, hasTouch: false });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
const pedidos = [];
await pg.route(/ia-texto/, async (r) => { pedidos.push(r.request().postDataJSON()); await new Promise((x) => setTimeout(x, 300));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: JSON.stringify(RESP) }) }); });
await pg.route(/^http:\/\/localhost:1\/(?!.*ia-texto)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} }) }));
await pg.addInitScript((p) => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.perfil', JSON.stringify(p)); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre', nivel: 'prepa' })); sessionStorage.setItem('carymo.entrada', '1'); }, perfil);
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio); await pg.waitForTimeout(400);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png` }); };
await pg.click('#nav [data-ir="yo"]'); await pg.waitForTimeout(400);
ok(await pg.isVisible('#vYo [data-yo="corrige"]'), 'en «Tú» está «Tu pizarra»');
const rej = await pg.evaluate(() => { const l = [...document.querySelectorAll('.yo-rejilla > *')]; const u = l.at(-1).getBoundingClientRect(), a = l.at(-2).getBoundingClientRect(); return { n: l.length, ancho: u.width > a.width * 1.5 }; });
ok(rej.n % 2 === 0 || rej.ancho, 'la rejilla de «Tú» no queda con un hueco al final');
await pg.click('#vYo [data-yo="corrige"]'); await pg.waitForSelector('#capa.corrige #pcCaja canvas'); await pg.waitForTimeout(300);
await pg.click('#pcRevisar'); await pg.waitForTimeout(250);
ok(pedidos.length === 0, 'con la pizarra vacía no se manda nada');
const caja = await pg.locator('#pcCaja').boundingBox();
ok(caja.width > 300 && caja.height > 250, `la pizarra es grande (${Math.round(caja.width)}×${Math.round(caja.height)})`);
await pg.evaluate(() => { window.__vista = document.querySelector('#pcCaja canvas'); });
const raya = async (x0, y0, x1, y1) => { await pg.mouse.move(caja.x + x0, caja.y + y0); await pg.mouse.down(); for(let i = 1; i <= 12; i++) await pg.mouse.move(caja.x + x0 + (x1 - x0) * i / 12, caja.y + y0 + (y1 - y0) * i / 12); await pg.mouse.up(); };
await raya(40, 60, 200, 60); await raya(40, 120, 220, 125); await raya(40, 180, 120, 180);
await pg.fill('#pcEnunciado', 'Resuelve 2x + 3 = 11');
await pg.click('#pcRevisar'); await pg.waitForTimeout(80);
ok(/Revisando/.test(await pg.textContent('#pcRevisar')), 'mientras la IA mira, el botón dice «Revisando…»');
await pg.waitForSelector('.pc-veredicto', { timeout: 6000 }); await pg.waitForTimeout(700);
const p0 = pedidos[0] || {};
ok(pedidos.length === 1 && /2x \+ 3 = 11/.test(JSON.stringify(p0)) && /preparatoria/.test(p0.sistema) && /image\/jpeg/.test(JSON.stringify(p0)), 'a la IA le llega la pizarra como foto, el ejercicio y el nivel');
ok(/Casi/.test(await pg.textContent('.pc-veredicto')) && await pg.locator('.pc-pasos li').count() === 3 && await pg.locator('.pc-pasos li.pc-mal').count() === 2, 'sale el veredicto y cada renglón con bien o mal');
ok(await pg.locator('li.pc-primero').count() === 1, 'el renglón del primer error resalta');
ok(/contraria/.test(await pg.textContent('.pc-pista')) && !/x = 4/.test(await pg.textContent('#pcRes')), 'primero la pista, sin soltar el resultado');
/* el círculo rojo sobre la pizarra: se cuentan pixeles rojos en la captura, dentro de la zona marcada */
const cap = (await pg.locator('#pcCaja').screenshot()).toString('base64');
const { rojos, rojosFuera, sx } = await pg.evaluate(async (b64) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const k = cv.getContext('2d'); k.drawImage(im, 0, 0);
  const d = k.getImageData(0, 0, cv.width, cv.height).data; let rojos = 0, rojosFuera = 0;
  for(let y = 0; y < cv.height; y++) for(let x = 0; x < cv.width; x++){ const i = (y * cv.width + x) * 4;
    if(d[i] > 190 && d[i + 1] < 90 && d[i + 2] < 120){ const fy = y / cv.height; if(fy > .15 && fy < .6) rojos++; else rojosFuera++; } }
  return { rojos, rojosFuera, sx: cv.width / innerWidth * 0 + 1 };
}, cap);
const verd = await pg.locator('.pc-veredicto').boundingBox(), cj = await pg.locator('#pcCaja').boundingBox();
ok(cj.y >= -1 && verd.y < 844, 'después de revisar se ve la pizarra y el veredicto asoma debajo');
ok(rojos > 200 * sx && rojosFuera < rojos / 10, `el error queda encerrado en rojo sobre tu pizarra (${rojos} pixeles rojos)`);
await foto('pizarra-1');
await pg.click('[data-ver]'); await pg.waitForTimeout(150);
ok(/x = 4/.test(await pg.textContent('.pc-correcto')) && await pg.locator('[data-ver]').count() === 0, '«Ver resultado» lo destapa');
ok(await pg.evaluate(() => document.querySelector('#pcCaja canvas') === window.__vista), 'cero parpadeo: la pizarra es el mismo lienzo');
await pg.evaluate(() => document.querySelector('.pc-res')?.scrollIntoView()); await foto('pizarra-2');
/* volver a revisar: lo rojo no viaja a la IA (se compara la foto mandada antes y después) */
await pg.click('#pcRevisar'); await pg.waitForFunction(() => !/Revisando/.test(document.querySelector('#pcRevisar').textContent), null, { timeout: 6000 });
const img = (p) => JSON.stringify(p).match(/"data":"([^"]+)"/)?.[1] || '';
ok(pedidos.length === 2 && img(pedidos[1]).length > 1000 && img(pedidos[1]) === img(pedidos[0]), 'la segunda revisión manda tu pizarra sin el círculo rojo');
await pg.click('[data-limpiar]'); await pg.waitForTimeout(250);
ok(await pg.locator('.pc-veredicto').count() === 0, 'limpiar quita el resultado');
await pg.click('#pcRevisar'); await pg.waitForTimeout(250);
ok(pedidos.length === 2, 'y con la pizarra limpia ya no se manda nada');
const desborde = await pg.evaluate(() => [...document.querySelectorAll('#capa *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length);
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390 && desborde === 0, `nada se sale de lado (${desborde})`);
ok(err.length === 0, 'sin errores' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
console.log(`${n - f} bien · ${f} mal`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
