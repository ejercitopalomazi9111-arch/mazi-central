#!/usr/bin/env node
/* Pruebas del motor de CRISOL. Corren sin navegador: la simulación es
   determinista a propósito (azar propio con semilla), así que un
   comportamiento que aparece una vez se puede volver a provocar.

   ⚠ Esto prueba EL MOTOR, no el juego. Ya nos pasó en Guerra de Puercos que
   las 74 del motor pasaban con la pantalla muerta. La pantalla va aparte. */
import { Mundo, IDX, EL, VACIO } from './motor.js';

let bien = 0, mal = 0;
const ok = (t, c, det) => { c ? bien++ : mal++;
  console.log((c ? '  ✓ ' : '  ✗ ') + t + (det != null && !c ? '  → ' + det : '')); };
const seccion = t => console.log('\n── ' + t + ' ──');

const mundo = (an = 40, al = 40, s = 7) => { const m = new Mundo(an, al); m.semilla(s); return m; };
const corre = (m, n) => { for(let i = 0; i < n; i++) m.paso(); return m; };
/* Un CRISOL de muros. Cinco de mis primeras pruebas fallaron por no tenerlo:
   medía reacciones sobre líquidos que se habían escurrido fuera de cuadro, y
   el motor salía culpable de la gravedad. */
const crisol = (m, x0, y0, x1, y1) => {
  for(let x = x0; x <= x1; x++){ m.pon(x, y1, IDX.muro); m.pon(x, y0, IDX.muro); }
  for(let y = y0; y <= y1; y++){ m.pon(x0, y, IDX.muro); m.pon(x1, y, IDX.muro); }
};
/* Una REPISA de muro bajo una fila. Desde que los sólidos caen, un circuito
   pintado en el aire se desploma — que es lo que Carlos pidió y lo correcto—,
   así que las pruebas de electrónica se construyen apoyadas, como se construye
   de verdad. Sin esto medían electricidad sobre cables que iban cayéndose. */
const repisa = (m, y, x0 = 0, x1 = m.an - 1) => { for(let x = x0; x <= x1; x++) m.pon(x, y, IDX.muro); };
const cuantos = (m, id) => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX[id]) c++; return c; };

seccion('la gravedad y los estados');
{
  const m = mundo();
  m.pon(20, 5, IDX.arena);
  corre(m, 60);
  ok('la arena cae hasta el suelo', m.t[m.i(20, 39)] === IDX.arena,
     'quedó en y=' + (() => { for(let y=0;y<40;y++) if(m.t[m.i(20,y)]===IDX.arena) return y; return '?'; })());

  /* ⚠ ESTA PRUEBA AFIRMABA LO CONTRARIO Y ESTABA BIEN EN SU MOMENTO: antes un
     sólido era un decorado clavado en su celda. Carlos pidió que dejara de
     serlo —«que puedan moverse caerse etc no solo el polvo y el gas»— así que
     ahora se comprueba lo de verdad: sin sostén se cae, y apoyada se queda. */
  const p = mundo();
  p.pon(20, 5, IDX.piedra);
  corre(p, 60);
  ok('una piedra sin sostén SE CAE', p.t[p.i(20, 5)] !== IDX.piedra);
  ok('y llega al suelo', p.t[p.i(20, 39)] === IDX.piedra);

  const q = mundo();
  repisa(q, 20);
  q.pon(20, 19, IDX.piedra);
  corre(q, 60);
  ok('pero apoyada en un muro se queda', q.t[q.i(20, 19)] === IDX.piedra);

  const arco = mundo();
  repisa(arco, 30);
  for(let y = 10; y < 30; y++){ arco.pon(5, y, IDX.piedra); arco.pon(34, y, IDX.piedra); }
  for(let x = 5; x <= 34; x++) arco.pon(x, 10, IDX.piedra);   /* el puente */
  corre(arco, 80);
  let puente = 0;
  for(let x = 5; x <= 34; x++) if(arco.t[arco.i(x, 10)] === IDX.piedra) puente++;
  ok('y un PUENTE colgado entre dos pilares aguanta', puente === 30, puente + '/30 celdas');

  const g = mundo();
  g.pon(20, 30, IDX.humo);
  corre(g, 40);
  let subio = false;
  for(let y = 0; y < 30; y++) for(let x = 0; x < 40; x++) if(g.t[g.i(x,y)] === IDX.humo) subio = true;
  ok('el humo sube', subio);
}

seccion('los líquidos se esparcen, no se apilan');
{
  const m = mundo(41, 20);
  /* ⚠ aquí ponía 60 veces agua en la MISMA celda y luego me quejaba de que
     el ancho era 1. Una celda no se extiende: es una celda. */
  for(let y = 2; y < 8; y++) for(let x = 19; x < 22; x++) m.pon(x, y, IDX.agua);
  corre(m, 160);
  let ancho = 0, min = 99, max = -1;
  for(let x = 0; x < 41; x++) for(let y = 0; y < 20; y++)
    if(m.t[m.i(x,y)] === IDX.agua){ if(x<min)min=x; if(x>max)max=x; }
  ancho = max - min + 1;
  ok('el agua se extiende a lo ancho', ancho > 8, 'ancho ' + ancho);
}

seccion('la densidad decide quién flota');
{
  const m = mundo(20, 30);
  for(let y = 10; y < 20; y++) for(let x = 5; x < 15; x++) m.pon(x, y, IDX.agua);
  for(let x = 5; x < 15; x++) m.pon(x, 9, IDX.aceite);
  corre(m, 200);
  let yAceite = 0, nA = 0, yAgua = 0, nB = 0;
  for(let y = 0; y < 30; y++) for(let x = 0; x < 20; x++){
    if(m.t[m.i(x,y)] === IDX.aceite){ yAceite += y; nA++; }
    if(m.t[m.i(x,y)] === IDX.agua){ yAgua += y; nB++; }
  }
  ok('el aceite queda ENCIMA del agua', nA && nB && (yAceite/nA) < (yAgua/nB),
     'aceite y≈' + (yAceite/nA).toFixed(1) + ' · agua y≈' + (yAgua/nB).toFixed(1));
}

