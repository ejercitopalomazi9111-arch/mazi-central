/* ══════════════════════════════════════════════════════════════════════════
   El motor de la lámina. Sin dependencias.

   Lo único que necesita JavaScript es la CONSULTA. Todo lo demás —el atlas,
   los instrumentos, las fuentes y el índice de las 350— es HTML de verdad y se
   lee entero con el JavaScript apagado. Está dicho en la propia página, no en
   una nota al pie.

   ── DOS TRAMPAS QUE ESTÁN AQUÍ POR ALGO ────────────────────────────────
   · La preferencia de tema se aplica ANTES de pintar, en el <head>. Si se
     aplica aquí, hay un destello del tema equivocado en cada carga.
   · El texto de la persona nunca toca innerHTML. Lo que sí lo toca es el
     contenido propio de las neuronas, que trae negritas escritas por mí.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var $ = function(s){ return document.querySelector(s); };

/* Las piezas están escritas con el marcado del cerebro: `código` entre acentos
   graves y **negritas**. Se escapa PRIMERO y se convierte después, en ese
   orden: al revés, un título con un signo de menor que se convierte en
   etiqueta. El texto es mío, no de nadie que escriba en la página, pero el
   orden correcto no cuesta nada y el incorrecto se paga una sola vez. */
function marcado(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}
var crear = function(t,c){ var e=document.createElement(t); if(c) e.className=c; return e; };

/* ── el tema ──────────────────────────────────────────────────────────── */
$('#bTema').addEventListener('click', function(){
  var raiz = document.documentElement;
  var ahora = raiz.getAttribute('data-tema');
  var oscuroPorSistema = matchMedia('(prefers-color-scheme: dark)').matches;
  var siguiente = ahora ? (ahora === 'oscuro' ? 'claro' : 'oscuro')
                        : (oscuroPorSistema ? 'claro' : 'oscuro');
  raiz.setAttribute('data-tema', siguiente);
  try{ localStorage.setItem('lamina_tema', siguiente); }catch(e){}
  etiquetaTema();
});
/* el botón dice a DÓNDE lleva, no dónde estás: es lo que la gente lee */
function etiquetaTema(){
  var raiz = document.documentElement, puesto = raiz.getAttribute('data-tema');
  var enOscuro = puesto ? puesto === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('#temaTexto').textContent = enOscuro ? 'Papel' : 'Carbón';
  $('#bTema').setAttribute('aria-label', enOscuro ? 'Cambiar a papel claro' : 'Cambiar a carbón oscuro');
}
etiquetaTema();

/* ── la consulta ──────────────────────────────────────────────────────── */
var NORM = function(s){
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'');   /* sin acentos: casi nadie los teclea */
};

/* El texto sobre el que se busca, preparado una sola vez. Buscar sobre el
   objeto entero en cada tecla es lo que hace que un buscador se sienta lento. */
var INDICE = NEURONAS.map(function(n){
  return NORM([n.titulo, n.area, n.sintoma, n.causa, (n.senales||[]).join(' ')].join(' '));
});

/* Rareza: una palabra que sale en 200 piezas no distingue nada; una que sale en
   dos, sí. Sin esto, cinco resultados empatan y la lista deja de ser un orden. */
var RAREZA = (function(){
  var doc = {}, total = NEURONAS.length;
  INDICE.forEach(function(t){
    var vistas = {};
    t.split(/[^a-z0-9]+/).forEach(function(p){
      if(p.length < 3 || vistas[p]) return;
      vistas[p] = 1; doc[p] = (doc[p]||0) + 1;
    });
  });
  var r = {};
  for(var p in doc) r[p] = Math.log(total / doc[p]);
  return r;
})();

/* Palabras que no distinguen nada. Sin esta lista, «mexico sin acentos ni
   nada» devolvía 228 de 350 piezas: «sin», «ni» y «nada» salen en casi todas y
   el resultado dejaba de ser una búsqueda para ser la lista entera. */
