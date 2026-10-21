/* Prueba el pedido de Smiley's en un navegador de verdad, a 390 px: agregar receta, alitas,
   promo y pizza armada; que no se mande sin datos; que el mensaje de WhatsApp lleve lo correcto
   y no invente precios; que el pedido siga al recargar.   node smileys/pruebas.mjs [base] */
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await br.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
const err=[]; pg.on('pageerror',e=>err.push(String(e))); pg.on('console',m=>{ if(m.type()==='error') err.push(m.text()); });
let ok=0, mal=0; const v=(q,c,d='')=>{ if(c){ok++;console.log('  ✓',q)} else {mal++;console.log('  ✗',q,d)} };
await pg.goto((process.argv[2] || 'http://localhost:8800') + '/smileys/', {waitUntil:'networkidle'});
await pg.evaluate(()=>{ localStorage.clear(); window.__abiertas=[]; window.open=(u)=>{ window.__abiertas.push(u); return null; }; });
v('la barra flotante no se ve sin pedido', !(await pg.$eval('#flota', e=>e.classList.contains('ver'))));
// receta
await pg.click('[aria-label="Agregar Pepperoni Especial al pedido"]');
await pg.click('#hrTam button[data-v="Familiar"]'); await pg.check('#hrOrilla'); await pg.click('#hojaReceta [data-cant="1"]');
await pg.screenshot({path:'/tmp/smileys-' + Date.now() + '.png'});
await pg.click('#hrAgregar');
v('la barra muestra 2 cosas', (await pg.textContent('#cuentaBarra')).trim()==='2');
// complemento
await pg.click('[aria-label^="Agregar 2 órdenes de Alitas"]');
await pg.click('[aria-label^="Agregar 2 órdenes de Alitas"]');
// promo
await pg.click('#promosLista .promo:first-child .btn'); await pg.fill('#hpNota','una hawai y una pastor'); await pg.click('#hpAgregar');
// armada con un ingrediente
await pg.click('#ings .ing:first-child'); 
v('la armada de un ingrediente vale $109', (await pg.textContent('#precioMia')).includes('$109'));
await pg.click('#agregarMia');
v('contador total 6', (await pg.textContent('#cuentaBarra')).trim()==='6', await pg.textContent('#cuentaBarra'));
await pg.waitForTimeout(400);
v('la barra flotante aparece', await pg.$eval('#flota', e=>e.classList.contains('ver')));
await pg.click('#flota');
await pg.waitForTimeout(500);
await pg.screenshot({path:'/tmp/smileys-' + Date.now() + '.png'});
const ancho = await pg.evaluate(()=>{ const d=document.querySelector('#hojaPedido'); return [d.scrollWidth, d.clientWidth, ...[...d.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>d.getBoundingClientRect().right+1).map(e=>e.className).slice(0,3)]; });
v('la hoja del pedido no se desborda', ancho[0]<=ancho[1], JSON.stringify(ancho));
await pg.click('#enviar');
v('sin datos no se manda', (await pg.evaluate(()=>window.__abiertas.length))===0);
v('marca la sucursal y el nombre', (await pg.$$('#hojaPedido [data-mal]')).length===2);
await pg.screenshot({path:'/tmp/smileys-' + Date.now() + '.png'});
await pg.click('#radiosSuc label:nth-child(2)');
await pg.check('input[name=entrega][value="A domicilio"]');
await pg.fill('#fNombre','Ana');
await pg.click('#enviar');
v('a domicilio pide la dirección', (await pg.$$('#cDir[data-mal]')).length===1);
await pg.fill('#fDir','Calle 5 #12, Peñaflor');
await pg.click('#enviar');
const url = await pg.evaluate(()=>window.__abiertas[0]||'');
v('abre WhatsApp de Peñaflor', url.startsWith('https://wa.me/524421497989?text='), url.slice(0,60));
const msg = decodeURIComponent(url.split('text=')[1]||'');
console.log('----\n'+msg+'\n----');
v('el mensaje trae las alitas con su precio', msg.includes('2 × Alitas (2 órdenes) — $540'));
v('trae la receta sin precio inventado', msg.includes('2 × Pepperoni Especial (Familiar · con orilla de queso)') && !/Pepperoni Especial[^\n]*\$/.test(msg));
v('suma lo que tiene precio: 540+289+109 = 938', msg.includes('$938'));
v('dice para cuándo', msg.includes('Para: lo antes posible'));
// a una hora: sin hora no se manda
await pg.check('input[name=cuando][value=hora]');
await pg.evaluate(()=>{ window.__abiertas=[]; });
await pg.click('#enviar');
v('«a una hora» sin hora no se manda', (await pg.evaluate(()=>window.__abiertas.length))===0 && (await pg.$$('#cCuando[data-mal]')).length===1);
await pg.fill('#fHora','14:30'); await pg.click('#enviar');
v('y con hora la lleva en el mensaje', decodeURIComponent((await pg.evaluate(()=>window.__abiertas[0]||'')).split('text=')[1]||'').includes('Para: las 14:30'));
// vaciar pide segundo toque, y luego se puede repetir el último
await pg.click('#vaciar');
v('vaciar pide un segundo toque', (await pg.textContent('#cuentaBarra')).trim()==='6');
await pg.click('#vaciar');
v('al segundo toque se vacía', (await pg.textContent('#cuentaBarra')).trim()==='0');
v('y ofrece repetir el último pedido', await pg.$eval('#repetir', e=>!e.hidden && /6 cosas/.test(e.textContent)));
await pg.click('#repetir');
v('repetir lo vuelve a poner', (await pg.textContent('#cuentaBarra')).trim()==='6');
// persiste
await pg.reload({waitUntil:'networkidle'});
v('el pedido sigue al recargar', (await pg.textContent('#cuentaBarra')).trim()==='6');
v('ni un error de consola', err.length===0, err.join(' | '));
console.log(ok,'bien ·',mal,'mal');
await br.close();
