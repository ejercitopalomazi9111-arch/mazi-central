/* ══════════════════════════════════════════════════════════════════════════
   JUEGOS DE MESA EN LÍNEA (CARYMO) · partidas entre personas de la app
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «que te permita competir contra otros jugadores que estén en
   la aplicación o contra otros de tus amigos».

   · Por turnos y sin reloj, como el ajedrez por correspondencia: cada quien
     juega cuando abre la app, y si los dos están en la partida se ve en vivo
     (el teléfono pregunta cada 2 s mientras la tiene abierta).
   · El servidor REVISA cada jugada con las mismas reglas que el teléfono
     (carymo/juegos/motores.js). Una jugada que no esté en la lista de legales
     no entra, y se guarda la jugada del motor, no la que mandó el teléfono.
   · En el dominó cada quien ve sólo sus fichas (motor.vista): las del otro y
     las del pozo nunca salen del servidor.
   · Si alguien no juega en 3 días, el otro puede reclamar la partida.
   ═════════════════════════════════════════════════════════════════════════ */
import { MOTORES } from '../../carymo/juegos/motores.js';

const kP = (id) => `jg:p:${id}`, kMias = (c) => `jg:mias:${c}`, kCola = (j) => `jg:cola:${j}`, kHallada = (c) => `jg:hallada:${c}`, kSt = (c) => `jg:st:${c}`;
export const JUEGOS_MESA = Object.keys(MOTORES);
export const RECLAMO_MS = 3 * 24 * 3600_000;
const COLA_MS = 10 * 60_000, RETO_MS = 2 * 24 * 3600_000;
const limpio = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

async function mias(storage, c){ return (await storage.get(kMias(c))) || []; }
async function apuntar(storage, c, id){ const m = await mias(storage, c); if(!m.includes(id)){ m.unshift(id); await storage.put(kMias(c), m.slice(0, 40)); } }
export async function estadisticas(storage, c){ return (await storage.get(kSt(c))) || {}; }

function nueva(juego, a, b, nombres, ahora, estado){
  const m = MOTORES[juego], semilla = Math.floor(Math.random() * 2 ** 31);
  // quién lleva blancas (o empieza) se sortea
  const j = Math.random() < .5 ? [a, b] : [b, a], n = j[0] === a ? nombres : [nombres[1], nombres[0]];
  return { id: ahora.toString(36) + Math.random().toString(36).slice(2, 8), juego, j, nombres: n, estado, e: m.inicial({ semilla }), v: 0, creada: ahora, act: ahora, jugadas: [] };
}
/* lo que ve cada quien de la partida */
function paraVer(p, cuenta, ahora = Date.now()){
  const m = MOTORES[p.juego], yo = p.j.indexOf(cuenta);
  return { id: p.id, juego: p.juego, j: p.j, nombres: p.nombres, yo, estado: p.estado, v: p.v, e: m.vista(p.e, yo < 0 ? 0 : yo), fin: p.fin || null, act: p.act, creada: p.creada,
    turno: p.estado === 'jugando' ? m.turno(p.e) : null, jugadas: p.jugadas.slice(-6), retador: p.retador || null, final: p.final || null,
    reclamable: p.estado === 'jugando' && m.turno(p.e) !== yo && ahora - p.act > RECLAMO_MS };
}
function resumen(p, cuenta, ahora){
  const yo = p.j.indexOf(cuenta), m = MOTORES[p.juego];
  return { id: p.id, juego: p.juego, rival: p.nombres[1 - yo] || '', rivalCuenta: p.j[1 - yo], estado: p.estado, miTurno: p.estado === 'jugando' && m.turno(p.e) === yo,
    reto: p.estado === 'reto' ? (p.retador === cuenta ? 'mandado' : 'recibido') : null, fin: p.fin || null, gane: p.fin ? (p.fin.ganador === null ? null : p.fin.ganador === yo) : undefined, act: p.act,
    reclamable: p.estado === 'jugando' && m.turno(p.e) !== yo && ahora - p.act > RECLAMO_MS };
}
/* Elo sencillo por juego, más ganadas, perdidas y empates */
async function cerrar(storage, p, ahora){
  const st = [await estadisticas(storage, p.j[0]), await estadisticas(storage, p.j[1])];
  const r = st.map((s) => (s[p.juego]?.elo ?? 1000));
  const esperado0 = 1 / (1 + 10 ** ((r[1] - r[0]) / 400));
  const real0 = p.fin.ganador === null ? .5 : p.fin.ganador === 0 ? 1 : 0;
  const d = Math.round(32 * (real0 - esperado0));
  for(const i of [0, 1]){
    const s = st[i][p.juego] || { elo: 1000, g: 0, p: 0, e: 0 };
    s.elo = Math.max(100, s.elo + (i === 0 ? d : -d));
    if(p.fin.ganador === null) s.e++; else if(p.fin.ganador === i) s.g++; else s.p++;
    st[i][p.juego] = s; await storage.put(kSt(p.j[i]), st[i]);
  }
  p.final = { cambioElo: [d, -d] };
}

