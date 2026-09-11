// Compuerta: mide el DOM renderizado, no el CSS. Las tres cosas que este
// diseno puede romper sin que se note: desborde horizontal (los hijos de grid
// no bajan de min-content), mas de un h1, y que sin JS quede algo escondido.
/* ⚠ ESTA RUTA ESTABA MAL Y LA COMPUERTA NUNCA CORRIÓ EN ESTE REPO.
   Apuntaba a `<repo>/node_modules/playwright`, que aquí no existe: en este
   contenedor Playwright vive en /opt. Reventaba con ERR_MODULE_NOT_FOUND antes
   de la primera comprobación, así que el revisor que mide desborde, contraste
   y h1 daba CERO cobertura mientras parecía existir.

   Una compuerta que no corre es peor que ninguna: da la confianza sin dar la
   comprobación. Es el mismo defecto que perseguimos todo el tiempo — algo que
   informa un estado y está en otro.

   Se prueba en un renglón: `node toydarians/taller/revisar.mjs` tiene que
   imprimir resultados, no una traza. */
const RUTA_PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(RUTA_PW);
const chromium = pw.chromium ?? pw.default.chromium;   // playwright es CommonJS
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
// acepta un archivo por argumento: el sitio y el boceto pasan por la misma
// compuerta, que para eso se escribio.
/* ⚠ EL DEFAULT ERA UNA RUTA ABSOLUTA DE OTRA MÁQUINA: `/home/user/toydarians/
   sitio.html`, que se sale de este repo. Aunque el import de Playwright ya
   estuviera bien, la compuerta seguía muerta un renglón más abajo.

   Ahora se calcula desde el propio archivo, así que corre desde donde sea:
   `node toydarians/taller/revisar.mjs` o `cd toydarians/taller && node
   revisar.mjs` dan lo mismo. Y mide `index.html` —EL QUE SE PUBLICA— y no el
   intermedio, porque medir lo que no se sirve es el defecto que arreglamos hoy
   en el generador. Se puede pasar otro archivo por argumento. */
const AQUI = new URL('.', import.meta.url).pathname;
const archivo = process.argv[2] || AQUI + '../index.html';

/* ⚠ ESTO MEDIA CON `file://` Y ESO NO ES LO QUE SE SIRVE.
   Lo destapo un fallo de verdad: `<link rel=preload as=font crossorigin>` es
   OBLIGATORIO en produccion —las tipografias siempre se piden en modo CORS— y
   bajo `file://` Chrome lo rechaza porque el origen es opaco. La compuerta
   reprobaba una pagina correcta.

   La respuesta no es perdonar el fallo —eso es lo que hicimos con las fuentes
   de Google y nos escondio doce segundos de pantalla en blanco—: es medir como
   se sirve. Un servidor de archivos de veinte lineas, sin dependencias, y a
   partir de aqui la compuerta ve lo mismo que ve un telefono. */
const { createServer } = await import('node:http');
const { readFile, stat } = await import('node:fs/promises');
const { join, dirname, extname, resolve } = await import('node:path');

const BASE = dirname(resolve(archivo));
const TIPO = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.woff2':'font/woff2', '.json':'application/json' };

