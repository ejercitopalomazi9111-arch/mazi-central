/* ══════════════════════════════════════════════════════════════════════════
   04 · LIDERAZGO · Lo que no delegas
   ──────────────────────────────────────────────────────────────────────────
   De «Embrace Delegation as a Skill to Strengthen Remote Teams», MIT Sloan
   Management Review (Soga, Laker, Bolade-Ogunfodun y Mariani, Henley Business
   School).

   El artículo no dice «delega más». Dice algo más fino: en un equipo a
   distancia, la DISTANCIA VIRTUAL tiene tres dimensiones —física, operativa y
   de afinidad— y delegar bien es la herramienta que cierra las dos últimas.
   Y da el ejemplo exacto: delegar una tarea de las que deciden algo —hablar
   con alguien con poder— cierra distancia de afinidad de golpe, porque a quien
   la recibe se le está diciendo que se confía en él.

   ── QUÉ CALCULA ESTE INSTRUMENTO ───────────────────────────────────────
   Reparte tus horas de la semana en cuatro cajas y calcula tres cosas:

     · cuántas horas al mes se van en trabajo que NO pide tu criterio,
     · qué parte de lo que sí delegas es visible (de la que hace crecer a
       alguien) y qué parte es relleno,
     · y el cuello: si además eres el único camino de algo, delegar tareas no
       te va a destapar.

   ⚠ LO QUE NO MIDE, y hay que decirlo: no sabe si la persona a quien le
   delegarías está lista, ni si tienes a alguien. Un número que dice «delega
   14 horas» sin mirar a quién es un número irresponsable — por eso el
   veredicto pregunta por el receptor antes de felicitar a nadie.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'liderazgo', n:4, materia:'Liderazgo',
  nombre:'Lo que no delegas',
  que:'Reparte tu semana en cuatro cajas y calcula cuánto de tu tiempo no pide tu criterio — y si lo que ya delegas hace crecer a alguien o sólo te quita trabajo.',

  intro:`<div class="nota"><b>Cómo se usa.</b> Piensa en una semana normal, no
  en la peor. Reparte tus horas entre las cuatro cajas: que sumen más o menos
  tu semana real. No hay respuesta correcta — un jefe nuevo y uno de veinte
  años de oficio dan repartos distintos y los dos pueden estar bien.</div>`,

  campos:[
    { grupo:'Tu semana, en horas',
      grupoAyuda:'Una semana normal. Que la suma se parezca a lo que trabajas de verdad.',
      id:'h1', tipo:'numero', etiqueta:'Sólo tú puedes hacerlo: pide TU criterio o tu firma', ejemplo:'p. ej. 8' },
    { grupo:'Tu semana, en horas', id:'h2', tipo:'numero',
      etiqueta:'Lo haces tú porque lo sabes hacer más rápido', ejemplo:'p. ej. 12' },
    { grupo:'Tu semana, en horas', id:'h3', tipo:'numero',
      etiqueta:'Lo haces tú porque nunca te sentaste a enseñarlo', ejemplo:'p. ej. 9' },
    { grupo:'Tu semana, en horas', id:'h4', tipo:'numero',
      etiqueta:'Reuniones y coordinación de las que no sale una decisión', ejemplo:'p. ej. 6' },

    { grupo:'Lo que ya delegas',
      grupoAyuda:'De lo que SÍ sueltas, cuánto es de lo que hace crecer a alguien.',
      id:'visible', tipo:'escala', hasta:5, pies:['recados y relleno','cosas que deciden algo'],
      etiqueta:'¿Qué tipo de trabajo sueltas?' },
    { grupo:'Lo que ya delegas', id:'porque', tipo:'escala', hasta:5,
      pies:['la tarea a secas','la tarea y el para qué'],
      etiqueta:'¿Entregas también el porqué?' },
    { grupo:'Lo que ya delegas', id:'receptor', tipo:'escala', hasta:5,
      pies:['no tengo a quién','hay alguien listo'],
      etiqueta:'¿Hay alguien que pueda tomarlo?' },
    { grupo:'Lo que ya delegas', id:'unico', tipo:'escala', hasta:5,
      pies:['nada pasa por mí','casi todo pasa por mí'],
      etiqueta:'¿Cuánto tiene que pasar por ti para avanzar?' },
  ],

  calcular: function(V){
    var n = function(x){ return (x === '' || x === undefined) ? null : Number(x); };
    var h1 = n(V.h1), h2 = n(V.h2), h3 = n(V.h3), h4 = n(V.h4);
    if(h1 === null || h2 === null || h3 === null || h4 === null){
      var puestas = [h1,h2,h3,h4].filter(function(x){ return x !== null; }).length;
      return { tono:'', datos:[['Cajas llenas', puestas + ' de 4', '', puestas*25]],
        veredicto:'<p>Faltan cajas. Las cuatro, aunque alguna sea cero: el reparto ' +
                  'sólo significa algo si está completo.</p>' };
    }
    var total = h1 + h2 + h3 + h4;
    if(total <= 0) return { tono:'aviso', datos:[['Semana','0 h','']],
      veredicto:'<p><span class="cabeza">La semana suma cero.</span>Con cero horas no hay nada que repartir.</p>' };

    /* Lo que no pide TU criterio: rapidez, no haber enseñado y coordinación
       sin decisión. La primera caja es la única que es tuya por definición. */
    var sueltas   = h2 + h3 + h4;
    var porCiento = sueltas * 100 / total;
    var alMes     = Math.round(sueltas * 4.3);

    var datos = [
      ['Tu semana', total.toFixed(0) + ' h', 'lo que repartiste'],
      ['No pide tu criterio', sueltas.toFixed(0) + ' h', Math.round(porCiento) + ' % de la semana', porCiento],
      ['Al mes', alMes + ' h', 'unas ' + (alMes/8).toFixed(1) + ' jornadas'],
      ['Porque lo haces más rápido', h2.toFixed(0) + ' h', 'la caja que más crece sola'],
      ['Porque no lo has enseñado', h3.toFixed(0) + ' h', 'la que se arregla una vez'],
    ];

    var partes = [], tono;

    if(porCiento >= 60){
      tono = 'mal';
      partes.push('<span class="cabeza">Seis de cada diez horas tuyas no piden que seas tú.</span>' +
        'Son ' + alMes + ' horas al mes, unas ' + (alMes/8).toFixed(1) + ' jornadas completas. ' +
        'Con este reparto no eres el cuello de botella por mala organización: lo eres por diseño.');
    } else if(porCiento >= 40){
      tono = 'aviso';
      partes.push('<span class="cabeza">Casi la mitad de tu semana no pide tu criterio.</span>' +
        alMes + ' horas al mes. Todavía no es una emergencia, y ya es el sitio donde está tu tiempo.');
    } else {
      tono = 'bien';
      partes.push('<span class="cabeza">El reparto aguanta.</span>' +
        'El ' + Math.round(100 - porCiento) + ' % de tu semana pide tu criterio o tu firma. ' +
        'Aquí el trabajo ya no es delegar más, es que lo delegado siga saliendo bien sin ti.');
    }

    if(h3 > h2){
      partes.push('<b>Y la caja grande es la que se arregla UNA vez.</b> ' + h3.toFixed(0) +
        ' horas se te van en cosas que haces tú porque nunca te sentaste a enseñarlas — ' +
        'más que las ' + h2.toFixed(0) + ' de hacerlo rápido. Enseñar cuesta una tarde y ' +
        'devuelve ' + Math.round(h3 * 4.3) + ' horas al mes.');
    } else if(h2 > 0){
      partes.push('<b>«Lo hago más rápido yo» es cierto y es una trampa.</b> Es cierto hoy y ' +
        'sigue siendo cierto dentro de un año, porque el otro nunca lo practicó. ' +
        h2.toFixed(0) + ' horas semanales que se renuevan solas.');
    }

    if(V.unico >= 4){
      partes.push('<b>Y aquí delegar tareas no te destapa.</b> Dijiste que casi todo tiene que ' +
        'pasar por ti para avanzar: eso no es carga de trabajo, es un permiso. Mientras el ' +
        'permiso siga siendo tuyo, sueltes lo que sueltes vas a seguir siendo la cola.');
    }

    if(V.visible && V.visible <= 2){
      partes.push('<b>Lo que sueltas no hace crecer a nadie.</b> Delegar recados quita trabajo y ' +
        'no cierra distancia. Lo que la cierra es soltar algo que decide — hablar con alguien ' +
        'con poder, llevar una conversación difícil: a quien lo recibe se le está diciendo que ' +
        'se confía en él, y eso es lo que acerca a un equipo que no se ve.');
    }

    if(V.porque && V.porque <= 2){
      partes.push('<b>Entregas la tarea sin el para qué.</b> Quien no sabe para qué sirve lo que ' +
        'hace no puede decidir cuando la realidad no coincide con la instrucción — y entonces ' +
        'vuelve a preguntarte, que es exactamente lo que querías evitar.');
    }

    if(V.receptor && V.receptor <= 2 && porCiento >= 40){
      partes.push('<b>Aviso, y va antes que todo lo anterior:</b> dijiste que no tienes a quién ' +
        'soltárselo. Entonces tu primer movimiento no es delegar, es conseguir o formar a esa ' +
        'persona. Delegar sin receptor no reparte trabajo: lo tira.');
    }

    partes.push('<b>Y lo que este número NO sabe.</b> No sabe si quien recibiría está listo, ni ' +
      'qué tan caro sale un error suyo. Un reparto de horas es una foto de dónde está tu tiempo, ' +
      'no una instrucción. La decisión sigue siendo tuya y con nombres, no con porcentajes.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«Embrace Delegation as a Skill to Strengthen Remote Teams»</i>,
  <i>MIT Sloan Management Review</i>, de Lebene Soga, Benjamin Laker, Yemisi
  Bolade-Ogunfodun y Marcello Mariani, de la Henley Business School.</p>

  <h3>Las tres distancias</h3>
  <p>El artículo parte de la <b>distancia virtual</b> y sus tres dimensiones:
  <b>física</b> (dónde está cada quien), <b>operativa</b> (los procesos y las
  herramientas que ayudan o estorban) y <b>de afinidad</b> (la conexión que da
  la familiaridad, la interdependencia y un propósito compartido).</p>
  <p>La física no se arregla delegando — la gente sigue lejos. Las otras dos
  sí: delegar bien mejora la calidad de la comunicación y la soltura con las
  herramientas, que es la operativa; y soltar algo <b>que decide</b> cierra la
  de afinidad, porque a quien lo recibe se le está diciendo que se confía en
  él. Delegar mal, en cambio, alimenta el micromanejo.</p>

  <h3>Por qué cuatro cajas y no una pregunta</h3>
  <p>Porque «¿delegas bien?» se contesta que sí. Repartir horas obliga a
  escribir dónde está el tiempo, y la caja «lo hago yo porque nunca lo enseñé»
  casi nunca se ve hasta que hay que ponerle un número.</p>

  <h3>Lo que no mide, dicho de frente</h3>
  <p>No sabe a quién tienes, ni si está listo, ni qué tan caro es un error
  suyo. Tampoco sabe si tu semana de ejemplo es la normal o la peor. Es una
  foto de dónde está tu tiempo — el reparto se decide con nombres.</p>`
};
