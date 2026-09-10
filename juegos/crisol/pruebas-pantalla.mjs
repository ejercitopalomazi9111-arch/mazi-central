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

seccion('la herramienta de gravedad');
{
  /* Carlos listó diez cosas por su nombre para esta herramienta. Esto las
     recorre en el navegador, que es donde viven. */
  await pg.evaluate(() => window.CRISOL.mundo.limpia());
  await pg.click('#bGrav'); await pg.waitForTimeout(200);
  ok('1 · el panel de gravedad abre', await pg.isVisible('#grav'));

  /* global: magnitud y dirección */
  await pg.fill('#gMag', '3');
  await pg.click('#grav .gb[data-dir="arriba"]');
  await pg.click('#gGlobal'); await pg.waitForTimeout(150);
  const g1 = await pg.evaluate(() => ({ ...window.CRISOL.mundo.gGlobal }));
  ok('2 · aplica una gravedad global con su magnitud', Math.abs(Math.abs(g1.y) - 0.28*3/9.81) < 1e-6,
     JSON.stringify(g1));
  ok('3 · y con su dirección: hacia arriba es negativa', g1.y < 0, String(g1.y));

  await pg.click('#grav .gb[data-dir="der"]');
  await pg.click('#gGlobal'); await pg.waitForTimeout(120);
  const g2 = await pg.evaluate(() => ({ ...window.CRISOL.mundo.gGlobal }));
  ok('4 · y a la derecha empuja en x, no en y', g2.x > 0 && Math.abs(g2.y) < 1e-9, JSON.stringify(g2));

  await pg.click('#gNormal'); await pg.waitForTimeout(120);
  const g3 = await pg.evaluate(() => ({ ...window.CRISOL.mundo.gGlobal }));
  ok('5 · «volver a normal» la deja en 9.81 hacia abajo',
     Math.abs(g3.y - 0.28) < 1e-6 && Math.abs(g3.x) < 1e-9, JSON.stringify(g3));

  /* zona: se dibuja arrastrando */
  await pg.fill('#gMag', '0');
  await pg.click('#gZona'); await pg.waitForTimeout(120);
  const caja = await pg.locator('#mundo').boundingBox();
  await pg.mouse.move(caja.x + 60, caja.y + 60);
  await pg.mouse.down();
  await pg.mouse.move(caja.x + 200, caja.y + 190, { steps:10 });
  await pg.mouse.up();
  await pg.waitForTimeout(200);
  const zonas = await pg.evaluate(() => window.CRISOL.mundo.zonas.map(z => ({ ...z })));
  ok('6 · se DIBUJA una zona arrastrando', zonas.length === 1, zonas.length + ' zonas');
  ok('7 · y toma la magnitud elegida (0 m/s²)',
     zonas.length === 1 && Math.abs(zonas[0].gy) < 1e-9 && Math.abs(zonas[0].gx) < 1e-9,
     JSON.stringify(zonas[0] || {}));
  ok('8 · la zona sale en la lista, y se puede apagar y quitar',
     (await pg.locator('.gcampo').count()) === 1);
  await pg.click('.gcampo button:nth-child(2)'); await pg.waitForTimeout(120);
  ok('9 · apagarla NO la borra', await pg.evaluate(() => {
    const z = window.CRISOL.mundo.zonas; return z.length === 1 && z[0].activa === false; }));
  await pg.click('.gcampo button:nth-child(2)'); await pg.waitForTimeout(100);

  /* que la zona HAGA algo: una piedra quieta dentro no cae */
  await pg.evaluate(() => {
    const C = window.CRISOL, M = C.mundo, z = M.zonas[0];
    M.pon(Math.round((z.x0+z.x1)/2), Math.round((z.y0+z.y1)/2), C.IDX.piedra);
  });
  const y0 = await pg.evaluate(() => { const M = window.CRISOL.mundo;
    for(let k=0;k<M.t.length;k++) if(M.t[k]===window.CRISOL.IDX.piedra) return (k/M.an)|0; return -1; });
  await pg.waitForTimeout(1400);
  const y1 = await pg.evaluate(() => { const M = window.CRISOL.mundo;
    for(let k=0;k<M.t.length;k++) if(M.t[k]===window.CRISOL.IDX.piedra) return (k/M.an)|0; return -1; });
  ok('10 · y la zona ACTÚA: una piedra quieta dentro no cae', y0 > 0 && y1 === y0,
     'empezó en y=' + y0 + ' y está en y=' + y1);

  /* punto que atrae */
  await pg.fill('#gMag', '20');
  await pg.click('#gPunto'); await pg.waitForTimeout(200);
  /* ⚠ y se comprueba que el panel SE APARTA, porque con él abierto ocupaba
     tres cuartos de la sala y el dedo caía encima: «toca para poner el punto»
     era literalmente imposible. */
  ok('11a · con una herramienta de colocar, el panel se encoge y deja ver la sala',
     await pg.evaluate(() => {
       const g = document.getElementById('grav').getBoundingClientRect();
       const c = document.getElementById('mundo').getBoundingClientRect();
       return g.height < c.height * 0.45;
     }));
  await pg.mouse.click(caja.x + 200, caja.y + 90);
  await pg.waitForTimeout(250);
  /* ⚠ aquí escribí `ok(..., true)` — una prueba que no puede fallar, que es el
     defecto que este repo lleva meses persiguiendo. Y al medirlo de verdad
     también estaba en el SITIO equivocado: lo comprobaba mientras la
     herramienta seguía activa, cuando ahí el panel SÍ debe estar encogido.
     Va después de colocar, que es cuando la herramienta tiene que soltarse. */
  ok('11b · y al terminar de colocar, la herramienta se suelta sola',
     await pg.evaluate(() => !document.getElementById('grav').classList.contains('mini')),
     'el panel sigue encogido: la herramienta quedó pegada');
  ok('11 · se pone un punto gravitatorio tocando',
     (await pg.evaluate(() => window.CRISOL.mundo.puntos.length)) === 1);
  await pg.click('#gRepele'); await pg.waitForTimeout(80);
  ok('12 · y el botón alterna entre atrae y repele',
     (await pg.textContent('#gRepele')) === 'repele');

  /* quitar */
  await pg.click('.gcampo:last-child button:last-child'); await pg.waitForTimeout(150);
  ok('13 · quitar un campo lo quita de verdad',
     (await pg.evaluate(() => window.CRISOL.mundo.zonas.length + window.CRISOL.mundo.puntos.length)) === 1);

  /* las flechas se pueden apagar */
  await pg.uncheck('#gFlechas'); await pg.waitForTimeout(100);
  ok('14 · las flechas del campo se pueden apagar', !(await pg.isChecked('#gFlechas')));
  await pg.click('#gravX'); await pg.waitForTimeout(150);
  ok('15 · y el panel cierra', !(await pg.isVisible('#grav')));
}

