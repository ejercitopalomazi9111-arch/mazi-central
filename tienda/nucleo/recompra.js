/* ══════════════════════════════════════════════════════════════════════════
   RECOMPRA · cuándo le toca volver a surtirse a cada cliente
   ──────────────────────────────────────────────────────────────────────────
   Lo que decidió el plan (PLAN.md §9) y que se prueba en pruebas-recompra.mjs:
     · 1 compra de un producto  → nada. Con una sola no hay ritmo que medir.
     · 2 compras                → INDICIO: una sola distancia, se dice así.
     · 3 o más                  → RITMO: la mediana de las distancias, que no
                                  se deja arrastrar por la vez que tardó tres meses.
   Y lo que no se negocia: CADA aviso lleva en qué se basa (`base` + `porque`).
   Un «te toca surtirte» sin razón a la vista parece spam y se ignora.

   La cantidad cuenta: si compra una cera cada 30 días y la última vez se llevó
   dos, no le toca en 30 sino en 60. Por eso se mide en DÍAS POR PIEZA.

   Todo es puro (sin base ni pantalla): entra la lista de pedidos, sale el
   cálculo. Los pedidos cancelados o no entregados no cuentan como compra.
   ═════════════════════════════════════════════════════════════════════════ */

export const DIA = 86400000;
const NO_CUENTAN = new Set(['cancelado', 'no_entregado']);

const inicioDia = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const entreDias = (a, b) => Math.round((inicioDia(b) - inicioDia(a)) / DIA);

