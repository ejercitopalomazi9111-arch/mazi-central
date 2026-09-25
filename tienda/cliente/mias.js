/* ══════════════════════════════════════════════════════════════════════════
   LO MÍO · favoritos, comprar de nuevo y ayuda
   ──────────────────────────────────────────────────────────────────────────
   Lo que en Amazon es «Listas», «Comprar de nuevo» y «Servicio al cliente»,
   y en Mercado Libre «Favoritos», «Historial» y «Ayuda». Todo sin cuenta:
   favoritos y vistos viven en el teléfono (nucleo/memoria.js); «comprar de
   nuevo» sale de sus pedidos, así que aparece con el primero.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado } from '../nucleo/piezas.js';
import { catalogo, carrito, misPedidos, negocio, memoria } from '../nucleo/datos.js';
import { bajoDesde, comprados } from '../nucleo/memoria.js';
import { diaCorto } from '../nucleo/recompra.js';
import { tarjeta, foto } from './tarjeta.js';
import { waNegocio } from './contacto.js';

const agregar = (p, n, aviso) => {
  const cabe = Math.max(0, Math.min(n, p.q - carrito.cuantas(p.id)));
  if(cabe) carrito.agregar(p.id, cabe);
  aviso(cabe ? `Agregado · llevas ${plural(carrito.piezas(), 'pieza', 'piezas')}` : 'Ya llevas todas las que hay', cabe ? undefined : 'mal');
};

/* ── Favoritos ────────────────────────────────────────────────────────── */
async function favoritos(){
  const { porId } = await catalogo();
  return {
    html: '<div id="favs"></div>',
    alMontar($c, { aviso }){
      const $f = $c.querySelector('#favs');
      const pinta = () => {
        const favs = memoria.favoritos.todos().map((f) => ({ f, p: porId.get(f.id) }));
        const vivos = favs.filter((x) => x.p), idos = favs.length - vivos.length;
        const vistos = memoria.vistos.todos().map((id) => porId.get(id)).filter(Boolean);
        const bajaron = vivos.filter(({ f, p }) => bajoDesde(f, p) > 0).length;
        $f.innerHTML = `
          <section class="seccion"><header><h2>Tus favoritos</h2>${vivos.length ? `<span class="nota">${plural(vivos.length, 'producto', 'productos')}</span>` : ''}</header>
            ${bajaron ? `<p class="aviso-linea bien">${icono('descuentos')}<span>${bajaron === 1 ? '1 de tus favoritos bajó de precio' : `${bajaron} de tus favoritos bajaron de precio`} desde que lo guardaste.</span></p>` : ''}
            ${vivos.length ? `<ul class="mios favoritos">${vivos.map(({ f, p }) => {
              const baja = bajoDesde(f, p);
              return `<li class="mio${p.x ? ' sin' : ''}">
                <a href="${enlace('/p/:id', { id: p.id })}">${foto(p, 72, 72, 'loading="lazy"')}</a>
                <div class="texto"><a class="n" href="${enlace('/p/:id', { id: p.id })}">${esc(p.n)}</a>
                  <small><b class="precio-mio">${pesos(p.p)}</b>${baja > 0 ? ` <span class="chip bien">Bajó ${pesos(baja / 100)}</span>` : baja < 0 ? ` <span class="chip">Subió ${pesos(-baja / 100)}</span>` : ''}${p.x ? ' · Agotado por ahora' : ''}</small></div>
                <div class="acciones-mio">${p.x ? '' : `<button class="boton secundario" data-agregar="${esc(p.id)}">${icono('carrito')}<span>Agregar</span></button>`}
                  <button class="boton-ico" data-quitar-fav="${esc(p.id)}" aria-label="Quitar ${esc(p.n)} de favoritos">${icono('borrar')}</button></div>
              </li>`;
            }).join('')}</ul>`
            : estado({ icono: 'corazon', titulo: 'Todavía no guardas favoritos', texto: 'Toca el corazón de cualquier producto para guardarlo aquí. Si baja de precio, aquí te lo decimos.',
                botones: `<a class="boton principal" href="${enlace('/')}">Ver productos</a>` })}
            ${idos ? `<p class="nota">${plural(idos, 'favorito ya no se vende', 'favoritos ya no se venden')} y no ${idos === 1 ? 'aparece' : 'aparecen'}.</p>` : ''}
          </section>
          ${vistos.length ? `<section class="seccion"><header><h2>Vistos recientemente</h2><button class="boton fantasma" data-borrar-vistos>Borrar historial</button></header>
            <div class="carril">${vistos.map(tarjeta).join('')}</div></section>` : ''}`;
      };
      $f.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.agregar) agregar(porId.get(b.dataset.agregar), 1, aviso);
        else if(b.dataset.quitarFav){ memoria.favoritos.quitar(b.dataset.quitarFav); aviso('Quitado de favoritos'); pinta(); }
        else if(b.matches('[data-borrar-vistos]')){ memoria.vistos.borrar(); pinta(); }
      });
      // El corazón de una tarjeta de «vistos» también cambia la lista de arriba.
      const soltar = memoria.alCambiar((k) => { if(k === 'favoritos') pinta(); });
      pinta();
      return soltar;
    },
  };
}

