/* ══════════════════════════════════════════════════════════════════════════
   EL BANCO DE PRUEBAS · las pruebas
   ──────────────────────────────────────────────────────────────────────────
       node laboratorio/pruebas.mjs         (con la página servida en :8792)

   TRES DE ESTAS PRUEBAS NO EXISTEN EN CASI NINGÚN PROYECTO, y son las que de
   verdad protegen esta página:

   · EL CONTRASTE SE CALCULA, no se mira. Cada pareja de texto y su fondo real
     —subiendo por los ancestros hasta encontrar un fondo opaco— con la
     fórmula de WCAG, en los DOS temas. Los colores malos no se ven a ojo: se
     ven midiendo, y esta página tiene un violeta que pasa en un tema y no en
     el otro.

   · LA GRAMÁTICA SE VIGILA. Se recorren todas las duraciones de transición y
     animación que el navegador terminó aplicando, y si aparece una que no es
     uno de los seis tokens, se pone roja. Sin esto, «tenemos un lenguaje de
     movimiento» dura hasta el primer `0.3s` que alguien escriba de prisa —y
     nadie lo va a notar leyendo un diff.

   · SE COMPRUEBA LO PINTADO, NO LO DECLARADO. Es la lección más cara que me
     he llevado: una prueba que pregunta por una clase pasa aunque el código
     que pone esa clase no se ejecute nunca. Aquí se mide opacidad real,
     rectángulos reales y foco real.

   Y todas se probaron rompiendo el código a propósito para verlas en rojo.
   Una prueba que nunca se ha visto fallar no es una prueba: es una esperanza.
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const SITIO  = process.env.SITIO  || 'http://127.0.0.1:8792/laboratorio/';
const SALIDA = process.env.SALIDA || '/tmp';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
let fallas = 0;
const ok = (c, t) => { console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) fallas++; };

/* Los seis tokens de la gramática, en milisegundos. Si esta lista y la de
   `base.css` se separan, la prueba de abajo lo dice en el acto. */
const TOKENS = [110, 220, 420, 820, 1800, 500];

/* ── la maquinaria que se inyecta en la página ───────────────────────────── */
const HERRAMIENTAS = () => {
  /* Contraste según WCAG 2.1. Se escribe aquí y no se importa de ningún lado
     porque son doce líneas y una dependencia por doce líneas no se paga. */
  const lineal = (c) => { c /= 255; return c <= .03928 ? c/12.92 : Math.pow((c+.055)/1.055, 2.4); };
  const lum = ([r,g,b]) => .2126*lineal(r) + .7152*lineal(g) + .0722*lineal(b);
  /* ⚠ NO TODO COLOR CALCULADO ES `rgb(0-255)`. Chrome devuelve `color(srgb
     0.95 0.94 0.92 / .88)` para lo que sale de un `color-mix`, con los canales
     de 0 a 1. Leerlo como si fuera 0-255 da un color casi negro, y esta misma
     prueba me reportó SEIS parejas ilegibles en el tema claro que estaban
     perfectamente bien: el defecto estaba en el instrumento, no en la página.
     Una prueba que miente en rojo se acaba ignorando igual que una que miente
     en verde. */
  const canales = (s) => {
    const m = s.match(/[\d.]+(?:e[+-]?\d+)?/g);
    if(!m) return null;
    const n = m.map(Number);
    if(/^color\(/.test(s)) return { c:n.slice(0,3).map(v => v*255), a:n.length > 3 ? n[3] : 1 };
    return { c:n.slice(0,3), a:n.length > 3 ? n[3] : 1 };
  };
  const rgb  = (s) => { const q = canales(s); return q ? q.c : null; };
  const alfa = (s) => { const q = canales(s); return q ? q.a : 1; };
  const mezclar = (f, d, a) => f.map((v,i) => v*a + d[i]*(1-a));

  /* El fondo REAL: se sube por los ancestros hasta encontrar uno opaco, y se
     van mezclando los semitransparentes por el camino. Comparar contra el
     fondo declarado del propio elemento —que casi siempre es `transparent`—
     es como se aprueban textos ilegibles con la prueba en verde. */
  window.__fondoDe = (el) => {
    let capas = [], n = el;
    while(n && n !== document.documentElement.parentNode){
      const s = getComputedStyle(n), c = rgb(s.backgroundColor), a = alfa(s.backgroundColor);
      if(c && a > 0){ capas.push([c, a]); if(a >= .999) break; }
      n = n.parentElement;
    }
    let base = [255,255,255];
    for(let i = capas.length - 1; i >= 0; i--) base = mezclar(capas[i][0], base, capas[i][1]);
    return base;
  };
  window.__razon = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1,l2) + .05) / (Math.min(l1,l2) + .05);
  };
  window.__canales = (s) => { const q = canales(s); return q && q.c.length === 3 ? q.c : null; };
  window.__esGrande = (s) => {
    const px = parseFloat(s.fontSize), peso = parseInt(s.fontWeight, 10) || 400;
    return px >= 24 || (px >= 18.66 && peso >= 700);
  };
};

async function nuevaPagina(ctx){
  const pg = await ctx.newPage();
  const err = [];
  pg.on('console', m => m.type() === 'error' && err.push(m.text()));
  pg.on('pageerror', e => err.push('PAGEERROR ' + e.message));
  await pg.addInitScript(HERRAMIENTAS);
  await pg.goto(SITIO, { waitUntil:'networkidle' });
  await pg.waitForTimeout(900);
  return { pg, err };
}

