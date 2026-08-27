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
  ok('un tipo que no existe se rechaza', c1 === 400 && /no existe/i.test(r1.error));

  /* Corrección de Carlos: el tipo NO es obligatorio. En una junta nadie
     anuncia «esto es una PROPUESTA» antes de hablar. */
  const [c0, r0] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', texto:'nada más quiero decir esto y ya' }));
  ok('se puede hablar SIN decir de qué tipo es', c0 === 200);
  ok('y sin tipo se guarda como mensaje', r0.evento.tipo === 'mensaje');

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


/* ══ 8 · la nota del final · «como una sala de juntas» ════════════════════ */
console.log('\n· La nota para el otro Claude');
{
  const s = nueva({ LLAVES:'carlos:AAA,amigo:BBB' });
  await entrar(s, 'cl-carlos', 'claude', 'AAA');
  await entrar(s, 'cl-amigo',  'claude', 'BBB');
  await entrar(s, 'carlos', 'humano', 'AAA');
  const esperar = (yo, desde) => sFetch(s, `esperar?de=${yo}${desde ? '&desde='+desde : ''}`);

  const [c, r] = await leer(await pedir(s, 'POST', 'decir', {
    de:'carlos', texto:'Aquí va todo lo que pienso del inventario, largo y para todos.',
    nota:{ a:'cl-amigo', texto:'tú encárgate de las pantallas' },
  }, 'AAA'));
  ok('se puede mandar el mensajote con una nota al final', c === 200 && !!r.evento.nota);
  ok('la nota guarda a quién va dirigida', r.evento.nota.a === 'cl-amigo');

  /* Lo que esto resuelve: el cuerpo lo lee toda la sala, pero sólo despierta
     el que trae la nota. Nadie hace dos veces el mismo trabajo. */
  const [, alDeLaNota] = await leer(await esperar('cl-amigo'));
  ok('despierta a quien va dirigida la nota',
     alDeLaNota.eventos.some(e => e.nota && e.nota.a === 'cl-amigo'));

  const [, elOtro] = await leer(await esperar('cl-carlos'));
  ok('NO despierta al otro, aunque el cuerpo fuera para toda la sala',
     !elOtro.eventos.some(e => e.nota && e.nota.a === 'cl-amigo'));

  const [cn] = await leer(await pedir(s, 'POST', 'decir',
    { de:'carlos', texto:'x', nota:{ a:'nadie', texto:'y' } }, 'AAA'));
  ok('una nota dirigida a alguien que no está se rechaza', cn === 400);

  /* Y sin destinatario ni nota, sigue siendo para todos y despierta a todos. */
  await pedir(s, 'POST', 'decir', { de:'carlos', texto:'esto sí es para todos' }, 'AAA');
  const [, t1] = await leer(await esperar('cl-carlos'));
  const [, t2] = await leer(await esperar('cl-amigo'));
  ok('sin destinatario ni nota, despierta a todos',
     t1.eventos.some(e => e.texto === 'esto sí es para todos') &&
     t2.eventos.some(e => e.texto === 'esto sí es para todos'));
}


/* ══ 9 · reacciones ═══════════════════════════════════════════════════════ */
console.log('\n· Reacciones');
{
  const s = nueva();
  await entrar(s, 'cl-1'); await entrar(s, 'carlos', 'humano');
  const [, r] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'propuesta', texto:'yo lo haría con Postgres' }));
  const id = r.evento.id;
  const antesVueltas = s.vueltas;

  const [c1, r1] = await leer(await pedir(s, 'POST', 'reaccion',
    { de:'carlos', sobre:id, cual:'deacuerdo' }));
  ok('se puede reaccionar', c1 === 200 && r1.reacciones.deacuerdo.includes('carlos'));

  /* Lo que hace que valgan la pena: NO cuestan vuelta. Un «de acuerdo» escrito
     como mensaje sí, y ahí está la mitad del gasto de una junta. */
  ok('una reacción NO cuenta como vuelta', s.vueltas === antesVueltas);

  const [, r2] = await leer(await pedir(s, 'POST', 'reaccion',
    { de:'carlos', sobre:id, cual:'deacuerdo' }));
  ok('reaccionar dos veces la quita', !r2.reacciones.deacuerdo);

  const [c3] = await leer(await pedir(s, 'POST', 'reaccion',
    { de:'carlos', sobre:id, cual:'corazoncito' }));
  ok('una reacción inventada se rechaza', c3 === 400);

  const [c4] = await leer(await pedir(s, 'POST', 'reaccion',
    { de:'carlos', sobre:'e999', cual:'visto' }));
  ok('reaccionar a un mensaje que no existe se rechaza', c4 === 404);

  /* Y la que de verdad importa para el bolsillo: no despierta a nadie. */
  const esperando = sFetch(s, 'esperar?de=cl-1&desde=' + id);
  let desperto = false; esperando.then(() => { desperto = true; });
  await pedir(s, 'POST', 'reaccion', { de:'carlos', sobre:id, cual:'bravo' });
  await new Promise(r => setTimeout(r, 80));
  ok('una reacción NO despierta a nadie', desperto === false);
  await esperando;
}

