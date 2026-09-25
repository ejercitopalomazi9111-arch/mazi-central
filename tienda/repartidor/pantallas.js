/* ══════════════════════════════════════════════════════════════════════════
   REPARTIDOR · Bloque 7
   ──────────────────────────────────────────────────────────────────────────
   Se usa con una mano, parado en la banqueta, con el sol encima. Por eso:
   letras grandes, un botón por pantalla que importa, el cobro y el cambio
   del tamaño de la pantalla, y nada que haya que leer dos veces.

   Hoy: sus paradas en orden. Parada: qué entrega, a quién, cuánto cobra y
   cuánto cambio da. Turno: entrada, pausas, salida y cuánto efectivo entrega
   — el cuadre se hace solo con lo que cobró. Historial: lo ya entregado.
   El dueño ve las horas de todos en /a/turnos.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado, numero, descargarCSV } from '../nucleo/piezas.js';
import {
  negocio, yo, miTurno, misTurnos, abrirTurno, pausarTurno, cerrarTurno, cobrosDeTurno,
  misEntregas, pedidoPorId, cambiarEstado, cobrarEntrega, totalConEnvio, turnosNegocio,
} from '../nucleo/datos.js';
import { ESTADOS } from '../cliente/pedir.js';
import { aCentavos, aPesos, sugerirPagos, desglose } from '../nucleo/dinero.js';
import { trabajado, porDia, entre, lunes, quincena, duracion, enPausa, turnoLargo } from '../nucleo/horas.js';
import { rastreo, TEXTO_RASTREO } from '../nucleo/rastreo.js';

const HORA = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });
const DIA = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
const hora = (d) => HORA.format(new Date(d));
const pesosC = (c) => pesos(aPesos(c));
const telLimpio = (t) => String(t || '').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
const direccionTexto = (d) => d?.recoge ? 'Pasa a recoger a la tienda' : [d?.calle, d?.colonia].filter(Boolean).join(', ') || 'Sin dirección';
const destino = (d) => d?.lat ? `${d.lat},${d.lng}` : encodeURIComponent([d?.calle, d?.colonia, d?.cp].filter(Boolean).join(', '));
const ORDEN = { en_camino: 0, no_entregado: 1, preparando: 2, recibido: 3 };
const MOTIVOS_FALLA = ['No estaba nadie', 'La dirección está mal', 'No quiso recibirlo', 'No tenía para pagar'];

/* Sin turno no se reparte: así las horas y el efectivo cuadran. */
function sinTurnoHTML(){
  return estado({ icono: 'turno', titulo: 'Empieza tu turno',
    texto: 'Desde que empiezas se cuentan tus horas y lo que cobras. Tu ubicación sólo se comparte mientras el turno está abierto.',
    extra: `<button class="boton principal grande" data-abrir-turno>${icono('turno')}Empezar mi turno</button>` });
}
function montarSinTurno($c, { aviso, recargar }){
  $c.querySelector('[data-abrir-turno]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget; b.setAttribute('aria-busy', 'true'); b.disabled = true;
    try{ await abrirTurno(); aviso(`Turno abierto a las ${hora(Date.now())}`); recargar(); }
    catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
  });
}

/* ══ HOY ══════════════════════════════════════════════════════════════════ */

