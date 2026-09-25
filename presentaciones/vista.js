/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · la vista: el modelo de una lámina → HTML
   ──────────────────────────────────────────────────────────────────────────
   Se dibuja a 960 px de ancho y se escala con transform: así cien miniaturas
   y la vista grande salen de la misma función. Aproximada a propósito: sirve
   para reconocer cada lámina y ver el cambio, no para reemplazar a PowerPoint.
   Todo el texto entra con textContent: nada del archivo se interpreta como HTML.
   ═════════════════════════════════════════════════════════════════════════ */
export const BASE = 960;

const el = (tag, clase, estilo = {}) => { const e = document.createElement(tag); if(clase) e.className = clase; Object.assign(e.style, estilo); return e; };
const rgba = (hex, a = 1) => {
  if(a >= 1) return hex;
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};
function fondoCss(f){
  if(!f || f.nada) return 'transparent';
  if(f.imagen) return `center / cover no-repeat url("${f.imagen}")`;
  if(f.degradado?.length) return `linear-gradient(${(f.angulo ?? 90) + 90}deg, ${f.degradado.map((g) => `${g.color} ${g.pos}%`).join(', ')})`;
  return f.color ? rgba(f.color, f.alfa ?? 1) : 'transparent';
}
/* Las formas de PowerPoint más usadas, recortadas con clip-path: sin esto una
   estrella o una flecha se veían como un cuadro en la vista (el archivo
   estaba bien; la vista mentía). */
const P = (t) => `polygon(${t})`;
const RECORTE = {
  triangle: P('50% 0,100% 100%,0 100%'), rtTriangle: P('0 0,100% 100%,0 100%'), diamond: P('50% 0,100% 50%,50% 100%,0 50%'),
  pentagon: P('50% 0,100% 38%,82% 100%,18% 100%,0 38%'), hexagon: P('25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%'),
  octagon: P('30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%'),
  star5: P('50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%'),
  rightArrow: P('0 25%,60% 25%,60% 0,100% 50%,60% 100%,60% 75%,0 75%'), leftArrow: P('100% 25%,40% 25%,40% 0,0 50%,40% 100%,40% 75%,100% 75%'),
  upArrow: P('25% 100%,25% 40%,0 40%,50% 0,100% 40%,75% 40%,75% 100%'), downArrow: P('25% 0,25% 60%,0 60%,50% 100%,100% 60%,75% 60%,75% 0'),
  leftRightArrow: P('0 50%,20% 0,20% 25%,80% 25%,80% 0,100% 50%,80% 100%,80% 75%,20% 75%,20% 100%'),
  chevron: P('0 0,75% 0,100% 50%,75% 100%,0 100%,25% 50%'), homePlate: P('0 0,75% 0,100% 50%,75% 100%,0 100%'),
  parallelogram: P('25% 0,100% 0,75% 100%,0 100%'), trapezoid: P('25% 0,75% 0,100% 100%,0 100%'),
  plus: P('35% 0,65% 0,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0 65%,0 35%,35% 35%'),
  heart: P('50% 100%,6% 52%,0 30%,5% 11%,20% 1%,36% 4%,50% 20%,64% 4%,80% 1%,95% 11%,100% 30%,94% 52%'),
};
const ALINEA = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify' };
const ANCLA = { t: 'flex-start', ctr: 'center', b: 'flex-end' };

