/* Las pruebas de IMPRESIÓN de Reportes.
 *
 * Por qué existe: Carlos reportó dos veces lo mismo —«el pie de página se pasa
 * a la siguiente y deja una hoja vacía con solo el pie»— y las pruebas que ya
 * había no podían cacharlo, porque revisan el TEXTO del reporte y esto es un
 * defecto de PAGINACIÓN FÍSICA: la hoja mide 279.4 mm, el navegador deja
 * menos, y la hoja se parte en dos páginas. La mitad de abajo lleva el
 * membrete inferior y el folio —los dos en posición absoluta— y sale sola.
 *
 * Leer el CSS no lo encuentra. Hay que imprimir de verdad y contar las hojas.
 * Eso hace esto: manda el reporte a PDF con los márgenes que se queda Safari
 * y comprueba que salgan TANTAS páginas COMO HOJAS, ni una más.
 *
 *   node reportes/pruebas-impresion.mjs [http://localhost:8791]
 */
const BASE = process.argv[2] || 'http://localhost:8791';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

let bien = 0, mal = 0;
const ok = (que, cond, detalle='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};

/* Los márgenes que se queda Safari en iPhone. El caso malo es con los
   «encabezados y pies de página» PUESTOS, que es como viene de fábrica:
   ahí se come cerca de 22 mm arriba y abajo, no los 12.7 de siempre. */
const SAFARI_PEOR = { top:'22mm', bottom:'22mm', left:'12.7mm', right:'12.7mm' };
const SAFARI_LIMPIO = { top:'12.7mm', bottom:'12.7mm', left:'12.7mm', right:'12.7mm' };

const paginasDe = (buf) => {
  const f = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/imp.pdf';
  writeFileSync(f, buf);
  const info = execFileSync('pdfinfo', [f], { encoding:'utf-8' });
  const n = Number(/Pages:\s+(\d+)/.exec(info)[1]);
  unlinkSync(f);
  return n;
};

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{ width:390, height:844 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', e => errores.push(String(e)));

await page.goto(BASE + '/reportes/', { waitUntil:'networkidle' });

/* Un reporte largo de verdad: si sólo hay una hoja, la prueba no prueba nada
   —el defecto es que la hoja N se parte y empuja a la N+1. */
const PARRAFO = 'Se hace constar que durante la jornada se observaron diversas '
  + 'situaciones relacionadas con el cumplimiento del reglamento escolar, la '
  + 'organización del grupo y el desarrollo normal de las actividades académicas '
  + 'asignadas para la semana en curso. ';
await page.evaluate((p) => {
  const c = document.querySelector('#fCuerpo');
  let t = '';
  for(let i = 1; i <= 8; i++){
    t += '## Apartado ' + i + '\n\n' + p.repeat(6) + '\n\n';
  }
  c.value = t;
  c.dispatchEvent(new Event('input', { bubbles:true }));
}, PARRAFO);
await page.waitForTimeout(700);

/* Se pagina como lo hace el botón de imprimir, y se cuentan las hojas. */
await page.evaluate(() => { document.querySelector('#bImprimir').click(); });
await page.waitForTimeout(900);
const hojas = await page.evaluate(() => document.querySelectorAll('.hoja').length);
console.log('\n· el reporte de prueba ocupa ' + hojas + ' hojas\n');
ok('el reporte de prueba ocupa más de una hoja', hojas > 1, hojas + ' hojas');

/* ── LA CONDICIÓN REAL ─────────────────────────────────────────────────
   Chromium no reproduce el síntoma de Carlos: su hoja lleva `overflow:hidden`,
   así que Chromium la RECORTA en vez de partirla y el conteo de páginas sale
   bien aunque la hoja no quepa. Contar páginas aquí abajo sirve de red, pero
   no prueba nada por sí solo.

   Lo que sí se puede comprobar, y es exactamente lo que falló, es la
   aritmética: la hoja escalada tiene que caber en el papel que deja Safari.
   Esta comprobación lee los números de la página misma, así que si alguien
   vuelve a subir la escala, truena aquí. */
const n = await page.evaluate(() => ({
  escala: FORMATO_OFICIAL.impresion,
  hoja:   HOJA_MM,
  come:   SAFARI_COME,
}));
const FORMATO_OFICIAL_ESPERADO = n.escala;
const utilAlto  = n.hoja.alto  - n.come.arriba - n.come.abajo;
const utilAncho = n.hoja.ancho - n.come.lados * 2;
const altoHoja  = n.hoja.alto  * n.escala;
const anchoHoja = n.hoja.ancho * n.escala;

console.log('· escala ' + n.escala + ' → hoja de ' + altoHoja.toFixed(1) + ' x '
          + anchoHoja.toFixed(1) + ' mm, en un papel útil de '
          + utilAlto.toFixed(1) + ' x ' + utilAncho.toFixed(1) + ' mm\n');

ok('la hoja escalada CABE a lo alto en lo que deja Safari',
   altoHoja <= utilAlto,
   'se pasa por ' + (altoHoja - utilAlto).toFixed(1) + ' mm — por ahí se parte');
ok('la hoja escalada CABE a lo ancho en lo que deja Safari',
   anchoHoja <= utilAncho,
   'se pasa por ' + (anchoHoja - utilAncho).toFixed(1) + ' mm');

/* MUTACIÓN de la aritmética: con la escala que tenía antes (0.86) NO cabía.
   Si esto no truena, la comprobación de arriba no está comprobando nada. */
ok('MUTACIÓN: con la escala vieja (0.86) la hoja NO cabía',
   n.hoja.alto * 0.86 > utilAlto,
   'entonces 0.86 sí cabía y el diagnóstico está mal');

/* ── el candado contra la partida, leído del navegador, no del archivo ── */
await page.emulateMedia({ media:'print' });
const candado = await page.evaluate(() => {
  const h = document.querySelector('.hoja');
  const c = getComputedStyle(h);
  return { corte: c.breakInside, alto: c.height, zoom: c.zoom };
});
await page.emulateMedia({ media:null });
ok('al imprimir, la hoja tiene prohibido partirse', candado.corte === 'avoid',
   'break-inside = ' + candado.corte);

/* ── red de seguridad: en Chromium, hojas dentro = páginas fuera ──────── */
for(const [nombre, margen] of [['Safari con sus encabezados', SAFARI_PEOR],
                               ['Safari sin encabezados', SAFARI_LIMPIO]]){
  const pdf = await page.pdf({ format:'Letter', printBackground:true, margin:margen,
                               preferCSSPageSize:false });
  const p = paginasDe(pdf);
  ok(nombre + ': ' + hojas + ' hojas → ' + p + ' páginas', p === hojas,
     p > hojas ? 'sobran ' + (p - hojas) : '');
}

/* ── QUÉ IMPRIME EL BOTÓN DESDE CADA PESTAÑA ──────────────────────────
   Carlos: «revisa que no siempre imprime lo que corresponde el botón de
   imprimir». Hay OCHO pestañas y el botón de la barra se ve desde todas, así
   que se prueban las ocho y no la que uno se acuerde.

   Ya falló una vez: desde «Credencial» te brincaba a «Vista» y te imprimía el
   REPORTE, con las credenciales hechas y todo. */
console.log('\n── Qué imprime el botón desde cada pestaña ──');
await page.evaluate(() => {
  R.cuerpo = '## Uno\n\nTexto para que el reporte tenga contenido.';
  const c = document.querySelector('#fCuerpo');
  c.value = R.cuerpo; c.dispatchEvent(new Event('input', { bubbles:true }));
  CRED.gente = [Object.assign(credNueva(), { apellidos:'RAMÍREZ', num:'PM-1' }),
                Object.assign(credNueva(), { apellidos:'LÓPEZ',   num:'PM-2' })];
  credActiva = 0; guardarCred();
  window.print = () => {};
});
await page.waitForTimeout(700);

const PESTANAS = ['escribir','ver','credencial','plantilla','registro',
                  'formato','verificar','guardados'];
for(const t of PESTANAS){
  await page.evaluate((v) => {
    document.body.classList.remove('imprime-cred');
    document.querySelector('#impresora').innerHTML = '';
    verVista(v);
  }, t);
  await page.waitForTimeout(320);
  await page.click('#bImprimir');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    donde: vistaActual(),
    cred:  document.body.classList.contains('imprime-cred'),
    caras: (document.querySelector('#impresora').innerHTML.match(/class="cred/g)||[]).length,
    hojas: document.querySelectorAll('.hoja').length,
  }));
  /* La regla, dicha una vez: en «Credencial» se imprimen credenciales; en
     todas las demás, el reporte. Ninguna otra pestaña tiene documento propio
     —Registro alimenta al reporte, Guardados carga uno, Formato y Verificar
     son del reporte—, así que el reporte es lo que corresponde. */
  if(t === 'credencial'){
    ok('desde «' + t + '» imprime LAS CREDENCIALES', r.cred && r.caras === 4,
       r.cred ? r.caras + ' caras' : 'se fue al reporte');
    ok('y no te saca de la pestaña', r.donde === 'credencial', 'te mandó a ' + r.donde);
  } else {
    ok('desde «' + t + '» imprime el reporte', !r.cred && r.hojas >= 1,
       r.cred ? 'salió en modo credencial' : r.hojas + ' hojas');
  }
}

/* ── Que no se mezclen ─────────────────────────────────────────────────── */
console.log('\n── Que no se mezclen los dos documentos ──');
await page.evaluate(() => {
  R.cuerpo = '## Uno\n\nPALABRACLAVEREPORTE en el cuerpo.';
  const c = document.querySelector('#fCuerpo');
  c.value = R.cuerpo; c.dispatchEvent(new Event('input', { bubbles:true }));
  verVista('credencial'); pintarCred();
  document.querySelector('#impresora').innerHTML = pliegosDe(CRED.gente);
  document.body.classList.add('imprime-cred');
});
await page.waitForTimeout(700);
{
  const pdf = await page.pdf({ format:'Letter', printBackground:true,
    margin:{ top:'10mm', bottom:'10mm', left:'10mm', right:'10mm' } });
  const f = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/mezcla.pdf';
  writeFileSync(f, pdf);
  const t = execFileSync('pdftotext', ['-layout', f, '-'], { encoding:'utf-8' });
  ok('imprimiendo credenciales, el reporte NO se cuela',
     !/PALABRACLAVEREPORTE/.test(t));
  ok('y las credenciales sí salen', /PM-1/.test(t) && /PM-2/.test(t));
  try{ unlinkSync(f); }catch(e){}
}

/* ── Lo vacío, que antes salía en blanco sin avisar ────────────────────── */
console.log('\n── Cuando no hay nada que imprimir ──');
{
  const avisos = [];
  page.on('dialog', d => { avisos.push(d.message()); d.dismiss(); });
  await page.evaluate(() => {
    document.body.classList.remove('imprime-cred');
    R.cuerpo = ''; R.titulo = '';
    const c = document.querySelector('#fCuerpo');
    c.value = ''; c.dispatchEvent(new Event('input', { bubbles:true }));
    verVista('escribir');
    window.__imprimio = false;
    window.print = () => { window.__imprimio = true; };
  });
  await page.waitForTimeout(400);
  await page.click('#bImprimir');
  await page.waitForTimeout(400);
  ok('un reporte vacío NO se manda a imprimir en blanco',
     await page.evaluate(() => window.__imprimio === false),
     'gastó una hoja con nada más el membrete');
  ok('y dice por qué', avisos.some(a => /vac[ií]o/i.test(a)),
     avisos[0] || 'no avisó nada');
}

ok('la página no tiró ningún error', errores.length === 0, errores[0] || '');

/* ── LA ESCALA QUE SE QUEDÓ GUARDADA ──────────────────────────────────
   Esto es lo que hizo que a Carlos «le siguiera pasando» después de que yo
   diera el defecto por arreglado. La escala de impresión vive DENTRO de cada
   reporte, guardada. Cambiar el valor por omisión sólo arregla los reportes
   nuevos: el que él ya tenía escrito seguía trayendo 0.86 y lo pisaba.

   A 0.86 la hoja mide 240.3 mm y en lo que deja Safari con sus encabezados
   —235.4 mm— se pasa por 4.9 mm. Esos 4.9 mm son exactamente la banda del
   membrete inferior, que es lo que él veía solita en cada página par: 14
   páginas para 7 hojas. */
console.log('\n── La escala vieja que se quedó guardada en el reporte ──');
{
  const ctx2 = await b.newContext({ viewport:{ width:390, height:844 } });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(() => {
    localStorage.setItem('reportes_todos', JSON.stringify([{
      id:'viejo', titulo:'Reporte con la escala de antes',
      cuerpo:'## Uno\n\n' + 'Texto. '.repeat(300), fecha:'2026-08-24', evidencias:[],
      formato:{ impresion:0.86 },
    }]));
  });
  await p2.goto(BASE + '/reportes/', { waitUntil:'networkidle' });
  await p2.waitForTimeout(1200);
  const n = await p2.evaluate(() => ({
    enDisco: (JSON.parse(localStorage.getItem('reportes_todos')||'[]')[0]||{}).formato.impresion,
    enUso: R.formato.impresion,
    css: getComputedStyle(document.documentElement).getPropertyValue('--imp').trim(),
  }));
  ok('un reporte guardado con la escala vieja se abre con la nueva',
     n.enUso === FORMATO_OFICIAL_ESPERADO, 'se abrió con ' + n.enUso);
  ok('y la hoja escalada CABE en lo que deja Safari',
     279.4 * n.enUso <= 279.4 - 44,
     (279.4 * n.enUso).toFixed(1) + ' mm contra 235.4 útiles');
  ok('MUTACIÓN: con la escala vieja NO cabía, que es por lo que se partía',
     279.4 * 0.86 > 279.4 - 44,
     'entonces 0.86 sí cabía y el diagnóstico está mal');
  await ctx2.close();
}

/* ══ LAS DOS INSTITUCIONES ═════════════════════════════════════════════════
   GERALDMED no tiene membrete oficial, así que su cabecera se COMPONE con el
   logo. Lo que se prueba aquí son los dos defectos que salieron armándola, y
   los dos son de la misma familia: se ven «raros pero no rotos», que es la
   peor clase — uno los mira y piensa «ha de ser el diseño».

   1 · el filo del pie se llamaba `.barra`, que ya era la barra de herramientas
       de la app con `position:sticky; top:0`. Lo heredó, y con `top` y
       `bottom` puestos a la vez gana `top`: el pie se pintaba como listón EN
       LA CABECERA.
   2 · el pie de página seguía firmando «Instituto Rembrandt» debajo del
       membrete de GERALDMED. En un documento con folio y sello de
       verificación eso no es un detalle: es un papel que dice dos cosas. */
{
  const p3 = await (await b.newContext()).newPage();
  await p3.goto(BASE + '/reportes/', { waitUntil:'networkidle' });
  await p3.waitForTimeout(1000);

  const mide = async () => p3.evaluate(() => {
    const h = document.querySelector('.hoja');
    const inf = h.querySelector('.membrete-inf');
    const cab = h.querySelector('.membrete-sup');
    const zona = h.querySelector('.zona');
    const rh = h.getBoundingClientRect(), ri = inf.getBoundingClientRect();
    return {
      pieAbajo: Math.abs(ri.bottom - rh.bottom) < 2,
      firma: (document.querySelector('.folio-pie').innerText.split('\n')[1] || ''),
      seEncima: zona.getBoundingClientRect().top < cab.getBoundingClientRect().bottom,
      cabeceraEsImagen: cab.tagName === 'IMG',
      /* La marca de agua: de quién es la imagen, qué tan grande se pinta, y
         qué dice la leyenda. Se lee del DOM ya pintado, no de la
         configuración: lo que importa es lo que sale en el papel. */
      aguaSrc: (() => { const i = h.querySelector('.agua img');
                        return i ? new URL(i.src).pathname : null; })(),
      /* El ALTO DE LA TINTA, no el de la caja. Un logo con aire alrededor de
         su dibujo se pinta más chico que otro del mismo ancho declarado, y
         midiendo el elemento eso no se ve: los dos reportan lo mismo. Así que
         se dibuja en un canvas y se barre el alfa para hallar dónde empieza y
         dónde acaba el dibujo de verdad.
         (La estrella de GERALDMED ocupa 67% de su lienzo. Con la medida vieja
         habría pasado la prueba viéndose un tercio más chica que las otras.) */
      aguaAlto: 0,
      leyenda: (h.querySelector('.agua .letras') || {}).textContent || '',
    };
  });

  /* Se mide aparte porque hay que esperar a que la imagen cargue de verdad:
     una imagen a medio cargar no tiene tinta que medir. */
  const tinta = async () => p3.evaluate(async () => {
    const im = document.querySelector('.hoja .agua img');
    if(!im) return 0;
    const b = new Image(); b.src = im.src;
    await b.decode();
    const c = document.createElement('canvas');
    c.width = b.naturalWidth; c.height = b.naturalHeight;
    const cx = c.getContext('2d'); cx.drawImage(b, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height).data;
    let arriba = -1, abajo = -1;
    for(let y = 0; y < c.height; y++){
      for(let x = 0; x < c.width; x++){
        if(d[(y*c.width + x)*4 + 3] >= 40){ if(arriba < 0) arriba = y; abajo = y; break; }
      }
    }
    if(arriba < 0) return 0;
    /* de píxeles del archivo a milímetros pintados en la hoja */
    const alto = im.getBoundingClientRect().height;
    return +((abajo - arriba + 1) / c.height * alto).toFixed(1);
  });

  const cambiar = async (cual) => {
    await p3.click('[data-vista="formato"]'); await p3.waitForTimeout(250);
    await p3.selectOption('#oInstitucion', cual); await p3.waitForTimeout(700);
    await p3.click('[data-vista="ver"]'); await p3.waitForTimeout(900);
  };

  /* Los CUATRO papeles: jefatura con la marca de la casa, la escuela con su
     membrete real, presidencia y GERALDMED compuestos. Se prueban todos porque
     el defecto que importa —un papel que firma con otra institución— no se ve
     en uno solo: se ve comparándolos. */
  const ESPERADO = {
    mazi:        { firma:/grupo mazi/i,   imagen:false, agua:/paloma-simple\.svg$/,
                   leyenda:/grupo mazi/i },
    rembrandt:   { firma:/rembrandt/i,    imagen:true,  agua:/escudo-rembrandt\.png$/,
                   leyenda:/instituto rembrandt/i },
    presidencia: { firma:/sociedad/i,     imagen:false, agua:/escudo-rembrandt\.png$/,
                   leyenda:/sociedad de alumnos/i },
    /* La marca de agua de GERALDMED es la ESTRELLA, no el logo de la
       cabecera: la hoja no debe repetir la misma imagen dos veces. */
    geraldmed:   { firma:/geraldmed/i,    imagen:false, agua:/logo-estrella\.png$/,
                   leyenda:/geraldmed/i },
  };
  const altos = {};
  for(const [cual, esp] of Object.entries(ESPERADO)){
    await cambiar(cual);
    const m = await mide();
    ok(cual + ' · el filo del pie va ABAJO, no de listón en la cabecera',
       m.pieAbajo, 'quedó arriba: chocó con otra clase que trae top:0');
    ok(cual + ' · firma con su propia institución',
       esp.firma.test(m.firma), 'firmó «' + m.firma + '»');
    ok(cual + ' · el texto NO se monta sobre la línea del membrete',
       !m.seEncima, 'el margen de arriba se quedó corto para su cabecera');
    ok(cual + (esp.imagen ? ' · usa su membrete REAL, que es una imagen'
                          : ' · se COMPONE, no finge un membrete que no existe'),
       m.cabeceraEsImagen === esp.imagen);

    /* ── LA MARCA DE AGUA ─────────────────────────────────────────────────
       El defecto que reportó Carlos: los cuatro papeles llevaban la paloma de
       Grupo Mazi. En el suyo tiene sentido; debajo del membrete de GERALDMED
       dice que Mazi firmó la papelería de otro. */
    ok(cual + ' · la marca de agua es SUYA, no la de la casa',
       esp.agua.test(m.aguaSrc || ''), 'trae ' + m.aguaSrc);
    ok(cual + ' · la leyenda de la marca de agua también es suya',
       esp.leyenda.test(m.leyenda), 'dice «' + m.leyenda + '»');
    altos[cual] = await tinta();
  }

  /* Cada logo trae su propio ancho porque son de formas distintas —la paloma
     apaisada 1.7:1, el escudo cuadrado, la estrella cuadrada pero con 33% de
     aire alrededor de su dibujo—. Lo que tiene que quedar parejo NO es el
     ancho declarado sino la TINTA que cae en el papel, que es lo único que se
     ve. Por eso se mide el dibujo y no la caja. */
  const alturas = Object.values(altos);
  ok('ninguna marca de agua se sale de escala frente a las otras',
     Math.max(...alturas) / Math.min(...alturas) < 1.30,
     'altos de TINTA pintada (px): ' + JSON.stringify(altos));

  /* Y que el papel siga al cargo sin pisarle una elección hecha a mano: ése es
     el defecto clásico de los valores «inteligentes». */
  /* ⚠ Se vuelve a un papel SUGERIDO antes de medir. El bucle de arriba dejó
     GERALDMED puesto a mano, y respetarlo es justo lo que el código debe hacer
     — así que sin este reinicio la prueba medía la regla de al lado y fallaba
     acusando al código de algo que hacía bien. Falló primero así, y el
     equivocado era el examen. */
  await p3.click('[data-vista="formato"]'); await p3.waitForTimeout(300);
  await p3.selectOption('#oInstitucion','rembrandt'); await p3.waitForTimeout(400);
  await p3.click('[data-vista="escribir"]'); await p3.waitForTimeout(300);
  await p3.click('[data-tipo="minuta"]'); await p3.waitForTimeout(500);
  await p3.click('[data-vista="formato"]'); await p3.waitForTimeout(300);
  ok('un reporte de la sociedad arranca en papel de Presidencia',
     await p3.inputValue('#oInstitucion') === 'presidencia',
     'quedó en ' + await p3.inputValue('#oInstitucion'));
  await p3.selectOption('#oInstitucion','geraldmed'); await p3.waitForTimeout(400);
  await p3.click('[data-vista="escribir"]'); await p3.waitForTimeout(300);
  await p3.click('[data-tipo="incidencia"]'); await p3.waitForTimeout(500);
  await p3.click('[data-vista="formato"]'); await p3.waitForTimeout(300);
  ok('pero si lo escogiste a mano, cambiar de tipo NO te lo quita',
     await p3.inputValue('#oInstitucion') === 'geraldmed',
     'se lo llevó el valor por defecto');

  /* La leyenda se mueve sola con el papel, PERO una que Carlos haya escrito no
     se toca. Es la misma regla del papel-sigue-al-cargo, y el mismo defecto
     clásico si se hace mal: un valor «inteligente» que borra texto ajeno. */
  await p3.selectOption('#oInstitucion','mazi'); await p3.waitForTimeout(400);
  ok('la leyenda sigue al papel cuando venía de la institución anterior',
     /grupo mazi/i.test(await p3.inputValue('#oLeyenda')),
     'quedó «' + await p3.inputValue('#oLeyenda') + '»');

  const MIA = 'ESTO LO ESCRIBIÓ CARLOS';
  await p3.fill('#oLeyenda', MIA); await p3.waitForTimeout(400);
  await p3.selectOption('#oInstitucion','geraldmed'); await p3.waitForTimeout(500);
  ok('pero una leyenda escrita a mano NO se la lleva el cambio de papel',
     await p3.inputValue('#oLeyenda') === MIA,
     'se la comió: quedó «' + await p3.inputValue('#oLeyenda') + '»');
}

await b.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
