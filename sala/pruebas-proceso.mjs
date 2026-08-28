/* ══════════════════════════════════════════════════════════════════════════
   LA MESA · que se VEA el proceso, no sólo el resultado
   ──────────────────────────────────────────────────────────────────────────
   Carlos, en su lista de cierre: «que podamos ver qué skills se usaron, qué se
   ejecutó, etc, y MÁS QUE NADA EL PROCESO COGNITIVO». Y aparte: «que puedan
   subir fotos como tú lo haces y que directamente sin picarle ni nada se vea
   la vista previa».

   Esto prueba las DOS cosas en un navegador de verdad, porque las dos fallan
   de la misma forma: el dato llega bien y la pantalla no lo enseña. El
   servidor ya tiene lo suyo en `sala/servidor/pruebas.mjs`; aquí se mira.

   Cómo se corre:
     node build.mjs && node sala/pruebas-proceso.mjs
   (Hace falta el servidor de `dist/` en el 8791. `build.mjs` borra y rehace
   `dist/`, así que si el servidor ya estaba corriendo hay que reiniciarlo o
   se queda apuntando al directorio muerto.)
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'http://localhost:8791/sala/';
let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra ? '\n      ' + extra : '')); }
};

const nav = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });

async function mesa(ancho = 390){
  const ctx = await nav.newContext(ancho < 700
    ? { viewport:{width:ancho,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true }
    : { viewport:{width:ancho,height:900} });
  const p = await ctx.newPage();
  p.__errores = [];
  p.on('pageerror', e => p.__errores.push(String(e).slice(0,150)));
  p.on('console', m => { if(m.type() === 'error') p.__errores.push('consola: ' + m.text().slice(0,130)); });
  await p.goto(BASE, { waitUntil:'networkidle' });
  await p.waitForTimeout(500);
  await p.click('#bDemo');            /* la sala de ejemplo: sin servidor ni cuenta */
  await p.waitForTimeout(900);
  return p;
}

/* ── 1 · EL PROCESO SE VE, Y VA CERRADO ──────────────────────────────── */
console.log('\n── el proceso cognitivo en la mesa ──');
{
  const p = await mesa();
  ok('la mesa carga sin un solo error', p.__errores.length === 0, p.__errores[0]);

  const c = await p.evaluate(() => ({
    piensa: document.querySelectorAll('.proceso.piensa').length,
    skills: document.querySelectorAll('.skill-usada').length,
    corre:  document.querySelectorAll('.proceso.corre').length,
    abiertos: [...document.querySelectorAll('details.proceso')].filter(d => d.open).length,
  }));
  ok('el ejemplo trae razonamiento, skill y corridas',
     c.piensa >= 1 && c.skills >= 1 && c.corre >= 2, JSON.stringify(c));
  /* Si llegaran abiertos, el hilo dejaría de ser un hilo: cada mensaje traería
     ochenta renglones de razonamiento pegados y nadie lo leería. */
  ok('todos llegan CERRADOS', c.abiertos === 0);

  /* El resumen del renglón cerrado es lo único que se ve. Si dijera
     «pensamiento», habría que abrirlos todos para saber cuál es cuál. */
  const res = await p.evaluate(() => [...document.querySelectorAll('.proceso > summary .de-que')]
    .map(x => x.textContent.trim()));
  ok('cada renglón cerrado dice de qué es', res.every(t => t.length > 3 &&
     !/^(pensamiento|proceso|corrida)$/i.test(t)), JSON.stringify(res));

  /* ⚠️ DOS CORRIDAS DEL MISMO ARCHIVO. Lo que las distingue vive al FINAL
     («# antes del arreglo»), así que cortar por el final las vuelve idénticas.
     Se vio en una captura: dos filas iguales, una en verde y otra en rojo. */
  const ordenes = await p.evaluate(() =>
    [...document.querySelectorAll('.proceso.corre > summary .de-que')].map(x => ({
      texto: x.textContent.trim(),
      alto: Math.round(x.getBoundingClientRect().height),
      cabe: x.scrollHeight <= x.clientHeight + 1,
    })));
  ok('dos corridas parecidas NO se ven iguales',
     new Set(ordenes.map(o => o.texto)).size === ordenes.length,
     JSON.stringify(ordenes.map(o => o.texto)));
  ok('y la orden se lee entera, en hasta tres renglones',
     ordenes.every(o => o.cabe), JSON.stringify(ordenes));

  /* El sello del código de salida es lo que distingue «corrí las pruebas» de
     «corrí las pruebas y pasaron». Sin él, las dos corridas se leen igual. */
  const sellos = await p.evaluate(() => ({
    bien: [...document.querySelectorAll('.sello-cod.bien')].map(x => x.textContent.trim()),
    mal:  [...document.querySelectorAll('.sello-cod.mal')].map(x => x.textContent.trim()),
  }));
  ok('el código 0 se marca en verde y el que no, en rojo',
     sellos.bien.length >= 1 && sellos.mal.length >= 1, JSON.stringify(sellos));

  /* Y que al abrirlo salga el contenido de verdad, no un desplegable vacío. */
  await p.locator('.proceso.piensa summary').first().click();
  await p.waitForTimeout(300);
  const dentro = await p.evaluate(() =>
    document.querySelector('.proceso.piensa .adentro').textContent.trim());
  ok('al abrir el razonamiento, ahí está completo', dentro.length > 200, dentro.slice(0,60));
  ok('y conserva los renglones, que es la mitad de poder leerlo',
     /\n/.test(dentro));

  await p.context().close();
}

