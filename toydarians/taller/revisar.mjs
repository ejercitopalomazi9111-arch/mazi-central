// Compuerta: mide el DOM renderizado, no el CSS. Las tres cosas que este
// diseno puede romper sin que se note: desborde horizontal (los hijos de grid
// no bajan de min-content), mas de un h1, y que sin JS quede algo escondido.
/* ⚠ ESTA RUTA ESTABA MAL Y LA COMPUERTA NUNCA CORRIÓ EN ESTE REPO.
   Apuntaba a `<repo>/node_modules/playwright`, que aquí no existe: en este
   contenedor Playwright vive en /opt. Reventaba con ERR_MODULE_NOT_FOUND antes
   de la primera comprobación, así que el revisor que mide desborde, contraste
   y h1 daba CERO cobertura mientras parecía existir.

   Una compuerta que no corre es peor que ninguna: da la confianza sin dar la
   comprobación. Es el mismo defecto que perseguimos todo el tiempo — algo que
   informa un estado y está en otro.

   Se prueba en un renglón: `node toydarians/taller/revisar.mjs` tiene que
   imprimir resultados, no una traza. */
const RUTA_PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pw = await import(RUTA_PW);
const chromium = pw.chromium ?? pw.default.chromium;   // playwright es CommonJS
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
// acepta un archivo por argumento: el sitio y el boceto pasan por la misma
// compuerta, que para eso se escribio.
/* ⚠ EL DEFAULT ERA UNA RUTA ABSOLUTA DE OTRA MÁQUINA: `/home/user/toydarians/
   sitio.html`, que se sale de este repo. Aunque el import de Playwright ya
   estuviera bien, la compuerta seguía muerta un renglón más abajo.

   Ahora se calcula desde el propio archivo, así que corre desde donde sea:
   `node toydarians/taller/revisar.mjs` o `cd toydarians/taller && node
   revisar.mjs` dan lo mismo. Y mide `index.html` —EL QUE SE PUBLICA— y no el
   intermedio, porque medir lo que no se sirve es el defecto que arreglamos hoy
   en el generador. Se puede pasar otro archivo por argumento. */
const AQUI = new URL('.', import.meta.url).pathname;
const archivo = process.argv[2] || AQUI + '../index.html';
const url = 'file://' + archivo;
console.log('midiendo', archivo);
let malo = 0;

