/* Pruebas de la app de entrenamiento ISTQB.
   Se juega la app entera, no se lee el código: se resuelven los cincuenta
   niveles con la clave que la propia página trae, y se comprueba lo que sale.

     node guias/istqb-ctfl/entrenamiento/pruebas.mjs [http://127.0.0.1:8791]

   Lo que estas pruebas SÍ pueden cachar, y por qué está cada una:
   · que un nivel quede sin respuesta correcta alcanzable (se juegan los 50)
   · que el avance no sobreviva a recargar la página
   · que un nombre con HTML se ejecute en la constancia
   · que algo se salga de la pantalla del teléfono
   · que un control quede por debajo de los 44 px que exige el dedo */
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const RUTA = BASE + '/guias/istqb-ctfl/entrenamiento/';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (que, cond, detalle = '') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};

const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const abrir = async (ancho = 390, alto = 844) => {
  const ctx = await nav.newContext({ viewport:{ width:ancho, height:alto }, hasTouch:ancho < 700 });
  const p = await ctx.newPage();
  p.__errores = [];
  p.on('pageerror', e => p.__errores.push(String(e)));
  await p.goto(RUTA, { waitUntil:'networkidle' });
  return p;
};

/* ── 1 · LA ENTRADA ──────────────────────────────────────────────────── */
console.log('\n── la entrada ──');
{
  const p = await abrir();
  ok('arranca en la portada', await p.locator('#pPortada').isVisible());
  ok('el aviso dice que NO es la certificación ISTQB',
     (await p.locator('.aviso-legal').textContent()).includes('No son la certificación ISTQB'));

  await p.fill('#fNombre', 'Ana');
  await p.click('#fEntrar button[type=submit]');
  ok('un nombre de una sola palabra no deja pasar', await p.locator('#pPortada').isVisible());
  ok('y lo dice con un error visible', await p.locator('#errNombre').isVisible());

  await p.fill('#fNombre', '  María   Fernanda  Reyes ');
  await p.click('#fEntrar button[type=submit]');
  ok('con nombre completo entra al mapa', await p.locator('#pMapa').isVisible());
  ok('y le quita los espacios de más al nombre',
     (await p.locator('#quien').textContent()).trim() === 'María Fernanda Reyes',
     await p.locator('#quien').textContent());
  ok('sin errores de JavaScript', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── 2 · EL MAPA Y EL CANDADO ────────────────────────────────────────── */
console.log('\n── el mapa y el orden ──');
const entrar = async (p, nombre = 'María Fernanda Reyes') => {
  await p.fill('#fNombre', nombre);
  await p.click('#fEntrar button[type=submit]');
};
{
  const p = await abrir();
  await entrar(p);
  ok('hay 50 casillas', await p.locator('.casilla').count() === 50);
  ok('la 1 está abierta', !(await p.locator('.casilla').nth(0).isDisabled()));
  ok('la 2 está cerrada', await p.locator('.casilla').nth(1).isDisabled());
  ok('la 50 está cerrada', await p.locator('.casilla').nth(49).isDisabled());
  ok('el botón de constancias NO se ve todavía', await p.locator('#bCertificados').isHidden());
  ok('el avance dice 0', (await p.locator('#mHechos').textContent()) === '0');
  await p.context().close();
}

/* ── 3 · UN NIVEL, CON TODO ──────────────────────────────────────────── */
console.log('\n── un nivel por dentro ──');
{
  const p = await abrir();
  await entrar(p);
  await p.locator('.casilla').nth(0).click();
  ok('se abre el nivel', await p.locator('#pNivel').isVisible());
  ok('«Siguiente» empieza apagado', await p.locator('#bSiguiente').isDisabled());
  ok('«Comprobar» empieza apagado, sin respuesta elegida', await p.locator('#bComprobar').isDisabled());

  /* respuesta equivocada a propósito: el nivel 1 es de opción y la buena es la a */
  await p.locator('.opcion').nth(1).click();
  ok('al elegir, «Comprobar» se enciende', !(await p.locator('#bComprobar').isDisabled()));
  await p.click('#bComprobar');
  ok('una respuesta mala da veredicto negativo', await p.locator('#nVeredicto .veredicto.mal').isVisible());
  ok('y NO desbloquea «Siguiente»', await p.locator('#bSiguiente').isDisabled());

  await p.click('#bPista');
  ok('la primera pista aparece', await p.locator('#nPistas .pista').count() === 1);
  await p.click('#bPista'); await p.click('#bPista');
  ok('salen las tres pistas', await p.locator('#nPistas .pista').count() === 3);
  ok('y el botón de pista se esconde al acabarse', await p.locator('#bPista').isHidden());

  await p.click('#bManual');
  ok('el paso a paso aparece con sus pasos', await p.locator('#nPasos li').count() >= 3);
  ok('y su botón se esconde', await p.locator('#bManual').isHidden());

  await p.locator('.opcion').nth(0).click();
  await p.click('#bComprobar');
  ok('la respuesta buena da veredicto positivo', await p.locator('#nVeredicto .veredicto.bien').isVisible());
  ok('y enciende «Siguiente»', !(await p.locator('#bSiguiente').isDisabled()));

  await p.click('#bVolver');
  ok('el mapa marca el 1 como hecho',
     (await p.locator('.casilla').nth(0).getAttribute('class')).includes('hecho'));
  ok('y abre el 2', !(await p.locator('.casilla').nth(1).isDisabled()));
  ok('sin errores de JavaScript', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── 4 · LOS CINCUENTA, JUGADOS ──────────────────────────────────────── */
console.log('\n── los cincuenta niveles, resueltos con la clave de la página ──');
const jugarTodo = async (p) => {
  const claves = await p.evaluate(() => NIVELES.map(x => ({
    n:x.n, tipo:x.tipo, correcta:x.correcta, correctas:x.correctas, respuesta:x.respuesta })));
  const fallos = [];
  for(const k of claves){
    await p.evaluate(n => { document.querySelectorAll('.casilla')[n-1].click(); }, k.n);
    await p.waitForTimeout(20);
    if(k.tipo === 'opcion') await p.locator('.opcion').nth(k.correcta).click();
    else if(k.tipo === 'multi'){ for(const i of k.correctas) await p.locator('.opcion').nth(i).click(); }
    else await p.fill('#nNum', String(k.respuesta));
    await p.click('#bComprobar');
    await p.waitForTimeout(20);
    if(!(await p.locator('#nVeredicto .veredicto.bien').isVisible())) fallos.push(k.n);
    await p.click('#bVolver');
    await p.waitForTimeout(20);
  }
  return fallos;
};
let paginaLlena = null;
{
  const p = await abrir();
  await entrar(p);
  const fallos = await jugarTodo(p);
  ok('los 50 niveles se resuelven con su propia clave', fallos.length === 0,
     'fallan los niveles ' + fallos.join(', '));
  ok('el contador llega a 50', (await p.locator('#mHechos').textContent()) === '50');
  ok('las 50 casillas quedan marcadas', await p.locator('.casilla.hecho').count() === 50);
  ok('aparece el botón de constancias', await p.locator('#bCertificados').isVisible());
  ok('sin errores de JavaScript en toda la partida', p.__errores.length === 0, p.__errores[0]);
  paginaLlena = p;
}

/* ── 5 · LAS CONSTANCIAS ─────────────────────────────────────────────── */
console.log('\n── las constancias ──');
{
  const p = paginaLlena;
  await p.click('#bCertificados');
  ok('salen dos constancias', await p.locator('.diploma').count() === 2);
  const t = await p.locator('#nDiplomas').textContent();
  ok('llevan el nombre de la persona', t.includes('María Fernanda Reyes'));
  ok('la primera dice curso completado', t.includes('Constancia de curso completado'));
  ok('la segunda dice preparación para el examen', t.includes('Constancia de preparación'));
  ok('llevan folio', /GM-CTFL-\d{8}-[A-Z0-9]{6}/.test(t), t.slice(0,120));
  ok('DICEN que no son la certificación ISTQB',
     t.includes('No es la certificación ISTQB') && t.includes('validez ante ISTQB'));
  ok('dicen 50 de 50', t.includes('50 de 50'));

  /* el folio no puede cambiar entre visitas: si cambia no sirve para verificar */
  const f1 = (t.match(/GM-CTFL-\d{8}-[A-Z0-9]{6}/) || [])[0];
  await p.click('#bVolverMapa'); await p.click('#bCertificados');
  const f2 = ((await p.locator('#nDiplomas').textContent()).match(/GM-CTFL-\d{8}-[A-Z0-9]{6}/) || [])[0];
  ok('el folio es el mismo cada vez que se abren', f1 === f2, f1 + ' vs ' + f2);

  await p.reload({ waitUntil:'networkidle' });
  ok('al recargar, el avance sigue ahí', (await p.locator('#mHechos').textContent()) === '50');
  await p.context().close();
}

/* ── 6 · UN NOMBRE CON HTML ──────────────────────────────────────────── */
console.log('\n── un nombre con HTML dentro ──');
{
  const p = await abrir();
  await entrar(p, 'Ana <img src=x onerror="window.__roto=1"> Pérez');
  await p.evaluate(() => {
    /* se rellena el avance a mano para llegar a las constancias sin jugar 50 */
    const d = JSON.parse(localStorage.getItem('mazi_istqb_v1'));
    d.hechos = []; for(let i = 1; i <= 50; i++) d.hechos.push(i);
    localStorage.setItem('mazi_istqb_v1', JSON.stringify(d));
  });
  await p.reload({ waitUntil:'networkidle' });
  await p.click('#bCertificados');
  ok('el nombre con HTML sale como TEXTO, no se ejecuta',
     await p.evaluate(() => !window.__roto));
  ok('y no aparece ninguna etiqueta img en la constancia',
     await p.locator('#nDiplomas img').count() === 0);
  ok('pero el texto sí se lee completo',
     (await p.locator('.diploma .nombre').first().textContent()).includes('onerror'));
  await p.context().close();
}

/* ── 7 · LAS PROPORCIONES ────────────────────────────────────────────── */
console.log('\n── las proporciones ──');
for(const [ancho, como] of [[390,'teléfono'], [1100,'computadora']]){
  const p = await abrir(ancho, 900);
  await entrar(p);
  const revisar = async (donde) => {
    const f = await p.evaluate((ancho) => {
      const desbordan = [], chicos = [];
      const doc = document.documentElement;
      const pagina = doc.scrollWidth > ancho + 1;
      document.querySelectorAll('.pantalla.viva *').forEach(el => {
        const r = el.getBoundingClientRect();
        if(!r.width && !r.height) return;
        if(r.right > ancho + 1 || r.left < -1){
          const cs = getComputedStyle(el);
          if(cs.overflowX !== 'auto' && cs.overflowX !== 'scroll')
            desbordan.push((el.className || el.tagName) + ' ' + Math.round(r.right));
        }
      });
      document.querySelectorAll('.pantalla.viva button, .pantalla.viva input').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.height && r.height < 44) chicos.push((el.id || el.className) + ' ' + Math.round(r.height));
      });
      return { pagina, desbordan, chicos };
    }, ancho);
    ok(donde + ': la página no se va de lado', !f.pagina);
    ok(donde + ': nada se sale de la pantalla', f.desbordan.length === 0, f.desbordan.slice(0,3).join(' · '));
    ok(donde + ': ningún control mide menos de 44 px', f.chicos.length === 0, f.chicos.slice(0,3).join(' · '));
  };
  console.log('  · a ' + ancho + ' px (' + como + ')');
  await revisar('mapa');
  await p.locator('.casilla').nth(0).click();
  await p.click('#bPista'); await p.click('#bManual');
  await revisar('nivel');
  await p.context().close();
}

/* ── 8 · EL SIMULACRO DE EXAMEN ──────────────────────────────────────
   Carlos, e261. Lo que hay que poder reprobar aquí no es que la pantalla se
   vea: es que el examen CALIFIQUE BIEN con las opciones barajadas.

   ⚠ EL FALLO QUE ESTA PRUEBA EXISTE PARA CAZAR. Si se barajan los textos de
   a/b/c/d y `correcta` se queda apuntando al índice viejo, el examen califica
   mal y NADIE lo nota: el índice sigue siendo un número válido, la pantalla no
   protesta, y el alumno sale con un porcentaje inventado. Por eso aquí no se
   contesta por índice: se contesta por el TEXTO de la opción correcta, que es
   lo único que no cambia al barajar. Si la permutación estuviera mal llevada,
   contestar todo bien no daría 100 %. */
console.log('\n── el simulacro de examen ──');

/* Lee la pregunta en pantalla y la casa con su nivel por el enunciado, que es
   único. Devuelve qué hay que tocar para acertar — o para fallar. */
const leerPregunta = (p) => p.evaluate(() => {
  /* ⚠ SE CASA POR TEXTO PLANO, NO POR innerHTML. El navegador REESCRIBE el
     HTML que se le da: entidades, comillas de atributo, espacios duros. Con
     `innerHTML` la comparación acertaba en la mayoría de los niveles y fallaba
     en unos pocos — y como el examen saca 40 de 50 al azar, la prueba pasaba o
     reventaba según el sorteo. Una prueba que depende del sorteo no es una
     prueba: es una moneda. */
  /* Y SIN NINGÚN ESPACIO. El enunciado se parte en <p> por los saltos dobles,
     y el `textContent` de dos <p> seguidos se pega sin nada en medio:
     «reclama.¿Cuál». La fuente sí tiene el salto. Comparar con los espacios
     normalizados hacía fallar justo los enunciados de dos párrafos —los más
     largos, o sea los más importantes— y como el examen sortea 40 de 50, la
     prueba pasaba o reventaba según la tirada. */
  const aTexto = (h) => { const d = document.createElement('div');
                          d.innerHTML = h; return d.textContent.replace(/\s+/g,''); };
  const enPantallaTxt = aTexto(document.querySelector('#xEnunciado').innerHTML);
  const nivel = NIVELES.find(x => aTexto(x.enunciado) === enPantallaTxt);
  if(!nivel) return { error:'no casa con ningún nivel' };
  /* ⚠ SE COMPARA EL TEXTO PLANO, NO EL innerHTML. Las opciones llevan HTML
     mío —negritas, `&gt;`— y el navegador NORMALIZA al reescribirlo: un `>`
     suelto en la fuente vuelve como `&gt;`. Comparando innerHTML contra la
     cadena original, seis opciones no casaban, la prueba no marcaba nada, y
     el examen salía «sin contestar» sin que nada dijera por qué. */
  const plano = (html) => { const d = document.createElement('div');
                            d.innerHTML = html; return d.textContent.trim(); };
  const enPantalla = [...document.querySelectorAll('#xRespuesta .opcion')]
      .map(b => plano(b.lastElementChild.innerHTML));
  let buenas = [], malas = [];
  if(nivel.tipo === 'opcion' || nivel.tipo === 'multi'){
    const claves = nivel.tipo === 'opcion' ? [nivel.correcta] : nivel.correctas;
    const textos = claves.map(i => plano(nivel.opciones[i]));
    buenas = enPantalla.map((t, i) => textos.includes(t) ? i : -1).filter(i => i >= 0);
    malas  = enPantalla.map((t, i) => textos.includes(t) ? -1 : i).filter(i => i >= 0);
  }
  return { n:nivel.n, tipo:nivel.tipo, respuesta:nivel.respuesta, buenas, malas,
           mismoOrden: (nivel.tipo === 'opcion' || nivel.tipo === 'multi')
             ? enPantalla.join('|') === nivel.opciones.map(plano).join('|') : null };
});

const contestar = async (p, bien) => {
  const q = await leerPregunta(p);
  /* ⚠ QUE REVIENTE, Y NO EN SILENCIO. La primera versión devolvía y seguía: el
     examen quedaba a medio contestar, saltaba el «¿entregas así?», Playwright
     lo descartaba por omisión, la entrega no ocurría y lo único que se veía era
     un timeout esperando el marcador — a treinta segundos y a mil kilómetros de
     la causa. */
  if(q.error) throw new Error('la pregunta en pantalla no casa con ningún nivel');
  if(q.tipo === 'opcion' || q.tipo === 'multi'){
    const cuales = bien ? q.buenas : (q.malas.length ? [q.malas[0]] : q.buenas);
    for(const i of cuales) await p.locator('#xRespuesta .opcion').nth(i).click();
  } else {
    await p.fill('#xNum', String(bien ? q.respuesta : q.respuesta + 7));
  }
  return q;
};

/* corre el examen entero contestando bien o mal, y devuelve lo observado */
const correrExamen = async (p, bien) => {
  await p.click('#bExamen');
  await p.waitForTimeout(60);
  const vistas = [], ordenes = [];
  const total = Number(await p.locator('#xTotal').textContent());
  const anchoInicial = await p.evaluate(() => document.querySelector('#xRiel').style.width);
  for(let i = 0; i < total; i++){
    const q = await contestar(p, bien);
    vistas.push(q.n); ordenes.push(q.mismoOrden);
    if(i < total - 1){ await p.click('#xSiguiente'); await p.waitForTimeout(15); }
  }
  const anchoFinal = await p.evaluate(() => document.querySelector('#xRiel').style.width);
  const durante = await p.evaluate(() => ({
    veredictos: document.querySelectorAll('#pExamen .veredicto').length,
    buenasPintadas: document.querySelectorAll('#pExamen .opcion.buena').length,
    pista: !!document.querySelector('#pExamen #bPista'),
    manual: !!document.querySelector('#pExamen #bManual'),
  }));
  await p.click('#xEntregar');
  await p.waitForTimeout(80);
  return { total, vistas, ordenes, anchoInicial, anchoFinal, durante,
           puntos: await p.locator('#xMarcador .puntos').textContent(),
           sello:  await p.locator('#xMarcador .sello').textContent() };
};

{
  const p = await abrir(900, 1200);
  await entrar(p);
  const a = await correrExamen(p, true);

  ok('el simulacro saca 40 preguntas', a.total === 40, String(a.total));
  ok('sin repetir ninguna', new Set(a.vistas).size === a.total,
     'distintas: ' + new Set(a.vistas).size);
  ok('la barra arranca en cero y acaba llena',
     a.anchoInicial === '0%' && a.anchoFinal === '100%', a.anchoInicial + ' → ' + a.anchoFinal);

  /* LA QUE IMPORTA */
  ok('contestando por el TEXTO correcto, la calificación es 100 %',
     a.puntos.trim() === '100%', a.puntos);
  ok('y dice que habría aprobado', /aprobado/i.test(a.sello), a.sello);

  ok('las opciones se barajan de verdad',
     a.ordenes.filter(x => x === false).length >= 5,
     'con el orden original: ' + a.ordenes.filter(x => x === true).length + ' de ' +
     a.ordenes.filter(x => x !== null).length);

  ok('durante el examen no se dice ni un veredicto', a.durante.veredictos === 0, String(a.durante.veredictos));
  ok('ni se pinta la opción buena', a.durante.buenasPintadas === 0, String(a.durante.buenasPintadas));
  ok('ni hay pistas ni paso a paso', !a.durante.pista && !a.durante.manual);
  ok('sin errores de JavaScript', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── el reverso: todo mal tiene que dar cero, y abrir el repaso ─────── */
{
  const p = await abrir(900, 1200);
  await entrar(p);
  const b = await correrExamen(p, false);
  ok('contestando todo mal, la calificación es 0 %', b.puntos.trim() === '0%', b.puntos);
  ok('y dice que todavía no', /todavía no/i.test(b.sello), b.sello);
  ok('el repaso ofrece los 40 fallos',
     /40 fallos/.test(await p.locator('#xRepasar').textContent()),
     await p.locator('#xRepasar').textContent());

  /* «volver a presentarlo después con las ayudas», que es lo que se pidió */
  await p.click('#xRepasar');
  await p.waitForTimeout(60);
  ok('repasar lleva a la pantalla de práctica', await p.locator('#pNivel').isVisible());
  ok('y ahí sí hay pistas', await p.locator('#bPista').isVisible());
  ok('y paso a paso', await p.locator('#bManual').isVisible());
  await p.context().close();
}

/* ── que el orden de las preguntas cambie de una vez a otra ─────────── */
{
  const p = await abrir(900, 1200);
  await entrar(p);
  const uno = await correrExamen(p, true);
  await p.click('#xOtraVez');
  await p.waitForTimeout(60);
  const dos = [];
  for(let i = 0; i < 8; i++){
    dos.push((await leerPregunta(p)).n);
    await p.click('#xSiguiente'); await p.waitForTimeout(15);
  }
  ok('dos exámenes seguidos no traen las preguntas en el mismo orden',
     uno.vistas.slice(0,8).join(',') !== dos.join(','),
     uno.vistas.slice(0,8).join(',') + ' vs ' + dos.join(','));
  await p.context().close();
}

/* ── 9 · EL EXAMEN DE PRUEBA, QUE ES EL OTRO ─────────────────────────
   Carlos, e278: «Pon en el examen el de prueba y uno para presentar». Los dos
   se diferencian en UNA cosa —si la pantalla habla— y eso es exactamente lo
   que hay que poder reprobar: que el de prueba corrija y el de presentar calle.
   Si algún día se cruzan, el de presentar deja de medir y nadie lo nota. */
console.log('\n── el examen de prueba ──');
{
  const p = await abrir(900, 1200);
  await entrar(p);
  await p.click('#bExamenPrueba');
  await p.waitForTimeout(80);

  const total = Number(await p.locator('#xTotal').textContent());
  ok('el de prueba son 10 preguntas', total === 10, String(total));
  ok('y ofrece pistas antes de contestar', await p.locator('#xPista').isVisible());
  ok('y todavía no dice nada', (await p.locator('#xVeredicto').innerHTML()) === '');

  await p.click('#xPista');
  await p.waitForTimeout(40);
  ok('la pista aparece al pedirla', (await p.locator('#xPistas .pista').count()) >= 1);

  /* se contesta bien la primera y tiene que decirlo en el acto */
  const q = await contestar(p, true);
  await p.waitForTimeout(60);
  ok('el botón de comprobar aparece al haber respuesta', await p.locator('#xComprobar').isVisible());
  await p.click('#xComprobar'); await p.waitForTimeout(80);
  ok('al comprobar corrige en el acto', await p.locator('#xVeredicto .veredicto').isVisible());
  ok('y dice que es correcto', /correcto/i.test(await p.locator('#xVeredicto h3').textContent()),
     await p.locator('#xVeredicto h3').textContent());
  ok('y ya no ofrece pista para esa', !(await p.locator('#xPista').isVisible()));

  /* y una mal: tiene que decir cuál era */
  await p.click('#xSiguiente'); await p.waitForTimeout(40);
  await contestar(p, false);
  await p.click('#xComprobar'); await p.waitForTimeout(80);
  const malo = await p.locator('#xVeredicto').textContent();
  ok('al fallar dice cuál era la correcta', /La correcta (era|eran)/.test(malo), malo.slice(0,60));

  /* el de prueba NO entra en el historial */
  /* ⚠ AVANZAR ANTES DE CONTESTAR. Venimos de la pregunta 2, que ya está
     comprobada y con los botones deshabilitados: contestar «la actual» aquí
     es intentar pulsar un botón muerto y esperar treinta segundos a que
     reviva. */
  for(let i = 2; i < total; i++){
    await p.click('#xSiguiente'); await p.waitForTimeout(20);
    await contestar(p, true);
    await p.click('#xComprobar').catch(() => {});
    await p.waitForTimeout(20);
  }
  await p.click('#xEntregar');
  await p.waitForTimeout(120);
  ok('el marcador dice que esto no mide', /no mide lo que sabes/.test(await p.locator('#xMarcador p').textContent()));
  await p.click('#xAlMapa'); await p.waitForTimeout(60);
  const hist = await p.locator('#xHistoria').textContent();
  ok('y no aparece en el historial de exámenes', hist.trim() === '', hist);
  ok('sin errores de JavaScript', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── 10 · EL BOTÓN DE SALIR, QUE NO HACÍA NADA ───────────────────────
   Carlos, e280. Desde el mapa llevaba al mapa: se pintaba, se pulsaba y no
   pasaba nada. Un botón inerte es peor que ninguno, porque el que lo pulsa
   cree que la app se rompió. */
console.log('\n── el botón de salir ──');
{
  const p = await abrir(900, 1200);
  await entrar(p);
  ok('en el mapa dice «Menú principal»',
     (await p.locator('#bSalir').textContent()).trim() === 'Menú principal',
     await p.locator('#bSalir').textContent());
  await p.click('#bSalir'); await p.waitForTimeout(60);
  ok('y desde el mapa SÍ lleva a algún lado', await p.locator('#pPortada').isVisible());

  await p.click('#fEntrar button[type=submit]'); await p.waitForTimeout(60);
  await p.locator('.casilla').nth(0).click(); await p.waitForTimeout(40);
  ok('en un nivel dice «Al mapa»',
     (await p.locator('#bSalir').textContent()).trim() === 'Al mapa',
     await p.locator('#bSalir').textContent());
  await p.click('#bSalir'); await p.waitForTimeout(60);
  ok('y lleva al mapa', await p.locator('#pMapa').isVisible());

  await p.click('#bExamen'); await p.waitForTimeout(80);
  ok('en el examen dice «Salir del examen»',
     (await p.locator('#bSalir').textContent()).trim() === 'Salir del examen',
     await p.locator('#bSalir').textContent());
  p.once('dialog', d => d.accept());
  await p.click('#bSalir'); await p.waitForTimeout(120);
  ok('y salir del examen avisa y devuelve al mapa', await p.locator('#pMapa').isVisible());
  ok('sin errores de JavaScript', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas de la app de entrenamiento');
process.exit(mal ? 1 : 0);
