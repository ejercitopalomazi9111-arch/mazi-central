/* ══════════════════════════════════════════════════════════════════════════
   LA SALA · el buscador de YouTube para Mazi VR
   ──────────────────────────────────────────────────────────────────────────
   En el visor, Carlos escribe con el teclado de la VR y pide videos. El
   teléfono no puede buscar en YouTube solo: su página no da permiso de CORS
   y su API pide llave con cuota. Esto pide la página de resultados como la
   pediría un navegador, saca de ahí la lista (ytInitialData) y regresa SÓLO
   los datos para elegir: id, título, canal, duración y miniatura.
   El video se ve con el reproductor oficial de YouTube (embed) en el visor;
   aquí no pasa ni un byte de video.
   Ruta: GET /api/sala/vr/buscar?q=<texto>
   ═════════════════════════════════════════════════════════════════════════ */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const mal = (status, error) => Response.json({ bien: false, error }, { status });

/* recorre el árbol y junta cada videoRenderer, en el orden en que salen */
export function sacarVideos(datos, max = 24){
  const out = [], pila = [datos];
  while(pila.length && out.length < max){
    const n = pila.pop();
    if(!n || typeof n !== 'object') continue;
    if(n.videoRenderer?.videoId){
      const v = n.videoRenderer;
      const texto = (t) => t?.simpleText || (t?.runs || []).map((r) => r.text).join('') || '';
      out.push({ id: v.videoId, titulo: texto(v.title), canal: texto(v.ownerText), dura: texto(v.lengthText),
        mini: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`, envivo: !v.lengthText });
      continue;
    }
    /* al revés para que pop() respete el orden de la página */
    const hijos = Array.isArray(n) ? n : Object.values(n);
    for(let i = hijos.length - 1; i >= 0; i--) if(hijos[i] && typeof hijos[i] === 'object') pila.push(hijos[i]);
  }
  return out;
}
export function leerPagina(html){
  const m = html.match(/var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s) || html.match(/ytInitialData"\]\s*=\s*(\{.*?\});/s);
  if(!m) return null;
  try{ return JSON.parse(m[1]); }catch{ return null; }
}

export async function buscarYouTube(url, pedir = fetch){
  const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
  if(!q) return mal(400, 'Falta ?q= con lo que se busca.');
  let r;
  try{
    r = await pedir('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&hl=es&gl=MX', {
      headers: { 'User-Agent': UA, 'Accept-Language': 'es-MX,es;q=0.9', 'Cookie': 'CONSENT=YES+1' },
    });
  }catch(e){ return mal(502, `YouTube no contestó: ${String(e?.message || e).slice(0, 120)}`); }
  if(!r.ok) return mal(502, `YouTube contestó ${r.status}.`);
  const datos = leerPagina(await r.text());
  if(!datos) return mal(502, 'YouTube cambió su página: no encontré la lista de resultados.');
  return Response.json({ bien: true, q, videos: sacarVideos(datos) }, { headers: { 'Cache-Control': 'public, max-age=600' } });
}
