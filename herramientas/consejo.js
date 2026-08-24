/* ══════════════════════════════════════════════════════════════════════════
   EL CENSO · quién es quién en las actas
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «haz que las auditorías me las dé en pdf con formato digital e
   imágenes/iconos de qué personaje habla para que se me haga menos pesado
   leerlos».

   Esto es la mitad que importa de eso: la lista de quién es quién, con su
   área y su color. Sin esto, un acta de 24 personas es un muro de negritas y
   hay que ir contando para saber quién está hablando.

   Los nombres salen de `.claude/skills/consejo-tecnico/reference/equipo.md` y
   de `.claude/skills/four-judges/reference/prompts.md`. Si entra alguien
   nuevo a la casa, se agrega AQUÍ y en ningún otro lado.

   `alias` existe porque en las actas la gente se llama de las dos formas:
   la primera vez «Verónica Alcázar» y después «Verónica», que es como se
   habla de verdad en una junta. El acta tiene que reconocer las dos.
   ═════════════════════════════════════════════════════════════════════════ */

/* Las áreas, con su color. Los colores están MEDIDOS contra el papel del
   acta (#FBF8F3): todos pasan 4.5:1, que es lo que hace falta para leer un
   nombre de 11 pt. Un color bonito que no se lee no sirve de nada. */
const AREAS = {
  direccion: { nombre:'Dirección',            color:'#7C1D24', icono:'mazo'     },
  arqui:     { nombre:'Arquitectura y código',color:'#1E5083', icono:'planos'   },
  seguridad: { nombre:'Ciberseguridad',       color:'#5A3A8C', icono:'escudo'   },
  oficio:    { nombre:'Oficio y operación',   color:'#8A5A16', icono:'llave'    },
  diseno:    { nombre:'Diseño gráfico',       color:'#8C2D18', icono:'paleta'   },
  front:     { nombre:'Front end',            color:'#2E6B45', icono:'ventana'  },
  mascota:   { nombre:'Las mascotas',         color:'#4A4E69', icono:'pata'     },
  consejo:   { nombre:'El consejo de la idea',color:'#123A5E', icono:'balanza'  },
};

