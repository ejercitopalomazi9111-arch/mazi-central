/* UNA MANO DE MENTIRAS CON PROPORCIONES DE VERDAD: las 21 marcas que daría MediaPipe para cuatro poses (abierta, apunta,
   pellizco, puño), puestas en el espacio con la punta del índice donde se pida. La usa el maestro de gestos (maestro.js)
   para enseñar qué hacer, y la misma receta vive en vr/persona/manos-falsas.js (la persona simulada; aquél es un script
   suelto que se mete a la página y no puede importar módulos: si se cambia una, se cambia la otra). */
const NUDILLOS = { 5: [.33, .93], 9: [.1, 1], 13: [-.12, .95], 17: [-.33, .85] };
const FALANGES = { 5: [.45, .27, .22], 9: [.5, .32, .24], 13: [.47, .3, .23], 17: [.36, .22, .2] };
const POSES = {
  abierta: { 5: [0, 0, 0], 9: [0, 0, 0], 13: [0, 0, 0], 17: [0, 0, 0], pulgar: 'abierto' },
  apunta: { 5: [0, 0, 0], 9: [1.5, 1.6, .9], 13: [1.5, 1.6, .9], 17: [1.4, 1.5, .8], pulgar: 'guardado' },
  pellizco: { 5: [.55, .6, .35], 9: [1.5, 1.6, .9], 13: [1.5, 1.6, .9], 17: [1.4, 1.5, .8], pulgar: 'a-la-punta' },
  puno: { 5: [1.5, 1.6, .9], 9: [1.5, 1.6, .9], 13: [1.5, 1.6, .9], 17: [1.4, 1.5, .8], pulgar: 'cruzado' },
};
/* en el marco de la mano: l al lado del índice, f adelante (muñeca → dedos), n saliendo de la palma; Lp = largo de palma */
export function esqueleto(pose, Lp = .085){
  const P = POSES[pose] || POSES.apunta, out = new Array(21);
  const v = (l, f, nn = 0) => ({ l: l * Lp, f: f * Lp, n: nn * Lp });
  out[0] = v(0, 0);
  for(const k of [5, 9, 13, 17]){
    const [l, f] = NUDILLOS[k]; let p = v(l, f), ang = 0; out[k] = p;
    FALANGES[k].forEach((L, i) => { ang += P[k][i]; p = { l: p.l, f: p.f + Math.cos(ang) * L * Lp, n: p.n + Math.sin(ang) * L * Lp }; out[k + 1 + i] = p; });
  }
  out[1] = v(.22, .22, .05);
  if(P.pulgar === 'abierto'){ out[2] = v(.45, .4, .08); out[3] = v(.62, .58, .1); out[4] = v(.75, .74, .1); }
  else if(P.pulgar === 'a-la-punta'){ const q = out[8]; out[2] = v(.42, .42, .12); out[3] = { l: (out[2].l + q.l) / 2, f: (out[2].f + q.f) / 2, n: (out[2].n + q.n) / 2 + .02 * Lp }; out[4] = { l: q.l - .02 * Lp, f: q.f - .02 * Lp, n: q.n + .03 * Lp }; }
  else if(P.pulgar === 'cruzado'){ out[2] = v(.35, .4, .2); out[3] = v(.2, .6, .35); out[4] = v(.05, .75, .38); }
  else { out[2] = v(.4, .42, .15); out[3] = v(.3, .6, .28); out[4] = v(.18, .72, .32); }
  return out;
}
/* al espacio: la punta del índice en `punta`, apuntando hacia `hacia`; la palma 'abajo' | 'arriba' | 'frente' */
export function enElMundo(THREE, loc, { punta, hacia, palma = 'abajo', mano = 'der' }){
  const u = hacia.clone().sub(punta); if(u.lengthSq() < 1e-8) u.set(0, 0, -1); u.normalize();
  const ref = palma === 'arriba' ? new THREE.Vector3(0, 1, 0) : palma === 'frente' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, -1, 0);
  const n = ref.addScaledVector(u, -ref.dot(u)); if(n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize();
  const r = mano === 'der' ? new THREE.Vector3().crossVectors(u, n) : new THREE.Vector3().crossVectors(n, u);
  const aM = (q) => new THREE.Vector3().addScaledVector(r, q.l).addScaledVector(u, q.f).addScaledVector(n, q.n);
  const muneca = punta.clone().sub(aM(loc[8]));
  return loc.map((q) => aM(q).add(muneca));
}
