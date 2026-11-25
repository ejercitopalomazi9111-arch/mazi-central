/* Pruebas de los avisos de CARYMO (avisos-estudio.js + la acción `avisos` de estudio.js).
   node sala/servidor/pruebas-avisos-estudio.mjs */
import { atenderEstudio } from './estudio.js';
import { avisosQueTocan, revisarAvisos, kAvisos, K_INDICE, minutoMexico, MAX_TELEFONOS } from './avisos-estudio.js';

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
/* una hora de México → milisegundos (México = UTC−6) */
const MX = (dia, hora) => Date.parse(`${dia}T${hora}:00Z`) + 6 * 36e5;
const DIA = '2026-11-13';
const enviados = [];
const enviar = async (subs, mensaje) => { enviados.push({ subs: subs.map((s) => s.endpoint), m: JSON.parse(mensaje) }); return { enviados: subs.length, muertas: subs.filter((s) => s.endpoint.includes('muerta')).map((s) => s.endpoint) }; };
async function llamar(s, cuenta, cuerpo, ahora = MX(DIA, '12:00')){
  const req = new Request('http://x/api/sala/G/estudio', { method: 'POST', body: JSON.stringify(cuerpo) });
  const r = await atenderEstudio(s, req, new URL(req.url), cuenta, ahora, { vapid: async () => ({ publica: 'PUB' }), enviar });
  return { estado: r.status, ...(await r.json()) };
}
const SUS = (n) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'BP' + n, auth: 'au' + n } });

console.log('La hora de México');
ok(minutoMexico(MX(DIA, '18:00')) === 18 * 60, 'las 6 de la tarde en México son el minuto 1080');

console.log('Apuntar el teléfono');
{
  const s = almacen();
  let r = await llamar(s, 'ana', { accion: 'avisos', que: 'estado' });
  ok(r.publica === 'PUB' && r.ajustes.estudiar === '18:00' && r.telefonos === 0, 'el estado trae la llave pública y los ajustes de fábrica');
  r = await llamar(s, 'ana', { accion: 'avisos', que: 'suscribir', suscripcion: { endpoint: 'http://no-https' } });
  ok(r.estado === 400, 'una suscripción sin https se rechaza');
  r = await llamar(s, 'ana', { accion: 'avisos', que: 'suscribir', suscripcion: SUS(1) });
  ok(r.bien && r.telefonos === 1, 'el teléfono queda apuntado');
  const x = await s.get(kAvisos('ana'));
  ok(x.subs[SUS(1).endpoint].keys.p256dh === 'BP1', 'se guardan sus LLAVES (sin ellas el aviso llega sin texto)');
  ok((await s.get(K_INDICE)).includes('ana'), 'la cuenta entra al índice de quienes reciben avisos');
  await llamar(s, 'ana', { accion: 'avisos', que: 'suscribir', suscripcion: SUS(1) });
  ok(Object.keys((await s.get(kAvisos('ana'))).subs).length === 1, 'el mismo teléfono dos veces es UN teléfono');
  for(let k = 2; k <= 9; k++) await llamar(s, 'ana', { accion: 'avisos', que: 'suscribir', suscripcion: SUS(k) }, MX(DIA, '12:00') + k * 1000);
  const subs = (await s.get(kAvisos('ana'))).subs;
  ok(Object.keys(subs).length === MAX_TELEFONOS && subs[SUS(9).endpoint] && !subs[SUS(1).endpoint], `máximo ${MAX_TELEFONOS} teléfonos; se va el más viejo`);
  r = await llamar(s, 'ana', { accion: 'avisos', que: 'ajustes', ajustes: { estudiar: '25:99', racha: false } });
  ok(r.ajustes.estudiar === '18:00' && r.ajustes.racha === false, 'una hora inventada no se guarda; apagar la racha sí');
  r = await llamar(s, 'ana', { accion: 'avisos', que: 'ajustes', ajustes: { estudiar: '' } });
  ok(r.ajustes.estudiar === '', 'se puede quitar el recordatorio diario');
  r = await llamar(s, 'ana', { accion: 'avisos', que: 'desuscribir' });
  ok(r.telefonos === 0 && !(await s.get(K_INDICE)).includes('ana'), 'apagar sin decir cuál quita todos y sale del índice');
  r = await llamar(s, 'ana', { accion: 'avisos', que: 'probar' });
  ok(r.estado === 400, 'probar sin teléfono apuntado dice que no hay');
}

