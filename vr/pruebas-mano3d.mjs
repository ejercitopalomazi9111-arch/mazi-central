/* La mano 3D (mano3d.js), en Node con el modelo de verdad:
     · con los puntos del reposo, cada hueso sale en su pose de reposo exacta (posición y giro) y la escala es 1;
     · si la mano entera se gira, se mueve y se agranda, cada hueso se gira, se mueve y se agranda igual;
     · si un dedo se dobla, giran sus huesos y los demás no.
   Uso: node vr/pruebas-mano3d.mjs */
import fs from 'node:fs';
import * as THREE from './vendor/three.module.min.js';
import { NOMBRES, prepararReposo, pose, puntosDeReposo } from './mano3d.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
/* los huesos del GLB sin cargador: JSON del archivo */
function huesosDe(archivo){
  const b = fs.readFileSync(new URL(archivo, import.meta.url)), largo = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + largo).toString());
  const h = {}; for(const n of j.nodes) if(NOMBRES.includes(n.name)) h[n.name] = { position: new THREE.Vector3(...(n.translation || [0, 0, 0])), quaternion: new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])) };
  return h;
}
for(const [lado, archivo] of [['derecha', './modelos/manos/derecha.glb'], ['izquierda', './modelos/manos/izquierda.glb']]){
  const H = huesosDe(archivo);
  sí(NOMBRES.every((n) => H[n]), `${lado}: el modelo trae los 25 huesos`);
  const rep = prepararReposo(THREE, H), P = puntosDeReposo(H);
  const r = pose(THREE, P, rep);
  const errP = Math.max(...NOMBRES.filter((n) => !n.endsWith('-metacarpal')).map((n) => r.huesos[n].p.distanceTo(H[n].position)));
  const errQ = Math.max(...NOMBRES.filter((n) => !n.endsWith('-metacarpal')).map((n) => r.huesos[n].q.angleTo(H[n].quaternion)));
  const errM = Math.max(...NOMBRES.filter((n) => n.endsWith('-metacarpal')).map((n) => r.huesos[n].p.distanceTo(H[n].position)));
  sí(errP < 1e-6 && errQ < 1e-3 && Math.abs(r.escala - 1) < 1e-6, `${lado}: con los puntos del reposo sale el reposo (posición ${errP.toExponential(1)} m, giro ${(errQ * 57.3).toFixed(3)}°, escala ${r.escala.toFixed(3)})`);
  sí(errM < .012, `${lado}: los metacarpianos calculados caen a ${(errM * 1000).toFixed(1)} mm de los del modelo`);
  /* la mano entera girada 70°, movida y al doble */
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(.4, 1.2, -.3)), t = new THREE.Vector3(.1, -.2, -.5);
  const P2 = P.map((p) => p.clone().multiplyScalar(2).applyQuaternion(q).add(t)), r2 = pose(THREE, P2, rep);
  const errQ2 = Math.max(...NOMBRES.filter((n) => !n.endsWith('-metacarpal')).map((n) => r2.huesos[n].q.angleTo(q.clone().multiply(H[n].quaternion))));
  sí(errQ2 < 1e-3 && Math.abs(r2.escala - 2) < 1e-6, `${lado}: la mano girada, movida y al doble gira cada hueso igual (${(errQ2 * 57.3).toFixed(3)}°) y escala ${r2.escala.toFixed(2)}`);
  /* doblar el índice 60° en su nudillo: giran el proximal, intermedio y distal; el medio no */
  const P3 = P.map((p) => p.clone()), eje = new THREE.Vector3().crossVectors(P[6].clone().sub(P[5]), new THREE.Vector3().crossVectors(P[5].clone().sub(P[0]), P[17].clone().sub(P[0]))).normalize();
  const giro = new THREE.Quaternion().setFromAxisAngle(eje, 1.05); for(const i of [6, 7, 8]) P3[i] = P[i].clone().sub(P[5]).applyQuaternion(giro).add(P[5]);
  const r3 = pose(THREE, P3, rep);
  const dobla = r3.huesos['index-finger-phalanx-proximal'].q.angleTo(H['index-finger-phalanx-proximal'].quaternion), quieto = r3.huesos['middle-finger-phalanx-proximal'].q.angleTo(H['middle-finger-phalanx-proximal'].quaternion);
  sí(dobla > .9 && quieto < 1e-3, `${lado}: doblar el índice gira su hueso ${(dobla * 57.3).toFixed(0)}° y el medio se queda (${(quieto * 57.3).toFixed(2)}°)`);
}
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
