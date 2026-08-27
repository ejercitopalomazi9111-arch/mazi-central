#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   relevo.mjs — HERRAMIENTA MAZI · que el trabajo no se pare
   ──────────────────────────────────────────────────────────────────────────
   Lo pidió Carlos así: «que otra IA te supla cuando se te acabe el uso, y que
   automáticamente se vaya cambiando cuando se queden sin uso, ya que son
   planes gratuitos todas menos tú».

   Es una carrera de relevos: el primero de la fila que conteste, trabaja.
   Cuando se topa con su límite se le apunta LA HORA A LA QUE VUELVE y le toca
   al siguiente. Nadie espera a un corredor que no va a volver hoy.

   ── por qué esto cumple LA REGLA, y no la rompe ────────────────────────────
   Seis proveedores de afuera, sí — pero ninguno manda. La fila, el criterio y
   el estado son NUESTROS, en `relevo/modelos.json` y en un archivo de estado.
   Si mañana Groq cierra su capa gratuita, se cambia un renglón del JSON y el
   negocio no se entera. Eso es «conectar sí, depender no».

   ── LO MÁS IMPORTANTE DE TODO EL ARCHIVO ───────────────────────────────────
   Distinguir «se acabó el uso» de «la llave está mal». Son la misma cara para
   el que no mira: los dos fallan y los dos te sacan de la fila. Pero si una
   llave con un dedazo se marca como «agotada hasta mañana», el relevo la
   esconde en silencio y Carlos se queda creyendo que se le acabó el saldo
   cuando lo que pasó es que sobra un espacio al copiar. Por eso hay una
   clasificación explícita y por eso las llaves malas GRITAN.

   ── uso ────────────────────────────────────────────────────────────────────
     node herramientas/relevo.mjs probar              a quién le sirve la llave
     node herramientas/relevo.mjs quien               a quién le toca ahorita
     node herramientas/relevo.mjs preguntar "…"       que conteste el que pueda
     node herramientas/relevo.mjs libre <id>          borra una marca a mano
     node herramientas/relevo.mjs olvidar             borra todas

   ── las llaves ─────────────────────────────────────────────────────────────
   Ninguna vive aquí ni en el repo, que es público. Cada proveedor dice en
   `modelos.json` cómo se llama SU variable de entorno. `probar` te dice cuáles
   faltan por nombre, sin que tengas que escribir ninguna en el chat.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI  = dirname(fileURLToPath(import.meta.url));
const RAIZ  = join(AQUI, '..');
/* Se pueden apuntar a otro lado por variable de entorno. No es un adorno de
   pruebas: es lo único que permite verificar el relevo COMPLETO sin tener una
   sola llave real, levantando proveedores falsos que fallan a propósito. Sin
   esto, la parte que de verdad importa —qué pasa cuando se topan— no se podría
   probar hasta el día que se tope de verdad, que es el peor día para
   descubrir un defecto. */
const LISTA = process.env.MAZI_RELEVO_LISTA || join(RAIZ, 'relevo', 'modelos.json');
/* El estado vive FUERA del repo: es de esta máquina y de este momento, no del
   proyecto. Commitear «Groq se topó a las 3 de la tarde» no le sirve a nadie
   y además chocaría entre máquinas. */
const ESTADO = process.env.MAZI_RELEVO_ESTADO || join(homedir(), '.mazi', 'relevo.json');

const ahora = () => Date.now();
const hora  = (t) => new Date(t).toLocaleTimeString('es-MX',
                       { hour:'2-digit', minute:'2-digit' });

/* ── el estado: quién está fuera y hasta cuándo ─────────────────────────── */
export async function leerEstado(){
  try{ return JSON.parse(await readFile(ESTADO, 'utf8')); }catch(e){ return {}; }
}
async function guardarEstado(e){
  await mkdir(dirname(ESTADO), { recursive:true });
  await writeFile(ESTADO, JSON.stringify(e, null, 2) + '\n');
}

/* ── clasificar por qué falló ───────────────────────────────────────────────
   Es el corazón. Cada rama contesta una pregunta distinta y las respuestas
   NO son intercambiables:

     agotado  → se acabó el uso. Vuelve a tal hora. Sáltalo y sigue.
     llave    → la llave falta o está mal. NO es agotamiento: se grita.
     config   → el modelo ya no existe. Tampoco es agotamiento: se arregla.
     caido    → el proveedor tiene un mal rato. Se reintenta pronto.

   Meter «llave» dentro de «agotado» es el error que vuelve inútil todo esto:
   el relevo seguiría funcionando —siempre hay otro corredor— y nadie se
   enteraría nunca de que una llave lleva meses mal escrita. */
