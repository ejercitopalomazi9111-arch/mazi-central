/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · insertar, editar elementos y presentar
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «que pueda poner iconos, formas, diseños, elementos visuales,
   transiciones entre otros, y que pueda crear los suyos propios».

   · INSERTAR va a la lámina que estás viendo, a las elegidas o a todas (un
     logo o un número de página en cien láminas es justo el caso de uso).
     Si va a una sola, se abre esa lámina con el elemento ya elegido para
     que lo acomodes con el dedo.
   · EDITAR en la vista grande: tocar elige, arrastrar mueve, las esquinas
     cambian el tamaño; abajo, color, duplicar, al frente, atrás, borrar y
     «guardar en mis elementos». Cada arrastre es UN deshacer.
   · PRESENTAR a pantalla completa con las transiciones que se pusieron:
     tocar a la derecha avanza, a la izquierda regresa.
   ═════════════════════════════════════════════════════════════════════════ */
import * as ICONOS from './iconos.js';

/* Dibujitos de las formas para el menú (viewBox 0 0 40 40). */
const DIBUJO = {
  rect: '<rect x="6" y="10" width="28" height="20"/>', roundRect: '<rect x="6" y="10" width="28" height="20" rx="6"/>', ellipse: '<circle cx="20" cy="20" r="13"/>',
  triangle: '<path d="M20 7 34 32H6z"/>', diamond: '<path d="M20 5 35 20 20 35 5 20z"/>', hexagon: '<path d="M12 7h16l8 13-8 13H12L4 20z"/>',
  star5: '<path d="m20 5 4.4 9.6 10.4 1.1-7.8 7 2.3 10.3L20 27.8 10.7 33l2.3-10.3-7.8-7 10.4-1.1z"/>', heart: '<path d="M20 33S6 24.5 6 15.5A7 7 0 0 1 20 12a7 7 0 0 1 14 3.5C34 24.5 20 33 20 33z"/>',
  rightArrow: '<path d="M5 15h18V8l12 12-12 12v-7H5z"/>', leftRightArrow: '<path d="M3 20 12 11v6h16v-6l9 9-9 9v-6H12v6z"/>', chevron: '<path d="M6 8h18l10 12-10 12H6l10-12z"/>',
  homePlate: '<path d="M5 10h22l8 10-8 10H5z"/>', wedgeRoundRectCallout: '<path d="M8 7h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H18l-8 7 2-7H8a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4z"/>',
  cloud: '<path d="M12 30a7 7 0 0 1-1-13.9A9 9 0 0 1 28.5 14 6 6 0 0 1 30 30z"/>', donut: '<path fill-rule="evenodd" d="M20 6a14 14 0 1 1 0 28 14 14 0 0 1 0-28zm0 8a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/>',
  parallelogram: '<path d="M12 10h24l-8 20H4z"/>', plus: '<path d="M15 5h10v10h10v10H25v10H15V25H5V15h10z"/>', flowChartMagneticDisk: '<path d="M6 11c0-3 28-3 28 0v18c0 3-28 3-28 0z"/>',
  line: '<path d="M6 32 34 8" stroke-width="3" fill="none"/>', lineaFlecha: '<path d="M6 32 30 11" stroke-width="3" fill="none"/><path d="m24 9 9-2-2 9z"/>',
};
const DIBUJO_DISENO = {
  numero: '<text x="20" y="25" font-size="16" font-weight="800" text-anchor="middle">85%</text>', tarjetas: '<rect x="3" y="12" width="10" height="16" rx="2"/><rect x="15" y="12" width="10" height="16" rx="2"/><rect x="27" y="12" width="10" height="16" rx="2"/>',
  tiempo: '<path d="M4 20h32" stroke-width="2" fill="none"/><circle cx="8" cy="20" r="3"/><circle cx="16" cy="20" r="3"/><circle cx="24" cy="20" r="3"/><circle cx="32" cy="20" r="3"/>',
  pasos: '<path d="M3 14h9l4 6-4 6H3z"/><path d="M15 14h9l4 6-4 6h-9l4-6z"/><path d="M27 14h9l4 6-4 6h-9l4-6z" opacity=".6"/>', comparar: '<rect x="4" y="9" width="14" height="22" rx="2" fill="none" stroke-width="2"/><rect x="22" y="9" width="14" height="22" rx="2"/>',
  cita: '<text x="8" y="28" font-size="26" font-weight="800">“</text><path d="M18 18h16M18 24h12" stroke-width="2"/>', etiqueta: '<rect x="6" y="14" width="28" height="12" rx="6"/>',
  progreso: '<rect x="4" y="17" width="32" height="6" rx="3" opacity=".3"/><rect x="4" y="17" width="20" height="6" rx="3"/>', circulo: '<circle cx="20" cy="20" r="12"/>', marco: '<rect x="5" y="7" width="30" height="26" rx="3" fill="none" stroke-width="2"/>',
};
const TR_CSS = { fade: 'desvanecer', push: 'empujar', wipe: 'barrer', cover: 'cubrir', split: 'dividir', zoom: 'acercar', dissolve: 'desvanecer', circle: 'circulo', random: 'desvanecer', cut: 'nada' };

