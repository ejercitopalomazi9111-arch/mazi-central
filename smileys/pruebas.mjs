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
v('primero enseña lo que llevas, sin el formulario', await pg.$eval('#datos', e=>e.hidden) && !(await pg.$eval('#renglones', e=>e.closest('[hidden]'))));
const vis = (q)=>pg.$eval(q, e=>e.getBoundingClientRect().height>0 && getComputedStyle(e).display!=='none');
v('en el paso 1 se ve «Continuar» y no «Mandar»', await vis('#continuar') && !(await vis('#enviar')));
await pg.click('#continuar');
v('en el paso 2 se ve «Mandar» y ya no «Continuar» ni «Vaciar»', await vis('#enviar') && !(await vis('#continuar')) && !(await vis('#vaciar')));
v('al continuar pide la entrega', !(await pg.$eval('#datos', e=>e.hidden)) && await pg.$eval('#paso1', e=>e.hidden));
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
await pg.click('#hojaGracias [data-cerrar]'); await pg.click('#flota'); await pg.click('#continuar');
const url = await pg.evaluate(()=>window.__abiertas[0]||'');
v('Begonias trae el número del volante', await pg.evaluate(()=>document.body.innerHTML.includes('442-654-48-58'))); v('abre WhatsApp de Peñaflor', url.startsWith('https://wa.me/524421497989?text='), url.slice(0,60));
const msg = decodeURIComponent(url.split('text=')[1]||'');
console.log('----\n'+msg+'\n----');
v('el mensaje trae las alitas con su precio', msg.includes('2 × Alitas (2 órdenes) — $540'));
v('la receta va en 2×1 con su precio: (350 + 2 orillas) × 2 = $840', msg.includes('2 × 2×1 familiares: Pepperoni Especial + otra igual (Con orilla de queso en las dos) — $840'));
v('a domicilio la promo de 2 grandes sale en $319', msg.includes('1 × Promo 2 pizzas grandes (una hawai y una pastor) — $319'));
v('suma todo: 840+540+289+109 + 30 de domicilio = 1,808, sin pedir que confirmen', msg.includes('Total: $1,808') && !msg.includes('confirman'));
v('dice para cuándo', msg.includes('Para: lo antes posible'));
// a una hora: sin hora no se manda
await pg.check('input[name=cuando][value=hora]');
await pg.evaluate(()=>{ window.__abiertas=[]; });
await pg.click('#enviar');
v('«a una hora» sin hora no se manda', (await pg.evaluate(()=>window.__abiertas.length))===0 && (await pg.$$('#cCuando[data-mal]')).length===1);
await pg.fill('#fHora','14:30'); await pg.click('#enviar');
await pg.click('#hojaGracias [data-cerrar]'); await pg.click('#flota'); await pg.click('#continuar');
v('y con hora la lleva en el mensaje', decodeURIComponent((await pg.evaluate(()=>window.__abiertas[0]||'')).split('text=')[1]||'').includes('Para: las 14:30'));
// vaciar pide segundo toque, y luego se puede repetir el último
await pg.click('#atras');
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
v('el número de personas también se escribe', await pg.$eval('#personas', e=>e.tagName==='INPUT' && e.value==='8'));
await pg.fill('#personas','20'); await pg.waitForTimeout(100);
v('escribir 20 recalcula (80 rebanadas de lobo)', (await pg.textContent('#calcDet')).startsWith('80 rebanadas para 20 personas'), await pg.textContent('#calcDet'));
await pg.fill('#porPersona','2'); await pg.waitForTimeout(100);
v('y las rebanadas por persona: 2 c/u marca «Antojito»', (await pg.textContent('#calcDet')).startsWith('40 rebanadas') && await pg.$eval('#hambre button[data-v="2"]', b=>b.getAttribute('aria-pressed')==='true'));
await pg.fill('#personas','8'); await pg.click('#hambre button[data-v="4"]'); await pg.waitForTimeout(100);
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
// en el pedido se ofrece qué agregar, sin lo que ya lleva (aquí la barra de la pizza tapa el botón flotante: se abre desde arriba)
await pg.click('.barra__pedido'); await pg.waitForTimeout(300);
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
// la chica: 6 rebanadas, sin 2×1 y con precio de la sucursal
await pg.evaluate(()=>document.getElementById('carta').scrollIntoView());
await pg.click('[aria-label="Agregar Margarita al pedido"]');
await pg.click('#hrTam button[data-v="Chica"]');
v('la chica esconde el 2×1 y no inventa precio', await pg.$eval('#hrSegundaCaja', e=>e.hidden) && (await pg.textContent('#hrTotal')).includes('confirma la sucursal'));
await pg.click('#hrAgregar');
v('y entra como chica de 6 rebanadas, sin precio', await pg.evaluate(()=>JSON.parse(localStorage.getItem('smileys-pedido-v1')).renglones.some(r=>r.nombre==='Margarita (chica, 6 rebanadas)' && r.precio==null)));
v('las tarjetas de tamaño dicen 6, 8 y 10', (await pg.textContent('.tamanos')).replace(/\s+/g,' ').match(/6 rebanadas.*8 rebanadas.*10 rebanadas/) !== null);
// smileys burger: hamburguesa con tocino
await pg.evaluate(()=>document.getElementById('burger').scrollIntoView());
await pg.check('#burgers .burger:first-child input[value=tocino]'); await pg.waitForTimeout(800);
v('la hamburguesa con tocino sube a $135', (await pg.textContent('#burgers .burger:first-child .btn')).includes('$135'));
await pg.uncheck('#burgers .burger:first-child input[value=tocino]');
const vistos = await pg.evaluate(()=>new Promise(ok=>{ const b=document.querySelector('#burgers .burger:first-child .btn'), set=new Set(); const t0=performance.now(); (function f(){ set.add(b.textContent.trim()); if(performance.now()-t0<500) requestAnimationFrame(f); else ok([...set]); })(); }));
v('al cambiar, el precio pasa por varios números antes de quedarse', vistos.length>=4, vistos.join(' | '));
await pg.waitForTimeout(700);
v('y se asienta en el nuevo: $110', (await pg.textContent('#burgers .burger:first-child .btn')).includes('$110'));
await pg.check('#burgers .burger:first-child input[value=tocino]'); await pg.waitForTimeout(800);
await pg.click('#burgers .burger:first-child .btn');
v('y entra al pedido con su precio', await pg.evaluate(()=>JSON.parse(localStorage.getItem('smileys-pedido-v1')).renglones.some(r=>r.nombre==='Hamburguesa' && r.detalle==='Con tocino' && r.precio===135)));
v('los combos de la carta están: 1 a 5', (await pg.$$eval('#promosLista .promo__etq', e=>e.map(x=>x.textContent).join('|'))).match(/Combo [1-5]/g).length===5);
// un pedido guardado con la versión de antes (sin precio) se pone al día con el 2×1
await pg.evaluate(()=>localStorage.setItem('smileys-pedido-v1', JSON.stringify({renglones:[{tipo:'receta', nombre:'Chilorio', detalle:'Familiar · con orilla de queso', precio:null, cant:2, clave:'r:chilorio:Familiar:true', id:1},{tipo:'mia', nombre:'Pizza armada', detalle:'Grande · queso solo', precio:null, cant:1, clave:'m:x', id:2}]})));
await pg.reload({waitUntil:'networkidle'});
const viejos = await pg.evaluate(()=>JSON.parse(localStorage.getItem('smileys-pedido-v1')||'{}').renglones||[]);
await pg.click('#flota'); await pg.waitForTimeout(300);
v('lo viejo sale con precio: 2×1 familiares con orilla $420 c/u y la armada sencilla $109', (await pg.textContent('#cuentas')).includes('$949') && !(await pg.textContent('#cuentas')).includes('confirma'), await pg.textContent('#cuentas'));
await pg.click('#hojaPedido [data-cerrar]');
v('los botones no hacen zoom con toques rápidos (touch-action)', await pg.$eval('#mas', e=>getComputedStyle(e).touchAction==='manipulation'));
v('el índice trae 9 apartados, y Alitas lleva a su tarjeta', (await pg.$$('#menu .ind')).length===9 && await pg.$eval('#menu .ind', a=>a.getAttribute('href')==='#c-alitas') && !!(await pg.$('#c-alitas')));
await pg.click('#menu .ind:has-text("Alitas")'); await pg.waitForTimeout(900);
v('tocar Alitas en el índice baja hasta las alitas', await pg.$eval('#c-alitas', e=>{ const r=e.getBoundingClientRect(); return r.top>=0 && r.top<innerHeight/2; }));
const quietos = await pg.evaluate(async ()=>{
  const cv=document.createElement('canvas'); cv.width=cv.height=520;
  Horno.pintar(cv,{ings:['pepperoni']}); await new Promise(r=>setTimeout(r,600));
  const antes=JSON.stringify(cv.__plan.reparto.pepperoni.map(p=>[p.x,p.y]));
  Horno.pintar(cv,{ings:['pepperoni','champinon','jalapeno']}); await new Promise(r=>setTimeout(r,600));
  const despues=JSON.stringify(cv.__plan.reparto.pepperoni.map(p=>[p.x,p.y]));
  const C=260, R=520*.47, orilla=cv.__plan.reparto.pepperoni.filter(p=>Math.hypot(p.x-C,p.y-C)>R*.8*.6).length;
  return {igual:antes===despues, n:cv.__plan.reparto.pepperoni.length, orilla};
});
v('al sumar ingredientes, los que ya estaban no se mueven', quietos.igual);
v('cada rebanada lleva en la orilla: 16 de 24 pepperonis van en la parte de afuera', quietos.n===24 && quietos.orilla>=16, JSON.stringify(quietos));
v('la pizza de la barra da vueltas', await pg.$eval('#miniPizza canvas', c=>getComputedStyle(c).animationName==='vuelta'));
// los tamaños de la carta ponen el precio de cada receta
await pg.evaluate(()=>document.getElementById('carta').scrollIntoView()); await pg.waitForTimeout(400);
v('de entrada, cada receta dice 2 grandes por $289', (await pg.textContent('#lista .plato:first-child .plato__precio')).includes('$289'));
await pg.click('#tamCarta [data-v="Familiar"]'); await pg.waitForTimeout(900);
v('al picar Familiar, las recetas pasan a $350', (await pg.$$eval('#lista .plato__precio b', bs=>bs.every(b=>b.textContent==='$350'))));
await pg.click('#lista .plato:first-child .plato__mas'); await pg.waitForTimeout(300);
v('y la receta abre ya en familiar', await pg.$eval('#hrTam [data-v="Familiar"]', b=>b.getAttribute('aria-pressed')==='true'));
await pg.click('#hojaReceta [data-cerrar]');
await pg.click('#tamCarta [data-v="Chica"]'); await pg.waitForTimeout(300);
v('en chica dice que la cotiza la sucursal', (await pg.textContent('#lista .plato:first-child .plato__precio')).includes('Precio en sucursal'));
await pg.click('#tamCarta [data-v="Grande"]');
// agregar al carrito usa su propia animación (la caja), no la de la pizza de Ármala
await pg.evaluate(()=>document.getElementById('c-boneless').scrollIntoView({block:'center'})); await pg.waitForTimeout(400);
await pg.click('#c-boneless .extra__precios button >> nth=0');
v('agregar al carrito hace volar la bolita hacia la caja', await pg.waitForSelector('.vuela', {timeout:600}).then(()=>true).catch(()=>false));
v('ningún precio se queda temblando al terminar de rodar', await pg.evaluate(async ()=>{ await new Promise(r=>setTimeout(r,900)); return [...document.querySelectorAll('.cifra,#calcPor,#sticker b,#miniPrecio,#flotaDetalle')].every(e=>!e.style.top); }));
v('mientras la pizza está en la barra, la grande no se pinta (no hay dos)', await pg.evaluate(()=>{ document.body.classList.add('x'); const h=document.querySelector('.horno'); h.classList.add('en-barra'); const v=getComputedStyle(document.getElementById('mia')).visibility; h.classList.remove('en-barra'); return v==='hidden'; }));
v('ármala: ingredientes en 3 grupos, antes que la pizza', (await pg.$$('#ings .ings__grupo')).length===3 && await pg.evaluate(()=>!!(document.getElementById('ings').compareDocumentPosition(document.getElementById('mia')) & 4)));
v('ni un error de consola', err.length===0, err.join(' | '));
console.log(ok,'bien ·',mal,'mal');
await br.close();
