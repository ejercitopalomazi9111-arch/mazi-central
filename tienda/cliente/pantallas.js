/* ══════════════════════════════════════════════════════════════════════════
   LA TIENDA DEL CLIENTE · una función por pantalla, con el nombre de rutas.js
   ──────────────────────────────────────────────────────────────────────────
   Cada función recibe { params, ruta } y devuelve { html, titulo?, alMontar? }.
   Ninguna escribe un enlace a mano: todos pasan por `enlace()`, que revienta si
   la ruta no está en la tabla — y las pruebas vigilan que no haya `href="#/`.

   Lo que el cliente pidió ver (PLAN.md §2): productos, buscador, qué queda,
   precio, características, descripción y recomendaciones. Las existencias son
   las REALES de la base: «quedan 3» sólo se dice cuando quedan 3.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, quitaAcentos, plural, estado } from '../nucleo/piezas.js';
import { catalogo, carrito, misPedidos } from '../nucleo/datos.js';
import { pedidoDeSiempre, teToca, validos, diaCorto, dias } from '../nucleo/recompra.js';

/* Lo que ha comprado quien está viendo. Sin sesión, nada — y NO se crea una:
   la sesión nace al pagar, nunca por mirar la portada. */
const historial = () => misPedidos().catch((e) => { console.error(e); return []; });

/* A partir de cuántas se avisa que quedan pocas. Es de la tienda y no del
   producto a propósito: el mínimo del producto es para el admin (reordenar),
   no para meterle prisa al cliente. */
const POCAS = 5;

/* ── Piezas que se repiten ─────────────────────────────────────────────── */

