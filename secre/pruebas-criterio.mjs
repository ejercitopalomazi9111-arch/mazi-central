#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SECRE · las pruebas de la reestructura del 4 de noviembre
   ──────────────────────────────────────────────────────────────────────────
   Cada prueba es una queja de Carlos convertida en caso:
     · «mi tía preguntó ¿quién dejó esta leche afuera? y dijo que yo»
     · «se compromete a sacar o mover cosas cuando estoy trabajando»
     · «si le digo no digas esto en ningún chat, lo sigue diciendo»
     · «que se le puedan cargar precios y los diga bien»
     · «le dicen pregúntale a tal persona y dice que Simón, y no pregunta»
     · «si alguien le dice que me busque, nunca me busca»
     · «si le digo que mande un audio, no lo hace»
     · «un modo para que se haga pasar por mí o no»
   La IA es de mentiras y a propósito contesta MAL (culpa, compromete, inventa):
   lo que se prueba es que el código lo frena.
     node secre/pruebas-criterio.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { Secre } from './nucleo.mjs';
import { comprometeA, leerPrecios, revisarRespuesta, enQueAnda } from './criterio.mjs';

const fallas = []; let pasan = 0;
const ok = (que, si, extra) => { if(si){ pasan++; console.log('  ✓', que); } else { fallas.push(que); console.log('  ✗', que, extra !== undefined ? '· ' + JSON.stringify(extra).slice(0, 400) : ''); } };

const YO = '5214420000000@s.whatsapp.net', TIA = '5214421111111@s.whatsapp.net', ANA = '5214422222222@s.whatsapp.net', BETO = '5214423333333@s.whatsapp.net';
let ahora = Date.UTC(2026, 10, 4, 22, 0);        /* miércoles 4 nov, 16:00 en México */
const reloj = () => ahora, pasar = (s) => { ahora += s * 1000; };
const env = []; let sig = 1;
const transporte = { yo: () => [YO], async enviar(jid, texto){ const id = 'S' + sig++; env.push({ jid, texto, id }); return id; },
  async enviarAudio(jid, ogg, seg){ const id = 'S' + sig++; env.push({ jid, texto: '[audio]', seg, id }); return id; }, async escribiendo(){}, async leido(){} };
const a = (jid) => env.filter(e => e.jid === jid), aviso = () => (a(YO).slice(-1)[0] || {}).texto || '';

let vio = null, ordenDa = null;
const ia = {
  async leer(x){
    vio = x; const t = x.nuevos.map(y => y.texto).join(' ');
    if(/leche/.test(t)) return { pendientes: [], respuesta: 'fui yo tía, perdón, ahorita la meto', motivo: '', urgente: false };
    if(/sacas la basura/.test(t)) return { pendientes: [], respuesta: 'sí, ahorita la saco', motivo: '', urgente: false };
    if(/cu[aá]nto/.test(t)) return { pendientes: [], respuesta: /termo/.test(t) ? 'el termo está en $350' : 'la sudadera está en $500', motivo: '', urgente: false };
    if(/novia/.test(t)) return { pendientes: [], respuesta: 'anda con su novia jaja', motivo: '', urgente: false };
    if(/b[uú]scal|dile que me llame/.test(t)) return { pendientes: [], respuesta: 'ya le avisé, al rato te busca', motivo: '', urgente: false, avisar: 'que le llames, es sobre el trabajo del viernes' };
    if(/audio/.test(t)) return { pendientes: [], respuesta: 'va, todo bien por acá', motivo: '', urgente: false, audio: true };
    return { pendientes: [], respuesta: 'qué onda, todo bien', motivo: '', urgente: false };
  },
  async orden({ texto }){ return ordenDa ? ordenDa(texto) : { respuesta: '', acciones: [] }; },
  async voz(texto){ return { ogg: Buffer.from('OGG'), segundos: 3 }; },
};
const datos = {}; const almacen = { leer: (k, d) => datos[k] ? JSON.parse(datos[k]) : d, guardar: (k, v) => { datos[k] = JSON.stringify(v); } };
const s = new Secre({ cuenta: 'prueba', transporte, ia, almacen, reloj, azar: () => 0.5 });
s.telefono = { listas: () => false };
const llega = async (jid, nombre, texto) => { await s.alMensaje({ id: 'm' + sig++, chat: jid, de: jid, nombre, texto, mio: false, t: ahora }); pasar(8); await s.tic(); };
const yoDigo = async (texto) => { await s.alMensaje({ id: 'o' + sig++, chat: YO, de: YO, texto, mio: true, t: ahora }); pasar(1); return aviso(); };

