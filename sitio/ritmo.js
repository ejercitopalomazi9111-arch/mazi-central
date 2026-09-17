/* ritmo.js — EL RITMO DEL SCROLL
 * ===========================================================================
 * EL REPORTE DE CARLOS, textual: «si bajo rápido no carga en el momento en el
 * que bajo… el chiste es que carguen las opciones al mismo ritmo que el
 * scroll, porque si no, se ve de la verga. Básate más que nada en teléfono,
 * porque es donde la gente más suele bajar rápido.»
 *
 * MEDIDO ANTES DE TOCAR NADA, a 390×844, bajando de 800 en 800 px cada 110 ms
 * (≈7 000 px/s, que es un fling normal de pulgar): **202 elementos quedaron
 * invisibles o a media opacidad ESTANDO YA DENTRO DE LA PANTALLA.** No era
 * percepción. Era medible.
 *
 * ── LA CAUSA, y no es la que parece ────────────────────────────────────────
 * No es que el umbral esté mal puesto. El umbral estaba bien: `rootMargin`
 * de −12 % dispara cuando la pieza lleva un 12 % adentro, que es razonable.
 *
 * El problema son DOS latencias que se suman y que nadie mira:
 *
 *   1. **La transición tarda.** Las tarjetas revelan su contenido con
 *      `transition .45s` MÁS `transition-delay` de hasta .23s = 680 ms para
 *      quedar legibles. A 7 000 px/s, en 680 ms te moviste **4 760 px**: la
 *      tarjeta ya salió de la pantalla por arriba antes de terminar de
 *      aparecer. Lo que ve el visitante es una tarjeta en blanco que pasa.
 *
 *   2. **IntersectionObserver no corre en el cuadro.** Sus avisos se entregan
 *      cuando el navegador puede, y durante un fling en un teléfono eso es
 *      «más tarde». Se le pide que marque la entrada de algo y contesta
 *      después de que ya pasó.
 *
 * ── EL ARREGLO ────────────────────────────────────────────────────────────
 * Dos piezas, y ninguna secuestra el scroll (regla 3 de la casa: el scroll es
 * una perilla, no un carril).
 *
 *   A. **La prisa.** Se mide la velocidad real del scroll y se publica como
 *      `--ritmo` (1 = vas tranquilo, ~0 = vas en caída libre). Todas las
 *      duraciones y los retardos del sitio se multiplican por ella. Bajando
 *      rápido las animaciones no se «aceleran»: **desaparecen**, y el
 *      contenido simplemente ESTÁ. Bajando tranquilo se ve la coreografía
 *      completa, que es para lo que se hizo.
 *
 *      Sube de golpe y baja despacio, a propósito: que la calma vuelva de
 *      inmediato haría que una pieza empiece instantánea y la de al lado se
 *      tome medio segundo — y eso se lee como un defecto, no como un ritmo.
 *
 *   B. **Revelar por POSICIÓN, no por aviso.** `.revela` ya no depende de
 *      IntersectionObserver: se barre en el mismo `requestAnimationFrame` que
 *      mide la velocidad, comparando contra una línea al 88 % de la pantalla.
 *      Ése es el «pequeño límite» que pidió Carlos, y corre en el cuadro, así
 *      que no puede llegar tarde.
 *
 *      Y cada pieza se SELLA con el ritmo que había cuando le tocó entrar.
 *      Esto no es un detalle: si se dejara leer la variable global, una pieza
 *      a media transición cambiaría de duración en pleno vuelo cuando el dedo
 *      frena, y el navegador reinicia el tiempo — se ve como un tirón. Sellada
 *      al entrar, cada una termina como empezó.
 *
 * SI ESTE ARCHIVO NO CARGA el sitio se ve COMPLETO: `.revela` sólo se esconde
 * dentro de `prefers-reduced-motion: no-preference`, y aun así hay un seguro
 * de 1.2 s abajo que lo destapa todo. Una animación jamás puede ser la razón
 * de que no se vea el contenido.
 * ===========================================================================*/
