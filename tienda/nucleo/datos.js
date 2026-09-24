/* ══════════════════════════════════════════════════════════════════════════
   DATOS · la única puerta a la base
   ──────────────────────────────────────────────────────────────────────────
   Ninguna pantalla habla con Supabase por su cuenta: pasan por aquí. Así, si
   mañana cambia el proveedor (regla §2: conectar sí, depender no), se cambia
   este archivo y no treinta pantallas.

   Tres cosas viven aquí:
     · el NEGOCIO que se abrió (su marca, sus ajustes, si es de muestra);
     · el CATÁLOGO, ya con existencias, en la forma corta que usan las pantallas;
     · la SESIÓN: nadie necesita cuenta para ver y llenar el carrito. La sesión
       se crea cuando hace falta —al pagar, o al entrar a un apartado del
       personal en el negocio de muestra—, nunca antes.
   El carrito vive en el teléfono (localStorage) y sobrevive a todo eso.
   ═════════════════════════════════════════════════════════════════════════ */
import { SUPABASE_URL, SUPABASE_LLAVE_PUBLICABLE, negocioPedido } from '../config.js';

const SLUG = negocioPedido();

export const db = self.supabase.createClient(SUPABASE_URL, SUPABASE_LLAVE_PUBLICABLE, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tienda-sesion-' + SLUG },
});

/* ── Negocio ───────────────────────────────────────────────────────────── */
let _negocio;
export function negocio(){
  return _negocio ??= (async () => {
    const { data, error } = await db.from('negocios')
      .select('id, slug, nombre, giro, marca, ajustes').eq('slug', SLUG).maybeSingle();
    if(error) throw new ErrorDeDatos('No pudimos abrir la tienda', error);
    if(!data) throw new ErrorDeDatos('Esta tienda no existe', { code: 'negocio_no_existe' });
    return data;
  })().catch((e) => { _negocio = undefined; throw e; });
}

export class ErrorDeDatos extends Error{
  constructor(mensaje, causa){ super(mensaje); this.causa = causa; }
}

/* PostgREST entrega hasta 1000 renglones por vuelta. Un catálogo importado de
   Excel pasa de eso el primer día, así que se pide por páginas. */
async function todo(consulta){
  const salida = [];
  for(let desde = 0; ; desde += 1000){
    const { data, error } = await consulta().range(desde, desde + 999);
    if(error) throw new ErrorDeDatos('No pudimos cargar el catálogo', error);
    salida.push(...data);
    if(data.length < 1000) return salida;
  }
}

/* ── Catálogo ──────────────────────────────────────────────────────────── */
/* Forma corta, la misma que muestra/catalogo.json:
     id · n nombre · m marca · c clave de categoría · p precio · a precio antes
     f foto principal · fotos · d descripción · campos · q cuántas se pueden
     vender (cantidad − apartado) · x agotado · sku · cb código de barras   */
let _catalogo;
export function catalogo(){
  return _catalogo ??= (async () => {
    const n = await negocio();
    const [cats, prods, exist] = await Promise.all([
      todo(() => db.from('categorias').select('id, clave, nombre, icono, orden, plantilla, padre_id')
        .eq('negocio_id', n.id).order('orden')),
      todo(() => db.from('productos').select('id, categoria_id, nombre, marca, descripcion, precio, precio_antes, campos, fotos, sku, codigo_barras')
        .eq('negocio_id', n.id).eq('activo', true).order('nombre')),
      todo(() => db.from('existencias').select('producto_id, cantidad, apartado, minimo').eq('negocio_id', n.id)),
    ]);
    const clavePorId = new Map(cats.map((c) => [c.id, c.clave]));
    const hay = new Map(exist.map((e) => [e.producto_id, e]));
    const productos = prods.map((p) => {
      const e = hay.get(p.id);
      const q = e ? e.cantidad - e.apartado : 0;
      return {
        id: p.id, n: p.nombre, m: p.marca, c: clavePorId.get(p.categoria_id) || '',
        p: Number(p.precio), a: p.precio_antes ? Number(p.precio_antes) : null,
        f: p.fotos?.[0] || '', fotos: p.fotos || [], d: p.descripcion, campos: p.campos || {},
        q, min: e?.minimo ?? 0, x: q <= 0, sku: p.sku, cb: p.codigo_barras,
      };
    });
    const categorias = cats.map((c) => ({ id: c.clave, uuid: c.id, nombre: c.nombre, icono: c.icono, plantilla: c.plantilla, padre: c.padre_id }));
    return { categorias, productos, porId: new Map(productos.map((p) => [p.id, p])) };
  })().catch((e) => { _catalogo = undefined; throw e; });
}
/* Tras vender o ajustar, lo que se ve tiene que ser lo que hay. */
export function olvidarCatalogo(){ _catalogo = undefined; }

