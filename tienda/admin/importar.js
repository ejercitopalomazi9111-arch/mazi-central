/* ══════════════════════════════════════════════════════════════════════════
   IMPORTAR · Bloque 4
   ──────────────────────────────────────────────────────────────────────────
   Tres pasos y ninguno pide saber de Excel:
     1. sube el archivo como lo tengas;
     2. revisa — arriba lo que la app no supo, abajo lo seguro;
     3. importa. Y si fue el archivo equivocado, «Deshacer».

   Lo que la app hace sola: encontrar el renglón de títulos, saber qué columna
   es cuál (columnas.js), reconocer los productos que YA existen por código de
   barras, clave o nombre —esos se actualizan, no se duplican— y acomodar los
   nuevos en su categoría aprendiendo del propio catálogo (clasificar.js).

   El mismo camino sirve para cambiar precios en bloque: se descargan los
   productos en Productos, se editan en Excel y se suben aquí.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, plural, estado, fecha, descargarCSV } from '../nucleo/piezas.js';
import { catalogoAdmin, importarProductos, deshacerImportacion, importacionesGuardadas, subirFoto } from '../nucleo/datos.js';
import { entrenar, predecir, sinAcentos } from '../nucleo/clasificar.js';
import { CAMPOS, encabezado, mapear, leerNumero, leerCodigo, normalNombre } from '../nucleo/columnas.js';

const PAGINA = 50;
const MAX_FILAS = 5000;

let _xlsx;
const cargarXLSX = () => _xlsx ??= new Promise((ok, mal) => {
  const s = document.createElement('script');
  s.src = 'nucleo/vendor/xlsx-0.20.3.core.min.js';
  s.onload = () => ok(self.XLSX);
  s.onerror = () => { _xlsx = undefined; mal(new Error('No cargó el lector de Excel. Revisa la señal y vuelve a intentar.')); };
  document.head.append(s);
});

const letra = (i) => { let s = ''; for(i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };

/* ── Del archivo a filas revisables ────────────────────────────────────── */

