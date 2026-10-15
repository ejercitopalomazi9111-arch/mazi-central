/* ══════════════════════════════════════════════════════════════════════════
   LA SOCIEDAD DE ALUMNOS DEL REMBRANDT · el servidor (15 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Carlos ganó la presidencia y una de sus propuestas es la página de la
   sociedad: buzón de propuestas y quejas, votaciones de eventos, material
   académico y fotos de recuerdo (revisadas antes de salir), chats por grupo y
   de toda la escuela, tablón de avisos, eventos y competencias con sus
   requisitos, torneos con sus llaves y marcador, el panel interno de la
   sociedad (temas por resolver, tareas, bitácora) y los horarios de cada grupo.

   Vive en el MISMO objeto de la escuela que Fadori, a propósito: la cuenta es
   la misma (correo, contraseña y credencial revisada), así que quien ya pide
   en la cooperativa entra aquí sin hacer nada. El alumno se reconoce por su
   teléfono (`_dev`), igual que en los pedidos.

   Quién puede qué:
     · cualquiera (sin cuenta): ver avisos, eventos, votaciones, torneos,
       horarios, el muro y el material ya aprobados;
     · alumno con cuenta: votar, inscribirse, escribir al buzón, subir fotos y
       material (quedan PENDIENTES), chatear en su grupo y en el general;
     · sociedad: todo lo anterior + publicar, aprobar, contestar el buzón y el
       panel interno (temas, tareas, bitácora, su propio chat);
     · presidencia: además da de alta y de baja a los de la sociedad.
   La llave del mostrador (Carlos) sólo sirve para nombrar a la presidencia.

   Los cambios se avisan por el socket con un «algo cambió en X» SIN el
   contenido: cada quien vuelve a pedir y el servidor le da sólo lo que puede
   ver. Así un mensaje de la sociedad o una foto sin aprobar nunca viaja a un
   teléfono que no debe tenerla.
   ═════════════════════════════════════════════════════════════════════════ */

import { mandar, suscripcionValida } from './push.js';

export const CAJONES_SOC = ['avisos', 'eventos', 'votos', 'buzon', 'pubs', 'temas', 'torneos', 'horarios'];
const ROLES = ['sociedad', 'presidencia'];
const TOPE = {
  chatPorCanal: 300, msgLargo: 800, msgPorDia: 400, msgCada: 1200,
  buzonPorDia: 10, pubsPorDia: 25, archivoMax: 12 * 1024 * 1024, parte: 1024 * 1024 + 64 * 1024,
  subidasPorDia: 60, miniatura: 60000, imagenChat: 160000,
  cuerpo: 220 * 1024, cuerpoSoc: 1600 * 1024,
  /* el objeto de la escuela tiene ~1 GB en el plan gratis y la pantalla usa
     hasta 650 MB; la sociedad, 250 MB (con R2, mucho más) */
  espacio: 250 * 1e6, espacioR2: 1.5e9,
};
const ESTADOS = {
  buzon: ['recibida', 'en revisión', 'en proceso', 'resuelta', 'descartada'],
  temas: ['por discutir', 'en discusión', 'por hacer', 'en proceso', 'resuelto'],
  eventos: ['propuesta', 'votación', 'inscripciones', 'confirmado', 'en curso', 'terminado', 'cancelado'],
  pubs: ['pendiente', 'aprobada', 'rechazada'],
};
/* lo feo que no debe salir en un chat de escuela: se tapa, no se rechaza
   (rechazar enseña a escribirlo con faltas) */
const FEAS = ['pendej', 'put[oa]', 'puto', 'verga', 'chinga', 'cabr[oó]n', 'mierda', 'pinche', 'culer', 'joto', 'marica', 'zorra', 'perra', 'idiota', 'imb[eé]cil', 'est[uú]pid', 'naco', 'gat[oa] ', 'mamad', 'cul[oa]'];
const RE_FEAS = new RegExp('\\b(' + FEAS.join('|') + ')\\w*', 'gi');
const tapar = (t) => t.replace(RE_FEAS, (m) => m[0] + '•'.repeat(Math.max(2, m.length - 1)));

function largo(v, max){
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}
const corto = (v, max) => largo(v, max).replace(/\s+/g, ' ');
const nid = (pre) => pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const RE_NID = /^[a-z]{1,3}[a-z0-9]{6,24}$/;
const RE_HORA = /^([01]?\d|2[0-3]):[0-5]\d$/;
const normGrupo = (g) => String(g || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const fecha = (v) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(v || '')) ? String(v) : '';
const lista = (v, n, f) => (Array.isArray(v) ? v : []).slice(0, n).map(f).filter(x => x != null);
const imagenDato = (v, max) => typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= max ? v : '';

