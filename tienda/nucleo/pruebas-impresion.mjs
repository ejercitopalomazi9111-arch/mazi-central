#!/usr/bin/env node
/* Pruebas de impresión · `node tienda/nucleo/pruebas-impresion.mjs`
   Byte por byte contra los manuales: Epson ESC/POS y Star Line Mode. */
import { Ticket, codificar, partir, dosLados, aBits, PAGINAS } from './impresion/escpos.js';
import { piezasTicket, aBytes, aRenglones } from './impresion/plantilla.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join(' ');
const contiene = (b, sec) => { const s = hex(b), q = hex(sec); return s.includes(q); };

console.log('\n· Acentos');
ok('CP850: «Baño ¿Ñ?» → 42 61 a4 6f 20 a8 a5 3f', hex(codificar('Baño ¿Ñ?', 'cp850')) === '42 61 a4 6f 20 a8 a5 3f', hex(codificar('Baño ¿Ñ?', 'cp850')));
ok('CP850: Á É Í Ó Ú → b5 90 d6 e0 e9', hex(codificar('ÁÉÍÓÚ', 'cp850')) === 'b5 90 d6 e0 e9');
ok('CP437: las mayúsculas acentuadas que no tiene salen sin acento, no «?»', hex(codificar('Ó', 'cp437')) === '4f' && hex(codificar('é', 'cp437')) === '82');
ok('WPC1252: la «ñ» es 0xF1', hex(codificar('ñ', 'wpc1252')) === 'f1');
ok('sin acentos: «Pequeño café» → «Pequeno cafe»', String.fromCharCode(...codificar('Pequeño café', 'ascii')) === 'Pequeno cafe');
ok('comillas tipográficas y raya se vuelven ASCII', String.fromCharCode(...codificar('“hola” — sí', 'ascii')) === '"hola" - si');
ok('CP858 tiene €', hex(codificar('€', 'cp858')) === 'd5');

console.log('\n· Acomodo en columnas');
ok('partir respeta las 32 columnas', partir('Shampoo anticaspa con mentol para uso diario de 1 litro', 32).every((r) => r.length <= 32));
const dl = dosLados('Cera mate fijación extra fuerte', '$250.00', 32);
ok('par: el precio queda pegado a la derecha', dl.at(-1).endsWith('$250.00') && dl.every((r) => r.length <= 32), JSON.stringify(dl));
ok('una palabra más larga que el renglón se corta, no se sale', partir('x'.repeat(70), 32).every((r) => r.length <= 32));

console.log('\n· ESC/POS (Epson y compatibles)');
const k = new Ticket({ columnas: 48, pagina: 'cp850' }).texto('Hola', { alinear: 'centro', negritas: true }).cortar().bytes();
ok('empieza con ESC @ y la página de códigos PC850 (ESC t 2)', hex(k).startsWith('1b 40 1b 74 02'));
ok('centrar es ESC a 1, negritas ESC E 1', contiene(k, [0x1b, 0x61, 1]) && contiene(k, [0x1b, 0x45, 1]));
ok('corte parcial con avance: GS V 66 0', contiene(k, [0x1d, 0x56, 0x42, 0]));
ok('corte total: GS V 65 0', contiene(new Ticket({ corte: 'total' }).cortar().bytes(), [0x1d, 0x56, 0x41, 0]));
ok('sin corte no manda GS V', !contiene(new Ticket({ corte: 'no' }).cortar().bytes(), [0x1d, 0x56]));
ok('cajón: ESC p 0 25 250', contiene(new Ticket().cajon().bytes(), [0x1b, 0x70, 0, 25, 250]));
ok('grande es GS ! 0x11', contiene(new Ticket().texto('A', { grande: true }).bytes(), [0x1d, 0x21, 0x11]));
const q = new Ticket().qrCodigo('https://x.mx').bytes();
ok('QR: modelo 2, datos con su largo (12+3=15), imprimir', contiene(q, [0x1d, 0x28, 0x6b, 4, 0, 0x31, 0x41, 0x32, 0]) && contiene(q, [0x1d, 0x28, 0x6b, 15, 0, 0x31, 0x50, 0x30]) && contiene(q, [0x1d, 0x28, 0x6b, 3, 0, 0x31, 0x51, 0x30]));
ok('QR apagado (impresoras viejas o de matriz): no manda nada de QR', !contiene(new Ticket({ qr: false }).qrCodigo('x').bytes(), [0x1d, 0x28, 0x6b]));
ok('número de página a mano (clones con otra tabla)', hex(new Ticket({ paginaNumero: 47 }).bytes()).startsWith('1b 40 1b 74 2f'));

