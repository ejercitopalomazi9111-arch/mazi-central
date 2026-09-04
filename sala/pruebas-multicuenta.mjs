/* ══════════════════════════════════════════════════════════════════════════
   VARIAS CUENTAS DE CLAUDE EN UNA MISMA SALA, Y SUS SUBAGENTES
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «asegúrate de que puedan haber varias cuentas de claude en una misma
   sala y sus sub agentes tmb».

   Es una comprobación, no una funcionalidad nueva: la mesa ya reparte figura
   por modelo, color por cuenta y matiz por sesión. Pero «ya está» sin prueba
   no vale, y este defecto es de los que NO se ven leyendo: el código puede
   estar impecable y aun así dos agentes salir idénticos en pantalla, porque
   lo que falla es el reparto de valores, no la lógica.

   Corre contra la clase `Sala` directamente, sin red y sin Cloudflare — la
   misma que corre allá. Los ocho de identidad (`pruebas-identidad.mjs`) miran
   la puerta; éste mira lo que ve la mesa.

   Cómo se corre:  node sala/pruebas-multicuenta.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { Sala } from './servidor/sala.js';

let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra ? '\n      ' + extra : '')); }
};

/* El mismo contexto de mentiras que usa `servidor/pruebas.mjs`. Se copia y
   no se importa porque aquél es un guión que corre solo al importarlo: traerlo
   aquí correría sus 171 pruebas otra vez antes de empezar las mías. */
