/* Prueba la carta de District Roll (v3, 5 nov) en un navegador de verdad, como un cliente:
   agregar de un toque, la ficha con cambios, la promo de CADA día calculada, que no se mande sin
   nombre ni dirección, el mensaje de WhatsApp, recargar, «lo mismo de la otra vez», y que nada se
   salga de la pantalla a 320, 390 y 1440.
     node district-roll/pruebas.mjs [base]        (base por omisión: http://localhost:8765)
   RUTA=/district-roll/elegante/ ya no aplica: el respaldo elegante conserva sus pruebas viejas en git. */
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const BASE = (process.argv[2] || 'http://localhost:8765') + '/district-roll/';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let ok = 0, mal = 0; const v = (q, c, d = '') => { if (c) { ok++; console.log('  ✓', q); } else { mal++; console.log('  ✗', q, d); } };
async function pagina(dia, ancho = 390, alto = 844){
  const pg = await br.newPage({ viewport: { width: ancho, height: alto } });
  pg.err = []; pg.on('pageerror', e => pg.err.push(String(e))); pg.on('console', m => { if (m.type() === 'error') pg.err.push(m.text()); });
  await pg.goto(BASE + (dia != null ? '?dia=' + dia : ''), { waitUntil: 'networkidle' });
  await pg.evaluate(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; }; });
  return pg;
}
const mas = (pg, n) => pg.click(`[aria-label^="Agregar ${n}"]`);
const totalFlota = (pg) => pg.textContent('#flotaTotal');
const desborde = (pg) => pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

console.log('§1 · el teléfono');
let pg = await pagina(2);
await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'networkidle' });
await pg.evaluate(() => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; }; });
v('nada se sale a lo ancho a 390', !(await desborde(pg)));
v('cada «+» de la carta mide al menos 44 px y está dentro de la pantalla', await pg.$$eval('.plato .mas', l => l.every(b => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.right <= innerWidth; })));
v('la promo de hoy (martes) sale en la portada', /2×1/.test(await pg.textContent('#boleto')) && (await pg.$$('.promo.hoy')).length === 1);
v('los empanizados dicen «Hoy 2×1»', (await pg.$$('#empanizados .tag--hoy')).length === 8);
v('el logo de verdad está arriba', await pg.$eval('.top__logo img', i => i.complete && i.naturalWidth > 500));

console.log('§2 · buscar');
await pg.click('#lupa'); await pg.fill('#buscar', 'salmon');
const vis = await pg.$$eval('.plato', l => l.filter(e => !e.hidden).map(e => e.querySelector('.plato__n').textContent));
v('«salmon» sin acento encuentra los de salmón', vis.includes('Salmoncito') && vis.includes('Gohan de salmón') && !vis.includes('California'), vis.join(', '));
await pg.fill('#buscar', 'zzzz'); v('si no hay nada, lo dice', await pg.$eval('.nada', e => !e.hidden));
await pg.click('#lupa'); v('cerrar la lupa vuelve a enseñar todo', (await pg.$$eval('.plato', l => l.filter(e => !e.hidden).length)) === 25);

console.log('§3 · agregar');
await mas(pg, 'Camaroncito Roll'); await mas(pg, 'Supremo');
await pg.waitForTimeout(300);
v('el «+» agrega de un toque, sin abrir nada', !(await pg.$eval('#hojaPlato', d => d.open)) && (await pg.textContent('#flotaCuenta')) === '2 platillos');
v('martes 2×1: $139 + $169 = $169', (await totalFlota(pg)) === '$169', await totalFlota(pg));
v('el «+» de un platillo que ya llevas dice cuántos', (await pg.$eval('[aria-label^="Agregar Supremo"]', b => b.classList.contains('tiene') && b.textContent.trim())) === '1');
await mas(pg, 'Brocheta'); await pg.click('#popDeshacer'); await pg.waitForTimeout(200);
v('«Deshacer» quita lo que acabas de agregar', (await pg.textContent('#flotaCuenta')) === '2 platillos');
await pg.click('.plato:has([aria-label^="Agregar Philadelphia"]) .plato__n');
await pg.click('#rapidos button:has-text("Sin aguacate")'); await pg.click('#hojaPlato [data-cant="1"]');
v('la ficha dice el precio de lo que vas a agregar', /2 · \$278/.test(await pg.textContent('#hplAgregar')), await pg.textContent('#hplAgregar'));
await pg.click('#hplAgregar'); await pg.waitForTimeout(300);
v('el cambio de un toque llega al pedido', (await pg.textContent('#flotaCuenta')) === '4 platillos');

