/* Lo que el motor necesita cargado antes de pintar: letras, textura e iconos. */
const BASE = new URL('.', import.meta.url);
export const FAMILIAS = [
  ['Anton', 'fuentes/Anton-Regular.woff2', '400'],
  ['Bebas Neue', 'fuentes/BebasNeue-Regular.woff2', '400'],
  ['Permanent Marker', 'fuentes/PermanentMarker-Regular.woff2', '400'],
  ['Kalam', 'fuentes/Kalam-Bold.woff2', '700'],
  ['Oswald', 'fuentes/Oswald.woff2', '200 700'],
  ['Playfair Display', 'fuentes/PlayfairDisplay.woff2', '400 900'],
  ['Montserrat', 'fuentes/Montserrat.woff2', '100 900'],
];
export async function cargarLetras() {
  await Promise.all(FAMILIAS.map(async ([fam, url, peso]) => {
    const f = new FontFace(fam, `url(${new URL(url, BASE)})`, { weight: peso });
    await f.load(); document.fonts.add(f);
  }));
}
export function cargarImagen(src) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
}
let LUCIDE = null;
export async function preparar() {
  const [, textura, iconos] = await Promise.all([
    cargarLetras(),
    cargarImagen(new URL('../presentaciones/texturas/concreto.jpg', BASE).href).catch(() => null),
    fetch(new URL('../presentaciones/vendor/lucide-1.48.0.json', BASE)).then(r => r.json()).then(d => d.iconos).catch(() => ({})),
  ]);
  LUCIDE = iconos;
  const cache = new Map(), pendientes = [];
  const icono = (nombre, color) => {
    const k = nombre + color;
    if (!cache.has(k) && LUCIDE[nombre]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${LUCIDE[nombre]}</svg>`;
      const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); cache.set(k, i);
      pendientes.push(i.decode().catch(() => {}));
    }
    return cache.get(k);
  };
  /** Pinta dos veces si hizo falta cargar iconos nuevos: la primera los pide, la segunda los usa. */
  const listos = async () => { const p = pendientes.splice(0); await Promise.all(p); return p.length; };
  return { textura, icono, listos };
}