const PALABRAS_TOPE = /quota|rate.?limit|exceeded|exhaust|too many|insufficient|limit reached|out of credit|billing/i;

export function clasificar(estatus, cuerpo, cabeceras){
  const t = String(cuerpo || '');

  if(estatus === 401 || estatus === 403){
    /* Ojo con el matiz: algunos proveedores devuelven 403 cuando se acaba el
       crédito, no cuando la llave está mal. Se mira el cuerpo antes de
       decidir, porque el número solo miente. */
    if(PALABRAS_TOPE.test(t)) return { clase:'agotado', espera: horas(12) };
    return { clase:'llave' };
  }
  if(estatus === 402) return { clase:'agotado', espera: horas(24) };
  if(estatus === 404 || estatus === 400){
    if(/model/i.test(t)) return { clase:'config' };
    return { clase:'config' };
  }
  if(estatus === 429){
    const esperaCabecera = desdeCabeceras(cabeceras);
    return { clase:'agotado', espera: esperaCabecera ?? horas(1) };
  }
  if(estatus >= 500) return { clase:'caido', espera: 2 * 60_000 };
  if(PALABRAS_TOPE.test(t)) return { clase:'agotado', espera: horas(1) };
  return { clase:'caido', espera: 60_000 };
}

const horas = (n) => n * 3600_000;

/* `Retry-After` puede venir en SEGUNDOS o como fecha HTTP — las dos formas son
   válidas y las dos se usan. Leer sólo una deja al relevo esperando de más o
   de menos según con quién le toque hablar. */
export function desdeCabeceras(cab){
  if(!cab) return null;
  const dame = (n) => (typeof cab.get === 'function' ? cab.get(n) : cab[n]) || null;

  const ra = dame('retry-after');
  if(ra){
    const seg = Number(ra);
    if(Number.isFinite(seg) && seg >= 0) return Math.min(seg * 1000, horas(24));
    const fecha = Date.parse(ra);
    if(!Number.isNaN(fecha)) return Math.max(0, Math.min(fecha - ahora(), horas(24)));
  }
  /* Groq y compañía mandan además cuánto falta para que se reinicie la
     ventana, en formatos como «7.66s» o «2m59.56s». */
  for(const n of ['x-ratelimit-reset-requests','x-ratelimit-reset-tokens']){
    const v = dame(n);
    if(!v) continue;
    const m = /(?:(\d+(?:\.\d+)?)m)?(\d+(?:\.\d+)?)s/.exec(String(v));
    if(m) return Math.round(((Number(m[1]) || 0) * 60 + Number(m[2])) * 1000);
    const seg = Number(v);
    if(Number.isFinite(seg)) return seg * 1000;
  }
  return null;
}

/* ── hablarle a un proveedor ────────────────────────────────────────────── */
async function llamar(prov, mensajes, { tiempo = 60_000, maxTokens = 900 } = {}){
  const llave = prov.llave ? process.env[prov.llave] : null;
  if(prov.llave && !llave) return { ok:false, clase:'llave', por:`falta ${prov.llave}` };

  const corte = AbortSignal.timeout(tiempo);
  const base = prov.base.replace(/\/$/, '');
  let r;
  try{
    r = await fetch(`${base}/chat/completions`, {
      method:'POST', signal: corte,
      headers: { 'content-type':'application/json',
                 ...(llave ? { authorization:`Bearer ${llave}` } : {}) },
      body: JSON.stringify({ model: prov.modelo, messages: mensajes,
                             max_tokens: maxTokens }),
    });
  }catch(e){
    /* Ollama apagado cae aquí, y es lo normal, no una falla. Se salta rápido. */
    return { ok:false, clase:'caido', por:e.name === 'TimeoutError'
      ? 'no contestó a tiempo' : 'no se pudo conectar', espera: 5 * 60_000 };
  }

  /* Leer el cuerpo también puede agotarse, y ese error caía FUERA del try:
     un solo proveedor lento tumbaba `probar` completo y dejaba sin revisar a
     los que venían después. Un revisor que se muere a la mitad es peor que no
     tenerlo, porque además miente sobre lo que alcanzó a ver. */
  let texto;
  try{ texto = await r.text(); }
  catch(e){ return { ok:false, clase:'caido', por:'se cortó al leer la respuesta',
                     espera: 5 * 60_000 }; }
  if(!r.ok){
    const c = clasificar(r.status, texto, r.headers);
    return { ok:false, ...c, por:`${r.status} · ${recorte(texto)}` };
  }
  try{
    const d = JSON.parse(texto);
    const m = d.choices?.[0]?.message || {};
    /* Algunos modelos de razonamiento dejan el texto en otro campo. Pedirle
       sólo `content` los daba por rotos estando bien. */
    const dice = m.content || m.reasoning_content || m.reasoning;
    if(!dice) return { ok:false, clase:'config',
      por: d.choices?.[0]?.finish_reason === 'length'
        ? 'se le acabó el cupo de tokens pensando — súbele maxTokens'
        : 'contestó sin contenido' };
    return { ok:true, dice, modelo: d.model || prov.modelo,
             gasto: d.usage || null };
  }catch(e){
    return { ok:false, clase:'config', por:'contestó algo que no es JSON' };
  }
}

