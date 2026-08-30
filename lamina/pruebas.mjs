/* Pruebas de la lámina. Se usa la página, no se lee el código.
     node lamina/pruebas.mjs [http://127.0.0.1:8791]

   Lo que estas pruebas SÍ pueden cachar:
   · que el registro no cuadre con lo que se pinta
   · que el flujo de tres niveles no baje, no suba, o se salte de lado
   · que la cámara no se mueva —o sea, que las «transiciones» sean un cambio
     de pantalla disfrazado—
   · que el tono del sistema no se herede hasta la ficha
   · que la máscara del destape corte los acentos (ya pasó: «DISENO»)
   · que la lámina NO se lea con el JavaScript apagado
   · que un texto no llegue a 4.5:1, que algo se desborde o baje de 44 px
   · que la identidad sea prestada: un color, una letra o un logo de otro
   · que salga UNA sola petición fuera del dominio */
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const RUTA = BASE + '/lamina/';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (que, cond, det='') => { if(cond){ bien++; console.log('  ✓ '+que); }
  else { mal++; console.log('  ✗ '+que + (det ? '  → '+det : '')); } };

const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const abrir = async (o={}) => {
  const ctx = await nav.newContext(Object.assign({ viewport:{width:1280,height:900} }, o));
  const p = await ctx.newPage(); p.__err = [];
  p.on('pageerror', e => p.__err.push(String(e)));
  p.on('console', m => { if(m.type()==='error') p.__err.push('consola: '+m.text()); });
  await p.goto(RUTA, { waitUntil:'networkidle' });
  await p.waitForTimeout(500);
  return p;
};

/* ── 1 · EL REGISTRO CUADRA ──────────────────────────────────────────── */
console.log('\n── el registro ──');
{
  const p = await abrir();
  const d = await p.evaluate(() => {
    const areasDeSistemas = SISTEMAS.flatMap(s => s.areas);
    return {
      piezas: NEURONAS.length,
      areas: AREAS.length,
      sistemas: SISTEMAS.length,
      areasListadas: areasDeSistemas.length,
      repetidas: areasDeSistemas.length - new Set(areasDeSistemas).size,
      huerfanas: AREAS.filter(a => !areasDeSistemas.includes(a.a)).map(a => a.a),
      inexistentes: areasDeSistemas.filter(a => !AREAS.some(x => x.a === a)),
      sumaSistemas: SISTEMAS.reduce((t,s) => t + s.areas.reduce(
        (u,a) => u + (AREAS.find(x => x.a === a)?.n || 0), 0), 0),
      tarjetas: document.querySelectorAll('.sis').length,
      pintadas: Number(document.querySelector('#cPiezas').textContent),
      sinCazar: NEURONAS.filter(n => !n.comoCazarlo).length,
      sinFuente: NEURONAS.filter(n => !n.salioDe).length,
    };
  });
  ok('seis sistemas, seis tarjetas', d.sistemas === 6 && d.tarjetas === 6,
     d.sistemas + ' / ' + d.tarjetas);
  ok('ningún área repetida entre sistemas', d.repetidas === 0, String(d.repetidas));
  ok('ningún área listada que no exista', d.inexistentes.length === 0, d.inexistentes.join(', '));
  ok('ningún área cargada que ningún sistema reclame', d.huerfanas.length === 0, d.huerfanas.join(', '));
  ok('las piezas de los seis suman el total', d.sumaSistemas === d.piezas,
     d.sumaSistemas + ' vs ' + d.piezas);
  ok('la cifra de portada es la de verdad', d.pintadas === d.piezas,
     d.pintadas + ' vs ' + d.piezas);
  ok('toda pieza dice cómo cazarla', d.sinCazar === 0, String(d.sinCazar));
  ok('toda pieza dice de dónde salió', d.sinFuente === 0, String(d.sinFuente));
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err[0]);
  await p.context().close();
}

