#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   EL CEREBRO · memoria de lo que ya nos costó caro
   ──────────────────────────────────────────────────────────────────────────
   Para qué existe, dicho sin adornos: **contexto barato**.

   Cada sesión nueva empieza sin saber nada de las anteriores. Volver a
   explicarle a un agente por qué los acentos se rompen al publicar, o por qué
   una prueba verde no quiere decir nada, cuesta contexto —o sea dinero— y se
   paga otra vez la semana que entra. Esto lo cobra una sola vez.

   No es documentación del código. Es memoria de ERRORES: qué se vio, qué lo
   causaba, por qué pasaba, cómo se arregló y qué hacer la próxima.

   ── Cómo se usa ──────────────────────────────────────────────────────────
     node cerebro/cerebro.mjs buscar "los acentos salen raros"
     node cerebro/cerebro.mjs area despliegue
     node cerebro/cerebro.mjs ver charset-que-no-manda-el-servidor
     node cerebro/cerebro.mjs vecinas ver-la-pantalla
     node cerebro/cerebro.mjs revisar
     node cerebro/cerebro.mjs armar          → cerebro/todo.json, para servirlo

   ── Por qué «neuronas» y no «artículos» ──────────────────────────────────
   Porque lo que las hace útiles es que se llaman entre sí. Un problema real
   casi nunca es una neurona: es una cadena. «No se pinta y no hay error» te
   lleva a un renombre, que te lleva a que las pruebas no cubren la costura,
   que te lleva a verificar lo publicado. Ese camino es el valor.
   ═════════════════════════════════════════════════════════════════════════ */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const NEURONAS = join(AQUI, 'neuronas');

/* Campos que toda neurona debe traer. Si falta uno, no sirve: una neurona sin
   `porque` es un apunte, y los apuntes no evitan que vuelva a pasar. */
export const OBLIGATORIOS = ['id', 'titulo', 'sintoma', 'causa', 'porque',
                             'arreglo', 'comoCazarlo', 'consejo', 'senales'];

export async function cargar(){
  const areas = [];
  for(const f of (await readdir(NEURONAS)).sort()){
    if(!f.endsWith('.json')) continue;
    const d = JSON.parse(await readFile(join(NEURONAS, f), 'utf8'));
    d.archivo = f;
    d.neuronas.forEach(n => { n.area = d.area; });
    areas.push(d);
  }
  return areas;
}

export const aplanar = (areas) => areas.flatMap(a => a.neuronas);

/* ── buscar ────────────────────────────────────────────────────────────────
   Se busca sobre todo en `senales`: las frases con las que una PERSONA
   describe el problema, no los términos técnicos. Quien tiene el bug enfrente
   dice «se ve chiquito en el celular», no «falta el meta viewport» — si
   supiera eso, ya lo habría arreglado. */
export function buscar(neuronas, texto){
  const q = normal(texto);
  if(!q) return [];
  const palabras = q.split(/\s+/).filter(p => p.length > 2);

  return neuronas.map(n => {
    let puntos = 0;
    for(const s of (n.senales || [])){
      const sn = normal(s);
      if(q.includes(sn)) puntos += 12;                     /* la señal completa */
      else if(palabras.filter(p => sn.includes(p)).length >= 2) puntos += 6;
    }
    const campos = [['titulo', 5], ['sintoma', 3], ['causa', 2],
                    ['consejo', 1], ['id', 4], ['area', 3]];
    for(const [c, peso] of campos){
      const v = normal(n[c] || '');
      for(const p of palabras) if(v.includes(p)) puntos += peso;
    }
    return { n, puntos };
  })
  .filter(x => x.puntos > 0)
  .sort((a, b) => b.puntos - a.puntos || pesoGravedad(b.n) - pesoGravedad(a.n))
  .map(x => x.n);
}

const pesoGravedad = (n) => ({ alta:3, media:2, baja:1 })[n.gravedad] || 0;

/* Sin acentos y en minúsculas: nadie escribe «codificación» con tilde cuando
   está apurado buscando por qué se le rompió algo. */
