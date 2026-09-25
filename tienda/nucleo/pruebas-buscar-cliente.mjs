#!/usr/bin/env node
/* `node tienda/nucleo/pruebas-buscar-cliente.mjs` — encontrar al cliente en la caja. */
import { buscarClientes, telefono, telefonoBonito, revisarAlta, mismoTelefono, normal } from './buscar-cliente.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const L = [
  { id: 1, nombre: 'Juan Pérez', telefono: '4421112233' },
  { id: 2, nombre: 'Juana López', telefono: '+52 442 999 8877' },
  { id: 3, nombre: 'Barbería El Güero', telefono: '5215512345678' },
  { id: 4, nombre: 'Adán Juárez', telefono: null },
  { id: 5, nombre: '', telefono: '4420000000' },
];
const ids = (r) => r.map((c) => c.id).join(',');

console.log('\n· El teléfono');
ok('10 dígitos pasan', telefono('4428833786') === '4428833786');
ok('con espacios y guiones', telefono('442-883 37 86') === '4428833786');
ok('con +52', telefono('+52 442 883 3786') === '4428833786');
ok('con el viejo 521 de WhatsApp', telefono('5214428833786') === '4428833786');
ok('9 dígitos no', telefono('442883378') === null);
ok('vacío no', telefono('') === null && telefono(null) === null);
ok('bonito se dicta en tres pedazos', telefonoBonito('4428833786') === '442 883 3786', telefonoBonito('4428833786'));

console.log('\n· Buscar por nombre');
ok('«juan» encuentra a Juan y a Juana, Juan primero', ids(buscarClientes(L, 'juan')) === '1,2', ids(buscarClientes(L, 'juan')));
ok('sin acentos encuentra con acentos', ids(buscarClientes(L, 'perez')) === '1');
ok('«jua pe» junta dos pedazos', ids(buscarClientes(L, 'jua pe')) === '1');
ok('en otro orden también', ids(buscarClientes(L, 'perez juan')) === '1');
ok('a media palabra no: «an» no es Juan', ids(buscarClientes(L, 'an')) === '');
ok('«juarez» encuentra al que lo lleva de apellido', ids(buscarClientes(L, 'juarez')) === '4');
ok('«guero» encuentra la barbería', ids(buscarClientes(L, 'guero')) === '3');
ok('sin nombre no sale por texto', !buscarClientes(L, 'a').some((c) => c.id === 5));
ok('vacío no da nada', buscarClientes(L, '  ').length === 0);
ok('el tope se respeta', buscarClientes(Array.from({ length: 30 }, (_, i) => ({ id: i, nombre: 'Luis ' + i })), 'luis', 5).length === 5);

console.log('\n· Buscar por WhatsApp');
ok('un pedazo del número basta', ids(buscarClientes(L, '8877')) === '2');
ok('escrito con espacios', ids(buscarClientes(L, '442 111')) === '1');
ok('encuentra al guardado con 521', ids(buscarClientes(L, '5512345678')) === '3');
ok('dos dígitos todavía no buscan número', ids(buscarClientes(L, '44')) === '');

console.log('\n· Dar de alta');
ok('nombre y WhatsApp: pasa', !Object.keys(revisarAlta({ nombre: 'Pepe', telefono: '4421234567' })).length);
ok('sin nombre lo dice', revisarAlta({ nombre: ' ', telefono: '4421234567' }).nombre === 'Falta su nombre');
ok('sin teléfono lo dice', revisarAlta({ nombre: 'Pepe', telefono: '' }).telefono === 'Falta su WhatsApp');
ok('teléfono corto dice por qué', revisarAlta({ nombre: 'Pepe', telefono: '44212' }).telefono === 'Un WhatsApp son 10 números');
ok('el mismo número ya dado de alta se reconoce aunque venga escrito distinto', mismoTelefono(L, '442 999 88 77')?.id === 2);
ok('uno nuevo no se confunde', mismoTelefono(L, '4425550000') === null);
ok('normal quita acentos y espacios de más', normal('  Güero   PÉREZ ') === 'guero perez');

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