/* ── 2 · LA FOTO SE VE SIN PICARLE ───────────────────────────────────── */
console.log('\n── la vista previa de una foto ──');
{
  const p = await mesa();
  /* Una imagen de verdad, metida al hilo como la mandaría un agente. */
  const medidas = await p.evaluate(async () => {
    /* 320×180 en rojo: una proporción claramente apaisada, para que se note si
       algo la recorta a cuadro. */
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const g = c.getContext('2d');
    g.fillStyle = '#C0392B'; g.fillRect(0,0,320,180);
    g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.fillText('ABC', 20, 110);
    const datos = c.toDataURL('image/png').split(',')[1];
    hilo.push({ id:'foto-prueba', ts: Date.now(), tipo:'mensaje',
      de:{ id:'cl-c', nombre:'Claude de Carlos', tipo:'claude', cuenta:'carlos' },
      texto:'Aquí está la captura.',
      adjuntos:[{ clase:'imagen', mime:'image/png', nombre:'captura.png',
                  datos, ancho:320, alto:180 }] });
    pintarHilo();
    await new Promise(r => setTimeout(r, 500));
    const f = document.querySelector('.foto img');
    if(!f) return null;
    const r = f.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height),
             ajuste: getComputedStyle(f).objectFit,
             natural: f.naturalWidth + '×' + f.naturalHeight };
  });
  ok('la foto entra al hilo y se pinta', !!medidas, 'no se encontró .foto img');
  if(medidas){
    /* El defecto que reportó Carlos: 96×96 con `object-fit:cover` no es una
       vista previa, es el RECORTE DEL CENTRO. De una captura de pantalla, el
       cuadrito del centro no dice nada, así que había que picarle SIEMPRE. */
    ok('se ve más grande que la miniatura vieja de 96 px', medidas.w > 150,
       JSON.stringify(medidas));
    ok('y respeta su forma: no la recorta a cuadro',
       Math.abs((medidas.w / medidas.h) - (320/180)) < 0.08, JSON.stringify(medidas));
    ok('sin `object-fit:cover`, que era lo que la recortaba',
       medidas.ajuste !== 'cover', medidas.ajuste);
  }
  /* La lupa sigue existiendo: la vista previa no la reemplaza, la vuelve
     opcional. */
  await p.locator('.foto').first().click();
  await p.waitForTimeout(300);
  ok('al tocarla sigue abriendo la lupa a pantalla completa',
     await p.evaluate(() => document.querySelector('#lupa').classList.contains('abierta')));
  ok('y ni un error', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── 3 · QUE NADA SE SALGA ───────────────────────────────────────────── */
console.log('\n── proporciones, a teléfono y a computadora ──');
for(const ancho of [390, 1280]){
  const p = await mesa(ancho);
  /* Abiertos es cuando de verdad se puede desbordar: el razonamiento trae
     renglones largos y la salida de consola no se parte sola. */
  await p.evaluate(() => document.querySelectorAll('details.proceso').forEach(d => d.open = true));
  await p.waitForTimeout(400);
  const f = await p.evaluate(() => {
    const h = document.querySelector('#hilo');
    const r = h.getBoundingClientRect();
    return {
      pagina: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      salen: [...h.querySelectorAll('.proceso, .skill-usada, .foto, .adentro')]
        .filter(e => e.getBoundingClientRect().right > r.right + 2)
        .map(e => (e.className || e.tagName) + ' +' +
             Math.round(e.getBoundingClientRect().right - r.right) + 'px'),
    };
  });
  ok(ancho + ' px · la página no se va de lado', !f.pagina);
  ok(ancho + ' px · nada se sale del hilo, ni con todo abierto',
     f.salen.length === 0, f.salen.slice(0,4).join(' · '));
  ok(ancho + ' px · sin errores', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas de la mesa');
process.exit(mal ? 1 : 0);
