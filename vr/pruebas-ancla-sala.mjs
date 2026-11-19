/* MAZI VR · el menú en su lugar del cuarto entre sesiones (ancla.js: respectoAncla / desdeAncla).
   Sesión 1: el menú queda en un lugar respecto a la hoja. Sesión 2: el motor arranca con OTRO mundo (el giroscopio del
   iPhone empieza con otro rumbo y otro origen), así que la misma hoja aparece en otra pose; el menú tiene que caer en el
   MISMO lugar del cuarto real, o sea, movido igual que la hoja.
     node vr/pruebas-ancla-sala.mjs */
import { respectoAncla, desdeAncla } from './ancla.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
/* un cambio de mundo: girar θ alrededor de y y trasladar T (lo que cambia entre una sesión y otra) */
const mundo = (th, T) => (p) => { const c = Math.cos(th), s = Math.sin(th), [x, y, z] = p.pos; return { pos: [c * x + s * z + T[0], y + T[1], -s * x + c * z + T[2]], yaw: Math.atan2(Math.sin(p.yaw + th), Math.cos(p.yaw + th)) }; };
const dist = (a, b) => Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
const dyaw = (a, b) => Math.abs(Math.atan2(Math.sin(a.yaw - b.yaw), Math.cos(a.yaw - b.yaw))) * 180 / Math.PI;
const hoja1 = { pos: [.3, -.55, -.8], yaw: .4 }, menu1 = { pos: [-.4, 0, -1.9], yaw: .15 };
const rel = respectoAncla(menu1, hoja1);
sí(dist(desdeAncla(rel, hoja1), menu1) < 1e-9 && dyaw(desdeAncla(rel, hoja1), menu1) < 1e-9, 'ida y vuelta en la misma sesión da el mismo lugar');
for(const [th, T] of [[1.2, [2, 0, -1]], [-2.7, [-.5, .1, 3]], [Math.PI, [0, 0, 0]]]){
  const W = mundo(th, T), hoja2 = W(hoja1), esperado = W(menu1), puesto = desdeAncla(rel, hoja2);
  sí(dist(puesto, esperado) < 1e-9 && dyaw(puesto, esperado) < 1e-9, `otra sesión (mundo girado ${(th * 180 / Math.PI).toFixed(0)}° y movido): el menú cae en el mismo lugar del cuarto`);
}
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
