/* ============================================================
   EL PACTO ROTO — magia.js
   Clasificador de trazos (port fiel del brief, sección 5),
   atelier de dibujo, lector en vivo y puente al juicio del árbitro.
   El código decide QUÉ se dibujó. El LLM decide QUÉ significa.
   ============================================================ */
window.MAGIA = (function () {

  /* ===================== GEOMETRÍA ===================== */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function bbox(pts) {
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for (const p of pts) { if (p.x < mnx) mnx = p.x; if (p.y < mny) mny = p.y; if (p.x > mxx) mxx = p.x; if (p.y > mxy) mxy = p.y; }
    return { mnx, mny, mxx, mxy, w: mxx - mnx, h: mxy - mny, cx: (mnx + mxx) / 2, cy: (mny + mxy) / 2 };
  }
  function pathLen(p) { let s = 0; for (let i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]); return s; }
  function perp(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / L;
  }
  // Ramer–Douglas–Peucker
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    let dmax = 0, idx = 0;
    const a = pts[0], b = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) { const d = perp(pts[i], a, b); if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > eps) {
      const L = rdp(pts.slice(0, idx + 1), eps), R = rdp(pts.slice(idx), eps);
      return L.slice(0, -1).concat(R);
    }
    return [a, b];
  }
  // RDP para curvas CERRADAS: extremos idénticos rompen el RDP normal.
  // Ancla en el punto más lejano al inicio, parte el lazo en dos y devuelve
  // los vértices reales (esquinas) SIN duplicar el cierre. — TRAMPA 1
  function rdpClosed(pts, eps) {
    let arr = pts.slice();
    if (arr.length > 2 && dist(arr[0], arr[arr.length - 1]) < eps * 0.5) arr = arr.slice(0, -1);
    if (arr.length < 3) return arr;
    let far = 1, fd = 0;
    for (let i = 1; i < arr.length; i++) { const d = dist(arr[0], arr[i]); if (d > fd) { fd = d; far = i; } }
    const A = rdp(arr.slice(0, far + 1), eps);
    const B = rdp(arr.slice(far).concat([arr[0]]), eps);
    return A.concat(B.slice(1, -1)); // esquinas alrededor del lazo, sin duplicados
  }
  const centroid = (p) => { let x = 0, y = 0; for (const q of p) { x += q.x; y += q.y; } return { x: x / p.length, y: y / p.length }; };
  function shoelace(p) { let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i].x * p[j].y - p[j].x * p[i].y; } return a / 2; }
  // giro acumulado CON SIGNO (rad)
  function signedTurning(V) {
    let sum = 0;
    for (let i = 1; i < V.length - 1; i++) {
      const ax = V[i].x - V[i - 1].x, ay = V[i].y - V[i - 1].y;
      const bx = V[i + 1].x - V[i].x, by = V[i + 1].y - V[i].y;
      const cross = ax * by - ay * bx, dot = ax * bx + ay * by;
      sum += Math.atan2(cross, dot);
    }
    return sum;
  }
  // point in polygon (ray casting)
  function inPoly(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / ((yj - yi) || 1e-9) + xi)) c = !c;
    }
    return c;
  }

  /* ===================== CLASIFICADOR DE UN TRAZO ===================== */
  function shapeOf(pts) {
    if (pts.length < 2) return { kind: 'dot', pts, bb: bbox(pts), centroid: centroid(pts) };
    const bb = bbox(pts);
    const diag = Math.hypot(bb.w, bb.h) || 1;
    const len = pathLen(pts);
    const closed = dist(pts[0], pts[pts.length - 1]) < diag * 0.25 && len > diag * 1.4;
    const eps = Math.max(3, diag * 0.075);
    // TRAMPA 1: cerradas cuentan esquinas del lazo; abiertas, vértices interiores.
    const V = closed ? rdpClosed(pts, eps) : rdp(pts, eps);
    const nv = closed ? V.length : Math.max(0, V.length - 2);
    const cen = centroid(pts);

    // straightness
    let maxPerp = 0; for (const p of pts) { const d = perp(p, pts[0], pts[pts.length - 1]); if (d > maxPerp) maxPerp = d; }
    const straightness = maxPerp / (len || 1);   // ~0 recto, alto curvo

    // circularity
    const poly = closed ? pts.concat([pts[0]]) : pts;
    const area = Math.abs(shoelace(poly));
    const peri = pathLen(poly) || 1;
    const circ = closed ? (4 * Math.PI * area) / (peri * peri) : 0;

    // radios respecto al centroide
    const radii = pts.map(p => dist(p, cen));
    const rmean = radii.reduce((a, b) => a + b, 0) / radii.length;
    const rvar = radii.reduce((a, r) => a + (r - rmean) * (r - rmean), 0) / radii.length / (rmean * rmean || 1);
    // tendencia de radio (correlación con índice) para espiral
    let rtrend = 0; { const n = radii.length; let sx = 0, sy = 0, sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sx += i; sy += radii[i]; sxy += i * radii[i]; sxx += i * i; } const denom = (n * sxx - sx * sx) || 1; rtrend = (n * sxy - sx * sy) / denom; }

    const turn = signedTurning(V);
    const absTurn = Math.abs(turn);
    // suma de ángulos ABSOLUTOS por vértice (agudeza real; el signo se cancela en zigzag)
    let absTurnSum = 0;
    for (let i = 1; i < V.length - 1; i++) {
      const ax = V[i].x - V[i - 1].x, ay = V[i].y - V[i - 1].y, bx = V[i + 1].x - V[i].x, by = V[i + 1].y - V[i].y;
      absTurnSum += Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
    }
    const avgAbsAngle = absTurnSum / Math.max(1, V.length - 2);

    // alternancia de producto cruz (zigzag)
    let alt = 0; { let prev = 0; for (let i = 1; i < V.length - 1; i++) { const ax = V[i].x - V[i - 1].x, ay = V[i].y - V[i - 1].y, bx = V[i + 1].x - V[i].x, by = V[i + 1].y - V[i].y; const cr = ax * by - ay * bx; const s = cr > 0 ? 1 : cr < 0 ? -1 : 0; if (s !== 0 && prev !== 0 && s !== prev) alt++; if (s !== 0) prev = s; } }

    const base = { pts, V, bb, diag, len, closed, nv, circ, straightness, turn, absTurn, rvar, rtrend, alt, centroid: cen, area, straightMaxPerp: maxPerp };

    // ---- GUARDA DE PUNTO (absoluta) — TRAMPA 4
    if (len < 20 && Math.max(bb.w, bb.h) < 14) return Object.assign(base, { kind: 'dot' });

    // ---- ESPIRAL antes que círculo: mucho giro + radio con tendencia
    if (absTurn > 4.2 && Math.abs(rtrend) > 0.35 && nv >= 3) return Object.assign(base, { kind: 'spiral' });

    // ---- LÍNEA RECTA (umbral absoluto len>=20) — TRAMPA 3
    if (!closed && nv <= 1 && len >= 20 && straightness < 0.18) return Object.assign(base, { kind: 'line' });

    // ---- FIGURAS CERRADAS (contar vértices ANTES de decidir anillo) — TRAMPA 2
    if (closed) {
      if (nv === 3) return Object.assign(base, { kind: 'triangle' });
      if (nv === 4) return Object.assign(base, { kind: 'square' });
      if (nv >= 5 && circ >= 0.72 && rvar < 0.08) return Object.assign(base, { kind: 'circle' });
      if (circ >= 0.7) return Object.assign(base, { kind: 'circle' });
      return Object.assign(base, { kind: nv <= 4 ? 'square' : 'circle' });
    }

    // ---- ZIGZAG (alternancia de cruz) vs onda
    if (nv >= 3 && alt >= 2) {
      // onda (Agua): reversales suaves; zigzag: quiebres agudos (ángulo medio alto)
      if (avgAbsAngle < 0.8) return Object.assign(base, { kind: 'wave' });
      return Object.assign(base, { kind: 'zigzag' });
    }

    // ---- ARCO (abierto, curvo)
    if (!closed && straightness >= 0.12) return Object.assign(base, { kind: 'arc' });

    // ---- fallback
    if (!closed && nv <= 1 && len >= 20) return Object.assign(base, { kind: 'line' });
    return Object.assign(base, { kind: 'dot' });
  }

  // dirección de línea/vector
  function lineDir(sh) {
    const a = sh.pts[0], b = sh.pts[sh.pts.length - 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x); // y hacia abajo en canvas
    const deg = (ang * 180 / Math.PI + 360) % 360;
    // vertical (75..105 o 255..285) -> Columna ; else Vector
    const vertical = (deg > 60 && deg < 120) || (deg > 240 && deg < 300);
    return { deg, vertical, pointsDown: (b.y > a.y), pointsRight: (b.x > a.x) };
  }

  /* ===================== TRAZO -> GLIFO ===================== */
  // devuelve {key, g, nombre, tipo:'sigilo'|'signo'|'anillo', inv, ring?}
  function glyphOfShape(sh) {
    const SG = DATA.SIGILOS, SN = DATA.SIGNOS;
    switch (sh.kind) {
      case 'circle': return { key: 'anillo', g: '○', nombre: 'Anillo', tipo: 'anillo', ring: true, circ: sh.circ };
      case 'triangle': return sig('tierra');
      case 'square': return signo('contencion');
      case 'spiral': return signo('espiral', sh.turn > 0 ? false : true);
      case 'zigzag': return signo('cadena');
      case 'arc': { const opensUp = sh.centroid.y > (sh.bb.mny + sh.bb.h * 0.45); return signo('arco', !opensUp); }
      case 'wave': return sig('agua');
      case 'dot': return signo('chispa');
      case 'line': {
        const d = lineDir(sh);
        if (d.vertical) return signo('columna', !d.pointsDown);   // apunta abajo = normal
        return signo('vector', !d.pointsRight);                   // apunta derecha = normal
      }
      default: return signo('chispa');
    }
    function sig(k, inv) { const s = SG[k]; return { key: k, g: s.g, nombre: s.nombre, tipo: 'sigilo', efecto: s.efecto, inv: !!inv }; }
    function signo(k, inv) { const s = SN[k]; return { key: k, g: s.g, nombre: s.nombre, tipo: 'signo', efecto: s.efecto, invEfecto: s.inv, inv: !!inv }; }
  }

  /* ===================== AGRUPACIÓN DE GLIFOS COMPUESTOS ===================== */
  // entrada: strokes [{pts, t0, t1}]  -> grupos [{idx:[..], shapes:[..]}]
  function groupCompounds(shapes, canvasMinDim) {
    const n = shapes.length;
    const pad = (canvasMinDim || 260) * 0.13;   // TRAMPA 5: 13% de la dimensión menor del lienzo
    const used = new Array(n).fill(false);
    let groups = [];
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const grp = [i]; used[i] = true;
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < n; j++) {
          if (used[j]) continue;
          for (const gi of grp) {
            const A = shapes[gi], B = shapes[j];
            const near = rectDist(A.bb, B.bb) < pad;
            const seq = Math.abs((B.t0 || 0) - (A.t1 || 0)) < 1400 || Math.abs((A.t0 || 0) - (B.t1 || 0)) < 1400;
            if (near && seq) { grp.push(j); used[j] = true; changed = true; break; }
          }
        }
      }
      groups.push(grp);
    }
    // Dispersión: 3+ puntos sueltos son inherentemente dispersos, no "cerca".
    // Une los grupos que son un solo punto en uno solo si hay 3 o más.
    const dotGroups = groups.filter(g => g.length === 1 && shapes[g[0]].kind === 'dot');
    if (dotGroups.length >= 3) {
      const merged = dotGroups.flat();
      groups = groups.filter(g => !(g.length === 1 && shapes[g[0]].kind === 'dot'));
      groups.push(merged);
    }
    return groups;
  }
  function rectDist(a, b) {
    const dx = Math.max(0, Math.max(a.mnx - b.mxx, b.mnx - a.mxx));
    const dy = Math.max(0, Math.max(a.mny - b.mxy, b.mny - a.mxy));
    return Math.hypot(dx, dy);
  }

  // clasifica un GRUPO de trazos en un glifo compuesto (o null si es simple)
  function glyphOfGroup(grp, shapes) {
    if (grp.length === 1) return null;
    const S = grp.map(i => shapes[i]);
    const kinds = S.map(s => s.kind);
    const lines = S.filter(s => s.kind === 'line');
    const dots = S.filter(s => s.kind === 'dot');
    const closedS = S.filter(s => s.kind === 'circle' || s.kind === 'triangle' || s.kind === 'square');
    const SG = DATA.SIGILOS, SN = DATA.SIGNOS;
    // círculo + 3+ rayos -> Luz
    if (closedS.some(s => s.kind === 'circle') && lines.length >= 3)
      return { key: 'luz', g: SG.luz.g, nombre: SG.luz.nombre, tipo: 'sigilo', efecto: SG.luz.efecto, inv: false, comp: `círculo + ${lines.length} rayos` };
    // 3+ puntos -> Dispersión
    if (dots.length >= 3 && lines.length === 0 && closedS.length === 0)
      return { key: 'dispersion', g: SN.dispersion.g, nombre: SN.dispersion.nombre, tipo: 'signo', efecto: SN.dispersion.efecto, invEfecto: SN.dispersion.inv, inv: false, comp: `${dots.length} puntos` };
    // figura cerrada + dot(s) dentro -> Fuego
    if (closedS.length >= 1 && dots.length >= 1 && lines.length === 0) {
      const clo = closedS[0]; const inside = dots.filter(d => inPoly(d.centroid, clo.pts));
      if (inside.length >= 1) return { key: 'fuego', g: SG.fuego.g, nombre: SG.fuego.nombre, tipo: 'sigilo', efecto: SG.fuego.efecto, inv: false, comp: 'anillo + brasa' };
    }
    // líneas cruzadas en varias direcciones -> Viento
    if (lines.length >= 2) {
      const dirs = lines.map(l => { const d = lineDir(l); return Math.round(d.deg / 30); });
      const uniq = new Set(dirs);
      const crossed = lines.some((l, i) => lines.some((m, k) => k > i && segCross(l, m)));
      if (crossed && uniq.size >= 2)
        return { key: 'viento', g: SG.viento.g, nombre: SG.viento.nombre, tipo: 'sigilo', efecto: SG.viento.efecto, inv: false, comp: 'líneas cruzadas' };
      // 2+ paralelas -> Repetición
      if (uniq.size <= 1)
        return { key: 'repeticion', g: SN.repeticion.g, nombre: SN.repeticion.nombre, tipo: 'signo', efecto: SN.repeticion.efecto, invEfecto: SN.repeticion.inv, inv: false, comp: `${lines.length} paralelas` };
    }
    // figura cerrada + 1-2 líneas dentro -> Cristal
    if (closedS.length >= 1 && lines.length >= 1 && lines.length <= 2) {
      const clo = closedS[0]; const inside = lines.filter(l => inPoly(l.centroid, clo.pts));
      if (inside.length >= 1) return { key: 'cristal', g: SN.cristal.g, nombre: SN.cristal.nombre, tipo: 'signo', efecto: SN.cristal.efecto, invEfecto: SN.cristal.inv, inv: false, comp: 'cerrada + venas' };
    }
    return null; // no forma compuesto reconocido: se tratan como simples
  }
  function segCross(a, b) {
    const p1 = a.pts[0], p2 = a.pts[a.pts.length - 1], p3 = b.pts[0], p4 = b.pts[b.pts.length - 1];
    function ccw(A, B, C) { return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x); }
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }

  /* ===================== ANÁLISIS COMPLETO -> LECTURA ===================== */
  function analyze(strokes, canvasArea) {
    const shapes = strokes.map(s => Object.assign(shapeOf(s.pts), { t0: s.t0, t1: s.t1 }));
    const minDim = Math.sqrt(canvasArea || 67600);
    const groups = groupCompounds(shapes, minDim);

    // tokens = un glifo por grupo (compuesto) o por trazo suelto
    const tokens = [];
    const looseRingCandidates = [];
    for (const grp of groups) {
      const comp = glyphOfGroup(grp, shapes);
      if (comp) {
        const gpts = grp.flatMap(i => shapes[i].pts);
        tokens.push({ glyph: comp, centroid: centroid(gpts), bb: bbox(gpts), idx: grp, ring: false });
      } else {
        for (const i of grp) {
          const g = glyphOfShape(shapes[i]);
          const tok = { glyph: g, centroid: shapes[i].centroid, bb: shapes[i].bb, idx: [i], ring: !!g.ring, shape: shapes[i] };
          tokens.push(tok);
          if (g.ring) looseRingCandidates.push(tok);
        }
      }
    }

    // anillo = la cerrada más grande y más redonda entre trazos SUELTOS
    let ring = null;
    for (const t of looseRingCandidates) {
      const score = (t.glyph.circ || 0.7) * (t.bb.w * t.bb.h);
      if (!ring || score > ring._score) { ring = t; ring._score = score; }
    }

    const dentro = [], fuera = [];
    let sigilo = null;
    for (const t of tokens) {
      if (t === ring) continue;
      const inside = ring ? inPoly(t.centroid, ringPoly(ring)) : false;
      if (t.glyph.tipo === 'sigilo') {
        if (inside || !ring) { if (!sigilo) sigilo = withClave(t.glyph); else dentro.push(withClave(t.glyph)); }
        else fuera.push(withClave(t.glyph));
      } else {
        (inside || (!ring)) ? dentro.push(t.glyph) : fuera.push(t.glyph);
      }
      t._inside = inside;
    }

    // métricas
    const cArea = canvasArea || 1;
    const ringArea = ring ? ring.bb.w * ring.bb.h : 0;
    const areaPct = Math.round(100 * ringArea / cArea);
    const redondez = ring ? Math.round(Math.min(100, (ring.glyph.circ || 0.8) * 100)) : 0;
    const temblor = +(shapes.reduce((a, s) => a + Math.min(1, (s.straightMaxPerp || 0) / (s.diag || 1) * (s.kind === 'line' ? 4 : 0.6)), 0) / (shapes.length || 1)).toFixed(2);
    // simetría interior: qué tan centrados están los signos respecto al anillo
    let simetria = 1;
    if (ring && dentro.length) {
      const insideToks = tokens.filter(t => t !== ring && t._inside);
      if (insideToks.length) {
        const dev = insideToks.reduce((a, t) => a + dist(t.centroid, ring.centroid), 0) / insideToks.length;
        const rad = Math.max(ring.bb.w, ring.bb.h) / 2 || 1;
        simetria = +Math.max(0, 1 - dev / rad).toFixed(2);
      }
    }

    return {
      anillo: !!ring, redondez, area: areaPct, sigilo, dentro, fuera, simetria, temblor,
      tokens, ring, shapes,
      resumen: (ring ? `anillo cerrado · ${redondez}% redondo · ocupa ${areaPct}%` : 'sin anillo cerrado') + ` · ${dentro.length} signos dentro`,
    };
    function ringPoly(r) { return r.shape ? r.shape.pts : [r.bb]; }
    function withClave(g) { return Object.assign({}, g, { clave: g.key }); }
  }

  /* ===================== ATELIER (UI de dibujo) ===================== */
  let canvas, ctx, fx, fxc, strokes = [], cur = null, drawing = false, onCarne = false, W = 0, H = 0, liveTimer = null;

  function initAtelier() {
    canvas = G.el('sello-canvas'); ctx = canvas.getContext('2d');
    fx = G.el('sello-fx'); fxc = fx.getContext('2d');
    resize();
    ['pointerdown'].forEach(e => canvas.addEventListener(e, start, { passive: false }));
    ['pointermove'].forEach(e => canvas.addEventListener(e, move, { passive: false }));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(e => canvas.addEventListener(e, end, { passive: false }));
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    const wrap = G.el('canvas-wrap'); const r = wrap.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    for (const c of [canvas, fx]) { c.width = W * dpr; c.height = H * dpr; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); }
    redraw();
  }
  function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }
  function start(e) { e.preventDefault(); drawing = true; cur = { pts: [pos(e)], t0: performance.now() }; }
  function move(e) {
    if (!drawing) return; e.preventDefault();
    const p = pos(e), last = cur.pts[cur.pts.length - 1];
    if (dist(p, last) > 1.5) { cur.pts.push(p); redraw(); scheduleLive(); }
  }
  function end(e) {
    if (!drawing) return; drawing = false;
    cur.t1 = performance.now();
    if (cur.pts.length > 1 || pathLen(cur.pts) < 4) strokes.push(cur);
    cur = null; redraw(); live();
  }

  function clear() { strokes = []; cur = null; redraw(); live(); }
  function toggleCarne() { onCarne = !onCarne; G.el('canvas-wrap').parentElement.parentElement.classList.toggle('flesh-mode', onCarne); document.body.classList.toggle('flesh-mode', onCarne); redraw(); return onCarne; }

  function redraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const all = strokes.concat(cur ? [cur] : []);
    // análisis para colorear
    let a = null; try { a = analyze(strokes, W * H); } catch (e) {}
    const insideSet = new Set(); let ringIdx = new Set();
    if (a) { for (const t of a.tokens) { if (t === a.ring) t.idx.forEach(i => ringIdx.add(i)); else if (t._inside) t.idx.forEach(i => insideSet.add(i)); } }
    all.forEach((s, si) => {
      let color = 'rgba(201,192,172,.85)';           // claro por defecto
      if (onCarne) color = 'rgba(165,63,56,.9)';       // rojo prohibido
      else if (ringIdx.has(si)) color = '#4a6b62';     // verde anillo
      else if (a && a.ring) { color = insideSet.has(si) ? 'rgba(201,192,172,.92)' : 'rgba(93,88,80,.7)'; } // dentro / fuera
      ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      s.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.stroke();
    });
  }

  function scheduleLive() { if (liveTimer) return; liveTimer = setTimeout(() => { liveTimer = null; live(); }, 90); }
  function live() {
    const rd = G.el('reader'), st = G.el('reader-status');
    let a; try { a = analyze(strokes, W * H); } catch (e) { a = null; }
    if (!a || (!a.tokens.length)) { rd.innerHTML = ''; st.textContent = onCarne ? 'Sobre carne. Prohibido.' : 'Lienzo vacío.'; return; }
    st.innerHTML = `⟨ ${G.esc(a.resumen)} ⟩` + (onCarne ? ' · <span class="blood">SOBRE CARNE</span>' : '');
    const toks = [];
    if (a.ring) toks.push(tok(a.ring.glyph, 'anillo', `${a.redondez}% redondo`));
    if (a.sigilo) toks.push(tok(a.sigilo, 'sigilo', a.sigilo.comp || 'elemento'));
    a.dentro.forEach(g => toks.push(tok(g, 'signo', (g.inv ? 'invertido' : '') + (g.comp ? ' ' + g.comp : ''))));
    a.fuera.forEach(g => toks.push(tok(g, 'fuera', 'fuera del anillo')));
    rd.innerHTML = toks.join('');
    function tok(g, cls, sub) {
      return `<span class="glyph-tok ${cls}"><span class="g">${g.g}</span> ${G.esc(g.nombre)}${sub ? ` <span class="dim" style="font-size:10px">${G.esc(sub)}</span>` : ''}</span>`;
    }
  }

  function currentReading() {
    const a = analyze(strokes, W * H);
    return {
      anillo: a.anillo, redondez: a.redondez, area: a.area, simetria: a.simetria, temblor: a.temblor,
      sigilo: a.sigilo ? { g: a.sigilo.g, nombre: a.sigilo.nombre, clave: a.sigilo.key } : null,
      dentro: a.dentro.map(g => ({ g: g.g, nombre: g.nombre, efecto: g.inv ? g.invEfecto : g.efecto, inv: g.inv })),
      fuera: a.fuera.map(g => ({ g: g.g, nombre: g.nombre })),
      _a: a,
    };
  }
  function isEmpty() { return strokes.length === 0; }
  function isOnCarne() { return onCarne; }

  // efecto visual al cerrar el sello
  function flourish(exito) {
    if (!fxc || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    const col = exito === 'total' ? '#a8823c' : exito === 'contragolpe' ? '#7b2b26' : '#4a6b62';
    let r = 0; const cx = W / 2, cy = H * 0.45;
    const t0 = performance.now();
    (function loop() {
      const el = performance.now() - t0; r = el / 6;
      fxc.clearRect(0, 0, W, H);
      fxc.strokeStyle = col; fxc.globalAlpha = Math.max(0, 1 - el / 700); fxc.lineWidth = 2;
      fxc.beginPath(); fxc.arc(cx, cy, r, 0, Math.PI * 2); fxc.stroke();
      if (el < 700) requestAnimationFrame(loop); else fxc.clearRect(0, 0, W, H);
    })();
  }

  return {
    // clasificador (expuesto para pruebas)
    shapeOf, glyphOfShape, glyphOfGroup, groupCompounds, analyze,
    // atelier
    initAtelier, clear, toggleCarne, currentReading, isEmpty, isOnCarne, flourish, resize,
    get strokes() { return strokes; }, set strokes(s) { strokes = s; redraw(); live(); },
  };
})();
