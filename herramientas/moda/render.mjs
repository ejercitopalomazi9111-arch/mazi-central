import { createRequire } from 'module'; import { readFileSync, mkdirSync } from 'node:fs'; import { dirname } from 'node:path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const DIR = new URL('./', import.meta.url).pathname;
const [planArch, salida] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(planArch));
const nav = await chromium.launch(); const p = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
const TRABAJO = process.env.TRABAJO || DIR + 'trabajo';
await p.goto('http://localhost:8765' + DIR + 'anuncios.html'); await p.evaluate((t) => { window.TRABAJO = t; }, TRABAJO); await p.waitForFunction(() => window.listo); await p.waitForTimeout(300);
let malos = 0;
for (const o of plan) {
  const r = await p.evaluate((o) => window.pintar(o), o);
  if (r.length) { malos++; console.log('⚠', o.arch, r.join(' | ')); }
  const sal = salida + '/' + o.arch; mkdirSync(dirname(sal), { recursive: true });
  await p.locator('#c').screenshot({ path: sal, type: 'jpeg', quality: 92 });
}
console.log('hechos', plan.length, 'con aviso', malos);
await nav.close();
