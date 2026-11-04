#!/usr/bin/env node
/* SECRE · el adaptador de Instagram y Messenger, sin Meta de verdad.  node secre/pruebas-meta.mjs */
import crypto from 'crypto';
import { leerAviso, verificar, firmaValida, enviarMeta, esMeta } from './meta.mjs';
let pasan = 0, fallan = 0; const ok = (q, si) => { si ? pasan++ : fallan++; console.log(si ? '  ✓' : '  ✗', q); };
const ig = { object: 'instagram', entry: [{ messaging: [{ sender: { id: '111' }, recipient: { id: '999' }, timestamp: 5, message: { mid: 'x1', text: '¿cuánto la sudadera?' } }, { sender: { id: '999' }, recipient: { id: '111' }, message: { mid: 'x2', text: 'eco', is_echo: true } }] }] };
const L = leerAviso(ig);
ok('un DM de Instagram entra como chat «ig:<id>»', L[0].chat === 'ig:111' && L[0].texto === '¿cuánto la sudadera?' && !L[0].mio);
ok('el eco (lo que mandó la cuenta) sale como suyo y en el chat del otro', L[1].mio && L[1].chat === 'ig:111');
ok('Messenger entra como «fb:<id>»', leerAviso({ object: 'page', entry: [{ messaging: [{ sender: { id: '7' }, message: { text: 'hola' } }] }] })[0].chat === 'fb:7');
ok('cualquier otra cosa no entra', leerAviso({ object: 'whatsapp_business_account', entry: [] }).length === 0);
const env = { META_VERIFY_TOKEN: 'abc', META_APP_SECRET: 's3', IG_ID: '999', IG_TOKEN: 't', FB_PAGE_TOKEN: 'p' };
ok('verificación con la palabra correcta regresa el reto', verificar(new URLSearchParams('hub.mode=subscribe&hub.verify_token=abc&hub.challenge=42'), env) === '42');
ok('con otra palabra, no', verificar(new URLSearchParams('hub.mode=subscribe&hub.verify_token=no&hub.challenge=1'), env) === null);
const crudo = Buffer.from(JSON.stringify(ig)), f = 'sha256=' + crypto.createHmac('sha256', 's3').update(crudo).digest('hex');
ok('un aviso firmado por Meta se acepta', firmaValida(crudo, f, env));
ok('uno sin firma o con firma falsa, no', !firmaValida(crudo, '', env) && !firmaValida(crudo, 'sha256=00', env) && !firmaValida(crudo, f, {}));
let pedidos = []; const pedir = async (u, o) => { pedidos.push({ u, b: JSON.parse(o.body) }); return { ok: true, json: async () => ({ message_id: 'm' + pedidos.length }) }; };
await enviarMeta('ig:111', 'hola', env, pedir);
ok('contestar en Instagram va a graph.instagram.com/<IG_ID>/messages', /graph\.instagram\.com\/v23\.0\/999\/messages$/.test(pedidos[0].u) && pedidos[0].b.recipient.id === '111');
await enviarMeta('fb:7', 'hola', env, pedir);
ok('en Messenger, a /me/messages como RESPONSE', /graph\.facebook\.com\/v23\.0\/me\/messages$/.test(pedidos[1].u) && pedidos[1].b.messaging_type === 'RESPONSE');
pedidos = []; await enviarMeta('ig:111', 'x'.repeat(2500), env, pedir);
ok('un texto largo se parte en pedazos de menos de 1,000', pedidos.length === 3 && pedidos.every(p => p.b.message.text.length <= 1000));
ok('sin llave lo dice claro', await enviarMeta('ig:1', 'h', {}, pedir).then(() => false, e => /no está conectado/.test(e.message)));
ok('esMeta separa los chats de WhatsApp', esMeta('ig:1') && esMeta('fb:2') && !esMeta('5214421111111@s.whatsapp.net'));
console.log(fallan ? `\n✗ ${fallan} fallaron` : `\n✓ ${pasan}/${pasan}`); process.exit(fallan ? 1 : 0);