/* ══ 1 · POR ANCHOS ══════════════════════════════════════════════════════ */
for(const [n, w, h] of [['390', 390, 844], ['768', 768, 1024], ['1440', 1440, 900]]){
  console.log('\n── ' + n + ' px ──');
  const ctx = await b.newContext({ viewport:{ width:w, height:h }, deviceScaleFactor:2 });
  const { pg, err } = await nuevaPagina(ctx);

  /* Texto pintado que se encima. Se mide el rectángulo REAL del contenido con
     un Range, no la caja del elemento. */
  const choques = await pg.evaluate(() => {
    const cajas = [];
    for(const el of document.querySelectorAll('h1 .tapada,h2,h3,p,li,dd,dt,label>span,small,button,summary')){
      if(!el.checkVisibility({ contentVisibilityAuto:true, opacityProperty:true, visibilityProperty:true })) continue;
      const s = getComputedStyle(el);
      if(s.position === 'fixed' || s.position === 'sticky') continue;
      const r = document.createRange(); r.selectNodeContents(el);
      const c = r.getBoundingClientRect();
      if(c.width < 1 || c.height < 1) continue;
      cajas.push({ t:(el.textContent||'').trim().slice(0,24), x:c.x, y:c.y+scrollY, w:c.width, h:c.height, el });
    }
    const malos = [];
    for(let i = 0; i < cajas.length; i++) for(let j = i+1; j < cajas.length; j++){
      const a = cajas[i], c = cajas[j];
      if(a.el.contains(c.el) || c.el.contains(a.el)) continue;
      if(a.el.parentElement === c.el.parentElement) continue;   /* renglones hermanos */
      const sx = Math.min(a.x+a.w, c.x+c.w) - Math.max(a.x, c.x);
      const sy = Math.min(a.y+a.h, c.y+c.h) - Math.max(a.y, c.y);
      if(sx > 2 && sy > 2) malos.push(`«${a.t}» ⨯ «${c.t}»`);
    }
    return malos;
  });
  ok(choques.length === 0, 'ningún texto pintado se encima' + (choques.length ? ': ' + choques.slice(0,3).join(' · ') : ''));

  /* Nada recortado por una caja con overflow. */
  const cortados = await pg.evaluate(() => {
    const malos = [];
    for(const el of document.querySelectorAll('body *')){
      if(!el.checkVisibility({ contentVisibilityAuto:true })) continue;
      const s = getComputedStyle(el);
      if(s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      if(s.overflowX === 'auto' || s.overflowX === 'scroll') continue;   /* scroll a propósito */
      if(s.overflowY === 'auto' || s.overflowY === 'scroll') continue;
      const dx = el.scrollWidth - el.clientWidth, dy = el.scrollHeight - el.clientHeight;
      if(dx > 1 || dy > 1) malos.push(`${el.tagName.toLowerCase()}.${el.className.split(' ')[0]} sobra ${dx>1?dx+'px ancho':''}${dy>1?' '+dy+'px alto':''}`);
    }
    return malos;
  });
  ok(cortados.length === 0, 'ningún contenido se sale de su caja' + (cortados.length ? ': ' + cortados.slice(0,3).join(' · ') : ''));

  const m = await pg.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    desborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    charset: document.characterSet,
    lang: document.documentElement.lang,
    tocables: document.querySelectorAll('a[href],button,select,input,summary,[tabindex]:not([tabindex="-1"])').length,
    chicos: [...document.querySelectorAll('a[href],button,select,summary')].filter(e => {
      if(!e.checkVisibility({ contentVisibilityAuto:true })) return false;
      const r = e.getBoundingClientRect();
      /* Los enlaces dentro de un párrafo de texto corrido no cuentan: el
         mínimo táctil es para controles, no para palabras subrayadas. */
      if(e.tagName === 'A' && e.closest('p')) return false;
      /* ⚠ 44 Y NO 40. Tenía 40 «porque así pasaba», y el comité de UI/UX lo
         reprobó: el número que esta página CITA en su propio texto es 44. Una
         prueba que se afloja para que pase lo que ya está hecho deja de ser
         una prueba y pasa a ser un adorno. Eran 26 controles justo debajo. */
      return r.height > 0 && r.height < 44;
    }).map(e => (e.textContent||'').trim().slice(0,16) + ':' + Math.round(e.getBoundingClientRect().height)),
  }));
  ok(m.h1 === 1, 'un solo h1');
  ok(!m.desborde, 'sin desbordamiento horizontal');
  ok(m.charset === 'UTF-8', 'charset UTF-8');
  ok(m.lang === 'es', 'lang declarado');
  ok(m.chicos.length === 0, 'todo control mide ≥44px de alto' + (m.chicos.length ? ': ' + m.chicos.slice(0,4).join(', ') : ''));
  ok(m.tocables >= 30, `responde al dedo en ${m.tocables} lugares`);
  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));

  await pg.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await pg.waitForTimeout(500);
  await pg.screenshot({ path:`${SALIDA}/lab-${n}.png` });
  await pg.close(); await ctx.close();
}

