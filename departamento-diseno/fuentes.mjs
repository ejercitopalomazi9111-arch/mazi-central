/* ══════════════════════════════════════════════════════════════════════════
   DE DÓNDE SE LEE, Y POR QUÉ CADA UNA
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «no te bases en una sola web sino mínimo en 200 artículos que
   valgan la pena». Lo que hace que una fuente valga la pena aquí no es que
   sea famosa: es que DISCUTA, que enseñe el porqué y no sólo la receta. Un
   blog que dice «usa esta sombra» no sirve para escribir una neurona, porque
   una neurona necesita la causa.

   Por eso están mezcladas a propósito tres cosas que no se llevan bien:
   · la NORMA (W3C, WCAG) — lo que hay que cumplir, con su letra;
   · el MOTOR (MDN, web.dev, Chrome) — lo que el navegador de verdad hace;
   · el OFICIO (Smashing, CSS-Tricks, A List Apart, NN/g, Practical
     Typography) — lo que se aprende peleándose con clientes reales.
   Quien sólo lee la norma hace cosas correctas y feas; quien sólo lee el
   oficio hace cosas bonitas que se rompen. ═══════════════════════════════ */
export const FUENTES = [
  { casa:'mdn', porque:'La referencia del motor: qué hace el navegador de verdad, no lo que uno cree.',
    indices:[
      'https://developer.mozilla.org/en-US/docs/Web/CSS/Reference',
      'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors',
      'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations',
      'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout',
      'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout',
      'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_filter_effects',
      'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap',
      'https://developer.mozilla.org/en-US/docs/Web/Accessibility',
    ],
    dentro:'developer.mozilla.org/en-US/docs/Web' },

  { casa:'web.dev', porque:'Rendimiento y patrones medidos por quien escribe el navegador.',
    indices:[
      'https://web.dev/sitemap.xml',
      'https://web.dev/learn/css',
      'https://web.dev/learn/design',
      'https://web.dev/learn/accessibility',
    ],
    dentro:'web.dev/' },

  { casa:'smashing', porque:'Oficio con casos reales; discute el porqué y no sólo la receta.',
    /* ⚠ SUS PÁGINAS DE CATEGORÍA NO SIRVEN PARA ESTO: la lista de artículos la
       arma JavaScript en el navegador, así que el HTML que llega por curl no
       tiene ni un enlace a un artículo. Lo comprobé antes de darlo por bueno
       —la primera cosecha trajo CERO de aquí y parecía que la fuente estaba
       caída—. El mapa del sitio sí es HTML plano. */
    indices:[ 'https://www.smashingmagazine.com/sitemap.xml' ],
    dentro:'smashingmagazine.com/20' },

  { casa:'css-tricks', porque:'El detalle raro de CSS que nadie documenta hasta que muerde.',
    indices:[
      /* El de css-tricks es un mapa DE MAPAS: hay que dar un salto más, y de
         eso se encarga `cosechar.mjs` siguiendo los `<loc>` que apuntan a
         otro sitemap. */
      'https://css-tricks.com/sitemap_index.xml',
      'https://css-tricks.com/almanac/',
    ],
    dentro:'css-tricks.com/' },

  { casa:'alistapart', porque:'La tradición del oficio: por qué la web se diseña así y no de otra forma.',
    /* Aquí pasa lo mismo y se resuelve distinto: es WordPress, así que su
       propia API contesta la lista sin JavaScript de por medio. */
    indices:[
      'https://alistapart.com/wp-json/wp/v2/posts?per_page=100&_fields=link',
      'https://alistapart.com/wp-json/wp/v2/posts?per_page=100&offset=100&_fields=link',
      'https://alistapart.com/wp-json/wp/v2/posts?per_page=100&offset=200&_fields=link',
    ],
    dentro:'alistapart.com/' },

  { casa:'nngroup', porque:'Investigación con personas de verdad, no opinión de diseñador.',
    /* Su índice también se arma en el navegador: por HTML salían once
       artículos de los cientos que tienen. El mapa del sitio los trae todos. */
    indices:[ 'https://www.nngroup.com/sitemap.xml' ],
    dentro:'nngroup.com/articles/' },

  { casa:'w3c', porque:'La norma con su letra: lo que hay que cumplir, no lo que se comenta que hay que cumplir.',
    indices:[
      'https://www.w3.org/TR/WCAG22/',
      'https://www.w3.org/WAI/WCAG22/Understanding/',
      'https://www.w3.org/WAI/tutorials/',
    ],
    dentro:'w3.org/' },

  { casa:'practicaltypography', porque:'Tipografía con criterio y sin misticismo; dice qué hacer y qué no.',
    indices:[ 'https://practicaltypography.com/' ],
    dentro:'practicaltypography.com/' },
];
