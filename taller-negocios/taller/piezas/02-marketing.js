/* ══════════════════════════════════════════════════════════════════════════
   02 · MARKETING · El choque entre segmentos
   ──────────────────────────────────────────────────────────────────────────
   De «The Growth Equation: Avoid Customer-segment Collisions», Nano Tools for
   Leaders, una colaboración entre Wharton Executive Education y el Center for
   Leadership and Change Management de Wharton.

   La idea del original: crecer trae segmentos nuevos, y los segmentos nuevos
   quieren cosas contrarias a las de los viejos. Uno pide exclusividad y otro
   accesibilidad; uno innovación y otro tradición. La tensión no se ve el
   primer trimestre — aparece cuando los dos coinciden en el mismo sitio.

   Y su corrección más útil, que es la que casi nadie aplica: NO SEGMENTAR POR
   DEMOGRAFÍA. Se segmenta por el valor que cada grupo saca, y se le pone a
   cada uno un nombre que diga su motivo. Un segmento llamado «25-34» no
   permite anticipar nada; uno llamado «los que compran para regalar» sí.

   ── CÓMO SALE EL NÚMERO ────────────────────────────────────────────────
   Dos segmentos, cuatro ejes. La DISTANCIA es la media de las diferencias en
   los cuatro ejes, en tanto por uno. El SOLAPE es en cuántos de los cuatro
   puntos de contacto se cruzan los dos.

   El riesgo NO es la distancia sola: dos segmentos opuestos que nunca se ven
   conviven perfectamente —eso es tener dos marcas—. El riesgo es distancia
   POR solape, y por eso se multiplican. Esa multiplicación es la única
   aportación de este instrumento; lo demás es del original.
   ═════════════════════════════════════════════════════════════════════════ */
