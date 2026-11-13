/* ══════════════════════════════════════════════════════════════════════════
   ESTUDIO · /api/sala/<CODIGO>/estudio
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 12 nov: «una app tipo Duolingo tipo Knowunity conectada a la sala».
   La página (sala/estudio.html) arma planes de examen con la IA y los juega
   como un camino; aquí vive lo que tiene que verse igual en todos los
   teléfonos y lo que se compite entre cuentas:

     est:perfil:<cuenta>      { nombre, xp, racha, mejorRacha, ultimoDia, congeladas, horario, ids }
     est:sem:<AAAA-Snn>       { <cuenta>: { xp, nombre } }      el ranking de la semana
     est:planes:<cuenta>      { id: { id, titulo, materia, fecha, t, borrado? } }
     est:plan:<cuenta>:<id>   el plan entero (camino, lecciones ya hechas, progreso)

   Reglas que no se ven y que importan:
   · El XP llega como EVENTOS con id: un teléfono que reintenta sin red no
     suma dos veces (se guardan los últimos 400 ids).
   · La racha se cuenta por DÍA de México, que manda el teléfono; si el día
     que dice está a más de 2 días del del servidor, se usa el del servidor
     (un reloj mal puesto no regala rachas).
   · Si te saltas UN día y tienes racha congelada, se gasta sola y la racha
     sigue. Cada 7 días seguidos se gana una (tope 2).
   · El progreso de un plan se JUNTA (lo hecho en un teléfono no lo borra
     otro que iba atrasado); lo demás del plan gana el que guardó al último.

   Sin `cloudflare:workers`: las pruebas cargan esto en Node.
   ═════════════════════════════════════════════════════════════════════════ */
import { atenderAvisos, avisoDePrueba } from './avisos-estudio.js';
import { atenderVestidor } from './vestidor.js';
import { LIGAS, grupoDe, reglasDe, resultadoSemana, TAM_GRUPO } from '../../carymo/ligas.js';
import { conEconomia, premiar, premiarUnaVez, cobrarNivel, estudioAnima, comprar, cuidar, PREMIOS, TIENDA, nivelDe, animoDe, parejaDe, avanzarRachaJuntos, rachaJuntosHoy, crecer, crianza, vivas } from './palomium.js';
import { ESPECIES } from '../../carymo/crianza-datos.js';
export const MAX_PLAN = 1_500_000;
const kPerfil = (c) => `est:perfil:${c}`;
const kSem = (s) => `est:sem:${s}`;
const kPlanes = (c) => `est:planes:${c}`;
const kPlan = (c, id) => `est:plan:${c}:${id}`;
const idValido = (x) => typeof x === 'string' && /^[a-z0-9_-]{1,40}$/i.test(x);
const limpio = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const DIA_MS = 864e5;
/* los códigos para compartir: sin O, 0, I, 1 ni L, que en un teléfono se confunden */
const LETRAS_COD = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/* el día de México (UTC−6, sin horario de verano desde 2022) */
export const diaMexico = (ms) => new Date(ms - 6 * 36e5).toISOString().slice(0, 10);
const aMs = (dia) => Date.parse(dia + 'T00:00:00Z');
const valeDia = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(aMs(d));
/* semana ISO: «2026-S46». El lunes empieza la semana, como en la escuela. */
export function semanaDe(dia){
  const d = new Date(aMs(dia));
  const dow = (d.getUTCDay() + 6) % 7;                 /* lunes = 0 */
  d.setUTCDate(d.getUTCDate() - dow + 3);              /* el jueves de esa semana decide el año */
  const anio = d.getUTCFullYear();
  const n = Math.ceil(((d - Date.UTC(anio, 0, 1)) / DIA_MS + 1) / 7);
  return `${anio}-S${String(n).padStart(2, '0')}`;
}

function perfilNuevo(cuenta){
  return { cuenta, nombre: cuenta.charAt(0).toUpperCase() + cuenta.slice(1), xp: 0, racha: 0, mejorRacha: 0, ultimoDia: '', congeladas: 0, horario: null, ids: [], t: 0, liga: 0, ligaMax: 0, vitrina: { bronce: { semanas: 0, podios: 0, mejor: 0 } } };
}
const publico = (p) => { const { ids, premiados, ligaAviso, avisoMascota, mimosDia, ...resto } = p; return { ...resto, nivel: nivelDe(p.xp || 0), siente: p.cuidado ? animoDe(p.cuidado) : 'feliz' }; };

/* la racha: qué pasa al estudiar el día `dia` */
export function avanzarRacha(p, dia){
  const eventos = [];
  if(p.ultimoDia === dia) return eventos;
  const brinco = p.ultimoDia ? Math.round((aMs(dia) - aMs(p.ultimoDia)) / DIA_MS) : 0;
  if(p.ultimoDia && brinco < 0) return eventos;        /* un día viejo (reintento atrasado) no mueve nada */
  if(p.ultimoDia && brinco === 1) p.racha += 1;
  else if(p.ultimoDia && brinco === 2 && p.congeladas > 0){ p.congeladas -= 1; p.racha += 1; eventos.push('congelada-usada'); }
  else { if(p.racha > 1) eventos.push('racha-perdida'); p.racha = 1; }
  p.ultimoDia = dia;
  p.mejorRacha = Math.max(p.mejorRacha, p.racha);
  eventos.push('racha');
  if(p.racha > 0 && p.racha % 7 === 0 && p.congeladas < 2){ p.congeladas += 1; eventos.push('congelada-ganada'); }
  return eventos;
}

/* ══ LIGAS (carymo/ligas.js tiene las reglas) ══
     est:miembros            { <cuenta>: { nombre, liga } }   quién está en qué liga, aunque no haya estudiado esta semana
   Carlos, 14 nov: «no se ve la tabla y eso no invita a la competitividad». Antes la tabla sólo traía a quien
   ya ganó XP esta semana: el lunes salías solo. Ahora trae a TU liga completa (los que no han estudiado, con 0
   y abajo) y aparte a tus amigos, para que siempre haya a quién alcanzar. */
