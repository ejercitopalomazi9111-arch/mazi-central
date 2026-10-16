/* LA VOZ del video de Radio Divergentes: cada renglón de voz/lineas.tsv → voz/NN.mp3
   con ElevenLabs. La voz es Liam, la más parecida (medida) a la del primer
   comercial de Fadori. La llave NO va en el repo: se pasa por el entorno.
     ELEVENLABS_API_KEY=… node podcast/presentacion/voz.mjs [NN …] */
import fs from 'fs'; import path from 'path';
const AQUI = path.dirname(new URL(import.meta.url).pathname), DIR = path.join(AQUI, 'voz');
const LLAVE = process.env.ELEVENLABS_API_KEY, VOZ = process.env.VOZ_ID || 'TX3LPaxmHKxFdv7VOQHJ';
if(!LLAVE){ console.error('Falta ELEVENLABS_API_KEY'); process.exit(1); }
const solo = process.argv.slice(2);
for(const renglon of fs.readFileSync(path.join(DIR, 'lineas.tsv'), 'utf8').trim().split('\n')){
  const [n, texto] = renglon.split('\t');
  if(solo.length && !solo.includes(n)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': LLAVE, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } }),
  });
  if(!r.ok){ console.error(n, r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  fs.writeFileSync(path.join(DIR, n + '.mp3'), Buffer.from(await r.arrayBuffer()));
  console.log('✓', n, texto);
}
