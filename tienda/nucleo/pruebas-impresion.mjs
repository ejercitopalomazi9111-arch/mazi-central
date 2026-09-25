#!/usr/bin/env node
/* Pruebas de impresión · `node tienda/nucleo/pruebas-impresion.mjs`
   Byte por byte contra los manuales: Epson ESC/POS y Star Line Mode. */
import { Ticket, codificar, partir, dosLados, aBits, PAGINAS } from './impresion/escpos.js';
import { piezasTicket, piezasCorte, aBytes, aRenglones } from './impresion/plantilla.js';
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

console.log('\n· El corte de caja');
const corte = { abierta: '2026-09-25T09:00:00', cerrada: '2026-09-25T20:05:00', cajero: 'Doña Lupe', tickets: 42, fondo: 500, efectivo: 3200.5,
  devuelto: 150, tarjeta: 1800, transferencia: 0, esperado: 3550.5, contado: 3500.5, nota: 'se pagó el garrafón', conteo: { 100000: 2, 50000: 3, 10000: 0, 50: 1 } };
const rc = aRenglones(piezasCorte(corte, negocio), 32).map((r) => r.v || '').join('\n');
ok('dice que es un corte y de quién', /CORTE DE CAJA/.test(rc) && /Cajero: Doña Lupe/.test(rc));
ok('debía, contó y el veredicto con la diferencia', /Debía haber\s+\$3,550\.50/.test(rc) && /Se contó\s+\$3,500\.50/.test(rc) && /FALTAN \$50\.00/.test(rc), rc);
ok('las devoluciones restan y la tarjeta se aclara que no va al cajón', /Devoluciones\s+-\$150\.00/.test(rc) && /Tarjeta \(no va en el/.test(rc));
ok('lo que es cero no se imprime (transferencia $0, billetes de 100 en 0)', !/Transferencia/.test(rc) && !/0 x \$100\.00/.test(rc));
ok('el conteo por billete, del más grande al más chico', rc.indexOf('2 x $1,000.00') < rc.indexOf('3 x $500.00') && rc.indexOf('3 x $500.00') < rc.indexOf('1 x $0.50'));
ok('lleva la nota y renglones para firmar', /Nota: se pagó el garrafón/.test(rc) && /Entregó: _+/.test(rc) && /Recibió: _+/.test(rc));
ok('cuadrado exacto lo dice', /CUADRÓ EXACTO/.test(aRenglones(piezasCorte({ ...corte, contado: 3550.5 }, negocio), 48).map((r) => r.v || '').join('\n')));
ok('ningún renglón se sale del papel de 58 mm', aRenglones(piezasCorte(corte, negocio), 32).every((r) => !r.v || r.v.length <= 32));
const viejo = aRenglones(piezasCorte({ cerrada: corte.cerrada, esperado: 100, contado: 100, reimpresion: true }, negocio), 32).map((r) => r.v || '');
ok('el reimpreso lo dice y no deja dos rayas seguidas', viejo.some((v) => /REIMPRESIÓN/.test(v)) && !viejo.some((v, i) => /^-+$/.test(v) && /^-+$/.test(viejo[i + 1] || '')), viejo.join('|'));
ok('y sale en bytes para la impresora', aBytes(piezasCorte(corte, negocio), { columnas: 32 }).length > 200);

console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