async function hoy(){
  const [turno, entregas, persona] = await Promise.all([miTurno(), misEntregas(), yo()]);
  if(!turno) return { html: sinTurnoHTML(), alMontar: montarSinTurno };
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const hechas = (await misEntregas({ desde: hoy0 })).filter((p) => p.estado === 'entregado');
  const pendientes = entregas.sort((a, b) => (ORDEN[a.estado] ?? 9) - (ORDEN[b.estado] ?? 9) || new Date(a.creado) - new Date(b.creado));
  const porCobrar = pendientes.filter((p) => !p.pagado).reduce((t, p) => t + aCentavos(totalConEnvio(p)), 0);
  const cobros = await cobrosDeTurno(turno.id);
  const efectivo = cobros.filter((c) => c.metodo === 'efectivo').reduce((t, c) => t + aCentavos(c.monto), 0);

  const tarjeta = (p, i) => {
    const piezas = p.renglones.reduce((t, r) => t + r.cantidad, 0);
    return `<li><a class="parada-tarjeta${p.estado === 'en_camino' ? ' activa' : ''}" href="${enlace('/r/parada/:id', { id: p.id })}">
      <span class="numero">${i + 1}</span>
      <span class="texto"><strong>${esc(p.cliente?.nombre || 'Cliente')}</strong>
        <small>${esc(direccionTexto(p.direccion))}</small>
        <small>${plural(piezas, 'pieza', 'piezas')} · ${p.pagado ? 'ya pagado' : `cobrar ${pesos(totalConEnvio(p))}`}</small></span>
      <span class="chip ${ESTADOS[p.estado].clase}">${ESTADOS[p.estado].texto}</span>
    </a></li>`;
  };

  return {
    html: `
      <p class="saludo">${esc(persona?.nombre?.split(' ')[0] || 'Hola')}, ${pendientes.length ? `tienes ${plural(pendientes.length, 'entrega', 'entregas')}` : 'por ahora no tienes entregas'}.</p>
      <p class="rastreo" data-rastreo>${icono('lugar')}<span>${TEXTO_RASTREO[rastreo.estado]}</span></p>
      ${enPausa(turno) ? `<p class="aviso-linea">${icono('reloj')}<span>Estás en pausa. <a href="${enlace('/r/turno')}">Regresar al turno</a></span></p>` : ''}
      <div class="cifras">
        <div class="cifra-caja"><span class="valor">${pendientes.length}</span><span class="etq">por entregar</span></div>
        <div class="cifra-caja"><span class="valor">${hechas.length}</span><span class="etq">entregadas hoy</span></div>
        <div class="cifra-caja"><span class="valor">${pesosC(porCobrar)}</span><span class="etq">por cobrar</span></div>
        <a class="cifra-caja boton-cifra" href="${enlace('/r/turno')}"><span class="valor">${pesosC(efectivo)}</span><span class="etq">efectivo que traes</span></a>
      </div>
      ${pendientes.length ? `<section class="seccion"><header><h2>Tus paradas</h2></header><ol class="paradas">${pendientes.map(tarjeta).join('')}</ol></section>`
        : `<p class="vacio-linea">${icono('listo')}Cuando te asignen un pedido aparece aquí. Esta pantalla se actualiza sola.</p>`}`,
    alMontar($c, { recargar }){
      // Con el turno abierto, la ubicación se comparte (y sólo entonces).
      rastreo.iniciar(turno.id);
      const quitar = rastreo.alCambiar((e) => { const el = $c.querySelector('[data-rastreo]'); if(el){ el.className = 'rastreo ' + e; el.lastChild.textContent = TEXTO_RASTREO[e]; } });
      // Sin tiempo real para el repartidor todavía: se refresca cada minuto
      // mientras la pantalla está a la vista (lo asignado le llega solo).
      const reloj = setInterval(() => { if(document.visibilityState === 'visible' && !document.querySelector('dialog[open]')) recargar(); }, 60000);
      return () => { clearInterval(reloj); quitar(); };
    },
  };
}

/* ══ PARADA ═══════════════════════════════════════════════════════════════ */

