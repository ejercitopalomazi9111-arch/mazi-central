/* MAZI VR · LOS PUNTITOS DEL RASTREO (Carlos, 19 nov: «que aparezcan los pequeños puntitos mientras se hace el rastreo o
   el mapeo de mi entorno, para que me indiquen que se está viendo bien; si tengo una cama a mi lado, que vayan
   poniéndose en el contorno de la cama»).
   Dos capas:
     · VIVOS: los puntos que la cámara está siguiendo AHORA, pintados encima de la imagen de la cámara (realidad mixta),
       justo en las esquinas y orillas de lo que ve. Verdes si el rastreo va bien, amarillos si va «a ciegas» (coast),
       rojos si se perdió. Si casi no hay puntos, ese lugar es difícil (pared lisa, poca luz).
     · EL MAPA: cada punto que el rastreo ubica en 3D se QUEDA puesto en tu cuarto (uno por cada cubito de 4 cm), así se
       va dibujando con puntitos. Se ve en la mixta y en el cuarto virtual. Se borra con «Borrar mapa» en Ajustes.
   La nube 3D se pone respecto a TUS OJOS de ese momento (seis.js): lo que el rastreo cree ver, en el mismo marco que la
   vista. */
export function crearNube({ THREE, escena, rig, pared }){
  const MAX_VIVOS = 1500, MAX_MAPA = 40000, VOXEL = .04;
  /* vivos: hijos de la imagen de la cámara (un plano de 1×1 escalado), así caen justo sobre ella aunque se estire o voltee */
  const gV = new THREE.BufferGeometry(); gV.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_VIVOS * 3), 3)); gV.setDrawRange(0, 0);
  const mV = new THREE.PointsMaterial({ color: 0x5CFF8A, size: 7, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true, opacity: .95 });
  const vivos = new THREE.Points(gV, mV); vivos.renderOrder = -9; vivos.frustumCulled = false; pared.add(vivos);
  /* el mapa: en el MUNDO (la escena), para que se quede en su lugar aunque te muevas */
  const gM = new THREE.BufferGeometry(); gM.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_MAPA * 3), 3));
  gM.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_MAPA * 3), 3)); gM.setDrawRange(0, 0);
  const mM = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true, opacity: .9 });
  const mapa = new THREE.Points(gM, mM); mapa.frustumCulled = false; mapa.renderOrder = 5; escena.add(mapa);
  const celdas = new Set(); let n = 0, ultimaNube = -1;
  const st = { vivos: 0, mapa: 0, estado: null };
  const v = new THREE.Vector3(), c = new THREE.Color();

  function cuadro(vio, filtro, { mostrar = true } = {}){
    vivos.visible = mapa.visible = !!(mostrar && vio);
    if(!vio || !mostrar) return st;
    /* vivos sobre la imagen */
    const vis = vio.vistos();
    if(vis){
      const P = gV.attributes.position.array, k = Math.min(MAX_VIVOS, vis.xy.length / 2);
      for(let i = 0; i < k; i++){ P[i * 3] = vis.xy[i * 2] / vis.w - .5; P[i * 3 + 1] = .5 - vis.xy[i * 2 + 1] / vis.h; P[i * 3 + 2] = .001; }
      gV.attributes.position.needsUpdate = true; gV.setDrawRange(0, k); st.vivos = k; st.estado = vis.estado;
      mV.color.set(vis.estado === 'track' ? 0x5CFF8A : vis.estado === 'coast' ? 0xFFD24A : 0xFF5A5A);
    }
    /* la nube 3D nueva se suma al mapa (sólo con rastreo bueno: lo de un rastreo perdido ensucia el mapa) */
    const nb = vio.nube3D(), f = filtro.st;
    if(nb && nb.n !== ultimaNube && f.eAhora && vio.S.estado === 'track'){
      ultimaNube = nb.n;
      const cs = Math.cos(f.phi), sn = Math.sin(f.phi), pos = gM.attributes.position.array, col = gM.attributes.color.array;
      rig.updateMatrixWorld(true);
      for(let i = 0; i + 2 < nb.pts.length && n < MAX_MAPA; i += 3){
        /* del mundo del VIO (z arriba) a three, relativo a tus ojos, girado al marco del giroscopio, sumado a donde están tus ojos */
        const dx = nb.pts[i] - f.eAhora[0], dy = nb.pts[i + 2] - f.eAhora[1], dz = -nb.pts[i + 1] - f.eAhora[2];
        if(dx * dx + dy * dy + dz * dz > 36) continue;   /* más de 6 m: casi siempre ruido */
        v.set(f.pos[0] + cs * dx + sn * dz, f.pos[1] + dy, f.pos[2] - sn * dx + cs * dz); rig.localToWorld(v);
        const key = `${Math.round(v.x / VOXEL)},${Math.round(v.y / VOXEL)},${Math.round(v.z / VOXEL)}`;
        if(celdas.has(key)) continue; celdas.add(key);
        pos[n * 3] = v.x; pos[n * 3 + 1] = v.y; pos[n * 3 + 2] = v.z;
        /* color por altura: piso morado, a la altura de la mano verde, arriba azul (ayuda a leer la forma de los muebles) */
        c.setHSL(.75 - Math.max(0, Math.min(1, (v.y + 1.6) / 2.2)) * .45, .9, .6); col[n * 3] = c.r; col[n * 3 + 1] = c.g; col[n * 3 + 2] = c.b;
        n++;
      }
      gM.attributes.position.needsUpdate = gM.attributes.color.needsUpdate = true; gM.setDrawRange(0, n); st.mapa = n;
    }
    return st;
  }
  function borrar(){ celdas.clear(); n = 0; ultimaNube = -1; gM.setDrawRange(0, 0); st.mapa = 0; }
  /* el mapa en crudo (posiciones del mundo), para los obstáculos y la zona segura (limites.js) */
  const datos = () => ({ pos: gM.attributes.position.array, n });
  return { cuadro, borrar, st, vivos, mapa, datos };
}
