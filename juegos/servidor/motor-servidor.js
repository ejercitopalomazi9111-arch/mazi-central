/* El motor del servidor NO es otro motor: es EL MISMO ARCHIVO.
 *
 * `motor.js` está escrito para cargarse con un <script> en la página y con
 * `require` en las pruebas de node. Un Worker de Cloudflare usa módulos de
 * ES, que es la tercera forma, y por eso existe este envoltorio de cuatro
 * líneas.
 *
 * Que sea el mismo archivo es lo importante y no un detalle: si el servidor
 * tuviera su propia copia de las reglas, tarde o temprano una de las dos se
 * quedaría atrás y el juego diría una cosa en la pantalla y otra en el
 * servidor. Y las 61 pruebas del motor valdrían para la mitad.
 */
import '../guerra-de-puercos/motor.js';
const API = globalThis.MOTOR;
export const { NIVELES, PV_INICIAL, MANO, DANO_TOPE, COMBOS_POR_JUGADOR, ESPECIALES,
  azar, revolver, armarMazo, nivelDe, sePuedeCombinar,
  puntuar, porQueNoSeVale, danoEntre, repartir, jugarRonda, jugadasPosibles } = API;