/* ══ 2 · CONTRASTE, EN LOS DOS TEMAS ═════════════════════════════════════ */
for(const tema of ['oscuro', 'claro']){
  console.log(`\n── contraste · tema ${tema} ──`);
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const { pg } = await nuevaPagina(ctx);
  await pg.evaluate((t) => { document.documentElement.dataset.tema = t; }, tema);
  /* ⚠ HAY QUE ESPERAR A QUE ACABE LA TRANSICIÓN, y con 250 ms no se esperaba:
     el cambio de tema tarda `--cine` (1800 ms) porque va atado al recorrido de
     las cinco pistas. Midiendo a los 250 ms se mide un color A MEDIO CAMINO
     entre los dos temas, que no es el de ninguno — y esta prueba reportó siete
     parejas ilegibles que no existen en ningún estado real de la página.
     Medir durante una transición es medir ruido, otra vez. */
  await pg.waitForTimeout(2100);

  const malos = await pg.evaluate(() => {
    const malos = [];
    const vistos = new Set();
    for(const el of document.querySelectorAll('body *')){
      if(!el.checkVisibility({ contentVisibilityAuto:true, opacityProperty:true, visibilityProperty:true })) continue;
      /* Sólo elementos con texto PROPIO: si se midiera cualquier contenedor,
         se mediría cien veces el mismo color y el reporte sería ilegible. */
      const propio = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
      if(!propio) continue;
      const s = getComputedStyle(el);
      if(parseFloat(s.opacity) < .95) continue;      /* apagados a propósito */
      const tinta = (window.__canales ? window.__canales(s.color) : null);
      if(!tinta) continue;
      const fondo = window.__fondoDe(el);
      const razon = window.__razon(tinta, fondo);
      const piso = window.__esGrande(s) ? 3 : 4.5;
      const llave = s.color + '|' + fondo.join(',') + '|' + piso;
      if(vistos.has(llave)) continue;
      vistos.add(llave);
      if(razon < piso){
        malos.push(`«${(el.textContent||'').trim().slice(0,20)}» rgb(${tinta.map(Math.round).join(',')}) sobre rgb(${fondo.map(Math.round).join(',')}) = ${razon.toFixed(2)}:1 (pide ${piso})`);
      }
    }
    return malos;
  });
  ok(malos.length === 0, `todas las parejas de texto pasan WCAG AA` + (malos.length ? `\n      ✗ ` + malos.join('\n      ✗ ') : ''));
  await pg.close(); await ctx.close();
}

