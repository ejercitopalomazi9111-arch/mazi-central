/* Pruebas de la lámina. Se usa la página, no se lee el código.
     node lamina/pruebas.mjs [http://127.0.0.1:8791]

   Lo que estas pruebas SÍ pueden cachar:
   · que el atlas y el índice no cuadren con las 350 piezas
   · que el buscador devuelva la pieza equivocada arriba
   · que la lámina NO se lea con el JavaScript apagado
   · que el tema no sobreviva a recargar, o que parpadee al cargar
   · que algo se salga de la pantalla o quede por debajo de 44 px */
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const RUTA = BASE + '/lamina/';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (que, cond, det='') => { if(cond){ bien++; console.log('  ✓ '+que); }
  else { mal++; console.log('  ✗ '+que + (det ? '  → '+det : '')); } };

const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const abrir = async (o={}) => {
  const ctx = await nav.newContext(Object.assign({ viewport:{width:390,height:900} }, o));
  const p = await ctx.newPage(); p.__err = [];
  p.on('pageerror', e => p.__err.push(String(e)));
  await p.goto(RUTA, { waitUntil:'networkidle' });
  return p;
};

/* ── 1 · EL REGISTRO CUADRA ──────────────────────────────────────────── */
console.log('\n── el registro ──');
{
  const p = await abrir();
  const d = await p.evaluate(() => ({
    piezas: NEURONAS.length,
    areasBoton: document.querySelectorAll('.area').length,
    suma: [...document.querySelectorAll('.area .cuenta')]
            .reduce((a,e) => a + parseInt(e.textContent,10), 0),
    indice: document.querySelectorAll('.indice a[data-id]').length,
    areasDistintas: new Set(NEURONAS.map(n => n.area)).size,
    sinCazar: NEURONAS.filter(n => !n.comoCazarlo).length,
    sinSenales: NEURONAS.filter(n => !n.senales || n.senales.length < 2).length,
  }));
  ok('hay 350 piezas', d.piezas === 350, String(d.piezas));
  ok('hay 42 áreas en el atlas', d.areasBoton === 42, String(d.areasBoton));
  ok('los conteos del atlas suman 350', d.suma === 350, String(d.suma));
  ok('el índice lista las 350', d.indice === 350, String(d.indice));
  ok('las áreas del atlas y las de los datos coinciden', d.areasDistintas === 42, String(d.areasDistintas));
  ok('todas las piezas dicen CÓMO CAZARLO', d.sinCazar === 0, d.sinCazar + ' sin ello');
  ok('todas traen al menos dos señales', d.sinSenales === 0, d.sinSenales + ' con menos');
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err[0]);
  await p.context().close();
}

/* ── 2 · EL BUSCADOR DEVUELVE LO QUE DEBE ────────────────────────────── */
console.log('\n── el buscador ──');
{
  const p = await abrir();
  const buscar = async (q) => {
    await p.fill('#q', q);
    await p.waitForTimeout(220);
    return p.evaluate(() => ({
      cuantos: document.querySelector('#cuantos').textContent,
      primero: (document.querySelector('.ficha .tit')||{}).textContent || '',
      n: document.querySelectorAll('.ficha').length,
    }));
  };
  const arranque = await p.evaluate(() => document.querySelectorAll('.ficha').length);
  ok('arranca con piezas a la vista, no vacío', arranque > 20, String(arranque));

  let r = await buscar('va a tirones al scrollear');
  ok('«va a tirones» pone arriba la del difuminado',
     /difuminado|desenfoque|fotograma/i.test(r.primero), r.primero);

  r = await buscar('sombra sucia');
  ok('«sombra sucia» pone arriba la de la sombra negra',
     /sombra negra/i.test(r.primero), r.primero);

  r = await buscar('no se ve el foco');
  ok('«no se ve el foco» encuentra el anillo de foco',
     /foco|contorno/i.test(r.primero), r.primero);

  /* Escribir el nombre de un área es una búsqueda de TEXTO: encuentra también
     las piezas de otras áreas que hablan de sombras, y eso está bien. El filtro
     exacto por área es el del atlas, y se comprueba en su propio apartado. */
  r = await buscar('sombras');
  ok('escribir «sombras» encuentra al menos las 15 del área', r.n >= 15, r.n + ' fichas');
  ok('y también las de otras áreas que hablan de sombras', r.n > 15, r.n + ' fichas');

  r = await buscar('zumbaquipiri');
  ok('una palabra que no existe lo dice', /ninguna pieza/.test(r.cuantos), r.cuantos);
  ok('y ofrece una salida', await p.locator('#fichas .anota').count() === 1);

  /* una frase llena de palabras que no distinguen devolvía 228 de 350: eso no
     es una búsqueda, es la lista entera con otro nombre */
  r = await buscar('mexico sin acentos ni nada de esto');
  ok('una frase con puro relleno NO devuelve medio registro', r.n <= 20,
     r.n + ' fichas · ' + r.cuantos);

  await p.fill('#q','tipografia');
  await p.waitForTimeout(220);
  const conAcento = await p.evaluate(() => document.querySelectorAll('.ficha').length);
  await p.fill('#q','tipografía');
  await p.waitForTimeout(220);
  const sinAcento = await p.evaluate(() => document.querySelectorAll('.ficha').length);
  ok('con acento y sin acento dan lo mismo', conAcento === sinAcento && conAcento > 0,
     conAcento + ' vs ' + sinAcento);

  ok('el botón de limpiar aparece con texto', await p.locator('#bLimpiar').isVisible());
  await p.click('#bLimpiar');
  await p.waitForTimeout(150);
  ok('y al limpiar se vuelve al arranque',
     (await p.evaluate(() => document.querySelectorAll('.ficha').length)) === arranque);
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err[0]);
  await p.context().close();
}

