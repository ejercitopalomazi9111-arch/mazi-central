/* ══════════════════════════════════════════════════════════════════════════
   EL ENTRENADOR DE AJEDREZ · CARYMO
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «mete un sistema para poder ver tu juego, cárgale libros de ajedrez para que sepa las jugadas,
   dónde te equivocaste, que te haga revisiones de cómo juegas… para que te pueda ayudar a mejorar».

   · El LIBRO: 3,865 aperturas con nombre (lichess-org/chess-openings, CC0) en aperturas.json. La máquina abre
     con jugadas de libro y la mesa dice qué apertura se está jugando.
   · El REPASO: cada jugada tuya contra la mejor que ve el motor; cuánto perdiste, de qué clase fue (libro, mejor,
     buena, imprecisión, error, error grave) y por qué, dicho en cristiano.
   · El PERFIL: con las partidas repasadas, tu precisión, en qué parte de la partida fallas y tu error de siempre.

   Aquí no hay pantalla: sólo cálculo (corre en el trabajador de fondo y en las pruebas de Node).
   ═════════════════════════════════════════════════════════════════════════ */
import { ajedrez, calificar, casilla } from './motores.js';
import { es } from './notacion.js';

/* ── el libro ── */
export function armarLibro(datos){
  const sig = new Map(), nombre = new Map();
  for(const [eco, n, movs] of datos){
    const m = movs.split(' ');
    nombre.set(movs, [eco, n]);
    for(let i = 0; i < m.length; i++){
      const pre = m.slice(0, i).join(' ');
      let s = sig.get(pre); if(!s){ s = new Map(); sig.set(pre, s); }
      s.set(m[i], (s.get(m[i]) || 0) + 1);
    }
  }
  return { sig, nombre, total: datos.length };
}
/* la apertura con nombre más larga que coincide con lo jugado */
export function aperturaDe(libro, movs){
  if(!libro) return null;
  for(let i = movs.length; i > 0; i--){ const n = libro.nombre.get(movs.slice(0, i).join(' ')); if(n) return { eco: n[0], nombre: n[1], hasta: i }; }
  return null;
}
/* hasta qué jugada se siguió el libro */
export function enLibroHasta(libro, movs){
  if(!libro) return 0;
  let i = 0; while(i < movs.length && libro.sig.get(movs.slice(0, i).join(' '))?.has(movs[i])) i++;
  return i;
}
/* una jugada de libro para esta posición (las más jugadas salen más), o null si ya se salió */
export function deLibro(libro, movs, rnd = Math.random){
  const s = libro && libro.sig.get(movs.join(' ')); if(!s || !s.size) return null;
  const tot = [...s.values()].reduce((a, b) => a + b, 0); let r = rnd() * tot;
  for(const [m, n] of s){ r -= n; if(r <= 0) return m; }
  return [...s.keys()][0];
}

