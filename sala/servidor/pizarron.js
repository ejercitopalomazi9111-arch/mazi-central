/* ══════════════════════════════════════════════════════════════════════════
   EL PIZARRÓN · /api/sala/<CODIGO>/pizarron
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 12 nov: «un pizarrón para anotar pendientes, tareas… fotos,
   recuadros, texto, líneas de tiempo… por fases, por apartados, qué se ha
   completado y qué no». Vive en la sala para verse igual en todos los
   teléfonos, y para que cualquier IA de la mesa pueda apuntar ahí también.

   Cada TABLERO (un proyecto) guarda sus elementos uno por uno:
     piz:tableros          { id: { id, nombre, creado, cambiado } }
     piz:e:<tablero>:<id>  el elemento (nota, recuadro, texto, foto, línea, lista, flecha)
   Guardar es mandar SÓLO lo que cambió; cada elemento trae su hora (`t`) y
   gana el más nuevo, así dos teléfonos que mueven cosas distintas no se pisan.
   Borrar deja una lápida unos días para que otro teléfono no lo reviva.

   Rutas (sólo GET y POST: el CORS del worker no deja más):
     GET                       → { tableros }
     GET  ?tablero=ID          → { tablero, elementos, hora }
     GET  ?tablero=ID&desde=T  → sólo lo que cambió después de T
     GET  ?tablero=ID&foto=ID  → la imagen de una foto (las fotos van aparte: revisar cambios no baja megas)
     POST { tablero, cambios: [elemento…], borrados: [id…] }
     POST { accion: 'tablero', id?, nombre }       crear o renombrar
     POST { accion: 'borrarTablero', id }
   ═════════════════════════════════════════════════════════════════════════ */
export const MAX_ELEMENTO = 1_800_000;          /* clave + valor ≤ 2 MB en Durable Objects */
const TIPOS = new Set(['nota', 'recuadro', 'texto', 'foto', 'linea', 'lista', 'flecha']);
const K_TABLEROS = 'piz:tableros';
const kEl = (t, id) => `piz:e:${t}:${id}`;
const kFoto = (t, id) => `piz:f:${t}:${id}`;
const LAPIDA_MS = 14 * 864e5;
const limpio = (v, max) => String(v ?? '').slice(0, max);
const idValido = (x) => typeof x === 'string' && /^[a-z0-9_-]{1,40}$/i.test(x);

