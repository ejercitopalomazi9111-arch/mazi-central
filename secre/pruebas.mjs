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
import { Secre, horaMx, fechaMx, entreHoras, duracion, diasDe, horaDe, textoDias, diaMx } from './nucleo.mjs';

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
ok('si la IA falla, no inventa nada: sólo le avisa que su mensaje llegó', aOtros().length === f0 + 1 && /Recibí tu mensaje, en un momento te contesto\.$/.test(aOtros().slice(-1)[0].texto), aOtros().slice(-1));
ok('y en «Por mandar» queda por qué', (s.estado.contestadas[0] || {}).que === 'error' && /la IA no contestó/.test(s.estado.contestadas[0].porque), s.estado.contestadas[0]);
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
ok('y vuelve a ser propuesta', aOtros().length === l0 && aCarlos().slice(-2).some(e => /Propuesta:/.test(e.texto)), aCarlos().slice(-2));
const autosMandados = aOtros().filter(e => FIRMA.test(e.texto));
ok(`cada mensaje que mandó sola fue a un chat que Carlos puso en automático (${autosMandados.length})`, autosMandados.every(e => [PEPE, LALO].includes(e.jid)) && autosMandados.length === 4, autosMandados.map(e => e.jid));

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

console.log('\n9b · «Por mandar» enseña lo que llegó, qué contestó y por qué');
{
  const l = s.estado.contestadas || [];
  ok('cada respuesta sola queda con lo que dijeron, lo que contestó y por qué', l.some(x => x.que === 'contesto' && x.dijo && x.resp && x.porque), l.slice(0, 3));
  ok('lo que necesitaba a Carlos queda marcado así', l.some(x => x.que === 'decide' && /necesita tu decisión/.test(x.porque)));
  ok('cuando un freno la detuvo, dice cuál', l.some(x => x.que === 'freno' && /ya contesté|otro bot|otra cuenta|me detuve/.test(x.porque)), l.filter(x => x.que === 'freno').slice(0, 2));
  ok('lo que dejó de propuesta, también', l.some(x => x.que === 'propuesta'));
}

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
  const antesOtra = env2.filter(e => e.jid === OTRA).length;
  await s2.alMensaje({ id: 'n3', chat: OTRA, de: OTRA, nombre: 'Carlos 2', texto: '🤖 Negro: #4 · Ana: «hola»', mio: false, t: ahora }); pasar(7); await s2.tic();
  ok('a lo que le avisa la Secre de su otra cuenta no le contesta ni le propone nada', env2.filter(e => e.jid === OTRA).length === antesOtra && !s2.estado.propuestas.some(p => p.chat === OTRA) && !s2.estado.historial[OTRA]);
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

