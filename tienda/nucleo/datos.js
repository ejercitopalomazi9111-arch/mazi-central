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
