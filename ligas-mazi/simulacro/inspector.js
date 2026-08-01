/* ============================================================================
   inspector.js — EL QUE MIRA LA PANTALLA COMO SI FUERA UNA PERSONA
   ----------------------------------------------------------------------------
   Corre DENTRO de la página, no en Node. Le das una pantalla y te dice qué le
   pasa: si quedó vacía, si hay un botón que no se puede tocar con el dedo, si
   un texto se sale de su caja, si algo quedó invisible por color, o si un botón
   no hace nada.

   ── POR QUÉ ES GENÉRICO ──────────────────────────────────────────────────
   Carlos: *"trata de hacer que la herramienta pueda adaptarse a otras apps para
   no perder tiempo a futuro"*. Entonces aquí no hay una sola palabra de Ligas
   Mazi. Se configura con selectores:

     INSPECTOR.configurar({
       pantallas: '.screen',        // qué es una pantalla
       activa: 'on',                // la clase de la que se ve
       ignorar: ['.decorativo'],    // lo que no se revisa
     });

   Lo que sabe de Ligas Mazi vive en `app.mjs`, del lado de Node.

   ── POR QUÉ ADENTRO Y NO DESDE NODE ──────────────────────────────────────
   Son 570 personas por ~10 pantallas cada una: unas 5,700 revisiones. Hacerlas
   una por una desde Node es un viaje de ida y vuelta cada vez y el simulacro no
   acaba hoy. Adentro corren todas de un jalón.

   ── LO QUE NO HACE, Y SE DICE ────────────────────────────────────────────
   **No sabe si algo es bonito.** Mide lo que se puede medir: tamaño, desborde,
   vacío, color plano. El juicio de si se ve caro o barato es de la mesa de
   diseño, no de aquí. Decir lo contrario sería vender humo.
   ==========================================================================*/

