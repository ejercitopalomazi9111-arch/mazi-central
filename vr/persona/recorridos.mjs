/* LA PERSONA SIMULADA · los recorridos (Carlos, 26 nov: «créate un entorno 3D… un personaje que esté probando las gafas»).
   Una persona con el visor puesto: mueve la cabeza, levanta la mano DERECHA, apunta con el índice, pellizca, toca con el
   dedo, enseña la palma. Sus manos entran por el rastreo de verdad (manos-falsas.js → manos.js), con la cámara falsa
   de Chromium y el modelo de MediaPipe cargado como siempre. Cada paso deja su foto en $FOTOS (de fábrica
   /tmp/claude-0/persona) y al final dice qué no le salió a la persona.
     node vr/persona/recorridos.mjs [inicio|fisica|monarca|todo]     (con el servidor del repo en :8765) */
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', FOTOS = process.env.FOTOS || '/tmp/claude-0/persona', CUAL = process.argv[2] || 'todo';
fs.mkdirSync(FOTOS, { recursive: true });
let ok = 0, mal = 0; const fallas = []; const sí = (c, t) => { c ? ok++ : (mal++, fallas.push(t)); console.log(c ? '✓' : '✗', t); };
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { navigator.getGamepads = () => []; try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ fondo: 1, manos: true, arcore: false })); }catch{} });
await ctx.addInitScript({ path: new URL('./manos-falsas.js', import.meta.url).pathname });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
let nFoto = 0; const foto = async (n) => { await p.screenshot({ path: `${FOTOS}/${String(++nFoto).padStart(2, '0')}-${n}.png` }); };
const dormir = (ms) => p.waitForTimeout(ms);

/* ── lo que hace la persona ── */
/* mirar (girar la cabeza) hacia un punto del mundo, poco a poco */
async function mirarA(pt, ms = 500){
  await p.evaluate(async ([x, y, z, ms]) => { const V = __vr, T = V.THREE, o = V.cabeza.getWorldPosition(new T.Vector3()), d = new T.Vector3(x, y, z).sub(o).normalize();
    const yaw1 = Math.atan2(-d.x, -d.z) - V.rig.rotation.y, pit1 = Math.asin(d.y), yaw0 = V.sim.yaw, pit0 = V.sim.pitch, n = Math.max(1, Math.round(ms / 50));
    for(let i = 1; i <= n; i++){ const k = i / n, e = k * k * (3 - 2 * k); V.sim.yaw = yaw0 + (yaw1 - yaw0) * e; V.sim.pitch = pit0 + (pit1 - pit0) * e; await new Promise((r) => setTimeout(r, 50)); } }, [...pt, ms]);
}
/* dónde está un botón (por su título) */
const dondeEsta = (titulo) => p.evaluate((t) => { const L = window.__vistaActual?.() || []; const V = __vr;
  const todos = [...(V.extra.elegiblesVistos || [])]; const o = (window.__elegibles?.() || []).find((m) => m.userData.panel?.titulo === t || String(m.userData.panel?.titulo || '').startsWith(t));
  return o ? o.getWorldPosition(new V.THREE.Vector3()).toArray() : null; }, titulo);
