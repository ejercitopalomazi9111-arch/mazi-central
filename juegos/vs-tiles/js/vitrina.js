/* LA VITRINA DEL MERCADO: las tres máquinas en 3D con modelos de verdad (Carlos, 30 oct: «cambia todo lo de la
   tienda por modelos reales la garra los sobres etc y hazlo más estético»). Todos de Sketchfab, CC BY (CREDITOS.md):
   la máquina de garra «Star Catcher», cuatro peluches, el sobre animado y la ruleta. La luz es de estudio: el HDRI
   neon_photostudio de Poly Haven (CC0) da los reflejos, una llave proyecta sombra suave y dos contraluces de color.
   Aquí sólo se PINTA y se MUEVE: el premio se decide al pagar (app.js · sortear), la máquina sólo lo enseña. */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';

const cargador = new GLTFLoader(), cache = {};
const cargar = (n) => cache[n] ||= cargador.loadAsync(`modelos/mercado/${n}.glb`);
const PELUCHES = ['estrella', 'pato', 'pinguino', 'conejo'];
/* la ruleta: 16 gajos con el color de cada rareza (cuántos de cada una es sólo cómo se ve: lo que sale ya se decidió) */
export const GAJOS = ['c', 'r', 'c', 'e', 'c', 'r', 'l', 'c', 'r', 'e', 'c', 'm', 'c', 'r', 'e', 'l'];

