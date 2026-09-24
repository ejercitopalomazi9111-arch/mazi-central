/* ══════════════════════════════════════════════════════════════════════════
   CONFIGURAR LA IMPRESORA DE TICKETS · Punto de venta
   ──────────────────────────────────────────────────────────────────────────
   Pensada para quien no sabe qué es ESC/POS: se elige la marca y el modelo,
   cómo está conectada, y «Imprimir prueba». Lo demás ya viene puesto. Si la
   prueba sale mal, la misma hoja de prueba dice qué mover (tabla de
   caracteres, letras por renglón, modo imagen).
   La configuración es de ESTE aparato: cada caja tiene la suya.
   ═════════════════════════════════════════════════════════════════════════ */
import { icono } from '../nucleo/iconos.js';
import { esc } from '../nucleo/piezas.js';
import { negocio } from '../nucleo/datos.js';
import { MODELOS, CONEXIONES, PAPELES } from '../nucleo/impresion/catalogo.js';
import { PAGINAS } from '../nucleo/impresion/escpos.js';
import { aRenglones, piezasTicket } from '../nucleo/impresion/plantilla.js';
import { leerConf, guardarConf, confDeModelo, prueba, abrirCajon, TRANSPORTES, piezasPrueba } from '../nucleo/impresion/impresora.js';

const ayudaAparato = () => {
  const ua = navigator.userAgent;
  if(/iPhone|iPad/.test(ua)) return 'En iPhone y iPad sólo funcionan la ventana de imprimir (impresoras con AirPrint) y las impresoras de red Epson o Star. Safari no permite USB ni Bluetooth directo.';
  if(/Android/.test(ua)) return 'En Android con Chrome: USB con un cable OTG, o Bluetooth. Las de red Epson/Star también.';
  if(/Windows/.test(ua)) return 'En Windows con Chrome o Edge: USB directo pide el controlador WinUSB (con Zadig). Si la impresora ya está instalada, lo más fácil es el puente local con «win:NombreCompartido», o la ventana de imprimir.';
  if(/Mac/.test(ua)) return 'En Mac con Chrome: USB directo, o el puente local con «cups:NombreDeLaImpresora».';
  return 'Chrome o Edge permiten USB, Bluetooth y puerto serie. Cualquier navegador permite la ventana de imprimir.';
};

const EJEMPLO = {
  folio: 128, cuando: Date.now(), cajero: 'Caja 1',
  renglones: [{ nombre: 'Cera mate fijación fuerte 100 g', cantidad: 2, precio: 125, importe: 250 }, { nombre: 'Navaja clásica', cantidad: 1, precio: 180, importe: 180 }],
  total: 430, metodo: 'efectivo', recibido: 500, cambio: 70, qr: location.origin + location.pathname,
};

