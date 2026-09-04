/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · LA PANTALLA  ·  v2
   ──────────────────────────────────────────────────────────────────────────
   Sólo interfaz: toda la cuenta está en `motor.js` y se comprueba con
   `pruebas.mjs`, que no puede hacer clic en un botón. Si algún día hay que
   sumar algo en este archivo, está mal puesto.

   QUÉ CAMBIÓ RESPECTO A LA v1 Y POR QUÉ. Carlos: «evita listas de botones
   con cuadros de texto, reparte bien cada cosa en la pantalla». Tenía razón
   y el diagnóstico está medido en `estilo.css`: sin un tamaño de display,
   todo era interfaz y nada era producto.

   · PORTADA. Antes se abría en un formulario. Ahora se abre como abren
     Fadori, Ligas Mazi y Puercos: color a sangre, una palabra grande, el
     estado en una cifra y UNA acción principal.
   · REGISTRAR ES UN RECORRIDO, NO UN FORMULARIO. Se elige el baño en fichas
     grandes que ya enseñan cuánto le queda dentro; el número se teclea en
     tamaño de dato con atajos (Vacío · ¼ · ½ · Lleno) para no teclear casi
     nunca; y antes de guardar se enseña LO QUE SE VA A CALCULAR. Quien mide
     ve el resultado de su medición: eso es lo que hace que se siga midiendo.
   · EL DATO ES EL PRODUCTO. La cifra principal va a 52 px sobre el color de
     la casa, no en una tarjetita de 26.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const M = globalThis.JABONERA, D = globalThis.DATOS, X = globalThis.EXCEL, RP = globalThis.REPORTE;

/* ── utilidades ──────────────────────────────────────────────────────── */
const $  = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nu = (x, dec=0) => x == null || !isFinite(x) ? '—'
  : x.toLocaleString('es-MX', { minimumFractionDigits:dec, maximumFractionDigits:dec });
const pesos = x => x == null || !isFinite(x) ? '—'
  : '$' + x.toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 });
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

/** La cantidad partida en dos: lo que va en el número grande y lo que va
 *  debajo. En una tarjeta estrecha «11.91 L · 11,912 mL» se rompía a media
 *  unidad y dejaba un «mL» huérfano en su propio renglón. */
function cantPartida(v, p){
  if(v == null || !isFinite(v)) return { grande:'—', unidad:'', detalle:'' };
  if(!p) return { grande:nu(v,1), unidad:'', detalle:'' };
  if(p.tipo === 'solido'){
    const pz = M.enPiezas(v, p);
    return { grande: nu(v, v < 100 ? 1 : 0), unidad:'g',
             detalle: pz != null ? `${nu(pz,1)} barras` : '' };
  }
  return v >= 1000
    ? { grande: nu(v/1000, 2), unidad:'L', detalle: nu(v,0) + ' mL' }
    : { grande: nu(v,0), unidad:'mL', detalle:'' };
}
const soloNumero = (v,p) => { const c = cantPartida(v,p); return c.grande + (c.unidad ? ' '+c.unidad : ''); };
const hace = ts => {
  const m = (Date.now() - ts) / 60000;
  if(m < 60) return `hace ${Math.max(1,Math.round(m))} min`;
  if(m < 60*36) return `hace ${Math.round(m/60)} h`;
  return `hace ${Math.round(m/1440)} días`;
};

/** LA PROBETA. El medidor de cada baño no es una barra de progreso: es una
 *  probeta graduada con sus marcas, dibujada aquí en SVG. El instrumento del
 *  proyecto convertido en elemento de interfaz — y de paso se lee mejor: una
 *  barra dice «algo va por la mitad», una probeta dice CUÁNTO Y DE QUÉ.
 *  Con los cantos redondeados, que es el lenguaje de las referencias que
 *  mandó Carlos, y porque además una burbuja no tiene esquinas. */
function probeta(pct){
  const p = Math.max(0, Math.min(100, pct || 0));
  const X = 34, Y = 72, ancho = 22, alto = 52, izq = (X-ancho)/2, top = 12;
  const nivel = top + alto * (1 - p/100);
  const marcas = [25,50,75].map(v => {
    const y = top + alto * (1 - v/100);
    return `<line x1="${izq+3}" y1="${y.toFixed(1)}" x2="${izq+8}" y2="${y.toFixed(1)}"
            stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>`;
  }).join('');
  return `<svg class="probeta" viewBox="0 0 ${X} ${Y}" role="img"
      aria-label="Probeta al ${Math.round(p)} por ciento" style="color:var(--indigo)">
    <defs><clipPath id="pb${Math.round(p)}">
      <rect x="${izq}" y="${top}" width="${ancho}" height="${alto}" rx="10"/>
    </clipPath></defs>
    <rect x="${izq-3}" y="4" width="${ancho+6}" height="7" rx="3.5"
          fill="currentColor" opacity=".28"/>
    <rect x="${izq}" y="${top}" width="${ancho}" height="${alto}" rx="10"
          fill="var(--indigo-suave)"/>
    <g clip-path="url(#pb${Math.round(p)})">
      <rect x="${izq}" y="${nivel.toFixed(1)}" width="${ancho}"
            height="${Math.max(0, top+alto-nivel).toFixed(1)}" fill="currentColor" opacity=".9"/>
    </g>
    ${marcas}
    <rect x="${izq}" y="${top}" width="${ancho}" height="${alto}" rx="10"
          fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/>
    <text x="${X/2}" y="${Y-1}" text-anchor="middle"
          font-size="10" font-weight="700" fill="currentColor">${Math.round(p)}%</text>
  </svg>`;
}

/** LA ESPUMA. Manchas orgánicas al fondo del bloque de color. En Headspace
 *  son una decisión de estilo; aquí son burbujas de jabón, y por eso salen
 *  SÓLO donde hay color y nunca sobre el contenido. */
function espuma(){
  return `<svg class="espuma" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle cx="352" cy="34" r="86" fill="#fff" opacity=".10"/>
    <circle cx="300" cy="118" r="42" fill="#fff" opacity=".08"/>
    <circle cx="382" cy="150" r="26" fill="#FF6B3D" opacity=".22"/>
    <circle cx="18"  cy="252" r="96" fill="#fff" opacity=".07"/>
    <circle cx="112" cy="288" r="34" fill="#12BE8F" opacity=".18"/>
  </svg>`;
}

/* ── gráficas: SVG a mano, sin una sola librería ─────────────────────── */
function columnas(datos, opciones = {}){
  const { unidad='', alto=150, resaltar=-1 } = opciones;
  if(!datos.length || datos.every(d => !(d.v > 0)))
    return `<p class="menor">Todavía no hay suficiente para dibujar esto.</p>`;
  const max = Math.max(...datos.map(d => d.v));
  const n = datos.length, W = 340, H = alto, base = H - 22, techo = 12;
  const paso = W / n, ancho = Math.max(3, Math.min(paso - 4, 40));
  const barras = datos.map((d,i) => {
    const h = max > 0 ? (base - techo) * (d.v / max) : 0;
    const x = i * paso + (paso - ancho)/2;
    return `<rect class="barra${i===resaltar?'':' floja'}" x="${x.toFixed(1)}" y="${(base-h).toFixed(1)}"
            width="${ancho.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" rx="2"><title>${esc(d.et)}: ${nu(d.v,1)} ${esc(unidad)}</title></rect>`;
  }).join('');
  const etiquetas = datos.map((d,i) => {
    if(n > 12 && i % Math.ceil(n/8) !== 0) return '';
    return `<text x="${(i*paso + paso/2).toFixed(1)}" y="${H-6}" text-anchor="middle">${esc(d.corta ?? d.et)}</text>`;
  }).join('');
  return `<svg class="gr" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="Gráfica de columnas, máximo ${nu(max,1)} ${esc(unidad)}">
    <line class="eje" x1="0" y1="${base}" x2="${W}" y2="${base}"/>
    ${barras}${etiquetas}
  </svg>
  <div class="leyenda"><span>Máximo de la gráfica: <b>${nu(max,1)} ${esc(unidad)}</b></span></div>`;
}

