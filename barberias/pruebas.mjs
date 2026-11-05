/* LAS PRUEBAS DE LAS CUATRO PÁGINAS DE BARBERÍA, en un navegador de verdad, como cliente: que no truenen, que
   nada se salga de lado en teléfono ni en computadora, que la reserva llegue a «¡Tu lugar está apartado!», que la
   tienda agregue, cambie tamaño, sume y arme el mensaje de WhatsApp, y que el test, el QR y el mapa salgan.
     python3 -m http.server 8765 --bind 127.0.0.1     (en la raíz del repo)
     node barberias/pruebas.mjs                       BASE=https://… para correrlas contra lo publicado */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
const fallas = []; let pasan = 0;
const ok = (que, si, extra) => { if(si){ pasan++; console.log('  ✓', que); } else { fallas.push(que); console.log('  ✗', que, extra !== undefined ? '· ' + JSON.stringify(extra).slice(0, 300) : ''); } };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function abrir(ruta, ancho = 390){
  const ctx = await br.newContext({ viewport: { width: ancho, height: 844 }, isMobile: ancho < 800, hasTouch: ancho < 800, serviceWorkers: 'block' });
  /* el mapa y la letra de Google no se piden aquí: la prueba no depende de internet */
  await ctx.route(/maps\.google\.com|fonts\.g/, r => r.fulfill({ status: 200, body: '' }));
  const pg = await ctx.newPage(), errores = [];
  pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => { if(m.type() === 'error' && !/favicon/.test(m.text())) errores.push(m.text()); });
  await pg.addInitScript(() => { try{ sessionStorage.setItem('obsidiana:intro', 1); }catch(e){} window.open = () => null; });
  await pg.goto(BASE + '/barberias/' + ruta, { waitUntil: 'load' }); await pg.waitForTimeout(900);
  /* baja como una persona, hasta que la página deje de crecer (las fotos que cargan la alargan) */
  for(let y = 0, n = 0; n < 400; n++){ const alto = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight); if(y > alto) break; await pg.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await pg.waitForTimeout(40); y += 600; }
  await pg.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await pg.waitForTimeout(1500);
  await pg.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await pg.waitForTimeout(300);
  return { ctx, pg, errores };
}
const lado = (pg) => pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const escondidos = (pg) => pg.evaluate(() => [...document.querySelectorAll('[data-rev]')].filter(e => !e.classList.contains('ya')).length);

for(const [ruta, nombre] of [['', 'Portada de barberías'], ['sencilla/', 'Esencial'], ['navaja/', 'Navaja Norte'], ['casa-brava/', 'Casa Brava'], ['obsidian/', 'Obsidian']]){
  for(const ancho of [390, 1280]){
    console.log(`\n${nombre} · ${ancho} px`);
    const { ctx, pg, errores } = await abrir(ruta, ancho);
    ok('carga sin errores de consola', !errores.length, errores);
    ok('nada se sale de lado', await lado(pg) <= 0, await lado(pg));
    ok('después de bajar no queda nada escondido', await escondidos(pg) === 0, await escondidos(pg));
    ok('sin emojis en lo que se ve', !/[\u{1F300}-\u{1FAFF}]/u.test(await pg.evaluate(() => document.body.innerText)));
    await ctx.close();
  }
}

/* la tienda, en las tres de paga */
for(const ruta of ['navaja/', 'casa-brava/', 'obsidian/']){
  console.log(`\nTienda · ${ruta}`);
  const { ctx, pg, errores } = await abrir(ruta);
  await pg.evaluate(() => localStorage.clear());
  await pg.locator('.ti-mas').first().click(); await pg.waitForTimeout(900);
  ok('el + rápido agrega y el contador dice 1', (await pg.textContent('#carroNum')) === '1' && !(await pg.locator('#carroNum').isHidden()));
  await pg.locator('.ti-card').nth(1).click(); await pg.waitForTimeout(500);
  ok('tocar la tarjeta abre la ficha del producto', await pg.locator('dialog.ti-hoja[open] .ti-cuerpo h3').count() === 1);
  const conVar = await pg.locator('dialog.ti-hoja[open] .ti-var button').count();
  if(conVar){ await pg.locator('dialog.ti-hoja[open] .ti-var button').nth(1).click(); await pg.waitForTimeout(200); }
  await pg.locator('dialog.ti-hoja[open] [data-n="1"]').click(); await pg.waitForTimeout(150);
  const txtBtn = await pg.textContent('dialog.ti-hoja[open] [data-agregar]');
  ok('la cantidad cambia el precio del botón', /Agregar · \$/.test(txtBtn), txtBtn);
  await pg.locator('dialog.ti-hoja[open] [data-agregar]').click(); await pg.waitForTimeout(900);
  ok('agregar desde la ficha suma 2 más (3 en total)', (await pg.textContent('#carroNum')) === '3', await pg.textContent('#carroNum'));
  await pg.click('#abrirCarro'); await pg.waitForTimeout(400);
  const href = await pg.getAttribute('dialog.ti-hoja[open] a.ti-btn', 'href');
  const msg = decodeURIComponent((href || '').split('text=')[1] || '');
  ok('el carrito arma el pedido por WhatsApp con total', /Quiero pedir:/.test(msg) && /Total: \$/.test(msg), msg);
  if(conVar) ok('el tamaño escogido va en el pedido', /·/.test(msg), msg);
  await pg.check('input[name="tiEnt"][value="casa"]'); await pg.waitForTimeout(200);
  const msg2 = decodeURIComponent((await pg.getAttribute('dialog.ti-hoja[open] a.ti-btn', 'href')).split('text=')[1]);
  ok('a domicilio cambia la entrega del mensaje', /Entrega: a domicilio/.test(msg2), msg2);
  ok('la barra de envío gratis dice cuánto falta o que ya va gratis', /envío/i.test(await pg.textContent('.ti-barra')));
  await pg.locator('dialog.ti-hoja[open] [data-d="-1"]').first().click(); await pg.waitForTimeout(200);
  ok('quitar uno desde el carrito baja el contador', (await pg.textContent('#carroNum')) === '2', await pg.textContent('#carroNum'));
  ok('la tienda no dejó errores', !errores.length, errores);
  await ctx.close();
}

