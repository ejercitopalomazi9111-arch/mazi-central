/* ══════════════════════════════════════════════════════════════════════════
   DE DÓNDE SE LEE PARA LAS DIEZ MATERIAS DE NEGOCIO
   ──────────────────────────────────────────────────────────────────────────
   Las materias que puso Carlos en e228: estrategias, marketing, gestión de
   empresas, liderazgo, organización, optimización, desarrollo de negocios,
   innovación, atención al cliente y ventas.

   El criterio es el mismo que en diseño y no es «que sea famosa»: que
   DISCUTA. Una lista de diez consejos no sirve para escribir una neurona,
   porque una neurona necesita la causa y el cómo cazarlo.

   Están mezcladas tres cosas a propósito:
   · el MANUAL — empresas que publican cómo operan de verdad, con el detalle
     que normalmente no sale de dentro (GitLab, Basecamp, Atlassian);
   · la ESCUELA — investigación con método y datos (MIT Sloan, Wharton, HBR);
   · el CAMPO — quien ha visto morir muchas empresas de cerca (Y Combinator)
     y quien estudia cómo se decide mal (Farnam Street).
   Quien sólo lee la escuela repite marcos que no aplican; quien sólo lee el
   campo confunde su anécdota con una ley.

   ⚠ McKinsey NO ESTÁ y no es un olvido: no contesta desde este entorno
   (código 000, ni siquiera un error HTTP). Una fuente que no se pudo abrir no
   se cita «porque seguro sirve».
   ═════════════════════════════════════════════════════════════════════════ */
export const FUENTES = [
  { casa:'gitlab', porque:'El manual de operación más detallado que una empresa haya publicado. Organización, gestión, contratación, remoto y atención al cliente, escritos para usarse y no para lucir.',
    indices:['https://handbook.gitlab.com/sitemap.xml'],
    dentro:'handbook.gitlab.com/' },

  { casa:'basecamp', porque:'Cómo se decide qué construir y qué NO, con la lógica de una empresa que rechaza el crecimiento a toda costa.',
    indices:['https://basecamp.com/shapeup/webbook', 'https://basecamp.com/gettingreal'],
    dentro:'basecamp.com/' },

  /* ⚠ El índice de «plays» del manual de equipo lo arma JavaScript en el
     navegador: por curl llegan DOS enlaces, y los dos son cambios de idioma.
     Lo comprobé antes de darlo por bueno. Los plays tampoco están en el mapa
     del sitio. Lo que sí es HTML plano y sí sirve es su blog de trabajo, que
     está en el mapa de recursos: 2 417 direcciones. */
  { casa:'atlassian', porque:'Trabajo en equipo, reuniones y gestión escritos por quien vende las herramientas y tiene que explicar cómo se usan.',
    indices:['https://www.atlassian.com/sitemaps/resources.xml'],
    dentro:'atlassian.com/blog' },

  { casa:'ycombinator', porque:'Estrategia, ventas y desarrollo de negocio de quien ha visto morir miles de empresas de cerca y publica el patrón.',
    /* Su biblioteca es una aplicación de JavaScript: por curl llegan 15 MB de
       referencias a paquetes y CERO enlaces a artículos. El mapa del sitio de
       la biblioteca sí es XML plano, con 614 direcciones. */
    indices:['https://www.ycombinator.com/library/sitemap.xml'],
    dentro:'ycombinator.com/library' },

  { casa:'sloan', porque:'Investigación con método sobre gestión, innovación y liderazgo. Lo contrario de la anécdota elevada a ley.',
    indices:['https://sloanreview.mit.edu/topic/strategy/',
             'https://sloanreview.mit.edu/topic/leadership/',
             'https://sloanreview.mit.edu/topic/innovation/',
             'https://sloanreview.mit.edu/topic/marketing/',
             'https://sloanreview.mit.edu/sitemap.xml'],
    dentro:'sloanreview.mit.edu/' },

  { casa:'wharton', porque:'Escuela de negocios con acceso abierto: estrategia, marketing y ventas con datos detrás.',
    indices:['https://knowledge.wharton.upenn.edu/sitemap_index.xml'],
    dentro:'knowledge.wharton.upenn.edu/' },

  { casa:'hbr', porque:'El canon de la gestión. Se cita con cuidado: buena parte está tras muro de pago y sólo entra lo que se puede leer.',
    indices:['https://hbr.org/topic/subject/strategy',
             'https://hbr.org/topic/subject/leadership',
             'https://hbr.org/topic/subject/marketing',
             'https://hbr.org/topic/subject/innovation',
             'https://hbr.org/topic/subject/sales'],
    dentro:'hbr.org/' },

  { casa:'farnam', porque:'Cómo se decide mal: sesgos, modelos mentales y el porqué de los errores que se repiten en todas las empresas.',
    indices:['https://fs.blog/blog/', 'https://fs.blog/mental-models/'],
    dentro:'fs.blog/' },

  { casa:'wikipedia', porque:'Los marcos canónicos con su historia y sus críticas: Porter, la matriz BCG, el océano azul, los trabajos por hacer, los OKR. Sirve para no confundir una moda con un marco.',
    indices:['https://en.wikipedia.org/wiki/Strategic_management',
             'https://en.wikipedia.org/wiki/Marketing',
             'https://en.wikipedia.org/wiki/Management',
             'https://en.wikipedia.org/wiki/Leadership',
             'https://en.wikipedia.org/wiki/Innovation',
             'https://en.wikipedia.org/wiki/Sales',
             'https://en.wikipedia.org/wiki/Customer_service',
             'https://en.wikipedia.org/wiki/Business_development'],
    dentro:'en.wikipedia.org/wiki/' },
];

/* Las palabras que hacen que una ruta valga para ESTE encargo. Se buscan en la
   RUTA, no en el texto: la escribió una persona resumiendo de qué va. */
export const TEMAS = [
  'strateg','competit','positioning','moat','advantage','porter','blue-ocean','swot',
  'market','brand','positioning','pricing','price','segment','audience','campaign',
  'growth','acquisition','retention','churn','funnel','conversion',
  'manage','management','process','operations','handbook','policy','remote','async',
  'leader','leadership','manager','one-on-one','feedback','performance','culture',
  'organiz','organisation','team','structure','hiring','onboarding','delegat','meeting',
  'optimi','efficien','productiv','automat','metric','okr','kpi','measure','dashboard',
  'business-development','partnership','bizdev','revenue','pipeline',
  'innovat','product-market','discovery','experiment','prototype','jobs-to-be-done',
  'customer','support','service','success','complaint','nps','satisfaction',
  'sales','selling','negotiat','objection','pitch','deal','crm','prospect',
  'decision','bias','mental-model','risk','incentive','trade-off','tradeoff',
  'shapeup','shape-up','scope','appetite','bet','cycle','planning','roadmap',
  'startup','founder','fundrais','equity','pivot','scale','churn','unit-economics',
];

export const valeLaPena = (u) => {
  const r = u.toLowerCase();
  return TEMAS.some(t => r.includes(t));
};
