/* ══════════════════════════════════════════════════════════════════════════
   REPORTES Y CONSEJOS · Bloque 12, el lado del dueño
   ──────────────────────────────────────────────────────────────────────────
   Arriba lo que conviene HACER (consejos con de dónde salen), abajo los
   números que lo sostienen. Todo sale de las ventas que ya están en la base;
   no se captura nada a mano. Cada cifra se compara con el periodo anterior
   del mismo largo y hasta la misma hora — «hoy a las 11» contra «ayer a las
   11», nunca contra «todo ayer».
   Cuentas en nucleo/reportes.js y nucleo/consejos.js (24 pruebas).
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, plural, descargarCSV } from '../nucleo/piezas.js';
import { ventasReporte, catalogoAdmin, clientesNegocio } from '../nucleo/datos.js';
import { periodo, anterior, entre, resumen, cambio, porClave, porHora, porDia, porProducto, horaFuerte, filasCSV, DIA } from '../nucleo/reportes.js';
import { consejos } from '../nucleo/consejos.js';
import { conRecompra } from './clientes.js';

const PERIODOS = [['hoy', 'Hoy'], ['7', '7 días'], ['30', '30 días'], ['mes', 'Este mes'], ['pasado', 'Mes pasado']];
const CANAL = { pos: 'Mostrador', tienda: 'En línea', bot: 'WhatsApp', repartidor: 'Repartidor', manual: 'A mano' };
const PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mixto: 'Mixto', pasarela: 'En línea', otro: 'Sin cobrar todavía' };
const TONO = { alerta: ['mal', 'Ojo'], idea: ['acento', 'Idea'], bien: ['bien', 'Bien'] };
const pesos = (c) => '$' + Math.round(c / 100).toLocaleString('es-MX');
const DIA_CORTO = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric' });
const hora = (h) => h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
const horaLarga = (h) => h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`;

export function tarjetaConsejo(c){
  const [clase, etq] = TONO[c.tono];
  return `<li class="consejo ${c.tono}"><span class="chip ${clase}">${etq}</span>
    <strong>${esc(c.titulo)}</strong><p>${esc(c.porque)}</p>
    ${c.accion ? `<a class="ver-todo" href="${enlace(c.accion.ruta)}">${esc(c.accion.texto)}</a>` : ''}</li>`;
}

/* Barras hechas con CSS: cada una dice su valor en texto (nunca sólo el alto). */
function barras(datos, etiqueta){
  const max = Math.max(1, ...datos.map((d) => d.total));
  return `<div class="barras" role="img" aria-label="${esc(datos.map((d) => `${etiqueta(d)}: ${pesos(d.total)}`).join(', '))}">
    ${datos.map((d) => `<div class="barra" title="${esc(etiqueta(d))}: ${pesos(d.total)}"><span style="height:${Math.round(d.total / max * 100)}%"></span><small>${esc(etiqueta(d))}</small></div>`).join('')}</div>`;
}

function partes(lista, nombres, total){
  if(!lista.length) return '<p class="nota">Sin ventas en el periodo.</p>';
  return `<ul class="partes">${lista.map((x) => `<li><span class="nombre">${esc(nombres[x.clave] || x.clave)}</span>
    <span class="barrita"><span style="width:${total ? Math.round(x.total / total * 100) : 0}%"></span></span>
    <b>${pesos(x.total)}</b><small>${total ? Math.round(x.total / total * 100) : 0} %</small></li>`).join('')}</ul>`;
}

