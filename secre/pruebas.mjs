#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SECRE · las pruebas del núcleo, sin WhatsApp ni IA de verdad
   ──────────────────────────────────────────────────────────────────────────
   Un WhatsApp de mentira que apunta todo lo que se manda, una IA de mentira
   que contesta siempre lo mismo y un reloj que se mueve a mano.

   LA REGLA QUE MÁS IMPORTA: nada le llega a otra persona sin que Carlos lo
   apruebe. Al final se revisa CADA envío a alguien que no es Carlos contra
   las aprobaciones que él dio.

   Correr:  node secre/pruebas.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { Secre, horaMx, fechaMx, entreHoras, duracion } from './nucleo.mjs';

const fallas = []; let pasan = 0;
const ok = (que, si, extra) => { if(si){ pasan++; console.log('  ✓', que); } else { fallas.push(que); console.log('  ✗', que, extra !== undefined ? '· ' + JSON.stringify(extra) : ''); } };

const YO = '5214420000000@s.whatsapp.net', ANA = '5214421111111@s.whatsapp.net', BETO = '5214422222222@s.whatsapp.net', GRUPO = '120363000000@g.us', LALO = '5214423333333@s.whatsapp.net';
/* 16 de octubre de 2026, 06:50 en México (12:50 UTC) */
let ahora = Date.UTC(2026, 9, 16, 12, 50);
const reloj = () => ahora;
const pasar = (seg) => { ahora += seg * 1000; };

const enviados = []; let sig = 1;
const transporte = {
  yo: () => [YO],
  async enviar(jid, texto){ const id = 'S' + (sig++); enviados.push({ jid, texto, id, t: ahora }); return id; },
  async escribiendo(){}, async leido(){},
};
const aCarlos = () => enviados.filter(e => e.jid === YO);
const aOtros = () => enviados.filter(e => e.jid !== YO);
const ultimoAviso = () => (aCarlos().slice(-1)[0] || {}).texto || '';

let iaFalla = false;
let vioDatos = [], ordenQuien = '';
const ia = {
  async leer({ nuevos, redactar, datos = [] }){
    if(iaFalla) throw new Error('sin internet');
    const t = nuevos.map(x => x.texto).join(' ');
    vioDatos = datos;
    const sabe = datos.find(d => /examen/.test(d));
    if(redactar && /examen/.test(t) && sabe) return { pendientes: [], respuesta: 'según yo: ' + sabe, motivo: '', urgente: false };
    return { pendientes: /mañana|entregar/i.test(t) ? ['Llevar el proyecto mañana'] : [], respuesta: redactar ? `va, ahorita te digo (${nuevos.length})` : '', motivo: /hora/.test(t) ? 'tienes que decidir la hora' : '', urgente: /urgente/i.test(t) };
  },
  async saludo({ cual, nombre }){ return cual === 'manana' ? `buen día ${nombre} ☀️` : `descansa ${nombre} 🌙`; },
  async orden({ texto, quien }){
    ordenQuien = quien;
    if(/buenos d[ií]as a las 7/.test(texto)) return { respuesta: 'Va.', acciones: [{ accion: 'saludos', chat: 'Ana', manana: '07:00', noche: '22:30', variacion: 0 }] };
    if(/beto es de la escuela/i.test(texto)) return { respuesta: '', acciones: [{ accion: 'etiqueta', chat: 'Beto', etiqueta: 'escuela' }] };
    if(/nadie de la escuela/.test(texto)) return { respuesta: '', acciones: [{ accion: 'regla', modo: 'callado', etiquetas: ['escuela'], hasta: '2026-10-18' }] };
    if(/manda.*mam/.test(texto)) return { respuesta: 'Eso no lo hago: yo sólo te preparo las respuestas y tú las mandas.', acciones: [{ accion: 'mandar', chat: 'Ana', texto: 'hola' }] };
    return { respuesta: '', acciones: [] };
  },
};
const datos = {};
const almacen = { leer: (k, d) => datos[k] ? JSON.parse(datos[k]) : d, guardar: (k, v) => { datos[k] = JSON.stringify(v); } };
const s = new Secre({ cuenta: 'prueba', transporte, ia, almacen, reloj, azar: () => 0.5 });

