/* ══════════════════════════════════════════════════════════════════════════
   LIGAS · como Duolingo (relevo de Sylcred, 13 nov: «ligas con sus trofeos… cada semana los primeros suben y
   los últimos bajan»)
   ──────────────────────────────────────────────────────────────────────────
   · El ranking de la semana (est:sem:<AAAA-Snn>) guarda la liga de cada quien; cada uno compite contra los de
     SU liga.
   · La semana se cierra sola la primera vez que la cuenta aparece en una semana nueva:
       - sube el 30 % de arriba (con al menos 1 si son 2 o más; solo en su liga, con 150 XP);
       - baja el 20 % de abajo, si son 5 o más;
       - quien no estudió en toda la semana baja una;
       - subir da el trofeo de esa liga (la primera vez) y 5 cubitos; quedar primero de 3 o más da trofeo de campeón.
   · Lo que pasó se deja en `perfil.ligaAviso` para que la app lo festeje una vez.
   Sin `cloudflare:workers`: las pruebas cargan esto en Node.
   ═════════════════════════════════════════════════════════════════════════ */
export const LIGAS = [
  { id: 'bronce', nombre: 'Bronce' }, { id: 'plata', nombre: 'Plata' }, { id: 'oro', nombre: 'Oro' },
  { id: 'zafiro', nombre: 'Zafiro' }, { id: 'rubi', nombre: 'Rubí' }, { id: 'esmeralda', nombre: 'Esmeralda' },
  { id: 'amatista', nombre: 'Amatista' }, { id: 'perla', nombre: 'Perla' }, { id: 'obsidiana', nombre: 'Obsidiana' },
  { id: 'diamante', nombre: 'Diamante' },
];
const ULTIMA = LIGAS.length - 1;
export const ligaDe = (f) => (f && Number.isFinite(f.liga) ? f.liga : 0);

/* cuántos suben y cuántos bajan en un grupo de n */
export function cortes(n){
  return { sube: n >= 2 ? Math.ceil(n * .3) : 0, baja: n >= 5 ? Math.floor(n * .2) : 0 };
}
/* las filas de una liga en una semana, de más a menos XP */
export function filasDeLiga(tabla = {}, liga){
  return Object.entries(tabla).map(([cuenta, f]) => ({ cuenta, nombre: f.nombre || cuenta, xp: f.xp || 0, liga: ligaDe(f) }))
    .filter((f) => f.liga === liga).sort((a, b) => b.xp - a.xp || a.nombre.localeCompare(b.nombre));
}
export function conLiga(p){
  if(!Number.isFinite(p.liga)) p.liga = 0;
  if(!Array.isArray(p.trofeos)) p.trofeos = [];
  return p;
}
/* cierra la semana `semana` para esta cuenta (con la tabla de esa semana); regresa lo que pasó */
export function cerrarSemana(p, cuenta, tabla, semana){
  conLiga(p);
  const antes = p.liga, grupo = filasDeLiga(tabla || {}, antes), i = grupo.findIndex((f) => f.cuenta === cuenta);
  const n = grupo.length, xp = i >= 0 ? grupo[i].xp : 0;
  let { sube, baja } = cortes(n);
  if(n === 1 && xp >= 150) sube = 1;
  let despues = antes;
  if(i < 0 || xp <= 0) despues = Math.max(0, antes - 1);             /* no estudió en toda la semana */
  else if(i < sube) despues = Math.min(ULTIMA, antes + 1);
  else if(baja && i >= n - baja) despues = Math.max(0, antes - 1);
  const nuevos = [];
  if(despues > antes && !p.trofeos.some((t) => t.tipo === 'liga' && t.liga === despues)) nuevos.push({ tipo: 'liga', liga: despues, semana });
  if(i === 0 && n >= 3 && xp > 0) nuevos.push({ tipo: 'campeon', liga: antes, semana });
  p.trofeos = [...p.trofeos, ...nuevos].slice(-200);
  p.liga = despues;
  return { semana, de: antes, a: despues, puesto: i >= 0 ? i + 1 : 0, de_cuantos: n, xp, trofeos: nuevos };
}
