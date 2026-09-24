/* ══════════════════════════════════════════════════════════════════════════
   ADMINISTRACIÓN DEL CATÁLOGO · Bloque 3
   ──────────────────────────────────────────────────────────────────────────
   Mismo contrato que cliente/pantallas.js: una función por pantalla, con el
   nombre que trae rutas.js, que devuelve { html, titulo?, ancho?, alMontar? }.

   Lo que el dueño tiene que poder hacer SOLO, sin llamarnos:
     · dar de alta un producto con foto desde el teléfono;
     · corregir el inventario cuando vendió algo fuera del sistema — con motivo,
       porque un ajuste sin razón es el que nadie sabe explicar al mes;
     · crear una categoría con sus campos (el giro es configuración, no código);
     · imprimir etiquetas con QR y código de barras;
     · cambiar nombre, color y datos del negocio.
   Nada se borra que tenga historia: un producto se OCULTA, no se borra.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono, ICONOS } from '../nucleo/iconos.js';
import { esc, pesos, quitaAcentos, plural, estado, hoja, numero, fecha, descargarCSV } from '../nucleo/piezas.js';
import {
  negocio, catalogoAdmin, guardarProducto, subirFoto, ajustarInventario, contarInventario,
  ponerMinimo, movimientosDe, guardarCategoria, borrarCategoria, guardarNegocio, asignarCodigos,
} from '../nucleo/datos.js';
import { negocioPedido } from '../config.js';
import { sinonimosATexto, textoASinonimos } from '../nucleo/bot.js';

const PAGINA = 60;
const MAX_FOTOS = 8;

/* ── Utilidades de esta sección ────────────────────────────────────────── */

/* En un cuadro de la mitad del teléfono no caben ocho cifras: $8.4 M se lee de
   un vistazo y el número completo queda en el título. Se arma a mano: el
   formato «compacto» de cada navegador lo escribe distinto (Chrome daba «8.4 M$»). */