/* ══ 10 · la pantalla del agente ══════════════════════════════════════════ */
console.log('\n· Lo que está haciendo cada quien');
{
  const s = nueva();
  await entrar(s, 'cl-1');
  const antes = s.hilo.length;

  const [c, r] = await leer(await pedir(s, 'POST', 'trabajando',
    { de:'cl-1', en:'Endpoints del inventario', paso:'Escribiendo pruebas',
      va:3, total:4, pasos:['Leí la revisión','Validé cantidad','Escribiendo pruebas'] }));
  ok('se puede reportar en qué anda', c === 200 && r.yo.trabajo.en === 'Endpoints del inventario');
  ok('guarda el avance', r.yo.trabajo.va === 3 && r.yo.trabajo.total === 4);


  /* Si cada paso fuera un mensaje el hilo sería ilegible y despertaría a los
     demás por nada. Por eso NO entra al hilo. */
  ok('NO entra al hilo', s.hilo.length === antes);

  const t1 = r.yo.trabajo.desde;
  const [, r2] = await leer(await pedir(s, 'POST', 'trabajando',
    { de:'cl-1', en:'Endpoints del inventario', paso:'Corriendo las pruebas', va:4, de_cuantos:4 }));
  ok('seguir en lo mismo conserva desde cuándo', r2.yo.trabajo.desde === t1);

  const [, r3] = await leer(await pedir(s, 'POST', 'trabajando',
    { de:'cl-1', en:'Otra cosa' }));
  ok('cambiar de tarea reinicia el reloj', r3.yo.trabajo.desde >= t1);


  /* El bug que cazó otro agente usando la sala: el denominador se llamaba
     `de`, igual que el id de quien manda el POST, y se quedaba clavado en 0.
     La barra decía «3 de 0» y desde fuera no había forma de arreglarlo. */
  const [, rv] = await leer(await pedir(s, 'POST', 'trabajando',
    { de:'cl-1', en:'x', va:2, total:5 }));
  ok('el denominador NO choca con el id del emisor', rv.yo.trabajo.total === 5);
  const [, rc] = await leer(await pedir(s, 'POST', 'trabajando',
    { de:'cl-1', en:'y', va:1, de_cuantos:9 }));
  ok('el nombre viejo `de_cuantos` sigue sirviendo', rc.yo.trabajo.total === 9);

  const [, r4] = await leer(await pedir(s, 'POST', 'trabajando', { de:'cl-1' }));
  ok('sin `en` se apaga la pantalla', r4.yo.trabajo === null);

  const [c5, r5] = await leer(await pedir(s, 'POST', 'trabajando', { de:'fantasma', en:'x' }));
  ok('un fantasma no puede reportar', c5 === 400);
  /* El error tiene que decir la verdad: antes decía «esa sesión no está en la
     sala» aunque lo que faltara fuera el campo `de`, y eso manda a volver a
     entrar en vez de a revisar el cuerpo del POST. */
  ok('y el error dice cuál id no encontró', /fantasma/.test(r5.error));
  const [c6, r6] = await leer(await pedir(s, 'POST', 'trabajando', { en:'x' }));
  ok('sin `de`, el error dice que falta `de` y no otra cosa',
     c6 === 400 && /Falta `de`/.test(r6.error));
}

