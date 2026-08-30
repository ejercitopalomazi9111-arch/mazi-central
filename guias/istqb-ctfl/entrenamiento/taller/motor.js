/* ══════════════════════════════════════════════════════════════════════════
   EL MOTOR
   Sin dependencias. Todo el estado vive en un objeto y en localStorage.

   ── TRES COSAS QUE YA MORDIERON Y ESTÁN AQUÍ POR ESO ───────────────────
   1 · `localStorage` truena en Safari privado y con las cookies bloqueadas.
       No es teórico: es el navegador de la mitad de la gente. Cada lectura y
       cada escritura van dentro de try/catch, y si no se puede guardar la app
       SIGUE funcionando — se pierde el avance al cerrar, y se avisa.
   2 · El enunciado lleva HTML mío (negritas, tablas) y por eso va con
       innerHTML. Lo que escribe la persona NUNCA: eso va con textContent. Si
       algún día se mezclan los dos caminos, un nombre con `<script>` se
       ejecuta en su propia constancia.
   3 · Los botones se pintan desde el estado, no al revés. Antes de esto había
       un «Siguiente» que quedaba activo en el nivel 50 y no llevaba a ningún
       lado.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var LLAVE = 'mazi_istqb_v1';
var TOTAL = NIVELES.length;
var BLOQUES = [
  { n:1, nombre:'Fundamentos de las pruebas' },
  { n:2, nombre:'Pruebas a lo largo del ciclo de vida' },
  { n:3, nombre:'Pruebas estáticas' },
  { n:4, nombre:'Técnicas de diseño' },
  { n:5, nombre:'Gestión de las pruebas' },
  { n:6, nombre:'Herramientas y cierre' }
];

var E = { nombre:'', puesto:'', hechos:[], folio:'', fecha:'', pistasUsadas:{}, manuales:{} };
var actual = null, seleccion = [], resuelto = false, pistasVistas = 0;
var guardaSirve = true;

var $ = function(s){ return document.querySelector(s); };
var crear = function(t, c){ var e = document.createElement(t); if(c) e.className = c; return e; };

/* ── estado ───────────────────────────────────────────────────────────── */
function cargar(){
  try{
    var crudo = localStorage.getItem(LLAVE);
    if(crudo){ var d = JSON.parse(crudo); for(var k in d) if(d.hasOwnProperty(k)) E[k] = d[k]; }
  }catch(err){ guardaSirve = false; }
}
function guardar(){
  try{ localStorage.setItem(LLAVE, JSON.stringify(E)); }
  catch(err){ guardaSirve = false; }
}
function hecho(n){ return E.hechos.indexOf(n) >= 0; }
function abierto(n){ return n === 1 || hecho(n) || hecho(n - 1); }

/* Un folio corto y estable: sale del nombre y de la fecha, así que la misma
   persona el mismo día ve siempre el mismo número. Nada de aleatorio: un
   folio que cambia cada vez que abres la página no sirve para verificar. */
function folioDe(nombre, fecha){
  var s = 0, t = String(nombre).toUpperCase() + '|' + fecha;
  for(var i = 0; i < t.length; i++){ s = (s * 31 + t.charCodeAt(i)) >>> 0; }
  var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
  for(var j = 0; j < 6; j++){ out += letras[s % letras.length]; s = Math.floor(s / letras.length) + 7; }
  return 'GM-CTFL-' + fecha.replace(/-/g, '') + '-' + out;
}
function hoyISO(){
  var d = new Date(), m = ('0' + (d.getMonth() + 1)).slice(-2), a = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '-' + m + '-' + a;
}
function fechaLarga(iso){
  var MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
             'septiembre','octubre','noviembre','diciembre'];
  var p = iso.split('-');
  return Number(p[2]) + ' de ' + MES[Number(p[1]) - 1] + ' de ' + p[0];
}

/* ── pantallas ────────────────────────────────────────────────────────── */
function ver(id){
  var todas = document.querySelectorAll('.pantalla');
  for(var i = 0; i < todas.length; i++) todas[i].classList.remove('viva');
  $(id).classList.add('viva');
  window.scrollTo(0, 0);
  $('#bSalir').hidden = (id === '#pPortada');
  /* textContent y no innerHTML: aquí va lo que escribió la persona */
  $('#quien').textContent = (id === '#pPortada') ? '' : (E.nombre || '');
}

