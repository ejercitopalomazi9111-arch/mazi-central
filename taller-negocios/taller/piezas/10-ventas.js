/* ══════════════════════════════════════════════════════════════════════════
   10 · VENTAS · Dónde se cae el embudo
   ──────────────────────────────────────────────────────────────────────────
   De tres sitios, y cada uno pone una pieza:

   · «How to manage a strong sales funnel at every stage with Trello»,
     Atlassian. De ahí sale la regla que este instrumento obliga a cumplir:
     el embudo genérico —conocer, interesar, decidir, comprar— sirve para
     diseñar contenido y es DEMASIADO SIMPLE para seguir una venta real. Las
     etapas propias hay que escribirlas, y cada una tiene que decir qué hace
     el vendedor, cómo se comunica y cuál es el paso siguiente.
   · «A Matter of Metrics: Using Web Data to Improve Sales Performance»,
     Knowledge at Wharton. De ahí la advertencia de Peter Fader: decir «las
     ventas subieron 150 %» no significa nada sin una idea firme de qué
     habrían sido bajo un escenario razonable. Y el dato que envejece bien:
     en 1999 más del 70 % de los minoristas de internet convertía por debajo
     del 2 %, y el flujo constante de usuarios nuevos tapó el problema.
   · «Insensitivity To Base Rates», Farnam Street. De ahí la corrección final:
     con información específica y vívida delante, la gente descarta la tasa
     base aunque sepa que es relevante.

   ── QUÉ CALCULA ─────────────────────────────────────────────────────────
   La conversión de cada tramo, cuál es el peor, y —lo que casi nadie hace—
   el pronóstico según la TASA BASE del propio embudo, para ponerlo al lado
   del que dio el equipo.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'ventas', n:10, materia:'Ventas',
  nombre:'Dónde se cae el embudo',
  que:'Calcula la conversión de cada tramo, señala el peor, y pone tu pronóstico al lado del que sale de tu propia tasa base.',

  intro:`<div class="nota"><b>Cómo se usa.</b> Cinco etapas, de más gente a
  menos, con los números de un periodo completo — un trimestre, no una semana.
  Si tus etapas no se llaman así, no importa: lo que importa es que sean las
  TUYAS y que cada una signifique algo que el vendedor hace.</div>`,

  campos:(function(){
    var etiquetas = [
      ['e1','Entraron: contactos o interesados nuevos','p. ej. 400'],
      ['e2','Contestaron o aceptaron hablar','p. ej. 120'],
      ['e3','Tuvieron una reunión de verdad','p. ej. 60'],
      ['e4','Recibieron propuesta','p. ej. 25'],
      ['e5','Cerraron','p. ej. 8'],
    ];
    var c = etiquetas.map(function(e, i){
      return { grupo:'Tu embudo, en un periodo completo',
               grupoAyuda: i === 0 ? 'De más a menos. Un trimestre entero, no una semana.' : undefined,
               id:e[0], tipo:'numero', etiqueta:e[1], ejemplo:e[2] };
    });
    c.push({ grupo:'El pronóstico', grupoAyuda:'El que dio el equipo, antes de mirar nada de arriba.',
             id:'pronostico', tipo:'numero', etiqueta:'¿Cuántos cierres se pronosticaron para el periodo?', ejemplo:'p. ej. 14' });
    c.push({ grupo:'El pronóstico', id:'abiertos', tipo:'numero',
             etiqueta:'¿Cuántos tratos hay abiertos ahora mismo?', ejemplo:'p. ej. 30' });
    c.push({ grupo:'Cómo está definido', id:'etapasPropias', tipo:'escala', hasta:5,
             pies:['son las del manual','son las nuestras, escritas'],
             etiqueta:'¿De dónde salieron tus etapas?' });
    c.push({ grupo:'Cómo está definido', id:'siguientePaso', tipo:'escala', hasta:5,
             pies:['no está escrito','cada etapa dice qué sigue'],
             etiqueta:'¿Cada etapa dice cuál es el paso siguiente?' });
    return c;
  })(),

  calcular: function(V){
    var n = function(x){ return (x === '' || x === undefined) ? null : Number(x); };
    var E = ['e1','e2','e3','e4','e5'].map(function(k){ return n(V[k]); });
    var puestos = E.filter(function(x){ return x !== null; }).length;
    if(puestos < 5) return { tono:'',
      datos:[['Etapas', puestos + ' de 5', '', puestos*20]],
      veredicto:'<p>Faltan etapas. Las cinco: sin el embudo completo no se puede ver dónde se cae, ' +
                'que es justo lo que se viene a ver.</p>' };
    if(E[0] <= 0) return { tono:'aviso', datos:[['Entraron','0','']],
      veredicto:'<p><span class="cabeza">No entró nadie.</span>Sin entradas no hay embudo que ' +
                'revisar — el problema está antes, en de dónde salen los contactos.</p>' };

    var subeAlgo = false;
    for(var i = 1; i < 5; i++) if(E[i] > E[i-1]) subeAlgo = true;
    if(subeAlgo) return { tono:'aviso',
      datos:E.map(function(v,i){ return ['Etapa ' + (i+1), v + '', '']; }),
      veredicto:'<p><span class="cabeza">Una etapa tiene más gente que la anterior.</span>' +
        'Un embudo va de más a menos: si sube, o los números son de periodos distintos, o dos ' +
        'etapas se están contando doble. Revísalo antes de sacar conclusiones — con esto de ' +
        'entrada, cualquier porcentaje que te diera sería falso.</p>' };

    var nombres = ['entraron → contestaron', 'contestaron → reunión',
                   'reunión → propuesta', 'propuesta → cierre'];
    var tramos = [];
    for(var j = 0; j < 4; j++){
      tramos.push({ nombre:nombres[j], de:E[j], a:E[j+1],
                    pc: E[j] > 0 ? E[j+1] * 100 / E[j] : 0 });
    }
    var global = E[4] * 100 / E[0];

    /* El peor tramo NO es el de menor porcentaje: es el que más gente pierde
       en números absolutos. Un 20 % sobre 400 pierde 320; un 20 % sobre 25
       pierde 20. El porcentaje solo manda a arreglar lo pequeño. */
    var peor = tramos[0], mayorPerdida = -1;
    tramos.forEach(function(t){
      var perdidos = t.de - t.a;
      if(perdidos > mayorPerdida){ mayorPerdida = perdidos; peor = t; }
    });

    var datos = [['Conversión total', global.toFixed(1) + ' %', E[4] + ' de ' + E[0], global]];
    tramos.forEach(function(t){
      datos.push([t.nombre, t.pc.toFixed(0) + ' %', 'se pierden ' + (t.de - t.a), t.pc]);
    });

    var partes = [], tono;
    partes.push('<span class="cabeza">El tramo que más gente pierde es «' + peor.nombre + '».</span>' +
      'Ahí se caen ' + mayorPerdida + ' de ' + peor.de + ' — el ' +
      Math.round((peor.de - peor.a) * 100 / peor.de) + ' % de los que llegaron. Y ojo con esto, ' +
      'porque es donde casi todo el mundo se equivoca: <b>el peor tramo no es el del porcentaje ' +
      'más bajo, es el que pierde más gente</b>. Un 20 % sobre 400 pierde 320; el mismo 20 % sobre ' +
      '25 pierde 20. Mirando sólo porcentajes se acaba arreglando lo pequeño.');

    if(global < 2){
      tono = 'mal';
      partes.push('<b>Y la conversión total es del ' + global.toFixed(1) + ' %.</b> Ese número ' +
        'tiene historia: en 1999 más del 70 % de los minoristas de internet convertía por debajo ' +
        'del 2 %, y no se notó durante años porque el flujo constante de usuarios nuevos lo tapaba. ' +
        'Si tus entradas están creciendo, el embudo puede estar roto y no verse.');
    } else if(global < 8){
      tono = 'aviso';
      partes.push('<b>Conversión total del ' + global.toFixed(1) + ' %.</b> Sin un competidor ' +
        'enfrente ese número no es bueno ni malo. Lo que sí dice algo es su tendencia: si baja ' +
        'mientras suben las entradas, estás comprando más para cerrar lo mismo.');
    } else {
      tono = 'bien';
      partes.push('<b>Conversión total del ' + global.toFixed(1) + ' %.</b> Aguanta. Lo que toca ' +
        'aquí no es empujar el embudo entero: es el tramo de arriba, que es el único que sigue ' +
        'perdiendo gente en cantidad.');
    }

    /* El pronóstico contra la tasa base — la corrección que casi nadie hace */
    var pron = n(V.pronostico), ab = n(V.abiertos);
    if(pron !== null && ab !== null && ab > 0){
      var base = ab * (global / 100) * (E[0] / Math.max(E[0], 1));
      /* Con tratos ya abiertos la tasa base útil es la del tramo que les falta.
         Sin saber en qué etapa está cada uno, lo honesto es el rango: desde la
         conversión global hasta la del último tramo. */
      var bajo  = ab * global / 100;
      var alto  = ab * tramos[3].pc / 100;
      datos.push(['Pronóstico del equipo', pron + '', 'cierres']);
      datos.push(['Tasa base dice', bajo.toFixed(1) + ' a ' + alto.toFixed(1),
                  'según en qué etapa estén']);
      if(pron > alto){
        partes.push('<b>Y el pronóstico va por encima de tu propia tasa base.</b> Se pronosticaron ' +
          pron + ' cierres; con ' + ab + ' tratos abiertos, tu histórico da entre ' +
          bajo.toFixed(1) + ' y ' + alto.toFixed(1) + ' —el techo sería si TODOS estuvieran ya en ' +
          'propuesta—. Eso no es mentira, es sesgo: con casos concretos y vívidos delante, la ' +
          'gente descarta la tasa base aunque sepa que es relevante. La corrección no es discutir ' +
          'trato por trato: es empezar por la base y ajustar desde ahí, no al revés.');
      } else {
        partes.push('<b>El pronóstico cabe dentro de tu tasa base</b> (' + bajo.toFixed(1) + ' a ' +
          alto.toFixed(1) + ' con ' + ab + ' abiertos). Que empiece por la base y no por el ' +
          'entusiasmo de la última reunión ya es más de lo que hace casi nadie.');
      }
    }

    if(V.etapasPropias && V.etapasPropias <= 2){
      partes.push('<b>Y las etapas son las del manual.</b> El embudo genérico —conocer, interesar, ' +
        'decidir, comprar— sirve para diseñar contenido y es demasiado simple para seguir una ' +
        'venta de verdad: en cuanto alguien llena un formulario o empieza una conversación uno a ' +
        'uno, el embudo real se abre en más pasos de los que el dibujo tiene.');
    }

    if(V.siguientePaso && V.siguientePaso <= 2){
      partes.push('<b>Y ninguna etapa dice cuál es el paso siguiente.</b> Entonces una etapa es una ' +
        'etiqueta, no un estado. Cada una tiene que decir tres cosas: qué hace el vendedor ahí, ' +
        'cómo se comunica, y cuál es el paso siguiente. Sin eso, mover un trato de columna es ' +
        'decoración.');
    }

    partes.push('<b>Y lo que estos porcentajes NO son.</b> Un porcentaje de crecimiento no ' +
      'significa nada sin una idea firme de qué habría pasado bajo un escenario razonable — es de ' +
      'Peter Fader, de Wharton, y aplica igual aquí: «mejoramos la conversión un 30 %» puede ser ' +
      'que llegó gente distinta. Antes de celebrar, separa clientes nuevos de recurrentes.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«How to manage a strong sales funnel at every stage with Trello»</i>
  (Atlassian), <i>«A Matter of Metrics: Using Web Data to Improve Sales
  Performance»</i> (<i>Knowledge at Wharton</i>, con Peter Fader) y
  <i>«Insensitivity To Base Rates»</i> (Farnam Street).</p>

  <h3>Por qué el peor tramo no es el del porcentaje más bajo</h3>
  <p>Porque el porcentaje ignora el tamaño. Un 20 % sobre 400 pierde 320
  personas; el mismo 20 % sobre 25 pierde 20. Ordenando por porcentaje se
  acaba arreglando el tramo pequeño, que es el que menos devuelve. Por eso
  aquí el tramo señalado es el que <b>más gente pierde</b>.</p>

  <h3>La tasa base contra el pronóstico</h3>
  <p>Cuando hay información específica y vívida —una reunión que salió bien, un
  cliente que dijo «lo vemos el lunes»— la gente descarta la tasa base aunque
  sepa que es relevante. En ausencia de esa información la usa correctamente;
  con ella, la deja. Por eso este instrumento calcula el pronóstico que sale de
  tu propio histórico y lo pone al lado del que dio el equipo: no para ganar la
  discusión, sino para que la base esté <b>antes</b> y no como réplica.</p>

  <h3>El 2 % de 1999</h3>
  <p>Más del 70 % de los minoristas de internet convertía por debajo del 2 %, y
  el problema quedó tapado durante años por el flujo constante de usuarios
  nuevos. Es el aviso que envejece bien: un mercado que crece disimula un
  embudo que no funciona.</p>

  <h3>Lo que no mide</h3>
  <p>No sabe en qué etapa está cada trato abierto — por eso el pronóstico de la
  tasa base es un rango y no un número. No sabe el tamaño de los tratos: cerrar
  ocho pequeños no es lo mismo que cerrar dos grandes. Y no compara con nadie:
  un 4 % puede ser excelente o pésimo según el sector.</p>`
};