async function parada({ params }){
  let p;
  if(params.id === 'demo'){
    const l = await misEntregas();
    p = l.sort((a, b) => (ORDEN[a.estado] ?? 9) - (ORDEN[b.estado] ?? 9))[0];
    if(!p) return { html: estado({ icono: 'parada', titulo: 'No tienes paradas pendientes',
      texto: 'Cuando te asignen un pedido, aquí ves a quién, qué y cuánto cobrar.', botones: `<a class="boton principal" href="${enlace('/r')}">Ir a hoy</a>` }) };
  }else p = await pedidoPorId(params.id);
  if(!p) return { html: estado({ icono: 'buscar', titulo: 'Ese pedido no existe', botones: `<a class="boton principal" href="${enlace('/r')}">Ir a hoy</a>` }) };
  const [n, turno] = await Promise.all([negocio(), miTurno()]);
  const d = p.direccion || {}, tel = telLimpio(p.cliente?.telefono);
  const total = aCentavos(totalConEnvio(p));
  const forma = d.pago?.forma || 'efectivo';
  const pagaCon = d.pago?.paga_con && d.pago.paga_con !== 'exacto' ? aCentavos(d.pago.paga_con) : null;
  const terminado = ['entregado', 'cancelado'].includes(p.estado);
  const msgCamino = `Hola ${p.cliente?.nombre || ''}, soy el repartidor de ${n.marca?.nombre_corto || n.nombre}. Voy en camino con tu pedido #${p.folio}.`;
  const msgLlegue = `Hola ${p.cliente?.nombre || ''}, ya estoy afuera con tu pedido #${p.folio}.`;

  return {
    titulo: `Parada #${p.folio}`,
    html: `<div class="parada">
      <section class="tarjeta bloque-form parada-quien">
        <p class="chip ${ESTADOS[p.estado].clase}">${icono(ESTADOS[p.estado].icono)}${ESTADOS[p.estado].texto}</p>
        <h2>${esc(p.cliente?.nombre || 'Cliente')}</h2>
        <p class="direccion-grande">${esc(direccionTexto(d))}</p>
        ${d.referencias ? `<p class="referencias">${icono('info')}${esc(d.referencias)}</p>` : ''}
        ${p.notas ? `<p class="referencias">${icono('lista')}${esc(p.notas)}</p>` : ''}
        <div class="botones-grandes">
          ${!d.recoge ? `<a class="boton principal" href="https://www.google.com/maps/dir/?api=1&destination=${destino(d)}" target="_blank" rel="noopener">${icono('ruta')}Google Maps</a>
            <a class="boton secundario" href="https://waze.com/ul?${d.lat ? `ll=${d.lat},${d.lng}` : `q=${destino(d)}`}&navigate=yes" target="_blank" rel="noopener">${icono('lugar')}Waze</a>` : ''}
          ${tel ? `<a class="boton secundario" href="tel:${tel}">${icono('telefono')}Llamar</a>
            <a class="boton secundario" href="https://wa.me/52${tel}?text=${encodeURIComponent(p.estado === 'en_camino' ? msgLlegue : msgCamino)}" target="_blank" rel="noopener">${icono('conversaciones')}${p.estado === 'en_camino' ? 'Ya llegué' : 'Voy en camino'}</a>` : ''}
        </div>
      </section>

      <section class="tarjeta bloque-form">
        <h2>Qué entregas</h2>
        <p class="nota">Palomea cada cosa al subirla: así no se queda nada en la tienda.</p>
        <ul class="checar">${p.renglones.map((r, i) => `<li><label><input type="checkbox" data-checar="${i}"${terminado ? ' checked disabled' : ''}>
          <span class="cant">${r.cantidad}</span><span>${esc(r.nombre)}</span></label></li>`).join('')}</ul>
      </section>

      ${terminado ? '' : `<section class="tarjeta bloque-form cobro-parada">
        ${p.pagado ? `<p class="cobro-total"><span>Ya está pagado</span><strong>${pesosC(total)}</strong></p>
          <p class="nota">No cobres nada: sólo entrega.</p>`
        : `<p class="cobro-total"><span>Cobrar</span><strong>${pesosC(total)}</strong></p>
          <p class="nota">${esc({ efectivo: 'En efectivo', tarjeta: 'Con tarjeta (terminal)', transferencia: 'Dijo que transfiere: revisa que haya llegado' }[forma] || forma)}${pagaCon ? ` · dijo que paga con ${pesosC(pagaCon)}` : ''}</p>
          <div class="segmentos" role="group" aria-label="Cómo pagó">${['efectivo', 'tarjeta', 'transferencia'].map((m) =>
            `<button type="button" data-metodo="${m}" aria-pressed="${m === forma}">${icono(m)}${{ efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }[m]}</button>`).join('')}</div>
          <div data-efectivo${forma === 'efectivo' ? '' : ' hidden'}>
            <label class="campo" for="recibi"><span class="etiqueta-campo">¿Con cuánto te pagó?</span>
              <input id="recibi" inputmode="decimal" autocomplete="off" value="${pagaCon ? aPesos(pagaCon) : ''}" placeholder="${aPesos(total)}"></label>
            <div class="chips-elegir billetes">${sugerirPagos(total).map((x) => `<button type="button" class="chip-boton" data-recibi="${x}">${x === total ? 'Exacto' : pesosC(x)}</button>`).join('')}</div>
            <div data-cambio aria-live="polite"></div>
          </div>`}
      </section>`}

      ${terminado ? `<a class="boton secundario ancho" href="${enlace('/r')}">${icono('atras')}Regresar a mis paradas</a>`
        : !turno ? `<p class="aviso-linea">${icono('alerta')}<span>Abre tu turno para poder entregar y cobrar. <a href="${enlace('/r')}">Abrir turno</a></span></p>`
        : `<div class="barra-guardar parada-acciones">
          ${p.estado === 'recibido' || p.estado === 'preparando' || p.estado === 'no_entregado'
            ? `<button class="boton principal grande ancho" data-salir>${icono('camion')}Ya voy en camino</button>`
            : `<button class="boton fantasma" data-fallo>No se pudo</button>
               <button class="boton principal grande" data-entregar>${icono('listo')}${p.pagado ? 'Entregado' : 'Entregado y cobrado'}</button>`}
        </div>`}
    </div>`,

    alMontar($c, { aviso, ir, recargar }){
      let metodo = forma;
      const $r = $c.querySelector('#recibi'), $cambio = $c.querySelector('[data-cambio]');
      const recibido = () => { const x = numero($r?.value); return x == null ? total : Number.isNaN(x) ? NaN : aCentavos(x); };
      const pintarCambio = () => {
        if(!$cambio) return;
        const r = recibido();
        $c.querySelectorAll('[data-recibi]').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.recibi) === r && $r.value !== ''));
        if(Number.isNaN(r)){ $cambio.innerHTML = '<p class="falta">Eso no es una cantidad.</p>'; return; }
        if(r < total){ $cambio.innerHTML = `<p class="falta">Faltan ${pesosC(total - r)}</p>`; return; }
        const c = r - total, dz = desglose(c);
        $cambio.innerHTML = `<p class="cambio-grande"><span>Cambio</span><strong>${pesosC(c)}</strong></p>${c ? `<p class="nota">Da: ${dz.piezas.map((x) => `${x.piezas} de ${pesosC(x.valor)}`).join(', ')}${dz.resto ? ` y ${dz.resto} centavos` : ''}</p>` : ''}`;
      };
      $r?.addEventListener('input', pintarCambio);
      pintarCambio();

      $c.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.metodo){ metodo = b.dataset.metodo; $c.querySelectorAll('[data-metodo]').forEach((x) => x.setAttribute('aria-pressed', x === b)); $c.querySelector('[data-efectivo]').hidden = metodo !== 'efectivo'; }
        if(b.dataset.recibi){ $r.value = aPesos(Number(b.dataset.recibi)); pintarCambio(); }
        const ocupar = () => { b.setAttribute('aria-busy', 'true'); b.disabled = true; };
        const soltar = () => { b.removeAttribute('aria-busy'); b.disabled = false; };
        if(b.matches('[data-salir]')){
          ocupar();
          try{ await cambiarEstado(p.id, 'en_camino'); aviso('En camino. Avísale al cliente con el botón de WhatsApp'); recargar(); }
          catch(err){ console.error(err); aviso(err.message, 'mal'); soltar(); }
        }
        if(b.matches('[data-entregar]')){
          const faltan = [...$c.querySelectorAll('[data-checar]')].filter((x) => !x.checked).length;
          if(faltan && !confirm(`Hay ${plural(faltan, 'cosa', 'cosas')} sin palomear. ¿Seguro que entregaste todo?`)) return;
          if(!p.pagado && metodo === 'efectivo'){
            const r = recibido();
            if(Number.isNaN(r) || r < total){ aviso('Revisa con cuánto te pagó', 'mal'); $r.focus(); return; }
          }
          ocupar();
          try{
            let cambio = 0;
            if(!p.pagado){
              const r = await cobrarEntrega(p.id, metodo, metodo === 'efectivo' ? aPesos(recibido()) : null);
              cambio = Number(r?.cambio || 0);
            }
            await cambiarEstado(p.id, 'entregado');
            aviso(cambio ? `Entregado. Cambio: ${pesos(cambio)}` : 'Entregado');
            ir('/r');
          }catch(err){ console.error(err); aviso(err.message, 'mal'); soltar(); }
        }
        if(b.matches('[data-fallo]')){
          const i = prompt(`¿Qué pasó?\n${MOTIVOS_FALLA.map((m, k) => `${k + 1}. ${m}`).join('\n')}\nEscribe el número o el motivo:`);
          if(!i?.trim()) return;
          const motivo = MOTIVOS_FALLA[Number(i) - 1] || i.trim();
          ocupar();
          try{ await cambiarEstado(p.id, 'no_entregado', motivo); aviso('Anotado. La tienda decide cuándo volver'); ir('/r'); }
          catch(err){ console.error(err); aviso(err.message, 'mal'); soltar(); }
        }
      });
    },
  };
}

