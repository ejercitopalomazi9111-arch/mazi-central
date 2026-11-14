/* ══════════════════════════════════════════════════════════════════════════
   JUEGOS DE MESA DE CARYMO · las reglas, sin pantalla
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «faltan clases de juegos de mesa como ajedrez, dominó, damas,
   reversi, Conecta 4… las de estrategia más que nada… deben permitirte
   jugarlos, porque uno aprende jugando… y competir contra otros jugadores que
   estén en la aplicación o contra tus amigos».

   Este archivo lo usan los DOS lados: el teléfono (para pintar y para la
   máquina) y el servidor de La Sala (para revisar que cada jugada en línea sea
   legal). Por eso no toca el DOM ni guarda nada: todo es estado → estado.

   Cada motor tiene:
     inicial(op)            → estado nuevo (op.semilla para el dominó)
     turno(e)               → 0 o 1 (a quién le toca)
     jugadas(e)             → las jugadas legales de quien tiene el turno
     aplicar(e, j)          → estado nuevo (no cambia e)
     fin(e)                 → null, o { ganador: 0 | 1 | null, motivo, puntos? }
     evaluar(e, yo)         → qué tan bien va «yo» (para la máquina)
     igual(a, b)            → si dos jugadas son la misma
     vista(e, yo)           → lo que ese jugador puede ver (el dominó esconde fichas)
   y elegir(motor, e, nivel) escoge la jugada de la máquina (fácil, medio, difícil).
   ═════════════════════════════════════════════════════════════════════════ */

const copia = (o) => JSON.parse(JSON.stringify(o));

/* ── azar con semilla (el dominó tiene que repartir igual en el teléfono y en el servidor) ── */
export function azar(s){
  let a = s >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ═══════════════════════════════ AJEDREZ ═══════════════════════════════ */
/* tablero de 64: índice = fila*8 + columna, fila 0 = la 8 (arriba), columna 0 = la a.
   Blancas en mayúscula (PNBRQK), negras en minúscula, '' vacía. */
const ARCHIVOS = 'abcdefgh';
export const casilla = (i) => ARCHIVOS[i % 8] + (8 - Math.floor(i / 8));
export const indice = (s) => (8 - +s[1]) * 8 + ARCHIVOS.indexOf(s[0]);
const blanca = (p) => p && p === p.toUpperCase();
const delColor = (p, w) => p && (w ? blanca(p) : !blanca(p));
const DIR = { N: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], B: [[-1, -1], [-1, 1], [1, -1], [1, 1]], R: [[-1, 0], [1, 0], [0, -1], [0, 1]] };
DIR.Q = DIR.K = [...DIR.B, ...DIR.R];

