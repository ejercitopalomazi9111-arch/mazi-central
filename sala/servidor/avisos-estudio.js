/* ══════════════════════════════════════════════════════════════════════════
   LOS AVISOS DE CARYMO · recordatorios con notificación (Carlos, 13 nov, bloque 7)
   ──────────────────────────────────────────────────────────────────────────
   «Recordatorios con notificación»: que el teléfono suene aunque CARYMO esté
   cerrado. Cuatro avisos, cada uno a lo más una vez al día y sólo si sirve:

     estudiar   a la hora que elijas, si hoy todavía no estudias
     racha      a las 9 de la noche, si tienes racha y hoy no has estudiado
     examen     a las 8 de la mañana, si un plan tiene examen hoy o mañana
     mascota    a la 1 de la tarde, si tu compañero tiene hambre, está sucio o triste

   Lo que se guarda (en el objeto de La Sala, como todo lo de estudio):
     est:avisos:<cuenta>   { subs: { <endpoint>: { endpoint, keys, t } }, ajustes, enviados: { tipo: día } }
     est:avisos:i          [cuentas con al menos un teléfono apuntado]

   Por CUENTA y por TELÉFONO: el permiso lo da un aparato, y una persona con
   teléfono y tableta quiere que suenen los dos.

   Quién lo dispara: la tarea programada del worker (`scheduled` en index.js,
   cada 15 minutos) le pide a la sala GRUPAZ `https://interno/carymo-avisos`.
   NO va en la alarma del objeto: esa alarma la comparten el olvido, las
   vigilias y los programados, y meterle una cuarta cosa es como se borró
   GRUPAZ dos veces (ver `alarm()` en sala.js).

   La hora es la de México (UTC−6, sin horario de verano desde 2022), igual que
   la racha: un aviso de «estudia» a las 3 de la mañana es la forma más rápida
   de que alguien apague los avisos para siempre.
   ═════════════════════════════════════════════════════════════════════════ */
import { cuidadoAhora } from './palomium.js';

export const kAvisos = (c) => `est:avisos:${c}`;
export const K_INDICE = 'est:avisos:i';
export const MAX_TELEFONOS = 5;

/* a qué hora (de México) sale cada uno; «estudiar» la pone cada quien */
export const HORAS = { racha: '21:00', examen: '08:00', mascota: '13:00' };
export const AJUSTES_DE_FABRICA = { estudiar: '18:00', racha: true, examen: true, mascota: true };

const NOMBRE = { tigre: 'Tu tigre', paloma: 'Tu paloma', pinguino: 'Tu pingüino', conejo: 'Tu conejo', foca: 'Tu foca', ballena: 'Tu ballena', gatito: 'Tu gatito', perrito: 'Tu perrito' };

