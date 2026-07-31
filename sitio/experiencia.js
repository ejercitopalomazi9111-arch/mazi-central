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

/* ═══════════════════════════════════════════════════════════════════════════
   EL VIAJE · una cámara de verdad dentro de un espacio de verdad
   ---------------------------------------------------------------------------
   Carlos: "no sólo la caída — quiero movimientos dinámicos de cámara, que
   viajemos por un entorno que simule uno 3D y se vayan enfocando las cosas con
   animaciones de cada una."

   Y eso es OTRA COSA que un paralaje. Un paralaje mueve capas planas a
   distintas velocidades y siempre se ve desde el mismo sitio. Aquí hay un
   ESPACIO: cada pieza tiene una posición real (x, y, z) y no se mueve nunca.
   Lo que se mueve es la cámara.

   ── CÓMO SE HACE UNA CÁMARA EN CSS ────────────────────────────────────────
   No existe una cámara: existe el mundo. Así que se mueve el mundo al revés.
   Si la cámara está en (cx, cy, cz) mirando con un giro `ry`, al mundo se le
   aplica la transformación INVERSA y en orden inverso:

       translateZ(P) rotateX(-rx) rotateY(-ry) translate3d(-cx, -cy, -cz)

   El `translateZ(P)` empuja el mundo hasta el plano de enfoque que declara
   `perspective:P` en el padre. Sin él, todo nace pegado al ojo.

   ── LA RUTA ───────────────────────────────────────────────────────────────
   Las piezas viven en una hélice que baja: cada una un poco más abajo, más al
   fondo, y girada sobre el eje. Volar por dentro de una hélice da la sensación
   de descender por un hueco — que es la caída que Carlos pedía, pero con
   cámara en vez de con capas.

   ── EL RITMO, QUE ES LO QUE HACE QUE NO SE SIENTA SIMPLE ──────────────────
   La cámara NO va a velocidad constante. En cada pieza frena, se planta y le
   da tiempo a que la pieza haga LO SUYO (una pantalla que enciende, un
   contador que corre, un teclado que se prende tecla por tecla). Después
   acelera al siguiente. Ese acelerón-freno es todo el oficio: una cámara a
   velocidad constante se siente barata aunque el espacio sea impecable.
   ═════════════════════════════════════════════════════════════════════════ */

