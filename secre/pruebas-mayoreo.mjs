#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SECRE · las pruebas de la segunda tanda del 4 de noviembre
   Cada sección es una queja o un pedido de Carlos:
     §1 «los tengo guardados de una manera y él los tiene con el nombre de WhatsApp»
     §2 Mayoreo → banco → All's, con el costo + margen, y contestar precio y tallas de LA foto
     §3 «que le pueda decir: sí, dilo pero más tranquilo», en vez de sólo el número
     §4 «me pone pendientes que no son pendientes» y «no sabe cuándo ya se completaron»; tareas de la escuela
     §5 una llamada de WhatsApp: le cuelga, le pregunta quién es, y a Carlos le pasa lo que conteste
     §6 la memoria de las dos cuentas es una sola
   Fotos reales (las de Geraldmed del repo), WhatsApp, banco e IA de mentiras.
     node secre/pruebas-mayoreo.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
import { Secre } from './nucleo.mjs';

const fallas = []; let pasan = 0;
const ok = (que, si, extra) => { if(si){ pasan++; console.log('  ✓', que); } else { fallas.push(que); console.log('  ✗', que, extra !== undefined ? '· ' + JSON.stringify(extra).slice(0, 400) : ''); } };
const AQUI = path.dirname(new URL(import.meta.url).pathname), FOTOS = path.join(AQUI, '../marca/anuncios/geraldmed/fotos');
const foto = (n) => fs.readFileSync(path.join(FOTOS, n + '.jpg'));

const YO = '5214420000000@s.whatsapp.net', MAYO = '120363111111@g.us', ALLS = '120363222222@g.us', ANA = '5214421111111@s.whatsapp.net', BETO = '5214422222222@s.whatsapp.net', TIA = '5214423333333@s.whatsapp.net', SALON = '120363333333@g.us';
let ahora = Date.UTC(2026, 10, 4, 22, 0); const reloj = () => ahora, pasar = (s) => { ahora += s * 1000; };
const env = []; let sig = 1;
const transporte = { yo: () => [YO], async enviar(jid, texto){ const id = 'S' + sig++; env.push({ jid, texto, id }); return id; },
  async enviarImagen(jid, buf, mime, pie){ const id = 'I' + sig++; env.push({ jid, texto: '[foto]', pie, bytes: buf.length, id }); return id; },
  async enviarAudio(jid){ const id = 'A' + sig++; env.push({ jid, texto: '[audio]', id }); return id; }, async escribiendo(){}, async leido(){} };
const a = (jid) => env.filter(e => e.jid === jid), aviso = () => (a(YO).slice(-1)[0] || {}).texto || '';
const subidas = [];
const banco = { listo: () => true, async fichas(){ return []; }, async subir(x){ subidas.push(x); return { id: 'B' + subidas.length }; } };

let vio = null, ordenDa = null, leerDa = null;
const ia = {
  async leer(x){ vio = x; if(leerDa) return leerDa(x); return { pendientes: [], respuesta: x.productos.length ? `sale en ${x.productos[0]}` : 'qué onda', motivo: '', urgente: false }; },
  async orden({ texto, propuestas }){ return ordenDa ? ordenDa(texto, propuestas) : { respuesta: '', acciones: [] }; },
};
const datos = {}; const almacen = { leer: (k, d) => datos[k] ? JSON.parse(datos[k]) : d, guardar: (k, v) => { datos[k] = JSON.stringify(v); } };
const s = new Secre({ cuenta: 'una', transporte, ia, almacen, reloj, azar: () => 0.5, banco, conocimiento: 'Grupo Mazi: página Esencial $2,000.' });
s.telefono = { listas: () => false };
const llega = async (m) => { await s.alMensaje({ id: 'm' + sig++, de: m.chat, mio: false, t: ahora, ...m }); pasar(30); await s.tic(); };
const yoDigo = async (texto) => { await s.alMensaje({ id: 'o' + sig++, chat: YO, de: YO, texto, mio: true, t: ahora }); pasar(1); return aviso(); };
const img = (buf, pie = '') => ({ mime: 'image/jpeg', pie, bajar: async () => buf });

