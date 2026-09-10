#!/usr/bin/env node
/* Pruebas del motor de CRISOL. Corren sin navegador: la simulación es
   determinista a propósito (azar propio con semilla), así que un
   comportamiento que aparece una vez se puede volver a provocar.

   ⚠ Esto prueba EL MOTOR, no el juego. Ya nos pasó en Guerra de Puercos que
   las 74 del motor pasaban con la pantalla muerta. La pantalla va aparte. */
import { Mundo, IDX, EL, VACIO, aCeldas, GRAVEDAD } from './motor.js';

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

  /* ⚠ ESTA PRUEBA MIRABA TARDE Y ACUSABA AL MOTOR. Leía el vapor en el paso
     4 y desde que el aire acarrea calor, para entonces ya se había vuelto a
     condensar: hervía en el paso 1, ocho celdas, y en el 3 ya eran agua otra
     vez a 89°. O sea que el motor hacía lo correcto —una bocanada de vapor en
     aire frío se condensa en un parpadeo— y la prueba decía que no hervía.
     Se mide SI HIRVIÓ, que es la pregunta, no cómo estaba en un instante. */
  const h = mundo(14, 14);
  for(let x = 3; x < 11; x++) h.pon(x, 12, IDX.agua);
  for(let k = 0; k < h.t.length; k++) if(h.t[k] === IDX.agua) h.temp[k] = 130;
  let hirvio = 0;
  for(let i = 0; i < 4; i++){ h.paso(); hirvio = Math.max(hirvio, cuantos(h, 'vapor')); }
  ok('el agua a 130° hierve', hirvio > 0, 'nunca pasó de ' + hirvio + ' de vapor');
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

seccion('las compuertas lógicas, con su tabla de verdad entera');
{
  /* Carlos, sin rodeos: «tus módulos de lógica no sirven para una mierda,
     supuse que la Y sería que si recibe dos señales separadas entonces
     permite el paso, pero con una ya lo permite; la NO no hace nada más que
     parpadear». Las dos quejas eran el MISMO defecto —la compuerta contaba su
     propia salida como entrada— más un segundo debajo: al ser fuente, también
     empujaba hacia atrás por su cable de entrada y le robaba la paternidad a
     la batería, lo que daba un parpadeo exacto al 50%.
     Por eso esto no comprueba sólo el resultado: comprueba que sea ESTABLE.
     Una compuerta que da el valor correcto la mitad de los pasos está rota, y
     mirando sólo el último paso se ve perfecta. */
  const monta = (puerta, a, b) => {
    const m = mundo(30, 20, 3);
    repisa(m, 15);
    const gx = 14, gy = 14;
    m.pon(gx, gy, IDX[puerta]);
    for(let x = 10; x < gx; x++) m.pon(x, gy, IDX.cobre);      /* entrada A, por la izquierda */
    if(a) m.pon(9, gy, IDX.bateria);
    for(let y = 10; y < gy; y++) m.pon(gx, y, IDX.cobre);      /* entrada B, por arriba */
    if(b) m.pon(gx, 9, IDX.bateria);
    for(let x = gx + 1; x < 20; x++) m.pon(x, gy, IDX.cobre);  /* salida, a la derecha */
    m.pon(20, gy, IDX.lampara);
    corre(m, 40);
    let on = 0;
    for(let i = 0; i < 20; i++){ m.paso(); if(m.car[m.i(20, gy)]) on++; }
    return { sal: m.car[m.i(20, gy)] ? 1 : 0, estable: on === 0 || on === 20, on };
  };
  const tabla = {
    gAND: [0,0,0,1], gOR: [0,1,1,1], nand: [1,1,1,0],
    nor:  [1,0,0,0], xor: [0,1,1,0], xnor: [1,0,0,1],
  };
  for(const [g, esp] of Object.entries(tabla)){
    const r = [monta(g,0,0), monta(g,1,0), monta(g,0,1), monta(g,1,1)];
    const dio = r.map(v => v.sal);
    ok(EL[IDX[g]].nom + ': su tabla de verdad entera', dio.join() === esp.join(),
       '00 01 10 11 → ' + dio.join(' ') + ' · esperado ' + esp.join(' '));
    ok('  …y sin parpadear', r.every(v => v.estable),
       'pasos encendida de 20: ' + r.map(v => v.on).join(' / '));
  }

  /* NOT va aparte: una sola entrada */
  const notCon = (a) => {
    const m = mundo(30, 20, 3);
    repisa(m, 15);
    m.pon(14, 14, IDX.gNOT);
    for(let x = 10; x < 14; x++) m.pon(x, 14, IDX.cobre);
    if(a) m.pon(9, 14, IDX.bateria);
    for(let x = 15; x < 20; x++) m.pon(x, 14, IDX.cobre);
    m.pon(20, 14, IDX.lampara);
    corre(m, 40);
    let on = 0;
    for(let i = 0; i < 20; i++){ m.paso(); if(m.car[m.i(20,14)]) on++; }
    return on;
  };
  const sinSenal = notCon(0), conSenal = notCon(1);
  ok('NO (NOT): sin señal enciende, y se QUEDA encendida', sinSenal === 20, sinSenal + '/20 pasos');
  ok('y con señal se apaga, y se queda apagada', conSenal === 0, conSenal + '/20 pasos');
}

seccion('rozar no es golpear · fricción y contacto');
{
  /* Carlos: «una pared no se rompe si la roza un objeto… debes meter también
     la fricción», y separó él mismo contacto, rozamiento, fuerza normal,
     impacto, corte, deformación y fractura. Lo que decide no es tocar: es la
     energía ½·m·v² contra lo que el material aguanta. */
  const cuenta = (m, id) => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX[id]) c++; return c; };
  const losa = (proyectil, desde) => {
    const g = mundo(40, 60, 1);
    repisa(g, 59);
    for(let x = 0; x < 40; x++) for(let y = 50; y < 59; y++) g.pon(x, y, IDX.piedra);
    const antes = cuenta(g, 'piedra');
    g.pon(20, desde, IDX[proyectil]); g.suelto[g.i(20, desde)] = 1;
    corre(g, 300);
    return antes - cuenta(g, 'piedra');
  };
  const caida = losa('eOs', 2), encima = losa('eOs', 48), ligero = losa('ceniza', 2);
  ok('un proyectil pesado a velocidad ABOLLA la losa', caida > 0, 'agujero de ' + caida);
  ok('el mismo, soltado encima y sin velocidad, NO', encima === 0, 'agujero de ' + encima);
  ok('y uno ligero desde la misma altura tampoco', ligero === 0, 'agujero de ' + ligero);

  /* el roce: 300 pasos raspando y la pared entera */
  const roce = mundo(40, 40, 1);
  for(let y = 0; y < 40; y++) roce.pon(20, y, IDX.piedra);
  for(let i = 0; i < 300; i++){
    const k = roce.i(19, 20);
    if(roce.t[k] === VACIO) roce.pon(19, 20, IDX.metal);
    roce.vx[k] = 0.5; roce.suelto[k] = 1;
    roce.paso();
  }
  let quedan = 0;
  for(let y = 0; y < 40; y++) if(roce.t[roce.i(20,y)] === IDX.piedra) quedan++;
  ok('y ROZARLA 300 pasos no le hace nada', quedan === 40, quedan + '/40 celdas');

  /* la fricción FRENA de verdad, y el hielo menos que la arena */
  /* ⚠ el suelo va en la ÚLTIMA FILA. La primera versión lo puso a media
     altura en un mundo de 20 y, desde que los sólidos caen, ese suelo se
     desplomaba con bloque y todo: las dos superficies daban el mismo número
     porque las dos se habían ido al fondo. Medía la gravedad otra vez. */
  const desliza = (suelo) => {
    const m = mundo(60, 20, 2);
    repisa(m, 19);
    for(let x = 0; x < 60; x++) m.pon(x, 18, IDX[suelo]);
    m.pon(5, 17, IDX.metal); m.suelto[m.i(5,17)] = 1; m.vx[m.i(5,17)] = 5;
    corre(m, 60);
    for(let x = 59; x >= 0; x--) if(m.t[m.i(x,17)] === IDX.metal) return x;
    return 5;
  };
  /* ⚠ y NO con hielo, que a 22° se derrite: el bloque acababa nadando y las
     dos superficies daban lo mismo. El metal es liso y no se va a ningún lado. */
  const porMetal = desliza('metal'), porArena = desliza('arena');
  ok('un bloque llega MÁS LEJOS por metal liso que por arena', porMetal > porArena,
     'metal x=' + porMetal + ' · arena x=' + porArena);
}

