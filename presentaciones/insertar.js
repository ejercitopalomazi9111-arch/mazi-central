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
import * as IA from './ia.js';
import * as EL from './elementos.js';

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
    const pestañas = h('div', { class: 'ejemplos filtros', role: 'tablist', style: { flexWrap: 'wrap', overflow: 'visible', marginBottom: '12px' } });
    const pintaPestanas = () => pestañas.replaceChildren(...[['formas', 'Formas'], ['iconos', 'Iconos'], ['tablas', 'Tablas'], ['graficas', 'Gráficas'], ['disenos', 'Diseños'], ['enlace', 'Enlace'], ['transiciones', 'Transiciones'], ['mios', 'Mis elementos']].map(([v, t]) =>
      h('button', { class: 'chip', type: 'button', role: 'tab', 'aria-selected': String(seccion === v), 'aria-pressed': String(seccion === v), 'data-seccion': v, on: { click: () => { seccion = v; pintaPestanas(); pintaSeccion(); } } }, t)));
    const pintaSeccion = () => {
      zonaColor.hidden = seccion === 'transiciones' || seccion === 'mios';
      if(seccion === 'formas') seccionFormas(cuerpo);
      else if(seccion === 'iconos') seccionIconos(cuerpo);
      else if(seccion === 'disenos') seccionDisenos(cuerpo);
      else if(seccion === 'transiciones') seccionTransiciones(cuerpo);
      else if(seccion === 'tablas') seccionTablas(cuerpo);
      else if(seccion === 'graficas') seccionGraficas(cuerpo);
      else if(seccion === 'enlace') seccionEnlace(cuerpo);
      else seccionMios(cuerpo);
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

  /* ══ LA TABLITA DE DATOS ══
     La misma para tablas y gráficas, como la de Canva: una rejilla de casillas,
     botones para sumar y quitar renglones y columnas, y PEGAR desde Excel o
     Google Sheets en cualquier casilla llena la rejilla desde ahí. */
  function editorDatos(datos0, { etiquetaFila = 'Renglón', etiquetaCol = 'Columna', minCols = 1, maxCols = 12, maxFilas = 40, cabezaCol = true } = {}){
    let datos = datos0.map((f) => [...f]);
    const rejilla = h('div', { class: 'rejilla-datos', role: 'grid' });
    const pinta = () => {
      const nc = Math.max(...datos.map((f) => f.length));
      datos = datos.map((f) => Array.from({ length: nc }, (_, c) => f[c] ?? ''));
      rejilla.style.gridTemplateColumns = `repeat(${nc}, minmax(96px, 1fr))`;
      rejilla.replaceChildren(...datos.flatMap((f, r) => f.map((v, c) => h('input', {
        class: 'casilla' + (r === 0 || (cabezaCol && c === 0) ? ' cabeza' : ''), value: v, 'data-r': r, 'data-c': c, 'aria-label': `${etiquetaFila} ${r + 1}, ${etiquetaCol.toLowerCase()} ${c + 1}`,
        inputmode: r > 0 && c > 0 && datos0.numeros ? 'decimal' : 'text',
        on: {
          input: (e) => { datos[r][c] = e.target.value; },
          paste: (e) => {
            const t = e.clipboardData?.getData('text/plain') || '';
            if(!/[\t\n]/.test(t.trim())) return;
            e.preventDefault();
            const bloque = t.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
            bloque.forEach((fila, i) => fila.forEach((v, j) => { while(datos.length <= r + i && datos.length < maxFilas) datos.push(Array(datos[0].length).fill('')); if(datos[r + i]){ while(datos[r + i].length <= c + j && datos[r + i].length < maxCols) datos.forEach((ff) => ff.push('')); datos[r + i][c + j] = v.trim(); } }));
            pinta();
          },
        },
      }))));
    };
    const boton = (t, fn, extra = {}) => h('button', { class: 'chip', type: 'button', on: { click: () => { fn(); pinta(); } }, ...extra }, t);
    const nodo = h('div', { class: 'editor-datos' },
      h('div', { class: 'marco-datos' }, rejilla),
      h('div', { class: 'ejemplos' },
        boton(`＋ ${etiquetaFila}`, () => { if(datos.length < maxFilas) datos.push(Array(datos[0].length).fill('')); }, { 'data-mas-fila': '' }),
        boton(`− ${etiquetaFila}`, () => { if(datos.length > 2) datos.pop(); }, { 'data-menos-fila': '' }),
        boton(`＋ ${etiquetaCol}`, () => { if(datos[0].length < maxCols) datos.forEach((f) => f.push('')); }, { 'data-mas-col': '' }),
        boton(`− ${etiquetaCol}`, () => { if(datos[0].length > minCols + 1) datos.forEach((f) => f.pop()); }, { 'data-menos-col': '' })),
      h('p', { class: 'nota' }, 'Tip: copia celdas de Excel o Google Sheets y pégalas en cualquier casilla.'));
    pinta();
    return { nodo, leer: () => datos.map((f) => f.map((v) => String(v ?? '').trim())) };
  }

  /* ══ TABLAS ══ */
  let tablaF = 4, tablaC = 3, estiloTabla = 'tema';
  function miniTabla(estilo, c){
    const filas = [0, 1, 2, 3].map((r) => { const st = r === 0 ? { tema: c, oscuro: '#1E1E24', cebra: 'transparent', limpio: 'transparent', contorno: 'transparent' }[estilo] : { tema: r % 2 ? `${c}26` : '#FFFFFF', oscuro: r % 2 ? '#F3F3F6' : '#FFFFFF', cebra: r % 2 ? '#FFFFFF22' : 'transparent', limpio: 'transparent', contorno: 'transparent' }[estilo];
      return `<rect x="2" y="${2 + r * 9}" width="36" height="9" fill="${st}" ${estilo === 'contorno' ? `stroke="${c}"` : ''}/>${estilo === 'limpio' && r === 0 ? `<rect x="2" y="10" width="36" height="1.5" fill="${c}"/>` : ''}`; }).join('');
    return `<svg viewBox="0 0 40 40" width="44" height="44" aria-hidden="true">${filas}<path d="M14 2v36M26 2v36" stroke="${estilo === 'contorno' ? c : '#88888866'}" stroke-width=".8"/></svg>`;
  }
  function seccionTablas(cuerpo){
    const MAXF = 8, MAXC = 6;
    const etiqueta = h('b', { class: 'medida-tabla' });
    const cuadros = h('div', { class: 'elegir-tamano', role: 'group', 'aria-label': 'Tamaño de la tabla' });
    const pintaCuadros = () => {
      etiqueta.textContent = `${tablaF} renglones × ${tablaC} columnas`;
      cuadros.replaceChildren(...Array.from({ length: MAXF * MAXC }, (_, k) => { const r = Math.floor(k / MAXC) + 1, c = k % MAXC + 1;
        return h('button', { type: 'button', class: 'cuadro' + (r <= tablaF && c <= tablaC ? ' si' : ''), 'aria-label': `${r} × ${c}`, 'data-tam': `${r}x${c}`, on: { click: () => { tablaF = r; tablaC = c; pintaCuadros(); } } }); }));
    };
    const pegado = h('textarea', { class: 'entrada', rows: '3', placeholder: 'Opcional: pega aquí celdas de Excel o Google Sheets y la tabla sale con esos datos' });
    const estilos = h('div', { class: 'rejilla-insertar' }, N.ESTILOS_TABLA.map(([v, t]) => h('button', { class: 'pieza', type: 'button', 'data-estilo-tabla': v, 'aria-pressed': String(v === estiloTabla), on: { click: () => { estiloTabla = v; $$('[data-estilo-tabla]', cuerpo).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.estiloTabla === v))); } } },
      h('span', { innerHTML: miniTabla(v, color) }), h('small', {}, t))));
    pintaCuadros();
    cuerpo.replaceChildren(
      h('div', { class: 'seccion' }, h('h3', {}, 'Tamaño'), etiqueta, cuadros),
      h('div', { class: 'seccion' }, h('h3', {}, 'Estilo'), estilos),
      h('label', { class: 'campo' }, 'Datos', pegado),
      h('button', { class: 'btn primario ancho', type: 'button', 'data-poner-tabla': '', style: { marginTop: '12px' }, on: { click: () => {
        const tsv = pegado.value.replace(/\r/g, '').trim();
        const datos = tsv ? tsv.split('\n').map((l) => l.split(/\t|;|,(?=\S)/).map((x) => x.trim())).slice(0, 40)
          : Array.from({ length: tablaF }, (_, r) => Array.from({ length: tablaC }, (_, c) => r === 0 ? `Título ${c + 1}` : ''));
        insertar('Tabla', (i) => N.insertarTabla(D(), i, { datos, estilo: estiloTabla, color }), `Tabla de ${datos.length} × ${Math.max(...datos.map((f) => f.length))} puesta. Toca «▦ Editar tabla» para llenarla.`);
      } } }, 'Poner tabla'));
  }
  function editarTabla(i, cid, listo){
    const t = N.tablaDe(D(), i, cid);
    if(!t) return;
    let est = t.estilo, col = t.color || color || '#AC27FF';
    const ed = editorDatos(t.datos, { etiquetaFila: 'Renglón', etiquetaCol: 'Columna', minCols: 0, cabezaCol: false });
    const estilos = h('div', { class: 'ejemplos' }, [['', 'Como está'], ...N.ESTILOS_TABLA].map(([v, tx]) => h('button', { class: 'chip', type: 'button', 'data-estilo-tabla': v, 'aria-pressed': String((est || '') === v), on: { click: (e) => { est = v || null; $$('[data-estilo-tabla]', e.target.parentNode).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.estiloTabla === v))); } } }, tx)));
    hoja('Editar tabla', [ed.nodo,
      h('div', { class: 'seccion' }, h('h3', {}, 'Estilo'), estilos),
      h('div', { class: 'seccion' }, h('h3', {}, 'Color'), selectorColor(col, (c) => { col = c; if(!est) est = 'tema'; })),
      h('button', { class: 'btn primario ancho', type: 'button', 'data-guardar-tabla': '', on: { click: async () => {
        cerrar('#hoja2');
        await aplicar('Editar tabla', () => N.ponerTabla(D(), i, cid, { datos: ed.leer(), estilo: est, color: est ? col : null }), 'Tabla actualizada.');
        listo?.();
      } } }, 'Listo')], '#hoja2');
  }

  /* ══ GRÁFICAS ══ */
  const DIBUJO_GRAFICA = {
    columnas: '<rect x="6" y="18" width="7" height="16"/><rect x="16" y="10" width="7" height="24"/><rect x="26" y="22" width="7" height="12"/>',
    barras: '<rect x="6" y="6" width="22" height="7"/><rect x="6" y="16" width="28" height="7"/><rect x="6" y="26" width="14" height="7"/>',
    lineas: '<path d="M5 30 15 18l8 6 12-14" fill="none" stroke-width="3" stroke-linejoin="round"/>',
    area: '<path d="M5 34V26l10-10 8 6 12-12v24z"/>',
    pastel: '<path d="M20 20V5a15 15 0 1 1-13 22z"/><path d="M20 20 7 27A15 15 0 0 1 20 5z" opacity=".5"/>',
    dona: '<path fill-rule="evenodd" d="M20 5a15 15 0 1 1 0 30 15 15 0 0 1 0-30zm0 8a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/>',
  };
  let tipoGrafica = 'columnas';
  const datosDeGrafica = (g) => [['', ...g.series.map((s) => s.nombre)], ...g.categorias.map((c, j) => [c, ...g.series.map((s) => String(s.valores[j] ?? ''))])];
  const graficaDeDatos = (datos, extra) => ({ ...extra, categorias: datos.slice(1).map((f) => f[0]), series: datos[0].slice(1).map((nombre, k) => ({ nombre: nombre || `Serie ${k + 1}`, valores: datos.slice(1).map((f) => f[k + 1]) })) });
  function opcionesGrafica(g){
    const titulo = h('input', { class: 'entrada', type: 'text', value: g.titulo || '', placeholder: 'Título (opcional)', 'aria-label': 'Título de la gráfica' });
    const chk = (t, v, attr) => { const c = h('input', { type: 'checkbox', checked: !!v, [attr]: '' }); return [c, h('label', { class: 'check' }, c, h('span', {}, t))]; };
    const [cVal, lVal] = chk('Mostrar los números', g.valores ?? true, 'data-mostrar-valores');
    const [cLey, lLey] = chk('Mostrar la leyenda', g.leyenda ?? false, 'data-mostrar-leyenda');
    const [cApi, lApi] = chk('Apilada (una sobre otra)', g.apilada, 'data-apilada');
    return { nodo: [h('label', { class: 'campo' }, 'Título', titulo), lVal, lLey, lApi], leer: () => ({ titulo: titulo.value.trim(), valores: cVal.checked, leyenda: cLey.checked, apilada: cApi.checked }) };
  }
  function tiposGrafica(alElegir, actual){
    return h('div', { class: 'rejilla-insertar' }, N.TIPOS_GRAFICA.map(([v, t]) => h('button', { class: 'pieza', type: 'button', 'data-tipo-grafica': v, 'aria-pressed': String(v === actual), on: { click: (e) => { alElegir(v); $$('[data-tipo-grafica]', e.currentTarget.parentNode).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipoGrafica === v))); } } },
      h('span', { innerHTML: `<svg viewBox="0 0 40 40" width="40" height="40" fill="${color}" stroke="${color}" aria-hidden="true">${DIBUJO_GRAFICA[v]}</svg>` }), h('small', {}, t))));
  }
  function seccionGraficas(cuerpo){
    const base = [['', 'Ventas', 'Meta'], ['Ene', '12', '15'], ['Feb', '19', '15'], ['Mar', '8', '15'], ['Abr', '15', '15']];
    base.numeros = true;
    const ed = editorDatos(base, { etiquetaFila: 'Dato', etiquetaCol: 'Serie' });
    const op = opcionesGrafica({ valores: true, leyenda: true });
    const pal = N.paletaTema(D());
    cuerpo.replaceChildren(
      h('div', { class: 'seccion' }, h('h3', {}, 'Tipo'), tiposGrafica((v) => { tipoGrafica = v; }, tipoGrafica)),
      h('div', { class: 'seccion' }, h('h3', {}, 'Datos'), h('p', { class: 'nota' }, 'La primera columna son las etiquetas; cada columna de a lado es una serie. Pastel y dona usan sólo la primera.'), ed.nodo),
      h('div', { class: 'seccion' }, h('h3', {}, 'Opciones'), ...op.nodo),
      h('button', { class: 'btn primario ancho', type: 'button', 'data-poner-grafica': '', on: { click: () => {
        const colores = [color, ...['accent2', 'accent3', 'accent4', 'accent5', 'accent6'].map((k) => pal[k] && '#' + pal[k]).filter(Boolean)];
        const g = graficaDeDatos(ed.leer(), { tipo: tipoGrafica, colores, ...op.leer() });
        insertar('Gráfica', (i) => N.insertarGrafica(D(), i, g), 'Gráfica puesta. Toca «📊 Editar datos» para cambiarla.');
      } } }, 'Poner gráfica'));
  }
  async function editarGrafica(i, cid, listo){
    const g = await N.graficaDe(D(), i, cid);
    if(!g){ aviso('No pude leer esa gráfica.', 'mal'); return; }
    let tipo = g.tipo;
    const datos = datosDeGrafica(g); datos.numeros = true;
    const ed = editorDatos(datos, { etiquetaFila: 'Dato', etiquetaCol: 'Serie' });
    const op = opcionesGrafica(g);
    hoja('Editar gráfica', [tiposGrafica((v) => { tipo = v; }, tipo), h('div', { class: 'seccion' }, h('h3', {}, 'Datos'), ed.nodo), h('div', { class: 'seccion' }, h('h3', {}, 'Opciones'), ...op.nodo),
      h('button', { class: 'btn primario ancho', type: 'button', 'data-guardar-grafica': '', on: { click: async () => {
        cerrar('#hoja2');
        const nueva = graficaDeDatos(ed.leer(), { ...g, tipo, ...op.leer() });
        nueva.series = nueva.series.map((s, k) => ({ ...s, color: g.series[k]?.color || null }));
        await aplicar('Editar gráfica', () => N.ponerGrafica(D(), i, cid, nueva), 'Gráfica actualizada.');
        listo?.();
      } } }, 'Listo')], '#hoja2');
  }

  /* ══ ENLACES ══ */
  function seccionEnlace(cuerpo){
    const texto = h('input', { class: 'entrada', type: 'text', placeholder: 'Lo que se lee: «Ver el video», «Escríbenos»…', 'aria-label': 'Texto del enlace' });
    const url = h('input', { class: 'entrada', type: 'url', inputmode: 'url', autocapitalize: 'off', placeholder: 'www.ejemplo.com, un correo o un WhatsApp (wa.me/52…)', 'aria-label': 'Link' });
    cuerpo.replaceChildren(
      h('label', { class: 'campo' }, 'Texto', texto), h('label', { class: 'campo' }, 'Link', url),
      h('p', { class: 'nota' }, 'Al presentar, o en PowerPoint y Keynote, tocar el texto abre el link. Para ponerle link a algo que ya está en la lámina (una imagen, un icono, un botón), tócalo en la vista grande y «🔗 Enlace».'),
      h('button', { class: 'btn primario ancho', type: 'button', 'data-poner-enlace': '', on: { click: () => {
        if(!N.normalizarEnlace(url.value)){ aviso('Ese link no se entiende. Escríbelo como www.ejemplo.com', 'mal'); return; }
        const d = D();
        insertar('Enlace', (i) => N.insertarEnlace(d, i, { texto: texto.value, url: url.value, pt: (d.ancho / 12700 / 960) * 28, color }), 'Enlace puesto.');
      } } }, 'Poner enlace'));
  }
  async function editarEnlace(i, cid, listo){
    const actual = await N.enlaceDe(D(), i, cid);
    const url = h('input', { class: 'entrada', type: 'url', inputmode: 'url', autocapitalize: 'off', value: actual || '', placeholder: 'www.ejemplo.com', 'aria-label': 'Link' });
    hoja('Enlace', [h('label', { class: 'campo' }, 'Al tocar este elemento se abre', url),
      h('div', { class: 'fila dos' },
        actual ? h('button', { class: 'btn', type: 'button', 'data-quitar-enlace': '', on: { click: async () => { cerrar('#hoja2'); await aplicar('Quitar enlace', () => N.quitarEnlace(D(), i, cid), 'Enlace quitado.'); listo?.(); } } }, 'Quitar') : h('span'),
        h('button', { class: 'btn primario', type: 'button', 'data-guardar-enlace': '', on: { click: async () => {
          if(!N.normalizarEnlace(url.value)){ aviso('Ese link no se entiende.', 'mal'); return; }
          cerrar('#hoja2'); await aplicar('Enlace', () => N.ponerEnlace(D(), i, cid, url.value), 'Enlace puesto: al presentar, tocarlo lo abre.'); listo?.();
        } } }, 'Guardar'))], '#hoja2');
    setTimeout(() => url.focus(), 60);
  }

  /* ══ MIS ELEMENTOS ══ */
  let mios = null, cargandoMios = null, editandoMios = false, qMios = '', cuerpoMios = null;
  const datosMios = new Map();                 // id → datos listos para importar
  async function listaMios(forzar = false){
    if(mios && !forzar) return mios;
    if(!cargandoMios) cargandoMios = IA.elementos.lista().then((l) => { mios = l; return l; }).finally(() => { cargandoMios = null; });
    return cargandoMios;
  }
  function sinLlave(cuerpo, alListo){
    const en = h('input', { class: 'entrada', type: 'text', placeholder: 'Pega aquí el link de La Sala', 'aria-label': 'Link de La Sala' });
    cuerpo.replaceChildren(h('div', { class: 'mios-vacio' },
      h('p', {}, 'Tus elementos se guardan en La Sala, para que no se borren y se vean igual en el teléfono y en la compu. Falta la llave de La Sala en este teléfono.'),
      en, h('button', { class: 'btn primario ancho', type: 'button', style: { marginTop: '8px' }, on: { click: () => { if(IA.ponerLlave(en.value)) alListo(); else aviso('Ese link no trae llave.', 'mal'); } } }, 'Usar esta llave')));
  }
  async function seccionMios(cuerpo){
    cuerpoMios = cuerpo;
    if(!IA.llave()) return sinLlave(cuerpo, () => seccionMios(cuerpo));
    const crear = h('div', { class: 'fila dos' },
      h('button', { class: 'btn', type: 'button', 'data-crear': 'dibujo', on: { click: () => abrirDibujo() } }, '✎ Dibujar uno'),
      h('button', { class: 'btn', type: 'button', 'data-crear': 'ia', on: { click: () => abrirIconoIA() } }, '✦ Pedírselo a la IA'));
    const zona = h('div', { class: 'rejilla-mios' }, h('span', { class: 'pensando' }, h('i'), h('i'), h('i')));
    const cab = h('div');
    cuerpo.replaceChildren(crear, h('p', { class: 'nota' }, 'Para guardar algo que ya está en una lámina: ábrela en grande, tócalo y «★ A mis elementos».'), cab, zona);
    let l;
    try{ l = await listaMios(); }catch(e){ if(e.llave) return sinLlave(cuerpo, () => seccionMios(cuerpo)); zona.replaceChildren(h('p', { class: 'nota' }, e.message)); return; }
    const pinta = () => {
      const palabras = qMios.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
      const vis = l.filter((e) => { const n = e.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return palabras.every((w) => n.includes(w)); });
      if(!l.length){ zona.replaceChildren(h('p', { class: 'mios-vacio' }, 'Todavía no tienes elementos. Dibuja uno, pídeselo a la IA o guarda algo de una lámina.')); return; }
      zona.replaceChildren(...vis.map((e) => h('div', { class: 'mio', 'data-mio': e.id },
        h('button', { class: 'mio-poner', type: 'button', title: `Poner «${e.nombre}»`, on: { click: () => ponerMio(e) } }, EL.pintarVista(U.V, e.vista, 132, 84), h('small', {}, e.nombre)),
        editandoMios ? h('div', { class: 'mio-editar' },
          h('button', { class: 'chip', type: 'button', 'data-renombrar': e.id, 'aria-label': `Renombrar ${e.nombre}`, on: { click: () => renombrarMio(e, pinta) } }, '✎'),
          h('button', { class: 'chip peligro', type: 'button', 'data-borrar-mio': e.id, 'aria-label': `Borrar ${e.nombre}`, on: { click: () => borrarMio(e, () => { l = mios; pinta(); }) } }, '🗑')) : null)));
      if(!vis.length) zona.replaceChildren(h('p', { class: 'nota' }, `Nada con «${qMios}».`));
    };
    const q = h('input', { class: 'entrada', type: 'search', placeholder: 'Buscar en mis elementos', value: qMios, 'aria-label': 'Buscar en mis elementos', on: { input: (ev) => { qMios = ev.target.value; pinta(); } } });
    const bEditar = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(editandoMios), 'data-editar-mios': '', on: { click: () => { editandoMios = !editandoMios; bEditar.setAttribute('aria-pressed', String(editandoMios)); bEditar.textContent = editandoMios ? 'Listo' : 'Editar'; pinta(); } } }, editandoMios ? 'Listo' : 'Editar');
    cab.replaceChildren(l.length ? h('div', { class: 'mios-cab' }, l.length > 6 ? q : h('b', {}, plural(l.length, 'elemento', 'elementos')), bEditar) : '');
    pinta();
  }
  async function datosDe(e){
    if(!datosMios.has(e.id)) datosMios.set(e.id, EL.deEnvio(await IA.elementos.datos(e.id)));
    return datosMios.get(e.id);
  }
  async function ponerMio(e){
    ocupado(`Bajando «${e.nombre}»…`);
    let datos;
    try{ datos = await datosDe(e); }catch(err){ aviso('No se pudo bajar: ' + err.message, 'mal'); return; }finally{ ocupado(''); }
    insertar(`Mi elemento: ${e.nombre}`, (i) => N.importarElemento(D(), i, datos), `«${e.nombre}» puesto.`);
  }
  function renombrarMio(e, listo){
    const en = h('input', { class: 'entrada', type: 'text', value: e.nombre, maxlength: '80', 'aria-label': 'Nombre' });
    hoja('Renombrar', [en, h('button', { class: 'btn primario ancho', type: 'button', style: { marginTop: '12px' }, on: { click: async () => {
      try{ const n = await IA.elementos.renombrar(e.id, en.value); e.nombre = n.nombre; cerrar('#hoja2'); listo(); }catch(err){ aviso('No se pudo: ' + err.message, 'mal'); }
    } } }, 'Guardar nombre')], '#hoja2');
    setTimeout(() => en.select(), 50);
  }
  function borrarMio(e, listo){
    hoja('¿Borrar este elemento?', [h('p', {}, `«${e.nombre}» se borra de tus elementos. Lo que ya pusiste en tus láminas se queda.`),
      h('div', { class: 'fila dos' }, h('button', { class: 'btn', type: 'button', on: { click: () => cerrar('#hoja2') } }, 'No'),
        h('button', { class: 'btn peligro', type: 'button', 'data-confirmar-borrar': '', on: { click: async () => {
          try{ await IA.elementos.borrar(e.id); mios = mios.filter((x) => x.id !== e.id); datosMios.delete(e.id); cerrar('#hoja2'); aviso(`«${e.nombre}» borrado de tus elementos.`); listo(); }
          catch(err){ aviso('No se pudo: ' + err.message, 'mal'); }
        } } }, 'Sí, borrar'))], '#hoja2');
  }
  /* Guardar en la sala. `vista` ya armada. */
  async function guardarMio(nombre, origen, datos, vista){
    const e = await IA.elementos.guardar({ nombre, origen, datos: EL.aEnvio(datos), vista: JSON.stringify(vista) });
    if(mios) mios = [e, ...mios];
    datosMios.set(e.id, datos);
    return e;
  }
  /* Desde la vista grande: «★ A mis elementos». */
  async function guardarDeLamina(i, cid){
    if(!IA.llave()){ const c = h('div'); hoja('A mis elementos', c, '#hoja2'); sinLlave(c, () => { cerrar('#hoja2'); guardarDeLamina(i, cid); }); return; }
    const c = N.cajaDe(D(), i, cid);
    const sugerido = c?.icono ? `Icono ${c.icono}` : (c?.texto || '').replace(/\s+/g, ' ').trim().slice(0, 40) || (c?.grupo ? 'Mi diseño' : c?.imagen ? 'Mi imagen' : 'Mi forma');
    const en = h('input', { class: 'entrada', type: 'text', value: sugerido, maxlength: '80', 'aria-label': 'Nombre del elemento' });
    hoja('A mis elementos', [h('p', { class: 'nota' }, 'Queda guardado con sus colores, texto e imágenes, para ponerlo en cualquier presentación desde Insertar → Mis elementos.'),
      h('label', { class: 'campo' }, 'Nombre', en),
      h('button', { class: 'btn primario ancho', type: 'button', 'data-guardar-mio': '', style: { marginTop: '12px' }, on: { click: async () => {
        ocupado('Guardando…');
        try{
          const datos = await N.exportarElemento(D(), i, cid);
          const vista = await EL.vistaDe(N, D(), i, cid);
          const e = await guardarMio(en.value.trim() || sugerido, 'lamina', datos, vista);
          cerrar('#hoja2');
          aviso(`«${e.nombre}» guardado en Mis elementos.`, 'bien');
        }catch(err){ aviso('No se pudo guardar: ' + err.message, 'mal', { ms: 8000 }); }
        finally{ ocupado(''); }
      } } }, 'Guardar')], '#hoja2');
  }
  /* Cierre común de dibujo e IA: ponerlo, guardarlo, o las dos. */
  async function terminarImagen({ png, svg, proporcion, nombre, origen }, { poner, guardar }){
    const datos = N.elementoDeImagen({ png, svg, proporcion, nombre });
    if(guardar){
      ocupado('Guardando…');
      try{
        const url = URL.createObjectURL(new Blob([png.bytes], { type: png.mime }));
        const vista = await EL.vistaDeImagen(url, proporcion).finally(() => URL.revokeObjectURL(url));
        await guardarMio(nombre, origen, datos, vista);
        if(!poner) aviso(`«${nombre}» guardado en Mis elementos.`, 'bien');
      }catch(err){ aviso('No se pudo guardar: ' + err.message, 'mal', { ms: 8000 }); if(!poner) return; }
      finally{ ocupado(''); }
    }
    cerrar('#hoja2');
    if(poner) await insertar(`Mi elemento: ${nombre}`, (i) => N.importarElemento(D(), i, datos), `«${nombre}» puesto${guardar ? ' y guardado en Mis elementos' : ''}.`);
    else if(seccion === 'mios' && cuerpoMios?.isConnected) seccionMios(cuerpoMios);
  }
  const casillaGuardar = () => { const c = h('input', { type: 'checkbox', checked: !!IA.llave(), 'data-tambien-guardar': '' }); return [c, h('label', { class: 'check' }, c, h('span', {}, 'Guardarlo también en Mis elementos'))]; };

  function abrirDibujo(){
    const pal = N.paletaTema(D());
    const deTema = ['accent1', 'accent2', 'dk2', 'lt2'].map((k) => pal[k] && '#' + pal[k]).filter(Boolean);
    let tinta = color || '#AC27FF', grosor = 8;
    const lz = EL.lienzoDibujo({ color: () => tinta, grosor: () => grosor });
    const nombre = h('input', { class: 'entrada', type: 'text', value: 'Mi dibujo', maxlength: '80', 'aria-label': 'Nombre del dibujo' });
    const [chk, fila] = casillaGuardar();
    const listo = async (poner) => {
      const r = EL.trazosASvg(lz.trazos());
      if(!r){ aviso('Primero dibuja algo.', 'mal'); return; }
      const png = await EL.svgAPng(r.svg, r.w, r.h);
      await terminarImagen({ png, svg: { bytes: new TextEncoder().encode(r.svg) }, proporcion: r.w / r.h, nombre: nombre.value.trim() || 'Mi dibujo', origen: 'dibujo' }, { poner, guardar: poner ? chk.checked : true });
    };
    hoja('Dibujar', [
      selectorColor(tinta, (c) => { tinta = c; }, deTema),
      h('div', { style: { height: '8px' } }),
      segmento([['3', 'Fino'], ['8', 'Medio'], ['16', 'Grueso'], ['30', 'Plumón']], '8', (v) => { grosor = Number(v); }),
      h('div', { class: 'marco-dibujo' }, lz.nodo),
      h('div', { class: 'fila dos' }, h('button', { class: 'btn', type: 'button', on: { click: lz.deshacer } }, '↶ Quitar trazo'), h('button', { class: 'btn', type: 'button', on: { click: lz.limpiar } }, 'Empezar de nuevo')),
      h('label', { class: 'campo', style: { marginTop: '12px' } }, 'Nombre', nombre),
      fila,
      h('div', { class: 'fila dos' },
        h('button', { class: 'btn', type: 'button', 'data-solo-guardar': '', on: { click: () => listo(false) } }, 'Sólo guardarlo'),
        h('button', { class: 'btn primario', type: 'button', 'data-ponerlo': '', on: { click: () => listo(true) } }, 'Ponerlo')),
      h('p', { class: 'nota' }, 'Entra como imagen nítida (vectorial) con fondo transparente, recortada a lo que dibujaste.'),
    ], '#hoja2');
  }

  function abrirIconoIA(){
    let estilo = 'plano', resultado = null, tinta = color || '#AC27FF', quitar = true, crudo = null;
    const que = h('textarea', { class: 'entrada', rows: '2', placeholder: 'Qué quieres: «un foco con engranes», «una manzana sonriente», «un cohete despegando»…', 'aria-label': 'Qué icono quieres' });
    const vista = h('div', { class: 'vista-ia' }, h('span', { class: 'nota' }, 'Aquí sale lo que haga la IA.'));
    const nombre = h('input', { class: 'entrada', type: 'text', value: '', maxlength: '80', placeholder: 'Nombre', 'aria-label': 'Nombre del icono' });
    const [chk, fila] = casillaGuardar();
    const acciones = h('div', { class: 'fila dos', hidden: true },
      h('button', { class: 'btn', type: 'button', 'data-solo-guardar': '', on: { click: () => listo(false) } }, 'Sólo guardarlo'),
      h('button', { class: 'btn primario', type: 'button', 'data-ponerlo': '', on: { click: () => listo(true) } }, 'Ponerlo'));
    const chkFondo = h('input', { type: 'checkbox', checked: true, on: { change: async (e) => { quitar = e.target.checked; if(crudo) await procesar(); } } });
    const procesar = async () => {
      resultado = quitar ? await EL.quitarFondo(crudo.bytes, crudo.mime).catch(() => ({ ...crudo, ancho: 1, alto: 1 })) : crudo;
      if(!resultado.ancho){ const i = await IA.cargar(URL.createObjectURL(new Blob([crudo.bytes], { type: crudo.mime }))); resultado = { ...resultado, ancho: i.naturalWidth, alto: i.naturalHeight }; }
      const url = URL.createObjectURL(new Blob([resultado.bytes], { type: resultado.mime }));
      vista.replaceChildren(h('img', { src: url, alt: 'Lo que hizo la IA' }));
      acciones.hidden = false;
    };
    const hacer = async () => {
      if(!que.value.trim()){ aviso('Escribe qué quieres.', 'mal'); return; }
      ocupado('La IA está dibujando…');
      try{
        crudo = await IA.imagen({ prompt: EL.promptIcono(que.value.trim(), estilo, tinta), aspecto: '1:1' });
        await procesar();
        if(!nombre.value) nombre.value = que.value.trim().replace(/^(un|una|el|la)\s+/i, '').slice(0, 40);
      }catch(e){ aviso('No salió: ' + e.message, 'mal', { ms: 8000 }); }
      finally{ ocupado(''); }
    };
    const listo = async (poner) => {
      if(!resultado) return;
      await terminarImagen({ png: { bytes: resultado.bytes, mime: resultado.mime }, proporcion: resultado.ancho / Math.max(1, resultado.alto), nombre: nombre.value.trim() || 'Icono de IA', origen: 'ia' }, { poner, guardar: poner ? chk.checked : true });
    };
    if(!IA.llave()){ const c = h('div'); hoja('Pedírselo a la IA', c, '#hoja2'); sinLlave(c, () => abrirIconoIA()); return; }
    hoja('Pedírselo a la IA', [
      que,
      h('div', { class: 'seccion' }, h('h3', {}, 'Estilo'), segmento(EL.ESTILOS_IA.map(([v, t]) => [v, t]), estilo, (v) => { estilo = v; })),
      h('div', { class: 'seccion' }, h('h3', {}, 'Color principal'), selectorColor(tinta, (c) => { tinta = c; })),
      h('button', { class: 'btn primario ancho', type: 'button', 'data-hacer-ia': '', on: { click: hacer } }, '✦ Hacerlo'),
      vista,
      h('label', { class: 'check' }, chkFondo, h('span', {}, 'Quitarle el fondo blanco')),
      h('button', { class: 'btn ancho', type: 'button', on: { click: hacer } }, '↻ Otra versión'),
      h('label', { class: 'campo', style: { marginTop: '12px' } }, 'Nombre', nombre),
      fila, acciones,
    ], '#hoja2');
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
    let i = desde, reloj = null, ocupadoTr = false, pendiente = null;
    const escenario = $('#presentar-escenario');
    const cuenta = $('#presentar-cuenta');
    const medir = () => {
      const W = innerWidth, H = innerHeight, r = d.ancho / d.alto;
      const w = Math.min(W, H * r), hh = w / r;
      escenario.style.width = w + 'px'; escenario.style.height = hh + 'px';
      escenario.style.setProperty('--k', w / 960);
    };
    const lamina = async (j) => { const m = await N.modelo(d, j); const div = h('div', { class: 'diapo' }, U.V.pintar(m)); return { div, m }; };
    /* Un toque DURANTE la transición no se tira: se guarda y se cumple al
       terminar. Antes se ignoraba callado, y «pasar rápido dos láminas» se
       quedaba en una — y la prueba de la flecha fallaba 1 de cada 2 veces,
       porque la flecha llegaba en los 30 ms que la primera lámina tarda en
       asentarse. */
    const mostrar = async (j, animar = true) => {
      if(j < 0 || j >= d.laminas.length) return;
      if(ocupadoTr){ pendiente = j - i; return; }
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
      setTimeout(() => {
        vieja?.remove(); div.classList.remove('entra'); ocupadoTr = false;
        if(pendiente != null && dlg.open){ const paso = pendiente; pendiente = null; mostrar(i + Math.sign(paso)); }
      }, ms + 30);
      i = j;
      cuenta.textContent = `${i + 1} / ${d.laminas.length}`;
      cuenta.classList.remove('desvanece'); void cuenta.offsetWidth; cuenta.classList.add('desvanece');
      if(tr?.segundos && i < d.laminas.length - 1) reloj = setTimeout(() => mostrar(i + 1), tr.segundos * 1000 + ms);
    };
    const toque = (e) => {
      if(e.target.closest('button')) return;
      // Un elemento con link lo abre (en otra pestaña) en vez de pasar de lámina.
      const ln = e.target.closest('[data-enlace]');
      if(ln){ window.open(ln.dataset.enlace, '_blank', 'noopener'); return; }
      (e.clientX > innerWidth * 0.35 ? mostrar(i + 1) : mostrar(i - 1));
    };
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

  return { panel, montarEditor, presentar, guardarDeLamina, editarTabla, editarGrafica, editarEnlace, get elegido(){ return elegido; }, fijarSeleccion: (lamina, cid) => { elegido = cid == null ? null : { lamina, cid }; } };
}
