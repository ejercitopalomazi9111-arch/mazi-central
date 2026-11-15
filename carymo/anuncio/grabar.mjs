/* GRABA CARYMO DE VERDAD para su anuncio (Carlos, 13 nov: «haz un anuncio publicitario para ir publicándolo»).
   Un teléfono de 390×844 a doble resolución, la página 5 veces más lenta para que salga a 60 cuadros de
   verdad, y el circulito del dedo. Trae su propio servidor: los archivos del repo, el servidor de estudio
   de La Sala en memoria (sala/servidor/estudio.js) y una IA de mentiras que contesta al instante, para que
   la grabación no dependa de internet ni gaste IA. Los contenidos son de EJEMPLO (Biología de prepa).

     node carymo/anuncio/grabar.mjs entrada|crear|leccion|pizarron|juntos
   Sale en carymo/anuncio/rec/<toma>/%05d.jpg y rec/<toma>.json con las MARCAS (en qué segundo pasa cada cosa). */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import http from 'http';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { grabar, dedo, tocar, deslizar, mover, lento } from '../../fadori-campana/grabar/comun.mjs';
import { atenderEstudio, semanaDe, diaMexico } from '../../sala/servidor/estudio.js';
const AQUI = path.dirname(new URL(import.meta.url).pathname), RAIZ = path.resolve(AQUI, '../..');
const TOMA = process.argv[2] || 'crear', K = Number(process.env.LENTO || 5);

/* ── lo que «contesta la IA» ── */
const PLAN = { titulo: 'Examen de Biología', notas: 'Bloque 2.', unidades: [
  { titulo: 'El cuerpo humano', frase: 'Lo que siempre preguntan.', temas: [{ titulo: 'Sistema circulatorio', resumen: 'Corazón, sangre y vasos.' }, { titulo: 'Sistema respiratorio', resumen: 'Pulmones y oxígeno.' }] },
  { titulo: 'La célula', frase: 'Lo más chiquito.', temas: [{ titulo: 'Partes de la célula', resumen: '' }, { titulo: 'Mitosis', resumen: '' }] },
] };
const LECCION = { leccion: { titulo: 'El sistema circulatorio', ideas: [
    { titulo: 'Para qué sirve', texto: 'Lleva **oxígeno** y nutrientes a cada célula, y se lleva los desechos.', icono: 'heart-pulse' },
    { titulo: 'La bomba', texto: 'El **corazón** empuja la sangre sin parar, unas 70 veces por minuto.', icono: 'heart' },
    { titulo: 'El camino', texto: 'Los **vasos sanguíneos** son los tubos por donde viaja la sangre.', icono: 'route' } ],
    dato: 'Piensa en una red de carreteras: el corazón es la bomba y la sangre, los coches.' },
  preguntas: [
    { tipo: 'opcion', pregunta: '¿Qué órgano bombea la sangre?', opciones: ['El corazón', 'El hígado', 'El pulmón', 'El estómago'], correcta: 0, porque: 'Es un músculo que funciona como bomba.', pista: 'Late.' },
    { tipo: 'hueco', frase: 'Los ___ llevan la sangre por todo el cuerpo.', respuesta: 'vasos', distractores: ['huesos', 'nervios', 'músculos'], porque: 'Son los tubos de la sangre.', pista: 'Tubos.' },
    { tipo: 'opcion', pregunta: '¿Qué lleva la sangre a cada célula?', opciones: ['Oxígeno', 'Aire caliente', 'Luz', 'Sonido'], correcta: 0, porque: 'Junto con los nutrientes.', pista: 'Lo respiras.' },
    { tipo: 'opcion', pregunta: '¿Cuántas veces late el corazón por minuto, más o menos?', opciones: ['70', '7', '700', '7 mil'], correcta: 0, porque: 'En reposo, entre 60 y 100.', pista: 'Menos de cien.' },
  ] };
