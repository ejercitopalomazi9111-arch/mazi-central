/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · LA PANTALLA
   ──────────────────────────────────────────────────────────────────────────
   Sólo interfaz: toda la cuenta está en `motor.js` y se comprueba con
   `pruebas.mjs`, que no puede hacer clic en un botón. Aquí no se calcula
   nada que no venga del motor — si algún día hay que sumar en este archivo,
   está mal puesto.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const M = globalThis.JABONERA, D = globalThis.DATOS, X = globalThis.EXCEL;

/* ── utilidades ──────────────────────────────────────────────────────── */
const $  = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nu = (x, dec=0) => x == null || !isFinite(x) ? '—'
  : x.toLocaleString('es-MX', { minimumFractionDigits:dec, maximumFractionDigits:dec });
const pesos = x => x == null || !isFinite(x) ? '—'
  : '$' + x.toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 });
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

/** Cantidad con su unidad, y para la barra también en piezas. Nunca se
 *  imprime un número de jabón sin decir de qué unidad habla. */
function cant(v, p){
  const c = cantPartida(v, p);
  return c.detalle ? `${c.grande} <small>· ${c.detalle}</small>` : c.grande;
}
/** La misma cantidad partida en dos: lo que va en el número grande y lo que
 *  va debajo. En una tarjeta estrecha, «11.91 L · 11,912 mL» se rompía a
 *  media unidad y dejaba un «mL» huérfano en su propio renglón. */
function cantPartida(v, p){
  if(v == null || !isFinite(v)) return { grande:'—', detalle:'' };
  if(!p) return { grande:nu(v,1), detalle:'' };
  if(p.tipo === 'solido'){
    const pz = M.enPiezas(v, p);
    return { grande: nu(v, v < 100 ? 1 : 0) + ' g',
             detalle: pz != null ? `${nu(pz,1)} barras` : '' };
  }
  return v >= 1000
    ? { grande: nu(v/1000, 2) + ' L', detalle: nu(v,0) + ' mL' }
    : { grande: nu(v,0) + ' mL', detalle:'' };
}
const soloNumero = (v,p) => cantPartida(v,p).grande;
const hace = ts => {
  const m = (Date.now() - ts) / 60000;
  if(m < 60) return `hace ${Math.max(1,Math.round(m))} min`;
  if(m < 60*36) return `hace ${Math.round(m/60)} h`;
  return `hace ${Math.round(m/1440)} días`;
};

/* ── gráficas: SVG a mano, sin una sola librería ─────────────────────── */
function columnas(datos, opciones = {}){
  const { unidad='', alto=150, resaltar=-1 } = opciones;
  if(!datos.length || datos.every(d => !(d.v > 0)))
    return `<p class="mini">Todavía no hay suficiente para dibujar esto.</p>`;
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
  if(!filas.length) return `<p class="mini">Sin mediciones todavía.</p>`;
  const max = Math.max(...filas.map(f => f.v));
  return `<div>${filas.map((f,i) => `
    <div style="margin:0 0 9px">
      <div style="display:flex;gap:8px;font-size:13.5px;margin-bottom:3px">
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.et)}</span>
        <b class="num">${nu(f.v, f.v < 100 ? 1 : 0)} ${esc(unidad)}</b>
      </div>
      <div style="height:9px;background:var(--agua-claro);border-radius:5px;overflow:hidden">
        <div style="height:100%;width:${max>0?(f.v/max*100).toFixed(1):0}%;
             background:${i===0?'var(--agua)':'#5FA3AB'};border-radius:5px"></div>
      </div>
      ${f.nota ? `<div class="mini" style="margin-top:2px">${esc(f.nota)}</div>` : ''}
    </div>`).join('')}</div>`;
}

/* ── estado ──────────────────────────────────────────────────────────── */
let E = D.cargar();
let tab = 'registrar';
let sel = { banoId:null, productoId:null };

function salvar(){
  const r = D.guardar(E);
  if(!r.bien) alerta(`No se pudo guardar: ${r.error}. Exporta un respaldo AHORA antes de seguir.`, 'mal');
  return r.bien;
}
let temporizador = null;
function alerta(texto, clase='bien'){
  let c = $('#brindis');
  if(!c){ c = document.createElement('div'); c.id = 'brindis';
    c.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(80px + env(safe-area-inset-bottom));z-index:60';
    document.body.appendChild(c); }
  c.innerHTML = `<div class="aviso ${clase}" style="box-shadow:var(--sombra);margin:0">${esc(texto)}</div>`;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { c.innerHTML = ''; }, 4200);
}