console.log('\n§1 · los nombres de SU agenda');
await llega({ chat: ANA, nombre: '✨Anita✨', texto: 'hola' });
ok('sin agenda, el chat se llama como la persona se puso', s.nombreDe(ANA) === '✨Anita✨');
s.cargarContactos([{ id: ANA, nombre: 'Ana Prima Lupe', guardado: true, alias: '✨Anita✨' }, { id: BETO, nombre: 'Beto Taller', guardado: true }]);
ok('al llegar la agenda, gana el nombre con el que ÉL la guardó', s.nombreDe(ANA) === 'Ana Prima Lupe' && s.config.chats[ANA].alias === '✨Anita✨', s.config.chats[ANA]);
s.cargarContactos([{ id: ANA, nombre: 'Anita nueva', guardado: false }]);
ok('un nombre de WhatsApp después no pisa el de la agenda', s.nombreDe(ANA) === 'Ana Prima Lupe');
ok('«Lupe» la encuentra (una palabra de su nombre de agenda)', s.buscarChat('Lupe') === ANA);
ok('«prima lupe» también', s.buscarChat('prima lupe') === ANA);
ok('«anita» (su nombre de WhatsApp) también', s.buscarChat('anita') === ANA);
ok('«Betto» con falta de dedo encuentra a Beto Taller', s.buscarChat('Betto') === BETO);
ok('un nombre que no existe no inventa a nadie', s.buscarChat('Zacarías') === null);
s.cargarContactos([{ id: MAYO, nombre: 'Shopify Mayoreo', grupo: true }, { id: ALLS, nombre: "All's fashion clientas", grupo: true }, { id: TIA, nombre: 'Tía Rosa', guardado: true }, { id: SALON, nombre: '3.1 Rembrandt', grupo: true }]);