/* ══ 11 · presentaciones ══════════════════════════════════════════════════ */
console.log('\n· Presentaciones');
{
  const s = nueva();
  await entrar(s, 'cl-1');
  const di = (a) => pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'propuesta', texto:'así quedarían', adjuntos:[a] });

  const buena = { clase:'presentacion', titulo:'Pantallas',
    laminas:[{ mime:'image/png', datos:'iVBORw0KGgo=' },
             { mime:'image/png', datos:'iVBORw0KGgo=' }] };
  const [c1, r1] = await leer(await di(buena));
  ok('una presentación con láminas pasa', c1 === 200 && r1.evento.adjuntos[0].laminas.length === 2);

  const [c2] = await leer(await di({ clase:'presentacion', laminas:[] }));
  ok('una presentación sin láminas se rechaza', c2 === 400);

  const [c3] = await leer(await di({ clase:'presentacion',
    laminas:[{ mime:'application/pdf', datos:'x' }] }));
  ok('un PDF disfrazado de lámina se rechaza', c3 === 400);

  const [c4] = await leer(await di({ clase:'presentacion',
    laminas:Array(50).fill({ mime:'image/png', datos:'x' }) }));
  ok('cincuenta láminas se rechazan', c4 === 400);

  const [c5] = await leer(await di({ clase:'presentacion',
    laminas:[{ mime:'image/png', datos:'A'.repeat(7_000_000) }] }));
  ok('una presentación demasiado pesada se rechaza', c5 === 400);
}



/* ══ 12 · cualquier IA, no sólo Claude ════════════════════════════════════ */
console.log('\n· Agentes de cualquier marca');
{
  const s = nueva();
  const [c1, r1] = await leer(await pedir(s, 'POST', 'entrar',
    { id:'g-1', nombre:'GPT de Beto', tipo:'agente', motor:'gpt-5' }));
  ok('entra un agente que no es Claude', c1 === 200 && r1.yo.tipo === 'agente');
  ok('guarda de qué motor es', r1.yo.motor === 'gpt-5');

  const [, r2] = await leer(await pedir(s, 'POST', 'entrar',
    { id:'c-1', nombre:'Claude', tipo:'claude' }));
  ok('el tipo viejo `claude` sigue sirviendo y se guarda como agente',
     r2.yo.tipo === 'agente');

  /* LO QUE MÁS IMPORTA de abrir la sala a otras IAs: el freno comprobaba
     tipo === 'claude'. Al renombrar el tipo, un agente de otra marca se
     habría quedado SIN freno y nadie se habría enterado hasta la factura. */
  await entrar(s, 'carlos', 'humano');
  let frenado = null;
  for(let i = 0; i < 40 && !frenado; i++){
    const [c] = await leer(await pedir(s, 'POST', 'decir',
      { de: i % 2 ? 'g-1' : 'c-1', tipo:'desacuerdo', texto:'no' }));
    if(c === 429) frenado = i;
  }
  ok('el freno también para a los agentes de otra marca', frenado === 12);

  const [, ev] = await leer(await pedir(s, 'POST', 'decir',
    { de:'carlos', texto:'yo decido' }));
  ok('un humano sigue reiniciando el contador', ev.bien !== false);
  const [ck] = await leer(await pedir(s, 'POST', 'decir', { de:'g-1', texto:'ok' }));
  ok('y después el agente puede seguir', ck === 200);

  const [, r3] = await leer(await pedir(s, 'POST', 'decir', { de:'g-1', texto:'hola' }));
  ok('el evento lleva el motor, para pintarlo en la mesa', r3.evento.de.motor === 'gpt-5');
}