/* ── router ──────────────────────────────────────────────────────────── */
const PINTORES = {};
function pinta(){
  for(const b of document.querySelectorAll('.pestanas button')){
    const activa = b.dataset.tab === tab;
    b.setAttribute('aria-selected', activa ? 'true' : 'false');
  }
  for(const p of document.querySelectorAll('.panel')) p.hidden = p.id !== 'p-' + tab;
  const destino = $('#p-' + tab);
  destino.innerHTML = PINTORES[tab]();
  destino.classList.remove('brinco'); void destino.offsetWidth; destino.classList.add('brinco');

  $('#subCabecera').innerHTML = E.escuela.nombre
    ? `${esc(E.escuela.nombre)}<br>${esc([E.escuela.ciclo, E.escuela.turno].filter(Boolean).join(' · '))}`
    : '';
  $('#letreroDemo').innerHTML = E.demo ? `<div class="aviso mal">
      <h3>Estos son DATOS DE DEMOSTRACIÓN</h3>
      No son mediciones reales: se generaron para poder enseñar el sistema funcionando.
      Antes de usarlo de verdad, ve a <b>Ajustes → Empezar de cero</b>.
      La advertencia también sale impresa en el Excel.</div>` : '';
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('.pestanas button');
  if(b){ tab = b.dataset.tab; pinta(); window.scrollTo(0,0); }
});

/* ══ 1 · REGISTRAR ══════════════════════════════════════════════════════
   La pantalla que se usa DE PIE EN EL BAÑO. Todo lo demás del sistema
   depende de que esto se pueda hacer en menos de treinta segundos, porque
   si tarda más nadie lo llena y a las dos semanas el análisis es una gráfica
   bonita encima de datos inventados. */
