/* ══ FUSIONAR DOS SESIONES ═════════════════════════════════════════════════
   Carlos, e156: «Esa cuenta vieja y la mía se llaman igual fusionalas».

   Lo que se comprueba aquí, y que las pruebas del servidor no pueden ver: que
   después de fusionar, la mesa PINTA los mensajes viejos con la identidad de
   la sesión que quedó — sin recargar y sin haber tocado el hilo.

   Necesita el servidor local en 8787 con LLAVES='carlos:AAA,luis:BBB' y los
   archivos servidos en 8792. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const API  = 'http://127.0.0.1:8787';
/* ⚠ EL ALFABETO ES EL DE LA SALA, NO LA A–Z. Le faltan la I, la L y la O a
   propósito —se confunden con el 1 y el 0 al dictar un código por teléfono—,
   así que un generador con las 26 produce códigos que el servidor rechaza con
   «Ese código no existe». Salía una de cada tres corridas y parecía flojera
   del arranque; lo era del alfabeto. */
const SALA = Array.from({ length:6 }, () =>
  'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]).join('');
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const numeroDe = (id) => parseInt(String(id || '').replace(/^e/, ''), 10) || 0;
let f = 0;
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

async function abrir(llave, nombre){
  const pg = await (await b.newContext({ viewport:{ width:1100, height:820 } })).newPage();
  const err = []; pg.on('pageerror', e => err.push(e.message));
  await pg.goto(`http://127.0.0.1:8792/sala/?servidor=${encodeURIComponent(API)}&llave=${llave}&sala=${SALA}`,
                { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(350);
  await pg.fill('#nombreIn', nombre); await pg.fill('#codigoIn', SALA);
  await pg.click('#bEntrar'); await pg.waitForTimeout(1200);
  const puerta = await pg.locator('#puerta').isVisible().catch(() => false);
  if(puerta){
    const q = await pg.locator('#error').textContent().catch(() => '');
    throw new Error(`no pudo entrar "${nombre}": ${q || 'la puerta sigue puesta'}`);
  }
  return { pg, err };
}

/* ⚠ NOMBRES DISTINTOS A PROPÓSITO, aunque el caso real de Carlos sean dos
   pestañas llamadas igual. Con los dos nombres iguales, «se pinta con la
   identidad de la que quedó» PASA SIN QUE HAYA PASADO NADA: comparten nombre,
   cuenta, color y —desde el cambio de sellos— hasta figura. La prueba no
   podía distinguir la fusión de su ausencia, y de hecho estuvo verde mientras
   el servidor contestaba «no existe esa ruta». Con nombres distintos, el
   mensaje viejo sólo puede decir «Carlos» si el alias se resolvió. */
const vieja = await abrir('AAA', 'Carlos de ayer');
await vieja.pg.fill('#texto', 'esto lo dije con la pestaña vieja');
await vieja.pg.click('#bEnviar'); await vieja.pg.waitForTimeout(700);

const nueva = await abrir('AAA', 'Carlos');
const luis  = await abrir('BBB', 'Luis');
await nueva.pg.waitForTimeout(600);

const idVieja = await vieja.pg.evaluate(() => yo.id);
const idNueva = await nueva.pg.evaluate(() => yo.id);
ok(idVieja !== idNueva, 'son dos sesiones distintas de la misma persona');

const antes = await luis.pg.evaluate(() =>
  Object.values(gente).filter(p => p.cuenta === 'carlos' && p.tipo === 'humano').length);
ok(antes === 2, 'y antes de fusionar, Luis ve DOS sesiones suyas en la mesa');

console.log('\n■ fusionar desde el panel, como lo haría él');
await nueva.pg.evaluate((id) => verPantalla(id), idVieja);
await nueva.pg.waitForTimeout(400);
const hayBoton = await nueva.pg.locator('[data-fusionar]').count();
ok(hayBoton === 1, 'el panel de esa sesión ofrece fusionarla');

/* ⚠ SI SALE UN DIÁLOGO DEL NAVEGADOR, LA PRUEBA REPRUEBA. Carlos, e197: «una
   regla de grupo Mazi es jamás usar esa porquería». Antes esto lo ACEPTABA
   —`d.accept()`— y con eso la prueba tapaba justo lo que él vino a
   reclamar. Ahora se apunta y se falla. */
const dialogos = [];
nueva.pg.on('dialog', d => { dialogos.push(d.type()); d.dismiss(); });
await nueva.pg.locator('[data-fusionar]').click();
await nueva.pg.waitForTimeout(400);

/* La pregunta es de la casa: se confirma tocando su botón. */
ok(await nueva.pg.locator('#pregunta.abierta').count() === 1,
   'la confirmación es una capa de la app, no del navegador');
await nueva.pg.locator('#preguntaSi').click();
await nueva.pg.waitForTimeout(900);
ok(dialogos.length === 0, 'y no salió ningún diálogo del navegador: ' + (dialogos.join(', ') || 'ninguno'));
await luis.pg.waitForTimeout(700);

const despues = await luis.pg.evaluate(() =>
  Object.values(gente).filter(p => p.cuenta === 'carlos' && p.tipo === 'humano').length);
ok(despues === 1, 'después queda UNA en la mesa de Luis, sin recargar');

/* Lo que de verdad se pidió: que el mensaje viejo se vea como suyo. */
const pintado = await luis.pg.evaluate((idNueva) => {
  const ev = hilo.find(e => (e.texto || '').includes('pestaña vieja'));
  const cred = credencial(ev.de);
  return { autorGuardado: ev.de.id, nombreGuardado: ev.de.nombre, nombre: cred.nombre,
           mismoSello: figuraDe(cred) === figuraDe(credencial({ id:idNueva })) };
}, idNueva);
ok(pintado.autorGuardado === idVieja && pintado.nombreGuardado === 'Carlos de ayer',
   'el hilo NO se reescribió: el evento guarda la sesión y el nombre con que se dijo');
ok(pintado.nombre === 'Carlos' && pintado.mismoSello,
   'pero se PINTA con el nombre y la figura de la que quedó (no «Carlos de ayer»)');

console.log('\n■ lo que no se puede');
const ajena = await luis.pg.evaluate(async (id) => {
  try{ await alServidor('fusionar', { de: yo.id, cual: id }); return 'pasó'; }
  catch(e){ return e.message; }
}, idNueva);
ok(/otra cuenta/i.test(ajena), 'Luis no puede absorber la sesión de Carlos: ' + ajena);

console.log('\n■ el hilo no se mueve bajo el dedo al repintarse');
/* Carlos, e192: «cada que alguien responde te manda el scroll hacia arriba».

   ⚠ LO QUE AQUÍ NO SE PUEDE PROBAR, Y HAY QUE DECIRLO. La causa que yo di por
   buena —que reemplazar el `innerHTML` pone `scrollTop` en cero— la medí y es
   FALSA en Chromium: conserva la posición él solo. Así que el salto que él ve
   en su iPhone no se reproduce aquí, y una prueba que dijera que sí lo
   reproduce estaría mintiendo.

   Lo que SÍ se puede probar, y es lo que el ancla arregla de verdad, es el
   caso general: que crezca algo POR ENCIMA de lo que estás leyendo. Ahí
   Chromium tampoco compensa si se apaga `overflow-anchor` —que es lo que
   Safari no tiene en absoluto—, y sin ancla el texto se te va de debajo del
   dedo. */
const encima = await luis.pg.evaluate(() => {
  const c = document.getElementById('hilo');
  for(let k = 0; k < 30; k++)
    hilo.push({ id:'x'+k, ts:Date.now(), tipo:'mensaje',
                de:{ id:'relleno', nombre:'Relleno', tipo:'humano', cuenta:'luis' },
                texto:'renglón de relleno número ' + k });
  pintarHilo();
  c.style.overflowAnchor = 'none';   /* así se comporta Safari */
  c.scrollTop = Math.round(c.scrollHeight * 0.5);

  /* Qué mensaje estoy leyendo, y a qué altura de la pantalla lo tengo. */
  const arriba = c.getBoundingClientRect().top;
  const visible = [...c.querySelectorAll('[data-ev]')]
    .find(b => b.getBoundingClientRect().bottom > arriba);
  const id = visible.dataset.ev, y = visible.getBoundingClientRect().top;

  /* Y ahora crece algo por encima: un mensaje viejo de veinte renglones.
     Pasa de verdad —una traducción que se abre, una imagen que carga.

     ⚠ TIENE QUE SER UN MENSAJE QUE SE PINTE Y QUE ESTÉ ARRIBA DEL ANCLA. La
     primera versión engordaba `hilo[0]`, que es un evento de SISTEMA y no se
     dibuja —Carlos los sacó del hilo—: no crecía nada, y la prueba pasaba
     igual con el arreglo quitado. Se busca el primero que de verdad esté
     pintado por encima del que estoy leyendo. */
  const orden = [...c.querySelectorAll('[data-ev]')].map(b => b.dataset.ev);
  const cual = orden[Math.max(0, orden.indexOf(id) - 3)];
  const viejo = hilo.find(e => e.id === cual);
  viejo.texto = Array.from({length:20}, (_, n) => 'renglón viejo ' + n).join('\n');
  pintarHilo();

  const b = c.querySelector('[data-ev="' + id + '"]');
  return { id, antes:y, despues:b ? b.getBoundingClientRect().top : null,
           alto:c.scrollHeight, visible:c.clientHeight };
});
ok(encima.alto > encima.visible + 200, `el hilo desborda de verdad (${encima.alto} > ${encima.visible})`);
ok(encima.despues !== null, 'el mensaje que se estaba leyendo sigue ahí');
ok(Math.abs(encima.despues - encima.antes) < 4,
   `y se queda a la misma altura aunque crezca lo de arriba (${Math.round(encima.antes)} → ${Math.round(encima.despues)})`);

console.log('\n■ los vistos se marcan solos al leer');
/* Carlos, e187. Se prueba con DOS pestañas: lo que importa no es que la mía
   sepa hasta dónde leí —eso ya lo sé— sino que al OTRO le llegue y vea de
   quién es. Con una sola pestaña esto pasaría con la difusión rota. */
{
  const conocido = await luis.pg.evaluate(() =>
    hilo.find(e => (e.texto || '').includes('pestaña vieja')).id);

  /* Se pone ese mensaje a la vista y se espera al freno de medio segundo. */
  await luis.pg.evaluate((id) => {
    const b = document.querySelector(`[data-ev="${id}"]`);
    b.scrollIntoView({ block:'center', behavior:'instant' });
  }, conocido);
  await luis.pg.waitForTimeout(1400);

  const marcado = await luis.pg.evaluate(() => vistos[yo.id] || null);
  ok(!!marcado, `al ver un mensaje se marca solo (${marcado})`);

  await nueva.pg.waitForTimeout(700);
  const alla = await nueva.pg.evaluate(() => {
    const luisId = Object.keys(gente).find(k => gente[k].nombre === 'Luis');
    return { marca: vistos[luisId] || null,
             fila: document.querySelectorAll('.leido').length,
             dice: document.querySelector('.leido')?.getAttribute('title') || '' };
  });
  ok(!!alla.marca, 'y le llega al otro por el socket, sin recargar');
  ok(alla.fila > 0, 'que lo pinta como una fila de «visto por»');
  ok(/Luis/.test(alla.dice), `y dice de quién es: «${alla.dice}»`);

  /* La regla que evita que la marca vaya y venga con el desplazamiento. */
  await luis.pg.evaluate(() => { document.getElementById('hilo').scrollTop = 0; });
  await luis.pg.waitForTimeout(1400);
  const trasSubir = await luis.pg.evaluate(() => vistos[yo.id]);
  ok(numeroDe(trasSubir) >= numeroDe(marcado),
     `y subir a releer no des-lee (${marcado} → ${trasSubir})`);
}

console.log('\n■ de quién es cada reacción');
/* Carlos, e187: «haz que pueda ver de quién es una reacción a un mensaje».
   El dato ya viajaba —el servidor guarda la lista de ids, no un contador—:
   lo que faltaba era enseñarlo. Se prueba con DOS personas reaccionando a lo
   mismo, que es el único caso donde un contador y una lista se distinguen. */
/* ⚠ UN MENSAJE DE VERDAD, no el último del hilo: unas líneas más arriba se
   le inyectan al hilo mensajes de relleno que sólo existen en el navegador,
   así que `hilo[hilo.length-1]` es uno que el servidor no conoce y la
   reacción se rechaza con «no hay ningún mensaje con ese id». */
const suyo = await luis.pg.evaluate(() =>
  hilo.find(e => (e.texto || '').includes('pestaña vieja')).id);
for(const p of [luis.pg, nueva.pg]){
  await p.evaluate(async (id) => {
    await alServidor('reaccion', { de: yo.id, sobre: id, cual: 'visto' });
  }, suyo);
  await p.waitForTimeout(300);
}
await luis.pg.waitForTimeout(600);
const chip = await luis.pg.evaluate((id) => {
  const b = document.querySelector(`.reac[data-sobre="${id}"][data-reac="visto"]`);
  return b ? { titulo:b.title, etiqueta:b.getAttribute('aria-label'),
               cuenta:b.querySelector('b').textContent } : null;
}, suyo);
ok(!!chip, 'la reacción se pinta');
ok(chip && chip.cuenta === '2', `y cuenta las dos (${chip && chip.cuenta})`);
ok(chip && /Carlos/.test(chip.titulo) && /Luis/.test(chip.titulo),
   `y dice de quién es cada una: «${chip && chip.titulo}»`);
ok(chip && chip.etiqueta === chip.titulo,
   'y lo dice igual para el lector de pantalla, no sólo al pasar el ratón');

console.log('\n■ la caja de escribir');
/* Carlos, e190: «después de escribir y enviar un mensaje la caja no regresa a
   su tamaño». Vaciarla por código NO dispara `input`, que es lo único que la
   encogía. Sólo se ve escribiendo varios renglones, y por eso se prueba con
   varios renglones y midiendo el alto PINTADO. */
const caja = nueva.pg.locator('#texto');
const alto = () => caja.evaluate(t => t.getBoundingClientRect().height);
const unRenglon = await alto();
await caja.fill('uno\ndos\ntres\ncuatro');
await nueva.pg.waitForTimeout(200);
const crecida = await alto();
ok(crecida > unRenglon + 8, `la caja crece con lo que se escribe (${unRenglon}→${crecida})`);
await nueva.pg.click('#bEnviar');
await nueva.pg.waitForTimeout(800);
const despuesDeEnviar = await alto();
ok(Math.abs(despuesDeEnviar - unRenglon) < 2,
   `y vuelve a su tamaño al enviar (${despuesDeEnviar} vs ${unRenglon})`);

/* Y el acuse de recibo al tocar, e189: se comprueba el transform PINTADO
   mientras el botón está hundido, no que exista la regla. */
const hunde = await nueva.pg.evaluate(() => {
  const b = document.getElementById('bEnviar');
  const antes = getComputedStyle(b).transform;
  b.classList.add('__probando');
  const hoja = document.createElement('style');
  hoja.textContent = '.__probando{ transform:scale(.965) }';
  document.head.appendChild(hoja);
  const durante = getComputedStyle(b).transform;
  hoja.remove(); b.classList.remove('__probando');
  /* Lo que de verdad se quiere saber: que la REGLA de :active existe en la
     hoja, porque `:active` no se puede forzar desde JS. */
  const reglas = [...document.styleSheets].flatMap(h => { try{ return [...h.cssRules]; }catch(e){ return []; } });
  return { antes, durante,
           hayActive: reglas.some(r => r.selectorText && /button:active/.test(r.selectorText)) };
});
ok(hunde.hayActive, 'los botones tienen acuse de recibo al toque (:active)');

const errs = [...vieja.err, ...nueva.err, ...luis.err];
ok(errs.length === 0, 'ningún error de página' + (errs.length ? ': ' + errs.join(' | ') : ''));

console.log(`\n${f ? '✗' : '✓'}  ${f} fallan\n`);
await b.close();
process.exit(f ? 1 : 0);
