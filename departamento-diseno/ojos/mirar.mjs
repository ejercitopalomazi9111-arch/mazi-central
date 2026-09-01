/* ══════════════════════════════════════════════════════════════════════════
   LOS OJOS · mirar imágenes sin gastarme a mí
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «trata de usar gemini para poder ver más imágenes gastando uso para
   eso, créate una skill y una herramienta».

   POR QUÉ HACE FALTA, que es la parte que no se ve: yo SÍ puedo mirar una
   imagen —de hecho los tres defectos que encontré hoy salieron de capturas y
   no de leer código—. Lo que no puedo es mirar CIENTOS: cada imagen que miro
   se paga del mismo saldo con el que pienso, y una tarde de referencias de
   diseño se lo come entero. Esto mueve ese gasto a un modelo aparte y me
   devuelve palabras, que sí puedo leer barato.

   Y por eso la herramienta devuelve DESCRIPCIÓN ESTRUCTURADA y no un «se ve
   bonito»: lo que sirve para escribir una neurona es «el titular pesa 72 px
   contra 16 del cuerpo, la sombra va desplazada 2 px sin difuminar, el fondo
   tiene grano», no un adjetivo.

   ── LA LLAVE ──────────────────────────────────────────────────────────────
   Sale de `GEMINI_LLAVE` en el entorno. NUNCA se escribe aquí ni en ningún
   archivo: este repo es público y tiene escaneo de secretos, y una llave
   commiteada está quemada aunque se borre en el commit siguiente — queda en
   el historial. Se pone como secret del repo (Settings → Secrets → Actions) o
   se exporta en la sesión.

     GEMINI_LLAVE=… node departamento-diseno/ojos/mirar.mjs captura.png "¿qué jerarquía tipográfica usa?"

   ⚠ SE LLAMA CON curl Y NO CON `fetch`. La salida a internet de este
   contenedor va por un proxy que `fetch` de Node no atraviesa —contesta 403
   «Host not in allowlist» contra sitios que curl trae sin problema—. Está
   medido, no supuesto.
   ═════════════════════════════════════════════════════════════════════════ */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const correr = promisify(execFile);

const MODELO = process.env.GEMINI_MODELO || 'gemini-2.0-flash';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

const TIPOS = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp',
                gif:'image/gif', bmp:'image/bmp', heic:'image/heic' };

/* Lo que se le pide SIEMPRE, además de la pregunta. Sin esto contesta como un
   crítico de arte; con esto contesta como alguien que va a reproducirlo. */
const ENCARGO = `Describe esta imagen como se la describirías a alguien que tiene que
RECONSTRUIRLA en código y no la va a ver nunca. Concreto y medible, en español.
Incluye, cuando aplique:
· la retícula y el ritmo (columnas, márgenes, aire entre bloques);
· la jerarquía tipográfica (tamaños relativos, pesos, contraste entre titular y cuerpo);
· la paleta: cuántos colores de verdad, cuál manda, dónde está el acento;
· la profundidad: sombras (difusas o duras, desplazadas o centradas), capas, superposición;
· el tratamiento de la imagen (recorte, grano, duotono, máscara);
· qué la hace verse cara o barata, y por qué;
· UN detalle que un principiante no habría puesto.
Si algo no se distingue, dilo — no lo adivines.`;

async function mirar(fuente, pregunta){
  const llave = process.env.GEMINI_LLAVE || process.env.GEMINI_API_KEY;
  if(!llave){
    console.error([
      'Falta la llave. No la pegues en el chat ni la escribas en un archivo.',
      '  1 · Sácala gratis en https://aistudio.google.com → «Get API key».',
      '  2 · Guárdala como secret del repo: Settings → Secrets and variables →',
      '      Actions → New repository secret, con el nombre GEMINI_LLAVE.',
      '  3 · Para probar aquí y ahora: GEMINI_LLAVE=… node …/mirar.mjs foto.png "…"',
    ].join('\n'));
    process.exit(2);
  }

  let datos, mime;
  if(/^https?:\/\//.test(fuente)){
    const tmp = join(tmpdir(), 'ojos-' + Date.now());
    await correr('curl', ['-sS', '-L', '--max-time', '30', '-o', tmp, fuente]);
    datos = await readFile(tmp, 'base64');
    await unlink(tmp).catch(() => {});
    mime = TIPOS[(fuente.split('.').pop() || '').toLowerCase().replace(/\?.*/, '')] || 'image/png';
  }else{
    datos = await readFile(fuente, 'base64');
    mime = TIPOS[(fuente.split('.').pop() || '').toLowerCase()] || 'image/png';
  }

  const cuerpo = { contents: [{ parts: [
    { text: ENCARGO + (pregunta ? `\n\nY contesta además, específicamente: ${pregunta}` : '') },
    { inline_data: { mime_type: mime, data: datos } },
  ] }] };

  /* El cuerpo va por ARCHIVO y no por argumento: una imagen en base64 pasa de
     largo el tope de longitud de la línea de comandos, y el fallo que da es
     «Argument list too long», que no se parece en nada a la causa. */
  const tmpj = join(tmpdir(), 'ojos-' + Date.now() + '.json');
  await writeFile(tmpj, JSON.stringify(cuerpo));
  try{
    const { stdout } = await correr('curl', [
      '-sS', '--max-time', '120', '-X', 'POST',
      `${API}/${MODELO}:generateContent`,
      '-H', 'content-type: application/json',
      /* La llave va en cabecera y no en la URL: las URLs se quedan en logs de
         proxy y en historiales de shell. */
      '-H', `x-goog-api-key: ${llave}`,
      '--data-binary', '@' + tmpj,
    ], { maxBuffer: 40 * 1024 * 1024 });
    const r = JSON.parse(stdout);
    if(r.error){ console.error('Gemini dijo que no:', r.error.message); process.exit(1); }
    const texto = (r.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n');
    console.log(texto.trim() || '(contestó vacío)');
  } finally { await unlink(tmpj).catch(() => {}); }
}

const [fuente, ...resto] = process.argv.slice(2);
if(!fuente){
  console.log('uso: mirar.mjs <imagen.png | https://…> ["pregunta concreta"]');
  process.exit(2);
}
await mirar(fuente, resto.join(' '));
