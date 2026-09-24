/* ══════════════════════════════════════════════════════════════════════════
   CONVERSACIONES · Bloque 10, el lado del dueño
   ──────────────────────────────────────────────────────────────────────────
   Tres cosas en una pantalla:
     1. El SIMULADOR: el dueño le escribe al bot como si fuera un cliente, y ve
        exactamente lo que contestaría con el catálogo y los ajustes de hoy.
        No manda nada a ningún lado.
     2. LO QUE EL BOT SABE: qué datos del negocio tiene y cuáles faltan. Cada
        uno que falta es una pregunta que el bot va a pasar a una persona.
     3. La BANDEJA: las conversaciones de verdad, cuando el bot esté conectado
        a WhatsApp, con «lo tomo yo».
   El cerebro vive en nucleo/bot.js (43 pruebas): nunca inventa un precio.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, fecha } from '../nucleo/piezas.js';
import { negocio, catalogo, carrito, conversaciones, tomarConversacion } from '../nucleo/datos.js';
import { responder } from '../nucleo/bot.js';

const LLAVE = 'tienda-simulador-bot';
const SUGERENCIAS = ['Hola', '¿Tienen cera?', '¿Cuánto es el envío?', 'Quiero 2 navajas', '¿Qué ofertas hay?', '¿A qué hora abren?', 'Es todo', 'Quiero hablar con una persona'];
const HORA = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' });

const leer = () => { try{ return JSON.parse(sessionStorage.getItem(LLAVE)) || null; }catch(e){ return null; } };
const guardar = (v) => { try{ sessionStorage.setItem(LLAVE, JSON.stringify(v)); }catch(e){} };

/* Qué sabe el bot del negocio. Lo que falta, lo pasa a una persona. */
function loQueSabe(n){
  const a = n.ajustes || {}, c = a.contacto || {}, e = a.envio || {}, p = a.pagos || {};
  return [
    ['Horario', !!c.horario],
    ['Dirección', !!c.direccion],
    ['Costo de envío', e.costo != null || e.gratis_desde != null],
    ['Formas de pago', !!(p.efectivo || p.tarjeta || p.transferencia)],
    ['Datos para transferencia', !!(p.transferencia && p.clabe)],
  ];
}

function burbuja(m){
  if(m.rol === 'sistema') return `<li class="msj sistema"><span>${esc(m.texto)}</span></li>`;
  const quien = { cliente: 'Cliente', bot: 'Bot', persona: 'Tú' }[m.rol];
  return `<li class="msj ${m.rol}"><span class="quien">${quien}</span><p>${esc(m.texto).replace(/\n/g, '<br>')}</p>
    ${m.pedido ? `<div class="msj-pedido"><strong>Así quedaría el pedido · ${pesos(m.pedido.total)}</strong>
      <button class="boton secundario" data-al-carrito='${esc(JSON.stringify(m.pedido.renglones))}'>${icono('carrito')}Pasarlo al carrito para probarlo</button></div>` : ''}
    <time>${HORA.format(new Date(m.cuando))}</time></li>`;
}