/* Los 24 de la sala de máquinas, más el gato y el perro. */
const GENTE = [
  /* ── Dirección ── */
  { id:'ismael',  nombre:'Ismael Rentería',  alias:['Ismael'],
    cargo:'Director de Ingeniería', area:'direccion' },
  { id:'nadia',   nombre:'Nadia Berrones',   alias:['Nadia'],
    cargo:'Jueza Técnica', area:'direccion', manda:true },

  /* ── Arquitectura y código ── */
  { id:'veronica',nombre:'Verónica Alcázar', alias:['Verónica'],
    cargo:'Arquitecta · jefa de área', area:'arqui', manda:true },
  { id:'beto',    nombre:'Beto Nájera',      alias:['Beto'],
    cargo:'Back end y datos', area:'arqui' },
  { id:'kenji',   nombre:'Kenji Mora',       alias:['Kenji'],
    cargo:'Datos a escala', area:'arqui' },
  { id:'lucia',   nombre:'Lucía Prado',      alias:['Lucía'],
    cargo:'Plataforma', area:'arqui' },

  /* ── Ciberseguridad ── */
  { id:'damian',  nombre:'Damián Ocaña',     alias:['Damián'],
    cargo:'Jefe de Seguridad · sombrero blanco', area:'seguridad', manda:true },
  /* Los dos sombreros negros llevan apodo, y en las actas se les nombra por el
     apodo casi siempre. Los dos nombres tienen que reconocerse. */
  { id:'cuervo',  nombre:'"Cuervo" Saldaña', alias:['Cuervo','Rubén Saldaña','Rubén'],
    cargo:'Sombrero negro · entra a ciegas', area:'seguridad', sombrero:'negro' },
  { id:'ak',      nombre:'AK Villalpando',   alias:['AK','Ana Karina Villalpando','Ana Karina'],
    cargo:'Sombrero negro · con los planos', area:'seguridad', sombrero:'negro' },
  { id:'emilio',  nombre:'Emilio Cantú',     alias:['Emilio'],
    cargo:'Sesiones, permisos y validación', area:'seguridad' },
  { id:'paola',   nombre:'Paola Urquiza',    alias:['Paola'],
    cargo:'Datos y privacidad · los menores', area:'seguridad' },
  { id:'tadeo',   nombre:'Tadeo Riquelme',   alias:['Tadeo'],
    cargo:'Respuesta a incidentes', area:'seguridad' },

  /* ── Oficio y operación ── */
  { id:'chuy',    nombre:'Chuy Barrera',     alias:['Chuy'],
    cargo:'Jefe de Guardia · SRE', area:'oficio', manda:true },
  { id:'nayeli',  nombre:'Nayeli Cordero',   alias:['Nayeli'],
    cargo:'Estimaciones y riesgo de obra', area:'oficio' },
  { id:'fito',    nombre:'Fito Menchaca',    alias:['Fito'],
    cargo:'Oficial de refactor', area:'oficio' },
  { id:'saul',    nombre:'Saúl Zepeda',      alias:['Saúl'],
    cargo:'Rendimiento · el que mide', area:'oficio' },

  /* ── Diseño gráfico ── */
  { id:'renee',   nombre:'Renée Ibarra',     alias:['Renée'],
    cargo:'Directora de Arte · jefa de área', area:'diseno', manda:true },
  { id:'mateo',   nombre:'Mateo Quiroz',     alias:['Mateo'],
    cargo:'Marca, logo y tipografía', area:'diseno' },
  { id:'sol',     nombre:'Sol Aguirre',      alias:['Sol'],
    cargo:'Ilustración y composición', area:'diseno' },
  { id:'bruno',   nombre:'Bruno Tapia',      alias:['Bruno'],
    cargo:'Producción y formatos', area:'diseno' },

  /* ── Front end ── */
  { id:'ximena',  nombre:'Ximena Ríos',      alias:['Ximena'],
    cargo:'Jefa de Front End', area:'front', manda:true },
  { id:'iker',    nombre:'Iker Salgado',     alias:['Iker'],
    cargo:'Movimiento e interacción', area:'front' },
  { id:'pilar',   nombre:'Pilar Ontiveros',  alias:['Pilar'],
    cargo:'Accesibilidad y tacto', area:'front' },
  { id:'gonzalo', nombre:'Gonzalo Vera',     alias:['Gonzalo'],
    cargo:'Maquetado y responsivo', area:'front' },

  /* ── Las mascotas, que van al final y no son adorno ── */
  { id:'michi',   nombre:'Michi',            alias:['MICHI','Michi el gato'],
    cargo:'Jefe de Caos · hace lo que nadie planeó', area:'mascota', bicho:'gato' },
  { id:'rocco',   nombre:'Rocco',            alias:['ROCCO','Rocco el perro'],
    cargo:'Jefe de Traer Pruebas · no cree nada sin captura', area:'mascota', bicho:'perro' },

  /* ── Los cuatro jueces que rostizan una idea (otra skill, otras actas) ── */
  { id:'creyente',     nombre:'El Creyente',      alias:['Creyente','EL CREYENTE'],
    cargo:'El argumento más fuerte A FAVOR', area:'consejo' },
  { id:'esceptico',    nombre:'El Escéptico',     alias:['Escéptico','EL ESCÉPTICO'],
    cargo:'Mata la idea si merece morir', area:'consejo' },
  { id:'inversionista',nombre:'El Inversionista', alias:['Inversionista','EL INVERSIONISTA'],
    cargo:'¿Aparece dinero real, y cuándo?', area:'consejo' },
  { id:'juez',         nombre:'El Juez',          alias:['Juez','EL JUEZ'],
    cargo:'Un veredicto, sin quedarse en la valla', area:'consejo' },
];