export const PIEZA = {
  id:'marketing', n:2, materia:'Marketing',
  nombre:'El choque entre segmentos',
  que:'Calcula si dos grupos de clientes tuyos quieren cosas contrarias y además se cruzan en los mismos sitios — que es cuando la marca se vuelve borrosa.',

  intro:`<div class="nota"><b>Antes de empezar: nómbralos por su motivo.</b>
  «25-34 años» no sirve — la demografía es fácil de conseguir y no es la causa
  de la compra. «Los que compran para regalar» y «los que reponen cada mes» sí:
  con esos nombres se puede anticipar en qué van a chocar. Si no sabes el
  motivo de un segmento, ese es el trabajo pendiente, no esto.</div>`,

  campos:[
    { grupo:'Los dos segmentos', grupoAyuda:'Nómbralos por lo que buscan, no por su edad ni su código postal.',
      id:'a', tipo:'texto', etiqueta:'Segmento A', ejemplo:'Los que compran para regalar' },
    { grupo:'Los dos segmentos', id:'b', tipo:'texto', etiqueta:'Segmento B', ejemplo:'Los que reponen cada mes' },

    { grupo:'Qué quiere cada uno', grupoAyuda:'1 = el extremo izquierdo · 5 = el derecho. Puntúa cada segmento en el mismo eje.',
      id:'a1', tipo:'escala', hasta:5, pies:['exclusividad','que sea para todos'],
      etiqueta:'A · exclusivo ↔ accesible' },
    { grupo:'Qué quiere cada uno', id:'b1', tipo:'escala', hasta:5, pies:['exclusividad','que sea para todos'],
      etiqueta:'B · exclusivo ↔ accesible' },
    { grupo:'Qué quiere cada uno', id:'a2', tipo:'escala', hasta:5, pies:['tradición','novedad'],
      etiqueta:'A · tradición ↔ novedad' },
    { grupo:'Qué quiere cada uno', id:'b2', tipo:'escala', hasta:5, pies:['tradición','novedad'],
      etiqueta:'B · tradición ↔ novedad' },
    { grupo:'Qué quiere cada uno', id:'a3', tipo:'escala', hasta:5, pies:['precio bajo','servicio alto'],
      etiqueta:'A · precio ↔ servicio' },
    { grupo:'Qué quiere cada uno', id:'b3', tipo:'escala', hasta:5, pies:['precio bajo','servicio alto'],
      etiqueta:'B · precio ↔ servicio' },
    { grupo:'Qué quiere cada uno', id:'a4', tipo:'escala', hasta:5, pies:['que nadie lo sepa','que se note'],
      etiqueta:'A · discreción ↔ que se note' },
    { grupo:'Qué quiere cada uno', id:'b4', tipo:'escala', hasta:5, pies:['que nadie lo sepa','que se note'],
      etiqueta:'B · discreción ↔ que se note' },

    { grupo:'Dónde se cruzan',
      grupoAyuda:'Los sitios donde los dos segmentos ven lo mismo. Aquí es donde el choque se vuelve visible.',
      id:'c1', tipo:'escala', hasta:5, pies:['nunca','siempre'], etiqueta:'¿Ven la misma tienda o el mismo sitio web?' },
    { grupo:'Dónde se cruzan', id:'c2', tipo:'escala', hasta:5, pies:['nunca','siempre'], etiqueta:'¿Reciben los mismos mensajes y campañas?' },
    { grupo:'Dónde se cruzan', id:'c3', tipo:'escala', hasta:5, pies:['nunca','siempre'], etiqueta:'¿Se cruzan en redes, reseñas o comunidad?' },
    { grupo:'Dónde se cruzan', id:'c4', tipo:'escala', hasta:5, pies:['nunca','siempre'], etiqueta:'¿Comparten el mismo producto y el mismo precio?' },

    { grupo:'Cuánto estira la marca',
      grupoAyuda:'Lo pone el cliente, no la empresa. Si no lo has preguntado, no lo sabes: puntúa bajo.',
      id:'estira', tipo:'escala', hasta:5, pies:['una sola cosa','muchas cosas'],
      etiqueta:'¿Cuánto admite el cliente que signifique tu marca?' },
  ],

  calcular: function(V){
    var EJES = ['exclusivo/accesible','tradición/novedad','precio/servicio','discreción/notoriedad'];
    var pares = [['a1','b1'],['a2','b2'],['a3','b3'],['a4','b4']];
    var puestos = pares.filter(function(p){ return V[p[0]] > 0 && V[p[1]] > 0; });
    var cruces = ['c1','c2','c3','c4'].map(function(k){ return V[k]; }).filter(function(x){ return x > 0; });

    if(puestos.length < 4 || cruces.length < 4) return { tono:'',
      datos:[['Ejes puntuados', puestos.length + ' de 4', '', puestos.length*25],
             ['Cruces puntuados', cruces.length + ' de 4', '', cruces.length*25]],
      veredicto:'<p>Faltan casillas. La lectura sale con los cuatro ejes y los cuatro cruces.</p>' };

    /* distancia media, normalizada: la máxima separación posible en una escala
       de 1 a 5 son cuatro puntos, así que se divide entre 4. */
    var difs = pares.map(function(p){ return Math.abs(V[p[0]] - V[p[1]]); });
    var distancia = difs.reduce(function(a,b){ return a+b; }, 0) / (4*4);
    var solape = cruces.reduce(function(a,b){ return a+b; }, 0) / (4*5);
    var riesgo = distancia * solape;

    var mayor = difs.indexOf(Math.max.apply(null, difs));
    var datos = [
      ['Distancia entre los dos', Math.round(distancia*100) + '%', 'de lo que cabe', distancia*100],
      ['Se cruzan', Math.round(solape*100) + '%', 'de los puntos', solape*100],
      ['Riesgo de choque', Math.round(riesgo*100) + '%', '', riesgo*100],
    ];
    var partes = [], tono;

    if(riesgo >= 0.45){
      tono = 'mal';
      partes.push('<span class="cabeza">Estos dos segmentos van a chocar, y ya.</span>' +
        'Quieren cosas contrarias <b>y</b> se ven en los mismos sitios. Eso no se arregla con ' +
        'mejor redacción: hay que separar algo — una submarca, una línea, un canal o un precio. ' +
        'Mientras compartan escaparate, cada mensaje que le funcione a uno le va a sonar mal al otro.');
    } else if(riesgo >= 0.22){
      tono = 'aviso';
      partes.push('<span class="cabeza">Hay tensión y todavía se puede gestionar.</span>' +
        'Todavía no es un choque abierto, pero va en esa dirección si el segundo segmento crece. ' +
        'El momento de decidir es ahora, no cuando se note.');
    } else if(distancia >= 0.4){
      tono = 'bien';
      partes.push('<span class="cabeza">Son muy distintos y no se ven.</span>' +
        'Distancia alta con poco cruce es lo que la gente llama, sin decirlo, «tener dos marcas», ' +
        'y funciona. Lo que hay que vigilar no es la distancia: es que no se abra un sitio nuevo ' +
        'donde los dos coincidan.');
    } else {
      tono = 'bien';
      partes.push('<span class="cabeza">No hay choque a la vista.</span>' +
        'Los dos segmentos quieren cosas parecidas. Vigila lo contrario: si son <b>tan</b> ' +
        'parecidos, quizá no sean dos segmentos sino uno partido en dos por costumbre.');
    }

    partes.push('Donde más se separan es en <b>' + EJES[mayor] + '</b> (' + difs[mayor] +
      ' de 4 puntos). Ése es el eje donde se van a notar las quejas primero.');

    if(V.estira > 0){
      datos.push(['La marca estira', V.estira + ' de 5', '', V.estira*20]);
      if(V.estira <= 2 && distancia >= 0.35)
        partes.push('<b>Y la marca no estira.</b> Con un significado tan estrecho, meter al ' +
          'segundo segmento debajo del mismo nombre no lo va a acomodar: lo va a volver borroso ' +
          'para los dos. Una marca que estira demasiado no se rompe de golpe — se desdibuja, ' +
          'que es peor porque no avisa.');
      else if(V.estira >= 4)
        partes.push('La marca estira bastante, así que hay margen. Ojo: ese margen lo pone el ' +
          'cliente. Si no se lo has preguntado, esta casilla es una opinión de la casa.');
    }

    return { tono:tono, datos:datos, veredicto:'<p>' + partes.join('</p><p>') + '</p>' };
  },

  ayuda:`<h2>De dónde sale esto</h2>
  <p>De <i>«The Growth Equation: Avoid Customer-segment Collisions»</i>, de la
  serie <b>Nano Tools for Leaders</b>, colaboración entre Wharton Executive
  Education y el Center for Leadership and Change Management de Wharton.</p>

  <h3>Segmentar por el motivo, no por la edad</h3>
  <p>Es la corrección más útil del original y la que casi nadie aplica. La
  demografía viene ya medida y por eso se usa; el motivo hay que preguntarlo.
  Pero un segmento llamado «25-34» no permite anticipar con quién va a chocar,
  y uno llamado «los que compran para regalar» sí. Si dentro de un segmento
  tuyo hay dos comportamientos de compra distintos, no es un segmento: son dos.</p>

  <h3>Por qué se multiplican distancia y solape</h3>
  <p>Porque el riesgo no es la distancia sola. Dos segmentos opuestos que no se
  ven nunca conviven perfectamente — eso es, sin decirlo, tener dos marcas. El
  daño aparece cuando quieren cosas contrarias <b>y</b> además coinciden en el
  escaparate, en la campaña o en la sección de reseñas. Por eso el número final
  es el producto y no la suma.</p>

  <h3>Lo que no mide</h3>
  <p>No sabe cuánto vale cada segmento ni cuál conviene. Mide una sola cosa: si
  van a chocar y dónde. La decisión de a cuál servir es tuya, y este instrumento
  no la sustituye — sólo hace que se tome a tiempo.</p>`
};
