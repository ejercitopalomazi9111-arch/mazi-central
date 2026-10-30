/* LA AGENDA DE LAS BARBERÍAS DE MUESTRA: lo que comparten las cuatro páginas (Carlos, 30 oct: «deben permitir
   desde ver el sitio hasta reservar y ver servicios»). Arma los horarios libres de cada barbero, guarda la cita en
   el teléfono de quien reserva, se la manda a la barbería por WhatsApp y le da su archivo de calendario.

   ⚠️ ES UNA DEMOSTRACIÓN: no hay servidor, así que lo «ocupado» se inventa con una semilla por día y barbero
   (siempre el mismo para el mismo día, para que se vea creíble) más lo que el propio teléfono ya reservó. Cuando
   se venda a una barbería de verdad, este archivo es lo que se conecta a su agenda real; las páginas no cambian. */

export const DEMO_WHATSAPP = '524428833786';   /* el de Grupo Mazi: así quien prueba la demo nos escribe a nosotros */

const semilla = (t) => { let h = 2166136261; for(const c of t){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }; };
export const dosDig = (n) => String(n).padStart(2, '0');
export const claveDia = (d) => `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}`;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreDia = (d) => DIAS[d.getDay()];
export const fechaLarga = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const fechaCorta = (d) => ({ dia: DIAS[d.getDay()].slice(0, 3), num: d.getDate(), mes: MESES[d.getMonth()].slice(0, 3) });
export const hora12 = (min) => { const h = Math.floor(min / 60), m = min % 60, hh = h % 12 || 12; return `${hh}:${dosDig(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`; };
export const pesos = (n) => '$' + Number(n).toLocaleString('es-MX');