const servidor = createServer(async (pet, res) => {
  try {
    const ruta = decodeURIComponent(new URL(pet.url, 'http://x').pathname);
    const destino = join(BASE, ruta);
    // que nadie salga de la carpeta servida
    if (!resolve(destino).startsWith(BASE)) { res.writeHead(403).end(); return; }
    const info = await stat(destino);
    const f = info.isDirectory() ? join(destino, 'index.html') : destino;
    const datos = await readFile(f);
    res.writeHead(200, { 'content-type': TIPO[extname(f)] || 'application/octet-stream',
                         'access-control-allow-origin': '*' });
    res.end(datos);
  } catch { res.writeHead(404).end('no está'); }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const PUERTO = servidor.address().port;
const url = `http://127.0.0.1:${PUERTO}/${archivo.split('/').pop()}`;
console.log('midiendo', archivo);
let malo = 0;

/* ⚠ LA COMPUERTA MEDIA LA PAGINA EN REPOSO Y NADA MAS, Y ESO YA DEJO PASAR
   UN FALLO QUE TUMBABA LA FICHA EN PRODUCCION: `pintarPago is not defined`
   solo saltaba AL PULSAR una pieza, y la compuerta nunca pulsaba ninguna.
   Asi que la misma medicion corre dos veces: con la pagina quieta y con el
   expediente ABIERTO. Se saca a una constante para que sean literalmente la
   misma comprobacion y no dos que se parecen.
   Lo que caza en el segundo pase: desborde dentro del cuadro, texto que se
   quedo a medio destapar en la mascara, contraste sobre el panel, columnas
   aplastadas, y cualquier error de guion que solo aparezca al abrir. */
const MEDIR = () => {
    const de = document.documentElement;
    const desborde = de.scrollWidth - de.clientWidth;
    const culpables = [];
    if (desborde > 1) {
      for (const n of document.querySelectorAll('body *')) {
        const b = n.getBoundingClientRect();
        if (b.right > de.clientWidth + 1 && b.width > 4 &&
            !n.closest('.banda') && getComputedStyle(n).position !== 'fixed')
          culpables.push(n.tagName + '.' + (n.className || '?') + ' → ' + Math.round(b.right));
      }
    }
    // nada legible puede quedar invisible ni fuera de sitio
    const ocultos = [...document.querySelectorAll('h1,h2,h3,p,.reng,.celda')].filter(n => {
      const s = getComputedStyle(n), b = n.getBoundingClientRect();
      return (parseFloat(s.opacity) < .5 || s.visibility === 'hidden') && b.height > 0;
    }).length;
    // El titular se destapa con mascara, asi que .fila lleva overflow:hidden
    // y eso corta en HORIZONTAL tambien. Si la tipografia de Google no carga
    // cae a una mas ancha y el titular se decapita sin avisar. Se mide.
    const cortados = [];
    for (const f of document.querySelectorAll('h1 .fila')) {
      const t = f.firstElementChild;
      if (t && t.scrollWidth > f.clientWidth + 1)
        cortados.push(t.textContent.trim() + ' ' + t.scrollWidth + '>' + f.clientWidth);
    }
    // Contraste real del DOM pintado. Es lo unico que puede reprobar de
    // verdad: ningun typecheck ni build ve un texto que no se lee.
    const lum = (c) => {
      const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
      return .2126 * v[0] + .7152 * v[1] + .0722 * v[2];
    };
    const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    // Sube buscando el primer fondo opaco. Si por el camino hay un degradado
    // SIN color solido debajo, el texto se apoya en algo inmedible: se marca.
    const sinSuelo = [];
    const fondoDe = (n) => {
      for (let e = n; e; e = e.parentElement) {
        const st = getComputedStyle(e), c = st.backgroundColor, p = rgb(c);
        const a = (c.match(/[\d.]+/g) || [])[3];
        const opaco = p.length === 3 && (a === undefined || +a > .95);
        if (!opaco && st.backgroundImage.includes('gradient')) sinSuelo.push(e.className || e.tagName);
        if (opaco) return p;
      }
      return [0, 0, 0];
    };
    // Un contenedor de consulta dentro de una pista ajustada al contenido
    // colapsa a cero y el texto sale a una palabra por renglon. Dos veces me
    // paso y las dos la compuerta dio verde: se mide.
    const aplastados = [];
    for (const n of document.querySelectorAll('*')) {
      const t = (n.innerText || '').trim();
      if (t.length < 24) continue;
      const b = n.getBoundingClientRect();
      if (b.height > 0 && b.width > 0 && b.width < 90 && b.height > b.width * 2.2)
        aplastados.push((n.className || n.tagName) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
    }
    // Todas las tarjetas salieron con el LOGO en vez de la figura porque el
    // raspado se trajo la imagen de la cabecera de primera. La señal es que
    // muchas fichas comparten la misma imagen: eso se mide.
    const repes = [];
    const cuenta = {};
    for (const im of document.querySelectorAll('.rejilla img, .g-cats img')) {
      const k = (im.currentSrc || im.src || '').split('/').pop();
      if (k) cuenta[k] = (cuenta[k] || 0) + 1;
    }
    const totalFichas = document.querySelectorAll('.rejilla .pieza').length;
    for (const [k, c] of Object.entries(cuenta))
      if (c > 3 && c > totalFichas * 0.25) repes.push(k + ' ×' + c);

    /* Los banners de categoria NO son <img>: son <span> con background-image
       que pone el JS, asi que la cuenta de arriba no los ve. Esto cubre el
       caso de la MISMA RUTA repartida en muchas tarjetas.
       ⚠ Lo que NO cubre, y por eso se dice: cuando el raspador sirvio el
       logo de la tienda a 16 categorias, los archivos tenian NOMBRES
       DISTINTOS y los MISMOS BYTES. En el DOM eso son 16 rutas distintas y
       esta comprobacion pasa en verde. La igualdad de bytes se comprueba
       donde estan los bytes: `_comprobar_banners` en armar.py. */
    const fondos = {};
    for (const s of document.querySelectorAll('.g-cats .banners span')) {
      const u = (s.dataset.b || getComputedStyle(s).backgroundImage || '');
      const k = (u.match(/[^/"')]+\.(?:webp|png|jpe?g|avif)/i) || [''])[0];
      if (k) fondos[k] = (fondos[k] || 0) + 1;
    }
    const totalCats = document.querySelectorAll('.g-cats .g-cat').length;
    for (const [k, c] of Object.entries(fondos))
      if (c > 2 && c > totalCats * 0.25) repes.push('banner ' + k + ' ×' + c);

    /* EL FONDO VIVO PUEDE VOLVER MENTIRA EL CONTRASTE, Y NINGUNA OTRA
       COMPROBACION LO VE. Todo lo de arriba mide colores declarados sobre
       elementos; la nebulosa son degradados en capas fijas detras de todo, asi
       que para el navegador el suelo del texto sigue siendo --negro por mas que
       el fondo se aclare. Si alguien le sube la tinta, el contraste seguiria
       saliendo perfecto y el texto seria ilegible.

       ⚠ ESTA COMPROBACION YA ESTUVO MUERTA. Miraba un lienzo `#g-fondo` que
       dejo de existir cuando la nebulosa paso a CSS, e imprimia «—» sin
       comprobar nada. Ahora EXIGE encontrar el fondo: si no esta, reprueba.

       Se componen las alfas declaradas de cada mancha sobre el negro de la
       pagina —la peor luz que pueden dar juntas— y se compara con el texto mas
       flojo que se usa. */
    const fondoVivo = (() => {
      const capas = [...document.querySelectorAll('.g-neb i')];
      if (!capas.length) return { falta: true, mal: true };
      let R = 10, G = 10, B = 11;                 // el negro de la pagina
      for (const n of capas) {
        const g = getComputedStyle(n).backgroundImage;
        // el primer tope del degradado es el centro: lo mas cargado
        const m = g.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) continue;
        const a = m[4] === undefined ? 1 : +m[4];
        R = +m[1] * a + R * (1 - a);
        G = +m[2] * a + G * (1 - a);
        B = +m[3] * a + B * (1 - a);
      }
      const texto = lum([154, 154, 162]);         // --gris, el mas flojo que se usa
      const ratio = (texto + .05) / (lum([R, G, B]) + .05);
      return { ratio: +ratio.toFixed(2), px: [R, G, B].map(Math.round),
               capas: capas.length, mal: ratio < 4.5 };
    })();

    const flojos = [];
    /* ⚠ `dd` Y `dt` NO ESTABAN EN ESTA LISTA, y la ficha nueva pone ahi TODOS
         sus datos —linea, escala, estado, numero—. Lo cace probando la propia
         comprobacion: le meti un `color:#222` a los datos del expediente y la
         compuerta siguio dando verde. Una lista de etiquetas es una trampa
         justo por esto: solo mira lo que alguien penso en el momento de
         escribirla, y el marcado sigue creciendo. */
      for (const n of document.querySelectorAll('p,span,a,li,h1,h2,h3,h4,b,i,em,strong,small,div,dd,dt,button,label,td,th')) {
      const t = [...n.childNodes].filter(x => x.nodeType === 3 && x.textContent.trim()).map(x => x.textContent.trim()).join(' ');
      if (!t) continue;
      const st = getComputedStyle(n);
      if (st.visibility === 'hidden' || +st.opacity < .5 || !n.getBoundingClientRect().height) continue;
      const px = parseFloat(st.fontSize), grueso = st.fontWeight >= 700;
      const grande = px >= 24 || (px >= 18.66 && grueso);
      const L1 = lum(rgb(st.color)), L2 = lum(fondoDe(n));
      const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const pide = grande ? 3 : 4.5;
      if (ratio < pide) flojos.push(t.slice(0, 26) + ' ' + ratio.toFixed(2) + '<' + pide);
    }
    return { fondoVivo, desborde, culpables: culpables.slice(0, 5), cortados, repes: repes.slice(0, 3),
             aplastados: [...new Set(aplastados)].slice(0, 4),
             flojos: flojos.slice(0, 6), sinSuelo: [...new Set(sinSuelo)].slice(0, 4),
             h1: document.querySelectorAll('h1').length, ocultos,
             alto: Math.round(de.scrollHeight) };
};

for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
  for (const js of [true, false]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: js });
    const pg = await ctx.newPage();
    // Un script muerto no cambia ni el alto ni el contraste: la compuerta daba
    // verde con el titular sin destapar. Los errores de pagina se miran.
    const fallos = [];
    pg.on('pageerror', (e) => fallos.push('pageerror: ' + e.message));
    // Este entorno no alcanza los servidores de tipografia de Google, asi que
    // ese fallo de red es del sandbox y no de la pagina. Cualquier OTRO recurso
    // que no cargue si es un defecto y tiene que reprobar.
    /* Ya no se le perdona nada a nadie: el sitio no pide un solo recurso
       fuera de su dominio, asi que CUALQUIER peticion que falle es un defecto.
       La excepcion que habia aqui para fonts.googleapis.com escondio durante
       semanas que esa hoja bloqueaba el pintado doce segundos. */
    pg.on('requestfailed', (q) => fallos.push('no cargó: ' + q.url().slice(0, 90)));
    await pg.goto(url, { waitUntil: 'load' });
    await pg.waitForTimeout(js ? 900 : 300);

    const r = await pg.evaluate(MEDIR);

    const mal = fallos.length > 0 || r.desborde > 1 || r.h1 !== 1 || r.ocultos > 0 || r.cortados.length > 0 || r.flojos.length > 0 || r.sinSuelo.length > 0 || r.aplastados.length > 0 || r.repes.length > 0 || (r.fondoVivo && r.fondoVivo.mal);
    if (mal) malo++;
    console.log(`${w}px js=${js ? 'sí' : 'no '}  desborde ${r.desborde}px  h1 ${r.h1}  ocultos ${r.ocultos}  cortados ${r.cortados.length}  contraste ${r.flojos.length}  sin-suelo ${r.sinSuelo.length}  errores ${fallos.length}  aplastados ${r.aplastados.length}  repetidas ${r.repes.length}  fondo ${r.fondoVivo.falta ? 'NO ESTÁ' : r.fondoVivo.ratio}  alto ${r.alto}px ${mal ? '  ← MAL' : ''}`);
    /* ── SEGUNDO PASE · con el expediente ABIERTO ──────────────────────────
       Solo con JS, claro: sin JS la ficha no se abre y no hay nada que medir.
       Se pulsa una pieza de verdad —no se enciende la clase a mano— porque lo
       que se quiere comprobar es el camino que recorre una persona. */
    if (js) {
      const abrio = await pg.evaluate(() => {
        const b = document.querySelector('.rejilla .pieza');
        if (!b) return false;
        b.click(); return true;
      });
      if (!abrio) { fallos.push('no hay ninguna pieza que pulsar'); }
      else {
        await pg.waitForTimeout(1400);          // que termine de destaparse
        const listo = await pg.evaluate(() => {
          const f = document.getElementById('g-ficha');
          return !!f && !f.hidden && f.classList.contains('abierta');
        });
        if (!listo) fallos.push('el expediente no se abrio al pulsar una pieza');
        else {
          const f = await pg.evaluate(MEDIR);
          /* el numero de fondo y el anillo son marcas de agua sobre el panel:
             no cuentan como texto y no se miden aqui */
          const malF = f.desborde > 1 || f.cortados.length > 0 || f.flojos.length > 0 ||
                       f.aplastados.length > 0 || f.sinSuelo.length > 0;
          if (malF) malo++;
          console.log(`${w}px ficha     desborde ${f.desborde}px  cortados ${f.cortados.length}`
            + `  contraste ${f.flojos.length}  aplastados ${f.aplastados.length}`
            + `  sin-suelo ${f.sinSuelo.length}${malF ? '  ← MAL' : ''}`);
          f.culpables.forEach(c => console.log('      ficha desborda ' + c));
          f.cortados.forEach(c => console.log('      ficha corta    ' + c));
          f.flojos.forEach(c => console.log('      ficha flojo    ' + c));
          f.aplastados.forEach(c => console.log('      ficha aplasta  ' + c));
        }
      }
    }

    r.culpables.forEach(c => console.log('      desborda ' + c));
    r.cortados.forEach(c => console.log('      corta    ' + c));
    r.flojos.forEach(c => console.log('      flojo    ' + c));
    r.aplastados.forEach(c => console.log('      aplastado ' + c));
    r.repes.forEach(c => console.log('      misma imagen en muchas fichas: ' + c));
    if (r.fondoVivo && r.fondoVivo.falta)
      console.log('      NO ENCUENTRO EL FONDO VIVO (.g-neb i): o se quitó, o se renombró '
        + 'y esta comprobación se quedó mirando al vacío');
    else if (r.fondoVivo && r.fondoVivo.mal)
      console.log('      el fondo vivo aclara demasiado: --gris queda en '
        + r.fondoVivo.ratio + ':1 sobre rgb(' + r.fondoVivo.px.join(',') + ') — pide 4.5');
    r.sinSuelo.forEach(c => console.log('      degradado sin color sólido: ' + c));
    [...new Set(fallos)].slice(0, 3).forEach(c => console.log('      ' + c));
    if (js && (w === 1440 || w === 390)) {
      await pg.evaluate(async () => {              // despierta lo diferido
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          scrollTo(0, y); await new Promise(r => setTimeout(r, 60));
        }
        scrollTo(0, 0);
      });
      await pg.waitForTimeout(700);
      const mote = archivo.includes('boceto') ? 'boc' : 'vista';
      await pg.screenshot({ path: `/tmp/toyimg/${mote}-${w === 1440 ? 'esc' : 'tel'}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
/* ── PASE DE FLUIDEZ · que la pagina CORRA, no solo que se vea ──────────
   Lo que reporto Luis: «la pestaña inicial se traba en mi cell». Y tenia
   razon: medido a 390 px con DPR 3, la intro iba a 1.4 fps con cuadros de 4.8
   SEGUNDOS, y el primer pintado tardaba 12.7 s. Nada de lo que media la
   compuerta podia verlo — desborde, contraste y h1 salen perfectos en una
   pagina que va a tirones.

   Se miden las dos cosas que se sienten:
   · cuando aparece algo (primer pintado);
   · cuantos cuadros por segundo da, durante la intro y despues.

   Y se mide con el CPU FRENADO 4x, que es mas o menos un telefono de gama
   media. Sin frenar, cualquier maquina de desarrollo da 60 fps y la
   comprobacion no serviria para nada.

   Los umbrales no son aspiracionales, son lo que ya se cumple con margen:
   primer pintado por debajo de 2.5 s, y 30 fps de media en las dos fases. Si
   alguien vuelve a meter algo que repinte la pantalla entera en cada cuadro,
   esto lo para. */
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 },
                                     deviceScaleFactor: 3 });
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pg.addInitScript(() => {
    window.__m = []; let u = 0;
    const paso = (t) => { if (u) window.__m.push(t - u); u = t; requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  });
  await pg.goto(url, { waitUntil: 'load' });
  await pg.waitForTimeout(9000);
  const r = await pg.evaluate(() => {
    const m = window.__m;
    const media = (a) => a.length ? 1000 / (a.reduce((x, y) => x + y, 0) / a.length) : 0;
    let acum = 0, corte = m.length;
    for (let i = 0; i < m.length; i++) { acum += m[i]; if (acum > 5200) { corte = i; break; } }
    const pintado = (performance.getEntriesByType('paint')
      .find(p => p.name === 'first-contentful-paint') || {}).startTime || 1e9;
    const peor = m.length ? Math.max(...m) : 0;
    return { pintado: Math.round(pintado),
             intro: +media(m.slice(0, corte)).toFixed(1),
             despues: +media(m.slice(corte)).toFixed(1),
             peorCuadro: Math.round(peor) };
  });
  const mal = r.pintado > 2500 || r.intro < 30 || r.despues < 30 || r.peorCuadro > 1200;
  if (mal) malo++;
  console.log(`390px fluidez (CPU 4x)  primer pintado ${r.pintado}ms  intro ${r.intro}fps  `
    + `despues ${r.despues}fps  peor cuadro ${r.peorCuadro}ms${mal ? '  ← MAL' : ''}`);
  if (mal) console.log('      pide: pintado <2500ms · 30fps en las dos fases · ningun cuadro >1200ms');
  await ctx.close();
}

/* ── PASE DEL MANDO · que el buscador BUSQUE de verdad ──────────────────
   Un buscador roto no se nota mirando: la barra se pinta igual, las chapas se
   encienden igual, y la rejilla se queda con las 47.

   Se miden DOS cosas distintas, y separarlas no es pedanteria: hoy fallaron
   las dos por separado y cada una engañaba a la comprobacion de la otra.

   · CAJA — cuantas tarjetas siguen ocupando sitio. Es lo que dice si el
     filtro oculta de verdad. Contando la propiedad `hidden` esto daba verde
     con el buscador roto: la logica marcaba las tarjetas como ocultas y
     `.pieza{display:flex}` le ganaba a `[hidden]` de la hoja del navegador.
   · VISTA — de esas, cuantas se VEN. Las tarjetas entran con un revelado que
     arranca en `opacity:.001`; una pieza que nunca estuvo en pantalla subia
     al primer sitio TRANSPARENTE, asi que el contador decia «2 de 47» con la
     pantalla vacia. Para la caja esa tarjeta contaba como presente.

   Y no se compara contra 47: en un telefono solo se revela lo que cabe en
   pantalla, asi que lo que se exige es que TODA coincidencia se vea. */
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  const fallos = [];
  pg.on('pageerror', (e) => fallos.push('pageerror: ' + e.message));
  await pg.goto(url, { waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => document.querySelector('#vitrina').scrollIntoView());
  await pg.waitForTimeout(900);
  const contar = () => pg.evaluate(() => {
    const p = [...document.querySelectorAll('.rejilla .pieza')];
    const caja = p.filter(n => n.getClientRects().length > 0);
    return { caja: caja.length,
             vista: caja.filter(n => +getComputedStyle(n).opacity > .5).length };
  });
  const hayMando = await pg.evaluate(() => !!document.getElementById('g-q'));
  let todas = null, ken = null, nada = null, aviso = null, chapa = null;
  if (hayMando) {
    todas = await contar();
    await pg.fill('#g-q', 'kenobi'); await pg.waitForTimeout(1200); ken = await contar();
    await pg.fill('#g-q', 'qqqzzz'); await pg.waitForTimeout(800);  nada = await contar();
    aviso = await pg.evaluate(() => !document.getElementById('g-vacio').hidden);
    await pg.fill('#g-q', '');       await pg.waitForTimeout(800);
    chapa = await pg.evaluate(async () => {
      const c = [...document.querySelectorAll('.g-chapa')].find(x => x.dataset.serie);
      if (!c) return null;
      c.click();
      await new Promise(r => setTimeout(r, 1200));
      const p = [...document.querySelectorAll('.rejilla .pieza')];
      const caja = p.filter(n => n.getClientRects().length > 0);
      return { caja: caja.length,
               vista: caja.filter(n => +getComputedStyle(n).opacity > .5).length };
    });
  }
  const mal = fallos.length > 0 || !hayMando ||
              !(todas && todas.caja > 10) ||                    // la rejilla esta
              !(ken && ken.caja > 0 && ken.caja < todas.caja) || // busca y reduce
              !(ken && ken.vista === ken.caja) ||                // y lo que queda SE VE
              !(nada && nada.caja === 0) || !aviso ||            // sin resultados, aviso
              !(chapa && chapa.caja > 0 && chapa.caja < todas.caja) ||
              !(chapa && chapa.vista === chapa.caja);
  if (mal) malo++;
  const d = (o) => o ? o.caja + (o.vista === o.caja ? '' : '/vista ' + o.vista) : '—';
  console.log(`390px mando           todas ${d(todas)}  «kenobi» ${d(ken)}  `
    + `sin resultados ${nada && nada.caja === 0 ? 'sí' : 'NO'}  aviso ${aviso ? 'sí' : 'NO'}  `
    + `chapa ${d(chapa)}  errores ${fallos.length}${mal ? '  ← MAL' : ''}`);
  fallos.forEach(c => console.log('      ' + c));
  await ctx.close();
}


/* ── PASE DE «REDUCIR MOVIMIENTO» ────────────────────────────────────────
   Esta era LA VENTANA CIEGA, y ya se cobro una pieza: un `if (quieto) return;`
   a mitad del guion apagaba todo lo que venia detras —incluida la ficha de
   producto entera—, asi que a quien tiene «Reducir movimiento» encendido
   pulsar una figura no le hacia nada. En iPhone eso son dos toques en
   Accesibilidad; no es un caso raro.

   La compuerta media con JS y sin JS, y ninguno de los dos lo veia: con JS
   estaba bien porque el navegador no pedia reducir movimiento, y sin JS no
   hay ficha que abrir. Falta el tercer caso: CON JS Y SIN MOVIMIENTO.

   Se mide solo a 390 px, que es donde vive esa preferencia. */
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 },
                                     reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  const fallos = [];
  pg.on('pageerror', (e) => fallos.push('pageerror: ' + e.message));
  await pg.goto(url, { waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  const r = await pg.evaluate(() => {
    const b = document.querySelector('.rejilla .pieza');
    if (b) b.click();
    const f = document.getElementById('g-ficha');
    const h3 = f && f.querySelector('h3');
    const caja = h3 && h3.getBoundingClientRect();
    return {
      hayPieza: !!b,
      abre: !!f && !f.hidden,
      nombre: (document.getElementById('g-nom') || {}).textContent || '',
      /* lo que de verdad importa sin movimiento: que el texto este ENTERO y
         en su sitio, no encogido ni empujado fuera por un estado de partida
         que nadie deshizo */
      tituloVisible: !!caja && caja.width > 40 && caja.height > 8,
      precio: (document.getElementById('g-precio') || {}).textContent || '',
      riel: document.querySelectorAll('#g-riel button').length,
    };
  });
  const mal = fallos.length > 0 || !r.hayPieza || !r.abre || !r.nombre ||
              !r.tituloVisible || !r.precio;
  if (mal) malo++;
  console.log(`390px sin-movimiento  abre ${r.abre ? 'sí' : 'NO'}  nombre `
    + `${r.nombre ? 'sí' : 'NO'}  titulo ${r.tituloVisible ? 'sí' : 'NO'}  precio `
    + `${r.precio ? 'sí' : 'NO'}  riel ${r.riel}  errores ${fallos.length}`
    + `${mal ? '  ← MAL' : ''}`);
  fallos.forEach(c => console.log('      ' + c));
  await ctx.close();
}

await nav.close();
servidor.close();
console.log(malo ? `\n${malo} combinaciones mal` : '\nlimpio');
process.exit(malo ? 1 : 0);
