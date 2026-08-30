/* ══════════════════════════════════════════════════════════════════════════
   EL MOTOR DE LA LÁMINA
   Sin dependencias, sin librería de animación y sin una sola petición.
   ──────────────────────────────────────────────────────────────────────────
   Tres cosas y nada más:
   1 · LA CÁMARA. Tres niveles de menú —sistema, área, pieza— que se recorren
       bajando y subiendo. Bajar acerca; subir aleja. No hay salto lateral
       entre niveles del mismo rango: es un árbol, no una rueda.
   2 · EL DESTAPE. Un solo IntersectionObserver para toda la página. Uno por
       elemento serían trescientos observadores mirando la misma pantalla.
   3 · EL CAMPO. Un punto por pieza, a la deriva, encendiéndose los del
       sistema en curso. Un solo requestAnimationFrame, pausado fuera de
       pantalla y con la resolución topada — lo que cuesta un fondo vivo es
       exactamente lo que hay que vigilar, no lo que hay que suponer.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var $  = function(s){ return document.querySelector(s); };
var $$ = function(s){ return [].slice.call(document.querySelectorAll(s)); };
var crear = function(t, c){ var e = document.createElement(t); if(c) e.className = c; return e; };
var texto = function(t, c, s){ var e = crear(t, c); e.textContent = s; return e; };

document.documentElement.classList.add('con-js');

/* ── índice ───────────────────────────────────────────────────────────── */
var PORAREA = {};
NEURONAS.forEach(function(n){ (PORAREA[n.area] = PORAREA[n.area] || []).push(n); });
var AREA = {};
AREAS.forEach(function(a){ AREA[a.a] = a; });
var DESIS = {};
SISTEMAS.forEach(function(s){ s.areas.forEach(function(a){ DESIS[a] = s; }); });
var cuantasDe = function(s){
  return s.areas.reduce(function(t, a){ return t + ((PORAREA[a] || []).length); }, 0);
};

$('#cPiezas').textContent = NEURONAS.length;
$('#cAreas').textContent  = SISTEMAS.reduce(function(t,s){ return t + s.areas.length; }, 0);
$('#pieCifras').textContent = NEURONAS.length + ' piezas · ' +
  SISTEMAS.reduce(function(t,s){ return t + s.areas.length; }, 0) + ' áreas · 6 sistemas';

/* ── el tono, que es lo que hereda todo ───────────────────────────────── */
function ponerTono(t){ document.documentElement.style.setProperty('--tono', String(t)); }

/* ── estado de navegación ─────────────────────────────────────────────── */
var EN = { nivel:'sistemas', sistema:null, area:null };

/* ── LA CÁMARA ────────────────────────────────────────────────────────────
   El plano que se va y el que llega se cruzan en el mismo hueco. `hidden` no
   sirve solo: un elemento con `display:none` no anima, así que el CSS lo deja
   colocado y sólo invisible, y aquí se orquestan las clases. */
var PLANOS = { sistemas:$('#pSistemas'), areas:$('#pAreas'), piezas:$('#pPiezas') };
var ORDEN  = ['sistemas','areas','piezas'];
var moviendo = false;

function irA(nivel){
  if(moviendo || nivel === EN.nivel) return;
  var de = PLANOS[EN.nivel], a = PLANOS[nivel];
  var baja = ORDEN.indexOf(nivel) > ORDEN.indexOf(EN.nivel);
  moviendo = true;

  de.classList.remove('vivo');
  de.classList.add(baja ? 'sale-cerca' : 'sale-hondo');

  a.hidden = false;
  a.classList.remove('vivo','sale-cerca','sale-hondo');
  a.classList.add(baja ? 'entra-hondo' : 'entra-cerca');
  /* dos cuadros: uno para que el navegador tome la posición de partida y otro
     para que la transición arranque desde ella. Con uno solo el navegador
     agrupa los dos estilos y no hay transición: aparece de golpe. */
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    a.classList.remove('entra-hondo','entra-cerca');
    a.classList.add('vivo');
  }); });

  setTimeout(function(){
    de.hidden = true;
    de.classList.remove('sale-cerca','sale-hondo');
    moviendo = false;
  }, 320);

  EN.nivel = nivel;
  pintarMigas();
}