seccion('la luz alumbra de verdad y da sombra');
{
  /* Carlos: «no tenemos iluminación… la lámpara no produce iluminación».
     Ahora la luz se reparte desde la lámpara encendida, se apaga con la
     distancia y la bloquean los sólidos. Y depende del CIRCUITO. */
  const m = mundo(60, 40, 1);
  repisa(m, 39);
  m.pon(10, 38, IDX.bateria);
  for(let x = 11; x < 20; x++) m.pon(x, 38, IDX.cobre);
  m.pon(20, 38, IDX.lampara);
  for(let y = 20; y < 39; y++) m.pon(35, y, IDX.piedra);   /* una pared */
  corre(m, 20);
  const L = (x, y) => m.luz[m.i(x, y)];
  ok('junto a la lámpara hay luz', L(21,37) > 10, L(21,37).toFixed(0));
  ok('y se APAGA con la distancia', L(30,37) > 0 && L(30,37) < L(21,37),
     'a 1 celda ' + L(21,37).toFixed(0) + ' · a 10 celdas ' + L(30,37).toFixed(0));
  ok('detrás de una pared hay SOMBRA', L(40,37) === 0, L(40,37).toFixed(0));
  m.pon(15, 38, IDX.aislante);      /* se corta el circuito */
  corre(m, 20);
  ok('y si cortas el circuito, se apaga', L(21,37) === 0, L(21,37).toFixed(0));
}

seccion('la mano y el termómetro');
{
  /* «El arrastre debe aplicar una FUERZA al objeto, no simplemente cambiar su
     posición» — así que lo que se comprueba es justo eso: que lo ligero venga
     y lo pesado cueste, con la misma mano y el mismo tirón. */
  const tira = (id) => {
    const m = mundo(60, 40, 3);
    repisa(m, 39);
    m.pon(10, 38, IDX[id]);
    let cx = 10, cy = 38;
    for(let i = 0; i < 60; i++){
      const g = m.agarra(cx, cy, 45, 38, 2);   /* el dedo, lejos a la derecha */
      cx = g.cx; cy = g.cy;
      m.paso();
    }
    for(let x = 59; x >= 0; x--) if(m.t[m.i(x,38)] === IDX[id]) return x;
    return 10;
  };
  const ligero = tira('madera'), pesado = tira('eOs');
  ok('la mano ARRASTRA un sólido', ligero > 12, 'la madera llegó a x=' + ligero);
  ok('y lo pesado cuesta más que lo ligero', pesado < ligero,
     'madera x=' + ligero + ' · osmio x=' + pesado);
  ok('y no atraviesa el muro', (() => {
    const m = mundo(40, 40, 3);
    repisa(m, 39);
    for(let y = 20; y < 39; y++) m.pon(20, y, IDX.muro);
    m.pon(10, 38, IDX.madera);
    let cx = 10, cy = 38;
    for(let i = 0; i < 80; i++){ const g = m.agarra(cx, cy, 35, 38, 2); cx = g.cx; cy = g.cy; m.paso(); }
    for(let x = 21; x < 40; x++) if(m.t[m.i(x,38)] === IDX.madera) return false;
    return true;
  })());

  /* el termómetro */
  const t = mundo(20, 20, 1);
  t.pon(10, 10, IDX.eFe);
  const inf = t.informe(10, 10);
  ok('el termómetro dice qué material es', inf.nombre === 'Hierro' && inf.simbolo === 'Fe', inf.nombre);
  ok('y su temperatura y su estado', inf.temperatura === 22 && inf.estado === 'solido',
     inf.temperatura + '° ' + inf.estado);
  const nombres = inf.cambios.map(c => c.que);
  ok('y sus cambios de estado, con la temperatura de cada uno',
     nombres.includes('fusión') && nombres.includes('ebullición'),
     inf.cambios.map(c => c.que + ' ' + c.a + '°').join(' · '));
  /* ⚠ la FISIÓN no es un cambio de estado, y lo corrigió el propio Carlos.
     Va listada aparte y marcada como fenómeno nuclear. */
  const u = mundo(20, 20, 1);
  u.pon(10, 10, IDX.uranio);
  const iu = u.informe(10, 10).cambios.find(c => c.que === 'fisión');
  ok('la fisión aparece marcada como NUCLEAR, no como cambio de estado',
     !!iu && iu.a === null && /nuclear/.test(iu.nota), iu ? iu.nota : 'no aparece');
}

seccion('la nitro detona por CHOQUE, no por caerse');
{
  /* Carlos, dos veces: «la nitroglicerina sigue explotando nada más ponerla».
     Reproducido: en reposo aguantaba, pero pintada en el aire caía a velocidad
     terminal contra un umbral más bajo y detonaba sola. El error era medir la
     velocidad ABSOLUTA: un charco que cae entero no se está golpeando con
     nada, se está cayendo. Lo que detona es velocidad RELATIVA. */
  const cuantoQueda = (arma) => {
    const m = mundo(40, 60, 7);
    repisa(m, 59);
    arma(m);
    corre(m, 200);
    let n = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.nitro) n++;
    return n;
  };
  ok('pintada en el aire y cayendo 54 celdas, AGUANTA',
     cuantoQueda(m => { for(let x = 10; x < 20; x++) m.pon(x, 5, IDX.nitro); }) === 10);
  ok('apoyada y sin que nada la toque, aguanta',
     cuantoQueda(m => { for(let x = 10; x < 20; x++) m.pon(x, 58, IDX.nitro); }) === 10);
  ok('pero con una piedra de osmio cayéndole encima, DETONA',
     cuantoQueda(m => {
       for(let x = 10; x < 20; x++) m.pon(x, 58, IDX.nitro);
       m.pon(15, 5, IDX.eOs); m.suelto[m.i(15,5)] = 1;
     }) < 10);
  /* Un chapuzón de agua NO la detona, y eso no es una excepción escrita a
     mano: el agua es ligera, el arrastre le deja una velocidad terminal de
     2.16 y el umbral de la nitro son 2.2. Sale del número, no de un `if`. */
  ok('y un chapuzón de agua no: no llega a la velocidad de golpe',
     cuantoQueda(m => {
       for(let x = 10; x < 20; x++) m.pon(x, 58, IDX.nitro);
       for(let x = 13; x < 17; x++) m.pon(x, 5, IDX.agua);
     }) === 10);
  /* detonación simpática: la onda de otra explosión */
  const s = mundo(60, 60, 7);
  repisa(s, 59);
  for(let x = 40; x < 50; x++) s.pon(x, 58, IDX.nitro);
  s.revienta(20, 55, 16);
  corre(s, 120);
  let quedan = 0; for(let k = 0; k < s.t.length; k++) if(s.t[k] === IDX.nitro) quedan++;
  ok('y la onda de otra explosión SÍ la detona (simpática)', quedan < 10, quedan + '/10');
}

