/* CARYMO con cuenta propia (sin la llave de La Sala) y compartir planes por código.
   Carlos, 13 nov: «que no requiera de la llave de la sala, porque estarla dando es darle acceso a la gente a
   la sala» y «que pueda compartir cursos por link o código».
   Prueba la sala por dentro (la puerta «interno/carymo») y el reparto de index.js con una comunidad de mentiras.
   node sala/servidor/pruebas-carymo-cuentas.mjs */
import { Sala } from './sala.js';
import worker from './index.js';

let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
function ctx(){
  const d = new Map();
  return { storage: {
    async get(k){ if(Array.isArray(k)) return new Map(k.filter((x) => d.has(x)).map((x) => [x, structuredClone(d.get(x))])); const v = d.get(k); return v === undefined ? undefined : structuredClone(v); },
    async put(o, v){ if(typeof o === 'string'){ d.set(o, structuredClone(v)); return; } for(const k in o) d.set(k, structuredClone(o[k])); },
    async delete(k){ for(const x of [].concat(k)) d.delete(x); return true; },
    async list({ prefix = '' } = {}){ return new Map([...d].filter(([k]) => k.startsWith(prefix)).sort()); },
    async deleteAll(){ d.clear(); }, async setAlarm(){}, async getAlarm(){ return null; },
  }, blockConcurrencyWhile: (f) => f(), waitUntil: () => {} };
}
const sala = new Sala(ctx(), { ESPERA_MS: 250, LLAVES: 'carlos:MAESTRA,luis:LLAVELUIS' });
const interno = (ruta, usuario, cuerpo, extra = {}) => sala.fetch(new Request('https://interno/carymo/' + ruta, { method: cuerpo ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(usuario ? { 'X-Carymo-Usuario': usuario } : {}), ...extra }, body: cuerpo ? JSON.stringify(cuerpo) : undefined }));
const j = async (r) => ({ estado: r.status, ...(await r.json()) });

console.log('La puerta de CARYMO dentro de la sala');
{
  let r = await j(await interno('estudio', 'ana'));
  ok(r.estado === 200 && r.perfil.cuenta === 'ana', 'con su usuario ya comprobado, Ana entra a CARYMO sin la llave de la sala');
  r = await j(await interno('hilo', 'ana'));
  ok(r.estado === 403, 'pero el chat de la sala NO se abre con eso (403)');
  r = await j(await interno('banco', 'ana'));
  ok(r.estado === 403, 'ni el banco de imágenes');
  r = await j(await interno('estudio', ''));
  ok(r.estado === 401, 'sin usuario no entra');
  r = await j(await interno('estudio', 'carlos'));
  ok(r.perfil.cuenta === 'u_carlos', 'alguien que se registra como «carlos» NO se queda con el avance de Carlos (u_carlos)');
  r = await j(await sala.fetch(new Request('https://sala.x/api/sala/GRUPAZ/estudio', { headers: { 'X-Carymo-Usuario': 'carlos' } })));
  ok(r.estado === 401, 'y desde fuera, poner la cabecera X-Carymo-Usuario no sirve de nada (sólo vale por dentro)');
  r = await j(await interno('vincular', 'palomazi', {}, { 'X-Llave': 'MAESTRA' }));
  ok(r.bien && r.cuenta === 'carlos', 'con la llave de siempre, Carlos vincula su usuario nuevo a su cuenta');
  r = await j(await interno('estudio', 'palomazi'));
  ok(r.perfil.cuenta === 'carlos', 'y de ahí en adelante entra con su usuario a su mismo avance');
  r = await j(await interno('vincular', 'ana', {}, { 'X-Llave': 'INVENTADA' }));
  ok(r.estado === 401, 'una llave inventada no vincula nada');
}

