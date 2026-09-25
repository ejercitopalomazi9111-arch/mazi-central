/* ══════════════════════════════════════════════════════════════════════════
   PLANTILLA · qué dice un ticket, una sola vez
   ──────────────────────────────────────────────────────────────────────────
   El ticket se describe como una lista de piezas (texto, par, raya, qr…) y
   de ahí salen las tres versiones: bytes para la impresora, renglones para
   la vista previa y el modo imagen. Así los tres dicen lo mismo siempre.
   Módulo puro.
   ═════════════════════════════════════════════════════════════════════════ */
import { Ticket, partir, dosLados } from './escpos.js';

const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', mixto: 'Mixto', pasarela: 'En línea' };

/* venta: { folio, cuando, renglones:[{nombre, cantidad, precio, importe}], total, envio?, metodo?, recibido?, cambio?, cajero?, cliente?, direccion?, qr? }
   negocio: la fila de negocios (nombre, marca, ajustes). */
export function piezasTicket(venta, negocio, { copia = '' } = {}){
  const a = negocio.ajustes || {}, t = a.ticket || {}, c = a.contacto || {};
  const ps = [];
  ps.push({ t: 'texto', v: negocio.marca?.nombre_corto || negocio.nombre, alinear: 'centro', negritas: true, grande: true });
  if(t.encabezado) ps.push({ t: 'texto', v: t.encabezado, alinear: 'centro' });
  if(c.direccion) ps.push({ t: 'texto', v: c.direccion, alinear: 'centro' });
  if(c.whatsapp) ps.push({ t: 'texto', v: `WhatsApp ${c.whatsapp}`, alinear: 'centro' });
  if(t.rfc) ps.push({ t: 'texto', v: `RFC ${t.rfc}`, alinear: 'centro' });
  if(venta.titulo) ps.push({ t: 'texto', v: `*** ${venta.titulo} ***`, alinear: 'centro', negritas: true });   // «DEVOLUCIÓN»
  if(copia || venta.reimpresion) ps.push({ t: 'texto', v: `*** ${copia || 'REIMPRESIÓN'} ***`, alinear: 'centro', negritas: true });
  ps.push({ t: 'raya' });
  ps.push({ t: 'par', izq: venta.etiquetaFolio ? `${venta.etiquetaFolio} ${venta.folio}` : `Ticket #${venta.folio}`, der: FECHA.format(new Date(venta.cuando || Date.now())) });
  if(venta.cajero) ps.push({ t: 'texto', v: `Atendió: ${venta.cajero}` });
  if(venta.cliente) ps.push({ t: 'texto', v: `Cliente: ${venta.cliente}` });
  if(venta.direccion) ps.push({ t: 'texto', v: `Entregar en: ${venta.direccion}` });
  if(venta.motivo) ps.push({ t: 'texto', v: `Motivo: ${venta.motivo}` });
  ps.push({ t: 'raya' });
  for(const r of venta.renglones){
    ps.push({ t: 'par', izq: `${r.cantidad} ${r.nombre}`, der: pesos(r.importe ?? r.precio * r.cantidad) });
    if(r.cantidad > 1) ps.push({ t: 'texto', v: `   ${r.cantidad} x ${pesos(r.precio)}` });
  }
  ps.push({ t: 'raya' });
  const piezas = venta.renglones.reduce((s, r) => s + r.cantidad, 0);
  if(venta.envio) ps.push({ t: 'par', izq: 'Envío', der: pesos(venta.envio) });
  ps.push({ t: 'par', izq: `${venta.etiquetaTotal || 'TOTAL'} (${piezas} ${piezas === 1 ? 'pieza' : 'piezas'})`, der: pesos(venta.total), negritas: true });
  if(venta.metodo) ps.push({ t: 'par', izq: METODO[venta.metodo] || venta.metodo, der: venta.recibido != null ? pesos(venta.recibido) : '' });
  if(venta.cambio) ps.push({ t: 'par', izq: 'Cambio', der: pesos(venta.cambio), negritas: true });
  ps.push({ t: 'saltar' });
  ps.push({ t: 'texto', v: venta.pie || t.pie || '¡Gracias por tu compra!', alinear: 'centro' });
  if(c.horario) ps.push({ t: 'texto', v: c.horario, alinear: 'centro' });
  if(venta.qr && t.qr !== false){ ps.push({ t: 'texto', v: t.textoQr || 'Pide otra vez desde aquí:', alinear: 'centro' }); ps.push({ t: 'qr', v: venta.qr }); }
  return ps;
}

/* El corte de caja, para engraparlo al dinero que se entrega. Montos en
   pesos; `conteo`: { centavos de la denominación: cuántas }.
   corte: { abierta, cerrada, cajero, tickets, fondo, efectivo, tarjeta, transferencia, devuelto, esperado, contado, nota, conteo } */