/* ── migas ────────────────────────────────────────────────────────────── */
function pintarMigas(){
  var m = $('#migas'); m.textContent = '';
  var pon = function(t, alDar, aqui){
    if(aqui){ m.appendChild(texto('span', 'aqui', t)); return; }
    var b = crear('button'); b.type = 'button'; b.textContent = t;
    b.addEventListener('click', alDar); m.appendChild(b);
  };
  pon('Lámina', function(){ subirA('sistemas'); }, EN.nivel === 'sistemas' && !EN.sistema);
  if(EN.sistema){
    m.appendChild(texto('span','sep','/'));
    pon(EN.sistema.nombre, function(){ subirA('areas'); }, EN.nivel === 'areas');
  }
  if(EN.area && EN.nivel === 'piezas'){
    m.appendChild(texto('span','sep','/'));
    pon(AREA[EN.area].nombre, null, true);
  }
  var n = EN.nivel === 'piezas' ? (PORAREA[EN.area]||[]).length
        : EN.nivel === 'areas'  ? cuantasDe(EN.sistema) : NEURONAS.length;
  $('#cuenta').textContent = n + (n === 1 ? ' pieza' : ' piezas');
}

function subirA(nivel){
  if(nivel === 'sistemas'){ EN.sistema = null; EN.area = null; ponerTono(168); }
  if(nivel === 'areas' && EN.sistema){ EN.area = null; ponerTono(EN.sistema.tono); }
  irA(nivel);
  $('#atlas').scrollIntoView({ block:'start' });
}

/* ── NIVEL 1 · los seis sistemas ──────────────────────────────────────── */
(function(){
  var z = $('#listaSistemas');
  SISTEMAS.forEach(function(s, i){
    var b = crear('sis' === '' ? 'div' : 'button', 'sis surge d' + (i+1));
    b.type = 'button';
    b.style.setProperty('--t', String(s.tono));
    b.setAttribute('aria-label', s.nombre + ', ' + s.areas.length + ' áreas, ' +
                   cuantasDe(s) + ' piezas');
    b.appendChild(texto('span','num', String(s.n).padStart(2,'0')));
    b.appendChild(texto('h3', null, s.nombre));
    b.appendChild(texto('p', null, s.lema));
    var pie = crear('div','pie');
    pie.appendChild(texto('b', null, s.areas.length + ' áreas'));
    pie.appendChild(texto('span', null, cuantasDe(s) + ' piezas'));
    b.appendChild(pie);
    b.addEventListener('click', function(){ abrirSistema(s); });
    z.appendChild(b);
  });
})();

function abrirSistema(s){
  EN.sistema = s; EN.area = null;
  ponerTono(s.tono);
  $('#tAreas').firstElementChild.textContent = s.nombre;
  $('#dAreas').textContent = s.lema;
  var z = $('#listaAreas'); z.textContent = '';
  s.areas.forEach(function(a, i){
    var d = AREA[a] || { nombre:a, que:'' };
    var b = crear('button','area');
    b.type = 'button';
    b.appendChild(texto('span','n', String(i+1).padStart(2,'0')));
    b.appendChild(texto('span','nom', d.nombre));
    b.appendChild(texto('span','q', d.que || ''));
    b.appendChild(texto('span','cuantas', (PORAREA[a]||[]).length + ' piezas'));
    b.addEventListener('click', function(){ abrirArea(a); });
    z.appendChild(b);
  });
  irA('areas');
  $('#tAreas').classList.add('visible');
  $('#atlas').scrollIntoView({ block:'start' });
}