/* ── 2 · EL FLUJO DE TRES NIVELES ────────────────────────────────────
   Carlos, e278: «menú con acceso a diferentes submenús los cuales tienen
   acceso a diferentes submenús pero no se llevan al mismo entre sí». Eso es
   un árbol, y lo que hay que poder reprobar es que se convierta en una rueda:
   que desde las áreas de un sistema se pueda saltar a las de otro. */
console.log('\n── el flujo de app: tres niveles ──');
{
  const p = await abrir();
  const vivo = () => p.evaluate(() => {
    const v = document.querySelector('.plano.vivo');
    return v ? v.id : null;
  });
  ok('arranca en los sistemas', (await vivo()) === 'pSistemas');

  await p.locator('.sis').nth(3).click();
  await p.waitForTimeout(500);
  ok('bajar un sistema abre sus áreas', (await vivo()) === 'pAreas');
  const nAreas = await p.locator('#listaAreas .area').count();
  ok('y sólo las suyas', nAreas === 9, String(nAreas) + ' áreas');

  /* LA QUE IMPORTA: desde el nivel 2 no se puede saltar a otro sistema */
  const salidas = await p.evaluate(() => {
    const plano = document.querySelector('#pAreas');
    return [...plano.querySelectorAll('button')].map(b =>
      b.className.split(' ')[0] || b.tagName).filter(c => c !== 'area');
  });
  ok('desde las áreas sólo se puede bajar o subir, nunca saltar de lado',
     salidas.every(c => c === 'volver'), 'botones que no son área ni volver: ' +
     salidas.filter(c => c !== 'volver').join(', '));

  await p.locator('#listaAreas .area').nth(2).click();
  await p.waitForTimeout(500);
  ok('bajar un área abre sus piezas', (await vivo()) === 'pPiezas');
  const migas = await p.locator('#migas').textContent();
  ok('y las migas enseñan los tres niveles', migas.split('/').length === 3, migas);

  await p.locator('#pPiezas .volver').click();
  await p.waitForTimeout(500);
  ok('el botón de volver sube un nivel', (await vivo()) === 'pAreas');
  await p.locator('#pAreas .volver').click();
  await p.waitForTimeout(500);
  ok('y otra vez sube al primero', (await vivo()) === 'pSistemas');
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err[0]);
  await p.context().close();
}

/* ── 3 · LA CÁMARA SE MUEVE DE VERDAD ────────────────────────────────
   «Transiciones» y «cambios de cámara» son verificables: el plano que llega
   tiene que estar TRANSFORMADO a mitad del cambio. Si sólo se enciende y se
   apaga, esto es un cambio de pantalla con otro nombre. */
console.log('\n── la cámara ──');
{
  const p = await abrir();
  await p.evaluate(() => document.querySelector('#atlas').scrollIntoView());
  await p.waitForTimeout(300);
  const muestras = await p.evaluate(async () => {
    document.querySelector('.sis').click();
    const leer = () => getComputedStyle(document.querySelector('#pAreas')).transform;
    const t = [];
    for(let i = 0; i < 8; i++){
      t.push(leer());
      await new Promise(r => requestAnimationFrame(r));
    }
    return t;
  });
  const distintos = new Set(muestras).size;
  ok('el plano que entra está transformado y va cambiando', distintos >= 3,
     distintos + ' valores distintos: ' + muestras.slice(0,3).join(' | ').slice(0,90));
  await p.waitForTimeout(600);
  const final = await p.evaluate(() => getComputedStyle(document.querySelector('#pAreas')).transform);
  ok('y acaba en su sitio, sin transformar', final === 'none' || final === 'matrix(1, 0, 0, 1, 0, 0)', final);
  await p.context().close();
}

