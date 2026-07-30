/* sistema.js — LA VISTA EXPLOTADA
 * ===========================================================================
 * Carlos: "está súper sencillo, necesito algo innovador… quizá un sistema
 * desglosándose en 3D junto a nuestras herramientas moviéndose mientras
 * scrolleas".
 *
 * Y tenía razón: un cruce de opacidades no es una animación, es un fundido.
 *
 * QUÉ ES: la vista explotada de Grupo Mazi. Arranca como UNA sola placa vista
 * de frente. Al bajar, la cámara se inclina y la placa se abre en sus TRES
 * ESTRATOS —la base · los procesos · la imagen—, separándose en profundidad
 * como el despiece de un plano técnico. Después entran las SEIS HERRAMIENTAS
 * que construimos, cada una volando desde su costado hasta la capa a la que
 * sirve, unidas por una línea. Al final todo vuelve a cerrarse en una placa.
 *
 * POR QUÉ ESTO Y NO UN EFECTO COMPRADO:
 * no es una demo de terceros con nuestro logo encima — es LITERALMENTE nuestra
 * arquitectura. La taxonomía de los tres estratos salió de una frase que
 * escribió Carlos (`sitio/TEXTOS.md`), y las seis herramientas existen y están
 * en el repo. La animación no ilustra el argumento: ES el argumento.
 *
 * 3D DE VERDAD, SIN LIBRERÍA 3D: `perspective` + `transform: translate3d/rotate`
 * son transformaciones de la tarjeta gráfica. No hay malla, no hay shader, no
 * hay 1.4 MB de runtime — y en un iPhone corre a 60 sin calentarse. Lo caro de
 * las demos que trajo Carlos no era el 3D: era el framework debajo.
 *
 * SCROLL COMO PERILLA: sección alta + bloque pegado. El scroll no se
 * intercepta ni se frena; sólo se lee su posición. Regla 3 de la casa.
 * ===========================================================================*/

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Los tres estratos. Salen de la frase de Trabajo que escribió Carlos:
   "cuando la base, los procesos y la imagen trabajan como un solo sistema". */
const ESTRATOS = [
  { id:'imagen',   rot:'LA IMAGEN',    que:['Marketing','Video y fotografía'] },
  { id:'procesos', rot:'LOS PROCESOS', que:['Gestión de negocios','Tiempos y movimientos'] },
  { id:'base',     rot:'LA BASE',      que:['Páginas web','Desarrollo de software'] },
];

/* Las seis herramientas que de verdad existen en el repo, con la capa a la que
   sirven. Si algún día se construye otra, se agrega aquí y ya. */
const HERRAMIENTAS = [
  { n:'tipos.mjs',      q:'la fábrica de tipografías', capa:0, lado:-1 },
  { n:'fuente.mjs',     q:'la fundidora',              capa:0, lado: 1 },
  { n:'render.mjs',     q:'la mesa de fotografía',     capa:0, lado:-1 },
  { n:'captura.mjs',    q:'los ojos',                  capa:1, lado: 1 },
  { n:'navegador.mjs',  q:'las manos',                 capa:1, lado:-1 },
  { n:'vectorizar.mjs', q:'PNG → SVG',                 capa:2, lado: 1 },
];

/** Interpola de 0 a 1 dentro de un tramo del recorrido, con suavizado. */
const tramo = (p, a, b) => {
  const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);              // suavizado de Hermite
};

