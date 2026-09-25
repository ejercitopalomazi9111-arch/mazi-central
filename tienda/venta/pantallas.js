/* ══════════════════════════════════════════════════════════════════════════
   PUNTO DE VENTA · Bloque 5
   ──────────────────────────────────────────────────────────────────────────
   Para la tableta parada junto a la caja y para el teléfono del dueño cuando
   no hay tableta. Lo que tiene que ser cierto:
     · se cobra sin caja abierta NUNCA (el cuadre del día depende de eso);
     · el lector de códigos USB o Bluetooth funciona sin tocar nada: escribe
       el código y un Enter en el buscador, y eso agrega el producto;
     · el cambio lo calcula la app, y dice con qué billetes darlo;
     · el ticket en curso sobrevive a que se apague la pantalla.
   Todo el dinero en centavos (nucleo/dinero.js). La venta la hace vender()
   del servidor, que bloquea existencias: dos cajas no venden la última pieza.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, quitaAcentos, plural, estado, hoja, numero, fecha, descargarCSV } from '../nucleo/piezas.js';
import {
  negocio, catalogo, olvidarCatalogo, miCaja, abrirCaja, cerrarCaja, cobrosDeCaja,
  venderMostrador, ventasDesde, cajasCerradas, yo, efectivoDevueltoEnCaja, filaMostrador, subirVentasPendientes, clientesMostrador,
} from '../nucleo/datos.js';
import { montarANombre } from './a-nombre.js';
import { negocioPedido } from '../config.js';
import { aCentavos, aPesos, sugerirPagos, desglose, contar, BILLETES, MONEDAS } from '../nucleo/dinero.js';
import { imprimir, imprimirCorte, leerConf, abrirCajon } from '../nucleo/impresion/impresora.js';
import { filtrar } from '../nucleo/parecido.js';

const PAGINA = 60;
const LLAVE_TICKET = 'tienda-pos-ticket-' + negocioPedido();
const HORA = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });
const hora = (d) => HORA.format(new Date(d));
const pesosC = (c) => pesos(aPesos(c));
/* Para las cifras grandes de resumen: sin centavos. «$8,032.6 / 0» partido en
   dos renglones no se lee; «$8,033» sí, y el detalle está en los tickets. */
const pesosR = (c) => '$' + Math.round(c / 100).toLocaleString('es-MX');
const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mixto: 'Mixto', pasarela: 'En línea' };

/* ── El ticket en curso, guardado en el teléfono ───────────────────────── */
export const ticket = {
  leer(){ try{ return JSON.parse(localStorage.getItem(LLAVE_TICKET) || '[]'); }catch(e){ return []; } },
  guardar(r){ try{ localStorage.setItem(LLAVE_TICKET, JSON.stringify(r)); }catch(e){} },
};
/* Quien pasa algo a cobrar desde otra pantalla (una cotización) deja aquí a
   nombre de quién va; Cobrar lo toma una vez y lo borra. */
const LLAVE_CLIENTE = 'tienda-pos-cliente-' + negocioPedido();
export function dejarCliente(c){ try{ c ? sessionStorage.setItem(LLAVE_CLIENTE, JSON.stringify(c)) : sessionStorage.removeItem(LLAVE_CLIENTE); }catch(e){} }
function tomarCliente(){ try{ const c = JSON.parse(sessionStorage.getItem(LLAVE_CLIENTE) || 'null'); sessionStorage.removeItem(LLAVE_CLIENTE); return c; }catch(e){ return null; } }

/* ── Abrir caja (lo usan Cobrar y Caja) ────────────────────────────────── */
const FONDOS = [0, 50000, 100000, 200000];
function abrirCajaHTML(){
  return estado({ icono: 'efectivo', titulo: 'Abre la caja para empezar',
    texto: 'Cuenta con cuánto cambio empiezas. Al cerrar, la app te dice si cuadró.',
    extra: `<form class="abrir-caja" data-abrir-caja novalidate>
      <div class="chips-elegir">${FONDOS.map((f) => `<button type="button" class="chip-boton" data-fondo="${f}">${f ? pesosC(f) : 'Sin fondo'}</button>`).join('')}</div>
      <label class="campo" for="fondo"><span class="etiqueta-campo">Fondo de cambio</span>
        <input id="fondo" inputmode="decimal" placeholder="0.00" autocomplete="off"></label>
      <button type="submit" class="boton principal grande ancho">${icono('efectivo')}Abrir caja</button></form>` });
}
function montarAbrirCaja($c, { aviso, alAbrir }){
  const $f = $c.querySelector('[data-abrir-caja]');
  if(!$f) return;
  $f.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fondo]'); if(!b) return;
    $f.querySelector('#fondo').value = aPesos(Number(b.dataset.fondo)) || '';
    $f.querySelectorAll('[data-fondo]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = numero($f.querySelector('#fondo').value) ?? 0;
    if(Number.isNaN(f) || f < 0){ aviso('Escribe el fondo con números, o 0', 'mal'); return; }
    const b = $f.querySelector('[type=submit]'); b.setAttribute('aria-busy', 'true'); b.disabled = true;
    try{ await abrirCaja(f); aviso(`Caja abierta con ${pesos(f)}`); alAbrir(); }
    catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
  });
}

/* ── Imprimir un ticket ────────────────────────────────────────────────
   Todo lo de impresoras vive en nucleo/impresion: aquí sólo se le pasa la
   venta. Si falla, se dice por qué y la venta ya quedó hecha: el ticket se
   reimprime desde Ventas de hoy. */
async function imprimirTicket(v, { cajon = false, aviso } = {}){
  try{
    const [n, p] = await Promise.all([negocio(), yo()]);
    await imprimir({ ...v, cajero: v.cajero ?? p?.nombre, qr: v.qr ?? new URL('?negocio=' + negocioPedido() + '#/', location.href).href }, n, { cajon });
  }catch(err){
    console.error(err);
    aviso?.(`No se imprimió: ${err.message}`, 'mal');
  }
}