/* ── 3 · EL ATLAS Y EL ÍNDICE LLEVAN A LA CONSULTA ───────────────────── */
console.log('\n── el atlas y el índice ──');
{
  const p = await abrir();
  const cuenta = await p.evaluate(() => {
    const b = [...document.querySelectorAll('.area')].find(x => x.dataset.area === 'paralaje');
    return parseInt(b.querySelector('.cuenta').textContent, 10);
  });
  await p.evaluate(() => [...document.querySelectorAll('.area')]
    .find(x => x.dataset.area === 'paralaje').click());
  await p.waitForTimeout(250);
  ok('tocar un área del atlas filtra por ella',
     (await p.evaluate(() => document.querySelectorAll('.ficha').length)) === cuenta,
     'esperaba ' + cuenta);

  await p.evaluate(() => document.querySelector('.indice a[data-id]').click());
  await p.waitForTimeout(250);
  const d = await p.evaluate(() => ({
    n: document.querySelectorAll('.ficha').length,
    abierta: document.querySelectorAll('.ficha .cuerpo:not([hidden])').length,
    campos: document.querySelectorAll('.ficha .cuerpo dt').length,
  }));
  ok('tocar una entrada del índice abre esa pieza sola', d.n === 1, d.n + ' fichas');
  ok('y la abre desplegada', d.abierta === 1);
  ok('con sus campos completos', d.campos >= 6, d.campos + ' campos');
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err[0]);
  await p.context().close();
}

/* ── 4 · SIN JAVASCRIPT SE LEE ENTERA ────────────────────────────────── */
console.log('\n── con el JavaScript apagado ──');
{
  const p = await abrir({ javaScriptEnabled:false });
  const d = await p.evaluate(() => ({
    areas: document.querySelectorAll('.area').length,
    indice: document.querySelectorAll('.indice a[data-id]').length,
    skills: document.querySelectorAll('#instrumentos tbody tr').length,
    fuentes: document.querySelectorAll('#fuentes tbody tr').length,
    parrafos: document.querySelectorAll('main p').length,
    oculto: [...document.querySelectorAll('main section')]
      .filter(s => getComputedStyle(s).opacity === '0' ||
                   getComputedStyle(s).visibility === 'hidden').length,
  }));
  ok('el atlas de 42 áreas está en el HTML', d.areas === 42, String(d.areas));
  ok('el índice de las 350 está en el HTML', d.indice === 350, String(d.indice));
  ok('los 21 instrumentos están en el HTML', d.skills === 21, String(d.skills));
  ok('las 8 fuentes están en el HTML', d.fuentes === 8, String(d.fuentes));
  ok('el texto está entero', d.parrafos > 20, String(d.parrafos));
  ok('NADA queda oculto ni a media transición', d.oculto === 0, d.oculto + ' secciones');
  await p.context().close();
}

