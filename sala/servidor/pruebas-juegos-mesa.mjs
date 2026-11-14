/* Pruebas de los juegos de mesa en línea.   node sala/servidor/pruebas-juegos-mesa.mjs */
import { atenderEstudio } from './estudio.js';
import { MOTORES, elegir } from '../../carymo/juegos/motores.js';

let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓ ' + t); } else { mal++; console.log('  ✗ ' + t); } };
const datos = new Map();
const storage = {
  async get(k){ return datos.has(k) ? structuredClone(datos.get(k)) : undefined; },
  async put(k, v){ datos.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) datos.delete(x); },
};
let reloj = Date.UTC(2026, 10, 14, 18);
async function pide(cuenta, cuerpo){
  const r = await atenderEstudio(storage, new Request('https://x/api/estudio', { method: 'POST', body: JSON.stringify(cuerpo) }), new URL('https://x/api/estudio'), cuenta, reloj);
  return { estado: r.status, ...(await r.json()) };
}
// dos personas con perfil
await pide('ana', { accion: 'latido' }); await pide('beto', { accion: 'latido' }); await pide('caro', { accion: 'latido' });

console.log('\nRetar y aceptar');
let r = await pide('ana', { accion: 'juegoRetar', juego: 'conecta4', a: 'beto' });
ok(r.bien && r.partida.estado === 'reto', 'Ana reta a Beto a Conecta 4');
const id = r.partida.id;
r = await pide('caro', { accion: 'juegoEstado', id });
ok(r.estado === 404, 'alguien de fuera no puede ver la partida');
r = await pide('beto', { accion: 'juegosMios' });
ok(r.partidas.some((p) => p.id === id && p.reto === 'recibido'), 'a Beto le sale el reto');
r = await pide('ana', { accion: 'juegoResponder', id, acepta: true });
ok(r.estado === 404, 'el que retó no puede aceptar su propio reto');
r = await pide('beto', { accion: 'juegoResponder', id, acepta: true });
ok(r.bien && r.partida.estado === 'jugando', 'Beto acepta y empieza la partida');

console.log('\nJugar por turnos, con las reglas en el servidor');
const quien = (p, t) => p.j[t];
let p = r.partida;
const otro = quien(p, 1 - p.turno);
r = await pide(otro, { accion: 'juegoMover', id, jugada: { col: 3 }, v: p.v });
ok(r.estado === 409, 'no se puede jugar fuera de turno');
r = await pide(quien(p, p.turno), { accion: 'juegoMover', id, jugada: { col: 9 }, v: p.v });
ok(r.estado === 400, 'una jugada que no existe no entra');
r = await pide(quien(p, p.turno), { accion: 'juegoMover', id, jugada: { col: 3, trampa: true }, v: p.v });
ok(r.bien && r.partida.v === p.v + 1 && !JSON.stringify(r.partida.jugadas).includes('trampa'), 'una jugada legal entra, y se guarda la del motor (no la del teléfono)');
const v1 = r.partida.v;
r = await pide(quien(p, 1 - p.turno), { accion: 'juegoEstado', id, v: v1 });
ok(r.igual === true, 'si nada cambió, la respuesta es chiquita');
// se juega hasta el final
p = r.partida || (await pide('ana', { accion: 'juegoEstado', id })).partida;
let n = 0;
while(p.estado === 'jugando' && n < 60){
  const m = MOTORES.conecta4, j = elegir(m, p.e, 'facil');
  r = await pide(quien(p, p.turno), { accion: 'juegoMover', id, jugada: j, v: p.v }); p = r.partida; n++;
}
ok(p.estado === 'fin' && p.fin, `la partida termina (${p.fin?.motivo})`);
r = await pide('ana', { accion: 'juegosMios' });
const st = r.stats.conecta4;
ok(st && st.g + st.p + st.e === 1 && st.elo !== undefined, 'se apunta en las estadísticas con su Elo');

console.log('\nBuscar rival');
r = await pide('ana', { accion: 'juegoBuscar', juego: 'ajedrez' });
ok(r.esperando, 'Ana se forma para ajedrez');
r = await pide('caro', { accion: 'juegoBuscar', juego: 'ajedrez' });
ok(r.partida && r.partida.estado === 'jugando', 'llega Caro y se arma la partida');
r = await pide('ana', { accion: 'juegoBuscar', juego: 'ajedrez' });
ok(r.partida && r.partida.id, 'Ana se entera de su partida al volver a preguntar');

console.log('\nDominó: cada quien ve sólo sus fichas');
r = await pide('ana', { accion: 'juegoBuscar', juego: 'domino' }); r = await pide('beto', { accion: 'juegoBuscar', juego: 'domino' });
const dom = r.partida, yo = dom.yo;
ok(dom.e.manos[yo].every((f) => Array.isArray(f)) && dom.e.manos[1 - yo].every((f) => f === null), 'la mano del otro llega tapada');
ok(dom.e.pozo.every((f) => f === null) && dom.e.semilla === undefined, 'el pozo y la semilla no salen del servidor');

console.log('\nRendirse y reclamar');
const aj = (await pide('caro', { accion: 'juegosMios' })).partidas.find((x) => x.juego === 'ajedrez' && x.estado === 'jugando');
const pj = (await pide('caro', { accion: 'juegoEstado', id: aj.id })).partida;
const esperando = pj.j[1 - pj.turno];
r = await pide(esperando, { accion: 'juegoReclamar', id: aj.id });
ok(r.estado === 409, 'no se puede reclamar luego luego');
reloj += 3 * 24 * 3600_000 + 1000;
r = await pide(esperando, { accion: 'juegoReclamar', id: aj.id });
ok(r.bien && r.partida.fin.ganador === pj.j.indexOf(esperando), 'a los 3 días sin jugar, el otro la reclama');

console.log('\nBorrar cuenta se lleva sus partidas y estadísticas');
r = await pide('ana', { accion: 'borrarTodo' });
ok(r.borrado && !datos.has('jg:mias:ana') && !datos.has('jg:st:ana'), 'no queda nada de Ana en juegos');

console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
