/* ══════════════════════════════════════════════════════════════════════════
   OFERTAS · Bloque 11, el lado del dueño
   ──────────────────────────────────────────────────────────────────────────
   «15 % en máquinas hasta el domingo.» La oferta cambia el PRECIO de cada
   producto (y guarda el de antes), así que la tienda, el mostrador y el bot
   cobran lo mismo que se anuncia — no hay un descuento que se le olvide a
   una de las tres cajas. Antes de aplicar se enseña exactamente qué cambia.
   Al terminar (a mano, o sola al vencer) cada precio regresa; el que alguien
   cambió a mano mientras tanto se deja y se avisa.
   Las cuentas viven en nucleo/ofertas.js (18 pruebas).
   ═════════════════════════════════════════════════════════════════════════ */
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, fecha, numero } from '../nucleo/piezas.js';
import { catalogoAdmin, descuentos, aplicarOferta, terminarOferta, terminarVencidas } from '../nucleo/datos.js';
import { planAplicar, describir } from '../nucleo/ofertas.js';

const DIA = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const enDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

async function descuentosPantalla(){
  const vencidas = await terminarVencidas().catch((e) => { console.error(e); return []; });
  const [lista, { categorias, productos }] = await Promise.all([descuentos(), catalogoAdmin()]);
  const activas = lista.filter((d) => d.activo), pasadas = lista.filter((d) => !d.activo);
  const marcas = [...new Set(productos.filter((p) => p.activo && p.marca).map((p) => p.marca.trim()))].sort((a, b) => a.localeCompare(b, 'es'));
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
  const aQuien = (a = {}) => a.todo ? 'toda la tienda' : a.categorias?.length ? a.categorias.map((id) => nombreCat.get(id) || 'categoría').join(', ') : a.marcas?.length ? a.marcas.join(', ') : '—';

  const fila = (d) => { const n = Object.keys(d.alcance?.aplicado || {}).length; return `<li><div class="fila">
    <span class="texto"><strong>${esc(d.nombre)}</strong>
      <small>${esc(describir(d))} en ${esc(aQuien(d.alcance))} · ${plural(n, 'producto', 'productos')} · ${d.activo ? `hasta el ${esc(DIA.format(new Date(d.fin)))}` : `terminó el ${esc(fecha(d.fin))}`}</small></span>
    ${d.activo ? `<button class="boton secundario" data-terminar="${d.id}">Terminar</button>` : '<span class="chip">Terminada</span>'}</div></li>`; };

  return {
    html: `
      ${vencidas.length ? `<p class="aviso-linea">${icono('info')}<span>${vencidas.map((v) => `«${esc(v.d.nombre)}» se venció y regresaron ${plural(v.regresados, 'precio', 'precios')}`).join('. ')}.</span></p>` : ''}
      <section class="tarjeta bloque-form nueva-oferta">
        <h2>Nueva oferta</h2>
        <form id="oferta" novalidate>
          <label class="campo" for="o-nombre"><span class="etiqueta-campo">Nombre</span>
            <input id="o-nombre" maxlength="60" placeholder="Buen Fin de máquinas" autocomplete="off"></label>
          <div class="campo"><span class="etiqueta-campo">Cuánto</span>
            <div class="oferta-cuanto">
              <div class="segmentos" role="group" aria-label="Tipo de descuento">
                <button type="button" data-tipo="porcentaje" aria-pressed="true">%</button><button type="button" data-tipo="monto" aria-pressed="false">$</button></div>
              <input id="o-valor" inputmode="decimal" placeholder="15" aria-label="Cuánto menos">
            </div></div>
          <label class="campo" for="o-alcance"><span class="etiqueta-campo">¿A qué?</span>
            <select id="o-alcance">
              <option value="todo">Toda la tienda</option>
              <optgroup label="Una categoría">${categorias.map((c) => `<option value="c:${c.id}">${esc(c.nombre)}</option>`).join('')}</optgroup>
              <optgroup label="Una marca">${marcas.map((m) => `<option value="m:${esc(m)}">${esc(m)}</option>`).join('')}</optgroup>
            </select></label>
          <label class="campo" for="o-fin"><span class="etiqueta-campo">Hasta</span>
            <input id="o-fin" type="date" value="${enDias(7)}" min="${enDias(0)}"><span class="ayuda">Al terminar ese día, los precios regresan solos.</span></label>
          <div id="vista-oferta" aria-live="polite"></div>
          <button type="submit" class="boton principal ancho" id="aplicar" disabled>${icono('descuentos')}Aplicar</button>
        </form>
      </section>
      <section class="seccion"><header><h2>Activas</h2></header>
        ${activas.length ? `<ul class="lista">${activas.map(fila).join('')}</ul>` : `<p class="vacio-linea">${icono('descuentos')}<span>No hay ofertas activas.</span></p>`}</section>
      ${pasadas.length ? `<section class="seccion"><header><h2>Terminadas</h2></header><ul class="lista">${pasadas.slice(0, 15).map(fila).join('')}</ul></section>` : ''}`,

    alMontar($c, { aviso, recargar }){
      const f = $c.querySelector('#oferta'), $vista = $c.querySelector('#vista-oferta'), $aplicar = $c.querySelector('#aplicar');
      let tipo = 'porcentaje', plan = null;
      const oferta = () => {
        const a = f.querySelector('#o-alcance').value;
        const alcance = a === 'todo' ? { todo: true } : a.startsWith('c:') ? { categorias: [a.slice(2)] } : { marcas: [a.slice(2)] };
        const fin = f.querySelector('#o-fin').value;
        return { nombre: f.querySelector('#o-nombre').value.trim(), tipo, valor: numero(f.querySelector('#o-valor').value), alcance,
          fin: fin ? new Date(fin + 'T23:59:59').toISOString() : null };
      };
      // Vista previa en vivo: qué productos cambian y a cuánto, antes de tocar nada.
      const previa = () => {
        const o = oferta();
        const valido = o.valor > 0 && (tipo !== 'porcentaje' || o.valor < 100);
        plan = valido ? planAplicar(productos, o) : null;
        $aplicar.disabled = !plan?.cambios.length;
        $aplicar.innerHTML = `${icono('descuentos')}${plan?.cambios.length ? `Aplicar a ${plural(plan.cambios.length, 'producto', 'productos')}` : 'Aplicar'}`;
        if(!valido){ $vista.innerHTML = o.valor != null && !Number.isNaN(o.valor) ? '<p class="nota">Ese valor no es un descuento.</p>' : ''; return; }
        $vista.innerHTML = plan.cambios.length ? `<p class="nota">Así quedan (${plural(plan.cambios.length, 'producto', 'productos')}${plan.saltados.length ? `; ${plan.saltados.length} no cambian: ya estaban en oferta o no les alcanza` : ''}):</p>
          <ul class="resumen-lista vista-precios">${plan.cambios.slice(0, 8).map((c) => `<li><span>${esc(c.nombre)}</span><b><s>${pesos(c.antes)}</s> ${pesos(c.ahora)}</b></li>`).join('')}
          ${plan.cambios.length > 8 ? `<li><span class="nota">y ${plan.cambios.length - 8} más</span></li>` : ''}</ul>`
          : `<p class="nota">Ningún producto cambia${plan.saltados.length ? `: ${plan.saltados.length} ya estaban en oferta o el descuento no les alcanza` : ''}.</p>`;
      };
      f.addEventListener('input', previa);
      f.addEventListener('change', previa);
      f.querySelector('.segmentos').addEventListener('click', (e) => {
        const b = e.target.closest('[data-tipo]'); if(!b) return;
        tipo = b.dataset.tipo; f.querySelectorAll('[data-tipo]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        f.querySelector('#o-valor').placeholder = tipo === 'porcentaje' ? '15' : '50';
        previa();
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const o = oferta();
        if(!o.nombre){ aviso('Ponle nombre a la oferta', 'mal'); f.querySelector('#o-nombre').focus(); return; }
        if(!o.fin){ aviso('Falta hasta cuándo', 'mal'); return; }
        if(!plan?.cambios.length) return;
        if(!confirm(`Van a cambiar ${plural(plan.cambios.length, 'precio', 'precios')} en la tienda, el mostrador y el bot. ¿Aplicar?`)) return;
        $aplicar.setAttribute('aria-busy', 'true'); $aplicar.disabled = true;
        try{
          const r = await aplicarOferta(o, (i, n) => { $aplicar.textContent = `Cambiando precios… ${i} de ${n}`; });
          aviso(`Oferta aplicada a ${plural(r.cambiados, 'producto', 'productos')}`); recargar();
        }catch(err){ console.error(err); aviso(err.message, 'mal'); $aplicar.removeAttribute('aria-busy'); previa(); }
      });
      $c.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-terminar]'); if(!b) return;
        const d = lista.find((x) => x.id === b.dataset.terminar);
        if(!confirm(`¿Terminar «${d.nombre}» ahora? Los precios regresan a como estaban.`)) return;
        b.setAttribute('aria-busy', 'true'); b.disabled = true;
        try{
          const r = await terminarOferta(d);
          aviso(`Regresaron ${plural(r.regresados, 'precio', 'precios')}${r.saltados.length ? `; ${r.saltados.length} se dejaron porque les cambiaron el precio a mano` : ''}`);
          recargar();
        }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
      });
    },
  };
}

export const PANTALLAS = { descuentos: descuentosPantalla };
