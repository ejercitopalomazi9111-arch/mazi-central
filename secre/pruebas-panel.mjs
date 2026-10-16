#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SECRE · el panel en un navegador de verdad, a 390 px
   ──────────────────────────────────────────────────────────────────────────
   Prende correr.mjs en modo de prueba (WhatsApp e IA de mentiras), entra con
   la contraseña y usa cada pestaña como la usaría Carlos: llega un mensaje,
   aparece la propuesta, la cambia y la manda, tira otra, anota y tacha un
   pendiente, le cambia el modo a un chat, pone saludos y una regla, y le
   escribe a Secre. Comprueba el EFECTO, no que exista el botón.
     node secre/pruebas-panel.mjs            CAPTURAS=1 guarda fotos
   ═════════════════════════════════════════════════════════════════════════ */
import { createRequire } from 'module'; import { spawn } from 'child_process'; import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);

const fallas = []; let pasan = 0;
const ok = (que, si, extra) => { if(si){ pasan++; console.log('  ✓', que); } else { fallas.push(que); console.log('  ✗', que, extra !== undefined ? '· ' + JSON.stringify(extra).slice(0, 300) : ''); } };

/* datos de prueba en una carpeta temporal: juntar 1 s para no esperar 45 */
const DATOS = fs.mkdtempSync(path.join(os.tmpdir(), 'secre-'));
for(const c of ['principal', 'segunda']){ fs.mkdirSync(path.join(DATOS, c), { recursive: true }); fs.writeFileSync(path.join(DATOS, c, 'config.json'), JSON.stringify({ version: 2, porDefecto: 'borrador', juntar: 1 })); }
const PUERTO = 8790 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, [path.join(RAIZ, 'correr.mjs')], { env: { ...process.env, SECRE_FALSO: '1', SECRE_DATOS: DATOS, SECRE_PUERTO: String(PUERTO), SECRE_CLAVE: 'clave-de-prueba', SECRE_CUENTAS: 'principal:5214420000000,segunda:5214429999999' }, stdio: ['ignore', 'pipe', 'pipe'] });
let salida = ''; srv.stdout.on('data', d => salida += d); srv.stderr.on('data', d => salida += d);
const fin = (code) => { try{ srv.kill(); }catch{} fs.rmSync(DATOS, { recursive: true, force: true }); process.exit(code); };
for(let i = 0; i < 50 && !/Panel de Secre/.test(salida); i++) await new Promise(r => setTimeout(r, 100));
if(!/Panel de Secre/.test(salida)){ console.log(salida); fin(1); }

