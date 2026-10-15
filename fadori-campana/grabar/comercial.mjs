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

/* la cortinilla de la app, copiada de fadori/estilo.css para que el comercial la
   pinte en grande con el CSS de verdad (si cambia en la app, cambia aquí) */
{
  const css = fs.readFileSync(path.join(RAIZ, '..', 'fadori', 'estilo.css'), 'utf8');
  const tramo = (de, a) => { const i = css.indexOf(de), j = css.indexOf(a, i); if(i < 0 || j < 0) throw new Error('no encontré ' + de + ' en estilo.css'); return css.slice(i, j); };
  fs.writeFileSync(path.join(RAIZ, 'grabar', 'cortinilla.css'), '/* GENERADO por grabar/comercial.mjs desde fadori/estilo.css: no se edita a mano */\n' +
    tramo('.cortinilla{', '/* ── La página de instalar') + tramo('.burger{', '@media (prefers-reduced-motion: reduce){\n  .cortinilla'));
}
const cuadros = {};
for(const d of fs.readdirSync(path.join(SAL, 'rec'))) cuadros[d] = fs.readdirSync(path.join(SAL, 'rec', d)).filter(f => f.endsWith('.jpg')).length;
const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.addInitScript(c => { window.CUADROS = c; }, cuadros);
const errores = []; pg.on('pageerror', e => errores.push(e.message));
await pg.goto('file://' + path.join(RAIZ, 'comercial.html'));
await pg.evaluate(() => window.listo);
const DUR = await pg.evaluate(() => window.DUR);
let SONIDOS = await pg.evaluate(() => window.SONIDOS);
/* OTRA VOZ (Carlos: «dame 2 nuevas versiones con voces distintas»): VOZ=voz-sarah
   usa salida/audio/voz-sarah/NN.mp3, con su tiempos.json (cuándo entra cada frase,
   alineada a la palabra clave) y su palabras.json (cuándo sale cada palabra de los
   letreros). El video es el mismo: sólo se vuelven a pintar los tramos con letreros
   que siguen a la voz, sobre una copia enlazada de los cuadros de la versión base. */
const VOZ = process.env.VOZ || '';
const TRAMOS = [[7, 18.6], [23, 26.4], [44.4, 52.6]];
if(VOZ){
  const dv = path.join(SAL, 'audio', VOZ), T = JSON.parse(fs.readFileSync(path.join(dv, 'tiempos.json'), 'utf8'));
  SONIDOS = SONIDOS.map(([a, t, v]) => a.startsWith('voz/') ? [VOZ + '/' + a.slice(4), T[a.slice(4, 6)] ?? t, v] : [a, t, v]);
  await pg.evaluate(p => { window.PALABRAS = p; }, JSON.parse(fs.readFileSync(path.join(dv, 'palabras.json'), 'utf8')));
}
const dir = path.join(SAL, PREVIA ? 'previa-v3' : 'cuadros-v3' + (VOZ ? '-' + VOZ : ''));
const total = Math.ceil(DUR * FPS);
const DESDE = Number(process.env.DESDE) || 0, HASTA = Number(process.env.HASTA) || DUR;   /* para revisar un tramo */
const SOLOAUDIO = !!process.env.SOLOAUDIO;     /* rehace sólo la mezcla con los cuadros que ya están */
if(!SOLOAUDIO && VOZ && !PREVIA){
  /* copia enlazada (no ocupa disco) y se repintan sólo los tramos con letreros;
     cada cuadro se BORRA antes de escribirlo para no tocar el de la versión base */
  if(!fs.existsSync(dir)) execFileSync('cp', ['-al', path.join(SAL, 'cuadros-v3'), dir]);
  for(const [a, b] of TRAMOS) for(let i = Math.round(a * FPS); i < Math.min(total, b * FPS); i++){
    const f = path.join(dir, String(i).padStart(5, '0') + '.jpg');
    await pg.evaluate(t => window.pintar(t), i / FPS);
    fs.rmSync(f, { force: true });
    await pg.screenshot({ path: f, type: 'jpeg', quality: 93 });
  }
} else if(!SOLOAUDIO){
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for(let i = PREVIA ? Math.round(DESDE * FPS) : 0; i < (PREVIA ? Math.min(total, HASTA * FPS) : total); i += PREVIA || 1){
    await pg.evaluate(t => window.pintar(t), i / FPS);
    await pg.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: PREVIA ? 80 : 93 });
  }
}
await br.close();
if(errores.length){ console.log('✗ errores en la página:', errores.slice(0, 5)); process.exit(1); }
if(PREVIA){ console.log('✓ previa: uno de cada', PREVIA, 'a', FPS, '→', path.relative(process.cwd(), dir)); process.exit(0); }

