/* ══════════════════════════════════════════════════════════════════════════
   LA TABLA DE RUTAS · la única fuente de verdad de la navegación
   ──────────────────────────────────────────────────────────────────────────
   Por qué existe, dicho por Carlos: «en la de ligas hay como cuatro botones que
   te llevan al mismo lado, pero en otros apartados no funcionan».

   Eso no se arregla con cuidado. Se arregla así:

   · Cada pantalla tiene UNA ruta. No hay dos formas de llegar al mismo lugar.
   · El menú lateral se GENERA de esta tabla. Nadie escribe un enlace a mano, así
     que no puede haber un botón que apunte a donde no hay nada.
   · `pruebas-rutas.mjs` recorre la tabla y revienta si una ruta no pinta, si dos
     entradas del menú van al mismo destino, si una pantalla no tiene salida, o si
     el código enlaza a una ruta que no está aquí.

   Para añadir una pantalla: un renglón aquí y su función en `pantallas.js`. Si
   falta una de las dos, las pruebas lo dicen antes de que lo vea nadie.

   Campos:
     ruta      el patrón. `:nombre` es un parámetro («/p/:id»).
     apartado  'cliente' | 'repartidor' | 'venta' | 'admin'
     titulo    lo que dice arriba y en el menú
     icono     de iconos.js
     menu      true si sale en el menú lateral. Las de parámetro no salen: se
               llega a ellas desde adentro (a una ficha se llega tocando un
               producto, no desde el menú).
     pantalla  la función que la pinta, en pantallas.js
     promesa   una línea de qué va a hacer. Es lo que se lee mientras está en
               obra — una pantalla sin terminar dice qué será, no «próximamente».
     bloque    en qué bloque del plan se construye (PLAN.md §14)
     ejemplo   para las de parámetro: un valor real con que probarla
   ═════════════════════════════════════════════════════════════════════════ */

/* `roles`: quién puede entrar. `null` = cualquiera, sin cuenta (es la tienda).
   En el negocio de muestra, entrar a un apartado cambia solo la sesión al rol
   de prueba que toca — así Carlos recorre los cuatro sin contraseñas. En un
   negocio real, el menú sólo enseña lo que tu rol puede abrir. */
export const APARTADOS = [
  { id: 'cliente',    nombre: 'Cliente',        icono: 'cliente', roles: null },
  { id: 'repartidor', nombre: 'Repartidor',     icono: 'camion',  roles: ['repartidor'] },
  { id: 'venta',      nombre: 'Punto de venta', icono: 'venta',   roles: ['cajero', 'admin'] },
  { id: 'admin',      nombre: 'Administrativo', icono: 'admin',   roles: ['admin'] },
];