/* Los niveles de gravedad, para pintarlos como etiqueta y no como emoji
   suelto perdido en un párrafo. */
const NIVELES = [
  { emoji:'🔴', id:'sangra',  nombre:'Sangra',    color:'#8C1C1C', que:'No se publica' },
  { emoji:'🟠', id:'duele',   nombre:'Duele',     color:'#A8541A', que:'Esta semana' },
  { emoji:'🟡', id:'estorba', nombre:'Estorba',   color:'#8A6516', que:'Al apunte' },
  { emoji:'⚪', id:'acepta',  nombre:'Se acepta', color:'#4A4E69', que:'Por escrito' },
];

/* Los veredictos que puede dictar la casa. */
const VEREDICTOS = [
  { busca:/NO SE ENV[IÍ]A/i,   nombre:'NO SE ENVÍA',      color:'#8C1C1C' },
  { busca:/ARREGLAR PRIMERO/i, nombre:'ARREGLAR PRIMERO', color:'#A8541A' },
  { busca:/\bENVIAR\b/,        nombre:'ENVIAR',           color:'#2E6B45' },
  { busca:/\bCONSTRUIR\b/,     nombre:'CONSTRUIR',        color:'#2E6B45' },
  { busca:/\bMATAR\b/,         nombre:'MATAR',            color:'#8C1C1C' },
];

/* Busca a alguien por como lo nombraron en el acta. Devuelve `null` si no es
   de la casa — y eso NO se inventa: un nombre que no está en el censo se
   pinta sin avatar y la prueba lo reporta, porque casi siempre significa que
   se me fue alguien de la lista, no que el acta esté mal. */
function quienEs(comoLoLlamaron){
  /* Las comillas se quitan de LOS DOS LADOS y no sólo de las puntas. Los dos
     sombreros negros llevan apodo entrecomillado —«"Cuervo" Saldaña»— y
     limpiar sólo las puntas dejaba una comilla a media cadena que hacía que
     no se reconociera. */
  const normal = (t) => String(t || '')
    .replace(/["“”]/g, '')
    .replace(/[\s:·]+$/g, '')
    .replace(/^[\s·]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const limpio = normal(comoLoLlamaron);
  if(!limpio) return null;
  const igual = (a, b) => normal(a).localeCompare(normal(b), 'es', { sensitivity:'base' }) === 0;
  for(const p of GENTE){
    if(igual(p.nombre, limpio)) return p;
    if((p.alias || []).some(a => igual(a, limpio))) return p;
  }
  /* «Verónica Alcázar» en el acta contra «Verónica» en el censo, y al revés:
     se compara sólo el primer nombre antes de rendirse.

     ⚠️ Los artículos NO cuentan como nombre. Sin esto, «El Creyente» se
     quedaba con cualquier renglón que empezara con «El »: en el acta de
     Fadori se coló al reparto porque un «**El veredicto:**» daba primero =
     «El» y eso casaba. Un artículo no identifica a nadie. */
  const ARTICULOS = /^(el|la|los|las|un|una|de|del)$/i;
  const palabras = limpio.split(' ').filter(w => !ARTICULOS.test(w));
  const primero = palabras[0];
  /* Y un nombre de una sola letra tampoco identifica: pediría dos. */
  if(!primero || primero.length < 2) return null;
  for(const p of GENTE){
    const suyo = p.nombre.split(' ').filter(w => !ARTICULOS.test(w))[0];
    if(suyo && igual(suyo, primero)) return p;
    for(const a of (p.alias || [])){
      const ap = a.split(' ').filter(w => !ARTICULOS.test(w))[0];
      if(ap && ap.length >= 2 && igual(ap, primero)) return p;
    }
  }
  return null;
}

const areaDe = (persona) => AREAS[persona && persona.area] || null;

if(typeof module !== 'undefined') module.exports = { AREAS, GENTE, NIVELES, VEREDICTOS, quienEs, areaDe };