export function deFEN(fen){
  const [pos, t, c, ep, hm, fm] = fen.trim().split(/\s+/);
  const b = [];
  for(const ch of pos.replace(/\//g, '')){ if(/\d/.test(ch)) for(let k = 0; k < +ch; k++) b.push(''); else b.push(ch); }
  return { juego: 'ajedrez', b, t: t || 'w', c: c && c !== '-' ? c : '', ep: ep && ep !== '-' ? indice(ep) : -1, hm: +hm || 0, fm: +fm || 1, rep: {} };
}
export function aFEN(e){
  let s = '';
  for(let f = 0; f < 8; f++){ let v = 0; for(let c = 0; c < 8; c++){ const p = e.b[f * 8 + c]; if(!p) v++; else { if(v){ s += v; v = 0; } s += p; } } if(v) s += v; if(f < 7) s += '/'; }
  return `${s} ${e.t} ${e.c || '-'} ${e.ep >= 0 ? casilla(e.ep) : '-'} ${e.hm} ${e.fm}`;
}
const claveAj = (e) => aFEN(e).split(' ').slice(0, 4).join(' ');

function atacada(b, i, porBlancas){
  const f = Math.floor(i / 8), c = i % 8;
  // peones
  const df = porBlancas ? 1 : -1, peon = porBlancas ? 'P' : 'p';
  for(const dc of [-1, 1]){ const ff = f + df, cc = c + dc; if(ff >= 0 && ff < 8 && cc >= 0 && cc < 8 && b[ff * 8 + cc] === peon) return true; }
  for(const [a, d] of DIR.N){ const ff = f + a, cc = c + d; if(ff >= 0 && ff < 8 && cc >= 0 && cc < 8 && b[ff * 8 + cc] === (porBlancas ? 'N' : 'n')) return true; }
  for(const [a, d] of DIR.K){ const ff = f + a, cc = c + d; if(ff >= 0 && ff < 8 && cc >= 0 && cc < 8 && b[ff * 8 + cc] === (porBlancas ? 'K' : 'k')) return true; }
  for(const [tipo, dirs] of [['B', DIR.B], ['R', DIR.R]]){
    for(const [a, d] of dirs){
      let ff = f + a, cc = c + d;
      while(ff >= 0 && ff < 8 && cc >= 0 && cc < 8){
        const p = b[ff * 8 + cc];
        if(p){ if(delColor(p, porBlancas)){ const u = p.toUpperCase(); if(u === tipo || u === 'Q') return true; } break; }
        ff += a; cc += d;
      }
    }
  }
  return false;
}
export function enJaque(e, w = e.t === 'w'){ const r = e.b.indexOf(w ? 'K' : 'k'); return r >= 0 && atacada(e.b, r, !w); }

function pseudo(e){
  const out = [], w = e.t === 'w', b = e.b;
  for(let i = 0; i < 64; i++){
    const p = b[i]; if(!delColor(p, w)) continue;
    const u = p.toUpperCase(), f = Math.floor(i / 8), c = i % 8;
    if(u === 'P'){
      const df = w ? -1 : 1, ini = w ? 6 : 1, ult = w ? 0 : 7;
      const pon = (a, cap, ep) => { if(Math.floor(a / 8) === ult) for(const pr of 'qrbn') out.push({ de: i, a, p: pr, cap }); else out.push({ de: i, a, cap, ep }); };
      const a1 = i + df * 8;
      if(a1 >= 0 && a1 < 64 && !b[a1]){ pon(a1, false); const a2 = i + df * 16; if(f === ini && !b[a2]) out.push({ de: i, a: a2, dos: true }); }
      for(const dc of [-1, 1]){ const cc = c + dc, ff = f + df; if(cc < 0 || cc > 7 || ff < 0 || ff > 7) continue; const a = ff * 8 + cc;
        if(b[a] && !delColor(b[a], w)) pon(a, true); else if(a === e.ep) pon(a, true, true); }
      continue;
    }
    if(u === 'N' || u === 'K'){
      for(const [a0, d] of DIR[u]){ const ff = f + a0, cc = c + d; if(ff < 0 || ff > 7 || cc < 0 || cc > 7) continue; const a = ff * 8 + cc;
        if(!delColor(b[a], w)) out.push({ de: i, a, cap: !!b[a] }); }
      if(u === 'K'){
        const fila = w ? 7 : 0, k = fila * 8 + 4;
        if(i === k && !atacada(b, k, !w)){
          if(e.c.includes(w ? 'K' : 'k') && !b[k + 1] && !b[k + 2] && b[k + 3] === (w ? 'R' : 'r') && !atacada(b, k + 1, !w) && !atacada(b, k + 2, !w)) out.push({ de: k, a: k + 2, enroque: 'corto' });
          if(e.c.includes(w ? 'Q' : 'q') && !b[k - 1] && !b[k - 2] && !b[k - 3] && b[k - 4] === (w ? 'R' : 'r') && !atacada(b, k - 1, !w) && !atacada(b, k - 2, !w)) out.push({ de: k, a: k - 2, enroque: 'largo' });
        }
      }
      continue;
    }
    for(const [a0, d] of DIR[u]){
      let ff = f + a0, cc = c + d;
      while(ff >= 0 && ff < 8 && cc >= 0 && cc < 8){ const a = ff * 8 + cc; if(b[a]){ if(!delColor(b[a], w)) out.push({ de: i, a, cap: true }); break; } out.push({ de: i, a, cap: false }); ff += a0; cc += d; }
    }
  }
  return out;
}
function aplicarAj(e, j, sinRep){
  const n = { ...e, b: e.b.slice(), rep: sinRep ? e.rep : { ...e.rep } }, b = n.b, w = e.t === 'w';
  const p = b[j.de];
  b[j.a] = j.p ? (w ? j.p.toUpperCase() : j.p) : p; b[j.de] = '';
  if(j.ep) b[j.a + (w ? 8 : -8)] = '';
  if(j.enroque === 'corto'){ b[j.a - 1] = b[j.a + 1]; b[j.a + 1] = ''; }
  if(j.enroque === 'largo'){ b[j.a + 1] = b[j.a - 2]; b[j.a - 2] = ''; }
  let c = n.c;
  if(p === 'K') c = c.replace(/[KQ]/g, ''); if(p === 'k') c = c.replace(/[kq]/g, '');
  for(const [sq, l] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if(j.de === sq || j.a === sq) c = c.replace(l, '');
  n.c = c; n.ep = j.dos ? (j.de + j.a) / 2 : -1;
  n.hm = (p.toUpperCase() === 'P' || j.cap) ? 0 : e.hm + 1;
  if(!w) n.fm = e.fm + 1;
  n.t = w ? 'b' : 'w';
  if(!sinRep){ const k = claveAj(n); n.rep[k] = (n.rep[k] || 0) + 1; }
  n.ult = { de: j.de, a: j.a };
  return n;
}
function legalesAj(e){ return pseudo(e).filter((j) => !enJaque(aplicarAj(e, j, true), e.t === 'w')); }
function materialBasta(b){
  const resto = b.filter((p) => p && p.toUpperCase() !== 'K');
  if(!resto.length) return false;
  if(resto.length === 1 && 'NBnb'.includes(resto[0])) return false;
  return true;
}
const VALOR = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
/* tablas de posición (de las blancas, fila 0 arriba): premian el centro y el desarrollo */
const PST = {
  P: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  K: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};
export const ajedrez = {
  id: 'ajedrez', nombre: 'Ajedrez',
  inicial: () => deFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
  turno: (e) => (e.t === 'w' ? 0 : 1),
  jugadas: legalesAj,
  aplicar: (e, j, sinRep) => aplicarAj(e, j, sinRep),
  fin(e){
    const js = legalesAj(e);
    if(!js.length) return enJaque(e) ? { ganador: e.t === 'w' ? 1 : 0, motivo: 'jaque mate' } : { ganador: null, motivo: 'ahogado' };
    if(e.hm >= 100) return { ganador: null, motivo: '50 jugadas sin captura' };
    if(!materialBasta(e.b)) return { ganador: null, motivo: 'no alcanza para dar mate' };
    if(Object.values(e.rep || {}).some((v) => v >= 3)) return { ganador: null, motivo: 'triple repetición' };
    return null;
  },
  evaluar(e, yo){
    let s = 0;
    for(let i = 0; i < 64; i++){ const p = e.b[i]; if(!p) continue; const u = p.toUpperCase(), w = blanca(p);
      const v = VALOR[u] + PST[u][w ? i : (7 - Math.floor(i / 8)) * 8 + (i % 8)]; s += w ? v : -v; }
    return yo === 0 ? s : -s;
  },
  igual: (a, b) => a.de === b.de && a.a === b.a && (a.p || '') === (b.p || ''),
  vista: (e) => e,
  /* «e2e4», «e7e8q» */
  texto: (j) => casilla(j.de) + casilla(j.a) + (j.p || ''),
  deTexto: (s) => ({ de: indice(s.slice(0, 2)), a: indice(s.slice(2, 4)), p: s[4] }),
  esCaptura: (e, j) => !!j.cap,
  ordenar: (e, js) => js.sort((x, y) => (y.cap ? VALOR[(e.b[y.a] || 'p').toUpperCase()] * 10 - VALOR[e.b[y.de].toUpperCase()] : 0) + (y.p ? 800 : 0) - ((x.cap ? VALOR[(e.b[x.a] || 'p').toUpperCase()] * 10 - VALOR[e.b[x.de].toUpperCase()] : 0) + (x.p ? 800 : 0))),
};

/* ═══════════════════════════════ DAMAS ═══════════════════════════════
   Las de torneo en América (damas inglesas): las fichas avanzan y capturan sólo hacia
   adelante, la dama se mueve una casilla en cualquier diagonal, comer es obligatorio y
   se sigue comiendo mientras se pueda. Jugador 0 (claras) abajo, sube; jugador 1 arriba, baja.
   'a' ficha del 0, 'A' dama del 0, 'b' ficha del 1, 'B' dama del 1. */
const deJ = (p, j) => p && (j === 0 ? 'aA' : 'bB').includes(p);
export const damas = {
  id: 'damas', nombre: 'Damas',
  inicial(){
    const b = Array(64).fill('');
    for(let i = 0; i < 64; i++){ const f = Math.floor(i / 8), c = i % 8; if((f + c) % 2 === 1){ if(f < 3) b[i] = 'b'; else if(f > 4) b[i] = 'a'; } }
    return { juego: 'damas', b, t: 0, sin: 0 };
  },
  turno: (e) => e.t,
  jugadas(e){
    const b = e.b, j = e.t, saltos = [], pasos = [];
    for(let i = 0; i < 64; i++){
      const p = b[i]; if(!deJ(p, j)) continue;
      const dama = p === p.toUpperCase();
      const dirs = dama ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : (j === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
      // pasos simples
      for(const [df, dc] of dirs){ const f = Math.floor(i / 8) + df, c = i % 8 + dc; if(f >= 0 && f < 8 && c >= 0 && c < 8 && !b[f * 8 + c]) pasos.push({ ruta: [i, f * 8 + c], caps: [] }); }
      // saltos en cadena
      const busca = (pos, tab, ruta, caps, esDama) => {
        let siguio = false;
        const ds = esDama ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : (j === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
        for(const [df, dc] of ds){
          const f = Math.floor(pos / 8), c = pos % 8, m = (f + df) * 8 + c + dc, f2 = f + 2 * df, c2 = c + 2 * dc;
          if(f2 < 0 || f2 > 7 || c2 < 0 || c2 > 7) continue;
          const a = f2 * 8 + c2;
          if(tab[m] && deJ(tab[m], 1 - j) && !tab[a]){
            siguio = true;
            const t2 = tab.slice(); t2[a] = t2[pos]; t2[pos] = ''; t2[m] = '';
            const corona = !esDama && (j === 0 ? f2 === 0 : f2 === 7);
            if(corona) saltos.push({ ruta: [...ruta, a], caps: [...caps, m] });
            else busca(a, t2, [...ruta, a], [...caps, m], esDama);
          }
        }
        if(!siguio && caps.length) saltos.push({ ruta, caps });
      };
      busca(i, b, [i], [], dama);
    }
    return saltos.length ? saltos : pasos;
  },
  aplicar(e, jg){
    const b = e.b.slice(), de = jg.ruta[0], a = jg.ruta[jg.ruta.length - 1], p = b[de];
    b[de] = ''; for(const m of jg.caps) b[m] = '';
    const f = Math.floor(a / 8); b[a] = (e.t === 0 && f === 0) ? 'A' : (e.t === 1 && f === 7) ? 'B' : p;
    const avance = jg.caps.length || p === p.toLowerCase();
    return { ...e, b, t: 1 - e.t, sin: avance ? 0 : e.sin + 1, ult: { ruta: jg.ruta, caps: jg.caps } };
  },
  fin(e){
    if(!this.jugadas(e).length) return { ganador: 1 - e.t, motivo: e.b.some((p) => deJ(p, e.t)) ? 'se quedó sin jugadas' : 'se quedó sin fichas' };
    if(e.sin >= 80) return { ganador: null, motivo: '40 jugadas sin comer ni avanzar' };
    return null;
  },
  evaluar(e, yo){
    let s = 0;
    for(let i = 0; i < 64; i++){ const p = e.b[i]; if(!p) continue; const f = Math.floor(i / 8), c = i % 8;
      const dueño = deJ(p, 0) ? 0 : 1, dama = p === p.toUpperCase();
      let v = dama ? 175 : 100;
      if(!dama) v += (dueño === 0 ? 7 - f : f) * 4;                   // avanzar
      if(c >= 2 && c <= 5 && f >= 2 && f <= 5) v += 6;                // centro
      if(!dama && (dueño === 0 ? f === 7 : f === 0)) v += 8;          // la fila de atrás cuida la coronación
      s += dueño === yo ? v : -v; }
    return s;
  },
  igual: (a, b) => a.ruta.join() === b.ruta.join(),
  vista: (e) => e,
  esCaptura: (e, j) => j.caps.length > 0,
  ordenar: (e, js) => js.sort((x, y) => y.caps.length - x.caps.length),
};

/* ═══════════════════════════════ REVERSI ═══════════════════════════════
   Jugador 0 = negras (empiezan), 1 = blancas. Se voltean las fichas encerradas; si no puedes
   jugar, pasas; se acaba cuando nadie puede. Gana quien tenga más. */
const R8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
function volteos(b, i, j){
  if(b[i] !== null) return [];
  const f0 = Math.floor(i / 8), c0 = i % 8, out = [];
  for(const [df, dc] of R8){
    const linea = []; let f = f0 + df, c = c0 + dc;
    while(f >= 0 && f < 8 && c >= 0 && c < 8 && b[f * 8 + c] === 1 - j){ linea.push(f * 8 + c); f += df; c += dc; }
    if(linea.length && f >= 0 && f < 8 && c >= 0 && c < 8 && b[f * 8 + c] === j) out.push(...linea);
  }
  return out;
}
const PESO_R = [100,-20,10,5,5,10,-20,100, -20,-50,-2,-2,-2,-2,-50,-20, 10,-2,-1,-1,-1,-1,-2,10, 5,-2,-1,-1,-1,-1,-2,5, 5,-2,-1,-1,-1,-1,-2,5, 10,-2,-1,-1,-1,-1,-2,10, -20,-50,-2,-2,-2,-2,-50,-20, 100,-20,10,5,5,10,-20,100];
export const reversi = {
  id: 'reversi', nombre: 'Reversi',
  inicial(){ const b = Array(64).fill(null); b[27] = 1; b[36] = 1; b[28] = 0; b[35] = 0; return { juego: 'reversi', b, t: 0, pasos: 0 }; },
  turno: (e) => e.t,
  jugadas(e){
    const js = []; for(let i = 0; i < 64; i++) if(volteos(e.b, i, e.t).length) js.push({ pos: i });
    if(js.length) return js;
    // ¿el otro sí puede? entonces éste pasa
    for(let i = 0; i < 64; i++) if(volteos(e.b, i, 1 - e.t).length) return [{ pasa: true }];
    return [];
  },
  aplicar(e, j){
    if(j.pasa) return { ...e, t: 1 - e.t, pasos: e.pasos + 1, ult: null };
    const b = e.b.slice(), v = volteos(b, j.pos, e.t);
    b[j.pos] = e.t; for(const k of v) b[k] = e.t;
    return { ...e, b, t: 1 - e.t, pasos: 0, ult: { pos: j.pos, volteo: v } };
  },
  cuenta: (e) => [e.b.filter((x) => x === 0).length, e.b.filter((x) => x === 1).length],
  fin(e){
    if(this.jugadas(e).length) return null;
    const [n0, n1] = this.cuenta(e);
    return { ganador: n0 === n1 ? null : n0 > n1 ? 0 : 1, motivo: `${n0} a ${n1}`, puntos: [n0, n1] };
  },
  evaluar(e, yo){
    let s = 0, mias = 0, suyas = 0;
    for(let i = 0; i < 64; i++){ if(e.b[i] === yo){ s += PESO_R[i]; mias++; } else if(e.b[i] === 1 - yo){ s -= PESO_R[i]; suyas++; } }
    const vacias = 64 - mias - suyas;
    if(vacias < 12) s += (mias - suyas) * 8;                         // al final, lo que cuenta son las fichas
    // movilidad: tener más jugadas que el otro
    let m1 = 0, m2 = 0; for(let i = 0; i < 64; i++){ if(volteos(e.b, i, yo).length) m1++; if(volteos(e.b, i, 1 - yo).length) m2++; }
    return s + (m1 - m2) * 5;
  },
  igual: (a, b) => (a.pasa && b.pasa) || a.pos === b.pos,
  vista: (e) => e,
  esCaptura: () => false,
  ordenar: (e, js) => js.sort((x, y) => (PESO_R[y.pos] ?? 0) - (PESO_R[x.pos] ?? 0)),
  volteos,
};

/* ═══════════════════════════════ CONECTA 4 ═══════════════════════════════
   7 columnas × 6 filas; la ficha cae hasta abajo. Fila 0 = arriba. */
function linea4(b, j){
  for(let f = 0; f < 6; f++) for(let c = 0; c < 7; c++){
    if(b[f * 7 + c] !== j) continue;
    for(const [df, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]){
      const cs = [f * 7 + c]; let ok = true;
      for(let k = 1; k < 4; k++){ const ff = f + df * k, cc = c + dc * k; if(ff < 0 || ff > 5 || cc < 0 || cc > 6 || b[ff * 7 + cc] !== j){ ok = false; break; } cs.push(ff * 7 + cc); }
      if(ok) return cs;
    }
  }
  return null;
}
export const conecta4 = {
  id: 'conecta4', nombre: 'Conecta 4',
  inicial: () => ({ juego: 'conecta4', b: Array(42).fill(null), t: 0 }),
  turno: (e) => e.t,
  jugadas(e){ if(linea4(e.b, 0) || linea4(e.b, 1)) return []; const js = []; for(const c of [3, 2, 4, 1, 5, 0, 6]) if(e.b[c] === null) js.push({ col: c }); return js; },
  aplicar(e, j){ const b = e.b.slice(); let f = 5; while(b[f * 7 + j.col] !== null) f--; b[f * 7 + j.col] = e.t; return { ...e, b, t: 1 - e.t, ult: { pos: f * 7 + j.col } }; },
  fin(e){
    for(const j of [0, 1]){ const l = linea4(e.b, j); if(l) return { ganador: j, motivo: 'cuatro en línea', linea: l }; }
    if(e.b.every((x) => x !== null)) return { ganador: null, motivo: 'tablero lleno' };
    return null;
  },
  evaluar(e, yo){
    const b = e.b; let s = 0;
    const ventana = (cs) => { let m = 0, o = 0; for(const k of cs){ if(b[k] === yo) m++; else if(b[k] === 1 - yo) o++; }
      if(m && o) return 0; if(m === 4) return 100000; if(o === 4) return -100000;
      return m === 3 ? 50 : m === 2 ? 8 : o === 3 ? -60 : o === 2 ? -8 : 0; };
    for(let f = 0; f < 6; f++) for(let c = 0; c < 7; c++) for(const [df, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]){
      const cs = []; for(let k = 0; k < 4; k++){ const ff = f + df * k, cc = c + dc * k; if(ff < 0 || ff > 5 || cc < 0 || cc > 6) break; cs.push(ff * 7 + cc); }
      if(cs.length === 4) s += ventana(cs);
    }
    for(let f = 0; f < 6; f++){ if(b[f * 7 + 3] === yo) s += 6; else if(b[f * 7 + 3] === 1 - yo) s -= 6; }   // la columna del centro vale más
    return s;
  },
  igual: (a, b) => a.col === b.col,
  vista: (e) => e,
  esCaptura: () => false,
  ordenar: (e, js) => js,
  linea4,
};

/* ═══════════════════════════════ DOMINÓ ═══════════════════════════════
   Doble seis, dos jugadores, 7 fichas cada quien; el resto es el pozo. Empieza quien tenga la
   mula más alta. Si no puedes poner, robas del pozo hasta poder; si ya no hay pozo, pasas.
   Gana quien se quede sin fichas (se lleva los puntos del otro). Si se tranca, gana quien
   tenga menos puntos en la mano. */
const fichaTxt = (f) => f[0] + '-' + f[1];
const suma = (m) => m.reduce((s, f) => s + f[0] + f[1], 0);
export const domino = {
  id: 'domino', nombre: 'Dominó',
  inicial(op = {}){
    const semilla = op.semilla ?? Math.floor(Math.random() * 2 ** 31), r = azar(semilla), todas = [];
    for(let a = 0; a <= 6; a++) for(let b = a; b <= 6; b++) todas.push([a, b]);
    for(let i = todas.length - 1; i > 0; i--){ const k = Math.floor(r() * (i + 1)); [todas[i], todas[k]] = [todas[k], todas[i]]; }
    const manos = [todas.slice(0, 7), todas.slice(7, 14)], pozo = todas.slice(14);
    // empieza la mula más alta (si nadie tiene mula, la ficha más pesada)
    let t = 0, mejor = -1;
    for(const j of [0, 1]) for(const f of manos[j]){ const v = f[0] === f[1] ? 100 + f[0] : f[0] + f[1]; if(v > mejor){ mejor = v; t = j; } }
    return { juego: 'domino', manos, pozo, mesa: [], t, pasos: 0, semilla, robadas: [0, 0], nopuede: [[], []] };
  },
  turno: (e) => e.t,
  extremos: (e) => (e.mesa.length ? [e.mesa[0][0], e.mesa[e.mesa.length - 1][1]] : null),
  jugadas(e){
    if(this.finRonda(e)) return [];
    const m = e.manos[e.t], x = this.extremos(e), js = [];
    for(const f of m){
      if(!x){ js.push({ ficha: fichaTxt(f), lado: 'der' }); continue; }
      if(f[0] === x[0] || f[1] === x[0]) js.push({ ficha: fichaTxt(f), lado: 'izq' });
      if((f[0] === x[1] || f[1] === x[1]) && !(x[0] === x[1] && js.some((k) => k.ficha === fichaTxt(f)))) js.push({ ficha: fichaTxt(f), lado: 'der' });
    }
    if(js.length) return js;
    return e.pozo.length ? [{ roba: true }] : [{ pasa: true }];
  },
  aplicar(e, j){
    const n = copia(e);
    if(j.roba){ n.manos[n.t].push(n.pozo.shift()); n.robadas[n.t]++; const x = this.extremos(e); if(x) n.nopuede[n.t] = [...new Set([...n.nopuede[n.t], ...x])]; n.ult = { roba: true, quien: e.t }; return n; }
    if(j.pasa){ n.t = 1 - n.t; n.pasos++; n.ult = { pasa: true, quien: e.t }; return n; }
    const m = n.manos[n.t], k = m.findIndex((f) => fichaTxt(f) === j.ficha), f = m.splice(k, 1)[0];
    if(!n.mesa.length) n.mesa.push(f);
    else if(j.lado === 'izq'){ const x = n.mesa[0][0]; n.mesa.unshift(f[1] === x ? [f[0], f[1]] : [f[1], f[0]]); }
    else { const x = n.mesa[n.mesa.length - 1][1]; n.mesa.push(f[0] === x ? [f[0], f[1]] : [f[1], f[0]]); }
    n.pasos = 0; n.ult = { ficha: j.ficha, lado: j.lado, quien: e.t }; n.t = 1 - n.t;
    return n;
  },
  finRonda(e){ return !e.manos[0].length || !e.manos[1].length || e.pasos >= 2; },
  fin(e){
    if(!this.finRonda(e)) return null;
    const s = [suma(e.manos[0]), suma(e.manos[1])];
    if(!e.manos[0].length) return { ganador: 0, motivo: 'se quedó sin fichas', puntos: [s[1], 0] };
    if(!e.manos[1].length) return { ganador: 1, motivo: 'se quedó sin fichas', puntos: [0, s[0]] };
    if(s[0] === s[1]) return { ganador: null, motivo: 'se trancó con los mismos puntos', puntos: [0, 0] };
    const g = s[0] < s[1] ? 0 : 1;
    return { ganador: g, motivo: 'se trancó: gana quien tiene menos puntos', puntos: g === 0 ? [s[1], 0] : [0, s[0]] };
  },
  evaluar(e, yo){ return suma(e.manos[1 - yo]) - suma(e.manos[yo]) + (e.manos[1 - yo].length - e.manos[yo].length) * 12; },
  igual: (a, b) => (a.roba && b.roba) || (a.pasa && b.pasa) || (a.ficha === b.ficha && a.lado === b.lado),
  /* lo que ve cada quien: tu mano, cuántas tiene el otro y cuántas quedan en el pozo */
  vista(e, yo){ const v = copia(e); v.manos[1 - yo] = e.manos[1 - yo].map(() => null); v.pozo = e.pozo.map(() => null); delete v.semilla; return v; },
  esCaptura: () => false,
  ordenar: (e, js) => js,
  suma, fichaTxt,
};

export const MOTORES = { ajedrez, damas, reversi, conecta4, domino };

/* ═══════════════════════════════ LA MÁQUINA ═══════════════════════════════
   Minimax con poda alfa-beta. Fácil: mira una jugada y a veces se equivoca a propósito.
   Medio y difícil miran más lejos. El dominó no se puede ver por adelantado (las fichas del
   otro están tapadas): ahí la máquina juega con reglas de buen jugador. */
const PROF = {
  ajedrez: { facil: 1, medio: 2, dificil: 3 },
  damas: { facil: 2, medio: 4, dificil: 7 },
  reversi: { facil: 1, medio: 3, dificil: 5 },
  conecta4: { facil: 2, medio: 4, dificil: 7 },
};
const GANAR = 1e7;
/* EL AJEDREZ POR ELO (Carlos, 14 nov: «el fácil como en 150 de elo, medio 600 y difícil 1000»). Un motor que siempre
   juega su mejor jugada no se parece a una persona de 600: se le pone la forma de equivocarse de cada nivel.
   · 150: mueve casi a lo que salga; come lo que le dejan colgado la mitad de las veces y no ve los mates.
   · 600: ve la jugada y la respuesta (profundidad 2), pero se le va una pieza de vez en cuando y juega imprecisiones.
   · 1000: ve tres jugadas y los cambios hasta que se calman; rara vez regala algo.
   Se elige con «temperatura»: la mejor sale más, las cercanas a veces, las malas casi nunca; y un tanto de jugadas
   al azar (el descuido). Medido jugando niveles entre sí (pruebas-elo.mjs), no contra gente con rating. */
export const ELO = {
  facil: { elo: 150, temp: 260, descuido: .45, malas: Infinity, quies: 0 },
  medio: { elo: 600, temp: 75, descuido: .1, malas: 320, quies: 2 },
  dificil: { elo: 1000, temp: 22, descuido: .03, malas: 160, quies: 4 },
};
function elegirPorElo(cal, n, rnd){
  if(rnd() < n.descuido){ const pool = cal.filter((c) => Math.max(-2e3, Math.min(2e3, c.v)) >= Math.max(-2e3, Math.min(2e3, cal[0].v)) - n.malas); return pool[Math.floor(rnd() * pool.length)].j; }
  const v0 = Math.max(-2e3, Math.min(2e3, cal[0].v));
  const pesos = cal.map((c) => Math.exp((Math.max(-2e3, Math.min(2e3, c.v)) - v0) / n.temp)), tot = pesos.reduce((a, b) => a + b, 0);
  let r = rnd() * tot; for(let i = 0; i < cal.length; i++){ r -= pesos[i]; if(r <= 0) return cal[i].j; }
  return cal[0].j;
}
function minimax(m, e, prof, alfa, beta, yo, quies){
  const f = m.fin(e);
  if(f) return f.ganador === null ? 0 : (f.ganador === yo ? GANAR + prof : -GANAR - prof);
  if(prof <= 0){
    if(m.id !== 'ajedrez' || quies <= 0) return m.evaluar(e, yo);
    // en ajedrez se terminan de ver los cambios de piezas, para no dejar una dama colgada
    const quieta = m.evaluar(e, yo), maxi = m.turno(e) === yo;
    if(maxi){ if(quieta >= beta) return quieta; alfa = Math.max(alfa, quieta); } else { if(quieta <= alfa) return quieta; beta = Math.min(beta, quieta); }
    const caps = m.ordenar(e, m.jugadas(e).filter((j) => j.cap));
    if(!caps.length) return quieta;
    let mejor = quieta;
    for(const j of caps){ const v = minimax(m, m.aplicar(e, j, true), 0, alfa, beta, yo, quies - 1);
      if(maxi){ mejor = Math.max(mejor, v); alfa = Math.max(alfa, v); } else { mejor = Math.min(mejor, v); beta = Math.min(beta, v); } if(alfa >= beta) break; }
    return mejor;
  }
  const js = m.ordenar(e, m.jugadas(e)), maxi = m.turno(e) === yo;
  let mejor = maxi ? -Infinity : Infinity;
  for(const j of js){
    const v = minimax(m, m.aplicar(e, j, true), prof - 1, alfa, beta, yo, quies);
    if(maxi){ if(v > mejor) mejor = v; if(v > alfa) alfa = v; } else { if(v < mejor) mejor = v; if(v < beta) beta = v; }
    if(alfa >= beta) break;
  }
  return mejor;
}
/* calificar cada jugada (sirve para la máquina y para las clases: «¿cuál es la mejor?») */
export function calificar(m, e, prof, quies = m.id === 'ajedrez' ? 4 : 0){
  const yo = m.turno(e), js = m.ordenar(e, m.jugadas(e));
  return js.map((j) => ({ j, v: minimax(m, m.aplicar(e, j, true), prof - 1, -Infinity, Infinity, yo, quies) }));
}
export function elegir(m, e, nivel = 'medio', rnd = Math.random){
  const js = m.jugadas(e);
  if(js.length <= 1) return js[0] || null;
  if(m.id === 'domino') return elegirDomino(e, nivel, rnd);
  const prof = PROF[m.id][nivel] ?? 2;
  const cal = calificar(m, e, prof, m.id === 'ajedrez' ? (ELO[nivel] || ELO.medio).quies : undefined).sort((a, b) => b.v - a.v);
  if(m.id === 'ajedrez') return elegirPorElo(cal, ELO[nivel] || ELO.medio, rnd);
  if(nivel === 'facil' && rnd() < 0.35) return cal[Math.floor(rnd() * cal.length)].j;     // se distrae
  const top = cal.filter((c) => c.v >= cal[0].v - (nivel === 'dificil' ? 0 : 15));
  return top[Math.floor(rnd() * top.length)].j;
}
function elegirDomino(e, nivel, rnd){
  const js = domino.jugadas(e);
  if(js[0].roba || js[0].pasa) return js[0];
  if(nivel === 'facil') return js[Math.floor(rnd() * js.length)];
  const mano = e.manos[e.t], cuantas = Array(7).fill(0);
  for(const f of mano){ cuantas[f[0]]++; if(f[1] !== f[0]) cuantas[f[1]]++; }
  const otroNo = new Set(e.nopuede[1 - e.t]);
  let mejor = null, mv = -Infinity;
  for(const j of js){
    const [a, b] = j.ficha.split('-').map(Number);
    let v = a + b;                                     // soltar las pesadas primero
    if(a === b) v += 6;                                // las mulas se atoran: fuera pronto
    const x = domino.extremos(e), queda = !x ? b : (j.lado === 'izq' ? (a === x[0] ? b : a) : (a === x[1] ? b : a));
    v += cuantas[queda] * 4;                           // dejar un número que yo tengo
    if(nivel === 'dificil' && otroNo.has(queda)) v += 14;   // dejar un número que el otro ya no tiene
    if(v > mv){ mv = v; mejor = j; }
  }
  return mejor;
}

/* cuántas posiciones hay a cierta profundidad (para revisar que las reglas del ajedrez estén completas) */
export function perft(m, e, d){ if(d === 0) return 1; let n = 0; for(const j of m.jugadas(e)) n += perft(m, m.aplicar(e, j, true), d - 1); return n; }
