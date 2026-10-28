/* CUBOS DE CUBITOS, en isométrico. Carlos, 28 de octubre: «básate en algunas propuestas un poco en el
   logo de GameCube y otros logos similares». Del GameCube se toma la IDEA —un cubo armado de piezas,
   con un hueco y un cubito adentro—, no su G, que es de Nintendo.
   Cada figura es una lista de cubitos (x, y, z). Se pintan del fondo hacia el frente y de cada cubito
   sólo las caras que no tapa otro: arriba (la de color), izquierda (tinta) y derecha (tinta clara).
   proyección: pantalla x = (x − y)·cos30, pantalla y = (x + y)·sen30 − z  */
const C30 = Math.cos(Math.PI / 6), S30 = .5;
const P = (x, y, z) => [(x - y) * C30, (x + y) * S30 - z];
export function cubitos(lista, hueco = 0){
  const hay = new Set(lista.map(v => v.join(','))), tiene = (x, y, z) => hay.has([x, y, z].join(','));
  const orden = [...lista].sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]) || a[2] - b[2]);
  const caras = [], pts = [];
  const h = hueco;                                      // rendija entre cubitos (0 = macizo)
  for(const [x, y, z] of orden){
    const a = h, b = 1 - h;
    const cara = (q, tipo) => { const s = q.map(([i, j, k]) => P(x + i, y + j, z + k)); pts.push(...s); caras.push([tipo, s]); };
    if(h || !tiene(x, y, z + 1)) cara([[a, a, b], [b, a, b], [b, b, b], [a, b, b]], 'arriba');
    if(h || !tiene(x, y + 1, z)) cara([[a, b, a], [b, b, a], [b, b, b], [a, b, b]], 'izq');
    if(h || !tiene(x + 1, y, z)) cara([[b, a, a], [b, b, a], [b, b, b], [b, a, b]], 'der');
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, hh = Math.max(...ys) - y0;
  return { vb: `${x0.toFixed(3)} ${y0.toFixed(3)} ${w.toFixed(3)} ${hh.toFixed(3)}`, w, h: hh,
    pintar: (tinta, acento, claro) => caras.map(([t, s]) => { const c = t === 'arriba' ? acento : t === 'izq' ? tinta : claro;
      /* un trazo del mismo color tapa la rendija de un pixel entre caras vecinas */
      return `<path d="M${s.map(p => p.map(v => v.toFixed(3)).join(' ')).join(' L')} Z" fill="${c}" stroke="${c}" stroke-width="${h ? 0 : .035}" stroke-linejoin="round"/>`; }).join('') };
}
/* letras de cubitos: cada renglón de arriba a abajo; '#' es un cubito. Van paradas en la cara izquierda */
const letra = (filas, dx = 0, prof = 1) => filas.flatMap((f, r) => [...f].flatMap((ch, c) => ch === '#' ? Array.from({ length: prof }, (_, d) => [c + dx, -d, filas.length - 1 - r]) : []));
const caja = (n, quitar = () => false) => { const v = []; for(let x = 0; x < n; x++) for(let y = 0; y < n; y++) for(let z = 0; z < n; z++) if(!quitar(x, y, z)) v.push([x, y, z]); return v; };
export const FIGURAS = {
  /* el de la idea del GameCube: un cubo de 3 con la esquina de enfrente hueca y un cubito al fondo */
  'cubo con hueco y cubito': caja(3, (x, y, z) => x >= 1 && y >= 1 && z >= 1).concat([[1, 1, 1]]),
  /* un cubo de 2 con la esquina de enfrente arriba quitada: tres escalones que se leen como cubo */
  'escalón': caja(2, (x, y, z) => x === 1 && y === 1 && z === 1),
  /* cubo de cubitos sueltos: el cubo de 2 con rendijas, como piezas */
  'cubo de piezas': caja(2),
};
