/* Tus tarjetas (mazos.js): la lógica del repaso y el recorrido completo a 390×844.
   node carymo/pruebas-mazos.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

console.log('La lógica');
globalThis.localStorage = { d: {}, getItem(k){ return this.d[k] ?? null; }, setItem(k, v){ this.d[k] = String(v); } };
const M = await import('./mazos.js');
{ const l = M.leerLista('dog - perro\ncat: gato\nsun\tsol\nsin separador\n\n  house = casa  ');
  ok(l.length === 4 && l[0].frente === 'dog' && l[0].reverso === 'perro' && l[3].reverso === 'casa', `pegar una lista lee «-», «:», tabulador e «=» y se salta lo que no trae separador (${l.length} de 5 renglones)`);
  ok(M.leerLista('1 - 2 = 3 - x')[0]?.frente === '1', 'si hay varios separadores, corta en el primero (el reverso puede traer guiones)'); }
{ const m = { tarjetas: [M.tarjeta('a', '1'), M.tarjeta('b', '2'), M.tarjeta('c', '3')] }, hoy = '2026-11-19';
  ok(M.paraHoy(m, hoy).length === 3, 'las tarjetas nuevas tocan hoy');
  M.calificar(m.tarjetas[0], true, hoy); M.calificar(m.tarjetas[1], false, hoy);
  ok(m.tarjetas[0].toca === '2026-11-20' && m.tarjetas[0].caja === 1, 'la que te sabes se aleja: caja 1, mañana');
  ok(m.tarjetas[1].toca === '2026-11-20' && m.tarjetas[1].caja === 0, 'la que fallas regresa a la primera caja y vuelve mañana');
  M.calificar(m.tarjetas[0], true, '2026-11-20'); ok(m.tarjetas[0].toca === '2026-11-22', 'sabérsela otra vez la manda a 2 días');
  ok(M.paraHoy(m, hoy).map((t) => t.frente).join() === 'c', 'hoy ya sólo queda la que no has visto');
  const orden = M.paraHoy({ tarjetas: [{ frente: 'x', caja: 3, toca: '' }, { frente: 'y', caja: 0, toca: '' }] }, hoy).map((t) => t.frente).join();
  ok(orden === 'y,x', 'primero las de caja más baja (las que más fallas)'); }

console.log('La pantalla');
const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 9, cuidado: { hambre: 80, limpieza: 80, animo: 70, t: Date.now() } };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.route(/^http:\/\/localhost:1\//, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} }) }));
await pg.addInitScript((p) => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.perfil', JSON.stringify(p)); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' })); sessionStorage.setItem('carymo.entrada', '1'); }, perfil);
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo()); await pg.waitForTimeout(500);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png` }); };
await pg.click('#nav [data-ir="yo"]'); await pg.waitForTimeout(400);
ok(await pg.isVisible('#vYo [data-yo="tarjetas"]'), 'en «Tú» está «Tus tarjetas»');
await pg.click('#vYo [data-yo="tarjetas"]'); await pg.waitForSelector('#capa.mazos');
ok(/Todavía no tienes tarjetas/.test(await pg.textContent('#capa')), 'sin mazos, dice qué hacer');
await pg.click('[data-nuevo]'); await pg.fill('#mzNom', 'Verbos en inglés'); await pg.click('#mzCrear'); await pg.waitForTimeout(300);
ok(/Verbos en inglés/.test(await pg.textContent('#capa .mz-titulo')), 'crear un mazo lo abre');
await pg.fill('#mzF', 'to run'); await pg.fill('#mzR', 'correr'); await pg.click('#mzAgregar'); await pg.waitForTimeout(200);
await pg.click('.mz-pegar summary'); await pg.fill('#mzLista', 'to eat - comer\nto sleep - dormir\nto read - leer'); await pg.click('#mzPegar'); await pg.waitForTimeout(300);
ok(await pg.locator('.mz-t').count() === 4, `una a mano y tres pegadas: ${await pg.locator('.mz-t').count()} tarjetas`);
ok(/Repasar \(4\)/.test(await pg.textContent('[data-repasar]')), 'el botón dice cuántas tocan hoy');
await foto('mazos-1');
await pg.click('[data-repasar]'); await pg.waitForSelector('#mzCarta');
const nodo = await pg.evaluate(() => { window.__carta = document.querySelector('#mzCarta'); window.__fr = document.querySelector('#mzFr'); return document.querySelector('#mzFr').textContent; });
ok(nodo === 'to run' && !(await pg.isVisible('#mzBots')), 'sale la primera de frente, sin botones hasta voltearla');
await pg.click('#mzCarta'); await pg.waitForTimeout(450);
ok(await pg.evaluate(() => document.querySelector('#mzCarta').classList.contains('volteada')) && await pg.isVisible('#mzBots'), 'tocarla la voltea y salen «No me la sabía» y «Me la sabía»');
await foto('mazos-2-volteada');
await pg.click('[data-mal]'); await pg.waitForTimeout(200);   /* falla la primera: vuelve al final de la tanda */
for(let i = 0; i < 3; i++){ await pg.click('#mzCarta'); await pg.waitForTimeout(80); await pg.click('[data-bien]'); await pg.waitForTimeout(80); }
const ultima = await pg.evaluate(() => ({ texto: document.querySelector('#mzFr')?.textContent, cuenta: document.querySelector('#mzCuenta').textContent, misma: document.querySelector('#mzCarta') === window.__carta && document.querySelector('#mzFr') === window.__fr }));
ok(ultima.texto === 'to run' && ultima.cuenta === '5 de 5', `la fallada vuelve al final de la tanda (${ultima.texto}, ${ultima.cuenta})`);
ok(ultima.misma, 'cero parpadeo: la tarjeta es el mismo nodo toda la tanda');
await pg.click('#mzCarta'); await pg.waitForTimeout(80); await pg.click('[data-bien]'); await pg.waitForTimeout(300);
ok(/¡Listo!/.test(await pg.textContent('#capa')) && /3 de 4 a la primera/.test(await pg.textContent('#capa')), 'al final: «¡Listo!» y cuántas a la primera (3 de 4)');
const guardado = await pg.evaluate(() => JSON.parse(localStorage.getItem('carymo.mazos'))[0].tarjetas.map((t) => [t.frente, t.caja]));
ok(guardado.find(([x]) => x === 'to run')[1] === 0 && guardado.filter(([, c]) => c === 1).length === 3, 'queda guardado: la fallada en la primera caja y las demás en la segunda');
await pg.click('[data-volver]'); await pg.waitForTimeout(300);
ok(/Al día/.test(await pg.textContent('[data-repasar]')), 'el mazo queda «Al día»');
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, 'nada se sale de lado');
ok(err.length === 0, 'sin errores' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
console.log(`${n - f} bien · ${f} mal`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
