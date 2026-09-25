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
import { esc, pesos, quitaAcentos, plural, estado, hoja } from '../nucleo/piezas.js';
import { catalogo, carrito, misPedidos, negocio, memoria } from '../nucleo/datos.js';
import { tarjeta, foto, botonFavorito, POCAS } from './tarjeta.js';
import { envioGratis, bajoDesde, comprados } from '../nucleo/memoria.js';
import { aCentavos } from '../nucleo/dinero.js';
import { waNegocio, ligaProducto } from './contacto.js';
import { hojaEscaner, puedeEscanear } from '../venta/pantallas.js';
import { pedidoDeSiempre, teToca, validos, diaCorto, dias } from '../nucleo/recompra.js';
import { SINONIMOS } from '../nucleo/bot.js';
import { sorteoDelMes, tarjetaSorteo } from './sorteo.js';
import { avance } from '../nucleo/sorteo.js';

/* Lo que ha comprado quien está viendo. Sin sesión, nada — y NO se crea una:
   la sesión nace al pagar, nunca por mirar la portada. */
const historial = () => misPedidos().catch((e) => { console.error(e); return []; });

/* ── Piezas que se repiten ─────────────────────────────────────────────── */
/* La tarjeta, la foto y el corazón viven en tarjeta.js: una sola para toda la tienda. */

