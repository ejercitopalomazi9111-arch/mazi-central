/* EL SIMULADOR DE FÍSICA v2 en pantalla (Carlos, 26 nov): menú grande a la izquierda y cerca, el rastro que se dibuja
   conforme vuela (nada antes), tiros que se quedan para comparar, objetos con modelo, aire, realidad mixta, control,
   y CERO PARPADEO: los botones son los mismos nodos de principio a fin.
     node vr/pruebas-simulador.mjs     (con el servidor del repo en :8765; FOTOS=dir guarda capturas) */
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', FOTOS = process.env.FOTOS;
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { window.__pad = null; navigator.getGamepads = () => (window.__pad ? [window.__pad] : []); try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ manos: false, fondo: 1 })); }catch{} });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if(m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(m.text()); });
await p.goto(BASE + '/vr/', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio');
await p.evaluate(() => __vr.ir('fisica')); await p.waitForFunction(() => __vr.ahora() === 'fisica');
await p.waitForTimeout(1500);
const foto = async (n, yaw = 0, pitch = 0) => { if(!FOTOS) return; await p.evaluate(([y, q]) => { __vr.sim.yaw = y; __vr.sim.pitch = q; }, [yaw, pitch]); await p.waitForTimeout(400); await p.screenshot({ path: `${FOTOS}/${n}.png` }); };

/* el menú: a la izquierda, a un brazo, botones que no son chiquitos */
const medidas = await p.evaluate(() => { const T = __vr.THREE, cab = new T.Vector3(); __vr.cabeza.getWorldPosition(cab);
  return __fisica.elegibles().map((m) => { const q = new T.Vector3(); m.getWorldPosition(q); const d = q.distanceTo(cab), g = m.geometry.parameters;
    return { izq: q.x - cab.x < 0, d, alto: 2 * Math.atan(g.height * m.scale.y / 2 / d) * 180 / Math.PI, ancho: 2 * Math.atan(g.width / 2 / d) * 180 / Math.PI }; }); });
sí(medidas.length >= 15, `el menú tiene ${medidas.length} botones a la vista`);
sí(medidas.every((m) => m.izq), 'todos los botones están del lado izquierdo');
sí(medidas.every((m) => m.d < 1.0), `todos a un brazo (el más lejano a ${Math.max(...medidas.map((m) => m.d)).toFixed(2)} m; antes estaban a 1.9-2.4 m)`);
sí(medidas.every((m) => m.alto >= 5.5 && m.ancho >= 6), `ningún botón chiquito: el menor mide ${Math.min(...medidas.map((m) => m.alto)).toFixed(1)}° de alto y ${Math.min(...medidas.map((m) => m.ancho)).toFixed(1)}° de ancho`);
/* no se enciman */
const encimados = await p.evaluate(() => { const L = __fisica.elegibles(), cajas = L.map((m) => { const g = m.geometry.parameters; return { x: m.position.x, y: m.position.y, w: g.width, h: g.height }; });
  let n = 0; for(let i = 0; i < cajas.length; i++) for(let j = i + 1; j < cajas.length; j++){ const a = cajas[i], c = cajas[j]; if(Math.abs(a.x - c.x) < (a.w + c.w) / 2 - 1e-3 && Math.abs(a.y - c.y) < (a.h + c.h) / 2 - 1e-3) n++; } return n; });
sí(encimados === 0, 'ningún botón encima de otro');
const nodos0 = await p.evaluate(() => { window.__nodos = __fisica.elegibles().slice(); return __nodos.length; });
await foto('1-menu', .55, -.1); await foto('2-campo', -.15, -.1);

/* nada se dibuja antes de lanzar */
sí(await p.evaluate(() => __fisica.rastros.length === 0), 'antes de lanzar no hay curva dibujada (Carlos: «que no esté previamente marcada»)');
const titulo = (k) => p.evaluate((k) => __fisica.botones[k]?.dice?.valor ?? __fisica.botones[k]?.c?.dice?.valor, k);
sí(/Lanzar/.test(await titulo('lanzarB')), 'el botón grande dice «Lanzar»');
/* se lanza con el botón (su acción) y el rastro crece conforme vuela */
await p.evaluate(() => __fisica.botones.lanzarB.malla.userData.accion());
await p.waitForTimeout(700);
const medio = await p.evaluate(() => { const r = __fisica.rastros[0]; return { va: r.pts.geometry.drawRange.count, total: r.tiempos.length, corriendo: __fisica.corriendo }; });
sí(medio.corriendo && medio.va > 0 && medio.va < medio.total, `a medio vuelo se ve sólo lo recorrido (${medio.va} de ${medio.total} puntos)`);
await foto('3-vuelo', -.1, 0);
await p.waitForFunction(() => !__fisica.corriendo, null, { timeout: 15000 });
const fin = await p.evaluate(() => { const r = __fisica.rastros[0]; return { va: r.pts.geometry.drawRange.count, total: r.tiempos.length, marca: r.marca.malla.visible, alcance: r.sim.alcance }; });
sí(fin.va === fin.total && fin.marca, `al caer el rastro queda completo y con su marca (${fin.alcance.toFixed(1)} m)`);
sí(/otra vez/.test(await titulo('lanzarB')), 'el botón ahora dice «Lanzar otra vez»');

/* comparar: otro objeto, otro tiro; el primero se queda */
await p.evaluate(() => { for(let i = 0; i < 4; i++) __fisica.botones.rObjeto.b.malla.userData.accion(); });
sí(await p.evaluate(() => __fisica.objeto === 'piedra'), 'el objeto cambia con la flecha (cuatro veces: la piedra)');
await p.evaluate(() => { __fisica.lanzar(); __fisica.terminar(); });
const dos = await p.evaluate(() => __fisica.rastros.map((r) => ({ o: r.objeto, a: r.sim.primero, c: r.color })));
sí(dos.length === 2 && dos[0].c !== dos[1].c, `dos tiros a la vista, cada uno de su color: balón ${dos[0].a.toFixed(1)} m y piedra ${dos[1]?.a.toFixed(1)} m (la piedra pierde menos con el aire)`);
/* el aire: sin aire, la piedra llega más lejos que con aire */
await p.evaluate(() => { __fisica.botones.rAire.a.malla.userData.accion(); __fisica.lanzar(); __fisica.terminar(); });
const tres = await p.evaluate(() => __fisica.rastros.map((r) => r.sim.primero));
sí(tres.length === 3 && tres[2] > tres[1], `sin aire la piedra llega a ${tres[2]?.toFixed(1)} m (con aire ${tres[1]?.toFixed(1)} m)`);
sí(/Sin aire/.test(await titulo('rAire')), 'el renglón del aire dice «Sin aire»');
/* el rebote: con él, el balón bota y deja el rastro de cada bote; sin él, se queda donde cae */
const bota = await p.evaluate(() => { __fisica.botones.borrarB.malla.userData.accion(); for(let i = 0; i < 4; i++) __fisica.botones.rObjeto.a.malla.userData.accion();
  const conB = (__fisica.lanzar(), __fisica.terminar(), __fisica.rastros.at(-1).sim); __fisica.botones.reboteB.malla.userData.accion();
  const sinB = (__fisica.lanzar(), __fisica.terminar(), __fisica.rastros.at(-1).sim); __fisica.botones.reboteB.malla.userData.accion();
  return { obj: __fisica.objeto, con: conB.botes, sin: sinB.botes, lejos: conB.alcance > sinB.alcance, mismo: Math.abs(conB.primero - sinB.alcance) < 1e-6 }; });
sí(bota.obj === 'balon' && bota.con >= 3 && bota.sin === 0 && bota.lejos && bota.mismo, `«Rebote»: el balón bota ${bota.con} veces y sigue avanzando; sin rebote se queda donde cayó`);
await foto('6-rebote', -.15, -.05);
/* la Luna */
await p.evaluate(() => { __fisica.botones.rLugar.b.malla.userData.accion(); });
sí(/Luna/.test(await titulo('rLugar')) && /No hay aire/.test(await titulo('rAire')), 'en la Luna el aire dice «No hay aire»');
await p.evaluate(() => { __fisica.botones.rLugar.a.malla.userData.accion(); });
/* hasta 5 tiros: el sexto saca al más viejo */
await p.evaluate(() => { for(let i = 0; i < 4; i++){ __fisica.lanzar(); __fisica.terminar(); } });
sí(await p.evaluate(() => __fisica.rastros.length === 5 && __fisica.rastros.every((r, i) => r.carril === i)), 'se quedan los últimos 5 tiros, cada uno en su carril');
await foto('4-comparar', -.15, -.05); await foto('5-grafica', -.85, 0);
/* los números del menú: −/+ cambian el ángulo */
const ang0 = await p.evaluate(() => __fisica.p.angulo);
await p.evaluate(() => __fisica.botones.rParam.angulo.b.malla.userData.accion());
sí(await p.evaluate((a) => __fisica.p.angulo === a + 5, ang0), 'el + del ángulo sube 5°');
/* CERO PARPADEO: los botones siguen siendo los mismos nodos */
const mismos = await p.evaluate(() => { const L = __fisica.elegibles(); return __nodos.every((n) => L.includes(n)) && L.every((n) => __nodos.includes(n)); });
sí(mismos, `tras ${12} cambios, los ${nodos0} botones son los MISMOS nodos (no se recrean: no parpadean)`);
/* Borrar */
await p.evaluate(() => __fisica.botones.borrarB.malla.userData.accion());
sí(await p.evaluate(() => __fisica.rastros.length === 0), '«Borrar» limpia los tiros');
/* cambiar de movimiento: otros renglones, y siguen sin recrearse */
await p.evaluate(() => { __fisica.botones.rModo.b.malla.userData.accion(); });
const vert = await p.evaluate(() => ({ modo: __fisica.modo, ang: __fisica.botones.rParam.angulo.c.malla.visible, v0: __fisica.botones.rParam.v0.c.malla.visible }));
sí(vert.modo === 'vertical' && !vert.ang && vert.v0, 'en «Tiro vertical» desaparece el ángulo y queda la velocidad');
await p.evaluate(() => { __fisica.botones.rModo.b.malla.userData.accion(); __fisica.botones.rModo.b.malla.userData.accion(); });
const mrua = await p.evaluate(() => ({ modo: __fisica.modo, aire: __fisica.botones.rAire.c.malla.visible, a: __fisica.botones.rParam.a.c.malla.visible }));
sí(mrua.modo === 'mrua' && !mrua.aire && mrua.a, 'en MRUA no hay aire ni planeta, y aparece la aceleración');
await p.evaluate(() => { __fisica.lanzar(); __fisica.terminar(); });
sí(await p.evaluate(() => __fisica.rastros.length === 1 && __fisica.rastros[0].sim.alcance > 0), 'MRUA también deja su rastro');
await p.evaluate(() => { __fisica.botones.rModo.a.malla.userData.accion(); __fisica.botones.rModo.a.malla.userData.accion(); __fisica.botones.rModo.a.malla.userData.accion(); });
sí(await p.evaluate(() => __fisica.modo === 'parabolico'), 'y de regreso al tiro parabólico');
/* el control: R2 lanza, R1 cambia el objeto, ← → el ángulo */
const pulsar = async (i) => { await p.evaluate((i) => { const bt = Array.from({ length: 17 }, (_, k) => ({ pressed: k === i, value: k === i ? 1 : 0 })); window.__pad = { id: 'Prueba', connected: true, mapping: 'standard', timestamp: performance.now(), buttons: bt, axes: [0, 0, 0, 0] }; }, i);
  await p.waitForTimeout(250); await p.evaluate(() => { window.__pad = { ...window.__pad, buttons: window.__pad.buttons.map(() => ({ pressed: false, value: 0 })), timestamp: performance.now() }; }); await p.waitForTimeout(250); };
const o0 = await p.evaluate(() => __fisica.objeto); await pulsar(5);
sí(await p.evaluate((o) => __fisica.objeto !== o, o0), 'R1 cambia el objeto');
const a0 = await p.evaluate(() => __fisica.p.angulo); await pulsar(15);
sí(await p.evaluate((a) => __fisica.p.angulo === a + 5, a0), '→ sube el ángulo');
await pulsar(7);
sí(await p.evaluate(() => __fisica.rastros.length === 1), 'R2 lanza');
/* la realidad mixta: el cuarto virtual no la tapa */
await p.evaluate(() => { __vr.AJ.mixta = true; __vr.ir('juegos'); }); await p.waitForTimeout(200);
await p.evaluate(() => __vr.ir('fisica')); await p.waitForTimeout(200);
sí(await p.evaluate(() => __vr.cuarto.visible === false), 'con la realidad mixta puesta, el simulador no la tapa con el cuarto virtual');
await p.evaluate(() => { __vr.AJ.mixta = false; });
sí(errores.length === 0, `sin errores${errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''}`);
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
