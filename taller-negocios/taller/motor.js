/* ══════════════════════════════════════════════════════════════════════════
   EL MOTOR · el mismo para los diez instrumentos
   Diez motores distintos habrían sido diez sitios donde arreglar el mismo
   defecto. Éste pinta los campos que declara la pieza, recalcula al mover
   cualquiera, y enseña la lectura con su veredicto.

   Lo que la persona escribe NUNCA toca innerHTML: va por textContent. Lo que
   sí lo toca es el texto propio del veredicto, que trae negritas mías.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
var $ = function(s){ return document.querySelector(s); };
var crear = function(t,c){ var e=document.createElement(t); if(c) e.className=c; return e; };
var LLAVE = 'taller_' + PIEZA.id;

var V = {};                       /* los valores, por id de campo */
PIEZA.campos.forEach(function(c){ V[c.id] = c.valor !== undefined ? c.valor : (c.tipo === 'escala' ? 0 : ''); });

/* Se guarda para no perder el trabajo al recargar. Safari privado lanza al
   leer y al escribir, así que las dos van en try/catch y la herramienta sigue
   funcionando sin guardar. */
try{
  var guardado = JSON.parse(localStorage.getItem(LLAVE) || 'null');
  if(guardado) for(var k in guardado) if(V.hasOwnProperty(k)) V[k] = guardado[k];
}catch(e){}
function guardar(){ try{ localStorage.setItem(LLAVE, JSON.stringify(V)); }catch(e){} }

function pintarCampos(){
  var z = $('#campos'); z.textContent = '';
  var grupoActual = null, cajaActual = null;
  PIEZA.campos.forEach(function(c){
    if(c.grupo !== grupoActual){
      grupoActual = c.grupo;
      cajaActual = crear('div','grupo');
      var t = crear('div','tit'); t.textContent = c.grupo; cajaActual.appendChild(t);
      if(c.grupoAyuda){ var a = crear('div','ay'); a.textContent = c.grupoAyuda; cajaActual.appendChild(a); }
      z.appendChild(cajaActual);
    }
    var etq = crear('label','campo');
    var sp = crear('span'); sp.textContent = c.etiqueta;
    etq.appendChild(sp);

    if(c.tipo === 'escala'){
      var esc = crear('div','escala');
      esc.setAttribute('role','group');
      esc.setAttribute('aria-label', c.etiqueta);
      for(var i = 1; i <= (c.hasta || 5); i++){
        (function(n){
          var b = crear('button'); b.type = 'button'; b.textContent = n;
          b.setAttribute('aria-pressed', String(V[c.id] === n));
          b.addEventListener('click', function(){
            V[c.id] = (V[c.id] === n) ? 0 : n;   /* volver a tocar lo apaga */
            guardar(); pintarCampos(); calcular();
          });
          esc.appendChild(b);
        })(i);
      }
      etq.appendChild(esc);
      if(c.pies){
        var p = crear('div','pies');
        var a1 = crear('span'); a1.textContent = c.pies[0];
        var a2 = crear('span'); a2.textContent = c.pies[1];
        p.appendChild(a1); p.appendChild(a2); etq.appendChild(p);
      }
    } else if(c.tipo === 'texto' || c.tipo === 'parrafo'){
      var e = crear(c.tipo === 'parrafo' ? 'textarea' : 'input');
      if(c.tipo !== 'parrafo') e.type = 'text';
      e.value = V[c.id] || '';
      if(c.ejemplo) e.placeholder = c.ejemplo;
      e.addEventListener('input', function(){ V[c.id] = e.value; guardar(); calcular(); });
      etq.appendChild(e);
    } else {                                   /* número */
      var n = crear('input'); n.type = 'number';
      n.setAttribute('inputmode','decimal');
      if(c.min !== undefined) n.min = c.min;
      if(c.max !== undefined) n.max = c.max;
      if(c.paso) n.step = c.paso;
      n.value = (V[c.id] === '' || V[c.id] === undefined) ? '' : V[c.id];
      if(c.ejemplo) n.placeholder = c.ejemplo;
      n.addEventListener('input', function(){
        V[c.id] = n.value === '' ? '' : Number(n.value); guardar(); calcular();
      });
      etq.appendChild(n);
    }
    cajaActual.appendChild(etq);
  });
}

function calcular(){
  var r = PIEZA.calcular(V);
  var z = $('#lectura'); z.textContent = '';
  if(!r){ return; }
  var caja = crear('div','lectura ' + (r.tono || ''));
  (r.datos || []).forEach(function(d){
    var f = crear('div','dato');
    var et = crear('span','et'); et.textContent = d[0];
    var va = crear('span','va'); va.textContent = d[1];
    f.appendChild(et); f.appendChild(va);
    if(d[2]){ var un = crear('span','un'); un.textContent = d[2]; f.appendChild(un); }
    caja.appendChild(f);
    if(d[3] !== undefined){
      var b = crear('div','barra'); var i = crear('i');
      i.style.width = Math.max(0, Math.min(100, d[3])) + '%';
      b.appendChild(i); caja.appendChild(b);
    }
  });
  if(r.veredicto){
    var v = crear('div','veredicto');
    v.innerHTML = r.veredicto;              /* texto propio, con negritas mías */
    caja.appendChild(v);
  }
  z.appendChild(caja);
}

$('#bImprimir').addEventListener('click', function(){ window.print(); });
$('#bLimpiar').addEventListener('click', function(){
  if(!confirm('Se borra lo que escribiste en este instrumento. ¿Seguro?')) return;
  PIEZA.campos.forEach(function(c){ V[c.id] = c.valor !== undefined ? c.valor : (c.tipo === 'escala' ? 0 : ''); });
  guardar(); pintarCampos(); calcular();
});

pintarCampos();
calcular();
})();
