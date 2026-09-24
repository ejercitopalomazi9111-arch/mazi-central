#!/usr/bin/env node
/* Pruebas de ofertas.js · `node tienda/nucleo/pruebas-ofertas.mjs` — de aquí sale lo que se cobra. */
import { precioConOferta, entra, planAplicar, planTerminar, vencidas } from './ofertas.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const P = (id, precio, extra = {}) => ({ id, nombre: id, precio, precio_antes: null, activo: true, categoria_id: 'maq', marca: 'Wahl', ...extra });

console.log('\n· El precio de oferta');
ok('15 % de $299 → $254 (pesos cerrados)', precioConOferta(299, { tipo: 'porcentaje', valor: 15 }) === 254);
ok('$50 menos de $289.50 → $240', precioConOferta(289.5, { tipo: 'monto', valor: 50 }) === 240);
ok('100 % no deja el producto en $0', precioConOferta(80, { tipo: 'porcentaje', valor: 100 }) === null);
ok('$500 menos a uno de $300 no sale negativo', precioConOferta(300, { tipo: 'monto', valor: 500 }) === null);
ok('1 % de $10 redondea a $10: no es oferta, no se aplica', precioConOferta(10, { tipo: 'porcentaje', valor: 1 }) === null);
ok('sin errores de coma: 10 % de $0.30 no truena', precioConOferta(0.3, { tipo: 'porcentaje', valor: 10 }) === null);

console.log('\n· A quién le toca');
ok('todo', entra(P('a', 1), { todo: true }));
ok('por categoría', entra(P('a', 1), { categorias: ['maq'] }) && !entra(P('a', 1), { categorias: ['otra'] }));
ok('por marca, sin importar mayúsculas', entra(P('a', 1), { marcas: ['wahl'] }));
ok('sin alcance no entra nadie', !entra(P('a', 1), {}));

console.log('\n· Aplicar');
const prods = [P('a', 299), P('b', 100, { precio_antes: 150 }), P('c', 10), P('d', 500, { activo: false }), P('e', 400, { categoria_id: 'otra' })];
const plan = planAplicar(prods, { tipo: 'porcentaje', valor: 15, alcance: { categorias: ['maq'] } });
ok('cambia «a» ($299 → $254) y «c» ($10 → $9), los de la categoría', plan.cambios.map((c) => c.id).join() === 'a,c' && plan.cambios[0].ahora === 254 && plan.cambios[0].antes === 299, JSON.stringify(plan.cambios));
ok('«b» ya estaba en oferta: no se encima', plan.saltados.some((s) => s.id === 'b' && /ya estaba/.test(s.razon)));
ok('con 5 %, «c» ($10 → $9.50 → $10) no cambia: se salta y se dice', planAplicar([P('c', 10)], { tipo: 'porcentaje', valor: 5, alcance: { todo: true } }).saltados[0]?.razon === 'el descuento no le alcanza');
ok('el oculto y el de otra categoría no se tocan', !plan.cambios.some((c) => ['d', 'e'].includes(c.id)) && !plan.saltados.some((s) => ['d', 'e'].includes(s.id)));

console.log('\n· Terminar');
const aplicado = { a: [299, 254], x: [50, 40], f: [120, 100] };
const hoy = [P('a', 254, { precio_antes: 299 }), P('f', 110, { precio_antes: 120 })];
const t = planTerminar(hoy, aplicado);
ok('«a» regresa a $299', t.restaurar.length === 1 && t.restaurar[0].id === 'a' && t.restaurar[0].precio === 299, JSON.stringify(t));
ok('«f» lo cambiaron a mano: se deja y se avisa', t.saltados.some((s) => s.id === 'f' && /a mano/.test(s.razon)));
ok('«x» ya no existe: se avisa sin tronar', t.saltados.some((s) => s.id === 'x'));

console.log('\n· Vencidas');
const ds = [{ activo: true, fin: '2026-09-01T00:00:00Z', alcance: { aplicado: {} } }, { activo: true, fin: '2026-12-01T00:00:00Z', alcance: { aplicado: {} } },
  { activo: false, fin: '2026-09-01T00:00:00Z', alcance: { aplicado: {} } }, { activo: true, fin: null, alcance: { aplicado: {} } }];
ok('sólo la activa que ya pasó su fecha', vencidas(ds, new Date('2026-09-24').getTime()).length === 1);

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