(() => {
  'use strict';

  const raiz = document.documentElement;
  const todas = () => document.querySelectorAll('.revela');

  /* Se anuncia ANTES de cualquier otra cosa. El guion de arriba deja un seguro
     a 1.4 s que destapa la página entera si nadie tomó el mando, y ese seguro
     pregunta justo por esta marca. Si se pusiera al final y algo tronara en
     medio, quedaríamos con la mitad de las piezas escondidas para siempre. */
  raiz.dataset.ritmo = 'vivo';

  /* Si el aparato pide menos movimiento, no hay ritmo que medir: todo visible
     y nos vamos. Sin esto la página se queda escondida para quien justamente
     no puede con el movimiento. */
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    todas().forEach(n => n.classList.add('dentro'));
    return;
  }

  /* EL SEGURO. Si algo de aquí abajo truena, a 1.2 s se destapa todo igual.
     Se limpia solo en cuanto el barrido normal hace su primera pasada. */
  let seguroPuesto = setTimeout(() => todas().forEach(n => n.classList.add('dentro')), 1200);

  /* ── 1 · LA PRISA ──────────────────────────────────────────────────────
     Los dos números salieron de medir, no de gusto:
       · por debajo de 700 px/s el dedo va leyendo — se ve la coreografía;
       · por encima de 2 400 px/s es un fling de verdad — ya no ves nada,
         así que lo único que importa es que el contenido ESTÉ.
     Entre los dos se mezcla, para que no haya un salto visible justo en la
     frontera. */
  const CALMA  = 700;
  const RAPIDO = 2400;
  /* Cuánto se encoge una duración yendo a toda velocidad. No es 0 a propósito:
     un 6 % (≈33 ms sobre .55 s) deja un parpadeo de un cuadro que suaviza el
     borde. A 0 exacto el contenido aparece «cortado» y se nota más. */
  const PISO   = 0.06;

  let yAnt = window.scrollY;
  let tAnt = performance.now();
  let vel  = 0;      // px/s, suavizada
  let prisa = 0;     // 0..1
  let ritmo = 1;     // lo que se publica

  /* ── 2 · REVELAR POR POSICIÓN ──────────────────────────────────────────
     La lista se guarda y se va vaciando: recorrer el DOM entero sesenta veces
     por segundo es exactamente el tipo de cosa que hace que un teléfono se
     caliente, y aquí no hace falta — una pieza revelada no se vuelve a
     esconder (PLAN.md §8 regla 2: nada se re-anima al volver a pasar). */
  const UMBRAL = 0.88;
  let pendientes = [...todas()].filter(n => !n.classList.contains('dentro'));

  /* EL ESCALONADO. Un contenedor marcado `data-escalona` reparte el orden de
     entrada entre sus hijos: el CSS lee `--i` para calcular el retardo.
     Se numera UNA vez al montar y no en cada barrido — recorrer hijos sesenta
     veces por segundo es trabajo que no cambia de resultado. */
  const numerar = () => {
    for (const cont of document.querySelectorAll('[data-escalona]')) {
      let i = 0;
      for (const hijo of cont.children) hijo.style.setProperty('--i', i++);
    }
  };
  numerar();

  const sella = (el, r) => {
    /* El ritmo se congela EN la pieza. Ver el comentario de arriba: sin esto,
       frenar el dedo a media transición reinicia el tiempo y se ve un tirón. */
    el.style.setProperty('--ritmo', r.toFixed(3));
    el.classList.add('dentro');
  };

  const barrer = (r) => {
    if (!pendientes.length) return;
    const linea = window.innerHeight * UMBRAL;
    let quedan = null;
    for (const el of pendientes) {
      if (el.getBoundingClientRect().top < linea) sella(el, r);
      else (quedan || (quedan = [])).push(el);
    }
    pendientes = quedan || [];
  };

  /* La PRIMERA pasada es instantánea y no es capricho: si alguien llega con un
     enlace a #contacto, o recarga a media página, todo lo que quedó ARRIBA de
     la pantalla nunca se vio entrar. Animarlo sería animar algo que el
     visitante ya se perdió. */
  barrer(0);
  clearTimeout(seguroPuesto); seguroPuesto = null;

  /* ── 3 · EL PULSO ─────────────────────────────────────────────────────── */
  const paso = (ahora) => {
    const dt = ahora - tAnt;
    /* Se mide cada ~8 ms y no cada cuadro: a 120 Hz el delta es tan chico que
       el ruido del redondeo de `scrollY` se convierte en velocidad inventada. */
    if (dt >= 8) {
      const y = window.scrollY;
      const v = Math.abs(y - yAnt) / (dt / 1000);
      /* Media móvil: una sola lectura salta demasiado y haría parpadear el
         ritmo entre rápido y lento con el dedo a velocidad constante. */
      vel += (v - vel) * 0.35;
      yAnt = y; tAnt = ahora;

      const quiere = vel <= CALMA ? 0
                   : Math.min(1, (vel - CALMA) / (RAPIDO - CALMA));
      /* Sube de golpe, baja despacio. Al soltar el dedo el scroll sigue
         corriendo por inercia; si la calma volviera de inmediato, las piezas
         que entran durante la inercia se tomarían medio segundo cada una
         mientras todavía vuelan. */
      prisa = quiere > prisa ? quiere : prisa + (quiere - prisa) * 0.10;

      const r = 1 - prisa * (1 - PISO);
      /* Sólo se escribe cuando de verdad cambió: tocar una custom property
         invalida estilo en todo el árbol, y hacerlo sesenta veces por segundo
         con el dedo quieto es batería tirada. */
      if (Math.abs(r - ritmo) > 0.004) {
        ritmo = r;
        raiz.style.setProperty('--ritmo', r.toFixed(3));
      }
      /* La clase es para lo que no se puede expresar multiplicando una
         duración: desplazamientos, desenfoques y escalas que a toda velocidad
         estorban más de lo que aportan. */
      raiz.classList.toggle('prisa', prisa > 0.5);

      barrer(r);
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);

  /* ── 4 · LO QUE LLEGA TARDE ────────────────────────────────────────────
     Imágenes, tipografías y los módulos 3D cambian el alto de la página
     después de cargar. Una pieza que estaba abajo de la línea puede quedar
     arriba sin que nadie haya hecho scroll, y sin esto se quedaría escondida
     para siempre. */
  addEventListener('load', () => barrer(0), { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => barrer(0)).catch(() => {});
  }
  /* Y si alguien agrega `.revela` después (los módulos montan DOM), se recensa
     al cambiar de tamaño y al volver a la pestaña — los dos momentos en los
     que el acomodo ya se asentó. */
  const recensar = () => {
    const nuevas = [...todas()].filter(n => !n.classList.contains('dentro'));
    if (nuevas.length !== pendientes.length) pendientes = nuevas;
    barrer(ritmo);
  };
  addEventListener('resize', recensar, { passive: true });
  addEventListener('pageshow', recensar);
})();
