#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · EL LECTOR CON LAS CREDENCIALES NUEVAS (15 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Carlos mandó fotos de las credenciales del ciclo 2026-2027: «haz que Fadori
   acepte estas y las web». En la nueva no hay «Número de Matrícula»: el nombre
   va en un renglón, los apellidos abajo y luego «BACHILLERATO», con los logos
   de la SEP y la DGETI a los lados. Al reverso, la firma del director
   («Lie.» según el lector), el contacto y «DE QUERETARO» en mayúsculas.

   Con las fotos de verdad el lector de antes leía «GO» en vez de «DIEGO»,
   proponía «Sep C» como nombre y, en la vuelta, «De Q».

   Aquí todas las credenciales se DIBUJAN en el navegador con nombres
   inventados: las fotos reales son de alumnos y no entran al repositorio.

   Correr:  node fadori/pruebas-lector.mjs     (no necesita el servidor)
   ═════════════════════════════════════════════════════════════════════════ */
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/* un servidor de archivos mínimo: el lector carga su motor por URL */
const TIPOS = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.html': 'text/html' };
const srv = http.createServer((q, r) => {
  const f = path.join(RAIZ, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if(!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html><title>lector</title>'); }
  r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, '127.0.0.1');
await new Promise(s => srv.once('listening', s));
const BASE = 'http://127.0.0.1:' + srv.address().port;

const fallas = []; let pasan = 0;
const ok = (que, si, extra) => { if(si){ pasan++; console.log('  ✓', que); } else { fallas.push(que); console.log('  ✗', que, extra ? '· ' + JSON.stringify(extra) : ''); } };

const br = await chromium.launch();
/* LAS CREDENCIALES DE MENTIRA · formato nuevo (frente y vuelta) y el de antes */
const NUEVA = (nom, ap) => `<div style="width:640px;height:1010px;background:#fff;border-radius:28px;overflow:hidden;position:relative;font-family:Arial,sans-serif">
  <div style="position:absolute;left:0;top:0;width:240px;height:560px;background:linear-gradient(160deg,#8e2a2a 0 60%,#fff 60% 62%,transparent 62%)"></div>
  <div style="position:absolute;left:40px;top:30px;width:170px;height:200px;background:#8e2a2a;border:6px solid #fff;border-radius:0 0 80px 80px"></div>
  <div style="position:absolute;left:250px;top:40px;font:900 52px/1 Arial;color:#2b2b3a">INSTITUTO<br>REMBRANDT</div>
  <div style="position:absolute;left:250px;top:160px;font:400 20px Arial;color:#888">CULTURA, RESPETO Y HONOR</div>
  <div style="position:absolute;left:190px;top:250px;width:260px;height:260px;border-radius:50%;background:#ccc;border:8px solid #2b2b5a"></div>
  <div style="position:absolute;left:20px;top:560px;font:900 30px Arial;color:#8e2a2a">SEP</div>
  <div style="position:absolute;right:20px;top:560px;font:900 22px Arial;color:#2b2b5a">DGETI</div>
  <div style="position:absolute;left:0;right:0;top:545px;text-align:center;font:500 40px Arial;color:#2b2b3a">${nom}</div>
  <div style="position:absolute;left:0;right:0;top:600px;text-align:center;font:600 28px Arial;color:#2b2b3a">${ap}</div>
  <div style="position:absolute;left:0;right:0;top:665px;text-align:center;font:700 38px Arial;color:#8e2a2a">BACHILLERATO</div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:260px;background:#25234a;color:#fff;font:500 26px Arial;padding:50px 40px;box-sizing:border-box">
    <div style="text-align:center">CCT: 00XXX0000 / RVOE: 00000000</div><div style="margin-top:40px">Grupo: &nbsp;&nbsp; 31</div><div>Ciclo Escolar: 2026 - 2027</div></div></div>`;
const VUELTA = `<div style="width:640px;height:1010px;background:#fff;border-radius:28px;overflow:hidden;position:relative;font-family:Arial,sans-serif">
  <div style="position:absolute;right:-60px;top:20px;width:300px;height:40px;background:#8e2a2a;transform:rotate(30deg)"></div>
  <div style="position:absolute;left:0;right:0;top:250px;text-align:center;font:700 32px Arial;color:#2b2b3a">Lie. Juan Ejemplo Ruiz</div>
  <div style="position:absolute;left:0;right:0;top:295px;text-align:center;font:700 32px Arial;color:#8e2a2a">Director General</div>
  <div style="position:absolute;left:240px;top:360px;width:160px;height:160px;background:repeating-linear-gradient(90deg,#000 0 8px,#fff 8px 16px)"></div>
  <div style="position:absolute;left:110px;top:560px;font:700 34px Arial;color:#2b2b3a">Contacto</div>
  <div style="position:absolute;left:110px;top:620px;font:400 26px/1.5 Arial;color:#2b2b3a">000 000 0000<br>Calle Ejemplo 1, Col. Centro,<br>Querétaro, Qro CP 76000<br>FB INSTITUTO REMBRANDT<br>DE QUERETARO<br>instituto Rembrandt</div></div>`;
const ANTERIOR = (n1, n2) => `<div style="width:640px;height:1010px;background:#fff;font-family:Arial">
  <div style="height:260px;background:linear-gradient(160deg,#d4111f 0 40%,#fff 40% 46%,#463d78 46% 70%,#fff 70%)"></div>
  <h1 style="text-align:center;font-size:34px;margin:60px 30px 10px;line-height:1.15">${n1}<br>${n2}</h1>
  <p style="text-align:center;color:#d4111f;font-size:24px;line-height:1.5">Número de Matrícula: 00000TEST0001<br>Grupo: 3.1<br>Ciclo Escolar: AGOSTO 2026 - DICIEMBRE 2026</p></div>`;
/* la foto: de cerca (la credencial llena la foto) o de lejos (chica, en la mesa azul y desenfocada) */
async function foto(html, lejos){
  const pg = await br.newPage({ viewport: lejos ? { width: 1500, height: 2000 } : { width: 640, height: 1010 } });
  await pg.setContent(lejos
    ? `<body style="margin:0;background:#2a3d8f"><div style="position:absolute;left:430px;top:440px;transform:scale(1.02);transform-origin:0 0;filter:blur(1.2px)">${html}</div></body>`
    : `<body style="margin:0">${html}</body>`);
  const b = await pg.screenshot({ type: 'jpeg', quality: 82 }); await pg.close();
  return 'data:image/jpeg;base64,' + b.toString('base64');
}
const pg = await br.newPage(); await pg.goto(BASE + '/');
const leer = async (img, nombre) => pg.evaluate(async ([img, nombre]) => {
  const L = await import('/fadori/lector.js');
  const r0 = await L.leer(img), texto = r0.texto, zona = r0.zona || '';
  return L.revisarNombre(texto, nombre, zona);
}, [img, nombre]);

console.log('\n1 · La credencial nueva, de cerca');
let r = await leer(await foto(NUEVA('ANA SOFÍA', 'PÉREZ LÓPEZ')), 'Ana P');
ok('reconoce que es una credencial', r.esCredencial, r);
ok('lee el nombre con los apellidos del renglón de abajo', r.leido === 'ANA SOFIA PEREZ LOPEZ', r.leido);
ok('coincide con «Ana P»', r.coincide, r);
ok('el logo de la SEP no se cuela en el nombre', !/SEP/.test(r.leido), r.leido);

console.log('\n2 · La credencial nueva, de lejos y algo borrosa (como las fotos de Carlos)');
r = await leer(await foto(NUEVA('BRUNO', 'SALAS VEGA'), true), 'Bruno S');
ok('coincide con «Bruno S»', r.coincide, r);
ok('lee nombre y apellidos', r.leido === 'BRUNO SALAS VEGA', r.leido);
ok('propone «Bruno S» (primer nombre + inicial del primer apellido)', r.sugerido === 'Bruno S', r.sugerido);

console.log('\n3 · La credencial nueva de OTRA persona');
r = await leer(await foto(NUEVA('LUIS MARIO', 'TORRES DÍAZ'), true), 'Ana P');
ok('no coincide', !r.coincide, r);
ok('dice de quién es', r.leido === 'LUIS MARIO TORRES DIAZ', r.leido);
ok('y propone «Luis T»', r.sugerido === 'Luis T', r.sugerido);

console.log('\n4 · La vuelta de la credencial nueva');
r = await leer(await foto(VUELTA, true), 'Juan E');
ok('sabe que es la vuelta', r.esReverso, r);
ok('la firma del director no cuenta como el alumno', !r.coincide, r);
ok('no propone «De Q» ni ningún nombre', r.leido === '' && r.sugerido === '', r);

console.log('\n5 · La credencial de antes (con «Número de Matrícula») sigue sirviendo');
r = await leer(await foto(ANTERIOR('ANA PAOLA', 'PÉREZ LÓPEZ')), 'Ana P');
ok('coincide con «Ana P»', r.coincide, r);
ok('lee el nombre completo', r.leido === 'ANA PAOLA PEREZ LOPEZ', r.leido);

await br.close(); srv.close();
console.log(fallas.length ? `\n✗ ${pasan} pasan · ${fallas.length} fallan` : `\n✓ ${pasan}/${pasan}`);
process.exit(fallas.length ? 1 : 0);