const URL0 = `http://127.0.0.1:${PUERTO}/`;
const br = await chromium.launch();
const errores = [];
async function probar(tema){
  console.log(`\n── tema ${tema} ──`);
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema === 'oscuro' ? 'dark' : 'light', hasTouch: true });
  const page = await ctx.newPage();
  const art = (n) => page.locator('#hoja article[data-n]', { hasText: n });
  const ANA = `52144211111${tema === 'claro' ? 11 : 22}@s.whatsapp.net`, BETO = `52144222222${tema === 'claro' ? 11 : 22}@s.whatsapp.net`;
  page.on('console', m => { if(m.type() === 'error' && !/401/.test(m.text())) errores.push(m.text()); });
  page.on('pageerror', e => errores.push(e.message));
  const foto = async (n) => { if(process.env.CAPTURAS) await page.screenshot({ path: path.join(process.env.CAPTURAS_DIR || os.tmpdir(), `secre-${tema}-${n}.png`), fullPage: false }); };
  const espera = async (fn, que, ms = 9000) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await fn().catch(() => false)) return true; await page.waitForTimeout(150); } ok(que, false, 'se acabó el tiempo'); return false; };
  const estado = async (c = 'principal') => (await page.request.get(URL0 + 'api/' + c)).json();
  const desborde = async () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const chicos = async () => page.evaluate(() => [...document.querySelectorAll('button, input:not([type=checkbox]), select, textarea')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.outerHTML.slice(0, 80)));

  await page.goto(URL0);
  if(tema === 'claro'){
    ok('sin sesión, la API no contesta datos', (await page.request.get(URL0 + 'api/principal')).status() === 401);
    await page.fill('#clave', 'otra'); await page.click('#fEntrar button');
    await espera(async () => /no es la contraseña/.test(await page.textContent('#errEntrar')), 'contraseña mala: lo dice');
  }
  await page.fill('#clave', 'clave-de-prueba'); await page.click('#fEntrar button');
  await espera(async () => await page.locator('nav.pestanas').count() === 1, 'con la buena entra');
  ok('las dos cuentas salen arriba, conectadas', await espera(async () => (await page.locator('.cuenta .punto.si').count()) === 2, 'dos conectadas'));
  await foto('0-entrar');

  /* ── llega un mensaje → propuesta ── */
  await page.click('nav [data-p="propuestas"]');
  await page.request.post(URL0 + 'api/principal/llega', { data: { chat: ANA, de: ANA, nombre: 'Ana ' + tema, texto: '¿mañana me traes el libro?' } });
  ok('llega un mensaje y la propuesta aparece sola (sin recargar)', await espera(async () => (await art('Ana ' + tema).count()) === 1, 'propuesta', 15000));
  ok('trae lo que le escribieron', /mañana me traes el libro/.test(await page.textContent('#hoja')));
  ok('el globo de la pestaña cuenta las propuestas', (await page.textContent('nav [data-p="propuestas"] .globo')) === String(await page.locator('#hoja article[data-n]').count()));
  ok('la propuesta trae el pendiente detectado', (await estado()).pendientes.some(p => /Llevar/.test(p.texto)));
  await foto('1-propuesta');
  ok('sin desborde horizontal', (await desborde()) <= 0, await desborde());
  ok('ningún control de menos de 44 px', (await chicos()).length === 0, await chicos());

  /* la cambia y la manda: tiene que salir SU texto */
  await art('Ana ' + tema).locator('textarea').fill('sí, ahí te lo llevo ' + tema);
  await art('Ana ' + tema).locator('[data-mandar]').click();
  await espera(async () => (await art('Ana ' + tema).count()) === 0, 'al mandarla se quita');
  let e = await estado();
  ok('se mandó el texto CAMBIADO, no la propuesta', e.registro.some(r => r.que === `mandó a Ana ${tema}: sí, ahí te lo llevo ${tema}`), e.registro.slice(-2));

  /* otra y la tira: no sale nada */
  const antes = e.registro.filter(r => /^mandó/.test(r.que)).length;
  await page.request.post(URL0 + 'api/principal/llega', { data: { chat: BETO, de: BETO, nombre: 'Beto ' + tema, texto: 'qué onda' } });
  await espera(async () => (await art('Beto ' + tema).count()) === 1, 'segunda propuesta', 15000);
  await art('Beto ' + tema).locator('[data-tirar]').click();
  await espera(async () => (await art('Beto ' + tema).count()) === 0, 'al tirarla se quita');
  e = await estado();
  ok('tirarla no manda nada', e.registro.filter(r => /^mandó/.test(r.que)).length === antes);

  /* ── «Mandar todas»: las cambiadas salen con el texto nuevo, las demás como están ── */
  {
    const M1 = `52144255555${tema === 'claro' ? 11 : 22}@s.whatsapp.net`, M2 = `52144266666${tema === 'claro' ? 11 : 22}@s.whatsapp.net`;
    await page.request.post(URL0 + 'api/principal/llega', { data: { chat: M1, de: M1, nombre: 'Mimi ' + tema, texto: 'hola' } });
    await page.request.post(URL0 + 'api/principal/llega', { data: { chat: M2, de: M2, nombre: 'Toño ' + tema, texto: 'qué tal' } });
    ok('con dos o más listas sale «Mandar todas»', await espera(async () => (await art('Toño ' + tema).count()) === 1 && /Mandar todas \(\d+\)/.test(await page.textContent('#hoja')), 'botón Mandar todas', 15000));
    const cuantas = (await estado()).propuestas.length;
    ok('y dice cuántas son', (await page.textContent('#bTodas')).includes(`(${cuantas})`));
    await art('Mimi ' + tema).locator('textarea').fill('ya mero llego ' + tema);
    const antesT = (await estado()).registro.filter(r => /^mandó/.test(r.que)).length;
    await page.click('#bTodas');
    await espera(async () => (await estado()).propuestas.length === 0, 'se vacía Por mandar');
    const eT = await estado(), mand = eT.registro.filter(r => /^mandó/.test(r.que));
    ok('«Mandar todas» manda todas las que había', mand.length === antesT + cuantas, mand.slice(-cuantas));
    ok('y la que cambiaste sale con TU texto', mand.some(r => r.que === `mandó a Mimi ${tema}: ya mero llego ${tema}`), mand.slice(-2));
  }

  /* ── pendientes ── */
  await page.click('nav [data-p="pendientes"]');
  await page.fill('#nuevoP', 'comprar pilas ' + tema); await page.click('#fAnota button');
  await espera(async () => /comprar pilas/.test(await page.textContent('#hoja')), 'anotar lo pone en la lista');
  const caja = page.locator('#hoja .pend', { hasText: 'comprar pilas ' + tema }).locator('input');
  await caja.check();
  await espera(async () => (await estado()).pendientes.some(p => p.texto === 'comprar pilas ' + tema && p.hecho), 'tacharlo lo marca hecho en Secre');
  await foto('2-pendientes');

  /* ── chats ── */
  await page.click('nav [data-p="chats"]');
  const ana = page.locator('#hoja details', { hasText: 'Ana ' + tema });
  await ana.locator('summary .quien').click();
  await ana.locator('[data-modo]').selectOption('callado');
  await ana.locator('[data-nota]').fill('es mi compañera de mate');
  await ana.locator('[data-etq]').fill('Escuela, amigos');
  await foto('3-chat');
  await ana.locator('[data-guardar]').click();
  await espera(async () => { const c = (await estado()).chats.find(x => x.nombre === 'Ana ' + tema); return c && c.modoAhora === 'callado' && c.nota === 'es mi compañera de mate' && c.etiquetas.join() === 'escuela,amigos'; }, 'cambiar el modo, la nota y los grupos se guarda');
  ok('el chat dice ahora «sólo anoto pendientes»', await espera(async () => /sólo anoto pendientes/.test(await page.locator('#hoja details', { hasText: 'Ana ' + tema }).locator('summary').textContent()), 'resumen del chat'));
  /* el modo automático también se prende desde aquí, chat por chat */
  const ana2 = page.locator('#hoja details', { hasText: 'Ana ' + tema });
  if(!(await ana2.getAttribute('open'))) await ana2.locator('summary .quien').click();
  await ana2.locator('[data-modo]').selectOption('auto');
  await ana2.locator('[data-guardar]').click();
  await espera(async () => ((await estado()).chats.find(x => x.nombre === 'Ana ' + tema) || {}).modoAhora === 'auto', 'elegir «contestarle sola» la pone en automático');
  ok('y el chat dice «contesto sola»', await espera(async () => /contesto sola/.test(await page.locator('#hoja details', { hasText: 'Ana ' + tema }).locator('summary').textContent()), 'resumen auto'));
  const ana3 = page.locator('#hoja details', { hasText: 'Ana ' + tema });
  if(!(await ana3.getAttribute('open'))) await ana3.locator('summary .quien').click();
  await ana3.locator('[data-modo]').selectOption('callado');
  await ana3.locator('[data-guardar]').click();
  await espera(async () => ((await estado()).chats.find(x => x.nombre === 'Ana ' + tema) || {}).modoAhora === 'callado', 'y se regresa');
  /* un grupo de rol: se prende desde aquí con su personaje */
  const ROL = `1203632222${tema === 'claro' ? 11 : 22}@g.us`, nomRol = 'Taberna ' + tema;
  await page.request.post(URL0 + 'api/principal/llega', { data: { chat: ROL, de: ANA, nombre: 'Ana', nombreChat: nomRol, grupo: true, texto: '*entra a la taberna*' } });
  await page.click('nav [data-p="pendientes"]'); await page.click('nav [data-p="chats"]');
  const rol = page.locator('#hoja details', { hasText: nomRol });
  await espera(async () => (await rol.count()) === 1, 'el grupo aparece en Chats');
  await rol.locator('summary .quien').click();
  await rol.locator('[data-modo]').selectOption('rol');
  await rol.locator('[data-personaje]').fill('Kael, mercenario callado');
  await rol.locator('[data-mundo]').fill('Reino de Valdor. La magia está prohibida.');
  await rol.locator('[data-marca]').fill('🌌⚛️-');
  await foto('3b-rol');
  await rol.locator('[data-guardar]').click();
  await espera(async () => { const c = (await estado()).chats.find(x => x.nombre === nomRol) || {}; return c.modoAhora === 'auto' && c.rol && c.personaje === 'Kael, mercenario callado' && c.mundo === 'Reino de Valdor. La magia está prohibida.' && c.marca === '🌌⚛️-'; }, 'en un grupo, «seguir la historia» prende el rol con su personaje');
  ok('y el grupo dice «sigo la historia sola»', await espera(async () => /sigo la historia sola/.test(await page.locator('#hoja details', { hasText: nomRol }).locator('summary').textContent()), 'resumen rol'));
  ok('a un chat de una persona no le ofrece el rol', (await page.locator('#hoja details', { hasText: 'Ana ' + tema }).locator('[data-modo] option[value="rol"]').count()) === 0);

  /* ── saludos y reglas ── */
  await page.click('nav [data-p="ajustes"]');
  /* lo que Secre sabe: contarle algo y que lo guarde; olvidarlo y que lo quite */
  await page.fill('#dTexto', 'el viernes hay examen de mate a las 8 ' + tema);
  await page.click('#bDato');
  ok('contarle algo desde el panel lo guarda', await espera(async () => (await estado()).config.datos.some(d => d.texto === 'el viernes hay examen de mate a las 8 ' + tema), 'contarle algo desde el panel lo guarda'));
  ok('y sale en la lista', await espera(async () => /examen de mate a las 8/.test(await page.textContent('#hoja')), 'y sale en la lista'));
  const nDatos = (await estado()).config.datos.length;
  await page.locator('#hoja .tarjeta', { hasText: 'examen de mate a las 8 ' + tema }).locator('[data-olvida]').click();
  ok('«Olvidar» lo quita', await espera(async () => (await estado()).config.datos.length === nDatos - 1, '«Olvidar» lo quita'));
  /* que la pantalla termine de repintarse antes de seguir escribiendo (si no, el repintado borra lo escrito) */
  ok('y se va de la lista', await espera(async () => !(await page.textContent('#hoja')).includes('examen de mate a las 8 ' + tema), 'y se va de la lista'));
  await page.selectOption('#sChat', { label: 'Ana ' + tema });
  await page.fill('#sM', '06:45'); await page.fill('#sN', '23:10'); await page.click('#bSaludo');
  await espera(async () => (await estado()).config.saludos.some(s => s.manana === '06:45' && s.noche === '23:10'), 'agregar saludos los guarda');
  await page.locator('#hoja details summary', { hasText: 'Nueva regla' }).click();
  await page.fill('#rPal', 'examen, tarea'); await page.fill('#rDe', '22:00'); await page.fill('#rA', '07:00');
  await page.click('#bRegla');
  await espera(async () => (await estado()).config.reglas.some(r => r.palabras && r.palabras.join() === 'examen,tarea' && r.de === '22:00'), 'crear una regla la guarda');
  await espera(async () => /si hablan de examen, tarea/.test(await page.textContent('#hoja')), 'la regla se lee en cristiano');
  await foto('4-ajustes');
  ok('sin desborde en ajustes', (await desborde()) <= 0, await desborde());
  const nReglas = (await estado()).config.reglas.length;
  await page.locator('#hoja [data-quitar]').first().click();
  await espera(async () => (await estado()).config.reglas.length === nReglas - 1, 'quitar una regla la quita');

  /* ── la plática ── */
  await page.click('nav [data-p="platica"]');
  await page.fill('#orden', 'estado'); await page.click('#fOrden button');
  await espera(async () => /Cuenta: principal/.test(await page.textContent('#hoja')), 'escribirle «estado» contesta como en el chat propio');
  await page.fill('#orden', 'ya no le propongas nada a nadie de noche'); await page.click('#fOrden button');
  await espera(async () => /IA de prueba/.test(await page.textContent('#hoja')), 'una orden en palabras pasa por la IA');
  await foto('5-platica');
  ok('sin desborde en la plática', (await desborde()) <= 0, await desborde());

  /* ── pausa ── */
  await page.click('#bPausa');
  await espera(async () => /Seguir/.test(await page.textContent('#bPausa')), 'pausa: el botón cambia a «Seguir»');
  ok('y Secre queda en pausa', (await estado()).config.pausaHasta > Date.now());
  await page.click('#bPausa');
  await espera(async () => /Pausa 2 h/.test(await page.textContent('#bPausa')), 'seguir: quita la pausa');

  /* ── la comunidad de rol: un botón aparte, todos sus grupos de un jalón ── */
  await page.click('nav [data-p="pendientes"]'); await page.click('nav [data-p="chats"]');
  await page.locator('#dCom summary').click();
  await espera(async () => (await page.locator('#comGrupos input').count()) === 3, 'abrir «Comunidad de rol» enseña los 3 grupos de la comunidad');
  ok('la comunidad sale con su nombre', /Reino de Valdor \(3 grupos\)/.test(await page.locator('#comSel').textContent()));
  await page.locator('#comTodos').setChecked(true);
  ok('«Todos los grupos» los marca todos', (await page.locator('#comGrupos input:checked').count()) === 3);
  await page.locator('#comGrupos label', { hasText: 'Castillo' }).locator('input').setChecked(false);
  ok('quitar uno quita la palomita de «Todos»', !(await page.locator('#comTodos').isChecked()));
  await page.fill('#comPersonaje', 'Kael, mercenario ' + tema);
  await page.fill('#comMarca', '🌌⚛️-');
  await page.fill('#comMundo', 'Reino de Valdor: la magia está prohibida.');
  await page.fill('#comInstr', 'Nunca ataques primero.');
  ok('sin desborde con la comunidad abierta', (await desborde()) <= 0, await desborde());
  await foto('3c-comunidad');
  await page.click('#bComGuardar');
  await espera(async () => { const e = await estado(), ch = (n) => e.chats.find(x => x.nombre === n) || {}, com = (e.config.comunidades || {})['120363000000000001@g.us'] || {};
    return ch('Taberna').rol && ch('Bosque').rol && !ch('Castillo').rol && com.instrucciones === 'Nunca ataques primero.' && com.personaje === 'Kael, mercenario ' + tema && com.marca === '🌌⚛️-'; },
    'guardar la comunidad prende el rol en los marcados, deja fuera el otro y guarda el contexto y las instrucciones');
  ok('y avisa en cuántos grupos sigue la historia', await espera(async () => /sigo la historia en 2 grupo/.test(await page.textContent('body')), 'aviso de la comunidad'));

  /* ── los contactos de la agenda, el buscador y el cambio rápido de modo ── */
  await page.click('#bContactos');
  await espera(async () => (await estado()).chats.some(c => c.nombre === 'Profe Omar'), '«Cargar contactos y grupos» trae la agenda aunque no te hayan escrito');
  await page.click('nav [data-p="pendientes"]'); await page.click('nav [data-p="chats"]');
  await page.fill('#busChats', 'omar');
  await espera(async () => (await page.locator('#hoja details[data-id]').count()) === 1, 'el buscador deja sólo al Profe Omar (sin acentos ni mayúsculas)');
  const omar = page.locator('#hoja details[data-id]', { hasText: 'Profe Omar' });
  await omar.locator('[data-rapido="callado"]').click();
  await espera(async () => ((await estado()).chats.find(c => c.nombre === 'Profe Omar') || {}).modoAhora === 'callado', 'un toque en «Callada» le cambia el modo sin abrir el chat');
  ok('y el chat no se abrió al tocar el botón', !(await page.locator('#hoja details[data-id]', { hasText: 'Profe Omar' }).getAttribute('open')));
  await page.fill('#busChats', ''); await page.locator('#busChats').dispatchEvent('input');
  await page.click('[data-filtro="grupos"]');
  ok('el filtro «Grupos» sólo enseña grupos', await page.evaluate(() => [...document.querySelectorAll('#hoja details[data-id] .quien')].every(q => q.textContent.startsWith('👥'))));
  await page.click('[data-masivo="callado"]');
  await espera(async () => (await estado()).chats.filter(c => c.grupo).every(c => c.modoAhora === 'callado'), '«Todos estos grupos → Callada» los calla de un toque');
  await page.click('[data-defgrupos="borrador"]');
  await espera(async () => (await estado()).config.grupos === 'borrador', 'y los grupos nuevos pueden quedar en «Propone» de un toque');
  ok('sin desborde con los botones rápidos', (await desborde()) <= 0, await desborde());
  await foto('3d-rapido');
  await page.click('[data-defgrupos="callado"]'); await page.click('[data-filtro="todos"]');

  /* ── la otra cuenta no se mezcla ── */
  await page.click('.cuenta[data-c="segunda"]');
  await espera(async () => (await page.getAttribute('.cuenta[data-c="segunda"]', 'aria-pressed')) === 'true', 'cambiar a la segunda cuenta');
  const seg = await estado('segunda');
  ok('la segunda cuenta no tiene nada de la principal', !seg.chats.length && !seg.config.saludos.length && !seg.pendientes.length, seg.chats.map(c => c.nombre));
  await ctx.close();
}
try{ await probar('claro'); await probar('oscuro'); }
catch(e){ ok('la prueba corrió completa', false, e.message); }
await br.close();
ok('cero errores de consola', errores.length === 0, errores);
console.log(fallas.length ? `\n✗ ${pasan} pasan · ${fallas.length} fallan` : `\n✓ ${pasan}/${pasan}`);
fin(fallas.length ? 1 : 0);