const pesosCorto = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)} M` : n >= 1e5 ? `$${Math.round(n / 1e3)} mil` : pesos(n);

const disponibles = (p) => p.existencia.cantidad - p.existencia.apartado;

/* Cómo va cada producto, en palabra y color — nunca sólo color. */
function situacion(p){
  if(!p.activo) return { clase: '', texto: 'Oculto', clave: 'oculto' };
  const q = disponibles(p);
  if(q <= 0) return { clase: 'mal', texto: 'Agotado', clave: 'agotado' };
  if(p.existencia.minimo > 0 && q <= p.existencia.minimo) return { clase: 'ojo', texto: `Quedan ${q}`, clave: 'se-acaba' };
  return { clase: 'bien', texto: plural(q, 'pieza', 'piezas'), clave: 'bien' };
}

/* Filtros que sobreviven a ir a editar y volver. */
function recordar(llave, inicial){
  let v = inicial;
  try{ v = { ...inicial, ...JSON.parse(sessionStorage.getItem(llave) || '{}') }; }catch(e){}
  return { v, guardar(){ try{ sessionStorage.setItem(llave, JSON.stringify(v)); }catch(e){} } };
}

/* Qué etiquetas imprimir: se pasa por sessionStorage para no meter 500 ids en
   la dirección. */
const LLAVE_ETIQUETAS = 'tienda-etiquetas';
function mandarAEtiquetas(ids, ir){
  try{ sessionStorage.setItem(LLAVE_ETIQUETAS, JSON.stringify(ids)); }catch(e){}
  ir('/a/etiquetas');
}

const miniatura = (p) => p.fotos?.[0]
  ? `<img class="mini" src="${esc(p.fotos[0])}" alt="" width="56" height="56" loading="lazy" decoding="async">`
  : `<span class="mini sin-foto">${icono('caja')}</span>`;

function hacerClave(texto, usadas){
  const base = quitaAcentos(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'campo';
  let c = base, i = 2;
  while(usadas.has(c)) c = `${base}-${i++}`;
  return c;
}

/* EAN-13 de uso interno: los que empiezan con 2 están reservados para que cada
   tienda numere lo suyo. Así un producto sin código trae uno que cualquier
   lector lee. */
function digitoEAN(doce){
  const s = [...doce].reduce((t, d, i) => t + Number(d) * (i % 2 ? 3 : 1), 0);
  return String((10 - (s % 10)) % 10);
}
function codigoInterno(){
  const doce = '2' + Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
  return doce + digitoEAN(doce);
}
const esEAN13 = (c) => /^\d{13}$/.test(c) && digitoEAN(c.slice(0, 12)) === c[12];

const direccionProducto = (id) => {
  const u = new URL(location.href);
  u.hash = enlace('/p/:id', { id }).slice(1);
  u.searchParams.set('negocio', negocioPedido());
  return u.href;
};

function error(campo, texto){
  campo.classList.add('error');
  campo.querySelector('.mensaje-error')?.remove();
  campo.insertAdjacentHTML('beforeend', `<p class="mensaje-error">${icono('alerta')}${esc(texto)}</p>`);
}
function limpiarErrores(raiz){
  raiz.querySelectorAll('.campo.error').forEach((c) => { c.classList.remove('error'); c.querySelector('.mensaje-error')?.remove(); });
}

async function ocupado(boton, trabajo){
  boton.setAttribute('aria-busy', 'true'); boton.disabled = true;
  try{ return await trabajo(); }
  finally{ boton.removeAttribute('aria-busy'); boton.disabled = false; }
}

/* ══ PRODUCTOS ═══════════════════════════════════════════════════════════ */

const VER = [
  ['todos', 'Todos'], ['visibles', 'Visibles en la tienda'], ['ocultos', 'Ocultos'],
  ['se-acaban', 'Se están acabando'], ['agotados', 'Agotados'],
  ['sin-foto', 'Sin foto'], ['sin-codigo', 'Sin código de barras'], ['ofertas', 'En oferta'],
];
const PASA = {
  todos: () => true,
  visibles: (p) => p.activo,
  ocultos: (p) => !p.activo,
  'se-acaban': (p) => situacion(p).clave === 'se-acaba',
  agotados: (p) => p.activo && disponibles(p) <= 0,
  'sin-foto': (p) => !p.fotos?.length,
  'sin-codigo': (p) => !p.codigo_barras,
  ofertas: (p) => p.precio_antes != null,
};

async function productos(){
  const { categorias, productos: todos } = await catalogoAdmin();
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
  const f = recordar('tienda-admin-productos', { q: '', cat: '', ver: 'todos' });

  return {
    html: `
      <div class="barra-admin">
        <label class="buscador">${icono('buscar')}
          <input type="search" id="q" placeholder="Nombre, marca, SKU o código" value="${esc(f.v.q)}" autocomplete="off" aria-label="Buscar producto"></label>
        <div class="filtros">
          <label class="campo compacto"><span class="etiqueta-campo">Categoría</span>
            <select id="cat"><option value="">Todas</option>${categorias.map((c) =>
              `<option value="${c.id}"${c.id === f.v.cat ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}
              <option value="-"${f.v.cat === '-' ? ' selected' : ''}>Sin categoría</option></select></label>
          <label class="campo compacto"><span class="etiqueta-campo">Ver</span>
            <select id="ver">${VER.map(([k, t]) => `<option value="${k}"${k === f.v.ver ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        </div>
        <div class="botones">
          <a class="boton principal" href="${enlace('/a/producto/:id', { id: 'nuevo' })}">${icono('agregar')}Nuevo producto</a>
          <button class="boton secundario" data-etiquetas>${icono('qr')}Etiquetas</button>
          <button class="boton secundario" data-csv>${icono('importar')}Descargar</button>
        </div>
      </div>
      <p class="cuenta" id="cuenta" aria-live="polite"></p>
      <ul class="lista productos-admin" id="lista"></ul>
      <div class="botones centro"><button class="boton secundario" id="mas" hidden>Ver más</button></div>`,
    alMontar($c, { ir }){
      const $lista = $c.querySelector('#lista'), $mas = $c.querySelector('#mas'), $cuenta = $c.querySelector('#cuenta');
      let vistos = [], cuantos = PAGINA;

      const fila = (p) => {
        const s = situacion(p);
        return `<li><a class="fila" href="${enlace('/a/producto/:id', { id: p.id })}">
          ${miniatura(p)}
          <span class="texto"><strong>${esc(p.nombre)}</strong>
            <small>${esc([p.marca, nombreCat.get(p.categoria_id) || 'Sin categoría'].filter(Boolean).join(' · '))}</small></span>
          <span class="lado"><span class="precio-fila">${pesos(p.precio)}</span><span class="chip ${s.clase}">${esc(s.texto)}</span></span>
        </a></li>`;
      };

      const pintar = () => {
        const q = quitaAcentos(f.v.q.trim());
        vistos = todos.filter((p) => PASA[f.v.ver]?.(p) ?? true)
          .filter((p) => !f.v.cat || (f.v.cat === '-' ? !p.categoria_id : p.categoria_id === f.v.cat))
          .filter((p) => !q || quitaAcentos([p.nombre, p.marca, p.sku, p.codigo_barras].join(' ')).includes(q));
        $cuenta.textContent = vistos.length === todos.length ? plural(todos.length, 'producto', 'productos')
          : `${plural(vistos.length, 'producto', 'productos')} de ${todos.length}`;
        $lista.innerHTML = vistos.length ? vistos.slice(0, cuantos).map(fila).join('')
          : `<li>${estado({ icono: 'buscar', titulo: 'Nada con esos filtros', texto: 'Prueba con otra palabra o quita un filtro.' })}</li>`;
        $mas.hidden = vistos.length <= cuantos;
        $mas.textContent = `Ver ${Math.min(PAGINA, vistos.length - cuantos)} más`;
        f.guardar();
      };

      $c.querySelector('#q').addEventListener('input', (e) => { f.v.q = e.target.value; cuantos = PAGINA; pintar(); });
      $c.querySelector('#cat').addEventListener('change', (e) => { f.v.cat = e.target.value; cuantos = PAGINA; pintar(); });
      $c.querySelector('#ver').addEventListener('change', (e) => { f.v.ver = e.target.value; cuantos = PAGINA; pintar(); });
      $mas.addEventListener('click', () => { cuantos += PAGINA; pintar(); });
      $c.querySelector('[data-etiquetas]').addEventListener('click', () => mandarAEtiquetas(vistos.map((p) => p.id), ir));
      $c.querySelector('[data-csv]').addEventListener('click', () => descargarCSV('productos.csv', [
        ['Nombre', 'Marca', 'Categoría', 'Precio', 'Precio antes', 'SKU', 'Código de barras', 'Existencias', 'Apartadas', 'Mínimo', 'Visible'],
        ...vistos.map((p) => [p.nombre, p.marca, nombreCat.get(p.categoria_id) || '', p.precio, p.precio_antes ?? '', p.sku || '',
          p.codigo_barras || '', p.existencia.cantidad, p.existencia.apartado, p.existencia.minimo, p.activo ? 'Sí' : 'No']),
      ]));
      pintar();
    },
  };
}

/* ══ EDITAR PRODUCTO ═════════════════════════════════════════════════════ */

async function productoEditar({ params }){
  const nuevo = params.id === 'nuevo';
  const { categorias, porId } = await catalogoAdmin();
  const p = nuevo
    ? { nombre: '', marca: '', descripcion: '', precio: '', precio_antes: null, sku: '', codigo_barras: '', categoria_id: categorias[0]?.id || null,
        campos: {}, fotos: [], activo: true, existencia: { cantidad: 0, apartado: 0, minimo: 0 } }
    : porId.get(params.id);
  if(!p) return { titulo: 'No encontrado', html: estado({ icono: 'buscar', titulo: 'Ese producto no existe',
    texto: 'Puede que lo hayan borrado o que el enlace esté incompleto.',
    botones: `<a class="boton principal" href="${enlace('/a/productos')}">Ir a productos</a>` }) };

  const fotos = [...(p.fotos || [])];
  const campos = { ...(p.campos || {}) };
  const catDe = (id) => categorias.find((c) => c.id === id);

  const campoPlantilla = (c) => {
    const v = campos[c.clave] ?? '';
    const id = 'campo-' + c.clave;
    if(c.tipo === 'opcion') return `<label class="campo" for="${id}"><span class="etiqueta-campo">${esc(c.etiqueta)}</span>
      <select id="${id}" data-plantilla="${esc(c.clave)}"><option value="">—</option>${(c.opciones || []).map((o) =>
        `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    if(c.tipo === 'si_no') return `<label class="campo" for="${id}"><span class="etiqueta-campo">${esc(c.etiqueta)}</span>
      <select id="${id}" data-plantilla="${esc(c.clave)}"><option value="">—</option>
        <option${v === 'Sí' ? ' selected' : ''}>Sí</option><option${v === 'No' ? ' selected' : ''}>No</option></select></label>`;
    return `<label class="campo" for="${id}"><span class="etiqueta-campo">${esc(c.etiqueta)}</span>
      <input id="${id}" data-plantilla="${esc(c.clave)}" value="${esc(v)}" ${c.tipo === 'numero' ? 'inputmode="decimal"' : ''}></label>`;
  };
  const plantillaHTML = (catId) => {
    const pl = catDe(catId)?.plantilla || [];
    return pl.length ? pl.map(campoPlantilla).join('')
      : `<p class="nota">Esta categoría no pide datos extra. Se agregan en ${`<a href="${enlace('/a/categorias')}">Categorías</a>`}.</p>`;
  };

  const fotosHTML = () => `${fotos.map((u, i) => `<li class="foto-editor">
      <img src="${esc(u)}" alt="Foto ${i + 1}" width="120" height="120">
      ${i === 0 ? '<span class="chip acento">Principal</span>' : `<button type="button" class="boton secundario" data-principal="${i}">Hacer principal</button>`}
      <button type="button" class="boton-ico" data-quitar-foto="${i}" aria-label="Quitar foto ${i + 1}">${icono('borrar')}</button>
    </li>`).join('')}
    ${fotos.length < MAX_FOTOS ? `<li class="foto-nueva"><label class="boton secundario">${icono('agregar')}Agregar foto
      <input type="file" accept="image/*" multiple data-subir hidden></label></li>` : ''}`;

  const s = situacion(p);
  return {
    titulo: nuevo ? 'Nuevo producto' : 'Editar producto',
    html: `
      <form class="editor" id="editor" novalidate>
        <div class="editor-principal">
          <section class="tarjeta bloque-form">
            <h2>Lo básico</h2>
            <label class="campo" for="nombre"><span class="etiqueta-campo">Nombre</span>
              <input id="nombre" name="nombre" value="${esc(p.nombre)}" required maxlength="160" autocomplete="off"></label>
            <label class="campo" for="marca"><span class="etiqueta-campo">Marca</span>
              <input id="marca" name="marca" value="${esc(p.marca)}" maxlength="80" autocomplete="off"></label>
            <label class="campo" for="categoria"><span class="etiqueta-campo">Categoría</span>
              <select id="categoria" name="categoria">${categorias.map((c) =>
                `<option value="${c.id}"${c.id === p.categoria_id ? ' selected' : ''}>${esc(c.nombre)}${c.activo ? '' : ' (oculta)'}</option>`).join('')}
                <option value=""${p.categoria_id ? '' : ' selected'}>Sin categoría</option></select></label>
            <div class="dos">
              <label class="campo" for="precio"><span class="etiqueta-campo">Precio</span>
                <input id="precio" name="precio" inputmode="decimal" value="${p.precio === '' ? '' : esc(p.precio)}" placeholder="0.00" required></label>
              <label class="campo" for="precio_antes"><span class="etiqueta-campo">Precio antes</span>
                <input id="precio_antes" name="precio_antes" inputmode="decimal" value="${p.precio_antes == null ? '' : esc(p.precio_antes)}" placeholder="Sólo si está en oferta">
                <span class="ayuda">Se tacha junto al precio y marca el descuento.</span></label>
            </div>
            <label class="campo" for="descripcion"><span class="etiqueta-campo">Descripción</span>
              <textarea id="descripcion" name="descripcion" maxlength="4000">${esc(p.descripcion)}</textarea></label>
          </section>

          <section class="tarjeta bloque-form">
            <h2>Fotos</h2>
            <p class="nota">La primera es la que se ve en la tienda. Se achican solas antes de subir.</p>
            <ul class="fotos-editor" id="fotos">${fotosHTML()}</ul>
          </section>

          <section class="tarjeta bloque-form">
            <h2>Datos de la categoría</h2>
            <div id="plantilla">${plantillaHTML(p.categoria_id)}</div>
          </section>
        </div>

        <aside class="editor-lado">
          <section class="tarjeta bloque-form">
            <h2>En la tienda</h2>
            <label class="interruptor"><input type="checkbox" id="activo"${p.activo ? ' checked' : ''}>
              <span><strong>Visible para los clientes</strong><small>Apágalo en vez de borrar: se guarda su historial de ventas.</small></span></label>
            ${nuevo ? '' : `<a class="boton fantasma ancho" href="${enlace('/p/:id', { id: p.id })}">${icono('ver')}Ver como cliente</a>`}
          </section>

          ${nuevo ? '' : `<section class="tarjeta bloque-form">
            <h2>Inventario</h2>
            <p class="hay-grande"><span class="valor" id="hay">${p.existencia.cantidad}</span> <span>en existencia</span></p>
            <p><span class="chip ${s.clase}" id="chip-hay">${esc(s.texto)}</span>${p.existencia.apartado ? ` <span class="chip">${p.existencia.apartado} apartadas</span>` : ''}</p>
            <button type="button" class="boton secundario ancho" data-ajustar>${icono('inventario')}Ajustar inventario</button>
          </section>`}

          <section class="tarjeta bloque-form">
            <h2>Códigos</h2>
            <label class="campo" for="sku"><span class="etiqueta-campo">SKU o clave</span>
              <input id="sku" name="sku" value="${esc(p.sku || '')}" maxlength="60" autocomplete="off"></label>
            <label class="campo" for="codigo_barras"><span class="etiqueta-campo">Código de barras</span>
              <input id="codigo_barras" name="codigo_barras" value="${esc(p.codigo_barras || '')}" inputmode="numeric" maxlength="48" autocomplete="off">
              <span class="ayuda">El que trae el empaque. Si no trae, genera uno.</span></label>
            <button type="button" class="boton fantasma" data-generar>${icono('agregar')}Generar código</button>
            ${nuevo ? '' : `<button type="button" class="boton secundario ancho" data-etiqueta>${icono('imprimir')}Imprimir etiqueta</button>`}
          </section>
        </aside>

        <div class="barra-guardar">
          <span class="chip ojo" id="sin-guardar" hidden>Sin guardar</span>
          <a class="boton secundario" href="${enlace('/a/productos')}">Regresar</a>
          <button type="submit" class="boton principal" id="guardar">${icono('listo')}Guardar</button>
        </div>
      </form>`,

    alMontar($c, { aviso, ir }){
      const $f = $c.querySelector('#editor');
      const $sinGuardar = $c.querySelector('#sin-guardar');
      let cambiado = false;
      const marcar = () => { cambiado = true; $sinGuardar.hidden = false; };
      const alSalir = (e) => { if(cambiado){ e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', alSalir);

      $f.addEventListener('input', marcar);
      $f.addEventListener('change', (e) => {
        marcar();
        if(e.target.id === 'categoria'){
          // Lo escrito en la categoría anterior se queda en `campos`: si vuelve, reaparece.
          leerPlantilla();
          $c.querySelector('#plantilla').innerHTML = plantillaHTML(e.target.value);
        }
      });

      const leerPlantilla = () => $c.querySelectorAll('[data-plantilla]').forEach((el) => {
        const v = el.value.trim();
        if(v) campos[el.dataset.plantilla] = v; else delete campos[el.dataset.plantilla];
      });

      const $fotos = $c.querySelector('#fotos');
      const pintarFotos = () => { $fotos.innerHTML = fotosHTML(); };
      $fotos.addEventListener('click', (e) => {
        const q = e.target.closest('[data-quitar-foto]'), pr = e.target.closest('[data-principal]');
        if(q){ fotos.splice(Number(q.dataset.quitarFoto), 1); marcar(); pintarFotos(); }
        if(pr){ const [u] = fotos.splice(Number(pr.dataset.principal), 1); fotos.unshift(u); marcar(); pintarFotos(); }
      });
      $fotos.addEventListener('change', async (e) => {
        if(!e.target.matches('[data-subir]')) return;
        const archivos = [...e.target.files].slice(0, MAX_FOTOS - fotos.length);
        const $boton = e.target.closest('label');
        $boton.setAttribute('aria-busy', 'true');
        for(const a of archivos){
          try{ fotos.push(await subirFoto(a)); marcar(); }
          catch(err){ console.error(err); aviso(err.message || 'No se pudo subir la foto', 'mal'); }
        }
        pintarFotos();
      });

      $c.querySelector('[data-generar]').addEventListener('click', () => {
        const $cb = $c.querySelector('#codigo_barras');
        if($cb.value.trim() && !confirm('Ya tiene código. ¿Cambiarlo por uno nuevo?')) return;
        $cb.value = codigoInterno(); marcar();
        aviso('Código generado. Se guarda al darle Guardar.');
      });

      $c.querySelector('[data-etiqueta]')?.addEventListener('click', () => {
        if(cambiado && !confirm('Hay cambios sin guardar. ¿Imprimir la etiqueta con lo que ya estaba guardado?')) return;
        cambiado = false; mandarAEtiquetas([p.id], ir);
      });

      $c.querySelector('[data-ajustar]')?.addEventListener('click', () => hojaAjuste(p, {
        aviso, alCambiar(){
          $c.querySelector('#hay').textContent = p.existencia.cantidad;
          const s2 = situacion(p); const $ch = $c.querySelector('#chip-hay');
          $ch.className = 'chip ' + s2.clase; $ch.textContent = s2.texto;
        },
      }));

      $f.addEventListener('submit', async (e) => {
        e.preventDefault();
        limpiarErrores($f);
        leerPlantilla();
        const val = (n) => $f.elements[n].value.trim();
        const precio = numero(val('precio')), antes = numero(val('precio_antes'));
        const campo = (n) => $f.elements[n].closest('.campo');
        let malo = null;
        const falla = (n, t) => { error(campo(n), t); malo ??= $f.elements[n]; };
        if(!val('nombre')) falla('nombre', 'Ponle nombre: es lo que busca la gente.');
        if(precio == null || Number.isNaN(precio) || precio < 0) falla('precio', 'Escribe el precio, por ejemplo 250 o 1,250.50.');
        if(Number.isNaN(antes)) falla('precio_antes', 'Eso no es un precio.');
        else if(antes != null && precio != null && antes <= precio) falla('precio_antes', 'El precio de antes tiene que ser mayor al de ahora, o déjalo vacío.');
        const cb = val('codigo_barras');
        if(cb && !/^[0-9A-Za-z\-. ]+$/.test(cb)) falla('codigo_barras', 'Sólo números y letras, como viene en el empaque.');
        if(malo){ malo.focus(); aviso('Revisa lo marcado en rojo', 'mal'); return; }

        const datos = {
          nombre: val('nombre'), marca: val('marca'), descripcion: val('descripcion'),
          precio, precio_antes: antes, sku: val('sku') || null, codigo_barras: cb || null,
          categoria_id: val('categoria') || null, campos, fotos, activo: $c.querySelector('#activo').checked,
        };
        try{
          const id = await ocupado($c.querySelector('#guardar'), () => guardarProducto(nuevo ? null : p.id, datos));
          cambiado = false; $sinGuardar.hidden = true;
          aviso(nuevo ? 'Producto dado de alta' : 'Cambios guardados');
          if(nuevo) ir('/a/producto/:id', { id });
        }catch(err){
          console.error(err);
          if(/código de barras/.test(err.message)) error(campo('codigo_barras'), err.message);
          aviso(err.message || 'No se pudo guardar', 'mal');
        }
      });

      return () => window.removeEventListener('beforeunload', alSalir);
    },
  };
}

/* ══ AJUSTE DE INVENTARIO (hoja compartida) ══════════════════════════════ */

const MODOS = {
  entro: { titulo: 'Entró', pregunta: '¿Cuántas entraron?', motivos: ['Llegó del proveedor', 'Devolución de cliente', 'Corrección de un error'] },
  salio: { titulo: 'Salió', pregunta: '¿Cuántas salieron?', motivos: ['Venta fuera del sistema', 'Merma o dañado', 'Uso en el local', 'Regalo o muestra'] },
  conte: { titulo: 'Conté', pregunta: '¿Cuántas hay en el anaquel?', motivos: ['Conteo físico', 'Inventario de fin de mes'] },
};
const MOTIVO_MOV = { venta: 'Venta', ajuste: 'Ajuste', apartado: 'Apartado', liberar_apartado: 'Se liberó un apartado',
  devolucion: 'Devolución', alta: 'Alta', importacion: 'Importación', cancelacion: 'Cancelación' };
const CANAL = { tienda: 'tienda en línea', pos: 'mostrador', bot: 'WhatsApp', repartidor: 'repartidor', manual: 'a mano' };

function hojaAjuste(p, { aviso, alCambiar }){
  let modo = 'entro';
  const d = hoja({ titulo: p.nombre, clase: 'hoja-ajuste', cuerpo: `
    <p class="hay-grande"><span class="valor" data-hay>${p.existencia.cantidad}</span> <span>en existencia${p.existencia.apartado ? ` · ${p.existencia.apartado} apartadas` : ''}</span></p>
    <form data-ajuste novalidate>
      <div class="segmentos" role="group" aria-label="Qué pasó">${Object.entries(MODOS).map(([k, m]) =>
        `<button type="button" data-modo="${k}" aria-pressed="${k === modo}">${m.titulo}</button>`).join('')}</div>
      <div class="campo"><label class="etiqueta-campo" for="aj-cantidad" data-pregunta>${MODOS[modo].pregunta}</label>
        <div class="contador">
          <button type="button" class="boton secundario" data-menos aria-label="Una menos">${icono('menos')}</button>
          <input id="aj-cantidad" inputmode="numeric" value="1" autocomplete="off">
          <button type="button" class="boton secundario" data-mas aria-label="Una más">${icono('mas')}</button>
        </div>
        <span class="ayuda" data-queda aria-live="polite"></span></div>
      <div class="campo"><label class="etiqueta-campo" for="aj-motivo">Motivo</label>
        <div class="chips-elegir" data-motivos></div>
        <input id="aj-motivo" maxlength="140" placeholder="O escríbelo" autocomplete="off"></div>
      <button type="submit" class="boton principal ancho grande" data-guardar-ajuste>${icono('listo')}Guardar ajuste</button>
    </form>
    <details class="plegable"><summary>Mínimo para avisar que se acaba</summary>
      <form data-minimo class="en-linea" novalidate>
        <label class="campo" for="aj-minimo"><span class="etiqueta-campo">Avisar cuando queden</span>
          <input id="aj-minimo" inputmode="numeric" value="${p.existencia.minimo}"></label>
        <button type="submit" class="boton secundario">Guardar mínimo</button>
      </form></details>
    <details class="plegable" data-historial><summary>Movimientos</summary><div data-movs><p class="nota">Cargando…</p></div></details>` });

  const $ = (s) => d.querySelector(s);
  const $cant = $('#aj-cantidad'), $motivo = $('#aj-motivo');

  const pintarModo = () => {
    d.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.modo === modo));
    $('[data-pregunta]').textContent = MODOS[modo].pregunta;
    $('[data-motivos]').innerHTML = MODOS[modo].motivos.map((m) =>
      `<button type="button" class="chip-boton" data-motivo="${esc(m)}" aria-pressed="${$motivo.value === m}">${esc(m)}</button>`).join('');
    if(modo === 'conte' && $cant.dataset.tocado !== '1') $cant.value = p.existencia.cantidad;
    if(modo !== 'conte' && $cant.dataset.tocado !== '1') $cant.value = 1;
    queda();
  };
  const cantidad = () => { const n = numero($cant.value); return Number.isInteger(n) && n >= 0 ? n : null; };
  const resultado = () => {
    const n = cantidad(); if(n == null) return null;
    return modo === 'entro' ? p.existencia.cantidad + n : modo === 'salio' ? p.existencia.cantidad - n : n;
  };
  const queda = () => {
    const r = resultado();
    $('[data-queda]').textContent = r == null ? 'Escribe un número entero.' : r < 0 ? `Sólo hay ${p.existencia.cantidad}.` : `Quedarán ${r}.`;
  };

  d.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.modo){ modo = b.dataset.modo; $motivo.value = ''; pintarModo(); }
    if(b.dataset.motivo){ $motivo.value = b.dataset.motivo; d.querySelectorAll('[data-motivo]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }
    if(b.matches('[data-mas]')){ $cant.value = (cantidad() ?? 0) + 1; $cant.dataset.tocado = '1'; queda(); }
    if(b.matches('[data-menos]')){ $cant.value = Math.max(0, (cantidad() ?? 1) - 1); $cant.dataset.tocado = '1'; queda(); }
  });
  $cant.addEventListener('input', () => { $cant.dataset.tocado = '1'; queda(); });
  $motivo.addEventListener('input', () => d.querySelectorAll('[data-motivo]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.motivo === $motivo.value)));

  $('[data-ajuste]').addEventListener('submit', async (e) => {
    e.preventDefault(); limpiarErrores(d);
    const n = cantidad(), r = resultado(), nota = $motivo.value.trim();
    if(n == null || (modo !== 'conte' && n === 0)){ error($cant.closest('.campo'), 'Escribe cuántas, en número entero.'); return; }
    if(r < 0){ error($cant.closest('.campo'), `No pueden salir ${n}: sólo hay ${p.existencia.cantidad}.`); return; }
    if(r === p.existencia.cantidad){ error($cant.closest('.campo'), 'Así ya está: no hay nada que ajustar.'); return; }
    if(!nota){ error($motivo.closest('.campo'), 'Elige o escribe el motivo. Al mes nadie se acuerda de por qué.'); $motivo.focus(); return; }
    try{
      const nuevo = await ocupado($('[data-guardar-ajuste]'), () => modo === 'conte'
        ? contarInventario(p.id, n, nota)
        : ajustarInventario(p.id, modo === 'entro' ? n : -n, nota));
      p.existencia.cantidad = nuevo;
      aviso(`Listo: quedan ${nuevo}`);
      alCambiar?.(); d.close();
    }catch(err){ console.error(err); aviso(err.message, 'mal'); }
  });

  $('[data-minimo]').addEventListener('submit', async (e) => {
    e.preventDefault(); limpiarErrores(d);
    const $m = $('#aj-minimo'), m = numero($m.value);
    if(!Number.isInteger(m) || m < 0){ error($m.closest('.campo'), 'Un número entero, 0 o más.'); return; }
    try{
      await ocupado(e.submitter || $('[data-minimo] button'), () => ponerMinimo(p.id, m));
      p.existencia.minimo = m; aviso(m ? `Avisará cuando queden ${m}` : 'Sin aviso de mínimo'); alCambiar?.();
    }catch(err){ console.error(err); aviso(err.message, 'mal'); }
  });

  $('[data-historial]').addEventListener('toggle', async (e) => {
    if(!e.target.open || e.target.dataset.cargado) return;
    e.target.dataset.cargado = '1';
    const $m = $('[data-movs]');
    try{
      const movs = await movimientosDe(p.id);
      $m.innerHTML = movs.length ? `<ul class="movimientos">${movs.map((m) => `<li>
          <span class="delta ${m.delta > 0 ? 'mas' : 'menos'}">${m.delta > 0 ? '+' : '−'}${Math.abs(m.delta)}</span>
          <span class="texto"><strong>${esc(m.nota || MOTIVO_MOV[m.motivo] || m.motivo)}</strong>
            <small>${esc([fecha(m.cuando), MOTIVO_MOV[m.motivo], m.canal && CANAL[m.canal], m.quien?.nombre].filter(Boolean).join(' · '))}</small></span></li>`).join('')}</ul>`
        : '<p class="nota">Todavía no hay movimientos.</p>';
    }catch(err){ console.error(err); $m.innerHTML = `<p class="nota">${esc(err.message)}</p>`; }
  });

  pintarModo();
  return d;
}

/* ══ INVENTARIO ══════════════════════════════════════════════════════════ */

async function inventario(){
  const { categorias, productos: todos } = await catalogoAdmin();
  const nombreCat = new Map(categorias.map((c) => [c.id, c.nombre]));
  const activos = todos.filter((p) => p.activo);
  const f = recordar('tienda-admin-inventario', { q: '', ver: 'todos', orden: 'nombre' });

  const cifras = () => {
    const piezas = activos.reduce((t, p) => t + p.existencia.cantidad, 0);
    const valor = activos.reduce((t, p) => t + p.existencia.cantidad * p.precio, 0);
    const acaban = activos.filter((p) => situacion(p).clave === 'se-acaba').length;
    const agotados = activos.filter((p) => disponibles(p) <= 0).length;
    return `<div class="cifra-caja"><span class="valor">${piezas.toLocaleString('es-MX')}</span><span class="etq">piezas en existencia</span></div>
      <div class="cifra-caja" title="${pesos(valor)}"><span class="valor">${pesosCorto(valor)}</span><span class="etq">a precio de venta</span></div>
      <button class="cifra-caja boton-cifra" data-ver="se-acaban"><span class="valor ojo">${acaban}</span><span class="etq">se están acabando</span></button>
      <button class="cifra-caja boton-cifra" data-ver="agotados"><span class="valor mal">${agotados}</span><span class="etq">agotados</span></button>`;
  };

  return {
    html: `
      <div class="cifras" id="cifras">${cifras()}</div>
      <div class="barra-admin">
        <label class="buscador">${icono('buscar')}
          <input type="search" id="q" placeholder="Buscar producto" value="${esc(f.v.q)}" autocomplete="off" aria-label="Buscar producto"></label>
        <div class="filtros">
          <label class="campo compacto"><span class="etiqueta-campo">Ver</span><select id="ver">
            ${[['todos', 'Todos'], ['se-acaban', 'Se están acabando'], ['agotados', 'Agotados'], ['apartados', 'Con apartados']].map(([k, t]) =>
              `<option value="${k}"${k === f.v.ver ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="campo compacto"><span class="etiqueta-campo">Orden</span><select id="orden">
            ${[['nombre', 'Por nombre'], ['menos', 'Menos piezas primero'], ['mas', 'Más piezas primero'], ['valor', 'Más dinero parado']].map(([k, t]) =>
              `<option value="${k}"${k === f.v.orden ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        </div>
        <div class="botones"><button class="boton secundario" data-csv>${icono('importar')}Descargar para Excel</button></div>
      </div>
      <p class="nota">Toca un producto para registrar lo que entró, lo que salió fuera del sistema o lo que contaste.</p>
      <p class="cuenta" id="cuenta" aria-live="polite"></p>
      <ul class="lista inventario-lista" id="lista"></ul>
      <div class="botones centro"><button class="boton secundario" id="mas" hidden>Ver más</button></div>`,

    alMontar($c, { aviso }){
      const $lista = $c.querySelector('#lista'), $mas = $c.querySelector('#mas');
      let vistos = [], cuantos = PAGINA;
      const PASA_INV = {
        todos: () => true, 'se-acaban': (p) => situacion(p).clave === 'se-acaba',
        agotados: (p) => disponibles(p) <= 0, apartados: (p) => p.existencia.apartado > 0,
      };
      const ORDEN = {
        nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
        menos: (a, b) => disponibles(a) - disponibles(b),
        mas: (a, b) => disponibles(b) - disponibles(a),
        valor: (a, b) => b.existencia.cantidad * b.precio - a.existencia.cantidad * a.precio,
      };
      const fila = (p) => {
        const s = situacion(p);
        return `<li><button class="fila" data-id="${p.id}">
          ${miniatura(p)}
          <span class="texto"><strong>${esc(p.nombre)}</strong>
            <small>${esc(nombreCat.get(p.categoria_id) || 'Sin categoría')}${p.existencia.minimo ? ` · mínimo ${p.existencia.minimo}` : ''}</small></span>
          <span class="lado"><span class="cantidad-fila">${p.existencia.cantidad}</span><span class="chip ${s.clase}">${esc(s.clave === 'bien' ? 'Bien' : s.texto)}</span></span>
        </button></li>`;
      };
      const pintar = () => {
        const q = quitaAcentos(f.v.q.trim());
        vistos = activos.filter(PASA_INV[f.v.ver] || PASA_INV.todos)
          .filter((p) => !q || quitaAcentos([p.nombre, p.marca, p.sku, p.codigo_barras].join(' ')).includes(q))
          .sort(ORDEN[f.v.orden] || ORDEN.nombre);
        $c.querySelector('#cuenta').textContent = plural(vistos.length, 'producto', 'productos');
        $lista.innerHTML = vistos.length ? vistos.slice(0, cuantos).map(fila).join('')
          : `<li>${estado({ icono: 'listo', titulo: f.v.ver === 'todos' ? 'Nada con esa búsqueda' : 'Nada por aquí', texto: f.v.ver === 'todos' ? 'Prueba con otra palabra.' : 'Buena señal.' })}</li>`;
        $mas.hidden = vistos.length <= cuantos;
        $mas.textContent = `Ver ${Math.min(PAGINA, vistos.length - cuantos)} más`;
        $c.querySelector('#ver').value = f.v.ver;
        f.guardar();
      };
      $c.querySelector('#q').addEventListener('input', (e) => { f.v.q = e.target.value; cuantos = PAGINA; pintar(); });
      $c.querySelector('#ver').addEventListener('change', (e) => { f.v.ver = e.target.value; cuantos = PAGINA; pintar(); });
      $c.querySelector('#orden').addEventListener('change', (e) => { f.v.orden = e.target.value; pintar(); });
      $c.querySelector('#cifras').addEventListener('click', (e) => {
        const b = e.target.closest('[data-ver]'); if(!b) return;
        f.v.ver = b.dataset.ver; cuantos = PAGINA; pintar();
        $lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      $mas.addEventListener('click', () => { cuantos += PAGINA; pintar(); });
      $lista.addEventListener('click', (e) => {
        const b = e.target.closest('[data-id]'); if(!b) return;
        const p = activos.find((x) => x.id === b.dataset.id);
        hojaAjuste(p, { aviso, alCambiar(){ pintar(); $c.querySelector('#cifras').innerHTML = cifras(); } });
      });
      $c.querySelector('[data-csv]').addEventListener('click', () => descargarCSV('inventario.csv', [
        ['Nombre', 'Categoría', 'SKU', 'Código de barras', 'Existencia', 'Apartadas', 'Disponibles', 'Mínimo', 'Precio', 'Valor'],
        ...vistos.map((p) => [p.nombre, nombreCat.get(p.categoria_id) || '', p.sku || '', p.codigo_barras || '', p.existencia.cantidad,
          p.existencia.apartado, disponibles(p), p.existencia.minimo, p.precio, (p.existencia.cantidad * p.precio).toFixed(2)]),
      ]));
      pintar();
    },
  };
}

/* ══ CATEGORÍAS ══════════════════════════════════════════════════════════ */

/* Iconos que tienen sentido para una categoría (no los de la navegación). */
const ICONOS_CATEGORIA = ['caja', 'color', 'maquinas', 'barba', 'corte', 'peinado', 'cuidado', 'aparatos', 'accesorios',
  'tienda', 'fuego', 'sol', 'luna', 'descuentos', 'sorteo', 'apartados', 'carrito', 'lugar', 'reloj', 'ticket', 'efectivo', 'tarjeta', 'ropa', 'termo', 'taza', 'regalo']
  .filter((n) => ICONOS[n]);
const TIPOS = [['texto', 'Texto'], ['numero', 'Número'], ['opcion', 'Lista de opciones'], ['si_no', 'Sí o no']];

async function categoriasPantalla(){
  const { categorias, productos: todos } = await catalogoAdmin();
  const cuenta = new Map();
  todos.forEach((p) => cuenta.set(p.categoria_id, (cuenta.get(p.categoria_id) || 0) + 1));

  const filaCat = (c, i) => `<li class="fila-cat">
      <span class="circulo-chico">${icono(c.icono)}</span>
      <span class="texto"><strong>${esc(c.nombre)}</strong>
        <small>${plural(cuenta.get(c.id) || 0, 'producto', 'productos')} · ${plural((c.plantilla || []).length, 'campo', 'campos')}${c.activo ? '' : ' · oculta'}</small></span>
      <span class="acciones">
        <button class="boton-ico" data-subir="${i}" aria-label="Subir ${esc(c.nombre)}"${i === 0 ? ' disabled' : ''}>${icono('abajo', 'girado')}</button>
        <button class="boton-ico" data-bajar="${i}" aria-label="Bajar ${esc(c.nombre)}"${i === categorias.length - 1 ? ' disabled' : ''}>${icono('abajo')}</button>
        <button class="boton secundario" data-editar="${c.id}">${icono('editar')}Editar</button>
      </span></li>`;

  return {
    html: `
      <p class="nota">El orden de aquí es el orden en la tienda. Cada categoría dice qué datos lleva su producto: talla, color, contenido, lo que le toque.</p>
      <div class="botones"><button class="boton principal" data-nueva>${icono('agregar')}Nueva categoría</button></div>
      <ul class="lista categorias-lista" id="lista">${categorias.map(filaCat).join('')}</ul>
      ${cuenta.get(null) ? `<p class="nota">${plural(cuenta.get(null), 'producto está', 'productos están')} sin categoría: no se ven en la tienda por categoría.</p>` : ''}`,

    alMontar($c, { aviso, ir }){

      const mover = async (i, j, boton) => {
        const a = categorias[i], b = categorias[j];
        // Si el orden venía repetido (todo en 0), se numera primero.
        const orden = categorias.map((c, k) => k);
        [orden[i], orden[j]] = [orden[j], orden[i]];
        try{
          await ocupado(boton, () => Promise.all(categorias.map((c, k) => c.orden === orden[k] ? null
            : guardarCategoria(c.id, { orden: orden[k] }))));
          aviso(`«${a.nombre}» ${j < i ? 'subió' : 'bajó'}`);
          [categorias[i], categorias[j]] = [b, a];
          categorias.forEach((c, k) => { c.orden = k; });
          $c.querySelector('#lista').innerHTML = categorias.map(filaCat).join('');
        }catch(err){ console.error(err); aviso(err.message, 'mal'); }
      };
      $c.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.dataset.subir) mover(Number(b.dataset.subir), Number(b.dataset.subir) - 1, b);
        if(b.dataset.bajar) mover(Number(b.dataset.bajar), Number(b.dataset.bajar) + 1, b);
        if(b.dataset.editar) hojaCategoria(categorias.find((c) => c.id === b.dataset.editar), { categorias, cuenta, aviso, recargar });
        if(b.matches('[data-nueva]')) hojaCategoria(null, { categorias, cuenta, aviso, recargar });
      });
    },
  };
}

function hojaCategoria(c, { categorias, cuenta, aviso, recargar }){
  const nueva = !c;
  const campos = (c?.plantilla || []).map((x) => ({ ...x, opciones: [...(x.opciones || [])] }));
  let elegido = c?.icono || 'caja';

  const filaCampo = (x, i) => `<li class="campo-plantilla" data-i="${i}">
      <div class="dos">
        <label class="campo"><span class="etiqueta-campo">Nombre del dato</span>
          <input data-k="etiqueta" value="${esc(x.etiqueta)}" maxlength="40" placeholder="Por ejemplo: Tono"></label>
        <label class="campo"><span class="etiqueta-campo">Tipo</span>
          <select data-k="tipo">${TIPOS.map(([k, t]) => `<option value="${k}"${k === x.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      </div>
      <label class="campo"${x.tipo === 'opcion' ? '' : ' hidden'}><span class="etiqueta-campo">Opciones, separadas por coma</span>
        <input data-k="opciones" value="${esc(x.opciones.join(', '))}" placeholder="Chico, Mediano, Grande"></label>
      <div class="botones">
        <button type="button" class="boton-ico" data-arriba="${i}" aria-label="Subir campo"${i === 0 ? ' disabled' : ''}>${icono('abajo', 'girado')}</button>
        <button type="button" class="boton-ico" data-abajo="${i}" aria-label="Bajar campo"${i === campos.length - 1 ? ' disabled' : ''}>${icono('abajo')}</button>
        <button type="button" class="boton fantasma" data-quitar="${i}">${icono('borrar')}Quitar</button>
      </div></li>`;

  const d = hoja({ titulo: nueva ? 'Nueva categoría' : c.nombre, clase: 'hoja-ancha', cuerpo: `
    <form data-cat novalidate>
      <label class="campo" for="cat-nombre"><span class="etiqueta-campo">Nombre</span>
        <input id="cat-nombre" value="${esc(c?.nombre || '')}" maxlength="60" autocomplete="off" required></label>
      <fieldset class="campo sin-borde"><legend class="etiqueta-campo">Icono</legend>
        <div class="iconos-elegir">${ICONOS_CATEGORIA.map((n) =>
          `<button type="button" class="boton-ico" data-icono="${n}" aria-pressed="${n === elegido}" aria-label="${n}">${icono(n)}</button>`).join('')}</div></fieldset>
      <label class="interruptor"><input type="checkbox" id="cat-activo"${!c || c.activo ? ' checked' : ''}>
        <span><strong>Visible en la tienda</strong><small>Apagada, sus productos siguen existiendo pero no se ve la categoría.</small></span></label>
      <h3>Datos que lleva cada producto</h3>
      <p class="nota">Cambiar el nombre de un dato no borra lo que ya tienen los productos.</p>
      <ol class="plantilla-lista" data-campos>${campos.map(filaCampo).join('')}</ol>
      <button type="button" class="boton secundario" data-agregar>${icono('agregar')}Agregar dato</button>
      <div class="botones pie-hoja">
        ${nueva ? '' : `<button type="button" class="boton peligro" data-borrar>${icono('borrar')}Borrar</button>`}
        <button type="submit" class="boton principal" data-guardar-cat>${icono('listo')}Guardar</button>
      </div>
    </form>` });

  const $campos = d.querySelector('[data-campos]');
  const leer = () => $campos.querySelectorAll('.campo-plantilla').forEach((li) => {
    const x = campos[Number(li.dataset.i)];
    x.etiqueta = li.querySelector('[data-k=etiqueta]').value.trim();
    x.tipo = li.querySelector('[data-k=tipo]').value;
    x.opciones = li.querySelector('[data-k=opciones]').value.split(',').map((o) => o.trim()).filter(Boolean);
  });
  const pintar = () => { $campos.innerHTML = campos.map(filaCampo).join(''); };

  d.addEventListener('change', (e) => {
    if(e.target.matches('[data-k=tipo]')){
      e.target.closest('.campo-plantilla').querySelector('[data-k=opciones]').closest('.campo').hidden = e.target.value !== 'opcion';
    }
  });
  d.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.icono){ elegido = b.dataset.icono; d.querySelectorAll('[data-icono]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }
    if(b.matches('[data-agregar]')){ leer(); campos.push({ clave: '', etiqueta: '', tipo: 'texto', opciones: [] }); pintar(); $campos.lastElementChild.querySelector('input').focus(); }
    if(b.dataset.quitar){ leer(); campos.splice(Number(b.dataset.quitar), 1); pintar(); }
    if(b.dataset.arriba){ leer(); const i = Number(b.dataset.arriba); [campos[i - 1], campos[i]] = [campos[i], campos[i - 1]]; pintar(); }
    if(b.dataset.abajo){ leer(); const i = Number(b.dataset.abajo); [campos[i + 1], campos[i]] = [campos[i], campos[i + 1]]; pintar(); }
    if(b.matches('[data-borrar]')){
      if(!confirm(`¿Borrar «${c.nombre}»? No se puede deshacer.`)) return;
      try{ await ocupado(b, () => borrarCategoria(c.id)); aviso('Categoría borrada'); d.close(); recargar(); }
      catch(err){ console.error(err); aviso(err.message, 'mal'); }
    }
  });

  d.querySelector('[data-cat]').addEventListener('submit', async (e) => {
    e.preventDefault(); limpiarErrores(d); leer();
    const $n = d.querySelector('#cat-nombre'), nombre = $n.value.trim();
    if(!nombre){ error($n.closest('.campo'), 'Ponle nombre.'); $n.focus(); return; }
    const vacios = campos.findIndex((x) => !x.etiqueta);
    if(vacios >= 0){ error($campos.children[vacios].querySelector('.campo'), 'Ponle nombre al dato, o quítalo.'); return; }
    const sinOpciones = campos.findIndex((x) => x.tipo === 'opcion' && x.opciones.length < 2);
    if(sinOpciones >= 0){ error($campos.children[sinOpciones].querySelector('[data-k=opciones]').closest('.campo'), 'Escribe al menos dos opciones.'); return; }
    // Claves estables: la que ya tenía se queda; la nueva sale del nombre.
    const usadas = new Set(campos.map((x) => x.clave).filter(Boolean));
    const plantilla = campos.map((x) => {
      const clave = x.clave || hacerClave(x.etiqueta, usadas); usadas.add(clave);
      return { clave, etiqueta: x.etiqueta, tipo: x.tipo, ...(x.tipo === 'opcion' ? { opciones: x.opciones } : {}) };
    });
    const datos = { nombre, icono: elegido, activo: d.querySelector('#cat-activo').checked, plantilla };
    if(nueva){
      datos.clave = hacerClave(nombre, new Set(categorias.map((x) => x.clave)));
      datos.orden = categorias.length;
    }
    try{
      await ocupado(d.querySelector('[data-guardar-cat]'), () => guardarCategoria(c?.id || null, datos));
      aviso(nueva ? 'Categoría creada' : 'Categoría guardada'); d.close(); recargar();
    }catch(err){ console.error(err); aviso(err.message, 'mal'); }
  });
  void cuenta;
  return d;
}

/* ══ ETIQUETAS ═══════════════════════════════════════════════════════════ */

let _barras;
const cargarBarras = () => _barras ??= new Promise((ok, mal) => {
  const s = document.createElement('script');
  s.src = 'nucleo/vendor/jsbarcode-3.12.3.min.js';
  s.onload = () => ok(self.JsBarcode); s.onerror = () => { _barras = undefined; mal(new Error('No cargó el generador de códigos de barras')); };
  document.head.append(s);
});

const FORMATOS = {
  anaquel: { nombre: 'Anaquel', ayuda: 'Nombre, precio y código de barras. 50 × 25 mm.' },
  qr: { nombre: 'Con QR', ayuda: 'Nombre, precio y QR que abre el producto en la tienda. 50 × 30 mm.' },
  completa: { nombre: 'Completa', ayuda: 'Las dos: QR y código de barras. 64 × 34 mm.' },
};

async function etiquetas(){
  const { categorias, productos: todos, porId } = await catalogoAdmin();
  let ids = [];
  try{ ids = JSON.parse(sessionStorage.getItem(LLAVE_ETIQUETAS) || '[]'); }catch(e){}
  let lista = ids.map((id) => porId.get(id)).filter(Boolean);
  const f = recordar('tienda-admin-etiquetas', { formato: 'qr', copias: 1, cat: '' });

  return {
    html: `
      <div class="no-imprimir">
        <div class="segmentos" role="group" aria-label="Tipo de etiqueta">${Object.entries(FORMATOS).map(([k, x]) =>
          `<button type="button" data-formato="${k}" aria-pressed="${k === f.v.formato}">${x.nombre}</button>`).join('')}</div>
        <p class="nota" id="ayuda-formato">${esc(FORMATOS[f.v.formato].ayuda)}</p>
        <div class="filtros">
          <label class="campo compacto"><span class="etiqueta-campo">Productos</span><select id="cat">
            <option value="">${lista.length ? `Los que elegiste (${lista.length})` : 'Elige una categoría'}</option>
            ${categorias.map((c) => `<option value="${c.id}"${c.id === f.v.cat && !lista.length ? ' selected' : ''}>Toda la categoría: ${esc(c.nombre)}</option>`).join('')}
            <option value="*">Todos los visibles</option></select></label>
          <label class="campo compacto"><span class="etiqueta-campo">Copias de cada una</span>
            <input id="copias" inputmode="numeric" value="${f.v.copias}"></label>
        </div>
        <div class="botones"><button class="boton principal" data-imprimir>${icono('imprimir')}Imprimir</button>
          <button class="boton secundario" data-dar-codigos hidden>${icono('agregar')}Darles código</button></div>
        <p class="cuenta" id="cuenta" aria-live="polite"></p>
      </div>
      <div class="pliego" id="pliego"></div>`,

    async alMontar($c, { aviso }){
      const $pliego = $c.querySelector('#pliego');
      const [{ default: qrcode }, JsBarcode] = await Promise.all([
        import('../nucleo/vendor/qrcode-generator-2.0.4.mjs'),
        cargarBarras().catch((e) => { aviso(e.message, 'mal'); return null; }),
      ]);
      const qr = (texto) => { const q = qrcode(0, 'M'); q.addData(texto); q.make(); return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); };
      const codigo = (p) => p.codigo_barras || p.sku || '';

      const pintar = () => {
        if(!f.v.cat && !lista.length){ $pliego.innerHTML = estado({ icono: 'qr', titulo: 'Elige qué etiquetar', texto: 'Una categoría completa, todos, o desde Productos con los filtros que quieras.' }); $c.querySelector('#cuenta').textContent = ''; return; }
        const origen = f.v.cat === '*' ? todos.filter((p) => p.activo) : f.v.cat ? todos.filter((p) => p.categoria_id === f.v.cat) : lista;
        const copias = Math.min(50, Math.max(1, Number.parseInt(f.v.copias, 10) || 1));
        const fmt = f.v.formato;
        const sinCodigo = fmt !== 'qr' ? origen.filter((p) => !codigo(p)) : [];
        $c.querySelector('#cuenta').textContent = `${plural(origen.length * copias, 'etiqueta', 'etiquetas')}`
          + (sinCodigo.length ? ` · ${sinCodigo.length} sin código de barras` : '');
        const $dar = $c.querySelector('[data-dar-codigos]');
        $dar.hidden = !sinCodigo.length;
        $dar.dataset.ids = JSON.stringify(sinCodigo.map((p) => p.id));
        $dar.lastChild.textContent = `Darles código a ${sinCodigo.length}`;
        $pliego.className = 'pliego formato-' + fmt;
        $pliego.innerHTML = origen.flatMap((p) => Array(copias).fill(p)).map((p) => `<div class="etiqueta">
            ${fmt !== 'anaquel' ? `<div class="qr">${qr(direccionProducto(p.id))}</div>` : ''}
            <div class="datos"><span class="nombre">${esc(p.nombre)}</span><span class="precio-etq">${pesos(p.precio)}</span>
              ${fmt !== 'qr' && codigo(p) ? `<svg class="barras" data-codigo="${esc(codigo(p))}"></svg>` : ''}</div>
          </div>`).join('');
        if(JsBarcode) $pliego.querySelectorAll('svg.barras').forEach((svg) => {
          const c = svg.dataset.codigo;
          try{ JsBarcode(svg, c, { format: esEAN13(c) ? 'EAN13' : 'CODE128', height: 28, width: 1.2, fontSize: 11, margin: 0, textMargin: 1, flat: true }); }
          catch(e){ svg.outerHTML = `<span class="codigo-texto">${esc(c)}</span>`; }
        });
        f.guardar();
      };

      $c.querySelector('[role=group]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-formato]'); if(!b) return;
        f.v.formato = b.dataset.formato;
        $c.querySelectorAll('[data-formato]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        $c.querySelector('#ayuda-formato').textContent = FORMATOS[f.v.formato].ayuda;
        pintar();
      });
      $c.querySelector('#cat').addEventListener('change', (e) => { f.v.cat = e.target.value; if(f.v.cat) lista = []; pintar(); });
      $c.querySelector('#copias').addEventListener('change', (e) => { f.v.copias = e.target.value; pintar(); });
      $c.querySelector('[data-dar-codigos]').addEventListener('click', async (e) => {
        const b = e.currentTarget, ids = JSON.parse(b.dataset.ids || '[]');
        if(!ids.length || !confirm(`¿Darle código de barras propio a ${plural(ids.length, 'producto', 'productos')}? Empiezan con 2, el rango que es de cada tienda. Los que ya traen código no se tocan.`)) return;
        try{
          const n = await ocupado(b, () => asignarCodigos(ids));
          // Se vuelven a leer para pintar los códigos nuevos.
          const fresco = await catalogoAdmin();
          todos.splice(0, todos.length, ...fresco.productos);
          lista = lista.map((p) => fresco.porId.get(p.id)).filter(Boolean);
          aviso(`Listo: ${plural(n, 'producto nuevo con código', 'productos nuevos con código')}`);
          pintar();
        }catch(err){ console.error(err); aviso(err.message, 'mal'); }
      });
      $c.querySelector('[data-imprimir]').addEventListener('click', () => {
        if(!$pliego.querySelector('.etiqueta')){ aviso('Primero elige qué etiquetar', 'mal'); return; }
        window.print();
      });
      pintar();
    },
  };
}

/* ══ AJUSTES DEL NEGOCIO ═════════════════════════════════════════════════ */

/* Contraste WCAG del texto blanco sobre el acento: si no llega a 4.5, los
   botones principales no se leen. Se detiene ahí en vez de dejar guardarlo. */
function contrasteConBlanco(hex){
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05);
}
const MUESTRAS = ['#8E1B1B', '#1F4E8C', '#1D6B4F', '#6B2FA3', '#B3401E', '#1B1714', '#8A5A00', '#0E6A78'];

/* CLABE: 18 dígitos, el último es de control (pesos 3, 7, 1). Un dígito mal
   copiado y la transferencia rebota — mejor avisar al escribirla. */
function clabeValida(c){
  if(!/^\d{18}$/.test(c)) return false;
  const pesos_ = [3, 7, 1];
  const s = [...c.slice(0, 17)].reduce((t, d, i) => t + (Number(d) * pesos_[i % 3]) % 10, 0);
  return (10 - (s % 10)) % 10 === Number(c[17]);
}

async function ajustes(){
  const n = await negocio();
  const m = n.marca || {}, a = n.ajustes || {};
  const envio = a.envio || {}, contacto = a.contacto || {}, pagos = a.pagos || {}, ticket = a.ticket || {};
  const acento = /^#[0-9a-f]{6}$/i.test(m.acento || '') ? m.acento : '#8E1B1B';

  const campo = (id, etq, valor, extra = '', ayuda = '') => `<label class="campo" for="${id}"><span class="etiqueta-campo">${etq}</span>
    <input id="${id}" name="${id}" value="${esc(valor ?? '')}" autocomplete="off" ${extra}>${ayuda ? `<span class="ayuda">${ayuda}</span>` : ''}</label>`;
  const casilla = (id, etq, ayuda, si) => `<label class="interruptor"><input type="checkbox" id="${id}" name="${id}"${si ? ' checked' : ''}>
    <span><strong>${etq}</strong>${ayuda ? `<small>${ayuda}</small>` : ''}</span></label>`;

  return {
    html: `
      ${a.muestra ? `<p class="aviso-linea">${icono('info')}Esta es la tienda de muestra: lo que cambies aquí lo ve cualquiera que la abra.</p>` : ''}
      <form class="ajustes" id="ajustes" novalidate>
        <section class="tarjeta bloque-form">
          <h2>El negocio</h2>
          ${campo('nombre', 'Nombre completo', n.nombre, 'maxlength="80" required')}
          ${campo('nombre_corto', 'Nombre corto', m.nombre_corto || '', 'maxlength="24"', 'El que va en el menú y en la pestaña. Corto se lee mejor en el teléfono.')}
          ${campo('giro', 'Giro', n.giro, 'maxlength="60"', 'A qué se dedica: barbería, papelería, ropa…')}
        </section>

        <section class="tarjeta bloque-form">
          <h2>Color de la marca</h2>
          <p class="nota">Botones, precios en oferta y lo que está activo.</p>
          <div class="colores">
            ${MUESTRAS.map((c) => `<button type="button" class="muestra-color" data-color="${c}" style="--c:${c}" aria-label="Usar ${c}" aria-pressed="${c.toLowerCase() === acento.toLowerCase()}"></button>`).join('')}
            <label class="muestra-color otro" aria-label="Otro color"><input type="color" id="acento" value="${acento}"></label>
          </div>
          <p class="vista-color"><span class="boton principal" id="vista-boton" style="--acento:${acento}">Así se ve un botón</span>
            <span class="ayuda" id="contraste" aria-live="polite"></span></p>
        </section>

        <section class="tarjeta bloque-form">
          <h2>Envíos</h2>
          <div class="dos">
            ${campo('envio_costo', 'Costo del envío', envio.costo ?? '', 'inputmode="decimal" placeholder="0 = gratis"')}
            ${campo('envio_gratis', 'Gratis a partir de', envio.gratis_desde ?? '', 'inputmode="decimal" placeholder="Vacío = nunca"')}
          </div>
          ${campo('envio_zona', 'Hasta dónde entregan', envio.zona || '', 'maxlength="160" placeholder="Querétaro capital y Corregidora"')}
          ${campo('envio_tiempo', 'Cuándo llega', envio.tiempo || '', 'maxlength="120" placeholder="El mismo día si pides antes de las 2"')}
          ${casilla('recoger', 'También pueden pasar a recoger', 'Sin costo de envío.', envio.recoger !== false)}
        </section>

        <section class="tarjeta bloque-form">
          <h2>Cómo te pagan</h2>
          ${casilla('pago_efectivo', 'Efectivo al recibir', 'El repartidor cobra y da cambio.', pagos.efectivo !== false)}
          ${casilla('pago_tarjeta', 'Tarjeta al recibir', 'Si el repartidor lleva terminal.', !!pagos.tarjeta)}
          ${casilla('pago_transferencia', 'Transferencia', 'Se muestran estos datos al pagar.', !!pagos.transferencia)}
          <div id="datos-banco"${pagos.transferencia ? '' : ' hidden'}>
            ${campo('banco', 'Banco', pagos.banco || '', 'maxlength="40"')}
            ${campo('clabe', 'CLABE', pagos.clabe || '', 'inputmode="numeric" maxlength="18"', '18 dígitos. Se revisa que esté bien copiada.')}
            ${campo('titular', 'A nombre de', pagos.titular || '', 'maxlength="80"')}
          </div>
        </section>

        <section class="tarjeta bloque-form">
          <h2>El ticket</h2>
          <p class="nota">Lo que dice cada ticket impreso. La impresora se configura en cada caja: Punto de venta → Impresora.</p>
          ${campo('ticket_encabezado', 'Debajo del nombre', ticket.encabezado || '', 'maxlength="120" placeholder="Lo que vendes, en una línea"')}
          ${campo('ticket_rfc', 'RFC (opcional)', ticket.rfc || '', 'maxlength="13" autocapitalize="characters"')}
          ${campo('ticket_pie', 'Al final', ticket.pie || '', 'maxlength="160" placeholder="¡Gracias por tu compra!"')}
          ${casilla('ticket_qr', 'Código QR para volver a pedir', 'El cliente lo escanea y cae en la tienda en línea.', ticket.qr !== false)}
        </section>

        <section class="tarjeta bloque-form">
          <h2>Cómo le dicen tus clientes</h2>
          <p class="nota">El buscador y el bot entienden estas palabras como la misma cosa. Sirve cuando el catálogo viene en inglés o con otro nombre: si alguien busca «tenis», también encuentra «sneakers». Un grupo por renglón.</p>
          <label class="campo" for="sinonimos"><span class="oculto">Palabras que significan lo mismo</span>
            <textarea id="sinonimos" name="sinonimos" rows="6" placeholder="termo = tumbler, botella&#10;playera = camiseta, t-shirt">${esc(sinonimosATexto(a.bot?.sinonimos))}</textarea></label>
        </section>

        <section class="tarjeta bloque-form">
          <h2>Contacto</h2>
          ${campo('whatsapp', 'WhatsApp', contacto.whatsapp || '', 'inputmode="tel" maxlength="16" placeholder="442 123 4567"', '10 dígitos. Es el botón de «escríbenos».')}
          ${campo('horario', 'Horario', contacto.horario || '', 'maxlength="120" placeholder="Lunes a sábado, 10 a 7"')}
          ${campo('direccion', 'Dirección del local', contacto.direccion || '', 'maxlength="200"')}
          <div class="en-linea">
            <button type="button" class="boton secundario" data-ubicar-tienda>${icono('lugar')}<span data-tienda-texto>${a.tienda?.lat ? 'Ubicación guardada · tomarla otra vez' : 'Estoy en la tienda: tomar su ubicación'}</span></button>
          </div>
          <p class="nota con-margen">De ahí salen las rutas de los repartidores y el mapa del tablero.</p>
        </section>

        <div class="barra-guardar">
          <span class="chip ojo" id="sin-guardar" hidden>Sin guardar</span>
          <button type="submit" class="boton principal" id="guardar">${icono('listo')}Guardar ajustes</button>
        </div>
      </form>`,

    alMontar($c, { aviso }){
      const $f = $c.querySelector('#ajustes'), $acento = $c.querySelector('#acento');
      let cambiado = false;
      const marcar = () => { cambiado = true; $c.querySelector('#sin-guardar').hidden = false; };
      const alSalir = (e) => { if(cambiado){ e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', alSalir);

      const probarColor = () => {
        const c = $acento.value, r = contrasteConBlanco(c);
        $c.querySelector('#vista-boton').style.setProperty('--acento', c);
        $c.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.color.toLowerCase() === c.toLowerCase()));
        $c.querySelector('#contraste').textContent = r >= 4.5 ? 'Se lee bien.' : `Muy claro: el texto blanco encima no se lee (${r.toFixed(1)} de 4.5). Escoge uno más oscuro.`;
        $c.querySelector('#contraste').classList.toggle('malo', r < 4.5);
      };
      $f.addEventListener('input', marcar);
      $f.addEventListener('change', (e) => {
        marcar();
        if(e.target.id === 'pago_transferencia') $c.querySelector('#datos-banco').hidden = !e.target.checked;
      });
      let tienda = a.tienda || null;
      $c.querySelector('[data-ubicar-tienda]').addEventListener('click', (e) => {
        const b = e.currentTarget;
        if(!navigator.geolocation){ aviso('Este aparato no da ubicación', 'mal'); return; }
        b.setAttribute('aria-busy', 'true');
        navigator.geolocation.getCurrentPosition((pos) => {
          tienda = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
          b.removeAttribute('aria-busy'); marcar();
          $c.querySelector('[data-tienda-texto]').textContent = 'Ubicación tomada · falta Guardar';
          aviso(`Ubicación tomada (±${Math.round(pos.coords.accuracy)} m)`);
        }, (err) => { b.removeAttribute('aria-busy'); aviso(err.code === 1 ? 'Sin permiso de ubicación' : 'No se pudo tomar la ubicación', 'mal'); },
        { enableHighAccuracy: true, timeout: 15000 });
      });
      $acento.addEventListener('input', probarColor);
      $c.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { $acento.value = b.dataset.color; probarColor(); marcar(); }));
      probarColor();

      $f.addEventListener('submit', async (e) => {
        e.preventDefault(); limpiarErrores($f);
        const v = (id) => $f.elements[id].value.trim(), si = (id) => $f.elements[id].checked;
        const campoDe = (id) => $f.elements[id].closest('.campo');
        let malo = null;
        const falla = (id, t) => { error(campoDe(id), t); malo ??= $f.elements[id]; };
        if(!v('nombre')) falla('nombre', 'El negocio necesita nombre.');
        const costo = numero(v('envio_costo')), gratis = numero(v('envio_gratis'));
        if(Number.isNaN(costo) || costo < 0) falla('envio_costo', 'Escribe una cantidad, o 0 si es gratis.');
        if(Number.isNaN(gratis) || gratis < 0) falla('envio_gratis', 'Escribe una cantidad, o déjalo vacío.');
        const tel = v('whatsapp').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
        if(tel && tel.length !== 10) falla('whatsapp', 'Son 10 dígitos, sin el 52.');
        const clabe = v('clabe').replace(/\D/g, '');
        if(si('pago_transferencia') && !clabeValida(clabe)) falla('clabe', clabe.length === 18 ? 'Esa CLABE tiene un dígito mal: revísala contra tu estado de cuenta.' : 'La CLABE tiene 18 dígitos.');
        if(!si('pago_efectivo') && !si('pago_tarjeta') && !si('pago_transferencia')) falla('pago_efectivo', 'Deja al menos una forma de pago.');
        if(contrasteConBlanco($acento.value) < 4.5){ malo ??= $acento; aviso('Ese color es muy claro para los botones', 'mal'); }
        if(malo){ malo.focus(); aviso('Revisa lo marcado en rojo', 'mal'); return; }

        // Se mezcla con lo que ya había: demo, muestra y lo que agreguen otros bloques no se pisa.
        const cambios = {
          nombre: v('nombre'), giro: v('giro') || n.giro,
          marca: { ...m, nombre_corto: v('nombre_corto') || v('nombre'), acento: $acento.value.toUpperCase() },
          ajustes: { ...a,
            envio: { ...envio, costo: costo ?? 0, gratis_desde: gratis, zona: v('envio_zona'), tiempo: v('envio_tiempo'), recoger: si('recoger') },
            pagos: { ...pagos, efectivo: si('pago_efectivo'), tarjeta: si('pago_tarjeta'), transferencia: si('pago_transferencia'),
              banco: v('banco'), clabe, titular: v('titular') },
            contacto: { ...contacto, whatsapp: tel, horario: v('horario'), direccion: v('direccion') },
            ...(tienda ? { tienda } : {}),
            ticket: { ...ticket, encabezado: v('ticket_encabezado'), rfc: v('ticket_rfc').toUpperCase(), pie: v('ticket_pie'), qr: si('ticket_qr') },
            bot: { ...(a.bot || {}), sinonimos: textoASinonimos($f.elements.sinonimos.value) },
          },
        };
        try{
          await ocupado($c.querySelector('#guardar'), () => guardarNegocio(cambios));
          cambiado = false;
          aviso('Ajustes guardados. Recargando para aplicarlos…');
          setTimeout(() => location.reload(), 900);
        }catch(err){ console.error(err); aviso(err.message, 'mal'); }
      });
      return () => window.removeEventListener('beforeunload', alSalir);
    },
  };
}

export const PANTALLAS = {
  productos, productoEditar, inventario, categorias: categoriasPantalla, etiquetas, ajustes,
};

/* Para las pruebas en frío (sin navegador): la lógica que no pinta. */
export const _prueba = { digitoEAN, codigoInterno, esEAN13, clabeValida, contrasteConBlanco, hacerClave };
