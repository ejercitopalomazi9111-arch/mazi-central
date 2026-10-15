/* ARMA EL COMERCIAL v3: pinta fadori-campana/comercial.html cuadro por cuadro
   (con las grabaciones de la app y de la tele adentro), mezcla la voz, los
   efectos y la música —que se agacha sola cuando habla la voz— y saca el MP4.

     node fadori-campana/grabar/comercial.mjs            → salida/Fadori-comercial-v3.mp4
     PREVIA=10 node fadori-campana/grabar/comercial.mjs  → sólo uno de cada 10 cuadros, para revisar con tiraje.py

   Antes: grabar/app.mjs (y con TEMA=oscuro), grabar/pantalla.mjs, la voz en
   salida/audio/voz/NN.mp3 y los efectos con grabar/efectos.py salida/audio */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), SAL = path.join(RAIZ, 'salida');
const PREVIA = Number(process.env.PREVIA) || 0, FPS = Number(process.env.FPS) || 60;   /* Carlos: «hazlo a 60fps» */
const ff = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

const cuadros = {};
for(const d of fs.readdirSync(path.join(SAL, 'rec'))) cuadros[d] = fs.readdirSync(path.join(SAL, 'rec', d)).filter(f => f.endsWith('.jpg')).length;
const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.addInitScript(c => { window.CUADROS = c; }, cuadros);
const errores = []; pg.on('pageerror', e => errores.push(e.message));
await pg.goto('file://' + path.join(RAIZ, 'comercial.html'));
await pg.evaluate(() => window.listo);
const DUR = await pg.evaluate(() => window.DUR), SONIDOS = await pg.evaluate(() => window.SONIDOS);
const dir = path.join(SAL, PREVIA ? 'previa-v3' : 'cuadros-v3');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const total = Math.ceil(DUR * FPS);
for(let i = 0; i < total; i += PREVIA || 1){
  await pg.evaluate(t => window.pintar(t), i / FPS);
  await pg.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: PREVIA ? 80 : 93 });
}
await br.close();
if(errores.length){ console.log('✗ errores en la página:', errores.slice(0, 5)); process.exit(1); }
if(PREVIA){ console.log('✓ previa: uno de cada', PREVIA, 'a', FPS, '→', path.relative(process.cwd(), dir)); process.exit(0); }

/* la mezcla: voz al frente, efectos debajo y la música agachándose con la voz */
const A = path.join(SAL, 'audio'), musica = path.join(SAL, 'Funky-Chunk.mp3');
const ent = ['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-i', musica];
const fil = [], voces = [], efectos = [];
SONIDOS.forEach(([archivo, t, vol = 1], i) => {
  ent.push('-i', path.join(A, archivo));
  const ms = Math.round(t * 1000), et = 's' + i;
  const esVoz = archivo.startsWith('voz/');
  fil.push(`[${i + 2}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${esVoz ? 1.0 : vol * 0.8}[${et}]`);
  (esVoz ? voces : efectos).push(`[${et}]`);
});
fil.push(`${voces.join('')}amix=inputs=${voces.length}:normalize=0,apad=whole_dur=${DUR}[voz]`);
fil.push(`[voz]asplit=2[voz1][vozsc]`);
fil.push(`${efectos.join('')}amix=inputs=${efectos.length}:normalize=0,apad=whole_dur=${DUR}[fx]`);
fil.push(`[1:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${DUR},afade=t=in:d=1.2,afade=t=out:st=${DUR - 3}:d=3,volume=0.55[mus]`);
fil.push(`[mus][vozsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[musb]`);
fil.push(`[voz1][fx][musb]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
const mp4 = path.join(SAL, 'Fadori-comercial-v3' + (FPS === 60 ? '-60fps' : '') + '.mp4');
execFileSync(ff, ['-y', '-v', 'error', ...ent, '-filter_complex', fil.join(';'), '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', String(DUR), mp4]);
console.log('✓', DUR.toFixed(1) + ' s →', path.relative(process.cwd(), mp4));
