/* pruebas-modelos.mjs — EL ADAPTADOR DE MODELOS, PROBADO SIN GASTAR UNA LLAMADA
 * ===========================================================================
 * `node sala/servidor/pruebas-modelos.mjs`
 *
 * POR QUÉ CON UN `fetch` DE MENTIRAS Y NO CONTRA EL PROVEEDOR DE VERDAD:
 *
 *   1. Una prueba que llama a Groq cuesta dinero y cuota cada vez que corre, y
 *      una prueba que cuesta es una prueba que se deja de correr.
 *   2. No podría probar lo que más importa. Lo caro de un adaptador no es el
 *      camino feliz: es el 404 que parece 401, el 200 con el cuerpo vacío, el
 *      que no contesta. Esos NO se pueden provocar a voluntad contra el
 *      servicio real — aquí sí.
 *   3. Y lo que de verdad hay que vigilar es la FORMA de lo que mandamos y de
 *      lo que leemos. Gemini y Groq no se parecen en nada, y confundirlos es
 *      el error que este archivo existe para evitar.
 *
 * LO QUE ESTO **NO** PRUEBA, y hay que decirlo para que nadie se confíe: que
 * los endpoints y los nombres de modelo sigan vivos. Eso sólo lo dice la
 * documentación del día. Si un motor deja de contestar en producción y estas
 * pruebas están verdes, el problema es de allá afuera y se abre su
 * documentación — no se busca aquí.
 *
 * ⚠ Y DOS PRUEBAS DE AQUÍ NACIERON MUERTAS, lo cual vale la pena dejar escrito
 * porque es el error más peligroso que puede tener un archivo de pruebas.
 * Decían:
 *     ok('…', (fingir(…), await preguntar(…), true) && true);
 *     ok('…', (() => { … return preguntar(…).then(c => c === 'model'); })());
 * La primera evalúa `true && true`. La segunda entrega una PROMESA, y una
 * promesa siempre es verdadera. Las dos pasaban con el código roto a propósito
 * — o sea que no probaban nada y de paso inflaban el marcador. Se cazaron
 * leyendo el resultado y preguntándose qué pasaría si el código estuviera mal.
 * Si vuelves a escribir un `ok(...)` cuyo segundo argumento no sea un booleano
 * ya calculado, párate: casi seguro acabas de escribir otra.
 * ===========================================================================*/
import {
  MOTORES, preguntar, motoresVivos, motoresApagados,
  PAPEL_SILLA, PAPEL_RESUMEN,
} from './modelos.js';

let pasan = 0, fallan = 0;
const ok = (t, c, extra) => {
  if (c) { pasan++; console.log('  ✓ ' + t); }
  else { fallan++; console.log('  ✗ ' + t + (extra ? '  → ' + extra : '')); }
};
const seccion = (t) => console.log('\n── ' + t + ' ──');

/* El fetch de mentiras. Guarda lo que se le pidió para poder revisarlo. */
function fingir(respuesta) {
  const visto = { url: null, opciones: null, cuerpo: null };
  globalThis.fetch = async (url, opciones) => {
    visto.url = String(url);
    visto.opciones = opciones;
    try { visto.cuerpo = JSON.parse(opciones.body); } catch { visto.cuerpo = null; }
    if (typeof respuesta === 'function') return respuesta(visto);
    return respuesta;
  };
  return visto;
}
const resp = (estado, cuerpo) => ({
  ok: estado >= 200 && estado < 300,
  status: estado,
  json: async () => cuerpo,
  text: async () => typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
});

const ENV = { GROQ_API_KEY: 'llave-de-mentiras-groq', GEMINI_API_KEY: 'llave-de-mentiras-gemini' };
const MSG = [{ de: 'otro', texto: '¿en qué vamos?' }];

/* ══════════════════════════════════════════════════════════════════════════ */
seccion('quién está prendido y quién no');

ok('con las dos llaves, los dos motores están vivos',
   motoresVivos(ENV).length === 2, String(motoresVivos(ENV).length));
ok('sin llaves no hay ninguno vivo',
   motoresVivos({}).length === 0);
