/* titulos.js — LOS TÍTULOS Y LOS NOMBRES ESPECIALES (Carlos, 14 nov)
 * ===========================================================================
 * «Cualquiera que se conecte antes de que se vuelva de paga va a tener un título de beta tester, alfa tester…
 *  Los que ahorita ya están dados de alta, a todos ellos les vamos a poner el título de alfa tester.»
 *   · ALFA: te diste de alta antes de que CARYMO sea pública (PUBLICA_DESDE; hoy todavía no hay fecha → todos).
 *   · BETA: te diste de alta ya pública, pero antes de que sea de paga (PAGO_DESDE; tampoco hay fecha).
 *   · Los títulos a mano (fundador, artista…) y el estilo del nombre los pone una persona con la llave de La Sala.
 * Lo leen los dos lados: el servidor decide el título; la página lo pinta. Sin DOM aquí.
 * ===========================================================================*/
export const PUBLICA_DESDE = null;   /* cuando CARYMO se abra al público: Date.UTC(…) */
export const PAGO_DESDE = null;      /* cuando se vuelva de paga */

export const TITULOS = {
  alfa: { nombre: 'Alfa tester', ico: 'gem' },
  beta: { nombre: 'Beta tester', ico: 'sparkles' },
  fundador: { nombre: 'Fundador', ico: 'crown' },
  artista: { nombre: 'Artista principal', ico: 'paintbrush' },
};
/* el estilo del nombre: arcoíris dibujado (Sandra, la artista), los colores de la casa (Carlos), perla (Mónica) */
export const ESTILOS_NOMBRE = {
  arcoiris: { nombre: 'Arcoíris dibujado' },
  mazi: { nombre: 'Grupo Mazi' },
  perla: { nombre: 'Perla' },
};

/* el título que le toca a un perfil: el que le pusieron a mano, o alfa/beta por la fecha en que llegó */
export function tituloDe(p, publica = PUBLICA_DESDE, pago = PAGO_DESDE){
  if(p && p.titulo && TITULOS[p.titulo]) return p.titulo;
  const desde = (p && p.desde) || Date.now();
  if(publica == null || desde < publica) return 'alfa';
  if(pago == null || desde < pago) return 'beta';
  return null;
}
/* todos los títulos que se le ven (el especial y además el de alfa/beta) */
export function titulosDe(p){
  const base = tituloDe({ ...p, titulo: null });
  const t = [];
  if(p && p.titulo && TITULOS[p.titulo]) t.push(p.titulo);
  if(base && !t.includes(base)) t.push(base);
  return t;
}
