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

  /* ⚠ SE MUESTREA VARIAS VECES, NO UNA. Esto miraba a los 60 ms exactos, y
     la pista más rápida dura 110: o sea que preguntaba «¿arrancó ya?» en el
     filo, y con la máquina ocupada unas veces sí y otras no. Se ponía roja
     sola, sin que nada estuviera mal — y una prueba que va y viene enseña a
     no hacerle caso, que es peor que no tenerla.

     Y de paso medía lo que no era. Lo que Carlos pidió no es «que arranque
     rápido», es «que no se teletransporte»: que en algún momento del camino
     esté ENTRE los dos extremos. Eso es lo que se comprueba ahora. */
  await pg.click('[data-correr-pistas]');
  const camino = [];
  for(let k = 0; k < 12; k++){
    await pg.waitForTimeout(20);
    camino.push(await donde());
  }
  const x = (t) => { const m = /matrix\(1, 0, 0, 1, ([-\d.]+), 0\)/.exec(t); return m ? +m[1] : null; };
  const medio = camino.some(t => { const v = x(t); return v !== null && v > 4 && v < x(ida) - 4; });
  ok(medio, 'y al regresar HACEN el trayecto: se les ve a media pista, no saltan (' +
     camino.map(x).join(', ') + ')');
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
/* ══ LA CONSOLA SE APARTA DE LO QUE ESTÉ ARRIBA ═══════════════════════════
   Carlos, e183: «si subo la hoja y luego mando un aviso la consola baja».

   Eran dos reglas peleándose por el mismo `transform` con la misma
   especificidad: ganaba la escrita después, o sea la del aviso, y la consola
   caía de 14rem a 4.5rem — encima de la hoja, que es lo que esas reglas
   venían a evitar. Se mide el transform PINTADO, porque el defecto vive
   justo en cuál de las dos reglas gana. */
/* ══ LA ONDA CONTESTA TAMBIÉN CON MOVIMIENTO REDUCIDO ═════════════════════
   Carlos: «el botón de tócame donde sea en teléfono sólo se pulsa, no hay
   más». La causa más probable en un iPhone es «Reducir movimiento», que aquí
   hacía que la función se saliera sin dibujar nada. Un botón que se llama
   «tócame donde sea» y no contesta al toque incumple su propio nombre.

   Se prueba en un contexto con la preferencia PUESTA, que es el único donde
   el defecto existe: sin ella, esto pasaba en verde todo el tiempo. */
