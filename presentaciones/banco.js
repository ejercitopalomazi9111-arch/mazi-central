/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · el banco de imágenes
   ──────────────────────────────────────────────────────────────────────────
   Carlos tiene 300 imágenes hechas para actualizar sus presentaciones y
   necesita saber de cada una: qué es, qué temas trae, y si ya está lista o
   le falta algo (y qué). Y encontrarlas escribiendo lo que busca.

   Tres decisiones que salen de ahí:
   · SUBIR 300 NO PUEDE SER 300 FORMULARIOS. Se eligen todas de un jalón y
     Paulina llena título, qué es, temas y palabras clave de cada una. Carlos
     sólo corrige y decide el estado: eso es criterio, no captura.
   · EL ESTADO LO PONE ÉL. Si la IA ve un defecto (borrosa, marca de agua) lo
     deja escrito en notas, pero la imagen queda «sin revisar» hasta que él
     diga «lista» o «requiere cambios».
   · SE EDITAN EN LOTE: elegir veinte y ponerles un tema o marcarlas listas.
   ═════════════════════════════════════════════════════════════════════════ */
import * as IA from './ia.js';

const ESTADOS = { 'sin-revisar': 'Sin revisar', lista: 'Lista para usar', cambios: 'Requiere cambios' };
const CORTO = { 'sin-revisar': 'Sin revisar', lista: 'Lista', cambios: 'Cambios' };
const sinAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Buscar: cada palabra tiene que aparecer en algún lado (en cualquier orden,
   sin acentos, «robo» encuentra «robótica»). Pesa más en el título y los
   temas que en la descripción. */
