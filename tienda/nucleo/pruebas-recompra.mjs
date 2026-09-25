#!/usr/bin/env node
/* Pruebas de recompra.js · `node tienda/nucleo/pruebas-recompra.mjs`
   De aquí sale lo que se le dice al cliente («te toca surtirte»): si el
   cálculo miente, la tienda queda como insistente o como distraída. */
import { estimar, porProducto, recompras, teToca, pedidoDeSiempre, ficha, momento, porque, porqueDe, mediana, DIA } from './recompra.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const f = (s) => new Date(s + 'T12:00').getTime();
const ped = (dia, renglones, extra = {}) => ({ creado: new Date(f(dia)).toISOString(), estado: 'entregado', total: 100, forma_pago: 'efectivo', momento_pago: 'al_recibir', canal: 'tienda', renglones, ...extra });
const cera = (n = 1) => ({ producto_id: 'cera', nombre: 'Cera mate', cantidad: n, precio: 100 });
const navaja = (n = 1) => ({ producto_id: 'navaja', nombre: 'Navajas', cantidad: n, precio: 50 });
const talco = (n = 1) => ({ producto_id: 'talco', nombre: 'Talco', cantidad: n, precio: 40 });

console.log('\n· Mediana');
ok('impar', mediana([30, 10, 20]) === 20);
ok('par', mediana([10, 20, 30, 40]) === 25);
ok('vacía da null, no -Infinity ni NaN', mediana([]) === null);

console.log('\n· Cuántas compras hacen falta');
const una = porProducto([ped('2026-09-01', [cera()])]).get('cera');
ok('1 compra → nada', estimar(una.compras) === null);
const dos = porProducto([ped('2026-08-01', [cera()]), ped('2026-08-31', [cera()])]).get('cera');
const e2 = estimar(dos.compras);
ok('2 compras → indicio', e2?.nivel === 'indicio', e2?.nivel);
ok('2 compras a 30 días → cada 30', e2?.cada === 30, e2?.cada);
ok('la próxima es 30 días después de la última', e2 && Math.round((e2.proxima - f('2026-08-31')) / DIA) === 30);
const tres = porProducto([ped('2026-06-01', [cera()]), ped('2026-07-01', [cera()]), ped('2026-07-31', [cera()])]).get('cera');
ok('3 compras → ritmo', estimar(tres.compras)?.nivel === 'ritmo');

console.log('\n· La mediana no se deja arrastrar');
const raro = porProducto(['2026-01-01', '2026-01-31', '2026-03-02', '2026-06-10', '2026-07-10'].map((d) => ped(d, [cera()]))).get('cera');
const er = estimar(raro.compras);
ok('distancias 30, 30, 100, 30 → cada 30, no 47', er?.cada === 30, `${er?.cada} (${er?.base.distancias})`);

console.log('\n· La cantidad cuenta');
const doble = porProducto([ped('2026-06-01', [cera()]), ped('2026-07-01', [cera()]), ped('2026-07-31', [cera(2)])]).get('cera');
const ed = estimar(doble.compras);
ok('compra 1 cada 30 y la última llevó 2 → le toca en 60', ed?.cada === 60, ed?.cada);
const mayoreo = porProducto([ped('2026-06-01', [cera(3)]), ped('2026-08-30', [cera(3)])]).get('cera');
ok('3 piezas cada 90 días → 30 por pieza', estimar(mayoreo.compras)?.porPieza === 30);

console.log('\n· Mismo día, una sola visita');
const mismoDia = porProducto([ped('2026-08-01', [cera()]), ped('2026-08-01', [cera()]), ped('2026-08-31', [cera()])]).get('cera');
ok('dos pedidos el mismo día se juntan', mismoDia.compras.length === 2 && mismoDia.compras[0].cantidad === 2);
const soloMismo = porProducto([ped('2026-08-01', [cera()]), ped('2026-08-01', [cera()])]).get('cera');
ok('dos pedidos el mismo día y nada más → nada (no hay ritmo de 0 días)', estimar(soloMismo.compras) === null);

console.log('\n· Lo cancelado no cuenta');
const conCancelado = [ped('2026-08-01', [cera()]), ped('2026-08-15', [cera()], { estado: 'cancelado' }), ped('2026-08-31', [cera()])];
ok('un cancelado a la mitad no parte el ritmo en dos', estimar(porProducto(conCancelado).get('cera').compras)?.cada === 30);
ok('uno no entregado tampoco', porProducto([ped('2026-08-01', [cera()], { estado: 'no_entregado' })]).size === 0);

