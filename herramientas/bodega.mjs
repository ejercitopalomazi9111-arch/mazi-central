#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   bodega.mjs — HERRAMIENTA MAZI · el almacén de skills
   ──────────────────────────────────────────────────────────────────────────
   EL PROBLEMA QUE RESUELVE, dicho por Carlos:

     «quiero todas las skills que hayan… y si ahogan la sesión mételas a
      neuronas y que los agentes las descarguen y usen cuando sea conveniente»

   Y ése es exactamente el punto. Claude Code lee la DESCRIPCIÓN de cada skill
   que esté en `.claude/skills/` en CADA turno, para decidir cuál se dispara.
   Con 17 skills eso son ~4 KB y no se nota. Con dos mil son cientos de KB en
   cada turno — la sesión se ahoga antes de empezar a trabajar, y encima el
   enrutador escoge peor porque tiene dos mil descripciones parecidas enfrente.

   Por eso la bodega NO vive en `.claude/skills/`:

       bodega/skills/<nombre>/     ← miles. Claude NO las lee. Están dormidas
       bodega/INDICE.json          ← una línea por skill. Esto sí se consulta
       .claude/skills/             ← sólo las que están PUESTAS ahorita

   Buscar en el índice cuesta una llamada. Poner una skill cuesta copiar una
   carpeta. Y la sesión sigue cargando nada más lo que está puesto.

   ── uso ───────────────────────────────────────────────────────────────────
     node herramientas/bodega.mjs cosechar <ruta>…    de carpetas locales
     node herramientas/bodega.mjs traer <owner/repo>… de GitHub
     node herramientas/bodega.mjs indexar             reconstruye el índice
     node herramientas/bodega.mjs buscar "<lo que sea>"
     node herramientas/bodega.mjs montar <nombre>…    la pone a trabajar
     node herramientas/bodega.mjs desmontar <nombre>…
     node herramientas/bodega.mjs puestas             qué está montado
     node herramientas/bodega.mjs neuronas            índice → cerebro

   ── lo que NO hace, y por qué ─────────────────────────────────────────────
   No copia una skill sin saber de dónde salió ni bajo qué licencia. Este repo
   es público: meterle miles de archivos de otra gente sin registrar su origen
   es el mismo flanco que ya nos costó una discusión con Torre Infinita. Cada
   skill guarda su `fuente` y su `licencia`, y las que no traen licencia se
   marcan `sin-licencia` para poder sacarlas de un jalón si hace falta.
   ═════════════════════════════════════════════════════════════════════════ */
