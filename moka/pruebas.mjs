/* Pruebas de la página de producto. Se usa la página, no se lee el código.
     node moka/pruebas.mjs [http://127.0.0.1:8791]

   Lo que estas pruebas SÍ pueden cachar:
   · que el recorte se haya perdido: las tres piezas tienen que traer alfa
   · que una imagen se salga de su caja (pasó: 353 px dentro de 176)
   · que el ciclo del corte no cambie el dibujo — o sea, que la «animación»
     sea un dibujo fijo con botones al lado
   · que la página no se lea sin JavaScript
   · que un texto no llegue a 4.5:1, que algo se desborde o baje de 44 px
   · que se cuele una cuarta familia tipográfica o el violeta de la casa
   · que salga una sola petición fuera del dominio
   · que falte el crédito de las imágenes, que en CC BY-SA no es cortesía */
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const RUTA = BASE + '/moka/';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (q, c, d='') => { if(c){ bien++; console.log('  ✓ '+q); }
  else { mal++; console.log('  ✗ '+q + (d ? '  → '+d : '')); } };

const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const abrir = async (o={}) => {
  const ctx = await nav.newContext(Object.assign({ viewport:{width:1280,height:900} }, o));
  const p = await ctx.newPage(); p.__err = []; p.__http = [];
  p.on('pageerror', e => p.__err.push(String(e)));
  p.on('console', m => { if(m.type()==='error') p.__err.push('consola: '+m.text()); });
  p.on('response', r => { if(r.status() >= 400) p.__http.push(r.status()+' '+r.url()); });
  await p.goto(RUTA, { waitUntil:'networkidle' });
  await p.waitForTimeout(700);
  return p;
};

/* ── 1 · LAS IMÁGENES: EL RECORTE Y SU SITIO ─────────────────────────
   ⚠ EL ALFA ES LO QUE SE HIZO A MANO Y ES LO QUE SE PUEDE PERDER. Basta con
   que alguien vuelva a exportar una pieza sin transparencia para que aparezca
   un rectángulo gris sobre el fondo oscuro, y en una miniatura no se nota. */
console.log('\n── las imágenes ──');
{
  const p = await abrir();
  ok('ninguna imagen falta', p.__http.length === 0, p.__http.slice(0,3).join(' · '));
  const r = await p.evaluate(async () => {
    const mide = (src) => new Promise(res => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let trans = 0;
        for(let i = 3; i < d.length; i += 4*97) if(d[i] < 250) trans++;
        res({ src, w:im.naturalWidth, h:im.naturalHeight,
              conAlfa: trans > (d.length/(4*97))*0.15 });
      };
      im.onerror = () => res({ src, error:1 });
      im.src = src;
    });
    return Promise.all(['img/jarra.webp','img/embudo.webp','img/caldera.webp',
                        'img/accion.webp'].map(mide));
  });
  const piezas = r.filter(x => !x.src.includes('accion'));
  ok('las tres piezas recortadas traen transparencia',
     piezas.every(x => x.conAlfa), piezas.filter(x => !x.conAlfa).map(x=>x.src).join(', '));
  ok('y la foto en uso no la trae, porque es una foto',
     !r.find(x => x.src.includes('accion')).conAlfa);

  const f = await p.evaluate(() => {
    const fuera = [];
    document.querySelectorAll('.pieza .foto img, .montaje img').forEach(im => {
      const a = im.getBoundingClientRect(), b = im.parentElement.getBoundingClientRect();
      if(a.height > b.height + 2 || a.width > b.width + 2)
        fuera.push(im.className + ' ' + Math.round(a.width) + '×' + Math.round(a.height) +
                   ' en ' + Math.round(b.width) + '×' + Math.round(b.height));
    });
    return fuera;
  });
  ok('ninguna imagen se sale de su caja', f.length === 0, f.slice(0,3).join(' · '));
  const sinAlt = await p.locator('main img:not([alt]), header img:not([alt])').count();
  ok('toda imagen tiene alt', sinAlt === 0, String(sinAlt));
  await p.context().close();
}

/* ── 2 · EL MONTAJE DE LA PORTADA ────────────────────────────────────── */
console.log('\n── el montaje ──');
{
  const p = await abrir();
  const s = await p.evaluate(() => {
    const m = document.querySelector('#montaje');
    return { armado: m.classList.contains('armado'),
             opacidades: [...m.querySelectorAll('img')].map(i => getComputedStyle(i).opacity) };
  });
  ok('las tres piezas acaban montadas y visibles',
     s.armado && s.opacidades.every(o => Number(o) > 0.95), s.opacidades.join(', '));
  await p.context().close();
}

/* ── 3 · EL CICLO DEL CORTE ──────────────────────────────────────────
   Lo que hay que poder reprobar no es que los botones existan: es que el
   dibujo CAMBIE. Un SVG fijo con cinco botones al lado se ve igual en una
   captura y no anima nada. */