/* ── NIVEL 3 · las piezas ─────────────────────────────────────────────── */
function abrirArea(a){
  EN.area = a;
  var d = AREA[a] || { nombre:a, que:'' };
  $('#tPiezas').firstElementChild.textContent = d.nombre;
  $('#dPiezas').textContent = d.que || '';
  $('#volverAreas').textContent = EN.sistema ? EN.sistema.nombre : 'Las áreas';
  var z = $('#listaPiezas'); z.textContent = '';
  (PORAREA[a] || []).forEach(function(n){
    var b = crear('button','pieza');
    b.type = 'button';
    b.appendChild(crear('span','grav ' + (n.gravedad || 'media')));
    var t = crear('span','tit');
    t.appendChild(document.createTextNode(n.titulo));
    t.appendChild(texto('span','sin', n.sintoma || ''));
    b.appendChild(t);
    b.addEventListener('click', function(){ abrirFicha(n, b); });
    z.appendChild(b);
  });
  irA('piezas');
  $('#tPiezas').classList.add('visible');
  $('#atlas').scrollIntoView({ block:'start' });
}

$$('.volver').forEach(function(b){
  b.addEventListener('click', function(){ subirA(b.dataset.sube); });
});

/* ── LA FICHA ─────────────────────────────────────────────────────────────
   Capa de detalle, no un cuarto nivel de menú: se abre encima y se cierra al
   mismo sitio del que salió. Devuelve el foco a quien la abrió, que es lo que
   espera quien navega con teclado. */
var ficha = $('#ficha'), fondo = $('#fichaFondo'), quienAbrio = null;

function abrirFicha(n, origen){
  quienAbrio = origen || null;
  ficha.textContent = '';
  var cab = crear('div','cab');
  var col = crear('div');
  col.appendChild(texto('p','marca-grav', 'Gravedad ' + (n.gravedad || 'media')));
  var h = texto('h3', null, n.titulo); h.id = 'fTitulo';
  col.appendChild(h);
  cab.appendChild(col);
  var x = crear('button','cerrar'); x.type = 'button'; x.textContent = '×';
  x.setAttribute('aria-label','Cerrar');
  x.addEventListener('click', cerrarFicha);
  cab.appendChild(x);

  var caja = crear('div','ancho');
  caja.appendChild(cab);
  var dl = crear('dl');
  [['Síntoma', n.sintoma], ['Causa', n.causa], ['Por qué se comete', n.porque],
   ['Arreglo', n.arreglo], ['Cómo cazarlo', n.comoCazarlo], ['Consejo', n.consejo]
  ].forEach(function(par){
    if(!par[1]) return;
    dl.appendChild(texto('dt', null, par[0]));
    var dd = crear('dd'); dd.innerHTML = par[1];   /* texto propio, con negritas mías */
    dl.appendChild(dd);
  });
  if(n.senales && n.senales.length){
    dl.appendChild(texto('dt', null, 'Se oye así'));
    var dd2 = crear('dd');
    n.senales.forEach(function(s){ dd2.appendChild(texto('span','senal', '«' + s + '»')); });
    dl.appendChild(dd2);
  }
  caja.appendChild(dl);
  if(n.salioDe) caja.appendChild(texto('p','salio', 'Salió de: ' + n.salioDe));
  ficha.appendChild(caja);

  fondo.hidden = false; ficha.hidden = false;
  requestAnimationFrame(function(){
    fondo.classList.add('viva'); ficha.classList.add('viva');
  });
  document.body.style.overflow = 'hidden';
  x.focus();
}
function cerrarFicha(){
  fondo.classList.remove('viva'); ficha.classList.remove('viva');
  document.body.style.overflow = '';
  setTimeout(function(){ fondo.hidden = true; ficha.hidden = true; }, 400);
  if(quienAbrio) quienAbrio.focus();
}
fondo.addEventListener('click', cerrarFicha);
addEventListener('keydown', function(e){
  if(e.key === 'Escape' && !ficha.hidden) cerrarFicha();
});

