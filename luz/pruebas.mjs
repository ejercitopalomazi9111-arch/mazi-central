/* Pruebas de «El año en luz». Se usa la página, no se lee el código.
     node luz/pruebas.mjs [http://127.0.0.1:8791]

   Lo que estas pruebas SÍ pueden cachar:
   · que la astronomía esté mal — se contrasta contra constantes conocidas que
     no dependen de esta implementación: la declinación en los solsticios, los
     extremos de la ecuación del tiempo, las doce horas del ecuador
   · que la página no diga nada con el JavaScript apagado
   · que un `id` esté repetido (ya pasó una vez y no se vio en la pantalla)
   · que un texto no llegue al contraste, en los dos temas
   · que algo se salga de la pantalla o quede por debajo de 44 px
   · que se haya colado una cuarta familia tipográfica, o la marca de otro */
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const RUTA = BASE + '/luz/';
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
  await p.waitForTimeout(400);
  return p;
};

/* ── 1 · LA ASTRONOMÍA, CONTRA CONSTANTES QUE NO SALEN DE AQUÍ ────────
   Una cuenta no se comprueba con su propio resultado. Todo lo de aquí está
   publicado desde hace un siglo y no depende de esta implementación:
   ±23.44° de declinación en los solsticios, +16.4 y −14.2 minutos como
   extremos de la ecuación del tiempo, y doce horas y siete minutos en el
   ecuador todo el año —los siete minutos son la refracción y el radio del
   disco, no un redondeo—. */
console.log('\n── la astronomía ──');
{
  const p = await abrir();
  const r = await p.evaluate(async () => {
    const { luzDe } = await import('./sol.js');
    const dec = (m,d) => luzDe(2026,m,d,0,0,0).dec;
    const ec  = (m,d) => 720 - luzDe(2026,m,d,0,0,0).medio;
    const luz = (m,d,lat) => luzDe(2026,m,d,lat,0,0).horasLuz;
    return {
      decJun: dec(6,21), decDic: dec(12,21), decMar: dec(3,20),
      ecNov: ec(11,3), ecFeb: ec(2,11),
      ecuador: [[1,15],[3,20],[6,21],[9,22],[12,21]].map(([m,d]) => luz(m,d,0)),
      equinoccio: [0,20,40,60,-40].map(l => luz(3,20,l)),
      articoJun: luz(6,21,66.56),
      simetria: [luz(6,21,40), luz(12,21,-40)],
    };
  });
  ok('declinación +23.44° en el solsticio de junio', Math.abs(r.decJun - 23.44) < 0.02, r.decJun.toFixed(3));
  ok('declinación −23.44° en el de diciembre',       Math.abs(r.decDic + 23.44) < 0.02, r.decDic.toFixed(3));
  ok('declinación ~0° en el equinoccio de marzo',    Math.abs(r.decMar) < 0.35, r.decMar.toFixed(3));
  ok('ecuación del tiempo: +16.4 min el 3 de noviembre', Math.abs(r.ecNov - 16.4) < 0.3, r.ecNov.toFixed(2));
  ok('ecuación del tiempo: −14.2 min el 11 de febrero',  Math.abs(r.ecFeb + 14.2) < 0.3, r.ecFeb.toFixed(2));
  ok('en el ecuador el día dura 12 h 07 m todo el año',
     r.ecuador.every(h => Math.abs(h - 12.118) < 0.02), r.ecuador.map(h=>h.toFixed(3)).join(' '));
  ok('en el equinoccio dura lo mismo en toda latitud',
     r.equinoccio.every(h => Math.abs(h - 12.13) < 0.09), r.equinoccio.map(h=>h.toFixed(3)).join(' '));
  ok('en el círculo polar ártico, el 21 de junio no se pone', r.articoJun === 24, String(r.articoJun));
  ok('el norte en junio es el sur en diciembre',
     Math.abs(r.simetria[0] - r.simetria[1]) < 0.01, r.simetria.map(h=>h.toFixed(4)).join(' vs '));
  ok('sin errores de JavaScript', p.__err.length === 0, p.__err.slice(0,2).join(' · '));
  await p.context().close();
}

/* ── 2 · LO QUE SE VE, CUADRA CON LO QUE SE CALCULA ──────────────────── */
console.log('\n── la página dice lo que calcula ──');
{
  const p = await abrir();
  const r = await p.evaluate(async () => {
    const { luzDe } = await import('./sol.js');
    const { LUGARES } = await import('./lugares.js');
    const n = new Date(), L = LUGARES[0];
    const c = luzDe(n.getFullYear(), n.getMonth()+1, n.getDate(), L.lat, L.lon, L.huso);
    const t = Math.round(c.horasLuz*60);
    return { pinta: document.querySelector('#horas').textContent + ':' +
                    document.querySelector('#mins').textContent,
             debe: Math.floor(t/60) + ':' + String(t%60).padStart(2,'0'),
             tramos: document.querySelectorAll('#barraDia .tramo').length,
             ejes: document.querySelectorAll('#ejeHoras span').length,
             meses: document.querySelectorAll('#meses span').length,
             filas: document.querySelectorAll('#mensual tr').length };
  });
  ok('la cifra grande es la del cálculo de hoy', r.pinta === r.debe, r.pinta + ' vs ' + r.debe);
  ok('la barra del día tiene sus cuatro tramos', r.tramos === 4, String(r.tramos));
  ok('el eje de horas está fuera del lienzo y tiene sus rótulos', r.ejes === 7, String(r.ejes));
  ok('los doce meses están rotulados', r.meses === 12, String(r.meses));
  ok('la tabla mensual tiene doce filas', r.filas === 12, String(r.filas));
  await p.context().close();
}

