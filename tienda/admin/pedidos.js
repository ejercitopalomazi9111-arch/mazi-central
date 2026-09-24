/* ══════════════════════════════════════════════════════════════════════════
   PEDIDOS Y TABLERO · Bloque 6, el lado del dueño
   ──────────────────────────────────────────────────────────────────────────
   Tablero: lo que el dueño ve al abrir la app — cuánto va hoy, qué pedidos
   hay que mover y qué se está acabando. Se actualiza solo: si llega un pedido,
   suena y aparece, sin recargar.

   Pedidos: cada uno con UN botón grande para el siguiente paso (recibido →
   preparando → en camino → entregado). La máquina de estados vive en el
   servidor (cambiar_estado); aquí sólo se ofrecen los pasos que la base
   acepta, así que no hay botón que lleve a un error.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado, hoja, fecha } from '../nucleo/piezas.js';
import {
  negocio, pedidosNegocio, repartidores, asignarRepartidor, cambiarEstado, escucharPedidos,
  cobrarEntrega, totalConEnvio, ventasDesde, catalogoAdmin,
} from '../nucleo/datos.js';
import { ESTADOS } from '../cliente/pedir.js';
import { aCentavos, aPesos, sugerirPagos } from '../nucleo/dinero.js';

const HORA = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });
const hora = (d) => HORA.format(new Date(d));
const pesosR = (c) => '$' + Math.round(c / 100).toLocaleString('es-MX');
const EN_CURSO = ['recibido', 'preparando', 'en_camino', 'no_entregado'];

/* El siguiente paso de cada estado, dicho como lo diría quien despacha. */
const SIGUIENTE = {
  recibido:     { a: 'preparando', texto: 'Empezar a preparar', icono: 'caja' },
  preparando:   { a: 'en_camino', texto: 'Ya salió', icono: 'camion' },
  en_camino:    { a: 'entregado', texto: 'Se entregó', icono: 'listo' },
  no_entregado: { a: 'en_camino', texto: 'Volver a mandar', icono: 'camion' },
};
const recoge = (p) => !!p.direccion?.recoge;

/* Hace cuánto, en palabras. Un pedido de hace 40 minutos sin mover es lo que
   el dueño tiene que ver primero. */