export function montarSistema(raiz) {
  const escena = raiz.querySelector('[data-escena]');
  const rotulo = raiz.querySelector('[data-fase]');
  const riel   = raiz.querySelector('[data-riel]');
  if (!escena) return;

  /* ── se arma el DOM ────────────────────────────────────────────────── */
  escena.innerHTML =
    ESTRATOS.map((e, i) => `
      <div class="placa" data-capa="${i}">
        <div class="placa-cara">
          <span class="placa-rot">${e.rot}</span>
          <span class="placa-que">${e.que.join(' · ')}</span>
        </div>
        <div class="placa-rejilla"></div>
      </div>`).join('') +
    HERRAMIENTAS.map((h, i) => `
      <div class="pieza" data-pieza="${i}">
        <span class="pieza-n">${h.n}</span><span class="pieza-q">${h.q}</span>
      </div>`).join('') +
    `<svg class="hilos" data-hilos aria-hidden="true"></svg>`;

  const placas = [...escena.querySelectorAll('.placa')];
  const piezas = [...escena.querySelectorAll('.pieza')];
  const hilos  = escena.querySelector('[data-hilos]');

  const FASES = [
    [0.00, 'UNA PLACA'],
    [0.18, 'SE ABRE EN TRES ESTRATOS'],
    [0.46, 'LAS HERRAMIENTAS ENTRAN'],
    [0.78, 'Y VUELVE A SER UNA SOLA'],
  ];

  let faseActual = -1;
  let ultimoP = -1;

  const pintar = (p) => {
    /* ── 1 · LA CÁMARA ────────────────────────────────────────────────
       De frente (0°) a inclinada (−26°) y de vuelta. Es lo que convierte
       una pila de tarjetas en un objeto con profundidad. */
    const abre  = tramo(p, 0.05, 0.42);
    const cierra = tramo(p, 0.80, 1.00);
    const apertura = abre * (1 - cierra);

    const incl = -19 * apertura;
    const giro = 14 * apertura * Math.sin(p * Math.PI * 1.4);
    escena.style.transform =
      `rotateX(${incl.toFixed(2)}deg) rotateZ(${giro.toFixed(2)}deg)`;

    /* ── 2 · LOS ESTRATOS se separan en PROFUNDIDAD ──────────────────── */
    placas.forEach((el, i) => {
      // La separación en Y pesa MÁS que la de Z, y esto no es capricho: con
      // poco desplazamiento vertical las tres placas se tapan las etiquetas
      // entre sí y sólo se lee la de enfrente. Un despiece donde no puedes leer
      // dos de las tres piezas no explica nada. Se cachó en la captura.
      const sep  = (i - 1) * 130 * apertura;          // profundidad
      // El signo importa y estaba al revés: LA BASE es el cimiento, va ABAJO;
      // LA IMAGEN es lo que se ve, va ARRIBA. Con el signo invertido el
      // despiece decía justo lo contrario de lo que vendemos.
      const alza = (i - 1) * 104 * apertura;          // abanico vertical
      const op = 0.35 + 0.65 * tramo(p, 0.05 + i * 0.05, 0.30 + i * 0.05);
      el.style.transform = `translate3d(0, ${alza.toFixed(1)}px, ${sep.toFixed(1)}px)`;
      el.style.opacity = op.toFixed(3);
    });

    /* ── 3 · LAS HERRAMIENTAS entran de los lados, una tras otra ─────── */
    piezas.forEach((el, i) => {
      const h = HERRAMIENTAS[i];
      const desde = 0.44 + i * 0.045;
      const t = tramo(p, desde, desde + 0.14) * (1 - cierra);
      // Las herramientas descansan A UN COSTADO de su placa, nunca encima:
      // aterrizando en el centro tapaban el nombre del estrato, que es lo que
      // el visitante tiene que leer. Entran desde fuera y se paran al lado.
      // Proporcional al ancho, no fijo: 168 px a cada lado en un teléfono de
      // 390 deja las tarjetas cortadas por el borde. En pantalla ancha se
      // separan más, que es donde sobra espacio.
      const reposo = h.lado * Math.min(210, escena.clientWidth * 0.33);
      const x = reposo + h.lado * (1 - t) * 220;
      const z = (h.capa - 1) * 130 * apertura + 30;
      const y = (h.capa - 1) * 104 * apertura + (i % 3 - 1) * 30;
      el.style.transform =
        `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px)`;
      el.style.opacity = t.toFixed(3);
    });

    /* ── 4 · LOS HILOS, dibujados de la pieza a su capa ──────────────── */
    if (hilos) {
      const rE = escena.getBoundingClientRect();
      hilos.setAttribute('viewBox', `0 0 ${rE.width} ${rE.height}`);
      hilos.innerHTML = piezas.map((el, i) => {
        const op = +el.style.opacity;
        if (op < 0.06) return '';
        const a = el.getBoundingClientRect();
        const b = placas[HERRAMIENTAS[i].capa].getBoundingClientRect();
        const x1 = a.left + a.width / 2 - rE.left, y1 = a.top + a.height / 2 - rE.top;
        const x2 = b.left + b.width / 2 - rE.left, y2 = b.top + b.height / 2 - rE.top;
        return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}"
                      x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}"
                      stroke="#AC27FF" stroke-width="1"
                      stroke-opacity="${(op * 0.42).toFixed(2)}"/>`;
      }).join('');
    }

    /* ── 5 · el rótulo de la fase y el riel ──────────────────────────── */
    let f = 0;
    for (let i = 0; i < FASES.length; i++) if (p >= FASES[i][0]) f = i;
    if (f !== faseActual) { faseActual = f; if (rotulo) rotulo.textContent = FASES[f][1]; }
    if (riel) riel.style.transform = `scaleX(${p.toFixed(4)})`;
  };

  const paso = () => {
    const r = raiz.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    // Sólo se repinta si de verdad se movió: sin esto se redibujan los hilos
    // sesenta veces por segundo con el dedo quieto, y eso es batería tirada.
    if (Math.abs(p - ultimoP) > 0.0009) { ultimoP = p; pintar(p); }
    requestAnimationFrame(paso);
  };

  if (quieto) {
    // Sin movimiento: se enseña el sistema ABIERTO, que es el estado que
    // explica. Una versión aguada no explicaría nada.
    pintar(0.62);
    if (rotulo) rotulo.textContent = 'EL SISTEMA, DESGLOSADO';
  } else {
    pintar(0);
    paso();
  }
}