function tarjeta(p){
  const oferta = p.a ? Math.round((1 - p.p / p.a) * 100) : 0;
  return `<a class="producto${p.x ? ' sin' : ''}" href="${enlace('/p/:id', { id: p.id })}">
    <div class="foto">
      <img src="${esc(p.f)}" alt="" width="480" height="480" loading="lazy" decoding="async">
      ${p.x ? '<span class="marca-foto agotado">Agotado</span>'
            : oferta >= 5 ? `<span class="marca-foto oferta">−${oferta}%</span>` : ''}
    </div>
    <div class="cuerpo">
      <span class="m">${esc(p.m)}</span>
      <span class="n">${esc(p.n)}</span>
      <span class="precio"><span class="ahora">${pesos(p.p)}</span>${p.a ? `<span class="antes">${pesos(p.a)}</span>` : ''}</span>
      ${!p.x && p.q <= POCAS ? `<span class="quedan">${p.q === 1 ? 'Queda 1' : `Quedan ${p.q}`}</span>` : ''}
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
     <span class="circulo">${icono(c.icono)}</span>${esc(c.nombre)}</a>`).join('')}</div>`;

/* Qué tanto hay, dicho con palabras y con color — nunca sólo color. */
function existencia(p){
  if(p.x) return '<p class="existencia no">Agotado por ahora</p>';
  if(p.q <= POCAS) return `<p class="existencia poco">${p.q === 1 ? 'Queda 1' : `Quedan ${p.q}`}</p>`;
  return '<p class="existencia si">Disponible</p>';
}

/* ── Portada ──────────────────────────────────────────────────────────── */
/* En orden de arriba a abajo, decidido en PLAN.md §2:
     1. buscador · 2. su pedido de siempre (o lo básico si es nuevo)
     3. categorías · 4. «te toca surtirte» · 5. ofertas · 6. sorteo
   El 2 y el 4 salen de SUS compras (nucleo/recompra.js) y cada uno dice en qué
   se basa. El 6 no se pinta hasta que haya un sorteo real con su permiso de
   Gobernación (Bloque 11): pintar uno que no existe es prometer lo que no hay. */

/* Un renglón con foto para las secciones que son de ESTE cliente. */
function renglonMio(p, { cantidad, razon, boton }){
  return `<li class="mio${p.x ? ' sin' : ''}">
    <a href="${enlace('/p/:id', { id: p.id })}"><img src="${esc(p.f)}" alt="" width="64" height="64" loading="lazy"></a>
    <div class="texto"><a class="n" href="${enlace('/p/:id', { id: p.id })}">${cantidad > 1 ? `${cantidad} × ` : ''}${esc(p.n)}</a>
      <small>${p.x ? 'Agotado por ahora' : esc(razon)}</small></div>
    ${p.x ? '' : boton}
  </li>`;
}

/* Agrega lo que cabe: si pide 3 y quedan 2, van 2 y se dice. */
function agregarLoQueCabe(p, n){
  const cabe = Math.max(0, Math.min(n, p.q - carrito.cuantas(p.id)));
  if(cabe) carrito.agregar(p.id, cabe);
  return cabe;
}

export async function portada(){
  const [{ categorias, productos, porId }, mios] = await Promise.all([catalogo(), historial()]);
  const hay = productos.filter((p) => !p.x);

  /* Sin historial no hay «pedido de siempre»: lo honesto es decir lo que es
     —lo básico de cada categoría— y elegirlo con una regla a la vista. */
  const basicos = categorias.map((c) => {
    const suyos = hay.filter((p) => p.c === c.id).sort((a, b) => a.p - b.p);
    return suyos[Math.floor(suyos.length / 2)];
  }).filter(Boolean);

  const siempre = pedidoDeSiempre(mios);
  const deSiempre = siempre ? siempre.renglones.map((r) => ({ ...r, p: porId.get(r.producto_id) })).filter((r) => r.p) : [];
  const siempreTotal = deSiempre.filter((r) => !r.p.x).reduce((t, r) => t + r.p.p * Math.min(r.cantidad, r.p.q), 0);
  const toca = teToca(mios).map((r) => ({ ...r, p: porId.get(r.producto_id) })).filter((r) => r.p);

  const ofertas = hay.filter((p) => p.a)
    .sort((a, b) => (1 - b.p / b.a) - (1 - a.p / a.a)).slice(0, 12);

  const bloqueSiempre = deSiempre.length
    ? seccion(siempre.tipo === 'siempre' ? 'Tu pedido de siempre' : 'Tu último pedido',
      `<ul class="mios">${deSiempre.map((r) => renglonMio(r.p, { cantidad: r.cantidad,
          razon: siempre.tipo === 'siempre' ? `Lo has pedido ${r.veces} veces · ${pesos(r.p.p)} c/u` : pesos(r.p.p) + ' c/u', boton: '' })).join('')}</ul>
       ${siempreTotal ? `<button class="boton principal ancho grande" data-siempre>${icono('repetir')}Pedir ${siempre.tipo === 'siempre' ? 'lo de siempre' : 'lo mismo'} · ${pesos(siempreTotal)}</button>` : ''}`,
      { nota: siempre.tipo === 'siempre' ? 'Lo que se repite en tus pedidos, en la cantidad que sueles llevar.' : 'Cuando repitas algo, aquí va a salir tu pedido de siempre.' })
    : seccion('Lo básico', `<div class="carril">${basicos.map(tarjeta).join('')}</div>`,
      { nota: 'Uno de cada categoría. Cuando compres, aquí va a salir tu pedido de siempre.' });

  const bloqueToca = toca.length ? seccion('Te toca surtirte',
    `<ul class="mios">${toca.slice(0, 6).map((r) => renglonMio(r.p, {
        razon: `${r.nivel === 'ritmo' ? `Lo compras cada ${dias(r.cada)}` : `Entre tus 2 compras pasaron ${dias(r.cada)}`} · la última el ${diaCorto(r.ultima)}`,
        boton: `<button class="boton secundario" data-toca="${esc(r.p.id)}" data-cuantas="${Math.max(1, Math.round(r.tipica))}" aria-label="Agregar ${esc(r.p.n)}">${icono('agregar')}<span>Agregar</span></button>` })).join('')}</ul>`,
    { verTodo: enlace('/cuenta'), nota: 'Según cada cuándo lo compras. En «Mi cuenta» ves el detalle.' }) : '';

  return { html: `
    <a class="buscador" href="${enlace('/buscar')}">${icono('buscar')}<span>¿Qué necesitas?</span></a>
    ${bloqueSiempre}
    ${seccion('Categorías', tiraCategorias(categorias))}
    ${bloqueToca}
    ${ofertas.length ? seccion('Ofertas', `<div class="carril">${ofertas.map(tarjeta).join('')}</div>`) : ''}
  `,
  alMontar(raiz, { aviso }){
    raiz.querySelector('[data-siempre]')?.addEventListener('click', () => {
      let puestas = 0; const faltaron = [];
      for(const r of deSiempre){
        if(r.p.x){ faltaron.push(r.p.n); continue; }
        const n = agregarLoQueCabe(r.p, r.cantidad);
        puestas += n; if(n < r.cantidad) faltaron.push(r.p.n);
      }
      aviso(faltaron.length ? `Agregamos ${plural(puestas, 'pieza', 'piezas')}. No alcanzó: ${faltaron.join(', ')}` : `Listo · llevas ${plural(carrito.piezas(), 'pieza', 'piezas')}`, faltaron.length ? 'mal' : undefined);
    });
    raiz.querySelectorAll('[data-toca]').forEach((b) => b.addEventListener('click', () => {
      const p = porId.get(b.dataset.toca);
      const n = agregarLoQueCabe(p, Number(b.dataset.cuantas));
      aviso(n ? `Agregado · llevas ${plural(carrito.piezas(), 'pieza', 'piezas')}` : 'Ya llevas todas las que hay', n ? undefined : 'mal');
    }));
  } };
}

/* ── Buscar ───────────────────────────────────────────────────────────── */
/* Sin acentos y por palabras sueltas en cualquier orden: «cera mate» encuentra
   «Cera Mate Reuzel». Busca también en la marca y en el nombre de la categoría,
   que es como la gente pregunta («algo para la barba»). */
export async function buscar(){
  const { productos, categorias } = await catalogo();
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
  const indice = productos.map((p) => [quitaAcentos(`${p.n} ${p.m} ${nombreCat.get(p.c) || ''} ${p.sku || ''}`), p]);
  return {
    html: `
      <label class="buscador">${icono('buscar')}
        <span class="oculto">Buscar productos</span>
        <input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Nombre, marca o para qué sirve">
      </label>
      <div id="resultados" class="seccion" aria-live="polite"></div>`,
    alMontar(raiz){
      const q = raiz.querySelector('#q');
      const res = raiz.querySelector('#resultados');
      const pinta = () => {
        const palabras = quitaAcentos(q.value).split(/\s+/).filter(Boolean);
        if(!palabras.length){
          res.innerHTML = `<p class="nota">Escribe lo que buscas. Por ejemplo: <b>cera</b>, <b>Wahl</b> o <b>barba</b>.</p>`;
          return;
        }
        const hallados = indice.filter(([t]) => palabras.every((w) => t.includes(w))).map(([, p]) => p)
          .sort((a, b) => (a.x || 0) - (b.x || 0));
        res.innerHTML = hallados.length
          ? `<p class="nota">${plural(hallados.length, 'producto', 'productos')}</p><div class="rejilla">${hallados.slice(0, 60).map(tarjeta).join('')}</div>`
          : estado({ icono: 'buscar', titulo: `No encontramos «${q.value.trim()}»`,
              texto: 'Prueba con menos palabras, con la marca o con la categoría.',
              botones: `<a class="boton secundario" href="${enlace('/')}">Ver categorías</a>` });
      };
      q.addEventListener('input', pinta);
      pinta();
      q.focus({ preventScroll: true });
    },
  };
}

/* ── Categoría ────────────────────────────────────────────────────────── */
const ORDENES = {
  sugerido: { nombre: 'Sugerido', f: (a, b) => (a.x || 0) - (b.x || 0) },
  barato:   { nombre: 'Menor precio', f: (a, b) => (a.x || 0) - (b.x || 0) || a.p - b.p },
  caro:     { nombre: 'Mayor precio', f: (a, b) => (a.x || 0) - (b.x || 0) || b.p - a.p },
  ofertas:  { nombre: 'Ofertas', f: (a, b) => (a.x || 0) - (b.x || 0) || (b.a ? 1 - b.p / b.a : 0) - (a.a ? 1 - a.p / a.a : 0) },
};
export async function categoria({ params }){
  const { categorias, productos } = await catalogo();
  const cat = categorias.find((c) => c.id === params.cat);
  if(!cat) return noEncontrado('Esta categoría no existe', 'Puede que se haya renombrado.');
  const suyos = productos.filter((p) => p.c === cat.id);
  /* Filtro por marca: el campo que TODOS los productos tienen. Los de la
     plantilla (tono, contenido…) entran solos cuando el catálogo real los traiga. */
  const marcas = [...new Set(suyos.map((p) => p.m).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  return {
    titulo: cat.nombre,
    html: `
      <div class="filtros">
        <div class="segmentos" role="group" aria-label="Ordenar">
          ${Object.entries(ORDENES).map(([k, o], i) => `<button type="button" data-orden="${k}" aria-pressed="${i === 0}">${o.nombre}</button>`).join('')}
        </div>
        ${marcas.length > 1 ? `<label class="campo compacto"><span class="oculto">Marca</span>
          <select id="marca"><option value="">Todas las marcas</option>${marcas.map((m) => `<option>${esc(m)}</option>`).join('')}</select></label>` : ''}
      </div>
      <p class="nota" id="cuantos"></p>
      <div class="rejilla" id="lista"></div>`,
    alMontar(raiz){
      let orden = 'sugerido';
      const $lista = raiz.querySelector('#lista'), $cuantos = raiz.querySelector('#cuantos'), $marca = raiz.querySelector('#marca');
      const pinta = () => {
        const m = $marca?.value || '';
        const vistos = suyos.filter((p) => !m || p.m === m).sort(ORDENES[orden].f);
        $cuantos.textContent = plural(vistos.length, 'producto', 'productos');
        $lista.innerHTML = vistos.map(tarjeta).join('');
      };
      raiz.querySelector('.segmentos').addEventListener('click', (e) => {
        const b = e.target.closest('[data-orden]'); if(!b) return;
        orden = b.dataset.orden;
        raiz.querySelectorAll('[data-orden]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        pinta();
      });
      $marca?.addEventListener('change', pinta);
      pinta();
    },
  };
}

/* ── Producto ─────────────────────────────────────────────────────────── */
export async function producto({ params }){
  const [{ categorias, productos, porId }, mios] = await Promise.all([catalogo(), historial()]);
  const p = porId.get(params.id);
  if(!p) return noEncontrado('Este producto ya no está', 'Puede que se haya dejado de vender.');
  // La última vez que ESTE cliente lo pidió (lo cancelado no cuenta).
  const ultimaVez = validos(mios).reverse().find((x) => (x.renglones || []).some((r) => r.producto_id === p.id));
  const cuantasVez = ultimaVez ? ultimaVez.renglones.filter((r) => r.producto_id === p.id).reduce((t, r) => t + r.cantidad, 0) : 0;
  const cat = categorias.find((c) => c.id === p.c);
  /* «Va bien con esto»: de su misma categoría y en un rango de precio parecido;
     si no alcanzan, de otras categorías que se compran junto (la siguiente en
     el orden del catálogo). Nada de «los clientes también compraron» hasta que
     haya compras de dónde sacarlo. */
  const parecidos = productos.filter((x) => x.c === p.c && x.id !== p.id && !x.x)
    .sort((a, b) => Math.abs(a.p - p.p) - Math.abs(b.p - p.p)).slice(0, 8);
  const campos = (cat?.plantilla || []).filter((c) => p.campos?.[c.clave] != null && p.campos[c.clave] !== '');
  const tope = p.q;
  return {
    titulo: cat ? cat.nombre : 'Producto',
    html: `
      <div class="ficha">
        <div>
          <div class="foto-grande"><img id="foto" src="${esc(p.f)}" alt="${esc(p.n)}" width="480" height="480" decoding="async"></div>
          ${p.fotos.length > 1 ? `<div class="miniaturas">${p.fotos.map((f, i) => `<button type="button" data-foto="${esc(f)}" aria-label="Foto ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(f)}" alt="" width="64" height="64" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div>
          <p class="marca-producto">${esc(p.m)}</p>
          <h2>${esc(p.n)}</h2>
          <div class="precio"><span class="ahora">${pesos(p.p)}</span>${p.a ? `<span class="antes">${pesos(p.a)}</span>` : ''}</div>
          ${existencia(p)}
          ${ultimaVez ? `<p class="ultima-vez">${icono('repetir')}<span>La última vez lo pediste el ${diaCorto(ultimaVez.creado)} · ${plural(cuantasVez, 'pieza', 'piezas')}</span></p>` : ''}
          ${p.x ? '' : `<div class="comprar">
            <div class="cantidad" role="group" aria-label="Cantidad">
              <button type="button" data-menos aria-label="Una menos">${icono('menos')}</button>
              <output id="n" aria-live="polite">1</output>
              <button type="button" data-mas aria-label="Una más">${icono('mas')}</button>
            </div>
            <button class="boton principal" data-agregar>${icono('carrito')}Agregar</button>
          </div>`}
          ${p.d ? `<p class="descripcion">${esc(p.d)}</p>` : ''}
          ${campos.length ? `<dl class="campos-producto">${campos.map((c) => `<dt>${esc(c.etiqueta)}</dt><dd>${esc(p.campos[c.clave])}</dd>`).join('')}</dl>` : ''}
          ${p.sku ? `<p class="nota chica">Clave ${esc(p.sku)}</p>` : ''}
        </div>
      </div>
      ${parecidos.length ? seccion('Va bien con esto', `<div class="carril">${parecidos.map(tarjeta).join('')}</div>`) : ''}`,
    alMontar(raiz, { aviso }){
      raiz.querySelector('.miniaturas')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-foto]'); if(!b) return;
        raiz.querySelector('#foto').src = b.dataset.foto;
        raiz.querySelectorAll('[data-foto]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      });
      if(p.x) return;
      let n = 1;
      const $n = raiz.querySelector('#n');
      /* Lo que ya lleva en el carrito cuenta contra lo que queda: si quedan 3 y
         ya lleva 2, aquí sólo puede sumar 1. */
      const libre = () => Math.max(0, tope - carrito.cuantas(p.id));
      const pinta = () => {
        $n.textContent = n;
        raiz.querySelector('[data-menos]').disabled = n <= 1;
        raiz.querySelector('[data-mas]').disabled = n >= libre();
        raiz.querySelector('[data-agregar]').disabled = libre() === 0;
      };
      raiz.querySelector('[data-menos]').addEventListener('click', () => { n = Math.max(1, n - 1); pinta(); });
      raiz.querySelector('[data-mas]').addEventListener('click', () => { n = Math.min(libre(), n + 1); pinta(); });
      raiz.querySelector('[data-agregar]').addEventListener('click', () => {
        const cabe = Math.min(n, libre());
        if(!cabe){ aviso('Ya llevas todas las que hay', 'mal'); return; }
        carrito.agregar(p.id, cabe);
        aviso(`Agregado · llevas ${plural(carrito.piezas(), 'pieza', 'piezas')}`);
        n = 1; pinta();
      });
      pinta();
    },
  };
}

/* ── Carrito ──────────────────────────────────────────────────────────── */
export async function carritoPantalla(){
  const { porId } = await catalogo();
  return {
    html: `<div id="lista"></div>`,
    alMontar(raiz){
      const lista = raiz.querySelector('#lista');
      const pinta = () => {
        /* Lo que ya no existe o se agotó sale del carrito con aviso, no en silencio:
           cobrar algo que no hay es peor que decirlo. */
        const quitados = [];
        for(const [id, n] of carrito.renglones()){
          const p = porId.get(id);
          if(!p || p.x){ quitados.push(p?.n || 'un producto'); carrito.poner(id, 0); }
          else if(n > p.q){ carrito.poner(id, p.q); }
        }
        const renglones = carrito.renglones();
        if(!renglones.length){
          lista.innerHTML = estado({ icono: 'carrito', titulo: 'Tu carrito está vacío',
            texto: quitados.length ? `Quitamos ${quitados.join(', ')}: se agotó.` : 'Empieza por lo básico o busca lo que necesitas.',
            botones: `<a class="boton principal" href="${enlace('/')}">Ver productos</a><a class="boton secundario" href="${enlace('/buscar')}">Buscar</a>` });
          return;
        }
        let total = 0;
        lista.innerHTML = (quitados.length ? `<p class="aviso-linea">${icono('alerta')}Quitamos ${esc(quitados.join(', '))}: se agotó.</p>` : '')
          + '<div class="carrito-rejilla"><div class="renglones">' + renglones.map(([id, n]) => {
            const p = porId.get(id); total += p.p * n;
            return `<div class="renglon">
              <a href="${enlace('/p/:id', { id })}"><img src="${esc(p.f)}" alt="" width="76" height="76" loading="lazy"></a>
              <div>
                <a class="n" href="${enlace('/p/:id', { id })}">${esc(p.n)}</a>
                <div class="precio"><span class="ahora">${pesos(p.p * n)}</span>${n > 1 ? `<span class="nota chica">${pesos(p.p)} c/u</span>` : ''}</div>
                <div class="cantidad" role="group" aria-label="Cantidad de ${esc(p.n)}">
                  <button type="button" data-menos="${esc(id)}" aria-label="${n === 1 ? 'Quitar del carrito' : 'Una menos'}">${icono(n === 1 ? 'borrar' : 'menos')}</button>
                  <output>${n}</output>
                  <button type="button" data-mas="${esc(id)}" aria-label="Una más" ${n >= p.q ? 'disabled' : ''}>${icono('mas')}</button>
                </div>
              </div></div>`;
          }).join('') + `</div><div class="resumen">
            <div class="total"><span>${plural(carrito.piezas(), 'pieza', 'piezas')}</span><strong>${pesos(total)}</strong></div>
            <a class="boton principal ancho grande" href="${enlace('/pagar')}">Continuar</a>
          </div></div>`;
      };
      lista.addEventListener('click', (e) => {
        const mas = e.target.closest('[data-mas]'), menos = e.target.closest('[data-menos]');
        if(mas){ const p = porId.get(mas.dataset.mas); if(carrito.cuantas(p.id) < p.q) carrito.agregar(p.id); }
        if(menos) carrito.quitar(menos.dataset.menos);
        if(mas || menos) pinta();
      });
      pinta();
    },
  };
}

function noEncontrado(titulo, texto){
  return { titulo: 'No encontrado', html: estado({ icono: 'buscar', titulo, texto,
    botones: `<a class="boton principal" href="${enlace('/')}">Ir al inicio</a><a class="boton secundario" href="${enlace('/buscar')}">Buscar</a>` }) };
}

/* El nombre que usa rutas.js → la función. `carrito` en la tabla es
   `carritoPantalla` aquí para no chocar con el objeto del carrito — y las
   pruebas comprueban que cada `pantalla` de la tabla esté en algún mapa. */
export const PANTALLAS = { portada, buscar, categoria, producto, carrito: carritoPantalla };