export const CLASE = { titulo: 'El sistema circulatorio', visual: true, pasos: [
  { voz: 'Hoy vemos cómo viaja tu sangre.', pizarra: { tipo: 'titulo', texto: 'El sistema circulatorio', sub: 'Biología · bloque 2', icono: 'heart-pulse' } },
  { voz: 'El corazón la empuja por dos circuitos.', pizarra: { tipo: 'diagrama', titulo: 'Los dos circuitos', nodos: [{ id: 'c', texto: 'Corazón' }, { id: 'p', texto: 'Pulmones' }, { id: 's', texto: 'Todo el cuerpo' }], flechas: [{ de: 'c', a: 'p', texto: 'sin oxígeno' }, { de: 'c', a: 's', texto: 'con oxígeno' }, { de: 'p', a: 'c', texto: 'regresa' }, { de: 's', a: 'c', texto: 'regresa' }] } },
  { voz: 'Late unas setenta veces por minuto.', pizarra: { tipo: 'medidor', titulo: 'Tu pulso en reposo', valor: 45, izquierda: '60', derecha: '100', texto: '70 latidos' } },
  { voz: 'Y más de la mitad de tu sangre es plasma.', pizarra: { tipo: 'porcentaje', titulo: 'Plasma en la sangre', valor: 55, texto: 'El resto: glóbulos rojos, blancos y plaquetas' } },
  { voz: 'Mito o verdad.', pizarra: { tipo: 'mito', titulo: 'Mito o verdad', mito: 'La sangre sin oxígeno es azul', verdad: 'Siempre es roja: más oscura sin oxígeno' } },
], referencias: [], repaso: [] };
function contestarIA(c){
  if(/PLANES DE ESTUDIO/.test(c.sistema || '')) return { bien: true, texto: JSON.stringify(PLAN) };
  if(/CLASE que se DIBUJA/.test(c.sistema || '')) return { bien: true, texto: JSON.stringify(CLASE) };
  return { bien: true, texto: JSON.stringify(LECCION) };
}

/* ── el servidor: archivos del repo + estudio en memoria + la IA de mentiras ── */
const mem = new Map();
const s = { async get(k){ if(Array.isArray(k)){ const r = new Map(); for(const x of k) if(mem.has(x)) r.set(x, structuredClone(mem.get(x))); return r; } return structuredClone(mem.get(k)); },
  async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) mem.set(a, structuredClone(b)); } else mem.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) mem.delete(x); }, async list({ prefix }){ return new Map([...mem].filter(([k]) => k.startsWith(prefix)).sort()); } };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.json': 'application/json', '.webmanifest': 'application/json' };