seccion('termodinámica de verdad');
{
  const m = mundo(20, 20);
  for(let x = 5; x < 15; x++) m.pon(x, 18, IDX.hielo);
  for(let x = 5; x < 15; x++) m.pon(x, 10, IDX.lava);
  corre(m, 80);
  ok('la lava derrite el hielo', cuantos(m, 'hielo') < 10, 'quedan ' + cuantos(m,'hielo'));

  const a = mundo(20, 20);
  for(let x = 4; x < 16; x++) a.pon(x, 15, IDX.agua);
  a.pon(10, 16, IDX.lava);
  corre(a, 60);
  ok('lava + agua da piedra y vapor',
     cuantos(a,'piedra') > 0 || cuantos(a,'vapor') > 0,
     'piedra ' + cuantos(a,'piedra') + ' vapor ' + cuantos(a,'vapor'));

  /* ⚠ ESTA PRUEBA ESTABA MAL Y EL MOTOR BIEN. Medía `vidrio` a los 4 pasos y
     a 1800° el vidrio YA ESTÁ FUNDIDO — se hacía vidrio en el paso 1, se
     fundía en el 2 y se escurría en el 3, exactamente como en la vida real.
     La cadena de verdad es arena →1700° vidrio →1500° fundido →enfría→ vidrio,
     y para verla hace falta un recipiente y dejar que se enfríe. */
  const v = mundo(14, 20);
  crisol(v, 3, 8, 11, 15);
  for(let x = 4; x < 11; x++) for(let y = 12; y < 15; y++) v.pon(x, y, IDX.arena);
  for(let k = 0; k < v.t.length; k++) if(v.t[k] === IDX.arena) v.temp[k] = 1850;
  corre(v, 3);
  const fundido = cuantos(v, 'vidfun') + cuantos(v, 'vidrio');
  corre(v, 400);   /* que se enfríe */
  ok('la arena caliente se hace vidrio, se funde y al enfriar vuelve a vidrio',
     fundido > 0 && cuantos(v, 'vidrio') > 0,
     'al calentar ' + fundido + ' · al enfriar ' + cuantos(v,'vidrio') + ' de vidrio');

  const h = mundo(14, 14);
  for(let x = 3; x < 11; x++) h.pon(x, 12, IDX.agua);
  for(let k = 0; k < h.t.length; k++) if(h.t[k] === IDX.agua) h.temp[k] = 130;
  corre(h, 4);
  ok('el agua a 130° hierve', cuantos(h, 'vapor') > 0, cuantos(h,'vapor') + ' de vapor');
}

seccion('química');
{
  const m = mundo(20, 20);
  for(let x = 5; x < 15; x++){ m.pon(x, 15, IDX.agua); m.pon(x, 14, IDX.sal); }
  corre(m, 120);
  ok('sal + agua da agua salada', cuantos(m, 'salada') > 0, cuantos(m,'salada') + ' celdas');

  const a = mundo(20, 20);
  for(let y = 10; y < 14; y++) for(let x = 5; x < 15; x++) a.pon(x, y, IDX.piedra);
  for(let x = 6; x < 14; x++) a.pon(x, 9, IDX.acido);
  const antes = cuantos(a, 'piedra');
  corre(a, 200);
  ok('el ácido se come la piedra', cuantos(a, 'piedra') < antes,
     antes + ' → ' + cuantos(a, 'piedra'));

  const c = mundo(20, 20);
  for(let y = 12; y < 16; y++) for(let x = 5; x < 15; x++) c.pon(x, y, IDX.cemento);
  for(let x = 5; x < 15; x++) c.pon(x, 11, IDX.agua);
  corre(c, 150);
  ok('cemento + agua da concreto', cuantos(c, 'concreto') > 0, cuantos(c,'concreto') + ' celdas');
}

seccion('fuego y explosiones');
{
  /* ⚠ antes ponía el aceite flotando y el fuego encima: el aceite caía al
     suelo, el fuego subía, y no se tocaban en ningún momento. Medía la
     gravedad creyendo que medía la combustión. */
  const m = mundo(24, 24);
  crisol(m, 3, 14, 20, 22);
  for(let y = 18; y < 22; y++) for(let x = 4; x < 20; x++) m.pon(x, y, IDX.aceite);
  const antesAceite = cuantos(m, 'aceite');
  m.pon(12, 17, IDX.fuego);
  corre(m, 120);
  ok('el fuego se propaga por el aceite', cuantos(m, 'aceite') < antesAceite,
     antesAceite + ' → ' + cuantos(m,'aceite'));

  const p = mundo(40, 40);
  for(let y = 18; y < 22; y++) for(let x = 18; x < 22; x++) p.pon(x, y, IDX.polvora);
  for(let y = 10; y < 30; y++) for(let x = 10; x < 30; x++)
    if(p.t[p.i(x,y)] === VACIO) p.pon(x, y, IDX.madera);
  const maderaAntes = cuantos(p, 'madera');
  p.pon(20, 17, IDX.fuego);
  corre(p, 80);
  ok('la pólvora explota y destruye alrededor', cuantos(p, 'madera') < maderaAntes,
     maderaAntes + ' → ' + cuantos(p, 'madera'));

  const n = mundo(20, 20);
  for(let x = 5; x < 15; x++) n.pon(x, 18, IDX.madera);
  corre(n, 200);
  ok('la madera NO arde sola', cuantos(n, 'madera') === 10, cuantos(n,'madera') + '/10');
}

