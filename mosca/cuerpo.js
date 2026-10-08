/* El cuerpo 3D de la mosca (flybody, Vaxenburg et al. 2025, Apache 2.0) armado en three.js.
   67 piezas con sus articulaciones de verdad: cada pata tiene coxa, fémur, tibia y tarso; las alas
   giran en tres ejes; la trompa (rostro + haustelo) se estira para comer.

     const plano = await cargarCuerpo('modelo/');        // una sola vez
     const m = crearMosca(plano);                        // tantas como se quieran; comparten las mallas
     m.poner('femur_T1_left', 0.4);                       // radianes sobre la postura de pie
     m.actualizar();                                      // aplica todo
   Ejes del modelo (MuJoCo): x adelante, y izquierda, z arriba; se gira al «y arriba» de three.js.
*/
import * as THREE from 'three';

export async function cargarCuerpo(base) {
  const [json, bin] = await Promise.all([
    fetch(base + 'mosca.json').then((r) => r.json()),
    fetch(base + 'mosca.bin').then((r) => r.arrayBuffer()),
  ]);
  const materiales = {};
  const mat = (nombre, rgba) => {
    if (materiales[nombre]) return materiales[nombre];
    const [r, g, b, a] = rgba;
    const m = nombre === 'membrane'
      ? new THREE.MeshPhysicalMaterial({ color: new THREE.Color(r, g, b), transparent: true, opacity: 0.35, roughness: 0.15,
          iridescence: 1, iridescenceIOR: 1.6, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color(r, g, b), roughness: nombre === 'red' ? 0.35 : 0.55,
          metalness: 0.05, side: THREE.DoubleSide, transparent: a < 1, opacity: a });
    return (materiales[nombre] = m);
  };
  const geos = json.mallas.map((m) => {
    const v = new Int16Array(bin, m.desp, m.v * 3);
    const pos = new Float32Array(m.v * 3);
    for (let i = 0; i < m.v; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = m.lo[k] + (v[i * 3 + k] + 32767) * m.s[k];
    const ini = m.desp + m.v * 6;
    const idx = m.idx32 ? new Uint32Array(bin.slice(ini, ini + m.f * 12)) : new Uint16Array(bin.slice(ini, ini + m.f * 6));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    return { geo: g, mat: mat(m.material, m.rgba) };
  });
  return { json, geos };
}

const X = new THREE.Vector3(), Q = new THREE.Quaternion();

export function crearMosca(plano) {
  const raiz = new THREE.Group();          // en ejes de three: y arriba, x adelante
  const ejes = new THREE.Group(); ejes.rotation.x = -Math.PI / 2; raiz.add(ejes);
  const piezas = {}, art = {};
  for (const p of plano.json.piezas) {
    const o = new THREE.Group(); o.name = p.nombre;
    o.position.set(...p.pos);
    const [w, x, y, z] = p.quat; o.userData.base = new THREE.Quaternion(x, y, z, w);
    o.userData.art = p.art.map((a) => {
      const reg = { eje: new THREE.Vector3(...a.eje), rango: a.rango, reposo: a.reposo, valor: 0 };
      art[a.nombre] = reg; return reg;
    });
    for (const k of p.mallas) {
      const { geo, mat } = plano.geos[k];
      const malla = new THREE.Mesh(geo, mat); malla.castShadow = true; o.add(malla);
    }
    (p.padre ? piezas[p.padre] : ejes).add(o);
    piezas[p.nombre] = o;
  }
  const mosca = {
    raiz, piezas, art,
    /** Ángulo sobre la postura de pie (radianes), topado a su rango real. */
    poner(nombre, v) { const a = art[nombre]; if (a) a.valor = v; },
    actualizar() {
      for (const o of Object.values(piezas)) {
        o.quaternion.copy(o.userData.base);
        for (const a of o.userData.art) {
          let ang = a.reposo + a.valor;
          if (a.rango) ang = Math.min(a.rango[1], Math.max(a.rango[0], ang));
          o.quaternion.multiply(Q.setFromAxisAngle(a.eje, ang));
        }
      }
    },
  };
  mosca.actualizar();
  return mosca;
}
