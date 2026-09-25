/* ══════════════════════════════════════════════════════════════════════════
   ARRANQUE · lo que le falta a una tienda para que el cliente no se tope
   con un hueco
   ──────────────────────────────────────────────────────────────────────────
   La Ayuda le decía al cliente «el negocio todavía no pone su WhatsApp» y el
   dueño nunca se enteraba: el hueco sólo se veía del otro lado. Aquí se
   revisan los ajustes y el catálogo y sale una lista corta, cada punto con
   POR QUÉ importa (lo que ve el cliente) y a dónde ir a arreglarlo.
   Módulo puro: pruebas-arranque.mjs.
   ═════════════════════════════════════════════════════════════════════════ */

const soloDigitos = (t) => String(t ?? '').replace(/\D/g, '');
const lleno = (t) => String(t ?? '').trim().length > 0;

/* negocio: la fila (marca, ajustes) · productos: los de catalogoAdmin().
   → [{ clave, texto, porque, ruta, campo? }] en orden de cuánto le duele al cliente. */
export function pendientesDeArranque(negocio, productos = []){
  const a = negocio?.ajustes || {}, c = a.contacto || {}, e = a.envio || {}, p = a.pagos || {};
  const salida = [];
  const falta = (clave, texto, porque, ruta, campo) => salida.push({ clave, texto, porque, ruta, ...(campo ? { campo } : {}) });

  const activos = productos.filter((x) => x.activo);
  if(!activos.length)
    falta('catalogo', 'Sube tus productos', 'La tienda está vacía: el cliente no tiene nada que pedir.', '/a/importar');

  const formas = [p.efectivo !== false, !!p.tarjeta, !!p.transferencia].filter(Boolean).length;
  if(!formas) falta('pagos', 'Elige cómo te pagan', 'Sin ninguna forma de pago, nadie puede terminar un pedido.', '/a/ajustes', 'pago_efectivo');
  else if(p.transferencia && soloDigitos(p.clabe).length !== 18)
    falta('clabe', 'Pon tu CLABE', 'Ofreces transferencia pero al pagar no aparece a dónde depositar.', '/a/ajustes', 'clabe');

  if(soloDigitos(c.whatsapp).length < 10)
    falta('whatsapp', 'Pon tu WhatsApp', 'La Ayuda le dice al cliente que no tienes WhatsApp y no tiene a quién escribirle.', '/a/ajustes', 'whatsapp');
  if(!lleno(e.zona) && e.costo == null)
    falta('envio', 'Di hasta dónde entregas y cuánto cuesta', 'Al pagar el cliente no sabe si le llega ni cuánto le vas a cobrar.', '/a/ajustes', 'envio_zona');
  if(!a.tienda?.lat)
    falta('ubicacion', 'Guarda la ubicación de la tienda', 'Las rutas salen de donde ande el repartidor, no de la tienda, y el tablero no puede ubicarla en el mapa.', '/a/ajustes', 'ubicar_tienda');
  if(!lleno(c.horario)) falta('horario', 'Pon tu horario', 'El bot y la Ayuda no pueden decir a qué hora abres.', '/a/ajustes', 'horario');

  if(activos.length){
    const sinPrecio = activos.filter((x) => !(Number(x.precio) > 0)).length;
    if(sinPrecio) falta('precio', `${sinPrecio === 1 ? '1 producto no tiene' : `${sinPrecio} productos no tienen`} precio`, 'Salen a $0 en la tienda.', '/a/productos');
    const sinFoto = activos.filter((x) => !(x.fotos || []).length).length;
    // Unos cuantos sin foto es normal; se avisa cuando ya es una parte notable.
    if(sinFoto && sinFoto / activos.length >= 0.1)
      falta('fotos', `${sinFoto === 1 ? '1 producto no tiene' : `${sinFoto} productos no tienen`} foto`, 'Lo que no se ve casi no se vende en línea.', '/a/productos');
    const sinCategoria = activos.filter((x) => !x.categoria_id).length;
    if(sinCategoria) falta('categoria', `${sinCategoria === 1 ? '1 producto no tiene' : `${sinCategoria} productos no tienen`} categoría`, 'No aparecen al recorrer las categorías, sólo buscándolos.', '/a/productos');
  }
  return salida;
}