console.log('\n· Star Line Mode');
const s = new Ticket({ dialecto: 'star', pagina: 'cp858' }).texto('Hola', { alinear: 'centro', negritas: true }).cortar().cajon().bytes();
ok('página de códigos: ESC GS t 4', hex(s).startsWith('1b 40 1b 1d 74 04'));
ok('centrar: ESC GS a 1 · negritas: ESC E', contiene(s, [0x1b, 0x1d, 0x61, 1]) && contiene(s, [0x1b, 0x45]));
ok('corte parcial: ESC d 3 · cajón: BEL', contiene(s, [0x1b, 0x64, 3]) && contiene(s, [0x07]));

console.log('\n· Imagen (modo imagen y logos)');
const rgba = new Uint8ClampedArray(10 * 2 * 4);
for(let i = 0; i < 10; i++){ rgba.set([0, 0, 0, 255], i * 4); rgba.set([255, 255, 255, 255], (10 + i) * 4); }
const bits = aBits(rgba, 10, 2, { tramado: false });
ok('10 px de ancho se redondea a 16 (2 bytes por renglón)', bits.ancho === 16 && bits.datos.length === 4);
ok('renglón negro = ff c0, renglón blanco = 00 00', hex(bits.datos) === 'ff c0 00 00', hex(bits.datos));
const img = new Ticket().imagen({ ancho: 16, alto: 300, datos: new Uint8Array(600) }).bytes();
ok('GS v 0 en tiras de 255 renglones (300 → 255 + 45)', contiene(img, [0x1d, 0x76, 0x30, 0, 2, 0, 255, 0]) && contiene(img, [0x1d, 0x76, 0x30, 0, 2, 0, 45, 0]));

console.log('\n· La plantilla');
const negocio = { nombre: 'Surtido', marca: { nombre_corto: 'Surtido' }, ajustes: { contacto: { direccion: 'Hidalgo 10, Centro', whatsapp: '4421234567' }, ticket: { pie: 'Vuelve pronto' } } };
const venta = { folio: 42, cuando: '2026-09-24T16:30:00', renglones: [{ nombre: 'Cera mate fijación fuerte 100 g', cantidad: 2, precio: 125, importe: 250 }, { nombre: 'Navaja', cantidad: 1, precio: 80, importe: 80 }],
  total: 330, metodo: 'efectivo', recibido: 500, cambio: 170, qr: 'https://tienda.mx/#/' };
const ps = piezasTicket(venta, negocio);
const r32 = aRenglones(ps, 32).filter((x) => x.v != null).map((x) => x.v);
ok('a 32 columnas ningún renglón se pasa (los grandes a 16)', aRenglones(ps, 32).every((x) => x.qr || x.v.length <= (x.grande ? 16 : 32)));
ok('dice total, cambio y el pie', r32.some((x) => /TOTAL \(3 piezas\).*\$330\.00/.test(x)) && r32.some((x) => /Cambio.*\$170\.00/.test(x)) && r32.some((x) => x.includes('Vuelve pronto')), r32.join('\n'));
ok('el precio unitario sale cuando son varias', r32.some((x) => x.includes('2 x $125.00')));
const b58 = aBytes(ps, { columnas: 32, pagina: 'cp850' }, { cajon: true });
ok('bytes: empieza bien, corta y abre el cajón al final', hex(b58).startsWith('1b 40 1b 74 02') && contiene(b58, [0x1d, 0x56, 0x42]) && hex(b58).endsWith('1b 70 00 19 fa'));
ok('la «ó» de «fijación» va en CP850 (a2)', contiene(b58, [0x66, 0x69, 0x6a, 0x61, 0x63, 0x69, 0xa2, 0x6e]));
ok('el QR va en el ticket', contiene(b58, [0x1d, 0x28, 0x6b]));
ok('con ticket.qr = false no va', !contiene(aBytes(piezasTicket(venta, { ...negocio, ajustes: { ...negocio.ajustes, ticket: { qr: false } } }), { columnas: 32 }), [0x1d, 0x28, 0x6b]));
ok('todas las páginas tienen número para los dos dialectos', Object.values(PAGINAS).every((p) => Number.isInteger(p.escpos) && Number.isInteger(p.star)));

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