PINTORES.registrar = () => {
  if(!E.banos.length || !E.productos.length) return `
    <div class="tarjeta"><div class="vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-5 9 5v11H3z"/><path d="M3 9h18"/></svg>
      <h2>Falta decirle al sistema qué hay</h2>
      <p class="mini">No se puede registrar sin al menos un baño y un producto.</p>
      <button class="b" data-ir="ajustes">Ir a Ajustes</button>
      <div class="sep"></div>
      <p class="mini">¿Sólo quieres ver cómo se ve funcionando?</p>
      <button class="b fantasma" data-demo="1">Cargar datos de demostración</button>
    </div></div>`;

  if(!sel.banoId || !E.banos.some(b => b.id === sel.banoId)) sel.banoId = E.banos[0].id;
  if(!sel.productoId || !E.productos.some(p => p.id === sel.productoId)) sel.productoId = E.productos[0].id;
  const bano = E.banos.find(b => b.id === sel.banoId);
  const prod = E.productos.find(p => p.id === sel.productoId);

  const previas = E.visitas.filter(v => v.banoId === sel.banoId && v.productoId === sel.productoId)
                           .sort((a,b) => b.ts - a.ts);
  const ult = previas[0];
  const dentroAntes = ult ? Number(ult.restante) + Number(ult.repuesto) : null;

  const unidades = prod.tipo === 'liquido'
    ? ['mL','L'] : (prod.gramosPorPieza > 0 ? ['g','pz','kg'] : ['g','kg']);

  const recientes = [...E.visitas].sort((a,b) => b.ts - a.ts).slice(0,6);

  return `
  <div class="tarjeta">
    <h2>¿Qué baño?</h2>
    <div class="fichas" id="fBanos">${E.banos.map(b => `
      <button type="button" data-bano="${esc(b.id)}" aria-pressed="${b.id===sel.banoId}">
        ${esc(b.nombre)}${b.zona ? `<span class="men">${esc(b.zona)}</span>` : ''}
      </button>`).join('')}</div>

    <h2>¿Qué jabón?</h2>
    <div class="fichas" id="fProductos">${E.productos.map(p => `
      <button type="button" data-producto="${esc(p.id)}" aria-pressed="${p.id===sel.productoId}">
        ${esc(p.nombre)}<span class="men">${p.tipo === 'liquido' ? 'líquido · mL' : 'en barra · g'}</span>
      </button>`).join('')}</div>
  </div>

  ${ult ? `<div class="aviso info">
      <h3>La vez anterior · ${esc(hace(ult.ts))}</h3>
      Se dejaron dentro <b>${esc(soloNumero(dentroAntes, prod))}</b>
      (quedaban ${esc(soloNumero(ult.restante, prod))} y se repusieron ${esc(soloNumero(ult.repuesto, prod))}).<br>
      <span class="mini">Lo que apuntes ahora, restado de eso, es el consumo.</span>
    </div>`
    : `<div class="aviso ojo"><h3>Primera visita a este baño</h3>
      Esta medición todavía no dice consumo: hace falta una segunda para poder restar.
      Es normal y es correcto — un solo punto no mide un gasto.</div>`}

  <form class="tarjeta" id="formVisita">
    <h2>La medición</h2>
    <p class="mini" style="margin-bottom:12px">Dos números y ya. Primero lo que ENCUENTRAS, después lo que AÑADES.</p>

    <div class="campo">
      <label for="restante">1 · Lo que encontraste dentro</label>
      <div class="par-unidad">
        <input id="restante" name="restante" type="number" inputmode="decimal" step="any" min="0"
               placeholder="0" required>
        <select name="uRestante" aria-label="Unidad de lo encontrado">
          ${unidades.map(u => `<option>${u}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="campo">
      <label for="repuesto">2 · Lo que añadiste ahora</label>
      <div class="par-unidad">
        <input id="repuesto" name="repuesto" type="number" inputmode="decimal" step="any" min="0"
               placeholder="0" value="0">
        <select name="uRepuesto" aria-label="Unidad de lo añadido">
          ${unidades.map(u => `<option>${u}</option>`).join('')}
        </select>
      </div>
    </div>

    <details style="margin:0 0 12px">
      <summary class="mini" style="cursor:pointer;padding:6px 0">Fecha, quién y notas (casi nunca hace falta)</summary>
      <div class="campo" style="margin-top:10px">
        <label for="cuando">Fecha y hora</label>
        <input id="cuando" name="cuando" type="datetime-local" value="${new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}">
      </div>
      <div class="campo">
        <label for="quien">Quién midió</label>
        <input id="quien" name="quien" type="text" placeholder="Nombre o puesto" value="${esc(E.ultimoQuien||'')}">
      </div>
      <div class="campo">
        <label for="nota">Nota</label>
        <input id="nota" name="nota" type="text" placeholder="Dispensador roto, se derramó…">
      </div>
    </details>

    <button class="b ancho" type="submit">Guardar la medición</button>
  </form>

  <div class="tarjeta">
    <h2>Últimas mediciones</h2>
    ${recientes.length ? `<ul class="lista">${recientes.map(v => {
      const b = E.banos.find(x => x.id === v.banoId), p = E.productos.find(x => x.id === v.productoId);
      return `<li>
        <div class="txt">
          <b>${esc(b?.nombre || '—')}</b>
          <span>${esc(p?.nombre || '—')} · encontró ${esc(soloNumero(v.restante,p))} · repuso ${esc(soloNumero(v.repuesto,p))}</span>
          <span>${esc(M.fechaHora(v.ts))}${v.quien ? ' · ' + esc(v.quien) : ''}</span>
        </div>
        <button class="b chico peligro" data-borrar-visita="${esc(v.id)}" title="Borrar esta medición">Borrar</button>
      </li>`; }).join('')}</ul>`
      : `<p class="mini">Ninguna todavía.</p>`}
  </div>`;
};

/* ══ 2 · ANÁLISIS ══════════════════════════════════════════════════════ */
PINTORES.analisis = () => {
  const inf = M.informe(E);
  const c = inf.calidad;

  if(!c.intervalos) return `
    <div class="tarjeta"><div class="vacio">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
      <h2>Todavía no hay consumo que analizar</h2>
      <p class="mini">El consumo es una resta entre dos visitas al mismo baño.
      Con una sola visita no hay nada que restar — hacen falta dos.</p>
      <button class="b" data-ir="registrar">Registrar una medición</button>
    </div></div>`;

  /* La honestidad va ARRIBA de las gráficas, no debajo en letra chica: es lo
     que decide si lo de abajo se puede citar en un examen o no. */
  const avisos = [];
  if(!c.suficiente) avisos.push(`<div class="aviso ojo">
    <h3>Estos números todavía se mueven</h3>
    Hay <b>${nu(c.dias,1)} días</b> medidos y <b>${c.intervalos}</b> intervalos.
    Por debajo de 7 días y 6 intervalos, un día raro cambia todos los promedios.
    Sirve para enseñar cómo funciona; para concluir, hace falta más campo.</div>`);
  if(c.banosSinDatos.length) avisos.push(`<div class="aviso mal">
    <h3>${c.banosSinDatos.length} baño(s) sin una sola medición</h3>
    ${esc(c.banosSinDatos.join(', '))}. No aparecen abajo: no es que gasten cero, es que no se sabe.</div>`);
  if(c.banosConUnaSolaVisita.length) avisos.push(`<div class="aviso ojo">
    <h3>Baños con una sola visita</h3>
    ${esc(c.banosConUnaSolaVisita.join(', '))} — falta una segunda para poder restar.</div>`);
  if(c.huecos) avisos.push(`<div class="aviso mal">
    <h3>${c.huecos} recarga(s) sin apuntar</h3>
    Apareció jabón que nadie registró (faltan ${nu(c.huecoTotal,0)} unidades sin apuntar).
    Ese consumo se cuenta como 0 en vez de inventarlo, así que <b>el gasto real es mayor que el de abajo</b>.</div>`);

  const cifras = inf.porProducto.map(p => {
    const c = cantPartida(p.consumo, p.producto);
    const notas = [
      c.detalle,
      p.diario != null ? `${soloNumero(p.diario, p.producto)} al día` : null,
      p.lavados != null ? `${nu(p.lavados,0)} lavadas de manos` : null,
    ].filter(Boolean);
    return `
    <div class="cifra ${p.consumo>0?'destacada':''}">
      <div class="et">${esc(p.producto.nombre)}</div>
      <div class="v">${c.grande}</div>
      <div class="n">${esc(notas.join(' · '))}</div>
    </div>`; }).join('');

  const dinero = `
    <div class="cifra"><div class="et">Valor de lo consumido</div>
      <div class="v ${inf.dinero.gasto==null?'':''}">${pesos(inf.dinero.gasto)}</div>
      <div class="n">${inf.dinero.gasto == null
        ? 'Sin entregas registradas no hay precio: no se puede valorar.'
        : 'en ' + nu(inf.rango.dias,1) + ' días medidos'}</div></div>
    <div class="cifra"><div class="et">Invertido en compras</div>
      <div class="v">${pesos(inf.dinero.invertido)}</div>
      <div class="n">todas las entregas registradas</div></div>`;

  /* Por baño: una tarjeta por producto, porque mL y g no se pueden mezclar
     en la misma barra — es la trampa nº 2 del motor. */
  const porProducto = E.productos.map(p => {
    const filas = inf.banos.filter(r => r.productoId === p.id).map(r => ({
      et: r.bano?.nombre || '—', v: r.consumo,
      nota: r.porAlumno != null
        ? `${nu(r.porAlumno,2)} ${M.UNIDAD[p.tipo]} por alumno y día`
        : (r.bano && !r.bano.alumnos ? 'sin alumnos asignados: no hay promedio por alumno' : ''),
    }));
    if(!filas.length) return '';
    return `<div class="tarjeta">
      <h2>Qué baño gasta más · ${esc(p.nombre)}</h2>
      <p class="mini" style="margin-bottom:12px">En ${esc(M.UNIDAD[p.tipo])}, sobre ${nu(inf.rango.dias,1)} días medidos.</p>
      ${ranking(filas, { unidad: M.UNIDAD[p.tipo] })}
    </div>`;
  }).join('');

  /* Por día: se toma el producto de mayor consumo para que la gráfica tenga
     una sola unidad. Mezclarlos daría una curva sin significado. */
  const principal = inf.principal;
  const serie = inf.dia.filter(d => d.productoId === principal.producto.id)
    .map(d => ({ et:d.dia, corta:d.dia.slice(8), v:d.consumo }));

  const sem = inf.semana.map((s,i) => ({ et:DIAS[i], corta:DIAS[i].slice(0,2).toUpperCase(), v:s.consumo }));
  const picoSem = sem.reduce((a,b,i,arr) => arr[a].v >= b.v ? a : i, 0);

  const h = inf.hora;
  const picoHora = h.horas.reduce((a,b,i,arr) => arr[a].consumo >= b.consumo ? a : i, 0);

  return `
    ${avisos.join('')}
    <div class="cifras" style="margin-bottom:12px">${cifras}${dinero}</div>

    ${porProducto}

    <div class="tarjeta">
      <h2>Consumo por día · ${esc(principal.producto.nombre)}</h2>
      <p class="mini" style="margin-bottom:10px">
        Cuando entre dos visitas pasan varios días, el gasto se reparte
        <b>proporcionalmente</b> entre esos días. Cargárselo entero al día de la
        última visita dibujaría picos que no existieron.</p>
      ${columnas(serie, { unidad: M.UNIDAD[principal.producto.tipo] })}
    </div>

    <div class="rejilla dos">
      <div class="tarjeta">
        <h2>Por día de la semana</h2>
        <p class="mini" style="margin-bottom:8px">Sólo <b>${esc(principal.producto.nombre)}</b>,
          en ${esc(M.UNIDAD[principal.producto.tipo])}: mezclar mililitros con gramos
          daría un eje que no es ninguna unidad.</p>
        ${columnas(sem, { unidad:M.UNIDAD[principal.producto.tipo], resaltar:picoSem })}
        <p class="pie-nota">El día de más consumo es el <b>${esc(DIAS[picoSem])}</b>.</p>
      </div>
      <div class="tarjeta">
        <h2>A qué hora se gasta</h2>
        <p class="mini" style="margin-bottom:8px">Sólo ${esc(principal.producto.nombre)}.</p>
        ${h.muestras
          ? columnas(h.horas.map(x => ({ et:x.hora+' h', corta:String(x.hora), v:x.consumo })),
                     { unidad:M.UNIDAD[principal.producto.tipo], resaltar:picoHora }) +
            `<p class="pie-nota">Calculado <b>sólo con ${h.muestras} intervalo(s)</b> de menos de ${h.topeHoras} h;
             se descartaron ${h.descartados} por ser demasiado largos para decir algo de la hora.
             El pico cae hacia las <b>${picoHora}:00</b>.</p>`
          : `<p class="mini">Ninguna medición está lo bastante cerca de la anterior.
             Para saber a qué hora se gasta hacen falta <b>dos visitas el mismo día</b>
             (por ejemplo al entrar y a la salida del recreo).</p>`}
      </div>
    </div>

    <div class="tarjeta no-imprimir">
      <h2>Llevárselo a Excel</h2>
      <p class="mini" style="margin-bottom:12px">Un archivo <b>.xlsx</b> de verdad con
        ${9} hojas: resumen, consumo por baño, por día, por día de la semana, por hora,
        visitas, entregas, baños y productos. Las fechas van como fechas y los pesos
        con formato de moneda, así que se puede seguir analizando dentro de Excel.</p>
      <button class="b ancho" data-excel="1">Exportar a Excel (.xlsx)</button>
    </div>`;
};

/* ══ 3 · ALMACÉN ═══════════════════════════════════════════════════════ */
PINTORES.almacen = () => {
  const inf = M.informe(E);
  const tarjetas = inf.porProducto.map(p => {
    const dias = p.diasRestantes;
    const urgente = dias != null && dias < 7;
    const recargas = M.recargasPosibles(p.almacen, E.dispensador, p.producto);
    return `<div class="tarjeta">
      <h2>${esc(p.producto.nombre)} <span class="etq ${p.producto.tipo==='solido'?'solido':''}">${p.producto.tipo}</span></h2>
      <div class="cifras" style="margin:10px 0">
        <div class="cifra"><div class="et">En el almacén</div>
          <div class="v">${cantPartida(p.almacen, p.producto).grande}</div>
          <div class="n">${[cantPartida(p.almacen,p.producto).detalle,
             'lo comprado menos lo que ya se llevó a los baños'].filter(Boolean).join(' · ')}</div></div>
        <div class="cifra"><div class="et">Puesto en dispensadores</div>
          <div class="v">${cantPartida(p.enDispensadores, p.producto).grande}</div>
          <div class="n">${[cantPartida(p.enDispensadores,p.producto).detalle,
             'esto ya salió del almacén: son dos cuentas distintas'].filter(Boolean).join(' · ')}</div></div>
        <div class="cifra ${urgente?'':''}"><div class="et">Aguanta</div>
          <div class="v ${dias==null?'nula':''}">${dias == null ? 'sin ritmo medido' : nu(dias,1) + ' <small>días</small>'}</div>
          <div class="n">${dias == null ? 'hacen falta dos visitas para saber a qué ritmo se gasta'
            : 'al ritmo de ' + nu(p.diario,0) + ' ' + M.UNIDAD[p.producto.tipo] + ' por día'}</div></div>
      </div>
      ${urgente ? `<div class="aviso mal"><h3>Hay que comprar</h3>
        Al ritmo actual el almacén se vacía en ${nu(dias,1)} días.</div>` : ''}
      <p class="pie-nota">
        ${p.costoUnidad != null ? `Costo medido: <b>${pesos(p.costoUnidad*1000)}</b> por
          ${p.producto.tipo==='liquido'?'litro':'kilo'} (promedio ponderado de todas las entregas).`
          : 'Sin entregas registradas no hay precio, y por eso no se calcula el gasto en pesos.'}
        ${recargas != null ? ` Alcanza para <b>${nu(recargas,1)}</b> recargas completas del dispensador.` : ''}
      </p>
    </div>`;
  }).join('') || `<div class="tarjeta"><p class="mini">Primero hay que dar de alta algún producto en Ajustes.</p></div>`;

  const entregas = [...E.entregas].sort((a,b) => b.ts - a.ts);

  return `
  ${tarjetas}

  <form class="tarjeta" id="formEntrega">
    <h2>Apuntar una entrega</h2>
    <p class="mini" style="margin-bottom:12px">Lo que llega al almacén. <b>Es lo que le pone precio a todo:</b>
      sin entregas el sistema no puede decir cuánto cuesta el jabón que se gastó.</p>
    <div class="campo">
      <label for="ePro">Producto</label>
      <select id="ePro" name="productoId" required>
        ${E.productos.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)} · envase de ${nu(p.tamanoEnvase,0)} ${M.UNIDAD[p.tipo]}</option>`).join('')}
      </select>
    </div>
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
    ${entregas.length ? `<p class="mini pista-desliza">Desliza la tabla de lado para ver el costo por unidad →</p>
      <div class="tabla-caja"><table>
      <thead><tr><th>Fecha</th><th>Producto</th><th class="n">Envases</th><th class="n">Costo</th><th class="n">Por unidad</th></tr></thead>
      <tbody>${entregas.map(e => {
        const p = E.productos.find(x => x.id === e.productoId);
        const total = p ? e.envases * p.tamanoEnvase : null;
        return `<tr>
          <td>${esc(M.fechaISO(e.ts))}</td>
          <td>${esc(p?.nombre || '—')}${e.proveedor?`<br><span class="mini">${esc(e.proveedor)}</span>`:''}</td>
          <td class="n">${nu(e.envases,0)}</td>
          <td class="n">${pesos(e.costoTotal)}</td>
          <td class="n">${total ? pesos(e.costoTotal/total) + '<br><span class="mini">por ' + M.UNIDAD[p.tipo] + '</span>' : '—'}</td>
        </tr>`; }).join('')}</tbody></table></div>`
      : `<p class="mini">Ninguna todavía. Sin entregas no hay precios y el análisis no puede hablar de dinero.</p>`}
  </div>`;
};