function hacerCtx(){
  const datos = new Map();
  return {
    storage: {
      async get(k){ return datos.get(k); },
      async put(o){ for(const k in o) datos.set(k, o[k]); },
      async deleteAll(){ datos.clear(); },
      async setAlarm(x){ datos.set('__alarma', x); },
      async getAlarm(){ return datos.get('__alarma') ?? null; },
    },
    blockConcurrencyWhile: (fn) => fn(),
  };
}
const nueva = () => new Sala(hacerCtx(), { ESPERA_MS: 250 });
const pedir = (s, metodo, ruta, cuerpo) => s.fetch(new Request(
  'https://s.test/api/sala/ABCDEF/' + ruta,
  { method: metodo,
    headers: { 'content-type':'application/json', 'X-Llave':'x' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined }));

/* ⚠️ LA CUENTA NO LA DICE EL AGENTE: LA DICE SU LLAVE.
   Esto se descubrió escribiendo esta prueba, y es el hallazgo que importa.
   `/entrar` acepta un campo `cuenta` y lo IGNORA: la cuenta sale de `X-Llave`
   contra el secreto `LLAVES`. Está bien que sea así —si el agente pudiera
   declarar su cuenta, cualquiera diría ser de Carlos y el color dejaría de
   significar algo—, pero tiene una consecuencia que hay que decir:

   SIN `LLAVES` CONFIGURADO, TODOS SON «invitado» Y COMPARTEN COLOR. La sala
   sigue funcionando y las sesiones se distinguen por el matiz y el anillo,
   pero «el mío morado y el de Luis naranja» NO pasa hasta que el worker tenga
   `wrangler secret put LLAVES` con `carlos:…,luis:…`.

   Por eso esto se prueba de las dos formas: con llaves y sin ellas. */
const conLlaves = (llaves, colores) => new Sala(hacerCtx(),
  { ESPERA_MS:250, LLAVES: llaves, COLORES: colores || '' });
const pedirCon = (s, metodo, ruta, cuerpo, llave) => s.fetch(new Request(
  'https://s.test/api/sala/ABCDEF/' + ruta,
  { method: metodo,
    headers: { 'content-type':'application/json', 'X-Llave': llave },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined }));

/* ── 1 · CON LLAVES: cuatro cuentas, siete sesiones, tres subagentes ────── */
console.log('\n── con llaves · cuatro cuentas, siete sesiones, tres subagentes ──');
{
  const s = conLlaves('carlos:kc,luis:kl,karen:kk', 'carlos:#AC27FF,luis:#FF7A18');
  const entra = (llave, id, nombre, extra = {}) =>
    pedirCon(s, 'POST', 'entrar', { id, nombre, tipo:'claude', ...extra }, llave);

  await entra('kc', 'carlos', 'Carlos', { tipo:'humano' });
  await entra('kl', 'luis',   'Luis',   { tipo:'humano' });
  await entra('kc', 'cl-c1', 'Claude de Carlos',   { motor:'claude-opus-5' });
  await entra('kc', 'cl-c2', 'Claude de Carlos 2', { motor:'claude-opus-5' });
  await entra('kl', 'cl-l1', 'Claude de Luis',     { motor:'claude-sonnet-5' });
  await entra('kl', 'cl-l2', 'Claude de Luis 2',   { motor:'claude-opus-5' });
  await entra('kk', 'gem',   'Gemini de Karen',    { motor:'gemini-3-pro' });
  /* Los subagentes: cada uno cuelga de una sesión, y de cuentas distintas. */
  await entra('kc', 'sub-c1a', 'Explorador de cl-c1', { padre:'cl-c1' });
  await entra('kc', 'sub-c1b', 'Revisor de cl-c1',    { padre:'cl-c1' });
  await entra('kl', 'sub-l1a', 'Explorador de cl-l1', { padre:'cl-l1' });

  const por = (await (await pedirCon(s, 'GET', 'hilo', null, 'kc')).json()).gente;
  const todos = Object.values(por);
  ok('los diez están adentro', todos.length === 10,
     todos.length + ': ' + todos.map(x => x.id).join(','));

  /* Que la llave mande, no el campo. */
  ok('la cuenta sale de la llave, no de lo que diga el agente',
     por['cl-c1'].cuenta === 'carlos' && por['cl-l1'].cuenta === 'luis' &&
     por['gem'].cuenta === 'karen',
     [por['cl-c1'].cuenta, por['cl-l1'].cuenta, por['gem'].cuenta].join(','));

  /* 1 · EL COLOR DICE DE QUIÉN ES. Si dos cuentas comparten color, la mesa
     miente sobre lo que más importa: de quién es el saldo que se gasta. */
  const colorPorCuenta = {}; const mezclados = [];
  for(const p of todos){
    if(colorPorCuenta[p.cuenta] && colorPorCuenta[p.cuenta] !== p.color)
      mezclados.push(p.id + ' rompe el color de ' + p.cuenta);
    colorPorCuenta[p.cuenta] = p.color;
  }
  ok('cada cuenta tiene UN color, el mismo para todas sus sesiones',
     mezclados.length === 0, mezclados.join(' · '));
  ok('y las tres cuentas tienen colores distintos',
     new Set(Object.values(colorPorCuenta)).size === Object.keys(colorPorCuenta).length,
     JSON.stringify(colorPorCuenta));
  /* Lo que pidió Carlos textualmente: «mi claude morado, el de Luis naranja». */
  ok('el de Carlos sale morado y el de Luis naranja, como los configuró',
     por['cl-c1'].color === '#AC27FF' && por['cl-l1'].color === '#FF7A18',
     por['cl-c1'].color + ' · ' + por['cl-l1'].color);

  /* 2 · EL MATIZ DISTINGUE SESIONES DE LA MISMA CUENTA. Dos Claude de Carlos
     con el mismo color y el mismo matiz son gemelos: en el hilo no se sabe
     cuál dijo qué, y eso es justo lo que la mesa existe para evitar. */
  for(const cuenta of ['carlos', 'luis']){
    const suyas = todos.filter(p => p.cuenta === cuenta && p.familia !== 'humano'
                                 && p.tipo !== 'humano');
    ok('las ' + suyas.length + ' sesiones de «' + cuenta + '» tienen matiz distinto',
       new Set(suyas.map(p => p.sombra)).size === suyas.length,
       suyas.map(p => p.id + ':' + p.sombra).join(' · '));
  }

  /* 3 · EL SUBAGENTE SE SABE DE QUIÉN CUELGA. Sin esto se lee como una sesión
     más y nadie sabe a quién reclamarle. */
  ok('cada subagente conserva a su padre',
     por['sub-c1a'].padre === 'cl-c1' && por['sub-c1b'].padre === 'cl-c1' &&
     por['sub-l1a'].padre === 'cl-l1');
  ok('y lleva el color de SU cuenta',
     por['sub-l1a'].color === por['cl-l1'].color &&
     por['sub-c1a'].color === por['cl-c1'].color);
  ok('dos subagentes del mismo padre no son gemelos',
     por['sub-c1a'].sombra !== por['sub-c1b'].sombra,
     por['sub-c1a'].sombra + ' vs ' + por['sub-c1b'].sombra);

  /* 4 · TODOS PUEDEN HABLAR Y SE SABE QUIÉN HABLÓ. */
  const llaveDe = { 'cl-c1':'kc','cl-c2':'kc','sub-c1a':'kc',
                    'cl-l1':'kl','cl-l2':'kl','sub-l1a':'kl','gem':'kk' };
  for(const id in llaveDe){
    await pedirCon(s, 'POST', 'decir', { de:id, texto:'aquí ' + id }, llaveDe[id]);
    /* Una persona entre medias limpia el contador de vueltas seguidas de
       agente: el freno de la mesa son 12, y siete seguidas lo rozan. */
    await pedirCon(s, 'POST', 'decir', { de:'carlos', texto:'va' }, 'kc');
  }
  const hilo = (await (await pedirCon(s, 'GET', 'hilo', null, 'kc')).json()).hilo
    .filter(e => e.tipo !== 'sistema' && e.de.id !== 'carlos');
  ok('las siete sesiones hablaron y el hilo las distingue',
     new Set(hilo.map(e => e.de.id)).size === 7,
     [...new Set(hilo.map(e => e.de.id))].join(','));

  /* 5 · CADA SESIÓN CON SU PROPIO ESTADO. Cuando a una se le acaba el uso,
     sólo ésa se marca — no las demás de su cuenta, ni las de otras. */
  await pedirCon(s, 'POST', 'estado', { de:'cl-l1', estado:'topado',
    clase:'uso diario', reanuda: Date.now() + 3600_000 }, 'kl');
  const g2 = Object.values((await (await pedirCon(s,'GET','hilo',null,'kc')).json()).gente);
  const topados = g2.filter(p => p.estado === 'topado').map(p => p.id);
  ok('topar una sesión NO topa a las otras de su cuenta',
     topados.length === 1 && topados[0] === 'cl-l1', topados.join(','));
}

/* ── 2 · SIN LLAVES: una sola cuenta, pero sin gemelos ───────────────────── */
console.log('\n── sin llaves · todos «invitado», y aun así distinguibles ──');
{
  const s = new Sala(hacerCtx(), { ESPERA_MS:250 });
  const entra = (id, nombre, extra = {}) => pedir(s, 'POST', 'entrar',
    { id, nombre, tipo:'claude', ...extra });
  await entra('cl-c', 'Claude de Carlos', { motor:'claude-opus-5' });
  await entra('cl-l', 'Claude de Luis',   { motor:'claude-sonnet-5' });
  await entra('sub',  'Explorador',       { padre:'cl-c' });

  const por = (await (await pedir(s, 'GET', 'hilo')).json()).gente;
  const todos = Object.values(por);
  ok('sin llaves, todos caen en la misma cuenta «invitado»',
     todos.every(p => p.cuenta === 'invitado'));
  /* Esto es lo que hay que saber antes de esperar que funcione: sin llaves,
     el COLOR ya no separa cuentas. Lo dejo probado para que no sorprenda. */
  ok('y por lo tanto comparten color — el color deja de decir de quién es',
     new Set(todos.map(p => p.color)).size === 1,
     [...new Set(todos.map(p => p.color))].join(','));
  ok('pero el matiz sigue separándolos: no salen gemelos',
     new Set(todos.map(p => p.sombra)).size === todos.length,
     todos.map(p => p.id + ':' + p.sombra).join(' · '));
  ok('y el subagente sigue sabiendo de quién cuelga', por['sub'].padre === 'cl-c');
}

/* ── 3 · el caso feo: dos sesiones que se llaman igual ───────────────────── */
console.log('\n── dos sesiones con el mismo nombre ──');
{
  const s = new Sala(hacerCtx(), { ESPERA_MS:250 });
  /* Pasa de verdad: dos pestañas de Claude Code en la misma máquina se
     presentan las dos como «Claude». Si la mesa las junta, el trabajo de una
     aparece firmado por la otra. */
  await pedir(s, 'POST', 'entrar', { id:'a', nombre:'Claude', tipo:'claude' });
  await pedir(s, 'POST', 'entrar', { id:'b', nombre:'Claude', tipo:'claude' });
  const todos = Object.values((await (await pedir(s, 'GET', 'hilo')).json()).gente);
  ok('siguen siendo dos, no una', todos.length === 2);
  ok('y el matiz las separa aunque el nombre no',
     todos[0].sombra !== todos[1].sombra,
     todos.map(x => x.nombre + ':' + x.sombra).join(' · '));
}

console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) +
            ' pruebas de varias cuentas');
process.exit(mal ? 1 : 0);
