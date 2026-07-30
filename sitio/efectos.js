/* efectos.js — LOS EFECTOS DEL SITIO
 * ===========================================================================
 * Carlos vio ocho demos hechas en Framer y dijo: "hazlo, no importa el peso,
 * más adelante optimizamos". Va, y va completo.
 *
 * PERO NO COPIADAS: reconstruidas. Aquellas cargan 1.4 MB de React + Framer
 * Motion + el runtime de Framer para lograr UN efecto. Éstas son las mismas
 * ideas escritas a mano, sin una sola dependencia — y con la corrección que
 * ninguna de las ocho tenía: FUNCIONAN CON EL DEDO.
 *
 * Seis de las ocho originales se disparan con `hover`, y en un teléfono no
 * existe el cursor. Nuestro visitante llega de Instagram y de WhatsApp, o sea
 * que llega en teléfono. Aquí todo responde a tres cosas: dedo, cursor, y —
 * cuando no hay ninguno de los dos— un vaivén propio para que el efecto se vea
 * igual aunque nadie toque nada.
 *
 * Se carga con `defer` y NADA depende de él: si este archivo no llega, el sitio
 * se ve completo. Eso no es una promesa, hay prueba que lo tira a propósito.
 *
 * Y si el aparato pide menos movimiento (`prefers-reduced-motion`), no arranca
 * ninguno.
 * ===========================================================================*/
