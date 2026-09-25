/* ══════════════════════════════════════════════════════════════════════════
   CLIENTES · Bloque 9, el lado del dueño
   ──────────────────────────────────────────────────────────────────────────
   La pregunta que contesta: «¿a quién le hablo hoy?». Por eso la vista de
   entrada NO es la lista alfabética: es a quién ya le toca volver a surtirse,
   con la razón a la vista y un botón de WhatsApp con el mensaje escrito.

   El cálculo vive en nucleo/recompra.js (puro, 46 pruebas). Aquí sólo se pinta.
   Nada se manda solo: el dueño lee la razón, decide y toca. Un aviso
   automático que se equivoca quema al cliente; uno que el dueño revisó, no.
   ═════════════════════════════════════════════════════════════════════════ */
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado, hoja, fecha, quitaAcentos, descargarCSV } from '../nucleo/piezas.js';
import { negocio, clientesNegocio, guardarNotasCliente } from '../nucleo/datos.js';
import { ficha, recompras, pedidoDeSiempre, porqueDe, diaCorto, dias } from '../nucleo/recompra.js';
import { ESTADOS } from '../cliente/pedir.js';

const PAGINA = 40;
const PAGOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mixto: 'Mixto' };
const telLimpio = (t) => String(t || '').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');

function recordar(llave, inicial){
  let v = inicial;
  try{ v = { ...inicial, ...JSON.parse(sessionStorage.getItem(llave) || '{}') }; }catch(e){}
  return { v, guardar(){ try{ sessionStorage.setItem(llave, JSON.stringify(v)); }catch(e){} } };
}

/* Lo más urgente de un cliente: el producto que antes le toca; si ninguno
   tiene ritmo todavía, su ritmo de visitas. */
export function urgencia(c){
  const r = c.recompras[0];
  if(r) return { m: r.momento, proxima: r.proxima, que: r.nombre };
  if(c.ficha.momento) return { m: c.ficha.momento, proxima: c.ficha.proxima, que: null };
  return null;
}

/* El chip de cada fila, dicho con palabras (nunca sólo color). */
export function chip(u){
  if(!u) return '<span class="chip">Sin ritmo aún</span>';
  const { clave, faltan } = u.m;
  if(clave === 'pronto') return `<span class="chip ojo">${faltan === 0 ? 'Le toca hoy' : `Le toca en ${dias(faltan)}`}</span>`;
  if(clave === 'toca') return `<span class="chip acento">Le tocaba hace ${dias(-faltan)}</span>`;
  if(clave === 'atrasado') return `<span class="chip mal">Atrasado ${dias(-faltan)}</span>`;
  return `<span class="chip bien">En ${dias(faltan)}</span>`;
}

const VISTAS = [
  ['toca', 'Les toca', (c) => LES_TOCA(c)],
  ['atrasados', 'Atrasados', (c) => c.urg?.m.clave === 'atrasado'],
  ['todos', 'Todos', () => true],
  ['nuevos', 'Una compra', (c) => c.ficha.pedidos === 1],
  ['sin', 'Sin compras', (c) => c.ficha.pedidos === 0],
];

function mensajeRecompra(c, n){
  const nombre = (c.nombre || '').split(' ')[0];
  const firma = n.marca?.nombre_corto || n.nombre;
  const toca = c.recompras.filter((r) => r.momento.clave !== 'luego').slice(0, 3);
  if(toca.length){
    const lista = toca.map((r) => r.nombre).join(', ').replace(/, ([^,]*)$/, ' y $1');
    return `Hola ${nombre}, ¿te mandamos ${toca.length === 1 ? 'tu' : 'tus'} ${lista}? La última vez fue el ${diaCorto(toca[0].ultima)}. — ${firma}`;
  }
  return `Hola ${nombre}, ¿cómo vas de producto? Si te hace falta algo, aquí estamos. — ${firma}`;
}
const whatsapp = (c, n) => { const t = telLimpio(c.telefono); return t.length === 10 ? `https://wa.me/52${t}?text=${encodeURIComponent(mensajeRecompra(c, n))}` : ''; };