(function (global) {
  'use strict';

  var CFG = { pantallas: '.screen', activa: 'on', ignorar: [] };
  var MIN_DEDO = 44;                 // mínimo cómodo de un objetivo táctil

  function visible(el){
    if (!el || !el.getBoundingClientRect) return false;
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function ignorado(el){
    for (var i = 0; i < CFG.ignorar.length; i++){
      try { if (el.closest(CFG.ignorar[i])) return true; } catch (e){}
    }
    /* Lo que está dentro de un desplegable CERRADO no se está viendo, así que
       no se juzga. Los motores siguen reportando cajas para ese contenido y por
       eso salía marcado como "texto invisible" algo que simplemente no está en
       pantalla todavía. */
    try { var d = el.closest('details'); if (d && !d.open) return true; } catch (e){}
    return false;
  }
  /* ¿El desborde lo causa un `::before` absoluto y transparente? Ése es el
     truco de agrandar el blanco táctil sin agrandar el dibujo — no se ve, no
     empuja nada y no saca barras de desplazamiento. Reportarlo sería castigar
     justo el arreglo correcto. */
  function esBlancoTactil(el){
    try {
      var pb = getComputedStyle(el, '::before');
      if (!pb || pb.content === 'none' || pb.position !== 'absolute') return false;
      var an = parseFloat(pb.width) || 0, al = parseFloat(pb.height) || 0;
      var r = el.getBoundingClientRect();
      return (an > r.width || al > r.height) && alfa(pb.backgroundColor) < 0.05;
    } catch (e){ return false; }
  }

  /* Color plano: el texto y su fondo REAL son el mismo color. Es el bug del
     tema claro ("Ver contacto" blanco sobre blanco), y no lo caza ninguna
     prueba de código — sólo mirar el resultado ya pintado. */
  /* Sube buscando el primer fondo que de verdad TAPE lo que hay detrás.
     ── Corregido después de la primera corrida de 570 personas ──
     La versión anterior tomaba el primer `background-color` distinto de
     transparente, y con eso reportó cuatro problemas graves que no existían:
     un velo de `rgba(255,255,255,.02)` lo leía como BLANCO OPACO, así que
     concluía que el texto blanco encima era invisible. Es al revés — ese velo
     casi no pinta nada y el fondo real sigue siendo el oscuro de atrás.
     Ahora se ignora todo lo que tenga menos de 50% de alfa. */
  function alfa(c){
    var m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return 1;
    var p = m[1].split(','); return p.length > 3 ? parseFloat(p[3]) : 1;
  }
  function fondoReal(el){
    var n = el;
    while (n && n !== document.documentElement){
      var s = getComputedStyle(n);
      /* Un degradado no es un color, y comparar contra él da resultados
         inventados: la pastilla de rango es texto oscuro sobre un degradado
         claro —perfectamente legible— y salía marcada como invisible. Si hay
         imagen de fondo, esta revisión no opina. */
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      if (s.backgroundColor && alfa(s.backgroundColor) >= 0.5) return s.backgroundColor;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  }
  function aRGB(c){
    var m = (c || '').match(/(\d+(?:\.\d+)?)/g);
    return m && m.length >= 3 ? [ +m[0], +m[1], +m[2] ] : null;
  }
  function luma(rgb){ return 0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2]; }

  var API = {
    configurar: function (o){ for (var k in o) CFG[k] = o[k]; return API; },

    /* `profundo` prende las dos revisiones caras —desborde y color—, que
       recorren TODOS los elementos con getComputedStyle. Con 570 personas por
       diez pantallas eso son millones de llamadas y el simulacro se arrastra.
       Y no hacen falta 570 veces: el desborde y el color son de la ESTRUCTURA,
       que es la misma para toda la gente del mismo rol. Se corren una vez por
       combinación de rol y pantalla. Lo que sí se revisa siempre es lo que
       depende de los DATOS de cada quien: si la pantalla quedó vacía y si sus
       botones se pueden tocar. */
    revisar: function (nombre, raiz, profundo){
      var scope = raiz || document.querySelector(CFG.pantallas + '.' + CFG.activa) || document.body;
      var hallazgos = [];
      var apunta = function (tipo, gravedad, que, el){
        hallazgos.push({ pantalla: nombre, tipo: tipo, gravedad: gravedad, que: que,
          donde: el ? (el.id ? '#' + el.id
                             : String(el.className || el.tagName).split(' ')[0]) : '' });
      };

      // 1 · ¿Quedó vacía? Una pantalla sin nada que leer está rota, aunque
      //     técnicamente haya cargado.
      var texto = (scope.innerText || '').trim();
      if (texto.length < 12) apunta('vacia', 'grave', 'La pantalla no tiene casi nada que leer', scope);

      // 2 · Objetivos táctiles. El pulgar mide lo que mide.
      var tocables = scope.querySelectorAll('button,a,[onclick],select,input,.tile,.subp,.poschip,[role=button]');
      Array.prototype.forEach.call(tocables, function (el){
        if (!visible(el) || ignorado(el)) return;
        var r = el.getBoundingClientRect();
        /* Un control chico puede tener el blanco grande: se pone un `::before`
           transparente y centrado, y el toque en esa zona igual le llega al
           botón. Es lo correcto para una ✕ o una casilla, que TIENEN que verse
           chicas. Sin mirar el pseudo-elemento, esta revisión reportaba como
           malos justo los que ya estaban arreglados bien. */
        var an = r.width, al = r.height;
        try {
          var pb = getComputedStyle(el, '::before');
          if (pb && pb.content !== 'none' && pb.position === 'absolute'){
            an = Math.max(an, parseFloat(pb.width) || 0);
            al = Math.max(al, parseFloat(pb.height) || 0);
          }
        } catch (e){}
        if (al < MIN_DEDO || an < 24){
          apunta('dedo', 'medio',
            'Objetivo táctil de ' + Math.round(an) + '×' + Math.round(al) +
            ' (mínimo ' + MIN_DEDO + ' de alto)', el);
        }
      });

      // 3 · Botones que no hacen nada. Se ven, se tocan y no pasa nada: es el
      //     tipo de cosa que hace creer que la app está rota.
      Array.prototype.forEach.call(scope.querySelectorAll('button'), function (el){
        if (!visible(el) || ignorado(el)) return;
        if (!el.onclick && !el.getAttribute('onclick') && !el.closest('form') && !el.dataset.accion){
          apunta('muerto', 'medio', 'Botón sin acción: "' + (el.innerText || '').trim().slice(0, 30) + '"', el);
        }
      });

      // 4 · Texto que se sale de su caja.
      if (profundo) Array.prototype.forEach.call(scope.querySelectorAll('*'), function (el){
        if (!visible(el) || ignorado(el)) return;
        var s = getComputedStyle(el);
        if (s.overflowX !== 'visible' && s.overflowX !== 'clip') return;   // el que sí desplaza, no cuenta
        if (esBlancoTactil(el)) return;
        if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2){
          apunta('desborde', 'medio', 'Se sale ' + (el.scrollWidth - el.clientWidth) + 'px de su caja', el);
        }
      });

      // 5 · Invisible por color.
      if (profundo) Array.prototype.forEach.call(scope.querySelectorAll('*'), function (el){
        if (!visible(el) || ignorado(el)) return;
        var propio = Array.prototype.some.call(el.childNodes, function (n){
          return n.nodeType === 3 && n.textContent.trim().length > 1; });
        if (!propio) return;
        var c = aRGB(getComputedStyle(el).color), b = aRGB(fondoReal(el));
        if (!c || !b) return;
        if (Math.abs(luma(c) - luma(b)) < 12){
          apunta('invisible', 'grave',
            'Texto casi del mismo color que su fondo: "' + el.innerText.trim().slice(0, 34) + '"', el);
        }
      });

      // 6 · La página entera no debe correrse de lado. En teléfono eso se
      //     siente como que la app está descuadrada, y se nota de inmediato.
      if (document.documentElement.scrollWidth > window.innerWidth + 2){
        apunta('horizontal', 'grave',
          'La página se corre ' + (document.documentElement.scrollWidth - window.innerWidth) + 'px de lado', null);
      }

      return hallazgos;
    },

    /* Un recorrido: varias pantallas seguidas, con la función que lleva a cada
       una. Devuelve todos los hallazgos juntos. */
    recorrer: function (pasos, profundo){
      var todo = [];
      pasos.forEach(function (p){
        try { if (typeof p.ir === 'function') p.ir(); }
        catch (e){ todo.push({ pantalla: p.nombre, tipo:'excepcion', gravedad:'grave',
          que:'Truena al entrar: ' + e.message, donde:'' }); return; }
        try { todo = todo.concat(API.revisar(p.nombre, null, profundo)); }
        catch (e){ todo.push({ pantalla: p.nombre, tipo:'excepcion', gravedad:'grave',
          que:'Truena al revisar: ' + e.message, donde:'' }); }
      });
      return todo;
    },
  };

  global.INSPECTOR = API;
})(window);
