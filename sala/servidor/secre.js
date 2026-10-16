/* ══════════════════════════════════════════════════════════════════════════
   EL CAJÓN DE SECRE · /api/sala/<CODIGO>/secre
   ──────────────────────────────────────────────────────────────────────────
   Secre (la secretaria de WhatsApp, `secre/`) corre en un servidor gratis que
   BORRA su disco en cada reinicio. Sin un lugar fijo, cada reinicio sería
   volver a vincular WhatsApp y perder lo configurado. Carlos: «no vamos a
   gastar un peso» — y esta sala ya es suya y ya es gratis.

   Lo que llega aquí ya viene CIFRADO por Secre con su propia clave: la sala
   guarda bytes que no puede leer. Sólo la cuenta dueña de la sala entra.

   GET  ?k=principal          → { bien, datos: "…" | null }
   POST { k, datos: "…" }     → { bien, bytes }
   Trozos de 1.5 MB (clave + valor ≤ 2 MB en Durable Objects), tope 12 MB.
   ═════════════════════════════════════════════════════════════════════════ */
export const TROZO = 1_500_000;
export const MAX = 12 * 1024 * 1024;
const kCuantos = (k) => `secre:${k}:n`;
const kTrozo = (k, i) => `secre:${k}:${i}`;
const NOMBRE = /^[\w-]{1,30}$/;

export async function atenderSecre(storage, pedido, url){
  if(pedido.method === 'GET'){
    const k = url.searchParams.get('k') || '';
    if(!NOMBRE.test(k)) return Response.json({ error: 'Falta el nombre de la cuenta (k).' }, { status: 400 });
    const n = (await storage.get(kCuantos(k))) || 0;
    if(!n) return Response.json({ bien: true, datos: null });
    const m = await storage.get(Array.from({ length: n }, (_, i) => kTrozo(k, i)));
    const partes = Array.from({ length: n }, (_, i) => m.get(kTrozo(k, i)));
    if(partes.some((p) => typeof p !== 'string')) return Response.json({ error: 'Lo guardado está incompleto.' }, { status: 500 });
    return Response.json({ bien: true, datos: partes.join('') });
  }
  if(pedido.method !== 'POST') return Response.json({ error: 'Sólo GET y POST.' }, { status: 405 });
  const crudo = await pedido.text().catch(() => '');
  if(crudo.length > MAX + 1000) return Response.json({ error: 'Es demasiado grande.' }, { status: 413 });
  let c; try{ c = JSON.parse(crudo || '{}'); }catch{ return Response.json({ error: 'No entendí la petición.' }, { status: 400 }); }
  const k = String(c.k || '');
  if(!NOMBRE.test(k)) return Response.json({ error: 'Falta el nombre de la cuenta (k).' }, { status: 400 });
  if(typeof c.datos !== 'string' || !c.datos) return Response.json({ error: 'Faltan los datos.' }, { status: 400 });
  const antes = (await storage.get(kCuantos(k))) || 0;
  const n = Math.ceil(c.datos.length / TROZO);
  /* trozos y cuenta en UN solo put (hasta 128 claves van juntas y de un jalón):
     si se corta a la mitad, no queda una cuenta nueva apuntando a trozos viejos. */
  const todo = { [kCuantos(k)]: n };
  for(let i = 0; i < n; i++) todo[kTrozo(k, i)] = c.datos.slice(i * TROZO, (i + 1) * TROZO);
  await storage.put(todo);
  if(antes > n) await storage.delete(Array.from({ length: antes - n }, (_, i) => kTrozo(k, n + i)));
  return Response.json({ bien: true, bytes: c.datos.length });
}
