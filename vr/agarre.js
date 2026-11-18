/* MAZI VR · agarrar una pantalla con las dos manos (Carlos, 18 nov: «si lo tomo de las dos esquinas lo pueda hacer más
   chico, más grande, ponerlo encima de mí, moverlo, en diagonal… para seguir viendo mientras estoy acostado»).
   Con las DOS manos pellizcando:
     · la pantalla gira alrededor de tu cabeza siguiendo hacia dónde están tus manos (arriba, abajo, de lado, encima);
       siempre queda de frente a ti;
     · separar las manos la agranda y juntarlas la achica.
   Sólo usa hacia DÓNDE están las manos (no qué tan lejos), que es lo que el rastreo da bien.
   `soporte` es un grupo con origen en tu cabeza; la pantalla va adentro, enfrente. */
export function crearAgarre(V, { soporte, getEscala, setEscala, min = .35, max = 3.5 }){
  const { THREE } = V;
  let g = null;
  const cab = new THREE.Vector3(), pq = new THREE.Quaternion(), dq = new THREE.Quaternion();
  return function cuadro(){
    const pin = (V.extra.manos || []).filter((m) => m.pellizco && m.mundo?.indice);
    if(pin.length < 2){ if(g){ g = null; V.hud('Listo', .6); } return false; }
    V.cabeza.getWorldPosition(cab);
    const d = pin.slice(0, 2).map((m) => m.mundo.indice.clone().sub(cab).normalize());
    const centro = d[0].clone().add(d[1]).normalize(), ang = Math.max(.04, d[0].angleTo(d[1]));
    if(!g){ g = { q0: soporte.quaternion.clone(), c0: centro.clone(), a0: ang, e0: getEscala() }; V.hud('Moviendo', .8); }
    /* el giro que lleva la dirección de antes a la de ahora, en el espacio del papá del soporte */
    soporte.parent.getWorldQuaternion(pq);
    dq.setFromUnitVectors(g.c0, centro);
    const local = pq.clone().invert().multiply(dq).multiply(pq);
    soporte.quaternion.copy(local.multiply(g.q0));
    setEscala(Math.max(min, Math.min(max, g.e0 * ang / g.a0)));
    return true;
  };
}
