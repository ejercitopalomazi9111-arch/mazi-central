/* ══════════════════════════════════════════════════════════════════════════
   PAGAR Y MIS PEDIDOS · Bloque 6
   ──────────────────────────────────────────────────────────────────────────
   Aquí, y sólo aquí, se pregunta quién eres. Todo lo anterior —ver, buscar,
   llenar el carrito— se hace sin cuenta.

   Lo que la persona escribe no se pierde: el borrador vive en el teléfono
   mientras llena, y la dirección queda en su ficha para la próxima.
   Pagar al recibir o antes (transferencia). El precio lo pone el servidor,
   nunca el teléfono: vender() lo lee de la base.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado, hoja, fecha } from '../nucleo/piezas.js';
import { negocio, catalogo, carrito, miFicha, pedirTienda, misPedidos, cambiarEstado } from '../nucleo/datos.js';
import { negocioPedido } from '../config.js';
import { aCentavos, aPesos, sugerirPagos } from '../nucleo/dinero.js';

const LLAVE_BORRADOR = 'tienda-pagar-' + negocioPedido();
const pesosC = (c) => pesos(aPesos(c));

export const ESTADOS = {
  recibido:     { texto: 'Recibido', icono: 'lista', clase: 'acento', dice: 'Ya lo tenemos. En un momento lo empiezan a preparar.' },
  preparando:   { texto: 'Preparando', icono: 'caja', clase: 'ojo', dice: 'Están juntando tus productos.' },
  en_camino:    { texto: 'En camino', icono: 'camion', clase: 'ojo', dice: 'Ya va para allá.' },
  entregado:    { texto: 'Entregado', icono: 'listo', clase: 'bien', dice: 'Entregado. ¡Gracias!' },
  no_entregado: { texto: 'No se pudo entregar', icono: 'alerta', clase: 'mal', dice: 'No se pudo entregar. Te van a buscar para intentar otra vez.' },
  cancelado:    { texto: 'Cancelado', icono: 'cerrar', clase: '', dice: 'Este pedido se canceló.' },
};
const PASOS = ['recibido', 'preparando', 'en_camino', 'entregado'];

const borrador = {
  leer(){ try{ return JSON.parse(localStorage.getItem(LLAVE_BORRADOR) || '{}'); }catch(e){ return {}; } },
  guardar(v){ try{ localStorage.setItem(LLAVE_BORRADOR, JSON.stringify(v)); }catch(e){} },
  borrar(){ try{ localStorage.removeItem(LLAVE_BORRADOR); }catch(e){} },
};

/* ══ PAGAR ════════════════════════════════════════════════════════════════ */