function ranking(filas, opciones = {}){
  const { unidad='' } = opciones;
  if(!filas.length) return `<p class="menor">Sin mediciones todavía.</p>`;
  const max = Math.max(...filas.map(f => f.v));
  return `<div>${filas.map((f,i) => `
    <div style="margin:0 0 14px">
      <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:5px">
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:var(--p-medio)">${esc(f.et)}</span>
        <b class="num" style="font-size:var(--t-guia);font-weight:var(--p-fuerte)">${nu(f.v, f.v < 100 ? 1 : 0)}</b>
        <span class="micro">${esc(unidad)}</span>
      </div>
      <div style="height:10px;background:var(--niebla);border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${max>0?(f.v/max*100).toFixed(1):0}%;
             background:${i===0?'var(--coral)':'var(--indigo)'};border-radius:999px"></div>
      </div>
      ${f.nota ? `<div class="micro" style="margin-top:4px">${esc(f.nota)}</div>` : ''}
    </div>`).join('')}</div>`;
}

/* ── estado ──────────────────────────────────────────────────────────── */
let E = D.cargar();
let tab = 'inicio';
let sel = { banoId:null, productoId:null };
let paso = 1;                 /* el recorrido de Registrar */
let borrador = { restante:'', repuesto:'' };

function salvar(){
  const r = D.guardar(E);
  if(!r.bien) alerta(`No se pudo guardar: ${r.error}. Exporta un respaldo AHORA.`, 'mal');
  return r.bien;
}
let temporizador = null;
function alerta(texto, clase='bien'){
  let c = $('#brindis');
  if(!c){ c = document.createElement('div'); c.id = 'brindis';
    c.style.cssText = 'position:fixed;left:14px;right:14px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:60';
    document.body.appendChild(c); }
  c.innerHTML = `<div class="aviso ${clase}" style="margin:0">${esc(texto)}</div>`;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { c.innerHTML = ''; }, 4200);
}

/* Cuánto cabe en los dispensadores de un baño, para los atajos. */
function capacidadDe(bano, producto){
  if(!bano || !producto) return 0;
  if(producto.tipo === 'liquido')
    return (Number(bano.dispensadores)||1) * (Number(E.dispensador.capacidad)||1000);
  return (Number(bano.dispensadores)||1) * 300;   /* jaboneras de barra */
}

/* ── router ──────────────────────────────────────────────────────────── */
const PINTORES = {};
function pinta(){
  for(const b of document.querySelectorAll('.pestanas button'))
    b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false');
  for(const p of document.querySelectorAll('.panel')) p.hidden = p.id !== 'p-' + tab;
  const destino = $('#p-' + tab);
  destino.innerHTML = PINTORES[tab] ? PINTORES[tab]() : '';
  destino.classList.remove('brinco'); void destino.offsetWidth; destino.classList.add('brinco');
  /* La portada trae su propio campo de marca; el resto lleva la cabecera. */
  $('#cabecera').hidden = tab === 'inicio';
  $('#letreroDemo').innerHTML = (E.demo && tab !== 'inicio') ? avisoDemo() : '';
}
const avisoDemo = () => `<div class="aviso mal">
  <h3>Estos son DATOS DE DEMOSTRACIÓN</h3>
  No son mediciones reales. Antes de usarlo de verdad: <b>Ajustes → Empezar de cero</b>.
  La advertencia sale también en el Excel y en el reporte.</div>`;

/* ══ 1 · INICIO · la portada ════════════════════════════════════════════
   Se abre como abren las tres referencias de la casa: color a sangre, una
   palabra grande y UNA acción. No una lista de campos. */
PINTORES.inicio = () => {
  const inf = M.informe(E);
  const c = inf.calidad;
  const listo = E.banos.length && E.productos.length;
  const p0 = inf.porProducto.length ? [...inf.porProducto].sort((a,b)=>b.consumo-a.consumo)[0] : null;
  const cifra = p0 && p0.consumo > 0 ? cantPartida(p0.consumo, p0.producto) : null;

  const gauges = E.banos.slice(0,6).map(b => {
    const prod = E.productos[0];
    const dentro = M.ultimoRestantePorBano(E.visitas.filter(v => v.banoId === b.id), prod?.id);
    const cap = capacidadDe(b, prod);
    const pct = cap > 0 ? Math.max(0, Math.min(100, dentro / cap * 100)) : 0;
    const ult = E.visitas.filter(v => v.banoId === b.id).sort((a,b2)=>b2.ts-a.ts)[0];
    return `<button class="ficha" type="button" data-ir-registrar="${esc(b.id)}">
      ${probeta(pct)}
      <span class="txt">
        <span class="tit">${esc(b.nombre)}</span>
        <span class="sub">${ult ? `última visita ${esc(hace(ult.ts))}` : 'sin visitar todavía'}
          ${b.alumnos ? ` · ${b.alumnos} alumnos` : ''}</span>
      </span>
      <span aria-hidden="true" style="color:var(--humo);font-size:var(--t-seccion)">›</span>
    </button>`;
  }).join('');

  return `
  <div class="campo-marca">
    ${espuma()}
    <div class="dentro">
      <p class="rotulo">${esc(E.escuela.nombre || 'Proyecto STEAM')}</p>
      <h1 class="marca">Jabo<em>nera</em></h1>
      <p class="lema">Cuánto jabón se gasta en los baños de la escuela.
        Medido, no calculado a ojo.</p>

      ${cifra ? `
      <hr>
      <p class="rotulo" style="margin:0 0 8px">${esc(p0.producto.nombre)} · ${nu(c.dias,1)} días medidos</p>
      <div class="num" style="font-size:var(--t-display);font-weight:var(--p-fuerte);
                  letter-spacing:var(--tr-display);line-height:1;color:#FFD9CB">${cifra.grande}<span
           style="font-size:var(--t-seccion);font-weight:var(--p-fuerte);
                  color:rgba(255,255,255,.72);margin-left:8px;letter-spacing:0">${cifra.unidad}</span></div>
      <p class="menor" style="color:rgba(255,255,255,.82);margin:10px 0 0">
        ${p0.lavados != null ? `equivalen a <b>${nu(p0.lavados,0)} lavadas de manos</b>` : cifra.detalle}
        ${inf.dinero.gasto != null ? ` · ${pesos(inf.dinero.gasto)}` : ''}</p>` : `
      <hr>
      <p class="menor" style="color:rgba(255,255,255,.8);margin:0">
        ${listo ? 'Todavía no hay dos mediciones en un mismo baño: hasta que las haya, no hay consumo que calcular.'
                : 'Falta dar de alta los baños y el jabón.'}</p>`}

      <div style="margin-top:24px;display:grid;gap:10px">
        ${listo
          ? `<button class="b primario ancho" data-ir="registrar">Registrar una medición</button>`
          : `<button class="b primario ancho" data-abrir-ajustes="1">Configurar los baños</button>`}
        <button class="b claro ancho" data-demo="1" style="opacity:.85">
          ${E.visitas.length ? 'Recargar demostración' : 'Ver una demostración'}</button>
      </div>
      <!-- Ajustes SIEMPRE alcanzable desde la portada. Antes sólo salía el
           botón de configurar cuando faltaban baños, así que en cuanto se
           configuraba desaparecía la única puerta y había que irse a otra
           pestaña para encontrar el engrane. Lo cazó la compuerta. -->
      <button type="button" data-abrir-ajustes="1"
        style="appearance:none;background:none;border:0;color:rgba(255,255,255,.85);
               font-size:var(--t-micro);font-weight:var(--p-medio);
               letter-spacing:.06em;text-transform:uppercase;
               cursor:pointer;padding:16px 4px 0;min-height:44px;text-decoration:underline">
        Ajustes, baños y respaldo</button>
    </div>
  </div>

  <main style="max-width:var(--tope);margin:0 auto;padding:var(--aire)">
    ${E.demo ? avisoDemo() : ''}
    ${E.banos.length ? `
      <h2 style="margin:4px 0 4px">Los baños ahora</h2>
      <p class="menor" style="margin:0 0 14px">Cuánto le queda dentro al dispensador, según la última visita.</p>
      <div class="fichas">${gauges}</div>` : ''}

    ${c.intervalos ? `<div class="datos">
      <div class="dato"><div class="et">Días medidos</div><span class="v num">${nu(c.dias,1)}</span>
        <div class="n">${c.visitas} visitas · ${c.intervalos} intervalos</div></div>
      <div class="dato ${c.suficiente?'':'hueca'}"><div class="et">¿Se puede concluir?</div>
        <span class="v">${c.suficiente ? 'Sí' : 'Todavía no'}</span>
        <div class="n">${c.suficiente ? 'más de 7 días y 6 intervalos' : 'hacen falta 7 días y 6 intervalos'}</div></div>
    </div>` : ''}
  </main>`;
};

