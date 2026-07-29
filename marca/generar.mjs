#!/usr/bin/env node
/* ============================================================================
   generar.mjs — genera la geometría de la marca Grupo Mazi
   ----------------------------------------------------------------------------
   La geometría se calcula, no se dibuja a ojo. Así el ala tiene curva de ala
   de verdad y la constelación traza un contorno reconocible.
   Salida: marca/logo.html
   ==========================================================================*/
import { writeFileSync } from 'node:fs';

const r = (n) => Math.round(n * 10) / 10;

/* ── EL ALA ────────────────────────────────────────────────────────────────
   Un ala no es un abanico. Tiene borde de ataque sólido y curvo, y las plumas
   cuelgan HACIA ATRÁS, no radiando parejo. Cada pluma es una hoja curva y
   afilada, más larga en la punta del ala que en la base.                     */
function pluma(rx, ry, tx, ty, ancho, curva) {
  const dx = tx - rx, dy = ty - ry;
  const L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L;          // dirección raíz → punta
  const nx = -uy, ny = ux;                 // perpendicular
  // el control se desplaza lateralmente para dar la panza curva de la pluma
  const mx = rx + dx * 0.55 + nx * curva;
  const my = ry + dy * 0.55 + ny * curva;
  const a = [rx + nx * ancho / 2, ry + ny * ancho / 2];
  const b = [rx - nx * ancho / 2, ry - ny * ancho / 2];
  return `M${r(a[0])} ${r(a[1])} Q${r(mx + nx * ancho * .4)} ${r(my + ny * ancho * .4)} ${r(tx)} ${r(ty)} `
       + `Q${r(mx - nx * ancho * .55)} ${r(my - ny * ancho * .55)} ${r(b[0])} ${r(b[1])} Z`;
}

// raíz común, ligeramente escalonada: las plumas nacen del hueso del ala
const RAIZ = [
  [52, 168], [56, 160], [61, 151], [67, 141], [74, 130],
];
// puntas: siguen el borde exterior del ala, que se curva
const PUNTA = [
  [ 96, 148], [116, 122], [128,  90], [130,  56], [120,  26],
];
const ANCHO = [15, 16.5, 18, 18, 16];
const CURVA = [ 7,  9,   11, 12, 12];

const PLUMAS = RAIZ.map((p, i) => pluma(p[0], p[1], PUNTA[i][0], PUNTA[i][1], ANCHO[i], CURVA[i]));

// versión reducida: 2 plumas gruesas para 16–32 px
const PLUMAS_MIN = [
  pluma(54, 165, 112, 128, 26, 10),
  pluma(66, 145, 126,  34, 30, 14),
];

/* ── LA PALOMA ─────────────────────────────────────────────────────────────
   Las constelaciones que sí reconoces (Orión, la Osa) TRAZAN el contorno.
   Estos nodos van en secuencia siguiendo la silueta de una paloma en vuelo,
   no como rayos saliendo de un centro.                                       */
/* Paloma volando a la derecha, alas abiertas y cola en abanico — la pose que
   sí se reconoce. El cuerpo es el eje; las alas salen arriba y abajo.        */
const NODOS = [
  { n: 'pico',    x: 210, y:  80, r: 2.8 },
  { n: 'cabeza',  x: 186, y:  86, r: 3.4 },
  { n: 'cuerpo',  x: 132, y: 100, r: 0   },  // el núcleo lo dibuja aparte
  { n: 'alaAmed', x: 112, y:  56, r: 3.0 },
  { n: 'alaApta', x:  74, y:  16, r: 4.8 },
  { n: 'alaBmed', x: 114, y: 142, r: 3.0 },
  { n: 'alaBpta', x:  80, y: 182, r: 4.8 },
  { n: 'cola',    x:  62, y:  98, r: 3.2 },
  { n: 'colaA',   x:  22, y:  74, r: 4.0 },
  { n: 'colaB',   x:  24, y: 122, r: 4.0 },
];
const byName = Object.fromEntries(NODOS.map(n => [n.n, n]));
const P = (k) => `${byName[k].x} ${byName[k].y}`;
// trazos abiertos: cabeza, ala de arriba, ala de abajo y cola en abanico
const TRAZOS = [
  `M ${P('pico')} L ${P('cabeza')} L ${P('cuerpo')}`,
  `M ${P('cuerpo')} L ${P('alaAmed')} L ${P('alaApta')}`,
  `M ${P('cuerpo')} L ${P('alaBmed')} L ${P('alaBpta')}`,
  `M ${P('cuerpo')} L ${P('cola')}`,
  `M ${P('colaA')} L ${P('cola')} L ${P('colaB')}`,
];

