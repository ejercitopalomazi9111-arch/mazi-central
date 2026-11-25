/* Tu tarea (tarea.js): lo que arma la IA se limpia, y el recorrido completo a 390×844 con la IA de mentiras.
   node carymo/pruebas-tarea.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

console.log('La lógica');
globalThis.localStorage = { d: {}, getItem(k){ return this.d[k] ?? null; }, setItem(k, v){ this.d[k] = String(v); } };
const T = await import('./tarea.js');
{ const t = T.revisarTarea({ tema: 'Ecuaciones', pasos: [{ titulo: '1. Pasa el 5', explica: 'Resta 5 de los dos lados: 2x = 12' }, 'Divide entre 2: x = 6', { titulo: '', explica: '' }], resultado: 'x = 6', cuidado: ['Olvidar restar de los dos lados', ''], parecido: { enunciado: '3x + 2 = 11', respuesta: 'x = 3' } });
  ok(t.pasos.length === 2 && t.pasos[0].titulo === 'Pasa el 5' && t.pasos[1].explica === 'Divide entre 2: x = 6', 'los pasos salen limpios: sin número, sin vacíos, y aguanta pasos sueltos como texto');
  ok(t.cuidado.length === 1 && t.parecido.respuesta === 'x = 3' && t.resultado === 'x = 6', 'resultado, «ojo con» y el ejercicio parecido se conservan'); }
{ let tiro = false; try{ T.revisarTarea({ pasos: [] }); }catch{ tiro = true; } ok(tiro, 'sin pasos es error (y se pide otra vez)');
  let msg = ''; try{ T.revisarTarea({ error: 'La foto está borrosa' }); }catch(e){ msg = e.message; } ok(msg === 'La foto está borrosa', 'si la IA dice que no se lee, se le dice eso al alumno'); }

console.log('La pantalla');
const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 9, cuidado: { hambre: 80, limpieza: 80, animo: 70, t: Date.now() } };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
let pedido = null;
const RESP = { materia: 'Matemáticas', tema: 'Ecuación de primer grado', enunciado: 'Resuelve 2x + 5 = 17',
  pasos: [{ titulo: 'Pasa el 5 restando', explica: 'Resta 5 en los dos lados: 2x + 5 − 5 = 17 − 5, o sea 2x = 12.' }, { titulo: 'Despeja la x', explica: 'Divide los dos lados entre 2: x = 12 / 2 = 6.' }, { titulo: 'Comprueba', explica: '2(6) + 5 = 17. Sí da.' }],
  resultado: 'x = 6', cuidado: ['Restar el 5 sólo de un lado'], parecido: { enunciado: 'Resuelve 3x + 2 = 11', respuesta: 'x = 3' } };
await pg.route(/ia-texto/, async (r) => { pedido = r.request().postDataJSON(); await new Promise((x) => setTimeout(x, 300));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: JSON.stringify(RESP) }) }); });
await pg.route(/^http:\/\/localhost:1\/(?!.*ia-texto)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} }) }));
await pg.addInitScript((p) => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.perfil', JSON.stringify(p)); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre', nivel: 'secu' })); sessionStorage.setItem('carymo.entrada', '1'); }, perfil);
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo()); await pg.waitForTimeout(500);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png` }); };
await pg.click('#nav [data-ir="yo"]'); await pg.waitForTimeout(400);
ok(await pg.isVisible('#vYo [data-yo="tarea"]'), 'en «Tú» está «Tu tarea»');
await pg.click('#vYo [data-yo="tarea"]'); await pg.waitForSelector('#capa.tarea');
await foto('tarea-1');
/* con foto: se manda la imagen a la IA de fotos */
const png = (await import('node:fs')).readFileSync(new URL('../marca/paloma-2026/icono-512.png', import.meta.url));
await pg.setInputFiles('#trFoto', { name: 'tarea.png', mimeType: 'image/png', buffer: png });
await pg.waitForTimeout(120);
ok(/Leyendo/.test(await pg.textContent('#trFotoBt')), 'mientras la IA lee la foto, el botón dice «Leyendo…»');
await pg.waitForSelector('#trPasos', { state: 'attached', timeout: 6000 });
ok(pedido && pedido.imagenes?.length === 1 && pedido.motor === 'gemini' && /PASO A PASO/.test(pedido.sistema) && /secundaria/.test(pedido.sistema), 'a la IA le llega la foto, con la instrucción paso a paso y el nivel del alumno (secundaria)');
ok(await pg.locator('.tr-paso').count() === 0 && /Primer paso/.test(await pg.textContent('#trSig')), 'no suelta la respuesta de golpe: arranca sin pasos y con «Primer paso»');
ok(/Resuelve 2x \+ 5 = 17/.test(await pg.textContent('.tr-enunciado')), 'arriba dice qué pide el ejercicio');
const nodo = await pg.evaluate(() => { window.__ol = document.querySelector('#trPasos'); return true; });
await pg.click('#trSig'); await pg.waitForTimeout(100);
const p1 = await pg.evaluate(() => { window.__p1 = document.querySelector('.tr-paso'); return document.querySelector('.tr-paso').textContent; });
ok(/Pasa el 5/.test(p1) && /Siguiente paso/.test(await pg.textContent('#trSig')), 'se destapa el primer paso y el botón dice «Siguiente paso»');
await pg.click('#trSig'); await pg.click('#trSig'); await pg.waitForTimeout(100);
ok(/Ver resultado/.test(await pg.textContent('#trSig')) && await pg.locator('.tr-paso').count() === 3, 'con los tres pasos, el botón dice «Ver resultado»');
ok(await pg.evaluate(() => document.querySelector('#trPasos') === window.__ol && document.querySelector('.tr-paso') === window.__p1), 'cero parpadeo: la lista y el primer paso son los mismos nodos (sólo se agregan)');
await foto('tarea-2-pasos');
ok(!(await pg.isVisible('.tr-resultado')), 'el resultado no se ve antes de pedirlo');
await pg.click('#trSig'); await pg.waitForTimeout(150);
ok(/x = 6/.test(await pg.textContent('.tr-resultado')) && /Restar el 5/.test(await pg.textContent('.tr-cuidado')), 'al final: el resultado y en qué se equivoca la gente');
ok(/3x \+ 2 = 11/.test(await pg.textContent('.tr-parecido')) && !(await pg.isVisible('#trResp')), 'y un ejercicio parecido con la respuesta escondida');
await pg.click('#trVer'); await pg.waitForTimeout(100);
ok(await pg.isVisible('#trResp') && /x = 3/.test(await pg.textContent('#trResp')), '«Ver respuesta» la destapa');
await foto('tarea-3-final');
const guardadas = await pg.evaluate(() => JSON.parse(localStorage.getItem('carymo.tareas') || '[]'));
ok(guardadas.length === 1 && guardadas[0].tema === 'Ecuación de primer grado', 'la tarea queda guardada en el teléfono');
await pg.click('[data-otra]'); await pg.waitForTimeout(250);
ok(/Ecuación de primer grado/.test(await pg.textContent('#capa .mz-lista')), 'en «Recientes» aparece para volver a verla');
await pg.click('[data-vieja="0"]'); await pg.waitForTimeout(250);
ok(await pg.locator('.tr-paso').count() === 3 && await pg.isVisible('.tr-resultado'), 'una tarea vieja se abre completa');
/* escrita, con la duda */
await pg.click('[data-volver]'); await pg.waitForTimeout(200);
await pg.click('.tr-escribir summary'); await pg.fill('#trTexto', 'Resuelve 2x + 5 = 17'); await pg.fill('#trDuda', 'No sé por qué se resta'); await pg.click('#trExplicar');
await pg.waitForSelector('#trPasos', { state: 'attached', timeout: 6000 });
ok(/2x \+ 5 = 17/.test(pedido.mensajes[0].texto) && /No sé por qué se resta/.test(pedido.mensajes[0].texto) && !pedido.imagenes?.length, 'escrito: a la IA le llega el ejercicio y la duda, sin foto');
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, 'nada se sale de lado');
ok(err.length === 0, 'sin errores' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
console.log(`${n - f} bien · ${f} mal`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
