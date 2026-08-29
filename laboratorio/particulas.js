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
  /* ⚠ TRES GUARDAS QUE SALEN DE UN DEFECTO REPORTADO: Carlos dijo que en
     teléfono «magnético, repelente y conectado funcionan fatal: explotan y
     luego se quedan completamente estáticos en posición 0».

     Las dos mitades del síntoma tienen causas distintas y las dos hay que
     taparlas:

     · EXPLOTAN — la fuerza es 2600/d², y con `d` chico eso se dispara. Basta
       que dos queden casi encima (pasa al sembrar, y ahora también al
       fundirse) para que salgan lanzadas. Ahora la velocidad tiene TOPE: por
       muy fuerte que sea el tirón, nada se mueve más de lo que se puede
       seguir con el ojo.
     · SE QUEDAN EN CERO — si el lienzo mide 0 de ancho, el recorte
       `min(an, max(0, x))` deja TODO en 0 y ya no vuelve. Y mide 0 más veces
       de las que uno cree en un teléfono: la barra del navegador que aparece
       y desaparece dispara `resize`, y entre medida y medida hay fotogramas
       donde el rectángulo todavía no está. Ahora si no hay tamaño no se pisa
       nada: se sale y se vuelve a medir. */
  const V_MAX = 3.2;
  function paso(dt){
    if(an < 8 || al < 8){ medir(); return; }
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
      /* El tope va sobre la MAGNITUD, no sobre cada eje por separado: topar
         los ejes de uno en uno deforma la dirección y las manda en diagonal. */
      const v = Math.hypot(p.vx, p.vy);
      if(v > V_MAX){ p.vx = p.vx / v * V_MAX; p.vy = p.vy / v * V_MAX; }
      p.x += p.vx * k; p.y += p.vy * k;

      if(p.x < 0 || p.x > an) p.vx *= -1;
      if(p.y < 0 || p.y > al) p.vy *= -1;
      p.x = Math.min(an, Math.max(0, p.x));
      p.y = Math.min(al, Math.max(0, p.y));
    }

    fundir();
  }

  /* ══ QUE NO SE ENCIMEN ═══════════════════════════════════════════════════
     Carlos, y tenía toda la razón: «tu orbital se lleva un 6, pero a veces las
     partículas se enciman entre sí, eso está mal; dos partículas no deben
     fusionarse ni encimarse si no es la intención, ponles un poco de física
     para que si chocan exploten y se unan en una un poco más grande».

     Dos puntos que se atraviesan delatan que no hay sistema: son dos dibujos
     en la misma capa, no dos cosas en un espacio. Así que ahora sí chocan, y
     al chocar se FUNDEN — con la masa conservada, que es lo que hace que se
     vea a propósito y no como un error:

       · el radio nuevo sale de sumar ÁREAS (r = √(r₁²+r₂²)), no radios. Si se
         sumaran radios, dos chicas darían una absurdamente grande y se vería
         como un fallo;
       · la velocidad nueva es el promedio pesado por área — la cantidad de
         movimiento se conserva, así que la fusión no acelera ni frena el
         sistema entero;
       · y hay un TOPE de radio. Sin él, en un minuto queda una sola bola
         gigante y el sistema se acaba solo. Al llegar al tope se parte en dos,
         que además le devuelve vida al lienzo.

     El bucle es O(n²) sobre 90 partículas: 4 005 parejas por fotograma, que en
     un teléfono es barato. Con 400 no lo sería, y por eso el conteo está
     topado arriba. */
  const R_MAX = 7;
  function fundir(){
    for(let i = 0; i < particulas.length; i++){
      const a = particulas[i];
      for(let j = i + 1; j < particulas.length; j++){
        const b = particulas[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if(d >= a.r + b.r) continue;

        const areaA = a.r * a.r, areaB = b.r * b.r;
        const nuevo = Math.sqrt(areaA + areaB);
        if(nuevo > R_MAX){
          /* Demasiado grande: en vez de crecer, se separan de verdad. Se las
             empuja hasta dejar de tocarse y se invierte la componente que las
             acercaba, que es un rebote elástico simple. */
          const nx = dx / (d || 1), ny = dy / (d || 1);
          const encaje = (a.r + b.r - d) / 2 + 0.1;
          a.x -= nx * encaje; a.y -= ny * encaje;
          b.x += nx * encaje; b.y += ny * encaje;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if(rel < 0){ a.vx += rel * nx; a.vy += rel * ny; b.vx -= rel * nx; b.vy -= rel * ny; }
          continue;
        }

        const total = areaA + areaB;
        a.x = (a.x * areaA + b.x * areaB) / total;
        a.y = (a.y * areaA + b.y * areaB) / total;
        a.vx = (a.vx * areaA + b.vx * areaB) / total;
        a.vy = (a.vy * areaA + b.vy * areaB) / total;
        a.r = nuevo;
        /* Se queda con el sitio de origen de la más grande: si heredara el de
           la chica, el resorte la mandaría a un hueco que ya no le toca. */
        if(areaB > areaA){ a.ang = b.ang; a.radio = b.radio; }
        a.fundida = ahoraMs();
        particulas.splice(j, 1); j--;
        if(elCuenta) elCuenta.textContent = particulas.length;
      }
    }
  }
  const ahoraMs = () => (performance && performance.now ? performance.now() : Date.now());

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
        /* Se vuelve a medir al entrar en pantalla: la primera medida puede
           haber caído antes de que el lienzo tuviera tamaño, y de ahí salía
           lo de «se quedan en cero». */
        if(visible){ if(an < 8 || al < 8){ medir(); sembrar(); } arrancar(); }
      }, { threshold:.05 }).observe(lienzo);
    }else{ visible = true; arrancar(); }

    /* Una sola escucha, y sólo mientras el puntero está sobre el lienzo: los
       modos magnético y repelente son lo único que la necesita. */
    lienzo.addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect();
      raton = { x:e.clientX - r.left, y:e.clientY - r.top };
    }, { passive:true });
    /* En táctil no hay `pointerleave` al levantar el dedo: el puntero deja de
       existir sin salir de nada. Sin esto, la última posición del dedo se
       quedaba tirando de las partículas para siempre. */
    for(const ev of ['pointerleave', 'pointerup', 'pointercancel'])
      lienzo.addEventListener(ev, () => { raton = null; }, { passive:true });

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
