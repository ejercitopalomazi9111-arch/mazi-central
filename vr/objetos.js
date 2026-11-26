/* MAZI VR · OBJETOS (Carlos, 18 nov: «objetos para poder agarrar, mover… para calar cómo se siente tomar cubos, figuras,
   formas, tomar una pistola y que esa pistola pueda disparar si muevo el índice como un gatillo»).

   Una mesa con cajas, figuras y una pistola, y dianas flotando enfrente.
     · CON LAS MANOS: apunta a algo y pellizca: se queda en tu mano mientras pellizcas, gira como gira tu mano y se acerca o
       aleja con ella. Al soltar cae (y si la mueves rápido, sale aventada).
     · LA PISTOLA se queda en la mano que la agarró aunque sueltes el pellizco: pon la mano como pistola y dobla el índice
       para disparar. Se suelta con otro pellizco largo o abriendo la mano (Atrás).
     · CON EL CONTROL: X agarra lo que miras y lo suelta; R2 dispara.
   Los modelos son de Kenney (Blaster Kit y Furniture Kit, CC0; licencias en modelos/objetos/). Las figuras son formas
   geométricas con material, no ilustración.
   Sólo usa hacia DÓNDE está la mano (y cuánto se acerca), que es lo que el rastreo da bien. */
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

const SUELO = -1.5, GRAV = 9.8;
const C_MORADO = 0xAC27FF, C_VINO = 0x7E1735, C_OSCURO = 0x2A1640;

