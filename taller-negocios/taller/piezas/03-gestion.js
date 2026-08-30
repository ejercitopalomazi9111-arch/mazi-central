/* ══════════════════════════════════════════════════════════════════════════
   03 · GESTIÓN DE EMPRESAS · El indicador que se despegó
   ──────────────────────────────────────────────────────────────────────────
   De «The Future of Strategic Measurement: Enhancing KPIs With AI», MIT Sloan
   Management Review, primer informe de 2024 sobre inteligencia artificial y
   estrategia de negocio, sobre una encuesta a más de 3 000 directivos y 17
   entrevistas a ejecutivos.

   El diagnóstico del original, que es el que importa aquí: los indicadores
   heredados fallan cada vez más en lo que más se les pide — seguir el avance,
   alinear a la gente y los procesos, priorizar recursos y sostener la
   rendición de cuentas.

   ── QUÉ CALCULA ESTE INSTRUMENTO ───────────────────────────────────────
   La correlación de Pearson entre la serie del indicador y la serie del
   resultado que dice representar, sobre los últimos seis periodos. Si el
   indicador sigue subiendo mientras el resultado se queda quieto o baja, la
   correlación se derrumba, y eso es exactamente lo que se llama «se despegó».

   ⚠ SEIS PUNTOS SON POCOS Y HAY QUE DECIRLO. Con seis periodos, una
   correlación tiene un intervalo de confianza enorme: esto es una alarma de
   humo, no una prueba. Sirve para abrir la conversación —«mira, llevan dos
   trimestres separándose»— y no para cerrarla. El instrumento lo dice en su
   propia lectura, no sólo aquí en el comentario.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'gestion', n:3, materia:'Gestión de empresas',
  nombre:'El indicador que se despegó',
  que:'Compara la serie de un indicador con la del resultado que dice representar, y calcula si siguen midiendo lo mismo.',

  intro:`<div class="nota"><b>Cómo se usa.</b> A la izquierda, el indicador que
  reportas —contactos, visitas, tickets cerrados, lo que sea—. A la derecha, el
  <b>resultado</b> que ese indicador existe para representar: ingresos, clientes
  que repiten, coste por caso. Seis periodos de cada uno, en el mismo orden y en
  las mismas unidades que uses tú. Los números no salen de aquí ni se envían a
  ningún sitio.</div>`,

  campos:(function(){
    var c = [];
    for(var i = 1; i <= 6; i++){
      c.push({ grupo:'El indicador que reportas',
               grupoAyuda: i === 1 ? 'Del periodo más antiguo al más reciente.' : undefined,
               id:'k'+i, tipo:'numero', etiqueta:'Periodo ' + i, ejemplo:'p. ej. 1200' });
    }
    for(var j = 1; j <= 6; j++){
      c.push({ grupo:'El resultado que representa',
               grupoAyuda: j === 1 ? 'Los MISMOS seis periodos, en el mismo orden.' : undefined,
               id:'r'+j, tipo:'numero', etiqueta:'Periodo ' + j, ejemplo:'p. ej. 380000' });
    }
    c.push({ grupo:'Una pregunta más', id:'premio', tipo:'escala', hasta:5,
             pies:['a nadie','al equipo entero'],
             grupoAyuda:'Ninguna métrica sobrevive a convertirse en objetivo sin vigilancia.',
             etiqueta:'¿A cuánta gente se le premia por este indicador?' });
    return c;
  })(),

  calcular: function(V){
    var K = [], R = [];
    for(var i = 1; i <= 6; i++){
      if(V['k'+i] !== '' && V['k'+i] !== undefined) K.push(Number(V['k'+i]));
      if(V['r'+i] !== '' && V['r'+i] !== undefined) R.push(Number(V['r'+i]));
    }
    if(K.length < 6 || R.length < 6) return { tono:'',
      datos:[['Periodos del indicador', K.length + ' de 6', '', K.length*100/6],
             ['Periodos del resultado', R.length + ' de 6', '', R.length*100/6]],
      veredicto:'<p>Faltan periodos. Hacen falta los seis de cada serie: con menos, ' +
                'cualquier número que saliera aquí sería un adorno.</p>' };

    var media = function(a){ return a.reduce(function(x,y){ return x+y; }, 0) / a.length; };
    var mk = media(K), mr = media(R);
    var num = 0, dk = 0, dr = 0;
    for(var j = 0; j < 6; j++){
      num += (K[j]-mk) * (R[j]-mr);
      dk  += (K[j]-mk) * (K[j]-mk);
      dr  += (R[j]-mr) * (R[j]-mr);
    }
    /* ⚠ SIN VARIACIÓN NO HAY CORRELACIÓN, Y NO ES UN CERO. Si una de las dos
       series es plana, el denominador es cero: dividir daría NaN, y pintar
       «NaN» o, peor, un 0 —que se leería como «se despegó»— sería inventar un
       hallazgo donde sólo falta información. */
    if(dk === 0 || dr === 0) return { tono:'aviso',
      datos:[['Correlación','—','sin variación']],
      veredicto:'<p><span class="cabeza">Una de las dos series no se mueve.</span>' +
        (dk === 0 ? 'El indicador es el mismo número seis veces. ' : 'El resultado es el mismo número seis veces. ') +
        'Sin variación no hay nada que correlacionar — no es que estén despegados, es que no ' +
        'hay información. Si de verdad el indicador no cambia en seis periodos, la pregunta ' +
        'no es si mide bien: es para qué se reporta.</p>' };

    var r = num / Math.sqrt(dk * dr);
    /* la tendencia de cada serie: primera mitad contra segunda */
    var tend = function(a){ return (media(a.slice(3)) - media(a.slice(0,3))) / Math.abs(media(a.slice(0,3)) || 1); };
    var tk = tend(K), tr = tend(R);

    var datos = [
      ['Correlación', r.toFixed(2), 'de −1 a 1', (r+1)*50],
      ['Tiende el indicador', (tk >= 0 ? '+' : '−') + Math.abs(Math.round(tk*100)) + '%', 'segunda mitad'],
      ['Tiende el resultado', (tr >= 0 ? '+' : '−') + Math.abs(Math.round(tr*100)) + '%', 'segunda mitad'],
    ];
    var partes = [], tono;

    if(r < 0){
      tono = 'mal';
      partes.push('<span class="cabeza">Se mueven en direcciones contrarias.</span>' +
        'Correlación de ' + r.toFixed(2) + ': cuando el indicador sube, el resultado baja. ' +
        'Esto ya no es un indicador que caducó — es uno que está premiando lo contrario de lo ' +
        'que la empresa quiere.');
    } else if(r < 0.3){
      tono = 'mal';
      partes.push('<span class="cabeza">El indicador se despegó del resultado.</span>' +
        'Con una correlación de ' + r.toFixed(2) + ' ya no están midiendo lo mismo. ' +
        'Puede que nunca lo midieran, o que se separaran al empezar a premiarlo: ninguna ' +
        'métrica sobrevive a convertirse en objetivo sin vigilancia.');
    } else if(r < 0.6){
      tono = 'aviso';
      partes.push('<span class="cabeza">Se están separando.</span>' +
        'Correlación de ' + r.toFixed(2) + ': hay relación, y es floja. Todavía sirve para ' +
        'seguir el avance a grandes rasgos, ya no para decidir a quién dar recursos.');
    } else {
      tono = 'bien';
      partes.push('<span class="cabeza">Siguen midiendo lo mismo.</span>' +
        'Correlación de ' + r.toFixed(2) + '. El indicador aguanta; conviene volver a mirarlo ' +
        'cada seis periodos, no cada año.');
    }

    if(tk > 0.1 && tr < 0){
      partes.push('<b>Y el patrón es el clásico:</b> el indicador sube ' +
        Math.round(tk*100) + ' % en la segunda mitad y el resultado baja ' +
        Math.abs(Math.round(tr*100)) + ' %. Eso es lo que se ve cuando se optimiza el ' +
        'indicador directamente en vez de lo que representaba.');
    }

    if(V.premio >= 4){
      partes.push('<b>Y se le premia a mucha gente.</b> Cuanto más se premia un indicador, ' +
        'más rápido se despega: la gente lo optimiza directamente, que es exactamente lo que ' +
        'se le pidió. La culpa no es de quien lo optimiza — es de quien lo eligió y no lo vigiló.');
    }

    partes.push('<b>Y un aviso sobre este número.</b> Seis periodos son pocos: una correlación ' +
      'con seis puntos tiene un margen enorme. Esto es una alarma de humo, no una prueba. ' +
      'Sirve para abrir la conversación, no para cerrarla.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«The Future of Strategic Measurement: Enhancing KPIs With AI»</i>,
  <i>MIT Sloan Management Review</i>, sobre una encuesta a más de 3 000
  directivos y 17 entrevistas a ejecutivos. El diagnóstico del informe:
  los indicadores heredados fallan cada vez más en lo que más se les pide —
  seguir el avance, alinear a la gente y los procesos, priorizar recursos y
  sostener la rendición de cuentas.</p>

  <h3>Qué es «despegarse»</h3>
  <p>Un indicador no se elige por ser importante: se elige por ser medible, y se
  acepta porque <b>representa</b> algo que sí importa. En cuanto se premia, la
  gente lo optimiza directamente — que es justo lo que se le pidió — y la
  representación se rompe. Desde dentro no se nota: el indicador sigue subiendo
  y las juntas siguen siendo cortas.</p>

  <h3>Por qué la correlación y no la diferencia</h3>
  <p>Porque las dos series están en unidades distintas y con magnitudes
  distintas: 1 200 contactos y 380 000 pesos no se pueden restar. La correlación
  no mira los valores sino si <b>se mueven juntas</b>, que es exactamente lo que
  significa «este indicador representa aquel resultado».</p>

  <h3>Lo que no mide, dicho de frente</h3>
  <p>Correlación no es causa: dos series pueden moverse juntas por un tercer
  motivo. Y seis puntos son pocos — el margen de error es enorme. Este
  instrumento sirve para notar a tiempo que dos líneas se separaron, que es una
  pregunta, no una conclusión. La conclusión hay que ir a buscarla.</p>`
};
