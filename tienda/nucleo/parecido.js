/* ══════════════════════════════════════════════════════════════════════════
   PARECIDO · «shampo», «keratine», «acondisionador»: lo mal escrito también
   ──────────────────────────────────────────────────────────────────────────
   El buscador de la tienda pedía la palabra exacta. Quien escribe con prisa,
   con dedos grandes o como suena, se quedaba en «No encontramos». Aquí: una
   letra de más, de menos, cambiada o dos volteadas se perdonan en palabras de
   5 letras o más (dos, en las de 9 o más). Las cortas no: «cera» y «cero» son
   cosas distintas. Módulo puro: pruebas-parecido.mjs.
   ═════════════════════════════════════════════════════════════════════════ */

/* Distancia de edición con trasposición (Damerau, versión de tres filas),
   con tope: pasado `max` deja de contar. */
export function distancia(a, b, max = 2){
  if(a === b) return 0;
  if(Math.abs(a.length - b.length) > max) return max + 1;
  let ante = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for(let i = 1; i <= a.length; i++){
    const fila = [i]; let menor = i;
    for(let j = 1; j <= b.length; j++){
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + c);
      if(ante && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, ante[j - 2] + 1);
      fila.push(v); if(v < menor) menor = v;
    }
    if(menor > max) return max + 1;
    ante = prev; prev = fila;
  }
  return prev[b.length];
}

/* Cómo SUENA una palabra: s/c/z, b/v, y/ll, k/qu/c y la h muda se confunden
   al escribir de oído («seras» por «ceras», «vrocha» por «brocha»,
   «kera» por «queratina» no: ésa ya es otra palabra). */
export const sonido = (w) => w.replace(/ch/g, '#').replace(/h/g, '').replace(/#/g, 'ch').replace(/qu/g, 'k').replace(/c(?=[ei])/g, 's').replace(/c/g, 'k')
  .replace(/z/g, 's').replace(/v/g, 'b').replace(/ll/g, 'y').replace(/(.)\1+/g, '$1');
const sinPlural = (w) => w.length > 4 ? w.replace(/(es|s)$/, '') : w;

export const tolerancia = (w) => w.length >= 9 ? 2 : w.length >= 5 ? 1 : 0;

/* ¿La palabra buscada `w` está, aunque sea mal escrita, en el texto `t`
   (ya sin acentos y en minúsculas)? Compara contra cada palabra del texto y
   contra su inicio: «kerati» es el principio de «keratin». */
export function estaParecida(t, w){
  const tol = tolerancia(w), sw = w.length >= 4 ? sonido(sinPlural(w)) : null;
  if(!tol && !sw) return false;
  for(const k of t.split(/[^a-z0-9ñ]+/)){
    if(k.length < 4) continue;
    if(sw){ const sk = sonido(sinPlural(k)); if(sk === sw || (sw.length >= 5 && sk.startsWith(sw))) return true; }   // suena igual
    if(!tol) continue;
    if(distancia(w, k, tol) <= tol) return true;
    if(k.length > w.length && distancia(w, k.slice(0, w.length), tol) <= tol) return true;     // lo escrito es el principio
    if(w.length > k.length && k.length >= 5 && distancia(w.slice(0, k.length), k, 0) === 0) return true;   // escribió de más: «keratine»
  }
  return false;
}

/* El filtro de las listas de trabajo (mostrador, cotizar, productos,
   inventario). Antes buscaban la frase PEGADA: «mate cera» no encontraba
   «Cera Mate», y un error de dedo dejaba la lista vacía. Ahora cada palabra
   tiene que estar, en cualquier orden; si así no sale nada, se intenta por
   parecido y el resultado sale marcado `parecido` para que la pantalla lo
   diga (y para que Enter no agregue una adivinanza). */
const llano = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filtrar(lista, q, texto){
  const ws = llano(q).split(/[^a-z0-9ñ]+/).filter(Boolean);
  if(!ws.length) return Object.assign([...lista], { parecido: false });
  const conTexto = lista.map((x) => [x, llano(texto(x))]);
  const exactos = conTexto.filter(([, t]) => ws.every((w) => t.includes(w))).map(([x]) => x);
  if(exactos.length) return Object.assign(exactos, { parecido: false });
  const casi = conTexto.filter(([, t]) => ws.every((w) => t.includes(w) || estaParecida(t, w))).map(([x]) => x);
  return Object.assign(casi, { parecido: casi.length > 0 });
}