/* ── Carrito ───────────────────────────────────────────────────────────── */
const LLAVE_CARRITO = 'tienda-carrito-' + SLUG;
const leer = () => { try{ return new Map(JSON.parse(localStorage.getItem(LLAVE_CARRITO) || '[]')); }catch(e){ return new Map(); } };
const oyentes = new Set();
let _carro = leer();
const guardar = () => {
  try{ localStorage.setItem(LLAVE_CARRITO, JSON.stringify([..._carro])); }catch(e){}
  oyentes.forEach((f) => f());
};
export const carrito = {
  agregar(id, n = 1){ _carro.set(id, (_carro.get(id) || 0) + n); guardar(); },
  quitar(id){ const v = (_carro.get(id) || 0) - 1; v > 0 ? _carro.set(id, v) : _carro.delete(id); guardar(); },
  poner(id, n){ n > 0 ? _carro.set(id, n) : _carro.delete(id); guardar(); },
  cuantas(id){ return _carro.get(id) || 0; },
  renglones(){ return [..._carro]; },
  piezas(){ let t = 0; _carro.forEach((n) => t += n); return t; },
  vaciar(){ _carro.clear(); guardar(); },
  alCambiar(f){ oyentes.add(f); return () => oyentes.delete(f); },
};

/* ── Sesión ────────────────────────────────────────────────────────────── */
let _yo;   // { id, rol, nombre } o null
export async function yo(){
  if(_yo !== undefined) return _yo;
  const { data: { session } } = await db.auth.getSession();
  if(!session){ return _yo = null; }
  const { data } = await db.from('perfiles').select('id, rol, nombre').eq('id', session.user.id).maybeSingle();
  return _yo = data || null;
}

/* Pide a la función `entrar` un token de un solo uso y lo canjea por sesión.
   No manda correo: ver supabase/funciones/entrar/index.ts. */
async function entrar(tipo, rol){
  const r = await fetch(SUPABASE_URL + '/functions/v1/entrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_LLAVE_PUBLICABLE },
    body: JSON.stringify({ tipo, negocio: SLUG, rol }),
  });
  const cuerpo = await r.json().catch(() => ({}));
  if(!r.ok || !cuerpo.token_hash) throw new ErrorDeDatos('No pudimos entrar', cuerpo);
  const { error } = await db.auth.verifyOtp({ type: 'magiclink', token_hash: cuerpo.token_hash });
  if(error) throw new ErrorDeDatos('No pudimos entrar', error);
  _yo = undefined;
  return yo();
}

/* El cliente que empieza a pagar sin cuenta. */
export async function asegurarSesion(){
  return (await yo()) || entrar('invitado');
}

/* «Ver como» del negocio de muestra. La función se niega en uno real. */
export async function verComo(rol){
  const actual = await yo();
  if(actual?.rol === rol) return actual;
  await db.auth.signOut({ scope: 'local' });
  _yo = undefined;
  return entrar('demo', rol);
}

