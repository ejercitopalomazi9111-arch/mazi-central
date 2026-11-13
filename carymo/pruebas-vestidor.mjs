/* Pruebas de pantalla del personaje de perfil (vestidor.js) a 390×844, contra el servidor DE VERDAD
   (atenderEstudio en memoria): comprar cobra de verdad y vestir guarda de verdad.
   node carymo/pruebas-vestidor.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atenderEstudio } from '../sala/servidor/estudio.js';
import { TIENDA_ROPA } from './ropa.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

const m = new Map();
const s = { async get(k){ return structuredClone(m.get(k)); }, async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) m.delete(x); }, async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
const como = async (cuenta, cuerpo) => { const req = new Request('http://x/estudio', { method: 'POST', body: JSON.stringify(cuerpo) }); return (await atenderEstudio(s, req, new URL(req.url), cuenta)).json(); };
/* dos personas en el ranking: Carlos (sin personaje) y Luis (con su personaje) */
await como('carlos', { accion: 'perfil', nombre: 'Carlos' });
await como('carlos', { accion: 'xp', eventos: [{ id: 'c1', xp: 40, motivo: 'leccion' }] });
await como('luis', { accion: 'perfil', nombre: 'Luis' });
await como('luis', { accion: 'xp', eventos: [{ id: 'l1', xp: 30, motivo: 'leccion' }] });
await como('luis', { accion: 'vestir', personaje: { pelo: 'fro', ojos: 'wink', ropa: 'hoodie', colorRopa: '7e1735' } });
{ const p = await s.get('est:perfil:carlos'); p.cubos = 30; await s.put('est:perfil:carlos', p); }

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
const pg = await ctx.newPage();
const err = []; pg.on('pageerror', (e) => err.push(e.message));
await pg.route(/^http:\/\/localhost:1\//, async (r) => {
  const q = r.request(), u = new URL(q.url());
  const req = new Request('http://x/estudio' + u.search, { method: q.method(), body: q.method() === 'POST' ? q.postData() : undefined });
  const res = await atenderEstudio(s, req, new URL(req.url), 'carlos');
  await r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
});
await pg.addInitScript(() => { localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'gatito' })); sessionStorage.setItem('carymo.entrada', '1'); });
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio && window.__estudio.vestidor && window.__estudio.vestidor());
await pg.waitForTimeout(800);
const foto = async (nombre) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${nombre}.png` }); };

console.log('El vestidor');
await pg.click('#nav [data-ir="yo"]').then(() => pg.click('#vYo [data-ir="perfil"]')); await pg.waitForTimeout(500);
ok(await pg.locator('.perfil-cab .av svg').count() === 0, 'sin personaje, en tu perfil sigue la letra de siempre');
await pg.click('[data-abrir-vestidor]');
await pg.waitForSelector('#pjGrande svg', { timeout: 8000 });
ok(await pg.locator('.pj-tabs [data-tab]').count() === 6, 'se abre con tu personaje en grande y 6 pestañas: cara, pelo, ropa, gorros, lentes y fondo');
await foto('vest-1-cara');
await pg.click('[data-tab="pelo"]'); await pg.waitForTimeout(1200);
ok(await pg.locator('[data-parte="pelo"] .pj-mini svg').count() >= 25, 'cada peinado sale como miniatura de TU personaje con ese peinado');
const antes = await pg.innerHTML('#pjGrande');
await pg.click('[data-parte="pelo"][data-valor="curly"]'); await pg.waitForTimeout(400);
ok((await pg.getAttribute('[data-parte="pelo"][data-valor="curly"]', 'aria-pressed')) === 'true' && (await pg.innerHTML('#pjGrande')) !== antes, 'tocar un peinado lo marca y cambia el personaje grande');
await foto('vest-2-pelo');

console.log('Comprar');
await pg.click('[data-tab="lentes"]'); await pg.waitForTimeout(800);
ok(/14/.test(await pg.textContent('[data-parte="lentes"][data-valor="sunglasses"] .pj-precio')), 'lo de paga sale con su precio en cubitos');
await pg.click('[data-parte="lentes"][data-valor="sunglasses"]');
await pg.waitForSelector('#pjSi'); await pg.waitForTimeout(300);
await foto('vest-3-comprar');
ok(/Comprar por 14/.test(await pg.textContent('#pjSi')) && await pg.locator('#pjCompra svg').count() === 1, 'pregunta antes de cobrar y te enseña cómo te verías');
await pg.click('#pjSi'); await pg.waitForTimeout(600);
const p1 = await s.get('est:perfil:carlos');
ok(p1.cubos === 30 - TIENDA_ROPA['lentes:sunglasses'].precio && p1.ropa.includes('lentes:sunglasses'), 'al comprar, el servidor cobra 14 y los lentes ya son tuyos');
ok((await pg.getAttribute('[data-parte="lentes"][data-valor="sunglasses"]', 'aria-pressed')) === 'true' && await pg.locator('[data-parte="lentes"][data-valor="sunglasses"] .pj-precio').count() === 0, 'y te los pone (ya sin precio)');
ok(/16/.test(await pg.textContent('#cubosVest')), 'arriba se ve tu saldo nuevo');
await pg.click('[data-tab="gorros"]'); await pg.waitForTimeout(500);
await pg.click('[data-parte="gorro"][data-valor="winterHat04"]'); await pg.waitForSelector('#pjNo');   /* cuesta 18 y quedan 16 */
ok(await pg.locator('#pjSi').count() === 0 && /Te faltan/.test(await pg.textContent('#hoja')), 'lo que no te alcanza dice cuánto falta y no tiene botón de comprar');
await pg.click('#pjNo'); await pg.waitForTimeout(200);

console.log('Guardar');
ok(await pg.evaluate(() => document.querySelector('#capa').scrollWidth) <= 390, 'nada se sale de lado a 390');
await pg.click('[data-v="guardar"]'); await pg.waitForTimeout(800);
const p2 = await s.get('est:perfil:carlos');
ok(p2.personaje && p2.personaje.lentes === 'sunglasses' && p2.personaje.pelo === 'curly', 'guardar lo deja en el servidor con lo que elegiste');
ok(await pg.locator('#capa.vestidor').count() === 0 && await pg.locator('.perfil-cab .av svg').count() === 1, 'se cierra y tu perfil ya trae tu personaje en vez de la letra');
await foto('vest-4-perfil');

console.log('En el ranking');
await pg.click('[data-ir="ranking"]'); await pg.waitForTimeout(1500);
ok(await pg.locator('.fila-rank[data-cuenta="luis"] .av svg').count() === 1, 'en el ranking sale el personaje de Luis');
ok(await pg.locator('.fila-rank[data-cuenta="carlos"] .av svg').count() === 1, 'y el tuyo');
await foto('vest-5-ranking');

console.log('Salir sin guardar');
await pg.click('#nav [data-ir="yo"]').then(() => pg.click('#vYo [data-ir="perfil"]')); await pg.waitForTimeout(300);
await pg.click('[data-abrir-vestidor]'); await pg.waitForSelector('#pjGrande svg');
await pg.click('[data-tab="fondo"]'); await pg.click('[data-parte="fondo"][data-valor="d69a2d"]');
await pg.click('[data-v="cerrar"]'); await pg.waitForSelector('#pjSalir');
ok(/sin guardar/.test(await pg.textContent('#hoja')), 'si cambiaste algo y te sales, pregunta antes de tirarlo');
await pg.click('#pjSalir'); await pg.waitForTimeout(300);
ok(await pg.locator('#capa.vestidor').count() === 0 && (await s.get('est:perfil:carlos')).personaje.fondo !== 'd69a2d', 'y si dices que sí, no se guarda nada');

ok(err.length === 0, 'cero errores' + (err.length ? ': ' + err[0] : ''));
console.log(`\n${n - f} pasan · ${f} fallan`);
await b.close(); srv.kill(); process.exit(f ? 1 : 0);