/* ══ MI TURNO ═════════════════════════════════════════════════════════════ */

async function turnoPantalla(){
  const turno = await miTurno();
  const semana = await misTurnos(lunes());
  const dias = porDia(semana);
  const horasSemana = Object.values(dias).reduce((t, x) => t + x, 0);
  const listaDias = Object.entries(dias).sort().reverse().map(([k, v]) =>
    `<li class="fila"><span class="texto"><strong>${esc(DIA.format(new Date(k + 'T12:00')))}</strong></span><b>${duracion(v)}</b></li>`).join('');
  const semanaHTML = `<section class="seccion"><header><h2>Esta semana · ${duracion(horasSemana)}</h2></header>
    ${listaDias ? `<ul class="lista">${listaDias}</ul>` : '<p class="nota">Todavía sin horas esta semana.</p>'}</section>`;
  if(!turno) return { html: sinTurnoHTML() + semanaHTML, alMontar: montarSinTurno };

  const cobros = await cobrosDeTurno(turno.id);
  const ef = cobros.filter((c) => c.metodo === 'efectivo').reduce((t, c) => t + aCentavos(c.monto), 0);
  const otros = cobros.filter((c) => c.metodo !== 'efectivo').reduce((t, c) => t + aCentavos(c.monto), 0);
  const pausa = enPausa(turno);
  const largo = turnoLargo(turno);

  return {
    html: `${largo ? `<p class="aviso-linea mal" role="alert" data-turno-largo>${icono('alerta')}<span>Tu turno está abierto desde el ${new Date(turno.inicio).toLocaleDateString('es-MX', { weekday: 'long' })} a las ${hora(turno.inicio)} Si se te olvidó cerrarlo, termínalo abajo y dile a la tienda a qué hora saliste de verdad.</span></p>` : ''}
      <div class="turno-reloj${pausa ? ' en-pausa' : ''}">
        <p class="etq">${pausa ? 'En pausa' : 'Trabajando'} · desde las ${hora(turno.inicio)}</p>
        <p class="valor" id="trabajado">${duracion(trabajado(turno))}</p>
        <button class="boton ${pausa ? 'principal' : 'secundario'} grande" data-pausa>${icono(pausa ? 'turno' : 'reloj')}${pausa ? 'Regresar de la pausa' : 'Tomar una pausa'}</button>
      </div>
      <div class="cifras">
        <div class="cifra-caja"><span class="valor">${pesosC(ef)}</span><span class="etq">efectivo que debes entregar</span></div>
        <div class="cifra-caja"><span class="valor">${pesosC(otros)}</span><span class="etq">tarjeta y transferencia</span></div>
        <div class="cifra-caja"><span class="valor">${new Set(cobros.map((c) => c.pedido_id)).size}</span><span class="etq">cobros</span></div>
        <div class="cifra-caja"><span class="valor">${(turno.pausas || []).length}</span><span class="etq">pausas</span></div>
      </div>
      <section class="tarjeta bloque-form">
        <h2>Terminar turno</h2>
        <p class="nota">Cuenta el efectivo y escribe cuánto entregas. Si no cuadra, se anota, no se esconde.</p>
        <form data-cerrar-turno class="en-linea" novalidate>
          <label class="campo" for="entrego"><span class="etiqueta-campo">Efectivo que entregas</span>
            <input id="entrego" inputmode="decimal" autocomplete="off" value="${aPesos(ef)}"></label>
          <button type="submit" class="boton principal">${icono('listo')}Terminar turno</button>
        </form>
      </section>
      ${semanaHTML}`,
    alMontar($c, { aviso, recargar }){
      const reloj = setInterval(() => { const el = $c.querySelector('#trabajado'); if(el) el.textContent = duracion(trabajado(turno)); }, 30000);
      $c.querySelector('[data-pausa]').addEventListener('click', async (e) => {
        const b = e.currentTarget; b.setAttribute('aria-busy', 'true'); b.disabled = true;
        try{ await pausarTurno(!pausa); aviso(pausa ? 'De regreso' : 'En pausa: no cuenta como horas'); recargar(); }
        catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
      });
      $c.querySelector('[data-cerrar-turno]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = numero($c.querySelector('#entrego').value);
        if(v == null || Number.isNaN(v) || v < 0){ aviso('Escribe cuánto efectivo entregas', 'mal'); return; }
        if(!confirm(`¿Terminar el turno entregando ${pesos(v)}?`)) return;
        const b = e.submitter; b.setAttribute('aria-busy', 'true'); b.disabled = true;
        try{
          const r = await cerrarTurno(v);
          rastreo.detener();
          const dif = aCentavos(Number(r.diferencia));
          $c.innerHTML = estado({ icono: 'turno', titulo: 'Turno terminado',
            texto: `Trabajaste ${duracion(trabajado({ ...turno, fin: new Date() }))}.`,
            extra: `<div class="cuadre ${dif === 0 ? 'bien' : dif > 0 ? 'ojo' : 'mal'}"><p class="cuadre-veredicto">${dif === 0 ? 'Cuadró exacto' : dif > 0 ? `Sobran ${pesosC(dif)}` : `Faltan ${pesosC(-dif)}`}</p>
              <dl><dt>Cobraste en efectivo</dt><dd>${pesos(r.esperado)}</dd><dt>Entregas</dt><dd>${pesos(r.entregado)}</dd></dl></div>`,
            botones: `<a class="boton secundario" href="${enlace('/r/historial')}">${icono('historial')}Mi historial</a>` });
          clearInterval(reloj);
        }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
      });
      return () => clearInterval(reloj);
    },
  };
}

