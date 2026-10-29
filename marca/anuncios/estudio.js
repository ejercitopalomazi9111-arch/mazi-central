/* EL ESTUDIO DE PRODUCTO: los aparatos de verdad (modelos 3D bajados, no hechos aquí; Carlos, 29 oct:
   «los modelos 3D no los hagas tú, te quedan muy chafas») listos para animarse en los anuncios formales.
   Cada aparato sale normalizado (el frente mira a +z, la base en y = 0, centrado) y con sus partes
   móviles a la mano:
     const L = await laptop3d({ ancho: 1.6 });  L.abrir(0..1) · L.pantalla(textura) · L.teclas(0..1)
     const K = await camara3d({ largo: .9 });   K.anillo (el del foco, para girarlo)
     const D = await computadora3d({ alto: 1 }); D.pantalla(textura)
   Créditos y licencias en modelos/CREDITOS.md (CC BY: se nombra al autor en la descripción del post). */
import { THREE } from './motor.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

const cargar = (archivo) => new GLTFLoader().loadAsync(new URL(archivo, import.meta.url).href).then(g => g.scene);
const caja = (o) => new THREE.Box3().setFromObject(o);

/* una textura de pantalla: la imagen ocupa toda la pantalla y brilla sola (no la apaga la luz) */
export function materialPantalla(tex, { brillo = 1 } = {}){
  return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(brillo, brillo, brillo), toneMapped: false });
}

/* LA LAPTOP · «gaming_laptop» de sabrito84 (Sketchfab, CC BY). En el archivo el frente mira a +x, la
   bisagra está en x = −1.23, y = 0.125, y la tapa viene abierta 12° pasada de la vertical. */
export async function laptop3d({ ancho = 1.6 } = {}){
  const m = await cargar('./modelos/laptop/laptop.glb'); m.updateMatrixWorld(true);
  let tapa, base, pantalla, teclado;
  m.traverse(o => { if(o.name === 'Cube001_1_3') tapa = o; if(o.name === 'Cube003_2_12') base = o;
    if(o.isMesh && o.material.name === 'Material.004') pantalla = o; if(o.isMesh && o.material.name === 'Material.010') teclado = o; });
  /* la bisagra: la tapa se cuelga de un pivote para que gire desde ahí */
  const piv = new THREE.Group(); piv.position.set(-1.228, .125, 0); tapa.parent.add(piv);
  piv.updateMatrixWorld(true); piv.attach(tapa);
  const ABIERTA = 0, CERRADA = -1.786;                                  // 102° hacia adelante: queda sobre el teclado
  /* el frente a +z y del tamaño pedido; la base en el suelo */
  const g = new THREE.Group(), dentro = new THREE.Group(); dentro.add(m); g.add(dentro);
  dentro.rotation.y = -Math.PI / 2; const k = ancho / 4.0; dentro.scale.setScalar(k); dentro.position.set(0, .131 * k, -.04 * k);
  g.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  /* el teclado de colores brilla de verdad cuando se prende */
  const mt = teclado.material; mt.emissive = new THREE.Color('#ffffff'); mt.emissiveMap = mt.map; mt.emissiveIntensity = 0;
  const mp = pantalla.material;
  return { grupo: g, tapa, base, piv, k,
    /* 0 = cerrada, 1 = abierta como viene (un poco pasada de la vertical) */
    abrir(u){ piv.rotation.z = CERRADA + (ABIERTA - CERRADA) * u; },
    teclas(u){ mt.emissiveIntensity = u * 1.3; },
    pantalla(tex, o){ pantalla.material = tex ? materialPantalla(tex, o) : mp; return pantalla.material; },
    malla: pantalla };
}

/* LA CÁMARA DE CINE · «Cinema Camera» de re1monsen (Sketchfab, CC BY). Trae un piso propio que se quita. */
export async function camara3d({ largo = .9 } = {}){
  const m = await cargar('./modelos/camara-cine/camara.glb');
  const fuera = []; m.traverse(o => { if(o.isMesh && o.material.name === 'ground') fuera.push(o); }); fuera.forEach(o => o.removeFromParent());
  m.updateMatrixWorld(true);
  const b = caja(m), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const g = new THREE.Group(), dentro = new THREE.Group(); dentro.add(m); g.add(dentro);
  const k = largo / Math.max(t.x, t.z); dentro.scale.setScalar(k); dentro.position.set(-c.x * k, -b.min.y * k, -c.z * k);
  g.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  return { grupo: g, dentro, k, tam: t.clone().multiplyScalar(k) };
}

/* LA COMPUTADORA DE ESCRITORIO · «All In One Computer» de Sean (Sketchfab, CC BY): pantalla, teclado y
   mouse. Es una sola malla, así que la pantalla nuestra va en un plano pegado al frente. */
export async function computadora3d({ alto = 1 } = {}){
  const m = await cargar('./modelos/computadora/computadora.glb'); m.updateMatrixWorld(true);
  const b = caja(m), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const g = new THREE.Group(), dentro = new THREE.Group(); dentro.add(m); g.add(dentro);
  const k = alto / t.y; dentro.scale.setScalar(k); dentro.position.set(-c.x * k, -b.min.y * k, -c.z * k);
  g.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#000' })); plano.visible = false; g.add(plano);
  return { grupo: g, k, tam: t.clone().multiplyScalar(k), plano,
    /* donde va la pantalla, en las medidas ya normalizadas: centro, ancho y alto */
    pantalla(tex, { x = 0, y = .625, z = -.2105, w = 1.09, h = .75, giro = -.526, brillo = 1 } = {}){
      plano.visible = !!tex; if(!tex) return; plano.material = materialPantalla(tex, { brillo });
      plano.position.set(x, y, z); plano.rotation.x = giro; plano.scale.set(w, h, 1); return plano.material; } };
}

/* una textura de imagen del repo o del rato */
export async function textura(src, { repetir = false } = {}){
  const img = new Image(); img.src = src; await img.decode();
  const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  if(repetir){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

/* LA LUZ DE RENDIJA: una tira de luz que barre el piso y el aparato (la de la referencia de la laptop
   morada, vista cuadro por cuadro). Es un foco con una máscara de persiana: SpotLight.map. */
export function rendija({ color = '#ffffff', intensidad = 60, rayas = 1, angulo = .5 } = {}){
  const k = document.createElement('canvas'); k.width = k.height = 256; const x = k.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
  const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, '#000'); g.addColorStop(.42, '#000'); g.addColorStop(.5, '#fff'); g.addColorStop(.58, '#000'); g.addColorStop(1, '#000');
  for(let i = 0; i < rayas; i++){ x.save(); x.translate((i - (rayas - 1) / 2) * 256 / (rayas + 1), 0); x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.restore(); }
  const tex = new THREE.CanvasTexture(k); tex.colorSpace = THREE.SRGBColorSpace;
  const l = new THREE.SpotLight(color, intensidad, 30, angulo, .25, 1.2); l.map = tex;
  l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -.0003; l.shadow.normalBias = .02; l.shadow.radius = 3;
  return l;
}

/* el piso del estudio: oscuro y satinado, que agarre el reflejo del HDRI y la sombra */
export function piso({ color = '#0E0A12', aspereza = .32, tam = 40 } = {}){
  const p = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), new THREE.MeshStandardMaterial({ color, roughness: aspereza, metalness: .1 }));
  p.rotation.x = -Math.PI / 2; p.receiveShadow = true; return p;
}