(() => {
  'use strict';

  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (quieto) return;

  const TAU = Math.PI * 2;
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── EL PUNTERO ÚNICO ─────────────────────────────────────────────────
     Un solo lugar que sabe dónde está el dedo o el cursor, en 0..1. Si nadie
     ha tocado nada todavía, se mueve solo en una figura de Lissajous lenta —
     así el efecto se ve en un teléfono en reposo, que es como lo va a ver la
     mayoría. Ése es el arreglo que las ocho demos originales no tienen. */
  const P = { x: 0.5, y: 0.42, tocado: false, activo: false };
  {
    let t = 0;
    const deriva = () => {
      if (!P.tocado) {
        t += 0.0042;
        P.x = 0.5 + Math.sin(t) * 0.26;
        P.y = 0.45 + Math.sin(t * 1.37) * 0.2;
      }
      requestAnimationFrame(deriva);
    };
    deriva();

    const mover = (cx, cy) => {
      P.x = lim(cx / innerWidth, 0, 1);
      P.y = lim(cy / innerHeight, 0, 1);
      P.tocado = true; P.activo = true;
    };
    addEventListener('pointermove', e => mover(e.clientX, e.clientY), { passive: true });
    addEventListener('touchmove', e => {
      const t0 = e.touches[0]; if (t0) mover(t0.clientX, t0.clientY);
    }, { passive: true });
    addEventListener('pointerdown', e => mover(e.clientX, e.clientY), { passive: true });
    // Al soltar, el puntero NO se congela: vuelve al vaivén después de un rato.
    // Un efecto que se queda tieso donde levantaste el dedo se siente roto.
    let sueltaT;
    const soltar = () => {
      clearTimeout(sueltaT);
      sueltaT = setTimeout(() => { P.tocado = false; P.activo = false; }, 2600);
    };
    addEventListener('pointerup', soltar, { passive: true });
    addEventListener('touchend', soltar, { passive: true });
  }

  /* Sólo animar lo que se está viendo. Un canvas dibujando fuera de pantalla
     es batería que se va sin que nadie lo note. */
  const enPantalla = (el, cb) => {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(es => cb(es[0].isIntersecting), { rootMargin: '80px' }).observe(el);
  };

  /* Retina, pero con tope: a 3x un canvas a pantalla completa son millones de
     píxeles por cuadro y el teléfono se calienta. */
  const escalar = (cv) => {
    const d = Math.min(devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * d));
    cv.height = Math.max(1, Math.round(r.height * d));
    return d;
  };

  /* ═══ 1 · FONDO NEURAL ═════════════════════════════════════════════════
     Puntos que flotan y se unen con una línea cuando están cerca. El puntero
     los empuja. Canvas 2D, sin librería. La versión de Framer de esto carga
     WebGL entero; ésta son ~60 líneas. */
  function fondoNeural(cv) {
    const cx = cv.getContext('2d', { alpha: true });
    if (!cx) return;
    let d = escalar(cv), vivo = true, puntos = [];

    const sembrar = () => {
      // La cantidad se calcula por área: en un teléfono salen ~34, en un
      // monitor ~110. Un número fijo se ve vacío en grande y saturado en chico.
      const n = lim(Math.round((cv.width * cv.height) / (d * d) / 12000), 26, 120);
      puntos = Array.from({ length: n }, () => ({
        x: Math.random() * cv.width, y: Math.random() * cv.height,
        vx: (Math.random() - .5) * .22 * d, vy: (Math.random() - .5) * .22 * d,
        r: (Math.random() * 1.3 + .7) * d,
      }));
    };
    sembrar();

    const UNE = 118;                    // distancia a la que se dibuja la línea
    const dibuja = () => {
      if (!vivo) return requestAnimationFrame(dibuja);
      cx.clearRect(0, 0, cv.width, cv.height);
      const px = P.x * cv.width, py = P.y * cv.height, empuje = 132 * d;

      for (const p of puntos) {
        // El puntero empuja suave, no arrastra: arrastrar se siente pegajoso.
        const dx = p.x - px, dy = p.y - py, dist = Math.hypot(dx, dy);
        if (dist < empuje && dist > 0.01) {
          const f = (1 - dist / empuje) * 0.55;
          p.x += (dx / dist) * f; p.y += (dy / dist) * f;
        }
        p.x += p.vx; p.y += p.vy;
        // Rebote en los bordes. Envolver al otro lado hace que las líneas
        // salten de un lado a otro de la pantalla y se ve como un error.
        if (p.x < 0 || p.x > cv.width) p.vx *= -1;
        if (p.y < 0 || p.y > cv.height) p.vy *= -1;
        p.x = lim(p.x, 0, cv.width); p.y = lim(p.y, 0, cv.height);
      }

      const U = UNE * d;
      cx.lineWidth = Math.max(1, d * 0.6);
      for (let i = 0; i < puntos.length; i++) {
        const a = puntos[i];
        for (let j = i + 1; j < puntos.length; j++) {
          const b = puntos[j];
          const dx = a.x - b.x; if (dx > U || dx < -U) continue;   // corte barato
          const dy = a.y - b.y; if (dy > U || dy < -U) continue;
          const dd = Math.hypot(dx, dy);
          if (dd > U) continue;
          cx.strokeStyle = 'rgba(172,39,255,' + (0.19 * (1 - dd / U)).toFixed(3) + ')';
          cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
        }
      }
      for (const p of puntos) {
        const cerca = Math.hypot(p.x - px, p.y - py) < empuje;
        cx.fillStyle = cerca ? 'rgba(232,35,42,.85)' : 'rgba(201,150,255,.5)';
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, TAU); cx.fill();
      }
      requestAnimationFrame(dibuja);
    };
    dibuja();

    enPantalla(cv, v => { vivo = v; });
    let rt; addEventListener('resize', () => {
      clearTimeout(rt); rt = setTimeout(() => { d = escalar(cv); sembrar(); }, 180);
    }, { passive: true });
  }

  /* ═══ 2 · RAYOS X ══════════════════════════════════════════════════════
     Debajo hay otra capa; el puntero abre un círculo que la deja ver. Es
     `mask-image` con un degradado radial: CSS puro, cero WebGL. La demo de
     Framer usa una malla 3D para lo mismo.
     En teléfono el círculo sigue al dedo, y si nadie toca, se pasea solo. */
  function rayosX(caja) {
    const capa = caja.querySelector('[data-rx-abajo]');
    if (!capa) return;
    let vivo = true;
    const pinta = (forzado) => {
      if (vivo || forzado) {
        const r = caja.getBoundingClientRect();
        // El puntero es global (0..1 de la ventana); aquí se traduce a
        // coordenadas de ESTA caja, o si no el círculo aparece corrido.
        const x = lim(((P.x * innerWidth) - r.left) / r.width, -.4, 1.4) * 100;
        const y = lim(((P.y * innerHeight) - r.top) / r.height, -.4, 1.4) * 100;
        // OJO: `circle` exige una LONGITUD, no un porcentaje. `circle 30%` es
        // CSS inválido y el navegador tira la declaración COMPLETA, sin avisar
        // — la máscara simplemente nunca aparecía. Se calcula en píxeles a
        // partir del ancho de la caja, que además la deja del mismo tamaño
        // relativo en teléfono y en escritorio.
        const rad = Math.round(Math.min(r.width, 520) * (P.activo ? 0.34 : 0.27));
        const m = `radial-gradient(circle ${rad}px at ${x.toFixed(1)}% ${y.toFixed(1)}%,
                   #000 0%, #000 55%, transparent 78%)`;
        capa.style.webkitMaskImage = m;
        capa.style.maskImage = m;
      }
      requestAnimationFrame(pinta);
    };
    // Se pinta UNA vez a la fuerza antes de que el observador diga nada. Sin
    // esto, una sección que nace fuera de pantalla arranca sin máscara: la capa
    // de abajo se ve COMPLETA encima del titular, que es justo lo contrario del
    // efecto. Lo cachó la prueba, porque la sección de contacto está abajo.
    pinta(true);
    enPantalla(caja, v => { vivo = v; if (v) pinta(true); });
  }

  /* ═══ 3 · LÍQUIDO ══════════════════════════════════════════════════════
     La imagen se ondula alrededor del puntero. Ésta SÍ es WebGL, pero escrito
     a mano: un shader de veinte líneas y dos triángulos. Sin `three.js`, sin
     `ogl`, sin `curtains` — el navegador ya trae WebGL, lo que pesa es la
     librería que la gente le pone encima.
     Si el aparato no da WebGL, la imagen se queda quieta y ya. Nunca en blanco. */
  function liquido(cv) {
    const src = cv.getAttribute('data-liquido');
    const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: false })
            || cv.getContext('experimental-webgl');
    if (!gl || !src) return false;

    const V = `attribute vec2 p; varying vec2 uv;
      void main(){ uv = p*0.5+0.5; uv.y = 1.0-uv.y; gl_Position=vec4(p,0.0,1.0); }`;
    const F = `precision mediump float;
      varying vec2 uv; uniform sampler2D tex; uniform vec2 pt; uniform float t;
      void main(){
        vec2 c = uv - pt;
        float d = length(c);
        /* La onda nace en el puntero y se apaga con la distancia. El seno le da
           el rizo; el 0.055 es cuánto se deforma — más que eso se ve como error
           de video, no como agua. */
        float onda = sin(d*13.0 - t*2.6) * 0.055 * exp(-d*4.2);
        vec2 q = uv + normalize(c + 0.0001) * onda;
        /* Separar un pelín los canales en el borde de la onda da el brillo de
           vidrio. Es el truco más barato que hay para que se vea caro. */
        float s = onda * 0.22;
        vec4 col;
        col.r = texture2D(tex, q + vec2(s, 0.0)).r;
        col.g = texture2D(tex, q).g;
        col.b = texture2D(tex, q - vec2(s, 0.0)).b;
        col.a = texture2D(tex, q).a;
        gl_FragColor = col;
      }`;

    const compilar = (tipo, txt) => {
      const s = gl.createShader(tipo); gl.shaderSource(s, txt); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compilar(gl.VERTEX_SHADER, V), fs = compilar(gl.FRAGMENT_SHADER, F);
    if (!vs || !fs) return false;
    const pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

    const uPt = gl.getUniformLocation(pr, 'pt'), uT = gl.getUniformLocation(pr, 't');
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      escalar(cv);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      cv.classList.add('listo');
      let vivo = true, t0 = performance.now();
      enPantalla(cv, v => { vivo = v; });
      const cuadro = () => {
        if (vivo) {
          const r = cv.getBoundingClientRect();
          gl.viewport(0, 0, cv.width, cv.height);
          gl.uniform2f(uPt,
            lim(((P.x * innerWidth) - r.left) / (r.width || 1), -.5, 1.5),
            lim(((P.y * innerHeight) - r.top) / (r.height || 1), -.5, 1.5));
          gl.uniform1f(uT, (performance.now() - t0) / 1000);
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        requestAnimationFrame(cuadro);
      };
      cuadro();
    };
    // Si la imagen no carga, no pasa nada: el `<img>` de abajo se queda.
    img.src = src;
    return true;
  }

  /* ═══ 4 · TEXTO QUE SE REPITE ══════════════════════════════════════════
     El eco de la demo de "hover text repeat", pero atado al SCROLL además del
     puntero — porque en teléfono no hay hover y esa demo, tal cual, no hace
     nada. Se clonan tres capas detrás y se separan según qué tan cerca esté el
     puntero. */
  function ecoTexto(el) {
    const txt = el.textContent;
    el.setAttribute('data-eco', txt);
    const capas = [];
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('span');
      c.className = 'eco-capa'; c.textContent = txt; c.setAttribute('aria-hidden', 'true');
      el.appendChild(c); capas.push(c);
    }
    let vivo = true;
    enPantalla(el, v => { vivo = v; });
    const paso = () => {
      if (vivo) {
        const r = el.getBoundingClientRect();
        const cx = (r.left + r.width / 2) / innerWidth;
        const cy = (r.top + r.height / 2) / innerHeight;
        const cerca = 1 - lim(Math.hypot(P.x - cx, P.y - cy) * 1.7, 0, 1);
        capas.forEach((c, i) => {
          const k = (i + 1) * cerca;
          c.style.transform = `translate(${k * 9}px, ${k * -6}px)`;
          c.style.opacity = (0.3 * cerca * (1 - i * 0.26)).toFixed(3);
        });
      }
      requestAnimationFrame(paso);
    };
    paso();
  }

  /* ═══ ARRANQUE ═══════════════════════════════════════════════════════ */
  const arranca = () => {
    document.querySelectorAll('[data-neural]').forEach(fondoNeural);
    document.querySelectorAll('[data-rayos-x]').forEach(rayosX);
    document.querySelectorAll('[data-liquido]').forEach(liquido);
    document.querySelectorAll('[data-eco]').forEach(ecoTexto);
  };
  document.readyState === 'loading'
    ? addEventListener('DOMContentLoaded', arranca)
    : arranca();
})();
