#!/usr/bin/env node
/* Pruebas de arranque.js · `node tienda/nucleo/pruebas-arranque.mjs` */
import { pendientesDeArranque } from './arranque.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const claves = (n, ps) => pendientesDeArranque(n, ps).map((x) => x.clave);

const prod = (o = {}) => ({ activo: true, precio: 100, fotos: ['a.jpg'], categoria_id: 'c1', ...o });
const completo = { ajustes: {
  contacto: { whatsapp: '442 123 4567', horario: 'Lunes a sábado de 9 a 7', direccion: 'Hidalgo 10' },
  envio: { costo: 60, zona: 'Querétaro' }, pagos: { efectivo: true, transferencia: true, clabe: '012180001234567895' },
  tienda: { lat: 20.59, lng: -100.39 } } };
const diez = Array.from({ length: 10 }, () => prod());

console.log('\n· Una tienda lista');
ok('sin pendientes', !claves(completo, diez).length, claves(completo, diez).join());

console.log('\n· Una tienda recién creada');
const nueva = claves({ ajustes: {} }, []);
ok('pide productos, WhatsApp, envío, ubicación y horario', ['catalogo', 'whatsapp', 'envio', 'ubicacion', 'horario'].every((k) => nueva.includes(k)), nueva.join());
ok('el efectivo viene prendido de fábrica: no pide formas de pago', !nueva.includes('pagos'));
ok('lo que más le duele al cliente va primero (sin productos)', nueva[0] === 'catalogo');
ok('cada pendiente dice por qué y a dónde ir', pendientesDeArranque({ ajustes: {} }, []).every((x) => x.porque.length > 10 && x.ruta.startsWith('/a/')));

console.log('\n· Uno por uno');
const sin = (ruta, cambio) => { const n = structuredClone(completo); cambio(n.ajustes); return claves(n, diez); };
ok('WhatsApp de 7 dígitos no cuenta', sin('', (a) => { a.contacto.whatsapp = '1234567'; }).includes('whatsapp'));
ok('sin ninguna forma de pago', sin('', (a) => { a.pagos = { efectivo: false }; }).includes('pagos'));
ok('transferencia con la CLABE mal copiada', sin('', (a) => { a.pagos.clabe = '01218000123'; }).includes('clabe'));
ok('envío gratis sin zona (costo 0) no se toma como pendiente', !sin('', (a) => { a.envio = { costo: 0 }; }).includes('envio'));
ok('sin ubicación de la tienda', sin('', (a) => { delete a.tienda; }).includes('ubicacion'));

console.log('\n· El catálogo');
ok('productos sin precio', claves(completo, [...diez, prod({ precio: 0 })]).includes('precio'));
ok('uno sin foto entre diez y uno: normal, no avisa', !claves(completo, [...diez, prod({ fotos: [] })]).includes('fotos'));
ok('la mitad sin foto: avisa y dice cuántos', pendientesDeArranque(completo, [...diez, ...diez.map(() => prod({ fotos: [] }))]).find((x) => x.clave === 'fotos')?.texto === '10 productos no tienen foto');
ok('sin categoría', claves(completo, [...diez, prod({ categoria_id: null })]).includes('categoria'));
ok('los inactivos no cuentan', !claves(completo, [...diez, prod({ activo: false, precio: 0, fotos: [], categoria_id: null })]).length);
ok('sin negocio no truena', Array.isArray(pendientesDeArranque(null)));

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
