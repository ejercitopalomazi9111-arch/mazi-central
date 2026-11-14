/* ══════════════════════════════════════════════════════════════════════════
   LA PALOMA VIVA · el logo de Grupo Mazi animado
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «que esté como flotando, que los cristales… respiren, se alejen un poco entre ellos, se
   vuelvan a acercar, muy suave… En caso de animarlo, que puedan separarse más… estirarse, que se utilicen
   estos cristales como pequeños cursores cuando se quiera crear algo… que se separen de las alas como si fueran
   plumas, se junten, se abran y se cree, por ejemplo, un recuadro… como si fuera un cúmulo de cristales de un
   hechizo mágico».

   Cada cristal es una pieza del logo (marca/paloma-2026, polígonos del dibujo de Carlos). Ninguno se deforma:
   lo que cambia es dónde está cada uno, así la FORMA del ave se abre, se estira y se rehace.
   Todo va con resortes: cualquier cambio llega suave, aunque se pida a media animación.

     import { crearPaloma } from '/marca/paloma-2026/vivo.js';
     const p = await crearPaloma(document.querySelector('#logo'));
     p.abrir(1)                 // se separan los cristales (0 = junto)
     p.estirar(1.3, .85)        // la forma del ave, más ancha y más baja
     await p.formar(caja)       // las plumas vuelan y trazan un recuadro (caja = {x, y, w, h} en px de la página)
     await p.volver()           // regresan a su lugar
     p.respirar(1)              // cuánto respira en reposo (0 = quieta)
     p.parar()                  // quita el ciclo

   En video (herramientas/video/armar.mjs) se crea con { reloj: 'manual' } y se mueve con p.paso(t).
   Con «reducir movimiento» del sistema, respira apenas y lo demás llega sin rebote.
   ═════════════════════════════════════════════════════════════════════════ */
const SVG_URL = new URL('./logo-transparente.svg', import.meta.url);
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (u) => u * u * (3 - 2 * u);
const tramo = (t, a, b) => cl((t - a) / (b - a));