/* ══ 2 · REGISTRAR · un recorrido, no un formulario ═════════════════════ */
PINTORES.registrar = () => {
  if(!E.banos.length || !E.productos.length) return `
    <div class="tarjeta"><div class="vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-5 9 5v11H3z"/><path d="M3 9h18"/></svg>
      <h2>Falta decirle al sistema qué hay</h2>
      <p class="menor">No se puede registrar sin al menos un baño y un producto.</p>
      <button class="b" data-abrir-ajustes="1">Configurar</button>
    </div></div>`;

  if(!sel.productoId || !E.productos.some(p => p.id === sel.productoId)) sel.productoId = E.productos[0].id;
  const prod = E.productos.find(p => p.id === sel.productoId);

  /* ── PASO 1 · qué baño ── */
  if(paso === 1){
    const fichas = E.banos.map(b => {
      const dentro = M.ultimoRestantePorBano(E.visitas.filter(v => v.banoId === b.id), prod.id);
      const cap = capacidadDe(b, prod);
      const pct = cap > 0 ? Math.max(0, Math.min(100, dentro/cap*100)) : 0;
      const ult = E.visitas.filter(v => v.banoId === b.id && v.productoId === prod.id).sort((x,y)=>y.ts-x.ts)[0];
      return `<button class="ficha" type="button" data-bano="${esc(b.id)}" aria-pressed="false">
        ${probeta(pct)}
        <span class="txt"><span class="tit">${esc(b.nombre)}</span>
          <span class="sub">${ult ? `visitado ${esc(hace(ult.ts))} · dentro ${esc(soloNumero(dentro,prod))}`
                                  : 'primera visita'}</span></span>
        <span aria-hidden="true" style="color:var(--humo);font-size:var(--t-seccion)">›</span>
      </button>`;
    }).join('');
    return `
    <div class="pasos"><i class="hecho"></i><i></i><i></i></div>
    <div class="paso-et"><b>Paso 1 de 3</b></div>
    <h2 style="margin-bottom:4px">¿A qué baño fuiste?</h2>
    <p class="menor" style="margin-bottom:18px">La probeta enseña lo que le quedaba dentro según la última visita.</p>
    ${E.productos.length > 1 ? `<div class="atajos" style="margin:0 0 16px">
      ${E.productos.map(p => `<button type="button" data-producto="${esc(p.id)}"
        style="${p.id===sel.productoId?'background:var(--tinta);color:var(--nube)':''}">${esc(p.nombre)}</button>`).join('')}
    </div>` : ''}
    <div class="fichas">${fichas}</div>`;
  }

  const bano = E.banos.find(b => b.id === sel.banoId) || E.banos[0];
  const cap  = capacidadDe(bano, prod);
  const uni  = M.UNIDAD[prod.tipo];
  const previas = E.visitas.filter(v => v.banoId === bano.id && v.productoId === prod.id).sort((a,b)=>b.ts-a.ts);
  const ult = previas[0];
  const dentroAntes = ult ? Number(ult.restante) + Number(ult.repuesto) : null;

  /* ── PASO 2 · los dos números ── */
  if(paso === 2){
    const atajo = (et, val) => `<button type="button" data-poner="restante" data-valor="${val}">${et}</button>`;
    const atajo2 = (et, val) => `<button type="button" data-poner="repuesto" data-valor="${val}">${et}</button>`;
    return `
    <div class="pasos"><i class="hecho"></i><i class="hecho"></i><i></i></div>
    <div class="paso-et"><b>Paso 2 de 3</b></div>
    <h2 style="margin-bottom:4px">${esc(bano.nombre)}</h2>
    <p class="menor" style="margin-bottom:18px">${esc(prod.nombre)} ·
      capacidad ${nu(cap,0)} ${esc(uni)}
      <button class="b chico fantasma" data-paso="1" style="margin-left:8px">Cambiar</button></p>

    ${ult ? `<div class="aviso info">
        <h3>La vez anterior · ${esc(hace(ult.ts))}</h3>
        Se dejaron dentro <b>${esc(soloNumero(dentroAntes, prod))}</b>.
        Lo que apuntes ahora, restado de eso, es el consumo.</div>`
      : `<div class="aviso ojo"><h3>Primera visita a este baño</h3>
        Esta medición todavía no dice consumo: hace falta una segunda para poder restar.
        Es normal y es correcto — un solo punto no mide un gasto.</div>`}

    <form class="tarjeta captura" id="formVisita">
      <label for="restante">1 · ¿Cuánto quedaba dentro? <span class="micro">(${esc(uni)})</span></label>
      <input id="restante" name="restante" type="number" inputmode="decimal" step="any" min="0"
             placeholder="0" value="${esc(borrador.restante)}" required>
      <div class="atajos">
        ${atajo('Vacío', 0)}${atajo('¼', Math.round(cap*.25))}${atajo('½', Math.round(cap*.5))}
        ${atajo('¾', Math.round(cap*.75))}${atajo('Lleno', Math.round(cap))}
      </div>

      <div class="sep"></div>

      <label for="repuesto">2 · ¿Cuánto añadiste? <span class="micro">(${esc(uni)})</span></label>
      <input id="repuesto" name="repuesto" type="number" inputmode="decimal" step="any" min="0"
             placeholder="0" value="${esc(borrador.repuesto)}">
      <div class="atajos">
        ${atajo2('Nada', 0)}${atajo2('Lo llené', -1)}${atajo2('Medio envase', Math.round((prod.tamanoEnvase||1000)/2))}
        ${atajo2('Un envase', Math.round(prod.tamanoEnvase||1000))}
      </div>

      <details style="margin:16px 0 0">
        <summary class="menor" style="cursor:pointer;padding:8px 0;min-height:44px;display:flex;align-items:center">
          Fecha, quién y notas (casi nunca hace falta)</summary>
        <div class="campo" style="margin-top:12px">
          <label for="cuando">Fecha y hora</label>
          <input id="cuando" name="cuando" type="datetime-local"
                 value="${new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}">
        </div>
        <div class="campo"><label for="quien">Quién midió</label>
          <input id="quien" name="quien" type="text" placeholder="Nombre o puesto" value="${esc(E.ultimoQuien||'')}"></div>
        <div class="campo"><label for="nota">Nota</label>
          <input id="nota" name="nota" type="text" placeholder="Dispensador roto, se derramó…"></div>
      </details>

      <button class="b ancho" type="submit" style="margin-top:18px">Ver lo que se calcula</button>
    </form>`;
  }

  /* ── PASO 3 · lo que se va a calcular, ANTES de guardar ──
     Quien mide ve el resultado de su medición. Es lo que hace que la
     siguiente semana siga midiendo. */
  const r = Number(borrador.restante) || 0, rep = Number(borrador.repuesto) || 0;
  const consumo = dentroAntes != null ? (dentroAntes - r) : null;
  const hueco = consumo != null && consumo < 0;
  const lav = consumo > 0 ? M.lavados(consumo, E.dispensador, prod) : null;
  return `
  <div class="pasos"><i class="hecho"></i><i class="hecho"></i><i class="hecho"></i></div>
  <div class="paso-et"><b>Paso 3 de 3 · confirma</b></div>
  <h2 style="margin-bottom:18px">${esc(bano.nombre)}</h2>

  ${consumo == null ? `
    <div class="dato" style="margin-bottom:14px">
      <div class="et">Consumo</div>
      <span class="v" style="font-size:var(--t-seccion);color:var(--humo)">todavía no se puede</span>
      <div class="n">Es la primera visita a este baño. La próxima ya podrá restarse.</div>
    </div>`
  : hueco ? `
    <div class="aviso mal"><h3>Apareció jabón que nadie apuntó</h3>
      Había ${esc(soloNumero(dentroAntes,prod))} y ahora encontraste ${esc(soloNumero(r,prod))}:
      alguien repuso <b>${esc(soloNumero(-consumo,prod))}</b> sin registrarlo.
      Se guardará el consumo como <b>cero</b> —no se inventa— y quedará marcado en el análisis.</div>`
  : `
    <div class="dato grande" style="margin-bottom:14px">
      <div class="et">Se gastó desde la última visita</div>
      <span class="v num">${cantPartida(consumo,prod).grande}<u>${cantPartida(consumo,prod).unidad}</u></span>
      <div class="n">${lav != null ? `≈ ${nu(lav,0)} lavadas de manos · ` : ''}en ${esc(hace(ult.ts).replace('hace ',''))}</div>
    </div>`}

  <div class="datos">
    <div class="dato"><div class="et">Encontraste</div>
      <span class="v num">${cantPartida(r,prod).grande}<u>${cantPartida(r,prod).unidad}</u></span></div>
    <div class="dato"><div class="et">Añadiste</div>
      <span class="v num">${cantPartida(rep,prod).grande}<u>${cantPartida(rep,prod).unidad}</u></span></div>
    <div class="dato"><div class="et">Queda dentro</div>
      <span class="v num">${cantPartida(r+rep,prod).grande}<u>${cantPartida(r+rep,prod).unidad}</u></span></div>
  </div>

  <div style="display:grid;gap:10px">
    <button class="b ancho" data-guardar="1">Guardar la medición</button>
    <button class="b fantasma ancho" data-paso="2">Corregir los números</button>
  </div>`;
};

