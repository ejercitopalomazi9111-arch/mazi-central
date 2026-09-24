#!/usr/bin/env node
/* Pruebas de reportes.js y consejos.js · `node tienda/nucleo/pruebas-reportes.mjs` */
import { periodo, anterior, resumen, cambio, porHora, porDia, horaFuerte, porProducto, juntos, entre, filasCSV, DIA } from './reportes.js';
import { consejos } from './consejos.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const AHORA = new Date('2026-09-24T18:00').getTime();
const hace = (dias, h = 12) => { const d = new Date(AHORA - dias * DIA); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const r = (id, n = 1, precio = 100) => ({ producto_id: id, nombre: id.toUpperCase(), cantidad: n, precio, importe: precio * n });
const V = (dias, renglones, extra = {}) => ({ folio: 1, creado: hace(dias, extra.h ?? 12), estado: 'entregado', canal: 'pos', forma_pago: 'efectivo', total: renglones.reduce((t, x) => t + x.importe, 0), renglones, ...extra });

console.log('\n· Periodos');
const p7 = periodo('7', AHORA);
ok('7 días empieza hace 6 días a las 00:00', new Date(p7.desde).getDate() === 18 && new Date(p7.desde).getHours() === 0);
const pp = periodo('pasado', AHORA);
ok('mes pasado: todo agosto', new Date(pp.desde).getMonth() === 7 && new Date(pp.hasta).getMonth() === 8 && new Date(pp.hasta).getDate() === 1);
const hoy = periodo('hoy', AHORA), antesHoy = anterior(hoy);
ok('«hoy» se compara con ayer HASTA LA MISMA HORA', antesHoy.hasta === hoy.desde && hoy.hasta - hoy.desde === antesHoy.hasta - antesHoy.desde);

console.log('\n· Resumen y cambio');
const ventas = [V(0, [r('a', 2)]), V(1, [r('a'), r('b', 1, 50)]), V(2, [r('c', 1, 30)], { estado: 'cancelado' }), V(3, [r('b', 3, 50)], { estado: 'no_entregado' })];
const s = resumen(entre(ventas, AHORA - 7 * DIA, AHORA + 1));
ok('sólo cuenta lo válido: $350 en 2 tickets, 4 piezas', s.total === 35000 && s.tickets === 2 && s.piezas === 4, JSON.stringify(s));
ok('promedio $175', s.promedio === 17500);
ok('cambio +50 %', cambio(150, 100) === 50);
ok('sin nada antes: null, no infinito', cambio(100, 0) === null);

console.log('\n· Por hora, por día, productos');
const h = porHora([V(0, [r('a')], { h: 17 }), V(1, [r('a')], { h: 18 }), V(2, [r('a', 5)], { h: 10 })]);
ok('24 cajones', h.length === 24 && h[17].tickets === 1);
const hf = horaFuerte(h);
ok('hora fuerte: el tramo de 2 h que más vende (10-12 con $500)', hf.desde === 10 && hf.total === 50000, JSON.stringify(hf));
ok('sin ventas no hay hora fuerte', horaFuerte(porHora([])) === null);
const dias = porDia(ventas.slice(0, 2), AHORA - 2 * DIA, AHORA);
ok('porDia pone un cajón por día, con los vacíos', dias.length === 3 && dias[2].total === 20000 && dias[0].total === 0, JSON.stringify(dias.map((d) => d.total)));
const pp2 = porProducto(ventas.slice(0, 2));
ok('por producto: A $300 en 3 piezas, B $50', pp2[0].producto_id === 'a' && pp2[0].piezas === 3 && pp2[0].total === 30000 && pp2[1].total === 5000);
ok('juntos: A y B sólo 1 vez → no llega a 3', juntos(ventas, 3).length === 0 && juntos(ventas, 1)[0]?.veces === 1);
const csv = filasCSV(ventas.slice(0, 1));
ok('CSV: encabezado y un renglón por producto', csv.length === 2 && csv[1][5] === 'A' && csv[1][6] === 2);

console.log('\n· Consejos: dicen de dónde salen, y callan si no hay con qué');
const P = (id, cantidad, extra = {}) => ({ id, nombre: id.toUpperCase(), precio: 100, activo: true, existencia: { cantidad, apartado: 0, minimo: 0 }, ...extra });
// 40 días de historia: A se vende 1 diario, B nunca, C se agotó
const hist = [V(40, [r('z')])];
for(let d = 0; d < 28; d++) hist.push(V(d, [r('a'), ...(d % 7 === 0 ? [r('c')] : [])], { h: 17 }));
const cs = consejos({ ventas: hist, productos: [P('a', 5), P('b', 10), P('c', 0)], clientes: [], ahora: AHORA });
const acaba = cs.find((c) => c.clave === 'acaba:a');
ok('A (1 al día, quedan 5) → «se te acaba en ~5 días»', acaba && /~5 días/.test(acaba.titulo), JSON.stringify(cs.map((c) => c.titulo)));
ok('…y dice cuánto pedir para un mes (25)', acaba && /pide 25/.test(acaba.porque), acaba?.porque);
ok('C agotado y se vende → alerta primero', cs[0].clave === 'agotado:c', cs[0].clave);
const par = cs.find((c) => c.clave === 'parados');
ok('B no se vende hace 45 días → «detenido», con el dinero', par && /\$1,000/.test(par.porque) && /B/.test(par.porque), par?.porque);
ok('hora fuerte con 28+ tickets: 5 pm', cs.some((c) => c.clave === 'hora' && /5 pm/.test(c.titulo)));
ok('A y C salen juntos 4 veces', cs.some((c) => c.clave === 'juntos' && /4 veces/.test(c.porque)));
const nuevo = consejos({ ventas: [V(0, [r('a', 3)]), V(1, [r('a')])], productos: [P('a', 1), P('b', 50)], clientes: [], ahora: AHORA });
ok('negocio de 1 día: ni «se acaba» ni «no se vende» ni hora fuerte (no hay con qué)', !nuevo.some((c) => /^(acaba|agotado|parados|hora)/.test(c.clave)), JSON.stringify(nuevo.map((c) => c.clave)));
const baja = [];
for(let d = 7; d < 14; d++) baja.push(V(d, [r('a', 2)]));
for(let d = 0; d < 7; d++) if(d % 2) baja.push(V(d, [r('a')]));
const cb = consejos({ ventas: baja, productos: [], clientes: [], ahora: AHORA });
ok('semana 79 % abajo → alerta con los dos números', cb.some((c) => c.clave === 'baja' && /\$300 contra \$1,400/.test(c.porque)), JSON.stringify(cb.map((c) => c.porque)));
const cc = consejos({ ventas: [], productos: [], clientes: [{ urg: { m: { clave: 'toca' } } }, { urg: { m: { clave: 'atrasado' } } }], ahora: AHORA });
ok('clientes: a 1 le toca, 1 atrasado', cc[0]?.clave === 'clientes' && /A 1 cliente le toca/.test(cc[0].titulo) && /1 atrasado/.test(cc[0].porque), JSON.stringify(cc));
ok('sin nada, ningún consejo (ni uno de relleno)', consejos({}).length === 0);
const unDia = []; for(let k = 0; k < 24; k++) unDia.push(V(0, [r('a'), r('b')], { h: 18 }));
const c1 = consejos({ ventas: unDia, productos: [], clientes: [], ahora: AHORA });
ok('24 tickets de UN día: ni hora fuerte ni «salen juntos»', !c1.some((c) => ['hora', 'juntos'].includes(c.clave)), JSON.stringify(c1.map((c) => c.clave)));

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
