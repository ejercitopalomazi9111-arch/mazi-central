/* pinta un SVG a PNG con el Chromium del contenedor: node pintar.mjs entrada.svg salida.png ancho alto [fondo] */
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const [ent, sal, w, h, fondo = '#fff'] = process.argv.slice(2);   /* fondo 'no' = transparente */
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await br.newPage({ viewport: { width: +w, height: +h } });
const s = fs.readFileSync(ent, 'utf8').replace(/<svg([^>]*?)width="[^"]*"/, '<svg$1width="' + w + '"').replace(/<svg([^>]*?)height="[^"]*"/, '<svg$1height="' + h + '"');
await pg.setContent(`<style>*{margin:0}body{background:${fondo === 'no' ? 'transparent' : fondo}}svg{display:block}</style>${s}`);
await pg.screenshot({ path: sal, clip: { x: 0, y: 0, width: +w, height: +h }, omitBackground: fondo === 'no' }); await br.close();