/* la mano derecha: de donde esté a que la punta del índice quede entre tus ojos y `pt` (a `brazo` metros), en `ms` */
async function pose(nueva, lado = 'der'){ await p.evaluate(([n, lado]) => { const S = __persona.estado[lado]; if(S){ const mc = S.munecaCab; __persona.poner(lado, { ...S, pose: n }); Object.assign(__persona.estado[lado], { fijaMuneca: true, munecaCab: mc }); } }, [nueva, lado]); }
async function mano(pose, pt, { brazo = .42, ms = 450, palma = 'abajo', mano: lado = 'der' } = {}){
  await p.evaluate(async ([pose, pt, brazo, ms, palma, lado]) => { const V = __vr, T = V.THREE, o = V.cabeza.getWorldPosition(new T.Vector3());
    const fin = pt ? o.clone().add(new T.Vector3(...pt).sub(o).normalize().multiplyScalar(brazo)) : null;
    const ant = __persona.estado[lado]?.punta ? new T.Vector3(...__persona.estado[lado].punta) : fin && o.clone().add(new T.Vector3(.18, -.28, -.3).applyQuaternion(V.cabeza.getWorldQuaternion(new T.Quaternion())));
    if(!fin){ __persona.poner(lado, {}); return; }
    const n = Math.max(1, Math.round(ms / 40));
    for(let i = 1; i <= n; i++){ const k = i / n, e = k * k * (3 - 2 * k); __persona.poner(lado, { pose, punta: ant.clone().lerp(fin, e), hacia: pt, palma }); await new Promise((r) => setTimeout(r, 40)); }
  }, [pose, pt, brazo, ms, palma, lado]);
}
const foco = () => p.evaluate(() => __vr.focoActual());
/* apuntar a un botón, esperar a que brille y pellizcar (lo que se le explica a una persona) */
async function elegir(titulo, { pellizcoMs = 350 } = {}){
  const pt = await dondeEsta(titulo); if(!pt){ sí(false, `«${titulo}» no está a la vista`); return false; }
  await mirarA(pt); await mano('apunta', pt); await dormir(500);
  /* como una persona: si lo que brilla no es lo que quería, mueve el dedo hacia allá (lo que ve: dónde cae su cursor) */
  for(let i = 0; i < 6; i++){
    const f = await foco(); if(f && (f === titulo || String(f).startsWith(titulo))) break;
    const ajuste = await p.evaluate(([pt]) => { const T = __vr.THREE, R = __vr.extra.rayo; if(!R) return null; const o = R.origen, quiero = new T.Vector3(...pt).sub(o).normalize();
      const ahora = R.dir.clone(), corr = quiero.clone().sub(ahora); const S = __persona.estado.der; const punta = new T.Vector3(...S.punta), dist = punta.distanceTo(o);
      const nueva = o.clone().add(punta.clone().sub(o).normalize().add(corr).normalize().multiplyScalar(dist)); __persona.poner('der', { ...S, punta: nueva }); return corr.length(); }, [pt]);
    await dormir(350);
  }
  const brilla = await foco();
  await pose('pellizco');
  if(process.env.DBG) for(let i = 0; i < 6; i++){ console.log('   pinch', await p.evaluate(() => { const R = __vr.extra.rayo; return JSON.stringify({ fijo: R?.mano?.fijo?.objeto?.userData.panel?.titulo, pel: R?.pellizco, obj: R?.objeto?.userData.panel?.titulo, foco: __vr.focoActual(), gesto: __manos.gesto, p3: __manos?.p3dbg, temprano: __vr.extra.clicTemprano | 0, bot: (__vr.extra.botones || [])[0] }); })); await dormir(60); }
  await dormir(pellizcoMs); await pose('apunta'); await dormir(400);
  return brilla;
}
/* ── entrar ── */
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' });
await p.evaluate(() => { window.__elegibles = () => { const v = __vr.ahora(); return [...(window['__' + v]?.elegibles?.() || []), ...(__vr.extra.atrasVisible ? [] : [])]; }; });
await p.click('#bEntrar'); await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 20000 });
await p.waitForFunction(() => window.__manos?.listo, null, { timeout: 90000 }).catch(() => {});
sí(await p.evaluate(() => !!window.__manos?.listo), 'las manos cargan (MediaPipe)');
await p.evaluate(() => { window.__inicio ||= window.__vr; });
const vista = () => p.evaluate(() => __vr.ahora());
const elegiblesDe = () => p.evaluate(() => { const V = __vr; return (window.__todosElegibles?.() || []).map((m) => m.userData.panel?.titulo); });
await p.evaluate(() => { window.__todosElegibles = () => __vr.elegiblesAhora?.() || []; });
await foto('inicio');

