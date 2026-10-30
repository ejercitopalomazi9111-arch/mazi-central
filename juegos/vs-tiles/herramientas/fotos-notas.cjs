/* saca las fotos de las formas de nota: node herramientas/fotos-notas.cjs (con el servidor en 8765) */
const { chromium } = require('playwright'); const path = require('path'), { execFileSync } = require('child_process');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 256, height: 256 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/juegos/vs-tiles/herramientas/fotos-notas.html'); await p.waitForFunction(() => window.listo);
  for(const id of ['arcade', 'holo', 'brillante', 'disco', 'cristal', 'gema', 'estrella', 'nota']){
    await p.evaluate(i => window.foto(i), id); const png = path.join(__dirname, '..', 'modelos', 'notas', id + '.png');
    await p.locator('#c').screenshot({ path: png, omitBackground: true });
    execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${png}'); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=86)`]); require('fs').unlinkSync(png); console.log(id); }
  console.log('errores', errs); await b.close();
})();
