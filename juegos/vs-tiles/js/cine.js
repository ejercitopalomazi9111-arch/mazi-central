/* LAS CINEMÁTICAS DE FONDO DE LA HISTORIA (Carlos, 30 oct: «destrucción de ciudades, enfermedad, inundaciones,
   peleas de robots gigantes, cosas que pasarían en un anime… conciertos en un escenario… algunos fondos referentes
   a videojuegos»). Pasan LEJOS, detrás de la tarima, al ritmo de la canción: lo que se ve en el fondo de un opening
   mientras la acción va en primer plano. Los robots son modelos de Sketchfab (CC BY, ver CREDITOS.md); el fuego, el
   humo, la lluvia y las luces son los sprites de Kenney (CC0) que ya usa el juego. Aquí sólo se MUEVEN. */
import * as THREE from 'three';

/* cada cinemática dice qué foto 360° pone de fondo y cómo la tiñe */
export const CINES = {
  retro: { nombre: 'Punto de guardado', escenario: 1, tinte: '#FFD23F', oscuro: .62, sat: .9 },
  concierto: { nombre: 'Concierto', escenario: 7, tinte: '#FF5FD0', oscuro: .5, sat: 1.25 },
  diluvio: { nombre: 'Inundación', escenario: 0, tinte: '#2F6BFF', oscuro: .66, sat: .7 },
  plaga: { nombre: 'La plaga', escenario: 2, tinte: '#7CFF4F', oscuro: .64, sat: .45 },
  robots: { nombre: 'Robots gigantes', escenario: 6, tinte: '#FF8A3D', oscuro: .55, sat: 1 },
  ciudad: { nombre: 'La ciudad cae', escenario: 10, tinte: '#FF3A1A', oscuro: .58, sat: 1.1 }
};