const recorte = (t) => String(t).replace(/\s+/g, ' ').slice(0, 130);

/* ── avisar a La Sala ───────────────────────────────────────────────────────
   Se reusa `/estado`, que ya existe y ya publica un evento `limite` con la
   hora de regreso. Sin esto, el relevo cambia de corredor en silencio y nadie
   se entera de por qué de repente contesta otro modelo. */
async function avisarSala(prov, espera, clase){
  const S = (process.env.MAZI_SERVIDOR || '').replace(/\/$/, '');
  const sala = (process.env.MAZI_SALA || '').toUpperCase();
  const yo = process.env.MAZI_YO;
  if(!S || !sala || !yo) return;
  try{
    await fetch(`${S}/api/sala/${sala}/estado`, {
      method:'POST',
      headers:{ 'content-type':'application/json',
                ...(process.env.MAZI_LLAVE ? { 'X-Llave':process.env.MAZI_LLAVE } : {}) },
      body: JSON.stringify({ de:yo, estado:'topado', clase,
        reanuda: ahora() + espera,
        nota:`${prov.nombre} se topó. Le toca al siguiente de la fila.` }),
    });
  }catch(e){ /* un aviso que no sale NO puede tumbar el trabajo */ }
}

/* ── la fila ────────────────────────────────────────────────────────────── */
async function cargarFila(){
  const d = JSON.parse(await readFile(LISTA, 'utf8'));
  return d.proveedores;
}

export async function disponibles(){
  const fila = await cargarFila();
  const est = await leerEstado();
  return fila.map(p => {
    const m = est[p.id];
    const fuera = m && m.hasta > ahora();
    return { ...p, fuera, hasta: fuera ? m.hasta : null, motivo: fuera ? m.clase : null };
  });
}

async function marcar(id, clase, espera){
  const est = await leerEstado();
  est[id] = { clase, hasta: ahora() + espera, desde: ahora() };
  await guardarEstado(est);
}

/* ── preguntar: el relevo de verdad ─────────────────────────────────────── */
export async function preguntar(texto, { sistema } = {}){
  const mensajes = [
    ...(sistema ? [{ role:'system', content: sistema }] : []),
    { role:'user', content: texto },
  ];
  const fila = await disponibles();
  const saltados = [];

  for(const p of fila){
    if(p.fuera){
      saltados.push(`${p.nombre} (${p.motivo}, vuelve ${hora(p.hasta)})`);
      continue;
    }
    const r = await llamar(p, mensajes);
    if(r.ok) return { ok:true, quien:p, dice:r.dice, modelo:r.modelo,
                      gasto:r.gasto, saltados };

    if(r.clase === 'llave'){
      /* NO se marca como agotado: se grita y se sigue. Una llave mal escrita
         tiene que doler, no esconderse detrás del siguiente corredor. */
      saltados.push(`⚠ ${p.nombre}: ${r.por} — ESO NO ES FALTA DE USO, ES LA LLAVE`);
      continue;
    }
    if(r.clase === 'config'){
      saltados.push(`⚠ ${p.nombre}: ${r.por} — revisa el modelo en relevo/modelos.json`);
      continue;
    }
    const espera = r.espera ?? horas(1);
    await marcar(p.id, r.clase, espera);
    if(r.clase === 'agotado') await avisarSala(p, espera, 'uso');
    saltados.push(`${p.nombre}: ${r.por} · vuelve ${hora(ahora() + espera)}`);
  }
  return { ok:false, saltados };
}