seccion('la gravedad es un CAMPO, no una constante');
{
  /* Carlos no pidió «activar y desactivar la gravedad». Pidió magnitud,
     dirección, zonas, por objeto, puntos que atraen o repelen, y «combinar
     campos gravitatorios mediante suma vectorial». */
  const donde = (m, id) => { for(let y = 0; y < m.al; y++) for(let x = 0; x < m.an; x++)
    if(m.t[m.i(x,y)] === IDX[id]) return { x, y }; return null; };

  ok('9.81 m/s² es exactamente la gravedad del motor', Math.abs(aCeldas(9.81) - GRAVEDAD) < 1e-9,
     aCeldas(9.81).toFixed(4) + ' vs ' + GRAVEDAD);

  const inv = mundo(40, 60, 1);
  inv.ponGravedadGlobal(0, -9.81);
  inv.pon(20, 40, IDX.piedra); inv.suelto[inv.i(20,40)] = 1;
  corre(inv, 60);
  const pi = donde(inv, 'piedra');
  ok('con la gravedad invertida, la piedra SUBE', pi && pi.y < 40, 'y=' + (pi ? pi.y : '—'));

  const lat = mundo(60, 40, 1);
  lat.ponGravedadGlobal(9.81, 0);
  lat.pon(10, 20, IDX.arena);
  corre(lat, 80);
  const pl = donde(lat, 'arena');
  ok('y con la gravedad de lado, cae de lado', pl && pl.x > 40, 'x=' + (pl ? pl.x : '—'));

  /* ⚠ Y AQUÍ ESTABA MI ERROR AL ESCRIBIR LA PRUEBA, no el del motor: puse una
     zona de gravedad cero y esperé que FRENARA a una piedra que entraba
     cayendo. No: una piedra que entra con velocidad la CONSERVA y cruza de
     largo, que es literalmente lo que Carlos pidió — «su velocidad e inercia
     deben conservarse». Lo que hay que medir es que deje de ACELERAR. */
  const z = mundo(40, 90, 1);
  z.zonaGravedad(0, 30, 39, 60, 0, 0, 'reemplaza');
  z.pon(20, 5, IDX.piedra); z.suelto[z.i(20,5)] = 1;
  let vEntra = 0, vSale = 0;
  for(let i = 0; i < 200; i++){
    z.paso();
    const p = donde(z, 'piedra'); if(!p) break;
    const k = z.i(p.x, p.y);
    if(p.y >= 32 && p.y <= 34 && !vEntra) vEntra = z.vy[k];
    if(p.y >= 56 && p.y <= 58) vSale = z.vy[k];
  }
  /* ⚠ Y ME EQUIVOQUÉ DOS VECES SEGUIDAS EN LA MISMA PRUEBA. La segunda: pedí
     que la velocidad se conservara CLAVADA dentro de la zona, y no: ahí sigue
     habiendo AIRE, y el arrastre es la otra cosa que Carlos pidió. Un cuerpo
     en gravedad cero dentro de un fluido se frena — despacio, pero se frena.
     Lo que hay que comprobar es que ya no ACELERA y que conserva la mayor
     parte de su inercia, no que la conserve entera. */
  const conG = (() => {
    const w = mundo(40, 90, 1);
    w.pon(20, 5, IDX.piedra); w.suelto[w.i(20,5)] = 1;
    let e = 0, sa = 0;
    for(let i = 0; i < 200; i++){
      w.paso();
      const p = donde(w, 'piedra'); if(!p) break;
      const k = w.i(p.x, p.y);
      if(p.y >= 32 && p.y <= 34 && !e) e = w.vy[k];
      if(p.y >= 56 && p.y <= 58) sa = w.vy[k];
    }
    return { e, sa };
  })();
  ok('en una zona de gravedad CERO deja de ACELERAR',
     vSale <= vEntra && conG.sa > conG.e,
     'sin gravedad ' + vEntra.toFixed(2) + ' → ' + vSale.toFixed(2) +
     ' · con gravedad ' + conG.e.toFixed(2) + ' → ' + conG.sa.toFixed(2));
  ok('y conserva la mayor parte de su inercia: sólo la frena el aire',
     vSale > vEntra * 0.4, vEntra.toFixed(2) + ' → ' + vSale.toFixed(2));

  const q = mundo(40, 90, 1);
  q.zonaGravedad(0, 30, 39, 60, 0, 0, 'reemplaza');
  q.pon(20, 45, IDX.piedra); q.suelto[q.i(20,45)] = 1;
  corre(q, 150);
  const pq = donde(q, 'piedra');
  ok('y una piedra QUIETA dentro de esa zona se queda flotando', pq && pq.y === 45,
     'y=' + (pq ? pq.y : '—'));

  const at = mundo(60, 60, 1);
  at.ponGravedadGlobal(0, 0);
  at.puntoGravedad(30, 30, 30, 40, true);
  at.pon(50, 30, IDX.piedra); at.suelto[at.i(50,30)] = 1;
  corre(at, 120);
  const pa = donde(at, 'piedra');
  ok('un punto gravitatorio ATRAE hacia él', pa && pa.x < 48, 'x=' + (pa ? pa.x : '—'));

  const re = mundo(60, 60, 1);
  re.ponGravedadGlobal(0, 0);
  re.puntoGravedad(30, 30, 30, 40, false);
  re.pon(35, 30, IDX.piedra); re.suelto[re.i(35,30)] = 1;
  corre(re, 120);
  const pr = donde(re, 'piedra');
  ok('y con «repele», la echa', pr && pr.x > 37, 'x=' + (pr ? pr.x : '—'));

  /* gravedad por objeto: dos piedras iguales, distinto destino */
  const ob = mundo(40, 60, 1);
  ob.pon(10, 10, IDX.piedra); ob.suelto[ob.i(10,10)] = 1;
  ob.pon(30, 10, IDX.piedra); ob.suelto[ob.i(30,10)] = 1;
  ob.pintaGravedad(30, 10, 1, 0);
  corre(ob, 80);
  let ya = -1, yb = -1;
  for(let y = 0; y < 60; y++){
    if(ob.t[ob.i(10,y)] === IDX.piedra) ya = y;
    if(ob.t[ob.i(30,y)] === IDX.piedra) yb = y;
  }
  ok('dos piedras iguales, una con gravedad propia 0: una cae y la otra no',
     ya > 40 && yb === 10, 'la normal en y=' + ya + ' · la de gravedad 0 en y=' + yb);

  /* suma vectorial: global hacia abajo + zona hacia la derecha = diagonal */
  const su = mundo(60, 60, 1);
  su.zonaGravedad(0, 0, 59, 59, 9.81, 0, 'suma');
  su.pon(10, 5, IDX.arena);
  corre(su, 90);
  const ps = donde(su, 'arena');
  ok('una zona en modo SUMA da una diagonal, no reemplaza', ps && ps.x > 20 && ps.y > 30,
     'acabó en (' + (ps ? ps.x + ',' + ps.y : '—') + ')');

  /* los gases también obedecen: «arriba» es contra la gravedad */
  const g = mundo(40, 60, 1);
  g.ponGravedadGlobal(0, -9.81);
  for(let x = 18; x < 22; x++) g.pon(x, 30, IDX.hidrogeno);
  corre(g, 60);
  let yh = 0, n = 0;
  for(let y = 0; y < 60; y++) for(let x = 0; x < 40; x++)
    if(g.t[g.i(x,y)] === IDX.hidrogeno){ yh += y; n++; }
  ok('con la gravedad invertida, el hidrógeno BAJA en vez de subir',
     n > 0 && yh / n > 30, 'y medio ' + (n ? (yh/n).toFixed(1) : '—'));
}

