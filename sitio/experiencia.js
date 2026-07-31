/* ============================================================================
   experiencia.js — LA DEMOSTRACIÓN
   ----------------------------------------------------------------------------
   Carlos pidió una cosa muy concreta y vale la pena escribirla completa, porque
   es el contrato de este archivo:

     "que al abrir la página salga un fondo oscuro y el logo iluminándose como
      un foco que tarda en encender, al encender un parpadeo en cada letra y
      moverse a la esquina de arriba a la izquierda, con la paloma volando por
      la pantalla · después figuras, apartados interactivos, herramientas
      usables, lo de las ligas, todo como si estuviésemos cayendo desde el
      cielo y las cosas fueran a diferentes velocidades · las tarjetitas que
      miren al cursor · muchísimos elementos juicy: teclados que se iluminan al
      pasar el mouse, hacen click al presionarlos y reaccionan a nuestro
      teclado; interruptores que cambian la página de brillante a oscuro;
      botones que rebotan al toque · al final llegar a la computadora de donde
      sale todo, que todo se meta de nuevo en ella y quede organizado, y hacer
      un zoom in para ver la página desde la pantalla de la computadora, con el
      marco del portátil visible · un botón para acercarse y poner pantalla
      completa · esto es una demostración de armamento."

   ── LAS DECISIONES DE FONDO ──────────────────────────────────────────────

   1. **DOM y transformaciones, no fotogramas.** Una tira de imágenes se ve
      preciosa y no se puede TOCAR. Aquí el argumento es justo que se toca, así
      que todo son nodos reales con `transform`, que es lo único que la tarjeta
      gráfica anima gratis. Nada de `top`/`left`: eso obliga al navegador a
      recalcular el acomodo en cada cuadro y es lo que hace que un teléfono se
      arrastre.

   2. **Guiada por scroll, NUNCA secuestrada** (CLAUDE.md §3.3). El scroll es
      del visitante. La escena responde a dónde está; si sube, va para atrás;
      si se sale, se sale. En ningún momento le agarramos el dedo.

   3. **El encendido no bloquea.** El contenido está en el HTML desde el primer
      byte. La animación sólo revela. Si el JS truena, la página se ve completa
      — y por eso es el JS el que esconde, no el CSS.

   4. **Un solo rAF para todo.** Cada pieza registra una función y el pulso las
      llama en orden. Veinte `requestAnimationFrame` sueltos es como se funde
      una batería.
   ==========================================================================*/

/* ═══ UTILERÍA ═════════════════════════════════════════════════════════════ */

const lim = (v, a, b) => Math.min(b, Math.max(a, v));
/* tramo(t, de, a): reescala t para que un pedazo del recorrido vaya de 0 a 1.
   Es lo que deja escribir la coreografía por actos sin hacer cuentas a mano. */
const tramo = (t, de, a) => lim((t - de) / (a - de), 0, 1);
const suave = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const salida = x => 1 - Math.pow(1 - x, 3);
const rebote = x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

const menosMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── EL PULSO ────────────────────────────────────────────────────────────── */
const tareas = new Set();
let pulsando = false;
function pulso() {
  if (!tareas.size) { pulsando = false; return; }
  for (const t of tareas) { try { t(); } catch (e) { tareas.delete(t); console.error(e); } }
  requestAnimationFrame(pulso);
}
function cada(fn) {
  tareas.add(fn);
  if (!pulsando) { pulsando = true; requestAnimationFrame(pulso); }
  return () => tareas.delete(fn);
}

/* ── EL PUNTERO ──────────────────────────────────────────────────────────────
   Uno solo para todo el sitio, en coordenadas de pantalla. En teléfono no hay
   cursor, así que se alimenta del dedo mientras toca y del acelerómetro nunca:
   inclinar el teléfono para mover tarjetas marea y no lo pidió nadie. Sin dedo,
   se queda quieto en el centro — que es lo honesto. */
