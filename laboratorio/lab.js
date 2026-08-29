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
    moverGuia(actual == null ? null : vias[actual]);
    ponerFlechas(actual == null ? 0 : actual + 1);
    return false;                     /* una pasada por evento, y se duerme */
  }
  /* ── EL SUBRAYADO QUE SE DESLIZA ────────────────────────────────────────
     Carlos: «haz que en lugar de que la línea se teletransporte de apartado
     que se deslice suavemente hasta la objetivo».

     Se mide contra el CONTENIDO de la cinta y no contra la pantalla:
     `offsetLeft` ya viene en coordenadas del contenedor, así que la guía sigue
     puesta aunque la fila esté desplazada de lado —cabe en pantallas donde los
     diez enlaces no caben— y no hay que sumarle `scrollLeft` a mano.

     `scaleX` sobre un elemento de 1 px: así el ancho es el propio factor y no
     hay que animar `width`, que recalcularía la maqueta en cada fotograma. */
  const guia = $('[data-guia]');
  const lista = $('.cinta-vias');
  let guiaEn = null;
  function moverGuia(a){
    if(!guia || a === guiaEn) return;          /* sin cambio, sin trabajo */
    guiaEn = a;
    if(!a){ guia.style.transform = 'translateX(0) scaleX(0)'; return; }
    guia.style.transform = `translateX(${a.offsetLeft}px) scaleX(${a.offsetWidth})`;
    seguirRail(a);
  }
  /* ── EL RAIL SE SIGUE SOLO ──────────────────────────────────────────────
     En teléfono la lista es más ancha que la pantalla. Sin esto, la sección
     donde estás puede quedar fuera del rail: la línea la marca, pero marca
     algo que no se ve, que es peor que no marcar nada.

     El desplazamiento se le pide al CONTENEDOR, no con `scrollIntoView`: ése
     puede mover también la página, y aquí se está leyendo. `offsetLeft` no
     cambia al desplazar el rail —es relativo a su contenido—, así que la guía
     sigue puesta sin recalcularla.

     La suavidad la decide el CSS (`scroll-behavior`), que ya sabe apagarla
     con «menos movimiento». Escribirla también aquí serían dos sitios
     decidiendo lo mismo, y uno de los dos se olvida. */
  function seguirRail(a){
    if(!lista || lista.scrollWidth <= lista.clientWidth + 1) return;
    lista.scrollLeft = Math.max(0, a.offsetLeft - (lista.clientWidth - a.offsetWidth) / 2);
  }

  /* ── LAS FLECHAS DE LA BARRA DE ABAJO ───────────────────────────────────
     Sólo se ven en teléfono (lo decide el CSS), pero se enganchan siempre:
     un `if` de ancho aquí se desincroniza con la media query el día que
     alguien mueva los 640 px, y además el teléfono se puede girar.

     Las paradas son las once: la portada y las diez secciones. La portada NO
     está en la lista de enlaces —ir al principio es `#arriba`— pero sí es una
     parada, porque «anterior» desde la primera sección tiene que llevar a
     algún sitio y ese sitio es el principio del documento. */
  const paradas = [$('#portada'), ...metas].filter(Boolean);
  const flechaAtras = $('.rail-flecha[data-ir="-1"]');
  const flechaAdelante = $('.rail-flecha[data-ir="1"]');
  let parada = 0;
  function ponerFlechas(i){
    parada = Math.min(paradas.length - 1, Math.max(0, i));
    if(flechaAtras) flechaAtras.disabled = parada === 0;
    if(flechaAdelante) flechaAdelante.disabled = parada === paradas.length - 1;
  }
  $$('.rail-flecha').forEach(f => f.addEventListener('click', () => {
    const i = Math.min(paradas.length - 1, Math.max(0, parada + (+f.dataset.ir)));
    paradas[i].scrollIntoView({ behavior: menos.matches ? 'auto' : 'smooth', block:'start' });
    /* No se toca `parada` a mano: la manda el scroll, que es quien sabe dónde
       se acabó parando. Adelantarla aquí la desincroniza si el viaje se
       interrumpe —y en un teléfono se interrumpe con el dedo. */
  }));

  function alScroll(){ if(!pedidoScroll){ pedidoScroll = true; sumar(medirScroll); } }
  addEventListener('scroll', alScroll, { passive:true });
  /* ⚠ AQUÍ HUBO UN ARREGLO Y SE QUITÓ, MEDIDO. Razoné que al cambiar de ancho
     la guía se quedaría en la medida vieja: `moverGuia` se salta el trabajo
     cuando le dan el mismo enlace —correcto al scrollear, porque no se ha
     movido— y con el mismo enlace en una pantalla distinta eso sonaba a línea
     descuadrada. Escribí `() => { guiaEn = null; alScroll(); }`.

     No hacía nada. Comprobado a 380, 370 y 360 px en teléfono y a 1100, 900 y
     800 en escritorio, con la misma sección activa a los dos lados del cambio:
     la línea siguió cuadrando al píxel CON el arreglo y SIN él. La razón es que
     `offsetLeft` es relativo al contenido del rail, y ese contenido no se
     re-maqueta al estrechar la ventana —los diez enlaces miden lo que miden y
     lo que cambia es cuánto se ve de ellos—.

     Se queda escrito para que no se vuelva a añadir «por si acaso». La prueba
     del giro sí se queda: comprueba la invariante, no este arreglo. */
  addEventListener('resize', alScroll, { passive:true });
  medirScroll();

  /* ────────────────────────────────────────────────────────────────────────
     1 · LAS PISTAS DE LA GRAMÁTICA
     Las cinco corren a la vez y recorren la MISMA distancia: si cada una
     viajara distinto, la comparación no diría nada de la duración.
     ──────────────────────────────────────────────────────────────────────── */
  /* ⚠ EL VIAJE DE VUELTA NO ES UN SALTO, Y ANTES SÍ LO ERA. Carlos: «correr
     las 5 una vez se ve bien, pero al presionarlo de nuevo se teletransportan
     hacia atrás y repiten la animación; haz que se regresen haciendo su
     trayecto con su tiempo y todo, pero invertido, y si lo picó de nuevo sea
     como volverlo a mandar a la derecha».

     Tenía razón por partida doble: el salto se ve mal, y además CONTRADECÍA lo
     que esta sección enseña. Un carro que se teletransporta no demuestra
     ninguna duración; el regreso instantáneo era 0 ms colado entre los cinco
     escalones que la página presume de respetar.

     La ida y la vuelta son la MISMA transición y sólo cambia el destino: así
     tardan exactamente igual, con la misma curva, sin un segundo juego de
     fotogramas que se pueda desfasar del primero.

     Y el tema cambia AL MISMO TIEMPO, también porque lo pidió: «haz que al
     mandarlo a la derecha cambie el tema a claro gradualmente a la misma
     velocidad que esos 5». La transición del `body` usa `--cine`, que es la
     pista más larga — o sea que el tema termina de cambiar cuando el último
     carro llega. No está copiado el número: es el mismo token. */
  const correr = $('[data-correr-pistas]');
  let pistasIdas = false;
  if(correr){
    const pistas = $$('.pista');
    correr.addEventListener('click', () => {
      pistasIdas = !pistasIdas;
      for(const p of pistas){
        const riel  = $('.pista-riel', p);
        const carro = $('.pista-carro', p);
        p.classList.add('corriendo');
        carro.style.setProperty('--donde', pistasIdas ? (riel.clientWidth - 18) + 'px' : '0px');
      }
      correr.textContent = pistasIdas ? 'Regresarlas' : 'Correr las cinco';
      /* El tema va atado al viaje: a la derecha, claro; de regreso, oscuro. */
      claro = pistasIdas;
      ponerTema();
      try{ localStorage.setItem('banco-tema', claro ? 'claro' : 'oscuro'); }catch(e){}
    });
  }

  /* ────────────────────────────────────────────────────────────────────────
     2 · LA MATRIZ DE ESTADOS
     ──────────────────────────────────────────────────────────────────────── */
  const btM   = $('[data-bt-muestra]');
  const btM2  = $('[data-bt-muestra-2]');
  const nomb  = $('[data-estado-nombre]');
  const NOMBRES = { normal:'normal', encima:'encima (hover)', hundido:'hundido (pressed)',
                    foco:'foco', cargando:'cargando', logro:'logrado',
                    error:'error', apagado:'apagado' };

  function ponerEstado(cual){
    for(const b of [btM, btM2]){
      if(!b) continue;
      b.dataset.estado = cual;
      b.disabled = (cual === 'apagado');
      const base = b === btM ? 'Enviar' : 'Secundario';
      /* Todo lo que escribe el botón va DENTRO de una capa propia, para que la
         onda del toque pase por debajo y no por encima de la palabra. */
      const capa = document.createElement('span');
      capa.className = 'bt-txt';
      if(cual === 'cargando'){
        capa.append(palomita(), document.createTextNode('Enviando…'));
      }else if(cual === 'logro'){ capa.textContent = '✓ Listo';
      }else if(cual === 'error'){ capa.textContent = '✕ No se pudo';
      }else{ capa.textContent = base; }
      b.replaceChildren(capa);
    }
    /* `foco` se enseña de verdad, poniendo el foco: dibujar un anillo falso
       enseñaría cómo se ve, no cómo se comporta — y lo que falla casi siempre
       es lo segundo.

       `encima` y `hundido` NO se pueden poner de verdad: son estados del ratón
       y se van al soltar, que es exactamente la razón por la que nadie los
       revisa nunca. Aquí se congelan con los mismos valores que usan sus
       pseudoclases, tomados del CSS con `data-estado`, no copiados a mano —
       copiarlos sería garantizar que un día se separen. */
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

  /* ══ LA PALOMA QUE SE DIBUJA ═════════════════════════════════════════════
     Carlos: «tu cargando es demasiado simple, ¿una U dando vueltas? ¿Qué es
     esto, el siglo 3? Haz algo nuevo… una paloma dibujándose su contorno».

     Es la mejor de sus ideas y arregla algo más grande que el adorno: era el
     único sitio del laboratorio donde no había NADA de la casa. Un giro
     infinito dice «espera»; una marca dibujándose dice «esto lo está haciendo
     alguien».

     ⚠ ES LA PALOMA DE VERDAD, NO UNA QUE YO DIBUJE. `marca/PLACA.md` lo dice
     con todas sus letras: reconstruir esta paloma costó veinte rondas y una
     marca que cambia no es una marca. Así que se baja el vector real
     (`paloma.svg`, copiado de `marca/logo/paloma-simple.svg`) y se le anima el
     contorno con `stroke-dashoffset`, que es lo que hace una pluma.

     Se baja UNA VEZ y sólo cuando de verdad hace falta: si el cargando nunca
     aparece, esos 12 KB nunca se piden. Y si la petición falla, se devuelve un
     trazo simple en vez de dejar el botón mudo — un cargador que no carga es
     peor que uno feo. */
  let palomaCache = null, palomaPidiendo = null;
  function palomita(){
    const caja = document.createElement('span');
    caja.className = 'paloma-caja';
    caja.setAttribute('aria-hidden', 'true');

    const poner = (svg) => {
      caja.replaceChildren(svg.cloneNode(true));
      /* Cada trazo se mide para que su animación dure lo mismo aunque midan
         distinto: sin esto, el ala larga terminaría mucho después que la
         estrella y se vería como un error. */
      const trazos = [...caja.querySelectorAll('path, polygon')];
      trazos.forEach((t, i) => {
        /* ⚠ CADA TRAZO SE MIDE, y aquí está la mitad de lo que Carlos llamó
           «desincronizada». Los nueve caminos de la paloma miden cosas muy
           distintas —un ala es diez veces el ojo—, así que un mismo guion en
           píxeles se ve enorme en el corto y minúsculo en el largo. El guion
           se calcula como FRACCIÓN de cada camino: así el segmento que corre
           se ve del mismo tamaño relativo en los nueve, que es lo que hace
           que se lean como un solo sistema.

           Y el hueco es el resto exacto del camino. Eso es lo que garantiza
           que el ciclo cierre sin costura: al desplazarse guion+hueco, el
           patrón cae exactamente donde empezó. Si el hueco fuera un número
           redondo, al final de cada vuelta habría un salto. */
        const largo = Math.max(1, Math.ceil(t.getTotalLength ? t.getTotalLength() : 400));
        /* ⚠ EL GUION ES LARGO, NO CORTO. Con 16 % se veía una chispa
           corriendo y la paloma NO SE LEÍA — y Carlos había pedido lo
           contrario: «manteniendo la forma». Con 60 % la silueta está ahí casi
           entera y lo que corre es el HUECO, que es lo que hace que se note el
           movimiento sin perder la marca. Un cargador que no deja reconocer la
           marca no está usando la marca.

           Y sube de 60 % a 82 %: Carlos, después del primer arreglo, pidió
           «deja menos distancia entre las puntas de él cargando». Las «puntas»
           son los dos extremos del trazo dibujado, y lo que las separa es el
           HUECO — el resto del camino. Alargando el guion, el hueco se
           encoge: la paloma se lee casi entera y lo que corre es una ranura
           estrecha en vez de medio dibujo faltando. */
        const guion = Math.max(8, Math.round(largo * 0.82));
        t.style.setProperty('--guion', guion);
        t.style.setProperty('--hueco', largo - guion);
        /* El desfase es por POSICIÓN en el camino, no un retardo de tiempo: un
           retardo deja los primeros trazos quietos al arrancar y se ve como si
           la animación empezara mal. Así los nueve están corriendo desde el
           primer fotograma, cada uno por un punto distinto de su recorrido. */
        t.style.animationDelay = `calc(var(--cine) * 3 * ${-(i / Math.max(trazos.length, 1)).toFixed(3)})`;
      });
    };

    if(palomaCache){ poner(palomaCache); return caja; }
    if(!palomaPidiendo){
      palomaPidiendo = fetch(new URL('paloma.svg', location.href))
        .then(r => r.ok ? r.text() : Promise.reject(new Error('no llegó')))
        .then(txt => {
          const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
          const svg = doc.documentElement;
          if(svg.nodeName !== 'svg') throw new Error('eso no es un svg');
          svg.setAttribute('class', 'paloma');
          svg.removeAttribute('width'); svg.removeAttribute('height');
          /* El relleno se quita aquí y no en el CSS: el archivo trae
             `fill` en el grupo, y un atributo de presentación gana sobre
             cualquier regla de hoja por especificidad. */
          for(const g of svg.querySelectorAll('[fill]')) g.removeAttribute('fill');
          palomaCache = svg;
          return svg;
        })
        .catch(() => {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 40 40');
          svg.setAttribute('class', 'paloma');
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', 'M4 22 Q20 4 36 22 Q20 30 4 22');
          svg.append(p);
          palomaCache = svg;
          return svg;
        });
    }
    palomaPidiendo.then(poner);
    return caja;
  }

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

  /* ⚠ EL ICONO VIVO NO RESPONDÍA AL DEDO, y Carlos lo notó: la animación
     colgaba de `:hover` y de `:focus-visible`, y en un teléfono no hay ninguno
     de los dos. Tocar no da `focus-visible` —bien que no lo dé, es para
     teclado— así que el icono se quedaba muerto justo en el aparato donde más
     se usa. Con una clase puesta al tocar, responde en los dos. */
  const flecha = $('[data-flecha]');
  if(flecha) flecha.addEventListener('click', () => {
    flecha.classList.remove('adelanta');
    void flecha.offsetWidth;                    /* reinicia la animación */
    flecha.classList.add('adelanta');
  });

  /* La onda. Nace donde de verdad se tocó, no en el centro: una onda centrada
     delata que el efecto es un adorno y no una respuesta. */
  /* La etiqueta de cada botón se envuelve una vez, al arrancar: sin la capa,
     la onda se dibuja encima del texto. */
  for(const b of $$('.bt')){
    if(b.querySelector('.bt-txt')) continue;
    const capa = document.createElement('span');
    capa.className = 'bt-txt';
    while(b.firstChild) capa.append(b.firstChild);
    b.append(capa);
  }

  function onda(e){
    const b = e.currentTarget;
    /* ⚠ ANTES AQUÍ SE SALÍA SIN HACER NADA CON `prefers-reduced-motion`, y de
       ahí salía lo de Carlos: «el botón de tócame donde sea en teléfono sólo
       se pulsa, no hay más». Un botón que se llama «tócame donde sea» y no
       contesta nada al toque está incumpliendo su propio nombre.

       La preferencia pide MENOS MOVIMIENTO, no menos respuesta. Así que con
       ella puesta la onda sigue saliendo: nace ya del tamaño final y sólo se
       apaga. No se desplaza, no crece, y sigue diciendo dónde tocaste. */
    const quieta = menos.matches;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = quieta ? 'onda onda--quieta' : 'onda';
    /* El círculo se mide DESDE EL BOTÓN: con un tamaño fijo de 360 px, en un
       botón chico casi todo quedaba recortado y el efecto se perdía; en uno
       ancho no alcanzaba a cubrirlo. Dos veces la distancia a la esquina más
       lejana es lo justo para que la onda salga del punto tocado y llegue a
       todos los rincones exactamente al terminar. */
    const dx = Math.max(e.clientX - r.left, r.right - e.clientX);
    const dy = Math.max(e.clientY - r.top, r.bottom - e.clientY);
    const lado = Math.ceil(Math.hypot(dx, dy) * 2);
    s.style.cssText = `left:${e.clientX - r.left}px; top:${e.clientY - r.top}px;` +
                      `width:${lado}px; height:${lado}px; margin:${-lado/2}px 0 0 ${-lado/2}px;`;
    /* El margen negativo y el translate del CSS hacen lo mismo a propósito:
       así el círculo queda centrado en el punto aunque cambie el tamaño. */
    b.append(s);
    s.addEventListener('animationend', () => s.remove(), { once:true });
  }
  for(const b of $$('.bt')) b.addEventListener('click', onda);

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
      /* ⚠ AQUÍ HABÍA DÉCIMAS DE RETRASO ENTRE DETENERLO Y PONERLO EN CERO, y
         lo reportó Carlos. La causa: `pintarCrono` devuelve `andando`, y al
         poner `andando=false` la tarea del ciclo se daba de baja — pero la
         baja ocurre DESPUÉS de que la función termina, así que el último
         fotograma todavía pintaba el tiempo viejo. Se veía como un tirón.
         Se escribe el cero a mano y no se espera al ciclo para nada. */
      andando = false; acumulado = 0; t0Crono = 0;
      const otro = $('[data-crono-bt="correr"]'); if(otro) otro.textContent = 'Iniciar';
      if(crono) crono.textContent = formato(0);
      return;
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
    elProg.firstElementChild.style.transform = `scaleX(${av / 100})`;
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
      raiz.removeAttribute('data-hoja-abierta');
      hoja.dataset.abierta = 'no';
      /* Se esconde de verdad DESPUÉS de la transición: si se escondiera de
         inmediato, la animación de salida no se vería; y si no se escondiera
         nunca, el teclado seguiría entrando a algo invisible. */
      setTimeout(() => { hoja.hidden = true; }, 420);
      if(quienAbrio) quienAbrio.focus();
    };
    abrirHoja.addEventListener('click', () => {
      quienAbrio = abrirHoja;
      raiz.setAttribute('data-hoja-abierta', '');
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
    raiz.setAttribute('data-hay-avisos', '');
    /* Se va solo a los 4 s. `role=status` en el contenedor y no `alert`: un
       «guardado» no debe interrumpir a quien está escribiendo. */
    setTimeout(() => {
      a.classList.add('yendose');
      a.addEventListener('animationend', () => {
        a.remove();
        if(!cajaAvisos.children.length) raiz.removeAttribute('data-hay-avisos');
      }, { once:true });
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
    /* ⚠ EL RELLENO Y EL PULGAR TIENEN QUE DECIR EL MISMO NÚMERO, y no lo
       decían. Carlos: «la barra es totalmente llena pero la palanquera se
       estancó antes de llegar». Pasa en todo deslizador nativo y casi nadie lo
       arregla: el pulgar NO recorre el ancho completo, recorre `ancho−pulgar`,
       porque a los extremos le queda medio pulgar de cada lado. Si el relleno
       se pinta al 100 % y el centro del pulgar sólo llega a `ancho−pulgar/2`,
       los dos están dibujando valores distintos del mismo dato.

       Se pinta hasta el CENTRO DEL PULGAR, con esa misma resta. Los dos salen
       de una sola cuenta, así que no se pueden volver a separar. */
    const rango = $('[data-rango]'), salida = $('[data-valor-rango]');
    function pintarRango(){
      if(!rango) return;
      const pulgar = parseFloat(getComputedStyle(rango).getPropertyValue('--pulgar')) || 22;
      const min = Number(rango.min || 0), max = Number(rango.max || 100);
      const t = max === min ? 0 : (Number(rango.value) - min) / (max - min);
      const util = rango.clientWidth - pulgar;
      const centro = pulgar / 2 + t * util;
      rango.style.setProperty('--llena', (rango.clientWidth ? centro / rango.clientWidth * 100 : t * 100) + '%');
      if(salida) salida.textContent = rango.value;
    }
    if(rango){
      rango.addEventListener('input', pintarRango);
      addEventListener('resize', pintarRango, { passive:true });
      pintarRango();
    }
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
    /* ══ ARRASTRAR CON EL DEDO ═══════════════════════════════════════════
       Carlos: «tu arrastrar en teléfono no funciona». Y no funcionaba en
       absoluto: `dragstart` es de la API de arrastre de HTML, que en táctil
       simplemente NO EXISTE. No es que fallara — es que en un teléfono ese
       código nunca corría, y la sección presumía justo de lo contrario.

       Se hace con eventos de puntero, que sí llegan de los dos lados. Y hay
       un umbral de 8 px antes de considerar que es un arrastre: sin él, cada
       toque se volvería un micro-arrastre y la pieza ya no se podría enfocar
       con el dedo para moverla con el teclado.

       `touch-action:none` en `.pieza` es obligatorio y va en el CSS: sin eso
       el navegador se queda el gesto para hacer scroll y aquí no llega nada. */
    /* ⚠ EL BLANCO DE SOLTAR ES MÁS GRANDE QUE EL CAJÓN. Carlos: «muchas veces
       está en el lugar, la suelto y se regresa al anterior». Pasaba porque se
       preguntaba qué hay EXACTAMENTE bajo el dedo, y el dedo tapa lo que
       señala: se suelta creyendo que está dentro y el punto cae un píxel
       fuera, o sobre el hueco entre dos cajones. Ahora, si no cae dentro de
       ninguno, se busca el cajón MÁS CERCANO dentro de un margen — que es lo
       que la persona quiso decir. */
    const MARGEN = 44;
    function cajonBajo(x, y){
      const bajo = document.elementFromPoint(x, y);
      const dentro = bajo && bajo.closest('[data-cajon]');
      if(dentro) return dentro;
      let mejor = null, cerca = MARGEN;
      for(const c of cajones){
        const r = c.getBoundingClientRect();
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const d = Math.hypot(dx, dy);
        if(d < cerca){ cerca = d; mejor = c; }
      }
      return mejor;
    }

    let llevando = null, desdeX = 0, desdeY = 0, arrastrando = false;
    for(const p of $$('.pieza', zonaCajones)){
      p.addEventListener('pointerdown', (e) => {
        if(e.pointerType === 'mouse' && e.button !== 0) return;
        llevando = p; desdeX = e.clientX; desdeY = e.clientY; arrastrando = false;
      });
    }
    addEventListener('pointermove', (e) => {
      if(!llevando) return;
      if(!arrastrando){
        if(Math.hypot(e.clientX - desdeX, e.clientY - desdeY) < 8) return;
        arrastrando = true;
        llevando.dataset.volando = 'si';
        /* Se captura el puntero para que el arrastre siga aunque el dedo se
           salga de la pieza — que es lo normal, porque la pieza se mueve. */
        try{ llevando.setPointerCapture(e.pointerId); }catch(err){}
      }
      llevando.style.transform =
        `translate(${e.clientX - desdeX}px, ${e.clientY - desdeY}px)`;
      const caja = cajonBajo(e.clientX, e.clientY);
      for(const c of cajones) c.toggleAttribute('data-encima', c === caja);
    }, { passive:true });
    const soltar = (e) => {
      if(!llevando) return;
      const pieza = llevando; llevando = null;
      pieza.style.transform = '';
      delete pieza.dataset.volando;
      for(const c of cajones) c.removeAttribute('data-encima');
      if(!arrastrando) return;          /* fue un toque, no un arrastre */
      arrastrando = false;
      const caja = cajonBajo(e.clientX, e.clientY);
      if(caja && caja !== pieza.closest('[data-cajon]')){
        caja.append(pieza);
        decir(`«${pieza.textContent.trim()}» → ${nombreDe(caja)}.`);
      }
    };
    addEventListener('pointerup', soltar);
    addEventListener('pointercancel', soltar);

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
  /* El tema YA lo puso el script en línea de la cabecera, antes del primer
     pintado. Aquí sólo se lee lo que quedó puesto: volver a calcularlo abriría
     la puerta a que las dos cuentas se separen y a que la página cambie de
     tema sola un instante después de cargar. */
  let claro = document.documentElement.dataset.tema !== 'oscuro';
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