console.log('\n── el toque contesta aunque se pida menos movimiento ──');
{
  const ctx = await b.newContext({ viewport:{ width:390, height:844 },
                                   hasTouch:true, isMobile:true, reducedMotion:'reduce' });
  const { pg, err } = await nuevaPagina(ctx);
  await pg.locator('[data-onda]').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(300);
  await pg.locator('[data-onda]').tap();
  await pg.waitForTimeout(60);
  const o = await pg.evaluate(() => {
    const s = document.querySelector('[data-onda] .onda');
    if(!s) return null;
    const e = getComputedStyle(s), r = s.getBoundingClientRect();
    return { quieta:s.classList.contains('onda--quieta'),
             ancho:Math.round(r.width), opacidad:+e.opacity };
  });
  ok(!!o, 'el toque deja una onda aunque se pida menos movimiento');
  ok(o && o.quieta, 'y es la versión que no se desplaza ni crece');
  ok(o && o.ancho > 40, `y se ve: nace ya del tamaño final (${o && o.ancho}px)`);
  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

console.log('\n── la consola no baja cuando hay hoja y aviso ──');
{
  const ctx = await b.newContext({ viewport:{ width:1100, height:800 } });
  const { pg, err } = await nuevaPagina(ctx);
  const subida = () => pg.evaluate(() => {
    const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.consola')).transform);
    return Math.round(m.m42);          /* negativo = apartada hacia arriba */
  });
  await pg.locator('[data-abrir-hoja]').scrollIntoViewIfNeeded();
  await pg.click('[data-abrir-hoja]');
  await pg.waitForTimeout(700);
  const conHoja = await subida();
  ok(conHoja < -100, `con la hoja arriba, la consola se aparta (${conHoja}px)`);

  await pg.evaluate(() => document.querySelector('[data-avisar]')?.click());
  await pg.waitForTimeout(700);
  const conAviso = await subida();
  ok(conAviso <= conHoja + 2,
     `y al llegar un aviso NO baja: sigue apartada lo que pide la hoja (${conHoja} → ${conAviso})`);

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

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

  /* ── SE PUEDE TOCAR ──────────────────────────────────────────────────
     Carlos: «no hay modo de interactuar con el sistema solar haz que le pueda
     poner cometas al pulsar o algo así». */
  const antesDeTocar = (await estado()).length;
  const caja = await pg.locator('[data-lienzo]').boundingBox();
  await pg.mouse.click(caja.x + caja.width * 0.22, caja.y + caja.height * 0.30);
  await pg.waitForTimeout(300);
  const trasTocar = await estado();
  ok(trasTocar.length === antesDeTocar + 1,
     `tocar el lienzo pone un cuerpo (${antesDeTocar} → ${trasTocar.length})`);
  ok(trasTocar.filter(c => c.cometa).length >= 2, 'y el que aparece es un cometa');

  /* ── LA LUNA CHOCA ───────────────────────────────────────────────────
     Carlos: «una luna chocó con otro planeta y no explotó eso está mal».
     Se provoca a propósito: se pone un cometa EXACTAMENTE donde está la luna
     —que es lo que hace `cometaEn` con el punto que se toca— y se comprueba
     que la luna desaparece y que hay destello. Sin el destello, «chocó» y
     «se esfumó» se ven igual, que era la queja. */
  ok((await estado()).some(c => c.luna), 'hay un planeta con luna');
  if((await estado()).some(c => c.luna)){
    /* ⚠ LEER DÓNDE ESTÁ LA LUNA Y APUNTARLE TIENEN QUE PASAR EN EL MISMO
       TICK. La luna ORBITA: entre un `evaluate` que devuelve su posición y un
       `mouse.click` que viaja de vuelta al navegador pasan decenas de
       milisegundos y ya no está ahí. Así escrita, la prueba fallaba unas
       veces sí y otras no — y una prueba que va y viene no sirve ni para
       aprobar ni para reprobar. Aquí se mide y se dispara sin soltar el hilo. */
    await pg.evaluate(() => {
      const l = document.querySelector('[data-lienzo]');
      const p = l.__estado().find(c => c.luna);
      const r = l.getBoundingClientRect(), esc = r.width / l.width;
      l.dispatchEvent(new PointerEvent('pointerup', { bubbles:true,
        clientX: r.left + p.luna.x * esc, clientY: r.top + p.luna.y * esc }));
    });
    /* ⚠ EL DESTELLO DURA 420 ms Y HAY QUE MIRARLO DENTRO DE ESA VENTANA. La
       primera versión esperaba 500 y luego preguntaba: para entonces ya se
       había apagado, y la prueba acusaba de no explotar a algo que sí
       explotó. Se mira pronto, y la desaparición de la luna —que es
       permanente— se comprueba después. */
    await pg.waitForTimeout(140);
    const huboDestello = await pg.evaluate(() =>
      document.querySelector('[data-lienzo]').__destellos());
    await pg.waitForTimeout(400);
    const despues = await estado();
    ok(!despues.some(c => c.luna), 'la luna desaparece al estrellarse contra otro cuerpo');
    ok(huboDestello > 0, `y deja destello: se ve que chocó, no que se esfumó (${huboDestello})`);
  }

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

/* ══ 4-bis · LA NAVEGACIÓN DE TELÉFONO ═══════════════════════════════════
   Ésta nace de mi propia revisión, apartado 54 del curso: «no quiero desktop
   reducido, quiero rediseño real. Mobile: bottom navigation». Lo que había
   era `display:none` sobre los diez enlaces, o sea el diseño de escritorio
   con el paso extra de BORRAR la navegación.

   ⚠ Y POR ESO LA PRIMERA COMPROBACIÓN ES QUE LOS ENLACES SE VEAN. Una prueba
   que sólo mirara «existe la barra» pasaría con la barra escondida, que es
   exactamente el defecto que se está arreglando.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── la navegación de abajo, en teléfono ──');
{
  const ctx = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true });
  const { pg, err } = await nuevaPagina(ctx);

  /* ⚠ TODO LO QUE SE MIDA AQUÍ TIENE QUE ESPERAR A QUE SE PARE. `html` lleva
     `scroll-behavior:smooth` y el rail también: nada de lo que se pide llega
     al sitio en el mismo cuadro. Dos comprobaciones de este bloque reprobaron
     por medir a medio viaje —una de ellas pasando y fallando en corridas
     seguidas, que es lo peor que puede hacer una prueba—. Se espera a que dos
     lecturas seguidas den lo mismo, que es lo único que significa «se paró». */
  const quieto = async () => {
    /* ⚠ LOS 200 ms DE ANTES NO SON UN PARCHE, SON EL DEFECTO DE LA PRIMERA
       VERSIÓN. «Dos lecturas iguales» también es cierto ANTES de que el viaje
       empiece: entre el clic y el primer cuadro del desplazamiento suave no se
       ha movido nada, y la espera se daba por cumplida ahí mismo. Salía
       «anterior sube (604 → 604)» — la flecha funcionaba, la prueba miraba
       demasiado pronto. Se le da tiempo a arrancar y DESPUÉS se espera a que
       se pare; así un 604 → 604 significa de verdad que no se movió. */
    await pg.waitForTimeout(200);
    await pg.waitForFunction(() => {
      const lista = document.querySelector('.cinta-vias');
      const ahora = Math.round(scrollY) + ':' + Math.round(lista.scrollLeft);
      const igual = window.__quieto === ahora;
      window.__quieto = ahora;
      return igual;
    }, null, { timeout: 6000, polling: 120 });
  };

  const barra = await pg.evaluate(() => {
    const rail = document.querySelector('.rail');
    const r = rail.getBoundingClientRect();
    const s = getComputedStyle(rail);
    const enlaces = [...document.querySelectorAll('.cinta-vias a')];
    const cajas = enlaces.map(a => a.getBoundingClientRect());
    /* Tocable de verdad: quien recibe el toque en el centro del enlace es el
       enlace. `isVisible` no lo contesta —un elemento tapado sigue siendo
       «visible»— y ya me mordió una vez con la lupa de la sala. */
    const tocables = enlaces.filter((a, i) => {
      const c = cajas[i];
      if(c.width < 1 || c.left > innerWidth - 1 || c.right < 1) return false;
      const q = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
      return q === a || a.contains(q);
    }).length;
    return {
      fija: s.position === 'fixed',
      abajo: Math.round(innerHeight - r.bottom),
      alto: Math.round(r.height),
      enlaces: enlaces.length,
      pintados: cajas.filter(c => c.width > 0 && c.height > 0).length,
      tocables,
      bajos: cajas.filter(c => Math.round(c.height) < 44).length,
      /* La lista es más ancha que la pantalla: por eso se desliza. */
      desliza: document.querySelector('.cinta-vias').scrollWidth >
               document.querySelector('.cinta-vias').clientWidth + 1,
    };
  });
  ok(barra.pintados === 10, `los diez enlaces se PINTAN en teléfono (${barra.pintados})`);
  ok(barra.fija && barra.abajo === 0, `y viven pegados al borde de abajo (${barra.abajo}px del fondo)`);
  ok(barra.alto >= 44, `la barra da altura de dedo (${barra.alto}px)`);
  ok(barra.bajos === 0, `ningún enlace baja de 44 px de alto (${barra.bajos} bajos)`);
  ok(barra.tocables > 0, `y los que están en pantalla reciben el toque (${barra.tocables})`);
  ok(barra.desliza, 'la lista se desliza de lado en vez de encogerse hasta no caber');

  /* Las flechas: el atajo a la sección de al lado. */
  const estado = () => pg.evaluate(() => ({
    atras: document.querySelector('.rail-flecha[data-ir="-1"]').disabled,
    adelante: document.querySelector('.rail-flecha[data-ir="1"]').disabled,
    donde: (document.querySelector('.cinta-vias a[aria-current="true"]') || {}).hash || null,
    y: Math.round(scrollY),
  }));
  const arriba = await estado();
  ok(arriba.atras && !arriba.adelante,
     'en el principio del documento «anterior» está apagada y «siguiente» no');

  await pg.click('.rail-flecha[data-ir="1"]');
  await quieto();
  const uno = await estado();
  ok(uno.y > arriba.y, `«siguiente» baja el documento (${arriba.y} → ${uno.y})`);
  ok(uno.donde === '#gramatica', `y deja marcada la sección a la que llevó (${uno.donde})`);
  ok(!uno.atras, 'y ya se puede volver');

  await pg.click('.rail-flecha[data-ir="-1"]');
  await quieto();
  const dos = await estado();
  ok(dos.y < uno.y, `«anterior» sube (${uno.y} → ${dos.y})`);

  /* El rail se sigue solo: la sección donde estás tiene que VERSE en la
     barra. Una línea que marca algo fuera de pantalla no marca nada. */
  await pg.evaluate(() => document.getElementById('vacios').scrollIntoView());
  await quieto();
  const seVeElActivo = await pg.evaluate(() => {
    const a = document.querySelector('.cinta-vias a[aria-current="true"]');
    if(!a) return { hay:false };
    const c = a.getBoundingClientRect(), r = document.querySelector('.cinta-vias').getBoundingClientRect();
    /* ⚠ EL `c.width > 0` NO SOBRA. Con la barra escondida —el defecto que
       esto vigila— el enlace mide 0×0 en el origen y «está dentro» del rail,
       que también mide 0: la comprobación pasaba por vacía. Lo vi al correr
       la prueba CONTRA el defecto, que es la única manera de verlo. */
    return { hay:true, cual:a.hash,
             dentro: c.width > 0 && c.left >= r.left - 1 && c.right <= r.right + 1 };
  });
  ok(seVeElActivo.hay && seVeElActivo.dentro,
     `al llegar a la última sección, su enlace se ve dentro del rail (${seVeElActivo.cual})`);

  /* Y lo de siempre, que es lo que más se rompe al añadir algo fijo abajo. */
  await pg.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await quieto();
  const encima = await pg.evaluate(() => {
    const r = document.querySelector('.rail').getBoundingClientRect();
    const pie = document.querySelector('.pie-lab').getBoundingClientRect();
    const bt = document.querySelector('.consola-bt').getBoundingClientRect();
    /* Encimarse es cruzarse por los DOS lados: un elemento que quedó fuera de
       la pantalla también está «por debajo del borde de arriba» de la barra. */
    const cruza = (c) => c.bottom > r.top + 1 && c.top < r.bottom - 1;
    return { pie: cruza(pie), consola: cruza(bt),
             piePor: Math.round(r.top - pie.bottom) };
  });
  ok(!encima.pie, `al final del documento la barra no tapa el pie (${encima.piePor}px de aire)`);
  ok(!encima.consola, 'ni al botón de la consola, que también vive fijo abajo');

  /* Girar el aparato: la línea tiene que seguir cuadrando con su enlace.

     ⚠ HONESTAMENTE: ESTA COMPROBACIÓN NO PUEDE REPROBAR HOY, y se dice porque
     una prueba que pasa igual con y sin el arreglo enseña a no hacerle caso.
     La escribí para un defecto que razoné —la guía quedándose en la medida
     vieja— y que al correrla contra el código sin arreglar resultó no existir:
     `offsetLeft` es relativo al contenido del rail y ese contenido no se
     re-maqueta al cambiar el ancho. El arreglo se quitó; la comprobación se
     queda porque la invariante sí importa y deja de cumplirse el día que
     alguien haga que el rail no sea el contenedor de referencia. */
  await pg.setViewportSize({ width: 640, height: 360 });
  await quieto();
  const girado = await pg.evaluate(() => {
    const a = document.querySelector('.cinta-vias a[aria-current="true"]');
    if(!a) return { hay:false };
    const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-guia]')).transform);
    return { hay:true, x:Math.round(m.m41), escala:Math.round(m.a),
             izq:Math.round(a.offsetLeft), ancho:Math.round(a.offsetWidth) };
  });
  ok(girado.hay && Math.abs(girado.x - girado.izq) <= 1 && Math.abs(girado.escala - girado.ancho) <= 1,
     `al girar el aparato la línea se vuelve a medir (x ${girado.x} vs ${girado.izq}, ancho ${girado.escala} vs ${girado.ancho})`);

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

/* Y en escritorio NO existe: el envoltorio lleva `display:contents`, así que
   la cabecera tiene que quedar exactamente como estaba. */
{
  const ctx = await b.newContext({ viewport:{ width:1440, height:900 } });
  const { pg } = await nuevaPagina(ctx);
  const esc = await pg.evaluate(() => {
    const rail = document.querySelector('.rail');
    const nav = document.querySelector('.cinta-vias').getBoundingClientRect();
    const cinta = document.querySelector('.cinta').getBoundingClientRect();
    return {
      contenido: getComputedStyle(rail).display === 'contents',
      flechas: [...document.querySelectorAll('.rail-flecha')]
        .filter(f => f.getBoundingClientRect().width > 0).length,
      navEnLaCabecera: nav.top >= cinta.top - 1 && nav.bottom <= cinta.bottom + 1,
    };
  });
  ok(esc.contenido, 'en escritorio el envoltorio no pinta caja (`display:contents`)');
  ok(esc.flechas === 0, `y las flechas no se ven (${esc.flechas})`);
  ok(esc.navEnLaCabecera, 'los enlaces siguen dentro de la cabecera, como siempre');
  await pg.close(); await ctx.close();
}

/* ══ 4-ter · EL BANCO SE ACUERDA ═════════════════════════════════════════
   También de mi propia revisión, «no» nº 3, apartados 112-114: sólo se
   guardaba el tema. El modo de partículas, el tablero de arrastrar y dónde
   ibas se perdían al recargar — «un laboratorio que olvida lo que hiciste es
   una demo».

   Se prueba con DOS pestañas de la misma sesión y no con `reload()`: al
   recargar, el navegador repone el scroll por su cuenta y la página nace a
   media altura, que no es la visita que importa. La segunda pestaña llega
   como llega cualquiera: arriba del todo, con la memoria puesta.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── lo que hiciste sigue ahí al volver ──');
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const { pg, err } = await nuevaPagina(ctx);

  await pg.locator('[data-modo="solar"]').scrollIntoViewIfNeeded();
  await pg.click('[data-modo="solar"]');
  await pg.locator('[data-cajones]').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(300);
  await pg.focus('[data-pieza="a"]');
  await pg.keyboard.press('ArrowRight');
  await pg.waitForTimeout(250);
  const hecho = await pg.evaluate(() => ({
    modo: document.querySelector('[data-modo][aria-pressed="true"]').dataset.modo,
    cajon: document.querySelector('[data-pieza="a"]').closest('[data-cajon]').dataset.cajon,
  }));
  ok(hecho.modo === 'solar' && hecho.cajon !== 'por-hacer',
     `se cambió el modo y se movió una pieza (${hecho.modo}, ${hecho.cajon})`);
  await pg.close();

  /* Otra pestaña, misma sesión: la visita de vuelta. */
  const { pg: pg2, err: err2 } = await nuevaPagina(ctx);
  const vuelta = await pg2.evaluate(() => ({
    modo: document.querySelector('[data-modo][aria-pressed="true"]').dataset.modo,
    lectura: (document.querySelector('[data-modo-lectura]') || {}).textContent,
    cajon: document.querySelector('[data-pieza="a"]').closest('[data-cajon]').dataset.cajon,
    y: Math.round(scrollY),
    ofrece: !document.querySelector('[data-reanudar]').hidden,
    dice: document.querySelector('[data-reanudar-liga]').textContent.trim(),
    lleva: document.querySelector('[data-reanudar-liga]').getAttribute('href'),
  }));
  ok(vuelta.modo === 'solar', `el modo de partículas vuelve puesto (${vuelta.modo})`);
  ok((vuelta.lectura || '').trim() === 'solar',
     `y la lectura de al lado dice lo mismo, no lo de antes (${vuelta.lectura})`);
  ok(vuelta.cajon === hecho.cajon, `la pieza sigue en su cajón (${vuelta.cajon})`);
  /* ⚠ LO QUE NO DEBE PASAR, y por eso es una comprobación y no un detalle:
     que te lleve. Saltar al cargar le quita el control a quien recargó
     justamente para empezar de cero, y pisa el enlace con ancla que alguien
     te pasó. */
  ok(vuelta.y === 0, `pero NO te lleva solo: la página abre arriba (scrollY ${vuelta.y})`);
  ok(vuelta.ofrece, 'te lo ofrece con una pastilla en la portada');
  ok(/Arrastrar/.test(vuelta.dice) && vuelta.lleva === '#arrastrar',
     `y dice A DÓNDE, para poder juzgarlo antes de aceptar («${vuelta.dice}» → ${vuelta.lleva})`);

  await pg2.click('[data-reanudar-liga]');
  await pg2.waitForTimeout(1200);
  const tras = await pg2.evaluate(() => ({
    y: Math.round(scrollY),
    arriba: Math.round(document.getElementById('arrastrar').getBoundingClientRect().top),
    sigue: !document.querySelector('[data-reanudar]').hidden,
  }));
  ok(tras.y > 0 && Math.abs(tras.arriba) < 140,
     `al tocarla sí lleva (scrollY ${tras.y}, la sección a ${tras.arriba}px de arriba)`);
  ok(!tras.sigue, 'y desaparece: ya cumplió');
  ok(err.length === 0 && err2.length === 0,
     'cero errores de consola' + ((err[0] || err2[0]) ? ': ' + (err[0] || err2[0]) : ''));
  await pg2.close(); await ctx.close();
}

