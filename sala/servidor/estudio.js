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
export const MAX_PLAN = 1_500_000;
const kPerfil = (c) => `est:perfil:${c}`;
const kSem = (s) => `est:sem:${s}`;
const kPlanes = (c) => `est:planes:${c}`;
const kPlan = (c, id) => `est:plan:${c}:${id}`;
const idValido = (x) => typeof x === 'string' && /^[a-z0-9_-]{1,40}$/i.test(x);
const limpio = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const DIA_MS = 864e5;

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
  return { cuenta, nombre: cuenta.charAt(0).toUpperCase() + cuenta.slice(1), xp: 0, racha: 0, mejorRacha: 0, ultimoDia: '', congeladas: 0, horario: null, ids: [], t: 0 };
}
const publico = (p) => { const { ids, ...resto } = p; return resto; };

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

async function ranking(storage, semana, nombres = {}){
  const tabla = (await storage.get(kSem(semana))) || {};
  return { semana, filas: Object.entries(tabla).map(([cuenta, f]) => ({ cuenta, nombre: nombres[cuenta] || f.nombre || cuenta, xp: f.xp || 0 }))
    .sort((a, b) => b.xp - a.xp || a.nombre.localeCompare(b.nombre)) };
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

export async function atenderEstudio(storage, pedido, url, cuenta, ahora = Date.now()){
  cuenta = limpio(cuenta || 'invitado', 40).toLowerCase() || 'invitado';
  const hoy = diaMexico(ahora);
  const perfil = (await storage.get(kPerfil(cuenta))) || perfilNuevo(cuenta);
  const indice = (await storage.get(kPlanes(cuenta))) || {};

  if(pedido.method === 'GET'){
    const id = url.searchParams.get('plan');
    if(id){
      const plan = idValido(id) && await storage.get(kPlan(cuenta, id));
      if(!plan || indice[id]?.borrado) return Response.json({ error: 'Ese plan ya no existe.' }, { status: 404 });
      return Response.json({ bien: true, plan });
    }
    return Response.json({ bien: true, hoy, perfil: publico(perfil), planes: Object.values(indice), ranking: await ranking(storage, semanaDe(hoy), { [cuenta]: perfil.nombre }), hora: ahora });
  }
  if(pedido.method !== 'POST') return Response.json({ error: 'Usa GET o POST.' }, { status: 405 });

  const crudo = await pedido.text().catch(() => '');
  if(crudo.length > MAX_PLAN + 50_000) return Response.json({ error: 'El plan es demasiado grande para guardarlo.' }, { status: 413 });
  let c; try{ c = JSON.parse(crudo || '{}'); }catch{ return Response.json({ error: 'No entendí la petición.' }, { status: 400 }); }

  /* ── sumar XP (y con eso, la racha y el ranking) ── */
  if(c.accion === 'xp'){
    const eventos = (Array.isArray(c.eventos) ? c.eventos : [c]).slice(0, 50);
    const vistos = new Set(perfil.ids || []);
    let suma = 0; const dijo = [];
    for(const e of eventos){
      if(!e || !idValido(e.id) || vistos.has(e.id)) continue;
      const xp = Math.round(Number(e.xp));
      if(!Number.isFinite(xp) || xp < 0 || xp > 300) continue;     /* nadie gana 10 mil de un jalón */
      let dia = valeDia(e.dia) ? e.dia : hoy;
      if(Math.abs(aMs(dia) - aMs(hoy)) > 2 * DIA_MS) dia = hoy;
      vistos.add(e.id); perfil.ids = [...(perfil.ids || []), e.id].slice(-400);
      perfil.xp += xp; suma += xp;
      for(const ev of avanzarRacha(perfil, dia)) dijo.push(ev);
      const sem = semanaDe(dia), tabla = (await storage.get(kSem(sem))) || {};
      tabla[cuenta] = { xp: (tabla[cuenta]?.xp || 0) + xp, nombre: perfil.nombre };
      await storage.put(kSem(sem), tabla);
    }
    if(c.nombre) perfil.nombre = limpio(c.nombre, 30) || perfil.nombre;
    perfil.t = ahora;
    await storage.put(kPerfil(cuenta), perfil);
    return Response.json({ bien: true, sumado: suma, eventos: [...new Set(dijo)], perfil: publico(perfil), ranking: await ranking(storage, semanaDe(hoy), { [cuenta]: perfil.nombre }) });
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
