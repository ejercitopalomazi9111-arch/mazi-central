/* El horario como calendario semanal (carymo.js semanaHtml), a 390×844 con el reloj fijo en un martes 10:15.
   node carymo/pruebas-semana.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const MAT = ['Matemáticas', 'Física', 'Química', 'Literatura e investigación documental muy larga', 'Inglés', 'Ética'];
const clases = []; for(let dia = 0; dia < 5; dia++) MAT.forEach((m, k) => (dia < 4 || k < 3) && clases.push({ dia, inicio: `${String(7 + k).padStart(2, '0')}:00`, fin: `${String(7 + k).padStart(2, '0')}:50`, materia: m }));
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 9, horario: { clases }, cuidado: { hambre: 80, limpieza: 80, animo: 70, t: Date.now() } };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, timezoneId: 'America/Mexico_City' });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.clock.install({ time: new Date('2026-11-17T10:15:00-06:00') });   /* martes 10:15 en México */
await pg.route(/^http:\/\/localhost:1\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} }) }));
await pg.addInitScript((p) => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.perfil', JSON.stringify(p)); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' })); sessionStorage.setItem('carymo.entrada', '1'); }, perfil);
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo());
await pg.clock.runFor(800);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png`, fullPage: true }); };
await pg.click('#nav [data-ir="yo"]'); await pg.clock.runFor(300); await pg.click('#vYo [data-ir="horario"]'); await pg.clock.runFor(500);

console.log('La semana');
ok(await pg.locator('.hz-semana .hs-col').count() === 5, 'la semana viene de fábrica: cinco columnas, de lunes a viernes');
ok(await pg.locator('.hs-clase').count() === clases.length, `cada clase es un bloque (${await pg.locator('.hs-clase').count()} de ${clases.length})`);
const pos = await pg.evaluate(() => { const c = document.querySelectorAll('.hs-col')[0].querySelectorAll('.hs-clase'); return [...c].map((x) => x.offsetTop); });
ok(pos[1] - pos[0] === 72, `una hora más tarde = 72 px más abajo (${pos[1] - pos[0]})`);
ok(await pg.locator('.hs-col.hoy[data-hs-dia="1"] .hs-ahora').count() === 1, 'el martes es «hoy» y trae la línea roja de ahora');
ok(await pg.locator('.hs-col.hoy .hs-clase.ahora').count() === 1 && /Literatura/.test(await pg.textContent('.hs-col.hoy .hs-clase.ahora')), 'la clase de ahorita (la de las 10:00) se marca');
const des = await pg.evaluate(() => ({ pag: document.documentElement.scrollWidth, bloques: [...document.querySelectorAll('.hs-clase')].every((x) => { const r = x.getBoundingClientRect(), c = x.parentElement.getBoundingClientRect(); return r.left >= c.left - .5 && r.right <= c.right + .5; }) }));
ok(des.pag <= 390 && des.bloques, `nada se sale: la página mide ${des.pag} px y cada bloque cabe en su día (también la materia de nombre larguísimo)`);
await foto('semana-1');

console.log('Cero parpadeo al pasar el minuto');
const antes = await pg.evaluate(() => { window.__nodos = [...document.querySelectorAll('.hs-clase')]; return parseFloat(document.querySelector('.hs-ahora').style.top); });
await pg.clock.runFor(61_000);
const despues = await pg.evaluate(() => ({ mismos: [...document.querySelectorAll('.hs-clase')].every((x, k) => x === window.__nodos[k]), top: parseFloat(document.querySelector('.hs-ahora').style.top) }));
ok(despues.mismos, 'al pasar el minuto, los bloques son los mismos nodos (no se vuelven a crear)');
ok(Math.abs(despues.top - antes - 1.2) < 1.01, `y sólo se mueve la línea roja (${antes} → ${despues.top} px)`);

console.log('Agregar tocando un hueco (el viernes queda libre desde las 10:00)');
const hueco = await pg.evaluate(() => { const col = document.querySelectorAll('.hs-col')[4], r = col.getBoundingClientRect(), sem = document.querySelector('.hz-semana');
  const y = r.top + (11 * 60 + 30 - +sem.dataset.desde) * 1.2 + 2; return { x: r.left + r.width / 2, y }; });
/* el hueco de las 13:30 del jueves: si no cabe en la pantalla, se baja primero */
await pg.evaluate((y) => window.scrollBy(0, y - 400), hueco.y); await pg.clock.runFor(200);
const h2 = await pg.evaluate(() => { const col = document.querySelectorAll('.hs-col')[4], r = col.getBoundingClientRect(), sem = document.querySelector('.hz-semana'); return { x: r.left + r.width / 2, y: r.top + (11 * 60 + 30 - +sem.dataset.desde) * 1.2 + 2 }; });
await pg.mouse.click(h2.x, h2.y); await pg.clock.runFor(400);
const pre = await pg.evaluate(() => ({ jueves: document.querySelector('[data-dia="4"]')?.getAttribute('aria-pressed'), ini: document.querySelector('#cIni')?.value, fin: document.querySelector('#cFin')?.value }));
ok(pre.jueves === 'true' && pre.ini === '11:30' && pre.fin === '12:20', `tocar el hueco del viernes a las 11:30 abre «Agregar» con viernes, 11:30 y 12:20 (${pre.jueves}, ${pre.ini}, ${pre.fin})`);
await foto('semana-2-agregar');
await pg.fill('#cMat', 'Tutoría'); await pg.click('#cListo'); await pg.clock.runFor(500);
ok(await pg.locator('.hs-col[data-hs-dia="4"] .hs-clase', { hasText: 'Tutoría' }).count() === 1, 'la clase nueva aparece en el viernes');

console.log('Tocar un bloque');
await pg.locator('.hs-col[data-hs-dia="4"] .hs-clase', { hasText: 'Tutoría' }).click(); await pg.clock.runFor(400);
ok(await pg.isVisible('#vcQuitar') && /Viernes · 11:30 a 12:20/.test(await pg.textContent('body')), 'dice qué clase es, el día y la hora');
await pg.click('#vcQuitar'); await pg.clock.runFor(500);
ok(await pg.locator('.hs-clase', { hasText: 'Tutoría' }).count() === 0, 'y «Quitar» la quita');

console.log('Lista y Semana');
await pg.click('[data-hz-modo="lista"]'); await pg.clock.runFor(300);
ok(await pg.locator('.hz-dia').count() === 5 && await pg.locator('.hz-semana').count() === 0 && await pg.isVisible('#bEditarHorario'), 'Lista regresa a los días plegados, con «Editar»');
await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo()); await pg.clock.runFor(800);
await pg.click('#nav [data-ir="yo"]'); await pg.clock.runFor(300); await pg.click('#vYo [data-ir="horario"]'); await pg.clock.runFor(500);
ok(await pg.locator('.hz-dia').count() === 5, 'y se acuerda de cuál elegiste');
await pg.click('[data-hz-modo="semana"]'); await pg.clock.runFor(300);
ok(err.length === 0, 'sin errores' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
console.log(`${n - f} bien · ${f} mal`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