ok('y los apagados se pueden nombrar, con el secreto que les falta',
   motoresApagados({}).some(m => m.falta === 'GROQ_API_KEY') &&
   motoresApagados({}).some(m => m.falta === 'GEMINI_API_KEY'));
ok('un motor con llave NO sale en la lista de apagados',
   motoresApagados(ENV).length === 0);

/* ══════════════════════════════════════════════════════════════════════════ */
seccion('groq habla el dialecto de OpenAI');

{
  const visto = fingir(resp(200, { choices: [{ message: { content: 'vamos en la mitad' } }] }));
  const r = await preguntar('groq', ENV, 'eres una prueba', MSG);
  ok('contesta bien y saca el texto de `choices[0].message.content`',
     r.bien && r.texto === 'vamos en la mitad', JSON.stringify(r));
  ok('pega en /openai/v1/chat/completions',
     visto.url === 'https://api.groq.com/openai/v1/chat/completions', visto.url);
  ok('manda la llave como Bearer, en cabecera',
     visto.opciones.headers['Authorization'] === 'Bearer ' + ENV.GROQ_API_KEY);
  ok('la llave NO va en la URL',
     !visto.url.includes(ENV.GROQ_API_KEY));
  ok('el sistema va como PRIMER mensaje con role system',
     visto.cuerpo.messages[0].role === 'system' &&
     visto.cuerpo.messages[0].content === 'eres una prueba');
  ok('lo que dijo otro va como `user`',
     visto.cuerpo.messages[1].role === 'user' &&
     visto.cuerpo.messages[1].content === '¿en qué vamos?');
}
{
  const visto = fingir(resp(200, { choices: [{ message: { content: 'x' } }] }));
  await preguntar('groq', ENV, 's', [{ de: 'yo', texto: 'lo dije yo' }]);
  ok('y lo que dije YO va como `assistant`, no como user',
     visto.cuerpo.messages[1].role === 'assistant', visto.cuerpo.messages[1].role);
}

/* ══════════════════════════════════════════════════════════════════════════ */
seccion('gemini NO habla el dialecto de OpenAI');

{
  const visto = fingir(resp(200, { candidates: [{ content: { parts: [{ text: 'ya quedó' }] } }] }));
  const r = await preguntar('gemini', ENV, 'eres una prueba', MSG);
  ok('contesta bien y saca el texto de `candidates[0].content.parts`',
     r.bien && r.texto === 'ya quedó', JSON.stringify(r));
  ok('pega en /v1beta/models/<modelo>:generateContent',
     visto.url.includes('/v1beta/models/') && visto.url.includes(':generateContent'), visto.url);
  ok('el nombre del modelo va EN LA RUTA, no en el cuerpo',
     visto.url.includes(MOTORES.gemini.modelo) && !('model' in (visto.cuerpo || {})));
  ok('NO manda `messages` — eso es de OpenAI y aquí no existe',
     !('messages' in visto.cuerpo));
  /* ⚠ CON ENCADENAMIENTO OPCIONAL, y no es manía. Sin el `?.`, quitar
     `systemInstruction` del adaptador no hacía FALLAR esta prueba: la hacía
     REVENTAR con un TypeError, el proceso moría antes del marcador y la salida
     quedaba vacía. O sea que la mutación más obvia del archivo —tratar a Gemini
     como si fuera OpenAI— se veía igual que «todo bien» si uno leía por encima.
     Una prueba que truena no informa: hay que dejarla llegar a decir ✗. */
  ok('el sistema va en `systemInstruction`, NO como un turno más',
     visto.cuerpo?.systemInstruction?.parts?.[0]?.text === 'eres una prueba' &&
     !(visto.cuerpo?.contents || []).some(c => c.role === 'system'),
     JSON.stringify(visto.cuerpo?.systemInstruction ?? 'NO VENÍA'));
}
{
  const visto = fingir(resp(200, { candidates: [{ content: { parts: [{ text: 'x' }] } }] }));
  await preguntar('gemini', ENV, 's', [{ de: 'yo', texto: 'mío' }]);
  ok('lo mío va con role `model` (no `assistant`, que es de OpenAI)',
     visto.cuerpo.contents[0].role === 'model', visto.cuerpo.contents[0].role);
  ok('junta varias `parts` en un solo texto',
     (await (async () => {
       fingir(resp(200, { candidates: [{ content: { parts: [{ text: 'una ' }, { text: 'sola' }] } }] }));
       const r = await preguntar('gemini', ENV, 's', MSG);
       return r.texto;
     })()) === 'una sola');
}