seccion('resistencia estructural: quién falla primero, y por qué');
{
  /* Carlos, con su caso: «un recipiente de concreto, un tapón de madera,
     presión interna. NO quiero que simplemente se rompa todo al mismo tiempo…
     debe compararse resistencia a la compresión, a la tracción, al corte,
     elasticidad, geometría… No asumir automáticamente que siempre falla la
     madera o siempre el concreto.»
     Nada de esto está escrito: sale de tres resistencias por material y de
     por dónde viaja la carga. */
  const cuenta = (m, id) => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX[id]) c++; return c; };

  const tubo = (tapon, presion) => {
    const m = mundo(60, 60, 5);
    repisa(m, 59);
    for(let x = 20; x <= 40; x++) m.pon(x, 58, IDX.concreto);
    for(let y = 44; y <= 58; y++){ m.pon(20, y, IDX.concreto); m.pon(40, y, IDX.concreto); }
    for(let x = 20; x <= 40; x++) if(x < 28 || x > 33) m.pon(x, 44, IDX.concreto);
    for(let x = 28; x <= 33; x++) m.pon(x, 44, IDX[tapon]);
    const t0 = cuenta(m, tapon), c0 = cuenta(m, 'concreto');
    for(let y = 45; y < 58; y++) for(let x = 21; x < 40; x++){ m.pon(x, y, IDX.co2); m.temp[m.i(x,y)] = presion; }
    corre(m, 300);
    return { tapon: t0 - cuenta(m, tapon), olla: c0 - cuenta(m, 'concreto') };
  };
  const mad = tubo('madera', 900), met = tubo('metal', 900), flojo = tubo('madera', 200);
  ok('un tapón de MADERA cede y el recipiente de concreto aguanta',
     mad.tapon > 0 && mad.olla === 0, 'tapón −' + mad.tapon + ' · olla −' + mad.olla);
  ok('el MISMO recipiente con tapón de METAL aguanta entero',
     met.tapon === 0 && met.olla === 0, 'tapón −' + met.tapon + ' · olla −' + met.olla);
  ok('y con poca presión no cede ninguno de los dos',
     flojo.tapon === 0 && flojo.olla === 0, 'tapón −' + flojo.tapon);

  /* la viga empotrada, que es la pregunta difícil que puso él */
  const viga = ({ material = 'madera', refuerzo = null, presion = 1400 }) => {
    const m = mundo(50, 40, 5);
    repisa(m, 39);
    for(let x = 10; x <= 40; x++) m.pon(x, 38, IDX.concreto);
    for(let y = 22; y <= 38; y++) for(let d = 0; d < 3; d++){ m.pon(10+d, y, IDX.concreto); m.pon(40-d, y, IDX.concreto); }
    for(let x = 10; x <= 40; x++) m.pon(x, 21, IDX[material]);
    if(refuerzo) for(let x = 10; x <= 40; x++) m.pon(x, 22, IDX[refuerzo]);
    const v0 = cuenta(m, material), c0 = cuenta(m, 'concreto');
    for(let y = refuerzo ? 23 : 22; y < 38; y++) for(let x = 13; x < 38; x++)
      if(m.t[m.i(x,y)] === VACIO){ m.pon(x, y, IDX.co2); m.temp[m.i(x,y)] = presion; }
    corre(m, 400);
    return { viga: v0 - cuenta(m, material), olla: c0 - cuenta(m, 'concreto') };
  };
  const sinR  = viga({ presion: 1400 });
  const conR  = viga({ presion: 1400, refuerzo: 'metal' });
  ok('una viga de madera empotrada CEDE con la presión', sinR.viga > 0, '−' + sinR.viga + ' celdas');
  /* ⚠ y aquí está el refuerzo. Sin el reparto por rigidez esto no cambiaba
     NADA: cada celda de madera aguantaba su propio empuje entera y se rompía
     igual, con el acero al lado mirando. */
  ok('y con una varilla de metal PEGADA, la misma viga aguanta',
     conR.viga === 0, 'con refuerzo −' + conR.viga + ' · sin refuerzo −' + sinR.viga);

  const metal6  = viga({ material: 'metal', presion: 6000 });
  const metal12 = viga({ material: 'metal', presion: 12000 });
  ok('una viga de METAL aguanta donde la de madera ya se rompió',
     metal6.viga === 0, '−' + metal6.viga + ' celdas a 6000°');
  /* la parte que más le importaba: que el punto de fallo SE MUEVA */
  ok('y con suficiente presión ceden los EMPOTRAMIENTOS en vez de la viga',
     metal12.olla > 0 && metal12.viga === 0,
     'viga −' + metal12.viga + ' · empotramientos −' + metal12.olla);
}

seccion('válvula y cohete: acción y reacción');
{
  /* Carlos: «quiero experimentar con sistemas de propulsión impulsados por
     presión y expansión de gases; el sistema debe simular las fuerzas
     resultantes de forma física, en lugar de mover el objeto hacia adelante
     mediante una animación».
     No hay una sola línea que diga «cohete». Es la tercera ley: si una celda
     de gas sale acelerada, el sólido que tenía detrás se lleva el impulso
     contrario. Un recipiente cerrado no se mueve porque sus paredes opuestas
     se cancelan; en cuanto le abres una boca, deja de cancelarse. */
  const cohete = ({ abierta = true, boca = 3, presion = 2600, pasos = 300 }) => {
    const m = mundo(60, 120, 5);
    m.ponGravedadGlobal(0, 0);            /* sin gravedad se ve el empuje limpio */
    const x0 = 24, x1 = 34, y0 = 40, y1 = 60;
    for(let x = x0; x <= x1; x++){ m.pon(x, y0, IDX.metal); m.pon(x, y1, IDX.metal); }
    for(let y = y0; y <= y1; y++){ m.pon(x0, y, IDX.metal); m.pon(x1, y, IDX.metal); }
    const cx = Math.round((x0 + x1) / 2), r = Math.floor(boca / 2);
    for(let d = -r; d <= r; d++){
      m.pon(cx + d, y1, IDX.valvula);
      if(abierta) m.vida[m.i(cx + d, y1)] = 1;
    }
    for(let y = y0+1; y < y1; y++) for(let x = x0+1; x < x1; x++){
      m.pon(x, y, IDX.co2); m.temp[m.i(x,y)] = presion;
    }
    const centro = () => { let sy = 0, n = 0;
      for(let k = 0; k < m.t.length; k++)
        if(m.t[k] === IDX.metal || m.t[k] === IDX.valvula){ sy += (k / m.an) | 0; n++; }
      return n ? sy / n : 0; };
    const y0c = centro();
    corre(m, pasos);
    return centro() - y0c;
  };
  const cerrado = cohete({ abierta:false }), abierto = cohete({ abierta:true });
  ok('un recipiente CERRADO no se propulsa: sus paredes se cancelan',
     Math.abs(cerrado) < 1, 'se movió ' + cerrado.toFixed(2) + ' celdas');
  ok('y con la boca ABIERTA sale disparado al lado contrario',
     abierto < -2, 'se movió ' + abierto.toFixed(2) + ' celdas (negativo = hacia arriba)');
  ok('y NO es por la válvula en sí: abierta empuja mucho más que cerrada',
     Math.abs(abierto) > Math.abs(cerrado) * 3,
     'cerrada ' + cerrado.toFixed(2) + ' · abierta ' + abierto.toFixed(2));

  const boca1 = cohete({ boca:1 }), boca5 = cohete({ boca:5 });
  ok('una boca más grande empuja más', Math.abs(boca5) > Math.abs(boca1),
     'boca 1 → ' + boca1.toFixed(2) + ' · boca 5 → ' + boca5.toFixed(2));

  /* ⚠ SE MIDE A 120 PASOS Y NO A 300, y no es para que pase: a 300 el cohete
     fuerte YA SE VACIÓ. Medido: la razón entre 5 000° y 800° es 2.39 a los 60
     pasos, 2.65 a los 120 y 1.77 a los 300 — porque el que empuja más gasta su
     gas antes, que es lo que hace un cohete de verdad. A 300 pasos no se está
     midiendo el empuje, se está midiendo cuánto duró el depósito. */
  const flojo = cohete({ presion:800, pasos:120 }), fuerte = cohete({ presion:5000, pasos:120 });
  ok('y más presión empuja más', Math.abs(fuerte) > Math.abs(flojo) * 2,
     '800° → ' + flojo.toFixed(2) + ' · 5000° → ' + fuerte.toFixed(2));

  /* la válvula, por su cuenta: cerrada contiene, abierta deja salir */
  const olla = (abierta) => {
    const m = mundo(40, 40, 3);
    crisol(m, 10, 10, 30, 30);
    m.pon(20, 10, IDX.valvula);
    if(abierta) m.vida[m.i(20,10)] = 1;
    for(let y = 11; y < 30; y++) for(let x = 11; x < 30; x++){
      m.pon(x, y, IDX.hidrogeno);      /* ligero: quiere subir y salir */
    }
    corre(m, 200);
    let fuera = 0;
    for(let y = 0; y < 10; y++) for(let x = 0; x < 40; x++)
      if(m.t[m.i(x,y)] === IDX.hidrogeno) fuera++;
    return fuera;
  };
  ok('una válvula CERRADA contiene el gas', olla(false) === 0, olla(false) + ' celdas se escaparon');
  ok('y ABIERTA lo deja salir', olla(true) > 0, olla(true) + ' celdas salieron');
}

seccion('el globo vuela, y sólo con lo que debe');
{
  /* Carlos: «el helio no permite crear globos porque no tienen física los
     sólidos». Ahora la cáscara se pesa ENTERA contra el aire que desplaza,
     contando lo que encierra, y se mueve como una pieza. */
  const globo = (relleno) => {
    const m = mundo(40, 80, 1);
    repisa(m, 79);
    for(let x = 16; x <= 24; x++){ m.pon(x, 60, IDX.globo); m.pon(x, 70, IDX.globo); }
    for(let y = 60; y <= 70; y++){ m.pon(16, y, IDX.globo); m.pon(24, y, IDX.globo); }
    if(relleno) for(let y = 61; y < 70; y++) for(let x = 17; x < 24; x++) m.pon(x, y, IDX[relleno]);
    corre(m, 600);
    let techo = 99, tela = 0;
    for(let y = 0; y < 80; y++) for(let x = 0; x < 40; x++)
      if(m.t[m.i(x,y)] === IDX.globo){ if(y < techo) techo = y; tela++; }
    return { techo, tela };
  };
  const he = globo('eHe'), aire = globo(null), co2 = globo('co2');
  ok('lleno de HELIO, sube', he.techo < 40, 'empezó en y=60 y acabó en y=' + he.techo);
  /* ⚠ y ENTERO. Esto es la mitad de la prueba y por poco no la escribo: la
     primera versión le ponía velocidad a cada celda de la cáscara por su
     cuenta, y como el helio es menos denso, las celdas de abajo subían HACIA
     DENTRO y el globo se implosionaba. Medido, se hundía de y=60 a y=68 con
     el balance de flotación saliendo perfecto. Un globo que llega arriba
     desarmado no es un globo. */
  ok('y llega entero, sin implosionarse', he.tela === 36, he.tela + '/36 de tela');
  ok('el MISMO globo lleno de aire NO sube', aire.techo >= 60, 'y=' + aire.techo);
  ok('y lleno de CO₂ tampoco', co2.techo >= 60, 'y=' + co2.techo);
}

