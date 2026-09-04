/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · LAS PRUEBAS DE PANTALLA
   ──────────────────────────────────────────────────────────────────────────
   `pruebas.mjs` comprueba la aritmética; esto comprueba lo que la aritmética
   no puede ver. Y no es teoría: TODO LO QUE HAY AQUÍ ESTUVO ROTO, y ninguna
   de las 61 pruebas del motor se enteró.

     · los tres módulos declaraban `const API` y, como se cargan con <script>
       clásico, el segundo reventaba y la página salía EN BLANCO. En node no
       pasaba porque ahí cada archivo tiene su ámbito;
     · los campos del jabón en barra salían con el producto en líquido: el
       `[hidden]` del navegador pierde contra un `display:grid` de clase;
     · la tabla de entregas partía cada celda en cuatro renglones en teléfono.

   Requiere playwright.  node jabonera/pruebas-pantalla.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const T = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
            '.css':'text/css; charset=utf-8' };
const srv = http.createServer(async (q,r) => {
  let p = decodeURIComponent(new URL(q.url,'http://x').pathname);
  if(p === '/') p = '/index.html';
  try{ const d = await readFile(join(DIR,p));
       r.setHeader('content-type', T[extname(p)] || 'application/octet-stream'); r.end(d); }
  catch(e){ r.statusCode = 404; r.end('no'); }
});
await new Promise(r => srv.listen(0,'127.0.0.1',r));
const P = srv.address().port;

let nav = null;
for(const d of ['playwright','/opt/node22/lib/node_modules/playwright/index.mjs',
                '/usr/lib/node_modules/playwright/index.mjs']){
  try{ nav = await (await import(d)).chromium.launch(); break; }catch(e){}
}
if(!nav){ console.log('  · sin navegador instalado: estas pruebas se saltan'); process.exit(0); }

let bien = 0, mal = 0;
const ok = (que, cond, det='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (det ? '\n      → ' + det : '')); }
};

/* Cada bloque abre una pestaña LIMPIA: si compartieran `localStorage`, una
   prueba dependería del orden de la anterior. */
