/* ARMA EL COMERCIAL DE ALL'S FASHION: pinta herramientas/moda/comercial.html
   cuadro por cuadro, le pone la música (Funkorama, Kevin MacLeod, CC BY 4.0)
   y los efectos de fadori-campana/grabar/efectos.py, y saca el MP4.

     TRABAJO=<carpeta con web/ y Funkorama.mp3> node herramientas/moda/comercial.mjs h   → horizontal 1920×1080
     … comercial.mjs v                                                                    → vertical 1080×1920
     PREVIA=15 …                                                                          → uno de cada 15 cuadros, para revisar

   `web/` trae las fotos del banco de La Sala ya giradas y a 1600 px (N.jpg, con el
   número de la hoja de contacto) y logo-blanco.png / logo-negro.png. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(RAIZ, '../..');
const F = process.argv[2] === 'v' ? 'v' : 'h', W = F === 'v' ? 1080 : 1920, H = F === 'v' ? 1920 : 1080;
const TRABAJO = path.resolve(process.env.TRABAJO || path.join(RAIZ, 'trabajo'));
const PREVIA = Number(process.env.PREVIA) || 0, FPS = 60;
const SAL = path.join(TRABAJO, 'salida'); fs.mkdirSync(SAL, { recursive: true });

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: W, height: H } });
const errores = []; pg.on('pageerror', e => errores.push(e.message));
await pg.addInitScript(b => { window.FOTOS = b; }, 'file://' + path.join(TRABAJO, 'web') + '/');
await pg.goto('file://' + path.join(RAIZ, 'comercial.html') + '?f=' + F);
await pg.evaluate(() => window.listo);
const DUR = await pg.evaluate(() => window.DUR), SONIDOS = await pg.evaluate(() => window.SONIDOS);
/* que ninguna foto se haya quedado sin cargar: una foto rota se ve como un hueco gris */
const rotas = await pg.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
if(rotas.length){ console.log('✗ fotos que no cargaron:', rotas); process.exit(1); }

const dir = path.join(SAL, (PREVIA ? 'previa-' : 'cuadros-') + F);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const total = Math.ceil(DUR * FPS);
for(let i = 0; i < total; i += PREVIA || 1){
  await pg.evaluate(t => window.pintar(t), i / FPS);
  await pg.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: PREVIA ? 80 : 92 });
}
await br.close();
if(errores.length){ console.log('✗ errores en la página:', errores.slice(0, 5)); process.exit(1); }
if(PREVIA){ console.log('✓ previa', F, '→', dir); process.exit(0); }

/* la mezcla: la música con su salida suave y los efectos debajo, sin voz */
const EF = path.join(REPO, 'fadori-campana', 'salida', 'audio');
const ent = ['-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-i', path.join(TRABAJO, 'Funkorama.mp3')];
const fil = [`[1:a]atrim=0:${DUR.toFixed(3)},afade=t=out:st=${(DUR - 2.6).toFixed(3)}:d=2.6,volume=0.8[mus]`], ef = [];
SONIDOS.forEach(([archivo, t, vol], i) => {
  ent.push('-i', path.join(EF, archivo));
  const ms = Math.max(0, Math.round(t * 1000));
  fil.push(`[${i + 2}:a]adelay=${ms}|${ms},volume=${vol}[e${i}]`); ef.push(`[e${i}]`);
});
fil.push(`[mus]${ef.join('')}amix=inputs=${ef.length + 1}:normalize=0,alimiter=limit=0.89[a]`);
const sale = path.join(SAL, `Alls-comercial-${F === 'v' ? 'vertical' : 'horizontal'}.mp4`);
execFileSync('ffmpeg', ['-v', 'error', '-y', ...ent, '-filter_complex', fil.join(';'), '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-t', DUR.toFixed(3), sale], { stdio: 'inherit' });
console.log('✓', sale, (fs.statSync(sale).size / 1e6).toFixed(1), 'MB ·', DUR.toFixed(1), 's');
