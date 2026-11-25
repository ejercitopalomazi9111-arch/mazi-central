/* MAZI VR · OBSTÁCULOS Y LÍMITES SEGUROS (guía de Carlos, 19 nov: «mapeo automático de la habitación, detección de
   obstáculos y límites de seguridad»). Sale del mapa de puntitos (nube.js), que ya se dibuja solo mientras rastrea:
     · EL PISO: la capa de 5 cm con MÁS puntos entre 0.7 y 2 m abajo de tus ojos (el piso es el plano más grande que ve la
       cámara). No «lo más bajo»: el rastreo deja ruido muy abajo, y con la caminata real del iPhone eso daba el piso a
       −3 m y el piso de verdad contaba como obstáculo. Sin capa clara (menos de 20 puntos), no hay obstáculos.
     · OBSTÁCULOS: el cuarto se parte en casillas de 10 cm vistas desde arriba. Una casilla es obstáculo si tiene al menos 4
       puntos entre 15 cm arriba del piso y 30 cm arriba de tus ojos Y esos puntos cubren 12 cm de alto o más (la orilla de
       una cama, una pared, la pata de una mesa). Un grumo de puntos a una sola altura suele ser ruido del rastreo: con la
       caminata real del iPhone, sin esta regla, «había algo» a 25 cm todo el tiempo.
     · AVISO: si la casilla de obstáculo más cercana queda a menos de 50 cm de tu cabeza (de lado, sin contar la altura),
       avisa; deja de avisar hasta que te alejas a 65 cm (si no, parpadea en la orilla).
     · ZONA SEGURA: un círculo alrededor de donde estabas al prender el 6DoF (o al centrar), de 1 m de radio. Al llegar al
       80 % se empieza a ver la pared de la zona; afuera, avisa.
   Sin dependencias: se prueba en Node (vr/pruebas-limites.mjs). Coordenadas del mundo de three (y arriba), metros. */
/** TOPES TEMPORALES DEL 6DoF (Carlos, 20 nov: «que con el 6DoF no puedas salir de la zona segura, que no puedas atravesar
    el suelo y que si subes no puedas subir más de un cierto límite… un arreglo temporal en lo que lo terminamos»).
    p: tu cabeza en el espacio del cuerpo (lo que mueve el 6DoF, no el stick); base: dónde arrancó (o donde recentraste).
    · de lado, no sale del círculo de radio R alrededor de la base;
    · abajo, nunca más bajo que el suelo (+ margen);
    · arriba, nunca más de `subir` sobre la altura de arranque.
    Cambia p en su lugar y regresa qué tope tocó ('' si ninguno). */
export const TOPES = { margenSuelo: .1, subir: .6 };
export function toparCabeza(p, base, R, suelo, T = TOPES){
  let toco = '';
  const dx = p.x - base.x, dz = p.z - base.z, d = Math.hypot(dx, dz);
  if(R > 0 && d > R){ p.x = base.x + dx * R / d; p.z = base.z + dz * R / d; toco = 'zona'; }
  const min = suelo + T.margenSuelo, max = Math.max(min, base.y + T.subir);
  if(p.y < min){ p.y = min; toco = toco || 'suelo'; } else if(p.y > max){ p.y = max; toco = toco || 'techo'; }
  return toco;
}
export const LIMITES = { celda: .1, minPuntos: 4, alto: .12, sobrePiso: .15, sobreOjos: .3, aviso: .5, soltar: .65, radio: 1, verPared: .8, buscar: 1.5, pisoMin: .7, pisoMax: 2, pisoPuntos: 20 };

