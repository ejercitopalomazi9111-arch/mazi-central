/* horno.js · la pizza de «Ármala tú», hecha con fotos.
   La base es una pizza de queso de verdad y cada ingrediente es una pieza recortada de una
   foto (img/armar/, sale de scripts/ingredientes.py). Aquí sólo se acomodan: dónde cae cada
   pieza, cuánto gira, su sombra, y que el nuevo caiga pieza por pieza.

   Horno.pintar(canvas, { ings:["pepperoni", …], orilla:false, nuevo:"pepperoni" })
   Todo sale de una semilla fija: la misma pizza se pinta igual cada vez. */
(function(){
"use strict";

var NOMBRES = {
 pepperoni:"Pepperoni", jamon:"Jamón", salchicha:"Salchicha", chorizo:"Chorizo", champinon:"Champiñón",
 jalapeno:"Jalapeño", pina:"Piña", cebolla:"Cebolla", jitomate:"Jitomate", pimiento:"Pimiento",
 aguacate:"Aguacate", elote:"Elote", atun:"Atún", pastor:"Pastor", chilorio:"Chilorio",
 cilantro:"Cilantro", queso:"Queso extra", parmesano:"Parmesano", oregano:"Orégano"
};
var MUESTRA = {
 pepperoni:"#B8321C", jamon:"#D98C93", chorizo:"#8E3418", salchicha:"#A86A78", champinon:"#E6DDD2",
 jalapeno:"#3F7F2A", pina:"#F2C23E", cebolla:"#EFE8DC", jitomate:"#D13A26", aguacate:"#A9C46A",
 elote:"#F5CE4B", atun:"#C9A58A", pimiento:"#3E8A3A", cilantro:"#3E8A33", pastor:"#D0642A",
 chilorio:"#6E2A16", queso:"#FBEFC8", parmesano:"#FFF6E0", oregano:"#4A5F2E"
};
/* cuántas piezas por lugar: lo chiquito va en montoncitos */
var MONTON = { chorizo:3, elote:5, atun:2, chilorio:3, pastor:2, pina:2, cilantro:1 };
/* lo que se espolvorea: no tiene foto, son motitas */
var POLVO = { parmesano:1, oregano:1, queso:1 };
/* lo que cae encima de todo, aunque se haya elegido antes */
var ENCIMA = { cilantro:1, queso:0 };

var RAIZ = (document.currentScript && document.currentScript.src.replace(/[^/]*$/, "")) || "";
var piezas = null, fotos = {}, base = null, esperando = [];

function semilla(txt){
  var h = 2166136261;
  for(var k = 0; k < txt.length; k++){ h ^= txt.charCodeAt(k); h = Math.imul(h, 16777619); }
  return function(){ h += 0x6D2B79F5; var t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function imagen(src){
  return new Promise(function(ok, mal){ var i = new Image(); i.decoding = "async"; i.onload = function(){ ok(i); }; i.onerror = mal; i.src = src; });
}
function preparar(){
  if(preparar.p) return preparar.p;
  return (preparar.p = Promise.all([
    fetch(RAIZ + "img/armar/piezas.json").then(function(r){ return r.json(); }),
    imagen(RAIZ + "img/armar/base.webp")
  ]).then(function(r){ piezas = r[0]; base = r[1]; }));
}
function cargar(k){
  if(fotos[k] || POLVO[k] || !piezas || !piezas[k]) return Promise.resolve();
  if(!cargar[k]) cargar[k] = imagen(RAIZ + "img/armar/" + k + ".webp").then(function(i){ fotos[k] = i; });
  return cargar[k];
}

/* dónde va cada pieza: separadas, sin encimarse de más, dentro del queso */
function lugares(n, rQ, C, a){
  var pts = [], min = rQ * 1.8 / Math.sqrt(n + 3), intentos = 0;
  while(pts.length < n && intentos < 5000){
    intentos++;
    var t = a() * 6.2832, d = Math.sqrt(a()) * rQ, x = C + Math.cos(t) * d, y = C + Math.sin(t) * d;
    var ok = intentos > 4000 || pts.every(function(p){ return (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y) > min * min; });
    if(ok) pts.push([x, y]);
  }
  return pts;
}

function planear(cv, S, ings){
  var llave = S + "|" + ings.join(","), plan = cv.__plan;
  if(plan && plan.llave === llave) return plan;
  var C = S / 2, R = S * .47, rQ = R * .74;
  var conFoto = ings.filter(function(k){ return !POLVO[k]; });
  var n = conFoto.length ? Math.min(44, 20 + conFoto.length * 5) : 0;
  var pts = lugares(n, rQ, C, semilla("lugares" + n));
  var reparto = {};
  conFoto.forEach(function(k){ reparto[k] = []; });
  /* se reparten salteados para que no queden por manchas, y cada pieza ya sabe cuál foto, cuánto gira y su tamaño */
  pts.forEach(function(p, i){
    var k = conFoto[i % conFoto.length], a = semilla(k + i), m = MONTON[k] || 1;
    for(var j = 0; j < m; j++){
      var dx = m > 1 ? (a() - .5) * S * .05 : 0, dy = m > 1 ? (a() - .5) * S * .05 : 0;
      reparto[k].push({ x:p[0] + dx, y:p[1] + dy, g:a() * 6.2832, e:.88 + a() * .24, f:a(), espejo:a() < .5 });
    }
  });
  return (cv.__plan = { llave:llave, C:C, R:R, rQ:rQ, reparto:reparto });
}

function pieza(c, S, k, p, extra){
  var lista = piezas[k], img = fotos[k];
  if(!lista || !img) return;
  var r = lista[Math.floor(p.f * lista.length) % lista.length];
  var esc = S / 1040 * .6 * p.e * (extra || 1);
  c.save();
  c.translate(p.x, p.y); c.rotate(p.g); if(p.espejo) c.scale(-1, 1);
  c.shadowColor = "rgba(50,20,4,.5)"; c.shadowBlur = S * .007; c.shadowOffsetX = S * .002; c.shadowOffsetY = S * .004;
  c.drawImage(img, r[0], r[1], r[2], r[3], -r[2] * esc / 2, -r[3] * esc / 2, r[2] * esc, r[3] * esc);
  c.restore();
}
function polvo(c, S, k, P){
  var a = semilla(k + S), n = k === "oregano" ? 380 : 300;
  if(k === "queso"){        /* el queso extra se derrite encima: manchas suaves color crema */
    for(var q = 0; q < 34; q++){
      var tq = a() * 6.2832, dq = Math.sqrt(a()) * P.rQ * 1.05, xq = P.C + Math.cos(tq) * dq, yq = P.C + Math.sin(tq) * dq, rq = S * (.03 + a() * .035);
      var gq = c.createRadialGradient(xq - rq * .2, yq - rq * .2, 0, xq, yq, rq);
      gq.addColorStop(0, "rgba(255,246,214,.85)"); gq.addColorStop(.55, "rgba(252,232,170,.55)"); gq.addColorStop(1, "rgba(250,220,150,0)");
      c.fillStyle = gq; c.beginPath(); c.arc(xq, yq, rq, 0, 6.2832); c.fill();
      if(a() < .6){ var gb = c.createRadialGradient(xq + rq * .2, yq, 0, xq + rq * .2, yq, rq * .3);
        gb.addColorStop(0, "rgba(190,110,30,.55)"); gb.addColorStop(1, "rgba(190,110,30,0)"); c.fillStyle = gb; c.fillRect(xq - rq, yq - rq, rq * 2, rq * 2); }
    }
    return;
  }
  for(var i = 0; i < n; i++){
    var t = a() * 6.2832, d = Math.sqrt(a()) * P.rQ * 1.05, x = P.C + Math.cos(t) * d, y = P.C + Math.sin(t) * d;
    c.fillStyle = k === "oregano" ? (a() < .5 ? "rgba(62,80,34,.9)" : "rgba(94,104,48,.85)") : "rgba(255,250,232," + (.75 + a() * .25).toFixed(2) + ")";
    c.fillRect(x, y, S * (.0022 + a() * .003), S * (.0018 + a() * .0022));
  }
}

function pintar(cv, o){
  o = o || {};
  var S = cv.width, c = cv.getContext("2d");
  var ings = (o.ings || []).filter(function(k){ return NOMBRES[k]; });
  var yo = cv.__turno = (cv.__turno || 0) + 1;
  preparar().then(function(){ return Promise.all(ings.map(cargar)); }).then(function(){
    if(yo !== cv.__turno) return;          /* llegó otro pedido de pintar mientras cargaba */
    var P = planear(cv, S, ings);
    var orden = ings.filter(function(k){ return !POLVO[k] && !ENCIMA[k]; })
      .concat(ings.filter(function(k){ return ENCIMA[k]; }), ings.filter(function(k){ return POLVO[k]; }));
    function dibuja(t){
      c.clearRect(0, 0, S, S);
      /* sombra en la mesa */
      var g = c.createRadialGradient(P.C + S * .01, P.C + S * .03, P.R * .6, P.C + S * .01, P.C + S * .03, P.R * 1.08);
      g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      /* la base: 508 px de radio en su foto de 1100 */
      var lado = 1100 * P.R / 508 * (o.orilla ? 1.015 : 1);
      c.drawImage(base, P.C - lado / 2, P.C - lado / 2, lado, lado);
      if(o.orilla){        /* la orilla rellena: más dorada */
        c.save(); c.globalCompositeOperation = "source-atop";
        var h = c.createRadialGradient(P.C, P.C, P.R * .84, P.C, P.C, P.R * 1.02);
        h.addColorStop(0, "rgba(255,200,90,0)"); h.addColorStop(.6, "rgba(255,196,80,.28)"); h.addColorStop(1, "rgba(160,90,20,.2)");
        c.fillStyle = h; c.fillRect(0, 0, S, S); c.restore();
      }
      orden.forEach(function(k){
        if(POLVO[k]){ c.globalAlpha = k === o.nuevo ? t : 1; polvo(c, S, k, P); c.globalAlpha = 1; return; }
        var lista = P.reparto[k] || [];
        lista.forEach(function(p, i){
          if(k !== o.nuevo || t >= 1){ pieza(c, S, k, p); return; }
          /* el nuevo cae pieza por pieza, desde un poco más arriba y más grande */
          var u = Math.max(0, Math.min(1, t * (1 + lista.length * .06) - i * .06));
          if(u <= 0) return;
          var e = 1 - Math.pow(1 - u, 3);
          c.globalAlpha = Math.min(1, u * 2.5);
          pieza(c, S, k, { x:p.x, y:p.y - (1 - e) * S * .05, g:p.g + (1 - e) * .6, e:p.e, f:p.f, espejo:p.espejo }, 1 + (1 - e) * .7);
          c.globalAlpha = 1;
        });
      });
    }
    if(!o.nuevo || o.quieto){ dibuja(1); return; }
    var t0 = performance.now(), dur = 650;
    (function cuadro(ahora){
      if(yo !== cv.__turno) return;
      var t = Math.min(1, (ahora - t0) / dur);
      dibuja(t);
      if(t < 1) requestAnimationFrame(cuadro);
    })(t0);
  }).catch(function(e){ console.error("Horno:", e); });
}

window.Horno = { pintar:pintar, preparar:preparar, NOMBRES:NOMBRES, MUESTRA:MUESTRA, lista:Object.keys(NOMBRES) };
})();
