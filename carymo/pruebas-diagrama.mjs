/* pruebas-diagrama.mjs — DIAGRAMAS INTELIGENTES (Carlos, 14 nov)
 * El armado y el acomodo de las cajas sin pantalla, y en un iPhone 13 sin red (sale el mapa con las ideas de la
 * lección): tocar una caja la explica, «Completa» borra cajas, una mala no cuenta y regresarlas todas da 5 XP.
 * node carymo/pruebas-diagrama.mjs */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizarDiagrama, acomodo, elegirOcultos, svgDiagrama, CENTRO } from './diagrama.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8800 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
let n = 0, f = 0;
const ok = (c, t) => { n++; if(!c) f++; console.log(`  ${c ? '✓' : '✗'} ${t}`); };

console.log('El armado');
const ciclo = normalizarDiagrama({ tipo: 'ciclo', titulo: 'Ciclo del agua', nodos: ['Evaporación', 'Condensación', 'Precipitación', 'Escurrimiento'].map((t) => ({ texto: t, detalle: 'x' })) });
ok(ciclo.tipo === 'ciclo' && ciclo.nodos.length === 4, 'un ciclo de 4 pasos se queda como ciclo');
ok(normalizarDiagrama({ tipo: 'raro', nodos: ['a', 'b', 'c'] }).tipo === 'mapa', 'una forma que no existe cae a mapa');
let tiro = null; try{ normalizarDiagrama({ tipo: 'mapa', nodos: ['a', 'b'] }); }catch(e){ tiro = e; }
ok(!!tiro, 'con menos de 3 cajas no hay diagrama (se pide otro o sale el de la lección)');
tiro = null; try{ normalizarDiagrama({ tipo: 'mapa', nodos: ['Agua', 'agua', 'Sol'] }); }catch(e){ tiro = e; }
ok(!!tiro, 'dos cajas iguales no se aceptan (en «Completa» no se sabría cuál va dónde)');
for(const tipo of ['mapa', 'ciclo', 'proceso']) for(const k of [3, 4, 5, 6]){
  const d = normalizarDiagrama({ tipo, titulo: 't', centro: 'c', nodos: ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'].slice(0, k) });
  const A = acomodo(d), w = A.ancho;
  const dentro = A.pos.every((p) => p.x - w / 2 >= 0 && p.x + w / 2 <= 360 && (tipo !== 'mapa' || Math.abs(p.x - A.centro.x) >= (w + CENTRO) / 2 + 4 || Math.abs(p.y - A.centro.y) >= 63 + 4) && p.y > 0 && p.y < A.alto);
  const separadas = A.pos.every((p, i) => A.pos.every((q, j) => i === j || Math.hypot(p.x - q.x, p.y - q.y) > 70));
  ok(dentro && separadas, `${tipo} de ${k}: todas las cajas caben en el lienzo y ninguna se encima`);
}
const oc = elegirOcultos(normalizarDiagrama({ nodos: ['a', 'b', 'c'] }));
ok(oc.size === 2, 'con 3 cajas se borran 2 (nunca todas)');
ok(!svgDiagrama(ciclo, { ocultos: new Set(['n0']) }).includes('Evaporación'), 'la caja borrada no deja ver su palabra');

await new Promise((r) => setTimeout(r, 700));
const b = await chromium.launch();
try{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const p = await ctx.newPage(); const err = []; p.on('pageerror', (x) => err.push(x.message));
  await p.goto(`http://127.0.0.1:${PUERTO}/carymo/?sinsw`); await p.waitForTimeout(1500);
  console.log('En la app, sin red');
  await p.evaluate(() => {
    const cont = { leccion: { titulo: 'La célula', ideas: [{ titulo: 'Membrana', texto: 'La **membrana** controla lo que entra y sale.' }, { titulo: 'Núcleo', texto: 'El **núcleo** guarda el ADN.' }, { titulo: 'Mitocondria', texto: 'La **mitocondria** da energía.' }, { titulo: 'Citoplasma', texto: 'El **citoplasma** es el relleno.' }] }, preguntas: [] };
    window.__cont = cont;
    window.__estudio.prueba.diagrama({ id: 'pd', materia: 'Biología' }, { id: 'n1', titulo: 'La célula' }, cont);
  });
  await p.waitForSelector('#capa .dg', { timeout: 8000 });
  ok((await p.$$('#capa .dg [data-n]')).length === 4, 'sale el mapa con las 4 ideas de la lección');
  await p.click('#capa .dg [data-n="n1"]');
  ok(/núcleo guarda el ADN/.test(await p.textContent('#capa .dg-abajo')), 'tocar «Núcleo» lo explica');
  ok(await p.evaluate(() => !!window.__cont.diagrama), 'el diagrama se guarda en la lección (no se vuelve a pedir)');
  await p.click('#capa [data-modo="completa"]');
  const huecos = await p.$$eval('#capa .dg .dg-vacia', (xs) => xs.map((x) => x.dataset.n));
  ok(huecos.length === 2, 'en «Completa» se borran 2 cajas');
  const xp0 = await p.evaluate(() => window.__estudio.estado().perfil.xp || 0);
  /* una mala: la primera palabra en el hueco de la otra */
  await p.click(`#capa [data-op="${huecos[0]}"]`); await p.click(`#capa .dg [data-n="${huecos[1]}"]`); await p.waitForTimeout(100);
  ok((await p.$$('#capa .dg .dg-vacia')).length === 2, 'una palabra en el hueco equivocado no se queda');
  for(const h of huecos){ await p.waitForTimeout(750); await p.click(`#capa [data-op="${h}"]`); await p.click(`#capa .dg [data-n="${h}"]`); }
  await p.waitForTimeout(300);
  ok(/Completo/.test(await p.textContent('#capa')), 'al regresar las dos dice «¡Completo!»');
  ok((await p.evaluate(() => window.__estudio.estado().perfil.xp || 0)) - xp0 === 5, 'y da 5 XP');
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, `nada se sale de lado (${ancho} px)`);
  await p.screenshot({ path: '/tmp/claude-0/jg/diagrama.png' });
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
