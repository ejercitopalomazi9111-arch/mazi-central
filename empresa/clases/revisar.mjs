#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   revisar.mjs — el metro de las clases de diseño
   ──────────────────────────────────────────────────────────────────────────
   Carlos me encargó darle clases de diseño web a Godines. Una clase que
   termina en «que se vea bonito» no es una clase: es una opinión con acento
   de maestro. Así que cada regla de `DISENO-WEB.md` que SE PUEDA MEDIR se
   mide aquí, en un navegador de verdad y a los dos anchos que importan.

   ⚠ LO QUE ESTO NO HACE, dicho arriba para que nadie lo use de certificado:
   no sabe si algo se ve bien. No mide jerarquía, ni ritmo, ni si la página
   se siente cara. Mide los DEFECTOS que Carlos caza en dos segundos desde el
   teléfono y que a nosotros se nos pasan leyendo el CSS. Salir en verde aquí
   es el piso, no el techo — y confundir las dos cosas es como se entrega una
   página correcta y horrible.

   Uso:
     node empresa/clases/revisar.mjs <url> [más urls…]
     node empresa/clases/revisar.mjs http://localhost:8123/sitio/

   Sale 0 si no hay nada 🔴. Los 🟡 se reportan y no reprueban: son cosas que
   a veces se deciden a propósito, y una herramienta que reprueba decisiones
   deliberadas es una herramienta que se acaba apagando.
   ═════════════════════════════════════════════════════════════════════════ */

/* Playwright puede estar local o global. Se busca en los dos y gana el que
   ARRANCA, no el que importa: una instalación sin navegadores bajados importa
   bien y truena al lanzar. */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

