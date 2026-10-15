/* Pinta una página con pintar(t) cuadro por cuadro y la vuelve WebM.
     node fadori-campana/grabar/clip.mjs medios.html?que=ep salida.webm [seg] [fps]
   La página va relativa a esta carpeta y se abre con file://. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const [pagina, salida, segArg, fpsArg] = process.argv.slice(2);
const ff = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1280, height: 720 } });
await pg.goto('file://' + path.join(AQUI, pagina));
await pg.evaluate(() => window.listo);
const seg = Number(segArg) || await pg.evaluate(() => window.DUR), fps = Number(fpsArg) || 30;
const tmp = fs.mkdtempSync('/tmp/claude-0/clip-');
for(let i = 0; i < seg * fps; i++){
  await pg.evaluate(t => window.pintar(t), i / fps);
  await pg.screenshot({ path: path.join(tmp, String(i).padStart(5, '0') + '.jpg'), quality: 92, type: 'jpeg' });
}
await br.close();
execFileSync(ff, ['-y', '-v', 'error', '-framerate', String(fps), '-i', path.join(tmp, '%05d.jpg'), '-c:v', 'libvpx-vp9', '-b:v', '2M', '-pix_fmt', 'yuv420p', salida]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('✓', salida, seg + ' s');