export async function atenderPizarron(storage, pedido, url, cuenta, ahora = Date.now()){
  const tableros = (await storage.get(K_TABLEROS)) || {};
  if(!Object.keys(tableros).length){
    tableros.general = { id: 'general', nombre: 'Pendientes', creado: ahora, cambiado: ahora };
    await storage.put(K_TABLEROS, tableros);
  }

  if(pedido.method === 'GET'){
    const t = url.searchParams.get('tablero');
    if(!t) return Response.json({ bien: true, tableros: Object.values(tableros).sort((a, b) => a.creado - b.creado) });
    if(!tableros[t]) return Response.json({ error: 'Ese tablero ya no existe.' }, { status: 404 });
    const foto = url.searchParams.get('foto');
    if(foto){
      const d = idValido(foto) && await storage.get(kFoto(t, foto)), m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(d || '');
      if(!m) return Response.json({ error: 'Esa foto ya no está.' }, { status: 404 });
      return new Response(Uint8Array.from(atob(m[2]), (x) => x.charCodeAt(0)), { headers: { 'content-type': m[1], 'cache-control': 'private, max-age=31536000, immutable' } });
    }
    const desde = Number(url.searchParams.get('desde')) || 0;
    const todos = [...(await storage.list({ prefix: kEl(t, '') })).values()];
    const elementos = todos.filter((e) => e.t > desde && (desde || !e.borrado));
    return Response.json({ bien: true, tablero: tableros[t], elementos, hora: ahora });
  }
  if(pedido.method !== 'POST') return Response.json({ error: 'Usa GET o POST.' }, { status: 405 });

  const crudo = await pedido.text().catch(() => '');
  if(crudo.length > 12_000_000) return Response.json({ error: 'Es demasiado grande de un jalón (más de 12 MB). Sube las fotos de una en una.' }, { status: 413 });
  let c; try{ c = JSON.parse(crudo || '{}'); }catch{ return Response.json({ error: 'No entendí la petición.' }, { status: 400 }); }

  if(c.accion === 'tablero'){
    const nombre = limpio(c.nombre, 60).trim(); if(!nombre) return Response.json({ error: 'Ponle nombre al tablero.' }, { status: 400 });
    const id = idValido(c.id) && tableros[c.id] ? c.id : 't' + ahora.toString(36) + Math.random().toString(36).slice(2, 6);
    tableros[id] = { ...(tableros[id] || { id, creado: ahora }), nombre, cambiado: ahora };
    await storage.put(K_TABLEROS, tableros);
    return Response.json({ bien: true, tablero: tableros[id] });
  }
  if(c.accion === 'borrarTablero'){
    if(!tableros[c.id]) return Response.json({ error: 'Ese tablero ya no existe.' }, { status: 404 });
    if(Object.keys(tableros).length === 1) return Response.json({ error: 'Es el único tablero: no se puede borrar.' }, { status: 400 });
    const claves = [...(await storage.list({ prefix: kEl(c.id, '') })).keys()];
    for(let i = 0; i < claves.length; i += 128) await storage.delete(claves.slice(i, i + 128));
    delete tableros[c.id]; await storage.put(K_TABLEROS, tableros);
    return Response.json({ bien: true });
  }

  const t = c.tablero;
  if(!tableros[t]) return Response.json({ error: 'Ese tablero ya no existe.' }, { status: 404 });
  const cambios = (Array.isArray(c.cambios) ? c.cambios : []).slice(0, 400);
  const borrados = (Array.isArray(c.borrados) ? c.borrados : []).filter(idValido).slice(0, 400);
  const ids = [...new Set([...cambios.map((e) => e && e.id), ...borrados])].filter(idValido);
  const previos = new Map();
  for(let i = 0; i < ids.length; i += 128){ const m = await storage.get(ids.slice(i, i + 128).map((id) => kEl(t, id))); for(const [k, v] of m) previos.set(k, v); }
  const escribir = {}; let rechazados = 0;
  for(const e0 of cambios){
    if(!e0 || !idValido(e0.id) || !TIPOS.has(e0.tipo)){ rechazados++; continue; }
    const e = { ...e0 };
    /* la imagen de una foto se guarda aparte y el elemento sólo dice qué versión es */
    if(e.tipo === 'foto' && typeof e.src === 'string' && e.src.startsWith('data:image/')){
      if(e.src.length > MAX_ELEMENTO){ rechazados++; continue; }
      escribir[kFoto(t, e.id)] = e.src; e.src = 'v' + ahora.toString(36);
    }
    if(JSON.stringify(e).length > 200_000){ rechazados++; continue; }
    const k = kEl(t, e.id), viejo = previos.get(k);
    /* lo borrado no revive porque un teléfono atrasado lo vuelva a mandar; gana el último que guarda,
       y la hora la pone el servidor (un reloj de teléfono adelantado no gana para siempre) */
    if(viejo && viejo.borrado){ rechazados++; continue; }
    escribir[k] = { ...e, t: Math.max(ahora, (viejo && viejo.t || 0) + 1), por: limpio(cuenta, 40) };
  }
  for(const id of borrados){ const k = kEl(t, id); if((previos.get(k) || {}).tipo === 'foto') await storage.delete(kFoto(t, id)); escribir[k] = { id, tipo: (previos.get(k) || {}).tipo || 'nota', borrado: true, t: Math.max(ahora, ((previos.get(k) || {}).t || 0) + 1), por: limpio(cuenta, 40) }; }
  const claves = Object.keys(escribir);
  for(let i = 0; i < claves.length; i += 128){ const parte = {}; for(const k of claves.slice(i, i + 128)) parte[k] = escribir[k]; await storage.put(parte); }
  /* las lápidas viejas se barren de vez en cuando */
  if(Math.random() < .05){ const viejas = [...(await storage.list({ prefix: kEl(t, '') })).entries()].filter(([, v]) => v.borrado && v.t < ahora - LAPIDA_MS).map(([k]) => k); if(viejas.length) await storage.delete(viejas.slice(0, 128)); }
  tableros[t].cambiado = ahora; await storage.put(K_TABLEROS, tableros);
  return Response.json({ bien: true, hora: ahora, guardados: claves.length, rechazados });
}