/* «en efectivo al recibir, con tarjeta al recibir o por transferencia» — de Ajustes. */
function formasPago(n){
  const g = n.ajustes?.pagos || {};
  const l = [g.efectivo !== false && 'en efectivo al recibir', g.tarjeta && 'con tarjeta al recibir', g.transferencia && 'por transferencia'].filter(Boolean);
  return l.length > 1 ? l.slice(0, -1).join(', ') + ' o ' + l.at(-1) : l[0] || '';
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
   se basa. El 6 sólo sale si hay un sorteo ACTIVO este mes, y uno activo ya
   trae su permiso de Gobernación: la base no deja activarlo sin él. */

/* Un renglón con foto para las secciones que son de ESTE cliente. */
function renglonMio(p, { cantidad, razon, boton }){
  return `<li class="mio${p.x ? ' sin' : ''}">
    <a href="${enlace('/p/:id', { id: p.id })}">${foto(p, 64, 64, 'loading="lazy"')}</a>
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
  const [{ categorias, productos, porId }, mios, sorteo] = await Promise.all([catalogo(), historial(), sorteoDelMes()]);
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

  const vistos = memoria.vistos.todos().map((id) => porId.get(id)).filter(Boolean).slice(0, 12);
  const ofertas = hay.filter((p) => p.a)
    .sort((a, b) => (1 - b.p / b.a) - (1 - a.p / a.a)).slice(0, 12);

  const bloqueSiempre = deSiempre.length
    ? seccion(siempre.tipo === 'siempre' ? 'Tu pedido de siempre' : 'Tu último pedido',
      `<ul class="mios">${deSiempre.map((r) => renglonMio(r.p, { cantidad: r.cantidad,
          razon: siempre.tipo === 'siempre' ? `Lo has pedido ${r.veces} veces · ${pesos(r.p.p)} c/u` : pesos(r.p.p) + ' c/u', boton: '' })).join('')}</ul>
       ${siempreTotal ? `<button class="boton principal ancho grande" data-siempre>${icono('repetir')}Pedir ${siempre.tipo === 'siempre' ? 'lo de siempre' : 'lo mismo'} · ${pesos(siempreTotal)}</button>` : ''}`,
      { nota: siempre.tipo === 'siempre' ? 'Lo que se repite en tus pedidos, en la cantidad que sueles llevar.' : 'Cuando repitas algo, aquí va a salir tu pedido de siempre.' })
    : seccion('Lo básico', `<div class="carril">${basicos.map(tarjeta).join('')}</div>`,
      { nota: 'Cuando compres, aquí sale tu pedido de siempre.' });

  const bloqueToca = toca.length ? seccion('Te toca surtirte',
    `<ul class="mios">${toca.slice(0, 6).map((r) => renglonMio(r.p, {
        razon: `${r.nivel === 'ritmo' ? `Lo compras cada ${dias(r.cada)}` : `Entre tus 2 compras pasaron ${dias(r.cada)}`} · la última el ${diaCorto(r.ultima)}`,
        boton: `<button class="boton secundario" data-toca="${esc(r.p.id)}" data-cuantas="${Math.max(1, Math.round(r.tipica))}" aria-label="Agregar ${esc(r.p.n)}">${icono('agregar')}<span>Agregar</span></button>` })).join('')}</ul>`,
    { verTodo: enlace('/cuenta'), nota: 'Según cada cuándo lo compras. En «Mi cuenta» ves el detalle.' }) : '';

  const env = (await negocio()).ajustes?.envio || {};
  const confianza = [
    env.gratis_desde != null && Number(env.costo) ? ['camion', `Envío gratis desde ${pesos(env.gratis_desde)}`] : env.costo != null ? ['camion', 'Envío a domicilio'] : null,
    env.recoger !== false ? ['tienda', 'O pasa a recoger'] : null,
    ['efectivo', 'Pagas al recibir'],
  ].filter(Boolean);
  return { html: `
    <ul class="confianza">${confianza.map(([ic, t]) => `<li>${icono(ic)}<span>${t}</span></li>`).join('')}</ul>
    <section class="seccion primera" aria-label="Categorías">${tiraCategorias(categorias)}</section>
    ${bloqueSiempre}
    ${bloqueToca}
    ${vistos.length ? seccion('Vistos recientemente', `<div class="carril">${vistos.map(tarjeta).join('')}</div>`, { verTodo: enlace('/favoritos') }) : ''}
    ${ofertas.length ? seccion('Ofertas', `<div class="carril">${ofertas.map(tarjeta).join('')}</div>`) : ''}
    ${sorteo ? `<section class="seccion">${tarjetaSorteo(sorteo, avance(mios, sorteo))}</section>` : ''}
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
  // Dos textos por producto: el suyo (nombre y marca) y el de su categoría.
  // Salen primero los que traen la palabra en el NOMBRE; los que sólo
  // coinciden por categoría («algo para la barba») van después.
  const indice = productos.map((p) => ({ p, propio: ' ' + quitaAcentos(`${p.n} ${p.m} ${p.sku || ''}`), cat: ' ' + quitaAcentos(nombreCat.get(p.c) || '') }));
  const n = await negocio();
  // Los ejemplos salen del catálogo de ESTE negocio: dos categorías y la marca
  // que más tiene. Escribirlos a mano los amarraba a un solo giro.
  const cuenta = new Map(); for(const p of productos) if(p.m) cuenta.set(p.m, (cuenta.get(p.m) || 0) + 1);
  const marca = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const ejemplos = [categorias[0], marca, categorias[1]].map((x) => typeof x === 'string' ? x : x?.nombre.split(/\s+/)[0]).filter(Boolean).map((x) => x.toLowerCase());
  const grupos = [...SINONIMOS, ...(n.ajustes?.bot?.sinonimos || [])].map((g) => g.map(quitaAcentos));
  return {
    html: `
      <div class="buscar-fila">
        <label class="buscador">${icono('buscar')}
          <span class="oculto">Buscar productos</span>
          <input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Nombre, marca o para qué sirve">
        </label>
        ${puedeEscanear() ? `<button type="button" class="boton secundario" data-escanear aria-label="Buscar escaneando el código de barras">${icono('escanear')}<span class="largo">Escanear</span></button>` : ''}
      </div>
      <div class="filtros" id="filtros-busqueda" hidden>
        <label class="interruptor en-linea"><input type="checkbox" id="solo-hay"><span>Sólo disponibles</span></label>
        <label class="campo compacto"><span class="oculto">Ordenar</span>
          <select id="orden">${Object.entries(ORDENES).map(([k, o]) => `<option value="${k}">${o.nombre}</option>`).join('')}</select></label>
      </div>
      <div id="resultados" class="seccion" aria-live="polite"></div>`,
    alMontar(raiz){
      const q = raiz.querySelector('#q');
      const res = raiz.querySelector('#resultados');
      const $filtros = raiz.querySelector('#filtros-busqueda'), $solo = raiz.querySelector('#solo-hay'), $orden = raiz.querySelector('#orden');
      // Viene de un «buscar de nuevo» (o de un enlace): la búsqueda ya escrita.
      const previa = new URLSearchParams(location.hash.split('?')[1] || '').get('q');
      if(previa) q.value = previa;
      let guardar = null;
      const recientes = () => {
        const b = memoria.busquedas.todas();
        return b.length ? `<div class="recientes"><div class="recientes-cabeza"><h2>Buscaste hace poco</h2><button type="button" class="boton fantasma" data-borrar-busquedas>Borrar</button></div>
          <div class="chips-elegir">${b.map((t) => `<button type="button" class="chip-boton" data-buscar="${esc(t)}">${icono('historial')}${esc(t)}</button>`).join('')}</div></div>` : '';
      };
      const pinta = () => {
        const palabras = quitaAcentos(q.value).split(/\s+/).filter(Boolean);
        clearTimeout(guardar);
        if(!palabras.length){
          $filtros.hidden = true;
          res.innerHTML = recientes() + `<p class="nota">Escribe lo que buscas${ejemplos.length ? `. Por ejemplo: ${ejemplos.map((x) => `<b>${esc(x)}</b>`).join(', ').replace(/, ([^,]*)$/, ' o $1')}` : ''}.</p>`;
          return;
        }
        // Cada palabra vale por sus sinónimos: el catálogo del proveedor viene
        // mitad en inglés, y quien busca «cera» quiere también «Matte Paste».
        // Lo escrito vale como pedazo («wah» → Wahl); el sinónimo, sólo como
        // palabra completa si es corto («mat» no es «Matrix») o como inicio si es largo.
        const sin = (w) => grupos.find((g) => g.some((x) => x === w || x === w.replace(/(es|s)$/, ''))) || [];
        const esta = (t, w) => t.includes(w) || sin(w).some((x) => x.length >= 5 ? t.includes(' ' + x) : new RegExp(`\\s${x}(s|es)?(\\s|$)`).test(t));
        let hallados = indice.map((i) => ({ ...i, enNombre: palabras.filter((w) => esta(i.propio, w)).length }))
          .filter((i) => palabras.every((w) => esta(i.propio, w) || esta(i.cat, w)))
          .sort((a, b) => (a.p.x || 0) - (b.p.x || 0) || b.enNombre - a.enNombre).map((i) => i.p);
        const todos = hallados.length;
        if($solo.checked) hallados = hallados.filter((p) => !p.x);
        if($orden.value !== 'sugerido') hallados = [...hallados].sort(ORDENES[$orden.value].f);
        $filtros.hidden = !todos;
        // Se recuerda lo que se buscó y SÍ encontró algo, cuando se deja de escribir.
        if(todos) guardar = setTimeout(() => memoria.busquedas.guardar(q.value), 1200);
        res.innerHTML = hallados.length
          ? `<p class="nota">${plural(hallados.length, 'producto', 'productos')}${todos > hallados.length ? ` · ${todos - hallados.length} agotados escondidos` : ''}</p><div class="rejilla">${hallados.slice(0, 60).map(tarjeta).join('')}</div>`
          : todos ? estado({ icono: 'agotado', titulo: 'Todo lo que coincide está agotado', texto: 'Quita «Sólo disponibles» para verlo y saber qué va a volver.' })
          : estado({ icono: 'buscar', titulo: `No encontramos «${q.value.trim()}»`,
              texto: 'Prueba con menos palabras, con la marca o con la categoría.',
              botones: `<a class="boton secundario" href="${enlace('/')}">Ver categorías</a>` });
      };
      q.addEventListener('input', pinta);
      $solo.addEventListener('change', pinta); $orden.addEventListener('change', pinta);
      // El envase vacío en la mano: se escanea su código y sale el producto.
      raiz.querySelector('[data-escanear]')?.addEventListener('click', () => {
        const d = hojaEscaner({ alLeer(codigo){
          const t = codigo.trim();
          const qr = /#\/p\/([0-9a-f-]{36})/i.exec(t)?.[1];
          const p = (qr && productos.find((x) => x.id === qr)) || productos.find((x) => x.cb && x.cb === t) || productos.find((x) => x.sku && quitaAcentos(x.sku) === quitaAcentos(t));
          if(!p) return `No tenemos el código ${t}. Prueba escribiendo el nombre.`;
          d.close(); location.hash = enlace('/p/:id', { id: p.id });
          return p.n;
        } });
      });
      q.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ memoria.busquedas.guardar(q.value); q.blur(); } });
      res.addEventListener('click', (e) => {
        const b = e.target.closest('[data-buscar], [data-borrar-busquedas]'); if(!b) return;
        if(b.dataset.buscar){ q.value = b.dataset.buscar; pinta(); return; }
        memoria.busquedas.borrar(); pinta();
      });
      pinta();
      if(!previa) q.focus({ preventScroll: true });
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
        <label class="campo compacto"><span class="oculto">Ordenar</span>
          <select id="orden">${Object.entries(ORDENES).map(([k, o]) => `<option value="${k}">${o.nombre}</option>`).join('')}</select></label>
        <label class="interruptor en-linea"><input type="checkbox" id="solo-hay"><span>Sólo disponibles</span></label>
        ${marcas.length > 1 ? `<label class="campo compacto"><span class="oculto">Marca</span>
          <select id="marca"><option value="">Todas las marcas</option>${marcas.map((m) => `<option>${esc(m)}</option>`).join('')}</select></label>` : ''}
      </div>
      <p class="nota" id="cuantos"></p>
      <div class="rejilla" id="lista"></div>`,
    alMontar(raiz){
      const $orden = raiz.querySelector('#orden');
      const $lista = raiz.querySelector('#lista'), $cuantos = raiz.querySelector('#cuantos'), $marca = raiz.querySelector('#marca'), $solo = raiz.querySelector('#solo-hay');
      const pinta = () => {
        const m = $marca?.value || '';
        const vistos = suyos.filter((p) => (!m || p.m === m) && (!$solo.checked || !p.x)).sort(ORDENES[$orden.value].f);
        $cuantos.textContent = plural(vistos.length, 'producto', 'productos');
        $lista.innerHTML = vistos.length ? vistos.map(tarjeta).join('')
          : estado({ icono: 'agotado', titulo: 'Nada disponible con este filtro', texto: 'Quita «Sólo disponibles» o elige otra marca.' });
      };
      $orden.addEventListener('change', pinta);
      $marca?.addEventListener('change', pinta); $solo.addEventListener('change', pinta);
      pinta();
    },
  };
}

/* ── Producto ─────────────────────────────────────────────────────────── */
export async function producto({ params }){
  const [{ categorias, productos, porId }, mios, n] = await Promise.all([catalogo(), historial(), negocio()]);
  const p = porId.get(params.id);
  if(!p) return noEncontrado('Este producto ya no está', 'Puede que se haya dejado de vender.');
  memoria.vistos.ver(p.id);
  const env = n.ajustes?.envio || {};
  const wa = waNegocio(n, `Hola, tengo una pregunta sobre ${p.n}${p.sku ? ` (clave ${p.sku})` : ''}: `);
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
          <div class="foto-grande">${p.f ? `<button type="button" class="acercar" data-acercar aria-label="Ver la foto en grande"><img id="foto" src="${esc(p.f)}" alt="${esc(p.n)}" width="480" height="480" decoding="async"><span class="lupa">${icono('acercar')}</span></button>` : foto(p, 480, 480)}
            ${botonFavorito(p, { grande: true })}</div>
          ${p.fotos.length > 1 ? `<div class="miniaturas">${p.fotos.map((f, i) => `<button type="button" data-foto="${esc(f)}" aria-label="Foto ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(f)}" alt="" width="64" height="64" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div>
          <div class="ficha-cabeza"><p class="marca-producto">${esc(p.m)}</p>
            <button type="button" class="boton-ico" data-compartir aria-label="Compartir este producto">${icono('compartir')}</button></div>
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
          <ul class="garantias">
            ${env.costo != null || env.gratis_desde != null ? `<li>${icono('camion')}<span>${env.gratis_desde != null ? `Envío gratis desde ${pesos(env.gratis_desde)}` : 'Envío a domicilio'}${Number(env.costo) ? ` · si no, ${pesos(env.costo)}` : ''}${env.zona ? ` · ${esc(env.zona)}` : ''}</span></li>` : ''}
            ${env.recoger !== false ? `<li>${icono('tienda')}<span>También puedes recogerlo${n.ajustes?.contacto?.direccion ? ` en ${esc(n.ajustes.contacto.direccion)}` : ' en el local'}</span></li>` : ''}
            ${formasPago(n) ? `<li>${icono('efectivo')}<span>Pagas ${formasPago(n)} · sin crear cuenta</span></li>` : ''}
          </ul>
          ${wa ? `<a class="boton secundario ancho" href="${esc(wa)}" target="_blank" rel="noopener">${icono('preguntar')}Pregúntanos por WhatsApp</a>` : ''}
          ${p.d ? `<h3 class="sub-ficha">Descripción</h3><p class="descripcion">${esc(p.d)}</p>` : ''}
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
      raiz.querySelector('[data-acercar]')?.addEventListener('click', () => {
        hoja({ titulo: p.n, clase: 'hoja-foto', cuerpo: `<img src="${esc(raiz.querySelector('#foto').src)}" alt="${esc(p.n)}">` });
      });
      raiz.querySelector('[data-compartir]').addEventListener('click', async () => {
        const url = ligaProducto(p.id), texto = `${p.n} · ${pesos(p.p)}`;
        if(navigator.share){ try{ await navigator.share({ title: p.n, text: texto, url }); return; }catch(e){ if(e.name === 'AbortError') return; } }
        try{ await navigator.clipboard.writeText(`${texto}\n${url}`); aviso('Liga copiada: pégala donde quieras'); }catch(e){ aviso('No se pudo copiar la liga', 'mal'); }
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
  const [{ porId }, n] = await Promise.all([catalogo(), negocio()]);
  const env = n.ajustes?.envio || {};
  return {
    html: `<div id="lista"></div>`,
    alMontar(raiz, { aviso }){
      const lista = raiz.querySelector('#lista');
      const despuesHTML = () => {
        const d = memoria.despues.todos().map(([id, c]) => ({ p: porId.get(id), c })).filter((x) => x.p);
        return d.length ? `<section class="seccion despues"><header><h2>Guardado para después</h2><span class="nota">${plural(d.length, 'producto', 'productos')}</span></header>
          <ul class="mios">${d.map(({ p, c }) => `<li class="mio${p.x ? ' sin' : ''}">
            <a href="${enlace('/p/:id', { id: p.id })}">${foto(p, 64, 64, 'loading="lazy"')}</a>
            <div class="texto"><a class="n" href="${enlace('/p/:id', { id: p.id })}">${c > 1 ? `${c} × ` : ''}${esc(p.n)}</a><small>${p.x ? 'Agotado por ahora' : pesos(p.p) + ' c/u'}</small></div>
            <div class="acciones-mio">${p.x ? '' : `<button class="boton secundario" data-regresar="${esc(p.id)}">${icono('carrito')}<span>Al carrito</span></button>`}
              <button class="boton-ico" data-olvidar="${esc(p.id)}" aria-label="Quitar ${esc(p.n)} de guardados">${icono('borrar')}</button></div>
          </li>`).join('')}</ul></section>` : '';
      };
      const pinta = () => {
        /* Lo que ya no existe o se agotó sale del carrito con aviso, no en silencio:
           cobrar algo que no hay es peor que decirlo. */
        const quitados = [];
        for(const [id, c] of carrito.renglones()){
          const p = porId.get(id);
          if(!p || p.x){ quitados.push(p?.n || 'un producto'); carrito.poner(id, 0); if(p) memoria.despues.guardar(id, c); }
          else if(c > p.q){ carrito.poner(id, p.q); }
        }
        const renglones = carrito.renglones();
        if(!renglones.length){
          lista.innerHTML = estado({ icono: 'carrito', titulo: 'Tu carrito está vacío',
            texto: quitados.length ? `Quitamos ${quitados.join(', ')}: se agotó. Lo dejamos en «Guardado para después».` : 'Empieza por lo básico o busca lo que necesitas.',
            botones: `<a class="boton principal" href="${enlace('/')}">Ver productos</a><a class="boton secundario" href="${enlace('/favoritos')}">${icono('corazon')}Mis favoritos</a>` }) + despuesHTML();
          return;
        }
        let total = 0;
        const filas = renglones.map(([id, c]) => {
          const p = porId.get(id); total += aCentavos(p.p) * c;
          return `<div class="renglon">
            <a href="${enlace('/p/:id', { id })}">${foto(p, 76, 76, 'loading="lazy"')}</a>
            <div>
              <a class="n" href="${enlace('/p/:id', { id })}">${esc(p.n)}</a>
              <div class="precio"><span class="ahora">${pesos(p.p * c)}</span>${c > 1 ? `<span class="nota chica">${pesos(p.p)} c/u</span>` : ''}</div>
              ${!p.x && p.q <= POCAS ? `<span class="quedan">${p.q === 1 ? 'Queda 1' : `Quedan ${p.q}`}</span>` : ''}
              <div class="renglon-acciones">
                <div class="cantidad" role="group" aria-label="Cantidad de ${esc(p.n)}">
                  <button type="button" data-menos="${esc(id)}" aria-label="${c === 1 ? 'Quitar del carrito' : 'Una menos'}">${icono(c === 1 ? 'borrar' : 'menos')}</button>
                  <output>${c}</output>
                  <button type="button" data-mas="${esc(id)}" aria-label="Una más" ${c >= p.q ? 'disabled' : ''}>${icono('mas')}</button>
                </div>
                <button type="button" class="boton fantasma" data-despues="${esc(id)}">${icono('despues')}Para después</button>
              </div>
            </div></div>`;
        }).join('');
        const g = envioGratis(total, env);
        const barra = g ? `<div class="envio-gratis${g.listo ? ' listo' : ''}">
            <p>${icono('camion')}<span>${g.listo ? '<b>Tu envío va gratis</b>' : `Te faltan <b>${pesos(g.falta / 100)}</b> para envío gratis`}</span></p>
            <div class="barra-avance" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${g.avance}" aria-label="Avance para envío gratis"><span style="width:${g.avance}%"></span></div></div>` : '';
        lista.innerHTML = (quitados.length ? `<p class="aviso-linea">${icono('alerta')}Quitamos ${esc(quitados.join(', '))}: se agotó. Lo dejamos en «Guardado para después».</p>` : '')
          + `<div class="carrito-rejilla"><div class="renglones">${filas}</div><div class="resumen">
            ${barra}
            <div class="total"><span>Subtotal · ${plural(carrito.piezas(), 'pieza', 'piezas')}</span><strong>${pesos(total / 100)}</strong></div>
            <p class="nota chica">El envío y la forma de pago se eligen en el siguiente paso.</p>
            <a class="boton principal ancho grande" href="${enlace('/pagar')}">Continuar</a>
          </div></div>` + despuesHTML();
      };
      lista.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.mas){ const p = porId.get(b.dataset.mas); if(carrito.cuantas(p.id) < p.q) carrito.agregar(p.id); }
        else if(b.dataset.menos) carrito.quitar(b.dataset.menos);
        else if(b.dataset.despues){ const id = b.dataset.despues; memoria.despues.guardar(id, carrito.cuantas(id)); carrito.poner(id, 0); aviso('Guardado para después: aquí abajo lo encuentras'); }
        else if(b.dataset.regresar){
          const id = b.dataset.regresar, p = porId.get(id), c = memoria.despues.todos().find(([x]) => x === id)?.[1] || 1;
          const cabe = Math.max(0, Math.min(c, p.q - carrito.cuantas(id)));
          if(cabe) carrito.agregar(id, cabe);
          memoria.despues.quitar(id);
          aviso(cabe < c ? `Sólo alcanzaron ${cabe}` : 'De vuelta en el carrito', cabe < c ? 'mal' : undefined);
        }
        else if(b.dataset.olvidar) memoria.despues.quitar(b.dataset.olvidar);
        else return;
        pinta();
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
