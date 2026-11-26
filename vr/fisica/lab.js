/* LOS TEMAS DE FÍSICA DE 3.er SEMESTRE (DGETI) dentro del simulador: movimiento circular, plano inclinado y fuerzas,
   péndulo y energía, resorte (Hooke) y choques. Las cuentas viven en motor.js (vr/pruebas-fisica.mjs); aquí sólo lo que
   se ve de cada tema. Cada pieza se crea UNA vez y después sólo se mueve o se estira (regla 13: cero parpadeo).
   fisica.js pone el menú, el objeto, el rastro que se va dibujando, la gráfica y los números; cada tema le dice:
     params, sim(p, ctx), marco(sim), armar(sim, aV, esc), poner(s, sim, aV, esc), etiqueta(s), resultado(sim), marca(sim),
     grafica (qué se grafica) y si usa el lugar (gravedad) o el rebote. */
import { circular, plano, pendulo, resorte, choque, OBJETOS } from './motor.js';
const RAD = Math.PI / 180;
const f2 = (n) => (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');

export function crearLab({ V, THREE, campo }){
  const grupo = new THREE.Group(); campo.add(grupo);
  /* una flecha gruesa (cilindro + punta) que se apunta y se estira sin volver a crearse */
  function Flecha(color){
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true });
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, 1, 8), mat), punta = new THREE.Mesh(new THREE.ConeGeometry(.024, .06, 12), mat);
    cuerpo.renderOrder = punta.renderOrder = 12; g.add(cuerpo, punta); g.visible = false;
    const arriba = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
    g.poner = (origen, dir, largo) => { if(largo < .012){ g.visible = false; return; } g.visible = true; g.position.copy(origen);
      q.setFromUnitVectors(arriba, dir.clone().normalize()); g.quaternion.copy(q);
      cuerpo.scale.y = Math.max(.001, largo - .05); cuerpo.position.y = (largo - .05) / 2; punta.position.y = largo - .03; };
    return g;
  }
  const v3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  /* un panelito para letreros que siguen a las piezas (fuerzas, energías) */
  function Letrero(w, h){ const p = new V.Panel(w, h, 520); p.malla.material.depthTest = false; p.malla.renderOrder = 14; p.ultimo = '';
    p.decir = (lineas, color = '#FFFFFF', tam = 40) => { const k = lineas.join('|') + color; if(k === p.ultimo) return; p.ultimo = k; const { x, cv } = p, W = cv.width, H = cv.height;
      x.clearRect(0, 0, W, H); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      lineas.forEach((l, i) => { const [t, c] = Array.isArray(l) ? l : [l, color]; let s = tam; x.font = `800 ${s}px system-ui, -apple-system, sans-serif`; while(x.measureText(t).width > W - 12 && s > 14){ s -= 2; x.font = `800 ${s}px system-ui, -apple-system, sans-serif`; }
        const y = H * (i + .5) / lineas.length; x.lineWidth = s * .2; x.strokeStyle = 'rgba(12,5,20,.92)'; x.strokeText(t, W / 2, y); x.fillStyle = c; x.fillText(t, W / 2, y); });
      p.listo(); };
    return p; }

  /* ═══ MOVIMIENTO CIRCULAR ═══ */
  const C = { g: new THREE.Group() }; grupo.add(C.g);
  C.aro = new THREE.Mesh(new THREE.TorusGeometry(1, .006, 8, 96), new THREE.MeshBasicMaterial({ color: 0x7E6A96 })); C.g.add(C.aro);
  C.centro = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), new THREE.MeshBasicMaterial({ color: 0xC9B6DA })); C.g.add(C.centro);
  C.fv = Flecha(0xF7A23B); C.fa = Flecha(0x5BC0EB); C.g.add(C.fv, C.fa);
  C.ley = Letrero(.9, .2); C.g.add(C.ley.malla);
  const tCircular = {
    nombre: 'Circular (MCU)', params: [['r', 'Radio', .5, 5, .5, 'm'], ['T', 'Periodo', 1, 10, .5, 's']],
    sim: (p) => { const s = circular({ r: p.r, T: p.T }); s.puntos.forEach((q) => { q.vx = -s.v * Math.sin(q.th); q.vy = s.v * Math.cos(q.th); }); return s; },
    marco: (s) => { const r = s.puntos[0].x; return { minX: -r, maxX: r, minY: -r, maxY: r }; },
    armar(s, aV, esc){ const r = s.puntos[0].x, c = aV(0, 0); C.aro.position.copy(c); C.aro.scale.setScalar(r * esc); C.centro.position.copy(c); C.ley.malla.position.set(c.x, c.y - r * esc - .14, .05);
      C.ley.decir([['v  velocidad (tangente)', '#F7A23B'], ['a  aceleración (al centro)', '#5BC0EB']], '#fff', 40); },
    poner(q, s, aV, esc){ const p = aV(q.x, q.y), c = aV(0, 0), dv = v3(-Math.sin(q.th), Math.cos(q.th)), da = c.clone().sub(p);
      C.fv.poner(p, dv, .12 + Math.min(.35, s.v * .04)); C.fa.poner(p, da, Math.min(da.length() * .8, .1 + Math.min(.3, s.ac * .02))); },
    etiquetaEn: (pos, s, aV) => aV(0, 0).add(v3(0, .02, 0)),
    etiqueta: (q, s) => `v ${f2(s.v)} m/s · a ${f2(s.ac)} m/s²|ángulo ${f2((q.th / RAD) % 360)}° · vuelta ${Math.floor(q.th / (2 * Math.PI)) + 1}`,
    resultado: (s, nom) => [`${nom}: v = ${f2(s.v)} m/s`, `ω = ${f2(s.w)} rad/s`, `a centrípeta = ${f2(s.ac)} m/s²`, `f = ${f2(s.f)} Hz`],
    marca: (s, nom) => `${nom} r ${f2(s.puntos[0].x)} m`,
    grafica: { titulo: 'Posición x contra tiempo', ejeX: 't (s)', ejeY: 'x (m)', Y: (q) => q.x },
    sinRegla: true,
  };

  /* ═══ PLANO INCLINADO Y FUERZAS ═══ */
  const P = { g: new THREE.Group() }; grupo.add(P.g);
  P.rampa = new THREE.Mesh(new THREE.BoxGeometry(1, .025, .32), new THREE.MeshBasicMaterial({ color: 0x5A3D7A })); P.g.add(P.rampa);
  P.borde = new THREE.Mesh(new THREE.BoxGeometry(1, .006, .325), new THREE.MeshBasicMaterial({ color: 0xAC27FF })); P.g.add(P.borde);
  P.fP = Flecha(0xFF5A6E); P.fN = Flecha(0x5BC0EB); P.fF = Flecha(0xF7A23B); P.fE = Flecha(0x9BE564); P.g.add(P.fP, P.fN, P.fF, P.fE);
  P.ley = Letrero(1.0, .3); P.g.add(P.ley.malla);
  const tPlano = {
    nombre: 'Plano inclinado', params: [['ang', 'Ángulo', 0, 60, 5, '°'], ['mu', 'Fricción μ', 0, 1, .05, ''], ['F', 'Empuje', 0, 50, 5, 'N']], conLugar: true,
    sim: (p, c) => { const L = 5, s = plano({ angulo: p.ang, mu: p.mu, m: c.m, F: p.F, L, g: c.g }), th = p.ang * RAD; s.F_ = p.F;
      s.th = th; s.L = L; s.puntos.forEach((q) => { q.x = q.s * Math.cos(th); q.y = (L - q.s) * Math.sin(th); q.vx = q.v * Math.cos(th); q.vy = -q.v * Math.sin(th); }); return s; },
    marco: (s) => ({ minX: 0, maxX: s.L * Math.cos(s.th), minY: 0, maxY: Math.max(.5, s.L * Math.sin(s.th)) }),
    armar(s, aV, esc){ const a = aV(0, s.L * Math.sin(s.th)), b = aV(s.L * Math.cos(s.th), 0), m = a.clone().add(b).multiplyScalar(.5), n = v3(Math.sin(s.th), Math.cos(s.th));
      P.rampa.position.copy(m).addScaledVector(n, -.014); P.rampa.scale.x = a.distanceTo(b) + .1; P.rampa.rotation.z = -s.th;
      P.borde.position.copy(m).addScaledVector(n, -.001); P.borde.scale.x = P.rampa.scale.x; P.borde.rotation.z = -s.th;
      P.ley.malla.position.set(b.x - .45, Math.max(.35, a.y * .8), .1);   /* arriba a la derecha de la rampa: ahí no hay nada */
      P.ley.decir([['Peso  ' + f2(s.P) + ' N', '#FF5A6E'], ['Normal  ' + f2(s.N) + ' N', '#5BC0EB'], ['Fricción  ' + f2(s.fr) + ' N', '#F7A23B']], '#fff', 38); },
    ajuste: (pos, s, tam) => pos.addScaledVector(v3(Math.sin(s.th), Math.cos(s.th)), tam / 2),
    poner(q, s, aV, esc, pos){ const d = v3(Math.cos(s.th), -Math.sin(s.th)), n = v3(Math.sin(s.th), Math.cos(s.th)), k = .3 / Math.max(s.P, 1);
      P.fP.poner(pos, v3(0, -1), s.P * k); P.fN.poner(pos, n, s.N * k); P.fF.poner(pos, d.clone().negate(), s.fr * k); P.fE.poner(pos, d, s.F_ * k); },
    etiquetaEn: (pos) => pos.clone().add(v3(-.12, -.32, 0)),   /* debajo de la rampa, en el hueco del triángulo */
    etiqueta: (q, s) => s.semueve ? `t ${f2(q.t)} s · recorrió ${f2(q.s)} m|v ${f2(q.v)} m/s · a ${f2(s.a)} m/s²` : 'No se mueve|la fricción gana',
    resultado: (s, nom) => s.semueve ? [`${nom}: a = ${f2(s.a)} m/s²`, `bajó ${s.L} m en ${f2(s.tBajar)} s`, `llegó a ${f2(s.vFin)} m/s`, `trabajo de la fricción ${f2(s.trabajoFr)} J`] : [`${nom}: no se mueve`, `la fricción (hasta ${f2(s.fr)} N) gana`, 'sube el ángulo o baja μ'],
    marca: (s, nom) => s.semueve ? `${nom} ${f2(s.tBajar)} s` : `${nom} quieto`,
    grafica: { titulo: 'Velocidad contra tiempo', ejeX: 't (s)', ejeY: 'v (m/s)', Y: (q) => q.v },
    sinGiro: true,
  };

  /* ═══ PÉNDULO Y ENERGÍA ═══ */
  const E = { g: new THREE.Group() }; grupo.add(E.g);
  E.pivote = new THREE.Mesh(new THREE.SphereGeometry(.02, 12, 8), new THREE.MeshBasicMaterial({ color: 0xC9B6DA })); E.g.add(E.pivote);
  E.techo = new THREE.Mesh(new THREE.BoxGeometry(.4, .02, .2), new THREE.MeshBasicMaterial({ color: 0x5A3D7A })); E.g.add(E.techo);
  E.hilo = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1, 6), new THREE.MeshBasicMaterial({ color: 0xF4EEF2 })); E.g.add(E.hilo);
  E.barras = new V.Panel(.55, .62, 520); E.g.add(E.barras.malla);
  let ultimasBarras = '';
  function pintarBarras(q, s){
    const k = [q.Ec, q.Ep].map((v) => Math.round(v / s.Etotal * 60)).join(); if(k === ultimasBarras) return; ultimasBarras = k;
    const { x, cv } = E.barras, W = cv.width, H = cv.height; x.clearRect(0, 0, W, H);
    V.redondo(x, 4, 4, W - 8, H - 8, 22); x.fillStyle = 'rgba(23,10,38,.88)'; x.fill();
    const B = [['Cinética', q.Ec, '#F7A23B'], ['Potencial', q.Ep, '#C77DFF'], ['Total', q.Ec + q.Ep, '#F4EEF2']], top = 60, bot = H - 70, bw = 62;
    x.font = '800 26px system-ui, -apple-system, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#F7A23B'; x.fillText('Energía (J)', W / 2, 38);
    B.forEach(([n, v, c], i) => { const cx = W * (i + .5) / 3, h = (bot - top) * Math.max(0, v) / s.Etotal; x.fillStyle = c; x.fillRect(cx - bw / 2, bot - h, bw, h);
      x.font = '700 22px system-ui, -apple-system, sans-serif'; x.fillStyle = '#C9B6DA'; x.fillText(n, cx, bot + 28); x.fillStyle = '#FFFFFF'; x.font = '800 24px system-ui, -apple-system, sans-serif'; x.fillText(f2(v), cx, bot + 56); });
    E.barras.listo();
  }
  const tPendulo = {
    nombre: 'Péndulo y energía', params: [['L', 'Largo', .5, 5, .5, 'm'], ['th0', 'Ángulo', 5, 80, 5, '°']], conLugar: true,
    sim: (p, c) => { const s = pendulo({ L: p.L, angulo: p.th0, m: c.m, g: c.g }); s.L = p.L; s.puntos.forEach((q) => { q.x = p.L * Math.sin(q.th); q.y = p.L - p.L * Math.cos(q.th); q.vx = p.L * q.w * Math.cos(q.th); q.vy = p.L * q.w * Math.sin(q.th); }); return s; },
    marco: (s) => { const a = Math.max(...s.puntos.map((q) => Math.abs(q.x))); return { minX: -Math.max(a, s.L * .3), maxX: Math.max(a, s.L * .3) + s.L * .9, minY: 0, maxY: s.L }; },
    armar(s, aV){ const pv = aV(0, s.L); E.pivote.position.copy(pv); E.techo.position.copy(pv).add(v3(0, .02, 0)); const d = aV(s.L * .7 + Math.max(...s.puntos.map((q) => Math.abs(q.x))), s.L * .5); E.barras.malla.position.set(d.x, d.y, .05); ultimasBarras = ''; pintarBarras(s.puntos[0], s); },
    poner(q, s, aV, esc, pos){ const pv = aV(0, s.L), d = pos.clone().sub(pv), L = d.length(); E.hilo.position.copy(pv).addScaledVector(d, .5); E.hilo.scale.y = L; E.hilo.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); pintarBarras(q, s); },
    etiqueta: (q) => `Ec ${f2(q.Ec)} J · Ep ${f2(q.Ep)} J|v ${f2(Math.hypot(q.vx, q.vy))} m/s · ${f2(q.th / RAD)}°`,
    resultado: (s, nom) => [`${nom}: periodo ${f2(s.T)} s`, `fórmula 2π√(L/g) = ${f2(s.T0)} s`, `v máx. ${f2(s.vMax)} m/s`, `energía ${f2(s.Etotal)} J, siempre la misma`],
    marca: (s, nom) => `${nom} T ${f2(s.T)} s`,
    grafica: { titulo: 'Energía contra tiempo', ejeX: 't (s)', ejeY: 'E (J)', series: [[(q) => q.Ec, '#F7A23B'], [(q) => q.Ep, '#C77DFF'], [(q) => q.Ec + q.Ep, '#F4EEF2']] },
    sinRegla: true, sinGiro: true,
  };

  /* ═══ RESORTE (LEY DE HOOKE) ═══ */
  const R = { g: new THREE.Group() }; grupo.add(R.g);
  R.pared = new THREE.Mesh(new THREE.BoxGeometry(.03, .4, .3), new THREE.MeshBasicMaterial({ color: 0x5A3D7A })); R.g.add(R.pared);
  class Helice extends THREE.Curve { getPoint(t, o = new THREE.Vector3()){ return o.set(t, .045 * Math.cos(t * Math.PI * 2 * 12), .045 * Math.sin(t * Math.PI * 2 * 12)); } }
  R.resorte = new THREE.Mesh(new THREE.TubeGeometry(new Helice(), 300, .005, 6), new THREE.MeshBasicMaterial({ color: 0xC9B6DA })); R.g.add(R.resorte);
  R.eq = new THREE.Mesh(new THREE.BoxGeometry(.004, .3, .004), new THREE.MeshBasicMaterial({ color: 0x9BE564 })); R.g.add(R.eq);
  R.fF = Flecha(0xFF5A6E); R.g.add(R.fF);
  const EQ = 1.5;
  const tResorte = {
    nombre: 'Resorte (Hooke)', params: [['k', 'Constante k', 5, 200, 5, 'N/m'], ['x0', 'Estirado', .1, 1, .1, 'm']],
    sim: (p, c) => { const s = resorte({ k: p.k, m: c.m, x0: p.x0 }); s.k = p.k; s.x0 = p.x0; s.puntos.forEach((q) => { q.xr = q.x; q.x = EQ + q.xr; q.y = 0; q.vx = q.v; q.vy = 0; }); return s; },
    marco: (s) => ({ minX: 0, maxX: EQ + s.x0 + .4, minY: 0, maxY: .5 }),
    armar(s, aV, esc, tam){ const p0 = aV(0, 0), e = aV(EQ, 0); R.pared.position.set(p0.x - .015, p0.y + tam / 2, 0); R.eq.position.set(e.x, e.y + .15, .16); R.resorte.position.set(p0.x, p0.y + tam / 2, 0); },
    poner(q, s, aV, esc, pos, tam){ R.resorte.scale.x = Math.max(.01, pos.x - tam / 2 - R.resorte.position.x); R.fF.poner(pos.clone().add(v3(0, tam * .8, 0)), v3(-Math.sign(q.xr) || 1, 0), Math.min(.4, Math.abs(q.F) / s.F0 * .3)); },
    ajuste: (pos, s, tam) => pos.add(v3(0, tam / 2, 0)),
    etiqueta: (q, s) => `x ${f2(q.xr)} m · F = −kx = ${f2(q.F)} N|v ${f2(q.v)} m/s`,
    resultado: (s, nom) => [`${nom}: fuerza inicial ${f2(s.F0)} N`, `periodo ${f2(s.T)} s`, `energía del resorte ${f2(s.Ep)} J`, `v máx. ${f2(s.vMax)} m/s`],
    marca: (s, nom) => `${nom} T ${f2(s.T)} s`,
    grafica: { titulo: 'Posición contra tiempo', ejeX: 't (s)', ejeY: 'x (m)', Y: (q) => q.xr, conNegativos: true },
    sinGiro: true,
  };

  /* ═══ CHOQUES ═══ */
  const K = { g: new THREE.Group() }; grupo.add(K.g);
  K.otro = new THREE.Group(); K.g.add(K.otro); K.f1 = Flecha(0xF7A23B); K.f2 = Flecha(0x5BC0EB); K.g.add(K.f1, K.f2);
  K.ley = Letrero(1.6, .26); K.g.add(K.ley.malla);
  let otroModelo = null;
  const tChoque = {
    nombre: 'Choques', params: [['v1', 'Velocidad 1', 0, 10, 1, 'm/s'], ['m2', 'Masa del 2', .1, 5, .1, 'kg'], ['v2', 'Velocidad 2', -5, 5, 1, 'm/s']], usaRebote: true,
    sim: (p, c) => { const s = choque({ m1: c.m, m2: p.m2, v1: p.v1, v2: p.v2, pegan: !c.rebote }); s.m1 = c.m; s.m2 = p.m2; s.pegan = !c.rebote; s.puntos.forEach((q) => { q.x = q.x1; q.y = 0; q.vx = q.v1; q.vy = 0; }); return s; },
    marco: (s) => { let a = Infinity, b = -Infinity; for(const q of s.puntos){ a = Math.min(a, q.x1, q.x2); b = Math.max(b, q.x1, q.x2); } return { minX: a - .3, maxX: b + .3, minY: 0, maxY: .5 }; },
    armar(s, aV, esc, tam, modelo){ const k = s.m2 >= 1 ? 'piedra' : s.m2 >= .3 ? 'balon' : 'beisbol';
      modelo(k).then((m) => { const c = m.clone(); if(otroModelo) K.otro.remove(otroModelo); otroModelo = c; K.otro.add(c); });
      K.ley.malla.position.set(0, .55, .05); K.ley.decir([`antes: p = ${f2(s.pAntes)} kg·m/s · Ec = ${f2(s.EcAntes)} J`], '#FFFFFF', 40); },
    ajuste: (pos, s, tam) => pos.add(v3(0, tam / 2, 0)),
    poner(q, s, aV, esc, pos, tam){ const p2 = aV(q.x2, 0).add(v3(0, tam / 2, -0)); K.otro.position.copy(p2);
      K.f1.poner(pos.clone().add(v3(0, tam * .9, 0)), v3(Math.sign(q.v1) || 1, 0), Math.min(.5, Math.abs(q.v1) * .05)); K.f2.poner(p2.clone().add(v3(0, tam * .9, 0)), v3(Math.sign(q.v2) || 1, 0), Math.min(.5, Math.abs(q.v2) * .05));
      if(q.t >= s.tChoque) K.ley.decir([`antes: p = ${f2(s.pAntes)} kg·m/s · Ec = ${f2(s.EcAntes)} J`, [`después: p = ${f2(s.pDespues)} kg·m/s · Ec = ${f2(s.EcDespues)} J`, '#9BE564']], '#FFFFFF', 40);
      else K.ley.decir([`antes: p = ${f2(s.pAntes)} kg·m/s · Ec = ${f2(s.EcAntes)} J`], '#FFFFFF', 40); },
    etiqueta: (q) => `v₁ ${f2(q.v1)} m/s · v₂ ${f2(q.v2)} m/s|t ${f2(q.t)} s`,
    resultado: (s, nom) => !s.chocan ? ['No alcanzan a chocar: sube la velocidad 1'] : [`${s.pegan ? 'Se pegan' : 'Rebotan'}: v₁′ = ${f2(s.u1)} m/s`, `v₂′ = ${f2(s.u2)} m/s`, `p se conserva: ${f2(s.pAntes)} = ${f2(s.pDespues)}`, s.pegan ? `se pierde ${f2(s.EcAntes - s.EcDespues)} J de energía` : 'la energía también se conserva'],
    marca: (s, nom) => `${nom} v′ ${f2(s.u1)} m/s`,
    grafica: { titulo: 'Velocidades contra tiempo', ejeX: 't (s)', ejeY: 'v (m/s)', series: [[(q) => q.v1, '#F7A23B'], [(q) => q.v2, '#5BC0EB']], conNegativos: true },
    sinGiro: true,
  };

  const TEMAS = { circular: tCircular, plano: tPlano, pendulo: tPendulo, resorte: tResorte, choque: tChoque };
  const piezas = { circular: C.g, plano: P.g, pendulo: E.g, resorte: R.g, choque: K.g };
  return {
    TEMAS, grupo,
    mostrar(modo){ for(const [k, g] of Object.entries(piezas)) g.visible = k === modo; },
  };
}