export const Puntero = {
  x: 0.5, y: 0.5, tocado: false,
  _sx: 0.5, _sy: 0.5,
};
addEventListener('pointermove', e => {
  Puntero._sx = e.clientX / innerWidth;
  Puntero._sy = e.clientY / innerHeight;
  Puntero.tocado = true;
}, { passive: true });
addEventListener('pointerleave', () => { Puntero.tocado = false; }, { passive: true });
cada(() => {
  // Suavizado: el puntero real salta de píxel en píxel y eso se siente
  // nervioso. Un seguimiento con inercia se siente caro.
  Puntero.x += (Puntero._sx - Puntero.x) * 0.12;
  Puntero.y += (Puntero._sy - Puntero.y) * 0.12;
});

/* ── EL SONIDO ───────────────────────────────────────────────────────────────
   Sintetizado, no grabado: cero kilobytes, y es nuestro. APAGADO por omisión —
   una página que suena sin permiso se cierra, y además el navegador bloquea el
   audio hasta que hay un toque. La decisión se guarda entre visitas. */
export const Son = (() => {
  let ac = null;
  const activo = () => document.documentElement.dataset.sonido === 'si';
  const ctx = () => {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  function nota({ f = 440, dur = 0.09, vol = 0.05, tipo = 'sine', caida = 0.6 }) {
    if (!activo()) return;
    try {
      const a = ctx(), o = a.createOscillator(), g = a.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(f, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, f * caida), a.currentTime + dur);
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(vol, a.currentTime + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur + 0.02);
    } catch (e) { /* sin audio, la página sigue igual de bien */ }
  }
  return {
    nota,
    tecla: (i = 0) => nota({ f: 620 + (i % 7) * 34, dur: 0.055, vol: 0.055, tipo: 'square', caida: .5 }),
    toque: () => nota({ f: 380, dur: 0.09, vol: 0.05, tipo: 'triangle' }),
    prende: () => nota({ f: 130, dur: 0.32, vol: 0.06, tipo: 'sawtooth', caida: .35 }),
    caida: (p) => nota({ f: 200 + p * 500, dur: 0.14, vol: 0.035, tipo: 'triangle' }),
    zoom: () => nota({ f: 90, dur: 0.5, vol: 0.07, tipo: 'sawtooth', caida: 3 }),
  };
})();

/* ═══════════════════════════════════════════════════════════════════════════
   ACTO 0 · EL ENCENDIDO
   ---------------------------------------------------------------------------
   Un foco de verdad no prende: CALIENTA. Sube titubeando, se pasa un poco, cae,
   y se asienta. Eso es lo que separa esto de un `fade-in`, que es lo que hace
   todo el mundo. La curva no es una curva: es una tabla de tiempos medida a
   ojo, porque un filamento no obedece a una ecuación bonita.

   Después el parpadeo letra por letra —cada una con su retardo, como un letrero
   viejo— y al final el logotipo VIAJA a la esquina. No se desvanece para que
   aparezca otro en la barra: es el MISMO nodo, medido antes y después, movido
   con la diferencia. Es la técnica de siempre (FLIP) y es la única forma de que
   se sienta que el logo se fue caminando y no que hubo un corte.
   ═════════════════════════════════════════════════════════════════════════ */

