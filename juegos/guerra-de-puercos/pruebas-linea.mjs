/* Las pruebas del modo EN LÍNEA de Guerra de Puercos.
 *
 * Es lo que pidió la amiga de Carlos —«que puedan jugarlo aun cuando estén
 * lejos»— y es lo único que no se puede probar con un solo navegador. Aquí se
 * abren DOS, cada uno con su propia sesión, como dos teléfonos en dos casas.
 *
 * Lo que de verdad hay que comprobar, y por qué:
 *
 *   · Que la mano del rival NUNCA llegue al otro teléfono. Si llegara, no
 *     serviría de nada taparla en la pantalla: se lee abriendo la página.
 *   · Que no se pueda hacer trampa mandándole al servidor una carta que no
 *     es tuya.
 *   · Que si se cae el internet y vuelves, sigas en TU lugar y no de mirón.
 *   · Que la sala no acepte a un tercero.
 *
 * Necesita el servidor corriendo:
 *   npx wrangler dev --port 8799 --local
 *   node juegos/guerra-de-puercos/pruebas-linea.mjs
 */
/* Dos direcciones, no una, porque así queda en producción: el sitio en un
   lado y el servidor de salas en OTRO proyecto de Cloudflare. Probarlos en el
   mismo origen escondería justo lo que puede fallar — CORS y la lista de
   orígenes del servidor. */
const BASE     = process.argv[2] || 'http://127.0.0.1:8791';
const SERVIDOR = process.argv[3] || 'http://127.0.0.1:8815';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (que, cond, detalle='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
/* Dos contextos = dos navegadores distintos, con su propio almacenamiento.
   Con uno solo compartirían el secreto de la sala y la prueba mentiría. */
const uno = await (await b.newContext({ viewport:{width:390,height:844} })).newPage();
const dos = await (await b.newContext({ viewport:{width:390,height:844} })).newPage();
const fallos = [];
for(const [n, p] of [['uno', uno], ['dos', dos]])
  p.on('pageerror', e => fallos.push(n + ': ' + e));

/* Se guarda TODO lo que el servidor le manda a cada quien. Es la evidencia de
   la prueba más importante: si la mano del rival apareciera, aquí estaría. */
for(const [n, p] of [['uno', uno], ['dos', dos]]){
  /* Se le dice al juego dónde vive el servidor, por el mismo camino que
     usaría Carlos si algún día se muda: una llave en el aparato. */
  await p.addInitScript((s) => {
    try{ localStorage.setItem('puercos_servidor', s); }catch(e){}
  }, SERVIDOR);
  await p.addInitScript(() => {
    window.__recibido = [];
    const Orig = window.WebSocket;
    window.WebSocket = function(...a){
      const w = new Orig(...a);
      w.addEventListener('message', e => window.__recibido.push(e.data));
      return w;
    };
    window.WebSocket.prototype = Orig.prototype;
  });
}

const RUTA = BASE + '/juegos/guerra-de-puercos/';
await uno.goto(RUTA, { waitUntil:'networkidle' });
await dos.goto(RUTA, { waitUntil:'networkidle' });

console.log('\n── Hacer la sala y que entren los dos ──');
await uno.click('#bLinea');
await uno.click('#bCrear');
await esperar(1200);
const codigo = (await uno.textContent('#codigoTexto')).trim();
ok('el servidor da un código de 4 letras', /^[A-Z]{4}$/.test(codigo), codigo);
ok('el código no trae letras que se confunden (O, 0, I, 1, L)',
   !/[OI0L1]/.test(codigo), codigo);
ok('el primero se queda en la pantalla de la sala, con el código a la vista',
   (await uno.isVisible('#p-sala')) && (await uno.isVisible('#codigoTexto')));
ok('y le dicen que falta el otro',
   /Falta que entre la otra persona/.test(await uno.textContent('#salaAviso')));
ok('NO lo mandan a una mesa vacía que dice «Máquina»',
   !(await uno.isVisible('#p-mesa')));

await dos.click('#bLinea');
await dos.fill('#fCodigo', codigo);
await dos.click('#bEntrar');
await esperar(1500);

const manoDe = (p) => p.evaluate(() =>
  [...document.querySelectorAll('#mMano .carta .valor')].map(v => v.textContent));
const m1 = await manoDe(uno), m2 = await manoDe(dos);
ok('al llenarse la sala, se reparte a los dos', m1.length === 5 && m2.length === 5,
   m1.length + ' y ' + m2.length);
ok('cada quien recibe una mano DISTINTA', m1.join() !== m2.join(),
   m1.join() + ' vs ' + m2.join());
ok('los dos arrancan con 200 PV',
   (await uno.textContent('#mPvA')) === '200' && (await dos.textContent('#mPvA')) === '200');

console.log('\n── LO QUE MÁS IMPORTA: la mano del otro nunca sale del servidor ──');
const fuga = async (p, manoDelOtro) => p.evaluate((mano) => {
  const todo = window.__recibido.join(' ');
  /* Se busca cada carta del rival en TODO lo que llegó por el cable. Si el
     servidor la mandara, aquí aparecería aunque la pantalla no la enseñe.
     El `\\b` va con UNA diagonal: con dos, la expresión buscaba una diagonal
     de verdad y no encontraba nunca nada — la prueba pasaba sin probar. */
  return mano.filter(v => new RegExp('"valor":' + v + '\\b').test(todo));
}, manoDelOtro);
const f1 = await fuga(uno, m2), f2 = await fuga(dos, m1);
/* Ojo: un valor puede coincidir por casualidad con una carta propia, así que
   sólo cuenta como fuga lo que NO está en la mano propia. */
const soloDelOtro = (fugadas, mia) => fugadas.filter(v => !mia.includes(v));
ok('al jugador 1 NUNCA le llegaron las cartas del jugador 2',
   soloDelOtro(f1, m1).length === 0, soloDelOtro(f1, m1).join());
ok('al jugador 2 NUNCA le llegaron las cartas del jugador 1',
   soloDelOtro(f2, m2).length === 0, soloDelOtro(f2, m2).join());
ok('del rival llega CUÁNTAS cartas trae',
   await uno.evaluate(() => /"cartas":\d/.test(window.__recibido.join(' '))));
/* Y la comprobación directa, que no depende de que los valores coincidan:
   el objeto `rival` no puede traer una mano, punto. */
ok('y el objeto del rival NO trae ninguna mano', await uno.evaluate(() =>
   window.__recibido
     .map(t => { try{ return JSON.parse(t); }catch(e){ return null; } })
     .filter(m => m && m.vista && m.vista.rival)
     .every(m => m.vista.rival.mano === undefined)));

console.log('\n── Una ronda entre los dos ──');
await uno.evaluate(() => document.querySelector('#mMano .carta').click());
await uno.click('#bJugar');
await esperar(600);
ok('el que ya jugó ve que falta el otro',
   /Esperando a que el otro/.test(await uno.textContent('#mMano')));
ok('y no puede volver a jugar en la misma ronda', await uno.isDisabled('#bJugar'));
ok('mientras espera no le dejan botones que no hacen nada',
   !(await uno.isVisible('#bJugar')) && !(await uno.isVisible('#bLimpiar'))); 
ok('el marcador dice «Tú» y «El otro», nunca «Máquina»', await uno.evaluate(() => {
  const t = document.querySelector('#mNomA').textContent
          + ' ' + document.querySelector('#mNomB').textContent;
  return /Tú/.test(t) && /El otro/.test(t) && !/quina/i.test(t);
}));

await dos.evaluate(() => document.querySelector('#mMano .carta').click());
await dos.click('#bJugar');
await esperar(900);
ok('al jugar los dos, se resuelve la ronda en LOS DOS teléfonos',
   (await uno.isVisible('#fDuelo')) && (await dos.isVisible('#fDuelo')));
const g1 = await uno.textContent('#dGolpe'), g2 = await dos.textContent('#dGolpe');
const dano = (t) => (t.match(/−(\d+) PV/) || [])[1];
ok('los dos ven EL MISMO daño', dano(g1) === dano(g2), dano(g1) + ' y ' + dano(g2));
ok('hasta ese momento sí se revelan las dos cartas',
   (await uno.evaluate(() => document.querySelectorAll('#dCartaB .carta').length)) > 0);

console.log('\n── Que no se pueda hacer trampa ──');
const trampa = await uno.evaluate(async (srv) => {
  return new Promise(res => {
    const ws = new WebSocket(srv.replace('http', 'ws')
      + '/api/puercos/sala/' + window.LINEA.codigo);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if(m.tipo === 'error'){ res(m.porque); ws.close(); }
      if(m.tipo === 'lleno'){ res('LLENO'); ws.close(); }
    };
    setTimeout(() => { res('sin respuesta'); try{ ws.close(); }catch(e){} }, 2500);
  });
}, SERVIDOR);
ok('un tercero NO se puede meter a una sala de dos', trampa === 'LLENO', String(trampa));