export function montarViaje(raiz) {
  const mundo = raiz.querySelector('[data-mundo]');
  const cielo = raiz.querySelector('[data-cielo]');
  const piezas = [...raiz.querySelectorAll('[data-est]')];
  const capitulos = [...raiz.querySelectorAll('[data-cap]')];
  const hud = raiz.querySelector('[data-hud]');
  const capas = [...raiz.querySelectorAll('[data-capa]')];
  if (!mundo || !piezas.length) return;

  const N = piezas.length;

  /* La hélice. Los números están calibrados a ojo contra la captura, que es la
     única forma honesta de calibrar algo que se mira. */
  const RADIO = 300;        // qué tanto se abre la espiral a los lados
  const PASO_Z = 560;       // qué tan al fondo va cada pieza
  const PASO_Y = 190;       // qué tanto baja cada pieza
  const VUELTA = 0.62;      // radianes de giro entre pieza y pieza
  const RETRANCO = 640;     // a qué distancia se planta la cámara

  const sitio = (i) => {
    const a = i * VUELTA;
    return { x: Math.sin(a) * RADIO, y: i * PASO_Y, z: -i * PASO_Z, a };
  };

  /* EL GIRO DE CADA PIEZA — y el error que costó una captura de espaldas.
     La primera versión hacía `rotateY(a * 34)` con `a` en RADIANES, tratándolo
     como si fueran grados. A la sexta pieza eso son 126° y la pieza queda de
     canto o del revés: el texto sale espejeado. Se ve exactamente como un bug
     y lo es.

     La corrección no es convertir bien las unidades: es cambiar el criterio.
     Una pieza que hay que LEER no puede girar libre — se le da un giro chico y
     fijo, alternado, que da variedad sin comprometer la lectura. La sensación
     de espacio la dan la posición, la profundidad y el alabeo de la cámara, no
     que los carteles estén torcidos. */
  const giroPieza = (i) => (i % 2 ? 1 : -1) * (9 + (i % 3) * 4);

  // Cada pieza se coloca UNA vez y no se vuelve a tocar su posición. Lo único
  // que cambia por cuadro es la del mundo. Eso es lo que hace que esto corra
  // en un teléfono: una transformación por cuadro, no veinte.
  piezas.forEach((el, i) => {
    const s = sitio(i);
    el.style.setProperty('--x', s.x.toFixed(0) + 'px');
    el.style.setProperty('--y', s.y.toFixed(0) + 'px');
    el.style.setProperty('--z', s.z.toFixed(0) + 'px');
    el.dataset.giroMundo = giroPieza(i).toFixed(1);
    el.style.transform =
      `translate3d(calc(-50% + var(--x)), calc(-50% + var(--y)), var(--z))` +
      ` rotateY(${giroPieza(i).toFixed(1)}deg)`;
  });

  /* El abanico del final: las pantallas se despegan de la hélice y se ordenan
     de frente a la cámara. Es el cierre que pidió Carlos y el que se puede
     fotografiar. */
  const delAbanico = piezas.filter(p => p.dataset.abanico != null)
    .sort((a, b) => Number(a.dataset.abanico) - Number(b.dataset.abanico));
  const NA = delAbanico.length;
  const DE_ABANICO = .84;

  let ultimoFoco = -1, vivo = false;

  /* La cifra que corre al enfocarse. Arranca desde 0 y frena al llegar —
     `salida()` es lo que hace que se sienta un contador y no una barra de
     progreso. Se dispara una vez por enfoque, no por cuadro. */
  function cuenta(el) {
    if (!el) return;
    const meta = Number(el.dataset.cuenta || 0);
    const dest = el.querySelector('[data-cifra]');
    if (!meta || !dest) return;
    const t0 = performance.now(), DUR = 1100;
    const paso = () => {
      const p = lim((performance.now() - t0) / DUR, 0, 1);
      dest.textContent = String(Math.round(salida(p) * meta));
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { vivo = es[0].isIntersecting; }, { rootMargin: '300px 0px' })
      .observe(raiz);
  } else vivo = true;

  const avance = () => {
    const r = raiz.getBoundingClientRect();
    const rec = raiz.offsetHeight - innerHeight;
    return rec <= 0 ? 0 : lim(-r.top / rec, 0, 1);
  };

  cada(() => {
    if (!vivo) return;
    const t = avance();
    if (cielo) cielo.style.setProperty('--caida', t.toFixed(3));

    for (const c of capitulos) {
      c.classList.toggle('visible', t >= Number(c.dataset.de) && t <= Number(c.dataset.a));
    }

    /* ── EL RITMO ──────────────────────────────────────────────────────
       `bruto` es dónde estaríamos a velocidad constante. `pos` es dónde
       estamos de verdad: el mismo recorrido, pero frenando en cada pieza.
       El truco es aplicar una curva DENTRO de cada tramo — rápido al salir,
       lento al llegar — en vez de una curva global. */
    const bruto = t * (N - 1);
    const i = Math.min(N - 2, Math.floor(bruto));
    const dentro = lim(bruto - i, 0, 1);
    // Acelera al salir y frena al llegar, con una meseta en medio donde la
    // pieza hace lo suyo sin que la cámara le robe la atención.
    // .45 y no .62: con el umbral alto la cámara pasaba MÁS de la mitad del
    // tiempo viajando, y el visitante casi nunca cae en una toma plantada. Con
    // .45 se pasa más tiempo mirando que moviéndose, que es lo que hace un
    // comercial: los planos se sostienen.
    const ritmo = dentro < .45 ? suave(dentro / .45) : 1;
    const pos = i + ritmo;

    const a = sitio(Math.floor(pos));
    const b = sitio(Math.floor(pos) + 1 <= N - 1 ? Math.floor(pos) + 1 : N - 1);
    const f = pos - Math.floor(pos);

    /* La cámara va EXACTAMENTE por donde están las piezas, sólo que retrasada.
       Sin el `* 1.16` que tenía antes: ese factor desplazaba la cámara de la
       línea de las piezas y la pieza enfocada se salía del cuadro por la
       esquina. Si la cámara sigue la ruta, lo enfocado queda centrado — que es
       lo único que una cámara tiene que garantizar. */
    const cx = a.x + (b.x - a.x) * f;
    // Sin desfase vertical: la cámara va a la ALTURA de la pieza. El `-30` que
    // tenía la subía y dejaba lo enfocado por debajo del centro del cuadro.
    const cy = a.y + (b.y - a.y) * f;
    const cz = (a.z + (b.z - a.z) * f) + RETRANCO;

    /* El alabeo. La cámara se inclina al pasar, como un avión, y responde un
       poco al dedo. Va ACOTADO a unos pocos grados: sin tope el mundo se pone
       de canto y deja de leerse. Sin alabeo, viajar se siente como ir en tren;
       con alabeo —y sólo con un poco—, se siente como volar. */
    const ry = Math.sin(pos * 0.9) * 5 + (Puntero.tocado ? (Puntero.x - .5) * 7 : 0);
    const rx = Math.sin(pos * 1.1) * 3.2 + (Puntero.tocado ? (Puntero.y - .5) * -5 : 0);

    /* LA CORRECCIÓN DE ENCUADRE.
       Al girar la cámara, lo que tiene enfrente se le va de lado: un punto a
       RETRANCO de distancia se desplaza RETRANCO·sen(giro) al rotar. Con 5° de
       alabeo eso son 61 px — suficiente para que la pieza enfocada quede
       descentrada, que es justo lo que una cámara no puede permitirse.
       Se cancela con un empujón AL FINAL (primero en la cadena, porque las
       transformaciones se aplican de derecha a izquierda). */
    const rad = Math.PI / 180;
    const corrX = RETRANCO * Math.sin(-ry * rad);
    const corrY = RETRANCO * Math.sin(rx * rad);

    // El signo va en POSITIVO. Con el negativo la corrección sumaba en vez de
    // cancelar y la pieza enfocada se iba al doble de lejos del centro — que es
    // por lo que salía siempre pegada a la derecha en las capturas.
    mundo.style.transform =
      `translate3d(${corrX.toFixed(1)}px, ${corrY.toFixed(1)}px, 0)` +
      ` translateZ(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${(-ry).toFixed(2)}deg)` +
      ` translate3d(${(-cx).toFixed(0)}px, ${(-cy).toFixed(0)}px, ${(-cz).toFixed(0)}px)`;

    /* EL PARALAJE DEL FONDO.
       Las capas de atrás se mueven MENOS que el mundo. Sin esto, el fondo se
       queda clavado mientras la cámara vuela y el espacio se siente como un
       telón pintado. `data-capa` dice qué tan lejos está: 0.05 casi no se
       mueve, 0.4 acompaña. */
    for (const capa of capas) {
      const f2 = Number(capa.dataset.capa || .2);
      capa.style.transform =
        `translate3d(${(-cx * f2).toFixed(1)}px, ${(-cy * f2 - t * 90).toFixed(1)}px, 0)` +
        ` scale(${(1 + f2 * .35).toFixed(2)})`;
    }

    /* ── EL FOCO ───────────────────────────────────────────────────────
       La pieza que la cámara tiene enfrente se marca, y su animación propia
       arranca desde CSS. Se marca UNA vez al entrar, no cada cuadro: volver a
       poner la clase reiniciaría la animación sesenta veces por segundo. */
    const foco = Math.round(pos);
    if (foco !== ultimoFoco) {
      piezas[ultimoFoco]?.classList.remove('enfocado');
      piezas[foco]?.classList.add('enfocado');
      ultimoFoco = foco;
      if (t > .02 && t < .98) Son.caida(t);
      cuenta(piezas[foco]);
    }

    /* NIEBLA Y CULLING — y el bug que hacía que todo se viera borroso.
       ─────────────────────────────────────────────────────────────────────
       La primera versión medía la distancia con `Math.abs(k - pos)`, o sea sin
       distinguir lo que está DELANTE de lo que ya quedó ATRÁS. Y lo que queda
       atrás no desaparece: en CSS 3D una pieza a espaldas de la cámara se
       proyecta gigante y desenfocada, y se comía media pantalla. Eso era la
       mancha borrosa de las capturas.

       Con signo, el arreglo es de una línea: lo que ya pasamos se esconde. Lo
       de delante se apaga con la distancia, que es la niebla que da fondo. */
    piezas.forEach((el, k) => {
      const d = k - pos;                     // >0 delante, <0 ya pasó
      if (d < -0.25) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = 'visible';
      el.style.opacity = String(lim(1.25 - Math.abs(d) * 0.28, 0, 1).toFixed(3));
    });

    /* EL LETRERO DEL FRENTE · qué estoy viendo.
       Un renglón que cambia con lo que la cámara tiene enfrente. No explica la
       animación: nombra lo que se está viendo, que es lo que un comercial hace
       con una voz en off. */
    if (hud) {
      const info = piezas[foco]?.dataset.info;
      if (info && info !== hud.dataset.actual) {
        hud.dataset.actual = info;
        hud.textContent = info;
        hud.classList.remove('entra'); void hud.offsetWidth; hud.classList.add('entra');
      }
    }

    /* ── EL ABANICO ────────────────────────────────────────────────────
       Al final las pantallas se despegan del mundo y se ordenan de frente. Se
       les quita la transformación de la hélice y se les pone una fija respecto
       a la pantalla: por eso salen del `data-mundo` visualmente aunque sigan
       dentro de él. */
    const junta = suave(tramo(t, DE_ABANICO, 1));
    raiz.classList.toggle('en-abanico', junta > .02);
    if (junta > .02 && NA) {
      const incY = (Puntero.tocado ? (Puntero.x - .5) : 0) * -14;
      const incX = (Puntero.tocado ? (Puntero.y - .5) : 0) * 9;
      const resp = Math.sin(performance.now() / 1400) * 1.4;

      delAbanico.forEach((el, k) => {
        const col = k - (NA - 1) / 2;
        const ancho = el.offsetWidth || 180;
        const sep = Math.min(ancho * .58, innerWidth * .155);
        el.style.opacity = junta.toFixed(3);
        el.style.visibility = 'visible';
        el.style.zIndex = String(60 - Math.round(Math.abs(col) * 10));
        el.style.filter = `brightness(${(1 - Math.abs(col) * .16).toFixed(2)})`;
        el.style.transform =
          `translate3d(calc(-50% + ${(col * sep).toFixed(1)}px), -50%, ${(-Math.abs(col) * 130).toFixed(0)}px)` +
          ` rotateY(${(-col * 13 + incY + resp).toFixed(1)}deg) rotateX(${incX.toFixed(1)}deg)` +
          ` scale(${(0.80 + junta * 0.28).toFixed(3)})`;
      });
    } else {
      // Al salir del abanico, cada pantalla vuelve a su sitio en la hélice.
      delAbanico.forEach(el => {
        el.style.filter = '';
        el.style.transform =
          `translate3d(calc(-50% + var(--x)), calc(-50% + var(--y)), var(--z))` +
          ` rotateY(${el.dataset.giroMundo || 0}deg)`;
      });
    }
  });

  // Menos movimiento: no hay viaje. Las piezas se ponen en una lista legible y
  // el argumento —qué construimos— llega completo.
  if (menosMovimiento()) {
    raiz.classList.add('quieto');
    piezas.forEach(el => {
      el.style.transform = 'none'; el.style.opacity = '1';
      el.style.visibility = 'visible'; el.classList.add('enfocado');
    });
  }
}

