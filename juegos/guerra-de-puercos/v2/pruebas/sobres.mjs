/* LA MESA DE SOBRES (Carlos, 6 nov): los sobres amontonados en 3D a la izquierda, se toca el de arriba para
 * agarrarlo, se rasga, se jala hacia abajo, las cartas salen a la derecha, se toca una para verla en grande,
 * la envoltura se arrastra al bote (que sólo sale mientras se arrastra) y «Guardar en mi mazo» sigue con el otro.
 *   python3 -m http.server 8765 --bind 127.0.0.1        (desde la raíz del repo)
 *   node juegos/guerra-de-puercos/v2/pruebas/sobres.mjs */
import { createRequire } from 'module'; const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const PAG = process.argv[2] || 'http://127.0.0.1:8765/juegos/guerra-de-puercos/v2/';
const FOTOS = process.env.FOTOS || '';
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pg = await ctx.newPage(); const err = [];
pg.on('pageerror', e => err.push('PE ' + e.message)); pg.on('console', m => { if(m.type() === 'error' && !/401|404|Failed to fetch|ERR_/.test(m.text())) err.push(m.text()); });
await pg.goto(PAG + '?servidor=http://127.0.0.1:1', { waitUntil: 'load' }); await pg.waitForTimeout(2200);
const foto = (n) => FOTOS && pg.screenshot({ path: FOTOS + n + '.png' });

/* tres sobres en la bolsa y nada más */
await pg.evaluate(async () => {
  const t = await import('./tienda.js'); const { C } = __puercos;
  C.sobres.length = 0; for(const k of ['chico', 'bueno', 'fino']) C.sobres.push(t.sortearSobre(k));
  const n = document.querySelector('#notiSobres'); if(n){ n.classList.remove('ve'); n.hidden = true; }
  document.querySelector('#caratula')?.click();
});
const sobres0 = await pg.evaluate(() => __puercos.C.sobres.length);
await pg.evaluate(() => __puercos.ir('sobres'));
await pg.waitForSelector('.abrir', { timeout: 8000 });
await pg.waitForTimeout(1500);
ok('Mis sobres abre directo la mesa', await pg.$('.abrir') != null);
ok('el montón dice cuántos quedan abajo (×2, pintado en la mesa)', (await pg.evaluate(() => globalThis.__abrirMonton)) === 2);
ok('hay botón para volver sin abrir', await pg.isVisible('[data-salir]'));
await foto('1-monton');

