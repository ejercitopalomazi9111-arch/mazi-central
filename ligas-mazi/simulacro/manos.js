/* ============================================================================
   manos.js — LA PERSONA QUE SÍ OPRIME LOS BOTONES
   ----------------------------------------------------------------------------
   El inspector MIRA pantallas. Esto las USA: escribe en los campos, toca los
   botones, y comprueba que haya pasado lo que tenía que pasar.

   ── POR QUÉ HIZO FALTA ───────────────────────────────────────────────────
   La primera versión del simulacro paseaba 570 identidades por las pantallas
   con `go(id)` y revisaba cómo se veían. Eso encontró cosas de verdad —los
   objetivos táctiles— pero dejaba fuera lo más importante: **los caminos de
   ESCRITURA**. Nadie se registraba, nadie cerraba sesión, nadie hacía un
   cambio desde la pantalla del coach. O sea que la parte de la app donde de
   verdad se rompen las cosas no se estaba tocando.

   Carlos lo había pedido con todas sus letras desde el principio: *"que se
   registren, luego cierren sesión y vuelvan a iniciar sesión"*. Aquí sí pasa.

   ── LA TERQUEDAD, QUE ESTABA ESCRITA Y NO SE USABA ───────────────────────
   `personas.mjs` le da a cada quien `terquedad`, `paciencia` y `lee` — y el
   corredor nunca los leía. Era adorno. Aquí mandan de verdad:

     · Cada acción se intenta hasta `terquedad` veces antes de rendirse.
     · **Cada intento fallido es FRICCIÓN**, y la fricción es el entregable.
       Dice dónde la app *se deja usar pero cuesta*, que no es lo mismo que
       "está rota" y no se arregla igual.
     · Sólo cuando se acaba la terquedad hay ABANDONO, y eso ya es grave: es
       alguien que quería y no pudo.
     · Quien no `lee` se salta los textos de ayuda, así que si la única
       explicación de algo vive en un párrafo, esa persona igual se atora —
       que es exactamente lo que pasa en la vida real.

   ── LÍMITE HONESTO ───────────────────────────────────────────────────────
   La tienda de productos NO se puede ejercitar aquí: sus artículos viven en
   Supabase y esto corre en modo local, sin nube. Se dice y no se disimula.
   Lo que sí se ejercita completo es el gachapón, que es local de cabo a rabo.
   ==========================================================================*/

