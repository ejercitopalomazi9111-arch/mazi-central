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
  return { obj, cuerpo, clips,
    /* deja la pose: cada entrada [clip, segundo dentro del clip, peso]; los segundos dan la vuelta */
    anima(lista){
      for(const a of Object.values(acciones)){ a.enabled = false; }
      for(const [n, t, peso = 1, vuelta = true] of lista){ const c = clips[n]; if(!c) continue;
        const a = acciones[n] ||= mixer.clipAction(c); a.enabled = true; a.play(); a.setEffectiveWeight(peso);
        a.time = vuelta ? ((t % c.duration) + c.duration) % c.duration : Math.min(Math.max(0, t), c.duration - 1e-3); }
      mixer.update(0);
    } };
}