/* ══ 4 · PROYECTO (lo que se presenta en el examen) ════════════════════ */
PINTORES.proyecto = () => {
  const inf = M.informe(E);
  const p0 = inf.porProducto[0];
  const disp = E.dispensador;
  return `
  <div class="tarjeta">
    <h2>Qué es esto, en una frase</h2>
    <p>Un sistema para <b>medir</b> cuánto jabón se gasta en los baños de la escuela,
    <b>saber cuándo y dónde</b> se gasta, y <b>decidir con números</b> cuánto comprar
    en vez de a ojo.</p>
    <p class="mini">La pregunta de investigación no es «¿cuánto jabón usamos?» sino
    <b>«¿cuánto jabón hace falta, y cómo lo sabemos?»</b> — la primera se contesta
    pesando una caja; la segunda necesita un método.</p>
  </div>

  <div class="tarjeta">
    <h2>Cómo cumple la modalidad STEAM</h2>
    <p class="mini" style="margin-bottom:12px">Cada letra con lo que de verdad se hace en el
    proyecto, no con una definición de diccionario.</p>
    <div class="tabla-caja tabla-texto"><table>
      <thead><tr><th style="width:26px">·</th><th style="width:74px">Área</th><th>Qué se hace aquí</th></tr></thead>
      <tbody>
        <tr><td><b>S</b></td><td>Ciencia</td><td>Se plantea una hipótesis (unos baños gastan más que otros
          y hay horas pico), se <b>mide</b> con un método repetible y se acepta o se descarta con los datos.
          El sistema marca cuándo <b>todavía no hay datos suficientes</b> para concluir.</td></tr>
        <tr><td><b>T</b></td><td>Tecnología</td><td>Una aplicación web que funciona sin internet
          en el propio teléfono, guarda los datos localmente y exporta a Excel.</td></tr>
        <tr><td><b>E</b></td><td>Ingeniería</td><td>El dispensador mecánico y su <b>calibración</b>:
          medir cuánto jabón suelta cada pulsada es lo que permite traducir mililitros a lavadas de manos.</td></tr>
        <tr><td><b>A</b></td><td>Arte / Diseño</td><td>El diseño de la captura es parte del experimento:
          si registrar tarda más de treinta segundos nadie lo hace y el estudio se muere.
          También la visualización — una gráfica mal hecha miente sin querer.</td></tr>
        <tr><td><b>M</b></td><td>Matemáticas</td><td>Restas entre mediciones, promedios ponderados de costo,
          reparto proporcional del consumo entre días, consumo per cápita y proyección de existencias.</td></tr>
      </tbody>
    </table></div>
  </div>

  <div class="tarjeta">
    <h2>El dispensador mecánico</h2>
    <p class="mini" style="margin-bottom:12px">El dispensador ya lo tiene la escuela: aquí no se diseña,
      se <b>caracteriza</b>. Y de su calibración sale el número que la gente entiende.</p>
    <div class="cifras">
      <div class="cifra"><div class="et">Modelo</div><div class="v" style="font-size:16px">${esc(disp.modelo || '—')}</div></div>
      <div class="cifra"><div class="et">Capacidad</div><div class="v">${nu(disp.capacidad,0)} <small>mL</small></div></div>
      <div class="cifra ${disp.dosisPorPulsada>0?'':'nula'}"><div class="et">Dosis por pulsada</div>
        <div class="v">${disp.dosisPorPulsada > 0 ? nu(disp.dosisPorPulsada,2) + ' <small>mL</small>' : 'sin medir'}</div>
        <div class="n">${disp.dosisPorPulsada > 0 ? '' : 'hasta medirla no se pueden calcular lavadas'}</div></div>
    </div>
    <div class="aviso info" style="margin-top:12px">
      <h3>Cómo se mide la dosis (y es el experimento del proyecto)</h3>
      Se acciona el dispensador <b>10 veces sobre una probeta</b> y se divide el volumen entre 10.
      Conviene repetirlo tres veces y promediar: la primera pulsada después de una recarga
      suele soltar menos porque el tubo trae aire.
      <br><br>Para el jabón <b>en barra</b> la dosis no existe: ahí se pesa la barra antes y después
      de un número contado de lavadas, y eso da los <b>gramos por lavada</b>.
      Son dos experimentos distintos porque son dos unidades distintas — mililitros y gramos no
      se pueden dividir entre lo mismo.
    </div>
    ${disp.notas ? `<p class="pie-nota">${esc(disp.notas)}</p>` : ''}
    ${p0 && p0.lavados != null ? `<div class="aviso bien" style="margin-top:12px">
      <h3>Lo que se puede decir en la presentación</h3>
      Con lo medido hasta ahora, el jabón gastado equivale a
      <b>${nu(p0.lavados,0)} lavadas de manos</b>.</div>` : ''}
  </div>

  <div class="tarjeta">
    <h2>El método, para que otro grupo lo pueda repetir</h2>
    <ol style="padding-left:20px;margin:0">
      <li style="margin-bottom:8px"><b>Dar de alta los baños</b> con su número de alumnos.
        Sin ese número no hay consumo por alumno — es una división sin denominador.</li>
      <li style="margin-bottom:8px"><b>Calibrar el dispensador</b> (arriba).</li>
      <li style="margin-bottom:8px"><b>Visitar cada baño a la misma hora</b>, todos los días de clase.
        Apuntar sólo dos números: lo que queda y lo que se repone.</li>
      <li style="margin-bottom:8px"><b>Apuntar cada entrega</b> del almacén con su costo.</li>
      <li style="margin-bottom:8px"><b>Dos visitas el mismo día</b> (entrada y salida del recreo)
        en al menos un baño: es lo único que permite saber a qué HORA se gasta.</li>
      <li><b>Exportar a Excel</b> al terminar cada semana. Es el respaldo y es la evidencia.</li>
    </ol>
  </div>

  <div class="tarjeta">
    <h2>Lo que este sistema NO puede decir</h2>
    <p class="mini" style="margin-bottom:10px">Va aquí a propósito. Un proyecto de ciencias que sólo
      enseña lo que sí puede afirmar está incompleto, y un sinodal lo va a preguntar.</p>
    <ul style="padding-left:20px;margin:0;font-size:14.5px">
      <li style="margin-bottom:7px"><b>No sabe quién gastó.</b> Mide el baño, no a las personas —
        y así debe ser: registrar el uso individual del baño de un alumno sería vigilarlo.</li>
      <li style="margin-bottom:7px"><b>No distingue el uso del desperdicio.</b> Un dispensador que gotea
        y un grupo que se lava bien las manos se ven igual en el número. Por eso está el campo de notas.</li>
      <li style="margin-bottom:7px"><b>No sabe cuánta gente entró.</b> El «por alumno» usa los alumnos
        ASIGNADOS al baño, no los que realmente lo usaron ese día.</li>
      <li><b>Si alguien rellena sin apuntarlo, ese consumo se pierde.</b> El sistema lo detecta y lo
        denuncia en el análisis, pero no puede recuperarlo.</li>
    </ul>
  </div>

  <div class="tarjeta no-imprimir">
    <h2>Para entregar</h2>
    <p class="mini" style="margin-bottom:12px">La impresión saca <b>todas</b> las secciones, no sólo la abierta.</p>
    <div class="par">
      <button class="b fantasma" data-imprimir="1">Imprimir / guardar PDF</button>
      <button class="b" data-excel="1">Exportar a Excel</button>
    </div>
  </div>`;
};