export function montarCaida(raiz) {
  const cielo = raiz.querySelector('[data-cielo]');
  const objetos = [...raiz.querySelectorAll('[data-objeto]')];
  const capitulos = [...raiz.querySelectorAll('[data-cap]')];
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
    // Las que tienen sitio en el abanico del final. El número es su columna.
    abanico: el.dataset.abanico != null ? Number(el.dataset.abanico) : null,
  }));

  /* EL ABANICO · el cierre.
     ─────────────────────────────────────────────────────────────────────────
     Carlos lo pidió con estas palabras: "sí quiero la animación donde se
     centre esto y se dé el dinamismo de las imágenes moviéndose como un buen
     comercial". Y tiene razón en el diagnóstico: cosas cayendo sueltas se ven
     sueltas. Un comercial no termina con los productos dispersos — termina con
     todos juntos, ordenados, en una sola toma que se puede fotografiar.

     Así que la caída CONVERGE: las seis pantallas dejan de caer, se juntan al
     centro y se acomodan en abanico. Y ahí no se congelan — el mazo respira y
     se inclina hacia el dedo, que es de donde sale el dinamismo. */
  const enAbanico = piezas.filter(p => p.abanico != null)
    .sort((a, b) => a.abanico - b.abanico);
  const N = enAbanico.length;
  const DE_ABANICO = .68, A_ABANICO = .94;

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

    // El texto cambia con el acto. Se cambia una clase, no el contenido: si se
    // reescribiera el nodo, un lector de pantalla lo anunciaría cada cuadro.
    for (const c of capitulos) {
      c.classList.toggle('visible', t >= Number(c.dataset.de) && t <= Number(c.dataset.a));
    }

    /* ── El abanico manda sobre la caída ────────────────────────────────
       Cuando `junta` empieza a subir, las pantallas del abanico salen de su
       coreografía de caída y entran a la del cierre. Se calcula aquí arriba y
       una sola vez para las seis, no dentro del bucle. */
    const junta = suave(tramo(t, DE_ABANICO, A_ABANICO));
    if (junta > 0 && N) {
      // El mazo entero se inclina hacia el dedo. Es lo que lo mantiene vivo:
      // un abanico quieto es una foto, y una foto no es un comercial.
      const incX = (Puntero.tocado ? (Puntero.y - .5) : 0) * 9;
      const incY = (Puntero.tocado ? (Puntero.x - .5) : 0) * -14;
      // Y respira, aunque nadie lo toque. Amplitud chica a propósito: si se
      // nota que "se mueve solo", se ve como un GIF.
      const resp = Math.sin(performance.now() / 1400) * 1.4;

      enAbanico.forEach((p, i) => {
        const col = i - (N - 1) / 2;                   // -2.5 … 2.5
        const anchoPieza = p.el.offsetWidth || 180;
        // Se solapan un 42%: apretadas se leen como un mazo, separadas como
        // una fila de cromos.
        const sep = Math.min(anchoPieza * .58, innerWidth * .155);

        // Del sitio donde iba cayendo al sitio del abanico. `left` está en % y
        // es fijo, así que la corrección al centro va en el translate.
        const correccion = (50 - p.x) / 100 * innerWidth;
        const lado = correccion + col * sep;
        const alto = Math.abs(col) * innerHeight * .022 - innerHeight * .01;
        const z = -Math.abs(col) * 130;
        const giroY = -col * 13 + incY;

        p.el.style.visibility = 'visible';
        // Ojo con el `-50%` VERTICAL: los objetos están anclados con `top:50%`,
        // así que sin él la pieza cuelga hacia abajo del centro en vez de estar
        // centrada. Era el bug por el que todo se veía hundido en la mitad de
        // abajo del cuadro.
        p.el.style.transform =
          `translate3d(calc(-50% + ${lado.toFixed(1)}px), calc(-50% + ${alto.toFixed(1)}px), ${z.toFixed(0)}px)` +
          ` rotateY(${(giroY + resp).toFixed(1)}deg) rotateX(${incX.toFixed(1)}deg)` +
          ` scale(${(0.78 + junta * 0.26).toFixed(3)})`;
        p.el.style.opacity = junta.toFixed(3);
        // El del centro arriba, y de ahí hacia afuera. Sin esto el mazo se ve
        // barajado al azar.
        p.el.style.zIndex = String(60 - Math.round(Math.abs(col) * 10));
        // Y las de los lados se apagan un poco. Es lo que hace que el ojo sepa
        // dónde mirar: en un mazo todo igual de brillante no hay protagonista.
        p.el.style.filter = `brightness(${(1 - Math.abs(col) * .16).toFixed(2)})`;
        // Los rótulos se apagan encimados: no se leen y ensucian. En la caída
        // cada pantalla se lee sola; aquí lo que habla es el conjunto.
        const cap = p.el.querySelector('figcaption');
        if (cap) cap.style.opacity = String(1 - junta);
      });
    }

    for (const p of piezas) {
      // Las que ya están en el abanico no vuelven a la caída.
      if (junta > 0 && p.abanico != null) continue;
      // Y las que NO son del abanico se retiran para dejarle el cuadro: seis
      // pantallas ordenadas con tarjetas sueltas volando encima es ruido.
      // El factor se MULTIPLICA más abajo en vez de asignarse aquí: si se
      // asignara, el dibujo normal lo pisaría dos líneas después.
      const seRetira = junta > 0 ? Math.max(0, 1 - junta * 1.6) : 1;
      if (seRetira <= 0) { p.el.style.visibility = 'hidden'; continue; }

      /* Cada pieza vive una ventana del recorrido. Fuera de ella no se dibuja:
         veinte nodos transformados a la vez en un teléfono es un tobogán.

         Las del abanico son la excepción y por una razón concreta: si su
         ventana terminara antes del cierre, la pantalla desaparecería y
         volvería a aparecer de la nada para formarse. Su caída se estira hasta
         justo donde empieza el abanico, así que llegan al cierre en vez de
         reaparecer en él. */
      const finVentana = p.abanico != null ? DE_ABANICO : p.fase + .40;
      const local = tramo(t, p.fase, Math.max(p.fase + .12, finVentana));
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
      /* 1.25 y no 1.9: con el recorrido largo, cada objeto cruzaba la pantalla
         en un tercio de su ventana y el resto del tiempo estaba fuera de cuadro
         — quedaban huecos de media pantalla vacía. Acortando el viaje, los
         objetos conviven y la caída se siente poblada, que es el punto. */
      const vel = 0.45 + p.prof * 1.55;
      const y = (0.5 - local) * innerHeight * 1.25 * vel;
      const z = -900 + p.prof * 1100;
      const esc = 0.55 + p.prof * 0.75;

      /* Y aquí el tope que faltaba: por muy cerca que pase, el objeto no puede
         salirse del lienzo. Se calcula qué tanto cabe desde su columna hacia el
         borde más cercano y se recorta la escala a eso. Sin esto, las pantallas
         de `prof .95` se cortaban por la derecha — lo primero que se ve mal en
         una captura. */
      const anchoBase = p.el.offsetWidth || 200;
      const margenPct = Math.min(p.x, 100 - p.x) / 100;      // 0…0.5
      const cabe = (innerWidth * margenPct * 2 - 20) / anchoBase;
      const escTope = Math.max(0.4, Math.min(esc, cabe));

      // Entra y sale desvaneciéndose para que no aparezca de golpe en el borde.
      const opa = Math.min(1, local / .16) * Math.min(1, (1 - local) / .16)
                * (0.42 + p.prof * 0.58) * seRetira;

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

      // El `-50%` vertical va aquí igual que en el abanico: `top:50%` ancla el
      // BORDE de arriba al centro, no la pieza.
      p.el.style.transform =
        `translate3d(-50%, calc(-50% + ${y.toFixed(1)}px), ${z.toFixed(0)}px)` +
        ` rotate(${(p.giro * (1 - local)).toFixed(1)}deg)` +
        ` scale(${escTope.toFixed(3)})${mira}`;
      p.el.style.filter = '';
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