export function montarEncendido(raiz) {
  const logo = raiz.querySelector('[data-logo]');
  const letras = [...raiz.querySelectorAll('[data-letra]')];
  const ave = raiz.querySelector('[data-ave]');
  const destino = document.querySelector('[data-logo-destino]');
  const saltar = raiz.querySelector('[data-saltar]');

  // Menos movimiento: se prende y ya. Nadie se pierde nada.
  if (menosMovimiento()) { terminar(true); return; }

  document.documentElement.classList.add('encendiendo');

  /* La tabla del filamento: [tiempo en ms, brillo 0-1].
     Sube, titubea a los 620, se pasa a 1.15 y se asienta. */
  const FILAMENTO = [
    [0, 0], [180, .04], [360, .03], [520, .16], [620, .09],
    [820, .42], [900, .30], [1080, .78], [1160, .62],
    [1340, 1.12], [1480, .94], [1620, 1.0],
  ];
  const brilloEn = (ms) => {
    if (ms <= 0) return 0;
    for (let i = 1; i < FILAMENTO.length; i++) {
      const [t1, v1] = FILAMENTO[i], [t0, v0] = FILAMENTO[i - 1];
      if (ms <= t1) return v0 + (v1 - v0) * suave((ms - t0) / (t1 - t0));
    }
    return 1;
  };

  const T_FILAMENTO = 1620;
  const T_PARPADEO = 900;      // el parpadeo letra por letra
  const T_VIAJE = 900;
  const inicio = performance.now();
  let fase = 'filamento', sono = false;

  const parar = cada(() => {
    const ms = performance.now() - inicio;

    if (fase === 'filamento') {
      const b = brilloEn(ms);
      logo.style.setProperty('--luz', b.toFixed(3));
      if (!sono && b > .3) { sono = true; Son.prende(); }
      if (ms > T_FILAMENTO) { fase = 'parpadeo'; arrancaParpadeo(); }
      return;
    }

    if (fase === 'parpadeo' && ms > T_FILAMENTO + T_PARPADEO) {
      fase = 'viaje';
      viaja();
      return;
    }
  });

  /* El parpadeo: cada letra prende y apaga dos veces, con su propio retardo.
     Se hace con clases y `animation-delay` en vez de con un temporizador por
     letra — el navegador las sincroniza mejor de lo que las sincronizaría yo. */
  function arrancaParpadeo() {
    letras.forEach((el, i) => {
      el.style.animationDelay = (i * 62) + 'ms';
      el.classList.add('parpadea');
    });
    // La paloma cruza la pantalla. Empieza cuando el letrero ya prendió, para
    // que haya algo que mirar mientras las letras titilan.
    if (ave) ave.classList.add('vuela');
  }

  /* EL VIAJE · FLIP.
     Se mide dónde está (First), se mide dónde va a quedar (Last), se aplica la
     diferencia como transformación (Invert) y se suelta (Play). El nodo nunca
     se mueve de su sitio en el documento: lo que se mueve es su pintura. */
  function viaja() {
    if (!destino) { terminar(); return; }
    const de = logo.getBoundingClientRect();
    const a = destino.getBoundingClientRect();
    if (!a.width) { terminar(); return; }

    const escala = a.width / de.width;
    const dx = a.left - de.left, dy = a.top - de.top;

    logo.style.transformOrigin = 'top left';
    logo.style.transition = `transform ${T_VIAJE}ms cubic-bezier(.7,0,.2,1), opacity 260ms ease ${T_VIAJE - 200}ms`;
    // Doble rAF: sin esto el navegador junta el estado inicial y el final en un
    // solo repintado y no hay animación, sólo un salto. Es el clásico.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      logo.style.transform = `translate(${dx}px, ${dy}px) scale(${escala})`;
      logo.style.opacity = '0';
    }));
    setTimeout(() => terminar(), T_VIAJE);
  }

  function terminar(inmediato) {
    parar && parar();
    document.documentElement.classList.remove('encendiendo');
    document.documentElement.classList.add('encendido');
    raiz.classList.add('apagado');
    if (inmediato) raiz.style.transition = 'none';
  }

  // Escaparse siempre se puede. Quien ya vio la intro no tiene por qué verla
  // otra vez, y quien viene por el teléfono a buscar el WhatsApp menos.
  saltar && saltar.addEventListener('click', () => terminar());
  addEventListener('keydown', e => { if (e.key === 'Escape') terminar(); }, { once: true });
  // Y si alguien llega con el scroll ya movido (recarga a media página), la
  // intro no tiene sentido: se salta sola.
  if (scrollY > 40) terminar(true);
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTO 1 · LA CAÍDA
   ---------------------------------------------------------------------------
   Estamos cayendo. Las cosas pasan a distintas velocidades según qué tan lejos
   estén — que es literalmente cómo funciona mirar por la ventanilla de un
   coche: lo cercano vuela, lo lejano casi no se mueve. Aquí `prof` (0 = lejos,
   1 = cerca) es esa distancia, y multiplica todo: velocidad, tamaño y opacidad.

   Lo que cae NO es relleno decorativo: son las pantallas reales del sistema,
   las herramientas de la casa y los seis servicios. Cada objeto que pasa dice
   algo. Si un objeto no dice nada, no va.
   ═════════════════════════════════════════════════════════════════════════ */