/* ── PALOMA SÓLIDA ─────────────────────────────────────────────────────────
   La alternativa: silueta llena, que se lee de inmediato, usando LA MISMA ala
   del emblema. Así la marca y el emblema comparten geometría de verdad.      */
const CUERPO = [
  'M 206 78',                                    // punta del pico
  'L 186 82',
  'C 176 84, 168 88, 158 94',                    // garganta
  'C 138 106, 108 116, 78 118',                  // panza
  'C 60 119, 44 116, 34 110',                    // hacia la cola
  'L 12 122', 'L 22 100', 'L 8 84',              // cola en abanico
  'L 32 88',
  'C 46 80, 66 74, 90 72',                       // lomo
  'C 122 69, 152 66, 172 60',                    // cuello subiendo
  'C 186 56, 198 60, 204 68',                    // cabeza
  'C 207 72, 208 76, 206 78 Z',
].join(' ');

// el ala sólida, colocada sobre el cuerpo (misma geometría del emblema)
const ALA_SOBRE_CUERPO = RAIZ.map((p, i) =>
  pluma(p[0], p[1], PUNTA[i][0], PUNTA[i][1], ANCHO[i], CURVA[i]));

// el núcleo Dyson va en el cuerpo, donde estaría el corazón
const CX = 132, CY = 100;
const CX2 = 96, CY2 = 96;   // núcleo de la versión sólida
const arco = (cx, cy, rad, a1, a2) => {
  const p = (a) => [cx + rad * Math.cos(a * Math.PI / 180), cy + rad * Math.sin(a * Math.PI / 180)];
  const [x1, y1] = p(a1), [x2, y2] = p(a2);
  const grande = ((a2 - a1 + 360) % 360) > 180 ? 1 : 0;
  return `M${r(x1)} ${r(y1)} A${rad} ${rad} 0 ${grande} 1 ${r(x2)} ${r(y2)}`;
};

