/* ══════════════════════════════════════════════════════════════════════════
   CLASES DE JUEGOS DE MESA · se aprende jugando
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «las clases de esos juegos… deben de permitirte jugarlos,
   porque uno aprende jugando, dando clases de cómo se juega… las clases de
   estrategia más que nada».

   Cada clase son pasos cortos: la mascota dice una idea y te pone una
   posición; la idea se aprende HACIENDO la jugada. Nada de leer párrafos.
   Las posiciones están escritas aquí (no las inventa la IA), y las pruebas
   revisan que cada reto tenga solución y que no cualquier jugada lo pase.

   meta.tipo:
     cualquiera  · cualquier jugada legal (para aprender cómo se mueve)
     jugadas     · una de las de la lista (ajedrez «e2e4», conecta 4 «3», reversi «0», dominó «4-6»)
     captura     · que coma algo (caps: cuántas por lo menos, en damas)
     corona      · que corone una ficha (damas)
     gana        · que gane en esa jugada (mate en ajedrez, cuatro en línea…)
     amenaza2    · que deje dos amenazas: haga lo que haga el otro, ganas en la siguiente
     mejor       · que sea de las mejores según la máquina (prof, margen)
     evita       · cualquiera MENOS las de la lista (las casillas trampa)
   ═════════════════════════════════════════════════════════════════════════ */
import { deFEN } from './motores.js';

/* tableros a mano: damas y reversi en 8 renglones, conecta 4 en 6 */
const tablero = (filas, mapa) => filas.join('').split('').map((ch) => (ch in mapa ? mapa[ch] : ch === '.' ? mapa['.'] : ch));
const DAMAS = (filas, t = 0) => ({ juego: 'damas', b: tablero(filas, { '.': '' }), t, sin: 0 });
const REV = (filas, t = 0) => ({ juego: 'reversi', b: tablero(filas, { '.': null, x: 0, o: 1 }), t, pasos: 0 });
const C4 = (filas, t = 0) => ({ juego: 'conecta4', b: tablero(filas, { '.': null, x: 0, o: 1 }), t });
const DOM = (mesa, mia, suya, pozo = [], nopuede = []) => ({ juego: 'domino', mesa, manos: [mia, suya], pozo, t: 0, pasos: 0, robadas: [0, 0], nopuede: [[], nopuede] });