/* ══ HISTORIAL ════════════════════════════════════════════════════════════ */

async function historial(){
  const hace14 = new Date(Date.now() - 14 * 86400000);
  const lista = (await misEntregas({ desde: hace14 })).filter((p) => ['entregado', 'no_entregado', 'cancelado'].includes(p.estado)).reverse();
  if(!lista.length) return { html: estado({ icono: 'historial', titulo: 'Sin entregas en las últimas dos semanas', botones: `<a class="boton principal" href="${enlace('/r')}">Ir a hoy</a>` }) };
  const grupos = new Map();
  for(const p of lista){ const k = DIA.format(new Date(p.creado)); if(!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); }
  return {
    html: [...grupos.entries()].map(([dia, ps]) => {
      const ok = ps.filter((p) => p.estado === 'entregado');
      // Lo que la tienda canceló no lo hizo el repartidor: va plegado al final
      // del día, para que no tape las entregas de verdad.
      const suyas = ps.filter((p) => p.estado !== 'cancelado'), canceladas = ps.filter((p) => p.estado === 'cancelado');
      const fila = (p) => `<li><a class="fila" href="${enlace('/r/parada/:id', { id: p.id })}">
          <span class="texto"><strong>#${p.folio} · ${esc(p.cliente?.nombre || 'Cliente')}</strong><small>${esc(direccionTexto(p.direccion))}${p.estado !== 'entregado' ? ` · ${esc(p.eventos_pedido?.slice(-1)[0]?.por_que || '')}` : ''}</small></span>
          <span class="chip ${ESTADOS[p.estado].clase}">${ESTADOS[p.estado].texto}</span></a></li>`;
      return `<section class="seccion"><header><h2>${esc(dia)}</h2><span class="nota">${plural(ok.length, 'entrega', 'entregas')} · ${pesos(ok.reduce((t, p) => t + totalConEnvio(p), 0))}</span></header>
        ${suyas.length ? `<ul class="lista">${suyas.map(fila).join('')}</ul>` : ''}
        ${canceladas.length ? `<details class="plegable" data-canceladas><summary>${plural(canceladas.length, 'pedido cancelado', 'pedidos cancelados')} por la tienda${icono('abajo')}</summary>
          <ul class="lista">${canceladas.map(fila).join('')}</ul></details>` : ''}</section>`;
    }).join(''),
  };
}