export function crearInsertar(U){
  const { h, $, $$, hoja, cerrar, aviso, ocupado, segmento, plural, selectorColor, aplicar, N, D, abrirVisor, objetivo, sel } = U;
  let seccion = 'formas', color = null, texto = '', dondeV = null;
  const svgPeq = (cont, c) => `<svg viewBox="0 0 40 40" width="40" height="40" fill="${c}" stroke="${c}" aria-hidden="true">${cont}</svg>`;

  /* ══ LA HOJA DE INSERTAR ══ */
  function panel(){
    const d = D();
    const pal = N.paletaTema(d);
    color = color || '#' + (pal.accent1 || 'AC27FF');
    const actual = U.actual();
    const dondeOp = [['esta', `Lámina ${actual + 1}`], ...(sel().size ? [['elegidas', `Elegidas · ${sel().size}`]] : []), ['todas', `Todas · ${d.laminas.length}`]];
    if(!dondeV || !dondeOp.some(([v]) => v === dondeV)) dondeV = 'esta';
    const cuerpo = h('div');
    const temaColores = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'dk2', 'lt2'].map((k) => pal[k] && '#' + pal[k]).filter(Boolean);
    const zonaColor = h('div');
    const pintaColor = () => zonaColor.replaceChildren(h('div', { class: 'seccion' }, h('h3', {}, 'Color'), selectorColor(color, (c) => { color = c; pintaSeccion(); }, temaColores)));
    const pestañas = h('div', { class: 'ejemplos filtros', role: 'tablist' });
    const pintaPestanas = () => pestañas.replaceChildren(...[['formas', 'Formas'], ['iconos', 'Iconos'], ['disenos', 'Diseños'], ['transiciones', 'Transiciones'], ['mios', 'Mis elementos']].map(([v, t]) =>
      h('button', { class: 'chip', type: 'button', role: 'tab', 'aria-selected': String(seccion === v), 'aria-pressed': String(seccion === v), 'data-seccion': v, on: { click: () => { seccion = v; pintaPestanas(); pintaSeccion(); } } }, t)));
    const pintaSeccion = () => {
      zonaColor.hidden = seccion === 'transiciones' || seccion === 'mios';
      if(seccion === 'formas') seccionFormas(cuerpo);
      else if(seccion === 'iconos') seccionIconos(cuerpo);
      else if(seccion === 'disenos') seccionDisenos(cuerpo);
      else if(seccion === 'transiciones') seccionTransiciones(cuerpo);
      else U.misElementos(cuerpo, destino);
    };
    pintaPestanas(); pintaColor(); pintaSeccion();
    hoja('Insertar', [
      h('div', { class: 'seccion', style: { marginBottom: '14px' } }, h('h3', {}, 'Dónde'), segmento(dondeOp, dondeV, (v) => { dondeV = v; })),
      pestañas, zonaColor, cuerpo,
    ]);
  }
  /* A qué láminas va lo que se inserta. */
  const destino = () => dondeV === 'esta' ? [U.actual()] : dondeV === 'elegidas' ? [...sel()].sort((a, b) => a - b) : 'todas';
  /* Inserta con fn(i) en el destino; si fue una sola lámina, la abre con el elemento elegido. */
  async function insertar(nombre, fn, mensaje){
    const dst = destino();
    const r = await aplicar(nombre, () => N.insertarEn(D(), dst, fn), (ids) => ids.length === 1 ? `${mensaje} Arrástralo para acomodarlo.` : `${mensaje} En ${plural(ids.length, 'lámina', 'láminas')}.`);
    if(!r?.length) return;
    cerrar('#hoja');
    if(r.length === 1){ elegido = { lamina: r[0].lamina, cid: r[0].cid }; abrirVisor(r[0].lamina); }
  }

  function seccionFormas(cuerpo){
    const tx = h('input', { class: 'entrada', type: 'text', placeholder: 'Texto adentro (opcional)', value: texto, on: { input: (e) => { texto = e.target.value; } } });
    cuerpo.replaceChildren(
      h('div', { class: 'rejilla-insertar' }, N.FORMAS.map(([geo, nombre]) => h('button', { class: 'pieza', type: 'button', 'data-forma': geo, title: nombre, on: { click: () => {
        const d = D(), W = d.ancho, H = d.alto;
        const linea = geo === 'line' || geo === 'lineaFlecha';
        const w = linea ? W * 0.3 : Math.min(W, H) * 0.3, alto = linea ? 0 : (geo === 'rect' || geo === 'roundRect' || geo === 'homePlate' || geo === 'parallelogram' ? w * 0.6 : w);
        const sobre = N.contraste('#FFFFFF', color) >= N.contraste('#141018', color) ? '#FFFFFF' : '#141018';
        insertar(`Forma: ${nombre}`, (i) => N.insertarForma(d, i, { geo, x: (W - w) / 2, y: (H - alto) / 2, w, h: alto, relleno: color, redondeo: geo === 'roundRect' ? 0.16 : undefined,
          ...(texto.trim() && !linea ? { texto: texto.trim(), pt: (W / 12700 / 960) * 24, negrita: true, colorTexto: sobre } : {}) }), `${nombre} puesta.`);
      } } }, h('span', { innerHTML: svgPeq(DIBUJO[geo] || DIBUJO.rect, color) }), h('small', {}, nombre)))),
      h('label', { class: 'campo', style: { marginTop: '12px' } }, 'Texto dentro de la forma', tx));
  }

  async function seccionIconos(cuerpo){
    const q = h('input', { class: 'entrada', type: 'search', placeholder: 'Busca en español: escuela, dinero, idea…', enterkeyhint: 'search', 'aria-label': 'Buscar iconos' });
    const rejilla = h('div', { class: 'rejilla-iconos' }, h('span', { class: 'pensando' }, h('i'), h('i'), h('i')));
    let grosor = 2;
    cuerpo.replaceChildren(q, h('div', { style: { height: '8px' } }), segmento([['1.5', 'Fino'], ['2', 'Normal'], ['2.75', 'Grueso']], '2', (v) => { grosor = Number(v); pinta(); }), rejilla,
      h('p', { class: 'nota' }, 'Iconos de Lucide (libres). Entran como imagen nítida (PNG + su versión vectorial) del color elegido.'));
    let turno = 0;
    const pinta = async () => {
      const t = ++turno;
      let nombres;
      try{ nombres = await ICONOS.buscar(q.value); }catch{ rejilla.replaceChildren(h('p', {}, 'No se pudieron cargar los iconos.')); return; }
      if(t !== turno) return;
      const { iconos } = await ICONOS.cargar();
      rejilla.replaceChildren(...(nombres.length ? nombres.map((n) => h('button', { class: 'pieza icono', type: 'button', title: n, 'data-icono': n, on: { click: async () => {
        const d = D(), lado = d.alto * 0.16;
        ocupado('Preparando el icono…');
        let arch; try{ arch = await ICONOS.archivos(n, { color, grosor }); }finally{ ocupado(''); }
        insertar(`Icono: ${n}`, (i) => N.insertarImagen(d, i, { ...arch, x: (d.ancho - lado) / 2, y: (d.alto - lado) / 2, w: lado, h: lado, nombre: `Icono lucide:${n}` }), 'Icono puesto.');
      } } }, h('span', { innerHTML: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconos[n]}</svg>` })))
        : [h('p', { class: 'nota' }, `Nada con «${q.value}». Prueba otra palabra (también sirve en inglés).`)]));
    };
    let espera; q.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(pinta, 180); });
    pinta();
  }

  function seccionDisenos(cuerpo){
    cuerpo.replaceChildren(h('div', { class: 'acciones' }, N.DISENOS.map(([id, nombre, desc]) => h('button', { class: 'accion', type: 'button', 'data-diseno': id, on: { click: () => {
      insertar(`Diseño: ${nombre}`, (i) => N.insertarDiseno(D(), i, id, { color }), `«${nombre}» puesto. Toca sus textos abajo para cambiarlos.`);
    } } }, h('i', { innerHTML: svgPeq(DIBUJO_DISENO[id] || '', color) }), h('b', {}, nombre), h('span', {}, desc)))));
  }

  function seccionTransiciones(cuerpo){
    let tipo = 'fade', dir = 'l', vel = 'med', solo = false, segundos = 5;
    const zonaDir = h('div');
    const muestra = h('div', { class: 'muestra-tr' }, h('div', { class: 'tr-a' }, 'A'), h('div', { class: 'tr-b' }, 'B'));
    const anima = () => { const b = muestra.querySelector('.tr-b'); b.className = 'tr-b'; void b.offsetWidth; b.className = `tr-b tr-${TR_CSS[tipo] || 'desvanecer'} dir-${dir}`; muestra.classList.add('corre'); };
    const pintaDir = () => zonaDir.replaceChildren(['push', 'wipe', 'cover'].includes(tipo) ? h('div', { class: 'seccion' }, h('h3', {}, 'Hacia dónde'), segmento([['l', '← Izq.'], ['r', 'Der. →'], ['u', '↑ Arriba'], ['d', 'Abajo ↓']], dir, (v) => { dir = v; anima(); })) : '');
    const seg = h('input', { type: 'number', min: '1', max: '120', value: '5', class: 'entrada', style: { width: '90px' }, on: { input: (e) => { segundos = Number(e.target.value) || 5; } } });
    const chk = h('input', { type: 'checkbox', on: { change: (e) => { solo = e.target.checked; } } });
    cuerpo.replaceChildren(
      muestra,
      h('div', { class: 'rejilla-insertar' }, N.TRANSICIONES.map(([id, nombre]) => h('button', { class: 'pieza tr', type: 'button', 'data-transicion': id, 'aria-pressed': String(id === tipo), on: { click: (e) => {
        tipo = id; $$('[data-transicion]', cuerpo).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.transicion === id))); pintaDir(); anima();
      } } }, h('small', {}, nombre)))),
      zonaDir,
      h('div', { class: 'seccion' }, h('h3', {}, 'Velocidad'), segmento([['fast', 'Rápida'], ['med', 'Normal'], ['slow', 'Lenta']], vel, (v) => { vel = v; })),
      h('label', { class: 'check' }, chk, h('span', {}, 'Que pase sola a la siguiente después de ', seg, ' segundos')),
      h('div', { class: 'fila dos' },
        h('button', { class: 'btn primario', type: 'button', 'data-poner-transicion': '', on: { click: async () => {
          const dst = destino();
          await aplicar('Transición', () => N.ponerTransicion(D(), dst, { tipo, dir, vel, segundos: solo ? segundos : 0 }), (n) => tipo === 'ninguna' ? `Sin transición en ${plural(n, 'lámina', 'láminas')}.` : `Transición en ${plural(n, 'lámina', 'láminas')}. Míralas con «Presentar».`);
        } } }, 'Ponerla'),
        h('button', { class: 'btn', type: 'button', on: { click: async () => { const dst = destino(); await aplicar('Quitar transiciones', () => N.ponerTransicion(D(), dst, { tipo: 'ninguna' }), (n) => `Sin transición en ${plural(n, 'lámina', 'láminas')}.`); } } }, 'Quitar')),
      h('p', { class: 'nota' }, 'Son las transiciones estándar: se ven igual en PowerPoint, Keynote y Google Slides.'));
    pintaDir(); anima();
  }

  /* ══ EDITAR EN LA VISTA GRANDE ══ */
  let elegido = null;       // { lamina, cid }
  function montarEditor(marco, i, alCambiar){
    const d = D();
    const pintarSel = () => {
      $$('.seleccion', marco).forEach((x) => x.remove());
      U.pintarBarraElemento(elegido && elegido.lamina === i ? elegido.cid : null);
      if(!elegido || elegido.lamina !== i) return;
      const c = N.cajaDe(d, i, elegido.cid);
      if(!c){ elegido = null; U.pintarBarraElemento(null); return; }
      const k = marco.clientWidth / d.ancho;
      const caja = h('div', { class: 'seleccion', 'data-cid': elegido.cid, style: { left: c.x * k + 'px', top: c.y * k + 'px', width: Math.max(12, c.w * k) + 'px', height: Math.max(12, c.h * k) + 'px' } },
        ...['nw', 'ne', 'sw', 'se'].map((q) => h('span', { class: `asa ${q}`, 'data-asa': q })));
      marco.append(caja);
      arrastrable(caja, marco, i, c, k, alCambiar);
    };
    marco.addEventListener('click', (e) => {
      if(e.target.closest('.seleccion')) return;
      const f = e.target.closest('[data-cid]');
      elegido = f ? { lamina: i, cid: Number(f.dataset.cid) } : null;
      pintarSel();
    });
    // Mover con las flechas y borrar con Supr, en la compu.
    marco.tabIndex = 0;
    marco.addEventListener('keydown', async (e) => {
      if(!elegido || elegido.lamina !== i) return;
      const paso = d.ancho * (e.shiftKey ? 0.05 : 0.01);
      const mov = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
      if(mov){ e.preventDefault(); const c = N.cajaDe(d, i, elegido.cid); await aplicar('Mover', () => N.moverForma(d, i, elegido.cid, { x: c.x + mov[0], y: c.y + mov[1] }), null); alCambiar(); }
      if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); await U.accionElemento('borrar'); }
    });
    requestAnimationFrame(pintarSel);
    return pintarSel;
  }
  function arrastrable(caja, marco, i, c0, k, alCambiar){
    const d = D();
    let inicio = null;
    caja.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      caja.setPointerCapture(e.pointerId);
      inicio = { x: e.clientX, y: e.clientY, asa: e.target.dataset.asa || null, l: caja.offsetLeft, t: caja.offsetTop, w: caja.offsetWidth, hh: caja.offsetHeight, movio: false };
    });
    caja.addEventListener('pointermove', (e) => {
      if(!inicio) return;
      const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
      if(Math.abs(dx) + Math.abs(dy) > 3) inicio.movio = true;
      let { l, t, w, hh } = inicio;
      const fijo = c0.imagen || c0.grupo;          // fotos, iconos y diseños no se deforman
      if(!inicio.asa){ l += dx; t += dy; }
      else{
        const sx = inicio.asa.includes('w') ? -1 : 1, sy = inicio.asa.includes('n') ? -1 : 1;
        let nw = Math.max(12, w + sx * dx), nh = Math.max(12, hh + sy * dy);
        if(fijo){ const r = w / Math.max(1, hh); if(nw / nh > r) nh = nw / r; else nw = nh * r; }
        if(sx < 0) l += w - nw;
        if(sy < 0) t += hh - nh;
        w = nw; hh = nh;
      }
      Object.assign(caja.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: hh + 'px' });
      // El elemento se ve moverse (sólo al mover; el tamaño se ve al soltar).
      if(!inicio.asa){ const esc = marco.clientWidth / 960; $$(`.lienzo [data-cid="${c0Cid(caja)}"]`, marco).forEach((el) => { el.style.translate = `${dx / esc}px ${dy / esc}px`; }); }
    });
    caja.addEventListener('pointerup', async () => {
      if(!inicio) return;
      const movio = inicio.movio; inicio = null;
      if(!movio) return;
      const x = caja.offsetLeft / k, y = caja.offsetTop / k, w = caja.offsetWidth / k, hh = caja.offsetHeight / k;
      const cid = c0Cid(caja);
      await aplicar(c0.grupo ? 'Mover diseño' : 'Mover', () => N.moverForma(d, i, cid, c0.h === 0 || c0.tipo === 'cxnSp' ? { x, y, w } : { x, y, w, h: hh }), null);
      alCambiar();
    });
  }
  const c0Cid = (caja) => Number(caja.dataset.cid);

  /* ══ PRESENTAR ══ */
  async function presentar(desde = 0){
    const d = D();
    const dlg = $('#presentar');
    let i = desde, reloj = null, ocupadoTr = false;
    const escenario = $('#presentar-escenario');
    const cuenta = $('#presentar-cuenta');
    const medir = () => {
      const W = innerWidth, H = innerHeight, r = d.ancho / d.alto;
      const w = Math.min(W, H * r), hh = w / r;
      escenario.style.width = w + 'px'; escenario.style.height = hh + 'px';
      escenario.style.setProperty('--k', w / 960);
    };
    const lamina = async (j) => { const m = await N.modelo(d, j); const div = h('div', { class: 'diapo' }, U.V.pintar(m)); return { div, m }; };
    const mostrar = async (j, animar = true) => {
      if(ocupadoTr || j < 0 || j >= d.laminas.length) return;
      ocupadoTr = true;
      clearTimeout(reloj);
      const { div, m } = await lamina(j);
      const vieja = escenario.querySelector('.diapo:last-child');
      const tr = m.transicion;
      const clase = animar && tr && tr.tipo !== 'cut' ? `tr-${TR_CSS[tr.tipo] || 'desvanecer'} dir-${tr.dir || 'l'} vel-${tr.vel || 'med'}` : '';
      div.className = `diapo entra ${clase}`;
      if(vieja && clase && tr.tipo === 'push') vieja.className = `diapo sale tr-empujar dir-${tr.dir || 'l'} vel-${tr.vel || 'med'}`;
      escenario.append(div);
      const ms = clase ? ({ fast: 450, med: 750, slow: 1100 }[tr.vel] || 750) : 0;
      setTimeout(() => { vieja?.remove(); div.classList.remove('entra'); ocupadoTr = false; }, ms + 30);
      i = j;
      cuenta.textContent = `${i + 1} / ${d.laminas.length}`;
      cuenta.classList.remove('desvanece'); void cuenta.offsetWidth; cuenta.classList.add('desvanece');
      if(tr?.segundos && i < d.laminas.length - 1) reloj = setTimeout(() => mostrar(i + 1), tr.segundos * 1000 + ms);
    };
    const toque = (e) => { if(e.target.closest('button')) return; (e.clientX > innerWidth * 0.35 ? mostrar(i + 1) : mostrar(i - 1)); };
    const tecla = (e) => { if(['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)){ e.preventDefault(); mostrar(i + 1); } if(['ArrowLeft', 'PageUp'].includes(e.key)){ e.preventDefault(); mostrar(i - 1); } };
    let x0 = null;
    const tIni = (e) => { x0 = e.touches[0].clientX; };
    const tFin = (e) => { if(x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if(Math.abs(dx) > 50){ e.preventDefault(); dx < 0 ? mostrar(i + 1) : mostrar(i - 1); } };
    escenario.replaceChildren();
    medir();
    addEventListener('resize', medir);
    dlg.addEventListener('click', toque);
    dlg.addEventListener('keydown', tecla);
    dlg.addEventListener('touchstart', tIni, { passive: true });
    dlg.addEventListener('touchend', tFin);
    dlg.addEventListener('close', () => { clearTimeout(reloj); removeEventListener('resize', medir); dlg.removeEventListener('click', toque); dlg.removeEventListener('keydown', tecla); dlg.removeEventListener('touchstart', tIni); dlg.removeEventListener('touchend', tFin); try{ if(document.fullscreenElement) document.exitFullscreen(); }catch{} }, { once: true });
    dlg.showModal();
    try{ await dlg.requestFullscreen?.(); }catch{}
    await mostrar(desde, false);
    return { siguiente: () => mostrar(i + 1), anterior: () => mostrar(i - 1), get i(){ return i; } };
  }

  return { panel, montarEditor, presentar, get elegido(){ return elegido; }, fijarSeleccion: (lamina, cid) => { elegido = cid == null ? null : { lamina, cid }; } };
}
