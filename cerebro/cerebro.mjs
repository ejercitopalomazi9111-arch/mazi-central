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
export const CAMPOS = {
  error:    ['id','titulo','sintoma','causa','porque','arreglo','comoCazarlo','consejo','senales'],
  pieza:    ['id','titulo','que','donde','porque','ojo','senales'],
  decision: ['id','titulo','que','porque','alternativas','ojo','senales'],
};
export const claseDe = (n) => CAMPOS[n.clase] ? n.clase : 'error';
export const OBLIGATORIOS = CAMPOS.error;

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
    const campos = [['titulo', 5], ['sintoma', 3], ['que', 3], ['causa', 2],
                    ['consejo', 1], ['ojo', 1], ['donde', 2], ['id', 4], ['area', 3]];
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

/* ── cuándo dos señales cuentan como la misma ──────────────────────────────
   Con `includes` a secas todo se conectaba con todo y el grafo salía en UNA
   sola comunidad, inservible. La causa era bonita: la señal «Â» se normaliza
   a «a» —se le quita el acento— y «a» es subcadena de casi cualquier frase.

   Entonces: una señal corta tiene que coincidir COMPLETA; sólo las de seis
   letras para arriba pueden contar como subcadena. */
const CORTA = 6;
const VACIAS = new Set(['que','con','por','para','como','esta','este','pero','muy',
                        'los','las','del','una','uno','sin','ver','hay','mas','ya',
                        'lo','se','no','si','me','le','al','en','de','la','el','y','a']);
const palabrasDe = (t) => t.split(/\s+/).filter(p => p.length >= 4 && !VACIAS.has(p));

function parecidas(a, b){
  if(a === b) return true;
  /* Subcadena, sólo entre señales largas: con las cortas todo se conecta con
     todo — la señal «Â» se normaliza a «a» y es subcadena de casi cualquier
     frase, y el grafo salía en UNA comunidad, inservible. */
  if(a.length >= CORTA && b.length >= CORTA && (a.includes(b) || b.includes(a))) return true;
  /* Y dos palabras de contenido en común. Sin esto el descubrimiento casi no
     disparaba (4 de 49): «se ve chiquito en el celular» y «se ve chiquito en
     el teléfono» son la misma señal y no compartían subcadena. */
  const pa = palabrasDe(a), pb = palabrasDe(b);
  return pa.filter(p => pb.includes(p)).length >= 2;
}

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
  const similares = neuronas
    .filter(n => n.id !== id && !(yo.vecinas || []).includes(n.id))
    .map(n => {
      const comunes = (n.senales || []).filter(s => {
        const sn = normal(s);
        return [...mias].some(m => parecidas(m, sn));
      });
      return { n, comunes };
    })
    .filter(x => x.comunes.length)
    .sort((a, b) => b.comunes.length - a.comunes.length)
    .slice(0, 4)
    .map(x => ({ ...x.n, porQue: `comparten señal: ${x.comunes.join(', ')}` }));

  return { yo, vecinas: dichas.concat(similares) };
}

/* ── revisar ───────────────────────────────────────────────────────────────
   Un cerebro con ligas rotas miente, y mentir aquí es peor que no existir:
   alguien va a seguir un consejo que apunta a nada. */
