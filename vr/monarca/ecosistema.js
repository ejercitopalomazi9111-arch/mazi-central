/* EL ECOSISTEMA DE MARIPOSAS DE MONARCH (prompt maestro de Carlos, e1354 §10-11 y §15).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   · NO se dibuja ninguna mariposa: las alas son una FOTO del ejemplar escaneado de Virginia Tech (monarca.glb), tomada una
     vez desde arriba con una cámara ortográfica. Cada mariposa del ecosistema son dos planos (ala izquierda y derecha) con
     esa foto: 4 triángulos contra los 24 mil del escaneo, así caben decenas en el teléfono a 60 cuadros, en estéreo.
   · Un solo grupo (pool) para todo: las mismas mariposas cambian de papel según la escena. Nada se crea ni se destruye
     cuadro a cuadro.
   · Papeles:
       ambiente   vuelan solas: trayectorias suaves a distintas alturas, aletean y planean; aparecen y se van con calma.
       rumbo      todas hacia el mismo lado (la migración): la dirección se ve sin flecha.
       guía       una sola se va a donde hay que mirar o actuar, y se POSA ahí (alas abriendo y cerrando despacio).
       racimo     en el santuario: colgadas en racimos, alas cerradas, casi quietas; unas pocas vuelan (como en el bosque
                  de oyamel; CIENCIA.md §9.1).
   · Con las manos: si una palma se acerca a menos de 35 cm, la mariposa cambia de rumbo y se aleja; si llega a 12 cm,
     cuenta como «tocar una mariposa» (alTocar) para el narrador.
   · Rendimiento: las que están a más de 6 m sólo aletean cada dos cuadros; las fuera de vista no se dibujan (three). */