console.log('El tope de IA por cuenta');
{
  let ultimo;
  for(let k = 0; k < 81; k++) ultimo = await interno('ia-texto', 'beto', { motor: 'groq', mensajes: [] });
  const r = await j(ultimo);
  ok(r.estado === 429 && /Por hoy/.test(r.error), 'una cuenta nueva tiene tope de IA por día (80); la 81 dice «mañana vuelve»');
}

console.log('Compartir un plan');
{
  const plan = { id: 'p1', titulo: 'Examen de Biología', materia: 'Biología', fecha: '2026-11-20', unidades: [{ id: 'u1', titulo: 'Célula', temas: [{ id: 't1', titulo: 'Membrana' }] }], contenido: { t1: { leccion: { titulo: 'Membrana' }, preguntas: [{ tipo: 'opcion' }] } }, progreso: { n1: { hecho: true } }, notas: 'mis notas privadas' };
  await interno('estudio', 'ana', { accion: 'plan', plan });
  let r = await j(await interno('estudio', 'ana', { accion: 'compartir', id: 'p1' }));
  ok(r.bien && /^[A-HJ-NP-Z2-9]{6}$/.test(r.codigo), `sale un código de 6 letras sin letras que se confunden (${r.codigo})`);
  const cod = r.codigo;
  r = await j(await interno('estudio', 'ana', { accion: 'compartir', id: 'p1' }));
  ok(r.codigo === cod, 'el mismo plan da siempre el mismo código');
  r = await j(await interno('estudio', 'beto', { accion: 'traerPlan', codigo: cod.toLowerCase() }));
  ok(r.bien && r.plan.titulo === 'Examen de Biología' && r.plan.contenido.t1.preguntas.length === 1, 'otro lo trae con el código (aunque lo escriba en minúsculas) y le llega con las lecciones ya hechas');
  ok(!r.plan.progreso && !r.plan.notas, 'sin el avance ni las notas de quien lo compartió');
  r = await j(await interno('estudio', 'beto', { accion: 'traerPlan', codigo: 'ZZZZZZ' }));
  ok(r.estado === 404, 'un código que no existe lo dice');
  r = await j(await interno('estudio', 'beto', { accion: 'compartir', id: 'p1' }));
  ok(r.estado === 404, 'nadie puede compartir un plan que no es suyo');
}

console.log('El reparto (index.js)');
{
  const comunidad = { idFromName: () => 'x', get: () => ({ fetch: async (req) => Response.json({ bien: true, yo: req.headers.get('x-token') === 'TOKEN-ANA' ? { usuario: 'ana' } : null }) }) };
  const env = { COMUNIDAD: comunidad, SALA: { idFromName: () => 'g', get: () => ({ fetch: (req) => sala.fetch(req) }) }, ORIGENES: 'https://mazi-central.palomazi9111.workers.dev' };
  const pedir = (ruta, token, cuerpo, h = {}) => worker.fetch(new Request('https://sala.x/api/carymo/' + ruta, { method: cuerpo ? 'POST' : 'GET', headers: { Origin: 'https://mazi-central.palomazi9111.workers.dev', 'Content-Type': 'application/json', ...(token ? { 'x-token': token } : {}), ...h }, body: cuerpo ? JSON.stringify(cuerpo) : undefined }), env, { waitUntil(){} });
  let r = await pedir('estudio', 'TOKEN-ANA');
  ok(r.status === 200 && (await r.json()).perfil.cuenta === 'ana' && r.headers.get('access-control-allow-origin'), 'con el token de su cuenta, CARYMO responde (y con CORS para el teléfono)');
  r = await pedir('estudio', 'TOKEN-FALSO');
  const jr = await r.json();
  ok(r.status === 401 && jr.cuenta === true, 'un token que no es de nadie: 401 y la app sabe que tiene que pedir entrar');
  r = await worker.fetch(new Request('https://sala.x/api/carymo/hilo', { headers: { 'x-token': 'TOKEN-ANA' } }), env, {});
  ok(r.status === 404, 'por /api/carymo sólo existen estudio, ia-texto, ia-voz y vincular');
}

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
