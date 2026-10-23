/* ARMA UN COMERCIAL: pinta una composición HTML cuadro por cuadro y le pone el
   audio. Es el motor del comercial de Fadori hecho de uso general, para los
   comerciales de los clientes y los de Grupo Mazi.

     node herramientas/video/armar.mjs <composicion.html> <salida.mp4>
     PREVIA=12 node …     → sólo uno de cada 12 cuadros, en <salida>-previa/, para revisar
     DESDE=8 HASTA=12 …   → con PREVIA, sólo ese tramo

   La composición define:
     window.VIDEO = { w, h, fps, dur,
       musica:  { archivo, desde, vol },            // desde: en qué segundo de la canción arranca
       sonidos: [[archivo, t, vol, 'voz'|'fx'], …] } // rutas relativas a la composición o absolutas
     window.pintar(t)  → deja la pantalla como va en el segundo t (puede ser async)
     window.listo      → promesa: letra e imágenes cargadas

   LA MEZCLA, igual que la de Fadori (medida ahí con medir-mezcla.py): la voz al
   frente y comprimida, los efectos debajo y la música agachándose sola cuando
   hay voz; todo normalizado a −14 LUFS, el nivel de las redes. Sale además una
   copia de menos de 28 MB para mandar por WhatsApp. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
import { red } from './red.mjs';
const [html, salida] = process.argv.slice(2).map(p => path.resolve(p));
if(!html || !salida){ console.error('uso: node herramientas/video/armar.mjs composicion.html salida.mp4'); process.exit(1); }
const PREVIA = Number(process.env.PREVIA) || 0, BASE = process.env.BASE || 'http://localhost:8765';
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ff = 'ffmpeg';

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await br.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await red(ctx);
const pg = await ctx.newPage();
const errores = []; pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => { if(m.type() === 'error') errores.push(m.text()); });
/* se abre por el servidor local para que lea los cuadros de las grabaciones y las fotos del repo */
await pg.goto(BASE + '/' + path.relative(RAIZ, html).split(path.sep).join('/'), { waitUntil: 'load' });
await pg.evaluate(() => window.listo);
const V = await pg.evaluate(() => window.VIDEO);
await pg.setViewportSize({ width: V.w, height: V.h });
const FPS = V.fps || 60, total = Math.ceil(V.dur * FPS);
const dir = salida.replace(/\.mp4$/, '') + (PREVIA ? '-previa' : '-cuadros');
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const DESDE = Number(process.env.DESDE) || 0, HASTA = Number(process.env.HASTA) || V.dur;
const t0 = Date.now();
for(let i = PREVIA ? Math.round(DESDE * FPS) : 0; i < (PREVIA ? Math.min(total, HASTA * FPS) : total); i += PREVIA || 1){
  await pg.evaluate(t => window.pintar(t), i / FPS);
  await pg.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: PREVIA ? 80 : 94 });
  if(!PREVIA && i % (FPS * 5) === 0) console.log('  ', (i / FPS).toFixed(0) + ' s de ' + V.dur.toFixed(0), '·', ((Date.now() - t0) / 1000).toFixed(0) + ' s');
}
await br.close();
if(errores.length){ console.log('✗ errores en la composición:', errores.slice(0, 5)); process.exit(1); }
if(PREVIA){ console.log('✓ previa → ' + path.relative(process.cwd(), dir)); process.exit(0); }

const donde = (a) => path.isAbsolute(a) ? a : path.join(path.dirname(html), a);
const ent = ['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg')], fil = [], voces = [], efectos = [];
let k = 1;
if(V.musica){ ent.push('-ss', String(V.musica.desde || 0), '-i', donde(V.musica.archivo)); k++; }
(V.sonidos || []).forEach(([a, t, vol = 1, tipo = 'fx'], i) => {
  ent.push('-i', donde(a));
  const ms = Math.max(0, Math.round(t * 1000)), et = 's' + i;
  fil.push(`[${k + i}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${vol}[${et}]`);
  (tipo === 'voz' ? voces : efectos).push(`[${et}]`);
});
const D = V.dur, capas = [];
if(voces.length){
  fil.push(`${voces.join('')}amix=inputs=${voces.length}:normalize=0,acompressor=threshold=0.1:ratio=3:attack=5:release=120:makeup=2,apad=whole_dur=${D}[voz]`);
  fil.push(`[voz]asplit=3[voz1][vozsc][vozfx]`); capas.push('[voz1]');
}
if(efectos.length){
  fil.push(`${efectos.join('')}amix=inputs=${efectos.length}:normalize=0,apad=whole_dur=${D}[fx0]`);
  fil.push(voces.length ? `[fx0][vozfx]sidechaincompress=threshold=0.02:ratio=4:attack=10:release=250[fx]` : `[fx0]anull[fx]`); capas.push('[fx]');
}
if(V.musica){
  const vm = V.musica.vol ?? 0.5, fin = V.musica.fin ?? 2.5;
  fil.push(`[1:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${D},afade=t=in:d=${V.musica.entrada ?? 0.05},afade=t=out:st=${D - fin}:d=${fin},volume=${vm}[mus0]`);
  fil.push(voces.length ? `[mus0][vozsc]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=400[mus]` : `[mus0]anull[mus]`); capas.push('[mus]');
}
fil.push(`${capas.join('')}amix=inputs=${capas.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
execFileSync(ff, ['-y', '-v', 'error', ...ent, '-filter_complex', fil.join(';'), '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', '-t', String(D), salida]);
console.log('✓', D.toFixed(1) + ' s →', path.relative(process.cwd(), salida), (fs.statSync(salida).size / 1048576).toFixed(1) + ' MB');

/* la copia para el chat: dos pasadas al bitrate que cabe en 27 MB (si el
   original ya cabe, la copia salía MÁS pesada: 26 MB contra 14.5) */
if(fs.statSync(salida).size < 27 * 1048576){ fs.rmSync(dir, { recursive: true, force: true }); console.log('✓ ya cabe en el chat tal cual'); process.exit(0); }
const chico = salida.replace(/\.mp4$/, '-para-mandar.mp4'), kbps = Math.min(12000, Math.floor((27 * 8192) / D) - 170), log = salida + '.log2p';
execFileSync(ff, ['-y', '-v', 'error', '-i', salida, '-c:v', 'libx264', '-preset', 'slow', '-b:v', kbps + 'k', '-pass', '1', '-passlogfile', log, '-an', '-f', 'mp4', '/dev/null']);
execFileSync(ff, ['-y', '-v', 'error', '-i', salida, '-c:v', 'libx264', '-preset', 'slow', '-b:v', kbps + 'k', '-maxrate', Math.round(kbps * 1.6) + 'k', '-bufsize', Math.round(kbps * 2) + 'k',
  '-pass', '2', '-passlogfile', log, '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', chico]);
for(const f of fs.readdirSync(path.dirname(salida))) if(f.startsWith(path.basename(log))) fs.rmSync(path.join(path.dirname(salida), f));
console.log('✓ para mandar:', (fs.statSync(chico).size / 1048576).toFixed(1) + ' MB →', path.relative(process.cwd(), chico));
fs.rmSync(dir, { recursive: true, force: true });