/* ── Escanear con la cámara (donde el navegador sabe) ──────────────────── */
export const puedeEscanear = () => 'BarcodeDetector' in self && !!navigator.mediaDevices?.getUserMedia;
export function hojaEscaner({ alLeer }){
  const d = hoja({ titulo: 'Escanear', clase: 'hoja-escaner', cuerpo: `
    <div class="visor"><video playsinline muted></video><span class="mira" aria-hidden="true"></span></div>
    <p class="nota" data-ultimo aria-live="polite">Apunta al código de barras o al QR de la etiqueta.</p>
    <button class="boton principal ancho" data-cerrar-hoja>${icono('listo')}Listo</button>` });
  const video = d.querySelector('video');
  let flujo, vivo = true, ultimo = '', cuando = 0;
  d.addEventListener('close', () => { vivo = false; flujo?.getTracks().forEach((t) => t.stop()); });
  (async () => {
    try{
      flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if(!vivo){ flujo.getTracks().forEach((t) => t.stop()); return; }
      video.srcObject = flujo; await video.play();
      const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
      const vuelta = async () => {
        if(!vivo) return;
        try{
          const [c] = await det.detect(video);
          // El mismo código pegado a la cámara no se agrega diez veces: 1.5 s de gracia.
          if(c && (c.rawValue !== ultimo || Date.now() - cuando > 1500)){
            ultimo = c.rawValue; cuando = Date.now();
            const r = alLeer(c.rawValue);
            d.querySelector('[data-ultimo]').textContent = r;
            navigator.vibrate?.(60);
          }
        }catch(e){}
        setTimeout(vuelta, 180);
      };
      vuelta();
    }catch(err){
      d.querySelector('.visor').innerHTML = `<p class="nota">${err.name === 'NotAllowedError' ? 'Sin permiso para la cámara. Actívalo en los ajustes del navegador.' : 'No se pudo abrir la cámara.'}</p>`;
    }
  })();
  return d;
}

/* ══ COBRAR ═══════════════════════════════════════════════════════════════ */