export async function salir(){
  await db.auth.signOut({ scope: 'local' });
  _yo = null;
}

/* Llamar a una función del servidor y traducir su error a algo que se lee.
   Los códigos vienen de 0003/0006 (`raise exception 'no_alcanza'` …). */
const DICCIONARIO = {
  sin_existencias: 'Ya no alcanzan las piezas de:',
  pago_insuficiente: 'Lo que se recibió no alcanza para el total.',
  falta_cobro: 'Falta decir cómo pagó.',
  no_autorizado: 'Tu cuenta no puede hacer esto.',
  sin_caja: 'Primero hay que abrir la caja.',
  sin_turno: 'No tienes un turno abierto.',
  sin_sesion: 'Hace falta entrar primero.',
  paso_invalido: 'Ese paso no se puede dar desde donde va el pedido.',
  falta_motivo: 'Falta decir el motivo.',
  pedido_vacio: 'No hay nada que cobrar.',
  cantidad_invalida: 'La cantidad no es válida.',
  producto_invalido: 'Uno de los productos ya no está a la venta.',
  ya_pagado: 'Esto ya estaba pagado.',
  sin_cambio: 'No hubo cambios que guardar.',
  no_existe: 'Eso ya no existe.',
  no_es_repartidor: 'Esa persona no es repartidor.',
  no_a_ti_mismo: 'No puedes cambiarte el rol a ti mismo.',
  otro_negocio: 'Eso es de otro negocio.',
};
export async function llamar(funcion, args){
  const { data, error } = await db.rpc(funcion, args);
  if(error){
    const m = error.message || '';
    const clave = Object.keys(DICCIONARIO).find((k) => m.startsWith(k));
    /* 'sin_existencias: Cera X' → «Ya no alcanzan las piezas de: Cera X» */
    const resto = clave && m.includes(':') ? ' ' + m.slice(m.indexOf(':') + 1).trim() : '';
    throw new ErrorDeDatos(clave ? DICCIONARIO[clave] + resto : 'Algo falló: ' + (m || 'sin detalle'), error);
  }
  return data;
}

/* ══ ADMINISTRACIÓN DEL CATÁLOGO (Bloque 3) ═════════════════════════════════
   Lo que escribe el admin. RLS (0002) ya exige que sea admin de ESTE negocio:
   aquí no se revisa rol, se deja que la base diga que no y se traduce el error.
   Inventario NUNCA se escribe directo: pasa por ajustar_inventario / poner_minimo. */

function revisa({ data, error }, que){
  if(error) throw new ErrorDeDatos(que, error);
  return data;
}

/* Todo el catálogo, activos y no activos, con existencias crudas. */
export async function catalogoAdmin(){
  const n = await negocio();
  const [cats, prods, exist] = await Promise.all([
    todo(() => db.from('categorias').select('*').eq('negocio_id', n.id).order('orden')),
    todo(() => db.from('productos').select('*').eq('negocio_id', n.id).order('nombre')),
    todo(() => db.from('existencias').select('producto_id, cantidad, apartado, minimo, actualizado').eq('negocio_id', n.id)),
  ]);
  const hay = new Map(exist.map((e) => [e.producto_id, e]));
  const productos = prods.map((p) => ({ ...p, precio: Number(p.precio), precio_antes: p.precio_antes == null ? null : Number(p.precio_antes),
    existencia: hay.get(p.id) || { cantidad: 0, apartado: 0, minimo: 0 } }));
  return { negocio: n, categorias: cats, productos, porId: new Map(productos.map((p) => [p.id, p])) };
}