seccion('soldar estructuras y el interruptor de cuerpos rígidos');
{
  /* Carlos pidió las dos por su nombre: «que decidir si se tratan como
     partículas separadas sea un toggle» y «si uno varios tipos de materiales
     en una sola estructura, como una pistola, poder decidirlo». Un botón que
     existe en el HTML pero no cambia nada es lo que él reportó del 🌐 english:
     aquí se comprueba el EFECTO, no que el botón esté. */
  ok('16 · el interruptor de cuerpos rígidos empieza encendido',
     (await pg.evaluate(() => window.CRISOL.mundo.rigido)) === true);
  await pg.click('#bRigido'); await pg.waitForTimeout(120);
  ok('17 · y al tocarlo se apaga de verdad, no sólo en el botón',
     (await pg.evaluate(() => window.CRISOL.mundo.rigido)) === false &&
     !(await pg.evaluate(() => document.getElementById('bRigido').classList.contains('on'))));
  await pg.click('#bRigido'); await pg.waitForTimeout(120);
  ok('18 · y vuelve a encenderse',
     (await pg.evaluate(() => window.CRISOL.mundo.rigido)) === true);

  /* soldar: se pinta una piedra y se le pasa el dedo con la herramienta */
  await pg.click('#bSolda'); await pg.waitForTimeout(120);
  const antes = await pg.evaluate(() => { let n = 0; const M = window.CRISOL.mundo;
    for(let k = 0; k < M.soldado.length; k++) if(M.soldado[k]) n++; return n; });
  /* ⚠ PINTAR Y SOLDAR EN LA MISMA VUELTA. Separados en dos `evaluate` la
     prueba daba 0 y parecía que soldar no servía: entre uno y otro corren
     cuadros de simulación, y la piedra que acababa de pintar en el aire SE
     CAYÓ antes de que le pasara el dedo. */
  await pg.evaluate(() => {
    const M = window.CRISOL.mundo;
    for(let y = 20; y < 26; y++) for(let x = 20; x < 30; x++) M.pon(x, y, window.CRISOL.IDX.piedra);
    /* el trazo, como lo haría el dedo: varias celdas seguidas en un grupo */
    let g = 0;
    for(let x = 20; x < 30; x++){ M.suelda(x, 22, 1, g); g = M.soldadoUltimo; }
  });
  const desp = await pg.evaluate(() => { let n = 0; const M = window.CRISOL.mundo;
    for(let k = 0; k < M.soldado.length; k++) if(M.soldado[k]) n++; return n; });
  ok('19 · soldar marca celdas como una sola estructura', desp > antes,
     'antes ' + antes + ' · después ' + desp);
  await pg.click('#bSolda'); await pg.waitForTimeout(80);
}

