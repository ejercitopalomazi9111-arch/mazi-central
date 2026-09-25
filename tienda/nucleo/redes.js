/* ══════════════════════════════════════════════════════════════════════════
   REDES · ideas y mejor hora (pruebas-redes.mjs)
   ──────────────────────────────────────────────────────────────────────────
   No publicar por publicar (PLAN.md §12): cada borrador nace de algo que de
   verdad pasó en el negocio —una oferta vigente, lo más vendido de la semana,
   algo nuevo, las últimas piezas— y lleva el precio REAL del catálogo.
   La mejor hora sale de cuándo piden en línea SUS clientes; si todavía no hay
   suficientes pedidos para decirlo, se dice eso y no una hora de internet.
   ═════════════════════════════════════════════════════════════════════════ */
import { DIA, validas, porProducto } from './reportes.js';

const pesos = (n) => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const hora = (h) => h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`;
export const MINIMO_HORA = 20;

/* productos: los del catálogo del cliente ({ id, n, m, p, a, q, x, f, c }).
   admin: los del admin (para saber qué es nuevo: `creado`). enlace(id) → URL. */
export function ideas({ productos = [], ventas = [], admin = [], firma = '', enlace = () => '', ahora = Date.now() } = {}){
  const salida = [], usados = new Set();
  const pie = (p) => `\n\n${p.x ? '' : `Pídelo aquí: ${enlace(p.id)}`}${firma ? `\n— ${firma}` : ''}`.trimEnd();
  const porId = new Map(productos.map((p) => [p.id, p]));

  // 1. Ofertas vigentes (las de más descuento primero).
  for(const p of productos.filter((x) => x.a && !x.x).sort((a, b) => (1 - b.p / b.a) - (1 - a.p / a.a)).slice(0, 3)){
    const pct = Math.round((1 - p.p / p.a) * 100);
    salida.push({ clave: 'oferta:' + p.id, tipo: 'Oferta', producto: p,
      texto: `${p.n} con ${pct} % menos: de ${pesos(p.a)} a ${pesos(p.p)}.${p.q <= 5 ? ` Quedan ${p.q}.` : ''}${pie(p)}` });
    usados.add(p.id);
  }
  // 2. Lo más vendido de los últimos 7 días (con al menos 3 ventas en total).
  const semana = validas(ventas).filter((v) => new Date(v.creado).getTime() >= ahora - 7 * DIA);
  const top = porProducto(semana).filter((x) => porId.has(x.producto_id) && !porId.get(x.producto_id).x).slice(0, 3);
  if(top.length >= 2 && top.reduce((t, x) => t + x.piezas, 0) >= 3){
    const lista = top.map((x, i) => `${i + 1}. ${porId.get(x.producto_id).n} — ${pesos(porId.get(x.producto_id).p)}`).join('\n');
    salida.push({ clave: 'top', tipo: 'Lo más pedido', producto: porId.get(top[0].producto_id),
      texto: `Lo que más se llevaron esta semana:\n${lista}${firma ? `\n\n— ${firma}` : ''}` });
  }
  // 3. Nuevo en la tienda: dado de alta en los últimos 14 días, con existencias,
  //    y DESPUÉS de la carga inicial del catálogo — lo que entró el día que se
  //    importó todo no es novedad para el cliente, es el catálogo.
  const alta = admin.filter((p) => p.creado).map((p) => new Date(p.creado).getTime());
  const cargaInicial = alta.length ? Math.min(...alta) + 3 * DIA : Infinity;
  const nuevos = admin.filter((p) => p.activo && p.creado && ahora - new Date(p.creado).getTime() <= 14 * DIA && new Date(p.creado).getTime() > cargaInicial)
    .map((p) => porId.get(p.id)).filter((p) => p && !p.x && !usados.has(p.id)).slice(0, 2);
  for(const p of nuevos){ salida.push({ clave: 'nuevo:' + p.id, tipo: 'Nuevo', producto: p, texto: `Nuevo en la tienda: ${p.n}${p.m ? ` de ${p.m}` : ''}, a ${pesos(p.p)}.${pie(p)}` }); usados.add(p.id); }
  // 4. Últimas piezas de algo que SÍ se vende (no de lo que nadie quiere).
  const vendidos = new Set(porProducto(validas(ventas).filter((v) => new Date(v.creado).getTime() >= ahora - 30 * DIA)).map((x) => x.producto_id));
  for(const p of productos.filter((x) => !x.x && x.q <= 3 && vendidos.has(x.id) && !usados.has(x.id)).slice(0, 2))
    salida.push({ clave: 'ultimas:' + p.id, tipo: 'Últimas piezas', producto: p, texto: `Últimas ${p.q === 1 ? 'pieza' : `${p.q} piezas`} de ${p.n}, a ${pesos(p.p)}. Cuando se acaben, tarda en volver.${pie(p)}` });
  return salida;
}

/* Cuándo piden en línea (tienda o WhatsApp): el día y la hora con más pedidos.
   → { suficiente: false, van } | { suficiente: true, dia, hora, publicar, texto } */
export function mejorHora(ventas){
  const enLinea = validas(ventas).filter((v) => v.canal === 'tienda' || v.canal === 'bot');
  if(enLinea.length < MINIMO_HORA) return { suficiente: false, van: enLinea.length };
  const porHora = new Array(24).fill(0), porDia = new Array(7).fill(0);
  for(const v of enLinea){ const d = new Date(v.creado); porHora[d.getHours()]++; porDia[d.getDay()]++; }
  const h = porHora.indexOf(Math.max(...porHora)), d = porDia.indexOf(Math.max(...porDia));
  const publicar = (h + 23) % 24;   // una hora antes: que el post ya esté ahí cuando se ponen a pedir
  return { suficiente: true, dia: d, hora: h, publicar,
    texto: `Tus clientes piden más en línea los ${DIAS[d]} y alrededor de las ${hora(h)}. Publica como a las ${hora(publicar)}, para que tu post ya esté arriba.`,
    base: `${enLinea.length} pedidos en línea` };
}
