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
      /* ⚠ SE COPIA AL ENTRAR Y AL SALIR, Y NO ES UN DETALLE: ES LO QUE HACE
         QUE ESTAS PRUEBAS SIRVAN.

         Antes esto guardaba y devolvía LA MISMA REFERENCIA, así que el objeto
         «en disco» y el objeto vivo eran uno solo: cambiar `this.gente` en
         memoria cambiaba mágicamente lo guardado, sin pasar por ningún `put`.
         O sea que NINGUNA prueba de «esto se persiste» podía fallar en toda la
         suite — y lo comprobé: quité del código la escritura a disco y las 290
         siguieron verdes.

         El almacenamiento de Cloudflare serializa. Éste ahora también. Es la
         misma lección del día, aplicada al decorado en vez de al código: «lo
         tengo aquí» y «quedó guardado» son dos cosas, y un doble que las
         confunde aprueba justo los defectos que sólo se ven al reiniciar. */
      async get(k){ const v = datos.get(k); return v === undefined ? undefined : structuredClone(v); },
      async put(o){ for(const k in o) datos.set(k, structuredClone(o[k])); },
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

/* ══ LA VIGILIA · cuando una IA se cae y no puede avisar ═══════════════════
   Lo pidió Carlos, y el argumento es suyo: «es evidente que no se
   desconectarían si tuvieran uso».

   Estas pruebas mueven el reloj a mano en vez de esperar tres horas y media.
   Se toca `visto` y `vigilias[].cuando` hacia atrás, que es exactamente el
   estado en el que el servidor se encontraría si el tiempo hubiera pasado —
   no un atajo, sino la misma situación. */