/* agarrar el de arriba: está abajo a la izquierda */
const pista = async () => pg.evaluate(() => { const d = document.querySelector('.dedo, .pista__dedo, [data-pista]'); if(!d) return null; const r = d.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const toca = async (x, y) => { await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.up(); };
const sobrePos = await pg.evaluate(() => ({ w: innerWidth, h: innerHeight }));
let agarrado = false;
for(const [fx, fy] of [[.2, .78], [.18, .82], [.22, .74], [.16, .86], [.25, .7]]){
  await toca(sobrePos.w * fx, sobrePos.h * fy); await pg.waitForTimeout(900);
  if(!(await pg.isVisible('[data-salir]'))){ agarrado = true; break; }
}
ok('tocar el montón agarra el sobre de arriba', agarrado);
await foto('2-agarrado');

/* rasgar: deslizar de lado sobre la parte de arriba del sobre (a la izquierda, a media altura) */
const caja = await pg.evaluate(() => ({ w: innerWidth, h: innerHeight }));
const yTira = caja.h * .32, xIni = caja.w * .06;
await pg.mouse.move(xIni, yTira); await pg.mouse.down();
for(let i = 1; i <= 20; i++){ await pg.mouse.move(xIni + i * caja.w * .03, yTira); await pg.waitForTimeout(16); }
await pg.mouse.up(); await pg.waitForTimeout(900);
const quedanTras = await pg.evaluate(() => __puercos.C.sobres.length);
ok('rasgarlo lo cobra (el sobre sale de la bolsa)', quedanTras === sobres0 - 1, quedanTras + ' de ' + sobres0);

/* sacar: jalar hacia abajo */
await pg.mouse.move(caja.w * .25, caja.h * .4); await pg.mouse.down();
for(let i = 1; i <= 15; i++){ await pg.mouse.move(caja.w * .25, caja.h * .4 + i * 25); await pg.waitForTimeout(16); }
await pg.mouse.up(); await pg.waitForTimeout(1400);
ok('aparece «Saltar»', await pg.isVisible('[data-saltar]'));
await foto('3-afuera');
await pg.click('[data-saltar]'); await pg.waitForSelector('[data-fin]:not([hidden])', { timeout: 15000 }); await pg.waitForTimeout(900);
ok('sale el resumen con «Guardar en mi mazo»', (await pg.textContent('[data-fin]')).includes('Guardar en mi mazo'));
await foto('4-mesa');

/* tocar una carta: se abre en grande */
const cartas = await pg.evaluate(() => __abrir.cartas());
ok('las cartas quedan arriba del resumen y dentro de la pantalla', cartas.every(c => c.x > 0 && c.x < caja.w && c.y > 0 && c.y < caja.h * .55), JSON.stringify(cartas));
await toca(cartas[0].x, cartas[0].y); await pg.waitForTimeout(500);
const grande = await pg.isVisible('.inspector');
if(grande){ /* se gira arrastrando */
  const b = await pg.evaluate(() => { const r = document.querySelector('.insp-escena').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const t0 = await pg.evaluate(() => document.querySelector('.insp-carta').style.transform);
  await pg.mouse.move(b.x, b.y); await pg.mouse.down(); for(let i = 1; i <= 8; i++){ await pg.mouse.move(b.x + i * 15, b.y); await pg.waitForTimeout(16); } await pg.mouse.up();
  await pg.waitForTimeout(200); await foto('5b-girada');
  ok('arrastrar la gira', (await pg.evaluate(() => document.querySelector('.insp-carta').style.transform)) !== t0);
  await pg.click('.inspector [data-cerrar]'); await pg.waitForTimeout(300);
}
ok('tocar una carta la abre en grande', grande);
await foto('5-grande');
ok('…y se cierra', !(await pg.isVisible('.inspector')));

/* la envoltura: el bote sólo sale mientras se arrastra */
ok('el bote está escondido sin arrastrar', !(await pg.isVisible('[data-bote]')));
const env = await pg.evaluate(() => __abrir.envoltura());
let solto = false;
for(const [dx, dy] of [[0, 0], [0, -15], [0, 15]]){
  const x0 = env.x + dx, y0 = env.y + dy;
  await pg.mouse.move(x0, y0); await pg.mouse.down();
  await pg.mouse.move(x0 + 10, y0 + 10); await pg.waitForTimeout(80);
  if(!(await pg.isVisible('[data-bote]'))){ await pg.mouse.up(); continue; }
  ok('al arrastrar la envoltura aparece el bote', true);
  await foto('6-arrastrando');
  const r = await pg.evaluate(() => { const b = document.querySelector('[data-bote]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  for(let i = 1; i <= 12; i++){ await pg.mouse.move(x0 + (r.x - x0) * i / 12, y0 + (r.y - y0) * i / 12); await pg.waitForTimeout(16); }
  ok('encima del bote, el bote se enciende', await pg.evaluate(() => document.querySelector('[data-bote]').classList.contains('encima')));
  await pg.mouse.up(); await pg.waitForTimeout(700);
  solto = true; break;
}
ok('se pudo agarrar la envoltura', solto);
ok('al soltar, el bote se va', !(await pg.isVisible('[data-bote]')));
ok('la envoltura se fue a la basura', (await pg.evaluate(() => __abrir.envoltura())) === null);

/* guardar y abrir el siguiente */
await pg.click('[data-otro]'); await pg.waitForTimeout(2500);
ok('«Guardar en mi mazo» sigue con el siguiente sobre (vuelve al montón)', await pg.isVisible('[data-salir]').catch(() => false));
ok('el montón ahora dice ×1', (await pg.evaluate(() => globalThis.__abrirMonton)) === 1);
await foto('7-siguiente');
await pg.click('[data-salir]'); await pg.waitForTimeout(800);
ok('«Volver» sale de la mesa sin abrir nada', !(await pg.$('.abrir')) && (await pg.evaluate(() => __puercos.C.sobres.length)) === sobres0 - 1);
ok('sin errores en consola', !err.length, err.join(' | '));
console.log(`\n${bien} bien · ${mal} mal`);
await br.close();
process.exit(mal ? 1 : 0);
