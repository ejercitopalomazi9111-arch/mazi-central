#!/usr/bin/env node
/* Pruebas de sorteo.js · `node tienda/nucleo/pruebas-sorteo.mjs` */
import { gastoDelMes, avance, participantes, huella, elegir, rangoMes } from './sorteo.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const ped = (dia, total, estado = 'entregado') => ({ creado: new Date(dia + 'T12:00').toISOString(), total, estado });
const sorteo = { mes: '2026-09-01', minimo_mensual: 1000 };

console.log('\n· El mes');
const [d, h] = rangoMes('2026-09-01');
ok('septiembre va del 1 de sep al 1 de oct', new Date(d).getDate() === 1 && new Date(h).getMonth() === 9);
ok('diciembre cruza el año bien', new Date(rangoMes('2026-12-01')[1]).getFullYear() === 2027);
ok('sólo cuenta lo del mes', gastoDelMes([ped('2026-08-31', 500), ped('2026-09-01', 300), ped('2026-09-30', 200), ped('2026-10-01', 900)], '2026-09-01') === 500);
ok('lo cancelado y lo no entregado no cuentan', gastoDelMes([ped('2026-09-05', 800, 'cancelado'), ped('2026-09-06', 100, 'no_entregado'), ped('2026-09-07', 50)], '2026-09-01') === 50);

console.log('\n· Avance');
const a = avance([ped('2026-09-03', 400), ped('2026-09-20', 350)], sorteo);
ok('lleva 750 de 1000: le faltan 250, va en 75 %', a.gasto === 750 && a.falta === 250 && a.porcentaje === 75 && !a.dentro, JSON.stringify(a));
const b = avance([ped('2026-09-03', 1400)], sorteo);
ok('pasándose del mínimo: dentro, falta 0, barra en 100', b.dentro && b.falta === 0 && b.porcentaje === 100);
ok('sin compras: 0 %', avance([], sorteo).porcentaje === 0);

console.log('\n· Quién entra');
const clientes = [
  { id: 'c', nombre: 'Carla', pedidos: [ped('2026-09-02', 1000)] },
  { id: 'a', nombre: 'Ana', pedidos: [ped('2026-09-02', 600), ped('2026-09-15', 600)] },
  { id: 'b', nombre: 'Beto', pedidos: [ped('2026-09-02', 800)] },
  { id: 'd', nombre: 'Dani', pedidos: [ped('2026-09-02', 100)] },
  { id: 'e', nombre: 'Eva', pedidos: [ped('2026-08-02', 5000)] },
];
const p = participantes(clientes, sorteo);
ok('entran Ana y Carla (justo el mínimo cuenta)', p.dentro.map((x) => x.id).join() === 'a,c', p.dentro.map((x) => x.id).join());
ok('Beto está cerca (le faltan 200 de 1000)', p.cerca.map((x) => x.id).join() === 'b');
ok('lo de agosto no mete a Eva', !p.dentro.some((x) => x.id === 'e') && !p.cerca.some((x) => x.id === 'e'));

console.log('\n· Huella y azar');
ok('la huella no depende del orden', huella(['a', 'c']) === huella(['c', 'a']));
ok('cambia si cambia la lista', huella(['a', 'c']) !== huella(['a', 'c', 'x']));
ok('ocho caracteres', /^[0-9A-F]{8}$/.test(huella(['a'])));
ok('sin participantes no elige a nadie', elegir(0) === -1);
const cuenta = [0, 0, 0];
for(let i = 0; i < 30000; i++) cuenta[elegir(3)]++;
ok('con 3, cada uno sale ~1/3 de las veces', cuenta.every((c) => c > 9300 && c < 10700), cuenta.join());
let v = 0xFFFFFFFF; const sesgado = (a) => { a[0] = v; v = 5; };
ok('descarta el valor que metería sesgo y vuelve a tirar', elegir(3, sesgado) === 5 % 3);

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