seccion('electricidad');
{
  const m = mundo(20, 10);
  repisa(m, 6);
  m.pon(2, 5, IDX.bateria);
  for(let x = 3; x < 15; x++) m.pon(x, 5, IDX.cobre);
  m.pon(15, 5, IDX.lampara);
  corre(m, 25);
  ok('la corriente recorre el cable y enciende la lámpara', m.car[m.i(15,5)] === 1);

  const a = mundo(20, 10);
  a.pon(2, 5, IDX.bateria);
  for(let x = 3; x < 8; x++) a.pon(x, 5, IDX.cobre);
  a.pon(8, 5, IDX.aislante);
  for(let x = 9; x < 15; x++) a.pon(x, 5, IDX.cobre);
  a.pon(15, 5, IDX.lampara);
  corre(a, 25);
  ok('un aislante corta la corriente', a.car[a.i(15,5)] === 0);

  const n = mundo(20, 10);
  n.pon(2, 5, IDX.bateria);
  n.pon(3, 5, IDX.cobre);
  n.pon(4, 5, IDX.gNOT);
  n.pon(5, 5, IDX.cobre);
  corre(n, 30);
  ok('la compuerta NO invierte la señal', n.car[n.i(5,5)] === 0,
     'salida ' + n.car[n.i(5,5)]);

  /* ⚠ el agua salada es LÍQUIDA: en la versión anterior se escurría del cable
     antes de que llegara la corriente. Va en un canal de muro. */
  const s = mundo(20, 12);
  for(let x = 7; x < 15; x++){ s.pon(x, 4, IDX.muro); s.pon(x, 6, IDX.muro); }
  s.pon(2, 5, IDX.bateria);
  for(let x = 3; x < 8; x++) s.pon(x, 5, IDX.cobre);
  for(let x = 8; x < 14; x++) s.pon(x, 5, IDX.salada);
  s.pon(14, 5, IDX.lampara);
  corre(s, 60);
  let llego = false;
  for(let i = 0; i < 60; i++){ s.paso(); if(s.car[s.i(14,5)]) { llego = true; break; } }
  ok('el agua SALADA conduce la corriente', llego);

  const d = mundo(20, 12);
  for(let x = 7; x < 15; x++){ d.pon(x, 4, IDX.muro); d.pon(x, 6, IDX.muro); }
  d.pon(2, 5, IDX.bateria);
  for(let x = 3; x < 8; x++) d.pon(x, 5, IDX.cobre);
  for(let x = 8; x < 14; x++) d.pon(x, 5, IDX.aceite);
  d.pon(14, 5, IDX.lampara);
  let llegoAceite = false;
  for(let i = 0; i < 80; i++){ d.paso(); if(d.car[d.i(14,5)]) { llegoAceite = true; break; } }
  ok('y el aceite NO — si conduce todo, no hay circuito que valga', !llegoAceite);
}

seccion('la mochila: se descubre lo que se LOGRA, no lo que se pinta');
{
  /* ⚠ antes esta prueba usaba el agua y fallaba con razón: el agua SÍ nace
     sola, del vapor que se condensa. No era un fallo de la mochila, era que
     escogí el peor testigo posible. */
  const q = mundo(20, 20);
  for(let y = 14; y < 18; y++) for(let x = 5; x < 15; x++) q.pon(x, y, IDX.arena);
  corre(q, 40);
  ok('pintar arena y dejarla caer NO cuenta como descubrimiento',
     !q.nacidos.arena, JSON.stringify(q.nacidos));

  const m = mundo(20, 20);
  for(let x = 5; x < 15; x++) m.pon(x, 15, IDX.agua);
  m.pon(10, 16, IDX.lava);
  corre(m, 60);
  ok('pero lo que NACE de una reacción sí se cuenta',
     !!(m.nacidos.piedra || m.nacidos.vapor), JSON.stringify(m.nacidos));
}

seccion('determinismo: sin esto ninguna prueba de simulación vale');
{
  const a = mundo(30, 30, 42), b = mundo(30, 30, 42);
  for(const m of [a, b]){
    for(let x = 5; x < 25; x++) m.pon(x, 5, IDX.arena);
    for(let x = 5; x < 25; x++) m.pon(x, 10, IDX.agua);
    corre(m, 100);
  }
  let iguales = true;
  for(let k = 0; k < a.t.length; k++) if(a.t[k] !== b.t[k]) { iguales = false; break; }
  ok('dos mundos con la misma semilla acaban idénticos', iguales);

  /* ⚠ antes comparaba arena y agua asentadas, que CONVERGEN al mismo montón
     con cualquier semilla — la prueba decía «el azar no funciona» cuando lo
     que pasaba es que el escenario no tenía nada de azaroso. Hace falta algo
     caótico: fuego. */
  const caos = (s) => {
    const m = mundo(30, 30, s);
    for(let y = 20; y < 26; y++) for(let x = 6; x < 24; x++) m.pon(x, y, IDX.aceite);
    m.pon(15, 19, IDX.fuego);
    return corre(m, 60);
  };
  const c1 = caos(42), c2 = caos(999);
  let distinto = false;
  for(let k = 0; k < c1.t.length; k++) if(c1.t[k] !== c2.t[k]) { distinto = true; break; }
  ok('y con otra semilla, distintos (el azar es azar)', distinto);
}

seccion('nada se rompe ni se desborda');
{
  const m = mundo(60, 60, 3);
  const ids = Object.keys(IDX);
  for(let i = 0; i < 900; i++){
    const x = (m.rnd()*60)|0, y = (m.rnd()*60)|0;
    m.pon(x, y, IDX[ids[(m.rnd()*ids.length)|0]]);
  }
  let revento = null;
  try { corre(m, 240); } catch(e){ revento = e.message; }
  ok('240 pasos con TODOS los elementos revueltos sin reventar', !revento, revento);
  let malos = 0;
  for(let k = 0; k < m.t.length; k++){
    if(m.t[k] >= EL.length) malos++;
    if(!isFinite(m.temp[k])) malos++;
  }
  ok('ningún tipo inválido y ninguna temperatura NaN o infinita', malos === 0, malos + ' celdas malas');
}

