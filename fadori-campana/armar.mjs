/* LA CAMPAÑA DE FADORI · arma los 15 pósters de dos caras (PDF a 300 ppp) y
   el comercial de 48 s. Pedido por Carlos el 15 de octubre.

   node fadori-campana/armar.mjs posters   → salida/Fadori-15-posters-doble-cara.pdf
   node fadori-campana/armar.mjs video     → salida/Fadori-comercial.mp4

   Todo se pinta en un navegador y se vuelve IMAGEN antes de ir a papel: las
   transparencias del navegador en un PDF se le atoran a la imprenta (lo de la
   estrella de la credencial). La música no vive en el repo: se baja sola de
   incompetech.com (Kevin MacLeod, CC BY 4.0). Necesita `pip install
   imageio-ffmpeg img2pdf`. */
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const AQUI = path.dirname(new URL(import.meta.url).pathname), SAL = path.join(AQUI, 'salida');
fs.mkdirSync(SAL, { recursive: true });
const que = process.argv[2] || 'posters';
/* `posters [archivo] [tanda]`: cada tanda en su carpeta y su PDF. `previa`
   saca lo mismo a tamaño de pantalla y dos hojas (frentes y vueltas), que es
   lo que se revisa a ojo antes de mandar a 300 ppp. */
const archivo = process.argv[3] || 'posters.html', tanda = process.argv[4] || '';
const br = await chromium.launch();
if(que === 'previa'){
  const pg = await br.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.join(AQUI, archivo)); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(800);
  const caras = await pg.$$('.cara'), dir = path.join(SAL, 'previa' + (tanda ? '-' + tanda : '')); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for(let i = 0; i < caras.length; i++) await caras[i].screenshot({ path: path.join(dir, String(Math.floor(i / 2) + 1).padStart(2, '0') + (i % 2 ? '-vuelta' : '-frente') + '.jpg'), type: 'jpeg', quality: 85 });
  execFileSync('python3', ['-c', `
import glob
from PIL import Image
for lado in ['frente','vuelta']:
    fs=sorted(glob.glob('${dir}/*-'+lado+'.jpg')); ims=[Image.open(f).resize((408,528)) for f in fs]
    c=Image.new('RGB',(5*418+10,((len(ims)+4)//5)*538+10),'#3a3a3a')
    for i,im in enumerate(ims): c.paste(im,(10+(i%5)*418,10+(i//5)*538))
    c.save('${dir}/hoja-'+lado+'s.jpg',quality=85)`]);
  console.log('✓ ' + caras.length + ' caras → ' + path.relative(AQUI, dir));
} else if(que === 'posters'){
  const pg = await br.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 3.125 });   /* 816 px × 3.125 = 2550 = 8.5 in a 300 ppp */
  await pg.goto('file://' + path.join(AQUI, archivo)); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(800);
  const caras = await pg.$$('.cara'), dir = path.join(SAL, 'caras' + (tanda ? '-' + tanda : '')); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for(let i = 0; i < caras.length; i++) await caras[i].screenshot({ path: path.join(dir, String(Math.floor(i / 2) + 1).padStart(2, '0') + (i % 2 ? '-vuelta' : '-frente') + '.png') });
  const pdf = 'Fadori-15-posters' + (tanda ? '-' + tanda : '') + '-doble-cara.pdf';
  execFileSync('python3', ['-c', `
import glob, img2pdf, os
from PIL import Image
js=[]
for f in sorted(glob.glob('${dir}/*.png')):
    j=f[:-4]+'.jpg'; Image.open(f).convert('RGB').save(j,quality=88,dpi=(300,300)); js.append(j)
lay=img2pdf.get_layout_fun((img2pdf.in_to_pt(8.5),img2pdf.in_to_pt(11)))
open('${SAL}/${pdf}','wb').write(img2pdf.convert(js,layout_fun=lay))`], { stdio: 'inherit' });
  console.log('✓ ' + caras.length + ' caras → salida/' + pdf);
} else {
  const mp3 = path.join(SAL, 'Funky-Chunk.mp3');
  if(!fs.existsSync(mp3)) execFileSync('curl', ['-sL', '-A', 'Mozilla/5.0', '-o', mp3, 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Funky%20Chunk.mp3']);
  const pg = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + path.join(AQUI, 'video.html')); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(1500);
  const DUR = await pg.evaluate(() => window.DUR), dir = path.join(SAL, 'cuadros'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  for(let i = 0; i < Math.ceil(DUR * 30); i++){ await pg.evaluate(t => window.pintar(t), i / 30); await pg.screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 }); }
  const ff = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
  execFileSync(ff, ['-y', '-v', 'error', '-framerate', '30', '-i', path.join(dir, '%05d.jpg'), '-i', mp3, '-filter_complex', `[1:a]atrim=0:${DUR},afade=t=in:d=0.3,afade=t=out:st=${DUR - 2.5}:d=2.5,volume=0.9[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', path.join(SAL, 'Fadori-comercial.mp4')]);
  console.log('✓ ' + DUR.toFixed(1) + ' s → salida/Fadori-comercial.mp4');
}
await br.close();
