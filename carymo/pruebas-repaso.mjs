/* pruebas-repaso.mjs — EL REPASO ESPACIADO (Carlos, 14 nov: «que sea más eficaz»; PEDAGOGIA.md)
 * La cuenta sin pantalla (cajas, huecos, el examen que manda, intercalado) y, en un iPhone 13: contestar una
 * lección deja preguntas para mañana; mañana aparece «Repaso de hoy», se contesta y da XP.
 * node carymo/pruebas-repaso.mjs */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8900 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
let n = 0, f = 0;
const ok = (c, t) => { n++; if(!c) f++; console.log(`  ${c ? '✓' : '✗'} ${t}`); };

/* la cuenta, con un localStorage de mentiras */
const mem = {}; globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } };
const R = await import('./repaso.js');
console.log('La cuenta');
const q = (t, k = 0) => ({ tipo: 'opcion', pregunta: t, opciones: ['a', 'b', 'c', 'd'], correcta: k });
let r = R.registrar(q('¿Uno?'), false, { plan: 'p1', tema: 't1', hoy: '2026-11-14' });
ok(r.caja === 1 && r.prox === '2026-11-15', 'la que fallas vuelve mañana');
r = R.registrar(q('¿Dos?'), true, { plan: 'p1', tema: 't1', hoy: '2026-11-14' });
ok(r.caja === 1 && r.prox === '2026-11-15', 'la que aciertas la primera vez también vuelve mañana (aún no la sabes de fijo)');
for(const hoy of ['2026-11-15', '2026-11-17', '2026-11-21']) r = R.registrar(q('¿Dos?'), true, { plan: 'p1', tema: 't1', hoy });
ok(r.caja === 4 && r.prox === '2026-11-29', 'acertando se aleja: 1 → 2 → 4 → 8 días');
r = R.registrar(q('¿Dos?'), false, { plan: 'p1', tema: 't1', hoy: '2026-11-29' });
ok(r.caja === 1 && r.prox === '2026-11-30', 'si se te olvida, regresa a la primera caja');
ok(R.hueco(5, '2026-11-14', '2026-12-04') === 3, 'con examen en 20 días, ningún hueco pasa de ~15 % (3 días aunque la caja diga 16)');
ok(R.hueco(5, '2026-11-14', '2026-11-18') <= 2, 'la última semana antes del examen, todo vuelve cada 1 o 2 días');
ok(R.hueco(3, '2026-11-14', '2026-11-15') === 1, 'con el examen mañana, mañana');
R._borrar();
for(const t of ['a', 'b', 'c']) for(let i = 0; i < 3; i++) R.registrar(q(t + i), false, { plan: 'p', tema: t, hoy: '2026-11-14' });
const p = R.pendientes('2026-11-15', 6);
ok(p.length === 6 && new Set(p.slice(0, 3).map((x) => x.tema)).size === 3, 'el repaso alterna temas (intercalado), no trae tres del mismo seguidas');
ok(R.pendientes('2026-11-14').length === 0, 'el mismo día no hay nada que repasar');

console.log('En la app');
await new Promise((r2) => setTimeout(r2, 700));
const b = await chromium.launch();
try{
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r2) => r2.abort());
  const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (x) => err.push(x.message));
  await pg.addInitScript(() => { sessionStorage.setItem('carymo.entrada', '1'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false })); });
  await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?sinsw`); await pg.waitForTimeout(1500);
  ok(!(await pg.$('#bRepasoHoy')), 'sin nada contestado, no hay «Repaso de hoy»');
  ok((await pg.$$('.explora button')).length === 4, 'el inicio trae «Explora» con 4 accesos (Idiomas, Juegos, 3D, Academia)');
  await pg.screenshot({ path: '/tmp/claude-0/jg/inicio-nuevo.png' });
  /* preguntas contestadas «ayer», guardadas como las guarda el cuestionario */
  await pg.evaluate(async () => {
    const R = await import('/carymo/repaso.js');
    const qs = [
      { tipo: 'opcion', pregunta: '¿Cómo se dice «hola»?', opciones: ['Hello', 'Bye', 'Thanks', 'Night'], correcta: 0, porque: 'Hello = hola.' },
      { tipo: 'hueco', frase: 'She ___ my sister.', respuesta: 'is', distractores: ['am', 'are', 'be'], porque: 'She va con is.' },
      { tipo: 'opcion', pregunta: '¿Qué significa «sister»?', opciones: ['Hermana', 'Hermano', 'Tía', 'Hija'], correcta: 0, porque: 'Sister = hermana.' },
    ];
    qs.forEach((q, i) => R.registrar(q, i !== 1, { plan: 'p-x', tema: 't' + i, hoy: '2000-01-01' }));
  });
  await pg.evaluate(() => window.__estudio.ir('plan')); await pg.waitForTimeout(500);
  ok(!!(await pg.$('#bRepasoHoy')), 'con preguntas pendientes sale «Repaso de hoy»');
  ok(/3 preguntas/.test(await pg.textContent('#bRepasoHoy')), 'con cuántas tocan (3)');
  await pg.click('#bRepasoHoy'); await pg.waitForTimeout(600);
  ok(!!(await pg.$('#capa [data-verificar]')), 'tocarlo abre el cuestionario de repaso');
  const xp0 = await pg.evaluate(() => window.__estudio.estado().perfil.xp || 0);
  /* se contesta cualquier cosa hasta terminar */
  for(let k = 0; k < 10 && await pg.$('#capa [data-verificar]'); k++){
    await pg.evaluate(() => { const c = document.querySelector('#capa'); const b = c.querySelector('[data-op], .op, .ficha, button.opcion, [data-i]'); b?.click(); });
    await pg.click('#capa [data-verificar]', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(200);
    await pg.click('.hoja-res [data-continuar]', { timeout: 1500 }).catch(() => {}); await pg.waitForTimeout(250);
  }
  ok(await pg.evaluate(() => !document.querySelector('#capa [data-verificar]')), 'el repaso termina y regresa');
  ok((await pg.evaluate(() => window.__estudio.estado().perfil.xp || 0)) > xp0, 'y da XP');
  const quedan = await pg.evaluate(async () => { const R = await import('/carymo/repaso.js'); return R.cuantas(); });
  ok(quedan === 0, `lo repasado se va a otro día (quedan hoy ${quedan})`);
  const ancho = await pg.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, `nada se sale de lado (${ancho} px)`);
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