/* ── 4 · EL TONO SE HEREDA ───────────────────────────────────────────── */
console.log('\n── el color, que informa ──');
{
  const p = await abrir();
  const tono = () => p.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--tono').trim());
  const esperados = await p.evaluate(() => SISTEMAS.map(s => String(s.tono)));
  ok('ningún tono cae en el violeta de la casa (270°–310°)',
     esperados.every(t => Number(t) < 265 || Number(t) > 315), esperados.join(', '));

  await p.locator('.sis').nth(3).click(); await p.waitForTimeout(450);
  ok('al abrir un sistema el tono pasa a ser el suyo',
     (await tono()) === esperados[3], (await tono()) + ' vs ' + esperados[3]);

  await p.locator('#listaAreas .area').nth(0).click(); await p.waitForTimeout(450);
  await p.locator('.pieza').nth(0).click(); await p.waitForTimeout(450);
  const borde = await p.evaluate(() => getComputedStyle(document.querySelector('#ficha')).borderLeftColor
                                     || getComputedStyle(document.querySelector('#ficha')).borderTopColor);
  const vivo = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--vivo').trim());
  ok('y la ficha hereda ese mismo tono', borde.length > 0 && vivo.includes(esperados[3]),
     borde + ' · --vivo ' + vivo);

  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  ok('la ficha se cierra con Escape', await p.locator('#ficha').isHidden());
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err[0]);
  await p.context().close();
}

/* ── 5 · EL DESTAPE, Y LOS ACENTOS ───────────────────────────────────
   ⚠ ESTA PRUEBA EXISTE POR UN DEFECTO REAL. La máscara del destape es
   `overflow:hidden`, y con `line-height:1` —lo normal en un rótulo en
   versalitas— recorta por encima de la caja de línea: la tilde de la Ñ y el
   acento de la Ó se quedaban fuera y la portada decía «DEPARTAMENTO DE DISENO
   · SEGUNDA EDICION». En una captura pequeña parece una errata de quien
   escribió, no un fallo de CSS, y por eso casi no se ve. */
console.log('\n── el destape ──');
{
  const p = await abrir();
  const r = await p.evaluate(() => {
    const ds = [...document.querySelectorAll('.destapa')];
    const apretados = ds.filter(d => {
      const cs = getComputedStyle(d);
      const px = parseFloat(cs.fontSize);
      return parseFloat(cs.paddingTop) < px * 0.15;
    }).map(d => (d.textContent || '').slice(0, 24));
    return { total: ds.length, apretados,
      visibles: document.querySelectorAll('#portico .destapa.visible, #portico .visible .destapa').length,
      opacidades: ds.map(d => getComputedStyle(d.firstElementChild || d).opacity)
                    .filter(o => Number(o) > 0 && Number(o) < 1).length };
  });
  ok('hay destapes en la página', r.total >= 6, String(r.total));
  ok('ninguna máscara puede cortar los acentos', r.apretados.length === 0,
     'sin aire arriba: ' + r.apretados.join(' · '));
  ok('el pórtico se destapa al cargar, sin esperar al scroll', r.visibles >= 3, String(r.visibles));
  ok('ningún texto se queda a media opacidad', r.opacidades === 0, String(r.opacidades));
  await p.context().close();
}