const K_MIEMBROS = 'est:miembros';
async function apuntarMiembro(storage, cuenta, nombre, liga){
  const m = (await storage.get(K_MIEMBROS)) || {};
  const v = m[cuenta];
  if(v && v.nombre === nombre && (v.liga | 0) === (liga | 0)) return m;
  m[cuenta] = { nombre, liga: liga | 0 };
  await storage.put(K_MIEMBROS, m);
  return m;
}
/* cerrar la semana que quedó pendiente: sube, baja o se queda, y la vitrina */
function cerrarLiga(tabla, perfil, cuenta){
  const r = resultadoSemana(tabla || {}, cuenta, perfil.ligaSem);
  perfil.ligaSem = null;
  if(!r) return null;
  perfil.liga = Math.max(0, Math.min(LIGAS.length - 1, r.nueva));
  perfil.ligaMax = Math.max(perfil.ligaMax | 0, perfil.liga);
  const v = perfil.vitrina || (perfil.vitrina = {});
  const de = LIGAS[r.liga].id;
  v[de] = v[de] || { semanas: 0, podios: 0, mejor: 0 };
  v[de].semanas += 1;
  if(r.lugar <= 3 && r.n >= 2) v[de].podios += 1;
  v[de].mejor = v[de].mejor ? Math.min(v[de].mejor, r.lugar) : r.lugar;
  if(r.nueva !== r.liga){ const a = LIGAS[perfil.liga].id; v[a] = v[a] || { semanas: 0, podios: 0, mejor: 0 }; }
  perfil.ligaAviso = { ...r, de: LIGAS[r.liga].nombre, a: LIGAS[perfil.liga].nombre };
  return perfil.ligaAviso;
}
/* cuánto falta para que cierre la semana (domingo a medianoche en México) */
function cierraEn(dia, ahora){
  const d = new Date(aMs(dia)); const dow = (d.getUTCDay() + 6) % 7;
  return Math.max(0, aMs(dia) + (7 - dow) * DIA_MS + 6 * 36e5 - ahora);
}
async function ranking(storage, semana, cuenta, perfil, dia, ahora){
  const tabla = (await storage.get(kSem(semana))) || {};
  const miembros = (await storage.get(K_MIEMBROS)) || {};
  const liga = perfil.liga | 0;
  const grupo = grupoDe(tabla, cuenta, semana, liga).map((f) => ({ ...f, nombre: f.cuenta === cuenta ? perfil.nombre : (miembros[f.cuenta]?.nombre || f.nombre) }));
  const activos = grupo.filter((f) => f.xp > 0).length;
  /* los de tu liga que aún no estudian esta semana: abajo, con 0, para llenar el grupo */
  const ya = new Set(grupo.map((f) => f.cuenta));
  const quietos = Object.entries(miembros).filter(([k, v]) => !ya.has(k) && (v.liga | 0) === liga && !(tabla[k]?.xp > 0))
    .map(([k, v]) => ({ cuenta: k, nombre: v.nombre || k, xp: 0 })).sort((a, b) => a.nombre.localeCompare(b.nombre)).slice(0, Math.max(0, TAM_GRUPO - grupo.length));
  const am = await amigosDe(storage, cuenta);
  const amigos = [cuenta, ...am.amigos.filter((k) => k !== cuenta)].slice(0, 200).map((k) => ({ cuenta: k, nombre: k === cuenta ? perfil.nombre : (miembros[k]?.nombre || tabla[k]?.nombre || k), xp: tabla[k]?.xp || 0, liga: k === cuenta ? liga : (miembros[k]?.liga | 0) }))
    .sort((a, b) => b.xp - a.xp || a.nombre.localeCompare(b.nombre));
  return { semana, liga, filas: grupo.concat(quietos), activos, reglas: reglasDe(liga, Math.max(activos, 1)), amigos, cierra: cierraEn(dia, ahora) };
}

/* junta el progreso de dos versiones de un plan: lo hecho se queda hecho y gana la mejor calificación */
export function juntarProgreso(a = {}, b = {}){
  const r = { ...a };
  for(const [id, x] of Object.entries(b || {})){
    const y = r[id];
    if(!y){ r[id] = x; continue; }
    r[id] = { ...y, ...x, hecho: !!(y.hecho || x.hecho), mejor: Math.max(y.mejor || 0, x.mejor || 0), veces: Math.max(y.veces || 0, x.veces || 0) };
  }
  return r;
}

/* ══ LA BIBLIOTECA · lo que la IA ya armó una vez, para el que pida lo mismo ══
   Carlos, 13 nov: «a todos los cursos que se hagan guárdalos en memoria para que la
   siguiente persona que pida lo mismo ya haya una base de donde partir y se gasten menos
   tokens». Es de TODA la sala, no de una cuenta: el que estudia Biología mañana usa la
   lección que la IA le armó a otro hoy.

     est:mem:<tipo>:<clave>    { tipo, materia, titulo, nivel, datos, usos, t, de }
     est:mem:i:<tipo>          [{ clave, materia, titulo, nivel, palabras, usos, t }]   índice para buscar parecidos

   tipo: 'leccion' (un tema de CARYMO), 'clase' (una clase del pizarrón), 'plan' (un camino).
   Se busca por palabras: mismas palabras clave de materia + tema + nivel = misma cosa, aunque
   cambien acentos, mayúsculas, artículos u orden. Nada con fotos ni datos del alumno entra
   aquí: la página sólo manda lo que se armó con texto (ver `recordar` en carymo.js). */