/* Alta o cambio. Sólo se mandan los campos que el formulario conoce. */
const CAMPOS_PRODUCTO = ['nombre', 'marca', 'descripcion', 'precio', 'precio_antes', 'sku', 'codigo_barras', 'categoria_id', 'campos', 'fotos', 'activo'];
export async function guardarProducto(id, datos){
  const n = await negocio();
  const fila = Object.fromEntries(CAMPOS_PRODUCTO.filter((k) => k in datos).map((k) => [k, datos[k]]));
  const r = id
    ? await db.from('productos').update(fila).eq('id', id).select('id').single()
    : await db.from('productos').insert({ ...fila, negocio_id: n.id }).select('id').single();
  olvidarCatalogo();
  if(r.error?.code === '23505') throw new ErrorDeDatos('Ese código de barras ya lo tiene otro producto.', r.error);
  return revisa(r, 'No se pudo guardar el producto').id;
}

export async function ajustarInventario(id, delta, nota){
  const r = await llamar('ajustar_inventario', { p_producto: id, p_delta: delta, p_nota: nota });
  olvidarCatalogo(); return r;
}
export async function contarInventario(id, hay, nota){
  const r = await llamar('contar_inventario', { p_producto: id, p_hay: hay, p_nota: nota });
  olvidarCatalogo(); return r;
}
export async function ponerMinimo(id, minimo){
  const r = await llamar('poner_minimo', { p_producto: id, p_minimo: minimo });
  olvidarCatalogo(); return r;
}

export async function movimientosDe(id, cuantos = 30){
  return revisa(await db.from('movimientos').select('delta, motivo, canal, nota, cuando, quien:perfiles(nombre)')
    .eq('producto_id', id).order('cuando', { ascending: false }).limit(cuantos), 'No se pudo leer el historial');
}

export async function guardarCategoria(id, datos){
  const n = await negocio();
  const r = id
    ? await db.from('categorias').update(datos).eq('id', id).select('id').single()
    : await db.from('categorias').insert({ ...datos, negocio_id: n.id }).select('id').single();
  olvidarCatalogo();
  if(r.error?.code === '23505') throw new ErrorDeDatos('Ya hay una categoría con ese nombre.', r.error);
  return revisa(r, 'No se pudo guardar la categoría').id;
}

/* Sólo se borra una categoría vacía; con productos adentro, se oculta. La base
   pondría categoria_id en null y dejaría productos huérfanos sin avisar. */
export async function borrarCategoria(id){
  const { count, error } = await db.from('productos').select('id', { count: 'exact', head: true }).eq('categoria_id', id);
  if(error) throw new ErrorDeDatos('No se pudo revisar la categoría', error);
  if(count) throw new ErrorDeDatos(`Tiene ${count} productos: muévelos o mejor ocúltala.`, { code: 'con_productos' });
  revisa(await db.from('categorias').delete().eq('id', id), 'No se pudo borrar la categoría');
  olvidarCatalogo();
}

export async function guardarNegocio(cambios){
  const n = await negocio();
  const r = await db.from('negocios').update(cambios).eq('id', n.id).select('id, slug, nombre, giro, marca, ajustes').single();
  _negocio = Promise.resolve(revisa(r, 'No se pudieron guardar los ajustes'));
  return _negocio;
}

/* Fotos: se reducen EN EL TELÉFONO antes de subir. Una foto de cámara pesa
   4 MB; la tienda la enseña a 480 px. Se sube a 1200 px en WebP (≈150 KB). */
export async function subirFoto(archivo){
  const n = await negocio();
  const img = await createImageBitmap(archivo);
  const lado = Math.min(1, 1200 / Math.max(img.width, img.height));
  const lienzo = new OffscreenCanvas(Math.round(img.width * lado), Math.round(img.height * lado));
  lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
  const blob = await lienzo.convertToBlob({ type: 'image/webp', quality: 0.85 });
  const ruta = `${n.id}/${crypto.randomUUID()}.webp`;
  revisa(await db.storage.from('fotos').upload(ruta, blob, { contentType: 'image/webp', cacheControl: '31536000' }), 'No se pudo subir la foto');
  return db.storage.from('fotos').getPublicUrl(ruta).data.publicUrl;
}

