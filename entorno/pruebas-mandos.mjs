/* ══════════════════════════════════════════════════════════════════════════
   EL TALLER · que sus mandos EXISTAN donde Carlos lo usa
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «en el taller 3D no encuentro cómo acceder a la vista de todos los
   involucrados (la vista aérea chida)».

   No es que no la encontrara: NO ESTABA. El taller se abre dentro de La Sala
   con `?dentro=1`, y esa marca esconde la barra entera para no repetir la
   cabecera de la mesa. Los tres botones vivían dentro de esa barra. Empotrado
   —o sea, como él lo usa siempre— la vista aérea era inalcanzable.

   ⚠ CÓMO SE MIDE LA VISIBILIDAD, porque aquí me equivoqué una vez: `offsetParent`
   devuelve `null` para todo lo que sea `position:fixed`, y estos mandos son
   fijos por definición. Con esa prueba, un botón perfectamente visible salía
   como escondido. Se mide con el RECUADRO y el estilo calculado.

   Cómo se corre:  node build.mjs && node entorno/pruebas-mandos.mjs
   (con `dist/` servido en el 8791, reiniciado después del build)
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'http://localhost:8791/entorno/';
let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra ? '\n      ' + extra : '')); }
};

const nav = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });

/* Se mide de verdad: recuadro con área, no escondido por estilo, y con algo
   encima que reciba el toque en su centro. */
function seVe(sel){
  const e = document.querySelector(sel);
  if(!e) return { hay:false };
  const r = e.getBoundingClientRect();
  const s = getComputedStyle(e);
  const dentroDePantalla = r.width > 0 && r.height > 0 &&
    r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  const pintado = s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.01;
  const enElPunto = document.elementFromPoint(
    Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)),
    Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
  return { hay:true, seVe: dentroDePantalla && pintado,
           tocable: !!enElPunto && (enElPunto === e || e.contains(enElPunto)),
           alto: Math.round(r.height), ancho: Math.round(r.width) };
}

async function abrir(query){
  const ctx = await nav.newContext({ viewport:{width:390,height:844},
    deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const p = await ctx.newPage();
  p.__errores = [];
  p.on('pageerror', e => p.__errores.push(String(e).slice(0,140)));
  p.on('console', m => { if(m.type() === 'error') p.__errores.push('consola: ' + m.text().slice(0,120)); });
  await p.goto(BASE + query, { waitUntil:'networkidle' });
  await p.waitForTimeout(3800);        /* el modelo del robot tarda en llegar */
  p.__ve = (sel) => p.evaluate(seVe, sel);
  return p;
}

for(const [query, como, barraDebeVerse] of [
  ['?demo=1',            'suelto',    true],
  ['?demo=1&dentro=1',   'empotrado', false],
]){
  console.log('\n── ' + como + ' ──');
  const p = await abrir(query);
  ok('carga sin errores', p.__errores.length === 0, p.__errores[0]);
  ok('el cuarto se dibuja', await p.evaluate(() => !!document.querySelector('canvas')));

  for(const [sel, nombre] of [['#bVista','la vista aérea'], ['#bSeguir','seguir'], ['#bOjo','el ojo del panel']]){
    const v = await p.__ve(sel);
    ok(nombre + ' se ve y se puede tocar', v.hay && v.seVe && v.tocable, JSON.stringify(v));
    ok(nombre + ' mide 44 px o más', v.hay && v.alto >= 44 && v.ancho >= 44, JSON.stringify(v));
  }

  const barra = await p.__ve('.barra');
  ok(barraDebeVerse ? 'la barra con el título se ve' : 'la barra se esconde, que es lo que pide la mesa',
     !!barra.seVe === barraDebeVerse, JSON.stringify(barra));

  /* Que el botón HAGA algo y lo DIGA. Un modo que no se anuncia se ve muerto:
     es la misma lección del «Ajustar» de Reportes. */
  const antes = await p.evaluate(() => __taller.camara.position.toArray().map(n => +n.toFixed(2)));
  await p.click('#bVista'); await p.waitForTimeout(1500);
  const durante = await p.evaluate(() => ({
    pos: __taller.camara.position.toArray().map(n => +n.toFixed(2)),
    vista: document.getElementById('bVista').getAttribute('aria-pressed'),
    seguir: document.getElementById('bSeguir').getAttribute('aria-pressed'),
  }));
  ok('tocar la vista aérea MUEVE la cámara de verdad',
     JSON.stringify(antes) !== JSON.stringify(durante.pos),
     JSON.stringify(antes) + ' → ' + JSON.stringify(durante.pos));
  ok('y sube: es aérea, se ve el cuarto desde arriba',
     durante.pos[1] > antes[1], antes[1] + ' → ' + durante.pos[1]);
  ok('el botón dice que está prendido', durante.vista === 'true');
  ok('y apaga «seguir», porque son modos que se pelean', durante.seguir === 'false');

  await p.click('#bVista'); await p.waitForTimeout(900);
  const despues = await p.evaluate(() => ({
    vista: document.getElementById('bVista').getAttribute('aria-pressed'),
    seguir: document.getElementById('bSeguir').getAttribute('aria-pressed'),
  }));
  ok('al apagarla vuelve a seguir', despues.vista === 'false' && despues.seguir === 'true');

  /* ⚠ EL OTRO DEFECTO: una copia del registro del botón «Panel» estaba pegada
     DENTRO del `else` de la vista. Cada vez que apagabas la vista amplia se
     colgaba OTRO escuchador, y a partir de ahí un clic plegaba y desplegaba en
     el mismo instante — indistinguible de un botón muerto. Se caza apagando la
     vista varias veces y comprobando que el ojo sigue haciendo UN paso. */
  for(let i = 0; i < 3; i++){
    await p.click('#bVista'); await p.waitForTimeout(300);
    await p.click('#bVista'); await p.waitForTimeout(300);
  }
  const estado = () => p.evaluate(() => {
    const e = document.getElementById('panel');
    return e.classList.contains('oculto') ? 'oculto'
         : e.classList.contains('plegado') ? 'plegado' : 'completo';
  });
  const a1 = await estado();
  await p.click('#bOjo'); await p.waitForTimeout(300);
  const a2 = await estado();
  ok('tras seis vueltas de vista, el ojo sigue dando UN paso', a1 !== a2, a1 + ' → ' + a2);

  ok('y ni un error en toda la vuelta', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas de los mandos');
process.exit(mal ? 1 : 0);
