/* ══════════════════════════════════════════════════════════════════════════
   QUE LOS ROBOTS DE VERDAD TECLEEN
   ──────────────────────────────────────────────────────────────────────────
   Carlos lo reportó DOS VECES —e226 y e263— y las dos veces yo di por
   arreglado lo que no lo estaba, porque había arreglado la mitad: sentarse
   dejó de depender de `quien.trabajo`, teclear no. Y `trabajo` sólo existe si
   el agente reporta con /trabajando, «que en la práctica casi nunca pasa».

   ── TRES COSAS QUE ESTA PRUEBA APRENDIÓ A LA MALA ───────────────────────
   1 · MEDIR LA ROTACIÓN DEL HUESO NO SIRVE para saber si teclea: el clip
       `Sitting` ya anima varios huesos del brazo por su cuenta. Con el código
       roto la prueba pasaba midiendo el movimiento del clip. Lo que hay que
       medir es NUESTRO desfase, que es lo único que ponemos nosotros.
   2 · DOS LECTURAS SEGUIDAS TAMPOCO: el tecleo va en ráfagas con pausas de
       más de dos segundos, y las dos lecturas pueden caer en la misma pausa.
   3 · NO SE PUEDE DEPENDER DE QUIÉN ESTÉ CONECTADO. La sala es real: entre
       una corrida y otra cambia quién está sentado y quién topado, y la misma
       prueba salía 11/11 y 10/11 sin tocar el código. Se FUERZA el estado que
       se quiere probar y se devuelve al terminar.

   Cómo se corre:  node entorno/pruebas-teclado.mjs
   (con el repo servido en el 8791)
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'http://localhost:8791/entorno/';
let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra ? '  → ' + extra : '')); }
};

const nav = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await nav.newContext({ viewport:{ width:1100, height:800 } });
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', e => errores.push(String(e)));
await p.goto(BASE, { waitUntil:'networkidle' });
await p.waitForTimeout(4000);          /* el modelo tarda en llegar y clonarse */

console.log('\n── los robots en su escritorio ──');

const cuantos = await p.evaluate(() =>
  (window.__taller && window.__taller.puestos) ? window.__taller.puestos.size : -1);
ok('la escena tiene agentes puestos', cuantos > 0, 'puestos: ' + cuantos);
if(cuantos <= 0){ await nav.close(); process.exit(1); }

/* ── se congela la sala ────────────────────────────────────────────────
   La página sondea la sala cada dos segundos y REESCRIBE `quien` con lo que
   diga el servidor. Volver a forzar en cada muestra no basta: entre el sondeo
   y el siguiente forzado corren hasta nueve cuadros con el estado de verdad, y
   si ese estado era «sentado» el taller le pone desfase —con toda la razón— y
   la prueba lo cuenta como fallo. Eran los 2/27 y 4/27 de `gem`, que es el
   único que la sala reporta trabajando: no era un defecto, era la prueba
   corriendo contra un servidor vivo. */
await p.evaluate(() => window.__taller.congelarSala());

/* ── se guarda el estado real para devolverlo al final ───────────────── */
await p.evaluate(() => {
  window.__respaldo = [];
  window.__taller.puestos.forEach((v, id) => window.__respaldo.push(
    { id, estado: v.quien && v.quien.estado, trabajo: v.quien && v.quien.trabajo }));
});

/* Fuerza un estado y devuelve el recorrido del DESFASE que le ponemos
   nosotros. Dos cosas que costaron:

   · EL ESTADO SE VUELVE A FORZAR EN CADA MUESTRA. La página consulta la sala
     cada pocos segundos y REESCRIBE `quien` con lo que diga el servidor, así
     que lo que uno fuerza al principio dura hasta el siguiente sondeo. Sin
     esto, la mitad de las corridas medían otra cosa que la pedida.
   · SE MUESTREA CADA 150 ms, NO CADA 600. La ráfaga de tecleo tiene un
     periodo de 4.8 s y muestrear cada 600 ms sobre 7 s recorre menos de un
     periodo: un agente cuya fase caiga en la pausa da CERO en todas las
     lecturas y parece que no teclea. Es aliasing, no un defecto del taller —
     y me lo comí entero antes de darme cuenta. */
