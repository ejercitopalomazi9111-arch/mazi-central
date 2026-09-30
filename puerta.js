/* ══════════════════════════════════════════════════════════════════════════
   LA PUERTA · La Sala por la misma dirección de la Central
   ──────────────────────────────────────────────────────────────────────────
   Por qué existe: Presentaciones le hablaba a La Sala en OTRA dirección
   (sala.palomazi9111.workers.dev). Para el iPhone eso es «otro sitio», y
   cuando algo entre los dos se atraviesa —un bloqueador, el relevo privado,
   una respuesta sin permiso de CORS— Safari no dice qué pasó: dice
   «Load failed» y ya. El 30 de septiembre Carlos tenía Gemini, Groq y el
   banco caídos con ese letrero y el servidor contestando bien desde aquí.

   Con esta puerta la página pide `/api/sala/…` a su PROPIA dirección y esta
   pieza se lo pasa a La Sala por dentro de Cloudflare (enlace de servicio,
   no internet). Para el teléfono ya no hay otro sitio, ni CORS, ni pregunta
   previa: es la misma casa.

   Todo lo demás lo sirven los archivos de `dist/` como siempre: esta pieza
   sólo se despierta para lo que NO es un archivo (Cloudflare sirve primero
   los archivos que existen). Si algún día falta el enlace, contesta un
   error que se lee, y la página vuelve a la dirección de siempre sola.
   ═════════════════════════════════════════════════════════════════════════ */
/* 'sala' = contestó La Sala; 'sin-sala' = la puerta misma no pudo pasar el recado. */
const MARCA = { 'X-Puerta': 'sin-sala' };

function error(status, texto){
  return Response.json({ bien: false, error: texto }, { status, headers: MARCA });
}

export default {
  async fetch(pedido, env){
    const url = new URL(pedido.url);
    if(url.pathname.startsWith('/api/sala/')){
      if(!env.SALA) return error(503, 'La puerta de la Central no tiene enlace con La Sala.');
      /* Lo que llega de una página de ESTA misma dirección es de casa: se le
         quita el Origin para que La Sala no lo compare contra su lista (una
         vista previa o un dominio nuevo no deben dar «Desde ahí no»). Lo de
         otro sitio pasa con su Origin y La Sala lo revisa como siempre. */
      const h0 = new Headers(pedido.headers);
      if(h0.get('Origin') === url.origin) h0.delete('Origin');
      let r;
      try{ r = await env.SALA.fetch(new Request(pedido, { headers: h0 })); }
      catch(e){ return error(502, `La Sala no contestó por la puerta: ${e.message}`); }
      /* El websocket de la mesa se entrega tal cual: una respuesta 101 no se
         puede volver a armar. */
      if(r.status === 101 || r.webSocket) return r;
      const h = new Headers(r.headers);
      h.set('X-Puerta', 'sala');
      h.set('Cache-Control', h.get('Cache-Control') || 'no-store');
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
    }
    return env.ASSETS.fetch(pedido);
  },
};
