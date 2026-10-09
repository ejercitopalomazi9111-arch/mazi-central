#!/usr/bin/env node
/* Las notificaciones del teléfono (src/push.js) contra el ejemplo del RFC 8291
   (apéndice A), byte por byte, y la firma VAPID verificada con su llave
   pública. Sin red: corre con `node prueba-push.mjs`. */
import { cifrar, b64u, deB64u, nuevasLlavesVapid, firmaVapid, suscripcionValida } from './src/push.js';
let bien = 0, mal = 0;
const ok = (q, c, extra) => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (extra ? ' · ' + extra : '')); } };

/* RFC 8291 · Appendix A */
const V = {
  texto: 'When I grow up, I want to be a watermelon',
  uaPub: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  asPub: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPriv: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  esperado: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};
const pub = deB64u(V.asPub);
const jwk = { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: V.asPriv, ext: true };
const as = {
  privateKey: await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']),
  publicKey: await crypto.subtle.importKey('raw', pub, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
};
const sale = await cifrar({ keys: { p256dh: V.uaPub, auth: V.auth } }, V.texto, { salt: deB64u(V.salt), as });
ok('el cifrado coincide con el ejemplo del RFC 8291, byte por byte', b64u(sale) === V.esperado, b64u(sale).slice(0, 60) + '…');

const vapid = await nuevasLlavesVapid();
ok('el par de llaves VAPID: pública de 65 bytes que empieza en 0x04', deB64u(vapid.publica).length === 65 && deB64u(vapid.publica)[0] === 4);
const auth = await firmaVapid(vapid, 'https://fcm.googleapis.com/fcm/send/abc', 'mailto:grupomazi.oficial@gmail.com');
const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(auth);
ok('la cabecera VAPID tiene la forma del estándar', !!m);
const carga = JSON.parse(new TextDecoder().decode(deB64u(m[2])));
ok('dirigida al servicio correcto y con vencimiento', carga.aud === 'https://fcm.googleapis.com' && carga.exp > Date.now() / 1000);
const llave = await crypto.subtle.importKey('raw', deB64u(m[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
ok('y la firma se verifica con la llave pública', await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, llave, deB64u(m[3]), new TextEncoder().encode(m[1] + '.' + m[2])));

const buena = { endpoint: 'https://web.push.apple.com/QGuQyavXutnMH', keys: { p256dh: V.uaPub, auth: V.auth } };
ok('acepta una suscripción de Apple', suscripcionValida(buena));
ok('rechaza una dirección que no es de un servicio de notificaciones', !suscripcionValida({ ...buena, endpoint: 'https://ratero.example/x' }));
ok('ni una que sólo se parece', !suscripcionValida({ ...buena, endpoint: 'https://push.apple.com.ratero.example/x' }));
ok('ni llaves del tamaño equivocado', !suscripcionValida({ ...buena, keys: { p256dh: 'AAAA', auth: V.auth } }));

console.log(`${mal ? '✗' : '✓'} push · ${bien}/${bien + mal}`);
process.exit(mal ? 1 : 0);
