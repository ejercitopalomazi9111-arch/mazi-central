/* MONARCH y el visor, lo del 19 nov en la noche (Carlos):
     · subtítulos que siguen tu vista y escriben lo que el narrador dice en ese momento (también las reacciones);
     · pellizcar el aire NO elige nada (se aburren, juegan con las manos y omitían la diapositiva);
     · lo primero que queda bajo la mira tras cambiar de pantalla o elegir algo NO se elige solo (entraba solo a Leer);
     · mirar fijo tarda 2.5 s; sin «tiuk» ni campanita; el menú ya no se agranda con las dos manos.
   Uso: (servidor en 8765) node vr/pruebas-subtitulos.mjs */
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const nav = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await nav.newContext({ viewport: { width: 844, height: 390 } });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
await p.goto(BASE + '/vr/', { waitUntil: 'load' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'inicio', null, { timeout: 15000 });

/* la mirada: al entrar, lo que queda enfrente no se abre solo aunque lo veas 4 s */
await p.evaluate(() => { __vr.modo.mono = false; __vr.mirar.activo = true; });
await p.waitForTimeout(4200);
sí(await p.evaluate(() => __vr.ahora()) === 'inicio', `al entrar no se mete solo a nada mirando enfrente (vista: ${await p.evaluate(() => __vr.ahora())})`);
sí(await p.evaluate(() => __vr.MIRAR_MS) === 2500, 'mirar fijo tarda 2.5 s');
/* los sonidos que se quitaron */
const fuente = (await import('node:fs')).readFileSync(new URL('./vr.js', import.meta.url), 'utf8');
sí(!/function activar[^\n]*sonar\(/.test(fuente) && !/function darFoco[^\n]*sonar\(/.test(fuente), 'sin campanita al elegir ni «tiuk» al ver algo');
const idx = (await import('node:fs')).readFileSync(new URL('./index.html', import.meta.url), 'utf8');
sí(!/v\.cuadro = \(t, dt\) => \{ poner\(\); agarrar\(\)/.test(idx), 'el menú principal ya no se agranda con el gesto de dos manos');

/* MONARCH: subtítulos */
await p.evaluate(() => __vr.ir('monarca')); await p.evaluate(() => window.__monarca.armado);
await p.evaluate(() => __monarca.arrancar({ idioma: 'es' }));   /* sin idioma ni tutorial: directo a la historia */
await p.waitForFunction(() => __monarca.narrador.actual === 'e-bienvenida', null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(1800);
const s1 = await p.evaluate(() => ({ vis: __monarca.subt.malla.visible, pr: __monarca.narrador.progreso() }));
sí(s1.vis && s1.pr?.id === 'e-bienvenida' && s1.pr.f > 0 && s1.pr.f < 1, `mientras habla hay subtítulo, y va a la mitad del renglón (${s1.pr?.id} ${(s1.pr?.f * 100 | 0)} %)`);
/* sigue la vista con suavidad: se gira la cabeza 90° y el subtítulo llega poco a poco, no de golpe */
const lado = await p.evaluate(async () => { const V = __vr, m = __monarca.subt.malla; const antes = m.position.clone();
  V.cabeza.rotation.y += Math.PI / 2; V.cabeza.updateMatrixWorld(true);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const medio = m.position.clone();
  await new Promise((r) => setTimeout(r, 2500)); const fin = m.position.clone();
  const meta = new V.THREE.Vector3(0, -.32, -1.6).applyQuaternion(V.cabeza.getWorldQuaternion(new V.THREE.Quaternion())).add(V.cabeza.getWorldPosition(new V.THREE.Vector3()));
  V.cabeza.rotation.y -= Math.PI / 2;
  /* (27 nov) sólo de lado: la altura ya no es fija, baja para no tapar los botones */
  fin.y = meta.y = 0;
  return { brinco: medio.distanceTo(antes), resta: fin.distanceTo(meta) }; });
sí(lado.brinco < .6 && lado.resta < .15, `al voltear, el subtítulo te alcanza suave (primer cuadro ${lado.brinco.toFixed(2)} m, al final queda a ${lado.resta.toFixed(2)} m de su lugar)`);
/* una reacción también sale en el subtítulo */
await p.evaluate(() => __monarca.travesuras && __monarca.narrador.interrumpir('r-saludo'));
await p.waitForTimeout(500);
sí(await p.evaluate(() => __monarca.narrador.progreso()?.id) === 'r-saludo' && await p.evaluate(() => __monarca.subt.malla.visible), 'cuando el narrador reacciona, el subtítulo dice la reacción');

/* pellizcar el aire no omite: sin nada bajo el rayo, el clic no cae en el último botón que tuvo el foco */
const antes = await p.evaluate(() => __monarca.estado.escena);
await p.evaluate(async () => { const V = __vr, sig = __monarca.elegibles().find((b) => /Siguiente|Empezar/.test(b.userData.panel.titulo));
  V.extra.rayo = { origen: new V.THREE.Vector3(0, 0, 0), dir: new V.THREE.Vector3(0, -1, 0), objeto: null }; V.extra.rayos = [];
  if(sig) sig.userData.panel.foco?.(true);
  for(let i = 0; i < 6; i++){ V.extra.botones = i % 2 ? [] : Object.assign([], { [V.B.X]: true }); await new Promise((r) => requestAnimationFrame(r)); }
  V.extra.botones = []; V.extra.rayo = null; });
await p.waitForTimeout(300);
sí(await p.evaluate(() => __monarca.estado.escena) === antes, 'pellizcar el aire (sin apuntar a nada) no se salta la diapositiva');
/* AJUSTES SIN CONTROL: cada renglón se elige mirando o pellizcando; las flechas se repiten mirándolas */
await p.evaluate(() => __vr.ir('ajustes')); await p.waitForTimeout(300);
const r = await p.evaluate(async () => { const V = __vr;
  const zonas = __ajustes.elegibles();
  const de = (t) => zonas.filter((z) => z.userData.panel.titulo === t);
  const k1 = V.AJ.k1, lente = de('Lente'); lente[1]?.userData.accion();
  const mano = V.AJ.manoModelo; de('Mano 3D')[0]?.userData.accion();
  return { zonas: zonas.length, lente: lente.length, sube: V.AJ.k1 > k1, repite: !!lente[1]?.userData.repetir, mano3d: mano !== false && V.AJ.manoModelo === false }; });
sí(r.zonas >= 15 && r.lente === 2, `Ajustes tiene zonas para mirar o pellizcar en cada renglón (${r.zonas}; Lente con ‹ y ›)`);
sí(r.sube && r.repite, '«›» de Lente sube el valor y se repite si lo sigues viendo');
sí(r.mano3d, '«Mano 3D» se apaga desde Ajustes sin control');
await p.evaluate(() => { __vr.AJ.manoModelo = true; __vr.guardar(); });
sí(!errores.length, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 2).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await nav.close(); process.exit(mal ? 1 : 0);
