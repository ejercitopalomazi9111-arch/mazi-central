/* Lugares con coordenadas del centro de la ciudad, redondeadas a dos decimales
   —eso son ±600 m, que en salida y puesta del sol valen unos segundos— y con
   el huso ESTÁNDAR.

   ⚠ NINGUNO DE ESTOS SITIOS ADELANTA EL RELOJ EN VERANO, y están elegidos por
   eso. México lo abolió en 2022 (salvo la franja fronteriza, que por eso no
   sale aquí: Tijuana sí adelanta); Islandia, Ecuador y Argentina nunca lo han
   tenido. Meter un lugar con horario de verano obligaría a llevar la tabla de
   cuándo empieza y termina en cada país y a mantenerla — y una tabla así, mal
   mantenida, publica horas equivocadas sin avisar. Para cualquier otro sitio
   está «mi ubicación», que usa el huso del propio aparato y por tanto siempre
   acierta. */
export const LUGARES = [
  { id:'cdmx',  nombre:'Ciudad de México', lat: 19.43, lon: -99.13, huso:-360 },
  { id:'qro',   nombre:'Querétaro',        lat: 20.59, lon:-100.39, huso:-360 },
  { id:'mty',   nombre:'Monterrey',        lat: 25.69, lon:-100.32, huso:-360 },
  { id:'mid',   nombre:'Mérida',           lat: 20.97, lon: -89.62, huso:-360 },
  { id:'lap',   nombre:'La Paz',           lat: 24.14, lon:-110.31, huso:-420 },
  { id:'uio',   nombre:'Quito',            lat: -0.18, lon: -78.47, huso:-300 },
  { id:'ush',   nombre:'Ushuaia',          lat:-54.80, lon: -68.30, huso:-180 },
  { id:'rey',   nombre:'Reikiavik',        lat: 64.15, lon: -21.94, huso:   0 },
];
