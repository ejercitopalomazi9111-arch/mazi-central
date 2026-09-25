/* ══════════════════════════════════════════════════════════════════════════
   EL BANCO DE IMÁGENES · /api/sala/<CODIGO>/banco
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «necesito hacer una base de datos de imágenes porque tengo 300 ya
   hechas para actualizar las presentaciones: registrarlas, qué es cada una,
   los temas que contiene y si ya está lista o requiere cambios específicos,
   y buscarlas por palabras clave y contenido».

   POR QUÉ VIVE AQUÍ y no en el teléfono: Safari borra lo que una página
   guarda si pasan siete días sin abrirla. Trescientas fichas escritas a mano
   no se pueden perder por unas vacaciones. Aquí quedan en el almacenamiento
   de la sala (SQLite de Cloudflare), detrás de la misma llave que la mesa, y
   se ven igual desde el iPhone que desde la compu.

   LÍMITES, verificados el 25 de septiembre en la documentación de Cloudflare
   (Durable Objects · Limits): clave + valor ≤ 2 MB por registro; 5 GB por
   cuenta en el plan gratis. Por eso cada imagen se guarda en trozos de
   1.5 MB, y la miniatura aparte para que la rejilla no baje 300 fotos enteras.

   Sólo GET y POST (el CORS del worker no deja más): cambiar y borrar van
   por POST con `accion`.
   ═════════════════════════════════════════════════════════════════════════ */
export const TROZO = 1_500_000;
export const MAX_IMAGEN = 20 * 1024 * 1024;
export const MAX_MINI = 400 * 1024;
export const MAX_FICHAS = 5000;
const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const ESTADOS = ['sin-revisar', 'lista', 'cambios'];

const K_FICHAS = 'banco:fichas';
const kTrozo = (id, n) => `banco:img:${id}:${n}`;
const kMini = (id) => `banco:mini:${id}`;

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const textoLargo = (v, max) => String(v ?? '').trim().slice(0, max);
const lista = (v) => [...new Set((Array.isArray(v) ? v : String(v ?? '').split(','))
  .map((x) => texto(x, 60).toLowerCase()).filter(Boolean))].slice(0, 40);

function deB64(b64){
  const s = atob(String(b64 || ''));
  const u = new Uint8Array(s.length);
  for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
function nuevoId(){
  const a = new Uint8Array(9); crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 14);
}
/* Sólo estos campos se pueden escribir desde afuera, y cada uno se limpia. */
export function limpiarCampos(c = {}){
  const s = {};
  if('titulo' in c) s.titulo = texto(c.titulo, 140);
  if('descripcion' in c) s.descripcion = textoLargo(c.descripcion, 2000);
  if('temas' in c) s.temas = lista(c.temas);
  if('palabras' in c) s.palabras = lista(c.palabras);
  if('estado' in c && ESTADOS.includes(c.estado)) s.estado = c.estado;
  if('cambios' in c) s.cambios = textoLargo(c.cambios, 1500);
  if('notas' in c) s.notas = textoLargo(c.notas, 1500);
  if('carpeta' in c) s.carpeta = texto(c.carpeta, 80);
  if('ia' in c) s.ia = !!c.ia;
  return s;
}