let chromium;
for(const d of ['/opt/node22/lib/node_modules/playwright/index.mjs',
                'playwright', '/usr/lib/node_modules/playwright/index.mjs']){
  try{ const c = (await import(d)).chromium;
       const n = await c.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
       await n.close(); chromium = c; break; }catch(e){}
}
if(!chromium){
  console.error('Falta playwright CON navegador: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

/* Los dos anchos que importan y por qué esos:
   · 390 es el iPhone de Carlos. Es donde vive el 90% de lo que él ve.
   · 1366 es la laptop más común. Ligas Mazi se ve mal justo aquí, y el
     diagnóstico fue «se diseñó sólo para teléfono y en escritorio sólo se
     centró». Medir sólo el teléfono es cómo se llega a eso. */
export const ANCHOS = [
  { nombre:'teléfono', ancho:390, alto:844, movil:true },
  { nombre:'laptop',   ancho:1366, alto:820, movil:false },
];

/* 44 px es el mínimo de Apple para algo que se toca con el dedo. No es un
   gusto: abajo de eso la gente falla el toque y cree que la app está rota. */
export const DEDO = 44;
/* 16 px es donde Safari en iOS DEJA de hacer zoom solo al enfocar un campo.
   Un campo de 15 px hace que la página salte al escribir, y eso se lee como
   un defecto de la app aunque el CSS esté impecable. */
export const TEXTO_MINIMO_CAMPO = 16;

export const PALETA = {
  vacio:'#100A18', superficie:'#1E1428', violeta:'#AC27FF', hueso:'#E9E4E4',
};

/* ── el trabajo que corre DENTRO de la página ───────────────────────────────
   Va como una sola función que se serializa al navegador. Todo lo que mide
   sale de `getBoundingClientRect` y de `getComputedStyle`: lo PINTADO, nunca
   lo declarado. Ésa es la lección cara de la casa —`.hidden` decía que sí y
   el botón seguía en pantalla— y por eso aquí no se lee ni un atributo. */
const medir = () => {
  const visible = (el) => {
    if(!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const nombra = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cl = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\s+/g,' ').slice(0,28);
    return `${el.tagName.toLowerCase()}${id}${cl}${txt ? ` «${txt}»` : ''}`;
  };

  const hallazgos = [];
  const apunta = (grave, regla, que, dato) => hallazgos.push({ grave, regla, que, dato });

  /* 0 · la etiqueta de viewport. Va PRIMERO porque sin ella nada de lo de
        abajo significa lo que parece.

        ⚠ Y ES EL DEFECTO MÁS CARO DE TODOS EN TELÉFONO. Sin esta etiqueta el
        teléfono finge una pantalla de ~980px y ENCOGE la página entera para
        que quepa: el resultado es un sitio de escritorio en miniatura, con
        letra ilegible y todo demasiado chico para tocarse. Y de paso se
        disfraza a sí mismo — la ventana medida crece hasta abarcar el
        contenido, así que la regla de «no desborda» NUNCA se dispara. Lo
        descubrí midiendo mi propia página de pruebas: 390px de pantalla
        reportaban `innerWidth: 1200`.

        En el repo no falta en ninguna página; se comprueba de todos modos
        porque cuesta una línea y el día que falte no se va a ver leyendo. */
  const vp = document.querySelector('meta[name="viewport" i]');
  if(!vp)
    apunta('🔴', 'sin-viewport', 'falta <meta name="viewport">',
           'el teléfono va a encoger la página entera, y además tapa la medida de desborde');
  else if(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/i.test(vp.content || ''))
    /* Prohibir el zoom se pone «para que se vea como app». Lo que hace es
       dejar sin leer a quien necesita acercar la letra. */
    apunta('🟡', 'sin-viewport', 'el viewport prohíbe acercar la letra', vp.content);

  /* 1 · nada se sale de lado. Un scroll horizontal en teléfono es EL defecto
        que más rápido se nota y el que peor se ve.

        ⚠ SE COMPARA CONTRA `clientWidth`, NO CONTRA `window.innerWidth`, y la
        diferencia me costó una tarde. En emulación de teléfono `innerWidth`
        devuelve el ancho VISUAL después del encogido —midió 1200 en una
        pantalla de 390— mientras `documentElement.clientWidth` sí devuelve los
        390 de la página. Con `innerWidth`, una caja de 1200px en un teléfono
        de 390 daba «no desborda»: el medidor decía que todo bien sobre el
        defecto más visible que hay. Y en escritorio las dos coinciden, así que
        probando sólo ahí nunca se habría visto. */
  const ventana = document.documentElement.clientWidth;
  const anchoDoc = document.documentElement.scrollWidth;
  if(anchoDoc > ventana + 1)
    apunta('🔴', 'no-desborda', 'la página se puede recorrer de lado',
           `${anchoDoc}px de contenido en ${ventana}px de pantalla`);

  /* Y quién la desborda — pero SÓLO si de verdad desborda.

     ⚠ ESTA LISTA CUELGA DEL 🔴 DE ARRIBA A PROPÓSITO. La primera versión la
     sacaba siempre, y contra el sitio marcó cinco cajas que sobresalían de la
     ventana… con `document.scrollWidth` en 390 exactos, o sea sin un pixel de
     desborde real. Eran tarjetas con `transform: rotate3d` a media animación:
     su caja de medición pisa fuera de la pantalla y la página no se mueve ni
     un milímetro. Un dato correcto contestando una pregunta que nadie hizo.

     La regla que quedó: el síntoma es que la página SE RECORRE DE LADO. Si no
     se recorre, no hay culpable que buscar. */
  if(anchoDoc > ventana + 1){
    const enCarrusel = (el) => {
      for(let a = el.parentElement; a && a !== document.body; a = a.parentElement){
        const o = getComputedStyle(a).overflowX;
        if(o === 'auto' || o === 'scroll') return true;
      }
      return false;
    };
    for(const el of document.querySelectorAll('body *')){
      if(!visible(el) || enCarrusel(el)) continue;
      if(getComputedStyle(el).transform !== 'none') continue;   /* ver arriba */
      const r = el.getBoundingClientRect();
      /* Dos culpables distintos y hacían falta los dos. El que NO cabe —una
         caja con un ancho fijo mayor que la pantalla— es el caso común y se me
         escapaba: el filtro pedía `r.width <= ventana`, o sea sólo veía al que
         cabe pero está empujado. La página de pruebas tiene justo un
         `width:1200px` y el medidor decía «se recorre de lado» sin poder
         señalar a nadie. */
      if(r.width > ventana + 1)
        apunta('🟡', 'no-desborda', `mide ${Math.round(r.width)}px y la pantalla ${ventana}px`, nombra(el));
      else if(r.right > ventana + 1)
        apunta('🟡', 'no-desborda', 'cabe, pero algo lo empuja fuera', nombra(el));
    }
  }

  const tocables = [...document.querySelectorAll(
    'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [tabindex="0"]')];

  for(const el of tocables){
    if(!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);

    /* 2 · el dedo. Se mide la caja PINTADA; un padding que no crece la caja no
          cuenta, porque el dedo tampoco lo siente. */
    if(r.height < 44 || r.width < 44)
      apunta(r.height < 32 || r.width < 32 ? '🔴' : '🟡', 'objetivo-tactil',
             'más chico que el dedo', `${nombra(el)} · ${Math.round(r.width)}×${Math.round(r.height)}`);

    /* 3 · un botón que parte su nombre en dos renglones es un botón que no
          cupo, y en una barra se ve fatal.

          ⚠ SE CUENTAN LOS RENGLONES DE VERDAD, con un `Range` sobre el texto:
          cada rectángulo que devuelve es una línea pintada. La primera versión
          lo adivinaba comparando el alto de la caja contra el interlineado, y
          se equivocaba en las dos direcciones — marcaba «Saltar la intro», que
          cabe en una línea y sólo tiene padding, y habría dejado pasar un
          botón bajito que sí se parte. Adivinar el alto era barato de escribir
          y caro de creer. */
    const texto = (el.textContent||'').trim();
    /* Y tiene que ser un NOMBRE, o sea dos palabras con letras. Un botón de
       dos símbolos —«◉ ◎», el interruptor del sonido del sitio— devuelve dos
       rectángulos porque son dos iconos apilados, no porque se haya partido
       nada. La regla habla de nombres que no caben; los iconos no aplican. */
    const palabras = (texto.match(/[\p{L}\p{N}]+/gu) || []);
    if(el.tagName === 'BUTTON' && palabras.length >= 2 && texto.length < 40){
      /* ⚠ SE CUENTAN BANDAS, NO RECTÁNGULOS. Un botón con icono y etiqueta
         —`<span class="ico">🔔</span><span>Avisos al teléfono</span>`, que es
         como está escrito medio menú de La Sala— devuelve CUATRO rectángulos
         en UN solo renglón: uno por span y otro por su nodo de texto, casi
         encimados. Contarlos decía «cae en 4 renglones» de un botón que no se
         parte. Se agrupan por su posición vertical redondeada, que es lo que
         un renglón es de verdad. */
      let lineas = 1;
      try{
        const g = document.createRange();
        g.selectNodeContents(el);
        const bandas = new Set();
        for(const r of g.getClientRects())
          if(r.height > 0 && r.width > 0) bandas.add(Math.round(r.top / 4));
        lineas = Math.max(1, bandas.size);
      }catch(e){}
      if(lineas > 1)
        apunta('🟡', 'boton-en-dos-renglones', `su nombre cae en ${lineas} renglones`, nombra(el));
    }

    /* 4 · el zoom de Safari. Sólo aplica a lo que se escribe. */
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && parseFloat(s.fontSize) < 16)
      apunta('🟡', 'zoom-de-safari', 'campo con letra menor a 16px',
             `${nombra(el)} · ${s.fontSize}`);
  }

  /* 5 · texto que se sale de su caja. No el que hace scroll a propósito: sólo
        el que se DERRAMA con el desbordamiento oculto, que es el que se lee
        cortado a media palabra. */
  for(const el of document.querySelectorAll('body *')){
    if(!visible(el) || el.children.length) continue;
    const s = getComputedStyle(el);
    if(s.overflow !== 'hidden' && s.overflowY !== 'hidden') continue;
    if(s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none') continue;
    if(el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0)
      apunta('🔴', 'texto-cortado', 'el texto no cabe y se corta',
             `${nombra(el)} · ${el.scrollHeight}px de texto en ${el.clientHeight}px`);
  }

  /* 6 · ids repetidos. Rompen `getElementById`, las etiquetas de formulario y
        los saltos de accesibilidad — y no se ven de ninguna manera. */
  const cuenta = {};
  for(const el of document.querySelectorAll('[id]')) cuenta[el.id] = (cuenta[el.id]||0)+1;
  for(const [id, n] of Object.entries(cuenta))
    if(n > 1) apunta('🔴', 'id-repetido', 'hay dos elementos con el mismo id', `#${id} ×${n}`);

  /* 7 · imágenes sin alternativa. Una imagen decorativa lleva alt vacío A
        PROPÓSITO; lo que se caza es la que no dice nada de ninguna forma. */
  for(const img of document.querySelectorAll('img')){
    if(!visible(img)) continue;
    if(img.getAttribute('alt') === null)
      apunta('🟡', 'imagen-muda', 'imagen sin alt (ni siquiera vacío)',
             (img.currentSrc||img.src||'').split('/').pop().slice(0,40));
  }

  /* 7-ter · el modo del documento. Sin `<!doctype html>` el navegador entra
        en MODO QUIRKS: modelo de caja viejo —el ancho incluye padding y
        borde—, alturas en porcentaje distintas, y un puñado de diferencias más
        que aparecen el día que alguien toca el CSS.

        ⚠ VA EN ROJO AUNQUE LA PÁGINA SE VEA BIEN, y ésa es la clase. Dos
        páginas de la casa —el explorador y la central— llevaban así desde que
        nacieron y se veían perfectas: midiendo antes y después de ponerles el
        doctype no cambió NI UNA medida. O sea que no había síntoma que ver,
        sólo una trampa esperando al siguiente que tocara el CSS. */
  if(document.compatMode !== 'CSS1Compat')
    apunta('🔴', 'modo-quirks', 'falta <!doctype html>: el navegador usa el modelo de caja viejo',
           'puede verse bien HOY y romperse el día que alguien toque el CSS');

  /* 7-bis · el idioma declarado. Sin él, el lector de pantalla pronuncia el
        español con acento inglés y no se entiende nada. Cuesta un atributo.

        ⚠ Y SE MIRA `documentElement.lang`, no la etiqueta `<html>` en el
        archivo: en HTML5 la etiqueta se puede omitir y el navegador la crea
        sola —vacía—. Dos páginas de la casa están así, y buscando `<html` en
        el archivo no aparecen ni como error ni como acierto: no aparecen. */
  if(!document.documentElement.lang)
    apunta('🟡', 'sin-idioma', 'la página no dice en qué idioma está',
           'sin <html lang="es-MX"> el lector de pantalla lo lee en inglés');

  /* 8 · la paleta de la casa. No prohíbe colores: cuenta cuántos hay. Una
        página con veinte colores distintos no tiene paleta, tiene un accidente. */
  const colores = new Set();
  for(const el of document.querySelectorAll('body *')){
    if(!visible(el)) continue;
    const s = getComputedStyle(el);
    for(const c of [s.color, s.backgroundColor])
      if(c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) colores.add(c);
  }

  return {
    hallazgos,
    colores: [...colores],
    ancho: ventana,
    anchoVisual: window.innerWidth,
    anchoDoc,
    tocables: tocables.filter(visible).length,
  };
};

export async function revisar(url, opciones = {}){
  const nav = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const informe = [];
  try{
    for(const a of (opciones.anchos || ANCHOS)){
      const ctx = await nav.newContext(a.movil
        ? { viewport:{width:a.ancho,height:a.alto}, deviceScaleFactor:2,
            isMobile:true, hasTouch:true, locale:'es-MX' }
        : { viewport:{width:a.ancho,height:a.alto}, locale:'es-MX' });
      const p = await ctx.newPage();
      const errores = [];
      p.on('pageerror', e => errores.push(String(e).slice(0,160)));
      await p.goto(url, { waitUntil:'networkidle', timeout: 30_000 });
      /* ⚠ SE ESPERA A LA TIPOGRAFÍA. «Mazi» es más ancha que la de repuesto:
         medir antes de que llegue es medir otra página, y los desbordes que
         Carlos sí ve no aparecen. */
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(400);

      const r = await p.evaluate(medir);
      /* Un error de JavaScript no es un defecto de diseño, pero deja media
         página sin pintar y entonces TODO lo demás que se mida es mentira. Va
         primero y en rojo por eso. */
      for(const e of errores)
        r.hallazgos.unshift({ grave:'🔴', regla:'la-pagina-truena',
                              que:'error de JavaScript', dato:e });
      informe.push({ ...a, ...r });
      await ctx.close();
    }
  } finally { await nav.close(); }
  return { url, informe };
}

function pintar({ url, informe }){
  console.log(`\n══ ${url}`);
  let rojos = 0;
  for(const v of informe){
    console.log(`\n  ── ${v.nombre} · ${v.ancho}px · ${v.tocables} cosas que se tocan`);
    if(!v.hallazgos.length){ console.log('     ✓ sin hallazgos medibles'); }
    /* Se agrupan por regla: veinte botones chicos son UN problema, y una lista
       de veinte renglones hace que se ignoren los otros diecinueve hallazgos. */
    const porRegla = {};
    for(const h of v.hallazgos) (porRegla[h.regla] ||= []).push(h);
    for(const [regla, hs] of Object.entries(porRegla)){
      /* ⚠ SE CUENTAN LOS ROJOS, NO EL GRUPO. La primera versión pintaba el
         grupo entero de rojo si UNO lo era, y luego sumaba todos al total:
         contra Reportes reportó «10 cosas que arreglar» donde había 2 rojas y
         8 amarillas. Un contador inflado hace exactamente el daño contrario al
         que busca — se deja de creer, y con él se dejan de ver las 2 de
         verdad. */
      const rs = hs.filter(h => h.grave === '🔴');
      rojos += rs.length;
      const cabeza = rs.length ? `🔴 ${rs.length}` + (hs.length > rs.length ? ` · 🟡 ${hs.length - rs.length}` : '')
                               : `🟡 ${hs.length}`;
      console.log(`     ${cabeza} · ${regla}`);
      /* Primero las rojas: si sólo se leen cuatro renglones, que sean ésos. */
      for(const h of [...rs, ...hs.filter(h => h.grave !== '🔴')].slice(0,4))
        console.log(`        ${h.grave} ${h.que}: ${h.dato}`);
      if(hs.length > 4) console.log(`        …y ${hs.length - 4} más`);
    }
    const fuera = v.colores.filter(c => {
      const m = c.match(/\d+/g); if(!m) return false;
      const hex = '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('').toUpperCase();
      return !Object.values(PALETA).includes(hex);
    });
    /* Se dice el número y NO se opina. Muchos de los «fuera de paleta» son
       transparencias del mismo violeta, y llamarlos error enseñaría a
       perseguir un cero que no significa nada. El dato útil es si son cinco
       o si son cuarenta. */
    console.log(`     · ${v.colores.length} colores pintados · ${v.colores.length - fuera.length} son exactos de la paleta`);
    if(v.colores.length > 24)
      console.log(`       🟡 son muchos: arriba de ~24 suele ser que no hay paleta, hay accidentes`);
  }
  return rojos;
}

/* ⚠ IGUALDAD DE RUTA COMPLETA, NO `endsWith`. Con `endsWith('revisar.mjs')`
   esto se creía la línea de comandos también cuando lo IMPORTABA
   `pruebas-revisar.mjs` —que termina igual—, así que las pruebas ni
   arrancaban: imprimían el «Uso:» y salían. Ya estaba escrito en el Cerebro
   por `libro.mjs`, con este mismo nombre de archivo, y lo repetí igualito.
   Buscar la neurona cuesta menos que volver a pagarla:
     node cerebro/cerebro.mjs buscar "mis pruebas no corren" */
const esCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if(esCli){
  const urls = process.argv.slice(2);
  if(!urls.length){
    console.error('Uso: node empresa/clases/revisar.mjs <url> [más urls…]');
    process.exit(2);
  }
  let rojos = 0;
  for(const u of urls) rojos += pintar(await revisar(u));
  console.log(rojos ? `\n🔴 ${rojos} cosas que arreglar antes de enseñarlo.`
                    : '\n✓ Nada 🔴. Que es el piso, no el techo: esto no sabe si se ve bien.');
  process.exit(rojos ? 1 : 0);
}
