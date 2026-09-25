/* ══════════════════════════════════════════════════════════════════════════
   MIS ELEMENTOS · /api/sala/<CODIGO>/elementos
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «que pueda crear los suyos propios para agregarlos». Lo que arma en
   una lámina —una forma con su texto, un diseño recoloreado, un logo, un
   dibujo hecho con el dedo, un icono hecho por la IA— se guarda aquí y se
   vuelve a poner en cualquier presentación.

   Vive en la sala por la misma razón que el banco de imágenes: Safari borra
   lo guardado por una página tras siete días sin abrirla, y lo que uno hace
   a mano no se puede perder por unas vacaciones.

   Cada elemento son TRES cosas guardadas aparte:
   · la ficha (nombre, tamaño, fecha) en una lista, que es lo que baja rápido;
   · la VISTA: el dibujo ya digerido (formas, colores, texto y miniaturas de
     sus imágenes) para pintarlo en la rejilla sin abrir PowerPoint;
   · los DATOS: el XML de PowerPoint y sus imágenes originales, en trozos de
     1.5 MB (clave + valor ≤ 2 MB en Durable Objects), que sólo se bajan al
     ponerlo en una lámina.

   Sólo GET y POST (el CORS del worker no deja más).
   ═════════════════════════════════════════════════════════════════════════ */
export const TROZO = 1_500_000;
export const MAX_DATOS = 15 * 1024 * 1024;
export const MAX_VISTA = 400 * 1024;
export const MAX_ELEMENTOS = 1000;

const K_LISTA = 'elem:lista';
const kVista = (id) => `elem:vista:${id}`;
const kTrozo = (id, n) => `elem:datos:${id}:${n}`;

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const ORIGENES = new Set(['lamina', 'dibujo', 'ia', 'imagen']);

function nuevoId(){
  const a = new Uint8Array(9); crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 14);
}
/* storage.get con muchas claves: la API acepta hasta 128 por llamada. */
async function leerVarias(storage, claves){
  const salida = new Map();
  for(let i = 0; i < claves.length; i += 128){
    const m = await storage.get(claves.slice(i, i + 128));
    for(const [k, v] of m) salida.set(k, v);
  }
  return salida;
}

export async function atenderElementos(storage, pedido, url, cuenta){
  const lista = (await storage.get(K_LISTA)) || {};

  if(pedido.method === 'GET'){
    const id = url.searchParams.get('id');
    if(!id){
      const fichas = Object.values(lista).sort((a, b) => b.creado - a.creado);
      const vistas = await leerVarias(storage, fichas.map((f) => kVista(f.id)));
      return Response.json({ bien: true, elementos: fichas.map((f) => ({ ...f, vista: vistas.get(kVista(f.id)) || null })) });
    }
    const f = lista[id];
    if(!f) return Response.json({ error: 'Ese elemento ya no está.' }, { status: 404 });
    const trozos = await leerVarias(storage, Array.from({ length: f.partes }, (_, n) => kTrozo(id, n)));
    const partes = Array.from({ length: f.partes }, (_, n) => trozos.get(kTrozo(id, n)));
    if(partes.some((p) => !p)) return Response.json({ error: 'El elemento está incompleto.' }, { status: 500 });
    const todo = new Uint8Array(f.bytes);
    let o = 0; for(const p of partes){ todo.set(new Uint8Array(p), o); o += p.byteLength; }
    // Los datos ya son JSON (lo guardó así la página): se regresan tal cual.
    return new Response(todo, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, max-age=31536000, immutable' } });
  }

  if(pedido.method !== 'POST') return Response.json({ error: 'Sólo GET y POST.' }, { status: 405 });
  const crudo = await pedido.text().catch(() => '');
  if(crudo.length > 30_000_000) return Response.json({ error: 'Es demasiado grande.' }, { status: 413 });
  let c; try{ c = JSON.parse(crudo || '{}'); }catch{ return Response.json({ error: 'No entendí la petición.' }, { status: 400 }); }

  if(c.accion === 'guardar'){
    if(Object.keys(lista).length >= MAX_ELEMENTOS) return Response.json({ error: `Ya tienes ${MAX_ELEMENTOS} elementos, que es el tope. Borra alguno.` }, { status: 409 });
    const d = c.datos;
    if(!d || typeof d.xml !== 'string' || !d.xml.trim()) return Response.json({ error: 'Falta el elemento.' }, { status: 400 });
    // Sólo lo que la página sabe leer de vuelta; nada más se guarda.
    const medios = {};
    for(const [rid, m] of Object.entries(d.medios || {})){
      if(!/^[\w-]{1,40}$/.test(rid) || !/^image\/[\w.+-]{1,40}$/.test(String(m?.mime)) || typeof m?.b64 !== 'string') return Response.json({ error: 'Una imagen del elemento venía dañada.' }, { status: 400 });
      medios[rid] = { mime: m.mime, b64: m.b64 };
    }
    const limpio = { xml: d.xml, medios, ancho: Number(d.ancho) || 0, alto: Number(d.alto) || 0, caja: d.caja && typeof d.caja === 'object' ? { x: +d.caja.x || 0, y: +d.caja.y || 0, w: +d.caja.w || 0, h: +d.caja.h || 0 } : null };
    const bytes = new TextEncoder().encode(JSON.stringify(limpio));
    if(bytes.length > MAX_DATOS) return Response.json({ error: 'El elemento pesa más de 15 MB. Si trae una foto enorme, achícala primero.' }, { status: 413 });
    const vista = typeof c.vista === 'string' ? c.vista : c.vista ? JSON.stringify(c.vista) : '';
    if(vista.length > MAX_VISTA) return Response.json({ error: 'La vista del elemento pesa demasiado.' }, { status: 413 });
    const id = nuevoId();
    const partes = Math.max(1, Math.ceil(bytes.length / TROZO));
    const escribir = {};
    for(let n = 0; n < partes; n++) escribir[kTrozo(id, n)] = bytes.slice(n * TROZO, (n + 1) * TROZO);
    if(vista) escribir[kVista(id)] = vista;
    await storage.put(escribir);
    const f = {
      id, nombre: texto(c.nombre, 80) || 'Mi elemento', origen: ORIGENES.has(c.origen) ? c.origen : 'lamina',
      proporcion: Number(limpio.caja?.w) > 0 && Number(limpio.caja?.h) > 0 ? Math.round(limpio.caja.w / limpio.caja.h * 1000) / 1000 : 1,
      bytes: bytes.length, partes, creado: Date.now(), quien: cuenta,
    };
    lista[id] = f;
    await storage.put(K_LISTA, lista);
    return Response.json({ bien: true, elemento: { ...f, vista: vista || null } });
  }

  if(c.accion === 'renombrar'){
    const f = lista[c.id];
    if(!f) return Response.json({ error: 'Ese elemento ya no está.' }, { status: 404 });
    f.nombre = texto(c.nombre, 80) || f.nombre;
    await storage.put(K_LISTA, lista);
    return Response.json({ bien: true, elemento: f });
  }

  if(c.accion === 'borrar'){
    const f = lista[c.id];
    if(!f) return Response.json({ error: 'Ese elemento ya no estaba.' }, { status: 404 });
    await storage.delete([...Array.from({ length: f.partes }, (_, n) => kTrozo(f.id, n)), kVista(f.id)]);
    delete lista[c.id];
    await storage.put(K_LISTA, lista);
    return Response.json({ bien: true });
  }

  return Response.json({ error: 'No sé hacer eso con tus elementos.' }, { status: 400 });
}
