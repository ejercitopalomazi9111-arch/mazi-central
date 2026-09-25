/* ══════════════════════════════════════════════════════════════════════════
   COTIZACIONES · «¿en cuánto me dejas esto?»
   ──────────────────────────────────────────────────────────────────────────
   Un distribuidor cotiza todo el día: el barbero pregunta por WhatsApp cuánto
   le sale el surtido del mes, y la respuesta tiene que salir en un minuto,
   con los precios de hoy, y poder volverse venta sin capturar todo otra vez.
   La cotización guarda el precio del día en que se hizo: si al cobrarla ya
   cambió, se DICE antes de cobrar, nunca se cobra distinto en silencio.
   Módulo puro (pruebas-cotizacion.mjs). El dinero en centavos, como dinero.js.
   ═════════════════════════════════════════════════════════════════════════ */

const DIA = 86400000;
export const VIGENCIA = 7;   // días, lo que se acostumbra en mostrador

const c = (pesos) => Math.round(Number(pesos || 0) * 100);
const pesos = (cent) => '$' + (cent / 100).toLocaleString('es-MX', { minimumFractionDigits: cent % 100 ? 2 : 0, maximumFractionDigits: 2 });

/* renglones: [{ id, nombre, precio (pesos), cantidad }] → centavos. */
export const importe = (r) => c(r.precio) * r.cantidad;
export const total = (renglones) => (renglones || []).reduce((t, r) => t + importe(r), 0);
export const piezas = (renglones) => (renglones || []).reduce((t, r) => t + r.cantidad, 0);

export function vence(cot){ return cot.cuando + (cot.dias ?? VIGENCIA) * DIA; }
export function vigente(cot, ahora = Date.now()){ return ahora < vence(cot); }

/* «Vale hasta el jueves 2 de octubre». */
const FECHA = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
export const hasta = (cot) => FECHA.format(new Date(vence(cot) - 1));

/* Qué cambió desde que se cotizó, contra el catálogo de hoy.
   porId: Map id → { n, p (precio hoy), q (existencias) }.
   → [{ id, nombre, tipo: 'precio'|'no-esta'|'faltan', antes, ahora, hay }] */
export function cambios(cot, porId){
  const out = [];
  for(const r of cot.renglones){
    const p = porId.get(r.id);
    if(!p){ out.push({ id: r.id, nombre: r.nombre, tipo: 'no-esta' }); continue; }
    if(c(p.p) !== c(r.precio)) out.push({ id: r.id, nombre: r.nombre, tipo: 'precio', antes: c(r.precio), ahora: c(p.p) });
    if(p.q < r.cantidad) out.push({ id: r.id, nombre: r.nombre, tipo: 'faltan', hay: Math.max(0, p.q), quiere: r.cantidad });
  }
  return out;
}

/* Lo que pasa al ticket del mostrador: sólo lo que existe y lo que alcanza.
   El precio lo pone el servidor al vender (el de hoy): por eso `cambios`
   se enseña ANTES de pasar a cobrar. */
export function aTicket(cot, porId){
  const renglones = [];
  for(const r of cot.renglones){
    const p = porId.get(r.id); if(!p || p.q <= 0) continue;
    renglones.push({ id: r.id, cantidad: Math.min(r.cantidad, p.q) });
  }
  return renglones;
}

/* Si ya hay un ticket a medias, se suma sin duplicar renglones. */
export function juntar(ticket, nuevos){
  const out = (ticket || []).map((r) => ({ ...r }));
  for(const n of nuevos){
    const r = out.find((x) => x.id === n.id);
    if(r) r.cantidad += n.cantidad; else out.push({ ...n });
  }
  return out;
}

/* El texto para WhatsApp: se lee en un teléfono, sin tablas. */
export function textoWhatsApp(cot, { negocio = '', contacto = '' } = {}){
  const t = total(cot.renglones);
  const lineas = cot.renglones.map((r) => `• ${r.cantidad} × ${r.nombre} — ${pesos(importe(r))}${r.cantidad > 1 ? ` (${pesos(c(r.precio))} c/u)` : ''}`);
  return [
    `*Cotización ${cot.folio}*${negocio ? ` · ${negocio}` : ''}`,
    cot.cliente?.nombre ? `Para: ${cot.cliente.nombre}` : null,
    '',
    ...lineas,
    '',
    `*Total: ${pesos(t)}* (${piezas(cot.renglones)} ${piezas(cot.renglones) === 1 ? 'pieza' : 'piezas'})`,
    `Precios válidos hasta el ${hasta(cot)}, o mientras haya existencias.`,
    cot.notas ? `\n${cot.notas}` : null,
    contacto ? `\n${contacto}` : null,
  ].filter((x) => x !== null).join('\n');
}

/* ── El archivo de cotizaciones, en el teléfono ────────────────────────────
   almacen: algo con getItem/setItem (localStorage). Folios C1, C2… por
   negocio y por teléfono: una cotización no es una venta, no toca la base. */
export function crearArchivo(almacen, llave){
  const leer = () => { try{ return JSON.parse(almacen.getItem(llave) || '{"n":0,"cots":[]}'); }catch(e){ return { n: 0, cots: [] }; } };
  const guardar = (a) => { try{ almacen.setItem(llave, JSON.stringify(a)); }catch(e){} };
  return {
    todas: () => leer().cots.slice().sort((a, b) => b.cuando - a.cuando),
    una: (id) => leer().cots.find((x) => x.id === id) || null,
    guardar(cot){
      const a = leer();
      if(cot.id && a.cots.some((x) => x.id === cot.id)){ a.cots = a.cots.map((x) => x.id === cot.id ? { ...x, ...cot } : x); guardar(a); return a.cots.find((x) => x.id === cot.id); }
      a.n += 1;
      const nueva = { dias: VIGENCIA, notas: '', cliente: null, ...cot, id: `${Date.now().toString(36)}-${a.n}`, folio: `C${a.n}`, cuando: cot.cuando || Date.now() };
      a.cots.push(nueva); guardar(a); return nueva;
    },
    quitar(id){ const a = leer(); a.cots = a.cots.filter((x) => x.id !== id); guardar(a); },
    marcar(id, cambios){ const a = leer(); const x = a.cots.find((y) => y.id === id); if(x){ Object.assign(x, cambios); guardar(a); } return x; },
  };
}
