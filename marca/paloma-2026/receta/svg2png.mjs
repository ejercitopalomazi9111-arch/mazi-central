import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'; import fs from 'fs';
const [,, ent, sal, ancho = '0', fondo = 'transparent'] = process.argv;
const svg = fs.readFileSync(ent, 'utf8');
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
await p.setContent(`<html><body style="margin:0;background:${fondo}">${svg}</body></html>`);
const el = await p.$('svg');
if (+ancho) await p.evaluate(w => { const s = document.querySelector('svg'); s.setAttribute('width', w); s.removeAttribute('height'); }, ancho);
await el.screenshot({ path: sal, omitBackground: fondo === 'transparent' }); await b.close();