export const RUTAS = [
  /* ── Cliente ─────────────────────────────────────────────────────────── */
  { ruta: '/',              apartado: 'cliente', titulo: 'Inicio',        icono: 'casa',      menu: true,  pantalla: 'portada',   bloque: 1,
    promesa: 'Tu pedido de siempre, las categorías, las ofertas y el sorteo del mes.' },
  { ruta: '/buscar',        apartado: 'cliente', titulo: 'Buscar',        icono: 'buscar',    menu: true,  pantalla: 'buscar',    bloque: 1,
    promesa: 'Busca por nombre, marca o para qué sirve.' },
  { ruta: '/c/:cat',        apartado: 'cliente', titulo: 'Categoría',     icono: 'categorias',menu: false, pantalla: 'categoria', bloque: 1,
    ejemplo: 'corte',
    promesa: 'Todos los productos de una categoría.' },
  { ruta: '/p/:id',         apartado: 'cliente', titulo: 'Producto',      icono: 'caja',      menu: false, pantalla: 'producto',  bloque: 1,
    ejemplo: '@primero',
    promesa: 'Fotos, precio, si hay, para qué sirve, y lo que va bien con él.' },
  { ruta: '/carrito',       apartado: 'cliente', titulo: 'Carrito',       icono: 'carrito',   menu: true,  pantalla: 'carrito',   bloque: 1,
    promesa: 'Lo que llevas y cuánto va, siempre a la vista.' },
  { ruta: '/pagar',         apartado: 'cliente', titulo: 'Pagar',         icono: 'carrito',   menu: false, pantalla: 'pagar',      bloque: 6,
    promesa: 'Aquí se pide quién eres, y nunca antes. Pagas ahora o al recibir.' },
  { ruta: '/pedidos',       apartado: 'cliente', titulo: 'Mis pedidos',   icono: 'pedidos',   menu: true,  pantalla: 'pedidos',      bloque: 6,
    promesa: 'Lo que has pedido, y «volver a pedir» en cada uno.' },
  { ruta: '/pedido/:id',    apartado: 'cliente', titulo: 'Seguimiento',   icono: 'parada',    menu: false, pantalla: 'seguimiento',      bloque: 8,
    ejemplo: 'demo',
    promesa: 'Dónde va el repartidor y en cuánto llega.' },
  { ruta: '/apartados',     apartado: 'cliente', titulo: 'Apartados',     icono: 'apartados', menu: true,  pantalla: 'obra',      bloque: 11,
    promesa: 'Lo que apartaste y lo que te falta por pagar.' },
  { ruta: '/sorteo',        apartado: 'cliente', titulo: 'Sorteo del mes',icono: 'sorteo',    menu: true,  pantalla: 'sorteo',      bloque: 11,
    promesa: 'Cuánto te falta este mes para entrar al sorteo.' },
  { ruta: '/cuenta',        apartado: 'cliente', titulo: 'Mi cuenta',     icono: 'cuenta',    menu: true,  pantalla: 'cuenta',      bloque: 9,
    promesa: 'Tus datos, tus direcciones y cuándo te toca volver a surtirte.' },

  /* ── Repartidor ──────────────────────────────────────────────────────── */
  { ruta: '/r',             apartado: 'repartidor', titulo: 'Hoy',        icono: 'camion',    menu: true,  pantalla: 'repartoHoy',      bloque: 7,
    promesa: 'Cuántas entregas, cuánto camino y cuál es la primera.' },
  { ruta: '/r/ruta',        apartado: 'repartidor', titulo: 'Mi ruta',    icono: 'ruta',      menu: true,  pantalla: 'miRuta',      bloque: 8,
    promesa: 'El orden de las paradas ya resuelto, y el mapa.' },
  { ruta: '/r/parada/:id',  apartado: 'repartidor', titulo: 'Parada',     icono: 'parada',    menu: false, pantalla: 'parada',      bloque: 7,
    ejemplo: 'demo',
    promesa: 'Qué entregas, cuántas piezas, cuánto cobras y cuánto cambio das.' },
  { ruta: '/r/turno',       apartado: 'repartidor', titulo: 'Mi turno',   icono: 'turno',     menu: true,  pantalla: 'miTurno',      bloque: 7,
    promesa: 'Entrada, salida y pausas. Tus horas del día y de la semana.' },
  { ruta: '/r/historial',   apartado: 'repartidor', titulo: 'Historial',  icono: 'historial', menu: true,  pantalla: 'historial',      bloque: 7,
    promesa: 'Las entregas de días pasados.' },

  /* ── Punto de venta ──────────────────────────────────────────────────── */
  { ruta: '/v',             apartado: 'venta', titulo: 'Cobrar',          icono: 'venta',     menu: true,  pantalla: 'cobrar',      bloque: 5,
    promesa: 'Escanear o buscar, cobrar y dar cambio. Hecho para tableta de pie.' },
  { ruta: '/v/caja',        apartado: 'venta', titulo: 'Caja',            icono: 'efectivo',  menu: true,  pantalla: 'caja',      bloque: 5,
    promesa: 'Abrir con el fondo, cerrar y cuadrar: lo que debería haber contra lo que hay.' },
  { ruta: '/v/ventas',      apartado: 'venta', titulo: 'Ventas de hoy',   icono: 'reportes',  menu: true,  pantalla: 'ventasHoy',      bloque: 5,
    promesa: 'Cuánto va, a qué hora se vende más y qué se lleva la gente.' },
  { ruta: '/v/impresora',   apartado: 'venta', titulo: 'Impresora',       icono: 'imprimir',  menu: true,  pantalla: 'impresora', bloque: 5,
    promesa: 'Qué impresora de tickets tienes, cómo está conectada, y una hoja de prueba.' },
  { ruta: '/v/devolucion',  apartado: 'venta', titulo: 'Devoluciones',    icono: 'deshacer',  menu: true,  pantalla: 'devolucion',      bloque: 5,
    promesa: 'Regresar una venta con su ticket: la pieza vuelve al inventario y el dinero sale de caja.' },

  /* ── Administrativo ──────────────────────────────────────────────────── */
  { ruta: '/a',             apartado: 'admin', titulo: 'Tablero',         icono: 'tablero',   menu: true,  pantalla: 'tablero',      bloque: 6,
    promesa: 'En vivo: ventas de hoy, pedidos en curso, repartidores en el mapa y lo que se acaba.' },
  { ruta: '/a/productos',   apartado: 'admin', titulo: 'Productos',       icono: 'caja',      menu: true,  pantalla: 'productos',      bloque: 3,
    promesa: 'Dar de alta, cambiar precio y fotos, y sacar el código QR o de barras de cada uno.' },
  { ruta: '/a/inventario',  apartado: 'admin', titulo: 'Inventario',      icono: 'inventario',menu: true,  pantalla: 'inventario',      bloque: 3,
    promesa: 'Existencias, y el ajuste rápido para lo que se vendió fuera del sistema.' },
  { ruta: '/a/producto/:id',apartado: 'admin', titulo: 'Editar producto', icono: 'caja',      menu: false, pantalla: 'productoEditar',      bloque: 3,
    ejemplo: '@primero',
    promesa: 'Cambiar nombre, precio, fotos y campos.' },
  { ruta: '/a/etiquetas',   apartado: 'admin', titulo: 'Etiquetas',       icono: 'qr',        menu: false, pantalla: 'etiquetas', bloque: 3,
    promesa: 'Hoja de etiquetas con QR y código de barras, lista para imprimir y recortar.' },
  { ruta: '/a/importar',    apartado: 'admin', titulo: 'Importar',        icono: 'importar',  menu: true,  pantalla: 'importar',      bloque: 4,
    promesa: 'Sube un Excel, PDF o Word con tus productos y la app los deja listos.' },
  { ruta: '/a/categorias',  apartado: 'admin', titulo: 'Categorías',      icono: 'categorias',menu: true,  pantalla: 'categorias',      bloque: 3,
    promesa: 'Crear, renombrar y ordenar categorías, y qué campos lleva cada una.' },
  { ruta: '/a/pedidos',     apartado: 'admin', titulo: 'Pedidos',         icono: 'lista',     menu: true,  pantalla: 'pedidosAdmin',      bloque: 6,
    promesa: 'Todos los pedidos y en qué paso va cada uno.' },
  { ruta: '/a/repartidores',apartado: 'admin', titulo: 'Repartidores',    icono: 'repartidores', menu: true, pantalla: 'repartidoresVivo',    bloque: 8,
    promesa: 'Dónde va cada uno, su ruta y a qué velocidad. Sólo con turno abierto.' },
  { ruta: '/a/turnos',      apartado: 'admin', titulo: 'Horas y días',    icono: 'turnos',    menu: true,  pantalla: 'horas',      bloque: 7,
    promesa: 'Horas trabajadas por repartidor, por día, semana y quincena.' },
  { ruta: '/a/clientes',    apartado: 'admin', titulo: 'Clientes',        icono: 'clientes',  menu: true,  pantalla: 'clientes',      bloque: 9,
    promesa: 'Cada cuándo compra cada quien, y a quién le toca volver a pedir.' },
  { ruta: '/a/descuentos',  apartado: 'admin', titulo: 'Descuentos',      icono: 'descuentos',menu: true,  pantalla: 'descuentos',      bloque: 11,
    promesa: 'Promociones y cupones, y se actualizan en todos lados a la vez.' },
  { ruta: '/a/apartados',   apartado: 'admin', titulo: 'Apartados',       icono: 'apartados', menu: true,  pantalla: 'obra',      bloque: 11,
    promesa: 'Los apartados abiertos y lo que debe cada quien.' },
  { ruta: '/a/sorteos',     apartado: 'admin', titulo: 'Sorteos',         icono: 'sorteo',    menu: true,  pantalla: 'sorteosAdmin',      bloque: 11,
    promesa: 'El sorteo del mes y sus reglas. No se activa sin el permiso de Gobernación.' },
  { ruta: '/a/conversaciones', apartado: 'admin', titulo: 'Conversaciones', icono: 'conversaciones', menu: true, pantalla: 'conversaciones', bloque: 10,
    promesa: 'Lo que el bot está platicando, y el botón de «lo tomo yo».' },
  { ruta: '/a/redes',       apartado: 'admin', titulo: 'Redes',           icono: 'redes',     menu: true,  pantalla: 'redes',      bloque: 12,
    promesa: 'Calendario y cola de publicaciones.' },
  { ruta: '/a/reportes',    apartado: 'admin', titulo: 'Reportes',        icono: 'reportes',  menu: true,  pantalla: 'reportes',      bloque: 12,
    promesa: 'Los números, tipo Fadori.' },
  { ruta: '/a/ajustes',     apartado: 'admin', titulo: 'Ajustes',         icono: 'ajustes',   menu: true,  pantalla: 'ajustes',      bloque: 3,
    promesa: 'Todo lo que cambia con el negocio, sin tocar código.' },
];