console.log('\n§1 · el filtro, suelto');
ok('«fui yo» compromete', !!comprometeA('fui yo tía, perdón'));
ok('«sí, ahorita la saco» compromete', !!comprometeA('sí, ahorita la saco'));
ok('«Carlos te lo lleva mañana» compromete', !!comprometeA('Carlos te lo lleva mañana', 'Carlos'));
ok('«él la dejó» lo culpa', !!comprometeA('él la dejó', 'Carlos'));
ok('«le pregunto a Carlos y te dice» pasa', !comprometeA('no sé, le pregunto a Carlos y te dice', 'Carlos'));
ok('«qué onda, todo bien» pasa', !comprometeA('qué onda, todo bien'));
ok('«está en clase, al rato te contesta» pasa', !comprometeA('está en clase, al rato te contesta', 'Carlos'));
const L = leerPrecios('sudadera negra - $450\ntermo 350 pesos\n• corte: $120 (con barba $180)');
ok('«precios:» lee nombre, precio y nota', L.length === 3 && L[0].precio === 450 && L[1].nombre === 'termo' && /barba/.test(L[2].nota), L);
ok('un precio que no está en la lista se frena', /precio/.test(revisarRespuesta('está en $500', { precios: L })));
ok('el de la lista pasa, también el de la nota', !revisarRespuesta('está en $450', { precios: L }) && !revisarRespuesta('con barba $180', { precios: L }));
ok('en clase el miércoles 8:20', /en clase/.test(enQueAnda({ dia: 3, hora: '08:20' })));
ok('el sábado no hay clase', enQueAnda({ dia: 6, hora: '08:20' }) === '');

console.log('\n§2 · la leche de la tía');
await llega(TIA, 'Tía Rosa', '¿quién dejó esta leche afuera?');
const aTia = a(TIA).map(e => e.texto);
ok('no le dice que fue Carlos', !aTia.some(t => /fui yo|perd[oó]n/i.test(t)), aTia);
ok('le dice algo seguro, como su asistente', aTia.some(t => /Asistente de Carlos: Le paso tu mensaje a Carlos/.test(t)), aTia);
ok('a Carlos le llega «necesita tu decisión» con lo que iba a decir', /necesita tu decisi[oó]n/.test(aviso()) && /Iba a decir: «fui yo/.test(aviso()) && /lo comprometía/.test(aviso()), aviso());
ok('la IA recibió las reglas de oro y dónde anda', vio && vio.imitar === false && typeof vio.ahora === 'string');

console.log('\n§3 · no lo compromete');
await llega(TIA, 'Tía Rosa', 'oye mijo, ¿sacas la basura?');
ok('«sí, ahorita la saco» no sale', !a(TIA).some(e => /ahorita la saco/.test(e.texto)));

console.log('\n§4 · precios');
let r = await yoDigo('precios:\nsudadera negra - $450\ntermo - $350');
ok('«precios:» los guarda y los enseña', /2 guardado/.test(r) && /termo: \$350/.test(r), r);
await llega(ANA, 'Ana', '¿cuánto la sudadera?');
ok('un precio inventado ($500) no sale', !a(ANA).some(e => /\$500/.test(e.texto)), a(ANA));
ok('y a Carlos le dice por qué', /precio que no est[aá] en tu lista \(\$500\)/.test(aviso()), aviso());
await llega(ANA, 'Ana', '¿y cuánto el termo?');
ok('el de la lista ($350) sí sale', a(ANA).some(e => /\$350/.test(e.texto)), a(ANA));
ok('la IA ve la lista exacta', vio.precios.some(p => /termo: \$350/.test(p)), vio.precios);
r = await yoDigo('precios');
ok('«precios» los enseña', /sudadera negra: \$450/.test(r), r);