async function pagar(){
  const [n, cat, ficha] = await Promise.all([negocio(), catalogo(), miFicha().catch(() => null)]);
  const renglones = carrito.renglones().map(([id, cantidad]) => ({ p: cat.porId.get(id), cantidad })).filter((r) => r.p && !r.p.x);
  if(!renglones.length) return { html: estado({ icono: 'carrito', titulo: 'Tu carrito está vacío',
    texto: 'Agrega lo que necesites y aquí lo pides.', botones: `<a class="boton principal" href="${enlace('/')}">Ir a la tienda</a>` }) };

  const env = n.ajustes?.envio || {}, pagos = n.ajustes?.pagos || {};
  const subtotal = renglones.reduce((t, r) => t + aCentavos(r.p.p) * Math.min(r.cantidad, r.p.q), 0);
  const costoEnvio = aCentavos(env.costo || 0);
  const gratisDesde = env.gratis_desde != null ? aCentavos(env.gratis_desde) : null;
  const recoger = env.recoger !== false;
  const b = borrador.leer();
  const ultima = ficha?.direcciones?.[0] || {};
  const v = {
    entrega: b.entrega || 'domicilio',
    nombre: b.nombre ?? ficha?.nombre ?? '', telefono: b.telefono ?? ficha?.telefono ?? '',
    calle: b.calle ?? ultima.calle ?? '', colonia: b.colonia ?? ultima.colonia ?? '', referencias: b.referencias ?? ultima.referencias ?? '',
    cp: b.cp ?? ultima.cp ?? '', lat: b.lat ?? ultima.lat, lng: b.lng ?? ultima.lng,
    pago: b.pago || (pagos.efectivo !== false ? 'efectivo' : pagos.tarjeta ? 'tarjeta' : 'transferencia'),
    billete: b.billete || '', notas: b.notas || '',
  };
  const formas = [
    pagos.efectivo !== false && ['efectivo', 'Efectivo al recibir', 'efectivo'],
    pagos.tarjeta && ['tarjeta', 'Tarjeta al recibir', 'tarjeta'],
    pagos.transferencia && ['transferencia', 'Transferencia', 'transferencia'],
  ].filter(Boolean);
  if(!formas.some(([k]) => k === v.pago)) v.pago = formas[0]?.[0] || 'efectivo';

  const envioDe = (entrega) => entrega !== 'domicilio' ? 0 : gratisDesde != null && subtotal >= gratisDesde ? 0 : costoEnvio;

  return {
    html: `<form class="pagar" id="pagar" novalidate>
      <div class="pagar-principal">
        ${recoger ? `<section class="tarjeta bloque-form">
          <h2>¿Cómo lo recibes?</h2>
          <div class="segmentos" role="group" aria-label="Entrega">
            <button type="button" data-entrega="domicilio" aria-pressed="${v.entrega === 'domicilio'}">${icono('camion')}A domicilio</button>
            <button type="button" data-entrega="recoger" aria-pressed="${v.entrega === 'recoger'}">${icono('tienda')}Paso a recoger</button>
          </div>
          ${env.tiempo ? `<p class="nota con-margen">${icono('reloj')}${esc(env.tiempo)}</p>` : ''}
        </section>` : ''}

        <section class="tarjeta bloque-form">
          <h2>¿Quién eres?</h2>
          <p class="nota">Para avisarte y para que el repartidor te encuentre. Nada más.</p>
          <label class="campo" for="nombre"><span class="etiqueta-campo">Tu nombre</span>
            <input id="nombre" name="nombre" autocomplete="name" maxlength="80" value="${esc(v.nombre)}" required></label>
          <label class="campo" for="telefono"><span class="etiqueta-campo">WhatsApp</span>
            <input id="telefono" name="telefono" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="16" placeholder="442 123 4567" value="${esc(v.telefono)}" required>
            <span class="ayuda">10 dígitos. Por ahí te avisamos cuando vaya en camino.</span></label>
        </section>

        <section class="tarjeta bloque-form" data-bloque-domicilio${v.entrega === 'domicilio' ? '' : ' hidden'}>
          <h2>¿A dónde lo llevamos?</h2>
          ${env.zona ? `<p class="nota">Entregamos en ${esc(env.zona)}.</p>` : ''}
          <label class="campo" for="calle"><span class="etiqueta-campo">Calle y número</span>
            <input id="calle" name="calle" autocomplete="address-line1" maxlength="120" value="${esc(v.calle)}"></label>
          <div class="dos">
            <label class="campo" for="colonia"><span class="etiqueta-campo">Colonia</span>
              <input id="colonia" name="colonia" autocomplete="address-level3" maxlength="80" value="${esc(v.colonia)}"></label>
            <label class="campo" for="cp"><span class="etiqueta-campo">Código postal</span>
              <input id="cp" name="cp" inputmode="numeric" autocomplete="postal-code" maxlength="5" value="${esc(v.cp)}"></label>
          </div>
          <label class="campo" for="referencias"><span class="etiqueta-campo">¿Cómo la encontramos?</span>
            <input id="referencias" name="referencias" maxlength="200" placeholder="Entre qué calles, color del portón…" value="${esc(v.referencias)}"></label>
          <button type="button" class="boton secundario" data-ubicacion>${icono('lugar')}<span data-ubicacion-texto>${v.lat ? 'Ubicación guardada · volver a tomar' : 'Usar mi ubicación'}</span></button>
          <p class="nota con-margen">Con tu ubicación el repartidor llega sin preguntar. Es opcional.</p>
        </section>

        <section class="tarjeta bloque-form">
          <h2>¿Cómo pagas?</h2>
          <div class="opciones-pago" role="radiogroup" aria-label="Forma de pago">${formas.map(([k, t, ic]) =>
            `<label class="opcion-pago"><input type="radio" name="pago" value="${k}"${k === v.pago ? ' checked' : ''}>${icono(ic)}<span>${t}</span></label>`).join('')}</div>
          <div data-billete${v.pago === 'efectivo' ? '' : ' hidden'}>
            <p class="etiqueta-campo">¿Con qué billete pagas? <span class="nota-en-linea">Así el repartidor lleva tu cambio.</span></p>
            <div class="chips-elegir" data-billetes></div>
          </div>
          <div data-transferencia${v.pago === 'transferencia' ? '' : ' hidden'}>
            <dl class="datos-banco">
              ${pagos.banco ? `<dt>Banco</dt><dd>${esc(pagos.banco)}</dd>` : ''}
              ${pagos.clabe ? `<dt>CLABE</dt><dd><span class="clabe">${esc(pagos.clabe.replace(/(\d{3})(\d{3})(\d{11})(\d)/, '$1 $2 $3 $4'))}</span> <button type="button" class="boton fantasma" data-copiar="${esc(pagos.clabe)}">${icono('lista')}Copiar</button></dd>` : ''}
              ${pagos.titular ? `<dt>A nombre de</dt><dd>${esc(pagos.titular)}</dd>` : ''}
            </dl>
            <p class="nota">Transfiere el total y manda tu comprobante por WhatsApp. Tu pedido sale en cuanto se vea el pago.</p>
          </div>
          <label class="campo con-margen" for="notas"><span class="etiqueta-campo">¿Algo más? (opcional)</span>
            <input id="notas" name="notas" maxlength="300" placeholder="Toca el timbre, déjalo con el portero…" value="${esc(v.notas)}"></label>
        </section>
      </div>

      <aside class="pagar-resumen tarjeta">
        <h2>Tu pedido</h2>
        <ul class="resumen-lista">${renglones.map((r) => `<li><span>${Math.min(r.cantidad, r.p.q)} × ${esc(r.p.n)}</span><b>${pesosC(aCentavos(r.p.p) * Math.min(r.cantidad, r.p.q))}</b></li>`).join('')}</ul>
        ${renglones.some((r) => r.cantidad > r.p.q) ? `<p class="aviso-linea">${icono('alerta')}<span>Algunas cantidades se ajustaron a lo que hay.</span></p>` : ''}
        <a class="enlace" href="${enlace('/carrito')}">Cambiar el carrito</a>
        <dl class="cuentas">
          <dt>Productos</dt><dd>${pesosC(subtotal)}</dd>
          <dt data-envio-etq>Envío</dt><dd data-envio></dd>
          <dt class="total">Total</dt><dd class="total" data-total></dd>
        </dl>
        ${gratisDesde != null && costoEnvio && subtotal < gratisDesde ? `<p class="nota">Te faltan ${pesosC(gratisDesde - subtotal)} para el envío gratis.</p>` : ''}
        <button type="submit" class="boton principal grande ancho" data-pedir>${icono('listo')}<span data-pedir-texto>Pedir</span></button>
        <p class="nota centrado">Pagas al recibir, o antes si eliges transferencia. Puedes cancelar mientras no lo empiecen a preparar.</p>
      </aside>
    </form>`,

    alMontar($c, { aviso }){
      const $f = $c.querySelector('#pagar');
      const totalC = () => subtotal + envioDe(v.entrega);
      const repintar = () => {
        const e = envioDe(v.entrega);
        $f.querySelector('[data-envio]').textContent = v.entrega !== 'domicilio' ? 'Recoges tú' : e ? pesosC(e) : 'Gratis';
        $f.querySelector('[data-total]').textContent = pesosC(totalC());
        $f.querySelector('[data-pedir-texto]').textContent = `Pedir · ${pesosC(totalC())}`;
        $f.querySelector('[data-bloque-domicilio]').hidden = v.entrega !== 'domicilio';
        $f.querySelectorAll('[data-entrega]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.entrega === v.entrega));
        $f.querySelector('[data-billete]').hidden = v.pago !== 'efectivo';
        $f.querySelector('[data-transferencia]').hidden = v.pago !== 'transferencia';
        const opciones = [...sugerirPagos(totalC()).slice(1), -1];
        $f.querySelector('[data-billetes]').innerHTML = [0, ...opciones].map((x) => {
          const valor = x === 0 ? 'exacto' : x === -1 ? '' : String(x);
          const texto = x === 0 ? 'Pago exacto' : x === -1 ? 'No sé' : pesosC(x);
          return `<button type="button" class="chip-boton" data-billete-valor="${valor}" aria-pressed="${v.billete === valor}">${texto}</button>`;
        }).join('');
        borrador.guardar(v);
      };
      $f.addEventListener('input', (e) => { const t = e.target; if(t.name && t.name !== 'pago') v[t.name] = t.value; borrador.guardar(v); });
      $f.addEventListener('change', (e) => { if(e.target.name === 'pago'){ v.pago = e.target.value; repintar(); } });
      $f.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.entrega){ v.entrega = b.dataset.entrega; repintar(); }
        if(b.dataset.billeteValor !== undefined){ v.billete = b.dataset.billeteValor; repintar(); }
        if(b.dataset.copiar){ try{ await navigator.clipboard.writeText(b.dataset.copiar); aviso('CLABE copiada'); }catch(err){ aviso('No se pudo copiar: selecciónala y cópiala', 'mal'); } }
        if(b.matches('[data-ubicacion]')){
          if(!navigator.geolocation){ aviso('Este teléfono no comparte ubicación', 'mal'); return; }
          b.setAttribute('aria-busy', 'true');
          navigator.geolocation.getCurrentPosition((pos) => {
            v.lat = +pos.coords.latitude.toFixed(6); v.lng = +pos.coords.longitude.toFixed(6);
            b.removeAttribute('aria-busy'); $f.querySelector('[data-ubicacion-texto]').textContent = 'Ubicación guardada · volver a tomar';
            aviso(`Ubicación tomada (±${Math.round(pos.coords.accuracy)} m)`); borrador.guardar(v);
          }, (err) => { b.removeAttribute('aria-busy'); aviso(err.code === 1 ? 'No diste permiso de ubicación: escribe la dirección y listo' : 'No se pudo tomar la ubicación', 'mal'); },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
        }
      });

      const falla = (id, texto) => {
        const campo = $f.querySelector('#' + id).closest('.campo');
        campo.classList.add('error'); campo.querySelector('.mensaje-error')?.remove();
        campo.insertAdjacentHTML('beforeend', `<p class="mensaje-error">${icono('alerta')}${esc(texto)}</p>`);
        return $f.querySelector('#' + id);
      };
      $f.addEventListener('submit', async (e) => {
        e.preventDefault();
        $f.querySelectorAll('.campo.error').forEach((c) => { c.classList.remove('error'); c.querySelector('.mensaje-error')?.remove(); });
        const tel = v.telefono.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
        let malo = null;
        if(!v.nombre.trim()) malo ??= falla('nombre', 'Escribe tu nombre.');
        if(tel.length !== 10) malo ??= falla('telefono', 'Son 10 dígitos, sin el 52.');
        if(v.entrega === 'domicilio'){
          if(!v.calle.trim()) malo ??= falla('calle', 'Falta la calle y el número.');
          if(!v.colonia.trim()) malo ??= falla('colonia', 'Falta la colonia.');
          if(v.cp && !/^\d{5}$/.test(v.cp.trim())) malo ??= falla('cp', 'El código postal tiene 5 dígitos, o déjalo vacío.');
        }
        if(malo){ malo.focus(); aviso('Revisa lo marcado en rojo', 'mal'); return; }

        const $b = $f.querySelector('[data-pedir]'); $b.setAttribute('aria-busy', 'true'); $b.disabled = true;
        const envio = envioDe(v.entrega);
        const direccion = v.entrega === 'domicilio'
          ? { calle: v.calle.trim(), colonia: v.colonia.trim(), cp: v.cp.trim(), referencias: v.referencias.trim(), ...(v.lat ? { lat: v.lat, lng: v.lng } : {}), envio: aPesos(envio) }
          : null;
        const pago = { forma: v.pago, ...(v.pago === 'efectivo' && v.billete ? { paga_con: v.billete === 'exacto' ? 'exacto' : aPesos(Number(v.billete)) } : {}) };
        try{
          const r = await pedirTienda({
            renglones: renglones.map((x) => ({ id: x.p.id, cantidad: Math.min(x.cantidad, x.p.q) })),
            nombre: v.nombre.trim(), telefono: tel, direccion, pago,
            momento: v.pago === 'transferencia' ? 'antes' : 'al_recibir',
            notas: [v.notas.trim(), envio ? `Envío ${pesosC(envio)}` : ''].filter(Boolean).join(' · '),
          });
          carrito.vaciar(); borrador.borrar();
          $c.innerHTML = estado({ icono: 'listo', titulo: `¡Listo! Pedido #${r.folio}`,
            texto: v.entrega === 'domicilio' ? `Te lo llevamos a ${v.calle.trim()}. Te avisamos por WhatsApp cuando vaya en camino.`
              : 'Te avisamos por WhatsApp cuando esté listo para recoger.',
            extra: `<p class="total-pedido">${pesosC(aCentavos(Number(r.total)) + envio)}${v.pago === 'transferencia' ? ' · por transferir' : v.pago === 'tarjeta' ? ' · con tarjeta al recibir' : ' · en efectivo al recibir'}</p>`,
            botones: `<a class="boton principal" href="${enlace('/pedidos')}">${icono('pedidos')}Ver mis pedidos</a>
              <a class="boton secundario" href="${enlace('/')}">Seguir comprando</a>` });
          window.scrollTo(0, 0);
        }catch(err){
          console.error(err);
          aviso(err.message || 'No se pudo hacer el pedido', 'mal');
          $b.removeAttribute('aria-busy'); $b.disabled = false;
        }
      });
      repintar();
    },
  };
}

