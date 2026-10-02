/* ══════════════════════════════════════════════════════════════════════════
   LA SALA · el recadero de INKWELL
   ──────────────────────────────────────────────────────────────────────────
   INKWELL le baja a Carlos capítulos de Webtoon para leerlos sin internet.
   El teléfono no puede pedirlos solo, por dos cosas que no se brincan desde
   una página:
     · Webtoon no da permiso de CORS: Safari no deja que otra página lea sus
       respuestas.
     · Sus imágenes (pstatic.net) contestan 403 si el pedido no dice que
       viene de webtoons.com (cabecera Referer), y un navegador no deja
       ponerla a mano.
   Esto las pide por él, con la cabecera que hace falta, y se las entrega.
   Wattpad no pasa por aquí: su API sí da CORS y el teléfono la lee directo.

   Es un recadero ANGOSTO a propósito: sólo GET, sólo https, sólo los hosts de
   la lista. No guarda nada: lo que baja vive en el teléfono de Carlos, nunca
   en un servidor nuestro ni en el repo.
   Ruta: GET /api/sala/inkwell/traer?url=<https://…>  (la Central la pasa
   por su puerta, así que para el iPhone es la misma dirección).
   ═════════════════════════════════════════════════════════════════════════ */
export const HOSTS = [
  'www.webtoons.com', 'webtoons.com', 'm.webtoons.com',
  'webtoon-phinf.pstatic.net', 'swebtoon-phinf.pstatic.net', 'webtoons-static.pstatic.net',
];
const ESCRITORIO = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MOVIL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const TIPOS = /^(text\/html|application\/json|image\/)/i;

const mal = (status, error) => Response.json({ bien: false, error }, { status });

export async function traer(url, buscar = fetch){
  let destino;
  try{ destino = new URL(url.searchParams.get('url') || ''); }
  catch{ return mal(400, 'Falta ?url= con una dirección completa.'); }
  if(destino.protocol !== 'https:') return mal(400, 'Sólo https.');
  if(!HOSTS.includes(destino.hostname)) return mal(403, `INKWELL no trae nada de ${destino.hostname}.`);
  let r;
  try{
    r = await buscar(destino.toString(), {
      redirect: 'follow',
      headers: {
        /* la API de la lista de capítulos es la de la página para teléfono */
        'User-Agent': destino.hostname === 'm.webtoons.com' ? MOVIL : ESCRITORIO,
        'Referer': 'https://www.webtoons.com/',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      },
    });
  } catch(e){ return mal(502, `Webtoon no contestó: ${String((e && e.message) || e).slice(0, 160)}`); }
  const tipo = r.headers.get('content-type') || '';
  if(r.ok && !TIPOS.test(tipo)) return mal(415, `Webtoon mandó algo que no es página ni imagen (${tipo}).`);
  return new Response(r.body, {
    status: r.status,
    headers: {
      'content-type': tipo || 'application/octet-stream',
      /* las imágenes de un capítulo no cambian; la lista sí */
      'Cache-Control': tipo.startsWith('image/') ? 'public, max-age=604800, immutable' : 'no-store',
    },
  });
}