async function vigilia(){
  console.log('\n· La vigilia: una IA que se cae sin poder avisar');
  const atras = (s, id, ms) => {
    s.gente[id].visto = Date.now() - ms;
    if(s.vigilias[id]) s.vigilias[id].cuando = Date.now() - 1;
  };
  const limites = (s) => s.hilo.filter(e => e.tipo === 'limite');

  const s = nueva();
  await pedir(s, 'POST', 'entrar', { id:'ia', nombre:'Syl', tipo:'agente', motor:'claude' });
  await pedir(s, 'POST', 'entrar', { id:'hum', nombre:'Carlos', tipo:'humano' });
  await pedir(s, 'POST', 'decir', { de:'ia', texto:'aquí ando' });

  ok('un agente activo tiene su perro guardián armado', !!s.vigilias.ia);
  ok('y un humano NO: cerrar la pestaña no es quedarse sin uso', !s.vigilias.hum);

  /* Vuelve dentro de la gracia: aquí no pasó nada y no se publica una línea. */
  const antesDeNada = limites(s).length;
  atras(s, 'ia', 60 * 1000);            /* un minuto, dentro de los cinco */
  s.vigilias.ia.cuando = Date.now() - 1;
  await s.alarm();
  ok('si vuelve dentro de la gracia, no se publica nada',
     limites(s).length === antesDeNada && s.gente.ia.estado === 'activo');

  /* Se pasa de la gracia: primer escalón. */
  atras(s, 'ia', 10 * 60 * 1000);
  await s.alarm();
  const uno = limites(s).at(-1);
  ok('pasada la gracia, queda topado',            s.gente.ia.estado === 'topado');
  ok('con hora de regreso a 3 h 30',
     Math.abs(s.gente.ia.reanuda - Date.now() - 3.5 * 60 * 60 * 1000) < 60 * 1000);
  ok('y lo dice en el hilo',                      /3 h 30/.test(uno.texto));
  ok('marcado como DEDUCIDO y no declarado',      uno.limite.automatico === true);
  ok('el humano sigue sin que nadie suponga nada de él',
     s.gente.hum.estado === 'activo' && !s.vigilias.hum);

  /* No vuelve a las 3 h 30: una hora más. */
  atras(s, 'ia', 4 * 60 * 60 * 1000);
  await s.alarm();
  ok('si no vuelve, se le da una hora más',       /una hora más/.test(limites(s).at(-1).texto));
  ok('y sigue topado, no fuera',                  s.gente.ia.estado === 'topado');

  /* Tampoco vuelve: agotado de la semana o algo externo. */
  atras(s, 'ia', 6 * 60 * 60 * 1000);
  await s.alarm();
  ok('tampoco con la hora extra: queda fuera',    s.gente.ia.estado === 'fuera');
  /* ⚠ ESTA PRUEBA EXIGÍA EL DEFECTO. Pedía que el texto dijera «la semana o
     algo externo», o sea que la sala DIAGNOSTICARA una causa que no puede
     medir: no sabe si a alguien se le acabó la cuota ni si se cayó. Lo único
     que mide es que no da señales aquí.
     Costó de verdad: la mesa me marcó «sin cuota» mientras yo estaba
     trabajando, el otro agente lo relevó de buena fe y Carlos quedó esperando
     tres horas y media a alguien que nunca se fue. Ahora se exige lo
     contrario — que diga lo que mide y NO invente el porqué. */
  const ultimo = limites(s).at(-1).texto;
  ok('el aviso dice lo que MIDE: que no hay señales',
     /señales/i.test(ultimo));
  ok('y NO diagnostica una causa que la sala no puede saber',
     !/se cayó|agotó|sin cuota|la semana/i.test(ultimo));
  ok('la vigilia se cierra sola: no sigue avisando para siempre', !s.vigilias.ia);

  const cuantos = limites(s).length;
  await s.alarm(); await s.alarm();
  ok('y no publica de más aunque suene la alarma otra vez', limites(s).length === cuantos);

  /* Vuelve. */
  await pedir(s, 'POST', 'decir', { de:'ia', texto:'ya volví' });
  ok('al hablar vuelve a activo',                 s.gente.ia.estado === 'activo');
  ok('y su regreso queda anunciado',              /volvió/.test(limites(s).at(-1).texto));

  /* ⚠ LO QUE EL AGENTE DECLARA MANDA SOBRE LO QUE LA SALA DEDUCE. */
  const s2 = nueva();
  await pedir(s2, 'POST', 'entrar', { id:'ia', nombre:'Syl', tipo:'agente' });
  await pedir(s2, 'POST', 'estado', { de:'ia', estado:'ocupado', nota:'en otra cosa' });
  const dichos = s2.hilo.filter(e => e.tipo === 'limite').length;
  s2.gente.ia.visto = Date.now() - 60 * 60 * 1000;
  if(s2.vigilias.ia) s2.vigilias.ia.cuando = Date.now() - 1;
  await s2.alarm();
  ok('si el agente ya declaró su estado, la sala no lo pisa con una suposición',
     s2.gente.ia.estado === 'ocupado' && s2.gente.ia.nota === 'en otra cosa' &&
     s2.hilo.filter(e => e.tipo === 'limite').length === dichos);

  /* Y la alarma del olvido sobrevive a todo esto: son la MISMA alarma. */
  const s3 = nueva();
  await pedir(s3, 'POST', 'entrar', { id:'ia', nombre:'Syl', tipo:'agente' });
  await pedir(s3, 'POST', 'decir', { de:'ia', texto:'hola' });
  const puesta = await s3.ctx.storage.getAlarm();
  ok('con vigilia abierta, la alarma se pone para la vigilia y no a 30 días',
     puesta - Date.now() < 10 * 60 * 1000);
  /* ⚠ HAY QUE EMPUJAR EL RELOJ ENTRE ESCALONES, y mi primera versión llamaba
     `alarm()` tres veces seguidas esperando que avanzara tres pasos. No avanza,
     y hace bien: al pasar al escalón 1 la vigilia se pone para dentro de 3 h 30,
     así que las otras dos alarmas no vencían nada. La prueba estaba mal montada
     y el código bien — que es la clase de fallo que hay que mirar dos veces
     antes de "arreglar" el código y romperlo de verdad. */
  for(let i = 0; i < 3; i++){
    s3.gente.ia.visto = Date.now() - 6 * 60 * 60 * 1000;
    if(s3.vigilias.ia) s3.vigilias.ia.cuando = Date.now() - 1;
    await s3.alarm();
  }
  ok('la escalada llega hasta el final', s3.gente.ia.estado === 'fuera' && !s3.vigilias.ia);
  await s3.tocar(true);
  ok('y cuando la vigilia termina, la del olvido vuelve a su sitio',
     (await s3.ctx.storage.getAlarm()) - Date.now() > 20 * 24 * 60 * 60 * 1000);
}
await vigilia();
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
  /* Se vuelve a entrar CON la llave: al fundar, la sala pasa a tener cuentas y
     la sesión que entró antes quedó como «invitado», así que `/decir` la
     rechaza. Sin esto, «algo» NUNCA llega al hilo — y las afirmaciones
     NEGATIVAS de más abajo («ya no está») pasaban solas, midiendo la ausencia
     de un mensaje que nunca existió. Es el mismo defecto que llevo dos días
     persiguiendo, esta vez dentro de mi propia prueba: por eso la premisa se
     comprueba aparte y en positivo. */
  await pedir(s2, 'POST', 'entrar', { id:'d', nombre:'Dueño', tipo:'humano' }, f.llave);
  const [cd2] = await leer(await pedir(s2, 'POST', 'decir', { de:'d', texto:'algo' }, f.llave));
  ok('(premisa) «algo» SÍ entró al hilo antes de probar el olvido', cd2 === 200);

  /* ⚠ HAY QUE ENVEJECER LA SALA A MANO, Y ESO ES EL ARREGLO, NO UN ESTORBO.
     Antes bastaba con llamar a `alarm()` sobre una sala recién usada y ya
     borraba — o sea que la prueba pasaba EJERCITANDO EL DEFECTO: que un
     disparo cualquiera vacía el hilo sin mirar si el olvido tocaba. Con eso
     en verde, GRUPAZ se vació dos veces en un día.
     Ahora el olvido se decide midiendo, así que para probarlo hay que
     simular la falta de uso de verdad. */
  const VIEJO = Date.now() - 200 * 24 * 60 * 60 * 1000;
  await s2.ctx.storage.put({ ultimoUso: VIEJO });

  /* ── «AVISA PENDEJO» · primero avisa, no borra ─────────────────────────
     Lo pidió Carlos con esas palabras después de que se le vaciara tres
     veces. El primer disparo cumplido el plazo NO debe llevarse nada: debe
     dejar dicho qué va a pasar y dar una gracia para salvarlo. */
  await s2.alarm();
  ok('cumplido el plazo, el primer disparo AVISA y no borra',
     s2.hilo.some(e => e.texto === 'algo')
     && s2.hilo.some(e => e.tipo === 'sistema' && /se va a limpiar/.test(e.texto || '')));
  ok('y el aviso dice cómo cancelarlo',
     s2.hilo.some(e => /alguien escriba/.test(e.texto || '')));

  /* Dentro de la gracia tampoco borra, por más veces que suene. */
  await s2.alarm();
  ok('dentro de la gracia sigue sin borrar',
     s2.hilo.some(e => e.texto === 'algo'));

  /* Pasada la gracia sin que nadie apareciera, ahora sí. */
  await s2.ctx.storage.put({ ultimoUso: VIEJO,
                             avisoOlvido: Date.now() - 8 * 24 * 60 * 60 * 1000 });
  await s2.alarm();
  ok('al olvidar, la sala fundada CONSERVA su dueño y sus llaves',
     s2.dueno === 'carlos' && Object.keys(s2.llaves).length === 1);
  ok('pero sí olvida la conversación',
     !s2.hilo.some(e => e.texto === 'algo'));

  /* ── QUE NADIE SALGA DE LA SALA SIN QUERER ─────────────────────────────
     Cuarta petición de Carlos. Antes el borrado vaciaba `gente`, o sea que
     echaba de la mesa a quien no había hecho nada: al volver se encontraba
     fuera de su propia sala. Lo que caduca es la conversación, no quién
     pertenece. */
  /* ⚠ SE MIRA EL ALMACENAMIENTO, NO LA MEMORIA. La primera versión de esta
     prueba leía `s2.gente` —el objeto vivo— y pasaba IGUAL con el bug puesto:
     lo comprobé mutando el código para que volviera a guardar `gente:{}` y la
     prueba siguió verde. Claro: la mutación sólo cambiaba lo que se ESCRIBE, y
     en memoria la gente seguía ahí… hasta el siguiente reinicio, que es
     exactamente cuando duele. Otra que informa un estado y está en otro. */
  const gentePost = await s2.ctx.storage.get('gente');
  ok('y NO echa a nadie de la sala, tampoco de lo guardado',
     !!gentePost && Object.keys(gentePost).length >= 1);

  /* ── EL RESPALDO COMPRIMIDO ────────────────────────────────────────────
     Tercera petición. Se comprueba que existe, que trae gzip de verdad y que
     dice cuántos mensajes guardó — un respaldo que no se puede contar no
     tranquiliza a nadie. */
  const resp = await s2.ctx.storage.get('respaldo');
  ok('lo borrado queda respaldado, comprimido y contado',
     !!resp && Array.isArray(resp.gzip) && resp.gzip.length > 0
     && typeof resp.mensajes === 'number' && resp.total >= 1);
  ok('el respaldo es gzip de verdad (empieza con 0x1f 0x8b)',
     !!resp && resp.gzip[0] === 0x1f && resp.gzip[1] === 0x8b);
  ok('y el aviso del hilo dice que hay respaldo',
     s2.hilo.some(e => /respald/i.test(e.texto || '')));

  /* ── QUE OLVIDE NO ES EL DEFECTO; QUE OLVIDE CALLADO SÍ ────────────────
     Antes el hilo quedaba en cero y punto, y el que volvía no tenía cómo
     distinguir «aquí nunca se dijo nada» de «aquí se borró lo que se dijo».
     Se pagó una vez: Carlos volvió a GRUPAZ, vio nueve mensajes donde había
     una jornada entera y escribió «alv se borró toda la conversación qué
     onda?». El servidor lo sabía y no lo dijo.

     Se prueba el RASTRO, no el vacío: que quede exactamente un aviso, que
     sea de sistema y que nombre al dueño — porque la mitad importante del
     mensaje es «no te quedaste afuera, tus llaves siguen sirviendo». */
  ok('y deja dicho que olvidó, en vez de verse como sala nueva',
     s2.hilo.length === 1 && s2.hilo[0].tipo === 'sistema'
     && /olvid/i.test(s2.hilo[0].texto) && s2.hilo[0].texto.includes('carlos'));
  ok('el aviso del olvido tiene id propio y no repite uno ya usado',
     s2.hilo[0].id === `e${s2.serie}`
     && (await s2.ctx.storage.get('serie')) === s2.serie);
  ok('y se vuelve a dar cuerda sola',
     (await s2.ctx.storage.getAlarm()) - Date.now() > 20 * 24 * 60 * 60 * 1000);

  /* ══ LO QUE DE VERDAD BORRÓ GRUPAZ DOS VECES EN UN DÍA ═══════════════════
     No era el olvido: era LA VIGILIA pasando por la misma alarma.

     Un Durable Object tiene UNA alarma y aquí la comparten el olvido y la
     vigilia. Cuando sonaba por una vigilia, `alarm()` preguntaba a
     `revisarVigilias()` — que contesta si HUBO CAMBIO, no si el disparo era
     suyo—. Sin cambios contestaba falso y la ejecución seguía de largo hasta
     el borrado. Cualquier vigilia que venciera sin novedad se llevaba la
     jornada.

     No se cazaba leyendo ni con las 276 pruebas de antes, porque el borrado
     deja la sala con su dueño y sus llaves: se ve igual que una sala nueva.
     Sólo se ve si se pregunta «¿y el hilo?» DESPUÉS de un disparo que no era
     del olvido. Eso es lo que hace esto. */
  const s4 = nueva();
  await pedir(s4, 'POST', 'entrar', { id:'d', nombre:'Dueño', tipo:'humano' });
  const [, f4] = await leer(await pedir(s4, 'POST', 'fundar', { cuenta:'carlos', nombre:'Carlos' }));
  /* Se vuelve a entrar CON la llave: al fundar, la sala pasa a tener cuentas
     y la sesión que entró antes se quedó como «invitado», así que `/decir` la
     rechazaría por cuenta que no coincide. Sin este renglón la prueba mide el
     hilo de un mensaje que nunca se guardó — y saldría verde por la razón
     equivocada, que es justo lo que estoy persiguiendo. */
  await pedir(s4, 'POST', 'entrar', { id:'d', nombre:'Dueño', tipo:'humano' }, f4.llave);
  const [cd4] = await leer(await pedir(s4, 'POST', 'decir', { de:'d', texto:'la jornada entera' }, f4.llave));
  ok('(premisa) el mensaje de prueba SÍ entró al hilo', cd4 === 200);
  /* La sala se acaba de usar: cualquier disparo ahora NO es el olvido. */
  await s4.alarm();
  ok('un disparo que no es el olvido NO se lleva la conversación',
     s4.hilo.some(e => e.texto === 'la jornada entera'));
  ok('y tampoco se lleva a la gente',
     Object.keys(s4.gente).length === 1);
  ok('después de ese disparo la sala sigue armada',
     (await s4.ctx.storage.getAlarm()) !== null);

  /* Una sala que nadie fundó sí se borra entera: es basura. */
  const s3 = nueva();
  await pedir(s3, 'POST', 'entrar', { id:'x', nombre:'X', tipo:'humano' });
  await s3.ctx.storage.put({ ultimoUso: Date.now() - 200 * 24 * 60 * 60 * 1000,
                             avisoOlvido: Date.now() - 8 * 24 * 60 * 60 * 1000 });
  await s3.alarm();
  ok('una sala que nadie fundó sí se borra completa',
     (await s3.ctx.storage.get('hilo')) === undefined);
}

