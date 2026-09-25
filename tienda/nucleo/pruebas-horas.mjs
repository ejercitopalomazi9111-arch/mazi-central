#!/usr/bin/env node
/* Pruebas de horas.js · `node tienda/nucleo/pruebas-horas.mjs` — de aquí sale la nómina. */
import { trabajado, porDia, entre, lunes, quincena, duracion, enPausa, turnoLargo } from './horas.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const H = 3600000, M = 60000;
const f = (s) => new Date(s);   // hora local

console.log('\n· Un turno');
const t1 = { inicio: f('2026-09-24T09:00'), fin: f('2026-09-24T17:30'), pausas: [{ inicio: f('2026-09-24T13:00'), fin: f('2026-09-24T14:00') }] };
ok('9:00 a 17:30 con una hora de comida = 7 h 30 min', trabajado(t1) === 7.5 * H, duracion(trabajado(t1)));
ok('se escribe «7 h 30 min»', duracion(trabajado(t1)) === '7 h 30 min');
const abierto = { inicio: f('2026-09-24T09:00'), fin: null, pausas: [] };
ok('abierto cuenta hasta ahora', trabajado(abierto, f('2026-09-24T11:15').getTime()) === 2.25 * H);
const pausado = { inicio: f('2026-09-24T09:00'), fin: null, pausas: [{ inicio: f('2026-09-24T10:00'), fin: null }] };
ok('en pausa ahora: no suma mientras dura', trabajado(pausado, f('2026-09-24T12:00').getTime()) === 1 * H && enPausa(pausado));
const encimadas = { inicio: f('2026-09-24T09:00'), fin: f('2026-09-24T12:00'), pausas: [{ inicio: f('2026-09-24T10:00'), fin: f('2026-09-24T11:00') }, { inicio: f('2026-09-24T10:30'), fin: f('2026-09-24T11:30') }] };
ok('dos pausas encimadas no se descuentan dos veces', trabajado(encimadas) === 1.5 * H, duracion(trabajado(encimadas)));
const fuera = { inicio: f('2026-09-24T09:00'), fin: f('2026-09-24T10:00'), pausas: [{ inicio: f('2026-09-24T08:00'), fin: f('2026-09-24T09:30') }] };
ok('una pausa que empezó antes del turno sólo descuenta lo de adentro', trabajado(fuera) === 0.5 * H);

console.log('\n· Por día');
const noche = { inicio: f('2026-09-24T20:00'), fin: f('2026-09-25T02:00'), pausas: [] };
const d = porDia([noche]);
ok('un turno que cruza medianoche se reparte: 4 h y 2 h', d['2026-09-24'] === 4 * H && d['2026-09-25'] === 2 * H, JSON.stringify(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v / H]))));
const dos = porDia([t1, { inicio: f('2026-09-24T18:00'), fin: f('2026-09-24T19:00'), pausas: [] }]);
ok('dos turnos el mismo día se suman', dos['2026-09-24'] === 8.5 * H);
ok('entre 12:00 y 15:00 del turno de 9 a 17:30 con comida de 13 a 14 = 2 h', entre(t1, f('2026-09-24T12:00'), f('2026-09-24T15:00')) === 2 * H);

console.log('\n· Cortes');
ok('el lunes de la semana del jueves 24 es el 21', lunes(f('2026-09-24T15:00')).getDate() === 21);
ok('el lunes de un domingo es el de 6 días antes', lunes(f('2026-09-27T10:00')).getDate() === 21);
ok('la quincena del 24 empieza el 16', quincena(f('2026-09-24')).getDate() === 16);
ok('la quincena del 15 empieza el 1', quincena(f('2026-09-15')).getDate() === 1);
ok('45 minutos se escriben «45 min»', duracion(45 * M) === '45 min');

console.log('\n· Turno olvidado');
const olvidado = { inicio: f('2026-09-24T18:57'), fin: null, pausas: [] };
ok('abierto hace 11 h no avisa', !turnoLargo(olvidado, f('2026-09-25T05:57')));
ok('abierto hace 19 h sí avisa', turnoLargo(olvidado, f('2026-09-25T13:57')));
ok('uno ya cerrado nunca avisa, aunque haya sido largo', !turnoLargo({ ...olvidado, fin: f('2026-09-25T13:00') }, f('2026-09-25T14:00')));
ok('una pausa larga no lo disculpa', turnoLargo({ ...olvidado, pausas: [{ inicio: f('2026-09-24T19:00'), fin: null }] }, f('2026-09-25T13:57')));
ok('sin turno no truena', turnoLargo(null) === false);

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
