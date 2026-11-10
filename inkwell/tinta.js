/* INKWELL · la plumilla: el avance de una serie como la punta de la pluma que se llena de tinta.
   Sólo va en los submenús (ficha, estante), nunca en el inicio: ahí no se dice cuánto falta (Carlos, 10 nov). */
let nPlum = 0;
export function plumilla(pct, { clase = 'plumilla' } = {}){
  const id = 'pl' + (nPlum++) + Math.random().toString(36).slice(2, 6), y = 74 - Math.max(0, Math.min(1, pct)) * 72;
  return `<svg class="${clase}" viewBox="0 0 56 76" role="img" aria-label="Llevas ${Math.round(pct * 100)} por ciento"><defs><clipPath id="${id}"><path d="M28 2 L52 30 Q46 52 28 74 Q10 52 4 30 Z"/></clipPath></defs>
    <path d="M28 2 L52 30 Q46 52 28 74 Q10 52 4 30 Z" style="fill:color-mix(in srgb,var(--ink) 8%,transparent); stroke:color-mix(in srgb,var(--ink) 45%,transparent); stroke-width:1.5"/>
    <rect clip-path="url(#${id})" x="0" y="${y.toFixed(1)}" width="56" height="76" style="fill:var(--accent)"/>
    <circle cx="28" cy="34" r="4.5" style="fill:var(--bg)"/><path d="M28 39 L28 72" style="stroke:var(--bg); stroke-width:1.6"/></svg>`;
}