function hace(d){
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if(m < 1) return 'ahorita';
  if(m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `hace ${h} h${m % 60 ? ` ${m % 60} min` : ''}` : fecha(d);
}
const tarde = (p) => p.estado === 'recibido' && Date.now() - new Date(p.creado) > 20 * 60000;

const telLimpio = (t) => String(t || '').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
function whatsapp(p, n){
  const tel = telLimpio(p.cliente?.telefono);
  if(tel.length !== 10) return '';
  const msg = {
    recibido: `Hola ${p.cliente?.nombre || ''}, recibimos tu pedido #${p.folio}. En un momento lo preparamos.`,
    preparando: `Hola ${p.cliente?.nombre || ''}, ya estamos preparando tu pedido #${p.folio}.`,
    en_camino: `Hola ${p.cliente?.nombre || ''}, tu pedido #${p.folio} ya va en camino. Total: ${pesos(totalConEnvio(p))}.`,
    entregado: `¡Gracias por tu compra, ${p.cliente?.nombre || ''}! Cualquier cosa, aquí estamos.`,
    no_entregado: `Hola ${p.cliente?.nombre || ''}, no pudimos entregar tu pedido #${p.folio}. ¿Cuándo te lo llevamos?`,
    cancelado: `Hola ${p.cliente?.nombre || ''}, tu pedido #${p.folio} se canceló.`,
  }[p.estado] + ` — ${n.marca?.nombre_corto || n.nombre}`;
  return `https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`;
}
const mapa = (d) => d?.lat ? `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`
  : d?.calle ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([d.calle, d.colonia, d.cp].filter(Boolean).join(', '))}` : '';

/* ── Una tarjeta de pedido (la usan Tablero y Pedidos) ─────────────────── */
function tarjetaPedido(p, reps){
  const e = ESTADOS[p.estado], sig = SIGUIENTE[p.estado];
  const piezas = p.renglones.reduce((t, r) => t + r.cantidad, 0);
  const pago = p.direccion?.pago;
  return `<li class="tarjeta pedido-admin${tarde(p) ? ' tarde' : ''}" data-pedido="${p.id}">
    <header>
      <div><h3>#${p.folio} · ${esc(p.cliente?.nombre || 'Cliente')}</h3>
        <p class="nota">${hace(p.creado)} · ${plural(piezas, 'pieza', 'piezas')} · ${recoge(p) ? 'pasa a recoger' : esc(p.direccion?.colonia || 'a domicilio')}</p></div>
      <div class="lado"><strong>${pesos(totalConEnvio(p))}</strong><span class="chip ${e.clase}">${icono(e.icono)}${e.texto}</span></div>
    </header>
    <p class="pago-linea">${p.pagado ? `<span class="chip bien">Pagado</span>` : `<span class="chip">${esc({ efectivo: 'Efectivo al recibir', tarjeta: 'Tarjeta al recibir', transferencia: 'Transferencia (revisar)' }[pago?.forma] || 'Por cobrar')}</span>`}
      ${pago?.paga_con ? `<span class="nota">paga con ${pago.paga_con === 'exacto' ? 'lo exacto' : pesos(pago.paga_con)}</span>` : ''}
      ${tarde(p) ? `<span class="chip mal">${icono('reloj')}Lleva rato sin moverse</span>` : ''}</p>
    ${!recoge(p) && reps.length && ['recibido', 'preparando', 'no_entregado'].includes(p.estado) ? `<label class="campo compacto"><span class="etiqueta-campo">Repartidor</span>
      <select data-asignar="${p.id}"><option value="">Sin asignar</option>${reps.map((r) => `<option value="${r.id}"${r.id === p.repartidor_id ? ' selected' : ''}>${esc(r.nombre || 'Repartidor')}</option>`).join('')}</select></label>`
      : p.repartidor?.nombre ? `<p class="nota">${icono('camion')}${esc(p.repartidor.nombre)}</p>` : ''}
    <div class="botones">
      ${sig ? `<button class="boton principal" data-paso="${sig.a}">${icono(sig.icono)}${recoge(p) && sig.a === 'en_camino' ? 'Listo para recoger' : sig.texto}</button>` : ''}
      ${p.estado === 'entregado' && !p.pagado ? `<button class="boton principal" data-cobrar>${icono('efectivo')}Registrar cobro</button>` : ''}
      <button class="boton secundario" data-detalle>${icono('ver')}Detalle</button>
    </div>
  </li>`;
}

/* ── Detalle y acciones (compartido) ───────────────────────────────────── */
function montarPedidos($c, { lista, reps: _reps, aviso, recargar }){
  const buscar = (el) => lista().find((p) => p.id === el.closest('[data-pedido]')?.dataset.pedido);
  $c.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-asignar]'); if(!s || !s.value) return;
    try{ await asignarRepartidor(s.dataset.asignar, s.value); aviso(`Asignado a ${s.selectedOptions[0].textContent}`); }
    catch(err){ console.error(err); aviso(err.message, 'mal'); }
  });
  // La hoja del detalle vive fuera de $c (en <body>): se le cuelga el mismo
  // manejador, o sus botones no harían nada.
  const manejar = async (e) => {
    const b = e.target.closest('button'); if(!b) return;
    const p = buscar(b); if(!p) return;
    if(b.dataset.paso){
      let motivo = null;
      if(b.dataset.paso === 'cancelado' || b.dataset.paso === 'no_entregado'){
        motivo = prompt(b.dataset.paso === 'cancelado' ? '¿Por qué se cancela? (se le dice al cliente)' : '¿Qué pasó? (no estaba, dirección mal…)');
        if(!motivo?.trim()) return;
      }
      b.setAttribute('aria-busy', 'true'); b.disabled = true;
      try{
        await cambiarEstado(p.id, b.dataset.paso, motivo?.trim());
        aviso(`#${p.folio}: ${ESTADOS[b.dataset.paso].texto}`);
        document.querySelector('dialog.hoja')?.close();
        recargar();
      }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
    }
    if(b.matches('[data-cobrar]')) hojaCobrar(p, { aviso, recargar });
    if(b.matches('[data-detalle]')) (await hojaDetalle(p)).addEventListener('click', manejar);
  };
  $c.addEventListener('click', manejar);
}

