/* Pruebas de Estudio: el servidor (atenderEstudio con un almacén en memoria)
   y la pantalla en un navegador de verdad a 390×844, con una IA de mentiras.
   node sala/pruebas-estudio.mjs            (todo)
   SOLO=servidor node sala/pruebas-estudio.mjs */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { atenderEstudio, semanaDe, avanzarRacha, juntarProgreso, diaMexico } from './servidor/estudio.js';
import { precioRegreso, nivelMascota, notaDespedida } from '../carymo/crianza-datos.js';

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
  ok(r.bien && r.perfil.xp === 0 && r.perfil.nombre === 'Carlos' && r.ranking.filas.length === 1 && r.ranking.filas[0].cuenta === 'carlos' && r.ranking.filas[0].xp === 0 && r.hoy === '2026-11-12', 'perfil nuevo vacío; en el ranking ya te ves tú, con 0');
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
  ok(r.ranking.semana === '2026-S47' && r.ranking.filas[0].cuenta === 'carlos' && r.ranking.filas[0].xp === 10 && r.liga?.resultado === 'sube' && r.ranking.liga === 1 && !r.ranking.filas.some((f) => f.cuenta === 'luis'), 'el lunes empieza un ranking nuevo, y como Carlos le ganó a Luis (55 contra 50) ya compite en Plata');
  r = await llamar(s, 'carlos', 'POST', '', { accion: 'perfil', nombre: 'Palomazi', horario: { lunes: [] } }, '2026-11-16');
  ok(r.perfil.nombre === 'Palomazi' && r.perfil.horario.lunes, 'cambia el nombre y guarda el horario');
  r = await llamar(s, 'carlos', 'GET', '', null, '2026-11-16');
  ok(r.ranking.filas[0].nombre === 'Palomazi' && !('ids' in r.perfil), 'el ranking usa el nombre nuevo y el perfil no expone los ids');

  /* ── la crianza de mascotas (crianza-datos.js) ── */
  {
    const C = almacen();
    const dia = '2026-11-12';
    let q = await llamar(C, 'mia', 'POST', '', { accion: 'mascota', personaje: 'perrito' }, dia);
    ok(q.perfil.mascotas && q.perfil.mascotas.perrito && q.perfil.mascota === 'perrito', 'la primera mascota que eliges es tuya gratis');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'mascota', personaje: 'gatito' }, dia);
    ok(q.error && q.adoptar === 'gatito' && q.perfil.mascota === 'perrito', 'para cambiarte a otra, primero hay que adoptarla');
    let pf = C.m.get('est:perfil:mia'); pf.cubos = 500; C.m.set('est:perfil:mia', pf);
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'adoptar', especie: 'paloma' }, dia);
    ok(q.bien && q.gastado === 40 && q.perfil.mascota === 'paloma' && q.perfil.cubos === 460, 'adoptar otra cuesta cubitos y se vuelve tu compañera');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'xp', id: 'c1', xp: 30 }, dia);
    ok(q.perfil.mascotas.paloma.xp === 30 && q.perfil.mascotas.perrito.xp === 0 && q.mascotaSube && q.mascotaSube.etapaAntes === 'huevo' && q.mascotaSube.etapa === 'bebe', 'lo que estudias lo gana la que está contigo; la paloma sale del huevo');
    pf = C.m.get('est:perfil:mia'); pf.mascotas.paloma.xp = 1215; C.m.set('est:perfil:mia', pf);
    q = await llamar(C, 'mia', 'POST', '', { accion: 'xp', id: 'c2', xp: 30 }, dia);
    ok(q.perfil.mascotas.paloma.xp === 1225, 'después de nivel 10 gana sólo un tercio (conviene cambiar de mascota)');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'activa', especie: 'perrito' }, dia);
    ok(q.bien && q.perfil.mascota === 'perrito', 'cambiarte a una que ya tienes es gratis');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'vestir', especie: 'perrito', acc: ['birrete'] }, dia);
    ok(q.bien && q.perfil.mascotas.perrito.acc.length === 0, 'no se puede poner lo que no has comprado');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'comprarRopa', item: 'birrete' }, dia);
    await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'comprarRopa', item: 'corona' }, dia);
    await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'comprarRopa', item: 'lentes' }, dia);
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'vestir', especie: 'perrito', acc: ['birrete', 'corona', 'lentes'], skin: 'normal' }, dia);
    ok(q.bien && q.perfil.mascotas.perrito.acc.join() === 'birrete,lentes', 'se compra y se pone, uno por lugar (birrete y corona no van juntos)');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'comprarRopa', item: 'creador' }, dia);
    ok(q.error, 'el color de creador no se vende');
    for(let k = 0; k < 22; k++) q = await llamar(C, 'mia', 'POST', '', { accion: 'cuidar', que: 'caricia' }, dia);
    ok(q.tope, 'las caricias suben el ánimo, con tope por día');
    /* nadie la cuida: en cero, y 3 días después, se muere */
    pf = C.m.get('est:perfil:mia'); pf.cuidado = { hambre: 10, limpieza: 90, animo: 80, t: MEDIODIA(dia) }; C.m.set('est:perfil:mia', pf);
    q = await llamar(C, 'mia', 'GET', '', null, '2026-11-14');
    ok(q.perfil.peligroDesde && !q.perfil.mascotas.perrito.muerta && !q.mascota, 'en cero de algo queda en peligro (todavía viva)');
    q = await llamar(C, 'mia', 'GET', '', null, '2026-11-17');
    ok(q.perfil.mascotas.perrito.muerta && q.mascota && q.mascota.tipo === 'murio' && q.perfil.cielo.some((x) => x.especie === 'perrito'), 'tres días en cero y se muere (y se avisa una vez)');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'xp', id: 'c3', xp: 20 }, '2026-11-17');
    ok(q.perfil.mascotas.perrito.muerta && !q.mascotaSube, 'una mascota que se murió ya no gana nada');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'activa', especie: 'paloma' }, '2026-11-17');
    ok(q.bien && q.perfil.mascota === 'paloma', 'te puedes quedar con otra de las que tienes');
    /* SE FUE, NO SE MURIÓ (Carlos, 14 nov): regresa con su nivel, pero sólo pagando un montón */
    const xpAntes = C.m.get('est:perfil:mia').mascotas.perrito.xp, precio = precioRegreso(nivelMascota(xpAntes));
    ok(precio >= 300, `que regrese cuesta un montón (${precio} cubitos; la mascota más cara cuesta 140)`);
    pf = C.m.get('est:perfil:mia'); pf.cubos = precio - 1; C.m.set('est:perfil:mia', pf);
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'regresar', especie: 'perrito' }, '2026-11-17');
    ok(q.error && q.falta === 1 && q.perfil.mascotas.perrito.muerta, 'si te falta un cubito, no regresa y te dice cuánto falta');
    pf = C.m.get('est:perfil:mia'); pf.cubos = precio + 5; C.m.set('est:perfil:mia', pf);
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'regresar', especie: 'perrito' }, '2026-11-17');
    ok(q.bien && q.gastado === precio && q.perfil.cubos === 5 && !q.perfil.mascotas.perrito.muerta && q.perfil.mascotas.perrito.xp === xpAntes && q.perfil.mascotas.perrito.acc.join() === 'birrete,lentes' && q.perfil.mascota === 'perrito',
      'pagando, regresa con su nivel y su ropa, y te acompaña otra vez');
    ok(!q.perfil.cielo.some((x) => x.especie === 'perrito'), 'y ya no sale en «las que se fueron»');
    q = await llamar(C, 'mia', 'POST', '', { accion: 'crianza', que: 'regresar', especie: 'paloma' }, '2026-11-17');
    ok(q.error, 'no se puede «regresar» a una que no se ha ido');
    ok(notaDespedida('gatito').includes('mejor') || /buscar/.test(notaDespedida('gatito')), 'la nota de despedida dice que se fue a buscar algo mejor');
  }

  /* ── las ligas ── */
  {
    const L = almacen();
    const dia = '2026-11-12', lunes = '2026-11-16';
    /* doce cuentas en Bronce, cada una con distinto XP (la 1 la que más) */
    for(let k = 1; k <= 12; k++) await llamar(L, 'u' + k, 'POST', '', { accion: 'xp', id: 'x' + k, xp: 200 - k * 10 }, dia);
    await llamar(L, 'quieto', 'GET', '', null, dia);
    let q = await llamar(L, 'u6', 'GET', '', null, dia);
    ok(q.ranking.liga === 0 && q.ranking.filas.length === 13 && q.ranking.activos === 12, `tu liga completa en la tabla: los 12 que estudiaron y el que no (${q.ranking.filas.length})`);
    ok(q.ranking.filas.at(-1).cuenta === 'quieto' && q.ranking.filas.at(-1).xp === 0, 'el que no ha estudiado sale abajo, con 0');
    ok(q.ranking.reglas.suben === 3 && q.ranking.reglas.bajan === 0, 'en Bronce de 12 suben 3 y nadie baja (no hay liga abajo)');
    ok(q.ranking.cierra > 0 && q.ranking.cierra <= 7 * 864e5, 'dice cuánto falta para que cierre la semana');
    const a1 = await llamar(L, 'u1', 'GET', '', null, lunes);
    ok(a1.liga && a1.liga.resultado === 'sube' && a1.liga.a === 'Plata' && a1.perfil.liga === 1 && a1.perfil.ligaMax === 1, 'el lunes, el primero se entera de que SUBIÓ a Plata');
    ok(a1.perfil.vitrina.bronce.podios === 1 && a1.perfil.vitrina.plata, 'y a su vitrina entra el podio de Bronce y el trofeo de Plata');
    const a1b = await llamar(L, 'u1', 'GET', '', null, lunes);
    ok(!a1b.liga, 'el aviso de la liga se da una sola vez');
    const a4 = await llamar(L, 'u4', 'GET', '', null, lunes);
    ok(a4.liga && a4.liga.resultado === 'queda' && a4.perfil.liga === 0, 'el cuarto se queda en Bronce');
    const aq = await llamar(L, 'quieto', 'GET', '', null, lunes);
    ok(!aq.liga && aq.perfil.liga === 0, 'el que no estudió en toda la semana no sube ni baja');
    /* semana 2: los tres de Plata con nueve más que ya estaban en Plata; los últimos bajan */
    await llamar(L, 'u2', 'GET', '', null, lunes); await llamar(L, 'u3', 'GET', '', null, lunes);
    for(let k = 1; k <= 3; k++) await llamar(L, 'u' + k, 'POST', '', { accion: 'xp', id: 'y' + k, xp: 5 * k }, lunes);
    for(let k = 1; k <= 9; k++){ const c = 'p' + k, pf = { cuenta: c, nombre: 'P' + k, xp: 0, racha: 0, mejorRacha: 0, ultimoDia: '', congeladas: 0, ids: [], liga: 1, ligaMax: 1 }; L.m.set('est:perfil:' + c, pf); await llamar(L, c, 'POST', '', { accion: 'xp', id: 'z' + k, xp: 100 + k }, lunes); }
    q = await llamar(L, 'u1', 'GET', '', null, lunes);
    ok(q.ranking.liga === 1 && q.ranking.filas.filter((f) => f.xp > 0).length === 12 && q.ranking.filas.every((f) => !/^u([4-9]|1[0-2])$/.test(f.cuenta)), 'en Plata compites sólo contra los de Plata');
    ok(q.ranking.reglas.suben === 3 && q.ranking.reglas.bajan === 2, 'en Plata de 12 suben 3 y bajan 2');
    const b1 = await llamar(L, 'u1', 'GET', '', null, '2026-11-23');
    ok(b1.liga && b1.liga.resultado === 'baja' && b1.perfil.liga === 0 && b1.perfil.ligaMax === 1, 'el que quedó en los últimos BAJA a Bronce, pero su mejor liga se recuerda');
    const p9 = await llamar(L, 'p9', 'GET', '', null, '2026-11-23');
    ok(p9.liga.resultado === 'sube' && p9.perfil.liga === 2, 'el primero de Plata sube a Oro');
    /* amigos: aparte de la liga, todos tus amigos con su XP de la semana */
    L.m.set('est:amigos:u1', { amigos: ['p9', 'u12'], pide: [] });
    q = await llamar(L, 'u1', 'GET', '', null, '2026-11-23');
    ok(q.ranking.amigos.length === 3 && q.ranking.amigos.some((f) => f.cuenta === 'p9' && f.liga === 2), 'la pestaña de amigos trae a tus amigos (de cualquier liga) y a ti');
    /* más de 30 en una liga: grupos de 30, siempre los mismos */
    const G = almacen();
    for(let k = 1; k <= 70; k++) await llamar(G, 'g' + k, 'POST', '', { accion: 'xp', id: 'g' + k, xp: k }, dia);
    const vistos = new Map();
    for(let k = 1; k <= 70; k++){ const r2 = await llamar(G, 'g' + k, 'GET', '', null, dia); const llave = r2.ranking.filas.filter((f) => f.xp > 0).map((f) => f.cuenta).sort().join(); vistos.set(llave, (vistos.get(llave) || 0) + 1); }
    ok([...vistos.keys()].every((x) => x.split(',').length <= 30) && [...vistos.values()].reduce((a, b) => a + b, 0) === 70 && vistos.size === 3, `70 en Bronce se parten en 3 grupos de máximo 30 y cada quien ve el suyo (${[...vistos.keys()].map((x) => x.split(',').length).join(', ')})`);
  }

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
  /* LOS MODOS COOPERATIVOS (Carlos, 13 nov: «invéntate más maneras… de lo de los cooperativos») */
  {
    const juntos = async (modo, t0, minutos = 10) => { await pide('ana', 0, { accion: 'latido' }, t0); await pide('beto', 0, { accion: 'latido' }, t0);
      const inv = await pide('ana', 0, { accion: 'invitar', a: 'beto', minutos, modo }, t0); await pide('beto', 0, { accion: 'responder', si: true }, t0 + 1); return inv; };
    const cerrar = async (t) => { const a = await pide('ana', 0, { accion: 'salirSesion' }, t); const b = await pide('beto', 0, { accion: 'salirSesion' }, t); return [a, b]; };
    const xp = (q, id, n, t) => pide(q, 0, { accion: 'xp', eventos: [{ id, xp: n, dia: '2026-11-13' }] }, t);
    let t = T0 + 40 * 60_000;
    let inv = await juntos('equipo', t);
    ok(inv.sesion.modo === 'equipo' && inv.sesion.meta === 40, 'modo EQUIPO: 10 minutos = meta de 40 XP entre los dos');
    await xp('ana', 'eq1', 25, t + 60_000); r = await xp('beto', 'eq2', 20, t + 120_000);
    ok(r.premios.some((p) => p.motivo === 'equipo'), 'al llegar a la meta, el que la cruzó cobra su premio');
    const [ca, cb] = await cerrar(t + 11 * 60_000);
    ok(ca.premios.some((p) => p.motivo === 'equipo') && !cb.premios.length, 'y el otro lo cobra al cerrar la sesión (una sola vez cada quien)');
    t += 20 * 60_000; inv = await juntos('relevo', t);
    await xp('ana', 'rl1', 20, t + 60_000);            /* turno de Ana (la que invitó) */
    await xp('beto', 'rl2', 50, t + 2 * 60_000);       /* Beto estudia fuera de su turno: para él sí, para el equipo no */
    r = await pide('ana', 0, { accion: 'latido' }, t + 2 * 60_000 + 1);
    ok(r.sesion.equipo === 20 && r.sesion.xp.beto === 50, `modo RELEVO: sólo cuenta para el equipo quien tiene el turno (equipo ${r.sesion.equipo})`);
    await xp('beto', 'rl3', 12, t + 6 * 60_000);       /* ya es turno de Beto */
    r = await pide('ana', 0, { accion: 'latido' }, t + 6 * 60_000 + 1);
    ok(r.sesion.equipo === 32 && r.sesion.logrado, 'a los 5 minutos el turno pasa a Beto y juntos llegan a la meta (30)');
    await cerrar(t + 11 * 60_000);
    t += 20 * 60_000; inv = await juntos('jefe', t);
    ok(inv.sesion.meta === 60, 'modo JEFE: el jefe de 10 minutos tiene 60 de vida');
    await xp('ana', 'jf1', 30, t + 60_000); await xp('beto', 'jf2', 20, t + 2 * 60_000);
    r = await pide('ana', 0, { accion: 'latido' }, t + 5 * 60_000);
    ok(!r.sesion.logrado, 'con 50 XP no cae: se cura solo con el tiempo (1 cada 20 s)');
    r = await xp('beto', 'jf3', 40, t + 5 * 60_000);
    ok(r.premios.some((p) => p.motivo === 'jefe'), 'con un empujón más, cae el jefe y hay premio');
    await cerrar(t + 11 * 60_000);
    t += 20 * 60_000; inv = await juntos('biblioteca', t);
    await xp('ana', 'bb1', 10, t + 60_000); await xp('beto', 'bb2', 8, t + 2 * 60_000);
    const [ba, bb] = await cerrar(t + 11 * 60_000);
    ok(ba.premios.some((p) => p.motivo === 'biblioteca') && bb.premios.some((p) => p.motivo === 'biblioteca'), 'modo BIBLIOTECA: si los dos estudiaron y nadie se salió, premio para los dos');
    t += 20 * 60_000; inv = await juntos('biblioteca', t);
    await xp('ana', 'bb3', 10, t + 60_000);
    const sale = await pide('beto', 0, { accion: 'salirSesion' }, t + 3 * 60_000), queda = await pide('ana', 0, { accion: 'salirSesion' }, t + 3 * 60_000 + 1);
    ok(!sale.premios.length && !queda.premios.length, 'y si alguien se sale antes, no hay premio de biblioteca');
    inv = await juntos('cualquiera', t + 10 * 60_000);
    ok(inv.sesion.modo === 'duelo', 'un modo que no existe se vuelve duelo'); await cerrar(t + 30 * 60_000);
  }
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


