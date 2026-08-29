/* ══════════════════════════════════════════════════════════════════════════
   pruebas-identidad.mjs — que La Sala no vuelva a inventarte gemelos
   ──────────────────────────────────────────────────────────────────────────
   Lo reportó Carlos: «cada vez que salgo y entro a la app me pide volver a
   ingresar con mi nombre y el código, y cada vez que lo hago me pone un nuevo
   usuario en la parte de arriba». En la barra de la sala salían Carlos,
   Carlos y Alguien — los tres eran él.

   Ese defecto NO se ve leyendo el código: se ve entrando, saliendo y
   volviendo a entrar varias veces, que es lo que hace este archivo. Levanta
   una sala de mentiras que apunta lo único que importa —a quién ha visto
   entrar— y maneja el navegador de verdad.

   Corre así, con `dist/` servido en el 8123:
     node build.mjs
     (cd dist && python3 -m http.server 8123 &)
     node sala/pruebas-identidad.mjs
   ═════════════════════════════════════════════════════════════════════════ */
/* Playwright puede estar instalado local o global. Se busca en los dos lados
   antes de rendirse, como hace `herramientas/captura.mjs`.

   ⚠ NO BASTA CON QUE EL MÓDULO IMPORTE. Una instalación de playwright puede
   existir SIN sus navegadores bajados —pasa siempre que alguien hizo
   `npm install` y no `npx playwright install`— y entonces el import va bien y
   el `launch()` truena. Esta prueba llevaba tiempo muerta por eso: encontraba
   el playwright del repo, que no tiene navegador, y ni siquiera intentaba el
   de al lado que sí lo tiene. Ahora la que decide es la que ARRANCA. */
let chromium, navegador;
for(const d of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs',
                '/usr/lib/node_modules/playwright/index.mjs']){
  try{
    const c = (await import(d)).chromium;
    navegador = await c.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
    chromium = c; break;
  }catch(e){ /* el siguiente */ }
}
if(!chromium){
  console.error('No encontré un playwright CON navegador. `npm i -D playwright && npx playwright install chromium`');
  process.exit(1);
}
/* Un servidor de sala de mentiras: se puede probar el ciclo completo de
   entrar/salir/volver sin tocar la sala de producción ni inventar gente en
   ella. Guarda a quién ha visto entrar, que es justo lo que se quiere medir. */
import http from 'node:http';
const vistos = new Map();
const srv = http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if(req.method === 'OPTIONS'){ res.end(); return; }
  const u = new URL(req.url, 'http://x');
  if(u.pathname.endsWith('/entrar')){
    let cuerpo = '';
    req.on('data', d => cuerpo += d);
    req.on('end', () => {
      const y = JSON.parse(cuerpo);
      vistos.set(y.id, y.nombre);
      res.setHeader('content-type','application/json');
      res.end(JSON.stringify({ yo:{ ...y, familia:'persona', color:'#AC27FF', sombra:1 } }));
    });
    return;
  }
  if(u.pathname.endsWith('/hilo')){
    res.setHeader('content-type','application/json');
    const gente = {};
    for(const [id, nombre] of vistos)
      gente[id] = { id, nombre, tipo:'humano', familia:'persona',
                    color:'#AC27FF', sombra:1, visto: Date.now(), estado:'activo' };
    res.end(JSON.stringify({ hilo:[], gente }));
    return;
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise(r => srv.listen(8137, r));

const B = 'http://127.0.0.1:8123/sala/?servidor=http://127.0.0.1:8137';
const b = navegador;                    /* ya arrancó arriba, al escogerlo */
const ctx = await b.newContext({ viewport:{width:390,height:844} });

async function abrir(){ const p = await ctx.newPage();
  const e=[]; p.on('pageerror', x=>e.push(x.message)); p.__errs=e; return p; }

// 1 · primera vez: hay que escribir
let p = await abrir();
await p.goto(B); await p.waitForTimeout(400);
await p.fill('#codigoIn','GRUPAZ'); await p.fill('#nombreIn','Carlos');
await p.click('#bEntrar'); await p.waitForTimeout(600);
console.log('1 · entró:', await p.locator('#puerta').evaluate(e=>e.classList.contains('ida')),
            '· gente:', vistos.size);
await p.close();

// 2 · cerrar y volver a abrir: NO debe pedir nada
p = await abrir();
await p.goto(B); await p.waitForTimeout(900);
console.log('2 · entró SOLO:', await p.locator('#puerta').evaluate(e=>e.classList.contains('ida')),
            '· gente:', vistos.size, [...vistos.values()].join(','));
await p.close();

// 3 · otra vez, y otra: sigue siendo uno
for(const n of [3,4]){
  p = await abrir(); await p.goto(B); await p.waitForTimeout(900);
  console.log(`${n} · entró solo · gente:`, vistos.size);
  await p.close();
}

// 4 · el caso que lo rompía: entrar con el campo del nombre VACÍO
p = await abrir();
await p.goto(B); await p.waitForTimeout(900);
await p.evaluate(() => { localStorage.removeItem('sala'); });   // sin «última sala»
await p.reload(); await p.waitForTimeout(900);
console.log('5 · tras perder la última sala · gente:', vistos.size,
            '·', [...vistos.values()].join(','));
await p.close();

// 5 · salir DE VERDAD sí debe permitir ser otra persona
p = await abrir(); await p.goto(B); await p.waitForTimeout(900);
await p.click('#bLado'); await p.waitForTimeout(350);
await p.click('#bSalir'); await p.waitForTimeout(700);
console.log('6 · tras Salir, pide datos:', !(await p.locator('#puerta').evaluate(e=>e.classList.contains('ida'))));
// tras salir, tocar la sala guardada debe devolverte a SER EL MISMO
await p.click('.sala-guardada .ir'); await p.waitForTimeout(700);
console.log('7 · volver por la lista · gente:', vistos.size, '·', [...vistos.values()].join(','));
// y escribir otro nombre RENOMBRA, no duplica
await p.click('#bLado'); await p.waitForTimeout(300);
await p.click('#bSalir'); await p.waitForTimeout(700);
await p.click('#bOtraSala'); await p.waitForTimeout(200);
await p.fill('#codigoIn','GRUPAZ'); await p.fill('#nombreIn','Palomazi');
await p.click('#bEntrar'); await p.waitForTimeout(700);
console.log('8 · con otro nombre · gente:', vistos.size, '·', [...vistos.values()].join(','));
console.log('errores JS:', p.__errs.length ? p.__errs : 'ninguno');
await b.close(); srv.close();