async function hojaDetalle(p){
  const n = await negocio();
  const d = p.direccion || {}, wa = whatsapp(p, n), m = mapa(d);
  const envio = Number(p.envio) || Number(d.envio || 0);
  const puedeCancelar = ['recibido', 'preparando'].includes(p.estado);
  const puedeFallar = p.estado === 'en_camino';
  const h = hoja({ titulo: `Pedido #${p.folio}`, cuerpo: `<div data-pedido="${p.id}">
    <p class="nota">${esc(fecha(p.creado))} · ${ESTADOS[p.estado].texto}</p>
    <h3>${esc(p.cliente?.nombre || 'Cliente')}</h3>
    <div class="botones">
      ${wa ? `<a class="boton secundario" href="${wa}" target="_blank" rel="noopener">${icono('conversaciones')}WhatsApp</a>` : ''}
      ${p.cliente?.telefono ? `<a class="boton secundario" href="tel:${esc(telLimpio(p.cliente.telefono))}">${icono('telefono')}Llamar</a>` : ''}
      ${m ? `<a class="boton secundario" href="${m}" target="_blank" rel="noopener">${icono('lugar')}Mapa</a>` : ''}
    </div>
    <p>${d.recoge ? 'Pasa a recoger a la tienda.' : esc([d.calle, d.colonia, d.cp].filter(Boolean).join(', '))}</p>
    ${d.referencias ? `<p class="nota">${esc(d.referencias)}</p>` : ''}
    ${p.notas ? `<p class="aviso-linea">${icono('info')}<span>${esc(p.notas)}</span></p>` : ''}
    <ul class="resumen-lista">${p.renglones.map((r) => `<li><span>${r.cantidad} × ${esc(r.nombre)}</span><b>${pesos(r.importe)}</b></li>`).join('')}</ul>
    <dl class="cuentas">${envio ? `<dt>Envío</dt><dd>${pesos(envio)}</dd>` : ''}<dt class="total">Total</dt><dd class="total">${pesos(totalConEnvio(p))}</dd></dl>
    <div class="botones pie-hoja">
      ${puedeCancelar ? `<button class="boton peligro" data-paso="cancelado">${icono('cerrar')}Cancelar pedido</button>` : ''}
      ${puedeFallar ? `<button class="boton peligro" data-paso="no_entregado">${icono('alerta')}No se pudo entregar</button>` : ''}
      ${SIGUIENTE[p.estado] ? `<button class="boton principal" data-paso="${SIGUIENTE[p.estado].a}">${icono(SIGUIENTE[p.estado].icono)}${SIGUIENTE[p.estado].texto}</button>` : ''}
    </div></div>` });
  return h;
}

function hojaCobrar(p, { aviso, recargar }){
  const total = aCentavos(totalConEnvio(p));
  let metodo = 'efectivo';
  const d = hoja({ titulo: `Cobrar #${p.folio}`, clase: 'hoja-cobro', cuerpo: `<form data-cobro-entrega novalidate>
    <p class="cobro-total"><span>Total</span><strong>${pesos(aPesos(total))}</strong></p>
    <div class="segmentos" role="group" aria-label="Forma de pago">${['efectivo', 'tarjeta', 'transferencia'].map((m) =>
      `<button type="button" data-metodo="${m}" aria-pressed="${m === metodo}">${icono(m)}${{ efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }[m]}</button>`).join('')}</div>
    <div class="chips-elegir billetes" data-billetes>${sugerirPagos(total).map((x) => `<button type="button" class="chip-boton" data-recibi="${x}">${x === total ? 'Exacto' : pesos(aPesos(x))}</button>`).join('')}</div>
    <p class="nota" data-cambio aria-live="polite"></p>
    <button type="submit" class="boton principal grande ancho">${icono('listo')}Registrar cobro</button></form>` });
  let recibido = total;
  d.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.metodo){ metodo = b.dataset.metodo; d.querySelectorAll('[data-metodo]').forEach((x) => x.setAttribute('aria-pressed', x === b)); d.querySelector('[data-billetes]').hidden = metodo !== 'efectivo'; }
    if(b.dataset.recibi){ recibido = Number(b.dataset.recibi); d.querySelectorAll('[data-recibi]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      d.querySelector('[data-cambio]').textContent = recibido > total ? `Cambio: ${pesos(aPesos(recibido - total))}` : ''; }
  });
  d.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = e.submitter; b.setAttribute('aria-busy', 'true'); b.disabled = true;
    try{ await cobrarEntrega(p.id, metodo, metodo === 'efectivo' ? aPesos(recibido) : null); aviso(`#${p.folio} cobrado`); d.close(); recargar(); }
    catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
  });
}