/* ── 3 · LOS SITIOS DONDE EL SOL NO SALE ─────────────────────────────── */
console.log('\n── el caso raro que no es raro ──');
{
  const p = await abrir();
  const r = await p.evaluate(async () => {
    const { luzDe } = await import('./sol.js');
    const u = luzDe(2026,6,21,-54.80,-68.30,-180);   /* Ushuaia, invierno austral */
    const v = luzDe(2026,12,21,-54.80,-68.30,-180);  /* y su verano */
    const rey = luzDe(2026,6,21,64.15,-21.94,0);     /* Reikiavik en junio */
    return { ushInv:u.horasLuz, ushVer:v.horasLuz, rey:rey.horasLuz,
             reyTexto: !!rey.salida };
  });
  ok('en Ushuaia el día más corto baja de 8 h', r.ushInv < 8, r.ushInv.toFixed(2));
  ok('y el más largo pasa de 17 h',             r.ushVer > 17, r.ushVer.toFixed(2));
  ok('Reikiavik en junio pasa de 21 h de luz',  r.rey > 21, r.rey.toFixed(2));
  await p.context().close();
}

/* ── 4 · SIN JAVASCRIPT SIGUE HABIENDO PÁGINA ────────────────────────── */
console.log('\n── con el JavaScript apagado ──');
{
  const ctx = await nav.newContext({ javaScriptEnabled:false, viewport:{width:1280,height:900} });
  const p = await ctx.newPage();
  await p.goto(RUTA, { waitUntil:'domcontentloaded' });
  const r = await p.evaluate(() => ({
    filas: document.querySelectorAll('#mensual tr').length,
    extremos: document.querySelectorAll('#extremos tr').length,
    cifra: document.querySelector('#horas').textContent,
    huecos: document.body.innerHTML.includes('__'),
  }));
  ok('la tabla mensual ya viene escrita en el HTML', r.filas === 12, String(r.filas));
  ok('y los dos extremos también', r.extremos === 3, String(r.extremos));
  ok('la cifra grande trae un número, no un hueco', /^\d+$/.test(r.cifra.trim()), r.cifra);
  ok('no queda ningún hueco del generador sin rellenar', !r.huecos);
  await ctx.close();
}

/* ── 5 · IDS ÚNICOS ──────────────────────────────────────────────────
   Va aquí porque ya pasó: `id="horas"` estaba en la cifra grande Y en el eje
   del lienzo. `querySelector` devuelve el primero, así que los rótulos del eje
   se metieron dentro del número y desaparecieron. En pantalla no se veía un
   error: se veía un eje vacío, que parece una decisión de diseño. */
console.log('\n── el HTML ──');
{
  const p = await abrir();
  const r = await p.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    const rep = ids.filter((x,i) => ids.indexOf(x) !== i);
    const sinNombre = [...document.querySelectorAll('button, select, input')]
      .filter(e => !e.labels?.length && !e.getAttribute('aria-label') && !e.textContent.trim())
      .map(e => e.tagName + '#' + e.id);
    return { rep:[...new Set(rep)], sinNombre,
             h1: document.querySelectorAll('h1').length,
             lang: document.documentElement.lang };
  });
  ok('ningún id repetido', r.rep.length === 0, r.rep.join(', '));
  ok('todo control tiene nombre accesible', r.sinNombre.length === 0, r.sinNombre.join(', '));
  ok('un solo <h1>', r.h1 === 1, String(r.h1));
  ok('el documento declara su idioma', r.lang === 'es-MX', r.lang);
  await p.context().close();
}

/* ── 6 · ANCHOS Y OBJETIVOS TÁCTILES ─────────────────────────────────── */
console.log('\n── en la mano y en la mesa ──');
for(const [ancho, como] of [[390,'teléfono'],[768,'tableta'],[1280,'computadora']]){
  const p = await abrir({ viewport:{ width:ancho, height:900 } });
  const f = await p.evaluate((w) => {
    const desbordan = [], chicos = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.width && (r.right > w + 1 || r.left < -1))
        desbordan.push((el.tagName+'.'+el.className).slice(0,34));
    });
    document.querySelectorAll('button, select, input').forEach(el => {
      const r = el.getBoundingClientRect();
      if(r.height && r.height < 44) chicos.push((el.id||el.tagName) + ' ' + Math.round(r.height));
    });
    return { desbordan:[...new Set(desbordan)], chicos };
  }, ancho);
  console.log('  · a ' + ancho + ' px (' + como + ')');
  ok(ancho + ': nada se sale de la pantalla', f.desbordan.length === 0, f.desbordan.slice(0,3).join(' · '));
  ok(ancho + ': ningún control mide menos de 44 px', f.chicos.length === 0, f.chicos.slice(0,3).join(' · '));
  await p.context().close();
}

