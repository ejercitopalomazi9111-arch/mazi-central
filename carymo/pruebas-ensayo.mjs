/* Tu ensayo (ensayo.js): lo que arma la IA se limpia (y las citas inventadas se tiran), y el recorrido completo a 390×844
   con la IA de mentiras.   node carymo/pruebas-ensayo.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const TEXTO = 'La contaminacion del agua es un problema muy grave en Mexico. Muchas fabricas tiran sus desechos a los rios y nadie hace nada. ' +
  'Ademas la gente tira basura y eso afecta a los animales. Yo creo que el gobierno deveria poner multas mas altas para las empresas. ' +
  'En conclusion, si todos cuidamos el agua podemos tener un futuro mejor para nuestros hijos y para el planeta.';

console.log('La lógica');
globalThis.localStorage = { d: {}, getItem(k){ return this.d[k] ?? null; }, setItem(k, v){ this.d[k] = String(v); } };
const E = await import('./ensayo.js');
const RESP = { titulo: 'El agua en México', tipo: 'ensayo', calificacion: 7.2, resumen: 'Buena idea central; faltan datos y acentos.',
  criterios: [{ nombre: 'Ideas', puntos: 8, comentario: 'Se entiende la postura.' }, { nombre: 'Orden', puntos: 7, comentario: '' }, { nombre: 'Argumentos', puntos: 6, comentario: 'Falta un dato o ejemplo.' }, { nombre: 'Redacción', puntos: 7, comentario: 'Faltan acentos.' }],
  marcas: [{ frase: 'deveria', tipo: 'ortografia', nota: 'Se escribe «debería».' }, { frase: 'nadie hace nada', tipo: 'argumento', nota: 'Generaliza; da un ejemplo.' },
    { frase: 'Esta frase no está en el texto', tipo: 'claridad', nota: 'inventada' }, { frase: 'En conclusion, si todos cuidamos el agua', tipo: 'bien', nota: 'Buen cierre.' }, { frase: 'deveria', tipo: 'ortografia', nota: 'repetida' }],
  mejora: { original: 'Ademas la gente tira basura y eso afecta a los animales.', nuevo: 'Además, la basura que tiramos llega a los ríos y daña a los animales que viven ahí.' },
  siguiente: ['Corrige los acentos', 'Agrega un dato con su fuente'] };
{ const r = E.revisarEnsayo(RESP, TEXTO);
  ok(r.marcas.length === 3 && !r.marcas.some((m) => /inventada/.test(m.nota)), 'las marcas que no están en el texto se tiran, y las repetidas también (quedan 3)');
  ok(r.calificacion === 7.2 && r.criterios.length === 4 && r.mejora && r.siguiente.length === 2, 'calificación, criterios, párrafo mejorado y qué sigue se conservan');
  const t = E.tramos(TEXTO, r.marcas); ok(t.map((x) => x.t).join('') === TEXTO && t.filter((x) => x.i >= 0).length === 3, 'el texto se parte en tramos sin perder ni una letra');
  const s = E.revisarEnsayo({ criterios: [{ nombre: 'Ideas', puntos: 12 }, { nombre: 'Orden', puntos: -3 }] }, TEXTO);
  ok(s.criterios[0].puntos === 10 && s.criterios[1].puntos === 0 && s.calificacion === 5, 'puntos fuera de 0-10 se topan y sin calificación se saca el promedio'); }
{ let tiro = false; try{ E.revisarEnsayo({ criterios: [] }, TEXTO); }catch{ tiro = true; } ok(tiro, 'sin criterios es error (y se pide otra vez)'); }

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
await pg.route(/ia-texto/, async (r) => { pedido = r.request().postDataJSON(); await new Promise((x) => setTimeout(x, 300));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: JSON.stringify(RESP) }) }); });
await pg.route(/^http:\/\/localhost:1\/(?!.*ia-texto)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bien: true, perfil, planes: [], ranking: { semana: '', filas: [] }, personajes: {}, tienda: {} }) }));
await pg.addInitScript((p) => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.perfil', JSON.stringify(p)); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre', nivel: 'prepa' })); sessionStorage.setItem('carymo.entrada', '1'); }, perfil);
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo()); await pg.waitForTimeout(500);
const foto = async (x) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${x}.png` }); };
await pg.click('#nav [data-ir="yo"]'); await pg.waitForTimeout(400);
ok(await pg.isVisible('#vYo [data-yo="ensayo"]'), 'en «Tú» está «Tu ensayo»');
await pg.click('#vYo [data-yo="ensayo"]'); await pg.waitForSelector('#capa.ensayo');
await pg.fill('#esTexto', 'Muy corto'); await pg.click('#esRevisar'); await pg.waitForTimeout(200);
ok(pedido === null && /mínimo 200/.test(await pg.textContent('#esCuenta')), 'con un texto muy corto no se manda nada y dice cuánto falta');
await foto('ensayo-1');
await pg.fill('#esTexto', TEXTO); await pg.fill('#esPide', 'Ensayo de 1 cuartilla sobre un problema ambiental'); await pg.click('#esRevisar');
await pg.waitForTimeout(100);
ok(/Leyendo/.test(await pg.textContent('#esRevisar')), 'mientras la IA lee, el botón dice «Leyendo…»');
await pg.waitForSelector('#esDoc', { timeout: 6000 });
ok(pedido && /contaminacion del agua/.test(pedido.mensajes?.[0]?.texto || pedido.texto || JSON.stringify(pedido)) && /problema ambiental/.test(JSON.stringify(pedido)) && /preparatoria/.test(pedido.sistema), 'a la IA le llega el texto, lo que pidieron y el nivel del alumno');
ok(/7\.2/.test(await pg.textContent('.es-cal')) && await pg.locator('.es-crit').count() === 4, 'sale la calificación y los cuatro criterios');
ok(await pg.locator('#esDoc mark').count() === 3 && (await pg.textContent('#esDoc')) === TEXTO, 'tu texto completo, con las 3 marcas que sí están en él');
ok(await pg.locator('.es-nota').count() === 3 && !/inventada/.test(await pg.textContent('#esNotas')), 'una nota por marca, sin la inventada');
const nodos = await pg.evaluate(() => { window.__doc = document.querySelector('#esDoc'); window.__m0 = document.querySelector('[data-m]'); return true; });
await pg.click('#esDoc mark >> nth=0'); await pg.waitForTimeout(150);
const act = await pg.evaluate(() => ({ m: document.querySelectorAll('mark.es-activa').length, n: document.querySelectorAll('.es-nota.es-activa').length, mismo: document.querySelector('#esDoc') === window.__doc && document.querySelector('[data-m]') === window.__m0 }));
ok(act.m === 1 && act.n === 1, 'tocar una marca enciende su nota');
ok(act.mismo, 'cero parpadeo: el texto y las marcas son los mismos nodos');
ok(/Además, la basura/.test(await pg.textContent('.es-mejora')), 'un párrafo, mejorado (no el ensayo entero)');
await foto('ensayo-2');
await pg.evaluate(() => document.querySelector('.es-mejora')?.scrollIntoView()); await foto('ensayo-3');
const guardados = await pg.evaluate(() => JSON.parse(localStorage.getItem('carymo.ensayos') || '[]'));
ok(guardados.length === 1 && guardados[0].texto === TEXTO, 'la revisión queda guardada en el teléfono');
await pg.click('[data-otro]'); await pg.waitForTimeout(250);
ok(/El agua en México/.test(await pg.textContent('#capa .mz-lista')), 'en «Recientes» aparece para volver a verla');
await pg.click('[data-viejo="0"]'); await pg.waitForTimeout(250);
ok(await pg.locator('#esDoc mark').count() === 3, 'una revisión vieja se abre completa');
const desborde = await pg.evaluate(() => [...document.querySelectorAll('#capa *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).length);
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390 && desborde === 0, `nada se sale de lado (${desborde})`);
ok(err.length === 0, 'sin errores' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
console.log(`${n - f} bien · ${f} mal`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