/* lo que manda Carlos en su chat propio, y el eco de lo que manda Secre */
let aprobaciones = 0;
const carlos = async (texto) => { if(/^#?\d+(\s|$)/.test(texto.trim())) aprobaciones++; await s.alMensaje({ id: 'C' + (sig++), chat: YO, de: YO, texto, mio: true, t: ahora }); };
const llega = (jid, texto, extra = {}) => s.alMensaje({ id: 'M' + (sig++), chat: jid, de: jid, nombre: jid === ANA ? 'Ana' : jid === BETO ? 'Beto' : 'Alguien', texto, mio: false, t: ahora, ...extra });
const nProp = () => { const m = /#(\d+)/.exec(ultimoAviso()); return m ? m[1] : ''; };

console.log('\n0 · Las horas de México');
ok('06:50 en México', horaMx(ahora) === '06:50', horaMx(ahora));
ok('la fecha es la de México', fechaMx(Date.UTC(2026, 9, 17, 3, 0)) === '2026-10-16');
ok('22:00–07:00 cruza la medianoche', entreHoras(Date.UTC(2026, 9, 17, 5, 0), '22:00', '07:00') && !entreHoras(Date.UTC(2026, 9, 16, 18, 0), '22:00', '07:00'));
ok('«2h» son dos horas', duracion('2h', ahora) === 2 * 3600e3);

console.log('\n1 · Le escriben a Carlos: Secre espera a que terminen y le propone una respuesta');
await llega(ANA, '¿siempre sí vienes mañana?'); pasar(10);
await llega(ANA, 'a qué hora llegas'); pasar(10);
await s.tic();
ok('mientras siguen escribiendo, no propone nada', aCarlos().length === 0);
pasar(50); await s.tic();
ok('al terminar, le llega a Carlos UNA propuesta', aCarlos().length === 1, aCarlos());
ok('junta los dos mensajes en una sola', /\(2\)/.test(ultimoAviso()), ultimoAviso());
ok('la propuesta trae el número, lo que dijeron y cómo mandarla', /#1 · Ana/.test(ultimoAviso()) && /«1» la manda/.test(ultimoAviso()));
ok('trae el motivo cuando Carlos tiene que decidir algo', /decidir la hora/.test(ultimoAviso()));
ok('A ANA NO LE LLEGÓ NADA', aOtros().length === 0);
ok('anotó el pendiente', s.estado.pendientes.some(p => /proyecto/.test(p.texto)));

console.log('\n2 · Carlos la aprueba con un número');
await carlos('1');
ok('ahora sí le llega a Ana la propuesta tal cual', aOtros().length === 1 && aOtros()[0].jid === ANA && /ahorita te digo/.test(aOtros()[0].texto), aOtros());
ok('y a Carlos le confirma', /Listo, a Ana/.test(ultimoAviso()));
await carlos('1');
ok('el mismo número dos veces no la manda dos veces', aOtros().length === 1 && /No tengo la #1/.test(ultimoAviso()));

console.log('\n3 · Carlos la cambia o la tira');
await llega(ANA, 'ok y llevas lo de química?'); pasar(60); await s.tic();
const n2 = nProp();
await carlos(`${n2} sí, ya lo tengo listo`);
ok('«2 su texto» manda SU texto, no la propuesta', aOtros().slice(-1)[0].texto === 'sí, ya lo tengo listo', aOtros().slice(-1)[0]);
await llega(ANA, 'jaja ok'); pasar(60); await s.tic();
const n3 = nProp(), antes = aOtros().length;
await carlos(`x${n3}`);
ok('«x3» la tira y no manda nada', aOtros().length === antes && /Tirada/.test(ultimoAviso()));

console.log('\n4 · Si Carlos contesta a mano, Secre se hace a un lado');
await llega(BETO, '¿vas a la fiesta?'); pasar(60); await s.tic();
ok('a Beto le propone', /Beto/.test(ultimoAviso()));
await s.alMensaje({ id: 'C' + (sig++), chat: BETO, de: YO, texto: 'simón carnal, ahí nos vemos', mio: true, t: ahora });
ok('la propuesta de Beto se quita sola', !s.estado.propuestas.some(p => p.chat === BETO));
ok('y aprende cómo escribe Carlos', s.estado.estilo.includes('simón carnal, ahí nos vemos'));
const avisos = aCarlos().length;
pasar(30); await llega(BETO, 'va, a qué hora?'); pasar(60); await s.tic();
ok('si Beto sigue escribiendo en los 15 minutos, no le propone (Carlos está ahí)', aCarlos().length === avisos);
pasar(16 * 60); await llega(BETO, 'oye?'); pasar(60); await s.tic();
ok('pasados los 15 minutos, vuelve a proponer', aCarlos().length === avisos + 1);

console.log('\n5 · Los buenos días y las buenas noches, en palabras normales');
await carlos('a Ana dale buenos días a las 7 y buenas noches a las 10:30');
ok('entendió la orden', /Saludos a Ana: buenos días 07:00 · buenas noches 22:30/.test(ultimoAviso()), ultimoAviso());
ahora = Date.UTC(2026, 9, 16, 12, 59); await s.tic();
ok('a las 6:59 todavía no', !/Buenos días para Ana/.test(ultimoAviso()));
ahora = Date.UTC(2026, 9, 16, 13, 0); const enviadosAntes = aOtros().length; await s.tic();
ok('a las 7:00 le deja listo el buenos días a Carlos', /Buenos días para Ana: «buen día Ana ☀️»/.test(ultimoAviso()), ultimoAviso());
ok('PERO NO SE LO MANDA A ANA', aOtros().length === enviadosAntes);
const nb = nProp(); pasar(60); await s.tic();
ok('no lo repite en el mismo día', aCarlos().filter(e => /Buenos días para Ana/.test(e.texto)).length === 1);
await carlos(nb);
ok('con su número, Ana recibe el buenos días', aOtros().slice(-1)[0].jid === ANA && /buen día Ana/.test(aOtros().slice(-1)[0].texto));
ahora = Date.UTC(2026, 9, 17, 4, 31); await s.tic();
ok('a las 22:31 deja lista la buenas noches', aCarlos().some(e => e.t === ahora && /Buenas noches para Ana/.test(e.texto)));
ahora = Date.UTC(2026, 9, 17, 13, 1); await s.tic();
ok('al día siguiente, otra vez buenos días', aCarlos().filter(e => /Buenos días para Ana/.test(e.texto)).length === 2);
ahora = Date.UTC(2026, 9, 18, 21, 0); await s.tic();
ok('si a las 3 de la tarde no se ha dado el de las 7, ya no lo propone', aCarlos().filter(e => /Buenos días para Ana/.test(e.texto)).length === 2);
ahora = Date.UTC(2026, 9, 19, 4, 35); await s.tic();
ok('pero la buenas noches de ese día sí sale a su hora', aCarlos().some(e => e.t === ahora && /Buenas noches para Ana/.test(e.texto)));

console.log('\n6 · Pendientes y el resumen del día');
await carlos('anota comprar pilas');
await carlos('pendientes');
ok('«pendientes» los lista', /proyecto/.test(ultimoAviso()) && /comprar pilas/.test(ultimoAviso()), ultimoAviso());
const pil = s.estado.pendientes.find(p => /pilas/.test(p.texto)).n;
await carlos('hecho ' + pil);
ok('«hecho N» lo tacha', s.estado.pendientes.find(p => p.n === pil).hecho);
ahora = Date.UTC(2026, 9, 18, 3, 31); await s.tic();
ok('a las 21:31 manda el resumen', /Pendientes de hoy/.test(ultimoAviso()) && !/pilas/.test(ultimoAviso()), ultimoAviso());
const r1 = aCarlos().length; pasar(120); await s.tic();
ok('una vez al día', aCarlos().length === r1);

console.log('\n7 · Pausa y reglas');
await carlos('pausa 2h');
ok('«pausa 2h»', /En pausa hasta/.test(ultimoAviso()));
const propAna = () => aCarlos().filter(e => /· Ana:/.test(e.texto)).length, p0 = propAna();
await llega(ANA, 'hey'); pasar(60); await s.tic();
ok('en pausa no propone nada', propAna() === p0);
pasar(2 * 3600); await llega(ANA, 'hey?'); pasar(60); await s.tic();
ok('al terminar la pausa vuelve a proponer', propAna() === p0 + 1);
await carlos('Beto es de la escuela');
await carlos('esta semana no le propongas nada a nadie de la escuela');
ok('la regla quedó', s.config.reglas.length === 1 && s.config.reglas[0].etiquetas[0] === 'escuela');
const propBeto = () => aCarlos().filter(e => /· Beto:/.test(e.texto)).length, q0 = propBeto();
await llega(BETO, '¿hiciste la tarea?'); pasar(60); await s.tic();
ok('a Beto (de la escuela) no le propone', propBeto() === q0);
ok('la regla dura hasta que termina el domingo 18 en México', s.config.reglas[0].hasta === Date.UTC(2026, 9, 19, 6) && /hasta el 2026-10-18/.test(aCarlos().filter(e => /Regla:/.test(e.texto)).pop().texto));
ahora = Date.UTC(2026, 9, 19, 18, 0); await llega(BETO, '¿ya?'); pasar(60); await s.tic();
ok('cuando vence la regla, vuelve a proponer', propBeto() === q0 + 1);
ok('y sólo cita lo nuevo, no lo que ya le había propuesto', /Beto: «¿ya\?»/.test(aCarlos().filter(e => /· Beto:/.test(e.texto)).pop().texto), aCarlos().filter(e => /· Beto:/.test(e.texto)).pop().texto);

console.log('\n8 · Grupos, caducidad, fallas y lo que no hace');
const g0 = aCarlos().filter(e => /#\d+ · /.test(e.texto) && !/(Buenos días|Buenas noches) para/.test(e.texto)).length;
await llega(GRUPO, 'mañana hay que entregar el proyecto', { grupo: true, nombre: 'Luis' }); pasar(60); await s.tic();
ok('en un grupo no propone (sólo anota)', aCarlos().filter(e => /#\d+ · /.test(e.texto) && !/(Buenos días|Buenas noches) para/.test(e.texto)).length === g0 && s.estado.pendientes.filter(p => p.chat === GRUPO).length === 1);
await llega(ANA, 'oye'); pasar(60); await s.tic();
const vieja = nProp(); ahora += 7 * 3600e3; await s.tic();
await carlos(vieja);
ok('una propuesta de hace 7 horas ya no se manda', /ya caducó/.test(ultimoAviso()));
iaFalla = true; await llega(ANA, 'holaa'); pasar(60); await s.tic(); iaFalla = false;
ok('si la IA falla no truena', true);
const eco = aCarlos().slice(-1)[0];
const nAntes = aCarlos().length;
await s.alMensaje({ id: eco.id, chat: YO, de: YO, texto: eco.texto, mio: true, t: ahora });
await s.alMensaje({ id: 'otro', chat: YO, de: YO, texto: '🤖 #1 · Ana: ...', mio: true, t: ahora });
ok('sus propios avisos no los toma como órdenes de Carlos', aCarlos().length === nAntes);
await llega(BETO, 'URGENTE sin texto'); pasar(60);
const iaVieja = ia.leer; ia.leer = async () => ({ pendientes: [], respuesta: '', motivo: '', urgente: true });
await s.tic(); ia.leer = iaVieja;
const nVacia = nProp(), oV = aOtros().length;
ok('lo urgente sin propuesta igual le avisa a Carlos y guarda lo que le dijeron', /te toca/.test(ultimoAviso()) && (s.estado.propuestas.find(p => p.n === +nVacia) || {}).dijo === 'URGENTE sin texto');
await carlos(nVacia);
ok('aprobar una propuesta vacía no manda un mensaje vacío', aOtros().length === oV && /no trae texto/.test(ultimoAviso()), ultimoAviso());
const o0 = aOtros().length;
await carlos('mándale un mensaje a mi mamá diciendo que ya llegué');
ok('aunque se lo pidan en palabras, NO manda nada por su cuenta', aOtros().length === o0);

console.log('\n8b · Lo que Carlos le cuenta, y lo usa');
await carlos('dato: el viernes 17 hay examen de mate a las 8, temas: derivadas');
ok('«dato: …» lo guarda y le dice qué número quedó', /Lo tengo \(dato 1\)/.test(ultimoAviso()), ultimoAviso());
await carlos('dato: el viernes 17 hay examen de mate a las 8, temas: derivadas');
ok('el mismo dato dos veces no se duplica', s.config.datos.length === 1 && /ya lo sabía/.test(ultimoAviso()));
s.aplicar({ accion: 'dato', texto: 'la junta de padres fue el lunes 12', hasta: '2026-10-12' });
await llega(LALO, 'oye a qué hora es el examen de mate?', { nombre: 'Lalo' }); pasar(60); await s.tic();
ok('al proponer, la IA recibe lo que Carlos le contó', vioDatos.some(d => /examen de mate a las 8/.test(d)), vioDatos);
ok('lo que ya caducó NO se lo pasa', !vioDatos.some(d => /junta de padres/.test(d)), vioDatos);
ok('y la propuesta lo usa', /según yo: el viernes 17 hay examen de mate a las 8/.test(ultimoAviso()), ultimoAviso());
await carlos('datos');
ok('«datos» lista lo que sabe, sin lo caducado', /1\. el viernes 17 hay examen/.test(ultimoAviso()) && !/junta de padres/.test(ultimoAviso()), ultimoAviso());
await carlos('olvida 1');
ok('«olvida 1» lo quita', /Olvidado el dato 1/.test(ultimoAviso()) && !s.datosVigentes().length);

console.log('\n8c · Turnos de secretaria: Secre, Paulina y Negro');
const turnoA = (h) => { ahora = Date.UTC(2026, 9, 20, h + 6, 5); return s.deTurno(); };
ok('de 00 a 08 le toca a una, de 08 a 16 a otra y de 16 a 24 a la tercera', new Set([turnoA(1), turnoA(9), turnoA(17)]).size === 3, [turnoA(1), turnoA(9), turnoA(17)]);
ok('y al día siguiente siguen rotando (no siempre la misma a la misma hora)', (() => { const hoy = turnoA(1); ahora = Date.UTC(2026, 9, 21, 7, 5); return s.deTurno() !== hoy; })());
await carlos('estado');
ok('cada aviso dice quién está de turno', new RegExp('^🤖 (Secre|Paulina|Negro): ').test(ultimoAviso()), ultimoAviso());
await carlos('turno de Paulina');
ok('«turno de Paulina» la deja de guardia fija', s.deTurno() === 'Paulina' && /^🤖 Paulina: De guardia fija: Paulina/.test(ultimoAviso()), ultimoAviso());
ahora += 9 * 3600e3;
ok('aunque pasen las horas', s.deTurno() === 'Paulina');
await carlos('oye qué onda con mis pendientes de la semana');
ok('cuando le hablas en palabras normales, contesta la de turno', ordenQuien === 'Paulina', ordenQuien);
await carlos('turnos');
ok('«turnos» las vuelve a rotar', !s.config.turnos.fijo && /Turnos de 8 h/.test(ultimoAviso()), ultimoAviso());

console.log('\n9 · LA REGLA: nada sale sin que Carlos lo apruebe');
ok(`cada envío a otra persona corresponde a una aprobación (${aOtros().length} envíos, ${aprobaciones} aprobaciones con número)`, aOtros().length <= aprobaciones, { envios: aOtros().length, aprobaciones });
ok('y todos los avisos a Carlos empiezan con 🤖', aCarlos().every(e => e.texto.startsWith('🤖')));

console.log(fallas.length ? `\n✗ ${pasan} pasan · ${fallas.length} fallan` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