/* ── Y con la memoria ROTA la página sigue viva ──────────────────────────
   En una ventana privada `localStorage` LANZA nada más tocarlo. Una excepción
   ahí no deja «sin memoria»: se lleva por delante el resto del archivo, o sea
   las partículas, el cronómetro y el arrastre. Se prueba rompiéndolo de
   verdad, no confiando en el try/catch. */
{
  const ctx = await b.newContext({ viewport:{ width:1280, height:900 } });
  const pg = await ctx.newPage();
  const err = [];
  pg.on('console', m => m.type() === 'error' && err.push(m.text()));
  pg.on('pageerror', e => err.push('PAGEERROR ' + e.message));
  await pg.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get(){ throw new DOMException('bloqueado', 'SecurityError'); },
    });
  });
  await pg.addInitScript(HERRAMIENTAS);
  await pg.goto(SITIO, { waitUntil:'networkidle' });
  await pg.waitForTimeout(900);
  const vivo = await pg.evaluate(() => ({
    tema: document.documentElement.dataset.tema,
    lienzos: document.querySelectorAll('canvas').length,
    piezas: document.querySelectorAll('[data-pieza]').length,
    ofrece: !document.querySelector('[data-reanudar]').hidden,
  }));
  ok(err.length === 0, 'con `localStorage` prohibido no truena nada' + (err.length ? ': ' + err[0] : ''));
  ok(!!vivo.tema, `y el tema se pone igual (${vivo.tema})`);
  ok(vivo.lienzos > 0 && vivo.piezas > 0,
     `la página sigue entera (${vivo.lienzos} lienzos, ${vivo.piezas} piezas)`);
  ok(!vivo.ofrece, 'y no ofrece seguir donde ibas, porque no hay dónde');
  await pg.close(); await ctx.close();
}