/* ── 6 · SIN JAVASCRIPT SIGUE HABIENDO LÁMINA ────────────────────────── */
console.log('\n── con el JavaScript apagado ──');
{
  const ctx = await nav.newContext({ javaScriptEnabled:false, viewport:{width:1280,height:900} });
  const p = await ctx.newPage();
  await p.goto(RUTA, { waitUntil:'domcontentloaded' });
  const r = await p.evaluate(() => {
    /* ⚠ LOS BOTONES DE VOLVER SÍ SE ESCONDEN, Y ESTÁ BIEN. Sin JavaScript los
       tres niveles se enseñan apilados, así que no hay de dónde volver: un
       botón que no puede hacer nada es peor visible que oculto. Lo que no
       puede faltar es CONTENIDO, que es lo que esta prueba mira. */
    const soloConJs = (e) => e.closest('.volver') || e.id === 'campo';
    const ocultos = [...document.querySelectorAll('main *')].filter(e => {
      if(soloConJs(e)) return false;
      const cs = getComputedStyle(e);
      return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
    }).map(e => e.tagName + '.' + e.className);
    const movidos = [...document.querySelectorAll('.destapa > *, .surge')].filter(e =>
      getComputedStyle(e).transform !== 'none').length;
    /* Los tres planos del menú los llena el motor, así que sin motor están
       vacíos — y por eso existe el atlas en llano, que es donde tiene que
       estar el contenido. Lo que se comprueba es eso: que esté ENTERO. */
    const plano = document.querySelector('#atlasPlano');
    return { ocultos, movidos,
             enLlano: plano ? plano.querySelectorAll('li').length : 0,
             sistemasEnLlano: plano ? plano.querySelectorAll('section').length : 0,
             visible: plano ? getComputedStyle(plano).display !== 'none' : false,
             texto: document.body.innerText.length };
  });
  ok('no queda contenido oculto', r.ocultos.length === 0, r.ocultos.slice(0,3).join(' · '));
  ok('ni nada desplazado a medias', r.movidos === 0, String(r.movidos));
  ok('el atlas en llano está y se ve', r.visible);
  ok('con los seis sistemas', r.sistemasEnLlano === 6, String(r.sistemasEnLlano));
  ok('y con las 353 piezas, no una muestra', r.enLlano === 353, String(r.enLlano));
  ok('y hay texto de verdad en la página', r.texto > 20000, r.texto + ' caracteres');
  await ctx.close();
}

/* ── 7 · ANCHOS Y OBJETIVOS TÁCTILES ─────────────────────────────────── */
console.log('\n── en la mano y en la mesa ──');
for(const [ancho, como] of [[390,'teléfono'],[768,'tableta'],[1280,'computadora']]){
  const p = await abrir({ viewport:{ width:ancho, height:900 } });
  const f = await p.evaluate((w) => {
    const desbordan = [], chicos = [];
    document.querySelectorAll('main *, header *, footer *').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.width && (r.right > w + 1 || r.left < -1))
        desbordan.push((el.tagName+'.'+el.className).slice(0,34));
    });
    document.querySelectorAll('button').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.height && r.height < 44) chicos.push((el.className||el.tagName) + ' ' + Math.round(r.height));
    });
    return { desbordan:[...new Set(desbordan)], chicos:[...new Set(chicos)] };
  }, ancho);
  console.log('  · a ' + ancho + ' px (' + como + ')');
  ok(ancho + ': nada se sale de la pantalla', f.desbordan.length === 0, f.desbordan.slice(0,3).join(' · '));
  ok(ancho + ': ningún control mide menos de 44 px', f.chicos.length === 0, f.chicos.slice(0,3).join(' · '));
  await p.context().close();
}