const medir = (estado, trabajo, segundos) => p.evaluate(async ([estado, trabajo, segundos]) => {
  const forzar = () => window.__taller.puestos.forEach(v => {
    if(v.quien){ v.quien.estado = estado; v.quien.trabajo = trabajo; }
  });
  const lee = () => {
    const s = [];
    window.__taller.puestos.forEach((v, id) => {
      const d = v.desfase || {};
      s.push({ id, pose: v.quien ? window.__taller.animacionDe(v.quien) : '?',
               izq: (d.LowerArmL && typeof d.LowerArmL.x === 'number') ? d.LowerArmL.x : 0,
               der: (d.UpperArmR && typeof d.UpperArmR.y === 'number') ? d.UpperArmR.y : 0,
               tocado: Object.keys(d).length > 0 });
    });
    return s;
  };
  forzar();
  await new Promise(x => setTimeout(x, 300));
  const tomas = [];
  const n = Math.round(segundos / 0.15);
  for(let k = 0; k < n; k++){
    forzar();
    tomas.push(lee());
    await new Promise(x => setTimeout(x, 150));
  }
  const r = [];
  tomas[0].forEach((x, i) => {
    let recIzq = 0, recDer = 0, conMov = 0;
    for(let k = 1; k < tomas.length; k++){
      const d = Math.abs(tomas[k][i].izq - tomas[k-1][i].izq);
      recIzq += d; if(d > 1e-4) conMov++;
      recDer += Math.abs(tomas[k][i].der - tomas[k-1][i].der);
    }
    /* ⚠ NO SE MIRA LA ÚLTIMA MUESTRA, SE MIRA LA INVARIANTE EN CADA UNA. La
       página vuelve a consultar la sala cada pocos segundos y puede devolver
       el estado real por unos cuadros; si se juzga sólo por la foto final, un
       parpadeo hace fallar la prueba por el motivo equivocado. Lo que tiene
       que cumplirse SIEMPRE es: si en esa muestra no está sentado, no lleva
       desfase nuestro. */
    let incoherentes = 0, sentadasDeVerdad = 0;
    /* Se saltan las cinco primeras muestras: el desfase lo BORRA el bucle de
       dibujo, no el cambio de estado, así que entre forzar la pose y el
       siguiente cuadro hay un instante en que la pose ya cambió y el desfase
       todavía no. Dura un cuadro —16 ms— y nadie lo ve; exigir cero desde la
       primera muestra sería reprobar por un lag inherente y no por un
       defecto. */
    for(let k = 5; k < tomas.length; k++){
      if(tomas[k][i].pose === 'Sitting') sentadasDeVerdad++;
      else if(tomas[k][i].tocado) incoherentes++;
    }
    r.push({ id:x.id, pose: tomas.at(-1)[i].pose, recIzq, recDer, conMov,
             intervalos: tomas.length - 1, tocado: tomas.at(-1)[i].tocado,
             incoherentes, sentadasDeVerdad, muestras: tomas.length,
             maxIzq: Math.max(...tomas.map(t => Math.abs(t[i].izq))) });
  });
  return r;
}, [estado, trabajo, segundos]);

/* ── 1 · SENTADOS Y SIN REPORTAR TRABAJO: TIENEN QUE TECLEAR ─────────── */
console.log('\n  · forzando: activo, sin trabajo reportado');
const sentados = await medir('activo', null, 11);
sentados.forEach(f => console.log('    ' + f.id + ' [' + f.pose + '] izq ' + f.recIzq.toFixed(4)
  + ' · der ' + f.recDer.toFixed(4) + ' · movió en ' + f.conMov + '/' + f.intervalos));

ok('sin trabajo reportado, todos quedan SENTADOS',
   sentados.every(f => f.pose === 'Sitting'), sentados.map(f => f.pose).join(', '));

/* LA QUE IMPORTA. Con el código roto —teclear sólo si `quien.trabajo`— el
   desfase es exactamente cero para todos, porque nadie reporta. */
ok('y TODOS teclean de forma sostenida',
   sentados.every(f => f.conMov >= 10),
   sentados.filter(f => f.conMov < 3).map(f => f.id + ':' + f.conMov).join(', '));
ok('y mueven también la mano del ratón',
   sentados.every(f => f.recDer > 1e-3),
   sentados.filter(f => f.recDer <= 1e-3).map(f => f.id).join(', '));
ok('las dos manos no hacen lo mismo',
   sentados.every(f => Math.abs(f.recIzq - f.recDer) > 1e-4));
ok('el desfase se queda dentro de la amplitud, no se acumula',
   sentados.every(f => f.maxIzq < 0.2),
   'máximo ' + Math.max(...sentados.map(f => f.maxIzq)).toFixed(4));