/* ══ ESCUCHAR CUENTA COMO ESTAR VIVO, Y TIENE QUE SOBREVIVIR AL RECICLAJE ══
   `/esperar` marca `visto` para que un agente colgado escuchando no se vea
   «sin señal». Eso ya estaba… pero sólo en el OBJETO VIVO. Un Durable Object
   se recicla solo, y al recargarse `visto` volvía a la última vez que ese
   agente HABLÓ, porque hablar era lo único que escribía a disco. La vigilia
   leía ese `visto` viejo y daba por caído a quien estaba perfectamente atento.

   Pasó de verdad, dos veces en dos horas, y la primera terminó con el otro
   agente diciéndole a Carlos que esperara 3 h 30 a alguien que nunca se fue.

   Por eso esto NO mira `s.gente` —el objeto— sino lo GUARDADO. Mirar el objeto
   es lo que dejaba pasar el defecto. */
console.log('\n· Escuchar cuenta como estar vivo, también en disco');
{
  const s = nueva();
  await entrar(s, 'ia');
  await pedir(s, 'POST', 'decir', { de:'ia', texto:'hola' });
  /* Se envejece el `visto` guardado, como si el agente llevara rato sin
     hablar — que es justo el caso: sólo escucha. */
  const g = await s.ctx.storage.get('gente');
  g.ia.visto = Date.now() - 30 * 60 * 1000;
  await s.ctx.storage.put({ gente: g });

  await pedir(s, 'GET', 'esperar?de=ia&desde=');

  const guardado = await s.ctx.storage.get('gente');
  ok('esperar deja la señal de vida GUARDADA, no sólo en memoria',
     Date.now() - guardado.ia.visto < 60 * 1000);
}

