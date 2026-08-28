/* ══════════════════════════════════════════════════════════════════════════
   EL CEREBRO · la vista de RED, en un navegador de verdad
   ──────────────────────────────────────────────────────────────────────────
     node cerebro/pruebas-red.mjs [http://localhost:8791]

   `cerebro/pruebas.mjs` prueba el conocimiento —que la búsqueda encuentre,
   que las ligas apunten a algo—. Eso corre en Node y no necesita pantalla.

   Esto es otra cosa: la vista de red vive en un canvas, con propagación por
   `setTimeout` y decaimiento por cuadro. Nada de eso se puede comprobar
   leyendo el archivo, y los dos defectos que reportó Carlos —las sinapsis de
   dos neuronas encendidas a la vez, y los tirones— sólo existen corriendo.
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = process.argv[2] || 'http://localhost:8791';
let bien = 0, mal = 0;
const ok = (q, cierto, detalle = '') => {
  if(cierto){ bien++; console.log('  ✓ ' + q); }
  else{ mal++; console.log('  ✗ ' + q + (detalle ? '  → ' + detalle : '')); }
};

const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport:{ width:1100, height:820 } })).newPage();
const errores = [];
p.on('pageerror', e => errores.push(String(e)));

await p.goto(BASE + '/cerebro/', { waitUntil:'networkidle' });
await p.waitForTimeout(2200);
await p.click('#mRed');
await p.waitForTimeout(1500);

ok('la vista de red carga sin errores de consola', errores.length === 0, errores.slice(0,2).join(' · '));

/* `RED` se declara con `let` en el guion, así que existe pero no cuelga de
   `window`. Se lee por nombre suelto. */
const estado = () => p.evaluate(() => {
  if(typeof RED === 'undefined' || !RED) return null;
  return {
    enlaces: RED.enlaces.filter(e => e.carga > 0).length,
    nodos:   RED.nodos.filter(o => o.carga > 0).length,
    totalEnlaces: RED.enlaces.length,
    totalNodos:   RED.nodos.length,
  };
});

const inicial = await estado();
ok('hay red que mirar', !!inicial && inicial.totalNodos > 10,
   inicial ? inicial.totalNodos + ' nodos' : 'no se pudo leer RED');

const ids = await p.evaluate(() => RED.nodos.slice(0, 40).map(o => o.n.id));

/* ══ UNA PREGUNTA A LA VEZ ═════════════════════════════════════════════════
   Carlos: «cuando selecciono una neurona y luego otra se quedan las sinapsis
   de ambas encendidas».

   Dos causas, y la segunda no se ve pero es peor: la propagación salta con
   `if(otro.carga > 0) continue`, o sea que NO entra a una neurona que ya esté
   encendida. Con la carga anterior todavía viva, la señal nueva se topaba con
   ella y se detenía: la segunda red salía INCOMPLETA. No sólo sobraba luz
   vieja — faltaba luz nueva. */
await p.evaluate((id) => encender([id], 2, null), ids[0]);
await p.waitForTimeout(1400);
const primera = await estado();
ok('encender una neurona enciende sus sinapsis', primera.enlaces > 0,
   'no se encendió ninguna');

await p.evaluate((id) => encender([id], 2, null), ids[25]);
await p.waitForTimeout(120);
const justoDespues = await estado();
ok('al escoger otra, las sinapsis de la anterior se APAGAN',
   justoDespues.enlaces === 0,
   'quedaron ' + justoDespues.enlaces + ' encendidas de la anterior');

await p.waitForTimeout(1300);
const segunda = await estado();
ok('y la segunda red se enciende completa, sin que la vieja la estorbe',
   segunda.enlaces > 0, 'la segunda no encendió nada');

/* ══ QUE NO DÉ TIRONES ═════════════════════════════════════════════════════
   Carlos: «el apartado de cerebro en red está medio laggy a veces».

   Se mide el tiempo ENTRE CUADROS mientras la red está encendida, que es
   cuando más trabajo hay. Lo que se vigila no es el promedio —un promedio
   bueno esconde los tirones— sino el peor cuadro y cuántos se pasan de 32ms,
   que es donde el ojo empieza a notar el salto. */
await p.evaluate((id) => encender([id], 3, null), ids[3]);
const ritmo = await p.evaluate(() => new Promise(resolve => {
  const t = [];
  let antes = performance.now();
  const paso = () => {
    const ahora = performance.now();
    t.push(ahora - antes); antes = ahora;
    if(t.length < 90) requestAnimationFrame(paso);
    else{
      t.sort((a,b) => a-b);
      resolve({
        mediana: +t[Math.floor(t.length/2)].toFixed(1),
        peor:    +t[t.length-1].toFixed(1),
        lentos:  t.filter(x => x > 32).length,
        cuadros: t.length,
      });
    }
  };
  requestAnimationFrame(paso);
}));
console.log('  · cuadros: mediana ' + ritmo.mediana + 'ms · peor ' + ritmo.peor +
            'ms · ' + ritmo.lentos + ' de ' + ritmo.cuadros + ' por encima de 32ms');
ok('el cuadro típico no pasa de 32ms con la red encendida', ritmo.mediana <= 32,
   'mediana de ' + ritmo.mediana + 'ms');
ok('menos de una quinta parte de los cuadros se van largos',
   ritmo.lentos <= ritmo.cuadros * 0.2,
   ritmo.lentos + ' de ' + ritmo.cuadros + ' pasaron de 32ms');

ok('sigue sin errores de consola tras usarla', errores.length === 0,
   errores.slice(0,2).join(' · '));

await b.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
