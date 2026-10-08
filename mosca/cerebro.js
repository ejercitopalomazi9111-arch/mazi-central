/* CEREBRO DE MOSCA · el conectoma completo de FlyWire (138,639 neuronas, 15 millones de conexiones)
   corriendo como red de neuronas «integra y dispara» con las constantes de Shiu et al. 2024 (Nature):
   el modelo que predijo, sin entrenar nada, qué neuronas hacen que la mosca saque la trompa al probar
   azúcar o se limpie las antenas.

   Lo que es de verdad y lo que es nuestro:
     · DE VERDAD: quién se conecta con quién, cuántas sinapsis y si excita o inhibe (FlyWire), y las
       constantes de la membrana (Shiu et al.).
     · NUESTRO: el paso de tiempo (0.5 ms en vez de 0.1, para que corra en un teléfono; las ecuaciones
       se integran exactas entre pasos), qué sentido activa qué neuronas de entrada y qué grupo de
       salida se lee como cada conducta. Eso está en datos/indice.json y en mundo.js, a la vista.

   Se usa igual en el navegador (dentro de un Worker) y en node (pruebas):
     const red = Red.desde(bytes, indice)      // bytes = conectoma ya descomprimido
     const m = new Cerebro(red)                // un cerebro por mosca; la red se comparte
     m.estimular('azucar', 'todos', 150)       // Hz
     m.avanzar(100)                            // ms
     m.tasa('comer')                           // spikes por segundo, promedio móvil
*/

export const PARAMS = {
  dt: 0.5,            // ms
  v_th: 7,            // mV sobre el reposo (-45 - -52)
  t_mbr: 20,          // ms, constante de la membrana
  tau: 5,             // ms, constante de la sinapsis
  t_rfc: 2.2,         // ms, periodo refractario
  t_dly: 1.8,         // ms, retraso sináptico
  w_syn: 0.275,       // mV por sinapsis
  eps: 0.3,           // mV: abajo de esto la neurona se da por quieta (sale de la lista de activas); el umbral está a 7
  // NO es de Shiu: «cansancio» lento (adaptación) — cada spike sube el umbral 0.05 mV y se va en un
  // segundo. Sin él, después de oler algo quedaba un eco en el cuerno lateral (LHPV1c2 ↔ LHPV6o1 ↔
  // LHPV7a2) que no se apagaba nunca. Más fuerte (0.5 mV) apagaba también el reflejo de comer.
  d_ada: 0.05,        // mV que sube el umbral por spike
  t_ada: 1000,        // ms que tarda en irse
  suavizar: 100,      // ms: ventana del promedio de las tasas de salida
};

function leerVarint(bytes, ini, n, salida, zigzag) {
  let p = ini;
  for (let i = 0; i < n; i++) {
    let v = 0, s = 0, b;
    do { b = bytes[p++]; v += (b & 127) * 2 ** s; s += 7; } while (b & 128);
    salida[i] = zigzag ? ((v % 2) ? -(v + 1) / 2 : v / 2) : v;
  }
  return p;
}

export class Red {
  /** bytes: Uint8Array con grado (uint32 × N) + destinos (delta-varint) + pesos (zigzag-varint) */
  /** `nuevo(bytes)` da el buffer donde se arma (un SharedArrayBuffer para compartir entre trabajadores). */
  static desde(bytes, indice, nuevo = (n) => new ArrayBuffer(n)) {
    const N = indice.neuronas, E = indice.aristas;
    const grado = new Uint32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + 4 * N));
    const ini = new Uint32Array(nuevo(4 * (N + 1)));
    for (let i = 0; i < N; i++) ini[i + 1] = ini[i] + grado[i];
    if (ini[N] !== E) throw new Error(`conectoma: ${ini[N]} conexiones, se esperaban ${E}`);
    const dst = new Uint32Array(nuevo(4 * E));
    let p = leerVarint(bytes, 4 * N, E, dst, false);
    for (let i = 0; i < N; i++) for (let k = ini[i] + 1; k < ini[i + 1]; k++) dst[k] += dst[k - 1];
    const pesos = new Int16Array(nuevo(2 * E));
    p = leerVarint(bytes, p, E, pesos, true);
    if (p !== bytes.length) throw new Error(`conectoma: sobran ${bytes.length - p} bytes`);
    return new Red(N, ini, dst, pesos, indice);
  }
  constructor(N, ini, dst, pesos, indice) {
    Object.assign(this, { N, ini, dst, pesos, indice });
  }
  grupo(nombre, lado = 'todos') {
    const g = this.indice.grupos[nombre];
    if (!g) throw new Error(`no existe el grupo «${nombre}»`);
    return g[lado] || g.todos;
  }
}

