/* ligas.js — LAS LIGAS CON SUS TROFEOS (Carlos, relevo del 13 nov: «ligas con sus trofeos, como Duolingo»;
 * 14 nov: «no se ve la tabla y eso no invita a la competitividad»)
 * ===========================================================================
 * Lo leen los dos lados: el servidor (sala/servidor/estudio.js) decide quién sube y quién baja al cerrar
 * la semana, y la página pinta la tabla, las zonas y los trofeos. Sin DOM aquí: sólo datos y texto SVG.
 *
 * Las reglas (iguales en los dos lados, por eso viven aquí):
 *   · Diez ligas, de Bronce a Diamante. Todos empiezan en Bronce.
 *   · Cada semana (de lunes a domingo, hora de México) compites contra los de TU liga.
 *   · Al cerrar la semana, los primeros suben y los últimos bajan (reglasDe). Quien no estudió en toda la
 *     semana se queda donde estaba: no se le baja por no aparecer.
 *   · Si en tu liga hay más de 30, se parten en grupos de 30 (siempre los mismos para esa semana).
 *   · Al llegar a una liga por primera vez, su trofeo entra a tu vitrina; quedar en el podio también cuenta.
 * ===========================================================================*/
export const LIGAS = [
  { id: 'bronce', nombre: 'Bronce', c1: '#F0B27A', c2: '#8A4B1F', gema: '#C8763A' },
  { id: 'plata', nombre: 'Plata', c1: '#F2F5FA', c2: '#7E889A', gema: '#B9C2D0' },
  { id: 'oro', nombre: 'Oro', c1: '#FFE28A', c2: '#B9800F', gema: '#F0B429' },
  { id: 'zafiro', nombre: 'Zafiro', c1: '#9CC3FF', c2: '#1B47A8', gema: '#2F6BFF' },
  { id: 'rubi', nombre: 'Rubí', c1: '#FF9AAE', c2: '#8E0F2C', gema: '#E0244B' },
  { id: 'esmeralda', nombre: 'Esmeralda', c1: '#8EF0BF', c2: '#0E7347', gema: '#1DB36E' },
  { id: 'amatista', nombre: 'Amatista', c1: '#DDB0FF', c2: '#5E1A9E', gema: '#AC27FF' },
  { id: 'perla', nombre: 'Perla', c1: '#FFF9F2', c2: '#B7A6BA', gema: '#F3E6F0' },
  { id: 'obsidiana', nombre: 'Obsidiana', c1: '#8C7AA6', c2: '#170A26', gema: '#4A2F6B' },
  { id: 'diamante', nombre: 'Diamante', c1: '#F0FDFF', c2: '#3FAFD6', gema: '#9BE8FF' },
];
export const TAM_GRUPO = 30;
export const ligaDe = (i) => LIGAS[Math.max(0, Math.min(LIGAS.length - 1, i | 0))];

/* cuántos suben y cuántos bajan en un grupo de n que sí estudiaron */
export function reglasDe(liga, n){
  liga = liga | 0;
  let suben = liga >= LIGAS.length - 1 || n < 2 ? 0 : Math.max(1, Math.floor(n / 4));
  let bajan = liga <= 0 || n < 5 ? 0 : Math.max(1, Math.floor(n / 6));
  while(suben + bajan >= n && bajan > 0) bajan--;
  return { suben, bajan };
}