console.log('Qué aviso toca');
{
  const base = { perfil: { nombre: 'Carlos Palomazi', racha: 6, ultimoDia: '2026-11-12', mascota: 'tigre', congeladas: 0 }, planes: {}, ajustes: {}, enviados: {} };
  ok(avisosQueTocan(base, MX(DIA, '17:59')).length === 0, 'antes de las 6 no toca nada');
  let t = avisosQueTocan(base, MX(DIA, '18:05'));
  ok(t.length === 1 && t[0].tipo === 'estudiar' && /Carlos/.test(t[0].titulo) && /tigre/i.test(t[0].texto), 'a las 6:05 toca «estudiar», con su nombre y su mascota');
  ok(!/Palomazi/.test(t[0].titulo), 'sólo el primer nombre');
  ok(avisosQueTocan({ ...base, perfil: { ...base.perfil, ultimoDia: DIA } }, MX(DIA, '18:05')).length === 0, 'si ya estudió hoy, no se le recuerda');
  ok(avisosQueTocan({ ...base, enviados: { estudiar: DIA } }, MX(DIA, '18:20')).length === 0, 'el mismo aviso no sale dos veces el mismo día');
  ok(avisosQueTocan(base, MX(DIA, '20:30')).length === 0, 'dos horas y media tarde ya no sirve: no sale');
  t = avisosQueTocan(base, MX(DIA, '21:10'));
  ok(t.some((x) => x.tipo === 'racha' && /6 días/.test(x.titulo)), 'a las 9 de la noche: «tu racha de 6 días se puede perder»');
  ok(avisosQueTocan({ ...base, perfil: { ...base.perfil, racha: 0 } }, MX(DIA, '21:10')).every((x) => x.tipo !== 'racha'), 'sin racha no hay aviso de racha');
  ok(avisosQueTocan({ ...base, ajustes: { racha: false } }, MX(DIA, '21:10')).every((x) => x.tipo !== 'racha'), 'con el de racha apagado, no sale');
  const conExamen = { ...base, planes: { p1: { id: 'p1', titulo: 'Química I', fecha: '2026-11-14' }, p2: { id: 'p2', titulo: 'Viejo', fecha: '2026-11-01' } } };
  t = avisosQueTocan(conExamen, MX(DIA, '08:10'));
  ok(t.length === 1 && t[0].tipo === 'examen' && t[0].titulo === 'Mañana es tu examen' && /Química/.test(t[0].texto) && t[0].plan === 'p1', 'a las 8: «mañana es tu examen» del plan que toca, con su id para abrirlo');
  t = avisosQueTocan({ ...conExamen, planes: { p1: { ...conExamen.planes.p1, fecha: DIA } } }, MX(DIA, '08:10'));
  ok(t[0].titulo === 'Hoy es tu examen', 'el mismo día: «hoy es tu examen»');
  ok(avisosQueTocan({ ...base, planes: { p2: conExamen.planes.p2 } }, MX(DIA, '08:10')).length === 0, 'un examen que ya pasó no avisa');
  const hambre = { ...base, perfil: { ...base.perfil, cuidado: { hambre: 10, limpieza: 90, animo: 90, t: MX(DIA, '12:00') } } };
  t = avisosQueTocan(hambre, MX(DIA, '13:05'));
  ok(t.length === 1 && t[0].tipo === 'mascota' && t[0].titulo === 'Tu tigre tiene hambre' && t[0].abrir === 'companero', 'a la 1: «tu tigre tiene hambre», y al tocar abre su cuarto');
  ok(avisosQueTocan({ ...hambre, perfil: { ...hambre.perfil, mascota: 'no' } }, MX(DIA, '13:05')).length === 0, 'sin mascota no hay aviso de mascota');
  ok(avisosQueTocan({ ...base, perfil: { ...base.perfil, cuidado: { hambre: 90, limpieza: 90, animo: 90, t: MX(DIA, '12:00') } } }, MX(DIA, '13:05')).length === 0, 'si está bien cuidada, no se molesta a nadie');
}

console.log('La vuelta de cada 15 minutos');
{
  const s = almacen(); enviados.length = 0;
  await s.put('est:perfil:ana', { nombre: 'Ana', racha: 3, ultimoDia: '2026-11-12', mascota: 'paloma' });
  await s.put('est:planes:ana', { p1: { id: 'p1', titulo: 'Historia', fecha: '2026-11-14' } });
  await llamar(s, 'ana', { accion: 'avisos', que: 'suscribir', suscripcion: SUS(1) });
  await llamar(s, 'ana', { accion: 'avisos', que: 'suscribir', suscripcion: { endpoint: 'https://push.example/muerta' } }, MX(DIA, '12:01'));
  await s.put('est:perfil:beto', { nombre: 'Beto', racha: 0, ultimoDia: DIA });
  await llamar(s, 'beto', { accion: 'avisos', que: 'suscribir', suscripcion: SUS(7) });

  let r = await revisarAvisos(s, MX(DIA, '07:30'), enviar);
  ok(r.cuentas === 2 && enviados.length === 0, 'a las 7:30 no sale nada para nadie');
  r = await revisarAvisos(s, MX(DIA, '08:00'), enviar);
  ok(enviados.length === 1 && enviados[0].m.tipo === 'examen' && enviados[0].subs.length === 2, 'a las 8 sale el del examen a los dos teléfonos de Ana');
  ok(!(await s.get(kAvisos('ana'))).subs['https://push.example/muerta'], 'el teléfono que ya no existe se borra');
  await revisarAvisos(s, MX(DIA, '08:15'), enviar);
  ok(enviados.length === 1, 'quince minutos después no se repite');
  await revisarAvisos(s, MX(DIA, '18:00'), enviar);
  ok(enviados.length === 2 && enviados[1].m.tipo === 'estudiar' && enviados[1].subs[0] === SUS(1).endpoint, 'a las 6, «estudiar» para Ana; Beto ya estudió hoy y no recibe nada');
  /* dos que tocan a la vez salen en vueltas distintas */
  const s2 = almacen(); enviados.length = 0;
  await s2.put('est:perfil:ceci', { nombre: 'Ceci', racha: 2, ultimoDia: '2026-11-12' });
  await llamar(s2, 'ceci', { accion: 'avisos', que: 'suscribir', suscripcion: SUS(3), ajustes: { estudiar: '21:00' } });
  await revisarAvisos(s2, MX(DIA, '21:00'), enviar);
  await revisarAvisos(s2, MX(DIA, '21:15'), enviar);
  await revisarAvisos(s2, MX(DIA, '21:30'), enviar);
  ok(enviados.length === 2 && enviados[0].m.tipo === 'estudiar' && enviados[1].m.tipo === 'racha', 'si dos tocan a la misma hora, salen en dos vueltas, no los dos de golpe');
  r = await llamar(s2, 'ceci', { accion: 'avisos', que: 'probar' });
  ok(r.bien && enviados.at(-1).m.tipo === 'prueba', '«Probar aviso» manda uno al momento');
}

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