export function montarCaida(raiz) {
  const cielo = raiz.querySelector('[data-cielo]');
  const objetos = [...raiz.querySelectorAll('[data-objeto]')];
  if (!objetos.length) return;

  // Cada objeto trae su sitio y su profundidad escritos en el HTML. Así el
  // acomodo se puede afinar sin tocar el JavaScript, y se lee de un vistazo.
  const piezas = objetos.map(el => ({
    el,
    x: Number(el.dataset.x || 50),          // % del ancho
    prof: Number(el.dataset.prof || .5),    // 0 lejos, 1 cerca
    de: Number(el.dataset.de || 0),         // cuándo entra (0-1 del recorrido)
    giro: Number(el.dataset.giro || 0),
    tarjeta: el.hasAttribute('data-mira'),  // ¿mira al cursor?
  }));

  // Reparto vertical: si dos objetos entran al mismo tiempo y a la misma
  // profundidad se encaraman. Se separan por el orden de aparición.
  piezas.forEach((p, i) => { p.fase = p.de || (i / piezas.length) * .82; });

  let ultimoPaso = -1;

  const avance = () => {
    const r = raiz.getBoundingClientRect();
    const recorrido = raiz.offsetHeight - innerHeight;
    return recorrido <= 0 ? 0 : lim(-r.top / recorrido, 0, 1);
  };

  let vivo = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { vivo = es[0].isIntersecting; }, { rootMargin: '250px 0px' })
      .observe(raiz);
  } else vivo = true;

  cada(() => {
    if (!vivo) return;
    const t = avance();

    // El sonido marca la caída cada sexto de recorrido: un tono que sube.
    const paso = Math.floor(t * 6);
    if (paso !== ultimoPaso && t > .04 && t < .96) { ultimoPaso = paso; Son.caida(t); }

    // El cielo se aclara conforme caemos: arriba es noche, abajo es donde está
    // la máquina, encendida.
    if (cielo) cielo.style.setProperty('--caida', t.toFixed(3));

    for (const p of piezas) {
      // Cada pieza vive una ventana del recorrido. Fuera de ella no se dibuja:
      // veinte nodos transformados a la vez en un teléfono es un tobogán.
      const local = tramo(t, p.fase, p.fase + .40);
      if (local <= 0 || local >= 1) {
        if (p.el.style.visibility !== 'hidden') {
          p.el.style.visibility = 'hidden';
          p.el.style.opacity = '0';
        }
        continue;
      }
      p.el.style.visibility = 'visible';

      // Cae de arriba a abajo. Cuanto más cerca (prof alto), más rápido pasa y
      // más grande se ve — eso es todo el truco del paralaje.
      const vel = 0.45 + p.prof * 1.55;
      const y = (0.5 - local) * innerHeight * 1.9 * vel;
      const z = -900 + p.prof * 1100;
      const esc = 0.55 + p.prof * 0.75;

      // Entra y sale desvaneciéndose para que no aparezca de golpe en el borde.
      const opa = Math.min(1, local / .16) * Math.min(1, (1 - local) / .16)
                * (0.42 + p.prof * 0.58);

      let mira = '';
      if (p.tarjeta && Puntero.tocado) {
        // Mira al cursor: la tarjeta gira hacia donde está el puntero, con tope.
        // Sin tope se voltea de espaldas y se ve como un error, no como un
        // efecto.
        const c = p.el.getBoundingClientRect();
        const cx = (c.left + c.width / 2) / innerWidth;
        const cy = (c.top + c.height / 2) / innerHeight;
        const gy = lim((Puntero.x - cx) * 46, -17, 17);
        const gx = lim((cy - Puntero.y) * 46, -14, 14);
        mira = ` rotateY(${gy.toFixed(1)}deg) rotateX(${gx.toFixed(1)}deg)`;
      }

      p.el.style.transform =
        `translate3d(-50%, ${y.toFixed(1)}px, ${z.toFixed(0)}px)` +
        ` rotate(${(p.giro * (1 - local)).toFixed(1)}deg)` +
        ` scale(${esc.toFixed(3)})${mira}`;
      p.el.style.opacity = opa.toFixed(3);
      p.el.style.zIndex = String(Math.round(p.prof * 100));
    }
  });

  // Menos movimiento: los objetos se quedan quietos, repartidos y legibles. El
  // argumento —"esto es lo que construimos"— sobrevive completo sin una sola
  // animación.
  if (menosMovimiento()) {
    raiz.classList.add('quieto');
    piezas.forEach(p => {
      p.el.style.visibility = 'visible';
      p.el.style.opacity = '1';
      p.el.style.transform = 'none';
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOS JUGUETES · la demostración de armamento
   ---------------------------------------------------------------------------
   Cada uno prueba una capacidad distinta, y ninguno es decorativo:

     · EL TECLADO      → que sabemos hacer interfaces que responden de verdad,
                         al ratón Y al teclado físico. Es lo que separa una
                         página de una aplicación.
     · EL INTERRUPTOR  → que el tema no es un filtro encima: es el sistema de
                         color completo cambiando. Y de paso: accesibilidad.
     · LOS BOTONES     → microinteracción. Lo que hace que algo "se sienta caro"
                         es que responda en menos de 100 ms y con inercia.
   ═════════════════════════════════════════════════════════════════════════ */

export function montarTeclado(raiz) {
  const teclas = [...raiz.querySelectorAll('[data-tecla]')];
  const salida = raiz.querySelector('[data-escrito]');
  const porLetra = new Map();
  teclas.forEach((t, i) => { t.dataset.i = i; porLetra.set(t.dataset.tecla.toUpperCase(), t); });

  const golpe = (el, deTeclado) => {
    if (!el) return;
    el.classList.remove('pulsada');
    // Reiniciar una animación en curso obliga a leer una propiedad de acomodo:
    // es el único `offsetWidth` del archivo y está aquí a propósito.
    void el.offsetWidth;
    el.classList.add('pulsada');
    Son.tecla(Number(el.dataset.i || 0));
    if (salida) {
      const c = el.dataset.tecla;
      salida.textContent = (salida.textContent + c).slice(-22);
      salida.classList.toggle('de-teclado', !!deTeclado);
    }
  };

  teclas.forEach(t => {
    t.addEventListener('pointerdown', () => golpe(t, false));
    // Accesible de verdad: con Enter o espacio, no sólo con el dedo.
    t.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); golpe(t, false); }
    });
  });

  /* Reacciona al teclado FÍSICO. Es lo que pidió Carlos y es el detalle que
     hace que alguien diga "espérate, ¿esto me está oyendo?". Sólo cuando el
     teclado está en pantalla: capturar teclas de una sección que nadie ve es
     robarle el teclado al visitante. */
  let enPantalla = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { enPantalla = es[0].isIntersecting; }, { threshold: .35 })
      .observe(raiz);
  }
  addEventListener('keydown', e => {
    if (!enPantalla) return;
    // Si el visitante está escribiendo en un campo, el teclado no se mete.
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = porLetra.get(e.key.toUpperCase());
    if (el) golpe(el, true);
  });
}

