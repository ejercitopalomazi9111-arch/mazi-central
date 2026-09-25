/* ══════════════════════════════════════════════════════════════════════════
   MI CUENTA · Bloque 9, el lado del cliente
   ──────────────────────────────────────────────────────────────────────────
   Tus datos, tus direcciones y cuándo te toca volver a surtirte — con la razón
   de cada aviso, porque «te toca» sin razón suena a que te quieren vender.

   La cuenta no tiene contraseña: nace sola con el primer pedido (Bloque 6) y
   vive en ESTE teléfono. Se dice tal cual, para que nadie la pierda sin saber.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado } from '../nucleo/piezas.js';
import { catalogo, carrito, miFicha, misPedidos, guardarMiFicha } from '../nucleo/datos.js';
import { ficha, recompras, porque, diaCorto, dias } from '../nucleo/recompra.js';

const telLimpio = (t) => String(t || '').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');

const MOMENTO = {
  luego: (m) => ({ clase: 'bien', texto: `En ${dias(m.faltan)}` }),
  pronto: (m) => ({ clase: 'ojo', texto: m.faltan === 0 ? 'Te toca hoy' : `Te toca en ${dias(m.faltan)}` }),
  toca: (m) => ({ clase: 'acento', texto: `Te tocaba hace ${dias(-m.faltan)}` }),
  atrasado: (m) => ({ clase: 'mal', texto: `Hace ${dias(-m.faltan)} que te tocaba` }),
};

async function cuenta(){
  const [f, pedidos, { porId }] = await Promise.all([miFicha().catch(() => null), misPedidos().catch(() => []), catalogo()]);
  if(!f) return { html: estado({ icono: 'cuenta', titulo: 'Todavía no tienes cuenta',
    texto: 'Se hace sola con tu primer pedido: no hay contraseña que recordar. Aquí vas a ver tus datos, tus direcciones y cuándo te toca volver a surtirte.',
    botones: `<a class="boton principal" href="${enlace('/')}">Ver productos</a>` }) };

  const fi = ficha(pedidos);
  const rc = recompras(pedidos).map((r) => ({ ...r, p: porId.get(r.producto_id) }));
  let direcciones = [...(f.direcciones || [])];

  const pintaDirecciones = () => direcciones.length
    ? `<ul class="lista">${direcciones.map((d, i) => `<li><div class="fila">
        ${icono('lugar')}<span class="texto"><strong>${esc([d.calle, d.colonia].filter(Boolean).join(', '))}</strong>
        <small>${esc([d.cp && `C.P. ${d.cp}`, d.referencias].filter(Boolean).join(' · ') || (i === 0 ? 'La más reciente' : ''))}</small></span>
        <button class="boton-ico" data-quitar-dir="${i}" aria-label="Quitar ${esc(d.calle || 'dirección')}">${icono('borrar')}</button></div></li>`).join('')}</ul>`
    : `<p class="nota">No tienes direcciones guardadas. Se guardan solas cuando pides a domicilio.</p>`;

  return {
    html: `
      ${fi.pedidos ? `<p class="saludo">Nos has comprado ${plural(fi.pedidos, 'vez', 'veces')} desde el ${diaCorto(fi.primera)}${fi.cada ? `; sueles volver cada ${dias(fi.cada)}` : ''}.</p>` : ''}

      <section class="seccion"><header><h2>Cuándo te toca</h2></header>
        ${rc.length ? `<ul class="recompras">${rc.map((r) => { const m = MOMENTO[r.momento.clave](r.momento); return `<li>
            <div class="recompra-cabeza"><strong>${esc(r.nombre)}</strong><span class="chip ${m.clase}">${m.texto}</span></div>
            <p class="nota">${esc(porque(r))} Te tocaría el <b>${diaCorto(r.proxima)}</b>.</p>
            ${r.p && !r.p.x ? `<button class="boton secundario" data-agregar="${esc(r.p.id)}" data-cuantas="${Math.max(1, Math.round(r.tipica))}">${icono('agregar')}Agregar ${Math.round(r.tipica) > 1 ? Math.round(r.tipica) + ' ' : ''}al carrito</button>`
              : `<p class="nota">${r.p ? 'Agotado por ahora.' : 'Ya no se vende.'}</p>`}
          </li>`; }).join('')}</ul>`
          : `<p class="nota">${fi.pedidos ? 'Cuando compres lo mismo dos veces, aquí te decimos cuándo te toca otra vez y por qué lo calculamos así.' : 'Cuando hagas tus primeros pedidos, aquí te decimos cuándo te toca surtirte.'}</p>`}
      </section>

      <section class="seccion"><header><h2>Tus datos</h2></header>
        <form id="datos" novalidate>
          <label class="campo" for="nombre"><span class="etiqueta-campo">Nombre</span>
            <input id="nombre" autocomplete="name" maxlength="80" value="${esc(f.nombre)}" required></label>
          <label class="campo" for="telefono"><span class="etiqueta-campo">WhatsApp</span>
            <span class="ayuda">Por aquí te avisamos de tu pedido.</span>
            <input id="telefono" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="16" value="${esc(telLimpio(f.telefono))}" required></label>
          <button type="submit" class="boton principal">${icono('listo')}Guardar</button>
        </form>
      </section>

      <section class="seccion"><header><h2>Tus direcciones</h2></header><div id="direcciones">${pintaDirecciones()}</div></section>

      <section class="seccion"><header><h2>Tu cuenta</h2><a class="ver-todo" href="${enlace('/pedidos')}">Mis pedidos</a></header>
        <p class="aviso-linea">${icono('info')}<span>Tu cuenta vive en este teléfono y no tiene contraseña. Si borras los datos del navegador o cambias de teléfono, empiezas una cuenta nueva: tus pedidos siguen en la tienda, pero aquí ya no los verías.</span></p>
      </section>`,
    alMontar(raiz, { aviso }){
      raiz.querySelectorAll('[data-agregar]').forEach((b) => b.addEventListener('click', () => {
        const p = porId.get(b.dataset.agregar);
        const cabe = Math.max(0, Math.min(Number(b.dataset.cuantas), p.q - carrito.cuantas(p.id)));
        if(!cabe){ aviso('Ya llevas todas las que hay', 'mal'); return; }
        carrito.agregar(p.id, cabe);
        aviso(`Agregado · llevas ${plural(carrito.piezas(), 'pieza', 'piezas')}`);
      }));

      const form = raiz.querySelector('#datos');
      const marcar = (id, texto) => {
        const c = form.querySelector('#' + id).closest('.campo');
        c.classList.toggle('error', !!texto);
        c.querySelector('.mensaje-error')?.remove();
        if(texto) c.insertAdjacentHTML('beforeend', `<span class="mensaje-error">${icono('alerta')}${esc(texto)}</span>`);
        return !texto;
      };
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = form.nombre.value.trim(), tel = telLimpio(form.telefono.value);
        // Se revisan los dos: marcar sólo el primero que falla obliga a darle dos veces.
        const bien = [marcar('nombre', nombre ? '' : 'Escribe tu nombre.'), marcar('telefono', tel.length === 10 ? '' : 'Son 10 dígitos, sin el 52.')];
        if(bien.includes(false)){ form.querySelector('.campo.error input')?.focus(); return; }
        const b = e.submitter; b.setAttribute('aria-busy', 'true'); b.disabled = true;
        try{ await guardarMiFicha({ nombre, telefono: tel }); aviso('Guardado'); }
        catch(err){ console.error(err); aviso(err.message, 'mal'); }
        finally{ b.removeAttribute('aria-busy'); b.disabled = false; }
      });

      raiz.querySelector('#direcciones').addEventListener('click', async (e) => {
        const b = e.target.closest('[data-quitar-dir]'); if(!b) return;
        const antes = direcciones;
        direcciones = direcciones.filter((_, i) => i !== Number(b.dataset.quitarDir));
        b.setAttribute('aria-busy', 'true'); b.disabled = true;
        try{ await guardarMiFicha({ direcciones }); raiz.querySelector('#direcciones').innerHTML = pintaDirecciones(); aviso('Dirección quitada'); }
        catch(err){ console.error(err); direcciones = antes; aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
      });
    },
  };
}

export const PANTALLAS = { cuenta };