/* ══ 4-quater · POR DÓNDE EMPEZAR ════════════════════════════════════════
   Apartado 20 del curso, «no» nº 6 de mi propia revisión: se entraba y había
   once secciones en fila, sin que nadie dijera por dónde. La portada lo
   EXPLICABA en prosa, que no es lo mismo — explicar qué es esto no le dice a
   nadie qué hacer.

   Se comprueba que las entradas LLEVEN A ALGÚN SITIO QUE EXISTE. Tres enlaces
   bonitos apuntando a un ancla que alguien renombró son peores que no tener
   entradas: prometen y no cumplen, y nadie se entera hasta que un visitante
   los toca.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── por dónde empezar ──');
{
  const ctx = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true });
  const { pg, err } = await nuevaPagina(ctx);
  const entradas = await pg.evaluate(() => {
    const as = [...document.querySelectorAll('.empezar-lista a')];
    return as.map(a => {
      const c = a.getBoundingClientRect();
      const destino = document.querySelector(a.getAttribute('href'));
      return { texto: (a.querySelector('b') || {}).textContent?.trim(),
               pista: !!a.querySelector('span'),
               hacia: a.getAttribute('href'), existe: !!destino,
               alto: Math.round(c.height), ancho: Math.round(c.width) };
    });
  });
  /* ⚠ LOS TRES `length === 3` NO SOBRAN, Y LO SÉ PORQUE LO VI FALLAR. Corrí
     esto contra la portada SIN las entradas y las tres comprobaciones de
     abajo pasaron en verde: `[].every(...)` es `true`, así que «todas llevan a
     una sección que existe» se cumple de sobra cuando no hay ninguna. Una
     comprobación sobre una lista vacía no comprueba nada y encima tranquiliza,
     que es lo peor que puede hacer. */
  const tres = entradas.length === 3;
  ok(tres, `hay tres entradas por intención (${entradas.length})`);
  ok(tres && entradas.every(e => e.existe),
     'y las tres llevan a una sección que existe: ' + entradas.map(e => e.hacia).join(' '));
  ok(tres && entradas.every(e => e.pista),
     'cada una dice qué vas a encontrar, no sólo a dónde va');
  ok(tres && entradas.every(e => e.alto >= 44),
     `y ninguna baja de 44 px de alto (${entradas.map(e => e.alto).join(', ') || '—'})`);

  /* Se pregunta si está antes de tocarla: un `click` sobre algo que no existe
     LANZA a los 30 segundos y se lleva por delante el resto del archivo de
     pruebas, así que el día que las entradas desaparezcan esta suite no diría
     «faltan las entradas» — diría un error de tiempo agotado y dejaría sin
     correr todo lo que viene después. */
  const hayEstados = await pg.locator('.empezar-lista a[href="#estados"]').count();
  if(hayEstados){
    await pg.click('.empezar-lista a[href="#estados"]');
    await pg.waitForTimeout(1400);
  }
  const llego = await pg.evaluate(() =>
    Math.round(document.getElementById('estados').getBoundingClientRect().top));
  ok(hayEstados > 0 && Math.abs(llego) < 140,
     `y al tocar una, lleva (la sección a ${llego}px de arriba)`);

  /* El botón de la consola, encogido en teléfono. Se mide el ANCHO porque el
     defecto era que 230 px de botón tapaban las entradas de esta misma
     sección — lo vi en una captura, no en el código. */
  const bt = await pg.evaluate(() => {
    const e = document.querySelector('.consola-bt');
    const c = e.getBoundingClientRect();
    return { ancho: Math.round(c.width), alto: Math.round(c.height),
             nombre: e.getAttribute('aria-label'),
             tecla: !!(e.querySelector('kbd')?.getBoundingClientRect().width) };
  });
  ok(bt.ancho <= 64, `en teléfono el botón de la consola es un cuadro (${bt.ancho}px de ancho)`);
  ok(bt.alto >= 44, `y sigue siendo tocable (${bt.alto}px de alto)`);
  ok(!bt.tecla, 'sin la tecla D impresa, que en un teléfono no existe');
  ok((bt.nombre || '').trim() === 'Consola',
     `pero conserva su nombre para quien no lo ve («${bt.nombre}»)`);

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

