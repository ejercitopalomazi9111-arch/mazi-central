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
 * ── EL AVISO AHORA SÍ LLEVA TEXTO, Y POR QUÉ NO LO LLEVABA ─────────────────
 * La primera versión mandaba el aviso VACÍO —«escribieron en GRUPAZ»— y lo dijo
 * con todas sus letras: meter el texto obliga a CIFRARLO contra las llaves del
 * navegador (RFC 8291: ECDH + HKDF + AES-GCM), y eso no se podía probar de
 * punta a punta desde el contenedor. Media implementación que a veces avisa es
 * peor que ninguna.
 *
 * Lo pidió Carlos en cuanto los avisos empezaron a llegarle: «haz que se vea
 * una vista previa de quien escribió y un poco del texto». Y ahora sí se puede
 * sostener, porque cambió lo que faltaba: él tiene avisos funcionando en un
 * teléfono de verdad, así que si el texto sale roto lo VE y lo dice.
 *
 * ⚠ Y ESO PONE EL MENSAJE EN LA PANTALLA DE BLOQUEO. Es lo que se pidió, pero
 * conviene saberlo: cualquiera que vea el teléfono apagado lee quién escribió y
 * el principio de lo que dijo. Por eso el texto va RECORTADO y sin adjuntos.
 *
 * El cifrado es de verdad de punta a punta: la llave sale de un ECDH entre una
 * pareja efímera nuestra y la pública del navegador. Ni el servicio de push
 * —Google, Apple— puede leer el contenido. Sólo el aparato.
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

/* ── EL CIFRADO DEL CONTENIDO · RFC 8291, codificación `aes128gcm` ──────────
   Cada paso está numerado igual que en la especificación para que se pueda
   comparar renglón por renglón. Si algo de esto se escribe mal, el aviso NO
   truena: llega y el teléfono lo descarta en silencio. Por eso las pruebas
   DESCIFRAN lo que sale, en vez de comprobar que «no revienta». */

const texto = (t) => new TextEncoder().encode(t);

/** HKDF tal cual lo usa la especificación: extraer y expandir en un paso. */
async function hkdf(sal, ikm, info, largo) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sal, info }, k, largo * 8));
}

const pegar = (...trozos) => {
  const total = trozos.reduce((n, t) => n + t.length, 0);
  const r = new Uint8Array(total);
  let i = 0;
  for (const t of trozos) { r.set(t, i); i += t.length; }
  return r;
};

/**
 * Cifra `mensaje` para UNA suscripción y devuelve el cuerpo que se manda.
 *
 * `suscripcion.keys.p256dh` es la pública del navegador (65 bytes en base64url)
 * y `keys.auth` su secreto de autenticación (16 bytes). Sin las dos no hay
 * cifrado posible — y por eso una suscripción vieja, guardada cuando sólo se
 * apuntaba el endpoint, cae sola al aviso sin texto en vez de romperse.
 */
export async function cifrar(mensaje, suscripcion, opciones = {}) {
  const uaPub  = deB64url(suscripcion.keys.p256dh);
  const authSecreto = deB64url(suscripcion.keys.auth);

  /* 1 · una pareja EFÍMERA por cada aviso. Reutilizarla dejaría que quien vea
        dos avisos relacione que son para el mismo aparato. */
  const efimera = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', efimera.publicKey));

  /* 2 · el secreto compartido: nuestra privada efímera contra su pública. */
  const suPublica = await crypto.subtle.importKey(
    'raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: suPublica }, efimera.privateKey, 256));

  /* 3 · el material de partida. ⚠ EL ORDEN DE LAS DOS PÚBLICAS IMPORTA: primero
        la del navegador y después la nuestra. Cambiarlas da una llave distinta
        y el aviso llega y se descarta sin decir nada. */
  const ikm = await hkdf(authSecreto, compartido,
    pegar(texto('WebPush: info\0'), uaPub, asPub), 32);

  /* 4 · la sal, nueva en cada aviso, y de ella salen la llave y el nonce. */
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const llave = await hkdf(sal, ikm, texto('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, texto('Content-Encoding: nonce\0'), 12);

  /* 5 · el registro lleva un 0x02 al final: es el delimitador que marca «aquí
        se acabó y no hay más registros». Sin él, el navegador lo rechaza. */
  const registro = pegar(texto(mensaje), new Uint8Array([2]));

  const aes = await crypto.subtle.importKey('raw', llave, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, aes, registro));

  /* 6 · la cabecera del cuerpo: sal(16) · tamaño de registro(4) · largo de la
        llave(1) · nuestra pública(65) · y luego el cifrado. */
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, opciones.rs ?? 4096);
  return pegar(sal, rs, new Uint8Array([asPub.length]), asPub, cifrado);
}

export const deB64url = (s) => {
  const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - t.length % 4) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** Una suscripción sólo puede llevar texto si trae las dos llaves. */
export const puedeLlevarTexto = (s) =>
  !!(s && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string');

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

  const cabeceras = {
    Authorization: `vapid t=${jwt}, k=${vapid.publica}`,
    /* Cuánto lo guarda el servicio de push si el teléfono está apagado. Cinco
       minutos: un aviso de chat que llega media hora tarde molesta más de lo
       que sirve. */
    TTL: String(opciones.ttl ?? 300),
  };

  /* ⚠ SI LA SUSCRIPCIÓN NO TRAE LLAVES, SE MANDA SIN TEXTO Y YA. Las guardadas
     antes de que esto existiera sólo tienen `endpoint`, y hacerlas tronar
     dejaría mudo justo al que lleva más tiempo apuntado. Degrada al aviso de
     siempre —«escribieron en la sala»— que sigue sirviendo para enterarse. */
  let cuerpo = null;
  if (opciones.mensaje && puedeLlevarTexto(suscripcion)) {
    cuerpo = await cifrar(opciones.mensaje, suscripcion, opciones);
    cabeceras['Content-Encoding'] = 'aes128gcm';
    cabeceras['Content-Type'] = 'application/octet-stream';
    cabeceras['Content-Length'] = String(cuerpo.length);
  } else {
    cabeceras['Content-Length'] = '0';
  }

  const r = await traer(suscripcion.endpoint,
    cuerpo ? { method: 'POST', headers: cabeceras, body: cuerpo }
           : { method: 'POST', headers: cabeceras });

  return { ok: r.ok, estado: r.status, muerta: r.status === 404 || r.status === 410,
           conTexto: !!cuerpo };
}

/**
 * Manda a muchos y dice cuáles quedaron muertas, para que quien llame las
 * borre. No revienta si una falla: el aviso de uno no puede tumbar el de todos.
 */
export async function empujarATodos(suscripciones, vapid, opciones = {}) {
  const muertas = [];
  let enviados = 0, conTexto = 0;
  await Promise.all(suscripciones.map(async (s) => {
    try {
      const r = await empujar(s, vapid, opciones);
      if (r.muerta) muertas.push(s.endpoint);
      else if (r.ok) { enviados++; if (r.conTexto) conTexto++; }
    } catch (e) {
      /* Un fallo de red no es una suscripción muerta: se reintenta al siguiente
         mensaje. Confundirlos borraría a alguien por un mal minuto de wifi. */
    }
  }));
  /* `conTexto` no es adorno: es cómo se sabe cuántos de los que reciben avisos
     siguen con una suscripción vieja sin llaves. Si nunca sube, es que nadie ha
     vuelto a apuntarse desde que existe el cifrado. */
  return { enviados, muertas, conTexto };
}
