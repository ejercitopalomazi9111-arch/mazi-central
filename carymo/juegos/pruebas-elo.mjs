/* pruebas-elo.mjs — ¿los niveles del ajedrez quedan separados como sus ELO? (Carlos, 14 nov: 150, 600, 1000)
 * Juega niveles entre sí y compara el marcador con lo que predice el ELO: con 400 de diferencia el fuerte gana
 * ~91 % de los puntos; con 450, ~93 %. Las partidas largas se cortan a las 120 jugadas y se cuentan por material.
 * node carymo/juegos/pruebas-elo.mjs [partidas por pareja] */
import { MOTORES, elegir, ELO } from './motores.js';
const A = MOTORES.ajedrez, N = +process.argv[2] || 12;
let semilla = 7; const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const material = (e) => e.b.reduce((s, p) => s + (p ? (p === p.toUpperCase() ? 1 : -1) * VAL[p.toLowerCase()] : 0), 0);
function partida(blancas, negras){
  let e = A.inicial({});
  for(let ply = 0; ply < 120; ply++){
    const f = A.fin(e); if(f) return f.ganador === null ? .5 : f.ganador === 0 ? 1 : 0;
    const j = elegir(A, e, A.turno(e) === 0 ? blancas : negras, rnd); e = A.aplicar(e, j, true);
  }
  const m = material(e); return m > 2 ? 1 : m < -2 ? 0 : .5;
}
const esperado = (a, b) => 1 / (1 + Math.pow(10, (ELO[b].elo - ELO[a].elo) / 400));
let n = 0, f = 0;
for(const [fuerte, debil] of [['medio', 'facil'], ['dificil', 'medio']]){
  let pts = 0; const t0 = Date.now();
  for(let i = 0; i < N; i++) pts += i % 2 ? 1 - partida(debil, fuerte) : partida(fuerte, debil);
  const r = pts / N, e = esperado(fuerte, debil);
  n++; const bien = r >= e - .2; if(!bien) f++;
  console.log(`  ${bien ? '✓' : '✗'} ${fuerte} (${ELO[fuerte].elo}) contra ${debil} (${ELO[debil].elo}): ${(r * 100).toFixed(0)} % de los puntos; el ELO dice ${(e * 100).toFixed(0)} % · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
console.log(`\n${n - f} de ${n} pasan`); process.exit(f ? 1 : 0);