/* ══ 4-quinquies · EL COMPARADOR DE «VACÍOS» ═════════════════════════════
   La sección AFIRMABA que «un hueco en blanco se lee como se rompió» y nunca
   enseñaba el hueco. Ahora están los dos lados juntos.

   ⚠ Y AQUÍ SE CAZÓ EL DEFECTO MÁS VIEJO QUE HE ENCONTRADO EN ESTE BANCO: el
   icono de los estados vacío/error/sin conexión medía 544×544 px. Un `<svg>`
   sin medidas toma el tamaño por defecto de un elemento reemplazado y de ahí
   se estira. Estaba EN PRODUCCIÓN, y ninguna prueba lo veía: el icono sólo
   existe en tres de los cinco estados de esta sección, y el que se pinta al
   cargar es el otro. Por eso esta prueba RECORRE LOS CINCO — un estado que
   nadie pinta es un estado que nadie mide.
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── el comparador de vacíos ──');
{
  const ctx = await b.newContext({ viewport:{ width:1440, height:900 } });
  const { pg, err } = await nuevaPagina(ctx);
  await pg.locator('#vacios').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(400);

  const lados = await pg.evaluate(() => {
    const ls = [...document.querySelectorAll('.comparador-lado')];
    return ls.map(l => Math.round(l.getBoundingClientRect().width));
  });
  ok(lados.length === 2, `hay dos lados (${lados.length})`);
  ok(lados.length === 2 && Math.abs(lados[0] - lados[1]) <= 1,
     `y miden lo mismo, o la comparación hablaría del tamaño de las cajas (${lados.join(' vs ')})`);

  /* Los cinco estados, uno por uno. */
  const medidas = [];
  for(const cual of ['cargando', 'vacio', 'error', 'sinred', 'lleno']){
    await pg.click(`[data-lista="${cual}"]`);
    await pg.waitForTimeout(220);
    medidas.push(await pg.evaluate((c) => {
      const caja = document.querySelector('[data-caja-lista]');
      const cruda = document.querySelector('[data-caja-cruda]');
      const ancho = caja.getBoundingClientRect().width;
      /* Lo que se desborda de su propio panel. Es la pregunta que ninguna
         prueba estaba haciendo dentro de estas cajas. */
      const anchos = [...caja.querySelectorAll('*')].map(e => e.getBoundingClientRect().width);
      const icono = caja.querySelector('svg');
      return {
        cual: c,
        disenado: caja.innerHTML.trim().length > 0,
        crudo: cruda.innerHTML.trim().length,
        desborda: Math.round(Math.max(0, Math.max(0, ...anchos) - ancho)),
        icono: icono ? Math.round(icono.getBoundingClientRect().width) : null,
      };
    }, cual));
  }
  ok(medidas.every(m => m.disenado),
     'los cinco estados pintan algo del lado diseñado');
  ok(medidas.every(m => m.desborda === 0),
     'y en ninguno se desborda nada de su panel: ' +
     medidas.map(m => `${m.cual} +${m.desborda}px`).join(', '));
  const conIcono = medidas.filter(m => m.icono !== null);
  ok(conIcono.length === 3, `tres estados llevan icono (${conIcono.map(m => m.cual).join(', ')})`);
  ok(conIcono.every(m => m.icono <= 64),
     'y el icono es un icono, no media pantalla: ' +
     conIcono.map(m => `${m.cual} ${m.icono}px`).join(', '));

  /* El lado sin diseñar: vacío CUANDO ÉSE ES EL EJEMPLO, con texto cuando lo
     que sale por defecto es un mensaje de máquina. */
  const porEstado = Object.fromEntries(medidas.map(m => [m.cual, m]));
  ok(porEstado.cargando.crudo === 0 && porEstado.vacio.crudo === 0,
     'cargando y vacío no enseñan nada del lado crudo, que es justo el ejemplo');
  ok(porEstado.error.crudo > 0 && porEstado.sinred.crudo > 0,
     'error y sin conexión enseñan lo que escupe la máquina');
  ok(porEstado.lleno.crudo > 0, 'y con datos se dice que ahí no hay diferencia');

  /* Es una ilustración, no una interfaz: ni un control dentro. */
  const controles = await pg.evaluate(() => ({
    dentro: document.querySelectorAll('[data-caja-cruda] button, [data-caja-cruda] a, [data-caja-cruda] input').length,
    escondido: document.querySelector('[data-caja-cruda]').getAttribute('aria-hidden'),
  }));
  ok(controles.dentro === 0, `ni un control de mentira dentro (${controles.dentro})`);
  ok(controles.escondido === 'true',
     'y va oculto al lector de pantalla: es un ejemplo de lo que NO hay que hacer');

  ok(err.length === 0, 'cero errores de consola' + (err.length ? ': ' + err[0] : ''));
  await pg.close(); await ctx.close();
}