/* EAN-13 internos (empiezan con 2) para los que no traen código. En lote y en
   el servidor: son cientos (0008). Devuelve cuántos recibieron código. */
export async function asignarCodigos(ids){
  const r = await llamar('asignar_codigos', { p_ids: ids });
  olvidarCatalogo(); return r;
}

/* ══ IMPORTAR (Bloque 4) ════════════════════════════════════════════════════
   Todo o nada, armado desde aquí: los productos nuevos entran en tandas de 500
   (cada tanda es UNA sentencia, así que entra completa o no entra) y si una
   tanda falla, se borra lo que ya había entrado. Lo cambiado se guarda antes
   como estaba, para deshacer. Las existencias pasan por contar_inventario, con
   su movimiento y su motivo, como cualquier otro ajuste.
   El historial vive en este teléfono (localStorage). La versión en el servidor
   está escrita en la migración 0009 y todavía sin aplicar; ver PENDIENTES.md. */
const LLAVE_IMPORTACIONES = 'tienda-importaciones-' + SLUG;
export function importacionesGuardadas(){
  try{ return JSON.parse(localStorage.getItem(LLAVE_IMPORTACIONES) || '[]'); }catch(e){ return []; }
}
function guardarImportaciones(lista){
  try{ localStorage.setItem(LLAVE_IMPORTACIONES, JSON.stringify(lista.slice(0, 20))); }catch(e){}
}
const COLUMNAS_PRODUCTO = 'id, negocio_id, categoria_id, nombre, marca, descripcion, precio, precio_antes, sku, codigo_barras, campos, fotos, activo, externo_id';
const tandas = (lista, n) => Array.from({ length: Math.ceil(lista.length / n) }, (_, i) => lista.slice(i * n, i * n + n));

/* Hace `trabajo` sobre cada elemento, de `a` en `a` a la vez. */
async function enParalelo(lista, a, trabajo){
  const salida = new Array(lista.length); let sig = 0;
  await Promise.all(Array.from({ length: Math.min(a, lista.length) }, async () => {
    while(sig < lista.length){ const i = sig++; salida[i] = await trabajo(lista[i], i); }
  }));
  return salida;
}

function errorDeImportar(error){
  if(error?.code === '23505'){
    const cb = /\)=\([^,]*,\s*([^)]+)\)/.exec(error.details || '')?.[1];
    return new ErrorDeDatos(cb ? `El código de barras ${cb} ya lo tiene otro producto de la tienda.` : 'Un código de barras del archivo ya lo tiene otro producto.', error);
  }
  if(error?.code === '23514') return new ErrorDeDatos('Un precio del archivo está en cero o negativo donde no se puede.', error);
  return new ErrorDeDatos('No se pudo guardar la importación: ' + (error?.message || 'sin detalle'), error);
}

async function borrarProductos(ids){
  for(const t of tandas(ids, 200)) await db.from('productos').delete().in('id', t);
}

/* nuevos: [{nombre, marca, …, existencias?}] · cambios: [{id, …campos, existencias?}]
   avance(texto) va diciendo en qué va. */