seccion('física nueva: velocidad, presión y golpe');
{
  /* Lo que pidió Carlos con todas sus letras: una columna cae JUNTA, no se
     desmorona de abajo hacia arriba. Se mide el ALTO del bloque: si se
     estira, es que cada partícula está cayendo por su cuenta. */
  const m = mundo(20, 60);
  for(let y = 4; y < 12; y++) for(let x = 8; x < 12; x++) m.pon(x, y, IDX.arena);
  const altoDe = () => { let a = 99, b = -1;
    for(let y = 0; y < 60; y++) for(let x = 0; x < 20; x++)
      if(m.t[m.i(x,y)] === IDX.arena){ if(y<a)a=y; if(y>b)b=y; }
    return b - a + 1; };
  const antes = altoDe();
  corre(m, 6);
  const durante = altoDe();
  ok('una columna en el aire cae JUNTA, sin estirarse',
     durante <= antes + 1, 'alto ' + antes + ' → ' + durante);

  const v = mundo(20, 60);
  v.pon(10, 2, IDX.arena);
  let y1 = 0, y2 = 0;
  for(let i = 0; i < 6; i++) v.paso();
  for(let y = 0; y < 60; y++) if(v.t[v.i(10,y)] === IDX.arena) y1 = y;
  for(let i = 0; i < 6; i++) v.paso();
  for(let y = 0; y < 60; y++) if(v.t[v.i(10,y)] === IDX.arena) y2 = y;
  ok('y ACELERA: el segundo tramo es más largo que el primero',
     (y2 - y1) > y1 - 2, 'primeros 6 pasos ' + (y1-2) + ' celdas · siguientes 6 ' + (y2-y1));
}

seccion('la explosión es una ONDA, no un parpadeo');
{
  const m = mundo(60, 60, 5);
  for(let y = 30; y < 34; y++) for(let x = 28; x < 32; x++) m.pon(x, y, IDX.polvora);
  m.pon(30, 29, IDX.fuego);
  let picoPresion = 0, cuandoPico = -1, radioMax = 0;
  for(let i = 0; i < 40; i++){
    m.paso();
    let p = 0, r = 0;
    for(let y = 0; y < 60; y++) for(let x = 0; x < 60; x++){
      const k = m.i(x,y);
      if(m.pres[k] > p) p = m.pres[k];
      if(m.pres[k] > 4){ const d = Math.hypot(x-30, y-31); if(d > r) r = d; }
    }
    if(p > picoPresion){ picoPresion = p; cuandoPico = i; }
    if(r > radioMax) radioMax = r;
  }
  ok('la explosión genera presión de verdad', picoPresion > 20, 'pico ' + picoPresion.toFixed(0));
  ok('y la onda se EXPANDE varias celdas', radioMax > 5, 'radio ' + radioMax.toFixed(1));

  /* que la presión se calme: una onda que no decae es un motor atascado */
  for(let i = 0; i < 300; i++) m.paso();
  let queda = 0;
  for(let k = 0; k < m.pres.length; k++) if(m.pres[k] > 2) queda++;
  ok('y después se calma sola', queda < 20, queda + ' celdas siguen presurizadas');
}

seccion('la nitro ya no explota nada más ponerla');
{
  const m = mundo(24, 24, 11);
  crisol(m, 4, 14, 20, 22);
  for(let x = 6; x < 18; x++) for(let y = 19; y < 22; y++) m.pon(x, y, IDX.nitro);
  const antes = cuantos(m, 'nitro');
  corre(m, 400);
  ok('puesta en reposo, aguanta 400 pasos sin detonar',
     cuantos(m, 'nitro') >= antes - 2, antes + ' → ' + cuantos(m, 'nitro'));

  /* pero SÍ detona por golpe */
  const g = mundo(30, 60, 3);
  for(let x = 12; x < 18; x++) g.pon(x, 55, IDX.nitro);
  /* ⚠ antes usaba PIEDRA, que es sólida y NO CAE: la prueba medía una roca
     flotando y culpaba a la nitro. La grava sí cae. */
  for(let x = 12; x < 18; x++) for(let y = 2; y < 6; y++) g.pon(x, y, IDX.grava);
  corre(g, 120);
  ok('pero le tiras grava desde alto y SÍ revienta',
     cuantos(g, 'nitro') < 6, 'quedan ' + cuantos(g, 'nitro') + ' de 6');
}

seccion('gas DENTRO del agua');
{
  const m = mundo(24, 30, 9);
  crisol(m, 4, 6, 20, 26);
  for(let y = 10; y < 26; y++) for(let x = 5; x < 20; x++) m.pon(x, y, IDX.agua);
  /* meter gas en el FONDO del agua, que antes era imposible */
  for(let x = 10; x < 14; x++) m.pon(x, 24, IDX.gasnat);
  let subio = false;
  for(let i = 0; i < 90; i++){
    m.paso();
    for(let x = 5; x < 20; x++) if(m.t[m.i(x, 12)] === IDX.gasnat) subio = true;
    if(subio) break;
  }
  ok('el gas metido en el fondo BURBUJEA hacia arriba', subio);
}

seccion('electrónica que se puede OPERAR');
{
  /* interruptor: lo que faltaba para poder encender algo a voluntad */
  const m = mundo(20, 10);
  repisa(m, 6);
  m.pon(2, 5, IDX.bateria);
  for(let x = 3; x < 8; x++) m.pon(x, 5, IDX.cobre);
  m.pon(8, 5, IDX.interruptor);
  for(let x = 9; x < 14; x++) m.pon(x, 5, IDX.cobre);
  m.pon(14, 5, IDX.lampara);
  corre(m, 30);
  ok('con el interruptor ABIERTO la lámpara no enciende', m.car[m.i(14,5)] === 0);
  m.acciona(8, 5);
  corre(m, 30);
  ok('y al accionarlo, enciende', m.car[m.i(14,5)] === 1);
  m.acciona(8, 5);
  corre(m, 30);
  ok('y vuelve a apagarse', m.car[m.i(14,5)] === 0);

  /* resistencia: calienta de verdad */
  const r = mundo(20, 10);
  repisa(r, 6);
  r.pon(2, 5, IDX.bateria);
  for(let x = 3; x < 9; x++) r.pon(x, 5, IDX.cobre);
  r.pon(9, 5, IDX.resistencia);
  corre(r, 60);
  const tRes = r.temp[r.i(9,5)], tCab = r.temp[r.i(5,5)];
  ok('la resistencia se CALIENTA mucho más que el cable',
     tRes > tCab + 20, 'resistencia ' + tRes.toFixed(0) + '° · cable ' + tCab.toFixed(0) + '°');

  /* pulsador: la señal que cambia sola */
  const s = mundo(20, 10);
  repisa(s, 6);
  s.pon(4, 5, IDX.pulsador);
  for(let x = 5; x < 12; x++) s.pon(x, 5, IDX.cobre);
  let encendido = 0, apagado = 0;
  for(let i = 0; i < 80; i++){ s.paso(); s.car[s.i(11,5)] ? encendido++ : apagado++; }
  ok('el pulsador late solo: enciende Y apaga', encendido > 8 && apagado > 8,
     encendido + ' encendido · ' + apagado + ' apagado');
}