async function conversacionesPantalla(){
  const [n, { productos, categorias }, reales] = await Promise.all([negocio(), catalogo(), conversaciones().catch((e) => { console.error(e); return null; })]);
  const sabe = loQueSabe(n), faltan = sabe.filter(([, si]) => !si).length;
  let sim = leer() || { mensajes: [], estado: {} };

  const bandeja = reales == null ? `<p class="nota">No se pudieron leer las conversaciones.</p>`
    : !reales.length ? `<p class="vacio-linea">${icono('conversaciones')}<span>Todavía no hay conversaciones de verdad. Aparecen aquí cuando el bot se conecte a WhatsApp: falta un número dedicado (está en Pendientes).</span></p>`
    : `<ul class="lista">${reales.map((c) => {
        const ult = [...(c.mensajes || [])].sort((a, b) => new Date(b.cuando) - new Date(a.cuando))[0];
        return `<li><div class="fila"><span class="texto"><strong>${esc(c.cliente?.nombre || c.externo)}</strong>
          <small>${esc(ult ? `${ult.rol === 'cliente' ? '' : ult.rol === 'bot' ? 'Bot: ' : 'Tú: '}${ult.texto}`.slice(0, 90) : 'sin mensajes')} · ${esc(fecha(c.actualizado))}</small></span>
          ${c.estado === 'persona' ? `<span class="chip ojo">La atiende ${esc(c.quien?.nombre || 'alguien')}</span>
            <button class="boton secundario" data-soltar="${c.id}">Devolver al bot</button>`
            : c.estado === 'cerrada' ? '<span class="chip">Cerrada</span>'
            : `<span class="chip bien">La atiende el bot</span><button class="boton secundario" data-tomar="${c.id}">Lo tomo yo</button>`}</div></li>`;
      }).join('')}</ul>`;

  return {
    html: `
      <div class="conversaciones-cols">
        <section class="tarjeta simulador">
          <header class="simulador-cabeza"><div><h2>Pruébalo como cliente</h2>
            <p class="nota">Escríbele como lo haría un cliente por WhatsApp. Contesta con tu catálogo y tus ajustes de hoy. No se manda nada a ningún lado.</p></div>
            <button class="boton-ico" data-reiniciar aria-label="Empezar otra conversación" title="Empezar otra">${icono('actualizar')}</button></header>
          <ol class="chat" id="chat" aria-live="polite"></ol>
          <div class="chips-elegir sugerencias" data-sugerencias>${SUGERENCIAS.map((s) => `<button type="button" class="chip-boton" data-decir="${esc(s)}">${esc(s)}</button>`).join('')}</div>
          <form class="escribir" id="escribir" autocomplete="off">
            <label class="oculto" for="texto">Mensaje</label>
            <input id="texto" maxlength="300" placeholder="Escribe como cliente…" enterkeyhint="send">
            <button type="submit" class="boton principal" aria-label="Mandar">${icono('adelante')}</button>
          </form>
          <div class="persona-barra" id="persona-barra" hidden>
            <p class="aviso-linea">${icono('info')}<span>La conversación pasó a una persona: el bot ya no contesta. Aquí contestarías tú.</span></p>
            <div class="botones"><button class="boton secundario" data-devolver>Devolvérsela al bot</button></div>
          </div>
        </section>
        <aside class="conversaciones-lado">
          <section class="seccion"><header><h2>Lo que el bot sabe</h2><a class="ver-todo" href="${enlace('/a/ajustes')}">Ajustes</a></header>
            <ul class="lista sabe">${sabe.map(([t, si]) => `<li class="fila"><span class="texto">${esc(t)}</span><span class="chip ${si ? 'bien' : 'ojo'}">${si ? 'Lo sabe' : 'Falta'}</span></li>`).join('')}</ul>
            <p class="nota">${faltan ? `Faltan ${faltan}: si alguien pregunta eso, el bot lo pasa a una persona en vez de inventar. Se llenan en Ajustes.` : 'Tiene todo lo que suelen preguntar.'}
              Precios y existencias los lee siempre del catálogo: ${productos.length} productos.</p>
          </section>
          <section class="seccion"><header><h2>Conversaciones de WhatsApp</h2></header>${bandeja}</section>
        </aside>
      </div>`,

    alMontar($c, { aviso, recargar }){
      const $chat = $c.querySelector('#chat'), $t = $c.querySelector('#texto'), $persona = $c.querySelector('#persona-barra');
      const pintar = () => {
        $chat.innerHTML = sim.mensajes.length ? sim.mensajes.map(burbuja).join('')
          : `<li class="msj sistema"><span>Empieza con un saludo o toca una sugerencia.</span></li>`;
        $persona.hidden = !sim.estado.conPersona;
        $t.placeholder = sim.estado.conPersona ? 'Contesta como persona…' : 'Escribe como cliente…';
        $chat.scrollTop = $chat.scrollHeight;
        guardar(sim);
      };
      const decir = (texto) => {
        texto = texto.trim(); if(!texto) return;
        const ahora = Date.now();
        sim.mensajes.push({ rol: sim.estado.conPersona ? 'persona' : 'cliente', texto, cuando: ahora });
        if(!sim.estado.conPersona){
          const r = responder(texto, { productos, categorias, negocio: n, estado: sim.estado });
          sim.estado = r.estado;
          if(r.texto) sim.mensajes.push({ rol: 'bot', texto: r.texto, cuando: ahora + 1, ...(r.accion === 'pedido' ? { pedido: r.pedido } : {}) });
          if(r.accion === 'persona') sim.mensajes.push({ rol: 'sistema', texto: 'Pasó a una persona. En WhatsApp, aquí le sonaría al equipo.', cuando: ahora + 2 });
        }
        pintar();
      };
      $c.querySelector('#escribir').addEventListener('submit', (e) => { e.preventDefault(); decir($t.value); $t.value = ''; $t.focus(); });
      $c.querySelector('[data-sugerencias]').addEventListener('click', (e) => { const b = e.target.closest('[data-decir]'); if(b) decir(b.dataset.decir); });
      $c.querySelector('[data-reiniciar]').addEventListener('click', () => { sim = { mensajes: [], estado: {} }; pintar(); $t.focus(); });
      $c.querySelector('[data-devolver]').addEventListener('click', () => {
        sim.estado = { ...sim.estado, conPersona: false, dudas: 0 };
        sim.mensajes.push({ rol: 'sistema', texto: 'Se le devolvió al bot.', cuando: Date.now() });
        pintar();
      });
      $chat.addEventListener('click', (e) => {
        const b = e.target.closest('[data-al-carrito]'); if(!b) return;
        let puestas = 0;
        for(const { id, cantidad } of JSON.parse(b.dataset.alCarrito)){ carrito.agregar(id, cantidad); puestas += cantidad; }
        aviso(`${puestas} ${puestas === 1 ? 'pieza' : 'piezas'} en el carrito`);
      });
      $c.querySelector('.conversaciones-lado').addEventListener('click', async (e) => {
        const b = e.target.closest('[data-tomar], [data-soltar]'); if(!b) return;
        b.setAttribute('aria-busy', 'true'); b.disabled = true;
        try{ await tomarConversacion(b.dataset.tomar || b.dataset.soltar, !!b.dataset.tomar); aviso(b.dataset.tomar ? 'Ya es tuya: el bot no contesta' : 'Se la devolviste al bot'); recargar(); }
        catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
      });
      pintar();
    },
  };
}

export const PANTALLAS = { conversaciones: conversacionesPantalla };