export function crearEcosistema({ THREE, render, grupo, cabeza, N = 48 }){
  const eco = { listo: false, alTocar: () => {}, papel: 'nada', mariposas: [], guia: null, toques: 0 };
  const capa = new THREE.Group(); grupo.add(capa); capa.visible = false;
  let matAla = null;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), ojo = new THREE.Vector3();

  /* ── la foto de las alas, una vez, desde el escaneo ── */
  eco.desdeModelo = (modelo) => {
    try{
      const caja = new THREE.Box3().setFromObject(modelo), tam = caja.getSize(new THREE.Vector3()), c = caja.getCenter(new THREE.Vector3());
      /* el eje más delgado es el grosor: se mira a lo largo de él; el más largo es la envergadura */
      const ejes = [['x', tam.x], ['y', tam.y], ['z', tam.z]].sort((a, b) => a[1] - b[1]);
      const delgado = ejes[0][0], largo = ejes[2][0], medio = ejes[1][0];
      const dir = new THREE.Vector3(); dir[delgado] = 1;
      const arriba = new THREE.Vector3(); arriba[medio] = 1;
      const ancho = tam[largo] * 1.04, alto = tam[medio] * 1.04;
      const cam = new THREE.OrthographicCamera(-ancho / 2, ancho / 2, alto / 2, -alto / 2, .001, 100);
      cam.position.copy(c).addScaledVector(dir, tam[delgado] * 4 + 1); cam.up.copy(arriba); cam.lookAt(c);
      const W = 512, H = Math.max(64, Math.round(W * alto / ancho));
      const rt = new THREE.WebGLRenderTarget(W, H); const esc = new THREE.Scene();
      const copia = modelo.clone(); esc.add(copia);
      const antesRT = render.getRenderTarget(), antesXR = render.xr?.enabled; if(render.xr) render.xr.enabled = false;
      const antesCol = render.getClearColor(new THREE.Color()), antesA = render.getClearAlpha();
      render.setRenderTarget(rt); render.setClearColor(0x000000, 0); render.clear(); render.render(esc, cam);
      const px = new Uint8Array(W * H * 4); render.readRenderTargetPixels(rt, 0, 0, W, H, px);
      render.setRenderTarget(antesRT); render.setClearColor(antesCol, antesA); if(render.xr) render.xr.enabled = antesXR; rt.dispose();
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'), img = x.createImageData(W, H);
      for(let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);   /* WebGL lee de abajo hacia arriba */
      x.putImageData(img, 0, 0);
      let opacos = 0; for(let i = 3; i < img.data.length; i += 4) if(img.data[i] > 40) opacos++;
      eco.cobertura = opacos / (W * H);
      if(eco.cobertura < .05) return false;   /* la foto salió vacía: mejor sin ecosistema que con cuadros raros */
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      matAla = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, alphaTest: .35, toneMapped: false });
      armar(ancho / alto); eco.listo = true; return true;
    }catch(e){ eco.error = e?.message || String(e); return false; }
  };

  /* ── el pool: cada mariposa = cuerpo (Group) + dos alas con la mitad de la foto cada una ── */
  function armar(proporcion){
    const env = .2, alto = env / proporcion;   /* envergadura de 20 cm: una monarca mide unos 10, pero a 2-3 m así sí se lee en el visor */
    const geoI = new THREE.PlaneGeometry(env / 2, alto); geoI.translate(-env / 4, 0, 0);
    const geoD = new THREE.PlaneGeometry(env / 2, alto); geoD.translate(env / 4, 0, 0);
    const uv = (g, a, b) => { const u = g.attributes.uv; for(let i = 0; i < u.count; i++) u.setX(i, a + u.getX(i) * (b - a)); u.needsUpdate = true; };
    uv(geoI, 0, .5); uv(geoD, .5, 1);
    let k = 7; const az = () => (k = (k * 16807) % 2147483647) / 2147483647;
    for(let i = 0; i < N; i++){
      const g = new THREE.Group(), ai = new THREE.Mesh(geoI, matAla), ad = new THREE.Mesh(geoD, matAla);
      /* las alas quedan acostadas (como vista desde arriba) y giran alrededor del eje del cuerpo */
      const piv = new THREE.Group(); piv.rotation.x = -Math.PI / 2; piv.add(ai, ad); g.add(piv);
      g.visible = false; capa.add(g);
      eco.mariposas.push({ g, ai, ad, papel: null, fase: az() * 10, vel: .5 + az() * .5, r: 1.1 + az() * 2.6, h: -.5 + az() * 1.9,
        f: 8 + az() * 4, esc: .9 + az() * .35, gira: az() < .5 ? 1 : -1, huye: new THREE.Vector3(), alfa: 0, quieta: false,
        dest: null, desde: new THREE.Vector3(), t0: 0, base: new THREE.Vector3(), cuadro: 0 });
    }
  }
  const aletear = (m, ang) => { m.ai.rotation.y = ang; m.ad.rotation.y = -ang; };

  /* ── cambiar de papel según la escena ── */
  eco.poner = (papel, { cuantas = 8, rumbo = null, racimos = null } = {}) => {
    eco.papel = papel; capa.visible = eco.listo && papel !== 'nada';
    if(!eco.listo) return;
    eco.mariposas.forEach((m, i) => { m.papel = null; m.g.visible = false; m.dest = null; m.quieta = false; m.alfa = 0; });
    let i = 0; const tomar = () => eco.mariposas[i++];
    if(papel === 'racimo'){
      /* racimos colgados de ramas imaginarias del oyamel, enfrente y a los lados, de 1.4 a 2.6 m de alto */
      const sitios = racimos || [[-1.5, 1.3, -2.6], [1.4, 1.5, -2.8], [-.3, 1.9, -3.4], [2.6, 1.1, -1.8]];
      for(const [x, y, z] of sitios){ for(let j = 0; j < 9 && i < eco.mariposas.length - 5; j++){ const m = tomar(); m.papel = 'racimo';
        m.base.set(x + (j % 3 - 1) * .07, y - Math.floor(j / 3) * .09 - (j % 2) * .03, z + (j % 2) * .04); m.g.visible = true; } }
      for(let j = 0; j < 4; j++){ const m = tomar(); m.papel = 'ambiente'; m.g.visible = true; }
    } else if(papel !== 'nada'){
      for(let j = 0; j < Math.min(cuantas, eco.mariposas.length - 1); j++){ const m = tomar(); m.papel = papel; m.rumbo = rumbo; m.g.visible = true; }
    }
    eco.guia = eco.mariposas[eco.mariposas.length - 1]; eco.guia.papel = null; eco.guia.g.visible = false;
  };
  /* la guía: vuela a `destino` (Vector3) y se posa; con null, se va */
  eco.guiar = (destino, { posarse = true } = {}) => {
    if(!eco.listo) return; const m = eco.guia;
    if(!destino){ if(m.papel === 'guia'){ m.dest = null; m.papel = 'ambiente'; } return; }
    if(m.papel !== 'guia'){ cabeza.getWorldPosition(ojo); m.g.position.copy(capa.worldToLocal(ojo.clone())).add(tmp.set(1.4, .6, -.6)); }
    m.papel = 'guia'; m.g.visible = true; m.desde.copy(m.g.position); m.dest = destino.clone(); m.t0 = performance.now() / 1000; m.posarse = posarse; m.posada = false;
  };

  /* ── cada cuadro ── */
  const ENFRENTE = -2.2;
  eco.cuadro = (t, manos = []) => {
    if(!eco.listo || !capa.visible) return;
    cabeza.getWorldPosition(ojo); const ojoL = capa.worldToLocal(ojo.clone());
    const palmas = manos.map((h) => h.mundo?.palma).filter(Boolean).map((p) => capa.worldToLocal(p.clone()));
    for(const m of eco.mariposas){
      if(!m.g.visible) continue;
      m.cuadro++; const lejos = m.g.position.distanceToSquared(ojoL) > 36;
      if(m.papel === 'racimo'){
        /* colgadas: casi quietas, alas cerradas hacia arriba, un vaivén lento; si una mano llega, se abren y se calman */
        const cerca = palmas.some((p) => p.distanceToSquared(m.base) < .09);
        m.g.position.set(m.base.x + Math.sin(t * .5 + m.fase) * .005, m.base.y, m.base.z);
        m.g.rotation.set(Math.PI / 2 - .2, m.fase, 0);
        if(!lejos || m.cuadro % 2) aletear(m, cerca ? .5 + Math.sin(t * 6 + m.fase) * .5 : 1.35 + Math.sin(t * .7 + m.fase) * .05);
        continue;
      }
      if(m.papel === 'guia' && m.dest){
        const k = Math.min(1, (t - m.t0) / Math.max(1.8, m.desde.distanceTo(m.dest) / .9));
        const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        tmp.lerpVectors(m.desde, m.dest, e); tmp.y += Math.sin(k * Math.PI) * .35;   /* un arco, no una línea */
        if(k < 1){ tmp.x += Math.sin(t * 2.3 + m.fase) * .04 * (1 - k); m.g.position.copy(tmp); }
        else if(m.posarse){ m.posada = true; m.g.position.copy(m.dest); }
        else { m.g.position.set(m.dest.x + Math.sin(t * 1.7) * .1, m.dest.y + Math.sin(t * 2.6) * .05, m.dest.z + Math.cos(t * 1.7) * .1); }
        tmp2.copy(k < 1 ? m.dest : ojoL); tmp2.y = m.g.position.y; if(tmp2.distanceToSquared(m.g.position) > 1e-4) m.g.lookAt(tmp2);
        aletear(m, m.posada ? .35 + (Math.sin(t * 1.6 + m.fase) * .5 + .5) * .9 : Math.sin(t * m.f * 6.283) * 1.05);
        continue;
      }
      /* ambiente y rumbo: trayectoria suave + huir de las manos */
      const a = t * .25 * m.vel * m.gira + m.fase;
      if(m.papel === 'rumbo'){
        /* todas hacia el mismo lado (de izquierda a derecha enfrente), entran por un lado y salen por el otro */
        const L = 9, x = ((t * .55 * m.vel + m.fase * 3) % L) - L / 2;
        tmp.set(x, .3 + m.h * .8 + Math.sin(t * 1.3 + m.fase) * .12, ENFRENTE - 1.2 - (m.r % 3));
        m.alfa = Math.min(1, (L / 2 - Math.abs(x)) / .8);
      } else {
        tmp.set(Math.sin(a) * m.r, m.h + Math.sin(t * .9 + m.fase) * .18, Math.cos(a) * m.r * .7 - 1.2);
        m.alfa = 1;
      }
      for(const p of palmas){ const d2 = p.distanceToSquared(m.g.position);
        if(d2 < .1225){ tmp2.copy(m.g.position).sub(p).normalize().multiplyScalar(.9); tmp2.y = Math.abs(tmp2.y) + .4; m.huye.add(tmp2.multiplyScalar(.05)); }
        if(d2 < .0144 && t - (m.tocadaEn || 0) > 3){ m.tocadaEn = t; eco.toques++; try{ eco.alTocar(); }catch{} } }
      m.huye.multiplyScalar(.97); tmp.add(m.huye);
      const antes = m.g.position.clone(); m.g.position.lerp(tmp, .08);
      tmp2.copy(m.g.position).add(m.g.position).sub(antes); if(tmp2.distanceToSquared(m.g.position) > 1e-8) m.g.lookAt(tmp2);
      m.g.scale.setScalar(m.esc * Math.max(.01, m.alfa));
      /* planeo: cada tanto deja de aletear y se desliza con las alas abiertas */
      const planea = Math.sin(t * .6 + m.fase * 2) > .75;
      if(!lejos || m.cuadro % 2) aletear(m, planea ? .12 : Math.sin(t * m.f * 6.283 + m.fase) * 1.05);
    }
  };
  eco.capa = capa;
  return eco;
}
