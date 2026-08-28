/* ══════════════════════════════════════════════════════════════════════════
   EL TALLER · que sus mandos EXISTAN donde Carlos lo usa
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «en el taller 3D no encuentro cómo acceder a la vista de todos los
   involucrados (la vista aérea chida)».

   No es que no la encontrara: NO ESTABA. El taller se abre dentro de La Sala
   con `?dentro=1`, y esa marca esconde la barra entera para no repetir la
   cabecera de la mesa. Los tres botones vivían dentro de esa barra. Empotrado
   —o sea, como él lo usa siempre— la vista aérea era inalcanzable.

   ⚠ CÓMO SE MIDE LA VISIBILIDAD, porque aquí me equivoqué una vez: `offsetParent`
   devuelve `null` para todo lo que sea `position:fixed`, y estos mandos son
   fijos por definición. Con esa prueba, un botón perfectamente visible salía
   como escondido. Se mide con el RECUADRO y el estilo calculado.

   Cómo se corre:  node build.mjs && node entorno/pruebas-mandos.mjs
   (con `dist/` servido en el 8791, reiniciado después del build)
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'http://localhost:8791/entorno/';
let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra ? '\n      ' + extra : '')); }
};

const nav = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });

/* Se mide de verdad: recuadro con área, no escondido por estilo, y con algo
   encima que reciba el toque en su centro. */
function seVe(sel){
  const e = document.querySelector(sel);
  if(!e) return { hay:false };
  const r = e.getBoundingClientRect();
  const s = getComputedStyle(e);
  const dentroDePantalla = r.width > 0 && r.height > 0 &&
    r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  const pintado = s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.01;
  const enElPunto = document.elementFromPoint(
    Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)),
    Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
  return { hay:true, seVe: dentroDePantalla && pintado,
           tocable: !!enElPunto && (enElPunto === e || e.contains(enElPunto)),
           alto: Math.round(r.height), ancho: Math.round(r.width) };
}