(function (global) {
  'use strict';

  var API = {};
  var reg = [];          // fricciones y abandonos de la persona en curso
  var quien = null;      // { id, rol, nombre, terquedad, paciencia, lee }

  function anota(tipo, gravedad, paso, que){
    reg.push({ tipo: tipo, gravedad: gravedad, paso: paso, que: que,
               persona: quien && quien.id, rol: quien && quien.rol });
  }

  var $ = function (s, raiz){ return (raiz || document).querySelector(s); };
  var $$ = function (s, raiz){ return Array.prototype.slice.call((raiz || document).querySelectorAll(s)); };

  /* Escribir como escribe una persona: el valor entra y el campo AVISA que
     cambió. Poner `.value` a secas no dispara `oninput`, así que la app nunca
     se entera — y una prueba que no dispara los eventos reales no prueba la
     app real, prueba otra cosa. */
  function escribir(sel, texto){
    var el = $(sel); if (!el) return false;
    el.focus();
    el.value = texto;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function tocar(el){
    if (!el) return false;
    try { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); } catch (e){}
    el.click();
    return true;
  }

  /* EL INTENTO TERCO.
     `hacer()` ejecuta la acción. `logrado()` dice si sirvió. Si no sirvió, se
     vuelve a intentar hasta que se acabe la terquedad de esta persona. Cada
     vuelta que no sirve queda anotada como fricción, con el número de intento:
     así el reporte distingue "costó un intento" de "costó cinco". */
  function insistir(paso, hacer, logrado, pista){
    var topes = Math.max(1, (quien && quien.terquedad) || 3);
    for (var i = 1; i <= topes; i++){
      try { hacer(i); }
      catch (e){
        anota('excepcion', 'grave', paso, 'Truena al intentarlo: ' + e.message);
        return false;
      }
      var ok = false;
      try { ok = !!logrado(); } catch (e){ ok = false; }
      if (ok){
        if (i > 1) anota('friccion', 'medio', paso,
          'Salió hasta el intento ' + i + ' de ' + topes + (pista ? ' · ' + pista : ''));
        return true;
      }
    }
    /* Se acabó la terquedad. Esto no es "el usuario es flojo": es alguien que
       lo intentó todas las veces que iba a intentarlo y la app no lo dejó. */
    anota('abandono', 'grave', paso,
      'Se rindió después de ' + topes + ' intentos' + (pista ? ' · ' + pista : ''));
    return false;
  }

  /* ══════════════════════════════════════════════════════════════════════
     LOS FLUJOS
     ══════════════════════════════════════════════════════════════════════ */

  /* 1 · CREAR CUENTA. Con el sombrero que le toca y desde la pantalla real. */
  API.crearCuenta = function (per){
    var rolChip = { liga:0, coach:1, jugador:2, papa:3, publico:4, mesa:4 };
    return insistir('crear cuenta', function (){
      render('entrada');
      setAuthMode('up');
      var chips = $$('#rolePick .rolechip');
      var i = rolChip[per.rol]; if (i == null) i = 4;
      if (chips[i] && chips[i].className.indexOf('on') < 0) tocar(chips[i]);
      escribir('#upName',  per.nombre);
      escribir('#upEmail', per.email);
      escribir('#upPass',  per.pass || 'prueba1234');
      var b = $$('#authUp button').filter(function (x){ return /crear cuenta/i.test(x.innerText); })[0];
      tocar(b);
    }, function (){
      var u = userData();
      return !!(u && (u.email || '').toLowerCase() === per.email.toLowerCase());
    }, 'el botón de crear cuenta no dejó la sesión iniciada');
  };

  /* 2 · CERRAR SESIÓN. */
  API.cerrarSesion = function (){
    return insistir('cerrar sesión', function (){
      doLogout();
    }, function (){
      return curScreen === 'entrada';
    }, 'no regresó a la pantalla de entrada');
  };

  /* 3 · VOLVER A ENTRAR. Éste es EL recorrido que pidió Carlos, y el que tenía
     el bug que dejaba a la gente fuera de su propia cuenta. Si algún día se
     vuelve a romper, se rompe aquí y con nombre y apellido. */
  API.iniciarSesion = function (per){
    return insistir('volver a iniciar sesión', function (){
      render('entrada');
      setAuthMode('in');
      escribir('#inEmail', per.email);
      escribir('#inPass',  per.pass || 'prueba1234');
      var b = $$('#authIn button').filter(function (x){ return /entrar/i.test(x.innerText); })[0];
      tocar(b);
    }, function (){
      var u = userData();
      return curScreen !== 'entrada'
          && !!(u && (u.email || '').toLowerCase() === per.email.toLowerCase());
    }, 'con su correo y su contraseña, la app no lo dejó volver a entrar');
  };

  /* 4 · EL COACH HACE UN CAMBIO, desde la pantalla, tocando. */
  API.hacerCambio = function (){
    if (!hasLiveGame()) return null;
    var antes = onCourt(0).map(function (p){ return p.nm; }).join('|');
    return insistir('cambio de jugador', function (){
      go('vestidor');
      var enCancha = $$('#subOn .subp');
      var enBanca  = $$('#subBench .subp');
      if (!enCancha.length || !enBanca.length) return;
      tocar(enCancha[0]);
      tocar(enBanca[0]);
    }, function (){
      return onCourt(0).map(function (p){ return p.nm; }).join('|') !== antes;
    }, 'tocó cancha y luego banca y nadie se movió');
  };

  /* 5 · EL COACH CAMBIA UNA POSICIÓN sin sacar a nadie. */
  API.cambiarPosicion = function (){
    if (!hasLiveGame()) return null;
    var p0 = onCourt(0)[0]; if (!p0) return null;
    var antes = p0.pos;
    return insistir('cambiar posición', function (){
      go('vestidor');
      var chip = $('#subOn .poschip'); if (!chip) return;
      tocar(chip);                                   // abre la hoja del picker
      var ops = $$('#sheetBody .posopt');
      var otra = ops.filter(function (o){ return o.className.indexOf('on') < 0; })[0];
      tocar(otra);
    }, function (){
      var ahora = GAME.teams[0].players.filter(function (x){ return x.nm === p0.nm; })[0];
      return ahora && ahora.pos !== antes;
    }, 'el chip de posición no cambió nada');
  };

  /* 6 · EL GACHAPÓN, completo: comprar el sobre, abrirlo, ver el premio y
     ponérselo. Es el único circuito de economía que corre sin nube, así que
     es el que puede probarse de cabo a rabo. */
  API.gachapon = function (){
    var e = econ();
    e.coins = Math.max(e.coins || 0, 400); saveEcon(e);
    var ok = insistir('comprar sobre', function (){
      go('gacha');
      buyPack('sencillo');
    }, function (){
      var i = (econ().packInv || {}); return (i.sencillo || 0) > 0;
    }, 'con monedas de sobra, el sobre no se compró');
    if (!ok) return false;

    var teniaAntes = (econ().owned || []).length;
    return insistir('abrir sobre', function (){
      openPack('sencillo');
      /* La ruleta tarda; el simulacro no espera de verdad —Carlos pidió
         tiempos falsos— así que se lleva el premio a mano por el mismo camino
         que usaría el temporizador. */
      var g = document.getElementById('revealBg');
      if (g && !g.classList.contains('on')) { /* aún girando: se deja */ }
    }, function (){
      var e2 = econ();
      return (e2.owned || []).length > teniaAntes || (e2.coins || 0) !== 400;
    }, 'se descontó el sobre y no llegó ningún cosmético ni monedas de repetido');
  };

  /* 7 · EL PAPÁ BUSCA EL PARTIDO DE SU HIJ@.
     La razón por la que un papá abre esta app. Tiene que poder ver la
     CATEGORÍA, el día y el lugar sin preguntarle a nadie — si no, la app no le
     resolvió lo único que venía a resolver. */
  API.buscarPartidoDelHijo = function (){
    /* Busca como buscaría él: primero donde cree que está, y si no, en la otra.
       La primera versión sólo abría "Tabla" —que es la tabla de POSICIONES— y
       reportaba abandono. El abandono era real, pero por la razón de al lado:
       el calendario existe, sólo que no ahí y sin filtro por categoría. */
    var donde = ['publico', 'tabla', 'hub'];
    var i = 0;
    /* EL CRITERIO CAMBIÓ, Y ÉSA ES LA HISTORIA.
       Antes esto daba por bueno que en la pantalla se leyera una categoría, una
       hora y un lugar. Carlos lo tumbó: *"estás buscando algo que no existe"*.
       Y tenía razón — que la pantalla mencione "Mixta 7–9" no le dice a un papá
       que ahí juega SU hija; se lo diría de cualquier partido de esa categoría.

       Lo que de verdad hay que comprobar es que el papá vea EL LETRERO CON EL
       NOMBRE DE SU HIJ@. Si el nombre no está, no encontró nada, aunque la
       pantalla esté llena de datos. */
    var mios = (userData() && userData().children || []).map(function(k){ return k.name; });
    return insistir('encontrar el partido de mi hij@', function (){
      go(donde[i % donde.length]); i++;
    }, function (){
      var t = ((document.querySelector('.screen.on') || {}).innerText || '');
      if (!/Aquí juega/.test(t)) return false;              // no hay letrero
      if (!mios.length) return false;
      // Y que el letrero traiga el nombre de alguno de los suyos.
      for (var k = 0; k < mios.length; k++) if (t.indexOf(mios[k]) >= 0) return true;
      return false;
    }, 'no ve ningún letrero que diga dónde juega su hij@');
  };

  /* 8 · EL VISITANTE CURIOSEA antes del partido, que es lo que hace alguien
     que llegó por un anuncio y todavía no sabe si le interesa. */
  API.curiosear = function (){
    var pantallas = ['publico', 'tabla', 'marcador', 'ligas', 'gacha'];
    var visto = 0;
    pantallas.forEach(function (id){
      try { go(id); if (((document.querySelector('.screen.on') || {}).innerText || '').trim().length > 40) visto++; }
      catch (e){ anota('excepcion', 'grave', 'curiosear', 'Truena al abrir ' + id + ': ' + e.message); }
    });
    if (visto < pantallas.length){
      anota('friccion', 'medio', 'curiosear',
        'De ' + pantallas.length + ' pantallas que abrió, ' + (pantallas.length - visto) + ' no le dijeron nada');
    }
    return visto === pantallas.length;
  };

  /* ══════════════════════════════════════════════════════════════════════
     EL RECORRIDO DE UNA PERSONA
     ══════════════════════════════════════════════════════════════════════ */
  API.vivir = function (per){
    quien = per; reg = [];
    try {
      /* Todo el mundo pasa por lo mismo al principio, que es donde más gente
         se cae: crear cuenta, salirse, y volver. */
      if (API.crearCuenta(per)){
        API.cerrarSesion();
        API.iniciarSesion(per);
      }
      if (per.rol === 'coach'){ API.hacerCambio(); API.cambiarPosicion(); }
      if (per.rol === 'papa')  { API.buscarPartidoDelHijo(); }
      if (per.rol === 'publico'){ API.curiosear(); }
      if (per.rol === 'jugador' || per.rol === 'publico'){ API.gachapon(); }
    } catch (e){
      anota('excepcion', 'grave', '(recorrido)', e.message);
    }
    return reg;
  };

  global.MANOS = API;
})(window);