/* ── probar: ¿a quién le sirve la llave HOY? ────────────────────────────── */
async function probar(){
  const fila = await cargarFila();
  const est = await leerEstado();
  console.log('');
  for(const p of fila){
    const marca = est[p.id];
    const fuera = marca && marca.hasta > ahora();
    process.stdout.write(`  ${p.nombre.padEnd(24)} `);
    if(p.llave && !process.env[p.llave]){
      console.log(`— falta la variable ${p.llave}`);
      continue;
    }
    /* 8 tokens NO alcanzan, y esto lo cazó Groq: los modelos que razonan
       gastan el cupo pensando y devuelven el contenido vacío. Mi prueba decía
       «contestó sin contenido» y el modelo estaba perfecto — el mal calibrado
       era el medidor. Con 300 hay espacio para que piense y conteste. */
    const r = await llamar(p, [{ role:'user', content:'Contesta solo: ok' }],
                           { tiempo:45_000, maxTokens:300 });
    if(r.ok) console.log(`✓ contesta · ${r.modelo}`);
    else if(r.clase === 'llave')  console.log(`✗ LA LLAVE ESTÁ MAL · ${r.por}`);
    else if(r.clase === 'config') console.log(`✗ configuración · ${r.por}`);
    else if(r.clase === 'agotado')console.log(`· sin uso · ${r.por}`);
    else console.log(`· no contesta · ${r.por}`);
    if(fuera) console.log(`      (marcado fuera hasta ${hora(marca.hasta)})`);
  }
  console.log('');
}

/* ── la puerta ─────────────────────────────────────────────────────────── */
const AYUDA = `
  relevo.mjs · que el trabajo no se pare

    probar               a quién le sirve la llave hoy
    quien                a quién le toca ahorita
    preguntar "…"        que conteste el que pueda
    libre <id>           borra la marca de uno
    olvidar              borra todas las marcas

  Las llaves van por variable de entorno, NUNCA en el repo.
  Cada proveedor dice cómo se llama la suya en relevo/modelos.json.
`;

const invocadoDirecto = process.argv[1] &&
  fileURLToPath(import.meta.url) === (await import('node:fs')).realpathSync(process.argv[1]);
const [,, orden, ...resto] = process.argv;
if(invocadoDirecto) try{
  if(orden === 'probar') await probar();

  else if(orden === 'quien'){
    const fila = await disponibles();
    console.log('');
    for(const p of fila){
      const falta = p.llave && !process.env[p.llave];
      console.log(`  ${p.fuera ? '·' : falta ? '—' : '▸'} ${p.nombre.padEnd(24)}` +
        (p.fuera ? `fuera hasta ${hora(p.hasta)} (${p.motivo})`
         : falta  ? `falta ${p.llave}` : 'listo'));
    }
    const toca = fila.find(p => !p.fuera && !(p.llave && !process.env[p.llave]));
    console.log(`\n  Le toca a: ${toca ? toca.nombre : 'NADIE — todos fuera o sin llave'}\n`);
  }

  else if(orden === 'preguntar'){
    const q = resto.join(' ');
    if(!q) throw new Error('¿Qué le pregunto?');
    const r = await preguntar(q);
    if(r.saltados.length){
      console.log('');
      for(const s of r.saltados) console.log(`  ↷ ${s}`);
    }
    if(!r.ok){ console.error('\n  ✗ Nadie pudo contestar.\n'); process.exit(1); }
    console.log(`\n  ── contestó ${r.quien.nombre} · ${r.modelo} ──\n`);
    console.log(r.dice + '\n');
  }

  else if(orden === 'libre'){
    const est = await leerEstado();
    if(!resto[0]) throw new Error('¿A cuál le quito la marca?');
    delete est[resto[0]];
    await guardarEstado(est);
    console.log(`\n  ✓ ${resto[0]} vuelve a la fila\n`);
  }

  else if(orden === 'olvidar'){ await guardarEstado({}); console.log('\n  ✓ todas de vuelta a la fila\n'); }

  else if(orden && orden !== 'ayuda'){ console.log(`\n  No conozco «${orden}».${AYUDA}`); process.exit(1); }
  else console.log(AYUDA);
}catch(e){
  console.error(`\n  ✗ ${e.message}\n`);
  process.exit(1);
}
