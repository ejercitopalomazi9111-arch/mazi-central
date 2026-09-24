/* ══════════════════════════════════════════════════════════════════════════
   DEVOLUCIÓN · cuentas puras (pruebas-devolucion.mjs)
   ──────────────────────────────────────────────────────────────────────────
   Dos caminos escriben lo mismo en `movimientos.nota`, para que UNA lectura
   sirva para los dos:
     · con 0011 aplicada, el servidor:   «Devolución #21 · <motivo>»
     · sin 0011, el admin desde aquí:    «Devolución #21 · efectivo $75.00 · <motivo>»
   Lo devuelto se cuenta sumando esas notas. El reembolso en efectivo del
   segundo camino (el que trae «$») es el que el corte todavía no descuenta
   solo, así que la pantalla de caja lo suma y lo explica.
   Dinero en centavos, como dinero.js.
   ═════════════════════════════════════════════════════════════════════════ */
import { aCentavos } from './dinero.js';

export const METODOS = ['efectivo', 'tarjeta', 'transferencia'];
const RE = /^Devolución #(\d+) · (?:(efectivo|tarjeta|transferencia) \$(\d+(?:\.\d{1,2})?) · )?(.*)$/s;

export function nota({ folio, metodo, centavos, motivo }){
  return `Devolución #${folio} · ${metodo} $${(centavos / 100).toFixed(2)} · ${String(motivo).trim()}`;
}

/* → null | { folio, metodo?, centavos?, motivo } */
export function leer(texto){
  const m = RE.exec(String(texto || ''));
  if(!m) return null;
  return { folio: Number(m[1]), metodo: m[2] || null, centavos: m[3] != null ? aCentavos(Number(m[3])) : null, motivo: m[4] };
}

/* Proporción que se paga de cada peso de lista: si la venta tuvo descuento,
   el reembolso lo lleva también. Nunca negativa ni mayor que 1. */
export function factor(venta){
  const sub = Number(venta.subtotal || 0), des = Number(venta.descuento || 0);
  return sub > 0 ? Math.min(1, Math.max(0, 1 - des / sub)) : 1;
}

/* Cuánto se devuelve por un renglón y en total, en centavos. */
export const importe = (venta, precio, cantidad) => Math.round(aCentavos(precio) * cantidad * factor(venta));
export const monto = (venta, renglones) => renglones.reduce((t, r) => t + importe(venta, r.precio, r.cantidad), 0);

/* Lo que se vendió de cada producto en la venta (sumando renglones repetidos). */
export function vendidas(venta){
  const m = new Map();
  for(const r of venta.renglones || []) if(r.producto_id){
    const e = m.get(r.producto_id) || { producto_id: r.producto_id, nombre: r.nombre, precio: Number(r.precio), cantidad: 0 };
    e.cantidad += r.cantidad; m.set(r.producto_id, e);
  }
  return m;
}

/* Lo que todavía se puede devolver: vendido − ya devuelto (Map producto → n). */
export function disponibles(venta, devueltas){
  return [...vendidas(venta).values()].map((v) => ({ ...v, devuelto: devueltas.get(v.producto_id) || 0, queda: Math.max(0, v.cantidad - (devueltas.get(v.producto_id) || 0)) }));
}

/* De una lista de movimientos, cuánto se devolvió de cada producto de ESE folio. */
export function devueltasDe(folio, movimientos){
  const m = new Map();
  for(const x of movimientos){
    const n = leer(x.nota);
    if(!n || n.folio !== Number(folio) || x.delta <= 0) continue;
    m.set(x.producto_id, (m.get(x.producto_id) || 0) + x.delta);
  }
  return m;
}

/* Efectivo devuelto por el camino sin 0011 (el que el corte no descuenta solo). */
export const efectivoSinDescontar = (movimientos) => movimientos.reduce((t, x) => {
  const n = leer(x.nota); return t + (n?.metodo === 'efectivo' && x.delta > 0 ? n.centavos : 0);
}, 0);
