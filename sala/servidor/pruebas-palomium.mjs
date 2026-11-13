/* Pruebas de los cubitos de palomium, la tienda y el cuidado de la mascota (palomium.js + estudio.js).
   node sala/servidor/pruebas-palomium.mjs */
import { atenderEstudio } from './estudio.js';
import { TIENDA, PREMIOS, REGALO_INICIAL, cuidadoAhora, animoDe, nivelDe } from './palomium.js';

let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
function almacen(){
  const m = new Map();
  return { m,
    async get(k){ if(Array.isArray(k)){ const r = new Map(); for(const x of k) if(m.has(x)) r.set(x, structuredClone(m.get(x))); return r; } return structuredClone(m.get(k)); },
    async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k){ for(const x of [].concat(k)) m.delete(x); },
    async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
}
const MEDIODIA = (dia) => Date.parse(dia + 'T18:00:00Z');
async function llamar(s, cuenta, cuerpo, dia = '2026-11-12', horas = 0){
  const q = cuerpo ? '' : '?tienda=1';
  const req = new Request('http://x/api/sala/G/estudio' + q, { method: cuerpo ? 'POST' : 'GET', body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const r = await atenderEstudio(s, req, new URL(req.url), cuenta, MEDIODIA(dia) + horas * 36e5);
  return { estado: r.status, ...(await r.json()) };
}
let n = 0; const ev = (xp, motivo, dia) => ({ id: 'e' + (++n), xp, motivo, dia });

console.log('Los cubitos');
{
  const s = almacen();
  const g = await llamar(s, 'ana');
  ok(g.perfil.cubos === REGALO_INICIAL && g.tienda.congelador, `una cuenta nueva empieza con ${REGALO_INICIAL} de regalo y ve la tienda`);
  let r = await llamar(s, 'ana', { accion: 'xp', eventos: [ev(20, 'leccion')] });
  ok(r.perfil.cubos === REGALO_INICIAL + 1 + 1 && r.premios.some((x) => x.motivo === 'racha') && r.premios.some((x) => x.motivo === 'leccion'), 'la primera lección del día paga 1 y la racha de hoy otro 1');
  const otraVez = { accion: 'xp', eventos: [{ id: 'e1', xp: 20, motivo: 'leccion' }] };
  r = await llamar(s, 'ana', otraVez);
  ok(r.perfil.cubos === REGALO_INICIAL + 2, 'el mismo evento reenviado (sin red, reintento) no paga dos veces');
  for(let k = 0; k < 8; k++) r = await llamar(s, 'ana', { accion: 'xp', eventos: [ev(10, 'leccion')] });
  ok(r.perfil.cubosDia.por.leccion === PREMIOS.leccion.tope, `por lecciones se ganan máximo ${PREMIOS.leccion.tope} al día, aunque hagas 9`);
  const antes = r.perfil.cubos;
  r = await llamar(s, 'ana', { accion: 'xp', eventos: [ev(10, 'trampa')] });
  ok(r.perfil.cubos === antes, 'un motivo inventado no paga nada');
  r = await llamar(s, 'ana', { accion: 'xp', eventos: [ev(30, 'plan')] });
  ok(r.perfil.cubos === antes + PREMIOS.plan.cubos, `terminar un plan paga ${PREMIOS.plan.cubos}`);
  r = await llamar(s, 'ana', { accion: 'xp', eventos: [ev(10, 'leccion', '2026-11-13')] }, '2026-11-13');
  ok(r.perfil.cubosDia.dia === '2026-11-13' && r.perfil.cubosDia.por.leccion === 1, 'al otro día el tope de lecciones vuelve a empezar');

  /* siete días seguidos: racha + semana */
  const s2 = almacen(); let rr;
  for(let d = 1; d <= 7; d++){ const dia = `2026-11-0${d}`; rr = await llamar(s2, 'beto', { accion: 'xp', eventos: [ev(5, null, dia)] }, dia); }
  ok(rr.perfil.racha === 7 && rr.premios.some((x) => x.motivo === 'semana'), 'al séptimo día seguido llegan 3 extra');

  /* subir de nivel */
  const s3 = almacen();
  let r3 = await llamar(s3, 'caro', { accion: 'xp', eventos: [ev(150), ev(150)] });
  ok(nivelDe(300) === 3 && r3.premios.filter((x) => x.motivo === 'nivel').length === 1 && r3.perfil.nivel === 3, 'subir de nivel paga (dos niveles de golpe = 10)');
  r3 = await llamar(s3, 'caro', { accion: 'xp', eventos: [ev(1)] });
  ok(!r3.premios.some((x) => x.motivo === 'nivel'), 'un nivel ya cobrado no se cobra otra vez');
}

console.log('La tienda');
{
  const s = almacen();
  let r = await llamar(s, 'dani', { accion: 'comprar', item: 'cama' });
  ok(r.estado === 400 && /Te faltan/.test(r.error), 'sin cubitos suficientes no se compra, y dice cuántos faltan');
  const p = await s.get('est:perfil:dani') || { cuenta: 'dani', nombre: 'Dani', xp: 0, racha: 0, mejorRacha: 0, ultimoDia: '', congeladas: 0, ids: [] };
  await s.put('est:perfil:dani', { ...p, cubos: 100, cuidado: { hambre: 50, limpieza: 40, animo: 50, t: MEDIODIA('2026-11-12') } });
  r = await llamar(s, 'dani', { accion: 'comprar', item: 'congelador' });
  ok(r.bien && r.perfil.cubos === 80 && r.perfil.congeladas === 1, 'el congelador de racha cuesta 20 y se guarda');
  r = await llamar(s, 'dani', { accion: 'comprar', item: 'congelador', cuantos: 5 });
  ok(r.estado === 400, 'no se pueden juntar más de 3 congeladores');
  r = await llamar(s, 'dani', { accion: 'comprar', item: 'tapete' });
  ok(r.bien && r.perfil.cuarto.puestos.includes('tapete'), 'un mueble comprado ya aparece en el cuarto');
  r = await llamar(s, 'dani', { accion: 'comprar', item: 'tapete' });
  ok(r.estado === 400, 'un mueble no se compra dos veces');
  r = await llamar(s, 'dani', { accion: 'comprar', item: 'nave-espacial' });
  ok(r.estado === 400, 'lo que no está en la tienda no se compra');

  console.log('El cuidado');
  r = await llamar(s, 'dani', { accion: 'cuidar', que: 'comer', item: 'manzana' });
  ok(r.estado === 400 && /No tienes/.test(r.error), 'no puede comer lo que no tienes');
  await llamar(s, 'dani', { accion: 'comprar', item: 'sopa' });
  const hambreAntes = (await llamar(s, 'dani')).perfil.cuidado.hambre;
  r = await llamar(s, 'dani', { accion: 'cuidar', que: 'comer', item: 'sopa' });
  ok(r.bien && r.perfil.cuidado.hambre > hambreAntes && !r.perfil.inv.sopa, 'darle de comer sube el hambre (llenito) y se gasta la comida');
  await llamar(s, 'dani', { accion: 'comprar', item: 'jabon' });
  r = await llamar(s, 'dani', { accion: 'cuidar', que: 'banar' });
  ok(r.bien && r.perfil.cuidado.limpieza === 100 && r.perfil.inv.jabon === TIENDA.jabon.usos - 1, 'bañarlo lo deja limpio y el jabón dura varias veces');
  r = await llamar(s, 'dani', { accion: 'cuidar', que: 'mueble', item: 'tapete' });
  ok(r.bien && !r.perfil.cuarto.puestos.includes('tapete'), 'un mueble se puede quitar del cuarto (y volver a poner)');

  const c0 = { hambre: 100, limpieza: 100, animo: 100, t: 0 };
  const c48 = cuidadoAhora(c0, 48 * 36e5);
  ok(c48.hambre === 0 && c48.limpieza < 30 && animoDe(c48) === 'muy-mal', 'dos días sin entrar: hambre, sucio y se siente muy mal');
  ok(animoDe(cuidadoAhora(c0, 3 * 36e5)) === 'feliz', 'unas horas después sigue feliz');
  r = await llamar(s, 'dani', { accion: 'xp', eventos: [ev(30, 'leccion')] }, '2026-11-12', 30);
  const r2 = await llamar(s, 'dani', null, '2026-11-12', 30);
  ok(r.perfil.cuidado.animo >= r2.perfil.cuidado.animo, 'estudiar le sube el ánimo');

  console.log('La mascota y su voz');
  r = await llamar(s, 'dani', { accion: 'mascota', personaje: 'foca', voz: 2 });
  ok(r.perfil.mascota === 'foca' && r.perfil.voces.foca === 2, 'se guarda la mascota y la voz que elegiste');
  r = await llamar(s, 'dani', { accion: 'mascota', personaje: 'foca', voz: 9 });
  ok(r.perfil.voces.foca === 2, 'la voz va de 0 a 2: un 9 se queda en la última');
  ok(!('premiados' in r.perfil) && !('ids' in r.perfil), 'lo interno (ids y premios cobrados) no sale al teléfono');
}

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
