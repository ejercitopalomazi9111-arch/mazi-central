/* NADA DE LO QUE APARECE TAPA LO QUE ESTÁ (Carlos, 14 nov: «asegúrate que ningún elemento emergente pueda cubrir otro
   elemento que sea estático, porque eso molesta y estorba»). Hace aparecer cada cosa —avisos, el personaje que se asoma,
   el combo, el globito de la mascota— encima de la app de verdad y mide que el muelle empuje la página (lo que se veía
   arriba queda justo debajo) y que el globito no quede encima de texto ni botones. FOTOS=carpeta guarda capturas.
   node carymo/pruebas-muelle.mjs */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atenderEstudio } from '../sala/servidor/estudio.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8500 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const FOTOS = process.env.FOTOS;

const m = new Map();
const s = { async get(k){ return structuredClone(m.get(k)); }, async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) m.delete(x); }, async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
const ahora = Date.now();
m.set('est:perfil:carlos', { cuenta: 'carlos', nombre: 'Carlos', xp: 500, racha: 3, ids: [], t: ahora, cubos: 50, mascota: 'tigre', mascotas: { tigre: { xp: 300, nacio: ahora, skin: 'normal', acc: [] } }, cuidado: { hambre: 80, limpieza: 80, animo: 80, t: ahora } });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: FOTOS ? 2 : 1 });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.route(/^http:\/\/localhost:1\//, async (r) => {
  const q = r.request(), u = new URL(q.url());
  const req = new Request('http://x/estudio' + u.search, { method: q.method(), body: q.method() === 'POST' ? q.postData() : undefined });
  const res = await atenderEstudio(s, req, new URL(req.url), 'carlos');
  await r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
});
await pg.addInitScript(() => { if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1'); localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' })); sessionStorage.setItem('carymo.entrada', '1'); });
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.prueba, null, { timeout: 20000 });
await pg.waitForTimeout(1200);
const foto = (nombre) => FOTOS ? pg.screenshot({ path: `${FOTOS}/${nombre}.png` }) : null;

/* lo primero visible de la pantalla (debajo del muelle) y dónde quedó */
const primero = () => pg.evaluate(() => {
  const muelle = document.getElementById('muelle').getBoundingClientRect();
  const todos = [...document.querySelectorAll('#app button, #app h1, #app h2, #app p, #app input, #app .pastilla')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && r.bottom > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  const tapados = todos.filter((e) => { const r = e.getBoundingClientRect(); return r.top < muelle.bottom - 1 && r.bottom > muelle.top && muelle.height > 0; }).map((e) => (e.id || e.className || e.tagName) + ' «' + e.textContent.trim().slice(0, 20) + '»');
  return { muelle: Math.round(muelle.height), tapados };
});
/* la prueba de «no tapa»: lo que está en el muelle nunca queda encima de algo de la página, en ningún momento */
async function vigilar(ms){
  const t = Date.now(), malos = new Set(); let maxMuelle = 0;
  while(Date.now() - t < ms){ const r = await primero(); r.tapados.forEach((x) => malos.add(x)); maxMuelle = Math.max(maxMuelle, r.muelle); await pg.waitForTimeout(60); }
  return { malos: [...malos], maxMuelle };
}

try{
  for(const [vista, nombre] of [['plan', 'Estudiar'], ['yo', 'Tú']]){
    await pg.evaluate((v) => window.__estudio.ir(v), vista); await pg.waitForTimeout(500); await pg.evaluate(() => scrollTo(0, 0));
    console.log(nombre + ' (arriba de todo)');
    const antes = await primero();
    ok(antes.muelle === 0, 'sin nada que avisar, el muelle no mide nada');
    await pg.evaluate(() => window.__estudio.prueba.brindis('Un aviso de prueba bastante largo para ver cómo se acomoda', '', 'sparkles'));
    let v = await vigilar(900);
    ok(v.maxMuelle > 20, `el aviso sale en el muelle (${v.maxMuelle} px)`);
    ok(!v.malos.length, 'y no tapa nada: la página se recorre' + (v.malos.length ? ': ' + v.malos.join(', ') : ''));
    await foto(`muelle-${vista}-aviso`);
    await pg.evaluate(() => window.__estudio.prueba.reaccion('sube', { cameo: true }));
    v = await vigilar(1200);
    ok(await pg.locator('.pv-asoma').count() === await pg.locator('#muelle .pv-asoma').count(), 'si el personaje se asoma, es en el muelle (en «Tú» ya está en pantalla y reacciona ahí)');
    ok(!v.malos.length, 'y tampoco tapa nada' + (v.malos.length ? ': ' + v.malos.join(', ') : ''));
    await pg.evaluate(() => window.__estudio.prueba.comboVFX(6));
    v = await vigilar(700);
    ok(await pg.locator('#muelle .combo-vfx').count() === 1, 'el combo sale en el muelle');
    ok(!v.malos.length, 'sin tapar la pregunta' + (v.malos.length ? ': ' + v.malos.join(', ') : ''));
    await foto(`muelle-${vista}-todo`);
    await pg.waitForTimeout(4200);
    ok((await primero()).muelle === 0, 'cuando todo se va, el muelle se cierra y la página regresa');
  }

  console.log('A media página');
  await pg.evaluate(() => window.__estudio.ir('yo')); await pg.waitForTimeout(500);
  await pg.evaluate(() => scrollTo(0, 400)); await pg.waitForTimeout(300);
  const ancla = await pg.evaluate(() => { const e = [...document.querySelectorAll('#app button, #app p, #app h2')].find((x) => { const r = x.getBoundingClientRect(); return r.top > 20 && r.top < 200; }); if(!e) return null; e.dataset.ancla = '1'; return e.getBoundingClientRect().top; });
  await pg.evaluate(() => window.__estudio.prueba.brindis('Aviso a media página', '', 'sparkles')); await pg.waitForTimeout(500);
  const despues = await pg.evaluate(() => { const e = document.querySelector('[data-ancla]'); return e ? e.getBoundingClientRect().top : null; });
  const muelle = await pg.evaluate(() => document.getElementById('muelle').getBoundingClientRect().bottom);
  ok(ancla != null && despues >= muelle - 1, `lo que estabas viendo baja y queda debajo del aviso (${Math.round(ancla)} → ${Math.round(despues)}, muelle hasta ${Math.round(muelle)})`);
  await pg.waitForTimeout(3500);

  console.log('El globito de la mascota');
  await pg.evaluate(() => scrollTo(0, 0)); await pg.evaluate(() => window.__estudio.ir('plan')); await pg.waitForTimeout(600);
  const globos = await pg.evaluate(async () => {
    const { taparia } = await import('./muelle.js');
    const res = [];
    window.__estudio.prueba.dice('Esta es una frase larga de prueba para ver dónde cabe el globito sin tapar nada', 'bien');
    await new Promise((ok) => setTimeout(ok, 500));
    for(const m of document.querySelectorAll('.masc')){
      const g = m.querySelector(':scope > .masc-globo'); if(!g || +getComputedStyle(g).opacity < .5) continue;
      res.push({ lado: g.dataset.lado, tapa: taparia(g.getBoundingClientRect(), [g, m]) });
    }
    if(document.querySelector('#muelle .muelle-dice')) res.push({ lado: 'muelle', tapa: false });
    return res;
  });
  ok(globos.length > 0, `la mascota sí dijo algo (${globos.map((x) => x.lado).join(', ')})`);
  ok(globos.every((x) => !x.tapa), 'y su globito no queda encima de texto ni botones');
  await foto('muelle-globo');
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