export function crearVitrina(cv, { COL, NOMBRE, activo = () => true }){
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .05, 60);
  /* el estudio: reflejos del HDRI, llave con sombra, contraluces magenta y cian (los del juego) */
  new THREE.TextureLoader().load('modelos/mercado/estudio.jpg', (t) => { t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(r); s.environment = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose(); });
  s.environmentIntensity = .85;
  const llave = new THREE.DirectionalLight('#FFF1E4', 2.3); llave.position.set(2.5, 5, 6); llave.castShadow = true;
  Object.assign(llave.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: .5, far: 20 }); llave.shadow.mapSize.set(1024, 1024); llave.shadow.bias = -.0005; llave.shadow.radius = 4; s.add(llave);
  const c1 = new THREE.PointLight('#FF3D8B', 14, 9, 1.6), c2 = new THREE.PointLight('#38E1FF', 14, 9, 1.6); c1.position.set(-3, 2.6, -1.5); c2.position.set(3, 2.6, -1.5); s.add(c1, c2);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .45 })); piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; s.add(piso);

  const raiz = new THREE.Group(); s.add(raiz);
  let actual = null, vivo = true, ultimo = performance.now();
  const tamano = () => { const w = cv.clientWidth || 340, h = cv.clientHeight || 380; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(tamano); ro.observe(cv); tamano();
  (function cuadro(){ if(!vivo) return; requestAnimationFrame(cuadro); if(!cv.isConnected || !activo()){ ultimo = performance.now(); return; }
    const ahora = performance.now(), dt = Math.min(.05, (ahora - ultimo) / 1000); ultimo = ahora;
    actual?.paso(dt, ahora / 1000); r.render(s, cam); })();

  /* encuadrar: que la caja pedida (en el mundo) quepa entera, viéndola de frente desde un poco arriba */
  function encuadrar(caja, alzado = .12){ const c = caja.getCenter(new THREE.Vector3()), t = caja.getSize(new THREE.Vector3());
    const fv = cam.fov * Math.PI / 360, fh = Math.atan(Math.tan(fv) * cam.aspect), d = Math.max(t.y / 2 / Math.tan(fv), t.x / 2 / Math.tan(fh)) * 1.04 + t.z / 2;
    cam.position.set(c.x, c.y + d * alzado, c.z + d); cam.lookAt(c); }
  const sombras = (o) => o.traverse(m => { if(m.isMesh){ m.castShadow = true; m.receiveShadow = true; } });
  let pedido = 0;   /* si se cambia de máquina mientras otra carga, la que llegó tarde no se pinta */
  function vaciar(){ actual?.salir?.(); raiz.clear(); actual = null; return ++pedido; }
  /* un modelo a la medida: alto pedido, centrado en x/z, apoyado en y = 0 */
  function aMedida(o, alto){ o.removeFromParent(); o.position.set(0, 0, 0); o.updateMatrixWorld(true);   /* los modelos se reusan: se miden desde cero cada vez */ const b = new THREE.Box3().setFromObject(o, true), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = alto / Math.max(1e-6, t.y);
    const g = new THREE.Group(); o.position.sub(new THREE.Vector3(c.x, b.min.y, c.z)); g.add(o); const e = new THREE.Group(); e.add(g); g.scale.setScalar(k); return e; }
  /* de un toque en pantalla a un punto del plano z = zMundo */
  const rayo = new THREE.Raycaster(), plano = new THREE.Plane(), v2 = new THREE.Vector2(), v3 = new THREE.Vector3();
  function enPlano(e, zMundo){ const b = cv.getBoundingClientRect(); v2.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
    rayo.setFromCamera(v2, cam); plano.set(new THREE.Vector3(0, 0, 1), -zMundo); return rayo.ray.intersectPlane(plano, v3) ? v3.clone() : null; }

  /* ═══ GARRA ═══ medidas en las unidades del modelo (cm): el vidrio va de x −88 a 88; la salida es la esquina de
     enfrente a la izquierda (x −86 a −24); el gancho cuelga de su carro en x 18, z 8, con la punta en y 85 */
  const G = { Z: 52, PISO: 30, XMIN: -10, XMAX: 78, SAL: -56, R: 15, ARRIBA: 106 };
  async function garra({ alPremio, leyenda, tick }){
    const mio = vaciar(); const gl = await cargar('garra');
    if(!gl.userData.armada){ const m = gl.scene; m.updateMatrixWorld(true); const N = (p) => { let x = null; m.traverse(o => { if(!x && o.name.startsWith(p)) x = o; }); return x; };
      /* el carro (la caja de arriba) corre por los rieles; de él cuelgan el tubo, la cabeza y las pinzas */
      const carro = new THREE.Group(); m.add(carro); carro.attach(N('clawbox_low'));
      const tubo = new THREE.Group(); tubo.position.set(18.5, 133, 8.8); carro.add(tubo); tubo.attach(N('pipes_low'));
      const cabeza = new THREE.Group(); cabeza.position.set(18, G.ARRIBA, 8); carro.add(cabeza); cabeza.attach(N('ufo_low_')); cabeza.attach(N('ufo1_low'));
      const pinza = new THREE.Group(); pinza.position.set(0, -10, 0); cabeza.add(pinza); pinza.attach(N('claw_low'));
      /* el vidrio: transparente y con reflejo, para que se vea lo de adentro */
      m.traverse(o => { if(o.isMesh && /glass/.test(o.material.name)){ o.material = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .12, roughness: .04, metalness: 0, envMapIntensity: 1.4, depthWrite: false }); o.castShadow = false; o.renderOrder = 2; } });
      sombras(m); m.traverse(o => { if(o.isMesh && /glass/.test(o.material.name || '')) o.castShadow = false; });
      gl.userData = { armada: true, carro, tubo, cabeza, pinza };
      gl.userData.peluches = await Promise.all(PELUCHES.map(n => cargar('peluche-' + n))); }
    if(mio !== pedido) return null;
    const { carro, tubo, cabeza, pinza, peluches } = gl.userData, maq = gl.scene;
    const k = .01, caja = new THREE.Group(); caja.add(maq); maq.scale.setScalar(k); maq.position.set(0, .853, 0); raiz.add(caja);   /* .853: la base de la máquina, en el piso */
    const zMundo = G.Z * k;
    /* los peluches: un círculo de radio R cada uno, en el plano z = G.Z, apilados sobre el montón */
    const premios = []; const nuevo = (x, y) => { const tipo = premios.length % PELUCHES.length, o = aMedida(peluches[tipo].scene.clone(true), G.R * 1.9);
      o.rotation.y = (Math.random() - .5) * .7 + (PELUCHES[tipo] === 'conejo' ? -Math.PI / 2 : 0); sombras(o); maq.add(o);
      const p = { o, x, y, vx: 0, vy: 0, z: G.Z + (Math.random() - .5) * 14, giro: 0 }; premios.push(p); return p; };
    for(let i = 0; i < 9; i++) nuevo(G.XMIN + G.R + Math.random() * (G.XMAX - G.XMIN - 2 * G.R), G.PISO + G.R + i * 9);
    encuadrar(new THREE.Box3(new THREE.Vector3(-1.05, .55, .95), new THREE.Vector3(1.05, 2.65, 1)), .06);
    const E = { gx: 18, objetivo: 30, baja: 0, abre: 1, fase: 'libre', carga: null, flecha: 0, resbala: null, pagado: false, cae: null };
    cv.onpointerdown = cv.onpointermove = (e) => { if(E.fase !== 'libre' || (e.type === 'pointermove' && !e.buttons && e.pointerType === 'mouse')) return;
      const p = enPlano(e, zMundo); if(p) E.objetivo = Math.max(G.SAL, Math.min(G.XMAX, p.x / k)); };
    const punta = () => G.ARRIBA - 21 - E.baja;   /* la punta de las pinzas */
    actual = {
      E, premios, salir(){ cv.onpointerdown = cv.onpointermove = null; premios.forEach(p => maq.remove(p.o)); },
      mover(d){ E.flecha = d; },
      bajar(){ if(E.fase !== 'libre') return false; E.fase = 'baja'; tick?.(.25); leyenda('Bajando…'); return true; },
      paso(dt, t){ const f = dt * 60;
        /* la física de los peluches: gravedad, paredes y choques entre ellos */
        for(const p of premios){ if(p === E.carga || p === E.cae) continue; p.vy -= .35 * f; p.x += p.vx * f; p.y += p.vy * f; p.vx *= .96;
          if(p.y < G.PISO + G.R){ p.y = G.PISO + G.R; p.vy *= -.25; p.vx *= .8; } if(p.x < G.XMIN + G.R){ p.x = G.XMIN + G.R; p.vx *= -.4; } if(p.x > G.XMAX){ p.x = G.XMAX; p.vx *= -.4; } }
        for(let i = 0; i < premios.length; i++) for(let j = i + 1; j < premios.length; j++){ const a = premios[i], b = premios[j]; if([a, b].some(q => q === E.carga || q === E.cae)) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = 2 * G.R * .92; if(d < m && d > .01){ const q = (m - d) / 2 / d; a.x -= dx * q; a.y -= dy * q; b.x += dx * q; b.y += dy * q; } }
        /* el gancho */
        if(E.fase === 'libre'){ E.objetivo = Math.max(G.SAL, Math.min(G.XMAX, E.objetivo + E.flecha * 2.4 * f)); E.gx += (E.objetivo - E.gx) * Math.min(1, .12 * f); }
        if(E.fase === 'baja'){ E.baja += 1.6 * f; const toca = premios.find(p => p !== E.cae && Math.abs(p.x - E.gx) < G.R * 1.1 && punta() < p.y + G.R * .7);
          if(toca || punta() < G.PISO + 4){ E.fase = 'cierra'; } }
        if(E.fase === 'cierra'){ E.abre = Math.max(0, E.abre - .05 * f); if(E.abre === 0){
            const cerca = premios.filter(p => p !== E.cae && Math.abs(p.x - E.gx) < G.R * 1.2 && Math.abs(p.y - punta()) < G.R * 1.7).sort((a, b) => Math.abs(a.x - E.gx) - Math.abs(b.x - E.gx))[0];
            /* agarrado de orilla: a veces se resbala a medio camino (el drama de las máquinas de verdad) */
            E.carga = cerca || null; E.resbala = cerca && Math.abs(cerca.x - E.gx) > G.R * .6 && Math.random() < .35 ? E.baja * (.3 + Math.random() * .5) : null; E.fase = 'sube'; tick?.(.3); } }
        if(E.fase === 'sube'){ E.baja = Math.max(0, E.baja - 1.4 * f);
          if(E.carga && E.resbala !== null && E.baja < E.resbala){ E.carga.vy = 1; E.carga.vx = (Math.random() - .5) * 3; E.carga = null; E.resbala = null; leyenda('¡Se resbaló!'); }
          if(E.baja === 0){ E.fase = E.carga ? 'lleva' : 'falla'; if(E.carga) leyenda('¡Lo agarraste! Va a la salida…'); } }
        if(E.fase === 'falla'){ E.abre = Math.min(1, E.abre + .04 * f); if(E.abre === 1){ E.fase = 'libre'; leyenda('¡Se te fue! Este intento sigue pagado: baja otra vez.'); } }
        if(E.fase === 'lleva'){ E.gx += (G.SAL - E.gx) * Math.min(1, .06 * f); if(Math.abs(E.gx - G.SAL) < 1.5) E.fase = 'suelta'; }
        if(E.fase === 'suelta'){ E.abre = Math.min(1, E.abre + .05 * f); if(E.abre > .6 && E.carga){ E.cae = E.carga; E.carga = null; E.cae.vy = 0; }
          if(E.cae){ E.cae.vy -= .5 * f; E.cae.y += E.cae.vy * f; E.cae.z += (110 - E.cae.z) * .08 * f;
            if(E.cae.y < -40){ maq.remove(E.cae.o); premios.splice(premios.indexOf(E.cae), 1); E.cae = null; E.fase = 'premio'; alPremio(); } } }
        if(E.carga){ E.carga.x = E.gx; E.carga.y = punta() - G.R * .55; E.carga.giro += .02 * f; }
        /* pintar: el carro, el tubo que se estira, la cabeza que baja y las pinzas que abren */
        carro.position.set(E.gx - 18, 0, G.Z - 8); cabeza.position.y = G.ARRIBA - E.baja; tubo.scale.y = (31 + E.baja) / 31;
        const ab = .78 + .42 * E.abre; pinza.scale.set(ab, 1, ab); cabeza.rotation.y = Math.sin(t * 1.3) * .05;
        for(const p of premios){ p.o.position.set(p.x, p.y - G.R, p.z); p.o.rotation.z = p === E.carga ? Math.sin(t * 6) * .12 : -p.vx * .05; } },
      /* después del premio: vuelve a quedar libre y, si quedan pocos, caen peluches nuevos desde arriba */
      reiniciar(){ E.fase = 'libre'; E.abre = 1; if(premios.length < 7) for(let i = 0; i < 5; i++) nuevo(G.XMIN + G.R + Math.random() * (G.XMAX - G.XMIN - 2 * G.R), 120 + i * 18); }
    };
    return actual; }

  /* ═══ SOBRE ═══ el sobre del autor con nuestra cara: morado con vino y el logo del juego */
  function caraSobre(){ const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#2A0F44'); g.addColorStop(.55, '#170A26'); g.addColorStop(1, '#7E1735'); x.fillStyle = g; x.fillRect(0, 0, 256, 512);
    x.save(); x.globalAlpha = .16; x.strokeStyle = '#AC27FF'; x.lineWidth = 26; for(let i = -12; i < 12; i++){ x.beginPath(); x.moveTo(i * 60, 0); x.lineTo(i * 60 + 512, 512); x.stroke(); } x.restore();
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.font = '900 104px Orbitron, Avenir Next, sans-serif'; x.shadowColor = '#FF3D8B'; x.shadowBlur = 18; x.fillText('VS', 128, 230);
    x.font = '800 44px Orbitron, Avenir Next, sans-serif'; x.shadowColor = '#38E1FF'; x.fillText('TILES', 128, 282); x.shadowBlur = 0;
    x.fillStyle = '#C77DFF'; x.font = '800 15px Avenir Next, system-ui, sans-serif'; x.fillText('ECOS DEL CORO', 128, 340); x.fillStyle = '#FFE08A'; x.fillText('5 CARTAS', 128, 362);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; return t; }
  async function sobre({ alAbrir }){
    const mio = vaciar(); const gl = await cargar('sobre'), m = gl.scene; if(mio !== pedido) return null;
    if(!gl.userData.armado){ const cara = caraSobre(); m.traverse(o => { if(!o.isMesh) return; const mt = o.material;
        if(mt.name === 'Material'){ o.visible = false; return; }   /* las letras «BASIC» y «booster» del autor */
        if(mt.name === 'Material.001' || mt.name === 'logo'){ o.material = mt.clone(); o.material.map = mt.name === 'logo' ? null : cara; if(mt.name === 'logo') o.material.color.set('#B44BFF'); o.material.roughness = .35; o.material.metalness = .25; } });
      sombras(m); gl.userData.armado = true; }
    const e = aMedida(m, 1.5); e.rotation.y = Math.PI / 2; raiz.add(e); e.position.y = .15;
    const mez = new THREE.AnimationMixer(m), A = Object.fromEntries(gl.animations.map(a => [a.name, a]));
    const una = (n) => { const a = mez.clipAction(A[n]); a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play(); return a; };
    mez.stopAllAction(); mez.setTime(0);
    encuadrar(new THREE.Box3(new THREE.Vector3(-.75, -.05, -.2), new THREE.Vector3(.75, 1.85, .2)), .05);
    let listo = false, abierto = false, recorrido = 0, x0 = null, toques = 0, sacude = 0;
    const abre = () => { if(abierto) return; abierto = true; una('Open'); setTimeout(() => { una('shake'); }, 900); setTimeout(alAbrir, 1900); };
    cv.onpointerdown = (ev) => { if(!listo) return; x0 = ev.clientX; try{ cv.setPointerCapture(ev.pointerId); }catch(err){} };
    cv.onpointermove = (ev) => { if(!listo || x0 === null) return; recorrido += Math.abs(ev.clientX - x0); x0 = ev.clientX; sacude = 1; if(recorrido > cv.clientWidth * .7) abre(); };
    cv.onpointerup = () => { x0 = null; if(listo && ++toques >= 3) abre(); };
    actual = { salir(){ cv.onpointerdown = cv.onpointermove = cv.onpointerup = null; mez.stopAllAction(); },
      preparar(){ listo = true; abierto = false; recorrido = 0; toques = 0; mez.stopAllAction(); mez.setTime(0); },
      paso(dt, t){ mez.update(dt); sacude = Math.max(0, sacude - dt * 3);
        e.rotation.y = Math.PI / 2 + Math.sin(t * .8) * (listo && !abierto ? .08 : .25) + (Math.random() - .5) * .05 * sacude; e.position.y = .15 + Math.sin(t * 1.6) * .025; } };
    return actual; }

  /* ═══ RULETA ═══ la rueda de la fortuna del autor, con nuestro disco encima (los colores de las rarezas) */
  function discoRuleta(){ const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'), n = GAJOS.length, R = 512;
    GAJOS.forEach((k, i) => { const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      const g = x.createRadialGradient(R, R, 60, R, R, R); g.addColorStop(0, '#120720'); g.addColorStop(.35, COL[k]); g.addColorStop(1, COL[k]);
      x.fillStyle = g; x.beginPath(); x.moveTo(R, R); x.arc(R, R, R - 4, a0, a1); x.closePath(); x.fill();
      x.strokeStyle = '#FFFFFFcc'; x.lineWidth = 6; x.stroke();
      x.save(); x.translate(R, R); x.rotate((a0 + a1) / 2); x.fillStyle = k === 'c' ? '#1B0D2B' : '#FFFFFF'; x.font = '900 46px Orbitron, Avenir Next, sans-serif'; x.textAlign = 'right'; x.textBaseline = 'middle';
      x.shadowColor = '#0008'; x.shadowBlur = 6; x.fillText(NOMBRE[k][0], R - 40, 0); x.restore(); });
    x.fillStyle = '#170A26'; x.beginPath(); x.arc(R, R, 120, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#AC27FF'; x.lineWidth = 14; x.stroke();
    x.fillStyle = '#FFFFFF'; x.font = '900 70px Orbitron, Avenir Next, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('VS', R, R);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function letreroRuleta(){ const c = document.createElement('canvas'); c.width = 1024; c.height = 260; const x = c.getContext('2d');
    /* tapa el letrero del autor: madera oscura con orilla morada y el nombre en dorado */
    x.fillStyle = '#2A120C'; x.strokeStyle = '#AC27FF'; x.lineWidth = 16; x.beginPath(); x.roundRect(8, 8, 1008, 244, 60); x.fill(); x.stroke();
    x.fillStyle = '#FFE08A'; x.font = '900 112px Orbitron, Avenir Next, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#FF3D8B'; x.shadowBlur = 20; x.fillText('RULETA', 512, 134);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  async function rueda({ tick }){
    const mio = vaciar(); const gl = await cargar('rueda'), m = gl.scene; if(mio !== pedido) return null;
    if(!gl.userData.armada){ m.updateMatrixWorld(true); let cara = null; m.traverse(o => { if(o.isMesh && o.name === 'Object_5') cara = o; });
      /* el disco gira sobre su centro (x 0, y 4, en la cara del frente) */
      const eje = new THREE.Group(); eje.position.set(0, 4, -11.85); m.add(eje); eje.attach(cara);
      const disco = new THREE.Mesh(new THREE.CircleGeometry(2.56, 96), new THREE.MeshStandardMaterial({ map: discoRuleta(), roughness: .35, metalness: .1 }));
      disco.position.z = .37; eje.add(disco);
      const cartel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.05), new THREE.MeshBasicMaterial({ map: letreroRuleta(), transparent: true })); cartel.position.set(0, 7.6, -10.95); m.add(cartel);
      sombras(m); gl.userData = { armada: true, eje }; }
    const { eje } = gl.userData; const e = aMedida(m, 1.9); raiz.add(e);
    encuadrar(new THREE.Box3(new THREE.Vector3(-.72, -.05, -.2), new THREE.Vector3(.72, 1.95, .2)), .04);
    let gira = null, ultimoGajo = 0;
    actual = { salir(){},
      /* girar hasta que un gajo de esa rareza quede bajo la flecha de arriba */
      girar(raro, ms = 4200){ const n = GAJOS.length, cuales = GAJOS.map((k, i) => k === raro ? i : -1).filter(i => i >= 0), i = cuales[Math.floor(Math.random() * cuales.length)];
        const paso = 2 * Math.PI / n, dentro = (Math.random() - .5) * paso * .6, actualA = eje.rotation.z, base = actualA - (actualA % (2 * Math.PI));
        const fin = base + 2 * Math.PI * 5 + (i + .5) * paso + dentro; gira = { a0: actualA, a1: fin, t0: performance.now(), ms }; ultimoGajo = Math.floor(actualA / paso);
        return new Promise(res => { gira.res = res; }); },
      paso(dt, t){ if(!gira) return; const u = Math.min(1, (performance.now() - gira.t0) / gira.ms), ec = 1 - Math.pow(1 - u, 3.4);
        eje.rotation.z = gira.a0 + (gira.a1 - gira.a0) * ec; const g = Math.floor(eje.rotation.z / (2 * Math.PI / GAJOS.length)); if(g !== ultimoGajo){ ultimoGajo = g; tick?.(.12); }
        if(u >= 1){ const res = gira.res; gira = null; res(); } } };
    return actual; }

  return { garra, sobre, rueda, get actual(){ return actual; }, apagar(){ vivo = false; ro.disconnect(); vaciar(); r.dispose(); } };
}
