// diagramas.mjs · los dibujos de física de la presentación, en SVG → PNG opaco.
//   node escuela/fisica-catapulta/diagramas.mjs
// Fondo sólido del color de la lámina (07416B): sin transparencias, que el visor
// del iPhone las cruza entre láminas (CLAUDE.md §3).
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { writeFileSync } from 'node:fs';
const { chromium } = pw;
const AQUI = new URL('.', import.meta.url).pathname;
const FONDO = '#07416B', BLANCO = '#FFFFFF', NARANJA = '#FF914D', AZUL = '#4FA3E0', ROJO = '#E2343B', GRIS = '#A9C3D9';
const letra = `font-family="Liberation Sans, Arial, sans-serif"`;
const flecha = (id, color) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`;
const defs = `<defs>${flecha('fb', BLANCO)}${flecha('fn', NARANJA)}${flecha('fa', AZUL)}${flecha('fr', ROJO)}${flecha('fg', GRIS)}</defs>`;
const vy = (tam) => `v<tspan font-size="${Math.round(tam*0.7)}" dy="${Math.round(tam*0.22)}">y</tspan><tspan dy="-${Math.round(tam*0.22)}"> </tspan>`;
const svg = (w, h, cuerpo) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${letra}><rect width="100%" height="100%" fill="${FONDO}"/>${defs}${cuerpo}</svg>`;

/* 1 · la trayectoria: vx igual siempre, vy cambia */
function trayectoria() {
  const W = 1400, H = 900, x0 = 110, y0 = 680, R = 1140, Hmax = 400;
  const px = (t) => x0 + R * t, py = (t) => y0 - 4 * Hmax * t * (1 - t);
  let d = '';
  for (let i = 0; i <= 100; i++) { const t = i / 100; d += (i ? 'L' : 'M') + px(t).toFixed(1) + ',' + py(t).toFixed(1); }
  let c = `<line x1="60" y1="${y0}" x2="${W - 40}" y2="${y0}" stroke="${GRIS}" stroke-width="4"/>`;
  c += `<path d="${d}" fill="none" stroke="${BLANCO}" stroke-width="5" stroke-dasharray="14 10"/>`;
  for (const t of [0, 0.2, 0.5, 0.8, 1]) {
    const x = px(t), y = py(t), vx = 120, vy = 150 * (1 - 2 * t);
    c += `<line x1="${x}" y1="${y}" x2="${x + vx}" y2="${y}" stroke="${AZUL}" stroke-width="7" marker-end="url(#fa)"/>`;
    if (Math.abs(vy) > 5) c += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - vy}" stroke="${NARANJA}" stroke-width="7" marker-end="url(#fn)"/>`;
    c += `<circle cx="${x}" cy="${y}" r="17" fill="${ROJO}" stroke="${BLANCO}" stroke-width="4"/>`;
  }
  c += `<line x1="${px(.5)}" y1="${y0}" x2="${px(.5)}" y2="${py(.5) + 24}" stroke="${GRIS}" stroke-width="3" stroke-dasharray="8 8"/>`;
  c += `<text x="${px(.5) + 16}" y="${(y0 + py(.5)) / 2 + 40}" fill="${GRIS}" font-size="34" font-weight="bold">Altura máxima</text>`;
  c += `<line x1="${x0}" y1="${y0 + 52}" x2="${x0 + R}" y2="${y0 + 52}" stroke="${BLANCO}" stroke-width="4" marker-start="url(#fb)" marker-end="url(#fb)"/>`;
  c += `<text x="${x0 + R / 2}" y="${y0 + 100}" fill="${BLANCO}" font-size="38" font-weight="bold" text-anchor="middle">Alcance (R)</text>`;
  c += `<rect x="${W - 560}" y="30" width="530" height="150" rx="16" fill="#0A2E4D"/>`;
  c += `<line x1="${W - 530}" y1="88" x2="${W - 450}" y2="88" stroke="${AZUL}" stroke-width="8" marker-end="url(#fa)"/><text x="${W - 430}" y="100" fill="${BLANCO}" font-size="32">vₓ · nunca cambia</text>`;
  c += `<line x1="${W - 490}" y1="165" x2="${W - 490}" y2="118" stroke="${NARANJA}" stroke-width="8" marker-end="url(#fn)"/><text x="${W - 430}" y="155" fill="${BLANCO}" font-size="32">${vy(32)}· la gravedad la cambia</text>`;
  return svg(W, H, c);
}

/* 2 · la catapulta por partes (de lado). El pivote va ADELANTE: el brazo cargado
   apunta hacia atrás, gira hacia arriba, pega en el tope a 45° y la bola sale
   perpendicular al brazo, hacia adelante. (Con el pivote atrás saldría de reversa.) */
