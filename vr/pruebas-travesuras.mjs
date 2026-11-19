/* Las travesuras del jugador (monarca/travesuras.js), en Node: para cada locura, una foto falsa del jugador haciéndola
   y la reacción que debe salir; y que lo normal (mirar el cartel, escuchar, contestar) NO dispare nada.
     node vr/pruebas-travesuras.mjs */
import { crearTravesuras } from './monarca/travesuras.js';
import { LINEAS } from './monarca/narrador.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const R = Math.PI / 180;
/* corre `seg` segundos a 30 cuadros por segundo; `foto(t)` arma la foto; regresa lo que haya dicho */
function correr(tr, seg, foto, t0 = 0){ const dichos = []; for(let i = 0; i <= seg * 30; i++){ const t = t0 + i / 30; const r = tr.paso({ t, ...foto(t) }); if(r) dichos.push(r); } return dichos; }
const normal = () => ({ yaw: 0, pitch: 0, roll: 0, explicando: true, ocupado: true });
const caso = (nombre, foto, seg, espera, extra = {}) => { const tr = crearTravesuras(extra.op); correr(tr, 2, normal); const d = correr(tr, seg, foto, 2);
  sí(d.includes(espera), `${nombre} → ${espera}${d.length ? ` (dijo: ${d.join(', ')})` : ' (no dijo nada)'}`); return d; };

/* lo normal no dispara nada */
{ const tr = crearTravesuras(); let k = 3; const az = () => ((k = (k * 16807) % 2147483647) / 2147483647 - .5);
  const d = correr(tr, 60, (t) => ({ yaw: az() * 6 * R + Math.sin(t) * 10 * R, pitch: az() * 4 * R, roll: az() * 3 * R, explicando: true, ocupado: true, manos: [] }));
  sí(!d.length, `un minuto escuchando y viendo el cartel (moviéndose como persona): ni una reacción${d.length ? ' (dijo ' + d.join(', ') + ')' : ''}`); }

/* la cabeza */
caso('ver a otro lado mientras explica', () => ({ ...normal(), yaw: 100 * R }), 4, 'r-lejos-1');
caso('darle la espalda', () => ({ ...normal(), yaw: 170 * R }), 4, 'r-atras-mira');
caso('ver el piso', () => ({ ...normal(), pitch: -70 * R }), 4, 'r-piso');
caso('ver el cielo', () => ({ ...normal(), pitch: 70 * R }), 4, 'r-cielo');
caso('ladear la cabeza', () => ({ ...normal(), roll: 50 * R }), 4, 'r-ladeado');
caso('dar vueltas', (t) => ({ ...normal(), explicando: false, yaw: ((t * 200) % 360 - 180) * R }), 4, 'r-vueltas-1');
caso('decir que no con la cabeza', (t) => ({ ...normal(), yaw: Math.sin(t * 14) * 20 * R }), 2, 'r-no-cabeza');
caso('asentir sin parar', (t) => ({ ...normal(), pitch: Math.sin(t * 14) * 20 * R }), 2, 'r-si-cabeza');
caso('dejar el visor en la mesa (cero movimiento)', () => ({ ...normal(), conGiro: true, explicando: false, yaw: .5 * R, pitch: -10 * R }), 22, 'r-sin-cabeza');
{ const tr = crearTravesuras(); const d = correr(tr, 30, () => ({ ...normal(), explicando: false, yaw: 0, pitch: 0 })); sí(!d.includes('r-sin-cabeza'), 'sin giroscopio (computadora, pruebas) no juzga «visor en la mesa»'); }
/* las vueltas escalan */
{ const tr = crearTravesuras(); correr(tr, 2, normal); const d = correr(tr, 40, (t) => ({ ...normal(), explicando: false, yaw: ((t * 200) % 360 - 180) * R }), 2);
  sí(d.includes('r-vueltas-1') && d.includes('r-vueltas-2'), `seguir dando vueltas sube de tono (${d.join(', ')})`); }

/* el cuerpo */
caso('agacharse', (t) => ({ ...normal(), pos: [0, t < 2.5 ? 0 : -.5, 0] }), 5, 'r-agachado');
caso('saltar', (t) => ({ ...normal(), pos: [0, t > 3 && t < 3.3 ? .3 : 0, 0] }), 4, 'r-salto');
caso('pegarse al cartel', () => ({ ...normal(), pos: [0, 0, -.5], dCartel: .5 }), 2, 'r-cerca-cartel');
caso('irse caminando', (t) => ({ ...normal(), pos: [0, 0, t < 2.5 ? 0 : 2] }), 3, 'r-lejos-cuerpo');
caso('acercarse a un obstáculo real', () => ({ ...normal(), zona: 'obstaculo' }), 1, 'r-zona');

/* las manos */
caso('tocar la mariposa', () => ({ ...normal(), manos: [{ dMariposa: .1 }] }), 1, 'r-tocar-mariposa');
caso('manos arriba', () => ({ ...normal(), manos: [{ alto: .3 }, { alto: .25 }] }), 2, 'r-manos-arriba');
caso('dos puños', () => ({ ...normal(), manos: [{ puno: true }, { puno: true }] }), 2, 'r-punos');
caso('saludar', (t) => ({ ...normal(), manos: [{ palma: true, x: .5 + Math.sin(t * 12) * .15 }] }), 2, 'r-saludo');
caso('pellizcar el aire', (t) => ({ ...normal(), manos: [{ pellizco: Math.floor(t * 4) % 2 === 0 }] }), 4, 'r-pellizcos');
caso('jugar con las manos mientras explica', () => ({ ...normal(), manos: [{ x: .4 }] }), 8, 'r-manos-juega');