export function montarObjetos(V){
  const { THREE, B } = V;
  const vista = { grupo: new THREE.Group() }, G = vista.grupo;
  const cargador = new GLTFLoader();
  const cab = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), qT = new THREE.Quaternion(), qG = new THREE.Quaternion();
  let objetos = [], mesa = { y: -.72, x: [-.6, .6], z: [-1.15, -.55] }, listo = false, disparos = 0, aciertos = 0;

  /* ── marcador ── */
  const tablero = new V.Panel(1.1, .2, 440); tablero.malla.position.set(0, .75, -2.4); G.add(tablero.malla);
  const pintar = () => { const { x, cv } = tablero; x.clearRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 44px system-ui, -apple-system, sans-serif'; x.fillStyle = '#F4EEF2'; x.fillText(aciertos ? `Dianas ${aciertos}` : 'Agarra · Dispara', cv.width / 2, cv.height / 2); tablero.listo(); };
  pintar();

  /* ── cosas ── */
  const cargar = (url) => cargador.loadAsync(url).then((g) => g.scene);
  const medir = (o) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
  const aTamano = (o, largo) => { const s = medir(o); o.scale.multiplyScalar(largo / Math.max(s.x, s.y, s.z)); return o; };
  /* cada cosa va dentro de un «cuerpo» centrado en su caja, para que gire sobre sí misma */
  function cuerpo(malla, tipo, extra = {}){
    const c = new THREE.Group(); const caja = new THREE.Box3().setFromObject(malla), centro = caja.getCenter(new THREE.Vector3()), tam = caja.getSize(new THREE.Vector3());
    malla.position.sub(centro); c.add(malla); G.add(c);
    const o = { c, tipo, tam, r: Math.max(tam.x, tam.y, tam.z) / 2, alto: tam.y / 2, vel: new THREE.Vector3(), giro: new THREE.Vector3(), mano: null, ...extra };
    objetos.push(o); return o;
  }
  const forma = (geo, color, metal = .1) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: metal, emissive: color, emissiveIntensity: .12 }));
  const BASE = './modelos/objetos/';
  const armado = (async () => {
    const [escritorio, cajaC, cajaM, pistola] = await Promise.all([cargar(BASE + 'desk.glb'), cargar(BASE + 'crate-small.glb'), cargar(BASE + 'crate-medium.glb'), cargar(BASE + 'blaster-a.glb')]);
    /* la mesa: 1.2 m de ancho, en el piso, enfrente */
    aTamano(escritorio, 1.25); const sm = medir(escritorio); const bm = new THREE.Box3().setFromObject(escritorio);
    escritorio.position.set(-(bm.min.x + bm.max.x) / 2, SUELO - bm.min.y, -.85 - (bm.min.z + bm.max.z) / 2); G.add(escritorio);
    mesa = { y: SUELO + sm.y, x: [-sm.x / 2, sm.x / 2], z: [-.85 - sm.z / 2, -.85 + sm.z / 2] };
    const sobre = (o, x, z) => { o.c.position.set(x, mesa.y + o.alto + .002, z); o.casa = o.c.position.clone(); o.casaQ = o.c.quaternion.clone(); };
    sobre(cuerpo(aTamano(cajaC.clone(), .16), 'caja'), -.42, -.8);
    sobre(cuerpo(aTamano(cajaC, .13), 'caja'), -.25, -.95);
    sobre(cuerpo(aTamano(cajaM, .2), 'caja'), .4, -.95);
    sobre(cuerpo(forma(new THREE.SphereGeometry(.07, 28, 18), C_MORADO, .2), 'pelota', { rebote: .65 }), -.08, -.72);
    sobre(cuerpo(forma(new THREE.TorusGeometry(.065, .025, 14, 36), C_VINO, .4), 'aro'), .1, -.95);
    sobre(cuerpo(forma(new THREE.ConeGeometry(.06, .14, 24), C_MORADO), 'cono'), .22, -.78);
    sobre(cuerpo(forma(new THREE.IcosahedronGeometry(.07, 0), C_VINO, .3), 'cristal'), -.4, -1.02);
    /* la pistola: el cañón de Kenney mira a −z; 26 cm */
    aTamano(pistola, .26); pistola.traverse((m) => { if(m.isMesh) m.castShadow = false; });
    const p = cuerpo(pistola, 'pistola'); p.c.rotation.y = .5; sobre(p, -.1, -1.05);
    p.boca = new THREE.Vector3(0, p.tam.y * .25, -p.tam.z / 2 - .01);   /* la punta del cañón, en el cuerpo */
    listo = true;
  })().catch((e) => { console.warn('objetos', e); V.hud('No cargaron los objetos'); });

  /* ── dianas ── */
  const dianas = [];
  const discoMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, side: THREE.DoubleSide });
  for(let i = 0; i < 5; i++){
    const g = new THREE.Group();
    [[.24, C_VINO], [.16, 0xF4EEF2], [.08, C_MORADO]].forEach(([r, c], k) => { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 40), discoMat(c)); d.position.z = k * .004; g.add(d); });
    G.add(g); dianas.push({ g, viva: true, vuelve: 0, fase: i * 1.3 });
  }
  let semilla = 11; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const ponerDiana = (d) => { const a = (azar() - .5) * 1.4, r = 3.2 + azar() * 2; d.base = new THREE.Vector3(Math.sin(a) * r, -.2 + azar() * 1.3, -Math.cos(a) * r);
    d.g.position.copy(d.base); d.g.lookAt(0, d.base.y, 0); d.g.visible = true; d.viva = true; d.g.scale.setScalar(1); };
  dianas.forEach(ponerDiana);
  let pedazos = [];
  function reventar(d, punto){
    d.viva = false; d.g.visible = false; d.vuelve = 1.4;
    for(let k = 0; k < 10; k++){ const m = new THREE.Mesh(new THREE.TetrahedronGeometry(.04), discoMat(k % 2 ? C_VINO : C_MORADO)); m.position.copy(punto); G.add(m);
      pedazos.push({ m, v: new THREE.Vector3((azar() - .5) * 3, azar() * 2.5, (azar() - .5) * 3), vida: .8 }); }
  }

  /* ── sonidos (hechos aquí, nada ajeno) ── */
  function pum(){
    const a = V.audio(); if(!a) return; const t = a.currentTime;
    const n = a.createBuffer(1, a.sampleRate * .15, a.sampleRate), d = n.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const s = a.createBufferSource(); s.buffer = n; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = .7;
    const g = a.createGain(); g.gain.value = .5; s.connect(f).connect(g).connect(a.destination); s.start(t);
    const o = a.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
    const g2 = a.createGain(); g2.gain.setValueAtTime(.45, t); g2.gain.exponentialRampToValueAtTime(.001, t + .14); o.connect(g2).connect(a.destination); o.start(t); o.stop(t + .15);
  }

  /* ── disparo ── */
  const trazo = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 1, 6), new THREE.MeshBasicMaterial({ color: 0xE6B8FF, transparent: true, opacity: .9, toneMapped: false, depthWrite: false }));
  trazo.visible = false; G.add(trazo); let trazoVida = 0;
  const fogonazo = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xFFD6FF, transparent: true, toneMapped: false, depthWrite: false }));
  fogonazo.visible = false; G.add(fogonazo);
  const rc = new THREE.Raycaster();
  function disparar(arma){
    disparos++; pum();
    const boca = arma.c.localToWorld(arma.boca.clone()), dir = new THREE.Vector3(0, 0, -1).transformDirection(arma.c.matrixWorld);
    rc.set(boca, dir); rc.far = 30;
    const blancos = [...dianas.filter((d) => d.viva).map((d) => d.g), ...objetos.filter((o) => o !== arma && !o.mano).map((o) => o.c)];
    const h = rc.intersectObjects(blancos, true)[0];
    const fin = h ? h.point : boca.clone().addScaledVector(dir, 30);
    if(h){
      const d = dianas.find((d) => { let x = h.object; while(x){ if(x === d.g) return true; x = x.parent; } return false; });
      if(d){ aciertos++; reventar(d, G.worldToLocal(h.point.clone())); V.sonar('ding', .3); pintar(); }
      else { const o = objetos.find((o) => { let x = h.object; while(x){ if(x === o.c) return true; x = x.parent; } return false; });
        if(o){ o.vel.addScaledVector(dir.clone().transformDirection(new THREE.Matrix4().copy(G.matrixWorld).invert()), 3); o.vel.y += 1.2; o.giro.set(azar() * 8 - 4, azar() * 8 - 4, azar() * 8 - 4); o.quieto = false; } }
    }
    /* el trazo va en el espacio del grupo */
    const a = G.worldToLocal(boca.clone()), b = G.worldToLocal(fin.clone());
    trazo.position.copy(a).add(b).multiplyScalar(.5); trazo.scale.set(1, a.distanceTo(b), 1);
    trazo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); trazo.visible = true; trazoVida = .07;
    fogonazo.position.copy(a); fogonazo.visible = true;
    arma.retroceso = .12;
  }

  /* ── agarrar ── */
  const cabezaLocal = () => G.worldToLocal(V.cabeza.getWorldPosition(cab).clone());
  /* hacia dónde está la mano vista desde tu cabeza (a través del dedo, como el cursor) */
  const dirMano = (m) => m.vista?.punta ? m.vista.punta.clone() : m.mundo.indice.clone().sub(V.cabeza.getWorldPosition(cab)).normalize();
  /* el giro de la mano: −z hacia adelante, x hacia el lado; si no hay datos 3D de la mano, sin giro */
  const giroMano = (m) => { const e = m.ejes; if(!e) return null; const z = e.adelante.clone().negate(), x = e.lado.clone().addScaledVector(z, -e.lado.dot(z)).normalize(), y = new THREE.Vector3().crossVectors(z, x);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
  const aLocalQ = (qMundo) => { G.getWorldQuaternion(qG); return qG.clone().invert().multiply(qMundo); };
  /* lo que está a menos de unos grados de la dirección de la mano */
  function cercano(dirW, sinPistola){
    const c = V.cabeza.getWorldPosition(cab); let mejor = null, ma = Infinity;
    for(const o of objetos){ if(o.mano || (sinPistola && o.tipo === 'pistola')) continue;
      const p = o.c.getWorldPosition(tmp), dist = p.distanceTo(c), a = dirW.angleTo(tmp2.copy(p).sub(c).normalize());
      /* lo que va volando se caza más fácil (aventar y cachar) */
      const lim = Math.atan(o.r / Math.max(.2, dist)) + .12 + (o.vel.length() > 1 ? .18 : 0); if(a < lim && a < ma){ ma = a; mejor = o; } }
    return mejor;
  }
  /* las manos de antes, para saber cuál es cuál entre cuadros y quién acaba de pellizcar */
  let antes = [];
  const misma = (dir) => { let m = null, ma = .35; for(const a of antes){ const g = a.dir.angleTo(dir); if(g < ma){ ma = g; m = a; } } return m; };

  function tomar(o, m, dirW){
    const c = V.cabeza.getWorldPosition(cab), p = o.c.getWorldPosition(tmp).clone();
    o.mano = { dir: dirW.clone(), d0: p.distanceTo(c), dist0: m.dist ?? .5, desde: performance.now(), suelta: false, gatilloArmado: true, ultimoTiro: 0,
      offset: new THREE.Quaternion().setFromUnitVectors(dirW, p.clone().sub(c).normalize()) };
    const gm = giroMano(m);
    if(o.tipo === 'pistola'){ o.mano.d0 = Math.min(o.mano.d0, .45); o.mano.offset.identity(); }
    else if(gm){ G.getWorldQuaternion(qG); o.mano.rel = gm.clone().invert().multiply(qG.clone().multiply(o.c.quaternion)); }
    o.quieto = false; o.vel.set(0, 0, 0); o.giro.set(0, 0, 0); o.hist = [];
    V.sonar('toque', .25);
  }
  function soltar(o, aventar = true){
    if(!o.mano) return;
    if(aventar && o.hist?.length > 2){ const a = o.hist[0], b = o.hist[o.hist.length - 1], dt = Math.max(.016, (b.t - a.t) / 1000);
      o.vel.copy(b.p).sub(a.p).multiplyScalar(1 / dt).clampLength(0, 6); }
    o.mano = null; o.porControl = false; o.giro.set((azar() - .5) * 2, (azar() - .5) * 2, (azar() - .5) * 2);
  }
  /* pone lo agarrado donde va la mano */
  function seguir(o, m, dt){
    const c = V.cabeza.getWorldPosition(cab).clone(), dirW = dirMano(m);
    o.mano.dir.copy(dirW);
    /* acercar y alejar con la mano (Carlos: «no los puedes acercar tanto ni alejar tanto»): el doble de recorrido que
       antes y de 15 cm a 5 m; la distancia de la mano se suaviza, que es lo más ruidoso del rastreo */
    o.mano.distS = o.mano.distS == null ? (m.dist ?? o.mano.dist0) : o.mano.distS + ((m.dist ?? o.mano.dist0) - o.mano.distS) * .25;
    const cerca = o.tipo === 'pistola' ? 0 : (o.mano.distS - o.mano.dist0) * 5;
    const d = Math.max(.15, Math.min(5, o.mano.d0 + cerca));
    const destino = c.addScaledVector(o.tipo === 'pistola' && m.vista?.nudillo ? m.vista.nudillo.clone() : dirW.clone().applyQuaternion(o.mano.offset), d);
    const gm = giroMano(m);
    let qDestino = null;
    if(o.tipo === 'pistola'){
      /* EL CAÑÓN APUNTA A TRAVÉS DE TU NUDILLO (Carlos, 18 nov: «cuando apunto hacia adelante, la pistola apunta hacia
         arriba todo el tiempo»): la dirección muñeca → nudillo en 3D falla justo con la mano de frente. Ahora es la de tu
         cabeza al nudillo del índice tal como lo ve la cámara (no la punta, que se mueve al jalar el gatillo); la cacha,
         hacia abajo del cuarto */
      const aim = (m.vista?.nudillo || dirW).clone();
      const ojo = V.cabeza.getWorldPosition(tmp).clone();
      qDestino = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(ojo, ojo.clone().add(aim), new THREE.Vector3(0, 1, 0)));
      if(o.retroceso > 0) qDestino.multiply(qT.setFromAxisAngle(tmp2.set(1, 0, 0), o.retroceso * 2.5));
    } else if(gm && o.mano.rel) qDestino = gm.clone().multiply(o.mano.rel);
    const local = G.worldToLocal(destino);
    o.c.position.lerp(local, Math.min(1, dt * 22));
    if(qDestino) o.c.quaternion.slerp(aLocalQ(qDestino), Math.min(1, dt * 16));
    o.hist.push({ p: o.c.position.clone(), t: performance.now() }); if(o.hist.length > 6) o.hist.shift();
  }

  function manosCuadro(dt){
    const manos = (V.extra.manos || []).filter((m) => m.mundo?.indice), ahora = performance.now();
    const actuales = manos.map((m) => ({ m, dir: dirMano(m) }));
    for(const a of actuales){
      const prev = misma(a.dir); a.antes = prev; a.nueva = !prev || (!prev.pellizco && a.m.pellizco);
      a.pellizco = a.m.pellizco;
      /* ¿esta mano ya trae algo? */
      /* lo que trae: lo agarrado más cerca de esta mano; con una sola mano y una sola cosa, es suya aunque haya brincado
         (el rastreo a veces pierde la mano un instante y la encuentra en otro lado) */
      const traidos = objetos.filter((o) => o.mano && !o.porControl);
      a.trae = traidos.filter((o) => !actuales.some((x) => x !== a && x.trae === o))
        .sort((x, y) => x.mano.dir.angleTo(a.dir) - y.mano.dir.angleTo(a.dir))
        .find((o) => o.mano.dir.angleTo(a.dir) < .45 || (actuales.length === 1 && traidos.length === 1));
      if(a.trae){
        const o = a.trae; seguir(o, a.m, dt);
        if(o.tipo === 'pistola'){
          /* EL GATILLO (Carlos, 18 nov: «a veces lo detecta, a veces no»): dos formas, con margen para no disparar doble:
               · el índice se dobla: «recto» baja de .72 (estirado ronda 1); se rearma al pasar de .86
               · el pulgar se aprieta contra el costado del índice, como botón: baja de .32; se rearma al pasar de .45
             Si la mano está sostenida un instante (perdida), no dispara. Y ya NO se suelta con un pellizco (por eso se
             soltaba sola: la mano en pistola junta pulgar e índice): se suelta abriendo la mano (Atrás). */
          const E = a.m.ejes;
          if(E && !a.m.estimada){
            if(E.recto > .86) o.mano.armadoI = true; if(E.pulgar > .45) o.mano.armadoP = true;
            const tiroI = o.mano.armadoI && E.recto < .72, tiroP = o.mano.armadoP && E.pulgar < .32;
            if((tiroI || tiroP) && ahora - o.mano.ultimoTiro > 180){ if(tiroI) o.mano.armadoI = false; if(tiroP) o.mano.armadoP = false; o.mano.ultimoTiro = ahora; disparar(o); }
          }
        } else if(!a.pellizco){ o.mano.sueltaDesde = o.mano.sueltaDesde || ahora; if(ahora - o.mano.sueltaDesde > 150) soltar(o); }   /* un parpadeo del pellizco no tira lo que traes */
        else o.mano.sueltaDesde = 0;
        continue;
      }
      if(a.pellizco && a.nueva && listo && !V.extra.sobreBoton && !V.brilloHace?.(300)){ const o = cercano(a.dir); if(o) tomar(o, a.m, a.dir); }
    }
    antes = actuales.map((a) => ({ dir: a.dir, pellizco: a.pellizco }));
  }

  /* ── el control: X agarra lo que miras; R2 dispara ── */
  let traeControl = null;
  function controlCuadro(dt){
    if(!traeControl) return;
    const o = traeControl;
    const lugar = o.tipo === 'pistola' ? new THREE.Vector3(.12, -.17, -.42) : new THREE.Vector3(0, -.12, -.55);
    const destino = V.cabeza.localToWorld(lugar.clone());
    o.c.position.lerp(G.worldToLocal(destino.clone()), Math.min(1, dt * 18));
    /* la pistola apunta a lo que miras, a 8 m */
    const mira = V.cabeza.localToWorld(new THREE.Vector3(0, 0, -8));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), mira.sub(destino).normalize());
    if(o.retroceso > 0) q.multiply(qT.setFromAxisAngle(tmp2.set(1, 0, 0), o.retroceso * 2.5));
    o.c.quaternion.slerp(aLocalQ(q), Math.min(1, dt * 14));
    o.hist.push({ p: o.c.position.clone(), t: performance.now() }); if(o.hist.length > 6) o.hist.shift();
  }
  /* (27 nov, Carlos: «estoy tratando de pulsar atrás en objetos y no funciona») la X de aquí era la de TODO: el pellizco de la
     mano también, y esto contestaba siempre { x: true }, así que el clic del pellizco nunca llegaba al botón Atrás (y además
     agarraba lo que tenías enfrente). Aquí sólo cuenta la X del control o el teclado; la mano agarra por su lado (manosCuadro) */
  vista.control = (ctl) => {
    const xPad = !!(ctl.oprimidoPad || ctl.oprimido)[B.X];
    if(xPad){
      if(traeControl){ const o = traeControl; traeControl = null; soltar(o); }
      else if(listo){ const d = new THREE.Vector3(); V.cabeza.getWorldDirection(d); const o = cercano(d);
        if(o){ tomar(o, { dist: .5 }, d); o.porControl = true; traeControl = o; } }
    }
    if((ctl.oprimido[B.R2] || ctl.oprimido[B.R1]) && traeControl?.tipo === 'pistola') disparar(traeControl);
    return { x: xPad };
  };

  /* ── física sencilla: gravedad, la mesa, el piso y que no se encimen ── */
  function fisica(dt){
    for(const o of objetos){
      if(o.mano || o.quieto) continue;
      o.vel.y -= GRAV * dt; o.c.position.addScaledVector(o.vel, dt);
      o.c.rotation.x += o.giro.x * dt; o.c.rotation.y += o.giro.y * dt; o.c.rotation.z += o.giro.z * dt;
      const p = o.c.position, piso = (p.x > mesa.x[0] && p.x < mesa.x[1] && p.z > mesa.z[0] && p.z < mesa.z[1] && p.y > mesa.y - .05) ? mesa.y : SUELO;
      if(p.y - o.alto < piso){ p.y = piso + o.alto;
        if(o.vel.y < 0) o.vel.y = -o.vel.y * (o.rebote ?? .25);
        o.vel.x *= .82; o.vel.z *= .82; o.giro.multiplyScalar(.7);
        if(Math.abs(o.vel.y) < .25 && o.vel.lengthSq() < .01){ o.vel.set(0, 0, 0); o.giro.set(0, 0, 0); o.quieto = true; } }
      /* lejos o tirado muy abajo: vuelve a la mesa */
      if(p.length() > 25 || p.y < SUELO - 1){ p.copy(o.casa); o.vel.set(0, 0, 0); o.quieto = true; }
    }
    for(let i = 0; i < objetos.length; i++) for(let j = i + 1; j < objetos.length; j++){
      const a = objetos[i], b = objetos[j]; if(a.mano && b.mano) continue;
      const d = tmp.copy(b.c.position).sub(a.c.position), l = d.length(), min = (a.r + b.r) * .8;
      if(l > 0 && l < min){ const emp = d.multiplyScalar((min - l) / l / 2);
        if(!a.mano){ a.c.position.sub(emp); a.quieto = false; } if(!b.mano){ b.c.position.add(emp); b.quieto = false; } }
    }
  }

  vista.cuadro = (t, dt = 1 / 60) => {
    dt = Math.min(dt, .05);
    V.extra.gestosVideo = true;   /* aquí pellizcar agarra; sólo es clic encima de un botón (Atrás) */
    if(listo){ manosCuadro(dt); controlCuadro(dt); fisica(dt); }
    for(const o of objetos) if(o.retroceso > 0) o.retroceso = Math.max(0, o.retroceso - dt * .9);
    for(const d of dianas){ if(d.viva){ d.g.position.y = d.base.y + Math.sin(t * 1.3 + d.fase) * .08; } else if((d.vuelve -= dt) <= 0) ponerDiana(d); }
    for(const p of pedazos){ p.vida -= dt; p.v.y -= GRAV * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 9; if(p.vida <= 0){ G.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); } }
    pedazos = pedazos.filter((p) => p.vida > 0);
    if(trazoVida > 0){ trazoVida -= dt; if(trazoVida <= 0) trazo.visible = fogonazo.visible = false; }
  };
  vista.entrar = () => { pintar(); };
  vista.salir = () => { V.extra.gestosVideo = false; for(const o of objetos) soltar(o, false); traeControl = null; };
  /* Atrás (Círculo, la palma o el botón): primero suelta lo que traes; si no traes nada, regresa */
  vista.atras = () => { const trae = objetos.filter((o) => o.mano); if(trae.length){ trae.forEach((o) => soltar(o, false)); traeControl = null; V.hud('Soltado', .8); } else V.ir('juegos'); };
  vista.estado = () => ({ listo, objetos: objetos.length, sostenidos: objetos.filter((o) => o.mano).map((o) => o.tipo), disparos, aciertos,
    pos: Object.fromEntries(objetos.map((o, i) => [o.tipo + i, o.c.position.toArray().map((v) => +v.toFixed(2))])), mesa: +mesa.y.toFixed(2) });
  vista.donde = (tipo) => { const o = objetos.find((o) => o.tipo === tipo); return o ? o.c.getWorldPosition(new THREE.Vector3()).toArray() : null; };
  vista.dianas = () => dianas.filter((d) => d.viva).map((d) => d.g.getWorldPosition(new THREE.Vector3()).toArray());
  vista.disparar = () => { const p = objetos.find((o) => o.tipo === 'pistola'); if(p) disparar(p); };
  vista.armado = armado;
  V.registrar('objetos', vista);
  return vista;
}