seccion('magnetismo');
{
  const m = mundo(40, 40, 5);
  crisol(m, 4, 4, 36, 36);
  /* ⚠ antes ponía el imán a 21 celdas y su alcance es 9: la limadura ni se
     enteraba, y la prueba culpaba al magnetismo de estar fuera de rango. */
  m.pon(20, 30, IDX.iman);
  for(let y = 26; y < 29; y++) for(let x = 13; x < 16; x++) m.pon(x, y, IDX.limadura);
  const xMedio = () => { let s = 0, n = 0;
    for(let y = 0; y < 40; y++) for(let x = 0; x < 40; x++)
      if(m.t[m.i(x,y)] === IDX.limadura){ s += x; n++; }
    return n ? s / n : 0; };
  const antes = xMedio();
  corre(m, 120);
  const despues = xMedio();
  ok('el imán JALA la limadura hacia él', despues > antes + 2,
     'x medio ' + antes.toFixed(1) + ' → ' + despues.toFixed(1));

  /* el electroimán, sólo con corriente */
  const sinCorriente = mundo(40, 40, 5);
  crisol(sinCorriente, 4, 4, 36, 36);
  sinCorriente.pon(20, 30, IDX.electroiman);
  for(let y = 26; y < 29; y++) for(let x = 13; x < 16; x++) sinCorriente.pon(x, y, IDX.limadura);
  const a0 = (() => { let s=0,n=0; for(let y=0;y<40;y++) for(let x=0;x<40;x++)
    if(sinCorriente.t[sinCorriente.i(x,y)] === IDX.limadura){ s+=x; n++; } return s/n; })();
  corre(sinCorriente, 120);
  const a1 = (() => { let s=0,n=0; for(let y=0;y<40;y++) for(let x=0;x<40;x++)
    if(sinCorriente.t[sinCorriente.i(x,y)] === IDX.limadura){ s+=x; n++; } return s/n; })();
  ok('el electroimán SIN corriente no jala nada', a1 < a0 + 2,
     'x medio ' + a0.toFixed(1) + ' → ' + a1.toFixed(1));
}

