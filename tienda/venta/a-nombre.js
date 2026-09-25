/* ══════════════════════════════════════════════════════════════════════════
   ¿A NOMBRE DE QUIÉN? · el cliente en la venta de mostrador
   ──────────────────────────────────────────────────────────────────────────
   Opcional y a un lado del cobro: la fila no se detiene por esto. Pero la
   venta que lleva nombre alimenta «le toca surtirse», el pedido de siempre y
   el sorteo, que antes sólo veían las compras en línea.
   Se busca por nombre o por un pedazo del WhatsApp; si no está, se da de
   alta ahí mismo con nombre y WhatsApp (0013 en el servidor).
   Vive DENTRO del <form> del cobro: todo botón es type="button" y Enter en
   estos campos no cobra.
   ═════════════════════════════════════════════════════════════════════════ */
import { icono } from '../nucleo/iconos.js';
import { esc } from '../nucleo/piezas.js';
import { buscarClientes, telefono, telefonoBonito, revisarAlta, mismoTelefono, digitos } from '../nucleo/buscar-cliente.js';
import { altaCliente, altaEnServidor } from '../nucleo/datos.js';

/* $caja: dónde se pinta. lista(): promesa con [{id, nombre, telefono}].
   estado: { cliente } — se comparte con quien cobra. */