/* un número fijo por cuenta y semana: decide el grupo de 30 sin guardar nada */
function huella(t){ let h = 2166136261; for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* los de mi grupo en esta tabla (los que estudiaron y estaban en mi liga), ya ordenados */
export function grupoDe(tabla, cuenta, semana, liga = null){
  const mia = liga ?? (tabla[cuenta]?.liga | 0);
  const todos = Object.entries(tabla || {}).filter(([, f]) => (f.liga | 0) === mia && (f.xp || 0) > 0).map(([k]) => k);
  if(!todos.includes(cuenta)) todos.push(cuenta);
  let mios = todos;
  if(todos.length > TAM_GRUPO){
    const orden = [...todos].sort((a, b) => huella(a + semana) - huella(b + semana) || (a < b ? -1 : 1));
    const k = Math.floor(orden.indexOf(cuenta) / TAM_GRUPO);
    mios = orden.slice(k * TAM_GRUPO, k * TAM_GRUPO + TAM_GRUPO);
  }
  return mios.map((k) => ({ cuenta: k, xp: tabla[k]?.xp || 0, nombre: tabla[k]?.nombre || k }))
    .sort((a, b) => b.xp - a.xp || (a.cuenta < b.cuenta ? -1 : 1));
}

/* el cierre de una semana para una cuenta: en qué lugar quedó y si sube, baja o se queda */
export function resultadoSemana(tabla, cuenta, semana){
  const fila = tabla?.[cuenta];
  if(!fila || !(fila.xp > 0)) return null;
  const liga = fila.liga | 0;
  const g = grupoDe(tabla, cuenta, semana, liga);
  const lugar = g.findIndex((x) => x.cuenta === cuenta) + 1;
  const { suben, bajan } = reglasDe(liga, g.length);
  const resultado = lugar <= suben ? 'sube' : lugar > g.length - bajan ? 'baja' : 'queda';
  const nueva = resultado === 'sube' ? liga + 1 : resultado === 'baja' ? liga - 1 : liga;
  return { semana, liga, nueva, lugar, n: g.length, resultado, xp: fila.xp };
}

/* ── el trofeo, en SVG: copa con asas, base con placa y un emblema que crece con la liga
   (estrella en las tres primeras, gema de la cuarta en adelante, laureles desde Perla y corona en Diamante).
   «apagado» = el que todavía no ganas: la silueta, sin brillo. */
let sec = 0;
export function trofeoSVG(i, { tam = 64, apagado = false } = {}){
  const L = ligaDe(i), k = 'tf' + (++sec);
  const c1 = apagado ? '#3A2D4A' : L.c1, c2 = apagado ? '#241833' : L.c2, gema = apagado ? '#2E2140' : L.gema;
  const estrella = (cx, cy, r) => { let d = ''; for(let j = 0; j < 10; j++){ const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? r * .45 : r; d += (j ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } return d + 'Z'; };
  const emblema = i < 3
    ? `<path d="${estrella(50, 42, 12)}" fill="${apagado ? '#2E2140' : '#FFF8E6'}" opacity="${apagado ? 1 : .95}"/>`
    : `<path d="M50 28 L62 40 L50 58 L38 40 Z" fill="${gema}" stroke="${apagado ? '#2E2140' : '#fff'}" stroke-width="1.6" stroke-linejoin="round"/>
       <path d="M38 40 L62 40 M50 28 L46 40 L50 58 L54 40 Z" fill="none" stroke="${apagado ? '#2E2140' : '#ffffffaa'}" stroke-width="1.1" stroke-linejoin="round"/>`;
  const hoja = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="7" transform="rotate(${r} ${x} ${y})" fill="${apagado ? '#2E2140' : '#9BD27A'}"/>`;
  const laurel = i >= 7 ? [[16, 64, -30], [12, 52, -15], [12, 40, 0], [15, 28, 15], [84, 64, 30], [88, 52, 15], [88, 40, 0], [85, 28, -15]].map((h) => hoja(...h)).join('') : '';
  const corona = i >= 9 ? `<path d="M34 12 L38 2 L44 9 L50 0 L56 9 L62 2 L66 12 Z" fill="${apagado ? '#2E2140' : '#FFE28A'}" stroke="${apagado ? '#2E2140' : '#B9800F'}" stroke-width="1.2" stroke-linejoin="round"/>` : '';
  return `<svg class="trofeo" viewBox="0 0 100 120" width="${tam}" height="${Math.round(tam * 1.2)}" role="img" aria-label="Trofeo de la liga ${L.nombre}${apagado ? ' (sin ganar)' : ''}">
    <defs><linearGradient id="${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <linearGradient id="${k}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${apagado ? '#1A1124' : '#170A26'}"/></linearGradient></defs>
    ${laurel}
    <path d="M24 26 C8 26 8 52 30 56" fill="none" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
    <path d="M76 26 C92 26 92 52 70 56" fill="none" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
    <path d="M22 16 H78 C78 50 66 72 50 74 C34 72 22 50 22 16 Z" fill="url(#${k})"/>
    ${apagado ? '' : '<path d="M30 20 C30 44 36 60 44 68" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>'}
    <ellipse cx="50" cy="16" rx="28" ry="5" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
    ${emblema}
    <path d="M44 74 H56 L58 92 H42 Z" fill="url(#${k})"/>
    <rect x="28" y="92" width="44" height="22" rx="5" fill="url(#${k}b)"/>
    <rect x="36" y="98" width="28" height="9" rx="2" fill="${apagado ? '#2E2140' : c1}" opacity="${apagado ? 1 : .85}"/>
    ${corona}
  </svg>`;
}
