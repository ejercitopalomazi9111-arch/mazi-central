/* VER A ALGUIEN DEL RANKING (Carlos, 14 nov). Arma una semana con cuatro personas (Sandra con su estilo y sus regalos),
   toca su fila y revisa que salga su hoja: nombre con su estilo, títulos, nivel, XP y sus mascotas vestidas; que la
   fila propia no abra nada; y que la hoja no se salga de lado. node carymo/pruebas-perfil-otro.mjs */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atenderEstudio } from '../sala/servidor/estudio.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8600 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

const m = new Map();
const s = { async get(k){ if(Array.isArray(k)){ const r = new Map(); for(const x of k) if(m.has(x)) r.set(x, structuredClone(m.get(x))); return r; } return structuredClone(m.get(k)); },
  async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) m.delete(x); }, async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
const P = (cuenta, cuerpo, admin = false) => atenderEstudio(s, new Request('http://x/estudio', { method: 'POST', body: JSON.stringify(cuerpo) }), new URL('http://x/estudio'), cuenta, Date.now(), { admin }).then((r) => r.json());
for(const [c, xp, nom] of [['sandra', 120, 'Sandra'], ['monica', 90, 'Mónica'], ['carlos', 60, 'Carlos'], ['beto', 30, 'Beto']]){
  await P(c, { accion: 'nombre', nombre: nom }); await P(c, { accion: 'xp', id: c + '1', xp }); await P(c, { accion: 'mascota', personaje: c === 'monica' ? 'paloma' : 'tigre' });
}
await P('carlos', { accion: 'admin', que: 'especial', cuenta: 'sandra', titulo: 'artista', estilo: 'arcoiris', regalos: ['pincel', 'boina'], ponerle: true }, true);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.route(/^http:\/\/localhost:1\//, async (r) => {
  const q = r.request(), u = new URL(q.url()), req = new Request('http://x/estudio' + u.search, { method: q.method(), body: q.method() === 'POST' ? q.postData() : undefined });
  const res = await atenderEstudio(s, req, new URL(req.url), 'carlos'); await r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
});
await pg.addInitScript(() => { if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1'); localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' })); sessionStorage.setItem('carymo.entrada', '1'); });
try{
  await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`);
  await pg.waitForFunction(() => window.__estudio && window.__estudio.prueba, null, { timeout: 20000 }); await pg.waitForTimeout(1200);
  await pg.evaluate(() => window.__estudio.ir('ranking')); await pg.waitForTimeout(800);
  ok(await pg.locator('.fila-rank[data-cuenta="sandra"] .nom-arcoiris').count() === 1, 'en la tabla, el nombre de Sandra sale en arcoíris');
  ok(await pg.locator('.fila-rank.yo[role="button"]').count() === 0, 'tu propia fila no es botón');
  await pg.click('.fila-rank[data-cuenta="sandra"]');
  await pg.waitForSelector('#hoja .po-masc', { timeout: 8000 }); await pg.waitForTimeout(600);
  const h = await pg.evaluate(() => { const hj = document.getElementById('hoja'); return {
    estilo: !!hj.querySelector('.po-quien .nom-arcoiris'), titulos: [...hj.querySelectorAll('.insignia')].map((x) => x.textContent.trim()),
    datos: [...hj.querySelectorAll('.po-datos b')].map((x) => x.textContent), acc: [...hj.querySelectorAll('.po-masc [data-acc]')].map((x) => x.dataset.acc),
    ancho: hj.scrollWidth <= hj.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth }; });
  ok(h.estilo, 'su hoja trae su nombre con su estilo');
  ok(h.titulos.includes('Artista principal') && h.titulos.includes('Alfa tester'), `y sus títulos (${h.titulos.join(', ')})`);
  ok(h.datos[1] === '120', 'su XP');
  ok(h.acc.includes('pincel') && h.acc.includes('boina'), 'su tigre sale con el pincel y la boina');
  ok(h.ancho, 'nada se sale de lado');
  await pg.evaluate(() => document.getElementById('velo').click());
  await pg.focus('.fila-rank[data-cuenta="monica"]'); await pg.keyboard.press('Enter');
  await pg.waitForSelector('#hoja .po-masc', { timeout: 8000 });
  ok(await pg.locator('#hoja .po-masc [data-acc]').count() === 0 && /Mónica|Monica/.test(await pg.locator('#hoja .po-quien').textContent()), 'con el teclado también se abre (la de Mónica)');
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
