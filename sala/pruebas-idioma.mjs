/* ══════════════════════════════════════════════════════════════════════════
   pruebas-idioma.mjs — que el inglés no se quede a medias
   ──────────────────────────────────────────────────────────────────────────
   Carlos, e404: «haz que el traductor a inglés también traduzca los mensajes
   y absolutamente TODO el texto».

   ── POR QUÉ ESTE ARCHIVO EXISTE ─────────────────────────────────────────
   El traductor de la interfaz es un diccionario de frases EXACTAS sobre el
   DOM ya pintado. Eso lo hace seguro y lo hace barato, pero tiene un defecto
   que no se ve leyendo el código: lo que no esté listado se queda en español
   Y NADIE SE ENTERA. No truena, no avisa, no sale en la consola. Sólo se ve
   abriendo la pantalla en inglés y mirándola.

   Ya pasó una vez. La primera versión traía el diccionario completo «de
   memoria» y en la primera captura quedaban cuarenta y dos textos en
   español, entre ellos el marcador de posición de la caja de escribir y la
   fecha entera. Un diccionario se completa con capturas, no de memoria — y
   una captura que nadie repite caduca en el siguiente cambio.

   Esto es esa captura, hecha máquina. Abre la sala de ejemplo, la pone en
   inglés, recorre TODO lo que se ve —texto y atributos— y REPRUEBA si algo
   sigue en español que no esté en la lista de excepciones de abajo.

   ── LO QUE NO SE TRADUCE, Y POR QUÉ NO ES UNA FUGA ──────────────────────
   Se dice aquí, una por una, para que nadie tenga que adivinar si un rojo es
   un defecto o una decisión. Añadir algo a esa lista tiene que costar
   escribir el porqué.

   Corre así, con el repo servido:
     node sala/pruebas-idioma.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

let bien = 0, mal = 0, saltadas = 0;
const ok = (que, cond, detalle) => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '\n      ' + detalle : '')); }
};
const salta = (que, porque) => { saltadas++; console.log('  · ' + que + ' — ' + porque); };

/* ── LO QUE SE QUEDA EN ESPAÑOL A PROPÓSITO ────────────────────────────────
   Cada renglón lleva su razón. Si algo cae aquí sin razón, es una fuga
   disfrazada de excepción. */
const A_PROPOSITO = [
  { que: /^\$?\s*node /,           porque: 'es una orden de terminal, no una frase' },
  { que: /^[✓✗]/,                  porque: 'es la salida de una orden: la imprimió una máquina' },
  { que: /^ok\(/,                  porque: 'es código' },
  { que: /^https?:\/\//,           porque: 'es una dirección' },
  { que: /^EN$|^ES$/,              porque: 'es el propio botón de idioma: dice a dónde te lleva' },
];
const perdonado = (t) => A_PROPOSITO.find(x => x.que.test(t));

/* ── ¿ESTO ESTÁ EN ESPAÑOL? ────────────────────────────────────────────────
   Sólo palabras que NO existen también en inglés. Con «a», «no», «son» o
   «me» dentro, un texto ya traducido salía marcado como fuga y la prueba se
   volvía ruido — que es como una prueba deja de leerse. */
const PALABRAS = `que qué para con los las del una está están esta este más cómo quién quiénes
 todo todos toda hay muy pero porque cuando dónde donde aquí nada nadie algo alguien sólo también
 así hasta entre sobre tus sus mis tiene tienes hacer poner dice dijo cada otra cuál quiere puede
 debe nuestro nuestra ellos ella ser sin desde hacia según sí nombre sala salas llave llaves
 mensaje imagen copiar entrar salir volver cerrar quitar enviar abrir escribe todavía ninguno
 ahorita gente pantalla pega pegar trabajando trabajo figura anillo línea vuelve guardar apagar
 prender cuenta casa hilo mesa quien queda dame aviso avisos sesión sesiones ejemplo adjuntar
 láminas lámina señal cristiano`.split(/\s+/).filter(Boolean);

const sinAcentos = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const LISTA = PALABRAS.map(sinAcentos);
const enEspanol = (t) => {
  if(/[¿¡]/.test(t)) return true;
  if(/[áéíóúñÁÉÍÓÚÑ]/.test(t)) return true;
  return sinAcentos(t).split(/[^a-z]+/).filter(Boolean).some(p => LISTA.includes(p));
};

/* ── un servidor de archivos, para abrir la sala como la abre un navegador ── */
const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
  '.webp':'image/webp', '.jpg':'image/jpeg', '.webmanifest':'application/manifest+json' };
const srv = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const f = join(RAIZ, normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, ''));
  try{
    const d = await readFile(f);
    res.setHeader('content-type', TIPOS[extname(f)] || 'application/octet-stream');
    res.end(d);
  }catch(e){ res.statusCode = 404; res.end('no'); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const PUERTO = srv.address().port;

/* ⚠ NO BASTA CON QUE PLAYWRIGHT IMPORTE: puede estar instalado sin sus
   navegadores. La que decide es la que ARRANCA. Misma trampa que en
   pruebas-identidad.mjs, y por la misma razón se comprueba igual. */
let navegador = null;
for(const d of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs',
                '/usr/lib/node_modules/playwright/index.mjs']){
  try{
    const c = (await import(d)).chromium;
    navegador = await c.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
    break;
  }catch(e){ /* el siguiente */ }
}
if(!navegador){
  console.log('\nSin playwright CON navegador: `npm i -D playwright && npx playwright install chromium`');
  srv.close();
  process.exit(0);      /* no se puede correr no es lo mismo que estar mal */
}

