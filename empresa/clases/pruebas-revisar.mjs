#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   pruebas-revisar.mjs — que el metro mida
   ──────────────────────────────────────────────────────────────────────────
   Un medidor sin pruebas es otra cosa que informa un estado y está en otro, y
   de ésas ya llevamos seis esta semana. Peor todavía: éste va a decidir si
   una página se enseña o no, así que un falso verde suyo se cobra dos veces.

   Se prueba contra DOS páginas y las dos hacen falta:
     · `pruebas/rota.html`   — un defecto de cada regla. Que los encuentre.
     · `pruebas/limpia.html` — bien hecha, con un carrusel legítimo incluido.
       Que se calle. Sin ésta, un medidor que gritara a todo pasaría con honores.

   Hace falta el servidor de la carpeta en el 8124:
     (cd empresa/clases && python3 -m http.server 8124 &)
     node empresa/clases/pruebas-revisar.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { revisar } from './revisar.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8124/pruebas';
let bien = 0, mal = 0;
const ok = (q, c, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + q + (!c && extra ? `\n      ${extra}` : '')); c ? bien++ : mal++; };

const solo = [{ nombre:'teléfono', ancho:390, alto:844, movil:true }];

console.log('\n· La página rota: que los encuentre todos');
const rota = await revisar(`${BASE}/rota.html`, { anchos: solo });
const h = rota.informe[0].hallazgos;
const reglas = new Set(h.map(x => x.regla));
const dice = (r) => ok(`caza «${r}»`, reglas.has(r), `encontró: ${[...reglas].join(', ')}`);

dice('no-desborda');
dice('objetivo-tactil');
dice('texto-cortado');
dice('boton-en-dos-renglones');
/* La otra mitad, y es la que lo hace útil: que NO acuse al que sí cabe. */
ok('un botón de icono+etiqueta en UN renglón no se acusa',
   !h.some(x => x.regla === 'boton-en-dos-renglones' && /ancho-de-sobra/.test(x.dato || '')),
   h.filter(x => x.regla === 'boton-en-dos-renglones').map(x => `${x.que} ${x.dato}`).join(' | '));
dice('zoom-de-safari');
dice('imagen-muda');
dice('id-repetido');

/* El desborde tiene DOS partes y sólo la primera es el síntoma. Si la página
   se recorre de lado, además tiene que decir QUIÉN — si no, el aviso obliga a
   buscar a mano en toda la hoja. */
/* No basta con avisar que la página se recorre de lado: sin el culpable hay
   que buscarlo a mano por toda la hoja, y eso es lo que hace que un aviso se
   ignore. Se comprueba que señale al elemento Y que diga su medida. */
ok('y cuando desborda, señala al culpable con nombre',
   h.some(x => x.regla === 'no-desborda' && /ancha/.test(x.dato || '')),
   h.filter(x => x.regla === 'no-desborda').map(x => `${x.que} → ${x.dato}`).join(' | '));
ok('y dice cuánto mide contra cuánto cabe',
   h.some(x => x.regla === 'no-desborda' && /1200px y la pantalla 390px/.test(x.que)));

ok('el desborde real va en rojo, no en amarillo',
   h.some(x => x.regla === 'no-desborda' && x.grave === '🔴'));

/* ⚠ EL LÍMITE DEL DEDO SE FIJA CON UN CASO JUSTO DEBAJO. Con sólo el botón de
   20px, bajar el mínimo de 44 a 24 dejaba la suite en verde: la mutación
   sobrevivía. El de 40 es el que pincha — pasa de 32, no llega a 44, y sólo
   se reporta si el número es de verdad 44. */
ok('un botón de 40px —que no llega a 44— también se reporta',
   h.some(x => x.regla === 'objetivo-tactil' && /40×40/.test(x.dato || '')),
   h.filter(x => x.regla === 'objetivo-tactil').map(x => x.dato).join(' | '));
ok('y se distingue del de 20px: aquél es 🔴 y éste 🟡',
   h.some(x => /20×20/.test(x.dato||'') && x.grave === '🔴') &&
   h.some(x => /40×40/.test(x.dato||'') && x.grave === '🟡'));

/* ⚠ Y ÉSTA ES LA QUE ESTABA VACÍA. Vivía en la página limpia, que NO desborda
   — y la lista de culpables sólo se arma cuando la página desborda. O sea que
   comprobaba el silencio de un código que ni siquiera corría: quité el filtro
   del carrusel y siguió verde. Aquí sí corre, porque esta página desborda de
   verdad por otro lado. */
ok('en una página que SÍ desborda, el carrusel legítimo no sale de culpable',
   !h.some(x => x.regla === 'no-desborda' && /vagon/.test(x.dato || '')),
   h.filter(x => x.regla === 'no-desborda').map(x => x.dato).join(' | '));

console.log('\n· La etiqueta que se disfraza de que no falta');
{
  const sv = await revisar(`${BASE}/sin-viewport.html`, { anchos: solo });
  const x = sv.informe[0];
  ok('caza que falta <meta name="viewport">',
     x.hallazgos.some(a => a.regla === 'sin-viewport' && a.grave === '🔴'));
  /* ⚠ ÉSTA ES LA LECCIÓN, y no es la de arriba. Sin la etiqueta, el teléfono
     no mide la pantalla que tiene: se inventa una de ~980px y encoge todo para
     que quepa. Así que TODO lo demás que este archivo reporta de esta página
     está medido sobre una pantalla que no existe — el desborde sale, pero
     comparado contra 980 en vez de contra los 390 reales.

     Por eso `sin-viewport` va primero y en rojo: mientras esté, los otros
     números son de otra página. Es la misma enfermedad de siempre —algo que
     informa un estado y está en otro— sólo que aquí el que miente es el
     navegador, y con razón: le pedimos que adivine. */
  ok('la ventana medida NO es la que se pidió: se la inventa',
     x.ancho > 390, `pedí 390 y midió ${x.ancho}`);
  ok('y por eso el desborde se reporta contra la pantalla inventada',
     x.hallazgos.some(a => a.regla === 'no-desborda' && /980/.test(a.dato || '')),
     x.hallazgos.filter(a => a.regla === 'no-desborda').map(a => a.dato).join(' | '));
}

console.log('\n· La página limpia: que SEPA CALLARSE');
const limpia = await revisar(`${BASE}/limpia.html`, { anchos: solo });
const hl = limpia.informe[0].hallazgos;
ok('no inventa ni un hallazgo', hl.length === 0,
   hl.map(x => `${x.regla}: ${x.que} — ${x.dato}`).join('\n      '));

/* Aquí el carrusel sólo comprueba que no invente un desborde donde la página
   entera cabe. La prueba de que NO se culpa al carrusel está arriba, en la
   página que sí desborda — que es donde ese código corre. */
ok('con la página entera cabiendo, no inventa desbordes',
   !hl.some(x => x.regla === 'no-desborda'));

console.log('\n· Y sí está mirando algo');
ok('contó los elementos que se tocan en la limpia',
   limpia.informe[0].tocables >= 3, `contó ${limpia.informe[0].tocables}`);
ok('leyó los colores pintados', limpia.informe[0].colores.length > 0);

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan`);
console.log('\n⚠ Ninguna de éstas prueba que una página se VEA BIEN.');
console.log('  Eso no lo mide una máquina, y por eso las clases no terminan aquí.');
process.exit(mal ? 1 : 0);