function armarRevision({ datos, mapa, primera }, { categorias, productos }){
  const catPorNombre = new Map();
  for(const c of categorias){ catPorNombre.set(sinAcentos(c.nombre), c.id); catPorNombre.set(sinAcentos(c.clave), c.id); }
  const porCodigo = new Map(), porSku = new Map(), porNombre = new Map();
  for(const p of productos){
    if(p.codigo_barras) porCodigo.set(p.codigo_barras, p);
    if(p.sku) porSku.set(sinAcentos(p.sku), p);
    porNombre.set(normalNombre(`${p.nombre} ${p.marca}`), p);
    if(!porNombre.has(normalNombre(p.nombre))) porNombre.set(normalNombre(p.nombre), p);
  }
  const modelo = entrenar(productos.filter((p) => p.categoria_id).map((p) => ({ texto: `${p.nombre} ${p.marca}`, categoria: p.categoria_id })),
    categorias.map((c) => ({ id: c.id, nombre: c.nombre })));

  const vistosCodigo = new Map(), vistosNombre = new Map(), vistosMatch = new Map();
  const filas = [];
  datos.forEach((f, k) => {
    if(!f || f.every((c) => c === '' || c == null)) return;
    const v = (campo) => mapa[campo] == null ? undefined : f[mapa[campo]];
    const renglon = primera + k + 2;       // como lo ve la persona en Excel
    const r = {
      renglon, errores: [], avisos: [],
      nombre: String(v('nombre') ?? '').trim().replace(/\s+/g, ' '),
      marca: String(v('marca') ?? '').trim(),
      descripcion: String(v('descripcion') ?? '').trim(),
      precio: leerNumero(v('precio')), antes: leerNumero(v('precio_antes')),
      sku: leerCodigo(v('sku')), codigo: leerCodigo(v('codigo_barras')),
      existencias: leerNumero(v('existencias')), catTexto: String(v('categoria') ?? '').trim(),
      foto: null,
    };
    if(!r.nombre) r.errores.push('Sin nombre');
    if(r.precio == null) r.errores.push('Sin precio');
    else if(r.precio < 0) r.errores.push('Precio negativo');
    if(r.antes != null && r.precio != null && r.antes <= r.precio){ r.avisos.push('El precio de antes no era mayor: se ignoró'); r.antes = null; }
    if(r.existencias != null) r.existencias = Math.max(0, Math.round(r.existencias));

    // ¿Ya existe? Primero el código, luego la clave, luego el nombre.
    const clave = normalNombre(`${r.nombre} ${r.marca}`);
    r.match = (r.codigo && porCodigo.get(r.codigo)) || (r.sku && porSku.get(sinAcentos(r.sku)))
      || porNombre.get(clave) || porNombre.get(normalNombre(r.nombre)) || null;
    if(r.codigo){
      const dueño = porCodigo.get(r.codigo);
      if(dueño && r.match && dueño.id !== r.match.id) r.errores.push(`Ese código ya es de «${dueño.nombre}»`);
      if(vistosCodigo.has(r.codigo)) r.errores.push(`Código repetido: también está en el renglón ${vistosCodigo.get(r.codigo)}`);
      else vistosCodigo.set(r.codigo, renglon);
    }
    if(r.nombre){
      if(r.match && vistosMatch.has(r.match.id)) r.errores.push(`Repetido: el renglón ${vistosMatch.get(r.match.id)} ya es este producto`);
      else if(!r.match && vistosNombre.has(clave)) r.errores.push(`Repetido: igual al renglón ${vistosNombre.get(clave)}`);
      if(r.match) vistosMatch.set(r.match.id, renglon); else vistosNombre.set(clave, renglon);
    }

    // Categoría: la que dice el archivo si existe, la que ya tenía, o la que aprende.
    const delArchivo = r.catTexto && catPorNombre.get(sinAcentos(r.catTexto));
    if(delArchivo){ r.categoria_id = delArchivo; r.origen = 'archivo'; }
    else if(r.match && !r.catTexto){ r.categoria_id = r.match.categoria_id; r.origen = 'ya-tenia'; }
    else{
      const pred = predecir(modelo, `${r.nombre} ${r.marca} ${r.catTexto}`);
      r.categoria_id = pred.orden[0]?.categoria || categorias[0]?.id || null;
      r.origen = 'sugerida'; r.confianza = pred.confianza; r.dudoso = pred.dudoso;
    }

    // Qué cambia, si ya existía.
    if(r.match && !r.errores.length){
      const m = r.match, cambios = [];
      if(r.nombre !== m.nombre) cambios.push('nombre');
      if(r.precio != null && r.precio !== m.precio) cambios.push(`precio ${pesos(m.precio)} → ${pesos(r.precio)}`);
      if(mapa.precio_antes != null && (r.antes ?? null) !== (m.precio_antes ?? null)) cambios.push('oferta');
      if(mapa.marca != null && r.marca !== m.marca) cambios.push('marca');
      if(r.categoria_id && r.categoria_id !== m.categoria_id) cambios.push('categoría');
      if(r.codigo && r.codigo !== m.codigo_barras) cambios.push('código');
      if(r.sku && r.sku !== m.sku) cambios.push('clave');
      if(mapa.descripcion != null && r.descripcion && r.descripcion !== m.descripcion) cambios.push('descripción');
      if(r.existencias != null && r.existencias !== m.existencia.cantidad) cambios.push(`existencias ${m.existencia.cantidad} → ${r.existencias}`);
      if(!m.activo) cambios.push('vuelve a la tienda');
      r.cambios = cambios;
    }
    r.tipo = r.errores.length ? 'error' : r.match ? (r.cambios.length ? 'cambia' : 'igual') : 'nuevo';
    filas.push(r);
  });
  return filas;
}

/* ── La pantalla ───────────────────────────────────────────────────────── */

