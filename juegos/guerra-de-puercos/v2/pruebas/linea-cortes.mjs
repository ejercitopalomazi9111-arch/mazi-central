/* A DISTANCIA, CON EL INTERNET PORTÁNDOSE MAL (Carlos, 6 nov: «soluciona lo del internet»).
 * Dos teléfonos juegan y a uno se le corta en los peores momentos:
 *   1. justo DESPUÉS de jugar su carta, y el otro juega mientras él no está (la ronda se resuelve sin él);
 *   2. ANTES de jugar: juega sin internet y la carta se manda sola al volver;
 *   3. la conexión se queda MUERTA sin cerrarse (lo que hace el iPhone al cambiar de red): el latido la detecta.
 * Después de cada corte la partida tiene que seguir, con la MISMA vida en los dos.
 *   python3 -m http.server 8765 --bind 127.0.0.1        (desde la raíz)
 *   cd juegos/servidor && npx wrangler dev --port 8815 --local --ip 127.0.0.1 --var "ORIGENES:http://127.0.0.1:8765"
 *   node juegos/guerra-de-puercos/v2/pruebas/linea-cortes.mjs */
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const PAG = process.argv[2] || 'http://127.0.0.1:8765/juegos/guerra-de-puercos/v2/';
const SRV = process.argv[3] || 'http://127.0.0.1:8815';
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function telefono(){
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); pg.err = [];
  pg.on('pageerror', e => pg.err.push('PE ' + e.message));
  await pg.goto(PAG + '?servidor=' + encodeURIComponent(SRV), { waitUntil: 'load' }); await pg.waitForTimeout(2200);
  await pg.evaluate(() => { document.querySelector('#caratula')?.click(); const n = document.querySelector('#notiSobres'); if(n){ n.classList.remove('ve'); n.hidden = true; } });
  await pg.waitForTimeout(500);
  return pg;
}
const est = (pg) => pg.evaluate(() => globalThis.__mesa?.estado());
const libre = (pg, t = 40000) => pg.waitForFunction(() => { const e = globalThis.__mesa?.estado(); return e && (e.fin || (!e.ocupado && !e.cortina && e.mano.some(c => c.x != null))); }, null, { timeout: t }).then(() => true, () => false);
async function jugarUna(pg){
  const e = await est(pg); const j = e.mano.filter(c => c.nivel !== 'ESP' && c.x != null).sort((a, b) => a.x - b.x); const c = j[Math.floor(j.length / 2)];
  await pg.mouse.click(c.x, c.y); await pg.waitForTimeout(320); await pg.mouse.click(c.x, c.y); await pg.waitForTimeout(200);
}
const siguiente = (pg, r0, t = 45000) => pg.waitForFunction((r0) => { const e = __mesa?.estado(); return !e || e.fin || (!e.ocupado && e.ronda > r0); }, r0, { timeout: t }).then(() => true, () => false);
async function elegirModo(pg, m){ await pg.click('#bJugar'); await pg.waitForTimeout(450);
  if(await pg.$('#hojaCaja [data-l]')){ await pg.click('#hojaCaja [data-l="general"]'); await pg.click('#hojaCaja [data-ok]'); await pg.waitForTimeout(700); }
  await pg.click(`#hojaCaja [data-h="${m}"]`); }
const mismaVida = async (A, B) => { const a = await est(A), b = await est(B); return a.pvA === b.pvB && a.pvB === b.pvA && a.ronda === b.ronda ? '' : `A ve ${a.pvA}/${a.pvB} r${a.ronda}, B ve ${b.pvA}/${b.pvB} r${b.ronda}`; };

const A = await telefono(), B = await telefono();
await elegirModo(A, 'linea'); await A.waitForTimeout(400);
await A.click('#hojaCaja [data-crear]'); await A.waitForSelector('#hojaCaja .codigo-grande', { timeout: 8000 });
const codigo = (await A.textContent('#hojaCaja .codigo-grande')).trim();
await elegirModo(B, 'linea'); await B.waitForTimeout(400);
await B.fill('#hojaCaja [data-codigo]', codigo); await B.click('#hojaCaja [data-unir]');
ok('los dos entran', (await Promise.all([libre(A), libre(B)])).every(Boolean));

/* una ronda normal para calentar */
let r0 = (await est(A)).ronda;
await jugarUna(A); await jugarUna(B);
ok('ronda normal', (await Promise.all([siguiente(A, r0), siguiente(B, r0)])).every(Boolean));

console.log('1 · B juega y se le corta; A juega mientras B no está');
await Promise.all([libre(A), libre(B)]); r0 = (await est(A)).ronda;
await jugarUna(B); await B.waitForTimeout(150);
await B.evaluate(() => __cx.cortar());
await jugarUna(A);
const s1 = await Promise.all([siguiente(A, r0), siguiente(B, r0)]);
ok('los dos pasan a la siguiente ronda', s1.every(Boolean), JSON.stringify(s1));
ok('con la misma vida', !(await mismaVida(A, B)), await mismaVida(A, B));

console.log('2 · a B se le va el internet ANTES de jugar, juega sin internet y vuelve');
await Promise.all([libre(A), libre(B)]); r0 = (await est(A)).ronda;
await B.evaluate(() => __cx.cortar());
await jugarUna(B); await jugarUna(A);
const s2 = await Promise.all([siguiente(A, r0), siguiente(B, r0)]);
ok('su carta se mandó sola al volver y la ronda se jugó', s2.every(Boolean), JSON.stringify(s2));
ok('con la misma vida', !(await mismaVida(A, B)), await mismaVida(A, B));

console.log('3 · la conexión de B se queda muerta SIN cerrarse (cambio de red en el iPhone)');
await Promise.all([libre(A), libre(B)]); r0 = (await est(A)).ronda;
await B.evaluate(() => __cx.ensordecer(true));
await jugarUna(A); await jugarUna(B);
const s3 = await Promise.all([siguiente(A, r0, 60000), siguiente(B, r0, 60000)]);
ok('el latido la detecta, se reconecta y la ronda se juega', s3.every(Boolean), JSON.stringify(s3));
ok('con la misma vida', !(await mismaVida(A, B)), await mismaVida(A, B));

console.log('4 · y se sigue jugando normal');
let rondas = 0;
for(let i = 0; i < 4; i++){
  if(!(await Promise.all([libre(A), libre(B)])).every(Boolean)) break;
  const e = await est(A); if(e.fin) break; r0 = e.ronda;
  await jugarUna(A); await jugarUna(B);
  if(!(await Promise.all([siguiente(A, r0), siguiente(B, r0)])).every(Boolean)) break;
  rondas++;
}
const fin = (await est(A)).fin;
ok('cuatro rondas más sin trabarse (o la partida acabó)', rondas === 4 || fin, 'rondas ' + rondas);
ok('sin errores en consola', !A.err.length && !B.err.length, [...A.err, ...B.err].join(' | '));
console.log(`\n${bien} pasan · ${mal} fallan`);
await br.close();
process.exit(mal ? 1 : 0);