/* ── la carga: todo lo de la sociedad en memoria, una vez ──────────────── */
async function cargar(self){
  if(self.soc) return self.soc;
  const g = self.ctx.storage, s = { cfg: (await g.get('soc:cfg')) || { miembros: {} }, chats: {}, cuentas: {} };
  for(const c of CAJONES_SOC) s[c] = {};
  for(const [k, v] of await g.list({ prefix: 'soc:r:' })){
    const i = k.indexOf(':', 6), c = k.slice(6, i);
    if(s[c]) s[c][k.slice(i + 1)] = v;
  }
  self.soc = s;
  return s;
}
async function chatDe(self, canal){
  const s = self.soc;
  if(!s.chats[canal]) s.chats[canal] = (await self.ctx.storage.get('soc:chat:' + canal)) || [];
  return s.chats[canal];
}
const guardar = (self, c, rec) => { self.soc[c][rec.id] = rec; return self.ctx.storage.put('soc:r:' + c + ':' + rec.id, rec); };
const quitar = (self, c, id) => { delete self.soc[c][id]; return self.ctx.storage.delete('soc:r:' + c + ':' + id); };

/* el aviso por el socket: «cambió X», sin contenido */
function avisar(self, que, canal){
  const m = JSON.stringify({ tipo: 'soc', que, canal: canal || '' });
  for(const ws of self.ctx.getWebSockets('soc')){ try{ ws.send(m); }catch(e){} }
}

/* las notificaciones: sólo a quien las pidió DESDE la página de la sociedad
   (su suscripción es otra que la de Fadori: otra página, otro service worker) */
export function empujarATodos(self, av, tema){
  const env = Object.entries(self.subs).filter(([k, s]) => s.soc && (!s.temas || s.temas[tema] !== false));
  if(!env.length) return;
  const p = (async () => {
    const vapid = await self.llavesVapid();
    await Promise.allSettled(env.map(async ([k, s]) => {
      const st = await mandar(vapid, s.sub, av, 'mailto:grupomazi.oficial@gmail.com').catch(() => 0);
      if(st === 404 || st === 410){ delete self.subs[k]; await self.ctx.storage.delete('push:' + k); }
    }));
  })();
  try{ self.ctx.waitUntil(p); }catch(e){}
}

