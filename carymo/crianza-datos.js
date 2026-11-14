/* crianza-datos.js — TUS MASCOTAS CRECEN (Carlos, 14 nov)
 * ===========================================================================
 * «Mete un sistema de accesorios, customizables, skins para las mascotas. Que la mascota tenga un nivel de
 * experiencia y pueda ir subiendo… para que la gente no se quede siempre con la misma: empiezas con tu perrito,
 * lo subes a nivel 10, te compras otro… y tienes que irlos intercalando, y suben de nivel contigo mientras haces
 * prácticas». «Que empiecen como bebés y vayan creciendo: en gallinas sería huevo, pollito, gallina… y luego se
 * hace vieja». «Y si se te muere, mamaste».
 *
 * Lo leen los dos lados: el servidor (sala/servidor/palomium.js) cobra, sube niveles y decide si se murió; la
 * página pinta. Sin DOM aquí.
 *
 *   · Cada mascota que tienes lleva su XP. Sólo gana la que está contigo (la «activa»), con lo mismo que tú.
 *   · Hasta nivel 10 gana todo; después sólo un tercio: ya creció, dale chance a otra (por eso conviene tener varias).
 *   · Etapas: las aves empiezan en HUEVO (nivel 1); todas pasan por bebé (≤3), joven (≤7), adulta (≤15) y sabia (16+).
 *   · Si NADIE la cuida (hambre, limpieza o ánimo en cero) por 3 días seguidos, SE VA (Carlos, 14 nov: «que no se
 *     mueran, que se vayan y dejen una nota de que se fueron a buscar una mejor vida, y sólo pagando un montón de
 *     palomium pueden volver»). Regresa con su nivel y su ropa. En los datos el campo sigue llamándose `muerta`
 *     (la fecha en que se fue) para no romper lo guardado.
 * ===========================================================================*/
export const ESPECIES = {
  perrito: { nombre: 'Perrito', precio: 40, basica: true },
  gatito: { nombre: 'Gatito', precio: 40, basica: true },
  paloma: { nombre: 'Paloma', precio: 40, basica: true, ave: true },
  tigre: { nombre: 'Tigre', precio: 40, basica: true },
  conejo: { nombre: 'Conejo', precio: 70 },
  pinguino: { nombre: 'Pingüino', precio: 90, ave: true },
  foca: { nombre: 'Foca', precio: 100 },
  ballena: { nombre: 'Ballena', precio: 140 },
};
export const ETAPAS = { huevo: 'Huevo', bebe: 'Bebé', joven: 'Joven', adulto: 'Adulto', viejo: 'Sabio' };
export const NIVEL_MAX = 30, NIVEL_LENTO = 10, FACTOR_LENTO = 1 / 3;
export const MUERE_HORAS = 72;
/* lo que cuesta que regrese: «un montón» (lo más caro de la tienda es la ballena, 140) */
export const precioRegreso = (nivel) => 300 + 20 * Math.max(1, nivel | 0);
/* la nota que deja al irse; cambia con la especie para que no suene a plantilla */
const DESPEDIDA = {
  perrito: 'Te esperé en la puerta tres días. Me fui a buscar a alguien que me saque a pasear.',
  gatito: 'Me cansé de que nadie llenara mi plato. Me fui a buscar una casa con más atún y más mimos.',
  paloma: 'Volé lejos a buscar una plaza donde alguien me eche semillas. El cielo es grande.',
  tigre: 'Un tigre necesita comer y jugar. Me fui a buscar una mejor vida en la selva.',
  conejo: 'Me fui saltando a buscar un jardín con zanahorias y alguien que me acaricie las orejas.',
  pinguino: 'Me fui nadando a buscar una colonia que sí me haga caso. Hace frío sin ti, pero más frío sin comida.',
  foca: 'Me fui al mar a buscar una mejor vida. Allá los peces no se acaban.',
  ballena: 'El océano es enorme y yo tenía hambre. Me fui a buscar una mejor vida.',
};
export const notaDespedida = (especie) => DESPEDIDA[especie] || 'Me fui a buscar una mejor vida.';