seccion('química que necesita chispa · H₂ + O₂ → agua');
{
  /* Carlos: «coloqué hidrógeno y oxígeno pero no sé cómo volverlo agua». Y
     tenía razón: la reacción estaba escrita desde el principio en
     probabilidad CERO con un comentario que decía «sólo con chispa». Esa
     chispa nunca se implementó — una regla que no podía dispararse nunca,
     con una nota explicando por qué. Un TODO disfrazado de código. */
  const mezcla = (chispa) => {
    const m = mundo(40, 40, 3);
    repisa(m, 39);
    for(let y = 20; y < 30; y++) for(let x = 10; x < 20; x++) m.pon(x, y, IDX.hidrogeno);
    for(let y = 20; y < 30; y++) for(let x = 20; x < 30; x++) m.pon(x, y, IDX.oxigeno);
    if(chispa) m.pon(20, 25, IDX.chispa);
    corre(m, 200);
    let agua = 0, h = 0;
    for(let k = 0; k < m.t.length; k++){
      if(m.t[k] === IDX.agua || m.t[k] === IDX.vapor) agua++;
      if(m.t[k] === IDX.hidrogeno) h++;
    }
    return { agua, h };
  };
  const sin = mezcla(false), con = mezcla(true);
  ok('hidrógeno y oxígeno juntos NO reaccionan solos', sin.agua === 0 && sin.h > 0,
     'agua ' + sin.agua + ' · queda hidrógeno ' + sin.h);
  ok('pero con una CHISPA se vuelven agua', con.agua > 0 && con.h === 0,
     'agua/vapor ' + con.agua + ' · queda hidrógeno ' + con.h);

  /* el hidronio, H₃O⁺ */
  const m = mundo(30, 30, 3);
  repisa(m, 29);
  for(let y = 20; y < 28; y++) for(let x = 5; x < 15; x++) m.pon(x, y, IDX.agua);
  for(let y = 20; y < 28; y++) for(let x = 15; x < 25; x++) m.pon(x, y, IDX.acido);
  corre(m, 150);
  let hd = 0;
  for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.hidronio) hd++;
  /* ⚠ esto daba CERO y la reacción estaba bien: la lista de lo que un ácido
     NO corroe estaba escrita a mano —«acido» y «muro»— así que en cuanto entró
     un segundo corrosivo, el hidronio se corroía A SÍ MISMO y se gastaba en
     tres pasos. El producto existía y desaparecía antes de poder verse. */
  ok('agua + ácido da HIDRONIO, y no se come a sí mismo', hd > 10, hd + ' celdas');
  /* y el ácido sigue haciendo su trabajo con lo que no reacciona */
  const a = mundo(30, 30, 3);
  repisa(a, 29);
  for(let y = 20; y < 28; y++) for(let x = 5; x < 25; x++) a.pon(x, y, IDX.piedra);
  for(let x = 6; x < 24; x++) a.pon(x, 19, IDX.acido);
  let p0 = 0; for(let k = 0; k < a.t.length; k++) if(a.t[k] === IDX.piedra) p0++;
  corre(a, 300);
  let p1 = 0; for(let k = 0; k < a.t.length; k++) if(a.t[k] === IDX.piedra) p1++;
  ok('y el ácido sigue comiéndose la piedra', p1 < p0, p0 + ' → ' + p1);
}

seccion('generar energía, no sólo gastarla');
{
  /* Carlos, punto 4: «debe ser posible generar energía… la energía no debe
     aparecer ni desaparecer arbitrariamente». Hasta ahora el motor CONSUMÍA y
     nada GENERABA: la corriente sólo salía de pilas que aparecían llenas. */
  const turbina = () => {
    const m = mundo(60, 60, 3);
    repisa(m, 59);
    for(let y = 20; y < 26; y++) m.pon(30, y, IDX.generador);
    for(let y = 26; y < 59; y++) m.pon(30, y, IDX.muro);
    for(let x = 31; x < 45; x++){ m.pon(x, 25, IDX.cobre); m.pon(x, 26, IDX.muro); }
    m.pon(45, 25, IDX.lampara); m.pon(45, 26, IDX.muro);
    return m;
  };
  const corriendo = (chorro, pasos = 600) => {
    const m = turbina(); let on = 0;
    for(let i = 0; i < pasos; i++){
      if(chorro && i % 2 === 0) m.pon(29, 2, IDX.agua);
      m.paso();
      if(m.car[m.i(45,25)]) on++;
    }
    return on;
  };
  ok('un salto de agua enciende una lámpara', corriendo(true) > 150, corriendo(true) + '/600 pasos');
  ok('y sin nada que lo mueva NO genera de la nada', corriendo(false) === 0, corriendo(false) + '/600');

  /* se apaga sola al cortar el agua: lo guardado se acaba */
  const m = turbina();
  for(let i = 0; i < 400; i++){ if(i % 2 === 0) m.pon(29, 2, IDX.agua); m.paso(); }
  let despues = 0;
  for(let i = 0; i < 600; i++){ m.paso(); if(m.car[m.i(45,25)]) despues++; }
  ok('al cortar el agua se apaga sola', despues > 0 && despues < 200,
     'siguió ' + despues + ' pasos con lo guardado y se apagó');

  /* ⚠ LA CONSERVACIÓN, que es la mitad que casi nunca se implementa: si el
     generador no FRENA a quien lo mueve, es una fuente de energía gratis. */
  const cae = (conTurbina) => {
    const m = mundo(20, 60, 4);
    repisa(m, 59);
    for(let y = 0; y < 59; y++) m.pon(11, y, IDX.muro);
    if(conTurbina) for(let y = 20; y < 40; y++) m.pon(11, y, IDX.generador);
    let vmax = 0;
    for(let i = 0; i < 200; i++){
      if(i % 2 === 0) m.pon(10, 2, IDX.agua);
      m.paso();
      for(let y = 44; y < 50; y++){ const k = m.i(10, y);
        if(m.t[k] === IDX.agua) vmax = Math.max(vmax, Math.abs(m.vy[k])); }
    }
    return vmax;
  };
  const sinT = cae(false), conT = cae(true);
  ok('y FRENA a quien lo mueve: la energía no sale de la nada', conT < sinT,
     'sin turbina llega a ' + sinT.toFixed(2) + ' · pasando por ella ' + conT.toFixed(2));
}