export async function crearPaloma(contenedor, { reloj = 'auto', brillo = true, flotar = true, respira = 1, puntero = true, svg: texto = null } = {}){
  const quieto = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  contenedor.innerHTML = texto || await (await fetch(SVG_URL)).text();
  const svg = contenedor.querySelector('svg');
  svg.style.overflow = 'visible'; svg.style.display = 'block'; svg.style.width = '100%'; svg.style.height = 'auto';
  /* el halo del archivo es una copia quieta de las piezas: aquí no sirve (se quedaría atrás). El brillo sale de
     una sombra de color sobre todo el dibujo, que sí sigue a cada cristal */
  svg.querySelector('g[filter]')?.remove();
  if(brillo) svg.style.filter = 'drop-shadow(0 0 14px rgba(172,39,255,.55))';
  const VB = svg.viewBox.baseVal, centro = { x: VB.x + VB.width / 2, y: VB.y + VB.height * .42 };

  /* las piezas, con su centro, su eje largo y su papel (estrella, ala/cola = plumas, letras) */
  const piezas = [];
  for(const el of [...svg.children]){
    if(el.tagName === 'defs') continue;
    for(const e of el.tagName === 'g' ? [...el.children] : [el]) piezas.push({ el: e });
  }
  const yGrupo = VB.y + VB.height * .52, yCola = VB.y + VB.height * .73;
  piezas.forEach((p, i) => {
    p.el.style.transformBox = 'fill-box'; p.el.style.transformOrigin = 'center'; p.el.style.willChange = 'transform';
    const b = p.el.getBBox(); p.c = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; p.w = b.width; p.h = b.height;
    const dx = p.c.x - centro.x, dy = p.c.y - centro.y; p.dist = Math.hypot(dx, dy) || 1; p.dir = { x: dx / p.dist, y: dy / p.dist };
    p.ang0 = eje(p.el);
    p.papel = i < 3 ? 'estrella' : (p.c.y < yGrupo || p.c.y > yCola) && p.el.tagName === 'polygon' && Math.max(b.width, b.height) > 60 ? 'pluma' : 'letra';
    p.fase = p.dist * .0045 + Math.atan2(dy, dx) * .5 + i * .37;
    p.x = p.y = p.r = 0; p.s = 1; p.vx = p.vy = p.vr = p.vs = 0;
    p.forma = null;
  });

  const E = { respira: quieto ? .25 : respira, abre: 0, sx: 1, sy: 1, punt: null, t: 0, ondas: [] };
  let ultimo = null, hilo = 0;
  const marco = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  marco.setAttribute('fill', 'none'); marco.setAttribute('stroke', '#E2B8FF'); marco.setAttribute('stroke-width', '6');
  marco.setAttribute('stroke-linejoin', 'round'); marco.style.opacity = 0; marco.style.filter = 'drop-shadow(0 0 8px #C77DFF)';
  svg.appendChild(marco);

  /* de px de la página a unidades del dibujo */
  const aSvg = (x, y) => { const m = svg.getScreenCTM(); if(!m) return { x, y }; const q = new DOMPoint(x, y).matrixTransform(m.inverse()); return { x: q.x, y: q.y }; };

  function paso(t){
    const dt = ultimo == null ? 1 / 60 : cl(t - ultimo, 0, .05); ultimo = t; E.t = t;
    const k = quieto ? 90 : 46, amort = quieto ? 2 * Math.sqrt(90) : 2 * Math.sqrt(46) * .72;
    for(const p of piezas){
      /* 1 · reposo: respira (se aleja y vuelve en ola, del centro hacia fuera) y se mece un poquito */
      const ola = .5 + .5 * Math.sin(t * 1.15 - p.fase);
      let tx = p.dir.x * 14 * E.respira * ola, ty = p.dir.y * 14 * E.respira * ola;
      let tr = Math.sin(t * .7 + p.fase * 2) * 1.6 * E.respira, ts = 1;
      if(p.papel === 'estrella') ts = 1 + .07 * E.respira * Math.sin(t * 2.2);
      /* 2 · abrirse: cada cristal se va hacia fuera y gira un poco, como hechizo que se expande */
      if(E.abre){ const a = E.abre; tx += p.dir.x * (60 + p.dist * .38) * a - p.dir.y * 40 * a * Math.sin(p.fase); ty += p.dir.y * (60 + p.dist * .38) * a + p.dir.x * 40 * a * Math.sin(p.fase);
        tr += 22 * a * Math.sin(p.fase * 3); }
      /* 3 · estirar la forma del ave (los cristales no se deforman: cambia dónde están) */
      tx += (p.c.x - centro.x) * (E.sx - 1); ty += (p.c.y - centro.y) * (E.sy - 1);
      /* 4 · el dedo: los cristales cercanos se apartan */
      if(E.punt){ const dx = p.c.x + p.x - E.punt.x, dy = p.c.y + p.y - E.punt.y, d = Math.hypot(dx, dy), R = 260;
        if(d < R){ const f = Math.pow(1 - d / R, 2) * 90; tx += dx / (d || 1) * f; ty += dy / (d || 1) * f; tr += f * .15; } }
      /* 5 · las ondas de un toque */
      for(const o of E.ondas){ const d = Math.hypot(p.c.x - o.x, p.c.y - o.y), u = (t - o.t) * 900 - d;
        if(u > 0 && u < 500){ const f = Math.sin(u / 500 * Math.PI) * 38 * o.f; tx += (p.c.x - o.x) / (d || 1) * f; ty += (p.c.y - o.y) / (d || 1) * f; } }
      /* 6 · formar algo: la pluma deja el ala y va a su lugar en el trazo */
      if(p.forma){ const f = p.forma, w = f.hasta != null ? 1 - suave(tramo(t, f.hasta, f.hasta + .55)) : suave(tramo(t, f.desde, f.desde + .5));
        if(w <= 0 && f.hasta != null) p.forma = null;
        else { const vol = Math.sin(Math.PI * w) * 70;                       /* un arco al volar, no línea recta */
          tx = mezcla(tx, f.x - p.c.x - p.dir.y * vol, w); ty = mezcla(ty, f.y - p.c.y + p.dir.x * vol - vol * .4, w);
          tr = mezcla(tr, f.r, w); ts = mezcla(ts, f.s, w); } }
      /* el resorte */
      p.vx += (k * (tx - p.x) - amort * p.vx) * dt; p.x += p.vx * dt;
      p.vy += (k * (ty - p.y) - amort * p.vy) * dt; p.y += p.vy * dt;
      p.vr += (k * (tr - p.r) - amort * p.vr) * dt; p.r += p.vr * dt;
      p.vs += (k * (ts - p.s) - amort * p.vs) * dt; p.s += p.vs * dt;
      p.el.style.transform = `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;
    }
    E.ondas = E.ondas.filter((o) => t - o.t < 2.5);
    /* todo el dibujo flota */
    if(flotar) svg.style.transform = `translateY(${(Math.sin(t * .8) * 7 * (quieto ? .3 : 1)).toFixed(2)}px) rotate(${(Math.sin(t * .5) * .5 * (quieto ? 0 : 1)).toFixed(3)}deg)`;
    /* el marco que trazan las plumas */
    if(E.marco){ const m = E.marco, u = m.hasta != null ? 1 - tramo(t, m.hasta, m.hasta + .4) : suave(tramo(t, m.desde, m.desde + .9));
      marco.style.opacity = (u * .95).toFixed(3); marco.style.strokeDashoffset = ((1 - u) * m.largo).toFixed(1);
      if(m.hasta != null && u <= 0) E.marco = null; }
  }
  const mezcla = (a, b, u) => a + (b - a) * u;

  /* el reloj de la página */
  const correr = () => { const f = (ms) => { paso(ms / 1000); hilo = requestAnimationFrame(f); }; hilo = requestAnimationFrame(f); };
  if(reloj === 'auto') correr();
  const ahora = () => E.t;
  const espera = (s) => reloj === 'auto' ? new Promise((r) => setTimeout(r, s * 1000)) : Promise.resolve();

  /* el dedo cerca del logo: los cristales se hacen a un lado; un toque manda una onda */
  if(puntero && reloj === 'auto'){
    const mover = (e) => { E.punt = aSvg(e.clientX, e.clientY); };
    contenedor.addEventListener('pointermove', mover); contenedor.addEventListener('pointerleave', () => { E.punt = null; });
    contenedor.addEventListener('pointerdown', (e) => { const q = aSvg(e.clientX, e.clientY); E.ondas.push({ x: q.x, y: q.y, t: ahora(), f: 1 }); });
  }

  const api = {
    svg, piezas, paso,
    respirar(n = 1){ E.respira = quieto ? Math.min(n, .25) : n; return api; },
    abrir(n = 1){ E.abre = n; return api; },
    cerrar(){ E.abre = 0; E.sx = E.sy = 1; return api; },
    estirar(sx = 1, sy = 1){ E.sx = sx; E.sy = sy; return api; },
    onda(x, y, f = 1){ const q = aSvg(x, y); E.ondas.push({ x: q.x, y: q.y, t: ahora(), f }); return api; },
    /* las plumas trazan un recuadro: caja en px de la página ({x, y, w, h}, como getBoundingClientRect) */
    async formar(caja, { con = 'pluma', escala = .62, marco: conMarco = true } = {}){
      const cw = caja.w ?? caja.width, ch = caja.h ?? caja.height;
      const a = aSvg(caja.x ?? caja.left, caja.y ?? caja.top), b = aSvg((caja.x ?? caja.left) + cw, (caja.y ?? caja.top) + ch);
      const W = b.x - a.x, H = b.y - a.y, per = 2 * (W + H);
      const usar = piezas.filter((p) => con === 'todas' || p.papel === con);
      /* en orden de ala: de la punta de una a la de la otra, para que se desprendan como plumas */
      usar.sort((p, q) => Math.atan2(p.dir.y, p.dir.x) - Math.atan2(q.dir.y, q.dir.x));
      const t0 = ahora();
      usar.forEach((p, i) => {
        let s = (i + .5) / usar.length * per, x, y, ang;
        if(s < W){ x = a.x + s; y = a.y; ang = 0; } else if((s -= W) < H){ x = b.x; y = a.y + s; ang = 90; }
        else if((s -= H) < W){ x = b.x - s; y = b.y; ang = 180; } else { s -= W; x = a.x; y = b.y - s; ang = 270; }
        let r = ((ang - p.ang0) % 180 + 270) % 180 - 90;                                 /* el giro más corto para quedar sobre la orilla */
        p.forma = { x, y, r, s: escala, desde: t0 + i * .045 };
      });
      /* lo que no traza (estrella, cuerpo, letras) se junta arriba del recuadro como emblema chiquito */
      const resto = piezas.filter((p) => !usar.includes(p)), k = .3;
      if(resto.length){ const abajo = Math.max(...resto.map((p) => p.c.y + p.h / 2));
        resto.forEach((p, i) => { p.forma = { x: a.x + W / 2 + (p.c.x - centro.x) * k, y: a.y - 18 / (svg.getScreenCTM()?.a || 1) - (abajo - centro.y) * k + (p.c.y - centro.y) * k, r: 0, s: k, desde: t0 + .15 + i * .008 }; }); }
      if(conMarco){ marco.setAttribute('x', a.x); marco.setAttribute('y', a.y); marco.setAttribute('width', W); marco.setAttribute('height', H);
        marco.setAttribute('rx', Math.min(W, H) * .06); marco.style.strokeDasharray = per; E.marco = { desde: t0 + usar.length * .045 + .2, largo: per }; }
      await espera(usar.length * .045 + 1.1);
      return api;
    },
    async volver(){
      const t0 = ahora(); let i = 0;
      for(const p of piezas) if(p.forma && p.forma.hasta == null) p.forma.hasta = t0 + (i++) * .03;
      if(E.marco) E.marco.hasta = t0;
      await espera(i * .03 + .9);
      return api;
    },
    parar(){ cancelAnimationFrame(hilo); },
  };
  paso(0);
  return api;
}

/* el eje largo de un polígono, en grados (para acostar la pluma sobre la orilla del recuadro) */
function eje(el){
  const pts = el.tagName === 'polygon' ? [...el.points].map((q) => [q.x, q.y]) : null;
  if(!pts || pts.length < 3) return 0;
  const mx = pts.reduce((s, q) => s + q[0], 0) / pts.length, my = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  let xx = 0, yy = 0, xy = 0; for(const [x, y] of pts){ xx += (x - mx) ** 2; yy += (y - my) ** 2; xy += (x - mx) * (y - my); }
  return .5 * Math.atan2(2 * xy, xx - yy) * 180 / Math.PI;
}