/* ══ MIS PEDIDOS ═════════════════════════════════════════════════════════ */

function progreso(p){
  if(p.estado === 'cancelado' || p.estado === 'no_entregado'){
    const e = ESTADOS[p.estado];
    return `<p class="chip ${e.clase}">${icono(e.icono)}${e.texto}</p>`;
  }
  const i = PASOS.indexOf(p.estado);
  return `<ol class="pasos-pedido" aria-label="Va en: ${ESTADOS[p.estado].texto}">${PASOS.map((s, k) =>
    `<li class="${k < i ? 'hecho' : k === i ? 'ahora' : ''}"${k === i ? ' aria-current="step"' : ''}><span class="punto">${icono(k < i ? 'listo' : ESTADOS[s].icono)}</span><span>${ESTADOS[s].texto}</span></li>`).join('')}</ol>`;
}

async function pedidos(){
  const [lista, cat] = await Promise.all([misPedidos(), catalogo()]);
  if(!lista.length) return { html: estado({ icono: 'pedidos', titulo: 'Aún no has pedido nada',
    texto: 'Cuando pidas algo, aquí ves en qué va y lo vuelves a pedir con un toque.',
    botones: `<a class="boton principal" href="${enlace('/')}">Ir a la tienda</a>` }) };

  const tarjeta = (p) => {
    const piezas = p.renglones.reduce((t, r) => t + r.cantidad, 0);
    return `<li class="tarjeta pedido-cliente">
      <header><div><h2>Pedido #${p.folio}</h2><p class="nota">${esc(fecha(p.creado))} · ${plural(piezas, 'pieza', 'piezas')}</p></div>
        <strong class="total-pedido">${pesos(p.total + Number(p.direccion?.envio || 0))}</strong></header>
      ${progreso(p)}
      <p class="dice">${esc(ESTADOS[p.estado].dice)}${p.estado === 'cancelado' || p.estado === 'no_entregado' ? (p.eventos_pedido?.slice(-1)[0]?.por_que ? ` Motivo: ${esc(p.eventos_pedido.slice(-1)[0].por_que)}.` : '') : ''}</p>
      <div class="botones">
        <button class="boton principal" data-repetir="${p.id}">${icono('repetir')}Volver a pedir</button>
        <button class="boton secundario" data-detalle="${p.id}">${icono('ver')}Detalle</button>
        ${p.estado === 'recibido' ? `<button class="boton fantasma" data-cancelar="${p.id}">Cancelar</button>` : ''}
      </div></li>`;
  };

  return {
    html: `<ul class="pedidos-cliente">${lista.map(tarjeta).join('')}</ul>`,
    alMontar($c, { aviso, ir, recargar }){
      $c.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if(!b) return;
        const p = lista.find((x) => x.id === (b.dataset.repetir || b.dataset.detalle || b.dataset.cancelar));
        if(b.dataset.repetir){
          let puestos = 0; const faltan = [];
          for(const r of p.renglones){
            const prod = r.producto_id && cat.porId.get(r.producto_id);
            if(!prod || prod.x){ faltan.push(r.nombre); continue; }
            const n = Math.min(r.cantidad, prod.q - carrito.cuantas(prod.id));
            if(n > 0){ carrito.agregar(prod.id, n); puestos += n; }
            if(n < r.cantidad) faltan.push(r.nombre);
          }
          if(puestos) aviso(`${plural(puestos, 'pieza agregada', 'piezas agregadas')} al carrito${faltan.length ? `. No alcanzó: ${faltan.slice(0, 2).join(', ')}${faltan.length > 2 ? '…' : ''}` : ''}`, faltan.length ? 'mal' : '');
          else aviso('Nada de ese pedido está disponible ahora', 'mal');
          if(puestos) ir('/carrito');
        }
        if(b.dataset.detalle){
          const envio = Number(p.direccion?.envio || 0);
          hoja({ titulo: `Pedido #${p.folio}`, cuerpo: `
            ${progreso(p)}
            <ul class="resumen-lista">${p.renglones.map((r) => `<li><span>${r.cantidad} × ${esc(r.nombre)}</span><b>${pesos(r.importe)}</b></li>`).join('')}</ul>
            <dl class="cuentas">${envio ? `<dt>Envío</dt><dd>${pesos(envio)}</dd>` : ''}<dt class="total">Total</dt><dd class="total">${pesos(p.total + envio)}</dd></dl>
            <p class="nota">${p.direccion?.recoge ? 'Pasas a recoger.' : p.direccion ? `A: ${esc([p.direccion.calle, p.direccion.colonia].filter(Boolean).join(', '))}` : ''}</p>
            <p class="nota">${esc({ efectivo: 'Efectivo al recibir', tarjeta: 'Tarjeta al recibir', transferencia: 'Transferencia' }[p.direccion?.pago?.forma] || '')}${p.pagado ? ' · pagado' : ''}</p>
            <h3>Historia</h3>
            <ul class="movimientos">${(p.eventos_pedido || []).sort((a, b) => new Date(a.cuando) - new Date(b.cuando)).map((ev) =>
              `<li><span class="circulo-chico">${icono(ESTADOS[ev.a].icono)}</span><span class="texto"><strong>${ESTADOS[ev.a].texto}</strong>
                <small>${esc(fecha(ev.cuando))}${ev.por_que && !ev.por_que.startsWith('nuevo') ? ` · ${esc(ev.por_que)}` : ''}</small></span></li>`).join('')}</ul>` });
        }
        if(b.dataset.cancelar){
          const motivo = prompt('¿Por qué lo cancelas? (nos ayuda a mejorar)', 'Ya no lo necesito');
          if(motivo === null) return;
          b.setAttribute('aria-busy', 'true'); b.disabled = true;
          try{ await cambiarEstado(p.id, 'cancelado', motivo.trim() || 'Lo canceló el cliente'); aviso('Pedido cancelado'); recargar(); }
          catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
        }
      });
    },
  };
}

export const PANTALLAS = { pagar, pedidos };
