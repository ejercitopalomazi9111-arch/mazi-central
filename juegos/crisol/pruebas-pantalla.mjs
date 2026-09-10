#!/usr/bin/env node
/* Pruebas de PANTALLA de CRISOL, en un navegador de verdad.
   El motor tiene las suyas y no bastan: en Guerra de Puercos las 74 del motor
   pasaban con la pantalla muerta. Y lo que Carlos reporta —«el menú se encima
   al suelo», «no hace scroll», «no sé cuánto zoom llevo»— no lo caza ninguna
   prueba de motor, porque no es física: es layout.

   Hace falta `node build.mjs` y un servidor sirviendo dist/ en 8793:
     cd dist && python3 -m http.server 8793                                  */
const pw = (await import('/opt/node22/lib/node_modules/playwright/index.js')).default;
const chromium = pw.chromium;
const URL = process.env.CRISOL_URL || 'http://localhost:8793/juegos/crisol/';

let bien = 0, mal = 0;
const ok = (t, c, det) => { c ? bien++ : mal++;
  console.log((c ? '  ✓ ' : '  ✗ ') + t + (det != null && !c ? '  → ' + det : '')); };
const seccion = t => console.log('\n── ' + t + ' ──');

const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await nav.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true });
const pg = await ctx.newPage();
const errores = [];
pg.on('pageerror', e => errores.push(String(e)));
pg.on('console', m => { if(m.type() === 'error') errores.push(m.text()); });
await pg.goto(URL, { waitUntil:'networkidle' });
await pg.waitForTimeout(900);

seccion('la página vive');
ok('carga sin un solo error de consola', errores.length === 0, errores.join(' | '));
ok('el mundo existe y tiene celdas', await pg.evaluate(() => !!window.CRISOL && window.CRISOL.mundo.t.length > 0));

seccion('el menú YA NO se come el suelo de la habitación');
{
  /* Carlos, dos veces: «tu menú aún en oculto se encima al suelo y no lo deja
     ver, así que parece que se cae al vacío lo que pones». */
  const mide = () => pg.evaluate(() => {
    const c = document.getElementById('mundo').getBoundingClientRect();
    const p = document.getElementById('panel').getBoundingClientRect();
    return { lienzoAbajo: c.bottom, panelArriba: p.top, alto: c.height };
  });
  const abierto = await mide();
  ok('con el panel abierto, el lienzo NO se mete debajo',
     abierto.lienzoAbajo <= abierto.panelArriba + 1,
     'lienzo hasta ' + abierto.lienzoAbajo.toFixed(0) + ' · panel desde ' + abierto.panelArriba.toFixed(0));
  await pg.click('#tirador'); await pg.waitForTimeout(400);
  const plegado = await mide();
  ok('y plegado tampoco', plegado.lienzoAbajo <= plegado.panelArriba + 1,
     'lienzo hasta ' + plegado.lienzoAbajo.toFixed(0) + ' · panel desde ' + plegado.panelArriba.toFixed(0));
  ok('al plegar, el mundo GANA sitio', plegado.alto > abierto.alto + 40,
     'abierto ' + abierto.alto.toFixed(0) + 'px · plegado ' + plegado.alto.toFixed(0) + 'px');
  /* y la cámara se entera: el lienzo interno tiene que haber cambiado */
  ok('y el lienzo se vuelve a medir, no se queda con el tamaño viejo',
     await pg.evaluate(() => {
       const c = document.getElementById('mundo');
       return Math.abs(c.height / (window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio) - c.getBoundingClientRect().height) < 2;
     }));
  await pg.click('#tirador'); await pg.waitForTimeout(400);
}

seccion('la lista de materiales hace scroll cuando está llena');
{
  /* «Tu menú de abajo no hace scroll en los elementos cuando está muy lleno» */
  await pg.evaluate(() => {
    /* la pestaña con MÁS elementos, que es la que de verdad desborda */
    const pes = [...document.querySelectorAll('.pes')];
    let mejor = null, n = -1;
    for(const b of pes){
      b.click();
      const c = document.getElementById('lista').children.length;
      if(c > n){ n = c; mejor = b; }
    }
    if(mejor) mejor.click();
  });
  await pg.waitForTimeout(300);
  const l = await pg.evaluate(() => {
    const e = document.getElementById('lista');
    return { alto:e.clientHeight, contenido:e.scrollHeight, puede:e.scrollHeight > e.clientHeight + 4 };
  });
  ok('el contenido no cabe (hay de sobra que enseñar)', l.contenido > l.alto,
     l.contenido + 'px de contenido en ' + l.alto + 'px');
  ok('y la lista SE PUEDE recorrer', l.puede);
  const movio = await pg.evaluate(async () => {
    const e = document.getElementById('lista');
    e.scrollTop = 400; await new Promise(r => setTimeout(r, 60));
    return e.scrollTop > 100;
  });
  ok('y al recorrerla, se mueve de verdad', movio);
}