async function cobrar(){
  const [cat, caja, persona] = await Promise.all([catalogo(), miCaja(), yo()]);
  if(!caja) return { titulo: 'Cobrar', html: abrirCajaHTML(), alMontar($c, ctx){ montarAbrirCaja($c, { ...ctx, alAbrir: ctx.recargar }); } };

  const { categorias, productos, porId } = cat;
  let renglones = ticket.leer().filter((r) => porId.has(r.id));

  return {
    titulo: 'Cobrar',
    html: `<div class="pos">
      <section class="pos-catalogo" aria-label="Productos">
        <form class="pos-buscar" data-buscar>
          <label class="buscador">${icono('buscar')}
            <input id="pos-q" type="search" placeholder="Busca, o escanea con el lector" autocomplete="off" enterkeyhint="done" aria-label="Buscar producto o escanear código"></label>
          ${puedeEscanear() ? `<button type="button" class="boton secundario" data-escanear aria-label="Escanear con la cámara">${icono('escanear')}<span class="largo">Cámara</span></button>` : ''}
        </form>
        <div class="tira-cats" role="group" aria-label="Categoría">
          <button class="chip-boton" data-cat="" aria-pressed="true">Todo</button>
          ${categorias.map((c) => `<button class="chip-boton" data-cat="${esc(c.id)}" aria-pressed="false">${esc(c.nombre)}</button>`).join('')}
        </div>
        <div class="pos-rejilla" id="pos-rejilla"></div>
        <div class="botones centro"><button class="boton secundario" id="pos-mas" hidden>Ver más</button></div>
      </section>
      <aside class="pos-ticket" aria-label="Ticket" id="pos-ticket"></aside>
    </div>
    <div class="pos-barra" id="pos-barra" hidden></div>
    <p class="pos-quien">${esc(persona?.nombre || 'Caja')} · caja abierta desde las ${hora(caja.abierta)}</p>`,

    alMontar($c, { aviso, recargar }){
      const f = { q: '', cat: '' };
      let cuantos = PAGINA, ultimo = null;
      /* ¿A nombre de quién? — vale para el ticket en curso y se borra al cobrar.
         La lista se pide al entrar: si luego se va la red, sigue en memoria. */
      const aNombre = { cliente: tomarCliente() };
      const listaClientes = clientesMostrador();
      listaClientes.catch(() => {});
      const $rej = $c.querySelector('#pos-rejilla'), $mas = $c.querySelector('#pos-mas'), $q = $c.querySelector('#pos-q');
      const $ticket = $c.querySelector('#pos-ticket'), $barra = $c.querySelector('#pos-barra');

      const enTicket = (id) => renglones.find((r) => r.id === id)?.cantidad || 0;
      const totalC = () => renglones.reduce((t, r) => t + aCentavos(porId.get(r.id).p) * r.cantidad, 0);
      const piezas = () => renglones.reduce((t, r) => t + r.cantidad, 0);

      const tile = (p) => {
        const quedan = p.q - enTicket(p.id);
        return `<button class="pos-prod${quedan <= 0 ? ' sin' : ''}" data-id="${p.id}"${quedan <= 0 ? ' aria-disabled="true"' : ''}>
          ${p.f ? `<img src="${esc(p.f)}" alt="" width="64" height="64" loading="lazy" decoding="async">` : `<span class="sin-foto">${icono('caja')}</span>`}
          <span class="n">${esc(p.n)}</span>
          <span class="pie"><b>${pesos(p.p)}</b><small>${quedan <= 0 ? 'Agotado' : `${quedan} disp.`}</small></span>
          ${enTicket(p.id) ? `<span class="en-ticket" aria-label="${enTicket(p.id)} en el ticket">${enTicket(p.id)}</span>` : ''}
        </button>`;
      };
      const pintarRejilla = () => {
        const vistos = filtrar(productos.filter((p) => !f.cat || p.c === f.cat), f.q, (p) => `${p.n} ${p.m} ${p.sku || ''} ${p.cb || ''}`);
        $rej.innerHTML = vistos.length ? (vistos.parecido ? `<p class="nota pos-parecido" data-parecido>Nada escrito así; lo que más se parece a «${esc(f.q.trim())}»:</p>` : '') + vistos.slice(0, cuantos).map(tile).join('')
          : `<p class="nota">Nada con «${esc(f.q)}».</p>`;
        $mas.hidden = vistos.length <= cuantos;
      };

      const renglonHTML = (r) => {
        const p = porId.get(r.id);
        return `<li class="pos-renglon${r.id === ultimo ? ' recien' : ''}">
          <span class="texto"><strong>${esc(p.n)}</strong><small>${pesos(p.p)} c/u</small></span>
          <span class="cantidad">
            <button type="button" data-menos="${r.id}" aria-label="Una menos de ${esc(p.n)}">${icono(r.cantidad === 1 ? 'borrar' : 'menos')}</button>
            <output>${r.cantidad}</output>
            <button type="button" data-mas="${r.id}" aria-label="Una más de ${esc(p.n)}"${r.cantidad >= p.q ? ' disabled' : ''}>${icono('mas')}</button>
          </span>
          <b class="importe">${pesosC(aCentavos(p.p) * r.cantidad)}</b>
        </li>`;
      };
      const ticketHTML = () => renglones.length ? `
        <header class="pos-ticket-cabeza"><h2>Ticket</h2><button class="boton fantasma" data-vaciar>${icono('borrar')}Vaciar</button></header>
        <ul class="pos-renglones">${renglones.map(renglonHTML).join('')}</ul>
        <div class="pos-total"><span>${plural(piezas(), 'pieza', 'piezas')}</span><strong>${pesosC(totalC())}</strong></div>
        <button class="boton principal grande ancho" data-cobrar>${icono('efectivo')}Cobrar ${pesosC(totalC())}</button>`
        : `<div class="pos-vacio">${icono('ticket')}<p>Toca un producto o escanea su código para empezar.</p></div>`;

      const pintarTicket = () => {
        ticket.guardar(renglones);
        $ticket.innerHTML = ticketHTML();
        $barra.hidden = !renglones.length;
        $barra.classList.remove('recien'); if(ultimo){ void $barra.offsetWidth; $barra.classList.add('recien'); }
        $barra.innerHTML = renglones.length ? `<button class="boton principal grande ancho" data-ver-ticket>
          <span>${plural(piezas(), 'pieza', 'piezas')}</span><strong>${pesosC(totalC())}</strong><span>Cobrar ${icono('adelante')}</span></button>` : '';
        document.querySelector('.hoja-ticket .hoja-cuerpo')?.replaceChildren(...(() => { const t = document.createElement('div'); t.innerHTML = ticketHTML(); return [...t.childNodes]; })());
      };
      const pintar = () => { pintarRejilla(); pintarTicket(); ultimo = null; };

      const agregar = (id, n = 1) => {
        const p = porId.get(id); if(!p) return false;
        const ya = enTicket(id);
        if(ya + n > p.q){ aviso(p.q <= 0 ? `«${p.n}» está agotado` : `Sólo hay ${p.q} de «${p.n}»`, 'mal'); return false; }
        const r = renglones.find((x) => x.id === id);
        if(r) r.cantidad += n; else renglones.push({ id, cantidad: n });
        // Sin aviso flotante: el ticket ya lo enseña. Un destello en el renglón
        // (o en la barra, en teléfono) dice «entró» sin tapar nada.
        ultimo = id;
        pintar();
        return true;
      };

      /* Del código a un producto: código de barras, SKU, o el QR de la etiqueta. */
      const deCodigo = (texto) => {
        const t = texto.trim();
        const qr = /#\/p\/([0-9a-f-]{36})/i.exec(t)?.[1];
        return (qr && porId.get(qr)) || productos.find((p) => p.cb && p.cb === t) || productos.find((p) => p.sku && quitaAcentos(p.sku) === quitaAcentos(t)) || null;
      };

      $c.querySelector('[data-buscar]').addEventListener('submit', (e) => {
        e.preventDefault();
        const t = $q.value.trim(); if(!t) return;
        const p = deCodigo(t);
        if(p){ agregar(p.id); $q.value = ''; f.q = ''; pintarRejilla(); return; }
        // Si la búsqueda deja uno solo, Enter lo agrega.
        // Sólo lo que está escrito así: Enter no agrega una adivinanza por parecido.
        const hallados = filtrar(productos, t, (x) => `${x.n} ${x.m}`), uno = hallados.parecido ? [] : hallados;
        if(uno.length === 1){ agregar(uno[0].id); $q.value = ''; f.q = ''; pintarRejilla(); }
        else aviso(uno.length ? `${uno.length} coinciden: toca el que es` : hallados.length ? 'No está escrito así: toca el que es' : `No hay nada con «${t}»`, uno.length || hallados.length ? '' : 'mal');
      });
      $q.addEventListener('input', () => { f.q = $q.value; cuantos = PAGINA; pintarRejilla(); });
      $mas.addEventListener('click', () => { cuantos += PAGINA; pintarRejilla(); });

      const clic = (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.id){ if(b.getAttribute('aria-disabled') !== 'true') agregar(b.dataset.id); else aviso('Agotado', 'mal'); }
        else if(b.dataset.cat !== undefined){
          f.cat = b.dataset.cat; cuantos = PAGINA;
          $c.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
          pintarRejilla();
        }
        else if(b.dataset.mas) agregar(b.dataset.mas);
        else if(b.dataset.menos){
          const r = renglones.find((x) => x.id === b.dataset.menos);
          r.cantidad--; if(r.cantidad <= 0) renglones = renglones.filter((x) => x !== r);
          pintar();
        }
        else if(b.matches('[data-vaciar]')){ if(confirm('¿Vaciar el ticket?')){ renglones = []; pintar(); } }
        else if(b.matches('[data-cobrar]')) hojaCobro();
        else if(b.matches('[data-ver-ticket]')){
          const d = hoja({ titulo: 'Ticket', clase: 'hoja-ticket', cuerpo: ticketHTML() });
          d.addEventListener('click', clic);
        }
        else if(b.matches('[data-escanear]')) hojaEscaner({ alLeer(codigo){
          const p = deCodigo(codigo);
          if(!p) return `No encontré el código ${codigo}`;
          return agregar(p.id) ? `+1 ${p.n} · llevas ${plural(piezas(), 'pieza', 'piezas')}, ${pesosC(totalC())}` : `No se agregó ${p.n}`;
        } });
      };
      $c.addEventListener('click', clic);

      /* Cobro */
      const hojaCobro = () => {
        document.querySelector('dialog.hoja-ticket')?.close();
        const total = totalC();
        let metodo = 'efectivo';
        const d = hoja({ titulo: `Cobrar ${pesosC(total)}`, clase: 'hoja-cobro', cuerpo: `
          <form data-cobro novalidate>
            <div class="cobro-cliente" data-a-nombre></div>
            <p class="cobro-total"><span>Total</span><strong>${pesosC(total)}</strong></p>
            <div class="segmentos" role="group" aria-label="Forma de pago">${['efectivo', 'tarjeta', 'transferencia'].map((m) =>
              `<button type="button" data-metodo="${m}" aria-pressed="${m === metodo}">${icono(m)}${METODOS[m]}</button>`).join('')}</div>
            <div data-efectivo>
              <label class="campo" for="recibi"><span class="etiqueta-campo">¿Con cuánto paga?</span>
                <input id="recibi" inputmode="decimal" autocomplete="off" placeholder="${aPesos(total)}"></label>
              <div class="chips-elegir billetes">${sugerirPagos(total).map((x) =>
                `<button type="button" class="chip-boton" data-recibi="${x}">${x === total ? 'Exacto' : pesosC(x)}</button>`).join('')}</div>
              <div class="cambio" aria-live="polite" data-cambio></div>
            </div>
            <p class="nota" data-otro hidden>Cobra en la terminal o revisa la transferencia, y confirma aquí cuando haya pasado.</p>
            <button type="submit" class="boton principal grande ancho" data-confirmar>${icono('listo')}Cobrar ${pesosC(total)}</button>
          </form>` });
        montarANombre(d.querySelector('[data-a-nombre]'), { lista: () => listaClientes, estado: aNombre, aviso });
        const $r = d.querySelector('#recibi'), $cambio = d.querySelector('[data-cambio]'), $ok = d.querySelector('[data-confirmar]');
        const recibido = () => { const n = numero($r.value); return n == null ? total : Number.isNaN(n) ? NaN : aCentavos(n); };
        const repintar = () => {
          d.querySelector('[data-efectivo]').hidden = metodo !== 'efectivo';
          d.querySelector('[data-otro]').hidden = metodo === 'efectivo';
          d.querySelectorAll('[data-metodo]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.metodo === metodo));
          if(metodo !== 'efectivo'){ $ok.disabled = false; return; }
          const r = recibido();
          d.querySelectorAll('[data-recibi]').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.recibi) === r && $r.value !== ''));
          if(Number.isNaN(r)){ $cambio.innerHTML = '<p class="falta">Eso no es una cantidad.</p>'; $ok.disabled = true; return; }
          if(r < total){ $cambio.innerHTML = `<p class="falta">Faltan ${pesosC(total - r)}</p>`; $ok.disabled = true; return; }
          // Un dedo que se resbala en el cero: 99,999,999 por un champú de 300
          // daba un cambio de millones con su desglose en billetes. Nadie paga
          // con más de $20,000 de cambio en un mostrador.
          if(r - total > 2000000){ $cambio.innerHTML = '<p class="falta">Eso es demasiado para un pago. Revisa la cantidad.</p>'; $ok.disabled = true; return; }
          const c = r - total, dz = desglose(c);
          $cambio.innerHTML = c ? `<p class="cambio-grande"><span>Cambio</span><strong>${pesosC(c)}</strong></p>
            <p class="nota">Da: ${dz.piezas.map((x) => `${x.piezas} de ${pesosC(x.valor)}`).join(', ')}${dz.resto ? ` y ${dz.resto} centavos` : ''}</p>`
            : '<p class="cambio-grande"><span>Cambio</span><strong>$0</strong></p>';
          $ok.disabled = false;
        };
        d.addEventListener('click', (e) => {
          const b = e.target.closest('button'); if(!b) return;
          if(b.dataset.metodo){ metodo = b.dataset.metodo; repintar(); }
          if(b.dataset.recibi){ $r.value = aPesos(Number(b.dataset.recibi)); repintar(); }
        });
        $r.addEventListener('input', repintar);
        repintar();
        setTimeout(() => $r.focus(), 60);

        d.querySelector('[data-cobro]').addEventListener('submit', async (e) => {
          e.preventDefault();
          if($ok.disabled) return;
          const r = metodo === 'efectivo' ? recibido() : total;
          const vendidos = renglones.map((x) => ({ ...x, nombre: porId.get(x.id).n, precio: porId.get(x.id).p }));
          $ok.setAttribute('aria-busy', 'true'); $ok.disabled = true;
          try{
            const cliente = aNombre.cliente;
            const v = await venderMostrador({ renglones: vendidos, caja: caja.id, cliente: cliente?.id, cobro: { metodo, recibido: aPesos(r) } });
            aNombre.cliente = null;
            // Lo vendido sale de lo que se ve, sin esperar a recargar.
            vendidos.forEach((x) => { const p = porId.get(x.id); p.q -= x.cantidad; p.x = p.q <= 0; });
            renglones = []; pintar();
            const venta = { folio: v.folio, total: Number(v.total), metodo, recibido: aPesos(r), cambio: v.cambio == null ? 0 : Number(v.cambio),
              renglones: vendidos.map((x) => ({ ...x, importe: x.precio * x.cantidad })), cuando: Date.now(), cliente: cliente?.nombre || null };
            const c = aCentavos(venta.cambio), dz = desglose(c);
            d.querySelector('.hoja-cabeza h2').textContent = v.pendiente ? `Venta ${v.folio} · sin red` : `Venta #${v.folio}`;
            d.querySelector('.hoja-cuerpo').innerHTML = `<div class="venta-hecha">
              <span class="circulo">${icono('listo')}</span>
              <p class="cambio-grande"><span>${c ? 'Cambio' : 'Cobrado'}</span><strong>${c ? pesosC(c) : pesos(venta.total)}</strong></p>
              ${c ? `<p class="nota">Da: ${dz.piezas.map((x) => `${x.piezas} de ${pesosC(x.valor)}`).join(', ')}${dz.resto ? ` y ${dz.resto} centavos` : ''}</p>` : ''}
              ${cliente ? `<p class="nota a-nombre">${icono('cliente')}A nombre de <b>${esc(cliente.nombre || 'cliente')}</b></p>` : ''}
              ${v.pendiente ? `<p class="aviso-linea">${icono('info')}<span>No hay internet: la venta quedó guardada en este teléfono y se sube sola en cuanto vuelva la red. No cierres sesión ni borres los datos del navegador mientras tanto.</span></p>` : ''}
              <div class="botones">
                <button class="boton secundario" data-imprimir>${icono('imprimir')}Imprimir ticket</button>
                <button class="boton principal" data-cerrar-hoja>${icono('agregar')}Nueva venta</button></div></div>`;
            d.querySelector('[data-imprimir]').addEventListener('click', () => imprimirTicket(venta, { aviso }));
            // Configurada para imprimir sola: sale el ticket, y en efectivo se abre el cajón.
            const conf = leerConf();
            if(conf.automatico) imprimirTicket(venta, { cajon: metodo === 'efectivo', aviso });
            else if(conf.cajon && metodo === 'efectivo' && conf.conexion !== 'navegador') abrirCajon(conf).catch((err) => aviso(`El cajón no abrió: ${err.message}`, 'mal'));
            d.addEventListener('close', () => $q.focus(), { once: true });
          }catch(err){
            console.error(err);
            aviso(err.message, 'mal');
            $ok.removeAttribute('aria-busy'); $ok.disabled = false;
            if(/alcanzan|ya no est/i.test(err.message)){ olvidarCatalogo(); d.close(); recargar(); }
          }
        });
      };

      pintar();
      $q.focus({ preventScroll: true });
    },
  };
}