/* ══ 3 · ANÁLISIS ══════════════════════════════════════════════════════ */
PINTORES.analisis = () => {
  const inf = M.informe(E);
  const c = inf.calidad;

  if(!c.intervalos) return `
    <div class="tarjeta"><div class="vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
      <h2>Todavía no hay consumo que analizar</h2>
      <p class="menor">El consumo es una resta entre dos visitas al mismo baño.
      Con una sola visita no hay nada que restar — hacen falta dos.</p>
      <button class="b" data-ir="registrar">Registrar una medición</button>
    </div></div>`;

  /* La honestidad va ARRIBA de las gráficas, no debajo en letra chica: es lo
     que decide si lo de abajo se puede citar en un examen o no. */
  const avisos = [];
  if(!c.suficiente) avisos.push(`<div class="aviso ojo">
    <h3>Estos números todavía se mueven</h3>
    Hay <b>${nu(c.dias,1)} días</b> medidos y <b>${c.intervalos}</b> intervalos. Por debajo de
    7 días y 6 intervalos, un día raro cambia todos los promedios.</div>`);
  if(c.banosSinDatos.length) avisos.push(`<div class="aviso mal">
    <h3>${c.banosSinDatos.length} baño(s) sin una sola medición</h3>
    ${esc(c.banosSinDatos.join(', '))}. No aparecen abajo: no es que gasten cero, es que no se sabe.</div>`);
  if(c.banosConUnaSolaVisita.length) avisos.push(`<div class="aviso ojo">
    <h3>Baños con una sola visita</h3>
    ${esc(c.banosConUnaSolaVisita.join(', '))} — falta una segunda para poder restar.</div>`);
  if(c.huecos) avisos.push(`<div class="aviso mal">
    <h3>${c.huecos} recarga(s) sin apuntar</h3>
    Faltan ${nu(c.huecoTotal,0)} unidades sin registrar, así que
    <b>el gasto real es mayor que el de abajo</b>.</div>`);

  const p0 = inf.principal;
  const cif = cantPartida(p0.consumo, p0.producto);

  const cifras = inf.porProducto.filter(p => p.producto.id !== p0.producto.id).map(p => {
    const cc = cantPartida(p.consumo, p.producto);
    return `<div class="dato"><div class="et">${esc(p.producto.nombre)}</div>
      <span class="v num">${cc.grande}<u>${cc.unidad}</u></span>
      <div class="n">${[cc.detalle, p.lavados != null ? `${nu(p.lavados,0)} lavadas` : null]
        .filter(Boolean).join(' · ')}</div></div>`;
  }).join('');

  const porProducto = E.productos.map(p => {
    const filas = inf.banos.filter(r => r.productoId === p.id).map(r => ({
      et: r.bano?.nombre || '—', v: r.consumo,
      nota: r.porAlumno != null ? `${nu(r.porAlumno,2)} ${M.UNIDAD[p.tipo]} por alumno y día`
        : (r.bano && !r.bano.alumnos ? 'sin alumnos asignados: no hay promedio por alumno' : ''),
    }));
    if(!filas.length) return '';
    return `<div class="tarjeta">
      <h2>Qué baño gasta más</h2>
      <p class="menor" style="margin-bottom:16px">${esc(p.nombre)}, en ${esc(M.UNIDAD[p.tipo])},
        sobre ${nu(inf.rango.dias,1)} días medidos.</p>
      ${ranking(filas, { unidad: M.UNIDAD[p.tipo] })}
    </div>`;
  }).join('');

  const serie = inf.dia.filter(d => d.productoId === p0.producto.id)
    .map(d => ({ et:d.dia, corta:d.dia.slice(8), v:d.consumo }));
  const sem = inf.semana.map((s,i) => ({ et:DIAS[i], corta:DIAS[i].slice(0,2).toUpperCase(), v:s.consumo }));
  const picoSem = sem.reduce((a,b,i,arr) => arr[a].v >= b.v ? a : i, 0);
  const h = inf.hora;
  const picoHora = h.horas.reduce((a,b,i,arr) => arr[a].consumo >= b.consumo ? a : i, 0);

  return `
    ${avisos.join('')}

    <div class="dato grande" style="margin-bottom:12px">
      <div class="et">${esc(p0.producto.nombre)} · ${nu(inf.rango.dias,1)} días medidos</div>
      <span class="v num">${cif.grande}<u>${cif.unidad}</u></span>
      <div class="n">${[cif.detalle,
          p0.lavados != null ? `${nu(p0.lavados,0)} lavadas de manos` : null,
          p0.diario != null ? `${soloNumero(p0.diario,p0.producto)} al día` : null].filter(Boolean).join(' · ')}</div>
    </div>

    <div class="datos">
      ${cifras}
      <div class="dato ${inf.dinero.gasto==null?'hueca':''}"><div class="et">Valor de lo consumido</div>
        <span class="v num">${inf.dinero.gasto==null ? 'sin precio' : pesos(inf.dinero.gasto)}</span>
        <div class="n">${inf.dinero.gasto == null
          ? 'sin entregas registradas no se puede valorar'
          : 'invertido en compras: ' + pesos(inf.dinero.invertido)}</div></div>
    </div>

    ${porProducto}

    <div class="tarjeta">
      <h2>Consumo por día</h2>
      <p class="menor" style="margin-bottom:14px">${esc(p0.producto.nombre)}. Cuando entre dos visitas
        pasan varios días, el gasto se reparte <b>proporcionalmente</b> entre esos días:
        cargárselo entero al día de la última visita dibujaría picos que no existieron.</p>
      ${columnas(serie, { unidad: M.UNIDAD[p0.producto.tipo] })}
    </div>

    <div class="rejilla dos">
      <div class="tarjeta">
        <h2>Por día de la semana</h2>
        <p class="menor" style="margin-bottom:12px">Sólo ${esc(p0.producto.nombre)}: mezclar mililitros
          con gramos daría un eje que no es ninguna unidad.</p>
        ${columnas(sem, { unidad:M.UNIDAD[p0.producto.tipo], resaltar:picoSem })}
        <p class="pie-nota">El día de más consumo es el <b>${esc(DIAS[picoSem])}</b>.</p>
      </div>
      <div class="tarjeta">
        <h2>A qué hora se gasta</h2>
        <p class="menor" style="margin-bottom:12px">Sólo ${esc(p0.producto.nombre)}.</p>
        ${h.muestras
          ? columnas(h.horas.map(x => ({ et:x.hora+' h', corta:String(x.hora), v:x.consumo })),
                     { unidad:M.UNIDAD[p0.producto.tipo], resaltar:picoHora }) +
            `<p class="pie-nota">Calculado <b>sólo con ${h.muestras} intervalo(s)</b> de menos de ${h.topeHoras} h;
             se descartaron ${h.descartados} por ser demasiado largos para decir algo de la hora.
             El pico cae hacia las <b>${picoHora}:00</b>.</p>`
          : `<p class="menor">Ninguna medición está lo bastante cerca de la anterior. Para saber a qué hora
             se gasta hacen falta <b>dos visitas el mismo día</b>, por ejemplo al entrar y a la salida del recreo.</p>`}
      </div>
    </div>

    <div class="tarjeta no-imprimir">
      <h2>Llevárselo</h2>
      <p class="menor" style="margin-bottom:16px">Un <b>.xlsx</b> de verdad, con nueve hojas: resumen,
        consumo por baño, por día, por día de la semana, por hora, visitas, entregas, baños y productos.</p>
      <button class="b ancho" data-excel="1">Exportar a Excel</button>
    </div>`;
};

