/* ==========================================================================
   J5 DATA · Propuesta B — «ESPECTRO»
   Dos escenas WebGL con luz y sombra de verdad —el haz de fibra y la maqueta
   de la sala—, la grafica de latencia y la aguja de disponibilidad. Todo
   cuelga de un unico requestAnimationFrame y se apaga al salir de pantalla.
   Sin JavaScript la pagina se ve entera; ningun texto depende del motor.
   ========================================================================== */
(function () {
  'use strict';

  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var piezas = [];
  function registrar(nodo, dibujar) {
    var p = { visible: false, dibujar: dibujar };
    piezas.push(p);
    new IntersectionObserver(function (e) { p.visible = e[0].isIntersecting; },
      { rootMargin: '140px' }).observe(nodo);
  }
  var antes = 0;
  function latido(t) {
    var dt = Math.min((t - antes) / 1000, 0.05); antes = t;
    for (var i = 0; i < piezas.length; i++)
      if (piezas[i].visible) piezas[i].dibujar(dt, t / 1000);
    requestAnimationFrame(latido);
  }
  requestAnimationFrame(latido);

  function medir(lienzo) {
    var r = lienzo.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 1.5);
    lienzo.width = Math.max(1, Math.round(r.width * d));
    lienzo.height = Math.max(1, Math.round(r.height * d));
    return { an: r.width, al: r.height, d: d };
  }

  function girable(lienzo, est) {
    var x0 = 0, y0 = 0, activo = false;
    function baja(e) { activo = true; var p = e.touches ? e.touches[0] : e;
      x0 = p.clientX; y0 = p.clientY; }
    function mueve(e) {
      if (!activo) return;
      var p = e.touches ? e.touches[0] : e;
      est.oy += (p.clientX - x0) * 0.008;
      est.ox += (p.clientY - y0) * 0.005;
      est.ox = Math.max(est.minX !== undefined ? est.minX : -0.6,
               Math.min(est.maxX !== undefined ? est.maxX : 0.6, est.ox));
      est.toque = 2.5; x0 = p.clientX; y0 = p.clientY;
      if (e.cancelable) e.preventDefault();
    }
    function sube() { activo = false; }
    lienzo.addEventListener('pointerdown', baja);
    window.addEventListener('pointermove', mueve, { passive: false });
    window.addEventListener('pointerup', sube);
    lienzo.addEventListener('touchstart', baja, { passive: true });
    lienzo.addEventListener('touchmove', mueve, { passive: false });
    window.addEventListener('touchend', sube);
  }

  var ESPECTRO = [0x1B3BFF, 0x3A2BFF, 0x7A2BFF, 0xB024E0, 0xE81E8C,
                  0xFF3B6B, 0xFF5E2B, 0xFF8A1E, 0xFFB300, 0xD9C000,
                  0x7FBE22, 0x00A98F, 0x00A7C4, 0x0E6BFF];

  /* =======================================================================
     1 · EL HAZ DE FIBRA — la portada
     ===================================================================== */
  function fibra() {
    var lienzo = document.getElementById('fibra');
    if (!lienzo || !window.THREE) return;
    var m = medir(lienzo);

    var ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    ren.setPixelRatio(m.d); ren.setSize(m.an, m.al, false);
    ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;

    var esc = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(36, m.an / m.al, 0.1, 60);
    /* La camara se separa lo justo para que quepa el haz entero: el conector de
       la izquierda y las catorce puntas de la derecha. A menos distancia el
       ramillete se salia del cuadro por los dos lados. */
    cam.position.set(0.3, 3.4, 11.4); cam.lookAt(0.1, 0.1, 0);

    esc.add(new THREE.HemisphereLight(0xffffff, 0xd6d0c6, 0.92));
    var sol = new THREE.DirectionalLight(0xffffff, 1.45);
    sol.position.set(4.2, 8, 5.4); sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -7; sol.shadow.camera.right = 7;
    sol.shadow.camera.top = 7; sol.shadow.camera.bottom = -7;
    esc.add(sol);
    var relleno = new THREE.DirectionalLight(0xdbe4ff, 0.5);
    relleno.position.set(-5, 2, 4); esc.add(relleno);

    var grupo = new THREE.Group(); esc.add(grupo); grupo.scale.setScalar(0.86);

    /* el suelo, solo para recibir sombra: el color lo pone el CSS */
    var suelo = new THREE.Mesh(new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.16 }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.y = -1.5;
    suelo.receiveShadow = true; grupo.add(suelo);

    /* el conector: un bloque oscuro del que sale todo */
    var conector = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x141a2b, metalness: 0.5, roughness: 0.42 }));
    conector.position.set(-3.5, 0, 0); conector.castShadow = true; grupo.add(conector);
    var chapa = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 1.05),
      new THREE.MeshStandardMaterial({ color: 0x2a3550, metalness: 0.7, roughness: 0.3 }));
    chapa.position.set(-3.18, 0, 0); grupo.add(chapa);

    /* las catorce fibras */
    var N = ESPECTRO.length, curvas = [], pulsos = [];
    var esferaG = new THREE.SphereGeometry(0.062, 10, 10);
    for (var i = 0; i < N; i++) {
      var f = i / (N - 1), ang = (f - 0.5) * Math.PI * 0.92;
      var salidaY = (f - 0.5) * 0.78, salidaZ = Math.sin(f * Math.PI * 2) * 0.28;
      var curva = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.16, salidaY, salidaZ),
        new THREE.Vector3(-1.9, salidaY * 1.25 + Math.sin(i) * 0.12, salidaZ * 1.6),
        new THREE.Vector3(-0.2, Math.sin(ang) * 1.05, Math.cos(ang) * 0.95 - 0.1),
        new THREE.Vector3(1.9, Math.sin(ang) * 1.75, Math.cos(ang) * 1.7 - 0.2),
        new THREE.Vector3(3.45, Math.sin(ang) * 1.95 + 0.1, Math.cos(ang) * 2.0 - 0.3),
      ]);
      var mat = new THREE.MeshPhysicalMaterial({
        color: ESPECTRO[i], roughness: 0.34, metalness: 0.05,
        clearcoat: 0.75, clearcoatRoughness: 0.22 });
      var tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 90, 0.052, 10, false), mat);
      tubo.castShadow = true; grupo.add(tubo);

      /* el conectorcito LC del extremo */
      var punta = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.13),
        new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.55 }));
      punta.position.copy(curva.getPointAt(1)); punta.castShadow = true; grupo.add(punta);

      curvas.push(curva);
      /* dos pulsos de luz por fibra, desfasados */
      for (var k = 0; k < 2; k++) {
        var p = new THREE.Mesh(esferaG, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        grupo.add(p);
        pulsos.push({ malla: p, c: curva, t: Math.random(), v: 0.2 + Math.random() * 0.34 });
      }
    }

    var est = { ox: 0.02, oy: 0, toque: 0, minX: -0.45, maxX: 0.5 };
    girable(lienzo, est);

    new ResizeObserver(function () {
      var n = medir(lienzo); if (!n.an || !n.al) return;
      cam.aspect = n.an / n.al; cam.updateProjectionMatrix(); ren.setSize(n.an, n.al, false);
    }).observe(lienzo);

    registrar(lienzo, function (dt) {
      if (!quieto) {
        est.toque = Math.max(0, est.toque - dt);
        if (!est.toque) est.oy += dt * 0.12;
        for (var i = 0; i < pulsos.length; i++) {
          var P = pulsos[i];
          P.t += dt * P.v; if (P.t > 1) P.t -= 1;
          P.malla.position.copy(P.c.getPointAt(P.t));
        }
      }
      grupo.rotation.y += (est.oy - grupo.rotation.y) * 0.06;
      grupo.rotation.x += (est.ox - grupo.rotation.x) * 0.06;
      ren.render(esc, cam);
    });
  }

  /* =======================================================================
     2 · LA SALA — maqueta isometrica del centro de datos
     ===================================================================== */
  function sala() {
    var lienzo = document.getElementById('sala');
    if (!lienzo || !window.THREE) return;
    var m = medir(lienzo);

    var ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    ren.setPixelRatio(m.d); ren.setSize(m.an, m.al, false);
    ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;

    var esc = new THREE.Scene();
    /* Camara ortografica: una maqueta, no una foto. Las lineas paralelas se
       quedan paralelas y eso es lo que hace que se lea como plano. */
    var F = 4.35;
    var cam = new THREE.OrthographicCamera(-F, F, F, -F, 0.1, 100);
    cam.position.set(8, 7.5, 9); cam.lookAt(0, 0.2, 0);

    esc.add(new THREE.HemisphereLight(0xffffff, 0xcfc9be, 0.95));
    var sol = new THREE.DirectionalLight(0xffffff, 1.35);
    sol.position.set(7, 12, 6); sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.camera.left = -11; sol.shadow.camera.right = 11;
    sol.shadow.camera.top = 11; sol.shadow.camera.bottom = -11;
    esc.add(sol);
    esc.add(new THREE.AmbientLight(0xffffff, 0.35));

    var g = new THREE.Group(); esc.add(g);

    /* el piso tecnico */
    var piso = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 9),
      new THREE.MeshStandardMaterial({ color: 0xece8e1, roughness: 0.92 }));
    piso.position.y = -0.11; piso.receiveShadow = true; g.add(piso);
    var rejilla = new THREE.GridHelper(11.4, 19, 0xc9c3b8, 0xdbd6cd);
    rejilla.position.y = 0.002; g.add(rejilla);

    /* 24 gabinetes, 4 filas de 6 */
    var gabinete = new THREE.BoxGeometry(0.62, 1.32, 0.98);
    var matGab = new THREE.MeshStandardMaterial({ color: 0xf7f5f1, roughness: 0.62, metalness: 0.06 });
    var luces = [];
    for (var fila = 0; fila < 4; fila++) {
      var color = ESPECTRO[[0, 4, 8, 11][fila]];
      var z = -3.15 + fila * 2.1;
      for (var i = 0; i < 6; i++) {
        var x = -2.55 + i * 1.02;
        var gab = new THREE.Mesh(gabinete, matGab);
        gab.position.set(x, 0.66, z); gab.castShadow = true; gab.receiveShadow = true; g.add(gab);
        /* la franja de color del frente: la fila se identifica por su color */
        var franja = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.075, 0.03),
          new THREE.MeshBasicMaterial({ color: color }));
        franja.position.set(x, 1.19, z + 0.5); g.add(franja);
        /* los LED */
        for (var k = 0; k < 6; k++) {
          var led = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.03, 0.02),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85 }));
          led.position.set(x - 0.15 + (k % 3) * 0.15, 0.42 + ((k / 3) | 0) * 0.28, z + 0.5);
          g.add(led);
          luces.push({ m: led, f: Math.random() * 6.28, v: 0.8 + Math.random() * 2.4 });
        }
        var sombra = new THREE.LineSegments(new THREE.EdgesGeometry(gabinete),
          new THREE.LineBasicMaterial({ color: 0xb9b2a6 }));
        sombra.position.copy(gab.position); g.add(sombra);
      }
      /* la canalizacion aerea sobre cada fila */
      var bandeja = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.07, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xd8d3c9, roughness: 0.8 }));
      bandeja.position.set(0, 2.05, z); bandeja.castShadow = true; g.add(bandeja);
      var cable = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.05, 0.12),
        new THREE.MeshBasicMaterial({ color: color }));
      cable.position.set(0, 2.11, z); g.add(cable);
    }

    /* los dos tableros electricos del fondo */
    [-4.6, 4.6].forEach(function (x, n) {
      var t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.5, metalness: 0.4 }));
      t.position.set(x, 0.85, 0); t.castShadow = true; g.add(t);
      var luz = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.9),
        new THREE.MeshBasicMaterial({ color: n ? 0x00A98F : 0xFFB300 }));
      luz.position.set(x + (n ? -0.27 : 0.27), 1.45, 0); g.add(luz);
    });

    var est = { ox: 0, oy: 0, toque: 0, minX: -0.25, maxX: 0.25 };
    girable(lienzo, est);

    new ResizeObserver(function () {
      var n = medir(lienzo); if (!n.an || !n.al) return;
      var a = n.an / n.al;
      cam.left = -F * a; cam.right = F * a; cam.top = F; cam.bottom = -F;
      cam.updateProjectionMatrix(); ren.setSize(n.an, n.al, false);
    }).observe(lienzo);
    var a0 = m.an / m.al; cam.left = -F * a0; cam.right = F * a0; cam.updateProjectionMatrix();

    var contador = document.getElementById('sala-fps'), acum = 0, cuadros = 0;

    registrar(lienzo, function (dt, t) {
      if (!quieto) {
        est.toque = Math.max(0, est.toque - dt);
        if (!est.toque) est.oy += dt * 0.09;
        for (var k = 0; k < luces.length; k++) {
          var L = luces[k];
          L.m.material.opacity = 0.2 + 0.75 * Math.abs(Math.sin(t * L.v + L.f));
        }
      }
      g.rotation.y += (est.oy - g.rotation.y) * 0.07;
      g.rotation.x += (est.ox - g.rotation.x) * 0.07;
      ren.render(esc, cam);
      acum += dt; cuadros++;
      if (acum > 1 && contador) {
        contador.textContent = Math.round(cuadros / acum) + ' fps'; acum = 0; cuadros = 0;
      }
    });
  }

  /* =======================================================================
     3 · LA GRÁFICA DE LATENCIA
     ===================================================================== */
  function latencia() {
    var lienzo = document.getElementById('latencia');
    if (!lienzo) return;
    var m = medir(lienzo), cx = lienzo.getContext('2d');
    new ResizeObserver(function () { m = medir(lienzo); }).observe(lienzo);

    var N = 68, datos = [], base = 7.4;
    for (var i = 0; i < N; i++) datos.push(base + Math.random() * 2.2);
    var act = document.getElementById('lat-act'),
        prom = document.getElementById('lat-prom'),
        pico = document.getElementById('lat-pico');
    function lecturas(v) {
      if (act) act.textContent = v.toFixed(1);
      if (prom) prom.textContent = (datos.reduce(function (a, b) { return a + b; }, 0) / N).toFixed(1);
      if (pico) pico.textContent = Math.max.apply(null, datos).toFixed(1);
    }
    lecturas(datos[N - 1]);
    var reloj = 0;

    registrar(lienzo, function (dt) {
      reloj += dt;
      if (reloj > 0.42 && !quieto) {
        reloj = 0;
        base += (7.4 - base) * 0.08 + (Math.random() - 0.5) * 0.5;
        var v = Math.max(3.2, base + Math.random() * 2.4 + (Math.random() < 0.05 ? 5 : 0));
        datos.push(v); datos.shift(); lecturas(v);
      }
      var W = lienzo.width, H = lienzo.height, d = m.d, w = W / d, h = H / d;
      cx.clearRect(0, 0, W, H); cx.save(); cx.scale(d, d);
      var max = Math.max.apply(null, datos) * 1.25;
      function py(v) { return h - v / max * (h - 14) - 7; }

      cx.strokeStyle = 'rgba(255,255,255,.1)'; cx.lineWidth = 1;
      for (i = 0; i <= 4; i++) {
        var y = 7 + i * (h - 14) / 4;
        cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke();
      }
      /* el area, con el degradado del espectro */
      var g = cx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(27,59,255,.45)'); g.addColorStop(0.5, 'rgba(232,30,140,.4)');
      g.addColorStop(1, 'rgba(255,179,0,.4)');
      cx.beginPath(); cx.moveTo(0, h);
      for (i = 0; i < N; i++) cx.lineTo(i / (N - 1) * w, py(datos[i]));
      cx.lineTo(w, h); cx.closePath(); cx.fillStyle = g; cx.fill();

      var gl = cx.createLinearGradient(0, 0, w, 0);
      gl.addColorStop(0, '#5BE7FF'); gl.addColorStop(0.5, '#FF6FB5'); gl.addColorStop(1, '#FFD166');
      cx.beginPath();
      for (i = 0; i < N; i++) {
        var x = i / (N - 1) * w, yy = py(datos[i]);
        i ? cx.lineTo(x, yy) : cx.moveTo(x, yy);
      }
      cx.strokeStyle = gl; cx.lineWidth = 2; cx.stroke();

      cx.fillStyle = '#FFD166';
      cx.beginPath(); cx.arc(w - 2, py(datos[N - 1]), 3, 0, 6.29); cx.fill();
      cx.setLineDash([4, 4]); cx.strokeStyle = 'rgba(255,110,110,.55)';
      cx.beginPath(); cx.moveTo(0, py(14)); cx.lineTo(w, py(14)); cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle = 'rgba(255,140,140,.8)';
      cx.font = '9px "JetBrains Mono", monospace';
      cx.fillText('SLA 14 ms', 6, py(14) - 5);
      cx.restore();
    });
  }

  /* =======================================================================
     4 · LA AGUJA de disponibilidad
     ===================================================================== */
  function aguja() {
    var lienzo = document.getElementById('aguja');
    if (!lienzo) return;
    var m = medir(lienzo), cx = lienzo.getContext('2d');
    new ResizeObserver(function () { m = medir(lienzo); }).observe(lienzo);
    var k = 0, meta = 0;
    new IntersectionObserver(function (e) { if (e[0].isIntersecting) meta = 1; },
      { threshold: 0.4 }).observe(lienzo);

    registrar(lienzo, function (dt) {
      k += (meta - k) * Math.min(1, dt * (quieto ? 60 : 1.9));
      var W = lienzo.width, H = lienzo.height, d = m.d, w = W / d, h = H / d;
      cx.clearRect(0, 0, W, H); cx.save(); cx.scale(d, d);
      var cxx = w / 2, cyy = h / 2, R = Math.min(w, h) / 2 - 16;
      var A0 = Math.PI * 0.75, A1 = Math.PI * 2.25;

      cx.lineWidth = 12; cx.lineCap = 'round';
      cx.strokeStyle = '#E7E3DC';
      cx.beginPath(); cx.arc(cxx, cyy, R, A0, A1); cx.stroke();

      var g = cx.createLinearGradient(0, cyy - R, 0, cyy + R);
      g.addColorStop(0, '#1B3BFF'); g.addColorStop(0.5, '#E81E8C'); g.addColorStop(1, '#FFB300');
      cx.strokeStyle = g;
      cx.beginPath(); cx.arc(cxx, cyy, R, A0, A0 + (A1 - A0) * k); cx.stroke();

      cx.fillStyle = '#0B1020';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.font = '700 ' + Math.round(R * 0.42) + 'px Fraunces, Georgia, serif';
      cx.fillText((99.99 * k).toFixed(2) + '%', cxx, cyy - 2);
      cx.fillStyle = '#8790A3';
      cx.font = '9px "JetBrains Mono", monospace';
      cx.fillText('SLA OBJETIVO', cxx, cyy + R * 0.48);
      cx.restore();
    });
  }

  /* =======================================================================
     5 · LO DEMÁS
     ===================================================================== */
  function resto() {
    /* El revelado NO usa IntersectionObserver a secas. Con `scroll-behavior:
       smooth` un salto largo —un enlace #contacto, Fin, buscar en la pagina—
       puede dejar bloques enteros sin disparar el observador y el visitante se
       queda mirando un hueco en blanco. Se comprueba en cada scroll, que es
       barato y no se puede perder ningun caso. */
    var porRevelar = [].slice.call(document.querySelectorAll('.revelar'));
    function revelarVisibles() {
      for (var i = porRevelar.length - 1; i >= 0; i--) {
        var e = porRevelar[i];
        if (e.getBoundingClientRect().top < innerHeight * 0.94) {
          e.classList.add('visto'); porRevelar.splice(i, 1);
        }
      }
    }
    addEventListener('scroll', revelarVisibles, { passive: true });
    addEventListener('resize', revelarVisibles);
    revelarVisibles();

    document.querySelectorAll('[data-cuenta]').forEach(function (n) {
      var fin = parseFloat(n.dataset.cuenta), dec = (n.dataset.dec | 0);
      var oj = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        oj.disconnect();
        if (quieto) { n.textContent = fin.toFixed(dec); return; }
        var t0 = performance.now(), dur = 1500;
        (function paso(t) {
          var k = Math.min(1, (t - t0) / dur); k = 1 - Math.pow(1 - k, 3);
          n.textContent = (fin * k).toFixed(dec);
          if (k < 1) requestAnimationFrame(paso);
        })(t0);
      }, { threshold: 0.4 });
      oj.observe(n);
    });

    /* las barritas de cada cifra */
    document.querySelectorAll('.cifra').forEach(function (c) {
      var barra = c.querySelector('.cifra__barra i');
      if (!barra) return;
      var meta = parseFloat(c.dataset.meta || '0');
      var oj = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        oj.disconnect();
        barra.style.width = Math.min(100, meta) + '%';
      }, { threshold: 0.4 });
      oj.observe(c);
    });

    /* la escalera se enciende tramo a tramo al pasar */
    var tramos = [].slice.call(document.querySelectorAll('.tramo'));
    var cabecera = document.getElementById('cabecera');
    function alDesplazar() {
      if (cabecera) cabecera.classList.toggle('pegada', window.scrollY > 40);
      var medio = innerHeight * 0.72;
      tramos.forEach(function (tr) {
        if (tr.getBoundingClientRect().top < medio) tr.classList.add('encendido');
      });
    }
    addEventListener('scroll', alDesplazar, { passive: true });
    addEventListener('resize', alDesplazar);
    alDesplazar();

    var forma = document.getElementById('forma');
    if (forma) forma.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(forma);
      if ((d.get('sitio') || '').trim()) return;
      var cuerpo = 'Nombre: ' + (d.get('nombre') || '') +
        '\nEmpresa: ' + (d.get('empresa') || '—') +
        '\nCorreo: ' + (d.get('correo') || '') +
        '\n\nReto de red:\n' + (d.get('reto') || '') +
        '\n\n— Enviado desde j5data.com.mx';
      location.href = 'mailto:contacto@j5data.com.mx?subject=' +
        encodeURIComponent('Consulta de red · ' + (d.get('empresa') || d.get('nombre') || '')) +
        '&body=' + encodeURIComponent(cuerpo);
    });
  }

  function arrancar() { fibra(); sala(); latencia(); aguja(); resto(); }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