export async function atenderJuegos(storage, c, cuenta, perfil, ahora, { alBuzon } = {}){
  if(cuenta === 'invitado') return { error: 'Crea tu cuenta para jugar en línea.', estado: 401 };
  const juego = c.juego, m = MOTORES[juego];

  if(c.accion === 'juegosMios'){
    const ids = await mias(storage, cuenta), out = [];
    for(const id of ids){ const p = await storage.get(kP(id)); if(!p) continue;
      if(p.estado === 'reto' && ahora - p.creada > RETO_MS){ p.estado = 'vencido'; await storage.put(kP(id), p); }
      out.push(resumen(p, cuenta, ahora)); }
    return { bien: true, partidas: out, stats: await estadisticas(storage, cuenta), buscando: await buscandoDe(storage, cuenta, ahora) };
  }

  /* retar a alguien (un amigo, o alguien del ranking) */
  if(c.accion === 'juegoRetar'){
    if(!m) return { error: 'Ese juego no existe.', estado: 400 };
    const otro = limpio(c.a, 40).toLowerCase();
    if(!otro || otro === cuenta) return { error: 'Elige a quién retar.', estado: 400 };
    const suPerfil = await storage.get(`est:perfil:${otro}`);
    if(!suPerfil) return { error: 'No encontré a esa persona.', estado: 404 };
    const p = nueva(juego, cuenta, otro, [perfil.nombre || cuenta, suPerfil.nombre || otro], ahora, 'reto');
    p.retador = cuenta;
    await storage.put(kP(p.id), p); await apuntar(storage, cuenta, p.id); await apuntar(storage, otro, p.id);
    if(alBuzon) await alBuzon(storage, otro, { de: cuenta, nombre: perfil.nombre, tipo: 'reta', texto: `te retó a ${m.nombre}`, partida: p.id }, ahora);
    return { bien: true, partida: paraVer(p, cuenta) };
  }
  if(c.accion === 'juegoResponder'){
    const p = await storage.get(kP(limpio(c.id, 40)));
    if(!p || !p.j.includes(cuenta) || p.estado !== 'reto' || p.retador === cuenta) return { error: 'Ese reto ya no está.', estado: 404 };
    p.estado = c.acepta ? 'jugando' : 'rechazado'; p.act = ahora; p.v++;
    await storage.put(kP(p.id), p);
    if(alBuzon) await alBuzon(storage, p.retador, { de: cuenta, nombre: perfil.nombre, tipo: c.acepta ? 'retoAcepta' : 'retoRechaza', texto: c.acepta ? `aceptó tu reto de ${MOTORES[p.juego].nombre}` : `ahorita no puede jugar ${MOTORES[p.juego].nombre}`, partida: p.id }, ahora);
    return { bien: true, partida: paraVer(p, cuenta) };
  }

  /* buscar rival: si alguien está esperando el mismo juego, se arma la partida; si no, te formas */
  if(c.accion === 'juegoBuscar'){
    if(!m) return { error: 'Ese juego no existe.', estado: 400 };
    const hallada = await storage.get(kHallada(cuenta));
    if(hallada){ await storage.delete(kHallada(cuenta)); const p = await storage.get(kP(hallada)); if(p) return { bien: true, partida: paraVer(p, cuenta) }; }
    const cola = await storage.get(kCola(juego));
    if(cola && cola.cuenta !== cuenta && ahora - cola.t < COLA_MS){
      await storage.delete(kCola(juego));
      const p = nueva(juego, cola.cuenta, cuenta, [cola.nombre, perfil.nombre || cuenta], ahora, 'jugando');
      await storage.put(kP(p.id), p); await apuntar(storage, cuenta, p.id); await apuntar(storage, cola.cuenta, p.id);
      await storage.put(kHallada(cola.cuenta), p.id);
      return { bien: true, partida: paraVer(p, cuenta) };
    }
    await storage.put(kCola(juego), { cuenta, nombre: perfil.nombre || cuenta, t: ahora });
    return { bien: true, esperando: true };
  }
  if(c.accion === 'juegoNoBuscar'){
    for(const j of JUEGOS_MESA){ const cola = await storage.get(kCola(j)); if(cola?.cuenta === cuenta) await storage.delete(kCola(j)); }
    return { bien: true };
  }

  const p = await storage.get(kP(limpio(c.id, 40)));
  if(!p || !p.j.includes(cuenta)) return { error: 'No encontré esa partida.', estado: 404 };
  const mm = MOTORES[p.juego], yo = p.j.indexOf(cuenta);

  if(c.accion === 'juegoEstado'){
    if(Number.isInteger(c.v) && c.v === p.v) return { bien: true, igual: true, v: p.v };     // nada nuevo: respuesta chiquita
    return { bien: true, partida: paraVer(p, cuenta) };
  }
  if(c.accion === 'juegoMover'){
    if(p.estado !== 'jugando') return { error: 'La partida ya no está en juego.', estado: 409 };
    if(mm.turno(p.e) !== yo) return { error: 'Todavía no es tu turno.', estado: 409, partida: paraVer(p, cuenta) };
    if(Number.isInteger(c.v) && c.v !== p.v) return { error: 'La partida cambió; ya te la actualicé.', estado: 409, partida: paraVer(p, cuenta) };
    const j = c.jugada && typeof c.jugada === 'object' ? c.jugada : null;
    const legal = j && mm.jugadas(p.e).find((k) => mm.igual(k, j));
    if(!legal) return { error: 'Esa jugada no se vale.', estado: 400, partida: paraVer(p, cuenta) };
    p.e = mm.aplicar(p.e, legal); p.v++; p.act = ahora;
    p.jugadas.push({ quien: yo, j: legal, t: ahora }); if(p.jugadas.length > 300) p.jugadas = p.jugadas.slice(-300);
    // el dominó roba solo: si después de robar sigue sin poder, roba otra vez en la siguiente jugada del teléfono
    const f = mm.fin(p.e);
    if(f){ p.estado = 'fin'; p.fin = f; await cerrar(storage, p, ahora);
      if(alBuzon) await alBuzon(storage, p.j[1 - yo], { de: cuenta, nombre: perfil.nombre, tipo: 'juegoFin', texto: `terminó la partida de ${mm.nombre}`, partida: p.id }, ahora); }
    await storage.put(kP(p.id), p);
    return { bien: true, partida: paraVer(p, cuenta) };
  }
  if(c.accion === 'juegoRendirse'){
    if(p.estado !== 'jugando') return { error: 'La partida ya no está en juego.', estado: 409 };
    p.estado = 'fin'; p.fin = { ganador: 1 - yo, motivo: 'se rindió' }; p.v++; p.act = ahora;
    await cerrar(storage, p, ahora); await storage.put(kP(p.id), p);
    return { bien: true, partida: paraVer(p, cuenta) };
  }
  if(c.accion === 'juegoReclamar'){
    if(p.estado !== 'jugando' || mm.turno(p.e) === yo || ahora - p.act < RECLAMO_MS) return { error: 'Todavía no se puede reclamar.', estado: 409 };
    p.estado = 'fin'; p.fin = { ganador: yo, motivo: 'el otro no jugó en 3 días' }; p.v++; p.act = ahora;
    await cerrar(storage, p, ahora); await storage.put(kP(p.id), p);
    return { bien: true, partida: paraVer(p, cuenta) };
  }
  return null;
}
async function buscandoDe(storage, cuenta, ahora){
  for(const j of JUEGOS_MESA){ const cola = await storage.get(kCola(j)); if(cola?.cuenta === cuenta && ahora - cola.t < COLA_MS) return j; }
  return null;
}
/* para «Borrar cuenta» */
export const llavesJuegos = (c) => [kMias(c), kSt(c), kHallada(c)];
