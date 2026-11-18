/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · LA CORRIDA DE COTIZACIÓN  (Godines, 17 nov)
   ───────────────────────────────────────────────────────────────────────────
   ⚠ UN SOLO CÁLCULO PARA TODOS. Este archivo vive en DOS lugares y son copia
   EXACTA (la prueba del centro lo exige): urban-pest/servidor/src/corrida.js
   (el bot) y urban-pest/centro/cotizar.js (la pestaña «Cotizar»). Luis, 17 nov:
   «si hago una cotización en el Excel, que me dé exactamente lo mismo que el
   bot y la herramienta». Por eso no se redondea: sale con sus centavos, igual
   que su columna T.

   Hace exactamente lo que hace una fila de su Excel «Cotización convencional»:
     Químicos      = Σ cantidad × costo por aplicación (su columna F)
     Mano de obra  = horas × lo que cobra la hora
     Traslado      = km × lo que cobra el km
     Cotización    = (Químicos + Mano de obra) × su multiplicador + Traslado
     Costos / Utilidad = la Cotización partida con su porcentaje
   Los números (el multiplicador, la hora, el km, el porcentaje) NO están aquí: salen de su
   Excel al cargarlo (excel.js). Con la hoja «JADP», además, su otra fórmula
   para comparar. Probado contra sus filas: pruebas.mjs.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Lo que el técnico mide: «L de mezcla» si la dosis va por litro, «m²» si va por metro… */
export function unidadDe(p){
  const u = String(p?.unidad || '').toLowerCase().replace(/\s/g, '');
  if(/\/l(t|itro)?$/.test(u)) return 'L de mezcla';
  if(/\/m2$/.test(u)) return 'm²';
  if(/\/m3$/.test(u)) return 'm³';
  if(/bloque/.test(u)) return 'bloques';
  if(/sachet/.test(u)) return 'sobres';
  if(/punto/.test(u)) return 'puntos';
  if(/visita/.test(u)) return 'visitas';
  if(/bolita/.test(u)) return 'bolitas';
  return 'aplicaciones';
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * @param c  { renglones: [{ plaga, producto, cantidad, extra }], horas, km }
 *           `extra` es un gasto suelto en pesos (el «Monitoreo» o «Otros» que él escribe a mano)
 * @param ex lo que excel.js sacó de su Excel: { catalogo, convencional, jadp }
 */
export function corrida(c, ex){
  const por = new Map((ex?.catalogo || []).map(p => [p.id, p]));
  const lineas = (c.renglones || []).map(r => {
    const p = por.get(r.producto), cantidad = Math.max(0, Number(r.cantidad) || 0), extra = Math.max(0, Number(r.extra) || 0);
    return { ...r, nombre: p?.nombre || null, unidad: p ? unidadDe(p) : null, por_unidad: p?.por_unidad || 0, importe: cantidad * (p?.por_unidad || 0) + extra };
  });
  /* como en su Excel: se suma con todos los decimales y se redondea al final */
  const horas = Math.max(0, Number(c.horas) || 0), km = Math.max(0, Number(c.km) || 0);
  const quimicosExacto = lineas.reduce((s, l) => s + l.importe, 0), quimicos = r2(quimicosExacto);
  for(const l of lineas) l.importe = r2(l.importe);
  const v = ex?.convencional;
  if(!v) return { lineas, quimicos, horas, km, sinFormula: true };
  const mano = r2(horas * v.mano_hora), traslado = r2(km * v.km);
  const cotizacion = r2(v.traslado_aparte === false ? (quimicosExacto + mano + traslado) * v.x / v.entre : (quimicosExacto + mano) * v.x / v.entre + traslado);
  const costos = v.costos != null ? r2(cotizacion * v.costos) : null;
  let jadp = null;
  if(ex.jadp){
    const j = ex.jadp, mj = horas * j.mano_hora, sj = (km * j.gasolina_litro / j.km_litro) * j.viajes;
    const t = (quimicosExacto * j.quimicos_x + (quimicosExacto + mj + sj)) * j.margen;
    jadp = { mano: r2(mj), traslado: r2(sj), cotizacion: r2(t), precio: r2(t), costos: r2(t / j.margen), utilidad: r2(t - t / j.margen) };
  }
  return { lineas, quimicos, horas, km, mano, traslado, directo: r2(quimicos + mano + traslado), cotizacion, precio: cotizacion,
    costos, utilidad: costos != null ? r2(cotizacion - costos) : null, jadp };
}

/** Para la hoja que ve el cliente: un solo renglón con lo que se hace. El desglose es del dueño. */
export function concepto(c, ex){
  const plagas = [...new Set((c.renglones || []).map(r => r.plaga).filter(Boolean))];
  return 'Control de plagas' + (plagas.length ? ': ' + plagas.join(', ').toLowerCase() : '');
}
