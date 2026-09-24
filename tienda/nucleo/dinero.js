/* ══════════════════════════════════════════════════════════════════════════
   DINERO · cambio, billetes y conteo de caja, en CENTAVOS
   ──────────────────────────────────────────────────────────────────────────
   Todo se cuenta en centavos enteros: 0.1 + 0.2 no es 0.3 en JavaScript, y un
   cajero no puede ver «Cambio: $19.999999». Las pantallas convierten al pintar.
   Módulo puro, sin DOM: lo prueba pruebas-dinero.mjs.
   ═════════════════════════════════════════════════════════════════════════ */

/* Lo que circula en México, en centavos, de mayor a menor. */
export const BILLETES = [100000, 50000, 20000, 10000, 5000, 2000];
export const MONEDAS = [1000, 500, 200, 100, 50];
export const DENOMINACIONES = [...BILLETES, ...MONEDAS];

export const aCentavos = (pesos) => Math.round(Number(pesos) * 100);
export const aPesos = (c) => c / 100;

export const cambio = (total, recibido) => recibido - total;

/* Botones de «con cuánto pagó»: el exacto, y los billetes con los que la gente
   de verdad paga ese total — el siguiente redondo y los billetes que lo cubren
   solos. Para $187: exacto, $190, $200, $500, $1000. Sin repetir, en orden. */
export function sugerirPagos(total){
  if(total <= 0) return [];
  const s = new Set([total]);
  for(const r of [1000, 5000, 10000]){             // a los 10, 50 y 100 pesos
    const arriba = Math.ceil(total / r) * r;
    if(arriba > total) s.add(arriba);
  }
  for(const b of [...BILLETES].reverse()) if(b > total) s.add(b);
  // Dos billetes iguales cubren lo que uno no (dos de 500 para $870).
  for(const b of BILLETES) if(b < total && b * 2 >= total) s.add(b * 2);
  return [...s].filter((x) => x <= Math.max(total * 3, 100000)).sort((a, b) => a - b).slice(0, 6);
}

/* Cómo dar el cambio: el menor número de piezas, con lo que hay en México.
   Devuelve [{ valor, piezas }]. Si sobra menos de 50 centavos, se dice. */
export function desglose(c){
  const salida = [];
  let resto = c;
  for(const d of DENOMINACIONES){
    const n = Math.floor(resto / d);
    if(n){ salida.push({ valor: d, piezas: n }); resto -= n * d; }
  }
  return { piezas: salida, resto };
}

/* Conteo de caja por denominación: { 50000: 3, 2000: 4, … } → centavos. */
export const contar = (conteo) => Object.entries(conteo).reduce((t, [d, n]) => t + Number(d) * (Number(n) || 0), 0);
