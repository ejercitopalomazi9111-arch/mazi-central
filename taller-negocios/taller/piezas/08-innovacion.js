/* ══════════════════════════════════════════════════════════════════════════
   08 · INNOVACIÓN · Doce indicadores y ninguna pregunta
   ──────────────────────────────────────────────────────────────────────────
   De «Creating Better Innovation Measurement Practices», MIT Sloan Management
   Review (Richtnér, Brattström, Frishammar, Björk y Magnusson).

   Lo que dice el artículo, y es lo contrario de lo que uno espera:

   · El problema NO es encontrar indicadores. No hay escasez: los hay de
     RESULTADO (ventas de productos nuevos), de PROCESO (proyectos en curso),
     de ENTRADA (ideas generadas) y de CARTERA (qué porcentaje va a rupturas
     contra extensiones de línea).
   · Buscar el indicador perfecto es «a menudo inútil».
   · Lo que decide es entender QUÉ PROBLEMA tiene que resolver la medición
     para esta organización, y diseñar el marco desde ahí.
   · Y los errores más insidiosos: darle más valor al dato que al significado,
     y empantanarse con demasiadas medidas que se contradicen entre sí e
     incentivan a la gente a hacer lo que no toca.
   · Identificar las preguntas correctas suele ser más difícil que encontrar
     las respuestas.

   ── QUÉ CALCULA ─────────────────────────────────────────────────────────
   Dos cosas, y la segunda es la que muerde:
   1. El reparto de tus indicadores en los cuatro tipos, y si estás midiendo
      sólo una parte del recorrido.
   2. Si el número de indicadores creció por encima de lo que la organización
      puede usar — con la comprobación que lo delata: cuántos han hecho que se
      cancele algo.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'innovacion', n:8, materia:'Innovación',
  nombre:'Doce indicadores y ninguna pregunta',
  que:'Reparte tus indicadores de innovación en los cuatro tipos que existen y comprueba lo único que importa: cuántos han hecho que alguien decidiera algo distinto.',

  intro:`<div class="nota"><b>Cómo se usa.</b> Cuenta los indicadores de
  innovación que se reportan HOY, no los que están en la política. Y en la
  última pregunta sé duro contigo: un indicador que nunca cambió una decisión
  es un adorno caro, por bien calculado que esté.</div>`,

  campos:[
    { grupo:'Qué mides, y de qué tipo',
      grupoAyuda:'Los cuatro tipos que nombra el estudio. Cuenta indicadores, no proyectos.',
      id:'entrada', tipo:'numero', etiqueta:'De ENTRADA: ideas generadas, propuestas, gasto en I+D', ejemplo:'p. ej. 3' },
    { grupo:'Qué mides, y de qué tipo', id:'proceso', tipo:'numero',
      etiqueta:'De PROCESO: proyectos en curso, tiempo de ciclo, etapas superadas', ejemplo:'p. ej. 4' },
    { grupo:'Qué mides, y de qué tipo', id:'resultado', tipo:'numero',
      etiqueta:'De RESULTADO: ventas de productos nuevos, clientes ganados', ejemplo:'p. ej. 2' },
    { grupo:'Qué mides, y de qué tipo', id:'cartera', tipo:'numero',
      etiqueta:'De CARTERA: % en rupturas contra extensiones de línea', ejemplo:'p. ej. 0' },

    { grupo:'La comprobación que duele',
      grupoAyuda:'Un indicador que no cambia decisiones no está midiendo: está decorando.',
      id:'decidieron', tipo:'numero',
      etiqueta:'De todos ésos, ¿cuántos han hecho que se cancele o se cambie algo en el último año?', ejemplo:'p. ej. 1' },
    { grupo:'La comprobación que duele', id:'problema', tipo:'escala', hasta:5,
      pies:['nadie lo escribió','está escrito y todos lo dirían igual'],
      etiqueta:'¿Está claro QUÉ problema resuelve medir esto?' },
    { grupo:'La comprobación que duele', id:'contradicen', tipo:'escala', hasta:5,
      pies:['nunca se contradicen','tiran para lados contrarios'],
      etiqueta:'¿Los indicadores se contradicen entre sí?' },
    { grupo:'La comprobación que duele', id:'premiado', tipo:'escala', hasta:5,
      pies:['a nadie','a mucha gente'],
      etiqueta:'¿A cuánta gente se le premia por estos números?' },
  ],

  calcular: function(V){
    var n = function(x){ return (x === '' || x === undefined) ? null : Number(x); };
    var e = n(V.entrada), p = n(V.proceso), r = n(V.resultado), ca = n(V.cartera);
    var d = n(V.decidieron);
    var puestos = [e,p,r,ca].filter(function(x){ return x !== null; }).length;
    if(puestos < 4) return { tono:'',
      datos:[['Tipos contados', puestos + ' de 4', '', puestos*25]],
      veredicto:'<p>Faltan tipos. Los cuatro, aunque alguno sea cero — <b>sobre todo</b> si alguno ' +
                'es cero: un cero ahí es el hallazgo, no un hueco.</p>' };

    var total = e + p + r + ca;
    if(total === 0) return { tono:'aviso', datos:[['Indicadores','0','']],
      veredicto:'<p><span class="cabeza">No mides nada.</span>Eso es un problema distinto y más ' +
                'fácil: aquí no hay que quitar, hay que empezar. Y se empieza por la pregunta, ' +
                'no por el indicador — ¿qué decisión quieres poder tomar con el número?</p>' };

    var vacios = [];
    if(e === 0) vacios.push('entrada');
    if(p === 0) vacios.push('proceso');
    if(r === 0) vacios.push('resultado');
    if(ca === 0) vacios.push('cartera');

    var utiles = (d === null) ? null : d;
    var porUtil = (utiles === null || total === 0) ? null : utiles * 100 / total;

    var datos = [
      ['Indicadores', total + '', 'los que se reportan hoy'],
      ['Entrada', e + '', 'ideas, propuestas, gasto'],
      ['Proceso', p + '', 'proyectos, ciclo, etapas'],
      ['Resultado', r + '', 'ventas de lo nuevo'],
      ['Cartera', ca + '', 'rupturas contra extensiones'],
    ];
    if(porUtil !== null){
      datos.push(['Cambiaron una decisión', utiles + ' de ' + total,
                  Math.round(porUtil) + ' %', porUtil]);
    }

    var partes = [], tono;

    if(porUtil !== null && porUtil <= 20 && total >= 5){
      tono = 'mal';
      partes.push('<span class="cabeza">' + total + ' indicadores y ' + utiles +
        ' que hayan cambiado algo.</span>' +
        'El ' + Math.round(porUtil) + ' %. Los otros ' + (total - utiles) + ' se calculan, se ' +
        'reportan y no mueven nada — cuestan trabajo cada mes y no compran ninguna decisión. ' +
        'El estudio lo dice sin rodeos: uno de los errores más insidiosos es empantanarse con ' +
        'demasiadas medidas.');
    } else if(total >= 10){
      tono = 'aviso';
      partes.push('<span class="cabeza">' + total + ' indicadores es mucho.</span>' +
        'No porque haya un número correcto, sino porque a partir de ahí empiezan a contradecirse ' +
        'entre sí, y cuando dos números piden cosas contrarias la gente escoge el que le premian.');
    } else if(porUtil !== null && porUtil >= 50){
      tono = 'bien';
      partes.push('<span class="cabeza">Más de la mitad cambia decisiones.</span>' +
        utiles + ' de ' + total + '. Eso ya no es un tablero: es un instrumento. Lo que toca ' +
        'aquí no es añadir, es cuidar que siga así cuando alguien proponga el indicador número ' +
        (total + 1) + '.');
    } else {
      tono = 'aviso';
      partes.push('<span class="cabeza">' + total + ' indicadores repartidos así.</span>' +
        'Ni pocos ni demasiados. Lo que decide si sirven no es el número: es si contestan una ' +
        'pregunta que alguien se hizo.');
    }

    if(vacios.length === 1){
      partes.push('<b>No mides nada de ' + vacios[0] + '.</b> Los cuatro tipos miran tramos ' +
        'distintos del mismo recorrido; con uno vacío hay un tramo del que no te enteras hasta ' +
        'que sale por el otro lado.' +
        (vacios[0] === 'cartera'
          ? ' Y de los cuatro, cartera es el que más se olvida y el que más dice: sin él no ' +
            'sabes qué parte de tu innovación son rupturas y qué parte son extensiones de línea ' +
            'con nombre nuevo.'
          : ''));
    } else if(vacios.length >= 2){
      partes.push('<b>Hay ' + vacios.length + ' tipos en cero: ' + vacios.join(' y ') + '.</b> ' +
        'Todo lo que mides mira el mismo tramo. Eso no es medir la innovación: es medir la parte ' +
        'de la innovación que era fácil de contar.');
    }

    if(V.problema && V.problema <= 2){
      partes.push('<b>Y nadie escribió qué problema resuelve medir esto.</b> Ahí está el nudo del ' +
        'artículo: el reto no es encontrar indicadores —no hay escasez— ni dar con el perfecto, ' +
        'que es una búsqueda casi siempre inútil. El reto es entender qué problema tiene que ' +
        'resolver la medición aquí, y diseñar desde ahí. Identificar las preguntas correctas ' +
        'suele ser más difícil que encontrar las respuestas.');
    }

    if(V.contradicen && V.contradicen >= 4){
      partes.push('<b>Y se contradicen.</b> Es el segundo error insidioso del estudio, y no se ' +
        'resuelve con más indicadores: se resuelve quitando. Cuando dos números piden cosas ' +
        'contrarias, la organización no promedia — escoge, y escoge el que tiene premio.');
    }

    if(V.premiado && V.premiado >= 4 && porUtil !== null && porUtil <= 30){
      partes.push('<b>Y se premia por números que no deciden nada.</b> Ésa es la combinación cara: ' +
        'indicadores que no cambian decisiones pero sí cambian nóminas. Lo que se optimiza ' +
        'entonces es el indicador, no la innovación — y con toda razón, porque es lo que se pidió.');
    }

    if(porUtil !== null && utiles < total){
      partes.push('<b>El movimiento concreto:</b> toma los ' + (total - utiles) + ' que no han ' +
        'cambiado nada y, por cada uno, escribe la decisión que debería poder tomarse con él. ' +
        'Los que no tengan frase, se quitan. No se archivan: se quitan del reporte, que es donde ' +
        'cuestan.');
    }

    partes.push('<b>Y lo que este instrumento NO hace.</b> No te dice cuántos indicadores tener — ' +
      'no hay número correcto y el que te lo diga te está vendiendo algo. Tampoco sabe si los que ' +
      'cambiaron decisiones las cambiaron BIEN. Sólo separa lo que se usa de lo que se reporta, ' +
      'que resulta ser la separación que casi nadie hace.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«Creating Better Innovation Measurement Practices»</i>, <i>MIT Sloan
  Management Review</i>, de Anders Richtnér, Anna Brattström, Johan Frishammar,
  Jennie Björk y Mats Magnusson.</p>

  <h3>Los cuatro tipos</h3>
  <p>El artículo los nombra así: de <b>resultado</b> (ventas de productos
  nuevos), de <b>proceso</b> (proyectos de innovación en curso), de
  <b>entrada</b> (ideas generadas) y de <b>cartera</b> (qué porcentaje de la
  inversión va a proyectos de ruptura frente a extensiones de línea).</p>

  <h3>La idea que le da la vuelta a todo</h3>
  <p>Que el reto <b>no</b> es identificar métricas: no hay escasez. Ni
  encontrar la perfecta, que es una búsqueda a menudo inútil. El nudo es
  entender qué problema tiene que resolver la medición para esta organización
  y diseñar el marco desde ahí — y el propio artículo avisa de que
  <b>identificar las preguntas correctas suele ser más difícil que encontrar
  las respuestas</b>.</p>
  <p>Los dos errores que llama insidiosos: darle más valor al dato que al
  significado, y empantanarse con demasiadas medidas que se contradicen y
  acaban incentivando a la gente a hacer lo que no toca.</p>

  <h3>Por qué la pregunta de «cuántos cambiaron una decisión»</h3>
  <p>Porque es la única que no se puede contestar de adorno. Un indicador bien
  calculado, bien graficado y que nunca hizo que se cancelara ni se cambiara
  nada no está midiendo: está decorando, y cuesta trabajo cada mes.</p>

  <h3>Lo que no mide</h3>
  <p>No dice cuántos indicadores hay que tener — no existe ese número. No sabe
  si las decisiones que cambiaron fueron buenas. Y cuenta lo que se reporta
  hoy, no lo que dice la política: si esos dos números no coinciden, ése ya es
  otro hallazgo.</p>`
};