/* m: el modelo de nucleo.modelo() · devuelve el lienzo de 960 px */
export function pintar(m){
  const k = BASE / m.ancho, ptPx = BASE / (m.ancho / 12700);
  const lienzo = el('div', 'lienzo', { width: BASE + 'px', height: Math.round(m.alto * k) + 'px', background: fondoCss(m.fondo) });
  for(const f of m.formas){
    const caja = el('div', 'forma', {
      left: f.x * k + 'px', top: f.y * k + 'px', width: Math.max(1, f.w * k) + 'px', height: Math.max(1, f.h * k) + 'px',
      transform: f.rot ? `rotate(${f.rot}deg)` : '',
    });
    if(f.tipo === 'pic'){
      if(f.imagen){
        const img = el('img');
        img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.src = f.imagen;
        const r = f.recorte;
        if(r && (r.l || r.t || r.r || r.b)){
          const w = 1 / Math.max(0.05, 1 - r.l - r.r), h = 1 / Math.max(0.05, 1 - r.t - r.b);
          Object.assign(img.style, { position: 'absolute', width: w * 100 + '%', height: h * 100 + '%', left: -r.l * w * 100 + '%', top: -r.t * h * 100 + '%', maxWidth: 'none' });
          caja.style.overflow = 'hidden';
        }else Object.assign(img.style, { width: '100%', height: '100%' });
        caja.appendChild(img);
        caja.dataset.imagen = f.rutaImagen || '';
        caja.classList.add('es-imagen');
      }
    }else if(f.tipo === 'graphicFrame'){
      caja.classList.add('objeto');
      if(f.tabla?.filas?.length) pintarTabla(caja, f.tabla, k, ptPx);
      else if(f.grafica?.series?.length) pintarGrafica(caja, f.grafica, f.w * k, f.h * k, ptPx);
      else{ const e = el('span', 'etiqueta'); e.textContent = f.marcador; caja.appendChild(e); }
    }else{
      // Una línea de PowerPoint mide 0 de alto: se pinta como una barra del grueso de su borde.
      if(f.geo === 'line' && f.borde){
        const g = Math.max(1, f.borde.ancho * k);
        Object.assign(caja.style, { height: g + 'px', marginTop: -g / 2 + 'px', background: rgba(f.borde.color, f.borde.alfa ?? 1), borderRadius: g + 'px' });
        lienzo.appendChild(caja); if(f.cid != null) caja.dataset.cid = f.cid;
        continue;
      }
      caja.style.background = fondoCss(f.relleno);
      if(f.borde) caja.style.border = `${Math.max(1, f.borde.ancho * k)}px solid ${rgba(f.borde.color, f.borde.alfa ?? 1)}`;
      if(f.sombra) caja.style.boxShadow = `0 ${f.sombra.dist * k}px ${f.sombra.blur * k}px rgba(0,0,0,${f.sombra.alfa})`;
      if(f.geo === 'ellipse') caja.style.borderRadius = '50%';
      else if(RECORTE[f.geo]) caja.style.clipPath = RECORTE[f.geo];
      else if(f.geo === 'donut') Object.assign(caja.style, { borderRadius: '50%', mask: 'radial-gradient(circle, transparent 32%, #000 33%)', webkitMask: 'radial-gradient(circle, transparent 32%, #000 33%)' });
      else if(f.geo === 'cloud' || f.geo === 'cloudCallout') caja.style.borderRadius = '45%';
      else if(f.geo === 'flowChartMagneticDisk' || f.geo === 'can') caja.style.borderRadius = '50% / 22%';
      else if(/Callout$/.test(f.geo || '')) caja.style.borderRadius = Math.min(f.w, f.h) * k * 0.16 + 'px';
      else if(/round/i.test(f.geo)) caja.style.borderRadius = Math.min(f.w, f.h) * k * (f.redondeo ?? 0.16) + 'px';
      if(f.relleno?.rutaImagen){ caja.dataset.imagen = f.relleno.rutaImagen; caja.classList.add('es-imagen'); }
      if(f.parrafos?.some((p) => p.runs.some((r) => r.t))){
        const tx = el('div', 'texto', { justifyContent: ANCLA[f.ancla] || 'flex-start', padding: `${45720 * k}px ${91440 * k}px` });
        for(const p of f.parrafos){
          const pe = el('div', 'parrafo', { textAlign: ALINEA[p.alinea] || (f.titulo ? 'left' : 'left') });
          let alto = 0;
          if(p.viñeta && p.runs.length) pe.appendChild(Object.assign(el('span'), { textContent: '• ' }));
          for(const r of p.runs){
            if(r.br){ pe.appendChild(el('br')); continue; }
            const s = el('span', '', { fontSize: r.pt * ptPx + 'px', color: r.color, fontWeight: r.b ? '700' : '400', fontStyle: r.i ? 'italic' : 'normal' });
            if(r.letra) s.style.fontFamily = `"${r.letra.replace(/"/g, '')}", system-ui, sans-serif`;
            if(r.enlace || r.u) s.style.textDecoration = 'underline';
            s.textContent = r.t;
            alto = Math.max(alto, r.pt * ptPx);
            pe.appendChild(s);
          }
          if(!p.runs.length) pe.style.minHeight = '0.6em';
          if(alto && p.viñeta) pe.firstChild.style.fontSize = alto + 'px';
          tx.appendChild(pe);
        }
        caja.appendChild(tx);
      }
    }
    if(f.cid != null) caja.dataset.cid = f.cid;
    if(f.enlace){ caja.dataset.enlace = f.enlace; caja.classList.add('con-enlace'); }
    lienzo.appendChild(caja);
  }
  return lienzo;
}