/* ── Emparejar una dirección con su ruta ─────────────────────────────────── */

const partes = (r) => r.split('/').filter(Boolean);

export function emparejar(direccion){
  const pd = partes(direccion.split('?')[0]);
  for(const r of RUTAS){
    const pr = partes(r.ruta);
    if(pr.length !== pd.length) continue;
    const params = {};
    let ok = true;
    for(let i = 0; i < pr.length; i++){
      if(pr[i].startsWith(':')) params[pr[i].slice(1)] = decodeURIComponent(pd[i]);
      else if(pr[i] !== pd[i]){ ok = false; break; }
    }
    if(ok) return { ...r, params };
  }
  return null;
}

/* Arma una dirección real desde un patrón: enlace('/p/:id', {id: 7}) → '/p/7'.
   Toda liga de la app pasa por aquí, así que una ruta que no existe revienta al
   armarla y no al tocarla. */
export function enlace(patron, params = {}){
  if(!RUTAS.some(r => r.ruta === patron))
    throw new Error('enlace a una ruta que no está en la tabla: ' + patron);
  return '#' + patron.replace(/:(\w+)/g, (_, k) => {
    if(params[k] === undefined) throw new Error('falta el parámetro «' + k + '» para ' + patron);
    return encodeURIComponent(params[k]);
  });
}
