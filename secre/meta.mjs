/* ══════════════════════════════════════════════════════════════════════════
   SECRE · Instagram y Facebook Messenger (adaptador)
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 4 de noviembre: «hay muchas compañías grandes que hacen bots de
   respuesta automática para Instagram, Facebook, LinkedIn… Secre debe ser capaz
   de responder en cualquier lugar».

   Los mensajes de Instagram y de Messenger entran como chats más de Secre
   (jid «ig:<id>» o «fb:<id>»): mismas reglas, mismo criterio, mismos avisos a su
   WhatsApp y mismo panel. Esto sólo traduce entre Meta y Secre.

   Verificado el 4 de noviembre contra developers.facebook.com
   (instagram-platform/instagram-api-with-instagram-login/messaging-api):
     · Cuenta de Instagram PROFESIONAL (de empresa o de creador).
     · Permisos instagram_business_basic + instagram_business_manage_messages.
       Acceso estándar alcanza para la cuenta propia; «Advanced Access» sólo hace
       falta para manejar cuentas ajenas (algunas funciones pueden fallar sin él).
     · NO se puede escribir primero: sólo contestar a quien escribió, dentro de 24 h.
     · Mandar: POST graph.instagram.com/<IG_ID>/messages { recipient:{id}, message:{text} }.
   LinkedIn NO: su API de mensajes es sólo para socios aprobados por LinkedIn.

   Variables (en Render, nunca en el repo):
     META_VERIFY_TOKEN   palabra que inventa Carlos y pone igual en el panel de Meta
     META_APP_SECRET     para comprobar que el aviso viene de Meta (firma X-Hub-Signature-256)
     IG_ID · IG_TOKEN    la cuenta de Instagram y su llave (Instagram Login)
     FB_PAGE_TOKEN       la llave de la página de Facebook (Messenger)
     META_VERSION        de fábrica v23.0
   ═════════════════════════════════════════════════════════════════════════ */
import crypto from 'crypto';

export const esMeta = (jid) => /^(ig|fb):/.test(String(jid || ''));
export function canalesMeta(env = process.env){
  return { instagram: !!(env.IG_ID && env.IG_TOKEN), messenger: !!env.FB_PAGE_TOKEN, webhook: !!env.META_VERIFY_TOKEN };
}

/* GET de verificación: Meta manda hub.mode, hub.verify_token y hub.challenge */
export function verificar(params, env = process.env){
  if(params.get('hub.mode') === 'subscribe' && env.META_VERIFY_TOKEN && params.get('hub.verify_token') === env.META_VERIFY_TOKEN) return params.get('hub.challenge') || '';
  return null;
}
/* la firma del POST: sha256=HMAC(app secret, cuerpo crudo). Sin secreto configurado no se acepta nada */
export function firmaValida(crudo, cabecera, env = process.env){
  if(!env.META_APP_SECRET) return false;
  const esperada = 'sha256=' + crypto.createHmac('sha256', env.META_APP_SECRET).update(crudo).digest('hex');
  const a = Buffer.from(String(cabecera || '')), b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* el cuerpo de Meta → mensajes de Secre. Los ecos (lo que mandó la propia cuenta) salen como «mio» */
export function leerAviso(body){
  const out = [];
  const pref = body && body.object === 'instagram' ? 'ig' : body && body.object === 'page' ? 'fb' : '';
  if(!pref) return out;
  for(const e of body.entry || []){
    for(const m of e.messaging || []){
      const msg = m.message; if(!msg) continue;
      const eco = !!msg.is_echo, otro = eco ? m.recipient && m.recipient.id : m.sender && m.sender.id;
      if(!otro) continue;
      const texto = msg.text || (msg.attachments && msg.attachments.length ? `[${msg.attachments.map(a => a.type).join(', ')}]` : '');
      if(!texto) continue;
      out.push({ id: msg.mid || '', chat: `${pref}:${otro}`, de: `${pref}:${otro}`, texto, mio: eco, t: m.timestamp || Date.now(), canal: pref === 'ig' ? 'Instagram' : 'Messenger' });
    }
  }
  return out;
}

/* mandar texto. Instagram corta a 1,000 caracteres por mensaje: se parte en pedazos */
export async function enviarMeta(jid, texto, env = process.env, pedir = fetch){
  const [pref, id] = String(jid).split(':'), v = env.META_VERSION || 'v23.0';
  const trozos = String(texto).match(/[\s\S]{1,990}(\s|$)|[\s\S]{1,990}/g) || [String(texto)];
  let ultimo = '';
  for(const t of trozos){
    let r;
    if(pref === 'ig'){
      if(!env.IG_ID || !env.IG_TOKEN) throw new Error('Instagram no está conectado (faltan IG_ID e IG_TOKEN).');
      r = await pedir(`https://graph.instagram.com/${v}/${env.IG_ID}/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.IG_TOKEN },
        body: JSON.stringify({ recipient: { id }, message: { text: t.trim() } }) });
    } else if(pref === 'fb'){
      if(!env.FB_PAGE_TOKEN) throw new Error('Messenger no está conectado (falta FB_PAGE_TOKEN).');
      r = await pedir(`https://graph.facebook.com/${v}/me/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.FB_PAGE_TOKEN },
        body: JSON.stringify({ recipient: { id }, messaging_type: 'RESPONSE', message: { text: t.trim() } }) });
    } else throw new Error('No es un chat de Meta: ' + jid);
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `Meta contestó ${r.status}`);
    ultimo = j.message_id || ultimo;
  }
  return ultimo;
}

/* el nombre de quien escribe (para que Secre sepa con quién habla). Si falla, el id */
export async function nombreMeta(jid, env = process.env, pedir = fetch){
  const [pref, id] = String(jid).split(':'), v = env.META_VERSION || 'v23.0';
  try{
    if(pref === 'ig'){ const r = await pedir(`https://graph.instagram.com/${v}/${id}?fields=name,username`, { headers: { authorization: 'Bearer ' + env.IG_TOKEN } }); const j = await r.json(); return j.name || (j.username ? '@' + j.username : '') || ''; }
    if(pref === 'fb'){ const r = await pedir(`https://graph.facebook.com/${v}/${id}?fields=first_name,last_name`, { headers: { authorization: 'Bearer ' + env.FB_PAGE_TOKEN } }); const j = await r.json(); return [j.first_name, j.last_name].filter(Boolean).join(' '); }
  }catch{}
  return '';
}