/* ══ 13 · «explícamelo simple» ════════════════════════════════════════════ */
console.log('\n· El traductor a lenguaje llano');
{
  const s = nueva();
  await entrar(s, 'cl-1');
  const [, r] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'propuesta', texto:'Denormalizar el saldo en productos y actualizarlo en la misma transacción que el movimiento.' }));

  /* Sin llave NO se inventa nada: se dice que está apagado y cómo prenderlo.
     Prometer algo que no funciona es como se pierde la confianza. */
  const [c1, r1] = await leer(await pedir(s, 'POST', 'traducir', { sobre:r.evento.id }));
  ok('sin llave dice que no hay traductor', c1 === 501 && r1.apagado === true);
  ok('y dice cómo se pone', /wrangler secret/.test(r1.comoSePone || ''));

  const s2 = nueva({ TRADUCTOR_LLAVE:'x' });
  await entrar(s2, 'cl-1');
  const [, r2] = await leer(await pedir(s2, 'POST', 'decir', { de:'cl-1', texto:'x' }));
  const [c2, rr2] = await leer(await pedir(s2, 'POST', 'traducir', { sobre:r2.evento.id }));
  ok('con llave pero sin URL, también avisa', c2 === 501 && rr2.apagado === true);

  const [c3] = await leer(await pedir(s, 'POST', 'traducir', { sobre:'e999' }));
  ok('traducir un mensaje que no existe se rechaza', c3 === 404);

  /* Y la que de verdad importa: traducir NO mete nada al hilo. Es ayuda de
     lectura de quien la pidió, no un mensaje más de la junta. */
  const antes = s.hilo.length;
  await pedir(s, 'POST', 'traducir', { sobre:r.evento.id });
  ok('traducir no ensucia el hilo', s.hilo.length === antes);
}


function sFetch(sala, ruta){
  return sala.fetch(new Request(`https://s.test/api/sala/ABCDEF/${ruta}`,
    { headers:{ 'X-Llave':'AAA' } }));
}


/* ══ · quién es quién ═════════════════════════════════════════════════════
   Tres preguntas distintas y tres canales distintos. Lo que se prueba aquí es
   que NO se confundan: que el modelo no dependa de la cuenta, que el color no
   dependa del modelo, y que dos sesiones de la misma cuenta se distingan sin
   dejar de verse de la misma cuenta. */
