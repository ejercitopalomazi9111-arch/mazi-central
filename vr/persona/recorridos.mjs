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
async function elegir(titulo, { pellizcoMs = 600 } = {}){   /* 0.6 s: este navegador de pruebas va a 7-10 cuadros por segundo (un teléfono, a 30-60) */
  const pt = await dondeEsta(titulo); if(!pt){ sí(false, `«${titulo}» no está a la vista`); return false; }
  await mirarA(pt); await mano('apunta', pt); await dormir(500);
  /* como una persona: si lo que brilla no es lo que quería, mueve el dedo hacia allá (lo que ve: dónde cae su cursor) */
  for(let i = 0; i < 12; i++){
    const f = await foco(); if(f && (f === titulo || String(f).startsWith(titulo))){ await dormir(300); if(String(await foco() || '').startsWith(titulo)) break; }
    const ajuste = await p.evaluate(([pt]) => { const T = __vr.THREE, R = __vr.extra.rayo; if(!R) return null; const o = R.origen, quiero = new T.Vector3(...pt).sub(o).normalize();
      const ahora = R.dir.clone(), corr = quiero.clone().sub(ahora); const S = __persona.estado.der; const punta = new T.Vector3(...S.punta), dist = punta.distanceTo(o);
      const nueva = o.clone().add(punta.clone().sub(o).normalize().add(corr).normalize().multiplyScalar(dist)); __persona.poner('der', { ...S, punta: nueva }); return corr.length(); }, [pt]);
    await dormir(650);
  }
  const brilla = await foco();
  if(process.env.DBG2) console.log('  DBG2', await p.evaluate(() => { const T = __vr.THREE; return JSON.stringify((__vr.extra.rayos || []).map((R) => ({ toque: R.toque, obj: R.objeto?.userData.panel?.titulo, hit: R.hit?.toArray().map((v) => +v.toFixed(2)), dedo: R.dedo?.toArray().map((v) => +v.toFixed(2)), dir: R.dir.toArray().map((v) => +v.toFixed(2)) }))) + ' atras@' + JSON.stringify(__vr.elegiblesAhora().filter((m) => m.userData.panel?.titulo === 'Atrás').map((m) => m.getWorldPosition(new T.Vector3()).toArray().map((v) => +v.toFixed(2)))); }));
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
  /* los 10 temas: «Movimiento ›» y lanzar cada uno */
  if(process.env.TEMAS !== '0') for(let i = 0; i < 9; i++){
    const m0 = await p.evaluate(() => __fisica.modo); await elegir('Movimiento ›'); const m1 = await p.evaluate(() => __fisica.modo);
    if(m1 === m0){ sí(false, `«Movimiento ›» no cambió de tema (se quedó en ${m0})`); continue; }
    const r0 = await p.evaluate(() => __fisica.rastros.length);
    await elegir(await p.evaluate(() => __fisica.botones.lanzarB.dice.valor)); await dormir(600);
    sí(await p.evaluate((r0) => __fisica.rastros.length > r0 || __fisica.corriendo, r0), `en «${m1}» se lanza con la mano`); await foto('tema-' + m1);
    await p.evaluate(() => { if(__fisica.corriendo) __fisica.terminar(); });
  }
  /* tocar con el dedo un botón cercano (el menú está a ~0.75 m: con el brazo estirado) */
  await p.evaluate(() => { while(__fisica.modo !== 'parabolico') __fisica.botones.rModo.b.malla.userData.accion(); });
  const pt = await dondeEsta('Lanzar'); await mirarA(pt);
  await mano('apunta', pt, { brazo: await p.evaluate((pt) => __vr.cabeza.getWorldPosition(new __vr.THREE.Vector3()).distanceTo(new __vr.THREE.Vector3(...pt)), pt) }); await dormir(500);
  console.log('  DBG toque', await p.evaluate((pt) => { const T = __vr.THREE, R = (__vr.extra.rayos || [])[0]; if(!R) return 'sin rayo'; const dd = R.dedo; return JSON.stringify({ dedo: dd?.toArray().map((v) => +v.toFixed(3)), pt: pt.map((v) => +v.toFixed(3)), dist: dd ? dd.distanceTo(new T.Vector3(...pt)).toFixed(3) : null, punta: __persona.estado.der.punta.map((v) => +v.toFixed(3)) }); }, pt));
  sí(await p.evaluate(() => performance.now() - (__vr.extra.toqueEn || 0) < 600), 'con el dedo EN el botón, cuenta como tocarlo');
  sí(/Lanzar/.test(await foco() || ''), `tocar «Lanzar» con el dedo lo ilumina (foco: ${await foco()})`);
  await foto('fisica-toque');
  await mano('apunta', null); await dormir(300);
}
/* ── 2b. LOS MENÚS: entrar a cada tarjeta del inicio y regresar con «Atrás» ── */
if(CUAL === 'menus'){
  await p.evaluate(() => { window.__elegibles = () => __vr.elegiblesAhora(); });
  for(const t of (process.env.MENUS ? process.env.MENUS.split(',') : ['Música', 'Cine', 'Leer', 'Internet', 'Ajustes', 'Juegos'])){
    if(await vista() !== 'inicio'){ await p.evaluate(() => __vr.ir('inicio')); await dormir(800); }
    await p.evaluate(() => { __vr.sim.yaw = 0; __vr.sim.pitch = 0; }); await dormir(300);
    await elegir(t); const v = await vista();
    sí(v !== 'inicio', `pellizcar «${t}» entra (está en «${v}»)`); await foto('menu-' + t);
    if(v !== 'inicio'){ await mano('apunta', null); await dormir(300); const bA = await elegir('Atrás'); const v2 = await vista(); console.log('  DBG Atrás brilló', bA, 'en', v, await p.evaluate(() => { const a = __vr.elegiblesAhora().find((m) => m.userData.panel?.titulo === 'Atrás'); return a ? JSON.stringify({ pos: a.getWorldPosition(new __vr.THREE.Vector3()).toArray().map((x) => +x.toFixed(2)), vis: a.visible, rayo: __vr.extra.rayo?.objeto?.userData.panel?.titulo, hit: __vr.extra.rayo?.hit?.toArray().map((x) => +x.toFixed(2)) }) : 'no está'; })); sí(v2 === 'inicio' || v2 !== v, `y «Atrás» regresa (está en «${v2}»)`); }
    await mano('apunta', null); await dormir(300);
  }
}
/* ── 2b. ATRÁS: pellizcando el botón en Objetos (donde pellizcar también agarra) y con la palma mirando abajo ── */
if(CUAL === 'atras'){
  await p.evaluate(() => { window.__elegibles = () => __vr.elegiblesAhora(); });
  await p.evaluate(() => __vr.ir('objetos')); await dormir(2500);
  await p.evaluate(() => { __vr.sim.yaw = 0; __vr.sim.pitch = 0; }); await dormir(300);
  await elegir('Atrás'); const v1 = await vista(); await foto('atras-objetos');
  sí(v1 !== 'objetos', `pellizcar «Atrás» en Objetos regresa (está en «${v1}»)`);
  sí(!(await p.evaluate(() => __objetos?.estado?.().sostenidos?.length || 0)), 'y no agarró nada al pellizcar Atrás');
  /* la palma: abierta, quieta, enfrente y abajo */
  const palmaAbajo = async (pitch, ms) => { await p.evaluate((pi) => { __vr.sim.yaw = 0; __vr.sim.pitch = pi; }, pitch); await dormir(400);
    const pt = await p.evaluate(() => { const V = __vr, T = V.THREE; return V.cabeza.localToWorld(new T.Vector3(0, -.05, -1)).toArray(); });
    await mano('abierta', pt, { brazo: .38, palma: 'arriba' }); await dormir(ms); const v = await vista(); await mano('apunta', null); await dormir(400); return v; };
  for(const [donde, ir] of [['juegos', 'juegos'], ['objetos', 'objetos'], ['fisica', 'fisica']]){
    await p.evaluate((x) => __vr.ir(x), ir); await dormir(2500);
    const quieta = await palmaAbajo(0, 3000); sí(quieta === donde, `palma abierta mirando AL FRENTE no saca de ${donde} (está en «${quieta}»)`);
    await p.evaluate((x) => __vr.ir(x), ir); await dormir(1200);
    const sale = await palmaAbajo(-.8, 3500); await foto('palma-' + donde); sí(sale !== donde, `palma abierta mirando ABAJO, quieta, saca de ${donde} (está en «${sale}»)`);
  }
  await p.evaluate(() => __vr.ir('monarca')); await dormir(4000);
  const mon = await palmaAbajo(-.8, 3500); sí(mon === 'monarca', `en MONARCH la palma no saca (está en «${mon}»)`);
}
/* ── 2c. ESCRIBIR con el teclado del visor pellizcando cada tecla ── */
if(CUAL === 'teclado'){
  await p.evaluate(() => { window.__elegibles = () => __vr.elegiblesAhora(); });
  await elegir('Internet'); sí(await vista() === 'teclado', `«Internet» abre el teclado (está en «${await vista()}»)`);
  const palabra = 'hola';
  for(const letra of palabra){ const t = await p.evaluate((l) => __teclado.elegibles().map((m) => m.userData.panel?.titulo).find((x) => x === l || x === l.toUpperCase()), letra); await elegir(t || letra); await mano('apunta', null); await dormir(250); }
  const escrito = await p.evaluate(() => window.__teclado?.texto?.() ?? '');
  console.log('  escrito:', JSON.stringify(escrito));
  sí(String(escrito).toLowerCase().includes(palabra), `escribió «${palabra}» pellizcando tecla por tecla (quedó «${escrito}»)`);
  await foto('teclado');
}
/* ── 3. MONARCH: como un alumno con el visor puesto (el operador elige el idioma y toca Listo con su mano) ── */
if(CUAL === 'monarca' || CUAL === 'todo'){
  await mano('apunta', null);
  await p.evaluate(() => { window.__monarca.exposicion(true); __vr.ir('monarca'); window.__elegibles = () => __vr.elegiblesAhora(); });
  await dormir(1500); await foto('monarca-idioma');
  await elegir('Español'); sí(await p.evaluate(() => __monarca.estado.fase === 'listo'), 'pellizcando «Español» se elige el idioma');
  await elegir('Listo'); sí(await p.evaluate(() => __monarca.estado.fase === 'cuenta'), 'pellizcando «Listo» empieza la cuenta');
  await mano('apunta', null);
  await p.waitForFunction(() => __monarca.estado.fase === 'tutorial', null, { timeout: 9000 }).catch(() => {});
  sí(await p.evaluate(() => __monarca.estado.fase === 'tutorial'), 'tras la cuenta empieza el tutorial');
  /* paso «mirar»: voltear a la izquierda y a la derecha */
  await dormir(3500);
  await p.evaluate(async () => { for(const y of [.0, .4, .8, .4, 0, -.4, -.8, -.4, 0]){ __vr.sim.yaw = y; await new Promise((r) => setTimeout(r, 250)); } });
  await dormir(800);
  sí(await p.evaluate(() => __monarca.tutorial.paso !== 'mirar'), `voltear a los lados cumple «mirar» (va en «${await p.evaluate(() => __monarca.tutorial.paso)}»)`);
  await dormir(1500); await foto('tutorial-maestro-levantar');
  sí(await p.evaluate(() => !!__monarca.tutorial.maestro()?.grupo.visible), 'el maestro de gestos (mano fantasma) enseña qué hacer');
  /* «manos»: levanto la mano abierta frente a mí */
  await p.evaluate(() => { __vr.sim.yaw = 0; __vr.sim.pitch = 0; });
  await mano('abierta', [0.1, -0.15, -1], { palma: 'frente' }); await dormir(1200);
  sí(await p.evaluate(() => ['apuntar', 'elegir', null].includes(__monarca.tutorial.paso)), `levantar la mano cumple «manos» (va en «${await p.evaluate(() => __monarca.tutorial.paso)}»)`);
  await dormir(2500); await foto('tutorial-maestro-apuntar');
  /* «apuntar» y «elegir»: el botón de práctica */
  const pr = await p.evaluate(() => { const b = __monarca.tutorial.elegibles()[0]; return b ? b.getWorldPosition(new __vr.THREE.Vector3()).toArray() : null; });
  sí(!!pr, 'sale el botón de práctica');
  if(pr){ await mirarA(pr); await mano('apunta', pr); await dormir(900);
    sí(await p.evaluate(() => __monarca.tutorial.paso === 'elegir' || !__monarca.tutorial.activo), 'apuntarle cumple «apuntar»');
    await dormir(2500); await foto('tutorial-maestro-pellizcar');
    await pose('pellizco'); await dormir(400); await pose('apunta'); await dormir(600);
    sí(await p.evaluate(() => !__monarca.tutorial.activo || __monarca.tutorial.hechos.includes('elegir')), `pellizcarlo termina el tutorial (hechos: ${await p.evaluate(() => __monarca.tutorial.hechos.join(', '))})`); }
  await mano('apunta', null);
  await p.waitForFunction(() => __monarca.estado.fase === 'escenas', null, { timeout: 20000 }).catch(() => {});
  sí(await p.evaluate(() => __monarca.estado.fase === 'escenas'), 'y empieza la historia'); await foto('monarca-bienvenida');
}
/* ── 3b. LA HISTORIA ENTERA con las manos: siguiente, opciones, cuestionario, hasta el final. Donde la persona no sepa qué
   hacer (o no le salga en 3 intentos), lo apunta como ATORADO y el docente la pasa (como pasaría en clase) ── */