export function piezasCorte(k, negocio){
  const ps = [], centavos = (n) => Math.round(Number(n || 0) * 100);
  ps.push({ t: 'texto', v: negocio?.marca?.nombre_corto || negocio?.nombre || 'Tienda', alinear: 'centro', negritas: true, grande: true });
  ps.push({ t: 'texto', v: '*** CORTE DE CAJA ***', alinear: 'centro', negritas: true });
  if(k.reimpresion) ps.push({ t: 'texto', v: '*** REIMPRESIÓN ***', alinear: 'centro', negritas: true });
  ps.push({ t: 'raya' });
  if(k.abierta) ps.push({ t: 'par', izq: 'Abrió', der: FECHA.format(new Date(k.abierta)) });
  ps.push({ t: 'par', izq: 'Cerró', der: FECHA.format(new Date(k.cerrada || Date.now())) });
  if(k.cajero) ps.push({ t: 'texto', v: `Cajero: ${k.cajero}` });
  ps.push({ t: 'raya' });
  const cifras = [];
  if(k.tickets != null) cifras.push({ t: 'par', izq: 'Tickets', der: String(k.tickets) });
  if(k.fondo != null) cifras.push({ t: 'par', izq: 'Fondo inicial', der: pesos(k.fondo) });
  if(k.efectivo != null) cifras.push({ t: 'par', izq: 'Ventas en efectivo', der: pesos(k.efectivo) });
  if(k.devuelto) cifras.push({ t: 'par', izq: 'Devoluciones', der: '-' + pesos(k.devuelto) });
  if(k.tarjeta) cifras.push({ t: 'par', izq: 'Tarjeta (no va en el cajón)', der: pesos(k.tarjeta) });
  if(k.transferencia) cifras.push({ t: 'par', izq: 'Transferencia (no va en el cajón)', der: pesos(k.transferencia) });
  if(cifras.length) ps.push(...cifras, { t: 'raya' });   // un corte reimpreso sólo trae lo del cajón
  ps.push({ t: 'par', izq: 'Debía haber', der: pesos(k.esperado), negritas: true });
  ps.push({ t: 'par', izq: 'Se contó', der: pesos(k.contado), negritas: true });
  const dif = centavos(k.contado) - centavos(k.esperado);
  ps.push({ t: 'texto', v: dif === 0 ? 'CUADRÓ EXACTO' : dif > 0 ? `SOBRAN ${pesos(dif / 100)}` : `FALTAN ${pesos(-dif / 100)}`, alinear: 'centro', negritas: true, grande: true });
  const filas = Object.entries(k.conteo || {}).map(([d, n]) => [Number(d), Number(n)]).filter(([, n]) => n > 0).sort((a, b) => b[0] - a[0]);
  if(filas.length){
    ps.push({ t: 'raya' });
    ps.push({ t: 'texto', v: 'Lo que se contó:', negritas: true });
    for(const [d, n] of filas) ps.push({ t: 'par', izq: `${n} x ${pesos(d / 100)}`, der: pesos(d * n / 100) });
  }
  if(k.nota) ps.push({ t: 'texto', v: `Nota: ${k.nota}` });
  ps.push({ t: 'saltar', n: 2 });
  ps.push({ t: 'texto', v: 'Entregó: ______________________' });
  ps.push({ t: 'saltar' });
  ps.push({ t: 'texto', v: 'Recibió: ______________________' });
  return ps;
}

export function aBytes(piezas, conf, { cajon = false, imagen = null } = {}){
  const k = new Ticket(conf);
  if(imagen) k.imagen(imagen);              // modo imagen: todo el ticket ya viene dibujado
  else for(const p of piezas){
    if(p.t === 'texto') k.texto(p.v, p);
    else if(p.t === 'par') k.par(p.izq, p.der, p);
    else if(p.t === 'raya') k.raya();
    else if(p.t === 'saltar') k.saltar(p.n || 1);
    else if(p.t === 'qr') k.qrCodigo(p.v, conf.columnas <= 32 ? 5 : 6);
  }
  k.cortar();
  if(cajon) k.cajon();
  return k.bytes();
}

/* Renglones de texto para la vista previa y el modo imagen. `estilo` dice
   qué renglones van grandes o en negritas. */
export function aRenglones(piezas, columnas){
  const salida = [];
  const centro = (s, n) => { const e = Math.max(0, Math.floor((n - s.length) / 2)); return ' '.repeat(e) + s; };
  for(const p of piezas){
    if(p.t === 'texto'){
      const n = p.grande ? Math.floor(columnas / 2) : columnas;
      for(const r of partir(p.v, n)) salida.push({ v: p.alinear === 'centro' ? centro(r, n) : p.alinear === 'der' ? r.padStart(n) : r, negritas: p.negritas, grande: p.grande });
    }else if(p.t === 'par') for(const r of dosLados(p.izq, p.der, columnas)) salida.push({ v: r, negritas: p.negritas });
    else if(p.t === 'raya') salida.push({ v: '-'.repeat(columnas) });
    else if(p.t === 'saltar') salida.push({ v: '' });
    else if(p.t === 'qr') salida.push({ qr: p.v });
  }
  return salida;
}
