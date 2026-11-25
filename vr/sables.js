/* MAZI VR · SABLES (demo, Carlos 18 nov: «crea una demo del beat saber con las manos por ahora»).
   Juego de ritmo propio con bloques: llegan hacia ti al ritmo de una pista que se arma aquí mismo con el audio del
   teléfono (bombo, platillo y bajo; nada de música ajena). Cada mano es un sable: la izquierda vino, la derecha morada.
   Corta cada bloque con la mano de su color y en la dirección de su flecha (el punto se corta en cualquier dirección).
     · la mano se ubica en el espacio con lo que da el rastreo (manos.js → V.extra.manos[].mundo): palma, muñeca y punta;
     · el sable sale de la palma con un marco rígido (sable-mano.js: muñeca y nudillos, no las puntas, así cerrar la mano
       no lo voltea), 55 cm; «Calibrar» guarda cómo lo agarras (apunta arriba un segundo) y si la mano se pierde un
       instante el sable se queda;
     · un corte cuenta si el sable pasa a menos de 24 cm del bloque cuando éste está a tu alcance, moviéndose a más de
       1.1 m/s. Con la flecha bien y el color bien, 100 × combo; con el color cambiado, 50; contra la flecha, «Mal».
   Un minuto por partida. Atrás o Círculo para salir. */
const BPM = 112, BEAT = 60 / BPM, DURA = 60, VEL = 6, Z0 = -16, ZG = -.55;
const C_IZQ = 0x7E1735, C_DER = 0xAC27FF;
const DIRS = { arriba: [0, 1], abajo: [0, -1], izq: [-1, 0], der: [1, 0], punto: null };

