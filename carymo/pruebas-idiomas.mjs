/* pruebas-idiomas.mjs — LOS CURSOS DE IDIOMAS (Carlos, 14 nov: «falta todavía lo de idiomas… lo de Duolingo, todo»)
 * Que se lleguen desde el inicio y desde «Tus planes», que el curso se vuelva un plan con su camino y que la primera
 * lección abra con el contenido escrito a mano (nada inventado en vivo). En un iPhone 13, sin red de IA.
 * node carymo/pruebas-idiomas.mjs */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { IDIOMAS, respuestaEstricta } from './idiomas.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8600 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
let n = 0, f = 0;
const ok = (c, t) => { n++; if(!c) f++; console.log(`  ${c ? '✓' : '✗'} ${t}`); };
/* ortografía estricta (§11): lo que no es ortografía se perdona; un error de dedo o un acento faltante, no */
{ const E = (d, b) => respuestaEstricta(d, b).bien;
  ok(E('Thank you.', ['thank you']) && E('  MERCI !', ['merci']) && E('they’re', ["they're"]), 'estricta: perdona mayúsculas, espacios, signo final y apóstrofo curvo');
  ok(!E('tank you', ['thank you']) && !E('merc', ['merci']) && !E('cafe', ['café']), 'estricta: un error de dedo o un acento faltante es error');
  const todas = IDIOMAS.flatMap((k) => k.unidades.flatMap((u) => u.temas.flatMap((t) => t.preguntas.filter((q) => q.tipo === 'escribir'))));
  ok(todas.every((q) => E(q.respuesta, [q.respuesta, ...(q.aceptadas || [])]) && (q.aceptadas || []).every((a) => E(a, [q.respuesta, ...q.aceptadas]))), `estricta: las ${todas.length} respuestas escritas de los cursos se aceptan escritas como vienen`); }

console.log('El contenido');
for(const k of IDIOMAS){
  const temas = k.unidades.flatMap((u) => u.temas);
  ok(temas.every((t) => t.leccion.ideas.length >= 3 && t.preguntas.length >= 3), `${k.titulo}: cada lección trae 3 ideas y 3 ejercicios o más`);
  const malas = temas.flatMap((t) => t.preguntas).filter((q) => q.tipo === 'ordenar' && (q.pasos.length < 3 || q.pasos.length > 7 || new Set(q.pasos.map((x) => x.toLowerCase())).size !== q.pasos.length));
  ok(!malas.length, `${k.titulo}: las frases para ordenar no repiten palabra (si no, hay dos órdenes buenos)` + (malas.length ? ': ' + malas.map((q) => q.pasos.join(' ')).join(' | ') : ''));
  const huecos = temas.flatMap((t) => t.preguntas).filter((q) => q.tipo === 'hueco' && (!q.frase.includes('___') || q.distractores.includes(q.respuesta)));
  ok(!huecos.length, `${k.titulo}: cada «completa» tiene su hueco y la respuesta no está entre las malas`);
}

await new Promise((r) => setTimeout(r, 700));
const b = await chromium.launch();
try{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const p = await ctx.newPage(); const err = []; p.on('pageerror', (x) => err.push(x.message));
  await p.goto(`http://127.0.0.1:${PUERTO}/carymo/?sinsw`); await p.waitForTimeout(1500);

  console.log('Dónde se encuentra');
  ok(!!(await p.$('#bIdiomas')), 'el inicio sin plan trae el botón «Idiomas»');
  await p.click('#bIdiomas'); await p.waitForTimeout(500);
  const cursos = await p.$$eval('#capa [data-curso]', (xs) => xs.map((x) => x.textContent));
  ok(cursos.length === IDIOMAS.length, `salen los ${IDIOMAS.length} cursos`);
  ok(cursos.some((t) => /Inglés desde cero/.test(t)), 'entre ellos «Inglés desde cero»');
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, `nada se sale de lado (${ancho} px)`);

  console.log('El curso se vuelve plan');
  await p.click('#capa [data-curso="idi-ingles-1"]'); await p.waitForTimeout(800);
  const st = await p.evaluate(() => { const e = window.__estudio.estado(); const pl = e.planes[e.actualId]; return { id: e.actualId, idioma: pl.idioma, unidades: pl.unidades.length, contenido: Object.keys(pl.contenido).length }; });
  ok(st.id === 'p-idi-ingles-1' && st.idioma === 'Inglés', 'queda como el plan actual, marcado como idioma');
  ok(st.unidades === 3 && st.contenido === 11, `con sus 3 unidades y 11 lecciones ya escritas (${st.unidades} · ${st.contenido})`);
  ok(!!(await p.$('.camino')), 'y se ve el camino');
  ok(/Inglés desde cero/.test(await p.textContent('body')), 'con el nombre del curso');

  console.log('La primera lección');
  const primera = await p.evaluate(() => { const e = window.__estudio.estado(); const pl = e.planes[e.actualId]; for(const u of pl.unidades) for(const x of u.nodos) if(x.tipo === 'quiz') return x.id; });
  await p.evaluate((id) => { window.__estudio.prueba.nodo(id, true); }, primera); await p.waitForTimeout(1200);
  const txt = await p.textContent('#capa').catch(() => '');
  ok(/Hello/.test(txt), 'abre con la lección escrita (Hello), sin pedirle nada a la IA');
  const dichas = []; await p.exposeFunction('__dijo', (t, l) => dichas.push([t, l]));
  await p.evaluate(() => { speechSynthesis.speak = (u) => window.__dijo(u.text, u.lang); });
  const boton = await p.$('#capa [data-decir="Hello"]');
  ok(!!boton, 'la palabra en inglés es un botón para oírla');
  if(boton){ await boton.click(); await p.waitForTimeout(300); }
  ok(dichas.length === 1 && dichas[0][0] === 'Hello' && dichas[0][1] === 'en-US', 'al tocarla la dice el teléfono, en inglés' + (dichas.length ? ` (${dichas.map((x) => x.join(' ')).join(', ')})` : ''));
  ok(/Hello/.test(await p.textContent('#capa')), 'y tocarla no pasa a la siguiente idea');

  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