export function revisar(areas){
  const todas = aplanar(areas);
  const ids = new Set();
  const fallas = [];

  for(const n of todas){
    for(const c of CAMPOS[claseDe(n)]){
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

/* ── el grafo y sus comunidades ────────────────────────────────────────────
   Las áreas las escogí yo al crear los archivos. Las COMUNIDADES las descubre
   el grafo: quién habla con quién de verdad. Casi nunca coinciden, y ahí está
   lo interesante — «charset» vive en despliegue y su comunidad real incluye
   piezas del sitio y neuronas de diseño, porque es con esas con las que
   aparece junto en un problema.

   El método es propagación de etiquetas: cada nodo toma la etiqueta más común
   entre sus vecinos, y se repite hasta que deja de moverse. Es el más simple
   que funciona y no necesita librerías — que aquí importa, porque el cerebro
   tiene que poder correr sin instalar nada.

   Se ordena por id antes de propagar para que el resultado sea SIEMPRE el
   mismo. Un grafo que se reagrupa distinto en cada carga no se puede leer. */
export function grafo(neuronas){
  const porId = new Map(neuronas.map(n => [n.id, n]));
  const enlaces = [];
  const vistos = new Set();

  const poner = (a, b, tipo, porQue) => {
    if(a === b) return;
    const llave = a < b ? `${a}|${b}` : `${b}|${a}`;
    if(vistos.has(llave)) return;
    vistos.add(llave);
    enlaces.push({ de:a, a:b, tipo, porQue });
  };

  for(const n of neuronas){
    for(const v of (n.vecinas || [])) if(porId.has(v)) poner(n.id, v, 'dicha', 'la menciona');
  }
  /* Y los que nadie escribió: los que se describen con las mismas palabras. */
  for(let i = 0; i < neuronas.length; i++){
    for(let j = i + 1; j < neuronas.length; j++){
      const a = neuronas[i], b = neuronas[j];
      const sa = (a.senales || []).map(normal), sb = (b.senales || []).map(normal);
      const comunes = sa.filter(x => sb.some(y => parecidas(x, y)));
      if(comunes.length) poner(a.id, b.id, 'hallada', `se describen igual: «${comunes[0]}»`);
    }
  }

  const vecinasDe = new Map(neuronas.map(n => [n.id, []]));
  for(const e of enlaces){ vecinasDe.get(e.de).push(e.a); vecinasDe.get(e.a).push(e.de); }

  const orden = [...neuronas].map(n => n.id).sort();
  const etiqueta = new Map(orden.map(id => [id, id]));
  for(let vuelta = 0; vuelta < 25; vuelta++){
    let movio = false;
    for(const id of orden){
      const cuenta = new Map();
      for(const v of vecinasDe.get(id)){
        const e = etiqueta.get(v);
        cuenta.set(e, (cuenta.get(e) || 0) + 1);
      }
      if(!cuenta.size) continue;
      /* En empate gana la etiqueta menor por orden alfabético: sin esa regla
         el resultado cambia entre corridas y el mapa se vuelve inservible. */
      let mejor = null, mas = -1;
      for(const [e, c] of [...cuenta].sort((x, y) => String(x[0]).localeCompare(String(y[0])))){
        if(c > mas){ mas = c; mejor = e; }
      }
      if(mejor && mejor !== etiqueta.get(id)){ etiqueta.set(id, mejor); movio = true; }
    }
    if(!movio) break;
  }

  const grupos = new Map();
  for(const id of orden){
    const e = etiqueta.get(id);
    if(!grupos.has(e)) grupos.set(e, []);
    grupos.get(e).push(id);
  }

  /* A cada comunidad se le pone de nombre el título de su nodo más conectado:
     un número no le dice nada a nadie. */
  const comunidades = [...grupos.entries()]
    .map(([_, ids]) => {
      const centro = ids.slice().sort((a, b) =>
        vecinasDe.get(b).length - vecinasDe.get(a).length || a.localeCompare(b))[0];
      return { centro, nombre: porId.get(centro).titulo, ids };
    })
    .sort((a, b) => b.ids.length - a.ids.length);

  comunidades.forEach((c, i) => c.ids.forEach(id => { porId.get(id).comunidad = i; }));

  return {
    enlaces,
    comunidades,
    grados: Object.fromEntries(neuronas.map(n => [n.id, vecinasDe.get(n.id).length])),
  };
}

/* ── armar ─────────────────────────────────────────────────────────────────
   Un solo archivo para servirlo y para que un agente lo baje de un jalón. */
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
`);
  }
}
