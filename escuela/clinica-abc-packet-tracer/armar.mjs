/* Arma el PDF de la práctica de la Clínica ABC en formato APA 7 (carta, número de página arriba a la derecha).
   node escuela/clinica-abc-packet-tracer/armar.mjs → Clinica-ABC-Packet-Tracer.pdf */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { topologia } from './topologia.mjs';

const aqui = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(aqui + 'documento.html', 'utf8').split('{{TOPOLOGIA}}').join(topologia());
writeFileSync(aqui + '.doc.html', html);
const b = await chromium.launch();
const pg = await b.newPage();
await pg.goto('file://' + aqui + '.doc.html', { waitUntil: 'load' });
await pg.evaluate(() => document.fonts.ready);
await pg.pdf({ path: aqui + 'Clinica-ABC-Packet-Tracer.pdf', format: 'Letter', printBackground: true, displayHeaderFooter: true,
  headerTemplate: '<div style="width:100%;font:11pt Carlito,Calibri,sans-serif;text-align:right;padding:0 2.54cm;margin-top:1.1cm"><span class="pageNumber"></span></div>',
  footerTemplate: '<div></div>', margin: { top: '2.54cm', bottom: '2.54cm', left: '2.54cm', right: '2.54cm' } });
await b.close();
console.log('listo:', aqui + 'Clinica-ABC-Packet-Tracer.pdf');
