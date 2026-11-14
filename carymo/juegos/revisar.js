/* ¿La jugada cumple lo que pide el paso de la clase? (clases.js). Lo usan la pantalla y las pruebas. */
import { calificar } from './motores.js';

/* el nombre corto de una jugada, para compararla con la lista de la clase */
export function clave(m, j){
  if(!j) return '';
  if(m.id === 'ajedrez') return m.texto(j);
  if(m.id === 'damas') return j.ruta.join('-');
  if(m.id === 'reversi') return j.pasa ? 'pasa' : String(j.pos);
  if(m.id === 'conecta4') return String(j.col);
  if(m.id === 'domino') return j.roba ? 'roba' : j.pasa ? 'pasa' : j.ficha;
  return JSON.stringify(j);
}

const ganaCon = (m, e, j, yo) => { const n = m.aplicar(e, j); const f = m.fin(n); return !!f && f.ganador === yo; };

export function cumple(m, e, j, meta){
  const yo = m.turno(e), k = clave(m, j);
  switch(meta.tipo){
    case 'cualquiera': return true;
    case 'jugadas': return meta.jugadas.includes(k);
    case 'evita': return !meta.jugadas.includes(k);
    case 'captura': {
      if(m.id === 'damas') return j.caps.length >= (meta.caps || 1);
      return m.esCaptura(e, j);
    }
    case 'corona': { if(m.id !== 'damas') return false; const n = m.aplicar(e, j), a = j.ruta[j.ruta.length - 1]; return n.b[a] === (yo === 0 ? 'A' : 'B') && e.b[j.ruta[0]] !== n.b[a]; }
    case 'gana': return ganaCon(m, e, j, yo);
    case 'amenaza2': {
      // después de mi jugada, conteste lo que conteste el otro, yo gano en la siguiente
      const n = m.aplicar(e, j); if(m.fin(n)) return m.fin(n).ganador === yo;
      return m.jugadas(n).every((r) => { const n2 = m.aplicar(n, r); const f = m.fin(n2); if(f) return f.ganador === yo; return m.jugadas(n2).some((g) => ganaCon(m, n2, g, yo)); });
    }
    case 'mejor': {
      const cal = calificar(m, e, meta.prof || 3), mejor = Math.max(...cal.map((c) => c.v));
      const mia = cal.find((c) => m.igual(c.j, j));
      return !!mia && mia.v >= mejor - (meta.margen ?? 20);
    }
  }
  return false;
}

/* una pista: la mejor jugada que cumple (para el botón de «Pista») */
export function pista(m, e, meta){
  const js = m.jugadas(e);
  if(meta && meta.tipo !== 'mejor'){ const ok = js.filter((j) => cumple(m, e, j, meta)); if(ok.length) return ok[0]; }
  const cal = calificar(m, e, m.id === 'ajedrez' ? 2 : 3).sort((a, b) => b.v - a.v);
  return cal[0]?.j || js[0];
}
