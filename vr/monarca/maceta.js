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
  /* SOBRE UNA MESA, AL ALCANCE (Carlos, 26 nov: «tu bolsa de tierra, tu sistema de plantado… nada de eso sirve»). Antes todo
     estaba en el PISO a 1.2-1.5 m: para apuntarle había que bajar la mano 45° y ahí la cámara del teléfono ya no la ve (en
     horizontal ve ±25°). Ahora una mesa enfrente, 40 cm abajo de tus ojos y a un brazo: la mano se ve y puede tocar */
  const MESA = -.40;
  /* en ARCO, todas a 66 cm de tus ojos: ninguna queda detrás de otra (la charola y la pala se escondían tras la maceta) */
  const arco = (g) => [.68 * Math.sin(g * Math.PI / 180), MESA, -.68 * Math.cos(g * Math.PI / 180)];
  const LUGAR = { bolsa: arco(-50), semillero: arco(-25), maceta: arco(0), pala: arco(25), regadera: arco(50) };
  /* TAMAÑO por su lado MÁS LARGO (la pala, acostada, escalada por su altura medía 71 cm y tapaba a sus vecinas) */
  const LARGO = { maceta: .22, bolsa: .24, semillero: .22, pala: .24, regadera: .28 };
  const ALTO = { maceta: .2, bolsa: .24, semillero: .05, pala: .06, regadera: .2 };   /* lo que se usa para «arriba de» (aprox.) */
  const ARCHIVO = { maceta: 'planter_pot_clay', bolsa: 'compost_bag_02', semillero: 'seeding_tray_01', pala: 'trowel_01', regadera: 'watering_can_metal_01' };
  const NOMBRE = { maceta: { es: 'Maceta', en: 'Pot' }, bolsa: { es: 'Tierra', en: 'Soil' }, semillero: { es: 'Semillas', en: 'Seeds' }, pala: { es: 'Pala', en: 'Trowel' }, regadera: { es: 'Regadera', en: 'Watering can' } };
  const cosas = {};
  /* la mesa (Poly Haven, CC0): su cubierta queda justo en MESA */
  cargar(aqui('medios/maceta/mesa.glb')).then((g) => { const m = g.scene, b = new THREE.Box3().setFromObject(m), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const esc = 1.05 / Math.max(t.x, t.z); m.scale.setScalar(esc); m.position.set(-c.x * esc, MESA - b.max.y * esc, -.56 - c.z * esc);
    m.traverse((o) => { if(o.isMesh){ const v = o.material; o.material = new THREE.MeshBasicMaterial({ map: v.map || null, color: v.map ? 0xffffff : v.color }); } }); capa.add(m); }).catch(() => {});
  /* la mano fantasma enseña a qué pellizcar si te quedas atorado */
  const maestro = null;   /* (27 nov, Carlos) la mano fantasma sólo en el tutorial; aquí guía la mariposa */
  /* cada cosa: el modelo + una caja invisible que es la que se elige (el motor sólo elige mallas, no grupos) */
  M.armado = Promise.all(Object.entries(ARCHIVO).map(async ([k, f]) => {
    const g = await cargar(aqui(`medios/maceta/${f}.glb`)).catch(() => null);
    const raiz = new THREE.Group(); raiz.position.set(...LUGAR[k]); capa.add(raiz);
    let modelo = null, caja = new THREE.Box3(new THREE.Vector3(-.15, 0, -.15), new THREE.Vector3(.15, .3, .15));
    if(g){ modelo = g.scene; const b = new THREE.Box3().setFromObject(modelo), tam = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const esc = LARGO[k] / Math.max(.001, tam.x, tam.y, tam.z); modelo.scale.setScalar(esc); modelo.position.set(-c.x * esc, -b.min.y * esc, -c.z * esc);
      modelo.traverse((o) => { if(o.isMesh){ const v = o.material; o.material = new THREE.MeshBasicMaterial({ map: v.map || null, color: v.map ? 0xffffff : v.color, side: THREE.DoubleSide, transparent: false }); o.material.userData.base = o.material.color.clone(); } });
      raiz.add(modelo);
      /* LA CAJA QUE SE ELIGE, EN EL ESPACIO DE LA COSA (26 nov, lo cazó la persona simulada): se medía en el mundo ANTES de que la
         escena supiera dónde va la cosa y luego se le restaba su lugar: quedaban al revés, detrás y arriba de ti, y apuntarle a
         la bolsa o a la pala nunca elegía nada. «Tu bolsa de tierra, tu sistema de plantado… nada de eso sirve» */
      raiz.updateMatrixWorld(true); caja = new THREE.Box3().setFromObject(modelo, true).applyMatrix4(raiz.matrixWorld.clone().invert()); }
    const t = caja.getSize(new THREE.Vector3()), cc = caja.getCenter(new THREE.Vector3());
    const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.12, t.x * 1.05), Math.max(.12, t.y * 1.1), Math.max(.12, t.z * 1.05)), new THREE.MeshBasicMaterial({ visible: false }));   /* justas: que no se encimen */
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
  M.parar = () => { M.activo = false; capa.visible = false; anim = null; gotas.visible = false; maestro?.ocultar(); };
  /* la mariposa guía se posa sobre lo que toca usar ahora (guía de interacción, §10) */
  function guiar(){
    if(!eco) return;
    const k = M.mano ? 'maceta' : HERRAMIENTA[M.paso];
    if(!k || !cosas[k]){ eco.guiar(null); return; }
    const p = cosas[k].raiz.position.clone(); p.y += ALTO[k] + .06; eco.guiar(p);
  }
  M.eventos = [];   /* lo que pasó (para la persona simulada y para entender qué hizo el alumno) */
  const ev = (x) => { M.eventos.push(`${(ahora() % 1000).toFixed(1)} ${x}`); if(M.eventos.length > 40) M.eventos.shift(); };
  function elegir(k){
    ev(`elegir ${k} (paso ${M.paso}, mano ${M.mano}, anim ${anim?.tipo || '-'})`);
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
    ev(`usar ${k}`);
    anim = { tipo: 'usar', k, t0: ahora(), desde: cosas[k].raiz.position.clone() };
  }
  function siguiente(){
    ev(`siguiente desde ${M.paso}`);
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
    /* si te atoras (6 s sin hacer nada), la mano fantasma te enseña a qué pellizcar */
    const sigue = M.mano ? 'maceta' : HERRAMIENTA[M.paso];
    if(maestro){ if(!anim && sigue && cosas[sigue] && t - pasoEn > 6 && M.paso !== 'crece' && M.paso !== 'lista'){ const p = cosas[sigue].raiz.position.clone(); p.y += ALTO[sigue] * .6; if(maestro.activo !== 'pellizcar' || maestro.objetivo.distanceTo(p) > .01) maestro.mostrar('pellizcar', p, { base: p.clone().add(new THREE.Vector3(.26, .02, .14)) }); maestro.cuadro(); }
      else if(maestro.activo) maestro.ocultar(); }
    /* lo que llevas EN TU MANO: va a tu mano de verdad (la palma que ve la cámara); si no se ve, abajo a la derecha */
    if(M.mano && (!anim || anim.tipo === 'tomar')){
      V.cabeza.getWorldPosition(ojo); V.cabeza.getWorldQuaternion(q);
      const palma = manos.find((h) => h.mundo?.palma)?.mundo.palma;
      if(palma) tmp.copy(palma).add(new THREE.Vector3(0, -.04, 0)); else tmp.set(.22, -.32, -.6).applyQuaternion(q).add(ojo);
      capa.worldToLocal(tmp);
      const r = cosas[M.mano].raiz;
      if(anim?.tipo === 'tomar'){ const k = ease(Math.min(1, (t - anim.t0) / .6)); r.position.lerpVectors(anim.desde, tmp, k); if(k >= 1) anim = null; }
      else { /* ESTABLE (27 nov): la palma que da la cámara tiembla un par de cm; lo que llevas no se mueve por menos de 1.2 cm y
                el resto lo sigue suave */
        const d = r.position.distanceTo(tmp); if(d > .012) r.position.lerp(tmp, d > .08 ? .3 : .14); }
      r.rotation.set(0, Math.sin(t * 1.3) * .08, 0);
      /* llevarla ENCIMA de la maceta la usa (como en la vida): a menos de 16 cm de la boca, por arriba */
      if(!anim){ const boca = bocaMaceta(); if(Math.hypot(r.position.x - boca.x, r.position.z - boca.z) < .16 && r.position.y > boca.y - .05) usar(M.mano); }
    }
    if(anim?.tipo === 'usar'){
      const k = anim.k, r = cosas[k].raiz, s = t - anim.t0, boca = bocaMaceta();
      /* 1) llega arriba de la maceta, 2) hace lo suyo, 3) regresa a su lugar */
      const arriba = boca.clone().add(new THREE.Vector3(k === 'regadera' ? -.1 : 0, k === 'bolsa' ? .2 : .12, 0));
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
  /* (27 nov, Carlos: «con sólo rozar otro elemento lo toma… y corta lo que estaba diciendo») con algo en la mano sólo se
     puede elegir la maceta (las demás herramientas ya no estorban al pasar), y cada una pide 450 ms apuntándole (espera) */
  M.elegibles = () => (M.activo && !M.listo ? Object.entries(cosas).filter(([k, c]) => c.raiz.visible && k !== M.mano && (!M.mano || k === 'maceta')).map(([, c]) => { c.hit.userData.espera = 450; return c.hit; }) : []);
  M.capa = capa; M.cosas = cosas;
  return M;
}