/* ── quién habla ──────────────────────────────────────────────────────── */
function quienSoy(self, cuerpo, quien){
  const s = self.soc;
  const cod = String((cuerpo && cuerpo.yo) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const a = cod && self.datos.alumnos[cod];
  const mio = !!a && !!quien.aparato && (a._dev || []).indexOf(quien.aparato) >= 0;
  if(!mio) return { cod: '', a: null, rol: '', cuenta: false, admin: !!quien.admin };
  const rol = s.cfg.miembros[cod] || '';
  /* para escribir hace falta la cuenta de verdad: correo y la credencial
     mandada (la revisa la cooperativa); para mirar, no */
  const cuenta = !!(a._cuenta || a.protegida) && (a.verif === 'si' || a.verif === 'pendiente');
  return { cod, a, rol, cuenta, admin: !!quien.admin, alias: aliasDe(a), grupo: normGrupo(a.grupo) };
}
/* «Ana P · 3B»: primer nombre e inicial, como en la cooperativa */
function aliasDe(a){
  const p = String(a.nombre || '').trim().split(/\s+/);
  return (p[0] || 'Alguien') + (p[1] ? ' ' + p[1][0].toUpperCase() : '');
}
const esSoc = (y) => ROLES.indexOf(y.rol) >= 0;

/* cuenta de cosas por día, por alumno (en memoria: se reinicia con el objeto,
   y está bien: es un freno, no una contabilidad) */
function lleva(self, clave, max, ventana = 86400000){
  const t = Date.now(), c = self.soc.cuentas;
  let v = c[clave]; if(!v || t - v.ini > ventana){ v = c[clave] = { ini: t, n: 0 }; }
  if(v.n >= max) return false;
  v.n++; return true;
}

/* ── lo que ve cada quien ─────────────────────────────────────────────── */
function vista(self, y){
  const s = self.soc, soc = esSoc(y);
  const val = (o) => Object.values(o);
  const votos = val(s.votos).map(v => {
    const cuenta = {}; for(const c in v.votos || {}) cuenta[v.votos[c]] = (cuenta[v.votos[c]] || 0) + 1;
    const total = Object.keys(v.votos || {}).length;
    const ver = soc || v.verAntes || (v.cierra && Date.now() > Date.parse(v.cierra));
    return Object.assign({}, v, { votos: undefined, total, cuenta: ver ? cuenta : null, miVoto: y.cod ? (v.votos || {})[y.cod] || '' : '' });
  });
  const eventos = val(s.eventos).map(e => Object.assign({}, e, {
    inscritos: undefined, nInscritos: (e.inscritos || []).length, inscrito: !!y.cod && (e.inscritos || []).some(i => i.cod === y.cod),
    lista: soc ? e.inscritos || [] : undefined }));
  const pubs = val(s.pubs).filter(p => p.estado === 'aprobada' || soc || p.autor === y.cod).map(p => Object.assign({}, p, { autor: soc || p.autor === y.cod ? p.autor : undefined, mia: p.autor === y.cod }));
  const buzon = val(s.buzon).filter(b => soc || b.autor === y.cod || b.publico).map(b => Object.assign({}, b,
    { autor: soc && !b.anonimo ? b.autor : undefined, alias: b.anonimo ? 'Anónimo' : b.alias, apoyos: (b.apoyos || []).length, apoye: !!y.cod && (b.apoyos || []).indexOf(y.cod) >= 0, mia: b.autor === y.cod }));
  return {
    yo: y.cod ? { cod: y.cod, alias: y.alias, grupo: y.grupo, rol: y.rol, cuenta: y.cuenta } : null,
    admin: y.admin,
    avisos: val(s.avisos), eventos, votos, pubs, buzon,
    torneos: val(s.torneos), horarios: val(s.horarios),
    temas: soc ? val(s.temas) : [],
    miembros: soc || y.admin ? Object.entries(s.cfg.miembros).map(([cod, rol]) => ({ cod, rol, alias: self.datos.alumnos[cod] ? aliasDe(self.datos.alumnos[cod]) + ' · ' + (self.datos.alumnos[cod].grupo || '') : cod })) : [],
    grupos: [...new Set(Object.values(self.datos.alumnos).map(a => normGrupo(a.grupo)).filter(Boolean))].sort(),
    ahora: Date.now(),
  };
}

/* los canales de chat que puede abrir cada quien */
function puedeCanal(y, canal){
  if(canal === 'general') return !!y.cod;
  if(canal.startsWith('g:')) return !!y.cod && canal.slice(2) === y.grupo;
  if(canal === 'soc' || canal.startsWith('t:')) return esSoc(y);
  return false;
}

/* ── limpiar lo que manda cada quien, cajón por cajón ─────────────────── */
function limpiar(c, r, y, viejo){
  const base = { id: viejo ? viejo.id : nid(c.slice(0, 2)), t: Date.now(), creado: viejo ? viejo.creado : Date.now(), por: viejo ? viejo.por : y.alias };
  if(c === 'avisos') return Object.assign(base, {
    titulo: corto(r.titulo, 90) || 'Aviso', texto: largo(r.texto, 2000), cat: ['general', 'deportes', 'eventos', 'académico', 'urgente', 'objetos perdidos'].indexOf(r.cat) >= 0 ? r.cat : 'general',
    fijo: !!r.fijo, hasta: fecha(r.hasta), img: imagenDato(r.img, 400000) });
  if(c === 'eventos') return Object.assign(base, {
    titulo: corto(r.titulo, 90) || 'Evento', tipo: ['competencia', 'torneo', 'evento', 'convocatoria'].indexOf(r.tipo) >= 0 ? r.tipo : 'evento',
    categoria: corto(r.categoria, 40), desc: largo(r.desc, 3000), requisitos: largo(r.requisitos, 1500), premios: largo(r.premios, 600),
    lugar: corto(r.lugar, 80), fecha: fecha(r.fecha), cierre: fecha(r.cierre), cupo: Math.max(0, Math.min(2000, Math.round(Number(r.cupo) || 0))),
    porEquipo: !!r.porEquipo, estado: ESTADOS.eventos.indexOf(r.estado) >= 0 ? r.estado : 'propuesta',
    bitacora: lista(r.bitacora, 200, b => b && typeof b === 'object' ? { t: Number(b.t) || Date.now(), texto: largo(b.texto, 600), por: corto(b.por, 30) } : null),
    img: imagenDato(r.img, 400000), inscritos: viejo ? viejo.inscritos || [] : [], votoId: corto(r.votoId, 30), torneoId: corto(r.torneoId, 30) });
  if(c === 'votos') return Object.assign(base, {
    pregunta: corto(r.pregunta, 140) || 'Votación', desc: largo(r.desc, 1200),
    opciones: lista(r.opciones, 12, (o, i) => o && corto(o.texto, 80) ? { id: corto(o.id, 12) || 'o' + i, texto: corto(o.texto, 80), detalle: largo(o.detalle, 300) } : null),
    cierra: fecha(r.cierra), verAntes: !!r.verAntes, soloGrupo: normGrupo(r.soloGrupo), votos: viejo ? viejo.votos || {} : {} });
  if(c === 'temas') return Object.assign(base, {
    titulo: corto(r.titulo, 120) || 'Tema', categoria: corto(r.categoria, 40) || 'General', desc: largo(r.desc, 3000),
    estado: ESTADOS.temas.indexOf(r.estado) >= 0 ? r.estado : 'por discutir', prioridad: ['alta', 'media', 'baja'].indexOf(r.prioridad) >= 0 ? r.prioridad : 'media',
    responsables: corto(r.responsables, 120), limite: fecha(r.limite), docentes: !!r.docentes,
    tareas: lista(r.tareas, 80, x => x && corto(x.texto, 160) ? { id: corto(x.id, 14) || nid('ta'), texto: corto(x.texto, 160), hecho: !!x.hecho, quien: corto(x.quien, 40) } : null),
    bitacora: lista(r.bitacora, 300, b => b && typeof b === 'object' ? { t: Number(b.t) || Date.now(), texto: largo(b.texto, 800), por: corto(b.por, 30) } : null) });
  if(c === 'torneos') return Object.assign(base, {
    nombre: corto(r.nombre, 90) || 'Torneo', deporte: corto(r.deporte, 40), reglas: largo(r.reglas, 1500), estado: ['inscripciones', 'en curso', 'terminado'].indexOf(r.estado) >= 0 ? r.estado : 'en curso',
    rondas: lista(r.rondas, 6, ps => lista(ps, 32, p => p && typeof p === 'object' ? { a: corto(p.a, 40), b: corto(p.b, 40), pa: corto(p.pa, 4), pb: corto(p.pb, 4), gana: corto(p.gana, 40), cuando: corto(p.cuando, 40), envivo: !!p.envivo } : null)),
    tabla: lista(r.tabla, 32, x => x && corto(x.equipo, 40) ? { equipo: corto(x.equipo, 40), pj: Number(x.pj) | 0, pg: Number(x.pg) | 0, pe: Number(x.pe) | 0, pp: Number(x.pp) | 0, gf: Number(x.gf) | 0, gc: Number(x.gc) | 0 } : null),
    notas: lista(r.notas, 200, b => b && typeof b === 'object' ? { t: Number(b.t) || Date.now(), texto: largo(b.texto, 400), por: corto(b.por, 30) } : null) });
  if(c === 'horarios'){
    const dias = {};
    for(const d of ['1', '2', '3', '4', '5', '6']) dias[d] = lista((r.dias || {})[d], 14, b => b && RE_HORA.test(b.ini) && RE_HORA.test(b.fin) && corto(b.materia, 50)
      ? { ini: b.ini.padStart(5, '0'), fin: b.fin.padStart(5, '0'), materia: corto(b.materia, 50), salon: corto(b.salon, 20), color: /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '' } : null)
      .sort((a, b) => a.ini.localeCompare(b.ini));
    const g = normGrupo(r.grupo || (viejo && viejo.grupo)); if(!g) return null;
    return Object.assign(base, { id: 'h' + g.toLowerCase(), grupo: g, turno: corto(r.turno, 20), dias });
  }
  return null;
}

/* ── la puerta ────────────────────────────────────────────────────────── */
export async function rutaSociedad(self, ruta, url, pedido, quien, { json }){
  await cargar(self);
  const que = ruta.slice(ruta.indexOf('/soc/') + 5);

  /* los archivos: GET para bajar, POST binario para subir, por pedazos */
  if(que === 'archivo') return archivo(self, url, pedido, quien, json);

  if(pedido.method !== 'POST') return json({ error: 'No existe.' }, 404);
  const crudo = await pedido.text();
  if(crudo.length > TOPE.cuerpoSoc) return json({ error: 'Lo que mandaste es demasiado grande.' }, 413);
  let c = {}; try{ c = JSON.parse(crudo) || {}; }catch(e){}
  if(!c || typeof c !== 'object' || Array.isArray(c)) c = {};
  const y = quienSoy(self, c, quien);
  if(crudo.length > TOPE.cuerpo && !esSoc(y)) return json({ error: 'Lo que mandaste es demasiado grande.' }, 413);
  const s = self.soc;
  const sinCuenta = () => json({ error: 'Para esto necesitas tu cuenta: correo y credencial (se hace una vez, en Fadori).', cuenta: true }, 403);
  const soloSoc = () => json({ error: 'Esto es sólo para la sociedad de alumnos.' }, 403);

  if(que === 'todo') return json(vista(self, y));

  /* avisos al teléfono: cuáles quiere (eventos, votaciones, avisos, muro) */
  if(que === 'push'){
    if(!quien.aparato) return json({ error: 'Actualiza la página.' }, 400);
    const k = quien.aparato + '-soc';
    if(c.baja){ delete self.subs[k]; await self.ctx.storage.delete('push:' + k); return json({ bien: true }); }
    if(!suscripcionValida(c.sub, self.env && self.env.PUSH_PRUEBA)) return json({ error: 'Esa suscripción no es de un servicio de notificaciones.' }, 400);
    if(!self.subs[k] && Object.keys(self.subs).length >= 8000) return json({ error: 'Demasiados aparatos.' }, 429);
    const temas = {}; for(const t of ['avisos', 'eventos', 'votos', 'torneos', 'muro']) temas[t] = !(c.temas && c.temas[t] === false);
    const sub = { sub: { endpoint: c.sub.endpoint, keys: { p256dh: c.sub.keys.p256dh, auth: c.sub.keys.auth } }, soc: true, mostrador: false, temas, t: Date.now() };
    self.subs[k] = sub; await self.ctx.storage.put('push:' + k, sub);
    return json({ bien: true });
  }

  /* ── el chat ── */
  if(que === 'chat'){
    const canal = corto(c.canal, 30);
    if(!puedeCanal(y, canal)) return json({ error: 'No puedes ver este chat.' }, 403);
    const ms = await chatDe(self, canal), desde = String(c.desde || '');
    const i = desde ? ms.findIndex(m => m.id === desde) : -1;
    return json({ canal, mensajes: (i >= 0 ? ms.slice(i + 1) : ms.slice(-120)).filter(m => !m.borrado || esSoc(y)) });
  }
  if(que === 'decir'){
    const canal = corto(c.canal, 30);
    if(!y.cod || !y.cuenta) return sinCuenta();
    if(!puedeCanal(y, canal)) return json({ error: 'No puedes escribir aquí.' }, 403);
    if((s.cfg.callados || {})[y.cod] > Date.now()) return json({ error: 'La sociedad te pausó el chat un rato.' }, 403);
    if(!lleva(self, 'msgc:' + y.cod, 1, TOPE.msgCada) || !lleva(self, 'msg:' + y.cod, TOPE.msgPorDia)) return json({ error: 'Vas muy rápido. Espera un momento.' }, 429);
    const textoM = tapar(largo(c.texto, TOPE.msgLargo)), img = imagenDato(c.img, TOPE.imagenChat);
    if(!textoM && !img) return json({ error: 'El mensaje está vacío.' }, 400);
    const ms = await chatDe(self, canal);
    const m = { id: nid('m'), t: Date.now(), de: y.cod, alias: y.alias, grupo: y.grupo, rol: y.rol, texto: textoM, img, resp: corto(c.resp, 30) };
    ms.push(m); if(ms.length > TOPE.chatPorCanal) ms.splice(0, ms.length - TOPE.chatPorCanal);
    await self.ctx.storage.put('soc:chat:' + canal, ms);
    avisar(self, 'chat', canal);
    return json({ bien: true, msg: m });
  }
  if(que === 'quitarMsg'){
    const canal = corto(c.canal, 30);
    if(!puedeCanal(y, canal)) return json({ error: 'No.' }, 403);
    const ms = await chatDe(self, canal), m = ms.find(x => x.id === c.id);
    if(!m) return json({ error: 'Ya no está.' }, 404);
    if(m.de !== y.cod && !esSoc(y)) return soloSoc();
    m.borrado = true; m.texto = ''; m.img = ''; m.quito = m.de === y.cod ? 'autor' : 'sociedad';
    await self.ctx.storage.put('soc:chat:' + canal, ms);
    avisar(self, 'chat', canal);
    return json({ bien: true });
  }
  if(que === 'reportar'){
    if(!y.cod) return sinCuenta();
    if(!lleva(self, 'rep:' + y.cod, 30)) return json({ error: 'Ya reportaste muchas cosas hoy.' }, 429);
    const b = { id: nid('bz'), t: Date.now(), creado: Date.now(), tipo: 'reporte', texto: 'Reporte de un mensaje: «' + corto(c.texto, 300) + '» en ' + corto(c.canal, 30) + (c.motivo ? ' · ' + corto(c.motivo, 200) : ''),
      ref: { canal: corto(c.canal, 30), id: corto(c.id, 30) }, autor: y.cod, alias: y.alias, anonimo: true, estado: 'recibida', apoyos: [] };
    await guardar(self, 'buzon', b); avisar(self, 'buzon');
    return json({ bien: true });
  }
  if(que === 'pausar'){
    if(!esSoc(y)) return soloSoc();
    const cod = String(c.cod || '').toUpperCase(); if(!self.datos.alumnos[cod]) return json({ error: 'No existe.' }, 404);
    s.cfg.callados = s.cfg.callados || {}; s.cfg.callados[cod] = Date.now() + Math.min(7 * 86400000, Math.max(0, Number(c.minutos) || 60) * 60000);
    await self.ctx.storage.put('soc:cfg', s.cfg);
    return json({ bien: true });
  }

  /* ── votar, inscribirse, apoyar ── */
  if(que === 'votar'){
    if(!y.cod || !y.cuenta) return sinCuenta();
    const v = s.votos[c.id]; if(!v) return json({ error: 'Esa votación ya no existe.' }, 404);
    if(v.cierra && Date.now() > Date.parse(v.cierra)) return json({ error: 'La votación ya cerró.' }, 409);
    if(v.soloGrupo && v.soloGrupo !== y.grupo) return json({ error: 'Esta votación es de otro grupo.' }, 403);
    if(!(v.opciones || []).some(o => o.id === c.opcion)) return json({ error: 'Esa opción no existe.' }, 400);
    v.votos = v.votos || {}; v.votos[y.cod] = c.opcion;
    await guardar(self, 'votos', v); avisar(self, 'votos');
    return json({ bien: true });
  }
  if(que === 'inscribir'){
    if(!y.cod || !y.cuenta) return sinCuenta();
    const e = s.eventos[c.id]; if(!e) return json({ error: 'Ese evento ya no existe.' }, 404);
    e.inscritos = e.inscritos || [];
    const i = e.inscritos.findIndex(x => x.cod === y.cod);
    if(i >= 0) e.inscritos.splice(i, 1);
    else {
      if(['inscripciones', 'propuesta', 'votación', 'confirmado'].indexOf(e.estado) < 0) return json({ error: 'Las inscripciones están cerradas.' }, 409);
      if(e.cierre && Date.now() > Date.parse(e.cierre) + 86400000) return json({ error: 'Las inscripciones ya cerraron.' }, 409);
      if(e.cupo && e.inscritos.length >= e.cupo) return json({ error: 'Ya no hay lugar.' }, 409);
      e.inscritos.push({ cod: y.cod, alias: y.alias, grupo: y.grupo, equipo: corto(c.equipo, 40), nota: corto(c.nota, 140), t: Date.now() });
    }
    await guardar(self, 'eventos', e); avisar(self, 'eventos');
    return json({ bien: true, inscrito: i < 0 });
  }
  if(que === 'apoyar'){
    if(!y.cod || !y.cuenta) return sinCuenta();
    const b = s.buzon[c.id]; if(!b || !(b.publico || b.autor === y.cod || esSoc(y))) return json({ error: 'No existe.' }, 404);
    b.apoyos = b.apoyos || [];
    const i = b.apoyos.indexOf(y.cod); if(i >= 0) b.apoyos.splice(i, 1); else b.apoyos.push(y.cod);
    await guardar(self, 'buzon', b); avisar(self, 'buzon');
    return json({ bien: true });
  }

  /* ── el buzón: escribe cualquiera con cuenta; contesta la sociedad ── */
  if(que === 'buzon'){
    if(!y.cod || !y.cuenta) return sinCuenta();
    if(!lleva(self, 'bz:' + y.cod, TOPE.buzonPorDia)) return json({ error: 'Ya mandaste muchas hoy. Mañana más.' }, 429);
    const tipo = ['propuesta', 'queja', 'cambio', 'docentes', 'idea', 'otro'].indexOf(c.tipo) >= 0 ? c.tipo : 'otro';
    const b = { id: nid('bz'), t: Date.now(), creado: Date.now(), tipo, titulo: corto(c.titulo, 100), texto: tapar(largo(c.texto, 2500)),
      anonimo: !!c.anonimo, autor: y.cod, alias: y.alias + ' · ' + y.grupo, estado: 'recibida', apoyos: [], respuesta: '', publico: false };
    if(!b.texto) return json({ error: 'Escribe qué propones o qué pasa.' }, 400);
    await guardar(self, 'buzon', b); avisar(self, 'buzon');
    return json({ bien: true, id: b.id });
  }
  if(que === 'contestar'){
    if(!esSoc(y)) return soloSoc();
    const b = s.buzon[c.id]; if(!b) return json({ error: 'No existe.' }, 404);
    if(ESTADOS.buzon.indexOf(c.estado) >= 0) b.estado = c.estado;
    if(c.respuesta != null) b.respuesta = largo(c.respuesta, 2000);
    if(c.publico != null) b.publico = !!c.publico;
    b.t = Date.now(); b.contesto = y.alias;
    await guardar(self, 'buzon', b); avisar(self, 'buzon');
    return json({ bien: true });
  }

  /* ── fotos y material: los sube cualquiera con cuenta, PENDIENTES ── */
  if(que === 'publicar'){
    if(!y.cod || !y.cuenta) return sinCuenta();
    if(!lleva(self, 'pub:' + y.cod, TOPE.pubsPorDia)) return json({ error: 'Ya subiste muchas hoy.' }, 429);
    const archivos = lista(c.archivos, 20, f => f && RE_NID.test(String(f.id || '')) && s.subidas && s.subidas[f.id] && s.subidas[f.id].de === y.cod && s.subidas[f.id].listo
      ? { id: f.id, nombre: corto(f.nombre, 100), mime: corto(s.subidas[f.id].mime, 60), tam: s.subidas[f.id].tam, partes: s.subidas[f.id].partes, mini: imagenDato(f.mini, TOPE.miniatura) } : null);
    if(!archivos.length) return json({ error: 'Sube primero la foto o el archivo.' }, 400);
    const p = { id: nid('pu'), t: Date.now(), creado: Date.now(), clase: c.clase === 'material' ? 'material' : 'foto', titulo: corto(c.titulo, 100), desc: largo(c.desc, 1200),
      materia: corto(c.materia, 60), grupo: normGrupo(c.grupo) || y.grupo, album: corto(c.album, 60), archivos, autor: y.cod, alias: y.alias + ' · ' + y.grupo,
      estado: esSoc(y) ? 'aprobada' : 'pendiente', reviso: esSoc(y) ? y.alias : '' };
    await guardar(self, 'pubs', p); avisar(self, 'pubs');
    return json({ bien: true, id: p.id, estado: p.estado });
  }
  if(que === 'revisar'){
    if(!esSoc(y)) return soloSoc();
    const p = s.pubs[c.id]; if(!p) return json({ error: 'No existe.' }, 404);
    p.estado = ESTADOS.pubs.indexOf(c.estado) >= 0 ? c.estado : p.estado; p.motivo = corto(c.motivo, 200); p.reviso = y.alias; p.t = Date.now();
    await guardar(self, 'pubs', p); avisar(self, 'pubs');
    if(p.estado === 'aprobada') empujarATodos(self, { titulo: p.clase === 'foto' ? 'Nuevas fotos en el muro' : 'Material nuevo', cuerpo: p.titulo || '', tag: 'soc-pub', url: '/sociedad/' }, 'muro');
    return json({ bien: true });
  }

  /* ── lo que publica la sociedad ── */
  if(que === 'guardar'){
    const cj = c.cajon;
    if(['avisos', 'eventos', 'votos', 'temas', 'torneos', 'horarios'].indexOf(cj) < 0) return json({ error: 'No existe.' }, 404);
    if(!esSoc(y)) return soloSoc();
    const viejo = c.rec && c.rec.id ? s[cj][c.rec.id] || (cj === 'horarios' ? s.horarios['h' + normGrupo(c.rec.grupo).toLowerCase()] : null) : null;
    const rec = limpiar(cj, c.rec || {}, y, viejo);
    if(!rec) return json({ error: 'Faltan datos.' }, 400);
    let txt = ''; try{ txt = JSON.stringify(rec); }catch(e){}
    if(txt.length > 1500000) return json({ error: 'Demasiado grande.' }, 413);
    await guardar(self, cj, rec); avisar(self, cj);
    if(!viejo && c.avisar){
      const tit = { avisos: 'Aviso de la sociedad', eventos: 'Nuevo evento', votos: 'Nueva votación', torneos: 'Torneo' }[cj];
      if(tit) empujarATodos(self, { titulo: tit, cuerpo: rec.titulo || rec.pregunta || rec.nombre || '', tag: 'soc-' + cj + '-' + rec.id, url: '/sociedad/' }, cj);
    }
    return json({ bien: true, rec });
  }
  if(que === 'borrar'){
    const cj = c.cajon;
    if(CAJONES_SOC.indexOf(cj) < 0 || !s[cj][c.id]) return json({ error: 'No existe.' }, 404);
    const r = s[cj][c.id];
    const propio = (cj === 'buzon' || cj === 'pubs') && r.autor === y.cod && (cj !== 'pubs' || r.estado !== 'aprobada');
    if(!esSoc(y) && !propio) return soloSoc();
    if(cj === 'pubs') for(const f of r.archivos || []) await borrarArchivo(self, f.id);
    await quitar(self, cj, c.id); avisar(self, cj);
    return json({ bien: true });
  }

  /* ── quién es de la sociedad ── */
  if(que === 'miembros'){
    const puede = y.admin || y.rol === 'presidencia';
    if(!puede) return json({ error: 'Esto lo hace la presidencia (o la cooperativa con su pasador).' }, 403);
    const cod = String(c.cod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(!self.datos.alumnos[cod]) return json({ error: 'No hay nadie con ese código. Es el código de 4 letras de su cuenta de Fadori.' }, 404);
    if(c.rol === '' || c.rol === null) delete s.cfg.miembros[cod];
    else if(ROLES.indexOf(c.rol) >= 0){
      if(c.rol === 'presidencia' && !y.admin && y.rol !== 'presidencia') return json({ error: 'No.' }, 403);
      s.cfg.miembros[cod] = c.rol;
    } else return json({ error: 'Rol inválido.' }, 400);
    await self.ctx.storage.put('soc:cfg', s.cfg);
    avisar(self, 'miembros');
    return json({ bien: true });
  }

  /* ── Fadori: cómo va la fila (sólo turnos, sin nombres) y TUS pedidos ── */
  if(que === 'fila'){
    const hoy = new Date(Date.now() - 6 * 3600000); hoy.setUTCHours(0, 0, 0, 0);
    const desde = hoy.getTime() + 6 * 3600000;   /* el día de la Ciudad de México */
    const ps = Object.values(self.datos.pedidos).filter(p => (p.creado || 0) >= desde && p.turno != null);
    const turnos = (e) => ps.filter(p => p.estado === e).sort((a, b) => a.turno - b.turno).map(p => p.turno);
    const mios = y.cod ? ps.filter(p => p.alumno === y.cod).map(p => ({ turno: p.turno, estado: p.estado, total: p.total,
      que: (p.renglones || []).map(r => (r.cant > 1 ? r.cant + '× ' : '') + ((self.datos.productos[r.prod] || {}).nombre || '')).join(', ').slice(0, 140) })) : [];
    return json({ enCola: turnos('en_cola').length, preparando: turnos('preparando').slice(0, 12), listos: turnos('listo').slice(-12), mios,
      recreo: self.config ? self.config.recreoInicia || '' : '' });
  }

  /* ── Radio Divergentes: los episodios que ya subió Carlos a la pantalla ── */
  if(que === 'radio'){
    const M = await self.medios();
    return json({ episodios: Object.values(M).filter(m => m.listo && m.tipo === 'ep' && m.clase === 'archivo')
      .sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 30)
      .map(m => ({ id: m.id, nombre: m.nombre, portada: m.portada, tam: m.tam, partes: m.partes, mime: m.mime, esAudio: m.esAudio, t: m.t })) });
  }

  return json({ error: 'No existe.' }, 404);
}

/* ── los archivos ─────────────────────────────────────────────────────────
   POST ?id&k&n&tam&mime&yo → un pedazo (el primero da de alta la subida)
   GET  ?id&k&yo            → un pedazo, sólo si la publicación ya está
                              aprobada (o eres la sociedad, o es tuya)      */
async function archivo(self, url, pedido, quien, json){
  const s = self.soc, id = String(url.searchParams.get('id') || ''), k = Number(url.searchParams.get('k'));
  if(!RE_NID.test(id) || !(k >= 0 && k < 64)) return json({ error: 'Pedazo inválido.' }, 400);
  const y = quienSoy(self, { yo: url.searchParams.get('yo') }, quien);
  if(pedido.method === 'GET'){
    /* episodios de Radio Divergentes: los del buzón de la pantalla, públicos */
    if(url.searchParams.get('radio')){
      const M = await self.medios(), m = M[id];
      if(!m || !m.listo || m.tipo !== 'ep' || !(k < m.partes)) return json({ error: 'No existe.' }, 404);
      const b = await self.alm.sacar(id, k); if(!b) return json({ error: 'Falta ese pedazo.' }, 404);
      return new Response(b, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=86400' } });
    }
    const p = Object.values(s.pubs).find(x => (x.archivos || []).some(f => f.id === id));
    const sub = s.subidas && s.subidas[id];
    const ok = (p && (p.estado === 'aprobada' || esSoc(y) || p.autor === y.cod)) || (!p && sub && sub.de === y.cod);
    if(!ok) return json({ error: 'No disponible.' }, 404);
    const b = await self.alm.sacar('soc' + id, k); if(!b) return json({ error: 'Falta ese pedazo.' }, 404);
    return new Response(b, { headers: { 'content-type': 'application/octet-stream', 'cache-control': p && p.estado === 'aprobada' ? 'public, max-age=86400' : 'no-store' } });
  }
  if(pedido.method !== 'POST') return json({ error: 'No existe.' }, 404);
  if(!y.cod || !y.cuenta) return json({ error: 'Para subir necesitas tu cuenta.', cuenta: true }, 403);
  s.subidas = s.subidas || (await self.ctx.storage.get('soc:subidas')) || {};
  let sub = s.subidas[id];
  if(!sub){
    if(k !== 0) return json({ error: 'Empieza por el primer pedazo.' }, 400);
    const tam = Math.round(Number(url.searchParams.get('tam')) || 0), n = Math.round(Number(url.searchParams.get('n')) || 0);
    if(tam <= 0 || tam > TOPE.archivoMax) return json({ error: 'Lo más que entra son 12 MB por archivo.' }, 413);
    if(n !== Math.ceil(tam / (1024 * 1024))) return json({ error: 'Pedazos inválidos.' }, 400);
    const usado = Object.values(s.subidas).reduce((x, u) => x + (u.tam || 0), 0);
    if(usado + tam > (self.env && self.env.MEDIOS ? TOPE.espacioR2 : TOPE.espacio)) return json({ error: 'El espacio de la sociedad está lleno. Avísale a la sociedad para que borre lo viejo.' }, 507);
    if(!lleva(self, 'up:' + y.cod, TOPE.subidasPorDia)) return json({ error: 'Ya subiste mucho hoy.' }, 429);
    const mime = String(url.searchParams.get('mime') || '').slice(0, 60);
    if(!/^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.[a-z.]+|application\/msword|application\/vnd\.ms-[a-z]+|text\/plain|video\/mp4|audio\/(mpeg|mp4))$/.test(mime))
      return json({ error: 'Ese tipo de archivo no se puede subir. Fotos, PDF, Word, PowerPoint, Excel, MP3 o MP4.' }, 415);
    sub = s.subidas[id] = { id, de: y.cod, tam, partes: n, mime, llegaron: 0, listo: false, t: Date.now() };
  }
  if(sub.de !== y.cod || sub.listo || k >= sub.partes) return json({ error: 'No.' }, 403);
  const b = await pedido.arrayBuffer();
  if(b.byteLength === 0 || b.byteLength > TOPE.parte) return json({ error: 'Pedazo inválido.' }, 413);
  await self.alm.poner('soc' + id, k, b);
  sub.llegaron = Math.max(sub.llegaron, k + 1);
  if(k === sub.partes - 1) sub.listo = true;
  /* las subidas viejas que nunca se publicaron se van (24 h) */
  for(const x of Object.values(s.subidas)) if(Date.now() - x.t > 86400000 && !Object.values(s.pubs).some(p => (p.archivos || []).some(f => f.id === x.id))){ await borrarArchivo(self, x.id); }
  await self.ctx.storage.put('soc:subidas', s.subidas);
  return json({ bien: true, listo: sub.listo });
}
async function borrarArchivo(self, id){
  const s = self.soc; s.subidas = s.subidas || (await self.ctx.storage.get('soc:subidas')) || {};
  const sub = s.subidas[id]; await self.alm.borrar('soc' + id, sub ? sub.partes : 13); delete s.subidas[id];
  await self.ctx.storage.put('soc:subidas', s.subidas);
}