/* Cada cliente con su ficha, sus recompras y lo más urgente. Lo usa también el tablero. */
export function conRecompra(todos, hoy = Date.now()){
  return todos.map((c) => {
    const x = { ...c, ficha: ficha(c.pedidos, hoy), recompras: recompras(c.pedidos, hoy) };
    x.urg = urgencia(x);
    return x;
  });
}
export const LES_TOCA = (c) => c.urg && ['pronto', 'toca'].includes(c.urg.m.clave);

async function clientes(){
  const [todos, n] = await Promise.all([clientesNegocio(), negocio()]);
  const lista = conRecompra(todos);
  const conCompras = lista.filter((c) => c.ficha.pedidos > 0);
  const tocan = lista.filter(VISTAS[0][2]).length, atrasados = lista.filter(VISTAS[1][2]).length;
  const promedio = conCompras.length ? conCompras.reduce((t, c) => t + c.ficha.gastado, 0) / conCompras.reduce((t, c) => t + c.ficha.pedidos, 0) : 0;
  const f = recordar('tienda-admin-clientes', { q: '', ver: tocan ? 'toca' : 'todos' });

  const fila = (c) => `<li><button class="fila" data-cliente="${c.id}">
      <span class="texto"><strong>${esc(c.nombre || 'Sin nombre')}</strong>
        <small>${c.ficha.pedidos ? esc([plural(c.ficha.pedidos, 'pedido', 'pedidos'),
          c.ficha.cada ? `cada ${dias(c.ficha.cada)}` : null, `última ${diaCorto(c.ficha.ultima)}`,
          c.urg?.que && c.urg.m.clave !== 'luego' ? c.urg.que : null].filter(Boolean).join(' · ')) : 'Todavía no compra'}</small></span>
      <span class="lado">${c.ficha.pedidos ? `<span class="precio-fila">${pesos(c.ficha.gastado)}</span>` : ''}${chip(c.urg)}</span>
    </button></li>`;

  return {
    html: `
      <div class="cifras">
        <div class="cifra-caja"><span class="valor">${conCompras.length}</span><span class="etq">clientes con compras</span></div>
        <div class="cifra-caja"><span class="valor ${tocan ? 'ojo' : ''}">${tocan}</span><span class="etq">les toca surtirse</span></div>
        <div class="cifra-caja"><span class="valor ${atrasados ? 'mal' : ''}">${atrasados}</span><span class="etq">atrasados</span></div>
        <div class="cifra-caja"><span class="valor">${pesos(Math.round(promedio))}</span><span class="etq">compra promedio</span></div>
      </div>
      <div class="barra-admin">
        <label class="buscador">${icono('buscar')}
          <input type="search" id="q" placeholder="Nombre o teléfono" value="${esc(f.v.q)}" autocomplete="off" aria-label="Buscar cliente"></label>
        <div class="segmentos vistas-clientes" role="group" aria-label="Qué clientes ver">${VISTAS.map(([k, t]) =>
          `<button type="button" data-ver="${k}" aria-pressed="${k === f.v.ver}">${t}</button>`).join('')}</div>
        <div class="botones"><button class="boton secundario" data-csv>${icono('importar')}Descargar</button></div>
      </div>
      <p class="nota">«Le toca» sale de cada cuándo compra cada producto. Toca un cliente para ver en qué se basa.</p>
      <p class="cuenta" id="cuenta" aria-live="polite"></p>
      <ul class="lista clientes-admin" id="lista"></ul>
      <div class="botones centro"><button class="boton secundario" id="mas" hidden>Ver más</button></div>`,
    alMontar($c, { aviso }){
      const $lista = $c.querySelector('#lista'), $mas = $c.querySelector('#mas'), $cuenta = $c.querySelector('#cuenta');
      let vistos = [], cuantos = PAGINA;
      const pintar = () => {
        const q = quitaAcentos(f.v.q.trim()), qTel = f.v.q.replace(/\D/g, '');
        const pasa = VISTAS.find(([k]) => k === f.v.ver)?.[2] || (() => true);
        vistos = lista.filter(pasa).filter((c) => !q || quitaAcentos(c.nombre).includes(q) || (qTel.length >= 3 && telLimpio(c.telefono).includes(qTel)));
        // Los que les toca: el más urgente arriba. Los demás: el que compró más reciente.
        if(['toca', 'atrasados'].includes(f.v.ver)) vistos.sort((a, b) => a.urg.proxima - b.urg.proxima);
        else vistos.sort((a, b) => (b.ficha.ultima || 0) - (a.ficha.ultima || 0));
        $cuenta.textContent = plural(vistos.length, 'cliente', 'clientes');
        $lista.innerHTML = vistos.length ? vistos.slice(0, cuantos).map(fila).join('')
          : `<li>${f.v.ver === 'toca' && !q
              ? estado({ icono: 'listo', titulo: 'A nadie le toca todavía', texto: 'Cuando un cliente compre lo mismo dos veces, aquí va a salir cuándo le toca otra.' })
              : estado({ icono: 'buscar', titulo: 'Nadie con ese filtro', texto: 'Prueba con otra palabra o cambia la vista.' })}</li>`;
        $mas.hidden = vistos.length <= cuantos;
        $mas.textContent = `Ver ${Math.min(PAGINA, vistos.length - cuantos)} más`;
        f.guardar();
      };
      $c.querySelector('#q').addEventListener('input', (e) => { f.v.q = e.target.value; cuantos = PAGINA; pintar(); });
      $c.querySelector('.vistas-clientes').addEventListener('click', (e) => {
        const b = e.target.closest('[data-ver]'); if(!b) return;
        f.v.ver = b.dataset.ver; cuantos = PAGINA;
        $c.querySelectorAll('[data-ver]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        pintar();
      });
      $mas.addEventListener('click', () => { cuantos += PAGINA; pintar(); });
      $lista.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cliente]'); if(!b) return;
        hojaCliente(lista.find((c) => c.id === b.dataset.cliente), n, aviso);
      });
      $c.querySelector('[data-csv]').addEventListener('click', () => descargarCSV('clientes.csv', [
        ['Nombre', 'Teléfono', 'Pedidos', 'Primera compra', 'Última compra', 'Cada (días)', 'Gastado', 'Compra promedio', 'Paga con', 'Le toca', 'Qué'],
        ...vistos.map((c) => [c.nombre, telLimpio(c.telefono), c.ficha.pedidos,
          c.ficha.primera ? diaCorto(c.ficha.primera) : '', c.ficha.ultima ? diaCorto(c.ficha.ultima) : '',
          c.ficha.cada ?? '', c.ficha.gastado?.toFixed(2) ?? '', c.ficha.promedio?.toFixed(2) ?? '',
          PAGOS[c.ficha.pago] || '', c.urg ? diaCorto(c.urg.proxima) : '', c.urg?.que || '']),
      ]));
      pintar();
    },
  };
}