console.log('\n· Quién es quién: figura, color y matiz');
{
  const s = nueva({ LLAVES:'carlos:AAA,luis:BBB', COLORES:'carlos:#AC27FF,luis:#FF7A18' });

  const conMotor = (id, motor, llave, tipo = 'claude') =>
    pedir(s, 'POST', 'entrar', { id, nombre:id, tipo, motor }, llave);

  const [, a] = await leer(await conMotor('c1', 'claude-opus-5', 'AAA'));
  const [, b] = await leer(await conMotor('c2', 'gpt-5.2-codex', 'AAA'));
  const [, l1] = await leer(await conMotor('l1', 'claude-sonnet-5', 'BBB'));

  ok('la FIGURA sale del modelo', a.yo.familia === 'claude' && b.yo.familia === 'gpt');
  ok('el COLOR sale de la cuenta, no del modelo',
     a.yo.color === '#AC27FF' && b.yo.color === '#AC27FF' && l1.yo.color === '#FF7A18');
  /* Éste es el punto de todo: mismo modelo, cuentas distintas, colores
     distintos. Era literalmente lo que pidió Carlos. */
  ok('mismo modelo en dos cuentas se ve distinto',
     a.yo.familia === l1.yo.familia && a.yo.color !== l1.yo.color);
  ok('dos sesiones de la misma cuenta comparten color pero no matiz',
     a.yo.color === b.yo.color && a.yo.sombra !== b.yo.sombra);

  /* Los nombres de modelo no vienen de un catálogo: vienen de lo que teclee
     cada quien. Si sólo cazara los que yo conozco, sería un adorno. */
  const casos = [
    ['anthropic/claude-haiku-4-5', 'claude'], ['o3-mini', 'gpt'],
    ['gemini-3-pro', 'gemini'], ['groq/llama-3.3-70b', 'llama'],
    ['mixtral-8x7b', 'mistral'], ['deepseek-v3', 'deepseek'],
    ['qwen3-coder', 'qwen'], ['grok-4', 'grok'], ['ollama/phi', 'local'],
    ['modelo-que-no-existe', 'otra'],
  ];
  let todas = true;
  for(const [motor, esperada] of casos){
    const [, r] = await leer(await conMotor('m-' + motor, motor, 'AAA'));
    if(r.yo.familia !== esperada){ todas = false; console.log(`      ${motor} → ${r.yo.familia}, esperaba ${esperada}`); }
  }
  ok(`reconoce el modelo por como lo escribe cada quien (${casos.length} casos)`, todas);
  /* Un proveedor no es un modelo: en «groq/llama-3.3» el que contesta es
     Llama. Si ganara el proveedor, tres modelos distintos se verían igual. */
  const [, gl] = await leer(await conMotor('gl', 'groq/llama-3.3-70b', 'AAA'));
  ok('gana el modelo sobre el proveedor', gl.yo.familia === 'llama');

  const [, hum] = await leer(await pedir(s, 'POST', 'entrar',
    { id:'carlos', nombre:'Carlos', tipo:'humano' }, 'AAA'));
  ok('una persona no es un modelo', hum.yo.familia === 'persona');

  /* Sin COLORES configurados tiene que salir algo estable de todos modos: si
     hiciera falta configurar para que se vea bien, no funcionaría el primer
     día — que es cuando se decide si se usa o se abandona. */
  const s2 = nueva();
  const [, x1] = await leer(await entrar(s2, 'quien'));
  const s3 = nueva();
  const [, x2] = await leer(await entrar(s3, 'quien'));
  ok('sin configurar, el color es estable y no gris',
     x1.yo.color === x2.yo.color && /^#[0-9A-F]{6}$/i.test(x1.yo.color));

  /* La credencial tiene que VIAJAR con el evento. Si el hilo sólo guardara el
     id, un mensaje de alguien que ya se salió quedaría sin cara. */
  await pedir(s, 'POST', 'decir', { de:'c1', a:'c2', texto:'hola' }, 'AAA');
  const [, h] = await leer(await pedir(s, 'GET', 'hilo', undefined, 'AAA'));
  const dicho = h.hilo.find(e => e.texto === 'hola');
  ok('la credencial viaja pegada al evento',
     dicho.de.familia === 'claude' && dicho.de.color === '#AC27FF' &&
     typeof dicho.de.sombra === 'number');

  /* Un color mal escrito en la configuración no debe pintar basura: se cae al
     estable, que es lo que hace que un dedazo no rompa la mesa. */
  const s4 = nueva({ LLAVES:'carlos:AAA', COLORES:'carlos:morado' });
  const [, mal2] = await leer(await entrar(s4, 'z', 'claude', 'AAA'));
  ok('un color inválido en la configuración no rompe nada',
     /^#[0-9A-F]{6}$/i.test(mal2.yo.color || ''));
}

console.log('\n· Subagentes');
{
  const s = nueva({ LLAVES:'carlos:AAA,luis:BBB' });
  await pedir(s, 'POST', 'entrar', { id:'jefe', nombre:'Jefe', tipo:'claude', motor:'claude-opus-5' }, 'AAA');
  const [c, sub] = await leer(await pedir(s, 'POST', 'entrar',
    { id:'sub1', nombre:'Explorador', tipo:'claude', motor:'claude-haiku-4-5', padre:'jefe' }, 'AAA'));
  ok('un subagente entra diciendo de quién salió', c === 200 && sub.yo.padre === 'jefe');

  /* El subagente lleva el color de su dueño porque su trabajo se le COBRA a su
     dueño. Lo que cambia es la figura —es otro modelo— y el anillo. */
  const [, jefe] = await leer(await pedir(s, 'GET', 'hilo', undefined, 'AAA'));
  const g = jefe.gente;
  ok('el subagente hereda el color de su dueño', g.sub1.color === g.jefe.color);
  /* Ojo con lo que se le pide aquí: opus y haiku son LOS DOS Claude, así que
     la figura es la misma a propósito —lo pedí mal la primera vez y la prueba
     me corrigió—. Lo que los separa es el matiz y el anillo de subagente. */
  ok('los dos son Claude, así que la figura es la misma',
     g.sub1.familia === 'claude' && g.jefe.familia === 'claude');
  ok('y aun así no se confunden: matiz distinto y anillo de subagente',
     g.sub1.sombra !== g.jefe.sombra && g.sub1.padre === 'jefe' && !g.jefe.padre);

  /* Sin esto, cualquiera podría colgar su sesión del árbol de otro y hacer
     pasar su trabajo por trabajo ajeno. */
  const [c2, e2] = await leer(await pedir(s, 'POST', 'entrar',
    { id:'colado', nombre:'Colado', tipo:'claude', padre:'jefe' }, 'BBB'));
  ok('no se puede colgar una sesión del árbol de otra cuenta', c2 === 403);
  ok('y lo dice con todas sus letras', /otra cuenta/i.test(e2.error || ''));
  const [, tras] = await leer(await pedir(s, 'GET', 'hilo', undefined, 'AAA'));
  ok('el intento fallido no deja una sesión a medias', !tras.gente.colado);
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
