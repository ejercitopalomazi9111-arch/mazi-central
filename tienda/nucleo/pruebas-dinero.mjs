#!/usr/bin/env node
/* Pruebas de dinero.js · `node tienda/nucleo/pruebas-dinero.mjs` */
import { sugerirPagos, desglose, contar, aCentavos, cambio } from './dinero.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const J = JSON.stringify;

console.log('\n· Centavos');
ok('$0.10 + $0.20 da 30 centavos, no 0.30000000000000004', aCentavos(0.1) + aCentavos(0.2) === 30);
ok('$1,250.50 son 125050 centavos', aCentavos(1250.5) === 125050);
ok('cambio de $187 con $200 son $13', cambio(18700, 20000) === 1300);

console.log('\n· Con cuánto pagó');
const s187 = sugerirPagos(18700);
ok('$187: exacto, $190, $200, $500, $1000', J(s187) === J([18700, 19000, 20000, 50000, 100000]), J(s187));
const s870 = sugerirPagos(87000);
ok('$870: incluye $900 y $1000', s870.includes(90000) && s870.includes(100000), J(s870));
const s50 = sugerirPagos(5000);
ok('$50 exactos: el primero es el exacto y no se repite', s50[0] === 5000 && new Set(s50).size === s50.length, J(s50));
ok('nunca más de seis botones', [123, 4550, 18700, 99999, 250000].every((t) => sugerirPagos(t).length <= 6));
ok('ningún botón es menor que el total', [123, 4550, 18700, 99999].every((t) => sugerirPagos(t).every((x) => x >= t)));
ok('$0 no sugiere nada', sugerirPagos(0).length === 0);

console.log('\n· Cómo dar el cambio');
const d = desglose(38750);
ok('$387.50 → 1×200, 1×100, 1×50, 1×20, 1×10, 1×5, 1×2, 1×0.50', J(d.piezas.map((x) => [x.valor, x.piezas])) === J([[20000, 1], [10000, 1], [5000, 1], [2000, 1], [1000, 1], [500, 1], [200, 1], [50, 1]]) && d.resto === 0, J(d));
ok('$0.30 no se puede dar exacto: lo dice', desglose(30).resto === 30);
ok('$40 son dos de $20', J(desglose(4000).piezas) === J([{ valor: 2000, piezas: 2 }]));

console.log('\n· Conteo de caja');
ok('3 de $500 + 4 de $20 + 7 de $1 = $1,587', contar({ 50000: 3, 2000: 4, 100: 7 }) === 158700);
ok('lo vacío o raro cuenta cero', contar({ 50000: '', 2000: 'x' }) === 0);

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
