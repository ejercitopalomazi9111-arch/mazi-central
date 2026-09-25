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

/* ¿Cuándo lo quiere el cliente? Viene en las notas del pedido que arma
   cliente/pedir.js: nada = lo antes posible, «Para: hoy en la tarde»,
   «Para: mañana». */
export const TANDAS = [{ id: 0, texto: 'Lo antes posible' }, { id: 1, texto: 'En la tarde' }, { id: 2, texto: 'Es para mañana' }];
export function tandaDeNotas(notas = ''){
  const n = String(notas || '').toLowerCase();
  return /para: mañana|para: manana/.test(n) ? 2 : /para: hoy en la tarde/.test(n) ? 1 : 0;
}

/* Por tandas: primero todo lo urgente con la mejor ruta, luego lo de la
   tarde saliendo de donde acabó lo urgente, y al final lo de mañana. Antes
   la ruta sólo miraba distancia y podía dejar al que lo pidió «lo antes
   posible» después del que dijo «en la tarde». */
export function ordenarPorTandas(origen, paradas){
  const grupos = TANDAS.map((t) => paradas.filter((p) => (p.tanda || 0) === t.id));
  let desde = tieneLugar(origen) ? origen : null, km = 0, orden = [], sinLugar = [], cuantas = 0;
  for(const g of grupos){
    if(!g.length) continue;
    const r = ordenar(desde, g);
    orden = orden.concat(r.orden.filter(tieneLugar)); sinLugar = sinLugar.concat(r.sinLugar);
    km += r.km;                                   // ordenar() ya cuenta el tramo desde `desde`
    cuantas += r.orden.filter(tieneLugar).length;
    desde = r.orden.filter(tieneLugar).at(-1) || desde;
  }
  return { orden: [...orden, ...sinLugar], sinLugar, km, minutos: estimarMinutos(km, cuantas) };
}

/* La ruta en ligas de Google Maps, por tramos. Google acepta a lo más TRES
   paradas intermedias cuando la liga se abre en el navegador del teléfono
   (nueve en otros lados; documentación de Maps URLs, verificada el 25 de
   septiembre de 2026). Antes iba todo en una liga con hasta nueve: en el
   teléfono se perdían paradas, y de la once en adelante se tiraban calladas.
   Cada tramo sale de donde acabó el anterior, así que se recorren en orden. */
export const POR_TRAMO = 4;
export function tramosMaps(origen, paradas, porTramo = POR_TRAMO){
  const con = paradas.filter(tieneLugar), tramos = [];
  const xy = (p) => `${+p.lat.toFixed(6)},${+p.lng.toFixed(6)}`;
  for(let i = 0; i < con.length; i += porTramo){
    const grupo = con.slice(i, i + porTramo), desde = i ? con[i - 1] : (tieneLugar(origen) ? origen : null);
    const destino = grupo.at(-1), intermedias = grupo.slice(0, -1);
    const url = 'https://www.google.com/maps/dir/?api=1' + (desde ? `&origin=${xy(desde)}` : '') + `&destination=${xy(destino)}`
      + (intermedias.length ? `&waypoints=${encodeURIComponent(intermedias.map(xy).join('|'))}` : '') + '&travelmode=driving';
    tramos.push({ desde: i + 1, hasta: i + grupo.length, paradas: grupo, url });
  }
  return tramos;
}

/* En ciudad un repartidor en moto promedia ~22 km/h puerta a puerta, y cada
   entrega se lleva ~5 minutos. La línea recta se multiplica por 1.35: las
   calles no van derecho. */
export const estimarMinutos = (kmRecta, paradas) => Math.round(kmRecta * 1.35 / 22 * 60 + paradas * 5);