async function pagina(ancho = 414){
  const ctx = await nav.newContext({ viewport:{ width:ancho, height:896 },
    deviceScaleFactor:2, locale:'es-MX' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if(m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto(`http://127.0.0.1:${P}/`, { waitUntil:'networkidle' });
  await pg.waitForTimeout(200);
  return { ctx, pg, errs };
}

console.log('\n══ LA PÁGINA ABRE Y NO SE CAE ══');
{
  const { ctx, pg, errs } = await pagina();
  ok('carga sin un solo error de JavaScript', errs.length === 0, errs.join(' · '));
  ok('con todo vacío ofrece una salida en vez de una pantalla muerta',
     await pg.isVisible('#p-inicio [data-abrir-ajustes]'));
  ok('los cinco módulos quedaron expuestos, ninguno se pisó',
     await pg.evaluate(() => !!(globalThis.JABONERA && globalThis.EXCEL && globalThis.DATOS && globalThis.REPORTE)));

  /* ── LA DISCIPLINA TIPOGRÁFICA, MEDIDA EN PANTALLA ──
     No basta con declararla en el CSS: lo que cuenta es lo que se renderiza.
     El diagnóstico de la v1 salió de bajar el CSS de stripe.com y contar:
     ellos usan SIETE tamaños y CINCO pesos, y su tipo de display llega a
     48 px. La v1 tenía TRECE tamaños, OCHO pesos y su mayor era 26 px — por
     eso se veía a panel de administración y no a producto. */
  const tipo = await pg.evaluate(() => {
    const tam = new Set(), pes = new Set();
    for(const el of document.querySelectorAll('*')){
      const r = el.getBoundingClientRect();
      if(!r.width || !r.height) continue;
      if(!el.textContent || !el.textContent.trim() || el.children.length) continue;
      const s = getComputedStyle(el);
      tam.add(Math.round(parseFloat(s.fontSize)));
      pes.add(s.fontWeight);
    }
    return { tam:[...tam].sort((a,b)=>a-b), pes:[...pes].sort() };
  });
  ok(`la escala no pasa de 8 tamaños — usa ${tipo.tam.length}: ${tipo.tam.join(', ')}`,
     tipo.tam.length <= 8, 'Stripe usa 7; la v1 de esto usaba 13 y por eso parecía un panel');
  ok(`los pesos no pasan de 5 — usa ${tipo.pes.length}: ${tipo.pes.join(', ')}`,
     tipo.pes.length <= 5, 'la v1 usaba 8, con 620/650/730/750 inventados');
  ok(`hay un tamaño de DISPLAY de 44 px o más — el mayor es ${Math.max(...tipo.tam)} px`,
     Math.max(...tipo.tam) >= 44, 'sin display todo es interfaz y nada es producto');
  await ctx.close();
}

console.log('\n══ LA PIEL: NINGUNA VARIABLE MUERTA, TIPO CARGADO, ESQUINA VIVA ══');
{
  const { ctx, pg } = await pagina();
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(400);

  /* ⚠ ESTO YA SE ROMPIÓ. Al cambiar la paleta quedaron `var(--agua)` sueltas
     en estilos EN LÍNEA de `app.js`. Una variable que no existe no da error:
     la propiedad se queda sin valor. El resultado fue un chip con texto
     blanco sobre fondo transparente — ILEGIBLE — y ninguna prueba se enteró
     porque la página cargaba sin un solo error de JavaScript. */
  /* ⚠ SE RECORREN TODAS LAS PESTAÑAS, no sólo la abierta. La primera versión
     de esta prueba miraba únicamente el panel visible y por eso NO cazó la
     mutación de prueba: el chip roto vivía en «Registrar». Una comprobación
     que no llega hasta el defecto no lo comprueba. */
  const mirarTodo = async (fn) => {
    const junto = [];
    for(const tab of ['inicio','registrar','analisis','almacen','proyecto']){
      await pg.click(`.pestanas button[data-tab="${tab}"]`); await pg.waitForTimeout(260);
      junto.push(...await pg.evaluate(fn));
      if(tab === 'registrar' && await pg.$('#p-registrar .ficha')){
        await pg.click('#p-registrar .ficha'); await pg.waitForTimeout(260);
        junto.push(...await pg.evaluate(fn));
        await pg.click('[data-paso="1"]').catch(()=>{}); await pg.waitForTimeout(200);
      }
    }
    /* ⚠ Y TAMBIÉN LOS SUBMENÚS. Al meter Proyecto y Ajustes en menús, la
       mitad de la interfaz dejó de estar en pantalla al primer vistazo: si
       la prueba no entra, deja de comprobar justo lo que nadie mira. */
    for(const [tab, subs] of [['proyecto', ['reporte','steam','dispensador','metodo','limites']],
                              ['ajustes',  ['escuela','aparato','banos','productos','mediciones','respaldo','demo']]]){
      await pg.click(`.pestanas button[data-tab="${tab}"]`).catch(async () => {
        await pg.click('[data-abrir-ajustes]'); });
      await pg.waitForTimeout(220);
      for(const s of subs){
        const b = await pg.$(`[data-sub="${s}"]`); if(!b) continue;
        await b.click(); await pg.waitForTimeout(200);
        junto.push(...await pg.evaluate(fn));
        await pg.click('[data-sub="atras"]').catch(()=>{}); await pg.waitForTimeout(160);
      }
    }
    return [...new Set(junto)];
  };

  const muertas = await mirarTodo(() => {
    const raiz = getComputedStyle(document.documentElement);
    const malas = new Set();
    for(const el of document.querySelectorAll('[style]')){
      for(const v of (el.getAttribute('style').match(/var\(--[a-z0-9-]+\)/g) || [])){
        const nombre = v.slice(4, -1);
        if(!raiz.getPropertyValue(nombre).trim()) malas.add(nombre);
      }
    }
    return [...malas];
  });
  ok('ningún estilo en línea usa una variable de color que ya no existe',
     muertas.length === 0, muertas.join(', '));

  /* Contraste real de todo texto contra el fondo que le toca: es lo que
     habría cazado el chip ilegible aunque la variable sí existiera. */
  const flojos = await mirarTodo(() => {
    const lum = ([R,G,B]) => { const f=v=>{v/=255; return v<=.03928? v/12.92 : Math.pow((v+.055)/1.055,2.4);};
      return .2126*f(R)+.7152*f(G)+.0722*f(B); };
    const nums = s => (s.match(/[\d.]+/g) || []).map(Number);
    const rgb = s => { const n = nums(s); return [n[0]||0, n[1]||0, n[2]||0]; };
    /* ⚠ LA ALFA SE LEE, NO SE ADIVINA CON UN REGEX. La primera versión daba
       por transparente todo lo que terminara en «, 0)» — y eso casa también
       con cualquier color cuyo canal AZUL sea cero. `rgb(138, 90, 0)` —el
       ámbar de las etiquetas— se contaba como transparente, la prueba subía
       al padre claro y reportaba 1.04:1 sobre texto blanco cuando el
       contraste real es 5.93:1. La compuerta mentía, no el diseño. */
    const alfa = s => { const n = nums(s); return n.length < 4 ? 1 : n[3]; };
    /* ⚠ UN BLANCO TRANSLÚCIDO SOBRE ÍNDIGO NO ES BLANCO. La versión anterior
       tomaba el primer fondo con alfa > 0.05 y se quedaba con su RGB tal
       cual: un botón de `rgba(255,255,255,.18)` sobre índigo se medía como
       blanco puro y daba 1.00:1 contra su texto blanco. Ahora las capas se
       COMPONEN una sobre otra hasta llegar a un fondo opaco, que es lo que
       de verdad ve el ojo. */
    const fondoDe = el => {
      const capas = []; let n = el;
      while(n && n !== document.documentElement){
        const b = getComputedStyle(n).backgroundColor;
        const a = b ? alfa(b) : 0;
        if(a > 0.004){ capas.push([rgb(b), a]); if(a >= 0.999) break; }
        n = n.parentElement;
      }
      let out = [255,255,255];
      for(let i = capas.length - 1; i >= 0; i--){
        const [c, a] = capas[i];
        out = [0,1,2].map(k => c[k]*a + out[k]*(1-a));
      }
      return out; };
    const malos = [];
    for(const el of document.querySelectorAll('button, a, h1, h2, h3, p, span, td, th, label, li')){
      if(el.children.length || !el.textContent.trim()) continue;
      const r = el.getBoundingClientRect(); if(!r.width || !r.height) continue;
      const s = getComputedStyle(el);
      if(parseFloat(s.opacity) < .3) continue;
      const c = rgb(s.color), f = fondoDe(el);
      const [hi, lo] = lum(c) > lum(f) ? [lum(c), lum(f)] : [lum(f), lum(c)];
      const razon = (hi + .05) / (lo + .05);
      const grande = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
      if(razon < (grande ? 3 : 4.5))
        malos.push(`${el.textContent.trim().slice(0,24)} → ${razon.toFixed(2)}:1`);
    }
    return malos;
  });
  ok('todo el texto pasa el contraste mínimo contra el fondo que le toca',
     flojos.length === 0, flojos.slice(0,4).join(' · '));

  ok('IBM Plex Sans cargó de verdad (no se cayó al tipo del sistema)',
     await pg.evaluate(() => document.fonts.check('16px Plex')));
  /* Los números conservan `tabular-nums` aunque ya no vayan en
     monoespaciada: sin eso, una columna de cifras baila y deja de poder
     compararse de un vistazo, que es para lo que existe. */
  ok('los números llevan cifras tabulares, para poder compararse en columna',
     await pg.evaluate(() => {
       const v = document.querySelector('.dato .v') || document.querySelector('.num');
       return !!v && /tabular-nums/.test(getComputedStyle(v).fontVariantNumeric);
     }));

  /* ⚠ ESTA REGLA CAMBIÓ DE DUEÑO. En la v3 la comprobación exigía radio 0
     —la disciplina de IBM Carbon—. Carlos mandó seis referencias y las seis
     van al revés: esquinas muy redondeadas. La compuerta sigue el diseño
     vigente, no el anterior; y sigue siendo una regla que se puede romper
     sin querer y que nadie ve hasta que la lámina se ve barata. */
  const cuadrados = await mirarTodo(() => {
    const malos = [];
    for(const el of document.querySelectorAll('button.b, .tarjeta, .dato, input, .aviso, .etq, .ficha')){
      const r = el.getBoundingClientRect(); if(!r.width) continue;
      const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      if(rad < 12) malos.push((el.className||el.tagName) + ' → ' + rad + 'px');
    }
    return [...new Set(malos)];
  });
  ok('todo lleva esquina redondeada de 12 px o más, como las referencias',
     cuadrados.length === 0, cuadrados.slice(0,3).join(' · '));
  await ctx.close();
}

console.log('\n══ LA PORTADA ABRE COMO PRODUCTO, NO COMO FORMULARIO ══');
{
  const { ctx, pg } = await pagina();
  ok('lo primero que se ve es el campo de marca, no un formulario',
     await pg.isVisible('.campo-marca'));
  ok('con el rótulo de la marca en tamaño de display',
     await pg.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.marca')).fontSize) >= 44));
  const campos = await pg.evaluate(() => document.querySelectorAll('#p-inicio input, #p-inicio select').length);
  ok('y CERO campos de texto en la primera pantalla', campos === 0, `hay ${campos}`);
  ok('Ajustes se alcanza desde la portada aunque ya esté todo configurado',
     await pg.evaluate(async () => {
       document.querySelector('[data-demo]').click();
       await new Promise(r => setTimeout(r, 400));
       const b = document.querySelector('#p-inicio [data-abrir-ajustes]');
       return !!b && b.getBoundingClientRect().height > 0;
     }));
  await ctx.close();
}

console.log('\n══ EN TELÉFONO NO SE DESBORDA ══');
for(const w of [320, 390, 414]){
  const { ctx, pg } = await pagina(w);
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(300);
  let peor = 0, dondePeor = '';
  for(const tab of ['inicio','registrar','analisis','almacen','proyecto']){
    await pg.click(`.pestanas button[data-tab="${tab}"]`); await pg.waitForTimeout(250);
    const d = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if(d > peor){ peor = d; dondePeor = tab; }
  }
  ok(`a ${w} px ninguna pestaña obliga a desplazar la página de lado`,
     peor <= 1, `se pasa ${peor} px en «${dondePeor}»`);
  await ctx.close();
}

console.log('\n══ EL DEDO ALCANZA ══');
{
  const { ctx, pg } = await pagina(390);
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(300);
  const chicos = await pg.evaluate(() => {
    const malos = [];
    for(const el of document.querySelectorAll('button, input, select, a')){
      const r = el.getBoundingClientRect();
      if(r.width === 0 && r.height === 0) continue;
      if(r.height < 44) malos.push((el.tagName + ' ' + (el.textContent||el.type||'').trim()).slice(0,40)
                                   + ' → ' + Math.round(r.height) + 'px');
    }
    return malos;
  });
  ok('todo lo que se toca mide 44 px o más de alto', chicos.length === 0, chicos.slice(0,4).join(' · '));
  const zoom = await pg.evaluate(() => [...document.querySelectorAll('input, select')]
    .filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).length);
  ok('ningún campo baja de 16 px (por debajo, iOS hace zoom solo y se pierde el sitio)', zoom === 0,
     `${zoom} campos con letra menor`);
  await ctx.close();
}

console.log('\n══ SE PUEDE REGISTRAR, Y LO REGISTRADO SOBREVIVE ══');
{
  const { ctx, pg } = await pagina();
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(300);
  const antes = await pg.evaluate(() => JSON.parse(localStorage.getItem('jabonera.v1')).visitas.length);
  /* El recorrido: elegir baño → los dos números → ver lo que se calcula. */
  await pg.click('.pestanas button[data-tab="registrar"]'); await pg.waitForTimeout(300);
  ok('el paso 1 pide el baño con fichas, no con una lista de campos',
     (await pg.$$('#p-registrar .ficha')).length > 0 &&
     (await pg.$$('#p-registrar input')).length === 0);
  await pg.click('#p-registrar .ficha'); await pg.waitForTimeout(300);
  await pg.fill('#restante', '250');
  await pg.fill('#repuesto', '750');
  await pg.click('#formVisita button[type=submit]');
  await pg.waitForTimeout(400);
  const previo = await pg.innerText('#p-registrar');
  ok('el paso 3 enseña lo que se va a calcular ANTES de guardar',
     /Se gastó desde la última visita|todavía no se puede|sin registrarlo/i.test(previo), previo.slice(0,110));
  ok('y todavía no ha guardado nada', await pg.evaluate(
     () => JSON.parse(localStorage.getItem('jabonera.v1')).visitas.length) === antes);
  await pg.click('[data-guardar]');
  await pg.waitForTimeout(400);
  const despues = await pg.evaluate(() => JSON.parse(localStorage.getItem('jabonera.v1')).visitas.length);
  ok('guardar una medición añade exactamente una visita', despues === antes + 1, `${antes} → ${despues}`);
  const ultima = await pg.evaluate(() => {
    const v = JSON.parse(localStorage.getItem('jabonera.v1')).visitas;
    return v[v.length-1];
  });
  ok('y guarda los dos números en unidad canónica',
     ultima.restante === 250 && ultima.repuesto === 750,
     JSON.stringify({ r:ultima.restante, p:ultima.repuesto }));
  await pg.reload({ waitUntil:'networkidle' }); await pg.waitForTimeout(300);
  const tras = await pg.evaluate(() => JSON.parse(localStorage.getItem('jabonera.v1')).visitas.length);
  ok('y sigue ahí después de recargar la página', tras === despues);
  await ctx.close();
}

console.log('\n══ LOS CAMPOS QUE DEPENDEN DEL TIPO ══');
{
  const { ctx, pg } = await pagina();
  /* Desde la portada, y no desde el engrane de la cabecera: en la portada la
     cabecera va escondida, así que si Ajustes sólo viviera ahí no habría
     puerta. Eso estuvo roto y lo cazó esta prueba. */
  await pg.click('#p-inicio [data-abrir-ajustes]'); await pg.waitForTimeout(300);
  /* Ahora Ajustes abre como MENÚ y cada cosa vive en su sub-pantalla: la
     prueba tiene que entrar, igual que una persona. */
  ok('Ajustes abre como menú de renglones y no como una pila de tarjetas',
     (await pg.$$('#p-ajustes .renglon')).length >= 5 &&
     (await pg.$$('#p-ajustes input')).length === 0);
  await pg.click('[data-sub="productos"]'); await pg.waitForTimeout(300);
  ok('con producto LÍQUIDO, los campos de la barra están escondidos',
     (await pg.isVisible('#soloSolido')) === false);
  await pg.selectOption('#pTip', 'solido'); await pg.waitForTimeout(200);
  ok('con producto EN BARRA, aparecen', (await pg.isVisible('#soloSolido')) === true);
  await ctx.close();
}

console.log('\n══ EL ANÁLISIS NO HABLA ANTES DE TIEMPO ══');
{
  const { ctx, pg } = await pagina();
  /* Un baño, un producto y UNA SOLA visita: no hay resta posible. */
  await pg.evaluate(() => {
    localStorage.setItem('jabonera.v1', JSON.stringify({ version:1,
      escuela:{}, dispensador:{},
      banos:[{ id:'b', nombre:'Único', alumnos:10 }],
      productos:[{ id:'p', nombre:'Líquido', tipo:'liquido', tamanoEnvase:5000 }],
      visitas:[{ id:'v', ts:Date.now(), banoId:'b', productoId:'p', restante:500, repuesto:0 }],
      entregas:[] }));
  });
  await pg.reload({ waitUntil:'networkidle' });
  await pg.click('.pestanas button[data-tab="analisis"]'); await pg.waitForTimeout(300);
  const txt = await pg.innerText('#p-analisis');
  ok('con una sola visita dice que aún no hay consumo, en vez de dibujar un cero',
     /todavía no hay consumo/i.test(txt), txt.slice(0,90));
  ok('y explica por qué (el consumo es una resta entre DOS visitas)',
     /resta entre dos visitas/i.test(txt));
  await ctx.close();
}

console.log('\n══ EL EXCEL SE DESCARGA Y ES UN ARCHIVO DE VERDAD ══');
{
  const ctx = await nav.newContext({ viewport:{width:414,height:896}, acceptDownloads:true, locale:'es-MX' });
  const pg = await ctx.newPage();
  await pg.goto(`http://127.0.0.1:${P}/`, { waitUntil:'networkidle' });
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(300);
  await pg.click('.pestanas button[data-tab="analisis"]'); await pg.waitForTimeout(300);
  const [bajada] = await Promise.all([ pg.waitForEvent('download'), pg.click('[data-excel="1"]') ]);
  const ruta = await bajada.path();
  const buf = await readFile(ruta);
  ok('el archivo se llama .xlsx', /\.xlsx$/.test(bajada.suggestedFilename()), bajada.suggestedFilename());
  ok('y empieza por «PK», que es lo que hace que Excel lo abra',
     buf[0] === 0x50 && buf[1] === 0x4B, `empieza por ${buf[0]},${buf[1]}`);
  ok('trae las nueve hojas dentro', (buf.toString('latin1').match(/xl\/worksheets\/sheet/g)||[]).length >= 9);
  ok('y el aviso de datos de demostración viaja DENTRO del archivo',
     /DATOS DE DEMOSTRACI/.test(buf.toString('utf8')));
  await ctx.close();
}

console.log('\n══ EL REPORTE EN FORMATO REMBRANDT ══');
{
  const ctx = await nav.newContext({ viewport:{width:414,height:896}, acceptDownloads:true, locale:'es-MX' });
  const pg = await ctx.newPage();
  await pg.goto(`http://127.0.0.1:${P}/`, { waitUntil:'networkidle' });
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(400);
  await pg.click('.pestanas button[data-tab="proyecto"]'); await pg.waitForTimeout(400);
  /* El generador vive dentro del submenú «Reporte», igual que para una
     persona: la prueba entra por donde se entra. */
  await pg.click('[data-sub="reporte"]'); await pg.waitForTimeout(300);
  const [bajada] = await Promise.all([ pg.waitForEvent('download'), pg.click('[data-reporte="1"]') ]);
  const crudo = await readFile(await bajada.path(), 'utf8');
  const lista = JSON.parse(crudo);
  ok('se descarga un .json', /\.json$/.test(bajada.suggestedFilename()));
  /* La herramienta `reportes/` importa un ARRAY y exige `id` en cada uno:
     `lista.forEach(x => { if(x && x.id && !tengo.has(x.id)) … })`. Si esto
     deja de ser un array con id, la importación se traga el archivo sin
     decir nada — que es la peor forma de fallar. */
  ok('con la forma que importa la herramienta de reportes: array con id',
     Array.isArray(lista) && lista.length === 1 && !!lista[0].id);
  for(const campo of ['tipo','titulo','fecha','cuerpo','autor','lugar'])
    ok(`trae el campo «${campo}»`, lista[0][campo] !== undefined);
  ok('el cuerpo usa la marcación de apartados de esa herramienta (## …)',
     /^## I\. Datos del proyecto/m.test(lista[0].cuerpo));
  ok('e incluye el apartado de limitaciones, que es el que un sinodal pregunta',
     /Alcance y limitaciones/.test(lista[0].cuerpo));
  ok('y la advertencia de datos de demostración viaja dentro',
     /DATOS DE DEMOSTRACIÓN/.test(lista[0].cuerpo));
  await ctx.close();
}

console.log('\n══ EL ARCHIVO SUELTO (el que va en la memoria USB) ══');
{
  const { execFileSync } = await import('node:child_process');
  const ruta = join(DIR, 'jabonera.html');
  let previo = null;
  try{ previo = await readFile(ruta, 'utf8'); }catch(e){}
  execFileSync(process.execPath, [join(DIR, 'armar-suelto.mjs')], { stdio:'pipe' });
  const ahora = await readFile(ruta, 'utf8');
  /* La fecha del encabezado cambia cada día; se ignora para comparar. */
  const sinFecha = t => t && t.replace(/armar-suelto\.mjs · \d{4}-\d{2}-\d{2}/, '');
  ok('`jabonera.html` está al día (si falla: `node jabonera/armar-suelto.mjs`)',
     previo != null && sinFecha(previo) === sinFecha(ahora));
  ok('no le quedó ninguna referencia a un archivo de fuera',
     !/(src|href)="(motor|excel|datos|app)\.js"|href="estilo\.css"/.test(ahora));

  const ctx = await nav.newContext({ viewport:{width:414,height:896}, locale:'es-MX' });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  /* `file://` a propósito: es exactamente como se va a abrir en el salón, y
     es donde fallaría un módulo ES o un recurso externo. */
  await pg.goto('file://' + ruta);
  await pg.waitForTimeout(500);
  ok('abre desde file:// sin un solo error', errs.length === 0, errs.join(' · '));
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(400);
  await pg.click('.pestanas button[data-tab="analisis"]'); await pg.waitForTimeout(400);
  ok('y el análisis funciona igual que servido por web',
     /Qué baño gasta más/.test(await pg.innerText('#p-analisis')));
  await ctx.close();
}

console.log(`\n${bien} bien · ${mal} mal\n`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
