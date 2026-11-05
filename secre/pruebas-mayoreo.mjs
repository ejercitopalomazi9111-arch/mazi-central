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
const banco = { listo: () => true, async fichas(){ return []; }, async subir(x){ subidas.push(x); return { id: 'B' + subidas.length }; }, async bajar(id){ return { buf: subidas[+id.slice(1) - 1].buf, mime: 'image/jpeg' }; } };

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
ok('en la cola sólo va el id (la foto ya está en el banco)', !(s.estado.colaFotos || []).some(x => x.buf));
const enAlls = a(ALLS).filter(e => e.texto === '[foto]');
ok('y se mandaron solas al grupo de All\'s con precio de venta y tallas, sin el costo ni el texto del proveedor', enAlls.length === 3 && /\$600/.test(enAlls[0].pie) && /Tallas S, M, L/.test(enAlls[0].pie) && enAlls.every(e => /\$\d/.test(e.pie) && !/\$(350|280)\b/.test(e.pie)), enAlls);
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

console.log('\n§7 · la firma va una sola vez');
ok('si la IA ya la escribió, no se repite', uno.firmar('Asistente de Carlos:', 'Asistente de Carlos: le paso tu mensaje') === 'Asistente de Carlos: le paso tu mensaje');
ok('sin firma en el texto, se pone', uno.firmar('Asistente de Carlos:', 'va') === 'Asistente de Carlos: va');
ok('sin firma del chat, el texto tal cual', uno.firmar('', 'va') === 'va');

console.log('\n§8 · el pie de venta: precio, tallas y marca, nunca la descripción');
{ const { pieVenta } = await import('./mayoreo.mjs');
  const f = { id: 'b1', titulo: 'sudadera café con gorro y cierre', descripcion: 'fotografía frontal de una sudadera café con gorro, cierre frontal…', notas: '', palabras: [] };
  ok('sin datos: el nombre y «Pregunta el precio», sin la descripción', pieVenta(f) === '*Sudadera café con gorro y cierre*\nPregunta el precio');
  ok('con notas: marca, talla y precio de venta', pieVenta({ ...f, notas: 'costo $800 · venta $1200 · tallas M · marca True Religion' }) === '*Sudadera café con gorro y cierre*\nTrue Religion · Talla M · $1,200');
  const cambios = [];
  uno.banco = { fichas: async () => [f], cambiar: async (id, c) => { cambios.push([id, c]); return { ...f, ...c }; } };
  const r = await uno.ponerVenta({ buscar: 'sudadera café', precio: 1200, tallas: ['m'], marca: 'True Religion' });
  ok('«la sudadera café va en 1200, M, True Religion» se guarda en su foto', cambios.length === 1 && cambios[0][0] === 'b1' && /venta \$1200 · tallas M · marca True Religion/.test(cambios[0][1].notas), [r, cambios]);
  ok('y le dice cómo va a salir', /True Religion · Talla M · \$1,200/.test(r), r);
}