/* reservar de principio a fin */
for(const ruta of ['navaja/', 'casa-brava/', 'obsidian/']){
  console.log(`\nReserva · ${ruta}`);
  const { ctx, pg, errores } = await abrir(ruta);
  /* el desplazamiento suave es adorno: en la prueba se apaga para que el clic no le gane a la animación */
  await pg.addStyleTag({ content: 'html{ scroll-behavior:auto !important }' });
  if(ruta === 'casa-brava/') await pg.locator('#cartaL [data-serv]').first().click(); else await pg.locator(ruta === 'navaja/' ? '#servs [data-serv]' : '[data-reservar]').first().click();
  await pg.waitForTimeout(500);
  const caja = '#reserva';
  /* el pie de la reserva es pegajoso: si la reserva vive en la página (Casa Brava), al buscarlo Playwright lo persigue
     mientras se pega y se suelta. Se lleva el final de la caja a la vista y se toca donde está */
  const sigue = async () => { const b = pg.locator(`${caja} [data-a="sigue"]:not([disabled])`); if(!(await b.count())) return;
    await b.evaluate(el => el.closest('.rv').scrollIntoView({ block: 'end' })); await pg.waitForTimeout(100); const r = await b.boundingBox(); await pg.mouse.click(r.x + r.width / 2, r.y + r.height / 2); };
  for(let i = 0; i < 8; i++){
    if(await pg.locator(`${caja} .rv-listo`).count()) break;
    const op = pg.locator(`${caja} .rv-op`); const h = pg.locator(`${caja} .rv-hora:not([disabled])`);
    if(await pg.locator(`${caja} #rvNombre`).count()){ await pg.fill(`${caja} #rvNombre`, 'Prueba'); await pg.fill(`${caja} #rvTel`, '4421234567'); await sigue(); }
    else if(await h.count()){ await h.first().click(); await sigue(); }
    else if(await pg.locator(`${caja} .rv-dia`).count() && !(await h.count())){ await pg.locator(`${caja} .rv-dia`).nth(1).click(); }
    else if(await op.count()){ await op.first().click(); await pg.waitForTimeout(150); await sigue(); }
    await pg.waitForTimeout(250);
  }
  ok('la reserva llega a «¡Tu lugar está apartado!»', await pg.locator(`${caja} .rv-listo`).count() === 1);
  ok('y trae el botón de confirmar por WhatsApp', /wa\.me/.test(await pg.getAttribute(`${caja} .rv-listo a.rv-btn`, 'href') || ''));
  ok('sin errores', !errores.length, errores);
  await ctx.close();
}

/* lo propio de Obsidian: el test de corte, el ambiente, la barra y las membresías */
{
  console.log('\nObsidian · extras');
  const { ctx, pg, errores } = await abrir('obsidian/');
  for(let i = 0; i < 3; i++){ await pg.locator('#quiz [data-o]').nth(i % 2).click(); await pg.waitForTimeout(150); }
  ok('el test da un corte, un barbero y un producto', await pg.locator('#quiz .qz-res h3').count() === 1 && /Con /.test(await pg.textContent('#quiz .qz-mini')));
  await pg.click('#quiz [data-res]'); await pg.waitForTimeout(500);
  ok('«Reservar este corte» abre la reserva con el corte ya puesto', await pg.locator('#hojaReserva[open]').count() === 1 && /\$/.test(await pg.textContent('#reserva .rv-resumen')));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  await pg.locator('#ambiente [data-a="0"]').click();
  ok('el ambiente se guarda', await pg.evaluate(() => localStorage.getItem('obsidiana:ambiente')) === '0');
  await pg.locator('#servs [data-serv][aria-pressed="false"]').first().click(); await pg.waitForTimeout(400);
  ok('agregar un servicio enseña la barra con el total', await pg.locator('#barra.si').count() === 1 && /\$/.test(await pg.textContent('#barraTxt')));
  ok('tres membresías con su botón de WhatsApp', await pg.locator('.plan a[href*="wa.me"]').count() === 3);
  ok('el QR se dibuja', await pg.locator('#qr svg').count() === 1);
  ok('el mapa trae Google Maps, Waze y Uber', await pg.locator('.mp-ir a').count() === 3 && await pg.locator('.mp-mapa iframe').count() === 1);
  ok('sin errores', !errores.length, errores);
  await ctx.close();
}
{
  console.log('\nNavaja · promo del día');
  const { ctx, pg } = await abrir('navaja/');
  ok('la promo del día trae su reloj', /\d\d:\d\d:\d\d|Mañana/.test(await pg.textContent('#promo .pr-reloj')));
  await ctx.close();
}
{
  console.log('\nEsencial · reserva por WhatsApp');
  const { ctx, pg } = await abrir('sencilla/');
  await pg.click('#enviar'); await pg.waitForTimeout(200);
  ok('sin nombre, dice qué falta', /tu nombre/.test(await pg.textContent('#msg')));
  ok('la Esencial no trae tienda', await pg.locator('.ti-grid').count() === 0);
  await ctx.close();
}
await br.close();
console.log(fallas.length ? `\n✗ ${fallas.length} fallaron de ${pasan + fallas.length}` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