export function montarInterruptor(nodo) {
  const raizHtml = document.documentElement;
  let guardado = null;
  try { guardado = localStorage.getItem('mazi-tema'); } catch (e) {}
  // Oscuro por omisión: es la marca. El claro es una capacidad que se enseña,
  // no el estado natural de la casa.
  raizHtml.dataset.tema = guardado === 'claro' ? 'claro' : 'oscuro';

  const pinta = () => {
    const claro = raizHtml.dataset.tema === 'claro';
    nodo.setAttribute('aria-pressed', claro ? 'true' : 'false');
    nodo.setAttribute('aria-label', claro ? 'Cambiar a oscuro' : 'Cambiar a claro');
  };
  pinta();

  nodo.addEventListener('click', () => {
    const claro = raizHtml.dataset.tema !== 'claro';
    raizHtml.dataset.tema = claro ? 'claro' : 'oscuro';
    try { localStorage.setItem('mazi-tema', claro ? 'claro' : 'oscuro'); } catch (e) {}
    pinta();
    Son.toque();
  });
}

export function montarRebotes(nodos) {
  nodos.forEach(el => {
    el.addEventListener('pointerdown', () => {
      el.classList.remove('rebota'); void el.offsetWidth; el.classList.add('rebota');
      Son.toque();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTO 3 · LA COMPUTADORA
   ---------------------------------------------------------------------------
   Todo lo que cayó se mete de vuelta en la máquina, y la cámara entra a la
   pantalla. A partir de ahí el visitante está DENTRO: ve el marco del portátil
   y el cuarto alrededor, y la página de adentro se usa normal.

   CÓMO ESTÁ HECHO, QUE ES LA PARTE INTERESANTE:
   el marco NO es una imagen encima del contenido — eso lo volvería intocable.
   Es un marco de cuatro bordes fijos (`position:fixed`) con un hueco en medio,
   y el contenido vive en el hueco. Todo lo de adentro sigue siendo HTML normal:
   se puede tocar, escribir y hacer scroll. El "zoom" es el hueco creciendo
   hasta comerse la pantalla.

   Y por eso el botón de pantalla completa es honesto: quitar el marco es
   quitar un `class`, no salir de un video.
   ═════════════════════════════════════════════════════════════════════════ */

export function montarComputadora(raiz) {
  const marco = document.querySelector('[data-marco]');
  const boton = document.querySelector('[data-acercar]');
  if (!marco) return;

  let vivo = false, sono = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { vivo = es[0].isIntersecting; }, { rootMargin: '400px 0px' })
      .observe(raiz);
  } else vivo = true;

  cada(() => {
    if (!vivo) return;
    const r = raiz.getBoundingClientRect();
    const recorrido = raiz.offsetHeight - innerHeight;
    const t = recorrido <= 0 ? 0 : lim(-r.top / recorrido, 0, 1);

    // 0 → la máquina se ve entera y lejos. 1 → estamos dentro de la pantalla.
    const dentro = suave(tramo(t, .18, .92));
    marco.style.setProperty('--dentro', dentro.toFixed(3));
    document.documentElement.classList.toggle('en-la-pc', dentro > .55);

    if (!sono && dentro > .5) { sono = true; Son.zoom(); }
  });

  // "Acercarse": el marco se va del todo. Es una clase, no un truco — lo de
  // adentro nunca dejó de ser la página.
  boton && boton.addEventListener('click', () => {
    const pegado = document.documentElement.classList.toggle('sin-marco');
    boton.setAttribute('aria-pressed', pegado ? 'true' : 'false');
    boton.querySelector('[data-acercar-txt]').textContent =
      pegado ? 'VER LA MÁQUINA' : 'ENTRAR A PANTALLA COMPLETA';
    Son.zoom();
    // Y si el navegador deja, pantalla completa de verdad.
    try {
      if (pegado && !document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else if (!pegado && document.fullscreenElement) document.exitFullscreen?.();
    } catch (e) { /* muchos teléfonos no dejan; la clase ya hizo el trabajo */ }
  });

  if (menosMovimiento()) {
    marco.style.setProperty('--dentro', '1');
    document.documentElement.classList.add('en-la-pc');
  }
}

/* ═══ EL INTERRUPTOR DEL SONIDO ════════════════════════════════════════════ */

export function montarSonido(nodo) {
  const raizHtml = document.documentElement;
  let guardado = null;
  try { guardado = localStorage.getItem('mazi-sonido'); } catch (e) {}
  raizHtml.dataset.sonido = guardado === 'si' ? 'si' : 'no';

  const pinta = () => {
    const on = raizHtml.dataset.sonido === 'si';
    nodo.setAttribute('aria-pressed', on ? 'true' : 'false');
    nodo.setAttribute('aria-label', on ? 'Apagar sonido' : 'Encender sonido');
  };
  pinta();

  nodo.addEventListener('click', () => {
    const on = raizHtml.dataset.sonido !== 'si';
    raizHtml.dataset.sonido = on ? 'si' : 'no';
    try { localStorage.setItem('mazi-sonido', on ? 'si' : 'no'); } catch (e) {}
    pinta();
    if (on) Son.prende();   // confirma que sí suena, sin ir a buscarlo
  });
}
