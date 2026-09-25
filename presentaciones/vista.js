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
      if(f.marcador === 'Tabla' && f.parrafos?.length){
        caja.classList.add('tabla');
        for(const p of f.parrafos){ const c = el('div', 'celda'); c.textContent = p.runs[0].t; caja.appendChild(c); }
      }else{ const e = el('span', 'etiqueta'); e.textContent = f.marcador; caja.appendChild(e); }
    }else{
      caja.style.background = fondoCss(f.relleno);
      if(f.borde) caja.style.border = `${Math.max(1, f.borde.ancho * k)}px solid ${f.borde.color}`;
      if(f.geo === 'ellipse') caja.style.borderRadius = '50%';
      else if(/round/i.test(f.geo)) caja.style.borderRadius = Math.min(f.w, f.h) * k * 0.16 + 'px';
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
    lienzo.appendChild(caja);
  }
  return lienzo;
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
