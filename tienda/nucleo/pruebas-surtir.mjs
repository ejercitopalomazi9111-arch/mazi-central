#!/usr/bin/env node
/* `node tienda/nucleo/pruebas-surtir.mjs` — el pedido al proveedor: cuánto, de qué y por qué. */
import { planSurtir, porMarca, textoPedido, filasCSV } from './surtir.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const DIA = 86400000, AHORA = new Date('2026-09-25T18:00:00Z').getTime();
const venta = (diasAtras, renglones, estado = 'entregado') => ({ creado: new Date(AHORA - diasAtras * DIA).toISOString(), estado, renglones: renglones.map(([id, cantidad]) => ({ producto_id: id, cantidad, precio: 100 })) });
const P = (id, nombre, marca, cantidad, minimo, extra = {}) => ({ id, nombre, marca, sku: 'K-' + id, activo: true, existencia: { cantidad, apartado: 0, minimo }, ...extra });
const productos = [
  P('a', 'Aceite ligero', 'Marca Uno', 0, 2),          // se vende y se acabó
  P('b', 'Brocha grande', 'Marca Uno', 3, 1),           // se vende rápido, le quedan 3
  P('c', 'Cepillo', 'Marca Dos', 1, 4),                  // no se vende, bajo el mínimo
  P('d', 'Difusor', 'Marca Dos', 50, 2),                // sobra
  P('e', 'Esponja', 'Marca Dos', 0, 0),                 // no se vende, sin mínimo: no se pide
  P('f', 'Fijador', '', 1, 3, { activo: false }),       // inactivo: nunca
  P('g', 'Gel', ' ', 2, 1, { existencia: { cantidad: 5, apartado: 4, minimo: 2 } }), // lo apartado no cuenta
];
// 28 días de historia: a vende 14 (½ al día), b 28 (1 al día), c nada, d 2.
const ventas = [venta(40, [['d', 1]])];
for(let d = 0; d < 28; d++){ ventas.push(venta(d, [['b', 1]])); if(d % 2 === 0) ventas.push(venta(d, [['a', 1]])); }
ventas.push(venta(3, [['a', 50]], 'cancelado'));   // lo cancelado no cuenta
ventas.push(venta(5, [['d', 2]]));

console.log('\n· El plan, con un mes de ventas');
const { renglones: R, base } = planSurtir({ ventas, productos, ahora: AHORA, cobertura: 30 });
const r = (id) => R.find((x) => x.id === id);
ok('lo agotado que se vende va primero', R[0]?.id === 'a' && r('a').motivo === 'agotado', R.map((x) => x.id).join(','));
ok('para 30 días a ½ por día: pide 15', r('a').pedir === 15, r('a').pedir);
ok('lo cancelado no infla el ritmo', Math.abs(r('a').porDia - 0.5) < 1e-9, r('a').porDia);
ok('la brocha: 1 al día, le quedan 3 → se acaba en ~3 días, pide 27', r('b').motivo === 'acaba' && r('b').pedir === 27 && Math.round(r('b').dias) === 3, JSON.stringify(r('b')));
ok('dice por qué con sus números', /Vendes como 7 por semana y te quedan 3: alcanza para ~3 días/.test(r('b').porque), r('b').porque);
ok('el cepillo no se vende pero está bajo su mínimo: pide para llegar al mínimo (3)', r('c').motivo === 'minimo' && r('c').pedir === 3 && /No se vendió en 28 días/.test(r('c').porque), JSON.stringify(r('c')));
ok('lo que sobra no se pide', !r('d'));
ok('sin ventas y sin mínimo, no se pide', !r('e'));
ok('lo inactivo nunca', !r('f'));
ok('lo apartado no cuenta como disponible (hay 1, mínimo 2 → pide 1)', r('g')?.hay === 1 && r('g').pedir === 1, JSON.stringify(r('g')));
ok('una marca vacía se agrupa como «Sin marca»', r('g').marca === 'Sin marca');
ok('dice de dónde sale', /últimos 28 días/.test(base));
ok('con 14 días de cobertura pide menos', planSurtir({ ventas, productos, ahora: AHORA, cobertura: 14 }).renglones.find((x) => x.id === 'a').pedir === 7);

console.log('\n· Con menos de una semana de ventas');
const pocas = [venta(2, [['b', 10]]), venta(1, [['a', 5]])];
const p2 = planSurtir({ ventas: pocas, productos, ahora: AHORA });
ok('no inventa ritmo: sólo el mínimo', p2.renglones.every((x) => x.porDia === null && x.motivo === 'minimo'), JSON.stringify(p2.renglones.map((x) => [x.id, x.motivo])));
ok('el agotado con mínimo 2 pide 2, no 150', p2.renglones.find((x) => x.id === 'a')?.pedir === 2);
ok('y lo dice', /Todavía no hay una semana/.test(p2.base));
ok('una sola venta en un mes no es un ritmo', planSurtir({ ventas: [venta(40, [['d', 1]]), venta(3, [['c', 1]])], productos, ahora: AHORA }).renglones.find((x) => x.id === 'c').porDia === null);

console.log('\n· Por marca y el mensaje al proveedor');
const cant = new Map([['b', 20], ['c', 0]]);
const G = porMarca(R, cant);
ok('la marca con algo agotado va primero', G[0].marca === 'Marca Uno', G.map((g) => g.marca).join(','));
ok('respeta lo que el dueño corrigió (20 en vez de 27)', G[0].renglones.find((x) => x.id === 'b').pedir === 20 && G[0].piezas === 35);
const t = textoPedido(G[0], { negocio: 'Surtido', fecha: new Date(AHORA) });
ok('el mensaje lleva negocio, marca y fecha', t.startsWith('*Pedido de Surtido* · Marca Uno · 25 de septiembre'), t.split('\n')[0]);
ok('cada renglón con cantidad, nombre y clave', t.includes('• 15 × Aceite ligero (clave K-a)') && t.includes('• 20 × Brocha grande (clave K-b)'), t);
ok('y el total', t.includes('Total: 35 piezas en 2 productos.'));
const t2 = textoPedido(G.find((g) => g.marca === 'Marca Dos'));
ok('lo puesto en 0 no va en el mensaje', !t2.includes('Cepillo'), t2);
const csv = filasCSV(G);
ok('el Excel trae encabezados y sólo lo que se pide', csv[0][0] === 'Marca' && csv.length === 1 + R.length - 1 && !csv.some((f) => f[1] === 'Cepillo'), csv.length);
ok('sin ventas ni productos, plan vacío y sin tronar', planSurtir({}).renglones.length === 0);

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
