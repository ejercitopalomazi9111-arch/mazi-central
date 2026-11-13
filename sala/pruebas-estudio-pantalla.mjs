/* La pantalla de CARYMO (antes «Estudio») en un Chromium de verdad a 390×844, contra el servidor
   de verdad (atenderEstudio en memoria) y una IA de mentiras que contesta en la forma que se le
   pide… y a veces MAL, como la de verdad: con comas de más (lo que le tronó a Carlos el 12 nov)
   o con texto que no es JSON (y entonces la app la vuelve a pedir).
   Lo corre pruebas-estudio.mjs. FOTOS=carpeta guarda capturas. */
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
    /* la forma nueva: ideas cortas, una por pantalla, con su dibujo */
    leccion: { titulo: 'El sistema circulatorio', ideas: [
      { titulo: 'Para qué sirve', texto: 'Lleva **oxígeno** y nutrientes a cada célula, y se lleva los desechos.', icono: 'heart-pulse' },
      { titulo: 'La bomba', texto: 'El **corazón** empuja la sangre sin parar, unas 70 veces por minuto.', icono: 'heart' },
      { titulo: 'El camino', texto: 'Los **vasos sanguíneos** son los tubos por donde viaja la sangre.', icono: 'route-que-no-existe' },
    ], dato: 'Piensa en una red de carreteras: el corazón es la bomba, la sangre los coches.' },
    preguntas: [
      { tipo: 'opcion', pregunta: '¿Cuál es la función general del sistema circulatorio?', opciones: ['Transportar sustancias por el cuerpo', 'Producir pensamientos y recuerdos', 'Descomponer los alimentos en el estómago', 'Controlar los movimientos de los huesos'], correcta: 0, porque: 'Lleva oxígeno y nutrientes a cada célula y se lleva los desechos.', pista: 'Piensa en una red de carreteras.' },
      { tipo: 'hueco', frase: 'El órgano que bombea la sangre es el ___.', respuesta: 'corazón', distractores: ['riñón', 'estómago', 'pulmón'], porque: 'El corazón es un músculo que funciona como bomba.', pista: 'Late todo el tiempo.' },
      { tipo: 'escribir', pregunta: '¿Qué órgano bombea la sangre?', respuesta: 'corazón', aceptadas: ['el corazón'], porque: 'Es un músculo que funciona como bomba.', pista: 'Late.' },
      { tipo: 'unir', pregunta: 'Conecta cada parte con lo que hace', pares: [['Corazón', 'Bombea'], ['Arterias', 'Salen del corazón'], ['Venas', 'Regresan al corazón'], ['Capilares', 'Intercambian con las células']], porque: 'Cada parte tiene su trabajo.' },
      { tipo: 'imagen', pregunta: '¿Cuál es el corazón?', opciones: [{ texto: 'Corazón', buscar: 'Corazón humano', icono: 'heart' }, { texto: 'Cerebro', buscar: '', icono: 'brain' }, { texto: 'Pulmón', buscar: '', icono: 'wind' }, { texto: 'Hueso', buscar: '', icono: 'bone' }], correcta: 0, porque: 'El corazón es el que bombea.' },
      { tipo: 'error', pregunta: 'En este recorrido hay UN paso mal. ¿Cuál?', pasos: ['El corazón bombea', 'La sangre sale por las arterias', 'La sangre regresa por los nervios', 'Vuelve al corazón'], error: 2, correccion: 'Regresa por las venas', porque: 'Los nervios llevan señales, no sangre.' },
      { tipo: 'ordenar', pregunta: 'Arma el diagrama del recorrido', pasos: ['El corazón bombea', 'Sale por las arterias', 'Llega a los capilares', 'Regresa por las venas'], porque: 'Es un circuito.' },
      { tipo: 'clasificar', pregunta: 'Clasifica cada vaso', grupos: [{ nombre: 'Llevan sangre al cuerpo', items: ['Aorta', 'Arterias'] }, { nombre: 'Regresan sangre', items: ['Venas', 'Vena cava'] }], porque: 'Unas salen y otras regresan.' },
    ] } : {
    /* la forma vieja (párrafo y puntos): las lecciones guardadas así también se tienen que ver ligeras */
    leccion: { titulo: tema, parrafo: `Esto es **${tema}** explicado en corto para el examen. Va una segunda frase.`, puntos: ['Idea uno', 'Idea dos', 'Idea tres'], dato: 'Un truco para recordarlo.' },
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
const vecesTema = {};
function contestarIA(c){
  pedidosIA.push(c);
  const texto = (c.mensajes || [])[0]?.texto || '';
  if(/FOTO de un horario/.test(c.sistema)) return { bien: true, texto: JSON.stringify({ clases: [
    { dia: 0, inicio: '07:00', fin: '08:00', materia: 'Admon. y Estruc. de redes' }, { dia: 0, inicio: '10:00', fin: '10:30', materia: 'RECESO' },
    { dia: 1, inicio: '7:00', fin: '8:00', materia: 'Metodología de la Inv. I STEAM' }, { dia: 4, inicio: '13:00', fin: '13:50', materia: 'Programación & BD' },
    { dia: 9, inicio: '07:00', fin: '08:00', materia: 'Día que no existe' }, { dia: 2, inicio: '09:00', fin: '08:00', materia: 'Al revés' } ] }) };
  if(/PLANES DE ESTUDIO/.test(c.sistema)) return { bien: true, texto: '```json\n' + JSON.stringify(PLAN) + '\n```' };
  const tema = ((/Tema: (.+)/.exec(texto) || [])[1] || 'Tema').trim();
  vecesTema[tema] = (vecesTema[tema] || 0) + 1;
  const bueno = JSON.stringify(leccionDe(tema), null, 1);
  /* respiratorio: JSON con comas de más y un comentario (lo que le tronó a Carlos) */
  if(/respiratorio/i.test(tema)) return { bien: true, texto: bueno.replace(/"\n(\s*)\]/g, '",\n$1]').replace(/\}\n(\s*)\]/g, '},\n$1]').replace('{', '{ // lección\n') };
  /* nervioso: la primera vez contesta algo que no es JSON; la segunda, bien */
  if(/nervioso/i.test(tema) && vecesTema[tema] === 1) return { bien: true, texto: 'Claro que sí, con gusto te ayudo con eso.' };
  return { bien: true, texto: bueno };
}

export async function correr({ ok, almacen, atenderEstudio }){
  console.log('La pantalla');
  const { chromium } = await import(PW);
  const s = almacen();
  const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  let iaLenta = 0, iaVeces = 0;
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
      iaVeces++;
      if(iaLenta) await new Promise((r) => setTimeout(r, iaLenta));
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(contestarIA(JSON.parse(cuerpo)))); return;
    }
    let f = path.join(raiz, decodeURIComponent(u.pathname));
    if(fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");   /* como Cloudflare: la carpeta sirve su index */
    if(!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0);
  const P = servidor.address().port, base = `http://localhost:${P}`;
  const url = `${base}/carymo/index.html?servidor=${encodeURIComponent(base)}&sala=G`;
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try{ localStorage.setItem('salaLlave', 'prueba'); }catch{} });
  /* Wikipedia de mentiras (aquí no hay internet): la foto del corazón es una del repo */
  await ctx.route(/wikipedia\.org/, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ title: 'Corazón humano', thumbnail: { source: `${base}/urban-pest/web/img/planta.webp` } }) }));
  const pagina = await ctx.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => { if(m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(m.text()); });
  const foto = async (n) => { if(process.env.FOTOS){ fs.mkdirSync(process.env.FOTOS, { recursive: true }); await pagina.screenshot({ path: path.join(process.env.FOTOS, n + '.png') }); } };
  const desborde = () => pagina.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.capa, .hoja')].map((x) => x.scrollWidth)) - innerWidth);
  const espera = (ms) => pagina.waitForTimeout(ms);
  const siguienteEs = async () => (await pagina.textContent('.siguiente small')).trim();
  const hechos = () => pagina.$$eval('.nodo.hecho', (x) => x.length);
  /* una cátedra: abre el pizarrón y se marca vista */
  async function catedra(){
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('.capa.pizarra iframe');
    const src = decodeURIComponent((await pagina.getAttribute('.capa.pizarra iframe', 'src')).replace(/\+/g, ' '));
    await pagina.click('[data-vista]'); await pagina.waitForSelector('.camino'); await espera(250);
    return src;
  }
  /* contesta la pregunta que esté en pantalla, del tipo que sea; con bien=false se equivoca a propósito */
  async function contestar(d, bien = true){
    const tipo = await pagina.getAttribute('#qCuerpo', 'data-tipo');
    const de = (t) => d.preguntas.filter((x) => x.tipo === t);
    if(tipo === 'opcion'){ const preg = (await pagina.textContent('.habla .dice')).trim(); const q = de('opcion').find((x) => x.pregunta === preg); await pagina.click(`.opc:text-is("${q.opciones[bien ? q.correcta : (q.correcta + 1) % q.opciones.length]}")`); }
    else if(tipo === 'hueco'){ const frase = (await pagina.textContent('.hueco-frase')).trim(); const q = de('hueco').find((x) => frase.startsWith(x.frase.split('___')[0].trim())); await pagina.click(`.ficha:text-is("${bien ? q.respuesta : q.distractores[0]}")`); }
    else if(tipo === 'escribir'){ const q = de('escribir')[0]; await pagina.fill('#escribe', bien ? q.respuesta.replace(/ó/g, 'o').replace(/z/, 's') : 'riñón izquierdo'); }
    else if(tipo === 'unir'){ const q = de('unir')[0]; if(!bien){ await pagina.click('[data-u="i0"]'); await pagina.click('[data-u="d1"]'); } for(let k = 0; k < q.pares.length; k++){ await pagina.click(`[data-u="i${k}"]`); await pagina.click(`[data-u="d${k}"]`); } }
    else if(tipo === 'imagen'){ const q = de('imagen')[0]; await pagina.click(`[data-img="${bien ? q.correcta : (q.correcta + 1) % q.opciones.length}"]`); }
    else if(tipo === 'error'){ const q = de('error')[0]; await pagina.click(`[data-err="${bien ? q.error : (q.error + 1) % q.pasos.length}"]`); }
    else if(tipo === 'ordenar'){ const q = de('ordenar')[0]; const orden = bien ? q.pasos : [q.pasos[1], q.pasos[0], ...q.pasos.slice(2)]; for(const p of orden) await pagina.click(`.fichas.sueltas .ficha:text-is("${p}")`); }
    else if(tipo === 'clasificar'){ const q = de('clasificar')[0]; for(const [gi, g] of q.grupos.entries()) for(const it of g.items){ await pagina.click(`.ficha:text-is("${it}")`); await pagina.click(`[data-grupo="${bien ? gi : (gi + 1) % q.grupos.length}"]`); } }
    return tipo;
  }
  /* un nivel entero, todo bien (pasa las ideas y contesta) */
  async function nivelBien(tema){
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('.historia', { timeout: 10000 });
    for(let k = 0; k < 8 && await pagina.isVisible('[data-sig]'); k++) await pagina.click('[data-sig]');
    await pagina.click('[data-empezar]');
    const d = leccionDe(tema);
    for(let k = 0; k < 14 && !(await pagina.isVisible('.resultado')); k++){
      await contestar(d, true);
      await pagina.click('[data-verificar]'); await pagina.click('[data-continuar]'); await espera(120);
    }
  }

  try{
    await pagina.goto(url); await espera(400);
    ok(await pagina.isVisible('.marca-carymo') && /CARYMO/.test(await pagina.textContent('.marca-carymo')) && /Learn\. Explore\. Grow\./.test(await pagina.textContent('.marca-carymo')), 'la portada dice CARYMO · Learn. Explore. Grow.');
    ok(await pagina.isVisible('text=Todo lo que puedes aprender, en un solo lugar.'), 'y su lema');
    ok((await pagina.title()).startsWith('CARYMO'), 'la pestaña del navegador se llama CARYMO');
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
    iaLenta = 900;
    await pagina.click('[data-sig]');
    await espera(300);
    ok(await pagina.isVisible('text=Déjame preparar tu plan'), '«Déjame preparar tu plan» mientras la IA piensa');
    await pagina.waitForSelector('.camino', { timeout: 8000 }); iaLenta = 0;
    const pedidoPlan = pedidosIA.find((c) => /PLANES DE ESTUDIO/.test(c.sistema));
    ok(pedidoPlan && pedidoPlan.motor === 'groq' && /Sistema circulatorio/.test(pedidoPlan.mensajes[0].texto) && pedidoPlan.mensajes[0].de === 'tu', 'el plan lo pide a Negro, con los temas, y como persona (de: tu)');

    /* el camino: panorama de la unidad → por tema, cátedra y luego el nivel → tarjetas; al final simulacro y examen */
    const tipos = await pagina.$$eval('.nodo', (ns) => ns.map((n) => n.getAttribute('aria-label').split(':')[0]));
    ok(tipos.length === 18, `el camino tiene panorama, cátedra y nivel por tema, tarjetas, simulacro y examen (${tipos.length})`);
    ok(tipos[0] === 'Panorama de la unidad' && tipos[1] === 'Cátedra en el pizarrón' && /^Nivel/.test(tipos[2]) && tipos[3] === 'Cátedra en el pizarrón' && /^Nivel/.test(tipos[4]) && tipos[5] === 'Tarjetas', 'cada unidad abre con su panorama y cada nivel lleva antes su cátedra');
    ok((await pagina.$$('.nodo.actual')).length === 1 && (await pagina.$$('.nodo.cerrado')).length === 17, 'sólo el primero está abierto');
    ok(/0 %/.test(await pagina.textContent('#avancePct')) && /Grado 6/.test(await pagina.textContent('#avanceGrado')) && /en 7 días/.test(await pagina.textContent('#avanceExamen')), 'arriba: 0 %, grado 6 y cuántos días faltan');
    ok(await desborde() <= 0, 'el camino no se sale de lado');
    await espera(800);
    await foto('05-camino');
    ok(await pagina.$eval('.masc-camino .masc-cuerpo img', (i) => i.complete && i.naturalWidth > 0 && /tigre-/.test(i.src)).catch(() => false), 'la mascota (el tigre) está junto al nivel que toca');
    for(let k = 0; k < 30 && !pedidosIA.some((c) => /UNA lección/.test(c.sistema)); k++) await espera(100);
    ok(pedidosIA.some((c) => /UNA lección/.test(c.sistema) && /Sistema circulatorio/.test(c.mensajes[0].texto)), 'el primer nivel se prepara solo mientras ves las cátedras');

    await pagina.evaluate(() => document.querySelectorAll('.nodo.cerrado')[2].click());
    ok(await pagina.isVisible('text=Primero termina el que está brillando'), 'un nodo cerrado avisa en vez de abrirse');

    /* 1 · panorama de la unidad */
    ok(await siguienteEs() === 'Panorama de la unidad', 'lo primero es el panorama de la unidad');
    let src = await catedra();
    ok(/Panorama general de «Bases del cuerpo»/.test(src) && /Sistema circulatorio, Sistema respiratorio/.test(src) && /largo=normal/.test(src), 'el panorama le pide a Explica la idea general de TODA la unidad');
    /* 2 · cátedra del tema 1 */
    ok(await siguienteEs() === 'Cátedra en el pizarrón', 'después, la cátedra del primer tema');
    src = await catedra();
    ok(/tema=Sistema circulatorio/.test(src) && /largo=corta/.test(src), 'la cátedra es del tema y corta');
    ok(await hechos() === 2, 'panorama y cátedra cuentan como hechos');

    /* 3 · el nivel: la lección tipo historias, una idea por pantalla */
    ok(/^Nivel/.test(await siguienteEs()), 'y hasta entonces, el nivel');
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('.historia');
    const segs = await pagina.$$eval('.segmentos i', (x) => x.length);
    ok(segs === 4, `la lección va en pantallas: 3 ideas y el truco para recordarlo (${segs})`);
    ok(await pagina.isVisible('.historia .tema-hist') && /sistema circulatorio/i.test(await pagina.textContent('.tema-hist')), 'arriba de la primera idea dice de qué es la lección');
    ok(await pagina.isVisible('.dib-idea') && (await pagina.$$eval('.dib-idea > *', (x) => x.length)) > 0, 'cada idea trae su dibujo, que se traza solo');
    const palabras = (await pagina.textContent('.txt-hist')).trim().split(/\s+/).length;
    ok(palabras <= 25, `cada pantalla es UNA idea corta (${palabras} palabras)`);
    await espera(600); ok(await desborde() <= 0, 'la lección no se sale de lado (ya quieta: al entrar se desliza 24 px, recortado)');
    await espera(900);
    await foto('06-leccion');
    await pagina.click('[data-sig]'); await pagina.click('[data-sig]');
    ok(await pagina.isVisible('.dib-idea'), 'un dibujo que no existe se cambia por uno que sí');
    await pagina.click('[data-atras]');
    ok((await pagina.$$eval('.segmentos i.ya', (x) => x.length)) === 1, 'tocar la izquierda regresa a la idea anterior');
    await pagina.click('[data-sig]'); await pagina.click('[data-sig]');
    ok(await pagina.isVisible('.historia.es-dato') && await pagina.isVisible('[data-empezar]'), 'la última pantalla es el truco para recordarlo, con «Empezar cuestionario»');
    await foto('06b-dato');

    /* el cuestionario: un ejercicio de cada tipo; el primero lo fallo a propósito */
    await pagina.click('[data-empezar]');
    const datos = leccionDe('Sistema circulatorio');
    let vistas = 0, falle = false, vioPista = false, maxComboVisto = 0;
    const tiposVistos = new Set(), fotosTipo = new Set();
    for(let vuelta = 0; vuelta < 14; vuelta++){
      if(await pagina.isVisible('.resultado')) break;
      vistas++;
      const tipo = await pagina.getAttribute('#qCuerpo', 'data-tipo');
      if(!vioPista && tipo === 'opcion' && await pagina.isEnabled('[data-pista]')){ await pagina.click('[data-pista]'); vioPista = await pagina.isVisible('.pista'); }
      await contestar(datos, falle);
      tiposVistos.add(tipo);
      if(!fotosTipo.has(tipo) && process.env.FOTOS){ fotosTipo.add(tipo); await foto('ej-' + tipo); }
      ok(await pagina.isEnabled('[data-verificar]'), `«${tipo}»: Verificar se prende al contestar`);
      await pagina.click('[data-verificar]');
      await pagina.waitForSelector('.hoja-res');
      const estaLaFalle = !falle;
      if(!falle){
        falle = true;
        ok(await pagina.isVisible('.hoja-res.mal') && await pagina.isVisible('text=Te la vuelvo a preguntar al final'), 'una mala: hoja roja con la respuesta y «te la vuelvo a preguntar»');
      } else ok(await pagina.isVisible('.hoja-res.bien'), `«${tipo}» contestado bien cuenta como bien`);
      if(tipo === 'escribir' && !estaLaFalle) ok(/Casi perfecto/.test(await pagina.textContent('.hoja-res')), 'escribir con errores de dedo («corason») cuenta como bien y te dice cómo se escribe');
      await espera(140);
      const combo = await pagina.$$eval('.combo-vfx .combo-txt b', (x) => x.map((b) => +b.textContent.replace('x', '')));
      if(combo.length){ maxComboVisto = Math.max(maxComboVisto, ...combo); if(combo[0] === 2 && process.env.FOTOS) await foto('08-combo'); }
      await pagina.click('[data-continuar]');
      await espera(150);
    }
    ok(['opcion', 'hueco', 'escribir', 'unir', 'imagen', 'error', 'ordenar', 'clasificar'].every((t) => tiposVistos.has(t)), `salen los 8 tipos de ejercicio (${[...tiposVistos].join(', ')})`);
    ok(vioPista, 'la pista sale al pedirla');
    ok(maxComboVisto >= 6, `el combo sale en CADA acierto seguido, con sus efectos (llegó a x${maxComboVisto})`);
    ok(vistas === 9, `la que fallé regresó al final (${vistas} ejercicios para 8)`);
    await pagina.waitForSelector('.resultado');
    ok(await pagina.isVisible('text=XP') && /\d+ %/.test(await pagina.textContent('.medallas')), 'el resultado trae XP, aciertos y tiempo');
    await pagina.click('[data-estrella="5"]');
    ok((await pagina.$$('.estrellas .on')).length === 5, 'se califica con estrellas');
    await foto('09-resultado');
    ok(await pagina.$eval('#mascFin .masc-cuerpo img', (i) => i.complete && i.naturalWidth > 0).catch(() => false), 'al terminar, la mascota reacciona al resultado');
    await pagina.click('[data-continuar]');
    await pagina.waitForSelector('.camino'); await espera(1200);
    ok(await hechos() === 3, 'el nivel hecho se vuelve moneda');
    const est = s.m.get('est:perfil:carlos');
    ok(est && est.xp > 0 && est.racha === 1, `el XP y la racha llegaron a La Sala (${est && est.xp} XP)`);
    ok(await pagina.isVisible('#pRacha') && /1/.test(await pagina.textContent('#pRacha')), 'la racha de 1 se ve arriba');
    /* la biblioteca: la lección que armó la IA quedó guardada para el siguiente que la pida */
    const enBiblio = [...s.m.keys()].filter((k) => k.startsWith('est:mem:leccion:'));
    ok(enBiblio.length >= 1 && enBiblio.some((k) => /circulatorio/.test(k)), `la lección quedó en la biblioteca de la sala (${enBiblio.length})`);
    {
      const iaAntes = iaVeces;
      const otra = await pagina.evaluate(async () => { const r = await fetch(new URL('../carymo/index.html', location.href)); return r.ok; });
      const res = await pagina.evaluate(async (b) => {
        const r = await fetch(`${b}/api/sala/G/estudio`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accion: 'memoria', tipo: 'leccion', materia: 'Química y Biología', titulo: 'sistema circulatorio', nivel: 'prepa' }) });
        return r.json();
      }, base);
      ok(otra && res.hallado && res.hallado.datos && res.hallado.datos.preguntas && res.hallado.datos.preguntas.length >= 8, 'otro alumno que pida «sistema circulatorio» la recibe entera de la biblioteca, sin gastar IA (' + JSON.stringify(res).slice(0, 80) + ')');
    }

    /* 4 · tema 2: su cátedra y su nivel… con el JSON mal escrito (comas de más y un comentario) */
    await catedra();
    await nivelBien('Sistema respiratorio');
    ok(await pagina.isVisible('text=¡La rompiste!') && /100 %/.test(await pagina.textContent('.medallas')), 'aunque la IA mandó el JSON con comas de más, el nivel salió y quedó «¡La rompiste!» con 100 %');
    ok(vecesTema['Sistema respiratorio'] === 1, 'y se reparó sin volver a pedirlo');
    await pagina.click('[data-continuar]'); await pagina.waitForSelector('.camino');

    /* 5 · tarjetas de la unidad 1 (salen de las preguntas: no gastan IA) */
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

    /* 6 · unidad 2: panorama, cátedra (personalizada) y el nivel… con una IA que la primera vez contesta cualquier cosa */
    ok(await siguienteEs() === 'Panorama de la unidad', 'la unidad 2 también abre con su panorama');
    src = await catedra();
    ok(/«Fundamentos»/.test(src), 'el panorama es de la unidad 2');
    src = await catedra();
    const marcoUrl = src;
    ok(/tema=Sistema nervioso/.test(marcoUrl) && /contexto=/.test(marcoUrl) && /Ya estudió: .*Sistema circulatorio/.test(marcoUrl), 'la cátedra va personalizada: sabe qué examen prepara y qué ya estudió');
    await nivelBien('Sistema nervioso');
    ok(vecesTema['Sistema nervioso'] === 2 && await pagina.isVisible('.resultado'), 'cuando la IA contesta algo que no es JSON, la app se lo vuelve a pedir sola y sigue');
    await pagina.click('[data-continuar]'); await pagina.waitForSelector('.camino');
    ok(/Grado [78]/.test(await pagina.textContent('#avanceGrado')), 'el grado ya subió');
    await foto('11-camino-avanzado');

    /* la cátedra se ve en Explica con el tema y el largo puestos */
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('.capa.pizarra iframe');
    const marco = pagina.frames().find((f) => /explica\.html/.test(f.url()));
    await marco.waitForSelector('#tema');
    ok((await marco.inputValue('#tema')).startsWith('Sistema endocrino') && await marco.inputValue('#largo') === 'corta', 'Explica llega con el tema y el largo puestos');
    await pagina.click('[data-cerrar]'); await pagina.waitForSelector('.camino');

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
    await espera(300);
    ok((s.m.get('est:perfil:carlos').horario || {}).clases?.length === 9, 'el horario se guarda en La Sala');
    /* horario desde una FOTO: la IA lo lee, se enseña antes de guardar, y lo que no tiene sentido se tira */
    await pagina.setInputFiles('#fFotoHorario', path.join(raiz, 'carymo/marca/icono-192.png'));
    await pagina.waitForSelector('#fhUsar', { timeout: 15000 });
    ok(/Encontré 3 clases/.test(await pagina.textContent('#hoja h3')), 'la foto del horario se lee y enseña lo que encontró (sin receso, sin día imposible ni horas al revés)');
    await foto('12-horario-foto');
    await pagina.click('#fhUsar'); await espera(400);
    ok((await pagina.$$('.clase-h')).length === 3 && /Metodología/.test(await pagina.textContent('#vHorario')), 'al confirmar, el horario de la foto queda puesto');

    /* ranking */
    const { semanaDe, diaMexico } = await import('./servidor/estudio.js');
    const k = 'est:sem:' + semanaDe(diaMexico(Date.now()));
    await s.put(k, { ...(await s.get(k)), luis: { xp: 9999, nombre: 'Luis' } });
    await pagina.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await espera(500);
    await pagina.click('[data-ir="ranking"]'); await espera(300);
    const filas = await pagina.$$eval('.fila-rank', (fs) => fs.map((f) => f.textContent));
    ok(filas.length === 2 && /Luis/.test(filas[0]) && /\(tú\)/.test(filas[1]), 'el ranking junta las cuentas de La Sala y marca la tuya');
    ok(await pagina.isVisible('text=para llegar a la cima'), 'dice cuántos lugares faltan');
    await foto('13-ranking');

    /* amigos: Luis tiene la app abierta, lo agrego, me invita a estudiar juntos, y al final «¿cómo te fue?» */
    {
      const como = (cuenta, cuerpo) => atenderEstudio(s, new Request('http://x/estudio', { method: 'POST', body: JSON.stringify(cuerpo) }), new URL('http://x/estudio'), cuenta, Date.now()).then((x) => x.json());
      await como('luis', { accion: 'perfil', nombre: 'Luis' }); await como('luis', { accion: 'latido', estado: 'estudiando', materia: 'Física' });
      await pagina.evaluate(() => window.__estudio.amigos().latido()); await espera(400);
      ok(await pagina.isVisible('#secAmigos') && /Luis/.test(await pagina.textContent('#secAmigos')) && /estudiando Física/.test(await pagina.textContent('#secAmigos')), 'en Ranking salen los que tienen la app abierta, y qué están estudiando');
      ok(await pagina.isVisible('[data-am="invitar"][data-cuenta="luis"]'), '…con «Estudiar juntos» a la mano');
      await pagina.click('[data-am="amistad"][data-cuenta="luis"]'); await espera(400);
      ok(((await s.get('est:amigos:luis')) || {}).pide?.includes('carlos'), 'tocar «Agregar» le manda la solicitud');
      await como('luis', { accion: 'amistad', a: 'carlos' }); await como('luis', { accion: 'latido' });
      await pagina.evaluate(() => window.__estudio.amigos().latido()); await espera(500);
      ok(/ya es tu amigo/.test(await pagina.textContent('#brindis')), 'cuando acepta, llega el aviso');
      ok(await pagina.isVisible('[data-am="felicita"][data-cuenta="luis"]'), 'y sale en «Tus amigos» con Felicitar y Saludar');
      await foto('14-amigos');
      await como('luis', { accion: 'latido' });
      const inv = await como('luis', { accion: 'invitar', a: 'carlos', minutos: 15 });
      ok(inv.bien, 'Luis me invita a estudiar 15 minutos');
      await pagina.evaluate(() => window.__estudio.amigos().latido());
      await pagina.waitForSelector('#invSi', { timeout: 5000 });
      ok(/Luis te invita a estudiar juntos/.test(await pagina.textContent('#hoja')), 'me llega la invitación, con la mascota');
      await foto('15-invitacion');
      await pagina.click('#invSi'); await espera(600);
      ok(await pagina.isVisible('#barraSesion') && /1[45]:\d\d/.test(await pagina.textContent('#barraSesion')), 'al aceptar sale la barra con el cronómetro corriendo');
      await como('luis', { accion: 'xp', eventos: [{ id: 'lx1', xp: 12, dia: diaMexico(Date.now()) }] });
      await pagina.evaluate(() => window.__estudio.amigos().latido()); await espera(1200);
      ok(/Luis 12/.test(await pagina.textContent('#barraSesion')), 'el marcador muestra lo que va juntando el otro');
      await foto('16-sesion');
      await pagina.click('[data-salir-ses]'); await pagina.click('[data-salir-ses]'); await espera(500);
      ok(/Ganó Luis/.test(await pagina.textContent('#hoja')) && await pagina.isVisible('#sesFelicita'), 'al salir sale quién ganó y el botón de felicitarlo');
      await pagina.click('#sesFelicita'); await espera(400);
      ok(((await s.get('est:buzon:luis')) || []).some((m) => m.tipo === 'felicita' && m.de === 'carlos'), 'la felicitación le llega');
      ok(await desborde() <= 0, 'amigos y la barra no se salen de lado');
      /* «¿cómo te fue?» después de la fecha del examen */
      await pagina.evaluate(() => { const st = window.__estudio.estado(); const p = st.planes[st.actualId]; p.fecha = '2026-01-10'; });
      await pagina.click('[data-ir="plan"]'); await espera(300);
      await pagina.evaluate(() => window.__estudio.amigos().preguntarExamen()); await espera(300);
      ok(/¿Cómo te fue en/.test(await pagina.textContent('#hoja')), 'pasada la fecha del examen, pregunta cómo te fue');
      await pagina.click('[data-como="bien"]'); await pagina.fill('#exCalif', '8.7'); await foto('17-como-te-fue');
      await pagina.click('#exListo'); await espera(500);
      const ex = (await s.get('est:examenes:carlos')) || [];
      ok(ex.length === 1 && ex[0].como === 'bien' && ex[0].calif === 8.7, 'se guarda en tu historial con la calificación');
      ok(((await s.get('est:buzon:luis')) || []).some((m) => m.tipo === 'examen'), 'y a tus amigos les llega para felicitarte');
      await pagina.evaluate(() => window.__estudio.amigos().preguntarExamen()); await espera(200);
      ok(!(await pagina.isVisible('#hoja')), 'ya contestado, no lo vuelve a preguntar');
      await pagina.click('[data-ir="ranking"]'); await espera(200);
    }

    /* perfil */
    await pagina.click('[data-ir="perfil"]');
    ok(/CARYMO/.test(await pagina.textContent('#vPerfil .version')), 'el perfil dice la versión de CARYMO');
    await pagina.fill('#pNombre', 'Palomazi'); await pagina.press('#pNombre', 'Tab'); await espera(400);
    ok(s.m.get('est:perfil:carlos').nombre === 'Palomazi', 'el nombre del perfil se guarda en La Sala');
    await pagina.click('[data-aj="sonido"]');
    ok(await pagina.getAttribute('[data-aj="sonido"]', 'aria-checked') === 'false', 'el sonido se apaga');
    ok(await desborde() <= 0, 'el perfil no se sale de lado');

    /* los sonidos existen y se pueden pedir */
    const sonidos = await pagina.evaluate(async () => { const r = await Promise.all(['toque', 'bien', 'mal', 'logro', 'moneda', 'combo', 'hielo', 'voltear', 'whoosh', 'pop', 'subir', 'golpe'].map((n) => fetch(`../sala/sonidos/${n}.mp3`).then((x) => x.ok && x.headers.get('content-length') !== '0'))); return r.every(Boolean); });
    ok(sonidos, 'los 12 sonidos de la app están publicados');

    /* otro teléfono: el plan y el avance llegan de La Sala */
    const ctx2 = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx2.addInitScript(() => { try{ localStorage.setItem('salaLlave', 'prueba'); }catch{} });
    const p2 = await ctx2.newPage(); p2.on('pageerror', (e) => errores.push('tel2: ' + e.message));
    await p2.goto(url); await p2.waitForSelector('.camino', { timeout: 8000 });
    ok((await p2.$$('.nodo.hecho')).length === await hechos() && (await p2.textContent('#planNombre')) === 'Biología bloque 2', 'en otro teléfono sale el mismo plan con el mismo avance');
    await ctx2.close();

    /* un plan VIEJO (sin cátedras) se acomoda solo y no pierde lo que ya pasaste */
    const ctx3 = await nav.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx3.addInitScript(() => {
      try{
        localStorage.setItem('salaLlave', 'otra');
        const p = { id: 'pviejo', titulo: 'Historia', materia: 'Historia', fecha: '2030-01-01', contenido: {}, progreso: { q1: { hecho: true, mejor: 90 } },
          unidades: [{ id: 'u1', titulo: 'Independencia', temas: [{ id: 't1', titulo: 'Causas' }, { id: 't2', titulo: 'Consumación' }], nodos: [{ id: 'q1', tipo: 'quiz', tema: 't1', titulo: 'Causas' }, { id: 'q2', tipo: 'quiz', tema: 't2', titulo: 'Consumación' }, { id: 'tj', tipo: 'tarjetas', titulo: 'Tarjetas' }] }] };
        localStorage.setItem('est.planes', JSON.stringify({ pviejo: p })); localStorage.setItem('est.actual', '"pviejo"');
      }catch{}
    });
    const p3 = await ctx3.newPage(); p3.on('pageerror', (e) => errores.push('tel3: ' + e.message));
    await p3.goto(`${base}/sala/estudio.html?servidor=http://localhost:1&sala=G`);   /* la dirección vieja lleva a la nueva */
    await p3.waitForSelector('.camino');
    const t3 = await p3.$$eval('.nodo', (ns) => ns.map((n) => n.getAttribute('aria-label').split(':')[0] + (n.classList.contains('hecho') ? '*' : '')));
    ok(t3.length === 6 && t3[0] === 'Panorama de la unidad*' && t3[1] === 'Cátedra en el pizarrón*' && /^Nivel.*\*$/.test(t3[2]) && t3[3] === 'Cátedra en el pizarrón', `un plan viejo gana sus cátedras, y lo que ya pasaste sigue pasado (${t3.join(' · ')})`);
    ok(await p3.textContent('.siguiente small') === 'Cátedra en el pizarrón', 'y sigue justo donde se había quedado: la cátedra del tema 2');
    await ctx3.close();

    /* ── la Academia Grupo Mazi (13 nov): cursos ya escritos, sin gastar IA ── */
    const { CURSOS } = await import('../carymo/academia.js');
    await pagina.click('[data-ir="plan"]'); await espera(200);
    await pagina.click('#bPlanes'); await pagina.click('[data-plan="academia"]');
    await pagina.waitForSelector('.acad-curso');
    ok((await pagina.$$('.acad-curso')).length === CURSOS.length, `la Academia enseña sus ${CURSOS.length} cursos`);
    ok(await pagina.$$eval('.acad-doc', (a) => a.length === 2 && a.every((x) => /empresa\/ventas\/.+\.pdf$/.test(x.getAttribute('href'))) && !a.some((x) => /Chuleta/.test(x.getAttribute('href')))), 'trae la Guía y la presentación para descargar, y NO la chuleta');
    ok(await desborde() <= 0, 'la Academia no se sale de lado');
    await espera(700); await foto('40-academia');
    /* cada lección y cada pregunta pasan el mismo revisor que lo que escribe la IA: ninguna se tira */
    const tirados = await pagina.evaluate(async () => {
      const m = await import('/carymo/carymo.js'), a = await import('/carymo/academia.js'), malos = [];
      for(const k of a.CURSOS) for(const u of k.unidades) for(const t of u.temas){
        const r = m.normalizarLeccion({ leccion: t.leccion, preguntas: t.preguntas });
        if(r.preguntas.length !== t.preguntas.length) malos.push(`${t.titulo}: ${t.preguntas.length - r.preguntas.length} pregunta(s)`);
        if(r.leccion.ideas.some((x) => !x.icono)) malos.push(`${t.titulo}: un dibujo que no existe`);
      }
      return malos;
    });
    ok(!tirados.length, 'todas las lecciones y preguntas de la Academia pasan el revisor' + (tirados.length ? ': ' + tirados.join(' · ') : ''));
    const totalPregs = CURSOS.reduce((x, k) => x + k.unidades.reduce((y, u) => y + u.temas.reduce((z, t) => z + t.preguntas.length, 0), 0), 0);
    ok(totalPregs >= 50, `la Academia trae ${totalPregs} preguntas`);
    const iaAntes = iaVeces;
    await pagina.click('[data-curso="acad-quienes"]'); await pagina.waitForSelector('.camino');
    ok((await pagina.textContent('#planNombre')).trim() === 'Conoce Grupo Mazi', 'el curso abre como un plan más, con su camino');
    const srcA = await catedra();
    ok(/curso interno de Grupo Mazi/.test(srcA) && srcA.includes('442 883 3786') && /nivel=uni/.test(srcA), 'su cátedra en el pizarrón lleva la hoja oficial de Grupo Mazi');
    await catedra();
    const d0 = CURSOS[0].unidades[0].temas[0];
    await pagina.click('.siguiente [data-nodo]');
    await pagina.waitForSelector('.historia', { timeout: 5000 });
    ok(iaVeces === iaAntes, 'la lección del curso abre al instante, sin pedirle nada a la IA');
    for(let k = 0; k < 8 && await pagina.isVisible('[data-sig]'); k++) await pagina.click('[data-sig]');
    await pagina.click('[data-empezar]');
    for(let k = 0; k < 14 && !(await pagina.isVisible('.resultado')); k++){ await contestar(d0, true); await pagina.click('[data-verificar]'); await pagina.click('[data-continuar]'); await espera(120); }
    ok(await pagina.isVisible('.resultado'), 'se juega el nivel completo de «Qué es Grupo Mazi»');
    await foto('41-academia-nivel');
    await pagina.click('[data-continuar]'); await pagina.waitForSelector('.camino');
    await pagina.click('#bPlanes');
    ok(await pagina.$$eval('[data-plan]', (b) => b.some((x) => x.textContent.includes('Conoce Grupo Mazi') && x.textContent.includes('Curso de Grupo Mazi'))), 'el curso queda en «Tus planes», sin fecha de examen rara');
    await pagina.keyboard.press('Escape');

    /* 320 de ancho */
    await pagina.setViewportSize({ width: 320, height: 640 });
    await pagina.click('[data-ir="plan"]'); await espera(300);
    ok(await desborde() <= 0, 'a 320 px el camino no se sale de lado');

    ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
  }catch(e){ ok(false, 'la prueba tronó: ' + e.message.split('\n')[0]); if(process.env.FOTOS) await foto('99-error'); }
  finally{ await nav.close(); servidor.close(); }
}