/* LA MEZCLA: la voz al frente, los efectos debajo y la música agachándose con la voz.
   Carlos, 15 de octubre: «la música y efectos suelen estar más fuertes que la voz».
   Los niveles están medidos con grabar/medir-mezcla.py: debajo de cada frase la
   cama (música + efectos) queda al menos 12 dB por debajo de la voz. */
const NIVEL = { musica: Number(process.env.NIVEL_MUSICA) || 0.24, efectos: Number(process.env.NIVEL_EFECTOS) || 0.4 };
const A = path.join(SAL, 'audio'), musica = path.join(SAL, 'Funky-Chunk.mp3');
const ent = ['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-i', musica];
const fil = [], voces = [], efectos = [];
SONIDOS.forEach(([archivo, t, vol = 1], i) => {
  ent.push('-i', path.join(A, archivo));
  const ms = Math.round(t * 1000), et = 's' + i;
  const esVoz = /^voz(-[\w-]+)?\//.test(archivo);     /* voz/ o voz-<otra>/ */
  fil.push(`[${i + 2}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${esVoz ? 1.0 : vol * NIVEL.efectos}[${et}]`);
  (esVoz ? voces : efectos).push(`[${et}]`);
});
/* la voz, comprimida para que se oiga pareja y presente aun en la bocina del teléfono */
fil.push(`${voces.join('')}amix=inputs=${voces.length}:normalize=0,acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=2,apad=whole_dur=${DUR}[voz]`);
fil.push(`[voz]asplit=3[voz1][vozsc][vozfx]`);
fil.push(`${efectos.join('')}amix=inputs=${efectos.length}:normalize=0,apad=whole_dur=${DUR}[fx0]`);
fil.push(`[fx0][vozfx]sidechaincompress=threshold=0.02:ratio=4:attack=10:release=250[fx]`);
fil.push(`[1:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${DUR},afade=t=in:d=1.2,afade=t=out:st=${DUR - 3}:d=3,volume=${NIVEL.musica}[mus]`);
fil.push(`[mus][vozsc]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=400[musb]`);
if(process.env.MEDIR){
  /* las tres pistas por separado, sin la normalización final, para medir cuánto sobresale la voz */
  fil.push('[voz1]anull[mv]', '[fx]anull[mf]', '[musb]anull[mm]');
  const m = path.join(SAL, 'mezcla');
  fs.mkdirSync(m, { recursive: true });
  execFileSync(ff, ['-y', '-v', 'error', ...ent, '-filter_complex', fil.join(';'),
    '-map', '[mv]', path.join(m, 'voz.wav'), '-map', '[mf]', path.join(m, 'efectos.wav'), '-map', '[mm]', path.join(m, 'musica.wav')]);
  console.log('✓ pistas en', path.relative(process.cwd(), m)); process.exit(0);
}
fil.push(`[voz1][fx][musb]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
const mp4 = path.join(SAL, 'Fadori-comercial-v3' + (FPS === 60 ? '-60fps' : '') + (VOZ ? '-' + VOZ : '') + '.mp4');
execFileSync(ff, ['-y', '-v', 'error', ...ent, '-filter_complex', fil.join(';'), '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', '-t', String(DUR), mp4]);
console.log('✓', DUR.toFixed(1) + ' s →', path.relative(process.cwd(), mp4));

/* la copia para mandar por el chat (tope de 30 MB): dos pasadas al bitrate que cabe,
   mismo 1080p y mismos cuadros; el audio, AAC estéreo 44.1 kHz, el que el iPhone lee siempre */
const chico = path.join(SAL, 'Fadori-comercial-para-mandar' + (VOZ ? '-' + VOZ : '') + '.mp4'), kbps = Math.floor((27.5 * 8192) / DUR) - 160;
const log = path.join(SAL, 'dospasadas' + (VOZ ? '-' + VOZ : ''));
execFileSync(ff, ['-y', '-v', 'error', '-i', mp4, '-c:v', 'libx264', '-preset', 'slow', '-b:v', kbps + 'k', '-pass', '1', '-passlogfile', log, '-an', '-f', 'mp4', '/dev/null']);
execFileSync(ff, ['-y', '-v', 'error', '-i', mp4, '-c:v', 'libx264', '-preset', 'slow', '-b:v', kbps + 'k', '-maxrate', Math.round(kbps * 1.6) + 'k', '-bufsize', Math.round(kbps * 2) + 'k',
  '-pass', '2', '-passlogfile', log, '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', chico]);
console.log('✓ para mandar:', (fs.statSync(chico).size / 1048576).toFixed(1) + ' MB →', path.relative(process.cwd(), chico));