seccion('los 118 de la tabla periódica');
{
  const { TABLA } = await import('./elementos.js');
  const ids = Object.keys(TABLA);
  ok('están los 118', ids.length === 118, ids.length + ' elementos');

  /* los datos son REALES: se comprueban contra los valores conocidos */
  ok('el hierro funde a 1538 °C', TABLA.eFe.fusReal === 1538, TABLA.eFe.fusReal);
  ok('el oro funde a 1064 °C', TABLA.eAu.fusReal === 1064, TABLA.eAu.fusReal);
  /* ⚠ yo había escrito «el wolframio es el que más aguanta» y ES FALSO: el
     carbono funde a 3550. El wolframio es el METAL que más aguanta, que no es
     lo mismo. El dato estaba bien; la afirmación era mía y estaba mal. */
  ok('el wolframio es el METAL que más aguanta: 3422 °C',
     TABLA.eW.fusReal === 3422 &&
     /* ⚠ y aquí caí en la trampa de siempre: filtraba con
        `grupo.includes('metal')`, y «NO METAL» CONTIENE «METAL». El carbono se
        colaba en la lista de metales y volvía a ganar. Se compara el grupo
        entero, no un pedazo. */
     Math.max(...ids.filter(i => ['⚛ transición','⚛ metal','⚛ alcalino',
                                  '⚛ alcalinotérreo','⚛ lantánido','⚛ actínido']
                                  .indexOf(TABLA[i].grupo) >= 0)
                  .map(i => TABLA[i].fusReal || -999)) === 3422, TABLA.eW.fusReal);
  ok('y el carbono aguanta todavía más, que es lo correcto', TABLA.eC.fusReal === 3550);
  /* ⚠ el osmio es el más denso MEDIDO. Varios superpesados traen densidades
     mayores, pero son calculadas: de ellos existen unos pocos átomos que
     duran milisegundos y nadie ha pesado un trozo. Van marcados. */
  const medidos = ids.filter(i => !TABLA[i].predicho);
  ok('el osmio es el más denso de los MEDIDOS',
     Math.max(...medidos.map(i => TABLA[i].masa)) === TABLA.eOs.masa,
     TABLA.eOs.masa + ' g/cm³');
  ok('y las densidades calculadas van marcadas, no coladas como medición',
     ids.filter(i => TABLA[i].predicho).length > 10);
  ok('el mercurio es líquido a temperatura ambiente', TABLA.eHg.fusReal < 22);
  ok('el helio y el neón son gases', TABLA.eHe.estado === 'gas' && TABLA.eNe.estado === 'gas');

  /* ⚠ lo que NO se inventa */
  /* ⚠ la primera versión metía en el mismo saco a los gases, que no llevan
     `fusReal` por otra razón. Se comprueban sólo los sólidos. */
  const sinDato = ids.filter(i => TABLA[i].fusReal == null && TABLA[i].estado !== 'gas');
  ok('a los sintéticos sin fusión medida NO se les inventó un número',
     sinDato.length > 0 && sinDato.every(i => TABLA[i].z >= 100),
     sinDato.length + ' sin dato: ' + sinDato.map(i=>TABLA[i].sim).join(' '));

  /* y que la fase FUNCIONE: el hierro se funde y escurre */
  const m = mundo(20, 30, 6);
  crisol(m, 4, 8, 16, 26);
  /* apoyado en el fondo del crisol: desde que los sólidos caen, un bloque de
     hierro flotando a media altura se desploma —y con razón— así que lo que
     se mide aquí (que a temperatura ambiente NO fluye) hay que medirlo sobre
     algo, o se está midiendo la gravedad otra vez. */
  for(let x = 6; x < 14; x++) for(let y = 23; y < 26; y++) m.pon(x, y, IDX.eFe);
  corre(m, 5);
  ok('el hierro a temperatura ambiente es SÓLIDO y no se mueve',
     m.estadoDe(m.i(8, 24)) === 'solido');
  for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.eFe) m.temp[k] = 1600;
  /* ⚠ DOS ERRORES MÍOS EN LA MISMA PRUEBA, y los dos de medir mal:
     1 · miraba DOS CELDAS CONCRETAS, y en cuanto el hierro se funde ESCURRE:
         esas celdas quedan vacías y la prueba culpaba a la fusión de que el
         metal se hubiera movido.
     2 · medía a los 3 pasos, y para entonces YA SE VOLVIÓ A SOLIDIFICAR: con
         masa térmica, un puñado de hierro rodeado de muro frío pasa de 1600 a
         1499 en tres pasos. El motor tenía razón las dos veces.
     Se pregunta por la propiedad y en el instante en que ocurre. */
  const cuantasLiquidas = (mm) => {
    let n = 0;
    for(let q = 0; q < mm.t.length; q++)
      if(mm.t[q] === IDX.eFe && mm.estadoDe(q) === 'liquido') n++;
    return n;
  };
  m.paso();
  ok('a 1600 °C se FUNDE (por encima de sus 1538)', cuantasLiquidas(m) > 0,
     cuantasLiquidas(m) + ' celdas líquidas');
  corre(m, 6);
  ok('y sin horno se vuelve a solidificar en unos pasos, como el metal real',
     cuantasLiquidas(m) === 0);
  /* ⚠ antes corría 60 pasos y esperaba que llegara al fondo. No llegaba, y
     el motor tenía razón: en 60 pasos el hierro se enfría por debajo de 1538
     y VUELVE A SER SÓLIDO a media caída. Eso es lo que hace el metal fundido
     cuando nadie mantiene el horno encendido. Con el horno puesto, escurre. */
  for(let i = 0; i < 60; i++){
    for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.eFe) m.temp[k] = 1600;
    m.paso();
  }
  let masAbajo = 0;
  for(let y = 0; y < 30; y++) for(let x = 0; x < 20; x++)
    if(m.t[m.i(x,y)] === IDX.eFe && y > masAbajo) masAbajo = y;
  ok('y fundido, con el horno encendido, ESCURRE al fondo del crisol',
     masAbajo >= 24, 'llegó a y=' + masAbajo);

  const frio = mundo(20, 30, 6);
  crisol(frio, 4, 8, 16, 26);
  for(let x = 6; x < 14; x++) frio.pon(x, 12, IDX.eFe);
  for(let k = 0; k < frio.t.length; k++) if(frio.t[k] === IDX.eFe) frio.temp[k] = 1600;
  corre(frio, 90);
  ok('y si lo dejas enfriar, SE SOLIDIFICA a medio camino — como el metal real',
     frio.estadoDe(frio.i(9, 20)) === 'solido' ||
     [...Array(30).keys()].some(y => frio.t[frio.i(9,y)] === IDX.eFe &&
                                     frio.estadoDe(frio.i(9,y)) === 'solido'));

  /* densidad real: el oro se hunde en el mercurio... no, FLOTA. 19.3 vs 13.5 */
  ok('el oro pesa más que el mercurio (19.3 vs 13.5)', TABLA.eAu.dens > TABLA.eHg.dens);
}

