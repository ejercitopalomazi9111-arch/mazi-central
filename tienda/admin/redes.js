/* ══════════════════════════════════════════════════════════════════════════
   REDES · Bloque 12, el lado del dueño
   ──────────────────────────────────────────────────────────────────────────
   Ideas que nacen de lo que de verdad pasa en el negocio (oferta vigente, lo
   más vendido, lo nuevo, las últimas piezas), con el precio real; un
   calendario para no olvidarlas; y la mejor hora sacada de SUS pedidos.
   Publicar directo pide el trámite de Meta: mientras, desde el teléfono se
   comparte con un toque (Compartir abre Instagram, Facebook o WhatsApp) y en
   computadora se copia el texto y se abre la red.
   Cuentas en nucleo/redes.js (11 pruebas).
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc } from '../nucleo/piezas.js';
import { negocio, catalogo, catalogoAdmin, ventasReporte, publicaciones, guardarPublicacion, borrarPublicacion } from '../nucleo/datos.js';
import { ideas, mejorHora, MINIMO_HORA } from '../nucleo/redes.js';
import { negocioPedido } from '../config.js';

const REDES = { todas: 'Todas', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'Estado de WhatsApp' };
const ABRIR = { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', whatsapp: (t) => `https://wa.me/?text=${encodeURIComponent(t)}` };
const CUANDO = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const DIA = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const Mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);   // en CSS, capitalize haría «24 De Septiembre»

/* Para <input type="datetime-local">: la hora del teléfono, sin zona. */
function local(d){ const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 16); }
/* La próxima vez que toca publicar: hoy o mañana a la hora buena (o 6 pm si no hay dato). */
function proxima(h){ const d = new Date(); d.setHours(h ?? 18, 0, 0, 0); if(d <= new Date()) d.setDate(d.getDate() + 1); return d; }

async function compartir(texto, red, aviso){
  if(navigator.share && (red === 'todas' || red === 'instagram')){
    try{ await navigator.share({ text: texto }); return; }catch(e){ if(e.name === 'AbortError') return; }
  }
  try{ await navigator.clipboard.writeText(texto); aviso('Texto copiado: pégalo en la publicación'); }catch(e){ aviso('No se pudo copiar: selecciónalo a mano', 'mal'); }
  const a = ABRIR[red]; if(a) window.open(typeof a === 'function' ? a(texto) : a, '_blank', 'noopener');
}

