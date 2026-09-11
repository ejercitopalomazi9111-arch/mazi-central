
(function(){
  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raiz = document.documentElement;
  var TOY = window.TOY = window.TOY || {}; TOY.g = TOY.g || {};
  requestAnimationFrame(function(){ raiz.classList.add('cargado'); });

  // El reflejo se clona en vez de repetir el data URI en el HTML.
  var heroe = document.querySelector('.figura img'),
      espejo = document.querySelector('.reflejo');
  if (heroe && espejo) {
    var c = heroe.cloneNode(); c.className = ''; c.alt = ''; c.setAttribute('aria-hidden','true');
    espejo.appendChild(c);
  }

  // ---- Revelado: solo transform, nunca opacity sobre texto ----------------
  if ('IntersectionObserver' in window) {
    var ojo = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('dentro'); ojo.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.revelar').forEach(function(n){ ojo.observe(n); });
  } else {
    document.querySelectorAll('.revelar').forEach(function(n){ n.classList.add('dentro'); });
  }

  /* ══════════════════ S · Sylcred ══════════════════
     El scroll energico que pidio Carlos. Se engancha desde AQUI y no desde el
     HTML a proposito: asi no toco una sola etiqueta del generador. Sin
     JavaScript no pasa nada de esto y la pagina se ve entera — el CSS vive
     dentro de `@media (scripting: enabled)`.

     ⚠ LOS NOMBRES ESTAN SACADOS DEL HTML, NO SUPUESTOS. Una version anterior
     buscaba `.celda, .ficha, .tarjeta, .sobre`: cuatro nombres razonables y
     ninguno existe aqui. Un selector que no encuentra nada NO FALLA — devuelve
     lista vacia y sigue. Se revelaba el indice y la vitrina entera se quedaba
     quieta, con la compuerta en verde y sin un error en consola.

     ⚠ Y EL REVELADO SE APARTA AL TERMINAR. Si las fichas se quedan con
     `s-rev s-dentro` para siempre, `.s-rev.s-dentro{transform:none}` empata en
     especificidad con `.pieza:hover{transform:...}` y gana por ir despues: la
     animacion de entrada MATA el hover de la ficha. Paso, y no se ve de ninguna
     forma que no sea leer el `transform` computado con el raton encima. */
  if ('IntersectionObserver' in window) {
    var TOY = window.TOY = window.TOY || {};
    TOY.s = TOY.s || {};
    var vistos = new Set();
    ['.pieza', '.reng'].forEach(function(sel){
      var porPadre = new Map();
      document.querySelectorAll(sel).forEach(function(n){
        if (vistos.has(n) || n.closest('.cartel')) return;   // la portada no
        vistos.add(n);
        var pa = n.parentElement, i = porPadre.get(pa) || 0;
        porPadre.set(pa, i + 1);
        n.style.setProperty('--s-i', Math.min(i, 8));        // tope: ver el CSS
        n.classList.add('s-rev');
        if (n.querySelector('img, picture, canvas')) n.classList.add('s-caja');
      });
    });

    var soltar = function(n){
      n.classList.remove('s-rev', 's-caja', 's-dentro');
      n.style.removeProperty('--s-i');
    };
    var ojoS = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var n = e.target;
        n.classList.add('s-dentro');
        ojoS.unobserve(n);
        var listo = false;
        var fin = function(ev){
          if (listo || (ev && ev.target !== n)) return;
          listo = true;
          n.removeEventListener('transitionend', fin);
          soltar(n);
        };
        n.addEventListener('transitionend', fin);
        /* El plazo existe porque `transitionend` NO dispara si el elemento ya
           entro en su posicion final. Sin el, justo esos quedarian clavados. */
        setTimeout(fin, 1400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    document.querySelectorAll('.s-rev').forEach(function(n){ ojoS.observe(n); });
    TOY.s.revelados = vistos.size;
  }
  /* ══════════════════ /S ══════════════════ */

  /* ⚠ AQUI HABIA UN `if (quieto) return;` Y SE LLEVABA MEDIA PAGINA POR DELANTE.
     Todo el guion del sitio vive dentro de UNA SOLA funcion auto-invocada —un
     rAF compartido, como manda el motor—, asi que ese `return` no apagaba el
     movimiento: apagaba TODO LO QUE VENIA DESPUES. Y despues venian el puntero,
     la rotacion de banners, la intro, el fondo vivo y el EXPEDIENTE ENTERO.
     O sea: a quien tiene «Reducir movimiento» encendido —en iPhone son dos
     toques en Accesibilidad— pulsar una figura NO HACIA ABSOLUTAMENTE NADA.
     Ni se abria, ni avisaba, ni fallaba: nada.

     Comprobado en la version que YA ESTABA PUBLICADA, o sea que no es de hoy:
     `TOY.g.abrir` salia `undefined` y la ficha no se abria.

     `quieto` significa «sin movimiento», NUNCA «sin JavaScript». Lo que de
     verdad se mueve se frena donde se mueve —abajo, marcado uno por uno—, y
     lo demas sigue funcionando, que es justo lo que pide la regla: sin
     movimiento la pagina queda COMPLETA, nunca a medias. */

  // ---- Puntero ------------------------------------------------------------
  var vitrina = document.querySelector('.vitrina'),
      ficha   = document.getElementById('g-ficha'),
      carton  = document.getElementById('carton'),
      banda   = document.getElementById('banda'),
      medida  = document.getElementById('medida');
  var mx = .5, my = .5, sx = .5, sy = .5;      // objetivo y suavizado
  var cx = .5, cy = .5, kx = .5, ky = .5;
  var agarre = null, tocada = false;

  if (!quieto) addEventListener('pointermove', function(e){
    mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
    if (agarre === null && carton) {
      var r = carton.getBoundingClientRect();
      var dentro = e.clientX > r.left - 220 && e.clientX < r.right + 220 &&
                   e.clientY > r.top - 160 && e.clientY < r.bottom + 160;
      if (dentro) { cx = (e.clientX - r.left) / r.width; cy = (e.clientY - r.top) / r.height; }
      else { cx = .5; cy = .5; }
    }
  }, { passive: true });

  if (carton && !quieto) {
    carton.addEventListener('pointerdown', function(e){
      agarre = { x: e.clientX, y: e.clientY, cx: cx, cy: cy };
      carton.classList.add('agarrado'); carton.setPointerCapture(e.pointerId);
    });
    carton.addEventListener('pointermove', function(e){
      if (!agarre) return;
      cx = Math.max(-.35, Math.min(1.35, agarre.cx + (e.clientX - agarre.x) / 240));
      cy = Math.max(-.35, Math.min(1.35, agarre.cy + (e.clientY - agarre.y) / 300));
    });
    ['pointerup','pointercancel'].forEach(function(t){
      carton.addEventListener(t, function(){ agarre = null; carton.classList.remove('agarrado'); });
    });
  }

  // La banda se sigue pudiendo arrastrar y teclear; el scroll solo la empuja
  // mientras nadie la haya tocado. Secuestrarla del todo se siente roto.
  if (banda) {
    ['pointerdown','wheel','keydown','touchstart'].forEach(function(t){
      banda.addEventListener(t, function(){ tocada = true; }, { passive: true });
    });
  }

  // (El motor de polvo en WebGL se quito: colgaba de un canvas #polvo que ya
  //  no existe en el marcado. Lo cazo Sylcred y lo comprobe. El campo de
  //  estrellas de la intro cubre esa funcion y ese si esta enchufado.)

  // ---- Un solo bucle -------------------------------------------------------
  var t0 = performance.now(), ultimo = t0, cuadros = 0, ventana = t0,
      peor = 0, listo = false, pintado = 0;

  var tareas = TOY.g.tareas = [];      // cualquiera cuelga aqui; un solo bucle

  function paso(ahora){
    requestAnimationFrame(paso);
    for (var q = 0; q < tareas.length; q++) tareas[q](ahora);
    var dt = Math.min(ahora - ultimo, 64); ultimo = ahora;
    var k = 1 - Math.pow(0.0016, dt / 1000);      // suavizado independiente del cuadro

    sx += (mx - sx) * k; sy += (my - sy) * k;
    kx += (cx - kx) * k; ky += (cy - ky) * k;
    if (vitrina) { vitrina.style.setProperty('--px', sx.toFixed(4));
                   vitrina.style.setProperty('--py', sy.toFixed(4)); }
    /* ⚠ EL EXPEDIENTE VIVE FUERA DE `.vitrina`, asi que heredaba el `--px:.5`
       de `:root` — o sea, el centro fijo— y su numero de fondo y su figura
       NO SE MOVIAN NUNCA. El efecto estaba escrito y no existia. Se le pasan
       aqui las mismas dos variables, y solo mientras esta abierto. */
    if (ficha && !ficha.hidden) { ficha.style.setProperty('--px', sx.toFixed(4));
                                  ficha.style.setProperty('--py', sy.toFixed(4)); }
    if (carton)  { carton.style.setProperty('--cx', kx.toFixed(4));
                   carton.style.setProperty('--cy', ky.toFixed(4)); }

    if (banda && !tocada && !quieto) {
      var r = banda.getBoundingClientRect();
      var p = (innerHeight - r.top) / (innerHeight + r.height);
      p = Math.max(0, Math.min(1, (p - .18) / .58));
      var meta = p * (banda.scrollWidth - banda.clientWidth);
      if (Math.abs(meta - banda.scrollLeft) > .5) banda.scrollLeft = meta;
    }

    // El fondo tiene presupuesto propio: ~30 fps. No compite con el scroll.
    cuadros++;
    if (ahora - ventana >= 600) {
      var fps = Math.round(cuadros * 1000 / (ahora - ventana));
      cuadros = 0; ventana = ahora;
      if (!listo && ahora - t0 > 1600) listo = true;      // se ignora el arranque
      if (listo) {
        if (!peor || fps < peor) peor = fps;
        if (medida) medida.textContent = fps + ' fps · mínimo ' + peor;
      }
    }
  }
  requestAnimationFrame(paso);

  // ---- El eje del catalogo se dibuja --------------------------------------
  // 47 rayas escalonadas 22 ms. Va aqui y no en CSS puro porque tiene que
  // empezar cuando el eje entra en pantalla, no al cargar.
  var eje = document.getElementById('eje');
  if (eje && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(es, o){
      if (es[0].isIntersecting) { eje.classList.add('dibujado'); o.disconnect(); }
    }, { threshold:.3 }).observe(eje);
  } else if (eje) { eje.classList.add('dibujado'); }

  // ══════════════════════════════════════════════════════════════════════
  // G · TODO LO NUEVO cuelga de TOY.g, como quedo acordado con Sylcred para
  // que los dos podamos escribir aqui sin pisarnos.
  // ══════════════════════════════════════════════════════════════════════
  // ---- 1 · LA INTRO · 5 s -----------------------------------------------
  // El logo se construye letra por letra: una hoja de luz baja por cada una y
  // la va revelando con mascara. Son las letras REALES del logotipo, no una
  // tipografia parecida.
  var intro = document.getElementById('g-intro');
  function cerrarIntro(){
    if (!intro || intro.hidden) return;
    intro.style.transition = 'opacity .5s ease';
    intro.style.opacity = '0';
    setTimeout(function(){ intro.hidden = true; document.body.style.overflow = ''; }, 520);
  }
  if (intro && !quieto) {
    document.body.style.overflow = 'hidden';
    var lets = [].slice.call(intro.querySelectorAll('.let'));
    var au = document.getElementById('g-au');
    var T0 = 380, PASO = 300, DUR = 520;        // 380 + 10*300 + 520 ≈ 3.9 s
    function trazar(){
    lets.forEach(function(L, i){
      var hoja = L.querySelector('.hoja'), tapa = L.querySelector('.tapa');
      var t = T0 + i * PASO;
      setTimeout(function(){
        var curva = 'cubic-bezier(.5,0,.3,1)';
        hoja.style.opacity = '1';
        hoja.style.transition = 'transform ' + DUR + 'ms ' + curva;
        hoja.style.transform = 'scaleY(1)';
        if (tapa) {
          tapa.style.transition = 'transform ' + DUR + 'ms ' + curva;
          tapa.style.transform = 'scaleY(0)';
        }
        setTimeout(function(){
          hoja.style.transition = 'opacity .32s ease';
          hoja.style.opacity = '0';
        }, DUR - 40);
      }, t);
    });
    setTimeout(function(){ if (au){ au.style.transition = 'opacity .9s ease'; au.style.opacity = '.9'; } },
               T0 + lets.length * PASO + 200);
    setTimeout(cerrarIntro, 5000);
    }
    // No se traza hasta que las diez letras esten DECODIFICADAS. Si no, en un
    // telefono lento la animacion corre mientras las imagenes siguen llegando
    // y el logo sale a medias -- que es justo lo que reporto Carlos.
    var imgs = lets.map(function(L){ return L.querySelector('img'); });
    var espera = Promise.all(imgs.map(function(im){
      return (im.decode ? im.decode() : Promise.resolve()).catch(function(){});
    }));
    // pero no se espera para siempre: a los 2.5 s se arranca igual
    Promise.race([espera, new Promise(function(r){ setTimeout(r, 2500); })]).then(trazar);
    var bs = document.getElementById('g-saltar');
    if (bs) bs.addEventListener('click', cerrarIntro);
    addEventListener('keydown', function(e){ if (e.key === 'Escape') cerrarIntro(); });

    /* ⚠ ESTE LIENZO ERA EL TRABON DE LA INTRO, Y SOLO ESTE.
       Medido a 390 px y DPR 3, durante los 5 s de la intro:
         tal cual .......................  1.4 fps  (cuadros de 4.8 s)
         quitando SOLO este lienzo ...... 58.9 fps
       No eran las diez letras, ni las sombras, ni las tapas: era borrar y
       repintar 170 estrellas sobre una superficie de pantalla completa en cada
       cuadro, justo cuando el navegador ademas esta descodificando las diez
       imagenes del logo.

       Se pinta UNA VEZ y no se toca mas. El cielo quieto se lee igual de bien
       —de hecho en cinco segundos nadie nota que titila—, y el movimiento de
       la intro lo ponen las letras, que es donde tiene que estar. */
    var ci = document.getElementById('g-cielo'), cx = ci && ci.getContext('2d');
    if (cx) {
      var sembrado = false;
      function sembrarIntro(){
        var R = 1;                       // puntos de 2 px: DPR 1 sobra
        var w = Math.round(ci.clientWidth * R), h = Math.round(ci.clientHeight * R);
        if (!w || !h) return;
        ci.width = w; ci.height = h;
        cx.clearRect(0, 0, w, h);
        for (var i = 0; i < 170; i++) {
          var z = Math.random() * .8 + .2;
          cx.fillStyle = 'rgba(250,247,220,' + (z * (.4 + Math.random() * .6)).toFixed(3) + ')';
          cx.fillRect(Math.random() * w, Math.random() * h, z * 2, z * 2);
        }
        sembrado = true;
      }
      requestAnimationFrame(sembrarIntro);
      addEventListener('resize', function(){ if (sembrado) sembrarIntro(); });
    }
  } else if (intro) { intro.hidden = true; }

  // ---- 2 · LOS BANNERS que se cambian solos ------------------------------
  // Cada tarjeta lleva SU PROPIO reloj y un intervalo distinto: si todas
  // cambiaran a la vez seria un carrusel, y lo que se pidio es que se cambien
  // «paulatina y esporadicamente». Las de fuera de pantalla no gastan nada.
  document.querySelectorAll('.g-cat .banners').forEach(function(caja, k){
    var caps = [].slice.call(caja.children);
    if (!caps.length) return;
    caps.forEach(function(c){ c.style.backgroundImage = 'url("' + c.dataset.b + '")'; });
    caps[0].classList.add('viva');
    if (caps.length < 2 || quieto) return;
    var i = 0, aLaVista = true;
    if ('IntersectionObserver' in window)
      new IntersectionObserver(function(es){ aLaVista = es[0].isIntersecting; },
        { rootMargin:'80px' }).observe(caja);
    (function siguiente(){
      // 5 a 11 s, distinto por tarjeta y distinto cada vuelta
      var espera = 5000 + Math.random() * 6000 + k * 400;
      setTimeout(function(){
        if (aLaVista) {
          caps[i].classList.remove('viva');
          i = (i + 1) % caps.length;
          caps[i].classList.add('viva');
        }
        siguiente();
      }, espera);
    })();
  });

  // ---- 3 · EL MENU de su web ---------------------------------------------
  var bAbrir = document.getElementById('g-abrir'), menu = document.getElementById('g-menu');
  if (bAbrir && menu) bAbrir.addEventListener('click', function(){
    var abierto = bAbrir.getAttribute('aria-expanded') === 'true';
    bAbrir.setAttribute('aria-expanded', String(!abierto));
    menu.hidden = abierto;
  });

  // ---- 4 · LA FICHA AL DETALLE, con puertas de nave ---------------------
  // Las 47 fichas no viven en el documento: se arman al vuelo desde este dato.
  // Meter 47 galerias en el HTML lo habria hecho enorme para algo que casi
  // nadie abre entero.
  TOY.g.piezas = {"01A":{"n":"Dengar","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=dengar-vc-01a-the-vintage-collection-figura-star-wars-el-imperio-contraataca","f":["vc01A-0.webp","vc01A-1.webp","vc01A-2.webp","vc01A-3.webp","vc01A-4.webp"],"p":590.0,"st":"disponible"},"57":{"n":"Dr. Evazan (A New Hope)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-dr-evazan-a-new-hope-vc-57","f":["vc57-0.webp","vc57-1.webp","vc57-2.webp","vc57-3.webp","vc57-4.webp"],"p":560.0,"st":"disponible"},"73":{"n":"Aurra Sing","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=aurra-sing-vc-73-figura-star-wars-the-vintage-collection","f":["vc73-0.webp","vc73-1.webp","vc73-2.webp","vc73-3.webp","vc73-4.webp"],"p":560.0,"st":"disponible"},"231":{"n":"Stormtrooper","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-stormtrooper-vc-231","f":["vc231-0.webp","vc231-1.webp","vc231-2.webp","vc231-3.webp","vc231-4.webp"],"p":590.0,"st":"disponible"},"240":{"n":"Clone Trooper (501st Legion)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=clone-trooper-501st-vc240-vintage-collection","f":["vc240-0.webp","vc240-1.webp","vc240-2.webp","vc240-3.webp","vc240-4.webp"],"p":560.0,"st":"disponible"},"271":{"n":"Dark Trooper","s":"The Mandalorian","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-dark-trooper-the-mandalorian-vc271","f":["vc271-0.webp","vc271-1.webp","vc271-2.webp","vc271-3.webp","vc271-4.webp"],"p":520.0,"st":"disponible"},"301":{"n":"Darth Revan","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-darth-revan-vc-301","f":["vc301-0.webp","vc301-1.webp","vc301-2.webp","vc301-3.webp","vc301-4.webp"],"p":610.0,"st":"disponible"},"310":{"n":"Jod Na Nawood","s":"Skeleton Crew","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-jod-na-nawood-skeleton-crew-vc-310","f":["vc310-0.webp","vc310-1.webp","vc310-2.webp","vc310-3.webp","vc310-4.webp"],"p":550.0,"st":"disponible"},"312A":{"n":"The Mandalorian (Imperial Base)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-the-mandalorian-imperial-base-vc-312a","f":["vc312A-0.webp","vc312A-1.webp","vc312A-2.webp","vc312A-3.webp","vc312A-4.webp"],"p":550.0,"st":"disponible"},"317":{"n":"Clone Commander Rex (Bracca Mission)","s":"The Bad Batch","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-clone-commander-rex-bracca-mission-the-bad-batch-vc317","f":["vc317-0.webp","vc317-1.webp","vc317-2.webp","vc317-3.webp","vc317-4.webp"],"p":650.0,"st":"disponible"},"327":{"n":"Osha Aniseya","s":"The Acolyte","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-osha-aniseya-the-acolyte-vc-327","f":["vc327-0.webp","vc327-1.webp","vc327-2.webp","vc327-3.webp","vc327-4.webp"],"p":530.0,"st":"disponible"},"328":{"n":"Mae (Assassin)","s":"The Acolyte","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-mae-assassin-the-acolyte-vc328","f":["vc328-0.webp","vc328-1.webp","vc328-2.webp","vc328-3.webp","vc328-4.webp"],"p":530.0,"st":"disponible"},"329":{"n":"Jedi Master Sol","s":"The Acolyte","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-jedi-master-sol-the-acolyte-vc329","f":["vc329-0.webp","vc329-1.webp","vc329-2.webp","vc329-3.webp","vc329-4.webp"],"p":530.0,"st":"disponible"},"330":{"n":"HK-87 Assassin Droid (Arcana)","s":"Ahsoka","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-hk-87-assassin-droid-arcana-ahsoka-vc330","f":["vc330-0.webp","vc330-1.webp","vc330-2.webp","vc330-3.webp","vc330-4.webp"],"p":520.0,"st":"disponible"},"336":{"n":"Jetpack Trooper","s":"Jedi Survivor","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-jetpack-trooper-jedi-survivor-vc-336","f":["vc336-0.webp","vc336-1.webp","vc336-2.webp","vc336-3.webp","vc336-4.webp"],"p":550.0,"st":"disponible"},"337":{"n":"Grand Admiral Thrawn","s":"Ahsoka","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-grand-admiral-thrawn-ahsoka-vc-337","f":["vc337-0.webp","vc337-1.webp","vc337-2.webp","vc337-3.webp","vc337-4.webp"],"p":550.0,"st":"disponible"},"338":{"n":"Ahsoka Tano (Peridea)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-ahsoka-tano-peridea-vc-338","f":["vc338-0.webp","vc338-1.webp","vc338-2.webp","vc338-3.webp","vc338-4.webp"],"p":550.0,"st":"disponible"},"339":{"n":"Bo-Katan Kryze","s":"Plazir-15","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-bo-katan-kryze-plazir-15-vc-339","f":["vc339-0.webp","vc339-1.webp","vc339-2.webp","vc339-3.webp","vc339-4.webp"],"p":550.0,"st":"disponible"},"343":{"n":"Cobb Vanth (Mandalorian Armor)","s":"The Mandalorian","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-cobb-vanth-mandalorian-armor-the-mandalorian-deluxe-vc-343","f":["vc343-0.webp","vc343-1.webp","vc343-2.webp","vc343-3.webp","vc343-4.webp"],"p":780.0,"st":"disponible"},"344":{"n":"Luke Skywalker (A New Hope)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-luke-skywalker-a-new-hope-vc-344","f":["vc344-0.webp","vc344-1.webp","vc344-2.webp","vc344-3.webp","vc344-4.webp"],"p":560.0,"st":"disponible"},"345":{"n":"Jedi Master Indara","s":"The Acolyte","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-jedi-master-indara-the-acolyte-vc-345-2","f":["vc345-0.webp","vc345-1.webp","vc345-2.webp","vc345-3.webp","vc345-4.webp"],"p":560.0,"st":"disponible"},"346":{"n":"Dedra Meero","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=dedra-meero-vc-346-star-wars-the-vintage-collection-figura-andor","f":["vc346-0.webp","vc346-1.webp","vc346-2.webp","vc346-3.webp","vc346-4.webp"],"p":560.0,"st":"disponible"},"347":{"n":"Anakin Skywalker","s":"Ahsoka","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-anakin-skywalker-ahsoka-vc-347","f":["vc347-0.webp","vc347-1.webp","vc347-2.webp","vc347-3.webp","vc347-4.webp"],"p":560.0,"st":"disponible"},"348":{"n":"Clone Trooper Lieutenant (Teth)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-clone-trooper-lieutenant-vc-348","f":["vc348-0.webp","vc348-1.webp","vc348-2.webp","vc348-3.webp","vc348-4.webp"],"p":580.0,"st":"disponible"},"349":{"n":"Imperial Snowtrooper (Hoth Battle Gear)","s":"The Empire Strikes Back","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-imperial-snowtrooper-hoth-battle-gear-the-empire-strikes-back-vc-349","f":["vc349-0.webp","vc349-1.webp","vc349-2.webp","vc349-3.webp","vc349-4.webp"],"p":560.0,"st":"disponible"},"350":{"n":"Chopper (Imperial Disguise)","s":"Rebels","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-chopper-imperial-disguise-rebels-vc-350","f":["vc350-0.webp","vc350-1.webp","vc350-2.webp","vc350-3.webp","vc350-4.webp"],"p":560.0,"st":"disponible"},"351":{"n":"Lieutenant Callahan","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=lieutenant-callahan-vc351-ahsoka-tv","f":["vc351-0.webp","vc351-1.webp","vc351-2.webp","vc351-3.webp","vc351-4.webp"],"p":560.0,"st":"disponible"},"352":{"n":"Howler & Sabine Wren (Peridea)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=howler-sabine-wren-peridea-vc-352-star-wars-vintage-collection-ahsoka","f":["vc352-0.webp","vc352-1.webp","vc352-2.webp","vc352-3.webp","vc352-4.webp"],"p":1690.0,"st":"disponible"},"353":{"n":"Mandalorian Super Commando","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=mandalorian-super-commando-vc353-ahsoka","f":["vc353-0.webp","vc353-1.webp","vc353-2.webp","vc353-3.webp","vc353-4.webp"],"p":560.0,"st":"disponible"},"355":{"n":"Baylan Skoll","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=baylan-skoll-vc355-vintage-collection-ahsoka","f":["vc355-0.webp","vc355-1.webp","vc355-2.webp","vc355-3.webp","vc355-4.webp"],"p":560.0,"st":"disponible"},"356":{"n":"Shin Hati","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-shin-hati-vc-356","f":["vc356-0.webp","vc356-1.webp","vc356-2.webp","vc356-3.webp","vc356-4.webp"],"p":560.0,"st":"disponible"},"357":{"n":"Obi-Wan Kenobi (Jedi Legend)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=obi-wan-kenobi-jedi-legend-vc357-tvc","f":["vc357-0.webp","vc357-1.webp","vc357-2.webp","vc357-3.webp","vc357-4.webp"],"p":560.0,"st":"disponible"},"358":{"n":"IG-12, Grogu, & Anzellan","s":"The Mandalorian","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-ig-12-grogu-anzellan-the-mandalorian-vc-358","f":["vc358-0.webp","vc358-1.webp","vc358-2.webp","vc358-3.webp","vc358-4.webp"],"p":750.0,"st":"disponible"},"362":{"n":"Momaw Nadon","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-momaw-nadon-vc-362-deluxe","f":["vc362-0.webp","vc362-1.webp","vc362-2.webp","vc362-3.webp","vc362-4.webp"],"p":790.0,"st":"disponible"},"363":{"n":"Carson Teva","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=carson-teva-vc363-vintage-collection-piloto","f":["vc363-0.webp","vc363-1.webp","vc363-2.webp","vc363-3.webp","vc363-4.webp"],"p":560.0,"st":"disponible"},"364":{"n":"Asajj Ventress","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=asajj-ventress-vc364-vintage-collection","f":["vc364-0.webp","vc364-1.webp","vc364-2.webp","vc364-3.webp","vc364-4.webp"],"p":560.0,"st":"disponible"},"365":{"n":"Alexsandr Kallus","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=alexsandr-kallus-vc-365-the-vintage-collection-figura-star-wars-rebels","f":["vc365-0.webp","vc365-1.webp","vc365-2.webp","vc365-3.webp","vc365-4.webp"],"p":560.0,"st":"disponible"},"366":{"n":"Armored Commando","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=imperial-armored-commando-vc-366-star-wars-the-vintage-collection","f":["vc366-0.webp","vc366-1.webp","vc366-2.webp","vc366-3.webp","vc366-4.webp"],"p":790.0,"st":"disponible"},"367":{"n":"Nightsister Merrin","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-nightsister-merrin-vc-367","f":["vc367-0.webp","vc367-1.webp","vc367-2.webp","vc367-3.webp","vc367-4.webp"],"p":560.0,"st":"disponible"},"368":{"n":"Moff Gideon (Dark Trooper Armor)","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-moff-gideon-dark-trooper-armor-vc-368","f":["vc368-0.webp","vc368-1.webp","vc368-2.webp","vc368-3.webp","vc368-4.webp"],"p":560.0,"st":"disponible"},"369":{"n":"Rocket Launcher Trooper","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-rocket-launcher-trooper-vc-369","f":["vc369-0.webp","vc369-1.webp","vc369-2.webp","vc369-3.webp","vc369-4.webp"],"p":560.0,"st":"disponible"},"370":{"n":"Crosshair","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=crosshair-vc370-vintage-collection-bad-batch","f":["vc370-0.webp","vc370-1.webp","vc370-2.webp","vc370-3.webp","vc370-4.webp"],"p":560.0,"st":"disponible"},"371":{"n":"Cobb Vanth","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=cobb-vanth-vc371-vintage-collection-boba-fett","f":["vc371-0.webp","vc371-1.webp","vc371-2.webp","vc371-3.webp","vc371-4.webp"],"p":560.0,"st":"disponible"},"372":{"n":"Han Solo","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=han-solo-vc-372-the-vintage-collection","f":["vc372-0.webp","vc372-1.webp","vc372-2.webp","vc372-3.webp","vc372-4.webp"],"p":560.0,"st":"disponible"},"373":{"n":"Ben Kenobi","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-ben-kenobi-vc-373","f":["vc373-0.webp","vc373-1.webp","vc373-2.webp","vc373-3.webp","vc373-4.webp"],"p":560.0,"st":"disponible"},"374":{"n":"Imperial Shock Trooper","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-the-vintage-collection-imperial-shock-trooper-vc-374","f":["vc374-0.webp","vc374-1.webp","vc374-2.webp","vc374-3.webp","vc374-4.webp"],"p":560.0,"st":"disponible"},"381":{"n":"Chewbacca","s":"The Vintage Collection","u":"https://www.toydarians.com/?product=star-wars-vintage-collection-chewbacca-vc-381","f":["vc381-0.webp","vc381-1.webp","vc381-2.webp","vc381-3.webp","vc381-4.webp"],"p":560.0,"st":"disponible"}};
  TOY.g.orden = ["01A","57","73","231","240","271","301","310","312A","317","327","328","329","330","336","337","338","339","343","344","345","346","347","348","349","350","351","352","353","355","356","357","358","362","363","364","365","366","367","368","369","370","371","372","373","374","381"];
  TOY.g.paypal = "";
  TOY.g.moneda = "MXN";

  // ══════════════════════════════════════════════════════════════════════
  // G · EL FONDO VIVO · nebulosa + estrellas con paralaje + hiperespacio
  // ══════════════════════════════════════════════════════════════════════
  // Se pide un fondo "mas entretenido, animado con colores, sin desentonar".
  // Lo que NO desentona aqui es la paleta que ya es del cliente: el amarillo
  // medido de su logo y el rojo de la casa, sobre negro. Nada de morados ni
  // de degradados de moda.
  //
  // Las tres cosas que lo hacen barato, que es lo que permite que este
  // encendido TODO el rato sin que el scroll se sienta:
  //
  // 1 · La nebulosa se pinta en un lienzo de 192x108 y se estira al tamano de
  //     la ventana. Una nube difusa no necesita pixeles: a tamano real serian
  //     ~2 millones de pixeles por cuadro, aqui son 20 mil. Es la misma idea
  //     de siempre —no pagar resolucion donde no se ve—.
  // 2 · La nebulosa se repinta a 12 cuadros por segundo y las estrellas a 30.
  //     A una nube que tarda 40 segundos en cruzar nadie le nota los 12.
  // 3 · Fuera de la pestana no dibuja nada.
  //
  // Y el limite duro: la nebulosa va a alfa bajisima. El contraste del texto
  // se mide contra --negro, asi que un fondo que aclarara de verdad volveria
  // mentira ese numero. Hay una comprobacion en revisar.mjs que mide el pixel
  // mas claro que esto llega a pintar.
  // ══════════════════════════════════════════════════════════════════════
  // G · EL FONDO VIVO · nebulosa (CSS) + estrellas (pintadas UNA vez)
  // ══════════════════════════════════════════════════════════════════════
  // Lo que costo aprenderlo: la primera version pintaba una nebulosa en un
  // lienzo chiquito y la estiraba a pantalla completa EN CADA CUADRO. Se veia
  // bien y hundia la pagina: 1 fps, cuadros de casi 6 segundos en un telefono.
  //
  // Ahora no se dibuja NADA por cuadro:
  // · la nebulosa son degradados de CSS que solo se mueven (compositor);
  // · las estrellas se pintan una sola vez, cada capa en su lienzo;
  // · lo unico que pasa por cuadro es escribir tres `transform` para el
  //   paralaje, que no repinta nada;
  // · el titileo lo hace el CSS con opacidad sobre capas decorativas;
  // · la raya del hiperespacio es un elemento que cruza con `transform`.
  var cielos = document.getElementById('g-cielos'),
      raya   = document.getElementById('g-raya');
  if (cielos && cielos.firstChild && cielos.firstChild.getContext) {
    /* Dos capas y no tres. Cada capa es una superficie del tamano de la
       pantalla que el compositor tiene que mezclar; la tercera aportaba muy
       poca hondura y costaba lo mismo que las otras dos. */
    var capas = [
      { n: cielos.children[0], prof: .06, densidad: 1 / 4200, tam: 1.5, br: .48 },
      { n: cielos.children[1], prof: .26, densidad: 1 / 11000, tam: 2.6, br: .95 }
    ];
    // el lienzo se dibuja a DPR 1: son puntos de 2 px, no hay detalle que
    // ganar con mas resolucion y cuesta el cuadrado de lo que sube
    var altoCielo = 0, anchoCielo = 0;

    function sembrarCielos(){
      var w = innerWidth, h = innerHeight;
      if (!w || !h) return;
      // alto de sobra para que el paralaje tenga de donde tirar sin repetirse
      var alto = Math.round(h * 1.6);
      if (w === anchoCielo && alto === altoCielo) return;
      anchoCielo = w; altoCielo = alto;
      for (var c = 0; c < capas.length; c++) {
        var cp = capas[c], L = cp.n, cx = L.getContext('2d');
        L.width = w; L.height = alto;
        L.style.height = alto + 'px';
        var cuantas = Math.round(w * alto * cp.densidad);
        cx.clearRect(0, 0, w, alto);
        for (var i = 0; i < cuantas; i++) {
          var x = Math.random() * w, y = Math.random() * alto,
              a = cp.br * (.45 + Math.random() * .55);
          if (cp.br > .9) {                        // las de delante, con halo
            cx.fillStyle = 'rgba(250,247,210,' + (a * .16).toFixed(3) + ')';
            cx.fillRect(x - cp.tam, y - cp.tam, cp.tam * 3, cp.tam * 3);
          }
          cx.fillStyle = 'rgba(244,242,226,' + a.toFixed(3) + ')';
          cx.fillRect(x, y, cp.tam, cp.tam);
        }
      }
      colocarCielos();
    }

    function colocarCielos(){
      var sc = window.pageYOffset || 0;
      for (var c = 0; c < capas.length; c++) {
        var cp = capas[c];
        // se envuelve: la capa nunca se queda sin cielo por abajo
        var y = -((sc * cp.prof) % (altoCielo - innerHeight || 1));
        cp.n.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      }
    }

    sembrarCielos();
    addEventListener('resize', sembrarCielos);

    if (!quieto) {
      var ultSc = -1;
      tareas.push(function(){
        if (document.hidden) return;
        var sc = window.pageYOffset || 0;
        if (sc === ultSc) return;        // sin scroll no hay nada que mover
        ultSc = sc;
        colocarCielos();
      });

      // la raya, cada 7-18 s. Un elemento que cruza; ni un pixel redibujado.
      if (raya) (function siguiente(){
        setTimeout(function(){
          if (!document.hidden && (!intro || intro.hidden)) {
            raya.style.top = (8 + Math.random() * 74) + 'vh';
            raya.classList.toggle('oro', Math.random() < .34);
            raya.classList.remove('va'); void raya.offsetWidth;
            raya.classList.add('va');
          }
          siguiente();
        }, 7000 + Math.random() * 11000);
      })();
    }
  }

  var cuadro = document.getElementById('g-ficha');
  if (cuadro) {
    var gTira   = document.getElementById('g-tira'),
        gTiras  = document.getElementById('g-tiras'),
        gCuenta = document.getElementById('g-cuenta'),
        gVc = document.getElementById('g-vc'), gNom = document.getElementById('g-nom'),
        gSerie = document.getElementById('g-serie'), gIr = document.getElementById('g-ir'),
        gNPieza = document.getElementById('g-npieza'),
        gSlab = document.getElementById('g-slab'),
        gBarrido = document.getElementById('g-barrido'),
        gRiel = document.getElementById('g-riel'),
        gAnt = document.getElementById('g-ant'), gSig = document.getElementById('g-sig'),
        devolver = null;

    function armarGaleria(fotos, alt){
      gTira.innerHTML = ''; gTiras.innerHTML = '';
      fotos.forEach(function(f, i){
        // la tira: todas las fotos una junto a otra, no una que se sustituye
        var hueco = document.createElement('div');
        hueco.className = 'g-hoja';
        var im = document.createElement('img');
        im.src = 'fotos/' + f; im.alt = i === 0 ? alt : '';
        // las dos primeras llegan ya; el resto en cuanto haya hueco
        im.loading = i < 2 ? 'eager' : 'lazy';
        im.decoding = 'async';
        hueco.appendChild(im); gTira.appendChild(hueco);

        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Foto ' + (i + 1));
        var mini = document.createElement('img');
        mini.src = 'fotos/' + f; mini.alt = ''; mini.loading = 'lazy';
        b.appendChild(mini);
        b.addEventListener('click', function(){ colocar(i, true); });
        gTiras.appendChild(b);
      });
      gTira.style.width = (fotos.length * 100) + '%';
      [].forEach.call(gTira.children, function(h){
        h.style.width = (100 / fotos.length) + '%';
      });
    }

    // ---- EL EXPEDIENTE se llena ------------------------------------------
    // `abrir` hace dos cosas distintas y conviene no confundirlas: PINTAR los
    // datos de la pieza (que tambien pasa al cambiar de pieza sin cerrar) y
    // ABRIR el cuadro (que solo pasa la primera vez). Por eso estan separadas.
    var vcAct = null;

    function pintar(vc, animar){
      var d = TOY.g.piezas[vc]; if (!d) return false;
      vcAct = vc;
      gVc.textContent = 'VC ' + vc;
      gNom.textContent = d.n; gSerie.textContent = d.s; gIr.href = d.u;
      if (gNPieza) gNPieza.textContent = vc;
      // el numero a tamano de cartel. Se pone ENTERO: el sufijo de las
      // reediciones —01A, 312A— es parte del nombre de la pieza, y recortarlo
      // a los digitos hacia que dos piezas distintas se rotularan igual.
      if (gSlab) gSlab.textContent = vc;

      var eP = document.getElementById('g-precio'),
          eS = document.getElementById('g-stock'),
          eB = document.getElementById('g-paypal');
      if (d.p) { contarPrecio(eP, d.p, animar); eP.hidden = false; }
      else { eP.hidden = true; }
      eS.textContent = d.st === 'agotado' ? 'Agotado' : 'Disponible';
      eS.className = 'g-stock' + (d.st === 'agotado' ? ' no' : '');
      pintarPago(vc, d, eB);

      fotosAct = d.f;
      armarGaleria(d.f, d.n);
      colocar(0, false);
      armarRiel(vc);
      pasos(vc);
      if (animar && !quieto) {                      // raya de luz y empujon
        var caja = gTira.parentNode;
        if (gBarrido) {
          gBarrido.classList.remove('pasa');
          void gBarrido.offsetWidth;                // reinicia la animacion
          gBarrido.classList.add('pasa');
        }
        if (caja) { caja.classList.remove('entra'); void caja.offsetWidth;
                    caja.classList.add('entra'); }
      }
      try { history.replaceState(null, '', '#' + 'vc-' + vc.toLowerCase()); } catch (_) {}
      return true;
    }

    // El precio SUBE hasta su valor. Es un numero, no un texto que haya que
    // leer mientras se mueve, asi que aqui el movimiento no estorba — y dura
    // medio segundo, no tres.
    function contarPrecio(nodo, fin, animar){
      var moneda = '<i>' + TOY.g.moneda + '</i>';
      if (!animar || quieto) {
        nodo.innerHTML = '$ ' + fin.toLocaleString('es-MX') + moneda; return;
      }
      var t0 = 0;
      function marco(t){
        if (!t0) t0 = t;
        var u = Math.min(1, (t - t0) / 520);
        var v = Math.round(fin * (1 - Math.pow(1 - u, 3)));
        nodo.innerHTML = '$ ' + v.toLocaleString('es-MX') + moneda;
        if (u < 1) requestAnimationFrame(marco);
      }
      requestAnimationFrame(marco);
    }

    // El riel: la coleccion sigue. Diez piezas alrededor de esta, no diez al
    // azar — el catalogo esta ordenado por numero VC y esa vecindad significa
    // algo para quien colecciona.
    function armarRiel(vc){
      if (!gRiel) return;
      var orden = TOY.g.orden || [], k = orden.indexOf(vc);
      if (k < 0) return;
      var desde = Math.max(0, Math.min(k - 5, orden.length - 11));
      gRiel.innerHTML = '';
      for (var i = desde; i < Math.min(desde + 11, orden.length); i++) {
        if (orden[i] === vc) continue;
        (function(otro){
          var d = TOY.g.piezas[otro]; if (!d) return;
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', d.n + ', VC ' + otro);
          var im = document.createElement('img');
          im.src = 'fotos/' + d.f[0]; im.alt = ''; im.loading = 'lazy';
          var et = document.createElement('b'); et.textContent = 'VC ' + otro;
          b.appendChild(im); b.appendChild(et);
          b.addEventListener('click', function(){ pintar(otro, true); });
          gRiel.appendChild(b);
        })(orden[i]);
      }
      gRiel.scrollLeft = 0;
    }

    function pasos(vc){
      var orden = TOY.g.orden || [], k = orden.indexOf(vc);
      if (gAnt) gAnt.disabled = k <= 0;
      if (gSig) gSig.disabled = k < 0 || k >= orden.length - 1;
    }
    function saltar(paso){
      var orden = TOY.g.orden || [], k = orden.indexOf(vcAct);
      if (k < 0) return;
      var j = k + paso;
      if (j < 0 || j >= orden.length) return;
      pintar(orden[j], true);
    }

    function abrir(vc, origen){
      if (!pintar(vc, false)) return;
      devolver = origen || null;
      cuadro.hidden = false;
      document.body.style.overflow = 'hidden';
      // arranca cerrado y se destapa al cuadro siguiente: si se pusiera la
      // clase en el mismo cuadro, el navegador no tendria estado "antes" del
      // que transicionar y todo apareceria de golpe
      cuadro.classList.remove('abierta');
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ cuadro.classList.add('abierta'); });
      });
      document.getElementById('g-cerrar').focus();
    }
    function cerrar(){
      cuadro.classList.remove('abierta');
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
      setTimeout(function(){
        cuadro.hidden = true;
        document.body.style.overflow = '';
        if (devolver && devolver.focus) devolver.focus();
      }, quieto ? 0 : 380);
    }
    document.getElementById('g-cerrar').addEventListener('click', cerrar);
    cuadro.addEventListener('click', function(e){
      if (e.target === cuadro || (e.target.className || '') === 'ex-velo') cerrar();
    });
    if (gAnt) gAnt.addEventListener('click', function(){ saltar(-1); });
    if (gSig) gSig.addEventListener('click', function(){ saltar(1); });
    addEventListener('keydown', function(e){
      if (cuadro.hidden) return;
      if (e.key === 'Escape') cerrar();
      // las flechas mueven la FOTO, que es lo que uno espera con la figura
      // delante; la pieza de al lado se cambia con los botones o el riel
      else if (e.key === 'ArrowRight') colocar(iAct + 1, true);
      else if (e.key === 'ArrowLeft')  colocar(iAct - 1, true);
    });
    // Enlace directo: toydarians/#vc-357 abre esa pieza. Es lo que convierte
    // la ficha en algo que se puede MANDAR por WhatsApp, que es como el cliente
    // ensena una figura.
    function porElAncla(){
      var m = (location.hash || '').match(/^#vc-([a-z0-9]+)$/i);
      if (!m) return;
      var busca = m[1].toUpperCase();
      var orden = TOY.g.orden || [];
      for (var i = 0; i < orden.length; i++)
        if (orden[i].replace(/[^A-Za-z0-9]/g, '').toUpperCase() === busca) {
          abrir(orden[i], null); return;
        }
    }
    addEventListener('hashchange', function(){
      if (!(location.hash || '').indexOf('#vc-')) porElAncla();
      else if (!cuadro.hidden) cerrar();
    });
    porElAncla();
    // Deslizar sobre la foto grande, con dedo o con raton. Antes solo se podia
    // cambiar pulsando una miniatura.
    // ---- LA TIRA HORIZONTAL ---------------------------------------------
    // Carlos: «que al deslizar a los lados se cambie como si fuesen una tira
    // horizontal, sin que se note un cambio de imagen tan notorio, y que
    // parezca que estan unidas a los lados».
    // Asi que ya no se cambia el src: las fotos estan puestas UNA JUNTO A OTRA
    // y lo que se mueve es la tira. No hay parpadeo porque no hay cambio.
    //
    // Y el otro fallo suyo: «el scroll hacia arriba y abajo tambien cambia la
    // imagen». Pasaba porque el eje del gesto se decidia AL SOLTAR, asi que un
    // dedo en diagonal contaba como deslizar. Ahora se decide en los primeros
    // pixeles y, si el gesto es vertical, se suelta la captura y la pagina
    // scrollea normal.
    var fotosAct = [], iAct = 0;
    var gx0 = null, gy0 = null, eje = null, idPuntero = null, anchoTira = 0;

    function colocar(k, animado){
      if (!fotosAct.length) return;
      iAct = Math.max(0, Math.min(fotosAct.length - 1, k));
      gTira.style.transition = animado
        ? 'transform .34s cubic-bezier(.22,.9,.28,1)' : 'none';
      gTira.style.transform = 'translate3d(' + (-iAct * 100) + '%,0,0)';
      marcarTiras(iAct);
    }
    function marcarTiras(k){
      [].forEach.call(gTiras.children, function(b, i){
        b.setAttribute('aria-current', String(i === k));
      });
      if (gCuenta) gCuenta.textContent = (k + 1) + ' / ' + fotosAct.length;
    }

    gTira.addEventListener('pointerdown', function(e){
      if (fotosAct.length < 2) return;
      gx0 = e.clientX; gy0 = e.clientY; eje = null; idPuntero = e.pointerId;
      anchoTira = gTira.parentElement.getBoundingClientRect().width || 1;
      gTira.style.transition = 'none';
    });
    gTira.addEventListener('pointermove', function(e){
      if (gx0 === null) return;
      var dx = e.clientX - gx0, dy = e.clientY - gy0;
      if (eje === null) {
        // hacen falta unos pocos pixeles para saber que quiere el dedo
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        eje = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (eje === 'x') { try { gTira.setPointerCapture(idPuntero); } catch (_) {} }
        else { gx0 = gy0 = null; return; }   // vertical: la pagina manda
      }
      // resistencia en los extremos, para que se sienta el tope
      var pos = -iAct * anchoTira + dx;
      var min = -(fotosAct.length - 1) * anchoTira;
      if (pos > 0) pos *= .32;
      else if (pos < min) pos = min + (pos - min) * .32;
      gTira.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)';
    });
    ['pointerup','pointercancel'].forEach(function(t){
      gTira.addEventListener(t, function(e){
        if (gx0 === null || eje !== 'x') { gx0 = gy0 = null; eje = null; return; }
        var dx = e.clientX - gx0;
        gx0 = gy0 = null; eje = null;
        // un quinto del ancho basta para pasar de foto
        var salto = Math.abs(dx) > anchoTira * .2 ? (dx < 0 ? 1 : -1) : 0;
        colocar(iAct + salto, true);
      });
    });
    addEventListener('keydown', function(e){
      if (cuadro.hidden) return;
      if (e.key === 'ArrowRight') colocar(iAct + 1, true);
      if (e.key === 'ArrowLeft')  colocar(iAct - 1, true);
    });
    addEventListener('resize', function(){ if (!cuadro.hidden) colocar(iAct, false); },
                     { passive: true });

    // ---- PAGO -----------------------------------------------------------
    // Con identificador: botones de PayPal de verdad. Sin el: se dice que
    // falta y se manda a la tienda. Nunca un boton que aparenta cobrar.
    // (Esta definicion se perdio en la fusion del #114/#115 y la llamada se
    //  quedo: la ficha reventaba con «pintarPago is not defined» y no abria.)
    var sdkPedido = false;
    function cargarSDK(cb){
      if (window.paypal) return cb();
      if (sdkPedido) return;
      sdkPedido = true;
      var sc = document.createElement('script');
      sc.src = 'https://www.paypal.com/sdk/js?client-id=' +
               encodeURIComponent(TOY.g.paypal) + '&currency=' + TOY.g.moneda;
      sc.onload = cb;
      sc.onerror = function(){ sdkPedido = false; };
      document.head.appendChild(sc);
    }
    function pintarPago(vc, d, caja){
      if (!caja) return;
      caja.innerHTML = '';
      if (!d.p || d.st === 'agotado') return;
      if (!TOY.g.paypal) {
        var av = document.createElement('div');
        av.className = 'g-aviso-pago';
        av.innerHTML = '<b>Pago no configurado</b>El botón de PayPal está cableado y ' +
          'listo: sólo falta el identificador de la cuenta de Toydarians. ' +
          'Mientras tanto, la compra se cierra en la tienda.';
        caja.appendChild(av);
        return;
      }
      cargarSDK(function(){
        if (!window.paypal || caja.dataset.vc === vc) return;
        caja.dataset.vc = vc;
        window.paypal.Buttons({
          style: { color:'gold', shape:'rect', label:'pay', height:44 },
          createOrder: function(_, actions){
            return actions.order.create({ purchase_units: [{
              description: 'VC ' + vc + ' · ' + d.n,
              amount: { value: d.p.toFixed(2), currency_code: TOY.g.moneda } }] });
          },
          onApprove: function(_, actions){
            return actions.order.capture().then(function(o){
              caja.innerHTML = '<div class="g-aviso-pago"><b>Pago recibido</b>' +
                'Folio ' + (o.id || '') + '. Toydarians se pone en contacto para el envío.</div>';
            });
          },
          onError: function(){
            caja.innerHTML = '<div class="g-aviso-pago"><b>No se pudo cobrar</b>' +
              'Intenta de nuevo o termina la compra en la tienda.</div>';
          }
        }).render(caja);
      });
    }

    var rej = document.getElementById('g-rejilla');
    if (rej) rej.addEventListener('click', function(e){
      var b = e.target.closest('.pieza[data-vc]');
      if (b) abrir(b.dataset.vc, b);
    });
    TOY.g.abrir = abrir;

    // ══════════════════════════════════════════════════════════════════════
    // EL MANDO DE LA VITRINA · buscar, filtrar y ordenar
    // ══════════════════════════════════════════════════════════════════════
    // Todo lo que hace falta viaja en atributos de la propia tarjeta
    // —`data-b` ya normalizado sin acentos, `data-serie`, `data-n`,
    // `data-precio`—, asi que filtrar es leer atributos y no cruzar la rejilla
    // con un objeto aparte que se puede desincronizar.
    //
    // Para ORDENAR no se mueven nodos: se les pone `order`. Mover 47 botones
    // del DOM en cada cambio de orden desconectaria los observadores de
    // revelado y perderia el foco de quien estuviera con el teclado. `order`
    // es propiedad de la rejilla y no toca el arbol.
    var mando = document.getElementById('g-mando');
    if (mando && rej) {
      var campoQ  = document.getElementById('g-q'),
          btnBorra= document.getElementById('g-borra'),
          selOrden= document.getElementById('g-orden'),
          chapas  = [].slice.call(mando.querySelectorAll('.g-chapa')),
          cuantas = document.getElementById('g-cuantas'),
          vacio   = document.getElementById('g-vacio'),
          piezas  = [].slice.call(rej.querySelectorAll('.pieza')),
          serieAct= '', plazo = null;

      // se quitan los acentos igual que se los quito el generador: «peridea»
      // tiene que encontrar «Peridea», y nadie los escribe en el telefono
      function pelar(s){
        return (s || '').toLowerCase().normalize
          ? s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          : (s || '').toLowerCase();
      }

      function comparar(modo){
        return function(a, b){
          var na = +a.dataset.n || 0, nb = +b.dataset.n || 0;
          var pa = +a.dataset.precio || 0, pb = +b.dataset.precio || 0;
          if (modo === 'n-desc') return nb - na;
          if (modo === 'p-asc')  return (pa || 1e9) - (pb || 1e9) || na - nb;
          if (modo === 'p-desc') return pb - pa || na - nb;
          if (modo === 'a-z') {
            var sa = pelar(a.querySelector('.nom').textContent),
                sb = pelar(b.querySelector('.nom').textContent);
            return sa < sb ? -1 : sa > sb ? 1 : 0;
          }
          return na - nb;                                  // n-asc, el de casa
        };
      }

      /* `forzar` distingue dos cosas que parecen una: la llamada de arranque,
         que solo coloca el orden inicial, y las que vienen de una persona
         filtrando. Solo en las segundas se enseña de una — si se forzara
         siempre, las 47 tarjetas apareceran reveladas al cargar y se cargaria
         el revelado al scrollear de Sylcred, que no es mio. */
      function aplicar(forzar){
        var q = pelar(campoQ.value.trim());
        var vistas = [];
        for (var i = 0; i < piezas.length; i++) {
          var pz = piezas[i];
          var okQ = !q || (pz.dataset.b || '').indexOf(q) >= 0;
          var okS = !serieAct || pz.dataset.serie === serieAct;
          var ok = okQ && okS;
          pz.hidden = !ok;
          if (ok) vistas.push(pz);
        }
        vistas.sort(comparar(selOrden.value));
        for (var k = 0; k < vistas.length; k++) {
          vistas[k].style.order = k;
          vistas[k].style.setProperty('--d', Math.min(k, 14));
          /* ⚠ SIN ESTO EL BUSCADOR PARECIA NO ENCONTRAR NADA. Las tarjetas
             entran con el revelado de Sylcred: `.s-rev.s-caja` arranca en
             `opacity:.001` y solo se enciende cuando el observador las ve
             entrar. Una pieza que estaba a 20 pantallas de distancia nunca
             fue vista, asi que al filtrarla quedaba ARRIBA DEL TODO Y
             TRANSPARENTE: el contador decia «2 de 47» y la pantalla estaba
             vacia. Buscaste algo y te enseño la nada.
             Quien filtra ya pidio ver eso: no hay que hacerle esperar a un
             observador. Se marca con la clase de revelado de Sylcred, que es
             justamente el contrato que expone su bloque. */
          if (forzar) vistas[k].classList.add('s-dentro');
        }
        cuantas.innerHTML = vistas.length === piezas.length
          ? piezas.length + ' piezas'
          : '<b>' + vistas.length + '</b> de ' + piezas.length + ' piezas';
        vacio.hidden = vistas.length > 0;
        btnBorra.hidden = !campoQ.value;
        if (forzar) {
          // sin transicion durante este cuadro: que el resultado este YA
          rej.classList.add('g-ya');
          requestAnimationFrame(function(){
            requestAnimationFrame(function(){ rej.classList.remove('g-ya'); });
          });
        }
        if (forzar && !quieto && vistas.length) {
          rej.classList.remove('recolocando');
          void rej.offsetWidth;                            // reinicia el escalonado
          rej.classList.add('recolocando');
        }
      }

      // se espera a que deje de teclear: filtrar en cada pulsacion con 47
      // tarjetas se nota en un telefono
      campoQ.addEventListener('input', function(){
        btnBorra.hidden = !campoQ.value;
        clearTimeout(plazo); plazo = setTimeout(function(){ aplicar(true); }, 110);
      });
      campoQ.addEventListener('keydown', function(e){
        if (e.key === 'Escape') { campoQ.value = ''; aplicar(true); }
      });
      btnBorra.addEventListener('click', function(){
        campoQ.value = ''; aplicar(true); campoQ.focus();
      });
      selOrden.addEventListener('change', function(){ aplicar(true); });
      chapas.forEach(function(ch){
        ch.addEventListener('click', function(){
          serieAct = ch.dataset.serie || '';
          chapas.forEach(function(o){
            var viva = o === ch;
            o.classList.toggle('viva', viva);
            o.setAttribute('aria-pressed', String(viva));
          });
          aplicar(true);
        });
      });
      document.getElementById('g-reiniciar').addEventListener('click', function(){
        campoQ.value = ''; serieAct = '';
        chapas.forEach(function(o, i){
          o.classList.toggle('viva', i === 0);
          o.setAttribute('aria-pressed', String(i === 0));
        });
        aplicar(true); campoQ.focus();
      });
      aplicar();
      TOY.g.filtrar = aplicar;
    }
  }

})();
