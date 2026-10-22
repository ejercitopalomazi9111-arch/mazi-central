/* Prueba el pedido de Smiley's en un navegador de verdad, a 390 px: agregar receta, alitas,
   promo y pizza armada; que no se mande sin datos; que el mensaje de WhatsApp lleve lo correcto
   y no invente precios; que el pedido siga al recargar.   node smileys/pruebas.mjs [base] */
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
// la entrada (la caja que se abre) sale una vez por visita: aquí se da por vista
await ctx.addInitScript(()=>{ try{ sessionStorage.setItem('smileys-intro','1'); }catch(e){} });
const pg = await ctx.newPage();
const err=[]; pg.on('pageerror',e=>err.push(String(e))); pg.on('console',m=>{ if(m.type()==='error') err.push(m.text()); });
let ok=0, mal=0; const v=(q,c,d='')=>{ if(c){ok++;console.log('  ✓',q)} else {mal++;console.log('  ✗',q,d)} };
await pg.goto((process.argv[2] || 'http://localhost:8800') + '/smileys/', {waitUntil:'networkidle'});
await pg.evaluate(()=>{ localStorage.clear(); window.__abiertas=[]; window.open=(u)=>{ window.__abiertas.push(u); return null; }; });
v('la barra flotante no se ve sin pedido', !(await pg.$eval('#flota', e=>e.classList.contains('ver'))));
// receta
await pg.click('[aria-label="Agregar Pepperoni Especial al pedido"]');
await pg.click('#hrTam button[data-v="Familiar"]'); await pg.check('#hrOrilla'); await pg.click('#hojaReceta [data-cant="1"]');
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
const ancho = await pg.evaluate(()=>{ const d=document.querySelector('#hojaPedido'); return [d.scrollWidth, d.clientWidth, ...[...d.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>d.getBoundingClientRect().right+1).map(e=>e.className).slice(0,3)]; });
v('la hoja del pedido no se desborda', ancho[0]<=ancho[1], JSON.stringify(ancho));
await pg.click('#enviar');
v('sin datos no se manda', (await pg.evaluate(()=>window.__abiertas.length))===0);
v('marca la sucursal y el nombre', (await pg.$$('#hojaPedido [data-mal]')).length===2);
await pg.click('#radiosSuc label:nth-child(2)');
await pg.check('input[name=entrega][value="A domicilio"]');
await pg.fill('#fNombre','Ana');
await pg.click('#enviar');
v('a domicilio pide la dirección', (await pg.$$('#cDir[data-mal]')).length===1);
await pg.fill('#fDir','Calle 5 #12, Peñaflor');
await pg.click('#enviar');
v('después de mandar sale el «¡Ya casi!»', await pg.$eval('#hojaGracias', d=>d.open));
await pg.click('#hojaGracias [data-cerrar]'); await pg.click('#flota');
const url = await pg.evaluate(()=>window.__abiertas[0]||'');
v('abre WhatsApp de Peñaflor', url.startsWith('https://wa.me/524421497989?text='), url.slice(0,60));
const msg = decodeURIComponent(url.split('text=')[1]||'');
console.log('----\n'+msg+'\n----');
v('el mensaje trae las alitas con su precio', msg.includes('2 × Alitas (2 órdenes) — $540'));
v('la receta va en 2×1 con su precio: (350 + 2 orillas) × 2 = $840', msg.includes('2 × 2×1 familiares: Pepperoni Especial + otra igual (Con orilla de queso en las dos) — $840'));
v('suma todo: 840+540+289+109 = 1,778, sin pedir que confirmen', msg.includes('Total: $1,778') && !msg.includes('confirman'));
v('dice para cuándo', msg.includes('Para: lo antes posible'));
// a una hora: sin hora no se manda
await pg.check('input[name=cuando][value=hora]');
await pg.evaluate(()=>{ window.__abiertas=[]; });
await pg.click('#enviar');
v('«a una hora» sin hora no se manda', (await pg.evaluate(()=>window.__abiertas.length))===0 && (await pg.$$('#cCuando[data-mal]')).length===1);
await pg.fill('#fHora','14:30'); await pg.click('#enviar');
await pg.click('#hojaGracias [data-cerrar]'); await pg.click('#flota');
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
// ¿cuántos van a comer?
await pg.evaluate(()=>document.getElementById('cuantos').scrollIntoView());
v('6 con hambre: 2 familiares, $350, $58 por cabeza', /2 FAMILIARES/i.test(await pg.textContent('#calcFrase')) && (await pg.textContent('#calcDet')).includes('$350') && (await pg.textContent('#calcPor')).trim()==='$58');
await pg.click('#mas'); await pg.click('#mas'); await pg.click('#hambre button[data-v="4"]');
v('8 de lobo (32 rebanadas): 2 promos de 2 grandes, $578', /2 promos de 2 grandes/i.test(await pg.textContent('#calcFrase')) && (await pg.textContent('#calcDet')).includes('$578'), await pg.textContent('#calcFrase'));
v('y avisa que con sencillas sale más barato: 4 por $436', (await pg.textContent('#calcAlt')).includes('$436'));
await pg.click('#calcAgregar'); await pg.waitForTimeout(300);
v('la calculadora agrega 2 promos al pedido', (await pg.textContent('#cuentaBarra')).trim()==='8');
// las favoritas y el sello
await pg.evaluate(()=>document.getElementById('favoritas').scrollIntoView());
await pg.click('#favs .fav:nth-child(3) .btn');
v('la favorita abre su receta', (await pg.textContent('#hrNombre')).trim()==='Mr. Cheese');
await pg.click('#hojaReceta [data-cerrar]');
await pg.evaluate(()=>scrollTo(0,0)); await pg.click('#sello');
v('el sello abre la Pepperoni Especial', (await pg.textContent('#hrNombre')).trim()==='Pepperoni Especial');
await pg.click('#hojaReceta [data-cerrar]');
// el horno pinta de verdad
await pg.evaluate(()=>document.getElementById('armar').scrollIntoView()); await pg.waitForTimeout(1500);
const pinto = await pg.evaluate(()=>{ const c=document.getElementById('mia'), d=c.getContext('2d').getImageData(520,520,1,1).data; return d[3]>0; });
v('el horno pintó la pizza', pinto);
// en el pedido se ofrece qué agregar, sin lo que ya lleva
await pg.click('#flota'); await pg.waitForTimeout(300);
const ofrece = await pg.$$eval('#antojoFila button', bs=>bs.map(b=>b.textContent));
v('ofrece complementos y no repite las alitas', ofrece.length>0 && !ofrece.some(t=>/Alitas/.test(t)), JSON.stringify(ofrece));
await pg.click('#hojaPedido [data-cerrar]');
// mitad y mitad
await pg.evaluate(()=>document.getElementById('carta').scrollIntoView());
await pg.click('[aria-label="Agregar Hawai al pedido"], [aria-label="Agregar Fiesta en Hawai al pedido"]');
await pg.check('#hrMitad'); await pg.selectOption('#hrOtra', 'pastor'); await pg.click('#hrAgregar');
v('mitad y mitad entra al pedido con las dos', await pg.evaluate(()=>JSON.parse(localStorage.getItem('smileys-pedido-v1')).renglones.some(r=>r.nombre==='2×1 grandes: Mitad Fiesta en Hawai / mitad Pastor + otra igual' && r.precio===289)));
// ármala: hasta 4, como en la sucursal
await pg.click('#limpiarMia');
for(let i=0;i<5;i++) await pg.click(`#ings .ing:nth-child(${i+1})`, {force:true}).catch(()=>{});
v('ármala deja hasta 4 ingredientes', (await pg.$$('#ings .ing[aria-pressed="true"]')).length===4);
// el horario se ve en cada sucursal
v('cada sucursal dice su horario', (await pg.$$eval('.suc__hora', e=>e.map(x=>x.textContent))).length===3 && (await pg.$$eval('.suc__dias', e=>e.map(x=>x.textContent))).every(t=>t.includes('11 am a 10 pm')));
// smileys burger: hamburguesa con tocino
await pg.evaluate(()=>document.getElementById('burger').scrollIntoView());
await pg.check('#burgers .burger:first-child input[value=tocino]');
v('la hamburguesa con tocino sube a $135', (await pg.textContent('#burgers .burger:first-child .btn')).includes('$135'));
await pg.click('#burgers .burger:first-child .btn');
v('y entra al pedido con su precio', await pg.evaluate(()=>JSON.parse(localStorage.getItem('smileys-pedido-v1')).renglones.some(r=>r.nombre==='Hamburguesa' && r.detalle==='Con tocino' && r.precio===135)));
v('los combos de la carta están: 1 a 5', (await pg.$$eval('#promosLista .promo__etq', e=>e.map(x=>x.textContent).join('|'))).match(/Combo [1-5]/g).length===5);
v('ni un error de consola', err.length===0, err.join(' | '));
console.log(ok,'bien ·',mal,'mal');
await br.close();
