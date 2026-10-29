/* LAS VOCES DE UN ANUNCIO: cada renglón de <dir>/guion.json → <dir>/voz/<id>.mp3 con ElevenLabs
   (multilingüe v2; las voces de la biblioteca piden plan de paga y dan 402, así que van de las de
   fábrica, una distinta por anuncio). Sólo pide los renglones cuyo texto o voz cambió: el saldo
   gratis es chico. Al final mide cuánto dura cada uno (voz/duraciones.json, lo lee motor.js).
     ELEVENLABS_API_KEY=… node marca/anuncios/voces.mjs marca/anuncios/<anuncio>
   La llave NO va en el repo. */
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { execFileSync } from 'child_process';
const dir = process.argv[2], LLAVE = process.env.ELEVENLABS_API_KEY;
if(!dir){ console.error('uso: ELEVENLABS_API_KEY=… node marca/anuncios/voces.mjs <dir>'); process.exit(1); }
/* PIPER: voz de código abierto que corre aquí mismo (pip install piper-tts; las voces en
   /tmp/claude-0/piper, de huggingface.co/rhasspy/piper-voices). En el guion la voz se escribe
   "piper:es_MX-claude-high". Es el respaldo cuando se acaba el saldo de ElevenLabs (y tiene acento
   mexicano); se oye más plana, así que se usa en videos enteros, no mezclada con otra. */
const PIPER = process.env.PIPER_DIR || '/tmp/claude-0/piper';
const g = JSON.parse(fs.readFileSync(path.join(dir, 'guion.json'), 'utf8')), vd = path.join(dir, 'voz');
fs.mkdirSync(vd, { recursive: true });
const hechas = fs.existsSync(path.join(vd, 'hechas.json')) ? JSON.parse(fs.readFileSync(path.join(vd, 'hechas.json'))) : {};
const dur = {};
let gastado = 0;
for(const l of g.lineas){
  const voz = g.voces[l.voz], texto = (l.dice || l.txt).replace(/\*/g, '');
  const ajustes = { stability: .42, similarity_boost: .8, style: .4, use_speaker_boost: true, ...(g.ajustes?.[l.voz] || {}), ...(l.ajustes || {}) };
  const tono = l.tono ?? g.tono?.[l.voz] ?? 0;                     // semitonos, sólo Piper (para que un personaje suene distinto)
  const firma = crypto.createHash('sha1').update(voz + texto + JSON.stringify(ajustes) + (tono ? 'tono' + tono : '') + ((l.lento ?? g.lento?.[l.voz]) ? 'lento' + (l.lento ?? g.lento?.[l.voz]) : '')).digest('hex');
  const mp3 = path.join(vd, l.id + '.mp3');
  if((hechas[l.id] !== firma || !fs.existsSync(mp3)) && voz.startsWith('piper:')){
    const wav = mp3.replace(/\.mp3$/, '.wav'), modelo = path.join(PIPER, voz.slice(6) + '.onnx');
    execFileSync('python3.13', ['-m', 'piper', '-m', modelo, '-f', wav, '--length-scale', String(l.lento ?? g.lento?.[l.voz] ?? 1), '--sentence-silence', '0.25'], { input: texto });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-af', (tono ? `rubberband=pitch=${Math.pow(2, tono / 12).toFixed(4)}:formant=preserved,` : '') + 'highpass=f=70,acompressor=threshold=0.12:ratio=2.5:attack=8:release=120,aresample=44100', '-ac', '2', '-b:a', '160k', mp3]);
    fs.rmSync(wav); hechas[l.id] = firma; console.log('✓', l.id, l.voz, '(piper)');
  }
  else if(hechas[l.id] !== firma || !fs.existsSync(mp3)){
    if(!LLAVE){ console.error('falta ELEVENLABS_API_KEY para', l.id); process.exit(1); }
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': LLAVE, 'content-type': 'application/json' },
      body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2', voice_settings: ajustes }) });
    if(!r.ok){ console.error('✗', l.id, r.status, (await r.text()).slice(0, 300)); fs.writeFileSync(path.join(vd, 'hechas.json'), JSON.stringify(hechas, null, 1)); process.exit(1); }
    fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer())); hechas[l.id] = firma; gastado += texto.length;
    console.log('✓', l.id, l.voz, texto.length, 'letras');
  }
  dur[l.id] = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim();
}
fs.writeFileSync(path.join(vd, 'hechas.json'), JSON.stringify(hechas, null, 1));
fs.writeFileSync(path.join(vd, 'duraciones.json'), JSON.stringify(dur, null, 1));
const total = Object.values(dur).reduce((a, b) => a + b, 0);
console.log(`✓ ${g.lineas.length} renglones · ${total.toFixed(1)} s de voz · ${gastado} letras gastadas ahora`);
