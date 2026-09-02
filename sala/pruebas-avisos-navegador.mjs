/* ══════════════════════════════════════════════════════════════════════════
   pruebas-avisos-navegador.mjs — el tramo del NAVEGADOR de los avisos
   ──────────────────────────────────────────────────────────────────────────
   `sala/servidor/pruebas-push.mjs` prueba el lado del servidor: que la firma
   valga, que las cabeceras sean las que pide la especificación. Esto prueba
   el otro lado, el que vive en `sala/index.html`, y lo prueba CORRIÉNDOLO en
   un Chromium de verdad — porque es el lado donde un fallo no se ve: la
   pantalla sigue diciendo «avisos encendidos».

   ⚠ LO QUE NO SE PUEDE PROBAR AQUÍ, dicho antes que los ✓. Son dos cosas y
   las dos son del contenedor, no del código:

     1. `subscribe()` habla con el servicio de push del navegador (FCM), que
        aquí no existe. La suscripción NO llega a completarse — y eso es justo
        lo que se aprovecha: se comprueba que al fallar **degrada** en vez de
        reventar, que es el caso que de verdad iba a pasarle a Carlos si no
        había https o si el servicio contestaba mal.

     2. Este Chromium NO SABE DE NOTIFICACIONES: `Notification.permission`
        dice `denied` pase lo que pase, y `grantPermissions` no lo cambia —se
        midió, no se supone—. Así que el permiso se finge con un `Notification`
        de mentiras puesto ANTES de que cargue la página. Lo que se finge es el
        PERMISO DEL APARATO, que es cosa del sistema operativo; todo lo demás
        —el botón, `pedirAvisos`, `apuntarAPush`, el service worker, la
        petición al servidor— es el código de verdad.

   Lo que sí queda demostrado:
     · el service worker SE REGISTRA y toma el alcance /sala/
     · la página LE PIDE la llave pública al servidor de la sala
     · un fallo del push NO tumba la página ni los avisos con la app abierta
     · la vuelta de base64url es exacta — de eso depende la comparación que
       decide si una suscripción vieja quedó atada a una llave muerta, y si
       esa vuelta miente, la sala se resuscribe en cada entrada o —peor— deja
       viva una suscripción que ya nadie puede firmar

   Corre así, con `dist/` servido en el 8123:
     node build.mjs
     (cd dist && python3 -m http.server 8123 &)
     node sala/pruebas-avisos-navegador.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import { generarVapid } from './servidor/push.mjs';

let bien = 0, mal = 0;
const ok = (q, cond) => { console.log((cond ? '  ✓ ' : '  ✗ ') + q); cond ? bien++ : mal++; };

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

/* La sala de mentiras. Contesta con una llave VAPID DE VERDAD —generada por
   el mismo `push.mjs` que corre en el worker— porque una llave inventada la
   rechazaría el navegador antes de llegar a lo que se quiere medir. */
const vapid = await generarVapid();
const pedidas = [];
const suscritos = [];
const srv = http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if(req.method === 'OPTIONS'){ res.end(); return; }
  const u = new URL(req.url, 'http://x');
  pedidas.push(u.pathname);
  res.setHeader('content-type', 'application/json');

  if(u.pathname.endsWith('/entrar')){
    let cuerpo = '';
    req.on('data', d => cuerpo += d);
    req.on('end', () => {
      const y = JSON.parse(cuerpo);
      res.end(JSON.stringify({ yo:{ ...y, familia:'persona', color:'#AC27FF', sombra:1 } }));
    });
    return;
  }
  if(u.pathname.endsWith('/hilo')){ res.end(JSON.stringify({ hilo:[], gente:{} })); return; }
  if(u.pathname.endsWith('/vapid')){ res.end(JSON.stringify({ publica: vapid.publica })); return; }
  if(u.pathname.endsWith('/suscribir')){
    let cuerpo = '';
    req.on('data', d => cuerpo += d);
    req.on('end', () => { suscritos.push(JSON.parse(cuerpo)); res.end('{"bien":true}'); });
    return;
  }
  res.statusCode = 404; res.end('{}');
});
await new Promise(r => srv.listen(8141, r));

const B = 'http://127.0.0.1:8123/sala/?servidor=http://127.0.0.1:8141';
/* Ancho a propósito. En 390 los paneles son cajones y el botón de avisos vive
   FUERA de la pantalla hasta que se abre el menú: el `click` se queda treinta
   segundos esperando algo que no se puede tocar. Aquí no se está probando el
   cajón, así que se prueba en el ancho donde el botón está a la vista. */
const ctx = await navegador.newContext({ viewport:{ width:1100, height:900 } });

const p = await ctx.newPage();
/* El permiso del aparato, fingido — ver el aviso 2 de arriba. `addInitScript`
   corre ANTES que el script de la página, que es la única forma de que
   `PUEDE_AVISAR` y `Notification.permission` lo vean desde el principio. */