/* ── EL DIAGNÓSTICO ───────────────────────────────────────────────────────
   Se marcan síntomas y se van cerrando las piezas que los explican. Las
   señales salen de las propias piezas, así que no hay una lista escrita a
   mano que se quede vieja. */
(function(){
  var cuenta = {};
  NEURONAS.forEach(function(n){
    (n.senales || []).forEach(function(s){
      var k = String(s).toLowerCase().trim();
      if(k.length < 4) return;
      (cuenta[k] = cuenta[k] || { n:0, piezas:[] });
      cuenta[k].n++; cuenta[k].piezas.push(n);
    });
  });
  /* ⚠ NI LAS MÁS RARAS NI LAS MÁS COMUNES. Una señal que aparece una sola vez
     devuelve siempre la misma pieza —no es un diagnóstico, es un atajo— y una
     que aparece en cuarenta no descarta nada. El rango de en medio es el que
     tiene poder de discriminación. */
  var elegidas = Object.keys(cuenta)
    .filter(function(k){ return cuenta[k].n >= 2 && cuenta[k].n <= 14; })
    .sort(function(a,b){ return cuenta[b].n - cuenta[a].n; })
    .slice(0, 18)
    .sort();

  var marcadas = {};
  var z = $('#sintomas');
  elegidas.forEach(function(k){
    var b = crear('button','sintoma');
    b.type = 'button'; b.textContent = '«' + k + '»';
    b.setAttribute('aria-pressed','false');
    b.addEventListener('click', function(){
      marcadas[k] = !marcadas[k];
      b.setAttribute('aria-pressed', marcadas[k] ? 'true' : 'false');
      pintar();
    });
    z.appendChild(b);
  });

  function pintar(){
    var claves = Object.keys(marcadas).filter(function(k){ return marcadas[k]; });
    var r = $('#resultado'); r.textContent = '';
    if(!claves.length){
      r.appendChild(texto('p','vacio',
        'Marca al menos un síntoma. Sin ninguno esto no es una lista vacía: ' +
        'es que todavía no le has dicho nada.'));
      return;
    }
    var punto = {};
    claves.forEach(function(k){
      cuenta[k].piezas.forEach(function(n){ punto[n.id] = (punto[n.id] || 0) + 1; });
    });
    var lista = NEURONAS.filter(function(n){ return punto[n.id]; })
      .sort(function(a,b){ return punto[b.id] - punto[a.id]; })
      .slice(0, 12);

    r.appendChild(texto('p','contador',
      lista.length + ' de ' + NEURONAS.length + ' piezas explican ' +
      (claves.length === 1 ? 'ese síntoma' : 'esos ' + claves.length + ' síntomas')));
    var caja = crear('div','piezas');
    lista.forEach(function(n){
      var b = crear('button','pieza');
      b.type = 'button';
      b.appendChild(crear('span','grav ' + (n.gravedad || 'media')));
      var t = crear('span','tit');
      t.appendChild(document.createTextNode(n.titulo));
      var s = DESIS[n.area];
      t.appendChild(texto('span','sin',
        (AREA[n.area] ? AREA[n.area].nombre : n.area) + (s ? ' · ' + s.nombre : '')));
      b.appendChild(t);
      b.addEventListener('click', function(){
        if(s) ponerTono(s.tono);
        abrirFicha(n, b);
      });
      caja.appendChild(b);
    });
    r.appendChild(caja);
  }
})();

/* ── EL DESTAPE · un observador para toda la página ───────────────────── */
(function(){
  if(!('IntersectionObserver' in window)){
    $$('.destapa, .surge, .maquina').forEach(function(e){ e.classList.add('visible'); });
    return;
  }
  var ob = new IntersectionObserver(function(filas){
    filas.forEach(function(f){
      if(!f.isIntersecting) return;
      f.target.classList.add('visible');
      ob.unobserve(f.target);          /* una vez destapado, deja de mirarse */
    });
  }, { rootMargin:'0px 0px -12% 0px', threshold:0.02 });
  $$('section, .destapa, .surge, .maquina').forEach(function(e){ ob.observe(e); });
  /* lo que ya está en pantalla al cargar se destapa en el primer cuadro: si
     esperara al observador, el pórtico entraría con un parpadeo */
  requestAnimationFrame(function(){
    $$('#portico .destapa, #portico .surge').forEach(function(e){ e.classList.add('visible'); });
  });
})();

