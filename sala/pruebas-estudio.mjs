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
}

if(process.env.SOLO !== 'servidor') await (await import('./pruebas-estudio-pantalla.mjs')).correr({ ok, almacen, atenderEstudio });

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