console.log('§4 · el pedido');
await pg.click('#flota'); await pg.waitForTimeout(300);
v('la hoja muestra la promo como renglón', /Martes 2×1 en empanizados/.test(await pg.textContent('#hojaResumen')));
v('y sugiere algo que no llevas', (await pg.$$('#hojaResumen .sug')).length >= 1);
v('la hoja no se sale de lado', await pg.$eval('#hojaPedido', d => d.scrollWidth <= d.clientWidth + 1));
await pg.click('#enviar');
v('sin nombre no se manda', (await pg.evaluate(() => window.__abiertas.length)) === 0 && (await pg.$$('#cNombre[data-mal]')).length === 1);
await pg.check('input[name=entrega][value="A domicilio"]', { force: true }); await pg.fill('#fNombre', 'Luis');
await pg.click('#enviar');
v('a domicilio pide la dirección', (await pg.$$('#cDir[data-mal]')).length === 1);
await pg.fill('#fDir', 'Av. Zaragoza 100'); await pg.check('input[name=pago][value="Tarjeta"]', { force: true });
await pg.click('#enviar');
const url = await pg.evaluate(() => window.__abiertas[0] || '');
const msg = decodeURIComponent(url.split('text=')[1] || '');
console.log('----\n' + msg + '\n----');
v('va al WhatsApp del local (461 344 1696)', url.startsWith('https://wa.me/524613441696'));
v('el mensaje lleva el cambio, la promo y el total', msg.includes('2 × Philadelphia (Sin aguacate) — $278') && msg.includes('Promo: Martes 2×1 en empanizados (−$139)') && msg.includes('Total: $447') && msg.includes('Pago: Tarjeta') && msg.includes('Dirección: Av. Zaragoza 100'));
v('dice para cuándo (lo antes posible, de fábrica)', msg.includes('Para: lo antes posible'));
v('al mandar sale «¡Listo!» con la liga para volver a abrir WhatsApp', await pg.$eval('#hojaListo', d => d.open) && (await pg.getAttribute('#listoWa', 'href')) === url);
await pg.evaluate(() => { window.__copiado = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); });
await pg.click('#listoCopiar'); await pg.waitForTimeout(200);
v('«Copiar mi pedido» copia el mismo mensaje', (await pg.evaluate(() => window.__copiado)) === msg);
await pg.click('#hojaListo [data-cerrar]');
await pg.reload({ waitUntil: 'networkidle' });
v('el pedido sigue al recargar', (await totalFlota(pg)) === '$447');
await pg.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')); await pg.waitForTimeout(1000);
const rotas = await pg.$$eval('img', l => l.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')));
v('todas las fotos cargan', rotas.length === 0, rotas.join(', '));
v('ni un error de consola', pg.err.length === 0, pg.err.join(' | '));
/* vaciar y volver: «lo mismo de la otra vez» */
await pg.evaluate(() => { const g = JSON.parse(localStorage.getItem('districtroll-pedido-v1')); g.renglones = []; localStorage.setItem('districtroll-pedido-v1', JSON.stringify(g)); });
await pg.reload({ waitUntil: 'networkidle' });
v('con el pedido vacío ofrece «lo mismo de la otra vez»', await pg.$eval('#repetir', e => !e.hidden) && /Camaroncito Roll, 1 Supremo y 1 más · 4 platillos/.test(await pg.textContent('#repetirTxt')));
await pg.click('#repetirBtn'); await pg.waitForTimeout(200);
v('«Repetir» vuelve a poner el pedido', (await pg.textContent('#flotaCuenta')) === '4 platillos');
await pg.close();

console.log('§5 · la promo de cada día');
const casos = [
  [1, ['California', 'Avocado', 'Bananito'], '$288', 'lunes 3×2: va gratis el más barato de 3 fríos'],
  [3, ['Yakimeshi mixto', 'Yakimeshi especial'], '$109', 'miércoles: 2 yakimeshis por $109'],
  [4, ['Supremo', 'Brocheta'], '$170', 'jueves: el segundo platillo a $1'],
  [4, ['Brocheta', 'Brocheta'], '$50', 'jueves: dos iguales no cuentan (platillo diferente)'],
  [0, ['Supremo', 'Res Roll'], '$308', 'domingo: sin promo'],
];
for (const [dia, platos, esperado, que] of casos) {
  const p = await pagina(dia); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' });
  for (const n of platos) { await mas(p, n); await p.waitForTimeout(80); }
  v(que + ' → ' + esperado, (await totalFlota(p)) === esperado, await totalFlota(p));
  await p.close();
}
{ const p = await pagina(5); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' });
  await mas(p, 'California'); await mas(p, 'Res Roll'); await p.click('#flota'); await p.waitForTimeout(200);
  v('viernes: 2 rollos traen kushiages de regalo', /kushiages de regalo/.test(await p.textContent('#hojaResumen')) && (await totalFlota(p)) === '$278');
  await p.close(); }

console.log('§5b · el horario (3:30 a 9:00 pm)');
{ let p = await br.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + '?dia=2&hora=18:00', { waitUntil: 'networkidle' });
  v('a las 6 pm dice «Abierto»', (await p.textContent('#estadoTxt')) === 'Abierto' && /3:30 pm a 9:00 pm/.test(await p.textContent('#datosHorasTxt')));
  v('el pie dice el horario', /Todos los días de 3:30 pm a 9:00 pm/.test(await p.textContent('#pieHoras')));
  v('ningún título dice «sushi de barrio»', !/barrio/i.test(await p.textContent('h1')));
  await p.goto(BASE + '?dia=2&hora=14:00', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' });
  await mas(p, 'Texano'); await p.click('#flota'); await p.waitForTimeout(200);
  v('a las 2 pm dice «Cerrado» y el pedido avisa que lo preparan al abrir', (await p.textContent('#estadoTxt')) === 'Cerrado' && /lo preparan al abrir, hoy a las 3:30 pm/.test(await p.textContent('#hojaResumen')));
  await p.goto(BASE + '?dia=2&hora=22:00', { waitUntil: 'networkidle' }); await p.click('#flota'); await p.waitForTimeout(200);
  v('a las 10 pm dice que abren mañana', /mañana a las 3:30 pm/.test(await p.textContent('#hojaResumen')));
  await p.close(); }

console.log('§5c · para más tarde, la promo que se acaba y lo demás');
{ const p = await pagina(2); await p.goto(BASE + '?dia=2&hora=18:00', { waitUntil: 'networkidle' });
  await p.evaluate(() => { localStorage.clear(); window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; }; });
  v('el boleto dice cuánto le queda a la promo', (await p.textContent('#boletoReloj')) === 'Te quedan 3 h 0 min de promo hoy', await p.textContent('#boletoReloj'));
  await mas(p, 'Texano'); await p.click('#flota'); await p.waitForTimeout(200);
  await p.check('input[name=cuando][value="Más tarde"]', { force: true }); await p.waitForTimeout(100);
  const ops = await p.$$eval('#fHora option', l => l.map(o => o.value));
  v('«Para más tarde» ofrece horas cada 15 min, desde media hora después', !(await p.isHidden('#fHora')) && ops[0] === 'Hoy 6:30 pm' && ops[ops.length - 1] === 'Hoy 8:45 pm', ops.join(', '));
  await p.selectOption('#fHora', 'Hoy 7:30 pm'); await p.fill('#fNombre', 'Ana'); await p.click('#enviar');
  const m2 = decodeURIComponent((await p.evaluate(() => window.__abiertas[0] || '')).split('text=')[1] || '');
  v('y la hora va en el mensaje', m2.includes('Para: Hoy 7:30 pm'), m2.split('\n').filter(x => /Para/.test(x)).join());
  await p.click('#listoOtro'); await p.waitForTimeout(200);
  v('«Empezar otro pedido» deja el pedido en cero', !(await p.$eval('#flota', f => f.classList.contains('ver'))) && (await p.textContent('#flotaCuenta')) === '0 platillos');
  await p.goto(BASE + '?dia=2&hora=20:50', { waitUntil: 'networkidle' }); await mas(p, 'Texano'); await p.click('#flota'); await p.check('input[name=cuando][value="Más tarde"]', { force: true });
  v('si ya no alcanza hoy, ofrece mañana', (await p.$eval('#fHora option', o => o.value)) === 'Mañana 3:30 pm');
  const man = await p.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const r = await fetch(l.href); const j = await r.json(); return j.name + ' · ' + j.icons.length; });
  v('se puede instalar como app (manifest con sus íconos)', man === 'District Roll Sushi · 2', man);
  v('hay botón para compartir la carta', await p.isVisible('#compartir'));
  v('sin errores de consola', p.err.length === 0, p.err.join(' | '));
  await p.close(); }

