/* ══════════════════════════════════════════════════════════════════════════
   QUÉ SURTIR · el pedido al proveedor, listo para mandar
   ──────────────────────────────────────────────────────────────────────────
   La pregunta que contesta: «¿qué le pido al proveedor y cuánto?». Cada
   renglón dice por qué, con sus números; el dueño corrige la cantidad si sabe
   algo que la app no (una temporada, un cliente grande) y manda el pedido de
   cada marca por WhatsApp, o baja el Excel para mandarlo como quiera.
   Nada se pide solo: esto no toca inventario hasta que llegue la mercancía
   (entonces se da entrada en Inventario, con su motivo).
   Cuentas en nucleo/surtir.js (pruebas-surtir.mjs).
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, plural, estado, descargarCSV } from '../nucleo/piezas.js';
import { negocio, catalogoAdmin, ventasReporte } from '../nucleo/datos.js';
import { planSurtir, porMarca, textoPedido, filasCSV, COBERTURAS, VENTANA } from '../nucleo/surtir.js';
import { negocioPedido } from '../config.js';

const DIA = 86400000;
const MOTIVO = { agotado: ['mal', 'Agotado y se vende'], acaba: ['ojo', 'Se va a acabar'], minimo: ['', 'Bajo el mínimo'] };
const NOMBRE_COB = { 14: '2 semanas', 30: '1 mes', 60: '2 meses' };
const LLAVE = 'tienda-surtir-' + negocioPedido();

/* Lo que el dueño corrigió sobrevive a salir y volver (en esta sesión). */
function leer(){ try{ const g = JSON.parse(sessionStorage.getItem(LLAVE) || '{}'); return { cobertura: g.cobertura || 30, cantidades: new Map(g.cantidades || []) }; }catch(e){ return { cobertura: 30, cantidades: new Map() }; } }
function guardar(s){ try{ sessionStorage.setItem(LLAVE, JSON.stringify({ cobertura: s.cobertura, cantidades: [...s.cantidades] })); }catch(e){} }

async function surtir(){
  const [n, { productos }, ventas] = await Promise.all([negocio(), catalogoAdmin(), ventasReporte(Date.now() - (VENTANA + 2) * DIA)]);
  const s = leer();
  const firma = n.marca?.nombre_corto || n.nombre;

  const cuerpo = () => {
    const plan = planSurtir({ ventas, productos, cobertura: s.cobertura });
    if(!plan.renglones.length) return estado({ icono: 'listo', titulo: 'No hace falta pedir nada',
      texto: `Nada está bajo su mínimo, y con lo que vendes te alcanza para ${NOMBRE_COB[s.cobertura]}. ${plan.base}`,
      botones: `<a class="boton secundario" href="${enlace('/a/inventario')}">${icono('inventario')}Ver inventario</a>` });
    const grupos = porMarca(plan.renglones, s.cantidades);
    const piezas = grupos.reduce((t, g) => t + g.piezas, 0), urgentes = plan.renglones.filter((r) => r.motivo === 'agotado').length;
    return `
      <div class="cifras">
        <div class="cifra-caja"><span class="valor">${plan.renglones.length}</span><span class="etq">productos por pedir</span></div>
        <div class="cifra-caja"><span class="valor">${piezas}</span><span class="etq">piezas en total</span></div>
        <div class="cifra-caja"><span class="valor">${grupos.length}</span><span class="etq">${grupos.length === 1 ? 'marca' : 'marcas'}</span></div>
        <div class="cifra-caja${urgentes ? ' alerta' : ''}"><span class="valor">${urgentes}</span><span class="etq">agotados que se venden</span></div>
      </div>
      <p class="nota">${esc(plan.base)} Corrige cualquier cantidad: 0 la quita del pedido.</p>
      ${grupos.map((g, i) => `<section class="seccion surtir-marca"><header><h2>${esc(g.marca)}</h2>
          <span class="nota">${plural(g.piezas, 'pieza', 'piezas')}</span></header>
        <ul class="lista surtir-lista">${g.renglones.map((r) => {
          const [clase, etq] = MOTIVO[r.motivo];
          return `<li class="fila surtir-fila${r.pedir ? '' : ' fuera'}"><span class="texto"><strong>${esc(r.nombre)}</strong>
              <span class="chip ${clase}">${etq}</span><small>${esc(r.porque)}</small></span>
            <label class="pedir"><span>Pedir</span><input type="number" inputmode="numeric" min="0" step="1" value="${r.pedir}" data-cant="${esc(r.id)}" aria-label="Piezas a pedir de ${esc(r.nombre)}"></label></li>`;
        }).join('')}</ul>
        <div class="botones"><button class="boton principal" data-mandar="${i}"${g.piezas ? '' : ' disabled'}>${icono('conversaciones')}Mandar pedido de ${esc(g.marca)}</button></div>
      </section>`).join('')}`;
  };

  return {
    html: `
      <div class="barra-surtir">
        <span class="etq-cobertura">Pedir para</span><div class="segmentos coberturas" role="group" aria-label="Pedir para cuánto tiempo">${COBERTURAS.map((d) =>
          `<button type="button" data-cobertura="${d}" aria-pressed="${d === s.cobertura}">${NOMBRE_COB[d]}</button>`).join('')}</div>
        <button class="boton secundario" data-csv>${icono('importar')}Descargar Excel</button>
      </div>
      <div id="plan">${cuerpo()}</div>`,

    alMontar($c, { aviso }){
      const $plan = $c.querySelector('#plan');
      const repintar = () => { $plan.innerHTML = cuerpo(); };
      const grupos = () => porMarca(planSurtir({ ventas, productos, cobertura: s.cobertura }).renglones, s.cantidades);
      $c.querySelector('.coberturas').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cobertura]'); if(!b) return;
        // Cambiar la cobertura cambia la cuenta: lo corregido a mano se respeta, pero se avisa.
        s.cobertura = Number(b.dataset.cobertura); guardar(s);
        $c.querySelectorAll('[data-cobertura]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        repintar();
        if(s.cantidades.size) aviso(`Se recalculó para ${NOMBRE_COB[s.cobertura]}; lo que corregiste a mano se quedó igual`);
      });
      $plan.addEventListener('change', (e) => {
        const i = e.target.closest('[data-cant]'); if(!i) return;
        const v = Math.max(0, Math.floor(Number(i.value) || 0));
        s.cantidades.set(i.dataset.cant, v); guardar(s);
        const y = scrollY; repintar(); scrollTo(0, y);
      });
      $plan.addEventListener('click', (e) => {
        const b = e.target.closest('[data-mandar]'); if(!b) return;
        const g = grupos()[Number(b.dataset.mandar)]; if(!g) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(textoPedido(g, { negocio: firma }))}`, '_blank', 'noopener');
      });
      $c.querySelector('[data-csv]').addEventListener('click', () => {
        const filas = filasCSV(grupos());
        if(filas.length < 2){ aviso('No hay nada que pedir', 'mal'); return; }
        descargarCSV(`pedido-${new Date().toISOString().slice(0, 10)}.csv`, filas);
      });
    },
  };
}

export const PANTALLAS = { surtir };
