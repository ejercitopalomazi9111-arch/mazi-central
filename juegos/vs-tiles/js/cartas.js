/* LAS CARTAS (los «charts»): de dónde sale cada nota. No se escriben a mano: salen del análisis de la
   canción (datos/<canción>.json, hecho con librosa: golpes, ataques por banda —grave, medio, agudo—,
   energía cada medio segundo y cortes de sección) y de un generador de patrones con semilla, así que la
   misma canción y dificultad dan SIEMPRE la misma carta.

   Una nota: { t, tipo, r, fin, dir, x, y, sim, camino, prec, rival }
     tipo: 'tap' · 'hold' · 'flick' (deslizar en `dir`, 0 = arriba y de ahí cada 45° a la derecha)
           · 'circulo' · 'deslice' (seguir el `camino`) · 'giro' (dar vueltas) · 'simbolo' (DIVA, `sim` 0–3)
     r: el riel (0–6). Los rieles son fijos; lo que cambia es dónde está cada uno (ver `disposicion`).
   Un evento: { t, tipo, ... } — lo que se mueve: cámara, carriles, velocidad, escenario, modo.

   Las mecánicas del documento de Carlos (DISEÑO.md) que salen de aquí van con su número: M001… */

export const DIFS = [
  { id: 'facil', nombre: 'Fácil', nivel: [1, 3], sub: 1, umbral: .5, gap: .42, mismo: .6, acorde: 0, hold: .18, flick: 0, rafaga: 0, carriles: 4, ventana: 1.5, viaja: 0, rapidez: 1 },
  { id: 'normal', nombre: 'Normal', nivel: [4, 6], sub: 2, umbral: .34, gap: .2, mismo: .3, acorde: .06, hold: .16, flick: .03, rafaga: 0, carriles: 5, ventana: 1.25, viaja: 0, rapidez: 1 },
  { id: 'dificil', nombre: 'Difícil', nivel: [7, 9], sub: 4, umbral: .22, gap: .115, mismo: .17, acorde: .14, hold: .13, flick: .06, rafaga: .25, carriles: 5, ventana: 1, viaja: .08, asiento: .55, rapidez: 1.05 },
  { id: 'experto', nombre: 'Experto', nivel: [10, 12], sub: 4, umbral: .1, gap: .072, mismo: .11, acorde: .2, hold: .1, flick: .16, rafaga: .7, carriles: 5, ventana: .85, viaja: .18, asiento: .42, rapidez: 1.18 },
  { id: 'exorcist', nombre: 'EXÓRCIST', nivel: [13, 15], sub: 8, umbral: .06, gap: .052, mismo: .09, acorde: .28, hold: .08, flick: .12, rafaga: 1, carriles: 5, ventana: .7, viaja: .34, asiento: .34, rapidez: 1.3 }
];
export const MODOS = {
  carril: { nombre: 'Carril', de: 'Guitar Hero · Fortnite Festival', que: 'Cinco carriles en 3D: toca, mantén y desliza cuando la nota llegue a la línea.' },
  flechas: { nombre: 'Flechas', de: 'Friday Night Funkin\'', que: 'Duelo de flechas: tu rival canta una frase y tú se la regresas.' },
  diva: { nombre: 'Símbolos', de: 'Project DIVA', que: 'Los símbolos vuelan a su lugar: toca el botón igual cuando lleguen.' },
  circulos: { nombre: 'Círculos', de: 'osu!', que: 'Toca cada círculo cuando el anillo lo cierre; sigue los deslices y gira los remolinos.' },
  exorcist: { nombre: 'EXÓRCIST', de: 'Todo junto', que: 'Las reglas cambian a media canción: carriles que se doblan, giran, se invierten y cambian de juego.' }
};

