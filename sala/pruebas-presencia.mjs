/* ══════════════════════════════════════════════════════════════════════════
   LA MESA CONTRA UNA SALA DE VERDAD
   ──────────────────────────────────────────────────────────────────────────
   Las 212 pruebas del servidor prueban el servidor. Las de la mesa prueban la
   mesa con datos puestos a mano. **Ninguna de las dos cazó esto:**

       ws = new WebSocket(url + `?de=${encodeURIComponent(yo)}`)

   `yo` es la PERSONA COMPLETA, no su id. Eso no truena: manda literalmente
   `?de=%5Bobject%20Object%5D`. El servidor no encuentra a nadie con ese id, el
   socket nunca se ata a una persona, y como la presencia sale de los sockets
   atados, la mesa pinta a TODOS «sin señal» mientras la esquina dice que hay
   conexión. Es la captura que mandó Carlos: cinco en la sala, «1 en línea».

   La lección: **un id que en realidad es un objeto no se ve leyendo**, porque
   la línea está bien escrita. Sólo se ve cuando las dos mitades se hablan.

   Por eso esto levanta la sala de verdad (`local.mjs`, la misma clase que
   corre en Cloudflare) y la mesa de verdad en un navegador de verdad.

     node build.mjs
     (npx http-server dist -p 8791 &)
     node sala/pruebas-presencia.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const AQUI = dirname(fileURLToPath(import.meta.url));
const MESA = process.env.MESA || 'http://localhost:8791/sala/';
const PUERTO = 8799;
const API = `http://127.0.0.1:${PUERTO}`;

let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra !== undefined ? '\n      ' + extra : '')); }
};

/* ── la sala de verdad ──────────────────────────────────────────────────── */
const sala = spawn('node', [join(AQUI, 'servidor/local.mjs'), String(PUERTO)],
  { env: { ...process.env, LLAVES:'carlos:kc,luis:kl' }, stdio:'ignore' });
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
await dormir(1200);

