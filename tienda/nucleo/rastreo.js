/* ══════════════════════════════════════════════════════════════════════════
   RASTREO · la ubicación del repartidor, sólo con turno abierto
   ──────────────────────────────────────────────────────────────────────────
   Uno solo para toda la app (si se abren dos pantallas, no se mandan dos
   veces). Manda un punto cada 30 s o cada 80 m, lo que pase primero: menos
   batería y menos datos que mandar cada segundo, y alcanza para ver por dónde
   va. Si el GPS no da velocidad, se calcula entre los dos últimos puntos.
   La base rechaza el punto si el turno ya se cerró (política ubic_mandar),
   así que un rastreo olvidado no puede seguir espiando a nadie.
   ═════════════════════════════════════════════════════════════════════════ */
import { mandarUbicacion } from './datos.js';
import { distancia } from './ruta.js';

const CADA_MS = 30000, CADA_KM = 0.08, REINTENTO_MS = 15000;
let vigia = null, turno = null, ultimo = null, estado = 'apagado';
let pendiente = null, enviando = false, reintento = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f(estado, ultimo));

/* ¿Contestó la base que NO (turno cerrado, sin permiso), o ni siquiera se
   llegó a ella? Lo primero apaga el rastreo; lo segundo es un hueco de señal
   —un túnel, un estacionamiento— y se reintenta. Antes cualquier falla lo
   apagaba, y un repartidor que perdía la red un minuto dejaba de verse en el
   mapa el resto del turno. */
export const esRechazo = (e) => typeof e?.causa?.code === 'string' && e.causa.code !== '' && !/fetch|network|red/i.test(e.causa.message || '');

async function mandar(){
  clearTimeout(reintento); reintento = null;
  if(enviando || !pendiente || !turno) return;
  const x = pendiente; enviando = true;
  try{
    await mandarUbicacion(turno, x.coords);
    if(pendiente === x) pendiente = null;
    ultimo = x.punto; estado = 'compartiendo';
  }catch(e){
    if(esRechazo(e)){ console.error(e); estado = 'rechazado'; enviando = false; rastreo.detener(false); pendiente = null; avisar(); return; }
    estado = 'sin-red'; reintento = setTimeout(mandar, REINTENTO_MS);
  }
  enviando = false; avisar();
  if(pendiente && pendiente !== x) mandar();          // llegó uno más nuevo mientras se mandaba
}

export const rastreo = {
  get estado(){ return estado; },
  get ultimo(){ return ultimo; },
  alCambiar(f){ oyentes.add(f); f(estado, ultimo); return () => oyentes.delete(f); },
  iniciar(turnoId){
    if(!navigator.geolocation){ estado = 'sin-gps'; avisar(); return; }
    if(vigia != null && turno === turnoId) return;
    this.detener();
    turno = turnoId; estado = 'buscando'; avisar();
    vigia = navigator.geolocation.watchPosition((pos) => {
      const c = pos.coords, ahora = pos.timestamp || Date.now();
      const punto = { lat: c.latitude, lng: c.longitude, cuando: ahora };
      const km = ultimo ? distancia(ultimo, punto) : Infinity;
      if(!pendiente && ultimo && ahora - ultimo.cuando < CADA_MS && km < CADA_KM) return;
      let velocidad = Number.isFinite(c.speed) && c.speed >= 0 ? c.speed : null;
      // Calculada entre puntos sólo con 10 s o más de separación: el GPS
      // «brinca» decenas de metros al recuperar señal, y en dos segundos eso
      // parece 200 km/h. Lo imposible en ciudad (>150 km/h) se descarta.
      if(velocidad == null && ultimo && ahora - ultimo.cuando >= 10000) velocidad = (km * 1000) / ((ahora - ultimo.cuando) / 1000);
      if(velocidad != null && velocidad > 150 / 3.6) velocidad = null;
      // Sin red se guarda sólo el más reciente: al volver la señal importa
      // dónde está, no el camino que hizo mientras no se veía.
      pendiente = { coords: { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, heading: c.heading, speed: velocidad },
        punto: { ...punto, velocidad, precision: c.accuracy } };
      mandar();
    }, (err) => { estado = err.code === 1 ? 'sin-permiso' : 'sin-señal'; avisar(); },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  },
  detener(limpiar = true){
    if(vigia != null) navigator.geolocation.clearWatch(vigia);
    vigia = null; clearTimeout(reintento); reintento = null;
    if(limpiar){ turno = null; ultimo = null; pendiente = null; estado = 'apagado'; avisar(); }
  },
};

export const TEXTO_RASTREO = {
  apagado: 'Ubicación apagada',
  buscando: 'Buscando señal de GPS…',
  compartiendo: 'Compartiendo tu ubicación con la tienda',
  'sin-permiso': 'Sin permiso de ubicación: actívalo para que la tienda vea tu ruta',
  'sin-señal': 'Sin señal de GPS',
  'sin-red': 'Sin internet: tu ubicación se manda sola en cuanto regrese la señal',
  'sin-gps': 'Este teléfono no tiene GPS',
  rechazado: 'Tu turno no está abierto: no se comparte nada',
};