/* ══ 5 · AJUSTES ═══════════════════════════════════════════════════════ */
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
        · ${b.alumnos ? b.alumnos + ' alumnos' : '<b style="color:var(--alerta)">sin alumnos: no habrá promedio por alumno</b>'}</span></div>
      <button class="b chico peligro" data-borrar-bano="${esc(b.id)}">Borrar</button></li>`).join('')}</ul>`
      : `<p class="mini">Ninguno todavía.</p>`}
    <div class="sep"></div>
    <form id="formBano">
      <div class="campo"><label for="bNom">Nombre del baño</label>
        <input id="bNom" name="nombre" required placeholder="Baño hombres · planta baja"></div>
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
          <input id="bAlu" name="alumnos" type="number" inputmode="numeric" min="0" step="1" placeholder="120"></div>
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
      : `<p class="mini">Ninguno todavía.</p>`}
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
          <input id="pPie" name="gramosPorPieza" type="number" inputmode="decimal" step="any" min="0" placeholder="100"></div>
        <div class="campo"><label for="pLav">Gramos por lavada (medido)</label>
          <input id="pLav" name="gramosPorLavada" type="number" inputmode="decimal" step="any" min="0" placeholder="0.6"></div>
      </div>
      <button class="b ancho" type="submit">Añadir producto</button>
    </form>
  </div>

  <div class="tarjeta">
    <h2>Respaldo · <b style="color:var(--alerta)">léelo</b></h2>
    <div class="aviso ojo">
      <h3>Los datos viven en ESTE aparato</h3>
      No hay servidor. Si se borran los datos del navegador, se cambia de teléfono o se
      usa modo privado, <b>se pierde todo</b>. Exporta un respaldo cada semana:
      es un archivo, se manda por correo y se vuelve a cargar aquí.
    </div>
    <div class="par">
      <button class="b" data-respaldo="1">Descargar respaldo (.json)</button>
      <button class="b fantasma" data-excel="1">Exportar a Excel (.xlsx)</button>
    </div>
    <div class="sep"></div>
    <label for="restaurar">Restaurar desde un respaldo</label>
    <input id="restaurar" type="file" accept="application/json,.json">
    <p class="mini" style="margin-top:8px">Reemplaza TODO lo que hay ahora. Descarga un respaldo antes por si acaso.</p>
  </div>

  <div class="tarjeta">
    <h2>Datos de demostración y borrado</h2>
    <p class="mini" style="margin-bottom:12px">La demostración carga tres semanas de mediciones
      inventadas —siempre las mismas— para poder enseñar el sistema funcionando antes de tener
      datos reales. Queda marcado en pantalla y en el Excel.</p>
    <div class="par">
      <button class="b fantasma" data-demo="1">Cargar demostración</button>
      <button class="b peligro" data-vaciar="1">Empezar de cero</button>
    </div>
  </div>

  <p class="mini" style="text-align:center;margin:16px 0">
    Jabonera · Grupo Mazi · funciona sin internet</p>`;

/* ══ acciones ══════════════════════════════════════════════════════════ */
const leer = f => Object.fromEntries(new FormData(f).entries());
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };

document.addEventListener('submit', ev => {
  const f = ev.target;
  const d = leer(f);
  ev.preventDefault();

  if(f.id === 'formVisita'){
    const p = E.productos.find(x => x.id === sel.productoId);
    const ts = d.cuando ? new Date(d.cuando).getTime() : Date.now();
    if(!isFinite(ts)) return alerta('Esa fecha no se entiende.', 'mal');
    E.visitas.push({
      id: D.idNuevo('v'), ts, banoId: sel.banoId, productoId: sel.productoId,
      restante: M.aCanonica(num(d.restante), d.uRestante, p),
      repuesto: M.aCanonica(num(d.repuesto), d.uRepuesto, p),
      quien: (d.quien||'').trim(), nota: (d.nota||'').trim(),
    });
    if(d.quien) E.ultimoQuien = d.quien.trim();
    if(salvar()) alerta('Medición guardada.');
    return pinta();
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
    if(d.tipo === 'solido'){
      p.gramosPorPieza  = num(d.gramosPorPieza);
      p.gramosPorLavada = num(d.gramosPorLavada);
    }
    E.productos.push(p);
    if(salvar()) alerta('Producto añadido.');
    return pinta();
  }

  if(f.id === 'formEscuela'){ E.escuela = { ...E.escuela, ...d };
    if(salvar()) alerta('Guardado.'); return pinta(); }

  if(f.id === 'formDisp'){
    E.dispensador = { ...E.dispensador, modelo:d.modelo, notas:d.notas,
      capacidad:num(d.capacidad), dosisPorPulsada:num(d.dosisPorPulsada) };
    if(salvar()) alerta('Guardado.'); return pinta();
  }
});

document.addEventListener('change', ev => {
  if(ev.target.id === 'pTip'){
    const solo = $('#soloSolido'); if(solo) solo.hidden = ev.target.value !== 'solido';
  }
  if(ev.target.id === 'restaurar'){
    const file = ev.target.files[0]; if(!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try{
        E = D.sanear(JSON.parse(fr.result));
        salvar(); pinta(); alerta('Respaldo restaurado.');
      }catch(err){ alerta('Ese archivo no es un respaldo de Jabonera.', 'mal'); }
    };
    fr.readAsText(file);
  }
});

document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-bano],[data-producto],[data-ir],[data-demo],[data-vaciar],'
    + '[data-excel],[data-respaldo],[data-imprimir],[data-borrar-visita],[data-borrar-bano],[data-borrar-producto]');
  if(!t) return;
  const d = t.dataset;

  if(d.bano)      { sel.banoId = d.bano;         return pinta(); }
  if(d.producto)  { sel.productoId = d.producto; return pinta(); }
  if(d.ir)        { tab = d.ir; window.scrollTo(0,0); return pinta(); }
  if(d.imprimir)  { return window.print(); }

  if(d.demo){
    if(E.visitas.length && !confirm('Esto reemplaza todo lo que hay ahora por datos inventados. ¿Seguro?')) return;
    E = D.datosDemo(); salvar(); alerta('Datos de demostración cargados.'); return pinta();
  }
  if(d.vaciar){
    if(!confirm('Se borra TODO: baños, productos, mediciones y entregas. Esto no se puede deshacer.')) return;
    E = D.estadoVacio(); salvar(); alerta('Listo, de cero.'); return pinta();
  }
  if(d.borrarVisita){
    E.visitas = E.visitas.filter(v => v.id !== d.borrarVisita); salvar(); alerta('Medición borrada.'); return pinta();
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
      const inf = M.informe(E);
      const buf = X.libro(D.hojasDeExcel(E, inf, M));
      bajar(new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `jabonera-${M.fechaISO(Date.now())}.xlsx`);
      alerta('Excel generado.');
    }catch(err){ alerta('No se pudo generar el Excel: ' + err.message, 'mal'); }
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
