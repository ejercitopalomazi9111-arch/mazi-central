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
    /* en el App Clip de Variant (iPhone) la imagen de la cámara se pide con su propia función: 'camera-access-launch' la prende */
    optionalFeatures: ['local-floor', 'camera-access', 'dom-overlay', ...(window.VLaunch?.appleBrowser === 'launch-viewer' ? ['camera-access-launch'] : [])],
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
    /* el lienzo de la página no se ve en la sesión (lo de encima, la web y los avisos, sí: dom-overlay)…
       …SALVO en el iPhone con el App Clip de Variant (27 nov, Carlos: «es solamente una cámara completamente normal que hace un
       sonido cuando… me quedo viendo a un lugar»): ahí la capa no tiene búfer propio (`framebuffer` es null = el del LIENZO de
       la página) y lo que se ve encima de la cámara es ese lienzo. Esconderlo dejaba la cámara sola con Mazi VR corriendo atrás */
    ar.enLienzo = capa.framebuffer == null;
    if(!ar.enLienzo) render.domElement.style.visibility = 'hidden';
    document.documentElement.classList.add('en-ar'); if(ar.enLienzo) document.documentElement.classList.add('en-ar-lienzo');
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
    const hecho = { resolver: null }; ar.camaraLista = new Promise((r) => { hecho.resolver = r; });
    /* LA CÁMARA EN EL IPHONE (27 nov, Carlos: «me pide sólo el giroscopio y no me pide acceso a la cámara para la realidad mixta
       ni para las manos»): dentro del App Clip la cámara la tiene ARKit y getUserMedia no existe. Variant la pasa cuadro por
       cuadro con VLaunch.requestVideoFrame (un JPEG en base64, de uno en uno). Se dibuja en un lienzo: ése es la pared de la
       realidad mixta y, en chiquito, lo que ven las manos. La imagen de ARKit viene acostada (con la parte de arriba del
       teléfono a la izquierda), que es justo como va en el visor. */
    const variant = !binding && window.VLaunch?.appleBrowser === 'launch-viewer' && typeof window.VLaunch.requestVideoFrame === 'function';
    if(!binding && !variant) hecho.resolver(false);
    if(variant){
      const grande = document.createElement('canvas'), xg = grande.getContext('2d'), mini = document.createElement('canvas'), xm = mini.getContext('2d', { willReadFrequently: true });
      const texV = new THREE.CanvasTexture(grande); texV.colorSpace = THREE.SRGBColorSpace; ar.texVariant = texV;
      let pedidos = 0, llegados = 0, pintados = 0, tirados = 0, ultimo = 0, llegoEn = 0, ocupado = false, ocupadoDesde = 0;
      /* decodificar: con <img> (lo más seguro dentro del WebView del App Clip) y un tope de 1.5 s, para que un cuadro atorado
         no deje a todos los demás tirados para siempre (27 nov: «actualiza una vez la imagen y después así se queda») */
      function decodificar(dato, f){
        if(typeof dato === 'string'){ const img = new Image(); img.src = 'data:image/jpeg;base64,' + dato;
          return Promise.race([img.decode().then(() => img), new Promise((_, no) => setTimeout(() => no(new Error('el JPEG tardó más de 1.5 s')), 1500))]); }
        if(dato instanceof ImageData) return createImageBitmap(dato);
        const bytes = new Uint8Array(dato), w = f.width, h = f.height;   /* bytes crudos: el plano de brillo (Y), en grises */
        if(!w || !h || bytes.length < w * h) return Promise.reject(new Error(`cuadro de cámara raro: ${w}×${h}, ${bytes.length} bytes`));
        const id = new ImageData(w, h); for(let k = 0, q = 0; k < w * h; k++, q += 4){ const v = bytes[k]; id.data[q] = id.data[q + 1] = id.data[q + 2] = v; id.data[q + 3] = 255; }
        return createImageBitmap(id);
      }
      async function pintar(f){
        const img = await decodificar(f.data, f), w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        const k = Math.min(1, 960 / w), gw = Math.round(w * k), gh = Math.round(h * k);
        if(grande.width !== gw || grande.height !== gh){ grande.width = gw; grande.height = gh; }
        xg.drawImage(img, 0, 0, gw, gh); texV.needsUpdate = true; ar.ancho = w; ar.alto = h;
        if(V.AJ.manos){ const mw = 320, mh = Math.round(320 * h / w); if(mini.width !== mw || mini.height !== mh){ mini.width = mw; mini.height = mh; } xm.drawImage(img, 0, 0, mw, mh);
          const F = V.fuenteManos; F.canvas = mini; F.videoWidth = mw; F.videoHeight = mh; F.readyState = 4; F.currentTime += 1 / 30; F.activa = true; }
        img.close?.();
        if(!ar.camaraVista){ ar.camaraVista = true; V.usarCamaraAR(texV); hecho.resolver(true); V.hud?.('Cámara lista', 1.6); }
        pintados++;
      }
      function llego(f){
        llegados++; llegoEn = performance.now();
        if(ocupado && performance.now() - ocupadoDesde < 2000){ tirados++; return; }   /* todavía se dibuja el anterior: éste se tira */
        ocupado = true; ocupadoDesde = performance.now();
        pintar(f).catch((e) => V.fallo?.('E-AR-CAM', 'cuadro de cámara del iPhone', e)).finally(() => { ocupado = false; });
      }
      /* EL CANAL: se escucha la cámara del App Clip TODO el tiempo (no un pedido de una sola vez que, si se pierde, deja el ciclo
         esperando para siempre), se le pide que mande seguido, y se vuelve a pedir cada cuadro y cada medio segundo sin nada */
      const W = window.VLaunch.webXR?._arKitWrapper;
      const directo = W && typeof W.addEventListener === 'function' && typeof W._requestComputerVisionData === 'function';
      const pedir = () => { if(!ar.activo) return; pedidos++; ultimo = performance.now();
        try{ if(directo) W._requestComputerVisionData(); else window.VLaunch.requestVideoFrame((f) => { llego(f); setTimeout(pedir, Math.max(0, 33 - (performance.now() - ultimo))); }); }
        catch(e){ V.fallo?.('E-AR-CAM', 'pedir la cámara al App Clip', e); } };
      if(directo){
        W.addEventListener('cv_data', (r) => { const b = r.detail?._buffers?.[0]; if(!b) return;
          llego({ width: b.size?.width, height: b.size?.height, data: b._buffer ?? b.buffer });
          try{ r.detail.release?.(); }catch{}
          setTimeout(pedir, Math.max(0, 33 - (performance.now() - ultimo))); });
        try{ W._startSendingComputerVisionData?.(); }catch{}
      }
      const vigia = setInterval(() => { if(!ar.activo){ clearInterval(vigia); return; } if(performance.now() - Math.max(llegoEn, ultimo) > 500) pedir(); }, 250);
      ar.camaraVariant = () => ({ directo: !!directo, pedidos, llegados, pintados, tirados });
      pedir();
      /* si en 6 s no llegó ningún cuadro, se dice (sin cámara siguen el AR y el giroscopio) */
      setTimeout(() => { if(!pintados){ hecho.resolver(false); V.hud?.('Sin cámara en el App Clip', 2.4); } }, 6000);
    }
    /* el ciclo: lo marca la sesión (no la ventana) */
    render.setAnimationLoop(null);
    const paso = (t, frame) => {
      if(!ar.activo) return;
      s.requestAnimationFrame(paso);
      const pose = frame.getViewerPose(ref); ar.frame = frame; ar.pose = pose || null;
      if(pose){
        const v = pose.views[0];
        /* el campo de la cámara de ARCore, de su proyección (horizontal, en grados) */
        /* acostado (vertical en la pantalla, de lado en el visor): el ancho de la imagen de la cámara va a lo largo de la pantalla */
        const P = v.projectionMatrix; ar.campo = 2 * Math.atan(1 / (V.estaAcostado?.() ? P[5] : P[0])) * 180 / Math.PI;
        if(binding && v.camera){ try{ render.state?.unbindTexture?.(); tex.sourceTexture = binding.getCameraImage(v.camera); ar.ancho = v.camera.width; ar.alto = v.camera.height;
          if(!ar.camaraVista){ ar.camaraVista = true; V.usarCamaraAR(tex); hecho.resolver(true); }
          if(V.AJ.manos && (++n % 2 === 0)) copiarParaManos(); }catch(e){ V.fallo?.('E-AR', 'cámara de ARCore', e); } }
      }
      V.cuadroExterno(t);
    };
    s.requestAnimationFrame(paso);
    s.addEventListener('end', () => {
      ar.activo = false; ar.pose = null; ar.frame = null; V.fuenteManos.activa = false;
      render.domElement.style.visibility = ''; document.documentElement.classList.remove('en-ar', 'en-ar-lienzo');
      V.dejarCamaraAR(); V.hud?.('Salió de AR', 2);
      render.setAnimationLoop((tt) => V.cuadroExterno(tt));
      ar.alSalir?.();
    });
    V.hud?.(binding ? 'ARCore · 6DoF' : variant ? 'ARKit · 6DoF' : 'ARCore sin cámara: sin manos ni mixta', 2.4);
    return true;
  }).catch((e) => { try{ sesion?.end(); }catch{} console.warn('E-AR', e?.stack || e); V.fallo?.('E-AR', 'abrir la sesión de ARCore', e); return false; });
}