var VACIAS = {a:1,al:1,de:1,del:1,la:1,el:1,los:1,las:1,en:1,y:1,o:1,un:1,una:1,
  unos:1,unas:1,se:1,que:1,no:1,ni:1,si:1,sin:1,con:1,por:1,para:1,es:1,son:1,
  mas:1,muy:1,ya:1,lo:1,su:1,sus:1,me:1,te:1,le:1,nada:1,todo:1,toda:1,esta:1,
  este:1,eso:1,esa:1,ese:1,como:1,cuando:1,donde:1,pero:1,hay:1};

function buscar(consulta){
  var crudas = NORM(consulta).split(/[^a-z0-9]+/).filter(function(p){ return p.length >= 3; });
  /* fuera las vacías y las que salen en más de un tercio del registro: una
     palabra que aparece en 120 piezas no separa nada */
  var partes = crudas.filter(function(p){
    return !VACIAS[p] && (RAREZA[p] === undefined || RAREZA[p] > 1.1);
  });
  if(!crudas.length) return null;      /* campo vacío: se enseña el arranque */
  if(!partes.length) return [];        /* sólo palabras que no distinguen */
  var res = [];
  for(var i = 0; i < NEURONAS.length; i++){
    var t = INDICE[i], punto = 0, todas = true;
    for(var k = 0; k < partes.length; k++){
      var p = partes[k];
      if(t.indexOf(p) < 0){ todas = false; continue; }
      var peso = RAREZA[p] || 2.5;
      punto += peso;
      /* que aparezca en el título vale más que en el cuerpo */
      if(NORM(NEURONAS[i].titulo).indexOf(p) >= 0) punto += peso * 1.6;
      if(NORM(NEURONAS[i].area).indexOf(p) >= 0) punto += peso * 1.2;
    }
    if(punto > 0){ res.push({ n:NEURONAS[i], punto:punto, todas:todas }); }
  }
  /* las que traen TODAS las palabras van primero; dentro, por rareza */
  res.sort(function(a,b){
    if(a.todas !== b.todas) return a.todas ? -1 : 1;
    return b.punto - a.punto;
  });
  /* y se corta por debajo de una cuarta parte de la mejor: lo que queda muy
     lejos del primero es ruido, y una lista larga de ruido esconde el acierto */
  if(res.length){
    var piso = res[0].punto * 0.25;
    res = res.filter(function(x){ return x.punto >= piso; });
  }
  return res;
}

/* Filtrar por área es otra cosa que buscar el nombre del área: «sombras»
   aparece como palabra en 21 piezas y el área tiene 15. Tocar un área del
   atlas tiene que dar las 15, no las 21. */
function porArea(area){
  return NEURONAS.filter(function(n){ return n.area === area; })
                 .map(function(n){ return { n:n, punto:1, todas:true }; });
}

var GRAVEDAD = { alta:'alta', media:'media', baja:'baja' };

function pintarFicha(n, pos){
  var el = crear('div','ficha');
  var cab = crear('button','cab');
  cab.type = 'button';
  cab.setAttribute('aria-expanded','false');

  var m = crear('span','marca'); m.textContent = ('00'+pos).slice(-3);
  var t = crear('span','tit');   t.innerHTML = marcado(n.titulo);
  var g = crear('span','gr ' + (GRAVEDAD[n.gravedad]||''));
  g.title = 'gravedad ' + (n.gravedad||'');
  cab.appendChild(m); cab.appendChild(t); cab.appendChild(g);

  var cuerpo = crear('div','cuerpo');
  cuerpo.hidden = true;
  var dl = crear('dl');
  [['Área', n.area], ['Síntoma', n.sintoma], ['Causa', n.causa],
   ['Por qué', n.porque], ['Arreglo', n.arreglo], ['Cómo cazarlo', n.comoCazarlo],
   ['Consejo', n.consejo], ['Salió de', n.salioDe]].forEach(function(par){
    if(!par[1]) return;
    var dt = crear('dt'); dt.textContent = par[0];
    var dd = crear('dd'); dd.innerHTML = marcado(par[1]);
    dl.appendChild(dt); dl.appendChild(dd);
  });
  cuerpo.appendChild(dl);
  if(n.senales && n.senales.length){
    var s = crear('div','senales');
    n.senales.forEach(function(x){ var e = crear('span'); e.textContent = '«' + x + '»'; s.appendChild(e); });
    cuerpo.appendChild(s);
  }

  cab.addEventListener('click', function(){
    var abierto = !cuerpo.hidden;
    cuerpo.hidden = abierto;
    cab.setAttribute('aria-expanded', String(!abierto));
  });
  el.appendChild(cab); el.appendChild(cuerpo);
  return el;
}