console.log('\n§2 · Mayoreo → banco → All\'s');
ordenDa = () => ({ respuesta: 'Va.', acciones: [{ accion: 'mayoreo', fuente: 'Mayoreo', destino: "All's", margen: 250, activo: true }] });
let r = await yoDigo("las fotos del grupo de mayoreo pásalas a all's con 250 de ganancia");
ok('la orden en palabras normales lo prende, de qué grupo a cuál', s.config.mayoreo.activo && s.config.mayoreo.fuente === MAYO && s.config.mayoreo.destino === ALLS && /costo \+ \$250/.test(r), r);
ok('el grupo de All\'s queda como tienda y en automático', s.config.chats[ALLS].tienda === true && s.config.chats[ALLS].modo === 'auto');
const f1 = foto('flores'), f2 = foto('pulgares'), f3 = foto('saludo');
await llega({ chat: MAYO, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopify Mayoreo', texto: '[foto] Conjunto deportivo dama $350 tallas S M L', imagen: img(f1, 'Conjunto deportivo dama $350 tallas S M L') });
await llega({ chat: MAYO, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopify Mayoreo', texto: '[foto]', imagen: img(f2) });
await llega({ chat: MAYO, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopify Mayoreo', texto: '[foto]', imagen: img(f3) });
await llega({ chat: MAYO, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopify Mayoreo', texto: 'Sudaderas oversize $280 CH M G' });
const P = s.config.productos;
ok('cada foto queda como producto, con su costo y su precio de venta', P.length === 3 && P[0].costo === 350 && P[0].precio === 600 && P[0].tallas.join() === 'S,M,L', P.map(p => [p.costo, p.precio, p.tallas]));
ok('el texto con precio que llega DESPUÉS de unas fotos se les pone a ésas', P[1].costo === 280 && P[2].precio === 530 && P[1].tallas.join() === 'CH,M,G');
ok('las tres se subieron al banco, en la carpeta de All\'s, con el costo sólo en las notas', subidas.length === 3 && subidas.every(x => x.campos.carpeta === "All's fashion") && /costo \$350/.test(subidas[0].campos.notas) && !/350/.test(subidas[0].campos.titulo));
for(let k = 0; k < 3; k++){ pasar(10); await s.tic(); }
const enAlls = a(ALLS).filter(e => e.texto === '[foto]');
ok('y se mandaron solas al grupo de All\'s, SIN texto', enAlls.length === 3 && enAlls.every(e => !e.pie), enAlls);
ok('en el grupo de Mayoreo no contestó nada', !a(MAYO).length);
await llega({ chat: MAYO, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopify Mayoreo', texto: '[foto]', imagen: img(f1, 'Conjunto deportivo dama $330') });
ok('la misma foto otra vez no se duplica: sólo se actualiza el precio', s.config.productos.length === 3 && P[0].costo === 330 && P[0].precio === 580);
/* una clienta cita una foto en el grupo de All's */
await llega({ chat: ALLS, grupo: true, nombre: 'Clienta Sofi', nombreChat: "All's fashion clientas", texto: '¿precio? ¿hay en M?', citado: enAlls[0].id });
ok('si citan la foto en All\'s, la IA recibe ESE producto con precio de venta y tallas', vio && vio.tienda === true && vio.productos.length === 1 && /\$580/.test(vio.productos[0]) && /S, M, L/.test(vio.productos[0]), vio && vio.productos);
ok('y contesta en el grupo', a(ALLS).slice(-1)[0] && /\$580/.test(a(ALLS).slice(-1)[0].texto), a(ALLS).slice(-1));
ok('la IA nunca ve el costo', !JSON.stringify(vio.productos).includes('330'));
/* en privado: le reenvían la foto (recomprimida) */
const reenviada = await sharp(f2).resize(500).jpeg({ quality: 45 }).toBuffer();
await llega({ chat: BETO, nombre: 'Beto', texto: '[foto] cuánto esta?', imagen: img(reenviada, 'cuánto esta?') });
ok('en privado, si mandan la foto (aunque venga recomprimida) reconoce cuál es', vio.productos.length === 1 && /\$530/.test(vio.productos[0]), vio.productos);
leerDa = () => ({ pendientes: [], respuesta: 'esa te la dejo en $280, es lo que nos cuesta jaja', motivo: '', urgente: false });
await llega({ chat: BETO, nombre: 'Beto', texto: 'y más barato?' });
ok('si la IA suelta el costo, no sale', !a(BETO).some(e => /\$280/.test(e.texto)) && /lo que nos cuesta \(\$280\)/.test(aviso()), aviso());
leerDa = null;

console.log('\n§3 · aprobar en palabras normales');
leerDa = () => ({ pendientes: [], respuesta: 'no manches tía, yo ni estaba', motivo: 'te reclama', urgente: false, decide: true });
s.config.chats[TIA] = { ...(s.config.chats[TIA] || {}), modo: 'borrador', nombre: 'Tía Rosa' };
await llega({ chat: TIA, nombre: 'Rosa', texto: 'oye y la leche?' });
leerDa = null;
const prop = s.estado.propuestas.find(p => p.chat === TIA);
ok('queda una propuesta para Carlos', !!prop, s.estado.propuestas);
let vioProps = null;
ordenDa = (t, ps) => { vioProps = ps; return { respuesta: '', acciones: [{ accion: 'responder', n: prop.n, texto: 'Tía, no sé quién la dejó, ahorita le pregunto a Carlos 🙏' }] }; };
r = await yoDigo('sí díselo pero más tranquilo');
ok('la IA de órdenes ve las propuestas vivas', vioProps && vioProps.some(p => p.n === prop.n && /yo ni estaba/.test(p.propuesta)), vioProps);
ok('y lo manda ya reescrito, sin que él escriba el número', a(TIA).slice(-1)[0] && /no sé quién la dejó/.test(a(TIA).slice(-1)[0].texto) && /A Tía Rosa/.test(r), [a(TIA).slice(-1), r]);
ok('la propuesta se quita', !s.estado.propuestas.some(p => p.n === prop.n));

console.log('\n§4 · pendientes de verdad, y tareas');
s.config.chats[BETO].modo = 'auto';
leerDa = () => ({ pendientes: ['Estar atento al chat', 'Que Beto traiga el cable', 'contestar el mensaje', 'Pagar $200 de la cuota el viernes'], tareas: [], respuesta: 'va', motivo: '', urgente: false });
await llega({ chat: BETO, nombre: 'Beto', texto: 'oye el viernes se paga la cuota' });
const abiertos = s.estado.pendientes.filter(p => !p.hecho && p.chat === BETO).map(p => p.texto);
ok('el segundo filtro tira lo vago y lo que hace otro; deja lo suyo', abiertos.length === 1 && /Pagar \$200/.test(abiertos[0]), abiertos);
leerDa = (x) => ({ pendientes: [], hechos: x.abiertos, respuesta: 'listo', motivo: '', urgente: false });
await llega({ chat: BETO, nombre: 'Beto', texto: 'ya me pagaste la cuota gracias' });
ok('la IA ve los pendientes abiertos de ese chat y los que ya se cumplieron se tachan solos', s.estado.pendientes.filter(p => p.chat === BETO).every(p => p.hecho) && vio.abiertos.length === 1, s.estado.pendientes);
s.config.chats[SALON].modo = 'callado';
leerDa = () => ({ pendientes: [], tareas: [{ materia: 'Física', que: 'Problemas 1 al 10 de la página 45', para: '2026-11-06' }], respuesta: '', motivo: '', urgente: false });
await llega({ chat: SALON, grupo: true, nombre: 'Profe', nombreChat: '3.1 Rembrandt', texto: 'Para el jueves los problemas 1 al 10 de la 45' });
leerDa = null;
ok('la tarea de la escuela va a su sección, no a los pendientes', (s.estado.tareas || []).length === 1 && s.estado.tareas[0].materia === 'Física' && !s.estado.pendientes.some(p => /Problemas/.test(p.texto)), s.estado.tareas);

console.log('\n§5 · llamadas de WhatsApp');
await s.alLlamada({ de: ANA, video: false });
ok('le escribe a quien llamó preguntando quién es y para qué', /¿Quién habla y para qué/.test(a(ANA).slice(-1)[0].texto), a(ANA).slice(-1));
ok('y a Carlos le avisa', /Te llamó Ana Prima Lupe por WhatsApp/.test(aviso()), aviso());
await llega({ chat: ANA, nombre: '✨Anita✨', texto: 'soy Ana, era para lo del pastel del sábado' });
ok('lo que conteste le llega a Carlos', a(YO).some(e => /📨 Ana Prima Lupe contestó .*pastel del sábado/.test(e.texto)), a(YO).slice(-2));

console.log('\n§6 · una sola memoria en las dos cuentas');
const d1 = {}, d2 = {};
const alm = (d) => ({ leer: (k, x) => d[k] ? JSON.parse(d[k]) : x, guardar: (k, v) => { d[k] = JSON.stringify(v); } });
const t2 = { ...transporte, yo: () => ['5217860000000@s.whatsapp.net'] };
const uno = new Secre({ cuenta: 'negocio', transporte, ia, almacen: alm(d1), reloj, banco, compartir: true, conocimiento: '' });
const dos = new Secre({ cuenta: 'personal', transporte: t2, ia, almacen: alm(d2), reloj, banco, compartir: true, conocimiento: '' });
uno.agregarDato('el sábado hay boda de mi primo'); uno.aplicar({ accion: 'prohibir', texto: 'no hablar de dinero', palabras: ['dinero'] }); uno.guardar();
ok('lo que le cuentas en una cuenta lo sabe la otra', dos.datosVigentes().some(d => /boda/.test(d.texto)) && dos.config.prohibidos.length === 1);
ok('y queda guardado en el cajón de la otra', /boda/.test(d2.config || ''));
Secre.hermanas.clear();

console.log(fallas.length ? `\n✗ ${fallas.length} fallaron de ${pasan + fallas.length}` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
