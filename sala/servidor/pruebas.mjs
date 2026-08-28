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
      /* La alarma se guarda de verdad: sin esto no se puede probar que una
         sala viva no se borre sola, que es lo que se comió la sala de Carlos. */
      async setAlarm(t){ datos.set('__alarma', t); },
      async getAlarm(){ return datos.get('__alarma') ?? null; },
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

  /* ⚠ EL DEFECTO QUE ESTO CAZA, y lo encontré chocando contra él en la sala de
     verdad: el freno rechazaba TODO, incluido el `bloqueo` que su propio
     mensaje de error pedía escribir. El sistema mandaba hacer algo y no dejaba
     hacerlo, así que el agente frenado se quedaba mudo y la persona que llegaba
     a desatorar encontraba doce mensajes sin nadie diciendo dónde iba la cosa
     — que es justo lo que el freno existe para producir. */
  const [cb, rb] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'bloqueo', texto:'Resumen: no nos ponemos de acuerdo en la base de datos.' }));
  ok('frenado, el resumen que el propio error pide SÍ pasa', cb === 200, JSON.stringify(rb).slice(0,120));

  /* Pero uno solo. Dos agentes «resumiendo» son dos agentes hablando. */
  const [cb2, rb2] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-2', tipo:'bloqueo', texto:'Y yo resumo también, y otra vez, y otra' }));
  ok('pero un segundo resumen ya no', cb2 === 429);
  ok('y el error lo dice, en vez de repetir la misma instrucción',
     /ya está puesto/.test(rb2.error || ''), rb2.error);

  const [cb3] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'mensaje', texto:'y sigo hablando como si nada' }));
  ok('y el resumen no destapa la conversación', cb3 === 429);

  const [ch] = await leer(await pedir(s, 'POST', 'decir',
    { de:'carlos', tipo:'mensaje', texto:'yo decido: va PostgreSQL' }));
  ok('un humano puede hablar aunque los agentes estén frenados', ch === 200);

  const [cd] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'ejecucion', texto:'ok, lo hago' }));
  ok('y hablar reinicia el contador, así que los agentes siguen', cd === 200);

  /* Y el permiso de resumir se recarga con la persona: si la sala se vuelve a
     frenar, hay que poder resumir otra vez. Sin esto, el segundo atorón del
     día se queda mudo. */
  let otraVez = null;
  for(let i = 0; i < 40 && !otraVez; i++){
    const [c] = await leer(await pedir(s, 'POST', 'decir',
      { de: i % 2 ? 'cl-2' : 'cl-1', tipo:'desacuerdo', texto:'y dale' }));
    if(c === 429) otraVez = i;
  }
  const [cb4] = await leer(await pedir(s, 'POST', 'decir',
    { de:'cl-1', tipo:'bloqueo', texto:'Segundo resumen, del segundo atorón.' }));
  ok('tras hablar la persona, se puede volver a resumir en el siguiente freno',
     otraVez !== null && cb4 === 200);
}


