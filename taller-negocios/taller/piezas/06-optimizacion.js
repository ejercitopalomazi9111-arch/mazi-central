/* ══════════════════════════════════════════════════════════════════════════
   06 · OPTIMIZACIÓN · Antes de automatizarlo
   ──────────────────────────────────────────────────────────────────────────
   De dos sitios, y el orden importa:

   · «How Atlassian Automation accelerates work across Confluence, Jira and
     Jira Service Management», Atlassian. De ahí sale la aritmética que casi
     nadie hace: más de 200 automatizaciones que ahorran DOS MINUTOS al día
     cada una son casi 1 500 horas al año. Dos minutos no se sienten; mil
     quinientas horas sí. Ése es todo el punto de contarlo.
   · «Monitor, Measure, Incentivize», MIT Sloan Management Review, sobre el
     estudio de Nicholas Bloom (Stanford) a 30 000 fábricas de Estados Unidos
     con el censo. De ahí sale la advertencia: vigilar y premiar CORRELACIONAN
     con más productividad. Correlacionan. Y por eso una automatización que
     sólo sirve para vigilar mejor no es automáticamente una mejora.

   ── QUÉ CALCULA ESTE INSTRUMENTO ───────────────────────────────────────
   El retorno en SEMANAS: cuánto tarda en devolverse lo que cuesta construir
   la automatización, contando el mantenimiento —que es lo que nadie cuenta—.

   ⚠ Y LA PUERTA QUE VA ANTES DEL NÚMERO. La primera pregunta no es «¿cuánto
   ahorro?» sino «¿por qué existe este paso?». Automatizar un desperdicio da
   un desperdicio más rápido y, además, con mantenimiento. Por eso si la tarea
   no sobrevive esa pregunta, el instrumento NO enseña el retorno: sería darle
   una cifra bonita a la decisión equivocada.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'optimizacion', n:6, materia:'Optimización',
  nombre:'Antes de automatizarlo',
  que:'Calcula en cuántas semanas se paga una automatización contando su mantenimiento — y no te enseña el número si la tarea no debería existir.',

  intro:`<div class="nota"><b>Cómo se usa.</b> Piensa en UNA tarea repetitiva
  concreta, de las que alguien hace a mano. Los minutos no tienen que ser
  exactos: cronometra una vez y redondea. Lo que sí tiene que ser honesto es
  la primera pregunta del segundo bloque.</div>`,

  campos:[
    { grupo:'La tarea', grupoAyuda:'Una sola, concreta, de las que se hacen a mano.',
      id:'minutos', tipo:'numero', etiqueta:'Minutos que toma cada vez', ejemplo:'p. ej. 12' },
    { grupo:'La tarea', id:'veces', tipo:'numero',
      etiqueta:'Veces al día que alguien la hace (entre todos)', ejemplo:'p. ej. 6' },
    { grupo:'La tarea', id:'personas', tipo:'numero',
      etiqueta:'¿Cuántas personas distintas la hacen?', ejemplo:'p. ej. 3' },

    { grupo:'Lo que cuesta montarla',
      grupoAyuda:'Con mantenimiento. Una automatización sin dueño se rompe y nadie se entera.',
      id:'construir', tipo:'numero', etiqueta:'Horas de construirla', ejemplo:'p. ej. 20' },
    { grupo:'Lo que cuesta montarla', id:'mantener', tipo:'numero',
      etiqueta:'Horas de mantenerla AL MES', ejemplo:'p. ej. 2' },

    { grupo:'La puerta que va antes',
      grupoAyuda:'Ésta decide si el número de arriba significa algo.',
      id:'porQueExiste', tipo:'escala', hasta:5,
      pies:['nadie sabe por qué existe','sé quién lo pide y para qué'],
      etiqueta:'¿Por qué existe este paso?' },
    { grupo:'La puerta que va antes', id:'siNoEstuviera', tipo:'escala', hasta:5,
      pies:['no pasaría nada','se rompería algo'],
      etiqueta:'¿Qué pasaría si desapareciera?' },
    { grupo:'La puerta que va antes', id:'dueno', tipo:'escala', hasta:5,
      pies:['no habría dueño','alguien con nombre'],
      etiqueta:'¿Quién se entera si se rompe la automatización?' },
  ],

  calcular: function(V){
    var n = function(x){ return (x === '' || x === undefined) ? null : Number(x); };
    var m = n(V.minutos), v = n(V.veces), c = n(V.construir), mt = n(V.mantener);
    var puestos = [m,v,c,mt].filter(function(x){ return x !== null; }).length;
    if(puestos < 4) return { tono:'',
      datos:[['Datos', puestos + ' de 4', '', puestos*25]],
      veredicto:'<p>Faltan datos: minutos, veces al día, horas de construir y horas de mantener ' +
                'al mes. El mantenimiento cuenta aunque sea cero — pero piénsalo antes de poner cero.</p>' };

    if(m <= 0 || v <= 0) return { tono:'aviso', datos:[['Ahorro','0 h','']],
      veredicto:'<p><span class="cabeza">La tarea no consume tiempo.</span>Con cero minutos o cero ' +
                'veces al día no hay nada que ahorrar, y automatizarla sólo suma mantenimiento.</p>' };

    /* ── LA PUERTA. Va ANTES del número a propósito: enseñar un retorno
       bonito de una tarea que no debería existir es exactamente el error que
       este instrumento tiene que evitar, no cometer. */
    var sobra = (V.porQueExiste && V.porQueExiste <= 2) ||
                (V.siNoEstuviera && V.siNoEstuviera <= 2);
    if(sobra){
      return { tono:'mal',
        datos:[['Minutos al día', (m*v).toFixed(0) + ' min', 'que hoy se van en esto'],
               ['Al año', Math.round(m*v*5*52/60) + ' h', 'a 5 días por semana']],
        veredicto:'<p><span class="cabeza">No te voy a enseñar el retorno.</span>' +
          (V.porQueExiste <= 2 ? 'Dijiste que nadie sabe por qué existe este paso. ' : '') +
          (V.siNoEstuviera <= 2 ? 'Dijiste que si desapareciera no pasaría nada. ' : '') +
          'Automatizar un desperdicio da un desperdicio más rápido y, además, con ' +
          'mantenimiento para siempre.</p>' +
          '<p><b>Lo que sí hay que hacer con estas ' + Math.round(m*v*5*52/60) + ' horas al año:</b> ' +
          'buscar quién pidió ese paso y cuándo. Si nadie lo encuentra, el movimiento es quitarlo, ' +
          'no acelerarlo — y son las mismas horas ahorradas sin construir nada ni mantener nada.</p>' +
          '<p><b>Por qué esto sale antes que el número.</b> Automatizar es visible y se puede ' +
          'enseñar en una junta; quitar un paso hay que negociarlo con quien lo pidió. Por eso se ' +
          'automatiza lo que sobra: es el camino cómodo, no el correcto. Si te equivocaste al ' +
          'contestar, corrige arriba y vuelve — el retorno aparece solo.</p>' };
    }

    var minutosDia  = m * v;
    var horasAno    = minutosDia * 5 * 52 / 60;      /* 5 días por semana */
    var horasMesAho = minutosDia * 5 * 4.3 / 60;
    var netoMes     = horasMesAho - mt;
    var datos = [
      ['Se va al día', minutosDia.toFixed(0) + ' min', 'entre todos'],
      ['Al año', Math.round(horasAno) + ' h', (horasAno/8).toFixed(0) + ' jornadas'],
      ['Ahorro al mes', horasMesAho.toFixed(1) + ' h', 'antes de mantenimiento'],
      ['Mantenimiento', mt.toFixed(1) + ' h/mes', 'lo que cuesta que siga viva'],
      ['Ahorro neto', netoMes.toFixed(1) + ' h/mes', netoMes > 0 ? 'de verdad' : 'cuesta más de lo que ahorra'],
    ];

    var partes = [], tono;

    if(netoMes <= 0){
      tono = 'mal';
      datos.push(['Se paga en', 'nunca', 'el mantenimiento se la come']);
      partes.push('<span class="cabeza">No se paga nunca.</span>' +
        'Ahorra ' + horasMesAho.toFixed(1) + ' horas al mes y cuesta ' + mt.toFixed(1) +
        ' de mantener: el saldo es ' + netoMes.toFixed(1) + '. Construirla sería cambiar una ' +
        'tarea aburrida por una tarea aburrida que además se rompe.');
    } else {
      var semanas = c / (netoMes / 4.3);
      datos.push(['Se paga en', semanas.toFixed(1) + ' semanas', 'contando mantenimiento',
                  Math.max(0, 100 - semanas * 2)]);
      if(semanas <= 12){
        tono = 'bien';
        partes.push('<span class="cabeza">Se paga en ' + semanas.toFixed(1) + ' semanas.</span>' +
          'Con las ' + c + ' horas de construirla y ' + mt.toFixed(1) + ' al mes de mantenerla, ' +
          'a partir de ahí son ' + netoMes.toFixed(1) + ' horas al mes que se quedan. ' +
          'Menos de un trimestre: hazla.');
      } else if(semanas <= 40){
        tono = 'aviso';
        partes.push('<span class="cabeza">Se paga en ' + semanas.toFixed(1) + ' semanas.</span>' +
          'Casi ' + (semanas/4.3).toFixed(0) + ' meses. No es que no, es que no es la primera: ' +
          'si tienes otra tarea con un retorno más corto, ésa va antes.');
      } else {
        tono = 'mal';
        partes.push('<span class="cabeza">Tarda ' + semanas.toFixed(0) + ' semanas en pagarse.</span>' +
          'Más de ' + (semanas/52).toFixed(1) + ' años. En ese plazo el proceso va a cambiar y ' +
          'la automatización va a haber que rehacerla antes de haberse pagado.');
      }
    }

    if(mt === 0){
      partes.push('<b>Pusiste cero de mantenimiento y casi nunca es cero.</b> Cambia el formato de ' +
        'un archivo, caduca una credencial, alguien renombra un campo. Una automatización sin ' +
        'mantenimiento no es gratis: es una que se va a romper sin que nadie lo note.');
    }

    if(V.dueno && V.dueno <= 2){
      partes.push('<b>Y no habría quién se entere si se rompe.</b> Eso es peor que no automatizar. ' +
        'Una automatización rota en silencio deja de hacer el trabajo y nadie lo vuelve a hacer a ' +
        'mano, porque ya nadie se acuerda de que existía. Antes de construirla, pon el nombre de ' +
        'quien recibe el aviso cuando falle.');
    }

    var personas = n(V.personas);
    if(personas !== null && personas >= 3){
      partes.push('<b>Lo hacen ' + personas + ' personas distintas, y eso cambia el orden.</b> ' +
        'Cuando el mismo paso pasa por varias manos, además del tiempo se está pagando la ' +
        'diferencia: cada quien lo hace un poco distinto. Ahí la automatización no sólo ahorra ' +
        'horas — quita la variación, que suele valer más.');
    }

    partes.push('<b>La aritmética que casi nadie hace.</b> Atlassian lleva más de 200 ' +
      'automatizaciones propias; a dos minutos al día cada una son casi 1 500 horas al año. ' +
      'Dos minutos no se sienten y por eso no se cuentan: el ahorro no está en la automatización ' +
      'grande que se ve, está en la suma de las que no.');

    partes.push('<b>Y una advertencia sobre medir.</b> El estudio de Bloom a 30 000 fábricas ' +
      'encontró que vigilar y premiar CORRELACIONAN con más productividad. Correlacionan: no ' +
      'demuestran que causen. Una automatización que sirve sobre todo para vigilar mejor puede ' +
      'no estar mejorando nada — sólo enseñándolo con más resolución.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De dos sitios. La aritmética, de <i>«How Atlassian Automation accelerates
  work across Confluence, Jira and Jira Service Management»</i>: más de 200
  automatizaciones que ahorren dos minutos al día cada una son <b>casi 1 500
  horas al año</b>. La advertencia, de <i>«Monitor, Measure, Incentivize»</i>,
  <i>MIT Sloan Management Review</i>, sobre el estudio de Nicholas Bloom
  (Stanford) a 30 000 fábricas estadounidenses con el censo.</p>

  <h3>Por qué la puerta va antes del número</h3>
  <p>Porque el error caro no es calcular mal el retorno: es calcularlo bien de
  una tarea que no debería existir. Automatizar un desperdicio da un
  desperdicio más rápido y con mantenimiento para siempre. Y se hace mucho,
  por una razón poco noble: <b>automatizar es visible</b> y se puede enseñar
  en una junta, mientras que quitar un paso hay que negociarlo con quien lo
  pidió.</p>
  <p>Por eso, cuando el paso no sobrevive las dos preguntas, este instrumento
  se niega a enseñar el retorno. Un número bonito al lado de la decisión
  equivocada es peor que no dar número.</p>

  <h3>Por qué el mantenimiento no es opcional</h3>
  <p>Porque es lo que convierte un ahorro en una deuda. Cambia el formato de
  un archivo, caduca una credencial, alguien renombra un campo. La cuenta sin
  mantenimiento siempre sale bien, y por eso siempre se hace sin él.</p>

  <h3>Lo que no mide</h3>
  <p>Cinco días por semana y cincuenta y dos semanas, sin vacaciones ni
  estacionalidad. No sabe si quien te la va a construir tiene tiempo, ni si el
  proceso va a cambiar el mes que viene — y ésa es la razón real de que un
  retorno a más de un año casi nunca se cumpla.</p>`
};