export class Cerebro {
  constructor(red, params = {}) {
    this.red = red; this.P = { ...PARAMS, ...params };
    const { N } = red, P = this.P;
    // por neurona, cuatro números seguidos: voltaje sobre el reposo, corriente sináptica,
    // hasta cuándo está refractaria (ms) y cansancio (lo que sube el umbral)
    this.st = new Float32Array(N * 4);
    this.activa = new Uint8Array(N);
    this.lista = new Int32Array(N); this.nLista = 0;
    this.cuenta = new Uint32Array(N);      // spikes desde la última lectura del mapa (para pintar el cerebro)
    this.t = 0;
    this.pasosRetraso = Math.max(1, Math.round(P.t_dly / P.dt));
    this.anillo = Array.from({ length: this.pasosRetraso + 1 }, () => []);
    this.k = 0;
    // la solución exacta de du/dt = (g - u)/t_mbr, dg/dt = -g/tau en un paso dt
    const a = Math.exp(-P.dt / P.t_mbr), b = Math.exp(-P.dt / P.tau);
    // u_nuevo = a·u + c·g ;  g_nuevo = b·g ;  c = tau/(tau - t_mbr)·(b - a)
    this.A = { uu: a, ug: P.tau / (P.tau - P.t_mbr) * (b - a), gg: b };
    this.aa = P.t_ada > 0 ? Math.exp(-P.dt / P.t_ada) : 0;
    this.w = P.w_syn;
    this.entradas = new Map();   // nombre:lado → { ids, hz }
    this.forzadas = new Uint8Array(N); // neuronas de entrada: disparan por Poisson, sin refractario
    this.silenciadas = new Uint8Array(N);
    this.salidas = {};           // nombre → { ids, tasa }
    for (const s of red.indice.salidas) for (const lado of ['izq', 'der', 'todos'])
      this.salidas[`${s}:${lado}`] = { ids: red.grupo(s, lado), tasa: 0, n: 0 };
    this.spikesPaso = 0; this.spikesTotal = 0;
    this.azar = semilla(1);
  }

  /** Activa un sentido: sus neuronas disparan al azar (Poisson) a `hz` spikes por segundo. 0 lo apaga. */
  estimular(nombre, lado = 'todos', hz = 150, fraccion = 1) {
    const clave = `${nombre}:${lado}`;
    let ids = this.red.grupo(nombre, lado);
    if (fraccion < 1) ids = ids.filter((_, i) => ((i * 2654435761) >>> 0) / 4294967296 < fraccion);
    const antes = this.entradas.get(clave);
    if (antes) for (const i of antes.ids) this.forzadas[i] = Math.max(0, this.forzadas[i] - 1);
    if (hz > 0) { this.entradas.set(clave, { ids, hz }); for (const i of ids) this.forzadas[i]++; }
    else this.entradas.delete(clave);
  }
  apagarTodo() { for (const k of [...this.entradas.keys()]) { const [n, l] = k.split(':'); this.estimular(n, l, 0); } }
  silenciar(ids, si = true) { for (const i of ids) this.silenciadas[i] = si ? 1 : 0; }