async function impresora(){
  const n = await negocio();
  let c = leerConf();
  const marcas = [...new Set(MODELOS.map((m) => m.marca))];

  return {
    html: `<div class="config-impresora">
      <p class="estado-impresora" id="estado"></p>

      <section class="tarjeta bloque-form">
        <h2>1 · ¿Qué impresora es?</h2>
        <label class="campo" for="modelo"><span class="etiqueta-campo">Marca y modelo</span>
          <select id="modelo">${marcas.map((m) => `<optgroup label="${esc(m)}">${MODELOS.filter((x) => x.marca === m).map((x) =>
            `<option value="${x.id}"${x.id === c.modelo ? ' selected' : ''}>${esc(x.marca === 'Genérica' || x.marca === 'Cualquiera' ? x.modelo : `${x.marca} ${x.modelo}`)}</option>`).join('')}</optgroup>`).join('')}</select>
          <span class="ayuda">¿No está la tuya? Casi todas funcionan como «Genérica ESC/POS» de su ancho de papel.</span></label>
        <p class="nota" id="nota-modelo"></p>
      </section>

      <section class="tarjeta bloque-form">
        <h2>2 · ¿Cómo está conectada?</h2>
        <div class="opciones-pago" id="conexiones" role="radiogroup" aria-label="Conexión"></div>
        <div id="campos-conexion"></div>
        <p class="nota">${esc(ayudaAparato())}</p>
      </section>

      <section class="tarjeta bloque-form">
        <h2>3 · Papel y ticket</h2>
        <label class="campo" for="papel"><span class="etiqueta-campo">Ancho del papel</span>
          <select id="papel">${PAPELES.map((p, i) => `<option value="${i}"${p.mm === c.papel && p.columnas === c.columnas ? ' selected' : ''}>${p.texto}</option>`).join('')}</select></label>
        <label class="interruptor"><input type="checkbox" id="automatico"${c.automatico ? ' checked' : ''}><span><strong>Imprimir solo al cobrar</strong><small>Sin tener que tocar «Imprimir ticket».</small></span></label>
        <label class="interruptor"><input type="checkbox" id="cajon"${c.cajon ? ' checked' : ''}><span><strong>Abrir el cajón al cobrar en efectivo</strong><small>Si el cajón está conectado a la impresora (cable RJ11/RJ12).</small></span></label>
        <label class="interruptor"><input type="checkbox" id="qr"${c.qr ? ' checked' : ''}><span><strong>Código QR en el ticket</strong><small>Para volver a pedir desde el teléfono. Apágalo en impresoras de matriz.</small></span></label>
        <div class="dos">
          <label class="campo" for="corte"><span class="etiqueta-campo">Corte del papel</span>
            <select id="corte">${[['parcial', 'Parcial (deja una pestaña)'], ['total', 'Total'], ['no', 'No corta (arrancar a mano)']].map(([k, t]) => `<option value="${k}"${k === c.corte ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="campo" for="copias"><span class="etiqueta-campo">Copias</span>
            <select id="copias">${[1, 2, 3].map((k) => `<option${k === Number(c.copias) ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
        </div>
        <details class="plegable"><summary>Ajustes avanzados</summary>
          <label class="interruptor"><input type="checkbox" id="modoImagen"${c.modoImagen ? ' checked' : ''}><span><strong>Imprimir como imagen</strong><small>Para impresoras que no tienen acentos o sólo imprimen gráficos. Tarda un poco más.</small></span></label>
          <label class="campo" for="dialecto"><span class="etiqueta-campo">Idioma de la impresora</span>
            <select id="dialecto"><option value="escpos"${c.dialecto === 'escpos' ? ' selected' : ''}>ESC/POS (Epson y la mayoría)</option><option value="star"${c.dialecto === 'star' ? ' selected' : ''}>Star Line Mode</option></select></label>
          <div class="dos">
            <label class="campo" for="pagina"><span class="etiqueta-campo">Tabla de caracteres</span>
              <select id="pagina">${Object.entries(PAGINAS).map(([k, p]) => `<option value="${k}"${k === c.pagina ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
            <label class="campo" for="paginaNumero"><span class="etiqueta-campo">Número de tabla (si tu manual dice otro)</span>
              <input id="paginaNumero" inputmode="numeric" placeholder="automático" value="${c.paginaNumero ?? ''}"></label>
          </div>
          <label class="campo" for="avance"><span class="etiqueta-campo">Renglones en blanco antes de cortar</span>
            <input id="avance" inputmode="numeric" value="${c.avance}"></label>
        </details>
      </section>

      <section class="tarjeta bloque-form">
        <h2>Así sale</h2>
        <div class="segmentos" role="group" aria-label="Qué ver"><button type="button" data-vista="ticket" aria-pressed="true">Un ticket</button><button type="button" data-vista="prueba" aria-pressed="false">La hoja de prueba</button></div>
        <pre class="vista-ticket" id="vista" aria-label="Vista previa del ticket"></pre>
      </section>

      <div class="barra-guardar">
        <button class="boton secundario" data-cajon>${icono('efectivo')}Abrir cajón</button>
        <button class="boton principal" data-prueba>${icono('imprimir')}Imprimir prueba</button>
      </div>
    </div>`,

    alMontar($c, { aviso }){
      let vista = 'ticket';
      const modelo = () => MODELOS.find((m) => m.id === c.modelo) || MODELOS[0];
      const guardar = () => { guardarConf(c); pintar(); };

      const camposConexion = () => {
        const x = c.conexion;
        if(x === 'epson' || x === 'star') return `<label class="campo" for="ip"><span class="etiqueta-campo">IP de la impresora</span>
            <input id="ip" inputmode="decimal" placeholder="192.168.1.50" value="${esc(c.ip)}"><span class="ayuda">Sale en la hoja de estado de la impresora (dejar apretado el botón FEED al prenderla).</span></label>
          ${x === 'epson' ? `<label class="campo" for="epsonId"><span class="etiqueta-campo">ID del dispositivo</span><input id="epsonId" value="${esc(c.epsonId)}"></label>` : ''}
          <button type="button" class="boton secundario" data-conectar>${icono('actualizar')}Probar conexión</button>`;
        if(x === 'puente') return `<p class="nota">El puente es un programita que corre en la computadora de la caja. <a href="puente/puente.mjs" download>Descargar el puente</a></p>
          <details class="plegable"><summary>Cómo se instala (una vez)</summary><ol class="pasos-texto">
            <li>Instala Node desde nodejs.org (la versión LTS).</li>
            <li>Guarda <code>puente.mjs</code> en la computadora de la caja.</li>
            <li>Abre una terminal en esa carpeta y escribe <code>node puente.mjs</code>. Deja la ventana abierta.</li>
            <li>Windows: comparte la impresora (Propiedades → Compartir) y en Destino escribe <code>win:</code> y el nombre. Mac/Linux: <code>cups:</code> y el nombre que sale en <code>lpstat -p</code>. De red: su IP.</li>
            <li>Para que arranque solo: un acceso directo en <code>shell:startup</code> (Windows) o en Ítems de inicio (Mac).</li>
          </ol></details>
          <label class="campo" for="destino"><span class="etiqueta-campo">Destino</span>
            <input id="destino" placeholder="192.168.1.50 · win:TICKETS · cups:Epson_TM" value="${esc(c.destino)}">
            <span class="ayuda">La IP de la impresora de red, o el nombre de la impresora en la computadora.</span></label>
          <label class="campo" for="puenteUrl"><span class="etiqueta-campo">Dirección del puente</span><input id="puenteUrl" value="${esc(c.puente)}"></label>
          <button type="button" class="boton secundario" data-conectar>${icono('actualizar')}Probar el puente</button>`;
        if(x === 'serial') return `<label class="campo" for="baudios"><span class="etiqueta-campo">Velocidad (baudios)</span>
            <select id="baudios">${[9600, 19200, 38400, 57600, 115200].map((b) => `<option${b === Number(c.baudios) ? ' selected' : ''}>${b}</option>`).join('')}</select></label>
          <button type="button" class="boton secundario" data-conectar>${icono('agregar')}Elegir el puerto</button>`;
        if(x === 'usb') return `<button type="button" class="boton secundario" data-conectar>${icono('agregar')}Elegir la impresora USB</button>`;
        if(x === 'bluetooth') return `<button type="button" class="boton secundario" data-conectar>${icono('agregar')}Buscar la impresora Bluetooth</button>
          <label class="campo" for="paquete"><span class="etiqueta-campo">Tamaño de paquete</span>
            <select id="paquete">${[[20, '20 (las más lentas)'], [100, '100 (normal)'], [180, '180 (rápidas)']].map(([k, t]) => `<option value="${k}"${k === Number(c.paquete) ? ' selected' : ''}>${t}</option>`).join('')}</select>
            <span class="ayuda">Si el ticket sale cortado o con basura, baja el número.</span></label>`;
        return `<p class="nota">Al imprimir se abre la ventana del sistema: elige la impresora de tickets y, la primera vez, el papel de ${c.papel} mm sin márgenes.</p>`;
      };

      const pintar = () => {
        const m = modelo();
        $c.querySelector('#nota-modelo').textContent = m.nota || '';
        $c.querySelector('#conexiones').innerHTML = m.conexiones.map((k) => {
          const t = TRANSPORTES[k], puede = k === 'navegador' || t?.disponible();
          return `<label class="opcion-pago${puede ? '' : ' no-disponible'}"><input type="radio" name="conexion" value="${k}"${k === c.conexion ? ' checked' : ''}${puede ? '' : ' disabled'}>
            <span><strong>${esc(CONEXIONES[k].nombre)}</strong><small>${esc(puede ? CONEXIONES[k].dice : 'Este navegador no lo permite')}</small></span></label>`;
        }).join('');
        $c.querySelector('#campos-conexion').innerHTML = camposConexion();
        const r = aRenglones(vista === 'prueba' ? piezasPrueba(c, n) : piezasTicket(EJEMPLO, n), c.columnas);
        const $v = $c.querySelector('#vista');
        $v.style.setProperty('--cols', c.columnas);
        $v.innerHTML = r.map((x) => x.qr ? '<span class="qr-falso" aria-label="Código QR"></span>' : `<span class="${x.negritas ? 'n' : ''}${x.grande ? ' g' : ''}">${esc(x.v) || ' '}</span>`).join('\n');
        $c.querySelector('#estado').innerHTML = `${icono('imprimir')}<span><strong>${esc(m.marca === 'Genérica' || m.marca === 'Cualquiera' ? m.modelo : `${m.marca} ${m.modelo}`)}</strong> · ${esc(CONEXIONES[c.conexion].nombre)}${c.conectada ? ` · ${esc(c.conectada)}` : ''}</span>`;
      };

      $c.addEventListener('change', (e) => {
        const t = e.target;
        if(t.id === 'modelo'){ c = confDeModelo(t.value, c); c.conectada = ''; for(const k of ['automatico', 'cajon', 'qr', 'modoImagen']){ const el = $c.querySelector('#' + k); if(el) el.checked = !!c[k]; }
          $c.querySelector('#corte').value = c.corte; $c.querySelector('#dialecto').value = c.dialecto; $c.querySelector('#pagina').value = c.pagina;
          $c.querySelector('#papel').value = String(PAPELES.findIndex((p) => p.mm === c.papel && p.columnas === c.columnas)); }
        else if(t.name === 'conexion'){ c.conexion = t.value; c.conectada = ''; }
        else if(t.id === 'papel'){ const p = PAPELES[Number(t.value)]; c.papel = p.mm; c.columnas = p.columnas; }
        else if(['automatico', 'cajon', 'qr', 'modoImagen'].includes(t.id)) c[t.id] = t.checked;
        else if(['corte', 'dialecto', 'pagina', 'epsonId', 'destino', 'ip'].includes(t.id)) c[t.id] = t.value.trim();
        else if(t.id === 'puenteUrl') c.puente = t.value.trim().replace(/\/$/, '');
        else if(['copias', 'baudios', 'paquete', 'avance'].includes(t.id)) c[t.id] = Number(t.value) || 0;
        else if(t.id === 'paginaNumero') c.paginaNumero = t.value.trim() === '' ? null : Math.max(0, Math.min(255, Number.parseInt(t.value, 10) || 0));
        guardar();
      });
      $c.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.vista){ vista = b.dataset.vista; $c.querySelectorAll('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', x === b)); pintar(); return; }
        const ocupar = () => { b.setAttribute('aria-busy', 'true'); b.disabled = true; };
        const soltar = () => { b.removeAttribute('aria-busy'); b.disabled = false; };
        if(b.matches('[data-conectar]')){
          ocupar();
          try{ c.conectada = await TRANSPORTES[c.conexion].conectar(c); guardar(); aviso(`Conectada: ${c.conectada}`); }
          catch(err){ if(err.name !== 'NotFoundError') aviso(err.message, 'mal'); else aviso('No elegiste ninguna', 'mal'); soltar(); }
        }
        if(b.matches('[data-prueba]')){
          ocupar();
          try{ await prueba(n, c); if(c.conexion !== 'navegador') aviso('Prueba enviada. ¿Salió la regla en un solo renglón?'); }
          catch(err){ console.error(err); aviso(err.message, 'mal'); }
          soltar();
        }
        if(b.matches('[data-cajon]')){
          ocupar();
          try{ await abrirCajon(c); aviso('Cajón abierto'); }catch(err){ aviso(err.message, 'mal'); }
          soltar();
        }
      });
      pintar();
    },
  };
}

export const PANTALLAS = { impresora };
