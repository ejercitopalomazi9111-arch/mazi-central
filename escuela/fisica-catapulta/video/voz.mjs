/* La voz del video: cada renglón de voz/lineas.tsv → voz/NN.mp3 con ElevenLabs
   (Liam, multilingüe; la misma del video de Radio Divergentes). La llave NO va
   en el repo: ELEVENLABS_API_KEY=… node escuela/fisica-catapulta/video/voz.mjs [NN …] */
import fs from 'fs'; import path from 'path';
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'voz');
const LLAVE = process.env.ELEVENLABS_API_KEY, VOZ = process.env.VOZ_ID || 'TX3LPaxmHKxFdv7VOQHJ';
if(!LLAVE){ console.error('Falta ELEVENLABS_API_KEY'); process.exit(1); }
const solo = process.argv.slice(2);
/* los nombres del equipo no van en el repo: salen de ../equipo.txt (git lo ignora) */
const archivo = path.join(DIR, '..', '..', 'equipo.txt');
const nombres = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8').split('\n').map(n => n.trim()).filter(Boolean) : [];
const EQUIPO = nombres.length > 1 ? nombres.slice(0, -1).join(', ') + ' y ' + nombres.at(-1) : nombres.join('');
for(const renglon of fs.readFileSync(path.join(DIR, 'lineas.tsv'), 'utf8').trim().split('\n')){
  const [n, crudo] = renglon.split('\t');
  if(crudo.includes('{EQUIPO}') && !EQUIPO) continue;
  const texto = crudo.replace('{EQUIPO}', EQUIPO);
  if(solo.length && !solo.includes(n)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': LLAVE, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true } }),
  });
  if(!r.ok){ console.error(n, r.status, (await r.text()).slice(0, 200)); process.exit(1); }
  fs.writeFileSync(path.join(DIR, n + '.mp3'), Buffer.from(await r.arrayBuffer()));
  console.log('✓', n);
}