/* ══ CAJA ═════════════════════════════════════════════════════════════════ */

/* `devuelto` (centavos): efectivo de devoluciones que el servidor todavía no
   descuenta solo (0011 sin aplicar). Se resta aquí y se dice. */
function cuadreHTML(r, devuelto = 0){
  if(devuelto) r = { ...r, esperado: r.esperado - devuelto / 100, diferencia: undefined };
  const dif = aCentavos(r.diferencia ?? (r.contado - r.esperado));
  const clase = dif === 0 ? 'bien' : dif > 0 ? 'ojo' : 'mal';
  return `<div class="cuadre ${clase}">
    <p class="cuadre-veredicto">${dif === 0 ? 'Cuadró exacto' : dif > 0 ? `Sobran ${pesosC(dif)}` : `Faltan ${pesosC(-dif)}`}</p>
    <dl><dt>Debía haber</dt><dd>${pesos(r.esperado)}</dd><dt>Contaste</dt><dd>${pesos(r.contado)}</dd></dl>
    ${devuelto ? `<p class="nota">Ya descuenta ${pesosC(devuelto)} que salieron del cajón por devoluciones.</p>` : ''}</div>`;
}

async function cajaPantalla(){
  const [caja, historial] = await Promise.all([miCaja(), cajasCerradas(8).catch(() => [])]);
  const histHTML = historial.length ? `<section class="seccion"><header><h2>Cortes anteriores</h2></header>
    <ul class="lista">${historial.map((h, i) => {
      const dif = aCentavos(Number(h.contado) - Number(h.esperado));
      return `<li class="fila"><span class="texto"><strong>${esc(fecha(h.cerrada))}</strong>
        <small>${esc(h.quien?.nombre || '')} · abrió ${hora(h.abierta)} · debía ${pesos(h.esperado)}${h.nota ? ` · «${esc(h.nota)}»` : ''}</small></span>
        <span class="chip ${dif === 0 ? 'bien' : dif > 0 ? 'ojo' : 'mal'}">${dif === 0 ? 'Cuadró' : dif > 0 ? `+${pesosC(dif)}` : `−${pesosC(-dif)}`}</span>
        <button class="boton-ico" data-reimprimir-corte="${i}" aria-label="Volver a imprimir el corte del ${esc(fecha(h.cerrada))}" title="Imprimir otra vez">${icono('imprimir')}</button></li>`;
    }).join('')}</ul></section>` : '';

  // Lo vendido sin red que todavía no llega al servidor (nucleo/fila.js).
  const pend = filaMostrador.pendientes(), rech = filaMostrador.rechazadas();
  const filaHTML = pend.length || rech.length ? `<section class="seccion"><header><h2>Ventas hechas sin internet</h2></header>
    ${pend.length ? `<p class="aviso-linea">${icono('reloj')}<span>${plural(pend.length, 'venta espera', 'ventas esperan')} a que vuelva la red (${pesos(pend.reduce((t, v) => t + v.total, 0))}). Se suben solas; el corte no las cuenta hasta entonces.</span></p>
      <div class="botones"><button class="boton secundario" data-subir>${icono('actualizar')}Intentar subir ahora</button></div>` : ''}
    ${rech.length ? `<p class="nota">El servidor no aceptó ${rech.length === 1 ? 'una' : rech.length} (casi siempre porque la última pieza se vendió en línea mientras no había red). No se borran: cóbralas o ajusta el inventario a mano.</p>
      <ul class="lista">${rech.map((v) => `<li class="fila"><span class="texto"><strong>${esc(v.folio)} · ${pesos(v.total)}</strong>
        <small>${esc(fecha(v.cuando))} · ${esc(v.renglones.map((r) => `${r.cantidad} × ${r.nombre}`).join(', '))}</small><small>${esc(v.error)}</small></span>
        <button class="boton secundario" data-descartar="${esc(v.id)}">Ya lo resolví</button></li>`).join('')}</ul>` : ''}
  </section>` : '';
  const montarFila = ($c, { aviso, recargar }) => $c.addEventListener('click', async (e) => {
    const rc = e.target.closest('[data-reimprimir-corte]');
    if(rc){
      // Del corte viejo sólo se guardó lo del cajón: debía, contó y la nota.
      const h = historial[Number(rc.dataset.reimprimirCorte)]; rc.setAttribute('aria-busy', 'true');
      try{ await imprimirCorte({ abierta: h.abierta, cerrada: h.cerrada, cajero: h.quien?.nombre, esperado: Number(h.esperado), contado: Number(h.contado), nota: h.nota, reimpresion: true }, await negocio()); }
      catch(err){ console.error(err); aviso(`No se imprimió: ${err.message}`, 'mal'); }
      finally{ rc.removeAttribute('aria-busy'); }
      return;
    }
    const b = e.target.closest('[data-subir], [data-descartar]'); if(!b) return;
    if(b.dataset.descartar){ if(confirm('¿Ya la cobraste o ajustaste el inventario? Se quita de esta lista.')){ filaMostrador.quitar(b.dataset.descartar); recargar(); } return; }
    b.setAttribute('aria-busy', 'true'); b.disabled = true;
    const r = await subirVentasPendientes().catch((err) => ({ subidas: [], rechazadas: [], cortada: true, err }));
    aviso(r.cortada && !r.subidas.length ? 'Todavía no hay red' : `Se ${r.subidas.length === 1 ? 'subió 1' : `subieron ${r.subidas.length}`}`, r.cortada && !r.subidas.length ? 'mal' : undefined);
    recargar();
  });

  if(!caja) return { html: abrirCajaHTML() + filaHTML + histHTML, alMontar($c, ctx){ montarAbrirCaja($c, { ...ctx, alAbrir: ctx.recargar }); montarFila($c, ctx); } };

  const [cobros, devuelto] = await Promise.all([cobrosDeCaja(caja.id), efectivoDevueltoEnCaja(caja).catch((e) => { console.error(e); return 0; })]);
  const por = (m) => cobros.filter((c) => c.metodo === m).reduce((t, c) => t + aCentavos(c.monto), 0);
  const ef = por('efectivo'), fondo = aCentavos(caja.fondo), debe = fondo + ef - devuelto;
  const tickets = new Set(cobros.map((c) => c.pedido_id)).size;

  const filaConteo = (d) => `<li class="conteo-fila"><span class="denom">${pesosC(d)}</span>
    <span class="cantidad"><button type="button" data-baja="${d}" aria-label="Una menos de ${pesosC(d)}">${icono('menos')}</button>
      <input inputmode="numeric" data-den="${d}" value="" placeholder="0" aria-label="Cuántas de ${pesosC(d)}">
      <button type="button" data-sube="${d}" aria-label="Una más de ${pesosC(d)}">${icono('mas')}</button></span>
    <b class="sub" data-sub="${d}">$0</b></li>`;

  return {
    html: `
      <div class="cifras">
        <div class="cifra-caja"><span class="valor">${hora(caja.abierta)}</span><span class="etq">abrió</span></div>
        <div class="cifra-caja"><span class="valor">${tickets}</span><span class="etq">tickets</span></div>
        <div class="cifra-caja"><span class="valor">${pesosR(ef)}</span><span class="etq">en efectivo</span></div>
        <div class="cifra-caja"><span class="valor">${pesosR(por('tarjeta') + por('transferencia'))}</span><span class="etq">tarjeta y transferencia</span></div>
      </div>
      <section class="tarjeta bloque-form">
        <header class="cabeza-cierre"><h2>Cerrar caja</h2>
          <button type="button" class="boton secundario" data-abrir-cajon>${icono('efectivo')}Abrir cajón</button></header>
        <p class="nota">Cuenta el cajón por billete y moneda. Primero cuenta y luego compara: así el corte es honesto.</p>
        <form data-cerrar novalidate>
          <h3>Billetes</h3><ul class="conteo">${BILLETES.map(filaConteo).join('')}</ul>
          <h3>Monedas</h3><ul class="conteo">${MONEDAS.map(filaConteo).join('')}</ul>
          <p class="cobro-total"><span>Contaste</span><strong data-contado>$0</strong></p>
          <details class="plegable"><summary>Ver cuánto debe haber</summary>
            <p>Fondo ${pesosC(fondo)} + efectivo cobrado ${pesosC(ef)}${devuelto ? ` − devoluciones ${pesosC(devuelto)}` : ''} = <strong>${pesosC(debe)}</strong></p></details>
          <label class="campo" for="nota-caja"><span class="etiqueta-campo">Nota (si algo no cuadra, di por qué)</span>
            <input id="nota-caja" maxlength="200" autocomplete="off"></label>
          <button type="submit" class="boton principal grande ancho">${icono('listo')}Cerrar caja</button>
        </form>
      </section>
      ${filaHTML}
      ${histHTML}`,

    alMontar($c, { aviso, recargar }){
      montarFila($c, { aviso, recargar });
      $c.querySelector('[data-abrir-cajon]').addEventListener('click', async (e) => {
        try{ await abrirCajon(); aviso('Cajón abierto'); }catch(err){ aviso(err.message, 'mal'); }
      });
      const $f = $c.querySelector('[data-cerrar]');
      const conteo = () => Object.fromEntries([...$f.querySelectorAll('[data-den]')].map((i) => [i.dataset.den, Number.parseInt(i.value, 10) || 0]));
      const repintar = () => {
        const c = conteo();
        for(const [d, n] of Object.entries(c)) $f.querySelector(`[data-sub="${d}"]`).textContent = pesosC(Number(d) * n);
        $f.querySelector('[data-contado]').textContent = pesosC(contar(c));
      };
      $f.addEventListener('input', repintar);
      $f.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if(!b) return;
        const d = b.dataset.sube || b.dataset.baja; if(!d) return;
        const i = $f.querySelector(`[data-den="${d}"]`);
        i.value = Math.max(0, (Number.parseInt(i.value, 10) || 0) + (b.dataset.sube ? 1 : -1)) || '';
        repintar();
      });
      $f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const total = contar(conteo());
        const faltan = filaMostrador.pendientes().length;
        if(faltan && !confirm(`Hay ${plural(faltan, 'venta hecha', 'ventas hechas')} sin internet que todavía no se suben: el corte no las va a contar. ¿Cerrar de todos modos?`)) return;
        if(!total && !confirm('Contaste $0. ¿Cerrar así?')) return;
        const b = $f.querySelector('[type=submit]'); b.setAttribute('aria-busy', 'true'); b.disabled = true;
        try{
          const r = await cerrarCaja(aPesos(total), $f.querySelector('#nota-caja').value.trim());
          const corte = { ...r, esperado: Number(r.esperado), contado: Number(r.contado) };
          const contado = conteo();
          $c.innerHTML = estado({ icono: 'efectivo', titulo: 'Caja cerrada', extra: cuadreHTML(corte, devuelto),
            botones: `<button class="boton principal" data-imprimir-corte>${icono('imprimir')}Imprimir corte</button>
              <a class="boton secundario" href="${enlace('/v/ventas')}">${icono('reportes')}Ver las ventas de hoy</a>
              <a class="boton secundario" href="${enlace('/v/caja')}">Abrir otra caja</a>` });
          aviso('Caja cerrada');
          // El papel que se engrapa al dinero: lo que debía haber, lo que se contó y por qué billete.
          const papel = { abierta: caja.abierta, cerrada: new Date().toISOString(), cajero: (await yo().catch(() => null))?.nombre, tickets,
            fondo: fondo / 100, efectivo: ef / 100, devuelto: devuelto / 100, tarjeta: por('tarjeta') / 100, transferencia: por('transferencia') / 100,
            esperado: corte.esperado - devuelto / 100, contado: corte.contado, nota: $f.querySelector('#nota-caja')?.value.trim(), conteo: contado };
          $c.querySelector('[data-imprimir-corte]').addEventListener('click', async (ev) => {
            const bt = ev.currentTarget; bt.setAttribute('aria-busy', 'true');
            try{ await imprimirCorte(papel, await negocio()); }
            catch(err){ console.error(err); aviso(`No se imprimió: ${err.message}`, 'mal'); }
            finally{ bt.removeAttribute('aria-busy'); }
          });
        }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
      });
    },
  };
}

