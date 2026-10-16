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
  async enviarSticker(jid, b64){ const id = 'S' + (sig++); enviados.push({ jid, texto: '[sticker]', b64, id, t: ahora }); return id; },
  async escribiendo(){}, async leido(){},
};
const aCarlos = () => enviados.filter(e => e.jid === YO);
const aOtros = () => enviados.filter(e => e.jid !== YO);
const ultimoAviso = () => (aCarlos().slice(-1)[0] || {}).texto || '';

let iaFalla = false;
let vioDatos = [], ordenQuien = '', vioAuto = false, vioRol = null;
const ia = {
  async leer({ nuevos, redactar, auto, rol, personaje, mundo, marca, instrucciones = '', comunidad = '', stickers = [], grupo, datos = [] }){
    if(iaFalla) throw new Error('sin internet');
    const t = nuevos.map(x => x.texto).join(' ');
    vioAuto = !!auto;
    if(auto && rol){
      vioRol = { personaje, mundo, marca, instrucciones, comunidad, quienes: nuevos.map(x => x.quien) };
      if(marca && /eco/.test(t)) return { pendientes: [], lineas: [{ tipo: 'dice', texto: marca + ' ya voy' }, { tipo: 'hace', texto: '> camina a la puerta' }], respuesta: '', motivo: '', urgente: false };
      if(marca) return { pendientes: [], lineas: [{ tipo: 'dice', texto: '¿Quién anda ahí?' }, { tipo: 'hace', texto: 'Kael se levanta de la mesa' }], respuesta: '', motivo: '', urgente: false, sticker: /jaja/.test(t) && stickers.length ? stickers[0].n : 0 };
      if(/fuera de rol/i.test(t)) return { pendientes: [], respuesta: '(ahorita no está, luego te contesta)', motivo: 'te piden algo fuera del rol', urgente: false, decide: true };
      return { pendientes: [], respuesta: `*Kael avanza* (${nuevos.length})`, motivo: '', urgente: false };
    }
    if(auto && grupo) return { pendientes: [], respuesta: /carlos/i.test(t) ? 'Carlos no está ahorita, ya le pasé tu mensaje.' : '', motivo: '', urgente: false };
    if(auto){
      if(/cu[aá]nto|aparta/i.test(t)) return { pendientes: [], respuesta: 'Ya le pasé tu mensaje a Carlos, él te confirma.', motivo: 'decidir el precio', urgente: false, decide: true };
      if(/^(gracias|ok)$/i.test(t.trim())) return { pendientes: [], respuesta: '', motivo: '', urgente: false };
      return { pendientes: [], respuesta: 'Hola, sí tenemos. ¿Qué talla buscas?', motivo: '', urgente: false };
    }
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
/* estas pruebas nacieron con las reglas de antes (propuestas por defecto, 45 s de
   espera, 15 min callada si Carlos escribe, 4 por hora): se dejan puestas a mano
   para que sigan probando lo mismo. Las de ahora se prueban en el §10 */
const datos = { config: JSON.stringify({ version: 2, porDefecto: 'borrador', juntar: 45, juntarMax: 120, esperaSiContesto: 15, auto: { firma: '🤖 Asistente de Carlos', porHora: 4, alDia: 20, grupoPorHora: 30, grupoAlDia: 300 } }) };
const almacen = { leer: (k, d) => datos[k] ? JSON.parse(datos[k]) : d, guardar: (k, v) => { datos[k] = JSON.stringify(v); } };
const s = new Secre({ cuenta: 'prueba', transporte, ia, almacen, reloj, azar: () => 0.5 });

/* lo que manda Carlos en su chat propio, y el eco de lo que manda Secre */
let aprobaciones = 0;
const carlos = async (texto) => {
  if(/^#?\d+(\s|$)/.test(texto.trim())) aprobaciones++;
  /* «todas» aprueba de un jalón las que hay listas (menos las que excluya) */
  const t = /^(?:ok\s+|manda(?:las)?\s+)?(?:todas|todo)(?:\s+menos\s+([\d\s,y#]+))?$/i.exec(texto.trim());
  if(t){ const menos = (t[1] || '').match(/\d+/g)?.map(Number) || []; aprobaciones += s.estado.propuestas.filter(p => String(p.texto || '').trim() && !menos.includes(p.n)).length; }
  await s.alMensaje({ id: 'C' + (sig++), chat: YO, de: YO, texto, mio: true, t: ahora });
};
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

console.log('\n8d · «todas» y los saludos fijos (Carlos no tiene tiempo de tomar el teléfono en el día)');
const PEPE = '5214424444444@s.whatsapp.net', LUPE = '5214425555555@s.whatsapp.net', TERE = '5214426666666@s.whatsapp.net';
s.estado.propuestas = []; s.config.pausaHasta = 0;
ahora = Date.UTC(2026, 9, 22, 18, 0);   /* 12:00 en México */
for(const [j, nom] of [[PEPE, 'Pepe'], [LUPE, 'Lupe']]) await llega(j, 'oye una pregunta', { nombre: nom });
pasar(70); await s.tic();
ok('hay dos respuestas listas', s.estado.propuestas.length === 2, s.estado.propuestas.map(p => p.nombre));
let o1 = aOtros().length;
await carlos('todas');
ok('«todas» las manda de un jalón', aOtros().length === o1 + 2 && s.estado.propuestas.length === 0, aOtros().slice(-2));
ok('y le dice a quién', /mandé 2: Pepe, Lupe/i.test(ultimoAviso()), ultimoAviso());
for(const [j, nom] of [[PEPE, 'Pepe'], [LUPE, 'Lupe'], [TERE, 'Tere']]) await llega(j, 'otra pregunta', { nombre: nom });
pasar(70); await s.tic();
const deLupe = s.estado.propuestas.find(p => p.nombre === 'Lupe');
o1 = aOtros().length;
await carlos(`todas menos ${deLupe.n}`);
ok('«todas menos N» deja ésa', aOtros().length === o1 + 2 && s.estado.propuestas.length === 1 && s.estado.propuestas[0].nombre === 'Lupe', s.estado.propuestas);
await carlos(`x${deLupe.n}`);
await carlos('todas');
ok('sin nada listo, «todas» no manda nada y lo dice', /No hay nada listo/.test(ultimoAviso()));
/* saludo fijo */
s.aplicar({ accion: 'saludos', chat: TERE, manana: '07:00', noche: '', variacion: 0 });
ahora = Date.UTC(2026, 9, 23, 13, 1); await s.tic();   /* 07:01 */
const sal = s.estado.propuestas.find(p => p.tipo === 'manana' && p.chat === TERE);
ok('el primer día, el buenos días se propone', !!sal, s.estado.propuestas);
o1 = aOtros().length;
await carlos(`${sal.n} siempre buenos días Tere, que te vaya bonito ☀️`);
ok('«N siempre texto» lo manda con ese texto', aOtros().length === o1 + 1 && aOtros().slice(-1)[0].texto === 'buenos días Tere, que te vaya bonito ☀️', aOtros().slice(-1));
ok('y avisa que desde mañana sale solo', /Desde mañana se lo mando así, solo/.test(ultimoAviso()), ultimoAviso());
ahora = Date.UTC(2026, 9, 24, 13, 1); o1 = aOtros().length; const p1 = s.estado.propuestas.length;
await s.tic();
ok('al día siguiente sale SOLO, con el texto exacto, sin proponer', aOtros().length === o1 + 1 && aOtros().slice(-1)[0].texto === 'buenos días Tere, que te vaya bonito ☀️' && s.estado.propuestas.length === p1, aOtros().slice(-1));
ok('y le avisa a Carlos que lo mandó', /Mandé el buenos días fijo a Tere/.test(ultimoAviso()), ultimoAviso());
const fijosMandados = aCarlos().filter(e => /Mandé el (buenos días|buenas noches) fijo/.test(e.texto)).length;
await s.tic();
ok('una sola vez al día', aOtros().length === o1 + 1);
await carlos('quita fijo Tere');
ahora = Date.UTC(2026, 9, 25, 13, 1); o1 = aOtros().length; await s.tic();
ok('«quita fijo Tere» lo regresa a proponerse', aOtros().length === o1 && s.estado.propuestas.some(p => p.tipo === 'manana' && p.chat === TERE));

console.log('\n8e · El modo automático: contesta sola donde Carlos lo pidió, y sólo ahí');
const FIRMA = /^Asistente de Carlos: /;   /* sin 🤖 desde el 16 de octubre */
const autorizados = new Set();   /* los chats que Carlos puso en automático, para la regla del final */
ahora = Date.UTC(2026, 9, 26, 17, 0);   /* 11:00 en México */
s.estado.propuestas = [];
const aPepe = () => aOtros().filter(e => e.jid === PEPE);
await llega(PEPE, 'tienen sudaderas?', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('sin prenderlo, nadie recibe nada solo: es propuesta', !aPepe().some(e => FIRMA.test(e.texto)) && s.estado.propuestas.some(p => p.chat === PEPE));
await carlos(`x${s.estado.propuestas.find(p => p.chat === PEPE).n}`);
await carlos('automático Pepe'); autorizados.add(PEPE);
ok('«automático Pepe» lo prende y le explica cómo regresarlo', s.config.chats[PEPE].modo === 'auto' && /manual Pepe/.test(ultimoAviso()), ultimoAviso());
await llega(PEPE, 'hola tienen sudaderas negras?', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('le contesta SOLA, sin esperar a Carlos', FIRMA.test((aPepe().slice(-1)[0] || {}).texto || ''), aPepe().slice(-1));
ok('firmado como asistente (sin 🤖), no como si fuera Carlos', aPepe().slice(-1)[0].texto === 'Asistente de Carlos: Hola, sí tenemos. ¿Qué talla buscas?', aPepe().slice(-1)[0].texto);
ok('a la IA le pidió el mensaje para mandar, no una propuesta', vioAuto);
ok('y a Carlos le avisa qué contestó', /✓ Le contesté sola a Pepe: «Hola, sí tenemos/.test(ultimoAviso()), ultimoAviso());
const pp0 = aPepe().length;
await llega(PEPE, 'cuánto cuesta la negra?', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('lo que necesita su decisión (precio): le contesta que ya le pasó el mensaje', aPepe().length === pp0 + 1 && /Ya le pasé tu mensaje a Carlos/.test(aPepe().slice(-1)[0].texto));
ok('y a Carlos se lo deja con ⚠️ y número', /⚠️ necesita tu decisión: «cuánto cuesta la negra\?»/.test(ultimoAviso()) && /decidir el precio/.test(ultimoAviso()), ultimoAviso());
const nDec = nProp();
await carlos(`${nDec} la negra está en 450`);
ok('Carlos contesta con «N su texto» y se lo manda', aPepe().slice(-1)[0].texto === 'la negra está en 450');
const pp1 = aPepe().length;
await llega(PEPE, 'gracias', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('a un «gracias» no le contesta nada', aPepe().length === pp1);
await llega(PEPE, '🤖 Asistente de Pepe: Gracias por tu mensaje, en un momento te atiendo.', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('si del otro lado contesta OTRO BOT, no le contesta solo (no se enciclan)', aPepe().length === pp1 && /No le contesté sola: parece otro bot/.test(ultimoAviso()), ultimoAviso());
s.estado.propuestas = [];
s.estado.autos[PEPE] = [ahora - 50 * 60e3, ahora - 40 * 60e3, ahora - 30 * 60e3, ahora - 20 * 60e3];
await llega(PEPE, 'oye y en talla M?', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('tope: más de 4 en una hora con el mismo chat → se frena y se lo deja a Carlos', aPepe().length === pp1 && /4 veces en la última hora/.test(ultimoAviso()), ultimoAviso());
s.estado.autos[PEPE] = [];
await s.alMensaje({ id: 'C' + (sig++), chat: PEPE, de: YO, texto: 'yo le sigo', mio: true, t: ahora });
pasar(60); await llega(PEPE, 'va, y la gris?', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('si Carlos se mete al chat a mano, se calla esos 15 minutos', aPepe().length === pp1, aPepe().slice(-1));
pasar(20 * 60);
await carlos('manual Pepe');
await llega(PEPE, 'y la gris?', { nombre: 'Pepe' }); pasar(70); await s.tic();
ok('«manual Pepe» lo regresa a propuestas', aPepe().length === pp1 && s.config.chats[PEPE].modo === 'borrador' && /Propuesta:/.test(ultimoAviso()));
s.estado.propuestas = [];
/* para todos, pero nunca en grupos */
await carlos('automático todos');
ok('«automático todos» prende a todos los que no tengan modo propio', s.config.porDefecto === 'auto' && /menos grupos/.test(ultimoAviso()), ultimoAviso());
autorizados.add('*');
await llega(LALO, 'buenas, venden termos?', { nombre: 'Lalo' }); pasar(70); await s.tic();
ok('a Lalo (sin modo propio) le contesta solo', FIRMA.test((aOtros().filter(e => e.jid === LALO).slice(-1)[0] || {}).texto || ''));
const g1 = aOtros().length;
await llega(GRUPO, 'alguien sabe a qué hora es la junta?', { grupo: true, nombre: 'Luis' }); pasar(70); await s.tic();
ok('en un GRUPO nunca contesta solo, aunque esté en todos', aOtros().length === g1 && !aOtros().some(e => e.jid === GRUPO));
s.aplicar({ accion: 'regla', modo: 'auto', palabras: ['junta'] }); const g2 = aOtros().length;
await llega(GRUPO, 'Carlos, y entonces qué onda con la junta', { grupo: true, nombre: 'Luis' }); pasar(70); await s.tic();
ok('ni una regla «contestar sola» lo prende en un grupo: tiene que ser por nombre', aOtros().length === g2);
s.config.reglas = s.config.reglas.filter(r => r.modo !== 'auto');
ok('Pepe sigue en manual aunque los demás estén en automático', s.modo(PEPE) === 'borrador');
iaFalla = true; const f0 = aOtros().length;
await llega(LALO, 'oye?', { nombre: 'Lalo' }); pasar(70); await s.tic(); iaFalla = false;
ok('si la IA falla, no manda nada solo', aOtros().length === f0);
await carlos('estado');
ok('«estado» dice que está en automático', /Automático: le contesto sola a todos/.test(ultimoAviso()), ultimoAviso());
ahora = Date.UTC(2026, 9, 27, 3, 31); await s.tic();   /* 21:31 */
ok('en la noche le dice cuántos contestó sola y cuáles esperan su decisión', aCarlos().some(e => /Hoy contesté sola 3 mensaje\(s\): Pepe \(2\), Lalo \(1\)/.test(e.texto) && /Esperan tu decisión: Pepe/.test(e.texto)), aCarlos().slice(-2).map(e => e.texto));
await carlos('apaga automático');
ok('«apaga automático» lo apaga para todos', s.config.porDefecto === 'borrador' && !Object.values(s.config.chats).some(c => c.modo === 'auto'), s.config.porDefecto);
autorizados.clear();
const l0 = aOtros().length;
ahora = Date.UTC(2026, 9, 27, 17, 0);
await llega(LALO, 'sigues ahí?', { nombre: 'Lalo' }); pasar(70); await s.tic();
ok('y vuelve a ser propuesta', aOtros().length === l0 && /Propuesta:/.test(ultimoAviso()));
const autosMandados = aOtros().filter(e => FIRMA.test(e.texto));
ok(`cada mensaje que mandó sola fue a un chat que Carlos puso en automático (${autosMandados.length})`, autosMandados.every(e => [PEPE, LALO].includes(e.jid)) && autosMandados.length === 3, autosMandados.map(e => e.jid));

console.log('\n8f · Grupos: sólo los que Carlos autoriza por nombre, y el rol que sigue la historia');
const EQUIPO = '120363111111@g.us', ROL = '120363222222@g.us';
const enGrupo = (g, quien, texto) => llega(g, texto, { grupo: true, nombre: quien, nombreChat: g === ROL ? 'Taberna del Cuervo' : 'Equipo Ventas' });
const aG = (g) => aOtros().filter(e => e.jid === g);
await enGrupo(EQUIPO, 'Luis', 'oigan quién trae las bocinas'); pasar(70); await s.tic();
ok('un grupo que nadie autorizó no se contesta solo', aG(EQUIPO).length === 0);
await carlos('automático equipo ventas');
ok('«automático Equipo Ventas» lo autoriza por nombre', s.config.chats[EQUIPO].modo === 'auto' && /contesto sola cuando te hablen/.test(ultimoAviso()), ultimoAviso());
await enGrupo(EQUIPO, 'Luis', 'y las extensiones?'); pasar(70); await s.tic();
ok('si la plática no es con Carlos, no se mete', aG(EQUIPO).length === 0);
await enGrupo(EQUIPO, 'Luis', 'oye Carlos tú traes el proyector?'); pasar(70); await s.tic();
ok('si le hablan a Carlos, contesta solo en el grupo, firmado', aG(EQUIPO).length === 1 && FIRMA.test(aG(EQUIPO)[0].texto), aG(EQUIPO));
ok('y a Carlos le dice quién le habló', /dijo: «Luis: oye Carlos/.test(ultimoAviso()), ultimoAviso());
/* el rol */
await enGrupo(ROL, 'Ana', '*mira a Kael* ¿vienes o no?'); pasar(70); await s.tic();
ok('el rol tampoco se juega solo sin permiso', aG(ROL).length === 0);
await carlos('rol taberna del cuervo: Kael, mercenario callado que odia a los magos');
ok('«rol Taberna: personaje» lo prende con su personaje', s.config.chats[ROL].rol && s.config.chats[ROL].modo === 'auto' && s.config.chats[ROL].personaje.startsWith('Kael') && /sigo la historia sola/.test(ultimoAviso()), ultimoAviso());
ok('y le dice cómo firmar y cómo pararlo', /firma taberna/i.test(ultimoAviso()) && /manual/.test(ultimoAviso()), ultimoAviso());
const avisosRol = aCarlos().length;
await enGrupo(ROL, 'Ana', '*desenvaina* ¡Kael, cuidado!'); pasar(70); await s.tic();
ok('sigue la historia en personaje, sin 🤖', aG(ROL).length === 1 && /^\*Kael avanza\*/.test(aG(ROL)[0].texto), aG(ROL));
ok('la IA recibe el personaje y quién dijo qué', vioRol && vioRol.personaje.startsWith('Kael') && vioRol.quienes.includes('Ana'), vioRol);
ok('y no le avisa a Carlos cada jugada (van en el resumen)', aCarlos().length === avisosRol);
const g0r = aG(ROL).length;
for(let k = 0; k < 10; k++){ await enGrupo(ROL, k % 2 ? 'Ana' : 'Beto', `*ataca* ronda ${k}`); pasar(20); await s.tic(); }
ok('en un grupo que no para de escribir, contesta a los 2 minutos aunque sigan', aG(ROL).length > g0r, aG(ROL).length);
ok('juntando lo de varios en una sola jugada', +((/\((\d+)\)/.exec(aG(ROL).slice(-1)[0].texto) || [])[1]) >= 3, aG(ROL).slice(-1)[0].texto);
pasar(70); await s.tic();
const g1r = aG(ROL).length;
await enGrupo(ROL, 'BotDado', '🤖 Dado: salió 17'); pasar(70); await s.tic();
ok('en un grupo SÍ le contesta a otro bot (el de los dados, el narrador)', aG(ROL).length === g1r + 1, aG(ROL).slice(-1));
const g1b = aG(ROL).length;
await s.alMensaje({ id: 'C' + (sig++), chat: ROL, de: YO, texto: '*Kael gruñe*', mio: true, grupo: true, t: ahora });
pasar(60); await enGrupo(ROL, 'Ana', '¿y luego?'); pasar(70); await s.tic();
ok('si Carlos entra a jugar, se hace a un lado', aG(ROL).length === g1b);
pasar(16 * 60);
await enGrupo(ROL, 'Ana', 'fuera de rol: Carlos me prestas 200?'); pasar(70); await s.tic();
ok('lo de la vida real que sólo él decide se lo deja con número', /⚠️ necesita tu decisión/.test(ultimoAviso()), ultimoAviso());
s.estado.autos[ROL] = Array.from({ length: 30 }, (_, k) => ahora - k * 60e3);
const g2r = aG(ROL).length, av2 = aCarlos().length;
await enGrupo(ROL, 'Ana', '*sigue la pelea*'); pasar(70); await s.tic();
await enGrupo(ROL, 'Ana', '*más pelea*'); pasar(70); await s.tic();
ok('con el tope del grupo (30 por hora) se calla y avisa UNA vez', aG(ROL).length === g2r && aCarlos().length === av2 + 1 && /me detuve/.test(ultimoAviso()), aCarlos().slice(av2).map(e => e.texto));
s.estado.autos[ROL] = [];
/* dos bots platicando sin parar: el tope del grupo los frena */
s.estado.frenoAvisado = {};   /* el aviso de la otra prueba fue hace minutos: una vez por hora */
const g4r = aG(ROL).length, av4 = aCarlos().length;
for(let k = 0; k < 40; k++){ await enGrupo(ROL, 'Narrador', `🤖 Narrador: la tormenta sigue (${k})`); pasar(70); await s.tic(); }
const deMas = aG(ROL).length - g4r;
ok(`con otro bot que contesta todo, se frena sola en 30 por hora (contestó ${deMas} de 40)`, deMas === 30, deMas);
ok('y a Carlos le avisa una sola vez', aCarlos().slice(av4).filter(e => /me detuve/.test(e.texto)).length === 1, aCarlos().slice(av4).map(e => e.texto));
s.estado.autos[ROL] = []; pasar(3600);
/* el mundo del rol */
await carlos('mundo taberna del cuervo: Reino de Valdor. La magia está prohibida y los magos se esconden.');
ok('«mundo Taberna: …» guarda el contexto del mundo', /Guardé el mundo de Taberna del Cuervo/.test(ultimoAviso()) && s.config.chats[ROL].mundo.startsWith('Reino de Valdor'), ultimoAviso());
await carlos('mundo taberna del cuervo: + El rey murió anoche.');
ok('«mundo Taberna: + …» le agrega sin borrar lo de antes', /Agregado/.test(ultimoAviso()) && /magos se esconden\.\nEl rey murió anoche\./.test(s.config.chats[ROL].mundo), s.config.chats[ROL].mundo);
await enGrupo(ROL, 'Ana', '*mira al mago encapuchado*'); pasar(70); await s.tic();
ok('y la IA lo recibe en cada jugada', vioRol && /Valdor/.test(vioRol.mundo) && /rey murió/.test(vioRol.mundo), vioRol);
await carlos('mundo taberna del cuervo');
ok('«mundo Taberna» se lo enseña', /El mundo de Taberna del Cuervo:\nReino de Valdor/.test(ultimoAviso()), ultimoAviso());
await carlos('sin firma taberna del cuervo');
await enGrupo(ROL, 'Ana', '*abre la puerta*'); pasar(70); await s.tic();
ok('«sin firma» manda la jugada tal cual', aG(ROL).slice(-1)[0].texto.startsWith('*Kael avanza*'), aG(ROL).slice(-1));
await carlos('manual taberna del cuervo');
const g3r = aG(ROL).length;
await enGrupo(ROL, 'Ana', '*se va*'); pasar(70); await s.tic();
ok('«manual Taberna» lo para', aG(ROL).length === g3r && !s.config.chats[ROL].rol);
ok('nada salió solo a un grupo que Carlos no autorizó', aOtros().filter(e => e.jid.endsWith('@g.us')).every(e => [EQUIPO, ROL].includes(e.jid)));

console.log('\n8g · El formato del rol (🌌⚛️- habla, > hace) y los stickers de Carlos');
await carlos('rol taberna del cuervo');
await carlos('marca taberna del cuervo: 🌌⚛️-');
ok('«marca Taberna: 🌌⚛️-» la guarda y enseña cómo va a salir', s.config.chats[ROL].marca === '🌌⚛️-' && /🌌⚛️- lo que dice\ny lo que hace como\n> lo que hace/.test(ultimoAviso()), ultimoAviso());
await enGrupo(ROL, 'Ana', '🌸- ¿Hay alguien en la taberna?'); pasar(70); await s.tic();
ok('lo que dice sale con su marca y lo que hace con «> », renglón por renglón', aG(ROL).slice(-1)[0].texto === '🌌⚛️- ¿Quién anda ahí?\n> Kael se levanta de la mesa', aG(ROL).slice(-1)[0].texto);
await enGrupo(ROL, 'Ana', 'eco'); pasar(70); await s.tic();
ok('si la IA pone la marca o el «>» ella misma, no salen dobles', aG(ROL).slice(-1)[0].texto === '🌌⚛️- ya voy\n> camina a la puerta', aG(ROL).slice(-1)[0].texto);
await carlos('firma normal taberna del cuervo');
await enGrupo(ROL, 'Ana', '🌸- ¿y bien?'); pasar(70); await s.tic();
ok('con marca y firma normal, el renglón sale limpio (sin 🤖 pegado)', /^🌌⚛️- ¿Quién anda ahí\?\n> Kael se levanta de la mesa$/.test(aG(ROL).slice(-1)[0].texto), aG(ROL).slice(-1)[0].texto);
/* los stickers */
await enGrupo(ROL, 'Ana', 'jajajaja no puede ser'); pasar(5);
await s.alMensaje({ id: 'C' + (sig++), chat: ROL, de: YO, texto: '[sticker]', mio: true, grupo: true, t: ahora, sticker: { b64: 'UklGRiQAAABXRUJQ' } });
ok('los stickers que manda Carlos en el grupo se guardan, con lo que estaba pasando', (s.config.chats[ROL].stickers || []).length === 1 && /jajajaja no puede ser/.test(s.config.chats[ROL].stickers[0].cuando), s.config.chats[ROL].stickers);
pasar(16 * 60);
const st0 = aG(ROL).filter(e => e.texto === '[sticker]').length;
await enGrupo(ROL, 'Ana', 'jaja Kael qué cara pusiste'); pasar(70); await s.tic();
ok('cuando queda, manda uno de SUS stickers además de la jugada', aG(ROL).filter(e => e.texto === '[sticker]').length === st0 + 1 && aG(ROL).slice(-1)[0].b64 === 'UklGRiQAAABXRUJQ', aG(ROL).slice(-2));
await enGrupo(ROL, 'Ana', 'jaja otra vez'); pasar(70); await s.tic();
ok('pero no dos seguidos (uno cada 10 min como máximo)', aG(ROL).filter(e => e.texto === '[sticker]').length === st0 + 1);
await carlos('stickers taberna del cuervo');
ok('«stickers Taberna» dice cuántos tiene', /Tengo 1 sticker/.test(ultimoAviso()), ultimoAviso());
ok('en un chat de una persona no se guardan stickers', (() => { s.alMensaje({ id: 'C' + (sig++), chat: ANA, de: YO, texto: '[sticker]', mio: true, t: ahora, sticker: { b64: 'UklGRiQAAABXRUJQ' } }); return !(s.config.chats[ANA].stickers || []).length; })());
await carlos('manual taberna del cuervo');

console.log('\n8h · La comunidad de rol: todos sus grupos de un jalón, con su contexto y sus instrucciones');
const COM = '120363900000@g.us', TAB2 = '120363900001@g.us', BOS = '120363900002@g.us', CAS = '120363900003@g.us';
const enCom = (g, quien, texto) => llega(g, texto, { grupo: true, nombre: quien, nombreChat: { [TAB2]: 'Taberna', [BOS]: 'Bosque', [CAS]: 'Castillo' }[g] });
const gruposCom = [{ id: TAB2, nombre: 'Taberna' }, { id: BOS, nombre: 'Bosque' }, { id: CAS, nombre: 'Castillo' }];
const hecho = s.ponerComunidad({ id: COM, nombre: 'Reino de Valdor', grupos: gruposCom, activos: [TAB2, BOS],
  personaje: 'Kael, mercenario callado', mundo: 'La magia está prohibida en Valdor.', marca: '🌌⚛️-', instrucciones: 'Nunca ataques primero.' });
ok('guardar la comunidad dice en cuántos grupos sigue la historia', /Reino de Valdor: sigo la historia en 2 grupo/.test(hecho), hecho);
ok('prende el rol SÓLO en los grupos marcados', s.config.chats[TAB2].rol && s.config.chats[BOS].rol && !s.config.chats[CAS].rol && s.config.chats[CAS].modo !== 'auto');
vioRol = null;
await enCom(BOS, 'Ana', '🌸- Algo se mueve entre los árboles'); pasar(70); await s.tic();
ok('en un grupo de la comunidad juega con el personaje, el mundo y las instrucciones de la comunidad',
  vioRol && /Kael/.test(vioRol.personaje) && /magia está prohibida/.test(vioRol.mundo) && /Nunca ataques primero/.test(vioRol.instrucciones) && vioRol.comunidad === 'Reino de Valdor', vioRol);
ok('y con la marca de la comunidad', aG(BOS).slice(-1)[0] && aG(BOS).slice(-1)[0].texto.startsWith('🌌⚛️- '), aG(BOS).slice(-1)[0]);
const enCas = aG(CAS).length;
await enCom(CAS, 'Beto', '🔥- ¿Quién vigila la muralla?'); pasar(70); await s.tic();
ok('en el grupo que no se marcó no juega', aG(CAS).length === enCas);
s.config.chats[BOS].personaje = 'Lyra, la ladrona'; s.config.chats[BOS].mundo = 'En el Bosque viven los elfos.';
await enCom(BOS, 'Ana', '🌸- ¿Quién anda?'); pasar(70); await s.tic();
ok('lo que el grupo tiene en su tarjeta le gana (personaje) o se suma (mundo)', vioRol.personaje === 'Lyra, la ladrona' && /prohibida/.test(vioRol.mundo) && /elfos/.test(vioRol.mundo), vioRol);
s.ponerComunidad({ id: COM, nombre: 'Reino de Valdor', grupos: gruposCom, activos: [TAB2] });
ok('quitarle la palomita a un grupo lo apaga, y lo demás se queda como estaba', !s.config.chats[BOS].rol && s.config.chats[TAB2].rol && /Nunca ataques/.test(s.config.comunidades[COM].instrucciones));
ok('una comunidad que no es grupo de WhatsApp no se guarda', s.ponerComunidad({ id: 'ana@s.whatsapp.net', grupos: [] }) === '');
s.ponerComunidad({ id: COM, nombre: 'Reino de Valdor', grupos: gruposCom, activos: [] });
const enGrupos = aOtros().filter(e => [EQUIPO, ROL, TAB2, BOS, CAS].includes(e.jid)).length;

console.log('\n9 · LA REGLA: nada sale sin que Carlos lo apruebe (o sin que haya prendido el automático en ese chat)');
ok(`cada envío a otra persona corresponde a una aprobación (${aOtros().length} envíos, ${aprobaciones} aprobaciones, ${fijosMandados} saludos que dejó fijos, ${autosMandados.length} en automático, ${enGrupos} en grupos autorizados)`, aOtros().length <= aprobaciones + fijosMandados + autosMandados.length + enGrupos, { envios: aOtros().length, aprobaciones, fijosMandados });
ok('y todos los avisos a Carlos empiezan con 🤖', aCarlos().every(e => e.texto.startsWith('🤖')));

console.log('\n10 · Asistente de verdad: contesta siempre y al instante (Carlos, 16 de octubre)');
{
  const env2 = []; let eco = null, sig2 = 1;
  const t2 = {
    yo: () => [YO], otrosYo: () => ['5214429999999@s.whatsapp.net'],
    /* el eco de Baileys puede llegar ANTES de que enviar regrese, con otro id: aquí llega así a propósito */
    async enviar(jid, texto){ const id = 'N' + (sig2++); env2.push({ jid, texto, id }); if(eco && jid !== YO) await eco({ id: 'eco-' + id, chat: jid, de: YO, texto, mio: true, t: ahora }); return id; },
    async escribiendo(){}, async leido(){},
  };
  const datos2 = {}, alm2 = { leer: (k, d) => datos2[k] ? JSON.parse(datos2[k]) : d, guardar: (k, v) => { datos2[k] = JSON.stringify(v); } };
  const s2 = new Secre({ cuenta: 'nueva', transporte: t2, ia, almacen: alm2, reloj, azar: () => 0.5 });
  eco = (m) => s2.alMensaje(m);
  ok('de fábrica contesta sola a cualquier número, espera 6 s y no se calla si Carlos escribe', s2.config.porDefecto === 'auto' && s2.config.juntar === 6 && s2.config.esperaSiContesto === 0);
  const DESCONOCIDO = '5215550001111@s.whatsapp.net', a2 = () => env2.filter(e => e.jid === DESCONOCIDO);
  await s2.alMensaje({ id: 'n1', chat: DESCONOCIDO, de: DESCONOCIDO, nombre: 'Rosa', texto: 'hola, tienen sudaderas?', mio: false, t: ahora }); pasar(7); await s2.tic();
  ok('un número que nunca había escrito recibe respuesta a los segundos', a2().length === 1, env2);
  ok('firmado como asistente, sin 🤖', a2()[0] && a2()[0].texto === 'Asistente de Carlos: Hola, sí tenemos. ¿Qué talla buscas?', a2()[0]);
  ok('su propio eco no se toma como si Carlos hubiera escrito (no aprende su estilo de sí misma)', !s2.estado.estilo.some(x => /Asistente de Carlos/.test(x)) && !s2.estado.tomado[DESCONOCIDO], s2.estado.estilo);
  ok('y en el historial queda una sola vez', (s2.estado.historial[DESCONOCIDO] || []).filter(x => x.de === 'yo').length === 1);
  /* Carlos contesta a mano y la persona sigue: Secre no se calla 15 minutos */
  await s2.alMensaje({ id: 'c1', chat: DESCONOCIDO, de: YO, texto: 'sí, ahorita te paso fotos', mio: true, t: ahora }); pasar(5);
  await s2.alMensaje({ id: 'n2', chat: DESCONOCIDO, de: DESCONOCIDO, nombre: 'Rosa', texto: 'va, y de qué colores hay?', mio: false, t: ahora }); pasar(7); await s2.tic();
  ok('aunque Carlos esté escribiendo en ese chat, a lo nuevo le contesta igual', a2().length === 2, a2());
  /* su otra cuenta no se contesta sola: dos Secres no paran nunca */
  const OTRA = '5214429999999@s.whatsapp.net';
  await s2.alMensaje({ id: 'n3', chat: OTRA, de: OTRA, nombre: 'Carlos 2', texto: 'prueba', mio: false, t: ahora }); pasar(7); await s2.tic();
  ok('a su otra cuenta no le contesta sola (se lo deja de propuesta)', !env2.some(e => e.jid === OTRA) && s2.estado.propuestas.some(p => p.chat === OTRA));
  /* en el rol sí se hace a un lado si Carlos juega: su personaje no puede salir doble */
  const R2 = '120363777777@g.us';
  s2.chat(R2).grupo = true; s2.chat(R2).rol = true; s2.chat(R2).modo = 'auto'; s2.chat(R2).nombre = 'Taberna 2';
  await s2.alMensaje({ id: 'c2', chat: R2, de: YO, texto: '*Kael entra*', mio: true, grupo: true, t: ahora }); pasar(5);
  await s2.alMensaje({ id: 'n4', chat: R2, de: ANA, nombre: 'Ana', nombreChat: 'Taberna 2', texto: '*Lyra lo mira*', mio: false, grupo: true, t: ahora }); pasar(7); await s2.tic();
  ok('en el rol, si Carlos está jugando, no juega por él', !env2.some(e => e.jid === R2));
  /* las cuentas guardadas con lo de antes se pasan solas a lo nuevo */
  const viejo = { config: JSON.stringify({ porDefecto: 'borrador', juntar: 45, juntarMax: 120, esperaSiContesto: 15, auto: { firma: '🤖 Asistente de Carlos', porHora: 4, alDia: 20 } }) };
  const s3 = new Secre({ cuenta: 'vieja', transporte: t2, ia, almacen: { leer: (k, d) => viejo[k] ? JSON.parse(viejo[k]) : d, guardar(){} }, reloj });
  ok('una cuenta con la configuración vieja se pasa sola a la nueva (una vez)', s3.config.version === 2 && s3.config.porDefecto === 'auto' && s3.config.juntar === 6 && s3.config.esperaSiContesto === 0 && s3.config.auto.porHora === 20 && s3.config.auto.firma === 'Asistente de Carlos', s3.config);
  const ya = { config: JSON.stringify({ version: 2, porDefecto: 'borrador', juntar: 30 }) };
  const s4 = new Secre({ cuenta: 'ya', transporte: t2, ia, almacen: { leer: (k, d) => ya[k] ? JSON.parse(ya[k]) : d, guardar(){} }, reloj });
  ok('y lo que Carlos cambie después ya no se lo pisa', s4.config.porDefecto === 'borrador' && s4.config.juntar === 30);
}

console.log(fallas.length ? `\n✗ ${pasan} pasan · ${fallas.length} fallan` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