/* horario: { 1: [600, 1200], … } en minutos desde medianoche; el día que no está, cierra */
export function crearAgenda({ negocio, clave, horario, barberos = [], paso = 30, whatsapp = DEMO_WHATSAPP, direccion = '' }){
  const K = `barberia:${clave}:citas`;
  const leer = () => { try{ return JSON.parse(localStorage.getItem(K) || '[]'); }catch(e){ return []; } };
  const escribir = (l) => { try{ localStorage.setItem(K, JSON.stringify(l)); }catch(e){} };

  /* ¿está abierto ahorita? (para el letrero de arriba) */
  function abiertoAhora(ahora = new Date()){ const h = horario[ahora.getDay()], m = ahora.getHours() * 60 + ahora.getMinutes();
    if(h && m >= h[0] && m < h[1]) return { abierto: true, texto: `Abierto · cierra a las ${hora12(h[1])}` };
    for(let k = 0; k < 8; k++){ const d = new Date(ahora); d.setDate(d.getDate() + k); const hh = horario[d.getDay()]; if(!hh) continue; if(k === 0 && m >= hh[0]) continue;
      return { abierto: false, texto: `Cerrado · abre ${k === 0 ? 'hoy' : k === 1 ? 'mañana' : DIAS[d.getDay()]} a las ${hora12(hh[0])}` }; }
    return { abierto: false, texto: 'Cerrado' }; }

  /* los próximos días que abre */
  function dias(n = 14, desde = new Date()){ const l = []; for(let k = 0; l.length < n && k < 40; k++){ const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + k); if(horario[d.getDay()]) l.push(d); } return l; }

  /* lo ocupado de un barbero en un día: lo inventado (siempre igual para ese día) más lo reservado aquí */
  function ocupado(dia, barbero){ const h = horario[dia.getDay()]; if(!h) return new Set(); const R = semilla(`${clave}|${claveDia(dia)}|${barbero}`), s = new Set();
    for(let m = h[0]; m < h[1]; m += paso) if(R() < .3) s.add(m);
    for(const c of leer()) if(c.fecha === claveDia(dia) && (c.barbero === barbero) && c.estado !== 'cancelada') for(let m = c.inicio; m < c.inicio + c.dur; m += paso) s.add(m);
    return s; }
  /* las horas en que cabe un servicio de `dur` minutos con ese barbero (o con cualquiera) */
  function libres(dia, dur, barbero = null){ const h = horario[dia.getDay()]; if(!h) return [];
    const ahora = new Date(), hoy = claveDia(ahora) === claveDia(dia), minAhora = ahora.getHours() * 60 + ahora.getMinutes() + 30;
    const quienes = barbero ? [barbero] : barberos.map(b => b.id), l = [];
    for(let m = h[0]; m + dur <= h[1]; m += paso){ if(hoy && m < minAhora) continue;
      const con = quienes.filter(b => { const oc = ocupado(dia, b); for(let x = m; x < m + dur; x += paso) if(oc.has(x)) return false; return true; });
      l.push({ min: m, libre: con.length > 0, con }); }
    return l; }

  function reservar({ servicios, barbero, dia, inicio, nombre, tel, nota = '' }){
    const dur = servicios.reduce((a, s) => a + (s.dur || 30), 0), total = servicios.reduce((a, s) => a + (s.precio || 0), 0);
    const b = barberos.find(x => x.id === barbero);
    const c = { id: Date.now().toString(36), fecha: claveDia(dia), inicio, dur, barbero, barberoNombre: b?.nombre || 'El que esté libre', servicios: servicios.map(s => s.nombre), total, nombre, tel, nota, estado: 'confirmada', creada: Date.now() };
    const l = leer(); l.push(c); escribir(l); return c; }
  const misCitas = () => leer().filter(c => c.estado !== 'cancelada' && new Date(c.fecha + 'T23:59') >= new Date()).sort((a, b) => (a.fecha + dosDig(a.inicio)).localeCompare(b.fecha + dosDig(b.inicio)));
  const cancelar = (id) => { const l = leer(); const c = l.find(x => x.id === id); if(c) c.estado = 'cancelada'; escribir(l); return c; };
  const diaDe = (c) => { const [y, m, d] = c.fecha.split('-').map(Number); return new Date(y, m - 1, d); };

  /* el mensaje que le llega a la barbería */
  function whatsappDe(c, extra = ''){ const d = diaDe(c);
    const t = `Hola, ${negocio} 👋 Quiero confirmar mi cita:\n\n✂️ ${c.servicios.join(' + ')}\n📅 ${fechaLarga(d)}\n🕐 ${hora12(c.inicio)}\n💈 Con: ${c.barberoNombre}\n💵 Total aprox.: ${pesos(c.total)}\n👤 ${c.nombre}${c.tel ? ' · ' + c.tel : ''}${c.nota ? '\n📝 ' + c.nota : ''}${extra}\n\n(Reservé desde su página · demo de Grupo Mazi)`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(t)}`; }
  const whatsappTexto = (t) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(t + '\n\n(Desde su página · demo de Grupo Mazi)')}`;

  /* el archivo de calendario: el iPhone lo abre directo en Calendario con su recordatorio */
  function calendarioDe(c){ const d = diaDe(c), f = (min) => { const x = new Date(d); x.setMinutes(min); return `${x.getFullYear()}${dosDig(x.getMonth() + 1)}${dosDig(x.getDate())}T${dosDig(x.getHours())}${dosDig(x.getMinutes())}00`; };
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Grupo Mazi//Barberia//ES', 'BEGIN:VEVENT', `UID:${c.id}@${clave}`, `DTSTAMP:${f(0).slice(0, 9)}000000`, `DTSTART:${f(c.inicio)}`, `DTEND:${f(c.inicio + c.dur)}`,
      `SUMMARY:${c.servicios.join(' + ')} · ${negocio}`, `LOCATION:${direccion.replace(/,/g, '\\,')}`, `DESCRIPTION:Con ${c.barberoNombre}. Total aprox. ${pesos(c.total)}.`,
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Tu cita en la barbería', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); }

  return { abiertoAhora, dias, libres, reservar, misCitas, cancelar, whatsappDe, whatsappTexto, calendarioDe, diaDe, barberos, horario };
}
