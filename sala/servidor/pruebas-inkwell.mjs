/* El recadero de INKWELL: que traiga lo de Webtoon con su Referer, y nada más.
     node sala/servidor/pruebas-inkwell.mjs                                     */
import { traer, HOSTS } from './inkwell.js';
import trabajador from './index.js';
let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
const pide = (u) => new URL('https://sala.x/api/sala/inkwell/traer?url=' + encodeURIComponent(u));
let visto = null;
const falso = (tipo = 'image/jpeg', status = 200) => async (u, op) => { visto = { u, op }; return new Response('datos', { status, headers: { 'content-type': tipo } }); };

let r = await traer(pide('https://webtoon-phinf.pstatic.net/a/b.jpg'), falso());
ok(r.status === 200 && await r.text() === 'datos', 'trae una imagen de pstatic');
ok(visto.op.headers.Referer === 'https://www.webtoons.com/', 'y la pide diciendo que viene de webtoons.com (sin eso da 403)');
ok(/immutable/.test(r.headers.get('Cache-Control')), 'las imágenes se pueden guardar en caché');
r = await traer(pide('https://m.webtoons.com/api/v1/webtoon/95/episodes?pageSize=99999'), falso('application/json; charset=utf-8'));
ok(r.status === 200 && /iPhone/.test(visto.op.headers['User-Agent']), 'la lista de capítulos la pide como teléfono');
ok(r.headers.get('Cache-Control') === 'no-store', 'y no la guarda: cambia cuando sale capítulo nuevo');
r = await traer(pide('https://evil.example.com/x'), falso());
ok(r.status === 403, 'no trae nada de otro sitio');
r = await traer(pide('https://webtoons.com.evil.com/x'), falso());
ok(r.status === 403, 'ni de uno que se disfraza con el nombre');
r = await traer(pide('http://www.webtoons.com/x'), falso());
ok(r.status === 400, 'sólo https');
r = await traer(new URL('https://sala.x/api/sala/inkwell/traer'), falso());
ok(r.status === 400, 'sin ?url= dice qué falta');
r = await traer(pide('https://www.webtoons.com/x.zip'), falso('application/zip'));
ok(r.status === 415, 'no pasa cosas que no son página ni imagen');
r = await traer(pide('https://www.webtoons.com/x'), async () => { throw new Error('se cayó'); });
ok(r.status === 502 && /se cayó/.test((await r.json()).error), 'si Webtoon no contesta, lo dice');
ok(HOSTS.every((h) => /webtoons\.com$|pstatic\.net$/.test(h)), 'la lista sólo tiene hosts de Webtoon');

/* por la puerta de verdad: el worker entero */
const env = { ORIGENES: 'https://mazi-central.palomazi9111.workers.dev' };
const real = globalThis.fetch; globalThis.fetch = falso();
r = await trabajador.fetch(new Request('https://sala.x/api/sala/inkwell/traer?url=' + encodeURIComponent('https://webtoon-phinf.pstatic.net/a.jpg'), { headers: { Origin: 'https://mazi-central.palomazi9111.workers.dev' } }), env);
ok(r.status === 200 && r.headers.get('Access-Control-Allow-Origin') === 'https://mazi-central.palomazi9111.workers.dev', 'el worker la contesta con CORS para la Central (y no la confunde con un código de sala)');
r = await trabajador.fetch(new Request('https://sala.x/api/sala/inkwell/traer?url=x', { headers: { Origin: 'https://otro.com' } }), env);
ok(r.status === 403, 'desde otra página, no');
r = await trabajador.fetch(new Request('https://sala.x/api/sala/inkwell/traer?url=x', { method: 'POST' }), env);
ok(r.status === 405, 'sólo GET');
globalThis.fetch = real;
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
