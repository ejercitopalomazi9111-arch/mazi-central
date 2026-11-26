/* LA PERSONA SIMULADA · sus manos (Carlos, 26 nov: «créate un entorno 3D donde cargues un personaje que esté probando las
   gafas… le he dado a 5 o 6 personas a probar esto y ni una ha podido utilizarla correctamente»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   No se finge el resultado: se fingen los 21 PUNTOS que daría MediaPipe si una mano de verdad estuviera ahí, y entran por
   el mismo camino que la cámara (manos.js → filtros → estabilizador → gestos → rayo → mano 3D → elegir). Así lo que falla
   aquí falla igual con una persona.
     · Una mano derecha (o izquierda) con proporciones reales y cuatro poses: abierta, apunta, pellizco y puño.
     · Se pone en el ESPACIO (la punta del índice en un punto del mundo, apuntando a otro), y se proyecta a la imagen con
       la misma cámara que usa el visor (V.campoCamara, el aspecto del video), al revés de aEspacio (mano3d.js).
     · La etiqueta va como la da MediaPipe con cámara trasera: tu derecha sale «Left».
   Se carga en la página (vr/persona/recorridos.mjs) y deja window.__persona. */
(function(){
  const V = () => window.__vr, T = () => window.__vr.THREE;
  /* proporciones (en largos de palma, muñeca → nudillo del medio): nudillos [lado, adelante], falanges por dedo */
  const NUDILLOS = { 5: [.33, .93], 9: [.1, 1], 13: [-.12, .95], 17: [-.33, .85] };
  const FALANGES = { 5: [.45, .27, .22], 9: [.5, .32, .24], 13: [.47, .3, .23], 17: [.36, .22, .2] };
  /* doblez de cada dedo (radianes por articulación) en cada pose; el pulgar se pone aparte */
  const POSES = {
    abierta: { 5: [0, 0, 0], 9: [0, 0, 0], 13: [0, 0, 0], 17: [0, 0, 0], pulgar: 'abierto' },
    apunta: { 5: [0, 0, 0], 9: [1.5, 1.6, .9], 13: [1.5, 1.6, .9], 17: [1.4, 1.5, .8], pulgar: 'guardado' },
    pellizco: { 5: [.55, .6, .35], 9: [1.5, 1.6, .9], 13: [1.5, 1.6, .9], 17: [1.4, 1.5, .8], pulgar: 'a-la-punta' },
    puno: { 5: [1.5, 1.6, .9], 9: [1.5, 1.6, .9], 13: [1.5, 1.6, .9], 17: [1.4, 1.5, .8], pulgar: 'cruzado' },
  };
  /* los 21 puntos en el marco de la mano: u adelante (muñeca → dedos), r al lado del índice, n saliendo de la palma */
  function esqueleto(pose, Lp){
    const P = POSES[pose] || POSES.apunta, out = new Array(21);
    const v = (l, f, nn = 0) => ({ l: l * Lp, f: f * Lp, n: nn * Lp });
    out[0] = v(0, 0);
    for(const k of [5, 9, 13, 17]){
      const [l, f] = NUDILLOS[k]; let p = v(l, f), ang = 0; out[k] = p;
      FALANGES[k].forEach((L, i) => { ang += P[k][i]; p = { l: p.l, f: p.f + Math.cos(ang) * L * Lp, n: p.n + Math.sin(ang) * L * Lp }; out[k + 1 + i] = p; });
    }
    /* el pulgar */
    out[1] = v(.22, .22, .05);
    if(P.pulgar === 'abierto'){ out[2] = v(.45, .4, .08); out[3] = v(.62, .58, .1); out[4] = v(.75, .74, .1); }
    else if(P.pulgar === 'a-la-punta'){ const q = out[8]; out[2] = v(.42, .42, .12); out[3] = { l: (out[2].l + q.l) / 2, f: (out[2].f + q.f) / 2, n: (out[2].n + q.n) / 2 + .02 * Lp }; out[4] = { l: q.l - .02 * Lp, f: q.f - .02 * Lp, n: q.n + .03 * Lp }; }
    else if(P.pulgar === 'cruzado'){ out[2] = v(.35, .4, .2); out[3] = v(.2, .6, .35); out[4] = v(.05, .75, .38); }
    else { out[2] = v(.4, .42, .15); out[3] = v(.3, .6, .28); out[4] = v(.18, .72, .32); }   /* guardado: junto al medio */
    return out;
  }
  const estado = { der: null, izq: null };
  /* mano: 'der' | 'izq'; pose; punta: dónde queda la punta del índice (mundo, Vector3 o [x,y,z]); hacia: a dónde apunta
     (mundo) — si no, a donde ve la cabeza */
  function poner(mano, { pose = 'apunta', punta, hacia = null, palma = 'abajo' } = {}){
    if(!punta){ estado[mano] = null; return; }
    estado[mano] = { pose, punta: Array.isArray(punta) ? punta : punta.toArray(), hacia: hacia ? (Array.isArray(hacia) ? hacia : hacia.toArray()) : null, palma };
  }
  function proyectar(mano){
    const S = estado[mano]; if(!S) return null;
    const THREE = T(), cab = V().cabeza; cab.updateMatrixWorld(true);
    const asp = (V().video.videoWidth || 640) / (V().video.videoHeight || 480), tx = Math.tan(V().campoCamara() * Math.PI / 360), ty = tx / asp;
    const Lp = .085 / asp;   /* así la distancia que calcula manos.js (por el tamaño aparente) es la de verdad */
    /* el marco de la mano, en el espacio de la cabeza */
    const punta = cab.worldToLocal(new THREE.Vector3(...S.punta));
    const hacia = S.hacia ? cab.worldToLocal(new THREE.Vector3(...S.hacia)) : punta.clone().multiplyScalar(2);
    const u = hacia.clone().sub(punta); if(u.lengthSq() < 1e-8) u.set(0, 0, -1); u.normalize();
    const abajo = new THREE.Vector3(0, -1, 0), n = (S.palma === 'arriba' ? abajo.clone().negate() : S.palma === 'frente' ? new THREE.Vector3(0, 0, -1) : abajo).addScaledVector(u, -abajo.dot(u));
    if(n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize();
    const r = mano === 'der' ? new THREE.Vector3().crossVectors(u, n) : new THREE.Vector3().crossVectors(n, u);
    const loc = esqueleto(S.pose, Lp), aMarco = (q) => new THREE.Vector3().addScaledVector(r, q.l).addScaledVector(u, q.f).addScaledVector(n, q.n);
    /* la muñeca va donde haga falta para que la punta del índice quede en `punta` */
    /* al cambiar de pose con `fijaMuneca` (pellizcar, cerrar la mano), la MUÑECA se queda y se mueven los dedos, como en una mano real */
    const muneca = S.fijaMuneca && S.munecaCab ? new THREE.Vector3(...S.munecaCab) : punta.clone().sub(aMarco(loc[8]));
    S.munecaCab = muneca.toArray();
    const P = loc.map((q) => aMarco(q).add(muneca));
    const D = -P[0].z; if(D < .08) return null;
    const L = P.map((p) => ({ x: .5 + p.x / (2 * tx * D), y: .5 - p.y / (2 * ty * D), z: -(p.z + D) / (2 * tx * D) }));
    if(V().AJ.camVoltear) L.forEach((q) => { q.x = 1 - q.x; q.y = 1 - q.y; });
    const c = P[9]; const W = P.map((p) => ({ x: p.x - c.x, y: -(p.y - c.y), z: -(p.z - c.z) }));
    return { L, W, etiqueta: mano === 'der' ? 'Left' : 'Right' };
  }
  window.__detectorFalso = () => {
    const r = { landmarks: [], worldLandmarks: [], handedness: [] };
    for(const m of ['der', 'izq']){ const p = proyectar(m); if(!p) continue; if(p.L.some((q) => q.x < -.05 || q.x > 1.05 || q.y < -.05 || q.y > 1.05)) continue;   /* fuera de la cámara: no se ve */
      r.landmarks.push(p.L); r.worldLandmarks.push(p.W); r.handedness.push([{ categoryName: p.etiqueta, score: .97 }]); }
    return r;
  };
  window.__persona = { poner, estado, esqueleto, proyectar };
})();