function catapulta() {
  const W = 1400, H = 840, px = 900, py = 600, L = 460, a = 45 * Math.PI / 180;
  const sx = px - L * Math.cos(a), sy = py - L * Math.sin(a);          // donde suelta
  const tx = px - 330 * Math.cos(a), ty = py - 330 * Math.sin(a);       // donde pega con el tope
  let c = '';
  c += `<line x1="40" y1="700" x2="${W - 40}" y2="700" stroke="${GRIS}" stroke-width="4"/>`;
  c += `<rect x="${tx - 14}" y="${ty + 14}" width="28" height="${640 - ty - 14}" fill="#7A532A" stroke="${BLANCO}" stroke-width="3"/>`;        // poste
  c += `<rect x="${tx - 40}" y="${ty - 6}" width="80" height="24" rx="6" fill="${ROJO}" stroke="${BLANCO}" stroke-width="3"/>`;            // tope
  c += `<rect x="330" y="640" width="680" height="56" rx="8" fill="#B8864B" stroke="${BLANCO}" stroke-width="3"/>`;                        // base
  c += `<path d="M${px - 30},640 L${px},${py + 14} L${px + 30},640 z" fill="#9C6B36" stroke="${BLANCO}" stroke-width="3"/>`;               // soporte del pivote
  // brazo suelto (punteado, donde pega con el tope) y brazo cargado
  c += `<g opacity="0.55" transform="rotate(45 ${px} ${py})"><rect x="${px - L}" y="${py - 12}" width="${L}" height="24" rx="8" fill="none" stroke="${BLANCO}" stroke-width="3" stroke-dasharray="10 8"/></g>`;
  c += `<rect x="${px - L}" y="${py - 12}" width="${L}" height="24" rx="8" fill="#D9A566" stroke="${BLANCO}" stroke-width="3"/>`;
  c += `<path d="M${px - L + 70},${py - 12} q0,-62 -62,-62 q-10,0 -10,10 l0,52 z" fill="#D9A566" stroke="${BLANCO}" stroke-width="3"/>`;
  c += `<circle cx="${px - L + 32}" cy="${py - 48}" r="26" fill="${ROJO}" stroke="${BLANCO}" stroke-width="3"/>`;
  c += `<circle cx="${px}" cy="${py}" r="18" fill="${GRIS}" stroke="${BLANCO}" stroke-width="3"/>`;                                        // pivote
  // la liga: del brazo al poste
  c += `<path d="M${px - 150},${py - 12} L${px - 170},${py - 60} L${px - 140},${py - 95} L${px - 170},${py - 130} L${px - 140},${py - 165} L${tx + 14},${ty + 60}" fill="none" stroke="${NARANJA}" stroke-width="8" stroke-linejoin="round"/>`;
  // el giro del brazo y la salida a 45°, hacia adelante
  const r = L + 40;
  c += `<path d="M${px - r},${py - 30} A${r},${r} 0 0 1 ${px - r * Math.cos(a) - 24},${py - r * Math.sin(a) - 6}" fill="none" stroke="${GRIS}" stroke-width="5" stroke-dasharray="12 10" marker-end="url(#fg)"/>`;
  c += `<path d="M${sx + 14},${sy - 40} Q${sx + 400},${sy - 430} ${W - 110},640" fill="none" stroke="${BLANCO}" stroke-width="5" stroke-dasharray="14 10" marker-end="url(#fb)"/>`;
  c += `<circle cx="${W - 104}" cy="672" r="24" fill="${ROJO}" stroke="${BLANCO}" stroke-width="3"/>`;
  const et = (x, y, t, al = 'start', col = BLANCO) => `<text x="${x}" y="${y}" fill="${col}" font-size="34" font-weight="bold" text-anchor="${al}">${t}</text>`;
  const linea = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BLANCO}" stroke-width="2.5"/>`;
  c += linea(400, 690, 400, 752) + et(400, 790, 'Base', 'middle');
  c += linea(px + 16, py + 6, px + 120, py - 20) + et(px + 130, py - 12, 'Pivote');
  c += linea(px - 230, py + 10, px - 230, 752) + et(px - 230, 790, 'Brazo', 'middle');
  c += linea(px - L + 10, py - 70, 300, 470) + et(290, 470, 'Cuchara', 'end');
  c += linea(tx - 40, ty + 6, tx - 140, ty - 20) + et(tx - 150, ty - 14, 'Tope', 'end');
  c += linea(px - 160, py - 110, px + 60, 420) + et(px + 70, 420, 'Liga', 'start', NARANJA) + `<text x="${px + 70}" y="456" fill="${NARANJA}" font-size="26">guarda energía</text>`;
  c += `<text x="${sx - 10}" y="${sy - 70}" fill="${NARANJA}" font-size="30" font-weight="bold" text-anchor="end">sale a 45°</text>`;
  c += `<text x="${W - 60}" y="770" fill="${GRIS}" font-size="30" text-anchor="end">vuela en parábola</text>`;
  return svg(W, H, c);
}