if(CUAL === 'historia'){
  await mano('apunta', null);
  await p.evaluate(() => { window.__monarca.exposicion(true); __vr.ir('monarca'); __monarca.arrancar({ idioma: 'es' }); window.__elegibles = () => __vr.elegiblesAhora(); });
  await dormir(2000);
  const atorados = []; let antes = '', intentos = 0;
  for(let paso = 0; paso < 70; paso++){
    const e = await p.evaluate(() => ({ id: __monarca.ESCENAS[__monarca.estado.escena].id, fase: __monarca.estado.fase, botones: __vr.elegiblesAhora().map((m) => m.userData.panel?.titulo).filter(Boolean), maceta: __monarca.maceta?.activo && !__monarca.maceta?.listo }));
    if(e.id === 'final'){ break; }
    const clave = e.id + '|' + e.botones.join(','); if(clave === antes) intentos++; else { intentos = 0; antes = clave; }
    if(intentos >= 3){ atorados.push(e.id); await p.evaluate(() => __monarca.ordenes.siguiente()); await dormir(1200); continue; }
    if(e.maceta){ atorados.push('maceta (se probó aparte)'); await p.evaluate(() => __monarca.ordenes.siguiente()); await dormir(1200); continue; }
    const quiero = e.botones.find((t) => /^(Siguiente|Empezar|¡Listo!|Continuar)/.test(t)) || e.botones.find((t) => !/^(Atrás|Voz|Aquí)/.test(t));
    if(!quiero){ await dormir(1500); continue; }
    await p.evaluate(() => { __vr.sim.yaw = 0; __vr.sim.pitch = 0; }); await dormir(200);
    await elegir(quiero); await mano('apunta', null); await dormir(900);
  }
  sí(await p.evaluate(() => __monarca.ESCENAS[__monarca.estado.escena].id === 'final'), `la persona llega al final de la historia${atorados.length ? ' (el docente la pasó en: ' + atorados.join(', ') + ')' : ' sin ayuda'}`);
  sí(atorados.filter((x) => !/maceta/.test(x)).length === 0, `sin atorarse en ninguna escena${atorados.length ? ': ' + atorados.join(', ') : ''}`);
  await foto('historia-final');
}
/* ── 4. LA MACETA: sembrar con la mano (tomar cada herramienta y llevarla encima de la maceta) ── */
if(CUAL === 'maceta' || CUAL === 'todo'){
  await mano('apunta', null);
  if(await p.evaluate(() => __vr.ahora()) !== 'monarca') await p.evaluate(() => { window.__monarca.exposicion(true); __vr.ir('monarca'); });
  await p.evaluate(() => { __monarca.arrancar({ idioma: 'es' }); const i = __monarca.ESCENAS.findIndex((e) => e.id === 'maceta'); __monarca.mostrar(i); window.__elegibles = () => __vr.elegiblesAhora(); });
  await p.waitForFunction(() => __monarca.maceta?.activo, null, { timeout: 15000 }).catch(() => {});
  await dormir(1500); await p.evaluate(() => { __vr.sim.yaw = 0; __vr.sim.pitch = -.55; }); await dormir(500); await foto('maceta-mesa');
  const PASOS = [['Tierra', 'tierra'], ['Pala', 'hoyo'], ['Semillas', 'semilla'], ['Pala', 'cubrir'], ['Regadera', 'regar']];
  for(const [herr, paso] of PASOS){
    const ok1 = await p.evaluate((paso) => __monarca.maceta.paso === paso, paso); if(!ok1){ sí(false, `la maceta debía ir en «${paso}» (va en «${await p.evaluate(() => __monarca.maceta.paso)}»)`); break; }
    const br = await elegir(herr); console.log('  DBG', herr, 'brilló', br, await p.evaluate(() => JSON.stringify({ el: __vr.elegiblesAhora().map((m) => m.userData.panel?.titulo), anim: !!__monarca.maceta.anim, activo: __monarca.maceta.activo })));
    const tomo = await p.evaluate(() => !!__monarca.maceta.mano); if(!tomo) console.log('  EVENTOS', await p.evaluate(() => __monarca.maceta.eventos.slice(-8).join(' | ')));
    sí(tomo, `pellizcar «${herr}» la toma (se va a tu mano)`);
    /* llevar la mano encima de la maceta */
    const boca = await p.evaluate(() => { const r = __monarca.maceta.cosas?.maceta?.raiz; const v = r.getWorldPosition(new __vr.THREE.Vector3()); v.y += .32; return v.toArray(); });
    await mirarA(boca);
    const brazo = await p.evaluate((pt) => __vr.cabeza.getWorldPosition(new __vr.THREE.Vector3()).distanceTo(new __vr.THREE.Vector3(...pt)), boca);
    await mano('abierta', boca, { brazo, palma: 'abajo', ms: 700 });
    await p.waitForFunction((paso) => __monarca.maceta.paso !== paso, paso, { timeout: 9000 }).catch(() => {});
    sí(await p.evaluate((paso) => __monarca.maceta.paso !== paso, paso), `llevar ${herr.toLowerCase()} encima de la maceta hace «${paso}» (va en «${await p.evaluate(() => __monarca.maceta.paso)}»)`);
    await foto('maceta-' + paso); await mano('apunta', null); await dormir(300);
  }
  await p.waitForFunction(() => __monarca.maceta.listo, null, { timeout: 12000 }).catch(() => {});
  sí(await p.evaluate(() => __monarca.maceta.listo), 'la planta crece hasta el final'); await foto('maceta-lista');
}
/* ── 5. LAS MARIPOSAS: palma arriba quieta (se posa una), cerrar la mano (la atrapas), abrirla (se va) ── */
if(CUAL === 'mariposas' || CUAL === 'todo'){
  await mano('apunta', null);
  if(await p.evaluate(() => __vr.ahora()) !== 'monarca') await p.evaluate(() => { window.__monarca.exposicion(true); __vr.ir('monarca'); });
  await p.evaluate(() => { __monarca.arrancar({ idioma: 'es' }); __monarca.mostrar(__monarca.ESCENAS.findIndex((e) => e.id === 'mariposa')); __vr.sim.yaw = 0; __vr.sim.pitch = -.25; });
  await dormir(2500);
  const pal = await p.evaluate(() => { const o = __vr.cabeza.getWorldPosition(new __vr.THREE.Vector3()); return o.add(new __vr.THREE.Vector3(.05, -.18, -1)).toArray(); });
  await mano('abierta', pal, { brazo: .4, palma: 'arriba', ms: 600 });
  const p0 = await p.evaluate(() => __monarca.eco.posadas || 0);
  await dormir(1500); console.log('  DBGM', await p.evaluate(() => JSON.stringify({ listo: __monarca.eco.listo, capa: __monarca.eco.capa.visible, papel: __monarca.eco.papel, manos: (__vr.extra.manos || []).length, palma: __vr.extra.manos?.[0]?.mundo?.palma?.toArray().map((v) => +v.toFixed(2)), puno: __vr.extra.manos?.[0]?.puno, gesto: __manos.gesto, vis: __monarca.eco.mariposas.filter((m) => m.g.visible).length, papeles: [...new Set(__monarca.eco.mariposas.filter((m) => m.g.visible).map((m) => m.papel))] })));
  await p.waitForFunction((p0) => (__monarca.eco.posadas || 0) > p0, p0, { timeout: 6000 }).catch(() => {});
  sí(await p.evaluate((p0) => (__monarca.eco.posadas || 0) > p0, p0), 'con la palma arriba y quieta, se posa una mariposa');
  await dormir(1800); await foto('mariposa-en-la-mano');
  await pose('puno'); await dormir(900);
  sí(await p.evaluate(() => (__monarca.eco.atrapadas || 0) > 0), 'cerrando la mano la atrapas');
  await pose('abierta'); await dormir(900);
  sí(await p.evaluate(() => !__monarca.eco.mariposas.some((m) => m.papel === 'atrapada')), 'y al abrirla sale volando');
}
await mano('apunta', null);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`\n${ok} bien · ${mal} mal`); if(fallas.length) console.log('Lo que no le salió a la persona:\n  - ' + fallas.join('\n  - '));
await b.close(); process.exit(mal ? 1 : 0);
