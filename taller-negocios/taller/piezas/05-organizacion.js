/* ══════════════════════════════════════════════════════════════════════════
   05 · ORGANIZACIÓN · Lo que cuesta esa junta
   ──────────────────────────────────────────────────────────────────────────
   De «The Surprising Science Behind Successful Remote Meetings», MIT Sloan
   Management Review, sobre más de veinte años de investigación en juntas y
   equipos.

   Del artículo salen los tres criterios que este instrumento usa, y ninguno
   es una opinión:

   · «No invites de más»: la calidad de una junta remota SE DESPLOMA conforme
     crece — y se puede grabar, así que a quien no es imprescindible se le
     suelta y escucha después al doble de velocidad.
   · «Pon bien el tiempo»: nada obliga a que dure una hora. Quince, veinte o
     veinticinco minutos crean una presión de tiempo que, según la
     investigación, hace rendir MEJOR al grupo.
   · «Afila la agenda»: escribir los puntos como PREGUNTAS y no como temas.
     Con preguntas se sabe a quién hay que invitar de verdad, y se sabe
     cuándo terminó la junta: cuando están contestadas.

   ── QUÉ CALCULA ESTE INSTRUMENTO ───────────────────────────────────────
   Las horas-persona al año de una junta recurrente, y qué parte de esas horas
   se recupera aplicando los tres criterios. En horas, no en dinero: poner un
   sueldo por hora inventa una precisión que no tenemos, y además convierte la
   conversación en «cuánto cuesta Fulano», que es otra pelea.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'organizacion', n:5, materia:'Organización',
  nombre:'Lo que cuesta esa junta',
  que:'Calcula las horas-persona al año de una junta que se repite, y cuántas devuelven los tres criterios que sí tienen investigación detrás.',

  intro:`<div class="nota"><b>Cómo se usa.</b> Piensa en UNA junta que se
  repite — la de los lunes, la semanal de proyecto, la de estado. No en todas
  las juntas: en una. Los tres interruptores de abajo no son opiniones sobre
  tu equipo, son los tres criterios del estudio.</div>`,

  campos:[
    { grupo:'La junta', grupoAyuda:'Una que se repita. La que más te pese.',
      id:'gente', tipo:'numero', etiqueta:'¿Cuánta gente entra?', ejemplo:'p. ej. 9' },
    { grupo:'La junta', id:'minutos', tipo:'numero',
      etiqueta:'¿Cuántos minutos dura?', ejemplo:'p. ej. 60' },
    { grupo:'La junta', id:'alMes', tipo:'numero',
      etiqueta:'¿Cuántas veces al mes?', ejemplo:'p. ej. 4' },

    { grupo:'Los tres criterios',
      grupoAyuda:'Los del estudio, no los míos. Contesta como es hoy, no como debería ser.',
      id:'agenda', tipo:'escala', hasta:5, pies:['no hay o son temas','son preguntas por contestar'],
      etiqueta:'¿Cómo viene la agenda?' },
    { grupo:'Los tres criterios', id:'imprescindibles', tipo:'numero',
      etiqueta:'De esa gente, ¿cuántos son imprescindibles?', ejemplo:'p. ej. 4' },
    { grupo:'Los tres criterios', id:'decide', tipo:'escala', hasta:5,
      pies:['nunca sale una decisión','siempre sale una decisión'],
      etiqueta:'¿Sale de ahí algo decidido?' },
    { grupo:'Los tres criterios', id:'grabada', tipo:'escala', hasta:5,
      pies:['si no vas, te lo perdiste','queda grabada o escrita'],
      etiqueta:'¿Se puede seguir sin haber ido?' },
  ],

  calcular: function(V){
    var n = function(x){ return (x === '' || x === undefined) ? null : Number(x); };
    var g = n(V.gente), m = n(V.minutos), f = n(V.alMes), imp = n(V.imprescindibles);
    var puestos = [g,m,f].filter(function(x){ return x !== null; }).length;
    if(puestos < 3) return { tono:'',
      datos:[['Datos de la junta', puestos + ' de 3', '', puestos*100/3]],
      veredicto:'<p>Faltan los tres primeros: cuánta gente, cuántos minutos y cuántas veces al mes. ' +
                'Sin los tres no hay cuenta que hacer.</p>' };
    if(g <= 0 || m <= 0 || f <= 0) return { tono:'aviso',
      datos:[['Horas-persona al año','0','']],
      veredicto:'<p><span class="cabeza">Algún dato es cero.</span>Una junta de cero personas, de cero ' +
                'minutos o que no ocurre no cuesta nada — y tampoco hay nada que revisar.</p>' };

    var horasAno = g * (m / 60) * f * 12;
    var datos = [
      ['Horas-persona al año', Math.round(horasAno).toLocaleString('es-MX'), 'sólo esta junta'],
      ['Equivale a', (horasAno / 8).toFixed(0) + ' jornadas', 'de 8 h, de una persona'],
      ['Por sesión', (g * m / 60).toFixed(1) + ' h', 'entre todos los que entran'],
    ];

    /* Lo recuperable, con las reglas del estudio y no con optimismo: */
    var ahorros = [], recupera = 0;

    if(imp !== null && imp > 0 && imp < g){
      var sobran = g - imp;
      var hSobran = sobran * (m / 60) * f * 12;
      recupera += hSobran;
      ahorros.push(['Invitados de más', Math.round(hSobran) + ' h/año', sobran + ' personas']);
    }
    if(m > 30){
      var recorte = (m - Math.max(25, Math.round(m * 0.5))) / 60;
      var hCorto = (imp !== null && imp > 0 ? Math.min(imp, g) : g) * recorte * f * 12;
      recupera += hCorto;
      ahorros.push(['Bajarla a ' + Math.max(25, Math.round(m * 0.5)) + ' min',
                    Math.round(hCorto) + ' h/año', 'presión de tiempo']);
    }
    ahorros.forEach(function(a){ datos.push(a); });
    if(recupera > 0){
      datos.push(['Recuperable al año', Math.round(recupera) + ' h',
                  Math.round(recupera * 100 / horasAno) + ' % de la junta',
                  recupera * 100 / horasAno]);
    }

    var partes = [], tono;
    var porCiento = recupera * 100 / horasAno;

    if(horasAno >= 400){
      tono = 'mal';
      partes.push('<span class="cabeza">' + Math.round(horasAno).toLocaleString('es-MX') +
        ' horas-persona al año, sólo esta junta.</span>' +
        'Son ' + (horasAno/8).toFixed(0) + ' jornadas completas de una persona. Ninguna junta ' +
        'necesita defenderse por existir — ésta sí, por ese tamaño.');
    } else if(horasAno >= 150){
      tono = 'aviso';
      partes.push('<span class="cabeza">' + Math.round(horasAno) + ' horas-persona al año.</span>' +
        (horasAno/8).toFixed(0) + ' jornadas. No es escandaloso y tampoco es gratis.');
    } else {
      tono = 'bien';
      partes.push('<span class="cabeza">' + Math.round(horasAno) + ' horas-persona al año.</span>' +
        'Es una junta barata. Si además sale algo decidido, déjala en paz.');
    }

    if(imp !== null && imp > 0 && imp < g){
      partes.push('<b>La mitad del gasto son invitados.</b> Dijiste que ' + imp + ' de ' + g +
        ' son imprescindibles: los otros ' + (g - imp) + ' cuestan ' +
        Math.round((g-imp) * (m/60) * f * 12) + ' horas al año. La regla del estudio es exacta: ' +
        'la calidad de una junta remota SE DESPLOMA conforme crece. Y el remedio no es dejarlos ' +
        'fuera a secas — es soltarlos <b>ofreciéndoles volver</b> cuando quieran al tema. ' +
        'Casi nunca vuelven, y agradecen que se les preguntara.');
    }

    if(m >= 60){
      partes.push('<b>Y dura una hora porque el calendario propone una hora.</b> Nada más. ' +
        'Quince, veinte o veinticinco minutos no son una junta a medias: la investigación dice ' +
        'que un grupo con algo de presión de tiempo rinde MEJOR, por foco y por estímulo.');
    }

    if(V.agenda && V.agenda <= 2){
      partes.push('<b>La agenda es de temas, no de preguntas.</b> Es el cambio más barato que hay ' +
        'y arregla dos cosas de un golpe: con la agenda escrita como PREGUNTAS por contestar se ' +
        'sabe a quién hay que invitar de verdad, y se sabe cuándo terminó la junta — cuando están ' +
        'contestadas. Un tema no se acaba nunca; una pregunta sí.');
    }

    if(V.decide && V.decide <= 2){
      partes.push('<b>Y de ahí no sale nada decidido.</b> Una junta que no decide es un documento ' +
        'que se lee en voz alta a ' + g + ' personas a la vez. Eso no es una junta cara: es un ' +
        'documento carísimo.');
    }

    if(V.grabada && V.grabada <= 2 && g > 4){
      partes.push('<b>Nadie puede seguirla sin ir.</b> Por eso van todos: faltar cuesta enterarse ' +
        'tarde. Grábala o escríbela y la asistencia deja de ser obligatoria — quien no entra la ' +
        'oye después al doble de velocidad, en su rato.');
    }

    if(porCiento > 0){
      partes.push('<b>El número accionable:</b> ' + Math.round(recupera) + ' horas al año, el ' +
        Math.round(porCiento) + ' % de esta junta, con dos cambios que no le quitan nada a nadie. ' +
        'No es un recorte: es la misma junta con menos gente sentada esperando su turno.');
    }

    partes.push('<b>Y lo que esta cuenta NO dice.</b> Está en horas a propósito: ponerle un sueldo ' +
      'por hora inventaría una precisión que no tenemos y convertiría la conversación en «cuánto ' +
      'cuesta Fulano». Tampoco sabe qué se pierde por no verse: una junta puede ser cara y valer ' +
      'la pena. Lo que sí sabe es cuánto vale exactamente y en qué se va.');

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«The Surprising Science Behind Successful Remote Meetings»</i>,
  <i>MIT Sloan Management Review</i>, que resume más de veinte años de
  investigación sobre juntas y equipos.</p>

  <h3>Los tres criterios, tal como los dice el artículo</h3>
  <p><b>No invitar de más.</b> La calidad de una junta remota se desploma
  conforme crece. A quien no es imprescindible se le suelta —y se le ofrece
  volver cuando quiera al tema, para que no se sienta apartado— y escucha la
  grabación después, al doble de velocidad.</p>
  <p><b>Poner bien el tiempo.</b> No hay ninguna razón para que dure una hora
  salvo que el calendario propone una hora. Quince, veinte o veinticinco
  minutos crean una presión de tiempo que hace rendir mejor al grupo.</p>
  <p><b>Afilar la agenda.</b> Los puntos escritos como preguntas por contestar
  y no como temas por discutir. Así se sabe a quién invitar y cuándo terminó.</p>
  <p>Y una idea de fondo: quien dirige una junta es el <b>administrador del
  tiempo de los demás</b>. Con un cliente importante nadie se atreve a hacerle
  perder la mañana; con el propio equipo, todo el tiempo.</p>

  <h3>Por qué en horas y no en pesos</h3>
  <p>Porque un sueldo por hora inventa una precisión que no tenemos, y porque
  convierte la conversación en «cuánto cuesta Fulano» — que es otra pelea, y
  además no es la que hay que tener.</p>

  <h3>Lo que no mide</h3>
  <p>No sabe qué se pierde por no verse, ni si esa junta es lo único que
  mantiene junto a un equipo disperso. Una junta puede ser cara y valer la
  pena. Este instrumento dice cuánto vale y en qué se va; si vale la pena lo
  decides tú, ya sabiendo el número.</p>`
};
