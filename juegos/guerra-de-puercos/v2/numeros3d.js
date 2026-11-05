/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LOS NÚMEROS EN 3D
   Carlos: «que los números de daño se hagan 3D». Salen de la MISMA letra de la
   interfaz (Lilita One, OFL): `numeros.json` guarda el contorno de los dígitos
   ya aplanado, sacado de `fuentes/lilita.woff2` con fontTools. Así el número
   que forcejea en la mesa es el mismo número que se lee en los botones, y no
   hace falta cargar una letra aparte en formato de three.js.
   ═══════════════════════════════════════════════════════════════════════════ */
import { THREE } from './escena.js';

let DATOS = null;
export async function cargarNumeros(){ if(!DATOS) DATOS = await (await fetch('numeros.json')).json(); return DATOS; }

const formas = new Map(), geos = new Map();
function formasDe(ch){
  if(formas.has(ch)) return formas.get(ch);
  const g = DATOS.g[ch === '-' ? '−' : ch] || DATOS.g[ch]; if(!g){ formas.set(ch, null); return null; }
  const sp = new THREE.ShapePath();
  for(const c of g.c){ sp.moveTo(c[0][0], c[0][1]); for(let i = 1; i < c.length; i++) sp.lineTo(c[i][0], c[i][1]); }
  /* TrueType dibuja el contorno de fuera en un sentido y los huecos (el del
     0, el del 8) en el otro: `toShapes` los separa solo. */
  const f = { shapes: sp.toShapes(true), w: g.w };
  formas.set(ch, f); return f;
}

/* Un número como objeto 3D: cara de color, canto oscuro y un contorno negro
   detrás, como el plumón de la autora. `alto` es el alto de la cifra. */
export function numero3d(texto, { alto = .6, color = '#FFF0F6', canto = '#1B0E16' } = {}){
  const g = new THREE.Group(), k = alto / DATOS.upm * 1.35;
  const matCara = new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .1, emissive: color, emissiveIntensity: .25 });
  const matCanto = new THREE.MeshStandardMaterial({ color: canto, roughness: .6 });
  let x = 0;
  const piezas = [];
  for(const ch of String(texto)){
    const f = formasDe(ch); if(!f){ x += DATOS.upm * .3; continue; }
    /* la geometría de cada cifra se hace UNA vez: el número que cuenta de 74 a
       15 cambia sesenta veces en medio segundo y no puede extruir cada vez */
    if(!geos.has(ch)) geos.set(ch, new THREE.ExtrudeGeometry(f.shapes, { depth: 150, bevelEnabled: true, bevelThickness: 40, bevelSize: 18, bevelSegments: 2, curveSegments: 4 }));
    const m = new THREE.Mesh(geos.get(ch), [matCara, matCanto]);
    m.position.x = x; piezas.push(m); g.add(m);
    x += f.w;
  }
  for(const m of piezas) m.position.x -= x / 2;
  g.scale.set(k, k, k);
  /* centrado en alto: los dígitos de Lilita van de 0 a ~700 unidades */
  for(const m of piezas) m.position.y -= DATOS.upm * .36;
  g.traverse(o => { if(o.isMesh) o.castShadow = true; });
  g.userData = { texto: String(texto), matCara };
  return g;
}
/* las geometrías son compartidas (caché): sólo se sueltan los materiales */
export function soltar(n){ n.traverse(o => { if(o.isMesh) [].concat(o.material).forEach(m => m.dispose()); }); n.removeFromParent(); }
