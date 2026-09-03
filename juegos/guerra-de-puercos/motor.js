/* ══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS · EL MOTOR DE REGLAS
   ──────────────────────────────────────────────────────────────────────────
   Las reglas del juego y NADA de pantalla. Va aparte a propósito: las reglas
   tienen tres trampas que no se ven jugando una partida y sí se ven en una
   prueba, y una prueba no puede hacer clic en botones.

   Las tres trampas, por si algún día alguien duda del código:

   1. EL TOPE DE 15. El daño es la diferencia… hasta 15. Una carta S contra
      una D da 84 de diferencia y sólo 15 de daño. Sin el tope, dos rondas
      afortunadas acaban la partida y el juego no existe.

   2. LA COMBINACIÓN NO SUMA. Es lo que más se malentiende del reglamento, y
      está dicho con todas sus letras: «NO se suman los puntos de las dos
      cartas. Se toma SOLO la carta con mayor puntuación y se añade el bono
      del nivel». Un 42 + 54 no da 96: da 74, porque es el 54 más el bono de
      20 que da el nivel C. La otra carta se gasta y no aporta su valor.

   3. EL BONO ES AL REVÉS DE LO QUE PARECE. D da +30, C da +20 y B da +15:
      entre más débil el nivel, más grande el bono. Tiene sentido y por eso
      importa no "corregirlo": es lo que hace que las cartas malas sirvan.

   El reglamento es de la amiga de Carlos. Aquí sólo está programado.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── Los niveles, tal como vienen en el reglamento ────────────────────────
   `bono` es lo que suma la combinación de ese nivel; `null` es que ese nivel
   NO se puede combinar. */
const NIVELES = [
  { id:'S', de: 96, a:100, cuantas: 5, bono:null, color:'#8E1B2E' },
  { id:'A', de: 76, a: 95, cuantas:27, bono:null, color:'#C0392B' },
  { id:'B', de: 56, a: 75, cuantas:21, bono:  15, color:'#2C6FA8' },
  { id:'C', de: 36, a: 55, cuantas:27, bono:  20, color:'#2E7D4F' },
  { id:'D', de: 16, a: 35, cuantas:20, bono:  30, color:'#8A6516' },
];

const PV_INICIAL      = 200;
const MANO            = 5;
const DANO_TOPE       = 15;
const COMBOS_POR_JUGADOR = 4;
/* ⚠ LAS ESPECIALES SON CARTAS DEL MAZO, no un inventario que se reparte al
   empezar. Lo corrigió Carlos: «los +5 y −5 son cartas también, cartas que te
   salen en el mazo y tú decides si usarlas en tu carta; no es que sea un
   botón, es una carta que a veces te sale porque está en el mazo».

   Yo las tenía como dos contadores fijos —3 y 2 a uno, 2 y 3 al otro— y eso
   cambia el juego entero: con contadores SIEMPRE tienes especiales y sabes
   exactamente cuántas; como cartas, ocupan sitio en la mano, pueden no salirte
   nunca, y gastar una es gastar un espacio. Es otra decisión y es la suya.

   5 y 5 POR MAZO, que es lo que dice la regla 8 del reglamento de su amiga.
   Como ahora cada quien tiene su mazo, cada quien tiene sus 5 y 5. Queda
   anotado por si ella lo quiso de otro modo: se cambia aquí y en ningún otro
   lado. */
const ESPECIALES      = { bono: 5, castigo: 5 };

/* ── Azar reproducible ────────────────────────────────────────────────────
   Con semilla, a propósito: una partida se puede volver a jugar igualita para
   perseguir un defecto, y las dos personas de una partida en línea reparten
   el MISMO mazo sin mandarse las cartas. */
/* Es `splitmix32` y no el xorshift de tres líneas que tenía antes, y la razón
   está medida: con el xorshift, la PRIMERA salida después de sembrar iba
   pegada a la semilla, y `revolver` la usa de inmediato. El resultado era un
   mazo mal revuelto —de cinco elementos, el primero caía al final 6381 veces
   de 20000 en vez de 4000— y la mano de arranque del jugador A valía 5 puntos
   más que la de B en promedio. Con eso, A ganaba el 55% de las partidas
   jugando los dos al azar.

   Un juego que le regalas a un niño no puede repartir chueco. */