/* ── 1. INICIO → Juegos → Física ── */
if(CUAL === 'inicio' || CUAL === 'fisica' || CUAL === 'todo'){
  const titulos = await p.evaluate(() => (__vr.elegiblesAhora?.() || []).map((m) => m.userData.panel?.titulo));
  console.log('  en el inicio hay:', titulos.join(' · '));
  await p.evaluate(() => { window.__elegibles = () => __vr.elegiblesAhora(); });
  const brilla = await elegir('Juegos');
  sí(brilla === 'Juegos', `apuntando con el índice a «Juegos», se ilumina (brilla: ${brilla})`);
  sí(await vista() === 'juegos', `y al pellizcar entra a Juegos (está en «${await vista()}»)`); await foto('juegos');
  if(await vista() === 'juegos'){
    const b2 = await elegir('Física'); sí(await vista() === 'fisica', `pellizcando «Física» entra al simulador (brilló: ${b2}, está en «${await vista()}»)`); await foto('fisica');
  }
}
/* ── 2. EL SIMULADOR: lanzar, cambiar el objeto ── */
if((CUAL === 'fisica' || CUAL === 'todo') && await vista() === 'fisica'){
  const t0 = await p.evaluate(() => __fisica.rastros.length);
  const bl = await elegir('Lanzar');
  sí(await p.evaluate((t0) => __fisica.rastros.length > t0 || __fisica.corriendo, t0), `apuntar a «Lanzar» y pellizcar lanza (brilló: ${bl})`);
  await dormir(1500); await foto('fisica-lanzo');
  const o0 = await p.evaluate(() => __fisica.objeto);
  await p.evaluate(() => { const L = __vr.elegiblesAhora(); window.__llamadas = {}; L.forEach((m) => { const a = m.userData.accion; if(!a || m.userData.__envuelta) return; m.userData.__envuelta = true; m.userData.accion = (...x) => { const t = m.userData.panel?.titulo; window.__llamadas[t] = (window.__llamadas[t] || 0) + 1; return a(...x); }; }); });
  console.log('  DBG flecha', o0, 'brilló', await elegir('Objeto ›'), await p.evaluate(() => __fisica.objeto), await p.evaluate(() => JSON.stringify(window.__llamadas)));
  sí(await p.evaluate((o0) => __fisica.objeto !== o0, o0), 'la flecha › cambia el objeto');
  /* tocar con el dedo un botón cercano (el menú está a ~0.75 m: con el brazo estirado) */
  const pt = await dondeEsta('Lanzar'); await mirarA(pt);
  await mano('apunta', pt, { brazo: await p.evaluate((pt) => __vr.cabeza.getWorldPosition(new __vr.THREE.Vector3()).distanceTo(new __vr.THREE.Vector3(...pt)), pt) }); await dormir(500);
  console.log('  DBG toque', await p.evaluate((pt) => { const T = __vr.THREE, R = (__vr.extra.rayos || [])[0]; if(!R) return 'sin rayo'; const dd = R.dedo; return JSON.stringify({ dedo: dd?.toArray().map((v) => +v.toFixed(3)), pt: pt.map((v) => +v.toFixed(3)), dist: dd ? dd.distanceTo(new T.Vector3(...pt)).toFixed(3) : null, punta: __persona.estado.der.punta.map((v) => +v.toFixed(3)) }); }, pt));
  sí(await p.evaluate(() => performance.now() - (__vr.extra.toqueEn || 0) < 600), 'con el dedo EN el botón, cuenta como tocarlo');
  sí(/Lanzar/.test(await foco() || ''), `tocar «Lanzar» con el dedo lo ilumina (foco: ${await foco()})`);
  await foto('fisica-toque');
  await mano('apunta', null); await dormir(300);
}
await mano('apunta', null);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`\n${ok} bien · ${mal} mal`); if(fallas.length) console.log('Lo que no le salió a la persona:\n  - ' + fallas.join('\n  - '));
await b.close(); process.exit(mal ? 1 : 0);
