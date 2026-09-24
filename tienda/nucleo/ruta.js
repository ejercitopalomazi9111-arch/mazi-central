/* ══════════════════════════════════════════════════════════════════════════
   RUTA · en qué orden visitar las paradas
   ──────────────────────────────────────────────────────────────────────────
   El adaptador sin servidor del plan (§8): vecino más cercano para empezar y
   2-opt para desenredar los cruces. Para 30 paradas corre en milisegundos en
   un teléfono. Mide en línea recta (haversine): no sabe de calles de un solo
   sentido; VROOM + OSRM lo harán cuando haya dónde hospedarlos, con la misma
   firma que ordenar().
   Módulo puro: lo prueba pruebas-ruta.mjs contra la ruta óptima por fuerza
   bruta en casos chicos.
   ═════════════════════════════════════════════════════════════════════════ */

const R = 6371;   // km
export function distancia(a, b){
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
export const tieneLugar = (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng);

/* Largo de un recorrido que sale de `origen` y visita `orden` (sin regresar). */
export function largo(origen, orden){
  let t = 0, a = origen;
  for(const p of orden){ if(a) t += distancia(a, p); a = p; }
  return t;
}

function vecinoMasCercano(origen, paradas){
  const quedan = [...paradas], salida = [];
  let a = origen || quedan[0];
  while(quedan.length){
    let k = 0, mejor = Infinity;
    quedan.forEach((p, i) => { const d = distancia(a, p); if(d < mejor){ mejor = d; k = i; } });
    a = quedan.splice(k, 1)[0]; salida.push(a);
  }
  return salida;
}

/* 2-opt: si invertir un tramo acorta, se invierte. Hasta que nada mejore. */
function dosOpt(origen, orden){
  const r = [...orden];
  const nodo = (i) => i < 0 ? origen : r[i];
  let mejoro = true, vueltas = 0;
  while(mejoro && vueltas++ < 200){
    mejoro = false;
    for(let i = 0; i < r.length - 1; i++){
      for(let j = i + 1; j < r.length; j++){
        const a = nodo(i - 1), b = r[i], c = r[j], d = r[j + 1];
        if(!a) continue;
        const antes = distancia(a, b) + (d ? distancia(c, d) : 0);
        const despues = distancia(a, c) + (d ? distancia(b, d) : 0);
        if(despues + 1e-9 < antes){ r.splice(i, j - i + 1, ...r.slice(i, j + 1).reverse()); mejoro = true; }
      }
    }
  }
  return r;
}

/* Or-opt: sacar UNA parada y meterla donde quede mejor. Arregla lo que 2-opt
   no ve: la parada que quedó «de pasada» en el lugar equivocado. */
function moverUna(origen, r){
  let mejoro = false;
  for(let i = 0; i < r.length; i++){
    const [p] = r.splice(i, 1);
    let mejor = -1, costo = largo(origen, [...r.slice(0, i), p, ...r.slice(i)]);
    for(let j = 0; j <= r.length; j++){
      if(j === i) continue;
      const c = largo(origen, [...r.slice(0, j), p, ...r.slice(j)]);
      if(c + 1e-9 < costo){ costo = c; mejor = j; }
    }
    r.splice(mejor >= 0 ? mejor : i, 0, p);
    if(mejor >= 0) mejoro = true;
  }
  return mejoro;
}
function pulir(origen, orden){
  let r = orden;
  for(let v = 0; v < 20; v++){ r = dosOpt(origen, r); if(!moverUna(origen, r)) break; }
  return r;
}

/* paradas: [{ id, lat, lng, … }]. Las que no tienen lugar van al final, en el
   orden en que llegaron, y se devuelven aparte para que la pantalla lo diga. */
export function ordenar(origen, paradas){
  const con = paradas.filter(tieneLugar), sin = paradas.filter((p) => !tieneLugar(p));
  const o = tieneLugar(origen) ? origen : null;
  // Varios arranques: empezar por cada una de las 6 paradas más cercanas y
  // quedarse con la mejor. Con 30 paradas sigue siendo cosa de milisegundos.
  let orden = vecinoMasCercano(o, con);
  if(con.length > 2){
    const primeras = o ? [...con].sort((a, b) => distancia(o, a) - distancia(o, b)).slice(0, 6) : con.slice(0, 6);
    let mejor = Infinity;
    for(const p of primeras){
      const r = pulir(o, [p, ...vecinoMasCercano(p, con.filter((x) => x !== p))]);
      const l = largo(o, r);
      if(l < mejor){ mejor = l; orden = r; }
    }
  }
  const km = largo(o, orden);
  return { orden: [...orden, ...sin], sinLugar: sin, km, minutos: estimarMinutos(km, orden.length) };
}

/* En ciudad un repartidor en moto promedia ~22 km/h puerta a puerta, y cada
   entrega se lleva ~5 minutos. La línea recta se multiplica por 1.35: las
   calles no van derecho. */
export const estimarMinutos = (kmRecta, paradas) => Math.round(kmRecta * 1.35 / 22 * 60 + paradas * 5);
