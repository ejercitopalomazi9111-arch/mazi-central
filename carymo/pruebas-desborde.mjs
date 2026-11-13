/* LA APP RETACADA (Carlos, 14 nov: «prueba todos los elementos que se llenen de cosas guardadas, miles de ejemplos,
   para que veas cómo se ve cada uno al desbordar y puedas arreglarlo antes de que pase»).
   Siembra lo peor que puede juntar alguien que usa CARYMO años: nombres de 30 letras (lo más que deja el servidor)
   y palabras larguísimas sin espacios, XP de 7 cifras, racha de 9999, 99,999 cubitos, 30 planes con títulos de 120
   letras y caminos de 60 temas, 1,500 apuntes propios en 60 materias, 400 clases del pizarrón, 200 amigos, 50
   solicitudes, 40 personas en línea, la liga llena (30 que estudian + los que no) y un horario con 12 clases al día.
   Luego recorre CADA pantalla a 390 y a 320 de ancho y mide: que nada se salga de lado, que ningún texto se salga de
   su caja y que no haya errores. FOTOS=carpeta guarda una captura de cada pantalla.
   node carymo/pruebas-desborde.mjs */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atenderEstudio, semanaDe, diaMexico } from '../sala/servidor/estudio.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

/* ── nombres que rompen: una palabra sin espacios, muchas cortas, letras anchas ── */
const LARGOS = ['Maximiliano Bartolomé Gutiérre', 'Electroencefalografistas', 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', 'María José de la Concepción Pé', 'Ñandú Ozymandias Xóchitl-Quetz', 'Anticonstitucionalísimamente'];
const largo = (i) => LARGOS[i % LARGOS.length];
const MATERIAS = Array.from({ length: 60 }, (_, i) => i % 3 ? `Materia número ${i} con nombre muy largo de verdad` : `Otorrinolaringologíaavanzada${i}`);
const TEXTO = 'Lorem ipsum es lo de siempre pero aquí va en español con palabras largas como desoxirribonucleico y paralelepípedo, ';

/* ── el servidor de verdad, en memoria, ya retacado ── */
const m = new Map();
const s = { async get(k){ return structuredClone(m.get(k)); }, async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) m.delete(x); }, async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
const ahora = Date.now(), sem = semanaDe(diaMexico(ahora));
const clases = []; for(let d = 0; d < 7; d++) for(let h = 0; h < 12; h++) clases.push({ dia: d, materia: MATERIAS[(d * 12 + h) % 60], inicio: `${String(7 + h).padStart(2, '0')}:00`, fin: `${String(7 + h).padStart(2, '0')}:50`, salon: 'Edificio Ñ, laboratorio de cómputo 304-B' });
const vitrina = {}; for(const id of ['bronce', 'plata', 'oro', 'zafiro', 'rubi', 'esmeralda', 'amatista', 'perla', 'obsidiana', 'diamante']) vitrina[id] = { semanas: 999, podios: 888, mejor: 1 };
m.set('est:perfil:carlos', { cuenta: 'carlos', nombre: LARGOS[0], xp: 9_999_999, racha: 9999, mejorRacha: 9999, ultimoDia: diaMexico(ahora), congeladas: 2, ids: [], t: ahora, cubos: 99_999, liga: 6, ligaMax: 9, vitrina, horario: { clases },
  personaje: { pelo: 'bigHair', ojos: 'default', boca: 'smile', ropa: 'hoodie', colorRopa: '7e1735', lentes: 'round' } });
const tabla = { carlos: { xp: 9_999_999, nombre: LARGOS[0], liga: 6 } }, miembros = { carlos: { nombre: LARGOS[0], liga: 6 } };
for(let i = 1; i < 30; i++){ tabla['r' + i] = { xp: 9_999_999 - i * 37, nombre: largo(i), liga: 6 }; miembros['r' + i] = { nombre: largo(i), liga: 6 }; }
for(let i = 0; i < 40; i++) miembros['q' + i] = { nombre: largo(i + 2), liga: 6 };
const amigos = [], pres = {};
for(let i = 0; i < 200; i++){ amigos.push('a' + i); miembros['a' + i] = { nombre: largo(i + 1), liga: i % 10 }; tabla['a' + i] = { xp: 1_000_000 + i, nombre: largo(i + 1), liga: i % 10 }; }
for(let i = 0; i < 40; i++) pres['a' + i] = { nombre: largo(i + 1), t: ahora, estado: i % 2 ? 'estudiando' : 'libre', materia: MATERIAS[i] };
m.set('est:sem:' + sem, tabla); m.set('est:miembros', miembros);
m.set('est:amigos:carlos', { amigos, pide: Array.from({ length: 50 }, (_, i) => 'pide' + i) });
for(let i = 0; i < 50; i++) m.set('est:perfil:pide' + i, { cuenta: 'pide' + i, nombre: largo(i + 3), xp: 0, racha: 0, ids: [] });
for(let i = 0; i < 200; i++) m.set('est:perfil:a' + i, { cuenta: 'a' + i, nombre: largo(i + 1), xp: 1, racha: 1, ids: [] });
m.set('est:pres', pres);