async function importar(){
  const cat = await catalogoAdmin();
  const { categorias } = cat;

  return {
    html: `<div id="importador"></div>`,
    alMontar($c, { aviso }){
      const $raiz = $c.querySelector('#importador');
      const s = { paso: 'elegir', archivo: '', hojas: [], hoja: 0, filas: [], mapa: {}, primera: 0, revision: [], ver: 'revisar', cuantos: PAGINA, fotos: new Map() };
      let cat_ = cat;

      const pintar = () => { $raiz.innerHTML = PASOS[s.paso](); window.scrollTo(0, 0); };
      const nombreCat = (id) => categorias.find((c) => c.id === id)?.nombre || 'Sin categoría';
      const opcionesCat = (sel) => categorias.map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('');

      /* 1 · Elegir */
      const historial = () => {
        const l = importacionesGuardadas();
        if(!l.length) return '';
        const ultima = l.find((x) => !x.deshecha);
        return `<section class="seccion"><header><h2>Importaciones anteriores</h2></header>
          <ul class="lista">${l.slice(0, 8).map((x) => `<li class="fila">
            <span class="circulo-chico">${icono(x.deshecha ? 'deshacer' : 'importar')}</span>
            <span class="texto"><strong>${esc(x.archivo)}</strong>
              <small>${esc(fecha(x.cuando))} · ${plural(x.cuenta.creados, 'nuevo', 'nuevos')} · ${plural(x.cuenta.actualizados, 'cambiado', 'cambiados')}</small></span>
            ${x.deshecha ? '<span class="chip">Deshecha</span>'
              : x === ultima ? `<button class="boton peligro" data-deshacer="${x.id}">${icono('deshacer')}Deshacer</button>` : ''}
          </li>`).join('')}</ul>
          <p class="nota">Se puede deshacer la más reciente. El historial vive en este teléfono.</p></section>`;
      };
      const PASOS = {};
      PASOS.elegir = () => `
        ${estado({ icono: 'importar', titulo: 'Sube tu lista de productos',
          texto: 'Excel o CSV, como la tengas. La app encuentra los títulos, reconoce lo que ya tienes y acomoda lo nuevo en su categoría. Antes de guardar, revisas.',
          botones: `<label class="boton principal grande">${icono('importar')}Elegir archivo
              <input type="file" id="archivo" accept=".xlsx,.xls,.csv,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden></label>
            <button class="boton secundario" data-plantilla>${icono('lista')}Descargar plantilla</button>` })}
        <p class="aviso-linea">${icono('info')}<span>¿Cambiar precios de muchos a la vez? En <a href="${enlace('/a/productos')}">Productos</a> toca «Descargar», cámbialos en Excel y súbelo aquí: se actualizan, no se duplican.</span></p>
        ${historial()}`;

      /* 2 · Columnas (sólo si no se adivinaron nombre y precio) */
      PASOS.columnas = () => {
        const titulos = s.filas[s.primera] || [];
        const muestra = s.filas.slice(s.primera + 1, s.primera + 4);
        const ancho = Math.max(titulos.length, ...muestra.map((f) => f.length));
        const opciones = (campo) => `<option value="">No viene en el archivo</option>` + Array.from({ length: ancho }, (_, j) => {
          const ej = muestra.map((f) => f[j]).find((x) => x !== '' && x != null);
          return `<option value="${j}"${s.mapa[campo] === j ? ' selected' : ''}>Columna ${letra(j)}${titulos[j] ? ` · «${esc(String(titulos[j]).slice(0, 24))}»` : ''}${ej != null ? ` — ej. ${esc(String(ej).slice(0, 24))}` : ''}</option>`;
        }).join('');
        return `
          <p class="nota">Archivo: <strong>${esc(s.archivo)}</strong>${s.hojas.length > 1 ? ` · hoja «${esc(s.hojas[s.hoja])}»` : ''} · ${plural(s.filas.length - s.primera - 1, 'renglón', 'renglones')}</p>
          ${s.hojas.length > 1 ? `<label class="campo"><span class="etiqueta-campo">Hoja</span><select id="hoja">${s.hojas.map((h, i) => `<option value="${i}"${i === s.hoja ? ' selected' : ''}>${esc(h)}</option>`).join('')}</select></label>` : ''}
          <section class="tarjeta bloque-form">
            <h2>¿Qué es cada columna?</h2>
            <p class="nota">Lo que se pudo, ya está puesto. Nombre y precio son necesarios.</p>
            <label class="campo"><span class="etiqueta-campo">Los títulos están en el renglón</span>
              <input id="primera" inputmode="numeric" value="${s.primera + 1}"></label>
            ${CAMPOS.map((k) => `<label class="campo"><span class="etiqueta-campo">${k.etiqueta}${k.obligatorio ? ' *' : ''}</span>
              <select data-campo="${k.id}">${opciones(k.id)}</select></label>`).join('')}
          </section>
          <div class="barra-guardar">
            <button class="boton secundario" data-otro>Otro archivo</button>
            <button class="boton principal" data-a-revisar>${icono('adelante')}Seguir</button>
          </div>`;
      };

      /* 3 · Revisar */
      const cuenta = () => {
        const c = { nuevo: 0, cambia: 0, igual: 0, error: 0, dudoso: 0 };
        for(const r of s.revision){ c[r.tipo]++; if(r.dudoso && !r.confirmada && r.tipo !== 'error') c.dudoso++; }
        return c;
      };
      const VISTAS = {
        revisar: (r) => r.tipo === 'error' || (r.dudoso && !r.confirmada && r.tipo !== 'igual'),
        nuevos: (r) => r.tipo === 'nuevo', cambios: (r) => r.tipo === 'cambia', todos: () => true,
      };
      const filaRev = (r) => {
        const chip = r.tipo === 'error' ? `<span class="chip mal">${icono('alerta')}${esc(r.errores[0])}</span>`
          : r.tipo === 'nuevo' ? '<span class="chip acento">Nuevo</span>'
          : r.tipo === 'cambia' ? `<span class="chip ojo">Cambia: ${esc(r.cambios.slice(0, 2).join(', '))}${r.cambios.length > 2 ? '…' : ''}</span>`
          : '<span class="chip">Sin cambios</span>';
        const duda = r.dudoso && !r.confirmada && r.tipo !== 'error' && r.tipo !== 'igual';
        return `<li class="fila-rev${duda ? ' dudosa' : ''}${r.tipo === 'error' ? ' con-error' : ''}" data-renglon="${r.renglon}">
          ${r.foto ? `<img class="mini" src="${esc(r.foto.url)}" alt="" width="56" height="56">` : r.match?.fotos?.[0] ? `<img class="mini" src="${esc(r.match.fotos[0])}" alt="" width="56" height="56" loading="lazy">` : `<span class="mini sin-foto">${icono('caja')}</span>`}
          <span class="texto"><strong>${esc(r.nombre || '(sin nombre)')}</strong>
            <small>Renglón ${r.renglon}${r.marca ? ` · ${esc(r.marca)}` : ''}${r.precio != null ? ` · ${pesos(r.precio)}` : ''}${r.existencias != null ? ` · ${r.existencias} pzas` : ''}</small>
            ${chip}${r.avisos.map((a) => `<small class="aviso-chico">${esc(a)}</small>`).join('')}</span>
          ${r.tipo === 'error' || r.tipo === 'igual' ? '' : `<label class="campo compacto cat-rev"><span class="etiqueta-campo">${duda ? 'Revisa la categoría' : 'Categoría'}</span>
            <select data-cat="${r.renglon}">${opcionesCat(r.categoria_id)}</select></label>`}
        </li>`;
      };
      PASOS.revisar = () => {
        const c = cuenta(), vistos = s.revision.filter(VISTAS[s.ver]);
        const aGuardar = c.nuevo + c.cambia;
        return `
          <p class="nota"><strong>${esc(s.archivo)}</strong> · <button class="enlace" data-columnas>cambiar columnas</button></p>
          <div class="cifras">
            <button class="cifra-caja boton-cifra" data-ver="nuevos"><span class="valor">${c.nuevo}</span><span class="etq">nuevos</span></button>
            <button class="cifra-caja boton-cifra" data-ver="cambios"><span class="valor">${c.cambia}</span><span class="etq">se actualizan</span></button>
            <button class="cifra-caja boton-cifra" data-ver="revisar"><span class="valor ojo">${c.dudoso}</span><span class="etq">categoría por revisar</span></button>
            <button class="cifra-caja boton-cifra" data-ver="revisar"><span class="valor mal">${c.error}</span><span class="etq">con problema (no se importan)</span></button>
          </div>
          ${c.igual ? `<p class="nota">${plural(c.igual, 'producto ya estaba igual', 'productos ya estaban iguales')}: no se tocan.</p>` : ''}
          <div class="segmentos" role="group" aria-label="Qué ver">${[['revisar', 'Revisar'], ['nuevos', 'Nuevos'], ['cambios', 'Cambios'], ['todos', 'Todos']].map(([k, t]) =>
            `<button data-ver="${k}" aria-pressed="${k === s.ver}">${t}</button>`).join('')}</div>
          ${s.ver === 'revisar' && c.dudoso ? `<div class="en-linea lote">
            <label class="campo compacto"><span class="etiqueta-campo">Poner las ${c.dudoso} por revisar en</span><select id="lote-cat">${opcionesCat()}</select></label>
            <button class="boton secundario" data-lote>Aplicar</button>
            <button class="boton fantasma" data-aceptar-todas>Dejar las sugeridas</button></div>` : ''}
          ${vistos.length ? `<ul class="lista revision">${vistos.slice(0, s.cuantos).map(filaRev).join('')}</ul>`
            : estado({ icono: 'listo', titulo: s.ver === 'revisar' ? 'Nada por revisar' : 'Nada aquí', texto: s.ver === 'revisar' ? 'Todo lo demás la app lo acomodó con seguridad.' : '' })}
          ${vistos.length > s.cuantos ? `<div class="botones centro"><button class="boton secundario" data-mas>Ver ${Math.min(PAGINA, vistos.length - s.cuantos)} más</button></div>` : ''}
          <section class="tarjeta bloque-form fotos-lote">
            <h2>Fotos (opcional)</h2>
            <p class="nota">Elige muchas a la vez. Se emparejan solas si el archivo de la foto se llama como el código de barras, la clave o el nombre del producto.${s.fotos.size ? ` <strong>${plural([...s.fotos.values()].filter((x) => x.r).length, 'foto emparejada', 'fotos emparejadas')} de ${s.fotos.size}.</strong>` : ''}</p>
            <label class="boton secundario">${icono('agregar')}Elegir fotos<input type="file" accept="image/*" multiple data-fotos hidden></label>
          </section>
          <div class="barra-guardar">
            <button class="boton secundario" data-otro>Otro archivo</button>
            <button class="boton principal" data-importar${aGuardar ? '' : ' disabled'}>${icono('listo')}Importar ${plural(aGuardar, 'producto', 'productos')}</button>
          </div>`;
      };

      PASOS.guardando = () => `<div class="estado" aria-busy="false"><span class="circulo">${icono('importar')}</span>
        <h2>Importando…</h2><p id="avance" aria-live="polite">Empezando…</p>
        <p class="nota">No cierres esta pantalla.</p></div>`;

      PASOS.listo = () => estado({ icono: 'listo', titulo: `Listo: ${plural(s.resultado.creados, 'producto nuevo', 'productos nuevos')}`,
        texto: `${plural(s.resultado.actualizados, 'actualizado', 'actualizados')} · existencias puestas en ${s.resultado.existencias}.`
          + (s.resultado.fallaron.length ? ` Faltaron las existencias de ${s.resultado.fallaron.length}: ajústalas en Inventario.` : ''),
        botones: `<a class="boton principal" href="${enlace('/a/productos')}">${icono('caja')}Ver productos</a>
          <button class="boton peligro" data-deshacer="${s.resultado.id}">${icono('deshacer')}Deshacer esta importación</button>
          <button class="boton secundario" data-otro>Importar otro archivo</button>` });

      /* ── Acciones ── */
      const leerArchivo = async (archivo) => {
        if(archivo.size > 10 * 1024 * 1024){ aviso('El archivo pesa más de 10 MB. Guarda sólo la hoja de productos y vuelve a intentar.', 'mal'); return; }
        const X = await cargarXLSX();
        const libro = X.read(await archivo.arrayBuffer(), { type: 'array', dense: true });
        s.archivo = archivo.name; s.libro = libro; s.hojas = libro.SheetNames;
        // La hoja con más renglones: la portada o las instrucciones casi nunca.
        const renglones = s.hojas.map((h) => X.utils.sheet_to_json(libro.Sheets[h], { header: 1, raw: true, defval: '' }));
        s.todas = renglones;
        s.hoja = renglones.reduce((m, r, i) => r.length > renglones[m].length ? i : m, 0);
        usarHoja();
      };
      const usarHoja = () => {
        s.filas = s.todas[s.hoja];
        if(s.filas.length > MAX_FILAS + 20){ aviso(`La hoja trae ${s.filas.length} renglones; se leen los primeros ${MAX_FILAS}.`, 'mal'); s.filas = s.filas.slice(0, MAX_FILAS + 20); }
        s.primera = encabezado(s.filas);
        s.mapa = mapear(s.filas[s.primera] || [], s.filas.slice(s.primera + 1, s.primera + 20));
        if(s.mapa.nombre != null && s.mapa.precio != null) revisar(); else { s.paso = 'columnas'; pintar(); }
      };
      const revisar = () => {
        s.revision = armarRevision({ datos: s.filas.slice(s.primera + 1), mapa: s.mapa, primera: s.primera }, cat_);
        if(!s.revision.length){ aviso('No encontré productos debajo de los títulos.', 'mal'); s.paso = 'columnas'; pintar(); return; }
        emparejarFotos();
        s.ver = s.revision.some(VISTAS.revisar) ? 'revisar' : 'todos'; s.cuantos = PAGINA; s.paso = 'revisar'; pintar();
      };
      const emparejarFotos = () => {
        if(!s.fotos.size) return;
        const idx = new Map();
        for(const r of s.revision){
          if(r.tipo === 'error') continue;
          for(const k of [r.codigo, sinAcentos(r.sku), normalNombre(r.nombre), normalNombre(`${r.nombre} ${r.marca}`)]) if(k && !idx.has(k)) idx.set(k, r);
        }
        for(const [nombre, x] of s.fotos){
          const base = nombre.replace(/\.[a-z0-9]+$/i, '').replace(/[-_ ](\d{1,2}|foto|img)$/i, '');
          const r = idx.get(base) || idx.get(sinAcentos(base)) || idx.get(normalNombre(base));
          x.r = r || null;
          if(r && !r.foto) r.foto = x;
        }
      };

      $raiz.addEventListener('change', async (e) => {
        const t = e.target;
        if(t.id === 'archivo' && t.files[0]){
          try{ await leerArchivo(t.files[0]); }
          catch(err){ console.error(err); aviso(err.message?.startsWith('No cargó') ? err.message : 'No pude leer ese archivo. ¿Es Excel o CSV?', 'mal'); }
        }
        if(t.id === 'hoja'){ s.hoja = Number(t.value); usarHoja(); }
        if(t.id === 'primera'){ const n = Math.max(1, Number.parseInt(t.value, 10) || 1) - 1; s.primera = n; s.mapa = mapear(s.filas[n] || [], s.filas.slice(n + 1, n + 20)); pintar(); }
        if(t.dataset.campo){
          const v = t.value === '' ? null : Number(t.value);
          for(const k of Object.keys(s.mapa)) if(s.mapa[k] === v) delete s.mapa[k];
          if(v == null) delete s.mapa[t.dataset.campo]; else s.mapa[t.dataset.campo] = v;
          pintar();
        }
        if(t.dataset.cat){
          const r = s.revision.find((x) => x.renglon === Number(t.dataset.cat));
          r.categoria_id = t.value; r.confirmada = true;
          if(r.match) r.cambios = [...r.cambios.filter((x) => x !== 'categoría'), ...(t.value !== r.match.categoria_id ? ['categoría'] : [])];
          if(r.tipo === 'igual' && r.cambios.length) r.tipo = 'cambia';
          t.closest('.fila-rev').classList.remove('dudosa');
          t.previousElementSibling.textContent = 'Categoría';
        }
        if(t.matches('[data-fotos]')){
          for(const f of t.files) s.fotos.set(f.name, { archivo: f, url: URL.createObjectURL(f), r: null });
          emparejarFotos(); pintar();
          const n = [...s.fotos.values()].filter((x) => x.r).length;
          aviso(n ? `${plural(n, 'foto emparejada', 'fotos emparejadas')}` : 'Ninguna foto se llama como un producto del archivo', n ? '' : 'mal');
        }
      });

      $raiz.addEventListener('click', async (e) => {
        const b = e.target.closest('button'); if(!b) return;
        if(b.matches('[data-plantilla]')) descargarCSV('plantilla-productos.csv', [
          ['Nombre', 'Marca', 'Categoría', 'Precio', 'Precio antes', 'SKU', 'Código de barras', 'Existencias', 'Descripción'],
          ['Producto de ejemplo · borra este renglón', 'Mi marca', categorias[0]?.nombre || '', '250', '', 'EJE-001', '', '12', ''],
          ['Otro producto de ejemplo', 'Otra marca', '', '480', '560', 'EJE-002', '7501234567890', '3', 'Una descripción corta'],
        ]);
        if(b.matches('[data-otro]')){ s.paso = 'elegir'; s.fotos.clear(); pintar(); }
        if(b.matches('[data-columnas]')){ s.paso = 'columnas'; pintar(); }
        if(b.matches('[data-a-revisar]')){
          if(s.mapa.nombre == null || s.mapa.precio == null){ aviso('Falta decir cuál columna es el nombre y cuál el precio', 'mal'); return; }
          revisar();
        }
        if(b.dataset.ver){ s.ver = b.dataset.ver; s.cuantos = PAGINA; pintar(); }
        if(b.matches('[data-mas]')){ s.cuantos += PAGINA; pintar(); }
        if(b.matches('[data-lote]')){
          const id = $raiz.querySelector('#lote-cat').value;
          const r = s.revision.filter((x) => x.dudoso && !x.confirmada && x.tipo !== 'error');
          r.forEach((x) => { x.categoria_id = id; x.confirmada = true; });
          aviso(`${plural(r.length, 'producto', 'productos')} en «${nombreCat(id)}»`); pintar();
        }
        if(b.matches('[data-aceptar-todas]')){
          s.revision.forEach((x) => { if(x.dudoso) x.confirmada = true; });
          aviso('Se quedan las categorías que sugirió la app'); s.ver = 'todos'; pintar();
        }
        if(b.dataset.deshacer){
          if(!confirm('¿Deshacer la importación? Los productos nuevos se quitan (los que ya se vendieron sólo se ocultan) y los cambiados vuelven a como estaban.')) return;
          b.setAttribute('aria-busy', 'true'); b.disabled = true;
          try{
            const r = await deshacerImportacion(b.dataset.deshacer);
            aviso(`Deshecha: ${plural(r.borrados, 'quitado', 'quitados')}${r.ocultos ? `, ${r.ocultos} ocultos` : ''}, ${plural(r.restaurados, 'restaurado', 'restaurados')}`);
            cat_ = await catalogoAdmin();
            s.paso = 'elegir'; pintar();
          }catch(err){ console.error(err); aviso(err.message, 'mal'); b.removeAttribute('aria-busy'); b.disabled = false; }
        }
        if(b.matches('[data-importar]')){
          const van = s.revision.filter((r) => r.tipo === 'nuevo' || r.tipo === 'cambia');
          const dudas = van.filter((r) => r.dudoso && !r.confirmada).length;
          if(dudas && !confirm(`${plural(dudas, 'producto va', 'productos van')} con la categoría que sugirió la app sin que la revisaras. ¿Importar así?`)) return;
          s.paso = 'guardando'; pintar();
          const $av = () => $raiz.querySelector('#avance');
          try{
            // Fotos primero: si una no sube, el producto entra sin ella.
            const conFoto = van.filter((r) => r.foto && !r.foto.subida);
            let k = 0;
            for(const r of conFoto){
              $av().textContent = `Subiendo fotos… ${++k} de ${conFoto.length}`;
              try{ r.foto.subida = await subirFoto(r.foto.archivo); }catch(err){ console.error(err); }
            }
            const fila = (r) => ({
              nombre: r.nombre, precio: r.precio, categoria_id: r.categoria_id || null,
              ...(s.mapa.marca != null ? { marca: r.marca } : {}),
              ...(s.mapa.descripcion != null && r.descripcion ? { descripcion: r.descripcion } : {}),
              ...(s.mapa.precio_antes != null ? { precio_antes: r.antes } : {}),
              ...(r.sku ? { sku: r.sku } : {}), ...(r.codigo ? { codigo_barras: r.codigo } : {}),
              ...(r.foto?.subida ? { fotos: [r.foto.subida, ...(r.match?.fotos || []).filter((u) => u !== r.foto.subida)] } : {}),
              ...(r.existencias != null ? { existencias: r.existencias } : {}),
            });
            s.resultado = await importarProductos({
              archivo: s.archivo,
              nuevos: van.filter((r) => r.tipo === 'nuevo').map((r) => ({ marca: '', ...fila(r) })),
              cambios: van.filter((r) => r.tipo === 'cambia').map((r) => ({ id: r.match.id, ...fila(r) })),
            }, (t) => { const a = $av(); if(a) a.textContent = t; });
            cat_ = await catalogoAdmin();
            s.paso = 'listo'; pintar();
          }catch(err){
            console.error(err);
            aviso(err.message || 'No se pudo importar', 'mal');
            s.paso = 'revisar'; pintar();
          }
        }
      });

      pintar();
    },
  };
}

export const PANTALLAS = { importar };

/* Para las pruebas en frío. */
export const _prueba = { armarRevision, letra };