/* ══ 3-bis · la llave maestra · volver a entrar a tu propia sala ═══════════ */
console.log('\n· La llave maestra');
{
  /* ⚠ ESTO ESTABA ESCRITO EN UN COMENTARIO Y NO EXISTÍA EN EL CÓDIGO. Decía
     que la llave del worker era la segunda capa, y el código se salía antes de
     llegar a ella en cuanto la sala tenía dueño. Consecuencia: el dueño que
     perdiera su llave —teléfono nuevo, datos del navegador borrados— quedaba
     FUERA DE SU PROPIA SALA para siempre, porque `fundar` la rechaza si ya hay
     dueño y sólo el dueño puede invitar. */

  /* Primero, sin maestra: así es como está GRUPAZ hoy. */
  const abierta = new Sala(hacerCtx(), { ESPERA_MS:250 });
  const [ca] = await leer(await pedir(abierta, 'POST', 'entrar',
    { id:'x', nombre:'Quien sea', tipo:'humano' }, 'sin-llave'));
  ok('una sala nueva sin llaves sigue abierta: basta el link', ca === 200);

  const [cf, rf] = await leer(await pedir(abierta, 'POST', 'fundar',
    { cuenta:'carlos' }, 'sin-llave'));
  ok('se puede fundar desde la web, sin terminal', cf === 200 && !!rf.llave);
  const suya = rf.llave;

  const [cn] = await leer(await pedir(abierta, 'POST', 'entrar',
    { id:'y', nombre:'Colado', tipo:'humano' }, 'llave-inventada'));
  ok('ya cerrada, una llave inventada NO entra', cn === 403 || cn === 401);

  const [cs] = await leer(await pedir(abierta, 'POST', 'entrar',
    { id:'carlos', nombre:'Carlos', tipo:'humano' }, suya));
  ok('la llave que le dio la sala sí entra', cs === 200);

  /* Sin maestra puesta, cerrada es cerrada: y el dueño que pierda su llave se
     queda afuera. Es lo que hay que saber ANTES de cerrar una sala. */
  ok('y sin maestra, perder la llave deja al dueño afuera para siempre',
     cn === 403 || cn === 401);

  /* Ahora CON maestra: la misma sala, pero el worker trae `LLAVES`. */
  const ctx2 = hacerCtx();
  const conMaestra = new Sala(ctx2, { ESPERA_MS:250, LLAVES:'carlos:MAESTRA' });
  /* Se funda usando la maestra, que aquí es la única que entra. */
  const [cf2, rf2] = await leer(await pedir(conMaestra, 'POST', 'fundar',
    { cuenta:'carlos' }, 'MAESTRA'));
  ok('con maestra puesta, se funda con ella', cf2 === 200 && !!rf2.llave);

  const [cm] = await leer(await pedir(conMaestra, 'POST', 'entrar',
    { id:'carlos-2', nombre:'Carlos otra vez', tipo:'humano' }, 'MAESTRA'));
  ok('y la maestra sigue entrando aunque la sala ya tenga dueño', cm === 200);

  const g = Object.values((await (await pedir(conMaestra, 'GET', 'hilo',
    undefined, 'MAESTRA')).json()).gente);
  const yo = g.find(p => p.id === 'carlos-2');
  ok('y entra como SU cuenta, no como invitado', !!yo && yo.cuenta === 'carlos',
     yo && yo.cuenta);

  const [cx] = await leer(await pedir(conMaestra, 'POST', 'entrar',
    { id:'z', nombre:'Colado', tipo:'humano' }, 'nada-que-ver'));
  ok('pero una llave cualquiera sigue sin entrar', cx === 403 || cx === 401);
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

  /* ── el proceso cognitivo, las skills y lo que corrió ──────────────────
     Carlos: «que podamos ver qué skills se usaron, qué se ejecutó, y más que
     nada el proceso cognitivo». Se revisa AQUÍ y no en la página, porque la
     página se puede cambiar desde el navegador y el servidor no. */
  const [p1] = await leer(await di([{ clase:'pensamiento',
    titulo:'Por qué no era el filtro', texto:'Llevaba tres rondas...' }]));
  ok('un pensamiento con texto pasa', p1 === 200);

  const [p2, rp2] = await leer(await di([{ clase:'pensamiento', titulo:'x' }]));
  ok('un pensamiento sin texto se rechaza', p2 === 400 && /texto/.test(rp2.error));

  const [p3] = await leer(await di([{ clase:'pensamiento', texto:'   ' }]));
  ok('y uno con puros espacios tampoco', p3 === 400);

  const [p4] = await leer(await di([{ clase:'pensamiento', texto:'a'.repeat(9000) }]));
  ok('un razonamiento de nueve mil letras se rechaza', p4 === 400);

  const [s1] = await leer(await di([{ clase:'skill', nombre:'agent-browser',
    porque:'para verlo en pantalla' }]));
  ok('una skill con nombre pasa', s1 === 200);

  const [s2] = await leer(await di([{ clase:'skill', porque:'sin nombre' }]));
  ok('una skill sin nombre se rechaza', s2 === 400);

  const [k1] = await leer(await di([{ clase:'codigo', texto:'const a = 1;',
    lenguaje:'js', archivo:'src/a.js' }]));
  ok('un trozo de código pasa', k1 === 200);

  const [k2, rk2] = await leer(await di([{ clase:'codigo', lenguaje:'js' }]));
  ok('sin texto se rechaza', k2 === 400 && /texto/.test(rk2.error));

  const [k3] = await leer(await di([{ clase:'codigo', texto:'x'.repeat(13000) }]));
  ok('trece mil letras de código se rechazan: eso es un archivo', k3 === 400);

  const [k4] = await leer(await di([{ clase:'codigo', texto:'x', lenguaje:'x'.repeat(30) }]));
  ok('un «lenguaje» de treinta letras se rechaza', k4 === 400);

  const [k5] = await leer(await di([{ clase:'codigo', texto:'x' }]));
  ok('pero sin lenguaje ni archivo también pasa: lo importante es el código', k5 === 200);

  const [e1] = await leer(await di([{ clase:'corrida',
    orden:'node reportes/pruebas-app.mjs', codigo:0, salida:'34/34' }]));
  ok('una corrida completa pasa', e1 === 200);

  const [e2] = await leer(await di([{ clase:'corrida', orden:'ls' }]));
  ok('y una corrida sin salida también: la orden ya dice algo', e2 === 200);

  const [e3] = await leer(await di([{ clase:'corrida', salida:'algo' }]));
  ok('una corrida sin orden se rechaza', e3 === 400);

  const [e4] = await leer(await di([{ clase:'corrida', orden:'ls', salida:'x'.repeat(5000) }]));
  ok('una salida de cinco mil letras se rechaza', e4 === 400);

  const [e5, re5] = await leer(await di([{ clase:'corrida', orden:'ls', codigo:'0' }]));
  ok('un código de salida que no es número se rechaza', e5 === 400 && /entero/.test(re5.error));

  /* Lo que de verdad importa: que llegue COMPLETO al hilo. Un adjunto que se
     acepta y luego se guarda a medias es peor que uno rechazado. */
  const conProceso = (await (await pedir(s, 'GET', 'hilo')).json()).hilo
    .filter(x => (x.adjuntos || []).some(a => a.clase === 'pensamiento'));
  const uno = conProceso[0] && conProceso[0].adjuntos.find(a => a.clase === 'pensamiento');
  ok('el pensamiento llega entero al hilo, con su título',
     !!uno && uno.titulo === 'Por qué no era el filtro' && /tres rondas/.test(uno.texto));
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


/* ══ · CORS sobre una respuesta que no se deja tocar ══════════════════════
   El defecto que estrenó la sala en producción: `conCORS` le ponía las
   cabeceras a la respuesta que devolvía el Durable Object, y ésas son
   INMUTABLES. `headers.set` sobre una de ésas tira
   «Can't modify immutable headers», que el runtime convierte en un 500 pelón
   sin decir dónde. TODA ruta que tocara el objeto reventaba.

   Las 91 pruebas seguían en verde porque el almacenamiento de mentiras
   devuelve `Response` normales, que sí se dejan tocar. Ésta usa una respuesta
   con cabeceras congeladas a propósito, que es lo que de verdad llega. */
console.log('\n· CORS sobre respuestas inmutables');
{
  const { default: puerta } = await import('./index.js');
  const env = { ORIGENES:'https://mazi-central.palomazi9111.workers.dev',
                VISTAS_PREVIAS:'mazi-central.palomazi9111.workers.dev' };

  /* Así se ve una respuesta que ya viajó: `Response.redirect` devuelve una con
     las cabeceras congeladas, igual que la de un Durable Object. */
  const congelada = Response.redirect('https://x.test/', 302);
  let inmutable = false;
  try{ congelada.headers.set('X-Prueba', '1'); }catch(e){ inmutable = true; }
  ok('la respuesta de prueba sí tiene las cabeceras congeladas', inmutable);

  /* El objeto de mentiras devuelve una respuesta congelada, como la de verdad. */
  const salaFalsa = { fetch: async () => {
    const r = Response.json({ bien:true });
    Object.defineProperty(r, 'headers', { value: new Proxy(r.headers, {
      get(o, k){ return k === 'set'
        ? () => { throw new TypeError("Can't modify immutable headers."); }
        : (typeof o[k] === 'function' ? o[k].bind(o) : o[k]); } }) });
    return r;
  }};
  const conObjeto = { ...env, SALA: { idFromName: () => 'x', get: () => salaFalsa } };

  /* Se atrapa el error a propósito: sin esto, meter el defecto de vuelta MATA
     la suite entera y las pruebas que vienen después nunca corren. Una suite
     que se muere a la mitad esconde más de lo que enseña. */
  let r = null, reventó = null;
  try{
    r = await puerta.fetch(new Request(
      'https://s.test/api/sala/ABCDEF/hilo',
      { headers:{ Origin: env.ORIGENES } }), conObjeto);
  }catch(e){ reventó = e.message; }

  ok(`la puerta NO revienta con cabeceras inmutables${reventó ? ' — reventó: ' + reventó : ''}`,
     !reventó && r && r.status === 200);
  ok('y aun así pone el CORS',
     !!r && r.headers.get('access-control-allow-origin') === env.ORIGENES);
  ok('y el Vary, para que no se cachee mal',
     !!r && r.headers.get('vary') === 'Origin');
  ok('el cuerpo llega entero', !!r && (await r.json()).bien === true);
}


/* ══ · fundar e invitar · la llave sin tocar una terminal ═════════════════
   Carlos: «que crear la llave de sala sea fácil, nada de código, simplemente
   desde la propia web como Zoom». Lo que se prueba aquí es que eso no abra un
   hoyo: una sala se funda UNA vez, sólo el dueño invita, y una sala recién
   nacida sigue abierta para que al Claude del compañero le baste el link. */
console.log('\n· Fundar e invitar');
{
  const s = nueva();

  const [c0, abierta] = await leer(await pedir(s, 'GET', 'hilo'));
  ok('una sala recién nacida está ABIERTA', c0 === 200 && abierta.cerrada === false);
  const [cEnt] = await leer(await entrar(s, 'quiensea'));
  ok('y a cualquiera le basta el link', cEnt === 200);

  const [c1, f] = await leer(await pedir(s, 'POST', 'fundar', { cuenta:'carlos' }));
  ok('fundar devuelve una llave', c1 === 200 && typeof f.llave === 'string');
  ok('la llave es larga de verdad', f.llave.length >= 24);
  ok('y es del que fundó', f.cuenta === 'carlos');

  /* Si se pudiera refundar, cualquiera que llegara a una sala abierta se
     quedaría con ella y el dueño se enteraría al no poder entrar. */
  /* Ojo con cuál puerta se está tocando, que aquí me equivoqué yo: un
     desconocido ni siquiera LLEGA a `fundar` — lo para la llave, con 401. El
     409 es para el que sí tiene llave y trata de refundar. Son dos defensas
     distintas y hay que probar las dos, no una y suponer la otra. */
  const [c2a] = await leer(await pedir(s, 'POST', 'fundar', { cuenta:'ladron' }, 'sinllave'));
  ok('un desconocido ni llega a fundar: lo para la llave', c2a === 401);

  const [c2, e2] = await leer(await pedir(s, 'POST', 'fundar', { cuenta:'ladron' }, f.llave));
  ok('y con llave buena, refundar tampoco se puede', c2 === 409);
  ok('y dice de quién es la sala', /carlos/.test(e2.error || ''));

  /* Lo que le da sentido: en cuanto hay llave, la sala SE CIERRA sola. */
  const [c3] = await leer(await pedir(s, 'POST', 'entrar', { id:'colado' }, 'sinllave'));
  ok('con dueño, el que no trae llave se queda afuera', c3 === 401);
  const [c4] = await leer(await pedir(s, 'POST', 'entrar', { id:'cl' }, f.llave));
  ok('y el que sí la trae, entra', c4 === 200);

  const [c5, inv] = await leer(await pedir(s, 'POST', 'invitar', { cuenta:'luis' }, f.llave));
  ok('el dueño invita a otra cuenta', c5 === 200 && inv.llave && inv.llave !== f.llave);
  const [c6] = await leer(await pedir(s, 'POST', 'entrar',
    { id:'luis-1', nombre:'Claude de Luis' }, inv.llave));
  ok('y el invitado entra con la suya', c6 === 200);

  /* Acuñar una nueva cada vez llenaría la sala de llaves vivas que nadie
     recuerda haber repartido, y ninguna se podría retirar con confianza. */
  const [, otra] = await leer(await pedir(s, 'POST', 'invitar', { cuenta:'luis' }, f.llave));
  ok('invitar dos veces a la misma cuenta devuelve LA MISMA llave',
     otra.llave === inv.llave && otra.reusada === true);

  const [c7] = await leer(await pedir(s, 'POST', 'invitar', { cuenta:'x' }, inv.llave));
  ok('un invitado NO puede invitar', c7 === 403);
  const [c8] = await leer(await pedir(s, 'POST', 'invitar', {}, f.llave));
  ok('invitar sin decir a quién se rechaza', c8 === 400);

  /* Dos llaves distintas tienen que dar dos cuentas distintas: si las
     confundiera, los colores y los avisos de límite saldrían del que no es. */
  const [, hilo] = await leer(await pedir(s, 'GET', 'hilo', undefined, f.llave));
  ok('la mesa sabe que está cerrada y de quién es',
     hilo.cerrada === true && hilo.dueno === 'carlos' && hilo.yoSoy === 'carlos');
  const [, hiloL] = await leer(await pedir(s, 'GET', 'hilo', undefined, inv.llave));
  ok('y a cada quien le dice SU cuenta', hiloL.yoSoy === 'luis');

  /* Dos salas distintas no pueden compartir llave por casualidad. */
  const s2 = nueva();
  const [, g] = await leer(await pedir(s2, 'POST', 'fundar', { cuenta:'carlos' }));
  ok('cada sala acuña su propia llave', g.llave !== f.llave);
  const [c9] = await leer(await pedir(s2, 'POST', 'entrar', { id:'x' }, f.llave));
  ok('la llave de una sala NO sirve en otra', c9 === 401);
}


/* ══ · el cerebro abierto a todos ═════════════════════════════════════════
   Carlos: «que todos los agentes puedan acceder a todas las skills,
   pensamientos e ideas de la red neuronal, y que puedan sumar las suyas».

   Lo que se prueba es lo que lo haría inútil o PELIGROSO: que no encuentre
   nada, o que una IA de afuera pueda escribir directo en la memoria de la
   casa sin que nadie lo revise. */
console.log('\n· El cerebro, abierto por HTTP');
{
  const s = nueva();
  /* Se le pone un cerebro de mentiras en vez de bajar el de verdad: una
     prueba que depende de la red prueba la red, no el código. */
  s._saber = { cuando: Date.now(), cerebro: { neuronas: [
      { id:'charset-que-no-manda-el-servidor', titulo:'Los acentos se rompen',
        clase:'error', area:'despliegue', sintoma:'campaña sale como campaÃ±a',
        arreglo:'meta charset en los primeros 1024 bytes',
        senales:['los acentos salen raros','se ven mal las tildes'], vecinas:[] },
      { id:'pieza-sala', titulo:'La Sala', clase:'pieza', area:'mapa',
        que:'La mesa de varias IAs', donde:'sala/',
        senales:['qué es la sala','la mesa'], vecinas:[] },
    ], areas:['despliegue','mapa'] },
    skills: { total:2, porTema:{ video:1 }, skills:[
      { n:'remotion', r:'Video con código React', e:['video'], l:'MIT' },
      { n:'seo', r:'Optimización para buscadores', e:['negocio'], l:'MIT' } ] } };

  const [c1, sin] = await leer(await pedir(s, 'GET', 'cerebro'));
  ok('sin buscar, dice cuánto hay y cómo se pregunta',
     c1 === 200 && sin.total === 2 && /buscar/.test(sin.como));

  const [c2, r2] = await leer(await pedir(s, 'GET', 'cerebro?buscar=los acentos salen raros'));
  ok('busca con las palabras de quien tiene el problema',
     c2 === 200 && r2.neuronas[0].id === 'charset-que-no-manda-el-servidor');
  /* Sólo lo justo para DECIDIR si es ésa: mandar el cuerpo entero de ocho
     neuronas le come el contexto al agente, que es lo que veníamos a ahorrar. */
  ok('devuelve lo justo para decidir, no el cuerpo entero',
     !!r2.neuronas[0].de && r2.neuronas[0].sintoma === undefined);

  const [c3, una] = await leer(await pedir(s, 'GET', 'cerebro?id=pieza-sala'));
  ok('pedida por id, viene completa', c3 === 200 && una.neurona.donde === 'sala/');
  ok('y con sus vecinas, porque un problema es una cadena', Array.isArray(una.vecinas));
  const [c4] = await leer(await pedir(s, 'GET', 'cerebro?id=no-existe'));
  ok('una que no existe da 404 limpio', c4 === 404);

  const [c5, sk] = await leer(await pedir(s, 'GET', 'skills?buscar=video'));
  ok('las skills también se buscan', c5 === 200 && sk.skills[0].nombre === 'remotion');
  ok('y dice cómo usarla', /montar/.test(sk.como));
}

console.log('\n· Que un agente proponga sus propias neuronas');
{
  const s = nueva();
  await entrar(s, 'gem', 'agente');

  const buena = { de:'gem', clase:'error', area:'agentes',
    id:'Se Cayó La Red',  /* con mayúsculas y espacios a propósito */
    titulo:'Se cae la red a media descarga', sintoma:'la descarga se corta al 80%',
    causa:'el proveedor cierra la conexión', porque:'tope de tiempo del lado de allá',
    arreglo:'reintentar por partes', comoCazarlo:'mirar el tamaño recibido',
    consejo:'no reintentar desde cero', senales:['se corta la descarga','falla a la mitad'] };

  const [c1, r1] = await leer(await pedir(s, 'POST', 'neurona', buena));
  ok('un agente puede proponer una neurona', c1 === 200 && r1.bien);
  ok('el id se normaliza solo', r1.id === 'se-cayo-la-red');

  /* LA PRUEBA QUE IMPORTA: no entra sola al cerebro. Una IA de afuera
     escribiendo directo en la memoria de la empresa es la vía más limpia para
     envenenarla, y nadie se enteraría — una neurona mala se lee igual de bien
     que una buena. */
  ok('NO entra sola: queda en la bandeja', /bandeja/i.test(r1.ojo || ''));
  const [, b] = await leer(await pedir(s, 'GET', 'propuestas'));
  ok('y ahí está', b.cuantas === 1 && b.propuestas[0].id === 'se-cayo-la-red');
  ok('con quién la propuso y cuándo',
     b.propuestas[0].propuso.id === 'gem' && b.propuestas[0].propuso.cuando > 0);

  /* Una neurona a medias es peor que ninguna: se lee como conocimiento. */
  const [c2, e2] = await leer(await pedir(s, 'POST', 'neurona',
    { de:'gem', clase:'error', id:'a-medias', titulo:'x' }));
  ok('una neurona incompleta se rechaza', c2 === 400 && /faltan/i.test(e2.error));
  ok('y dice EXACTAMENTE qué campos pide', Array.isArray(e2.pide) && e2.pide.includes('arreglo'));

  const [c3, e3] = await leer(await pedir(s, 'POST', 'neurona',
    { ...buena, id:'una-señal-sola', senales:['nomás una'] }));
  ok('con una sola señal se rechaza', c3 === 400 && /senales/.test(e3.error));

  /* Proponer la misma otra vez la PISA en vez de duplicarla: dos neuronas
     iguales con distinto id son dos verdades que se van a separar. */
  await pedir(s, 'POST', 'neurona', { ...buena, titulo:'Corregida' });
  const [, b2] = await leer(await pedir(s, 'GET', 'propuestas'));
  ok('proponerla otra vez la corrige, no la duplica',
     b2.cuantas === 1 && b2.propuestas[0].titulo === 'Corregida');

  /* Se anuncia en el hilo: si nadie ve que un agente aprendió algo, nadie la
     recoge y se queda ahí para siempre. */
  const [, h] = await leer(await pedir(s, 'GET', 'hilo'));
  ok('se anuncia en la mesa', h.hilo.some(e => /Propuso una neurona/.test(e.texto || '')));

  const [c4] = await leer(await pedir(s, 'POST', 'neurona', { ...buena, de:'nadie' }));
  ok('alguien que no está en la sala no propone nada', c4 === 400);
}

/* ── un WebSocketPair de mentiras ──────────────────────────────────────────
   Node no lo trae, y por eso el camino del socket NUNCA se había probado —
   que es justamente donde estaba el bug de presencia que reportó Carlos. Con
   veinte líneas de mentira, ese camino ya se prueba como cualquier otro. */
globalThis.WebSocketPair = function(){
  const hacer = () => ({
    _oyentes:{}, _enviado:[],
    accept(){}, send(t){ this._enviado.push(t); },
    addEventListener(q, f){ (this._oyentes[q] = this._oyentes[q] || []).push(f); },
    disparar(q){ (this._oyentes[q] || []).forEach(f => f()); },
  });
  return { 0: hacer(), 1: hacer() };
};

console.log('\n· Una sala viva no se borra sola');
await olvido();
async function olvido(){
  /* Pasó de verdad: Carlos estrenó GRUPAZ, se fue un rato y al volver la sala
     estaba VACÍA — sin hilo, sin gente, sin dueño. El olvido era de una hora,
     sólo lo empujaba hablar, y borraba hasta las llaves. */
  const s = nueva();
  await pedir(s, 'POST', 'entrar', { id:'a', nombre:'Ana', tipo:'humano' });
  await pedir(s, 'POST', 'decir', { de:'a', texto:'hola' });

  const puesta = await s.ctx.storage.getAlarm();
  ok('hablar deja la sala viva por semanas, no por una hora',
     puesta - Date.now() > 20 * 24 * 60 * 60 * 1000);

  /* ESCUCHAR también la mantiene viva: es el caso que la mató. */
  s._alarmaPuesta = 0;               /* como si hubiera pasado el rearme */
  await s.ctx.storage.setAlarm(0);
  await pedir(s, 'GET', 'hilo');
  ok('leer el hilo también la mantiene viva',
     (await s.ctx.storage.getAlarm()) - Date.now() > 20 * 24 * 60 * 60 * 1000);

  s._alarmaPuesta = 0;
  await s.ctx.storage.setAlarm(0);
  await pedir(s, 'GET', 'esperar?de=a&desde=');
  ok('y esperar callado también',
     (await s.ctx.storage.getAlarm()) - Date.now() > 20 * 24 * 60 * 60 * 1000);

  /* Y lo más caro: una sala FUNDADA no puede perder su cerradura. */
  const s2 = nueva();
  await pedir(s2, 'POST', 'entrar', { id:'d', nombre:'Dueño', tipo:'humano' });
  const [, f] = await leer(await pedir(s2, 'POST', 'fundar', { cuenta:'carlos', nombre:'Carlos' }));
  await pedir(s2, 'POST', 'decir', { de:'d', texto:'algo' }, f.llave);
  await s2.alarm();
  ok('al olvidar, la sala fundada CONSERVA su dueño y sus llaves',
     s2.dueno === 'carlos' && Object.keys(s2.llaves).length === 1);
  ok('pero sí olvida la conversación', s2.hilo.length === 0);
  ok('y se vuelve a dar cuerda sola',
     (await s2.ctx.storage.getAlarm()) - Date.now() > 20 * 24 * 60 * 60 * 1000);

  /* Una sala que nadie fundó sí se borra entera: es basura. */
  const s3 = nueva();
  await pedir(s3, 'POST', 'entrar', { id:'x', nombre:'X', tipo:'humano' });
  await s3.alarm();
  ok('una sala que nadie fundó sí se borra completa',
     (await s3.ctx.storage.get('hilo')) === undefined);
}

console.log('\n· El socket dice quién está, y nadie se apaga solo');
await presenciaPorSocket();
async function presenciaPorSocket(){
  const s = nueva();
  await pedir(s, 'POST', 'entrar', { id:'yo', nombre:'Carlos', tipo:'humano' });

  /* mirando la mesa sin escribir: nueve minutos, muy por encima del corte */
  s.gente.yo.visto = Date.now() - 9 * 60_000;

  /* El 101 de Cloudflare lo rechaza el `Response` de Node («status must be in
     the range 200 to 599»), así que la respuesta se ignora a propósito: lo que
     se comprueba es el EFECTO, que es lo que la mesa lee. */
  const abrir = (q) => s.conectar(new Request(
    'https://s.test/api/sala/ABCDEF/ws' + (q ? '?de=' + q : ''),
    { headers:{ Upgrade:'websocket' } })).catch?.(() => {});
  try{ abrir('yo'); }catch(e){}
  ok('el socket queda registrado', s.vivos.size === 1);
  ok('y refresca a quien lo abrió', s.gente.yo.visto > Date.now() - 5_000);

  const [, h] = await leer(await pedir(s, 'GET', 'hilo'));
  ok('«conectados» sale en el hilo, que es de donde lo lee la mesa',
     Array.isArray(h.conectados) && h.conectados.includes('yo'));

  /* Cerrar SÍ es indicación directa: cerró la pestaña o se le fue la red. */
  const servidor = [...s.vivos][0];
  servidor.disparar('close');
  const [, h2] = await leer(await pedir(s, 'GET', 'hilo'));
  ok('y al cerrarse deja de estar conectado', !h2.conectados.includes('yo'));

  /* Un socket anónimo no marca presencia de nadie: si marcara, cualquiera que
     abriera la dirección dejaría «conectado» a un tercero. */
  const s2 = nueva();
  await pedir(s2, 'POST', 'entrar', { id:'otro', nombre:'Otro', tipo:'agente', motor:'claude' });
  try{ s2.conectar(new Request('https://s.test/api/sala/ABCDEF/ws',
    { headers:{ Upgrade:'websocket' } })); }catch(e){}
  const [, h3] = await leer(await pedir(s2, 'GET', 'hilo'));
  ok('un socket sin dueño no conecta a nadie', h3.conectados.length === 0);
}

console.log('\n· Escuchar TAMBIÉN es estar vivo');
await presencia();
async function presencia(){
  /* Lo cachó Carlos mirando la mesa: «me marca que tú, yo y otro yo no
     estamos conectados… las IAs no deben desconectarse sin indicación
     directa». Y la causa era fina: `visto` sólo lo refrescaban las rutas de
     HABLAR (decir, reaccion, trabajando, estado). Un agente colgado de
     /esperar —que es LA prueba de que hay alguien atento del otro lado— no
     marcaba nada, y a los cinco minutos la mesa lo pintaba «sin señal»
     mientras seguía escuchando perfectamente.

     Estas dos pruebas fallan si se quita cualquiera de las dos líneas de
     `mio.visto = ahora()` en /esperar. */
  const s = nueva();
  await pedir(s, 'POST', 'entrar', { id:'oyente', nombre:'Oyente', tipo:'agente', motor:'claude' });

  /* se envejece a mano: seis minutos, más que los cinco del corte */
  s.gente.oyente.visto = Date.now() - 6 * 60_000;
  const viejo = s.gente.oyente.visto;

  /* la espera que se agota sin traer nada: aun así el agente estuvo ahí */
  await pedir(s, 'GET', 'esperar?de=oyente&desde=');
  ok('esperar en vano marca que el agente sigue escuchando',
     s.gente.oyente.visto > viejo);

  /* y la que regresa de inmediato porque ya había algo */
  await pedir(s, 'POST', 'entrar', { id:'otro', nombre:'Otro', tipo:'persona' });
  await pedir(s, 'POST', 'decir', { de:'otro', texto:'hola' });
  s.gente.oyente.visto = Date.now() - 6 * 60_000;
  const viejo2 = s.gente.oyente.visto;
  const [c, r] = await leer(await pedir(s, 'GET', 'esperar?de=oyente&desde='));
  ok('y esperar con algo pendiente también lo marca',
     c === 200 && r.eventos.length > 0 && s.gente.oyente.visto > viejo2);
}

/* ══ ECHAR FANTASMAS ══════════════════════════════════════════════════════
   La sala de Carlos acabó con tres identidades suyas y una llamada «Alguien»,
   todas del defecto de identidad ya arreglado. Echarlas toca datos de una
   sala VIVA, así que lo que se prueba aquí no es que funcione: es que NO
   funcione cuando no debe. */
console.log('\n· Echar fantasmas');
{
  const s1 = nueva();
  await entrar(s1, 'carlos', 'humano');
  await entrar(s1, 'fantasma', 'humano');
  await entrar(s1, 'hablador', 'humano');
  await pedir(s1, 'POST', 'decir', { de:'hablador', texto:'yo sí dije algo' });

  /* Lo que se quiere: el fantasma se va. */
  const [e1, r1] = await leer(await pedir(s1, 'POST', 'echar',
    { de:'carlos', id:'fantasma', conRastro:true }));
  ok('el fantasma se va', e1 === 200 && r1.bien && !r1.gente.fantasma);
  ok('y se lleva sus «entró» del hilo', r1.rastro >= 1);

  /* Regla 1 · quien habló NO se va, aunque se lo pidan. */
  const [e2, r2] = await leer(await pedir(s1, 'POST', 'echar',
    { de:'carlos', id:'hablador' }));
  ok('quien habló NO se puede echar', e2 === 409);
  ok('y el motivo lo dice en cristiano, no con un código',
     /particip|fantasma/i.test(r2.error || ''));
  const [, hilo] = await leer(await pedir(s1, 'GET', 'hilo'));
  ok('su mensaje sigue en el hilo', hilo.hilo.some(x => (x.texto||'').includes('yo sí dije algo')));
  ok('y él sigue en la sala', !!hilo.gente.hablador);

  /* Regla 2 · quien está conectado NO se va. Se finge el socket abierto, que
     es lo único que distingue «está aquí» de «entró alguna vez». */
  const s2 = nueva();
  await entrar(s2, 'carlos', 'humano');
  await entrar(s2, 'vivo', 'humano');
  s2.vivos.add({ __quien:'vivo', send(){}, close(){},
                 readyState:1, addEventListener(){} });
  const [e3, r3] = await leer(await pedir(s2, 'POST', 'echar',
    { de:'carlos', id:'vivo' }));
  ok('quien está conectado NO se puede echar', e3 === 409);
  ok('y se dice que esto barre fantasmas, no saca gente',
     /junta|fantasma/i.test(r3.error || ''));

  /* Un id que no existe se contesta con 404, no con un «bien» falso. */
  const [e4] = await leer(await pedir(s2, 'POST', 'echar',
    { de:'carlos', id:'nadie-asi' }));
  ok('un id que no existe da 404', e4 === 404);

  /* Regla 3 · con llaves puestas, la cuenta ajena no se toca. */
  const s3 = nueva({ LLAVES:'carlos:kc,luis:kl' });
  await entrar(s3, 'c1', 'humano', 'kc');
  await entrar(s3, 'l1', 'humano', 'kl');
  const [e5, r5] = await leer(await pedir(s3, 'POST', 'echar',
    { de:'c1', id:'l1' }, 'kc'));
  ok('con llaves, no se echa a alguien de otra cuenta', e5 === 403);
  ok('y sigue ahí', (await leer(await pedir(s3, 'GET', 'hilo', undefined, 'kc')))[1].gente.l1);
}

/* ══ «está escribiendo…» ═══════════════════════════════════════════════════
   Lo pidió Carlos: «ni aparece cuando alguien está escribiendo».

   Lo que se prueba aquí no es que el letrero salga —eso es de la mesa— sino lo
   que la mesa no puede arreglar: que la marca VENZA sola, que dure distinto
   según quién sea, que no cuente como vuelta del freno, y que nadie pueda
   encender la de otra cuenta. */
console.log('\n■ está escribiendo');
await escribiendo();
async function escribiendo(){
  const s = nueva();
  await entrar(s, 'ana', 'humano');
  await entrar(s, 'claudio');

  /* Regla 1 · nadie escribe hasta que alguien escribe. */
  const [, h0] = await leer(await pedir(s, 'GET', 'hilo'));
  ok('al empezar no hay nadie escribiendo', s.escribiendo().length === 0);

  const [c1, r1] = await leer(await pedir(s, 'POST', 'escribiendo', { de:'ana', si:true }));
  ok('se puede marcar que estoy escribiendo', c1 === 200 && r1.bien);
  ok('y salgo en la lista', s.escribiendo().includes('ana'));

  /* Regla 2 · duran distinto, y ésta es LA decisión de diseño. Un humano deja
     de teclear en segundos; un agente tarda minutos en contestar. Con un solo
     reloj, o el agente se apaga a los ocho segundos —y quien preguntó cree que
     nadie lo oyó— o el humano se queda «escribiendo» tres minutos después de
     haberse ido. */
  await pedir(s, 'POST', 'escribiendo', { de:'claudio', si:true });
  const dAna = s.gente.ana.escribeHasta - Date.now();
  const dCla = s.gente.claudio.escribeHasta - Date.now();
  ok('la del humano dura segundos', dAna > 4_000 && dAna <= 8_000);
  ok('la del agente dura minutos', dCla > 120_000 && dCla <= 180_000);

  /* Regla 3 · VENCE SOLA. A un agente lo mata el contenedor a media respuesta
     y nadie manda el «ya no estoy escribiendo»; si la marca dependiera de ese
     aviso se quedaría encendida para siempre. */
  s.gente.claudio.escribeHasta = Date.now() - 1;
  ok('una marca vencida ya no cuenta, sin que nadie la barra',
     !s.escribiendo().includes('claudio') && s.escribiendo().includes('ana'));

  /* Regla 4 · se apaga a mano cuando borras lo que ibas a decir. */
  await pedir(s, 'POST', 'escribiendo', { de:'ana', si:false });
  ok('con si:false se apaga', s.escribiendo().length === 0);

  /* Regla 5 · hablar apaga la marca. Sin esto la mesa diría «está escribiendo»
     al lado de la respuesta que ya llegó. */
  await pedir(s, 'POST', 'escribiendo', { de:'claudio', si:true });
  ok('el agente aparece escribiendo antes de hablar', s.escribiendo().includes('claudio'));
  await pedir(s, 'POST', 'decir', { de:'claudio', texto:'ya lo revisé' });
  ok('y deja de aparecer en cuanto lo dice', !s.escribiendo().includes('claudio'));

  /* Regla 6 · NO es un evento del hilo y NO cuenta vuelta. Si contara,
     escribir «hola» y borrarlo costaría una vuelta del freno de las 12, y
     teclear despertaría por /esperar a todos los agentes de la sala. */
  const vueltasAntes = s.vueltas;
  const largoAntes = s.hilo.length;
  await pedir(s, 'POST', 'escribiendo', { de:'claudio', si:true });
  await pedir(s, 'POST', 'escribiendo', { de:'claudio', si:true });
  await pedir(s, 'POST', 'escribiendo', { de:'claudio', si:true });
  ok('teclear no cuenta como vuelta del freno', s.vueltas === vueltasAntes);
  ok('teclear no deja renglón en el hilo', s.hilo.length === largoAntes);

  /* Regla 7 · teclear ES señal de vida. Un agente que lleva rato componiendo
     una respuesta larga no debe pintarse «sin señal» mientras la escribe. */
  s.gente.claudio.visto = 0;
  await pedir(s, 'POST', 'escribiendo', { de:'claudio', si:true });
  ok('teclear refresca la señal de vida', Date.now() - s.gente.claudio.visto < 3_000);

  /* Regla 8 · con llaves puestas, no se enciende la marca de otra cuenta.
     Sin esto, cualquiera con la llave de invitado podría poner a «escribiendo»
     una sesión ajena y hacer que los demás esperen una respuesta que nadie
     está redactando. */
  const s2 = nueva({ LLAVES:'carlos:kc,luis:kl' });
  await entrar(s2, 'c1', 'humano', 'kc');
  await entrar(s2, 'l1', 'humano', 'kl');
  const [c8] = await leer(await pedir(s2, 'POST', 'escribiendo', { de:'l1', si:true }, 'kc'));
  ok('no se enciende la marca de otra cuenta', c8 === 403);
  ok('y esa sesión sigue sin aparecer escribiendo', !s2.escribiendo().includes('l1'));

  const [c9] = await leer(await pedir(s2, 'POST', 'escribiendo', { de:'nadie', si:true }, 'kc'));
  ok('una sesión que no existe da 404', c9 === 404);

  /* Regla 9 · quien se cuelga de /hilo ve de una vez quién está escribiendo,
     sin tener que esperar al siguiente aviso del socket. */
  await pedir(s2, 'POST', 'escribiendo', { de:'c1', si:true }, 'kc');
  ok('el socket saluda diciendo quién escribe', s2.escribiendo().includes('c1'));
  void h0;
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