export const CLASES = {
  ajedrez: [
    { id: 'aj-mueve', titulo: 'Cómo se mueve cada pieza', pasos: [
      { texto: 'La **torre** va en línea recta, tan lejos como quiera. Cómete el peón.', e: deFEN('8/8/p7/8/8/8/8/R7 w - - 0 1'), meta: { tipo: 'captura' } },
      { texto: 'El **alfil** va en diagonal. Cómete el peón.', e: deFEN('8/8/8/8/5p2/8/8/2B5 w - - 0 1'), meta: { tipo: 'captura' } },
      { texto: 'El **caballo** salta en forma de L: dos para un lado y uno para el otro. Cómete el peón.', e: deFEN('8/8/4p3/8/3N4/8/8/8 w - - 0 1'), meta: { tipo: 'captura' } },
      { texto: 'La **dama** junta a la torre y al alfil: es la pieza más fuerte. Cómete el peón.', e: deFEN('8/8/8/7p/8/8/8/3Q4 w - - 0 1'), meta: { tipo: 'captura' } },
      { texto: 'El **peón** avanza derecho, pero **come en diagonal**. Cómete el peón que sí puedes.', e: deFEN('8/8/8/3pp3/4P3/8/7P/8 w - - 0 1'), meta: { tipo: 'jugadas', jugadas: ['e4d5'] } },
    ] },
    { id: 'aj-mate', titulo: 'Jaque y jaque mate', pasos: [
      { texto: '**Jaque mate** es atacar al rey sin que pueda escapar. Sus propios peones lo encierran: da mate con la torre.', e: deFEN('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'), meta: { tipo: 'gana' } },
      { texto: 'Tu rey cuida las casillas de enfrente del rey rival. Da mate con la dama.', e: deFEN('7k/8/6K1/8/8/8/8/Q7 w - - 0 1'), meta: { tipo: 'gana' } },
      { texto: 'El mate del pastor: el punto **f7** sólo lo cuida el rey. Aprende a darlo… y a que no te lo den.', e: deFEN('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'), meta: { tipo: 'gana' } },
    ] },
    { id: 'aj-abre', titulo: 'Abre como campeón', pasos: [
      { texto: 'Primera regla: **controla el centro**. Avanza un peón del centro dos casillas.', e: deFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), meta: { tipo: 'jugadas', jugadas: ['e2e4', 'd2d4'] } },
      { texto: 'Segunda: **saca tus caballos** hacia el centro, antes que la dama.', e: deFEN('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'), meta: { tipo: 'jugadas', jugadas: ['g1f3', 'b1c3'] } },
      { texto: 'Tercera: **enroca** pronto. El rey se esconde y la torre sale a pelear. Mueve el rey dos casillas a la derecha.', e: deFEN('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'), meta: { tipo: 'jugadas', jugadas: ['e1g1'] } },
    ] },
    { id: 'aj-tactica', titulo: 'Tácticas: la horquilla', pasos: [
      { texto: 'Una **horquilla** ataca dos piezas a la vez: sólo puede salvar una. Busca el salto del caballo que da jaque y ataca la torre.', e: deFEN('2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1'), meta: { tipo: 'jugadas', jugadas: ['d5e7'] } },
      { texto: 'Otra con el caballo: ataca al rey y a la dama al mismo tiempo.', e: deFEN('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1'), meta: { tipo: 'jugadas', jugadas: ['b5c7'] } },
      { texto: 'Ahora tú solo: encuentra **la mejor jugada**.', e: deFEN('4k3/8/3q4/8/8/2N5/8/4K3 w - - 0 1'), meta: { tipo: 'mejor', prof: 3, margen: 60 } },
    ] },
    { id: 'aj-final', titulo: 'Final: rey y dama contra rey', practica: { nivel: 'medio', e: deFEN('8/8/8/4k3/8/8/8/4K2Q w - - 0 1'), meta: 'gana', limite: 30 }, pasos: [
      { texto: 'Con la dama, **encierra** al rey rival en una caja cada vez más chica. Cuidado: si no tiene jugadas y no está en jaque, es **ahogado** y se empata. Mueve la dama para cerrarle el paso.', e: deFEN('8/8/8/4k3/8/8/8/4K2Q w - - 0 1'), meta: { tipo: 'mejor', prof: 2, margen: 40 } },
    ] },
  ],

  damas: [
    { id: 'da-mueve', titulo: 'Cómo se juega', pasos: [
      { texto: 'Las fichas avanzan **una casilla en diagonal**, siempre hacia adelante. Mueve una.', e: DAMAS(['.b......', '........', '........', '........', '........', '..a.....', '........', '........']), meta: { tipo: 'cualquiera' } },
      { texto: 'Para comer, **saltas** la ficha rival a la casilla vacía de atrás. Y si puedes comer, **tienes que comer**.', e: DAMAS(['.b......', '........', '........', '........', '...b....', '..a...a.', '........', '........']), meta: { tipo: 'captura' }, forzada: true },
      { texto: 'Si después de comer puedes volver a comer, **sigues**. Cómete las dos.', e: DAMAS(['........', '........', '.....b..', '........', '...b....', '..a.....', '........', '........']), meta: { tipo: 'captura', caps: 2 }, forzada: true },
      { texto: 'La ficha que llega al otro lado **se corona**: se vuelve dama y ya puede ir hacia atrás.', e: DAMAS(['........', '..a.....', '........', '........', '........', '....a...', '........', 'b.......']), meta: { tipo: 'corona' } },
    ] },
    { id: 'da-estrategia', titulo: 'Estrategia de damas', pasos: [
      { texto: '**Ocupa el centro**: las fichas del centro tienen dos salidas; las de la orilla, una. Avanza hacia el centro.', e: DAMAS(['.b.b.b.b', 'b.b.b.b.', '.b.b.b.b', '........', '........', 'a.a.a.a.', '.a.a.a.a', 'a.a.a.a.']), meta: { tipo: 'jugadas', jugadas: ['42-35', '44-35', '44-37', '46-37'] } },
      { texto: '**No dejes fichas solas**: una ficha sin compañera atrás se la comen gratis. Busca la jugada más segura.', e: DAMAS(['.b...b..', '........', '...b....', '........', '.....a..', '........', '.a.a....', '........']), meta: { tipo: 'mejor', prof: 4, margen: 10 } },
      { texto: 'Cuando vas ganando, **cambia fichas**: con menos piezas en el tablero, tu ventaja pesa más.', e: DAMAS(['........', '......b.', '........', '....b...', '........', '..a.a.a.', '........', '........']), meta: { tipo: 'mejor', prof: 4, margen: 10 } },
    ] },
  ],

  reversi: [
    { id: 're-mueve', titulo: 'Cómo se juega', pasos: [
      { texto: 'Pon tu ficha de forma que **encierres** fichas del rival en línea (derecho o en diagonal). Las encerradas se voltean y ahora son tuyas.', e: REV(['........', '........', '........', '...ox...', '...xo...', '........', '........', '........']), meta: { tipo: 'cualquiera' } },
    ] },
    { id: 're-esquinas', titulo: 'Las esquinas mandan', pasos: [
      { texto: 'Una ficha en la **esquina** ya nadie te la puede voltear. Si puedes tomar una, tómala.', e: REV(['.ox.....', '..ox....', '...xo...', '...ox...', '........', '........', '........', '........']), meta: { tipo: 'jugadas', jugadas: ['0'] } },
      { texto: 'Las casillas **junto a una esquina vacía** son trampa: le regalas la esquina al rival. Juega sin tocarlas.', e: REV(['........', '..oo....', '..oxx...', '..oxo...', '...xo...', '........', '........', '........']), meta: { tipo: 'evita', jugadas: ['1', '8', '9', '6', '14', '15', '48', '49', '57', '54', '55', '62'] } },
      { texto: 'Al principio, **voltear muchas no conviene**: entre menos fichas tengas, menos jugadas le dejas al rival. Busca la jugada que más lo encierre.', e: REV(['........', '........', '..o.....', '..ooo...', '..oxxx..', '...o....', '........', '........']), meta: { tipo: 'mejor', prof: 3, margen: 15 } },
    ] },
  ],

  conecta4: [
    { id: 'c4-centro', titulo: 'El centro y cómo ganar', pasos: [
      { texto: 'La **columna del centro** es la que más líneas de cuatro toca. Empieza ahí.', e: C4(['.......', '.......', '.......', '.......', '.......', '.......']), meta: { tipo: 'jugadas', jugadas: ['3'] } },
      { texto: 'Junta **cuatro en línea** para ganar: derecho, de pie o en diagonal. Gana en esta jugada.', e: C4(['.......', '.......', '.......', '.......', '.ooo...', 'xxx....']), meta: { tipo: 'gana' } },
      { texto: 'El rival tiene tres de pie. **Tápalo** antes de que gane.', e: C4(['.......', '.......', '......o', '......o', '.x....o', 'xx....x']), meta: { tipo: 'jugadas', jugadas: ['6'] } },
    ] },
    { id: 'c4-doble', titulo: 'La doble amenaza', pasos: [
      { texto: 'Si dejas **dos lugares para ganar a la vez**, el rival sólo puede tapar uno. Arma la doble amenaza.', e: C4(['.......', '.......', '.......', '.......', '..oo...', '..xx...']), meta: { tipo: 'amenaza2' } },
      { texto: 'Piensa **una jugada adelante**: no pongas tu ficha justo abajo de donde el rival gana. Busca la mejor.', e: C4(['.......', '.......', '.......', '...o...', '..xo...', '.xxo.o.']), meta: { tipo: 'mejor', prof: 5, margen: 20 } },
    ] },
  ],

  domino: [
    { id: 'do-mueve', titulo: 'Cómo se juega', pasos: [
      { texto: 'Las fichas se pegan **por el número igual** en cualquiera de las dos puntas. Pon una.', e: DOM([[3, 5]], [[5, 6], [1, 2], [0, 0]], [[4, 4], [2, 6], [1, 4]]), meta: { tipo: 'cualquiera' } },
      { texto: 'Si no tienes ninguna que pegue, **robas** del pozo hasta tener una.', e: DOM([[3, 5]], [[1, 2], [0, 0]], [[4, 4], [2, 6]], [[2, 4], [5, 1]]), meta: { tipo: 'cualquiera' } },
    ] },
    { id: 'do-estrategia', titulo: 'Estrategia de dominó', pasos: [
      { texto: 'Si el juego se tranca, gana quien tenga **menos puntos** en la mano. Suelta primero las fichas pesadas.', e: DOM([[2, 4]], [[4, 6], [4, 0], [1, 1]], [[3, 3], [2, 5], [0, 5]]), meta: { tipo: 'jugadas', jugadas: ['4-6'] } },
      { texto: 'Las **mulas** sólo pegan con un número: si te esperas, se te atoran. Sácala ahora que puedes.', e: DOM([[6, 3]], [[3, 3], [3, 1], [6, 2]], [[4, 4], [2, 5], [0, 5]]), meta: { tipo: 'jugadas', jugadas: ['3-3'] } },
      { texto: 'Tu rival **robó** cuando había un 5 en la punta: no tiene cincos. **Ciérrale** el juego dejando un 5.', e: DOM([[2, 1]], [[1, 5], [1, 4], [2, 6]], [[4, 4], [0, 3], [6, 6]], [[3, 2]], [5]), meta: { tipo: 'jugadas', jugadas: ['1-5'] } },
    ] },
  ],
};