function azar(semilla){
  let s = (semilla >>> 0) || 1;
  return function(){
    s = (s + 0x9E3779B9) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function revolver(lista, dado){
  const a = lista.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(dado() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── El mazo · 100 cartas exactas ─────────────────────────────────────────
   Un nivel puede pedir más cartas que valores tiene (A quiere 27 en 20
   valores), así que los valores se reparten dando la vuelta: así ninguno se
   repite tres veces mientras otro no sale nunca. */
function armarMazo(){
  const cartas = [];
  let n = 0;
  for(const niv of NIVELES){
    const valores = [];
    for(let v = niv.de; v <= niv.a; v++) valores.push(v);
    for(let i = 0; i < niv.cuantas; i++){
      cartas.push({ id:'c' + (n++), valor: valores[i % valores.length], nivel: niv.id });
    }
  }
  /* Y las especiales, mezcladas con el resto. Llevan `nivel:'ESP'` para que
     nada las confunda con una carta de puntos: no valen, no combinan y no
     pueden jugarse solas. */
  for(const clase of ['bono', 'castigo']){
    for(let i = 0; i < ESPECIALES[clase]; i++){
      cartas.push({ id:'e' + (n++), valor: 0, nivel:'ESP', esp: clase });
    }
  }
  return cartas;
}

/* ⚠ SE LLAMA `esCartaEspecial` Y NO `esCartaEspecial` A PROPÓSITO. `esCartaEspecial` ya
   existe en index.html —filtra la colección por nivel— y el motor se carga en
   el MISMO ámbito global del navegador. Con los dos nombres iguales, el
   `const` de aquí choca con la `function` de allá y la página entera muere al
   cargar con «Identifier 'esCartaEspecial' has already been declared»: no se pinta
   nada, ni la portada. En node no pasa, porque ahí cada archivo es su propio
   módulo — o sea que las pruebas del motor seguían en verde con el juego
   muerto en el navegador. */
const esCartaEspecial = (c) => !!c && c.nivel === 'ESP';
const nivelDe = (id) => NIVELES.find(n => n.id === id);
/* ⚠ CON GUARDA. `nivelDe('ESP')` devuelve undefined, y sin esta guarda leer su
   `.bono` truena — y truena DENTRO de la validación, o sea que el juego se
   cae al tocar una carta en vez de decir que no se puede. */
const sePuedeCombinar = (id) => { const n = nivelDe(id); return !!n && n.bono !== null; };

/* ── La puntuación de una jugada ──────────────────────────────────────────
   Todo lo que decide quién gana la ronda sale de aquí, y sólo de aquí. */
function puntuar(jugada){
  if(!jugada || !jugada.cartas || !jugada.cartas.length) return null;

  if(jugada.cartas.length === 2){
    /* Combinación. La regla 7: se toma SÓLO la carta mayor y se le añade el
       bono del nivel. La menor se gasta sin aportar su valor. */
    const [x, y] = jugada.cartas;
    const mayor = x.valor >= y.valor ? x : y;
    const bono  = nivelDe(mayor.nivel).bono;
    return { puntos: mayor.valor + bono, base: mayor.valor, bono,
             nivel: mayor.nivel, combinada: true, especial: null };
  }

  /* Carta sola. Puede traer un especial encima —uno, nunca dos (regla 8). */
  const c = jugada.cartas[0];
  const esp = jugada.especial || null;
  const mueve = esp === 'bono' ? 5 : esp === 'castigo' ? -5 : 0;
  return { puntos: c.valor + mueve, base: c.valor, bono: mueve,
           /* «No cambia el nivel ni el valor impreso de la carta» — regla 8.
              Por eso el nivel sale de la carta y no de la puntuación. */
           nivel: c.nivel, combinada: false, especial: esp };
}

/* ── Por qué una jugada NO es legal ───────────────────────────────────────
   Devuelve el motivo en español o `null` si sí se vale. En español porque es
   lo que se le enseña al jugador: un código de error no le dice nada a un
   niño. */
function porQueNoSeVale(jugada, jugador){
  if(!jugada || !jugada.cartas || !jugada.cartas.length) return 'Falta elegir carta.';
  if(jugada.cartas.length > 2) return 'Son una o dos cartas, no más.';

  const enMano = (c) => jugador.mano.some(m => m.id === c.id);
  if(!jugada.cartas.every(enMano)) return 'Esa carta no está en tu mano.';
  /* Una especial no se juega SOLA: es un modificador. Va encima de una carta
     de puntos, y esa carta es la que pelea. */
  if(jugada.cartas.some(esCartaEspecial))
    return 'Una carta especial va ENCIMA de otra, no se juega sola.';
  if(jugada.cartas.length === 2 && jugada.cartas[0].id === jugada.cartas[1].id)
    return 'Es la misma carta dos veces.';

  if(jugada.cartas.length === 2){
    const [x, y] = jugada.cartas;
    if(x.nivel !== y.nivel) return 'Sólo se combinan dos cartas del MISMO nivel.';
    if(!sePuedeCombinar(x.nivel)) return 'El nivel ' + x.nivel + ' no se puede combinar. Sólo D+D, C+C y B+B.';
    if(jugador.combosUsados >= COMBOS_POR_JUGADOR)
      return 'Ya usaste tus ' + COMBOS_POR_JUGADOR + ' combinaciones de toda la partida.';
    if(jugada.especial) return 'Las cartas especiales no se pueden usar en combinaciones.';
  }

  if(jugada.especial){
    /* ⚠ AHORA SE COMPRUEBA CONTRA LA MANO, no contra un contador. Ésa es toda
       la corrección: antes bastaba con que te quedara saldo; ahora tienes que
       TENER la carta, porque es una carta. */
    if(!jugador.mano.some(c => esCartaEspecial(c) && c.esp === jugada.especial))
      return 'No tienes ninguna carta de '
           + (jugada.especial === 'bono' ? 'bonificación' : 'penalización') + ' en la mano.';
  }
  return null;
}

/* ── El daño ──────────────────────────────────────────────────────────────
   Regla 5, entera: la diferencia, con tope de 15, y el empate no hace nada. */
function danoEntre(puntosA, puntosB){
  if(puntosA === puntosB) return { dano: 0, quienPierde: null, crudo: 0 };
  const crudo = Math.abs(puntosA - puntosB);
  return { dano: Math.min(crudo, DANO_TOPE),
           quienPierde: puntosA > puntosB ? 'b' : 'a',
           crudo };
}

/* ── Repartir ─────────────────────────────────────────────────────────────
   Cada quien su mazo, y las especiales vienen dentro como cualquier otra
   carta. Ya no hay reparto de especiales que hacer: si te salen, te salen. */
function repartir(semilla){
  const dado = azar(semilla);

  /* ⚠ UN MAZO POR JUGADOR, y no es un detalle de reparto: lo pidió Carlos
     («haz que cada jugador tenga su mazo») y es lo que hace posible todo lo
     que viene después. Un mazo compartido es el mismo para los dos y no se
     puede mejorar; un mazo propio es una COLECCIÓN, y una colección se puede
     comprar, cambiar y presumir. Sin esto, no hay tienda que valga.

     Cada quien revuelve el suyo con el mismo dado sembrado, así que la partida
     sigue siendo reproducible: misma semilla, mismos dos mazos. Eso es lo que
     deja que dos teléfonos repartan igual sin mandarse las cartas. */
  const jugador = (nombre) => ({
    nombre, pv: PV_INICIAL, mano: [], combosUsados: 0,
    mazo: revolver(armarMazo(), dado),
    /* El cementerio: lo que ya se jugó, en orden. La última de arriba. */
    cementerio: [],
  });

  const a = jugador('a');
  const b = jugador('b');

  for(let i = 0; i < MANO; i++){ a.mano.push(a.mazo.pop()); b.mano.push(b.mazo.pop()); }
  return { a, b, ronda: 1, historia: [], acabo: null };
}

/* ── Una ronda completa ───────────────────────────────────────────────────
   Recibe el estado y las dos jugadas y devuelve el estado NUEVO. No toca el
   que le dieron: así la pantalla puede animar el antes y el después, y una
   partida en línea puede repetir la misma ronda sin que se ensucie nada.

   La penalización va sobre la carta del RIVAL. El reglamento no lo dice con
   esas palabras —dice «se usa sobre 1 carta individual»— pero es la única
   lectura en la que alguien la usaría: nadie gasta una carta para empeorar la
   suya. Y encaja con el límite de la regla 8, «cada carta individual solo
   puede recibir 1 Bonificación O 1 Penalización por ronda», que sólo hace
   falta si las dos pueden caer sobre la misma carta. Queda anotado por si la
   amiga de Carlos lo quiso de otro modo: se cambia aquí y en ningún otro lado.
*/
function jugarRonda(estado, jugadaA, jugadaB){
  const est = JSON.parse(JSON.stringify(estado));
  if(est.acabo) return est;

  for(const [j, jugada] of [[est.a, jugadaA], [est.b, jugadaB]]){
    const mal = porQueNoSeVale(jugada, j);
    if(mal) throw new Error('Jugada inválida de ' + j.nombre + ': ' + mal);
  }

  /* Los especiales se aplican antes de puntuar. El bono a la carta propia, el
     castigo a la del rival. Y una carta no recibe dos. */
  const conEspecial = (mia, delRival) => {
    const puestos = [];
    if(mia.especial === 'bono')       puestos.push('bono');
    if(delRival.especial === 'castigo') puestos.push('castigo');
    return puestos.length ? puestos[0] : null;   /* la primera; nunca dos */
  };

  const jA = { cartas: jugadaA.cartas, especial: jugadaA.cartas.length === 2 ? null
               : conEspecial(jugadaA, jugadaB) };
  const jB = { cartas: jugadaB.cartas, especial: jugadaB.cartas.length === 2 ? null
               : conEspecial(jugadaB, jugadaA) };

  const pA = puntuar(jA), pB = puntuar(jB);
  const res = danoEntre(pA.puntos, pB.puntos);

  if(res.quienPierde === 'a') est.a.pv = Math.max(0, est.a.pv - res.dano);
  if(res.quienPierde === 'b') est.b.pv = Math.max(0, est.b.pv - res.dano);

  /* Se gastan las cartas, las especiales y las combinaciones. */
  for(const [j, jugada] of [[est.a, jugadaA], [est.b, jugadaB]]){
    const fuera = new Set(jugada.cartas.map(c => c.id));
    /* ⚠ LA ESPECIAL TAMBIÉN SE GASTA, Y SE GASTA UNA. Antes bajaba un contador;
       ahora hay que sacar de la mano UNA carta concreta de esa clase. Si se
       sacaran todas las de esa clase, gastar un +5 te quitaría los tres que
       tuvieras — y como el contador ya no existe, nadie lo notaría hasta
       contar las cartas. */
    let gastada = null;
    if(jugada.especial){
      gastada = j.mano.find(c => esCartaEspecial(c) && c.esp === jugada.especial) || null;
      if(gastada) fuera.add(gastada.id);
    }
    /* EL CEMENTERIO, en orden: lo último jugado queda al final, que es lo que
       la pantalla enseña arriba del montón. */
    /* Se crea si no venía. Un estado armado a mano —una prueba, o un cliente
       viejo en una partida en línea— no trae cementerio, y reventar por un
       campo que se acaba de inventar sería tumbar la partida por una mejora
       cosmética. */
    if(!Array.isArray(j.cementerio)) j.cementerio = [];
    for(const c of j.mano) if(fuera.has(c.id)) j.cementerio.push(c);
    j.mano = j.mano.filter(c => !fuera.has(c.id));
    if(jugada.cartas.length === 2) j.combosUsados++;
    /* Regla 4.8: reponer hasta tener 5. Si el mazo se acabó, se juega con lo
       que quede — no se inventan cartas. */
    /* Igual que el cementerio: un estado sin mazo propio no repone, pero no
       tumba la partida. La regla 4.8 dice «si el mazo se acabó, se juega con
       lo que quede», y no tener mazo es un caso de eso. */
    if(!Array.isArray(j.mazo)) j.mazo = [];
    while(j.mano.length < MANO && j.mazo.length) j.mano.push(j.mazo.pop());
  }

  est.historia.push({ ronda: est.ronda, a: pA, b: pB,
                      dano: res.dano, crudo: res.crudo, perdio: res.quienPierde });
  est.ronda++;

  /* Se acaba por PV en cero, o porque ya nadie tiene con qué jugar. */
  if(est.a.pv <= 0 || est.b.pv <= 0){
    est.acabo = est.a.pv <= 0 && est.b.pv <= 0 ? 'empate'
              : est.a.pv <= 0 ? 'b' : 'a';
  } else if(!est.a.mano.length || !est.b.mano.length){
    est.acabo = est.a.pv === est.b.pv ? 'empate' : (est.a.pv > est.b.pv ? 'a' : 'b');
    est.porCartas = true;
  }
  return est;
}

/* ── Las jugadas que un jugador PUEDE hacer ───────────────────────────────
   La usa la máquina para pensar y la pantalla para no ofrecer lo prohibido.
   Que salgan del mismo lugar es lo que evita que la máquina haga una jugada
   que a la persona no la dejan hacer. */
function jugadasPosibles(jugador){
  const salen = [];
  /* ⚠ LAS ESPECIALES NO SON JUGABLES POR SÍ SOLAS, así que no entran a la
     lista como carta: entran como modificador de otra. Sin este filtro, la
     máquina —y cualquiera que tome «la primera jugada posible»— acabaría
     intentando jugar un +5 solo, que el propio motor rechaza. La partida se
     caía con una excepción, no con un aviso. */
  const jugables = jugador.mano.filter(c => !esCartaEspecial(c));
  for(const c of jugables){
    salen.push({ cartas:[c], especial:null });
    for(const e of ['bono', 'castigo']){
      /* La máquina también juega con lo que TIENE en la mano. */
      if(jugador.mano.some(x => esCartaEspecial(x) && x.esp === e))
        salen.push({ cartas:[c], especial:e });
    }
  }
  if(jugador.combosUsados < COMBOS_POR_JUGADOR){
    for(let i = 0; i < jugables.length; i++){
      for(let j = i + 1; j < jugables.length; j++){
        const x = jugables[i], y = jugables[j];
        if(x.nivel === y.nivel && sePuedeCombinar(x.nivel))
          salen.push({ cartas:[x, y], especial:null });
      }
    }
  }
  return salen;
}

/* Se expone de dos formas a propósito: `module.exports` para que las pruebas
   lo carguen en node, y `window.MOTOR` para que la página lo cargue con un
   <script> normal, sin build ni módulos. Es el mismo archivo en los dos lados,
   que es justo lo que hace que las pruebas valgan para lo que se publica. */
const API = {
  NIVELES, PV_INICIAL, MANO, DANO_TOPE, COMBOS_POR_JUGADOR, ESPECIALES,
  azar, revolver, armarMazo, nivelDe, sePuedeCombinar,
  puntuar, porQueNoSeVale, danoEntre, repartir, jugarRonda, jugadasPosibles,
};

/* Tres formas de cargarlo, un solo archivo:
   · `module.exports` para las pruebas en node,
   · `globalThis.MOTOR` para la página (donde `globalThis` ES `window`) y
     también para el Worker de Cloudflare, que no tiene `window`.
   Si aquí dijera `window.MOTOR`, en el servidor no se definiría nada y el
   servidor tendría que llevar su propia copia de las reglas. */
if(typeof module !== 'undefined') module.exports = API;
globalThis.MOTOR = API;