/* ── 1-bis · EL DESPLAZAMIENTO NO SE ACUMULA EN EL HUESO ─────────────
   La prueba de arriba mira `desfase`, que es lo que DECIMOS que ponemos, y por
   eso no vio nunca el segundo defecto: con `rotation += dx` en cada cuadro,
   `desfase` seguía marcando el valor correcto mientras el hueso se iba a dar
   la vuelta. Reprobar por lo que se dice y no por lo que se hace es no probar
   nada — el arreglo de la acumulación pasaba 11/11 estando roto.

   Cómo se mide sin inventar un umbral: se PARA el mezclador (`timeScale = 0`).
   Con la pose congelada, lo único que puede mover un hueso somos nosotros, así
   que `rotación − desfase` tiene que valer exactamente lo mismo en todos los
   cuadros. Con la resta vale. Con la suma, en los huesos que el clip no anima
   —que son justo los que se rompen— crece sin parar.

   Se mira el eje `y` del brazo derecho porque es donde más se nota: el desvío
   del ratón es un coseno lento, y sumar un coseno lento sesenta veces por
   segundo integra en vez de oscilar. Medido: 2.04 radianes de recorrido con la
   suma contra 0.18 con la resta. */
console.log('\n  · con el mezclador parado: el hueso no se va solo');
const deriva = await p.evaluate(async () => {
  window.__taller.puestos.forEach(v => { if(v.mezclador) v.mezclador.timeScale = 0; });
  const forzar = () => window.__taller.puestos.forEach(v => {
    if(v.quien){ v.quien.estado = 'activo'; v.quien.trabajo = null; }});
  const lee = () => { const s = {};
    window.__taller.puestos.forEach((v, id) => {
      const b = v.brazos, d = v.desfase; if(!b || !d) return;
      const h = {};
      for(const n in d){ if(b[n]) h[n] = { x: b[n].rotation.x - d[n].x,
                                           y: b[n].rotation.y - d[n].y }; }
      s[id] = h; });
    return s; };
  const tomas = [];
  for(let i = 0; i < 30; i++){ forzar(); tomas.push(lee()); await new Promise(r => setTimeout(r, 120)); }
  window.__taller.puestos.forEach(v => { if(v.mezclador) v.mezclador.timeScale = 1; });

  /* Se descartan las tres primeras: entre parar el mezclador y el primer
     cuadro con la pose ya quieta hay unos milisegundos de transición. */
  const utiles = tomas.slice(3).filter(t => Object.keys(t).length);
  const fuera = [];
  for(const id in utiles[0] || {}){
    for(const n in utiles[0][id]){
      for(const eje of ['x', 'y']){
        const vs = utiles.map(t => t[id] && t[id][n] && t[id][n][eje])
                         .filter(v => typeof v === 'number');
        if(vs.length < 10) continue;
        const rango = Math.max(...vs) - Math.min(...vs);
        if(rango > 0.02) fuera.push(id + '/' + n + '.' + eje + ' ' + rango.toFixed(3));
      }
    }
  }
  return { fuera, muestras: utiles.length };
});
ok('con la pose congelada, rotación − desfase no se mueve',
   deriva.muestras >= 10 && deriva.fuera.length === 0,
   deriva.muestras < 10 ? 'sólo ' + deriva.muestras + ' muestras' : deriva.fuera.join(', '));

/* ── 2 · CAMINANDO: NO SE LES TOCA ──────────────────────────────────── */
console.log('\n  · forzando: buscando (camina)');
const andando = await medir('activo', { paso:'buscando en la documentación' }, 4);
andando.forEach(f => console.log('    ' + f.id + ' [' + f.pose + '] muestras con desfase indebido: '
  + f.incoherentes + '/' + f.muestras));
ok('quien camina no queda sentado', andando.every(f => f.pose === 'Walking'),
   andando.map(f => f.pose).join(', '));
ok('y en NINGUNA muestra le ponemos desfase en los brazos',
   andando.every(f => f.incoherentes === 0),
   andando.filter(f => f.incoherentes).map(f => f.id + ':' + f.incoherentes + '/' + f.muestras).join(', '));

/* ── 3 · TOPADO: TAMPOCO ────────────────────────────────────────────── */
console.log('\n  · forzando: topado');
const topados = await medir('topado', null, 4);
ok('quien está topado dice que no', topados.every(f => f.pose === 'No'),
   topados.map(f => f.pose).join(', '));
ok('y en ninguna muestra le tocamos los brazos',
   topados.every(f => f.incoherentes === 0),
   topados.filter(f => f.incoherentes).map(f => f.id + ':' + f.incoherentes + '/' + f.muestras).join(', '));

/* ── se devuelve la sala como estaba ─────────────────────────────────── */
await p.evaluate(() => {
  const r = new Map(window.__respaldo.map(x => [x.id, x]));
  window.__taller.puestos.forEach((v, id) => {
    const x = r.get(id);
    if(x && v.quien){ v.quien.estado = x.estado; v.quien.trabajo = x.trabajo; }
  });
});

ok('sin errores de JavaScript', errores.length === 0, errores[0]);

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas del teclado');
process.exit(mal ? 1 : 0);