/* el teléfono */
caso('tapar la cámara', () => ({ ...normal(), luz: .02 }), 3, 'r-oscuro');
caso('teléfono parado', () => ({ ...normal(), vertical: true }), 3, 'r-vertical');
caso('agitar el teléfono', () => ({ ...normal(), sacudida: 40 }), 1, 'r-agitar');
caso('dejar el stick apretado', () => ({ ...normal(), ejes: 1 }), 7, 'r-stick');

/* no hacer nada: sube de tono y a la quinta avanza solo */
{ const tr = crearTravesuras(); const d = correr(tr, 500, () => ({ ...normal(), explicando: false, ocupado: false, yaw: 0 }));
  const q = d.filter((x) => x.startsWith('r-quieto'));
  sí(q.join() === 'r-quieto-1,r-quieto-2,r-quieto-3,r-quieto-4,r-quieto-5', `ignorarlo por completo: ${q.join(' → ')}`); }

/* botones y escenas */
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); let d = null;
  for(let i = 0; i < 9; i++){ tr.evento('boton', { t: 1 + i * .2 }); }
  d = tr.paso({ t: 3, yaw: 0 }); sí(d === 'r-machaca', `machacar botones → r-machaca (${d})`); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); let d = [];
  ['siguiente', 'atras', 'siguiente', 'atras'].forEach((x, i) => { const r = tr.evento(x, { t: 10 + i }); if(r) d.push(r); });
  sí(d.includes('r-pingpong'), `adelante-atrás-adelante → r-pingpong (${d})`); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); let d = [];
  [1, 2, 3].forEach((i) => { const r = tr.evento('voz', { t: 10 + i, prendida: i % 2 === 1 }); if(r) d.push(r); });
  sí(d.includes('r-voz-juega'), `prender y apagar la voz → r-voz-juega (${d})`); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); const d = [1, 2, 3].map((i) => tr.evento('puntaje', { t: 10 + i }));
  sí(d.join() === 'r-puntaje,r-puntaje,r-puntaje-2', `tocar el puntaje: ${d.join(' → ')}`); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); sí(tr.evento('opciones', { t: 5 }) === 'r-opciones', 'Opciones en exposición → «Ese botón no te va a sacar»'); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); tr.evento('pregunta', { t: 10 }); sí(tr.evento('respuesta', { t: 10.5 }) === 'r-rapido-resp', 'contestar sin leer → r-rapido-resp'); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); let d = null; for(let i = 0; i < 5; i++) d = tr.evento('planta', { t: 10 + i * .6 }) || d; sí(d === 'r-flores-rapido', 'cinco flores en 3 s → r-flores-rapido'); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); tr.evento('oculto', { t: 10 }); sí(tr.evento('visible', { t: 30 }) === 'r-volviste', 'salir de la página y volver → r-volviste'); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); tr.evento('salir', { t: 10 }); sí(tr.evento('entrar', { t: 40 }) === 'r-regresa-exp', 'salir de MONARCH y volver → r-regresa-exp'); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); sí(tr.evento('final', { t: 40, puntos: 3, total: 5 }) === 'r-record', 'terminar en 40 s → r-record'); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); for(let i = 0; i < 6; i++) tr.evento('escena', { t: 10 + i, id: 'x', saltada: true });
  sí(tr.evento('final', { t: 200, puntos: 5, total: 5 }) === 'r-sospechoso', 'saltarse todo y sacar 5 de 5 → r-sospechoso'); }
{ const tr = crearTravesuras(); tr.paso({ t: 0 }); const d = [tr.evento('otraVez', { t: 100 }), tr.evento('otraVez', { t: 300 })]; sí(d[1] === 'r-otra-vez-2', 'la tercera vuelta → r-otra-vez-2'); }

/* que no se vuelva insoportable */
{ const tr = crearTravesuras(); correr(tr, 2, normal); const d = correr(tr, 30, (t) => ({ ...normal(), yaw: 170 * R, pitch: -70 * R, roll: 50 * R, luz: .01, manos: [{ puno: true }, { puno: true }] }), 2);
  const tiempos = []; { const tr2 = crearTravesuras(); correr(tr2, 2, normal); for(let i = 0; i <= 900; i++){ const t = 2 + i / 30; if(tr2.paso({ t, ...normal(), yaw: 170 * R, pitch: -70 * R, roll: 50 * R, luz: .01, manos: [{ puno: true }, { puno: true }] })) tiempos.push(t); } }
  const minimo = Math.min(...tiempos.slice(1).map((x, i) => x - tiempos[i]));
  sí(d.length >= 3 && minimo >= 6.9, `haciendo diez locuras a la vez, habla cada 7 s como mucho (${d.length} en 30 s; separación mínima ${minimo.toFixed(1)} s)`); }

/* cada reacción que puede salir tiene su renglón (y su audio) */
{ const ids = new Set(); const fuente = (await import('fs')).readFileSync(new URL('./monarca/travesuras.js', import.meta.url), 'utf8');
  for(const m of fuente.matchAll(/'(r-[a-z-]+)'/g)) ids.add(m[1]);
  for(const [fam, n] of [['r-lejos', 3], ['r-vueltas', 2], ['r-quieto', 5]]) for(let i = 1; i <= n; i++) ids.add(`${fam}-${i}`);
  const faltan = [...ids].filter((x) => !['r-lejos', 'r-vueltas', 'r-quieto'].includes(x) && !LINEAS[x]);
  sí(!faltan.length, `cada reacción posible tiene su renglón en narrador.js${faltan.length ? ': faltan ' + faltan.join(', ') : ''}`); }

console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
