/* Pruebas de las reglas y de la máquina de los juegos de mesa.   node carymo/juegos/pruebas-motores.mjs */
import { MOTORES, ajedrez, damas, reversi, conecta4, domino, deFEN, perft, elegir, azar } from './motores.js';

let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓ ' + t); } else { mal++; console.log('  ✗ ' + t); } };

console.log('\nAjedrez: las reglas completas (perft, los números conocidos)');
ok(perft(ajedrez, ajedrez.inicial(), 3) === 8902, 'inicio a 3 jugadas: 8,902');
ok(perft(ajedrez, deFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'), 3) === 97862, 'enroques, al paso y coronar: 97,862');
ok(perft(ajedrez, deFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 4) === 43238, 'final con peones: 43,238');
{
  const mate = deFEN('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');          // mate del pasillo
  const j = elegir(ajedrez, mate, 'medio'); const e2 = ajedrez.aplicar(mate, j);
  ok(ajedrez.fin(e2)?.motivo === 'jaque mate', 'la máquina ve el mate del pasillo (Ta8)');
  const pastor = deFEN('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
  const j2 = elegir(ajedrez, pastor, 'facil', () => .99);
  ok(ajedrez.texto(j2) === 'f3f7', 'hasta en fácil ve el mate del pastor (Dxf7)');
  const ah = deFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  ok(ajedrez.fin(ah)?.motivo === 'ahogado', 'ahogado es tablas');
  ok(ajedrez.fin(deFEN('8/8/8/4k3/8/8/2KB4/8 w - - 0 1'))?.motivo === 'no alcanza para dar mate', 'rey y alfil contra rey: tablas');
  const cuelga = deFEN('rnb1kbnr/pppp1ppp/8/4p3/4P1q1/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
  const j3 = elegir(ajedrez, cuelga, 'medio');
  ok(ajedrez.texto(j3) === 'f3g5' ? false : true, 'no deja piezas colgadas sin necesidad');
}

console.log('\nDamas');
{
  const e = damas.inicial();
  ok(damas.jugadas(e).length === 7, 'al empezar hay 7 jugadas');
  const b = Array(64).fill(''); b[5 * 8 + 2] = 'a'; b[4 * 8 + 3] = 'b'; b[2 * 8 + 5] = 'b'; b[0] = 'b';
  const js = damas.jugadas({ juego: 'damas', b, t: 0, sin: 0 });
  ok(js.length === 1 && js[0].caps.length === 2, 'comer es obligatorio y se sigue comiendo (doble salto)');
  const b2 = Array(64).fill(''); b2[1 * 8 + 2] = 'a'; b2[7 * 8 + 0] = 'b';
  const e2 = damas.aplicar({ juego: 'damas', b: b2, t: 0, sin: 0 }, { ruta: [10, 1], caps: [] });
  ok(e2.b[1] === 'A', 'la ficha que llega al fondo se corona');
}

console.log('\nReversi');
{
  const e = reversi.inicial();
  ok(reversi.jugadas(e).length === 4, 'al empezar hay 4 jugadas');
  const e2 = reversi.aplicar(e, { pos: 19 });
  ok(reversi.cuenta(e2)[0] === 4 && reversi.cuenta(e2)[1] === 1, 'voltea la ficha encerrada');
}

console.log('\nConecta 4');
{
  let e = conecta4.inicial();
  for(const c of [3, 0, 3, 0, 3, 0]) e = conecta4.aplicar(e, { col: c });
  const j = elegir(conecta4, e, 'facil', () => .99);
  ok(j.col === 3, 'la máquina remata con tres en columna');
  let e2 = conecta4.inicial();
  for(const c of [0, 3, 0, 3, 6, 3]) e2 = conecta4.aplicar(e2, { col: c });
  ok(elegir(conecta4, e2, 'medio').col === 3, 'y tapa cuando el otro va a ganar');
}

console.log('\nDominó');
{
  const e = domino.inicial({ semilla: 7 }), e2 = domino.inicial({ semilla: 7 });
  ok(JSON.stringify(e.manos) === JSON.stringify(e2.manos), 'misma semilla, mismo reparto (servidor y teléfono)');
  ok(e.manos[0].length === 7 && e.manos[1].length === 7 && e.pozo.length === 14, '7 y 7, y 14 en el pozo');
  const v = domino.vista(e, 0);
  ok(v.manos[1].every((x) => x === null) && v.pozo.every((x) => x === null) && v.semilla === undefined, 'la vista tapa las fichas del otro, el pozo y la semilla');
}

console.log('\nPartidas completas máquina contra máquina (que siempre terminen y sin jugadas ilegales)');
for(const [id, m] of Object.entries(MOTORES)){
  const r = azar(42);
  let e = m.inicial({ semilla: 3 }), n = 0, ilegal = false; const t0 = Date.now();
  while(!m.fin(e) && n < 400){
    const j = elegir(m, e, n % 2 ? 'medio' : 'facil', r);
    if(!m.jugadas(e).some((k) => m.igual(k, j))){ ilegal = true; break; }
    e = m.aplicar(e, j); n++;
  }
  const f = m.fin(e);
  ok(!ilegal && f, `${m.nombre}: terminó en ${n} jugadas (${f ? (f.ganador === null ? 'empate' : 'ganó ' + f.ganador) + ', ' + f.motivo : 'no terminó'}) · ${Date.now() - t0} ms`);
}

console.log('\nQué tan rápido piensa en difícil (una jugada, en esta máquina)');
for(const [id, m] of Object.entries(MOTORES)){
  if(id === 'domino') continue;
  let e = m.inicial(); for(let k = 0; k < 6; k++) e = m.aplicar(e, elegir(m, e, 'facil', azar(k)));
  const t0 = Date.now(); elegir(m, e, 'dificil'); const ms = Date.now() - t0;
  ok(ms < 2500, `${m.nombre}: ${ms} ms`);
}

console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