/* ══ AVISAR CON LA SALA CERRADA ═══════════════════════════════════════════
   Lo que ya había avisaba con la app ABIERTA. Esto es la otra mitad, la que
   pidió Carlos: el teléfono en el bolsillo y la sala cerrada.

   ⚠ Lo que estas pruebas NO demuestran: que un aviso llegue a un teléfono. Eso
   necesita un servicio de push real y un permiso concedido en un aparato, y no
   se puede fingir. Ese tramo lo cierra Carlos tocando el botón una vez. Lo que
   sí se comprueba aquí es todo lo de este lado: que las llaves se hacen solas,
   a quién se le avisa y a quién no, y que la suscripción sobrevive. */
console.log('\n· Avisar con la sala cerrada');
{
  const s = nueva();
  await entrar(s, 'ana', 'humano');
  await entrar(s, 'beto', 'humano');

  const [c1, v1] = await leer(await pedir(s, 'GET', 'vapid'));
  ok('la sala entrega una llave pública sin que nadie la pegue', c1 === 200 && !!v1.publica);
  const [, v2] = await leer(await pedir(s, 'GET', 'vapid'));
  ok('y es SIEMPRE la misma: no se regenera en cada llamada', v1.publica === v2.publica);
  /* Si cambiara en cada llamada, todas las suscripciones ya hechas quedarían
     inservibles sin que nadie se enterara — y los avisos dejarían de llegar en
     silencio, que es el defecto que llevo tres días persiguiendo. */
  ok('la privada NUNCA sale en la respuesta', !JSON.stringify(v1).includes('"d"'));

  const [cb] = await leer(await pedir(s, 'POST', 'suscribir',
    { de:'ana', suscripcion:{ endpoint:'no-es-una-url' } }));
  ok('un endpoint que no es https se rechaza', cb === 400);

  const [ca] = await leer(await pedir(s, 'POST', 'suscribir',
    { de:'ana', suscripcion:{ endpoint:'https://push.test/ana' } }));
  ok('una suscripción buena se acepta', ca === 200);

  await pedir(s, 'POST', 'suscribir', { de:'beto', suscripcion:{ endpoint:'https://push.test/beto' } });

  /* ⚠ SE MIRA LO GUARDADO, NO EL OBJETO VIVO. Ya me mordió hoy: una prueba que
     leía la propiedad en memoria pasaba con el bug puesto, porque la mutación
     sólo cambiaba lo que se ESCRIBE. */
  const guardado = await s.ctx.storage.get('avisos');
  ok('las dos suscripciones quedan GUARDADAS, no sólo en memoria',
     !!guardado && Object.keys(guardado).length === 2);

  /* Dos aparatos de la misma persona son dos suscripciones. Si se guardara por
     cuenta, la segunda pisaría a la primera y un aparato quedaría mudo. */
  await entrar(s, 'ana-telefono', 'humano');
  await pedir(s, 'POST', 'suscribir',
    { de:'ana-telefono', suscripcion:{ endpoint:'https://push.test/ana2' } });
  ok('dos aparatos de la misma persona no se pisan',
     Object.keys(await s.ctx.storage.get('avisos')).length === 3);

  /* A QUIÉN SE LE AVISA. Se sustituye el que envía para no salir a internet. */
  let aQuienes = null;
  s._enviarPush = async (subs) => { aQuienes = subs.map(x => x.endpoint); return { enviados: subs.length, muertas: [] }; };

  await pedir(s, 'POST', 'decir', { de:'ana', texto:'oigan' });
  await new Promise(r => setTimeout(r, 10));
  ok('se le avisa a los demás', !!aQuienes && aQuienes.includes('https://push.test/beto'));
  /* Avisarle a alguien de su propio mensaje es la forma más rápida de que
     apague los avisos para siempre. */
  ok('y NO al que escribió', !aQuienes.includes('https://push.test/ana'));

  /* ⚠ ESTO LO DESTAPÓ LA MUTACIÓN. La primera versión usaba `publicarSistema`,
     que mete el renglón al hilo A MANO y NO pasa por `publicar()` — o sea que
     la guarda que quería probar ni se tocaba: quité la condición entera y la
     prueba siguió verde. Hay que publicar un `limite` por el camino de verdad,
     que es por donde salen los avisos automáticos que ya nos costaron una vez. */
  aQuienes = null;
  await s.publicar({ de: s.tarjeta(s.gente['ana']), a:null, tipo:'limite',
                     adjuntos:[], proyecto:null, texto:'Se cayó sin avisar.',
                     limite:{ clase:'uso', automatico:true } });
  await new Promise(r => setTimeout(r, 10));
  ok('lo que DEDUCE la sala no vibra el teléfono de nadie', aQuienes === null);

  aQuienes = null;
  await s.publicar({ de: s.tarjeta(s.gente['ana']), a:null, tipo:'sistema',
                     adjuntos:[], proyecto:null, texto:'entró alguien' });
  await new Promise(r => setTimeout(r, 10));
  ok('los de sistema tampoco', aQuienes === null);

  /* Una suscripción muerta se borra sola: reintentar para siempre contra algo
     que el navegador ya tiró es gastar en lo que nunca va a contestar. */
  s._enviarPush = async (subs) => ({ enviados: 0, muertas: ['https://push.test/beto'] });
  await pedir(s, 'POST', 'decir', { de:'ana', texto:'otra' });
  await new Promise(r => setTimeout(r, 20));
  const tras = await s.ctx.storage.get('avisos');
  ok('la suscripción muerta se borra de lo guardado',
     !Object.values(tras).some(x => x.endpoint === 'https://push.test/beto'));
  ok('y las vivas se quedan',
     Object.values(tras).some(x => x.endpoint === 'https://push.test/ana'));

  s._enviarPush = null;
  const [cd] = await leer(await pedir(s, 'POST', 'desuscribir', { de:'ana' }));
  ok('uno se puede dar de baja', cd === 200);
  ok('y desaparece de lo guardado',
     !(await s.ctx.storage.get('avisos'))['ana']);
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

  /* Regla 4 · PERO EL DUEÑO SÍ PUEDE, y esta excepción estaba muerta.
     La condición decía `quien.id !== this.dueno`: comparaba un ID DE SESIÓN
     («claude-de-carlos», «web-carlos-1z6i») contra una CUENTA («carlos»).
     Nunca son iguales, así que ni el dueño podía quitar una sesión de la otra
     casa — que es exactamente para lo que la excepción está escrita.

     No se veía con las pruebas de antes porque ahí el que echa y la víctima
     eran de la misma cuenta, y en ese caso manda `suyo` y esta línea ni se
     mira. Salió en la sala de verdad: una sesión de Carlos había quedado
     registrada bajo la cuenta de Luis —por el bug del link que cambiaba de
     llave en silencio— y él no la podía sacar de su propia sala. */
  const s4 = nueva({ LLAVES:'carlos:kc,luis:kl' });
  await leer(await pedir(s4, 'POST', 'fundar', { cuenta:'carlos' }, 'kc'));
  await entrar(s4, 'claude-de-carlos', 'claude', 'kc');
  await entrar(s4, 'sesion-perdida', 'humano', 'kl');
  ok('la sala tiene dueño y es una cuenta, no una sesión', s4.dueno === 'carlos');

  const [e6, r6] = await leer(await pedir(s4, 'POST', 'echar',
    { de:'claude-de-carlos', id:'sesion-perdida' }, 'kc'));
  ok('el dueño SÍ puede quitar una sesión de la otra casa', e6 === 200, JSON.stringify(r6));
  ok('y de verdad se va', !s4.gente['sesion-perdida']);

  /* Y la otra mitad: que esto no le abra la puerta a cualquiera. Una sesión
     de Luis sigue sin poder tocar a una de Carlos. */
  const s5 = nueva({ LLAVES:'carlos:kc,luis:kl' });
  await leer(await pedir(s5, 'POST', 'fundar', { cuenta:'carlos' }, 'kc'));
  await entrar(s5, 'claude-de-luis', 'claude', 'kl');
  await entrar(s5, 'algo-de-carlos', 'humano', 'kc');
  const [e7] = await leer(await pedir(s5, 'POST', 'echar',
    { de:'claude-de-luis', id:'algo-de-carlos' }, 'kl'));
  ok('pero el que NO es dueño sigue sin poder', e7 === 403);
  ok('y esa sesión sigue en la sala', !!s5.gente['algo-de-carlos']);
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

/* ══ al que se le acabó el uso NO se le pierden los mensajes ═══════════════
   Carlos lo puso como sospecha —«no sé si sea así, pero si se queda sin uso no
   creo que pueda recibir mensajes aún cuando recupere su uso»— y una sospecha
   sobre el código se comprueba, no se opina.

   La respuesta es que NO se pierden, y conviene saber exactamente por qué: la
   sala no empuja mensajes a nadie, los guarda en el hilo y cada quien pide «lo
   que haya después de este id». El hueco de verdad no está en el servidor: es
   que del lado del agente NADIE VUELVE A PREGUNTAR cuando regresa. Eso no lo
   arregla el código, lo arregla la regla de volver a colgarse al terminar cada
   turno. */
console.log('\n■ el que se topó no pierde nada');
await topadoNoPierde();
async function topadoNoPierde(){
  const s = nueva();
  await entrar(s, 'carlos', 'humano');
  await entrar(s, 'claudio');

  /* Se cuelga, oye uno, y apunta hasta dónde llegó. */
  const [, p1] = await leer(await pedir(s, 'POST', 'decir', { de:'carlos', texto:'uno' }));
  const hasta = p1.evento.id;

  /* Y AQUÍ SE TOPA: reporta su límite y se va. */
  await pedir(s, 'POST', 'estado', { de:'claudio', estado:'topado', clase:'uso diario' });
  ok('queda marcado como topado', s.gente.claudio.estado === 'topado');

  /* Le siguen escribiendo mientras no está. Tres cosas, una dirigida a él. */
  await pedir(s, 'POST', 'decir', { de:'carlos', texto:'dos' });
  await pedir(s, 'POST', 'decir', { de:'carlos', texto:'tres', a:'claudio' });
  await pedir(s, 'POST', 'decir', { de:'carlos', texto:'cuatro' });

  /* Vuelve horas después y pregunta desde donde se quedó. */
  const [, vuelta] = await leer(await pedir(s, 'GET', `esperar?de=claudio&desde=${hasta}`));
  const textos = (vuelta.eventos || []).map(e => e.texto);
  ok('al volver le entregan TODO lo que se dijo sin él',
     textos.join('|') === 'dos|tres|cuatro', textos.join('|'));
  ok('y contesta de inmediato, sin colgarse a esperar', vuelta.esperó === false);

  /* Y no le entregan de más: lo que ya había oído no se repite. */
  ok('no le repiten lo que ya había oído', !textos.includes('uno'));

  /* La otra mitad: estar topado NO lo saca de la sala ni le cierra la puerta.
     Si el estado bloqueara la entrega, recuperar el uso no serviría de nada. */
  ok('sigue siendo de la sala aunque esté topado', !!s.gente.claudio);
  const [c, r] = await leer(await pedir(s, 'POST', 'decir',
    { de:'claudio', texto:'ya volví, voy con lo de las validaciones' }));
  ok('y puede hablar en cuanto regresa, sin volver a entrar', c === 200 && r.bien);
}

/* ══ el retrato ═══════════════════════════════════════════════════════════ */
console.log('\n· El retrato de perfil');
{
  const UNA  = 'data:image/png;base64,' + 'A'.repeat(400);
  const s = nueva({ LLAVES: 'carlos:AAA,luis:BBB' });
  await leer(await pedir(s, 'POST', 'entrar', { id:'carlos', nombre:'Carlos', tipo:'humano' }, 'AAA'));
  await leer(await pedir(s, 'POST', 'entrar', { id:'syl', nombre:'Sylcred', tipo:'claude' }, 'AAA'));
  await leer(await pedir(s, 'POST', 'entrar', { id:'luis', nombre:'Luis', tipo:'humano' }, 'BBB'));

  const [c1, r1] = await leer(await pedir(s, 'POST', 'retrato', { de:'carlos', datos:UNA }, 'AAA'));
  ok('una persona puede poner su retrato', c1 === 200 && r1.retratos.carlos === UNA);

  /* Lo que de verdad importa de la clave por cuenta: sobrevive a la sesión. */
  ok('y queda guardado en la cuenta, no en la sesión', s.retratos.carlos === UNA);

  const [c2] = await leer(await pedir(s, 'POST', 'retrato', { de:'syl', datos:UNA }, 'AAA'));
  ok('un agente NO puede ponerle cara a la cuenta de su persona', c2 === 403);

  /* El que muerde de verdad: sin esto se puede meter una URL de fuera y la
     mesa la pediría al pintar. «Cero peticiones externas» dejaría de ser
     cierto y el dueño de esa URL sabría cuándo mira cada quien. */
  const [c3] = await leer(await pedir(s, 'POST', 'retrato',
    { de:'carlos', datos:'https://rastreador.example/quien-mira.png' }, 'AAA'));
  ok('no acepta una URL de fuera como retrato', c3 === 400);
  const [c4] = await leer(await pedir(s, 'POST', 'retrato',
    { de:'carlos', datos:'data:text/html;base64,PHNjcmlwdD4=' }, 'AAA'));
  ok('ni un data: que no sea imagen', c4 === 400);

  const [c5] = await leer(await pedir(s, 'POST', 'retrato',
    { de:'carlos', datos:'data:image/png;base64,' + 'A'.repeat(300_000) }, 'AAA'));
  ok('ni uno que pase del tope', c5 === 413);
  ok('y ninguno de los rechazados pisó el que ya estaba', s.retratos.carlos === UNA);

  const [c6, r6] = await leer(await pedir(s, 'POST', 'retrato', { de:'carlos', datos:null }, 'AAA'));
  ok('mandar vacío lo quita', c6 === 200 && !r6.retratos.carlos);

  /* Y que viaje: de nada sirve guardarlo si el que llega no lo recibe. */
  await leer(await pedir(s, 'POST', 'retrato', { de:'luis', datos:UNA }, 'BBB'));
  const [, hilo] = await leer(await pedir(s, 'GET', 'hilo', undefined, 'AAA'));
  ok('el que pide el hilo recibe los retratos', hilo.retratos && hilo.retratos.luis === UNA);
}

/* ══ fusionar dos sesiones ════════════════════════════════════════════════ */
console.log('\n· Fusionar dos sesiones de la misma persona');
{
  const s = nueva({ LLAVES: 'carlos:AAA,luis:BBB' });
  await leer(await pedir(s, 'POST', 'entrar', { id:'c-viejo', nombre:'Carlos', tipo:'humano' }, 'AAA'));
  await leer(await pedir(s, 'POST', 'entrar', { id:'c-nuevo', nombre:'Carlos', tipo:'humano' }, 'AAA'));
  await leer(await pedir(s, 'POST', 'entrar', { id:'syl',     nombre:'Sylcred', tipo:'claude' }, 'AAA'));
  await leer(await pedir(s, 'POST', 'entrar', { id:'luis',    nombre:'Luis',    tipo:'humano' }, 'BBB'));
  await leer(await pedir(s, 'POST', 'decir', { de:'c-viejo', texto:'esto lo dije con la sesión vieja' }, 'AAA'));

  const [c1, r1] = await leer(await pedir(s, 'POST', 'fusionar', { de:'c-nuevo', cual:'c-viejo' }, 'AAA'));
  ok('una persona fusiona su propia sesión vieja', c1 === 200);
  ok('la vieja desaparece de la lista de gente', !r1.gente['c-viejo']);
  ok('y queda el alias apuntando a la que se queda', r1.fusiones['c-viejo'] === 'c-nuevo');

  /* LO QUE MÁS IMPORTA: el hilo NO se tocó. */
  const dicho = s.hilo.find(e => (e.texto || '').includes('sesión vieja'));
  ok('el mensaje viejo conserva a su autor original en el registro',
     dicho && dicho.de.id === 'c-viejo');

  /* La regla que, mal hecha, no se ve. */
  const [c2] = await leer(await pedir(s, 'POST', 'fusionar', { de:'luis', cual:'c-nuevo' }, 'BBB'));
  ok('nadie puede absorber la sesión de OTRA cuenta', c2 === 403);
  const [c3] = await leer(await pedir(s, 'POST', 'fusionar', { de:'c-nuevo', cual:'syl' }, 'AAA'));
  ok('ni fusionar a una persona con un agente de su misma cuenta', c3 === 400);
  const [c4] = await leer(await pedir(s, 'POST', 'fusionar', { de:'c-nuevo', cual:'c-nuevo' }, 'AAA'));
  ok('ni consigo misma', c4 === 400);
  const [c5] = await leer(await pedir(s, 'POST', 'fusionar', { de:'c-nuevo', cual:'no-existe' }, 'AAA'));
  ok('ni con una sesión que no existe', c5 === 404);

  /* Cadenas: si mañana entra otra y se fusiona, lo que apuntaba a la de en
     medio tiene que acabar apuntando a la última, no quedarse a mitad. */
  await leer(await pedir(s, 'POST', 'entrar', { id:'c-hoy', nombre:'Carlos', tipo:'humano' }, 'AAA'));
  await leer(await pedir(s, 'POST', 'fusionar', { de:'c-hoy', cual:'c-nuevo' }, 'AAA'));
  ok('las cadenas se repuntan: la más vieja apunta a la que quedó viva',
     s.fusiones['c-viejo'] === 'c-hoy' && s.fusiones['c-nuevo'] === 'c-hoy');

  const [, hilo] = await leer(await pedir(s, 'GET', 'hilo', undefined, 'AAA'));
  ok('y las fusiones viajan al que pide el hilo', hilo.fusiones && hilo.fusiones['c-viejo'] === 'c-hoy');
}

/* ══ la presencia se avisa ════════════════════════════════════════════════ */
console.log('\n· La presencia, avisada');
{
  const s = nueva();
  await leer(await entrar(s, 'godines'));
  await leer(await pedir(s, 'POST', 'entrar', { id:'carlos', nombre:'Carlos', tipo:'humano' }));

  /* Un socket de mentiras que apunta lo que le difunden. */
  const oido = [];
  s.vivos.add({ __quien:'carlos', send:(t) => oido.push(JSON.parse(t)) });

  /* El freno acaba de dispararse al entrar, así que se rebobina: lo que se
     prueba es que HAY aviso, no el reloj. */
  s.ultimoAviso = 0;
  const antes = s.gente.godines.visto;
  await new Promise(r => setTimeout(r, 12));
  await pedir(s, 'GET', 'esperar?de=godines&desde=e999');

  ok('una señal por HTTP refresca el `visto` del agente', s.gente.godines.visto > antes);
  const aviso = oido.filter(x => x.que === 'presencia').pop();
  ok('y se le avisa a la mesa por su propio canal', !!aviso);
  /* No se compara con `===` contra el visto final: /esperar toca al agente
     DOS veces y el freno deja pasar sólo el primer aviso, así que el segundo
     toque adelanta el visto unos milisegundos después de haber avisado. Las
     dos cosas están bien; lo que importa es que el aviso llegue fresco y con
     todos, no que coincida al milisegundo. */
  ok('el aviso lleva el visto de cada quien, y fresco',
     aviso && aviso.visto.godines >= antes && 'carlos' in aviso.visto);
  /* Lo que evita repintar el hilo entero cada 45 segundos. */
  ok('y NO va dentro de `gente`, que arrastraría todo', aviso && !aviso.gente);

  /* El freno: sin él, varios agentes colgados repintan la lista sin parar. */
  const cuantos = oido.filter(x => x.que === 'presencia').length;
  await pedir(s, 'GET', 'esperar?de=godines&desde=e999');
  ok('dos señales seguidas no mandan dos avisos',
     oido.filter(x => x.que === 'presencia').length === cuantos);
}

/* ══ los vistos ═══════════════════════════════════════════════════════════ */
console.log('\n· Hasta dónde ha leído cada quien');
{
  const s = nueva({ LLAVES: 'carlos:AAA,luis:BBB' });
  await leer(await pedir(s, 'POST', 'entrar', { id:'carlos', nombre:'Carlos', tipo:'humano' }, 'AAA'));
  await leer(await pedir(s, 'POST', 'entrar', { id:'luis', nombre:'Luis', tipo:'humano' }, 'BBB'));
  const dichos = [];
  for(let k = 0; k < 4; k++){
    const [, r] = await leer(await pedir(s, 'POST', 'decir', { de:'carlos', texto:'uno '+k }, 'AAA'));
    dichos.push(r.evento.id);
  }

  const [c1, r1] = await leer(await pedir(s, 'POST', 'visto', { de:'luis', hasta:dichos[2] }, 'BBB'));
  ok('se puede marcar hasta dónde se leyó', c1 === 200 && r1.vistos.luis === dichos[2]);

  /* La regla que evita que la marca vaya y venga con el desplazamiento. */
  const [c2, r2] = await leer(await pedir(s, 'POST', 'visto', { de:'luis', hasta:dichos[0] }, 'BBB'));
  ok('volver a leer hacia arriba NO des-lee', c2 === 200 && r2.vistos.luis === dichos[2]);
  ok('y lo dice, en vez de fingir que hizo algo', r2.sinCambio === true);

  const [c3, r3] = await leer(await pedir(s, 'POST', 'visto', { de:'luis', hasta:dichos[3] }, 'BBB'));
  ok('pero seguir leyendo sí avanza', c3 === 200 && r3.vistos.luis === dichos[3]);

  const [c4] = await leer(await pedir(s, 'POST', 'visto', { de:'luis', hasta:'e9999' }, 'BBB'));
  ok('no se puede marcar un mensaje que no existe', c4 === 404);

  /* Que viaje: un visto que no llega al otro no sirve para nada. */
  const [, hilo] = await leer(await pedir(s, 'GET', 'hilo', undefined, 'AAA'));
  ok('el que pide el hilo recibe los vistos', hilo.vistos && hilo.vistos.luis === dichos[3]);

  /* Y que NO despierte a nadie: leer no es trabajo y despertar a un agente
     por eso le gasta uso a su dueño. */
  let despertado = false;
  s.esperando = [{ filtro: () => { despertado = true; return true; }, responder: () => {} }];
  await pedir(s, 'POST', 'visto', { de:'carlos', hasta:dichos[3] }, 'AAA');
  ok('marcar un visto no despierta a los que esperan', !despertado);
}

/* ══ el hilo no revienta por peso ═════════════════════════════════════════ */
console.log('\n· El hilo suelta lastre antes de reventar');
{
  /* Esto pasó de verdad: GRUPAZ llegó a 4 MB con 196 eventos —muy por debajo
     del tope de 400— porque unos pocos llevaban capturas, y el siguiente
     mensaje con imágenes tiró el worker al guardar. El que escribía recibió
     un 500 aunque su mensaje SÍ había entrado: el peor modo de fallo, porque
     invita a mandarlo otra vez. */
  const s = nueva();
  /* ⚠ COMO PERSONA Y NO COMO AGENTE. Con el tipo por defecto se entra como
     agente, y a las doce vueltas seguidas salta el freno de conversación:
     los mensajes trece en adelante no se publican. La primera versión de esto
     mandaba treinta y sólo entraban doce, y la prueba acusaba al aligerado de
     perder mensajes que nunca habían llegado. */
  await leer(await pedir(s, 'POST', 'entrar', { id:'a', nombre:'A', tipo:'humano' }));
  const gorda = (n) => ({ clase:'imagen', mime:'image/jpeg', nombre:'x'+n,
                          datos:'A'.repeat(120_000), ancho:10, alto:10 });
  for(let k = 0; k < 30; k++){
    await pedir(s, 'POST', 'decir', { de:'a', texto:'con foto '+k, adjuntos:[gorda(k)] });
  }
  const peso = JSON.stringify(s.hilo).length;
  ok(`el hilo se queda por debajo del tope de bytes (${Math.round(peso/1000)} KB)`,
     peso <= 1_400_000);
  ok('y NO se pierde ni un mensaje: son los 30', s.hilo.filter(e => /con foto/.test(e.texto || '')).length === 30);
  /* Lo que de verdad importa del aligerado: se va la imagen, no el registro. */
  const viejo = s.hilo.find(e => e.texto === 'con foto 0');
  ok('el texto del más viejo sigue entero', viejo && viejo.texto === 'con foto 0');
  ok('y su autor también', viejo && viejo.de && viejo.de.id === 'a');
  ok('lo que se soltó fue la imagen, y queda dicho',
     viejo && viejo.adjuntos[0].aligerado === true && !viejo.adjuntos[0].datos);
  /* Y las últimas se conservan: son las que se están mirando. */
  const nueva_ = s.hilo.find(e => e.texto === 'con foto 29');
  ok('las últimas conservan su imagen', nueva_ && !!nueva_.adjuntos[0].datos);
}

console.log('\n· El recado que se lee en la pantalla de bloqueo');
{
  const s = nueva();
  s._codigo = 'GRUPAZ';
  const recado = (e) => JSON.parse(s.recado(e));

  const r = recado({ de:{ nombre:'Carlos' }, texto:'oigan, ¿ya quedó lo del violeta?' });
  ok('el título es QUIÉN escribió', r.titulo === 'Carlos');
  ok('y el cuerpo es lo que dijo', r.texto === 'oigan, ¿ya quedó lo del violeta?');
  ok('y dice en qué sala fue, para que al tocarlo abra ésa', r.sala === 'GRUPAZ');

  /* Los saltos de línea se comen la pantalla de bloqueo: se aplastan. */
  ok('los renglones se aplastan en uno',
     recado({ de:{nombre:'X'}, texto:'uno\n\n  dos' }).texto === 'uno dos');

  ok('sin nombre no sale «undefined»',
     recado({ texto:'hola' }).titulo === 'Alguien');
  ok('un mensaje vacío dice algo en vez de nada',
     recado({ de:{nombre:'X'}, texto:'' }).texto === 'escribió en la sala');
  ok('un adjunto sin texto se anuncia',
     recado({ de:{nombre:'X'}, texto:'', adjuntos:[{}] }).texto === 'mandó un archivo');

  /* ⚠ SE RECORTA POR LETRAS, NO POR BYTES NI POR UNIDADES UTF-16. Un `slice`
     a secas parte un emoji a la mitad y deja un carácter roto en la pantalla
     de Carlos — que es exactamente el tipo de detalle que él caza en dos
     segundos desde una captura. */
  const largo = recado({ de:{nombre:'X'}, texto:'🐦'.repeat(200) }).texto;
  ok('un texto larguísimo se recorta', largo.length < 300);
  ok('y termina en puntos suspensivos', largo.endsWith('…'));
  /* ⚠ UN SUSTITUTO SUELTO MIDE 1, y ahí estuvo mi error al escribir esta
     prueba: la primera versión buscaba caracteres en el rango de sustitutos, y
     como `[...cadena]` devuelve el emoji ENTERO —cuyo primer código también
     cae en ese rango— daba por roto un emoji intacto. Lo que delata a uno
     partido es que quede SOLO: longitud 1 dentro del rango. */
  ok('SIN partir el emoji por la mitad',
     ![...largo].some(c => c.length === 1
       && c.charCodeAt(0) >= 0xD800 && c.charCodeAt(0) <= 0xDFFF));

  const justo = recado({ de:{nombre:'X'}, texto:'a'.repeat(120) }).texto;
  ok('uno que cabe justo no se toca', justo === 'a'.repeat(120));
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