/* 3 · descomponer la velocidad inicial */
function vectores() {
  const W = 900, H = 640, ox = 140, oy = 520, L = 560, th = 40 * Math.PI / 180;
  const ex = ox + L * Math.cos(th), ey = oy - L * Math.sin(th);
  let c = `<line x1="60" y1="${oy}" x2="${W - 40}" y2="${oy}" stroke="${GRIS}" stroke-width="3"/>`;
  c += `<line x1="${ox}" y1="${oy}" x2="${ex}" y2="${oy}" stroke="${AZUL}" stroke-width="9" marker-end="url(#fa)"/>`;
  c += `<line x1="${ex}" y1="${oy}" x2="${ex}" y2="${ey + 6}" stroke="${NARANJA}" stroke-width="9" marker-end="url(#fn)"/>`;
  c += `<line x1="${ox}" y1="${oy}" x2="${ex}" y2="${ey}" stroke="${BLANCO}" stroke-width="10" marker-end="url(#fb)"/>`;
  c += `<path d="M${ox + 130},${oy} A130,130 0 0 0 ${ox + 130 * Math.cos(th)},${oy - 130 * Math.sin(th)}" fill="none" stroke="${BLANCO}" stroke-width="4"/>`;
  c += `<text x="${ox + 150}" y="${oy - 40}" fill="${BLANCO}" font-size="44" font-weight="bold">θ</text>`;
  c += `<text x="${(ox + ex) / 2 - 90}" y="${(oy + ey) / 2 - 30}" fill="${BLANCO}" font-size="46" font-weight="bold">v₀</text>`;
  c += `<text x="${(ox + ex) / 2}" y="${oy + 62}" fill="${AZUL}" font-size="40" font-weight="bold" text-anchor="middle">vₓ = v₀ · cos θ</text>`;
  c += `<text x="${ex + 24}" y="${(oy + ey) / 2 + 14}" fill="${NARANJA}" font-size="40" font-weight="bold">${vy(40)}= v₀ · sen θ</text>`;
  c += `<circle cx="${ox}" cy="${oy}" r="18" fill="${ROJO}" stroke="${BLANCO}" stroke-width="4"/>`;
  return svg(W + 220, H, c);
}

/* 4 · el mismo tiro con distintos ángulos: 45° llega más lejos */
function angulos() {
  const W = 1200, H = 620, x0 = 80, y0 = 540, esc = 1000; // R(45°) = 1000 px
  const colores = { 15: GRIS, 30: AZUL, 45: NARANJA, 60: AZUL, 75: GRIS };
  let c = `<line x1="40" y1="${y0}" x2="${W - 30}" y2="${y0}" stroke="${GRIS}" stroke-width="4"/>`;
  for (const g of [15, 30, 45, 60, 75]) {
    const th = g * Math.PI / 180, R = esc * Math.sin(2 * th), Hm = esc * Math.sin(th) ** 2 / 2;
    let d = '';
    for (let i = 0; i <= 80; i++) { const t = i / 80; d += (i ? 'L' : 'M') + (x0 + R * t).toFixed(1) + ',' + (y0 - 4 * Hm * t * (1 - t)).toFixed(1); }
    c += `<path d="${d}" fill="none" stroke="${colores[g]}" stroke-width="${g === 45 ? 9 : 5}"/>`;
    const lx = g === 45 ? x0 + R / 2 : g < 45 ? x0 + R * 0.62 : x0 + R * 0.5;
    const ly = g === 45 ? y0 - Hm - 22 : y0 - 4 * Hm * 0.62 * 0.38 - (g < 45 ? 14 : 0) - (g > 45 ? Hm * 0 + 20 : 0);
    c += `<text x="${g > 45 ? x0 + R / 2 + 18 : lx}" y="${g > 45 ? y0 - Hm - 16 : ly}" fill="${colores[g]}" font-size="${g === 45 ? 42 : 32}" font-weight="bold" text-anchor="${g > 45 ? 'start' : 'middle'}">${g}°</text>`;
  }
  c += `<rect x="${W - 540}" y="20" width="520" height="120" rx="16" fill="#0A2E4D"/><text x="${W - 515}" y="68" fill="${NARANJA}" font-size="32" font-weight="bold">45°: el que llega más lejos</text>`;
  c += `<text x="${W - 515}" y="116" fill="${AZUL}" font-size="30">30° y 60°: caen en el mismo lugar</text>`;
  return svg(W, H, c);
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ deviceScaleFactor: 2 });
for (const [nombre, f] of Object.entries({ trayectoria, catapulta, vectores, angulos })) {
  const s = f();
  writeFileSync(AQUI + 'diagramas/' + nombre + '.svg', s);
  await p.setContent(`<body style="margin:0">${s}</body>`);
  await p.locator('svg').screenshot({ path: AQUI + 'diagramas/' + nombre + '.png' });
  console.log('listo', nombre);
}
await b.close();
