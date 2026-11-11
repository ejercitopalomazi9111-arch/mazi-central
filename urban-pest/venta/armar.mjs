/* Imprime hoja-industria.html a PDF y PNG.  node urban-pest/venta/armar.mjs */
import { createRequire } from 'module'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });
await pg.goto('file://' + AQUI + '/hoja-industria.html'); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
await pg.pdf({ path: AQUI + '/hoja-industria.pdf', format: 'Letter', printBackground: true });
await pg.screenshot({ path: AQUI + '/hoja-industria.png' });
await b.close(); console.log('listo');
