/* Junta los cuadros de la caja 3D en img/caja-cuadros.webp (la tapa abriéndose) y
   img/caja-cerrada.webp (de frente, para la calculadora). Corre con el servidor local en
   :8765 sirviendo la raíz del repo:  node smileys/scripts/caja-sprite.mjs */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await br.newPage({ viewport: { width: 700, height: 700 } });
pg.on('pageerror', (e) => console.error(e));
await pg.goto('http://localhost:8765/smileys/scripts/caja-sprite.html?lado=480');
await pg.waitForFunction(() => window.listo, null, { timeout: 60000 });
const dir = '/tmp/claude-0/caja'; mkdirSync(dir, { recursive: true });
const N = 14;
for (let i = 0; i < N; i++) {
  const t = i / (N - 1), e = 1 - Math.pow(1 - t, 2);
  const url = await pg.evaluate(([a]) => window.pose(a, -0.7, 1.75, 3.5), [e * 104]);
  writeFileSync(`${dir}/f${String(i).padStart(2, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
const url = await pg.evaluate(() => window.pose(0, -0.5, 0.9, 2.9));
writeFileSync(`${dir}/cerrada.png`, Buffer.from(url.split(',')[1], 'base64'));
await br.close();
execFileSync('python3', ['-c', `
from PIL import Image
import glob
fs=sorted(glob.glob('${dir}/f*.png')); ims=[Image.open(f).convert('RGBA') for f in fs]
# todas con el mismo recorte, el de la caja más abierta
bb=None
for im in ims:
  b=im.getchannel('A').point(lambda v:255 if v>6 else 0).getbbox()
  bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
ims=[im.crop(bb) for im in ims]; w,h=ims[0].size
k=220/max(w,h); ims=[im.resize((round(w*k),round(h*k)),Image.LANCZOS) for im in ims]; w,h=ims[0].size
tira=Image.new('RGBA',(w*len(ims),h))
for i,im in enumerate(ims): tira.paste(im,(i*w,0))
tira.save('smileys/img/caja-cuadros.webp',quality=88,method=6); print('tira',w,h,len(ims))
c=Image.open('${dir}/cerrada.png').convert('RGBA'); c=c.crop(c.getchannel('A').point(lambda v:255 if v>6 else 0).getbbox())
c.thumbnail((360,360),Image.LANCZOS); c.save('smileys/img/caja-cerrada.webp',quality=88,method=6); print('cerrada',c.size)
`], { stdio: 'inherit', cwd: '/home/user/mazi-central' });
