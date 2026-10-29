/* LO DE LOS ANUNCIOS FORMALES (14 y 15). Salió de revisar cuadro por cuadro anuncios de producto de
   estudios de 3D (una laptop morada bajo una rendija de luz, un anillo, un cargador, una cámara de
   seguridad, una laptop que sale de su pantalla), bajados de Dribbble el 29 de octubre:
     · CORTES SECOS sobre el golpe de la música, cada 1.5–3 s, y cada toma con UN solo movimiento lento
       (empuje, deslizamiento o giro corto); nada de la cámara que nunca corta del 13;
     · MACROS con poca profundidad de campo: el borde, la bisagra, el teclado; el aparato entero casi
       nunca se ve hasta la mitad;
     · LA LUZ COMO REVELACIÓN: primero oscuro, una rendija barre, las teclas se prenden en ola;
     · CORTE DE CONTINUIDAD: el aparato queda en el mismo lugar del cuadro y lo que cambia es el fondo;
     · LETRA CHICA Y CALLADA: un renglón a la vez, entra subiendo de una máscara, sin rebotes.
   tomas(lista) reparte el tiempo: cada toma { t0, t1, de, a, foco } con de/a = [posición, mira, giro]. */
import { THREE, PAL, cl, tramo, sale, entra, mezcla, resorte } from './motor.js';
import { logo3d } from './logo3d.js';
import { letrero } from './cine.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const curva = (u) => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;   // de entrada y de salida
export const lenta = (u) => 1 - Math.pow(1 - u, 2.2);                                      // arranca y se frena

/* las tomas: dentro de cada una la cámara va de «de» a «a»; entre una y otra, corte seco */
export function tomas(cam, lista){
  const toma = (t) => { let k = 0; while(k < lista.length - 1 && t >= lista[k + 1].t0) k++; return lista[k]; };
  return { lista, toma,
    /* acomoda la cámara al segundo t; devuelve el foco y la apertura */
    poner(t){
      const T = toma(t), u = (T.ease || lenta)(tramo(t, T.t0, T.t1));
      const p = typeof T.de === 'function' ? T.de(t) : T.de, q = typeof T.a === 'function' ? T.a(t) : T.a;
      cam.position.lerpVectors(p[0], q[0], u); const mira = p[1].clone().lerp(q[1], u);
      const g = mezcla(p[2] || 0, q[2] || 0, u); cam.up.set(Math.sin(g), Math.cos(g), 0);
      if(T.fov){ cam.fov = mezcla(T.fov[0], T.fov[1], u); cam.updateProjectionMatrix(); }
      /* un pulso de mano casi nada: la cámara de estudio no está muerta, pero tampoco tiembla */
      cam.position.x += Math.sin(t * .9) * .004; cam.position.y += Math.sin(t * 1.3 + 1) * .003;
      cam.lookAt(mira); cam.updateMatrixWorld();
      return { foco: T.foco ?? cam.position.distanceTo(mira), apertura: T.ap ?? 0, toma: T };
    } };
}

/* LOS RENGLONES: HTML encima del 3D. Cada uno entra subiendo de una máscara y sale igual hacia arriba.
   renglones(el, [{ t, hasta, texto, clase }]) → pintar(t) */
export function renglones(el, lista){
  const nodos = lista.map(r => { const d = document.createElement('div'); d.className = 'r ' + (r.clase || '');
    d.style.top = r.y + 'px'; if(r.alinear) d.style.textAlign = r.alinear;
    d.innerHTML = r.texto.split('\n').map(l => `<span class="m"><span class="i">${l}</span></span>`).join(''); el.appendChild(d); return d; });
  return (t) => lista.forEach((r, k) => { const d = nodos[k];
    d.querySelectorAll('.i').forEach((s, i) => { const a = r.t + i * (r.paso ?? .12);
      const ent = sale(tramo(t, a, a + (r.dur ?? .7))), sal = entra(tramo(t, r.hasta - .35 + i * .05, r.hasta + i * .05));
      const y = (1 - ent) * 105 - sal * 105; s.style.transform = `translateY(${y.toFixed(2)}%)`;
      s.style.opacity = (ent * (1 - sal)).toFixed(3); s.style.filter = ent < 1 ? `blur(${((1 - ent) * 8).toFixed(1)}px)` : ''; });
    d.style.display = t >= r.t - .05 && t <= r.hasta + .5 ? '' : 'none'; });
}