export async function importarProductos({ archivo, nuevos, cambios }, avance = () => {}){
  const n = await negocio();
  const id = crypto.randomUUID();
  const sinExist = ({ existencias, ...r }) => r;

  // 1 · Cómo estaba lo que se va a cambiar.
  avance('Guardando cómo estaba todo, por si hay que deshacer…');
  const antes = [];
  for(const t of tandas(cambios.map((c) => c.id), 200)){
    const [p, e] = await Promise.all([
      db.from('productos').select(COLUMNAS_PRODUCTO).in('id', t),
      db.from('existencias').select('producto_id, cantidad').in('producto_id', t),
    ]);
    if(p.error || e.error) throw errorDeImportar(p.error || e.error);
    const cant = new Map(e.data.map((x) => [x.producto_id, x.cantidad]));
    antes.push(...p.data.map((x) => ({ producto: x, cantidad: cant.get(x.id) ?? 0 })));
  }

  // 2 · Los nuevos, en tandas; si una falla, fuera lo que ya entró.
  const creados = [];
  const filasNuevas = nuevos.map((r, i) => ({ ...sinExist(r), negocio_id: n.id, externo_id: `importacion:${id}:${i}` }));
  try{
    for(const [k, t] of tandas(filasNuevas, 500).entries()){
      avance(`Dando de alta productos… ${Math.min((k + 1) * 500, filasNuevas.length)} de ${filasNuevas.length}`);
      const r = await db.from('productos').insert(t).select('id, externo_id');
      if(r.error) throw errorDeImportar(r.error);
      creados.push(...r.data);
    }
  }catch(e){
    avance('Algo falló: quitando lo que alcanzó a entrar…');
    await borrarProductos(creados.map((c) => c.id));
    throw e;
  }

  // 3 · Los cambios: cada renglón completo, encima de como estaba.
  const porId = new Map(antes.map((a) => [a.producto.id, a.producto]));
  const filasCambio = cambios.map((c) => ({ ...porId.get(c.id), ...sinExist(c), activo: true }));
  try{
    for(const t of tandas(filasCambio, 500)){
      avance('Actualizando los que ya tenías…');
      const r = await db.from('productos').upsert(t, { onConflict: 'id' });
      if(r.error) throw errorDeImportar(r.error);
    }
  }catch(e){
    avance('Algo falló: regresando todo como estaba…');
    for(const t of tandas(antes.map((a) => a.producto), 500)) await db.from('productos').upsert(t, { onConflict: 'id' });
    await borrarProductos(creados.map((c) => c.id));
    throw e;
  }

  // 4 · Existencias, con su movimiento. Ya no se deshace todo si una falla:
  //     se cuenta y se dice cuál.
  const idDeNuevo = new Map(creados.map((c) => [Number(c.externo_id.split(':')[2]), c.id]));
  const cantAntes = new Map(antes.map((a) => [a.producto.id, a.cantidad]));
  const conteos = [
    ...nuevos.map((r, i) => ({ id: idDeNuevo.get(i), hay: r.existencias, era: 0 })),
    ...cambios.map((c) => ({ id: c.id, hay: c.existencias, era: cantAntes.get(c.id) ?? 0 })),
  ].filter((x) => x.id && Number.isInteger(x.hay) && x.hay !== x.era);
  let hechos = 0; const fallaron = [];
  await enParalelo(conteos, 6, async (x) => {
    try{ await llamar('contar_inventario', { p_producto: x.id, p_hay: x.hay, p_nota: 'Importado de ' + archivo }); }
    catch(e){ fallaron.push(x.id); }
    avance(`Poniendo existencias… ${++hechos} de ${conteos.length}`);
  });

  const registro = { id, archivo, cuando: Date.now(), creados: creados.map((c) => c.id), antes, deshecha: null,
    cuenta: { creados: creados.length, actualizados: cambios.length, existencias: conteos.length - fallaron.length } };
  guardarImportaciones([registro, ...importacionesGuardadas()]);
  olvidarCatalogo();
  return { ...registro.cuenta, id, fallaron };
}

/* Como Ctrl+Z: sólo la última que siga en pie. Lo creado se borra, salvo lo
   que ya se vendió (se oculta, para no perder su historia). */