function hojaCliente(c, n, aviso){
  const fi = c.ficha, wa = whatsapp(c, n);
  const siempre = pedidoDeSiempre(c.pedidos);
  const ultimos = [...c.pedidos].sort((a, b) => new Date(b.creado) - new Date(a.creado)).slice(0, 8);
  const d = c.direcciones?.[0];
  const h = hoja({ titulo: c.nombre || 'Cliente', clase: 'hoja-cliente', cuerpo: `
    <p class="nota">${fi.pedidos ? `Cliente desde el ${diaCorto(fi.primera)}` : `Se registró el ${diaCorto(c.creado)} y todavía no compra`}${c.telefono ? ` · ${esc(telLimpio(c.telefono))}` : ''}</p>
    <div class="botones">
      ${wa ? `<a class="boton principal" href="${wa}" target="_blank" rel="noopener">${icono('conversaciones')}Mandarle WhatsApp</a>` : ''}
      ${c.telefono ? `<a class="boton secundario" href="tel:${esc(telLimpio(c.telefono))}">${icono('telefono')}Llamar</a>` : ''}
    </div>
    ${wa ? `<p class="nota">El mensaje va escrito, pero lo mandas tú: <i>${esc(mensajeRecompra(c, n))}</i></p>` : ''}
    ${fi.pedidos ? `<dl class="datos-cliente">
      <div><dt>Pedidos</dt><dd>${fi.pedidos}${fi.cancelados ? ` <small>(+${fi.cancelados} cancelados)</small>` : ''}</dd></div>
      <div><dt>Viene cada</dt><dd>${fi.cada ? dias(fi.cada) : '—'}${fi.nivel === 'indicio' ? ' <small>(pista)</small>' : ''}</dd></div>
      <div><dt>Gasta en promedio</dt><dd>${pesos(fi.promedio)}</dd></div>
      <div><dt>En total</dt><dd>${pesos(fi.gastado)}</dd></div>
      <div><dt>Paga con</dt><dd>${PAGOS[fi.pago] || (fi.momentoPago === 'antes' ? 'Paga antes' : 'Al recibir')}</dd></div>
      <div><dt>Última compra</dt><dd>${diaCorto(fi.ultima)}</dd></div>
    </dl>` : ''}
    <h3>Cuándo le toca</h3>
    ${c.recompras.length ? `<ul class="recompras">${c.recompras.map((r) => `<li>
        <div class="recompra-cabeza"><strong>${esc(r.nombre)}</strong>${chip({ m: r.momento })}</div>
        <p class="nota">${esc(porqueDe(r))} Le tocaría el <b>${diaCorto(r.proxima)}</b>.</p></li>`).join('')}</ul>`
      : `<p class="nota">${fi.pedidos ? 'Todavía no repite ningún producto. Con la segunda compra de lo mismo sale una pista; con la tercera, su ritmo.' : 'Sin compras todavía.'}</p>`}
    ${siempre ? `<h3>${siempre.tipo === 'siempre' ? 'Su pedido de siempre' : 'Su último pedido'}</h3>
      <ul class="resumen-lista">${siempre.renglones.map((r) => `<li><span>${r.cantidad} × ${esc(r.nombre)}</span>${siempre.tipo === 'siempre' ? `<small>en ${r.veces} pedidos</small>` : ''}</li>`).join('')}</ul>` : ''}
    ${d ? `<h3>Dónde le entregamos</h3><p>${esc([d.calle, d.colonia, d.cp].filter(Boolean).join(', '))}</p>${d.referencias ? `<p class="nota">${esc(d.referencias)}</p>` : ''}` : ''}
    ${ultimos.length ? `<h3>Últimos pedidos</h3><ul class="resumen-lista">${ultimos.map((p) =>
      `<li><span>#${p.folio} · ${esc(fecha(p.creado))}<small>${ESTADOS[p.estado]?.texto || p.estado}</small></span><b>${pesos(p.total)}</b></li>`).join('')}</ul>` : ''}
    <form data-notas class="campo">
      <label for="notas-cliente">Notas</label>
      <span class="ayuda">Sólo las ve el negocio. Por ejemplo: «pide factura», «sólo por la tarde».</span>
      <textarea id="notas-cliente" maxlength="1000">${esc(c.notas || '')}</textarea>
      <button type="submit" class="boton secundario">${icono('listo')}Guardar notas</button>
    </form>` });
  h.querySelector('[data-notas]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = e.submitter, notas = h.querySelector('#notas-cliente').value.trim();
    b.setAttribute('aria-busy', 'true'); b.disabled = true;
    try{ await guardarNotasCliente(c.id, notas); c.notas = notas; aviso('Notas guardadas'); }
    catch(err){ console.error(err); aviso(err.message, 'mal'); }
    finally{ b.removeAttribute('aria-busy'); b.disabled = false; }
  });
  return h;
}

export const PANTALLAS = { clientes };
