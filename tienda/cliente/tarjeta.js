/* ══════════════════════════════════════════════════════════════════════════
   LA TARJETA DE PRODUCTO · una sola, para toda la tienda
   ──────────────────────────────────────────────────────────────────────────
   Portada, categoría, búsqueda, favoritos y «va bien con esto» pintan la
   misma tarjeta. Trae lo que traen las de Amazon y Mercado Libre: foto,
   marca, nombre, precio con el de antes, cuántas quedan, el corazón de
   favoritos y el «+» para agregar sin abrir la ficha.
   El corazón y el «+» son botones FUERA del enlace (un botón dentro de un
   <a> no es HTML válido y el lector de pantalla lo lee mal); los atiende un
   solo oyente en app.js, así sirven en cualquier pantalla sin cablearlos.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, quitaAcentos } from '../nucleo/piezas.js';
import { memoria } from '../nucleo/datos.js';

export const POCAS = 5;

/* La foto, o un recuadro con ícono cuando no hay: un catálogo recién importado
   casi nunca trae fotos, y una imagen rota se ve a tienda abandonada. */
export const foto = (p, w, h, extra = '') => p.f
  ? `<img src="${esc(p.f)}" alt="" width="${w}" height="${h}" ${extra}>`
  : `<span class="sin-foto" role="img" aria-label="Sin foto">${icono('caja')}</span>`;

export function botonFavorito(p, { grande = false } = {}){
  const on = memoria.favoritos.tiene(p.id);
  return `<button type="button" class="corazon${grande ? ' grande' : ''}" data-fav="${esc(p.id)}" data-precio="${p.p}" aria-pressed="${on}"
    aria-label="${on ? 'Quitar de favoritos' : 'Guardar en favoritos'}: ${esc(p.n)}">${icono('corazon')}</button>`;
}

export function tarjeta(p){
  const oferta = p.a ? Math.round((1 - p.p / p.a) * 100) : 0;
  return `<article class="producto${p.x ? ' sin' : ''}">
    <a class="producto-enlace" href="${enlace('/p/:id', { id: p.id })}">
      <div class="foto">
        ${foto(p, 480, 480, 'loading="lazy" decoding="async"')}
        ${p.x ? '<span class="marca-foto agotado">Agotado</span>'
              : oferta >= 5 ? `<span class="marca-foto oferta">−${oferta}%</span>` : ''}
      </div>
      <div class="cuerpo">
        ${p.m && !quitaAcentos(p.n).startsWith(quitaAcentos(p.m).split(' ')[0]) ? `<span class="m">${esc(p.m)}</span>` : ''}
        <span class="n">${esc(p.n)}</span>
        <span class="precio"><span class="ahora">${pesos(p.p)}</span>${p.a ? `<span class="antes">${pesos(p.a)}</span>` : ''}</span>
        ${!p.x && p.q <= POCAS ? `<span class="quedan">${p.q === 1 ? 'Queda 1' : `Quedan ${p.q}`}</span>` : ''}
      </div>
    </a>
    ${botonFavorito(p)}
    ${p.x ? '' : `<button type="button" class="rapido" data-rapido="${esc(p.id)}" aria-label="Agregar ${esc(p.n)} al carrito">${icono('mas')}</button>`}
  </article>`;
}
