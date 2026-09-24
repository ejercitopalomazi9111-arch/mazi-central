/* ══════════════════════════════════════════════════════════════════════════
   CONSEJOS DE VENTA · puros (pruebas-consejos.mjs)
   ──────────────────────────────────────────────────────────────────────────
   Los de Fadori, mejorados: cada consejo dice QUÉ hacer y DE DÓNDE sale, con
   los números del propio negocio. Y un consejo que no tiene con qué sostenerse
   NO sale: sin un mes de ventas no se dice «esto no se vende»; sin suficientes
   tickets no se dice cuál es la hora fuerte. Callar es mejor que inventar.

   consejos({ ventas, productos, clientes, ahora }) → [{ clave, tono, titulo, porque, accion?, peso }]
     ventas: pedidos de los últimos ~60 días · productos: los del admin (con
     existencia) · clientes: los de admin/clientes.js conRecompra (con .urg).
   ═════════════════════════════════════════════════════════════════════════ */
import { DIA, entre, validas, porProducto, porHora, horaFuerte, juntos, resumen, cambio } from './reportes.js';

const pesos = (c) => '$' + Math.round(c / 100).toLocaleString('es-MX');
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const hora = (h) => h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`;

export function consejos({ ventas = [], productos = [], clientes = [], ahora = Date.now() } = {}){
  const salida = [];
  const v = validas(ventas);
  const primera = v.length ? Math.min(...v.map((x) => new Date(x.creado).getTime())) : ahora;
  const diasDeHistoria = Math.floor((ahora - primera) / DIA);
  const ult28 = entre(v, ahora - 28 * DIA, ahora + 1);
  const vendido = new Map(porProducto(ult28).map((p) => [p.producto_id, p]));
  const dias28 = Math.max(1, Math.min(28, diasDeHistoria || 1));
  const disp = (p) => (p.existencia?.cantidad ?? 0) - (p.existencia?.apartado ?? 0);

  // 1. Lo que se va a acabar (o ya se acabó) y SÍ se vende. Con menos de una
  //    semana de ventas, el ritmo de un día bueno se leería como el de siempre.
  const acaban = [];
  if(diasDeHistoria >= 7) for(const p of productos){
    const s = vendido.get(p.id); if(!p.activo || !s || s.piezas < 2) continue;
    const porDia = s.piezas / dias28, q = disp(p);
    const dias = q > 0 ? q / porDia : 0;
    if(dias <= 10) acaban.push({ p, porDia, q, dias, pedir: Math.max(1, Math.ceil(porDia * 30 - Math.max(0, q))) });
  }
  acaban.sort((a, b) => a.dias - b.dias);
  for(const a of acaban.slice(0, 4)){
    const semana = Math.round(a.porDia * 7 * 10) / 10;
    salida.push(a.q <= 0
      ? { clave: 'agotado:' + a.p.id, tono: 'alerta', peso: 100, titulo: `${a.p.nombre} está agotado y se vende`,
          porque: `Vendes como ${semana} por semana. Cada día sin él es venta que se va a otro lado. Para un mes, pide ${a.pedir}.`,
          accion: { texto: 'Ver en inventario', ruta: '/a/inventario' } }
      : { clave: 'acaba:' + a.p.id, tono: 'alerta', peso: 90 - a.dias, titulo: `Se te acaba ${a.p.nombre} en ~${Math.max(1, Math.round(a.dias))} ${Math.round(a.dias) === 1 ? 'día' : 'días'}`,
          porque: `Vendes como ${semana} por semana y te ${a.q === 1 ? 'queda 1' : `quedan ${a.q}`}. Para un mes, pide ${a.pedir}.`,
          accion: { texto: 'Ver en inventario', ruta: '/a/inventario' } });
  }

  // 2. Lo que no se mueve — sólo con más de un mes de historia.
  if(diasDeHistoria >= 30){
    const vendidos45 = new Set(porProducto(entre(v, ahora - 45 * DIA, ahora + 1)).map((p) => p.producto_id));
    const parados = productos.filter((p) => p.activo && disp(p) >= 3 && !vendidos45.has(p.id))
      .map((p) => ({ p, dinero: Math.round(p.precio * 100) * disp(p) })).sort((a, b) => b.dinero - a.dinero);
    if(parados.length){
      const dinero = parados.reduce((t, x) => t + x.dinero, 0);
      salida.push({ clave: 'parados', tono: 'idea', peso: 60, titulo: `${plural(parados.length, 'producto no se ha', 'productos no se han')} vendido en 45 días`,
        porque: `Tienes ${pesos(dinero)} (a precio de venta) parados ahí. Los de más dinero: ${parados.slice(0, 3).map((x) => x.p.nombre).join(', ')}. Una oferta corta los mueve.`,
        accion: { texto: 'Hacer una oferta', ruta: '/a/descuentos' } });
    }
  }

  // 3. Clientes a los que ya les toca.
  const tocan = clientes.filter((c) => c.urg && ['pronto', 'toca'].includes(c.urg.m.clave)).length;
  const atrasados = clientes.filter((c) => c.urg?.m.clave === 'atrasado').length;
  if(tocan || atrasados) salida.push({ clave: 'clientes', tono: 'idea', peso: 70,
    titulo: tocan ? `A ${plural(tocan, 'cliente le toca', 'clientes les toca')} surtirse esta semana` : `${plural(atrasados, 'cliente atrasado', 'clientes atrasados')}`,
    porque: `Sale de cada cuándo compra cada quien.${atrasados && tocan ? ` Además hay ${plural(atrasados, 'atrasado', 'atrasados')}: puede que se hayan ido con otro.` : ''} Un WhatsApp a tiempo vale más que una oferta.`,
    accion: { texto: 'Ver clientes', ruta: '/a/clientes' } });

  // 4. La tendencia: esta semana contra la anterior, con suficientes tickets.
  const esta = resumen(entre(v, ahora - 7 * DIA, ahora + 1)), antes = resumen(entre(v, ahora - 14 * DIA, ahora - 7 * DIA));
  const cam = cambio(esta.total, antes.total);
  if(antes.tickets >= 5 && cam != null && Math.abs(cam) >= 20) salida.push(cam < 0
    ? { clave: 'baja', tono: 'alerta', peso: 80, titulo: `Esta semana vas ${-cam} % abajo`, porque: `${pesos(esta.total)} contra ${pesos(antes.total)} de la semana anterior (${esta.tickets} tickets contra ${antes.tickets}).`, accion: { texto: 'Ver reportes', ruta: '/a/reportes' } }
    : { clave: 'sube', tono: 'bien', peso: 40, titulo: `Esta semana vas ${cam} % arriba`, porque: `${pesos(esta.total)} contra ${pesos(antes.total)} de la semana anterior. Lo que cambiaste, funciona.` });

  // 5. La hora fuerte — con 20 tickets y una semana de historia: veinte ventas
  //    de un solo día dicen cómo fue ESE día, no cómo es el negocio.
  const lapso = diasDeHistoria >= 28 ? 'últimas 4 semanas' : `últimos ${diasDeHistoria} días`;
  if(ult28.length >= 20 && diasDeHistoria >= 7){
    const hf = horaFuerte(porHora(ult28)), total = ult28.reduce((t, x) => t + Math.round(Number(x.total) * 100), 0);
    if(hf && total) salida.push({ clave: 'hora', tono: 'idea', peso: 30, titulo: `Tu hora fuerte: de ${hora(hf.desde)} a ${hora(hf.hasta)}`,
      porque: `Ahí se hace el ${Math.round(hf.total / total * 100)} % de lo que vendes (${lapso}). Que a esa hora no falte quién cobre ni producto en el mostrador.` });
  }

  // 6. Lo que sale junto — tres tickets o más.
  const par = diasDeHistoria >= 7 ? juntos(ult28, 3)[0] : null;
  if(par){
    const nombre = (id) => productos.find((p) => p.id === id)?.nombre || vendido.get(id)?.nombre || 'un producto';
    salida.push({ clave: 'juntos', tono: 'idea', peso: 25, titulo: `${nombre(par.a)} y ${nombre(par.b)} salen juntos`,
      porque: `Van en el mismo ticket ${par.veces} veces (${lapso}). Ponlos juntos en el mostrador o arma un paquete.` });
  }

  return salida.sort((a, b) => b.peso - a.peso);
}