const horaValida = (h) => typeof h === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
/* minutos del día en México, y el día */
export const minutoMexico = (ms) => { const d = new Date(ms - 6 * 36e5); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const diaMx = (ms) => new Date(ms - 6 * 36e5).toISOString().slice(0, 10);
const diaMas = (dia, n) => new Date(Date.parse(dia + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

export function normalizarAjustes(a = {}){
  const r = { ...AJUSTES_DE_FABRICA };
  if(a && typeof a === 'object'){
    if(a.estudiar === '' || a.estudiar === false) r.estudiar = '';
    else if(horaValida(a.estudiar)) r.estudiar = a.estudiar;
    for(const k of ['racha', 'examen', 'mascota']) if(typeof a[k] === 'boolean') r[k] = a[k];
  }
  return r;
}

/* una suscripción del navegador que sí sirve: endpoint https y, si trae llaves, las dos */
export function suscripcionValida(s){
  if(!s || typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 1000) return null;
  const k = s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string' && s.keys.p256dh.length < 200 && s.keys.auth.length < 100
    ? { p256dh: s.keys.p256dh, auth: s.keys.auth } : null;
  return k ? { endpoint: s.endpoint, keys: k } : { endpoint: s.endpoint };
}

async function indice(storage){ return (await storage.get(K_INDICE)) || []; }
async function ponerEnIndice(storage, cuenta, si){
  const i = new Set(await indice(storage));
  if(si) i.add(cuenta); else i.delete(cuenta);
  await storage.put(K_INDICE, [...i]);
}

/* ── lo que pide el teléfono (acción `avisos` de /estudio) ── */
export async function atenderAvisos(storage, c, cuenta, { publica } = {}, ahora = Date.now()){
  const k = kAvisos(cuenta);
  const x = (await storage.get(k)) || { subs: {}, ajustes: { ...AJUSTES_DE_FABRICA }, enviados: {} };
  x.ajustes = normalizarAjustes(x.ajustes);
  const que = String(c.que || 'estado');

  if(que === 'estado') return { bien: true, publica: publica || '', ajustes: x.ajustes, telefonos: Object.keys(x.subs).length };

  if(que === 'suscribir'){
    const s = suscripcionValida(c.suscripcion);
    if(!s) return { error: 'Ese teléfono no mandó una suscripción que sirva.', estado: 400 };
    x.subs[s.endpoint] = { ...s, t: ahora };
    /* el más viejo se va si ya hay demasiados: un teléfono que se reinstaló cinco veces no son cinco teléfonos */
    const lista = Object.values(x.subs).sort((a, b) => b.t - a.t);
    x.subs = Object.fromEntries(lista.slice(0, MAX_TELEFONOS).map((v) => [v.endpoint, v]));
    if(c.ajustes) x.ajustes = normalizarAjustes(c.ajustes);
    await storage.put(k, x); await ponerEnIndice(storage, cuenta, true);
    return { bien: true, ajustes: x.ajustes, telefonos: Object.keys(x.subs).length };
  }
  if(que === 'desuscribir'){
    const e = c.suscripcion && c.suscripcion.endpoint;
    if(e) delete x.subs[e]; else x.subs = {};
    await storage.put(k, x); await ponerEnIndice(storage, cuenta, Object.keys(x.subs).length > 0);
    return { bien: true, telefonos: Object.keys(x.subs).length };
  }
  if(que === 'ajustes'){
    x.ajustes = normalizarAjustes({ ...x.ajustes, ...(c.ajustes || {}) });
    await storage.put(k, x);
    return { bien: true, ajustes: x.ajustes };
  }
  return { error: 'No sé hacer eso con los avisos.', estado: 400 };
}

/* ── qué le toca a una cuenta AHORA ──
   Puro: recibe el perfil, el índice de planes y el registro de avisos, y dice
   qué mandar. Así las pruebas lo llaman directo, sin fingir el reloj del mundo. */
export function avisosQueTocan({ perfil = {}, planes = {}, ajustes, enviados = {} }, ahora){
  const a = normalizarAjustes(ajustes), hoy = diaMx(ahora), min = minutoMexico(ahora);
  const yaEstudio = perfil.ultimoDia === hoy;
  /* una ventana de 2 h después de la hora: si el servidor no pasó justo a la hora, igual sale; más tarde ya no sirve */
  const toca = (tipo, hora) => !!hora && enviados[tipo] !== hoy && min >= aMin(hora) && min < aMin(hora) + 120;
  const quien = NOMBRE[perfil.mascota] || 'Tu compañero';
  const nombre = String(perfil.nombre || '').split(' ')[0];
  const sale = [];

  if(toca('examen', a.examen && HORAS.examen)){
    const manana = diaMas(hoy, 1);
    const cerca = Object.values(planes).filter((p) => p && !p.borrado && (p.fecha === hoy || p.fecha === manana));
    if(cerca.length){
      const p = cerca.sort((x, y) => String(x.fecha).localeCompare(String(y.fecha)))[0];
      sale.push({ tipo: 'examen', titulo: p.fecha === hoy ? 'Hoy es tu examen' : 'Mañana es tu examen',
        texto: `${p.titulo || p.materia || 'Tu plan'}: ${p.fecha === hoy ? 'un repaso rápido antes de entrar' : 'date una vuelta por el simulacro hoy'}.`, plan: p.id || '' });
    }
  }
  if(toca('mascota', a.mascota && perfil.mascota !== 'no' && HORAS.mascota)){
    const cu = cuidadoAhora(perfil.cuidado, ahora);
    const mal = cu.hambre < 25 ? 'tiene hambre' : cu.limpieza < 25 ? 'necesita un baño' : cu.animo < 25 ? 'está triste y te extraña' : '';
    if(mal) sale.push({ tipo: 'mascota', titulo: `${quien} ${mal}`, texto: 'Pasa a su cuarto un momento.', abrir: 'companero' });
  }
  if(toca('estudiar', a.estudiar) && !yaEstudio){
    sale.push({ tipo: 'estudiar', titulo: nombre ? `${nombre}, ¿una lección?` : '¿Una lección?', texto: `${quien} te está esperando. Cinco minutos y listo.` });
  }
  if(toca('racha', a.racha && HORAS.racha) && !yaEstudio && (perfil.racha || 0) > 0){
    const congelada = (perfil.congeladas || 0) > 0;
    sale.push({ tipo: 'racha', titulo: `Tu racha de ${perfil.racha} ${perfil.racha === 1 ? 'día' : 'días'} se puede perder`,
      texto: congelada ? 'Tienes una racha congelada, pero mejor no gastarla: haz una lección.' : 'Una lección antes de dormir y la salvas.' });
  }
  return sale;
}

/* ── la vuelta de cada 15 minutos ──
   `enviar(suscripciones, mensaje)` → { enviados, muertas } (la costura para las pruebas). */
export async function revisarAvisos(storage, ahora, enviar){
  const cuentas = await indice(storage);
  let mandados = 0;
  for(const cuenta of cuentas){
    const k = kAvisos(cuenta), x = await storage.get(k);
    if(!x || !Object.keys(x.subs || {}).length){ await ponerEnIndice(storage, cuenta, false); continue; }
    const perfil = (await storage.get(`est:perfil:${cuenta}`)) || {};
    const planes = (await storage.get(`est:planes:${cuenta}`)) || {};
    const tocan = avisosQueTocan({ perfil, planes, ajustes: x.ajustes, enviados: x.enviados || {} }, ahora);
    if(!tocan.length) continue;
    x.enviados = x.enviados || {};
    const hoy = diaMx(ahora);
    /* uno solo por vuelta (el más importante va primero): cuatro avisos seguidos es acoso.
       El que no salió sigue en su ventana y sale en la vuelta siguiente, 15 min después. */
    const av = tocan[0];
    x.enviados[av.tipo] = hoy;
    const r = await enviar(Object.values(x.subs), JSON.stringify({ titulo: av.titulo, texto: av.texto, tipo: av.tipo, plan: av.plan || '', abrir: av.abrir || '' }));
    for(const m of (r && r.muertas) || []) delete x.subs[m];
    mandados += (r && r.enviados) || 0;
    await storage.put(k, x);
    if(!Object.keys(x.subs).length) await ponerEnIndice(storage, cuenta, false);
  }
  return { cuentas: cuentas.length, mandados };
}

/* el de prueba, al tocar «Probar aviso» */
export async function avisoDePrueba(storage, cuenta, enviar){
  const x = await storage.get(kAvisos(cuenta));
  if(!x || !Object.keys(x.subs || {}).length) return { error: 'Este teléfono todavía no tiene los avisos prendidos.', estado: 400 };
  const r = await enviar(Object.values(x.subs), JSON.stringify({ titulo: 'Así se ven tus avisos', texto: 'Te voy a recordar estudiar, cuidar tu racha y tus exámenes.', tipo: 'prueba' }));
  for(const m of (r && r.muertas) || []) delete x.subs[m];
  await storage.put(kAvisos(cuenta), x);
  return { bien: true, enviados: (r && r.enviados) || 0 };
}