/* ── Comprar de nuevo ─────────────────────────────────────────────────── */
async function otraVez(){
  const [{ porId }, mios] = await Promise.all([catalogo(), misPedidos().catch(() => [])]);
  const lista = comprados(mios).map((c) => ({ ...c, p: porId.get(c.id) })).filter((c) => c.p);
  if(!lista.length) return { html: estado({ icono: 'repetir', titulo: 'Aquí va a salir lo que ya compraste',
    texto: 'Con tu primer pedido, aquí encuentras cada producto para volver a pedirlo con un toque, en la cantidad que sueles llevar.',
    botones: `<a class="boton principal" href="${enlace('/')}">Ir a la tienda</a>` }) };
  return {
    html: `<p class="nota">Lo que has pedido, lo más reciente primero. El botón agrega la cantidad que sueles llevar.</p>
      <ul class="mios otra-vez">${lista.map((c) => {
        const suele = Math.max(1, Math.round(c.piezas / c.veces));
        return `<li class="mio${c.p.x ? ' sin' : ''}">
          <a href="${enlace('/p/:id', { id: c.id })}">${foto(c.p, 72, 72, 'loading="lazy"')}</a>
          <div class="texto"><a class="n" href="${enlace('/p/:id', { id: c.id })}">${esc(c.p.n)}</a>
            <small>${c.veces === 1 ? 'Lo pediste' : `Lo has pedido ${c.veces} veces · la última`} el ${esc(diaCorto(c.ultima))} · ${pesos(c.p.p)} c/u${c.p.x ? ' · Agotado por ahora' : ''}</small></div>
          ${c.p.x ? '' : `<button class="boton secundario" data-otra="${esc(c.id)}" data-suele="${suele}">${icono('repetir')}<span>${suele > 1 ? `Agregar ${suele}` : 'Agregar'}</span></button>`}
        </li>`;
      }).join('')}</ul>`,
    alMontar($c, { aviso }){
      $c.addEventListener('click', (e) => {
        const b = e.target.closest('[data-otra]'); if(!b) return;
        agregar(porId.get(b.dataset.otra), Number(b.dataset.suele), aviso);
      });
    },
  };
}

/* ── Ayuda ────────────────────────────────────────────────────────────── */
async function ayuda(){
  const n = await negocio();
  const a = n.ajustes || {}, env = a.envio || {}, c = a.contacto || {}, g = a.pagos || {};
  const wa = waNegocio(n, 'Hola, necesito ayuda: ');
  const formas = [g.efectivo !== false && 'Efectivo al recibir', g.tarjeta && 'Tarjeta al recibir (terminal)', g.transferencia && 'Transferencia'].filter(Boolean);
  const P = (q, r) => `<details class="pregunta"><summary>${q}</summary><div>${r}</div></details>`;
  return {
    html: `
      <section class="tarjeta contacto-ayuda">
        <h2>¿En qué te ayudamos?</h2>
        <p>Te contesta una persona${c.horario ? `, ${esc(c.horario)}` : ''}.</p>
        <div class="botones">${wa ? `<a class="boton principal grande" href="${esc(wa)}" target="_blank" rel="noopener">${icono('preguntar')}Escríbenos por WhatsApp</a>` : '<p class="nota">El negocio todavía no pone su WhatsApp.</p>'}</div>
        ${c.direccion ? `<p class="nota">${icono('lugar')} ${esc(c.direccion)}</p>` : ''}
      </section>
      <section class="seccion"><header><h2>Preguntas frecuentes</h2></header>
        ${P('¿Necesito hacer una cuenta?', '<p>No. Ves, buscas y llenas tu carrito sin registrarte. Al pedir te pedimos nombre y WhatsApp, y tu cuenta se hace sola: no hay contraseña que recordar.</p>')}
        ${P('¿Cuánto cuesta el envío?', `<p>${env.costo != null ? `El envío cuesta ${pesos(env.costo)}` : 'El envío se calcula al pedir'}${env.gratis_desde != null ? `, y es <b>gratis desde ${pesos(env.gratis_desde)}</b>` : ''}.${env.zona ? ` Entregamos en ${esc(env.zona)}.` : ''}${env.recoger !== false ? ' También puedes pasar a recoger sin costo.' : ''}</p>`)}
        ${P('¿Cómo puedo pagar?', formas.length ? `<ul>${formas.map((f) => `<li>${f}</li>`).join('')}</ul>` : '<p>Al pedir te decimos las formas de pago.</p>')}
        ${P('¿Cómo sé por dónde va mi pedido?', `<p>En <a href="${enlace('/pedidos')}">Mis pedidos</a> ves en qué va cada uno. Cuando sale a entregarse, «¿Por dónde va?» te enseña al repartidor en el mapa.</p>`)}
        ${P('¿Puedo cancelar?', `<p>Sí, mientras tu pedido esté «Recibido» (antes de que lo empecemos a preparar): en <a href="${enlace('/pedidos')}">Mis pedidos</a> toca «Cancelar». Después, escríbenos.</p>`)}
        ${P('Algo llegó mal o incompleto', `<p>En <a href="${enlace('/pedidos')}">Mis pedidos</a>, en ese pedido, toca «¿Algún problema?»: nos llega por WhatsApp con tu número de pedido y lo resolvemos contigo.</p>`)}
        ${P('¿Cómo vuelvo a pedir lo mismo?', `<p>En <a href="${enlace('/otra-vez')}">Comprar de nuevo</a> está todo lo que has pedido, o en <a href="${enlace('/pedidos')}">Mis pedidos</a> toca «Volver a pedir».</p>`)}
        ${P('¿Puedo tener la tienda como app?', '<p>Sí: en el menú toca «Instalar». Queda en tu pantalla como una app más y abre aunque no haya internet.</p>')}
      </section>`,
  };
}

export const PANTALLAS = { favoritos, otraVez, ayuda };