export const TIPOS_MEM = ['leccion', 'clase', 'plan'];
const MAX_MEM = 120_000, MAX_INDICE = 3000;
const VACIAS = new Set('el la los las un una unos unas de del al a y e o u en con por para que como sus su se lo le es son mi tu tus mis sobre entre sin'.split(' '));
export function palabrasDe(t){
  return [...new Set(String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/)
    .filter((w) => w.length > 1 && !VACIAS.has(w)).map((w) => w.length > 4 ? w.replace(/(es|s)$/, '') : w))].sort();
}
const parecido = (a, b) => { if(!a.length || !b.length) return 0; const B = new Set(b); const comun = a.filter((w) => B.has(w)).length; return comun / (a.length + b.length - comun); };
const claveDe = (tipo, materia, titulo, nivel) => [tipo, palabrasDe(materia).join('-'), palabrasDe(titulo).join('-'), limpio(nivel, 20).toLowerCase()].join('|').slice(0, 300);
export async function buscarEnMemoria(storage, { tipo, materia, titulo, nivel }){
  if(!TIPOS_MEM.includes(tipo) || !limpio(titulo, 300)) return null;
  const exacta = await storage.get(`est:mem:${tipo}:${claveDe(tipo, materia, titulo, nivel)}`);
  if(exacta) return { ...exacta, parecido: 1 };
  const indice = (await storage.get(`est:mem:i:${tipo}`)) || [];
  const pm = palabrasDe(materia), pt = palabrasDe(titulo), nv = limpio(nivel, 20).toLowerCase();
  let mejor = null, mejorS = 0;
  for(const x of indice){
    if((x.nivel || '') !== nv) continue;
    if(pm.length && x.materia && parecido(pm, palabrasDe(x.materia)) < .5) continue;
    const sc = parecido(pt, x.palabras || []);
    if(sc > mejorS){ mejorS = sc; mejor = x; }
  }
  if(!mejor || mejorS < .75) return null;
  const it = await storage.get(`est:mem:${tipo}:${mejor.clave}`);
  return it ? { ...it, parecido: Math.round(mejorS * 100) / 100 } : null;
}
export async function guardarEnMemoria(storage, { tipo, materia, titulo, nivel, datos }, cuenta, ahora = Date.now()){
  if(!TIPOS_MEM.includes(tipo)) return { error: 'No sé guardar ese tipo.' };
  titulo = limpio(titulo, 300); materia = limpio(materia, 80); nivel = limpio(nivel, 20).toLowerCase();
  if(!titulo || !datos || typeof datos !== 'object') return { error: 'Falta qué guardar.' };
  if(JSON.stringify(datos).length > MAX_MEM) return { error: 'Es demasiado grande para la biblioteca.' };
  const clave = claveDe(tipo, materia, titulo, nivel), k = `est:mem:${tipo}:${clave}`;
  const viejo = await storage.get(k);
  await storage.put(k, { tipo, materia, titulo, nivel, datos, usos: viejo?.usos || 0, t: ahora, de: cuenta });
  const indice = ((await storage.get(`est:mem:i:${tipo}`)) || []).filter((x) => x.clave !== clave);
  indice.push({ clave, materia, titulo, nivel, palabras: palabrasDe(titulo), usos: viejo?.usos || 0, t: ahora });
  /* si crece de más, se van los que menos se usan y más viejos */
  if(indice.length > MAX_INDICE){ indice.sort((a, b) => (b.usos - a.usos) || (b.t - a.t)); for(const x of indice.splice(MAX_INDICE)) await storage.delete(`est:mem:${tipo}:${x.clave}`); }
  await storage.put(`est:mem:i:${tipo}`, indice);
  return { bien: true, clave };
}

/* ══ AMIGOS · estudiar juntos, saludos, felicitaciones y cómo te fue en el examen ══
   Carlos, 13 nov: «un sistema de amigos para machear a otra persona que esté con la app abierta
   y ofrecerle jugar juntos… se ponga un timer y los dos tengamos que estudiar durante ese tiempo…
   para dar saludos, felicitaciones cuando estudien, y cuando sea su examen una retroalimentación
   de cómo le fue, y guardar esos datos en su historial».

     est:pres                  { <cuenta>: { nombre, t, estado, materia } }      quién tiene la app abierta
     est:amigos:<cuenta>       { amigos: [cuenta], pide: [cuenta] }               «pide» = quién me mandó solicitud
     est:buzon:<cuenta>        [{ id, de, nombre, tipo, texto, t, sesion? }]       los últimos 60
     est:ses:<id>              { id, de, a, nombres, minutos, estado, inicio, fin, xp: { cuenta: n } }
     est:sesactual:<cuenta>    id de la sesión invitada o activa
     est:examenes:<cuenta>     [{ plan, titulo, materia, fecha, como, calif, nota, t }]
   «En línea» = mandó latido hace menos de 45 s (la app lo manda cada 20 s mientras está abierta). */
export const EN_LINEA_MS = 45_000;
const kAmigos = (c) => `est:amigos:${c}`, kBuzon = (c) => `est:buzon:${c}`, kSes = (id) => `est:ses:${id}`, kSesAct = (c) => `est:sesactual:${c}`, kExam = (c) => `est:examenes:${c}`;
const TIPOS_MSG = { saludo: 'te saludó', felicita: 'te felicitó', invita: 'te invita a estudiar juntos', acepta: 'aceptó estudiar contigo', rechaza: 'ahorita no puede estudiar',
  amistad: 'quiere ser tu amigo', amigos: 'ya es tu amigo', examen: 'ya hizo su examen', fin: 'terminó la sesión contigo', estudio: 'acaba de estudiar' };
async function amigosDe(storage, c){ return (await storage.get(kAmigos(c))) || { amigos: [], pide: [] }; }
async function alBuzon(storage, para, m, ahora){
  const b = (await storage.get(kBuzon(para))) || [];
  b.push({ id: ahora.toString(36) + Math.random().toString(36).slice(2, 6), t: ahora, ...m });
  await storage.put(kBuzon(para), b.slice(-60));
}
async function sesionDe(storage, c, ahora){
  const id = await storage.get(kSesAct(c)); if(!id) return null;
  const x = await storage.get(kSes(id)); if(!x) return null;
  /* una invitación sin contestar se vence a los 2 minutos; una sesión activa, al acabarse su tiempo */
  if(x.estado === 'invitada' && ahora - x.creada > 120_000){ x.estado = 'vencida'; await storage.put(kSes(id), x); }
  if(x.estado === 'activa' && ahora >= x.fin){ x.estado = 'terminada'; await storage.put(kSes(id), x); }
  return x;
}
/* ── LOS MODOS DE «ESTUDIAR JUNTOS» (Carlos, 13 nov: «invéntate más maneras de poder hacerlo de lo de los cooperativos»)
   duelo:      gana el que junte más XP (el de siempre)
   equipo:     los dos suman a UNA meta (4 XP por minuto); si llegan, premio para los dos
   jefe:       un jefe con vida (6 por minuto) que se CURA solo (1 cada 20 s): hay que no dormirse
   relevo:     turnos de 5 minutos; sólo cuenta para el equipo lo que estudia quien tiene el turno (meta: 3 por minuto)
   biblioteca: sin marcador, en silencio; si los dos estudiaron algo y nadie se salió, premio para los dos */
