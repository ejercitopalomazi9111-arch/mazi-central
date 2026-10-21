/* ARMA EL VIDEO DE RADIO DIVERGENTES: pinta video.html cuadro por cuadro, le pone
   la voz (voz/NN.mp3, de voz.mjs), los efectos de fadori-campana/grabar/efectos.py
   y la música («Inspired», Kevin MacLeod, CC BY 4.0), y saca el MP4. La mezcla es
   la del comercial de Fadori: la voz al frente y la música agachándose con ella.

     MUSICA=<Inspired.mp3> SALIDA=<carpeta> node podcast/presentacion/video.mjs h|v
     PREVIA=15 …   → uno de cada 15 cuadros, para revisar

   La voz: Carlos, 21 de octubre, «usar mi voz». Sus notas de voz van en
   voz/NN.mp3 (o .m4a/.ogg/.wav, se convierten solas) y voz/credito.txt dice el
   nombre que sale en los créditos. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const AQUI = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(AQUI, '../..');
const F = process.argv[2] === 'v' ? 'v' : 'h', W = F === 'v' ? 1080 : 1920, H = F === 'v' ? 1920 : 1080;
const PREVIA = Number(process.env.PREVIA) || 0, FPS = 60;
const SAL = path.resolve(process.env.SALIDA || path.join(AQUI, 'salida')); fs.mkdirSync(SAL, { recursive: true });
const MUSICA = process.env.MUSICA, EF = path.join(REPO, 'fadori-campana', 'salida', 'audio');
/* el ffmpeg de imageio si está (trae libx264 seguro), y si no el del sistema */
let ff = 'ffmpeg';
try{ ff = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || ff; }catch(e){}
const dura = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

/* las notas de voz del teléfono llegan en m4a, ogg u opus: se pasan a mp3 sin silencio en las orillas */
for(let i = 1; i <= 10; i++){
  const n = String(i).padStart(2, '0'), otro = ['m4a', 'ogg', 'opus', 'wav', 'aac'].map(e => path.join(AQUI, 'voz', n + '.' + e)).find(f => fs.existsSync(f));
  if(otro) execFileSync(ff, ['-y', '-v', 'error', '-i', otro, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5', '-ar', '44100', '-ac', '1', '-b:a', '160k', path.join(AQUI, 'voz', n + '.mp3')]);
}
/* cuándo entra cada renglón: uno tras otro, con un respiro entre frases */
const TL = []; let t = 0.8, fin = 0;
for(let i = 1; i <= 10; i++){ TL.push(+t.toFixed(3)); const d = dura(path.join(AQUI, 'voz', String(i).padStart(2, '0') + '.mp3')); fin = t + d; t = fin + (i === 9 ? 0.7 : 0.45); }
const CRED = fs.existsSync(path.join(AQUI, 'voz', 'credito.txt')) ? fs.readFileSync(path.join(AQUI, 'voz', 'credito.txt'), 'utf8').trim() : '';

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: W, height: H } });
const errores = []; pg.on('pageerror', e => errores.push(e.message));
await pg.addInitScript(([tl, fin, cred]) => { window.TL = tl; window.FIN_VOZ = fin; window.CRED_VOZ = cred; }, [TL, fin, CRED]);
await pg.goto('file://' + path.join(AQUI, 'video.html') + '?f=' + F);
await pg.evaluate(() => window.listo);
const DUR = await pg.evaluate(() => window.DUR), SONIDOS = await pg.evaluate(() => window.SONIDOS);
const dir = path.join(SAL, (PREVIA ? 'previa-' : 'cuadros-') + F);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const total = Math.ceil(DUR * FPS);
for(let i = 0; i < total; i += PREVIA || 1){
  await pg.evaluate(t => window.pintar(t), i / FPS);
  await pg.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: PREVIA ? 80 : 92 });
}
await br.close();
if(errores.length){ console.log('✗ errores en la página:', errores.slice(0, 5)); process.exit(1); }
if(PREVIA){ console.log('✓ previa', F, '→', dir, '· voz', TL.map(x => x.toFixed(1)).join(' ')); process.exit(0); }
if(!MUSICA){ console.error('Falta MUSICA'); process.exit(1); }

const ent = ['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-i', MUSICA];
const fil = [], voces = [], efectos = [];
SONIDOS.forEach(([archivo, t, vol = 1], i) => {
  const esVoz = archivo.startsWith('voz/');
  ent.push('-i', esVoz ? path.join(AQUI, archivo) : path.join(EF, archivo));
  const ms = Math.max(0, Math.round(t * 1000)), et = 's' + i;
  fil.push(`[${i + 2}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${esVoz ? 1.0 : vol * 0.4}[${et}]`);
  (esVoz ? voces : efectos).push(`[${et}]`);
});
fil.push(`${voces.join('')}amix=inputs=${voces.length}:normalize=0,acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=2,apad=whole_dur=${DUR}[voz]`);
fil.push(`[voz]asplit=3[voz1][vozsc][vozfx]`);
fil.push(`${efectos.join('')}amix=inputs=${efectos.length}:normalize=0,apad=whole_dur=${DUR}[fx0]`);
fil.push(`[fx0][vozfx]sidechaincompress=threshold=0.02:ratio=4:attack=10:release=250[fx]`);
fil.push(`[1:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${DUR},afade=t=in:d=0.8,afade=t=out:st=${DUR - 3}:d=3,volume=0.22[mus]`);
fil.push(`[mus][vozsc]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=400[musb]`);
fil.push(`[voz1][fx][musb]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
const mp4 = path.join(SAL, `Radio-Divergentes-${F === 'v' ? 'vertical' : 'horizontal'}.mp4`);
execFileSync(ff, ['-y', '-v', 'error', ...ent, '-filter_complex', fil.join(';'), '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', '-t', String(DUR), mp4]);
console.log('✓', mp4, (fs.statSync(mp4).size / 1048576).toFixed(1) + ' MB ·', DUR.toFixed(1) + ' s');
