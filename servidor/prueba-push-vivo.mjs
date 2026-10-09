#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   Las notificaciones del teléfono, de punta a punta, contra el servidor local
   y un servicio de notificaciones DE MENTIRA en esta máquina: recibe lo que
   el servidor manda, lo descifra como lo haría el teléfono y revisa la firma.

       npx wrangler dev --port 8791 --local --var PUSH_PRUEBA:http://127.0.0.1:8799
       node prueba-push-vivo.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import http from 'http'; import crypto from 'crypto';
import { b64u, deB64u } from './src/push.js';
const API = process.env.API || 'http://127.0.0.1:8791', PUERTO = 8799, CASA = 'push-' + Date.now();
let bien = 0, mal = 0;
const ok = (q, c, extra) => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (extra ? ' · ' + extra : '')); } };
const sub = crypto.webcrypto.subtle, te = s => new TextEncoder().encode(s);
const junta = (...p) => { const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0)); let i = 0; for(const x of p){ o.set(x, i); i += x.length; } return o; };
const hmac = async (k, d) => new Uint8Array(await sub.sign('HMAC', await sub.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), d));

/* un «teléfono»: su par de llaves y su secreto, como los da el navegador */
async function telefono(nombre){
  const par = await sub.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await sub.exportKey('raw', par.publicKey)), auth = crypto.randomBytes(16);
  return { nombre, par, pub, auth, suscripcion: { endpoint: `http://127.0.0.1:${PUERTO}/${nombre}`, keys: { p256dh: b64u(pub), auth: b64u(auth) } } };
}
async function descifrar(t, cuerpo){
  const salt = cuerpo.slice(0, 16), idlen = cuerpo[20], asPub = cuerpo.slice(21, 21 + idlen), ct = cuerpo.slice(21 + idlen);
  const asLlave = await sub.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await sub.deriveBits({ name: 'ECDH', public: asLlave }, t.par.privateKey, 256));
  const ikm = await hmac(await hmac(t.auth, ecdh), junta(te('WebPush: info\0'), t.pub, asPub, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, junta(te('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, junta(te('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const claro = new Uint8Array(await sub.decrypt({ name: 'AES-GCM', iv: nonce }, await sub.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct));
  return JSON.parse(new TextDecoder().decode(claro.slice(0, claro.lastIndexOf(2))));
}

const llegaron = [];
const servicio = http.createServer((q, r) => { const p = []; q.on('data', c => p.push(c)); q.on('end', () => { llegaron.push({ ruta: q.url, h: q.headers, cuerpo: new Uint8Array(Buffer.concat(p)) }); r.writeHead(201); r.end(); }); });
await new Promise(si => servicio.listen(PUERTO, '127.0.0.1', si));
const esperar = async (fn, ms = 6000) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ const x = fn(); if(x) return x; await new Promise(s => setTimeout(s, 100)); } return null; };

const api = async (ruta, cuerpo, h) => { const r = await fetch(`${API}${ruta}?casa=${CASA}`, { method: cuerpo ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...h }, body: cuerpo ? JSON.stringify(cuerpo) : undefined }); return { status: r.status, j: await r.json().catch(() => null) }; };
const AP_M = crypto.randomBytes(16).toString('hex'), AP_A = crypto.randomBytes(16).toString('hex');
const llave = (await api('/api/entrar', { pasador: '1234' }, { 'x-fadori-aparato': AP_M })).j.token;
const M = { 'x-fadori-aparato': AP_M, 'x-fadori-admin': llave }, A = { 'x-fadori-aparato': AP_A };
await api('/api/sync', { desde: 0, cambios: { productos: [{ id: 'pb-torta', nombre: 'Torta', precio: 3500, disponible: true, t: 1 }] } }, M);

const clave = (await api('/api/push/clave')).j?.clave;
ok('el servidor da su llave pública de notificaciones', deB64u(clave || '').length === 65);
const tm = await telefono('mostrador'), ta = await telefono('alumno');
ok('la tablet se apunta para recibir avisos', (await api('/api/push/alta', { sub: tm.suscripcion }, M)).status === 200);
ok('y el alumno', (await api('/api/push/alta', { sub: ta.suscripcion }, A)).status === 200);
ok('una dirección que no es de un servicio de notificaciones se rechaza', (await api('/api/push/alta', { sub: { ...ta.suscripcion, endpoint: 'https://ratero.example/x' } }, A)).status === 400);

await api('/api/sync', { desde: 0, cambios: { alumnos: [{ id: 'PUSH', codigo: 'PUSH', nombre: 'Pao L', grupo: '3B', t: 1 }],
  pedidos: [{ id: 'opush1', alumno: 'PUSH', renglones: [{ prod: 'pb-torta', cant: 1 }], estado: 'en_cola', t: Date.now() }] } }, A);
const alM = await esperar(() => llegaron.find(x => x.ruta === '/mostrador'));
ok('pedido nuevo: le llega un aviso a la tablet', !!alM);
if(alM){
  const m = await descifrar(tm, alM.cuerpo);
  ok(`y se abre con la llave de la tablet: «${m.titulo} · ${m.cuerpo}»`, /Nuevo pedido/.test(m.titulo) && /Pao L/.test(m.cuerpo));
  const v = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(alM.h.authorization || '');
  const pk = v && await sub.importKey('raw', deB64u(v[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  ok('con la firma de Fadori (VAPID) verificada', !!v && v[4] === clave && await sub.verify({ name: 'ECDSA', hash: 'SHA-256' }, pk, deB64u(v[3]), te(v[1] + '.' + v[2])));
  ok('cifrado aes128gcm y con urgencia alta', alM.h['content-encoding'] === 'aes128gcm' && alM.h.urgency === 'high');
}
ok('el alumno NO recibe aviso por su propio pedido', !llegaron.some(x => x.ruta === '/alumno'));

const t = Date.now() + 5;
await api('/api/sync', { desde: 0, cambios: { pedidos: [{ id: 'opush1', alumno: 'PUSH', nombre: 'Pao L', renglones: [{ prod: 'pb-torta', cant: 1, listo: true }], total: 3500, estado: 'listo', turno: 1, t }] } }, M);
const alA = await esperar(() => llegaron.find(x => x.ruta === '/alumno'));
ok('pedido listo: le llega el aviso al teléfono del alumno', !!alA);
if(alA){ const m = await descifrar(ta, alA.cuerpo); ok(`«${m.titulo} · ${m.cuerpo}»`, /ya está/.test(m.titulo) && /Turno 1/.test(m.cuerpo)); }

const antes = llegaron.length;
await api('/api/sync', { desde: 0, cambios: { pedidos: [{ id: 'opush1', alumno: 'PUSH', nombre: 'Pao L', renglones: [{ prod: 'pb-torta', cant: 1, listo: true }], total: 3500, estado: 'listo', turno: 1, nota: 'x', t: t + 5 }] } }, M);
await new Promise(s => setTimeout(s, 1200));
ok('otro cambio estando ya listo NO vuelve a sonar', llegaron.length === antes);

servicio.close();
console.log(`${mal ? '✗' : '✓'} push de punta a punta · ${bien}/${bien + mal}`);
process.exit(mal ? 1 : 0);
