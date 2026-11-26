/* ARCORE EN MAZI VR (Carlos, 25-26 nov: «investiga y utiliza exactamente el mismo sistema que utiliza Pokémon Go» y
   «pónselo ya de predefinido… yo veré si funciona»). ENGINEERING_LOG 014: Pokémon GO no rastrea solo, le pide la pose
   6DoF al SISTEMA (ARCore en Android, ARKit en iPhone). Una página web llega a ARCore por WebXR («immersive-ar», Chrome
   de Android); al iPhone no (Safari no trae WebXR): ahí sigue el modo de siempre.
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Qué se toma de la sesión y qué se queda nuestro:
     · de ARCore: DÓNDE está y hacia dónde ve el teléfono (6DoF de verdad, con la calibración de fábrica del modelo) y,
       si el teléfono lo permite («camera-access»), la imagen de la cámara de ese mismo cuadro;
     · nuestro: los DOS OJOS del visor de cartón (el lente, la separación, el campo de Ajustes). ARCore pinta una sola
       vista de mano; nosotros pintamos los dos ojos encima, opacos, así que la imagen de ARCore de atrás no se ve.
     · la cámara de ARCore sirve para la realidad mixta (la pared del fondo) y, en chiquito, para las manos (MediaPipe).
   Si algo falla al abrir, regresa `false` y el visor entra como siempre (giroscopio y la cámara de getUserMedia). */
export async function arPosible(){
  try{ return !!(navigator.xr && window.isSecureContext && await navigator.xr.isSessionSupported('immersive-ar')); }catch{ return false; }
}
/* Se llama DENTRO del toque de «Entrar» (la sesión sólo se abre con un gesto) y antes de cualquier otra espera */
export function iniciarAR(V){
  const { THREE, render, ar } = V;
  const gl = render.getContext();
  let sesion = null;
  /* requestSession va primero, en el mismo instante del toque; lo demás después */
  const pedido = navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local'],
    optionalFeatures: ['local-floor', 'camera-access', 'dom-overlay'],
    domOverlay: { root: document.body },
  });
  return pedido.then(async (s) => {
    sesion = s;
    await gl.makeXRCompatible();
    const capa = new XRWebGLLayer(s, gl, { antialias: false, alpha: false, depth: true });
    s.updateRenderState({ baseLayer: capa, depthNear: .05, depthFar: 300 });
    let ref; try{ ref = await s.requestReferenceSpace('local-floor'); ar.piso = true; }catch{ ref = await s.requestReferenceSpace('local'); ar.piso = false; }
    const conCamara = !!s.enabledFeatures?.includes?.('camera-access');
    const binding = conCamara && typeof XRWebGLBinding !== 'undefined' ? new XRWebGLBinding(s, gl) : null;
    /* el destino de todo lo que pintamos: el búfer de la sesión, del tamaño que ella diga */
    const rt = new THREE.WebGLRenderTarget(capa.framebufferWidth, capa.framebufferHeight, { depthBuffer: false });
    render.setRenderTargetFramebuffer(rt, capa.framebuffer);
    ar.rt = rt; ar.sesion = s; ar.activo = true; ar.conCamara = !!binding; ar.origen = null;
    /* el lienzo de la página no se ve en la sesión (lo de encima, la web y los avisos, sí: dom-overlay) */
    render.domElement.style.visibility = 'hidden'; document.documentElement.classList.add('en-ar');
    /* la imagen de la cámara: una textura externa (la de ARCore, válida sólo dentro del cuadro) */
    const tex = new THREE.ExternalTexture(); tex.colorSpace = THREE.SRGBColorSpace; ar.tex = tex;
    /* para las manos: la cámara en chiquito (320 px) a un lienzo, cada 2 cuadros */
    const chico = new THREE.WebGLRenderTarget(320, 240, { depthBuffer: false }), escenaChica = new THREE.Scene(), camChica = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    escenaChica.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
    const lienzo = document.createElement('canvas'), x2 = lienzo.getContext('2d'); let px = null, img = null, n = 0;
    function copiarParaManos(){
      if(chico.height !== Math.round(320 * ar.alto / Math.max(1, ar.ancho))){ chico.setSize(320, Math.max(120, Math.round(320 * ar.alto / Math.max(1, ar.ancho)))); px = null; }
      const w = chico.width, h = chico.height;
      if(!px){ px = new Uint8Array(w * h * 4); lienzo.width = w; lienzo.height = h; img = x2.createImageData(w, h); }
      render.setRenderTarget(chico); render.render(escenaChica, camChica); render.readRenderTargetPixels(chico, 0, 0, w, h, px);
      /* readPixels da los renglones de abajo hacia arriba */
      for(let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      x2.putImageData(img, 0, 0);
      const F = V.fuenteManos; F.canvas = lienzo; F.videoWidth = w; F.videoHeight = h; F.readyState = 4; F.currentTime += 1 / 30; F.activa = true;
    }
    const hecho = { resolver: null }; ar.camaraLista = new Promise((r) => { hecho.resolver = r; }); if(!binding) hecho.resolver(false);
    /* el ciclo: lo marca la sesión (no la ventana) */
    render.setAnimationLoop(null);
    const paso = (t, frame) => {
      if(!ar.activo) return;
      s.requestAnimationFrame(paso);
      const pose = frame.getViewerPose(ref); ar.frame = frame; ar.pose = pose || null;
      if(pose){
        const v = pose.views[0];
        /* el campo de la cámara de ARCore, de su proyección (horizontal, en grados) */
        const P = v.projectionMatrix; ar.campo = 2 * Math.atan(1 / P[0]) * 180 / Math.PI;
        if(binding && v.camera){ try{ render.state?.unbindTexture?.(); tex.sourceTexture = binding.getCameraImage(v.camera); ar.ancho = v.camera.width; ar.alto = v.camera.height;
          if(!ar.camaraVista){ ar.camaraVista = true; V.usarCamaraAR(tex); hecho.resolver(true); }
          if(V.AJ.manos && (++n % 2 === 0)) copiarParaManos(); }catch(e){ V.fallo?.('E-AR', 'cámara de ARCore', e); } }
      }
      V.cuadroExterno(t);
    };
    s.requestAnimationFrame(paso);
    s.addEventListener('end', () => {
      ar.activo = false; ar.pose = null; ar.frame = null; V.fuenteManos.activa = false;
      render.domElement.style.visibility = ''; document.documentElement.classList.remove('en-ar');
      V.dejarCamaraAR(); V.hud?.('Salió de AR', 2);
      render.setAnimationLoop((tt) => V.cuadroExterno(tt));
      ar.alSalir?.();
    });
    V.hud?.(binding ? 'ARCore · 6DoF' : 'ARCore sin cámara: sin manos ni mixta', 2.4);
    return true;
  }).catch((e) => { try{ sesion?.end(); }catch{} console.warn('E-AR', e?.stack || e); V.fallo?.('E-AR', 'abrir la sesión de ARCore', e); return false; });
}
