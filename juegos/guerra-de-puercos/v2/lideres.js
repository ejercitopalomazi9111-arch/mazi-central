/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LOS PUERCOS LÍDERES
   ───────────────────────────────────────────────────────────────────────────
   Las 10 cartas de líder de la autora (Carlos, 6 nov: «al crear tu cuenta te
   pida seleccionar uno de los puercos líderes… y más adelante puedas comprar
   otros por fichas en un sobre carísimo que sólo contiene puercos líderes»).
   Cada uno da UNA ventaja, sólo al inicio de la partida (lo dice la carta).
   El arte es el de ella, recortado de las láminas que mandó Carlos:
   img/lideres/NN.webp (retrato) y NN-ventaja.webp (la carta con su texto).
   Las reglas no se tocan: la ventaja se aplica en la mesa, ANTES y DESPUÉS de
   repartir con `motor.js`, igual que se haría con las cartas de verdad.
   ═══════════════════════════════════════════════════════════════════════════ */
export const LIDERES = [
  { id: 'rey',         n: 1,  nombre: 'Puerco Rey',         color: '#E8B923', ventaja: 'Empiezas con +10 de vida.' },
  { id: 'general',     n: 2,  nombre: 'Puerco General',     color: '#9BBF3B', ventaja: 'Empiezas con 1 carta más en la mano.' },
  { id: 'estratega',   n: 3,  nombre: 'Puerco Estratega',   color: '#B06CD9', ventaja: 'La primera vez que robes, ves las 3 de arriba del mazo y escoges 1.' },
  { id: 'guerrillero', n: 4,  nombre: 'Puerco Guerrillero', color: '#5FBF4A', ventaja: 'Al recibir tu mano, puedes cambiar 1 carta por otra del mazo.' },
  { id: 'cientifico',  n: 5,  nombre: 'Puerco Científico',  color: '#4FB3E8', ventaja: 'Al recibir tu mano, devuelves 1 carta y escoges su reemplazo de entre las 5 de arriba del mazo.' },
  { id: 'presidente',  n: 6,  nombre: 'Puerco Presidente',  color: '#6CA8E8', ventaja: 'Tienes 1 fusión extra que no cuenta para el límite.' },
  { id: 'criminal',    n: 7,  nombre: 'Puerco Criminal',    color: '#E8B923', ventaja: 'Antes de empezar, ves la mano del rival y le regresas 1 carta al mazo.' },
  { id: 'almirante',   n: 8,  nombre: 'Puerco Almirante',   color: '#4FB3E8', ventaja: 'Al recibir tu mano, puedes cambiarla toda por una nueva.' },
  { id: 'espartano',   n: 9,  nombre: 'Puerco Espartano',   color: '#F07A3A', ventaja: 'Empiezas con +5 de vida, pero con 1 carta menos en la mano.' },
  { id: 'emperador',   n: 10, nombre: 'Puerco Emperador',   color: '#C58BE8', ventaja: 'Empiezas con 1 carta de Bonificación (+5) en la mano.' },
];
export const liderDe = (id) => LIDERES.find(l => l.id === id) || null;
export const retrato = (l) => `img/lideres/${String(l.n).padStart(2, '0')}.webp`;
export const cartaVentaja = (l) => `img/lideres/${String(l.n).padStart(2, '0')}-ventaja.webp`;
