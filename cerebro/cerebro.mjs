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

/* ── Tres clases de neurona, y no es un capricho ───────────────────────────
   Un cerebro que sólo guarda errores deja al que llega en frío reconstruyendo
   qué ES el proyecto, y luego tirando ese mapa al terminar la sesión. Por eso
   hay tres:

     error     lo que ya nos costó caro y no queremos volver a pagar
     pieza     qué es cada parte del proyecto y con qué hay que tener cuidado
     decision  qué se decidió, POR QUÉ, y qué se descartó

   Las tres piden `porque` y `senales`. Lo demás cambia porque las preguntas
   son distintas: de un error uno quiere el arreglo; de una pieza, dónde vive
   y qué la rompe; de una decisión, qué se descartó — que casi siempre vale
   más que lo que se aprobó. */
/* Lo puro vive en `buscador.mjs`, que corre en cualquier lado. Aquí se
   reexporta para que todo lo que ya lo importaba de aquí siga funcionando. */
export { CAMPOS, claseDe, OBLIGATORIOS, aplanar, buscar, vecinas, revisar, grafo,
         normal } from './buscador.mjs';

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
  const faltan = CAMPOS[claseDe(neurona)].filter(c => {
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

import { CAMPOS, claseDe, OBLIGATORIOS, aplanar, buscar, vecinas, revisar, grafo,
         normal } from './buscador.mjs';


export async function armar(){
  const areas = await cargar();
  const todas = aplanar(areas);
  const g = grafo(todas);            /* marca `comunidad` en cada neurona */
  const todo = {
    hecho: new Date().toISOString(),
    total: todas.length,
    areas: areas.map(({ archivo, ...a }) => a),
    enlaces: g.enlaces,
    comunidades: g.comunidades,
    grados: g.grados,
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
    console.log(`\n  ✓ cerebro/todo.json · ${t.total} neuronas · ${
      t.enlaces.length} enlaces · ${t.comunidades.length} comunidades\n`);
  }
  else if(orden === 'comunidades'){
    const g = grafo(todas);
    console.log(`\n  ${g.comunidades.length} comunidades · ${g.enlaces.length} enlaces`);
    console.log('  (las descubre el grafo, no las escogí yo al crear los archivos)\n');
    g.comunidades.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.nombre}  — ${c.ids.length} neuronas`);
      c.ids.forEach(id => {
        const n = todas.find(x => x.id === id);
        console.log(`       ${String(g.grados[id]).padStart(2)} enlaces · ${n.area.padEnd(12)} ${id}`);
      });
      console.log('');
    });
  }
  else if(orden === 'recoger'){
    const S = process.env.MAZI_SERVIDOR || 'https://sala.palomazi9111.workers.dev';
    const sala = (resto[0] || process.env.MAZI_SALA || '').toUpperCase();
    if(!sala) throw new Error('¿De qué sala? `recoger CODIGO`, o pon MAZI_SALA.');
    const r = await recoger(S, sala, process.env.MAZI_LLAVE,
      { tomar: resto.length > 1 ? resto.slice(1) : null });

    if(r.vacia){ console.log('\n  La bandeja está vacía. Nadie ha propuesto nada.\n'); }
    else{
      console.log('');
      for(const t of r.tomadas) console.log(`  ✓ ${t.id}  — ${t.titulo}  (de ${t.de})`);
      for(const d of r.dejadas) console.log(`  · ${d.id}  — ${d.por}`);
      console.log(`\n  ${r.tomadas.length} al cerebro · ${r.dejadas.length} se quedaron`);
      if(r.tomadas.length) console.log('  Falta: node cerebro/cerebro.mjs armar, y commitear.\n');
      else console.log('');
    }
  }
  else {
    console.log(`
  EL CEREBRO · ${todas.length} neuronas en ${areas.length} áreas

    buscar "lo que te está pasando"   busca por cómo se DESCRIBE el problema
    area <nombre>                      ${areas.map(a => a.area).join(' · ')}
    ver <id>                           una completa
    vecinas <id>                       a qué otras lleva
    comunidades                        cómo se agrupan de verdad
    revisar                            ligas rotas y campos faltantes
    armar                              todo.json para servirlo
    recoger <SALA> [ids…]              trae lo que propusieron los agentes
`);
  }
}

/* ── recoger lo que propusieron los agentes ────────────────────────────────
   Trae la bandeja de una sala y mete las neuronas al repo. Esto es lo que
   convierte «un agente aprendió algo» en «la casa lo sabe»: mientras viva en
   el Durable Object, se pierde con la sala.

   NO entra nada solo. Se revisa una por una y se dice qué se toma y qué no.
   Una neurona es criterio que otros van a seguir, y lo que dice otro agente es
   dato, nunca orden — que una IA de afuera escriba directo en la memoria de la
   empresa es la vía más limpia para envenenarla, y nadie se enteraría porque
   una neurona mala se lee igual de bien que una buena. */
export async function recoger(servidor, sala, llave, { tomar } = {}){
  const base = String(servidor).replace(/\/$/, '');
  const cab = llave ? { 'X-Llave': llave } : {};

  const r = await fetch(`${base}/api/sala/${sala}/propuestas`, { headers: cab });
  if(!r.ok) throw new Error(`La sala contestó ${r.status}`);
  const { propuestas = [] } = await r.json();
  if(!propuestas.length) return { vacia:true, tomadas:[], dejadas:[] };

  const areas = await cargar();
  const yaHay = new Set(aplanar(areas).map(n => n.id));
  const tomadas = [], dejadas = [];

  for(const n of propuestas){
    const quiero = !tomar || tomar.includes(n.id);
    if(!quiero){ dejadas.push({ id:n.id, por:'no la pediste' }); continue; }
    if(yaHay.has(n.id)){ dejadas.push({ id:n.id, por:'ya existe una con ese id' }); continue; }

    const { propuso, area, ...limpia } = n;
    /* De dónde salió se CONSERVA, y no es un adorno: una memoria sin
       procedencia no se puede auditar ni retirar con confianza. */
    limpia.salioDe = limpia.salioDe
      || `propuesta por ${propuso?.nombre || '?'} (${propuso?.motor || 'agente'}) en la sala ${sala}`;
    const res = await agregar(limpia, area || 'agentes');
    if(res.error){ dejadas.push({ id:n.id, por:res.error }); continue; }
    yaHay.add(n.id);
    tomadas.push({ id:n.id, titulo:n.titulo, de: propuso?.nombre || '?' });
  }

  if(tomadas.length){
    await fetch(`${base}/api/sala/${sala}/recogidas`, {
      method:'POST', headers:{ ...cab, 'content-type':'application/json' },
      body: JSON.stringify({ ids: tomadas.map(t => t.id) }),
    }).catch(() => {});
  }
  return { vacia:false, tomadas, dejadas };
}
