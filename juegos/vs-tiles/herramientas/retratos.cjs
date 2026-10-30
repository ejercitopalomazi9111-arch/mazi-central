/* saca los retratos de la novela: node herramientas/retratos.cjs [id:clip:t ...] (con el servidor en 8765) */
const { chromium } = require('playwright'); const path = require('path'), { execFileSync } = require('child_process');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 600, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/juegos/vs-tiles/herramientas/retratos.html'); await p.waitForFunction(() => window.listo);
  for(const arg of process.argv.slice(2)){ const [id, clip, t, giro, rota, sal] = arg.split(':');
    const clips = await p.evaluate(u => window.cargar(u), `../modelos/${id}.glb`);
    await p.evaluate(([c, tt, g, ro, al]) => window.foto(+c, +tt, +g, +al, +ro), [clip ?? -1, t ?? 0, giro ?? .25, rota ?? 0, process.env.ALTO || .34]);
    const png = sal || path.join(__dirname, '..', 'sprites', `retrato-${id}.png`);
    await p.locator('#c').screenshot({ path: png, omitBackground: true });
    if(!sal){ execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${png}'); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=84)`]); require('fs').unlinkSync(png); }
    console.log(id, JSON.stringify(clips.map(c => c[0]))); }
  console.log('errores', errs); await b.close();
})();