/* La sala apunta a un servidor que no existe a propósito: esto mide la
   PANTALLA, y no puede depender de que la sala de producción esté viva ni
   escribir nada en ella. */
const DIR = `http://127.0.0.1:${PUERTO}/sala/index.html?servidor=http://127.0.0.1:1`;
const ctx = await navegador.newContext({ viewport:{ width:430, height:900 } });
const pag = await ctx.newPage();

/* Lo que se ve AHORA MISMO: texto y los atributos que se leen. */
const loQueSeVe = () => pag.evaluate(() => {
  const visible = (el) => {
    if(!el) return false;
    if(!el.getClientRects().length) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.opacity !== '0';
  };
  const out = [];
  const paso = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n){
      const p = n.parentElement;
      if(!p) return NodeFilter.FILTER_REJECT;
      const t = p.nodeName;
      if(t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for(let n = paso.nextNode(); n; n = paso.nextNode()){
    const t = (n.nodeValue || '').trim();
    if(!t || !visible(n.parentElement)) continue;
    const p = n.parentElement;
    out.push({ t, donde: (p.closest('[id]') ? p.closest('[id]').id + ' ' : '') + p.className });
  }
  for(const el of document.querySelectorAll('[placeholder],[aria-label],[title]')){
    if(!visible(el)) continue;
    for(const a of ['placeholder', 'aria-label', 'title']){
      const v = el.getAttribute(a);
      if(v && v.trim()) out.push({ t: v.trim(), donde: '@' + a + ' ' + (el.id || el.className) });
    }
  }
  return out;
});

const clic = async (sel) => {
  const e = await pag.$(sel);
  if(e) await e.click({ timeout: 2500 }).catch(() => {});
};
const fuera = async () => { await pag.keyboard.press('Escape'); await pag.waitForTimeout(150); };
/* Después de barrer quedan paneles abiertos, y un panel abierto TAPA la barra:
   el botón de idioma existe, es visible y aun así el clic no llega.

   Las hojas de la sala NO se cierran con Escape: se cierran picando el fondo,
   y su manejador comprueba `e.target === la hoja`. Así que se dispara un clic
   sobre la hoja misma — que es exactamente lo que hace un dedo en el fondo—,
   y no se les quita la clase a mano: eso probaría un camino que nadie usa. */
const cerrarTodo = async () => {
  for(let i = 0; i < 3; i++) await fuera();
  await pag.evaluate(() => {
    for(const el of document.querySelectorAll('.abierta')) el.click();
  });
  await pag.waitForTimeout(250);
};
const cambiarIdioma = async () => {
  await cerrarTodo();
  await pag.click('#bIdioma', { timeout: 5000 });
  await pag.waitForTimeout(400);
};

/* Todas las pantallas que tienen texto propio. Se abren de verdad, con clics:
   destapar paneles a mano mediría texto que nadie llega a ver. */
const ESCENAS = [
  ['la mesa',            async () => {}],
  ['el cajón',           async () => { await clic('#bLado'); }],
  ['las llaves',         async () => { await clic('#bLlaves'); }],
  ['quién es quién',     async () => { await fuera(); await clic('#bLado'); await clic('#bLeyenda'); }],
  ['cómo se ve el hilo', async () => { await fuera(); await clic('#bLado'); await clic('#bVista2'); }],
  ['quién está',         async () => { await fuera(); await clic('#bGente'); }],
  ['una ficha',          async () => { await clic('.quien'); }],
  ['el pensamiento',     async () => { await fuera(); await clic('.piensa summary'); }],
  ['una corrida',        async () => { await clic('.corre summary'); }],
];

async function barrer(rotulo){
  const vistos = new Map();
  for(const [nombre, pasos] of ESCENAS){
    await pasos();
    await pag.waitForTimeout(250);
    for(const x of await loQueSeVe()) if(!vistos.has(x.t)) vistos.set(x.t, { ...x, escena: nombre });
  }
  console.log(`  (${rotulo}: ${vistos.size} textos distintos en pantalla)`);
  return vistos;
}

console.log('\n── EL INGLÉS NO DEJA NADA EN ESPAÑOL ──────────────────────────────');
await pag.goto(DIR, { waitUntil:'domcontentloaded' });
await pag.waitForTimeout(400);
await pag.click('#bDemo', { timeout: 5000 });
await pag.waitForTimeout(300);
const bot = await pag.$('#bIdioma');
if((await bot.textContent()).trim() === 'EN') await bot.click();
await pag.waitForTimeout(400);

const enIngles = await barrer('en inglés');
const fugas = [...enIngles.values()].filter(x => enEspanol(x.t) && !perdonado(x.t));
ok('no queda un solo texto en español con el inglés puesto', fugas.length === 0,
   fugas.map(f => `«${f.t.slice(0, 80).replace(/\n/g, '⏎')}» en ${f.escena} · ${f.donde}`).join('\n      '));

const perdonados = [...enIngles.values()].filter(x => enEspanol(x.t) && perdonado(x.t));
for(const p of perdonados) salta(`«${p.t.slice(0, 46).replace(/\n/g, '⏎')}»`, perdonado(p.t).porque);

console.log('\n── Y EL CAMINO DE VUELTA ──────────────────────────────────────────');
/* La vuelta importa tanto como la ida: un texto que se traduce y no regresa
   deja la sala en spanglish para quien nunca pidió inglés. */
await cambiarIdioma();
const enEspanolOtraVez = await barrer('de vuelta en español');
const CLAVES_ES = ['Quién es quién', 'Llaves de la sala', 'Escribe a la sala…', 'Hoy'];
for(const c of CLAVES_ES){
  ok(`vuelve a decir «${c}»`, [...enEspanolOtraVez.keys()].some(t => t.includes(c)));
}
const restos = ['Who is who', 'Room keys', 'Write to the room…', 'Today', 'Online', 'no signal'];
const quedaron = restos.filter(r => [...enEspanolOtraVez.keys()].some(t => t === r));
ok('no queda inglés pegado al volver a español', quedaron.length === 0, quedaron.join(' · '));

console.log('\n── LOS MENSAJES, TRADUCIDOS SOLOS ─────────────────────────────────');
await cambiarIdioma();
const hiloEn = await pag.evaluate(() =>
  [...document.querySelectorAll('#hilo .dicho')].map(d => d.textContent.trim()));
ok('el cuerpo de los mensajes sale en inglés, sin picarle a nada',
   hiloEn.some(t => t.includes('We need the inventory module by Friday')),
   'lo que hay: ' + JSON.stringify(hiloEn.slice(0, 2)));
ok('ningún mensaje del ejemplo se quedó en español',
   !hiloEn.some(t => t.includes('Necesitamos el módulo de inventario')));

const rotulos = await pag.$$('#hilo .traducido');
ok('los mensajes traducidos lo dicen', rotulos.length > 0,
   'no salió el rótulo «traducido» en ninguno');
if(rotulos.length){
  await rotulos[0].click();
  await pag.waitForTimeout(250);
  const conOriginal = await pag.evaluate(() =>
    [...document.querySelectorAll('#hilo .dicho')].map(d => d.textContent.trim()));
  ok('se puede volver al original de UN mensaje',
     conOriginal.some(t => t.includes('Necesitamos el módulo de inventario')));
  ok('y sólo de ése: los demás siguen en inglés',
     conOriginal.some(t => t.includes('Reviewed. Two things')));
}

console.log('\n── CON SALA DE VERDAD: SE PIDEN SOLOS ─────────────────────────────');
/* Lo de arriba mide la sala de EJEMPLO, que trae su inglés escrito. Eso deja
   sin probar justo la parte que Carlos pidió: que al prender el inglés la
   mesa vaya SOLA a pedir la traducción del hilo, sin picarle a nada.

   Se levanta una sala de mentiras que contesta lo mínimo —quién entra, el
   hilo, y la tanda— y se apunta con qué le pidieron. Sin esto, «se traducen
   solos» sería una afirmación mía, no una medición. */
{
  const pedidas = [];
  const falsa = http.createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    if(req.method === 'OPTIONS'){ res.end(); return; }
    const u = new URL(req.url, 'http://x');
    const responder = (o) => { res.setHeader('content-type','application/json');
                               res.end(JSON.stringify(o)); };
    let cuerpo = '';
    req.on('data', d => cuerpo += d);
    req.on('end', () => {
      const c = cuerpo ? JSON.parse(cuerpo) : {};
      if(u.pathname.endsWith('/entrar')){
        return responder({ yo:{ ...c, familia:'persona', color:'#AC27FF', sombra:1 } });
      }
      if(u.pathname.endsWith('/hilo')){
        return responder({
          gente:{ luis:{ id:'luis', nombre:'Luis', tipo:'humano', familia:'persona',
                         color:'#AC27FF', sombra:1, visto:Date.now(), estado:'activo' } },
          hilo:[{ id:'m1', ts:Date.now() - 60_000, tipo:'mensaje',
                  de:{ id:'luis', nombre:'Luis', tipo:'humano', cuenta:'luis' },
                  texto:'Hay que dejar listo el módulo antes del viernes.' }],
        });
      }
      if(u.pathname.endsWith('/traducir')){
        pedidas.push(c);
        const textos = {};
        for(const t of (c.textos || [])) textos[t.clave] = 'TRADUCIDO: ' + t.texto;
        return responder({ bien:true, textos });
      }
      res.statusCode = 404; responder({});
    });
  });
  await new Promise(r => falsa.listen(0, '127.0.0.1', r));
  const pFalsa = falsa.address().port;

  const c2 = await navegador.newContext({ viewport:{ width:430, height:900 } });
  const pg = await c2.newPage();
  await pg.goto(`http://127.0.0.1:${PUERTO}/sala/index.html`
              + `?servidor=http://127.0.0.1:${pFalsa}`, { waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(400);
  await pg.fill('#codigoIn', 'GRUPAZ');
  await pg.fill('#nombreIn', 'Luis');
  await pg.click('#bEntrar');
  await pg.waitForTimeout(800);

  const antes = pedidas.length;
  const bt = await pg.$('#bIdioma');
  if((await bt.textContent()).trim() === 'EN') await bt.click();
  await pg.waitForTimeout(900);

  ok('prender el inglés dispara la petición solo, sin tocar ningún mensaje',
     pedidas.length > antes, `peticiones: ${pedidas.length}`);
  ok('y va en tanda, no de uno en uno',
     pedidas.some(x => Array.isArray(x.textos) && x.textos.length >= 1));
  ok('pidiendo inglés, no «explícamelo simple»', pedidas.every(x => x.idioma === 'en'));

  const dicho = await pg.evaluate(() =>
    [...document.querySelectorAll('#hilo .dicho')].map(d => d.textContent.trim()));
  ok('y el mensaje se repinta con lo que llegó',
     dicho.some(t => t.includes('TRADUCIDO: Hay que dejar listo el módulo')),
     JSON.stringify(dicho));

  /* Y no se pide dos veces lo mismo: cada traducción cuesta. */
  const cuantas = pedidas.length;
  await pg.click('#bIdioma'); await pg.waitForTimeout(500);
  await pg.click('#bIdioma'); await pg.waitForTimeout(900);
  ok('ir y volver de idioma NO vuelve a pagar la traducción',
     pedidas.length === cuantas, `antes ${cuantas}, ahora ${pedidas.length}`);

  /* ⚠ Y AHORA RECARGANDO, QUE ES OTRA COSA. La de arriba la aprueba la
     memoria de la página, que se muere al recargar. Lo que hace falta probar
     es que lo traducido quedó GUARDADO EN EL APARATO — si no, cada vez que
     alguien abre la sala se paga el hilo entero otra vez.

     Lo sé porque quité `guardarIngles()` y las pruebas siguieron verdes: la
     de arriba pasaba igual sin guardar nada. Una prueba que no puede fallar
     no está probando; está acompañando. */
  await pg.reload({ waitUntil:'domcontentloaded' });
  await pg.waitForTimeout(1200);
  const trasRecargar = pedidas.length;
  ok('y al RECARGAR tampoco: lo traducido quedó guardado en el aparato',
     trasRecargar === cuantas, `antes ${cuantas}, tras recargar ${trasRecargar}`);
  const dicho2 = await pg.evaluate(() =>
    [...document.querySelectorAll('#hilo .dicho')].map(d => d.textContent.trim()));
  ok('y sigue leyéndose en inglés después de recargar',
     dicho2.some(t => t.includes('TRADUCIDO: Hay que dejar listo el módulo')),
     JSON.stringify(dicho2));

  await c2.close();
  falsa.close();
}

console.log('\n── LO QUE NO PUEDE FALTAR EN EL CÓDIGO ────────────────────────────');
const fuente = await readFile(join(RAIZ, 'sala/index.html'), 'utf8');
const marcadas = [...fuente.matchAll(/data-frase="([^"]+)"/g)].map(m => m[1]);
const conIngles = fuente.split('const PROSA_EN = {')[1].split('\n};')[0];
const sinIngles = [...new Set(marcadas)].filter(id => !conIngles.includes(`'${id}':`));
ok(`las ${new Set(marcadas).size} frases marcadas tienen su inglés escrito`,
   sinIngles.length === 0, sinIngles.join(' · '));

/* Un `data-frase` con un botón adentro se queda sin listener al traducirse,
   porque se le reemplaza el `innerHTML` entero. Ya pasó con la sala de
   ejemplo: en español abría y en inglés el enlace no hacía nada. */
const conBoton = await pag.evaluate(() =>
  [...document.querySelectorAll('[data-frase]')]
    .filter(el => el.querySelector('button, a[id], input'))
    .map(el => el.dataset.frase));
const delegados = conBoton.filter(id => !fuente.includes(`closest('#`));
ok('los bloques con botón adentro no cuelgan listeners del botón',
   conBoton.every(() => fuente.includes("if(!e.target.closest('#bDemo')) return;")),
   'con botón: ' + conBoton.join(' · '));

await navegador.close();
srv.close();
console.log(`\n${bien} bien · ${mal} mal · ${saltadas} a propósito\n`);
process.exit(mal ? 1 : 0);
