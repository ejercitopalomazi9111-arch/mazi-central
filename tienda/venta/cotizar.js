/* ══════════════════════════════════════════════════════════════════════════
   COTIZAR · la respuesta a «¿en cuánto me sale esto?»
   ──────────────────────────────────────────────────────────────────────────
   Se arma con el catálogo de hoy, se manda por WhatsApp o se imprime, y el
   día que el cliente dice «va», se pasa a Cobrar con un toque. Si desde que
   se cotizó cambió un precio o se acabó algo, se dice ANTES de cobrar.
   Las cotizaciones viven en el teléfono (no son ventas: no tocan inventario
   ni base); el borrador sobrevive a que se apague la pantalla.
   Cuentas en nucleo/cotizacion.js (pruebas-cotizacion.mjs).
   ═════════════════════════════════════════════════════════════════════════ */
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, quitaAcentos, plural, hoja, estado } from '../nucleo/piezas.js';
import { negocio, catalogo, clientesMostrador } from '../nucleo/datos.js';
import { negocioPedido } from '../config.js';
import { aPesos } from '../nucleo/dinero.js';
import { imprimir } from '../nucleo/impresion/impresora.js';
import { total, piezas, importe, vigente, hasta, cambios, aTicket, juntar, textoWhatsApp, crearArchivo, VIGENCIA } from '../nucleo/cotizacion.js';
import { telefono } from '../nucleo/buscar-cliente.js';
import { montarANombre } from './a-nombre.js';
import { ticket, dejarCliente } from './pantallas.js';

const archivo = crearArchivo(globalThis.localStorage ?? { getItem: () => null, setItem(){} }, 'tienda-cotizaciones-' + negocioPedido());
const LLAVE_BORRADOR = 'tienda-cotizacion-borrador-' + negocioPedido();
const borrador = {
  leer(){ try{ return JSON.parse(localStorage.getItem(LLAVE_BORRADOR) || 'null'); }catch(e){ return null; } },
  guardar(b){ try{ b ? localStorage.setItem(LLAVE_BORRADOR, JSON.stringify(b)) : localStorage.removeItem(LLAVE_BORRADOR); }catch(e){} },
};
const nuevo = () => ({ id: null, renglones: [], cliente: null, dias: VIGENCIA, notas: '' });
const pesosC = (c) => pesos(aPesos(c));
const DIAS = [3, 7, 15, 30];
const CUANDO = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