/* ── lo que vive en el teléfono ── */
function planGrande(k){
  const unidades = [], contenido = {};
  for(let u = 0; u < 6; u++){
    const temas = [], nodos = [];
    for(let t = 0; t < 10; t++){
      const id = `p${k}u${u}t${t}`, tit = t % 2 ? `${largo(t)} y además ${MATERIAS[t]}` : 'Desoxirribonucleicoparalelepípedoanticonstitucional';
      temas.push({ id, titulo: tit });
      nodos.push({ id: 'n' + id + 'a', tipo: 'pizarra', tema: id, titulo: tit }, { id: 'n' + id + 'b', tipo: 'quiz', tema: id, titulo: tit });
      if(u === 0 && t < 3) contenido[id] = { leccion: { titulo: tit, ideas: [{ titulo: largo(t) + ' ' + largo(t + 1), texto: TEXTO.repeat(6) }, { titulo: 'Otra', texto: TEXTO.repeat(3) + 'Supercalifragilisticoespialidosoextraordinariamentelargo' }], dato: TEXTO.repeat(4) },
        preguntas: [
          { tipo: 'opcion', pregunta: TEXTO.repeat(3) + '¿cuál?', opciones: [TEXTO.repeat(2), 'Desoxirribonucleicoparalelepípedoanticonstitucionalísimamente', 'C ' + TEXTO, 'D'], correcta: 0, porque: TEXTO.repeat(5), pista: TEXTO.repeat(2) },
          { tipo: 'hueco', frase: TEXTO.repeat(2) + ' ___ ' + TEXTO, respuesta: 'Electroencefalografistas', distractores: ['Otorrinolaringólogo', 'Anticonstitucionalísimamente', 'X'], porque: TEXTO },
          { tipo: 'unir', pregunta: 'Une', pares: [[TEXTO, 'Electroencefalografistas'], ['B', TEXTO.repeat(2)], ['Anticonstitucionalísimamente', 'D'], ['E', 'F']], porque: TEXTO },
          { tipo: 'ordenar', pregunta: TEXTO, pasos: [TEXTO, 'Desoxirribonucleicoparalelepípedo', 'tres ' + TEXTO, 'cuatro'], porque: TEXTO },
        ] };
    }
    unidades.push({ id: `p${k}u${u}`, titulo: `Unidad ${u + 1}: ${largo(u)} ${MATERIAS[u]}`, color: '#7E1735', temas, nodos });
  }
  return { id: 'p' + k, titulo: `Examen extraordinario de ${MATERIAS[k]} ${largo(k)} parte ${k} con título larguísimo`.slice(0, 120), materia: MATERIAS[k], fecha: '2026-12-' + String(1 + (k % 28)).padStart(2, '0'), forma: 2,
    progreso: { [`np${k}u0t0a`]: { hecho: true, mejor: 100 } }, cambio: ahora - k * 1000, t: ahora - k * 1000, unidades, contenido };
}
const PLANES = {}; for(let k = 0; k < 30; k++) PLANES['p' + k] = planGrande(k);
const HIST = Array.from({ length: 400 }, (_, i) => ({ id: 'c' + i, titulo: `${largo(i)} ${MATERIAS[i % 60]} clase ${i}`, fecha: ahora - i * 6e4, pasos: [{ voz: '…', pizarra: { tipo: 'titulo', texto: largo(i) } }, { voz: '…', pizarra: { tipo: 'lista', titulo: largo(i + 1), items: [TEXTO, 'Desoxirribonucleicoparalelepípedo'] } }] }));