const html = `<meta charset="utf-8">
<title>Grupo Mazi — identidad</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{ --vacio:#100A18; --superficie:#1E1428; --vino:#7B2D3B; --hueso:#E9E4E4; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--vacio);color:var(--hueso);
       font-family:"Segoe UI",system-ui,-apple-system,sans-serif;padding:48px 32px 96px}
  .wrap{max-width:1080px;margin:0 auto}
  h2{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#8B8296;
     font-weight:600;margin:56px 0 20px;padding-bottom:10px;border-bottom:1px solid #2A2036}
  h2:first-of-type{margin-top:0}
  .fila{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start}
  .caja{background:var(--superficie);border:1px solid #2A2036;border-radius:10px;
        padding:24px;display:grid;place-items:center}
  .caja.claro{background:var(--hueso);border-color:#CFC9C9}
  .caja.vino{background:var(--vino);border-color:#5E222C}
  .pie{font-size:10.5px;color:#8B8296;letter-spacing:.12em;text-transform:uppercase;
       margin-top:12px;text-align:center}
  .nota{font-size:13.5px;color:#A99FB4;line-height:1.65;max-width:64ch;margin:16px 0 0}
  .nota b{color:var(--hueso);font-weight:600}
  .escalas{display:flex;gap:26px;align-items:flex-end}
  .escalas .n{font-size:10px;color:#8B8296;margin-top:8px;text-align:center}
  .palabra{font-weight:800;letter-spacing:-.035em;line-height:1;text-transform:uppercase;
           white-space:nowrap}
  .palabra .g{color:#9A90A6;margin-right:.26em}
  .palabra .m{color:var(--hueso)}
  .claro .palabra .g{color:#6B6072} .claro .palabra .m{color:var(--vacio)}
  .vino  .palabra .g{color:#E0BFC5} .vino  .palabra .m{color:var(--hueso)}
  .lock{display:flex;align-items:center;gap:20px}
  .sw{width:140px;height:88px;border-radius:8px;border:1px solid #2A2036}
</style>
<svg width="0" height="0" style="position:absolute"><defs>

  <g id="ala">
    ${PLUMAS.map((d, i) => `<path d="${d}" fill="currentColor" opacity="${(0.5 + i * 0.125).toFixed(3)}"/>`).join('\n    ')}
    <circle cx="47" cy="172" r="5" fill="currentColor"/>
    <g fill="none" stroke="var(--vino)" stroke-width="2.6" stroke-linecap="round">
      <path d="${arco(47, 172, 12, 25, 155)}"/>
      <path d="${arco(47, 172, 12, 205, 335)}"/>
    </g>
    <g fill="none" stroke="var(--vino)" stroke-width="1.9" stroke-linecap="round" opacity=".75">
      <path d="${arco(47, 172, 19, 115, 245)}"/>
      <path d="${arco(47, 172, 19, 295, 65)}"/>
    </g>
  </g>

  <g id="ala-min">
    ${PLUMAS_MIN.map(d => `<path d="${d}" fill="currentColor"/>`).join('\n    ')}
    <circle cx="50" cy="170" r="9" fill="currentColor"/>
    <circle cx="50" cy="170" r="17" fill="none" stroke="var(--vino)" stroke-width="5.5"/>
  </g>

  <g id="marca">
    <g fill="none" stroke="currentColor" stroke-width="1.5" opacity=".38"
       stroke-linejoin="round" stroke-linecap="round">
      ${TRAZOS.map(d => `<path d="${d}"/>`).join('\n      ')}
    </g>
    <g fill="currentColor">
      ${NODOS.filter(n => n.r > 0).map(n => `<circle cx="${n.x}" cy="${n.y}" r="${n.r}"/>`).join('\n      ')}
    </g>
    <circle cx="${CX}" cy="${CY}" r="5.4" fill="currentColor"/>
    <g fill="none" stroke="var(--vino)" stroke-width="2.5" stroke-linecap="round">
      <path d="${arco(CX, CY, 13, 25, 155)}"/>
      <path d="${arco(CX, CY, 13, 205, 335)}"/>
    </g>
    <g fill="none" stroke="var(--vino)" stroke-width="1.8" stroke-linecap="round" opacity=".75">
      <path d="${arco(CX, CY, 20, 115, 245)}"/>
      <path d="${arco(CX, CY, 20, 295, 65)}"/>
    </g>
  </g>

  <g id="paloma">
    <path d="${CUERPO}" fill="currentColor"/>
    ${ALA_SOBRE_CUERPO.map((d,i)=>`<path d="${d}" fill="var(--vacio)" opacity="${(0.16+i*0.09).toFixed(2)}"/>`).join('\n    ')}
    <circle cx="${CX2}" cy="${CY2}" r="6" fill="var(--vacio)"/>
    <circle cx="${CX2}" cy="${CY2}" r="3.2" fill="var(--vino)"/>
    <g fill="none" stroke="var(--vacio)" stroke-width="2.6" stroke-linecap="round">
      <path d="${arco(CX2, CY2, 13, 25, 155)}"/>
      <path d="${arco(CX2, CY2, 13, 205, 335)}"/>
    </g>
  </g>
</defs></svg>

<div class="wrap">

<h2>Textura · el cielo (NO es el logo)</h2>
<div class="fila">
  <div><div class="caja"><svg viewBox="6 2 220 196" width="440" color="var(--hueso)"><use href="#marca"/></svg></div><p class="pie">principal</p></div>
  <div><div class="caja claro"><svg viewBox="6 2 220 196" width="440" color="var(--vacio)"><use href="#marca"/></svg></div><p class="pie">invertida · impresión</p></div>
</div>
<p class="nota">Once nodos trazando el <b>contorno</b> de la paloma, no rayos saliendo del centro
— así funcionan las constelaciones que sí reconoces. En el cuerpo, donde iría el corazón, el
<b>núcleo Dyson</b>: la única estrella que alguien construyó, y el único punto de color de toda
la marca.</p>

<h2>La marca · el ala</h2>
<div class="fila">
  <div><div class="caja"><svg viewBox="20 10 130 180" width="180" color="var(--hueso)"><use href="#ala"/></svg></div><p class="pie">emblema</p></div>
  <div><div class="caja claro"><svg viewBox="20 10 130 180" width="180" color="var(--vacio)"><use href="#ala"/></svg></div><p class="pie">invertido</p></div>
  <div><div class="caja vino"><svg viewBox="20 10 130 180" width="180" color="var(--hueso)"><use href="#ala"/></svg></div><p class="pie">sobre vino</p></div>
</div>
<p class="nota">Cinco plumas con <b>panza curva y punta afilada</b>, más largas hacia el extremo
del ala — geometría de ala, no de abanico. La opacidad creciente da profundidad sin degradado.
El núcleo vive en el hueso del ala: el emblema es un <b>fragmento</b> de la marca, no otro dibujo.</p>

<h2>Prueba de tamaño</h2>
<div class="caja" style="justify-items:start;padding:32px 40px">
  <div class="escalas">
    ${[16, 24, 32].map(s => `<div><svg viewBox="20 10 130 180" width="${s}" color="var(--hueso)"><use href="#ala-min"/></svg><div class="n">${s}</div></div>`).join('')}
    ${[48, 64, 96].map(s => `<div><svg viewBox="20 10 130 180" width="${s}" color="var(--hueso)"><use href="#ala"/></svg><div class="n">${s}</div></div>`).join('')}
  </div>
</div>
<p class="nota">De 16 a 32 px entra la <b>reducida</b>: dos plumas gruesas y un anillo sólido.
De 48 en adelante, la completa.</p>

<h2>Bloqueo · marca + palabra</h2>
<div class="fila">
  <div><div class="caja" style="padding:32px 40px"><div class="lock">
    <svg viewBox="20 10 130 180" width="60" color="var(--hueso)"><use href="#ala"/></svg>
    <div class="palabra" style="font-size:36px"><span class="g">Grupo</span><span class="m">Mazi</span></div>
  </div></div><p class="pie">horizontal</p></div>
  <div><div class="caja claro" style="padding:32px 40px"><div class="lock">
    <svg viewBox="20 10 130 180" width="60" color="var(--vacio)"><use href="#ala"/></svg>
    <div class="palabra" style="font-size:36px"><span class="g">Grupo</span><span class="m">Mazi</span></div>
  </div></div><p class="pie">invertido</p></div>
</div>

<h2>Paleta A · vino y vacío</h2>
<div class="fila">
  ${[['#100A18','vacío'],['#1E1428','superficie'],['#7B2D3B','vino'],['#E9E4E4','hueso']]
    .map(([h,n]) => `<div><div class="sw" style="background:${h}"></div><p class="pie">${h} ${n}</p></div>`).join('')}
</div>

</div>
`;

writeFileSync(new URL('./logo.html', import.meta.url), html);
console.log('marca/logo.html generado ·', PLUMAS.length, 'plumas ·', NODOS.length, 'nodos');
