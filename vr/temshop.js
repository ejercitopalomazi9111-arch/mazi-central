/* MAZI VR · el cuarto de fondo: el TEM SHOP (Carlos, 18 nov: «que el fondo sea la tem shop»).
   El mismo cuarto de VS TILES, a tamaño de persona: piso de tablas, el dibujo del Tem Shop de pared, el letrero, los
   muebles de Kenney y unas Temmies que vibran como en su juego. Sólo se ve en el cuarto virtual (en la mixta ves tu cuarto).
   En Ajustes → Fondo se regresa al espacio de antes.
   Arte: dibujo, letrero y tablas del modelo «undertale temmie» de xunbile (CC BY 4.0); Temmie de Stewie_Box (CC BY 4.0);
   muebles del Furniture Kit de Kenney (CC0). Créditos completos en juegos/vs-tiles/CREDITOS.md. */
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { clone as clonarEsqueleto } from './vendor/utils/SkeletonUtils.js';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

export function montarTemShop(V){
  const { THREE } = V;
  const D = './modelos/temshop/', PISO = -1.5;
  const tem = new THREE.Group(); tem.name = 'temshop'; V.cuarto.add(tem);
  const cargador = new GLTFLoader(), texs = new THREE.TextureLoader();
  const tex = (n) => new Promise((ok, mal) => texs.load(D + n, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ok(t); }, undefined, mal));

  async function lamina(n, w, h, pos, { repite = null, color = '#FFFFFF', giroX = 0, giroY = 0, transparente = false } = {}){
    const t = await tex(n); if(repite){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repite); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color, transparent: transparente, depthWrite: !transparente, side: THREE.DoubleSide }));
    m.rotation.set(giroX, giroY, 0); m.position.set(...pos); tem.add(m); return m;
  }
  /* un mueble parado en el piso, del alto pedido en metros */
  async function mueble(n, x, z, alto, giro = 0, y = PISO){
    const g = await cargador.loadAsync(D + n), m = clonarEsqueleto(g.scene);
    m.updateMatrixWorld(true); const caja = new THREE.Box3().setFromObject(m, true), t = caja.getSize(new THREE.Vector3()), c = caja.getCenter(new THREE.Vector3());
    const cuerpo = new THREE.Group(); m.position.set(-c.x, -caja.min.y, -c.z); cuerpo.add(m); cuerpo.scale.setScalar(alto / Math.max(.001, t.y));
    const r = new THREE.Group(); r.add(cuerpo); r.position.set(x, y, z); r.rotation.y = giro; tem.add(r); r.userData.base = r.position.clone(); return r;
  }

  /* HORNEAR: 63 piezas sueltas (×2 ojos) le costaban la mitad de los cuadros al teléfono. Lo que no se mueve se vuelve UNA
     malla con el color de cada material en los vértices (las Temmies no: su modelo trae texturas y se deshacía). Las posiciones del modelo cuantizado se pasan a
     Float32 antes de transformarlas (si no, se recortan a [-1, 1]: ver CLAUDE.md, regla 12). */
  function hornear(objs, padre){
    padre.updateMatrixWorld(true); const inv = padre.matrixWorld.clone().invert(), partes = [], mt = new THREE.Matrix4(), nm = new THREE.Matrix3(), col = new THREE.Color();
    for(const o of objs) o.traverse((m) => { if(!m.isMesh) return;
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry; const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, n = P.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cc = new Float32Array(n * 3); col.copy(m.material.color || col.set('#fff'));
      for(let i = 0; i < n; i++){ pos.set([P.getX(i), P.getY(i), P.getZ(i)], i * 3); if(N) nor.set([N.getX(i), N.getY(i), N.getZ(i)], i * 3);
        cc.set(C ? [C.getX(i) * col.r, C.getY(i) * col.g, C.getZ(i) * col.b] : [col.r, col.g, col.b], i * 3); }
      const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.BufferAttribute(pos, 3)); b.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); b.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      mt.multiplyMatrices(inv, m.matrixWorld); b.applyMatrix4(mt); if(!N) b.computeVertexNormals(); partes.push(b); });
    objs.forEach((o) => o.parent?.remove(o));
    const malla = new THREE.Mesh(mergeGeometries(partes), new THREE.MeshLambertMaterial({ vertexColors: true })); padre.add(malla); return malla;
  }

  /* las coordenadas del cuarto de VS TILES, a metros: su telón (z −66) queda a 7 m enfrente y su orilla de tarima (z −24) a 2.5 m */
  const K = 4.5 / 42, aZ = (z) => -2.5 - (-24 - z) * K, aX = (x) => x * K;
  let temmies = [];
  const armado = (async () => {
    await Promise.all([
      lamina('temshop-piso.webp', 9.4, 10.4, [0, PISO, -2], { repite: [2, 7], color: '#D9B98A', giroX: -Math.PI / 2 }),
      lamina('temshop-piso.webp', 9.4, 10.4, [0, 3.1, -2], { repite: [2, 7], color: '#5E4630', giroX: Math.PI / 2 }),
      lamina('temshop-cuarto.webp', 9.2, 4.6, [0, PISO + 2.3, -7.1], { color: '#A8957C' }),
      ...[-1, 1].map((lado) => lamina('temshop-piso.webp', 10.4, 4.6, [lado * 4.6, PISO + 2.3, -2], { repite: [3, 2], color: '#9C7A4C', giroY: -lado * Math.PI / 2 })),
      lamina('temshop-piso.webp', 9.2, 4.6, [0, PISO + 2.3, 3.1], { repite: [3, 2], color: '#8A6B42', giroY: Math.PI }),
    ]);
    (await lamina('temshop-letrero.png', 1.7, .94, [aX(15), 1.25, -6.9], { transparente: true })).userData.letrero = true;
    const M = [['bookcaseOpen.glb', -24, -52, 15, .35], ['books.glb', -24, -52, 2.2, .35, 6.2], ['cardboardBoxClosed.glb', -17, -34, 4.5, .2], ['cardboardBoxClosed.glb', -16.6, -34.4, 4, -.15, 3.3],
      ['cardboardBoxOpen.glb', -11, -45, 4, .6], ['coatRack.glb', -29, -38, 13, 0], ['bear.glb', -9, -27, 3.4, .5], ['trashcan.glb', 13, -31, 4.2, 0], ['sideTable.glb', 21, -46, 4.6, -.4],
      ['radio.glb', 21, -46, 2, -.4, 3.4], ['tableCoffee.glb', 11, -50, 2.6, .2], ['lampRoundFloor.glb', 29, -40, 14, 0], ['plantSmall1.glb', 24, -27, 4, 0], ['pillow.glb', 17, -37, 1.6, .7], ['rugRound.glb', 0, -36, .25, 0]];
    hornear(await Promise.all(M.map(([n, x, z, alto, g, y]) => mueble(n, aX(x), aZ(z), alto * K, g, y === undefined ? PISO : PISO + (y + 1.2) * K))), tem);
    temmies = await Promise.all([[-7, -24, .9], [8.5, -23, -.8], [-19, -46, .5], [15, -53, -.4], [4, -56, 0]].map(([x, z, g]) => mueble('temmie.glb', aX(x), aZ(z), .55, g)));
    /* materiales baratos: las Temmies traían el de física (PBR) y en el visor cada pixel cuenta dos veces (un ojo y otro) */
    for(const r of temmies) r.traverse((o) => { if(!o.isMesh) return; const v = o.material;
      o.material = new THREE.MeshLambertMaterial({ map: v.map || null, color: v.color, vertexColors: !!o.geometry.attributes.color, transparent: v.transparent, alphaTest: v.alphaTest }); v.dispose(); });
  })().catch((e) => console.warn('Tem Shop', e));

  /* el espacio de antes se apaga mientras se ve el Tem Shop; las Temmies vibran (como en su juego) y de vez en cuando brincan */
  const domo = V.domo.material.uniforms, ESPACIO = { a: domo.a.value.clone(), b: domo.b.value.clone(), c: domo.c.value.clone() };
  const CALIDO = { a: new THREE.Color('#3A2716'), b: new THREE.Color('#1A1109'), c: new THREE.Color('#4A321C') };
  let antes = null;
  V.alCuadro.push((t) => {
    const si = !V.AJ.fondo;
    if(si !== antes){ antes = si; tem.visible = si; V.piso.visible = !si; const P = si ? CALIDO : ESPACIO; domo.a.value.copy(P.a); domo.b.value.copy(P.b); domo.c.value.copy(P.c); }
    if(!si || !V.cuarto.visible) return;
    temmies.forEach((r, i) => { const b = r.userData.base, salto = Math.max(0, Math.sin(t * 2.1 + i * 1.7)) ** 8 * .12;
      r.position.set(b.x + (Math.random() - .5) * .012, b.y + salto, b.z + (Math.random() - .5) * .012); });
  });
  const temshop = { grupo: tem, armado, estado: () => ({ visible: tem.visible, temmies: temmies.length, piezas: tem.children.length }) };
  window.__temshop = temshop;
  return temshop;
}