export const nivelMascota = (xp) => Math.min(NIVEL_MAX, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 15)));
export const xpDeNivel = (n) => 15 * (Math.max(1, n) - 1) ** 2;
export function etapaDe(especie, nivel){
  if(ESPECIES[especie]?.ave && nivel <= 1) return 'huevo';
  return nivel <= 3 ? 'bebe' : nivel <= 7 ? 'joven' : nivel <= 15 ? 'adulto' : 'viejo';
}

/* lo que se le pone: accesorios (hasta 3 a la vez) y colores. «creador» sólo se da a los creadores de contenido */
export const ACCESORIOS = {
  birrete: { nombre: 'Birrete', precio: 15, lugar: 'cabeza' },
  corona: { nombre: 'Corona', precio: 35, lugar: 'cabeza' },
  fiesta: { nombre: 'Gorro de fiesta', precio: 12, lugar: 'cabeza' },
  sombrero: { nombre: 'Sombrero', precio: 20, lugar: 'cabeza' },
  gorra: { nombre: 'Gorra', precio: 14, lugar: 'cabeza' },
  mono: { nombre: 'Moño', precio: 10, lugar: 'oreja' },
  flor: { nombre: 'Flor', precio: 8, lugar: 'oreja' },
  lentes: { nombre: 'Lentes', precio: 12, lugar: 'ojos' },
  lentesSol: { nombre: 'Lentes de sol', precio: 18, lugar: 'ojos' },
  audifonos: { nombre: 'Audífonos', precio: 25, lugar: 'orejas' },
  bufanda: { nombre: 'Bufanda', precio: 16, lugar: 'cuello' },
  corbatin: { nombre: 'Corbatín', precio: 10, lugar: 'cuello' },
  /* de regalo: no se venden (precio null); los pone la casa a mano a quien se lo ganó */
  pincel: { nombre: 'Pincel de artista', precio: null, lugar: 'espalda', regalo: true },
  boina: { nombre: 'Boina de artista', precio: null, lugar: 'cabeza', regalo: true },
  capaMazi: { nombre: 'Capa Grupo Mazi', precio: null, lugar: 'espalda', regalo: true },
  coronaMazi: { nombre: 'Corona Mazi', precio: null, lugar: 'cabeza', regalo: true },
  perlas: { nombre: 'Collar de perlas', precio: null, lugar: 'cuello', regalo: true },
};
export const SKINS = {
  normal: { nombre: 'Normal', precio: 0, filtro: '' },
  menta: { nombre: 'Menta', precio: 25, filtro: 'hue-rotate(110deg) saturate(1.1)' },
  noche: { nombre: 'Noche', precio: 30, filtro: 'hue-rotate(200deg) brightness(.82) saturate(1.3)' },
  lava: { nombre: 'Lava', precio: 30, filtro: 'hue-rotate(-50deg) saturate(1.6)' },
  dorado: { nombre: 'Dorado', precio: 60, filtro: 'sepia(.7) saturate(2.2) hue-rotate(-10deg) brightness(1.08)' },
  galaxia: { nombre: 'Galaxia', precio: 80, filtro: 'hue-rotate(250deg) saturate(1.8) contrast(1.05)' },
  arcoiris: { nombre: 'Arcoíris', precio: 120, filtro: 'arcoiris' },
  creador: { nombre: 'Creador', precio: null, filtro: 'sepia(.5) saturate(2.6) hue-rotate(250deg) brightness(1.1)', soloCreadores: true },
  /* de regalo de la casa: los colores de Grupo Mazi (morado oscuro, vino y el morado claro del techo del cubo) */
  mazi: { nombre: 'Grupo Mazi', precio: null, filtro: 'sepia(.4) saturate(2) hue-rotate(260deg)', regalo: true },
};
export const MAX_ACCESORIOS = 3;
