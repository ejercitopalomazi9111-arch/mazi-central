/* Pruebas de Estudio: el servidor (atenderEstudio con un almacén en memoria)
   y la pantalla en un navegador de verdad a 390×844, con una IA de mentiras.
   node sala/pruebas-estudio.mjs            (todo)
   SOLO=servidor node sala/pruebas-estudio.mjs */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { atenderEstudio, semanaDe, avanzarRacha, juntarProgreso, diaMexico } from './servidor/estudio.js';

let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

function almacen(){
  const m = new Map();
  return {
    m,
    async get(k){ if(Array.isArray(k)){ const r = new Map(); for(const x of k) if(m.has(x)) r.set(x, structuredClone(m.get(x))); return r; } return structuredClone(m.get(k)); },
    async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k){ for(const x of [].concat(k)) m.delete(x); },
    async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); },
  };
}
const pedido = (metodo, q = '', cuerpo) => [new Request('http://x/api/sala/G/estudio' + q, { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined }), new URL('http://x/api/sala/G/estudio' + q)];
const MEDIODIA = (dia) => Date.parse(dia + 'T18:00:00Z');      /* mediodía en México */
const llamar = async (s, cuenta, metodo, q, cuerpo, dia = '2026-11-12') => (await atenderEstudio(s, ...pedido(metodo, q, cuerpo), cuenta, MEDIODIA(dia))).json();

