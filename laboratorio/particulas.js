/* ══════════════════════════════════════════════════════════════════════════
   EL BANCO DE PRUEBAS · las partículas
   ──────────────────────────────────────────────────────────────────────────
   Cuatro comportamientos sobre UN motor: orbital, magnético, repelente y
   conectado. No son cuatro sistemas: es el mismo sistema con una fuerza
   distinta, que es lo que hace que se pueda cambiar de uno a otro sin cortes.

   TRES DECISIONES QUE SON LA DIFERENCIA ENTRE ESTO Y UN FONDO BONITO:

   1 · SE ENGANCHA AL CICLO DE `lab.js`. No pide su propio
       `requestAnimationFrame`. Dos ciclos en la misma página compiten por el
       mismo fotograma y ninguno de los dos llega completo.

   2 · SE DETIENE CUANDO NO ESTÁ A LA VISTA. Animar un lienzo que nadie está
       mirando es gastar batería de alguien a cambio de nada, y es de las cosas
       que no se notan revisando en una computadora de escritorio enchufada.

   3 · `devicePixelRatio` TOPADO A 1.5. En un teléfono con pantalla de 3× se
       pintarían nueve veces más píxeles por fotograma para una diferencia que
       nadie ve en partículas de 2 px de radio.

   Y si este archivo no llega, no pasa nada: el lienzo se queda en blanco y el
   texto de al lado ya explica los cuatro comportamientos. Por eso el lienzo
   lleva su descripción escrita y no es información de nadie.
   ═════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const lienzo = document.querySelector('[data-lienzo]');
  if(!lienzo || !window.bancoSumar) return;
  const ctx = lienzo.getContext('2d', { alpha:true });
  if(!ctx) return;

  const menos = matchMedia('(prefers-reduced-motion: reduce)');
  const elCuenta = document.querySelector('[data-cuenta]');
  const elFps    = document.querySelector('[data-fps]');
  const elModo   = document.querySelector('[data-modo-lectura]');

  const TOPE_DPR = 1.5;
  const CERCA = 120;          /* la distancia de la línea, del encargo */
  let modo = 'orbital';
  let an = 0, al = 0, dpr = 1;
  let particulas = [];
  let raton = null;
  let visible = false, vivo = false;

  /* Menos partículas en pantalla chica: la misma cantidad en un teléfono se
     ve apelmazada y además cuesta el doble en relación a su procesador. */
  const cuantas = () => Math.min(90, Math.max(28, Math.round(an / 14)));

  function medir(){
    dpr = Math.min(devicePixelRatio || 1, TOPE_DPR);
    const r = lienzo.getBoundingClientRect();
    an = Math.max(1, Math.round(r.width));
    al = Math.max(1, Math.round(r.height));
    lienzo.width  = Math.round(an * dpr);
    lienzo.height = Math.round(al * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function sembrar(){
    const n = cuantas();
    particulas = Array.from({ length:n }, (_, i) => {
      const ang = (i / n) * Math.PI * 2;
      const radio = 40 + (i % 5) * 22;
      return {
        x: an / 2 + Math.cos(ang) * radio,
        y: al / 2 + Math.sin(ang) * radio,
        vx: 0, vy: 0,
        ang, radio,
        /* Cada una gira a su ritmo: si todas llevaran la misma velocidad
           angular, el conjunto se vería como una rueda sólida en vez de como
           un sistema. */
        giro: 0.0016 + (i % 7) * 0.00035,
        r: 1.3 + (i % 4) * 0.5,
      };
    });
    if(elCuenta) elCuenta.textContent = n;
  }

  /* ── LOS CUATRO COMPORTAMIENTOS ─────────────────────────────────────────
     `dt` en milisegundos y las fuerzas escaladas por él: si el movimiento se
     calculara por fotograma, el sistema iría al doble de rápido en una
     pantalla de 120 Hz que en una de 60. Es el error clásico de las
     animaciones a mano y sólo se nota cuando alguien lo abre en otro aparato. */
  function paso(dt){
    const k = Math.min(dt, 34) / 16.7;      /* topado: si la pestaña estuvo
        dormida, dt llega enorme y sin tope todo saldría disparado de golpe */
    const cx = an / 2, cy = al / 2;

    for(const p of particulas){
      if(modo === 'orbital'){
        p.ang += p.giro * k * 16.7;
        p.x = cx + Math.cos(p.ang) * p.radio * (an / 420);
        p.y = cy + Math.sin(p.ang) * p.radio * 0.62;
        continue;
      }

      if(modo === 'magnetico' || modo === 'repelente'){
        if(raton){
          const dx = raton.x - p.x, dy = raton.y - p.y;
          const d = Math.max(12, Math.hypot(dx, dy));
          const signo = modo === 'magnetico' ? 1 : -1;
          const f = signo * (2600 / (d * d));
          p.vx += (dx / d) * f * k;
          p.vy += (dy / d) * f * k;
        }
        /* Un resorte flojo hacia su sitio de origen. Sin él, al quitar el
           cursor las partículas se quedan donde las dejaste y el sistema se
           degrada a un montón de puntos amontonados. */
        const ox = cx + Math.cos(p.ang) * p.radio * (an / 420);
        const oy = cy + Math.sin(p.ang) * p.radio * 0.62;
        p.vx += (ox - p.x) * 0.0035 * k;
        p.vy += (oy - p.y) * 0.0035 * k;
      }else{
        /* conectado: deriva lenta y constante */
        if(!p.libre){ p.libre = true; p.vx = (Math.random()-.5)*0.6; p.vy = (Math.random()-.5)*0.6; }
      }

      p.vx *= 0.94; p.vy *= 0.94;            /* rozamiento */
      p.x += p.vx * k; p.y += p.vy * k;

      if(p.x < 0 || p.x > an) p.vx *= -1;
      if(p.y < 0 || p.y > al) p.vy *= -1;
      p.x = Math.min(an, Math.max(0, p.x));
      p.y = Math.min(al, Math.max(0, p.y));
    }
  }

  const color = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  let tintaSenal = '#AC27FF', tintaMedida = '#3BE0AE';
  const releerColores = () => {
    tintaSenal  = color('--senal')  || tintaSenal;
    tintaMedida = color('--medida') || tintaMedida;
  };

  function pintar(){
    ctx.clearRect(0, 0, an, al);

    if(modo === 'conectado'){
      /* Las líneas primero para que los puntos queden encima. Y el bucle es
         O(n²) sobre 90 partículas: 4005 parejas por fotograma, que es barato.
         Con 400 no lo sería, y ésa es la razón del tope de arriba. */
      ctx.lineWidth = 1;
      for(let i = 0; i < particulas.length; i++){
        for(let j = i + 1; j < particulas.length; j++){
          const a = particulas[i], b = particulas[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if(d > CERCA) continue;
          ctx.globalAlpha = (1 - d / CERCA) * 0.5;
          ctx.strokeStyle = tintaSenal;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = modo === 'repelente' ? tintaMedida : tintaSenal;
    for(const p of particulas){
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ── EL CONTADOR DE FOTOGRAMAS ──────────────────────────────────────────
     No es un adorno: es el punto del banco. Si una decisión de dibujo cuesta
     fotogramas, aquí se ve mientras pasa, y no en una queja tres semanas
     después de que la página ya está publicada. */
  let ultimo = 0, acumFps = 0, cuadros = 0;

  function marco(t){
    if(!visible){ vivo = false; return false; }
    const dt = ultimo ? t - ultimo : 16.7;
    ultimo = t;
    paso(dt);
    pintar();
    acumFps += dt; cuadros++;
    if(acumFps >= 500){
      if(elFps) elFps.textContent = Math.round(1000 / (acumFps / cuadros));
      acumFps = 0; cuadros = 0;
    }
    return true;
  }
  function arrancar(){
    if(vivo || !visible) return;
    vivo = true; ultimo = 0;
    window.bancoSumar(marco);
  }

  /* Con movimiento reducido se dibuja UNA vez y se queda quieto: el sistema se
     ve completo, nada más que sin moverse. Apagarlo del todo dejaría un
     rectángulo vacío, que es peor que quieto. */
  if(menos.matches){
    medir(); sembrar(); releerColores(); pintar();
  }else{
    medir(); sembrar(); releerColores();
    if('IntersectionObserver' in window){
      new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        if(visible) arrancar();
      }, { threshold:.05 }).observe(lienzo);
    }else{ visible = true; arrancar(); }

    /* Una sola escucha, y sólo mientras el puntero está sobre el lienzo: los
       modos magnético y repelente son lo único que la necesita. */
    lienzo.addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect();
      raton = { x:e.clientX - r.left, y:e.clientY - r.top };
    }, { passive:true });
    lienzo.addEventListener('pointerleave', () => { raton = null; }, { passive:true });

    let tiempoMedida;
    addEventListener('resize', () => {
      clearTimeout(tiempoMedida);
      /* Se espera a que deje de moverse: redimensionar dispara decenas de
         eventos y volver a sembrar en cada uno tira el sistema entero. */
      tiempoMedida = setTimeout(() => { medir(); sembrar(); }, 160);
    }, { passive:true });
  }

  for(const b of document.querySelectorAll('[data-modo]')){
    b.addEventListener('click', () => {
      modo = b.dataset.modo;
      for(const o of document.querySelectorAll('[data-modo]'))
        o.setAttribute('aria-pressed', String(o === b));
      if(elModo) elModo.textContent = modo;
      for(const p of particulas) p.libre = false;
      releerColores();
      if(menos.matches){ paso(16.7); pintar(); }
    });
  }

  /* Al cambiar de tema hay que releer los colores: están en variables CSS y
     el lienzo no las hereda solo. Sin esto, el modo claro pinta partículas del
     color del modo oscuro y nadie entiende por qué se ven apagadas. */
  new MutationObserver(releerColores).observe(document.documentElement,
    { attributes:true, attributeFilter:['data-tema'] });
})();
