/* EL CINE: lo que hace que un anuncio se vea «de After Effects» y no de diapositivas (lo pidió Carlos el
   29 de octubre con la referencia de ugoki, vista cuadro por cuadro):
     · una sola cámara que viaja por un solo espacio 3D, en vez de cortes;
     · desenfoque de profundidad (lo que no está en foco se deshace) que se mueve con la cámara;
     · desenfoque de movimiento de verdad: cada cuadro es el promedio de varios subcuadros dentro del
       tiempo del obturador, así lo que gira rápido deja estela;
     · brillo (bloom) en lo que emite luz.
   Todo se pinta en un lienzo 2D visible; WebGL trabaja en uno escondido.
     const C = cine($('#c'), { sub: 6 });
     window.pintar = (t) => C.cuadro(t, (tk) => { … mueve la escena y la cámara al segundo tk …; return { foco: 6, apertura: .004 }; });
   palabra3d('Hazlo', { alto: 1 }) arma una palabra en 3D con la letra de la casa (Space Grotesk Bold). */
import { THREE, W, H, HDR } from './motor.js';
import { EffectComposer } from './vendor/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/postprocessing/UnrealBloomPass.js';
import { BokehPass } from './vendor/postprocessing/BokehPass.js';
import { OutputPass } from './vendor/postprocessing/OutputPass.js';
import { extruir } from './logo3d.js';
import { LETRAS } from './letras3d.js';

export function cine(visible, { fov = 32, sub = 6, obturador = .55, bloom = [.85, .55, .78] } = {}){
  const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
  const r = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping;
  const s = new THREE.Scene(); s.background = new THREE.Color('#0B0612');
  const pm = new THREE.PMREMGenerator(r); if(HDR) s.environment = pm.fromEquirectangular(HDR).texture; s.environmentIntensity = .8;
  const cam = new THREE.PerspectiveCamera(fov, W / H, .05, 300);
  const composer = new EffectComposer(r); composer.setSize(W, H);
  const dof = new BokehPass(s, cam, { focus: 8, aperture: 0, maxblur: .012 });
  const brillo = new UnrealBloomPass(new THREE.Vector2(W, H), ...bloom);
  composer.addPass(new RenderPass(s, cam)); composer.addPass(dof); composer.addPass(brillo); composer.addPass(new OutputPass());
  const x = visible.getContext('2d');
  return { r, s, cam, dof, brillo,
    /* un cuadro: `pinta(tk)` acomoda todo al segundo tk y devuelve el foco y la apertura; el obturador
       abre `obturador` de un cuadro hacia atrás, repartido en `sub` subcuadros */
    cuadro(t, pinta, { fps = 30, n = sub } = {}){
      for(let k = 0; k < n; k++){
        const tk = t - (n > 1 ? obturador / fps * (k / (n - 1)) : 0);
        const o = pinta(tk) || {};
        dof.uniforms.focus.value = o.foco ?? 8; dof.uniforms.aperture.value = o.apertura ?? 0; dof.uniforms.maxblur.value = o.maxblur ?? .012;
        dof.enabled = (o.apertura ?? 0) > 0;
        brillo.strength = o.brillo ?? bloom[0];
        composer.render();
        x.globalAlpha = 1 / (k + 1); x.drawImage(gl, 0, 0);
      }
      x.globalAlpha = 1;
    } };
}

/* una palabra en 3D, centrada en x, con la base de las letras en y = 0; ancho en `userData.ancho` */
const geos = {};
export function palabra3d(txt, { alto = 1, hondo = .18, mat = null, espacio = .06 } = {}){
  const k = alto / 100, g = new THREE.Group(); let xx = 0;
  const m = mat || new THREE.MeshStandardMaterial({ color: '#F4EEF2', roughness: .35, metalness: .1 });
  for(const ch of txt){
    if(ch === ' '){ xx += 26 * k; continue; }
    const L = LETRAS[ch]; if(!L){ xx += 40 * k; continue; }
    const clave = ch + '|' + alto + '|' + hondo;
    const geo = geos[clave] ||= extruir(L.d, { k, hondo: hondo * alto, bisel: .012 * alto });
    const me = new THREE.Mesh(geo, m); me.position.x = xx; me.userData.letra = ch; g.add(me);
    xx += L.w * k + espacio * alto * .1;
  }
  g.children.forEach(c => c.position.x -= xx / 2);
  g.userData.ancho = xx;
  return g;
}

/* un letrero plano con letra del navegador, nítido (para lo chico: la línea de abajo, el WhatsApp) */
export function letrero(txt, { px = 120, peso = 700, familia = '"Space Grotesk"', color = '#F4EEF2', alto = .3, fondo = null, pad = .5 } = {}){
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = `${peso} ${px}px ${familia}`;
  const w = Math.ceil(x.measureText(txt).width + px * pad * 2), h = Math.ceil(px * 1.5);
  c.width = w; c.height = h; x.font = `${peso} ${px}px ${familia}`; x.textBaseline = 'middle';
  if(fondo){ x.fillStyle = fondo; x.beginPath(); x.roundRect(0, 0, w, h, h / 2); x.fill(); }
  x.fillStyle = color; x.fillText(txt, px * pad, h / 2 + px * .04);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * w / h, alto), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  return m;
}