for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
  for (const js of [true, false]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: js });
    const pg = await ctx.newPage();
    // Un script muerto no cambia ni el alto ni el contraste: la compuerta daba
    // verde con el titular sin destapar. Los errores de pagina se miran.
    const fallos = [];
    pg.on('pageerror', (e) => fallos.push('pageerror: ' + e.message));
    // Este entorno no alcanza los servidores de tipografia de Google, asi que
    // ese fallo de red es del sandbox y no de la pagina. Cualquier OTRO recurso
    // que no cargue si es un defecto y tiene que reprobar.
    pg.on('requestfailed', (q) => {
      const u = q.url();
      if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return;
      fallos.push('no cargó: ' + u.slice(0, 80));
    });
    await pg.goto(url, { waitUntil: 'load' });
    await pg.waitForTimeout(js ? 900 : 300);

    const r = await pg.evaluate(() => {
      const de = document.documentElement;
      const desborde = de.scrollWidth - de.clientWidth;
      const culpables = [];
      if (desborde > 1) {
        for (const n of document.querySelectorAll('body *')) {
          const b = n.getBoundingClientRect();
          if (b.right > de.clientWidth + 1 && b.width > 4 &&
              !n.closest('.banda') && getComputedStyle(n).position !== 'fixed')
            culpables.push(n.tagName + '.' + (n.className || '?') + ' → ' + Math.round(b.right));
        }
      }
      // nada legible puede quedar invisible ni fuera de sitio
      const ocultos = [...document.querySelectorAll('h1,h2,h3,p,.reng,.celda')].filter(n => {
        const s = getComputedStyle(n), b = n.getBoundingClientRect();
        return (parseFloat(s.opacity) < .5 || s.visibility === 'hidden') && b.height > 0;
      }).length;
      // El titular se destapa con mascara, asi que .fila lleva overflow:hidden
      // y eso corta en HORIZONTAL tambien. Si la tipografia de Google no carga
      // cae a una mas ancha y el titular se decapita sin avisar. Se mide.
      const cortados = [];
      for (const f of document.querySelectorAll('h1 .fila')) {
        const t = f.firstElementChild;
        if (t && t.scrollWidth > f.clientWidth + 1)
          cortados.push(t.textContent.trim() + ' ' + t.scrollWidth + '>' + f.clientWidth);
      }
      // Contraste real del DOM pintado. Es lo unico que puede reprobar de
      // verdad: ningun typecheck ni build ve un texto que no se lee.
      const lum = (c) => {
        const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
        return .2126 * v[0] + .7152 * v[1] + .0722 * v[2];
      };
      const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      // Sube buscando el primer fondo opaco. Si por el camino hay un degradado
      // SIN color solido debajo, el texto se apoya en algo inmedible: se marca.
      const sinSuelo = [];
      const fondoDe = (n) => {
        for (let e = n; e; e = e.parentElement) {
          const st = getComputedStyle(e), c = st.backgroundColor, p = rgb(c);
          const a = (c.match(/[\d.]+/g) || [])[3];
          const opaco = p.length === 3 && (a === undefined || +a > .95);
          if (!opaco && st.backgroundImage.includes('gradient')) sinSuelo.push(e.className || e.tagName);
          if (opaco) return p;
        }
        return [0, 0, 0];
      };
      // Un contenedor de consulta dentro de una pista ajustada al contenido
      // colapsa a cero y el texto sale a una palabra por renglon. Dos veces me
      // paso y las dos la compuerta dio verde: se mide.
      const aplastados = [];
      for (const n of document.querySelectorAll('*')) {
        const t = (n.innerText || '').trim();
        if (t.length < 24) continue;
        const b = n.getBoundingClientRect();
        if (b.height > 0 && b.width > 0 && b.width < 90 && b.height > b.width * 2.2)
          aplastados.push((n.className || n.tagName) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
      }
      // Todas las tarjetas salieron con el LOGO en vez de la figura porque el
      // raspado se trajo la imagen de la cabecera de primera. La señal es que
      // muchas fichas comparten la misma imagen: eso se mide.
      const repes = [];
      const cuenta = {};
      for (const im of document.querySelectorAll('.rejilla img, .g-cats img')) {
        const k = (im.currentSrc || im.src || '').split('/').pop();
        if (k) cuenta[k] = (cuenta[k] || 0) + 1;
      }
      const totalFichas = document.querySelectorAll('.rejilla .pieza').length;
      for (const [k, c] of Object.entries(cuenta))
        if (c > 3 && c > totalFichas * 0.25) repes.push(k + ' ×' + c);

      const flojos = [];
      for (const n of document.querySelectorAll('p,span,a,li,h1,h2,h3,b,i,small,div')) {
        const t = [...n.childNodes].filter(x => x.nodeType === 3 && x.textContent.trim()).map(x => x.textContent.trim()).join(' ');
        if (!t) continue;
        const st = getComputedStyle(n);
        if (st.visibility === 'hidden' || +st.opacity < .5 || !n.getBoundingClientRect().height) continue;
        const px = parseFloat(st.fontSize), grueso = st.fontWeight >= 700;
        const grande = px >= 24 || (px >= 18.66 && grueso);
        const L1 = lum(rgb(st.color)), L2 = lum(fondoDe(n));
        const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
        const pide = grande ? 3 : 4.5;
        if (ratio < pide) flojos.push(t.slice(0, 26) + ' ' + ratio.toFixed(2) + '<' + pide);
      }
      return { desborde, culpables: culpables.slice(0, 5), cortados, repes: repes.slice(0, 3),
               aplastados: [...new Set(aplastados)].slice(0, 4),
               flojos: flojos.slice(0, 6), sinSuelo: [...new Set(sinSuelo)].slice(0, 4),
               h1: document.querySelectorAll('h1').length, ocultos,
               alto: Math.round(de.scrollHeight) };
    });

    const mal = fallos.length > 0 || r.desborde > 1 || r.h1 !== 1 || r.ocultos > 0 || r.cortados.length > 0 || r.flojos.length > 0 || r.sinSuelo.length > 0 || r.aplastados.length > 0 || r.repes.length > 0;
    if (mal) malo++;
    console.log(`${w}px js=${js ? 'sí' : 'no '}  desborde ${r.desborde}px  h1 ${r.h1}  ocultos ${r.ocultos}  cortados ${r.cortados.length}  contraste ${r.flojos.length}  sin-suelo ${r.sinSuelo.length}  errores ${fallos.length}  aplastados ${r.aplastados.length}  repetidas ${r.repes.length}  alto ${r.alto}px ${mal ? '  ← MAL' : ''}`);
    r.culpables.forEach(c => console.log('      desborda ' + c));
    r.cortados.forEach(c => console.log('      corta    ' + c));
    r.flojos.forEach(c => console.log('      flojo    ' + c));
    r.aplastados.forEach(c => console.log('      aplastado ' + c));
    r.repes.forEach(c => console.log('      misma imagen en muchas fichas: ' + c));
    r.sinSuelo.forEach(c => console.log('      degradado sin color sólido: ' + c));
    [...new Set(fallos)].slice(0, 3).forEach(c => console.log('      ' + c));
    if (js && (w === 1440 || w === 390)) {
      await pg.evaluate(async () => {              // despierta lo diferido
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          scrollTo(0, y); await new Promise(r => setTimeout(r, 60));
        }
        scrollTo(0, 0);
      });
      await pg.waitForTimeout(700);
      const mote = archivo.includes('boceto') ? 'boc' : 'vista';
      await pg.screenshot({ path: `/tmp/toyimg/${mote}-${w === 1440 ? 'esc' : 'tel'}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
await nav.close();
console.log(malo ? `\n${malo} combinaciones mal` : '\nlimpio');
process.exit(malo ? 1 : 0);
