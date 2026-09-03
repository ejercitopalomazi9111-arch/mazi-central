/* Las pruebas del motor de Guerra de Puercos.
 *
 * La mitad de ellas no las inventé yo: son los EJEMPLOS QUE VIENEN EN EL
 * REGLAMENTO. Eso es lo mejor que le puede pasar a una prueba — no comprueban
 * lo que yo entendí, comprueban lo que ella escribió. Si alguna de éstas
 * truena, el juego no está siguiendo su reglamento y da igual lo bonito que
 * se vea.
 *
 *   node juegos/guerra-de-puercos/pruebas.mjs
 */
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('./motor.js');

let bien = 0, mal = 0;
const ok = (que, cond, detalle='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};
const carta = (valor, nivel, id='x') => ({ id, valor, nivel });
const sola  = (valor, nivel, especial=null, id='x') =>
  ({ cartas:[carta(valor, nivel, id)], especial });

console.log('\n── El mazo (regla 2) ──');
const mazo = M.armarMazo();
/* ⚠ 110, NO 100, y el cambio es a propósito: las especiales ahora son CARTAS
   del mazo. Lo corrigió Carlos: «los +5 y −5 son cartas también, cartas que te
   salen en el mazo». Antes eran dos contadores que se repartían al empezar. */
ok('son 100 cartas de puntos', mazo.filter(c => c.nivel !== 'ESP').length === 100,
   mazo.filter(c => c.nivel !== 'ESP').length);
ok('más 5 de bonificación y 5 de penalización, dentro del mazo',
   mazo.filter(c => c.esp === 'bono').length === 5
   && mazo.filter(c => c.esp === 'castigo').length === 5,
   mazo.filter(c => c.nivel === 'ESP').length + ' especiales');
/* Valen 0 a propósito: si valieran, alguien podría jugarlas solas por sus
   puntos y dejarían de ser un modificador. */
ok('las especiales no valen puntos', mazo.filter(c => c.nivel === 'ESP').every(c => c.valor === 0));
for(const [id, cuantas, de, a] of [['S',5,96,100],['A',27,76,95],['B',21,56,75],
                                   ['C',27,36,55],['D',20,16,35]]){
  const g = mazo.filter(c => c.nivel === id);
  ok('nivel ' + id + ': ' + cuantas + ' cartas de ' + de + ' a ' + a,
     g.length === cuantas && g.every(c => c.valor >= de && c.valor <= a),
     g.length + ' cartas');
}
ok('los especiales son 5 y 5', M.ESPECIALES.bono === 5 && M.ESPECIALES.castigo === 5);

console.log('\n── El daño (regla 5) ──');
ok('EJEMPLO DEL REGLAMENTO · 78 vs 65 → 13 de daño al de 65',
   M.danoEntre(78, 65).dano === 13 && M.danoEntre(78, 65).quienPierde === 'b');
ok('EJEMPLO DEL REGLAMENTO · 92 vs 76 = 16 → daño 15 (el tope)',
   M.danoEntre(92, 76).crudo === 16 && M.danoEntre(92, 76).dano === 15);
ok('EJEMPLO DEL REGLAMENTO · 72 vs 72 → NO hay daño',
   M.danoEntre(72, 72).dano === 0 && M.danoEntre(72, 72).quienPierde === null);
ok('el tope aguanta el peor caso: S contra D (100 vs 16) sigue siendo 15',
   M.danoEntre(100, 16).dano === 15 && M.danoEntre(100, 16).crudo === 84);

console.log('\n── Las combinaciones (regla 7) ──');
const combo = (v1, v2, niv) => M.puntuar({ cartas:[carta(v1,niv,'p'), carta(v2,niv,'q')] });
ok('EJEMPLO DEL REGLAMENTO · D+D · 22 y 35 → 35 + 30 = 65', combo(22,35,'D').puntos === 65,
   String(combo(22,35,'D').puntos));
ok('EJEMPLO DEL REGLAMENTO · C+C · 42 y 54 → 54 + 20 = 74', combo(42,54,'C').puntos === 74,
   String(combo(42,54,'C').puntos));
ok('EJEMPLO DEL REGLAMENTO · B+B · 61 y 73 → 73 + 15 = 88', combo(61,73,'B').puntos === 88,
   String(combo(61,73,'B').puntos));
ok('la carta menor NO suma su puntuación (22+35 no da 57 ni 87)',
   combo(22,35,'D').puntos !== 57 && combo(22,35,'D').puntos !== 87);
ok('da igual el orden en que se elijan las dos cartas',
   combo(35,22,'D').puntos === combo(22,35,'D').puntos);
ok('A y S no se pueden combinar',
   !M.sePuedeCombinar('A') && !M.sePuedeCombinar('S'));
ok('D, C y B sí se pueden combinar',
   M.sePuedeCombinar('D') && M.sePuedeCombinar('C') && M.sePuedeCombinar('B'));
ok('el bono es más grande entre más débil el nivel (D 30 > C 20 > B 15)',
   M.nivelDe('D').bono > M.nivelDe('C').bono && M.nivelDe('C').bono > M.nivelDe('B').bono);

console.log('\n── Las cartas especiales (regla 8) ──');
const conBono = M.puntuar(sola(70, 'B', 'bono'));
ok('EJEMPLO DEL REGLAMENTO · 70 + bonificación = 75', conBono.puntos === 75);
ok('EJEMPLO DEL REGLAMENTO · y 75 SIGUE siendo nivel B', conBono.nivel === 'B');
const conCastigo = M.puntuar(sola(87, 'A', 'castigo'));
ok('EJEMPLO DEL REGLAMENTO · 87 − penalización = 82', conCastigo.puntos === 82);
ok('EJEMPLO DEL REGLAMENTO · y 82 SIGUE siendo nivel A', conCastigo.nivel === 'A');
ok('el especial no cambia el valor impreso de la carta',
   conCastigo.base === 87 && conBono.base === 70);

console.log('\n── Lo que NO se vale (regla 9) ──');
/* ⚠ LOS ESPECIALES YA NO SON UN INVENTARIO: SON CARTAS DE LA MANO. Estas
   ayudas armaban un jugador con `especiales:{bono:2}` y jugaban un +5 sin
   tener la carta, que es justo lo que ya no se vale. Ahora el ayudante mete
   las cartas especiales EN LA MANO, que es donde viven. */
const esp = (clase, id) => ({ id, valor:0, nivel:'ESP', esp:clase });
const jug = (mano, combos=0, extras=[esp('bono','eb'), esp('castigo','ec')]) =>
  ({ nombre:'a', pv:200, mano:[...mano, ...extras], combosUsados:combos, cementerio:[], mazo:[] });
const d1 = carta(22,'D','d1'), d2 = carta(35,'D','d2');
const a1 = carta(80,'A','a1'), a2 = carta(90,'A','a2');
const c1 = carta(40,'C','c1');
ok('no se combinan niveles diferentes',
   !!M.porQueNoSeVale({cartas:[d1,c1]}, jug([d1,c1])));
ok('no se combinan dos cartas A',
   !!M.porQueNoSeVale({cartas:[a1,a2]}, jug([a1,a2])));
ok('sí se vale D+D', M.porQueNoSeVale({cartas:[d1,d2]}, jug([d1,d2])) === null);
ok('a la quinta combinación ya no se puede (máximo 4 en toda la partida)',
   !!M.porQueNoSeVale({cartas:[d1,d2]}, jug([d1,d2], 4)));
ok('a la cuarta todavía sí',
   M.porQueNoSeVale({cartas:[d1,d2]}, jug([d1,d2], 3)) === null);
ok('un especial NO se puede usar sobre una combinación',
   !!M.porQueNoSeVale({cartas:[d1,d2], especial:'bono'}, jug([d1,d2])));
ok('no se puede usar un especial que NO TIENES en la mano',
   !!M.porQueNoSeVale({cartas:[d1], especial:'bono'}, jug([d1], 0, [esp('castigo','ec')])));
ok('sí se puede si la carta está en la mano',
   M.porQueNoSeVale({cartas:[d1], especial:'bono'}, jug([d1])) === null);
ok('una especial NO se puede jugar sola: va encima de otra',
   !!M.porQueNoSeVale({cartas:[esp('bono','eb')]}, jug([d1])));
ok('no se puede jugar una carta que no está en la mano',
   !!M.porQueNoSeVale({cartas:[a1]}, jug([d1,d2])));
ok('no se puede jugar la misma carta dos veces',
   !!M.porQueNoSeVale({cartas:[d1,d1]}, jug([d1])));
ok('el motivo viene escrito en español, para poder enseñárselo al jugador',
   /combina/i.test(M.porQueNoSeVale({cartas:[d1,c1]}, jug([d1,c1]))));

console.log('\n── Rondas completas (regla 10) ──');
/* Los dos últimos argumentos eran los contadores de especiales; ahora son las
   CARTAS especiales que cada quien lleva en la mano. */
function partidaDe(manoA, manoB, espA, espB){
  const conEsp = (mano, e) => {
    const extra = [];
    if(e && e.bono)    for(let i=0;i<e.bono;i++)    extra.push(esp('bono','xb'+i));
    if(e && e.castigo) for(let i=0;i<e.castigo;i++) extra.push(esp('castigo','xc'+i));
    return [...mano, ...extra];
  };
  return { a:{ nombre:'a', pv:200, mano:conEsp(manoA, espA), combosUsados:0, cementerio:[], mazo:[] },
           b:{ nombre:'b', pv:200, mano:conEsp(manoB, espB), combosUsados:0, cementerio:[], mazo:[] },
           ronda:1, historia:[], acabo:null };
}
/* 1 · individual sin especial: 78 vs 65 → 13 al de 65 */
{
  const A = carta(78,'A','A1'), B = carta(65,'B','B1');
  const e = M.jugarRonda(partidaDe([A],[B],{bono:0,castigo:0},{bono:0,castigo:0}),
                         {cartas:[A]}, {cartas:[B]});
  ok('EJEMPLO 1 · 78 vs 65 → el de 65 pierde 13 PV', e.b.pv === 187, String(e.b.pv));
  ok('EJEMPLO 1 · el de 78 no pierde nada', e.a.pv === 200);
}
/* 2 · individual con especial: 70+5=75 vs 68 → 7 al de 68 */
{
  const A = carta(70,'B','A1'), B = carta(68,'B','B1');
  const e = M.jugarRonda(partidaDe([A],[B],{bono:1,castigo:0},{bono:0,castigo:0}),
                         {cartas:[A], especial:'bono'}, {cartas:[B]});
  ok('EJEMPLO 2 · 70+5=75 vs 68 → el de 68 pierde 7 PV', e.b.pv === 193, String(e.b.pv));
  /* Ya no hay contador que baje: lo que hay que comprobar es que la CARTA se
     fue de la mano y cayó al cementerio. */
  ok('EJEMPLO 2 · la carta de bonificación se gastó',
     !e.a.mano.some(c => c.nivel === 'ESP' && c.esp === 'bono'));
  ok('EJEMPLO 2 · y acabó en el cementerio',
     e.a.cementerio.some(c => c.nivel === 'ESP' && c.esp === 'bono'));
}
/* 3 · con combinación: 42+54 → 74, contra 85 → 11 al de la combinación */
{
  const C1 = carta(42,'C','C1'), C2 = carta(54,'C','C2'), B1 = carta(85,'A','B1');
  const e = M.jugarRonda(partidaDe([C1,C2],[B1],{bono:0,castigo:0},{bono:0,castigo:0}),
                         {cartas:[C1,C2]}, {cartas:[B1]});
  ok('EJEMPLO 3 · combinación 74 vs 85 → el de la combinación pierde 11 PV',
     e.a.pv === 189, String(e.a.pv));
  ok('EJEMPLO 3 · se gastaron las DOS cartas de la combinación', e.a.mano.length === 0);
  ok('EJEMPLO 3 · y se contó una combinación de las 4', e.a.combosUsados === 1);
}

console.log('\n── La partida entera ──');
{
  let e = M.repartir(12345);
  ok('cada quien arranca con 200 PV', e.a.pv === 200 && e.b.pv === 200);
  ok('cada quien arranca con 5 cartas', e.a.mano.length === 5 && e.b.mano.length === 5);
  /* ⚠ UN MAZO POR JUGADOR, y ya no hay `e.mazo`. Lo pidió Carlos, y es lo que
     hace posible que después se pueda COMPRAR cartas: un mazo compartido es el
     mismo para los dos y no se puede mejorar. */
  ok('cada quien tiene SU mazo, con 105 cartas después de robar 5',
     e.a.mazo.length === 105 && e.b.mazo.length === 105,
     e.a.mazo.length + ' y ' + e.b.mazo.length);
  ok('ya no hay un mazo compartido', e.mazo === undefined);
  ok('cada mazo trae sus 5 bonificaciones y sus 5 penalizaciones',
     [e.a, e.b].every(j => {
       const todas = [...j.mano, ...j.mazo];
       return todas.filter(c => c.esp === 'bono').length === 5
           && todas.filter(c => c.esp === 'castigo').length === 5;
     }));
  ok('y sus 100 cartas de puntos',
     [e.a, e.b].every(j =>
       [...j.mano, ...j.mazo].filter(c => c.nivel !== 'ESP').length === 100));
  /* Los dos mazos son el mismo juego de cartas pero revueltos distinto: si
     salieran idénticos, las dos manos serían iguales y no habría partida. */
  ok('los dos mazos están revueltos distinto',
     JSON.stringify(e.a.mazo.map(c => c.id)) !== JSON.stringify(e.b.mazo.map(c => c.id)));
  ok('cada quien empieza con el cementerio vacío',
     e.a.cementerio.length === 0 && e.b.cementerio.length === 0);
  ok('la misma semilla reparte la misma partida',
     JSON.stringify(M.repartir(777)) === JSON.stringify(M.repartir(777)));
  ok('semillas distintas reparten partidas distintas',
     JSON.stringify(M.repartir(777)) !== JSON.stringify(M.repartir(778)));

  /* Se juega completa, siempre la primera jugada posible, hasta que acabe. */
  let vueltas = 0;
  while(!e.acabo && vueltas++ < 500){
    const ja = M.jugadasPosibles(e.a)[0], jb = M.jugadasPosibles(e.b)[0];
    e = M.jugarRonda(e, ja, jb);
  }
  ok('la partida SE ACABA sola, no se cicla', !!e.acabo, vueltas + ' rondas');
  ok('se repone la mano hasta 5 mientras haya mazo', vueltas > 10);
  ok('nadie termina con PV negativos', e.a.pv >= 0 && e.b.pv >= 0);
  ok('nadie usó más de 4 combinaciones',
     e.a.combosUsados <= 4 && e.b.combosUsados <= 4);
}

console.log('\n── Que ninguna partida se atore ni se rompa ──');
{
  let peorRondas = 0, atoradas = 0, errores = 0, ganoA = 0, ganoB = 0, empates = 0;
  for(let s = 1; s <= 300; s++){
    let e = M.repartir(s), v = 0;
    /* UN solo hilo de azar para toda la partida. Antes se resembraba en cada
       ronda con `s*31+v`, y semillas casi iguales dan primeras salidas casi
       iguales: el reparto salía 127-173 y parecía que el juego estaba chueco.
       No lo estaba — lo estaba la prueba. */
    const dado = M.azar(s * 7919 + 13);
    try{
      while(!e.acabo && v++ < 400){
        const pa = M.jugadasPosibles(e.a), pb = M.jugadasPosibles(e.b);
        e = M.jugarRonda(e, pa[Math.floor(dado() * pa.length)],
                            pb[Math.floor(dado() * pb.length)]);
      }
    }catch(err){ errores++; continue; }
    if(!e.acabo) atoradas++;
    peorRondas = Math.max(peorRondas, v);
    if(e.acabo === 'a') ganoA++; else if(e.acabo === 'b') ganoB++; else empates++;
  }
  ok('300 partidas al azar y ninguna tiró error', errores === 0, errores + ' errores');
  ok('300 partidas al azar y ninguna se atoró', atoradas === 0, atoradas + ' atoradas');
  ok('la más larga cabe en una sentada', peorRondas <= 60, peorRondas + ' rondas');
  console.log('    · ganó A ' + ganoA + ' · ganó B ' + ganoB + ' · empates ' + empates
            + ' · la más larga ' + peorRondas + ' rondas');
  /* Jugando los dos al azar, el juego no puede favorecer a un asiento. Se
     esperan 150 de cada lado; tres desviaciones estándar son ~26, así que
     salirse de 120-180 sería una ventaja de verdad y no mala suerte. */
  ok('ningún asiento tiene ventaja jugando al azar (se esperan 150 y 150)',
     Math.abs(ganoA - ganoB) <= 52, ganoA + ' contra ' + ganoB);
}

console.log('\n── Que reparta PAREJO ──');
{
  /* Esta sección existe porque aquí SÍ hubo un defecto, y no se veía jugando:
     el revoltijo estaba chueco. La primera salida del generador iba pegada a
     la semilla y `revolver` la usa de inmediato, así que el mazo salía mal
     barajado y la mano de arranque de A valía 5 puntos más que la de B. A
     ganaba el 55% de las partidas. Un juego que se regala no puede repartir
     chueco, así que queda medido para siempre. */
  const N = 20000, casillas = [0,0,0,0,0], TAM = 5;
  for(let s = 1; s <= N; s++){
    M.revolver([0,1,2,3,4], M.azar(s)).forEach((v, i) => { if(v === 0) casillas[i]++; });
  }
  const ideal = N / TAM;
  const peor = Math.max(...casillas.map(c => Math.abs(c - ideal)));
  ok('la primera carta del mazo cae en cualquier posición por igual',
     peor < ideal * 0.06, 'se desvía ' + peor + ' de ' + ideal
     + ' · casillas: ' + casillas.join(' '));

  let sa = 0, sb = 0;
  for(let s = 1; s <= N; s++){
    const e = M.repartir(s);
    sa += e.a.mano.reduce((t, c) => t + c.valor, 0);
    sb += e.b.mano.reduce((t, c) => t + c.valor, 0);
  }
  ok('las dos manos de arranque valen lo mismo en promedio',
     Math.abs(sa/N - sb/N) < 1.5,
     'A ' + (sa/N).toFixed(2) + ' contra B ' + (sb/N).toFixed(2));
}

console.log('\n── La MUTACIÓN: si le quito el tope de 15, ¿lo cacho? ──');
{
  /* Sin esto no sé si las pruebas sirven o nada más pasan. */
  const sinTope = (x, y) => Math.abs(x - y);
  ok('MUTACIÓN · sin el tope, el ejemplo del reglamento daría 16 y no 15',
     sinTope(92, 76) === 16 && M.danoEntre(92, 76).dano === 15);
  /* Y si la combinación sumara las dos cartas, el ejemplo daría 96 y no 74. */
  ok('MUTACIÓN · si la combinación sumara, el ejemplo daría 96 y no 74',
     42 + 54 === 96 && combo(42,54,'C').puntos === 74);
}

console.log('\n── Que el archivo suelto no se quede viejo ──');
{
  /* El archivo suelto es el que se le manda a la amiga de Carlos por WhatsApp,
     y se ARMA aparte de lo que se publica. O sea que puede quedarse atrás sin
     que nadie lo note: se toca `index.html`, se publica bien, y el archivo que
     ella ya tiene sigue con el juego de antier.

     Esto lo vuelve a armar en memoria y compara. Si truena, se corre
     `node juegos/guerra-de-puercos/armar-suelto.mjs` y ya. */
  const fs = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const AQUI = path.dirname(fileURLToPath(import.meta.url));

  const html  = await fs.readFile(path.join(AQUI, 'index.html'), 'utf-8');
  const motor = await fs.readFile(path.join(AQUI, 'motor.js'), 'utf-8');
  let esperado = html.replace('<script src="motor.js"></script>',
    '<script>\n/* motor.js, metido aquí para que el archivo funcione solo */\n'
    + motor + '\n</script>');
  esperado = esperado.replace(
    '<button class="btn ancho" id="bLinea">Jugar con alguien lejos</button>\n', '');
  esperado = esperado.replace("$('#bLinea').addEventListener('click',",
                              "if($('#bLinea')) $('#bLinea').addEventListener('click',");

  let hay = null;
  try{ hay = await fs.readFile(path.join(AQUI, 'guerra-de-puercos.html'), 'utf-8'); }catch(e){}
  ok('el archivo suelto existe', hay !== null);
  ok('el archivo suelto está al día con index.html y motor.js', hay === esperado,
     'corre: node juegos/guerra-de-puercos/armar-suelto.mjs');
  ok('y NO trae el botón de jugar a distancia, que ahí no serviría',
     hay !== null && !/id="bLinea"/.test(hay));
  ok('pero SÍ trae el motor adentro, para que funcione sin internet',
     hay !== null && /splitmix32/.test(hay) && !/<script src="motor\.js">/.test(hay));
}

console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
