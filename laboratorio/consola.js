/* ══════════════════════════════════════════════════════════════════════════
   EL BANCO DE PRUEBAS · la consola
   ──────────────────────────────────────────────────────────────────────────
   Apartados 120 (modo depuración), 121 (monitor) y 122 (probador de anchos).

   ES LO QUE CONVIERTE UN CATÁLOGO EN UNA HERRAMIENTA. Hasta aquí la página se
   miraba; de aquí en adelante se opera. Carlos lo dijo así: «aún no le llegan
   a los talones a algo ÚTIL». Tenía razón: enseñar componentes es un folleto
   con más pasos. Poder medirlos mientras corren es otra cosa.

   ── TRES DECISIONES ─────────────────────────────────────────────────────
   1 · NACE APAGADA, y no es pereza: el apartado 121 lo pide («no debe estar
       activo permanentemente en producción») y además un monitor encendido
       siempre cuesta fotogramas justo cuando se están midiendo fotogramas.
       El instrumento alterando lo que mide.

   2 · SE ENGANCHA AL CICLO DE `lab.js` y sólo mientras está abierta. Si
       pidiera su propio `requestAnimationFrame`, el tablero de esta misma
       página tendría que decir «2 ciclos» — y hay una prueba que lo
       comprobaría y se pondría roja. Que el propio banco te obligue a
       cumplir lo que presume es exactamente para lo que se construyó.

   3 · EL PROBADOR DE ANCHOS USA UN MARCO DE VERDAD. Encoger un contenedor no
       cambia las media queries: enseñaría un diseño que en ese teléfono no
       existe, que es peor que no probar. Un <iframe> sí tiene su propio
       viewport y las consultas responden como en el aparato.
   ═════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const raiz = document.documentElement;

  /* Dentro del marco no hay consola: ni el botón, ni el atajo, ni el probador
     abriéndose dentro de sí mismo hasta el infinito. */
  if(new URLSearchParams(location.search).has('marco')){
    raiz.setAttribute('data-marco', '');
    return;
  }

  const $ = (s) => document.querySelector(s);
  const bt      = $('[data-consola-bt]');
  const consola = $('[data-consola]');
  if(!bt || !consola) return;

  const salidas = {
    fps:     $('[data-c-fps]'),
    nodos:   $('[data-c-nodos]'),
    ventana: $('[data-c-ventana]'),
    cursor:  $('[data-c-cursor]'),
    scroll:  $('[data-c-scroll]'),
    anim:    $('[data-c-anim]'),
  };

  let abierta = false, raton = { x:0, y:0 };
  let ultimo = 0, acum = 0, cuadros = 0;

  /* El ciclo se apunta al de `lab.js` — `window.bancoSumar` — y devuelve
     `false` en cuanto la consola se cierra, que es como una tarea se da de
     baja. Cerrada, no cuesta ni un fotograma. */
  function latido(t){
    if(!abierta) return false;
    const dt = ultimo ? t - ultimo : 16.7;
    ultimo = t;
    acum += dt; cuadros++;
    if(acum >= 400){
      salidas.fps.textContent = Math.round(1000 / (acum / cuadros));
      acum = 0; cuadros = 0;
      /* Los nodos se cuentan cada 400 ms y no cada fotograma: recorrer el DOM
         entero 60 veces por segundo para enseñar un número es justo el tipo de
         monitor que hace lento lo que estaba midiendo. */
      salidas.nodos.textContent = document.getElementsByTagName('*').length;
      salidas.anim.textContent = document.getAnimations
        ? document.getAnimations().filter(a => a.playState === 'running').length
        : '—';
    }
    salidas.ventana.textContent = `${innerWidth}×${innerHeight}`;
    salidas.cursor.textContent  = `${raton.x}, ${raton.y}`;
    const alto = document.documentElement.scrollHeight - innerHeight;
    salidas.scroll.textContent = (alto > 0 ? Math.round(scrollY / alto * 100) : 0) + '%';
    return true;
  }

  function abrir(si){
    abierta = si;
    consola.dataset.abierta = si ? 'si' : 'no';
    bt.setAttribute('aria-expanded', String(si));
    if(si){ ultimo = 0; acum = 0; cuadros = 0;
            if(window.bancoSumar) window.bancoSumar(latido); }
  }
  bt.addEventListener('click', () => abrir(!abierta));

  addEventListener('pointermove', (e) => {
    raton = { x:Math.round(e.clientX), y:Math.round(e.clientY) };
  }, { passive:true });

  /* Atajo de teclado (apartado 70). Con la tecla suelta y sin modificadores,
     pero SÓLO si no se está escribiendo: un atajo de una letra que se dispara
     dentro de un campo de texto es un campo que no se puede usar. */
  addEventListener('keydown', (e) => {
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    const d = document.activeElement;
    if(d && (d.tagName === 'INPUT' || d.tagName === 'TEXTAREA' || d.isContentEditable)) return;
    if(e.key === 'd' || e.key === 'D'){ e.preventDefault(); abrir(!abierta); }
  });

  /* ── modo cajas ──────────────────────────────────────────────────────── */
  const btCajas = $('[data-cajas]');
  if(btCajas) btCajas.addEventListener('click', () => {
    const puesto = raiz.hasAttribute('data-cajas');
    raiz.toggleAttribute('data-cajas', !puesto);
    btCajas.setAttribute('aria-pressed', String(!puesto));
  });

  /* ── el probador de anchos ───────────────────────────────────────────── */
  const caja  = $('[data-probador-caja]');
  const marco = $('[data-marco]');
  const btPro = $('[data-probador]');
  if(caja && marco && btPro){
    let ancho = 768, quienAbrio = null;

    function encuadrar(){
      marco.style.width  = ancho + 'px';
      /* El alto se pide en píxeles de CSS del marco, no del contenedor: si el
         marco mide 375 de ancho hay que darle un alto de teléfono, o las
         media queries de altura mienten. */
      marco.style.height = Math.round(ancho * (ancho < 500 ? 2.1 : 0.62)) + 'px';

      /* Se ESCALA para que quepa, y se dice a qué escala. Enseñar 1920 px
         recortados es enseñar otra cosa; enseñarlos al 40 % y no decirlo, un
         engaño distinto. */
      const hueco = caja.querySelector('.probador-lienzo').clientWidth - 8;
      const escala = Math.min(1, hueco / ancho);
      marco.style.transform = `scale(${escala})`;
      caja.querySelector('[data-escala]').textContent = Math.round(escala * 100) + '%';
      caja.querySelector('[data-ancho-actual]').textContent = ancho;
      for(const b of caja.querySelectorAll('[data-ancho]'))
        b.setAttribute('aria-pressed', String(Number(b.dataset.ancho) === ancho));
    }

    const cerrar = () => {
      caja.dataset.abierto = 'no'; caja.hidden = true;
      marco.removeAttribute('src');      /* el marco se descarga al cerrar:
          dejarlo vivo detrás mantiene una copia de la página animando */
      btPro.setAttribute('aria-pressed', 'false');
      if(quienAbrio) quienAbrio.focus();
    };

    btPro.addEventListener('click', () => {
      quienAbrio = btPro;
      caja.hidden = false; caja.dataset.abierto = 'si';
      btPro.setAttribute('aria-pressed', 'true');
      marco.src = location.pathname + '?marco=1';
      encuadrar();
      caja.querySelector('[data-cerrar-probador]').focus();
    });
    for(const b of caja.querySelectorAll('[data-ancho]'))
      b.addEventListener('click', () => { ancho = Number(b.dataset.ancho); encuadrar(); });
    caja.querySelector('[data-cerrar-probador]').addEventListener('click', cerrar);
    addEventListener('keydown', (e) => { if(e.key === 'Escape' && caja.dataset.abierto === 'si') cerrar(); });
    addEventListener('resize', () => { if(caja.dataset.abierto === 'si') encuadrar(); }, { passive:true });
  }
})();