async function cotizar(){
  const [n, cat] = await Promise.all([negocio(), catalogo()]);
  const { productos, porId } = cat;
  const listaClientes = clientesMostrador(); listaClientes.catch(() => {});
  let cot = borrador.leer();          // null = se ve la lista
  let q = '';

  const guardarBorrador = () => borrador.guardar(cot);

  /* ── La lista de cotizaciones ─────────────────────────────────────────── */
  const listaHTML = () => {
    const todas = archivo.todas();
    return `<div class="botones"><button class="boton principal grande" data-nueva>${icono('agregar')}Nueva cotización</button></div>
      ${todas.length ? `<section class="seccion"><header><h2>Guardadas en este teléfono</h2></header><ul class="lista cotizaciones">${todas.map((c) => {
        const t = total(c.renglones), viva = vigente(c);
        return `<li><button class="fila-opcion" data-abrir="${esc(c.id)}">${icono('calculadora')}
          <span class="texto"><strong>${esc(c.folio)} · ${esc(c.cliente?.nombre || 'Sin nombre')}</strong>
            <small>${plural(piezas(c.renglones), 'pieza', 'piezas')} · ${esc(CUANDO.format(new Date(c.cuando)))}</small></span>
          <span class="cot-lado"><b>${pesosC(t)}</b>${c.cobrada ? '<span class="chip bien">Pasó a cobro</span>' : viva ? '<span class="chip">Vigente</span>' : '<span class="chip ojo">Vencida</span>'}</span></button></li>`;
      }).join('')}</ul></section>`
      : estado({ icono: 'calculadora', titulo: 'Todavía no hay cotizaciones', texto: 'Cuando un cliente pregunte «¿en cuánto me sale?», ármala aquí con los precios de hoy y mándasela por WhatsApp. El día que diga «va», se cobra con un toque.' })}`;
  };

  /* ── El editor ────────────────────────────────────────────────────────── */
  const hallados = () => {
    const t = quitaAcentos(q.trim()); if(!t) return [];
    return productos.filter((p) => quitaAcentos(`${p.n} ${p.m || ''} ${p.sku || ''} ${p.cb || ''}`).includes(t)).slice(0, 12);
  };
  const resultadosHTML = () => {
    if(!q.trim()) return `<p class="nota">Escribe el nombre, la marca o el código, o escanéalo con el lector: si sale uno solo, Enter lo agrega.</p>`;
    const h = hallados();
    return h.length ? `<ul class="lista-opciones">${h.map((p) => `<li><button type="button" class="fila-opcion" data-agregar="${esc(p.id)}">${icono('agregar')}
        <span class="texto"><strong>${esc(p.n)}</strong><small>${esc(p.m || '')}${p.q <= 0 ? ' · agotado hoy' : ` · ${p.q} disp.`}</small></span><b>${pesos(p.p)}</b></button></li>`).join('')}</ul>`
      : `<p class="nota">Nada con «${esc(q.trim())}».</p>`;
  };
  const renglonHTML = (r) => `<li class="pos-renglon">
      <span class="texto"><strong>${esc(r.nombre)}</strong><small>${pesos(r.precio)} c/u</small></span>
      <span class="cantidad">
        <button type="button" data-menos="${esc(r.id)}" aria-label="Una menos de ${esc(r.nombre)}">${icono(r.cantidad === 1 ? 'borrar' : 'menos')}</button>
        <output>${r.cantidad}</output>
        <button type="button" data-mas="${esc(r.id)}" aria-label="Una más de ${esc(r.nombre)}">${icono('mas')}</button>
      </span>
      <b class="importe">${pesosC(importe(r))}</b></li>`;
  const editorHTML = () => `
    <div class="cot-editor">
      <section class="cot-buscar" aria-label="Agregar productos">
        <label class="buscador">${icono('buscar')}<input id="cot-q" type="search" placeholder="Busca el producto o su código" autocomplete="off" enterkeyhint="search" aria-label="Buscar producto para cotizar" value="${esc(q)}"></label>
        <div data-resultados>${resultadosHTML()}</div>
      </section>
      <section class="cot-hoja tarjeta">
        <header class="pos-ticket-cabeza"><h2>${cot.id ? `Cotización ${esc(archivo.una(cot.id)?.folio || '')}` : 'Cotización nueva'}</h2>
          <button type="button" class="boton fantasma" data-cerrar-cot>${icono('lista')}Todas</button></header>
        <div class="cobro-cliente" data-a-nombre></div>
        ${cot.renglones.length ? `<ul class="pos-renglones">${cot.renglones.map(renglonHTML).join('')}</ul>
          <div class="pos-total"><span>${plural(piezas(cot.renglones), 'pieza', 'piezas')}</span><strong>${pesosC(total(cot.renglones))}</strong></div>`
          : `<p class="vacio-linea">${icono('buscar')}<span>Busca arriba y toca un producto para agregarlo.</span></p>`}
        <div class="cot-datos">
          <label class="campo" for="cot-dias"><span class="etiqueta-campo">Precios válidos por</span>
            <select id="cot-dias">${DIAS.map((d) => `<option value="${d}"${d === (cot.dias ?? VIGENCIA) ? ' selected' : ''}>${d} días</option>`).join('')}</select></label>
          <label class="campo" for="cot-notas"><span class="etiqueta-campo">Nota para el cliente <small>(opcional)</small></span>
            <textarea id="cot-notas" rows="2" placeholder="Por ejemplo: envío sin costo en tu zona">${esc(cot.notas || '')}</textarea></label>
        </div>
        <div class="botones cot-acciones">
          <button type="button" class="boton principal" data-whatsapp${cot.renglones.length ? '' : ' disabled'}>${icono('conversaciones')}Mandar por WhatsApp</button>
          <button type="button" class="boton secundario" data-imprimir${cot.renglones.length ? '' : ' disabled'}>${icono('imprimir')}Imprimir</button>
          <button type="button" class="boton secundario" data-cobrar${cot.renglones.length ? '' : ' disabled'}>${icono('venta')}Pasar a cobrar</button>
          ${cot.id ? `<button type="button" class="boton fantasma peligro" data-borrar>${icono('borrar')}Borrar</button>` : ''}
        </div>
      </section>
    </div>`;

  return {
    titulo: 'Cotizar',
    html: '<div id="cot"></div>',
    alMontar($c, { aviso, ir }){
      const $cot = $c.querySelector('#cot');
      const pintar = () => {
        $cot.innerHTML = cot ? editorHTML() : listaHTML();
        if(!cot) return;
        const estadoCliente = { get cliente(){ return cot.cliente; }, set cliente(v){ cot.cliente = v; guardarBorrador(); } };
        montarANombre($cot.querySelector('[data-a-nombre]'), { lista: () => listaClientes, estado: estadoCliente, aviso,
          pregunta: '¿Para quién es?', pista: 'Opcional · así el WhatsApp va directo a su número' });
      };
      /* Todo lo que sale hacia fuera (mandar, imprimir, cobrar) guarda primero:
         así el folio que ve el cliente es el mismo que queda en la lista. */
      const guardar = () => {
        cot.notas = $cot.querySelector('#cot-notas')?.value.trim() ?? cot.notas;
        const g = archivo.guardar({ ...cot, id: cot.id || undefined });
        cot.id = g.id; guardarBorrador();
        return g;
      };
      const cerrar = () => { cot = null; q = ''; borrador.guardar(null); pintar(); };

      $cot.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if(!b || b.closest('[data-a-nombre]')) return;
        if(b.matches('[data-nueva]')){ cot = nuevo(); guardarBorrador(); pintar(); $cot.querySelector('#cot-q')?.focus(); return; }
        if(b.dataset.abrir){ const c = archivo.una(b.dataset.abrir); if(c){ cot = { ...c }; guardarBorrador(); pintar(); } return; }
        if(!cot) return;
        if(b.matches('[data-cerrar-cot]')){ if(cot.renglones.length && !cot.id) guardar(); cerrar(); return; }
        if(b.dataset.agregar){
          const p = porId.get(b.dataset.agregar); if(!p) return;
          const r = cot.renglones.find((x) => x.id === p.id);
          if(r) r.cantidad++; else cot.renglones.push({ id: p.id, nombre: p.n, precio: p.p, cantidad: 1 });
          q = ''; guardarBorrador(); pintar();
          aviso(`+1 ${p.n}${p.q <= 0 ? ' · hoy está agotado' : ''}`);
          $cot.querySelector('#cot-q')?.focus();
          return;
        }
        if(b.dataset.mas || b.dataset.menos){
          const r = cot.renglones.find((x) => x.id === (b.dataset.mas || b.dataset.menos));
          if(b.dataset.mas) r.cantidad++; else { r.cantidad--; if(r.cantidad <= 0) cot.renglones = cot.renglones.filter((x) => x !== r); }
          guardarBorrador(); pintar(); return;
        }
        if(b.matches('[data-borrar]')){
          if(!confirm('¿Borrar esta cotización? No se puede deshacer.')) return;
          archivo.quitar(cot.id); cerrar(); aviso('Cotización borrada'); return;
        }
        if(b.matches('[data-whatsapp]')){
          const g = guardar(), c = n.ajustes?.contacto || {};
          const texto = textoWhatsApp(g, { negocio: n.marca?.nombre_corto || n.nombre, contacto: c.whatsapp ? `WhatsApp ${c.whatsapp}` : '' });
          const tel = telefono(g.cliente?.telefono);
          window.open(`https://wa.me/${tel ? '52' + tel : ''}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
          pintar(); aviso(`Cotización ${g.folio} guardada`);
          return;
        }
        if(b.matches('[data-imprimir]')){
          const g = guardar();
          b.setAttribute('aria-busy', 'true'); b.disabled = true;
          try{
            await imprimir({ folio: g.folio, cuando: g.cuando, titulo: 'COTIZACIÓN', etiquetaFolio: 'Cotización', cliente: g.cliente?.nombre || null,
              renglones: g.renglones.map((r) => ({ ...r, importe: aPesos(importe(r)) })), total: aPesos(total(g.renglones)),
              pie: `Precios válidos hasta el ${hasta(g)}, o mientras haya existencias.${g.notas ? ' ' + g.notas : ''}` }, n);
          }catch(err){ console.error(err); aviso(`No se imprimió: ${err.message}`, 'mal'); }
          pintar();
          return;
        }
        if(b.matches('[data-cobrar]')){
          const g = guardar();
          const cs = cambios(g, porId);
          const pasar = () => {
            const nuevos = aTicket(g, porId);
            if(!nuevos.length){ aviso('No hay nada de esta cotización con existencias hoy', 'mal'); return; }
            ticket.guardar(juntar(ticket.leer(), nuevos));
            dejarCliente(g.cliente);
            archivo.marcar(g.id, { cobrada: Date.now() });
            borrador.guardar(null);
            ir('/v');
          };
          if(!cs.length) return pasar();
          const QUE = { precio: (x) => `cambió de precio: ${pesosC(x.antes)} → <b>${pesosC(x.ahora)}</b>`,
            faltan: (x) => x.hay ? `sólo hay ${x.hay} de ${x.quiere}: pasan ${x.hay}` : 'está agotado: no pasa', 'no-esta': () => 'ya no está a la venta: no pasa' };
          const d = hoja({ titulo: 'Antes de cobrar', clase: 'hoja-cambios', cuerpo: `
            <p>Desde que se cotizó cambiaron cosas. Se cobra con los precios y existencias <b>de hoy</b>:</p>
            <ul class="cambios-cot">${cs.map((x) => `<li><strong>${esc(x.nombre)}</strong> ${QUE[x.tipo](x)}</li>`).join('')}</ul>
            <div class="botones"><button class="boton secundario" data-cerrar-hoja>Volver</button>
              <button class="boton principal" data-seguir>${icono('venta')}Pasar a cobrar así</button></div>` });
          d.querySelector('[data-seguir]').addEventListener('click', () => { d.close(); pasar(); });
          return;
        }
      });
      $cot.addEventListener('input', (e) => {
        if(!cot) return;
        if(e.target.id === 'cot-q'){ q = e.target.value; $cot.querySelector('[data-resultados]').innerHTML = resultadosHTML(); }
        if(e.target.id === 'cot-notas'){ cot.notas = e.target.value; guardarBorrador(); }
      });
      $cot.addEventListener('change', (e) => { if(cot && e.target.id === 'cot-dias'){ cot.dias = Number(e.target.value); guardarBorrador(); } });
      // Enter en el buscador agrega el único que salió (el lector de códigos escribe el código y un Enter).
      $cot.addEventListener('keydown', (e) => {
        if(e.key !== 'Enter' || e.target.id !== 'cot-q') return;
        e.preventDefault();
        const t = e.target.value.trim(); if(!t) return;
        const exacto = productos.find((p) => p.cb === t || (p.sku && quitaAcentos(p.sku) === quitaAcentos(t)));
        const h = exacto ? [exacto] : hallados();
        if(h.length === 1){ q = h[0].n; $cot.querySelector('[data-resultados]').innerHTML = resultadosHTML(); $cot.querySelector(`[data-agregar="${h[0].id}"]`)?.click(); }
        else aviso(h.length ? `${h.length} coinciden: toca el que es` : `No hay nada con «${t}»`, h.length ? '' : 'mal');
      });
      pintar();
    },
  };
}

export const PANTALLAS = { cotizar };
