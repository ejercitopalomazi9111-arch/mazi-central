#!/usr/bin/env node
/* Pruebas de devolucion.js · `node tienda/nucleo/pruebas-devolucion.mjs` — de aquí sale dinero que se regresa. */
import { nota, leer, factor, importe, monto, disponibles, devueltasDe, efectivoSinDescontar } from './devolucion.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const venta = { folio: 21, subtotal: 300, descuento: 0, renglones: [
  { producto_id: 'a', nombre: 'Cera', precio: 100, cantidad: 2 }, { producto_id: 'b', nombre: 'Talco', precio: 50, cantidad: 1 },
  { producto_id: 'a', nombre: 'Cera', precio: 100, cantidad: 0 + 1 }, { producto_id: null, nombre: 'Borrado', precio: 10, cantidad: 1 } ] };

console.log('\n· La nota va y vuelve');
const t = nota({ folio: 21, metodo: 'efectivo', centavos: 7550, motivo: ' No le quedó ' });
ok('se escribe', t === 'Devolución #21 · efectivo $75.50 · No le quedó', t);
const l = leer(t);
ok('se lee: folio, método, centavos y motivo', l.folio === 21 && l.metodo === 'efectivo' && l.centavos === 7550 && l.motivo === 'No le quedó', JSON.stringify(l));
const s = leer('Devolución #21 · Defectuoso · venía roto');
ok('la del servidor (sin $) se lee sin método ni monto', s.folio === 21 && s.metodo === null && s.centavos === null && s.motivo === 'Defectuoso · venía roto', JSON.stringify(s));
ok('un ajuste cualquiera no es devolución', leer('conteo') === null && leer('Venta fuera del sistema') === null);
ok('#210 no se confunde con #21', devueltasDe(21, [{ producto_id: 'a', delta: 1, nota: 'Devolución #210 · x' }]).size === 0);

console.log('\n· Cuánto se regresa');
ok('sin descuento: 2 ceras = $200', monto(venta, [{ precio: 100, cantidad: 2 }]) === 20000);
const conDesc = { ...venta, descuento: 30 };
ok('con 10% de descuento en la venta, la cera regresa en $90', importe(conDesc, 100, 1) === 9000);
ok('descuento raro mayor al subtotal no da negativo', factor({ subtotal: 100, descuento: 500 }) === 0);
ok('sin subtotal (venta vieja) no divide entre cero', factor({ subtotal: 0, descuento: 0 }) === 1);
ok('centavos redondos: 3 × $33.33 = $99.99', monto(venta, [{ precio: 33.33, cantidad: 3 }]) === 9999);

console.log('\n· Cuánto queda por devolver');
const dev = devueltasDe(21, [
  { producto_id: 'a', delta: 1, nota: 'Devolución #21 · efectivo $100.00 · x' },
  { producto_id: 'a', delta: 1, nota: 'Devolución #21 · Defectuoso' },
  { producto_id: 'b', delta: -1, nota: 'Devolución #21 · raro' },
  { producto_id: 'b', delta: 1, nota: 'Devolución #22 · otro ticket' },
]);
const d = disponibles(venta, dev);
ok('la cera: vendidas 3 (dos renglones), devueltas 2, queda 1', d.find((x) => x.producto_id === 'a')?.queda === 1, JSON.stringify(d));
ok('el talco: de otro ticket no cuenta, queda 1', d.find((x) => x.producto_id === 'b')?.queda === 1);
ok('el producto borrado no se ofrece', d.length === 2);

console.log('\n· El corte');
const movs = [
  { delta: 1, nota: 'Devolución #21 · efectivo $100.00 · x' }, { delta: 2, nota: 'Devolución #21 · efectivo $50.50 · x' },
  { delta: 1, nota: 'Devolución #21 · tarjeta $80.00 · x' }, { delta: 1, nota: 'Devolución #23 · Defectuoso' },
];
ok('efectivo sin descontar = $150.50 (ni tarjeta ni lo que ya descuenta el servidor)', efectivoSinDescontar(movs) === 15050, efectivoSinDescontar(movs));

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
