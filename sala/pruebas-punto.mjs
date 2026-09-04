/* ══ EL PUNTO DE ESTADO ════════════════════════════════════════════════════
   Carlos, e177: «el punto verde sigue marcando que están en línea cuando en
   realidad están Offline».

   Eran DOS puntos, uno encima del otro: el `::after` de `.con-punto`, verde
   fijo, y el `<i class="punto">`, que sí sabe el estado. Como el de abajo mide
   9 px y el de arriba 7, el verde asomaba alrededor del correcto.

   Por eso esto NO comprueba clases: comprueba el color PINTADO de los dos, que
   es lo único que se ve. Con una comprobación de clases, el defecto pasaba —
   la clase `topado` estaba puesta correctamente todo el tiempo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const pg = await (await b.newContext({ viewport:{ width:1100, height:860 } })).newPage();
const err = []; pg.on('pageerror', e => err.push(e.message));
let f = 0;
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

await pg.goto('http://127.0.0.1:8792/sala/?sala=PRUEBA', { waitUntil:'domcontentloaded' });
await pg.waitForTimeout(400);
/* La sala de ejemplo trae un Claude «topado», que es justo el caso. */
await pg.locator('#bDemo').click();
await pg.waitForTimeout(800);

const puntos = await pg.evaluate(() => {
  const sale = [];
  for(const q of document.querySelectorAll('.quien')){
    const cp = q.querySelector('.con-punto'), i = q.querySelector('.punto');
    sale.push({
      nombre: q.querySelector('.nom-quien')?.textContent || '?',
      clases: q.className,
      /* El punto de abajo: si sigue pintándose, asoma por el filo. */
      fantasma: cp ? getComputedStyle(cp, '::after').display : 'no hay',
      color: i ? getComputedStyle(i).backgroundColor : 'no hay',
    });
  }
  return sale;
});
for(const p of puntos) console.log(`    ${p.nombre.padEnd(20)} ${p.clases.padEnd(22)} ::after=${p.fantasma.padEnd(6)} punto=${p.color}`);

ok(puntos.length >= 3, 'hay gente en la lista');
ok(puntos.every(p => p.fantasma === 'none'),
   'ninguno lleva el punto verde fijo debajo — ése era el que mentía');

const topado = puntos.find(p => /topado/.test(p.clases));
ok(!!topado, 'la sala de ejemplo tiene a alguien topado');
/* Verde es rgb(x, alto, y). Lo que no puede ser es verde. */
const esVerde = (c) => { const m = /(\d+), (\d+), (\d+)/.exec(c); if(!m) return false;
  const [, r, g, a] = m.map(Number); return g > 120 && g > r + 40 && g > a + 40; };
ok(topado && !esVerde(topado.color), `el topado NO tiene el punto verde (${topado && topado.color})`);

const trabajando = puntos.find(p => /trabajando/.test(p.clases));
ok(trabajando && !esVerde(trabajando.color),
   `el que está trabajando tampoco: lleva el violeta que late (${trabajando && trabajando.color})`);

/* En la sala de ejemplo no hay nadie «activo y sin tarea», que es el único
   caso en que el punto DEBE ser verde. Sin este caso la prueba sólo sabría
   decir que nada es verde, y aprobaría con el punto roto del todo. */
const verde = await pg.evaluate(() => {
  gente.despierto = { id:'despierto', nombre:'Despierto', tipo:'humano', cuenta:'carlos',
                      estado:'activo', visto:Date.now() };
  conectados.add('despierto');
  pintarGente();
  const q = [...document.querySelectorAll('.quien')]
    .find(x => x.querySelector('.nom-quien')?.textContent === 'Despierto');
  return { clases:q.className, color:getComputedStyle(q.querySelector('.punto')).backgroundColor };
});
ok(esVerde(verde.color), `y uno activo y sin tarea SÍ lo tiene verde (${verde.color})`);

ok(err.length === 0, 'ningún error de página' + (err.length ? ': ' + err.join(' | ') : ''));
console.log(`\n${f ? '✗' : '✓'}  ${f} fallan\n`);
await b.close();
process.exit(f ? 1 : 0);