/* ── EL CAMPO ─────────────────────────────────────────────────────────────
   Un punto por pieza. Deriva lenta, se encienden los del sistema en curso.
   Un solo rAF, resolución topada a 1.5 y parado cuando la pestaña no se ve:
   un fondo vivo que cuesta batería es un fondo que hay que quitar. */
(function(){
  var c = $('#campo');
  if(!c || !c.getContext) return;
  var g = c.getContext('2d', { alpha:true });
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var puntos = [], dpr = 1, an = 0, al = 0, corriendo = false, t0 = 0;

  function medir(){
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    an = innerWidth; al = innerHeight;
    c.width = Math.round(an*dpr); c.height = Math.round(al*dpr);
    c.style.width = an + 'px'; c.style.height = al + 'px';
    g.setTransform(dpr,0,0,dpr,0,0);
  }
  function sembrar(){
    puntos = NEURONAS.map(function(n, i){
      var s = DESIS[n.area];
      /* posición determinista: la misma pieza cae siempre en el mismo sitio,
         así que el fondo no baila entre recargas */
      var a = (i * 2.39996);                      /* ángulo áureo */
      var r = Math.sqrt(i / NEURONAS.length);
      return { x:.5 + Math.cos(a)*r*.62, y:.5 + Math.sin(a)*r*.52,
               t:s ? s.tono : 168, sis:s ? s.id : null,
               f:(i % 37) / 37, v:.12 + (i % 11)/70 };
    });
  }
  function cuadro(ms){
    if(!corriendo) return;
    var t = (ms - t0) / 1000;
    g.clearRect(0,0,an,al);
    var actual = EN.sistema ? EN.sistema.id : null;
    for(var i = 0; i < puntos.length; i++){
      var p = puntos[i];
      var ox = Math.sin(t*p.v + p.f*6.283) * 9;
      var oy = Math.cos(t*p.v*0.8 + p.f*6.283) * 7;
      var x = p.x*an + ox, y = p.y*al + oy;
      var suyo = !actual || p.sis === actual;
      g.beginPath();
      g.arc(x, y, suyo ? 1.7 : 1.05, 0, 6.2832);
      g.fillStyle = suyo ? 'hsla(' + p.t + ',70%,62%,' + (0.16 + 0.1*Math.sin(t*p.v*2+p.f*6)) + ')'
                         : 'hsla(180,12%,60%,.05)';
      g.fill();
    }
    requestAnimationFrame(cuadro);
  }
  function arrancar(){
    if(corriendo || reduce.matches) return;
    corriendo = true; t0 = performance.now();
    requestAnimationFrame(function(ms){ t0 = ms; cuadro(ms); });
  }
  function parar(){ corriendo = false; }

  medir(); sembrar();
  var esperando;
  addEventListener('resize', function(){
    clearTimeout(esperando); esperando = setTimeout(function(){ medir(); }, 140);
  });
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) parar(); else arrancar();
  });
  if(reduce.matches){                 /* quieto, pero dibujado una vez */
    corriendo = true; t0 = performance.now(); cuadroUnico();
    function cuadroUnico(){ corriendo = true; var m = t0; corriendo = false;
      g.clearRect(0,0,an,al);
      puntos.forEach(function(p){
        g.beginPath(); g.arc(p.x*an, p.y*al, 1.4, 0, 6.2832);
        g.fillStyle = 'hsla(' + p.t + ',70%,62%,.16)'; g.fill();
      });
    }
  } else arrancar();
})();

pintarMigas();
})();
