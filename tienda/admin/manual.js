/* ══════════════════════════════════════════════════════════════════════════
   EL MANUAL · Bloque 14, corto y por rol
   ──────────────────────────────────────────────────────────────────────────
   Uno para cada quien, dentro de la app (no un PDF que nadie abre): el
   repartidor ve el suyo, la caja el suyo, y el dueño los tres juntos para
   enseñarle a su gente. Cada paso lleva a la pantalla de la que habla.
   Escrito para quien lo va a leer parado junto al mostrador: pasos cortos,
   sin palabras de sistema.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';

const ir = (ruta, texto) => `<a href="${enlace(ruta)}">${texto}</a>`;

const REPARTIDOR = () => ({ titulo: 'Repartidor', icono: 'camion', pasos: [
  ['Al llegar', `Abre ${ir('/r/turno', 'Mi turno')} y toca «Empezar turno». Desde ahí, y sólo mientras tu turno esté abierto, el negocio ve dónde vas.`],
  ['Tu día', `${ir('/r', 'Hoy')} te dice cuántas entregas tienes y cuál va primero. ${ir('/r/ruta', 'Mi ruta')} ya trae el orden más corto y el mapa.`],
  ['En cada parada', 'Tócala: ves qué entregas y cuánto cobras. Si pagan en efectivo, toca con cuánto te pagan y la app te dice el cambio y con qué billetes darlo.'],
  ['Si no se pudo', 'Toca «No se pudo entregar» y di por qué (no estaba, dirección mal…). El pedido regresa a la tienda para volver a mandarlo.'],
  ['Pausas', 'Para comer o una vuelta tuya, «Pausa». No cuenta como horas trabajadas y no se ve tu ubicación.'],
  ['Al terminar', `En ${ir('/r/turno', 'Mi turno')}, «Cerrar turno». La app te dice cuánto efectivo entregas.`],
] });

const CAJA = () => ({ titulo: 'Caja', icono: 'venta', pasos: [
  ['Al abrir', `En ${ir('/v/caja', 'Caja')}, di con cuánto cambio empiezas. Sin caja abierta no se puede cobrar: así el corte cuadra.`],
  ['Cobrar', `En ${ir('/v', 'Cobrar')}: escanea con el lector o la cámara, o busca y toca el producto. «Cobrar», elige cómo pagan y, si es efectivo, con cuánto: la app dice el cambio.`],
  ['El ticket', `Sale solo si así se configuró la impresora (${ir('/v/impresora', 'Impresora')}). Si no, toca «Imprimir ticket».`],
  ['Una devolución', `En ${ir('/v/devolucion', 'Devoluciones')}: el número del ticket, qué regresa y por qué. La pieza vuelve al inventario y el dinero sale de la caja.`],
  ['Si se va el internet', 'Sigue cobrando. La venta se guarda en el teléfono con un folio que empieza con L y se sube sola cuando vuelve la red. No cierres sesión mientras tanto.'],
  ['Al cerrar', `En ${ir('/v/caja', 'Caja')}: cuenta el cajón por billete y moneda, y luego compara. Si no cuadra, escribe por qué en la nota.`],
] });

const DUENO = () => ({ titulo: 'El dueño', icono: 'admin', pasos: [
  ['Cada mañana', `Abre ${ir('/a', 'Tablero')}: lo vendido hoy, los pedidos por mover, lo que se acaba y a quién le toca surtirse.`],
  ['Pedidos', `En ${ir('/a/pedidos', 'Pedidos')}, cada uno tiene un botón grande con el siguiente paso. Asígnale repartidor y avísale al cliente por WhatsApp con el mensaje ya escrito.`],
  ['Productos e inventario', `Da de alta en ${ir('/a/productos', 'Productos')} o sube tu Excel en ${ir('/a/importar', 'Importar')}. Lo que se vende fuera de la app se ajusta en ${ir('/a/inventario', 'Inventario')}, siempre con motivo.`],
  ['Clientes', `${ir('/a/clientes', 'Clientes')} te dice cada cuándo compra cada quien y a quién ya le toca. Cada aviso dice en qué se basa.`],
  ['Vender más', `${ir('/a/reportes', 'Reportes')} trae consejos con sus números. ${ir('/a/descuentos', 'Descuentos')} cambia precios por unos días y los regresa solo. ${ir('/a/redes', 'Redes')} te arma publicaciones con tus ofertas.`],
  ['El bot', `Pruébalo en ${ir('/a/conversaciones', 'Conversaciones')} como si fueras cliente. Llena en ${ir('/a/ajustes', 'Ajustes')} el horario, el envío y cómo te pagan: lo que falta, lo pasa a una persona.`],
  ['Tu gente', `${ir('/a/repartidores', 'Repartidores')} en el mapa (sólo con turno abierto) y sus ${ir('/a/turnos', 'horas y días')} para la nómina.`],
] });

const CLIENTE = () => ({ titulo: 'Lo que ve tu cliente', icono: 'cliente', pasos: [
  ['Sin cuenta', 'Ve, busca y llena su carrito sin registrarse. Sólo al pagar da su nombre y WhatsApp; su cuenta se hace sola.'],
  ['Su pedido de siempre', 'Desde su segundo pedido, la portada le ofrece lo de siempre y le avisa cuándo le toca surtirse, diciendo por qué.'],
  ['Seguimiento', 'Ve en qué va su pedido y, si va en camino, dónde viene el repartidor.'],
  ['En su teléfono', 'Puede instalar la app desde el menú («Instalar»): queda como una más y abre aunque no haya internet.'],
] });

function pintar(secciones){
  return { html: secciones.map((s) => `<section class="seccion manual"><header><h2>${icono(s.icono)}${s.titulo}</h2></header>
    <ol class="pasos-manual">${s.pasos.map(([t, d]) => `<li><strong>${t}</strong><p>${d}</p></li>`).join('')}</ol></section>`).join('') };
}

export const PANTALLAS = {
  manualRepartidor: () => pintar([REPARTIDOR()]),
  manualCaja: () => pintar([CAJA()]),
  manualAdmin: () => pintar([DUENO(), CAJA(), REPARTIDOR(), CLIENTE()]),
};
