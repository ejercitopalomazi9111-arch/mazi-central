/* ══════════════════════════════════════════════════════════════════════════
   pruebas-idioma.mjs — el idioma de la mesa, medido en un navegador de verdad
   ──────────────────────────────────────────────────────────────────────────
   NACIÓ DE UNA CAPTURA DE CARLOS. Mandó la pantalla de GRUPAZ con tres
   palabras: «Sigue en spanis». En la foto la interfaz estaba en inglés, el
   mensaje en español, y abajo del mensaje el botón «🌐 english» que él acababa
   de tocar. O sea: tocó traducir y no pasó nada.

   NO PASABA NADA A MEDIAS, que es lo interesante. El código SÍ averiguaba el
   motivo —el servidor contesta 501 con `apagado:true` cuando no hay traductor
   configurado; se midió contra la sala de producción, no se supuso— y SÍ lo
   escribía… en `$('aviso')`, la barra de arriba. En un teléfono, mirando el
   final de un mensaje largo, esa barra está fuera de la pantalla. El aviso
   existía, era correcto, y no servía para nada.

   Es la misma enfermedad de todo este mes: ALGO QUE INFORMA UN ESTADO Y ESTÁ
   EN OTRO. Aquí el disfraz es un mensaje de error perfecto en un renglón que
   nadie está viendo.

   Lo que queda demostrado aquí:
     · el viaje de ida y vuelta ES→EN→ES deja la interfaz como estaba
     · con el traductor APAGADO, el motivo sale EN LA BURBUJA y se ve
     · apagado y roto no dicen lo mismo
     · con traductor encendido, la traducción sale y NO se pinta como falla
     · el segundo toque quita lo que puso el primero, falle o no

   Corre así, con `dist/` servido en el 8123:
     node build.mjs
     (cd dist && python3 -m http.server 8123 &)
     node sala/pruebas-idioma.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';

let bien = 0, mal = 0;
const ok = (q, cond) => { console.log((cond ? '  ✓ ' : '  ✗ ') + q); cond ? bien++ : mal++; };

let chromium, navegador;
for(const d of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs',
                '/usr/lib/node_modules/playwright/index.mjs']){
  try{ const c = (await import(d)).chromium; navegador = await c.launch(); chromium = c; break; }
  catch(e){ /* el siguiente */ }
}
if(!chromium){
  console.error('No encontré un playwright CON navegador.');
  process.exit(1);
}

/* La sala de mentiras. `traductor` decide qué contesta `/traducir`, para poder
   medir los dos mundos sin tocar el código de la página. */
let traductor = 'apagado';
const QUIEN = { id:'claude-de-luis', nombre:'Godines', tipo:'agente', cuenta:'luis',
                motor:'claude', familia:'claude', color:'#5AA9E6', sombra:0, padre:null };
const HILO = [{ id:'e1', de:QUIEN, tipo:'mensaje', texto:'La guardia corrió y terminó en silencio.',
                nota:null, adjuntos:[], ts: Date.now() - 60000 }];