console.log('\n§9 · todo el historial de «Shopy go mayoreo 1», de 100 en 100');
{
  const G1 = '120363999999@g.us', G2 = '120363888888@g.us', env9 = [], pedidos = [];
  let viejo = Date.UTC(2026, 9, 1), hayMas = 3;
  const t9 = { ...transporte, enviar: async (j, t) => { env9.push({ jid: j, texto: t }); return 'Z' + env9.length; },
    enviarImagen: async (j, b, m, pie) => { env9.push({ jid: j, texto: '[foto]', pie }); return 'Z' + env9.length; },
    grupos: async () => [{ id: G1, nombre: 'Shopy go mayoreo 1' }, { id: G2, nombre: "All's Fashion | clothes & more" }],
    pedirHistorial: async (chat, n, an, o) => { pedidos.push([chat, n, o || {}]); if(hayMas-- > 0) viejo -= 86400000; return true; }, masViejo: () => viejo };
  const sub9 = [], banco9 = { listo: () => true, async fichas(){ return []; }, async subir(x){ sub9.push(x); return { id: 'B' + sub9.length }; }, async bajar(id){ return { buf: sub9[+id.slice(1) - 1].buf }; } };
  const alm9 = {}, almac = { leer: (k, x) => alm9[k] ? JSON.parse(alm9[k]) : x, guardar: (k, v) => { alm9[k] = JSON.stringify(v); } };
  /* una cuenta que ya existía (versión 3) pasa sola a tener Mayoreo prendido por nombre */
  alm9.config = JSON.stringify({ nombre: 'Carlos', version: 3, chats: {} });
  const s9 = new Secre({ cuenta: 'principal', transporte: t9, ia, almacen: almac, reloj, banco: banco9, conocimiento: '' });
  /* 5 nov, Carlos: «apaga lo de all's»: la cuenta vieja queda apuntada a los grupos pero APAGADA */
  ok('la cuenta vieja queda con Mayoreo apuntado a «Shopy go mayoreo 1», pero apagado (5 nov)', !s9.config.mayoreo.activo && s9.config.mayoreo.fuenteNombre === 'Shopy go mayoreo 1' && s9.config.mayoreo.historico);
  s9.config.mayoreo.activo = true;   /* y se puede volver a prender: el resto prueba la máquina prendida */
  await s9.tic();
  ok('encuentra los dos grupos por su nombre, aunque WhatsApp le agregue «| clothes & more»', s9.config.mayoreo.fuente === G1 && s9.config.mayoreo.destino === G2, s9.config.mayoreo);
  ok('y pide el historial del grupo de Mayoreo de 50 en 50', pedidos.length === 1 && pedidos[0][0] === G1 && pedidos[0][1] === 50);
  /* lo viejo que llega del historial: fotos con su precio en el pie */
  const fs9 = [foto('flores'), foto('pulgares'), foto('saludo')];
  for(const [i, f] of fs9.entries()) await s9.alMensaje({ id: 'H' + i, chat: G1, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopy go mayoreo 1', texto: '[foto] Blusa ' + i + ' $' + (200 + i * 10) + ' tallas S M', imagen: img(f, 'Blusa ' + i + ' $' + (200 + i * 10) + ' tallas S M'), t: Date.UTC(2026, 9, 1) + i * 3600000, historico: true });
  ok('las fotos viejas se vuelven prendas con precio de venta', s9.config.productos.length === 3 && s9.config.productos[2].precio === 470, s9.config.productos.map(p => p.precio));
  await s9.alMensaje({ id: 'H9', chat: '5214420000000@s.whatsapp.net', nombre: 'Ana', texto: '¿vienes?', t: Date.UTC(2026, 9, 1), historico: true });
  ok('lo viejo de otros chats no se contesta ni se anota', !env9.some(e => e.jid === '5214420000000@s.whatsapp.net' && !/^🤖/.test(e.texto)) && !s9.estado.pendientes.length, [env9.filter(e => e.jid === '5214420000000@s.whatsapp.net'), s9.estado.pendientes]);
  /* de 2 en 2 para la prueba (Carlos pidió 100) */
  s9.config.mayoreo.tanda = 2; s9.config.mayoreo.pausa = 30;
  for(let k = 0; k < 6; k++){ pasar(10); await s9.tic(); }
  const fotosAlls = () => env9.filter(e => e.jid === G2 && e.texto === '[foto]');
  ok('manda una tanda y descansa', fotosAlls().length === 2 && env9.some(e => /van 2 fotos mandadas .*Faltan 1/.test(e.texto)), env9.map(e => e.texto));
  pasar(31 * 60); for(let k = 0; k < 3; k++){ pasar(10); await s9.tic(); }
  ok('a la media hora manda la siguiente, y avisa cuando acaba', fotosAlls().length === 3 && env9.some(e => /listo, mandé las 3 fotos/.test(e.texto)), env9.map(e => e.texto));
  ok('cada foto con su precio de venta y tallas', fotosAlls().every(e => /\$4[5-7]0/.test(e.pie) && /Tallas S, M/.test(e.pie)), fotosAlls().map(e => e.pie));
  /* cuando ya no llega nada más viejo, se acaba el historial */
  for(let k = 0; k < 14; k++){ pasar(95); await s9.tic(); }
  ok('si un pedido no trae nada, prueba el tiempo en segundos y luego otra ancla (la borrada no sirve)', pedidos.some(p => p[2].seg) && pedidos.some(p => p[2].saltar), pedidos.map(p => p[2]));
  ok('cuando ya no hay más historial, para y le avisa a Carlos', s9.config.mayoreo.historico === false && env9.some(e => /ya revisé todo el historial/.test(e.texto)), [pedidos.length, s9.estado.histMayoreo]);
  const otra = new Secre({ cuenta: 'segunda', transporte: t9, ia, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: banco9, conocimiento: '' });
  otra.config.mayoreo = { ...s9.config.mayoreo };
  await otra.alMensaje({ id: 'H20', chat: G1, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopy go mayoreo 1', texto: '[foto] Short $150', imagen: img(foto('flores'), 'Short $150'), t: ahora });
  ok('si las dos cuentas están en el grupo, sólo trabaja una (no se duplican las fotos)', !(otra.config.productos || []).length);
}

console.log('\n§10 · la campaña a negocios sin página');
{
  const env10 = [], lista = [
    { negocio: 'Barbería Londres Jardines', giro: 'barbería', tel: '+52 442 232 8229', resenas: 383, tiene: 'sin página' },
    { negocio: 'Teléfono fijo', giro: 'taller', tel: '+52 442 215 0000', resenas: 90, tiene: 'sin página' },
    { negocio: 'Tacos Los Carnales', giro: 'taquería', tel: '+52 442 353 2851', resenas: 1097, tiene: 'sólo redes (facebook)' },
    { negocio: 'Casa Flora', giro: 'cafetería', tel: '+52 442 580 5119', resenas: 1356, tiene: 'sin página' } ];
  const t10 = { ...transporte, yo: () => ['5214428833786@s.whatsapp.net'], enviar: async (j, t) => { env10.push({ jid: j, texto: t }); return 'C' + env10.length; },
    existe: async (tel) => /2150000/.test(tel) ? '' : '521' + String(tel).replace(/\D/g, '').slice(-10) + '@s.whatsapp.net' };
  const s10 = new Secre({ cuenta: 'principal', transporte: t10, ia, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: null, conocimiento: '', prospectos: async () => lista });
  s10.config.campana = { activo: true, porDia: 2, desde: '10:00', hasta: '18:30', dias: [0, 1, 2, 3, 4, 5, 6], tel: '4428833786', minEntre: 6, maxEntre: 6 };
  ahora = Date.UTC(2026, 10, 5, 3, 0);   /* 9 pm en Querétaro */
  await s10.tic();
  ok('fuera de horario no le escribe a nadie', !env10.length);
  ahora = Date.UTC(2026, 10, 5, 17, 0);  /* 11 am */
  await s10.tic();
  const aNeg = () => env10.filter(e => /@s\.whatsapp\.net$/.test(e.jid) && !/^🤖/.test(e.texto));
  ok('a las 11 le escribe al primero, con su nombre, sus reseñas y la salida de «no me interesa»', aNeg().length === 1 && /Barbería Londres Jardines/.test(aNeg()[0].texto) && /383 reseñas/.test(aNeg()[0].texto) && /reservas de citas/.test(aNeg()[0].texto) && /no le vuelvo a escribir/.test(aNeg()[0].texto), aNeg());
  ok('el chat queda en automático y la IA sabe que es un prospecto', s10.config.chats['5214422328229@s.whatsapp.net'].modo === 'auto' && /campaña/.test(s10.config.chats['5214422328229@s.whatsapp.net'].nota));
  pasar(60); await s10.tic();
  ok('no manda el siguiente hasta que pasan los minutos', aNeg().length === 1);
  pasar(6 * 60); await s10.tic(); pasar(30); await s10.tic();
  ok('se salta el que no tiene WhatsApp (un fijo) y sigue', aNeg().length === 2 && /Tacos Los Carnales/.test(aNeg()[1].texto) && /sólo tienen redes/.test(aNeg()[1].texto), aNeg().map(e => e.texto.slice(0, 60)));
  pasar(10 * 60); await s10.tic();
  ok('al llegar a los del día, para y le avisa a Carlos', aNeg().length === 2 && env10.some(e => /hoy les escribí a 2 negocios/.test(e.texto)));
  const s11 = new Secre({ cuenta: 'segunda', transporte: { ...t10, yo: () => ['5217861234567@s.whatsapp.net'] }, ia, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: null, conocimiento: '', prospectos: async () => lista });
  s11.config.campana = { ...s10.config.campana }; const antes = env10.length; ahora = Date.UTC(2026, 10, 6, 17, 0); await s11.tic();
  ok('la cuenta personal no manda la campaña: sólo la del negocio', env10.length === antes);
}

console.log('\n§11 · trabaja la cuenta que SÍ está en el grupo');
{
  Secre.hermanas.clear();
  const G1 = '120363777777@g.us', G2 = '120363666666@g.us', mand = [];
  const tN = { ...transporte, yo: () => ['5214428833786@s.whatsapp.net'], grupos: async () => [{ id: G2, nombre: "All's Fashion" }], enviarImagen: async (j) => { mand.push(['negocio', j]); return 'N' + mand.length; } };
  const tP = { ...transporte, yo: () => ['5217861111111@s.whatsapp.net'], grupos: async () => [{ id: G1, nombre: 'Shopline Mayoreo Juan Pablo' }], enviarImagen: async (j) => { mand.push(['personal', j]); return 'P' + mand.length; } };
  const sub = [], bk = { listo: () => true, async fichas(){ return []; }, async subir(x){ sub.push(x); return { id: 'B' + sub.length }; }, async bajar(id){ return { buf: sub[+id.slice(1) - 1].buf }; } };
  const neg = new Secre({ cuenta: 'negocio', transporte: tN, ia, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: bk, compartir: true, conocimiento: '', prospectos: null });
  const per = new Secre({ cuenta: 'personal', transporte: tP, ia, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: bk, compartir: true, conocimiento: '', prospectos: null });
  neg.config.mayoreo = per.config.mayoreo = { activo: true, fuente: G1, destino: G2, margen: 250, tanda: 100, pausa: 30, cadaSeg: 8, duena: 'negocio', historico: false };
  await neg.tic(); await per.tic();
  await per.alMensaje({ id: 'Z1', chat: G1, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopline Mayoreo Juan Pablo', texto: '[foto] Jeans Guess $400 tallas 28 30', imagen: img(foto('flores'), 'Jeans Guess $400 tallas 28 30'), t: ahora });
  ok('la personal (que sí está en el grupo del proveedor) se queda con Mayoreo aunque antes lo tuviera la del negocio', per.config.mayoreo.duena === 'personal' && (per.config.productos || []).length === 1, per.config.mayoreo);
  for(let k = 0; k < 3; k++){ pasar(10); await neg.tic(); await per.tic(); }
  ok('y la del negocio (que sí está en All\'s) es la que manda la foto', mand.length === 1 && mand[0][0] === 'negocio' && mand[0][1] === G2, mand);
  Secre.hermanas.clear();
}

console.log('\n§12 · el grupo guardado ya no es de ninguna cuenta: se busca otra vez por nombre');
{
  Secre.hermanas.clear();
  const VIEJO = '120363111111@g.us', G1 = '120363222222@g.us', G2 = '120363333333@g.us', pedidos = [];
  const base = { ...transporte, pedirHistorial: async (chat) => { pedidos.push(chat); return true; }, masViejo: () => Date.UTC(2026, 10, 1) };
  const tN = { ...base, yo: () => ['5214428833786@s.whatsapp.net'], grupos: async () => [{ id: G2, nombre: "All's Fashion" }] };
  const tP = { ...base, yo: () => ['5217861111111@s.whatsapp.net'], grupos: async () => [{ id: G1, nombre: 'Shopy go mayoreo 1' }, { id: '120363444444@g.us', nombre: 'Tareas 3.1' }] };
  const neg = new Secre({ cuenta: 'negocio', transporte: tN, ia, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: null, compartir: true, conocimiento: '', prospectos: null });
  const per = new Secre({ cuenta: 'personal', transporte: tP, ia, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: null, compartir: true, conocimiento: '', prospectos: null });
  neg.config.mayoreo = per.config.mayoreo = { activo: true, fuente: VIEJO, destino: G2, fuenteNombre: 'Shopy go mayoreo 1', margen: 250, tanda: 100, pausa: 30, cadaSeg: 8, duena: 'negocio', historico: true };
  pasar(15 * 60); await neg.tic(); await per.tic();
  ok('la personal ve el grupo con su nombre y se queda de proveedor', per.config.mayoreo.fuente === G1 && per.config.mayoreo.duena === 'personal', per.config.mayoreo);
  ok('y empieza a pedir el historial de ese grupo', pedidos.includes(G1), pedidos);
  ok('el latido dice qué grupos con «mayoreo» ve cada cuenta', per.latido().mayoreo.grupos.includes('Shopy go mayoreo 1'));
  Secre.hermanas.clear();
}

console.log('\n§13 · lo que publica la otra cuenta no se contesta, y no se pierden fotos en fila');
{
  Secre.hermanas.clear();
  const G1 = '120363555555@g.us', G2 = '120363444444@g.us', OTRO = '5217861111111@s.whatsapp.net', envs = [];
  let lecturas = 0; const iaCuenta = { ...ia, async leer(x){ lecturas++; return ia.leer(x); } };
  const tN = { ...transporte, yo: () => ['5214428833786@s.whatsapp.net'], otrosYo: () => [OTRO], grupos: async () => [{ id: G1, nombre: 'Shopy go mayoreo 1' }, { id: G2, nombre: "All's Fashion" }], enviar: async (j, t) => { envs.push([j, t]); return 'N' + envs.length; } };
  const neg = new Secre({ cuenta: 'negocio', transporte: tN, ia: iaCuenta, almacen: { leer: (k, x) => x, guardar(){} }, reloj, banco: null, conocimiento: '', prospectos: null });
  neg.config.mayoreo = { activo: true, fuente: G1, destino: G2, margen: 250, tanda: 100, pausa: 30, cadaSeg: 8, duena: 'negocio', historico: false };
  const c2 = neg.chat(G2); c2.modo = 'auto'; c2.tienda = true; c2.grupo = true;
  for(let k = 0; k < 3; k++){ pasar(30); await neg.alMensaje({ id: 'A' + k, chat: G2, de: '5217861111111:12@s.whatsapp.net', grupo: true, nombre: 'Carlos', nombreChat: "All's Fashion", texto: '[foto] *Short* $375', t: ahora }); }
  pasar(60); await neg.tic();
  ok('las fotos que sube la otra cuenta a All\'s no se le contestan (ni con su aparato «:12» en el id)', lecturas === 0 && !envs.some(e => e[0] === G2), [lecturas, envs]);
  const G3 = '120363333333@g.us';
  await neg.alMensaje({ id: 'R1', chat: G3, de: OTRO, grupo: true, nombre: 'Carlos', nombreChat: 'Taberna', texto: 'entra el caballero', t: ahora });
  ok('en otro grupo, lo de la otra cuenta queda en la plática como suyo', (neg.estado.historial[G3] || []).some(h => h.de === 'yo' && /caballero/.test(h.texto)) && lecturas === 0);
  /* el tope de 3,000 no se lleva lo que sigue esperando turno */
  neg.config.productos = Array.from({ length: 3000 }, (_, i) => ({ id: 'v' + i, desc: 'x', huella: '', fotoId: 'F' + i, t: i }));
  neg.estado.colaFotos = [{ id: 'v0', fotoId: 'F0', t: 0, en: 0 }, { id: 'v1', fotoId: 'F1', t: 1, en: 1 }];
  neg.banco = { listo: () => true, async fichas(){ return []; }, async subir(){ return { id: 'FN' }; }, async bajar(){ return { buf: foto('flores') }; } };
  await neg.alMensaje({ id: 'M1', chat: G1, grupo: true, nombre: 'Proveedor', nombreChat: 'Shopy go mayoreo 1', texto: '[foto] Blusa $200', imagen: img(foto('flores'), 'Blusa $200'), t: ahora });
  const ids = new Set(neg.config.productos.map(p => p.id));
  ok('al pasar de 3,000 se va la más vieja, pero nunca una que sigue en la fila', ids.has('v0') && neg.config.productos.length === 3001, neg.config.productos.length);
  ok('cada foto en fila guarda dónde está en el banco', neg.estado.colaFotos.every(q => q.fotoId), neg.estado.colaFotos);
  Secre.hermanas.clear();
}

console.log('\n§14 · «no respondas este chat» no apaga la campaña (5 nov)');
{
  s.config.campana = Object.assign({}, s.config.campana || {}, { activo: true, porDia: 25 });
  ordenDa = () => ({ respuesta: 'Va, ya no le contesto.', acciones: [{ accion: 'campana', activo: false }, { accion: 'mayoreo', activo: false }] });
  const r = await yoDigo('no respondas este chat');
  ok('la campaña sigue prendida', s.config.campana.activo === true, s.config.campana);
  ok('el mayoreo tampoco se toca', s.config.mayoreo.activo === true, s.config.mayoreo);
  ok('le dice que no la tocó', /No toqué la campaña ni el mayoreo/.test(r), r);
  ordenDa = () => ({ respuesta: 'Va.', acciones: [{ accion: 'campana', activo: false }] });
  await yoDigo('para la campaña por hoy');
  ok('si nombra la campaña, sí la para', s.config.campana.activo === false, s.config.campana);
  ordenDa = () => ({ respuesta: 'Va.', acciones: [{ accion: 'campana', activo: true }] });
  await yoDigo('prende otra vez la campaña');
  ok('y la vuelve a prender', s.config.campana.activo === true, s.config.campana);
  ordenDa = null;
}

console.log(fallas.length ? `\n✗ ${fallas.length} fallaron de ${pasan + fallas.length}` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