export async function deshacerImportacion(id, avance = () => {}){
  const lista = importacionesGuardadas();
  const r = lista.find((x) => x.id === id);
  if(!r) throw new ErrorDeDatos('Esa importación no está en este teléfono.', {});
  if(r.deshecha) throw new ErrorDeDatos('Esa importación ya se había deshecho.', {});
  if(lista.find((x) => !x.deshecha) !== r) throw new ErrorDeDatos('Primero hay que deshacer la más reciente.', {});

  avance('Revisando qué ya se vendió…');
  const vendidos = new Set();
  for(const t of tandas(r.creados, 200)){
    const v = await db.from('movimientos').select('producto_id').in('producto_id', t).eq('motivo', 'venta');
    if(v.error) throw errorDeImportar(v.error);
    v.data.forEach((x) => vendidos.add(x.producto_id));
  }
  const ocultar = r.creados.filter((x) => vendidos.has(x)), borrar = r.creados.filter((x) => !vendidos.has(x));
  avance('Quitando los productos nuevos…');
  await borrarProductos(borrar);
  for(const t of tandas(ocultar, 200)) await db.from('productos').update({ activo: false }).in('id', t);

  avance('Regresando los cambiados como estaban…');
  for(const t of tandas(r.antes.map((a) => a.producto), 500)){
    const u = await db.from('productos').upsert(t, { onConflict: 'id' });
    if(u.error) throw errorDeImportar(u.error);
  }
  const ahora = new Map();
  for(const t of tandas(r.antes.map((a) => a.producto.id), 200)){
    const e = await db.from('existencias').select('producto_id, cantidad').in('producto_id', t);
    (e.data || []).forEach((x) => ahora.set(x.producto_id, x.cantidad));
  }
  await enParalelo(r.antes.filter((a) => ahora.get(a.producto.id) !== a.cantidad), 6, (a) =>
    llamar('contar_inventario', { p_producto: a.producto.id, p_hay: a.cantidad, p_nota: 'Se deshizo la importación de ' + r.archivo }).catch(() => null));

  r.deshecha = Date.now();
  guardarImportaciones(lista);
  olvidarCatalogo();
  return { borrados: borrar.length, ocultos: ocultar.length, restaurados: r.antes.length };
}

/* ══ PUNTO DE VENTA (Bloque 5) ══════════════════════════════════════════════
   Vender pasa SIEMPRE por vender() del servidor (0003/0006): bloquea las
   existencias, exige el cobro en mostrador y deja rastro. La pantalla nunca
   descuenta nada por su cuenta. */

/* La caja abierta de quien está en la pantalla, o null. */
export async function miCaja(){
  const p = await yo();
  if(!p) return null;
  const r = await db.from('cajas').select('id, abierta, fondo').eq('perfil_id', p.id).is('cerrada', null).maybeSingle();
  if(r.error) throw new ErrorDeDatos('No se pudo revisar la caja', r.error);
  return r.data;
}
export const abrirCaja = (fondo) => llamar('abrir_caja', { p_fondo: fondo });
export const cerrarCaja = (contado, nota) => llamar('cerrar_caja', { p_contado: contado, p_nota: nota || null });

/* Lo cobrado en una caja, por forma de pago, en pesos. */
export async function cobrosDeCaja(cajaId){
  const r = await db.from('cobros').select('metodo, monto, cambio, cuando, pedido_id').eq('caja_id', cajaId);
  if(r.error) throw new ErrorDeDatos('No se pudo leer lo cobrado', r.error);
  return r.data.map((c) => ({ ...c, monto: Number(c.monto) }));
}

export async function venderMostrador({ renglones, cobro, caja }){
  const n = await negocio();
  const r = await llamar('vender', {
    p_negocio: n.id, p_canal: 'pos', p_caja: caja,
    p_renglones: renglones.map(({ id, cantidad }) => ({ producto_id: id, cantidad })),
    p_cobro: cobro,
  });
  olvidarCatalogo();
  return r;
}