/* ── mapa ─────────────────────────────────────────────────────────────── */
function pintarMapa(){
  var n = E.hechos.length;
  $('#mHechos').textContent = n;
  $('#mRiel').style.width = Math.round(n * 100 / TOTAL) + '%';
  $('#mNota').textContent = n === 0 ? 'Empieza por el nivel 1. Se abren en orden.'
    : n === TOTAL ? 'Los cincuenta. Tus constancias están listas.'
    : 'Te faltan ' + (TOTAL - n) + '. El siguiente se abre al resolver el anterior.'
      + (guardaSirve ? '' : ' · Este navegador no deja guardar: si cierras la página se pierde el avance.');

  var cont = $('#mBloques');
  cont.innerHTML = '';
  BLOQUES.forEach(function(b){
    var deBloque = NIVELES.filter(function(x){ return x.bloque === b.n; });
    if(!deBloque.length) return;
    var tit = crear('div', 'bloque-tit');
    var h = crear('h3'); h.textContent = b.n + ' · ' + b.nombre;
    tit.appendChild(h); tit.appendChild(crear('span', 'raya'));
    cont.appendChild(tit);

    var rej = crear('div', 'rejilla');
    deBloque.forEach(function(x){
      var btn = crear('button', 'casilla');
      btn.type = 'button';
      btn.textContent = x.n;
      var puedo = abierto(x.n);
      if(hecho(x.n)) btn.classList.add('hecho');
      else if(!puedo) btn.classList.add('cerrado');
      else if(x.n === proximo()) btn.classList.add('siguiente');
      btn.disabled = !puedo;
      btn.setAttribute('aria-label', 'Nivel ' + x.n + ': ' + x.titulo
        + (hecho(x.n) ? ' · resuelto' : puedo ? '' : ' · todavía cerrado'));
      if(puedo) btn.addEventListener('click', function(){ abrirNivel(x.n); });
      rej.appendChild(btn);
    });
    cont.appendChild(rej);
  });

  $('#bCertificados').hidden = (n < TOTAL);
}
function proximo(){
  for(var i = 1; i <= TOTAL; i++) if(!hecho(i)) return i;
  return TOTAL;
}