await p.addInitScript(() => {
  class NotificacionDeMentiras {
    constructor(titulo, opciones){ this.titulo = titulo; this.opciones = opciones; }
    close(){}
    static permission = 'granted';
    static requestPermission(){ return Promise.resolve('granted'); }
  }
  Object.defineProperty(window, 'Notification',
    { value: NotificacionDeMentiras, configurable: true, writable: true });
});
const errores = [], avisosConsola = [];
p.on('pageerror', x => errores.push(x.message));
p.on('console', m => { if(m.type() === 'warning') avisosConsola.push(m.text()); });

await p.goto(B);
await p.waitForTimeout(400);
await p.fill('#codigoIn', 'GRUPAZ');
await p.fill('#nombreIn', 'Carlos');
await p.click('#bEntrar');
await p.waitForTimeout(800);

console.log('\n· El botón enciende los dos caminos, no uno');
{
  /* Se aprieta el botón de verdad, no se llama a la función: lo que se quiere
     saber es si el camino que toca Carlos llega hasta el final. */
  await p.click('#bAvisos');
  await p.waitForTimeout(1500);

  ok('el permiso quedó concedido',
     await p.evaluate(() => Notification.permission) === 'granted');
  ok('los avisos con la app abierta quedaron encendidos',
     await p.evaluate(() => localStorage.getItem('sala-avisos')) === 'si');

  const reg = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r ? r.scope : null;
  });
  ok('el service worker se registró', !!reg);
  ok('y su alcance cubre /sala/', !!reg && reg.endsWith('/sala/'));

  ok('la página le pidió la llave pública al servidor',
     pedidas.some(r => r.endsWith('/vapid')));
}

console.log('\n· Cuando el push no se puede, NO se cae nada');
{
  /* Aquí `subscribe()` falla —no hay servicio de push en el contenedor— y eso
     es exactamente el escenario que se quiere ver: la página tiene que
     seguir en pie y decirlo, no romperse ni mentir. */
  ok('no se escapó ningún error de JavaScript', errores.length === 0);
  ok('el fallo del push quedó dicho en la consola',
     avisosConsola.some(t => /avisos con la sala cerrada/.test(t)));

  const letrero = await p.evaluate(() =>
    [...document.querySelectorAll('#letreros .letrero')].map(l => l.textContent).join(' | '));

  /* ⚠ PRIMERO QUE HAYA LETRERO, y no es papeleo. Sin esta línea la de abajo
     pasa sola: una cadena vacía tampoco promete nada. Así estaba escrita, y
     así se me pasó por debajo el defecto de verdad — `letrero()` vivía DENTRO
     de `abrirSocket` y desde aquí no existía, o sea que tocar el botón
     reventaba con «letrero is not defined» justo después de encender los
     avisos. Efecto en el teléfono de Carlos: aprieta, sí se enciende, y ni el
     botón cambia ni sale confirmación. Lo cazó el navegador. */
  ok('sale un letrero cuando se toca el botón', letrero.length > 0);

  /* ⚠ Y ÉSTA ES LA QUE IMPORTA. Un «Avisos encendidos» a secas es lo que haría
     que Carlos guardara el teléfono confiando en algo que no le va a llegar:
     la pantalla informando un estado que no es. */
  ok('el letrero NO promete la sala cerrada cuando no se pudo',
     !/también con la sala cerrada/.test(letrero));
  ok('y dice que con la sala cerrada no se pudo', /Cerrada no se pudo/.test(letrero));

  ok('y el servidor no apuntó a nadie que no se haya suscrito de verdad',
     suscritos.length === 0);
}

console.log('\n· La vuelta de base64url, que es de lo que cuelga la comparación');
{
  /* Se llama a las funciones DE LA PÁGINA, no a una copia escrita aquí. Una
     copia pasaría aunque la de verdad estuviera mal, que es como una prueba
     mía quedó verde sin tocar el código que decía probar. */
  const r = await p.evaluate((pub) => {
    const crudo = deB64url(pub);
    return {
      largo: crudo.length,
      primero: crudo[0],
      vuelta: aB64url(crudo),
      sinRelleno: !/[+/=]/.test(aB64url(crudo)),
    };
  }, vapid.publica);

  ok('la llave se decodifica a 65 bytes', r.largo === 65);
  ok('y empieza en 0x04, que es lo que el navegador exige', r.primero === 4);
  ok('IDA Y VUELTA da exactamente la misma cadena', r.vuelta === vapid.publica);
  ok('la vuelta sigue siendo URL-safe', r.sinRelleno);
}

console.log('\n· Apagar también desapunta');
{
  await p.click('#bAvisos');
  await p.waitForTimeout(600);
  ok('el botón apagó los avisos',
     await p.evaluate(() => localStorage.getItem('sala-avisos')) === 'no');
  ok('y el botón se repintó, que es lo que se ve',
     /Avisos al teléfono/.test(await p.textContent('#bAvisos')));
  ok('y sigue sin escaparse ningún error', errores.length === 0);
}

await navegador.close();
srv.close();
console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan`);
console.log('\n⚠ Ninguna de éstas prueba que un aviso LLEGUE a un teléfono:');
console.log('  `subscribe()` no se completa sin un servicio de push de verdad.');
console.log('  Ese tramo lo cierra Carlos tocando una vez «Avisos al teléfono».');
process.exit(mal ? 1 : 0);