console.log('\n── el corte animado ──');
{
  const p = await abrir();
  await p.evaluate(() => document.querySelector('#funciona').scrollIntoView());
  await p.waitForTimeout(400);
  const leer = () => p.evaluate(() => ['agua','columna','cafeArriba'].map(id => {
    const e = document.getElementById(id);
    return e.getAttribute('y') + ':' + e.getAttribute('height');
  }).join('|'));
  const uno = await leer();
  await p.click('.paso[data-paso="4"]');
  await p.waitForTimeout(1400);
  const cinco = await leer();
  ok('tocar un paso cambia el dibujo', uno !== cinco, uno + ' vs ' + cinco);

  const agua = await p.evaluate(() => Number(document.getElementById('agua').getAttribute('height')));
  const cafe = await p.evaluate(() => Number(document.getElementById('cafeArriba').getAttribute('height')));
  ok('al final queda poca agua abajo', agua < 20, String(agua));
  ok('y el café está arriba', cafe > 100, String(cafe));

  await p.click('#bReiniciar'); await p.waitForTimeout(1300);
  ok('volver al principio devuelve el agua', (await leer()) === uno);

  await p.click('#bJugar'); await p.waitForTimeout(400);
  const enCurso = await leer();
  await p.waitForTimeout(3400);
  ok('el ciclo avanza solo', enCurso !== (await leer()));
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err[0]);
  await p.context().close();
}

/* ── 4 · SIN JAVASCRIPT ──────────────────────────────────────────────── */
console.log('\n── con el JavaScript apagado ──');
{
  const ctx = await nav.newContext({ javaScriptEnabled:false, viewport:{width:1280,height:900} });
  const p = await ctx.newPage();
  await p.goto(RUTA, { waitUntil:'domcontentloaded' });
  const r = await p.evaluate(() => {
    /* ⚠ DOS COSAS SE SALTAN, Y LAS DOS ESTÁN BIEN OCULTAS. Los botones del
       ciclo, porque sin JavaScript no pueden hacer nada. Y la llama y el
       vapor del dibujo, que arrancan a opacidad 0 porque el corte empieza con
       el agua fría: sin motor se ve el primer estado, que es un estado
       válido. Ojo con `e.className` en SVG — ahí no es una cadena, es un
       SVGAnimatedString, y el mensaje de fallo salía como «[object ...]». */
    const dentroDeSvg = (e) => e.ownerSVGElement || e.tagName === 'svg';
    const ocultos = [...document.querySelectorAll('main *, header *')].filter(e => {
      if(e.closest('.mandos') || dentroDeSvg(e)) return false;
      const cs = getComputedStyle(e);
      return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
    }).map(e => e.tagName + '.' + (e.getAttribute('class') || ''));
    const movidos = [...document.querySelectorAll('.destapa > *, .surge')]
      .filter(e => getComputedStyle(e).transform !== 'none').length;
    return { ocultos, movidos, texto: document.body.innerText.length };
  });
  ok('no queda contenido oculto', r.ocultos.length === 0, r.ocultos.slice(0,3).join(' · '));
  ok('ni nada desplazado a medias', r.movidos === 0, String(r.movidos));
  ok('y hay texto de verdad', r.texto > 2000, r.texto + ' caracteres');
  await ctx.close();
}

