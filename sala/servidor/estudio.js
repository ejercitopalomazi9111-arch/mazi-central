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