console.log('\n11 · Avisos cruzados: cada cuenta le escribe a la otra para que suene (Carlos, 16 de octubre)');
{
  /* dos Secres en el mismo despliegue, una por número, y un WhatsApp de mentira entre ellas */
  const A_YO = '5217862447707@s.whatsapp.net', A_LID = '111@lid', B_YO = '5214428833786@s.whatsapp.net';
  const red = []; const S = {}; let n = 1;
  const hacer = (cuenta, mios, otros) => ({
    yo: () => mios, otrosYo: () => otros,
    async enviar(jid, texto){
      const id = cuenta + (n++); red.push({ de: cuenta, jid, texto, id });
      /* el eco en la propia cuenta, y si va al otro número, le llega a la otra Secre */
      await S[cuenta].alMensaje({ id: 'eco' + id, chat: jid, de: mios[0], texto, mio: true, t: ahora });
      const otra = cuenta === 'A' ? 'B' : 'A', suyos = cuenta === 'A' ? [B_YO] : [A_YO, A_LID];
      if(suyos.includes(jid)) await S[otra].alMensaje({ id: 'in' + id, chat: mios[0], de: mios[0], nombre: 'Carlos', texto, mio: false, t: ahora });
      return id;
    },
    async escribiendo(){}, async leido(){},
  });
  const alm = () => { const d = {}; return { leer: (k, x) => d[k] ? JSON.parse(d[k]) : x, guardar: (k, v) => { d[k] = JSON.stringify(v); } }; };
  S.A = new Secre({ cuenta: 'A', transporte: hacer('A', [A_YO, A_LID], [B_YO]), ia, almacen: alm(), reloj, azar: () => 0.5 });
  S.B = new Secre({ cuenta: 'B', transporte: hacer('B', [B_YO], [A_YO, A_LID]), ia, almacen: alm(), reloj, azar: () => 0.5 });
  ok('de fábrica los avisos van a la otra cuenta', S.A.destinoAvisos() === B_YO && S.B.destinoAvisos() === A_YO, [S.A.destinoAvisos(), S.B.destinoAvisos()]);
  /* alguien le escribe a la cuenta A y algo necesita a Carlos */
  const CLI = '5215551112222@s.whatsapp.net';
  await S.A.alMensaje({ id: 'x1', chat: CLI, de: CLI, nombre: 'Doña Mary', texto: 'cuánto cuesta el vestido?', mio: false, t: ahora }); pasar(7); await S.A.tic(); await S.B.tic();
  const avA = red.filter(e => e.de === 'A' && e.jid === B_YO);
  ok('lo de la cuenta 786 le llega al 442 (con notificación), con 🤖 y número', avA.length === 1 && /^🤖 \w+: #\d+ · Doña Mary/.test(avA[0].texto), red);
  ok('…y no a su chat propio, que no suena', !red.some(e => e.de === 'A' && e.jid === A_YO));
  ok('la Secre del 442 no se lo contesta ni lo vuelve propuesta', !red.some(e => e.de === 'B' && e.jid === A_YO && !/^🤖/.test(e.texto)) && !S.B.estado.propuestas.length && !S.B.estado.historial[A_YO], S.B.estado.propuestas);
  /* Carlos contesta desde el 442, en ese mismo chat */
  const pn = S.A.estado.propuestas[0].n, antes = red.length;
  await S.B.alMensaje({ id: 'c1', chat: A_YO, de: B_YO, texto: `${pn} sí, cuesta 350`, mio: true, t: ahora });
  await S.A.alMensaje({ id: 'c1in', chat: B_YO, de: B_YO, nombre: 'Carlos', texto: `${pn} sí, cuesta 350`, mio: false, t: ahora });
  ok('lo que Carlos contesta desde la otra cuenta es una orden: sale a la persona', red.slice(antes).some(e => e.jid === CLI && /350/.test(e.texto)), red.slice(antes));
  ok('y la confirmación le llega ahí mismo', red.slice(antes).some(e => e.de === 'A' && e.jid === B_YO && /Listo, a Doña Mary/.test(e.texto)));
  ok('en la cuenta 442 eso no cuenta como escribir a mano (no aprende ni se calla)', !S.B.estado.estilo.length && !S.B.estado.tomado[A_YO]);
  /* desde la cuenta B también: le escriben al 442 y avisa al 786 */
  const red0 = red.length;
  await S.B.alMensaje({ id: 'x2', chat: LALO, de: LALO, nombre: 'Lalo', texto: 'oye a qué hora es mañana?', mio: false, t: ahora }); pasar(7); await S.B.tic();
  ok('y al revés: lo del 442 le llega al 786', red.slice(red0).some(e => e.de === 'B' && e.jid === A_YO && /Lalo/.test(e.texto)), red.slice(red0));
  ok('ninguna Secre se pone a platicar con la otra (cero mensajes sin 🤖 entre los dos números)', !red.some(e => [A_YO, A_LID, B_YO].includes(e.jid) && !/^🤖/.test(e.texto)), red.filter(e => [A_YO, B_YO].includes(e.jid)).map(e => e.texto.slice(0, 40)));
  /* «avisos aquí» lo regresa al chat propio */
  await S.A.orden('avisos aquí');
  ok('«avisos aquí» la regresa a su chat propio', S.A.destinoAvisos() === A_YO && red.slice(-1)[0].jid === A_YO, red.slice(-1));
  await S.A.orden('avisos a la otra');
  ok('«avisos a la otra» la vuelve a mandar a la otra cuenta', S.A.destinoAvisos() === B_YO);
  /* sin otra cuenta vinculada, al chat propio */
  const solo = new Secre({ cuenta: 'S', transporte: { yo: () => [YO], otrosYo: () => [], async enviar(){ return 'z'; } }, ia, almacen: alm(), reloj });
  ok('con una sola cuenta vinculada, los avisos van a su chat propio', solo.destinoAvisos() === YO);

  console.log('\n11b · El repaso corto: qué hizo y qué falta, cada 3 h de día');
  const r0 = red.length;
  /* mover el reloj a las 12:30 de México, día siguiente: ya pasaron más de 3 h */
  ahora = Date.UTC(2026, 9, 17, 18, 30);
  S.A.estado.repasoT = ahora - 4 * 3_600_000;
  await S.A.alMensaje({ id: 'x3', chat: ANA, de: ANA, nombre: 'Ana', texto: 'hola! me apartas un termo?', mio: false, t: ahora }); pasar(7); await S.A.tic();
  pasar(60); S.A.estado.repasoT = ahora - 4 * 3_600_000; await S.A.tic();
  const rep = red.slice(r0).find(e => /Repaso desde/.test(e.texto));
  ok('cada 3 h le llega un repaso a la otra cuenta', !!rep && rep.jid === B_YO, red.slice(r0).map(e => e.texto.slice(0, 50)));
  ok('dice a quién contestó, qué espera su número y los pendientes', rep && /Contesté sola: .*Ana/.test(rep.texto) && /Esperan tu número/.test(rep.texto), rep && rep.texto);
  const r1 = red.length; pasar(3600); await S.A.tic();
  ok('si no pasó nada nuevo, no manda repaso (que la notificación valga la pena)', !red.slice(r1).some(e => /Repaso/.test(e.texto)));
  ahora = Date.UTC(2026, 9, 18, 8, 0);   /* 2:00 de la mañana en México */
  S.A.estado.repasoT = ahora - 5 * 3_600_000;
  await S.A.alMensaje({ id: 'x4', chat: ANA, de: ANA, nombre: 'Ana', texto: 'y de qué colores?', mio: false, t: ahora }); pasar(7); const r2 = red.length; await S.A.tic();
  ok('de madrugada no manda repaso', !red.slice(r2).some(e => /Repaso/.test(e.texto)));
  await S.A.orden('repaso');
  ok('«repaso» lo manda en el momento', /Repaso desde/.test(red.slice(-1)[0].texto), red.slice(-1));
  await S.A.orden('repaso 0');
  ok('«repaso 0» lo apaga', S.A.config.repaso.cada === 0);
}

console.log('\n12 · «¿Qué me llegó?», notas de voz y llamadas (Carlos, 16 de octubre)');
{
  ahora = Date.UTC(2026, 9, 20, 17, 0);   /* 11:00 en México */
  const env3 = []; let n3 = 1, oirFalla = false, vozFalla = false, oidos = 0;
  const t3 = {
    yo: () => [YO], otrosYo: () => [],
    async enviar(jid, texto){ const id = 'V' + (n3++); env3.push({ jid, texto, id }); return id; },
    async enviarAudio(jid, ogg, sg){ const id = 'V' + (n3++); env3.push({ jid, texto: '[audio]', ogg, sg, id }); return id; },
    async escribiendo(){}, async leido(){}, async grabando(){},
  };
  const ia3 = { ...ia,
    async leer(x){
      const t = x.nuevos.map(y => y.texto).join(' ');
      if(x.auto && /hospital|urgente/i.test(t)) return { pendientes: [], respuesta: 'Ya le aviso a Carlos ahora mismo.', motivo: 'una emergencia', urgente: true, decide: true };
      return ia.leer(x);
    },
    async oir({ b64 }){ oidos++; if(oirFalla) throw new Error('sin red'); return Buffer.from(b64, 'base64').toString(); },
    async voz(texto){ if(vozFalla) throw new Error('la voz no contestó'); return { ogg: Buffer.from('OggS' + texto), segundos: 3 }; },
    async resumir({ chats }){ return { resumen: `Te escribieron ${chats.length} personas.`, importantes: chats.filter(c => c.mensajes.some(m => /mamá/.test(m.dijo))).map(c => c.nombre) }; },
  };
  const llamadas = []; let listas = false;
  const tel = { listas: () => listas, async llamar(x){ llamadas.push(x); return { bien: true }; } };
  const alm = (() => { const d = {}; return { leer: (k, x) => d[k] ? JSON.parse(d[k]) : x, guardar: (k, v) => { d[k] = JSON.stringify(v); } }; })();
  const s5 = new Secre({ cuenta: 'R', transporte: t3, ia: ia3, almacen: alm, reloj, azar: () => 0.5, telefono: tel });
  const ROSA = '5215550002222@s.whatsapp.net', PEPE = '5215550003333@s.whatsapp.net', MARY = '5215550004444@s.whatsapp.net';
  const llega5 = async (jid, nombre, texto, extra = {}) => { await s5.alMensaje({ id: 'm' + (n3++), chat: jid, de: jid, nombre, texto, mio: false, t: ahora, ...extra }); pasar(7); await s5.tic(); };
  const dice = async (texto) => { await s5.orden(texto); return (env3.filter(e => e.jid === YO && e.texto !== '[audio]').slice(-1)[0] || {}).texto || ''; };
  await llega5(ANA, 'Ana', 'hola, tienen termos?');
  await llega5(MARY, 'Doña Mary', 'me apartas el vestido?');
  await llega5(ROSA, 'Rosa', 'dice mi mamá que si vienes el domingo');
  await llega5(PEPE, 'Pepe', 'urgente, estoy en el hospital');
  ok('sin pedirlo, con llamadas apagadas, no le llama', !llamadas.length);
  let r = await dice('¿Qué me llegó?');
  ok('«qué me llegó» le resume todo lo que llegó desde ayer', /Lo que te llegó desde las/.test(r) && /4 mensaje\(s\) de 4 chat\(s\)/.test(r), r);
  ok('arriba, en corto (con la IA)', /En corto: Te escribieron 4 personas\./.test(r));
  const imp = r.split('✓ Lo demás')[0];
  ok('lo importante va primero: lo urgente, lo que necesita tu decisión y lo que la IA vio importante (aunque ya se contestó)', /Importante:/.test(imp) && /Pepe.*⚠️/.test(imp) && /Doña Mary/.test(imp) && /Rosa/.test(imp), r);
  ok('lo demás va abajo, con lo que dijeron y lo que contesté', /Lo demás:\n· Ana: «hola, tienen termos\?» → «Hola, sí tenemos/.test(r), r);
  r = await dice('resumen');
  ok('si lo vuelve a pedir, sólo lo nuevo desde la última vez', /no te ha llegado nada nuevo/.test(r), r);
  r = await dice('resumen de hoy');
  ok('«resumen de hoy» vuelve a contar desde la medianoche', /4 mensaje\(s\)/.test(r) && /desde las 00:00/.test(r), r);
  r = await dice('resumen a las 22:00');
  ok('«resumen a las 22:00» sigue siendo cambiar la hora del resumen, no pedirlo', !/Lo que te llegó/.test(r), r);
  /* notas de voz */
  const b = (t) => Buffer.from(t).toString('base64');
  await llega5(BETO, 'Beto', '[nota de voz]', { audio: { b64: b('oye, a qué hora abren mañana?'), mime: 'audio/ogg; codecs=opus' } });
  ok('una nota de voz que le mandan se oye y se escribe con 🎤', (s5.estado.historial[BETO] || []).some(x => x.texto === '🎤 oye, a qué hora abren mañana?'), s5.estado.historial[BETO]);
  ok('y se contesta como cualquier mensaje', env3.some(e => e.jid === BETO && /Asistente de Carlos/.test(e.texto)));
  oirFalla = true; await llega5(LALO, 'Lalo', '[nota de voz]', { audio: { b64: b('x'), mime: 'audio/ogg' } }); oirFalla = false;
  ok('si no la pudo oír, queda como [nota de voz] y no truena', (s5.estado.historial[LALO] || []).some(x => x.texto === '[nota de voz]'));
  const o0 = oidos; await s5.alMensaje({ id: 'mio1', chat: ANA, de: YO, texto: '[nota de voz]', mio: true, t: ahora, audio: { b64: b('te llamo'), mime: 'audio/ogg' } });
  ok('las notas de voz que Carlos manda en otros chats no se mandan a oír (no hace falta)', oidos === o0);
  await s5.alMensaje({ id: 'yo1', chat: YO, de: YO, texto: '[nota de voz]', mio: true, t: ahora, audio: { b64: b('pendientes'), mime: 'audio/ogg' } });
  ok('Carlos le puede dar órdenes por nota de voz en su chat', /Pendientes|No tienes pendientes/.test((env3.filter(e => e.jid === YO).slice(-1)[0] || {}).texto), env3.slice(-1));
  /* mandar audios */
  r = await dice('audio Ana: ya voy para allá');
  const au = env3.filter(e => e.jid === ANA && e.texto === '[audio]');
  ok('«audio Ana: …» le manda una nota de voz a Ana', au.length === 1 && /ya voy para allá/.test(au[0].ogg.toString()) && /🎤 Listo, le mandé el audio a Ana \(3 s\)/.test(r), r);
  ok('y en su historial queda como 🎤 lo que dijo', (s5.estado.historial[ANA] || []).some(x => x.texto === '🎤 ya voy para allá'));
  r = await dice('audio Fulanito: hola');
  ok('a quien no conoce no le manda nada', /No tengo a «Fulanito»/.test(r));
  vozFalla = true; r = await dice('audio Ana: otra cosa'); vozFalla = false;
  ok('si la voz falla, lo dice (y no manda nada)', /No pude mandarle el audio/.test(r) && env3.filter(e => e.jid === ANA && e.texto === '[audio]').length === 1, r);
  s5.config.chats[BETO].modo = 'borrador';
  await llega5(BETO, 'Beto', 'y tienen envíos?');
  const pb = s5.estado.propuestas.find(p => p.chat === BETO);
  r = await dice(`${pb.n} audio`);
  ok('«3 audio» manda la propuesta en nota de voz', env3.some(e => e.jid === BETO && e.texto === '[audio]') && /en audio/.test(r) && !s5.estado.propuestas.some(p => p.n === pb.n), r);
  const a0 = env3.filter(e => e.jid === YO && e.texto === '[audio]').length;
  await s5.orden('pendientes en audio');
  ok('«pendientes en audio» se lo escribe y además se lo dice en audio', env3.filter(e => e.jid === YO && e.texto === '[audio]').length === a0 + 1 && /Pendientes|No tienes/.test(env3.filter(e => e.jid === YO && e.texto !== '[audio]').slice(-1)[0].texto));
  ok('el audio se dice sin emojis ni signos raros', !/[🎉📌#«»]/u.test(env3.filter(e => e.jid === YO && e.texto === '[audio]').slice(-1)[0].ogg.toString()));
  /* llamadas */
  r = await dice('llámame si es urgente');
  ok('«llámame si es urgente» lo prende y, sin cuenta de llamadas, dice qué falta', s5.config.llamar.activo && /TWILIO_ACCOUNT_SID/.test(r), r);
  await llega5(PEPE, 'Pepe', 'urgente, contesta por favor');
  ok('sin cuenta de llamadas no intenta llamar', !llamadas.length);
  listas = true; pasar(60);
  await llega5(PEPE, 'Pepe', 'es urgente!! estoy en el hospital');
  ok('con todo listo, algo urgente → le llama, y la voz dice quién y qué', llamadas.length === 1 && /Pepe/.test(llamadas[0].texto) && /hospital/.test(llamadas[0].texto) && llamadas[0].a === YO.split('@')[0], llamadas);
  ok('y le avisa por escrito que le llamó', /📞 Te llamé/.test(env3.filter(e => e.jid === YO).slice(-1)[0].texto) || env3.some(e => /📞 Te llamé/.test(e.texto)));
  pasar(300); await llega5(MARY, 'Doña Mary', 'urgente, ya llegué');
  ok('no más de una llamada cada 20 minutos', llamadas.length === 1);
  ahora = Date.UTC(2026, 9, 21, 9, 0);   /* 3:00 de la mañana en México */
  await llega5(PEPE, 'Pepe', 'urgente otra vez');
  ok('de madrugada no llama', llamadas.length === 1);
  ahora = Date.UTC(2026, 9, 21, 16, 0);
  await llega5(ANA, 'Ana', 'hola, otra pregunta');
  ok('lo que no es urgente no le llama', llamadas.length === 1);
  r = await dice('llámame si es urgente al 442 111 2233');
  ok('se le puede dar otro número', s5.config.llamar.tel === '4421112233' && /4421112233/.test(r), r);
  r = await dice('llámame');
  ok('«llámame» hace una llamada de prueba', llamadas.length === 2 && llamadas[1].a === '4421112233' && /Ya te estoy llamando/.test(r));
  r = await dice('no me llames');
  ok('«no me llames» lo apaga', !s5.config.llamar.activo);
  pasar(3600); await llega5(PEPE, 'Pepe', 'urgente urgente');
  ok('y apagado, ya no llama', llamadas.length === 2);
  ok('nada le llegó a nadie sin que Carlos lo pidiera (sólo respuestas en automático y los audios que ordenó)', env3.filter(e => e.texto === '[audio]' && e.jid !== YO).every(e => [ANA, BETO].includes(e.jid)));

  console.log('\n12b · La llamada por dentro (llamada.mjs) y la nota de voz (audio.mjs)');
  const L = await import('./llamada.mjs');
  ok('un número de WhatsApp se vuelve número de teléfono (sin el 1 de WhatsApp)', L.aTelefono('5214421234567') === '+524421234567' && L.aTelefono('4421234567') === '+524421234567' && L.aTelefono('12') === '');
  ok('lo que dice la llamada no rompe el TwiML (se escapan < & ")', /&lt;b&gt; &amp; &quot;/.test(L.twimlDe('<b> & "')) && /es-MX/.test(L.twimlDe('x')));
  ok('sin cuenta dice exactamente qué variables faltan', /TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM/.test((await L.llamar({ a: '4421234567', texto: 'x' }, {})).error));
  const vistas = [];
  const env = { TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM: '+15550001111' };
  const rr = await L.llamar({ a: '5214421234567', texto: 'Hola' }, env, async (url, op) => { vistas.push({ url, op }); return new Response(JSON.stringify({ sid: 'CA1' }), { status: 201 }); });
  const q = new URLSearchParams(vistas[0].op.body);
  ok('llama a Twilio con su cuenta, a su número y con lo que tiene que decir', rr.bien && rr.id === 'CA1' && /Accounts\/AC123\/Calls\.json$/.test(vistas[0].url) && q.get('To') === '+524421234567' && q.get('From') === '+15550001111' && /Hola/.test(q.get('Twiml')) && vistas[0].op.headers.authorization === 'Basic ' + Buffer.from('AC123:tok').toString('base64'));
  ok('si Twilio rechaza la cuenta, lo dice en cristiano', /rechazó la cuenta/.test((await L.llamar({ a: '4421234567', texto: 'x' }, env, async () => new Response('{}', { status: 401 }))).error));
  try{
    const A = await import('./audio.mjs');
    const pcm = Buffer.alloc(48000); for(let i = 0; i < 24000; i++) pcm.writeInt16LE(Math.round(6000 * Math.sin(i / 24000 * 2 * Math.PI * 330)), i * 2);
    const ogg = await A.aNotaDeVoz(pcm.toString('base64'), 'audio/L16;codec=pcm;rate=24000');
    ok('la voz de la IA (PCM 24 kHz) sale como nota de voz OGG/Opus, con su duración', ogg.toString('ascii', 0, 4) === 'OggS' && A.segundosOgg(ogg) === 1 && ogg.includes(Buffer.from('OpusHead')));
  }catch(e){ ok('la conversión a nota de voz corre', false, e.message); }
}

console.log('\n14 · Mensajes programados, banco de imágenes y fotos (Carlos, 16 de octubre)');
{
  ok('«lunes a viernes», «diario», «fines de semana», «lunes, miércoles y viernes», «martes a jueves»',
    diasDe('lunes a viernes').join() === '1,2,3,4,5' && diasDe('diario').length === 7 && diasDe('').length === 7 && diasDe('fines de semana').join() === '0,6' && diasDe('lunes, miércoles y viernes').join() === '1,3,5' && diasDe('martes a jueves').join() === '2,3,4' && diasDe('viernes a lunes').join() === '0,1,5,6');
  ok('horas como las escribe una persona', horaDe('7') === '07:00' && horaDe('7:50') === '07:50' && horaDe('7pm') === '19:00' && horaDe('12 am') === '00:00' && horaDe('25') === '' && horaDe('hola') === '');
  ok('los días se leen en cristiano', textoDias([1, 2, 3, 4, 5]) === 'de lunes a viernes' && textoDias([]) === 'diario' && textoDias([1, 3]) === 'los lunes, miércoles');

  /* lunes 19 de octubre de 2026, 6:55 en México */
  ahora = Date.UTC(2026, 9, 19, 12, 55);
  ok('el 19 de octubre de 2026 es lunes en México', diaMx(ahora) === 1);
  const env4 = []; let n4 = 1;
  const t4 = {
    yo: () => [YO], otrosYo: () => [],
    async enviar(jid, texto){ const id = 'W' + (n4++); env4.push({ jid, texto, id }); return id; },
    async enviarImagen(jid, buf, mime, pie){ const id = 'W' + (n4++); env4.push({ jid, texto: '[foto]', buf: buf.toString(), mime, pie, id }); return id; },
    async enviarAudio(){ return 'W' + (n4++); }, async escribiendo(){}, async leido(){}, async grabando(){},
  };
  const FICHAS = [
    { id: 'f1', nombre: 'IMG_001.jpg', titulo: 'Sudadera Nike gris', descripcion: 'Talla M y L, original', carpeta: "All's fashion", palabras: ['sudadera', 'nike'], temas: ['ropa'], estado: 'lista', creado: 1 },
    { id: 'f2', nombre: 'termo_stanley.jpg', titulo: '', descripcion: 'Termo Stanley 1.2 L', carpeta: "All's fashion", palabras: ['termo'], temas: [], estado: 'lista', creado: 2 },
    { id: 'f3', nombre: 'bolsa.jpg', titulo: 'Bolsa Michael Kors', descripcion: '', carpeta: "All's fashion", palabras: ['bolsa'], temas: ['bolsas'], estado: 'sin-revisar', creado: 3 },
    { id: 'f4', nombre: 'tenis.jpg', titulo: 'Tenis Nike rojos', descripcion: '', carpeta: "All's fashion", palabras: ['tenis'], temas: [], estado: 'lista', creado: 4 },
    { id: 'f5', nombre: 'sudadera_rota.jpg', titulo: 'Sudadera Adidas', descripcion: '', carpeta: "All's fashion", palabras: ['sudadera'], temas: [], estado: 'cambios', creado: 5 },
    { id: 'k9', nombre: 'perro.png', titulo: 'Perro de rescate', descripcion: 'K-9', carpeta: 'Cursos', palabras: ['perro'], temas: [], estado: 'lista', creado: 6 },
  ];
  let bancoFalla = false;
  const banco = { listo: () => true, async fichas(){ if(bancoFalla) throw new Error('sin red'); return FICHAS; }, async bajar(id){ return { buf: Buffer.from('JPG-' + id), mime: 'image/jpeg' }; } };
  let vioFotos = null, escribio = [];
  const ia4 = { ...ia,
    async leer(x){
      vioFotos = x.fotos;
      const t = x.nuevos.map(y => y.texto).join(' ');
      if(x.fotos && x.fotos.length && /sudadera|termo/i.test(t)) return { pendientes: [], respuesta: 'mira, este es', motivo: '', urgente: false, fotos: [1] };
      return ia.leer(x);
    },
    async escribir({ tema }){ escribio.push(tema); return /clase/.test(tema) ? 'ya casi toca mate eh' : 'llegaron cositas nuevas 🔥'; },
  };
  const alm4 = (() => { const d = {}; return { leer: (k, x) => d[k] ? JSON.parse(d[k]) : x, guardar: (k, v) => { d[k] = JSON.stringify(v); } }; })();
  let giro = 0;   /* un azar que se mueve: con uno fijo siempre se escogen las mismas posiciones */
  const s6 = new Secre({ cuenta: 'B', transporte: t4, ia: ia4, almacen: alm4, reloj, azar: () => (giro = (giro + 0.37) % 1), banco });
  const TAREAS = '120363111111@g.us', ALLS = '120363222222@g.us';
  for(const [j, n] of [[TAREAS, 'Tareas 3.1'], [ALLS, "All's fashion clientas"]]){ s6.chat(j).nombre = n; s6.chat(j).grupo = true; }
  s6.chat(ANA).nombre = 'Ana';
  const dice6 = async (t) => { await s6.orden(t); return (env4.filter(e => e.jid === YO).slice(-1)[0] || {}).texto || ''; };
  const aTareas = () => env4.filter(e => e.jid === TAREAS);

  let r = await dice6('programa Tareas 7:00 lunes a viernes: 📚 Ahorita toca Matemáticas');
  ok('«programa Tareas 7:00 lunes a viernes: …» lo deja programado', (s6.config.programados || []).length === 1 && s6.config.programados[0].hora === '07:00' && s6.config.programados[0].dias.join() === '1,2,3,4,5' && /Tareas 3\.1 a las 07:00 de lunes a viernes/.test(r), r);
  s6.aplicar({ accion: 'programar', chat: 'Tareas', hora: '7:50', dias: [1, 2, 3, 4, 5], texto: '📚 Ahorita toca Física' });
  s6.aplicar({ accion: 'programar', chat: 'Ana', hora: '21:00', dias: 'diario', tema: 'recordarle que mañana hay clase de mate' });
  ok('la IA también los arma (uno por clase, o con un tema que escribe cada vez)', s6.config.programados.length === 3);
  await s6.tic();
  ok('antes de la hora no sale nada', !aTareas().length);
  pasar(6 * 60); await s6.tic();
  ok('a las 7:01 sale solo en el grupo, con su firma', aTareas().length === 1 && /Asistente de Carlos: 📚 Ahorita toca Matemáticas/.test(aTareas()[0].texto), aTareas());
  pasar(120); await s6.tic();
  ok('y no se repite ese día', aTareas().length === 1);
  pasar(50 * 60); await s6.tic();
  ok('a las 7:51 sale el de Física', aTareas().length === 2 && /Física/.test(aTareas()[1].texto));
  ahora = Date.UTC(2026, 9, 20, 13, 30); await s6.tic();   /* martes 7:30 */
  ok('si Secre estuvo dormida y ya pasaron 30 min, no lo manda tarde', aTareas().filter(e => /Matemáticas/.test(e.texto)).length === 1);
  ahora = Date.UTC(2026, 9, 24, 13, 1); await s6.tic();   /* sábado 7:01 */
  ok('en sábado no sale (es de lunes a viernes)', aTareas().length === 2);
  ahora = Date.UTC(2026, 9, 25, 3, 2); await s6.tic();   /* sábado 21:02 */
  ok('el programado «sobre un tema» lo escribe la IA cada vez', env4.some(e => e.jid === ANA && /ya casi toca mate/.test(e.texto)) && /mate/.test(escribio.slice(-1)[0]), env4.filter(e => e.jid === ANA));
  r = await dice6('programados');
  ok('«programados» los enseña con número', /1\. Tareas 3\.1 · 07:00 de lunes a viernes/.test(r) && /3\. Ana · 21:00 diario: sobre/.test(r), r);
  r = await dice6('quita programado 2');
  ok('«quita programado 2» lo quita', s6.config.programados.length === 2 && !s6.config.programados.some(p => /Física/.test(p.texto)), r);

  /* publicaciones del banco */
  ahora = Date.UTC(2026, 9, 26, 15, 55);   /* lunes 9:55 */
  const h = s6.aplicar({ accion: 'publicar', chat: "All's fashion clientas", carpeta: "All's fashion", cuantas: 2, hora: '10:00', dias: [] });
  ok('«publica en All\'s 2 fotos de la carpeta All\'s fashion diario a las 10» queda programado', /2 foto\(s\) de «All's fashion»/.test(h), h);
  pasar(6 * 60); await s6.tic();
  const dia1 = env4.filter(e => e.jid === ALLS && e.texto === '[foto]');
  ok('a las 10 publica 2 fotos con su nombre en el pie', dia1.length === 2 && dia1.every(e => /^\*.+\*/.test(e.pie)), dia1.map(e => e.pie));
  ok('antes, un textito como persona', env4.some(e => e.jid === ALLS && /llegaron cositas/.test(e.texto)));
  ok('nunca publica una foto marcada «requiere cambios»', !dia1.some(e => /Adidas/.test(e.pie)));
  ok('si la foto no tiene título, usa el nombre del archivo limpio', FICHAS.length && dia1.concat().every(e => !/\.jpg/.test(e.pie)));
  ahora += 24 * 3600_000; await s6.tic();
  const dia2 = env4.filter(e => e.jid === ALLS && e.texto === '[foto]').slice(2);
  ok('al día siguiente, otras fotos (no repite hasta que se acaben)', dia2.length === 2 && !dia2.some(e => dia1.some(d => d.pie === e.pie)), [dia1.map(e => e.pie), dia2.map(e => e.pie)]);
  r = await dice6("publica ahora en All's");
  ok('«publica ahora en All\'s» publica en el momento', /publiqué 2 foto/.test(r), r);
  for(let k = 0; k < 4; k++) await s6.orden("publica ahora en All's");
  ok('en ninguna publicación sale una foto marcada «requiere cambios» (ni al volver a empezar)', !env4.some(e => e.jid === ALLS && /Adidas/.test(e.pie || '')) && env4.filter(e => e.jid === ALLS && e.texto === '[foto]').length >= 14);

  /* contestar con fotos */
  const aAna = () => env4.filter(e => e.jid === ANA);
  await s6.alMensaje({ id: 'q1', chat: ANA, de: ANA, nombre: 'Ana', texto: 'oye tienes sudaderas?', mio: false, t: ahora }); pasar(7); await s6.tic();
  ok('le preguntan por algo del banco → la IA ve las fotos que van con eso', vioFotos && vioFotos.length >= 1 && /Sudadera Nike/.test(vioFotos[0].nombre) && !vioFotos.some(f => /Adidas|Perro/.test(f.nombre)), vioFotos);
  ok('y contesta con texto y la foto', aAna().slice(-2)[0] && /mira, este es/.test(aAna().slice(-2)[0].texto) && aAna().slice(-1)[0].texto === '[foto]' && /Sudadera Nike gris/.test(aAna().slice(-1)[0].pie), aAna().slice(-2));
  await s6.alMensaje({ id: 'q2', chat: TAREAS, de: BETO, nombre: 'Beto', nombreChat: 'Tareas 3.1', texto: 'alguien tiene sudaderas? jaja', mio: false, grupo: true, t: ahora }); pasar(30); await s6.tic();
  ok('en un grupo no busca fotos si no se lo pidieron', !vioFotos || !vioFotos.length);
  r = await dice6('sin fotos Ana');
  await s6.alMensaje({ id: 'q3', chat: ANA, de: ANA, nombre: 'Ana', texto: 'y termos?', mio: false, t: ahora }); pasar(7); await s6.tic();
  ok('«sin fotos Ana» y ya no le manda fotos', !vioFotos.length && aAna().slice(-1)[0].texto !== '[foto]');
  await dice6('fotos Ana');
  bancoFalla = true;
  await s6.alMensaje({ id: 'q4', chat: ANA, de: ANA, nombre: 'Ana', texto: 'tienes termos?', mio: false, t: ahora }); pasar(7); await s6.tic();
  bancoFalla = false;
  ok('si el banco no contesta, igual le contesta (sin fotos)', aAna().slice(-1)[0].texto !== '[foto]' && /Asistente de Carlos/.test(aAna().slice(-1)[0].texto));
  /* a pedido de Carlos */
  const f0 = env4.filter(e => e.jid === YO && e.texto === '[foto]').length;
  r = await dice6('fotos de termos');
  ok('«fotos de termos» se las manda a él', env4.filter(e => e.jid === YO && e.texto === '[foto]').length === f0 + 1 && /Termo Stanley/.test(env4.filter(e => e.jid === YO && e.texto === '[foto]').slice(-1)[0].pie), r);
  r = await dice6('mándale a Ana 2 fotos de nike');
  ok('«mándale a Ana 2 fotos de nike» se las manda a Ana', /le mandé 2 foto/.test(r) && aAna().slice(-2).every(e => e.texto === '[foto]'), r);
  r = await dice6('fotos de unicornios');
  ok('si no hay, lo dice', /No encontré fotos de «unicornios»/.test(r), r);
  /* en una propuesta: las fotos salen cuando Carlos la aprueba */
  s6.chat(LALO).nombre = 'Lalo'; s6.chat(LALO).modo = 'borrador';
  await s6.alMensaje({ id: 'q5', chat: LALO, de: LALO, nombre: 'Lalo', texto: 'tienes sudaderas?', mio: false, t: ahora }); pasar(50); await s6.tic();
  const pl = s6.estado.propuestas.find(x => x.chat === LALO);
  ok('la propuesta dice qué foto llevaría', pl && pl.fotos && pl.fotos[0] === 'f1' && /📷 \+ 1 foto\(s\): Sudadera Nike gris/.test(env4.filter(e => e.jid === YO).slice(-1)[0].texto), env4.filter(e => e.jid === YO).slice(-1));
  ok('y hasta que la aprueba no se le manda nada a Lalo', !env4.some(e => e.jid === LALO));
  r = await dice6(String(pl.n));
  ok('al aprobarla salen el texto y la foto', env4.filter(e => e.jid === LALO).length === 2 && env4.filter(e => e.jid === LALO)[1].texto === '[foto]' && /y 1 foto/.test(r), r);
}

console.log('\n15 · El elenco del rol: Paulina como Astrael y Negro como Nox Veyr (Carlos, 16 de octubre)');
{
  ahora = Date.UTC(2026, 9, 27, 2, 0);   /* lunes 26, 20:00 en México */
  const env5 = []; let n5 = 1;
  /* mandar tarda: el reloj avanza con cada envío (con el reloj quieto, «lo nuevo desde mi
     última jugada» nunca incluía la de la otra y dos frenos quedaban sin probar) */
  const t5 = { yo: () => [YO], otrosYo: () => [], async enviar(jid, texto){ pasar(1); const id = 'E' + (n5++); env5.push({ jid, texto, id }); return id; }, async escribiendo(){}, async leido(){} };
  const jugadas = [];
  const ia5 = { ...ia,
    async jugarElenco(x){
      jugadas.push(x);
      if(/fuera de rol/i.test(x.nuevos)) return { lineas: [] };
      return x.quien === 'Paulina' ? { lineas: [{ tipo: 'dice', texto: 'Esto ya lo vi pasar.' }, { tipo: 'hace', texto: 'Astrael dobla la gravedad del cuarto' }] }
        : { lineas: [{ tipo: 'dice', texto: '💫⏳- No confíes en las sombras.' }, { tipo: 'hace', texto: '> abre un portal y desaparece' }] };
    },
  };
  const alm5 = (() => { const d = {}; return { leer: (k, x) => d[k] ? JSON.parse(d[k]) : x, guardar: (k, v) => { d[k] = JSON.stringify(v); } }; })();
  const s7 = new Secre({ cuenta: 'E', transporte: t5, ia: ia5, almacen: alm5, reloj, azar: () => 0.4, banco: null });
  const TAB = '120363555555@g.us', OTRO = '120363666666@g.us';
  for(const [j, n] of [[TAB, 'Taberna'], [OTRO, 'Grupo de la escuela']]){ s7.chat(j).nombre = n; s7.chat(j).grupo = true; }
  const dice7 = async (t) => { await s7.orden(t); return (env5.filter(e => e.jid === YO).slice(-1)[0] || {}).texto || ''; };
  const enTab = () => env5.filter(e => e.jid === TAB);
  const llega7 = async (jid, quien, texto, extra = {}) => { await s7.alMensaje({ id: 'r' + (n5++), chat: jid, de: ANA, nombre: quien, nombreChat: s7.nombreDe(jid), texto, mio: false, grupo: true, t: ahora, ...extra }); };
  const correr = async (seg) => { for(let k = 0; k < seg; k += 2){ pasar(2); await s7.tic(); } };

  ok('Paulina y Negro ya traen sus personajes: Astrael y Nox Veyr', s7.config.personajes.Paulina.nombre === 'Astrael' && s7.config.personajes.Negro.nombre === 'Nox Veyr' && /gravitacional/.test(s7.config.personajes.Paulina.ficha) && /no proyecta sombra/i.test(s7.config.personajes.Negro.ficha));
  let r = await dice7('Paulina y Negro juegan en Taberna');
  ok('«Paulina y Negro juegan en Taberna» las mete al grupo', s7.elencoDe(TAB).join() === 'Paulina,Negro' && /Paulina como Astrael/.test(r) && /Negro como Nox Veyr/.test(r), r);
  await llega7(TAB, 'Lyra', '*Lyra entra a la taberna y mira alrededor*');
  await correr(20);
  ok('cuando alguien juega, cada una contesta APARTE, con su personaje', enTab().length === 2, enTab());
  const de = (marca) => enTab().find(e => e.texto.startsWith(marca));
  ok('Astrael sale con su marca y lo que hace con «> »', de('💫⏳-') && de('💫⏳-').texto === '💫⏳- Esto ya lo vi pasar.\n> Astrael dobla la gravedad del cuarto', enTab().map(e => e.texto));
  ok('Nox Veyr con la suya: si la IA le pone la marca de Astrael o un «>» de más, se lo quita', de('🌑🌀-') && de('🌑🌀-').texto === '🌑🌀- No confíes en las sombras.\n> abre un portal y desaparece', enTab().map(e => e.texto));
  ok('cada una juega con SU ficha y sabe quiénes son los otros (no decide por ellos)', jugadas.some(x => x.quien === 'Paulina' && x.personaje === 'Astrael' && x.otros.includes('Nox Veyr')) && jugadas.some(x => x.quien === 'Negro' && x.personaje === 'Nox Veyr' && x.otros.includes('Astrael')), jugadas.map(x => [x.quien, x.otros]));
  ok('la segunda que juega ya vio la jugada de la primera', /Astrael: |Nox Veyr: /.test(jugadas[1].nuevos + jugadas[1].historia), jugadas[1] && jugadas[1].nuevos);
  const j0 = jugadas.length;
  await correr(120);
  ok('entre ellas no se encadenan: sin una persona de por medio, no vuelven a jugar', jugadas.length === j0 && enTab().length === 2);
  await s7.jugarElenco(TAB);
  ok('aunque algo las despertara, sin una persona nueva no juegan sobre lo que dijo la otra ni sobre lo suyo', jugadas.length === j0 && enTab().length === 2, jugadas.slice(j0).map(x => [x.quien, x.nuevos]));
  /* Carlos juega a mano: su personaje no lo lleva Secre, pero ellas siguen */
  await s7.alMensaje({ id: 'c7', chat: TAB, de: YO, texto: '🌌⚛️- ¿Quién anda ahí?', mio: true, grupo: true, t: ahora });
  await correr(20);
  ok('aunque tú estés jugando, ellas juegan (son otros personajes)', enTab().length === 4, enTab().length);
  ok('y lo que tú escribiste les llega como tu jugada', jugadas.slice(-2).every(x => /Carlos: 🌌⚛️- ¿Quién anda ahí\?/.test(x.nuevos)));
  await llega7(TAB, 'Lyra', 'jaja ya me voy a dormir, fuera de rol');
  await correr(80);
  ok('si no les toca (plática fuera del rol), se callan', enTab().length === 4);
  /* una jugada por minuto cada una */
  await llega7(TAB, 'Lyra', '*Lyra regresa*'); await correr(12);
  const k1 = enTab().length;
  await llega7(TAB, 'Lyra', '*Lyra saca su daga*'); await correr(12);
  ok('no juegan más de una vez por minuto cada una (no inundan el grupo)', enTab().length === k1, [k1, enTab().length]);
  r = await dice7('saca a Negro de Taberna');
  ok('«saca a Negro de Taberna» deja sólo a Paulina', s7.elencoDe(TAB).join() === 'Paulina' && /sólo|Paulina como Astrael/.test(r), r);
  await correr(70);
  await llega7(TAB, 'Lyra', '*Lyra corre*'); await correr(20);
  const ult = enTab().slice(k1);
  ok('y ya sólo juega Astrael', ult.length >= 1 && ult.every(e => e.texto.startsWith('💫⏳-')), ult.map(e => e.texto));
  await llega7(OTRO, 'Beto', 'oigan mañana hay examen?'); await correr(20);
  ok('en un grupo donde no las metiste, no juegan', !env5.some(e => e.jid === OTRO));
  /* la ficha se cambia pegándola tal cual (con los ╔══ y el «Olvidar» que se cuela al copiar) */
  r = await dice7('personaje de Paulina: ╔══ PERSONAJE Paulina ══╗ Nombre: Selene Edad: 19 años. Habilidades: luz. Olvidar');
  ok('«personaje de Paulina: …» toma el nombre de la ficha y limpia lo que se cuela al copiar', s7.config.personajes.Paulina.nombre === 'Selene' && !/╔|Olvidar/.test(s7.config.personajes.Paulina.ficha) && /Selene/.test(r), s7.config.personajes.Paulina);
  r = await dice7('marca de Negro: 🌑-');
  ok('«marca de Negro: …» le cambia la marca', s7.config.personajes.Negro.marca === '🌑-');
  /* por comunidad: todos sus grupos */
  const COM = '120363000000000077@g.us';
  s7.chat(OTRO).comunidad = COM;
  s7.ponerComunidad({ id: COM, nombre: 'Reino', grupos: [OTRO], activos: [], elenco: ['Negro'] });
  ok('en la comunidad de rol se prenden para todos sus grupos', s7.elencoDe(OTRO).join() === 'Negro');
  ok('la ayuda lo explica', /Paulina y Negro juegan en Taberna/.test((await import('./nucleo.mjs')).AYUDA));
}

console.log('\n13 · El puente de correr.mjs pasa TODO lo que el núcleo le pide al WhatsApp');
{
  /* ya pasó dos veces: los stickers (enviarSticker) y casi las notas de voz. El núcleo
     pregunta si existe la función y, si no, se calla: ninguna prueba del núcleo lo ve */
  const fs = await import('fs');
  const nucleo = fs.readFileSync(new URL('./nucleo.mjs', import.meta.url), 'utf8');
  const correr = fs.readFileSync(new URL('./correr.mjs', import.meta.url), 'utf8');
  const puente = (/const puente = \{([\s\S]*?)\};/.exec(correr) || [])[1] || '';
  const usa = [...new Set([...nucleo.matchAll(/this\.transporte\.(\w+)/g)].map(m => m[1]))];
  const faltan = usa.filter(f => !new RegExp('\\b' + f + '\\s*:').test(puente));
  ok(`el puente trae las ${usa.length} funciones que usa el núcleo`, usa.length > 5 && !faltan.length, faltan);
}

console.log(fallas.length ? `\n✗ ${pasan} pasan · ${fallas.length} fallan` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
