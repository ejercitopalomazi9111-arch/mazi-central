#!/usr/bin/env node
/**
 * PRUEBAS DE WEB PUSH
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ LO QUE ESTAS PRUEBAS SÍ DEMUESTRAN Y LO QUE NO. Dicho aquí arriba porque la
 * diferencia importa más que los ✓:
 *
 *   SÍ · que el par de llaves sale del formato que el navegador acepta.
 *   SÍ · que el JWT está bien armado y que su firma VERIFICA contra la llave
 *        pública — no que «no truena», sino que un tercero la daría por buena.
 *   SÍ · que las cabeceras que se mandan son las que pide la especificación.
 *   SÍ · que un 410 se entiende como suscripción muerta y un fallo de red no.
 *
 *   SÍ · que el CONTENIDO CIFRADO se puede volver a leer: la prueba hace de
 *        navegador —genera su pareja de llaves, descifra— y comprueba que sale
 *        el mismo texto con acentos y emoji. Y que con llaves ajenas no sale.
 *
 *   NO · que un aviso llegue a un teléfono de verdad. Eso necesita un servicio
 *        de push real y un permiso concedido en un dispositivo, y no se puede
 *        fingir desde aquí.
 *
 *        Ese tramo YA LO CERRÓ CARLOS el 2 de septiembre: tocó el botón en su
 *        iPhone y escribió «avisos encendidos también con la sala cerrada».
 *        Lo que sigue sin estar probado desde aquí es que el TEXTO se vea bien
 *        en su pantalla — eso lo cierra él otra vez, mirando la notificación.
 *
 * Es la misma disciplina de estos días: separar lo medido de lo supuesto.
 *
 *   node sala/servidor/pruebas-push.mjs
 */
import { generarVapid, firmarJwt, empujar, empujarATodos, b64url,
         cifrar, puedeLlevarTexto } from './push.mjs';

let bien = 0, mal = 0;
const ok = (q, cond) => { console.log((cond ? '  ✓ ' : '  ✗ ') + q); cond ? bien++ : mal++; };

const deB64url = (s) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - t.length % 4) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

console.log('\n· Las llaves salen solas y con el formato que el navegador acepta');
const vapid = await generarVapid();
{
  const cruda = deB64url(vapid.publica);
  /* Si esto no es exactamente 65 bytes empezando en 0x04, el navegador rechaza
     la suscripción con un error que no dice por qué. */
  ok('la pública son 65 bytes', cruda.length === 65);
  ok('y empieza con 0x04 (punto sin comprimir)', cruda[0] === 0x04);
  ok('la privada es una JWK de P-256', vapid.privada.crv === 'P-256' && !!vapid.privada.d);
  ok('la base64 es URL-safe: sin +, / ni =', !/[+/=]/.test(vapid.publica));

  const otro = await generarVapid();
  ok('dos llamadas dan llaves distintas', otro.publica !== vapid.publica);
}

console.log('\n· El JWT lo daría por bueno un tercero');
{
  const jwt = await firmarJwt(vapid.privada, {
    aud: 'https://fcm.googleapis.com', exp: 9999999999, sub: 'mailto:x@y.z',
  });
  const [cab, cue, fir] = jwt.split('.');
  ok('tiene las tres partes', !!cab && !!cue && !!fir);

  const cabecera = JSON.parse(new TextDecoder().decode(deB64url(cab)));
  ok('el algoritmo declarado es ES256', cabecera.alg === 'ES256');

  const cuerpo = JSON.parse(new TextDecoder().decode(deB64url(cue)));
  ok('lleva aud, exp y sub', !!cuerpo.aud && !!cuerpo.exp && !!cuerpo.sub);

  ok('la firma son 64 bytes crudos (r y s), no DER', deB64url(fir).length === 64);

  /* ⚠ LA PRUEBA QUE DE VERDAD VALE. Las de arriba dicen que el JWT tiene la
     forma correcta; ésta dice que la FIRMA es válida — que es lo que va a
     comprobar el servicio de push antes de aceptar el aviso. Se verifica con la
     pública, importándola por separado, o sea exactamente como lo haría él. */
  const publica = await crypto.subtle.importKey(
    'raw', deB64url(vapid.publica),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const valida = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' }, publica, deB64url(fir),
    new TextEncoder().encode(`${cab}.${cue}`));
  ok('LA FIRMA VERIFICA contra la llave pública', valida);

  /* Y que no verifique cualquier cosa: si esto pasara, la de arriba no probaría
     nada. */
  const otra = await generarVapid();
  const publicaAjena = await crypto.subtle.importKey(
    'raw', deB64url(otra.publica),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const conAjena = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' }, publicaAjena, deB64url(fir),
    new TextEncoder().encode(`${cab}.${cue}`));
  ok('y NO verifica con una llave ajena', !conAjena);
}

