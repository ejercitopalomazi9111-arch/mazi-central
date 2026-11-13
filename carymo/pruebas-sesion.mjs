/* Varios cursos a la vez y la sesión de estudio con pomodoro (sesion.js), con el reloj adelantado a mano.
   node carymo/pruebas-sesion.mjs            (FOTOS=carpeta para capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8500 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

const plan = (id, materia, fecha) => ({ id, titulo: 'Examen de ' + materia, materia, fecha, forma: 2, progreso: {}, cambio: 1,
  unidades: [{ id: 'u' + id, titulo: materia, color: '#7E1735', temas: [{ id: 't' + id, titulo: 'Tema de ' + materia }], nodos: [{ id: 'a' + id, tipo: 'pizarra', alcance: 'unidad', titulo: materia }, { id: 'b' + id, tipo: 'quiz', tema: 't' + id, titulo: 'Tema de ' + materia }] }] });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage();
const err = []; pg.on('pageerror', (e) => err.push(e.message));
const foto = async (nm) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${nm}.png` }); };
await pg.addInitScript((planes) => {
  if(sessionStorage.getItem('ya')) return; sessionStorage.setItem('ya', '1');
  localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'paloma', mascotaHabla: false }));
  localStorage.setItem('est.planes', JSON.stringify(planes)); localStorage.setItem('est.actual', JSON.stringify('q'));
}, { m: plan('m', 'Matemáticas', '2026-11-18'), q: plan('q', 'Química', '2026-11-17'), bi: plan('bi', 'Biología', '2026-11-20') });
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForSelector('.cursos-fila');
await pg.clock.install();   /* desde aquí, el reloj lo adelanto yo */
const actual = () => pg.evaluate(() => window.__estudio.estado().actualId);

console.log('Tus cursos a la mano');
const chips = await pg.$$eval('.curso-chip[data-curso] b', (x) => x.map((e) => e.textContent));
ok(chips.join(',') === 'Química,Matemáticas,Biología', `arriba salen todos tus cursos, el examen más cercano primero (${chips.join(', ')})`);
await foto('01-cursos');
await pg.click('.curso-chip[data-curso="bi"]'); await pg.waitForTimeout(300);
ok(await actual() === 'bi' && /Biología/.test(await pg.textContent('#planNombre')), 'un toque y cambias de curso');

console.log('La sesión de estudio');
await pg.click('[data-sesion-abrir]');
await pg.click('[data-ses-c="bi"]');            /* quito Biología: quedan Química y Matemáticas */
await pg.click('[data-grupo="min"] [data-v="15"]'); await pg.click('[data-grupo="pausa"] [data-v="5"]');
ok(/2 bloques · 35 min/.test(await pg.textContent('#sesTotal')), 'te dice cuánto va a durar (2 bloques de 15 y un descanso de 5 = 35 min)');
await foto('02-armar');
await pg.click('#sesEmpezar'); await pg.waitForTimeout(400);
ok(await actual() === 'q', 'empieza con el primer curso (Química)');
ok(/15:00|14:5\d/.test(await pg.textContent('#pomodoro')) && /Química/.test(await pg.textContent('#pomodoro')), 'arriba sale el cronómetro con el curso');
await foto('03-corriendo');
await pg.clock.fastForward('15:01'); await pg.waitForTimeout(300);
ok(/Descanso/.test(await pg.textContent('#pomodoro')), 'a los 15 minutos: descanso');
ok(/Descanso de 5 minutos/.test(await pg.textContent('body')), 'y la mascota te lo dice con su modo');
await foto('04-descanso');
/* el descanso se acaba mientras estás en una lección: no te saca */
await pg.evaluate(() => { const c = document.createElement('section'); c.id = 'capa'; c.className = 'capa'; document.getElementById('capas').append(c); });
await pg.clock.fastForward('05:01'); await pg.waitForTimeout(300);
ok(await actual() === 'q' && /Ya toca Matemáticas/.test(await pg.textContent('#brindis')), 'si estás a media lección, te avisa pero no te saca');
await pg.evaluate(() => { document.getElementById('capa').remove(); });
await pg.clock.fastForward(1200); await pg.waitForTimeout(300);
ok(await actual() === 'm', 'al salir de la lección, cambia solo a Matemáticas');

console.log('Pausar, cerrar la app y terminar');
await pg.click('#pomodoro'); await pg.click('#sesPausa'); await pg.waitForTimeout(200);
const enPausa = await pg.textContent('#pomodoro');
await pg.clock.fastForward('10:00'); await pg.waitForTimeout(300);
ok(/en pausa/.test(enPausa) && (await pg.textContent('#pomodoro')).includes(enPausa.match(/\d+:\d\d/)[0]), 'en pausa el tiempo no corre');
await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('#pomodoro'); await pg.clock.install();
ok(/en pausa/.test(await pg.textContent('#pomodoro')), 'cerrar y abrir la app no pierde la sesión');
await pg.click('#pomodoro'); await pg.click('#sesPausa'); await pg.waitForTimeout(200);
await pg.clock.fastForward('15:01'); await pg.waitForTimeout(400);
ok(!(await pg.$('#pomodoro')) && /Terminamos la sesión|Sesión terminada/.test(await pg.textContent('body')), 'al acabar el último bloque, se termina y te felicita');
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, 'nada se sale de lado');
ok(err.length === 0, 'cero errores' + (err.length ? ': ' + err[0] : ''));
console.log(`\n${n - f} pasan · ${f} fallan`);
await b.close(); srv.kill(); process.exit(f ? 1 : 0);