/* ══ ADMIN · HORAS Y DÍAS ═════════════════════════════════════════════════ */

async function horas(){
  const desde = new Date(Math.min(quincena().getTime(), lunes().getTime())); desde.setDate(desde.getDate() - 16);
  const turnos = await turnosNegocio(desde);
  const personas = new Map();
  for(const t of turnos){ if(!personas.has(t.perfil_id)) personas.set(t.perfil_id, { nombre: t.quien?.nombre || 'Sin nombre', rol: t.quien?.rol, turnos: [] }); personas.get(t.perfil_id).turnos.push(t); }
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const manana = new Date(hoy0); manana.setDate(manana.getDate() + 1);
  // Cortos a propósito: «Esta quincena» se partía en dos renglones en el teléfono.
  const PERIODOS = { dia: ['Hoy', hoy0], semana: ['Semana', lunes()], quincena: ['Quincena', quincena()] };
  const f = { periodo: 'semana' };

  return {
    html: `<div class="segmentos" role="group" aria-label="Periodo">${Object.entries(PERIODOS).map(([k, [t]]) => `<button data-periodo="${k}" aria-pressed="${k === f.periodo}">${t}</button>`).join('')}</div>
      <div id="horas" class="con-margen"></div>`,
    alMontar($c){
      const filas = () => [...personas.values()].map((p) => {
        const desdeP = PERIODOS[f.periodo][1];
        const ms = p.turnos.reduce((t, x) => t + entre(x, desdeP, manana), 0);
        const dias = Object.entries(porDia(p.turnos)).filter(([k]) => new Date(k + 'T12:00') >= desdeP).length;
        const cerrados = p.turnos.filter((x) => x.fin && new Date(x.inicio) >= desdeP);
        const esperado = cerrados.reduce((t, x) => t + aCentavos(Number(x.efectivo_esperado || 0)), 0);
        const entregado = cerrados.reduce((t, x) => t + aCentavos(Number(x.efectivo_entregado ?? x.efectivo_esperado ?? 0)), 0);
        const abierto = p.turnos.find((x) => !x.fin);
        return { ...p, ms, dias, esperado, entregado, abierto };
      }).filter((p) => p.ms > 0 || p.abierto).sort((a, b) => b.ms - a.ms);
      const pintar = () => {
        const fs = filas();
        $c.querySelector('#horas').innerHTML = fs.length ? `
          <table class="tabla">
            <thead><tr><th>Persona</th><th class="num">Horas</th><th class="num">Días</th><th class="num">Efectivo cobrado</th><th class="num">Entregó</th><th>Ahora</th></tr></thead>
            <tbody>${fs.map((p) => { const dif = p.entregado - p.esperado; return `<tr>
              <td data-etiqueta="Persona"><strong>${esc(p.nombre)}</strong></td>
              <td class="num" data-etiqueta="Horas">${duracion(p.ms)}</td>
              <td class="num" data-etiqueta="Días">${p.dias}</td>
              <td class="num" data-etiqueta="Efectivo cobrado">${pesosC(p.esperado)}</td>
              <td class="num" data-etiqueta="Entregó">${pesosC(p.entregado)}${dif ? ` <span class="chip ${dif > 0 ? 'ojo' : 'mal'}">${dif > 0 ? '+' : '−'}${pesosC(Math.abs(dif))}</span>` : ''}</td>
              <td data-etiqueta="Ahora">${!p.abierto ? '<span class="chip">Fuera</span>'
                : turnoLargo(p.abierto) ? `<span class="chip mal" data-turno-largo title="Abrió ${new Date(p.abierto.inicio).toLocaleString('es-MX')}">¿Olvidó cerrar? Lleva ${Math.floor((Date.now() - new Date(p.abierto.inicio).getTime()) / 3600000)} h</span>`
                : `<span class="chip ${enPausa(p.abierto) ? 'ojo' : 'bien'}">${enPausa(p.abierto) ? 'En pausa' : `Desde ${hora(p.abierto.inicio)}`}</span>`}</td>
            </tr>`; }).join('')}</tbody></table>
          <div class="botones con-margen"><button class="boton secundario" data-csv>${icono('importar')}Descargar para Excel</button></div>`
          : estado({ icono: 'turnos', titulo: 'Sin turnos en este periodo', texto: 'Cuando un repartidor abra su turno, aquí se cuentan sus horas.' });
      };
      $c.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.periodo){ f.periodo = b.dataset.periodo; $c.querySelectorAll('[data-periodo]').forEach((x) => x.setAttribute('aria-pressed', x === b)); pintar(); }
        if(b.matches('[data-csv]')) descargarCSV(`horas-${f.periodo}.csv`, [
          ['Persona', 'Inicio', 'Fin', 'Horas trabajadas', 'Pausas', 'Efectivo cobrado', 'Efectivo entregado'],
          ...[...personas.values()].flatMap((p) => p.turnos.filter((t) => new Date(t.inicio) >= PERIODOS[f.periodo][1]).map((t) =>
            [p.nombre, new Date(t.inicio).toLocaleString('es-MX'), t.fin ? new Date(t.fin).toLocaleString('es-MX') : 'abierto',
             (trabajado(t) / 3600000).toFixed(2), (t.pausas || []).length, t.efectivo_esperado ?? '', t.efectivo_entregado ?? ''])),
        ]);
      });
      pintar();
    },
  };
}

export const PANTALLAS = { repartoHoy: hoy, parada, miTurno: turnoPantalla, historial, horas };
