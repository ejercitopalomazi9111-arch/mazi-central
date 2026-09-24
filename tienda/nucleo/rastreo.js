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

const CADA_MS = 30000, CADA_KM = 0.08;
let vigia = null, turno = null, ultimo = null, estado = 'apagado';
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f(estado, ultimo));

export const rastreo = {
  get estado(){ return estado; },
  get ultimo(){ return ultimo; },
  alCambiar(f){ oyentes.add(f); f(estado, ultimo); return () => oyentes.delete(f); },
  iniciar(turnoId){
    if(!navigator.geolocation){ estado = 'sin-gps'; avisar(); return; }
    if(vigia != null && turno === turnoId) return;
    this.detener();
    turno = turnoId; estado = 'buscando'; avisar();
    vigia = navigator.geolocation.watchPosition(async (pos) => {
      const c = pos.coords, ahora = pos.timestamp || Date.now();
      const punto = { lat: c.latitude, lng: c.longitude, cuando: ahora };
      const km = ultimo ? distancia(ultimo, punto) : Infinity;
      if(ultimo && ahora - ultimo.cuando < CADA_MS && km < CADA_KM) return;
      let velocidad = Number.isFinite(c.speed) && c.speed >= 0 ? c.speed : null;
      if(velocidad == null && ultimo && ahora > ultimo.cuando) velocidad = (km * 1000) / ((ahora - ultimo.cuando) / 1000);
      try{
        await mandarUbicacion(turno, { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, heading: c.heading, speed: velocidad });
        ultimo = { ...punto, velocidad, precision: c.accuracy }; estado = 'compartiendo';
      }catch(e){
        // Turno cerrado u otro rechazo de la base: se apaga, no se insiste.
        console.error(e); estado = 'rechazado'; this.detener(false);
      }
      avisar();
    }, (err) => { estado = err.code === 1 ? 'sin-permiso' : 'sin-señal'; avisar(); },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  },
  detener(limpiar = true){
    if(vigia != null) navigator.geolocation.clearWatch(vigia);
    vigia = null;
    if(limpiar){ turno = null; ultimo = null; estado = 'apagado'; avisar(); }
  },
};

export const TEXTO_RASTREO = {
  apagado: 'Ubicación apagada',
  buscando: 'Buscando señal de GPS…',
  compartiendo: 'Compartiendo tu ubicación con la tienda',
  'sin-permiso': 'Sin permiso de ubicación: actívalo para que la tienda vea tu ruta',
  'sin-señal': 'Sin señal de GPS',
  'sin-gps': 'Este teléfono no tiene GPS',
  rechazado: 'Tu turno no está abierto: no se comparte nada',
};
