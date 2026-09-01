/* ══════════════════════════════════════════════════════════════════════════
   07 · DESARROLLO DE NEGOCIOS · La alianza que cabe en una persona
   ──────────────────────────────────────────────────────────────────────────
   De «Developing Successful Strategic Partnerships With Universities», MIT
   Sloan Management Review, sobre un proyecto de investigación de CUATRO AÑOS
   —observación participante, entrevistas semiestructuradas y talleres— con
   empresas y universidades.

   La distinción que da el artículo y que este instrumento mide es ésta:

   · ENFOQUE AD HOC. La colaboración la establece un investigador o un
     ingeniero concreto para una necesidad concreta, y el socio se escoge por
     la EXPERIENCIA PERSONAL Y LAS REDES de esa persona — no por familiaridad
     entre las dos organizaciones. Sale ágil, y el artículo lo llama «banco de
     trabajo extendido»: sirve para lo inmediato y deja fuera casi todo lo
     demás que esa relación podría dar.
   · ENFOQUE ESTRATÉGICO. La relación es entre organizaciones, con unidades y
     gente dedicada, y se prepara ANTES de empezar.

   Y la causa de fondo del desencuentro, según el artículo: la cultura
   universitaria —autonomía alta, gobierno distribuido— encaja mal con la
   corporativa, y aun cuando el formato está claro suele haber un desajuste
   profundo en las expectativas y las metas.

   ── QUÉ CALCULA ─────────────────────────────────────────────────────────
   Cuánto de la relación se va con una persona si esa persona se va. No es una
   metáfora: se calcula con los contactos, los que conoce alguien más y el
   valor que pasa por ahí.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'desarrollo', n:7, materia:'Desarrollo de negocios',
  nombre:'La alianza que cabe en una persona',
  que:'Mide cuánto de una alianza o un canal se va contigo si te vas — y si lo que tienes es una relación entre organizaciones o el directorio de alguien.',

  intro:`<div class="nota"><b>Cómo se usa.</b> Piensa en UNA relación: un
  socio, un canal, una alianza, una universidad, el que te trae la mitad de
  los tratos. Contesta por cómo es hoy, no por cómo la contarías en una
  presentación.</div>`,

  campos:[
    { grupo:'Los contactos',
      grupoAyuda:'Del otro lado. Personas de carne y hueso, no áreas.',
      id:'contactos', tipo:'numero', etiqueta:'¿A cuántas personas conoces allá?', ejemplo:'p. ej. 4' },
    { grupo:'Los contactos', id:'compartidos', tipo:'numero',
      etiqueta:'De ésas, ¿a cuántas conoce alguien más de tu lado?', ejemplo:'p. ej. 1' },
    { grupo:'Los contactos', id:'valor', tipo:'numero',
      etiqueta:'¿Qué % de lo que trae esta relación pasa por ese trato personal?', ejemplo:'p. ej. 80' },

    { grupo:'Cómo empezó',
      grupoAyuda:'La pregunta que separa el «banco de trabajo extendido» de una alianza.',
      id:'comoSalio', tipo:'escala', hasta:5,
      pies:['por quién conocía a quién','porque las dos empresas lo decidieron'],
      etiqueta:'¿Cómo se escogió a este socio?' },
    { grupo:'Cómo empezó', id:'objetivo', tipo:'escala', hasta:5,
      pies:['no está escrito','escrito y firmado por los dos'],
      etiqueta:'¿Está escrito para qué existe?' },
    { grupo:'Cómo empezó', id:'expectativas', tipo:'escala', hasta:5,
      pies:['nunca lo hablamos','sabemos qué espera cada uno'],
      etiqueta:'¿Se habló de qué espera cada lado?' },

    { grupo:'Cómo se sostiene', id:'dedicado', tipo:'escala', hasta:5,
      pies:['nadie, se atiende cuando se puede','hay alguien cuyo trabajo es esto'],
      etiqueta:'¿Quién la atiende de tu lado?' },
    { grupo:'Cómo se sostiene', id:'revision', tipo:'escala', hasta:5,
      pies:['nunca se revisa','se revisa en fecha fija'],
      etiqueta:'¿Se revisa si sigue valiendo la pena?' },
  ],

  calcular: function(V){
    var n = function(x){ return (x === '' || x === undefined) ? null : Number(x); };
    var c = n(V.contactos), comp = n(V.compartidos), val = n(V.valor);
    if(c === null || comp === null || val === null){
      var p = [c,comp,val].filter(function(x){ return x !== null; }).length;
      return { tono:'', datos:[['Datos', p + ' de 3', '', p*100/3]],
        veredicto:'<p>Faltan los tres números de arriba. Son los que convierten esto en una ' +
                  'cuenta en vez de en una opinión.</p>' };
    }
    if(c <= 0) return { tono:'mal', datos:[['Contactos','0','']],
      veredicto:'<p><span class="cabeza">Cero contactos del otro lado.</span>Eso no es una alianza ' +
                'todavía: es una intención. El primer paso no es medirla, es conocer a alguien.</p>' };
    if(comp > c) return { tono:'aviso', datos:[['Compartidos', comp + ' de ' + c, 'imposible']],
      veredicto:'<p><span class="cabeza">Los compartidos no pueden ser más que los contactos.</span>' +
                'Revisa los dos números de arriba.</p>' };

    var solos    = c - comp;
    var cobertura = comp * 100 / c;                     /* qué % conoce alguien más */
    var expuesto  = Math.max(0, Math.min(100, val)) * (solos / c);

    var datos = [
      ['Contactos', c + '', comp + ' los conoce alguien más'],
      ['Sólo tú', solos + '', Math.round(100 - cobertura) + ' % de la relación'],
      ['Cobertura', Math.round(cobertura) + ' %', 'sobrevive si te vas', cobertura],
      ['Valor expuesto', Math.round(expuesto) + ' %', 'se va contigo', expuesto],
    ];

    var partes = [], tono;

    if(expuesto >= 50){
      tono = 'mal';
      partes.push('<span class="cabeza">La mitad de esta relación se va contigo.</span>' +
        'De ' + c + ' contactos, ' + solos + ' no los conoce nadie más de tu lado, y por ese trato ' +
        'personal pasa el ' + Math.round(val) + ' % de lo que la relación trae. Esto no es una ' +
        'alianza entre dos empresas: es tu directorio con el logo de la empresa encima.');
    } else if(expuesto >= 25){
      tono = 'aviso';
      partes.push('<span class="cabeza">Un cuarto largo se va contigo.</span>' +
        'Alrededor del ' + Math.round(expuesto) + ' % del valor cuelga de contactos que sólo tú ' +
        'tienes. Se arregla presentando gente, que cuesta dos cafés.');
    } else {
      tono = 'bien';
      partes.push('<span class="cabeza">La relación aguanta sin ti.</span>' +
        'El ' + Math.round(cobertura) + ' % de los contactos los conoce alguien más y sólo el ' +
        Math.round(expuesto) + ' % del valor cuelga de tu trato personal. Eso ya es una relación ' +
        'entre organizaciones.');
    }

    if(V.comoSalio && V.comoSalio <= 2){
      partes.push('<b>Y nació ad hoc.</b> Al socio se le escogió por quién conocía a quién, no por ' +
        'una decisión entre las dos organizaciones. El artículo tiene nombre para eso: <b>banco de ' +
        'trabajo extendido</b>. No es un insulto — es ágil y sirve para lo inmediato. Lo que hay ' +
        'que saber es lo que deja fuera: casi todo lo demás que esa relación podría dar, porque ' +
        'nadie lo buscó.');
    }

    if(V.objetivo && V.objetivo <= 2){
      partes.push('<b>Y no está escrito para qué existe.</b> Una alianza sin objetivo escrito no ' +
        'fracasa: se apaga. Nadie puede decir que va mal porque nadie dijo qué era ir bien, y un ' +
        'día deja de haber reuniones y ya.');
    }

    if(V.expectativas && V.expectativas <= 2){
      partes.push('<b>Y nunca se habló de qué espera cada lado.</b> Es la causa que el estudio ' +
        'encontró detrás de la frustración mutua: aun con el formato de colaboración claro, suele ' +
        'haber un desajuste profundo en las expectativas y las metas. Dos organizaciones con ' +
        'culturas distintas —una con autonomía alta y gobierno repartido, la otra jerárquica— ' +
        'no se entienden solas.');
    }

    if(V.dedicado && V.dedicado <= 2 && expuesto >= 25){
      partes.push('<b>Nadie la atiende como trabajo.</b> Se atiende cuando se puede, que en la ' +
        'práctica es cuando ya hay un problema. El paso de ad hoc a estratégico que describe el ' +
        'estudio empieza justo ahí: gente y unidades dedicadas, no buena voluntad repartida.');
    }

    if(V.revision && V.revision <= 2){
      partes.push('<b>Y no se revisa nunca.</b> Una alianza que no se revisa no se cancela: se ' +
        'hereda. Ponle fecha, aunque sea anual, y una pregunta sola: ¿esto sigue dando lo que ' +
        'esperábamos cuando lo escribimos?');
    }

    if(solos > 0){
      partes.push('<b>El movimiento concreto, y es barato:</b> presenta a ' + Math.min(solos, 3) +
        ' de esos ' + solos + ' contactos a alguien más de tu lado este mes. No hace falta ' +
        'cederlos: basta con que exista una segunda cara conocida. Ahí la cobertura sube del ' +
        Math.round(cobertura) + ' % al ' + Math.round((comp + Math.min(solos,3)) * 100 / c) + ' %.');
    }

    partes.push('<b>Y lo que este número NO sabe.</b> No sabe si la relación vale la pena — sólo ' +
      'qué tan frágil es. Una alianza pequeña y muy tuya puede estar perfectamente bien si lo que ' +
      'trae es pequeño. El número duele cuando el porcentaje de valor es alto, y ése lo pusiste tú.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«Developing Successful Strategic Partnerships With Universities»</i>,
  <i>MIT Sloan Management Review</i>, sobre un proyecto de investigación de
  cuatro años —observación participante, entrevistas semiestructuradas y
  talleres— con empresas y universidades.</p>

  <h3>Ad hoc contra estratégico</h3>
  <p>En el <b>enfoque ad hoc</b> la colaboración la establece un investigador o
  un ingeniero concreto para una necesidad concreta, y el socio se escoge por
  su experiencia personal y sus redes: la familiaridad es entre individuos, no
  entre organizaciones. El artículo lo llama <b>«banco de trabajo extendido»</b>
  — pequeño, ágil, y con casi todo el valor potencial de esa relación fuera de
  cuadro.</p>
  <p>En el <b>enfoque estratégico</b> hay unidades y gente dedicada, se elige
  como organización, y las dos partes se preparan <b>antes</b> de empezar.</p>

  <h3>Por qué esto se cuenta con contactos y no con adjetivos</h3>
  <p>Porque «tenemos buena relación» siempre es verdad. Contar cuántas
  personas conoces allá y a cuántas de ésas conoce alguien más de tu lado
  convierte una impresión en un número que se puede mover — y el movimiento
  que lo mueve cuesta dos cafés.</p>

  <h3>Lo que no mide</h3>
  <p>No sabe si la alianza vale la pena, sólo qué tan frágil es. No sabe si tu
  contraparte tiene el mismo problema del otro lado (casi siempre lo tiene). Y
  el porcentaje de valor lo estimaste tú: si ése está mal, todo lo demás está
  mal — por eso conviene ponerlo bajo y no alto.</p>`
};
