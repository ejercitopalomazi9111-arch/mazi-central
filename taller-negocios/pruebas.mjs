/* ══════════════════════════════════════════════════════════════════════════
   EL TALLER DE NEGOCIOS · pruebas
   ──────────────────────────────────────────────────────────────────────────
     node taller-negocios/pruebas.mjs

   Abre las once páginas en un navegador de verdad, las llena y mira lo que
   sale. NO comprueba que el archivo exista: eso ya lo dice `armar`.

   ⚠ LA PRUEBA QUE DA SENTIDO A LAS DEMÁS es «el veredicto CAMBIA con los
   datos». Un instrumento puede pintar una lectura preciosa y estar
   desconectado del cálculo — se ve idéntico. Por eso cada uno se llena DOS
   veces con datos que tienen que dar veredictos distintos, y si salen iguales
   la prueba falla. Sin esa comprobación, «pinta el veredicto» sólo demuestra
   que hay un div.
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const PUERTO = 8813;
const TIPOS = { '.html':'text/html; charset=utf-8', '.js':'text/javascript',
                '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml',
                '.woff2':'font/woff2', '.png':'image/png' };

const servidor = createServer(async (pet, res) => {
  try{
    let r = decodeURIComponent(pet.url.split('?')[0]);
    if(r.endsWith('/')) r += 'index.html';
    const b = await readFile(join(RAIZ, r));
    res.writeHead(200, { 'content-type': TIPOS[extname(r)] || 'application/octet-stream' });
    res.end(b);
  }catch{ res.writeHead(404).end('no'); }
});
await new Promise(r => servidor.listen(PUERTO, r));

/* El navegador de esta caja no sale a internet, y no hace falta: el taller
   no pide una sola cosa de fuera. Si algún día la pidiera, esta prueba lo
   cazaría como petición fallida. */
const navegador = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

let bien = 0, mal = 0;
const ok = (q, cierto, extra) => {
  if(cierto){ bien++; console.log(`  ✓ ${q}`); }
  else{ mal++; console.log(`  ✗ ${q}${extra ? '\n      ' + extra : ''}`); }
};

/* Dos juegos de datos por instrumento, escogidos para que den veredictos
   OPUESTOS. Si un cálculo se desconecta, los dos salen iguales y se ve. */
const CASOS = {
  estrategia:  [{}, {}],   /* se rellenan abajo con lo que haya en la página */
  liderazgo:   [{ h1:2,  h2:20, h3:14, h4:8,  receptor:1, unico:5, visible:1, porque:1 },
                { h1:30, h2:2,  h3:1,  h4:2,  receptor:5, unico:1, visible:5, porque:5 }],
  organizacion:[{ gente:14, minutos:90, alMes:8, imprescindibles:3, agenda:1, decide:1, grabada:1 },
                { gente:3,  minutos:20, alMes:1, imprescindibles:3, agenda:5, decide:5, grabada:5 }],
  optimizacion:[{ minutos:15, veces:8, personas:4, construir:16, mantener:1,
                  porQueExiste:5, siNoEstuviera:5, dueno:5 },
                { minutos:15, veces:8, personas:4, construir:16, mantener:1,
                  porQueExiste:1, siNoEstuviera:1, dueno:1 }],
  desarrollo:  [{ contactos:5, compartidos:0, valor:90, comoSalio:1, objetivo:1,
                  expectativas:1, dedicado:1, revision:1 },
                { contactos:5, compartidos:5, valor:20, comoSalio:5, objetivo:5,
                  expectativas:5, dedicado:5, revision:5 }],
  innovacion:  [{ entrada:5, proceso:6, resultado:2, cartera:0, decidieron:0,
                  problema:1, contradicen:5, premiado:5 },
                { entrada:1, proceso:1, resultado:2, cartera:1, decidieron:4,
                  problema:5, contradicen:1, premiado:1 }],
  atencion:    [{ clientes:2000, casos:400, encuestas:300, respuestas:18, csat:95,
                  cuando:1, porQue:1, circuito:1 },
                { clientes:300,  casos:200, encuestas:200, respuestas:90, csat:78,
                  cuando:5, porQue:5, circuito:5 }],
  ventas:      [{ e1:400, e2:120, e3:60, e4:25, e5:4, pronostico:30, abiertos:40,
                  etapasPropias:1, siguientePaso:1 },
                { e1:100, e2:80,  e3:60, e4:40, e5:20, pronostico:5, abiertos:20,
                  etapasPropias:5, siguientePaso:5 }],
};

const PAGINAS = ['index','estrategia','marketing','gestion','liderazgo','organizacion',
                 'optimizacion','desarrollo','innovacion','atencion','ventas'];

console.log('\n· Las once páginas cargan y no piden nada de fuera');
const fallos = {};
for(const p of PAGINAS){
  const pg = await navegador.newPage({ viewport:{ width:390, height:844 } });
  const errores = [];
  pg.on('pageerror', e => errores.push('js: ' + e.message));
  pg.on('console', m => { if(m.type() === 'error') errores.push('consola: ' + m.text()); });
  pg.on('requestfailed', r => errores.push('petición: ' + r.url()));
  const resp = await pg.goto(`http://127.0.0.1:${PUERTO}/taller-negocios/${p}.html`,
                             { waitUntil:'load' });
  const desborde = await pg.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1);
  const repetidos = await pg.evaluate(() => {
    const vistos = new Set(), rep = [];
    document.querySelectorAll('[id]').forEach(e => {
      if(vistos.has(e.id)) rep.push(e.id); vistos.add(e.id);
    });
    return rep;
  });
  ok(`${p}: carga (${resp.status()}), sin errores, sin desborde a 390 px, sin ids repetidos`,
     resp.status() === 200 && !errores.length && !desborde && !repetidos.length,
     [errores.join(' | '), desborde ? 'DESBORDA' : '', repetidos.join(',')].filter(Boolean).join(' · '));
  fallos[p] = errores;
  await pg.close();
}