export function buscarEn(fichas, q){
  const palabras = sinAcentos(q).split(/[\s,]+/).filter(Boolean);
  if(!palabras.length) return fichas;
  const campos = (f) => [[f.titulo, 5], [(f.temas || []).join(' '), 4], [(f.palabras || []).join(' '), 4], [f.descripcion, 2], [f.cambios, 1], [f.notas, 1], [f.nombre, 1], [f.carpeta, 2]].map(([t, p]) => [sinAcentos(t), p]);
  const salida = [];
  for(const f of fichas){
    const cs = campos(f);
    let total = 0, todas = true;
    for(const w of palabras){
      let mejor = 0;
      for(const [t, p] of cs){
        if(!t) continue;
        if(new RegExp(`(^|[^a-z0-9ñ])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)) mejor = Math.max(mejor, p * 2);
        else if(t.includes(w)) mejor = Math.max(mejor, p);
      }
      if(!mejor){ todas = false; break; }
      total += mejor;
    }
    if(todas) salida.push({ f, total });
  }
  return salida.sort((a, b) => b.total - a.total || b.f.creado - a.f.creado).map((x) => x.f);
}

export function crearBanco(U){
  const { h, $, $$, hoja, cerrar, aviso, ocupado, segmento, plural, OK } = U;
  let fichas = null, q = '', estado = 'todas', tema = '', elegidas = new Set(), cargando = null;
  const minis = new Map();         // id → object URL
  const raiz = $('#banco');

  /* ── miniaturas, a medida que se ven ── */
  const obs = new IntersectionObserver((es) => { for(const e of es) if(e.isIntersecting){ obs.unobserve(e.target); ponerMini(e.target); } }, { rootMargin: '400px 0px' });
  async function ponerMini(img){
    const id = img.dataset.id;
    try{
      if(!minis.has(id)){ const b = await IA.banco.bytes(id, 'mini').catch(() => IA.banco.bytes(id)); minis.set(id, URL.createObjectURL(b.blob)); }
      img.src = minis.get(id);
    }catch{ img.alt = 'sin vista'; }
  }

  async function cargar(forzar = false){
    if(fichas && !forzar) return fichas;
    if(cargando) return cargando;
    cargando = IA.banco.lista().then((l) => { fichas = l; return l; }).finally(() => { cargando = null; });
    return cargando;
  }

  /* ══ LA PANTALLA ══ */
  async function mostrar(){
    raiz.hidden = false;
    if(!IA.llave()){ pintarSinLlave(); return; }
    if(!fichas){ raiz.replaceChildren(h('div', { class: 'banco-cargando' }, h('span', { class: 'pensando' }, h('i'), h('i'), h('i')), ' Abriendo el banco…')); }
    try{ await cargar(); }catch(e){ raiz.replaceChildren(h('div', { class: 'inicio' }, h('p', {}, e.message), e.llave ? botonLlave() : null)); return; }
    pintar();
  }
  function botonLlave(){
    const inp = h('input', { class: 'entrada', type: 'text', placeholder: 'Pega aquí el link de La Sala o la llave', autocomplete: 'off' });
    return h('div', { class: 'a-quien', style: { textAlign: 'left' } }, h('b', {}, 'El banco vive en La Sala. '), 'Pega el link con el que entras a la sala (o la llave) una sola vez.',
      h('div', { style: { height: '8px' } }), inp, h('div', { style: { height: '8px' } }),
      h('button', { class: 'btn ancho', type: 'button', on: { click: () => { if(IA.ponerLlave(inp.value)) mostrar(); else aviso('No encontré la llave en eso.', 'mal'); } } }, 'Conectar'));
  }
  function pintarSinLlave(){
    raiz.replaceChildren(h('div', { class: 'inicio' }, h('h1', {}, 'Tu banco de ', h('b', {}, 'imágenes')), h('p', {}, 'Súbelas una vez, con qué es cada una, sus temas y si ya está lista. Luego las encuentras escribiendo.'), botonLlave()));
  }

  function pintar(){
    const lista = filtradas();
    const cuenta = (e) => fichas.filter((f) => f.estado === e).length;
    const temas = temasComunes();
    const buscar = h('input', { class: 'entrada', type: 'search', placeholder: 'Buscar: robot, azul…', value: q, enterkeyhint: 'search', 'aria-label': 'Buscar en el banco' });
    buscar.addEventListener('input', () => { q = buscar.value; pintarRejilla(); });
    const subir = h('input', { class: 'oculto', type: 'file', accept: 'image/*', multiple: true, on: { change: () => { const fs = [...subir.files]; subir.value = ''; if(fs.length) prepararSubida(fs); } } });
    const chipsEstado = h('div', { class: 'ejemplos filtros' }, [['todas', `Todas · ${fichas.length}`], ['sin-revisar', `Sin revisar · ${cuenta('sin-revisar')}`], ['lista', `Listas · ${cuenta('lista')}`], ['cambios', `Requieren cambios · ${cuenta('cambios')}`]]
      .map(([v, t]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(estado === v), on: { click: () => { estado = v; pintar(); } } }, t)));
    const chipsTema = temas.length ? h('div', { class: 'ejemplos filtros' }, temas.map(([t, n]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(tema === t), on: { click: () => { tema = tema === t ? '' : t; pintar(); } } }, `${t} · ${n}`))) : null;
    const faltan = fichas.filter((f) => !f.ia && !f.descripcion).length;
    raiz.replaceChildren(
      h('div', { class: 'banco-cab' },
        h('div', { class: 'fila', style: { flexWrap: 'nowrap' } }, buscar,
          h('label', { class: 'btn primario' }, '+ Subir', subir)),
        chipsEstado, chipsTema,
        h('div', { class: 'banco-linea' }, h('span', { id: 'banco-cuenta' }),
          faltan ? h('button', { class: 'chip', type: 'button', on: { click: () => describirLote(fichas.filter((f) => !f.ia && !f.descripcion).map((f) => f.id)) } }, `✦ Describir ${faltan} con IA`) : null,
          fichas.length ? h('button', { class: 'chip', type: 'button', on: { click: exportar } }, 'Exportar a Excel') : null)),
      h('div', { id: 'banco-progreso' }),
      h('div', { class: 'rejilla-banco', id: 'rejilla-banco' }),
      h('div', { class: 'barra-lote', id: 'barra-lote', hidden: true }),
    );
    pintarRejilla(lista);
    if(!fichas.length) $('#rejilla-banco').replaceWith(h('div', { class: 'inicio', style: { paddingTop: '24px' } },
      h('p', {}, 'El banco está vacío. Toca «+ Subir» y elige todas las imágenes de un jalón: Paulina escribe qué es cada una y tú sólo corriges.')));
  }
  function temasComunes(){
    const c = new Map();
    for(const f of fichas) for(const t of f.temas || []) c.set(t, (c.get(t) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }
  function filtradas(){
    let l = fichas;
    if(estado !== 'todas') l = l.filter((f) => f.estado === estado);
    if(tema) l = l.filter((f) => (f.temas || []).includes(tema));
    return buscarEn(l, q);
  }
  function pintarRejilla(lista = filtradas()){
    const r = $('#rejilla-banco');
    if(!r) return;
    $('#banco-cuenta').textContent = lista.length === fichas.length ? plural(fichas.length, 'imagen', 'imágenes') : `${lista.length} de ${fichas.length}`;
    r.replaceChildren(...lista.map(carta));
    if(!lista.length && fichas.length) r.append(h('p', { class: 'nota', style: { gridColumn: '1/-1' } }, q ? `Nada con «${q}». Prueba con otra palabra.` : 'Ninguna en este filtro.'));
    pintarLote();
  }
  function carta(f){
    const img = h('img', { alt: f.titulo || f.nombre, 'data-id': f.id, loading: 'lazy' });
    if(minis.has(f.id)) img.src = minis.get(f.id); else obs.observe(img);
    const c = h('div', { class: 'banco-carta', 'data-ficha': f.id },
      h('button', { class: 'banco-abrir', type: 'button', 'aria-label': `Abrir ${f.titulo || f.nombre}`, on: { click: () => (elegidas.size ? alternar(f.id) : abrirFicha(f.id)) } },
        img, h('span', { class: 'banco-titulo' }, f.titulo || f.nombre), h('span', { class: `estado-ficha e-${f.estado}` }, CORTO[f.estado])),
      h('button', { class: 'banco-check', type: 'button', role: 'checkbox', 'aria-checked': String(elegidas.has(f.id)), 'aria-label': 'Elegir', on: { click: () => alternar(f.id) } }, h('span', { class: 'marca-sel', innerHTML: OK })));
    return c;
  }
  function alternar(id){
    elegidas.has(id) ? elegidas.delete(id) : elegidas.add(id);
    const c = $(`[data-ficha="${id}"] .banco-check`); if(c) c.setAttribute('aria-checked', String(elegidas.has(id)));
    pintarLote();
  }
  function pintarLote(){
    const b = $('#barra-lote');
    if(!b) return;
    b.hidden = !elegidas.size;
    if(!elegidas.size) return;
    const ids = [...elegidas];
    const hacer = async (campos, agregar, msj) => {
      ocupado('Guardando…');
      try{ const hechas = await IA.banco.cambiarVarias(ids, campos, agregar); for(const f of hechas) reemplazar(f); aviso(msj(hechas.length), 'bien'); elegidas.clear(); pintar(); }
      catch(e){ aviso(e.message, 'mal'); } finally{ ocupado(''); }
    };
    b.replaceChildren(h('span', { class: 'que' }, h('b', {}, plural(ids.length, 'elegida', 'elegidas'))),
      h('button', { class: 'chip', type: 'button', on: { click: () => hacer({ estado: 'lista' }, '', (n) => `${plural(n, 'imagen marcada', 'imágenes marcadas')} como lista${n === 1 ? '' : 's'}.`) } }, '✓ Listas'),
      h('button', { class: 'chip', type: 'button', on: { click: () => loteCambios(ids, hacer) } }, 'Requieren cambios'),
      h('button', { class: 'chip', type: 'button', on: { click: () => loteTema(ids, hacer) } }, '+ Tema'),
      h('button', { class: 'chip', type: 'button', on: { click: () => { const l = [...ids]; elegidas.clear(); pintarLote(); describirLote(l); } } }, '✦ Describir'),
      h('button', { class: 'chip', type: 'button', on: { click: () => { const vis = filtradas().map((f) => f.id); const todas = vis.every((id) => elegidas.has(id)); vis.forEach((id) => todas ? elegidas.delete(id) : elegidas.add(id)); pintarRejilla(); } } }, 'Todas las de aquí'),
      h('button', { class: 'chip', type: 'button', on: { click: () => { elegidas.clear(); pintarRejilla(); } } }, 'Quitar'));
  }
  function loteTema(ids, hacer){
    const inp = h('input', { class: 'entrada', type: 'text', placeholder: 'ciencia, robótica' });
    hoja('Poner tema', [h('p', { class: 'a-quien' }, `A ${plural(ids.length, 'imagen', 'imágenes')}. Se suma a los temas que ya tengan.`), h('label', { class: 'campo' }, 'Temas (separados por coma)', inp),
      h('button', { class: 'btn primario ancho', type: 'button', on: { click: () => { if(!inp.value.trim()) return; cerrar('#hoja'); hacer({}, inp.value, (n) => `Tema puesto en ${plural(n, 'imagen', 'imágenes')}.`); } } }, 'Poner tema')]);
    inp.focus();
  }
  function loteCambios(ids, hacer){
    const t = h('textarea', { class: 'entrada', placeholder: 'Ej. quitar el logo viejo, poner fondo blanco' });
    hoja('Requieren cambios', [h('p', { class: 'a-quien' }, `${plural(ids.length, 'imagen', 'imágenes')}. Si les falta lo mismo, escríbelo una vez.`), h('label', { class: 'campo' }, 'Qué les falta (opcional)', t),
      h('button', { class: 'btn primario ancho', type: 'button', on: { click: () => { cerrar('#hoja'); hacer(t.value.trim() ? { estado: 'cambios', cambios: t.value } : { estado: 'cambios' }, '', (n) => `${plural(n, 'imagen marcada', 'imágenes marcadas')}: requiere${n === 1 ? '' : 'n'} cambios.`); } } }, 'Marcar')]);
  }
  const reemplazar = (f) => { const i = fichas.findIndex((x) => x.id === f.id); if(i >= 0) fichas[i] = f; else fichas.unshift(f); };

  /* ══ SUBIR ══ */
  function prepararSubida(archivos){
    const describe = h('input', { type: 'checkbox', checked: true });
    const carpeta = h('input', { class: 'entrada', type: 'text', placeholder: 'Ej. Presentación de biología (opcional)' });
    const pesa = archivos.reduce((s, f) => s + f.size, 0);
    const ya = new Set((fichas || []).map((f) => f.huella).filter(Boolean));
    const rep = archivos.filter((a) => ya.has(huella(a))).length;
    hoja('Subir al banco', [
      rep ? h('p', { class: 'nota', 'data-repetidas': rep }, rep === archivos.length ? `Las ${archivos.length} ya están en el banco: no hay nada que subir.` : `${plural(rep, 'ya está', 'ya están')} en el banco y se ${rep === 1 ? 'salta' : 'saltan'}: sólo se suben ${archivos.length - rep}.`) : '',
      h('p', { class: 'a-quien' }, h('b', {}, plural(archivos.length, 'imagen', 'imágenes')), ` · ${(pesa / 1048576).toFixed(0)} MB. Las muy grandes se ajustan a 2560 px, que sobra para una lámina.`),
      h('label', { class: 'check' }, describe, h('span', {}, 'Que Paulina describa cada una', h('br'), h('small', { class: 'nota' }, `Título, qué es, temas y palabras clave. Unos segundos por imagen (≈ ${Math.max(1, Math.round(archivos.length * 6 / 60))} min en total). Deja la pantalla abierta.`))),
      h('label', { class: 'campo' }, 'Grupo o carpeta', carpeta),
      h('button', { class: 'btn primario ancho', type: 'button', on: { click: () => { cerrar('#hoja'); subirTodas(archivos, { describir: describe.checked, carpeta: carpeta.value }); } } }, `Subir ${plural(archivos.length, 'imagen', 'imágenes')}`),
    ]);
  }
  let parar = false;
  /* Subir 300 desde el iPhone. Lo que aprendimos que falla y cómo se cubre:
     · Safari PAUSA la página si cambias de app o se apaga la pantalla: la
       pantalla se mantiene encendida (Wake Lock) y lo que falle se reintenta.
     · Si se corta a la mitad, se vuelven a elegir TODAS: las que ya subieron
       se reconocen (nombre + tamaño) y se saltan. Nada se sube dos veces.
     · Primero se SUBEN todas (lo que importa es que queden a salvo) y después
       Paulina las describe; si cierras antes, las fotos ya están en el banco
       y «✦ Describir N con IA» retoma lo que falte. */
  const huella = (a) => `${a.name}|${a.size}`;
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  async function conReintentos(fn, veces = 4){
    for(let n = 1; ; n++){
      try{ return await fn(); }
      catch(e){
        if(e.llave || e.noSeRepite || n >= veces || parar) throw e;
        if(typeof navigator !== 'undefined' && navigator.onLine === false) await new Promise((ok) => addEventListener('online', ok, { once: true }));
        else await espera(1500 * 2 ** (n - 1));
      }
    }
  }
  let candado = null;
  async function pantallaEncendida(si){
    try{
      if(si && !candado && navigator.wakeLock) candado = await navigator.wakeLock.request('screen');
      if(!si && candado){ await candado.release(); candado = null; }
    }catch{}
  }
  const alVolver = () => { if(document.visibilityState === 'visible' && candado?.released) { candado = null; pantallaEncendida(true); } };
  const noCierres = (e) => { e.preventDefault(); e.returnValue = ''; };

  async function subirTodas(archivos, { describir, carpeta }){
    parar = false;
    const ya = new Set((fichas || []).map((f) => f.huella).filter(Boolean));
    const repetidas = archivos.filter((a) => ya.has(huella(a))).length;
    const cola = archivos.filter((a) => !ya.has(huella(a)));
    const caja = $('#banco-progreso');
    const barra = h('progress', { max: cola.length, value: 0 });
    const texto = h('span', {}, repetidas ? `${plural(repetidas, 'ya estaba', 'ya estaban')} en el banco; subiendo ${cola.length}…` : 'Empezando…');
    const nota = h('small', { class: 'nota' }, 'Deja esta pantalla abierta. Si se corta, vuelve a elegir todas: las que ya subieron se saltan.');
    const errores = [];
    caja.replaceChildren(h('div', { class: 'progreso-banco' }, h('div', { class: 'fila', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } }, texto,
      h('button', { class: 'chip', type: 'button', on: { click: () => { parar = true; texto.textContent = 'Deteniendo después de las que van…'; } } }, 'Detener')), barra, nota));
    await pantallaEncendida(true);
    document.addEventListener('visibilitychange', alVolver);
    addEventListener('beforeunload', noCierres);
    const nuevas = [];
    try{
      /* 1 · subir, de tres en tres */
      let hechas = 0, k = 0;
      const subidor = async () => {
        while(k < cola.length && !parar){
          const a = cola[k++];
          try{ const f = await conReintentos(() => subirUna(a, { carpeta })); reemplazar(f); nuevas.push(f.id); }
          catch(e){ errores.push(`${a.name}: ${e.message}`); if(e.llave) parar = true; }
          barra.value = ++hechas;
          texto.textContent = `Subidas ${hechas} de ${cola.length}${repetidas ? ` (+${repetidas} que ya estaban)` : ''}`;
          if(hechas % 10 === 0 || hechas === cola.length) pintarRejilla();
        }
      };
      await Promise.all([subidor(), subidor(), subidor()]);
      /* 2 · describir con IA, de dos en dos */
      if(describir && nuevas.length && !parar){
        let n = 0, j = 0;
        barra.max = nuevas.length; barra.value = 0;
        nota.textContent = 'Ya están todas a salvo en el banco. Si cierras ahora, «✦ Describir con IA» retoma las que falten.';
        const descriptor = async () => {
          while(j < nuevas.length && !parar){
            const id = nuevas[j++];
            try{ await conReintentos(() => describirUna(id), 3); }
            catch(e){ errores.push(`${(fichas.find((f) => f.id === id) || {}).nombre || id}: la IA no pudo (${e.message})`); if(e.llave) parar = true; }
            barra.value = ++n;
            texto.textContent = `Paulina describió ${n} de ${nuevas.length}`;
            if(n % 10 === 0 || n === nuevas.length) pintarRejilla();
          }
        };
        await Promise.all([descriptor(), descriptor()]);
      }
    }finally{
      await pantallaEncendida(false);
      document.removeEventListener('visibilitychange', alVolver);
      removeEventListener('beforeunload', noCierres);
    }
    caja.replaceChildren(errores.length ? h('div', { class: 'progreso-banco mal' }, h('b', {}, `${plural(nuevas.length, 'subida', 'subidas')}, ${plural(errores.length, 'falló', 'fallaron')}:`), h('ul', {}, errores.slice(0, 12).map((e) => h('li', {}, e))),
      errores.length > 12 ? h('p', { class: 'nota' }, `…y ${errores.length - 12} más.`) : '', h('p', { class: 'nota' }, 'Vuelve a elegir las mismas fotos: sólo se sube lo que falta.')) : '');
    aviso(parar ? `Detenido: ${plural(nuevas.length, 'imagen subida', 'imágenes subidas')}.` : `${plural(nuevas.length, 'imagen nueva', 'imágenes nuevas')} en el banco${repetidas ? ` (${repetidas} ya estaban)` : ''}.`, errores.length ? 'mal' : 'bien', { ms: 7000 });
    pintar();
  }
  async function subirUna(archivo, { carpeta }){
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    let mime = archivo.type || 'image/jpeg';
    let final = { bytes, mime }, dims = { ancho: 0, alto: 0 };
    if(mime !== 'image/gif'){
      const a = await IA.ajustar(bytes, mime, { max: 2560 }).catch(() => {
        const e = new Error(/hei[cf]/i.test(mime + archivo.name) ? 'es HEIC y este navegador no lo abre. En el iPhone: Ajustes → Cámara → Formatos → «Más compatible», o compártela como JPG.' : 'no se pudo abrir como imagen.');
        e.noSeRepite = true; throw e;
      });
      // Si achicarla no la hizo más ligera (una foto ya chica), se queda la original.
      final = a.bytes.length < bytes.length || !/^image\/(jpeg|png|webp)$/.test(mime) ? { bytes: a.bytes, mime: a.mime } : { bytes, mime };
      dims = { ancho: a.ancho, alto: a.alto };
    }
    const mini = await IA.ajustar(final.bytes, final.mime === 'image/png' ? 'image/jpeg' : final.mime, { max: 480 }).catch(() => null);
    const f = await IA.banco.subir({
      huella: huella(archivo),
      nombre: archivo.name, mime: final.mime, datos: IA.aB64(final.bytes), mini: mini ? IA.aB64(mini.bytes) : undefined, ...dims,
      campos: { titulo: archivo.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim(), ...(carpeta ? { carpeta } : {}) },
    });
    if(mini) minis.set(f.id, URL.createObjectURL(new Blob([mini.bytes], { type: 'image/jpeg' })));
    return f;
  }
  async function describirUna(id){
    const b = await IA.banco.bytes(id);
    const d = await IA.describir(b.bytes, b.mime);
    const f = fichas.find((x) => x.id === id) || {};
    const notas = d.problemas ? `La IA notó: ${d.problemas}` + (f.notas ? `\n${f.notas}` : '') : f.notas;
    const nueva = await IA.banco.cambiar(id, { titulo: d.titulo || f.titulo, descripcion: d.descripcion, temas: [...new Set([...(f.temas || []), ...d.temas])], palabras: d.palabras, notas, ia: true });
    reemplazar(nueva);
    return nueva;
  }
  async function describirLote(ids){
    parar = false;
    const caja = $('#banco-progreso');
    const barra = h('progress', { max: ids.length, value: 0 }), texto = h('span', {}, `Paulina está describiendo ${plural(ids.length, 'imagen', 'imágenes')}…`);
    caja.replaceChildren(h('div', { class: 'progreso-banco' }, h('div', { class: 'fila', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } }, texto, h('button', { class: 'chip', type: 'button', on: { click: () => { parar = true; } } }, 'Detener')), barra));
    let n = 0, mal = 0;
    for(const id of ids){
      if(parar) break;
      try{ await describirUna(id); }catch(e){ mal++; if(e.llave) break; }
      barra.value = ++n; texto.textContent = `${n} de ${ids.length} descritas`;
      if(n % 5 === 0) pintarRejilla();
    }
    caja.replaceChildren();
    aviso(`${plural(n - mal, 'imagen descrita', 'imágenes descritas')}${mal ? ` · ${mal} no se pudieron` : ''}.`, mal ? 'mal' : 'bien');
    pintar();
  }

  /* ══ LA FICHA ══ */
  async function abrirFicha(id){
    const f = fichas.find((x) => x.id === id);
    if(!f) return;
    const img = h('img', { class: 'grande-img', alt: f.titulo || f.nombre });
    if(minis.has(id)) img.src = minis.get(id);
    IA.banco.bytes(id).then((b) => { img.src = URL.createObjectURL(b.blob); img.dataset.grande = '1'; }).catch(() => {});
    const titulo = h('input', { class: 'entrada', type: 'text', value: f.titulo || '' });
    const desc = h('textarea', { class: 'entrada', rows: 3 }, f.descripcion || '');
    const temas = h('input', { class: 'entrada', type: 'text', value: (f.temas || []).join(', '), placeholder: 'ciencia, escuela' });
    const palabras = h('input', { class: 'entrada', type: 'text', value: (f.palabras || []).join(', '), placeholder: 'robot, azul, laboratorio' });
    const cambios = h('textarea', { class: 'entrada', rows: 3, placeholder: 'Qué le falta para poder usarla' }, f.cambios || '');
    const notas = h('textarea', { class: 'entrada', rows: 2 }, f.notas || '');
    const carpeta = h('input', { class: 'entrada', type: 'text', value: f.carpeta || '' });
    let est = f.estado;
    const zonaCambios = h('label', { class: 'campo', hidden: est !== 'cambios' }, 'Qué cambios necesita', cambios);
    const botonIA = h('button', { class: 'btn ancho', type: 'button', hidden: est !== 'cambios', on: { click: () => hacerCambios(f, cambios.value) } }, '✦ Hacer los cambios con IA');
    const leer = () => ({ titulo: titulo.value, descripcion: desc.value, temas: temas.value, palabras: palabras.value, estado: est, cambios: cambios.value, notas: notas.value, carpeta: carpeta.value });
    hoja(f.titulo || f.nombre, [
      img,
      h('p', { class: 'nota', style: { margin: '0 0 12px' } }, `${f.nombre} · ${f.ancho && f.alto ? `${f.ancho}×${f.alto} · ` : ''}${f.bytes < 1048576 ? `${Math.max(1, Math.round(f.bytes / 1024))} KB` : `${(f.bytes / 1048576).toFixed(1)} MB`}${f.ia ? ' · descrita por Paulina' : ''}`),
      h('div', { class: 'seccion' }, h('h3', {}, 'Estado'),
        segmento([['sin-revisar', 'Sin revisar'], ['lista', 'Lista'], ['cambios', 'Requiere cambios']], est, (v) => { est = v; zonaCambios.hidden = botonIA.hidden = v !== 'cambios'; }),
        zonaCambios, botonIA),
      h('label', { class: 'campo' }, 'Título', titulo),
      h('label', { class: 'campo' }, 'Qué es', desc),
      h('label', { class: 'campo' }, 'Temas (separados por coma)', temas),
      h('label', { class: 'campo' }, 'Palabras clave', palabras),
      h('label', { class: 'campo' }, 'Grupo o carpeta', carpeta),
      h('label', { class: 'campo' }, 'Notas', notas),
      h('div', { class: 'fila dos' },
        h('button', { class: 'btn primario', type: 'button', on: { click: async () => {
          ocupado('Guardando…');
          try{ reemplazar(await IA.banco.cambiar(id, leer())); cerrar('#hoja'); aviso('Guardada.', 'bien'); pintar(); }
          catch(e){ aviso(e.message, 'mal'); } finally{ ocupado(''); }
        } } }, 'Guardar'),
        h('button', { class: 'btn', type: 'button', on: { click: async () => {
          ocupado('Paulina está mirando la imagen…');
          try{
            const b = await IA.banco.bytes(id), d = await IA.describir(b.bytes, b.mime);
            if(d.titulo) titulo.value = d.titulo;
            desc.value = d.descripcion;
            temas.value = [...new Set([...temas.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), ...d.temas])].join(', ');
            palabras.value = d.palabras.join(', ');
            if(d.problemas && !notas.value.includes(d.problemas)) notas.value = `La IA notó: ${d.problemas}` + (notas.value ? `\n${notas.value}` : '');
            aviso('Listo. Revisa y toca Guardar.', 'bien');
          }catch(e){ aviso(e.message, 'mal'); } finally{ ocupado(''); }
        } } }, '✦ Describir con IA')),
      h('div', { style: { height: '8px' } }),
      h('div', { class: 'fila dos' },
        h('button', { class: 'btn', type: 'button', on: { click: async () => {
          const b = await IA.banco.bytes(id); const u = URL.createObjectURL(b.blob);
          const a = h('a', { href: u, download: f.nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
        } } }, 'Descargar'),
        h('button', { class: 'btn', type: 'button', style: { color: 'var(--mal)' }, on: { click: async (e) => {
          const b = e.currentTarget;
          if(b.dataset.seguro !== '1'){ b.dataset.seguro = '1'; b.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { b.dataset.seguro = ''; b.textContent = 'Borrar del banco'; }, 4000); return; }
          ocupado('Borrando…');
          try{ await IA.banco.borrar(id); fichas = fichas.filter((x) => x.id !== id); cerrar('#hoja'); aviso('Borrada del banco.'); pintar(); }
          catch(err){ aviso(err.message, 'mal'); } finally{ ocupado(''); }
        } } }, 'Borrar del banco')),
    ]);
  }
  /* «Requiere cambios» + lo que le falta → Paulina hace una versión nueva. La
     vieja NO se toca: la nueva entra al banco como otra ficha, sin revisar,
     con el mismo título y temas, y dice de cuál salió. */
  async function hacerCambios(f, pedido){
    if(!pedido.trim()){ aviso('Escribe qué cambios necesita.', 'mal'); return; }
    ocupado('Paulina está haciendo la versión nueva… (hasta 1 min)');
    try{
      const b = await IA.banco.bytes(f.id);
      const x = await IA.paraIA(b.bytes, b.mime);
      const r = await IA.imagen({ prompt: `Haz estos cambios a la imagen y deja todo lo demás igual: ${pedido}`, imagenes: x ? [x] : [], aspecto: IA.aspectoCercano(f.ancho || 16, f.alto || 9) });
      const a = await IA.ajustar(r.bytes, r.mime, { ancho: f.ancho || undefined, alto: f.alto || undefined, max: 2560 });
      const mini = await IA.ajustar(a.bytes, 'image/jpeg', { max: 480 }).catch(() => null);
      const nueva = await IA.banco.subir({ nombre: f.nombre.replace(/(\.[a-z0-9]+)?$/i, ' (nueva)$1'), mime: a.mime, datos: IA.aB64(a.bytes), mini: mini ? IA.aB64(mini.bytes) : undefined, ancho: a.ancho, alto: a.alto, origen: f.id,
        campos: { titulo: `${f.titulo || f.nombre} (nueva)`, descripcion: f.descripcion, temas: f.temas, palabras: f.palabras, carpeta: f.carpeta, notas: `Hecha con IA desde «${f.titulo || f.nombre}»: ${pedido}` } });
      if(mini) minis.set(nueva.id, URL.createObjectURL(new Blob([mini.bytes], { type: 'image/jpeg' })));
      fichas.unshift(nueva);
      ocupado('');
      aviso('Versión nueva en el banco, sin revisar. La original se queda igual.', 'bien', { ms: 7000 });
      abrirFicha(nueva.id);
      pintar();
    }catch(e){ ocupado(''); aviso(e.message, 'mal', { ms: 9000 }); }
  }

  /* ══ EXPORTAR ══ Excel abre el CSV con acentos si trae la marca UTF-8 al inicio. */
  function exportar(){
    const cols = [['titulo', 'Título'], ['estado', 'Estado'], ['cambios', 'Cambios que necesita'], ['descripcion', 'Qué es'], ['temas', 'Temas'], ['palabras', 'Palabras clave'], ['carpeta', 'Grupo'], ['notas', 'Notas'], ['nombre', 'Archivo'], ['ancho', 'Ancho'], ['alto', 'Alto'], ['creado', 'Subida'], ['id', 'Clave']];
    const celda = (v) => { const s = Array.isArray(v) ? v.join(', ') : String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const filas = [cols.map(([, t]) => t), ...fichas.map((f) => cols.map(([k]) => k === 'estado' ? ESTADOS[f.estado] : k === 'creado' ? new Date(f.creado).toLocaleDateString('es-MX') : f[k]))];
    const csv = '﻿' + filas.map((r) => r.map(celda).join(',')).join('\r\n');
    const u = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = h('a', { href: u, download: `banco-de-imagenes-${new Date().toISOString().slice(0, 10)}.csv` }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  }

  /* ══ ELEGIR DEL BANCO (para cambiar una imagen de una lámina) ══
     Pinta un buscador con rejilla dentro de `zona`; al tocar una imagen llama
     a `alElegir({ bytes, mime })`. Las listas salen primero. */
  async function elegir(zona, alElegir){
    if(!IA.llave()){ zona.replaceChildren(botonLlave()); return; }
    zona.replaceChildren(h('span', { class: 'pensando' }, h('i'), h('i'), h('i')));
    try{ await cargar(); }catch(e){ zona.replaceChildren(h('p', {}, e.message)); return; }
    const inp = h('input', { class: 'entrada', type: 'search', placeholder: 'Buscar en tu banco', 'aria-label': 'Buscar en tu banco' });
    const soloListas = h('input', { type: 'checkbox', checked: fichas.some((f) => f.estado === 'lista') });
    const rej = h('div', { class: 'resultados' });
    const pinta = () => {
      let l = buscarEn(fichas, inp.value);
      if(soloListas.checked) l = l.filter((f) => f.estado === 'lista');
      rej.replaceChildren(...l.slice(0, 60).map((f) => {
        const img = h('img', { alt: f.titulo || f.nombre, 'data-id': f.id });
        if(minis.has(f.id)) img.src = minis.get(f.id); else obs.observe(img);
        return h('button', { type: 'button', title: f.titulo || f.nombre, 'data-banco': f.id, on: { click: async () => {
          ocupado('Trayendo la imagen del banco…');
          try{ const b = await IA.banco.bytes(f.id); ocupado(''); alElegir(b, f); }catch(e){ ocupado(''); aviso(e.message, 'mal'); }
        } } }, img);
      }));
      if(!l.length) rej.append(h('p', { class: 'nota', style: { gridColumn: '1/-1' } }, fichas.length ? 'Nada con eso.' : 'Tu banco está vacío: súbelas en la pestaña «Banco de imágenes».'));
    };
    inp.addEventListener('input', pinta); soloListas.addEventListener('change', pinta);
    zona.replaceChildren(inp, h('label', { class: 'check' }, soloListas, h('span', {}, 'Sólo las que están listas')), rej);
    pinta(); inp.focus();
  }

  return { mostrar, ocultar: () => { raiz.hidden = true; }, elegir, _estado: () => ({ fichas, elegidas }) };
}