seccion('la navegación: arrastrar mueve la vista, y el zoom se ve');
{
  ok('el indicador de zoom dice la escala', /^×\d/.test(await pg.textContent('#escala')),
     await pg.textContent('#escala'));
  const esc0 = await pg.evaluate(() => window.CRISOL.vista.esc);
  await pg.click('#bMas'); await pg.waitForTimeout(120);
  const esc1 = await pg.evaluate(() => window.CRISOL.vista.esc);
  ok('acercar cambia la escala', esc1 > esc0, esc0.toFixed(2) + ' → ' + esc1.toFixed(2));
  ok('y el indicador se entera', (await pg.textContent('#escala')) === '×' + esc1.toFixed(1),
     await pg.textContent('#escala'));

  await pg.click('#bMano'); await pg.waitForTimeout(150);
  const antes = await pg.evaluate(() => ({ x:window.CRISOL.vista.x, y:window.CRISOL.vista.y }));
  const c = await pg.locator('#mundo').boundingBox();
  await pg.mouse.move(c.x + c.width/2, c.y + c.height/2);
  await pg.mouse.down();
  await pg.mouse.move(c.x + c.width/2 - 90, c.y + c.height/2 - 60, { steps:8 });
  await pg.mouse.up();
  await pg.waitForTimeout(150);
  const desp = await pg.evaluate(() => ({ x:window.CRISOL.vista.x, y:window.CRISOL.vista.y }));
  ok('con la mano puesta, arrastrar MUEVE la vista',
     Math.abs(desp.x - antes.x) > 2 || Math.abs(desp.y - antes.y) > 2,
     'de (' + antes.x.toFixed(0) + ',' + antes.y.toFixed(0) + ') a (' + desp.x.toFixed(0) + ',' + desp.y.toFixed(0) + ')');
  ok('y NO pinta nada mientras arrastra',
     await pg.evaluate(() => { let n = 0; const M = window.CRISOL.mundo;
       for(let k = 0; k < M.t.length; k++) if(M.t[k] !== 0) n++; return n === 0; }));
}

seccion('el termómetro');
{
  await pg.click('#bMano');                                   /* apagar la mano */
  /* ⚠ apoyado en un muro: desde que los sólidos caen, un hierro pintado en el
     aire se desploma y el termómetro acababa midiendo el AIRE de donde estaba.
     La prueba decía «no dice el material» y el termómetro estaba perfecto. */
  await pg.evaluate(() => {
    const C = window.CRISOL;
    C.mundo.pon(20, 21, C.IDX.muro);
    C.mundo.pon(20, 20, C.IDX.eFe);
  });
  await pg.click('#bMide'); await pg.waitForTimeout(120);
  await pg.evaluate(() => {
    const C = window.CRISOL, cv = document.getElementById('mundo');
    const r = cv.getBoundingClientRect();
    const px = r.left + (20 - C.vista.x) * C.vista.esc + 2;
    const py = r.top  + (20 - C.vista.y) * C.vista.esc + 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { clientX:px, clientY:py, pointerId:1, bubbles:true }));
    cv.dispatchEvent(new PointerEvent('pointerup',   { clientX:px, clientY:py, pointerId:1, bubbles:true }));
  });
  await pg.waitForTimeout(200);
  const visible = await pg.evaluate(() => document.getElementById('ficha').classList.contains('va'));
  const txt = await pg.textContent('#fichaC');
  ok('la ficha aparece al medir', visible);
  ok('y dice el material', /Hierro/.test(txt), txt.slice(0, 90));
  ok('con su temperatura', /°C/.test(txt));
  ok('y sus cambios de estado con su temperatura', /fusión/.test(txt) && /1538/.test(txt), txt.slice(0, 160));
  ok('y NO llama cambio de estado a la fisión', !/Cambios de estado[\s\S]*fisión/.test(txt));
}

seccion('la luz alumbra la habitación');
{
  await pg.click('#bMide');
  await pg.evaluate(() => {
    const C = window.CRISOL, M = C.mundo;
    M.limpia();
    for(let x = 0; x < 60; x++) M.pon(x, 60, C.IDX.muro);
    M.pon(20, 59, C.IDX.bateria);
    for(let x = 21; x < 30; x++) M.pon(x, 59, C.IDX.cobre);
    M.pon(30, 59, C.IDX.lampara);
  });
  await pg.waitForTimeout(700);
  const luz = await pg.evaluate(() => {
    const M = window.CRISOL.mundo;
    return { cerca:M.luz[M.i(31,58)], lejos:M.luz[M.i(45,58)], hay:M.hayLuz };
  });
  ok('la lámpara conectada ENCIENDE', luz.hay && luz.cerca > 5, 'luz junto a ella: ' + luz.cerca);
  ok('y se apaga con la distancia', luz.lejos < luz.cerca, 'cerca ' + luz.cerca + ' · lejos ' + luz.lejos);
}

seccion('sin errores al final');
ok('ni un error de consola en toda la sesión', errores.length === 0, errores.slice(0,3).join(' | '));

await nav.close();
console.log('\n' + (mal ? '✗' : '✓') + '  ' + bien + ' pasan · ' + mal + ' fallan');
process.exit(mal ? 1 : 0);