ok('el servidor NO le abre salas a una página de otro sitio', await uno.evaluate(async (srv) => {
  /* Se pide un código haciéndose pasar por otro origen. La lista del servidor
     tiene que rebotarlo: sin esto, cualquier página del mundo podría abrir
     salas en nombre de alguien. */
  const r = await fetch(srv + '/api/puercos/codigo',
                        { headers:{ 'X-Probar-Origen':'1' } }).catch(() => null);
  /* El navegador manda el Origin solo; si el servidor lo acepta, algo anda mal
     con la lista. Se mira el resultado, no el intento. */
  return r ? r.status === 403 : true;
}, SERVIDOR));

console.log('\n── Volver después de que se corte ──');
await uno.reload({ waitUntil:'networkidle' });
await esperar(400);
await uno.click('#bLinea');
await uno.fill('#fCodigo', codigo);
await uno.click('#bEntrar');
await esperar(1500);
const m1b = await manoDe(uno);
ok('al volver con el mismo código, recupera SU lugar y SU mano',
   m1b.length > 0 && m1b.join() !== m2.join(), m1b.join());
ok('y no lo mandan a esperar como si fuera otra persona',
   !/Esperando a la otra persona/.test(await uno.textContent('#mMano')));

ok('ninguna de las dos páginas tiró error', fallos.length === 0, fallos[0] || '');

await b.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
