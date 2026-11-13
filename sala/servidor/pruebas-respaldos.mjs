/* Pruebas de las IAs de respaldo (respaldos.js) y del reloj por modelo (modelos.js).
   node sala/servidor/pruebas-respaldos.mjs */
import { preguntarRespaldo, escoger, respaldosVivos } from './respaldos.js';
import { preguntar } from './modelos.js';
let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

const msj = [{ de: 'tu', texto: 'hola' }];
/* la nube contesta con la forma de OpenAI, y el primer modelo truena */
const AI = { llamadas: [], async run(m, e){ this.llamadas.push(m); if(this.llamadas.length === 1) throw new Error('5035 no disponible'); return { choices: [{ message: { content: 'listo ' + m } }] }; } };
let r = await preguntarRespaldo('nube', { AI }, 'sis', msj, { tope: 100 });
ok(r.bien && AI.llamadas.length === 2 && r.texto.startsWith('listo'), 'la nube salta al siguiente modelo si uno truena');
const AI2 = { async run(m){ return { response: 'forma vieja' }; } };
r = await preguntarRespaldo('nube', { AI: AI2 }, 'sis', msj, {});
ok(r.bien && r.texto === 'forma vieja', 'también lee la forma vieja de Workers AI (response)');
r = await preguntarRespaldo('nube', { AI: { async run(m, e){ return { choices: [{ message: { content: JSON.stringify(e.messages.at(-1).content[1].type) } }] }; } } }, 'sis', msj, { imagenes: [{ mime: 'image/jpeg', data: 'AAA' }] });
ok(r.bien && r.modelo.includes('scout') && r.texto.includes('image_url'), 'con foto usa el modelo que ve y le manda la imagen');
r = await preguntarRespaldo('nube', {}, 'sis', msj, {});
ok(!r.bien && /apagad/.test(r.error), 'sin enlace se dice apagada');

/* los de llave escogen su modelo de la lista viva */
ok(escoger(['a/x', 'google/gemma-4-31b-it:free', 'zz:free'], [/gemma-4-31b.*:free$/, /:free$/]).join() === 'google/gemma-4-31b-it:free,zz:free', 'escoge por preferencia, sin repetir');
let pedidos = [];
const hacer = async (u, o = {}) => { pedidos.push(u); if(u.endsWith('/models')) return new Response(JSON.stringify({ data: [{ id: 'mistral-small-latest' }, { id: 'otro' }] }));
  const b = JSON.parse(o.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'hecho por ' + b.model } }] })); };
r = await preguntarRespaldo('mistral', { MISTRAL_API_KEY: 'k' }, 'sis', msj, { hacer });
ok(r.bien && r.texto === 'hecho por mistral-small-latest', 'Mistral pide su lista y usa el modelo que existe hoy');
r = await preguntarRespaldo('cerebras', {}, 'sis', msj, { hacer });
ok(!r.bien && /apagad/.test(r.error), 'sin llave, Cerebras se queda apagado sin estorbar');
const h401 = async (u) => u.endsWith('/models') ? new Response(JSON.stringify({ data: [{ id: 'google/gemma-4-31b-it:free' }] })) : new Response('no', { status: 401 });
r = await preguntarRespaldo('openrouter', { OPENROUTER_API_KEY: 'k' }, 'sis', msj, { hacer: h401 });
ok(!r.bien && /llave/.test(r.error), 'una llave mala se dice como llave mala');
ok(respaldosVivos({ AI: {}, MISTRAL_API_KEY: 'x' }).map((x) => x.id).join() === 'nube,mistral', 'sabe cuáles respaldos están vivos');

/* el reloj por modelo: el primero se cuelga, el segundo contesta */
const fetchViejo = globalThis.fetch;
let vez = 0;
globalThis.fetch = (u, o) => { vez++; if(vez === 1) return new Promise((_, no) => o.signal.addEventListener('abort', () => no(Object.assign(new Error('abort'), { name: 'AbortError' }))));
  return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'del respaldo' }] } }] }))); };
const t0 = Date.now();
r = await preguntar('gemini', { GEMINI_API_KEY: 'k' }, 'sis', msj, { tope: 100, esperaMs: 60_000, porModeloMs: 800 });
globalThis.fetch = fetchViejo;
ok(r.bien && r.texto === 'del respaldo' && Date.now() - t0 < 5000, `un modelo colgado no se come todo el tiempo (${Date.now() - t0} ms)`);

/* el que se colgó se queda castigado: la siguiente pregunta ya no lo espera */
const pedidosG = [];
globalThis.fetch = (u, o) => { pedidosG.push(u); return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))); };
r = await preguntar('gemini', { GEMINI_API_KEY: 'k' }, 'sis', msj, { tope: 100, esperaMs: 60_000 });
globalThis.fetch = fetchViejo;
ok(r.bien && !/gemini-3\.8-flash:/.test(pedidosG[0]), 'la siguiente pregunta se salta el modelo que se colgó');

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