seccion('automatización: lo que Carlos pidió por su nombre');
{
  /* RELOJ DE ARENA: no deja pasar hasta que pase el tiempo */
  const m = mundo(30, 10);
  repisa(m, 6);
  m.pon(2, 5, IDX.bateria);
  for(let x = 3; x < 8; x++) m.pon(x, 5, IDX.cobre);
  m.pon(8, 5, IDX.reloj);
  for(let x = 9; x < 14; x++) m.pon(x, 5, IDX.cobre);
  m.pon(14, 5, IDX.lampara);
  corre(m, 20);
  ok('el reloj de arena NO deja pasar al principio', m.car[m.i(14,5)] === 0);
  corre(m, 120);
  ok('pero deja pasar cuando se llena su tiempo', m.car[m.i(14,5)] === 1);
  m.acciona(8, 5);
  corre(m, 8);
  ok('y tocarlo lo REINICIA («que se puedan apagar al tiempo»)', m.car[m.i(14,5)] === 0);

  /* REPETIDOR: sin él la corriente se muere de lejos */
  const largo = mundo(200, 10);
  repisa(largo, 6);
  largo.pon(1, 5, IDX.bateria);
  for(let x = 2; x < 195; x++) largo.pon(x, 5, IDX.cobre);
  largo.pon(195, 5, IDX.lampara);
  corre(largo, 260);
  ok('sin repetidor, la corriente NO llega a 195 celdas', largo.car[largo.i(195,5)] === 0);

  const rep = mundo(200, 10);
  repisa(rep, 6);
  rep.pon(1, 5, IDX.bateria);
  for(let x = 2; x < 195; x++) rep.pon(x, 5, x % 60 === 0 ? IDX.repetidor : IDX.cobre);
  rep.pon(195, 5, IDX.lampara);
  corre(rep, 300);
  ok('CON repetidores cada 60, sí llega', rep.car[rep.i(195,5)] === 1);

  /* PILA que se acaba y se recarga */
  const pila = mundo(20, 10);
  repisa(pila, 6);
  pila.pon(2, 5, IDX.pila);
  for(let x = 3; x < 10; x++) pila.pon(x, 5, IDX.cobre);
  pila.pon(10, 5, IDX.lampara);
  corre(pila, 30);
  ok('la pila enciende al principio', pila.car[pila.i(10,5)] === 1);
  const cargaInicial = pila.vida[pila.i(2,5)];
  corre(pila, 2700);
  ok('y SE ACABA con el uso', pila.car[pila.i(10,5)] === 0,
     'carga ' + cargaInicial + ' → ' + pila.vida[pila.i(2,5)]);
  for(let i = 0; i < 400; i++){ pila.temp[pila.i(2,5)] = 300; pila.paso(); }
  ok('y con calor SE RECARGA', pila.vida[pila.i(2,5)] > 0,
     'carga ' + pila.vida[pila.i(2,5)]);

  /* PISTÓN que lanza */
  const pis = mundo(30, 40, 4);
  repisa(pis, 36);
  pis.pon(15, 35, IDX.piston);
  pis.pon(15, 34, IDX.arena);
  pis.pon(14, 35, IDX.bateria);
  /* ⚠ antes buscaba sólo en la COLUMNA 15, y una arena lanzada se va de lado:
     la prueba la perdía de vista y decía que no había subido. */
  let yMin = 99;
  for(let i = 0; i < 60; i++){
    pis.paso();
    for(let y = 0; y < 40; y++) for(let x = 0; x < 30; x++)
      if(pis.t[pis.i(x,y)] === IDX.arena && y < yMin) yMin = y;
  }
  ok('el pistón con corriente LANZA lo que tiene encima', yMin < 33, 'llegó a y=' + yMin);

  /* OBSERVADOR */
  const obs = mundo(20, 14);
  repisa(obs, 9);
  obs.pon(8, 8, IDX.observador);
  for(let x = 9; x < 14; x++) obs.pon(x, 8, IDX.cobre);
  corre(obs, 12);
  const quieto = obs.car[obs.i(13,8)];
  obs.pon(8, 7, IDX.piedra);          /* algo CAMBIA encima */
  let disparo = false;
  for(let i = 0; i < 14; i++){ obs.paso(); if(obs.car[obs.i(13,8)]) disparo = true; }
  ok('el observador dispara cuando CAMBIA lo que tiene encima', !quieto && disparo);
}

seccion('pirotecnia');
{
  const m = mundo(60, 60, 12);
  for(let y = 28; y < 32; y++) for(let x = 28; x < 32; x++) m.pon(x, y, IDX.estRoja);
  m.pon(30, 27, IDX.fuego);
  let chispas = 0, colores = new Set();
  for(let i = 0; i < 40; i++){
    m.paso();
    for(let k = 0; k < m.t.length; k++)
      if(m.t[k] === IDX.chispa){ chispas++; colores.add(m.color[k]); }
    if(chispas) break;
  }
  ok('una estrella al arder suelta CHISPAS', chispas > 0, chispas + ' chispas');
  ok('y las chispas llevan el color de SU estrella', colores.has(1),
     'colores ' + [...colores].join(','));

  /* la mecha se quema despacio y en línea, para retrasar la tronada */
  const me = mundo(40, 12, 8);
  for(let x = 4; x < 34; x++) me.pon(x, 8, IDX.mecha);
  /* ⚠ antes ponía FUEGO al lado, y el fuego es «energía»: SUBE y se va
     volando en el primer paso, sin llegar a tocar la mecha. Se enciende
     calentando la punta, que es lo que hace un cerillo. */
  me.temp[me.i(4, 8)] = 800;
  let paso20 = 0, paso200 = 0;
  for(let i = 0; i < 20; i++) me.paso();
  paso20 = cuantos(me, 'mecha');
  for(let i = 0; i < 400; i++) me.paso();
  paso200 = cuantos(me, 'mecha');
  ok('la mecha se quema DESPACIO, no de golpe', paso20 > 24 && paso200 < paso20,
     '30 → ' + paso20 + ' (20 pasos) → ' + paso200 + ' (420 pasos)');
}

