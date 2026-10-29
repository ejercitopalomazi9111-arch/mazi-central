/* EL JUEZ: qué tan a tiempo fue cada toque. Las ventanas son estrictas y salen de la dificultad (Fácil
   las abre ×1.5, EXÓRCIST las cierra ×0.7); una nota de precisión (M019) las cierra a la mitad.
   SONOLUZ es la ventana de oro: sólo cuenta para la puntuación «perfecta perfecta» (como los 300g de
   osu o los Marvelous de los juegos de flechas). */
export const JUICIOS = [
  { id: 'sonoluz', nombre: 'SONOLUZ', ms: 22, valor: 1.01, vida: 1.6, color: '#FFF3B0' },
  { id: 'perfecto', nombre: 'PERFECTO', ms: 45, valor: 1, vida: 1.2, color: '#7CF0FF' },
  { id: 'genial', nombre: 'GENIAL', ms: 85, valor: .7, vida: .6, color: '#8DFF9E' },
  { id: 'bien', nombre: 'BIEN', ms: 125, valor: .35, vida: -1, color: '#FFC46B' },
  { id: 'fallo', nombre: 'FALLO', ms: 170, valor: 0, vida: -7, color: '#FF4D6D' }
];
export const ALCANCE = .17;          // más lejos que esto, el toque ni se considera para esa nota

export function crearJuez(carta){
  const k = carta.D.ventana, cuenta = Object.fromEntries(JUICIOS.map(j => [j.id, 0]));
  const J = { k, cuenta, combo: 0, comboMax: 0, puntos: 0, vida: 60, desvios: [], muerto: false, ultimo: null,
    total: carta.total, porSeccion: carta.plan.map(() => ({ bien: 0, mal: 0 })),
    ventana(prec){ return JUICIOS.map(j => j.ms * k * (prec ? .55 : 1) / 1000); },
    /* juzgar un desvío (en segundos, negativo = antes); devuelve el juicio o null si quedó fuera */
    juzgar(dt, nota){
      const w = this.ventana(nota && nota.prec), a = Math.abs(dt);
      let j = null; for(let i = 0; i < JUICIOS.length; i++) if(a <= w[i]) { j = JUICIOS[i]; break; }
      if(!j) return null;
      this.apuntar(j, dt, nota); return j;
    },
    apuntar(j, dt, nota){
      cuenta[j.id]++; this.ultimo = { j, dt, t: performance.now(), nota };
      if(j.id === 'fallo') this.combo = 0; else { this.combo++; this.comboMax = Math.max(this.comboMax, this.combo); }
      if(dt !== null && dt !== undefined && j.id !== 'fallo') this.desvios.push(dt);
      const sin = carta.D.id === 'exorcist' && j.vida > 0 && this.vida < 30;      // M144 · EXÓRCIST no te levanta cuando ya vas mal
      this.vida = Math.max(0, Math.min(100, this.vida + (sin ? 0 : j.vida) * (j.vida < 0 ? 1 + .25 * ['facil', 'normal', 'dificil', 'experto', 'exorcist'].indexOf(carta.D.id) : 1)));
      if(this.vida <= 0) this.muerto = true;
      const s = nota ? carta.plan.findIndex(p => nota.t >= p.t0 && nota.t < p.t1) : -1; if(s >= 0) this.porSeccion[s][j.valor >= .7 ? 'bien' : 'mal']++;
    },
    fallar(nota){ this.apuntar(JUICIOS[4], null, nota); },
    /* la puntuación a 1,000,000 (más los SONOLUZ, hasta 1,010,000) */
    get puntaje(){ const hechos = JUICIOS.reduce((a, j) => a + cuenta[j.id] * j.valor, 0); return Math.round(hechos / Math.max(1, this.total) * 1e6); },
    get precision(){ const n = JUICIOS.reduce((a, j) => a + cuenta[j.id], 0); return n ? JUICIOS.reduce((a, j) => a + cuenta[j.id] * Math.min(1, j.valor), 0) / n * 100 : 100; },
    get rango(){ const p = this.puntaje; return p >= 1005000 ? 'Ω' : p >= 990000 ? 'EX+' : p >= 970000 ? 'EX' : p >= 940000 ? 'S' : p >= 900000 ? 'A' : p >= 820000 ? 'B' : p >= 700000 ? 'C' : 'D'; },
    get fc(){ return cuenta.fallo === 0 && cuenta.bien === 0; },
    get ap(){ return cuenta.fallo === 0 && cuenta.bien === 0 && cuenta.genial === 0; }
  };
  return J;
}