export const MODOS_JUNTOS = ['duelo', 'equipo', 'jefe', 'relevo', 'biblioteca'];
const POR_MINUTO = { equipo: 4, jefe: 6, relevo: 3 };
export const TURNO_MS = 5 * 60_000;
export function turnoDe(x, ahora){ if(!x.inicio) return x.de; return Math.floor((Math.min(ahora, x.fin) - x.inicio) / TURNO_MS) % 2 === 0 ? x.de : x.a; }
export function vidaJefe(x, ahora){ if(x.modo !== 'jefe' || !x.inicio) return x.meta || 0; const cura = Math.floor((Math.min(ahora, x.logrado || x.fin) - x.inicio) / 20_000); return Math.max(0, x.meta + cura - (x.equipo || 0)); }
function logroDe(x, ahora){
  if(x.logrado || !['equipo', 'jefe', 'relevo'].includes(x.modo)) return;
  if(x.modo === 'jefe' ? vidaJefe(x, ahora) <= 0 : (x.equipo || 0) >= x.meta) x.logrado = ahora;
}
/* el premio de la sesión: cada quien lo cobra una vez, cuando estudia o cuando la cierra */
function premioDeSesion(perfil, x, hoy, cuenta){
  if(x.logrado && ['equipo', 'jefe', 'relevo'].includes(x.modo)) return { motivo: x.modo, cubos: premiarUnaVez(perfil, x.modo, `${x.modo}:${x.id}`, hoy) };
  if(x.modo === 'biblioteca' && x.estado === 'terminada' && !x.salio && Object.values(x.xp || {}).every((v) => v > 0) && cuenta) return { motivo: 'biblioteca', cubos: premiarUnaVez(perfil, 'biblioteca', `biblioteca:${x.id}`, hoy) };
  return null;
}
async function soltarSesion(storage, x){ for(const c of [x.de, x.a]){ if((await storage.get(kSesAct(c))) === x.id) await storage.delete(kSesAct(c)); } }

