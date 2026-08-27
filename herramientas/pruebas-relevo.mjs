/* ══════════════════════════════════════════════════════════════════════════
   EL RELEVO · pruebas
     node herramientas/pruebas-relevo.mjs

   No hay una sola llave real aquí, y aun así se prueba lo que de verdad
   importa: QUÉ PASA CUANDO SE TOPAN. Se levantan proveedores falsos que
   fallan a propósito de cada forma posible, y se comprueba que el relevo los
   distinga. Esperar al día que se tope de verdad para descubrir un defecto es
   el peor plan que hay: ese día justamente no hay a quién pedirle ayuda.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CAJA = join(tmpdir(), 'pruebas-relevo-' + Date.now());
await mkdir(CAJA, { recursive:true });
process.env.MAZI_RELEVO_ESTADO = join(CAJA, 'estado.json');
process.env.MAZI_RELEVO_LISTA  = join(CAJA, 'modelos.json');

const { clasificar, desdeCabeceras, preguntar, leerEstado } = await import('./relevo.mjs');

let bien = 0, mal = 0;
const ok = (q, c) => { c ? (bien++, console.log(`  ✓ ${q}`)) : (mal++, console.log(`  ✗ ${q}`)); };

/* ── 1 · clasificar ═══════════════════════════════════════════════════════ */
console.log('\n· Distinguir por qué falló');
{
  ok('401 es la LLAVE, no falta de uso',   clasificar(401, 'invalid api key').clase === 'llave');
  ok('403 pelón también es la llave',      clasificar(403, 'forbidden').clase === 'llave');

  /* El matiz que cuesta: algunos devuelven 403 cuando se acaba el CRÉDITO. Si
     eso se marcara como llave mala, Carlos andaría revisando una llave que
     está perfecta. */
  ok('403 que habla de cuota SÍ es falta de uso',
     clasificar(403, 'quota exceeded for this project').clase === 'agotado');

  ok('402 es que se acabó el crédito',     clasificar(402, 'payment required').clase === 'agotado');
  ok('429 es tope de uso',                 clasificar(429, 'rate limit').clase === 'agotado');
  ok('404 es configuración, no uso',       clasificar(404, 'model not found').clase === 'config');
  ok('500 es que el proveedor anda mal',   clasificar(500, 'boom').clase === 'caido');

  /* Un 200 que trae texto de cuota adentro pasa igual. Hay proveedores que
     contestan 200 y meten el error en el cuerpo. */
  ok('un cuerpo que dice «exhausted» cuenta aunque el número sea raro',
     clasificar(418, 'resource has been exhausted').clase === 'agotado');

  /* Lo más caro de equivocarse: si «llave» trajera espera, el relevo la
     marcaría fuera y la escondería. Tiene que NO tener espera. */
  ok('la llave mala NO trae hora de regreso — no se esconde',
     clasificar(401, 'bad key').espera === undefined);
}

/* ── 2 · cuánto esperar ══════════════════════════════════════════════════ */
console.log('\n· Leer cuánto hay que esperar');
{
  ok('Retry-After en segundos',
     desdeCabeceras({ 'retry-after':'30' }) === 30_000);

  /* La otra forma válida del mismo encabezado. Leer sólo una deja al relevo
     esperando de más o de menos según con quién le toque hablar. */
  const dentroDeUnMinuto = new Date(Date.now() + 60_000).toUTCString();
  const v = desdeCabeceras({ 'retry-after': dentroDeUnMinuto });
  ok('Retry-After como fecha HTTP', v > 50_000 && v <= 61_000);

  ok('el formato de Groq: «2m59.5s»',
     Math.abs(desdeCabeceras({ 'x-ratelimit-reset-requests':'2m59.5s' }) - 179_500) < 100);
  ok('el formato de Groq: «7.66s»',
     Math.abs(desdeCabeceras({ 'x-ratelimit-reset-tokens':'7.66s' }) - 7_660) < 50);
  ok('sin cabeceras no inventa nada', desdeCabeceras(null) === null);
  ok('una cabecera basura no truena', desdeCabeceras({ 'retry-after':'mañana' }) === null);

  /* Un proveedor que pida esperar cuarenta días dejaría a ese corredor fuera
     para siempre por un dato absurdo. Se topa en 24 horas. */
  ok('una espera absurda se topa en 24 h',
     desdeCabeceras({ 'retry-after': String(60 * 60 * 24 * 40) }) === 24 * 3600_000);
}

/* ── 3 · el relevo completo, con proveedores falsos ══════════════════════ */
console.log('\n· La carrera de relevos');

