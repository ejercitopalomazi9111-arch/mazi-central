/* ══════════════════════════════════════════════════════════════════════════
   REPORTES · las cuentas (pruebas-reportes.mjs)
   ──────────────────────────────────────────────────────────────────────────
   Todo sale de las ventas que ya están en la base: nada se captura a mano
   (la lección de Fadori: el dato se mide solo). Dinero en centavos.
   `ventas`: pedidos con { creado, estado, canal, total, forma_pago, renglones }.
   Lo cancelado no es venta; lo no entregado tampoco (no se cobró).
   ═════════════════════════════════════════════════════════════════════════ */
const NO_CUENTAN = new Set(['cancelado', 'no_entregado']);
const cent = (x) => Math.round(Number(x || 0) * 100);
export const DIA = 86400000;

export const validas = (ventas) => (ventas || []).filter((v) => !NO_CUENTAN.has(v.estado));
export const entre = (ventas, desde, hasta) => validas(ventas).filter((v) => { const t = new Date(v.creado).getTime(); return t >= desde && t < hasta; });

const inicioDia = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function periodo(clave, ahora = Date.now()){
  const hoy = inicioDia(ahora), d = new Date(ahora);
  switch(clave){
    case 'hoy': return { desde: hoy, hasta: ahora + 1, nombre: 'Hoy' };
    case '7': return { desde: hoy - 6 * DIA, hasta: ahora + 1, nombre: 'Últimos 7 días' };
    case '30': return { desde: hoy - 29 * DIA, hasta: ahora + 1, nombre: 'Últimos 30 días' };
    case 'mes': return { desde: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), hasta: ahora + 1, nombre: 'Este mes' };
    case 'pasado': return { desde: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), hasta: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), nombre: 'Mes pasado' };
    default: throw new Error('periodo desconocido: ' + clave);
  }
}
/* El periodo de antes, del MISMO largo y hasta la misma hora: comparar «hoy a
   las 11» contra «todo ayer» siempre da que hoy va mal. */
export function anterior({ desde, hasta }){ const largo = hasta - desde; return { desde: desde - largo, hasta: desde }; }

export function resumen(ventas){
  const total = ventas.reduce((t, v) => t + cent(v.total), 0);
  const piezas = ventas.reduce((t, v) => t + (v.renglones || []).reduce((s, r) => s + r.cantidad, 0), 0);
  return { total, tickets: ventas.length, piezas, promedio: ventas.length ? Math.round(total / ventas.length) : 0 };
}

/* % de cambio, o null cuando antes no hubo (dividir entre cero no es «+∞ %»). */
export const cambio = (ahora, antes) => antes > 0 ? Math.round((ahora - antes) / antes * 100) : null;

export function porClave(ventas, clave){
  const m = new Map();
  for(const v of ventas){ const k = clave(v) ?? 'otro'; const e = m.get(k) || { clave: k, total: 0, tickets: 0 }; e.total += cent(v.total); e.tickets++; m.set(k, e); }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/* 24 cajones: cuánto se vende a cada hora del día (hora del teléfono). */
export function porHora(ventas){
  const h = Array.from({ length: 24 }, (_, i) => ({ hora: i, total: 0, tickets: 0 }));
  for(const v of ventas){ const x = h[new Date(v.creado).getHours()]; x.total += cent(v.total); x.tickets++; }
  return h;
}

export function porDia(ventas, desde, hasta){
  const dias = [];
  for(let t = inicioDia(desde); t < hasta; ){ const sig = new Date(t); sig.setDate(sig.getDate() + 1); dias.push({ dia: t, total: 0, tickets: 0 }); t = sig.getTime(); }
  const idx = new Map(dias.map((d, i) => [d.dia, i]));
  for(const v of ventas){ const i = idx.get(inicioDia(v.creado)); if(i != null){ dias[i].total += cent(v.total); dias[i].tickets++; } }
  return dias;
}

/* Horas fuertes: el tramo seguido de 2 horas que más vende. */
export function horaFuerte(horas){
  let mejor = null;
  for(let i = 0; i < 23; i++){
    const t = horas[i].total + horas[i + 1].total;
    // En empate gana la ventana que EMPIEZA con ventas: si todo se vende a las
    // 5, la hora fuerte es «de 5 a 7», no «de 4 a 6».
    const empata = mejor && t === mejor.total && horas[i].total > 0 && horas[mejor.desde].total === 0;
    if(t > 0 && (!mejor || t > mejor.total || empata)) mejor = { desde: i, hasta: i + 2, total: t };
  }
  return mejor;
}

export function porProducto(ventas){
  const m = new Map();
  for(const v of ventas) for(const r of v.renglones || []){
    if(!r.producto_id) continue;
    const e = m.get(r.producto_id) || { producto_id: r.producto_id, nombre: r.nombre, piezas: 0, total: 0, tickets: 0 };
    e.piezas += r.cantidad; e.total += cent(r.importe ?? r.precio * r.cantidad); e.tickets++; m.set(r.producto_id, e);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/* Parejas que salen juntas en el mismo ticket (al menos `minimo` veces). */
export function juntos(ventas, minimo = 3){
  const m = new Map();
  for(const v of ventas){
    const ids = [...new Set((v.renglones || []).map((r) => r.producto_id).filter(Boolean))].sort();
    for(let i = 0; i < ids.length; i++) for(let j = i + 1; j < ids.length; j++){ const k = ids[i] + '|' + ids[j]; m.set(k, (m.get(k) || 0) + 1); }
  }
  return [...m.entries()].filter(([, n]) => n >= minimo).map(([k, n]) => { const [a, b] = k.split('|'); return { a, b, veces: n }; }).sort((x, y) => y.veces - x.veces);
}

/* Filas para Excel: un renglón por producto vendido. */
export function filasCSV(ventas){
  const f = [['Folio', 'Fecha', 'Hora', 'Canal', 'Forma de pago', 'Producto', 'Cantidad', 'Precio', 'Importe', 'Total del ticket']];
  for(const v of ventas){
    const d = new Date(v.creado), fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    for(const r of v.renglones || []) f.push([v.folio, fecha, hora, v.canal, v.forma_pago || '', r.nombre, r.cantidad, Number(r.precio).toFixed(2), Number(r.importe ?? r.precio * r.cantidad).toFixed(2), Number(v.total).toFixed(2)]);
  }
  return f;
}