/* ══ 4 · ALMACÉN ═══════════════════════════════════════════════════════ */
PINTORES.almacen = () => {
  const inf = M.informe(E);
  const tarjetas = inf.porProducto.map(p => {
    const dias = p.diasRestantes;
    const urgente = dias != null && dias < 7;
    const recargas = M.recargasPosibles(p.almacen, E.dispensador, p.producto);
    const alm = cantPartida(p.almacen, p.producto), dis = cantPartida(p.enDispensadores, p.producto);
    return `<div class="tarjeta">
      <h2>${esc(p.producto.nombre)} <span class="etq ${p.producto.tipo==='solido'?'solido':''}">${p.producto.tipo}</span></h2>
      <div class="datos" style="margin:16px 0 0">
        <div class="dato ${urgente?'alarma':'grande'}">
          <div class="et">Aguanta</div>
          <span class="v num">${dias == null ? '—' : nu(dias,1)}<u>días</u></span>
          <div class="n">${dias == null
            ? 'hacen falta dos visitas para saber a qué ritmo se gasta'
            : (urgente ? 'hay que comprar' : 'al ritmo de ' + nu(p.diario,0) + ' ' + M.UNIDAD[p.producto.tipo] + ' por día')}</div></div>
        <div class="dato"><div class="et">En el almacén</div>
          <span class="v num">${alm.grande}<u>${alm.unidad}</u></span>
          <div class="n">${[alm.detalle,'lo comprado menos lo que ya se llevó a los baños'].filter(Boolean).join(' · ')}</div></div>
        <div class="dato"><div class="et">Puesto en dispensadores</div>
          <span class="v num">${dis.grande}<u>${dis.unidad}</u></span>
          <div class="n">${[dis.detalle,'esto ya salió del almacén: son dos cuentas distintas'].filter(Boolean).join(' · ')}</div></div>
      </div>
      <p class="pie-nota">
        ${p.costoUnidad != null ? `Costo medido: <b>${pesos(p.costoUnidad*1000)}</b> por
          ${p.producto.tipo==='liquido'?'litro':'kilo'} — promedio ponderado de todas las entregas, no el último precio.`
          : 'Sin entregas registradas no hay precio, y por eso no se calcula el gasto en pesos.'}
        ${recargas != null ? ` Alcanza para <b>${nu(recargas,1)}</b> recargas completas del dispensador.` : ''}
      </p>
    </div>`;
  }).join('') || `<div class="tarjeta"><p class="menor">Primero hay que dar de alta algún producto.</p></div>`;

  const entregas = [...E.entregas].sort((a,b) => b.ts - a.ts);
  return `
  ${tarjetas}
  <form class="tarjeta" id="formEntrega">
    <h2>Apuntar una entrega</h2>
    <p class="menor" style="margin-bottom:16px">Lo que llega al almacén. <b>Es lo que le pone precio a todo:</b>
      sin entregas el sistema no puede decir cuánto cuesta el jabón que se gastó.</p>
    <div class="campo"><label for="ePro">Producto</label>
      <select id="ePro" name="productoId" required>
        ${E.productos.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)} · envase de ${nu(p.tamanoEnvase,0)} ${M.UNIDAD[p.tipo]}</option>`).join('')}
      </select></div>
    <div class="par">
      <div class="campo"><label for="eEnv">Cuántos envases</label>
        <input id="eEnv" name="envases" type="number" inputmode="decimal" step="any" min="0" required placeholder="4"></div>
      <div class="campo"><label for="eCos">Costo total ($)</label>
        <input id="eCos" name="costoTotal" type="number" inputmode="decimal" step="any" min="0" required placeholder="680"></div>
    </div>
    <div class="par">
      <div class="campo"><label for="eFec">Fecha</label>
        <input id="eFec" name="cuando" type="date" value="${M.fechaISO(Date.now())}"></div>
      <div class="campo"><label for="ePrv">Proveedor</label>
        <input id="ePrv" name="proveedor" type="text" placeholder="Opcional"></div>
    </div>
    <button class="b ancho" type="submit">Guardar entrega</button>
  </form>

  <div class="tarjeta">
    <h2>Entregas registradas</h2>
    ${entregas.length ? `<p class="menor pista-desliza" style="margin-top:10px">Desliza la tabla de lado →</p>
      <div class="tabla-caja"><table>
      <thead><tr><th>Fecha</th><th>Producto</th><th class="n">Envases</th><th class="n">Costo</th><th class="n">Por unidad</th></tr></thead>
      <tbody>${entregas.map(e => {
        const p = E.productos.find(x => x.id === e.productoId);
        const total = p ? e.envases * p.tamanoEnvase : null;
        return `<tr><td>${esc(M.fechaISO(e.ts))}</td>
          <td>${esc(p?.nombre || '—')}${e.proveedor?`<br><span class="micro">${esc(e.proveedor)}</span>`:''}</td>
          <td class="n">${nu(e.envases,0)}</td><td class="n">${pesos(e.costoTotal)}</td>
          <td class="n">${total ? pesos(e.costoTotal/total) + '<br><span class="micro">por ' + M.UNIDAD[p.tipo] + '</span>' : '—'}</td>
        </tr>`; }).join('')}</tbody></table></div>`
      : `<p class="menor" style="margin-top:10px">Ninguna todavía. Sin entregas no hay precios y el análisis no puede hablar de dinero.</p>`}
  </div>`;
};

/* ══ 5 · PROYECTO ══════════════════════════════════════════════════════ */
PINTORES.proyecto = () => {
  const inf = M.informe(E);
  const p0 = inf.principal;
  const disp = E.dispensador;
  const py = E.proyecto || {};
  return `
  <form class="tarjeta" id="formProyecto">
    <h2>Datos del proyecto</h2>
    <p class="menor" style="margin-bottom:16px">Esto es lo que encabeza el reporte en formato Rembrandt.</p>
    <div class="campo"><label for="yNom">Nombre del proyecto</label>
      <input id="yNom" name="nombre" value="${esc(py.nombre||'')}"
             placeholder="Control de consumo de jabón en los baños escolares"></div>
    <div class="par">
      <div class="campo"><label for="yMod">Modalidad</label>
        <input id="yMod" name="modalidad" value="${esc(py.modalidad||'STEAM')}"></div>
      <div class="campo"><label for="yAsi">Asignatura</label>
        <input id="yAsi" name="asignatura" value="${esc(py.asignatura||'')}"></div>
    </div>
    <div class="campo"><label for="yInt">Integrantes <span class="micro">(uno por renglón)</span></label>
      <textarea id="yInt" name="integrantes" rows="4"
        placeholder="Nombre y apellidos&#10;Nombre y apellidos">${esc((py.integrantes||[]).join('\n'))}</textarea></div>
    <div class="par">
      <div class="campo"><label for="yAse">Asesor</label>
        <input id="yAse" name="asesor" value="${esc(py.asesor||'')}"></div>
      <div class="campo"><label for="yGru">Grupo</label>
        <input id="yGru" name="grupo" value="${esc(py.grupo||'')}" placeholder="3.1"></div>
    </div>
    <div class="campo"><label for="yCon">Conclusiones <span class="micro">(opcional; van al final del reporte)</span></label>
      <textarea id="yCon" name="conclusiones" rows="3">${esc(py.conclusiones||'')}</textarea></div>
    <button class="b" type="submit">Guardar</button>
  </form>

  <div class="tarjeta no-imprimir">
    <h2>El reporte en formato Rembrandt</h2>
    <p class="menor" style="margin-bottom:16px">Se genera un archivo que <b>abre la herramienta de reportes
      de la central</b> —la misma que ya tiene el membrete oficial del Instituto, el folio, la marca de agua
      y el sello de verificación—. No se redibuja el formato aquí: un formato oficial en dos sitios se
      separa el día que la escuela cambie el suyo.</p>
    <div class="aviso info" style="margin-bottom:16px">
      <h3>Cómo se usa</h3>
      1. Baja el archivo con el botón de abajo.<br>
      2. Abre <b>Reportes</b> en la central de Grupo Mazi.<br>
      3. Pestaña <b>Guardados</b> → <b>Importar</b> → escoge el archivo.<br>
      4. Ábrelo y dale <b>Imprimir / PDF</b>.
    </div>
    <button class="b ancho" data-reporte="1">Generar el reporte</button>
  </div>

  <div class="tarjeta">
    <h2>Qué es esto, en una frase</h2>
    <p class="guia" style="color:var(--tinta)">Un sistema para <b>medir</b> cuánto jabón se gasta en los
      baños de la escuela, <b>saber cuándo y dónde</b>, y <b>decidir con números</b> cuánto comprar
      en vez de a ojo.</p>
    <p class="menor">La pregunta de investigación no es «¿cuánto jabón usamos?» sino
      <b>«¿cuánto jabón hace falta, y cómo lo sabemos?»</b> — la primera se contesta pesando una caja;
      la segunda necesita un método.</p>
  </div>

  <div class="tarjeta">
    <h2>Cómo cumple la modalidad STEAM</h2>
    <p class="menor" style="margin-bottom:14px">Cada letra con lo que de verdad se hace en el proyecto,
      no con una definición de diccionario.</p>
    <div class="tabla-caja tabla-texto"><table>
      <thead><tr><th style="width:26px">·</th><th style="width:74px">Área</th><th>Qué se hace aquí</th></tr></thead>
      <tbody>
        <tr><td><b>S</b></td><td>Ciencia</td><td>Se plantea una hipótesis (unos baños gastan más que otros
          y hay horas pico), se <b>mide</b> con un método repetible y se acepta o se descarta con los datos.
          El sistema marca cuándo <b>todavía no hay datos suficientes</b> para concluir.</td></tr>
        <tr><td><b>T</b></td><td>Tecnología</td><td>Una aplicación web que funciona sin internet en el
          propio teléfono, guarda los datos localmente y exporta a Excel.</td></tr>
        <tr><td><b>E</b></td><td>Ingeniería</td><td>El dispensador mecánico y su <b>calibración</b>: medir
          cuánto jabón suelta cada pulsada es lo que permite traducir mililitros a lavadas de manos.</td></tr>
        <tr><td><b>A</b></td><td>Arte / Diseño</td><td>El diseño de la captura es parte del experimento:
          si registrar tarda más de treinta segundos nadie lo hace y el estudio se muere. También la
          visualización — una gráfica mal hecha miente sin querer.</td></tr>
        <tr><td><b>M</b></td><td>Matemáticas</td><td>Restas entre mediciones, promedios ponderados de costo,
          reparto proporcional del consumo entre días, consumo per cápita y proyección de existencias.</td></tr>
      </tbody>
    </table></div>
  </div>

  <div class="tarjeta">
    <h2>El dispensador mecánico</h2>
    <p class="menor" style="margin-bottom:16px">Ya lo tiene la escuela: aquí no se diseña, se
      <b>caracteriza</b>. Y de su calibración sale el número que la gente entiende.</p>
    <div class="datos">
      <div class="dato"><div class="et">Capacidad</div><span class="v num">${nu(disp.capacidad,0)}<u>mL</u></span></div>
      <div class="dato ${disp.dosisPorPulsada>0?'':'hueca'}"><div class="et">Dosis por pulsada</div>
        <span class="v num">${disp.dosisPorPulsada > 0 ? nu(disp.dosisPorPulsada,2)+'<u>mL</u>' : 'sin medir'}</span>
        <div class="n">${disp.dosisPorPulsada > 0 ? 'medida en clase' : 'hasta medirla no se pueden calcular lavadas'}</div></div>
    </div>
    <div class="aviso info" style="margin-top:14px">
      <h3>Cómo se mide la dosis (y es el experimento del proyecto)</h3>
      Se acciona el dispensador <b>10 veces sobre una probeta</b> y se divide el volumen entre 10.
      Conviene repetirlo tres veces y promediar: la primera pulsada tras una recarga suele soltar menos
      porque el tubo trae aire.<br><br>
      Para el jabón <b>en barra</b> la dosis no existe: se pesa la barra antes y después de un número
      contado de lavadas, y eso da los <b>gramos por lavada</b>. Son dos experimentos distintos porque son
      dos unidades distintas — mililitros y gramos no se pueden dividir entre lo mismo.
      <br><br><b>Referencia de la literatura</b>, para contrastar con lo que midan: las normas piden
      entre 1.5 y 5 mL por dosis (ASTM E2755: 1.5 mL; EN 1500: 3 mL; ASTM E1174: 5 mL) y la guía Leapfrog
      exige al menos 1.0 mL por accionamiento, pero los estudios de dispensadores reales encuentran que
      muchos entregan <b>menos de 1 mL</b> y que pasar de 1.5 mL es raro. Por eso hay que medir el suyo.
    </div>
    ${disp.notas ? `<p class="pie-nota">${esc(disp.notas)}</p>` : ''}
    ${p0 && p0.lavados != null ? `<div class="aviso bien" style="margin-top:14px">
      <h3>Lo que se puede decir en la presentación</h3>
      Con lo medido hasta ahora, el jabón gastado equivale a <b>${nu(p0.lavados,0)} lavadas de manos</b>.</div>` : ''}
  </div>

  <div class="tarjeta">
    <h2>El método, para que otro grupo lo repita</h2>
    <ol style="padding-left:22px;margin:0;font-size:var(--t-cuerpo)">
      <li style="margin-bottom:10px"><b>Dar de alta los baños</b> con su número de alumnos. Sin ese número
        no hay consumo por alumno — es una división sin denominador.</li>
      <li style="margin-bottom:10px"><b>Calibrar el dispensador</b> (arriba).</li>
      <li style="margin-bottom:10px"><b>Visitar cada baño a la misma hora</b>, todos los días de clase.
        Apuntar sólo dos números: lo que queda y lo que se repone.</li>
      <li style="margin-bottom:10px"><b>Apuntar cada entrega</b> del almacén con su costo.</li>
      <li style="margin-bottom:10px"><b>Dos visitas el mismo día</b> en al menos un baño: es lo único que
        permite saber a qué HORA se gasta.</li>
      <li><b>Exportar a Excel</b> al terminar cada semana. Es el respaldo y es la evidencia.</li>
    </ol>
  </div>

  <div class="tarjeta">
    <h2>Lo que este sistema NO puede decir</h2>
    <p class="menor" style="margin-bottom:12px">Va aquí a propósito. Un proyecto de ciencias que sólo
      enseña lo que sí puede afirmar está incompleto, y un sinodal lo va a preguntar.</p>
    <ul style="padding-left:22px;margin:0;font-size:var(--t-cuerpo)">
      <li style="margin-bottom:9px"><b>No sabe quién gastó.</b> Mide el baño, no a las personas — y así
        debe ser: registrar el uso individual del baño de un alumno sería vigilarlo.</li>
      <li style="margin-bottom:9px"><b>No distingue el uso del desperdicio.</b> Un dispensador que gotea y
        un grupo que se lava bien las manos se ven igual en el número.</li>
      <li style="margin-bottom:9px"><b>No sabe cuánta gente entró.</b> El «por alumno» usa los alumnos
        ASIGNADOS al baño, no los que realmente lo usaron ese día.</li>
      <li><b>Si alguien rellena sin apuntarlo, ese consumo se pierde.</b> El sistema lo detecta y lo
        denuncia, pero no puede recuperarlo.</li>
    </ul>
  </div>

  <div class="tarjeta no-imprimir">
    <h2>Para entregar</h2>
    <div class="par">
      <button class="b fantasma" data-imprimir="1">Imprimir / PDF</button>
      <button class="b" data-excel="1">Excel</button>
    </div>
  </div>`;
};

/* ══ AJUSTES (desde el engrane de la cabecera) ══════════════════════════ */
PINTORES.ajustes = () => `
  <form class="tarjeta" id="formEscuela">
    <h2>La escuela</h2>
    <div class="par">
      <div class="campo"><label for="aNom">Nombre</label>
        <input id="aNom" name="nombre" value="${esc(E.escuela.nombre)}" placeholder="Escuela Secundaria…"></div>
      <div class="campo"><label for="aCic">Ciclo escolar</label>
        <input id="aCic" name="ciclo" value="${esc(E.escuela.ciclo)}" placeholder="2025–2026"></div>
    </div>
    <div class="par">
      <div class="campo"><label for="aTur">Turno</label>
        <input id="aTur" name="turno" value="${esc(E.escuela.turno)}" placeholder="Matutino"></div>
      <div class="campo"><label for="aRes">Responsable</label>
        <input id="aRes" name="responsable" value="${esc(E.escuela.responsable)}" placeholder="Equipo STEAM"></div>
    </div>
    <button class="b" type="submit">Guardar</button>
  </form>

  <form class="tarjeta" id="formDisp">
    <h2>El dispensador</h2>
    <div class="campo"><label for="dMod">Modelo</label>
      <input id="dMod" name="modelo" value="${esc(E.dispensador.modelo)}"></div>
    <div class="par">
      <div class="campo"><label for="dCap">Capacidad (mL)</label>
        <input id="dCap" name="capacidad" type="number" inputmode="decimal" step="any" min="0" value="${E.dispensador.capacidad||''}"></div>
      <div class="campo"><label for="dDos">Dosis por pulsada (mL)</label>
        <input id="dDos" name="dosisPorPulsada" type="number" inputmode="decimal" step="any" min="0"
               value="${E.dispensador.dosisPorPulsada||''}" placeholder="mídela, no la supongas"></div>
    </div>
    <div class="campo"><label for="dNot">Cómo se midió</label>
      <input id="dNot" name="notas" value="${esc(E.dispensador.notas)}" placeholder="10 pulsadas en probeta = 12 mL"></div>
    <button class="b" type="submit">Guardar</button>
  </form>

  <div class="tarjeta">
    <h2>Baños <span class="etq">${E.banos.length}</span></h2>
    ${E.banos.length ? `<ul class="lista">${E.banos.map(b => `<li>
      <div class="txt"><b>${esc(b.nombre)}</b>
        <span>${esc(b.zona||'sin zona')} · ${esc(b.tipo||'—')} · ${b.dispensadores||0} dispensador(es)
        · ${b.alumnos ? b.alumnos + ' alumnos' : '<b style="color:var(--coral-hondo)">sin alumnos: no habrá promedio por alumno</b>'}</span></div>
      <button class="b chico peligro" data-borrar-bano="${esc(b.id)}">Borrar</button></li>`).join('')}</ul>`
      : `<p class="menor">Ninguno todavía.</p>`}
    <div class="sep"></div>
    <form id="formBano">
      <div class="campo"><label for="bNom">Nombre del baño</label>
        <input id="bNom" name="nombre" required placeholder="Baño 1 · planta baja"></div>
      <div class="par">
        <div class="campo"><label for="bZon">Zona o edificio</label>
          <input id="bZon" name="zona" placeholder="Edificio A"></div>
        <div class="campo"><label for="bTip">Tipo</label>
          <select id="bTip" name="tipo"><option>hombres</option><option>mujeres</option><option>mixto</option><option>accesible</option></select></div>
      </div>
      <div class="par">
        <div class="campo"><label for="bDis">Dispensadores</label>
          <input id="bDis" name="dispensadores" type="number" inputmode="numeric" min="0" step="1" value="1"></div>
        <div class="campo"><label for="bAlu">Alumnos que lo usan</label>
          <input id="bAlu" name="alumnos" type="number" inputmode="numeric" min="0" step="1" placeholder="65"></div>
      </div>
      <button class="b ancho" type="submit">Añadir baño</button>
    </form>
  </div>

  <div class="tarjeta">
    <h2>Productos <span class="etq">${E.productos.length}</span></h2>
    ${E.productos.length ? `<ul class="lista">${E.productos.map(p => `<li>
      <div class="txt"><b>${esc(p.nombre)}</b>
        <span><span class="etq ${p.tipo==='solido'?'solido':''}">${esc(p.tipo)}</span>
        envase de ${nu(p.tamanoEnvase,0)} ${M.UNIDAD[p.tipo]}${p.marca?' · '+esc(p.marca):''}
        ${p.tipo==='solido' ? ' · barra de ' + nu(p.gramosPorPieza,0) + ' g' : ''}
        ${p.tipo==='solido' && p.gramosPorLavada ? ' · ' + nu(p.gramosPorLavada,2) + ' g por lavada' : ''}</span></div>
      <button class="b chico peligro" data-borrar-producto="${esc(p.id)}">Borrar</button></li>`).join('')}</ul>`
      : `<p class="menor">Ninguno todavía.</p>`}
    <div class="sep"></div>
    <form id="formProducto">
      <div class="par">
        <div class="campo"><label for="pNom">Nombre</label>
          <input id="pNom" name="nombre" required placeholder="Jabón líquido para manos"></div>
        <div class="campo"><label for="pTip">Tipo</label>
          <select id="pTip" name="tipo"><option value="liquido">líquido (mL)</option><option value="solido">en barra (g)</option></select></div>
      </div>
      <div class="par">
        <div class="campo"><label for="pTam">Contenido por envase</label>
          <input id="pTam" name="tamanoEnvase" type="number" inputmode="decimal" step="any" min="0" required placeholder="5000"></div>
        <div class="campo"><label for="pMar">Marca</label>
          <input id="pMar" name="marca" placeholder="Opcional"></div>
      </div>
      <div class="par" id="soloSolido" hidden>
        <div class="campo"><label for="pPie">Gramos por barra</label>
          <input id="pPie" name="gramosPorPieza" type="number" inputmode="decimal" step="any" min="0" placeholder="150"></div>
        <div class="campo"><label for="pLav">Gramos por lavada (medido)</label>
          <input id="pLav" name="gramosPorLavada" type="number" inputmode="decimal" step="any" min="0" placeholder="0.6"></div>
      </div>
      <button class="b ancho" type="submit">Añadir producto</button>
    </form>
  </div>

  <div class="tarjeta">
    <h2>Respaldo · <b style="color:var(--coral-hondo)">léelo</b></h2>
    <div class="aviso ojo">
      <h3>Los datos viven en ESTE aparato</h3>
      No hay servidor. Si se borran los datos del navegador, se cambia de teléfono o se usa modo privado,
      <b>se pierde todo</b>. Exporta un respaldo cada semana: es un archivo, se manda por correo y se
      vuelve a cargar aquí.
    </div>
    <div class="par">
      <button class="b" data-respaldo="1">Respaldo (.json)</button>
      <button class="b fantasma" data-excel="1">Excel (.xlsx)</button>
    </div>
    <div class="sep"></div>
    <label for="restaurar">Restaurar desde un respaldo</label>
    <input id="restaurar" type="file" accept="application/json,.json">
    <p class="menor" style="margin-top:10px">Reemplaza TODO lo que hay ahora.</p>
  </div>

  <div class="tarjeta">
    <h2>Últimas mediciones <span class="etq">${E.visitas.length}</span></h2>
    <p class="menor" style="margin-bottom:12px">Por si se apuntó una mal. Borrar una medición
      cambia el consumo de los dos intervalos que tocaba.</p>
    ${E.visitas.length ? `<ul class="lista">${[...E.visitas].sort((a,b)=>b.ts-a.ts).slice(0,8).map(v => {
      const b = E.banos.find(x => x.id === v.banoId), p = E.productos.find(x => x.id === v.productoId);
      return `<li><div class="txt"><b>${esc(b?.nombre || '—')}</b>
        <span>${esc(p?.nombre || '—')} · encontró ${esc(soloNumero(v.restante,p))} · repuso ${esc(soloNumero(v.repuesto,p))}</span>
        <span>${esc(M.fechaHora(v.ts))}${v.quien ? ' · ' + esc(v.quien) : ''}</span></div>
        <button class="b chico peligro" data-borrar-visita="${esc(v.id)}">Borrar</button></li>`;
    }).join('')}</ul>` : `<p class="menor">Ninguna todavía.</p>`}
  </div>

  <div class="tarjeta">
    <h2>Demostración y borrado</h2>
    <p class="menor" style="margin-bottom:16px">La demostración carga tres semanas de mediciones
      inventadas —siempre las mismas— para poder enseñar el sistema funcionando antes de tener datos
      reales. Queda marcado en pantalla, en el Excel y en el reporte.</p>
    <div class="par">
      <button class="b fantasma" data-demo="1">Cargar demostración</button>
      <button class="b peligro" data-vaciar="1">Empezar de cero</button>
    </div>
  </div>

  <p class="micro" style="text-align:center;margin:20px 0">Jabonera · Grupo Mazi · funciona sin internet</p>`;

/* ══ acciones ══════════════════════════════════════════════════════════ */
const leer = f => Object.fromEntries(new FormData(f).entries());
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };

document.addEventListener('submit', ev => {
  const f = ev.target, d = leer(f);
  ev.preventDefault();

  if(f.id === 'formVisita'){
    borrador = { restante:d.restante, repuesto:d.repuesto,
                 cuando:d.cuando, quien:d.quien, nota:d.nota };
    paso = 3; return pinta();
  }
  if(f.id === 'formEntrega'){
    const ts = d.cuando ? new Date(d.cuando + 'T09:00').getTime() : Date.now();
    E.entregas.push({ id: D.idNuevo('e'), ts, productoId: d.productoId,
      envases: num(d.envases), costoTotal: num(d.costoTotal), proveedor:(d.proveedor||'').trim() });
    if(salvar()) alerta('Entrega guardada.');
    return pinta();
  }
  if(f.id === 'formBano'){
    E.banos.push({ id: D.idNuevo('b'), nombre:d.nombre.trim(), zona:(d.zona||'').trim(),
      tipo:d.tipo, dispensadores:num(d.dispensadores), alumnos:num(d.alumnos) });
    if(salvar()) alerta('Baño añadido.');
    return pinta();
  }
  if(f.id === 'formProducto'){
    const p = { id: D.idNuevo('p'), nombre:d.nombre.trim(), tipo:d.tipo,
      marca:(d.marca||'').trim(), tamanoEnvase:num(d.tamanoEnvase) };
    if(d.tipo === 'solido'){ p.gramosPorPieza = num(d.gramosPorPieza); p.gramosPorLavada = num(d.gramosPorLavada); }
    E.productos.push(p);
    if(salvar()) alerta('Producto añadido.');
    return pinta();
  }
  if(f.id === 'formEscuela'){ E.escuela = { ...E.escuela, ...d }; if(salvar()) alerta('Guardado.'); return pinta(); }
  if(f.id === 'formDisp'){
    E.dispensador = { ...E.dispensador, modelo:d.modelo, notas:d.notas,
      capacidad:num(d.capacidad), dosisPorPulsada:num(d.dosisPorPulsada) };
    if(salvar()) alerta('Guardado.'); return pinta();
  }
  if(f.id === 'formProyecto'){
    E.proyecto = { ...(E.proyecto||{}), ...d,
      integrantes: String(d.integrantes||'').split('\n').map(s=>s.trim()).filter(Boolean) };
    if(salvar()) alerta('Guardado.'); return pinta();
  }
});

document.addEventListener('change', ev => {
  if(ev.target.id === 'pTip'){ const s = $('#soloSolido'); if(s) s.hidden = ev.target.value !== 'solido'; }
  if(ev.target.id === 'restaurar'){
    const file = ev.target.files[0]; if(!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try{ E = D.sanear(JSON.parse(fr.result)); salvar(); pinta(); alerta('Respaldo restaurado.'); }
      catch(err){ alerta('Ese archivo no es un respaldo de Jabonera.', 'mal'); }
    };
    fr.readAsText(file);
  }
});

document.addEventListener('click', ev => {
  const pes = ev.target.closest('.pestanas button');
  if(pes){ tab = pes.dataset.tab; if(tab === 'registrar') paso = 1; window.scrollTo(0,0); return pinta(); }

  const t = ev.target.closest('[data-bano],[data-producto],[data-ir],[data-ir-registrar],[data-paso],'
    + '[data-poner],[data-guardar],[data-demo],[data-vaciar],[data-excel],[data-reporte],[data-respaldo],'
    + '[data-imprimir],[data-abrir-ajustes],[data-borrar-bano],[data-borrar-producto],[data-borrar-visita]');
  if(!t) return;
  const d = t.dataset;

  if(d.bano){ sel.banoId = d.bano; paso = 2; borrador = { restante:'', repuesto:'' };
              window.scrollTo(0,0); return pinta(); }
  if(d.irRegistrar){ sel.banoId = d.irRegistrar; tab = 'registrar'; paso = 2;
                     borrador = { restante:'', repuesto:'' }; window.scrollTo(0,0); return pinta(); }
  if(d.producto){ sel.productoId = d.producto; return pinta(); }
  if(d.ir){ tab = d.ir; if(tab === 'registrar') paso = 1; window.scrollTo(0,0); return pinta(); }
  if(d.paso){ paso = Number(d.paso); window.scrollTo(0,0); return pinta(); }
  if(d.abrirAjustes){ tab = 'ajustes'; window.scrollTo(0,0); return pinta(); }
  if(d.imprimir) return window.print();

  /* Los atajos de captura: −1 quiere decir «llénalo hasta arriba». */
  if(d.poner){
    const campo = $('#' + d.poner); if(!campo) return;
    const bano = E.banos.find(b => b.id === sel.banoId);
    const prod = E.productos.find(p => p.id === sel.productoId);
    let v = Number(d.valor);
    if(v === -1){
      const r = Number($('#restante')?.value) || 0;
      v = Math.max(0, capacidadDe(bano, prod) - r);
    }
    campo.value = v;
    campo.dispatchEvent(new Event('input', { bubbles:true }));
    return;
  }

  if(d.guardar){
    const prod = E.productos.find(p => p.id === sel.productoId);
    const ts = borrador.cuando ? new Date(borrador.cuando).getTime() : Date.now();
    if(!isFinite(ts)) return alerta('Esa fecha no se entiende.', 'mal');
    E.visitas.push({
      id: D.idNuevo('v'), ts, banoId: sel.banoId, productoId: sel.productoId,
      restante: M.aCanonica(num(borrador.restante), M.UNIDAD[prod.tipo], prod),
      repuesto: M.aCanonica(num(borrador.repuesto), M.UNIDAD[prod.tipo], prod),
      quien: (borrador.quien||'').trim(), nota: (borrador.nota||'').trim(),
    });
    if(borrador.quien) E.ultimoQuien = borrador.quien.trim();
    if(salvar()) alerta('Medición guardada.');
    paso = 1; borrador = { restante:'', repuesto:'' };
    return pinta();
  }

  if(d.demo){
    if(E.visitas.length && !E.demo && !confirm('Esto reemplaza todo lo que hay por datos inventados. ¿Seguro?')) return;
    E = D.datosDemo(); salvar(); alerta('Datos de demostración cargados.'); return pinta();
  }
  if(d.vaciar){
    if(!confirm('Se borra TODO: baños, productos, mediciones y entregas. No se puede deshacer.')) return;
    E = D.estadoVacio(); salvar(); alerta('Listo, de cero.'); return pinta();
  }
  if(d.borrarVisita){
    E.visitas = E.visitas.filter(v => v.id !== d.borrarVisita);
    salvar(); alerta('Medición borrada.'); return pinta();
  }
  if(d.borrarBano){
    const n = E.visitas.filter(v => v.banoId === d.borrarBano).length;
    if(n && !confirm(`Ese baño tiene ${n} medición(es). Se borran también. ¿Seguro?`)) return;
    E.banos = E.banos.filter(b => b.id !== d.borrarBano);
    E.visitas = E.visitas.filter(v => v.banoId !== d.borrarBano);
    salvar(); return pinta();
  }
  if(d.borrarProducto){
    const n = E.visitas.filter(v => v.productoId === d.borrarProducto).length;
    if(n && !confirm(`Ese producto tiene ${n} medición(es). Se borran también. ¿Seguro?`)) return;
    E.productos = E.productos.filter(p => p.id !== d.borrarProducto);
    E.visitas   = E.visitas.filter(v => v.productoId !== d.borrarProducto);
    E.entregas  = E.entregas.filter(x => x.productoId !== d.borrarProducto);
    salvar(); return pinta();
  }

  if(d.excel){
    try{
      const buf = X.libro(D.hojasDeExcel(E, M.informe(E), M));
      bajar(new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `jabonera-${M.fechaISO(Date.now())}.xlsx`);
      alerta('Excel generado.');
    }catch(err){ alerta('No se pudo generar el Excel: ' + err.message, 'mal'); }
  }
  if(d.reporte){
    try{
      const r = RP.paraReportes(E, M.informe(E), M);
      bajar(new Blob([JSON.stringify(r, null, 2)], { type:'application/json' }),
        `reporte-jabonera-${M.fechaISO(Date.now())}.json`);
      alerta('Listo. Ábrelo en Reportes → Guardados → Importar.');
    }catch(err){ alerta('No se pudo generar el reporte: ' + err.message, 'mal'); }
  }
  if(d.respaldo){
    bajar(new Blob([JSON.stringify(E, null, 2)], { type:'application/json' }),
      `jabonera-respaldo-${M.fechaISO(Date.now())}.json`);
    alerta('Respaldo descargado. Guárdalo fuera del teléfono.');
  }
});

function bajar(blob, nombre){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

pinta();
})();