export async function atenderBanco(storage, pedido, url, cuenta){
  const fichas = (await storage.get(K_FICHAS)) || {};

  if(pedido.method === 'GET'){
    const id = url.searchParams.get('id');
    if(!id) return Response.json({ bien: true, fichas: Object.values(fichas).sort((a, b) => b.creado - a.creado) });
    const f = fichas[id];
    if(!f) return Response.json({ error: 'Esa imagen ya no está en el banco.' }, { status: 404 });
    const cab = { 'Content-Type': f.mime, 'Cache-Control': 'private, max-age=31536000, immutable' };
    if(url.searchParams.get('parte') === 'mini'){
      const m = await storage.get(kMini(id));
      return m ? new Response(m, { headers: { ...cab, 'Content-Type': 'image/jpeg' } }) : Response.json({ error: 'Sin miniatura.' }, { status: 404 });
    }
    const trozos = await storage.get(Array.from({ length: f.partes }, (_, n) => kTrozo(id, n)));
    const partes = Array.from({ length: f.partes }, (_, n) => trozos.get(kTrozo(id, n)));
    if(partes.some((p) => !p)) return Response.json({ error: 'La imagen está incompleta en el banco.' }, { status: 500 });
    const todo = new Uint8Array(f.bytes);
    let o = 0; for(const p of partes){ todo.set(new Uint8Array(p), o); o += p.byteLength; }
    return new Response(todo, { headers: cab });
  }

  if(pedido.method !== 'POST') return Response.json({ error: 'Sólo GET y POST.' }, { status: 405 });
  const crudo = await pedido.text().catch(() => '');
  if(crudo.length > 40_000_000) return Response.json({ error: 'Es demasiado grande.' }, { status: 413 });
  let c; try{ c = JSON.parse(crudo || '{}'); }catch{ return Response.json({ error: 'No entendí la petición.' }, { status: 400 }); }

  if(c.accion === 'subir'){
    if(Object.keys(fichas).length >= MAX_FICHAS) return Response.json({ error: `El banco ya tiene ${MAX_FICHAS} imágenes, que es el tope.` }, { status: 409 });
    const mime = String(c.mime || '');
    if(!TIPOS.has(mime)) return Response.json({ error: 'Sólo fotos JPG, PNG, WebP o GIF.' }, { status: 400 });
    let bytes, mini;
    try{ bytes = deB64(c.datos); mini = c.mini ? deB64(c.mini) : null; }catch{ return Response.json({ error: 'La imagen venía dañada.' }, { status: 400 }); }
    if(!bytes.length) return Response.json({ error: 'Falta la imagen.' }, { status: 400 });
    if(bytes.length > MAX_IMAGEN) return Response.json({ error: 'La imagen pesa más de 20 MB.' }, { status: 413 });
    if(mini && mini.length > MAX_MINI) return Response.json({ error: 'La miniatura pesa demasiado.' }, { status: 413 });
    const id = nuevoId();
    const partes = Math.ceil(bytes.length / TROZO);
    const escribir = {};
    for(let n = 0; n < partes; n++) escribir[kTrozo(id, n)] = bytes.slice(n * TROZO, (n + 1) * TROZO);
    if(mini) escribir[kMini(id)] = mini;
    // De a 100 claves por put (el límite de la API), pero aquí nunca pasa de 14.
    await storage.put(escribir);
    const ahora = Date.now();
    const f = {
      id, nombre: texto(c.nombre, 140) || 'imagen', mime, bytes: bytes.length, partes,
      ancho: Math.max(0, Math.round(Number(c.ancho) || 0)), alto: Math.max(0, Math.round(Number(c.alto) || 0)),
      titulo: '', descripcion: '', temas: [], palabras: [], estado: 'sin-revisar', cambios: '', notas: '', carpeta: '', ia: false,
      origen: typeof c.origen === 'string' && fichas[c.origen] ? c.origen : null,
      creado: ahora, cambiado: ahora, quien: cuenta,
      ...limpiarCampos(c.campos || {}),
    };
    fichas[id] = f;
    await storage.put(K_FICHAS, fichas);
    return Response.json({ bien: true, ficha: f });
  }

  if(c.accion === 'cambiar' || c.accion === 'cambiarVarias'){
    const ids = c.accion === 'cambiar' ? [c.id] : (Array.isArray(c.ids) ? c.ids : []);
    const campos = limpiarCampos(c.campos || {});
    const agregar = c.agregarTemas ? lista(c.agregarTemas) : [];
    const hechas = [];
    for(const id of ids.slice(0, MAX_FICHAS)){
      const f = fichas[id];
      if(!f) continue;
      Object.assign(f, campos);
      if(agregar.length) f.temas = [...new Set([...f.temas, ...agregar])].slice(0, 40);
      f.cambiado = Date.now();
      hechas.push(f);
    }
    if(!hechas.length) return Response.json({ error: 'No encontré esa imagen en el banco.' }, { status: 404 });
    await storage.put(K_FICHAS, fichas);
    return Response.json({ bien: true, fichas: hechas, ficha: hechas[0] });
  }

  if(c.accion === 'borrar'){
    const f = fichas[c.id];
    if(!f) return Response.json({ error: 'Esa imagen ya no estaba.' }, { status: 404 });
    await storage.delete([...Array.from({ length: f.partes }, (_, n) => kTrozo(f.id, n)), kMini(f.id)]);
    delete fichas[c.id];
    await storage.put(K_FICHAS, fichas);
    return Response.json({ bien: true });
  }

  return Response.json({ error: 'No sé hacer eso con el banco.' }, { status: 400 });
}