console.log('\n· En qué punto va');
const e = { proxima: f('2026-09-30'), cada: 30 };
ok('faltan 20 días → luego', momento(e, f('2026-09-10')).clave === 'luego');
ok('faltan 5 → pronto', momento(e, f('2026-09-25')).clave === 'pronto');
ok('hoy mismo → pronto, faltan 0', momento(e, f('2026-09-30')).clave === 'pronto' && momento(e, f('2026-09-30')).faltan === 0);
ok('pasó una semana → toca', momento(e, f('2026-10-07')).clave === 'toca');
ok('pasó más de medio ritmo → atrasado', momento(e, f('2026-11-10')).clave === 'atrasado');
ok('a quien compra cada 90, dos semanas tarde todavía es «toca»', momento({ proxima: f('2026-09-30'), cada: 90 }, f('2026-10-14')).clave === 'toca');

console.log('\n· Te toca surtirte');
const historia = [
  ped('2026-07-01', [cera(), navaja()]), ped('2026-07-31', [cera(), navaja()]), ped('2026-08-30', [cera(), talco()]),
];
const hoy = f('2026-09-27');
const tt = teToca(historia, hoy);
ok('la cera (cada 30, última 30 ago) ya le toca', tt.some((r) => r.producto_id === 'cera'), tt.map((r) => r.producto_id).join());
ok('el talco (una sola compra) no sale', !tt.some((r) => r.producto_id === 'talco'));
const todas = recompras(historia, hoy);
ok('la navaja (2 compras) sale como indicio', todas.find((r) => r.producto_id === 'navaja')?.nivel === 'indicio');
ok('ordenadas de la más urgente a la menos', todas[0].producto_id === 'navaja', todas.map((r) => r.producto_id).join());

console.log('\n· Cada aviso dice en qué se basa');
const tx = porque(todas.find((r) => r.producto_id === 'cera'));
ok('dice cuántas veces', /3 veces/.test(tx), tx);
ok('dice la distancia', /30 días/.test(tx), tx);
ok('dice la última fecha', /30 ago/.test(tx), tx);
const tn = porque(todas.find((r) => r.producto_id === 'navaja'));
ok('el indicio se confiesa como pista', /pista/.test(tn), tn);
ok('para el admin habla en tercera persona', /Lo ha comprado/.test(porqueDe(todas[1])) && !/llevaste/.test(porqueDe(todas[1])), porqueDe(todas[1]));
const tdoble = porque(ed ? { ...ed } : null);
ok('con varias piezas explica lo que le dura cada una', /por pieza/i.test(tdoble) && /llevaste 2/.test(tdoble), tdoble);

console.log('\n· Tu pedido de siempre');
ok('sin pedidos → null', pedidoDeSiempre([]) === null);
const s1 = pedidoDeSiempre([ped('2026-09-01', [cera(), navaja(2)])]);
ok('con un pedido → es su último, y lo dice', s1?.tipo === 'ultimo' && s1.renglones.length === 2);
const s = pedidoDeSiempre(historia);
ok('con varios → lo que se repite (cera y navaja, no talco)', s?.tipo === 'siempre' && s.renglones.map((r) => r.producto_id).sort().join() === 'cera,navaja', JSON.stringify(s));
ok('la cera primero: salió en 3, la navaja en 2', s.renglones[0].producto_id === 'cera' && s.renglones[0].veces === 3);
const cant = pedidoDeSiempre([ped('2026-07-01', [cera(2)]), ped('2026-08-01', [cera(2)]), ped('2026-09-01', [cera(5)])]);
ok('en la cantidad típica (2), no la última (5)', cant.renglones[0].cantidad === 2);
const nada = pedidoDeSiempre([ped('2026-07-01', [cera()]), ped('2026-08-01', [navaja()])]);
ok('si nada se repite, cae a su último pedido', nada.tipo === 'ultimo' && nada.renglones[0].producto_id === 'navaja');
ok('un producto borrado (sin id) no rompe nada', pedidoDeSiempre([ped('2026-07-01', [{ producto_id: null, nombre: 'x', cantidad: 1 }])]) === null);

console.log('\n· La ficha');
const fi = ficha([...historia, ped('2026-09-10', [cera()], { estado: 'cancelado' })], hoy);
ok('cuenta 3 pedidos y 1 cancelado', fi.pedidos === 3 && fi.cancelados === 1, JSON.stringify(fi));
ok('primera compra el 1 jul', fi.primera === new Date(f('2026-07-01')).setHours(0, 0, 0, 0));
ok('viene cada 30 días', fi.cada === 30);
ok('gasto promedio', fi.promedio === 100);
ok('paga en efectivo', fi.pago === 'efectivo');
ok('le toca venir esta semana (29 sep)', fi.momento?.clave === 'pronto', fi.momento?.clave);
const fn = ficha([]);
ok('sin pedidos no truena y dice cero', fn.pedidos === 0);
const f1 = ficha([ped('2026-09-01', [cera()])], hoy);
ok('con uno solo no inventa frecuencia', f1.cada === null && f1.proxima === null && f1.momento === null);

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
