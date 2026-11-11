/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · LA CONEXIÓN CON META (WhatsApp, Instagram y Facebook)
   ───────────────────────────────────────────────────────────────────────────
   Un solo webhook recibe los tres. Lo que llega se vuelve un mensaje nuestro:
     { canal: 'whatsapp'|'instagram'|'facebook', chat, nombre, texto, id, cuando }
   y lo que se manda sale por `enviar`.

   ⚠ La versión de la API de Graph (GRAPH_VERSION) NO lleva valor de fábrica a
   propósito: se pone la vigente el día que se conecte, leída de la documentación
   de Meta (regla 12). Igual que las llaves: van en secretos, nunca aquí.

   LinkedIn no está: su API de mensajes es sólo para socios aprobados (11 nov).
   ═══════════════════════════════════════════════════════════════════════════ */

const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** Meta firma cada aviso con el secreto de la app. Sin firma buena, no se atiende. */
export async function firmaValida(cuerpo, cabecera, secreto){
  if(!secreto || !cabecera || !cabecera.startsWith('sha256=')) return false;
  const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const esperada = hex(await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(cuerpo)));
  const dada = cabecera.slice(7);
  /* comparación de tiempo constante */
  if(dada.length !== esperada.length) return false;
  let d = 0; for(let i = 0; i < dada.length; i++) d |= dada.charCodeAt(i) ^ esperada.charCodeAt(i);
  return d === 0;
}

/** El aviso de Meta → nuestros mensajes. Ignora ecos, estados y lo que no es texto. */
export function leerAviso(a){
  const salen = [];
  for(const e of a?.entry || []){
    /* WhatsApp */
    for(const ch of e.changes || []){
      const v = ch.value || {};
      const nombres = Object.fromEntries((v.contacts || []).map(c => [c.wa_id, c.profile?.name]));
      for(const m of v.messages || []){
        salen.push({ canal: 'whatsapp', chat: m.from, nombre: nombres[m.from] || null, id: m.id,
          cuando: Number(m.timestamp) * 1000 || Date.now(),
          texto: m.type === 'text' ? m.text?.body || '' : null, tipo: m.type });
      }
    }
    /* Instagram y Facebook (Messenger) */
    for(const m of e.messaging || []){
      if(!m.message || m.message.is_echo) continue;
      salen.push({ canal: a.object === 'instagram' ? 'instagram' : 'facebook', chat: m.sender?.id, nombre: null,
        id: m.message.mid, cuando: m.timestamp || Date.now(), texto: m.message.text ?? null,
        tipo: m.message.text != null ? 'text' : 'otro' });
    }
  }
  return salen;
}

/** Manda un texto por el canal que toque. */
export async function enviar(env, canal, chat, texto){
  if(!env.GRAPH_VERSION) return { bien: false, error: 'Falta GRAPH_VERSION (se pone al conectar, de la documentación de Meta).' };
  const base = `https://graph.facebook.com/${env.GRAPH_VERSION}`;
  let url, cuerpo, token;
  if(canal === 'whatsapp'){
    url = `${base}/${env.WA_PHONE_ID}/messages`; token = env.WA_TOKEN;
    cuerpo = { messaging_product: 'whatsapp', to: chat, type: 'text', text: { body: texto } };
  } else {
    url = `${base}/${canal === 'instagram' ? env.IG_ID : env.FB_PAGE_ID}/messages`; token = env.META_PAGE_TOKEN;
    cuerpo = { recipient: { id: chat }, message: { text: texto } };
  }
  if(!token) return { bien: false, error: `Falta el token de ${canal}.` };
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(cuerpo) });
  return r.ok ? { bien: true } : { bien: false, error: `Meta contestó ${r.status}`, detalle: (await r.text()).slice(0, 300) };
}