seccion('deshacer, guardar y no borrar sin querer');
{
  const piedras = () => pg.evaluate(() => { const M = window.CRISOL.mundo; let n = 0;
    for(let k = 0; k < M.t.length; k++) if(M.t[k] === window.CRISOL.IDX.piedra) n++; return n; });

  await pg.evaluate(() => {
    const M = window.CRISOL.mundo;
    M.limpia();
    for(let y = 30; y < 36; y++) for(let x = 30; x < 44; x++) M.pon(x, y, window.CRISOL.IDX.piedra);
    window.CRISOL.apunta();     /* la foto que saca la app antes de cada trazo */
    for(let y = 30; y < 36; y++) for(let x = 30; x < 44; x++) M.pon(x, y, window.CRISOL.IDX.vacio);
  });
  ok('20 · borrar con la brocha se lleva las piedras', (await piedras()) === 0);
  await pg.click('#bDeshace'); await pg.waitForTimeout(150);
  ok('21 · y el botón de regresar las trae de vuelta', (await piedras()) > 60,
     'volvieron ' + (await piedras()));

  /* ⚠ EL BOTE DE BASURA PIDE CONFIRMACIÓN: un toque avisa, dos vacían. Es lo
     que Carlos reportó, y es de las cosas que sólo se ven probándolas — el
     botón existía y funcionaba, sólo que demasiado bien. */
  await pg.click('#bBorra'); await pg.waitForTimeout(150);
  ok('22 · un solo toque al bote NO vacía nada', (await piedras()) > 60,
     'quedaron ' + (await piedras()));
  await pg.click('#bBorra'); await pg.waitForTimeout(150);
  ok('23 · y el segundo toque sí', (await piedras()) === 0);
  await pg.click('#bDeshace'); await pg.waitForTimeout(150);
  ok('24 · vaciar también se puede deshacer', (await piedras()) > 60);

  /* guardados */
  await pg.click('#bGuarda'); await pg.waitForTimeout(150);
  ok('25 · el panel de salas guardadas abre', await pg.isVisible('#salas'));
  await pg.click('#salasLista .gcampo:first-child button'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { window.CRISOL.mundo.limpia(); });
  ok('26 · tras vaciar no queda nada', (await piedras()) === 0);
  await pg.click('#salasLista .gcampo:first-child button:nth-child(3)'); await pg.waitForTimeout(250);
  ok('27 · y cargar la ranura devuelve la sala', (await piedras()) > 60,
     'volvieron ' + (await piedras()));
  ok('28 · y el guardado sobrevive en el teléfono',
     (await pg.evaluate(() => !!(JSON.parse(localStorage.getItem('crisol.v1') || '{}').salas || {})['1'])));
}

seccion('sin errores al final');
ok('ni un error de consola en toda la sesión', errores.length === 0, errores.slice(0,3).join(' | '));

await nav.close();
console.log('\n' + (mal ? '✗' : '✓') + '  ' + bien + ' pasan · ' + mal + ' fallan');
process.exit(mal ? 1 : 0);