/* azar con semilla (mulberry32) */
export function azar(semilla){ let a = 0; for(const c of String(semilla)) a = (a * 31 + c.charCodeAt(0)) | 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* la rejilla: los golpes partidos en `sub` (se interpola entre golpe y golpe, así sigue al tempo real) */
function rejilla(golpes, sub){ const g = [];
  for(let i = 0; i < golpes.length - 1; i++){ const a = golpes[i], b = golpes[i + 1]; for(let k = 0; k < sub; k++) g.push(a + (b - a) * k / sub); }
  if(golpes.length) g.push(golpes[golpes.length - 1]); return g; }
const cerca = (arr, t) => { let lo = 0, hi = arr.length - 1; while(hi - lo > 1){ const m = (lo + hi) >> 1; if(arr[m] < t) lo = m; else hi = m; } return Math.abs(arr[lo] - t) < Math.abs(arr[hi] - t) ? lo : hi; };
const energiaEn = (an, t) => an.energia[Math.min(an.energia.length - 1, Math.max(0, Math.floor(t * 2)))] || 0;

/* LAS DISPOSICIONES: dónde está cada uno de los 7 rieles (x en anchos de carril) y cuáles se ven */
export const DISPOSICIONES = {
  4: { rieles: [1, 2, 4, 5], x: [-1.5, -.5, .5, 1.5] },
  5: { rieles: [1, 2, 3, 4, 5], x: [-2, -1, 0, 1, 2] },
  2: { rieles: [2, 4], x: [-.7, .7] },          // M042 · dos carriles anchos
  3: { rieles: [2, 3, 4], x: [-1.1, 0, 1.1] },
  6: { rieles: [0, 1, 2, 4, 5, 6], x: [-2.5, -1.5, -.5, .5, 1.5, 2.5] },
  7: { rieles: [0, 1, 2, 3, 4, 5, 6], x: [-3, -2, -1, 0, 1, 2, 3] }
};

/* ── el generador ── */
export function armarCarta(an, cancion, modo, difId, opc = {}){
  const tel = !!(opc && opc.telefono);
  const D = DIFS.find(d => d.id === difId) || DIFS[2], R = azar(cancion.id + '|' + modo + '|' + difId);
  const notas = [], eventos = [];
  const golpes = an.golpes, beat = golpes.length > 1 ? (golpes[golpes.length - 1] - golpes[0]) / (golpes.length - 1) : .5;
  const primero = Math.max(golpes[0] || 0, 1.2), ultimo = an.dur - 2.5;
  const secc = [...new Set([0, ...an.secciones.filter(s => s > 4 && s < an.dur - 6), an.dur])].sort((a, b) => a - b);

  /* 1 · los candidatos: ataques que pasan el umbral (más bajo donde hay energía) pegados a la rejilla */
  const sub = D.sub, rej = rejilla(golpes, sub), rejTres = D.id === 'exorcist' || D.id === 'experto' ? rejilla(golpes, 6) : null;
  let cand = [];
  for(const [t, s, banda] of an.ataques){
    if(t < primero || t > ultimo) continue;
    const e = energiaEn(an, t), um = D.umbral * (1.15 - .5 * e);
    if(s < um) continue;
    let i = cerca(rej, t), tt = rej[i], paso = beat / sub;
    /* M027 · tres contra cuatro: si el ataque cae mejor en tresillo que en la rejilla, se queda en tresillo */
    if(rejTres){ const j = cerca(rejTres, t); if(Math.abs(rejTres[j] - t) < Math.abs(tt - t) * .5) { tt = rejTres[j]; } }
    if(Math.abs(tt - t) > paso * .45) continue;
    cand.push({ t: tt, s, banda, e });
  }
  /* en Fácil y Normal, además, los golpes fuertes aunque no haya ataque claro */
  if(D.sub <= 2) for(const g of golpes){ if(g < primero || g > ultimo) continue; if(energiaEn(an, g) > .35 && R() < .55) cand.push({ t: g, s: .5, banda: 0, e: energiaEn(an, g) }); }
  /* 2 · ráfagas (M016) y streams (M011): en lo más fuerte, la rejilla fina se llena entre dos ataques */
  if(D.rafaga > 0){ const fina = rejilla(golpes, D.id === 'exorcist' ? 4 : 2);
    for(let i = 0; i < fina.length; i++){ const t = fina[i]; if(t < primero || t > ultimo) continue; const e = energiaEn(an, t);
      if(e > .62 - .2 * D.rafaga && R() < D.rafaga * .55 * e) cand.push({ t, s: .3, banda: 1 + (i & 1), e, rafaga: true }); } }
  cand.sort((a, b) => a.t - b.t || b.s - a.s);
  /* 3 · separación mínima entre notas */
  const lim = []; for(const c of cand){ const u = lim[lim.length - 1]; if(u && c.t - u.t < D.gap - 1e-3){ if(c.s > u.s * 1.6 && !u.rafaga) lim[lim.length - 1] = c; continue; } lim.push(c); }
  cand = lim;

  /* 4 · secciones: qué se juega en cada una y cómo se mueve todo */
  const plan = planSecciones(secc, modo, D, R, an, tel);
  plan.forEach(p => eventos.push(...p.eventos));

  /* 5 · asignar cada candidato a su sección y a su riel, con patrones */
  let ultRiel = 2, patron = 'libre', cuenta = 0, dirEsc = 1;
  const libre = Array(7).fill(-1);      // hasta cuándo está ocupado cada riel (los holds)
  for(let k = 0; k < cand.length; k++){
    const c = cand[k], P = plan.find(p => c.t >= p.t0 && c.t < p.t1) || plan[0];
    if(c.t < P.t0 + P.aviso) continue;   // un respiro al cambiar de reglas, para leer el aviso
    const sigP = plan[plan.indexOf(P) + 1]; if(sigP && sigP.modo !== P.modo && c.t > P.t1 - .45) continue;   // y otro antes de que cambien
    const sig = cand[k + 1], hueco = sig ? sig.t - c.t : 9;
    if(P.modo === 'carril' || P.modo === 'flechas'){
      const disp = DISPOSICIONES[P.carriles], rs = P.modo === 'flechas' ? [1, 2, 4, 5] : disp.rieles, n = rs.length;
      if(cuenta-- <= 0){ const op = ['libre', 'libre', 'escalera', 'alterna', D.sub >= 4 ? 'trino' : 'alterna', D.id === 'experto' || D.id === 'exorcist' ? 'jack' : 'escalera'];
        patron = op[Math.floor(R() * op.length)]; cuenta = 3 + Math.floor(R() * 6); dirEsc = R() < .5 ? 1 : -1; }
      let idx;
      const actual = Math.max(0, rs.indexOf(ultRiel));
      if(patron === 'escalera') idx = (actual + dirEsc + n) % n;                       // M015
      else if(patron === 'trino') idx = actual === 1 ? 2 % n : 1;                       // M014
      else if(patron === 'alterna') idx = actual < n / 2 ? n - 1 - Math.floor(R() * Math.ceil(n / 2)) : Math.floor(R() * Math.ceil(n / 2));  // M010
      else if(patron === 'jack') idx = actual;                                          // M012
      else idx = c.banda === 0 ? (R() < .5 ? 0 : n - 1) : c.banda === 2 ? Math.min(n - 1, Math.floor(n / 2) + Math.floor(R() * Math.ceil(n / 2))) : Math.floor(R() * n);
      /* no cae en un riel ocupado (un hold) ni repite demasiado pegado */
      for(let intento = 0; intento < n; intento++){ const r = rs[idx]; const u = notas.findLast?.(x => x.r === r && !x.rival) ;
        if(libre[r] < c.t - .02 && !(u && c.t - (u.fin || u.t) < D.mismo)) break; idx = (idx + 1) % n; }
      const r = rs[idx]; if(libre[r] >= c.t - .02) continue;
      const nota = { t: c.t, tipo: 'tap', r, prec: false };
      /* M002 · mantener: si lo que sigue tarda, la nota se sostiene */
      if(hueco > beat * 1.4 && R() < D.hold * 2.2 && c.e > .25){ nota.tipo = 'hold'; nota.fin = c.t + Math.min(2.6, hueco - Math.max(.12, beat * .5)); }
      /* M004 · deslizar en los acentos más fuertes (en Carril; Flechas no tiene) */
      else if(P.modo === 'carril' && c.s > (D.sub >= 4 ? .58 : .72) && R() < D.flick * 4){ nota.tipo = 'flick'; const dirs = D.id === 'exorcist' ? [0, 7, 1, 6, 2, 4, 3, 5] : D.id === 'experto' ? [0, 7, 1, 6, 2] : [0, 7, 1]; nota.dir = dirs[Math.floor(R() * dirs.length)]; }
      /* LA NOTA QUE VIAJA (Carlos, 29 oct: «debe deslizarse entre todos los carriles hasta un poco antes de llegar al
         punto de toque para estar en su posición correcta»): sale de otro carril, cruza la pista y se asienta en el
         suyo `asiento` segundos antes de la línea. En Experto y EXÓRCIST viaja sin color: no se sabe a dónde va
         hasta que llega. Sólo en Carril, y nunca la que se sostiene */
      if(P.modo === 'carril' && nota.tipo !== 'hold' && n >= 3 && R() < D.viaja && c.t - P.t0 > 2.5){
        const lejos = rs.filter(x => Math.abs(rs.indexOf(x) - idx) >= Math.min(2, n - 1)), de = lejos[Math.floor(R() * lejos.length)];
        if(de !== undefined) nota.viaja = { de, forma: D.id === 'exorcist' && R() < .5 ? 'zigzag' : 'barre', asiento: D.asiento, ciega: D.id === 'experto' || D.id === 'exorcist' }; }
      if(nota.tipo === 'hold') libre[r] = nota.fin + .05;
      if(P.modo === 'flechas') nota.rival = P.rival && Math.floor((c.t - P.t0) / (beat * 8)) % 2 === 0;
      if(D.id === 'exorcist' && P.precision && c.s > .8) nota.prec = true;    // M019
      notas.push(nota); ultRiel = r;
      /* M009 · acordes en los graves fuertes */
      if(c.banda === 0 && c.s > .6 && R() < D.acorde * 2.5 && nota.tipo !== 'flick'){
        /* en el teléfono: nunca más de dos notas a la vez, y ninguna mientras se sostiene otra (serían tres dedos) */
        const sosteniendo = rs.some(x => libre[x] >= c.t - .02), otros = rs.filter(x => x !== r && libre[x] < c.t - .02); const cuantos = tel ? (sosteniendo ? 0 : 1) : D.id === 'exorcist' && R() < .35 ? 2 : 1;
        for(let q = 0; q < cuantos && otros.length; q++){ const o = otros.splice(Math.floor(R() * otros.length), 1)[0]; notas.push({ t: c.t, tipo: 'tap', r: o, rival: nota.rival }); } }
    }
    else if(P.modo === 'circulos'){
      notas.push(circuloNota(c, hueco, beat, D, R, notas, P));
    }
    else if(P.modo === 'diva'){
      const ant = notas.findLast?.(x => x.tipo === 'simbolo' || x.tipo === 'estrella');
      const sim = c.banda === 0 ? (R() < .5 ? 2 : 3) : c.banda === 2 ? (R() < .5 ? 0 : 1) : Math.floor(R() * 4);
      const pos = siguientePos(ant, c.t, .22, R);
      const nota = { t: c.t, tipo: c.s > .82 && R() < .3 ? 'estrella' : 'simbolo', sim, x: pos[0], y: pos[1], ang: R() * Math.PI * 2 };
      if(nota.tipo === 'simbolo' && hueco > beat * 1.6 && R() < D.hold * 2){ nota.fin = c.t + Math.min(2, hueco - beat * .6); }
      notas.push(nota);
    }
  }
  /* M020 / M163 · el remolino del final de sección en Círculos */
  plan.filter(p => p.modo === 'circulos' && p.t1 - p.t0 > 10 && D.sub >= 2).forEach(p => {
    const t1 = p.t1 - beat * .5, t0 = t1 - beat * 3; if(notas.some(n => n.t > t0 - .2 && n.t < t1)) { for(let i = notas.length - 1; i >= 0; i--) if(notas[i].t > t0 - .2 && notas[i].t < t1) notas.splice(i, 1); }
    notas.push({ t: t0, tipo: 'giro', fin: t1, x: .5, y: .45, vueltas: Math.round((t1 - t0) * (D.sub >= 4 ? 2.2 : 1.5)) }); });
  notas.sort((a, b) => a.t - b.t);
  notas.forEach((n, i) => { n.id = i; n.modo = (plan.find(p => n.t >= p.t0 && n.t < p.t1) || plan[0]).modo; });
  eventos.sort((a, b) => a.t - b.t);
  const propias = notas.filter(n => !n.rival);
  const nps = propias.length / Math.max(30, (propias.at(-1)?.t || 60) - (propias[0]?.t || 0));
  const nivel = Math.round(Math.min(D.nivel[1], Math.max(D.nivel[0], D.nivel[0] + (nps - [1, 2.2, 3.6, 5.2, 7][DIFS.indexOf(D)]) * 1.2 + (modo === 'exorcist' ? 1 : 0))));
  return { cancion: cancion.id, modo, dif: D.id, D, nivel, notas, eventos, plan, beat, dur: an.dur, total: propias.length };
}

/* osu: cada círculo cae a una distancia del anterior que crece con el tiempo entre los dos (el «flow») */
function siguientePos(ant, t, salto, R){
  if(!ant) return [.5, .42];
  const dt = Math.max(.05, t - ant.t), d = Math.min(.42, salto * (.4 + dt * 1.6));
  let a = (ant.ang ?? 0) + (R() - .5) * 2.4, x = ant.x + Math.cos(a) * d, y = ant.y + Math.sin(a) * d * .8;
  if(x < .12 || x > .88) { a = Math.PI - a; x = ant.x + Math.cos(a) * d; }
  if(y < .16 || y > .7) { a = -a; y = ant.y + Math.sin(a) * d * .8; }
  return [Math.min(.88, Math.max(.12, x)), Math.min(.7, Math.max(.16, y)), a];
}
function circuloNota(c, hueco, beat, D, R, notas, P){
  const ant = notas.findLast?.(x => x.tipo === 'circulo' || x.tipo === 'deslice');
  const [x, y, ang] = siguientePos(ant ? { ...ant, t: ant.fin || ant.t } : null, c.t, D.sub >= 4 ? .3 : .2, R);
  const n = { t: c.t, tipo: 'circulo', x, y, ang, combo: 0 };
  /* M005 / M118 · deslice: si hay hueco, se sigue una curva hasta antes de la siguiente nota */
  if(hueco > beat * 1.2 && R() < .45){ const dur = Math.min(1.8, hueco - beat * .4), largo = Math.min(.42, .14 + dur * .22), giro = (R() - .5) * 2.2;
    const pts = []; for(let i = 0; i <= 12; i++){ const u = i / 12, a = ang + giro * u; pts.push([Math.min(.9, Math.max(.1, x + Math.cos(a) * largo * u)), Math.min(.72, Math.max(.14, y + Math.sin(a) * largo * u * .8))]); }
    n.tipo = 'deslice'; n.fin = c.t + dur; n.camino = pts; n.vueltas = dur > beat * 2.5 && D.sub >= 4 ? 2 : 1; if(n.vueltas === 2) n.fin = c.t + dur; }
  return n;
}

/* EL PLAN DE CADA SECCIÓN: el modo que se juega, cuántos carriles y TODO el movimiento.
   «Metele muchísimo movimiento al juego» (Carlos, 29 oct): hasta Fácil cambia de cámara y de escenario. */
function planSecciones(secc, modo, D, R, an, tel = false){
  const plan = [], nivel = DIFS.indexOf(D), golpes = an.golpes;
  const ciclo = ['carril', 'circulos', 'carril', 'diva', 'flechas', 'carril', 'circulos', 'diva'];
  for(let i = 0; i < secc.length - 1; i++){
    const t0 = secc[i], t1 = secc[i + 1], e = an.energia.slice(Math.floor(t0 * 2), Math.floor(t1 * 2)).reduce((a, b) => a + b, 0) / Math.max(1, (t1 - t0) * 2);
    const m = modo === 'exorcist' ? (i === 0 ? 'carril' : ciclo[(i + Math.floor(R() * 2)) % ciclo.length]) : modo;
    let carriles = m === 'flechas' ? 4 : D.carriles;
    const ev = [], P = { t0, t1, modo: m, carriles, eventos: ev, aviso: i > 0 && modo === 'exorcist' ? 1.4 : 0, rival: true, precision: e > .6, energia: e };
    /* el escenario cambia en cada sección (con destello en el golpe) */
    ev.push({ t: t0, tipo: 'escenario', n: Math.floor(R() * 7), tono: R() });
    ev.push({ t: t0, tipo: 'camara', n: i === 0 ? 0 : Math.floor(R() * 6), fuerte: e });
    if(i > 0) ev.push({ t: t0, tipo: 'destello', fuerza: .5 + e * .5 });
    if(modo === 'exorcist' && i > 0) ev.push({ t: t0, tipo: 'aviso', modo: m, texto: avisoDe(m) });
    if(m === 'carril'){
      /* M041–M045 · la cantidad de carriles cambia (EXÓRCIST siempre; Experto a veces) */
      if((modo === 'exorcist' && i > 0) || (nivel >= 3 && R() < .35 && i > 0)){ carriles = [2, 3, 4, 5, 6, 7, 2][Math.floor(R() * 7)]; if(nivel < 4) carriles = [4, 5, 6][Math.floor(R() * 3)];
        /* en el teléfono, 6 o 7 carriles no caben bajo dos pulgares: se quedan en 4 o 5 */
        if(tel && carriles > 5) carriles = carriles === 6 ? 4 : 5; P.carriles = carriles; }
      /* el cambio de carriles pasa YA en la sección nueva, dentro del respiro: si pasara antes, el riel
         de la última nota de la sección anterior se escondería bajo el dedo (lo cazó la prueba de entrada) */
      const antes = plan.length ? plan[plan.length - 1].carriles : D.carriles;
      if(i === 0) ev.push({ t: -1, tipo: 'carriles', n: P.carriles, dur: .01 });
      else if(P.carriles !== antes || plan[plan.length - 1].modo !== 'carril'){ ev.push({ t: t0 + .05, tipo: 'carriles', n: P.carriles, dur: .55 }); P.aviso = Math.max(P.aviso, 1.1); }
      /* las transformaciones de dentro de la sección, en golpes */
      const gs = golpes.filter(g => g > t0 + 1.5 && g < t1 - 1);
      const num = [1, 2, 4, 9, 12][nivel];
      for(let k = 0; k < num && gs.length; k++){ const g = gs[Math.floor(R() * gs.length)];
        const op = nivel >= 4 ? ['inclina', 'gira', 'velocidad', 'peralte', 'peralte', 'abanico', 'espejo', 'oculta', 'alto', 'reversa', 'compas'] : nivel >= 3 ? ['inclina', 'velocidad', 'peralte', 'peralte', 'abanico', 'espejo', 'oculta', 'alto', 'compas'] : nivel >= 2 ? ['inclina', 'peralte', 'velocidad'] : ['inclina', 'peralte'];
        const tipo = op[Math.floor(R() * op.length)], dur = (2 + R() * 6) * (golpes[1] - golpes[0] || .5);
        if(tipo === 'inclina') ev.push({ t: g, tipo, ang: (R() < .5 ? -1 : 1) * (.18 + .3 * R()) * (nivel >= 4 ? 1.5 : 1), dur });        // M046
        if(tipo === 'gira') ev.push({ t: g, tipo, ang: [Math.PI, Math.PI / 2, -Math.PI / 2][Math.floor(R() * 3)], dur });                    // M055
        if(tipo === 'velocidad') ev.push({ t: g, tipo, v: [.55, 1.6, 2.1, .75][Math.floor(R() * 4)], dur });                                  // M061–M063
        /* M050 · EL PERALTE: cada carril se mueve por su cuenta (se ladea, se tuerce en diagonal, sube como rampa),
           girando sobre su propio botón, que no se mueve: lo difícil es LEER, no tocar (Carlos, 29 oct) */
        if(tipo === 'peralte'){ const fs = nivel >= 4 ? ['ola', 'tuerce', 'abre', 'cierra', 'rampa', 'trenza'] : nivel >= 3 ? ['ola', 'tuerce', 'abre', 'rampa', 'trenza'] : ['ola', 'tuerce', 'rampa'];
          ev.push({ t: g, tipo, forma: fs[Math.floor(R() * fs.length)], fuerza: (.55 + R() * .45) * (nivel >= 4 ? 1.25 : 1), dur: dur * 1.4 }); }
        if(tipo === 'abanico') ev.push({ t: g, tipo, fuerza: R() < .5 ? 1 : -1, dur });                                                       // M047 / M048
        if(tipo === 'espejo') ev.push({ t: g, tipo, dur });                                                                                  // M053
        if(tipo === 'oculta') ev.push({ t: g, tipo, cual: R() < .5 ? 'hidden' : 'sudden', dur });                                            // M136 / M137
        if(tipo === 'alto') ev.push({ t: g, tipo, dur: (golpes[1] - golpes[0] || .5) * (1 + Math.floor(R() * 2)) });                        // M064
        if(tipo === 'reversa') ev.push({ t: g, tipo, dur });                                                                                 // M065
        if(tipo === 'compas') ev.push({ t: g, tipo, texto: ['7/8', '5/4', '3/4', '6/8', '9/8'][Math.floor(R() * 5)], dur: dur * 1.5 });      // M031
      }
    }
    /* M077 / M078 · la cámara cambia también DENTRO de la sección, cada 8 compases (desde Difícil) */
    if(nivel >= 2 && m === 'carril'){ const cada = (golpes[1] - golpes[0] || .5) * 32 / (nivel >= 4 ? 2 : 1); for(let tc = t0 + cada; tc < t1 - 2; tc += cada) ev.push({ t: tc, tipo: 'camara', n: Math.floor(R() * 6), fuerte: e }); }
    /* M110 · el drop: la sección más fuerte arranca con glitch */
    if(e > .7 && i > 0) ev.push({ t: t0, tipo: 'glitch', dur: .35 });
    plan.push(P);
  }
  return plan;
}
function avisoDe(m){ return { carril: 'CARRILES · toca, mantén, desliza', circulos: 'CÍRCULOS · toca donde se cierre el anillo', diva: 'SÍMBOLOS · △ ○ × □ cuando lleguen', flechas: 'FLECHAS · regrésale la frase al rival' }[m] || ''; }