/* ── tablas: una rejilla con los anchos y altos reales de PowerPoint ── */
function pintarTabla(caja, t, k, ptPx){
  caja.classList.add('tabla');
  const total = t.cols.reduce((s, w) => s + w, 0) || 1;
  Object.assign(caja.style, { display: 'grid', gridTemplateColumns: t.cols.map((w) => `${w / total * 100}%`).join(' '), gridAutoRows: 'auto' });
  const borde = (b) => b ? `${Math.max(0.5, b.w * k)}px solid ${rgba(b.color, b.alfa ?? 1)}` : 'none';
  t.filas.forEach((fila, r) => {
    let c = 0;
    for(const cel of fila.celdas){
      c++;
      if(cel.oculta) continue;
      const d = el('div', 'celda', {
        gridRow: `${r + 1} / span ${cel.rspan}`, gridColumn: `${c} / span ${cel.span}`, minHeight: fila.h * k + 'px',
        background: cel.relleno ? rgba(cel.relleno.color, cel.relleno.alfa ?? 1) : 'transparent', color: cel.color,
        fontSize: cel.pt * ptPx + 'px', fontWeight: cel.b ? '700' : '400', textAlign: ALINEA[cel.alinea] || 'left',
        borderLeft: borde(cel.bordes.L), borderRight: borde(cel.bordes.R), borderTop: borde(cel.bordes.T), borderBottom: borde(cel.bordes.B),
        padding: `${45720 * k}px ${91440 * k}px`,
      });
      d.textContent = cel.t;
      caja.appendChild(d);
    }
  });
}