/* ── 5 · ANCHOS Y OBJETIVOS TÁCTILES ─────────────────────────────────── */
console.log('\n── en la mano y en la mesa ──');
for(const [ancho, como] of [[390,'teléfono'],[768,'tableta'],[1280,'computadora']]){
  const p = await abrir({ viewport:{ width:ancho, height:900 } });
  const f = await p.evaluate((w) => {
    /* ⚠ UN ELEMENTO RECORTADO POR SU PADRE NO DESBORDA LA PÁGINA. La foto en
       uso entra con `scale(1.06)`, así que su caja mide un 6 % más que su
       hueco — pero el contenedor tiene `overflow:hidden` y la recorta: no se
       ve ni una barra de scroll. Medir la caja sin mirar quién recorta
       reprobaba por una animación que funciona. */
    const loRecortan = (el) => {
      for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){
        const o = getComputedStyle(p);
        if(o.overflowX === 'hidden' || o.overflowX === 'clip' ||
           o.overflow === 'hidden' || o.overflow === 'clip') return true;
      }
      return false;
    };
    const desbordan = [], chicos = [];
    document.querySelectorAll('main *, header *, footer *').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.width && (r.right > w + 1 || r.left < -1) && !loRecortan(el))
        desbordan.push((el.tagName+'.'+(el.getAttribute('class')||'')).slice(0,34));
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

/* ── 6 · CONTRASTE ───────────────────────────────────────────────────── */
console.log('\n── el contraste, medido ──');
{
  const p = await abrir();
  const r = await p.evaluate(() => {
    const lum = (c) => { const [r,g,b] = c.match(/[\d.]+/g).slice(0,3).map(Number).map(v => {
      v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
      return 0.2126*r + 0.7152*g + 0.0722*b; };
    const ratio = (a,b) => { const [x,y] = [lum(a), lum(b)].sort((m,n) => n-m);
                             return (x+0.05)/(y+0.05); };
    const fondo = getComputedStyle(document.body).backgroundColor;
    const panel = getComputedStyle(document.querySelector('.pieza')).backgroundColor;
    const mide = (s, c) => { const e = document.querySelector(s); if(!e) return null;
      return +ratio(getComputedStyle(e).color, c || fondo).toFixed(2); };
    return { marca:mide('.marca'), subtitulo:mide('.subtitulo'), epi:mide('.epi'),
             dice:mide('.dice'), cifra:mide('.ficha-rapida b'), et:mide('.ficha-rapida span'),
             piezaTxt:mide('.pieza p', panel), pasoTxt:mide('.paso span span'),
             ml:mide('.talla .ml'), pie:mide('footer p') };
  });
  console.log('  · ' + JSON.stringify(r));
  for(const [k,v] of Object.entries(r)) ok(k + ' pasa 4.5:1', v >= 4.5, String(v));
  await p.context().close();
}

/* ── 7 · IDENTIDAD Y PETICIONES ──────────────────────────────────────── */
console.log('\n── la identidad ──');
{
  const p = await abrir();
  const r = await p.evaluate(() => {
    const MUDOS = { SCRIPT:1, STYLE:1, TEMPLATE:1, NOSCRIPT:1, svg:1, path:1, rect:1, g:1, text:1, defs:1, clipPath:1 };
    const propio = (e) => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const esVioleta = (c) => { const m = c.match(/[\d.]+/g); if(!m || m.length < 3) return false;
      const [r,g,b] = m.map(Number);
      if(m.length > 3 && Number(m[3]) === 0) return false;
      return b > 120 && r > 90 && g < Math.min(r,b) - 45 && b - g > 60 && r - g > 40; };
    const fam = new Set(), violetas = [];
    document.body.querySelectorAll('*').forEach(e => {
      if(MUDOS[e.tagName]) return;
      const cs = getComputedStyle(e);
      if(propio(e) && cs.display !== 'none')
        fam.add((cs.fontFamily||'').split(',')[0].trim().replace(/^["']|["']$/g,''));
      for(const k of ['color','backgroundColor','borderTopColor'])
        if(cs[k] && esVioleta(cs[k])) violetas.push(e.tagName + ' ' + k + ' ' + cs[k]);
    });
    const caras = [];
    for(const h of document.styleSheets){ let g; try{ g = h.cssRules; }catch(e){ continue; }
      for(const x of g||[]) if(x.constructor.name === 'CSSFontFaceRule')
        caras.push(x.style.fontFamily.replace(/["']/g,'')); }
    return { fam:[...fam].sort(), violetas:violetas.slice(0,3), caras:[...new Set(caras)].sort() };
  });
  console.log('  · familias: ' + r.fam.join(', '));
  const PROPIAS = ['Rotulo','Texto','Cifra'];
  ok('ni un violeta de la casa', r.violetas.length === 0, r.violetas.join(' · '));
  ok('ninguna cara ajena declarada', r.caras.every(c => PROPIAS.includes(c)), r.caras.join(', '));
  ok('sólo tres registros tipográficos',
     r.fam.filter(f => f && !PROPIAS.includes(f) && !/monospace/.test(f)).length === 0, r.fam.join(', '));
  await p.context().close();
}
{
  const ctx = await nav.newContext({ viewport:{width:1280,height:900} });
  const p = await ctx.newPage();
  const fuera = [];
  p.on('request', q => { if(!q.url().startsWith(BASE) && !q.url().startsWith('data:')) fuera.push(q.url()); });
  await p.goto(RUTA, { waitUntil:'networkidle' });
  await p.waitForTimeout(600);
  ok('ninguna petición sale de este dominio', fuera.length === 0, fuera.slice(0,3).join(' · '));
  await ctx.close();
}

/* ── 8 · EL CRÉDITO, QUE EN CC BY-SA NO ES CORTESÍA ──────────────────── */
console.log('\n── los créditos ──');
{
  const p = await abrir();
  const t = await p.locator('footer').textContent();
  ok('el pie nombra la licencia', /CC BY-SA/.test(t));
  ok('y al autor del despiece', /Shisma/.test(t));
  ok('y dice que se le quitó el fondo aquí', /quit[óo] el fondo/i.test(t));
  ok('y enlaza el archivo de créditos', await p.locator('footer a[href="CREDITOS.md"]').count() === 1);
  const cr = await p.request.get(BASE + '/moka/CREDITOS.md');
  ok('el archivo de créditos existe y se sirve', cr.status() === 200, String(cr.status()));
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien+mal) + ' pruebas de la cafetera');
process.exit(mal ? 1 : 0);
