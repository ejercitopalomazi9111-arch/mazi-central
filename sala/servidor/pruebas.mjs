/* ══════════════════════════════════════════════════════════════════════════
   LA SALA · pruebas del servidor
   ──────────────────────────────────────────────────────────────────────────
   Corre el Durable Object de verdad, con un almacenamiento de mentiras. No
   hace falta Cloudflare ni red: la clase sólo usa `ctx.storage`, `Response` y
   `crypto`, y las tres están en Node.

     node sala/servidor/pruebas.mjs

   Lo que se prueba es lo que puede COSTAR DINERO o dejar entrar a quien no
   debe: el freno de vueltas, a quién despierta cada mensaje, y los adjuntos.
   ═════════════════════════════════════════════════════════════════════════ */
import { Sala } from './sala.js';

let bien = 0, mal = 0;
const ok = (q, cierto) => {
  if(cierto){ bien++; console.log(`  ✓ ${q}`); }
  else{ mal++; console.log(`  ✗ ${q}`); }
};

/* ── el almacenamiento de mentiras ─────────────────────────────────────── */
function hacerCtx(){
  const datos = new Map();
  return {
    storage: {
      async get(k){ return datos.get(k); },
      async put(o){ for(const k in o) datos.set(k, o[k]); },
      async deleteAll(){ datos.clear(); },
      async setAlarm(){},
    },
    blockConcurrencyWhile: (f) => f(),
  };
}

/* ESPERA_MS bajo: dos de las pruebas de /esperar se agotan a propósito, y con
   los 50 s de producción la suite tardaba 1m40. */
const nueva = (env = {}) => new Sala(hacerCtx(), { ESPERA_MS: 250, ...env });

const pedir = (sala, metodo, ruta, cuerpo, llave = 'x') => sala.fetch(new Request(
  `https://s.test/api/sala/ABCDEF/${ruta}`,
  { method: metodo,
    headers: { 'content-type':'application/json', 'X-Llave': llave },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) }));

const leer = async (r) => [r.status, await r.json()];

const entrar = (sala, id, tipo = 'claude', llave = 'x') =>
  pedir(sala, 'POST', 'entrar', { id, nombre:id, tipo }, llave);

/* ══ 1 · llaves ═══════════════════════════════════════════════════════════ */
console.log('\n· Llaves y cuentas');
{
  /* Sin LLAVES configuradas todos son invitado — es lo que permite que el
     Claude del compañero entre nada más con el link. */
  const s = nueva();
  const [c1] = await leer(await entrar(s, 'a'));
  ok('sin llaves configuradas, se entra con el puro link', c1 === 200);

  const s2 = nueva({ LLAVES: 'carlos:AAA,amigo:BBB' });
  const [c2, r2] = await leer(await entrar(s2, 'a', 'claude', 'ZZZ'));
  ok('con llaves puestas, una llave desconocida se rechaza', c2 === 401 && !!r2.error);

  const [c3, r3] = await leer(await entrar(s2, 'a', 'claude', 'BBB'));
  ok('la llave decide la cuenta, no el que se conecta', c3 === 200 && r3.yo.cuenta === 'amigo');
}

/* ══ 2 · hablar ═══════════════════════════════════════════════════════════ */
console.log('\n· Hablar');
{
  const s = nueva();
  await entrar(s, 'cl-1');
  const [c1, r1] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'inventado', texto:'hola' }));
  ok('un tipo que no existe se rechaza', c1 === 400 && /Tipo desconocido/.test(r1.error));

  const [c2] = await leer(await pedir(s, 'POST', 'decir',
    { de:'fantasma', tipo:'mensaje', texto:'hola' }));
  ok('no se puede hablar sin haber entrado', c2 === 400);

  const [c3, r3] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'propuesta', a:'no-existe', texto:'hola' }));
  ok('no se le puede hablar a alguien que no está', c3 === 400 && /no hay nadie/i.test(r3.error));

  const [c4, r4] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'propuesta', texto:'yo lo haría así' }));
  ok('una propuesta válida entra al hilo', c4 === 200 && r4.evento.tipo === 'propuesta');
}

/* ══ 3 · el freno · lo que evita que esto se coma el saldo ════════════════ */
console.log('\n· El freno de vueltas');
{
  const s = nueva();
  await entrar(s, 'cl-1'); await entrar(s, 'cl-2');
  await entrar(s, 'carlos', 'humano');

  let frenado = null;
  for(let i = 0; i < 40 && !frenado; i++){
    const [c, r] = await leer(await pedir(s, 'POST', 'decir',
      { de: i % 2 ? 'cl-2' : 'cl-1', tipo:'desacuerdo', texto:'no, así no' }));
    if(c === 429) frenado = { i, r };
  }
  ok('dos agentes contestándose acaban frenados', !!frenado);
  ok('el freno dice qué hacer, no nada más que no', !!frenado && /bloqueo/.test(frenado.r.error));
  ok('el freno cae en el tope y no antes', !!frenado && frenado.i === 12);

  const [ch] = await leer(await pedir(s, 'POST', 'decir',
    { de:'carlos', tipo:'mensaje', texto:'yo decido: va PostgreSQL' }));
  ok('un humano puede hablar aunque los agentes estén frenados', ch === 200);

  const [cd] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'ejecucion', texto:'ok, lo hago' }));
  ok('y hablar reinicia el contador, así que los agentes siguen', cd === 200);
}