async function reportes(){
  const ahora = Date.now();
  const desdeTodo = Math.min(anterior(periodo('pasado', ahora)).desde, ahora - 60 * DIA);
  const [ventas, { productos }, clientes] = await Promise.all([ventasReporte(desdeTodo), catalogoAdmin(), clientesNegocio().catch(() => [])]);
  const cs = consejos({ ventas, productos, clientes: conRecompra(clientes), ahora });
  let clave = '7';
  try{ clave = sessionStorage.getItem('tienda-reportes-periodo') || '7'; }catch(e){}

  const cuerpo = () => {
    const per = periodo(clave, ahora), ant = anterior(per);
    const v = entre(ventas, per.desde, per.hasta), va = entre(ventas, ant.desde, ant.hasta);
    const r = resumen(v), ra = resumen(va);
    const flecha = (a, b) => { const c = cambio(a, b); return c == null ? '<small class="cambio">sin comparación</small>'
      : `<small class="cambio ${c > 0 ? 'sube' : c < 0 ? 'baja' : ''}">${c > 0 ? '▲' : c < 0 ? '▼' : '='} ${Math.abs(c)} % vs. antes</small>`; };
    const horas = porHora(v), hf = horaFuerte(horas);
    const dias = porDia(v, per.desde, Math.min(per.hasta, ahora + 1));
    const top = porProducto(v).slice(0, 10);
    return `
      <div class="cifras">
        <div class="cifra-caja"><span class="valor">${pesos(r.total)}</span><span class="etq">vendido</span>${flecha(r.total, ra.total)}</div>
        <div class="cifra-caja"><span class="valor">${r.tickets}</span><span class="etq">tickets</span>${flecha(r.tickets, ra.tickets)}</div>
        <div class="cifra-caja"><span class="valor">${pesos(r.promedio)}</span><span class="etq">ticket promedio</span>${flecha(r.promedio, ra.promedio)}</div>
        <div class="cifra-caja"><span class="valor">${r.piezas}</span><span class="etq">piezas</span>${flecha(r.piezas, ra.piezas)}</div>
      </div>
      <div class="reporte-cols">
        <section class="seccion"><header><h2>${clave === 'hoy' ? 'Por hora' : 'Por día'}</h2></header>
          ${r.tickets ? (clave === 'hoy' ? barras(horas.slice(7, 23), (h) => hora(h.hora)) : barras(dias, (d) => DIA_CORTO.format(new Date(d.dia))))
            : '<p class="nota">Sin ventas en el periodo.</p>'}
          ${hf && clave !== 'hoy' ? `<p class="nota">Hora más fuerte: de ${horaLarga(hf.desde)} a ${horaLarga(hf.hasta)}.</p>` : ''}
        </section>
        <section class="seccion"><header><h2>Por dónde entra</h2></header>${partes(porClave(v, (x) => x.canal), CANAL, r.total)}
          <h3>Cómo pagan</h3>${partes(porClave(v, (x) => x.forma_pago), PAGO, r.total)}</section>
      </div>
      <section class="seccion"><header><h2>Lo más vendido</h2><button class="boton secundario" data-csv>${icono('importar')}Descargar</button></header>
        ${top.length ? `<ol class="lista top-productos">${top.map((p) => `<li class="fila"><span class="texto"><strong>${esc(p.nombre)}</strong>
          <small>${plural(p.piezas, 'pieza', 'piezas')} · en ${plural(p.tickets, 'ticket', 'tickets')}</small></span><span class="precio-fila">${pesos(p.total)}</span></li>`).join('')}</ol>`
          : '<p class="nota">Sin ventas en el periodo.</p>'}
      </section>`;
  };

  return {
    html: `
      <section class="seccion consejos-bloque"><header><h2>Consejos</h2></header>
        ${cs.length ? `<ul class="consejos">${cs.slice(0, 3).map(tarjetaConsejo).join('')}</ul>
          ${cs.length > 3 ? `<details class="plegable"><summary>Ver ${plural(cs.length - 3, 'consejo más', 'consejos más')}</summary><ul class="consejos">${cs.slice(3, 10).map(tarjetaConsejo).join('')}</ul></details>` : ''}`
          : `<p class="vacio-linea">${icono('info')}<span>Todavía no hay suficientes ventas para aconsejar algo con fundamento. Con un par de semanas de movimiento empiezan a salir.</span></p>`}
      </section>
      <div class="segmentos periodos" role="group" aria-label="Periodo">${PERIODOS.map(([k, t]) => `<button type="button" data-periodo="${k}" aria-pressed="${k === clave}">${t}</button>`).join('')}</div>
      <div id="reporte">${cuerpo()}</div>`,
    alMontar($c){
      $c.querySelector('.periodos').addEventListener('click', (e) => {
        const b = e.target.closest('[data-periodo]'); if(!b) return;
        clave = b.dataset.periodo;
        try{ sessionStorage.setItem('tienda-reportes-periodo', clave); }catch(err){}
        $c.querySelectorAll('[data-periodo]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        $c.querySelector('#reporte').innerHTML = cuerpo();
      });
      $c.addEventListener('click', (e) => {
        if(!e.target.closest('[data-csv]')) return;
        const per = periodo(clave, ahora);
        descargarCSV(`ventas-${clave}.csv`, filasCSV(entre(ventas, per.desde, per.hasta)));
      });
    },
  };
}

export const PANTALLAS = { reportes };