const normal = (t) => String(t || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ── vecinas ───────────────────────────────────────────────────────────────
   Las declaradas a mano, más las que comparten señales. Lo segundo es lo que
   hace que el cerebro descubra parentescos que nadie escribió. */
export function vecinas(neuronas, id){
  const yo = neuronas.find(n => n.id === id);
  if(!yo) return { error: `No hay ninguna neurona con id "${id}".` };

  const dichas = (yo.vecinas || [])
    .map(v => neuronas.find(n => n.id === v))
    .filter(Boolean)
    .map(n => ({ ...n, porQue: 'declarada' }));

  const mias = new Set((yo.senales || []).map(normal));
  const parecidas = neuronas
    .filter(n => n.id !== id && !(yo.vecinas || []).includes(n.id))
    .map(n => {
      const comunes = (n.senales || []).filter(s => {
        const sn = normal(s);
        return [...mias].some(m => m.includes(sn) || sn.includes(m));
      });
      return { n, comunes };
    })
    .filter(x => x.comunes.length)
    .sort((a, b) => b.comunes.length - a.comunes.length)
    .slice(0, 4)
    .map(x => ({ ...x.n, porQue: `comparten señal: ${x.comunes.join(', ')}` }));

  return { yo, vecinas: dichas.concat(parecidas) };
}

/* ── revisar ───────────────────────────────────────────────────────────────
   Un cerebro con ligas rotas miente, y mentir aquí es peor que no existir:
   alguien va a seguir un consejo que apunta a nada. */
export function revisar(areas){
  const todas = aplanar(areas);
  const ids = new Set();
  const fallas = [];

  for(const n of todas){
    for(const c of OBLIGATORIOS){
      const v = n[c];
      if(v == null || (typeof v === 'string' && !v.trim()) ||
         (Array.isArray(v) && !v.length)){
        fallas.push(`${n.id || '(sin id)'}: le falta "${c}"`);
      }
    }
    if(ids.has(n.id)) fallas.push(`${n.id}: el id está repetido`);
    ids.add(n.id);
    if(n.gravedad && !['alta','media','baja'].includes(n.gravedad)){
      fallas.push(`${n.id}: gravedad "${n.gravedad}" no existe`);
    }
  }
  for(const n of todas){
    for(const v of (n.vecinas || [])){
      if(!ids.has(v)) fallas.push(`${n.id}: apunta a "${v}", que no existe`);
    }
    if((n.vecinas || []).includes(n.id)) fallas.push(`${n.id}: se apunta a sí misma`);
  }
  return { total: todas.length, areas: areas.length, fallas };
}

/* ── agregar ───────────────────────────────────────────────────────────────
   Que crezca es la mitad del punto: un cerebro que no se actualiza se vuelve
   folklore. Se valida antes de escribir para que nadie meta una a medias. */
export async function agregar(neurona, area){
  const areas = await cargar();
  const destino = areas.find(a => a.area === area);
  if(!destino) return { error: `No existe el área "${area}". Van: ${areas.map(a => a.area).join(', ')}` };
  if(aplanar(areas).some(n => n.id === neurona.id)){
    return { error: `Ya hay una neurona con id "${neurona.id}".` };
  }
  const faltan = OBLIGATORIOS.filter(c => {
    const v = neurona[c];
    return v == null || (typeof v === 'string' && !v.trim()) ||
           (Array.isArray(v) && !v.length);
  });
  if(faltan.length) return { error: `Le faltan campos: ${faltan.join(', ')}` };

  const crudo = JSON.parse(await readFile(join(NEURONAS, destino.archivo), 'utf8'));
  const { area: _, ...limpia } = neurona;
  crudo.neuronas.push(limpia);
  await writeFile(join(NEURONAS, destino.archivo),
                  JSON.stringify(crudo, null, 2) + '\n');
  return { bien: true, en: destino.archivo, total: crudo.neuronas.length };
}

/* ── armar ─────────────────────────────────────────────────────────────────
   Un solo archivo para servirlo y para que un agente lo baje de un jalón. */
export async function armar(){
  const areas = await cargar();
  const todo = {
    hecho: new Date().toISOString(),
    total: aplanar(areas).length,
    areas: areas.map(({ archivo, ...a }) => a),
  };
  await writeFile(join(AQUI, 'todo.json'), JSON.stringify(todo) + '\n');
  return todo;
}

/* ══ desde la terminal ════════════════════════════════════════════════════ */
if(process.argv[1] && process.argv[1].endsWith('cerebro.mjs')){
  const [orden, ...resto] = process.argv.slice(2);
  const areas = await cargar();
  const todas = aplanar(areas);
  const arg = resto.join(' ');

  const pintar = (n, largo = false) => {
    console.log(`\n  ${n.gravedad === 'alta' ? '🔴' : n.gravedad === 'media' ? '🟠' : '⚪'} ${n.titulo}`);
    console.log(`     ${n.area} · ${n.id}`);
    if(!largo) return;
    console.log(`\n     SÍNTOMA    ${n.sintoma}`);
    console.log(`     CAUSA      ${n.causa}`);
    console.log(`     POR QUÉ    ${n.porque}`);
    console.log(`     ARREGLO    ${n.arreglo}`);
    console.log(`     CÓMO CAZARLO  ${n.comoCazarlo}`);
    console.log(`     CONSEJO    ${n.consejo}`);
    if(n.salioDe) console.log(`     SALIÓ DE   ${n.salioDe}`);
    if(n.vecinas?.length) console.log(`     LLEVA A    ${n.vecinas.join(' · ')}`);
  };

  if(orden === 'buscar'){
    const r = buscar(todas, arg);
    if(!r.length){
      console.log(`\n  Nada para «${arg}».`);
      console.log('  Si resolviste algo que no está aquí, agrégalo: es justo para eso.\n');
    } else {
      console.log(`\n  ${r.length} para «${arg}»:`);
      r.slice(0, 6).forEach((n, i) => pintar(n, i === 0));
      console.log('');
    }
  }
  else if(orden === 'area'){
    const a = areas.find(x => x.area === arg);
    if(!a){ console.log(`\n  Áreas: ${areas.map(x => x.area).join(' · ')}\n`); }
    else {
      console.log(`\n  ${a.nombre} — ${a.que}`);
      a.neuronas.forEach(n => pintar(n));
      console.log('');
    }
  }
  else if(orden === 'ver'){
    const n = todas.find(x => x.id === arg);
    if(!n) console.log(`\n  No hay ninguna con id "${arg}".\n`);
    else { pintar(n, true); console.log(''); }
  }
  else if(orden === 'vecinas'){
    const r = vecinas(todas, arg);
    if(r.error) console.log(`\n  ${r.error}\n`);
    else {
      console.log(`\n  Desde: ${r.yo.titulo}`);
      r.vecinas.forEach(v => {
        console.log(`\n  → ${v.titulo}`);
        console.log(`     ${v.id} · ${v.porQue}`);
      });
      console.log('');
    }
  }
  else if(orden === 'revisar'){
    const r = revisar(areas);
    console.log(`\n  ${r.total} neuronas en ${r.areas} áreas`);
    if(!r.fallas.length) console.log('  ✓ sin ligas rotas ni campos faltantes\n');
    else { r.fallas.forEach(f => console.log(`  ✗ ${f}`)); console.log(''); process.exit(1); }
  }
  else if(orden === 'armar'){
    const t = await armar();
    console.log(`\n  ✓ cerebro/todo.json · ${t.total} neuronas\n`);
  }
  else {
    console.log(`
  EL CEREBRO · ${todas.length} neuronas en ${areas.length} áreas

    buscar "lo que te está pasando"   busca por cómo se DESCRIBE el problema
    area <nombre>                      ${areas.map(a => a.area).join(' · ')}
    ver <id>                           una completa
    vecinas <id>                       a qué otras lleva
    revisar                            ligas rotas y campos faltantes
    armar                              todo.json para servirlo
`);
  }
}