/* ── 8 · CONTRASTE ───────────────────────────────────────────────────── */
console.log('\n── el contraste, medido ──');
{
  const p = await abrir();
  const r = await p.evaluate(() => {
    const lum = (c) => { const [r,g,b] = c.match(/[\d.]+/g).slice(0,3).map(Number).map(v => {
      v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
      return 0.2126*r + 0.7152*g + 0.0722*b; };
    const ratio = (a,b) => { const [x,y] = [lum(a), lum(b)].sort((m,n) => n-m);
                             return (x + 0.05) / (y + 0.05); };
    const fondo = getComputedStyle(document.body).backgroundColor;
    const mide = (sel, contra) => { const e = document.querySelector(sel); if(!e) return null;
      return +ratio(getComputedStyle(e).color, contra || fondo).toFixed(2); };
    const panel = getComputedStyle(document.querySelector('.sis')).backgroundColor;
    return {
      cuerpo:  mide('.dice'),
      epigrafe:mide('.epigrafe'),
      cifra:   mide('.tira .cifra'),
      et:      mide('.tira .et'),
      /* en el primer nivel «Lámina» es el sitio donde estás, así que es un
         span y no un botón: se mide el primero, sea lo que sea */
      migas:   mide('#migas > *'),
      cuenta:  mide('#cuenta'),
      sisTit:  mide('.sis h3', panel),
      sisTxt:  mide('.sis p', panel),
      sisPie:  mide('.sis .pie span', panel),
      pie:     mide('footer p'),
    };
  });
  console.log('  · ' + JSON.stringify(r));
  for(const [k,v] of Object.entries(r)){
    const grande = (k === 'cifra');
    ok(k + ' pasa ' + (grande ? '3:1 (texto grande)' : '4.5:1'), v >= (grande ? 3 : 4.5), String(v));
  }
  await p.context().close();
}

/* ── 9 · LA IDENTIDAD ES SUYA ────────────────────────────────────────── */
console.log('\n── la identidad ──');
{
  const p = await abrir();
  const r = await p.evaluate(() => {
    const MUDOS = { SCRIPT:1, STYLE:1, TEMPLATE:1, NOSCRIPT:1, CANVAS:1 };
    const propio = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const esVioleta = (c) => { const m = c.match(/[\d.]+/g); if(!m || m.length < 3) return false;
      const [r,g,b] = m.map(Number);
      if(m.length > 3 && Number(m[3]) === 0) return false;
      return b > 120 && r > 90 && g < Math.min(r,b) - 45 && b - g > 60 && r - g > 40; };
    const familias = new Set(), violetas = [];
    document.body.querySelectorAll('*').forEach(el => {
      if(MUDOS[el.tagName]) return;
      const cs = getComputedStyle(el);
      if(propio(el) && cs.display !== 'none')
        familias.add((cs.fontFamily||'').split(',')[0].trim().replace(/^["']|["']$/g,''));
      for(const prop of ['color','backgroundColor','borderTopColor','borderLeftColor','outlineColor'])
        if(cs[prop] && esVioleta(cs[prop])) violetas.push(el.tagName + ' ' + prop + ' ' + cs[prop]);
    });
    const caras = [];
    for(const h of document.styleSheets){ let g; try{ g = h.cssRules; }catch(e){ continue; }
      for(const x of g || []) if(x.constructor.name === 'CSSFontFaceRule')
        caras.push(x.style.fontFamily.replace(/["']/g,'')); }
    return { familias:[...familias].sort(), violetas:violetas.slice(0,4),
             caras:[...new Set(caras)].sort(),
             logos: document.querySelectorAll('.paloma, [class*="logo"]').length };
  });
  console.log('  · familias en uso: ' + r.familias.join(', '));
  const PROPIAS = ['Rotulo','Texto','Cifra'];
  const intrusas = r.familias.filter(f => f && !PROPIAS.includes(f));
  ok('ni un violeta de la casa en la página pintada', r.violetas.length === 0, r.violetas.join(' · '));
  ok('ninguna cara tipográfica ajena declarada',
     r.caras.every(c => PROPIAS.includes(c)), r.caras.join(', '));
  ok('ningún logo de la casa incrustado', r.logos === 0, String(r.logos));
  ok('sólo hay tres registros tipográficos', intrusas.length === 0, 'intrusas: ' + intrusas.join(', '));
  await p.context().close();
}

/* ── 10 · NI UNA PETICIÓN A NADIE ────────────────────────────────────── */
console.log('\n── de dónde salen los bytes ──');
{
  const ctx = await nav.newContext({ viewport:{width:1280,height:900} });
  const p = await ctx.newPage();
  const fuera = [];
  p.on('request', q => { if(!q.url().startsWith(BASE) && !q.url().startsWith('data:')) fuera.push(q.url()); });
  await p.goto(RUTA, { waitUntil:'networkidle' });
  await p.waitForTimeout(700);
  ok('ninguna petición sale de este dominio', fuera.length === 0, fuera.slice(0,3).join(' · '));
  await ctx.close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien+mal) + ' pruebas de la lámina');
process.exit(mal ? 1 : 0);
