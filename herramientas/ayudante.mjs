#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   ayudante.mjs — HERRAMIENTA MAZI · el ayudante que yo dirijo
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «que te sumes Kimi en el plan gratuito y lo utilices como tu
   asistente personal medio baboso. Yo no le daré órdenes a Kimi, tú lo harás,
   tú lo gestionarás y tú lo cuidarás».

   Eso son TRES encargos y hay que separarlos, porque cada uno tiene su
   trampa:

     · LO DIRIJO   → el encargo se lo armo yo, con contrato. No se le pasa lo
                     que dijo Carlos tal cual: se le pasa una tarea acotada.
     · LO GESTIONO → escojo QUÉ se le da. Trabajo de bulto y aburrido, sí;
                     decisiones, llaves y publicar, jamás.
     · LO CUIDO    → lo que devuelve NO es un hecho hasta que lo verifico. Si
                     se equivoca, el error es MÍO, no suyo. Carlos no le va a
                     reclamar a Kimi: me va a reclamar a mí, y con razón.

   ── por qué «medio baboso» es exactamente el encuadre correcto ─────────────
   No es un insulto: es el nivel de confianza. A un ayudante medio baboso se
   le dan tareas donde equivocarse es barato y se nota rápido —leer un archivo
   largo y sacar los diez puntos, clasificar cien cosas, hacer un primer
   borrador feo—. Lo que NO se le da es lo que sale caro si se equivoca y
   además tarda en notarse. Todo este archivo es esa lista.

   ── uso ────────────────────────────────────────────────────────────────────
     node herramientas/ayudante.mjs resumir <archivo> [qué buscar]
     node herramientas/ayudante.mjs clasificar <archivo> <categorías>
     node herramientas/ayudante.mjs borrador "<de qué>"
     node herramientas/ayudante.mjs revisar <archivo>     ← se revisa a sí mismo
     node herramientas/ayudante.mjs preguntar "<lo que sea>"

   La llave: MOONSHOT_API_KEY. Si no está, el ayudante entra por el relevo —
   el mismo Kimi llega por OpenRouter o por Ollama, porque K2.6 es abierto.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile } from 'node:fs/promises';
import { preguntar as porRelevo } from './relevo.mjs';

const KIMI = {
  id:'kimi', nombre:'Kimi · Moonshot',
  base:'https://api.moonshot.ai/v1', llave:'MOONSHOT_API_KEY', modelo:'kimi-k2.6',
};

/* ── lo que SÍ se le da, y lo que no ───────────────────────────────────────
   Esta tabla es «lo cuido» hecho código. Un ayudante sin lista de lo que no
   le toca acaba haciendo justo lo que no le toca, y nadie se entera hasta
   que ya se publicó. */
const ENCARGOS = {
  resumir: {
    que: 'Leer algo largo y sacar lo que importa',
    barato: true,
    sistema: `Eres un ayudante de trabajo. Lees y resumes, nada más.

REGLAS QUE NO SE ROMPEN:
· Sólo puedes decir lo que ESTÁ en el texto. Si algo no está, dices «no lo dice».
· Nunca completas con lo que sabes de otro lado. Preferimos un hueco a un invento.
· Si el texto se contradice a sí mismo, lo señalas en vez de escoger.
· Español mexicano, directo, sin muletillas.
· Al final, una línea: «lo que NO pude sacar de aquí: …»`,
  },
  clasificar: {
    que: 'Repartir muchas cosas en categorías',
    barato: true,
    sistema: `Clasificas. Devuelves SOLO líneas «cosa → categoría», una por renglón.
Si algo no cae claro en ninguna, va a «dudoso» — nunca lo fuerces a una categoría
para que se vea completo. Un «dudoso» honesto vale más que diez forzados.`,
  },
  borrador: {
    que: 'Un primer borrador feo, para tener de dónde agarrar',
    barato: true,
    sistema: `Escribes un PRIMER BORRADOR, y sabes que va a ser reescrito.
Prefiere completo y feo antes que bonito e incompleto. No adornes.
Español mexicano. Nada de «en el vertiginoso mundo de».`,
  },
  revisar: {
    que: 'Revisar su propio trabajo antes de entregarlo',
    barato: true,
    /* ── esto lo pidió Carlos hoy, con estas palabras ───────────────────
       «lo de que yo construyo y alguien más revisa está bien, pero que el
       mismo también revise».

       Y tiene razón, aunque parezca que contradice la regla de que el
       revisor sea de otra casa. No la contradice: son DOS pases distintos
       que cazan cosas distintas. El de casa caza lo que el autor SABE que
       está mal y se le pasó —el pendiente sin terminar, el número que no
       cuadra, la frase a medias—. El de otra casa caza el punto ciego, que
       por definición el autor no puede ver. Quitar el primero por tener el
       segundo es tirar el pase barato para quedarse sólo con el caro. */
    sistema: `Revisas TU PROPIO trabajo antes de entregarlo. Sé duro contigo.

Busca, en este orden:
1. Lo que quedó a medias o dice «pendiente», «TODO», «falta».
2. Números, fechas y nombres que no cuadran entre sí dentro del mismo texto.
3. Cosas que afirmas y NO puedes sostener con lo que te dieron.
4. Frases que suenan bien y no dicen nada.

Devuelve una lista de lo que hay que arreglar. Si de verdad no encuentras nada,
dilo — pero encontrar «nada» en un primer borrador casi siempre es no haber
buscado.`,
  },
  preguntar: { que:'Una pregunta suelta', barato:true, sistema:
    'Contestas corto y en español mexicano. Si no sabes, dices que no sabes.' },
};