/* Un timbre corto con WebAudio: sin archivo que bajar, y sólo si la pestaña
   está a la vista (el navegador no deja sonar sin que hayan tocado antes). */
function timbre(){
  try{
    const a = new (self.AudioContext || self.webkitAudioContext)();
    [880, 1320].forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = f; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.0001, a.currentTime + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.25, a.currentTime + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + i * 0.16 + 0.3);
      o.start(a.currentTime + i * 0.16); o.stop(a.currentTime + i * 0.16 + 0.32);
    });
    setTimeout(() => a.close(), 800);
  }catch(e){}
}

/* ══ TABLERO ══════════════════════════════════════════════════════════════ */

async function tablero(){
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [ventas, enCurso, reps, cat] = await Promise.all([
    ventasDesde(hoy), pedidosNegocio({ estados: EN_CURSO }), repartidores().catch(() => []), catalogoAdmin(),
  ]);
  let pedidos = enCurso;
  const acaban = cat.productos.filter((p) => p.activo && (p.existencia.cantidad - p.existencia.apartado <= 0
    || (p.existencia.minimo > 0 && p.existencia.cantidad - p.existencia.apartado <= p.existencia.minimo)))
    .sort((a, b) => (a.existencia.cantidad - a.existencia.minimo) - (b.existencia.cantidad - b.existencia.minimo));
  const vendido = ventas.filter((v) => v.estado !== 'cancelado').reduce((t, v) => t + aCentavos(totalConEnvio(v)), 0);
  const porCobrar = ventas.filter((v) => !v.pagado && v.estado !== 'cancelado').reduce((t, v) => t + aCentavos(totalConEnvio(v)), 0);
  const h = new Date().getHours();

  const pintarPedidos = () => pedidos.length
    ? `<ul class="pedidos-admin">${pedidos.slice(0, 12).map((p) => tarjetaPedido(p, reps)).join('')}</ul>
       ${pedidos.length > 12 ? `<a class="boton secundario" href="${enlace('/a/pedidos')}">Ver los ${pedidos.length}</a>` : ''}`
    : `<p class="vacio-linea">${icono('listo')}Nada pendiente. Cuando llegue un pedido, suena y aparece aquí.</p>`;

  return {
    html: `
      <p class="saludo">${h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'}. Así va hoy:</p>
      <div class="cifras">
        <a class="cifra-caja boton-cifra" href="${enlace('/v/ventas')}"><span class="valor">${pesosR(vendido)}</span><span class="etq">vendido hoy · ${plural(ventas.length, 'venta', 'ventas')}</span></a>
        <a class="cifra-caja boton-cifra" href="${enlace('/a/pedidos')}"><span class="valor" id="t-curso">${pedidos.length}</span><span class="etq">pedidos por mover</span></a>
        <div class="cifra-caja"><span class="valor ${porCobrar ? 'ojo' : ''}">${pesosR(porCobrar)}</span><span class="etq">por cobrar</span></div>
        <a class="cifra-caja boton-cifra" href="${enlace('/a/inventario')}"><span class="valor ${acaban.length ? 'mal' : ''}">${acaban.length}</span><span class="etq">se acaban o agotados</span></a>
      </div>
      <div class="tablero-cols">
        <section class="seccion"><header><h2>Pedidos por mover</h2><span class="en-vivo" id="en-vivo" title="Se actualiza solo">${icono('reloj')}Conectando…</span></header>
          <div id="t-pedidos">${pintarPedidos()}</div></section>
        <section class="seccion"><header><h2>Se está acabando</h2><a class="ver-todo" href="${enlace('/a/inventario')}">Inventario</a></header>
          ${acaban.length ? `<ul class="lista">${acaban.slice(0, 8).map((p) => {
            const q = p.existencia.cantidad - p.existencia.apartado;
            return `<li><a class="fila" href="${enlace('/a/producto/:id', { id: p.id })}"><span class="texto"><strong>${esc(p.nombre)}</strong>
              <small>${p.existencia.minimo ? `mínimo ${p.existencia.minimo}` : 'sin mínimo'}</small></span>
              <span class="chip ${q <= 0 ? 'mal' : 'ojo'}">${q <= 0 ? 'Agotado' : `Quedan ${q}`}</span></a></li>`;
          }).join('')}</ul>` : `<p class="vacio-linea">${icono('listo')}Todo con existencias.</p>`}
        </section>
      </div>`,
    alMontar($c, ctx){
      const vistos = new Set(pedidos.map((p) => p.id));
      const refrescar = async (evento) => {
        try{
          pedidos = await pedidosNegocio({ estados: EN_CURSO });
          const nuevos = pedidos.filter((p) => !vistos.has(p.id));
          nuevos.forEach((p) => vistos.add(p.id));
          if(nuevos.length && evento){ timbre(); ctx.aviso(nuevos.length === 1 ? `Pedido nuevo #${nuevos[0].folio}` : `${nuevos.length} pedidos nuevos`); }
          const $p = $c.querySelector('#t-pedidos'); if(!$p) return;
          $p.innerHTML = pintarPedidos();
          $c.querySelector('#t-curso').textContent = pedidos.length;
        }catch(e){ console.error(e); }
      };
      montarPedidos($c, { lista: () => pedidos, reps, aviso: ctx.aviso, recargar: () => refrescar(null) });
      let oido;
      escucharPedidos(refrescar).then((o) => {
        oido = o;
        const marca = () => { const el = $c.querySelector('#en-vivo'); if(el) el.innerHTML = o.vivo() ? `<span class="punto-vivo"></span>En vivo` : `${icono('reloj')}Cada 30 s`; };
        setTimeout(marca, 2500);
      });
      return () => oido?.cerrar();
    },
  };
}