console.log('\n§5 · lo prohibido');
ordenDa = (t) => /novia/.test(t) ? { respuesta: 'Va.', acciones: [{ accion: 'prohibir', texto: 'no hablar de mi novia en ningún chat', palabras: ['novia'] }] } : { respuesta: '', acciones: [] };
r = await yoDigo('no digas nada de mi novia en ningún chat');
ok('la orden se vuelve un prohibido con sus palabras', (s.config.prohibidos || []).length === 1 && /novia/.test(r), r);
await llega(BETO, 'Beto', '¿y la novia de Carlos qué?');
ok('aunque la IA lo escriba, no sale', !a(BETO).some(e => /novia/.test(e.texto)), a(BETO));
ok('la IA recibió lo prohibido', vio.prohibidos.some(p => /novia/.test(p)));
r = await yoDigo('prohibidos');
ok('«prohibidos» los enseña', /1\. no hablar de mi novia/.test(r), r);

console.log('\n§6 · te busca de verdad');
await llega(ANA, 'Ana', 'dile que me llame porfa');
ok('a Carlos le llega 📣 al momento con el recado', a(YO).some(e => /📣 Ana te busca: que le llames/.test(e.texto)), a(YO).slice(-3));

console.log('\n§7 · el audio');
await llega(BETO, 'Beto', 'mándame un audio we');
ok('si le piden audio, contesta con nota de voz', a(BETO).slice(-1)[0].texto === '[audio]', a(BETO).slice(-2));

console.log('\n§8 · pregúntale a alguien (y sí pregunta)');
ordenDa = () => ({ respuesta: '', acciones: [{ accion: 'mensaje', chat: 'Beto', texto: '¿siempre sí vas el sábado?', esperar: true, para: 'si Beto va el sábado' }] });
const antes = a(BETO).length;
r = await yoDigo('pregúntale a Beto si siempre sí va el sábado');
ok('se lo manda AL MOMENTO', a(BETO).length === antes + 1 && /siempre s[ií] vas el s[aá]bado/.test(a(BETO).slice(-1)[0].texto), a(BETO).slice(-1));
ok('y le confirma a Carlos que ya le escribió', /Le escrib[ií] a Beto/.test(r) && /cuando conteste/.test(r), r);
await llega(BETO, 'Beto', 'simón, ahí estaré');
ok('cuando contesta, a Carlos le llega 📨', a(YO).some(e => /📨 Beto contest[oó] a lo que le pregunt[eé] \(si Beto va el s[aá]bado\): «simón, ahí estaré»/.test(e.texto)), a(YO).slice(-3));
ordenDa = () => ({ respuesta: '', acciones: [{ accion: 'mensaje', chat: 'Ana', texto: 'ya voy para allá', audio: true, esperar: false }] });
r = await yoDigo('mándale un audio a Ana diciendo que ya voy');
ok('«mándale un audio a Ana» manda nota de voz', a(ANA).slice(-1)[0].texto === '[audio]' && /audio a Ana/.test(r), r);
ordenDa = () => ({ respuesta: '', acciones: [{ accion: 'mensaje', chat: 'Nadie', texto: 'hola' }] });
r = await yoDigo('escríbele a Nadie');
ok('si no tiene el chat, lo dice (no finge que mandó)', /No tengo a «Nadie»/.test(r), r);

console.log('\n§9 · hacerse pasar por él');
ok('de fábrica habla como su asistente, con firma', a(ANA).filter(e => e.texto !== '[audio]').every(e => /^Asistente de Carlos:/.test(e.texto)));
r = await yoDigo('modo yo');
ok('«modo yo» lo prende en todos', s.config.imitar === true && /Me hago pasar por ti/.test(r), r);
await llega(ANA, 'Ana', 'qué onda');
ok('haciéndose pasar por él: sin firma', a(ANA).slice(-1)[0].texto === 'qué onda, todo bien', a(ANA).slice(-1));
ok('y la IA lo sabe', vio.imitar === true);
await llega(TIA, 'Tía Rosa', '¿quién dejó esta leche afuera?');
ok('haciéndose pasar por él tampoco lo culpa', !a(TIA).some(e => /fui yo/.test(e.texto)) && /d[eé]jame ver/.test(a(TIA).slice(-1)[0].texto), a(TIA).slice(-1));
r = await yoDigo('modo asistente con Ana');
ok('«modo asistente con Ana» sólo en ese chat', s.imitaEn(ANA) === false && s.imitaEn(TIA) === true, r);
r = await yoDigo('modo asistente');
ok('«modo asistente» lo regresa en todos', s.config.imitar === false && s.imitaEn(TIA) === false, r);

console.log(fallas.length ? `\n✗ ${fallas.length} fallaron de ${pasan + fallas.length}` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
