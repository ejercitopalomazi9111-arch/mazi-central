/* ══════════════════════════════════════════════════════════════════════════
   DIAGRAMAS INTELIGENTES · CARYMO
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «lo que son los diagramas inteligentes». Un tema se vuelve un
   dibujo que se toca: un MAPA (la idea al centro y sus ramas), un CICLO (pasos
   que vuelven a empezar) o un PROCESO (pasos en orden). Cada caja se toca y
   explica; en «Completa» se borran unas cajas y hay que regresarlas a su lugar.

   La IA elige la forma y escribe las cajas; si no hay red, sale un mapa armado
   con las ideas de la lección. Aquí sólo hay datos y dibujo (SVG), sin pantalla.
   ═════════════════════════════════════════════════════════════════════════ */
const corta = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const TIPOS = ['mapa', 'ciclo', 'proceso'];
export const CENTRO = 100;
const COLORES = ['#C77DFF', '#5BB8F5', '#F2B544', '#F06C8B', '#7FD6A8', '#FF9A62', '#8C7CF0', '#62D2D2'];

export const SISTEMA_DIAGRAMA = `Haces diagramas para estudiar, en español de México. Contesta SÓLO con JSON válido:
{ "tipo": "mapa | ciclo | proceso", "titulo": "máximo 5 palabras",
  "centro": "sólo en mapa: la idea central, máximo 4 palabras",
  "nodos": [ { "texto": "máximo 4 palabras", "detalle": "qué es o qué pasa ahí, máximo 22 palabras" } ] }
Reglas: elige «ciclo» si los pasos vuelven a empezar (ciclo del agua, del carbono, celular), «proceso» si son pasos en orden que terminan (digestión, una receta, un algoritmo) y «mapa» si son partes o tipos de algo. Entre 3 y 6 nodos. Nada inventado: si no estás seguro de un dato, no lo pongas.`;

export function normalizarDiagrama(j){
  if(!j || typeof j !== 'object') throw new Error('sin diagrama');
  const tipo = TIPOS.includes(j.tipo) ? j.tipo : 'mapa';
  const nodos = (Array.isArray(j.nodos) ? j.nodos : []).map((x) => typeof x === 'string' ? { texto: corta(x, 40), detalle: '' } : { texto: corta(x && x.texto, 40), detalle: corta(x && x.detalle, 200) })
    .filter((x) => x.texto).slice(0, 6).map((x, i) => ({ id: 'n' + i, ...x }));
  if(nodos.length < 3) throw new Error('muy pocos nodos');
  const vistos = new Set(nodos.map((x) => x.texto.toLowerCase()));
  if(vistos.size !== nodos.length) throw new Error('cajas repetidas');
  return { tipo, titulo: corta(j.titulo, 50) || 'Diagrama', centro: tipo === 'mapa' ? (corta(j.centro, 40) || corta(j.titulo, 40) || 'Tema') : '', nodos };
}

/* sin IA: las ideas de la lección alrededor del tema */
export function diagramaBasico(leccion, titulo){
  const ideas = (leccion && leccion.ideas || []).filter((x) => x && (x.titulo || x.texto)).slice(0, 6);
  return normalizarDiagrama({ tipo: 'mapa', titulo: titulo || (leccion && leccion.titulo), centro: titulo || (leccion && leccion.titulo),
    nodos: ideas.map((x) => ({ texto: x.titulo || corta(String(x.texto).replace(/\*\*/g, ''), 30), detalle: String(x.texto || '').replace(/\*\*/g, '') })) });
}

/* parte el texto en renglones de ~n letras */
function renglones(t, n = 14){
  const sal = []; let r = '';
  for(const p of String(t).split(' ')){
    if((r + ' ' + p).trim().length > n && r){ sal.push(r); r = p; } else r = (r + ' ' + p).trim();
  }
  if(r) sal.push(r);
  return sal.slice(0, 3);
}

/* dónde va cada caja: { x, y } del centro, en un lienzo de 360 de ancho */
export function acomodo(d){
  const n = d.nodos.length, ANCHO = 360;
  if(d.tipo === 'proceso'){
    const paso = 92; return { alto: 40 + n * paso, pos: d.nodos.map((_, i) => ({ x: ANCHO / 2, y: 56 + i * paso })), ancho: 230 };
  }
  /* en óvalo: a lo ancho sólo cabe lo que deja la caja de la orilla (360 − la mitad de la caja − aire) */
  const ancho = 112, rx = ANCHO / 2 - ancho / 2 - 6, ry = d.tipo === 'ciclo' ? 122 : 140, cx = ANCHO / 2, cy = ry + 52;
  return { alto: cy + ry + 52, centro: { x: cx, y: cy }, ancho, rx, ry,
    /* en un mapa con ramas pares se gira media vuelta: si no, las de los lados quedan pegadas a la caja del centro */
    pos: d.nodos.map((_, i) => { const a = -Math.PI / 2 + (d.tipo === 'mapa' && n % 2 === 0 ? Math.PI / n : 0) + i * 2 * Math.PI / n; return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }; }) };
}

