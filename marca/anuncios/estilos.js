/* LOS TRES ESTILOS DEL 16: el mismo modelo importado (Kenney, CC0) visto como dibujo de niño, como 3D
   sencillo de juguete o real. No es arte hecho aquí: es la MANERA de pintar un modelo que ya existe
   (lo que en un juego se llama «sombreado»). Carlos, 29 oct: «que inicie como dibujos estilo hechos
   por un niño, luego cambie estilo inception a modelos 3D sencillos y luego a fotorrealismo».
     crayola(obj, { t })   → cada malla con relleno de crayola (rayas en diagonal que dejan ver el papel)
                              y contorno de lápiz que «hierve» (cambia un poco cada 1/8 de segundo)
     juguete(obj)          → sombreado de tres tonos con un contorno fino
   Las dos funciones devuelven `tic(t)` para que el contorno y las rayas se muevan con el tiempo del video. */
import { THREE } from './motor.js';

const PAPEL = new THREE.Color('#F3EFE6').convertSRGBToLinear();
const comun = { uT: { value: 0 } };

/* el contorno: la malla repetida por dentro, inflada sobre sus normales (sirve con huesos: se infla
   antes del esqueleto) y pintada de un solo color de cara para adentro */
function contorno(m, { color, grosor, tiembla = 0 }){
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = comun.uT; sh.uniforms.uG = { value: grosor }; sh.uniforms.uTi = { value: tiembla };
    sh.vertexShader = 'uniform float uT, uG, uTi;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sem = floor(uT * 8.0);
      float w = 1.0 + uTi * (sin(position.x * 23.0 + sem * 1.7) * sin(position.y * 31.0 + sem * 2.3) * 0.9 + sin(position.z * 17.0 + sem));
      transformed += normalize(normal) * uG * max(0.2, w);`);
  };
  const c = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, mat) : new THREE.Mesh(m.geometry, mat);
  if(m.isSkinnedMesh){ c.bind(m.skeleton, m.bindMatrix); }
  c.castShadow = false; c.receiveShadow = false; c.frustumCulled = false; c.userData.contorno = true;
  m.add(c);   // hijo de la malla: hereda su lugar (en las con huesos, el esqueleto manda)
  if(m.isSkinnedMesh){ c.position.set(0, 0, 0); c.bindMode = m.bindMode; }
  return c;
}

/* el relleno de crayola: sobre un Lambert (para saber de qué lado le da la luz) se tira el color de la
   malla en rayas diagonales con huecos, y donde hay sombra entra una segunda capa cruzada */
function materialCrayola(viejo){
  const mat = new THREE.MeshLambertMaterial({ map: viejo.map || null, color: viejo.color ? viejo.color.clone() : new THREE.Color('#ffffff') });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = comun.uT; sh.uniforms.uPapel = { value: PAPEL };
    sh.fragmentShader = 'uniform float uT; uniform vec3 uPapel;\n' +
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }\n' +
      sh.fragmentShader.replace('#include <opaque_fragment>', `
        float sem = floor(uT * 8.0);
        vec2 fc = gl_FragCoord.xy + vec2(sem * 13.0, sem * 7.0);
        vec3 base = diffuseColor.rgb;
        float luzB = dot(base, vec3(.3, .59, .11)), luzL = dot(outgoingLight, vec3(.3, .59, .11));
        float sombra = clamp(1.0 - luzL / max(luzB, .04), 0.0, 1.0);
        float r1 = fract((fc.x * .55 + fc.y) / 19.0 + ruido(fc * .018) * 1.4);
        float trazo = smoothstep(.05, .32, r1) * smoothstep(.97, .62, r1);
        float hueco = step(.3, ruido(fc * vec2(.012, .22) + sem)) * step(.12, ruido(fc * .35));
        float cubre = clamp(trazo * hueco * (.65 + .55 * ruido(fc * .5)), 0.0, 1.0);
        float r2 = fract((fc.y * .7 - fc.x) / 15.0 + ruido(fc * .02 + 3.0) * 1.3);
        float cruz = smoothstep(.2, .55, r2) * smoothstep(.95, .7, r2) * smoothstep(.25, .6, sombra);
        vec3 col = mix(uPapel, pow(base, vec3(.85)) * 1.15, max(cubre, .1));
        col = mix(col, base * .45, cruz * .75);
        outgoingLight = col;
        #include <opaque_fragment>`);
  };
  return mat;
}

export function crayola(obj, { grosor = .024, color = '#2B2433' } = {}){
  const mallas = []; obj.traverse(o => { if(o.isMesh && !o.userData.contorno) mallas.push(o); });
  for(const m of mallas){ m.material = materialCrayola(m.material); m.castShadow = m.receiveShadow = false;
    const esc = new THREE.Vector3(); m.getWorldScale(esc); contorno(m, { color, grosor: grosor / Math.max(1e-4, esc.x), tiembla: .8 }); }
  return obj;
}

/* el 3D sencillo: tres tonos y un contorno fino morado oscuro */
let rampa = null;
function rampaToon(){ if(rampa) return rampa; const d = new Uint8Array([80, 80, 80, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  rampa = new THREE.DataTexture(d, 3, 1); rampa.minFilter = rampa.magFilter = THREE.NearestFilter; rampa.needsUpdate = true; return rampa; }
export function juguete(obj, { grosor = .006, color = '#2A1440' } = {}){
  const mallas = []; obj.traverse(o => { if(o.isMesh && !o.userData.contorno) mallas.push(o); });
  for(const m of mallas){ const v = m.material; m.material = new THREE.MeshToonMaterial({ map: v.map || null, color: v.color ? v.color.clone() : new THREE.Color('#fff'), gradientMap: rampaToon() });
    m.castShadow = m.receiveShadow = true;
    const esc = new THREE.Vector3(); m.getWorldScale(esc); contorno(m, { color, grosor: grosor / Math.max(1e-4, esc.x) }); }
  return obj;
}

/* el reloj de los dos estilos */
export const tic = (t) => { comun.uT.value = t; };
