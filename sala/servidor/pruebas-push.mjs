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
 *   NO · que un aviso llegue a un teléfono de verdad. Eso necesita un servicio
 *        de push real y un permiso concedido en un dispositivo, y no se puede
 *        fingir desde aquí. Ese último tramo lo cierra Carlos tocando una vez
 *        el botón en su teléfono, y hasta que lo haga NO voy a decir que las
 *        notificaciones con la app cerrada funcionan.
 *
 * Es la misma disciplina de estos días: separar lo medido de lo supuesto.
 *
 *   node sala/servidor/pruebas-push.mjs
 */
import { generarVapid, firmarJwt, empujar, empujarATodos, b64url } from './push.mjs';

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
