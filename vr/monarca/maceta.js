/* LA MACETA: sembrar con tus manos (prompt maestro de Carlos §12: «tomar una bolsa de tierra, inclinarla, verter tierra en
   una maceta, hacer un hoyo, tomar semillas, colocarlas, cubrirlas, regar y observar el crecimiento… el jugador no debe
   solamente presionar un botón»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   · Todo es modelo REAL de Poly Haven (CC0): maceta de barro, bolsa de composta, pala de jardín, semillero y regadera; la
     tierra es su textura «brown_mud». La planta que crece es la de las flores (Poly Haven), y al final llega la mariposa
     guía a posarse: la planta entra al ecosistema.
   · Se juega con lo que tengas: apuntar con la mano y pellizcar, mirar fijo, el control o tocar la pantalla. Cada
     herramienta: la eliges (se viene a tu mano), luego eliges la maceta (se usa ahí, con su animación).
   · Orden: tierra → hoyo (pala) → semilla (semillero) → cubrir (pala) → regar (regadera) → crece. Si eliges la que no va,
     el narrador lo dice con calma; si tardas, lo dice con humor.
   crearMaceta({ THREE, V, grupo, cargar(gltf), aqui, decir(id), alTerminar, eco, flor() }) */
export const PASOS = ['tierra', 'hoyo', 'semilla', 'cubrir', 'regar', 'crece', 'lista'];
const HERRAMIENTA = { tierra: 'bolsa', hoyo: 'pala', semilla: 'semillero', cubrir: 'pala', regar: 'regadera' };
export function crearMaceta({ THREE, V, grupo, cargar, aqui, decir = () => {}, alTerminar = () => {}, eco, flor = () => null, idioma = () => 'es' }){
  const M = { paso: null, mano: null, activo: false, listo: false, errores: 0 };
  const capa = new THREE.Group(); capa.visible = false; grupo.add(capa);
  const SUELO = -.98;
  /* dónde va cada cosa: la maceta enfrente, las herramientas a los lados, al alcance de la vista hacia abajo */
  const LUGAR = { maceta: [0, SUELO, -1.25], bolsa: [-.62, SUELO, -1.05], semillero: [-.42, SUELO, -1.5], pala: [.45, SUELO, -1.5], regadera: [.66, SUELO, -1.05] };
  const ALTO = { maceta: .32, bolsa: .42, semillero: .1, pala: .3, regadera: .34 };
  const ARCHIVO = { maceta: 'planter_pot_clay', bolsa: 'compost_bag_02', semillero: 'seeding_tray_01', pala: 'trowel_01', regadera: 'watering_can_metal_01' };
  const NOMBRE = { maceta: { es: 'Maceta', en: 'Pot' }, bolsa: { es: 'Tierra', en: 'Soil' }, semillero: { es: 'Semillas', en: 'Seeds' }, pala: { es: 'Pala', en: 'Trowel' }, regadera: { es: 'Regadera', en: 'Watering can' } };
  const cosas = {};
  /* cada cosa: el modelo + una caja invisible que es la que se elige (el motor sólo elige mallas, no grupos) */
  M.armado = Promise.all(Object.entries(ARCHIVO).map(async ([k, f]) => {
    const g = await cargar(aqui(`medios/maceta/${f}.glb`)).catch(() => null);
    const raiz = new THREE.Group(); raiz.position.set(...LUGAR[k]); capa.add(raiz);
    let modelo = null, caja = new THREE.Box3(new THREE.Vector3(-.15, 0, -.15), new THREE.Vector3(.15, .3, .15));
    if(g){ modelo = g.scene; const b = new THREE.Box3().setFromObject(modelo), tam = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const esc = ALTO[k] / Math.max(.001, tam.y); modelo.scale.setScalar(esc); modelo.position.set(-c.x * esc, -b.min.y * esc, -c.z * esc);
      modelo.traverse((o) => { if(o.isMesh){ const v = o.material; o.material = new THREE.MeshBasicMaterial({ map: v.map || null, color: v.map ? 0xffffff : v.color, side: THREE.DoubleSide, transparent: false }); o.material.userData.base = o.material.color.clone(); } });
      raiz.add(modelo); caja = new THREE.Box3().setFromObject(modelo); caja.translate(raiz.position.clone().negate()); }
    const t = caja.getSize(new THREE.Vector3()), cc = caja.getCenter(new THREE.Vector3());
    const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.18, t.x * 1.15), Math.max(.18, t.y * 1.2), Math.max(.18, t.z * 1.15)), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(cc); raiz.add(hit);
    const titulo = NOMBRE[k][idioma()] || NOMBRE[k].es;
    hit.userData.panel = { titulo, foco: (f) => { raiz.userData.foco = f; modelo?.traverse((o) => { if(o.isMesh) o.material.color.copy(o.material.userData.base).multiplyScalar(f ? 1.35 : 1); }); } };
    hit.userData.accion = () => elegir(k);
    cosas[k] = { raiz, modelo, hit, casa: raiz.position.clone(), casaQ: raiz.quaternion.clone() };
  }));
  /* la tierra de adentro: un disco con la textura real que sube al verter; el hoyo, otro más oscuro */
  const texTierra = new THREE.TextureLoader().load(aqui('medios/maceta/tierra.jpg'), (t) => { t.colorSpace = THREE.SRGBColorSpace; });
  const tierra = new THREE.Mesh(new THREE.CircleGeometry(.12, 32), new THREE.MeshBasicMaterial({ map: texTierra, side: THREE.DoubleSide }));
  tierra.rotation.x = -Math.PI / 2; tierra.visible = false;
  const hoyo = new THREE.Mesh(new THREE.CircleGeometry(.035, 24), new THREE.MeshBasicMaterial({ map: texTierra, color: 0x4a3a30, side: THREE.DoubleSide }));
  hoyo.rotation.x = -Math.PI / 2; hoyo.visible = false;
  /* el agua: gotas (puntos) que caen de la regadera; es un efecto, no un dibujo */
  const N_GOTAS = 60, gotasGeo = new THREE.BufferGeometry(); gotasGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N_GOTAS * 3), 3));
  const gotas = new THREE.Points(gotasGeo, new THREE.PointsMaterial({ color: 0x9fd8ff, size: .012, transparent: true, opacity: .85 })); gotas.visible = false; capa.add(gotas);
  let planta = null, anim = null, pasoEn = 0, tardoDicho = false;
  const ahora = () => performance.now() / 1000;
  function bocaMaceta(){ const r = cosas.maceta?.raiz; return r ? r.position.clone().add(new THREE.Vector3(0, ALTO.maceta * .86, 0)) : new THREE.Vector3(...LUGAR.maceta); }

  M.empezar = async () => {
    await M.armado;
    M.activo = true; M.listo = false; M.paso = 'tierra'; M.mano = null; M.errores = 0; pasoEn = ahora(); tardoDicho = false; capa.visible = true;
    for(const c of Object.values(cosas)){ c.raiz.position.copy(c.casa); c.raiz.quaternion.copy(c.casaQ); c.raiz.visible = true; }
    const r = cosas.maceta.raiz; r.add(tierra); r.add(hoyo); tierra.visible = hoyo.visible = false; tierra.scale.setScalar(.2); tierra.position.set(0, ALTO.maceta * .35, 0); hoyo.position.set(0, ALTO.maceta * .86 + .002, 0);
    if(planta){ planta.removeFromParent(); planta = null; }
    guiar();
  };
  M.parar = () => { M.activo = false; capa.visible = false; anim = null; gotas.visible = false; };
  /* la mariposa guía se posa sobre lo que toca usar ahora (guía de interacción, §10) */
  function guiar(){
    if(!eco) return;
    const k = M.mano ? 'maceta' : HERRAMIENTA[M.paso];
    if(!k || !cosas[k]){ eco.guiar(null); return; }
    const p = cosas[k].raiz.position.clone(); p.y += ALTO[k] + .06; eco.guiar(p);
  }
  function elegir(k){
    if(!M.activo || anim) return;
    if(k === 'maceta'){
      if(!M.mano){ decir('k-primero'); M.errores++; return; }
      usar(M.mano); return;
    }
    if(k !== HERRAMIENTA[M.paso]){ decir(M.errores++ % 2 ? 'k-otra' : 'k-primero'); return; }
    /* tomarla: se viene a tu mano (enfrente y abajo a la derecha de la vista) */
    M.mano = k; anim = { tipo: 'tomar', k, t0: ahora(), desde: cosas[k].raiz.position.clone() };
    guiar();
  }
  function usar(k){
    anim = { tipo: 'usar', k, t0: ahora(), desde: cosas[k].raiz.position.clone() };
  }
  function siguiente(){
    const i = PASOS.indexOf(M.paso); M.paso = PASOS[i + 1]; M.mano = null; pasoEn = ahora(); tardoDicho = false;
    const linea = { hoyo: 'k-hoyo', semilla: 'k-semilla', cubrir: 'k-cubrir', regar: 'k-regar', crece: 'k-crece' }[M.paso];
    if(linea) decir(linea);
    if(M.paso === 'crece'){ crecer(); return; }
    guiar();
  }
  function crecer(){
    eco?.guiar(null);
    const f = flor(); if(f){ planta = f; planta.position.copy(bocaMaceta()).sub(cosas.maceta.raiz.position); planta.position.y -= .01; planta.scale.setScalar(.01); cosas.maceta.raiz.add(planta); }
    anim = { tipo: 'crecer', t0: ahora() };
  }
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), ojo = new THREE.Vector3();
  const ease = (x) => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  M.cuadro = (t, manos = []) => {
    if(!M.activo) return;
    /* si tarda mucho en un paso, el narrador lo dice con humor (una vez por paso) */
    if(!anim && !tardoDicho && M.paso !== 'crece' && M.paso !== 'lista' && t - pasoEn > 35){ tardoDicho = true; decir('r-tarda-maceta'); }
    /* lo que llevas en la mano te sigue: abajo a la derecha de tu vista */
    if(M.mano && (!anim || anim.tipo === 'tomar')){
      V.cabeza.getWorldPosition(ojo); V.cabeza.getWorldQuaternion(q);
      tmp.set(.22, -.32, -.6).applyQuaternion(q).add(ojo); capa.worldToLocal(tmp);
      const r = cosas[M.mano].raiz;
      if(anim?.tipo === 'tomar'){ const k = ease(Math.min(1, (t - anim.t0) / .6)); r.position.lerpVectors(anim.desde, tmp, k); if(k >= 1) anim = null; }
      else r.position.lerp(tmp, .25);
      r.rotation.set(0, Math.sin(t * 1.3) * .08, 0);
    }
    if(anim?.tipo === 'usar'){
      const k = anim.k, r = cosas[k].raiz, s = t - anim.t0, boca = bocaMaceta();
      /* 1) llega arriba de la maceta, 2) hace lo suyo, 3) regresa a su lugar */
      const arriba = boca.clone().add(new THREE.Vector3(k === 'regadera' ? -.12 : 0, k === 'bolsa' ? .28 : .16, 0));
      if(s < .7){ r.position.lerpVectors(anim.desde, arriba, ease(s / .7)); }
      else if(s < 2.6){
        const f = (s - .7) / 1.9;
        r.position.copy(arriba);
        if(k === 'bolsa'){ r.rotation.set(0, 0, -Math.min(1.75, f * 3)); tierra.visible = true; tierra.scale.setScalar(.2 + .8 * f); tierra.position.y = ALTO.maceta * (.35 + .5 * f); }
        if(k === 'pala'){ r.rotation.set(Math.sin(f * Math.PI * 3) * .6 - .3, 0, 0); r.position.y = arriba.y - Math.abs(Math.sin(f * Math.PI * 3)) * .1;
          if(M.paso === 'hoyo'){ hoyo.visible = true; hoyo.scale.setScalar(Math.min(1, f * 1.3)); } else hoyo.scale.setScalar(Math.max(.01, 1 - f * 1.3)); }
        if(k === 'semillero'){ r.rotation.set(0, 0, -Math.min(.5, f)); }
        if(k === 'regadera'){ r.rotation.set(0, 0, -Math.min(.7, f * 2)); gotas.visible = true; regar(t, boca); }
      } else if(s < 3.3){ gotas.visible = false; r.rotation.set(0, 0, 0); r.position.lerpVectors(arriba, cosas[k].casa, ease((s - 2.6) / .7)); }
      else { r.position.copy(cosas[k].casa); r.quaternion.copy(cosas[k].casaQ); anim = null; if(M.paso === 'cubrir') hoyo.visible = false; siguiente(); }
    }
    if(anim?.tipo === 'crecer'){
      const s = t - anim.t0, k = Math.min(1, s / 5);
      if(planta) planta.scale.setScalar(Math.max(.01, ease(k)));
      if(k >= 1){ anim = null; M.paso = 'lista'; M.listo = true;
        const p = planta ? planta.getWorldPosition(new THREE.Vector3()) : bocaMaceta(); if(planta) capa.worldToLocal(p); p.y += .5; eco?.guiar(p);
        decir('k-lista'); alTerminar(); }
    }
    /* las herramientas también se mueven si las «empujas» con la palma (sólo de juego: no cambia el paso) */
  };
  function regar(t, boca){
    const a = gotasGeo.attributes.position;
    for(let i = 0; i < N_GOTAS; i++){ const f = ((t * 1.6 + i / N_GOTAS) % 1);
      a.setXYZ(i, boca.x - .06 + Math.sin(i * 7.1) * .02, boca.y + .14 - f * .16, boca.z + Math.cos(i * 3.3) * .02); }
    a.needsUpdate = true;
  }
  M.elegibles = () => (M.activo && !M.listo ? Object.entries(cosas).filter(([k, c]) => c.raiz.visible && k !== M.mano).map(([, c]) => c.hit) : []);
  M.capa = capa; M.cosas = cosas;
  return M;
}