  paso() {
    // Todo en variables locales, y el estado de cada neurona JUNTO (u, g, refractario, cansancio en
    // cuatro números seguidos): con propiedades de `this` y cuatro arreglos separados, cada neurona
    // costaba cuatro saltos de memoria y el cerebro iba a una décima del tiempo real.
    const P = this.P, red = this.red, ini = red.ini, dst = red.dst, pesos = red.pesos;
    const st = this.st, activa = this.activa, lista = this.lista;
    const t = this.t, w = this.w;
    let nLista = this.nLista;
    // 1 · llegan los spikes de hace t_dly
    const llegan = this.anillo[this.k % this.anillo.length];
    for (let s = 0, ns = llegan.length; s < ns; s++) {
      const i = llegan[s];
      for (let k = ini[i], fin = ini[i + 1]; k < fin; k++) {
        const j = dst[k];
        st[j * 4 + 1] += pesos[k] * w;
        if (activa[j] === 0) { activa[j] = 1; lista[nLista++] = j; }
      }
    }
    llegan.length = 0;
    this.nLista = nLista;
    // 2 · entradas de los sentidos (Poisson)
    for (const { ids, hz } of this.entradas.values()) {
      const p = hz * P.dt / 1000;
      for (let s = 0; s < ids.length; s++) if (this.azar() < p) this._dispararEntrada(ids[s], t);
    }
    nLista = this.nLista;
    // 3 · integrar sólo las activas; las quietas salen de la lista
    const uu = this.A.uu, ug = this.A.ug, gg = this.A.gg, eps = P.eps, th = P.v_th, aa = this.aa, forzadas = this.forzadas;
    const espera = this.anillo[(this.k + this.pasosRetraso) % this.anillo.length];
    const silenciadas = this.silenciadas, cuenta = this.cuenta, t_rfc = P.t_rfc, d_ada = P.d_ada;
    let n = 0, disparos = 0;
    for (let s = 0; s < nLista; s++) {
      const i = lista[s], b = i * 4;
      const ai = st[b + 3] * aa; st[b + 3] = ai;
      if (t < st[b + 2]) { lista[n++] = i; continue; }       // refractaria: no integra (como Brian)
      const gi = st[b + 1];
      const un = uu * st[b] + ug * gi, gn = gg * gi;
      if (un > th + ai) {                                     // dispara
        st[b] = 0; st[b + 1] = 0; st[b + 2] = t + t_rfc; st[b + 3] = ai + d_ada; cuenta[i]++; disparos++;
        if (silenciadas[i] === 0) espera.push(i);
        lista[n++] = i; continue;
      }
      if (un < eps && un > -eps && gn < eps && gn > -eps && ai < eps && forzadas[i] === 0) { st[b] = 0; st[b + 1] = 0; st[b + 3] = 0; activa[i] = 0; }
      else { st[b] = un; st[b + 1] = gn; lista[n++] = i; }
    }
    this.nLista = n; this.spikesPaso += disparos;
    this.k++; this.t += P.dt;
  }

  _dispararEntrada(i, t) {
    // como el PoissonInput de Shiu: cada evento sube el voltaje 68.75 mV → dispara sin refractario
    this.st[i * 4] = 0; this.st[i * 4 + 1] = 0; this.cuenta[i]++; this.spikesPaso++;
    if (!this.silenciadas[i]) this.anillo[(this.k + this.pasosRetraso) % this.anillo.length].push(i);
  }

  /** Avanza `ms` milisegundos y actualiza las tasas de salida (spikes/s, promedio móvil). */
  avanzar(ms) {
    const pasos = Math.round(ms / this.P.dt);
    const cont = {};
    for (const [k, s] of Object.entries(this.salidas)) cont[k] = s.ids.map((i) => this.cuenta[i]);
    for (let p = 0; p < pasos; p++) this.paso();
    const a = Math.min(1, ms / this.P.suavizar);
    for (const [k, s] of Object.entries(this.salidas)) {
      let n = 0;
      s.ids.forEach((i, j) => { n += this.cuenta[i] - cont[k][j]; });
      const hz = s.ids.length ? n / s.ids.length / (ms / 1000) : 0;
      s.tasa += a * (hz - s.tasa);
    }
    this.spikesTotal += this.spikesPaso; const sp = this.spikesPaso; this.spikesPaso = 0;
    return sp;
  }

  tasa(nombre, lado = 'todos') { return this.salidas[`${nombre}:${lado}`]?.tasa ?? 0; }
  /** Cuántos spikes dio cada neurona desde la última vez que se preguntó (y se ponen en cero). */
  mapa() { const c = this.cuenta.slice(); this.cuenta.fill(0); return c; }
}

/** Azar con semilla (xorshift32): la misma prueba da el mismo resultado. */
export function semilla(s) {
  let x = (s * 2654435761) >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
