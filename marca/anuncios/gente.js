/* LA GENTE DE LOS ANUNCIOS: los «Mini Characters» de Kenney (CC0, kenney.nl), con sus animaciones
   (idle, walk, sprint, jump, sit, emote-yes, emote-no, interact-right, pick-up, holding-both…).
   Carlos, 29 oct: «deja de hacer tú los modelos, te quedan muy chafas, usa los gratuitos de
   internet». Reemplazan a los cubitos de personajes.js.
     const toño = await persona('male-c', { alto: 1.1 });  escena.add(toño.obj);
     toño.anima([['idle', t]]);                     // un cuadro: la pose del segundo t
     toño.anima([['idle', t, .3], ['emote-yes', t - t0, .7]]);   // dos mezcladas, con su peso
   Es por cuadro y sin reloj propio: el mismo t da siempre la misma pose (el video se arma cuadro a
   cuadro). Personajes: male-a…f, female-a…f. */
import { THREE } from './motor.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { clone } from './vendor/utils/SkeletonUtils.js';

const cache = {};
export async function persona(nombre, { alto = 1 } = {}){
  const url = new URL(`./modelos/kenney-personas/character-${nombre}.glb`, import.meta.url).href;
  const g = await (cache[url] ||= new GLTFLoader().loadAsync(url));
  const cuerpo = clone(g.scene);
  cuerpo.traverse(m => { if(m.isMesh){ m.castShadow = true; m.receiveShadow = true; if(m.material.map) m.material.map.anisotropy = 8; } });
  /* de pie en el piso (y = 0) y del alto pedido */
  const b = new THREE.Box3().setFromObject(cuerpo), h = b.max.y - b.min.y, k = alto / h;
  cuerpo.scale.setScalar(k); cuerpo.position.y = -b.min.y * k;
  const obj = new THREE.Group(); obj.add(cuerpo);
  const mixer = new THREE.AnimationMixer(cuerpo), clips = Object.fromEntries(g.animations.map(a => [a.name, a]));
  const acciones = {};
  return { obj, cuerpo, clips, hueso: (n) => cuerpo.getObjectByName(n),
    /* deja la pose: cada entrada [clip, segundo dentro del clip, peso]; los segundos dan la vuelta */
    anima(lista){
      for(const a of Object.values(acciones)){ a.enabled = false; }
      for(const [n, t, peso = 1, vuelta = true] of lista){ const c = clips[n]; if(!c) continue;
        const a = acciones[n] ||= mixer.clipAction(c); a.enabled = true; a.play(); a.setEffectiveWeight(peso);
        a.time = vuelta ? ((t % c.duration) + c.duration) % c.duration : Math.min(Math.max(0, t), c.duration - 1e-3); }
      mixer.update(0);
    } };
}

/* EL GUION DEL CUERPO: una lista de [desde qué segundo, clip, { vel, una }] ordenada; en cada cuadro actúa
   el clip del tramo y se funde con el anterior en `fundido` segundos. `una: true` lo deja quieto al
   terminar (un «sí» con la cabeza no se repite), `vel` lo acelera o lo frena.
     actuar(toño, t, [[0, 'idle'], [3.2, 'emote-no', { una: true }], [4.5, 'interact-right', { una: true }]]); */
export function actuar(p, t, plan, fundido = .28){
  let i = -1; for(let k = 0; k < plan.length; k++) if(t >= plan[k][0]) i = k;
  if(i < 0){ p.anima([[plan[0][1], 0]]); return; }
  const seg = (k) => { const [t0, clip, o = {}] = plan[k]; return [clip, (t - t0) * (o.vel || 1), 1, !o.una]; };
  const u = i > 0 ? Math.min(1, (t - plan[i][0]) / fundido) : 1;
  if(u >= 1 || plan[i - 1][1] === plan[i][1]) p.anima([seg(i)]);
  else { const a = seg(i - 1), b = seg(i); a[2] = 1 - u; b[2] = u; p.anima([a, b]); }
}

/* LOS MUEBLES: el «Furniture Kit» de Kenney (CC0), de la misma familia que la gente. Vienen con la esquina en
   el origen; aquí se centran en x y z y se paran en y = 0. Una persona de alto 1 mide como un refri de 0.5.
   Con { pantalla: textura } la pantalla de la laptop o del monitor (el único cuadro gris de dos triángulos)
   enseña esa imagen.
     const barra = await mueble('kitchenBar', { escala: 2 }); */
export async function mueble(nombre, { escala = 1, pantalla = null, tapa = null } = {}){
  const url = new URL(`./modelos/kenney-muebles/${nombre}.glb`, import.meta.url).href;
  const g = await (cache[url] ||= new GLTFLoader().loadAsync(url));
  const m = g.scene.clone(true), extra = [];
  m.traverse(o => { if(!o.isMesh) return; o.castShadow = o.receiveShadow = true;
    o.material = o.material.clone(); o.material.roughness = Math.max(.45, o.material.roughness); o.material.metalness = Math.min(.3, o.material.metalness);
    if(pantalla && o.material.name === 'metal' && o.geometry.index.count === 6){
      /* la pantalla: UV por proyección sobre su propio rectángulo, y la imagen que brilla un poco */
      const geo = o.geometry.clone(), p = geo.attributes.position, idx = [...geo.index.array];
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9, zs = 0; for(const i of idx){ zs += p.getZ(i) / idx.length; x0 = Math.min(x0, p.getX(i)); x1 = Math.max(x1, p.getX(i)); y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
      const uv = new Float32Array(p.count * 2); for(let i = 0; i < p.count; i++){ uv[i * 2] = (p.getX(i) - x0) / (x1 - x0); uv[i * 2 + 1] = (p.getY(i) - y0) / (y1 - y0); }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); o.geometry = geo;
      o.material = new THREE.MeshStandardMaterial({ map: pantalla, emissive: '#ffffff', emissiveMap: pantalla, emissiveIntensity: .55, roughness: .35 });
      /* la tapa por detrás (las calcomanías de la laptop): un cuadro pegado atrás de la pantalla, viendo para atrás */
      if(tapa){ const n = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, idx[0]).normalize(), q = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) * 1.06, (y1 - y0) / Math.max(.3, n.z) * 1.06), new THREE.MeshStandardMaterial({ map: tapa, roughness: .6 }));
        q.position.set((x0 + x1) / 2, (y0 + y1) / 2, zs).addScaledVector(n, -.035); q.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().negate()); extra.push([o, q]); } } });
  extra.forEach(([o, q]) => o.add(q));
  const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3());
  m.position.set(-c.x, -b.min.y, -c.z);
  const obj = new THREE.Group(); obj.add(m); obj.scale.setScalar(escala);
  return obj;
}
