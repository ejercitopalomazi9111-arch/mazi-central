/* ══════════════════════════════════════════════════════════════════════════
   DEVOLUCIONES · Bloque 5
   ──────────────────────────────────────────────────────────────────────────
   Buscar el ticket, marcar qué regresa y por qué, y cómo se le devuelve el
   dinero. Lo que tiene que ser cierto:
     · no se devuelve más de lo que se vendió, contando lo ya devuelto;
     · el reembolso sale del precio de LA VENTA (con su descuento), no del
       precio de hoy;
     · el motivo es obligatorio: una devolución sin razón es la que nadie
       explica en el corte;
     · el efectivo que sale del cajón aparece en el corte de caja.
   Las cuentas viven en nucleo/devolucion.js (14 pruebas).
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado, fecha } from '../nucleo/piezas.js';
import { negocio, ventaPorFolio, ventasDesde, devueltasDe, devolver, yo } from '../nucleo/datos.js';
import { disponibles, importe, METODOS } from '../nucleo/devolucion.js';
import { aPesos } from '../nucleo/dinero.js';
import { imprimir, abrirCajon } from '../nucleo/impresion/impresora.js';

const NOMBRE_METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
const MOTIVOS = ['Salió defectuoso', 'No era lo que buscaba', 'Se equivocó de producto', 'Llegó dañado'];
const pesosC = (c) => pesos(aPesos(c));
const HORA = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });

async function devolucion(){
  const ayer = new Date(); ayer.setHours(0, 0, 0, 0); ayer.setDate(ayer.getDate() - 1);
  const [recientes, quien] = await Promise.all([ventasDesde(ayer).catch(() => []), yo()]);
  const entregadas = recientes.filter((v) => v.estado === 'entregado').slice(0, 12);

  return {
    html: `
      <form id="buscar-ticket" class="barra-folio" novalidate>
        <label class="campo" for="folio"><span class="etiqueta-campo">Número de ticket</span>
          <span class="ayuda">Viene arriba en el ticket: «Ticket #21».</span>
          <input id="folio" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="21" maxlength="8"></label>
        <button type="submit" class="boton principal">${icono('buscar')}Buscar</button>
      </form>
      <div id="devolver"></div>
      ${entregadas.length ? `<section class="seccion" id="recientes"><header><h2>Ventas de ayer y hoy</h2></header>
        <ul class="lista">${entregadas.map((v) => `<li><button class="fila" data-folio="${v.folio}">
          <span class="texto"><strong>#${v.folio} · ${pesos(v.total)}</strong>
            <small>${esc(new Date(v.creado).toDateString() === new Date().toDateString() ? 'hoy ' + HORA.format(new Date(v.creado)) : fecha(v.creado))} · ${plural(v.renglones.reduce((t, r) => t + r.cantidad, 0), 'pieza', 'piezas')} · ${esc(v.renglones.map((r) => r.nombre).join(', ')).slice(0, 80)}</small></span>
          ${icono('adelante')}</button></li>`).join('')}</ul></section>` : ''}`,

    alMontar($c, { aviso }){
      const $d = $c.querySelector('#devolver'), $folio = $c.querySelector('#folio');

      const abrir = async (folio) => {
        $d.innerHTML = `<p class="nota" aria-busy="true">Buscando el ticket #${esc(folio)}…</p>`;
        try{
          const venta = await ventaPorFolio(folio);
          if(!venta){ $d.innerHTML = estado({ icono: 'buscar', titulo: `No hay ticket #${esc(folio)}`, texto: 'Revisa el número. Está arriba en el ticket impreso.' }); return; }
          if(venta.estado !== 'entregado'){
            $d.innerHTML = estado({ icono: 'info', titulo: `El #${venta.folio} todavía no se entrega`,
              texto: venta.estado === 'cancelado' ? 'Ese pedido se canceló: las piezas ya regresaron al inventario.' : 'Lo que no se ha entregado no se devuelve: se cancela desde Pedidos.',
              botones: venta.estado !== 'cancelado' ? `<a class="boton secundario" href="${enlace('/a/pedidos')}">Ir a Pedidos</a>` : '' });
            return;
          }
          formulario(venta, await devueltasDe(venta));
        }catch(err){ console.error(err); $d.innerHTML = estado({ icono: 'alerta', titulo: 'No se pudo buscar el ticket', texto: err.message, error: true }); }
      };

      const formulario = (venta, devueltas) => {
        const lineas = disponibles(venta, devueltas);
        const cuantas = new Map(lineas.map((l) => [l.producto_id, 0]));
        let metodo = METODOS.includes(venta.forma_pago) ? venta.forma_pago : 'efectivo', motivo = '';
        if(!lineas.some((l) => l.queda > 0)){
          $d.innerHTML = estado({ icono: 'listo', titulo: `El #${venta.folio} ya se devolvió completo`, texto: 'No queda nada de ese ticket por regresar.' });
          return;
        }
        $d.innerHTML = `<section class="tarjeta bloque-form devolucion">
          <h2>Ticket #${venta.folio}</h2>
          <p class="nota">${esc(fecha(venta.creado))} · ${pesos(venta.total)}${venta.cliente?.nombre ? ` · ${esc(venta.cliente.nombre)}` : ''}${Number(venta.descuento) > 0 ? ` · tuvo ${pesos(venta.descuento)} de descuento, y el reembolso lo lleva` : ''}</p>
          <h3>¿Qué regresa?</h3>
          <ul class="lineas-devolver">${lineas.map((l) => `<li>
            <div class="texto"><strong>${esc(l.nombre)}</strong>
              <small>${pesos(l.precio)} c/u · se vendieron ${l.cantidad}${l.devuelto ? ` · ya regresaron ${l.devuelto}` : ''}</small></div>
            ${l.queda ? `<div class="cantidad" role="group" aria-label="Cuántas de ${esc(l.nombre)}">
              <button type="button" data-baja="${esc(l.producto_id)}" aria-label="Una menos" disabled>${icono('menos')}</button>
              <output data-n="${esc(l.producto_id)}">0</output>
              <button type="button" data-sube="${esc(l.producto_id)}" aria-label="Una más">${icono('mas')}</button></div>`
              : '<span class="chip">Ya regresó todo</span>'}
          </li>`).join('')}</ul>
          <h3>¿Por qué?</h3>
          <div class="chips-elegir" data-motivos>${MOTIVOS.map((m) => `<button type="button" class="chip-boton" data-motivo="${esc(m)}" aria-pressed="false">${esc(m)}</button>`).join('')}
            <button type="button" class="chip-boton" data-motivo="" aria-pressed="false">Otro</button></div>
          <label class="campo" for="motivo-otro" hidden><span class="etiqueta-campo">Cuéntalo en pocas palabras</span>
            <input id="motivo-otro" maxlength="120" autocomplete="off"></label>
          <h3>¿Cómo se le devuelve?</h3>
          <div class="segmentos" role="group" aria-label="Cómo se le devuelve el dinero">${METODOS.map((m) =>
            `<button type="button" data-metodo="${m}" aria-pressed="${m === metodo}">${icono(m)}${NOMBRE_METODO[m]}</button>`).join('')}</div>
          <p class="nota" data-nota-metodo></p>
          <p class="cobro-total"><span>Devuelves</span><strong data-total>$0.00</strong></p>
          <p class="mensaje-error" data-error hidden></p>
          <button class="boton principal grande ancho" data-registrar disabled>${icono('deshacer')}Registrar devolución</button>
          ${quien?.rol === 'admin' ? '' : `<p class="nota">${icono('info')} Si sale «las registra un admin», falta encender esta parte en el servidor: mientras, la hace el dueño desde su cuenta.</p>`}
        </section>`;
        const $s = $d.querySelector('.devolucion');
        const elegidas = () => lineas.filter((l) => cuantas.get(l.producto_id) > 0).map((l) => ({ ...l, cantidad: cuantas.get(l.producto_id) }));
        const total = () => elegidas().reduce((t, l) => t + importe(venta, l.precio, l.cantidad), 0);
        const repintar = () => {
          for(const l of lineas){
            const n = cuantas.get(l.producto_id), out = $s.querySelector(`[data-n="${CSS.escape(l.producto_id)}"]`);
            if(!out) continue;
            out.textContent = n;
            $s.querySelector(`[data-baja="${CSS.escape(l.producto_id)}"]`).disabled = n <= 0;
            $s.querySelector(`[data-sube="${CSS.escape(l.producto_id)}"]`).disabled = n >= l.queda;
          }
          $s.querySelector('[data-total]').textContent = pesosC(total());
          $s.querySelector('[data-nota-metodo]').textContent = metodo === 'efectivo' ? 'Sale del cajón y se descuenta en el corte de caja.'
            : metodo === 'tarjeta' ? 'Se regresa desde la terminal de tarjeta; aquí queda anotado.' : 'Se le transfiere; aquí queda anotado.';
          $s.querySelector('[data-registrar]').disabled = !elegidas().length;
        };
        $s.addEventListener('click', async (e) => {
          const b = e.target.closest('button'); if(!b) return;
          if(b.dataset.sube){ const l = lineas.find((x) => x.producto_id === b.dataset.sube); cuantas.set(l.producto_id, Math.min(l.queda, cuantas.get(l.producto_id) + 1)); }
          if(b.dataset.baja){ cuantas.set(b.dataset.baja, Math.max(0, cuantas.get(b.dataset.baja) - 1)); }
          if('motivo' in b.dataset){
            motivo = b.dataset.motivo;
            $s.querySelector('[data-error]').hidden = true;   // ya eligió: el aviso de «falta» sobra
            $s.querySelectorAll('[data-motivo]').forEach((x) => x.setAttribute('aria-pressed', x === b));
            const otro = $s.querySelector('[for="motivo-otro"]'); otro.hidden = b.dataset.motivo !== '';
            if(!otro.hidden) $s.querySelector('#motivo-otro').focus();
          }
          if(b.dataset.metodo){ metodo = b.dataset.metodo; $s.querySelectorAll('[data-metodo]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }
          if(b.matches('[data-registrar]')) return registrar(b);
          repintar();
        });

        const registrar = async (b) => {
          const $err = $s.querySelector('[data-error]');
          const pressed = $s.querySelector('[data-motivo][aria-pressed="true"]');
          const texto = pressed ? (pressed.dataset.motivo || $s.querySelector('#motivo-otro').value.trim()) : '';
          if(!texto){ $err.hidden = false; $err.innerHTML = `${icono('alerta')}Falta decir por qué regresa.`; $s.querySelector('[data-motivos] button').focus(); return; }
          $err.hidden = true;
          const renglones = elegidas();
          b.setAttribute('aria-busy', 'true'); b.disabled = true;
          try{
            const r = await devolver({ venta, renglones, metodo, motivo: texto });
            const monto = Number(r.monto);
            aviso(`Devolución registrada · ${pesos(monto)}`);
            $d.innerHTML = estado({ icono: 'listo', titulo: `Devolución del #${venta.folio} registrada`,
              texto: `${plural(renglones.reduce((t, l) => t + l.cantidad, 0), 'pieza regresó', 'piezas regresaron')} al inventario. Se le devuelven ${pesos(monto)} en ${NOMBRE_METODO[metodo].toLowerCase()}.`,
              botones: `${metodo === 'efectivo' ? `<button class="boton principal" data-cajon>${icono('efectivo')}Abrir cajón</button>` : ''}
                <button class="boton secundario" data-comprobante>${icono('imprimir')}Imprimir comprobante</button>
                <a class="boton secundario" href="${enlace('/v/caja')}">Ver la caja</a>` });
            $d.querySelector('[data-cajon]')?.addEventListener('click', async () => { try{ await abrirCajon(); }catch(err){ aviso(err.message, 'mal'); } });
            $d.querySelector('[data-comprobante]').addEventListener('click', async () => {
              try{
                await imprimir({ folio: venta.folio, cuando: new Date(), titulo: 'DEVOLUCIÓN', motivo: texto, etiquetaTotal: 'SE DEVUELVE', metodo,
                  renglones: renglones.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, precio: l.precio, importe: importe(venta, l.precio, l.cantidad) / 100 })),
                  total: monto, pie: 'Guarda este comprobante.' }, await negocio());
              }catch(err){ console.error(err); aviso(`No se imprimió: ${err.message}`, 'mal'); }
            });
            $folio.value = '';
          }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
        };
        repintar();
        $d.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      $c.querySelector('#buscar-ticket').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = Number.parseInt($folio.value.replace(/\D/g, ''), 10);
        if(!f){ $folio.focus(); aviso('Escribe el número del ticket', 'mal'); return; }
        abrir(f);
      });
      $c.querySelector('#recientes')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-folio]'); if(!b) return;
        $folio.value = b.dataset.folio; abrir(Number(b.dataset.folio));
      });
    },
  };
}

export const PANTALLAS = { devolucion };
