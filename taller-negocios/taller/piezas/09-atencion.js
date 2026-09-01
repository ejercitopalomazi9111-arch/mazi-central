/* ══════════════════════════════════════════════════════════════════════════
   09 · ATENCIÓN AL CLIENTE · Lo que tu encuesta no sabe
   ──────────────────────────────────────────────────────────────────────────
   De «The High Price of Customer Satisfaction», MIT Sloan Management Review
   (Keiningham, Gupta, Aksoy y Buoye), y del manual público de GitLab sobre
   encuestas de satisfacción.

   El dato del artículo que hay que tener enfrente al mirar un CSAT: mirando
   entre industrias la correlación entre el nivel de satisfacción de un año y
   el rendimiento bursátil de ese mismo año, la satisfacción explica de media
   el UNO POR CIENTO de la variación. Los propios autores dicen que ese examen
   es simplista —la satisfacción debería afectar al desempeño con el tiempo—,
   y por eso el número no sirve para concluir «la satisfacción no importa».
   Sirve para lo otro: para no tratar un CSAT como si fuera el negocio.

   ── QUÉ CALCULA ─────────────────────────────────────────────────────────
   Si tu número de satisfacción puede significar lo que crees que significa.
   Tres cosas que casi nunca se miran juntas:

   1. LA TASA DE RESPUESTA. Con 8 % de respuesta el número no describe a tus
      clientes: describe a los que contestan encuestas.
   2. A QUIÉN SE LE PREGUNTA. Si sólo se encuesta al cerrar un caso, los que
      se rindieron sin abrirlo nunca aparecen — y son justo los que se van.
   3. QUÉ SE HACE CON LO MALO. Una encuesta sin circuito de vuelta enseña
      cortesía, no problemas.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'atencion', n:9, materia:'Atención al cliente',
  nombre:'Lo que tu encuesta no sabe',
  que:'Calcula a qué parte de tus clientes describe de verdad tu número de satisfacción, y qué se te está quedando fuera de la foto.',

  intro:`<div class="nota"><b>Cómo se usa.</b> Con los números de un mes
  normal. Si alguno no lo tienes a mano, eso ya es parte del hallazgo — pero
  búscalo antes de estimarlo: una tasa de respuesta inventada convierte todo
  lo demás en adorno.</div>`,

  campos:[
    { grupo:'El mes', grupoAyuda:'Un mes normal, no el mejor ni el peor.',
      id:'clientes', tipo:'numero', etiqueta:'Clientes activos en el mes', ejemplo:'p. ej. 1200' },
    { grupo:'El mes', id:'casos', tipo:'numero',
      etiqueta:'Casos o tickets abiertos', ejemplo:'p. ej. 340' },
    { grupo:'El mes', id:'encuestas', tipo:'numero',
      etiqueta:'Encuestas enviadas', ejemplo:'p. ej. 300' },
    { grupo:'El mes', id:'respuestas', tipo:'numero',
      etiqueta:'Encuestas contestadas', ejemplo:'p. ej. 42' },
    { grupo:'El mes', id:'csat', tipo:'numero',
      etiqueta:'Tu número de satisfacción (0 a 100)', ejemplo:'p. ej. 92' },

    { grupo:'Cómo se pregunta', id:'cuando', tipo:'escala', hasta:5,
      pies:['sólo al cerrar un caso','también a quien no abrió ninguno'],
      etiqueta:'¿A quién se le pregunta?' },
    { grupo:'Cómo se pregunta', id:'porQue', tipo:'escala', hasta:5,
      pies:['sólo la nota','se pregunta el porqué'],
      etiqueta:'¿La encuesta pide una razón?' },
    { grupo:'Cómo se pregunta', id:'circuito', tipo:'escala', hasta:5,
      pies:['no pasa nada','alguien contesta y se arregla'],
      etiqueta:'¿Qué pasa cuando alguien puntúa mal?' },
  ],

  calcular: function(V){
    var n = function(x){ return (x === '' || x === undefined) ? null : Number(x); };
    var cl = n(V.clientes), ca = n(V.casos), en = n(V.encuestas), re = n(V.respuestas), cs = n(V.csat);
    var puestos = [cl,ca,en,re].filter(function(x){ return x !== null; }).length;
    if(puestos < 4) return { tono:'',
      datos:[['Datos', puestos + ' de 4', '', puestos*25]],
      veredicto:'<p>Faltan datos del mes: clientes, casos, encuestas enviadas y contestadas. ' +
                'Sin los cuatro no se puede saber a quién describe tu número.</p>' };
    if(en <= 0) return { tono:'mal', datos:[['Encuestas enviadas','0','']],
      veredicto:'<p><span class="cabeza">No se envía ninguna.</span>Entonces no hay número que ' +
                'revisar. Y antes de montar la encuesta conviene decidir qué decisión vas a tomar ' +
                'con ella — si no hay ninguna, no la montes.</p>' };
    if(re > en) return { tono:'aviso', datos:[['Contestadas', re + ' de ' + en, 'imposible']],
      veredicto:'<p><span class="cabeza">Contestadas no puede ser más que enviadas.</span>Revisa ' +
                'los dos números.</p>' };

    var tasa      = re * 100 / en;
    var deCasos   = ca > 0 ? en * 100 / ca : 0;
    var deClientes= cl > 0 ? re * 100 / cl : 0;
    var mudos     = cl > 0 ? cl - re : 0;

    var datos = [
      ['Tasa de respuesta', tasa.toFixed(1) + ' %', re + ' de ' + en + ' enviadas', tasa],
      ['Cobertura de casos', Math.round(deCasos) + ' %', en + ' encuestas de ' + ca + ' casos', deCasos],
      ['Habla por', deClientes.toFixed(1) + ' %', 'de tus ' + cl + ' clientes', deClientes],
      ['No sabes nada de', mudos.toLocaleString('es-MX'), 'clientes este mes'],
    ];
    if(cs !== null) datos.push(['Tu número', cs + '', 'de esas ' + re + ' respuestas']);

    var partes = [], tono;

    if(tasa < 15){
      tono = 'mal';
      partes.push('<span class="cabeza">Contesta el ' + tasa.toFixed(1) + ' %.</span>' +
        'Tu número no describe a tus clientes: describe a los ' + re + ' que contestan encuestas. ' +
        'Y quien contesta una encuesta de soporte suele estar en uno de dos extremos —muy ' +
        'agradecido o muy enojado—, así que ni siquiera es una muestra chica: es una muestra ' +
        'torcida.');
    } else if(tasa < 30){
      tono = 'aviso';
      partes.push('<span class="cabeza">Contesta el ' + tasa.toFixed(1) + ' %.</span>' +
        'Es una tasa normal y sigue siendo poca gente. Sirve para ver tendencia mes a mes; no ' +
        'para afirmar «nuestros clientes están contentos».');
    } else {
      tono = 'bien';
      partes.push('<span class="cabeza">Contesta el ' + tasa.toFixed(1) + ' %.</span>' +
        'Eso es alto para una encuesta de soporte. El número tiene con qué sostenerse.');
    }

    partes.push('<b>Y en cristiano:</b> tu número de satisfacción sale de ' + re + ' personas de ' +
      cl.toLocaleString('es-MX') + ' clientes. Habla por el ' + deClientes.toFixed(1) + ' %. De los ' +
      'otros ' + mudos.toLocaleString('es-MX') + ' no sabes nada este mes — ni que están bien, ni ' +
      'que están mal, ni que ya se fueron.');

    if(ca > 0 && deCasos < 60){
      partes.push('<b>Ni siquiera cubres los casos.</b> Se envían ' + en + ' encuestas para ' + ca +
        ' casos: el ' + Math.round(deCasos) + ' %. Antes de mirar la nota conviene saber por qué ' +
        'no se envía en el resto — casi siempre hay una regla vieja que excluye justo los casos ' +
        'que peor salieron.');
    }

    if(V.cuando && V.cuando <= 2){
      partes.push('<b>Y sólo se pregunta al cerrar un caso.</b> Ése es el sesgo caro: el que se ' +
        'rindió sin abrir ticket, el que buscó en la ayuda y no encontró, el que se fue sin decir ' +
        'nada — ninguno aparece en tu número. Estás midiendo la satisfacción de los que llegaron ' +
        'hasta el final, que son por definición los que aguantaron.');
    }

    if(V.porQue && V.porQue <= 2){
      partes.push('<b>La encuesta pide una nota y no una razón.</b> Una nota sin razón sube o baja ' +
        'y no dice qué hacer. La pregunta abierta contesta menos gente y es la única parte que ' +
        'produce trabajo concreto.');
    }

    if(V.circuito && V.circuito <= 2){
      partes.push('<b>Y cuando alguien puntúa mal no pasa nada.</b> Entonces la encuesta no es una ' +
        'medición: es un formulario. Quien se molestó en contestar mal y no recibió respuesta ' +
        'aprende que no vale la pena — y tu tasa de respuesta baja el mes siguiente, que es ' +
        'justo lo contrario de lo que necesitas.');
    }

    if(cs !== null && cs >= 90 && tasa < 20){
      partes.push('<b>Ojo con ese ' + cs + ' con el ' + tasa.toFixed(1) + ' % de respuesta.</b> ' +
        'Un número alto sobre poca gente y encima autoseleccionada es la combinación más fácil de ' +
        'presentar y la más difícil de defender. No es que esté mal: es que no aguanta el peso ' +
        'que se le suele poner encima.');
    }

    partes.push('<b>Y el dato que conviene tener enfrente.</b> Mirando entre industrias, la ' +
      'satisfacción de un año explica de media el <b>1 %</b> de la variación del rendimiento ' +
      'bursátil de ese mismo año. Los propios autores dicen que ese examen es simplista —la ' +
      'satisfacción debería influir con el tiempo, no en el acto—, y por eso el número no ' +
      'demuestra que la satisfacción no importe. Lo que sí desmonta es tratar un CSAT como si ' +
      'fuera el negocio.');

    partes.push('<b>Lo que este instrumento NO hace.</b> No te dice si tu servicio es bueno. ' +
      'Sólo dice a cuánta gente describe tu número y quién se queda fuera de la foto. El ' +
      'siguiente paso no es subir la nota: es ir a buscar a los ' + mudos.toLocaleString('es-MX') +
      ' que no contestaron.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«The High Price of Customer Satisfaction»</i>, <i>MIT Sloan
  Management Review</i>, de Timothy Keiningham, Sunil Gupta, Lerzan Aksoy y
  Alexander Buoye; y del manual público de GitLab sobre encuestas de
  satisfacción, que es de los pocos sitios donde una empresa enseña el
  procedimiento completo en vez del resultado.</p>

  <h3>El 1 %</h3>
  <p>Mirando entre industrias la correlación entre el nivel de satisfacción de
  un año y el rendimiento bursátil de ese mismo año, la satisfacción explica de
  media el <b>uno por ciento</b> de la variación. Los autores son los primeros
  en decir que ese examen es <b>simplista</b>: uno esperaría que la
  satisfacción influyera con el tiempo, no dentro del mismo año. Por eso el
  dato no sirve para concluir que la satisfacción no importa — sirve para no
  tratar un CSAT como si fuera el negocio.</p>

  <h3>Por qué la tasa de respuesta va antes que la nota</h3>
  <p>Porque la nota sin la tasa no significa nada. Un 92 sobre el 8 % de
  respuesta y un 92 sobre el 45 % son dos afirmaciones distintas, y sólo la
  segunda aguanta que alguien pregunte «¿y los demás?».</p>
  <p>Y hay un sesgo encima: quien contesta una encuesta de soporte suele estar
  en un extremo. No es una muestra pequeña, es una muestra torcida.</p>

  <h3>Quién no aparece nunca</h3>
  <p>Si sólo se encuesta al cerrar un caso, quedan fuera el que se rindió sin
  abrirlo, el que buscó en la ayuda y no encontró, y el que se fue sin decir
  nada. Son justo los que más te convendría oír.</p>

  <h3>Lo que no mide</h3>
  <p>No sabe si tu servicio es bueno. No sabe si los que no contestan están
  contentos o hartos — nadie lo sabe, y ése es el punto. Sólo dice a cuánta
  gente describe tu número y quién se queda fuera.</p>`
};