import { crearSable, cargarCal, guardarCal } from './sable-mano.js';
export function montarSables(V){
  const { THREE } = V;
  const sables = { grupo: new THREE.Group() };
  const pista = new THREE.Group(); pista.visible = false; V.escena.add(pista);
  let estado = 'listo', t0 = 0, siguiente = 0, puntos = 0, combo = 1, mejorCombo = 0, aciertos = 0, fallas = 0, semilla = 7;
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;

  /* ── el marcador y el letrero ── */
  const tablero = new V.Panel(1.3, .22, 500); tablero.malla.position.set(0, .62, -2.2); sables.grupo.add(tablero.malla);
  const pintarTablero = (txt) => { const { x, cv } = tablero; x.clearRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 52px system-ui, -apple-system, sans-serif'; x.fillStyle = '#F4EEF2'; x.fillText(txt, cv.width / 2, cv.height / 2); tablero.listo(); };
  const otra = await_tarjeta('Jugar', 'swords', -.36, () => empezar());
  const cal = await_tarjeta('Calibrar', 'move', .36, () => calibrar());
  function await_tarjeta(titulo, icono, x, accion){ const p = { malla: null }; V.tarjeta({ titulo, icono }).then((t) => { p.malla = t.malla; t.malla.position.set(x, -.1, -1.8); t.malla.userData.accion = accion; sables.grupo.add(t.malla); }); return p; }
  const mostrarTarjetas = (si) => { if(otra.malla) otra.malla.visible = si; if(cal.malla) cal.malla.visible = si; };
  /* un sable por mano, con su calibración guardada */
  const guardada = cargarCal(), deMano = { '-1': crearSable('-1', { cal: guardada }), '1': crearSable('1', { cal: guardada }) };
  let calHasta = 0;
  function calibrar(){ estado = 'calibrando'; calHasta = performance.now() / 1000 + 12; deMano['-1'].calibrar(); deMano['1'].calibrar(); mostrarTarjetas(false); pintarTablero('Apunta arriba'); }
  function finCal(listos){ for(const k of ['-1', '1']) deMano[k].st.cal = null; estado = 'listo'; mostrarTarjetas(true);
    pintarTablero(listos ? 'Listo' : 'Pon las manos'); V.hud(listos ? 'Calibrado' : 'Sin manos', 1.5); if(listos) V.sonar('ding', .3); }

  /* ── los sables ── */
  const hoja = (color) => { const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .55, 10), new THREE.MeshBasicMaterial({ color, toneMapped: false })); m.position.y = .275; g.add(m);
    const brillo = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .55, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .25, depthWrite: false, toneMapped: false })); brillo.position.y = .275; g.add(brillo);
    g.visible = false; V.escena.add(g); return g; };
  const hojas = { '-1': hoja(C_IZQ), '1': hoja(C_DER) };
  const previo = { '-1': null, '1': null };
  const arriba = new THREE.Vector3(0, 1, 0), dirH = new THREE.Vector3(), q = new THREE.Quaternion();

  /* ── los bloques ── */
  const flecha = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(64, 22); x.lineTo(104, 70); x.lineTo(24, 70); x.closePath(); x.fill(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const circulo = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 22, 0, Math.PI * 2); x.fill(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const caja = new THREE.BoxGeometry(.3, .3, .3), cara = new THREE.PlaneGeometry(.26, .26);
  let bloques = [], pedazos = [];
  function bloque(lado, carril, fila, dir){
    const color = lado < 0 ? C_IZQ : C_DER;
    const m = new THREE.Mesh(caja, new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .1, emissive: color, emissiveIntensity: .35 }));
    const f = new THREE.Mesh(cara, new THREE.MeshBasicMaterial({ map: DIRS[dir] ? flecha : circulo, transparent: true, toneMapped: false })); f.position.z = .152;
    if(DIRS[dir]) f.rotation.z = Math.atan2(-DIRS[dir][0], DIRS[dir][1]);
    m.add(f); m.position.set(carril, fila, Z0); pista.add(m);
    bloques.push({ m, lado, dir, vivo: true });
  }
  function partir(b, v){
    const color = b.lado < 0 ? C_IZQ : C_DER;
    for(const s of [-1, 1]){
      const p = new THREE.Mesh(new THREE.BoxGeometry(.15, .3, .3), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .5, transparent: true }));
      p.position.copy(b.m.position); p.position.x += s * .08; pista.add(p);
      pedazos.push({ m: p, v: new THREE.Vector3(s * 1.4 + v.x * .2, 1 + v.y * .2, -.5), giro: s * 6, vida: .7 });
    }
    pista.remove(b.m); b.vivo = false;
  }

  /* ── la música, hecha aquí: se programa medio segundo por delante ── */
  let audioT0 = 0, sigNota = 0;
  function tocar(a, cuando, tipo){
    if(tipo === 'bombo'){ const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(140, cuando); o.frequency.exponentialRampToValueAtTime(40, cuando + .18);
      g.gain.setValueAtTime(.9, cuando); g.gain.exponentialRampToValueAtTime(.001, cuando + .25); o.connect(g).connect(a.destination); o.start(cuando); o.stop(cuando + .3); }
    if(tipo === 'plat'){ const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * .05, a.sampleRate), d = b.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      n.buffer = b; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = a.createGain(); g.gain.value = .25; n.connect(f).connect(g).connect(a.destination); n.start(cuando); }
    if(tipo.startsWith('bajo')){ const o = a.createOscillator(), g = a.createGain(), fr = +tipo.slice(4); o.type = 'sawtooth'; o.frequency.value = fr;
      const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; g.gain.setValueAtTime(.18, cuando); g.gain.exponentialRampToValueAtTime(.001, cuando + BEAT * .45);
      o.connect(f).connect(g).connect(a.destination); o.start(cuando); o.stop(cuando + BEAT * .5); }
  }
  const BAJOS = [55, 55, 65.4, 49];
  function musica(){
    const a = V.audio(); if(!a) return;
    while(audioT0 + sigNota * BEAT / 2 < a.currentTime + .5){
      const c = audioT0 + sigNota * BEAT / 2, n = sigNota;
      if(n % 2 === 0) tocar(a, c, 'bombo'); else tocar(a, c, 'plat');
      if(n % 2 === 0) tocar(a, c, 'bajo' + BAJOS[Math.floor(n / 8) % 4] * (n % 4 === 2 ? 2 : 1));
      sigNota++;
    }
  }

  function empezar(){
    bloques.forEach((b) => b.vivo && pista.remove(b.m)); pedazos.forEach((p) => pista.remove(p.m)); bloques = []; pedazos = [];
    puntos = 0; combo = 1; mejorCombo = 0; aciertos = 0; fallas = 0; semilla = 7;
    /* la pista mira hacia donde ves al empezar */
    const d = new THREE.Vector3(); V.cabeza.getWorldDirection(d); pista.rotation.set(0, Math.atan2(-d.x, -d.z), 0);
    V.cabeza.getWorldPosition(pista.position); pista.visible = true;
    mostrarTarjetas(false);
    estado = 'jugando'; t0 = performance.now() / 1000 + 3; siguiente = 0;
    const a = V.audio(); if(a){ a.resume?.(); audioT0 = a.currentTime + 3; sigNota = 0; }
    V.hud('3 · 2 · 1', 2.5);
  }
  function terminar(){
    estado = 'fin'; pintarTablero(`${puntos} puntos · ${aciertos} de ${aciertos + fallas}`);
    mostrarTarjetas(true);
  }

  const wp = new THREE.Vector3(), base = new THREE.Vector3(), punta = new THREE.Vector3(), vel = new THREE.Vector3(), seg = new THREE.Vector3(), cerca = new THREE.Vector3();
  const distSeg = (p, a, b) => { seg.copy(b).sub(a); const t = Math.max(0, Math.min(1, cerca.copy(p).sub(a).dot(seg) / (seg.lengthSq() || 1))); return cerca.copy(a).addScaledVector(seg, t).distanceTo(p); };
  /* CON EL CONTROL (Carlos, 18 nov: «las manos se salen de la cámara y se pierde el sable»): cada stick es un sable
     (izquierdo vino, derecho morado). El sable sale de un punto frente a tu hombro y el stick lo inclina: empujarlo
     rápido de un lado a otro es el corte. Si hay control, mandan los sticks; si no, las manos */
  const baseCtl = new THREE.Vector3();
  function fuentes(){
    if(V.hayControl()){
      const e = V.control.ejes || [0, 0, 0, 0];
      return [[-1, e[0], e[1]], [1, e[2], e[3]]].map(([lado, ax, ay]) => {
        /* en reposo el sable va hacia arriba y al frente (como se sostiene uno): así un barrido de lado alcanza las tres filas */
        const b = V.cabeza.localToWorld(baseCtl.set(lado * .2, -.5, -.3).clone());
        const d = new THREE.Vector3(ax * 1.3 + lado * .1, .85 - ay * 1.2, -.75).normalize().transformDirection(V.cabeza.matrixWorld);
        return { lado, base: b, dir: d };
      });
    }
    /* con las manos: cada sable sale del marco de su palma; si una mano se pierde un instante, su sable se queda */
    const t = performance.now() / 1000, vistas = {}, salen = [];
    for(const m of V.extra.manos || []){ const k = String(m.lado); if(vistas[k]) continue; vistas[k] = m; }
    for(const k of ['-1', '1']){
      const m = vistas[k], e = m?.ejes;
      if(m && !e){ salen.push({ lado: +k, base: m.mundo.palma.clone(), dir: m.mundo.punta.clone().sub(m.mundo.muneca).normalize() }); continue; }
      const r = deMano[k].paso(m ? { adelante: e.adelante.toArray(), lado: e.lado.toArray(), palma: m.mundo.palma.toArray() } : null, t);
      if(!r) continue;
      if(r.calibrado){ guardada[k] = r.calibrado; guardarCal(guardada); }
      salen.push({ lado: +k, base: new THREE.Vector3(...r.base), dir: new THREE.Vector3(...r.dir), sostenido: r.sostenido });
    }
    return salen;
  }
  sables.cuadro = (_, dt = 1 / 60) => {
    /* los sables siguen a las manos o al control (también fuera de partida: así se ve que jalan) */
    const vistos = { '-1': false, '1': false };
    for(const m of fuentes()){
      const k = String(m.lado); if(vistos[k]) continue; vistos[k] = true;
      base.copy(m.base); dirH.copy(m.dir);
      const h = hojas[k]; h.visible = true; h.position.copy(base); q.setFromUnitVectors(arriba, dirH); h.quaternion.copy(q);
      const largo = V.hayControl() ? .95 : .55; h.scale.y = largo / .55;
      punta.copy(base).addScaledVector(dirH, largo);
      const pr = previo[k]; vel.set(0, 0, 0); if(pr) vel.copy(punta).sub(pr.punta).divideScalar(Math.max(dt, 1 / 120));
      /* los cortes */
      if(estado === 'jugando') for(const b of bloques){
        if(!b.vivo || b.m.position.z < -1.6 || b.m.position.z > .1) continue;
        b.m.getWorldPosition(wp);
        if(distSeg(wp, base, punta) > .24 && (!pr || distSeg(wp, pr.base, pr.punta) > .24)) continue;
        if(vel.length() < 1.1) continue;
        const local = vel.clone().applyQuaternion(pista.quaternion.clone().invert()), d = DIRS[b.dir];
        const bien = !d || (local.x * d[0] + local.y * d[1]) > .45 * Math.hypot(local.x, local.y);
        if(!bien){ combo = 1; fallas++; V.hud('Mal', .5); partir(b, local); continue; }
        const color = (b.lado < 0) === (m.lado < 0);   // el lado de la mano o del stick
        puntos += (color ? 100 : 50) * combo; combo = Math.min(8, combo + (color ? 1 : 0)); mejorCombo = Math.max(mejorCombo, combo); aciertos++;
        V.sonar('toque', .4); partir(b, local);
      }
      previo[k] = { base: base.clone(), punta: punta.clone() };
    }
    for(const k of ['-1', '1']) if(!vistos[k]){ hojas[k].visible = false; previo[k] = null; }

    /* termina cuando las manos que se VEN ya quedaron (si sólo usas una, no espera a la otra); a los 12 s se rinde */
    if(estado === 'calibrando'){ const t = performance.now() / 1000, faltan = ['-1', '1'].filter((k) => deMano[k].st.cal), hecho = faltan.length < 2;
      const esperando = faltan.filter((k) => t - deMano[k].st.visto < 1);
      if(!faltan.length || (hecho && !esperando.length) || t > calHasta) finCal(hecho);
      return; }
    if(estado !== 'jugando'){ if(estado === 'listo') pintarTablero(V.hayControl() ? 'Sticks: tus sables' : (V.extra.manos || []).length ? 'Corta al ritmo' : 'Pon las manos frente a la cámara'); return; }
    musica();
    const t = performance.now() / 1000 - t0;
    /* un bloque por tiempo (a veces dos), sin repetir lado seguido, y salen con su tiempo de vuelo por delante */
    while(siguiente * BEAT < t + (ZG - Z0) / VEL && siguiente * BEAT < DURA){
      const llega = siguiente * BEAT; if(llega >= 0){
        const doble = siguiente % 4 === 0 && azar() < .4, dirs = Object.keys(DIRS);
        const uno = (lado) => bloque(lado, lado * (.15 + Math.floor(azar() * 2) * .3), [-.3, 0, .25][Math.floor(azar() * 3)], dirs[Math.floor(azar() * dirs.length)]);
        if(doble){ uno(-1); uno(1); } else uno(siguiente % 2 ? 1 : -1);
        const recien = bloques.slice(doble ? -2 : -1); recien.forEach((b) => { b.llega = llega; });
      }
      siguiente++;
    }
    for(const b of bloques){ if(!b.vivo) continue; b.m.position.z = ZG - (b.llega - t) * VEL;
      if(b.m.position.z > .6){ pista.remove(b.m); b.vivo = false; fallas++; combo = 1; } }
    bloques = bloques.filter((b) => b.vivo);
    for(const p of pedazos){ p.vida -= dt; p.v.y -= 9.8 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.z += p.giro * dt; p.m.material.opacity = Math.max(0, p.vida / .7); if(p.vida <= 0) pista.remove(p.m); }
    pedazos = pedazos.filter((p) => p.vida > 0);
    pintarTablero(t < 0 ? String(Math.ceil(-t)) : `${puntos}  ·  x${combo}`);
    if(t > DURA + 2.5) terminar();
  };
  sables.entrar = () => { estado = 'listo'; pintarTablero('Corta al ritmo'); mostrarTarjetas(true); };
  sables.salir = () => { estado = 'listo'; pista.visible = false; hojas['-1'].visible = hojas['1'].visible = false; bloques.forEach((b) => b.vivo && pista.remove(b.m)); bloques = []; };
  sables.atras = () => V.ir('juegos');
  sables.elegibles = () => (estado === 'jugando' || estado === 'calibrando' ? [] : [otra.malla, cal.malla].filter(Boolean));
  Object.defineProperty(sables, 'ocupaStick', { get: () => estado === 'jugando' });
  Object.defineProperty(sables, 'ocupaGiro', { get: () => estado === 'jugando' });
  sables.estado = () => ({ prendidos: +hojas['-1'].visible + +hojas['1'].visible, estado, puntos, combo, aciertos, fallas, bloques: bloques.length });
  sables.empezar = empezar; sables.calibrar = calibrar; sables.deMano = deMano;
  V.registrar('sables', sables);
  return sables;
}