console.log('Títulos, regalos y el perfil de otro (Carlos, 14 nov)');
{
  const s = almacen();
  const casa = (cuenta, cuerpo, admin = true) => atenderEstudio(s, ...pedido('POST', '', cuerpo), cuenta, MEDIODIA('2026-11-12'), { admin }).then((x) => x.json().then((j) => ({ ...j, _st: x.status })));
  let r = await llamar(s, 'sandra', 'POST', '', { accion: 'xp', id: 's1', xp: 30 });
  ok(r.perfil.titulos.includes('alfa') && r.ranking.filas[0].titulos.includes('alfa'), 'quien ya está dado de alta sale como Alfa tester, en su perfil y en la tabla');
  await llamar(s, 'sandra', 'POST', '', { accion: 'mascota', personaje: 'tigre' });
  r = await casa('sandra', { accion: 'admin', que: 'miembros' }, false);
  ok(r._st === 403, 'una cuenta de CARYMO (sin la llave de la sala) no puede poner títulos');
  r = await casa('carlos', { accion: 'admin', que: 'miembros' });
  ok(r.bien && r.miembros.sandra, 'la casa ve quiénes están');
  r = await casa('carlos', { accion: 'admin', que: 'especial', cuenta: 'sandra', titulo: 'artista', estilo: 'arcoiris', regalos: ['pincel', 'boina', 'nada'], ponerle: true });
  ok(r.bien && r.titulos[0] === 'artista' && r.titulos.includes('alfa') && r.estilo === 'arcoiris' && r.armario.includes('pincel') && !r.armario.includes('nada'), 'a Sandra: Artista principal, nombre en arcoíris y el pincel y la boina de regalo');
  r = await casa('carlos', { accion: 'admin', que: 'especial', cuenta: 'sandra', estilo: 'neon' });
  ok(r._st === 400, 'un estilo que no existe no se pone');
  r = await llamar(s, 'sandra', 'GET', '');
  ok(r.perfil.mascotas.tigre.acc.includes('pincel') && r.perfil.mascotas.tigre.acc.includes('boina'), 'y su mascota ya los trae puestos');
  ok(r.ranking.filas.find((f) => f.cuenta === 'sandra').estilo === 'arcoiris', 'en la tabla su nombre viene con su estilo');
  r = await llamar(s, 'sandra', 'POST', '', { accion: 'crianza', que: 'comprarRopa', item: 'capaMazi' });
  ok(!r.bien, 'lo de regalo no se puede comprar');
  /* Carlos, 14 nov: gorra con pelo por los lados y estampado de Grupo Mazi, sudadera con la marca, y una mascota ya crecida y especial */
  await llamar(s, 'carlosq', 'POST', '', { accion: 'xp', id: 'cq1', xp: 10 });
  r = await llamar(s, 'carlosq', 'POST', '', { accion: 'comprarRopa', item: 'gorro:gorraMazi' });
  ok(!r.bien, 'la gorra Mazi no se puede comprar (aunque sea «gratis»: es de regalo)');
  r = await casa('carlos', { accion: 'admin', que: 'especial', cuenta: 'carlosq', regalos: ['gorro:gorraMazi', 'estampa:mazi'], ponerle: true,
    mascotaEspecial: { especie: 'paloma', nivel: 15, skin: 'mazi', acc: ['coronaMazi', 'capaMazi'] } });
  ok(r.bien && r.ropa.includes('gorro:gorraMazi') && r.personaje.gorro === 'gorraMazi' && r.personaje.estampa === 'mazi' && ['hoodie', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck', 'graphicShirt'].includes(r.personaje.ropa),
    'la casa le regala la gorra y el estampado de Grupo Mazi y se los pone');
  ok(nivelMascota(r.mascotas.paloma.xp) === 15 && r.mascotas.paloma.skin === 'mazi' && r.mascotas.paloma.especial && r.mascota === 'paloma' && r.armario.includes('mazi'),
    'y una paloma ya crecida (nivel 15), con el color de Grupo Mazi, que lo acompaña');
  r = await llamar(s, 'carlosq', 'POST', '', { accion: 'crianza', que: 'vestir', especie: 'paloma', skin: 'mazi', acc: ['coronaMazi', 'capaMazi'] });
  ok(r.bien, 'el color Grupo Mazi se lo puede quitar y volver a poner porque es suyo');
  r = await llamar(s, 'sandra', 'POST', '', { accion: 'crianza', que: 'comprarRopa', item: 'mazi' });
  ok(!r.bien, 'y nadie más lo puede comprar');
  r = await casa('carlos', { accion: 'admin', que: 'especial', cuenta: 'carlosq', cubosInfinitos: true });
  ok(r.bien && r.infinito && r.cubos >= 999999, 'a Carlos: cubos infinitos');
  r = await llamar(s, 'carlosq', 'POST', '', { accion: 'crianza', que: 'adoptar', especie: 'ballena' });
  r = await llamar(s, 'carlosq', 'GET', '');
  ok(r.perfil.infinito && r.perfil.cubos >= 999999 && r.perfil.mascotas.ballena, 'compra lo que quiera y el saldo se rellena solo');
  r = await casa('carlos', { accion: 'admin', que: 'especial', cuenta: 'carlosq', titulo: 'inspiracion', estilo: 'perlaCorazones' });
  ok(r.bien && r.titulos[0] === 'inspiracion' && r.estilo === 'perlaCorazones', 'el título Inspiración y el nombre con corazones existen');
  r = await llamar(s, 'luis', 'GET', '?perfil=sandra');
  ok(r.bien && r.otro.nombre && r.otro.estilo === 'arcoiris' && r.otro.mascotas[0].especie === 'tigre' && !('cubos' in r.otro) && !('amigos' in r.otro), 'el perfil de otra persona enseña su nivel, títulos y mascotas, sin sus cubitos ni sus amigos');
  r = await llamar(s, 'luis', 'GET', '?perfil=nadie');
  ok(r.error, 'de quien no está en la comunidad no se ve nada');
}

if(process.env.SOLO !== 'servidor') await (await import('./pruebas-estudio-pantalla.mjs')).correr({ ok, almacen, atenderEstudio });

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
