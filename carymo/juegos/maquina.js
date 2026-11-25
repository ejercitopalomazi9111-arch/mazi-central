/* La máquina piensa aparte (trabajador de fondo) para que la pantalla no se trabe mientras calcula.
   También repasa partidas de ajedrez (entrenador.js): cada jugada contra la mejor. */
import { MOTORES, elegir } from './motores.js';
import { analizar } from './entrenador.js';
self.onmessage = (ev) => {
  const { id, juego, e, nivel, tipo } = ev.data || {};
  if(tipo === 'analizar'){
    let an = null;
    try{ an = analizar(ev.data.estados, ev.data.movs, ev.data.yo, { libroHasta: ev.data.libroHasta }); }catch{}
    self.postMessage({ id, an }); return;
  }
  let j = null;
  try{ j = elegir(MOTORES[juego], e, nivel); }catch{}
  self.postMessage({ id, j });
};
