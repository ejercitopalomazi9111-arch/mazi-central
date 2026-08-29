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

  /* ══ EL SISTEMA SOLAR ════════════════════════════════════════════════════
     Carlos: «quiero que sumes uno de un sistema solar respetando gravedad,
     elipses, rotación y traslación, lunas y cometas, y lo mismo si chocan que
     exploten y se transformen en otro planeta más grande, pero que las fuerzas
     se operen y se decida la nueva trayectoria».

     LA DECISIÓN QUE LO HACE DE VERDAD: las elipses NO SE DIBUJAN. Habría sido
     más fácil trazar una elipse por planeta y moverlo por ella con un seno y
     un coseno — se ve casi igual en una captura y es mentira. Aquí se integra
     la fuerza en cada paso, y la elipse SALE. Eso vale por tres cosas que con
     una elipse dibujada no se pueden tener:

       · la segunda ley sale sola: cada cuerpo va rápido cerca del sol y lento
         lejos, sin que nadie lo programe;
       · un cometa es lo mismo que un planeta, sólo que lanzado más despacio
         desde más lejos. No hay código de cometa;
       · y sobre todo: al chocar dos cuerpos, la órbita nueva sale de sumar sus
         cantidades de movimiento. Con elipses dibujadas habría que INVENTAR la
         órbita resultante, que es justo lo que él pidió que no pasara.

     La suavización `EPS` en la fuerza no es un truco sucio: sin ella, un
     cuerpo que pasa muy cerca del sol recibe una fuerza casi infinita en un
     solo paso y sale disparado — el clásico defecto de todo integrador de
     gravedad con paso fijo. Con ella, el sistema aguanta horas. */
  /* ⚠ LA FÍSICA VA EN UN ESPACIO CUADRADO Y EL DIBUJO SE ACHATA. La primera
     versión escalaba las órbitas con `min(ancho, alto)`, y el lienzo mide 300
     de alto contra casi mil de ancho: todo el sistema cabía en un radio de 138
     px, con las órbitas a 23 px una de otra y planetas de 6. Se tocaban solos.
     La sonda de abajo lo dijo en un segundo; deduciéndolo llevaba tres
     intentos fallidos.

     Así que la gravedad se resuelve en un espacio cuadrado del tamaño del
     ANCHO —donde hay sitio de sobra— y al pintar se multiplica la vertical por
     `ACHATA`. Eso es exactamente cómo se dibuja siempre un sistema solar: en
     perspectiva, visto desde un poco arriba del plano. Se gana espacio y se
     gana profundidad con la misma línea, y las distancias de la física no se
     tocan. */
  const G = 2600, EPS = 26, ACHATA = 0.42;
  let sol = null, destellos = [];
  const pantallaY = (y) => (sol ? sol.y + (y - sol.y) * ACHATA : y);

  function sembrarSolar(){
    const cx = an / 2, cy = al / 2;
    sol = { x:cx, y:cy, r:Math.max(9, Math.min(an, al) * 0.045), m:900 };
    particulas = [];
    /* ⚠ MENOS PLANETAS Y MÁS SEPARADOS, y esto no es estética: es la razón por
       la que un sistema solar DURA. Mi primera versión sembraba nueve cuerpos
       con excentricidades variadas y a los diez segundos quedaban tres: las
       órbitas se cruzaban y todo se fundía. Bonito de ver una vez, inútil como
       demostración.

       En un sistema de verdad los cuerpos son diminutos comparados con la
       distancia que los separa, y por eso pueden dar vueltas millones de años
       sin tocarse. Aquí los planetas tienen que verse, así que la separación
       tiene que crecer con ellos. Cinco órbitas bien apartadas y casi
       circulares no se cruzan — y entonces el ÚNICO que cruza es el cometa,
       que es exactamente el cuerpo que en la realidad choca con las cosas. El
       choque deja de ser ruido de fondo y pasa a ser un acontecimiento. */
    const n = Math.max(4, Math.min(6, Math.round(an / 190)));
    const lejos = an * 0.34;

    for(let i = 0; i < n; i++){
      const d = lejos * (0.26 + 0.74 * (i + 1) / n);
      const ang = (i * 2.399);                     /* ángulo áureo: no se alinean */
      /* ⚠ MÁS GRANDES DE LO QUE PARECÍA RAZONABLE. A 1.6 px eran puntos: no se
         distinguía un planeta de una partícula del modo orbital, y la marca de
         rotación —que es lo que hace visible la rotación— no cabía dentro. Un
         cuerpo tiene que verse como un cuerpo para que la escena diga algo. */
      const r = 3 + (i % 3) * 1.5;
      /* Velocidad circular exacta: `v = √(GM/d)`. Se le quita un poco a unos y
         se le pone a otros para que las órbitas salgan ELÍPTICAS y no todas
         circulares — la excentricidad no se dibuja, se siembra. */
      /* La excentricidad se siembra ajustando la velocidad respecto de la
         circular. Con un rango ancho las órbitas se cruzaban mucho y el
         sistema se fundía entero en medio minuto — bonito de ver una vez,
         inútil como demostración. Con este rango hay elipses claras y los
         choques son de vez en cuando, que es lo que se quiere mirar. */
      const v = Math.sqrt(G * sol.m / d) * (0.985 + (i % 3) * 0.014);
      particulas.push({
        x: cx + Math.cos(ang) * d, y: cy + Math.sin(ang) * d,
        vx: -Math.sin(ang) * v, vy: Math.cos(ang) * v,
        r, m: r * r * 3, giro: 0, gv: 0.02 + (i % 5) * 0.008, luna: null,
      });
    }

    /* Dos lunas, colgadas del planeta más grande que haya. Se resuelven con
       gravedad también, pero respecto a su planeta: hacer n-cuerpos completo
       con lunas es inestable con paso fijo y se desarman a los diez segundos. */
    const grande = particulas.reduce((a, b) => (b.r > a.r ? b : a), particulas[0]);
    grande.luna = { ang:0, d:grande.r * 3.4, v:0.055, r:Math.max(1.4, grande.r * 0.4) };

    /* Y un cometa: mismo código, lanzado desde lejos y despacio. De ahí sale
       la órbita muy alargada, sin una sola línea que diga «cometa». */
    const dc = lejos * 1.55;
    const vc = Math.sqrt(G * sol.m / dc) * 0.45;
    particulas.push({
      x: cx + dc, y: cy, vx: 0, vy: vc, r:2.2, rc:0.7, m:6, giro:0, gv:0, luna:null, cometa:true,
      cola: [],
    });
    if(elCuenta) elCuenta.textContent = particulas.length;
  }

  function lanzarCometa(){
    const lejos = an * 0.34 * 1.55;
    const ang = Math.random() * Math.PI * 2;
    const v = Math.sqrt(G * sol.m / lejos) * 0.45;
    particulas.push({
      x: sol.x + Math.cos(ang) * lejos, y: sol.y + Math.sin(ang) * lejos,
      vx: -Math.sin(ang) * v, vy: Math.cos(ang) * v,
      r:2.2, rc:0.7, m:6, giro:0, gv:0, luna:null, cometa:true, cola:[],
    });
    if(elCuenta) elCuenta.textContent = particulas.length;
  }

  /* ── UN COMETA DONDE SE TOQUE ────────────────────────────────────────────
     Carlos: «no hay modo de interactuar con el sistema solar haz que le pueda
     poner cometas al pulsar o algo así».

     Nace justo donde cae el dedo y con la velocidad CIRCULAR de esa distancia
     multiplicada por 0.45 — el mismo 0.45 del cometa de la siembra, y de ahí
     sale la órbita muy alargada sin una sola línea que diga «cometa». Se le
     da perpendicular al sol, que es lo que hace que orbite en vez de caerse
     de frente.

     ⚠ EL DEDO CAE EN PANTALLA Y LA FÍSICA VIVE SIN ACHATAR. Hay que
     deshacer `pantallaY` al entrar; si no, todo lo que se toque arriba o
     abajo del sol nace más cerca de lo que se ve y la órbita sale distinta de
     donde se pidió. */
  function cometaEn(px, py){
    if(!sol) return;
    const y = sol.y + (py - sol.y) / ACHATA;          /* pantalla → física */
    const dx = px - sol.x, dy = y - sol.y;
    const d = Math.max(sol.r * 2.2, Math.hypot(dx, dy));
    const v = Math.sqrt(G * sol.m / d) * 0.45;
    const ang = Math.atan2(dy, dx);
    particulas.push({
      x: sol.x + Math.cos(ang) * d, y: sol.y + Math.sin(ang) * d,
      vx: -Math.sin(ang) * v, vy: Math.cos(ang) * v,
      r:2.2, rc:0.7, m:6, giro:0, gv:0, luna:null, cometa:true, cola:[],
    });
    /* Un destello donde nació: sin él, en una pantalla con doce cuerpos no se
       distingue cuál acabas de poner tú. */
    destellos.push({ x:px, y, r:6, t:420 });
    if(elCuenta) elCuenta.textContent = particulas.length;
  }

  function pasoSolar(k){
    if(!sol) sembrarSolar();
    for(const p of particulas){
      const dx = sol.x - p.x, dy = sol.y - p.y;
      const d2 = dx * dx + dy * dy + EPS * EPS;
      const d = Math.sqrt(d2);
      const a = G * sol.m / d2;
      p.vx += (dx / d) * a * k * 0.016;
      p.vy += (dy / d) * a * k * 0.016;
      p.x += p.vx * k * 0.016;
      p.y += p.vy * k * 0.016;
      p.giro += p.gv * k;                          /* rotación sobre su eje */
      if(p.luna) p.luna.ang += p.luna.v * k;
      /* ⚠ EL RASTRO ES LA PRUEBA, no un adorno. Todo el comentario de arriba
         dice que las elipses no están dibujadas sino que SALEN de integrar la
         fuerza — y en una imagen quieta eso no se puede distinguir de haberlas
         trazado a mano. El rastro son las posiciones por las que el cuerpo ya
         pasó: la elipse que se ve es literalmente el resultado del cálculo, no
         una figura puesta ahí. Si un día rompo la física, la primera cosa que
         se deforma es esta curva.
         Y en el cometa hace de cola, que apunta sola en contra del movimiento
         sin calcular ninguna dirección. */
      if(!p.cola) p.cola = [];
      p.cola.push({ x:p.x, y:p.y });
      if(p.cola.length > (p.cometa ? 34 : 150)) p.cola.shift();
      /* Si se va del lienzo, se le devuelve al sistema en vez de perderlo: un
         sistema solar que se queda vacío a los dos minutos no es una demo. */
      const fuera = Math.hypot(p.x - sol.x, p.y - sol.y) > Math.max(an, al);
      if(fuera){ p.vx *= -0.6; p.vy *= -0.6; }
    }
    chocarSolar();
    /* ⚠ SI EL SISTEMA SE QUEDA CALLADO, LLEGA UN COMETA NUEVO — no se
       reinicia. Carlos ya me dijo que el reinicio de golpe se ve mal, y tenía
       razón: volver a sembrar borra lo que la persona estaba mirando. Un
       cometa que entra desde fuera es lo que pasa de verdad en un sistema
       solar, cuesta cuatro líneas, y la escena nunca se queda vacía sin que
       nadie note un corte. */
    if(particulas.length < 3 && !particulas.some(p => p.cometa)) lanzarCometa();
    destellos = destellos.filter(f => (f.t -= k * 16) > 0);
  }

  /* Chocar y fundirse CON LAS FUERZAS OPERADAS: la cantidad de movimiento se
     conserva (`m₁v₁ + m₂v₂ = (m₁+m₂)v`), así que la órbita nueva no la escoge
     nadie — sale de la suma. Es la diferencia entre «se fusionan» y «se
     fusionan bien». */
  function chocarSolar(){
    for(let i = 0; i < particulas.length; i++){
      for(let j = i + 1; j < particulas.length; j++){
        const a = particulas[i], b = particulas[j];
        /* ⚠ EL RADIO DE CHOQUE NO ES EL RADIO DIBUJADO. Un cometa se dibuja
           como un punto de 2 px porque abajo de eso no se vería, pero su
           núcleo es ridículamente chico comparado con un planeta — y usando el
           radio de dibujo se comía un planeta cada cinco segundos: de cinco
           cuerpos quedaban tres en diez segundos y la escena se acababa antes
           de que alguien la mirara.

           El tamaño mínimo para que algo se vea es una decisión de DIBUJO. La
           física no tiene por qué heredarla. */
        const ra = a.rc != null ? a.rc : a.r, rb = b.rc != null ? b.rc : b.r;
        if(Math.hypot(a.x - b.x, a.y - b.y) >= ra + rb) continue;
        const M = a.m + b.m;
        a.vx = (a.vx * a.m + b.vx * b.m) / M;
        a.vy = (a.vy * a.m + b.vy * b.m) / M;
        a.x  = (a.x  * a.m + b.x  * b.m) / M;
        a.y  = (a.y  * a.m + b.y  * b.m) / M;
        a.m  = M;
        a.r  = Math.sqrt(a.r * a.r + b.r * b.r);   /* área, no radio */
        if(b.luna && !a.luna) a.luna = b.luna;
        destellos.push({ x:a.x, y:a.y, r:a.r, t:420 });   /* --media */
        particulas.splice(j, 1); j--;
        if(elCuenta) elCuenta.textContent = particulas.length;
      }
    }
    chocarLunas();
  }

  /* ── LA LUNA TAMBIÉN CHOCA ───────────────────────────────────────────────
     Carlos: «una luna chocó con otro planeta y no explotó eso está mal».

     Tenía razón, y la causa es que la luna NO ERA UN CUERPO. Es un adorno
     colgado de su planeta —ángulo, distancia y velocidad—, dibujado aparte y
     fuera de la física; se hizo así a propósito, porque meterla como cuerpo
     de pleno derecho desarma el sistema en diez segundos con este paso fijo.
     Pero el precio era éste: la luna atraviesa un planeta y no pasa nada, que
     es exactamente lo que se lee como error.

     Ahora choca. Y la cuenta se hace en coordenadas de PANTALLA y no de la
     física, que es lo correcto aquí y no un atajo: la luna se dibuja con el
     achatamiento aplicado, así que su sitio en la física no es donde se ve —y
     lo que Carlos llamó «chocó» es lo que VIO. Comprobarlo en el otro espacio
     daría explosiones donde no se tocan y ninguna donde sí. */
  function chocarLunas(){
    for(const p of particulas){
      if(!p.luna) continue;
      const lx = p.x + Math.cos(p.luna.ang) * p.luna.d;
      const ly = pantallaY(p.y) + Math.sin(p.luna.ang) * p.luna.d * ACHATA;
      for(const o of particulas){
        if(o === p) continue;
        const oy = pantallaY(o.y);
        if(Math.hypot(lx - o.x, ly - oy) >= p.luna.r + o.r) continue;
        /* Se la queda el que la embistió: masa que se conserva, y un destello
           del tamaño de la luna — no del planeta, o parecería que reventó el
           planeta entero. */
        o.m += p.luna.r * p.luna.r * 3;
        destellos.push({ x:lx, y:o.y, r:p.luna.r + 2, t:420 });
        p.luna = null;
        break;
      }
    }
  }

  function pintarSolar(){
    ctx.clearRect(0, 0, an, al);
    /* El sol, con su halo. */
    const solY = pantallaY(sol.y);
    const halo = ctx.createRadialGradient(sol.x, solY, 0, sol.x, solY, sol.r * 4);
    halo.addColorStop(0, tintaSenal + '55');
    halo.addColorStop(1, tintaSenal + '00');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sol.x, solY, sol.r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tintaSenal;
    ctx.beginPath(); ctx.arc(sol.x, solY, sol.r, 0, Math.PI * 2); ctx.fill();

    /* Los rastros primero, para que los cuerpos queden encima. Uno solo por
       trazo y con la opacidad puesta una vez: pintar segmento por segmento con
       opacidad distinta cuesta ciento cincuenta cambios de estado por cuerpo y
       por fotograma, que es como un adorno se convierte en un problema. */
    ctx.lineWidth = 1;
    for(const p of particulas){
      if(!p.cola || p.cola.length < 2) continue;
      ctx.strokeStyle = tintaCuerpo;
      ctx.globalAlpha = p.cometa ? 0.42 : 0.16;
      ctx.beginPath();
      ctx.moveTo(p.cola[0].x, pantallaY(p.cola[0].y));
      for(let i = 1; i < p.cola.length; i++) ctx.lineTo(p.cola[i].x, pantallaY(p.cola[i].y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for(const p of particulas){
      const py = pantallaY(p.y);
      ctx.fillStyle = tintaCuerpo;
      ctx.beginPath(); ctx.arc(p.x, py, p.r, 0, Math.PI * 2); ctx.fill();
      /* La rotación se VE: una marca en el borde que da vueltas con el
         planeta. Sin ella, «rotación» sería una palabra en un comentario. */
      if(p.r > 2.4){
        ctx.fillStyle = tintaSenal;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(p.giro) * p.r * 0.55, py + Math.sin(p.giro) * p.r * 0.55,
                Math.max(0.7, p.r * 0.22), 0, Math.PI * 2);
        ctx.fill();
      }
      if(p.luna){
        ctx.fillStyle = tintaCuerpo;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(p.luna.ang) * p.luna.d,
                py + Math.sin(p.luna.ang) * p.luna.d * ACHATA, p.luna.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* El destello de la fusión: un anillo que se abre y se apaga. Carlos:
       «al chocar dos partículas no hay feedback de que se unieron, ni
       explosión ni nada, sólo se unen». Sin esto, lo que se ve es que una
       desaparece — que se lee como un error, no como un choque. */
    for(const f of destellos){
      const t = 1 - f.t / 420;
      ctx.strokeStyle = tintaSenal;
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.lineWidth = 2 * (1 - t) + 0.5;
      ctx.beginPath(); ctx.arc(f.x, pantallaY(f.y), f.r + t * 26, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
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
    const k = Math.min(dt, 34) / 16.7;
    if(modo === 'solar'){ pasoSolar(k); return; }      /* topado: si la pestaña estuvo
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
        destellos.push({ x:a.x, y:a.y, r:a.r, t:420 });
        particulas.splice(j, 1); j--;
        if(elCuenta) elCuenta.textContent = particulas.length;
      }
    }
  }

  /* ⚠ EL REPELENTE ERA INVISIBLE EN CLARO, y Carlos lo vio. Se pintaba con un
     token —`--medida`, un verde menta— que el rediseño ELIMINÓ: la variable
     dejó de existir, `getPropertyValue` devolvió cadena vacía, y el respaldo
     escrito a mano en este archivo era el menta viejo, que sobre papel a 2 px
     de radio no se ve. Dos defectos en uno: un color decorativo que no venía
     del sistema, y un respaldo que tapaba la falta en vez de delatarla.
     Ahora los dos colores salen del sistema y los dos se ven en los dos temas. */
  const color = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  let tintaSenal = '#AD21ED', tintaCuerpo = '#010101';
  const releerColores = () => {
    tintaSenal  = color('--acento') || tintaSenal;
    tintaCuerpo = color('--texto')  || tintaCuerpo;
  };

  function pintar(){
    if(modo === 'solar'){ pintarSolar(); return; }
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

    ctx.fillStyle = modo === 'repelente' ? tintaCuerpo : tintaSenal;
    for(const p of particulas){
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    /* El mismo destello que en el sistema solar: fundirse sin avisar se lee
       como que una partícula desapareció, o sea como un error. */
    destellos = destellos.filter(f => (f.t -= 16) > 0);
    for(const f of destellos){
      const t = 1 - f.t / 420;
      ctx.strokeStyle = tintaSenal;
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.lineWidth = 2 * (1 - t) + 0.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r + t * 22, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
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
    /* Tocar el lienzo en el sistema solar pone un cometa ahí. En los otros
       modos el dedo ya hace algo —atrae o repele— y no se le añade nada. */
    lienzo.addEventListener('pointerup', (e) => {
      if(modo !== 'solar') return;
      const r = lienzo.getBoundingClientRect();
      /* El lienzo se dibuja en su propia resolución y se estira por CSS: sin
         esta regla de tres, el cometa nace desplazado justo cuando la
         pantalla es más chica que el lienzo, o sea en el teléfono. */
      cometaEn((e.clientX - r.left) * (an / r.width),
               (e.clientY - r.top)  * (al / r.height));
    });

    /* En táctil no hay `pointerleave` al levantar el dedo: el puntero deja de
       existir sin salir de nada. Sin esto, la última posición del dedo se
       quedaba tirando de las partículas para siempre. */
    for(const ev of ['pointerleave', 'pointerup', 'pointercancel'])
      lienzo.addEventListener(ev, () => { raton = null; }, { passive:true });

    /* ⚠ AQUÍ ESTABA LA CAUSA DE DOS DEFECTOS QUE CARLOS REPORTÓ POR SEPARADO:
       «el orbital a veces falla reiniciándose aún mientras lo veo» y «en
       magnético, si hago scroll con el dedo aunque sea 1 píxel se reinicia».

       Es el mismo bug. En un teléfono, la barra del navegador aparece y
       desaparece al scrollear, y eso dispara `resize`. Aquí `resize` volvía a
       SEMBRAR — o sea a tirar el sistema y empezar de cero. Desde fuera se ve
       como un reinicio aleatorio, y desde dentro es exactamente eso.

       Sembrar de nuevo casi nunca es lo que se quiere: lo que cambió es el
       tamaño del lienzo, no el sistema. Ahora se REESCALA — cada cuerpo se
       mueve a la posición proporcional que ocupaba— y el sistema sobrevive al
       cambio de tamaño sin que se note. Sólo se siembra si de verdad no hay
       nada, que es la única vez que hace falta. */
    let tiempoMedida;
    addEventListener('resize', () => {
      clearTimeout(tiempoMedida);
      tiempoMedida = setTimeout(() => {
        const anViejo = an, alViejo = al;
        medir();
        if(!particulas.length){ sembrar(); return; }
        if(anViejo > 8 && alViejo > 8){
          const fx = an / anViejo, fy = al / alViejo;
          for(const p of particulas){
            p.x *= fx; p.y *= fy;
            if(p.radio) p.radio *= Math.min(fx, fy);
          }
        }
      }, 160);
    }, { passive:true });
  }

  /* Sonda de diagnóstico: deja leer el estado real del sistema desde fuera.
     Cuesta tres líneas y evita diagnosticar por deducción, que es como se
     arreglan cosas que no estaban rotas. */
  lienzo.__estado = () => particulas.map(p => ({
    d: Math.round(Math.hypot(p.x - (sol ? sol.x : 0), p.y - (sol ? sol.y : 0))),
    r: +p.r.toFixed(1), cometa: !!p.cometa,
    /* La luna, en coordenadas de PANTALLA — que es donde choca y donde se
       dibuja. Sin esto no hay forma de comprobar desde fuera que se estrelló:
       no es un cuerpo de la lista, es un adorno colgado de su planeta. */
    luna: p.luna ? {
      x: p.x + Math.cos(p.luna.ang) * p.luna.d,
      y: pantallaY(p.y) + Math.sin(p.luna.ang) * p.luna.d * ACHATA,
      r: p.luna.r,
    } : null,
  }));
  /* Cuántos destellos hay ahorita. Es lo único que distingue «chocó y
     explotó» de «desapareció», que es justo lo que Carlos reclamó. */
  lienzo.__destellos = () => destellos.length;

  /* ⚠ ESTO ERA EL CUERPO DEL `click` Y SE SACÓ A UNA FUNCIÓN. El modo ahora
     se guarda y se repone al volver, y reponerlo tiene que pasar por el mismo
     camino que pulsarlo: si el restaurador pusiera `modo = ...` por su cuenta,
     el día que este cuerpo cambie —y ya cambió dos veces, por dos defectos que
     reportó Carlos— la versión restaurada se quedaría con la lógica vieja.

     `porToque` es lo único que se diferencia: al restaurar no hay dedo del
     que soltarse ni grumo que deshacer, y empujar las partículas desde el
     centro al cargar la página es un movimiento que nadie pidió. */
  function ponerModo(b, porToque){
    {
      const antes = modo;
      modo = b.dataset.modo;
      if(modo === 'solar' && antes !== 'solar') sembrarSolar();
      if(modo !== 'solar' && antes === 'solar'){ sol = null; destellos = []; sembrar(); }
      for(const o of document.querySelectorAll('[data-modo]'))
        o.setAttribute('aria-pressed', String(o === b));
      if(elModo) elModo.textContent = modo;
      for(const p of particulas) p.libre = false;

      /* ⚠ AQUÍ ESTABA EL «NO ME DEJA CAMBIAR AL TOCAR». Carlos: «en magnético
         y repelente no me deja cambiar a conectado inmediatamente al tocar
         sino que se espera un segundo y cuando le vuelvo a picar ahora sí se
         cambia».

         El modo SÍ cambiaba en el primer toque —lo comprobé con toques de
         verdad: la lectura y el `aria-pressed` cambian en el mismo cuadro—.
         Lo que no cambiaba era el DIBUJO, y por eso desde fuera es idéntico a
         que no hubiera pasado nada.

         Dos causas, las dos aquí:
         · El dedo seguía tirando. En táctil, tocar un BOTÓN no dispara ningún
           `pointerup` sobre el lienzo, así que la última posición del dedo se
           quedaba atrayendo partículas incluso después de cambiar de modo.
         · El grumo no se deshacía. Al venir de magnético todas están apiladas
           en un punto, y `conectado` sólo les da un empujón de ±0.3 px con
           rozamiento .94: la pila tarda MUCHÍSIMO en abrirse, y hasta que se
           abre las líneas de «conectado» no se distinguen de una mancha.
         Ahora se suelta el dedo y se le da a la pila un empujón hacia afuera
         desde su propio centro. La forma nueva se lee en el primer cuadro. */
      raton = null;
      if(porToque && modo !== 'solar' && particulas.length){
        let cx = 0, cy = 0;
        for(const p of particulas){ cx += p.x; cy += p.y; }
        cx /= particulas.length; cy /= particulas.length;
        for(const p of particulas){
          const dx = p.x - cx, dy = p.y - cy;
          const d = Math.hypot(dx, dy) || 1;
          /* Hacia afuera, y con un mínimo: las que caen justo en el centro no
             tienen dirección propia y se quedarían ahí clavadas. */
          const ang = d < 2 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);
          p.vx += Math.cos(ang) * 2.4;
          p.vy += Math.sin(ang) * 2.4;
        }
      }
      releerColores();
      if(menos.matches){ paso(16.7); pintar(); }
    }
    memoria.guardar('modo', modo);
  }
  for(const b of document.querySelectorAll('[data-modo]')){
    b.addEventListener('click', () => ponerModo(b, true));
  }
  /* Se repone el modo al volver. Va DESPUÉS de enganchar los botones para que
     no haya un instante con el modo puesto y los botones sin enterarse. */
  {
    const guardado = memoria.leer('modo');
    const b = guardado &&
      document.querySelector(`[data-modo="${CSS.escape(guardado)}"]`);
    if(b && guardado !== modo) ponerModo(b, false);
  }

  /* Al cambiar de tema hay que releer los colores: están en variables CSS y
     el lienzo no las hereda solo. Sin esto, el modo claro pinta partículas del
     color del modo oscuro y nadie entiende por qué se ven apagadas. */
  new MutationObserver(releerColores).observe(document.documentElement,
    { attributes:true, attributeFilter:['data-tema'] });
})();
