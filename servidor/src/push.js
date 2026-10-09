/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LAS NOTIFICACIONES DEL TELÉFONO (Web Push), hechas aquí
   ──────────────────────────────────────────────────────────────────────────
   Lo que hace que al alumno le suene el teléfono con «tu pedido ya está»
   aunque tenga la app cerrada. Sin servicio externo de notificaciones: el
   servidor habla directo con el de Apple, Google o Mozilla, que es lo único
   que no se puede construir (el teléfono sólo escucha al de su marca).

   Dos piezas del estándar, con WebCrypto y nada más:
   · VAPID (RFC 8292): una firma que dice «esto lo manda Fadori». El par de
     llaves lo genera el propio servidor la primera vez y lo guarda él: no
     hay llave en el repo ni en el panel.
   · aes128gcm (RFC 8291 + 8188): el mensaje va cifrado para ESE teléfono;
     Apple o Google lo llevan sin poder leerlo.

   prueba-push.mjs lo comprueba contra el ejemplo del propio RFC 8291, byte
   por byte.
   ═════════════════════════════════════════════════════════════════════════ */
const te = (s) => new TextEncoder().encode(s);

export function b64u(bytes){
  let s = '';
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for(let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function deB64u(txt){
  const s = String(txt || '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function junta(...partes){
  const n = partes.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n);
  let i = 0; for(const p of partes){ out.set(p, i); i += p.length; }
  return out;
}
async function hmac(llave, datos){
  const k = await crypto.subtle.importKey('raw', llave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, datos));
}

/* ── el par de llaves de Fadori (VAPID) ───────────────────────────────── */
export async function nuevasLlavesVapid(){
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privada = await crypto.subtle.exportKey('jwk', par.privateKey);
  const publica = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey)));
  return { privada, publica };
}
export async function firmaVapid(vapid, endpoint, contacto, ahora = Date.now()){
  const aud = new URL(endpoint).origin;
  const parte = (o) => b64u(te(JSON.stringify(o)));
  const sinFirma = parte({ typ: 'JWT', alg: 'ES256' }) + '.' +
    parte({ aud, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: contacto });
  const k = await crypto.subtle.importKey('jwk', vapid.privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const firma = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, te(sinFirma)));
  return 'vapid t=' + sinFirma + '.' + b64u(firma) + ', k=' + vapid.publica;
}

/* ── el mensaje cifrado para un teléfono (aes128gcm) ──────────────────── */
export async function cifrar(suscripcion, texto, fijo){
  const uaPub = deB64u(suscripcion.keys.p256dh), auth = deB64u(suscripcion.keys.auth);
  const salt = (fijo && fijo.salt) || crypto.getRandomValues(new Uint8Array(16));
  const as = (fijo && fijo.as) || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaLlave = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaLlave }, as.privateKey, 256));
  const prkLlave = await hmac(auth, ecdh);
  const ikm = await hmac(prkLlave, junta(te('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, junta(te('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, junta(te('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, junta(te(texto), new Uint8Array([2]))));
  return junta(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPub.length]), asPub, cifrado);
}

/* Sólo se le habla a los servicios de notificaciones de verdad: una dirección
   inventada no convierte al servidor en un cartero para pegarle a cualquiera. */
const SERVICIOS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
/* `prueba` sólo existe en `wrangler dev` (variable PUSH_PRUEBA): un servicio
   de notificaciones de mentira en esta máquina, para poder abrir y revisar lo
   que el servidor manda. En producción esa variable no está. */
export function suscripcionValida(s, prueba){
  try{
    if(!s || typeof s !== 'object' || !s.keys) return false;
    const u = new URL(String(s.endpoint || ''));
    if(prueba && u.origin === prueba) return deB64u(s.keys.p256dh).length === 65 && deB64u(s.keys.auth).length === 16;
    if(u.protocol !== 'https:' || String(s.endpoint).length > 800) return false;
    if(!SERVICIOS.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) return false;
    return deB64u(s.keys.p256dh).length === 65 && deB64u(s.keys.auth).length === 16;
  }catch(e){ return false; }
}

/* manda un aviso; devuelve el estado HTTP (404/410 = esa suscripción ya no existe) */
export async function mandar(vapid, suscripcion, aviso, contacto){
  const cuerpo = await cifrar(suscripcion, JSON.stringify(aviso));
  const r = await fetch(suscripcion.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await firmaVapid(vapid, suscripcion.endpoint, contacto),
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
      TTL: '900', Urgency: 'high', Topic: String(aviso.tag || 'fadori').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || 'fadori',
    },
    body: cuerpo,
  });
  return r.status;
}
