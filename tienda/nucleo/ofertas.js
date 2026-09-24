/* ══════════════════════════════════════════════════════════════════════════
   OFERTAS · cuentas puras (pruebas-ofertas.mjs)
   ──────────────────────────────────────────────────────────────────────────
   Una oferta CAMBIA EL PRECIO del producto (y guarda el de antes en
   precio_antes). Así lo que ve el cliente es lo que cobran la tienda, el
   mostrador y el bot: los tres cobran el precio de la base (vender()).
   Al terminar, cada producto regresa a su precio — salvo que alguien lo haya
   cambiado a mano mientras tanto: ése se deja y se avisa.
   Registro en la tabla `descuentos`: alcance = { todo | categorias | marcas,
   aplicado: { id: [precio original, precio de oferta] } }.
   ═════════════════════════════════════════════════════════════════════════ */
const cent = (x) => Math.round(Number(x) * 100);

/* Precio con la oferta, redondeado a pesos cerrados (un precio de $254.15 se
   ve de sistema; $254 se ve de tienda). Nunca 0 ni más caro que antes. */
export function precioConOferta(precio, { tipo, valor }){
  const p = cent(precio);
  let n = tipo === 'porcentaje' ? p * (1 - Number(valor) / 100) : p - cent(valor);
  n = Math.round(n / 100) * 100;
  if(n <= 0 || n >= p) return null;
  return n / 100;
}

export function entra(p, alcance = {}){
  if(alcance.todo) return true;
  if(alcance.categorias?.length && alcance.categorias.includes(p.categoria_id)) return true;
  if(alcance.marcas?.length && alcance.marcas.some((m) => m.toLowerCase() === String(p.marca || '').toLowerCase())) return true;
  return false;
}

/* productos: los del admin ({ id, nombre, precio, precio_antes, activo, categoria_id, marca }). */
export function planAplicar(productos, oferta){
  const cambios = [], saltados = [];
  for(const p of productos){
    if(!p.activo || !entra(p, oferta.alcance)) continue;
    if(p.precio_antes != null){ saltados.push({ id: p.id, nombre: p.nombre, razon: 'ya estaba en oferta' }); continue; }
    const ahora = precioConOferta(p.precio, oferta);
    if(ahora == null){ saltados.push({ id: p.id, nombre: p.nombre, razon: 'el descuento no le alcanza' }); continue; }
    cambios.push({ id: p.id, nombre: p.nombre, antes: Number(p.precio), ahora });
  }
  return { cambios, saltados };
}

/* aplicado: { id: [original, oferta] } → qué regresar y qué dejar. */
export function planTerminar(productos, aplicado = {}){
  const porId = new Map(productos.map((p) => [p.id, p]));
  const restaurar = [], saltados = [];
  for(const [id, [original, oferta]] of Object.entries(aplicado)){
    const p = porId.get(id);
    if(!p){ saltados.push({ id, razon: 'ya no existe' }); continue; }
    if(cent(p.precio) !== cent(oferta)){ saltados.push({ id, nombre: p.nombre, razon: 'le cambiaron el precio a mano' }); continue; }
    restaurar.push({ id, nombre: p.nombre, precio: original });
  }
  return { restaurar, saltados };
}

/* Las que ya se pasaron de su fecha y siguen aplicadas. */
export const vencidas = (descuentos, ahora = Date.now()) =>
  descuentos.filter((d) => d.activo && d.fin && new Date(d.fin).getTime() <= ahora && d.alcance?.aplicado);

export function describir(d){
  const v = d.tipo === 'porcentaje' ? `${Number(d.valor)} %` : `$${Number(d.valor)}`;
  return `${v} menos`;
}
