/* ══════════════════════════════════════════════════════════════════════════
   SORTEO · cuentas puras (pruebas-sorteo.mjs)
   ──────────────────────────────────────────────────────────────────────────
   Quién entra: quien compró al menos el mínimo DENTRO del mes del sorteo,
   sin contar lo cancelado ni lo no entregado. El que gana sale al azar de
   verdad (crypto), y la lista con la que se sorteó queda con una huella que
   se puede imprimir en el acta: si alguien cambia la lista, cambia la huella.
   ═════════════════════════════════════════════════════════════════════════ */
const NO_CUENTAN = new Set(['cancelado', 'no_entregado']);

export function rangoMes(mes){
  const [a, m] = String(mes).slice(0, 7).split('-').map(Number);
  return [new Date(a, m - 1, 1).getTime(), new Date(a, m, 1).getTime()];
}

/* Lo que compró en el mes (pesos). */
export function gastoDelMes(pedidos, mes){
  const [desde, hasta] = rangoMes(mes);
  return (pedidos || []).filter((p) => !NO_CUENTAN.has(p.estado))
    .filter((p) => { const t = new Date(p.creado).getTime(); return t >= desde && t < hasta; })
    .reduce((t, p) => t + Number(p.total || 0), 0);
}

export function avance(pedidos, sorteo){
  const gasto = gastoDelMes(pedidos, sorteo.mes), min = Number(sorteo.minimo_mensual);
  return { gasto, minimo: min, falta: Math.max(0, min - gasto), dentro: gasto >= min, porcentaje: Math.min(100, Math.round(gasto / min * 100)) };
}

/* clientes: [{ id, nombre, pedidos }] → { dentro, cerca } (cerca = les falta 25 % o menos). */
export function participantes(clientes, sorteo){
  const dentro = [], cerca = [];
  for(const c of clientes){
    const a = avance(c.pedidos, sorteo);
    if(a.dentro) dentro.push({ ...c, avance: a });
    else if(a.gasto > 0 && a.falta <= a.minimo * 0.25) cerca.push({ ...c, avance: a });
  }
  dentro.sort((x, y) => String(x.id).localeCompare(String(y.id)));   // orden fijo: la huella no depende de cómo llegaron
  cerca.sort((x, y) => x.avance.falta - y.avance.falta);
  return { dentro, cerca };
}

/* Huella corta (FNV-1a de 32 bits) de la lista de ids. No es criptografía:
   es para que el acta diga con qué lista se sorteó. */
export function huella(ids){
  let h = 0x811c9dc5;
  for(const ch of [...ids].sort().join('|')){ h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0').toUpperCase();
}

/* Índice al azar sin sesgo de módulo. `azar` se inyecta para poder probarlo. */
export function elegir(n, azar = (a) => crypto.getRandomValues(a)){
  if(n <= 0) return -1;
  const tope = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
  for(let i = 0; i < 100; i++){ azar(a); if(a[0] < tope) return a[0] % n; }
  return a[0] % n;
}