export function mediana(xs){
  if(!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function moda(xs){
  const c = new Map(); let mejor = null, n = 0;
  for(const x of xs) if(x != null){ const k = (c.get(x) || 0) + 1; c.set(x, k); if(k > n){ n = k; mejor = x; } }
  return mejor;
}

export const validos = (pedidos) => (pedidos || []).filter((p) => !NO_CUENTAN.has(p.estado))
  .sort((a, b) => new Date(a.creado) - new Date(b.creado));

/* Compras de cada producto, juntando las del mismo día (dos pedidos el mismo
   día son una sola visita, no un ritmo de cero días).
   → Map(producto_id → { nombre, compras: [{ dia, cantidad }] }) */
export function porProducto(pedidos){
  const m = new Map();
  for(const p of validos(pedidos)){
    const dia = inicioDia(p.creado);
    for(const r of p.renglones || []){
      if(!r.producto_id) continue;
      let e = m.get(r.producto_id);
      if(!e) m.set(r.producto_id, e = { producto_id: r.producto_id, nombre: r.nombre, compras: [] });
      e.nombre = r.nombre;
      const ult = e.compras[e.compras.length - 1];
      if(ult && ult.dia === dia) ult.cantidad += r.cantidad;
      else e.compras.push({ dia, cantidad: r.cantidad });
    }
  }
  return m;
}

/* Estima la próxima compra de UN producto.
   → null si no hay con qué, o { nivel, cada, porPieza, proxima, ultima, cantidad, base } */
export function estimar(compras){
  if(!compras || compras.length < 2) return null;
  const porPieza = [], distancias = [];
  for(let i = 1; i < compras.length; i++){
    const d = entreDias(compras[i - 1].dia, compras[i].dia);
    if(d <= 0) continue;
    distancias.push(d);
    porPieza.push(d / Math.max(1, compras[i - 1].cantidad));
  }
  if(!distancias.length) return null;
  const ultima = compras[compras.length - 1];
  const dpp = mediana(porPieza);
  const cada = Math.max(1, Math.round(dpp * Math.max(1, ultima.cantidad)));
  const d = new Date(ultima.dia); d.setDate(d.getDate() + cada);
  return {
    nivel: distancias.length >= 2 ? 'ritmo' : 'indicio',
    cada, porPieza: dpp,
    proxima: inicioDia(d), ultima: ultima.dia, cantidad: ultima.cantidad,
    tipica: mediana(compras.map((c) => c.cantidad)),
    base: { compras: compras.length, distancias, minimo: Math.min(...distancias), maximo: Math.max(...distancias) },
  };
}

/* En qué punto va respecto a hoy. El margen de «ya le toca» crece con el ritmo:
   a quien compra cada 90 días, una semana tarde no es atraso. */
export function momento(e, hoy = Date.now()){
  if(!e) return null;
  const faltan = entreDias(hoy, e.proxima);
  if(faltan > 7) return { clave: 'luego', faltan };
  if(faltan >= 0) return { clave: 'pronto', faltan };
  const margen = Math.max(7, Math.round(e.cada * 0.5));
  if(-faltan <= margen) return { clave: 'toca', faltan };
  return { clave: 'atrasado', faltan };
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const diaCorto = (t) => { const d = new Date(t); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const veces = (n) => n === 1 ? '1 vez' : `${n} veces`;
const piezas = (n) => n === 1 ? '1 pieza' : `${n} piezas`;
export const dias = (n) => n === 1 ? '1 día' : `${n} días`;

/* En qué se basa, dicho como lo diría quien atiende la tienda. */
export function porque(e){
  if(!e) return '';
  const { base } = e;
  const cuando = `La última fue el ${diaCorto(e.ultima)} y ${e.cantidad === 1 ? 'llevaste 1' : `llevaste ${e.cantidad}`}`;
  if(e.nivel === 'indicio')
    return `Lo has comprado 2 veces, con ${dias(base.distancias[0])} entre una y otra. Es una pista, no un ritmo todavía. ${cuando}.`;
  const rango = base.minimo === base.maximo ? `siempre ${dias(base.minimo)}` : `entre ${base.minimo} y ${dias(base.maximo)}`;
  const porPieza = e.cantidad > 1 ? ` Por pieza te dura como ${dias(Math.round(e.porPieza))}.` : '';
  return `Lo has comprado ${veces(base.compras)}; entre una compra y otra van ${rango}.${porPieza} ${cuando}.`;
}

/* Lo mismo pero para el admin, hablando del cliente en tercera persona. */
export const porqueDe = (e) => porque(e).replace(/Lo has comprado/g, 'Lo ha comprado').replace(/llevaste/g, 'llevó').replace(/te dura/g, 'le dura');

/* Todas las estimaciones de un cliente, ordenadas de la más urgente a la menos. */
export function recompras(pedidos, hoy = Date.now()){
  const salida = [];
  for(const e of porProducto(pedidos).values()){
    const est = estimar(e.compras);
    if(!est) continue;
    salida.push({ producto_id: e.producto_id, nombre: e.nombre, ...est, momento: momento(est, hoy) });
  }
  return salida.sort((a, b) => a.proxima - b.proxima);
}

/* «Te toca surtirte»: lo que ya le toca o le toca en esta semana. Lo atrasado
   de más de medio ritmo también sale: puede que se le haya olvidado. */
export const teToca = (pedidos, hoy) => recompras(pedidos, hoy).filter((r) => r.momento.clave !== 'luego');

/* «Tu pedido de siempre»:
     · con 2+ pedidos, lo que se repite en al menos dos, en la cantidad típica;
     · si nada se repite (o sólo hay uno), su último pedido, y se dice que es eso.
   → null | { tipo: 'siempre' | 'ultimo', renglones: [{ producto_id, nombre, cantidad, veces }] } */
export function pedidoDeSiempre(pedidos){
  const v = validos(pedidos);
  if(!v.length) return null;
  const m = new Map();
  for(const p of v){
    const vistos = new Set();
    for(const r of p.renglones || []){
      if(!r.producto_id) continue;
      let e = m.get(r.producto_id);
      if(!e) m.set(r.producto_id, e = { producto_id: r.producto_id, nombre: r.nombre, cantidades: [], veces: 0 });
      if(!vistos.has(r.producto_id)){ e.veces++; vistos.add(r.producto_id); }
      e.cantidades.push(r.cantidad);
    }
  }
  const repetidos = [...m.values()].filter((e) => e.veces >= 2)
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre)).slice(0, 8);
  if(repetidos.length)
    return { tipo: 'siempre', renglones: repetidos.map((e) => ({ producto_id: e.producto_id, nombre: e.nombre, cantidad: Math.max(1, Math.round(mediana(e.cantidades))), veces: e.veces })) };
  const ult = v[v.length - 1];
  const junto = new Map();
  for(const r of ult.renglones || []) if(r.producto_id)
    junto.set(r.producto_id, { producto_id: r.producto_id, nombre: r.nombre, cantidad: (junto.get(r.producto_id)?.cantidad || 0) + r.cantidad, veces: 1 });
  return junto.size ? { tipo: 'ultimo', renglones: [...junto.values()] } : null;
}

/* La ficha del cliente: lo que el admin quiere saber de un vistazo. */
export function ficha(pedidos, hoy = Date.now()){
  const v = validos(pedidos);
  if(!v.length) return { pedidos: 0, cancelados: (pedidos || []).length };
  const dias = [...new Set(v.map((p) => inicioDia(p.creado)))];
  const distancias = dias.slice(1).map((d, i) => entreDias(dias[i], d)).filter((d) => d > 0);
  const cada = distancias.length ? Math.round(mediana(distancias)) : null;
  const gastado = v.reduce((t, p) => t + Number(p.total || 0), 0);
  const ultima = dias[dias.length - 1];
  let proxima = null;
  if(cada){ const d = new Date(ultima); d.setDate(d.getDate() + cada); proxima = inicioDia(d); }
  return {
    pedidos: v.length,
    cancelados: (pedidos || []).length - v.length,
    primera: inicioDia(v[0].creado),
    ultima,
    cada, nivel: distancias.length >= 2 ? 'ritmo' : distancias.length ? 'indicio' : null,
    proxima,
    momento: proxima ? momento({ proxima, cada }, hoy) : null,
    gastado, promedio: gastado / v.length,
    pago: moda(v.map((p) => p.forma_pago)) || null,
    momentoPago: moda(v.map((p) => p.momento_pago)) || null,
    canal: moda(v.map((p) => p.canal)) || null,
  };
}
