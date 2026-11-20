/* Apuntes en limpio (limpio.js): lo que arma la IA se limpia, y el recorrido dentro de un apunte tuyo a 390×844 con la IA
   de mentiras: «En limpio» desde lo escrito y «Desde foto» con un apunte vacío.   node carymo/pruebas-limpio.mjs  (FOTOS=carpeta) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const RESP = { titulo: 'La célula', materia: 'Biología', texto: 'la celula tiene membrana nucleo y citoplasma. la mitocondria da energia',
  secciones: [{ titulo: 'Partes', puntos: ['Membrana: la protege', 'Núcleo: guarda el ADN', ''] }, { titulo: 'Energía', puntos: ['La mitocondria hace ATP'] }, { titulo: 'Vacía', puntos: [] }],
  clave: [{ termino: 'Mitocondria', definicion: 'Organelo que produce energía.' }, { termino: 'mitocondria', definicion: 'repetida' }, { termino: 'Sin definición', definicion: '' }],
  resumen: 'La célula tiene tres partes y la mitocondria le da energía.' };

console.log('La lógica');
const L = await import('./limpio.js');
{ const r = L.revisarLimpio(RESP);
  ok(r.secciones.length === 2 && r.secciones[0].puntos.length === 2, 'secciones sin puntos y puntos vacíos se tiran');
  ok(r.clave.length === 1, 'términos repetidos o sin definición se tiran');
  ok(r.resumen && r.titulo === 'La célula' && r.cuando > 0, 'título, resumen y la hora se conservan'); }
{ let e = null; try{ L.revisarLimpio({ error: 'La foto está borrosa' }); }catch(x){ e = x; } ok(e && e.sinReintento && /borrosa/.test(e.message), 'si la IA dice que no pudo, se dice tal cual y no se reintenta'); }
{ let tiro = false; try{ L.revisarLimpio({ secciones: [] }); }catch{ tiro = true; } ok(tiro, 'sin secciones es error (y se pide otra vez)'); }
ok(!/<script>/.test(L.htmlLimpio(L.revisarLimpio({ secciones: [{ titulo: '<script>', puntos: ['x'] }], clave: [] }), (s) => String(s).replace(/</g, '&lt;'))), 'lo que manda la IA se escapa');

console.log('La pantalla');
const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 9, cuidado: { hambre: 80, limpieza: 80, animo: 70, t: Date.now() } };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
const pedidos = [];
await pg.route(/ia-texto/, async (r) => { pedidos.push(r.request().postDataJSON()); await new Promise((x) => setTimeout(x, 300));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: JSON.stringify(RESP) }) }); });
await pg.route(/^http:\/\/localhost:1\/(?!.*ia-texto)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} }) }));
await pg.addInitScript((p) => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.perfil', JSON.stringify(p)); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre', nivel: 'prepa' })); sessionStorage.setItem('carymo.entrada', '1'); }, perfil);
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio); await pg.waitForTimeout(400);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png`, fullPage: false }); };
await pg.click('#nav [data-ir="yo"]').then(() => pg.click('#vYo [data-ir="apuntes"]'));
await pg.waitForSelector('#apNuevo'); await pg.click('#apNuevo'); await pg.waitForSelector('#apTxt');
ok(await pg.isVisible('[data-limpio]') && await pg.isVisible('#apFotoBt'), 'en tu apunte están «En limpio» y «Desde foto»');
await pg.fill('#apTxt', 'corto'); await pg.click('[data-limpio]'); await pg.waitForTimeout(200);
ok(pedidos.length === 0, 'con casi nada escrito no se manda nada');
const nodos = await pg.evaluate(() => { window.__txt = document.querySelector('#apTxt'); return true; });
await pg.fill('#apTxt', 'la celula tiene membrana nucleo y citoplasma. la mitocondria da energia y el nucleo guarda adn');
await pg.click('[data-limpio]'); await pg.waitForTimeout(100);
ok(/Leyendo/.test(await pg.textContent('[data-limpio]')), 'mientras la IA lee, el botón dice «Leyendo…»');
await pg.waitForSelector('.lp-hoja', { timeout: 6000 }); await pg.waitForTimeout(150);
ok(pedidos.length === 1 && /mitocondria/.test(JSON.stringify(pedidos[0])) && /preparatoria/.test(pedidos[0].sistema), 'a la IA le llega lo que escribiste y el nivel del alumno');
ok(await pg.locator('.lp-sec').count() === 2 && await pg.locator('.lp-clave dt').count() === 1 && /tres partes/.test(await pg.textContent('.lp-resumen')), 'sale en limpio: secciones, término clave y resumen');
ok(/En limpio/.test(await pg.textContent('[data-limpio]')), 'el botón vuelve a su nombre');
const sigue = await pg.evaluate(() => ({ mismo: document.querySelector('#apTxt') === window.__txt, v: document.querySelector('#apTxt').value, t: document.querySelector('#apTit').value }));
ok(sigue.mismo && /celula tiene/.test(sigue.v), 'cero parpadeo y tu texto no se toca');
ok(sigue.t === 'La célula', 'el título vacío se llena con el de la IA');
await foto('limpio-1');
await pg.waitForTimeout(400); await pg.click('[data-cerrar]'); await pg.waitForTimeout(400);
await pg.click('[data-apf="propio"]'); await pg.waitForTimeout(300);
await pg.click('.ap-card:has-text("La célula")'); await pg.waitForSelector('#apTxt');
ok(await pg.locator('.lp-sec').count() === 2, 'al volver a abrirlo, la versión en limpio sigue ahí');
await pg.click('[data-cerrar]'); await pg.waitForTimeout(300);
await pg.fill('#apBuscar', 'ATP'); await pg.waitForTimeout(450);
ok(await pg.locator('.ap-card:has-text("La célula")').count() === 1, 'el buscador también encuentra lo que está en limpio');
await pg.fill('#apBuscar', ''); await pg.waitForTimeout(450);

console.log('Desde foto');
await pg.click('#apNuevo'); await pg.waitForSelector('#apTxt');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
await pg.setInputFiles('#apFoto', { name: 'cuaderno.png', mimeType: 'image/png', buffer: png });
await pg.waitForSelector('.lp-hoja', { timeout: 6000 }); await pg.waitForTimeout(150);
ok(pedidos.length === 2 && (pedidos[1].imagenes?.length || /image\/jpeg/.test(JSON.stringify(pedidos[1]))), 'la foto le llega a la IA');
ok(/membrana nucleo/.test(await pg.inputValue('#apTxt')) && await pg.inputValue('#apMat') === 'Biología', 'con el apunte vacío, se llena con lo que se leyó de la foto y su materia');
await foto('limpio-2');
const desborde = await pg.evaluate(() => [...document.querySelectorAll('#capa *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length);
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390 && desborde === 0, `nada se sale de lado (${desborde})`);
ok(err.length === 0, 'sin errores' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
console.log(`${n - f} bien · ${f} mal`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
