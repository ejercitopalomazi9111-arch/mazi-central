/* ══════════════════════════════════════════════════════════════════════════
   EL MINUTO ANTES · la única parte que sirve para algo
   ──────────────────────────────────────────────────────────────────────────
   Una página que TERMINA planteando el problema del papá y no lo resuelve es
   una landing con mejor guión. La idea es de Syl y tiene razón: lo que separa
   una demostración de un folleto es que la última pantalla funcione.

   ── NO TRAE LOS DATOS, LOS LEE DE LA TABLA ────────────────────────────────
   Los horarios viven en el HTML, en una tabla que se lee perfecto sin
   JavaScript. Esto la MEJORA: la convierte en una respuesta sola en vez de una
   lista de siete. Sin este archivo se pierde la comodidad, nunca la
   información — y hay UNA sola fuente de verdad, así que no puede desfasarse
   de un respaldo.

   ── Y NO SE ANIMA ────────────────────────────────────────────────────────
   Es la única escena de la página sin movimiento, a propósito. Una herramienta
   no necesita animación: necesita contestar rápido. Animar esto sería quitarle
   segundos a lo único que resuelve algo.
   ═════════════════════════════════════════════════════════════════════════ */
(() => {
  const sel   = document.getElementById('cat');
  const caja  = document.getElementById('resultado');
  const tabla = document.getElementById('tabla');
  if(!sel || !caja || !tabla) return;

  const filas = [...tabla.querySelectorAll('tbody tr')];
  const esc = (t) => String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const leer = (tr) => {
    const c = tr.querySelectorAll('td');
    return {
      nombre: tr.querySelector('th').textContent.trim(),
      dia:    c[0].textContent.trim(),
      hora:   c[1].textContent.trim(),
      cancha: c[2].textContent.trim(),
      cambio: tr.dataset.cambio || '',
      sin:    tr.dataset.sin    || '',
    };
  };

  function ficha(d){
    /* El orden no es alfabético ni el de la tabla: es el de la pregunta. Un
       papá pregunta CUÁNDO y luego DÓNDE, y la hora es lo que mira de reojo,
       así que va más grande que lo demás. */
    let h = '<dl class="ficha">'
      + `<div><dt>Día</dt><dd>${esc(d.dia)}</dd></div>`
      + `<div><dt>Hora</dt><dd class="grande">${esc(d.hora)}</dd></div>`
      + `<div class="ancho"><dt>Cancha</dt><dd>${esc(d.cancha)}</dd></div>`
      + '</dl>';
    /* Lo que cambió va SEPARADO y en rojo, no metido entre los datos. Es la
       causa de que alguien llegue a la hora equivocada aunque «ya sabía» a qué
       hora era: el dato viejo que trae en la cabeza sigue pareciendo correcto. */
    if(d.cambio) h += `<p class="cambio">⚠ ${esc(d.cambio)}</p>`;
    return h;
  }

  function pintar(){
    const cual = sel.value;

    if(!cual){                       /* «todas»: se devuelve la tabla entera */
      for(const tr of filas) tr.hidden = false;
      tabla.hidden = false;
      const vieja = caja.querySelector('.ficha, .sinjuego, .cambio');
      if(vieja) caja.querySelectorAll('.ficha, .sinjuego, .cambio').forEach(n => n.remove());
      return;
    }

    const tr = filas.find(f => f.dataset.cat === cual);
    tabla.hidden = true;
    caja.querySelectorAll('.ficha, .sinjuego, .cambio').forEach(n => n.remove());
    if(!tr) return;

    const d = leer(tr);
    /* Si no hay partido se DICE, con el motivo y con cuándo vuelven. Un hueco
       en blanco se lee como «falló», y entonces la persona vuelve a preguntar
       en el chat — que es justo de lo que veníamos huyendo. */
    caja.insertAdjacentHTML('beforeend', d.sin
      ? `<p class="sinjuego">${esc(d.sin)}</p>`
      : ficha(d));
  }

  sel.addEventListener('change', pintar);
  pintar();
})();