export function montarANombre($caja, { lista, estado, aviso, pregunta = '¿A nombre de quién?', pista = 'Opcional · así cuenta para su recompra y el sorteo' }){
  let modo = estado.cliente ? 'elegido' : 'cerrado', q = '', clientes = null, error = null;

  const cargar = async () => {
    if(clientes) return;
    try{ clientes = await lista(); }catch(err){ console.error(err); error = navigator.onLine === false ? 'Sin internet no se pueden buscar clientes. La venta sí se puede cobrar sin nombre.' : err.message; }
    if(modo === 'buscar') pintar();
  };

  const fila = (c) => `<li><button type="button" class="fila-opcion" data-elegir="${esc(c.id)}">${icono('cliente')}
    <span class="texto"><strong>${esc(c.nombre || 'Sin nombre')}</strong><small>${c.telefono ? esc(telefonoBonito(c.telefono)) : 'Sin WhatsApp'}</small></span></button></li>`;

  const pintar = () => {
    if(modo === 'elegido'){
      const c = estado.cliente;
      // Toda la tarjeta cambia de cliente: un botón «Cambiar» aparte le robaba al nombre el ancho que necesita en teléfono.
      $caja.innerHTML = `<div class="cliente-elegido"><button type="button" class="elegido-cuerpo" data-cambiar aria-label="Cambiar cliente: ${esc(c.nombre || 'sin nombre')}">${icono('cliente')}
        <span class="texto"><small>A nombre de · toca para cambiar</small><strong>${esc(c.nombre || 'Sin nombre')}</strong>${c.telefono ? `<small class="tel">${esc(telefonoBonito(c.telefono))}</small>` : ''}</span></button>
        <button type="button" class="boton-ico" data-quitar aria-label="Quitar el nombre de esta venta">${icono('cerrar')}</button></div>`;
      return;
    }
    if(modo === 'cerrado'){
      $caja.innerHTML = `<button type="button" class="fila-opcion abrir-cliente" data-abrir>${icono('cliente')}
        <span class="texto"><strong>${esc(pregunta)}</strong><small>${esc(pista)}</small></span>${icono('adelante')}</button>`;
      return;
    }
    if(modo === 'alta'){
      const soloNum = digitos(q).length >= 3 && !/[a-z]/i.test(q);
      $caja.innerHTML = `<fieldset class="alta-cliente"><legend>Cliente nuevo</legend>
        ${altaEnServidor() ? `
        <label class="campo" for="alta-nombre"><span class="etiqueta-campo">Nombre</span>
          <input id="alta-nombre" autocomplete="off" autocapitalize="words" value="${soloNum ? '' : esc(q)}"></label>
        <label class="campo" for="alta-tel"><span class="etiqueta-campo">WhatsApp</span>
          <input id="alta-tel" type="tel" inputmode="tel" autocomplete="off" placeholder="10 números" value="${soloNum ? esc(q) : ''}"></label>
        <p class="falta" data-falta hidden></p>
        <div class="botones"><button type="button" class="boton secundario" data-volver>Volver</button>
          <button type="button" class="boton principal" data-guardar-alta>${icono('listo')}Guardar y usar</button></div>`
        : `<p class="aviso-linea">${icono('info')}<span>Dar de alta desde la caja todavía no está encendido. Que haga su cuenta en la tienda y la próxima vez lo eliges aquí.</span></p>
        <div class="botones"><button type="button" class="boton secundario" data-volver>Volver</button></div>`}
      </fieldset>`;
      const $n = $caja.querySelector(soloNum ? '#alta-tel' : '#alta-nombre') || $caja.querySelector('#alta-nombre');
      $n?.focus();
      return;
    }
    // buscar
    const hallados = clientes ? buscarClientes(clientes, q) : [];
    $caja.innerHTML = `<div class="buscar-cliente">
      <div class="buscar-cliente-cabeza"><label class="buscador">${icono('buscar')}
        <input id="q-cliente" type="search" placeholder="Nombre o WhatsApp" autocomplete="off" enterkeyhint="search" aria-label="Buscar cliente por nombre o WhatsApp" value="${esc(q)}"></label>
        <button type="button" class="boton fantasma" data-cerrar-cliente>Sin nombre</button></div>
      <div data-resultados aria-live="polite">${resultados(hallados)}</div></div>`;
    const $q = $caja.querySelector('#q-cliente');
    $q.focus(); $q.setSelectionRange(q.length, q.length);
  };

  const resultados = (hallados) => {
    if(error) return `<p class="falta">${esc(error)}</p>`;
    if(!clientes) return '<p class="nota" aria-busy="true">Cargando clientes…</p>';
    const nuevo = `<button type="button" class="fila-opcion nuevo" data-nuevo>${icono('agregar')}<span class="texto"><strong>${q.trim() ? `Dar de alta a «${esc(q.trim())}»` : 'Cliente nuevo'}</strong><small>Con nombre y WhatsApp</small></span></button>`;
    if(!q.trim()) return `<p class="nota">Escribe su nombre o un pedazo de su WhatsApp.${clientes.length ? '' : ' Todavía no hay clientes guardados.'}</p>${nuevo}`;
    return `${hallados.length ? `<ul class="lista-opciones">${hallados.map(fila).join('')}</ul>` : `<p class="nota">Nadie con «${esc(q.trim())}».</p>`}${nuevo}`;
  };

  const elegir = (c) => { estado.cliente = { id: c.id, nombre: c.nombre, telefono: c.telefono }; modo = 'elegido'; pintar(); };

  const guardarAlta = async (b) => {
    const nombre = $caja.querySelector('#alta-nombre').value.trim(), tel = $caja.querySelector('#alta-tel').value;
    const $falta = $caja.querySelector('[data-falta]');
    const falta = revisarAlta({ nombre, telefono: tel });
    if(Object.keys(falta).length){ $falta.textContent = Object.values(falta).join(' · '); $falta.hidden = false; return; }
    const ya = mismoTelefono(clientes, tel);
    if(ya){ aviso(`Ese WhatsApp ya es de ${ya.nombre || 'un cliente'}: se usa ése`); elegir(ya); return; }
    b.setAttribute('aria-busy', 'true'); b.disabled = true;
    try{
      const id = await altaCliente({ nombre, telefono: telefono(tel) });
      const c = { id, nombre, telefono: telefono(tel) };
      clientes = [...(clientes || []), c];
      elegir(c);
    }catch(err){
      if(err.causa?.code === 'sin_alta'){ pintar(); return; }   // esperado mientras 0013 no esté: no es un error
      console.error(err);
      $falta.textContent = err.message; $falta.hidden = false;
      b.removeAttribute('aria-busy'); b.disabled = false;
    }
  };

  $caja.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.matches('[data-abrir], [data-cambiar]')){ modo = 'buscar'; pintar(); cargar(); }
    else if(b.matches('[data-quitar]')){ estado.cliente = null; modo = 'cerrado'; q = ''; pintar(); }
    else if(b.matches('[data-cerrar-cliente]')){ modo = estado.cliente ? 'elegido' : 'cerrado'; pintar(); }
    else if(b.dataset.elegir){ const c = clientes.find((x) => String(x.id) === b.dataset.elegir); if(c) elegir(c); }
    else if(b.matches('[data-nuevo]')){ modo = 'alta'; pintar(); }
    else if(b.matches('[data-volver]')){ modo = 'buscar'; pintar(); }
    else if(b.matches('[data-guardar-alta]')) guardarAlta(b);
  });
  $caja.addEventListener('input', (e) => {
    if(e.target.id !== 'q-cliente') return;
    q = e.target.value;
    $caja.querySelector('[data-resultados]').innerHTML = resultados(clientes ? buscarClientes(clientes, q) : []);
  });
  // Dentro del form del cobro, Enter cobraría: aquí Enter elige al único que salió, o guarda el alta.
  $caja.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter') return;
    e.preventDefault();
    if(e.target.id === 'q-cliente'){ const h = clientes ? buscarClientes(clientes, q) : []; if(h.length === 1) elegir(h[0]); }
    else if(e.target.closest('.alta-cliente')){ const b = $caja.querySelector('[data-guardar-alta]'); if(b) guardarAlta(b); }
  });

  pintar();
  return { reiniciar(){ estado.cliente = null; modo = 'cerrado'; q = ''; pintar(); } };
}
