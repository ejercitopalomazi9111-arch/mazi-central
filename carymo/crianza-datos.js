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
 *   · Si NADIE la cuida (hambre, limpieza o ánimo en cero) por 3 días seguidos, se muere y ya no vuelve.
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
};
export const MAX_ACCESORIOS = 3;
