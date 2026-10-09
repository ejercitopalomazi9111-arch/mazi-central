import { createRequire } from 'module'; import { writeFileSync, readFileSync, existsSync } from 'node:fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const AQUI = new URL('./', import.meta.url).pathname, DIR = (process.env.TRABAJO || AQUI + 'trabajo') + '/';
const cat = JSON.parse(readFileSync(DIR + 'catalogo.json'));
const SOLO = ['bolsa','playera','tenis','botas','termo','locion','pantalon','sudadera','chamarra','camisa'];
const nav = await chromium.launch(); const p = await nav.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:8765' + AQUI + 'recortar.html'); await p.waitForFunction(() => window.listo);
const info = {};
for (const x of cat.filter((c) => SOLO.includes(c.cat))) {
  const sal = DIR + 'recortes/' + x.id + '.png';
  const pts = x.cat === 'tenis' ? [[.5,.5],[.4,.45],[.6,.55]] : x.cat === 'sudadera' || x.cat === 'chamarra' ? [[.5,.55],[.5,.35]] : x.cat === 'pantalon' ? [[.5,.5],[.5,.3],[.5,.7]] : [[.5,.5]];
  try { const r = await p.evaluate(([s, pt]) => window.recortar(s, pt), ['http://localhost:8765' + DIR + 'fotos/' + x.arch, pts]);
    writeFileSync(sal, Buffer.from(r.png.split(',')[1], 'base64')); info[x.id] = { frac: r.frac, caja: r.caja }; console.log(x.i, x.cat, r.frac.toFixed(2));
  } catch (e) { console.log('falla', x.i, e.message); }
}
writeFileSync(DIR + 'recortes/info.json', JSON.stringify(info));
await nav.close();