console.log('\n· Lo que se manda por el cable');
{
  let visto = null;
  const traer = async (url, opciones) => { visto = { url, ...opciones }; return { ok: true, status: 201 }; };
  const r = await empujar({ endpoint: 'https://fcm.googleapis.com/fcm/send/ABC' },
                          vapid, { fetch: traer });

  ok('sale como POST', visto.method === 'POST');
  ok('la autorización es del esquema vapid con t= y k=',
     /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/.test(visto.headers.Authorization));
  ok('la k= es la misma llave pública',
     visto.headers.Authorization.endsWith(`k=${vapid.publica}`));
  ok('lleva TTL', !!visto.headers.TTL);
  ok('va sin cuerpo: el aviso no carga texto', visto.headers['Content-Length'] === '0');
  ok('un 201 se toma como enviado', r.ok && !r.muerta);

  /* El `aud` tiene que ser el ORIGEN del endpoint, no el endpoint entero. Con
     el endpoint completo, el servicio contesta 403 sin explicar. */
  const cuerpo = JSON.parse(new TextDecoder().decode(
    deB64url(visto.headers.Authorization.split('t=')[1].split(',')[0].split('.')[1])));
  ok('el aud es el ORIGEN del endpoint, no la ruta completa',
     cuerpo.aud === 'https://fcm.googleapis.com');
}

console.log('\n· Muerta, viva, y la que sólo tuvo mal wifi');
{
  const conEstado = (estado) => async () => ({ ok: estado < 300, status: estado });

  for (const e of [404, 410]) {
    const r = await empujar({ endpoint: 'https://p.test/x' }, vapid, { fetch: conEstado(e) });
    ok(`un ${e} marca la suscripción como muerta`, r.muerta);
  }
  const r5 = await empujar({ endpoint: 'https://p.test/x' }, vapid, { fetch: conEstado(500) });
  ok('un 500 NO la mata: es del servidor, no de la suscripción', !r5.muerta);

  /* Ésta es la que importa de verdad: borrar a alguien por un mal minuto de
     wifi es perder un aviso para siempre sin que nadie se entere. */
  const rota = async () => { throw new Error('sin red'); };
  const t = await empujarATodos([{ endpoint: 'https://p.test/a' }], vapid, { fetch: rota });
  ok('un fallo de red no mata ninguna suscripción', t.muertas.length === 0);
  ok('y no revienta: devuelve su cuenta', t.enviados === 0);
}

