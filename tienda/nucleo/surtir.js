/* ══════════════════════════════════════════════════════════════════════════
   QUÉ SURTIR · el pedido al proveedor, hecho con las ventas de verdad
   ──────────────────────────────────────────────────────────────────────────
   El dueño pide mercancía de memoria y le pasa una de dos: se queda sin lo
   que más sale, o se llena de lo que no se mueve. Aquí cada renglón del
   pedido dice CUÁNTO y POR QUÉ, con sus números:
     · se vende y ya se acabó      → lo primero, cada día sin él es venta perdida
     · se vende y se va a acabar   → antes de que alcance la cobertura
     · está bajo el mínimo que puso el dueño, aunque no se venda
   Con menos de una semana de ventas NO se calcula ritmo (un día bueno se
   leería como el de siempre): sólo se usa el mínimo. Callar es mejor que
   inventar. Módulo puro (pruebas-surtir.mjs).

   planSurtir({ ventas, productos, ahora, cobertura }) →
     { renglones: [{ id, nombre, marca, sku, hay, minimo, porDia, dias, pedir, motivo, porque }],
       diasDeHistoria, base }
     productos: los del admin (con existencia {cantidad, apartado, minimo}, activo).
   ═════════════════════════════════════════════════════════════════════════ */
import { DIA, validas, entre, porProducto } from './reportes.js';

export const VENTANA = 28;                 // días de ventas con que se mide el ritmo
export const COBERTURAS = [14, 30, 60];    // para cuántos días se pide
const ORDEN = { agotado: 0, acaba: 1, minimo: 2 };
const redondo = (n) => Math.round(n * 10) / 10;
const quedan = (n) => n === 1 ? 'queda 1' : `quedan ${n}`;

export function planSurtir({ ventas = [], productos = [], ahora = Date.now(), cobertura = 30 } = {}){
  const v = validas(ventas);
  const primera = v.length ? Math.min(...v.map((x) => new Date(x.creado).getTime())) : ahora;
  const diasDeHistoria = Math.floor((ahora - primera) / DIA);
  const conRitmo = diasDeHistoria >= 7;
  const dias = Math.max(1, Math.min(VENTANA, diasDeHistoria));
  const vendido = new Map(porProducto(entre(v, ahora - VENTANA * DIA, ahora + 1)).map((p) => [p.producto_id, p.piezas]));

  const renglones = [];
  for(const p of productos){
    if(p.activo === false) continue;
    const e = p.existencia || {};
    const hay = Math.max(0, (e.cantidad ?? 0) - (e.apartado ?? 0)), minimo = e.minimo ?? 0;
    const piezas = vendido.get(p.id) || 0;
    const porDia = conRitmo && piezas >= 2 ? piezas / dias : null;   // una sola venta no es un ritmo
    const objetivo = Math.max(minimo, porDia ? Math.ceil(porDia * cobertura) : 0);
    const pedir = objetivo - hay;
    if(pedir <= 0) continue;
    const alcanza = porDia ? hay / porDia : null;
    const semana = porDia && redondo(porDia * 7);
    let motivo, porque;
    if(porDia && hay === 0){
      motivo = 'agotado';
      porque = `Se acabó y vendes como ${semana} por semana. Con ${pedir} te alcanza para ~${cobertura} días.`;
    }else if(porDia && alcanza < cobertura){
      motivo = 'acaba';
      porque = `Vendes como ${semana} por semana y te ${quedan(hay)}: alcanza para ~${Math.max(1, Math.round(alcanza))} ${Math.round(alcanza) === 1 ? 'día' : 'días'}.`;
    }else{
      motivo = 'minimo';
      porque = `Te ${quedan(hay)} y tu mínimo es ${minimo}.${porDia ? '' : piezas ? ' Se vendió poco para saber su ritmo.' : conRitmo ? ` No se vendió en ${dias} días: pide sólo lo del mínimo.` : ''}`;
    }
    renglones.push({ id: p.id, nombre: p.nombre, marca: (p.marca || '').trim() || 'Sin marca', sku: p.sku || '', hay, minimo, porDia, dias: alcanza, pedir, motivo, porque });
  }
  renglones.sort((a, b) => ORDEN[a.motivo] - ORDEN[b.motivo] || (a.dias ?? 1e9) - (b.dias ?? 1e9) || a.nombre.localeCompare(b.nombre));
  const base = conRitmo ? `Sale de tus ventas de los últimos ${dias} días y de los mínimos que pusiste.`
    : 'Todavía no hay una semana de ventas: por ahora sólo cuenta el mínimo que pusiste a cada producto.';
  return { renglones, diasDeHistoria, base };
}

/* Agrupado por marca (casi siempre, la marca es el proveedor), las marcas con
   algo agotado primero y luego por piezas. Respeta lo que el dueño corrigió:
   cantidades: Map id → número (0 = no se pide). */
export function porMarca(renglones, cantidades = new Map()){
  const m = new Map();
  for(const r of renglones){
    const pedir = cantidades.has(r.id) ? cantidades.get(r.id) : r.pedir;
    if(!m.has(r.marca)) m.set(r.marca, { marca: r.marca, renglones: [], piezas: 0, urgentes: 0 });
    const g = m.get(r.marca);
    g.renglones.push({ ...r, pedir });
    g.piezas += pedir; if(r.motivo === 'agotado' && pedir > 0) g.urgentes++;
  }
  return [...m.values()].sort((a, b) => b.urgentes - a.urgentes || b.piezas - a.piezas || a.marca.localeCompare(b.marca));
}

/* El mensaje para el proveedor: sólo lo que se pide, con clave si la hay. */
export function textoPedido(grupo, { negocio = '', fecha = new Date() } = {}){
  const f = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(fecha);
  const van = grupo.renglones.filter((r) => r.pedir > 0);
  return [
    `*Pedido${negocio ? ` de ${negocio}` : ''}* · ${grupo.marca} · ${f}`,
    '',
    ...van.map((r) => `• ${r.pedir} × ${r.nombre}${r.sku ? ` (clave ${r.sku})` : ''}`),
    '',
    `Total: ${van.reduce((t, r) => t + r.pedir, 0)} piezas en ${van.length} ${van.length === 1 ? 'producto' : 'productos'}.`,
    '¿Me confirmas existencias y precio? Gracias.',
  ].join('\n');
}

export function filasCSV(grupos){
  const filas = [['Marca', 'Producto', 'Clave', 'Hay', 'Mínimo', 'Vende por semana', 'Pedir', 'Por qué']];
  for(const g of grupos) for(const r of g.renglones) if(r.pedir > 0)
    filas.push([g.marca, r.nombre, r.sku, r.hay, r.minimo, r.porDia ? redondo(r.porDia * 7) : '', r.pedir, r.porque]);
  return filas;
}