/* el dibujo. ocultos: ids que van con «?»; puestos: ids ya regresados; elegido: el que se está mirando */
export function svgDiagrama(d, { ocultos = new Set(), elegido = null, puestos = new Set(), mal = null } = {}){
  const A = acomodo(d), h = 30, partes = [];
  const caja = (x, y, w, txt, color, attrs, clase) => {
    const rs = renglones(txt, w > 150 ? 22 : 14), alto = Math.max(46, 22 + rs.length * 17);
    return `<g class="dg-n ${clase}" ${attrs} style="--c:${color}" transform="translate(${x - w / 2} ${y - alto / 2})">
      <rect width="${w}" height="${alto}" rx="14"/><text x="${w / 2}" y="${alto / 2 - (rs.length - 1) * 8.5 + 5.5}" text-anchor="middle">${rs.map((l, i) => `<tspan x="${w / 2}" dy="${i ? 17 : 0}">${esc(l)}</tspan>`).join('')}</text></g>`;
  };
  /* flechas y ramas primero, para que queden debajo */
  if(d.tipo === 'mapa'){
    for(const p of A.pos) partes.push(`<line class="dg-rama" x1="${A.centro.x}" y1="${A.centro.y}" x2="${p.x}" y2="${p.y}"/>`);
  } else if(d.tipo === 'ciclo'){
    const n = A.pos.length, hueco = Math.min(.55, Math.PI / n * .62);
    for(let i = 0; i < n; i++){
      const a0 = -Math.PI / 2 + i * 2 * Math.PI / n + hueco, a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n - hueco;
      const p0 = { x: A.centro.x + Math.cos(a0) * A.rx, y: A.centro.y + Math.sin(a0) * A.ry }, p1 = { x: A.centro.x + Math.cos(a1) * A.rx, y: A.centro.y + Math.sin(a1) * A.ry };
      partes.push(`<path class="dg-flecha" d="M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A${A.rx} ${A.ry} 0 0 1 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}" marker-end="url(#dgPunta)"/>`);
    }
  } else {
    for(let i = 0; i < A.pos.length - 1; i++) partes.push(`<line class="dg-flecha" x1="${A.pos[i].x}" y1="${A.pos[i].y + h}" x2="${A.pos[i + 1].x}" y2="${A.pos[i + 1].y - h - 4}" marker-end="url(#dgPunta)"/>`);
  }
  if(d.tipo === 'mapa') partes.push(caja(A.centro.x, A.centro.y, CENTRO, d.centro, '#AC27FF', 'data-centro', 'dg-centro'));
  d.nodos.forEach((x, i) => {
    const o = ocultos.has(x.id) && !puestos.has(x.id);
    const cl = [o ? 'dg-vacia' : '', x.id === elegido ? 'dg-elegida' : '', puestos.has(x.id) ? 'dg-puesta' : '', x.id === mal ? 'dg-mal' : ''].filter(Boolean).join(' ');
    const num = d.tipo === 'mapa' ? '' : `${i + 1}. `;
    partes.push(caja(A.pos[i].x, A.pos[i].y, A.ancho, o ? '?' : num + x.texto, COLORES[i % COLORES.length], `data-n="${x.id}" role="button" tabindex="0" aria-label="${esc(o ? 'Caja vacía ' + (i + 1) : x.texto)}"`, cl));
  });
  return `<svg class="dg" viewBox="0 0 360 ${A.alto}" role="img" aria-label="${esc(d.titulo)}">
    <defs><marker id="dgPunta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#C77DFF"/></marker></defs>
    ${partes.join('')}</svg>`;
}

/* cuáles se borran en «Completa»: la mitad, al menos 2 y nunca todas */
export function elegirOcultos(d, rnd = Math.random){
  const ids = d.nodos.map((x) => x.id).sort(() => rnd() - .5);
  return new Set(ids.slice(0, Math.max(2, Math.min(d.nodos.length - 1, Math.floor(d.nodos.length / 2)))));
}
