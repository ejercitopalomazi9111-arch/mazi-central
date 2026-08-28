/* ══════════════════════════════════════════════════════════════════════════
   PRUEBAS DE LA APP · la navegación de dos niveles y las PROPORCIONES
   ──────────────────────────────────────────────────────────────────────────
   Por qué existe este archivo aparte de `pruebas-impresion.mjs`: aquél mide la
   HOJA —milímetros, márgenes, qué se corta al imprimir—. Éste mide la
   PANTALLA, que es otro problema y falla de otra manera.

   Carlos: «arregla todos los bugs de proporciones de recuadros de texto y
   texto etc». Un bug de proporción no se ve leyendo el CSS: se ve cuando una
   caja mide más que su padre, cuando un botón parte su nombre en dos renglones
   o cuando un control queda de 36 px y el dedo no atina. Las tres cosas se
   MIDEN aquí, en un navegador de verdad y a dos anchos: el teléfono de Carlos
   y una computadora.

   Cómo se corre:
     node build.mjs && node reportes/pruebas-app.mjs
   (Hace falta el servidor de `dist/` en el 8791. ⚠️ `build.mjs` BORRA y rehace
   `dist/`, así que un servidor que ya estaba corriendo se queda apuntando al
   directorio muerto y las pruebas fallan por seis lados sin razón aparente.
   Se reconstruye Y se reinicia el servidor, en ese orden.)
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'http://localhost:8791/reportes/';
let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c) { bien++; console.log('  ✓ ' + q); }
  else  { mal++;  console.log('  ✗ ' + q + (extra ? '\n      ' + extra : '')); }
};

const nav = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });

/* Abre la app y ESPERA A LA TIPOGRAFÍA. No es un detalle: «Mazi» es más ancha
   que la de repuesto, y el desborde de la barra que Carlos vería sólo aparece
   con la de la casa cargada. Medir antes de que llegue es medir otra página. */
