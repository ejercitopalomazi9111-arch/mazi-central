#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   barrer-fantasmas.mjs — quitar de una sala las identidades que sobran
   ──────────────────────────────────────────────────────────────────────────
   Lo pidió Carlos: «elimina a los viejos… con viejos hablo de Carlos clon y
   eso». En GRUPAZ quedaron varias identidades suyas y una llamada «Alguien»,
   todas nacidas del defecto de identidad que ya está arreglado. El arreglo
   impide que nazcan nuevas; no borra las que ya nacieron.

   ── ESTO BORRA EN UNA SALA VIVA ───────────────────────────────────────────
   Por eso: primero ENSEÑA lo que va a hacer y no hace nada. Sólo con
   `--hazlo` toca el servidor. Y aun así el servidor tiene la última palabra:
   rechaza a quien haya hablado y a quien esté conectado.

     node sala/barrer-fantasmas.mjs GRUPAZ --yo <tu-id>
     node sala/barrer-fantasmas.mjs GRUPAZ --yo <tu-id> --hazlo
   ═════════════════════════════════════════════════════════════════════════ */
const args = process.argv.slice(2);
const SALA = (args[0] || '').toUpperCase();
const dame = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const YO    = dame('--yo');
const HAZLO = args.includes('--hazlo');
const S = (dame('--servidor') || 'https://sala.palomazi9111.workers.dev').replace(/\/$/, '');
const LLAVE = dame('--llave') || process.env.MAZI_LLAVE || '';

if(!SALA || !YO){
  console.error('\n  Falta la sala o tu id.\n' +
                '  node sala/barrer-fantasmas.mjs GRUPAZ --yo web-carlos-xxxx [--hazlo]\n');
  process.exit(1);
}
const cab = { 'content-type':'application/json', ...(LLAVE ? { 'X-Llave':LLAVE } : {}) };

const r = await fetch(`${S}/api/sala/${SALA}/hilo`, { headers: cab });
if(!r.ok){ console.error(`\n  El servidor contestó ${r.status}\n`); process.exit(1); }
const { hilo = [], gente = {} } = await r.json();

/* ══ QUÉ CUENTA COMO FANTASMA ══════════════════════════════════════════════
   ⚠ LA PRIMERA VERSIÓN DE ESTO SE IBA A LLEVAR A LUIS. Decía «fantasma = el
   que no ha dicho nada», que suena razonable hasta que uno mira los datos:
   en GRUPAZ los únicos que habían escrito eran los dos Claude, así que esa
   regla marcaba para borrar a Carlos, a Luis y a todos. Callado no es
   fantasma — hay gente que entra a leer.

   Un fantasma es una identidad que SOBRA, y sobra por una de dos razones:
     · es un DUPLICADO — hay otra con el mismo nombre, y se conserva la que
       dio señales más recientemente, que es la que el teléfono sigue usando;
     · o se llama con el nombre de relleno que ponía el defecto («Alguien»),
       que nadie escribió nunca.
   Cualquier otra cosa se queda, aunque lleve semanas sin hablar.

   Y quien SÍ habló nunca entra a la lista, aunque esté duplicado: el hilo es
   un registro y quitarle el autor lo llena de huecos. El servidor lo vuelve
   a checar por su cuenta — esto es para poder ENSEÑAR la lista antes. */
const RELLENO = /^(alguien|invitado|an[oó]nimo|sin nombre)$/i;

const hablaron = new Set(hilo
  .filter(e => e.tipo !== 'sistema' && (e.texto || '').trim() && e.de)
  .map(e => e.de.id));

const normal = (n) => String(n || '').trim().toLowerCase();
const porNombre = new Map();
for(const p of Object.values(gente)){
  const k = normal(p.nombre);
  if(!porNombre.has(k)) porNombre.set(k, []);
  porNombre.get(k).push(p);
}
/* De cada nombre repetido sobrevive el más reciente. */
const sobrevive = new Set();
for(const [, lista] of porNombre){
  lista.sort((a, b) => (b.visto || 0) - (a.visto || 0));
  sobrevive.add(lista[0].id);
}

const porque = new Map();
for(const p of Object.values(gente)){
  if(hablaron.has(p.id) || p.id === YO) continue;
  if(RELLENO.test(normal(p.nombre)))      porque.set(p.id, 'nombre de relleno');
  else if(!sobrevive.has(p.id))           porque.set(p.id, 'duplicado de ' + p.nombre);
}
if(args.includes('--todos-los-mudos')){
  /* La regla vieja, tras una bandera larga y fea a propósito: quien la
     escriba que sepa lo que está pidiendo. */
  for(const p of Object.values(gente))
    if(!hablaron.has(p.id) && p.id !== YO && !porque.has(p.id))
      porque.set(p.id, 'no ha hablado (--todos-los-mudos)');
}

const fantasmas = Object.values(gente).filter(p => porque.has(p.id));
const quedan    = Object.values(gente).filter(p => !porque.has(p.id));

console.log(`\n  ${SALA} · ${Object.keys(gente).length} en la sala\n`);
console.log('  SE QUEDAN');
for(const p of quedan)
  console.log(`    · ${p.nombre.padEnd(20)} ${
    hablaron.has(p.id) ? 'habló en el hilo' : p.id === YO ? 'eres tú' : 'no sobra'}`);
console.log('\n  SE VAN' + (HAZLO ? '' : '  (nada de esto se ha hecho todavía)'));
for(const p of fantasmas)
  console.log(`    · ${p.nombre.padEnd(20)} ${porque.get(p.id).padEnd(22)} ${p.id}`);
if(!fantasmas.length) console.log('    (ninguno: la sala está limpia)');

if(!HAZLO){
  console.log('\n  Para hacerlo de verdad, repite con --hazlo\n');
  process.exit(0);
}

console.log('');
for(const p of fantasmas){
  const q = await fetch(`${S}/api/sala/${SALA}/echar`, {
    method:'POST', headers: cab,
    body: JSON.stringify({ de: YO, id: p.id, conRastro: true }),
  });
  const d = await q.json().catch(() => ({}));
  console.log(q.ok ? `  ✓ fuera ${p.nombre} (y ${d.rastro || 0} rastros)`
                   : `  ✗ ${p.nombre}: ${d.error || q.status}`);
}
console.log('');