console.log('\n· El contenido cifrado · se comprueba DESCIFRÁNDOLO');
{
  /* ⚠ AQUÍ NO SIRVE «no revienta». Si el cifrado se escribe mal, el aviso LLEGA
     y el teléfono lo descarta en silencio: no hay error que ver por ningún
     lado. La única prueba que vale es hacer de navegador —generar una pareja
     de llaves como la suya, cifrar contra ella, y volver a sacar el texto—. */
  const suyas = await crypto.subtle.generateKey(
    { name:'ECDH', namedCurve:'P-256' }, true, ['deriveBits']);
  const suPub = new Uint8Array(await crypto.subtle.exportKey('raw', suyas.publicKey));
  const auth  = crypto.getRandomValues(new Uint8Array(16));

  const sus = { endpoint:'https://p.test/x',
                keys: { p256dh: b64url(suPub), auth: b64url(auth) } };

  const MENSAJE = 'Carlos: ñoño, acentos y emoji 🐦 — ¿llega entero?';
  const cuerpo = await cifrar(MENSAJE, sus);

  /* La cabecera del cuerpo, campo por campo. */
  ok('empieza con 16 bytes de sal', cuerpo.length > 21);
  const rs = new DataView(cuerpo.buffer, cuerpo.byteOffset + 16, 4).getUint32(0);
  ok('declara el tamaño de registro', rs === 4096);
  ok('dice que la llave mide 65 bytes', cuerpo[20] === 65);
  ok('y ahí va una pública sin comprimir', cuerpo[21] === 0x04);

  /* Y ahora se hace de navegador y se descifra. */
  const sal   = cuerpo.slice(0, 16);
  const asPub = cuerpo.slice(21, 86);
  const cifrado = cuerpo.slice(86);

  const nuestra = await crypto.subtle.importKey(
    'raw', asPub, { name:'ECDH', namedCurve:'P-256' }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits(
    { name:'ECDH', public: nuestra }, suyas.privateKey, 256));

  const te = (t) => new TextEncoder().encode(t);
  const pegar = (...ts) => { const r = new Uint8Array(ts.reduce((n,t)=>n+t.length,0));
    let i=0; for(const t of ts){ r.set(t,i); i+=t.length; } return r; };
  const hkdf = async (salt, ikm, info, largo) => {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits(
      { name:'HKDF', hash:'SHA-256', salt, info }, k, largo*8));
  };

  const ikm = await hkdf(auth, compartido, pegar(te('WebPush: info\0'), suPub, asPub), 32);
  const llave = await hkdf(sal, ikm, te('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, te('Content-Encoding: nonce\0'), 12);

  const aes = await crypto.subtle.importKey('raw', llave, 'AES-GCM', false, ['decrypt']);
  const claro = new Uint8Array(await crypto.subtle.decrypt(
    { name:'AES-GCM', iv: nonce, tagLength:128 }, aes, cifrado));

  ok('el último byte es el delimitador 0x02', claro[claro.length-1] === 2);
  const salido = new TextDecoder().decode(claro.slice(0, -1));

  /* ⚠ LA PRUEBA QUE SOSTIENE A TODAS. Y con acentos y emoji a propósito: es
     donde falla si alguien cuenta bytes como si fueran letras. */
  ok('SALE EXACTAMENTE EL MISMO TEXTO, con acentos y emoji', salido === MENSAJE,
     `salió: ${JSON.stringify(salido)}`);

  /* Y que no lo pueda leer cualquiera: con otras llaves tiene que fallar. */
  const ajenas = await crypto.subtle.generateKey(
    { name:'ECDH', namedCurve:'P-256' }, true, ['deriveBits']);
  let tronó = false;
  try {
    const c2 = new Uint8Array(await crypto.subtle.deriveBits(
      { name:'ECDH', public: nuestra }, ajenas.privateKey, 256));
    const i2 = await hkdf(auth, c2, pegar(te('WebPush: info\0'), suPub, asPub), 32);
    const l2 = await hkdf(sal, i2, te('Content-Encoding: aes128gcm\0'), 16);
    const n2 = await hkdf(sal, i2, te('Content-Encoding: nonce\0'), 12);
    const a2 = await crypto.subtle.importKey('raw', l2, 'AES-GCM', false, ['decrypt']);
    await crypto.subtle.decrypt({ name:'AES-GCM', iv:n2, tagLength:128 }, a2, cifrado);
  } catch { tronó = true; }
  ok('con unas llaves ajenas NO se puede leer', tronó);

  /* Dos avisos iguales no pueden salir idénticos: la sal y la pareja efímera
     son nuevas cada vez. Si salieran iguales, quien mire el cable sabría que
     es el mismo mensaje. */
  const otro = await cifrar(MENSAJE, sus);
  ok('dos avisos del MISMO texto salen distintos',
     b64url(cuerpo) !== b64url(otro));
}

console.log('\n· Y la suscripción vieja no se rompe: degrada');
{
  ok('una suscripción sin llaves no puede llevar texto',
     !puedeLlevarTexto({ endpoint:'https://p.test/x' }));
  ok('una con las dos llaves sí',
     puedeLlevarTexto({ endpoint:'https://p.test/x', keys:{ p256dh:'a', auth:'b' } }));

  let visto = null;
  const traer = async (url, o) => { visto = o; return { ok:true, status:201 }; };
  const r = await empujar({ endpoint:'https://p.test/x' }, vapid,
                          { fetch: traer, mensaje: 'hola' });
  ok('se manda igual, pero sin cuerpo', r.ok && !r.conTexto);
  ok('y sin declarar codificación de contenido', !visto.headers['Content-Encoding']);
  ok('con Content-Length en cero', visto.headers['Content-Length'] === '0');
}

console.log('\n· A muchos a la vez');
{
  const traer = async (url) => ({ ok: !url.includes('mala'), status: url.includes('mala') ? 410 : 201 });
  const r = await empujarATodos([
    { endpoint: 'https://p.test/buena1' },
    { endpoint: 'https://p.test/mala' },
    { endpoint: 'https://p.test/buena2' },
  ], vapid, { fetch: traer });
  ok('se envía a las buenas', r.enviados === 2);
  ok('y se señalan las muertas para borrarlas', r.muertas.length === 1 && /mala/.test(r.muertas[0]));
  /* Una que falla no puede impedir las otras: si se mandaran en serie con un
     `await` suelto, la primera muerta se llevaría al resto. */
  ok('la muerta no impidió las buenas', r.enviados === 2);
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan`);
console.log('\n⚠ Ninguna de éstas prueba que un aviso LLEGUE a un teléfono.');
console.log('  Ese tramo lo cierra Carlos tocando una vez «encender avisos».');
process.exit(mal ? 1 : 0);