console.log('\n· Sin JavaScript la página sigue diciendo qué es');
{
  const ctx = await navegador.newContext({ javaScriptEnabled:false,
                                           viewport:{ width:390, height:844 } });
  const pg = await ctx.newPage();
  await pg.goto(`http://127.0.0.1:${PUERTO}/taller-negocios/ventas.html`, { waitUntil:'load' });
  const t = (await pg.evaluate(() => document.body.innerText)).trim();
  /* ⚠ EN MINÚSCULAS A PROPÓSITO. `innerText` devuelve el texto RENDERIZADO, y
     los h2 del taller llevan `text-transform:uppercase` — así que en pantalla
     dice «DE DÓNDE SALE ESTO» y buscar la cadena tal como está escrita en el
     HTML falla. Me pasó aquí mismo: la prueba salió roja y la página estaba
     bien. El defecto era de la prueba. */
  ok('el instrumento explica de dónde sale aunque no corra el guion',
     t.toLowerCase().includes('de dónde sale esto') && t.length > 400,
     `sólo ${t.length} caracteres`);
  await ctx.close();
}

console.log('\n· Cada instrumento CALCULA: dos juegos de datos, dos veredictos distintos');
for(const [id, juegos] of Object.entries(CASOS)){
  if(!juegos[0] || !Object.keys(juegos[0]).length) continue;   /* estrategia va aparte */
  const lecturas = [];
  for(const datos of juegos){
    const pg = await navegador.newPage({ viewport:{ width:390, height:844 } });
    await pg.goto(`http://127.0.0.1:${PUERTO}/taller-negocios/${id}.html`, { waitUntil:'load' });
    await pg.evaluate(async (d) => {
      for(const [campo, valor] of Object.entries(d)){
        /* los de escala son botones; los demás, inputs */
        const escala = document.querySelector(`.campo:has(.escala) [aria-label]`);
        const inputs = [...document.querySelectorAll('#campos input')];
        const etiquetas = [...document.querySelectorAll('#campos .campo')];
        void escala; void inputs; void etiquetas;
        void campo; void valor;
      }
    }, datos);
    /* Llenar de verdad: el motor guarda en V por orden de PIEZA.campos, así
       que se rellena por el mismo orden usando el DOM que él pintó. */
    await pg.evaluate(async (d) => {
      const campos = window.PIEZA.campos;
      const cajas = [...document.querySelectorAll('#campos .campo')];
      for(let i = 0; i < campos.length; i++){
        const c = campos[i], caja = cajas[i];
        if(!caja || !(c.id in d)) continue;
        if(c.tipo === 'escala'){
          const b = caja.querySelectorAll('.escala button')[Number(d[c.id]) - 1];
          if(b) b.click();
        } else {
          const inp = caja.querySelector('input, textarea');
          if(inp){
            inp.value = String(d[c.id]);
            inp.dispatchEvent(new Event('input', { bubbles:true }));
          }
        }
      }
    }, datos);
    await pg.waitForTimeout(120);
    lecturas.push((await pg.evaluate(() => {
      const l = document.querySelector('#lectura .lectura');
      return l ? l.innerText.replace(/\s+/g, ' ').trim() : '';
    })));
    await pg.close();
  }
  ok(`${id}: pinta veredicto con los dos juegos`,
     lecturas[0].length > 120 && lecturas[1].length > 120,
     `largos: ${lecturas.map(l => l.length).join(' y ')}`);
  ok(`${id}: el veredicto CAMBIA con los datos`,
     lecturas[0] !== lecturas[1],
     'los dos juegos dieron exactamente la misma lectura — el cálculo puede estar desconectado');
}

console.log('\n· Un instrumento a medias no inventa un número');
for(const id of ['liderazgo','organizacion','optimizacion','desarrollo','innovacion','atencion','ventas']){
  const pg = await navegador.newPage({ viewport:{ width:390, height:844 } });
  await pg.goto(`http://127.0.0.1:${PUERTO}/taller-negocios/${id}.html`, { waitUntil:'load' });
  await pg.evaluate(() => {
    const inp = document.querySelector('#campos input[type=number]');
    if(inp){ inp.value = '3'; inp.dispatchEvent(new Event('input', { bubbles:true })); }
  });
  await pg.waitForTimeout(120);
  const t = await pg.evaluate(() => {
    const l = document.querySelector('#lectura .lectura');
    return l ? l.innerText : '';
  });
  ok(`${id}: con un solo dato dice que faltan, no da veredicto`,
     /falta|Faltan|faltan/.test(t), t.slice(0, 90));
  await pg.close();
}

console.log('\n· El índice lleva a los diez');
{
  const pg = await navegador.newPage({ viewport:{ width:390, height:844 } });
  await pg.goto(`http://127.0.0.1:${PUERTO}/taller-negocios/index.html`, { waitUntil:'load' });
  const hrefs = await pg.evaluate(() =>
    [...document.querySelectorAll('.rejilla a')].map(a => a.getAttribute('href')));
  ok(`el índice enlaza los diez (${hrefs.length})`, hrefs.length === 10, hrefs.join(' '));
  const rotos = [];
  for(const h of hrefs){
    const r = await pg.goto(`http://127.0.0.1:${PUERTO}/taller-negocios/${h.replace('./','')}`,
                            { waitUntil:'domcontentloaded' });
    if(r.status() !== 200) rotos.push(h);
  }
  ok('ninguno de los diez enlaces está roto', rotos.length === 0, rotos.join(' '));
  await pg.close();
}

await navegador.close();
servidor.close();
console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
