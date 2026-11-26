/* MAZI VR · LA MANO 3D (Carlos, 19 nov: «ponle un modelo de manos porque por ahora sólo es el esqueleto, y que se pueda
   desactivar en ajustes»).
   El modelo es la mano genérica de WebXR Input Profiles (MIT, Amazon; vr/modelos/manos/CREDITOS.md): 25 huesos sueltos,
   cada uno con la pose de su articulación. MediaPipe da 21 puntos y ninguna orientación, así que:
     · posición de cada hueso = su punto (los 4 metacarpianos que MediaPipe no tiene salen entre la muñeca y el nudillo,
       en la misma proporción que en el modelo);
     · orientación = un marco hecho con la dirección del hueso (hacia la siguiente articulación) y la normal de la palma,
       más el ajuste que tenía ese hueso en el modelo en reposo con ese mismo marco. Así no hay que adivinar los ejes del
       modelo: si le das los puntos del reposo, sale el reposo exacto (vr/pruebas-mano3d.mjs);
     · tamaño = muñeca→nudillo del medio de tu mano contra la del modelo.
   La matemática (`prepararReposo`, `pose`) no toca la pantalla: se prueba en Node. */
export const DEDOS = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
export const NOMBRES = ['wrist', 'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  ...DEDOS.flatMap((d) => [`${d}-metacarpal`, `${d}-phalanx-proximal`, `${d}-phalanx-intermediate`, `${d}-phalanx-distal`, `${d}-tip`])];
/* qué punto de MediaPipe es cada hueso (null: metacarpiano, se calcula) */
export const MP = { wrist: 0, 'thumb-metacarpal': 1, 'thumb-phalanx-proximal': 2, 'thumb-phalanx-distal': 3, 'thumb-tip': 4 };
DEDOS.forEach((d, k) => { const b = 5 + k * 4; MP[`${d}-metacarpal`] = null; MP[`${d}-phalanx-proximal`] = b; MP[`${d}-phalanx-intermediate`] = b + 1; MP[`${d}-phalanx-distal`] = b + 2; MP[`${d}-tip`] = b + 3; });
/* hacia dónde apunta cada hueso: a la siguiente articulación; la punta, como el hueso de antes */
const SIG = { wrist: 'middle-finger-phalanx-proximal', 'thumb-metacarpal': 'thumb-phalanx-proximal', 'thumb-phalanx-proximal': 'thumb-phalanx-distal', 'thumb-phalanx-distal': 'thumb-tip' };
const ANT = { 'thumb-tip': 'thumb-phalanx-distal' };
DEDOS.forEach((d) => { SIG[`${d}-metacarpal`] = `${d}-phalanx-proximal`; SIG[`${d}-phalanx-proximal`] = `${d}-phalanx-intermediate`; SIG[`${d}-phalanx-intermediate`] = `${d}-phalanx-distal`; SIG[`${d}-phalanx-distal`] = `${d}-tip`; ANT[`${d}-tip`] = `${d}-phalanx-distal`; });

/* el marco de un hueso: x = hacia la siguiente articulación, y = normal de la palma (perpendicular), z = el que falta */
function marco(THREE, f, n, out){
  const u = n.clone().addScaledVector(f, -f.dot(n));
  if(u.lengthSq() < 1e-10) u.set(0, 1, 0).addScaledVector(f, -f.y);
  u.normalize(); const b = new THREE.Vector3().crossVectors(f, u);
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, u, b));
}
/* las posiciones de los 25 huesos a partir de los 21 puntos */
function posiciones(THREE, P, prop){
  const out = {};
  for(const nom of NOMBRES){ const i = MP[nom]; if(i != null) out[nom] = P[i].clone(); }
  DEDOS.forEach((d) => { out[`${d}-metacarpal`] = out.wrist.clone().lerp(out[`${d}-phalanx-proximal`], prop[d]); });
  return out;
}
function direcciones(THREE, pos){
  const dir = {};
  for(const nom of NOMBRES){
    let f = SIG[nom] ? pos[SIG[nom]].clone().sub(pos[nom]) : pos[nom].clone().sub(pos[ANT[nom]]);
    if(f.lengthSq() < 1e-12) f = new THREE.Vector3(0, 1, 0);
    dir[nom] = f.normalize();
  }
  return dir;
}
/* las cadenas que se encadenan: del primer hueso que pone la cámara hasta la punta */
const CADENAS = [['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
  ...DEDOS.map((d) => [`${d}-phalanx-proximal`, `${d}-phalanx-intermediate`, `${d}-phalanx-distal`, `${d}-tip`])];
const normal = (THREE, pos) => new THREE.Vector3().crossVectors(pos['index-finger-phalanx-proximal'].clone().sub(pos.wrist), pos['pinky-finger-phalanx-proximal'].clone().sub(pos.wrist)).normalize();

/** del modelo en reposo ({ nombre: { position, quaternion } }) saca lo que hace falta para moverlo con puntos */
export function prepararReposo(THREE, huesos){
  const prop = {};
  DEDOS.forEach((d) => { const w = huesos.wrist.position, m = huesos[`${d}-metacarpal`].position, p = huesos[`${d}-phalanx-proximal`].position;
    prop[d] = Math.min(.9, Math.max(.05, m.distanceTo(w) / Math.max(1e-6, p.distanceTo(w)))); });
  const pos = {}; for(const nom of NOMBRES) pos[nom] = huesos[nom].position.clone();
  /* con los metacarpianos del modelo, no los calculados: el ajuste guarda la diferencia real */
  const dir = direcciones(THREE, pos), n = normal(THREE, pos), ajuste = {};
  for(const nom of NOMBRES){ const g = marco(THREE, dir[nom], n, new THREE.Quaternion()); ajuste[nom] = g.invert().multiply(huesos[nom].quaternion.clone()); }
  /* el largo de cada falange en el modelo (para encadenar los dedos sin grietas) */
  const largos = {}; for(const [a, b] of CADENAS.flatMap((c) => c.slice(1).map((x, i) => [c[i], x]))) largos[a] = pos[a].distanceTo(pos[b]);
  return { prop, ajuste, largos, largo: pos['middle-finger-phalanx-proximal'].distanceTo(pos.wrist), metas: Object.fromEntries(DEDOS.map((d) => [d, pos[`${d}-metacarpal`].clone()])) };
}
/** de 21 puntos (Vector3, en el espacio donde vive el modelo) a { nombre: { p, q } } y la escala */
export function pose(THREE, P, rep){
  const pos = posiciones(THREE, P, rep.prop), dir = direcciones(THREE, pos), n = normal(THREE, pos), out = {};
  /* DEDOS SIN GRIETAS (Carlos, 19 nov: «los dedos a veces se cuartean»): si cada articulación va donde la ve la cámara, una
     falange tuya más larga o más corta que la del modelo abre una grieta en el nudillo. Se encadena: cada hueso empieza donde
     acaba el anterior, con el largo del modelo (a la escala de tu mano); de la cámara sólo se toma hacia dónde apunta. */
  const k = (P.escalaFija ?? pos['middle-finger-phalanx-proximal'].distanceTo(pos.wrist)) / rep.largo;
  rigidos(THREE, pos, dir);
  for(const c of CADENAS) for(let i = 1; i < c.length; i++) pos[c[i]] = pos[c[i - 1]].clone().addScaledVector(dir[c[i - 1]], rep.largos[c[i - 1]] * k);
  for(const nom of NOMBRES) out[nom] = { p: pos[nom], q: marco(THREE, dir[nom], n, new THREE.Quaternion()).multiply(rep.ajuste[nom]) };
  return { huesos: out, escala: k };
}
/* DEDOS RÍGIDOS (Carlos, 26 nov: «ponle rigidez al modelo de la mano en aspecto de laterales. Ninguna mano tiene una Z en
   cada dedo»). Con el ruido de la cámara cada falange apuntaba a un lado distinto: de lado, el dedo salía en zigzag, y a veces
   un nudillo se doblaba hacia atrás y el siguiente hacia adelante. Un dedo de verdad:
     · de la segunda falange en adelante sólo se dobla en UN plano (como bisagra): se quita lo que se vaya de lado;
     · las dos bisagras se doblan hacia el MISMO lado (nada de Z): si una va al revés de lo que se dobla el dedo más de lo
       que da una mano real (~10°, la punta se echa un poco para atrás), se topa ahí;
     · en el nudillo puede abrirse de lado, pero poco (hasta 22°); en las otras dos articulaciones, casi nada (8°, lo que trae
       la mano en reposo). El pulgar se deja como lo ve la cámara. */
const LADO_MAX = 22 * Math.PI / 180, LADO_BISAGRA = 8 * Math.PI / 180, ATRAS = 10 * Math.PI / 180;
export function rigidos(THREE, pos, dir){
  const lado = pos['pinky-finger-phalanx-proximal'].clone().sub(pos['index-finger-phalanx-proximal']);
  if(lado.lengthSq() < 1e-12) return;
  lado.normalize();
  for(const d of DEDOS){
    const pr = `${d}-phalanx-proximal`, it = `${d}-phalanx-intermediate`, di = `${d}-phalanx-distal`, ti = `${d}-tip`;
    /* nudillo: lo de lado, topado */
    const fw = pos[pr].clone().sub(pos[`${d}-metacarpal`]); if(fw.lengthSq() > 1e-12){ fw.normalize();
      const sP = lado.clone().addScaledVector(fw, -lado.dot(fw)); if(sP.lengthSq() > 1e-12){ sP.normalize();
        const v = dir[pr], sl = v.dot(sP), tope = Math.sin(LADO_MAX);
        if(Math.abs(sl) > tope){ const resto = v.clone().addScaledVector(sP, -sl); const r = resto.length();
          if(r > 1e-6){ resto.multiplyScalar(Math.cos(LADO_MAX) / r); dir[pr] = resto.addScaledVector(sP, Math.sign(sl) * tope).normalize(); } } } }
    /* la bisagra: el eje es «de lado» y perpendicular a la primera falange */
    const u = dir[pr], a = lado.clone().addScaledVector(u, -lado.dot(u)); if(a.lengthSq() < 1e-10) continue; a.normalize();
    const plano = (v) => { const w = v.clone().addScaledVector(a, -v.dot(a)); return w.lengthSq() < 1e-10 ? u.clone() : w.normalize(); };
    const deLado = (v) => Math.max(-Math.sin(LADO_BISAGRA), Math.min(Math.sin(LADO_BISAGRA), v.dot(a)));
    const angulo = (x, y) => Math.atan2(a.dot(new THREE.Vector3().crossVectors(x, y)), x.dot(y));
    const l1 = deLado(dir[it]), l2 = deLado(dir[di]), v1 = plano(dir[it]), v2 = plano(dir[di]);
    let t1 = angulo(u, v1), t2 = angulo(v1, v2);
    const S = Math.sign(t1 + t2) || 1;
    t1 = Math.max(-ATRAS, Math.min(1.9, t1 * S)) * S; t2 = Math.max(-ATRAS, Math.min(1.7, t2 * S)) * S;   /* nada de Z, ni de 180° */
    const q1 = new THREE.Quaternion().setFromAxisAngle(a, t1), q2 = new THREE.Quaternion().setFromAxisAngle(a, t1 + t2);
    const con = (v, l) => v.multiplyScalar(Math.sqrt(1 - l * l)).addScaledVector(a, l).normalize();
    dir[it] = con(u.clone().applyQuaternion(q1), l1); dir[di] = con(u.clone().applyQuaternion(q2), l2); dir[ti] = dir[di].clone();
  }
}
/** ¿izquierda o derecha, por la FORMA? (Carlos, 19 nov: «en el modo sin mixta la mano se pone al revés»): la etiqueta
    de MediaPipe supone una cámara de selfie y depende de si la imagen va volteada; con el modelo equivocado la palma sale del
    lado contrario (en la mixta, transparente, no se nota; en VR sí). El pulgar siempre queda del lado de la palma respecto al
    plano muñeca-índice-meñique: en el modelo derecho a +0.5 del largo de la mano y en el izquierdo a −0.5
    (vr/pruebas-mano3d.mjs). Positivo → derecha; cerca de cero no se sabe. */
export function ladoPorForma(THREE, P){
  const n = new THREE.Vector3().crossVectors(P[5].clone().sub(P[0]), P[17].clone().sub(P[0])); if(n.lengthSq() < 1e-12) return 0;
  n.normalize(); const L = P[9].distanceTo(P[0]) || 1; let t = 0;
  for(const i of [2, 3, 4]) t += P[i].clone().sub(P[0]).dot(n); return t / 3 / L;
}
/** con memoria: cambia de modelo sólo si la forma lo dice claro varios cuadros seguidos */
export function elegirLado(est, t, etiqueta){
  if(!est.lado) est.lado = etiqueta;
  const dice = t > .12 ? 'der' : t < -.12 ? 'izq' : null;
  if(dice && dice !== est.lado){ est.contra = (est.contra || 0) + 1; if(est.contra >= 4){ est.lado = dice; est.contra = 0; } }
  else if(dice) est.contra = 0;
  return est.lado;
}
/** un punto de MediaPipe (x, y de 0 a 1 en la imagen; z = profundidad relativa a la muñeca, MÁS CHICO = MÁS CERCA de la
    cámara) al espacio de la cabeza (la cámara mira hacia −z). Carlos, 20 nov, con la palma hacia arriba: «aquí mi palma
    miraba hacia arriba» y la mano 3D enseñaba el dorso. La profundidad entraba al revés (`−dist + z`): con la mano de frente
    casi no se nota, de canto voltea la palma. Lo cercano tiene que quedar MÁS cerca (z de la escena más grande). */
export function aEspacio(p, dist, tx, ty, out){
  return out.set((p.x * 2 - 1) * tx * dist, -(p.y * 2 - 1) * ty * dist, -dist - p.z * 2 * tx * dist);
}
/** los 21 puntos de MediaPipe sacados del modelo en reposo (para pruebas) */
export function puntosDeReposo(huesos){
  const P = []; for(const nom of NOMBRES){ const i = MP[nom]; if(i != null) P[i] = huesos[nom].position.clone(); } return P;
}

/* ── en el visor: dos manos (una por ranura), cada una con su modelo izquierdo y derecho ── */
export async function crearManos3D(V, padre){
  const { THREE } = V;
  const { GLTFLoader } = await import('./vendor/loaders/GLTFLoader.js');
  const { clone } = await import('./vendor/utils/SkeletonUtils.js');
  const cargar = (u) => new Promise((ok, no) => new GLTFLoader().load(new URL(u, import.meta.url).href, ok, undefined, no));
  const [gi, gd] = await Promise.all([cargar('./modelos/manos/izquierda.glb'), cargar('./modelos/manos/derecha.glb')]);
  /* holograma morado de la casa: se ve sobre tu mano de verdad (mixta) sin taparla del todo */
  const material = (mixta) => new THREE.MeshStandardMaterial({ color: new THREE.Color('#C77DFF'), emissive: new THREE.Color('#5B1A8C'), emissiveIntensity: .6,
    roughness: .45, metalness: .1, transparent: true, opacity: mixta ? .5 : .9, depthTest: !mixta, depthWrite: !mixta });
  const base = { izq: gi.scene, der: gd.scene };
  const reposo = {};
  for(const lado of ['izq', 'der']){
    const h = {}; base[lado].traverse((o) => { if(o.isBone || NOMBRES.includes(o.name)) h[o.name] = o; });
    reposo[lado] = prepararReposo(THREE, Object.fromEntries(NOMBRES.map((nom) => [nom, { position: h[nom].position.clone(), quaternion: h[nom].quaternion.clone() }])));
  }
  const hacer = (lado) => {
    const raiz = clone(base[lado]); raiz.visible = false; padre.add(raiz);
    const huesos = {}; let malla = null;
    raiz.traverse((o) => { if(NOMBRES.includes(o.name)) huesos[o.name] = o; if(o.isSkinnedMesh){ malla = o; o.frustumCulled = false; o.renderOrder = 996; } });
    const mats = { si: material(true), no: material(false) };
    return { raiz, huesos, malla, mats };
  };
  const ranuras = [0, 1].map(() => ({ izq: hacer('izq'), der: hacer('der') }));
  return {
    /** k: ranura; P: 21 Vector3 en el espacio de `padre`; lado: 'izq' | 'der'; mixta: si va encima de la cámara */
    poner(k, P, lado, mixta){
      const r = ranuras[k]; if(!r) return;
      const otra = lado === 'izq' ? 'der' : 'izq'; r[otra].raiz.visible = false;
      const m = r[lado];
      /* NI SE ESTIRA NI SE ACHICA (Carlos, 26 nov): el tamaño de tu mano no cambia, pero el que calcula la cámara brinca con
         cada cuadro. Se toma el de los primeros cuadros (mediana) y después sólo se deja ir muy despacio (por si te alejas) */
      const k3 = P.k3 || 1, crudo = P[9].distanceTo(P[0]) / k3; m.tams ||= [];   /* medido antes de llevarlo encima de la cámara (mixta) */
      if(m.tams.length < 15){ m.tams.push(crudo); m.tam = [...m.tams].sort((x, y) => x - y)[m.tams.length >> 1]; }
      else m.tam += Math.max(-.004 * m.tam, Math.min(.004 * m.tam, (crudo - m.tam) * .03));
      P.escalaFija = m.tam * k3;
      const ps = pose(THREE, P, reposo[lado]);
      for(const nom of NOMBRES){ const b = m.huesos[nom], x = ps.huesos[nom]; b.position.copy(x.p); b.quaternion.copy(x.q); b.scale.setScalar(ps.escala); }
      const mat = mixta ? m.mats.si : m.mats.no; if(m.malla && m.malla.material !== mat) m.malla.material = mat;
      m.raiz.visible = true;
      return ps.huesos['index-finger-tip'].p;   /* la punta del índice DEL MODELO (la que ves): de ahí apunta y con ella se toca */
    },
    esconder(k){ const r = ranuras[k]; if(r){ r.izq.raiz.visible = false; r.der.raiz.visible = false; r.izq.tams = r.der.tams = null; } },   /* otra mano que entra se vuelve a medir */
    ranuras, reposo,
  };
}