async function atenderAmigos(storage, c, cuenta, perfil, ahora){
  const yo = { cuenta, nombre: perfil.nombre };
  const otro = limpio(c.a || c.de || '', 40).toLowerCase();
  if(c.accion === 'latido'){
    if(!(await storage.get(kPerfil(cuenta)))){ perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil); }
    const pres = (await storage.get('est:pres')) || {};
    pres[cuenta] = { nombre: perfil.nombre, t: ahora, estado: ['estudiando', 'libre'].includes(c.estado) ? c.estado : 'libre', materia: limpio(c.materia, 60) };
    for(const k of Object.keys(pres)) if(ahora - pres[k].t > 10 * 60_000) delete pres[k];
    await storage.put('est:pres', pres);
    const mis = await amigosDe(storage, cuenta);
    const enLinea = Object.entries(pres).filter(([k, v]) => k !== cuenta && ahora - v.t < EN_LINEA_MS)
      .map(([k, v]) => ({ cuenta: k, nombre: v.nombre, estado: v.estado, materia: v.materia, amigo: mis.amigos.includes(k) }));
    const desde = Number(c.desde) || 0, buzon = ((await storage.get(kBuzon(cuenta))) || []).filter((m) => m.t > desde);
    const ses = await sesionDe(storage, cuenta, ahora);
    const nombres = {}; for(const k of mis.amigos.concat(mis.pide)){ const p = await storage.get(kPerfil(k)); nombres[k] = p ? p.nombre : k; }
    const rachas = {}; for(const k of mis.amigos) rachas[k] = rachaJuntosHoy(await storage.get('est:rjuntos:' + parejaDe(cuenta, k)), diaMexico(ahora));
    return { bien: true, enLinea, amigos: mis.amigos.map((k) => ({ cuenta: k, nombre: nombres[k], enLinea: !!(pres[k] && ahora - pres[k].t < EN_LINEA_MS), estado: pres[k]?.estado || '', rachaJuntos: rachas[k] })),
      pide: mis.pide.map((k) => ({ cuenta: k, nombre: nombres[k] })), buzon, sesion: ses, hora: ahora };
  }
  if(!idValido(otro) || otro === cuenta) return { error: 'Falta a quién.', estado: 400 };
  const suPerfil = await storage.get(kPerfil(otro));
  if(!suPerfil) return { error: 'Esa persona todavía no usa CARYMO.', estado: 404 };
  const mis = await amigosDe(storage, cuenta), suyos = await amigosDe(storage, otro);
  const sonAmigos = mis.amigos.includes(otro);

  if(c.accion === 'amistad'){
    if(sonAmigos) return { bien: true, amigos: true };
    if(mis.pide.includes(otro)){                      /* ya me la había pedido: con esto ya somos amigos */
      mis.pide = mis.pide.filter((x) => x !== otro); mis.amigos.push(otro); suyos.amigos.push(cuenta); suyos.pide = suyos.pide.filter((x) => x !== cuenta);
      await storage.put(kAmigos(cuenta), mis); await storage.put(kAmigos(otro), suyos);
      await alBuzon(storage, otro, { de: cuenta, nombre: perfil.nombre, tipo: 'amigos' }, ahora);
      return { bien: true, amigos: true };
    }
    if(!suyos.pide.includes(cuenta)){ suyos.pide.push(cuenta); suyos.pide = suyos.pide.slice(-50); await storage.put(kAmigos(otro), suyos); await alBuzon(storage, otro, { de: cuenta, nombre: perfil.nombre, tipo: 'amistad' }, ahora); }
    return { bien: true, pedida: true };
  }
  if(c.accion === 'quitarAmigo'){
    mis.amigos = mis.amigos.filter((x) => x !== otro); mis.pide = mis.pide.filter((x) => x !== otro); suyos.amigos = suyos.amigos.filter((x) => x !== cuenta);
    await storage.put(kAmigos(cuenta), mis); await storage.put(kAmigos(otro), suyos);
    return { bien: true };
  }
  /* saludos y felicitaciones: con tope, para que nadie llene el buzón de otro */
  if(c.accion === 'mandar'){
    const tipo = ['saludo', 'felicita'].includes(c.tipo) ? c.tipo : 'saludo';
    const k = `est:tope:${cuenta}:${new Date(ahora).toISOString().slice(0, 13)}`, n = (await storage.get(k)) || 0;
    if(n >= 30) return { error: 'Ya mandaste muchos esta hora. Al rato.', estado: 429 };
    await storage.put(k, n + 1);
    await alBuzon(storage, otro, { de: cuenta, nombre: perfil.nombre, tipo, texto: limpio(c.texto, 120) }, ahora);
    return { bien: true };
  }
  /* estudiar juntos: se invita a alguien en línea (amigo o no) por N minutos */
  if(c.accion === 'invitar'){
    const pres = (await storage.get('est:pres')) || {};
    if(!pres[otro] || ahora - pres[otro].t > EN_LINEA_MS) return { error: 'Esa persona ya no está en línea.', estado: 409 };
    for(const q of [cuenta, otro]){ const x = await sesionDe(storage, q, ahora); if(x && (x.estado === 'activa' || x.estado === 'invitada')) return { error: q === cuenta ? 'Ya tienes una sesión.' : 'Esa persona ya está estudiando con alguien.', estado: 409 }; }
    const minutos = [10, 15, 25, 45].includes(Number(c.minutos)) ? Number(c.minutos) : 25;
    const modo = MODOS_JUNTOS.includes(c.modo) ? c.modo : 'duelo';
    const x = { modo, meta: (POR_MINUTO[modo] || 0) * minutos, equipo: 0, id: 's' + ahora.toString(36) + Math.random().toString(36).slice(2, 6), de: cuenta, a: otro, nombres: { [cuenta]: perfil.nombre, [otro]: suPerfil.nombre }, minutos, estado: 'invitada', creada: ahora, xp: { [cuenta]: 0, [otro]: 0 } };
    await storage.put(kSes(x.id), x); await storage.put(kSesAct(cuenta), x.id); await storage.put(kSesAct(otro), x.id);
    await alBuzon(storage, otro, { de: cuenta, nombre: perfil.nombre, tipo: 'invita', texto: `${minutos} minutos`, modo, sesion: x.id }, ahora);
    return { bien: true, sesion: x };
  }
  return null;
}
async function atenderSesion(storage, c, cuenta, perfil, ahora){
  const x = await sesionDe(storage, cuenta, ahora);
  if(!x || (c.sesion && x.id !== c.sesion)) return { error: 'Esa sesión ya no existe.', estado: 404 };
  const el = x.de === cuenta ? x.a : x.de;
  if(c.accion === 'responder'){
    if(x.a !== cuenta || x.estado !== 'invitada') return { error: 'Esa invitación ya no está.', estado: 409 };
    if(c.si){ x.estado = 'activa'; x.inicio = ahora; x.fin = ahora + x.minutos * 60_000; await storage.put(kSes(x.id), x); await alBuzon(storage, el, { de: cuenta, nombre: perfil.nombre, tipo: 'acepta', sesion: x.id }, ahora); }
    else { x.estado = 'rechazada'; await storage.put(kSes(x.id), x); await soltarSesion(storage, x); await alBuzon(storage, el, { de: cuenta, nombre: perfil.nombre, tipo: 'rechaza' }, ahora); }
    return { bien: true, sesion: x };
  }
  if(c.accion === 'salirSesion'){
    if(x.estado === 'activa' || x.estado === 'invitada'){ x.estado = x.estado === 'activa' ? 'terminada' : 'cancelada'; x.fin = Math.min(x.fin || ahora, ahora); x.salio = cuenta; await storage.put(kSes(x.id), x); await alBuzon(storage, el, { de: cuenta, nombre: perfil.nombre, tipo: 'fin', sesion: x.id }, ahora); }
    /* Carlos, 13 nov: «nunca acabó el tiempo pero desapareció el timer». Cuando uno salía, se le borraba la
       sesión a LOS DOS y al otro se le esfumaba el cronómetro sin ver el final. Ahora sólo se suelta la de
       quien sale; el otro ve el final («salió antes») y la suelta al cerrarlo. */
    if((await storage.get(kSesAct(cuenta))) === x.id) await storage.delete(kSesAct(cuenta));
    if(x.estado === 'cancelada' || x.estado === 'rechazada') await soltarSesion(storage, x);
    /* el premio del modo cooperativo, si se ganó y esta persona no lo había cobrado */
    const pr = premioDeSesion(perfil, x, diaMexico(ahora), cuenta), premios = pr && pr.cubos ? [{ motivo: pr.motivo, cubos: pr.cubos, que: PREMIOS[pr.motivo].que }] : [];
    if(premios.length){ perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil); }
    return { bien: true, sesion: x, premios, perfil: premios.length ? publico(perfil) : undefined };
  }
  return null;
}

