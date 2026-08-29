/* ══════════════════════════════════════════════════════════════════════════
   EL BANCO DE PRUEBAS · el motor
   ──────────────────────────────────────────────────────────────────────────
   UN SOLO `requestAnimationFrame` PARA TODA LA PÁGINA, y no es presumir: es
   la diferencia entre 60 fps y una página que va a tirones. Cada pieza que
   pide su propio ciclo suma trabajo por fotograma, y con ocho piezas ya se
   nota en un teléfono de hace tres años — que es el aparato en el que esto se
   va a ver de verdad.

   Y EL CICLO SE DUERME. Si no hay nada que mover, no se pide fotograma. Un
   `requestAnimationFrame` que se llama a sí mismo para siempre gasta batería
   de alguien aunque la página esté quieta.

   UNA SOLA ESCUCHA DE SCROLL, UNA SOLA DE PUNTERO, UN SOLO OBSERVADOR.

   EL INTERRUPTOR VA AL REVÉS: el <html> nace con `data-quieto` y esto se lo
   quita. Si este archivo no llega, el atributo se queda y no se anima nada —
   la página se ve completa y quieta. Un interruptor que hay que encender deja
   la página rota el día que nadie lo enciende.
   ═════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const raiz = document.documentElement;
  const menos = matchMedia('(prefers-reduced-motion: reduce)');
  const $  = (s, d = document) => d.querySelector(s);
  const $$ = (s, d = document) => [...d.querySelectorAll(s)];

  /* ────────────────────────────────────────────────────────────────────────
     EL CICLO COMPARTIDO
     Las piezas se apuntan con `sumar(fn)` y se dan de baja devolviendo false.
     Nadie más llama a requestAnimationFrame en todo el proyecto.
     ──────────────────────────────────────────────────────────────────────── */
  const tareas = new Set();
  let corriendo = false;
  function ciclo(t){
    corriendo = false;
    for(const f of [...tareas]) if(f(t) === false) tareas.delete(f);
    if(tareas.size) pedir();
  }
  function pedir(){ if(!corriendo){ corriendo = true; requestAnimationFrame(ciclo); } }
  function sumar(f){ tareas.add(f); pedir(); }
  window.bancoSumar = sumar;          /* lo usa particulas.js: un solo ciclo */

  /* Envolver el contenido de lo que se destapa. Se hace desde JS a propósito:
     si el JS no llega no hay envoltorio, no hay máscara y no hay nada que
     recortar — el texto se ve entero por no hacer nada, que es la forma más
     segura de degradar. */
  for(const el of $$('[data-revelar]')){
    const dentro = document.createElement('span');
    dentro.className = 'tapada';
    while(el.firstChild) dentro.append(el.firstChild);
    el.append(dentro);
  }

  raiz.removeAttribute('data-quieto');
  if(menos.matches) raiz.setAttribute('data-quieto', '');   /* y se vuelve a poner */

  /* ── EL RESPALDO DEL DESTAPE ────────────────────────────────────────────
     Sólo para navegadores sin `animation-timeline`. Donde la hay, el CSS lo
     lleva solo y aquí no se registra ni un observador. */
  const solo = CSS.supports('animation-timeline: view()');
  if(!solo && !menos.matches){
    const ojo = new IntersectionObserver((es) => {
      for(const e of es){
        if(!e.isIntersecting) continue;
        e.target.classList.add('dentro');
        ojo.unobserve(e.target);      /* ya se destapó: no tiene nada más que decir */
      }
    }, { rootMargin:'0px 0px -10% 0px', threshold:.01 });
    for(const el of $$('[data-revelar]')) ojo.observe(el);
  }

  /* ────────────────────────────────────────────────────────────────────────
     LA CINTA · porcentaje y sección actual
     El número y el resaltado de la sección salen del MISMO cálculo. Dos
     escuchas de scroll haciendo cuentas parecidas es como se llega a los
     tirones, y la cuenta ya la teníamos hecha.
     ──────────────────────────────────────────────────────────────────────── */
  const pct   = $('[data-pct]');
  const barra = $('[data-barra]');
  const vias  = $$('.cinta-vias a');
  const metas = vias.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const sinLinea = !CSS.supports('animation-timeline: scroll()');
  let pedidoScroll = false;

  function medirScroll(){
    pedidoScroll = false;
    const alto = document.documentElement.scrollHeight - innerHeight;
    const t = alto > 0 ? Math.min(1, Math.max(0, scrollY / alto)) : 0;
    if(pct) pct.textContent = Math.round(t * 100) + '%';
    /* La barra sólo se toca si el CSS no puede: donde hay línea de tiempo de
       scroll, escribirle el transform desde aquí sería pelearse con ella.

       ⚠ Y «no puede» INCLUYE EL MOVIMIENTO REDUCIDO. El bloque de
       `prefers-reduced-motion` apaga esa animación, así que sin esta condición
       la barra se quedaba en `scaleX(0)` para siempre: quien pide menos
       movimiento se quedaba sin indicador de progreso. Y no lo encontré
       mirando — lo encontró la prueba que exige que nada quede desplazado.

       Escribirlo aquí NO contradice la preferencia: esto no es una animación,
       es una lectura que sigue al scroll uno a uno, igual que la barra de
       desplazamiento del navegador. Lo que molesta es el movimiento que uno no
       pidió, no el que uno está causando con el dedo. */
    if((sinLinea || menos.matches) && barra) barra.style.transform = `scaleX(${t})`;

    /* La sección actual es la última cuya cabecera ya pasó el tercio alto de
       la pantalla. Se calcula hacia atrás para no recorrer todas. */
    let actual = null;
    for(let i = metas.length - 1; i >= 0; i--){
      if(metas[i].getBoundingClientRect().top <= innerHeight * 0.34){ actual = i; break; }
    }
    vias.forEach((a, i) => a.setAttribute('aria-current', i === actual ? 'true' : 'false'));
    return false;                     /* una pasada por evento, y se duerme */
  }
  function alScroll(){ if(!pedidoScroll){ pedidoScroll = true; sumar(medirScroll); } }
  addEventListener('scroll', alScroll, { passive:true });
  addEventListener('resize', alScroll, { passive:true });
  medirScroll();

  /* ────────────────────────────────────────────────────────────────────────
     1 · LAS PISTAS DE LA GRAMÁTICA
     Las cinco corren a la vez y recorren la MISMA distancia: si cada una
     viajara distinto, la comparación no diría nada de la duración.
     ──────────────────────────────────────────────────────────────────────── */
  const correr = $('[data-correr-pistas]');
  if(correr) correr.addEventListener('click', () => {
    for(const p of $$('.pista')){
      const riel  = $('.pista-riel', p);
      const carro = $('.pista-carro', p);
      p.classList.remove('corriendo');
      carro.style.setProperty('--viaje', (riel.clientWidth - 30) + 'px');
      void carro.offsetWidth;         /* reinicia la animación: sin esto, la
                                         segunda vez no vuelve a arrancar */
      p.classList.add('corriendo');
    }
  });

  /* ────────────────────────────────────────────────────────────────────────
     2 · LA MATRIZ DE ESTADOS
     ──────────────────────────────────────────────────────────────────────── */
  const btM   = $('[data-bt-muestra]');
  const btM2  = $('[data-bt-muestra-2]');
  const nomb  = $('[data-estado-nombre]');
  const NOMBRES = { normal:'normal', foco:'foco', cargando:'cargando',
                    logro:'logrado', error:'error', apagado:'apagado' };

  function ponerEstado(cual){
    for(const b of [btM, btM2]){
      if(!b) continue;
      b.dataset.estado = cual;
      b.disabled = (cual === 'apagado');
      const base = b === btM ? 'Enviar' : 'Secundario';
      b.replaceChildren();
      if(cual === 'cargando'){
        const g = document.createElement('span'); g.className = 'giro';
        b.append(g, document.createTextNode('Enviando…'));
      }else if(cual === 'logro'){ b.textContent = '✓ Listo';
      }else if(cual === 'error'){ b.textContent = '✕ No se pudo';
      }else{ b.textContent = base; }
    }
    /* `foco` se enseña de verdad, poniendo el foco: dibujar un anillo falso
       enseñaría cómo se ve, no cómo se comporta — y lo que falla casi siempre
       es lo segundo. */
    if(cual === 'foco' && btM) btM.focus();
    if(nomb) nomb.textContent = NOMBRES[cual] || cual;
    for(const p of $$('[data-estado-bt]'))
      p.setAttribute('aria-pressed', String(p.dataset.estadoBt === cual));
  }
  for(const p of $$('[data-estado-bt]'))
    p.addEventListener('click', () => ponerEstado(p.dataset.estadoBt));

  /* El ciclo de verdad: falla una de cada tres. Un flujo que siempre sale bien
     no prueba el camino que importa. */
  const ciclar = $('[data-ciclo]');
  if(ciclar) ciclar.addEventListener('click', async () => {
    ponerEstado('cargando');
    await new Promise(r => setTimeout(r, 1200));
    const bien = Math.random() > 0.34;
    ponerEstado(bien ? 'logro' : 'error');
    avisar(bien ? 'Guardado.' : 'No se pudo guardar. Vuelve a intentar.',
           bien ? 'logro' : 'error');
    setTimeout(() => ponerEstado('normal'), 1800);
  });

  /* ────────────────────────────────────────────────────────────────────────
     3 · MICROINTERACCIONES
     ──────────────────────────────────────────────────────────────────────── */

  /* El imán. UNA sola escucha de puntero para toda la página, y el cálculo va
     al ciclo compartido en vez de hacerse dentro del evento: los eventos de
     puntero llegan más seguido que los fotogramas, así que calcular en cada
     uno es trabajo tirado a la basura. */
  const iman = $('[data-iman]');
  const lecturaIman = $('[data-iman-lectura]');
  const ALCANCE = 80, TOPE = 12;
  let raton = null, pedidoIman = false;

  function moverIman(){
    pedidoIman = false;
    if(!iman) return false;
    if(!raton){
      iman.style.setProperty('--dx','0px'); iman.style.setProperty('--dy','0px');
      iman.dataset.cerca = 'no';
      if(lecturaIman) lecturaIman.textContent = '0.0 px';
      return false;
    }
    const r = iman.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = raton.x - cx, dy = raton.y - cy;
    const d = Math.hypot(dx, dy);
    if(d > ALCANCE){
      iman.style.setProperty('--dx','0px'); iman.style.setProperty('--dy','0px');
      iman.dataset.cerca = 'no';
      if(lecturaIman) lecturaIman.textContent = '0.0 px';
      return false;
    }
    /* Se inclina, no persigue: el desvío es proporcional a lo cerca que está
       y nunca pasa de 12px. Un botón que alcanza al cursor se siente
       descompuesto, no vivo. */
    const f = (1 - d / ALCANCE) * TOPE / Math.max(d, 1);
    const ox = dx * f, oy = dy * f;
    iman.style.setProperty('--dx', ox.toFixed(1) + 'px');
    iman.style.setProperty('--dy', oy.toFixed(1) + 'px');
    iman.dataset.cerca = 'si';
    if(lecturaIman) lecturaIman.textContent = Math.hypot(ox, oy).toFixed(1) + ' px';
    return false;
  }
  if(iman && matchMedia('(hover:hover) and (pointer:fine)').matches){
    addEventListener('pointermove', (e) => {
      raton = { x:e.clientX, y:e.clientY };
      if(!pedidoIman){ pedidoIman = true; sumar(moverIman); }
    }, { passive:true });
    addEventListener('pointerleave', () => {
      raton = null;
      if(!pedidoIman){ pedidoIman = true; sumar(moverIman); }
    }, { passive:true });
  }

  /* La onda. Nace donde de verdad se tocó, no en el centro: una onda centrada
     delata que el efecto es un adorno y no una respuesta. */
  function onda(e){
    const b = e.currentTarget;
    if(menos.matches) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'onda';
    const lado = 360;
    s.style.cssText = `left:${e.clientX - r.left}px; top:${e.clientY - r.top}px;` +
                      `width:${lado}px; height:${lado}px; margin:${-lado/2}px 0 0 ${-lado/2}px;`;
    /* El margen negativo y el translate del CSS hacen lo mismo a propósito:
       así el círculo queda centrado en el punto aunque cambie el tamaño. */
    b.append(s);
    s.addEventListener('animationend', () => s.remove(), { once:true });
  }
  for(const b of $$('[data-onda], .bt--senal')) b.addEventListener('click', onda);

  /* ────────────────────────────────────────────────────────────────────────
     4 · CONTADORES (arrancan al entrar, no al cargar)
     Un contador que ya subió mientras nadie miraba es un número escrito.
     ──────────────────────────────────────────────────────────────────────── */
  function contar(el){
    const fin = parseFloat(el.dataset.contar);
    if(!isFinite(fin)) return;
    const unidad = el.querySelector('.unidad');
    const sufijo = unidad ? unidad.outerHTML : '';
    const t0 = performance.now(), DUR = 1800;          /* --cine */
    sumar((t) => {
      const p = Math.min(1, (t - t0) / DUR);
      /* Frena al final en vez de ir parejo: un contador lineal parece un reloj
         descompuesto; uno que desacelera parece que está llegando a un dato. */
      const v = Math.round(fin * (1 - Math.pow(1 - p, 3)));
      el.innerHTML = v + sufijo;
      return p < 1;
    });
  }
  const cuentas = $$('[data-contar]');
  if(cuentas.length){
    if(menos.matches || !('IntersectionObserver' in window)){
      /* Sin observador o con movimiento reducido, el número final ya está
         escrito en el HTML: no hay nada que hacer. */
    }else{
      const ojo2 = new IntersectionObserver((es) => {
        for(const e of es){
          if(!e.isIntersecting) continue;
          contar(e.target); ojo2.unobserve(e.target);
        }
      }, { threshold:.4 });
      for(const c of cuentas) ojo2.observe(c);
    }
  }

  /* ────────────────────────────────────────────────────────────────────────
     5 · CRONÓMETRO
     Con el reloj del sistema, NUNCA sumando fotogramas. Sumar 16.7 ms por
     cuadro se atrasa en cuanto el aparato se ocupa en otra cosa, y un
     cronómetro que se atrasa es peor que no tener cronómetro.
     ──────────────────────────────────────────────────────────────────────── */
  const crono = $('[data-crono]');
  let t0Crono = 0, acumulado = 0, andando = false;
  const formato = (ms) => {
    const s = Math.floor(ms / 1000), d = Math.floor((ms % 1000) / 100);
    return String(Math.floor(s / 60)).padStart(2,'0') + ':' +
           String(s % 60).padStart(2,'0') + '.' + d;
  };
  function pintarCrono(){
    if(!crono) return false;
    crono.textContent = formato(acumulado + (andando ? performance.now() - t0Crono : 0));
    return andando;
  }
  for(const b of $$('[data-crono-bt]')) b.addEventListener('click', () => {
    const q = b.dataset.cronoBt;
    if(q === 'correr'){
      if(andando){ acumulado += performance.now() - t0Crono; andando = false; b.textContent = 'Iniciar'; }
      else       { t0Crono = performance.now(); andando = true; b.textContent = 'Pausar'; sumar(pintarCrono); }
    }else{
      andando = false; acumulado = 0;
      const otro = $('[data-crono-bt="correr"]'); if(otro) otro.textContent = 'Iniciar';
    }
    pintarCrono();
  });

  /* ────────────────────────────────────────────────────────────────────────
     6 · MARCADOR
     ──────────────────────────────────────────────────────────────────────── */
  const elPuntos = $('[data-puntos]'), elRacha = $('[data-racha]');
  const elProg = $('[data-progreso]');
  let puntos = 0, racha = 0;
  const anotar = $('[data-anotar]');
  if(anotar) anotar.addEventListener('click', () => {
    racha += 1;
    puntos += 10 * racha;             /* la racha multiplica: es lo que hace
                                         que valga la pena seguir (punto 25) */
    const desde = parseInt(elPuntos.textContent.replace(/\D/g,''), 10) || 0;
    const t0 = performance.now(), DUR = 420;            /* --media */
    sumar((t) => {
      const p = Math.min(1, (t - t0) / DUR);
      elPuntos.textContent = Math.round(desde + (puntos - desde) * (1 - Math.pow(1 - p, 3)));
      return p < 1;
    });
    elRacha.textContent = racha;
    const av = Math.min(100, puntos % 200 / 2);
    elProg.setAttribute('aria-valuenow', Math.round(av));
    elProg.firstElementChild.style.width = av + '%';
    if(racha === 5) avisar('Racha de cinco. El multiplicador ya va en ×5.', 'logro');
  });

  /* ────────────────────────────────────────────────────────────────────────
     7 · SUPERFICIES
     ──────────────────────────────────────────────────────────────────────── */
  const modal = $('[data-modal]');
  const abrirModal = $('[data-abrir-modal]');
  if(modal && abrirModal){
    /* `showModal()` y no una capa a mano: la trampa de foco, el Escape y el
       `inert` sobre el resto del documento los pone el navegador, y los suyos
       están mejor probados que los míos. Lo único que falta es devolver el
       foco al botón, y eso sí lo hace el navegador con <dialog>. */
    abrirModal.addEventListener('click', () => modal.showModal());
    for(const c of $$('[data-cerrar-modal]')) c.addEventListener('click', () => modal.close());
  }

  const hoja = $('[data-hoja]');
  const abrirHoja = $('[data-abrir-hoja]');
  if(hoja && abrirHoja){
    let quienAbrio = null;
    const cerrarHoja = () => {
      hoja.dataset.abierta = 'no';
      /* Se esconde de verdad DESPUÉS de la transición: si se escondiera de
         inmediato, la animación de salida no se vería; y si no se escondiera
         nunca, el teclado seguiría entrando a algo invisible. */
      setTimeout(() => { hoja.hidden = true; }, 420);
      if(quienAbrio) quienAbrio.focus();
    };
    abrirHoja.addEventListener('click', () => {
      quienAbrio = abrirHoja;
      hoja.hidden = false;
      requestAnimationFrame(() => { hoja.dataset.abierta = 'si'; $('[data-cerrar-hoja]').focus(); });
    });
    $('[data-cerrar-hoja]').addEventListener('click', cerrarHoja);
    addEventListener('keydown', (e) => { if(e.key === 'Escape' && hoja.dataset.abierta === 'si') cerrarHoja(); });
  }

  const cajaAvisos = $('[data-avisos]');
  function avisar(texto, tipo){
    if(!cajaAvisos) return;
    const a = document.createElement('div');
    a.className = 'aviso'; a.dataset.tipo = tipo || 'nota';
    a.textContent = texto;
    cajaAvisos.append(a);
    /* Se va solo a los 4 s. `role=status` en el contenedor y no `alert`: un
       «guardado» no debe interrumpir a quien está escribiendo. */
    setTimeout(() => {
      a.classList.add('yendose');
      a.addEventListener('animationend', () => a.remove(), { once:true });
    }, 4000);
  }
  const btAvisar = $('[data-avisar]');
  if(btAvisar) btAvisar.addEventListener('click', () =>
    avisar('Esto se quita solo en 4 segundos.', 'nota'));

  /* ────────────────────────────────────────────────────────────────────────
     8 · FORMULARIO
     Validación al SALIR del campo, no en cada tecla. Corregir a alguien
     mientras todavía está escribiendo su correo es pelearse con quien te está
     dando sus datos.
     ──────────────────────────────────────────────────────────────────────── */
  const form = $('[data-form]');
  if(form){
    const revisar = (campo) => {
      const v = campo.value.trim();
      const caja = campo.closest('.campo');
      const aviso = $(`[data-error-de="${campo.name}"]`);
      let mal = '';
      if(!v) mal = 'Hace falta.';
      else if(campo.type === 'email' && !/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(v))
        mal = 'Le falta algo a ese correo.';
      if(caja) caja.toggleAttribute('data-mal', !!mal);
      campo.setAttribute('aria-invalid', String(!!mal));
      if(aviso) aviso.textContent = mal;
      return !mal;
    };
    for(const c of $$('input[name]', form)){
      if(c.type === 'range') continue;
      c.addEventListener('blur', () => revisar(c));
      /* Ya que está marcado como malo, sí se revisa al escribir: a partir de
         ahí la persona está corrigiendo, y verlo ponerse bien es la
         recompensa. Antes de eso sería regañar. */
      c.addEventListener('input', () => { if(c.getAttribute('aria-invalid') === 'true') revisar(c); });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const campos = $$('input[name]', form).filter(c => c.type !== 'range');
      const bien = campos.map(revisar).every(Boolean);
      if(!bien){ campos.find(c => c.getAttribute('aria-invalid') === 'true')?.focus();
                 avisar('Faltan datos. Están marcados.', 'error'); return; }
      avisar('Enviado. Nada salió de tu navegador: esto es una demostración.', 'logro');
      form.reset();
      const r = $('[data-rango]'), sal = $('[data-valor-rango]');
      if(r && sal) sal.textContent = r.value;
    });
    const rango = $('[data-rango]'), salida = $('[data-valor-rango]');
    if(rango && salida) rango.addEventListener('input', () => { salida.textContent = rango.value; });
  }

  /* ────────────────────────────────────────────────────────────────────────
     9 · ARRASTRAR Y SOLTAR, TAMBIÉN CON TECLADO
     Lo segundo es la mitad del trabajo y la que casi nadie hace. Y tiene un
     premio inesperado: una función que se puede manejar con teclado se puede
     PROBAR por una máquina, y por eso ésta sí tiene prueba.
     ──────────────────────────────────────────────────────────────────────── */
  const zonaCajones = $('[data-cajones]');
  if(zonaCajones){
    const cajones = $$('[data-cajon]', zonaCajones);
    const lectura = $('[data-arrastre-lectura]');
    const decir = (t) => { if(lectura) lectura.textContent = t; };
    const nombreDe = (c) => $('h3', c).textContent.trim();

    const mover = (pieza, dir) => {
      const caja = pieza.closest('[data-cajon]');
      const i = cajones.indexOf(caja);
      const j = i + dir;
      if(j < 0 || j >= cajones.length){ decir('Ya no hay a dónde moverla por ese lado.'); return; }
      cajones[j].append(pieza);
      pieza.focus();                  /* el foco viaja con la pieza: si se
                                         quedara atrás, el teclado perdería el hilo */
      decir(`«${pieza.textContent.trim()}» → ${nombreDe(cajones[j])}.`);
    };

    for(const p of $$('.pieza', zonaCajones)){
      p.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowRight'){ e.preventDefault(); mover(p, 1); }
        if(e.key === 'ArrowLeft'){  e.preventDefault(); mover(p, -1); }
      });
      p.addEventListener('dragstart', (e) => {
        p.dataset.volando = 'si';
        e.dataTransfer.setData('text/plain', p.dataset.pieza);
        e.dataTransfer.effectAllowed = 'move';
      });
      p.addEventListener('dragend', () => { delete p.dataset.volando; });
    }
    for(const c of cajones){
      c.addEventListener('dragover', (e) => { e.preventDefault(); c.dataset.encima = 'si'; });
      c.addEventListener('dragleave', () => { delete c.dataset.encima; });
      c.addEventListener('drop', (e) => {
        e.preventDefault(); delete c.dataset.encima;
        const id = e.dataTransfer.getData('text/plain');
        const p = $(`[data-pieza="${CSS.escape(id)}"]`, zonaCajones);
        if(p){ c.append(p); decir(`«${p.textContent.trim()}» → ${nombreDe(c)}.`); }
      });
    }
  }

  /* ────────────────────────────────────────────────────────────────────────
     10 · CARGANDO / VACÍO / ERROR / SIN CONEXIÓN
     Ninguno culpa a quien está del otro lado, y los cuatro dicen qué se puede
     hacer. «Algo salió mal» sin más es la forma educada de no decir nada.
     ──────────────────────────────────────────────────────────────────────── */
  const cajaLista = $('[data-caja-lista]');
  const ICONO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 4v16"/></svg>`;
  const VISTAS = {
    cargando: `<div class="esqueleto">
        <span class="hueso hueso--titulo"></span><span class="hueso"></span>
        <span class="hueso hueso--corto"></span><span class="hueso"></span></div>`,
    vacio: `<div class="vacio">${ICONO}
        <p><b>Todavía no hay nada aquí.</b></p>
        <p style="font-size:.9rem">En cuanto agregues la primera, aparece en esta lista.</p>
        <button class="bt bt--senal" type="button">Agregar la primera</button></div>`,
    error: `<div class="vacio" style="border-color:var(--alarma)">${ICONO}
        <p><b>No se pudo traer la lista.</b></p>
        <p style="font-size:.9rem">El servidor tardó más de 10 segundos. No es tu conexión.</p>
        <button class="bt" type="button">Volver a intentar</button></div>`,
    sinred: `<div class="vacio">${ICONO}
        <p><b>Estás sin conexión.</b></p>
        <p style="font-size:.9rem">Lo que ves es lo último que se guardó. Se actualiza solo al volver la red.</p></div>`,
    lleno: `<ul style="list-style:none; padding:0; margin:0">
        <li style="padding:.7rem 0; border-bottom:1px solid var(--raya)"><b>Medir el contraste</b> · 12 parejas, todas pasan</li>
        <li style="padding:.7rem 0; border-bottom:1px solid var(--raya)"><b>Probar sin JavaScript</b> · la página se lee entera</li>
        <li style="padding:.7rem 0; border-bottom:1px solid var(--raya)"><b>Recorrerlo con teclado</b> · 0 trampas de foco</li>
        <li style="padding:.7rem 0"><b>Movimiento reducido</b> · apagado y completo</li></ul>`,
  };
  for(const b of $$('[data-lista]')) b.addEventListener('click', () => {
    for(const o of $$('[data-lista]')) o.setAttribute('aria-pressed', String(o === b));
    if(cajaLista) cajaLista.innerHTML = VISTAS[b.dataset.lista] || '';
  });

  /* ────────────────────────────────────────────────────────────────────────
     11 · TEMA (puntos 36 y 37)
     Se respeta lo que la persona ya tiene puesto en su sistema, y sólo se
     recuerda si lo cambió a mano. Recordar una preferencia que nadie expresó
     es adivinar.
     ──────────────────────────────────────────────────────────────────────── */
  /* ⚠ EL BOTÓN NO SE LLAMA `data-tema`, Y ANTES SÍ. `data-tema` es el ESTADO
     que esta misma función escribe en el <html>, así que en cuanto se pinta el
     tema por primera vez `document.querySelector('[data-tema]')` deja de
     encontrar el botón y encuentra el <html>. Aquí funcionaba de milagro —por
     el orden de las líneas— y en la prueba no: el clic caía en el <html> y no
     pasaba nada, con todo en verde. Un atributo que significa dos cosas es un
     defecto aunque hoy no se note. */
  const btTema = $('[data-cambiar-tema]');
  const guardado = (() => { try{ return localStorage.getItem('banco-tema'); }catch(e){ return null; } })();
  const claroDelSistema = matchMedia('(prefers-color-scheme: light)').matches;
  let claro = guardado ? guardado === 'claro' : claroDelSistema;
  function ponerTema(){
    raiz.dataset.tema = claro ? 'claro' : 'oscuro';
    if(btTema){
      btTema.textContent = claro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
      btTema.setAttribute('aria-pressed', String(claro));
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.content = claro ? '#F4F2ED' : '#0B0B10';
  }
  ponerTema();
  if(btTema) btTema.addEventListener('click', () => {
    claro = !claro; ponerTema();
    /* El almacenamiento puede tronar —ventana privada, permisos— y eso no
       puede tumbar el cambio de tema, que ya funcionó. */
    try{ localStorage.setItem('banco-tema', claro ? 'claro' : 'oscuro'); }catch(e){}
  });

  /* ────────────────────────────────────────────────────────────────────────
     12 · TEXTO REVUELTO (punto 42)
     Se cambian los CARACTERES, no la opacidad. Un texto a media opacidad no
     cumple contraste ni un instante; uno revuelto se ve nítido, sólo que
     todavía no dice nada.
     ──────────────────────────────────────────────────────────────────────── */
  const revuelto = $('[data-revolver]');
  if(revuelto && !menos.matches){
    const fin = revuelto.dataset.revolver;
    const SOPA = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789·';
    const t0 = performance.now(), DUR = 1800;          /* --cine */
    sumar((t) => {
      const p = Math.min(1, (t - t0) / DUR);
      const listos = Math.floor(fin.length * p);
      let s = fin.slice(0, listos);
      for(let i = listos; i < fin.length; i++)
        s += fin[i] === ' ' ? ' ' : SOPA[(Math.random() * SOPA.length) | 0];
      revuelto.textContent = s;
      return p < 1;
    });
  }
})();