console.log('§7 · la Esencial ($2,000)');
{ const p = await br.newPage({ viewport: { width: 390, height: 844 } }); const err = []; p.on('pageerror', e => err.push(String(e))); p.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
  await p.goto(BASE + 'esencial/', { waitUntil: 'networkidle' });
  await p.evaluate(() => { localStorage.clear(); window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; }; });
  v('carga sin salirse de lado', !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  v('no dice «sushi de barrio» y sí su horario', !/barrio/i.test(await p.textContent('h1')) && /3:30 a 9:00 pm/.test(await p.textContent('body')));
  await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')); await p.waitForTimeout(800);
  v('todas sus fotos cargan', (await p.$$eval('img', l => l.filter(i => i.complete && i.naturalWidth === 0).length)) === 0);
  v('ya no se ve deslavada al bajar (nada queda transparente)', await p.evaluate(() => { scrollTo(0, 3000); return [...document.querySelectorAll('.plato')].every(e => getComputedStyle(e).opacity === '1'); }));
  await p.click('[aria-label="Agregar Philadelphia"]'); await p.click('#hplAgregar'); await p.waitForTimeout(300);
  await p.click('#flota'); await p.waitForTimeout(300); await p.fill('#fNombre', 'Luis'); await p.click('#enviar');
  const u = await p.evaluate(() => window.__abiertas[0] || '');
  v('arma el pedido y lo manda a su WhatsApp', u.startsWith('https://wa.me/524613441696') && decodeURIComponent(u).includes('Philadelphia'));
  v('ni un error de consola', err.length === 0, err.join(' | '));
  await p.close(); }