/* ══════════════════════════════════════════════════════════════════════════ */
seccion('los fallos, que es para lo que sirve de verdad');

{
  const r = await preguntar('groq', {}, 's', MSG);
  ok('sin llave NO truena: se apaga y lo dice',
     !r.bien && r.error.includes('GROQ_API_KEY') && r.error.includes('Cloudflare'), r.error);
}
{
  fingir(resp(401, 'no'));
  const r = await preguntar('groq', ENV, 's', MSG);
  ok('401 dice que la LLAVE no sirve',
     !r.bien && /llave/i.test(r.error) && !/modelo/i.test(r.error), r.error);
}
{
  fingir(resp(404, 'no such model'));
  const r = await preguntar('groq', ENV, 's', MSG);
  /* ⚠ ÉSTA ES LA PRUEBA QUE MÁS IMPORTA DE TODO EL ARCHIVO. En esta casa ya
     pasó: siete modelos con el nombre viejo, y las cuatro llaves BUENAS daban
     404. Parecían llaves malas. Media tarde en eso. */
  ok('404 dice que la llave está BIEN y el que caducó es el nombre del modelo',
     !r.bien && /llave está BIEN/i.test(r.error) && /modelo/i.test(r.error), r.error);
}
{
  fingir(resp(429, 'slow down'));
  const r = await preguntar('groq', ENV, 's', MSG);
  ok('429 dice que vamos muy seguido',
     !r.bien && r.error.includes('429'), r.error);
}
{
  fingir(resp(200, { choices: [{ message: { content: '   ' } }] }));
  const r = await preguntar('groq', ENV, 's', MSG);
  ok('un 200 con el texto VACÍO se reporta como fallo, no se publica en blanco',
     !r.bien && /sin texto/i.test(r.error), r.error);
}
{
  globalThis.fetch = async () => { const e = new Error('abortado'); e.name = 'AbortError'; throw e; };
  const r = await preguntar('gemini', ENV, 's', MSG, { esperaMs: 10 });
  ok('si no contesta a tiempo, lo dice con los segundos',
     !r.bien && /no contestó/i.test(r.error), r.error);
}
{
  globalThis.fetch = async () => { throw new Error('se cayó la red'); };
  const r = await preguntar('gemini', ENV, 's', MSG);
  ok('cualquier otra explosión se devuelve como dato, NUNCA se lanza',
     !r.bien && r.error.includes('se cayó la red'), r.error);
}
{
  const r = await preguntar('no-existe', ENV, 's', MSG);
  ok('un motor que no existe se dice claro, no truena',
     !r.bien && r.error.includes('no-existe'), r.error);
}

/* ══════════════════════════════════════════════════════════════════════════ */
seccion('los encargos, en las palabras de Carlos');

ok('el papel de la silla lleva el nombre de quien la ocupa',
   PAPEL_SILLA('Groq').includes('Eres Groq'));
ok('y le prohíbe tomar decisiones que autoriza una persona',
   /nunca orden/i.test(PAPEL_SILLA('X')) && /autoriza una persona/i.test(PAPEL_SILLA('X')));
ok('el del resumen pone PRIMERO lo que está esperando a Carlos',
   PAPEL_RESUMEN.indexOf('esperando a Carlos') > 0 &&
   /lo más\s+importante/i.test(PAPEL_RESUMEN));
ok('y le prohíbe inventar',
   /no inventes/i.test(PAPEL_RESUMEN));

/* ══════════════════════════════════════════════════════════════════════════ */
console.log('\n' + (fallan ? '✗' : '✓') + `  ${pasan} pasan · ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