/* ── el repaso ── */
const GANA = 9e6, TOPE = 2000;
const acotar = (v) => v >= GANA ? TOPE + (v - 1e7) : v <= -GANA ? -TOPE - (-1e7 - v) : Math.max(-TOPE + 1, Math.min(TOPE - 1, v));
const NOMBRE = { P: 'peón', N: 'caballo', B: 'alfil', R: 'torre', Q: 'dama', K: 'rey' };
const VALOR = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const pieza = (p) => NOMBRE[p.toUpperCase()];
const ella = (p) => 'QR'.includes(p.toUpperCase());
export const CLASES = {
  libro: { nombre: 'De libro', color: '#A88B6A' }, mejor: { nombre: 'La mejor', color: '#3FCB8A' }, buena: { nombre: 'Buena', color: '#7FD6A8' },
  imprecision: { nombre: 'Imprecisión', color: '#F2B544' }, error: { nombre: 'Error', color: '#FF9A62' }, grave: { nombre: 'Error grave', color: '#F0566E' },
};
function fase(e, ply){
  if(ply < 20) return 'apertura';
  const fuertes = e.b.filter((p) => p && !'PpKk'.includes(p)).length;
  return fuertes <= 6 ? 'final' : 'medio';
}
/* estados: la posición ANTES de cada jugada; movs: las jugadas («e2e4»); yo: 0 blancas, 1 negras */
export function analizar(estados, movs, yo, { libroHasta = 0, prof = 2 } = {}){
  const out = [];
  for(let i = 0; i < movs.length; i++){
    const e = estados[i]; if(ajedrez.turno(e) !== yo) continue;
    const jugada = ajedrez.jugadas(e).find((j) => ajedrez.texto(j) === movs[i]); if(!jugada) continue;
    const r = { i, uci: movs[i], es: es(e, jugada), fase: fase(e, i) };
    if(i < libroHasta){ out.push({ ...r, clase: 'libro', perdida: 0, nota: 'Jugada de libro: así la juegan los maestros.' }); continue; }
    const cal = calificar(ajedrez, e, prof).sort((a, b) => b.v - a.v);
    const mejor = cal[0], hecha = cal.find((c) => ajedrez.igual(c.j, jugada)) || mejor;
    const vm = acotar(mejor.v), vh = acotar(hecha.v), perdida = Math.max(0, vm - vh);
    r.perdida = perdida; r.mejorUci = ajedrez.texto(mejor.j); r.mejorEs = es(e, mejor.j);
    const igual = ajedrez.igual(mejor.j, jugada) || perdida <= 12;
    r.clase = igual ? 'mejor' : perdida <= 60 ? 'buena' : perdida <= 150 ? 'imprecision' : perdida <= 350 ? 'error' : 'grave';
    r.tema = null;
    /* por qué, en cristiano */
    if(mejor.v >= GANA && hecha.v < GANA){ r.nota = `Había mate: ${r.mejorEs}.`; r.tema = 'mate'; }
    else if(hecha.v <= -GANA){ r.nota = 'Esta jugada deja que te den mate.'; r.tema = 'mateRecibido'; }
    else if(r.clase === 'mejor') r.nota = ajedrez.igual(mejor.j, jugada) ? 'La mejor jugada.' : 'Tan buena como la mejor.';
    else if(r.clase === 'buena') r.nota = `Buena. También servía ${r.mejorEs}.`;
    else {
      const n = ajedrez.aplicar(e, jugada, true);
      const resp = calificar(ajedrez, n, 1).sort((a, b) => b.v - a.v)[0];
      const comida = resp && resp.j.cap && n.b[resp.j.a] ? n.b[resp.j.a] : null;
      if(comida && VALOR[comida.toUpperCase()] >= 3 && perdida >= 150){
        r.nota = `Tu ${pieza(comida)} quedó sin defensa en ${casilla(resp.j.a)}: te ${ella(comida) ? 'la' : 'lo'} come con ${es(n, resp.j)}.`; r.tema = 'colgada';
      } else if(mejor.j.cap && e.b[mejor.j.a] && VALOR[e.b[mejor.j.a].toUpperCase()] >= 1){
        const q = e.b[mejor.j.a];
        r.nota = `Podías comer ${q.toUpperCase() === 'P' ? 'un peón' : (ella(q) ? 'la ' : 'el ') + pieza(q)} en ${casilla(mejor.j.a)} con ${r.mejorEs}.`; r.tema = 'captura';
      } else { r.nota = `Era mejor ${r.mejorEs}.`; r.tema = 'posicion'; }
    }
    out.push(r);
  }
  return out;
}
/* precisión: 100 si no perdiste nada; baja rápido con los errores grandes */
const exacta = (p) => 100 * Math.exp(-p / 170);
export function resumen(an){
  const cuenta = Object.fromEntries(Object.keys(CLASES).map((k) => [k, 0]));
  const fases = {}, temas = {};
  for(const r of an){
    cuenta[r.clase]++;
    (fases[r.fase] ||= []).push(exacta(r.perdida || 0));
    if(r.tema && r.clase !== 'mejor' && r.clase !== 'buena' || r.tema === 'mate') temas[r.tema] = (temas[r.tema] || 0) + 1;
  }
  const prom = (xs) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  return { precision: prom(an.map((r) => exacta(r.perdida || 0))) ?? 100, cuenta, fases: Object.fromEntries(Object.entries(fases).map(([k, v]) => [k, prom(v)])), temas, jugadas: an.length };
}

/* ── el perfil: lo que dicen tus partidas repasadas ── */
const CONSEJO = {
  colgada: { error: 'dejar piezas sin defensa', consejo: 'Antes de soltar una pieza, pregúntate: ¿quién la cuida en su casilla nueva?' },
  captura: { error: 'no comer lo que te regalan', consejo: 'En cada turno, revisa primero si el rival dejó algo sin defensa.' },
  mate: { error: 'no ver el mate', consejo: 'Busca siempre jaques: a veces el mate está a una jugada.' },
  mateRecibido: { error: 'descuidar a tu rey', consejo: 'Enroca temprano y no muevas los peones de enfrente de tu rey sin razón.' },
  posicion: { error: 'jugadas sin plan', consejo: 'Saca caballos y alfiles, controla el centro y enroca antes de atacar.' },
};
const FASE = { apertura: 'la apertura', medio: 'el medio juego', final: 'el final' };
export function perfil(repasos){
  const rs = (repasos || []).filter((r) => r && r.resumen);
  if(!rs.length) return null;
  const prec = Math.round(rs.reduce((a, r) => a + r.resumen.precision, 0) / rs.length);
  const fases = {}, temas = {}, aperturas = {};
  for(const r of rs){
    for(const [f, v] of Object.entries(r.resumen.fases || {})) if(v != null) (fases[f] ||= []).push(v);
    for(const [t, n] of Object.entries(r.resumen.temas || {})) temas[t] = (temas[t] || 0) + n;
    if(r.apertura) aperturas[r.apertura] = (aperturas[r.apertura] || 0) + 1;
  }
  const promF = Object.entries(fases).map(([f, v]) => [f, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]).sort((a, b) => a[1] - b[1]);
  const tema = Object.entries(temas).sort((a, b) => b[1] - a[1])[0];
  const ap = Object.entries(aperturas).sort((a, b) => b[1] - a[1])[0];
  const ultimas = rs.slice(-5).map((r) => r.resumen.precision), antes = rs.slice(-10, -5).map((r) => r.resumen.precision);
  const tendencia = antes.length >= 2 ? Math.round(ultimas.reduce((a, b) => a + b, 0) / ultimas.length - antes.reduce((a, b) => a + b, 0) / antes.length) : null;
  return {
    partidas: rs.length, precision: prec, tendencia,
    peorFase: promF.length > 1 ? { fase: promF[0][0], nombre: FASE[promF[0][0]], precision: promF[0][1] } : null,
    error: tema ? { tema: tema[0], veces: tema[1], ...CONSEJO[tema[0]] } : null,
    apertura: ap ? { nombre: ap[0], veces: ap[1] } : null,
    nivel: prec >= 85 ? 'Fuerte' : prec >= 70 ? 'Sólido' : prec >= 50 ? 'En camino' : 'Empezando',
  };
}
