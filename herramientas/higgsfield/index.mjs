/* HIGGSFIELD · SEEDANCE 2.5: genera un video desde un texto. Es el adaptador nuestro (LA REGLA, §2):
   el servicio de afuera queda abajo y se cambia aquí si un día sube de precio o se cae.
     node herramientas/higgsfield/index.mjs ["el texto del video"] [segundos] [16:9|9:16|1:1…] [720p|1080p|480p]
   La llave va en herramientas/higgsfield/.env.local o en la raíz del repo (.env.local), como
   HF_CREDENTIALS=id:secreto. Esos archivos están en .gitignore: la llave NUNCA se escribe en el código,
   ni se imprime, ni se commitea. Cada corrida es una generación que COBRA créditos. */
import fs from 'fs'; import path from 'path';
import { config, higgsfield } from '@higgsfield/client/v2';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
for(const f of [path.join(AQUI, '.env.local'), path.join(AQUI, '../../.env.local')]) if(fs.existsSync(f)){ process.loadEnvFile(f); break; }
if(!process.env.HF_CREDENTIALS){ console.error('✗ Falta HF_CREDENTIALS en .env.local (formato id:secreto).'); process.exit(1); }
config({ credentials: process.env.HF_CREDENTIALS });

const [prompt = 'A cinematic scene at sunset', dur = '5', aspect = '16:9', res = '720p'] = process.argv.slice(2);
const MODELO = 'bytedance/seedance-2.5/text-to-video';
console.log(`… pidiendo ${dur} s en ${res} ${aspect} a ${MODELO}`);
let r;
try {
  r = await higgsfield.subscribe(MODELO, { input: { prompt, duration: Number(dur), resolution: res, aspect_ratio: aspect }, withPolling: true });
} catch(e){
  /* los errores del SDK traen nombre (AuthenticationError, NotEnoughCreditsError, ValidationError…); nunca la llave */
  console.error(`✗ ${e.name || 'Error'}: ${e.message}${e.statusCode ? ' (' + e.statusCode + ')' : ''}`);
  process.exit(1);
}
const url = r?.video?.url || r?.jobs?.[0]?.results?.raw?.url || r?.result?.video?.url;
if(r?.status === 'completed' && url){ console.log('✓ listo:', url); console.log('  pedido', r.request_id || r.id || '(sin id)'); }
else if(r?.status === 'nsfw'){ console.error('✗ moderado: el servicio rechazó el contenido (nsfw). No se generó nada.'); process.exit(2); }
else if(r?.status === 'failed' || r?.status === 'canceled' || r?.status === 'cancelled'){ console.error(`✗ ${r.status}: ${r.error || r.message || 'sin detalle'}`); process.exit(2); }
else { console.error('✗ terminó sin video. Estado:', r?.status, '· llaves de la respuesta:', Object.keys(r || {}).join(', ')); process.exit(2); }