/* ── 5 · EL TEMA ─────────────────────────────────────────────────────── */
console.log('\n── el tema ──');
{
  const p = await abrir();
  const fondo = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const claro = await fondo();
  await p.click('#bTema');
  await p.waitForTimeout(150);
  const oscuro = await fondo();
  ok('el interruptor cambia el fondo', claro !== oscuro, claro + ' → ' + oscuro);
  ok('y el botón dice a dónde lleva',
     (await p.locator('#temaTexto').textContent()) === 'Papel',
     await p.locator('#temaTexto').textContent());

  await p.reload({ waitUntil:'domcontentloaded' });
  /* si el tema se aplicara DESPUÉS de pintar, aquí ya habría habido un
     destello del tema contrario: se comprueba en el primer momento posible */
  const alCargar = await p.evaluate(() => document.documentElement.getAttribute('data-tema'));
  ok('el tema está puesto ANTES de pintar, sin destello', alCargar === 'oscuro', String(alCargar));
  await p.waitForTimeout(200);
  ok('y el fondo sigue siendo el oscuro', (await fondo()) === oscuro);
  await p.context().close();
}

/* ── 6 · LAS PROPORCIONES ────────────────────────────────────────────── */
console.log('\n── las proporciones ──');
for(const [ancho, como] of [[390,'teléfono'], [768,'tableta'], [1280,'computadora']]){
  const p = await abrir({ viewport:{ width:ancho, height:900 } });
  const f = await p.evaluate((ancho) => {
    const desbordan = [], chicos = [];
    if(document.documentElement.scrollWidth > ancho + 1) desbordan.push('LA PÁGINA');
    document.querySelectorAll('main *, footer *').forEach(el => {
      const r = el.getBoundingClientRect();
      if(!r.width && !r.height) return;
      if(r.right > ancho + 1 || r.left < -1){
        const cs = getComputedStyle(el);
        if(cs.overflowX !== 'auto' && cs.overflowX !== 'scroll')
          desbordan.push((el.className||el.tagName) + ' ' + Math.round(r.right));
      }
    });
    document.querySelectorAll('button, input, .area').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.height && r.height < 44) chicos.push((el.id||el.className) + ' ' + Math.round(r.height));
    });
    return { desbordan, chicos };
  }, ancho);
  console.log('  · a ' + ancho + ' px (' + como + ')');
  ok(ancho + ': nada se sale de la pantalla', f.desbordan.length === 0, f.desbordan.slice(0,3).join(' · '));
  ok(ancho + ': ningún control mide menos de 44 px', f.chicos.length === 0, f.chicos.slice(0,3).join(' · '));
  await p.context().close();
}

/* ── 7 · CONTRASTE DE LOS PARES QUE IMPORTAN ─────────────────────────── */
console.log('\n── el contraste, medido ──');
for(const tema of ['light','dark']){
  const p = await abrir({ colorScheme: tema });
  const r = await p.evaluate(() => {
    const lum = (c) => {
      const [r,g,b] = c.match(/\d+/g).slice(0,3).map(Number).map(v => {
        v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
      });
      return 0.2126*r + 0.7152*g + 0.0722*b;
    };
    const ratio = (a,b) => { const [x,y] = [lum(a), lum(b)].sort((m,n) => n-m);
                             return (x + 0.05) / (y + 0.05); };
    const cs = getComputedStyle(document.body);
    const fondo = cs.backgroundColor;
    const mide = (sel) => { const e = document.querySelector(sel); if(!e) return null;
      return +ratio(getComputedStyle(e).color, fondo).toFixed(2); };
    return {
      cuerpo:  mide('#portada p'),
      tenue:   mide('.anota'),
      cifra:   mide('td.cifra'),
      clase:   mide('.clase'),
      marca:   mide('.rotulo .num'),
    };
  });
  console.log('  · tema ' + tema + ': ' + JSON.stringify(r));
  ok(tema + ': el texto de cuerpo pasa 4.5:1', r.cuerpo >= 4.5, String(r.cuerpo));
  ok(tema + ': la anotación al margen pasa 4.5:1', r.tenue >= 4.5, String(r.tenue));
  ok(tema + ': la cifra en color de marca pasa 4.5:1', r.cifra >= 4.5, String(r.cifra));
  ok(tema + ': el rótulo chico pasa 4.5:1', r.clase >= 4.5, String(r.clase));
  ok(tema + ': el número de lámina (texto grande) pasa 3:1', r.marca >= 3, String(r.marca));
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien+mal) + ' pruebas de la lámina');
process.exit(mal ? 1 : 0);