/* En teléfono no se encogen a la mitad: se deslizan con enganche. Dos columnas
   de 165 px convierten los dos lados en dos ilegibles. */
{
  const ctx = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true });
  const { pg } = await nuevaPagina(ctx);
  await pg.locator('#vacios').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(400);
  const tel = await pg.evaluate(() => {
    const c = document.querySelector('.comparador');
    const l = document.querySelector('.comparador-lado');
    return { desliza: c.scrollWidth > c.clientWidth + 1,
             enganche: getComputedStyle(c).scrollSnapType.startsWith('x'),
             anchoLado: Math.round(l.getBoundingClientRect().width),
             anchoCaja: Math.round(c.getBoundingClientRect().width) };
  });
  ok(tel.desliza, 'en teléfono el comparador se desliza en vez de partirse en dos');
  ok(tel.enganche, 'y con enganche, para que cada lado quede completo');
  ok(tel.anchoLado > tel.anchoCaja * 0.7,
     `cada lado se ve entero (${tel.anchoLado} de ${tel.anchoCaja}px)`);
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
    /* La barra de abajo sin script: los enlaces sirven —son enlaces— y las
       flechas NO se pintan, porque nadie puede moverlas. Un control muerto se
       lee como roto, y quien lo toque va a pensar que la página falló. */
    enlacesAbajo: [...document.querySelectorAll('.cinta-vias a')]
      .filter(a => a.getBoundingClientRect().width > 0).length,
    /* Las entradas de «por dónde empezar» son enlaces normales a propósito:
       la parte que orienta a quien acaba de llegar es la última que se puede
       permitir no aparecer. */
    empezar: [...document.querySelectorAll('.empezar-lista a')]
      .filter(a => a.getBoundingClientRect().height > 0).length,
    flechasAbajo: [...document.querySelectorAll('.rail-flecha')]
      .filter(f => f.getBoundingClientRect().width > 0).length,
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
  ok(r.enlacesAbajo === 10, `sin script la barra de abajo sigue sirviendo (${r.enlacesAbajo} enlaces)`);
  ok(r.flechasAbajo === 0, `y las flechas no se pintan, que no habría quién las moviera (${r.flechasAbajo})`);
  ok(r.empezar === 3, `y las tres entradas de «por dónde empezar» siguen ahí (${r.empezar})`);
  await pg.screenshot({ path:`${SALIDA}/lab-sinjs.png`, fullPage:false });
  await pg.close(); await ctx.close();
}

await b.close();
console.log(fallas ? `\n✗ ${fallas} fallas` : '\n✓ todo pasa');
process.exit(fallas ? 1 : 0);