seccion('la onda expansiva VIAJA, rebota, se difracta y atraviesa');
{
  /* Carlos: «tus ondas expansivas se quedan donde fue la explosión, no se
     expanden ni luchan con el entorno para crecer, ni se deforman al chocar
     con una pared; que un residuo se quede tras la pared y otro atraviese
     pero pierda fuerza». Esto mide las cuatro cosas por separado. */
  const frente = (m, cx, cy) => {
    let r = 0;
    for(let y = 0; y < m.al; y++) for(let x = 0; x < m.an; x++)
      if(Math.abs(m.pres[m.i(x,y)]) > 1) r = Math.max(r, Math.hypot(x-cx, y-cy));
    return r;
  };

  /* 1 · VIAJA. Antes de la ecuación de onda esto daba 0.13 celdas por paso:
     una mancha que se difundía y se apagaba en el sitio. */
  const m = mundo(160, 160, 3);
  for(let y = 78; y <= 82; y++) for(let x = 78; x <= 82; x++) m.presiona(x, y, 400);
  corre(m, 10); const r10 = frente(m, 80, 80);
  corre(m, 30); const r40 = frente(m, 80, 80);
  const veloc = (r40 - r10) / 30;
  ok('el frente AVANZA, y a velocidad de onda', veloc > 0.9,
     veloc.toFixed(2) + ' celdas por paso (la difusión de antes daba 0.13)');

  /* 2 · SE DEBILITA al repartirse en una circunferencia mayor, y la energía
     nunca crece: si crece, el operador está fabricando energía y la sala
     acaba temblando sola. Eso pasó de verdad, por un acople asimétrico. */
  const energia = mm => { let e = 0; for(let k = 0; k < mm.pres.length; k++) e += mm.pres[k]*mm.pres[k]; return e; };
  const e40 = energia(m); corre(m, 40); const e80 = energia(m);
  ok('y se DEBILITA: la energía nunca crece', e80 < e40,
     e40.toExponential(2) + ' → ' + e80.toExponential(2));

  /* 3 · una pared DURA refleja y una FLOJA deja pasar debilitada. Es el mismo
     código para las dos: sale del coeficiente de transmisión, no de un `if`. */
  const cruza = (material) => {
    const w = mundo(120, 60, 5);
    if(material != null) for(let y = 0; y < 60; y++) w.pon(60, y, material);
    for(let y = 28; y <= 32; y++) for(let x = 18; x <= 22; x++) w.presiona(x, y, 400);
    let aca = 0, alla = 0;
    for(let i = 0; i < 70; i++){
      w.paso();
      for(let y = 0; y < 60; y++){
        for(let x = 40; x <= 58; x++) aca  = Math.max(aca,  Math.abs(w.pres[w.i(x,y)]));
        for(let x = 62; x <= 80; x++) alla = Math.max(alla, Math.abs(w.pres[w.i(x,y)]));
      }
    }
    return alla / aca;
  };
  const libre = cruza(null), pMuro = cruza(IDX.muro);
  const pConc = cruza(IDX.concreto), pMad = cruza(IDX.madera);
  ok('el MURO la refleja entera: no pasa nada', pMuro === 0, (pMuro*100).toFixed(0) + '%');
  ok('una pared FLOJA la deja pasar debilitada', pMad > 0.2 && pMad < libre,
     'madera ' + (pMad*100).toFixed(0) + '% · sin pared ' + (libre*100).toFixed(0) + '%');
  ok('y una DURA deja pasar menos que una floja', pConc < pMad,
     'concreto ' + (pConc*100).toFixed(0) + '% < madera ' + (pMad*100).toFixed(0) + '%');

  /* 4 · DIFRACCIÓN: dobla la esquina de un hueco. La geometría dice cero. */
  const d = mundo(120, 60, 5);
  for(let y = 0; y < 60; y++) if(y < 27 || y > 33) d.pon(60, y, IDX.muro);
  for(let y = 28; y <= 32; y++) for(let x = 18; x <= 22; x++) d.presiona(x, y, 400);
  corre(d, 70);
  let esquina = 0;
  for(let y = 0; y < 12; y++) for(let x = 70; x <= 80; x++) esquina = Math.max(esquina, Math.abs(d.pres[d.i(x,y)]));
  ok('y DOBLA LA ESQUINA de un hueco (difracción)', esquina > 1, 'pico ' + esquina.toFixed(1));
}

seccion('la onda se calma sola, y la sala no queda presurizada de por vida');
{
  /* Esto costó dos rondas. La primera versión amortiguaba la VELOCIDAD de la
     onda y nunca la presión — y un desnivel uniforme tiene laplaciano cero, o
     sea que no se mueve y no se amortigua: a 900 pasos la energía seguía
     clavada en 5.21e6 con la sala entera empujándolo todo. */
  const m = mundo(60, 60, 5);
  for(let y = 30; y < 34; y++) for(let x = 28; x < 32; x++) m.pon(x, y, IDX.polvora);
  m.pon(30, 29, IDX.fuego);
  corre(m, 340);
  let queda = 0;
  for(let k = 0; k < m.pres.length; k++) if(Math.abs(m.pres[k]) > 2) queda++;
  ok('a los 340 pasos ya no queda presión suelta', queda === 0, queda + ' celdas');
  /* Y NO por haber apagado la física: una recámara sellada de gas caliente
     SÍ conserva su presión mientras esté caliente. Si esto fallara, el
     desahogo se estaría comiendo también lo que debe aguantar. */
  const r = mundo(60, 60, 9);
  crisol(r, 20, 20, 40, 40);
  /* ⚠ CO₂ Y NO GAS NATURAL, y esto lo escribí mal a la primera: puse gasnat a
     900° y a esa temperatura SE AUTOENCIENDE. Para el paso 5 no quedaba gas
     —había fuego, que es «energía» y no ejerce presión de gas— y la prueba
     acusaba al motor de no aguantar una recámara que yo mismo había quemado.
     Es la misma familia que el aceite que se caía antes de tocar el fuego y el
     vidrio medido mientras estaba fundido. */
  for(let y = 21; y < 40; y++) for(let x = 21; x < 40; x++){ r.pon(x, y, IDX.co2); r.temp[r.i(x,y)] = 700; }
  /* ⚠ Y SE MIDE EL PICO, NO UN PASO CUALQUIERA. La primera versión miraba el
     paso 40 y para entonces el gas ya se había enfriado de 700° a 39° —el
     calor se conduce por el muro—, así que leía 1.5 y acusaba al motor.
     Lo que hay que comprobar es que MIENTRAS ESTÁ CALIENTE aguanta, y que la
     presión sigue a la temperatura en vez de quedarse clavada. */
  let pico = 0, fria = 0;
  for(let i = 0; i < 80; i++){
    r.paso();
    let d = 0, n = 0;
    for(let y = 25; y < 35; y++) for(let x = 25; x < 35; x++){ d += r.pres[r.i(x,y)]; n++; }
    if(i < 30 && d/n > pico) pico = d/n;
    if(i === 79) fria = d/n;
  }
  ok('pero una recámara CALIENTE Y SELLADA sí aguanta su presión', pico > 5,
     'pico ' + pico.toFixed(1) + ' de presión media dentro');
  ok('y al ENFRIARSE la suelta, que es la ley de los gases', fria < pico * 0.2,
     'pico ' + pico.toFixed(1) + ' → fría ' + fria.toFixed(2));
}

seccion('el muro es lo único inamovible');
{
  const m = mundo(40, 40, 7);
  m.pon(20, 20, IDX.muro);
  m.revienta(20, 22, 20);      /* una tronada pegada al muro */
  corre(m, 30);
  ok('una explosión pegada NO borra el muro', m.t[m.i(20,20)] === IDX.muro);
  ok('y el muro no acumula presión: la refleja', m.pres[m.i(20,20)] === 0,
     m.pres[m.i(20,20)].toFixed(2));
}

console.log('\n' + (mal ? '✗' : '✓') + '  ' + bien + ' pasan · ' + mal + ' fallan');
process.exit(mal ? 1 : 0);
