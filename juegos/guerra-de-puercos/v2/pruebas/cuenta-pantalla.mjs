/* La cuenta desde la pantalla, con DOS teléfonos: uno crea la cuenta y gana
 * una partida; el otro entra con el mismo apodo y PIN y tiene que ver lo mismo.
 * Y la tabla de líderes lo enseña.
 *   python3 -m http.server 8765 --bind 127.0.0.1           (desde la raíz)
 *   cd juegos/servidor && npx wrangler dev --port 8815 --local --var "ORIGENES:http://127.0.0.1:8765"
 *   node juegos/guerra-de-puercos/v2/pruebas/cuenta-pantalla.mjs */
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const PAG = process.argv[2] || 'http://127.0.0.1:8765/juegos/guerra-de-puercos/v2/';
const SRV = process.argv[3] || 'http://127.0.0.1:8815';
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function telefono(){
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); pg.err = [];
  pg.on('pageerror', e => pg.err.push('PE ' + e.message)); pg.on('console', m => { if(m.type() === 'error') pg.err.push(m.text()); });
  await pg.goto(PAG + '?servidor=' + encodeURIComponent(SRV), { waitUntil: 'load' }); await pg.waitForTimeout(2200);
  return pg;
}
const apodo = 'Puerco' + Math.random().toString(36).slice(2, 7), pin = '2580';

console.log('teléfono A: invitado → crea su cuenta');
const A = await telefono();
ok('trae su sobre de bienvenida', await A.evaluate(() => __puercos.C.sobres.some(s => s.tipo === 'bienvenida')));
ok('el aviso de sobres sale', await A.evaluate(() => document.querySelector('#notiSobres').classList.contains('ve')));
await A.waitForTimeout(5600);
ok('y se quita solo', await A.evaluate(() => !document.querySelector('#notiSobres').classList.contains('ve')));
await A.click('#dock [data-ir="coleccion"]'); await A.waitForTimeout(300); await A.click('#dock [data-ir="inicio"]'); await A.waitForTimeout(900);
ok('al volver al inicio NO vuelve a salir', await A.evaluate(() => !document.querySelector('#notiSobres').classList.contains('ve')));
await A.click('#yo'); await A.waitForTimeout(500);
await A.screenshot({ path: '/tmp/claude-0/p2/cp-perfil.png' });
ok('tocar tu foto abre el perfil con tus números', await A.evaluate(() => document.querySelector('#perfil').classList.contains('ve') && /Victorias/.test(document.querySelector('#perfilCaja').textContent)));
await A.click('[data-pp="cosmeticos"]'); await A.waitForTimeout(600);
ok('el perfil tiene los cosméticos', await A.evaluate(() => document.querySelectorAll('#perfilCaja [data-cos]').length >= 10));
await A.screenshot({ path: '/tmp/claude-0/p2/cp-cosmeticos.png' });
await A.click('#perfilCaja [data-cos="av-cow"]'); await A.waitForTimeout(400);
ok('uno que no tienes no se pone', await A.evaluate(() => __puercos.C.puesto.avatar === 'av-pig'));
await A.click('[data-pp="cuenta"]'); await A.waitForTimeout(300);
await A.fill('#perfilCaja [name="apodo"]', apodo); await A.fill('#perfilCaja [name="pin"]', '12');
await A.click('[data-hacer="crear"]'); await A.waitForTimeout(300);
ok('un PIN de 2 números se dice ahí mismo', /PIN/.test(await A.textContent('[data-error]')));
await A.fill('#perfilCaja [name="pin"]', pin); await A.click('[data-hacer="crear"]'); await A.waitForTimeout(1500);
ok('la cuenta se crea', await A.evaluate(() => /Tus cartas se guardan en tu cuenta/.test(document.querySelector('#perfilCaja').textContent)), await A.textContent('#perfilCaja'));
ok('la barra dice el apodo', (await A.textContent('#yoNombre')) === apodo);
/* gana una partida y abre su sobre de bienvenida (de un jalón) */
await A.evaluate(async () => { const t = await import('./tienda.js'); t.pagarPartida('gana', 10); const s = __puercos.C.sobres[0]; t.cobrarSobre(s.id); });
await A.waitForTimeout(3500);
const deA = await A.evaluate(() => ({ cartas: Object.keys(__puercos.C.cartas).length, v: __puercos.C.stats.victorias, m: __puercos.C.monedas }));

console.log('teléfono B: entra con el mismo apodo y PIN');
const B = await telefono();
await B.click('#yo'); await B.waitForTimeout(400);
await B.fill('#perfilCaja [name="apodo"]', apodo.toLowerCase()); await B.fill('#perfilCaja [name="pin"]', '9999');
await B.click('[data-hacer="entrar"]'); await B.waitForTimeout(1500);
ok('con el PIN malo no entra y lo dice', /no coinciden/.test(await B.textContent('[data-error]')));
await B.fill('#perfilCaja [name="pin"]', pin); await B.click('[data-hacer="entrar"]'); await B.waitForTimeout(1800);
const deB = await B.evaluate(() => ({ cartas: Object.keys(__puercos.C.cartas).length, v: __puercos.C.stats.victorias, m: __puercos.C.monedas }));
ok('B tiene las mismas cartas, victorias y monedas que A', JSON.stringify(deA) === JSON.stringify(deB), JSON.stringify(deA) + ' vs ' + JSON.stringify(deB));

console.log('la tabla de líderes');
await B.click('[data-pp="lideres"]'); await B.waitForTimeout(1500);
await B.screenshot({ path: '/tmp/claude-0/p2/cp-lideres.png' });
ok('sale en victorias, marcado como tú', await B.evaluate((a) => [...document.querySelectorAll('.lideres li.yo-mismo')].some(li => li.textContent.includes(a)), apodo));
await B.click('[data-tl="cartas"]'); await B.waitForTimeout(1200);
ok('y en más cartas', await B.evaluate((a) => document.querySelector('.lideres').textContent.includes(a), apodo));
const errs = [...A.err, ...B.err].filter(e => !/status of 401/.test(e));   /* el 401 es el del PIN malo, a propósito */
ok('ni un error de consola en los dos (fuera del PIN malo de a propósito)', !errs.length, errs.join(' | '));
console.log('\n' + (mal ? '✗' : '✓') + ` ${bien}/${bien + mal}`);
await br.close(); process.exit(mal ? 1 : 0);