/* ══ PEDIDOS ══════════════════════════════════════════════════════════════ */

const VISTAS = [
  ['curso', 'Por mover', EN_CURSO], ['recibido', 'Nuevos', ['recibido']], ['preparando', 'Preparando', ['preparando']],
  ['en_camino', 'En camino', ['en_camino']], ['entregado', 'Entregados', ['entregado']], ['cancelado', 'Cancelados', ['cancelado']],
];

async function pedidosAdmin(){
  const hace30 = new Date(Date.now() - 30 * 86400000);
  const [todos, reps] = await Promise.all([pedidosNegocio({ desde: hace30 }), repartidores().catch(() => [])]);
  let lista = todos;
  const f = { vista: 'curso' };
  const cuenta = (estados) => lista.filter((p) => estados.includes(p.estado)).length;

  return {
    html: `<div class="segmentos desliza" role="group" aria-label="Qué pedidos ver" id="vistas"></div>
      <div id="lista-pedidos"></div>
      <p class="nota">Los pedidos de los últimos 30 días. Las ventas de mostrador están en <a href="${enlace('/v/ventas')}">Ventas de hoy</a>.</p>`,
    alMontar($c, ctx){
      const pintar = () => {
        $c.querySelector('#vistas').innerHTML = VISTAS.map(([k, t, es]) => `<button data-vista="${k}" aria-pressed="${k === f.vista}">${t}${cuenta(es) ? ` <span class="cuenta-chica">${cuenta(es)}</span>` : ''}</button>`).join('');
        const es = VISTAS.find((v) => v[0] === f.vista)[2];
        const vs = lista.filter((p) => es.includes(p.estado));
        // Por mover: lo más viejo primero (es lo que urge). Lo demás: lo más nuevo.
        if(f.vista === 'curso') vs.sort((a, b) => new Date(a.creado) - new Date(b.creado));
        $c.querySelector('#lista-pedidos').innerHTML = vs.length ? `<ul class="pedidos-admin">${vs.map((p) => tarjetaPedido(p, reps)).join('')}</ul>`
          : estado({ icono: 'pedidos', titulo: f.vista === 'curso' ? 'Nada por mover' : 'Nada aquí', texto: f.vista === 'curso' ? 'Cuando entre un pedido de la tienda, aparece aquí.' : '' });
      };
      const refrescar = async () => { try{ lista = await pedidosNegocio({ desde: hace30 }); pintar(); }catch(e){ console.error(e); } };
      $c.addEventListener('click', (e) => { const b = e.target.closest('[data-vista]'); if(b){ f.vista = b.dataset.vista; pintar(); } });
      montarPedidos($c, { lista: () => lista, reps, aviso: ctx.aviso, recargar: refrescar });
      pintar();
      let oido;
      escucharPedidos((ev) => { refrescar(); if(ev?.eventType === 'INSERT'){ timbre(); ctx.aviso('Pedido nuevo'); } }).then((o) => { oido = o; });
      return () => oido?.cerrar();
    },
  };
}

export const PANTALLAS = { tablero, pedidosAdmin };
