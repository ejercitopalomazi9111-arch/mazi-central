/* ══════════════════════════════════════════════════════════════════════════
   HORAS · cuánto trabajó cada quien, sin contar pausas
   ──────────────────────────────────────────────────────────────────────────
   De aquí sale lo que se le paga a un repartidor, así que se prueba aparte
   (pruebas-horas.mjs). Reglas:
     · trabajado = turno − pausas; un turno abierto cuenta hasta «ahora»;
     · un turno que cruza la medianoche se reparte entre los dos días;
     · una pausa sin cerrar cuenta como pausa hasta que el turno termina.
   Todo en milisegundos; las pantallas convierten.
   ═════════════════════════════════════════════════════════════════════════ */

const ms = (d) => d == null ? null : new Date(d).getTime();
const cruce = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

/* Tramos trabajados de un turno: [{desde, hasta}] sin los huecos de pausa. */
export function tramos(turno, ahora = Date.now()){
  const ini = ms(turno.inicio), fin = ms(turno.fin) ?? ahora;
  const pausas = (turno.pausas || []).map((p) => [Math.max(ini, ms(p.inicio)), Math.min(fin, ms(p.fin) ?? fin)])
    .filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const salida = []; let cursor = ini;
  for(const [a, b] of pausas){ if(a > cursor) salida.push({ desde: cursor, hasta: a }); cursor = Math.max(cursor, b); }
  if(fin > cursor) salida.push({ desde: cursor, hasta: fin });
  return salida;
}

export const trabajado = (turno, ahora) => tramos(turno, ahora).reduce((t, x) => t + x.hasta - x.desde, 0);
export const enPausa = (turno) => (turno.pausas || []).some((p) => !p.fin) && !turno.fin;

/* Lo trabajado dentro de [desde, hasta). */
export const entre = (turno, desde, hasta, ahora) => tramos(turno, ahora).reduce((t, x) => t + cruce(x.desde, x.hasta, ms(desde), ms(hasta)), 0);

const inicioDia = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const claveDia = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/* { 'AAAA-MM-DD': ms } — hora local del teléfono. */
export function porDia(turnos, ahora = Date.now()){
  const dias = {};
  for(const t of turnos) for(const x of tramos(t, ahora)){
    let a = x.desde;
    while(a < x.hasta){
      const manana = new Date(inicioDia(a)); manana.setDate(manana.getDate() + 1);   // respeta el cambio de horario
      const b = Math.min(x.hasta, manana.getTime());
      dias[claveDia(a)] = (dias[claveDia(a)] || 0) + (b - a);
      a = b;
    }
  }
  return dias;
}

/* Lunes de la semana y el 1 o 16 de la quincena, para los cortes de nómina. */
export function lunes(d = new Date()){ const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
export function quincena(d = new Date()){ const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() <= 15 ? 1 : 16); return x; }

/* ¿Se le olvidó cerrar el turno? Un turno ABIERTO desde hace más de 12 horas
   casi nunca es trabajo de verdad: es alguien que se fue a su casa sin tocar
   «Terminar turno», y esas horas se van a la nómina calladitas. Se mide por
   el reloj de pared desde que abrió, no por lo trabajado: las pausas no lo
   disculpan. */
export const TURNO_LARGO_MS = 12 * 3600000;
export const turnoLargo = (turno, ahora = Date.now()) => !!turno && !turno.fin && ahora - new Date(turno.inicio).getTime() > TURNO_LARGO_MS;

/* «7 h 25 min» · «45 min» */
export function duracion(m){
  const min = Math.round(m / 60000);
  const h = Math.floor(min / 60), r = min % 60;
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
}
