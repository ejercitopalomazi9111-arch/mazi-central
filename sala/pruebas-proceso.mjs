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


/* ── 4 · EL CÓDIGO, EN SU CAJA Y CON BOTÓN DE COPIAR ─────────────────── */
console.log('\n── el código se copia de un toque ──');
{
  const ctx = await nav.newContext({ viewport:{width:390,height:844},
    deviceScaleFactor:2, isMobile:true, hasTouch:true,
    permissions:['clipboard-read','clipboard-write'] });
  const p = await ctx.newPage();
  p.__errores = [];
  p.on('pageerror', e => p.__errores.push(String(e).slice(0,150)));
  await p.goto(BASE, { waitUntil:'networkidle' });
  await p.waitForTimeout(400); await p.click('#bDemo'); await p.waitForTimeout(1100);

  const c = await p.evaluate(() => ({
    cajas: document.querySelectorAll('.caja-codigo').length,
    botones: document.querySelectorAll('.copiar').length,
    rotulos: [...document.querySelectorAll('.caja-codigo .donde')].map(x => x.textContent),
  }));
  /* Dos vías y las dos tienen que servir: el adjunto `codigo` que manda un
     agente a propósito, y las comillas triples dentro de un mensaje normal —
     que es lo que escribe todo el mundo por costumbre. */
  ok('salen las dos cajas: la del adjunto y la de las comillas triples',
     c.cajas === 2 && c.botones === 2, JSON.stringify(c));
  ok('cada una dice de dónde es', c.rotulos.includes('js') &&
     c.rotulos.some(r => /\.mjs$/.test(r)), JSON.stringify(c.rotulos));

  /* ⚠ EL DEFECTO QUE SE VIO EN LA CAPTURA Y NO EN EL CÓDIGO: el cuerpo del
     mensaje se pinta con `white-space: pre-wrap`, así que los saltos y la
     sangría que uno pone entre las etiquetas por legibilidad se dibujan como
     renglones EN BLANCO. La caja salía con un hueco de tres renglones encima
     del rótulo. Se mide comparando el alto de la caja contra lo que ocupan sus
     partes: si sobra mucho, hay blanco de relleno. */
  const hueco = await p.evaluate(() => {
    const caja = document.querySelector('.caja-codigo');
    const cab = caja.querySelector('.caja-codigo-cab').getBoundingClientRect().height;
    const pre = caja.querySelector('pre').getBoundingClientRect().height;
    return Math.round(caja.getBoundingClientRect().height - cab - pre);
  });
  ok('la caja no trae renglones en blanco de relleno', hueco <= 6, hueco + ' px de sobra');

  /* Que COPIE de verdad, no que parezca. */
  await p.locator('.copiar').first().click();
  await p.waitForTimeout(500);
  const pegado = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  ok('el botón copia el código de verdad al portapapeles',
     /cantidadValida/.test(pegado), pegado.slice(0,50));
  ok('y lo copia COMPLETO, no la primera línea',
     pegado.split('\n').length >= 6, pegado.split('\n').length + ' renglones');
  /* Un botón de copiar que no acusa te deja creyendo que ya lo tienes. */
  ok('y lo dice en el propio botón',
     /Copiado/.test(await p.evaluate(() => document.querySelector('.copiar').textContent)));
  await p.waitForTimeout(1900);
  ok('pero vuelve a su estado, para que el segundo toque también se note',
     /Copiar/.test(await p.evaluate(() => document.querySelector('.copiar').textContent)));

  /* El código no se envuelve: se desliza. Y tiene que caber en la burbuja. */
  const medida = await p.evaluate(() => {
    const pre = document.querySelector('.caja-codigo pre');
    const h = document.querySelector('#hilo').getBoundingClientRect();
    return { seDesliza: pre.scrollWidth > pre.clientWidth,
             seSale: pre.getBoundingClientRect().right > h.right + 2,
             envuelve: getComputedStyle(pre).whiteSpace };
  });
  ok('el código se desliza dentro de su caja y no empuja el hilo',
     medida.seDesliza && !medida.seSale, JSON.stringify(medida));
  ok('y no se envuelve: una línea partida donde caiga se lee peor',
     medida.envuelve === 'pre', medida.envuelve);

  /* ⚠ `.codigo` YA EXISTÍA: es la pastilla con las seis letras de la sala. La
     caja nueva se llama `caja-codigo` justo por eso. Si alguien las vuelve a
     juntar, la pastilla se convierte en un bloque de código sin que nadie
     toque ese archivo. */
  const pastilla = await p.evaluate(() => {
    const e = document.querySelector('.codigo');
    if(!e) return null;
    const s = getComputedStyle(e);
    return { radio: s.borderRadius, letra: s.letterSpacing, ancho: Math.round(e.getBoundingClientRect().width) };
  });
  ok('la pastilla del código de sala sigue siendo una pastilla',
     !pastilla || (parseFloat(pastilla.radio) <= 12 && pastilla.ancho < 200),
     JSON.stringify(pastilla));

  ok('sin errores', p.__errores.length === 0, p.__errores[0]);
  await ctx.close();
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
