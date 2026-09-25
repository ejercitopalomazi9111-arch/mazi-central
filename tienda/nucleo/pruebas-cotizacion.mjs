#!/usr/bin/env node
/* `node tienda/nucleo/pruebas-cotizacion.mjs` — cotizar, mandar y volverla venta sin sorpresas. */
import { total, piezas, vigente, vence, cambios, aTicket, juntar, textoWhatsApp, crearArchivo, VIGENCIA } from './cotizacion.js';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const DIA = 86400000, HOY = new Date('2026-09-25T12:00:00-06:00').getTime();
const cot = { folio: 'C3', cuando: HOY, dias: 7, cliente: { nombre: 'Barbería El Güero' }, notas: 'Envío gratis en la zona.',
  renglones: [{ id: 'a', nombre: 'Cera mate 113 g', precio: 189.5, cantidad: 3 }, { id: 'b', nombre: 'Navaja clásica', precio: 250, cantidad: 1 }, { id: 'c', nombre: 'Talco', precio: 0.1, cantidad: 3 }] };

console.log('\n· Cuentas');
ok('el total va en centavos exactos (0.1 × 3 no da 0.30000000000000004)', total(cot.renglones) === 56850 + 25000 + 30, total(cot.renglones));
ok('las piezas se cuentan', piezas(cot.renglones) === 7);
ok('vacío da cero', total([]) === 0 && total(null) === 0);

console.log('\n· Vigencia');
ok('recién hecha, vigente', vigente(cot, HOY + DIA));
ok('el día 7 todavía no', vigente(cot, HOY + 7 * DIA - 1));
ok('al cumplir 7 días, vencida', !vigente(cot, HOY + 7 * DIA));
ok('sin días dichos, vale la vigencia de la casa', vence({ cuando: HOY }) === HOY + VIGENCIA * DIA);

console.log('\n· Lo que cambió desde que se cotizó');
const hoy = new Map([['a', { n: 'Cera', p: 199, q: 10 }], ['b', { n: 'Navaja', p: 250, q: 0 }]]);
const cs = cambios(cot, hoy);
ok('dice que la cera subió de $189.50 a $199', cs.some((x) => x.id === 'a' && x.tipo === 'precio' && x.antes === 18950 && x.ahora === 19900), JSON.stringify(cs));
ok('dice que de la navaja no hay (quiere 1, hay 0)', cs.some((x) => x.id === 'b' && x.tipo === 'faltan' && x.hay === 0));
ok('dice que el talco ya no está a la venta', cs.some((x) => x.id === 'c' && x.tipo === 'no-esta'));
ok('lo que no cambió no se menciona', cambios({ renglones: [{ id: 'a', precio: 199, cantidad: 2 }] }, hoy).length === 0);
ok('199.00 y 199 son el mismo precio', cambios({ renglones: [{ id: 'a', precio: '199.00', cantidad: 1 }] }, hoy).length === 0);

console.log('\n· Pasar a cobrar');
const t = aTicket(cot, hoy);
ok('pasa sólo lo que existe y alcanza (la cera, 3)', JSON.stringify(t) === JSON.stringify([{ id: 'a', cantidad: 3 }]), JSON.stringify(t));
ok('si pidieron más de lo que hay, pasa lo que hay', aTicket({ renglones: [{ id: 'a', cantidad: 50 }] }, hoy)[0].cantidad === 10);
const j = juntar([{ id: 'a', cantidad: 1 }, { id: 'z', cantidad: 2 }], [{ id: 'a', cantidad: 3 }, { id: 'q', cantidad: 1 }]);
ok('con un ticket a medias se suma sin repetir renglón', JSON.stringify(j) === JSON.stringify([{ id: 'a', cantidad: 4 }, { id: 'z', cantidad: 2 }, { id: 'q', cantidad: 1 }]), JSON.stringify(j));
ok('juntar no cambia el ticket original', (() => { const o = [{ id: 'a', cantidad: 1 }]; juntar(o, [{ id: 'a', cantidad: 1 }]); return o[0].cantidad === 1; })());

console.log('\n· El mensaje de WhatsApp');
const w = textoWhatsApp(cot, { negocio: 'Surtido', contacto: 'WhatsApp 442 000 0000' });
ok('lleva folio, negocio y para quién', w.startsWith('*Cotización C3* · Surtido\nPara: Barbería El Güero'), w.split('\n').slice(0, 2).join(' | '));
ok('cada renglón con cantidad, importe y precio unitario si son varias', w.includes('• 3 × Cera mate 113 g — $568.50 ($189.50 c/u)') && w.includes('• 1 × Navaja clásica — $250\n') , w);
ok('el total en negritas de WhatsApp', w.includes('*Total: $818.80* (7 piezas)'));
ok('dice hasta cuándo vale, en palabras', /válidos hasta el viernes,? 2 de octubre/.test(w), (w.match(/válidos.*/) || [])[0]);
ok('lleva las notas y el contacto', w.includes('Envío gratis en la zona.') && w.endsWith('WhatsApp 442 000 0000'));
ok('sin cliente ni notas no deja renglones vacíos de más', !textoWhatsApp({ ...cot, cliente: null, notas: '' }).includes('\n\n\n') && !textoWhatsApp({ ...cot, cliente: null }).includes('Para:'));

console.log('\n· El archivo en el teléfono');
const mem = new Map(); const alm = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
const A = crearArchivo(alm, 'x');
const c1 = A.guardar({ renglones: [{ id: 'a', nombre: 'Cera', precio: 199, cantidad: 1 }], cuando: HOY });
const c2 = A.guardar({ renglones: [], cuando: HOY + 1000 });
ok('folios C1, C2 en orden', c1.folio === 'C1' && c2.folio === 'C2');
ok('lo más nuevo primero', A.todas()[0].id === c2.id);
A.guardar({ ...c1, notas: 'editada' });
ok('guardar una que ya existe la edita, no hace otra', A.todas().length === 2 && A.una(c1.id).notas === 'editada' && A.una(c1.id).folio === 'C1');
A.quitar(c2.id);
const c3 = A.guardar({ renglones: [] });
ok('borrar no recicla folios (la siguiente es C3)', c3.folio === 'C3' && A.todas().length === 2);
A.marcar(c1.id, { vendida: 45 });
ok('se puede marcar como vendida con su folio de venta', A.una(c1.id).vendida === 45);
const roto = crearArchivo({ getItem: () => '{roto', setItem(){} }, 'x');
ok('un archivo dañado no truena: arranca vacío', roto.todas().length === 0);

console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
