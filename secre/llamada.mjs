/* ══════════════════════════════════════════════════════════════════════════
   SECRE · llamarle a Carlos por teléfono (adaptador)
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 16 de octubre: «ponle que me pueda hacer llamadas». Una llamada de
   WhatsApp NO se puede: Baileys (la pieza que habla con WhatsApp) sólo sabe
   rechazar llamadas, no hacerlas — revisado en su código ese día. Así que es
   una llamada de teléfono normal, con una voz que lee el aviso dos veces.

   Hoy va con Twilio (verificado el 16 de octubre en twilio.com/docs/voice/api/
   call-resource y .../twiml/say/text-speech): POST a
   /2010-04-01/Accounts/{SID}/Calls.json con To, From y Twiml; la voz en
   español de México es Polly.Mia-Neural. Es un servicio de paga (la cuenta de
   prueba trae saldo y sí puede llamar a un número verificado, que es el de
   Carlos). Si mañana se cambia de proveedor, se cambia ESTE archivo y nada más.

   Variables (en Render, nunca en el repo):
     TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN · TWILIO_FROM (el número de Twilio, +1…)
   ═════════════════════════════════════════════════════════════════════════ */
const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

export function llamadasListas(env = process.env){
  return !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);
}
export function faltaParaLlamar(env = process.env){
  return ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM'].filter((k) => !env[k]);
}

/* un número de WhatsApp (5214421234567) → el de teléfono (+524421234567):
   el «1» después del 52 es cosa de WhatsApp, no se marca */
export function aTelefono(t){
  let d = String(t || '').replace(/\D/g, '');
  if(/^521\d{10}$/.test(d)) d = '52' + d.slice(3);
  if(/^\d{10}$/.test(d)) d = '52' + d;
  return d.length >= 11 ? '+' + d : '';
}

export function twimlDe(texto){
  const t = esc(String(texto).replace(/\s+/g, ' ').trim().slice(0, 1200));
  const di = `<Say language="es-MX" voice="Polly.Mia-Neural">${t}</Say>`;
  return `<Response>${di}<Pause length="1"/><Say language="es-MX" voice="Polly.Mia-Neural">Repito.</Say>${di}</Response>`;
}

/** { a: '+52…', texto } → { bien, id } o { bien:false, error } */
export async function llamar({ a, texto }, env = process.env, hacer = fetch){
  const falta = faltaParaLlamar(env);
  if(falta.length) return { bien: false, error: `Para llamarte falta poner en Render: ${falta.join(', ')}.` };
  const to = aTelefono(a);
  if(!to) return { bien: false, error: 'No tengo a qué número llamarte.' };
  const cuerpo = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Twiml: twimlDe(texto) });
  try{
    const r = await hacer(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}/Calls.json`, {
      method: 'POST',
      headers: { authorization: 'Basic ' + Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64'), 'content-type': 'application/x-www-form-urlencoded' },
      body: cuerpo.toString(), signal: AbortSignal.timeout(30_000),
    });
    const j = await r.json().catch(() => ({}));
    if(r.status === 401) return { bien: false, error: 'Twilio rechazó la cuenta (401): revisa TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN.' };
    if(!r.ok) return { bien: false, error: `Twilio no hizo la llamada (${r.status}): ${String(j.message || '').slice(0, 160)}` };
    return { bien: true, id: j.sid || '' };
  }catch(e){ return { bien: false, error: 'No pude llamar: ' + (e && e.message || e) }; }
}