/* ── 7 · CONTRASTE, EN LOS DOS TEMAS ─────────────────────────────────── */
console.log('\n── el contraste, medido ──');
for(const tema of ['light','dark']){
  const p = await abrir({ colorScheme: tema });
  const r = await p.evaluate(() => {
    const lum = (c) => { const [r,g,b] = c.match(/\d+/g).slice(0,3).map(Number).map(v => {
      v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
      return 0.2126*r + 0.7152*g + 0.0722*b; };
    const ratio = (a,b) => { const [x,y] = [lum(a), lum(b)].sort((m,n) => n-m);
                             return (x + 0.05) / (y + 0.05); };
    const fondo = getComputedStyle(document.body).backgroundColor;
    const mide = (sel) => { const e = document.querySelector(sel); if(!e) return null;
      return +ratio(getComputedStyle(e).color, fondo).toFixed(2); };
    return { cuerpo:mide('.dice'), rotulo:mide('.campo label'), pie:mide('.pie-gran'),
             delta:mide('.delta'), eje:mide('#ejeHoras span'), mes:mide('#meses span'),
             cabecera:mide('th'), leyenda:mide('.leyenda span') };
  });
  console.log('  · tema ' + tema + ': ' + JSON.stringify(r));
  for(const [k,v] of Object.entries(r))
    ok(tema + ': ' + k + ' pasa 4.5:1', v >= 4.5, String(v));
  await p.context().close();
}

/* ── 8 · LA IDENTIDAD ES SUYA ─────────────────────────────────────────
   La misma prueba que la lámina, por el mismo motivo: Carlos, e261 y e262. */
console.log('\n── la identidad ──');
{
  const p = await abrir();
  const r = await p.evaluate(() => {
    const MUDOS = { SCRIPT:1, STYLE:1, TEMPLATE:1, NOSCRIPT:1, CANVAS:1 };
    const propio = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const familias = new Set(), violetas = [];
    const esVioleta = (c) => { const m = c.match(/\d+/g); if(!m || m.length < 3) return false;
      const [r,g,b] = m.map(Number);
      if(m.length > 3 && Number(m[3]) === 0) return false;
      return b > 120 && r > 90 && g < Math.min(r,b) - 45 && b - g > 60 && r - g > 40; };
    document.body.querySelectorAll('*').forEach(el => {
      if(MUDOS[el.tagName]) return;
      const cs = getComputedStyle(el);
      if(propio(el) && cs.display !== 'none')
        familias.add((cs.fontFamily||'').split(',')[0].trim().replace(/^["']|["']$/g,''));
      for(const prop of ['color','backgroundColor','borderTopColor','outlineColor'])
        if(cs[prop] && esVioleta(cs[prop])) violetas.push(el.tagName + ' ' + prop + ' ' + cs[prop]);
    });
    const caras = [];
    for(const h of document.styleSheets){ let g; try{ g = h.cssRules; }catch(e){ continue; }
      for(const x of g || []) if(x.constructor.name === 'CSSFontFaceRule')
        caras.push(x.style.fontFamily.replace(/["']/g,'')); }
    return { familias:[...familias].sort(), violetas:violetas.slice(0,4),
             caras:[...new Set(caras)].sort() };
  });
  console.log('  · familias en uso: ' + r.familias.join(', '));
  const PROPIAS = ['Young Serif','Work Sans','IBM Plex Mono'];
  const intrusas = r.familias.filter(f => f && !PROPIAS.includes(f));
  ok('ni un violeta de la casa', r.violetas.length === 0, r.violetas.join(' · '));
  ok('ninguna cara tipográfica ajena declarada',
     r.caras.every(c => PROPIAS.includes(c)), r.caras.join(', '));
  ok('sólo hay tres registros tipográficos', intrusas.length === 0, 'intrusas: ' + intrusas.join(', '));
  await p.context().close();
}

/* ── 9 · NI UNA PETICIÓN A NADIE ──────────────────────────────────────
   Lo dice el colofón: «no hay ninguna petición a ningún servidor». Un colofón
   que promete algo y no se comprueba es una promesa que se rompe sola el día
   que alguien mete una fuente de Google «sólo para probar». */
console.log('\n── de dónde salen los bytes ──');
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

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien+mal) + ' pruebas del año en luz');
process.exit(mal ? 1 : 0);
