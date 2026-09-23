/* ══════════════════════════════════════════════════════════════════════════
   LAS PANTALLAS · una función por pantalla, con el nombre que dice rutas.js
   ──────────────────────────────────────────────────────────────────────────
   Cada función recibe { params, ruta } y devuelve { html, alMontar? }.
   Ninguna escribe un enlace a mano: todos pasan por `enlace()`, que revienta si
   la ruta no está en la tabla. Por eso aquí no hay ni un `href="#/…"` literal —
   y las pruebas lo vigilan.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace, RUTAS } from './rutas.js';
import { icono } from './iconos.js';
import { catalogo, carrito } from './datos.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Pesos mexicanos con separador de miles y sin centavos cuando son cero:
   «$1,240» se lee de un vistazo, «$1,240.00» obliga a leer dos veces. */
const pesos = (n) => '$' + n.toLocaleString('es-MX', {
  minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

const quitaAcentos = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ── Piezas que se repiten ─────────────────────────────────────────────── */

function tarjeta(p){
  const oferta = p.a ? Math.round((1 - p.p / p.a) * 100) : 0;
  return `<a class="tarjeta${p.x ? ' sin' : ''}" href="${enlace('/p/:id', { id: p.id })}">
    <div class="foto">
      <img src="${esc(p.f)}" alt="" width="480" height="480" loading="lazy" decoding="async">
      ${p.x ? '<span class="etiqueta agotado">Agotado</span>'
            : oferta >= 5 ? `<span class="etiqueta oferta">−${oferta}%</span>` : ''}
    </div>
    <div class="cuerpo">
      <span class="m">${esc(p.m)}</span>
      <span class="n">${esc(p.n)}</span>
      <span class="precio"><span class="ahora">${pesos(p.p)}</span>${p.a ? `<span class="antes">${pesos(p.a)}</span>` : ''}</span>
    </div>
  </a>`;
}

function seccion(titulo, cuerpo, { verTodo, nota } = {}){
  return `<section class="seccion">
    <header><h2>${esc(titulo)}</h2>${verTodo ? `<a class="ver-todo" href="${verTodo}">Ver todo</a>` : ''}</header>
    ${nota ? `<p class="nota">${esc(nota)}</p>` : ''}
    ${cuerpo}
  </section>`;
}

const tiraCategorias = (cats) => `<div class="tira">${cats.map((c) =>
  `<a class="cat" href="${enlace('/c/:cat', { cat: c.id })}">
     <span class="circulo">${icono(c.id)}</span>${esc(c.nombre)}</a>`).join('')}</div>`;

/* ── Portada ──────────────────────────────────────────────────────────── */
/* En orden de arriba a abajo, decidido en PLAN.md §2:
     1. buscador · 2. su pedido de siempre (o esenciales si es nuevo)
     3. categorías · 4. «te toca surtirte» · 5. ofertas · 6. sorteo
   El 4 y el 6 NO se pintan todavía, y a propósito: el 4 necesita historial de
   compras y el 6 necesita un sorteo real con su permiso de Gobernación. Pintar
   una tarjeta de sorteo que no existe es prometer lo que no hay. */
export async function portada(){
  const { categorias, productos } = await catalogo();
  const hay = productos.filter((p) => !p.x);

  /* Sin historial todavía no hay «pedido de siempre». Tampoco se inventa un «lo
     más pedido»: no hay ventas de dónde sacarlo. Lo honesto es decir lo que es —
     lo básico de cada estación de trabajo— y elegirlo con una regla a la vista. */
  const basicos = ['maquinas', 'peinado', 'barba', 'corte', 'color', 'cuidado']
    .map((c) => hay.filter((p) => p.c === c).sort((a, b) => a.p - b.p)[Math.floor(hay.filter((p) => p.c === c).length / 3)])
    .filter(Boolean);

  const ofertas = hay.filter((p) => p.a)
    .sort((a, b) => (1 - b.p / b.a) - (1 - a.p / a.a)).slice(0, 12);

  return { html: `
    <a class="buscador" href="${enlace('/buscar')}">${icono('buscar')}<span>¿Qué necesitas?</span></a>
    ${seccion('Lo básico de la barbería', `<div class="carril">${basicos.map(tarjeta).join('')}</div>`,
      { nota: 'Uno de cada cosa que se usa todos los días. Cuando compres, aquí va a salir tu pedido de siempre.' })}
    ${seccion('Categorías', tiraCategorias(categorias))}
    ${seccion('Ofertas', `<div class="carril">${ofertas.map(tarjeta).join('')}</div>`)}
  ` };
}

/* ── Buscar ───────────────────────────────────────────────────────────── */
export async function buscar(){
  const { productos } = await catalogo();
  return {
    html: `
      <label class="buscador">${icono('buscar')}
        <span class="oculto">Buscar productos</span>
        <input id="q" type="search" inputmode="search" autocomplete="off" placeholder="Nombre, marca o para qué sirve" autofocus>
      </label>
      <div id="resultados" class="seccion"></div>`,
    alMontar(raiz){
      const q = raiz.querySelector('#q');
      const res = raiz.querySelector('#resultados');
      const indice = productos.map((p) => [quitaAcentos(p.n + ' ' + p.m), p]);
      const pinta = () => {
        const palabras = quitaAcentos(q.value).split(/\s+/).filter(Boolean);
        if(!palabras.length){
          res.innerHTML = `<p class="vacio">Escribe lo que buscas. Por ejemplo: <b>cera</b>, <b>Wahl</b> o <b>tinte</b>.</p>`;
          return;
        }
        const hallados = indice.filter(([t]) => palabras.every((w) => t.includes(w))).map(([, p]) => p);
        res.innerHTML = hallados.length
          ? `<p class="nota">${hallados.length} ${hallados.length === 1 ? 'producto' : 'productos'}</p><div class="rejilla">${hallados.slice(0, 60).map(tarjeta).join('')}</div>`
          : `<p class="vacio">No encontramos «${esc(q.value)}». Prueba con menos palabras o con la marca.</p>`;
      };
      q.addEventListener('input', pinta);
      pinta();
    },
  };
}

/* ── Categoría ────────────────────────────────────────────────────────── */
export async function categoria({ params }){
  const { categorias, productos } = await catalogo();
  const cat = categorias.find((c) => c.id === params.cat);
  if(!cat) return noexiste();
  /* Lo que hay primero, lo agotado al final: nadie quiere recorrer diez
     productos que no puede comprar para llegar al que sí. */
  const suyos = productos.filter((p) => p.c === cat.id).sort((a, b) => (a.x || 0) - (b.x || 0));
  return {
    titulo: cat.nombre,
    html: `<p class="nota">${suyos.length} productos</p><div class="rejilla">${suyos.map(tarjeta).join('')}</div>`,
  };
}

/* ── Producto ─────────────────────────────────────────────────────────── */
export async function producto({ params }){
  const { categorias, productos } = await catalogo();
  const p = productos.find((x) => x.id === params.id);
  if(!p) return noexiste();
  const cat = categorias.find((c) => c.id === p.c);
  const parecidos = productos.filter((x) => x.c === p.c && x.id !== p.id && !x.x).slice(0, 8);
  return {
    titulo: cat ? cat.nombre : 'Producto',
    html: `
      <div class="ficha">
        <div class="foto-grande"><img src="${esc(p.f)}" alt="${esc(p.n)}" width="480" height="480" decoding="async"></div>
        <div>
          <span class="m" style="color:var(--tinta-suave);font-weight:650;letter-spacing:.05em;text-transform:uppercase;font-size:14px">${esc(p.m)}</span>
          <h2>${esc(p.n)}</h2>
          <div class="precio"><span class="ahora">${pesos(p.p)}</span>${p.a ? `<span class="antes">${pesos(p.a)}</span>` : ''}</div>
          ${p.x ? '<div class="disponible no">Agotado por ahora</div>' : '<div class="disponible si">Disponible</div>'}
          <button class="boton principal ancho" data-agregar="${esc(p.id)}" ${p.x ? 'disabled' : ''}>
            ${icono('carrito')}${p.x ? 'No disponible' : 'Agregar al carrito'}</button>
        </div>
      </div>
      ${parecidos.length ? seccion('Va bien con esto', `<div class="carril">${parecidos.map(tarjeta).join('')}</div>`) : ''}`,
    alMontar(raiz, { aviso }){
      const b = raiz.querySelector('[data-agregar]');
      b?.addEventListener('click', () => {
        carrito.agregar(p.id);
        aviso(`Agregado · llevas ${carrito.piezas()} en el carrito`);
      });
    },
  };
}

/* ── Carrito ──────────────────────────────────────────────────────────── */
export async function carritoPantalla(){
  const { productos } = await catalogo();
  const porId = new Map(productos.map((p) => [p.id, p]));
  return {
    html: `<div id="lista"></div>`,
    alMontar(raiz){
      const lista = raiz.querySelector('#lista');
      const pinta = () => {
        const renglones = carrito.renglones().filter(([id]) => porId.has(id));
        if(!renglones.length){
          lista.innerHTML = `<div class="aviso">
            <span class="circulo">${icono('carrito')}</span>
            <h2>Tu carrito está vacío</h2>
            <p>Empieza por lo básico o busca lo que necesitas.</p>
            <div class="botones">
              <a class="boton principal" href="${enlace('/')}">Ver productos</a>
              <a class="boton secundario" href="${enlace('/buscar')}">Buscar</a>
            </div></div>`;
          return;
        }
        let total = 0;
        lista.innerHTML = renglones.map(([id, n]) => {
          const p = porId.get(id); total += p.p * n;
          return `<div class="renglon">
            <a href="${enlace('/p/:id', { id })}"><img src="${esc(p.f)}" alt="" width="76" height="76" loading="lazy"></a>
            <div>
              <div class="n">${esc(p.n)}</div>
              <div class="precio"><span class="ahora" style="font-size:18px">${pesos(p.p * n)}</span></div>
              <div class="cantidad">
                <button data-menos="${esc(id)}" aria-label="Quitar uno">${icono(n === 1 ? 'cerrar' : 'menos')}</button>
                <output>${n}</output>
                <button data-mas="${esc(id)}" aria-label="Agregar uno">${icono('mas')}</button>
              </div>
            </div></div>`;
        }).join('') + `<div class="resumen">
            <div class="total"><span>${carrito.piezas()} ${carrito.piezas() === 1 ? 'pieza' : 'piezas'}</span><strong>${pesos(total)}</strong></div>
            <a class="boton principal ancho" href="${enlace('/pagar')}">Continuar</a>
          </div>`;
      };
      lista.addEventListener('click', (e) => {
        const mas = e.target.closest('[data-mas]'); const menos = e.target.closest('[data-menos]');
        if(mas) carrito.agregar(mas.dataset.mas);
        if(menos) carrito.quitar(menos.dataset.menos);
        if(mas || menos) pinta();
      });
      pinta();
    },
  };
}

/* ── En obra: dice qué va a ser, no «próximamente» ─────────────────────── */
export function obra({ ruta }){
  const inicio = RUTAS.find((r) => r.apartado === ruta.apartado && r.menu);
  return { html: `<div class="aviso">
    <span class="circulo">${icono(ruta.icono)}</span>
    <h2>${esc(ruta.titulo)}</h2>
    <p>${esc(ruta.promesa)}</p>
    <span class="bloque">Se construye en el bloque ${ruta.bloque} de 14</span>
    <div class="botones">
      <button class="boton secundario" data-atras>${icono('atras')}Regresar</button>
      ${inicio && inicio.ruta !== ruta.ruta ? `<a class="boton principal" href="${enlace(inicio.ruta)}">Ir a ${esc(inicio.titulo)}</a>` : ''}
    </div></div>` };
}

/* ── No existe: tampoco es un callejón ────────────────────────────────── */
export function noexiste(){
  return { titulo: 'No encontrado', html: `<div class="aviso">
    <span class="circulo">${icono('buscar')}</span>
    <h2>Esta página no existe</h2>
    <p>Puede que el enlace esté viejo o incompleto.</p>
    <div class="botones"><a class="boton principal" href="${enlace('/')}">Ir al inicio</a></div></div>` };
}

/* El nombre que usa rutas.js → la función. `carrito` en la tabla es
   `carritoPantalla` aquí para no chocar con el objeto del carrito — y las
   pruebas comprueban que cada `pantalla` de la tabla esté en este mapa. */
export const PANTALLAS = { portada, buscar, categoria, producto, carrito: carritoPantalla, obra, noexiste };
