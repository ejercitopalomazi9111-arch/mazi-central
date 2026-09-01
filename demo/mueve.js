/* ══════════════════════════════════════════════════════════════════════════
   EL MINUTO ANTES · el motor
   ──────────────────────────────────────────────────────────────────────────
   Hace DOS cosas y ninguna más:

   1 · Quita `quieto` del <html>. Ése es el interruptor de todo el movimiento.
       Si este archivo no carga —red mala, JS apagado, un error antes— la clase
       se queda puesta, `mueve.css` no aplica nada, y la página se ve completa
       y quieta. No a medias: completa.

   2 · El respaldo para navegadores SIN `animation-timeline`. Donde sí la hay,
       el movimiento lo lleva el navegador solo y este archivo ya no vuelve a
       hacer nada — ni un observador, ni un fotograma.

   Sin librerías, como toda la casa. Son sesenta líneas.
   ═════════════════════════════════════════════════════════════════════════ */
(() => {
  const raiz = document.documentElement;

  /* Antes de nada: si pidieron menos movimiento, ni se enciende. Se queda
     `quieto` puesto y no se registra ni un observador. */
  const menos = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(menos.matches) return;

  raiz.classList.remove('quieto');

  /* ¿El navegador lleva el scroll él solo? Se pregunta por la capacidad, no
     por el nombre del navegador. */
  const solo = CSS.supports('animation-timeline: view()')
            && CSS.supports('animation-timeline: scroll()');
  if(solo) return;                     /* ya está: lo hace el CSS */

  /* ── RESPALDO ──────────────────────────────────────────────────────────
     UN observador compartido para todos los bloques, no uno por bloque. Con
     veinte bloques serían veinte observadores haciendo el mismo trabajo. */
  const bloques = document.querySelectorAll('[data-mueve="mascara"]');
  if('IntersectionObserver' in window){
    const ojo = new IntersectionObserver((entradas) => {
      for(const e of entradas){
        if(!e.isIntersecting) continue;
        e.target.classList.add('dentro');
        /* Se deja de mirar en cuanto se destapó. Un bloque ya revelado no
           tiene nada más que decir, y seguir observándolo es trabajo por
           fotograma a cambio de nada. */
        ojo.unobserve(e.target);
      }
    }, { rootMargin:'0px 0px -12% 0px', threshold:0.01 });
    for(const b of bloques) ojo.observe(b);
  } else {
    /* Sin observador tampoco se deja a medias: se destapa todo de una. */
    for(const b of bloques) b.classList.add('dentro');
  }

  /* El balón, a mano. Un solo requestAnimationFrame, y sólo cuando el scroll
     se movió de verdad: escuchar `scroll` y calcular en cada evento es como se
     llega a los tirones. */
  const balon = document.querySelector('[data-balon]');
  const linea = document.querySelector('[data-linea]');

  let pedido = false;
  /* «Volver arriba» se esconde mientras estás arriba, porque ahí estorba y no
     sirve. Va en el MISMO ciclo que el balón a propósito: dos escuchas de
     scroll haciendo cuentas por separado es como se llega a los tirones, y
     este cálculo ya lo teníamos hecho. */
  const arriba = document.querySelector('[data-arriba]');
  if(arriba) arriba.classList.add('lejos');

  function pintar(){
    pedido = false;
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const t = alto > 0 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;

    if(arriba) arriba.classList.toggle('lejos', window.scrollY < window.innerHeight * 0.9);
    if(!balon){ return; }
    /* Los mismos números que el @keyframes de mueve.css, a propósito: si
       alguien cambia el recorrido allá y no acá, el respaldo se ve distinto en
       los navegadores viejos y nadie lo nota hasta que lo abre en uno. */
    const y = 38 + t * 40;             /* vh */
    balon.style.transform = `translateY(${y}vh) rotate(${t * 1080}deg)`;
    if(linea) linea.style.opacity = String(0.20 + t * 0.26);
  }
  function alMover(){
    if(pedido) return;
    pedido = true;
    requestAnimationFrame(pintar);
  }
  addEventListener('scroll', alMover, { passive:true });
  addEventListener('resize', alMover, { passive:true });
  pintar();
})();