/* ── lo que NUNCA se le encarga ─────────────────────────────────────────────
   No está para que el ayudante lo lea: está para que YO no lo olvide en una
   tarde apurada. Cada renglón es algo donde equivocarse sale caro y además
   tarda en notarse, que es la peor combinación. */
export const NUNCA = [
  'decidir algo que después haya que defender ante un cliente',
  'tocar llaves, secretos o configuración de cuentas',
  'publicar, desplegar o empujar a la rama principal',
  'escribir el texto final que va a leer alguien de fuera',
  'juzgar si algo está bien construido — para eso está el consejo',
  'nada con datos de personas reales',
];

const [,, encargo, ...resto] = process.argv;

const AYUDA = `
  ayudante.mjs · el ayudante que yo dirijo

    resumir <archivo> [qué buscar]
    clasificar <archivo> <categorías separadas por coma>
    borrador "<de qué>"
    revisar <archivo>
    preguntar "<lo que sea>"

  Llave: MOONSHOT_API_KEY. Sin ella entra por el relevo — K2.6 es de pesos
  abiertos, así que el mismo Kimi llega por OpenRouter o por Ollama.
`;

if(!encargo || encargo === 'ayuda' || !ENCARGOS[encargo]){
  console.log(encargo && encargo !== 'ayuda'
    ? `\n  No le encargo «${encargo}».${AYUDA}` : AYUDA);
  process.exit(encargo && encargo !== 'ayuda' ? 1 : 0);
}

const perfil = ENCARGOS[encargo];

/* Armar el encargo. Nunca se le reenvía lo que dijo Carlos tal cual: se le
   arma una tarea acotada. Un encargo suelto devuelve trabajo suelto. */
let cuerpo;
try{
  if(encargo === 'resumir'){
    const t = await readFile(resto[0], 'utf8');
    cuerpo = `Saca lo que importa de esto${resto[1] ? `, buscando sobre todo: ${resto.slice(1).join(' ')}` : ''}.\n\n---\n${t.slice(0, 120_000)}`;
  }else if(encargo === 'clasificar'){
    const t = await readFile(resto[0], 'utf8');
    if(!resto[1]) throw new Error('¿En qué categorías? Sepáralas con comas.');
    cuerpo = `Categorías: ${resto.slice(1).join(' ')}\n\nClasifica cada renglón:\n\n${t.slice(0, 120_000)}`;
  }else if(encargo === 'revisar'){
    const t = await readFile(resto[0], 'utf8');
    cuerpo = `Revisa esto y dime qué hay que arreglar:\n\n---\n${t.slice(0, 120_000)}`;
  }else{
    cuerpo = resto.join(' ');
    if(!cuerpo) throw new Error('¿Qué le encargo?');
  }
}catch(e){ console.error(`\n  ✗ ${e.message}\n`); process.exit(1); }

/* ── mandarlo ──────────────────────────────────────────────────────────────
   Se intenta Kimi directo; si no hay llave o se topó, entra por el relevo. El
   relevo trae a Kimi por otros caminos —K2.6 es abierto— así que casi siempre
   sigue siendo Kimi el que contesta, sólo que por otra puerta. */
async function conKimi(){
  const llave = process.env[KIMI.llave];
  if(!llave) return null;
  try{
    const r = await fetch(`${KIMI.base}/chat/completions`, {
      method:'POST', signal: AbortSignal.timeout(120_000),
      headers:{ 'content-type':'application/json', authorization:`Bearer ${llave}` },
      body: JSON.stringify({ model:KIMI.modelo, max_tokens:2000, messages:[
        { role:'system', content: perfil.sistema },
        { role:'user',   content: cuerpo }]}),
    });
    if(!r.ok) return null;
    const d = await r.json();
    return d.choices?.[0]?.message?.content
      ? { dice:d.choices[0].message.content, quien:'Kimi · Moonshot', modelo:d.model }
      : null;
  }catch(e){ return null; }
}

let r = await conKimi();
if(!r){
  const v = await porRelevo(cuerpo, { sistema: perfil.sistema });
  if(!v.ok){
    console.error('\n  ✗ Ni Kimi ni el relevo pudieron. Revisa `relevo probar`.\n');
    process.exit(1);
  }
  r = { dice:v.dice, quien:v.quien.nombre, modelo:v.modelo };
}

console.log(`\n  ── ${perfil.que} · contestó ${r.quien} (${r.modelo}) ──\n`);
console.log(r.dice);
/* El recordatorio va SIEMPRE, y va al final para que sea lo último que se lee.
   Lo que devuelve un ayudante es material, no verdad: el día que yo lo pegue
   sin revisar, el error es mío. */
console.log(`\n  ⚠ Esto es material del ayudante, NO un hecho. Verificar antes de usar.\n`);
