/**
 * WEB PUSH · avisar con la sala CERRADA
 * ─────────────────────────────────────────────────────────────────────────────
 * Lo que ya había avisaba con la app abierta —aunque estuviera en otra pestaña—
 * y eso cubre el caso de todos los días. Lo que faltaba es el caso de Carlos:
 * el teléfono en el bolsillo y la sala cerrada. Eso es Web Push y necesita tres
 * cosas: un service worker, un par de llaves VAPID, y que el servidor firme y
 * mande cada aviso. Esto es la tercera.
 *
 * ── POR QUÉ LAS LLAVES SE GENERAN SOLAS Y NO LAS PONE NADIE ─────────────────
 * El camino de manual es que una persona genere el par y pegue la privada como
 * secreto del worker. Aquí eso no sirve: Carlos dijo, con todas sus letras, que
 * esta vez no nos resuelve nada — y una función que depende de que alguien
 * pegue un secreto es una función apagada.
 *
 * Así que la sala se genera su propio par la primera vez y se guarda la privada
 * en su almacenamiento. Nadie tiene que pegar nada, la privada NUNCA sale del
 * worker, y no hay ningún secreto que se pueda colar a un repo público.
 *
 * ── POR QUÉ EL AVISO VA SIN CONTENIDO ───────────────────────────────────────
 * Mandar el texto del mensaje dentro del push obliga a cifrarlo (RFC 8291:
 * ECDH + HKDF + AES-GCM contra las llaves del navegador). Se puede, pero es
 * bastante código criptográfico que desde aquí NO puedo probar de punta a punta
 * contra un teléfono de verdad, y media implementación que a veces avisa es
 * peor que ninguna: uno deja de mirar el chat confiando en algo que no llega.
 *
 * Un aviso sin contenido —«escribieron en GRUPAZ», y al tocarlo se abre— sí se
 * puede sostener entero, y resuelve lo que hacía falta: enterarse. El texto se
 * lee al abrir, que es lo que uno hace de todos modos.
 *
 * Sin dependencias. Corre igual en Workers y en Node porque sólo usa
 * `crypto.subtle`, `fetch` y `btoa`.
 */

/* El contacto que pide VAPID: es a quién le reclama el servicio de push si algo
   va mal. Va el correo público de la empresa, que para eso está publicado. */
export const CONTACTO = 'mailto:grupomazi.oficial@gmail.com';

/** Doce horas. El máximo que admite la especificación son 24; la mitad deja
    margen si el reloj del servidor de push va adelantado respecto al nuestro. */
const VIDA_JWT = 12 * 60 * 60;

export function b64url(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const b64urlTexto = (t) => b64url(new TextEncoder().encode(t));

/**
 * Un par de llaves nuevo. La pública se le da al navegador para que se
 * suscriba; la privada se guarda y no sale de aquí.
 */
export async function generarVapid() {
  const par = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  /* 'raw' de una pública P-256 son 65 bytes: 0x04 y luego X e Y. Es
     exactamente el formato que espera `applicationServerKey` en el navegador. */
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const privada = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publica: b64url(publica), privada };
}

/** El JWT que prueba que el aviso lo manda quien dice. */
export async function firmarJwt(privadaJwk, reclamos) {
  const clave = await crypto.subtle.importKey(
    'jwk', { ...privadaJwk, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const cabecera = b64urlTexto(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const cuerpo = b64urlTexto(JSON.stringify(reclamos));
  const datos = new TextEncoder().encode(`${cabecera}.${cuerpo}`);

  /* ⚠ `crypto.subtle.sign` con ECDSA devuelve la firma CRUDA —r y s pegados,
     64 bytes— y no en DER. Es justo lo que pide un JWT; si algún día alguien la
     «arregla» envolviéndola en DER, los servicios de push la rechazan con un
     403 que no explica nada. */
  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, clave, datos);

  return `${cabecera}.${cuerpo}.${b64url(new Uint8Array(firma))}`;
}

/**
 * Manda UN aviso a UNA suscripción.
 *
 * Devuelve `{ ok, estado, muerta }`. `muerta` es lo importante: un 404 o un 410
 * significan que esa suscripción ya no existe —el navegador la tiró, o
 * desinstalaron— y hay que quitarla, porque si no se reintenta para siempre
 * contra algo que nunca va a contestar.
 */
export async function empujar(suscripcion, vapid, opciones = {}) {
  const traer = opciones.fetch || fetch;
  const url = new URL(suscripcion.endpoint);

  const jwt = await firmarJwt(vapid.privada, {
    aud: url.origin,
    exp: Math.floor(Date.now() / 1000) + VIDA_JWT,
    sub: opciones.contacto || CONTACTO,
  });

  const r = await traer(suscripcion.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publica}`,
      /* Cuánto lo guarda el servicio de push si el teléfono está apagado. Cinco
         minutos: un aviso de chat que llega media hora tarde molesta más de lo
         que sirve. */
      TTL: String(opciones.ttl ?? 300),
      'Content-Length': '0',
    },
  });

  return { ok: r.ok, estado: r.status, muerta: r.status === 404 || r.status === 410 };
}

/**
 * Manda a muchos y dice cuáles quedaron muertas, para que quien llame las
 * borre. No revienta si una falla: el aviso de uno no puede tumbar el de todos.
 */
export async function empujarATodos(suscripciones, vapid, opciones = {}) {
  const muertas = [];
  let enviados = 0;
  await Promise.all(suscripciones.map(async (s) => {
    try {
      const r = await empujar(s, vapid, opciones);
      if (r.muerta) muertas.push(s.endpoint);
      else if (r.ok) enviados++;
    } catch (e) {
      /* Un fallo de red no es una suscripción muerta: se reintenta al siguiente
         mensaje. Confundirlos borraría a alguien por un mal minuto de wifi. */
    }
  }));
  return { enviados, muertas };
}
