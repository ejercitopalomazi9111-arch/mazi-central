/* La pantalla de Estudio en un Chromium de verdad a 390×844, contra el servidor
   de verdad (atenderEstudio en memoria) y una IA de mentiras que contesta en la
   forma que se le pide. Lo corre pruebas-estudio.mjs. FOTOS=carpeta guarda capturas. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PW = path.join(execSync('npm root -g').toString().trim(), 'playwright/index.mjs');

/* ── la IA de mentiras ── */
const LECCIONES = {};
function leccionDe(tema){
  if(LECCIONES[tema]) return LECCIONES[tema];
  const bio = /circulatorio/i.test(tema);
  const l = bio ? {
    leccion: { titulo: 'El sistema circulatorio y sus componentes', parrafo: 'El **sistema circulatorio** tiene la función principal de **transportar** nutrientes, oxígeno y otras sustancias vitales a través del cuerpo. Sus tres componentes trabajan juntos sin parar.', puntos: ['El **corazón**, que bombea la sangre.', 'La **sangre**, que circula constantemente.', 'Los **vasos sanguíneos**, conductos que guían su recorrido.'], dato: 'Tu corazón late unas 100 mil veces al día: más que cualquier motor que hayas visto.' },
    preguntas: [
      { tipo: 'opcion', pregunta: '¿Cuál es la función general del sistema circulatorio?', opciones: ['Transportar sustancias por el cuerpo', 'Producir pensamientos y recuerdos', 'Descomponer los alimentos en el estómago', 'Controlar los movimientos de los huesos'], correcta: 0, porque: 'Lleva oxígeno y nutrientes a cada célula y se lleva los desechos.', pista: 'Piensa en una red de carreteras.' },
      { tipo: 'hueco', frase: 'El órgano que bombea la sangre es el ___.', respuesta: 'corazón', distractores: ['riñón', 'estómago', 'pulmón'], porque: 'El corazón es un músculo que funciona como bomba.', pista: 'Late todo el tiempo.' },
      { tipo: 'opcion', pregunta: '¿Qué conductos guían el recorrido de la sangre?', opciones: ['Los nervios', 'Los vasos sanguíneos', 'Los tendones', 'Los bronquios'], correcta: 1, porque: 'Arterias, venas y capilares son vasos sanguíneos.', pista: 'Son como tubos.' },
      { tipo: 'hueco', frase: 'La ___ circula por los vasos sanguíneos.', respuesta: 'sangre', distractores: ['bilis', 'saliva', 'orina'], porque: 'La sangre es lo que se transporta.', pista: 'Es roja.' },
      { tipo: 'opcion', pregunta: '¿Qué transporta la sangre a las células?', opciones: ['Sólo agua', 'Oxígeno y nutrientes', 'Sólo hormonas', 'Aire'], correcta: 1, porque: 'Las células necesitan oxígeno y nutrientes para vivir.', pista: 'Lo que respiras y lo que comes.' },
      { tipo: 'opcion', pregunta: '¿Cuántos componentes principales tiene?', opciones: ['Dos', 'Tres', 'Cinco', 'Uno'], correcta: 1, porque: 'Corazón, sangre y vasos.', pista: 'Cuenta los puntos de la lección.' },
    ] } : {
    leccion: { titulo: tema, parrafo: `Esto es **${tema}** explicado en corto para el examen.`, puntos: ['Idea uno', 'Idea dos', 'Idea tres'], dato: 'Un truco para recordarlo.' },
    preguntas: [1, 2, 3, 4].map((k) => ({ tipo: 'opcion', pregunta: `Pregunta ${k} de ${tema}`, opciones: [`Buena ${k}`, `Mala A${k}`, `Mala B${k}`, `Mala C${k}`], correcta: 0, porque: 'Porque sí.', pista: 'La primera.' }))
      .concat([{ tipo: 'hueco', frase: `En ${tema} lo que falta es ___.`, respuesta: 'esto', distractores: ['aquello', 'nada', 'otro'], porque: 'Así es.', pista: 'Esto.' }]),
  };
  LECCIONES[tema] = l; return l;
}
const PLAN = { titulo: 'Examen de Biología', notas: 'Temas del bloque 2.', unidades: [
  { titulo: 'Bases del cuerpo', frase: 'Lo básico que todo examen pregunta.', temas: [{ titulo: 'Sistema circulatorio', resumen: 'Corazón, sangre y vasos.' }, { titulo: 'Sistema respiratorio', resumen: 'Pulmones.' }] },
  { titulo: 'Fundamentos', frase: 'Cómo se conecta todo.', temas: [{ titulo: 'Sistema nervioso', resumen: '' }, { titulo: 'Sistema endocrino', resumen: '' }] },
  { titulo: 'Dominio', frase: 'Lo que más cuesta.', temas: [{ titulo: 'Sistema inmunológico', resumen: '' }] },
] };
let pedidosIA = [];
function contestarIA(c){
  pedidosIA.push(c);
  const texto = (c.mensajes || [])[0]?.texto || '';
  if(/PLANES DE ESTUDIO/.test(c.sistema)) return { bien: true, texto: '```json\n' + JSON.stringify(PLAN) + '\n```' };
  const tema = (/Tema: (.+)/.exec(texto) || [])[1] || 'Tema';
  return { bien: true, texto: JSON.stringify(leccionDe(tema.trim())) };
}