/* ── gráficas: SVG a partir de los datos (los mismos que lee PowerPoint) ── */
const PALETA = ['#AC27FF', '#4FB286', '#D69A2D', '#3B82F6', '#EF4444', '#14B8A6', '#F59E0B', '#8B5CF6'];
const fmt = (v) => Math.abs(v) >= 1000 ? v.toLocaleString('es-MX', { maximumFractionDigits: 0 }) : String(Math.round(v * 100) / 100);
export function svgGrafica(g, W, H, ptPx = 1.33){
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('width', W); s.setAttribute('height', H);
  const add = (tag, at, texto) => { const e = document.createElementNS(NS, tag); for(const [a, v] of Object.entries(at)) e.setAttribute(a, v); if(texto != null) e.textContent = texto; s.appendChild(e); return e; };
  const fs = Math.max(8, Math.min(12 * ptPx, H / 14)), tx = g.colorTexto || '#404040';
  const colorS = (k) => g.series[k].color || g.colores?.[k] || PALETA[k % 8];
  const colorP = (j) => g.colores?.[j] || PALETA[j % 8];
  let y0 = 4;
  if(g.titulo){ add('text', { x: W / 2, y: fs * 1.4, 'text-anchor': 'middle', 'font-size': fs * 1.3, 'font-weight': 700, fill: tx }, g.titulo); y0 += fs * 1.9; }
  const redonda = g.tipo === 'pastel' || g.tipo === 'dona';
  const leyenda = g.leyenda ? (redonda ? g.categorias.map((c, j) => [c, colorP(j)]) : g.series.map((se, k) => [se.nombre, colorS(k)])) : [];
  const yL = H - (leyenda.length ? fs * 1.6 : 0);
  if(leyenda.length){
    const paso = W / leyenda.length;
    leyenda.forEach(([n, c], j) => { const x = paso * j + paso / 2; add('rect', { x: x - fs * 2.2, y: yL + fs * 0.3, width: fs * 0.8, height: fs * 0.8, rx: 2, fill: c }); add('text', { x: x - fs * 1.2, y: yL + fs * 1.05, 'font-size': fs * 0.9, fill: tx }, String(n).slice(0, 18)); });
  }
  const alto = yL - y0 - 4;
  if(redonda){
    const vals = g.series[0].valores.map((v) => Math.max(0, v)), tot = vals.reduce((a, b) => a + b, 0) || 1;
    const r = Math.max(4, Math.min(W / 2, alto / 2) - 4), cx = W / 2, cy = y0 + alto / 2, hueco = g.tipo === 'dona' ? r * 0.58 : 0;
    let a = -Math.PI / 2;
    vals.forEach((v, j) => {
      const b = a + v / tot * Math.PI * 2, grande = b - a > Math.PI ? 1 : 0;
      const p = (ang, rr) => `${cx + rr * Math.cos(ang)} ${cy + rr * Math.sin(ang)}`;
      const d = v >= tot ? `M${p(0, r)}A${r} ${r} 0 1 1 ${p(Math.PI, r)}A${r} ${r} 0 1 1 ${p(0, r)}Z` : hueco ? `M${p(a, r)}A${r} ${r} 0 ${grande} 1 ${p(b, r)}L${p(b, hueco)}A${hueco} ${hueco} 0 ${grande} 0 ${p(a, hueco)}Z` : `M${cx} ${cy}L${p(a, r)}A${r} ${r} 0 ${grande} 1 ${p(b, r)}Z`;
      add('path', { d, fill: colorP(j), stroke: '#FFFFFF', 'stroke-width': Math.max(1, r / 60), 'fill-rule': 'evenodd' });
      if(g.valores && v / tot > 0.04){ const m = (a + b) / 2, rr = hueco ? (r + hueco) / 2 : r * 0.62; add('text', { x: cx + rr * Math.cos(m), y: cy + rr * Math.sin(m) + fs * 0.35, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 700, fill: '#FFFFFF' }, fmt(v)); }
      a = b;
    });
    return s;
  }
  const n = g.categorias.length || 1, sers = g.series;
  const tot = g.categorias.map((_, j) => sers.reduce((t, se) => t + Math.max(0, se.valores[j] || 0), 0));
  let max = g.apilada ? Math.max(0, ...tot) : Math.max(0, ...sers.flatMap((se) => se.valores));
  const min = g.apilada ? 0 : Math.min(0, ...sers.flatMap((se) => se.valores));
  if(max === min) max = min + 1;
  const horiz = g.tipo === 'barras';
  const margenIzq = horiz ? Math.min(W * 0.3, fs * 0.6 * Math.max(3, ...g.categorias.map((c) => String(c).length))) : fs * 3.2;
  const x0 = margenIzq, x1 = W - 8, yTop = y0 + 6, yBot = yL - fs * (horiz ? 1.6 : 1.8);
  const esc = (v) => horiz ? x0 + (v - min) / (max - min) * (x1 - x0) : yBot - (v - min) / (max - min) * (yBot - yTop);
  for(let t = 0; t <= 4; t++){
    const v = min + (max - min) * t / 4, p = esc(v);
    if(horiz){ add('line', { x1: p, x2: p, y1: yTop, y2: yBot, stroke: tx, 'stroke-opacity': 0.15 }); add('text', { x: p, y: yBot + fs * 1.2, 'text-anchor': 'middle', 'font-size': fs * 0.85, fill: tx }, fmt(v)); }
    else{ add('line', { x1: x0, x2: x1, y1: p, y2: p, stroke: tx, 'stroke-opacity': 0.15 }); add('text', { x: x0 - 4, y: p + fs * 0.35, 'text-anchor': 'end', 'font-size': fs * 0.85, fill: tx }, fmt(v)); }
  }
  const banda = ((horiz ? yBot - yTop : x1 - x0)) / n;
  g.categorias.forEach((c, j) => {
    const m = (horiz ? yTop : x0) + banda * (j + 0.5);
    if(horiz) add('text', { x: x0 - 4, y: m + fs * 0.35, 'text-anchor': 'end', 'font-size': fs * 0.9, fill: tx }, String(c).slice(0, 20));
    else add('text', { x: m, y: yBot + fs * 1.3, 'text-anchor': 'middle', 'font-size': fs * 0.9, fill: tx }, String(c).slice(0, 14));
  });
  if(g.tipo === 'lineas' || g.tipo === 'area'){
    const acum = g.categorias.map(() => 0);
    sers.forEach((se, k) => {
      const pts = se.valores.map((v, j) => { const base = g.apilada ? acum[j] : 0; const y = esc(base + v); if(g.apilada) acum[j] += v; return [x0 + banda * (j + 0.5), y]; });
      const d = pts.map(([x, y], j) => `${j ? 'L' : 'M'}${x} ${y}`).join('');
      if(g.tipo === 'area') add('path', { d: `${d}L${pts.at(-1)[0]} ${esc(0)}L${pts[0][0]} ${esc(0)}Z`, fill: colorS(k), 'fill-opacity': 0.75 });
      else{ add('path', { d, fill: 'none', stroke: colorS(k), 'stroke-width': Math.max(2, fs / 5), 'stroke-linejoin': 'round' }); pts.forEach(([x, y]) => add('circle', { cx: x, cy: y, r: Math.max(2.5, fs / 4), fill: colorS(k) })); }
      if(g.valores) pts.forEach(([x, y], j) => add('text', { x, y: y - fs * 0.6, 'text-anchor': 'middle', 'font-size': fs * 0.85, 'font-weight': 700, fill: tx }, fmt(se.valores[j])));
    });
    return s;
  }
  const grupo = banda * 0.8, ancho = g.apilada ? grupo : grupo / sers.length;
  const acum = g.categorias.map(() => 0);
  sers.forEach((se, k) => se.valores.forEach((v, j) => {
    const ini = (horiz ? yTop : x0) + banda * j + banda * 0.1 + (g.apilada ? 0 : ancho * k);
    const base = g.apilada ? acum[j] : 0, a = esc(base), b = esc(base + v);
    if(g.apilada) acum[j] += v;
    const r = horiz ? { x: Math.min(a, b), y: ini, width: Math.abs(b - a), height: ancho * 0.94 } : { x: ini, y: Math.min(a, b), width: ancho * 0.94, height: Math.abs(b - a) };
    add('rect', { ...r, rx: Math.min(4, ancho / 8), fill: colorS(k) });
    if(g.valores && Math.abs(b - a) > fs){
      if(horiz) add('text', { x: g.apilada ? (a + b) / 2 : b + 4, y: ini + ancho * 0.47 + fs * 0.35, 'text-anchor': g.apilada ? 'middle' : 'start', 'font-size': fs * 0.85, 'font-weight': 700, fill: g.apilada ? '#FFFFFF' : tx }, fmt(v));
      else add('text', { x: ini + ancho * 0.47, y: g.apilada ? (a + b) / 2 + fs * 0.35 : b - 4, 'text-anchor': 'middle', 'font-size': fs * 0.85, 'font-weight': 700, fill: g.apilada ? '#FFFFFF' : tx }, fmt(v));
    }
  }));
  return s;
}
function pintarGrafica(caja, g, w, h, ptPx){
  caja.classList.add('grafica');
  caja.appendChild(svgGrafica(g, Math.max(20, w), Math.max(20, h), ptPx));
}

/* Mete el lienzo en un contenedor y lo escala a su ancho. */
export function montar(cont, m){
  cont.replaceChildren(pintar(m));
  escalar(cont);
}
export function escalar(cont){
  const lz = cont.firstElementChild;
  if(!lz) return;
  lz.style.transform = `scale(${cont.clientWidth / BASE})`;
}