/* EL CIERRE: la M cubo de siempre (logo3d) en su propio rincón del mundo, con la cámara que llega
   a la vista isométrica, el lema y el WhatsApp. cierre(s, cam, { donde, desde, fov }) */
export function cierre(s, cam, { donde = V3(0, 200, 0), desde, fov = 32 } = {}){
  const L = logo3d({ hondo: .22 }); L.grupo.position.copy(donde); L.grupo.scale.setScalar(.36); s.add(L.grupo);
  L.matL[0].emissiveIntensity = .02; L.matL[0].color.set('#E4DDEA');
  const ISOv = V3(1, 1, 1).normalize(), aspecto = 1080 / 1920;
  const dLogo = (L.medio * 2 * .36 * 1.2) / (2 * Math.tan(fov * Math.PI / 360) * aspecto);
  const lLema = letrero('Si no existe la herramienta, se construye.', { px: 64, peso: 600, familia: '"Inter Tight"', color: '#E9E1EF', alto: .12 }); s.add(lLema);
  const lWa = letrero('WhatsApp  442 883 3786', { px: 80, peso: 800, familia: '"Inter Tight"', color: '#F4F4F4', alto: .14, fondo: '#178A42' }); s.add(lWa);
  const centro = donde.clone().add(V3(0, -.5, 0));
  return { L,
    /* las dos paradas de la cámara: lejos y desenfocado, y la vista isométrica final */
    lejos: [donde.clone().addScaledVector(V3(1.25, .8, 1).normalize(), dLogo * 1.35), donde.clone().add(V3(0, .05, 0)), 0],
    cerca: [centro.clone().addScaledVector(ISOv, dLogo * 1.04), centro, 0],
    final: [centro.clone().addScaledVector(ISOv, dLogo), centro, 0],
    pintar(t){
      const B = desde, vis = t > B - .1; L.grupo.visible = vis;
      const flota = sale(tramo(t, B, B + .3)), cae = tramo(t, B + .3, B + .62);
      L.m.position.y = cae > 0 ? (1 - entra(cae)) * .9 : .9 + (1 - flota) * 2;
      L.cuna.position.y = (1 - sale(tramo(t, B - .05, B + .3))) * 2.5;
      L.mat[0].emissiveIntensity = .35 + 2.6 * Math.max(0, 1 - Math.abs(t - (B + .62)) / .2);
      L.letras.forEach((h, i) => { const u = sale(tramo(t, B + .5 + i * .07, B + .95 + i * .07)); h.visible = u > 0; h.position.copy(h.userData.casa); h.position.y += (1 - u) * -.4; h.rotation.x = (1 - u) * -Math.PI / 2; });
      L.grupo.updateMatrixWorld(true);
      lLema.visible = lWa.visible = vis;
      lLema.position.copy(L.plano.localToWorld(V3(0, -1.25, 0))); lLema.quaternion.setFromRotationMatrix(L.plano.matrixWorld); lLema.material.opacity = sale(tramo(t, B + 1.6, B + 2.2));
      lWa.position.copy(L.plano.localToWorld(V3(0, -1.95, 0))); lWa.quaternion.copy(lLema.quaternion); lWa.material.opacity = sale(tramo(t, B + 2.1, B + 2.6)); lWa.scale.setScalar(.8 + .2 * resorte(tramo(t, B + 2.1, B + 2.7)));
    } };
}

/* fondos pegados a la cámara (así cambian de golpe en un corte de continuidad) */
export function fondos(cam, colores){
  const radial = ([a, b, c]) => { const k = document.createElement('canvas'); k.width = k.height = 512; const x = k.getContext('2d');
    const g = x.createRadialGradient(256, 220, 0, 256, 256, 330); g.addColorStop(0, a); g.addColorStop(.55, b); g.addColorStop(1, c); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(k); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const o = {}; for(const [n, c] of Object.entries(colores)){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radial(c), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    m.position.z = -90; m.scale.set(80, 80 * 1920 / 1080 * .62, 1); m.renderOrder = -10; m.visible = false; cam.add(m); o[n] = m; }
  o.solo = (n, alfa = 1) => { for(const k of Object.keys(colores)){ o[k].visible = k === n; o[k].material.opacity = alfa; } };
  return o;
}