seccion('cuerdas, amarres y péndulos');
{
  /* Herramientas de esta sección: colgar una cuerda del techo y buscar cosas.
     ⚠ Todo se mide DESPUÉS de dejarla asentarse: recién pintada, una cuerda
     está estirada tiesa en la posición en que la dibujó el dedo. */
  const cuelga = (m, x, largo, y0 = 1) => {
    for(let i = 0; i < m.an; i++) m.pon(i, y0 - 1, IDX.muro);
    for(let y = y0; y < y0 + largo; y++) m.pon(x, y, IDX.cuerda);
    return y0 + largo;                       /* la primera fila LIBRE de abajo */
  };
  const donde = (m, id) => { for(let y = 0; y < m.al; y++) for(let x = 0; x < m.an; x++)
    if(m.t[y * m.an + x] === id) return [x, y]; return [-1, -1]; };

  {
    const m = mundo(40, 40, 7);
    cuelga(m, 20, 10);
    corre(m, 40);
    ok('una cuerda colgada del techo cuelga entera', cuantos(m, 'cuerda') === 10,
       'quedaron ' + cuantos(m, 'cuerda'));
    let hondo = 0;
    for(let y = 0; y < 40; y++) if(m.t[m.i(20, y)] === IDX.cuerda) hondo = y;
    ok('y llega hasta abajo, no se amontona', hondo === 10, 'el último eslabón en y=' + hondo);
  }

  {
    /* una cuerda SIN amarre no es una cuerda: es un montón de celdas cayendo */
    const m = mundo(40, 40, 7);
    repisa(m, 39);
    for(let y = 5; y < 12; y++) m.pon(20, y, IDX.cuerda);
    corre(m, 120);
    let hondo = 0;
    for(let y = 0; y < 40; y++) if(m.t[m.i(20, y)] === IDX.cuerda) hondo = y;
    ok('una cuerda sin amarre se cae, no flota', hondo === 38, 'el último en y=' + hondo);
  }

  {
    const m = mundo(40, 40, 7);
    const libre = cuelga(m, 20, 10);
    m.pon(20, libre, IDX.metal);
    corre(m, 80);
    const [mx, my] = donde(m, IDX.metal);
    ok('un peso amarrado a la punta SE QUEDA COLGANDO', my <= 12 && my >= 10,
       'el peso quedó en y=' + my + ' (x=' + mx + ')');
  }

  {
    /* y al cortarla, se cae: si no, no estaba amarrado — estaba clavado */
    const m = mundo(40, 40, 7);
    const libre = cuelga(m, 20, 10);
    m.pon(20, libre, IDX.metal);
    repisa(m, 39);
    corre(m, 40);
    for(let y = 1; y <= 5; y++) m.pon(20, y, IDX.vacio);
    corre(m, 120);
    const [, my] = donde(m, IDX.metal);
    ok('al CORTAR la cuerda, el peso se cae', my >= 36, 'el peso quedó en y=' + my);
  }

  {
    /* EL PÉNDULO. Lo que se mide no es que se mueva —eso lo hace cualquier
       cosa empujada— sino que VUELVA: que pase del otro lado del reposo. Un
       peso que se va y se queda en la orilla no es un péndulo, es un peso
       colgado torcido, y eso era lo que salía antes. */
    const m = mundo(60, 40, 7);
    const libre = cuelga(m, 30, 20);
    m.pon(30, libre, IDX.metal);
    corre(m, 30);
    const [rx, ry] = donde(m, IDX.metal);
    m.vx[m.i(rx, ry)] = 2.5;
    let masDer = rx, masIzq = rx, sueltoEn = -1;
    for(let i = 0; i < 140; i++){
      m.paso();
      const [bx, by] = donde(m, IDX.metal);
      if(bx < 0) break;
      masDer = Math.max(masDer, bx); masIzq = Math.min(masIzq, bx);
      if(by > ry + 2 && sueltoEn < 0) sueltoEn = i;
    }
    ok('empujado de lado, el peso se VA', masDer >= rx + 3,
       'llegó hasta x=' + masDer + ' desde x=' + rx);
    ok('y VUELVE: pasa del otro lado del reposo', masIzq <= rx - 1,
       'lo más lejos por la izquierda fue x=' + masIzq + ' (reposo x=' + rx + ')');
    ok('y en todo el columpio NO se suelta de la cuerda', sueltoEn < 0,
       'se soltó en el paso ' + sueltoEn);
  }

  {
    /* la cuerda tiene que SEGUIR al peso. Con la tensión mal repartida se
       columpiaba la punta y los eslabones de arriba se quedaban tiesos, que
       es lo que se ve feo aunque el peso haga el arco correcto. */
    const m = mundo(60, 40, 7);
    const libre = cuelga(m, 30, 20);
    m.pon(30, libre, IDX.metal);
    corre(m, 30);
    const [rx, ry] = donde(m, IDX.metal);
    m.vx[m.i(rx, ry)] = 2.5;
    let torcidos = 0;
    for(let i = 0; i < 26; i++) m.paso();
    for(let y = 1; y <= 20; y++) if(m.t[m.i(30, y)] !== IDX.cuerda) torcidos++;
    ok('la cuerda se dobla y sigue al peso, no se queda tiesa', torcidos >= 4,
       'sólo ' + torcidos + ' eslabones se salieron de la vertical');
  }
}

seccion('el aire acarrea, el agua se nivela, la sal se reparte');
{
  /* Carlos: «el aire (vacío) no transfiere el calor, así que una resistencia
     muy cerca de una batería no la calienta nada». Medido antes de tocar:
     a UNA celda de una fuente a 900° el aire marcaba 32.8° y a DOS ya estaba
     en el ambiente. */
  const m = mundo(40, 40, 7);
  for(let x = 0; x < 40; x++) m.pon(x, 39, IDX.muro);
  m.pon(10, 30, IDX.muro);
  for(let i = 0; i < 200; i++){ m.temp[m.i(10, 29)] = 900; m.paso(); }
  const a3 = m.temp[m.i(10, 26)], a6 = m.temp[m.i(10, 23)];
  /* el umbral es 35 y no más: son 13° POR ENCIMA del ambiente donde antes
     había exactamente 22.0, o sea cero. Y no se pone más alto a propósito —
     el aire tiene que dejar pasar el calor, no repartirlo por toda la sala. */
  ok('el calor cruza el aire y llega a tres celdas', a3 > 35,
     'a 3 celdas: ' + a3.toFixed(1) + '° (antes del arreglo: 22.0°, el ambiente)');
  ok('y se va apagando con la distancia, no llena la sala', a6 < a3 && a6 < 35,
     'a 3 celdas ' + a3.toFixed(1) + '° · a 6 celdas ' + a6.toFixed(1) + '°');

  /* ⚠ Y ESTA ES LA PAREJA DE LA DE ARRIBA, sin ella la de arriba se «arregla»
     subiendo un número hasta que el aire guarde calor para siempre — que es
     de lo que Carlos se quejó DOS VECES antes. Las dos juntas o ninguna. */
  const f = mundo(30, 30, 7);
  for(let y = 13; y < 17; y++) for(let x = 13; x < 17; x++) f.temp[f.i(x, y)] = 900;
  corre(f, 60);
  ok('una mancha caliente suelta en el aire se enfría sola', f.temp[f.i(15, 15)] < 30,
     'tras 60 pasos sigue a ' + f.temp[f.i(15,15)].toFixed(1) + '°');
}

{
  /* «El agua suele volverse una pila en lugar de distribuirse bien.» Medido:
     el perfil quedaba 1111222222333334444333333222222111 y NO se movía —
     idéntico en el paso 100 y en el 1200. */
  const m = mundo(40, 40, 7);
  for(let x = 2; x <= 37; x++) m.pon(x, 38, IDX.muro);
  for(let y = 2; y <= 38; y++){ m.pon(2, y, IDX.muro); m.pon(37, y, IDX.muro); }
  for(let y = 10; y < 30; y++) for(let x = 18; x < 22; x++) m.pon(x, y, IDX.agua);
  corre(m, 600);
  const alturas = [];
  for(let x = 3; x < 37; x++){ let h = 0;
    for(let y = 2; y < 38; y++) if(m.t[m.i(x, y)] === IDX.agua){ h = 38 - y; break; }
    alturas.push(h); }
  const desnivel = Math.max(...alturas) - Math.min(...alturas);
  ok('el agua vertida se NIVELA en vez de quedarse en pila', desnivel <= 2,
     'desnivel de ' + desnivel + ' celdas · perfil ' + alturas.join(''));

  /* Y el freno: dentro de un tubo LLENO no se agita, que es el defecto viejo
     —el canal de agua salada rompiendo la cadena eléctrica cada cuadro—. */
  const t = mundo(30, 20, 7);
  for(let x = 5; x <= 25; x++){ t.pon(x, 9, IDX.muro); t.pon(x, 12, IDX.muro); }
  for(let y = 9; y <= 12; y++){ t.pon(5, y, IDX.muro); t.pon(25, y, IDX.muro); }
  for(let y = 10; y <= 11; y++) for(let x = 6; x < 25; x++) t.pon(x, y, IDX.agua);
  corre(t, 40);
  const foto = t.t.slice();
  corre(t, 40);
  let movidas = 0;
  for(let k = 0; k < foto.length; k++) if(foto[k] !== t.t[k]) movidas++;
  ok('pero en un tubo LLENO se queda quieta, sin oleaje eterno', movidas === 0,
     movidas + ' celdas cambiaron en 40 pasos sin que pasara nada');
}

