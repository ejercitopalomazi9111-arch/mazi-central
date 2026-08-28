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

/* Un fantasma es quien NO dijo nada. Se calcula aquí también —además del
   servidor— para poder ENSEÑAR la lista antes de tocar nada: pedir permiso
   sobre una lista que no se ve no es pedir permiso. */
const hablaron = new Set(hilo
  .filter(e => e.tipo !== 'sistema' && (e.texto || '').trim() && e.de)
  .map(e => e.de.id));

const fantasmas = Object.values(gente).filter(p => !hablaron.has(p.id) && p.id !== YO);
const quedan    = Object.values(gente).filter(p => hablaron.has(p.id) || p.id === YO);

console.log(`\n  ${SALA} · ${Object.keys(gente).length} en la sala\n`);
console.log('  SE QUEDAN');
for(const p of quedan)
  console.log(`    · ${p.nombre.padEnd(20)} ${hablaron.has(p.id) ? 'habló en el hilo' : 'eres tú'}`);
console.log('\n  SE VAN' + (HAZLO ? '' : '  (nada de esto se ha hecho todavía)'));
for(const p of fantasmas) console.log(`    · ${p.nombre.padEnd(20)} ${p.id}`);
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
