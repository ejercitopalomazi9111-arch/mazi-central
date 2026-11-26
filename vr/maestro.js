/* EL MAESTRO DE GESTOS (Carlos, 26 nov: «pon muestras con gestos… como lo hacen los videojuegos… un modelo enfrente de ti
   hace el mismo movimiento y se ven sus manos tal cual como las tuyas»). De 5-6 personas que probaron el visor, ninguna
   supo qué hacer con las manos: la voz decía «pellizca» y nadie sabía qué era eso en VR.
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Una mano FANTASMA (el mismo modelo 3D que la tuya, blanca y translúcida) hace el gesto enfrente de ti, en bucle, hasta que
   lo haces tú:
     levantar   la mano sube a la vista, abierta, y saluda (para que la cámara te vea la mano)
     apuntar    apunta con el índice al botón; una línea punteada sale del dedo y el botón se ilumina
     pellizcar  apunta y junta índice y pulgar (clic), con un destello en el botón al cerrar
     palma      la mano abierta, quieta, palma arriba (para que se te pose una mariposa)
   Las poses son las mismas 21 marcas que daría MediaPipe (esqueleto-mano.js) puestas en el modelo con mano3d.js. */
import { prepararReposo, pose, NOMBRES } from './mano3d.js';
import { esqueleto, enElMundo } from './esqueleto-mano.js';
export async function crearMaestro(V, padre){
  const { THREE } = V;
  const { GLTFLoader } = await import('./vendor/loaders/GLTFLoader.js');
  const { clone } = await import('./vendor/utils/SkeletonUtils.js');
  const gl = await new Promise((ok, no) => new GLTFLoader().load(new URL('./modelos/manos/derecha.glb', import.meta.url).href, ok, undefined, no));
  const h0 = {}; gl.scene.traverse((o) => { if(o.isBone || NOMBRES.includes(o.name)) h0[o.name] = o; });
  const rep = prepararReposo(THREE, Object.fromEntries(NOMBRES.map((n) => [n, { position: h0[n].position.clone(), quaternion: h0[n].quaternion.clone() }])));
  const raiz = clone(gl.scene), huesos = {}; let malla = null;
  raiz.traverse((o) => { if(NOMBRES.includes(o.name)) huesos[o.name] = o; if(o.isSkinnedMesh){ malla = o; o.frustumCulled = false; o.renderOrder = 30; } });
  if(malla) malla.material = new THREE.MeshStandardMaterial({ color: '#F4EEF2', emissive: '#6E5A86', emissiveIntensity: .7, roughness: .5, transparent: true, opacity: .72, depthWrite: false });
  const M = { grupo: new THREE.Group(), activo: null, desde: 0, objetivo: new THREE.Vector3(), base: new THREE.Vector3(.16, -.22, -.55) };
  M.grupo.add(raiz); M.grupo.visible = false; padre.add(M.grupo);
  /* la línea del dedo al botón (puntos, para que se lea como «apuntar») y el destello del clic */
  const nP = 18, lineaGeo = new THREE.BufferGeometry(); lineaGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nP * 3), 3));
  const linea = new THREE.Points(lineaGeo, new THREE.PointsMaterial({ color: 0xF4EEF2, size: .02, transparent: true, opacity: .8, depthTest: false })); linea.renderOrder = 31; M.grupo.add(linea);
  const destello = new THREE.Mesh(new THREE.RingGeometry(.05, .07, 40), new THREE.MeshBasicMaterial({ color: 0xC77DFF, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide })); destello.renderOrder = 32; M.grupo.add(destello);
  const tmp = new THREE.Vector3();
  function ponerMano(P){
    const ps = pose(THREE, P, rep);
    for(const n of NOMBRES){ const b = huesos[n], x = ps.huesos[n]; b.position.copy(x.p); b.quaternion.copy(x.q); b.scale.setScalar(ps.escala); }
  }
  /* guion: 'levantar' | 'apuntar' | 'pellizcar' | 'palma'; objetivo: Vector3 en el espacio de `padre` (el botón) */
  /* una o dos palabras abajo de la mano (Carlos, 14 nov: «si algo se entiende con 1 o 2 palabras no es necesario usar más») */
  const letrero = new V.Panel(.5, .1, 600); letrero.malla.material.depthTest = false; letrero.malla.renderOrder = 33; M.grupo.add(letrero.malla);
  const PALABRAS = { levantar: 'Levanta la mano', apuntar: 'Apunta', pellizcar: 'Pellizca', palma: 'Palma arriba' };
  function decirLetrero(t){ const { x, cv } = letrero, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h); x.font = '800 44px system-ui, -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const tw = Math.min(w - 8, x.measureText(t).width + 50); V.redondo(x, (w - tw) / 2, 4, tw, h - 8, (h - 8) / 2); x.fillStyle = 'rgba(23,10,38,.88)'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#C77DFF'; x.stroke();
    x.fillStyle = '#F4EEF2'; x.fillText(t, w / 2, h / 2 + 2); letrero.listo(); }
  M.mostrar = (guion, objetivo = null, { base = null } = {}) => {
    if(M.activo !== guion) decirLetrero(PALABRAS[guion] || '');
    M.activo = guion; M.desde = performance.now() / 1000; M.grupo.visible = true;
    if(objetivo) M.objetivo.copy(objetivo);
    /* apuntar y pellizcar se enseñan AL LADO del botón y de perfil: de espaldas no se ve que el índice y el pulgar se juntan */
    if(base) M.base.copy(base); else if(objetivo && (guion === 'apuntar' || guion === 'pellizcar')) M.base.copy(objetivo).add(new THREE.Vector3(.5, -.06, .1)); else M.base.set(.16, -.22, -.55);
  };
  M.ocultar = () => { M.activo = null; M.grupo.visible = false; };
  M.cuadro = () => {
    if(!M.activo) return;
    const t = performance.now() / 1000 - M.desde, Lp = M.activo === 'apuntar' || M.activo === 'pellizcar' ? .12 : .085;   /* más grande junto al botón (está más lejos)*/
    let poseN = 'abierta', punta = M.base.clone(), hacia = punta.clone().add(new THREE.Vector3(0, 0, -1)), palma = 'frente', k = 0;
    if(M.activo === 'levantar'){
      /* sube desde abajo en 0.8 s y saluda */
      const s = Math.min(1, t / .8), e = s * s * (3 - 2 * s);
      punta = M.base.clone().add(new THREE.Vector3(Math.sin(t * 4) * .03 * e, -.25 * (1 - e) + .05, 0)); hacia = punta.clone().add(new THREE.Vector3(Math.sin(t * 4) * .3, 1, -.2));
      palma = 'frente';
    } else if(M.activo === 'palma'){
      punta = M.base.clone().add(new THREE.Vector3(0, .02, -.05)); hacia = punta.clone().add(new THREE.Vector3(0, 0, -1)); palma = 'arriba';
    } else {
      /* apuntar / pellizcar: el dedo se acerca a la línea hacia el botón y apunta */
      const dir = M.objetivo.clone().sub(M.base).normalize();
      const s = Math.min(1, t / .7), e = s * s * (3 - 2 * s);
      punta = M.base.clone().addScaledVector(dir, .12 * e); hacia = M.objetivo.clone(); poseN = 'apunta'; palma = 'abajo';
      if(M.activo === 'pellizcar' && t > 1){ const c = (t - 1) % 1.4; k = c < .35 ? c / .35 : c < .7 ? 1 : c < 1.05 ? 1 - (c - .7) / .35 : 0; poseN = k > .5 ? 'pellizco' : 'apunta';
        if(c > .3 && c < .45){ destello.position.copy(M.objetivo); destello.lookAt(V.cabeza.getWorldPosition(tmp)); } }
    }
    const P = enElMundo(THREE, esqueleto(poseN, Lp), { punta, hacia, palma, mano: 'der' });
    ponerMano(P);
    letrero.malla.position.copy(P[0]).add(new THREE.Vector3(0, -.12, 0)); letrero.malla.lookAt(V.cabeza.getWorldPosition(tmp));
    /* la línea punteada del dedo al botón, y el destello al cerrar */
    const conLinea = M.activo === 'apuntar' || M.activo === 'pellizcar'; linea.visible = conLinea;
    if(conLinea){ const a = P[8], A = lineaGeo.attributes.position; for(let i = 0; i < nP; i++){ tmp.lerpVectors(a, M.objetivo, (i + ((t * 2) % 1)) / nP); A.setXYZ(i, tmp.x, tmp.y, tmp.z); } A.needsUpdate = true; }
    const c = M.activo === 'pellizcar' && t > 1 ? (t - 1) % 1.4 : -1;
    destello.material.opacity = c > .3 && c < .9 ? Math.max(0, 1 - (c - .3) / .6) : 0; destello.scale.setScalar(1 + Math.max(0, c - .3) * 1.5);
  };
  return M;
}