{
  /* «La sal no se vuelve agua salada, sólo una capita.» Medido: 10 celdas de
     sal daban 10 de salada exactas —una por una— y las otras 398 seguían
     dulces. */
  const m = mundo(30, 40, 7);
  for(let x = 2; x <= 27; x++){ m.pon(x, 38, IDX.muro); m.pon(x, 2, IDX.muro); }
  for(let y = 2; y <= 38; y++){ m.pon(2, y, IDX.muro); m.pon(27, y, IDX.muro); }
  for(let y = 20; y < 37; y++) for(let x = 3; x < 27; x++) m.pon(x, y, IDX.agua);
  for(let x = 10; x < 20; x++) m.pon(x, 10, IDX.sal);
  corre(m, 600);
  const dulce = cuantos(m, 'agua'), salada = cuantos(m, 'salada');
  ok('un puñado de sal sala TODA el agua, no una capita', salada > dulce * 4,
     'quedaron ' + dulce + ' dulces contra ' + salada + ' saladas');

  /* y no de golpe: se ve avanzar el frente */
  const r = mundo(30, 40, 7);
  for(let x = 2; x <= 27; x++){ r.pon(x, 38, IDX.muro); r.pon(x, 2, IDX.muro); }
  for(let y = 2; y <= 38; y++){ r.pon(2, y, IDX.muro); r.pon(27, y, IDX.muro); }
  for(let y = 20; y < 37; y++) for(let x = 3; x < 27; x++) r.pon(x, y, IDX.agua);
  for(let x = 10; x < 20; x++) r.pon(x, 10, IDX.sal);
  corre(r, 40);
  ok('y tarda: a los 40 pasos todavía queda agua dulce', cuantos(r, 'agua') > 0,
     'ya no quedaba ni una dulce a los 40 pasos');
}

seccion('el explosivo es proporcional y la onda no se inventa energía');
{
  /* Carlos: «todos los explosivos explotan demasiado fuerte y, sin contar el
     muro, todo material se destruye SIN IMPORTAR LA CANTIDAD de explosivo».
     Medido antes de tocar nada, contra un suelo de piedra:
         nitro  1→246  2→251  4→251  9→251  25→251  64→596
     Una sola celda de nitroglicerina destruía 246 celdas de piedra. */
  const dana = (n) => {
    const m = mundo(80, 80, 7);
    for(let x = 0; x < 80; x++) for(let y = 50; y < 80; y++) m.pon(x, y, IDX.piedra);
    const lado = Math.ceil(Math.sqrt(n)); let p = 0;
    for(let dy = 0; dy < lado && p < n; dy++) for(let dx = 0; dx < lado && p < n; dx++){
      m.pon(38 + dx, 49 - dy, IDX.nitro); p++; }
    const cuenta = () => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.piedra) c++; return c; };
    const antes = cuenta();
    /* UNA chispa en UNA celda: lo demás lo hace la detonación simpática.
       ⚠ Encender todas a 3000° metía en la sala un horno que NO es la
       explosión, y desde que el aire acarrea calor eso derretía el suelo
       entero — mi propia prueba acusando al motor de lo que hacía ella. */
    m.temp[m.i(38, 49)] = 2280;
    corre(m, 150);
    return antes - cuenta();
  };
  const d1 = dana(1), d16 = dana(16), d64 = dana(64), d256 = dana(256);
  ok('una celda suelta de nitro NO arrasa la sala', d1 < 10,
     'destruyó ' + d1 + ' piedras (antes del arreglo: 246)');
  ok('más explosivo hace MÁS daño', d64 > d16 && d16 > d1,
     '1→' + d1 + ' · 16→' + d16 + ' · 64→' + d64);
  ok('y sigue creciendo sin dispararse con cargas enormes', d256 > d64 && d256 < 400,
     '64→' + d64 + ' · 256→' + d256);
}

{
  /* ⚠ LA LEY QUE FALTABA ESCRITA: una onda no puede ser más fuerte que lo que
     la creó. La pareja onda + rotura se realimentaba —la celda revienta, el
     sitio pasa de transmitir 0.23 a transmitir 1 con toda la presión dentro,
     y esa patada rompe a la siguiente—, y de un empujón de 3 000 salían 147
     MIL MILLONES de presión con la sala arrasada. La ecuación SOLA es estable
     en los cuatro materiales, y romper solo también: se dispara el par. */
  for(const mat of ['piedra', 'metal']){
    const m = mundo(80, 80, 7);
    for(let y = 0; y < 80; y++) for(let x = 0; x < 80; x++) m.pon(x, y, IDX[mat]);
    m.presiona(40, 40, 3000);
    let pico = 0;
    for(let i = 0; i < 200; i++){ m.paso();
      for(let k = 0; k < m.pres.length; k++){ const a = Math.abs(m.pres[k]); if(a > pico) pico = a; } }
    ok('dentro de ' + mat + ', la onda nunca pasa de lo que la creó', pico <= 3200,
       'llegó a ' + pico.toFixed(0) + ' desde 3 000');
  }
}

{
  /* «Las ondas a veces se pasan por los huevos las paredes.» Con una
     explosión de verdad —no un número inventado— cada material deja pasar lo
     suyo y la pared sigue en pie. */
  const cruza = (mat) => {
    const m = mundo(100, 40, 7);
    for(let y = 0; y < 40; y++) for(let g = 0; g < 3; g++) m.pon(50 + g, y, IDX[mat]);
    const enteros = () => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX[mat]) c++; return c; };
    const a0 = enteros();
    for(let dy = 0; dy < 3; dy++) for(let dx = 0; dx < 3; dx++) m.pon(44 + dx, 20 + dy, IDX.nitro);
    m.temp[m.i(44, 20)] = 2280;
    let antes = 0, desp = 0;
    for(let i = 0; i < 150; i++){ m.paso();
      for(let y = 0; y < 40; y++){
        antes = Math.max(antes, Math.abs(m.pres[m.i(48, y)]));
        desp  = Math.max(desp,  Math.abs(m.pres[m.i(57, y)])); } }
    return { paso: 100 * desp / (antes || 1), queda: enteros(), de: a0 };
  };
  const mu = cruza('muro'), me = cruza('metal'), pi = cruza('piedra');
  ok('el MURO no deja pasar nada de la onda', mu.paso < 1, mu.paso.toFixed(0) + '% pasó');
  ok('una pared de metal deja pasar poco', me.paso > 1 && me.paso < 35, me.paso.toFixed(0) + '% pasó');
  ok('y las paredes SIGUEN EN PIE tras la explosión',
     me.queda === me.de && pi.queda === pi.de,
     'metal ' + me.queda + '/' + me.de + ' · piedra ' + pi.queda + '/' + pi.de);
}