/* ══ 4 · a quién despierta cada mensaje ═══════════════════════════════════ */
console.log('\n· A quién despierta cada mensaje');
{
  const s = nueva({ LLAVES:'carlos:AAA,amigo:BBB' });
  await entrar(s, 'cl-carlos', 'claude', 'AAA');
  await entrar(s, 'cl-amigo',  'claude', 'BBB');
  await entrar(s, 'carlos', 'humano', 'AAA');

  const esperar = (yo, desde) => sFetch(s, `esperar?de=${yo}${desde ? '&desde='+desde : ''}`);

  await pedir(s, 'POST', 'decir',
    { de:'carlos', tipo:'mensaje', a:'cl-amigo', texto:'esto es para ti' }, 'AAA');

  const [, mio] = await leer(await esperar('cl-amigo'));
  ok('llega al destinatario', mio.eventos.some(e => e.texto === 'esto es para ti'));

  const [, ajeno] = await leer(await esperar('cl-carlos'));
  ok('NO llega al que no era — por eso no se paga doble',
     !ajeno.eventos.some(e => e.texto === 'esto es para ti'));

  await pedir(s, 'POST', 'decir',
    { de:'carlos', tipo:'mensaje', a:'@amigo', texto:'cualquiera de los tuyos' }, 'AAA');
  const [, porCuenta] = await leer(await esperar('cl-amigo'));
  ok('«@cuenta» llega a las sesiones de esa cuenta',
     porCuenta.eventos.some(e => e.texto === 'cualquiera de los tuyos'));

  const [, otraCuenta] = await leer(await esperar('cl-carlos'));
  ok('«@cuenta» no llega a la otra cuenta',
     !otraCuenta.eventos.some(e => e.texto === 'cualquiera de los tuyos'));

  /* Y la que de verdad importa: /esperar se queda colgada y despierta sola. */
  const colgado = esperar('cl-carlos', s.hilo[s.hilo.length - 1].id);
  let resuelto = false;
  colgado.then(() => { resuelto = true; });
  await new Promise(r => setTimeout(r, 60));
  ok('esperar se queda colgada mientras no hay nada', resuelto === false);

  await pedir(s, 'POST', 'decir',
    { de:'cl-amigo', tipo:'revision', a:'cl-carlos', texto:'le falta validación' }, 'BBB');
  const [, despierto] = await leer(await colgado);
  ok('y despierta sola cuando el otro contesta',
     despierto.eventos.some(e => e.texto === 'le falta validación'));
}

/* ══ 5 · límites de la app ════════════════════════════════════════════════ */
console.log('\n· Los avisos de la app');
{
  const s = nueva();
  await entrar(s, 'cl-1'); await entrar(s, 'cl-2');
  const antes = s.vueltas;

  const cuando = Date.now() + 3 * 3600_000;
  const [c, r] = await leer(await pedir(s, 'POST', 'estado',
    { de:'cl-1', estado:'topado', clase:'uso diario', reanuda:cuando, nota:'vuelvo a las 3' }));
  ok('se puede avisar que se topó el uso', c === 200 && r.yo.estado === 'topado');
  ok('y queda la hora a la que puede seguir', r.yo.reanuda === cuando);
  ok('queda en el hilo, para que se entienda el hueco', r.evento.tipo === 'limite');
  ok('avisar que te topaste NO cuenta como vuelta de conversación', s.vueltas === antes);

  const [, vuelto] = await leer(await pedir(s, 'POST', 'estado', { de:'cl-1', estado:'activo' }));
  ok('al volver se limpia la hora', vuelto.yo.estado === 'activo' && vuelto.yo.reanuda === null);

  const [cm] = await leer(await pedir(s, 'POST', 'estado', { de:'cl-1', estado:'dormido' }));
  ok('un estado inventado se rechaza', cm === 400);
}

/* ══ 6 · adjuntos ═════════════════════════════════════════════════════════ */
console.log('\n· Adjuntos');
{
  const s = nueva();
  await entrar(s, 'cl-1');
  const di = (adjuntos) => pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'ejecucion', texto:'ahí está', adjuntos });

  const [c1, r1] = await leer(await di([{ clase:'enlace', url:'javascript:alert(1)' }]));
  ok('un enlace javascript: se rechaza', c1 === 400 && /no es http/.test(r1.error));

  const [c2] = await leer(await di([{ clase:'enlace', url:'https://github.com/x/y' }]));
  ok('un enlace normal pasa', c2 === 200);

  const [c3] = await leer(await di([{ clase:'imagen', mime:'image/png',
    datos:'A'.repeat(2_000_000) }]));
  ok('una imagen demasiado pesada se rechaza', c3 === 400);

  const [c4] = await leer(await di([{ clase:'imagen', mime:'image/png', datos:'iVBORw0KGgo=' }]));
  ok('una imagen chica pasa', c4 === 200);

  const [c5] = await leer(await di([{ clase:'chuchuluco', que:'?' }]));
  ok('una clase de adjunto inventada se rechaza', c5 === 400);

  const [c6] = await leer(await di(Array(20).fill({ clase:'enlace', url:'https://a.test' })));
  ok('veinte adjuntos en un evento se rechazan', c6 === 400);
}

/* ══ 7 · el hilo no crece para siempre ════════════════════════════════════ */
console.log('\n· El hilo');
{
  const s = nueva();
  await entrar(s, 'carlos', 'humano');
  for(let i = 0; i < 450; i++){
    await pedir(s, 'POST', 'decir', { de:'carlos', tipo:'mensaje', texto:'m'+i });
  }
  ok('el hilo se recorta solo y no crece sin fin', s.hilo.length <= 400);
  ok('lo que se conserva es lo último', s.hilo[s.hilo.length - 1].texto === 'm449');
}

function sFetch(sala, ruta){
  return sala.fetch(new Request(`https://s.test/api/sala/ABCDEF/${ruta}`,
    { headers:{ 'X-Llave':'AAA' } }));
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
