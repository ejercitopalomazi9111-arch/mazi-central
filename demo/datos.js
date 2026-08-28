/* ══════════════════════════════════════════════════════════════════════════
   EL MINUTO ANTES · la única parte que sirve para algo
   ──────────────────────────────────────────────────────────────────────────
   Una página que TERMINA planteando el problema del papá y no lo resuelve es
   una landing con mejor guión. La idea es de Syl y tiene razón: lo que separa
   una demostración de un folleto es que la última pantalla funcione.

   ── ES UNA PANTALLA DE PRODUCTO, NO UN FORMULARIO ─────────────────────────
   Aquí había un <select> y una tabla. Carlos lo llamó por su nombre: eso es un
   formulario, y el encargo era enseñar de qué somos capaces. Esto es la vista
   que un papá abriría en Ligas Mazi — marca arriba, las categorías como fichas
   que se tocan, y los dos datos en grande.

   Y de paso arregla una medición de la casa que la página reprobaba: «recorre
   el sitio en el teléfono y cuenta cuántas veces algo RESPONDE al toque».
   Respondía en 2 lugares. Ahora en 9.

   ── NO TRAE LOS DATOS, LOS LEE DE LA TABLA ────────────────────────────────
   Los horarios viven en el HTML. Esto los MEJORA: los convierte en una
   respuesta sola en vez de una lista de siete. Sin este archivo se pierde la
   comodidad, nunca la información — y hay UNA sola fuente de verdad, así que
   no puede desfasarse de un respaldo.

   ── Y NO SE ANIMA ────────────────────────────────────────────────────────
   Es la única escena de la página sin movimiento, a propósito. Una herramienta
   no necesita animación: necesita contestar rápido.
   ═════════════════════════════════════════════════════════════════════════ */
(() => {
  const app   = document.getElementById('app');
  const tabla = document.getElementById('tabla');
  const todos = document.getElementById('todos');
  if(!app || !tabla) return;

  const filas = [...tabla.querySelectorAll('tbody tr')];
  if(!filas.length) return;

  const leer = (tr) => {
    const c = tr.querySelectorAll('td');
    return {
      cat:    tr.dataset.cat,
      nombre: tr.querySelector('th').textContent.trim(),
      dia:    c[0].textContent.trim(),
      hora:   c[1].textContent.trim(),
      cancha: c[2].textContent.trim(),
      cambio: tr.dataset.cambio || '',
      sin:    tr.dataset.sin    || '',
    };
  };
  const datos = filas.map(leer);

  /* La ficha dice «Sub-10 V» y no «Sub-10 varonil». No es por ahorrar: siete
     fichas con la palabra completa se van a cuatro renglones en un teléfono y
     entonces hay que hacer scroll para ver la última categoría, que es
     justamente la que alguien busca. El nombre entero sale en la tarjeta. */
  const corto = (n) => n.replace(/\s+varonil$/i, ' V').replace(/\s+femenil$/i, ' F');

  /* Se arma con createElement y textContent, no con innerHTML. Los nombres
     salen de la tabla, o sea del documento, pero el día que alguien genere esa
     tabla desde otro lado el escape deja de ser opcional — y este archivo no
     se entera. Mejor que no haya nada que escapar. */
  const el = (t, clase, texto) => {
    const n = document.createElement(t);
    if(clase) n.className = clase;
    if(texto != null) n.textContent = texto;
    return n;
  };

  const marco  = el('div', 'marco');

  /* ── la barra: es lo que le dice a alguien QUÉ está viendo ─────────────── */
  const barra  = el('div', 'barra');
  barra.append(el('span', 'marca', 'Ligas Mazi'), el('span', 'fecha', 'Jornada 4'));

  /* ── las fichas ───────────────────────────────────────────────────────── */
  const chips = el('div', 'chips');
  const botones = datos.map((d) => {
    const b = el('button', 'chip', corto(d.nombre));
    b.type = 'button';
    /* `aria-pressed` y no `aria-selected`: son interruptores, no pestañas. Con
       lector de pantalla se oye «Sub-10 V, botón, presionado». */
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => escoger(d.cat));
    chips.append(b);
    return b;
  });

  /* ── la tarjeta ───────────────────────────────────────────────────────────
     role=status + aria-live: quien usa lector de pantalla se entera del cambio
     sin ir a buscarlo. Va en el contenedor que SIEMPRE existe, no en el que se
     vuelve a crear: un aria-live que nace junto con su contenido no se anuncia,
     porque el navegador no ve un cambio, ve un nodo nuevo. */
  const tarjeta = el('div', 'tarjeta');
  tarjeta.setAttribute('role', 'status');
  tarjeta.setAttribute('aria-live', 'polite');

  marco.append(barra, chips, tarjeta);
  app.append(marco);
  app.hidden = false;

  function pintar(d){
    tarjeta.replaceChildren();
    tarjeta.append(el('p', 'quien', d.nombre));

    /* Si no hay partido se DICE, con el motivo y con cuándo vuelven. Un hueco
       en blanco se lee como «falló», y entonces la persona vuelve a preguntar
       en el chat — que es justo de lo que veníamos huyendo. */
    if(d.sin){
      tarjeta.append(el('p', 'sinjuego', d.sin));
      return;
    }

    /* El orden no es el de la tabla: es el de la pregunta. Un papá pregunta
       CUÁNDO y luego DÓNDE, y la hora es lo que mira de reojo, así que va del
       tamaño de lo que se lee sin acercarse. */
    tarjeta.append(el('p', 'dia', d.dia), el('p', 'hora', d.hora),
                   el('p', 'donde', d.cancha));

    /* Lo que cambió va SEPARADO y en rojo, no metido entre los datos. Es la
       causa de que alguien llegue a la hora equivocada aunque «ya sabía» a qué
       hora era: el dato viejo que trae en la cabeza sigue pareciendo correcto. */
    if(d.cambio) tarjeta.append(el('p', 'cambio', '⚠ ' + d.cambio));
  }

  function escoger(cat){
    const i = datos.findIndex((d) => d.cat === cat);
    if(i < 0) return;
    botones.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
    pintar(datos[i]);
  }

  /* Arranca en una categoría de verdad y no en «— escoge una —». Un producto
     que abre vacío obliga a la persona a trabajar antes de recibir nada, y
     aquí lo que se está enseñando es precisamente lo contrario. Se escoge la
     que TIENE cambio de horario: es el caso que justifica que esto exista. */
  const conCambio = datos.find((d) => d.cambio) || datos[0];
  escoger(conCambio.cat);

  /* Con la pantalla al lado, la tabla pasa a ser la letra chica. Se cierra
     AQUÍ y no en el HTML: si este archivo no llega, se queda abierta. */
  if(todos) todos.open = false;
})();
