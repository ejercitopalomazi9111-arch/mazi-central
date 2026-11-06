/* LA MISMA CUENTA EN DOS TELÉFONOS: nada se pierde (Carlos, 5 nov: «no está entregando fichas… no pueden
 * comprar más sobres… no se estaquean»). Antes, cuando el servidor tenía una copia más nueva se la ponía
 * entera al teléfono y lo que ese teléfono acababa de ganar o comprar desaparecía.
 *   python3 -m http.server 8765 --bind 127.0.0.1          (desde la raíz)
 *   cd juegos/servidor && npx wrangler dev --port 8815 --local --ip 127.0.0.1 --var "ORIGENES:http://127.0.0.1:8765"
 *   node juegos/guerra-de-puercos/v2/pruebas/sincronia.mjs */
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const PAG = process.argv[2] || 'http://127.0.0.1:8765/juegos/guerra-de-puercos/v2/', SRV = process.argv[3] || 'http://127.0.0.1:8815';
let bien = 0, mal = 0; const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function tel(){ const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const pg = await ctx.newPage(); pg.err = [];
  pg.on('pageerror', e => pg.err.push(e.message)); await pg.goto(PAG + '?servidor=' + encodeURIComponent(SRV), { waitUntil: 'load' }); await pg.waitForTimeout(2500); return pg; }
const C = (pg) => pg.evaluate(() => ({ m: __puercos.C.monedas, s: __puercos.C.sobres.map(x => x.id).sort(), v: __puercos.C.stats.victorias, cartas: Object.values(__puercos.C.cartas).reduce((a, b) => a + b, 0) }));
const sync = (pg) => pg.evaluate(() => new Promise(ok => { document.dispatchEvent(new Event('visibilitychange')); setTimeout(ok, 1800); }));
const apodo = 'Sinc' + Math.random().toString(36).slice(2, 7);
const A = await tel();
await A.click('#yo'); await A.waitForTimeout(400); await A.fill('#perfilCaja [name="apodo"]', apodo); await A.fill('#perfilCaja [name="pin"]', '5173'); await A.click('[data-hacer="crear"]'); await A.waitForTimeout(1800);
const B = await tel();
await B.click('#yo'); await B.waitForTimeout(400); await B.fill('#perfilCaja [name="apodo"]', apodo); await B.fill('#perfilCaja [name="pin"]', '5173'); await B.click('[data-hacer="entrar"]'); await B.waitForTimeout(1800);
const ini = await C(A);
console.log('los dos ganan una partida, A compra un sobre y B abre el de bienvenida, sin esperarse');
await B.evaluate(async () => { const t = await import('./tienda.js'); t.pagarPartida('gana', 10); });
await A.evaluate(async () => { const t = await import('./tienda.js'); t.pagarPartida('gana', 10); });
await B.waitForTimeout(3500);
await A.evaluate(async () => { const t = await import('./tienda.js'); t.comprar('chico'); });
await B.evaluate(async () => { const t = await import('./tienda.js'); t.cobrarSobre(__puercos.C.sobres[0].id); });
await A.waitForTimeout(3500); await sync(B); await sync(A); await sync(B);
const a = await C(A), b = await C(B);
if(process.env.DEP) for(const [n, pg] of [['A', A], ['B', B]]) console.log(n, JSON.stringify(await pg.evaluate(async () => { const c = await import('./cuenta.js'); return { yo: c.cuenta(), est: c.estadoSubida, rev: __puercos.C.rev, base: JSON.parse(localStorage.getItem('puercos2_base') || 'null')?.datos?.rev }; })));
const gano = 30 + 10 + 25, ganoSinBono = 30 + 10;     /* la primera victoria del día trae 25 de más, en cada teléfono */
ok('las dos victorias cuentan', a.v === ini.v + 2 && b.v === a.v, JSON.stringify({ a: a.v, b: b.v }));
ok('las monedas de los dos teléfonos se suman (menos el sobre de A)', a.m === b.m && a.m >= ini.m + gano + ganoSinBono - 30, JSON.stringify({ ini: ini.m, a: a.m, b: b.m }));
ok('el sobre que compró A está en los dos', a.s.length === b.s.length && a.s.join() === b.s.join() && a.s.length === 1, JSON.stringify({ a: a.s, b: b.s }));
ok('el de bienvenida que abrió B ya no está, y sus cartas sí', !a.s.includes(ini.s[0]) && a.cartas === b.cartas && a.cartas > 0, JSON.stringify({ a: a.cartas, b: b.cartas }));
console.log('A recarga la página');
await A.reload({ waitUntil: 'load' }); await A.waitForTimeout(2500); await sync(A);
ok('tras recargar sigue todo', JSON.stringify(await C(A)) === JSON.stringify(b), JSON.stringify(await C(A)));
ok('sin errores', !A.err.length && !B.err.length, [...A.err, ...B.err].join(' | '));
console.log(`\n${bien} pasan · ${mal} fallan`); await br.close(); process.exit(mal ? 1 : 0);
