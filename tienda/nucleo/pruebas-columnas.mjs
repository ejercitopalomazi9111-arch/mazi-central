#!/usr/bin/env node
/* Pruebas de columnas.js · `node tienda/nucleo/pruebas-columnas.mjs`
   Cada caso es un Excel que de verdad manda la gente. */
import { encabezado, mapear, leerNumero, leerCodigo, normalNombre } from './columnas.js';

let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\n· El renglón de títulos');
const conLogo = [['DISTRIBUIDORA EL PEINE'], ['Lista de precios septiembre'], [], ['Clave', 'Descripción', 'Marca', 'P. Público', 'Exist.'], ['A1', 'Cera mate', 'Reuzel', '$250.00', '12']];
ok('lo encuentra aunque arriba vaya el logo', encabezado(conLogo) === 3, encabezado(conLogo));
ok('si es el primero, es el primero', encabezado([['Producto', 'Precio'], ['x', 1]]) === 0);

console.log('\n· Qué es cada columna');
const m = mapear(conLogo[3], conLogo.slice(4));
ok('«Descripción» sin columna de nombre se toma como el nombre', m.nombre === 1, JSON.stringify(m));
ok('«P. Público» es el precio', m.precio === 3, JSON.stringify(m));
ok('«Clave» es el SKU', m.sku === 0, JSON.stringify(m));
ok('«Marca» es la marca', m.marca === 2);
ok('«Exist.» son las existencias (así venía en la prueba de punta a punta y no se leía)', m.existencias === 4, JSON.stringify(m));
const m2 = mapear(['Producto', 'Descripción', 'Precio venta', 'Precio lista', 'Código de barras', 'Stock', 'Categoría']);
ok('con «Producto» y «Descripción», cada una va a lo suyo', m2.nombre === 0 && m2.descripcion === 1, JSON.stringify(m2));
ok('«Precio lista» es el precio de antes, no el precio', m2.precio === 2 && m2.precio_antes === 3, JSON.stringify(m2));
ok('código de barras, stock y categoría', m2.codigo_barras === 4 && m2.existencias === 5 && m2.categoria === 6, JSON.stringify(m2));
const m3 = mapear(['', 'col2', 'col3'], [['1', 'Tijera de acero japonés', '$300'], ['2', 'Navaja clásica', '$120']]);
ok('sin títulos conocidos, el nombre es la columna con más texto', m3.nombre === 1, JSON.stringify(m3));

console.log('\n· Números como los escribe la gente');
const casos = [['$1,250.00', 1250], ['1250', 1250], [1250.5, 1250.5], ['1.250,50', 1250.5], ['12 pzas', 12], ['', null], ['N/A', null], ['-', null], ['$ 80', 80]];
for(const [v, e] of casos) ok(`«${v}» → ${e}`, leerNumero(v) === e, String(leerNumero(v)));

console.log('\n· Códigos que Excel descompone');
ok('7.50123456789E+12 vuelve a ser el código', leerCodigo('7.50123456789E+12') === '7501234567890', leerCodigo('7.50123456789E+12'));
ok('un número entero no pierde dígitos', leerCodigo(7501234567890) === '7501234567890');
ok('«123.0» pierde el .0', leerCodigo('123.0') === '123');
ok('una clave con letras se queda igual', leerCodigo('AB-12') === 'AB-12');

console.log('\n· Mismo producto escrito distinto');
ok('mayúsculas, acentos y signos no lo hacen otro', normalNombre('CERA  Mate — Reuzel®') === normalNombre('cera mate reuzel'));

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
