/* MONARCH XR · la experiencia completa como la vive un alumno: entra por el QR (?monarca), recorre las escenas, decide,
   contesta el cuestionario y llega al final; y el docente sale con Opciones 5 veces.
     node vr/pruebas-monarca.mjs     (con el servidor del repo en :8765) · capturas en $CAPS (de fábrica /tmp/monarca) */
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8765', CAPS = process.env.CAPS || '/tmp/monarca'; fs.mkdirSync(CAPS, { recursive: true });
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
await ctx.addInitScript(() => { try{ localStorage.setItem('mazivr.ajustes', JSON.stringify({ fondo: 1, manos: false })); }catch{}
  window.__pad = { id: 'Wireless Controller', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }; navigator.getGamepads = () => [window.__pad]; });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
p.on('console', (m) => { if(m.type() === 'error' && !/favicon|getUserMedia|Permission|NotAllowed|NotFound|Requested device/i.test(m.text())) errores.push(m.text()); });
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
await p.goto(BASE + '/vr/?monarca', { waitUntil: 'networkidle' }); await p.click('#bEntrar');
await p.waitForFunction(() => window.__vr?.ahora() === 'monarca', null, { timeout: 20000 });
await p.evaluate(() => window.__monarca.armado); await p.waitForTimeout(1500);
let e = await p.evaluate(() => ({ kiosco: __vr.kiosco.activo, atras: __monarca.atras, botones: __monarca.elegibles().map((m) => m.userData.panel.titulo) }));
sí(e.kiosco && e.botones.join() === 'Español,English', `el QR (?monarca) entra en modo exposición y el operador elige el idioma (${e.botones.join(' · ')})`);
const tocar = (titulo) => p.evaluate((t) => { const b = __monarca.elegibles().find((m) => m.userData.panel.titulo === t || m.userData.panel.titulo.startsWith(t)); if(!b) return false; b.userData.accion(); return true; }, titulo);
const escena = () => p.evaluate(() => __monarca.ESCENAS[__monarca.estado.escena].id);
const cap = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${CAPS}/${n}.png` }); };
await cap('0-idioma');
/* EL ARRANQUE (Carlos, 25 nov): idioma → 5 s para entregar el visor → tutorial, que se salta con el gesto de atrás */
await tocar('Español'); await p.waitForTimeout(1200);
sí(await p.evaluate(() => __monarca.estado.fase === 'cuenta' && __monarca.rotulos.visibles().length > 0), 'elegido el idioma, sale la cuenta para entregar el visor'); await cap('0b-cuenta');
await p.waitForFunction(() => __monarca.estado.fase === 'tutorial', null, { timeout: 8000 }).catch(() => {});
sí(await p.evaluate(() => __monarca.estado.fase === 'tutorial' && __monarca.narrador.pedidos.includes('t-hola')), 'a los 5 s empieza el tutorial con su explicación');
sí(await p.evaluate(() => typeof __monarca.atras === 'function'), 'en el tutorial, el gesto de atrás SÍ hace algo (aunque sea exposición)');
await p.evaluate(() => __monarca.atras());
await p.waitForFunction(() => __monarca.estado.fase === 'escenas', null, { timeout: 20000 }).catch(() => {});
sí(await p.evaluate(() => __monarca.estado.fase === 'escenas' && __monarca.narrador.pedidos.includes('t-saltar') && !__monarca.atras), 'el gesto de atrás salta el tutorial («nos saltamos la práctica») y ya no hay «Atrás» en exposición');
await cap('1-bienvenida');
/* EL NARRADOR: cada renglón tiene su audio, y se da cuenta de lo que haces */
const { LINEAS } = await import('./monarca/narrador.js');
const faltan = Object.keys(LINEAS).filter((id) => !fs.existsSync(new URL(`./monarca/medios/narrador/${id}.mp3`, import.meta.url)));
sí(!faltan.length, `los ${Object.keys(LINEAS).length} renglones del narrador tienen su audio${faltan.length ? ': faltan ' + faltan.join(', ') : ''}`);
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
sí(Object.keys(LINEAS).every((id) => sw.includes(`'${id}'`)) && sw.includes('./monarca/narrador.js'), 'el trabajador de fondo guarda el narrador y todos sus audios (suena sin internet)');
const dichos = () => p.evaluate(() => [...__monarca.narrador.pedidos]);
await p.waitForFunction(() => __monarca.narrador.actual === 'e-bienvenida' && __monarca.narrador.falta() > 3, null, { timeout: 15000 }).catch(() => {});
sí(await p.evaluate(() => __monarca.narrador.actual === 'e-bienvenida'), 'al entrar, el narrador empieza a contar (audio de verdad, no la voz del teléfono)');
/* Opciones (lo que saca del visor) no saca en exposición */
const opciones = async () => { await p.evaluate(() => { window.__pad.buttons[9] = { pressed: true, value: 1 }; }); await p.waitForTimeout(150); await p.evaluate(() => { window.__pad.buttons[9] = { pressed: false, value: 0 }; }); await p.waitForTimeout(150); };
await opciones(); sí(await p.evaluate(() => __vr.ahora()) === 'monarca', 'Opciones una vez no saca de la experiencia');
/* el recorrido */
/* lo de Opciones lo comentó el narrador («Ese botón no te va a sacar»); se espera a que retome la bienvenida */
await p.waitForFunction(() => __monarca.narrador.actual === 'e-bienvenida' && __monarca.narrador.falta() > 3, null, { timeout: 15000 }).catch(() => {});
sí(await tocar('Empezar') && await escena() === 'mariposa', 'Empezar → La monarca'); await cap('2-mariposa');
await p.waitForTimeout(300);
sí((await dichos()).slice(-2).join() === 'r-prisa-1,e-mariposa', `adelantarse mientras explica: primero reclama («¿Ya? Iba a la mitad»), luego sigue (${(await dichos()).slice(-2).join(' → ')})`);
/* mirar a otro lado mientras explica: se voltea la cabeza 120° por 4 s */
await p.waitForFunction(() => __monarca.narrador.actual === 'e-mariposa', null, { timeout: 10000 }).catch(() => {});
await p.evaluate(() => { __monarca.grupo.rotation.y += 2.1; }); await p.waitForTimeout(4200);
const tras = await dichos(); await p.evaluate(() => { __monarca.grupo.rotation.y -= 2.1; });
sí(tras.includes('r-lejos-1'), 'mirar a otro lado 3 s mientras explica: «La historia está enfrente…»');
await p.waitForFunction(() => __monarca.narrador.actual === 'e-mariposa', null, { timeout: 15000 }).catch(() => {});
sí(await p.evaluate(() => __monarca.narrador.actual === 'e-mariposa'), 'y luego sigue la explicación donde iba');
const vis = await p.evaluate(() => ({ mariposa: __monarca.grupo.children.some((c) => c.visible && c.children.length && c.children[0].isGroup) }));
sí(vis.mariposa, 'se ve el ejemplar escaneado de monarca');
await tocar('Siguiente'); sí(await escena() === 'ciclo', 'Siguiente → Su ciclo de vida'); await p.waitForTimeout(2000); await cap('2a-ciclo');
await p.waitForTimeout(6500); sí(await p.evaluate(() => __monarca.ciclo.activo && __monarca.ciclo.capa.visible && __monarca.ciclo.etapa >= 2 && __monarca.ciclo.dia >= 0), 'el ciclo de 16 etapas corre solo, con fotos reales y los días contados');
await tocar('Siguiente'); sí(await escena() === 'flores', '→ Flores en el camino');
await p.evaluate(() => window.__monarca.armadoFlores); await p.waitForTimeout(300);
await p.waitForFunction(() => __monarca.narrador.actual === 'e-flores' && __monarca.narrador.falta() > 3, null, { timeout: 10000 }).catch(() => {});
for(let i = 0; i < 5; i++){ sí(await tocar('Plantar'), `planta la flor ${i + 1}`); await p.waitForTimeout(i === 2 ? 1200 : 200); if(i === 2) await cap('2b-flores'); }
const fl = await p.evaluate(() => ({ flores: window.__monarca.grupo.children.find((g) => g.isGroup && g.children.length === 5 && g.children.every((c) => c.isMesh))?.children.length || 0, lugares: window.__monarca.elegibles().filter((b) => b.userData.panel.titulo === 'Plantar').length }));
const df = await dichos(); sí(df.includes('r-flor-hablando') && df.includes('r-flores-rapido'), `plantar mientras explica: «Me gusta tu iniciativa»; y las cinco de golpe: «Eso no es jardinería: es una carrera» (${df.slice(-6).join(' → ')})`);
sí(fl.flores === 5 && fl.lugares === 0, `crecen las cinco flores y ya no quedan lugares (${fl.flores} flores)`); await cap('2c-flores');
await tocar('Siguiente'); sí(await escena() === 'maceta', '«¡Listo!» → Tu maceta');
/* LA MACETA (maceta.js): tierra → hoyo → semilla → cubrir → regar → crece; con la herramienta equivocada, el narrador lo dice */
await p.evaluate(() => __monarca.maceta.armado); await p.waitForTimeout(300);
await tocar('Pala'); sí(await p.evaluate(() => __monarca.maceta.paso === 'tierra' && !__monarca.maceta.mano) && (await dichos()).includes('k-primero'), 'la maceta: la herramienta que no va no se toma («primero lo primero»)');
for(const [h, w] of [['Tierra', 900], ['Maceta', 3600], ['Pala', 900], ['Maceta', 3600], ['Semillas', 900], ['Maceta', 3600], ['Pala', 900], ['Maceta', 3600], ['Regadera', 900], ['Maceta', 3600]]){ await tocar(h); await p.waitForTimeout(w); }
await p.waitForFunction(() => __monarca.maceta.listo, null, { timeout: 12000 }).catch(() => {});
sí(await p.evaluate(() => __monarca.maceta.listo && ['k-hoyo', 'k-semilla', 'k-cubrir', 'k-regar', 'k-crece', 'k-lista'].every((x) => __monarca.narrador.pedidos.includes(x))), 'la maceta completa: tierra, hoyo, semilla, cubrir, regar y la planta crece'); await cap('2d-maceta');
await tocar('Siguiente'); sí(await escena() === 'migracion', 'la planta lista → La migración'); await p.waitForTimeout(6500); await cap('3-migracion');
await tocar('Siguiente'); sí(await escena() === 'cuerpo', '→ ¿Y si fueras tú? (educación física)'); await p.waitForTimeout(400);
await tocar('Caminando'); await p.waitForTimeout(200); sí((await dichos()).at(-1) === 'r-cuerpo-camina', 'Caminando: 600 h y 136,800 kcal'); await cap('3b-cuerpo');
await tocar('Corriendo'); await p.waitForTimeout(200); sí((await dichos()).at(-1) === 'r-cuerpo-corre' && (await p.evaluate(() => __monarca.estado.cuerpo)) === 1, 'y luego Corriendo: más energía en total');
await tocar('Siguiente'); sí(await escena() === 'santuario', '→ El santuario'); await p.waitForTimeout(1500); await cap('4-santuario');
const cielo = await p.evaluate(() => { const c = __monarca.grupo.children.find((x) => x.geometry?.type === 'SphereGeometry'); return { vis: c.visible, mapa: !!c.material.map }; });
sí(cielo.vis && cielo.mapa, 'el santuario tiene su foto 360° de fondo');
await tocar('Siguiente'); await cap('5-tala'); await tocar('Siguiente'); await cap('6-campo');
await tocar('Siguiente'); sí(await escena() === 'decision', '→ Tú decides'); await cap('7-decision');
await tocar('Turismo'); await cap('7b-turismo'); sí((await dichos()).at(-1) === 'r-turismo', 'elegir Turismo: la voz grave comenta la consecuencia'); await tocar('Siguiente');
sí(await escena() === 'cuestionario', '→ Cuestionario'); await cap('8-cuestionario');
/* contesta bien las cuatro */
const NP = await p.evaluate(() => __monarca.PREGUNTAS.length);
for(let i = 0; i < NP; i++){ const r = await p.evaluate((i) => { const x = __monarca.PREGUNTAS[i][1][__monarca.PREGUNTAS[i][2]]; return typeof x === 'object' ? x.es : x; }, i); await tocar(r); await p.waitForTimeout(150); await tocar('Siguiente'); await p.waitForTimeout(150); }
const dq = await dichos(); sí(dq.includes('e-cuestionario') && Array.from({ length: NP }, (_, k) => k + 1).every((n) => dq.includes('q-' + n)) && dq.filter((x) => x.startsWith('r-bien')).length >= 4, 'el cuestionario: lee cada pregunta y celebra cada acierto');
sí(await escena() === 'final' && (await p.evaluate(() => __monarca.estado.puntos)) === NP, `${NP} de ${NP} y llega al final`); await cap('9-final');
/* LAS TRAVESURAS con los sensores de verdad (travesuras.js tiene su propia prueba con 41 casos) */
await p.waitForTimeout(7500);   /* el narrador habla cada 7 s como mucho: el cuestionario rápido ya se ganó su «¿contestaste sin leer?» */
await p.evaluate(() => { const e = new Event('devicemotion'); e.acceleration = { x: 30, y: 20, z: 10 }; window.dispatchEvent(e); }); await p.waitForTimeout(700);
sí((await dichos()).includes('r-agitar'), 'agitar el teléfono: «No es una bola mágica»');
await p.waitForTimeout(7300);
await p.evaluate(() => { __vr.extra.manos = [{ puno: true, x: .3 }, { puno: true, x: .7 }]; }); await p.waitForTimeout(2500);
await p.evaluate(() => { __vr.extra.manos = []; });
sí((await dichos()).includes('r-punos'), 'dos puños frente a la cámara: «¿Puños arriba?»');
for(let i = 0; i < 3; i++){ await tocar(`${NP} de ${NP}`); await p.waitForTimeout(120); }
sí((await dichos()).slice(-1)[0] === 'r-puntaje-2', 'tocar el puntaje tres veces: «Lo sigues tocando…»');
for(const [b, r] of [['Materias', 'r-materias'], ['Cómo funciona', 'r-como-funciona'], ['Cómo te lo contamos', 'r-como-contamos']]){ await tocar(b); await p.waitForTimeout(150); sí((await dichos()).at(-1) === r, `«${b}» en el final (${r})`); }
await cap('9c-materias');
await tocar('Créditos'); await cap('9b-creditos');
const vz = await p.evaluate(async () => { const b = __monarca.elegibles().find((m) => /^Voz/.test(m.userData.panel.titulo)); return !!b; });
await tocar('Otra vez'); await p.waitForTimeout(200);
sí(await p.evaluate(() => __monarca.estado.fase === 'idioma'), '«Otra vez»: la siguiente persona — el operador vuelve a elegir idioma');
await p.evaluate(() => __monarca.arrancar({ idioma: 'es' })); await p.waitForTimeout(200);
await tocar('Voz'); await p.waitForTimeout(200);
const voz = await p.evaluate(() => ({ voz: __monarca.estado.voz, titulo: __monarca.elegibles().find((m) => /^Voz/.test(m.userData.panel.titulo))?.userData.panel.titulo }));
sí(!voz.voz && (await dichos()).at(-1) === 'r-voz-off', '«Voz: No»: se despide («¿Me apagas?») y se calla');
/* cada cifra que sale en pantalla está en la tabla verificada */
const verificado = fs.readFileSync(new URL('../are/Documentation/MONARCH_XR.md', import.meta.url), 'utf8');
const cifras = await p.evaluate(() => { const v = (x) => (x && typeof x === 'object' ? Object.values(x) : [x]); return __monarca.ESCENAS.flatMap((e) => [...(e.claves || []).flatMap((c) => [...v(c.grande), ...v(c.chico)]), ...(e.etapas || []).flat().flatMap(v), ...(e.opciones || []).flatMap((o) => Array.isArray(o[1]) ? o[1].flatMap((c) => [...v(c.grande), ...v(c.chico)]) : [])]).filter(Boolean).join(' ').match(/\d[\d,.]*/g); });
const sinFuente = [...new Set(cifras)].filter((c) => !verificado.includes(c.replace(/[.,]$/, '')));
sí(!sinFuente.length, `cada cifra de los carteles está en la tabla verificada${sinFuente.length ? ': faltan ' + sinFuente.join(', ') : ''}`);
/* el docente sale: Opciones 5 veces */
for(let i = 0; i < 5; i++) await opciones();
e = await p.evaluate(() => ({ vista: __vr.ahora(), kiosco: __vr.kiosco.activo }));
sí(e.vista === 'inicio' && !e.kiosco, `Opciones 5 veces seguidas: el docente sale y se apaga la exposición (${e.vista})`);
sí(errores.length === 0, 'sin errores' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
console.log(`${ok} bien · ${mal} mal`); await b.close(); process.exit(mal ? 1 : 0);
