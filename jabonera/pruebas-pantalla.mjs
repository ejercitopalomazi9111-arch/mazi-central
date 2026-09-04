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
     await pg.isVisible('[data-ir="ajustes"]'));
  ok('los cuatro módulos quedaron expuestos, ninguno se pisó',
     await pg.evaluate(() => !!(globalThis.JABONERA && globalThis.EXCEL && globalThis.DATOS)));
  await ctx.close();
}

console.log('\n══ EN TELÉFONO NO SE DESBORDA ══');
for(const w of [320, 390, 414]){
  const { ctx, pg } = await pagina(w);
  await pg.click('[data-demo="1"]'); await pg.waitForTimeout(300);
  let peor = 0, dondePeor = '';
  for(const tab of ['registrar','analisis','almacen','proyecto','ajustes']){
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
  await pg.fill('#restante', '250');
  await pg.fill('#repuesto', '750');
  await pg.click('#formVisita button[type=submit]');
  await pg.waitForTimeout(300);
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
  await pg.click('.pestanas button[data-tab="ajustes"]'); await pg.waitForTimeout(250);
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