export function crearCine({ s, tex, cargador, clonarEsqueleto }){
  const raiz = new THREE.Group(); s.add(raiz);
  let tipo = null, piezas = [], robots = [], agua = null, lluvia = null, nubes = null, ultimoGolpe = -1, rayo = 0;
  const azar = (a, b) => a + Math.random() * (b - a);

  /* un montón de sprites que nacen, crecen y se apagan: explosiones, humo, meteoros, confeti, esporas */
  const vivos = [];
  const sprite = async (nombre, color, aditivo = true) => { const m = new THREE.SpriteMaterial({ map: await tex(`sprites/${nombre}.png`), color, transparent: true, depthWrite: false, fog: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending }); return m; };
  const nacer = (mat, pos, { vel = [0, 0, 0], esc = 4, crece = 1, vida = 1, giro = 0, alfa = 1, cae = 0 } = {}) => {
    const sp = new THREE.Sprite(mat.clone()); sp.position.copy(pos); sp.scale.setScalar(esc); sp.material.rotation = azar(0, 6.28); raiz.add(sp);
    vivos.push({ sp, v: new THREE.Vector3(...vel), esc, crece, vida, giro, alfa, cae, t: 0 }); };
  function moverVivos(dt){ for(let i = vivos.length - 1; i >= 0; i--){ const p = vivos[i]; p.t += dt; const u = p.t / p.vida;
    if(u >= 1){ raiz.remove(p.sp); p.sp.material.dispose(); vivos.splice(i, 1); continue; }
    p.v.y -= p.cae * dt; p.sp.position.addScaledVector(p.v, dt); p.sp.scale.setScalar(p.esc * (1 + p.crece * u)); p.sp.material.rotation += p.giro * dt;
    p.sp.material.opacity = p.alfa * (u < .15 ? u / .15 : 1 - (u - .15) / .85); } }

  /* una nube de puntos que flota (esporas, barras de luz del público, píxeles) */
  async function puntos(n, nombre, color, tam, caja){ const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), C = new Float32Array(n * 3), c = new THREE.Color();
    for(let i = 0; i < n; i++){ P[i * 3] = azar(caja[0], caja[1]); P[i * 3 + 1] = azar(caja[2], caja[3]); P[i * 3 + 2] = azar(caja[4], caja[5]);
      c.set(Array.isArray(color) ? color[i % color.length] : color); C.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: await tex(`sprites/${nombre}.png`), size: tam, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.userData.base = P.slice(); raiz.add(m); piezas.push(m); return m; }

  /* un sprite grande y fijo en el cielo (la estrella de guardado, los botones de consola, el símbolo de la plaga) */
  async function fijo(nombre, color, pos, esc, aditivo = true){ const sp = new THREE.Sprite(await sprite(nombre, color, aditivo)); sp.position.set(...pos); sp.scale.setScalar(esc); raiz.add(sp); piezas.push(sp); return sp; }

  /* los robots: dos mechas de 30 m frente a frente, lejos, peleando al compás */
  async function robot(archivo, x, mira){ const g = await cargador.loadAsync(`modelos/${archivo}.glb`), m = clonarEsqueleto(g.scene);
    m.traverse(o => { if(o.isMesh){ o.frustumCulled = false; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(mt => { mt.fog = false; }); } });
    m.updateMatrixWorld(true); const caja = new THREE.Box3().setFromObject(m, true), alto = Math.max(.01, caja.max.y - caja.min.y), k = 70 / alto, c = caja.getCenter(new THREE.Vector3());
    const cuerpo = new THREE.Group(); m.position.set(-c.x, -caja.min.y, -c.z); cuerpo.add(m); cuerpo.scale.setScalar(k);
    const r = new THREE.Group(); r.add(cuerpo); r.position.set(x, -24, -150); r.rotation.y = mira; raiz.add(r); piezas.push(r);
    const mez = new THREE.AnimationMixer(m), A = Object.fromEntries(g.animations.map(a => [a.name, a]));
    return { r, mez, A, actual: null, x0: x, mira }; }
  function animar(R, nombre, una = false){ const a = R.A[nombre]; if(!a || R.actual === nombre && !una) return;
    R.mez.stopAllAction(); const ac = R.mez.clipAction(a); ac.reset(); if(una){ ac.setLoop(THREE.LoopOnce); ac.clampWhenFinished = true; } ac.play(); R.actual = nombre; }

  /* en fila: si se pide otra mientras una carga (salir de una misión y entrar a otra), la segunda espera */
  let cola = Promise.resolve();
  const poner = (nuevo) => cola = cola.then(() => ponerYa(nuevo)).catch(e => console.error(e));
  async function ponerYa(nuevo){
    if(nuevo === tipo) return; tipo = nuevo;
    vivos.splice(0).forEach(p => { raiz.remove(p.sp); p.sp.material.dispose(); });
    piezas.splice(0).forEach(o => raiz.remove(o)); robots = []; agua = lluvia = nubes = null;
    if(!tipo) return;
    const M = {};
    if(tipo === 'ciudad' || tipo === 'robots'){ M.fuego = await sprite('p_flare_01', '#FF7A2A'); M.humo = await sprite('p_smoke_04', '#5A4A4A', false); M.chispa = await sprite('p_spark_05', '#FFC46B');
      M.meteoro = await sprite('p_trace_04', '#FF9A4A'); M.luz = await sprite('p_light_01', '#FF5A1A'); }
    if(tipo === 'ciudad'){ for(let i = 0; i < 5; i++) await fijo('p_light_01', '#FF3A0A', [azar(-90, 90), azar(-8, 2), azar(-150, -110)], azar(40, 70)); }
    if(tipo === 'robots'){
      const [a, b] = await Promise.all([robot("robot-striker", -42, Math.PI / 2), robot("robot-calibur", 42, -Math.PI / 2)]); robots = [a, b];
      animar(a, 'a4IdlePose'); animar(b, 'Idle'); await fijo('p_light_01', '#FF6A1A', [0, -6, -135], 120); }
    if(tipo === 'plaga'){ M.espora = await sprite('p_circle_03', '#9CFF6A'); M.nube = await sprite('p_smoke_04', '#3E7A2E', false);
      nubes = await puntos(260, 'p_circle_03', ['#9CFF6A', '#C8FF8A', '#5BD94A'], 2.4, [-60, 60, -6, 30, -140, -30]);
      await fijo('p_magic_05', '#7CFF4F', [0, 34, -150], 70); }
    if(tipo === 'diluvio'){
      /* el agua: un plano lejano con olas que suben poco a poco durante la canción */
      const g = new THREE.PlaneGeometry(400, 260, 80, 50); g.rotateX(-Math.PI / 2); g.translate(0, 0, -140);
      agua = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { t: { value: 0 }, luz: { value: 0 } },
        vertexShader: 'uniform float t; varying float vY; varying vec2 vP; void main(){ vec3 p = position; float o = sin(p.x * .08 + t * 1.3) * .9 + sin(p.z * .11 - t * 1.7) * .7 + sin((p.x + p.z) * .2 + t * 2.3) * .3; p.y += o; vY = o; vP = p.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
        fragmentShader: 'uniform float luz; varying float vY; varying vec2 vP; void main(){ float d = clamp(-vP.y / 260.0, 0.0, 1.0); vec3 c = mix(vec3(.04, .12, .26), vec3(.18, .42, .7), clamp(vY * .4 + .5, 0.0, 1.0)); c += vec3(.6, .75, 1.0) * luz * .6; gl_FragColor = vec4(c, .78 * (1.0 - d * .5)); }' }));
      agua.position.y = -14; raiz.add(agua); piezas.push(agua);
      /* la lluvia: rayitas que caen en diagonal */
      const n = 900, P = new Float32Array(n * 6); for(let i = 0; i < n; i++){ const x = azar(-60, 60), y = azar(-10, 40), z = azar(-90, -8); P.set([x, y, z, x + .25, y - 1.6, z], i * 6); }
      const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(P, 3));
      lluvia = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: '#9FC4FF', transparent: true, opacity: .45, depthWrite: false, fog: false })); raiz.add(lluvia); piezas.push(lluvia);
      M.salpica = await sprite('p_circle_05', '#CFE4FF'); }
    if(tipo === 'concierto'){
      /* el público: barras de luz a los lados de la pista y al pie de la tarima, que se mecen al golpe */
      nubes = await puntos(520, 'p_light_01', ['#FF5FD0', '#38E1FF', '#FFF07A', '#B44BFF', '#7CFF6B'], 1.1, [-34, 34, -3.2, -1.6, -60, -4]);
      const A = nubes.geometry.attributes.position; for(let i = 0; i < A.count; i++){ if(Math.abs(A.getX(i)) < 5.5) A.setX(i, A.getX(i) + Math.sign(A.getX(i) || 1) * 6); } nubes.userData.base = A.array.slice();
      M.confeti = await sprite('gen_square_fill', '#FFFFFF', false); M.chispa = await sprite('p_star_06', '#FFF3B0'); }
    if(tipo === 'retro'){
      /* referencias a videojuegos: el piso de rejilla de los 80, la estrella amarilla de guardar de Undertale y los
         cuatro botones de consola flotando en el cielo como un menú de pausa */
      const g = new THREE.PlaneGeometry(400, 300, 1, 1); g.rotateX(-Math.PI / 2);
      const piso = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { t: { value: 0 }, luz: { value: 0 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float t, luz; varying vec2 vP; void main(){ vec2 q = vec2(vP.x, vP.y + t * 6.0) / 6.0; vec2 f = abs(fract(q) - .5); float l = smoothstep(.46, .5, max(f.x, f.y)); float d = clamp(-vP.y / 150.0, 0.0, 1.0); vec3 c = mix(vec3(1.0, .25, .8), vec3(.3, .9, 1.0), d) * l * (1.0 - d * .7) * (.7 + luz * .6); gl_FragColor = vec4(c, l * .9 + .08); }' }));
      piso.position.set(0, -6, -150); raiz.add(piso); piezas.push(piso); agua = piso;
      const est = await fijo('p_star_06', '#FFE14A', [0, 44, -130], 34); est.userData.guardar = true;
      for(const [i, n] of ['ps_color_triangle', 'ps_color_circle', 'ps_color_cross', 'ps_color_square'].entries()) (await fijo(n, '#FFFFFF', [(i - 1.5) * 34, 34 + (i % 2) * 6, -150], 16, false)).userData.boton = i;
      nubes = await puntos(160, 'gen_square_fill', ['#FFE14A', '#FF5FD0', '#38E1FF'], .9, [-70, 70, -4, 40, -140, -40]);
      M.chispa = await sprite('p_star_06', '#FFE14A'); }
    raiz.userData.M = M;
  }

  /* un cuadro: t = segundo de la canción; gi = número de golpe; latido = 1 en el golpe y baja */
  function cuadro(t, dt, { gi, latido, compas }){
    if(!tipo) return 0; const M = raiz.userData.M || {}, nuevo = gi !== ultimoGolpe; ultimoGolpe = gi; let luz = 0;
    if(tipo === 'ciudad'){
      /* explosiones en cada compás, meteoros cada dos, humo que sube siempre */
      if(nuevo && gi % 2 === 0){ const p = new THREE.Vector3(azar(-80, 80), azar(-8, 10), azar(-140, -95)); nacer(M.fuego, p, { esc: azar(14, 26), crece: 1.4, vida: .9 }); nacer(M.luz, p, { esc: 50, crece: .5, vida: .6, alfa: .8 });
        for(let k = 0; k < 6; k++) nacer(M.chispa, p, { vel: [azar(-14, 14), azar(4, 20), azar(-4, 4)], esc: 2.5, vida: 1.2, cae: 18 });
        nacer(M.humo, p.clone().add(new THREE.Vector3(0, 6, 0)), { vel: [azar(-1, 1), 5, 0], esc: 18, crece: 2.2, vida: 5, alfa: .55, giro: .2 }); luz = 1; }
      if(nuevo && gi % 4 === 1){ const x = azar(-60, 60); nacer(M.meteoro, new THREE.Vector3(x, 70, -150), { vel: [azar(-30, 30), -60, 10], esc: 24, crece: 0, vida: 1.4, giro: 0 }); }
    }
    if(tipo === 'robots' && robots.length === 2){
      const [a, b] = robots; robots.forEach(R => R.mez.update(dt));
      /* cada cuatro golpes uno ataca y el otro se cubre; se van turnando. Cuando el golpe conecta: chispazo y humo */
      if(nuevo && gi % 4 === 0){ const turno = Math.floor(gi / 4) % 2, [atk, def] = turno ? [b, a] : [a, b];
        animar(atk, atk === a ? ['c1PunchRight', 'c1PunchLeft', 'c1KickRight', 'c1HeadRam'][Math.floor(gi / 8) % 4] : ['Attack1', 'Attack_TripleCombo', 'Attack_Stabs', 'Attack_Jump'][Math.floor(gi / 8) % 4], true);
        animar(def, def === a ? 'b1HitFront1' : 'Stun', true); }
      if(nuevo && gi % 4 === 2){ const p = new THREE.Vector3(azar(-4, 4), azar(10, 30), -145); nacer(M.fuego, p, { esc: 22, crece: 1.2, vida: .7 }); nacer(M.luz, p, { esc: 60, crece: .4, vida: .5, alfa: .7 });
        for(let k = 0; k < 10; k++) nacer(M.chispa, p, { vel: [azar(-20, 20), azar(0, 22), azar(-6, 6)], esc: 2.2, vida: 1, cae: 20 }); luz = 1; }
      if(nuevo && gi % 8 === 6) nacer(M.humo, new THREE.Vector3(azar(-60, 60), -6, azar(-140, -110)), { vel: [0, 4, 0], esc: 20, crece: 2, vida: 6, alfa: .5, giro: .1 });
      /* se acercan y se alejan un poco, como tanteándose */
      const vaiven = Math.sin(t * .35) * 5; a.r.position.x = a.x0 + vaiven; b.r.position.x = b.x0 - vaiven;
    }
    if(tipo === 'plaga' && nubes){ const P = nubes.geometry.attributes.position, B = nubes.userData.base;
      for(let i = 0; i < P.count; i++){ P.setY(i, B[i * 3 + 1] + Math.sin(t * .5 + i) * 1.5); P.setX(i, B[i * 3] + Math.sin(t * .3 + i * 1.7) * 2); } P.needsUpdate = true;
      nubes.material.size = 2.2 + latido * 1.2; nubes.material.opacity = .5 + .4 * Math.abs(Math.sin(t * 7.3)) * (Math.random() < .02 ? 0 : 1);
      if(nuevo && gi % 4 === 0) nacer(M.nube, new THREE.Vector3(azar(-60, 60), azar(-6, 6), azar(-130, -80)), { vel: [azar(-2, 2), 1.5, 0], esc: 26, crece: 1.5, vida: 7, alfa: .6, giro: .05 });
      piezas.forEach(o => { if(o.isSprite) o.material.rotation = t * .1; });
    }
    if(tipo === 'diluvio'){
      if(agua){ agua.material.uniforms.t.value = t; agua.position.y = -14 + Math.min(9, t * .06); }
      if(lluvia){ const P = lluvia.geometry.attributes.position; for(let i = 0; i < P.count; i += 2){ let y = P.getY(i) - 38 * dt; if(y < -10) y += 50; P.setY(i, y); P.setY(i + 1, y - 1.6); P.setX(i + 1, P.getX(i) + .25); } P.needsUpdate = true; }
      /* rayos: de vez en cuando, en un golpe fuerte, todo se ilumina un instante */
      if(nuevo && gi % 8 === 7 && Math.random() < .7) rayo = 1;
      if(nuevo && gi % 2 === 0 && M.salpica) nacer(M.salpica, new THREE.Vector3(azar(-40, 40), agua ? agua.position.y + 1 : -10, azar(-110, -40)), { esc: 3, crece: 2.5, vida: .6, alfa: .6 });
    }
    if(tipo === 'concierto' && nubes){ const P = nubes.geometry.attributes.position, B = nubes.userData.base;
      /* el público brinca en el golpe y se mece de lado a lado cada compás */
      for(let i = 0; i < P.count; i++){ P.setY(i, B[i * 3 + 1] + latido * .5 * ((i % 3) / 2 + .5)); P.setX(i, B[i * 3] + Math.sin((gi + i % 7) * Math.PI / 2 + t) * .25); } P.needsUpdate = true;
      nubes.material.size = .9 + latido * .5;
      if(nuevo && compas === 1 && gi % 16 >= 12) for(let k = 0; k < 14; k++) nacer(M.confeti, new THREE.Vector3(azar(-20, 20), azar(16, 24), azar(-50, -20)), { vel: [azar(-2, 2), azar(-3, 0), 0], esc: .6, vida: 3.5, giro: 4, cae: 2 });
      if(nuevo && gi % 8 === 0) nacer(M.chispa, new THREE.Vector3(azar(-12, 12), azar(8, 14), -40), { esc: 6, crece: 1.5, vida: .8 });
    }
    if(tipo === 'retro'){
      if(agua){ agua.material.uniforms.t.value = t; agua.material.uniforms.luz.value = latido; }
      piezas.forEach(o => { if(o.userData.guardar){ o.material.rotation = t * .6; o.scale.setScalar(34 + latido * 8); }
        if(o.userData.boton !== undefined){ const k = o.userData.boton, mio = gi % 4 === k; o.position.y = 34 + (k % 2) * 6 + Math.sin(t + k) * 2 + (mio ? latido * 3 : 0); o.material.opacity = mio ? 1 : .55; } });
      if(nubes){ const P = nubes.geometry.attributes.position, B = nubes.userData.base; for(let i = 0; i < P.count; i++){ let y = P.getY(i) - 3 * dt; if(y < -4) y = 40; P.setY(i, y); } P.needsUpdate = true; }
      if(nuevo && gi % 4 === 0) nacer(M.chispa, new THREE.Vector3(0, 44, -128), { esc: 18, crece: 1.6, vida: .6, alfa: .7 });
    }
    moverVivos(dt);
    rayo = Math.max(0, rayo - dt * 4); if(agua?.material.uniforms.luz && tipo === 'diluvio') agua.material.uniforms.luz.value = rayo;
    return Math.max(luz, rayo);
  }
  return { poner, cuadro, get tipo(){ return tipo; }, ver(si){ raiz.visible = si; } };
}