export async function atenderEstudio(storage, pedido, url, cuenta, ahora = Date.now(), { vapid, enviar } = {}){
  cuenta = limpio(cuenta || 'invitado', 40).toLowerCase() || 'invitado';
  const hoy = diaMexico(ahora);
  const perfil = conEconomia((await storage.get(kPerfil(cuenta))) || perfilNuevo(cuenta), ahora);
  const indice = (await storage.get(kPlanes(cuenta))) || {};
  /* la semana que estudiaste ya cerró: se decide si subes o bajas antes de cualquier otra cosa */
  if(perfil.ligaSem && perfil.ligaSem !== semanaDe(hoy)){
    cerrarLiga(await storage.get(kSem(perfil.ligaSem)), perfil, cuenta);
    perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil);
  }
  /* el aviso de liga se entrega una sola vez */
  const avisoLiga = async () => { const a = perfil.ligaAviso; if(!a) return undefined; delete perfil.ligaAviso; await storage.put(kPerfil(cuenta), perfil); return a; };
  /* si tu mascota se murió mientras no estabas, se avisa una sola vez */
  const avisoMasc = async () => { const a = perfil.avisoMascota; if(!a) return undefined; delete perfil.avisoMascota; await storage.put(kPerfil(cuenta), perfil); return a; };

  if(pedido.method === 'GET'){
    const id = url.searchParams.get('plan');
    if(id){
      const plan = idValido(id) && await storage.get(kPlan(cuenta, id));
      if(!plan || indice[id]?.borrado) return Response.json({ error: 'Ese plan ya no existe.' }, { status: 404 });
      return Response.json({ bien: true, plan });
    }
    if(url.searchParams.get('tienda')) return Response.json({ bien: true, tienda: TIENDA, premios: PREMIOS, perfil: publico(perfil) });
    await apuntarMiembro(storage, cuenta, perfil.nombre, perfil.liga);
    const ligaAviso = await avisoLiga();
    const mascotaAviso = await avisoMasc();
    return Response.json({ bien: true, hoy, perfil: publico(perfil), planes: Object.values(indice), ranking: await ranking(storage, semanaDe(hoy), cuenta, perfil, hoy, ahora), liga: ligaAviso, mascota: mascotaAviso, hora: ahora });
  }
  if(pedido.method !== 'POST') return Response.json({ error: 'Usa GET o POST.' }, { status: 405 });

  const crudo = await pedido.text().catch(() => '');
  if(crudo.length > MAX_PLAN + 50_000) return Response.json({ error: 'El plan es demasiado grande para guardarlo.' }, { status: 413 });
  let c; try{ c = JSON.parse(crudo || '{}'); }catch{ return Response.json({ error: 'No entendí la petición.' }, { status: 400 }); }

  /* ── amigos y estudiar juntos ── */
  if(['latido', 'amistad', 'quitarAmigo', 'mandar', 'invitar'].includes(c.accion)){
    const r = await atenderAmigos(storage, c, cuenta, perfil, ahora);
    if(r) return Response.json(r, { status: r.estado || 200 });
  }
  if(['responder', 'salirSesion'].includes(c.accion)){
    const r = await atenderSesion(storage, c, cuenta, perfil, ahora);
    if(r) return Response.json(r, { status: r.estado || 200 });
  }
  /* ── el personaje de perfil (vestidor.js) ── */
  if(['comprarRopa', 'vestir', 'personajes'].includes(c.accion)){
    const r = await atenderVestidor(storage, c, cuenta, perfil, ahora);
    if(r && r.bien && c.accion !== 'personajes') r.perfil = publico(perfil);
    if(r) return Response.json(r, { status: r.estado || 200 });
  }
  /* ── los avisos con notificación (avisos-estudio.js) ── */
  if(c.accion === 'avisos'){
    const r = c.que === 'probar'
      ? (enviar ? await avisoDePrueba(storage, cuenta, enviar) : { error: 'Los avisos no están encendidos en el servidor.', estado: 503 })
      : await atenderAvisos(storage, c, cuenta, { publica: vapid ? (await vapid()).publica : '' }, ahora);
    return Response.json(r, { status: r.estado || 200 });
  }
  /* ── cómo te fue en el examen: al historial, y los amigos se enteran para felicitar ── */
  if(c.accion === 'examen'){
    const como = ['excelente', 'bien', 'regular', 'mal'].includes(c.como) ? c.como : '';
    if(!como) return Response.json({ error: 'Dime cómo te fue.' }, { status: 400 });
    const calif = c.calif == null || c.calif === '' ? null : Math.max(0, Math.min(10, Math.round(Number(c.calif) * 10) / 10));
    const h = (await storage.get(kExam(cuenta))) || [];
    const e = { plan: idValido(c.plan) ? c.plan : '', titulo: limpio(c.titulo, 120), materia: limpio(c.materia, 60), fecha: valeDia(c.fecha) ? c.fecha : hoy, como, calif: Number.isFinite(calif) ? calif : null, nota: limpio(c.nota, 400), t: ahora };
    const i = e.plan ? h.findIndex((x) => x.plan === e.plan) : -1; if(i >= 0) h[i] = e; else h.push(e);
    await storage.put(kExam(cuenta), h.slice(-200));
    if(c.avisar !== false){ const mis = await amigosDe(storage, cuenta); for(const a of mis.amigos) await alBuzon(storage, a, { de: cuenta, nombre: perfil.nombre, tipo: 'examen', texto: `${e.materia || e.titulo}: ${{ excelente: 'le fue excelente', bien: 'le fue bien', regular: 'le fue regular', mal: 'no le fue tan bien' }[como]}` }, ahora); }
    return Response.json({ bien: true, examen: e, historial: h.slice(-50) });
  }
  if(c.accion === 'historialExamenes') return Response.json({ bien: true, historial: ((await storage.get(kExam(cuenta))) || []).slice(-50) });

  /* ── la biblioteca compartida ── */
  if(c.accion === 'memoria'){
    const it = await buscarEnMemoria(storage, c);
    if(!it) return Response.json({ bien: true, hallado: null });
    const k = `est:mem:${it.tipo}:${claveDe(it.tipo, it.materia, it.titulo, it.nivel)}`;
    const guardado = await storage.get(k); if(guardado){ guardado.usos = (guardado.usos || 0) + 1; await storage.put(k, guardado); }
    const ki = `est:mem:i:${it.tipo}`, ind = (await storage.get(ki)) || [], x = ind.find((y) => `est:mem:${it.tipo}:${y.clave}` === k);
    if(x){ x.usos = (x.usos || 0) + 1; await storage.put(ki, ind); }
    return Response.json({ bien: true, hallado: { titulo: it.titulo, materia: it.materia, datos: it.datos, parecido: it.parecido, usos: (it.usos || 0) + 1 } });
  }
  if(c.accion === 'recordar'){
    const r = await guardarEnMemoria(storage, c, cuenta, ahora);
    return Response.json(r, { status: r.bien ? 200 : 400 });
  }
  if(c.accion === 'biblioteca'){
    const out = {};
    for(const t of TIPOS_MEM){ const i = (await storage.get(`est:mem:i:${t}`)) || []; out[t] = { cuantos: i.length, usos: i.reduce((a, x) => a + (x.usos || 0), 0) }; }
    return Response.json({ bien: true, ...out });
  }

  /* ── sumar XP (y con eso, la racha y el ranking) ── */
  if(c.accion === 'xp'){
    const eventos = (Array.isArray(c.eventos) ? c.eventos : [c]).slice(0, 50);
    const vistos = new Set(perfil.ids || []);
    let suma = 0, mascotaSube = null; const dijo = [], premios = [];
    const dar = (motivo, n) => { if(n) premios.push({ motivo, cubos: n, que: PREMIOS[motivo].que }); };
    for(const e of eventos){
      if(!e || !idValido(e.id) || vistos.has(e.id)) continue;
      const xp = Math.round(Number(e.xp));
      if(!Number.isFinite(xp) || xp < 0 || xp > 300) continue;     /* nadie gana 10 mil de un jalón */
      let dia = valeDia(e.dia) ? e.dia : hoy;
      if(Math.abs(aMs(dia) - aMs(hoy)) > 2 * DIA_MS) dia = hoy;
      vistos.add(e.id); perfil.ids = [...(perfil.ids || []), e.id].slice(-400);
      perfil.xp += xp; suma += xp;
      for(const ev of avanzarRacha(perfil, dia)){
        dijo.push(ev);
        /* la racha de hoy paga 1; cada 7 días seguidos, 3 más */
        if(ev === 'racha'){ dar('racha', premiar(perfil, 'racha', dia)); if(perfil.racha % 7 === 0) dar('semana', premiar(perfil, 'semana', dia)); }
      }
      /* lo que terminaste: la página dice QUÉ fue; cuánto vale y el tope del día lo pone el servidor */
      if(['leccion', 'grado', 'plan'].includes(e.motivo)) dar(e.motivo, premiar(perfil, e.motivo, dia));
      estudioAnima(perfil, xp);
      { const sube = crecer(perfil, xp); if(sube) mascotaSube = sube; }
      const sem = semanaDe(dia), tabla = (await storage.get(kSem(sem))) || {};
      tabla[cuenta] = { xp: (tabla[cuenta]?.xp || 0) + xp, nombre: perfil.nombre, liga: tabla[cuenta] ? (tabla[cuenta].liga | 0) : (perfil.liga | 0) };
      await storage.put(kSem(sem), tabla);
      if(sem === semanaDe(hoy)) perfil.ligaSem = sem;
    }
    if(c.nombre) perfil.nombre = limpio(c.nombre, 30) || perfil.nombre;
    dar('nivel', cobrarNivel(perfil, hoy));
    /* si estás en una sesión con alguien, lo que estudias cuenta para su marcador (y paga una vez por sesión) */
    if(suma > 0){ const x = await sesionDe(storage, cuenta, ahora); if(x && x.estado === 'activa'){ x.xp[cuenta] = (x.xp[cuenta] || 0) + suma;
      if(x.modo === 'equipo' || x.modo === 'jefe' || (x.modo === 'relevo' && turnoDe(x, ahora) === cuenta)) x.equipo = (x.equipo || 0) + suma;
      logroDe(x, ahora); { const pr = premioDeSesion(perfil, x, hoy, cuenta); if(pr && pr.cubos){ dar(pr.motivo, pr.cubos); dijo.push('logro-juntos'); } }
      await storage.put(kSes(x.id), x); dar('juntos', premiarUnaVez(perfil, 'juntos', 'juntos:' + x.id, hoy));
      /* la racha de la pareja: un día más si ayer también estudiaron juntos; cada 7, premio para los dos (cada quien lo cobra una vez) */
      const par = parejaDe(x.de, x.a), kr = 'est:rjuntos:' + par, r = avanzarRachaJuntos(await storage.get(kr), hoy);
      await storage.put(kr, r);
      if(r.n > 0 && r.n % 7 === 0){ dijo.push('racha-juntos'); dar('rachaJuntos', premiarUnaVez(perfil, 'rachaJuntos', `rj:${par}:${r.ultimoDia}`, hoy)); }
    } }
    perfil.t = ahora;
    await storage.put(kPerfil(cuenta), perfil);
    await apuntarMiembro(storage, cuenta, perfil.nombre, perfil.liga);
    const ligaAviso = await avisoLiga();
    return Response.json({ bien: true, sumado: suma, premios, eventos: [...new Set(dijo)], perfil: publico(perfil), ranking: await ranking(storage, semanaDe(hoy), cuenta, perfil, hoy, ahora), liga: ligaAviso, mascotaSube });
  }

  /* ── COMPARTIR UN PLAN (Carlos, 13 nov) ──
     «si yo copio ese link o el código y lo mando a mi grupo, ellos lo ponen en "añadir curso por link" y ya
     les pone exactamente lo mismo… y así ya no se gastan tokens». Se guarda una COPIA del plan (sin tu avance
     ni tus notas) bajo un código de 6 letras; el mismo plan da siempre el mismo código y la copia se pone
     al día cada vez que lo vuelves a compartir. Quien lo recibe se lo trae entero: camino, lecciones,
     preguntas y cátedras ya hechas. */
  if(c.accion === 'compartir'){
    if(!idValido(c.id)) return Response.json({ error: 'Ese plan no trae id.' }, { status: 400 });
    const plan = await storage.get(kPlan(cuenta, c.id));
    if(!plan || indice[c.id]?.borrado) return Response.json({ error: 'Ese plan ya no existe.' }, { status: 404 });
    const { progreso, notas, fotos, cambio, t, ...copia } = plan;
    const kYa = `est:comp:i:${cuenta}:${c.id}`;
    let codigo = await storage.get(kYa);
    if(!codigo){ for(let k = 0; k < 8; k++){ const n = crypto.getRandomValues(new Uint8Array(6)); const x = [...n].map((b) => LETRAS_COD[b % LETRAS_COD.length]).join(''); if(!(await storage.get('est:comp:' + x))){ codigo = x; break; } } }
    if(!codigo) return Response.json({ error: 'No se pudo sacar un código. Intenta otra vez.' }, { status: 503 });
    const viejo = await storage.get('est:comp:' + codigo);
    await storage.put({ ['est:comp:' + codigo]: { plan: copia, de: perfil.nombre, cuenta, t: ahora, usos: (viejo && viejo.usos) || 0 }, [kYa]: codigo });
    return Response.json({ bien: true, codigo });
  }
  if(c.accion === 'traerPlan'){
    const codigo = limpio(c.codigo, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const x = codigo.length === 6 && await storage.get('est:comp:' + codigo);
    if(!x) return Response.json({ error: 'Ese código no existe. Revisa que sean las 6 letras.' }, { status: 404 });
    x.usos = (x.usos || 0) + 1; await storage.put('est:comp:' + codigo, x);
    return Response.json({ bien: true, plan: x.plan, de: x.de, usos: x.usos });
  }

  /* ── la tienda y el cuarto de la mascota (palomium.js) ── */
  if(c.accion === 'comprar' || c.accion === 'cuidar'){
    const r = c.accion === 'comprar' ? comprar(perfil, String(c.item || ''), c.cuantos) : cuidar(perfil, String(c.que || ''), String(c.item || ''));
    if(r.error) return Response.json({ ...r, perfil: publico(perfil) }, { status: 400 });
    perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil);
    return Response.json({ ...r, perfil: publico(perfil) });
  }
  /* la mascota que elegiste y su voz (0, 1 o 2), para que al volver siga igual */
  /* la crianza: adoptar, cambiar, vestir, comprar ropa y ponerle nombre (palomium.js) */
  if(c.accion === 'crianza'){
    const r = crianza(perfil, c, ahora);
    if(r.error) return Response.json({ ...r, perfil: publico(perfil) }, { status: 400 });
    perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil);
    return Response.json({ ...r, perfil: publico(perfil) });
  }
  if(c.accion === 'mascota'){
    /* elegir: si ya es tuya (y vive), queda como tu compañera; si no tienes ninguna viva, la primera es gratis; si no, hay que adoptarla */
    if(typeof c.personaje === 'string' && /^[a-z]{1,20}$/.test(c.personaje)){
      const q = c.personaje, m = perfil.mascotas[q];
      if(q === 'no' || (m && !m.muerta)) perfil.mascota = q;
      else if(ESPECIES[q] && !vivas(perfil).length) crianza(perfil, { que: 'adoptar', especie: q }, ahora);
      else if(ESPECIES[q]) return Response.json({ error: `Primero adopta a tu ${ESPECIES[q].nombre.toLowerCase()} en el cuarto de tu compañero.`, adoptar: q, precio: ESPECIES[q].precio, perfil: publico(perfil) }, { status: 400 });
    }
    if(c.voz != null && typeof c.personaje === 'string' && /^[a-z]{1,20}$/.test(c.personaje)) perfil.voces[c.personaje] = Math.max(0, Math.min(2, Math.round(Number(c.voz)) || 0));
    perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil);
    return Response.json({ bien: true, perfil: publico(perfil) });
  }

  /* ── nombre y horario ── */
  if(c.accion === 'perfil'){
    if('nombre' in c){ const n = limpio(c.nombre, 30); if(!n) return Response.json({ error: 'Ponte un nombre.' }, { status: 400 }); perfil.nombre = n; }
    if('horario' in c){
      const h = c.horario;
      if(h !== null && (typeof h !== 'object' || JSON.stringify(h).length > 30_000)) return Response.json({ error: 'Ese horario no se puede guardar.' }, { status: 400 });
      perfil.horario = h;
    }
    perfil.t = ahora;
    await storage.put(kPerfil(cuenta), perfil);
    /* el nombre nuevo también en el ranking de esta semana */
    const sem = semanaDe(hoy), tabla = await storage.get(kSem(sem));
    if(tabla && tabla[cuenta]){ tabla[cuenta].nombre = perfil.nombre; await storage.put(kSem(sem), tabla); }
    await apuntarMiembro(storage, cuenta, perfil.nombre, perfil.liga);
    return Response.json({ bien: true, perfil: publico(perfil) });
  }

  /* ── guardar un plan ── */
  if(c.accion === 'plan'){
    const p = c.plan;
    if(!p || typeof p !== 'object' || !idValido(p.id)) return Response.json({ error: 'Ese plan no trae id.' }, { status: 400 });
    if(indice[p.id]?.borrado) return Response.json({ error: 'Ese plan ya se borró.', borrado: true }, { status: 409 });
    const viejo = await storage.get(kPlan(cuenta, p.id));
    const nuevo = { ...p, progreso: juntarProgreso(viejo?.progreso, p.progreso), t: Math.max(ahora, (viejo?.t || 0) + 1) };
    if(JSON.stringify(nuevo).length > MAX_PLAN) return Response.json({ error: 'El plan es demasiado grande para guardarlo.' }, { status: 413 });
    await storage.put(kPlan(cuenta, p.id), nuevo);
    indice[p.id] = { id: p.id, titulo: limpio(p.titulo, 120), materia: limpio(p.materia, 60), fecha: limpio(p.fecha, 10), t: nuevo.t };
    await storage.put(kPlanes(cuenta), indice);
    return Response.json({ bien: true, t: nuevo.t, progreso: nuevo.progreso });
  }
  if(c.accion === 'borrarPlan'){
    if(!idValido(c.id) || !indice[c.id]) return Response.json({ error: 'Ese plan ya no existe.' }, { status: 404 });
    await storage.delete(kPlan(cuenta, c.id));
    indice[c.id] = { id: c.id, borrado: true, t: ahora };
    await storage.put(kPlanes(cuenta), indice);
    return Response.json({ bien: true });
  }
  return Response.json({ error: 'No sé hacer eso.' }, { status: 400 });
}