console.log('§6 · otros tamaños');
for (const [w, h] of [[320, 640], [1440, 900]]) {
  const p = await pagina(2, w, h);
  v(`nada se sale a lo ancho a ${w}`, !(await desborde(p)));
  if (w === 1440) { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await mas(p, 'Texano'); await p.waitForTimeout(200);
    v('en computadora el pedido está a un lado, sin botón flotante', /Texano/.test(await p.textContent('#ladoCuerpo')) && !(await p.isVisible('#flota'))); }
  await p.close();
}
console.log('§8 · la hoja del pedido no se aplasta (lo reportó el cliente en iPhone, 14 nov)');
for (const [w, h, nom] of [[390, 844, 'iPhone'], [320, 568, 'iPhone SE'], [390, 380, 'con el teclado abierto']]) {
  const p = await pagina(2, w, h); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' });
  for (const b of (await p.$$('.plato .mas')).slice(0, 9)) { await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(150); if (await p.isVisible('#hojaPlato')) { await p.click('#hplAgregar'); await p.waitForTimeout(150); } }
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400);
  const f = await p.evaluate(() => { const r = document.querySelector('#flota').getBoundingClientRect(); return r.height >= 56 && r.bottom <= innerHeight; });
  v(`${nom}: hasta abajo de la página, la barra «Ver pedido» entera y en pantalla`, f);
  await p.click('#flota'); await p.waitForTimeout(400);
  await p.$eval('#hojaPedido .hoja__cuerpo', c => { c.scrollTop = c.scrollHeight; }); await p.waitForTimeout(200);
  const m = await p.evaluate(() => { const d = document.querySelector('#hojaPedido'), c = d.querySelector('.hoja__cuerpo'), b = d.querySelector('#enviar').getBoundingClientRect(), r = d.getBoundingClientRect();
    return { boton: b.height >= 48 && b.bottom <= innerHeight, dentro: r.top >= 0 && r.bottom <= innerHeight + 1, baja: c.scrollHeight > c.clientHeight && c.clientHeight > 100, fija: getComputedStyle(document.documentElement).overflow === 'hidden' }; });
  v(`${nom}: el botón de WhatsApp completo, sin aplastarse`, m.boton);
  v(`${nom}: la hoja cabe en la pantalla y lo de en medio baja con el dedo`, m.dentro && m.baja);
  v(`${nom}: la página de atrás no se mueve con la hoja abierta`, m.fija);
  await p.close();
}
console.log(ok, 'bien ·', mal, 'mal');
await br.close();
process.exit(mal ? 1 : 0);
