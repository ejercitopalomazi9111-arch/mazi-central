/* ══════════════════════════════════════════════════════════════════════════
   NOTACIÓN DE AJEDREZ · la jugada escrita como la escriben los libros
   ──────────────────────────────────────────────────────────────────────────
   san(): «Nf3», «exd5», «O-O», «e8=Q+» (la de los libros en inglés, para leer el libro de aperturas)
   es():  la misma en español para enseñarla: «Cf3», «exd5», «0-0», «e8=D+»
   deSan(): de «Nf3» a la jugada del motor (para cargar el libro)
   ═════════════════════════════════════════════════════════════════════════ */
import { ajedrez, casilla, enJaque } from './motores.js';

const LETRA_ES = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };

export function san(e, j){
  if(j.enroque) return fin(e, j, j.enroque === 'corto' ? 'O-O' : 'O-O-O');
  const p = e.b[j.de], u = p.toUpperCase(), dest = casilla(j.a);
  if(u === 'P'){
    let s = j.cap ? casilla(j.de)[0] + 'x' + dest : dest;
    if(j.p) s += '=' + j.p.toUpperCase();
    return fin(e, j, s);
  }
  /* si otra pieza igual puede ir a la misma casilla, se dice de cuál columna o fila sale */
  const otras = ajedrez.jugadas(e).filter((k) => k.a === j.a && k.de !== j.de && e.b[k.de] === p);
  let des = '';
  if(otras.length){
    const col = casilla(j.de)[0], fil = casilla(j.de)[1];
    if(!otras.some((k) => casilla(k.de)[0] === col)) des = col;
    else if(!otras.some((k) => casilla(k.de)[1] === fil)) des = fil;
    else des = col + fil;
  }
  return fin(e, j, u + des + (j.cap ? 'x' : '') + dest);
}
function fin(e, j, s){
  const n = ajedrez.aplicar(e, j, true);
  if(!enJaque(n)) return s;
  return s + (ajedrez.jugadas(n).length ? '+' : '#');
}
export function es(e, j){
  return san(e, j).replace(/^[KQRBN]/, (l) => LETRA_ES[l]).replace(/=([QRBN])/, (_, l) => '=' + LETRA_ES[l]).replace(/O/g, '0');
}
const limpia = (s) => s.replace(/[+#!?]/g, '').replace(/e\.p\./, '').trim();
export function deSan(e, s){
  const q = limpia(s);
  return ajedrez.jugadas(e).find((j) => limpia(san(e, j)) === q) || null;
}
/* «1. e4 e5 2. Nf3» → ['e2e4', 'e7e5', 'g1f3'] (null si alguna no es legal) */
export function pgnAUci(pgn){
  let e = ajedrez.inicial(); const out = [];
  for(const t of pgn.split(/\s+/)){
    if(!t || /^\d+\.+$/.test(t) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) continue;
    const j = deSan(e, t.replace(/^\d+\.+/, '')); if(!j) return null;
    out.push(ajedrez.texto(j)); e = ajedrez.aplicar(e, j, true);
  }
  return out;
}
