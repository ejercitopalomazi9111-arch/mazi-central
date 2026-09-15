/* ==========================================================================
   J5 DATA · Propuesta A — «SALA»
   Un solo requestAnimationFrame para TODO lo que se mueve en la pagina: los
   dos lienzos WebGL, los seis glifos y la grafica de latencia. Cada pieza se
   registra y se apaga sola cuando sale de pantalla.
   Sin JavaScript la pagina se ve entera y estatica; nada queda a medias.
   ========================================================================== */
(function () {
  'use strict';

  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── el motor compartido ───────────────────────────────────────────── */
  var piezas = [];
  function registrar(nodo, dibujar, arrancar) {
    var p = { visible: false, dibujar: dibujar };
    piezas.push(p);
    new IntersectionObserver(function (e) {
      p.visible = e[0].isIntersecting;
    }, { rootMargin: '120px' }).observe(nodo);
    if (arrancar) arrancar();
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

  /* ── arrastre para girar, compartido por los dos WebGL ─────────────── */
  function girable(lienzo, estado) {
    var x0 = 0, y0 = 0, activo = false;
    function baja(e) {
      activo = true; var p = e.touches ? e.touches[0] : e;
      x0 = p.clientX; y0 = p.clientY;
    }
    function mueve(e) {
      if (!activo) return;
      var p = e.touches ? e.touches[0] : e;
      estado.oy += (p.clientX - x0) * 0.008;
      estado.ox += (p.clientY - y0) * 0.005;
      estado.ox = Math.max(-0.7, Math.min(0.7, estado.ox));
      estado.toque = 2.5;
      x0 = p.clientX; y0 = p.clientY;
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

  /* =======================================================================
     1 · EL TEJIDO — fabrica spine-leaf en 3D, la portada
     ===================================================================== */
  function tejido() {
    var lienzo = document.getElementById('tejido');
    if (!lienzo || !window.THREE) return;
    var m = medir(lienzo);

    var ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    ren.setPixelRatio(m.d); ren.setSize(m.an, m.al, false);

    var esc = new THREE.Scene();
    esc.fog = new THREE.FogExp2(0x05070e, 0.032);
    var cam = new THREE.PerspectiveCamera(44, m.an / m.al, 0.1, 120);
    cam.position.set(0, 1.2, 18.5);

    var raiz = new THREE.Group(); esc.add(raiz);
    /* El tejido vive a la derecha del titular: la mascara del CSS lo desvanece
       justo donde empieza el texto, asi que aqui se corre para no pelearse. */
    raiz.position.set(3.1, -0.4, 0); raiz.scale.setScalar(0.8);

    var CYAN = 0x2de2e6, VIOLETA = 0x8b6cff, AMBAR = 0xffb020;

    /* los cuatro spine */
    var spines = [];
    for (var i = 0; i < 4; i++) {
      var s = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.36, 0),
        new THREE.MeshBasicMaterial({ color: VIOLETA, transparent: true, opacity: 0.92 }));
      s.position.set(-6.6 + i * 4.4, 3.4, 0);
      var alambre = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0),
        new THREE.MeshBasicMaterial({ color: VIOLETA, wireframe: true, transparent: true, opacity: 0.32 }));
      s.add(alambre);
      raiz.add(s); spines.push(s);
    }

    /* los ocho leaf */
    var hojas = [];
    for (i = 0; i < 8; i++) {
      var h = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.3, 0.62),
        new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.9 }));
      h.position.set(-8.4 + i * 2.4, -1.1, (i % 2 ? 1.5 : -1.5));
      var borde = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 0.42, 0.76)),
        new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 }));
      h.add(borde);
      raiz.add(h); hojas.push(h);
    }

    /* doce gabinetes abajo */
    for (i = 0; i < 12; i++) {
      var fila = i < 6 ? 0 : 1;
      var g = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.1, 0.86),
        new THREE.MeshBasicMaterial({ color: 0x121a2e }));
      g.position.set(-6.6 + (i % 6) * 2.65, -5.3, fila ? -2.6 : 1.1);
      var eg = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.82, 2.1, 0.86)),
        new THREE.LineBasicMaterial({ color: AMBAR, transparent: true, opacity: 0.3 }));
      g.add(eg);
      /* la tira de LED del frente */
      var led = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.07),
        new THREE.MeshBasicMaterial({ color: AMBAR, transparent: true, opacity: 0.85 }));
      led.position.set(0, 0.55, 0.44); g.add(led);
      g.userData.led = led; g.userData.fase = Math.random() * 6.28;
      raiz.add(g);
    }

    /* los enlaces spine↔leaf */
    var pares = [], vert = [], col = [];
    var cA = new THREE.Color(VIOLETA), cB = new THREE.Color(CYAN);
    for (i = 0; i < spines.length; i++)
      for (var j = 0; j < hojas.length; j++) {
        var a = spines[i].position, b = hojas[j].position;
        pares.push([a, b]);
        vert.push(a.x, a.y, a.z, b.x, b.y, b.z);
        col.push(cA.r, cA.g, cA.b, cB.r, cB.g, cB.b);
      }
    var gl = new THREE.BufferGeometry();
    gl.setAttribute('position', new THREE.Float32BufferAttribute(vert, 3));
    gl.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    raiz.add(new THREE.LineSegments(gl, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.16 })));

    /* los paquetes que viajan por los enlaces */
    var N = 54, pos = new Float32Array(N * 3), pc = new Float32Array(N * 3), viaje = [];
    var paleta = [new THREE.Color(CYAN), new THREE.Color(VIOLETA), new THREE.Color(AMBAR),
                  new THREE.Color(0x5be37d)];
    for (i = 0; i < N; i++) {
      var c = paleta[i % paleta.length];
      pc[i * 3] = c.r; pc[i * 3 + 1] = c.g; pc[i * 3 + 2] = c.b;
      viaje.push({ l: (Math.random() * pares.length) | 0, t: Math.random(),
                   v: 0.26 + Math.random() * 0.5, arriba: Math.random() < 0.5 });
    }
    var gp = new THREE.BufferGeometry();
    gp.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gp.setAttribute('color', new THREE.BufferAttribute(pc, 3));

    /* el sprite redondo del paquete, dibujado aqui: cero peticiones */
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var cx = cv.getContext('2d');
    var rg = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.28, 'rgba(255,255,255,.85)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = rg; cx.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(cv);

    raiz.add(new THREE.Points(gp, new THREE.PointsMaterial({
      size: 0.42, map: tex, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false })));

    /* el suelo */
    var suelo = new THREE.GridHelper(44, 22, 0x2de2e6, 0x1d2942);
    suelo.position.y = -6.6; suelo.material.transparent = true; suelo.material.opacity = 0.16;
    raiz.add(suelo);

    var est = { ox: 0.06, oy: 0, toque: 0 };
    girable(lienzo, est);

    new ResizeObserver(function () {
      var n = medir(lienzo);
      if (!n.an || !n.al) return;
      cam.aspect = n.an / n.al; cam.updateProjectionMatrix();
      ren.setSize(n.an, n.al, false);
    }).observe(lienzo);

    registrar(lienzo, function (dt, t) {
      if (!quieto) {
        est.toque = Math.max(0, est.toque - dt);
        if (!est.toque) est.oy += dt * 0.11;
        /* los paquetes */
        for (var k = 0; k < N; k++) {
          var p = viaje[k];
          p.t += dt * p.v * (p.arriba ? 1 : -1);
          if (p.t > 1 || p.t < 0) {
            p.l = (Math.random() * pares.length) | 0;
            p.arriba = Math.random() < 0.5; p.t = p.arriba ? 0 : 1;
          }
          var par = pares[p.l];
          pos[k * 3]     = par[0].x + (par[1].x - par[0].x) * p.t;
          pos[k * 3 + 1] = par[0].y + (par[1].y - par[0].y) * p.t;
          pos[k * 3 + 2] = par[0].z + (par[1].z - par[0].z) * p.t;
        }
        gp.attributes.position.needsUpdate = true;
        /* los LED de los gabinetes */
        for (k = 0; k < raiz.children.length; k++) {
          var hijo = raiz.children[k];
          if (hijo.userData && hijo.userData.led)
            hijo.userData.led.material.opacity = 0.42 + 0.5 * Math.abs(Math.sin(t * 1.4 + hijo.userData.fase));
        }
        for (k = 0; k < hojas.length; k++)
          hojas[k].position.y = -1.1 + Math.sin(t * 0.7 + k) * 0.09;
      }
      raiz.rotation.y += (est.oy - raiz.rotation.y) * 0.06;
      raiz.rotation.x += (est.ox - raiz.rotation.x) * 0.06;
      ren.render(esc, cam);
    });
  }

  /* =======================================================================
     2 · EL CHASIS — un switch de 48 puertos, modelado por codigo
     ===================================================================== */
  function chasis() {
    var lienzo = document.getElementById('equipo');
    if (!lienzo || !window.THREE) return;
    var m = medir(lienzo);

    var ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    ren.setPixelRatio(m.d); ren.setSize(m.an, m.al, false);

    var esc = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(38, m.an / m.al, 0.1, 100);
    cam.position.set(0, 2.2, 11.6); cam.lookAt(0, -0.1, 0);

    esc.add(new THREE.AmbientLight(0x3a4666, 1.1));
    var sol = new THREE.DirectionalLight(0xffffff, 1.15); sol.position.set(5, 9, 7); esc.add(sol);
    var l1 = new THREE.PointLight(0x2de2e6, 1.5, 34); l1.position.set(-8, 1.5, 7); esc.add(l1);
    var l2 = new THREE.PointLight(0x8b6cff, 1.2, 34); l2.position.set(8, -2.5, 5); esc.add(l2);

    var eq = new THREE.Group(); esc.add(eq);

    var metal = new THREE.MeshStandardMaterial({ color: 0x1b2133, metalness: 0.82, roughness: 0.42 });
    var oscuro = new THREE.MeshStandardMaterial({ color: 0x0c1020, metalness: 0.6, roughness: 0.55 });

    /* el cuerpo */
    var cuerpo = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.5, 3.4), metal);
    eq.add(cuerpo);
    eq.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(9.4, 1.5, 3.4)),
      new THREE.LineBasicMaterial({ color: 0x2de2e6, transparent: true, opacity: 0.22 })));

    /* la carátula frontal, un poco hundida */
    var cara = new THREE.Mesh(new THREE.BoxGeometry(8.9, 1.2, 0.12), oscuro);
    cara.position.z = 1.71; eq.add(cara);

    /* las orejas de rack */
    [-5.05, 5.05].forEach(function (x) {
      var o = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.16), metal);
      o.position.set(x, 0, 1.62); eq.add(o);
      [-0.42, 0.42].forEach(function (y) {
        var t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), oscuro);
        t.rotation.x = Math.PI / 2; t.position.set(x, y, 1.72); eq.add(t);
      });
    });

    /* 48 puertos SFP+ en dos hileras de 24, con su LED */
    var leds = [];
    var geoPuerto = new THREE.BoxGeometry(0.26, 0.2, 0.1);
    var geoLed = new THREE.PlaneGeometry(0.2, 0.045);
    for (var i = 0; i < 48; i++) {
      var col = i % 24, fila = i < 24 ? 1 : 0;
      var x = -4.2 + col * 0.348, y = fila ? 0.3 : -0.06;
      var p = new THREE.Mesh(geoPuerto, oscuro);
      p.position.set(x, y, 1.78); eq.add(p);
      var hueco = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x05070e }));
      hueco.position.set(x, y, 1.835); eq.add(hueco);
      var led = new THREE.Mesh(geoLed, new THREE.MeshBasicMaterial({
        color: (i % 7 === 3) ? 0xffb020 : 0x5be37d, transparent: true, opacity: 0.9 }));
      led.position.set(x, y - 0.14, 1.836); eq.add(led);
      leds.push({ m: led, f: Math.random() * 6.28, v: 0.7 + Math.random() * 2.6 });
    }

    /* cuatro uplinks de 40G, mas grandes, en el lado derecho */
    for (i = 0; i < 4; i++) {
      var ux = 4.35 - i * 0.55;
      var up = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.12), oscuro);
      up.position.set(ux, 0.12, 1.78); eq.add(up);
      var uh = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.26),
        new THREE.MeshBasicMaterial({ color: 0x05070e }));
      uh.position.set(ux, 0.12, 1.84); eq.add(uh);
      var ul = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x2de2e6 }));
      ul.position.set(ux, -0.14, 1.842); eq.add(ul);
      leds.push({ m: ul, f: i * 1.3, v: 1.4 });
    }

    /* la rejilla de ventilación, a la izquierda */
    for (i = 0; i < 3; i++) {
      var v = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 18), oscuro);
      v.rotation.x = Math.PI / 2;
      v.position.set(-4.75 + i * 0, 0, 1.78);
      v.position.x = -4.62; v.position.y = 0.1; eq.add(v);
      break;
    }

    /* la tira de marca: azul de la casa, a lo ancho del frente */
    var tira = new THREE.Mesh(new THREE.PlaneGeometry(8.9, 0.055),
      new THREE.MeshBasicMaterial({ color: 0x2de2e6, transparent: true, opacity: 0.55 }));
    tira.position.set(0, -0.53, 1.79); eq.add(tira);

    /* el reflejo del suelo: una rejilla debajo */
    var piso = new THREE.GridHelper(26, 26, 0x2de2e6, 0x1a2540);
    piso.position.y = -2.8; piso.material.transparent = true; piso.material.opacity = 0.14;
    esc.add(piso);

    var est = { ox: 0.12, oy: -0.42, toque: 0 };
    girable(lienzo, est);

    new ResizeObserver(function () {
      var n = medir(lienzo);
      if (!n.an || !n.al) return;
      cam.aspect = n.an / n.al; cam.updateProjectionMatrix();
      ren.setSize(n.an, n.al, false);
    }).observe(lienzo);

    var contador = document.getElementById('equipo-fps'), acum = 0, cuadros = 0;

    registrar(lienzo, function (dt, t) {
      if (!quieto) {
        est.toque = Math.max(0, est.toque - dt);
        if (!est.toque) est.oy += dt * 0.16;
        for (var k = 0; k < leds.length; k++) {
          var L = leds[k];
          L.m.material.opacity = 0.25 + 0.72 * Math.abs(Math.sin(t * L.v + L.f));
        }
      }
      eq.rotation.y += (est.oy - eq.rotation.y) * 0.07;
      eq.rotation.x += (est.ox - eq.rotation.x) * 0.07;
      ren.render(esc, cam);

      acum += dt; cuadros++;
      if (acum > 1 && contador) {
        contador.textContent = Math.round(cuadros / acum) + ' fps';
        acum = 0; cuadros = 0;
      }
    });
  }

  /* =======================================================================
     3 · LOS SEIS GLIFOS de las tarjetas de servicio
     ===================================================================== */
  function glifos() {
    document.querySelectorAll('[data-glifo]').forEach(function (lienzo) {
      var m = medir(lienzo), cx = lienzo.getContext('2d');
      var tipo = lienzo.dataset.glifo, color = lienzo.dataset.color;
      new ResizeObserver(function () { m = medir(lienzo); }).observe(lienzo);

      var nodos = [];
      for (var i = 0; i < 16; i++)
        nodos.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.02,
                     vy: (Math.random() - 0.5) * 0.02 });

      registrar(lienzo, function (dt, t) {
        var W = lienzo.width, H = lienzo.height, d = m.d;
        cx.clearRect(0, 0, W, H);
        cx.save(); cx.scale(d, d);
        var w = W / d, h = H / d;
        cx.strokeStyle = color; cx.fillStyle = color; cx.lineWidth = 1;
        var T = quieto ? 0 : t;

        if (tipo === 'malla') {
          for (var i = 0; i < nodos.length; i++) {
            var n = nodos[i];
            if (!quieto) { n.x += n.vx * dt; n.y += n.vy * dt; }
            if (n.x < 0 || n.x > 1) n.vx *= -1;
            if (n.y < 0 || n.y > 1) n.vy *= -1;
          }
          cx.globalAlpha = 0.28;
          for (i = 0; i < nodos.length; i++)
            for (var j = i + 1; j < nodos.length; j++) {
              var dx = (nodos[i].x - nodos[j].x) * w, dy = (nodos[i].y - nodos[j].y) * h;
              if (dx * dx + dy * dy < 4200) {
                cx.beginPath(); cx.moveTo(nodos[i].x * w, nodos[i].y * h);
                cx.lineTo(nodos[j].x * w, nodos[j].y * h); cx.stroke();
              }
            }
          cx.globalAlpha = 0.95;
          for (i = 0; i < nodos.length; i++) {
            cx.beginPath(); cx.arc(nodos[i].x * w, nodos[i].y * h, 1.9, 0, 6.29); cx.fill();
          }
        }

        else if (tipo === 'ondas') {
          cx.lineWidth = 1.6;
          for (i = 0; i < 5; i++) {
            var r = ((T * 34 + i * 26) % 130);
            cx.globalAlpha = Math.max(0, 0.65 - r / 150);
            cx.beginPath(); cx.arc(w * 0.18, h * 0.5, r, -0.85, 0.85); cx.stroke();
          }
          cx.globalAlpha = 1;
          cx.beginPath(); cx.arc(w * 0.18, h * 0.5, 3.4, 0, 6.29); cx.fill();
        }

        else if (tipo === 'bloques') {
          for (i = 0; i < 9; i++) {
            var bx = 10 + (i % 3) * 30, by = h * 0.5 - 22 + ((i / 3) | 0) * 16;
            var o = 0.24 + 0.62 * Math.abs(Math.sin(T * 1.3 + i * 0.6));
            cx.globalAlpha = o;
            cx.fillRect(bx, by + Math.sin(T + i) * 1.6, 24, 10);
          }
          cx.globalAlpha = 0.5; cx.lineWidth = 1;
          cx.strokeRect(6, h * 0.5 - 28, 96, 56);
        }

        else if (tipo === 'pulso') {
          cx.lineWidth = 1.8; cx.globalAlpha = 0.95;
          cx.beginPath();
          for (var x = 0; x <= w; x += 2) {
            var f = x / w;
            var y = h / 2 + Math.sin(f * 11 + T * 3.4) * h * 0.2 * Math.exp(-Math.pow((f - 0.5) * 3.1, 2))
                          + Math.sin(f * 27 + T * 5.2) * h * 0.06;
            x ? cx.lineTo(x, y) : cx.moveTo(x, y);
          }
          cx.stroke();
          cx.globalAlpha = 0.16; cx.lineWidth = 1;
          cx.beginPath(); cx.moveTo(0, h / 2); cx.lineTo(w, h / 2); cx.stroke();
        }

        else if (tipo === 'puntos') {
          for (i = 0; i < 22; i++) {
            var px = ((i * 37) % 100) / 100 * w, py = ((i * 61) % 100) / 100 * h;
            var pulso = Math.abs(Math.sin(T * 1.6 + i * 0.9));
            cx.globalAlpha = 0.22 + pulso * 0.72;
            cx.beginPath(); cx.arc(px, py, 1.4 + pulso * 1.8, 0, 6.29); cx.fill();
          }
          cx.globalAlpha = 0.3; cx.lineWidth = 1;
          for (i = 0; i < 4; i++) {
            cx.beginPath(); cx.moveTo(w * 0.5, h * 0.5);
            cx.lineTo(w * (0.16 + i * 0.23), h * (i % 2 ? 0.16 : 0.84)); cx.stroke();
          }
        }

        else if (tipo === 'escudo') {
          var cxx = w * 0.5, cyy = h * 0.5, R = Math.min(w, h) * 0.34;
          cx.globalAlpha = 0.85; cx.lineWidth = 1.7;
          cx.beginPath();
          cx.moveTo(cxx, cyy - R); cx.lineTo(cxx + R * 0.78, cyy - R * 0.5);
          cx.lineTo(cxx + R * 0.78, cyy + R * 0.28); cx.lineTo(cxx, cyy + R);
          cx.lineTo(cxx - R * 0.78, cyy + R * 0.28); cx.lineTo(cxx - R * 0.78, cyy - R * 0.5);
          cx.closePath(); cx.stroke();
          var barrido = ((T * 0.42) % 1);
          cx.globalAlpha = 0.5; cx.lineWidth = 1.2;
          cx.beginPath();
          cx.moveTo(cxx - R * 0.78, cyy - R + barrido * R * 2);
          cx.lineTo(cxx + R * 0.78, cyy - R + barrido * R * 2); cx.stroke();
          cx.globalAlpha = 0.9;
          cx.beginPath(); cx.arc(cxx, cyy, 2.4, 0, 6.29); cx.fill();
        }

        cx.restore();
      });
    });
  }

  /* =======================================================================
     4 · LA GRÁFICA DE LATENCIA de la sala de control
     ===================================================================== */
  function latencia() {
    var lienzo = document.getElementById('latencia');
    if (!lienzo) return;
    var m = medir(lienzo), cx = lienzo.getContext('2d');
    new ResizeObserver(function () { m = medir(lienzo); }).observe(lienzo);

    var N = 72, datos = [], base = 7.4;
    for (var i = 0; i < N; i++) datos.push(base + Math.random() * 2.2);
    var act = document.getElementById('lat-act'),
        prom = document.getElementById('lat-prom'),
        pico = document.getElementById('lat-pico');
    var reloj = 0;

    /* Las tres lecturas arrancan con un valor de verdad. Antes decian «—»
       hasta que corriera el primer tic, y en una captura o en un movil lento
       eso es justo lo que se ve. */
    function pintarLecturas(v) {
      if (act) act.textContent = v.toFixed(1);
      if (prom) prom.textContent = (datos.reduce(function (a, b) { return a + b; }, 0) / N).toFixed(1);
      if (pico) pico.textContent = Math.max.apply(null, datos).toFixed(1);
    }
    pintarLecturas(datos[N - 1]);

    registrar(lienzo, function (dt) {
      reloj += dt;
      if (reloj > 0.42 && !quieto) {
        reloj = 0;
        base += (7.4 - base) * 0.08 + (Math.random() - 0.5) * 0.5;
        var v = Math.max(3.2, base + Math.random() * 2.4 + (Math.random() < 0.05 ? 5 : 0));
        datos.push(v); datos.shift();
        pintarLecturas(v);
      }
      var W = lienzo.width, H = lienzo.height, d = m.d, w = W / d, h = H / d;
      cx.clearRect(0, 0, W, H); cx.save(); cx.scale(d, d);

      var max = Math.max.apply(null, datos) * 1.25, min = 0;
      function py(v) { return h - (v - min) / (max - min) * (h - 14) - 7; }

      /* la retícula */
      cx.strokeStyle = 'rgba(140,160,200,.12)'; cx.lineWidth = 1;
      for (i = 0; i <= 4; i++) {
        var y = 7 + i * (h - 14) / 4;
        cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke();
      }

      /* el area */
      var g = cx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(45,226,230,.30)'); g.addColorStop(1, 'rgba(45,226,230,0)');
      cx.beginPath(); cx.moveTo(0, h);
      for (i = 0; i < N; i++) cx.lineTo(i / (N - 1) * w, py(datos[i]));
      cx.lineTo(w, h); cx.closePath(); cx.fillStyle = g; cx.fill();

      /* la línea */
      cx.beginPath();
      for (i = 0; i < N; i++) {
        var x = i / (N - 1) * w, yy = py(datos[i]);
        i ? cx.lineTo(x, yy) : cx.moveTo(x, yy);
      }
      cx.strokeStyle = '#2DE2E6'; cx.lineWidth = 1.8; cx.stroke();

      /* el punto vivo */
      var ux = w, uy = py(datos[N - 1]);
      cx.fillStyle = '#2DE2E6';
      cx.beginPath(); cx.arc(ux - 2, uy, 3, 0, 6.29); cx.fill();
      cx.globalAlpha = 0.24;
      cx.beginPath(); cx.arc(ux - 2, uy, 8, 0, 6.29); cx.fill();
      cx.globalAlpha = 1;

      /* el umbral de alerta */
      cx.setLineDash([4, 4]); cx.strokeStyle = 'rgba(255,92,122,.5)';
      cx.beginPath(); cx.moveTo(0, py(14)); cx.lineTo(w, py(14)); cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle = 'rgba(255,92,122,.75)';
      cx.font = '9px "JetBrains Mono", monospace';
      cx.fillText('SLA 14 ms', 6, py(14) - 5);

      cx.restore();
    });
  }

  /* =======================================================================
     5 · LO DEMÁS: revelado, contadores, riel, cabecera, formulario
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

    /* contadores: el numero final ya esta escrito en el HTML por si falla el JS */
    document.querySelectorAll('[data-cuenta]').forEach(function (n) {
      var fin = parseFloat(n.dataset.cuenta), dec = (n.dataset.dec | 0);
      var oj = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        oj.disconnect();
        if (quieto) { n.textContent = fin.toFixed(dec); return; }
        var t0 = performance.now(), dur = 1400;
        (function paso(t) {
          var k = Math.min(1, (t - t0) / dur);
          k = 1 - Math.pow(1 - k, 3);
          n.textContent = (fin * k).toFixed(dec);
          if (k < 1) requestAnimationFrame(paso);
        })(t0);
      }, { threshold: 0.4 });
      oj.observe(n);
    });

    /* el riel de la metodologia + el paso vivo */
    var ruta = document.getElementById('ruta'), riel = document.getElementById('riel');
    var pasos = ruta ? [].slice.call(ruta.querySelectorAll('.paso')) : [];
    var cabecera = document.getElementById('cabecera'), barra = document.getElementById('progreso');

    function alDesplazar() {
      if (cabecera) cabecera.classList.toggle('solida', window.scrollY > 40);
      if (barra) {
        var alto = document.documentElement.scrollHeight - innerHeight;
        barra.style.width = (alto > 0 ? (scrollY / alto) * 100 : 0) + '%';
      }
      if (ruta && riel) {
        var r = ruta.getBoundingClientRect(), medio = innerHeight * 0.55;
        var k = Math.max(0, Math.min(1, (medio - r.top) / r.height));
        riel.style.height = (k * (r.height - 36)) + 'px';
        pasos.forEach(function (p) {
          var pr = p.getBoundingClientRect();
          p.classList.toggle('vivo', pr.top < medio && pr.bottom > 90);
        });
      }
    }
    addEventListener('scroll', alDesplazar, { passive: true });
    addEventListener('resize', alDesplazar);
    alDesplazar();

    /* el formulario: sin servidor, abre el correo con todo redactado */
    var forma = document.getElementById('forma');
    if (forma) forma.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(forma);
      if ((d.get('sitio') || '').trim()) return;            /* trampa de robots */
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

  /* ── arranque ──────────────────────────────────────────────────────── */
  function arrancar() { tejido(); chasis(); glifos(); latencia(); resto(); }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