/* ── un nivel ─────────────────────────────────────────────────────────── */
function abrirNivel(n){
  actual = NIVELES[n - 1];
  seleccion = [];
  resuelto = hecho(n);
  pistasVistas = E.pistasUsadas[n] || 0;

  var b = BLOQUES.filter(function(x){ return x.n === actual.bloque; })[0];
  $('#nMigaja').textContent = 'Nivel ' + n + ' de ' + TOTAL + ' · ' + b.nombre;
  $('#nTitulo').textContent = actual.titulo;
  $('#nEnunciado').innerHTML = actual.enunciado.split('\n\n')
      .map(function(p){ return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');

  /* código con números de línea de verdad, para que «la línea 4» signifique
     lo mismo en el enunciado, en el código y en la respuesta */
  var zc = $('#nCodigo'); zc.innerHTML = '';
  if(actual.codigo){
    var caja = crear('div', 'codigo'), ol = crear('ol');
    actual.codigo.forEach(function(l){
      var li = crear('li');
      var m = /^((?:· )+)(.*)$/.exec(l);
      if(m){
        var s = crear('span', 'sangria'); s.textContent = m[1];
        li.appendChild(s); li.appendChild(document.createTextNode(m[2]));
      } else li.textContent = l;
      ol.appendChild(li);
    });
    caja.appendChild(ol); zc.appendChild(caja);
  }

  pintarRespuesta();
  $('#nPistas').innerHTML = '';
  $('#nVeredicto').innerHTML = '';
  $('#nPasos').innerHTML = '';
  if(pistasVistas > 0) pintarPistas();
  if(resuelto){ mostrarVeredicto(true, true); }
  /* si ya había pedido el paso a paso, se le devuelve: le costó pedirlo */
  if(E.manuales[n]) verManual();
  pintarBotones();
  ver('#pNivel');
}

function pintarRespuesta(){
  var z = $('#nRespuesta'); z.innerHTML = '';
  if(actual.tipo === 'opcion' || actual.tipo === 'multi'){
    var cont = crear('div', 'opciones');
    cont.setAttribute('role', actual.tipo === 'opcion' ? 'radiogroup' : 'group');
    actual.opciones.forEach(function(txt, i){
      var b = crear('button', 'opcion');
      b.type = 'button';
      var m = crear('span', 'marca');
      m.textContent = actual.tipo === 'opcion' ? 'abcdefgh'[i].toUpperCase() : '';
      b.appendChild(m);
      var t = crear('span'); t.innerHTML = txt; b.appendChild(t);
      b.addEventListener('click', function(){
        if(resuelto) return;
        if(actual.tipo === 'opcion') seleccion = [i];
        else {
          var k = seleccion.indexOf(i);
          if(k >= 0) seleccion.splice(k, 1); else seleccion.push(i);
        }
        pintarSeleccion();
        pintarBotones();
      });
      cont.appendChild(b);
    });
    z.appendChild(cont);
    pintarSeleccion();
  } else {
    var etq = crear('label', 'campo');
    var s = crear('span');
    s.textContent = actual.tipo === 'linea'
      ? 'Número de línea' : 'Tu respuesta' + (actual.unidad ? ' (en ' + actual.unidad + ', sólo el número)' : '');
    var inp = crear('input'); inp.type = 'number'; inp.id = 'nNum';
    inp.setAttribute('inputmode', 'numeric');
    inp.placeholder = actual.tipo === 'linea' ? 'ej. 3' : 'ej. 12';
    inp.addEventListener('input', pintarBotones);
    inp.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') comprobar(); });
    etq.appendChild(s); etq.appendChild(inp);
    z.appendChild(etq);
  }
}
function pintarSeleccion(){
  var b = document.querySelectorAll('#nRespuesta .opcion');
  for(var i = 0; i < b.length; i++){
    b[i].classList.toggle('sel', seleccion.indexOf(i) >= 0);
    b[i].setAttribute('aria-pressed', seleccion.indexOf(i) >= 0 ? 'true' : 'false');
  }
}
function hayRespuesta(){
  if(actual.tipo === 'opcion' || actual.tipo === 'multi') return seleccion.length > 0;
  var i = $('#nNum');
  return !!(i && i.value !== '');
}
function pintarBotones(){
  $('#bComprobar').disabled = resuelto || !hayRespuesta();
  $('#bComprobar').textContent = resuelto ? 'Ya lo resolviste' : 'Comprobar';
  $('#bPista').hidden = resuelto || pistasVistas >= actual.pistas.length;
  $('#bPista').textContent = pistasVistas === 0 ? 'Dame una pista'
      : 'Otra pista (' + (actual.pistas.length - pistasVistas) + ')';
  $('#bManual').hidden = !!$('#nPasos').firstChild;
  $('#bSiguiente').disabled = !resuelto;
  var ultimo = actual.n === TOTAL;
  $('#bSiguiente').textContent = ultimo ? 'Ver mis constancias' : 'Siguiente nivel';
  if(ultimo && E.hechos.length < TOTAL) $('#bSiguiente').textContent = 'Al mapa';
}

/* ── comprobación ─────────────────────────────────────────────────────── */
function acierta(){
  if(actual.tipo === 'opcion') return seleccion.length === 1 && seleccion[0] === actual.correcta;
  if(actual.tipo === 'multi'){
    var a = seleccion.slice().sort(function(x, y){ return x - y; }).join(',');
    var b = actual.correctas.slice().sort(function(x, y){ return x - y; }).join(',');
    return a === b;
  }
  var v = Number($('#nNum').value);
  return !isNaN(v) && v === actual.respuesta;
}
function comprobar(){
  if(resuelto || !hayRespuesta()) return;
  var bien = acierta();
  if(bien){
    resuelto = true;
    if(!hecho(actual.n)){ E.hechos.push(actual.n); guardar(); }
  }
  mostrarVeredicto(bien, false);
  pintarBotones();
  if(bien) $('#nVeredicto').scrollIntoView({ block:'nearest' });
}
function mostrarVeredicto(bien, silencioso){
  var z = $('#nVeredicto'); z.innerHTML = '';
  var caja = crear('div', 'veredicto ' + (bien ? 'bien' : 'mal'));
  var h = crear('h3');
  h.textContent = bien ? (silencioso ? 'Ya lo tenías resuelto' : '¡Correcto!') : 'Todavía no';
  caja.appendChild(h);
  var p = crear('p');
  if(bien) p.innerHTML = actual.porque;
  else p.textContent = actual.tipo === 'multi'
      ? 'Ojo: hay que marcar TODAS las correctas y ninguna de las otras. Pide una pista, o el paso a paso.'
      : 'Vuelve a intentarlo. Si te atoras, pide una pista — y si sigues atorado, el paso a paso te lo explica entero.';
  caja.appendChild(p);
  z.appendChild(caja);

  if(bien && (actual.tipo === 'opcion' || actual.tipo === 'multi')){
    var b = document.querySelectorAll('#nRespuesta .opcion');
    var buenas = actual.tipo === 'opcion' ? [actual.correcta] : actual.correctas;
    for(var i = 0; i < b.length; i++){
      b[i].disabled = true;
      if(buenas.indexOf(i) >= 0) b[i].classList.add('buena');
    }
  }
}

/* ── pistas y manual ──────────────────────────────────────────────────── */
function pedirPista(){
  if(pistasVistas >= actual.pistas.length) return;
  pistasVistas++;
  E.pistasUsadas[actual.n] = pistasVistas;
  guardar();
  pintarPistas();
  pintarBotones();
}
function pintarPistas(){
  var z = $('#nPistas'); z.innerHTML = '';
  if(!pistasVistas) return;
  var caja = crear('div', 'ayuda');
  var h = crear('h3'); h.textContent = pistasVistas === 1 ? 'Pista' : 'Pistas';
  caja.appendChild(h);
  for(var i = 0; i < pistasVistas; i++){
    var p = crear('p', 'pista'); p.innerHTML = actual.pistas[i]; caja.appendChild(p);
  }
  z.appendChild(caja);
}
function verManual(){
  E.manuales[actual.n] = true; guardar();
  var z = $('#nPasos'); z.innerHTML = '';
  var caja = crear('div', 'ayuda');
  var h = crear('h3'); h.textContent = 'Cómo se resuelve, paso a paso';
  caja.appendChild(h);
  var ol = crear('ol');
  actual.pasos.forEach(function(t){ var li = crear('li'); li.innerHTML = t; ol.appendChild(li); });
  caja.appendChild(ol);
  var p = crear('p'); p.style.margin = '14px 0 0';
  p.innerHTML = '<b>Por qué importa:</b> ' + actual.porque;
  caja.appendChild(p);
  z.appendChild(caja);
  pintarBotones();
  caja.scrollIntoView({ block:'nearest' });
}

/* ── constancias ──────────────────────────────────────────────────────── */
function pintarDiplomas(){
  if(!E.fecha){ E.fecha = hoyISO(); }
  if(!E.folio){ E.folio = folioDe(E.nombre, E.fecha); }
  guardar();

  var sinPista = 0;
  for(var i = 1; i <= TOTAL; i++) if(!E.pistasUsadas[i] && !E.manuales[i]) sinPista++;

  var z = $('#nDiplomas'); z.innerHTML = '';
  z.appendChild(diploma({
    casa:'Grupo Mazi · Departamento de formación',
    titulo:'Constancia de curso completado',
    texto:'completó el entrenamiento <b>ISTQB Foundation Level (CTFL)</b> de Grupo Mazi, '
        + 'resolviendo los <b>cincuenta niveles</b> del programa: fundamentos, ciclo de vida, '
        + 'pruebas estáticas, técnicas de diseño, gestión y herramientas.',
    datos:[['Niveles resueltos', TOTAL + ' de ' + TOTAL],
           ['Resueltos sin ayuda', sinPista + ' de ' + TOTAL],
           ['Fecha', fechaLarga(E.fecha)],
           ['Folio', E.folio]],
    chica:'Documento de formación interna de Grupo Mazi. No es la certificación ISTQB '
        + 'ni la sustituye. La certificación oficial se presenta con un proveedor acreditado.'
  }));
  z.appendChild(diploma({
    casa:'Grupo Mazi · Departamento de formación',
    titulo:'Constancia de preparación para el examen',
    texto:'está <b>preparado para presentar el examen de certificación ISTQB Foundation '
        + 'Level (CTFL)</b>. Domina las seis áreas del temario oficial v4.0 y resolvió los '
        + 'ejercicios de cálculo y de localización de defectos del entrenamiento.',
    datos:[['Temario', 'ISTQB CTFL v4.0'],
           ['Formato del examen', '40 preguntas · 60 minutos · 26 para aprobar'],
           ['Fecha', fechaLarga(E.fecha)],
           ['Folio', E.folio + '-P']],
    chica:'Esta constancia expresa la valoración de Grupo Mazi sobre la preparación de la '
        + 'persona. No garantiza el resultado del examen ni tiene validez ante ISTQB.'
  }));
  ver('#pFin');
}
function diploma(d){
  var el = crear('div', 'diploma');
  var sello = crear('span', 'sello'); sello.innerHTML = LOGO; el.appendChild(sello);
  var casa = crear('div', 'casa'); casa.textContent = d.casa; el.appendChild(casa);
  var h = crear('h2'); h.textContent = d.titulo; el.appendChild(h);
  el.appendChild(crear('div', 'raya'));
  var pre = crear('p'); pre.textContent = 'Se hace constar que'; el.appendChild(pre);
  var nom = crear('div', 'nombre');
  nom.textContent = E.nombre;                       /* textContent: es texto de la persona */
  el.appendChild(nom);
  if(E.puesto){ var pu = crear('p'); pu.style.marginTop = '-8px';
                pu.textContent = E.puesto; el.appendChild(pu); }
  var cuerpo = crear('p'); cuerpo.innerHTML = d.texto; el.appendChild(cuerpo);
  var datos = crear('div', 'datos');
  d.datos.forEach(function(par){
    var c = crear('div');
    var b = crear('b'); b.textContent = par[1];
    c.appendChild(b); c.appendChild(document.createTextNode(par[0]));
    datos.appendChild(c);
  });
  el.appendChild(datos);
  var ch = crear('p', 'letra-chica'); ch.textContent = d.chica; el.appendChild(ch);
  return el;
}

/* ── arranque ─────────────────────────────────────────────────────────── */
cargar();

$('#fEntrar').addEventListener('submit', function(ev){
  ev.preventDefault();
  var n = $('#fNombre').value.trim().replace(/\s+/g, ' ');
  if(n.length < 3 || n.indexOf(' ') < 0){ $('#errNombre').hidden = false; $('#fNombre').focus(); return; }
  $('#errNombre').hidden = true;
  E.nombre = n;
  E.puesto = $('#fPuesto').value.trim();
  guardar();
  pintarMapa(); ver('#pMapa');
});
$('#bSalir').addEventListener('click', function(){
  pintarMapa();
  ver(E.hechos.length ? '#pMapa' : '#pPortada');
});
$('#bComprobar').addEventListener('click', comprobar);
$('#bPista').addEventListener('click', pedirPista);
$('#bManual').addEventListener('click', verManual);
$('#bVolver').addEventListener('click', function(){ pintarMapa(); ver('#pMapa'); });
$('#bSiguiente').addEventListener('click', function(){
  if(actual.n < TOTAL){ abrirNivel(actual.n + 1); return; }
  if(E.hechos.length >= TOTAL) pintarDiplomas();
  else { pintarMapa(); ver('#pMapa'); }
});
$('#bCertificados').addEventListener('click', pintarDiplomas);
$('#bVolverMapa').addEventListener('click', function(){ pintarMapa(); ver('#pMapa'); });
$('#bImprimir').addEventListener('click', function(){ window.print(); });
$('#bReiniciar').addEventListener('click', function(){
  if(!confirm('Se borra tu avance de los cincuenta niveles y no se puede deshacer. ¿Seguro?')) return;
  E.hechos = []; E.pistasUsadas = {}; E.manuales = {}; E.folio = ''; E.fecha = '';
  guardar(); pintarMapa();
});

if(E.nombre){
  $('#fNombre').value = E.nombre;
  $('#fPuesto').value = E.puesto || '';
  pintarMapa();
  ver('#pMapa');
}
})();
