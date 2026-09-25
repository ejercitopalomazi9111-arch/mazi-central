#!/usr/bin/env node
/* Pruebas de redes.js · `node tienda/nucleo/pruebas-redes.mjs` */
import { ideas, mejorHora, MINIMO_HORA } from './redes.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const AHORA = new Date('2026-09-24T18:00').getTime(), DIA = 86400000;
const P = (id, p, extra = {}) => ({ id, n: 'Prod ' + id, m: 'Marca', p, a: null, q: 20, x: false, ...extra });
const V = (dias, ids, extra = {}) => ({ creado: new Date(AHORA - dias * DIA).toISOString(), estado: 'entregado', canal: 'pos', total: 100, renglones: ids.map((id) => ({ producto_id: id, nombre: id, cantidad: 1, precio: 100, importe: 100 })), ...extra });
const productos = [P('a', 254, { a: 299 }), P('b', 100), P('c', 50, { q: 2 }), P('d', 80, { x: true, q: 0 }), P('e', 120)];
const ventas = [V(1, ['b', 'c']), V(2, ['b']), V(3, ['e']), V(20, ['c'])];
const id = ideas({ productos, ventas, admin: [{ id: 'b', activo: true, creado: new Date(AHORA - 60 * DIA).toISOString() }, { id: 'e', activo: true, creado: new Date(AHORA - 3 * DIA).toISOString() }], firma: 'Surtido', enlace: (x) => `https://t/p/${x}`, ahora: AHORA });
const oferta = id.find((x) => x.tipo === 'Oferta');
ok('oferta con el precio real: de $299 a $254, 15 %', oferta && /de \$299 a \$254/.test(oferta.texto) && /15 %/.test(oferta.texto), oferta?.texto);
ok('lleva la liga al producto y la firma', /https:\/\/t\/p\/a/.test(oferta.texto) && /— Surtido/.test(oferta.texto));
const top = id.find((x) => x.tipo === 'Lo más pedido');
ok('lo más pedido de la semana: B primero', top && /1\. Prod b/.test(top.texto), top?.texto);
ok('nuevo: E (dado de alta hace 3 días)', id.some((x) => x.tipo === 'Nuevo' && x.producto.id === 'e'));
ok('últimas piezas: C (quedan 2 y sí se vende)', id.some((x) => x.tipo === 'Últimas piezas' && x.producto.id === 'c' && /Últimas 2 piezas/.test(x.texto)));
ok('nada de lo agotado', !id.some((x) => x.producto?.id === 'd'));
const precios = id.flatMap((x) => (x.texto.match(/\$[\d,.]+/g) || []).map((m) => Number(m.slice(1).replace(/,/g, ''))));
ok('ningún precio que no esté en el catálogo', precios.every((n) => productos.some((p) => p.p === n || p.a === n)), precios.join());
ok('sin ventas ni ofertas: pocas ideas, ninguna inventada', ideas({ productos: [P('z', 10)] }).length === 0);

const recien = ideas({ productos, admin: productos.map((p) => ({ id: p.id, activo: true, creado: new Date(AHORA - 2 * DIA).toISOString() })), ahora: AHORA });
ok('catálogo recién importado: nada sale como «nuevo»', !recien.some((x) => x.tipo === 'Nuevo'), JSON.stringify(recien.map((x) => x.tipo)));
console.log('\n· Mejor hora');
const pocas = mejorHora([V(1, ['a'], { canal: 'tienda' })]);
ok('con 1 pedido en línea: no alcanza, y dice cuántos van', !pocas.suficiente && pocas.van === 1);
const muchas = [];
for(let i = 0; i < MINIMO_HORA; i++){ const d = new Date('2026-09-17T19:10'); d.setDate(d.getDate() - 7 * (i % 3)); if(i % 4 === 0) d.setHours(12); muchas.push({ ...V(0, ['a'], { canal: i % 2 ? 'bot' : 'tienda' }), creado: d.toISOString() }); }
muchas.push(...Array.from({ length: 30 }, () => V(0, ['a'], { canal: 'pos' })));
const mh = mejorHora(muchas);
ok('los de mostrador no cuentan; jueves a las 7 pm → publica a las 6 pm', mh.suficiente && mh.dia === 4 && mh.hora === 19 && mh.publicar === 18, JSON.stringify(mh));
ok('lo dice en palabras', /jueves/.test(mh.texto) && /6 pm/.test(mh.texto));

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