const b = await chromium.launch();
async function abrir(ancho){
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1 });
  const pg = await ctx.newPage();
  const err = []; pg.on('pageerror', (e) => { err.push(e.message); if(process.env.PILA) console.log(e.stack); });
  await pg.route(/^http:\/\/localhost:1\//, async (r) => {
    const q = r.request(), u = new URL(q.url());
    const req = new Request('http://x/estudio' + u.search, { method: q.method(), body: q.method() === 'POST' ? q.postData() : undefined });
    const res = await atenderEstudio(s, req, new URL(req.url), 'carlos');
    await r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
  });
  await pg.addInitScript(([planes, hist]) => {
    if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
    localStorage.setItem('salaLlave', 'x');
    localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' }));
    localStorage.setItem('est.planes', planes); localStorage.setItem('est.actual', JSON.stringify('p0'));
    localStorage.setItem('explica.historial', hist);
    sessionStorage.setItem('carymo.entrada', '1');
  }, [JSON.stringify(PLANES), JSON.stringify(HIST)]);
  await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
  await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo(), null, { timeout: 20000 });
  /* 1,500 apuntes propios en la caja fuerte del teléfono */
  await pg.evaluate(async ([materias, texto]) => {
    const d = await new Promise((ok, no) => { const r = indexedDB.open('carymo-apuntes', 1); r.onupgradeneeded = () => { const x = r.result; if(!x.objectStoreNames.contains('notas')) x.createObjectStore('notas', { keyPath: 'id' }); if(!x.objectStoreNames.contains('dibujos')) x.createObjectStore('dibujos'); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    await new Promise((ok) => { const t = d.transaction('notas', 'readwrite'), st = t.objectStore('notas');
      for(let i = 0; i < 1500; i++) st.put({ id: 'n' + i, titulo: i % 4 ? `Apunte ${i}: ${materias[i % 60]}` : 'Desoxirribonucleicoparalelepípedoanticonstitucionalísimamente' + i, materia: materias[i % 60], texto: texto.repeat(1 + i % 8), t: Date.now() - i * 1000 });
      t.oncomplete = ok; });
  }, [MATERIAS, TEXTO]);
  await pg.reload(); await pg.waitForFunction(() => window.__estudio && window.__estudio.yo && window.__estudio.yo(), null, { timeout: 20000 });
  await pg.waitForTimeout(1500);
  return { ctx, pg, err };
}

/* lo que se sale: de la pantalla (sin contar lo que vive en una fila que se desliza) y de su propia caja */
const medir = (pg) => pg.evaluate(() => {
  const W = document.documentElement.clientWidth, malos = [];
  const quien = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' «' + (el.textContent || '').trim().slice(0, 28) + '»';
  const visible = (el) => { for(let x = el; x && x !== document.body; x = x.parentElement){ const c = getComputedStyle(x); if(c.display === 'none' || c.visibility === 'hidden' || x.hidden) return false; } return true; };
  for(const el of document.querySelectorAll('body *')){
    if(el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if(el.closest('.combo-vfx, .confeti, .pv-fx, #brindis, .brindis')) continue;
    const r = el.getBoundingClientRect(); if(!r.width || !r.height) continue;
    if(!visible(el)) continue;
    /* a media animación (una fila que entra deslizándose) el ancho miente; y el nodo del camino lleva su letrero colgado a propósito */
    if(el.getAnimations({ subtree: true }).some((x) => x.playState === 'running') || el.closest('.nodo, .cx-linea, .siguiente')) continue;
    let enFila = false;
    for(let p = el.parentElement; p && p !== document.body; p = p.parentElement){ const o = getComputedStyle(p).overflowX; if(o !== 'visible'){ enFila = true; break; } }
    if(!enFila && (r.right > W + 1.5 || r.left < -1.5)) malos.push('fuera de la pantalla ' + Math.round(Math.max(r.right - W, -r.left)) + 'px: ' + quien(el));
    const c = getComputedStyle(el);
    if(c.overflowX === 'visible' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && !['svg', 'canvas', 'img', 'input', 'textarea', 'select'].includes(el.tagName.toLowerCase()) && !el.closest('.pv, .masc') && !el.querySelector(':scope > .masc, :scope > .pv, .globo')) malos.push('se sale de su caja ' + (el.scrollWidth - el.clientWidth) + 'px: ' + quien(el));
  }
  return { ancho: document.documentElement.scrollWidth, W, malos: [...new Set(malos)].slice(0, 12) };
});

async function revisar(pg, ancho, nombre){
  await pg.waitForTimeout(500);
  const r = await medir(pg);
  ok(r.ancho <= r.W + 1 && !r.malos.length, `${ancho} · ${nombre}: nada se sale` + (r.malos.length || r.ancho > r.W + 1 ? ` (ancho ${r.ancho}/${r.W})\n      ` + r.malos.join('\n      ') : ''));
  if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${ancho}-${nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` });
}

for(const ancho of [390, 320]){
  console.log(`\nA ${ancho} de ancho`);
  const { ctx, pg, err } = await abrir(ancho);
  const ir = async (v) => { await pg.click(`#nav [data-ir="${v}"]`); await pg.waitForTimeout(500); };
  const deTu = async (sel) => { await ir('yo'); await pg.click(`#vYo ${sel}`); await pg.waitForTimeout(700); };
  const cerrarTodo = async () => { for(let k = 0; k < 3; k++){ const c = await pg.$('#hoja [data-cerrar], .hoja [data-cerrar], #capa [data-cerrar]'); if(c && await c.isVisible()) await c.click().catch(() => {}); else break; await pg.waitForTimeout(250); } await pg.evaluate(() => { document.getElementById('velo')?.click(); }); await pg.waitForTimeout(250); };

  await ir('plan'); await revisar(pg, ancho, 'Estudiar (plan con 60 temas)');
  await pg.evaluate(() => scrollTo(0, document.body.scrollHeight)); await revisar(pg, ancho, 'Estudiar abajo del camino');
  const cursos = await pg.$('[data-cursos], .fila-cursos, #filaCursos'); if(cursos){ await revisar(pg, ancho, 'fila de 30 cursos'); }
  await ir('ranking'); await revisar(pg, ancho, 'Comunidad · Mi liga');
  ok((await pg.locator('#rankLista .fila-rank').count()) >= 20, `${ancho} · la tabla de la liga se ve llena (${await pg.locator('#rankLista .fila-rank').count()} filas)`);
  await pg.click('[data-rtab="amigos"]'); await revisar(pg, ancho, 'Comunidad · Amigos (200)');
  await pg.evaluate(() => scrollTo(0, document.body.scrollHeight)); await revisar(pg, ancho, 'Comunidad · conectados y solicitudes');
  await pg.click('[data-rtab="liga"]').catch(() => {});
  await ir('yo'); await revisar(pg, ancho, 'Tú');
  await pg.click('#vYo [data-yo="trofeos"]'); await pg.waitForTimeout(500); await revisar(pg, ancho, 'Vitrina de trofeos'); await cerrarTodo();
  await deTu('[data-ir="horario"]'); await revisar(pg, ancho, 'Horario (84 clases)');
  await pg.evaluate(() => { document.querySelectorAll('#vHorario details').forEach((d) => { d.open = true; }); }); await revisar(pg, ancho, 'Horario con todos los días abiertos');
  await deTu('[data-ir="apuntes"]'); await revisar(pg, ancho, 'Apuntes (1,500 propios)');
  const carpeta = await pg.$('.ap-carpeta'); if(carpeta){ await carpeta.click(); await pg.waitForTimeout(600); await revisar(pg, ancho, 'Apuntes · una carpeta'); }
  const mat = await pg.$('.ap-carpeta[data-apm]'); if(mat){ await mat.click(); await pg.waitForTimeout(600); await revisar(pg, ancho, 'Apuntes · una materia'); }
  const card = await pg.$('.ap-card'); if(card){ await card.click(); await pg.waitForTimeout(700); await revisar(pg, ancho, 'Apuntes · un apunte abierto'); await cerrarTodo(); }
  await deTu('[data-ir="buscar"]'); const bus = await pg.$('#vBuscar input'); if(bus){ await bus.fill('de'); await pg.waitForTimeout(700); } await revisar(pg, ancho, 'Buscar «de» (miles de resultados)');
  await deTu('[data-ir="perfil"]'); await revisar(pg, ancho, 'Ajustes y cuenta');
  await deTu('[data-yo="vestidor"]'); await pg.waitForTimeout(1200); await revisar(pg, ancho, 'Vestidor'); await cerrarTodo();
  await deTu('[data-yo="companero"]'); await pg.waitForTimeout(900); await revisar(pg, ancho, 'Cuarto del compañero'); await cerrarTodo();
  /* una lección retacada: sus ideas y su cuestionario */
  await ir('plan');
  const nodo = await pg.$('#planCuerpo .nodo[data-nodo="np0u0t0b"], #planCuerpo .nodo.actual');
  if(nodo){ await nodo.click({ force: true }); await pg.waitForTimeout(900); await revisar(pg, ancho, 'Lección (ideas larguísimas)');
    for(let k = 0; k < 8 && !(await pg.$('#qCuerpo')); k++){ const sig = await pg.$('[data-sig], [data-empezar], .capa .abajo .bt.blanco, .capa .abajo .bt.fuerte'); if(!sig) break; await sig.click({ force: true, timeout: 3000 }).catch(() => {}); await pg.waitForTimeout(400); }
    if(await pg.$('#qCuerpo')){ await revisar(pg, ancho, 'Cuestionario (pregunta y opciones largas)'); }
    await cerrarTodo();
  }
  ok(!err.length, `${ancho} · sin errores en la consola` + (err.length ? ': ' + [...new Set(err)].slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
await b.close(); srv.kill();
console.log(`\n${n - f} pasan · ${f} fallan`);
process.exit(f ? 1 : 0);
