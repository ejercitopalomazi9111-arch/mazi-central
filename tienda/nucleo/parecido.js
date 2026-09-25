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

export const tolerancia = (w) => w.length >= 9 ? 2 : w.length >= 5 ? 1 : 0;

/* ¿La palabra buscada `w` está, aunque sea mal escrita, en el texto `t`
   (ya sin acentos y en minúsculas)? Compara contra cada palabra del texto y
   contra su inicio: «kerati» es el principio de «keratin». */
export function estaParecida(t, w){
  const tol = tolerancia(w); if(!tol) return false;
  for(const k of t.split(/[^a-z0-9ñ]+/)){
    if(k.length < 4) continue;
    if(distancia(w, k, tol) <= tol) return true;
    if(k.length > w.length && distancia(w, k.slice(0, w.length), tol) <= tol) return true;     // lo escrito es el principio
    if(w.length > k.length && k.length >= 5 && distancia(w.slice(0, k.length), k, 0) === 0) return true;   // escribió de más: «keratine»
  }
  return false;
}