import { readdir, readFile, writeFile, mkdir, rm, stat, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const correr = promisify(execFile);
const AQUI    = dirname(fileURLToPath(import.meta.url));
const RAIZ    = resolve(AQUI, '..');
const BODEGA  = join(RAIZ, 'bodega');
const GUARDA  = join(BODEGA, 'skills');
const INDICE  = join(BODEGA, 'INDICE.json');
const PUESTAS = join(RAIZ, '.claude', 'skills');

/* ── el encabezado ─────────────────────────────────────────────────────────
   Sin dependencias de YAML a propósito: el encabezado de una skill es un par
   de campos de texto, y meter una librería para leer dos campos es cargar el
   camión para traer el pan. Lo único con maña es que `description` casi
   siempre viene partida en varios renglones con sangría. */
export function encabezado(texto){
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if(!m) return null;
  const campos = {};
  let clave = null;
  for(const linea of m[1].split(/\r?\n/)){
    const par = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(linea);
    if(par){ clave = par[1]; campos[clave] = par[2].trim(); }
    /* Renglón con sangría = continuación del campo anterior. Sin esto, la
       mitad de las descripciones largas se cortaban en la primera línea y el
       índice quedaba inservible justo para las skills más elaboradas. */
    else if(clave && /^\s+\S/.test(linea)) campos[clave] += ' ' + linea.trim();
    else if(!linea.trim()) continue;
    else clave = null;
  }
  for(const k in campos) campos[k] = campos[k].replace(/^["']|["']$/g, '').trim();
  return campos;
}

const rebanada = (t, n) => {
  const limpio = String(t || '').replace(/\s+/g, ' ').trim();
  return limpio.length <= n ? limpio : limpio.slice(0, n - 1).replace(/\s\S*$/, '') + '…';
};

const huella = (t) => createHash('sha256').update(t).digest('hex').slice(0, 16);

const babosa = (t) => String(t).toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').slice(0, 60) || 'sin-nombre';

/* Las etiquetas salen del texto, no de una lista fija: una lista fija se
   queda corta con la primera skill de un tema que no previmos. */
const TEMAS = {
  video:['video','ffmpeg','remotion','render','mp4','footage','edit'],
  imagen:['image','imagen','png','svg','figma','design','canvas','logo'],
  web:['web','html','css','react','next','tailwind','frontend','landing'],
  datos:['data','sql','database','csv','excel','xlsx','analytics','pandas'],
  documentos:['docx','pdf','pptx','document','report','slide'],
  codigo:['code','refactor','debug','test','lint','review','git'],
  agentes:['agent','mcp','orchestr','subagent','swarm','delegate'],
  negocio:['sales','marketing','gtm','pricing','customer','growth','finance'],
  infra:['deploy','docker','kubernetes','server','cloud','aws','ci/cd'],
  movil:['android','ios','mobile','adb','appium','phone'],
  redes:['twitter','instagram','tiktok','linkedin','social','post'],
  audio:['audio','voice','speech','whisper','tts','podcast'],
};
function etiquetar(nombre, descripcion, cuerpo){
  const t = `${nombre} ${descripcion} ${rebanada(cuerpo, 2000)}`.toLowerCase();
  const puestas = [];
  for(const [tema, palabras] of Object.entries(TEMAS)){
    if(palabras.some(p => t.includes(p))) puestas.push(tema);
  }
  return puestas.length ? puestas : ['otras'];
}

/* ── licencia ──────────────────────────────────────────────────────────────
   Se busca subiendo desde la carpeta de la skill hasta la raíz de su origen.
   Una skill hereda la licencia de su repositorio, no trae la suya. */
async function licenciaDe(carpeta, tope){
  let d = carpeta;
  for(let i = 0; i < 6; i++){
    for(const f of ['LICENSE','LICENSE.md','LICENSE.txt','COPYING','LICENCE']){
      const p = join(d, f);
      if(existsSync(p)){
        const t = (await readFile(p, 'utf8')).slice(0, 600).toUpperCase();
        if(t.includes('MIT LICENSE') || /\bMIT\b/.test(t)) return 'MIT';
        if(t.includes('APACHE LICENSE')) return 'Apache-2.0';
        if(t.includes('GNU GENERAL PUBLIC')) return 'GPL';
        if(t.includes('BSD')) return 'BSD';
        if(t.includes('MOZILLA PUBLIC')) return 'MPL-2.0';
        if(t.includes('CC0') || t.includes('PUBLIC DOMAIN')) return 'CC0';
        return 'otra';
      }
    }
    if(d === tope || d === '/' || d === dirname(d)) break;
    d = dirname(d);
  }
  return 'sin-licencia';
}

/* ── encontrar skills ────────────────────────────────────────────────────── */
async function buscarSkills(raiz, profundidad = 8){
  const halladas = [];
  async function bajar(d, nivel){
    if(nivel > profundidad) return;
    let cosas;
    try{ cosas = await readdir(d, { withFileTypes:true }); }catch(e){ return; }
    for(const c of cosas){
      /* `node_modules` es donde mueren las cosechas: una sola instalación de
         npm mete miles de archivos y ninguno es una skill nuestra. */
      if(c.isDirectory()){
        if(['node_modules','.git','dist','build','.next','venv','__pycache__'].includes(c.name)) continue;
        await bajar(join(d, c.name), nivel + 1);
      }
      else if(c.name === 'SKILL.md') halladas.push(join(d, c.name));
    }
  }
  await bajar(resolve(raiz), 0);
  return halladas;
}

async function leerSkill(ruta, origen, tope){
  const texto = await readFile(ruta, 'utf8');
  const cab = encabezado(texto);
  if(!cab || !cab.description) return null;      /* sin descripción no se puede enrutar */
  const carpeta = dirname(ruta);
  const nombre = babosa(cab.name || basename(carpeta));
  return {
    nombre,
    resumen: rebanada(cab.description, 300),
    etiquetas: etiquetar(nombre, cab.description, texto),
    fuente: origen,
    licencia: await licenciaDe(carpeta, tope),
    huella: huella(texto),
    bytes: Buffer.byteLength(texto),
    carpeta,
  };
}

/* ── cosechar ──────────────────────────────────────────────────────────────
   Se deduplica por HUELLA del contenido, no por nombre: la misma skill anda
   copiada en veinte repos con veinte nombres, y guardarla veinte veces hace
   que el índice mienta sobre cuántas cosas distintas tenemos. */
async function cosechar(rutas, origen){
  await mkdir(GUARDA, { recursive:true });
  const previo = await cargarIndice();
  const porHuella = new Map(previo.map(s => [s.huella, s]));
  const usados = new Set(previo.map(s => s.nombre));

  let nuevas = 0, repetidas = 0, sinCabeza = 0;
  for(const raiz of rutas){
    const archivos = await buscarSkills(raiz);
    for(const a of archivos){
      const s = await leerSkill(a, origen || resolve(raiz), resolve(raiz));
      if(!s){ sinCabeza++; continue; }
      if(porHuella.has(s.huella)){ repetidas++; continue; }

      /* Choque de nombre con contenido distinto: se conservan las dos, con
         sufijo. Tirar una sería decidir por el que la vaya a usar. */
      let nombre = s.nombre, n = 2;
      while(usados.has(nombre)) nombre = `${s.nombre}-${n++}`;
      s.nombre = nombre; usados.add(nombre);

      const destino = join(GUARDA, nombre);
      await cp(s.carpeta, destino, { recursive:true,
        filter:(p) => !/[\\/](node_modules|\.git)([\\/]|$)/.test(p) });
      delete s.carpeta;
      porHuella.set(s.huella, s);
      nuevas++;
    }
  }
  const todas = [...porHuella.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  await guardarIndice(todas);
  return { nuevas, repetidas, sinCabeza, total: todas.length };
}

/* ── traer de GitHub ───────────────────────────────────────────────────────
   Clon superficial a una carpeta temporal, se cosecha y se tira. No se deja
   el clon: son cientos de megas de historia que no nos sirven de nada. */
async function traer(repos){
  const tmp = join(BODEGA, '.clones');
  await mkdir(tmp, { recursive:true });
  const resumen = [];
  for(const r of repos){
    const destino = join(tmp, babosa(r));
    try{
      await rm(destino, { recursive:true, force:true });
      await correr('git', ['clone','--depth','1','--quiet',
                           `https://github.com/${r}.git`, destino],
                   { timeout: 180_000 });
      const cuenta = await cosechar([destino], `github:${r}`);
      resumen.push({ repo:r, ...cuenta });
      console.log(`  ✓ ${r} · +${cuenta.nuevas} nuevas · ${cuenta.repetidas} repetidas`);
    }catch(e){
      resumen.push({ repo:r, error: rebanada(e.message, 120) });
      console.log(`  ✗ ${r} · ${rebanada(e.message, 100)}`);
    }finally{
      await rm(destino, { recursive:true, force:true });
    }
  }
  await rm(tmp, { recursive:true, force:true });
  return resumen;
}

/* ── el índice ─────────────────────────────────────────────────────────── */
async function cargarIndice(){
  if(!existsSync(INDICE)) return [];
  try{ return JSON.parse(await readFile(INDICE, 'utf8')).skills || []; }
  catch(e){ return []; }
}

async function guardarIndice(skills){
  await mkdir(BODEGA, { recursive:true });
  const porTema = {};
  for(const s of skills) for(const t of s.etiquetas) porTema[t] = (porTema[t] || 0) + 1;
  const porLicencia = {};
  for(const s of skills) porLicencia[s.licencia] = (porLicencia[s.licencia] || 0) + 1;
  await writeFile(INDICE, JSON.stringify({
    hecho: new Date().toISOString(),
    total: skills.length,
    porTema, porLicencia,
    skills,
  }, null, 0) + '\n');
}

/* ── buscar ────────────────────────────────────────────────────────────────
   Se puntúa por dónde aparece la palabra: el nombre pesa más que el resumen,
   porque quien busca «video» quiere la skill DE video, no las cuarenta que la
   mencionan de pasada. */
function puntuar(s, palabras){
  let p = 0;
  const nom = s.nombre.toLowerCase();
  const res = s.resumen.toLowerCase();
  for(const w of palabras){
    if(nom === w) p += 40;
    else if(nom.includes(w)) p += 12;
    if(s.etiquetas.includes(w)) p += 8;
    if(res.includes(w)) p += 3;
  }
  return p;
}

export function buscar(skills, consulta, cuantas = 15){
  const palabras = String(consulta).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').split(/\s+/).filter(w => w.length >= 2);
  if(!palabras.length) return [];
  return skills.map(s => ({ s, p: puntuar(s, palabras) }))
    .filter(x => x.p > 0)
    .sort((a, b) => b.p - a.p || a.s.nombre.localeCompare(b.s.nombre))
    .slice(0, cuantas).map(x => ({ ...x.s, puntos: x.p }));
}

/* ── montar y desmontar ──────────────────────────────────────────────────── */
async function montar(nombres){
  const idx = await cargarIndice();
  const hechas = [];
  for(const n of nombres){
    const s = idx.find(x => x.nombre === n);
    if(!s){ console.log(`  ✗ «${n}» no está en la bodega`); continue; }
    const de = join(GUARDA, n), a = join(PUESTAS, n);
    if(!existsSync(de)){ console.log(`  ✗ «${n}» está en el índice pero no en el disco`); continue; }
    /* La otra mitad del mismo peligro: montar encima de una skill de la casa
       que se llame igual la pisaría EN SILENCIO. Se rechaza y se dice. */
    if(existsSync(join(a, 'SKILL.md')) && !await esDeBodega(n, new Set([s.huella]))){
      console.log(`  ✗ «${n}» ya existe en .claude/skills y NO es la de la bodega. No la piso.`);
      continue;
    }
    await cp(de, a, { recursive:true });
    hechas.push(n);
    console.log(`  ✓ puesta: ${n}`);
  }
  return hechas;
}

/* ── ¿esto vino de la bodega, o es de la casa? ─────────────────────────────
   Por NOMBRE no se puede, y esto lo cazó la primera prueba: `frontend-design`
   y `remotion` son nuestras y se llaman igual que unas cosechadas, así que
   salían marcadas como de la bodega. Un `desmontar frontend-design` habría
   borrado meses de criterio propio por un nombre repetido.

   Se compara la HUELLA del contenido. Si el archivo puesto es idéntico a uno
   de la bodega, vino de ahí; si no, es de la casa aunque coincida el nombre. */
async function esDeBodega(nombre, huellas){
  try{
    const t = await readFile(join(PUESTAS, nombre, 'SKILL.md'), 'utf8');
    return huellas.has(huella(t));
  }catch(e){ return false; }
}

/* Sólo desmonta lo que vino de la bodega. Las de la casa NO se tocan. */
async function desmontar(nombres){
  const huellas = new Set((await cargarIndice()).map(s => s.huella));
  const fuera = [];
  for(const n of nombres){
    if(!await esDeBodega(n, huellas)){ console.log(`  ✗ «${n}» no vino de la bodega — no se toca`); continue; }
    const a = join(PUESTAS, n);
    if(!existsSync(a)){ console.log(`  · «${n}» no estaba puesta`); continue; }
    await rm(a, { recursive:true, force:true });
    fuera.push(n);
    console.log(`  ✓ guardada: ${n}`);
  }
  return fuera;
}

async function puestas(){
  const huellas = new Set((await cargarIndice()).map(s => s.huella));
  let cosas = [];
  try{ cosas = (await readdir(PUESTAS, { withFileTypes:true })).filter(c => c.isDirectory()); }
  catch(e){ return { casa: [], bodega: [] }; }
  const casa = [], deBodega = [];
  for(const c of cosas){
    (await esDeBodega(c.name, huellas) ? deBodega : casa).push(c.name);
  }
  return { casa, bodega: deBodega };
}

/* ── el índice se vuelve neurona ───────────────────────────────────────────
   Esto es lo que pidió Carlos con todas sus letras: que el catálogo viva en el
   cerebro para que un agente lo consulte y baje sólo lo que le sirva. Se
   escribe UNA neurona por TEMA, no una por skill: 2000 neuronas de «existe la
   skill X» ahogarían el cerebro igual que ahogarían la sesión, y además no
   dirían nada — el cerebro guarda lo que COSTÓ, no inventario. */
async function neuronas(){
  const idx = await cargarIndice();
  if(!idx.length) throw new Error('La bodega está vacía. Cosecha algo primero.');
  const porTema = {};
  for(const s of idx) for(const t of s.etiquetas) (porTema[t] = porTema[t] || []).push(s);

  const lista = Object.entries(porTema).sort((a, b) => b[1].length - a[1].length).map(([tema, ss]) => {
    const muestra = ss.slice(0, 12).map(s => s.nombre);
    return {
      id: `bodega-${tema}`,
      clase: 'pieza',
      titulo: `Bodega · skills de ${tema} (${ss.length})`,
      que: `${ss.length} skills de ${tema} guardadas y listas para poner a trabajar. Algunas: ${muestra.join(', ')}.`,
      donde: `bodega/skills/ · se busca con \`node herramientas/bodega.mjs buscar "${tema}"\` y se pone con \`montar <nombre>\``,
      porque: 'Están DORMIDAS a propósito. Claude Code lee la descripción de todo lo que esté en `.claude/skills/` en cada turno; con miles adentro la sesión se ahoga antes de trabajar y el enrutador escoge peor. En la bodega no cuestan nada hasta que se ponen.',
      ojo: 'Son de otra gente. Cada una trae su `fuente` y su `licencia` en el índice — antes de apoyarse en una, se mira de dónde salió. Y se desmonta al terminar: dejarlas puestas devuelve el problema que la bodega resuelve.',
      senales: [`skill de ${tema}`, `algo que haga ${tema}`, `hay algo para ${tema}`, `necesito ${tema}`],
      vecinas: ['pieza-skills-como-unidad', 'pieza-cerebro'],
    };
  });

  const archivo = join(RAIZ, 'cerebro', 'neuronas', 'bodega.json');
  await writeFile(archivo, JSON.stringify({
    area: 'bodega',
    nombre: 'La bodega de skills',
    que: `Catálogo de ${idx.length} skills guardadas sin cargarlas. Un agente busca en el índice, pone la que le sirve, la usa y la guarda de vuelta.`,
    neuronas: lista,
  }, null, 2) + '\n');
  return { temas: lista.length, skills: idx.length, archivo };
}

/* ── la puerta ─────────────────────────────────────────────────────────── */
const AYUDA = `
  bodega.mjs · el almacén de skills

    cosechar <ruta>…        busca SKILL.md en carpetas locales y las guarda
    traer <owner/repo>…     lo mismo, clonando de GitHub
    indexar                 reconstruye el índice desde lo guardado
    buscar "<consulta>"     qué hay para eso
    montar <nombre>…        la pone a trabajar en .claude/skills/
    desmontar <nombre>…     la regresa a la bodega
    puestas                 qué está montado ahorita
    neuronas                el índice → cerebro/neuronas/bodega.json
`;

const [,, orden, ...resto] = process.argv;

try{
  if(orden === 'cosechar'){
    if(!resto.length) throw new Error('¿Cosechar de dónde? Pásame una ruta.');
    const r = await cosechar(resto);
    console.log(`\n  ✓ +${r.nuevas} nuevas · ${r.repetidas} repetidas · ${r.sinCabeza} sin descripción`);
    console.log(`  La bodega tiene ${r.total} skills\n`);
  }
  else if(orden === 'traer'){
    if(!resto.length) throw new Error('¿De qué repo? Ejemplo: anthropics/skills');
    await traer(resto);
    const idx = await cargarIndice();
    console.log(`\n  La bodega tiene ${idx.length} skills\n`);
  }
  else if(orden === 'indexar'){
    let dirs = [];
    try{ dirs = (await readdir(GUARDA, { withFileTypes:true })).filter(c => c.isDirectory()); }catch(e){}
    const skills = [];
    for(const d of dirs){
      const s = await leerSkill(join(GUARDA, d.name, 'SKILL.md'), 'bodega', GUARDA).catch(() => null);
      if(s){ s.nombre = d.name; delete s.carpeta; skills.push(s); }
    }
    await guardarIndice(skills);
    console.log(`\n  ✓ índice reconstruido · ${skills.length} skills\n`);
  }
  else if(orden === 'buscar'){
    const idx = await cargarIndice();
    const r = buscar(idx, resto.join(' '));
    if(!r.length){ console.log(`\n  Nada para «${resto.join(' ')}». La bodega tiene ${idx.length}.\n`); }
    else{
      console.log(`\n  ${r.length} de ${idx.length}:\n`);
      for(const s of r) console.log(`  ${s.nombre}\n    ${rebanada(s.resumen, 120)}\n    [${s.etiquetas.join(' ')}] ${s.licencia} · ${s.fuente}\n`);
      console.log(`  Para usarla:  node herramientas/bodega.mjs montar ${r[0].nombre}\n`);
    }
  }
  else if(orden === 'montar'){ await montar(resto); }
  else if(orden === 'desmontar'){ await desmontar(resto); }
  else if(orden === 'puestas'){
    const p = await puestas();
    console.log(`\n  De la casa (${p.casa.length}): ${p.casa.join(', ') || '—'}`);
    console.log(`  De la bodega (${p.bodega.length}): ${p.bodega.join(', ') || '—'}\n`);
  }
  else if(orden === 'neuronas'){
    const r = await neuronas();
    console.log(`\n  ✓ ${r.temas} neuronas de ${r.skills} skills → ${r.archivo}\n`);
  }
  else if(orden && orden !== 'ayuda'){ console.log(`\n  No conozco «${orden}».${AYUDA}`); process.exit(1); }
  else console.log(AYUDA);
}catch(e){
  console.error(`\n  ✗ ${e.message}\n`);
  process.exit(1);
}
