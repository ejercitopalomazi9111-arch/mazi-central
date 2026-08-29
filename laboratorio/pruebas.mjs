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
      return r.height > 0 && r.height < 40;
    }).map(e => (e.textContent||'').trim().slice(0,16) + ':' + Math.round(e.getBoundingClientRect().height)),
  }));
  ok(m.h1 === 1, 'un solo h1');
  ok(!m.desborde, 'sin desbordamiento horizontal');
  ok(m.charset === 'UTF-8', 'charset UTF-8');
  ok(m.lang === 'es', 'lang declarado');
  ok(m.chicos.length === 0, 'todo control mide ≥40px de alto' + (m.chicos.length ? ': ' + m.chicos.slice(0,4).join(', ') : ''));
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
  await pg.waitForTimeout(250);

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
  ok(await pg.locator('[data-bt-muestra] .giro').count() === 1, 'el estado «cargando» enseña su ruedita');
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
  ok(/255,\s*92,\s*107/.test(colorError) || /192,\s*32,\s*47/.test(colorError),
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
  await pg.waitForTimeout(250);
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
    const archivos = ['', 'base.css', 'piezas.css', 'movimiento.css', 'lab.js', 'particulas.js'];
    let total = 0;
    for(const f of archivos){
      const r = await fetch(new URL(f, location.href));
      total += (await r.arrayBuffer()).byteLength;
    }
    return Math.round(total / 1024);
  });
  ok(Math.abs(kb - decl['Peso']) <= 3, `«${decl['Peso']} KB» y de verdad pesa ${kb} KB`);

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
