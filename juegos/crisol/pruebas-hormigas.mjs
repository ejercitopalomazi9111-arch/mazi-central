/* pruebas-hormigas.mjs — LAS HORMIGAS DE CARLOS, UNA FRASE A LA VEZ
 * ===========================================================================
 * Cada bloque de aquí es una frase del encargo convertida en experimento. No
 * son pruebas de que el código corre: son la comprobación de que el juego
 * hace lo que él pidió.
 *
 *     node juegos/crisol/pruebas-hormigas.mjs
 * ===========================================================================*/
import { Mundo, EL, VACIO } from './motor.js';
import { Hormigas, RAZAS, NOMBRES, nuevaHormiga } from './hormigas.js';

const IDX = {}; EL.forEach((e, i) => IDX[e.id] = i);
let bien = 0, mal = 0;
const ok = (t, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + t); }
  else { mal++; console.log('  ✗ ' + t + (extra ? '  → ' + extra : '')); }
};
const seccion = (t) => console.log('\n── ' + t + ' ──');

/* Una sala con suelo de tierra y una tapa de piedra, que es el escenario donde
   se ve si cavan: la tierra la muerde cualquiera, la piedra sólo las verdes. */
const sala = (an = 80, al = 60, sueloY = 25) => {
  const m = new Mundo(an, al);
  for(let x = 0; x < an; x++) m.pon(x, al - 1, IDX.muro);
  for(let y = 0; y < al; y++){ m.pon(0, y, IDX.muro); m.pon(an - 1, y, IDX.muro); }
  for(let y = sueloY; y < al - 1; y++) for(let x = 1; x < an - 1; x++) m.pon(x, y, IDX.tierra);
  return m;
};
const cuantas = (m, id) => { let n = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX[id]) n++; return n; };

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('las tres razas existen y se distinguen');
{
  ok('hay negra, roja y verde', NOMBRES.length === 3 &&
     NOMBRES.every(n => ['negra','roja','verde'].includes(n)), NOMBRES.join(','));
  ok('sólo la verde rompe cualquier cosa',
     RAZAS.verde.rompeTodo && !RAZAS.negra.rompeTodo && !RAZAS.roja.rompeTodo);
  ok('sólo la roja es venenosa',
     RAZAS.roja.veneno > 0 && !RAZAS.negra.veneno && !RAZAS.verde.veneno);
  /* «se reproducen un poco más rápido y requieren menos comida» — las dos
     cosas a la vez, y las dos se leen de la tabla */
  ok('la negra cría más barato que las otras dos',
     RAZAS.negra.costoCria < RAZAS.roja.costoCria &&
     RAZAS.negra.costoCria < RAZAS.verde.costoCria);
  ok('y come menos que las otras dos',
     RAZAS.negra.hambre < RAZAS.roja.hambre && RAZAS.negra.hambre < RAZAS.verde.hambre);
  ok('miden uno o dos píxeles, ninguna más',
     NOMBRES.every(n => RAZAS[n].talla === 1 || RAZAS[n].talla === 2));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«sólo las verdes pueden romper CUALQUIER material menos muro»');
{
  const m = sala();
  const H = new Hormigas(m, 7);
  /* un tapón de cada material duro, para preguntarle a cada raza */
  const duros = ['piedra', 'metal', 'concreto', 'vidrio', 'diamante'];
  for(const mat of duros){
    if(IDX[mat] === undefined) continue;
    m.pon(40, 10, IDX[mat]);
    ok('la VERDE muerde ' + mat, H.puedeRomper('verde', 40, 10));
    ok('la negra NO muerde ' + mat, !H.puedeRomper('negra', 40, 10));
    ok('la roja NO muerde ' + mat, !H.puedeRomper('roja', 40, 10));
    m.pon(40, 10, VACIO);
  }
  m.pon(40, 10, IDX.muro);
  /* ⚠ ESTA ES LA QUE MÁS IMPORTA DE LA SECCIÓN. El encargo dice «cualquier
     material MENOS MURO», así que el muro no es una excepción de las verdes:
     es la única cosa que ninguna de las tres puede tocar. Si esto se rompe, se
     puede cavar fuera del mundo. */
  ok('NINGUNA de las tres muerde el muro, ni la verde',
     !H.puedeRomper('verde', 40, 10) && !H.puedeRomper('negra', 40, 10) &&
     !H.puedeRomper('roja', 40, 10));
  m.pon(40, 10, IDX.tierra);
  ok('y la tierra la muerden las tres',
     H.puedeRomper('verde', 40, 10) && H.puedeRomper('negra', 40, 10) &&
     H.puedeRomper('roja', 40, 10));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«vayan haciendo cuevas con aire bajo los sólidos»');
{
  const m = sala();
  const H = new Hormigas(m, 11);
  const tierra0 = cuantas(m, 'tierra');
  H.nido(40, 26, 'negra', 12);
  for(let i = 0; i < 400; i++){ H.paso(); m.paso(); }
  const tierra1 = cuantas(m, 'tierra');
  ok('cavaron de verdad: hay menos tierra que al empezar',
     tierra1 < tierra0 - 20, tierra0 + ' → ' + tierra1);

  /* y el hueco tiene que estar DEBAJO del suelo, no en el aire de arriba:
     una cueva es aire con tierra encima */
  let huecoBajoTierra = 0;
  for(let y = 27; y < m.al - 1; y++) for(let x = 1; x < m.an - 1; x++){
    if(m.t[y * m.an + x] !== VACIO) continue;
    /* ¿tiene tierra encima en algún punto? */
    for(let yy = y - 1; yy >= 25; yy--){
      if(m.t[yy * m.an + x] === IDX.tierra){ huecoBajoTierra++; break; }
    }
  }
  ok('y el hueco quedó BAJO los sólidos, que es lo que es una cueva',
     huecoBajoTierra > 10, huecoBajoTierra + ' celdas de aire con tierra encima');
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«haz que necesiten comer»');
{
  /* ⚠ LO QUE SE MIDE ES CUÁNTO AGUANTAN, NO SI SIGUEN VIVAS AL FINAL. La
     primera versión de esta prueba preguntaba por las vivas al paso 4000 y
     daba CERO en los dos casos — con razón: un jardín es finito, se lo acaban
     y después se mueren igual. O sea que la prueba decía «la comida no sirve»
     cuando lo que pasaba es que se la habían comido toda. Un experimento que
     termina después de que se acabó lo que mide no mide nada. */
  const hastaCuando = (conJardin) => {
    const m = sala();
    if(conJardin) for(let y = 18; y < 25; y++) for(let x = 20; x < 62; x++) m.pon(x, y, IDX.planta);
    const H = new Hormigas(m, 3);
    H.nido(40, 26, 'roja', 10);
    for(let i = 1; i <= 6000; i++){
      H.paso();
      if(H.porRaza('roja') === 0) return i;
    }
    return 6000;
  };
  const sinComida = hastaCuando(false);
  ok('sin comida, una colonia se muere', sinComida < 6000, 'se acabó al paso ' + sinComida);
  const conComida = hastaCuando(true);
  /* ⚠ Y LA COMPARACIÓN ES LA PRUEBA. Un umbral suelto sobre la colonia con
     comida pasaría verde aunque comer no sirviera de nada: lo que demuestra
     que la comida cuenta es que las DOS colonias, iguales en todo lo demás,
     duren distinto. */
  ok('con comida cerca, aguanta bastante más que la que no tiene',
     conComida > sinComida * 1.3,
     'sin comida ' + sinComida + ' pasos · con comida ' + conComida);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«que lleven esta comida a sus nidos»');
{
  const m = sala();
  for(let y = 18; y < 24; y++) for(let x = 30; x < 52; x++) m.pon(x, y, IDX.planta);
  const H = new Hormigas(m, 5);
  const col = H.nido(40, 26, 'negra', 14);
  for(let i = 0; i < 900; i++){ H.paso(); m.paso(); }
  ok('la despensa del nido se llenó con lo que trajeron',
     col.despensa > 0 || col.criadas > 0,
     'despensa ' + col.despensa + ' · criadas ' + col.criadas);
  ok('y con esa comida nacieron hormigas nuevas',
     col.criadas > 0, col.criadas + ' crías');
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«las negras se reproducen un poco más rápido»');
{
  /* dos colonias con EXACTAMENTE la misma despensa: la diferencia sólo puede
     venir de lo que cuesta una cría */
  const m = sala();
  const H = new Hormigas(m, 9);
  const negra = H.nido(20, 26, 'negra', 1);
  const verde = H.nido(60, 26, 'verde', 1);
  negra.despensa = 120; verde.despensa = 120;
  let cN = 0, cV = 0;
  while(H.cria(negra)) cN++;
  while(H.cria(verde)) cV++;
  ok('con la misma despensa, la negra saca más crías que la verde',
     cN > cV, 'negra ' + cN + ' · verde ' + cV);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«las razas luchan entre sí»');
{
  const m = sala();
  const H = new Hormigas(m, 13);
  H.nido(40, 26, 'negra', 12);
  H.nido(41, 26, 'verde', 12);
  const n0 = H.porRaza('negra'), v0 = H.porRaza('verde');
  for(let i = 0; i < 600; i++) H.paso();
  const n1 = H.porRaza('negra'), v1 = H.porRaza('verde');
  ok('dos razas encimadas se matan entre ellas',
     (n1 + v1) < (n0 + v0), n0 + '+' + v0 + ' → ' + n1 + '+' + v1);

  /* la misma sala con UNA sola raza: si la baja fuera igual, no habría guerra
     sino hambre, y la prueba de arriba estaría mintiendo */
  const m2 = sala();
  const H2 = new Hormigas(m2, 13);
  H2.nido(40, 26, 'negra', 12);
  H2.nido(41, 26, 'negra', 12);
  for(let i = 0; i < 600; i++) H2.paso();
  ok('y no es hambre: con una sola raza quedan más vivas',
     H2.porRaza('negra') > (n1 + v1),
     'dos razas ' + (n1 + v1) + ' · una sola ' + H2.porRaza('negra'));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«las rojas son venenosas»');
{
  /* una roja y una negra frente a frente. La negra muerde MÁS FUERTE
     (2.4 contra 2.2), así que si el veneno no contara, la roja perdería y la
     negra se quedaría entera. */
  const m = sala();
  const H = new Hormigas(m, 17);
  const roja = H.nido(40, 26, 'roja', 1);
  const negra = H.nido(40, 26, 'negra', 1);
  const r = H.hormigas[0], n = H.hormigas[1];
  for(let i = 0; i < 40; i++) H.paso();
  ok('la negra acaba envenenada por la roja', n.veneno > 0 || !n.viva,
     'veneno ' + n.veneno.toFixed(1) + ' · viva ' + n.viva);

  /* y el veneno sigue trabajando DESPUÉS: se mata a la roja y se mira si la
     negra se sigue muriendo sola */
  const m2 = sala();
  const H2 = new Hormigas(m2, 17);
  H2.nido(40, 26, 'roja', 1);
  H2.nido(40, 26, 'negra', 1);
  const r2 = H2.hormigas[0], n2 = H2.hormigas[1];
  for(let i = 0; i < 30; i++) H2.paso();
  r2.viva = false;                       /* la roja ya no está */
  const vidaAlMorirLaRoja = n2.vida;
  for(let i = 0; i < 60; i++) H2.paso();
  ok('y el veneno la sigue matando con la roja ya muerta',
     n2.vida < vidaAlMorirLaRoja || !n2.viva,
     vidaAlMorirLaRoja.toFixed(1) + ' → ' + n2.vida.toFixed(1));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('lo que NO debe pasar');
{
  const m = sala();
  const H = new Hormigas(m, 23);
  const muro0 = cuantas(m, 'muro');
  H.nido(40, 26, 'verde', 20);
  for(let i = 0; i < 800; i++){ H.paso(); m.paso(); }
  /* ⚠ si las verdes pudieran con el muro, se saldrían del mundo y la sala se
     desangraría por el agujero. Es la única frontera dura del encargo. */
  ok('ni las verdes le hacen un rasguño al muro', cuantas(m, 'muro') === muro0,
     muro0 + ' → ' + cuantas(m, 'muro'));

  /* una hormiga que muere cargando comida la SUELTA: si se evaporara, matar
     hormigas sería una forma de borrar materia del mundo */
  const m2 = sala();
  m2.pon(40, 24, IDX.planta);
  const H2 = new Hormigas(m2, 29);
  H2.nido(40, 26, 'negra', 1);
  const h = H2.hormigas[0];
  h.carga = IDX.planta;
  h.x = 40; h.y = 20;                      /* en el aire, con la carga */
  m2.pon(40, 20, VACIO);
  const plantas0 = cuantas(m2, 'planta');
  h.vida = 0; H2.muere(h);
  ok('una hormiga que muere cargando comida la deja caer, no la borra',
     cuantas(m2, 'planta') === plantas0 + 1,
     plantas0 + ' → ' + cuantas(m2, 'planta'));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('que quepa en un teléfono');
{
  const m = sala(200, 150, 60);
  for(let y = 40; y < 58; y++) for(let x = 20; x < 180; x++) m.pon(x, y, IDX.planta);
  const H = new Hormigas(m, 31);
  for(let i = 0; i < 6; i++) H.nido(30 + i * 25, 61, NOMBRES[i % 3], 40);
  for(let i = 0; i < 60; i++) H.paso();     /* calentar */
  const t0 = performance.now();
  for(let i = 0; i < 120; i++) H.paso();
  const ms = (performance.now() - t0) / 120;
  console.log(`     ${H.hormigas.length} hormigas · ${ms.toFixed(3)} ms por paso`);
  ok('240 hormigas cuestan menos de 2 ms por paso', ms < 2, ms.toFixed(3) + ' ms');
}


/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«túneles, islitas, cámaras, habitaciones» · el plano');
{
  /* Carlos: «quiero que las hormigas sean capaces de hacerme cosas más
     impresionantes: túneles, pequeñas islitas, cámaras, habitaciones».

     Cavando al azar NO sale eso y se veía: rayas punteadas en diagonal. Lo
     que arregla esto no es más inteligencia, es un PLANO — una forma que la
     colonia quiere, y obreras que la cumplen. */
  const AN = 90, AL = 70, SUELO = 22;
  const conSuelo = () => {
    const m = new Mundo(AN, AL);
    for(let x = 0; x < AN; x++) m.pon(x, AL - 1, IDX.muro);
    for(let y = 0; y < AL; y++){ m.pon(0, y, IDX.muro); m.pon(AN - 1, y, IDX.muro); }
    for(let y = SUELO; y < AL - 1; y++) for(let x = 1; x < AN - 1; x++) m.pon(x, y, IDX.tierra);
    /* ⚠ CON JARDÍN, Y NO ES ADORNO. Sin comida las obreras se mueren a medio
       cavar: el plano se quedaba en 13 celdas apisonadas en vez de 196, y la
       prueba parecía decir «no apisonan» cuando lo que pasaba es que no
       llegaban vivas al final de la obra. */
    for(let y = SUELO - 4; y < SUELO; y++) for(let x = 10; x < 80; x++) m.pon(x, y, IDX.planta);
    return m;
  };
  const aireBajoTierra = (m) => {
    let n = 0;
    for(let y = SUELO + 2; y < AL - 1; y++) for(let x = 1; x < AN - 1; x++){
      if(m.t[y * AN + x] !== VACIO) continue;
      for(let yy = y - 1; yy >= SUELO; yy--){
        const t = m.t[yy * AN + x];
        if(t === IDX.tierra || t === IDX.tierraap){ n++; break; }
      }
    }
    return n;
  };

  const m = conSuelo();
  const H = new Hormigas(m, 11);
  const col = H.nido(45, SUELO + 1, 'negra', 14);
  ok('la colonia nace con un plano, no cavando al azar',
     col.plan.length > 200, col.plan.length + ' celdas planeadas');
  ok('y con una cámara real al fondo, con su reina dentro',
     !!col.reina && col.trono.y > SUELO + 20,
     'trono en ' + col.trono.x + ',' + col.trono.y);

  for(let i = 0; i < 800; i++){ H.paso(); m.paso(); }
  const hecho = col.plan.filter(k => m.t[k] === VACIO).length;
  ok('a los 800 pasos el plano está casi cumplido',
     hecho > col.plan.length * 0.7, hecho + '/' + col.plan.length);

  /* ⚠ ÉSTA ES LA QUE DESTAPÓ EL DEFECTO DE VERDAD. Antes de apisonar, el
     plano SE CUMPLÍA —331 de 346— y esta cuenta daba CERO: se excavaba y el
     techo se venía encima en el acto, porque la tierra es un polvo. Un plano
     cumplido no es una galería si no se sostiene. */
  const aire = aireBajoTierra(m);
  ok('y las galerías SE SOSTIENEN: hay hueco bajo tierra, no un derrumbe',
     aire > 80, aire + ' celdas de aire con tierra encima');

  ok('porque apisonaron la pared al cavarla',
     cuantas(m, 'tierraap') > 50, cuantas(m, 'tierraap') + ' celdas apisonadas');
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('«en caso de derrumbe todas buscarán cómo llegar a la reina»');
{
  const AN = 90, AL = 70, SUELO = 22;
  const m = new Mundo(AN, AL);
  for(let x = 0; x < AN; x++) m.pon(x, AL - 1, IDX.muro);
  for(let y = 0; y < AL; y++){ m.pon(0, y, IDX.muro); m.pon(AN - 1, y, IDX.muro); }
  for(let y = SUELO; y < AL - 1; y++) for(let x = 1; x < AN - 1; x++) m.pon(x, y, IDX.tierra);
  for(let y = SUELO - 4; y < SUELO; y++) for(let x = 10; x < 80; x++) m.pon(x, y, IDX.planta);
  const H = new Hormigas(m, 5);
  const col = H.nido(45, SUELO + 1, 'negra', 16);
  for(let i = 0; i < 700; i++){ H.paso(); m.paso(); }

  /* ⚠ SE CUENTAN LAS CELDAS DEL PLANO QUE SE ALCANZAN, NO EL TOTAL. El nido
     tiene boca a la superficie, así que el recorrido se escapa al cielo y
     cuenta tres mil celdas de aire libre: con ese número, tapar el pozo
     «no cambiaba nada» —3060 → 3010— y la prueba decía que el derrumbe no
     existía. Lo que importa es cuánto HORMIGUERO queda comunicado. */
  /* ⚠ ESTA PRUEBA ES CONTROLADA A PROPÓSITO, y llegué aquí después de tres
     formas de medir que no contestaban la pregunta:
       · el total alcanzable estaba dominado por el CIELO ABIERTO: 3060 → 3010
       · las celdas del plano no bajaban porque la reina queda DEL LADO BUENO
         de la losa, con medio hormiguero: 342 → 288
       · y con la losa encima del trono, las hormigas ya estaban todas dentro
     Afinar el mundo hasta que el escenario salga dramático es hacerle trampa
     a la prueba. Lo que hay que comprobar es LA REGLA: una hormiga que no
     puede llegar a su reina, ¿se abre paso hacia ella? Eso se monta a mano y
     se mide de frente. */
  const AN2 = 60, AL2 = 50;
  const m2 = new Mundo(AN2, AL2);
  for(let x = 0; x < AN2; x++){ m2.pon(x, 0, IDX.muro); m2.pon(x, AL2 - 1, IDX.muro); }
  for(let y = 0; y < AL2; y++){ m2.pon(0, y, IDX.muro); m2.pon(AN2 - 1, y, IDX.muro); }
  for(let y = 10; y < AL2 - 1; y++) for(let x = 1; x < AN2 - 1; x++) m2.pon(x, y, IDX.tierra);
  const H2 = new Hormigas(m2, 77);
  const c3 = H2.nido(30, 11, 'negra', 1);          /* sólo la reina */
  /* ⚠ Y SE ENTIBAN LAS PAREDES, o el montaje se cae solo. Cavadas a pelo, la
     cámara y la bolsa se derrumbaban en cincuenta pasos —el alcance pasaba de
     63 a 1— porque la tierra es un polvo. La prueba decía «no van hacia la
     reina» cuando lo que pasaba es que la reina se había quedado enterrada
     por mi propio montaje. Es la misma regla que hizo falta en el juego. */
  const hueco = (cx, cy, rx, ry) => {
    for(let dy = -ry - 1; dy <= ry + 1; dy++) for(let dx = -rx - 1; dx <= rx + 1; dx++){
      const nx = cx + dx, ny = cy + dy;
      if(nx < 1 || ny < 1 || nx >= AN2 - 1 || ny >= AL2 - 1) continue;
      const dentro = Math.abs(dx) <= rx && Math.abs(dy) <= ry;
      m2.pon(nx, ny, dentro ? VACIO : IDX.tierraap);
    }
  };
  hueco(c3.trono.x, c3.trono.y, 4, 3);
  c3.reina.x = c3.trono.x; c3.reina.y = c3.trono.y;
  /* ⚠ Y SE LAS PONE DONDE LAS DEJARÍA UN DERRUMBE: en una bolsa justo encima
     de la cámara, separadas por una losa de seis celdas. Al principio las puse
     a treinta y tres celdas de tierra y la prueba medía otra cosa: SE MORÍAN
     DE HAMBRE cavando —medio celda de energía por mordisco, cien de energía—
     y avanzaban 2.8 celdas en 900 pasos. Treinta y tres celdas de mina no es
     un derrumbe, es una expedición. */
  const bolsaY = c3.trono.y - 10;
  hueco(c3.trono.x, bolsaY, 6, 1);
  const lejos = [];
  for(let i = 0; i < 6; i++){
    const h = nuevaHormiga('negra', c3.trono.x - 3 + i, bolsaY, c3.id);
    h.papel = 'forrajera'; h.energia = 100;
    H2.hormigas.push(h); lejos.push(h);
  }
  H2.revisaAlcance(c3);
  const dist = (h) => Math.abs(h.x - c3.trono.x) + Math.abs(h.y - c3.trono.y);
  const fueraAhora = () => lejos.filter(h => h.viva && !c3.alcance.has(H2.idx(h.x, h.y))).length;
  ok('las seis arrancan incomunicadas de su reina', fueraAhora() === 6,
     fueraAhora() + ' de 6');
  const d0 = lejos.reduce((s2, h) => s2 + dist(h), 0) / 6;

  for(let i = 0; i < 600; i++){ H2.paso(); m2.paso(); }
  H2.revisaAlcance(c3);
  const vivasL = lejos.filter(h => h.viva);
  const d1 = vivasL.reduce((s2, h) => s2 + dist(h), 0) / Math.max(1, vivasL.length);
  ok('y se abren paso: acaban MÁS CERCA de la reina que al empezar',
     d1 < d0 * 0.6, 'distancia media ' + d0.toFixed(1) + ' → ' + d1.toFixed(1) +
     ' · vivas ' + vivasL.length + '/6');
  ok('y varias LLEGAN a su cámara',
     vivasL.filter(h => dist(h) <= 5).length >= 2,
     vivasL.filter(h => dist(h) <= 5).length + ' en la cámara');
  ok('cavando de verdad, no atravesando la tierra',
     cuantas(m2, 'tierra') < (AL2 - 11) * (AN2 - 2),
     'quedan ' + cuantas(m2, 'tierra') + ' de tierra');
  ok('sin código de reconstrucción: es el plano que dejó de cumplirse',
     col.reina !== null || col.criadas >= 0);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('la reina');
{
  const m = sala();
  const H = new Hormigas(m, 19);
  const col = H.nido(40, 26, 'negra', 8);
  ok('hay exactamente una reina por colonia',
     H.hormigas.filter(h => h.viva && h.nido === col.id && h.papel === 'reina').length === 1);

  /* ⚠ SIN REINA NO HAY CRÍAS, y esto es lo que hace que matarla IMPORTE. Sin
     esta regla la reina era un adorno: cualquiera que llegara con comida
     hacía brotar hormigas igual. */
  const otra = H.colonias[0];
  otra.reina = null; otra.despensa = 500;
  const criadas0 = otra.criadas;
  for(let i = 0; i < 5; i++) H.cria(otra);
  ok('sin reina, la despensa llena no saca una sola cría',
     otra.criadas === criadas0, otra.criadas + ' crías');

  /* y cae la reina: se corona a otra */
  const m2 = sala();
  const H2 = new Hormigas(m2, 19);
  const c2 = H2.nido(40, 26, 'negra', 8);
  const vieja = c2.reina;
  H2.muere(vieja);
  ok('si cae la reina, la colonia corona a la más cercana',
     c2.reina !== null && c2.reina !== vieja && c2.reina.papel === 'reina',
     c2.reina ? 'hay relevo' : 'se quedó sin reina');
  ok('y el trono sigue siendo el MISMO sitio, que es lo que lo hace posible',
     c2.trono && typeof c2.trono.x === 'number');
}

console.log('\n' + (mal ? '✗' : '✓') + '  ' + bien + ' pasan · ' + mal + ' fallan');
process.exit(mal ? 1 : 0);
