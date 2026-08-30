/* ══════════════════════════════════════════════════════════════════════════
   01 · ESTRATEGIAS · El protocolo de evaluaciones mediadoras
   ──────────────────────────────────────────────────────────────────────────
   No es un cuestionario de autoayuda: es el MAP (Mediating Assessments
   Protocol) de Kahneman, Lovallo y Sibony, «A Structured Approach to
   Strategic Decisions», MIT Sloan Management Review, primavera de 2019.

   La idea del original, en una línea: una decisión estratégica es un juicio
   evaluativo, y los juicios evaluativos fallan de dos maneras distintas — por
   SESGO, que empuja a todos hacia el mismo lado, y por RUIDO, que es error
   aleatorio entre evaluadores. La entrevista de trabajo no estructurada es el
   caso mejor estudiado, y el remedio que funciona allí es el mismo aquí:
   descomponer el juicio en varias evaluaciones independientes, puntuarlas por
   separado, y dejar la nota global PARA EL FINAL.

   ── LO QUE ESTE INSTRUMENTO SÍ MIDE ────────────────────────────────────
   · La DISPERSIÓN de las seis notas. Si las seis salen casi iguales, no hubo
     seis juicios: hubo una impresión global copiada seis veces. Es el efecto
     halo, y aquí tiene número.
   · La DISTANCIA entre la media de las seis y la nota global. Cuando la
     global va muy por encima, la intuición está pasando por encima de lo que
     dicen las partes.
   · El CIERRE PREMATURO: si ya había opinión antes de puntuar, lo que sigue
     es documentación, no análisis.

   ── LO QUE NO MIDE, Y HAY QUE DECIRLO ──────────────────────────────────
   No dice si la decisión es buena. No sabe nada del mercado, del dinero ni de
   la gente. Mide la CALIDAD DEL PROCESO con el que se está juzgando — que es
   otra cosa, y es la única que se puede medir desde fuera. Un proceso limpio
   puede llegar a una conclusión equivocada, y un proceso sucio puede acertar
   por suerte. Lo que dice la investigación es que a la larga el proceso gana.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'estrategia', n:1, materia:'Estrategias',
  nombre:'El protocolo de evaluaciones mediadoras',
  que:'Mide cómo estás juzgando una decisión estratégica: si las seis notas son seis juicios o una impresión repetida, y si la conclusión llegó antes que el análisis.',

  intro:`<div class="nota"><b>Cómo se usa, y el orden importa.</b> Puntúa las
  seis evaluaciones <b>de arriba abajo y sin volver atrás</b>. No mires la
  siguiente hasta cerrar la anterior, y deja la nota global para el final —
  ponerla antes contamina todo lo demás, que es justo lo que esto mide.
  Si sois varios, cada uno puntúa por separado y os comparáis al terminar:
  la distancia entre dos personas es lo que la investigación llama
  <b>ruido</b>, y no se ve de ninguna otra manera.</div>`,

  campos:[
    { grupo:'La decisión', grupoAyuda:'Una sola, concreta y con fecha. «Mejorar el negocio» no se puede evaluar.',
      id:'que', tipo:'texto', etiqueta:'¿Qué se está decidiendo?',
      ejemplo:'Abrir la segunda sucursal en Querétaro antes de marzo' },

    { grupo:'Las seis evaluaciones', grupoAyuda:'Una a una, sin mirar las siguientes. 1 = muy flojo · 5 = muy sólido.',
      id:'e1', tipo:'escala', hasta:5, pies:['sin probar','probado'],
      etiqueta:'1 · El problema que esto resuelve, ¿está comprobado fuera de nuestra cabeza?' },
    { grupo:'Las seis evaluaciones', id:'e2', tipo:'escala', hasta:5, pies:['copiable ya','difícil de copiar'],
      etiqueta:'2 · La ventaja que nos da, ¿sobrevive a que el competidor la vea?' },
    { grupo:'Las seis evaluaciones', id:'e3', tipo:'escala', hasta:5, pies:['sólo en el mejor caso','sale en el caso malo'],
      etiqueta:'3 · Los números, ¿salen sin suponer el mejor escenario?' },
    { grupo:'Las seis evaluaciones', id:'e4', tipo:'escala', hasta:5, pies:['hay que crearla','ya la tenemos'],
      etiqueta:'4 · La capacidad de ejecutarlo, ¿ya existe en la casa?' },
    { grupo:'Las seis evaluaciones', id:'e5', tipo:'escala', hasta:5, pies:['irreversible','se deshace fácil'],
      etiqueta:'5 · Si sale mal, ¿cuánto cuesta volver atrás?' },
    { grupo:'Las seis evaluaciones', id:'e6', tipo:'escala', hasta:5, pies:['no se comparó','se comparó en serio'],
      etiqueta:'6 · No hacer nada, ¿se comparó de verdad como opción?' },

    { grupo:'Al final, y sólo al final',
      grupoAyuda:'Estas dos se contestan cuando las seis de arriba ya están puestas.',
      id:'global', tipo:'escala', hasta:5, pies:['no lo haría','lo haría ya'],
      etiqueta:'Nota global: ¿lo harías?' },
    { grupo:'Al final, y sólo al final', id:'antes', tipo:'escala', hasta:5,
      pies:['no tenía opinión','ya estaba decidido'],
      etiqueta:'Sinceramente: ¿cuánta opinión tenías antes de empezar a puntuar?' },
  ],

  calcular: function(V){
    var notas = ['e1','e2','e3','e4','e5','e6'].map(function(k){ return V[k]; })
                  .filter(function(x){ return x > 0; });
    if(notas.length < 6) return { tono:'',
      datos:[['Evaluaciones puestas', notas.length + ' de 6', '', notas.length*100/6]],
      veredicto:'<p>Faltan evaluaciones. La lectura sale con las seis, no antes — ' +
                'y el orden importa: de arriba abajo, sin volver atrás.</p>' };

    var suma = notas.reduce(function(a,b){ return a+b; }, 0);
    var media = suma / 6;
    var varianza = notas.reduce(function(a,b){ return a + (b-media)*(b-media); }, 0) / 6;
    var desv = Math.sqrt(varianza);

    var global = V.global, antes = V.antes;
    var datos = [
      ['Media de las seis', media.toFixed(2), 'de 5', media*20],
      ['Dispersión entre ellas', desv.toFixed(2), 'de desviación', Math.min(100, desv*66)],
    ];
    var partes = [], tono = 'bien';

    /* ⚠ EL UMBRAL NO ES UN NÚMERO REDONDO ELEGIDO A OJO. En una escala de 1 a
       5, seis juicios de verdad independientes sobre el mismo asunto rara vez
       caen todos dentro de medio punto: eso pide que las seis notas sean la
       misma o difieran en uno sola una vez. Por debajo de 0.5 lo más probable
       no es que la decisión sea uniformemente buena — es que se puntuó una
       impresión seis veces. */
    if(desv < 0.5){
      tono = 'mal';
      partes.push('<span class="cabeza">Las seis notas son casi la misma.</span>Con una dispersión de ' +
        desv.toFixed(2) + ' sobre una escala de cinco, lo más probable no es que todo ' +
        'esté igual de bien o igual de mal: es que hubo <b>una impresión global copiada ' +
        'seis veces</b>. Es el efecto halo. Vuelve a puntuarlas por separado, o mejor, ' +
        'que las puntúen seis personas distintas sin verse.');
    } else if(desv > 1.4){
      partes.push('<span class="cabeza">Las seis se separan mucho (' + desv.toFixed(2) + ').</span>Eso está ' +
        'bien: significa que estás evaluando cosas distintas. La conversación útil es ' +
        'sobre la más baja, no sobre el promedio.');
    } else {
      partes.push('<span class="cabeza">La dispersión es sana (' + desv.toFixed(2) + ').</span>Las seis ' +
        'evaluaciones parecen independientes.');
    }

    if(global > 0){
      var brecha = global - media;
      datos.push(['Nota global', global.toFixed(0), 'de 5', global*20]);
      datos.push(['Distancia con la media', (brecha >= 0 ? '+' : '−') + Math.abs(brecha).toFixed(2), '', Math.min(100, Math.abs(brecha)*40)]);
      if(brecha >= 1){
        if(tono !== 'mal') tono = 'aviso';
        partes.push('<span class="cabeza">La nota global va ' + brecha.toFixed(1) + ' puntos por encima de las ' +
          'partes.</span>Las seis evaluaciones dicen una cosa y la conclusión dice otra mejor. ' +
          'Puede que la intuición sepa algo que las seis casillas no recogen — pero entonces ' +
          'hay que escribir <b>qué</b> es, y meterlo como séptima evaluación. Si no se puede ' +
          'escribir, es entusiasmo.');
      } else if(brecha <= -1){
        if(tono !== 'mal') tono = 'aviso';
        partes.push('<span class="cabeza">La nota global va por debajo de las partes.</span>Algo te frena que no ' +
          'está en las seis casillas. Escríbelo: casi siempre es un riesgo real que nadie ' +
          'quiso poner por escrito.');
      }
    }

    if(antes >= 4){
      tono = 'mal';
      partes.push('<span class="cabeza">Ya estaba decidido antes de empezar.</span>Con ese nivel de opinión ' +
        'previa, lo de arriba no es un análisis: es la documentación de una decisión ya ' +
        'tomada. No es inútil —sirve para explicarla— pero no la está poniendo a prueba. ' +
        'La pregunta que lo destapa en diez segundos: <b>¿qué habríamos tenido que ver ' +
        'para no hacerlo?</b> Si no hay respuesta rápida, no había forma de que saliera «no».');
    }

    /* ⚠ CON EMPATE NO HAY «LA MÁS FLOJA». `indexOf(min)` devuelve la primera,
       y con las seis en la misma nota eso señalaba siempre la primera casilla
       como si fuera el problema — un dato inventado por un desempate ciego. */
    var NOMBRES = ['el problema comprobado','la ventaja difícil de copiar',
                   'los números sin el mejor caso','la capacidad de ejecutar',
                   'el coste de volver atrás','la comparación con no hacer nada'];
    var min = Math.min.apply(null, notas);
    var flojas = [];
    notas.forEach(function(v, i){ if(v === min) flojas.push(NOMBRES[i]); });
    if(flojas.length === 6){
      partes.push('Las seis están en la misma nota, así que no hay una «más floja»: ' +
        'no hay por dónde empezar la conversación. Eso es otra señal de lo mismo.');
    } else if(flojas.length === 1){
      partes.push('Lo más flojo es <b>' + flojas[0] + '</b>. Ahí está la conversación ' +
        'que falta, no en el promedio.');
    } else {
      partes.push('Lo más flojo, empatado, es <b>' + flojas.slice(0,-1).join('</b>, <b>') +
        '</b> y <b>' + flojas[flojas.length-1] + '</b>. Ahí está la conversación que falta.');
    }

    return { tono:tono, datos:datos,
             veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>Del <b>Mediating Assessments Protocol</b> de Daniel Kahneman, Dan Lovallo y
  Olivier Sibony, publicado en <i>MIT Sloan Management Review</i> en la primavera
  de 2019 con el título <i>«A Structured Approach to Strategic Decisions»</i>.
  La investigación de fondo es la de la entrevista de trabajo: la entrevista no
  estructurada, en la que quien entrevista acumula impresiones y al final emite
  un juicio global, es el caso mejor estudiado de juicio evaluativo poco fiable,
  y el remedio que funciona ahí —descomponer, puntuar por separado, dejar la
  nota global para el final— es el que este instrumento aplica.</p>

  <h3>Los dos errores, que no son el mismo</h3>
  <p>El <b>sesgo</b> empuja a todos los evaluadores en la misma dirección: el de
  disponibilidad hace pesar de más lo reciente o lo llamativo —las ventas raras
  del mes pasado en la valoración de una compra—, y el de confirmación hace
  atender más a lo que confirma la impresión inicial. El <b>ruido</b> es otra
  cosa: error aleatorio entre juicios. Dos personas evaluando lo mismo dan 3 y
  4.5. El sesgo se discute en las juntas porque tiene nombre; el ruido no se ve
  sin comparar dos juicios del mismo caso, y casi nunca se comparan.</p>

  <h3>Lo que este instrumento NO hace</h3>
  <p>No dice si la decisión es buena. No sabe nada de tu mercado, tu dinero ni tu
  gente. Mide <b>la calidad del proceso</b> con el que la estás juzgando, que es
  otra cosa y es la única que se puede medir desde fuera. Un proceso limpio
  puede equivocarse y uno sucio puede acertar por suerte; lo que dice la
  investigación es que a la larga el proceso gana.</p>`
};