/* Las ventas de un día (00:00 de hoy en el teléfono, hasta ahora). */
export async function ventasDesde(desde){
  const n = await negocio();
  const r = await db.from('pedidos')
    .select('id, folio, canal, estado, total, forma_pago, pagado, creado, renglones(producto_id, nombre, precio, cantidad, importe), cobros(metodo, monto, recibido, cambio)')
    .eq('negocio_id', n.id).gte('creado', desde.toISOString()).neq('estado', 'cancelado')
    .order('creado', { ascending: false }).limit(1000);
  if(r.error) throw new ErrorDeDatos('No se pudieron leer las ventas', r.error);
  return r.data.map((p) => ({ ...p, total: Number(p.total) }));
}

export async function cajasCerradas(cuantas = 10){
  const n = await negocio();
  const r = await db.from('cajas').select('id, abierta, cerrada, fondo, esperado, contado, nota, quien:perfiles(nombre)')
    .eq('negocio_id', n.id).not('cerrada', 'is', null).order('cerrada', { ascending: false }).limit(cuantas);
  if(r.error) throw new ErrorDeDatos('No se pudo leer el historial de caja', r.error);
  return r.data;
}

/* ══ PEDIR DESDE LA TIENDA (Bloque 6) ═══════════════════════════════════════
   La sesión se crea AQUÍ, al pagar, y nunca antes (invitado sin correo). En el
   negocio de muestra, quien anduvo viendo como admin o caja pasa a «cliente de
   prueba»: un pedido de tienda hecho por la caja no es un pedido de tienda. */
export async function sesionDeCliente(){
  const n = await negocio();
  const p = await yo();
  if(p && p.rol !== 'cliente' && n.ajustes?.demo === true) return verComo('cliente');
  return asegurarSesion();
}

export async function miFicha(){
  const p = await yo(); if(!p) return null;
  const n = await negocio();
  const r = await db.from('clientes').select('id, nombre, telefono, direcciones, pago_preferido').eq('negocio_id', n.id).eq('perfil_id', p.id).maybeSingle();
  return r.data || null;
}

/* direccion: { calle, colonia, referencias, cp, lat?, lng? } o null si recoge. */
export async function pedirTienda({ renglones, nombre, telefono, direccion, momento, notas, pago }){
  await sesionDeCliente();
  const n = await negocio();
  const cliente = await llamar('mi_cliente', { p_negocio: n.id, p_nombre: nombre, p_telefono: telefono });
  const v = await llamar('vender', {
    p_negocio: n.id, p_canal: 'tienda', p_cliente: cliente, p_momento: momento,
    p_renglones: renglones.map(({ id, cantidad }) => ({ producto_id: id, cantidad })),
    p_direccion: direccion ? { ...direccion, pago } : { recoge: true, pago },
    p_notas: notas || '',
  });
  // La dirección se guarda en su ficha para la próxima (RLS: cli_editar, la suya).
  if(direccion){
    const f = await miFicha();
    const otras = (f?.direcciones || []).filter((d) => d.calle !== direccion.calle || d.colonia !== direccion.colonia);
    await db.from('clientes').update({ direcciones: [direccion, ...otras].slice(0, 5), pago_preferido: momento }).eq('id', cliente);
  }
  olvidarCatalogo();
  return v;
}

export async function misPedidos(){
  const f = await miFicha(); if(!f) return [];
  const r = await db.from('pedidos')
    .select('id, folio, estado, total, forma_pago, momento_pago, pagado, direccion, notas, creado, renglones(producto_id, nombre, precio, cantidad, importe), eventos_pedido(a, por_que, cuando)')
    .eq('cliente_id', f.id).order('creado', { ascending: false }).limit(50);
  if(r.error) throw new ErrorDeDatos('No se pudieron leer tus pedidos', r.error);
  return r.data.map((p) => ({ ...p, total: Number(p.total) }));
}

/* Cancelar regresa las piezas al inventario (0003): lo que se ve tiene que saberlo. */
export async function cambiarEstado(pedido, a, porQue){
  const r = await llamar('cambiar_estado', { p_pedido: pedido, p_a: a, p_por_que: porQue || null });
  if(a === 'cancelado') olvidarCatalogo();
  return r;
}