const llamadas = [];
function fingir(respuestas){
  llamadas.length = 0;
  return createServer(async (pedido, res) => {
    const quien = pedido.url.split('/')[1];
    llamadas.push(quien);
    const r = respuestas[quien] || { estatus:200 };
    for(const [k, v] of Object.entries(r.cabeceras || {})) res.setHeader(k, v);
    res.writeHead(r.estatus, { 'content-type':'application/json' });
    res.end(r.estatus === 200
      ? JSON.stringify({ model:`modelo-de-${quien}`,
          choices:[{ message:{ content:`contesta ${quien}` } }] })
      : JSON.stringify({ error:{ message: r.dice || 'falló' } }));
  });
}

async function conFila(ids, respuestas, correr){
  const srv = fingir(respuestas);
  await new Promise(r => srv.listen(0, r));
  const puerto = srv.address().port;
  await writeFile(process.env.MAZI_RELEVO_LISTA, JSON.stringify({
    proveedores: ids.map(id => ({ id, nombre:id,
      base:`http://127.0.0.1:${puerto}/${id}`, llave:null, modelo:'x' })) }));
  try{ return await correr(); }
  finally{ await new Promise(r => srv.close(r)); }
}

{
  await writeFile(process.env.MAZI_RELEVO_ESTADO, '{}');
  const r = await conFila(['uno','dos','tres'], {
    uno:  { estatus:429, dice:'rate limit', cabeceras:{ 'retry-after':'600' } },
    dos:  { estatus:200 },
  }, () => preguntar('hola'));

  ok('el primero se topa y contesta el segundo', r.ok && /contesta dos/.test(r.dice));
  ok('no se molesta al tercero si el segundo ya contestó', !llamadas.includes('tres'));

  const est = await leerEstado();
  ok('el que se topó queda marcado', est.uno && est.uno.clase === 'agotado');
  ok('con la hora que él mismo pidió',
     Math.abs(est.uno.hasta - (Date.now() + 600_000)) < 5_000);
  ok('el que contestó NO queda marcado', !est.dos);
}

{
  /* El caso que da sentido a todo el archivo: una llave mal escrita NO puede
     marcarse como agotada, porque entonces el relevo la esconde y nadie se
     entera nunca. */
  await writeFile(process.env.MAZI_RELEVO_ESTADO, '{}');
  const r = await conFila(['malallave','bueno'], {
    malallave: { estatus:401, dice:'invalid api key' },
    bueno:     { estatus:200 },
  }, () => preguntar('hola'));

  ok('con la llave mala, el trabajo igual sale adelante', r.ok);
  const est = await leerEstado();
  ok('pero la llave mala NO se marca como agotada — no se esconde', !est.malallave);
  ok('y se dice con todas sus letras',
     r.saltados.some(s => /ESO NO ES FALTA DE USO/.test(s)));
}

{
  /* Un corredor marcado no se vuelve a llamar hasta su hora. Si se llamara,
     cada pregunta gastaría una llamada en alguien que ya dijo que no puede. */
  await writeFile(process.env.MAZI_RELEVO_ESTADO, JSON.stringify({
    uno: { clase:'agotado', hasta: Date.now() + 3600_000 } }));
  const r = await conFila(['uno','dos'], { dos:{ estatus:200 } },
    () => preguntar('hola'));
  ok('a un corredor marcado ni se le llama', !llamadas.includes('uno'));
  ok('y se dice a qué hora vuelve',
     r.saltados.some(s => /vuelve \d/.test(s)));
}

{
  /* Cuando la marca vence, vuelve solo a la fila. Sin esto habría que
     acordarse de liberarlo a mano, y nadie se acuerda. */
  await writeFile(process.env.MAZI_RELEVO_ESTADO, JSON.stringify({
    uno: { clase:'agotado', hasta: Date.now() - 1000 } }));
  const r = await conFila(['uno','dos'], { uno:{ estatus:200 } },
    () => preguntar('hola'));
  ok('cuando pasa su hora, vuelve solo a la fila', r.ok && /contesta uno/.test(r.dice));
}

{
  await writeFile(process.env.MAZI_RELEVO_ESTADO, '{}');
  const r = await conFila(['uno','dos'], {
    uno:{ estatus:429, dice:'limit' }, dos:{ estatus:500, dice:'boom' },
  }, () => preguntar('hola'));
  ok('si nadie puede, se dice claro en vez de colgarse', !r.ok);
  ok('y se explica quién falló y por qué', r.saltados.length === 2);
}

await rm(CAJA, { recursive:true, force:true });
console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