/* ══ 3 · LA GRAMÁTICA DE MOVIMIENTO SE RESPETA ═══════════════════════════ */
console.log('\n── la gramática ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const { pg } = await nuevaPagina(ctx);
  const sueltas = await pg.evaluate((TOKENS) => {
    const fuera = [];
    const leer = (v) => v.split(',').map(x => {
      x = x.trim();
      if(x.endsWith('ms')) return parseFloat(x);
      if(x.endsWith('s'))  return parseFloat(x) * 1000;
      return 0;
    });
    for(const el of document.querySelectorAll('body *')){
      const s = getComputedStyle(el);
      for(const [prop, val] of [['transition', s.transitionDuration], ['animation', s.animationDuration]]){
        for(const ms of leer(val)){
          if(ms === 0) continue;
          if(TOKENS.some(t => Math.abs(t - ms) < 1)) continue;
          fuera.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} → ${prop} ${ms}ms`);
        }
      }
    }
    return [...new Set(fuera)];
  }, TOKENS);
  ok(sueltas.length === 0,
     'ni una duración fuera de los seis tokens' + (sueltas.length ? ': ' + sueltas.slice(0,5).join(' · ') : ''));
  await pg.close(); await ctx.close();
}

/* ══ 4 · QUE LAS PIEZAS HAGAN LO QUE DICEN ═══════════════════════════════ */
console.log('\n── las piezas ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const { pg, err } = await nuevaPagina(ctx);

  /* Estados del botón: se comprueba el estado PINTADO, no la clase. */
  await pg.click('[data-estado-bt="cargando"]');
  await pg.waitForTimeout(400);
  /* La ruedita ya no es una ruedita: es la paloma de la marca dibujándose el
     contorno, que se baja aparte. Se espera a que llegue. */
  await pg.waitForTimeout(700);
  ok(await pg.locator('[data-bt-muestra] .paloma').count() === 1,
     'el estado «cargando» dibuja la paloma de la marca');
  await pg.click('[data-estado-bt="apagado"]');
  await pg.waitForTimeout(400);
  ok(await pg.locator('[data-bt-muestra]').isDisabled(), 'el estado «apagado» apaga el botón de verdad');
  const colorError = await (async () => {
    /* 400ms y no 120: la transición del botón dura `--corta` (220 ms) y a los
       120 se estaba midiendo un color a MEDIO camino — rgb(188,33,86), que no
       es ninguno de los dos. Medir un valor en transición es medir ruido. */
    await pg.click('[data-estado-bt="error"]'); await pg.waitForTimeout(400);
    return pg.evaluate(() => getComputedStyle(document.querySelector('[data-bt-muestra]')).backgroundColor);
  })();
  ok(/179,\s*18,\s*31/.test(colorError) || /255,\s*123,\s*133/.test(colorError),
     `el estado «error» se pinta de alarma (${colorError})`);
  await pg.click('[data-estado-bt="normal"]');

  /* El modal: foco atrapado, Escape, y el foco DE VUELTA al botón que abrió.
     Lo último es lo que casi nadie hace y lo que deja perdido a quien navega
     con teclado. */
  await pg.click('[data-abrir-modal]');
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => document.querySelector('[data-modal]').open), 'el modal abre');
  ok(await pg.evaluate(() => document.querySelector('[data-modal]').contains(document.activeElement)),
     'el foco entra al modal');
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => !document.querySelector('[data-modal]').open), 'Escape lo cierra');
  ok(await pg.evaluate(() => document.activeElement.hasAttribute('data-abrir-modal')),
     'y el foco vuelve al botón que lo abrió');

  /* Arrastrar con teclado. Es la mitad que casi nadie hace, y la única que una
     máquina puede comprobar. */
  await pg.focus('[data-pieza="a"]');
  await pg.keyboard.press('ArrowRight');
  await pg.waitForTimeout(120);
  ok(await pg.evaluate(() => document.querySelector('[data-pieza="a"]').closest('[data-cajon]').dataset.cajon === 'haciendo'),
     'una pieza se mueve de cajón con la flecha derecha');
  ok(await pg.evaluate(() => document.activeElement.dataset.pieza === 'a'),
     'y el foco viaja con la pieza');
  await pg.keyboard.press('ArrowLeft');

  /* Formulario: el error aparece y NO empuja el botón. */
  const antesY = await pg.evaluate(() => document.querySelector('[data-form] button[type=submit]').getBoundingClientRect().top + scrollY);
  await pg.click('[data-form] button[type=submit]');
  await pg.waitForTimeout(250);
  const despuesY = await pg.evaluate(() => document.querySelector('[data-form] button[type=submit]').getBoundingClientRect().top + scrollY);
  ok(await pg.locator('[data-error-de="nombre"]').textContent() !== '', 'el formulario marca lo que falta');
  ok(Math.abs(antesY - despuesY) < 2, `el error no empuja el botón (se movió ${Math.abs(antesY-despuesY).toFixed(1)}px)`);

  /* Tema: cambia de verdad y se recuerda. */
  const fondoAntes = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await pg.click('[data-cambiar-tema]');
  await pg.waitForTimeout(2100);      /* el tema tarda `--cine`: ver la nota de arriba */
  const fondoDespues = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(fondoAntes !== fondoDespues, 'el tema cambia el fondo de verdad');
  await pg.reload({ waitUntil:'networkidle' });
  await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => getComputedStyle(document.body).backgroundColor) === fondoDespues,
     'y se recuerda al recargar');

  /* Partículas: que el lienzo PINTE. Un canvas en blanco pasa cualquier
     prueba que sólo compruebe que el elemento existe. */
  await pg.locator('[data-lienzo]').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(900);
  const pintado = await pg.evaluate(() => {
    const c = document.querySelector('[data-lienzo]');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 0) n++;
    return n;
  });
  ok(pintado > 200, `el lienzo pinta de verdad (${pintado} píxeles con tinta)`);

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

/* ══ LA CONSOLA · que sea una herramienta y no un adorno ═════════════════ */
console.log('\n── la consola ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const { pg, err } = await nuevaPagina(ctx);

  ok(await pg.evaluate(() => document.querySelector('[data-consola]').dataset.abierta === 'no'),
     'nace apagada, como pide el apartado 121');

  /* El atajo de teclado, y que NO se dispare escribiendo: un atajo de una
     letra dentro de un campo de texto es un campo que no se puede usar. */
  await pg.click('[data-form] input[name="nombre"]');
  await pg.keyboard.type('david');
  ok(await pg.inputValue('[data-form] input[name="nombre"]') === 'david',
     'la «d» del atajo se puede escribir dentro de un campo');
  ok(await pg.evaluate(() => document.querySelector('[data-consola]').dataset.abierta === 'no'),
     'y ahí el atajo no la abre');

  await pg.evaluate(() => document.activeElement.blur());
  await pg.keyboard.press('d');
  await pg.waitForTimeout(350);
  ok(await pg.evaluate(() => document.querySelector('[data-consola]').dataset.abierta === 'si'),
     'fuera de un campo, la «d» sí la abre');

  /* Y que MIDA: los fps tienen que dejar de ser un guion. */
  await pg.locator('[data-lienzo]').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(1200);
  const lect = await pg.evaluate(() => ({
    fps: document.querySelector('[data-c-fps]').textContent,
    nodos: Number(document.querySelector('[data-c-nodos]').textContent),
  }));
  ok(Number(lect.fps) > 0, `el monitor mide de verdad (${lect.fps} fps)`);
  ok(lect.nodos > 100, `y cuenta los nodos (${lect.nodos})`);

  /* El probador mete la MISMA página en un marco, y dentro del marco la
     consola no existe: si existiera, se abriría dentro de sí misma. */
  await pg.click('[data-probador]');
  await pg.waitForTimeout(1400);
  const marco = pg.frameLocator('[data-marco]');
  ok(await marco.locator('h1').count() === 1, 'el probador carga la página dentro del marco');
  ok(await marco.locator('[data-consola-bt]').evaluate(e => getComputedStyle(e).display) === 'none',
     'y dentro del marco la consola se esconde, para que no se abra dentro de sí misma');
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => document.querySelector('[data-probador-caja]').hidden),
     'Escape cierra el probador');
  ok(await pg.evaluate(() => !document.querySelector('[data-marco]').getAttribute('src')),
     'y descarga el marco al cerrarlo, en vez de dejar una copia animando detrás');

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

/* ══ LO QUE LA PÁGINA PREDICA, LA PÁGINA LO CUMPLE ═══════════════════════
   La tarjeta 02 del relato dice «nunca opacidad sobre texto» y la 03 dice
   «sólo transform y opacity». Las dos estaban ROTAS en el CSS de al lado: el
   aviso entraba desvaneciéndose con texto dentro, y la barra del marcador
   animaba `width`. Lo cazó el comité de UI/UX, no mis ojos — y llevaba tres
   pasadas mirando esos archivos.

   Predicar una regla en la pantalla y romperla en el archivo de al lado es
   peor que no predicarla, así que ahora hay quien lo vigile. */
console.log('\n── las reglas que la página predica ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const { pg } = await nuevaPagina(ctx);
  const rotas = await pg.evaluate(() => {
    /* ⚠ `transitionProperty` DEVUELVE «all» EN TODO ELEMENTO que no declare
       transición, así que preguntar por él a secas señala el documento entero.
       Mi primera versión reprobó 200 elementos y ninguno era el defecto. Hay
       que cruzarlo con la DURACIÓN, emparejada por índice: sin duración no hay
       animación, por mucho que la propiedad diga «all». */
    const malos = [];
    const conTexto = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const lista = (v) => v.split(',').map(x => x.trim());
    const ms = (x) => x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000;

    /* Qué @keyframes tocan la opacidad. Se leen de las hojas de verdad: es la
       única forma de saber si una animación por NOMBRE desvanece algo. */
    const desvanecen = new Set();
    for(const hoja of document.styleSheets){
      let reglas; try{ reglas = hoja.cssRules; }catch(e){ continue; }
      for(const r of reglas || []){
        if(r.type !== CSSRule.KEYFRAMES_RULE) continue;
        for(const k of r.cssRules) if(k.style.opacity !== '') { desvanecen.add(r.name); break; }
      }
    }

    const CAJA = ['width','height','top','left','right','bottom','margin','padding','filter','inset'];
    for(const el of document.querySelectorAll('body *')){
      const s = getComputedStyle(el);
      const nombre = (el.tagName.toLowerCase() + '.' + (el.className||'').toString().split(' ')[0]).replace(/\.$/, '');

      const props = lista(s.transitionProperty), dur = lista(s.transitionDuration);
      props.forEach((p, i) => {
        if(ms(dur[i % dur.length] || '0s') <= 0) return;      /* sin duración, no anima */
        if(CAJA.some(c => p === c || p.startsWith(c + '-'))) malos.push(`${nombre} anima «${p}»`);
        if((p === 'opacity' || p === 'all') && conTexto(el)) malos.push(`${nombre} desvanece TEXTO (transición)`);
      });

      const anims = lista(s.animationName), aDur = lista(s.animationDuration);
      anims.forEach((a, i) => {
        if(a === 'none' || ms(aDur[i % aDur.length] || '0s') <= 0) return;
        if(desvanecen.has(a) && conTexto(el)) malos.push(`${nombre} desvanece TEXTO (@keyframes ${a})`);
      });
    }
    return [...new Set(malos)];
  });
  ok(rotas.length === 0, 'sólo se anima lo que resuelve el compositor, y nunca opacidad sobre texto'
     + (rotas.length ? ': ' + rotas.slice(0,4).join(' · ') : ''));

  /* Y los ocho estados son ocho, no seis: el título lo dice. */
  const n = await pg.evaluate(() => document.querySelectorAll('[data-estado-bt]').length);
  ok(n === 8, `los ocho estados del botón están los ocho (hay ${n})`);
  await pg.close(); await ctx.close();
}

/* ══ LO QUE REPORTÓ CARLOS, CONVERTIDO EN PRUEBA ═════════════════════════
   Mandó trece defectos concretos. Los que una máquina puede comprobar están
   aquí, porque un defecto arreglado sin prueba vuelve: nadie se acuerda de
   revisarlo a mano dentro de tres semanas. */
console.log('\n── los defectos que reportó Carlos ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const { pg } = await nuevaPagina(ctx);

  /* 1 · «al presionarlo de nuevo se teletransportan hacia atrás». El regreso
         tiene que ser el mismo viaje al revés, no un salto. */
  const donde = () => pg.evaluate(() =>
    getComputedStyle(document.querySelector('.pista-carro')).transform);
  await pg.click('[data-correr-pistas]');
  await pg.waitForTimeout(1900);
  const ida = await donde();
  ok(ida !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(ida), `las pistas van a la derecha (${ida})`);

  await pg.click('[data-correr-pistas]');
  await pg.waitForTimeout(60);
  const aMedias = await donde();
  ok(aMedias !== ida && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(aMedias),
     'y al regresar hacen el trayecto: a los 60 ms van de camino, no de vuelta ya');
  await pg.waitForTimeout(1900);
  ok(/matrix\(1, 0, 0, 1, 0, 0\)/.test(await donde()), 'y terminan donde empezaron');

  /* 2 · «que al mandarlo a la derecha cambie el tema gradualmente a la misma
         velocidad que esos 5». Se comprueba que el tema esté ATADO al viaje. */
  const temaDe = () => pg.evaluate(() => document.documentElement.dataset.tema);
  const antes = await temaDe();
  await pg.click('[data-correr-pistas]');
  await pg.waitForTimeout(200);
  ok(await temaDe() !== antes, 'mandarlas a la derecha cambia el tema');
  const dur = await pg.evaluate(() => getComputedStyle(document.body).transitionDuration);
  const cine = await pg.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--cine').trim());
  ok(dur.includes(cine.replace('ms','').length > 3 ? '1.8s' : cine) || dur.includes('1.8s'),
     `y tarda lo mismo que la pista más larga (${dur} · --cine ${cine})`);

  /* 3 · «tu cargando es demasiado simple, ¿una U dando vueltas?» */
  await pg.click('[data-estado-bt="cargando"]');
  await pg.waitForTimeout(900);
  const trazos = await pg.evaluate(() =>
    document.querySelectorAll('[data-bt-muestra] .paloma path, [data-bt-muestra] .paloma polygon').length);
  ok(trazos >= 1, `el cargando dibuja la paloma de la marca (${trazos} trazos)`);
  ok(await pg.evaluate(() => {
    const t = document.querySelector('[data-bt-muestra] .paloma path');
    return t && getComputedStyle(t).strokeDasharray !== 'none';
  }), 'y se dibuja de verdad, con el contorno');
  await pg.click('[data-estado-bt="normal"]');

  /* 4 · «la barra es totalmente llena pero la palanquera se estancó antes de
         llegar». El relleno tiene que coincidir con el centro del pulgar. */
  const rango = pg.locator('[data-rango]');
  await rango.evaluate((r) => { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles:true })); });
  await pg.waitForTimeout(120);
  const alTope = await pg.evaluate(() => {
    const r = document.querySelector('[data-rango]');
    const pulgar = parseFloat(getComputedStyle(r).getPropertyValue('--pulgar'));
    const llena = parseFloat(getComputedStyle(r).getPropertyValue('--llena'));
    const centro = (r.clientWidth - pulgar / 2) / r.clientWidth * 100;
    return { llena, centro };
  });
  ok(Math.abs(alTope.llena - alTope.centro) < 1.5,
     `al tope, el relleno llega al centro del pulgar (${alTope.llena.toFixed(1)}% vs ${alTope.centro.toFixed(1)}%)`);

  /* 5 · «el botón de a cero tiene un delay de unas décimas». Instantáneo. */
  await pg.click('[data-crono-bt="correr"]');
  await pg.waitForTimeout(700);
  await pg.click('[data-crono-bt="cero"]');
  const enCero = await pg.evaluate(() => document.querySelector('[data-crono]').textContent);
  ok(enCero === '00:00.0', `«a cero» pone el cero en el acto, sin esperar un fotograma (${enCero})`);

  await pg.close(); await ctx.close();
}

/* ══ EL SISTEMA SOLAR ════════════════════════════════════════════════════
   Lo pidió Carlos «respetando gravedad, elipses, rotación y traslación». Lo
   que hay que probar no es que se vea bonito: es que las órbitas SALGAN de la
   física y que el sistema no se destruya solo, que es lo que le pasó a mis
   tres primeras versiones —de cinco cuerpos quedaban tres en diez segundos—.
   Una demo que se acaba antes de que la miren no es una demo. */
console.log('\n── el sistema solar ──');
{
  const ctx = await b.newContext({ viewport:{ width:1100, height:800 } });
  const { pg, err } = await nuevaPagina(ctx);
  await pg.locator('#particulas').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(500);
  await pg.click('[data-modo="solar"]');
  await pg.waitForTimeout(1200);

  const estado = () => pg.evaluate(() => document.querySelector('[data-lienzo]').__estado());
  const a = await estado();
  ok(a.length >= 4, `el sistema nace con ${a.length} cuerpos`);
  ok(a.some(c => c.cometa), 'y uno de ellos es un cometa');
  /* Las órbitas tienen que estar SEPARADAS: si dos quedan a menos que la suma
     de sus radios, se van a fundir enseguida y el sistema se vacía. */
  const ds = a.filter(c => !c.cometa).map(c => c.d).sort((x, y) => x - y);
  const juntas = ds.some((d, i) => i > 0 && d - ds[i - 1] < 24);
  ok(!juntas, `las órbitas nacen separadas (${ds.join(', ')})`);

  await pg.waitForTimeout(9000);
  const b2 = await estado();
  ok(b2.length >= a.length - 1,
     `y a los 10 s el sistema sigue en pie (${a.length} → ${b2.length} cuerpos)`);
  /* La elipse tiene que verse: cada cuerpo cambia de distancia al sol a lo
     largo de su vuelta. Si la distancia fuera constante serían círculos
     dibujados, no órbitas integradas. */
  const movio = b2.some((c, i) => a[i] && Math.abs(c.d - a[i].d) > 2);
  ok(movio, 'y las distancias al sol cambian: son elipses, no círculos fijos');

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

/* ══ EL TELÉFONO, CON DEDO DE VERDAD ═════════════════════════════════════
   «Tu arrastrar en teléfono no funciona», y era literal: `dragstart` es de la
   API de arrastre de HTML y en táctil NO EXISTE. No fallaba — nunca corría.
   Un contexto con `hasTouch` es la única forma de que esta prueba pueda
   reprobar; sin él, todo pasa en un navegador que no es el del problema. */
console.log('\n── con el dedo ──');
{
  const ctx = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true });
  const { pg, err } = await nuevaPagina(ctx);

  const dondeEsta = (id) => pg.evaluate((i) =>
    document.querySelector(`[data-pieza="${i}"]`).closest('[data-cajon]').dataset.cajon, id);
  ok(await dondeEsta('a') === 'por-hacer', 'la pieza empieza en «por hacer»');

  const a = pg.locator('[data-pieza="a"]');
  const destino = pg.locator('[data-cajon="haciendo"]');
  const ca = await a.boundingBox(), cd = await destino.boundingBox();
  await pg.locator('[data-cajones]').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(300);
  const c1 = await a.boundingBox(), c2 = await destino.boundingBox();
  await pg.mouse.move(c1.x + c1.width / 2, c1.y + c1.height / 2);
  await pg.mouse.down();
  await pg.mouse.move(c2.x + c2.width / 2, c2.y + 30, { steps: 12 });
  await pg.mouse.up();
  await pg.waitForTimeout(200);
  ok(await dondeEsta('a') === 'haciendo', 'y se arrastra con el puntero hasta el otro cajón');

  /* El imán no puede funcionar sin cursor, y la página lo DICE en vez de
     dejar un control muerto que se lee como roto. */
  ok(await pg.locator('.solo-dedo').first().isVisible(),
     'en táctil se explica por qué el imán no aplica, en vez de fingir que sirve');

  /* El icono vivo sí responde al toque: colgaba de `:hover` y `:focus-visible`,
     y en un teléfono no hay ninguno de los dos. */
  await pg.locator('[data-flecha]').scrollIntoViewIfNeeded();
  await pg.locator('[data-flecha]').click();
  ok(await pg.locator('[data-flecha].adelanta').count() === 1,
     'el icono vivo se mueve al tocarlo, no sólo al pasar el cursor');

  /* Nada tapado por el botón fijo: «todo se encima en todo». */
  const tapado = await pg.evaluate(() => {
    scrollTo(0, document.body.scrollHeight);
    const bt = document.querySelector('.consola-bt').getBoundingClientRect();
    const pie = document.querySelector('.pie-lab').getBoundingClientRect();
    return pie.bottom > bt.top && pie.bottom < bt.bottom;
  });
  ok(!tapado, 'al final del documento, el botón fijo no queda encima del contenido');

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

/* ══ 5 · LOS NÚMEROS DEL TABLERO SON CIERTOS ═════════════════════════════
   Ésta es la prueba que le da derecho a existir al tablero. Los primeros
   números que puse me los inventé —«48 piezas»— y un banco de pruebas que
   presume de medir y publica cifras inventadas es peor que no tener banco.
   Cada casilla se contrasta contra la realidad, y si una deja de ser cierta,
   aquí se dice cuál. */
console.log('\n── los números del tablero ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  /* La cuenta de ciclos se instala ANTES de que cargue nada: hay que envolver
     `requestAnimationFrame` antes de que el primer script lo llame. */
  const pg0 = await ctx.newPage();
  await pg0.addInitScript(() => {
    let pendientes = 0; window.__maxCiclos = 0;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (fn) => {
      pendientes++; window.__maxCiclos = Math.max(window.__maxCiclos, pendientes);
      return original((t) => { pendientes--; fn(t); });
    };
  });
  await pg0.goto(SITIO, { waitUntil:'networkidle' });
  await pg0.waitForTimeout(600);

  const decl = await pg0.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('[data-contar]')]
      .map(e => [e.closest('.medidor').querySelector('.rotulo').textContent.trim(), Number(e.dataset.contar)])));

  /* 1 · los lugares que responden al toque */
  const tocables = await pg0.evaluate(() =>
    document.querySelectorAll('a[href],button,select,input,summary,[tabindex]:not([tabindex="-1"])').length);
  ok(tocables === decl['Responde al toque en'],
     `«responde al toque en ${decl['Responde al toque en']}» y de verdad son ${tocables}`);

  /* 2 · cero dependencias: ni un recurso de fuera de este dominio */
  const fuera = await pg0.evaluate(() => performance.getEntriesByType('resource')
    .map(r => r.name).filter(u => new URL(u, location.href).origin !== location.origin));
  ok(fuera.length === decl['Dependencias'],
     `«${decl['Dependencias']} dependencias» y de verdad hay ${fuera.length}${fuera.length ? ': ' + fuera[0] : ''}`);

  /* 3 · el peso, sumando lo que el servidor entrega de verdad */
  const kb = await pg0.evaluate(async () => {
    /* ⚠ LA LISTA NO SE ESCRIBE A MANO: SE LEE DEL DOCUMENTO. La tenía escrita
       y se me quedó vieja en cuanto añadí un archivo — el peso salía 7 KB
       bajo y la prueba señalaba al tablero cuando la equivocada era ella.
       Preguntándole al documento qué hojas y qué scripts cargó, la lista no
       puede desfasarse de la página. */
    const urls = new Set([location.href]);
    for(const l of document.querySelectorAll('link[rel="stylesheet"][href]')) urls.add(l.href);
    for(const t of document.querySelectorAll('script[src]')) urls.add(t.src);
    let total = 0;
    for(const u of urls) total += (await (await fetch(u)).arrayBuffer()).byteLength;
    return Math.round(total / 1024);
  });
  ok(Math.abs(kb - decl['Peso de la página']) <= 3, `«${decl['Peso de la página']} KB» y de verdad pesa ${kb} KB`);

  /* 4 · un solo ciclo. Se mide MIENTRAS las partículas corren y se scrollea,
     que es cuando de verdad podrían aparecer dos motores compitiendo. */
  await pg0.locator('[data-lienzo]').scrollIntoViewIfNeeded();
  await pg0.waitForTimeout(1500);
  await pg0.evaluate(() => scrollBy(0, 400));
  await pg0.waitForTimeout(1200);
  const maxCiclos = await pg0.evaluate(() => window.__maxCiclos);
  ok(maxCiclos === decl['Ciclos de animación'],
     `«${decl['Ciclos de animación']} ciclo de animación» y el máximo simultáneo medido fue ${maxCiclos}`);

  await pg0.close(); await ctx.close();
}

/* ══ 5 · MOVIMIENTO REDUCIDO ═════════════════════════════════════════════ */
console.log('\n── con «menos movimiento» ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 }, reducedMotion:'reduce' });
  const { pg } = await nuevaPagina(ctx);
  const r = await pg.evaluate(() => ({
    quieto: document.documentElement.hasAttribute('data-quieto'),
    /* ⚠ NO VALE PREGUNTAR «¿algo tiene transform?»: así lo escribí primero y
       señalaba dos falsos positivos —un globito colocado con
       `translate(-50%)` y la barra de progreso— mientras que el defecto de
       verdad estaba justo entre ellos. Lo que importa es que las piezas DEL
       SISTEMA DE MOVIMIENTO queden en su sitio, no que nadie use `transform`
       para colocar algo. */
    movidos: [...document.querySelectorAll('[data-revelar] .tapada, [data-subir], .baraja > article, [data-iman]')]
      .filter(el => { const t = getComputedStyle(el).transform; return t && t !== 'none'; })
      .map(el => el.tagName.toLowerCase() + '.' + (el.className||'')),
    /* Y la barra de progreso tiene que SEGUIR SIRVIENDO: sin movimiento no
       quiere decir sin información. */
    barraViva: (() => {
      scrollTo(0, document.body.scrollHeight);
      return new Promise(r => setTimeout(() => {
        const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-barra]')).transform);
        r(m.a > 0.9);
      }, 200));
    })(),
    /* Los contadores enseñan su número final, no un cero congelado. */
    contadores: [...document.querySelectorAll('[data-contar]')]
      .every(e => e.textContent.replace(/\D/g,'') === e.dataset.contar.replace(/\D/g,'')),
  }));
  ok(r.quieto, 'el interruptor `data-quieto` se queda puesto');
  ok(r.movidos.length === 0, `nada del sistema de movimiento queda desplazado${r.movidos.length ? ': ' + r.movidos.join(', ') : ''}`);
  ok(r.barraViva, 'la barra de progreso sigue funcionando sin movimiento');
  ok(r.contadores, 'los contadores enseñan su número final, no un cero');
  await pg.close(); await ctx.close();
}

/* ══ 6 · SIN JAVASCRIPT ══════════════════════════════════════════════════ */
console.log('\n── sin JavaScript ──');
{
  const ctx = await b.newContext({ viewport:{ width:390, height:844 }, javaScriptEnabled:false });
  const pg = await ctx.newPage();
  await pg.goto(SITIO, { waitUntil:'load' });
  const r = await pg.evaluate(() => ({
    quieto: document.documentElement.hasAttribute('data-quieto'),
    /* La página se lee entera: los diez títulos de sección están ahí. */
    titulos: document.querySelectorAll('main h2').length,
    /* Y los números del tablero ya están escritos, no en cero. */
    numeros: [...document.querySelectorAll('[data-contar]')]
      .map(e => ({ escrito:e.textContent.trim(), debe:e.dataset.contar })),
    /* Nada envuelto a medias: sin JS no hay `.tapada`, así que no hay máscara
       que pueda dejar texto escondido. */
    tapadas: document.querySelectorAll('.tapada').length,
    ocultos: [...document.querySelectorAll('main h2, main p')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.height > 0 && getComputedStyle(e).visibility === 'hidden';
    }).length,
  }));
  ok(r.quieto, 'el interruptor se queda puesto: nada de movimiento');
  ok(r.titulos === 10, `las diez secciones se leen (${r.titulos})`);
  ok(r.tapadas === 0, 'sin script no hay máscara que pueda esconder texto');
  /* ⚠ NO SE COMPRUEBA «distinto de cero»: uno de los contadores VALE cero
     —«Dependencias: 0», que es el dato del que más orgulloso estoy— y la
     prueba lo reprobaba por acertar. Se compara contra lo que cada uno
     declara, que es la pregunta de verdad. */
  ok(r.numeros.every(x => x.escrito.replace(/\D/g,'') === x.debe.replace(/\D/g,'')),
     `los números del tablero ya están escritos (${r.numeros.map(x => x.escrito).join(', ')})`);
  ok(r.ocultos === 0, 'nada queda invisible');
  await pg.screenshot({ path:`${SALIDA}/lab-sinjs.png`, fullPage:false });
  await pg.close(); await ctx.close();
}

await b.close();
console.log(fallas ? `\n✗ ${fallas} fallas` : '\n✓ todo pasa');
process.exit(fallas ? 1 : 0);
