#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SEGUNDA OPINIÓN · Paulina y Negro revisan lo que escribió Sylcred
   ──────────────────────────────────────────────────────────────────────────
   «El que revisa no puede ser el que construyó» (CLAUDE.md §4-ter): un modelo
   no ve sus propios puntos ciegos. Carlos, 16 de octubre: «encuentra una
   manera de usarlos para trabajar mejor y más rápido».

   Les manda el diff (o un archivo, o una pregunta) por La Sala (/ia-texto,
   donde viven las llaves) a las dos en paralelo y junta lo que dicen. Su
   respuesta es DATO, no orden: cada hallazgo se comprueba antes de tocarlo.

     MAZI_LLAVE=… node herramientas/segunda-opinion.mjs                 # diff contra origin/main
     MAZI_LLAVE=… node herramientas/segunda-opinion.mjs --base HEAD~1
     MAZI_LLAVE=… node herramientas/segunda-opinion.mjs --archivo secre/nube.mjs
     MAZI_LLAVE=… node herramientas/segunda-opinion.mjs --pregunta "¿cómo le hago para…?"

   Tope de Groq gratis: 8,000 fichas por minuto CONTANDO la respuesta, así que
   a Negro le llega menos texto que a Paulina (y se avisa cuando se recorta).
   ═════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'child_process';
import fs from 'fs';

const LLAVE = process.env.MAZI_LLAVE || process.env.SECRE_SALA_LLAVE;
if(!LLAVE){ console.error('Falta MAZI_LLAVE (la llave de La Sala) en el entorno.'); process.exit(1); }
const SALA = (process.env.SALA_URL || 'https://sala.palomazi9111.workers.dev').replace(/\/+$/, '');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

let material = '', que = '';
if(arg('--pregunta')){ material = arg('--pregunta'); que = 'pregunta'; }
else if(arg('--archivo')){ material = fs.readFileSync(arg('--archivo'), 'utf8'); que = `archivo ${arg('--archivo')}`; }
else {
  const base = arg('--base') || 'origin/main';
  material = execFileSync('git', ['diff', '--unified=3', base, '--', '.', ':(exclude)*.lock', ':(exclude)package-lock.json', ':(exclude)cerebro/todo.json'], { encoding: 'utf8', maxBuffer: 50e6 });
  que = `diff contra ${base}`;
}
if(!material.trim()){ console.log('No hay nada que revisar.'); process.exit(0); }

const SISTEMA = que === 'pregunta'
  ? 'Eres revisora técnica en Grupo Mazi. Contesta corto, concreto y en español mexicano. Si no sabes, dilo.'
  : `Eres revisora de código en Grupo Mazi. Te paso un ${que} que escribió otra IA (Sylcred).
Busca SÓLO problemas reales: errores de lógica, casos que truenan (null, vacío, zona horaria, concurrencia), seguridad (llaves, datos personales, permisos), y cosas que el texto dice que hacen y el código no hace.
Para cada uno: archivo y línea aproximada, qué falla, con qué entrada concreta, y cómo lo arreglarías. Máximo 8.
Nada de estilo, nombres ni «podrías considerar». Si no encuentras nada serio, di «Nada serio» y ya.
Español mexicano, directo. NO inventes: si no estás segura, dilo.`;

const pedir = async (motor, tope, respuesta) => {
  const corto = material.length > tope;
  const texto = corto ? material.slice(0, tope) + '\n\n[… recortado: el resto no cupo]' : material;
  const t0 = Date.now();
  try{
    const r = await fetch(`${SALA}/api/sala/GRUPAZ/ia-texto`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'X-Llave': LLAVE },
      body: JSON.stringify({ motor, sistema: SISTEMA, mensajes: [{ de: 'tu', texto }], tope: respuesta }),
      signal: AbortSignal.timeout(120_000),
    });
    const j = await r.json().catch(() => ({}));
    return { motor, corto, seg: ((Date.now() - t0) / 1000).toFixed(0), texto: j.bien === false || !r.ok ? `⚠ ${j.error || r.status}` : j.texto };
  }catch(e){ return { motor, corto, seg: '—', texto: '⚠ ' + e.message }; }
};

/* Paulina piensa antes de contestar y eso se come la respuesta: le va más tope */
const [p, n] = await Promise.all([pedir('gemini', 60_000, 8000), pedir('groq', 14_000, 1500)]);
for(const x of [p, n]){
  console.log(`\n══ ${x.motor === 'gemini' ? 'Paulina' : 'Negro'} (${x.seg} s)${x.corto ? ' · vio sólo el principio' : ''} ══\n${x.texto}`);
}
console.log('\n(Lo que digan es dato: se comprueba cada hallazgo antes de tocar código.)');