async function redes(){
  const hace60 = Date.now() - 60 * 86400000;
  const [n, cat, adm, ventas, pubs] = await Promise.all([negocio(), catalogo(), catalogoAdmin(), ventasReporte(hace60).catch(() => []), publicaciones().catch(() => [])]);
  const base = new URL(`?negocio=${negocioPedido()}`, location.href);
  const ligas = (id) => { const u = new URL(base); u.hash = enlace('/p/:id', { id }); return u.href; };
  const lista = ideas({ productos: cat.productos, ventas, admin: adm.productos, firma: n.marca?.nombre_corto || n.nombre, enlace: ligas });
  const mh = mejorHora(ventas);
  const pendientes = pubs.filter((p) => p.estado !== 'publicada'), hechas = pubs.filter((p) => p.estado === 'publicada').slice(-10).reverse();

  const idea = (x, i) => `<li class="idea" data-idea="${i}">
      ${x.producto?.f ? `<img src="${esc(x.producto.f)}" alt="" width="72" height="72" loading="lazy">` : ''}
      <div class="idea-cuerpo"><span class="chip acento">${esc(x.tipo)}</span>
        <label class="oculto" for="t-${i}">Texto</label><textarea id="t-${i}" rows="5">${esc(x.texto)}</textarea>
        <div class="botones">
          <button class="boton principal" data-compartir="${i}">${icono('adelante')}Compartir</button>
          <button class="boton secundario" data-agendar="${i}">${icono('reloj')}Para después</button>
        </div>
        <div class="agendar" hidden>
          <label class="campo" for="c-${i}"><span class="etiqueta-campo">¿Cuándo?</span><input id="c-${i}" type="datetime-local" value="${local(proxima(mh.suficiente ? mh.publicar : null))}"></label>
          <label class="campo" for="r-${i}"><span class="etiqueta-campo">¿Dónde?</span><select id="r-${i}">${Object.entries(REDES).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
          <button class="boton secundario" data-guardar="${i}">${icono('listo')}Guardar en el calendario</button>
        </div>
      </div></li>`;

  const porDia = new Map();
  for(const p of pendientes){ const k = p.programada ? new Date(p.programada).toDateString() : 'sin'; if(!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(p); }
  const pub = (p) => `<li class="pub" data-pub="${p.id}"><div class="pub-cabeza"><strong>${p.programada ? esc(CUANDO.format(new Date(p.programada))) : 'Sin fecha'}</strong>
      <span class="chip">${esc(REDES[p.red] || p.red)}</span>${p.programada && new Date(p.programada) < new Date() && p.estado !== 'publicada' ? '<span class="chip ojo">Ya le tocaba</span>' : ''}</div>
      <p>${esc(p.contenido?.texto || '').replace(/\n/g, '<br>')}</p>
      <div class="botones"><button class="boton principal" data-compartir-pub="${p.id}">${icono('adelante')}Compartir</button>
        <button class="boton secundario" data-publicada="${p.id}">${icono('listo')}Ya la publiqué</button>
        <button class="boton-ico" data-quitar="${p.id}" aria-label="Quitar del calendario">${icono('borrar')}</button></div></li>`;

  return {
    html: `
      <section class="tarjeta bloque-form mejor-hora">${icono('reloj')}<div><h2>Mejor hora para publicar</h2>
        <p>${mh.suficiente ? `${esc(mh.texto)} <span class="nota">(${esc(mh.base)})</span>`
          : `Todavía no se puede saber: van ${mh.van} de ${MINIMO_HORA} pedidos en línea para calcularla con los tuyos. Mientras, fíjate a qué hora te escriben más.`}</p></div></section>
      <section class="seccion"><header><h2>Ideas para publicar</h2></header>
        <p class="nota">Salen de lo que pasa en tu tienda, con el precio de hoy. Edita lo que quieras antes de compartir.</p>
        ${lista.length ? `<ul class="ideas">${lista.map(idea).join('')}</ul>`
          : `<p class="vacio-linea">${icono('redes')}<span>Hoy no hay de qué publicar con fundamento: ni ofertas, ni algo nuevo, ni lo más pedido de la semana. Una oferta corta en Descuentos es buen pretexto.</span></p>`}
      </section>
      <section class="seccion"><header><h2>Calendario</h2></header>
        ${pendientes.length ? [...porDia.entries()].map(([k, ps]) => `<h3 class="dia-cal">${k === 'sin' ? 'Sin fecha' : esc(Mayus(DIA.format(new Date(k))))}</h3><ul class="pubs">${ps.map(pub).join('')}</ul>`).join('')
          : `<p class="vacio-linea">${icono('reloj')}<span>Nada en el calendario. Guarda una idea «para después» y aquí te espera.</span></p>`}
      </section>
      ${hechas.length ? `<section class="seccion"><header><h2>Ya publicadas</h2></header><ul class="lista">${hechas.map((p) => `<li class="fila"><span class="texto"><strong>${esc((p.contenido?.texto || '').split('\n')[0].slice(0, 70))}</strong>
        <small>${esc(REDES[p.red] || p.red)}${p.programada ? ` · ${esc(CUANDO.format(new Date(p.programada)))}` : ''}</small></span></li>`).join('')}</ul></section>` : ''}`,

    alMontar($c, { aviso, recargar }){
      const texto = (i) => $c.querySelector(`#t-${i}`).value.trim();
      $c.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.compartir) return compartir(texto(b.dataset.compartir), 'todas', aviso);
        if(b.dataset.agendar){ const box = b.closest('.idea').querySelector('.agendar'); box.hidden = !box.hidden; return; }
        const ocupado = async (trabajo, listo) => {
          b.setAttribute('aria-busy', 'true'); b.disabled = true;
          try{ await trabajo(); aviso(listo); recargar(); }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
        };
        if(b.dataset.guardar){
          const i = b.dataset.guardar, x = lista[Number(i)], cuando = $c.querySelector(`#c-${i}`).value;
          if(!cuando){ aviso('Falta cuándo', 'mal'); return; }
          return ocupado(() => guardarPublicacion(null, { red: $c.querySelector(`#r-${i}`).value, estado: 'programada', programada: new Date(cuando).toISOString(),
            contenido: { texto: texto(i), tipo: x.tipo, producto_id: x.producto?.id || null, foto: x.producto?.f || null } }), 'Guardada en el calendario');
        }
        const p = pubs.find((x) => x.id === (b.dataset.compartirPub || b.dataset.publicada || b.dataset.quitar));
        if(b.dataset.compartirPub) return compartir(p.contenido?.texto || '', p.red, aviso);
        if(b.dataset.publicada) return ocupado(() => guardarPublicacion(p.id, { estado: 'publicada' }), 'Marcada como publicada');
        if(b.dataset.quitar && confirm('¿Quitar esta publicación del calendario?')) return ocupado(() => borrarPublicacion(p.id), 'Quitada');
      });
    },
  };
}

export const PANTALLAS = { redes };