export async function correr({ ok, almacen, atenderEstudio }){
  console.log('La pantalla');
  const { chromium } = await import(PW);
  const s = almacen();
  const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  let iaLenta = 0;
  const servidor = http.createServer(async (q, res) => {
    const u = new URL(q.url, 'http://x');
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
    if(q.method === 'OPTIONS'){ res.end(); return; }
    const cuerpo = await new Promise((ya) => { let d = ''; q.on('data', (c) => d += c); q.on('end', () => ya(d)); });
    if(u.pathname.endsWith('/estudio')){
      const r = await atenderEstudio(s, new Request('http://x' + q.url, { method: q.method, body: q.method === 'POST' ? cuerpo : undefined }), u, 'carlos');
      res.writeHead(r.status, { 'content-type': 'application/json' }); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    if(u.pathname.endsWith('/ia-texto')){
      if(iaLenta) await new Promise((r) => setTimeout(r, iaLenta));
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(contestarIA(JSON.parse(cuerpo)))); return;
    }
    const f = path.join(raiz, decodeURIComponent(u.pathname));
    if(!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0);
  const P = servidor.address().port, base = `http://localhost:${P}`;
  const url = `${base}/sala/estudio.html?servidor=${encodeURIComponent(base)}&sala=G`;
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try{ localStorage.setItem('salaLlave', 'prueba'); }catch{} });
  const pagina = await ctx.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => { if(m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(m.text()); });
  const foto = async (n) => { if(process.env.FOTOS){ fs.mkdirSync(process.env.FOTOS, { recursive: true }); await pagina.screenshot({ path: path.join(process.env.FOTOS, n + '.png') }); } };
  const desborde = () => pagina.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.capa, .hoja')].map((x) => x.scrollWidth)) - innerWidth);
  const espera = (ms) => pagina.waitForTimeout(ms);

  try{
    await pagina.goto(url); await espera(400);
    ok(await pagina.isVisible('text=¿Tienes un examen pronto?'), 'sin planes: «¿Tienes un examen pronto?»');
    ok(await desborde() <= 0, 'la portada no se sale de lado');
    await foto('01-portada');

    /* alta */
    await pagina.click('#bCrear');
    const materias = await pagina.$$eval('[data-mat]', (bs) => bs.map((b) => b.textContent.trim()));
    ok(materias.length >= 8 && materias.some((m) => /Química y Biología/.test(m)), 'las materias salen del horario del 3.1 (avisos/datos.js)');
    ok(await pagina.isDisabled('[data-sig]'), 'Continuar no deja seguir sin materia');
    await pagina.click('[data-mat="quimbio"]'); await pagina.click('[data-sig]');
    await pagina.click('[data-dias="7"]');
    ok(await pagina.isVisible('.calendario') && await pagina.isVisible('text=Guardamos tu examen'), 'al elegir fecha sale el calendario «Guardamos tu examen»');
    await foto('02-fecha');
    await pagina.click('[data-sig]');
    for(const t of ['Sistema circulatorio', 'Sistema respiratorio']){ await pagina.fill('#temaTxt', t); await pagina.press('#temaTxt', 'Enter'); }
    ok((await pagina.$$('#chipsTemas .chip')).length === 2, 'los temas se agregan como fichas');
    await foto('03-temas');
    iaLenta = 900;
    await pagina.click('[data-sig]');
    await espera(300);
    ok(await pagina.isVisible('text=Déjame preparar tu plan'), '«Déjame preparar tu plan» mientras la IA piensa');
    await foto('04-preparando');
    await pagina.waitForSelector('.camino', { timeout: 8000 }); iaLenta = 0;
    const pedidoPlan = pedidosIA.find((c) => /PLANES DE ESTUDIO/.test(c.sistema));
    ok(pedidoPlan && pedidoPlan.motor === 'groq' && /Sistema circulatorio/.test(pedidoPlan.mensajes[0].texto) && pedidoPlan.mensajes[0].de === 'tu', 'el plan lo pide a Negro, con los temas, y como persona (de: tu)');
    const nodos = await pagina.$$('.nodo');
    ok(nodos.length === 12, `el camino tiene un nodo por tema, pizarrón, tarjetas, simulacro y examen (${nodos.length})`);
    ok((await pagina.$$('.nodo.actual')).length === 1 && (await pagina.$$('.nodo.cerrado')).length === 11, 'sólo el primero está abierto');
    ok(/0 %/.test(await pagina.textContent('#avancePct')) && /Grado 6/.test(await pagina.textContent('#avanceGrado')) && /en 7 días/.test(await pagina.textContent('#avanceExamen')), 'arriba: 0 %, grado 6 y cuántos días faltan');
    ok(await desborde() <= 0, 'el camino no se sale de lado');
    await espera(800);
    await foto('05-camino');
    for(let k = 0; k < 30 && !pedidosIA.some((c) => /UNA lección/.test(c.sistema)); k++) await espera(100);
    ok(pedidosIA.some((c) => /UNA lección/.test(c.sistema) && /Sistema circulatorio/.test(c.mensajes[0].texto)), 'la primera lección se prepara sola en cuanto sale el camino' + ` (${pedidosIA.map((c) => (c.sistema || '').slice(0, 40)).join(' | ')})`);

    /* nodo cerrado */
    await pagina.evaluate(() => document.querySelectorAll('.nodo.cerrado')[2].click());
    ok(await pagina.isVisible('text=Primero termina el que está brillando'), 'un nodo cerrado avisa en vez de abrirse');

    /* lección 1 */
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('.leccion h1');
    ok(/sistema circulatorio/i.test(await pagina.textContent('.leccion h1')) && (await pagina.$$('.leccion b')).length >= 3, 'la lección sale con su título y sus negritas');
    await espera(2600);
    ok((await pagina.$$('.leccion li.luz')).length === 3, 'las ideas clave se iluminan una por una');
    ok(await desborde() <= 0, 'la lección no se sale de lado');
    await foto('06-leccion');

    /* el cuestionario: la primera la fallo a propósito */
    await pagina.click('[data-empezar]');
    const datos = leccionDe('Sistema circulatorio');
    let vistas = 0, falle = false, vioCombo = false, vioPista = false;
    for(let vuelta = 0; vuelta < 12; vuelta++){
      if(await pagina.isVisible('.resultado')) break;
      vistas++;
      const esHueco = await pagina.isVisible('#hueco');
      if(!vioPista && !esHueco && vuelta >= 2){ await pagina.click('[data-pista]'); vioPista = await pagina.isVisible('.pista'); }
      if(esHueco){
        const frase = (await pagina.textContent('.hueco-frase')).trim();
        const q = datos.preguntas.find((x) => x.tipo === 'hueco' && frase.startsWith(x.frase.split('___')[0].trim()));
        const cual = falle ? q.respuesta : q.distractores[0];
        await pagina.click(`.ficha:text-is("${cual}")`);
        await espera(350);
        ok((await pagina.textContent('#hueco')).includes(cual), 'la ficha vuela al hueco');
      } else {
        const preg = (await pagina.textContent('.habla .dice')).trim();
        const q = datos.preguntas.find((x) => x.pregunta === preg);
        const opc = !falle ? q.opciones[(q.correcta + 1) % 4] : q.opciones[q.correcta];
        await pagina.click(`.opc:text-is("${opc}")`);
      }
      await pagina.click('[data-verificar]');
      await pagina.waitForSelector('.hoja-res');
      if(!falle){
        falle = true;
        ok(await pagina.isVisible('.hoja-res.mal') && await pagina.isVisible('text=Te la vuelvo a preguntar al final'), 'una mala: hoja roja con la respuesta y «te la vuelvo a preguntar»');
        await pagina.click('[data-porque]'); ok(await pagina.isVisible('#porque'), '«¿Por qué?» explica');
        await foto('07-mal');
      }
      if(await pagina.isVisible('.combo') && !vioCombo){ vioCombo = true; await foto('08-combo'); }
      await pagina.click('[data-continuar]');
      await espera(150);
    }
    ok(vioPista, 'la pista sale al pedirla');
    ok(vioCombo, 'al encadenar buenas sale el COMBO');
    ok(vistas === 7, `la que fallé regresó al final (${vistas} preguntas para 6)`);
    await pagina.waitForSelector('.resultado');
    ok(await pagina.isVisible('text=XP') && /\d+ %/.test(await pagina.textContent('.medallas')), 'el resultado trae XP, aciertos y tiempo');
    await pagina.click('[data-estrella="5"]');
    ok((await pagina.$$('.estrellas .on')).length === 5, 'se califica con estrellas');
    await foto('09-resultado');
    await pagina.click('[data-continuar]');
    await pagina.waitForSelector('.camino'); await espera(1200);
    ok((await pagina.$$('.nodo.hecho')).length === 1, 'el nodo hecho se vuelve moneda');
    ok(!/^0 %/.test(await pagina.textContent('#avancePct')), 'el avance de arriba sube');
    const est = s.m.get('est:perfil:carlos');
    ok(est && est.xp > 0 && est.racha === 1, `el XP y la racha llegaron a La Sala (${est && est.xp} XP)`);
    ok(await pagina.isVisible('#pRacha') && /1/.test(await pagina.textContent('#pRacha')), 'la racha de 1 se ve arriba');

    /* lección 2, todo bien */
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('[data-empezar]', { timeout: 8000 });
    await pagina.click('[data-empezar]');
    const d2 = leccionDe('Sistema respiratorio');
    for(let k = 0; k < 10 && !(await pagina.isVisible('.resultado')); k++){
      if(await pagina.isVisible('#hueco')) await pagina.click(`.ficha:text-is("${d2.preguntas.find((x) => x.tipo === 'hueco').respuesta}")`);
      else { const preg = (await pagina.textContent('.habla .dice')).trim(); const q = d2.preguntas.find((x) => x.pregunta === preg); await pagina.click(`.opc:text-is("${q.opciones[q.correcta]}")`); }
      await pagina.click('[data-verificar]'); await pagina.click('[data-continuar]'); await espera(120);
    }
    ok(await pagina.isVisible('text=¡La rompiste!') && /100 %/.test(await pagina.textContent('.medallas')), 'todo bien: «¡La rompiste!» con 100 %');
    await pagina.click('[data-continuar]'); await pagina.waitForSelector('.camino');

    /* tarjetas de la unidad 1 (salen de las preguntas: no gastan IA) */
    const antesIA = pedidosIA.length;
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('#tarjeta');
    ok(pedidosIA.length === antesIA, 'las tarjetas no le piden nada a la IA');
    ok(await pagina.isDisabled('[data-se]'), '«Me la sé» espera a que voltees la tarjeta');
    await pagina.click('#tarjeta'); await espera(600);
    await foto('10-tarjeta');
    await pagina.click('[data-otra]');
    for(let k = 0; k < 20 && !(await pagina.isVisible('.resultado')); k++){ await pagina.click('#tarjeta'); await pagina.click('[data-se]'); }
    ok(await pagina.isVisible('text=¡Tarjetas dominadas!'), 'al sabérselas todas: «¡Tarjetas dominadas!»');
    await pagina.click('[data-continuar]'); await pagina.waitForSelector('.camino');

    /* la lección de la unidad 2, de corrido */
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('[data-empezar]', { timeout: 8000 }); await pagina.click('[data-empezar]');
    const d3 = leccionDe('Sistema nervioso');
    for(let k = 0; k < 10 && !(await pagina.isVisible('.resultado')); k++){
      if(await pagina.isVisible('#hueco')) await pagina.click(`.ficha:text-is("${d3.preguntas.find((x) => x.tipo === 'hueco').respuesta}")`);
      else { const preg = (await pagina.textContent('.habla .dice')).trim(); const q = d3.preguntas.find((x) => x.pregunta === preg); await pagina.click(`.opc:text-is("${q.opciones[q.correcta]}")`); }
      await pagina.click('[data-verificar]'); await pagina.click('[data-continuar]'); await espera(120);
    }
    await pagina.click('[data-continuar]'); await pagina.waitForSelector('.camino');

    /* clase en el pizarrón (Explica) */
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('.capa.pizarra iframe');
    const src = await pagina.getAttribute('.capa.pizarra iframe', 'src');
    ok(/explica\.html\?/.test(src) && /tema=Sistema\+nervioso/.test(src) && /largo=corta/.test(src), 'el nodo del pizarrón abre Explica con el tema y clase corta');
    const marco = pagina.frames().find((f) => /explica\.html/.test(f.url()));
    await marco.waitForSelector('#tema');
    ok((await marco.inputValue('#tema')).startsWith('Sistema nervioso') && await marco.inputValue('#largo') === 'corta', 'Explica llega con el tema y el largo puestos');
    await pagina.click('[data-vista]'); await pagina.waitForSelector('.camino'); await espera(400);
    ok((await pagina.$$('.nodo.hecho')).length === 5, 'la clase vista cuenta como hecha');

    /* grado sube */
    ok(/Grado [78]/.test(await pagina.textContent('#avanceGrado')), 'con 5 de 12 el grado ya subió');
    await foto('11-camino-avanzado');

    /* menú del plan */
    await pagina.click('#bMenuPlan');
    ok(await pagina.isVisible('text=Crear nuevo plan') && await pagina.isVisible('text=Eliminar plan'), 'el menú del plan tiene crear, editar, material, compartir y eliminar');
    await pagina.click('[data-m="editar"]'); await pagina.fill('#eNom', 'Biología bloque 2'); await pagina.click('#eGuardar');
    ok((await pagina.textContent('#planNombre')) === 'Biología bloque 2', 'editar cambia el nombre del plan');

    /* horario pegado de Excel */
    await pagina.click('[data-ir="horario"]');
    await pagina.click('#bPegarHorario');
    await pagina.fill('#pTxt', 'Hora\tLunes\tMartes\tMiércoles\tJueves\tViernes\n7:00-7:50\tFísica\tInglés\tFísica\tQuímica y Biología III\tTEC III\n7:50-8:40\tProgramación y BD\tReceso\tInglés\tFísica\tGeometría Analítica');
    await pagina.click('#pListo'); await espera(300);
    ok((await pagina.$$('.clase-h')).length === 9, 'el horario pegado de Excel sale por día (sin el receso)');
    ok((await pagina.textContent('#vHorario')).includes('Próximos exámenes'), 'el horario enseña el examen que viene');
    ok(await desborde() <= 0, 'el horario no se sale de lado');
    await foto('12-horario');
    await espera(300);
    ok((s.m.get('est:perfil:carlos').horario || {}).clases?.length === 9, 'el horario se guarda en La Sala');

    /* ranking */
    await s.put('est:sem:' + (await import('./servidor/estudio.js')).semanaDe((await import('./servidor/estudio.js')).diaMexico(Date.now())), { ...(await s.get('est:sem:' + (await import('./servidor/estudio.js')).semanaDe((await import('./servidor/estudio.js')).diaMexico(Date.now())))), luis: { xp: 9999, nombre: 'Luis' } });
    await pagina.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await espera(500);
    await pagina.click('[data-ir="ranking"]'); await espera(300);
    const filas = await pagina.$$eval('.fila-rank', (fs) => fs.map((f) => f.textContent));
    ok(filas.length === 2 && /Luis/.test(filas[0]) && /\(tú\)/.test(filas[1]), 'el ranking junta las cuentas de La Sala y marca la tuya');
    ok(await pagina.isVisible('text=para llegar a la cima'), 'dice cuántos lugares faltan');
    await foto('13-ranking');

    /* perfil */
    await pagina.click('[data-ir="perfil"]');
    await pagina.fill('#pNombre', 'Palomazi'); await pagina.press('#pNombre', 'Tab'); await espera(400);
    ok(s.m.get('est:perfil:carlos').nombre === 'Palomazi', 'el nombre del perfil se guarda en La Sala');
    await pagina.click('[data-aj="sonido"]');
    ok(await pagina.getAttribute('[data-aj="sonido"]', 'aria-checked') === 'false', 'el sonido se apaga');
    ok(await desborde() <= 0, 'el perfil no se sale de lado');
    await foto('14-perfil');

    /* otro teléfono: el plan y el avance llegan de La Sala */
    const ctx2 = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx2.addInitScript(() => { try{ localStorage.setItem('salaLlave', 'prueba'); }catch{} });
    const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => errores.push('tel2: ' + e.message));
    await p2.goto(url); await p2.waitForSelector('.camino', { timeout: 8000 });
    ok((await p2.$$('.nodo.hecho')).length === 5 && (await p2.textContent('#planNombre')) === 'Biología bloque 2', 'en otro teléfono sale el mismo plan con el mismo avance');
    await ctx2.close();

    /* 320 de ancho */
    await pagina.setViewportSize({ width: 320, height: 640 });
    await pagina.click('[data-ir="plan"]'); await espera(300);
    ok(await desborde() <= 0, 'a 320 px el camino no se sale de lado');
    await pagina.click('.siguiente [data-nodo]'); await pagina.waitForSelector('[data-empezar]', { timeout: 8000 }); await pagina.click('[data-empezar]');
    ok(await desborde() <= 0, 'a 320 px el cuestionario no se sale de lado');
    await pagina.click('[data-cerrar]');

    ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
  }catch(e){ ok(false, 'la prueba tronó: ' + e.message.split('\n')[0]); if(process.env.FOTOS) await foto('99-error'); }
  finally{ await nav.close(); servidor.close(); }
}
