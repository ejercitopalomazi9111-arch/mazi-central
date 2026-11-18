/* GM-5 · capturas: el chat de Urban Pest con datos de muestra (escuchar al cliente).
   Las demás pantallas salen de 30-pared/cap y 28-herramientas/cap. Sale a cap/ (ignorado por git).
     node marca/anuncios/31-como-trabajamos/capturas.mjs     (con el servidor local en :8765) */
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const C = path.dirname(new URL(import.meta.url).pathname) + '/cap/';
fs.mkdirSync(C, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('E', e.message));
await p.goto('http://localhost:8765/urban-pest/chat/?muestra'); await p.waitForTimeout(2500);
await p.screenshot({ path: C + 'chat-0.jpg', type: 'jpeg', quality: 90 });
const items = await p.$$('li, .conv, [data-chat], button');
for(const el of items){ const t = (await el.innerText().catch(() => '')).trim(); if(/Mariana/.test(t)){ await el.click().catch(() => {}); console.log('toqué:', t.slice(0, 40)); break; } }
await p.waitForTimeout(1500);
await p.screenshot({ path: C + 'chat-1.jpg', type: 'jpeg', quality: 90 });
await b.close();
