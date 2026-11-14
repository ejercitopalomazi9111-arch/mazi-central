/* La máquina piensa aparte (trabajador de fondo) para que la pantalla no se trabe mientras calcula. */
import { MOTORES, elegir } from './motores.js';
self.onmessage = (ev) => {
  const { id, juego, e, nivel } = ev.data || {};
  let j = null;
  try{ j = elegir(MOTORES[juego], e, nivel); }catch{}
  self.postMessage({ id, j });
};
