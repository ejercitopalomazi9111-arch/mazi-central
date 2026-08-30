/* ══════════════════════════════════════════════════════════════════════════
   EL MOTOR · sin dependencias y sin una sola petición
   ──────────────────────────────────────────────────────────────────────────
   Tres cosas:
   1 · EL MONTAJE de la portada: las tres piezas recortadas entran y se posan.
   2 · EL CORTE ANIMADO: cinco pasos que se pueden tocar uno a uno o ver
       seguidos. Es un SVG con cuatro rectángulos que cambian de alto; no hay
       vídeo, no hay GIF y no hay librería.
   3 · EL DESTAPE al entrar en pantalla, con UN observador para toda la página.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
var $  = function(s){ return document.querySelector(s); };
var $$ = function(s){ return [].slice.call(document.querySelectorAll(s)); };
document.documentElement.classList.add('con-js');
var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── 1 · las tres piezas se montan ─────────────────────────────────────── */
requestAnimationFrame(function(){
  requestAnimationFrame(function(){ $('#montaje').classList.add('armado'); });
});

/* ── 2 · los tamaños. Las tallas son las que se venden; los mililitros salen
   de multiplicar por 50, que es la taza pequeña con la que se cuentan. ──── */
var TALLAS = [1, 2, 3, 4, 6, 9, 12, 18];
(function(){
  var z = $('#tallas'), max = TALLAS[TALLAS.length-1];
  TALLAS.forEach(function(t){
    var f = document.createElement('div'); f.className = 'talla';
    var n = document.createElement('span'); n.className = 'nom';
    n.textContent = t + (t === 1 ? ' taza' : ' tazas');
    var b = document.createElement('div'); b.className = 'barra';
    var i = document.createElement('i'); i.style.transform = 'scaleX(0)';
    /* ⚠ LA BARRA VA EN RAÍZ CUADRADA Y HAY QUE DECIRLO. En lineal, la de 18
       tazas es dieciocho veces la de 1 y las seis primeras se ven todas
       iguales: la gráfica deja de informar justo donde la gente elige. La
       raíz reparte el espacio y el número exacto va escrito al lado. */
    i.dataset.ancho = (Math.sqrt(t/max)*100).toFixed(1);
    b.appendChild(i);
    var ml = document.createElement('span'); ml.className = 'ml';
    ml.textContent = (t*50) + ' ml';
    f.appendChild(n); f.appendChild(b); f.appendChild(ml);
    z.appendChild(f);
  });
})();

/* ── 3 · el corte animado ──────────────────────────────────────────────── */
(function(){
  var agua = $('#agua'), col = $('#columna'), arriba = $('#cafeArriba'),
      llama = $('#llama'), vapor = $('#vapor');
  if(!agua) return;
  var botones = $$('.paso');
  var tic = null;

  /* Cada paso es un estado del dibujo, no un fotograma: así se puede saltar a
     cualquiera tocándolo, que es lo que la gente hace. */
  var ESTADOS = [
    { agua:120, col:0,  arriba:0,   llama:0, vapor:0 },   /* agua fría */
    { agua:118, col:0,  arriba:0,   llama:1, vapor:0 },   /* sube la presión */
    { agua: 74, col:80, arriba:0,   llama:1, vapor:0 },   /* atraviesa el café */
    { agua: 26, col:80, arriba:96,  llama:1, vapor:.5 },  /* llena la jarra */
    { agua:  6, col:80, arriba:126, llama:1, vapor:1 },   /* el gorgoteo */
  ];
  var actual = 0;

  function pintar(i, suave){
    var e = ESTADOS[i];
    var dur = (suave && !quieto) ? '1.1s' : '0s';
    [agua, col, arriba].forEach(function(el){
      el.style.transition = 'y ' + dur + ' cubic-bezier(.22,.61,.30,1), height ' + dur + ' cubic-bezier(.22,.61,.30,1)';
    });
    llama.style.transition = vapor.style.transition = 'opacity .6s ease';
    /* el agua baja desde arriba: se mueve la y y se encoge el alto */
    agua.setAttribute('y', 370 - e.agua); agua.setAttribute('height', e.agua);
    col.setAttribute('y', 230 - e.col);   col.setAttribute('height', e.col);
    arriba.setAttribute('y', 156 - e.arriba); arriba.setAttribute('height', e.arriba);
    llama.style.opacity = e.llama; vapor.style.opacity = e.vapor;
    botones.forEach(function(b, k){ b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    actual = i;
  }

  botones.forEach(function(b){
    b.addEventListener('click', function(){
      clearInterval(tic); tic = null;
      pintar(Number(b.dataset.paso), true);
    });
  });
  $('#bJugar').addEventListener('click', function(){
    clearInterval(tic);
    /* ⚠ SE ARRANCA DESDE EL PRINCIPIO SIEMPRE. Si empezara donde se quedó, dar
       a «ver el ciclo» estando en el último paso no haría nada visible, y un
       botón que a veces no hace nada es peor que uno que no está. */
    pintar(0, false);
    var i = 0;
    tic = setInterval(function(){
      i++;
      if(i >= ESTADOS.length){ clearInterval(tic); tic = null; return; }
      pintar(i, true);
    }, quieto ? 300 : 1500);
  });
  $('#bReiniciar').addEventListener('click', function(){
    clearInterval(tic); tic = null; pintar(0, true);
  });
  pintar(0, false);
})();

/* ── 4 · el destape, con un observador para toda la página ─────────────── */
(function(){
  if(!('IntersectionObserver' in window)){
    $$('section, .destapa, .surge, .tallas').forEach(function(e){ e.classList.add('visible'); });
    $$('.talla .barra i').forEach(function(i){ i.style.transform = 'scaleX(1)'; });
    return;
  }
  var ob = new IntersectionObserver(function(filas){
    filas.forEach(function(f){
      if(!f.isIntersecting) return;
      f.target.classList.add('visible');
      if(f.target.id === 'tamanos')
        $$('.talla .barra i').forEach(function(i){ i.style.transform = 'scaleX(' + (i.dataset.ancho/100) + ')'; });
      ob.unobserve(f.target);
    });
  }, { rootMargin:'0px 0px -12% 0px', threshold:.03 });
  $$('section, .destapa, .surge').forEach(function(e){ ob.observe(e); });
  requestAnimationFrame(function(){
    $$('.portada .destapa, .portada .surge').forEach(function(e){ e.classList.add('visible'); });
  });
})();
})();