async function abrir(query){
  const ctx = await nav.newContext({ viewport:{width:390,height:844},
    deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  p.__errores = [];
  p.on('pageerror', e => p.__errores.push(String(e).slice(0,140)));
  p.on('console', m => { if(m.type() === 'error') p.__errores.push('consola: ' + m.text().slice(0,120)); });
  await p.goto(BASE + query, { waitUntil:'networkidle' });
  await p.waitForTimeout(3800);        /* el modelo del robot tarda en llegar */
  p.__ve = (sel) => p.evaluate(seVe, sel);
  return p;
}

for(const [query, como, barraDebeVerse] of [
  ['?demo=1',            'suelto',    true],
  ['?demo=1&dentro=1',   'empotrado', false],
]){
  console.log('\n── ' + como + ' ──');
  const p = await abrir(query);
  ok('carga sin errores', p.__errores.length === 0, p.__errores[0]);
  ok('el cuarto se dibuja', await p.evaluate(() => !!document.querySelector('canvas')));

  for(const [sel, nombre] of [['#bVista','la vista aérea'], ['#bSeguir','seguir'], ['#bOjo','el ojo del panel']]){
    const v = await p.__ve(sel);
    ok(nombre + ' se ve y se puede tocar', v.hay && v.seVe && v.tocable, JSON.stringify(v));
    ok(nombre + ' mide 44 px o más', v.hay && v.alto >= 44 && v.ancho >= 44, JSON.stringify(v));
  }

  const barra = await p.__ve('.barra');
  ok(barraDebeVerse ? 'la barra con el título se ve' : 'la barra se esconde, que es lo que pide la mesa',
     !!barra.seVe === barraDebeVerse, JSON.stringify(barra));

  /* Que el botón HAGA algo y lo DIGA. Un modo que no se anuncia se ve muerto:
     es la misma lección del «Ajustar» de Reportes. */
  const antes = await p.evaluate(() => __taller.camara.position.toArray().map(n => +n.toFixed(2)));
  await p.click('#bVista'); await p.waitForTimeout(1500);
  const durante = await p.evaluate(() => ({
    pos: __taller.camara.position.toArray().map(n => +n.toFixed(2)),
    vista: document.getElementById('bVista').getAttribute('aria-pressed'),
    seguir: document.getElementById('bSeguir').getAttribute('aria-pressed'),
  }));
  ok('tocar la vista aérea MUEVE la cámara de verdad',
     JSON.stringify(antes) !== JSON.stringify(durante.pos),
     JSON.stringify(antes) + ' → ' + JSON.stringify(durante.pos));
  ok('y sube: es aérea, se ve el cuarto desde arriba',
     durante.pos[1] > antes[1], antes[1] + ' → ' + durante.pos[1]);
  ok('el botón dice que está prendido', durante.vista === 'true');
  ok('y apaga «seguir», porque son modos que se pelean', durante.seguir === 'false');

  await p.click('#bVista'); await p.waitForTimeout(900);
  const despues = await p.evaluate(() => ({
    vista: document.getElementById('bVista').getAttribute('aria-pressed'),
    seguir: document.getElementById('bSeguir').getAttribute('aria-pressed'),
  }));
  ok('al apagarla vuelve a seguir', despues.vista === 'false' && despues.seguir === 'true');

  /* ⚠ EL OTRO DEFECTO: una copia del registro del botón «Panel» estaba pegada
     DENTRO del `else` de la vista. Cada vez que apagabas la vista amplia se
     colgaba OTRO escuchador, y a partir de ahí un clic plegaba y desplegaba en
     el mismo instante — indistinguible de un botón muerto. Se caza apagando la
     vista varias veces y comprobando que el ojo sigue haciendo UN paso. */
  for(let i = 0; i < 3; i++){
    await p.click('#bVista'); await p.waitForTimeout(300);
    await p.click('#bVista'); await p.waitForTimeout(300);
  }
  const estado = () => p.evaluate(() => {
    const e = document.getElementById('panel');
    return e.classList.contains('oculto') ? 'oculto'
         : e.classList.contains('plegado') ? 'plegado' : 'completo';
  });
  const a1 = await estado();
  await p.click('#bOjo'); await p.waitForTimeout(300);
  const a2 = await estado();
  ok('tras seis vueltas de vista, el ojo sigue dando UN paso', a1 !== a2, a1 + ' → ' + a2);

  ok('y ni un error en toda la vuelta', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}


/* ── 3 · LAS PANTALLAS DE CADA COMPUTADORA ───────────────────────────── */
console.log('\n── lo que enseña el monitor ──');
{
  const p = await abrir('?demo=1');
  ok('carga sin errores', p.__errores.length === 0, p.__errores[0]);

  /* Todo el volcado va en UN solo `evaluate`: el reloj del ocio repinta cada
     7 segundos, y si la prueba va de ida y vuelta el reloj le gana y salen dos
     pantallas iguales. Ya me pasó y me hizo buscar un defecto que no existía. */
  const r = await p.evaluate(() => {
    const huella = () => __taller.lienzoDe(null);
    const n = __taller.cuantasPantallas();
    const todas = [];
    for(let i = 0; i < n; i++){ __taller.verPantalla(null, i); todas.push(huella()); }
    /* ⚠ LA PRUEBA QUE IMPORTA: pintar A, luego B, y volver a A. Si A no sale
       IDÉNTICA la segunda vez, es que algo de B se quedó abajo. Así se cazó el
       «Lo que estabas buscando…» de la búsqueda asomando por debajo del suelo
       del juego de bloques — el terreno no llegaba al borde y nadie borraba. */
    __taller.verPantalla(null, 0); const a1 = huella();
    __taller.verPantalla(null, 1); huella();
    __taller.verPantalla(null, 0); const a2 = huella();

    /* ⚠ Y LA DE ARRIBA NO BASTA, lo comprobé quitándole el borrado al código
       y viéndola pasar igual: A→B→A sólo caza el problema si LA QUE FALLA ES
       A. El defecto real estaba en la pantalla del juego de bloques —cuyo
       terreno no llegaba al borde de abajo—, o sea en la B.

       Ésta sí: se embarra el lienzo de un magenta imposible, se pinta cada
       pantalla encima, y se CUENTAN los píxeles del color imposible que
       sobrevivieron. Uno solo ya es un agujero por donde se ve lo de antes.
       Lo prueba una por una, no de a pares. */
    const manchadas = [];
    for(let i = 0; i < n; i++){
      __taller.ensuciar(null);
      __taller.verPantalla(null, i);
      const m = __taller.manchas(null);
      if(m > 0) manchadas.push(i + ':' + m + 'px');
    }
    return { n, todas, limpio: a1 === a2, manchadas,
             largos: todas.map(x => x.length) };
  });

  ok('hay once pantallas en la vuelta', r.n === 11, String(r.n));
  ok('y todas son distintas entre sí',
     new Set(r.todas).size === r.n, r.n - new Set(r.todas).size + ' repetidas');
  ok('ninguna deja restos de la anterior debajo', r.limpio);
  ok('y cada una tapa TODO el lienzo, una por una',
     r.manchadas.length === 0, r.manchadas.join(' · '));
  /* Una pantalla que sale casi vacía es una que no se dibujó: el PNG de una
     imagen plana pesa una fracción de una con contenido. */
  ok('ninguna sale en blanco', Math.min(...r.largos) > 20000,
     'la más chica: ' + Math.min(...r.largos) + ' bytes');

  /* Y lo primero que pidió Carlos: que la pantalla enseñe lo que HACE el
     agente. Se comprueba que el trabajo cambia el dibujo, no leyendo el código
     sino repintando con y sin trabajo. */
  const conSin = await p.evaluate(() => {
    const pu = [...__taller.puestos.values()].find(x => x.quien && x.quien.trabajo);
    if(!pu) return null;
    const id = pu.quien.id;
    /* El reloj de la barra corre de verdad, así que dos pintadas de la MISMA
       pantalla salen distintas si el minuto cambió entre una y otra. Se
       congela para que lo único que se compare sea el dibujo. */
    __taller.congelarReloj('12:34');
    /* Con trabajo, la 0 es el encargo a pantalla completa y la 4 una suya. */
    __taller.verPantalla(id, 4);  const suya1 = __taller.lienzoDe(id);
    __taller.verPantalla(id, 0);  const trabajo = __taller.lienzoDe(id);
    __taller.verPantalla(id, 4);  const suya2 = __taller.lienzoDe(id);
    __taller.congelarReloj(null);
    return { distintos: trabajo !== suya1, vuelveIgual: suya1 === suya2,
             hayTrabajo: !!pu.quien.trabajo, en: pu.quien.trabajo.en };
  });
  ok('con trabajo, la pantalla enseña OTRA cosa que en reposo',
     conSin && conSin.distintos, JSON.stringify(conSin));
  ok('y volver a la misma pantalla la deja EXACTAMENTE igual',
     conSin && conSin.vuelveIgual, JSON.stringify(conSin));


  /* ── LA BARRA QUE NUNCA SE VA ────────────────────────────────────────
     Carlos: «que las pantallas no dejen de mostrar… el chiste es que siga
     viendo el desarrollo de su tarea y me entretenga viendo eso como si
     realmente hicieran algo». O sea: las dos cosas a la vez, no una u otra. */
  const barra = await p.evaluate(() => {
    const pu = [...__taller.puestos.values()].find(x => x.quien && x.quien.trabajo);
    if(!pu) return null;
    const id = pu.quien.id;
    const n = __taller.cuantasPantallas();

    /* Cada lado tiene que dar una imagen DISTINTA: si la de la derecha saliera
       igual que la de arriba sería que el lado no se está aplicando. */
    const porLado = {};
    for(const lado of ['arriba','abajo','izquierda','derecha']){
      __taller.verBarra(id, lado, 5);
      porLado[lado] = __taller.lienzoDe(id);
    }

    /* Y el lado de cada quien no cambia entre pintadas: una barra que se
       cambia de lado sola no es una barra, es un parpadeo. */
    const antes = __taller.ladoDe(id);
    __taller.verPantalla(id, 3); __taller.verPantalla(id, 7);
    const despues = __taller.ladoDe(id);

    /* La barra lleva el trabajo DE VERDAD: si se le quita el trabajo al agente
       y la pantalla no cambia, es que la barra no lo estaba leyendo. */
    __taller.verPantalla(id, 4);
    const conTrabajo = __taller.lienzoDe(id);
    const guardado = pu.quien.trabajo;
    pu.quien.trabajo = null;
    __taller.verPantalla(id, 4);
    const sinTrabajo = __taller.lienzoDe(id);
    pu.quien.trabajo = guardado;

    /* Y con trabajo, la pantalla 0 sigue siendo el encargo a pantalla completa
       —sin barra encima, porque ahí TODO es la barra—. */
    __taller.verPantalla(id, 0);
    const cero = __taller.lienzoDe(id);
    __taller.verPantalla(id, 4);
    const otra = __taller.lienzoDe(id);

    return {
      lados: Object.values(porLado),
      distintos: new Set(Object.values(porLado)).size,
      ladoEstable: antes === despues, lado: antes,
      leeElTrabajo: conTrabajo !== sinTrabajo,
      ceroEsOtraCosa: cero !== otra,
      n,
    };
  });

  ok('la barra se pinta en los cuatro lados, y cada uno se ve distinto',
     barra && barra.distintos === 4, JSON.stringify(barra && barra.distintos));
  ok('el lado de cada agente no se le mueve entre pintadas',
     barra && barra.ladoEstable, barra && barra.lado);
  ok('la barra lee el trabajo DE VERDAD, no un letrero fijo',
     barra && barra.leeElTrabajo);
  ok('y la pantalla 0 sigue siendo el encargo a pantalla completa',
     barra && barra.ceroEsOtraCosa);
  ok('son once pantallas: el trabajo más las diez suyas',
     barra && barra.n === 11, String(barra && barra.n));

  /* Los cuatro lados existen de verdad en el reparto: si `ladoDe` devolviera
     siempre lo mismo, tres cuartas partes del chiste no existirían. */
  const reparto = await p.evaluate(() => {
    const vistos = new Set();
    for(let i = 0; i < 200; i++) vistos.add(__taller.ladoDe('agente-' + i));
    return [...vistos].sort();
  });
  ok('el reparto usa los cuatro lados, incluido el de la derecha',
     reparto.length === 4 && reparto.includes('derecha'), reparto.join(' · '));

  ok('y ni un error en toda la vuelta', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas de los mandos');
process.exit(mal ? 1 : 0);
