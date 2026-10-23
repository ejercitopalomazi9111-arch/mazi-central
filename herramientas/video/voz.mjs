/* LA VOZ DE UN COMERCIAL: cada renglón de <carpeta>/lineas.tsv («NN<tab>texto»)
   → <carpeta>/NN.mp3 con ElevenLabs (Liam, multilingüe: las voces mexicanas
   piden plan de paga y dan 402). La llave NO va en el repo:
     ELEVENLABS_API_KEY=… node herramientas/video/voz.mjs <carpeta> [NN …] */
import fs from 'fs'; import path from 'path';
const [dir, ...solo] = process.argv.slice(2);
const LLAVE = process.env.ELEVENLABS_API_KEY, VOZ = process.env.VOZ_ID || 'TX3LPaxmHKxFdv7VOQHJ';
if(!LLAVE || !dir){ console.error('uso: ELEVENLABS_API_KEY=… node herramientas/video/voz.mjs <carpeta> [NN …]'); process.exit(1); }
for(const renglon of fs.readFileSync(path.join(dir, 'lineas.tsv'), 'utf8').trim().split('\n')){
  const [n, texto] = renglon.split('\t');
  if(solo.length && !solo.includes(n)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': LLAVE, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } }),
  });
  if(!r.ok){ console.error(n, r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  fs.writeFileSync(path.join(dir, n + '.mp3'), Buffer.from(await r.arrayBuffer()));
  console.log('✓', n);
}