var zFichas = $('#fichas'), zCuantos = $('#cuantos'), campo = $('#q'), bLimpiar = $('#bLimpiar');

function pintar(consulta, area){
  var res = area ? porArea(area) : buscar(consulta);
  zFichas.textContent = '';
  bLimpiar.hidden = !consulta;

  if(res === null){
    /* Una herramienta que arranca vacía obliga a adivinar qué escribir. Se
       enseñan las de gravedad alta, que son con las que conviene empezar. */
    var altas = NEURONAS.filter(function(n){ return n.gravedad === 'alta'; });
    zCuantos.textContent = NEURONAS.length + ' piezas en el registro · abajo, las '
      + altas.length + ' de gravedad alta · escribe para buscar en todas';
    for(var j = 0; j < altas.length; j++) zFichas.appendChild(pintarFicha(altas[j], j + 1));
    return;
  }
  if(!res.length){
    zCuantos.textContent = 'ninguna pieza coincide con «' + consulta + '»';
    var v = crear('div','anota');
    v.innerHTML = '<b>Nada con esas palabras.</b> Prueba con el síntoma en vez '
      + 'del término técnico: «se ve sucio», «va a tirones», «no se lee», «salta '
      + 'al cargar». O toca un área del atlas de arriba.';
    zFichas.appendChild(v);
    return;
  }
  zCuantos.textContent = area
    ? res.length + ' piezas del área «' + area + '»'
    : res.length + ' de ' + NEURONAS.length + ' piezas';
  var tope = Math.min(res.length, 40);
  for(var i = 0; i < tope; i++) zFichas.appendChild(pintarFicha(res[i].n, i + 1));
  if(res.length > tope){
    var mas = crear('p','cuantos');
    mas.textContent = 'y ' + (res.length - tope) + ' más — afina la búsqueda';
    zFichas.appendChild(mas);
  }
}

var espera = null;
campo.addEventListener('input', function(){
  /* se espera a que deje de escribir: una consulta por tecla parpadea */
  clearTimeout(espera);
  espera = setTimeout(function(){ pintar(campo.value.trim()); }, 90);
});
campo.addEventListener('keydown', function(ev){
  if(ev.key === 'Escape' && campo.value){ ev.preventDefault(); limpiar(); }
});
function limpiar(){ campo.value = ''; pintar(''); campo.focus(); }
bLimpiar.addEventListener('click', limpiar);

/* ── el atlas manda a la consulta ─────────────────────────────────────── */
$('#rejillaAtlas').addEventListener('click', function(ev){
  var b = ev.target.closest('[data-area]');
  if(!b) return;
  campo.value = b.dataset.area;
  pintar(b.dataset.area, b.dataset.area);
  $('#consulta').scrollIntoView({ block:'start' });
  campo.focus({ preventScroll:true });
});

/* ── el índice también ────────────────────────────────────────────────── */
$('#indice').addEventListener('click', function(ev){
  var a = ev.target.closest('a[data-id]');
  if(!a) return;
  ev.preventDefault();
  var n = NEURONAS.filter(function(x){ return x.id === a.dataset.id; })[0];
  if(!n) return;
  campo.value = n.titulo;
  zFichas.textContent = '';
  zCuantos.textContent = 'una pieza';
  var f = pintarFicha(n, 1);
  zFichas.appendChild(f);
  f.querySelector('.cab').click();
  $('#consulta').scrollIntoView({ block:'start' });
});

pintar('');
})();