seccion('cámaras selladas: el aire cuenta, se comprime y revienta');
{
  const caja = (m, x0, y0, x1, y1, mat) => {
    for(let x = x0; x <= x1; x++){ m.pon(x, y0, IDX[mat]); m.pon(x, y1, IDX[mat]); }
    for(let y = y0; y <= y1; y++){ m.pon(x0, y, IDX[mat]); m.pon(x1, y, IDX[mat]); }
  };
  /* repasar con el dedo, que es lo que hace Carlos en el teléfono */
  const bombea = (m, gas, x0, y0, x1, y1, pasos, ojo) => {
    for(let n = 1; n <= pasos; n++){
      if(n % 2 === 0) for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++){
        const k = m.i(x, y); if(m.t[k] === IDX[gas] || m.t[k] === IDX.vacio) m.pon(x, y, IDX[gas]); }
      m.paso(); if(ojo) ojo(m, n);
    }
  };

  /* «Las presiones en un espacio cerrado deben incluir el aire para poder
     aumentar la presión en un lugar y que explote al rebasarse.» Medido antes
     de tocar nada: una caja de muro llena de gas, metiendo más gas doscientos
     pasos, marcaba presión CERO. */
  {
    const m = mundo(40, 40, 7);
    for(let x = 0; x < 40; x++) m.pon(x, 39, IDX.muro);
    caja(m, 10, 18, 30, 38, 'piedra');
    const pared = () => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.piedra) c++; return c; };
    const a0 = pared();
    let pico = 0;
    bombea(m, 'gasnat', 11, 19, 29, 37, 120, (mm) => {
      const c = mm.camara[mm.i(20, 28)]; if(c) pico = Math.max(pico, mm.camaraP[c - 1]); });
    ok('meter gas en un sitio sellado SUBE la presión', pico > 400, 'llegó a ' + pico.toFixed(0));
    ok('y la caja de piedra REVIENTA por dentro', pared() < a0 * 0.75,
       'quedaron ' + pared() + ' de ' + a0 + ' celdas de pared');
  }

  /* ⚠ y la pareja: una habitación ABIERTA no se presuriza sola. Sin esta
     prueba, «que suba la presión» se cumple subiendo un número hasta que todo
     el mundo está a presión siempre. */
  {
    const m = mundo(40, 40, 7);
    for(let x = 0; x < 40; x++) m.pon(x, 39, IDX.muro);
    corre(m, 200);
    let s = 0; for(let k = 0; k < m.pres.length; k++) s += Math.abs(m.pres[k]);
    ok('una habitación abierta NO se presuriza sola', s < 1, 'presión total ' + s.toFixed(2));
  }

  /* «Someter a tanta presión carbono que se vuelva diamante.» */
  {
    const m = mundo(40, 40, 7);
    caja(m, 10, 10, 30, 30, 'muro');
    for(let x = 12; x < 28; x++) m.pon(x, 29, IDX.carbon);
    bombea(m, 'gasnat', 11, 11, 29, 28, 400);
    ok('el carbón apretado se vuelve DIAMANTE', cuantos(m, 'diamante') > 8,
       'salieron ' + cuantos(m, 'diamante') + ' diamantes');
    /* ⚠ Y QUE SOBREVIVA. La primera versión los hacía y a los sesenta pasos
       los dieciséis habían desaparecido, triturados por la misma presión que
       los creó: la rotura comparaba la presión de fuera con la de dentro, y un
       objeto sumergido tenía 11 000 alrededor y 0 adentro. Un cuerpo rodeado
       de presión por igual no siente fuerza neta — por eso un buzo no se
       aplasta y un submarino sí. */
    ok('y NO se tritura con la misma presión que lo hizo', cuantos(m, 'diamante') > 8,
       'quedaron ' + cuantos(m, 'diamante'));
  }

  /* «Fusionar hidrógeno y oxígeno» — sin chispa, sólo apretando. */
  {
    const m = mundo(40, 40, 7);
    caja(m, 10, 10, 30, 30, 'muro');
    for(let y = 11; y < 30; y++) for(let x = 11; x < 30; x++)
      m.pon(x, y, (x % 2) ? IDX.hidrogeno : IDX.oxigeno);
    let agua = 0;
    for(let n = 1; n <= 300; n++){
      if(n % 2 === 0) for(let y = 11; y < 30; y++) for(let x = 11; x < 30; x++){
        const k = m.i(x, y), tt = m.t[k];
        if(tt === IDX.hidrogeno || tt === IDX.oxigeno) m.pon(x, y, tt); }
      m.paso();
      agua = Math.max(agua, cuantos(m, 'agua') + cuantos(m, 'vapor'));
    }
    ok('hidrógeno y oxígeno APRETADOS hacen agua sin chispa', agua > 20,
       'lo más que hubo fue ' + agua);
  }

  /* «O uranio que explote.» */
  {
    const m = mundo(40, 40, 7);
    caja(m, 10, 10, 30, 30, 'muro');
    for(let x = 14; x < 26; x++) m.pon(x, 29, IDX.uranio);
    const u0 = cuantos(m, 'uranio');
    bombea(m, 'gasnat', 11, 11, 29, 28, 300);
    ok('el uranio apretado revienta', cuantos(m, 'uranio') < u0 / 2,
       'de ' + u0 + ' quedaron ' + cuantos(m, 'uranio'));
  }

  /* y que el termómetro lo DIGA, que es la otra mitad de «la presión no se
     nota»: un número que no se ve no existe para quien juega */
  {
    const m = mundo(40, 40, 7);
    caja(m, 10, 10, 30, 30, 'muro');
    for(let y = 11; y < 30; y++) for(let x = 11; x < 30; x++) m.pon(x, y, IDX.gasnat);
    for(let i = 0; i < 3; i++) m.pon(20, 20, IDX.gasnat);
    corre(m, 20);
    const r = m.informe(20, 20);
    ok('el termómetro dice que el recinto está sellado', r.sellado === true);
    ok('y cuánto gas lleva metido esa celda', r.moles >= 3, 'dice ' + r.moles);
  }
}

seccion('cuerpos rígidos: lo que está pegado cae junto');
{
  /* Carlos: «los sólidos se tratan como partículas al caer o agarrarlos, en
     lugar de unirse con las del mismo tipo y volverse un solo cuerpo, si me
     entiendes». Sí: una piedra de veinte celdas caía como veinte piedras. */
  const bloque = (rigido) => {
    const m = mundo(40, 60, 3);
    m.rigido = rigido;
    repisa(m, 59);
    /* ⚠ LA PIEZA CAE SOBRE UN PILAR ESTRECHO, y no al suelo raso. Con el suelo
       raso la prueba no distinguía nada: la L llegaba entera en los dos casos
       porque cae recta y aterriza a la vez. Lo que separa un CUERPO de un
       montón de píxeles es qué pasa cuando sólo una parte tiene apoyo: rígida
       se queda encima del pilar, suelta se derrama por los lados. */
    for(let y = 40; y < 59; y++){ m.pon(19, y, IDX.muro); m.pon(20, y, IDX.muro); }
    for(let y = 10; y < 14; y++) for(let x = 12; x < 28; x++) m.pon(x, y, IDX.piedra);
    for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.piedra) m.suelto[k] = 1;
    corre(m, 200);
    let alto = 99, bajo = 0;
    for(let y = 0; y < 60; y++) for(let x = 0; x < 40; x++)
      if(m.t[m.i(x, y)] === IDX.piedra){ if(y < alto) alto = y; if(y > bajo) bajo = y; }
    return { alto, bajo, grosor: bajo - alto + 1 };
  };
  const con = bloque(true), sin = bloque(false);
  ok('una plancha que cae sobre un pilar se queda ENTERA encima', con.grosor === 4,
     'quedó de ' + con.grosor + ' celdas de grosor (empezó de 4) entre y=' + con.alto + ' e y=' + con.bajo);
  /* ⚠ y la pareja, que es la que prueba que el interruptor SIRVE: apagado,
     tiene que volver a comportarse como antes. Sin ella, «rígido» podría estar
     encendido siempre y la prueba de arriba pasaría igual. */
  ok('y con el interruptor APAGADO se derrama por los lados del pilar',
     sin.grosor > con.grosor,
     'apagado ' + sin.grosor + ' de grosor · encendido ' + con.grosor);

  /* soldar: la estructura de varios materiales que pidió por su nombre */
  {
    const m = mundo(40, 40, 3);
    repisa(m, 39);
    for(let x = 10; x < 20; x++) m.pon(x, 20, IDX.metal);
    for(let x = 10; x < 20; x++) m.pon(x, 21, IDX.madera);
    m.pon(15, 19, IDX.piedra);          /* el «proyectil» posado encima */
    /* se pinta EXACTAMENTE la estructura: las dos filas del arma, y ni una
       celda más. La piedra de encima se queda fuera porque no la pintaste —
       que es justo lo que Carlos pidió poder decidir. */
    let n = 0, g = 0;
    for(const yy of [20, 21]) for(let x = 10; x < 20; x++){ n += m.suelda(x, yy, 0, g); g = m.soldadoUltimo; }
    ok('soldar con la brocha agarra lo que pintas', n > 15, 'soldó ' + n + ' celdas');
    ok('y la piedra de encima NO queda dentro de la estructura',
       m.soldado[m.i(15, 19)] !== m.soldado[m.i(12, 20)],
       'la piedra quedó en el grupo ' + m.soldado[m.i(15,19)]);
    ok('y se puede deshacer', m.dessuelda(12, 20) > 15 && m.soldado[m.i(12,20)] === 0);
    /* y lo que de verdad compra: soldada, la estructura NO se lleva puesto lo
       que tenga encima cuando la muevan */
    const g2 = m.soldado[m.i(15, 19)];
    ok('lo soldado y lo no soldado son piezas distintas', g2 === 0);
  }
}

console.log('\n' + (mal ? '✗' : '✓') + '  ' + bien + ' pasan · ' + mal + ' fallan');
process.exit(mal ? 1 : 0);