async function abrir(ancho, alto, movil){
  const ctx = await nav.newContext(movil
    ? { viewport:{width:ancho,height:alto}, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'es-MX' }
    : { viewport:{width:ancho,height:alto}, locale:'es-MX' });
  const p = await ctx.newPage();
  p.__errores = [];
  p.on('pageerror', e => p.__errores.push(String(e).slice(0,160)));
  p.on('console', m => { if(m.type() === 'error') p.__errores.push('consola: ' + m.text().slice(0,140)); });
  await p.goto(BASE, { waitUntil:'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  return p;
}

const estado = p => p.evaluate(() => ({
  modo:    (document.querySelector('.modo[aria-selected="true"]')||{}).dataset?.modo,
  pestanas: [...document.querySelectorAll('.pestana')].filter(t=>!t.hidden).map(t=>t.dataset.vista),
  paneles:  [...document.querySelectorAll('[id^=panel-]')].filter(s=>!s.hidden).map(s=>s.id.slice(6)),
  grande:   document.querySelector('#bImprimir').textContent.trim(),
  /* Se MIRA la pantalla, no se lee la propiedad. `.hidden` decía 'true'
     mientras el botón seguía pintado: `[hidden]` pierde contra el `display`
     de `.btn`. Una prueba que le pregunta al código si se escondió sólo
     comprueba que el código cree lo mismo que yo. */
  nuevoSeVe: !!document.querySelector('#bNuevo').offsetParent,
  tiraSeVe: !document.querySelector('.pestanas').hidden,
}));

/* ── 1 · LA NAVEGACIÓN DE DOS NIVELES ────────────────────────────────── */
console.log('\n── la navegación de dos niveles ──');
{
  const p = await abrir(390, 844, true);
  ok('la página carga sin un solo error', p.__errores.length === 0, p.__errores[0]);

  let e = await estado(p);
  ok('arranca en Reporte', e.modo === 'reporte');
  ok('y en la pestaña Escribir', e.paneles.join() === 'escribir');
  ok('las siete pestañas del reporte se ven', e.pestanas.length === 7);
  ok('ninguna pestaña de otro modo se cuela',
     !e.pestanas.includes('avisos') && !e.pestanas.includes('credencial'));

  await p.click('.modo[data-modo="aviso"]'); await p.waitForTimeout(600);
  e = await estado(p);
  ok('«Aviso» cae en Pendientes, no donde estaba', e.paneles.join() === 'avisos');
  ok('y sólo enseña sus dos pestañas', e.pestanas.join() === 'avisos,cartel');
  ok('el botón grande deja de decir «Imprimir»', e.grande === 'Crear la imagen');
  ok('y «Nuevo» se guarda: el panel ya trae el suyo', e.nuevoSeVe === false);

  await p.click('.modo[data-modo="credencial"]'); await p.waitForTimeout(500);
  e = await estado(p);
  ok('Credencial abre su panel', e.paneles.join() === 'credencial');
  /* Una tira de UNA pestaña no dice nada que el renglón de arriba no diga ya,
     y gasta un renglón de los pocos que caben en un teléfono. */
  ok('con una sola pestaña, la tira de abajo desaparece', e.tiraSeVe === false);

  await p.click('.modo[data-modo="reporte"]'); await p.waitForTimeout(500);
  e = await estado(p);
  ok('volver a Reporte devuelve todo a su sitio',
     e.paneles.join() === 'escribir' && e.grande === 'Imprimir / PDF' && e.nuevoSeVe);
  ok('y la tira vuelve a verse', e.tiraSeVe === true);

  /* Lo que de verdad rompió la impresión una vez: un panel que se queda
     visible porque nadie se acordó de apuntarlo en una lista escrita a mano.
     Aquí se comprueba que NUNCA hay dos paneles de modos distintos abiertos. */
  const cruzados = await p.evaluate(() => {
    const modoDe = { escribir:'reporte', ver:'reporte', formato:'reporte', plantilla:'reporte',
                     registro:'reporte', verificar:'reporte', guardados:'reporte',
                     credencial:'credencial', avisos:'aviso', cartel:'aviso' };
    const malos = [];
    for(const b of document.querySelectorAll('.modo')){
      b.click();
      const abiertos = [...document.querySelectorAll('[id^=panel-]')]
        .filter(s => !s.hidden).map(s => s.id.slice(6));
      for(const a of abiertos) if(modoDe[a] !== b.dataset.modo) malos.push(b.dataset.modo + '→' + a);
    }
    return malos;
  });
  ok('ningún panel se cuela en el modo de otro', cruzados.length === 0, cruzados.join(' · '));

  /* ⚠️ EL DEFECTO QUE NO SE VE LEYENDO. Al meter Avisos aquí adentro, tres de
     sus campos —fecha, grupo, semestre— se llamaban igual que tres de Reportes.
     El navegador no se queja: `querySelector` devuelve el PRIMERO y ya. El
     resultado fue un campo de fecha de 0×0 px que nadie podía llenar, y buscarlo
     leyendo habría llevado horas. Se cuenta, no se confía. */
  const repes = await p.evaluate(() => {
    const visto = {}, mal = [];
    for(const e of document.querySelectorAll("[id]")){
      if(visto[e.id]) mal.push(e.id); else visto[e.id] = 1;
    }
    return mal;
  });
  ok("ningún id está repetido en toda la página", repes.length === 0, repes.join(" · "));
  await p.context().close();
}

/* ── 2 · LOS AVISOS, DE VERDAD ───────────────────────────────────────── */
console.log('\n── el motor de avisos, dentro de Reportes ──');
{
  const p = await abrir(390, 844, true);
  await p.click('.modo[data-modo="aviso"]'); await p.waitForTimeout(700);

  ok('las diez plantillas del cartel están',
     await p.evaluate(() => document.querySelector('#fPlantilla').options.length) === 10);
  ok('la fecha arranca puesta en hoy', await p.evaluate(() => {
     const d = new Date(); const hoy = new Date(d.getTime() - d.getTimezoneOffset()*60000)
       .toISOString().slice(0,10);
     return document.querySelector('#fFecha').value === hoy;
  }));

  await p.click('#bAgregar'); await p.waitForTimeout(500);
  ok('agregar un pendiente lo pinta', await p.evaluate(() =>
     document.querySelectorAll('#lista [data-i]').length) === 1);
  ok('y el contador lo dice', /1 pendiente/.test(await p.evaluate(() =>
     document.querySelector('#cuentaPend').textContent)));

  /* ⚠️ EL BUG DE PROPORCIÓN QUE MÁS DOLÍA. Reportes le pone `min-height:340px`
     al textarea porque el suyo es el cuerpo de un reporte entero. Sin corregir,
     cada pendiente traía una caja de 340 px y la lista se volvía inusable. */
  const alto = await p.evaluate(() =>
    Math.round(document.querySelector('#lista textarea').getBoundingClientRect().height));
  ok('el textarea de un pendiente NO hereda los 340 px del reporte',
     alto > 60 && alto < 140, 'midió ' + alto + ' px');

  await p.fill('#lista [data-c="titulo"]', 'Traer el juego de geometría');
  await p.waitForTimeout(400);
  await p.click('.pestana[data-vista="cartel"]'); await p.waitForTimeout(900);
  const lienzo = await p.evaluate(() => {
    const c = document.querySelector('#lienzo');
    return { w:c.width, h:c.height, medida:document.querySelector('#medidaCartel').textContent };
  });
  ok('el cartel se dibuja', lienzo.w > 0 && lienzo.h > 0, JSON.stringify(lienzo));
  ok('y dice cuánto mide', /\d+ × \d+ px/.test(lienzo.medida), lienzo.medida);

  await p.click('#bImprimir'); await p.waitForTimeout(1400);
  ok('el botón grande hace la IMAGEN, no manda a imprimir',
     await p.evaluate(() => !!document.querySelector('#salida img')));
  ok('sin errores en toda la vuelta', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── 3 · LAS PROPORCIONES ────────────────────────────────────────────── */
/* Tres defectos que se ven y no se leen:
     · algo más ancho que su padre  → texto cortado o barra de lado
     · un botón partido en dos renglones → deja de parecer botón
     · un control de menos de 44 px  → el dedo no atina
   Se miden en TODOS los paneles, no sólo en el que abre. */
console.log('\n── las proporciones, panel por panel ──');
async function barrer(p, ancho){
  return p.evaluate((ancho) => {
    const modos = [...document.querySelectorAll('.modo')];
    const fallas = { desbordan:[], partidos:[], chicos:[], pagina:[] };
    for(const m of modos){
      m.click();
      for(const t of [...document.querySelectorAll('.pestana')].filter(x => !x.hidden)){
        t.click();
        const donde = m.dataset.modo + '/' + t.dataset.vista;
        if(document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
          fallas.pagina.push(donde + ' (' + document.documentElement.scrollWidth + ' > ' + ancho + ')');
        for(const sec of document.querySelectorAll('[id^=panel-]:not([hidden])')){
          const caja = sec.getBoundingClientRect();
          for(const e of sec.querySelectorAll('input,select,textarea,button,.tarjeta,.campo,.nota,.aviso-caja')){
            const r = e.getBoundingClientRect();
            if(!r.width || !r.height) continue;
            /* fuera del panel por la derecha, con 2 px de tolerancia por bordes */
            if(r.right > caja.right + 2)
              fallas.desbordan.push(donde + ' ' + (e.id || e.className || e.tagName) +
                ' +' + Math.round(r.right - caja.right) + 'px');
            /* un botón de una sola línea no debe medir más de ~1.6 renglones */
            if(e.tagName === 'BUTTON' && !e.textContent.includes('\n')){
              const linea = parseFloat(getComputedStyle(e).fontSize) * 1.6;
              if(r.height > Math.max(52, linea * 2.2))
                fallas.partidos.push(donde + ' «' + e.textContent.trim().slice(0,22) + '» ' +
                  Math.round(r.height) + 'px');
            }
            if(/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.tagName) &&
               e.type !== 'checkbox' && r.height < 44)
              fallas.chicos.push(donde + ' ' + (e.id || e.textContent.trim().slice(0,18) || e.tagName) +
                ' ' + Math.round(r.height) + 'px');
          }
        }
      }
    }
    return fallas;
  }, ancho);
}

for(const [ancho, alto, movil, como] of [[390,844,true,'teléfono'],[1100,900,false,'computadora']]){
  console.log('  · a ' + ancho + ' px (' + como + ')');
  const p = await abrir(ancho, alto, movil);
  await p.click('.modo[data-modo="aviso"]'); await p.waitForTimeout(500);
  await p.click('#bAgregar'); await p.waitForTimeout(400);   /* con contenido, que es cuando falla */
  const f = await barrer(p, ancho);
  ok('la página no se va de lado en ninguna pestaña', f.pagina.length === 0, f.pagina.slice(0,4).join(' · '));
  ok('nada se sale de su panel', f.desbordan.length === 0, f.desbordan.slice(0,5).join(' · '));
  ok('ningún botón parte su nombre en dos renglones', f.partidos.length === 0, f.partidos.slice(0,5).join(' · '));
  ok('ningún control queda de menos de 44 px', f.chicos.length === 0, f.chicos.slice(0,6).join(' · '));
  ok('y ni un error en toda la barrida', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas de la app');
process.exit(mal ? 1 : 0);