let iaEspera = 0;
const srv = http.createServer(async (q, res) => {
  const u = new URL(q.url, 'http://x');
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if(q.method === 'OPTIONS'){ res.end(); return; }
  const cuerpo = await new Promise((ya) => { let d = ''; q.on('data', (x) => d += x); q.on('end', () => ya(d)); });
  if(u.pathname.endsWith('/estudio')){
    const r = await atenderEstudio(s, new Request('http://x' + q.url, { method: q.method, body: q.method === 'POST' ? cuerpo : undefined }), u, 'ana');
    res.writeHead(r.status, { 'content-type': 'application/json' }); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  if(u.pathname.endsWith('/ia-texto')){ if(iaEspera) await new Promise((r) => setTimeout(r, iaEspera)); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(contestarIA(JSON.parse(cuerpo)))); return; }
  if(u.pathname.includes('/api/')){ res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"bien":true}'); return; }
  let f = path.join(RAIZ, decodeURIComponent(u.pathname));
  if(fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if(!f.startsWith(RAIZ) || !fs.existsSync(f)){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const BASE = `http://localhost:${srv.address().port}`, URL_APP = `${BASE}/carymo/?servidor=${encodeURIComponent(BASE)}&sala=G`;

/* ── un plan ya armado (para las tomas que no lo crean): las cátedras vistas, sigue el nivel ── */
function planListo(){
  const id = (p) => p + Math.random().toString(36).slice(2, 8);
  const unidades = PLAN.unidades.map((u, i) => { const temas = u.temas.map((t) => ({ id: id('t'), ...t })); const nodos = [{ id: id('n'), tipo: 'pizarra', alcance: 'unidad', titulo: u.titulo }];
    temas.forEach((t) => { nodos.push({ id: id('n'), tipo: 'pizarra', tema: t.id, titulo: t.titulo }, { id: id('n'), tipo: 'quiz', tema: t.id, titulo: t.titulo }); });
    nodos.push({ id: id('n'), tipo: 'tarjetas', titulo: 'Tarjetas: ' + u.titulo }); return { id: 'u' + i, titulo: u.titulo, frase: u.frase, color: ['#7E1735', '#5E2387'][i], temas, nodos }; });
  const n = unidades[0].nodos, progreso = { [n[0].id]: { hecho: true, mejor: 100 }, [n[1].id]: { hecho: true, mejor: 100 } };
  const contenido = { [unidades[0].temas[0].id]: LECCION };
  const f = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  return { id: 'pbio', titulo: 'Examen de Biología', materia: 'Química y Biología', color: '#7E1735', fecha: f, notas: '', creado: Date.now(), unidades, contenido, progreso, forma: 2 };
}

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--force-device-scale-factor=2', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: false, reducedMotion: 'no-preference', serviceWorkers: 'block' });
await lento(ctx, K);
await ctx.addInitScript(({ toma, plan }) => {
  try{
    localStorage.setItem('salaLlave', 'demo');
    localStorage.setItem('est.perfil', JSON.stringify({ nombre: 'Ana', racha: 6, xp: 340 }));
    localStorage.setItem('est.ajustes', JSON.stringify({ mascota: 'tigre', voz: false }));
    if(toma !== 'entrada') sessionStorage.setItem('carymo.entrada', '1');
    if(plan){ localStorage.setItem('est.planes', JSON.stringify({ [plan.id]: plan })); localStorage.setItem('est.actual', JSON.stringify(plan.id)); }
  }catch{}
}, { toma: TOMA, plan: ['leccion', 'juntos', 'cuarto', 'ligas'].includes(TOMA) ? planListo() : null });
/* las tomas nuevas del anuncio 2 (Carlos, 14 nov: «muestra los elementos más chingones»): el cuarto con las mascotas que
   crecen y se visten, y la tabla de la liga. Lo que «ya tiene» Ana se siembra en el servidor de mentiras. Nombres inventados. */
{
  const ahora = Date.now(), sem = semanaDe(diaMexico(ahora));
  mem.set('est:perfil:ana', { cuenta: 'ana', nombre: 'Ana', xp: 340, racha: 6, mejorRacha: 6, ultimoDia: diaMexico(ahora), ids: [], t: ahora, cubos: 240, liga: 2, ligaMax: 2,
    mascota: 'tigre', armario: ['corona', 'lentesSol', 'dorado', 'galaxia', 'bufanda'],
    mascotas: { tigre: { xp: 700, nacio: ahora - 9e8, skin: 'normal', acc: ['bufanda'] }, paloma: { xp: 0, nacio: ahora - 3e7, skin: 'normal', acc: [] }, conejo: { xp: 2100, nacio: ahora - 5e8, skin: 'galaxia', acc: ['corona'] } },
    cuidado: { hambre: 72, limpieza: 88, animo: 55, t: ahora }, inv: { croquetas: 3, jabon: 2 } });
  const gente = ['Sofi', 'Diego R.', 'Vale', 'Emi', 'Santi', 'Regina', 'Mateo', 'Xime', 'Leo', 'Cami', 'Iker', 'Renata', 'Pau', 'Toño'];
  const tabla = { ana: { xp: 340, nombre: 'Ana', liga: 2 } }, miembros = { ana: { nombre: 'Ana', liga: 2 } };
  gente.forEach((n, i) => { const k = 'g' + i; tabla[k] = { xp: [520, 410, 380, 300, 290, 260, 230, 200, 180, 150, 120, 90, 60, 40][i], nombre: n, liga: 2 }; miembros[k] = { nombre: n, liga: 2 }; });
  mem.set('est:sem:' + sem, tabla); mem.set('est:miembros', miembros);
}
const pg = await ctx.newPage(); await dedo(pg);
const errores = []; pg.on('pageerror', (e) => errores.push(e.message));
const marcas = {}; let t0 = 0;
const marca = (n) => { marcas[n] = +((Date.now() - t0) / 1000 / K).toFixed(3); console.log('  ·', n, marcas[n]); };
const espera = (seg) => pg.waitForTimeout(seg * 1000 * K);
const escribir = async (txt) => { for(const c of txt){ await pg.keyboard.type(c); await espera(0.06); } };

let rec;
if(TOMA === 'pizarron'){
  await pg.goto(`${BASE}/sala/explica.html?en=capa&servidor=${encodeURIComponent(BASE)}&sala=G`, { waitUntil: 'load' }); await pg.waitForFunction(() => window.__explica);
  /* sin voz en el navegador de grabación: el renglón de avisos de la voz no va en el anuncio */
  await pg.addStyleTag({ content: '#subVoz{display:none!important}' });
  rec = await grabar(pg); t0 = Date.now(); marca('inicio');
  await pg.evaluate((c) => window.__explica.empezar(c), CLASE);
  /* cada paso se dibuja; sin voz, se pasa al siguiente con el botón, como lo haría el alumno */
  for(let k = 0; k < CLASE.pasos.length; k++){ await espera(k === 1 ? 4.2 : 2.8); marca('paso' + (k + 1)); if(k < CLASE.pasos.length - 1) await pg.evaluate(() => document.querySelector('#bSig')?.click()); }
  await espera(1.5); marca('fin');
}else{
  rec = await grabar(pg); t0 = Date.now();
  await pg.goto(URL_APP, { waitUntil: 'load' });
  if(TOMA === 'entrada'){ marca('inicio'); await espera(4.4); marca('app'); await espera(1.2); marca('fin'); }
  if(TOMA === 'crear'){
    await espera(1.2); marca('portada');
    await tocar(pg, '#bCrear', K); await espera(0.6); marca('materias');
    await tocar(pg, '[data-mat="quimbio"]', K); await espera(0.3); await tocar(pg, '[data-sig]', K); await espera(0.5);
    await tocar(pg, '[data-dias="7"]', K); await espera(0.9); marca('fecha'); await tocar(pg, '[data-sig]', K); await espera(0.5);
    marca('temas'); await tocar(pg, '#temaTxt', K);
    for(const t of ['Sistema circulatorio', 'Sistema respiratorio']){ await escribir(t); await pg.keyboard.press('Enter'); await espera(0.3); }
    iaEspera = 1800 * K; await tocar(pg, '[data-sig]', K); marca('preparando');
    await pg.waitForSelector('.camino', { timeout: 60000 }); iaEspera = 0; marca('camino');
    await espera(1.6); await deslizar(pg, 260, 1300); await espera(0.8); marca('fin');
  }
  if(TOMA === 'leccion'){
    await espera(1.4); marca('camino');
    await tocar(pg, '.siguiente [data-nodo]', K); await pg.waitForSelector('.historia', { timeout: 20000 }); marca('ideas');
    for(let k = 0; k < 6 && await pg.isVisible('[data-sig]'); k++){ await espera(1.1); await tocar(pg, '[data-sig]', K); }
    await espera(0.6); await tocar(pg, '[data-empezar]', K); await espera(0.8); marca('preguntas');
    for(let k = 0; k < 4 && !(await pg.isVisible('.resultado')); k++){
      const tipo = await pg.getAttribute('#qCuerpo', 'data-tipo');
      if(tipo === 'hueco') await tocar(pg, '.ficha:text-is("vasos")', K);
      else { const ok = await pg.evaluate(() => { const bs = [...document.querySelectorAll("#qCuerpo [data-op], #qCuerpo .opc, #qCuerpo button")]; const b = bs.find((x) => /El corazón|Oxígeno|^\s*70\s*$/.test(x.textContent)); if(b){ b.setAttribute('data-anuncio', '1'); return true; } return false; });
        if(ok) await tocar(pg, '[data-anuncio="1"]', K); }
      await espera(0.4); await tocar(pg, '[data-verificar]', K); await espera(1.0); marca('bien' + (k + 1)); await tocar(pg, '[data-continuar]', K); await espera(0.5);
      await pg.evaluate(() => document.querySelectorAll('[data-anuncio]').forEach((x) => x.removeAttribute('data-anuncio')));
    }
    await espera(1.8); marca('fin');
  }
  if(TOMA === 'cuarto'){
    await espera(1.2); marca('camino');
    await tocar(pg, '#pCubos', K); await pg.waitForSelector('#capa.companero #mascCuarto .masc'); await espera(1.4); marca('cuarto');
    /* acariciarlo: el dedo talla encima */
    const m = await pg.locator('#mascCuarto .masc').boundingBox();
    await mover(pg, m.x + m.width * .35, m.y + m.height * .35, K); await pg.mouse.down();
    for(let k = 0; k < 7; k++) await mover(pg, m.x + m.width * (k % 2 ? .35 : .65), m.y + m.height * (.32 + (k % 3) * .03), K, 200);
    await pg.mouse.up(); marca('caricia'); await espera(1.2);
    /* la pelota: sale, se avienta y la persigue */
    await tocar(pg, '[data-cuidar="jugar"]', K); await espera(0.9); marca('pelota');
    const b = await pg.locator('.pelota').boundingBox();
    await mover(pg, b.x + 18, b.y + 18, K); await pg.mouse.down(); await mover(pg, b.x + 120, b.y - 60, K, 140); await pg.mouse.up();
    await espera(3.2); marca('atrapa');
    await tocar(pg, '[data-cuidar="jugar"]', K); await espera(0.4);
    /* cambiar de mascota: un toque */
    await pg.evaluate(() => scrollTo({ top: 0 })); await pg.locator('#capa').evaluate((c) => c.scrollTo({ top: 0 }));
    await tocar(pg, '#misMasc [data-elegir="conejo"]', K); await espera(1.4); marca('cambia');
    /* vestirlo */
    await tocar(pg, '[data-vestir]', K); await pg.waitForSelector('#vestirG .prenda'); await espera(1.0); marca('vestir');
    await tocar(pg, '#vestirG [data-prenda="lentesSol"]', K); await espera(0.9);
    await tocar(pg, '[data-tab="color"]', K); await espera(0.5); await tocar(pg, '#vestirG [data-prenda="dorado"]', K); await espera(1.0);
    await tocar(pg, '[data-vestir-listo]', K); await espera(1.8); marca('fin');
  }
  if(TOMA === 'ligas'){
    await espera(1.0); marca('camino');
    await tocar(pg, 'nav [data-ir="ranking"]', K); await espera(1.8); marca('tabla');
    await deslizar(pg, 360, 1500); await espera(1.4); marca('fin');
  }
  if(TOMA === 'juntos'){
    await espera(1.2); marca('camino');
    await pg.evaluate(() => window.__estudio.amigos().elegirModo('beto')); await espera(0.9); marca('modos');
    await tocar(pg, '[data-modo="jefe"]', K); await espera(0.6); await tocar(pg, '[data-min="15"]', K); await espera(0.4);
    await mover(pg, 195, 790, K); await espera(0.4);
    await pg.evaluate(() => { document.querySelector('#hoja')?.remove(); document.querySelectorAll('.velo, .hoja-fondo, #velo').forEach((x) => x.remove()); });
    marca('jefe');
    const ahora = Date.now();
    for(let k = 0; k <= 14; k++){
      const eq = Math.round(90 * Math.min(1, k / 12));
      await pg.evaluate(([eq, k, ahora]) => window.__estudio.amigos().verSesion({ id: 'sdemo', estado: 'activa', modo: 'jefe', de: '', a: 'beto', nombres: { beto: 'Beto' }, inicio: ahora - 20000, fin: ahora + 15 * 60000, meta: 90, equipo: eq, xp: { beto: Math.round(eq / 2) }, ...(eq >= 90 ? { logrado: ahora + 1 } : {}) }), [eq, k, ahora]);
      await espera(0.32);
    }
    marca('vencido'); await espera(1.6); marca('fin');
  }
}
const dir = path.join(AQUI, 'rec', TOMA);
const n = await rec.parar(dir, 60, K);
fs.writeFileSync(path.join(AQUI, 'rec', TOMA + '.json'), JSON.stringify({ cuadros: n, fps: 60, marcas }, null, 1));
console.log('✓', TOMA + ':', n, 'cuadros a 60 →', path.relative(process.cwd(), dir), errores.length ? '· errores: ' + errores.join(' | ') : '');
await br.close(); srv.close();