const srv = http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if(req.method === 'OPTIONS'){ res.end(); return; }
  const u = new URL(req.url, 'http://x');
  res.setHeader('content-type', 'application/json');

  if(u.pathname.endsWith('/entrar')){
    let c = ''; req.on('data', d => c += d);
    req.on('end', () => { const y = JSON.parse(c);
      res.end(JSON.stringify({ yo:{ ...y, familia:'persona', color:'#AC27FF', sombra:1 } })); });
    return;
  }
  if(u.pathname.endsWith('/hilo')){
    res.end(JSON.stringify({ hilo:HILO, gente:{ [QUIEN.id]: QUIEN } })); return;
  }
  if(u.pathname.endsWith('/traducir')){
    if(traductor === 'apagado'){
      res.statusCode = 501;
      res.end(JSON.stringify({ error:'No hay traductor configurado.',
        comoSePone:'npx wrangler secret put TRADUCTOR_LLAVE.', apagado:true }));
    } else if(traductor === 'roto'){
      res.statusCode = 502;
      res.end(JSON.stringify({ error:'El traductor contestó 429.' }));
    } else {
      res.end(JSON.stringify({ bien:true, simple:'The guard ran and finished in silence.' }));
    }
    return;
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise(r => srv.listen(8144, r));

/* En 390 a propósito: es el ancho en el que Carlos vio el defecto, y es el
   ancho en el que la barra de arriba se sale de la pantalla. */
const ctx = await navegador.newContext({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', x => errores.push(x.message));

await p.goto('http://127.0.0.1:8123/sala/?servidor=http://127.0.0.1:8144');
await p.waitForTimeout(400);
await p.fill('#codigoIn', 'GRUPAZ');
await p.fill('#nombreIn', 'Carlos');
await p.click('#bEntrar');
await p.waitForTimeout(900);

const foto = () => p.evaluate(() => ({
  boton:   document.getElementById('bIdioma')?.textContent.trim(),
  guardado: localStorage.getItem('salaIdioma'),
  lang:    document.documentElement.lang,
  pestañas:[...document.querySelectorAll('.pest')].map(b => b.textContent.trim()),
  enviar:  document.getElementById('bEnviar')?.textContent.trim() || null,
}));

console.log('\n· El viaje de ida y vuelta no deja nada a medias');
{
  const antes = await foto();
  ok('arranca en español', antes.lang === 'es' && antes.pestañas.includes('Taller 3D'));

  await p.click('#bIdioma'); await p.waitForTimeout(500);
  const en = await foto();
  ok('en inglés cambian las pestañas y el botón de enviar',
     en.lang === 'en' && en.pestañas.includes('3D Workshop') && en.enviar === 'Send');
  ok('el botón dice A DÓNDE lleva, no dónde estás', en.boton === 'ES');

  await p.click('#bIdioma'); await p.waitForTimeout(700);
  const vuelta = await foto();
  ok('la vuelta deja la interfaz exactamente como estaba',
     JSON.stringify(vuelta) === JSON.stringify({ ...antes, guardado:'es' }));
}

/* ── el defecto de la captura ──────────────────────────────────────────── */
const burbuja = () => p.evaluate(() => {
  const c = document.querySelector('.llano');
  if(!c) return null;
  const r = c.getBoundingClientRect();
  return {
    rotulo: c.querySelector('.llano-rot')?.textContent.trim(),
    texto:  c.textContent.replace(c.querySelector('.llano-rot')?.textContent || '', '').trim(),
    falla:  c.classList.contains('llano-falla'),
    /* ⚠ QUE EXISTA NO ES QUE SE VEA. El defecto original era justamente un
       texto correcto en un sitio invisible, así que aquí se mide el pixel. */
    aLaVista: r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0,
  };
});

console.log('\n· Con el traductor APAGADO, el motivo se ve donde se preguntó');
{
  traductor = 'apagado';
  await p.click('.reaccionar.simple');
  await p.waitForTimeout(600);
  const b = await burbuja();
  ok('la burbuja aparece bajo el mensaje', !!b);
  ok('y está DENTRO de la pantalla, no arriba fuera de cuadro', !!b && b.aLaVista);
  ok('dice que no se pudo traducir, no finge una traducción',
     !!b && b.falla && /no se pudo traducir/i.test(b.rotulo || ''));
  ok('explica que falta configurar el traductor',
     !!b && /no hay traductor configurado/i.test(b.texto || ''));
  ok('y trae el cómo se pone', !!b && /TRADUCTOR_LLAVE/.test(b.texto || ''));

  await p.click('.reaccionar.simple'); await p.waitForTimeout(400);
  ok('el segundo toque la quita', (await burbuja()) === null);
}

console.log('\n· APAGADO y ROTO no dicen lo mismo');
{
  traductor = 'roto';
  await p.click('.reaccionar.simple');
  await p.waitForTimeout(600);
  const b = await burbuja();
  ok('un traductor que contesta mal no se anuncia como «falta configurarlo»',
     !!b && b.falla && !/no hay traductor configurado/i.test(b.texto || ''));
  ok('y dice lo que contestó', !!b && /429/.test(b.texto || ''));
  await p.click('.reaccionar.simple'); await p.waitForTimeout(400);
}

console.log('\n· Con traductor encendido sí traduce, y no se pinta como falla');
{
  traductor = 'bueno';
  await p.click('.reaccionar.simple');
  await p.waitForTimeout(700);
  const b = await burbuja();
  ok('sale la traducción', !!b && /finished in silence/.test(b.texto || ''));
  ok('y NO lleva la marca de falla', !!b && b.falla === false);
  ok('el rótulo dice que es la versión en cristiano, no un error',
     !!b && !/no se pudo/i.test(b.rotulo || ''));
  await p.click('.reaccionar.simple'); await p.waitForTimeout(400);
}

/* ── EL BARRIDO ────────────────────────────────────────────────────────────
   No comprueba una frase: comprueba que NO QUEDE NINGUNA. Se pone la mesa en
   inglés y se recorre el DOM buscando acentos y palabras de función del
   español. Así, la frase que alguien agregue mañana sin su traducción sale
   marcada sola — que es lo único que evita que el diccionario se quede atrás
   del producto, y es justo como se encontraron las que ya se taparon.

   La lista blanca son nombres propios (de personas y de salas, que no se
   traducen) y el rótulo del botón de idioma, que a propósito ofrece el otro
   idioma EN EL OTRO IDIOMA. */
console.log('\n· En inglés no queda interfaz en español');
{
  /* Se limpia la barra de avisos antes de barrer: trae el recado del escenario
     anterior —«El traductor contestó 429»—, que es texto que redactó el
     SERVIDOR y no interfaz de esta página. Mezclarlo aquí haría que la prueba
     reclamara una traducción que no le toca a este diccionario. */
  await p.evaluate(() => { const a = document.getElementById('aviso'); if(a) a.textContent = ''; });
  await p.click('#bIdioma'); await p.waitForTimeout(700);
  const sueltas = await p.evaluate(() => {
    const ACENTO = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
    const PALS = /\b(de|la|el|los|las|que|para|con|se|un|una|sala|nadie|aquí|está|todavía|conexión|avisos|teléfono|escribe|sin)\b/i;
    const BLANCA = [/^Casa de /, /^Leer en español$/, / · cuenta de /];
    const fuera = (t) => BLANCA.some(r => r.test(t));
    /* ⚠ EL HILO NO ENTRA AL BARRIDO, y es la distinción que da sentido a todo
       esto: dentro del hilo hay TEXTO DE PERSONAS, y un mensaje en español
       debe seguir en español con la mesa en inglés —para eso está el botón de
       traducir uno por uno—. Barrerlo sería exigirle al diccionario que
       adivine lo que escribió alguien. El vacío del hilo sí es interfaz y se
       comprueba aparte. */
    const enElHilo = (n) => !!(n.nodeType === 1 ? n : n.parentNode)?.closest?.('#hilo');
    const out = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode(n){
      const t = n.parentNode?.nodeName;
      if(t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT; }});
    for(let n = w.nextNode(); n; n = w.nextNode()){
      const t = (n.nodeValue || '').trim();
      if(enElHilo(n)) continue;
      if(t.length > 2 && (ACENTO.test(t) || PALS.test(t)) && !fuera(t)) out.add(t);
    }
    for(const el of document.querySelectorAll('[placeholder],[aria-label],[title]'))
      for(const a of ['placeholder', 'aria-label', 'title']){
        const t = (el.getAttribute(a) || '').trim();
        if(t.length > 2 && (ACENTO.test(t) || PALS.test(t)) && !fuera(t)) out.add(a + ': ' + t);
      }
    return [...out];
  });
  ok('no queda ni una frase de interfaz sin traducir', sueltas.length === 0);
  if(sueltas.length) console.log('    faltan:', sueltas);

  /* La premisa del barrido, dicha en voz alta: si el recorrido no estuviera
     viendo nada, «no falta ninguna» saldría en verde con la mesa entera en
     español. Ya me pasó una vez con el letrero de la sala cerrada. */
  ok('…y el barrido de verdad está mirando la pantalla',
     await p.evaluate(() => document.body.innerText.includes('3D Workshop')));

  /* ⚠ Y LA VUELTA, en la misma pasada. Aplastar los espacios para buscar en el
     diccionario podía romper el camino de regreso sin que nadie lo notara:
     una frase partida en tres renglones se traduce, pero si el mapa de vuelta
     no usa la misma llave, se queda en inglés para siempre. */
  await p.click('#bIdioma'); await p.waitForTimeout(700);
  ok('y de vuelta en español no se queda nada en inglés',
     await p.evaluate(() => {
       const t = document.body.innerText;
       return !/\b(Offline|Phone alerts|Save the key|Write to the room|Agree)\b/.test(t);
     }));
}

console.log('\n· El original nunca se toca');
{
  ok('el mensaje sigue diciendo lo que decía',
     await p.evaluate(() => document.body.innerText.includes('La guardia corrió y terminó en silencio.')));
}

ok('ningún error de página en todo el recorrido', errores.length === 0);
if(errores.length) console.log('   ', errores);

await navegador.close(); srv.close();
console.log(`\n${mal ? '✗' : '✓'} ${bien}/${bien + mal}`);
process.exit(mal ? 1 : 0);
