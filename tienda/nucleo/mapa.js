/* ══════════════════════════════════════════════════════════════════════════
   MAPA · el adaptador (regla §2: conectar sí, depender no)
   ──────────────────────────────────────────────────────────────────────────
   Leaflet vendorizado + mosaicos de un proveedor. Cambiar de proveedor es
   cambiar MOSAICOS aquí, o poner ajustes.mapa.mosaicos en el negocio. Las
   pantallas nunca tocan Leaflet directo: llaman a crearMapa() y usan lo que
   devuelve (marcador, linea, encuadrar).
   Si el mapa no carga (sin red, proveedor caído), la pantalla sigue: la lista
   de paradas y los botones de navegar no dependen de él.
   ═════════════════════════════════════════════════════════════════════════ */
import { esc } from './piezas.js';

const MOSAICOS = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  atribucion: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  max: 19,
};

let _leaflet;
function cargar(){
  return _leaflet ??= new Promise((ok, mal) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'nucleo/vendor/leaflet-1.9.4/leaflet.css';
    const js = document.createElement('script');
    js.src = 'nucleo/vendor/leaflet-1.9.4/leaflet.js';
    js.onload = () => ok(self.L);
    js.onerror = () => { _leaflet = undefined; mal(new Error('No cargó el mapa')); };
    document.head.append(css, js);
  });
}

/* Marcadores nuestros, sin imágenes: un círculo con número o ícono. */
const pin = (L, { texto = '', clase = '' } = {}) => L.divIcon({
  className: 'pin-mapa ' + clase, html: `<span>${esc(texto)}</span>`, iconSize: [34, 34], iconAnchor: [17, 17],
});

export async function crearMapa(el, { centro = { lat: 20.5888, lng: -100.3899 }, zoom = 13, mosaicos } = {}){
  const L = await cargar();
  // Si mientras cargaba se cambió de pantalla, la caja ya no está en la
  // página: crear el mapa ahí truena por dentro de Leaflet (_leaflet_pos).
  if(!el.isConnected) throw new Error('pantalla cerrada');
  const m = mosaicos || MOSAICOS;
  const mapa = L.map(el, { zoomControl: true, attributionControl: true }).setView([centro.lat, centro.lng], zoom);
  L.tileLayer(m.url, { maxZoom: m.max || 19, attribution: m.atribucion }).addTo(mapa);
  const capas = L.layerGroup().addTo(mapa);
  // El mapa se crea antes de que su caja tenga tamaño final: se le avisa.
  let vivo = true;
  const ro = new ResizeObserver(() => { if(vivo && el.isConnected) mapa.invalidateSize(); });
  ro.observe(el);
  return {
    marcador(p, opciones = {}){
      const mk = L.marker([p.lat, p.lng], { icon: pin(L, opciones), title: opciones.titulo || '' }).addTo(capas);
      if(opciones.globo) mk.bindPopup(opciones.globo);
      return { mover: (q) => mk.setLatLng([q.lat, q.lng]), quitar: () => mk.remove() };
    },
    linea(puntos){ return L.polyline(puntos.map((p) => [p.lat, p.lng]), { color: getComputedStyle(el).getPropertyValue('--acento') || '#8E1B1B', weight: 4, opacity: .75, dashArray: '8 8' }).addTo(capas); },
    encuadrar(puntos){
      const ps = puntos.filter((p) => Number.isFinite(p?.lat));
      if(!vivo || !el.isConnected) return;
      if(ps.length === 1) mapa.setView([ps[0].lat, ps[0].lng], 15, { animate: false });
      else if(ps.length) mapa.fitBounds(ps.map((p) => [p.lat, p.lng]), { padding: [36, 36], animate: false });
    },
    limpiar: () => capas.clearLayers(),
    destruir(){ vivo = false; ro.disconnect(); try{ mapa.stop(); mapa.remove(); }catch(e){} },
  };
}