const api = async (ruta, cuerpo, llave = 'kc') => {
  const r = await fetch(`${API}/api/sala/GRUPAZ/${ruta}`, {
    method: cuerpo ? 'POST' : 'GET',
    headers: { 'content-type':'application/json', 'X-Llave': llave },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return r.json();
};

/* Un fantasma (entró y nunca habló) y alguien que sí habló. */
await api('entrar', { id:'carlos-viejo', nombre:'Carlos', tipo:'humano' });
await api('entrar', { id:'claude-de-luis', nombre:'Claude de Luis', tipo:'agente', motor:'claude' }, 'kl');
await api('decir', { de:'claude-de-luis', texto:'ya subí lo de los encargos' }, 'kl');

const nave = await chromium.launch({ executablePath: CHROME });
const errores = [];
const sospechosas = [];

async function entrar(nombre){
  const ctx = await nave.newContext({ viewport:{ width:390, height:800 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(`${nombre}: ${e.message}`));
  /* ── LA RED ES LA TESTIGO ────────────────────────────────────────────────
     En vez de revisar una por una las llamadas que hoy existen, se vigila la
     forma del defecto: CUALQUIER petición o socket que lleve «[object
     Object]» está mandando una estructura donde va un texto. Así la prueba
     también caza la próxima, que es lo que no logra una prueba por llamada. */
  p.on('request', r => { if(/%5Bobject|\[object/i.test(r.url())) sospechosas.push(r.url()); });
  p.on('websocket', w => { if(/%5Bobject|\[object/i.test(w.url())) sospechosas.push(w.url()); });
  p.on('console', m => { if(/%5Bobject|\[object/i.test(m.text())) sospechosas.push(m.text()); });
  await p.goto(`${MESA}?servidor=${API}&llave=kc`);
  await p.waitForTimeout(700);
  await p.fill('#codigoIn', 'GRUPAZ');
  await p.fill('#nombreIn', nombre);
  await p.click('#bEntrar');
  await p.waitForTimeout(2200);
  return p;
}

console.log('\n■ la mesa contra una sala de verdad');

const A = await entrar('Carlos');
const B = await entrar('Luis');
await A.waitForTimeout(1200);

/* ── 1 · presencia ──────────────────────────────────────────────────────── */
ok('el socket se ata a una persona de verdad',
   await A.evaluate(() => conectados.has(yo.id)),
   'conectados: ' + await A.evaluate(() => [...conectados].join(',')));
ok('y cada quien ve al otro conectado',
   await A.evaluate(() => conectados.size >= 2),
   'conectados: ' + await A.evaluate(() => [...conectados].join(',')));

/* ── 2 · la tira de «está escribiendo» ──────────────────────────────────── */
const tira = () => B.evaluate(() => {
  const c = document.getElementById('escribiendo');
  return { oculto: c.hidden, txt: c.textContent.trim() };
});
ok('con nadie tecleando, la tira no está', (await tira()).oculto === true);

await A.fill('#texto', 'oye, ya vi lo del PR...');
await A.waitForTimeout(1500);
const t1 = await tira();
ok('cuando el otro teclea, aparece con su nombre',
   t1.oculto === false && /Carlos/.test(t1.txt), JSON.stringify(t1));
ok('y uno NO se ve a sí mismo escribiendo',
   await A.evaluate(() => document.getElementById('escribiendo').hidden) === true);

await A.click('#bEnviar');
await A.waitForTimeout(1800);
ok('al enviar, la tira se apaga', (await tira()).oculto === true);
ok('y el mensaje sí llegó al otro',
   await B.evaluate(() => hilo.filter(e => /ya vi lo del PR/.test(e.texto || '')).length) === 1);

/* Vence sola. Sin esto, quien cierra la pestaña a media palabra deja a los
   demás esperando una respuesta que nadie está escribiendo. */
await A.fill('#texto', 'otra cosa');
await A.waitForTimeout(1200);
ok('vuelve a aparecer al teclear de nuevo', (await tira()).oculto === false);
await A.evaluate(() => { document.getElementById('texto').value = ''; });
await B.waitForTimeout(9000);
ok('y se apaga sola a los pocos segundos, sin que nadie avise',
   (await tira()).oculto === true);

/* ── 3 · barrer un fantasma desde el teléfono ───────────────────────────── */
const panel = async (p, id) => p.evaluate((x) => {
  verPantalla(x); return document.getElementById('pantallaCaja').innerText;
}, id);

const pFantasma = await panel(A, 'carlos-viejo');
ok('al fantasma se le ofrece quitarlo', /Quitar de la sala/i.test(pFantasma));

const pHabló = await panel(A, 'claude-de-luis');
ok('a quien SÍ habló no se le ofrece, y se dice por qué',
   !/Quitar de la sala/i.test(pHabló) && /particip/i.test(pHabló));

const pYo = await panel(A, await A.evaluate(() => yo.id));
ok('y a uno mismo tampoco', !/Quitar de la sala/i.test(pYo));

A.on('dialog', d => d.accept());
await A.evaluate(() => verPantalla('carlos-viejo'));
await A.waitForTimeout(300);
await A.click('[data-barrer="carlos-viejo"]');
await A.waitForTimeout(1500);
ok('el fantasma se va', await A.evaluate(() => !gente['carlos-viejo']));
ok('el panel se cierra solo',
   await A.evaluate(() => !document.getElementById('pantalla').classList.contains('abierta')));
const cuantosQuedan = await A.evaluate(() => hilo.filter(e => (e.texto || '').trim()).length);
ok('y el hilo no pierde ningún mensaje', cuantosQuedan === 2, 'quedan: ' + cuantosQuedan);
ok('el otro navegador también lo ve irse',
   await B.evaluate(() => !gente['carlos-viejo']));

/* El servidor es el que manda: aunque alguien fuerce el botón, el que habló
   se queda. Se pide directo para probar la regla y no el escondite del botón. */
const no = await api('echar', { de: await A.evaluate(() => yo.id), id:'claude-de-luis' });
ok('forzarlo contra quien habló lo rechaza el servidor', !!no.error, JSON.stringify(no));

/* ── 4 · una llave NO pisa a la otra en silencio ────────────────────────
   El reporte de Carlos, textual: «entré con mi link en otro navegador y valió,
   me mete como Luis». Cualquier link con `?llave=` reemplazaba la llave
   guardada sin preguntar y sin poder deshacerlo — y como la página borra el
   `?llave=` de la barra, después no quedaba ni rastro de qué había pasado.
   Basta abrir una vez el link de invitación recién acuñado, aunque sea para
   ver si sirve, y dejas de ser el dueño de tu propia sala. */
{
  const ctx = await nave.newContext({ viewport:{ width:390, height:800 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push('llaves: ' + e.message));

  /* Entra como carlos y se queda con su llave. */
  await p.goto(`${MESA}?servidor=${API}&llave=kc`);
  await p.waitForTimeout(700);
  await p.fill('#codigoIn', 'GRUPAZ'); await p.fill('#nombreIn', 'Carlos'); await p.click('#bEntrar');
  await p.waitForTimeout(2200);
  ok('entra con su llave y es quien debe ser',
     await p.evaluate(() => estadoSala.yoSoy) === 'carlos');
  ok('y sin llave anterior no se avisa nada',
     await p.evaluate(() => document.getElementById('cambioLlave').hidden) === true);

  /* Y ahora abre, en el MISMO navegador, un link con la llave de luis. */
  await p.goto(`${MESA}?servidor=${API}&llave=kl&sala=GRUPAZ`);
  await p.waitForTimeout(2600);
  ok('la llave del link sí entra (el link que se explica solo sigue sirviendo)',
     await p.evaluate(() => estadoSala.yoSoy) === 'luis');

  const aviso = await p.evaluate(() => {
    const c = document.getElementById('cambioLlave');
    return { oculto: c.hidden, txt: c.textContent.replace(/\s+/g,' ').trim() };
  });
  ok('pero se AVISA, en vez de cambiarte de cuenta callado',
     aviso.oculto === false, JSON.stringify(aviso));
  ok('y el aviso dice como QUIÉN quedaste', /luis/.test(aviso.txt), aviso.txt);

  /* Lo que convertía el susto en pérdida: no había vuelta. */
  ok('hay botón para volver a la llave de antes',
     await p.evaluate(() => !!document.getElementById('bVolverLlave')));
  ok('y la llave anterior quedó guardada, no pisada',
     await p.evaluate(() => localStorage.getItem('salaLlaveAnterior')) === 'kc');

  /* La otra mitad del daño: «Este es tu link» seguía diciendo «tuyo» con la
     llave del otro adentro, así que le repartías a alguien la llave de Luis
     creyendo que era la tuya. */
  const hoja = await p.evaluate(async () => {
    await abrirLlaves();
    return document.getElementById('llavesCaja').textContent.replace(/\s+/g,' ');
  });
  ok('la hoja de llaves dice de QUIÉN es la llave puesta',
     /entra como luis/i.test(hoja), hoja.slice(0, 200));
  ok('y ya no la llama «tu link» a secas', !/Este es tu link/i.test(hoja));

  /* Se usa el botón de la hoja porque la hoja está abierta encima del letrero.
     Es el mismo camino de vuelta, y así se prueban los dos botones. */
  ok('la hoja también ofrece volver',
     await p.evaluate(() => !!document.getElementById('bVolverLlave2')));
  await p.click('#bVolverLlave2');
  await p.waitForTimeout(2600);
  ok('y al volver, uno vuelve a ser quien era',
     await p.evaluate(() => estadoSala.yoSoy) === 'carlos',
     'yoSoy: ' + await p.evaluate(() => estadoSala.yoSoy));
  await ctx.close();
}

/* ── 5 · la forma del defecto, en toda la sesión ────────────────────────── */
ok('ninguna petición mandó un objeto donde iba un id',
   sospechosas.length === 0, sospechosas.slice(0, 3).join('\n      '));
ok('y no hubo un solo error de JavaScript',
   errores.length === 0, errores.join('\n      '));

await nave.close();
sala.kill();
console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
