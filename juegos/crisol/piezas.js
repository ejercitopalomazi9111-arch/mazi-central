/* ═══════════════════════════════════════════════════════════════════════════
   PIEZAS ARMADAS · CRISOL
   ---------------------------------------------------------------------------
   Cosas que YA funcionan y se ponen de un toque.

   POR QUÉ EXISTE ESTE ARCHIVO, con todas sus letras: el motor sabe disparar
   una pistola desde hace días —hay tres pruebas verdes que la arman y la
   disparan, con cañón de muro, de piedra y de metal—. Lo que no se podía era
   ARMARLA CON EL DEDO. Carlos lo dijo cuatro veces: «aún no logro crear una
   pistola y ya probé muchas cosas».

   Y tenía razón, porque la receta que funciona NO se adivina dibujando. Los
   tres números de abajo NO se eligieron a ojo: se barrió cada uno con las
   pruebas puestas, moviendo UNO y dejando los otros quietos, y esto es lo que
   salió —la ventana entera, no sólo el valor bueno—:

     · ánima (alto del hueco): dispara con 2, 3 y 4. Con 1 no sale la bala;
       con 6 tampoco. O sea que hay ventana por arriba Y por abajo, y quien
       dibuja a mano cae fuera de ella la mitad de las veces sin saber por qué.
     · recámara (celdas de MURO desde la culata): dispara con 8 y con 12; con
       4, con 2 y con 0 NO. Es el número que más cuesta adivinar, porque el
       arma se ve idéntica: lo que pasa es que el techo del cañón se desploma
       dentro del ánima con la carga y la tapona con su propia esquirla.
     · pólvora (columnas de carga): dispara de 3 a 6. Con 2 no la saca y con 8
       revienta la recámara. También tiene techo, que es lo que uno no espera.

   La chispa va PEGADA a la culata y eso sí es razonamiento, no barrido:
   encendida a media carga, la mitad de atrás empuja hacia atrás y se cancela.

   Nada de esto se ve mirando la pantalla, y ninguna cantidad de intentos lo
   encuentra. Por eso la pieza se entrega armada: lo que Carlos quería no era
   el derecho a descubrir la receta, era disparar.
   ═══════════════════════════════════════════════════════════════════════════ */

import { IDX, EL } from './motor.js';

/* La receta, MEDIDA — no elegida a ojo. Los números salieron de armar la
   pistola en pruebas.mjs y de barrer cada uno hasta que dejaba de disparar. */
export const RECETA = {
  anima:   2,    /* alto del hueco por donde viaja la bala */
  recamara: 8,   /* celdas de MURO desde la culata; el resto es del material que sea */
  polvora: 4,    /* columnas de carga */
  bala:    2,    /* columnas de proyectil */
  canon:  30     /* largo total, culata incluida */
};

/* Alto total de la pieza: pared de arriba + ánima + pared de abajo */
export const ALTO = RECETA.anima + 2;
export const LARGO = RECETA.canon + 1;

/* ── ¿cabe? ───────────────────────────────────────────────────────────────
   Se pregunta ANTES de pintar nada. Una pistola a medio poner, con la culata
   dentro y la boca fuera del mundo, es un tubo cerrado: la bala rebota y la
   recámara revienta en la cara de quien la puso. */
export function cabe(M, x, y, dir = 1){
  const x0 = dir > 0 ? x : x - RECETA.canon;
  const x1 = x0 + RECETA.canon;
  return M.dentro(x0, y) && M.dentro(x1, y + ALTO - 1) &&
         M.dentro(x0, y + ALTO - 1) && M.dentro(x1, y);
}

/* ── armar ────────────────────────────────────────────────────────────────
   (x, y) es la CULATA: la esquina de atrás-arriba. El cañón crece hacia `dir`.
   Devuelve la pieza, que es lo que hay que guardarse para poder dispararla:
   sin la posición de la chispa no hay gatillo, sólo un adorno. */
export function pistola(M, x, y, dir = 1, canon = 'metal'){
  const d = dir > 0 ? 1 : -1;
  const x0 = d > 0 ? x : x - RECETA.canon;   /* siempre la izquierda del dibujo */
  const y0 = y, y1 = y + ALTO - 1;
  const x1 = x0 + RECETA.canon;
  /* la recámara mira al lado de la culata, que depende de hacia dónde apunta */
  const esRecamara = xx => d > 0 ? xx <= x0 + RECETA.recamara
                                 : xx >= x1 - RECETA.recamara;
  const mat = IDX[canon] != null ? IDX[canon] : IDX.metal;

  for(let xx = x0; xx <= x1; xx++){
    const t = esRecamara(xx) ? IDX.muro : mat;
    M.pon(xx, y0, t); M.pon(xx, y1, t);
  }
  /* la culata: la pared de atrás, tapando el ánima por el lado contrario al tiro */
  const culata = d > 0 ? x0 : x1;
  for(let yy = y0; yy <= y1; yy++) M.pon(culata, yy, IDX.muro);

  /* carga y bala, saliendo de la culata hacia la boca */
  let xc = culata + d;
  for(let i = 0; i < RECETA.polvora; i++, xc += d)
    for(let yy = y0 + 1; yy < y1; yy++) M.pon(xc, yy, IDX.polvora);
  for(let i = 0; i < RECETA.bala; i++, xc += d)
    for(let yy = y0 + 1; yy < y1; yy++) M.pon(xc, yy, IDX.metal);

  return { x0, y0, x1, y1, dir:d, canon,
           /* el gatillo: la celda de carga pegada a la culata */
           chispa: { x: culata + d, y: y0 + 1 } };
}

/* ── disparar ─────────────────────────────────────────────────────────────
   Prender la carga por la culata. Devuelve false si ya no hay qué prender —
   una pistola gastada no vuelve a disparar, y decirlo es mejor que fingir. */
export function dispara(M, p){
  const k = M.i(p.chispa.x, p.chispa.y);
  if(M.t[k] !== IDX.polvora) return false;
  M.pon(p.chispa.x, p.chispa.y, IDX.fuego);
  return true;
}

/* ── ¿el toque cayó sobre esta pistola? ───────────────────────────────────
   Con holgura de una celda, porque en un teléfono el dedo tapa el arma. */
export function tocada(p, x, y, holgura = 1){
  return x >= Math.min(p.x0, p.x1) - holgura && x <= Math.max(p.x0, p.x1) + holgura &&
         y >= p.y0 - holgura && y <= p.y1 + holgura;
}

/* ── recargar ─────────────────────────────────────────────────────────────
   Vuelve a meter pólvora y bala sin repintar el arma. Es lo que hace que la
   pistola sea un juguete y no un fuego artificial de un solo uso. */
export function recarga(M, p){
  const d = p.dir, culata = d > 0 ? p.x0 : p.x1;
  let xc = culata + d;
  for(let i = 0; i < RECETA.polvora; i++, xc += d)
    for(let yy = p.y0 + 1; yy < p.y1; yy++) M.pon(xc, yy, IDX.polvora);
  for(let i = 0; i < RECETA.bala; i++, xc += d)
    for(let yy = p.y0 + 1; yy < p.y1; yy++) M.pon(xc, yy, IDX.metal);
  return true;
}

export const MATERIALES = ['metal', 'piedra', 'muro'];
