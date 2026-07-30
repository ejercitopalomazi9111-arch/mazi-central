#!/usr/bin/env node
/* pruebas-tipos-navegador.mjs — el hueso que enterró Rocco.
   ---------------------------------------------------------------------------
   El plan del sitio afirmaba que `tipos.mjs` "corre en el navegador tal cual".
   Era falso: importaba `node:fs` en el nivel superior y el módulo ni cargaba.
   Se arregló el 30 de julio, y ESTA prueba es la que impide que vuelva.

   Corre en cada bloque del sitio, antes de tocar el taller:
     node herramientas/pruebas-tipos-navegador.mjs
   Tiene que imprimir:  RESULTADO: OK <n> bytes de SVG
   Si imprime ERROR, el taller de tipografías no se anuncia. */
/* Playwright se busca como lo hace captura.mjs: por raíces conocidas, no
   suponiendo que está instalado junto a este archivo. En esta caja vive en el
   node_modules global. */
let chromium = null;
for (const raiz of [
  new URL('./node_modules/playwright/index.mjs', import.meta.url).pathname,
  '/opt/node22/lib/node_modules/playwright/index.mjs',
  '/usr/lib/node_modules/playwright/index.mjs',
]) {
  try { ({ chromium } = await import(raiz)); break; } catch { /* siguiente */ }
}
if (!chromium) {
  console.error('No encontré playwright. Esta prueba necesita un navegador.');
  console.error('  npm i -g playwright   (el Chromium ya viene en /opt/pw-browsers)');
  process.exit(2);
}
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
const RAIZ = new URL('..', import.meta.url).pathname;
const srv=createServer((q,s)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);
  if(p==='/')  { s.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
    return s.end('<meta charset=utf-8><div id=r>cargando</div><script type="module">\
(async()=>{try{const m=await import("/herramientas/tipos.mjs");\
const svg=m.svg("MAZI",{alfabeto:"mazi"});\
document.getElementById("r").textContent="OK "+svg.length+" bytes de SVG";}\
catch(e){document.getElementById("r").textContent="ERROR "+e.message}})()</script>'); }
  const f=join(RAIZ,p);
  if(!existsSync(f)||statSync(f).isDirectory()){s.writeHead(404);s.end();return;}
  s.writeHead(200,{'Content-Type': extname(f)==='.mjs'?'text/javascript':'text/plain'});
  s.end(readFileSync(f));
});
await new Promise(r=>srv.listen(8094,'127.0.0.1',r));
const BINARIO = process.env.PLAYWRIGHT_CHROMIUM
  || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const nav = await chromium.launch({ executablePath: BINARIO });
const p=await (await nav.newContext()).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://127.0.0.1:8094/');
await p.waitForTimeout(2500);
console.log('RESULTADO:', await p.textContent('#r'));
if(errs.length) console.log('ERRORES:\n  '+[...new Set(errs)].slice(0,4).join('\n  '));
const bien = (await p.textContent('#r')).startsWith('OK');
await nav.close(); srv.close();
process.exit(bien && !errs.length ? 0 : 1);