console.log('El servidor');
{
  ok(semanaDe('2026-11-12') === '2026-S46' && semanaDe('2027-01-03') === '2026-S53' && semanaDe('2026-11-16') === '2026-S47', 'la semana es la ISO (empieza en lunes)');
  ok(diaMexico(Date.UTC(2026, 10, 13, 3)) === '2026-11-12', 'a las 9 de la noche en México todavía es el mismo día');

  const p = { racha: 0, mejorRacha: 0, ultimoDia: '', congeladas: 0 };
  avanzarRacha(p, '2026-11-01'); avanzarRacha(p, '2026-11-01');
  ok(p.racha === 1, 'estudiar dos veces el mismo día no sube la racha dos veces');
  for(let d = 2; d <= 7; d++) avanzarRacha(p, `2026-11-0${d}`);
  ok(p.racha === 7 && p.congeladas === 1, 'siete días seguidos dan racha 7 y una racha congelada');
  const ev = avanzarRacha(p, '2026-11-09');
  ok(p.racha === 8 && p.congeladas === 0 && ev.includes('congelada-usada'), 'saltarse UN día gasta la congelada y la racha sigue');
  const ev2 = avanzarRacha(p, '2026-11-12');
  ok(p.racha === 1 && ev2.includes('racha-perdida') && p.mejorRacha === 8, 'sin congelada se pierde, pero la mejor racha se recuerda');
  avanzarRacha(p, '2026-11-10');
  ok(p.racha === 1 && p.ultimoDia === '2026-11-12', 'un evento atrasado (día viejo) no mueve la racha');

  const j = juntarProgreso({ a: { hecho: true, mejor: 80 }, b: { hecho: false, mejor: 10 } }, { a: { hecho: false, mejor: 60 }, b: { hecho: true, mejor: 90 }, c: { hecho: true } });
  ok(j.a.hecho && j.a.mejor === 80 && j.b.hecho && j.b.mejor === 90 && j.c.hecho, 'el progreso de dos teléfonos se junta: lo hecho se queda hecho');

  const s = almacen();
  let r = await llamar(s, 'carlos', 'GET', '');
  ok(r.bien && r.perfil.xp === 0 && r.perfil.nombre === 'Carlos' && r.ranking.filas.length === 0 && r.hoy === '2026-11-12', 'perfil nuevo vacío y ranking vacío');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'xp', id: 'e1', xp: 15, dia: '2026-11-12' });
  ok(r.sumado === 15 && r.perfil.xp === 15 && r.perfil.racha === 1 && r.eventos.includes('racha'), 'suma XP y prende la racha');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'xp', id: 'e1', xp: 15, dia: '2026-11-12' });
  ok(r.sumado === 0 && r.perfil.xp === 15, 'el mismo evento reintentado no suma dos veces');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'xp', eventos: [{ id: 'e2', xp: 20 }, { id: 'e3', xp: 99999 }, { id: '../x', xp: 5 }, { id: 'e4', xp: -5 }] });
  ok(r.sumado === 20 && r.perfil.xp === 35, 'XP absurdo, negativo o con id raro se ignora');
  r = await llamar(s, 'luis', 'POST', '', { accion: 'xp', id: 'l1', xp: 50 });
  ok(r.ranking.filas[0].cuenta === 'luis' && r.ranking.filas[1].cuenta === 'carlos', 'el ranking de la semana ordena por XP y junta las cuentas');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'xp', id: 'e5', xp: 10, dia: '2030-01-01' });
  ok(r.perfil.ultimoDia === '2026-11-12' && r.perfil.racha === 1, 'un reloj de teléfono mal puesto no regala días');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'xp', id: 'e6', xp: 10, dia: '2026-11-13' }, '2026-11-13');
  ok(r.perfil.racha === 2, 'al día siguiente la racha sube a 2');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'xp', id: 'e7', xp: 10, dia: '2026-11-16' }, '2026-11-16');
  ok(r.ranking.semana === '2026-S47' && r.ranking.filas.length === 1 && r.ranking.filas[0].xp === 10, 'el lunes empieza un ranking nuevo');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'perfil', nombre: 'Palomazi', horario: { lunes: [] } }, '2026-11-16');
  ok(r.perfil.nombre === 'Palomazi' && r.perfil.horario.lunes, 'cambia el nombre y guarda el horario');
  r = await llamar(s, 'carlos', 'GET', '', null, '2026-11-16');
  ok(r.ranking.filas[0].nombre === 'Palomazi' && !('ids' in r.perfil), 'el ranking usa el nombre nuevo y el perfil no expone los ids');

  r = await llamar(s, 'carlos', 'POST', '', { accion: 'plan', plan: { id: 'p1', titulo: 'Examen de Biología', materia: 'Biología', fecha: '2026-11-20', camino: [1, 2], progreso: { n1: { hecho: true, mejor: 100 } } } });
  ok(r.bien && r.progreso.n1.hecho, 'guarda un plan');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'plan', plan: { id: 'p1', titulo: 'Examen de Biología', camino: [1, 2, 3], progreso: { n2: { hecho: true } } } });
  ok(r.progreso.n1.hecho && r.progreso.n2.hecho, 'un teléfono atrasado no borra el progreso del otro');
  r = await llamar(s, 'carlos', 'GET', '');
  ok(r.planes.length === 1 && r.planes[0].titulo === 'Examen de Biología', 'el índice lista el plan');
  r = await llamar(s, 'carlos', 'GET', '?plan=p1');
  ok(r.plan.camino.length === 3, 'el plan entero se baja por id');
  r = await llamar(s, 'luis', 'GET', '?plan=p1');
  ok(r.error, 'los planes de otra cuenta no se ven');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'borrarPlan', id: 'p1' });
  ok(r.bien, 'borra un plan');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'plan', plan: { id: 'p1', titulo: 'revive' } });
  ok(r.borrado, 'un teléfono atrasado no revive un plan borrado');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'plan', plan: { id: 'gordo', titulo: 'x', relleno: 'x'.repeat(1_600_000) } });
  ok(r.error && /grande/.test(r.error), 'un plan gigante se rechaza');

  console.log('La biblioteca: lo que la IA ya armó, para el siguiente que lo pida');
  const lec = { leccion: { ideas: ['a'] }, preguntas: [{ tipo: 'opcion' }] };
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'memoria', tipo: 'leccion', materia: 'Historia', titulo: 'Causas de la Revolución Mexicana', nivel: 'prepa' });
  ok(r.bien && r.hallado === null, 'lo que nadie ha pedido no está');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'recordar', tipo: 'leccion', materia: 'Historia', titulo: 'Causas de la Revolución Mexicana', nivel: 'prepa', datos: lec });
  ok(r.bien, 'se guarda la lección que armó la IA');
  r = await llamar(s, 'luis', 'POST', '', { accion: 'memoria', tipo: 'leccion', materia: 'historia', titulo: 'la revolucion mexicana: sus causas', nivel: 'prepa' });
  ok(r.hallado && r.hallado.parecido === 1 && r.hallado.datos.preguntas.length === 1, 'OTRA cuenta la encuentra aunque la escriba distinto (acentos, orden, artículos)');
  r = await llamar(s, 'luis', 'POST', '', { accion: 'memoria', tipo: 'leccion', materia: 'Historia', titulo: 'Causas de la Revolución Mexicana de 1910', nivel: 'prepa' });
  ok(r.hallado && r.hallado.parecido >= .75 && r.hallado.parecido < 1, `un tema casi igual también sale (parecido ${r.hallado && r.hallado.parecido})`);
  r = await llamar(s, 'luis', 'POST', '', { accion: 'memoria', tipo: 'leccion', materia: 'Historia', titulo: 'Consecuencias de la Revolución Mexicana', nivel: 'prepa' });
  ok(r.hallado === null, 'un tema distinto (consecuencias, no causas) NO se confunde');
  r = await llamar(s, 'luis', 'POST', '', { accion: 'memoria', tipo: 'leccion', materia: 'Historia', titulo: 'Causas de la Revolución Mexicana', nivel: 'uni' });
  ok(r.hallado === null, 'otro nivel es otra lección');
  r = await llamar(s, 'luis', 'POST', '', { accion: 'memoria', tipo: 'leccion', materia: 'Química', titulo: 'Causas de la Revolución Mexicana', nivel: 'prepa' });
  ok(r.hallado === null, 'otra materia es otra lección');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'recordar', tipo: 'leccion', materia: 'X', titulo: 'Gorda', datos: { x: 'y'.repeat(130_000) } });
  ok(r.error, 'algo gigante no entra a la biblioteca');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'biblioteca' });
  ok(r.leccion.cuantos === 1 && r.leccion.usos >= 2, `la biblioteca cuenta lo guardado y cuántas veces se reusó (${r.leccion.cuantos}, ${r.leccion.usos})`);

  console.log('Amigos y estudiar juntos');
  const T0 = Date.UTC(2026, 10, 13, 18);
  const pide = (q, c, cuerpo, t = T0) => atenderEstudio(s, new Request('http://x/estudio', { method: 'POST', body: JSON.stringify(cuerpo) }), new URL('http://x/estudio'), q, t).then((x) => x.json().then((j) => ({ ...j, _st: x.status })));
  for(const q of ['ana', 'beto', 'cami']) await pide(q, 0, { accion: 'perfil', nombre: q[0].toUpperCase() + q.slice(1) });
  r = await pide('ana', 0, { accion: 'latido', estado: 'libre' });
  await pide('beto', 0, { accion: 'latido', estado: 'estudiando', materia: 'Química' });
  r = await pide('ana', 0, { accion: 'latido' });
  ok(r.enLinea.some((x) => x.cuenta === 'beto' && x.estado === 'estudiando' && x.materia === 'Química') && !r.enLinea.some((x) => x.cuenta === 'ana'), 'veo quién más tiene la app abierta (y qué estudia), sin verme a mí');
  r = await pide('ana', 0, { accion: 'latido' }, T0 + 60_000);
  ok(!r.enLinea.some((x) => x.cuenta === 'beto'), 'quien cerró la app hace más de 45 s ya no sale en línea');
  r = await pide('ana', 0, { accion: 'amistad', a: 'beto' });
  ok(r.pedida, 'mando solicitud de amistad');
  r = await pide('beto', 0, { accion: 'latido' });
  ok(r.pide.some((x) => x.cuenta === 'ana') && r.buzon.some((m) => m.tipo === 'amistad' && m.de === 'ana'), 'a Beto le llega la solicitud de Ana');
  r = await pide('beto', 0, { accion: 'amistad', a: 'ana' });
  ok(r.amigos, 'al aceptarla ya son amigos');
  r = await pide('ana', 0, { accion: 'latido' });
  ok(r.amigos.some((x) => x.cuenta === 'beto' && x.nombre === 'Beto' && x.enLinea), 'los dos se ven en su lista de amigos, con nombre y si están en línea');
  r = await pide('ana', 0, { accion: 'mandar', a: 'beto', tipo: 'felicita', texto: '¡Bien ahí!' });
  r = await pide('beto', 0, { accion: 'latido', desde: T0 - 1 });
  ok(r.buzon.some((m) => m.tipo === 'felicita' && m.texto === '¡Bien ahí!' && m.nombre === 'Ana'), 'las felicitaciones llegan al buzón');
  r = await pide('ana', 0, { accion: 'amistad', a: 'nadie' });
  ok(r._st === 404, 'no se puede agregar a alguien que no usa CARYMO');
  /* estudiar juntos */
  await pide('beto', 0, { accion: 'latido' });
  r = await pide('ana', 0, { accion: 'invitar', a: 'beto', minutos: 25 });
  ok(r.bien && r.sesion.estado === 'invitada' && r.sesion.minutos === 25, 'invito a Beto a estudiar 25 minutos juntos');
  r = await pide('cami', 0, { accion: 'latido' }); await pide('beto', 0, { accion: 'latido' });
  r = await pide('cami', 0, { accion: 'invitar', a: 'beto', minutos: 10 });
  ok(r._st === 409, 'a quien ya tiene una invitación no le llueven otras');
  r = await pide('beto', 0, { accion: 'latido' });
  ok(r.sesion && r.sesion.estado === 'invitada' && r.buzon.some((m) => m.tipo === 'invita' && m.sesion === r.sesion.id), 'a Beto le llega la invitación');
  r = await pide('beto', 0, { accion: 'responder', si: true }, T0 + 1000);
  ok(r.sesion.estado === 'activa' && r.sesion.fin - r.sesion.inicio === 25 * 60_000, 'al aceptar arranca el cronómetro de 25 minutos para los dos');
  await pide('ana', 0, { accion: 'xp', eventos: [{ id: 'sx1', xp: 15, dia: '2026-11-13' }] }, T0 + 60_000);
  await pide('beto', 0, { accion: 'xp', eventos: [{ id: 'sx2', xp: 22, dia: '2026-11-13' }] }, T0 + 90_000);
  r = await pide('ana', 0, { accion: 'latido' }, T0 + 100_000);
  ok(r.sesion.xp.ana === 15 && r.sesion.xp.beto === 22, `lo que estudia cada quien durante la sesión va al marcador (${JSON.stringify(r.sesion.xp)})`);
  r = await pide('ana', 0, { accion: 'latido' }, T0 + 26 * 60_000);
  ok(r.sesion && r.sesion.estado === 'terminada', 'al acabarse el tiempo la sesión termina sola');
  r = await pide('ana', 0, { accion: 'salirSesion' }, T0 + 26 * 60_000);
  r = await pide('ana', 0, { accion: 'latido' }, T0 + 26 * 60_000 + 1);
  ok(!r.sesion, 'y ya se puede empezar otra');
  /* Carlos, 13 nov: «nunca acabó el tiempo pero desapareció el timer» — uno sale antes y el otro debe ver el final */
  await pide('ana', 0, { accion: 'latido' }, T0 + 30 * 60_000); await pide('beto', 0, { accion: 'latido' }, T0 + 30 * 60_000);
  r = await pide('ana', 0, { accion: 'invitar', a: 'beto', minutos: 10 }, T0 + 30 * 60_000);
  ok(r.bien, 'después de una sesión se puede invitar otra vez');
  await pide('beto', 0, { accion: 'responder', si: true }, T0 + 30 * 60_000 + 1000);
  r = await pide('beto', 0, { accion: 'salirSesion' }, T0 + 34 * 60_000);
  ok(r.sesion.estado === 'terminada' && r.sesion.salio === 'beto', 'Beto sale a los 4 minutos (como Brenda)');
  r = await pide('ana', 0, { accion: 'latido', desde: T0 + 33 * 60_000 }, T0 + 34 * 60_000 + 1);
  ok(r.sesion && r.sesion.estado === 'terminada' && r.sesion.salio === 'beto', 'a Ana NO se le esfuma: le llega la sesión terminada para ver el final («salió antes»)');
  r = await pide('beto', 0, { accion: 'latido' }, T0 + 34 * 60_000 + 2);
  ok(!r.sesion, 'Beto ya está libre');
  await pide('ana', 0, { accion: 'salirSesion' }, T0 + 34 * 60_000 + 3);
  r = await pide('ana', 0, { accion: 'invitar', a: 'beto', minutos: 15 }, T0 + 34 * 60_000 + 4);
  ok(r.bien && r.sesion.estado === 'invitada', 'y al cerrar el final, Ana puede volver a invitarlo');
  await pide('ana', 0, { accion: 'salirSesion' }, T0 + 34 * 60_000 + 5);
  /* cómo te fue en el examen */
  r = await pide('beto', 0, { accion: 'examen', plan: 'p9', titulo: 'Examen de Química', materia: 'Química', fecha: '2026-11-12', como: 'bien', calif: 8.6 }, T0 + 26.5 * 60_000);
  ok(r.bien && r.historial.length === 1 && r.historial[0].calif === 8.6, 'cómo te fue en el examen se guarda en tu historial');
  r = await pide('ana', 0, { accion: 'latido', desde: T0 + 26 * 60_000 }, T0 + 27 * 60_000);
  ok(r.buzon.some((m) => m.tipo === 'examen' && /Química: le fue bien/.test(m.texto)), 'y a tus amigos les llega para que te feliciten');
  r = await pide('beto', 0, { accion: 'examen', plan: 'p9', como: 'excelente', calif: 9.5, materia: 'Química' });
  ok(r.historial.length === 1 && r.historial[0].como === 'excelente', 'corregirlo no lo duplica');
}

if(process.env.SOLO !== 'servidor') await (await import('./pruebas-estudio-pantalla.mjs')).correr({ ok, almacen, atenderEstudio });

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
