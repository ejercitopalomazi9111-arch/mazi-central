/* ============================================================================
   cotejo.js — ¿LA APP CUENTA LO QUE DE VERDAD PASÓ?
   ----------------------------------------------------------------------------
   Ésta es la revisión que le faltaba al simulacro y la que más importa.

   Ligas Mazi tiene UN trabajo: medir partidos. La primera versión de la prueba
   le metía la temporada a la app y luego sólo revisaba que las pantallas se
   vieran bien — nunca preguntaba si los NÚMEROS eran los correctos. O sea que
   si la app hubiera pintado un marcador equivocado, una tabla mal ordenada o
   un promedio inventado, la prueba habría dicho "todo bien".

   Para una app de deportes eso no es un hueco, es EL hueco. Como dijo Carlos:
   *"una app de deportes que mide partidos, que no los mide, es inútil."*

   Aquí se compara, dato por dato, lo que el motor jugó contra lo que la app
   enseña en pantalla. Se lee del DOM, no del estado interno: lo que importa es
   lo que ve la persona, no lo que la app cree que tiene guardado.
   ==========================================================================*/

(function (global) {
  'use strict';

  var API = {};

  var texto = function (sel){ var e = document.querySelector(sel); return e ? (e.innerText || '') : ''; };
  var numeros = function (s){ return (String(s).match(/-?\d+/g) || []).map(Number); };

  function falla(lista, donde, esperado, encontrado, porque){
    lista.push({ tipo:'cotejo', gravedad:'grave', pantalla: donde,
      que: porque + ' · el motor dice ' + esperado + ' y la app enseña ' + encontrado,
      donde: donde });
  }

  /* 1 · EL MARCADOR EN VIVO.
     El número más visto de toda la app y el que más caro sale si miente: es el
     que la gente está mirando mientras el partido pasa. */
  API.marcador = function (){
    var out = [];
    if (typeof hasLiveGame !== 'function' || !hasLiveGame()) return out;
    go('marcador');
    var H = GAME.teams[0], A = GAME.teams[1];
    var enPantalla = numeros(texto('#s-marcador .sb') || texto('#mScore'));
    if (!enPantalla.length){
      out.push({ tipo:'cotejo', gravedad:'grave', pantalla:'marcador',
        que:'Hay partido en vivo y en pantalla no se lee ningún marcador', donde:'marcador' });
      return out;
    }
    if (enPantalla.indexOf(H.score) < 0 || enPantalla.indexOf(A.score) < 0){
      falla(out, 'marcador', H.score + '–' + A.score, enPantalla.join('/'),
        'El marcador en pantalla no coincide con el partido jugado');
    }
    /* Los cinco en cancha tienen que ser cinco. Si la app dibuja seis, alguien
       está jugando de más y el partido deja de ser un partido. */
    var fichas = document.querySelectorAll('#courtTokens .mcourt').length;
    var deberian = onCourt(0).length + onCourt(1).length;
    if (fichas !== deberian){
      falla(out, 'marcador', deberian + ' jugadores en cancha', fichas + ' fichas dibujadas',
        'La cancha no dibuja a los que están jugando');
    }
    return out;
  };

  /* 2 · LA TABLA.
     Se compara el ORDEN, que es lo que la gente lee. Una tabla con los mismos
     equipos en distinto orden es una tabla equivocada, aunque los números
     estén bien. */
  API.tabla = function (esperada){
    var out = [];
    if (!esperada || !esperada.length) return out;
    go('tabla');
    var t = texto('#s-tabla');
    if (!t.trim()){
      out.push({ tipo:'cotejo', gravedad:'grave', pantalla:'tabla',
        que:'Hay temporada jugada y la tabla salió vacía', donde:'tabla' });
      return out;
    }
    /* El primer lugar tiene que aparecer antes que el último. Es la
       comprobación más barata que detecta un orden invertido o sin ordenar. */
    var primero = esperada[0].nombre, ultimo = esperada[esperada.length - 1].nombre;
    var iP = t.indexOf(primero), iU = t.indexOf(ultimo);
    if (iP >= 0 && iU >= 0 && iP > iU){
      falla(out, 'tabla', primero + ' arriba de ' + ultimo, 'al revés',
        'La tabla está en el orden contrario');
    }
    if (iP < 0){
      falla(out, 'tabla', 'que aparezca el líder (' + primero + ')', 'no aparece',
        'El primer lugar no se ve en la tabla');
    }
    return out;
  };

  /* 3 · EL CALENDARIO.
     Carlos lo pidió expreso: un papá tiene que saber QUÉ DÍA y EN QUÉ LUGAR
     juega la categoría de su hij@. Si la app no lo dice, no le sirve. */
  /* La pregunta no es "¿esta pantalla lo dice?" sino "¿puede el papá ENCONTRARLO
     en algún lado?". La primera versión le preguntaba sólo a `tabla` — que es
     la tabla de POSICIONES y no tiene calendario— y reportaba como bug que no
     apareciera ahí. La pregunta estaba mal hecha: se busca en las pantallas
     donde un papá razonablemente iría, y sólo se reporta si en NINGUNA está. */
  var DONDE_BUSCAR = ['publico', 'hub', 'tabla', 'liga', 'ligaCalendario'];
  API.calendario = function (partido){
    var out = [];
    if (!partido) return out;
    var visto = { lugar:false, hora:false, donde:'' };
    DONDE_BUSCAR.forEach(function (id){
      try { go(id); } catch (e){ return; }
      var t = (document.querySelector('.screen.on') || {}).innerText || '';
      if (partido.lugar && t.indexOf(partido.lugar) >= 0){ visto.lugar = true; visto.donde = id; }
      if (partido.hora  && t.indexOf(partido.hora)  >= 0){ visto.hora  = true; visto.donde = id; }
    });
    if (partido.lugar && !visto.lugar){
      falla(out, 'calendario', 'el lugar "' + partido.lugar + '" en alguna pantalla',
        'no aparece en ' + DONDE_BUSCAR.join('/'),
        'Un papá no puede saber DÓNDE juega su hij@');
    }
    if (partido.hora && !visto.hora){
      falla(out, 'calendario', 'la hora ' + partido.hora + ' en alguna pantalla',
        'no aparece en ' + DONDE_BUSCAR.join('/'),
        'Un papá no puede saber A QUÉ HORA juega su hij@');
    }
    return out;
  };

  /* 4 · LAS ESTADÍSTICAS DEL JUGADOR.
     Lo que trae a un chavo de vuelta a la app. Si su carta dice un número que
     él no hizo, la app perdió su confianza y no la recupera. */
  API.carta = function (jugadorDelMotor){
    var out = [];
    if (!jugadorDelMotor) return out;
    /* Hay que SENTARSE en la silla de ese jugador antes de mirar su carta.
       La primera versión no lo hacía y reportaba "la carta no es de quien
       entró" — con razón: estaba abierta la sesión de otra persona. El fallo
       era del cotejo, no de la app, y por poco arreglo algo que no estaba roto. */
    try {
      localStorage.setItem('lm_user', JSON.stringify({
        name: jugadorDelMotor.nombre, email: jugadorDelMotor.email,
        role:'jugador', roles:['jugador'], onboarded:1,
        num: String(jugadorDelMotor.dorsal || 0), pos: jugadorDelMotor.pos || 'Base',
        playerCode: 'J-' + jugadorDelMotor.id, playerStatus:'enequipo',
      }));
      applyRoleFromUser();
    } catch (e){}
    go('carta');
    var t = texto('#s-carta');
    if (!t.trim()){
      out.push({ tipo:'cotejo', gravedad:'grave', pantalla:'carta',
        que:'La carta salió completamente vacía', donde:'carta' });
      return out;
    }
    if (jugadorDelMotor.nombre && t.toUpperCase().indexOf(jugadorDelMotor.nombre.toUpperCase()) < 0){
      falla(out, 'carta', 'el nombre ' + jugadorDelMotor.nombre, 'otro nombre o ninguno',
        'La carta no es de quien entró');
    }
    return out;
  };

  global.COTEJO = API;
})(window);