export function crearLimites(op = {}){
  const L = { ...LIMITES, ...op };
  const celdas = new Map();            /* "i,j" → alturas de sus puntos (hasta 24) */
  const hist = new Map(); let total = 0;  /* alturas en casillas de 5 cm, para el piso */
  const st = { piso: null, cerca: Infinity, haciaX: 0, haciaZ: 0, obstaculo: false, zona: null, fuera: false, pared: 0, leidos: 0 };
  /* ¿la casilla es obstáculo? cuántos de sus puntos caen en la franja y cuánto alto cubren */
  const esObstaculo = (c, lo, hi) => { let k = 0, ymin = Infinity, ymax = -Infinity; for(const y of c) if(y >= lo && y <= hi){ k++; if(y < ymin) ymin = y; if(y > ymax) ymax = y; }
    return k >= L.minPuntos && ymax - ymin >= L.alto; };
  const clave = (x, z) => `${Math.floor(x / L.celda)},${Math.floor(z / L.celda)}`;

  /** suma puntos nuevos: pos = Float32Array [x,y,z,...], desde el índice (en puntos) que no se había leído */
  function agregar(pos, n){
    for(let i = st.leidos; i < n; i++){
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if(!Number.isFinite(x + y + z)) continue;
      const k = clave(x, z); let c = celdas.get(k); if(!c){ c = []; celdas.set(k, c); } if(c.length < 24) c.push(y);
      const h = Math.floor(y / .05); hist.set(h, (hist.get(h) || 0) + 1); total++;
    }
    st.leidos = Math.max(st.leidos, n);
  }
  /* la capa más poblada abajo de los ojos (contando sus dos vecinas, por si el piso cae entre dos capas) */
  function piso(hy){
    let mejor = null, max = 0;
    for(let h = Math.floor((hy - L.pisoMax) / .05); h <= Math.floor((hy - L.pisoMin) / .05); h++){
      const k = (hist.get(h - 1) || 0) + (hist.get(h) || 0) * 2 + (hist.get(h + 1) || 0); if(k > max){ max = k; mejor = h; } }
    return max >= L.pisoPuntos * 2 ? mejor * .05 + .025 : null;
  }
  function olvidar(){ celdas.clear(); hist.clear(); total = 0; st.leidos = 0; st.piso = null; st.cerca = Infinity; st.obstaculo = false; }
  const ponerZona = (c, radio = L.radio) => { st.zona = { x: c[0], z: c[2], radio }; st.fuera = false; st.pared = 0; };

  /** cabeza: [x,y,z] en el mundo. Regresa qué avisar ahora (o null) */
  function paso(cabeza){
    const [hx, hy, hz] = cabeza; let mejor = Infinity, bx = 0, bz = 0;
    st.piso = piso(hy);
    if(st.piso != null){
      const lo = st.piso + L.sobrePiso, hi = hy + L.sobreOjos, R = Math.ceil(L.buscar / L.celda), ci = Math.floor(hx / L.celda), cj = Math.floor(hz / L.celda);
      for(let i = ci - R; i <= ci + R; i++) for(let j = cj - R; j <= cj + R; j++){
        const c = celdas.get(`${i},${j}`); if(!c || c.length < L.minPuntos) continue;
        if(!esObstaculo(c, lo, hi)) continue;
        /* distancia al borde más cercano de la casilla */
        const dx = Math.max(i * L.celda - hx, 0, hx - (i + 1) * L.celda), dz = Math.max(j * L.celda - hz, 0, hz - (j + 1) * L.celda), d = Math.hypot(dx, dz);
        if(d < mejor){ mejor = d; bx = (i + .5) * L.celda; bz = (j + .5) * L.celda; }
      }
    }
    st.cerca = mejor; st.haciaX = bx; st.haciaZ = bz;
    const antes = st.obstaculo; st.obstaculo = antes ? mejor < L.soltar : mejor < L.aviso;
    let aviso = null;
    if(st.obstaculo && !antes) aviso = 'obstaculo';
    if(st.zona){ const d = Math.hypot(hx - st.zona.x, hz - st.zona.z), f = d / st.zona.radio;
      st.pared = Math.max(0, Math.min(1, (f - L.verPared) / (1 - L.verPared)));
      const fuera = st.fuera ? f > .95 : f > 1; if(fuera && !st.fuera && !aviso) aviso = 'zona'; st.fuera = fuera; }
    return aviso;
  }
  /** las casillas de obstáculo cerca (para pintarlas): [{x, z}] */
  function cercanas(cabeza, radio = 1.2){
    const out = []; if(st.piso == null) return out;
    const [hx, hy, hz] = cabeza, lo = st.piso + L.sobrePiso, hi = hy + L.sobreOjos;
    for(const [k, c] of celdas){ if(c.length < L.minPuntos) continue; const [i, j] = k.split(',').map(Number), x = (i + .5) * L.celda, z = (j + .5) * L.celda;
      if(Math.hypot(x - hx, z - hz) <= radio && esObstaculo(c, lo, hi)) out.push({ x, z }); }
    return out;
  }
  return { st, agregar, paso, olvidar, ponerZona, cercanas };
}