/* ══ VENTAS DE HOY ════════════════════════════════════════════════════════ */

const inicioDelDia = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const PAGINA_TICKETS = 20;
async function ventasHoy(){
  const hoy = inicioDelDia();
  const semanaPasada = new Date(hoy); semanaPasada.setDate(hoy.getDate() - 7);
  const ahora = new Date(), mismaHora = new Date(semanaPasada.getTime() + (ahora - hoy));
  const [ventas, antes] = await Promise.all([ventasDesde(hoy), ventasDesde(semanaPasada).catch(() => [])]);
  const comparable = antes.filter((v) => new Date(v.creado) < mismaHora && new Date(v.creado) >= semanaPasada);
  const f = { canal: 'todos', q: '', cuantos: PAGINA_TICKETS };
  const CANALES = [['todos', 'Todo'], ['pos', 'Mostrador'], ['tienda', 'En línea'], ['bot', 'WhatsApp']];
  const DIA = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(semanaPasada);

  return {
    html: `<div class="segmentos" role="group" aria-label="Canal">${CANALES.map(([k, t]) => `<button data-canal="${k}" aria-pressed="${k === f.canal}">${t}</button>`).join('')}</div>
      <div id="ventas"></div>`,
    alMontar($c, { aviso }){
      const $v = $c.querySelector('#ventas');
      const pintar = () => {
        const vs = ventas.filter((v) => f.canal === 'todos' || v.canal === f.canal);
        const comp = comparable.filter((v) => f.canal === 'todos' || v.canal === f.canal);
        const total = vs.reduce((t, v) => t + aCentavos(v.total), 0), totalAntes = comp.reduce((t, v) => t + aCentavos(v.total), 0);
        const piezas = vs.reduce((t, v) => t + v.renglones.reduce((s, r) => s + r.cantidad, 0), 0);
        if(!vs.length){
          $v.innerHTML = estado({ icono: 'reportes', titulo: 'Todavía no hay ventas hoy',
            texto: totalAntes ? `El ${DIA} pasado a esta hora llevabas ${pesosC(totalAntes)}.` : 'La primera venta aparece aquí al momento.',
            botones: `<a class="boton principal" href="${enlace('/v')}">${icono('venta')}Ir a cobrar</a>` });
          return;
        }
        const vs_ = totalAntes ? Math.round((total - totalAntes) / totalAntes * 100) : null;
        // Por hora, de la primera a la última hora con venta (mínimo 8 a 20).
        const horas = new Map();
        vs.forEach((v) => { const h = new Date(v.creado).getHours(); horas.set(h, (horas.get(h) || 0) + aCentavos(v.total)); });
        const desde = Math.min(8, ...horas.keys()), hasta = Math.max(20, ...horas.keys());
        const tope = Math.max(...horas.values());
        const barras = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).map((h) =>
          `<li style="--alto:${Math.round((horas.get(h) || 0) / tope * 100)}%" title="${h}:00 · ${pesosC(horas.get(h) || 0)}">
            <span class="barra" aria-hidden="true"></span><span class="h">${h}</span>
            <span class="solo-lectores">${h}:00, ${pesosC(horas.get(h) || 0)}</span></li>`).join('');
        const fuerte = [...horas.entries()].sort((a, b) => b[1] - a[1])[0];
        // Lo más vendido
        const top = new Map();
        vs.forEach((v) => v.renglones.forEach((r) => { const t = top.get(r.nombre) || { piezas: 0, importe: 0 }; t.piezas += r.cantidad; t.importe += aCentavos(r.importe); top.set(r.nombre, t); }));
        const tops = [...top.entries()].sort((a, b) => b[1].piezas - a[1].piezas || b[1].importe - a[1].importe).slice(0, 8);
        // Formas de pago
        const pago = new Map();
        vs.forEach((v) => { const k = v.pagado ? (v.forma_pago || 'efectivo') : 'pendiente'; pago.set(k, (pago.get(k) || 0) + aCentavos(v.total)); });

        $v.innerHTML = `
          <div class="cifras">
            <div class="cifra-caja"><span class="valor">${pesosR(total)}</span><span class="etq">vendido${vs_ != null ? ` · <b class="${vs_ >= 0 ? 'sube' : 'baja'}">${vs_ >= 0 ? '+' : ''}${vs_} %</b> vs. el ${DIA} pasado` : ''}</span></div>
            <div class="cifra-caja"><span class="valor">${vs.length}</span><span class="etq">tickets</span></div>
            <div class="cifra-caja"><span class="valor">${pesosR(Math.round(total / vs.length))}</span><span class="etq">ticket promedio</span></div>
            <div class="cifra-caja"><span class="valor">${piezas}</span><span class="etq">piezas</span></div>
          </div>
          <section class="seccion"><header><h2>Por hora</h2></header>
            <p class="nota">La hora fuerte: de ${fuerte[0]} a ${fuerte[0] + 1}, con ${pesosC(fuerte[1])}.</p>
            <ol class="grafica-horas">${barras}</ol></section>
          <div class="dos-col">
            <section class="seccion"><header><h2>Lo que más se llevan</h2></header>
              <ol class="lista top">${tops.map(([n, t], i) => `<li class="fila"><span class="lugar">${i + 1}</span>
                <span class="texto"><strong>${esc(n)}</strong><small>${plural(t.piezas, 'pieza', 'piezas')}</small></span><b>${pesosC(t.importe)}</b></li>`).join('')}</ol></section>
            <section class="seccion"><header><h2>Cómo pagaron</h2></header>
              <ul class="lista">${[...pago.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => `<li class="fila">
                <span class="circulo-chico">${icono(k === 'pendiente' ? 'reloj' : k === 'pasarela' ? 'tarjeta' : k)}</span>
                <span class="texto"><strong>${esc(k === 'pendiente' ? 'Por cobrar' : METODOS[k] || k)}</strong><small>${Math.round(c / total * 100)} %</small></span><b>${pesosC(c)}</b></li>`).join('')}</ul></section>
          </div>
          <section class="seccion"><header><h2>Tickets</h2><button class="boton fantasma" data-csv>${icono('importar')}Descargar</button></header>
            <label class="buscador">${icono('buscar')}
              <input type="search" id="q-ticket" placeholder="Folio o producto" value="${esc(f.q)}" autocomplete="off" aria-label="Buscar ticket"></label>
            <div id="tickets" class="con-margen"></div></section>`;
        pintarTickets();
      };
      /* Con 133 tickets la lista medía 60 pantallas de teléfono. Se enseñan de
         20 en 20 y se buscan por folio o por producto; la lista va aparte para
         que escribir en el buscador no lo repinte (y le quite el foco). */
      const pintarTickets = () => {
        const q = quitaAcentos(f.q.trim()).replace(/^#/, '');
        const vs = ventas.filter((v) => (f.canal === 'todos' || v.canal === f.canal)
          && (!q || String(v.folio) === q || String(v.folio).startsWith(q) || v.renglones.some((r) => quitaAcentos(r.nombre).includes(q))));
        const $t = $c.querySelector('#tickets'); if(!$t) return;
        $t.innerHTML = !vs.length ? `<p class="nota" data-sin-tickets>Ningún ticket de hoy tiene «${esc(f.q)}».</p>` : `
          <ul class="lista">${vs.slice(0, f.cuantos).map((v) => `<li><button class="fila" data-ticket="${v.id}">
              <span class="texto"><strong>#${v.folio} · ${hora(v.creado)}</strong>
                <small>${plural(v.renglones.reduce((s, r) => s + r.cantidad, 0), 'pieza', 'piezas')} · ${esc(v.pagado ? METODOS[v.forma_pago] || '' : 'por cobrar')} · ${esc({ pos: 'mostrador', tienda: 'en línea', bot: 'WhatsApp' }[v.canal] || v.canal)}</small></span>
              <b>${pesos(v.total)}</b></button></li>`).join('')}</ul>
          ${vs.length > f.cuantos ? `<div class="botones centro con-margen"><button class="boton secundario" data-mas-tickets>Ver ${Math.min(PAGINA_TICKETS, vs.length - f.cuantos)} más · quedan ${vs.length - f.cuantos}</button></div>` : ''}`;
      };
      $c.addEventListener('input', (e) => { if(e.target.id === 'q-ticket'){ f.q = e.target.value; f.cuantos = PAGINA_TICKETS; pintarTickets(); } });

      $c.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.matches('[data-mas-tickets]')){ f.cuantos += PAGINA_TICKETS; pintarTickets(); }
        if(b.dataset.canal){ f.canal = b.dataset.canal; f.cuantos = PAGINA_TICKETS; $c.querySelectorAll('[data-canal]').forEach((x) => x.setAttribute('aria-pressed', x === b)); pintar(); }
        if(b.dataset.ticket){
          const v = ventas.find((x) => x.id === b.dataset.ticket), c = v.cobros?.[0];
          const d = hoja({ titulo: `Ticket #${v.folio}`, cuerpo: `
            <p class="nota">${esc(fecha(v.creado))}</p>
            <ul class="movimientos">${v.renglones.map((r) => `<li><span class="delta mas">${r.cantidad}</span>
              <span class="texto"><strong>${esc(r.nombre)}</strong><small>${pesos(r.precio)} c/u</small></span><b>${pesos(r.importe)}</b></li>`).join('')}</ul>
            <p class="cobro-total"><span>Total</span><strong>${pesos(v.total)}</strong></p>
            ${c ? `<p class="nota">${esc(METODOS[c.metodo] || c.metodo)}${c.recibido ? ` · recibió ${pesos(c.recibido)}` : ''}${Number(c.cambio) ? ` · cambio ${pesos(c.cambio)}` : ''}</p>` : '<p class="nota">Por cobrar</p>'}
            <button class="boton secundario ancho" data-reimprimir>${icono('imprimir')}Imprimir ticket</button>` });
          d.querySelector('[data-reimprimir]').addEventListener('click', () => imprimirTicket({ folio: v.folio, total: v.total, renglones: v.renglones, reimpresion: true,
            metodo: c?.metodo, recibido: c?.recibido != null ? Number(c.recibido) : null, cambio: Number(c?.cambio || 0), cuando: v.creado }, { aviso }));
        }
        if(b.matches('[data-csv]')) descargarCSV(`ventas-${new Date().toISOString().slice(0, 10)}.csv`, [
          ['Folio', 'Hora', 'Canal', 'Producto', 'Cantidad', 'Precio', 'Importe', 'Forma de pago', 'Pagado'],
          ...ventas.flatMap((v) => v.renglones.map((r) => [v.folio, hora(v.creado), v.canal, r.nombre, r.cantidad, r.precio, r.importe, v.forma_pago || '', v.pagado ? 'Sí' : 'No'])),
        ]);
      });
      pintar();
    },
  };
}

export const PANTALLAS = { cobrar, caja: cajaPantalla, ventasHoy };
