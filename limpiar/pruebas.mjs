/* LIMPIAR FOTOS · pruebas en un navegador de verdad (teléfono 390×844 y compu 1280×800).
   Se arma una fototeca de mentiras con lo que hay en una de verdad: una ráfaga
   de tres (una nítida, una movida, una borrosa), una foto con su copia chica
   de WhatsApp, una borrosa, una de bolsillo, una buena, dos capturas de
   pantalla (una vieja, una nueva) y un video. Las fotos llevan EXIF con su
   fecha de captura y las capturas su XMP, como las del iPhone.
   Comprueba el EFECTO: qué se propone borrar y por qué, que en cada grupo se
   queda la mejor, que tocar cambia la cuenta, y que la lista para el atajo
   trae exactamente las fechas de las que se van.
     node limpiar/pruebas.mjs                                                   */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os'; import zlib from 'zlib';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TIPOS = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html' };
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(RAIZ, u); if (!f.startsWith(RAIZ)) { s.writeHead(403); s.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); s.end(d); });
}).listen(0);
const BASE = `http://localhost:${srv.address().port}/limpiar/`;

let bien = 0, mal = 0;
const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

/* ── EXIF y XMP hechos a mano, como los escribe una cámara y como los escribe iOS ── */
function app1(fecha, marca = 'Apple'){
  const asc = (s) => Buffer.from(s + '\0', 'latin1');
  const m = asc(marca), f = asc(fecha);            // «AAAA:MM:DD hh:mm:ss»
  const ifd0 = 8, nIfd0 = 2, finIfd0 = ifd0 + 2 + nIfd0 * 12 + 4;
  const offMarca = finIfd0, exifIfd = offMarca + m.length, finExif = exifIfd + 2 + 12 + 4, offFecha = finExif;
  const t = Buffer.alloc(offFecha + f.length);
  t.write('II', 0, 'latin1'); t.writeUInt16LE(42, 2); t.writeUInt32LE(ifd0, 4);
  t.writeUInt16LE(nIfd0, ifd0);
  let e = ifd0 + 2;
  t.writeUInt16LE(0x010F, e); t.writeUInt16LE(2, e + 2); t.writeUInt32LE(m.length, e + 4); t.writeUInt32LE(offMarca, e + 8); e += 12;
  t.writeUInt16LE(0x8769, e); t.writeUInt16LE(4, e + 2); t.writeUInt32LE(1, e + 4); t.writeUInt32LE(exifIfd, e + 8); e += 12;
  t.writeUInt32LE(0, e);
  m.copy(t, offMarca);
  t.writeUInt16LE(1, exifIfd);
  t.writeUInt16LE(0x9003, exifIfd + 2); t.writeUInt16LE(2, exifIfd + 4); t.writeUInt32LE(f.length, exifIfd + 6); t.writeUInt32LE(offFecha, exifIfd + 10);
  t.writeUInt32LE(0, exifIfd + 14);
  f.copy(t, offFecha);
  const cuerpo = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), t]);
  const cab = Buffer.alloc(4); cab.writeUInt16BE(0xFFE1, 0); cab.writeUInt16BE(cuerpo.length + 2, 2);
  return Buffer.concat([cab, cuerpo]);
}
const conExif = (jpg, fecha) => Buffer.concat([jpg.subarray(0, 2), app1(fecha), jpg.subarray(2)]);
function conXmp(png, fechaIso){
  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"><exif:UserComment>Screenshot</exif:UserComment><photoshop:DateCreated>${fechaIso}</photoshop:DateCreated></rdf:Description></rdf:RDF></x:xmpmeta>`;
  const datos = Buffer.concat([Buffer.from('XML:com.adobe.xmp\0\0\0\0\0', 'latin1'), Buffer.from(xmp, 'utf8')]);
  const tipo = Buffer.from('iTXt', 'latin1'), largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([tipo, datos])) >>> 0);
  const finIhdr = 8 + 25;                                   // firma + IHDR completo
  return Buffer.concat([png.subarray(0, finIhdr), largo, tipo, datos, crc, png.subarray(finIhdr)]);
}

/* ── la fototeca de mentiras: escenas hechas en el navegador ── */
async function fototeca(pg, dir){
  const hecho = await pg.evaluate(async () => {
    const escena = (sem, w, h, { dx = 0, blur = 0, oscura = false } = {}) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      let s = sem; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      if(oscura){ x.fillStyle = '#060507'; x.fillRect(0, 0, w, h); }
      else {
        const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${r() * 360},60%,60%)`); g.addColorStop(1, `hsl(${r() * 360},60%,35%)`);
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.save(); x.translate(dx * w / 800, 0);
        for(let i = 0; i < 40; i++){ x.fillStyle = `hsl(${r() * 360},70%,${30 + r() * 50}%)`; x.beginPath(); x.arc(r() * w, r() * h, (0.02 + r() * 0.12) * w, 0, 7); x.fill(); }
        x.strokeStyle = '#111'; x.lineWidth = w / 200; for(let i = 0; i < 30; i++){ x.beginPath(); x.moveTo(r() * w, r() * h); x.lineTo(r() * w, r() * h); x.stroke(); }
        x.restore();
      }
      const d = x.getImageData(0, 0, w, h); for(let i = 0; i < d.data.length; i += 4){ const n = (r() - .5) * (oscura ? 6 : 18); d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } x.putImageData(d, 0, 0);
      if(blur){ const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const x2 = c2.getContext('2d'); x2.filter = `blur(${blur * w / 800}px)`; x2.drawImage(c, 0, 0); return c2; }
      return c;
    };
    const jpg = (c) => c.toDataURL('image/jpeg', .9).split(',')[1], png = (c) => c.toDataURL('image/png').split(',')[1];
    const pantalla = (sem) => { const c = escena(sem, 1179, 2556); return c; };
    /* un video de un segundo */
    const vc = escena(9, 320, 240), st = vc.captureStream(10), rec = new MediaRecorder(st, { mimeType: 'video/webm' }), trozos = [];
    rec.ondataavailable = (e) => trozos.push(e.data); rec.start();
    const vx = vc.getContext('2d'); for(let i = 0; i < 10; i++){ vx.fillStyle = `hsl(${i * 30},70%,50%)`; vx.fillRect(i * 20, 50, 30, 30); await new Promise((o) => setTimeout(o, 100)); }
    rec.stop(); await new Promise((o) => rec.onstop = o);
    const video = await new Promise((o) => { const fr = new FileReader(); fr.onload = () => o(fr.result.split(',')[1]); fr.readAsDataURL(new Blob(trozos, { type: 'video/webm' })); });
    return {
      r1: jpg(escena(1, 1600, 1200)), r2: jpg(escena(1, 1600, 1200, { dx: 3, blur: 1 })), r3: jpg(escena(1, 1600, 1200, { dx: 1, blur: 5 })),
      b: jpg(escena(2, 1600, 1200)), wa: (() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; c.getContext('2d').drawImage(escena(2, 1600, 1200), 0, 0, 800, 600); return c.toDataURL('image/jpeg', .7).split(',')[1]; })(),   // WhatsApp: la misma, achicada y recomprimida
      borrosa: jpg(escena(3, 1600, 1200, { blur: 7 })), negra: jpg(escena(4, 1600, 1200, { oscura: true })), buena: jpg(escena(5, 1600, 1200)),
      vieja: png(pantalla(6)), nueva: png(pantalla(7)), video,
    };
  });
  const B = (k) => Buffer.from(hecho[k], 'base64');
  const hoy = new Date(), hace = (d) => { const t = new Date(hoy - d * 864e5); const z = (n) => String(n).padStart(2, '0'); return `${t.getFullYear()}-${z(t.getMonth() + 1)}-${z(t.getDate())}T${z(t.getHours())}:${z(t.getMinutes())}:${z(t.getSeconds())}`; };
  const archivos = {
    'IMG_0001.jpg': conExif(B('r1'), '2026:09:20 10:00:00'),
    'IMG_0002.jpg': conExif(B('r2'), '2026:09:20 10:00:02'),
    'IMG_0003.jpg': conExif(B('r3'), '2026:09:20 10:00:04'),
    'IMG_0100.jpg': conExif(B('b'), '2026:08:01 12:00:00'),
    'IMG-20260802-WA0007.jpg': B('wa'),
    'IMG_0200.jpg': conExif(B('borrosa'), '2026:07:15 18:30:00'),
    'IMG_0300.jpg': conExif(B('negra'), '2026:07:16 09:10:11'),
    'IMG_0400.jpg': conExif(B('buena'), '2026:06:01 08:00:00'),
    'captura-vieja.png': conXmp(B('vieja'), '2026-07-01T09:00:00'),
    'captura-nueva.png': conXmp(B('nueva'), hace(2)),
    'video.webm': B('video'),
  };
  return Object.entries(archivos).map(([n, b]) => { const f = path.join(dir, n); fs.writeFileSync(f, b); return f; });
}

const desborde = (pg) => pg.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth,
  ...[...document.querySelectorAll('dialog[open] .hoja')].map((d) => d.scrollWidth - d.clientWidth)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'limpiar-'));
const br = await chromium.launch();
let archivos;
for (const [ancho, alto, nombre] of [[390, 844, 'teléfono'], [1280, 800, 'computadora']]) {
  console.log(`\n${nombre} ${ancho}×${alto}`);
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true, hasTouch: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await pg.goto(BASE);
  archivos ??= await fototeca(pg, tmp);
  ok(await desborde(pg) <= 0, 'la portada no se sale de la pantalla');

  const [sel] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#soltar')]); await sel.setFiles(archivos);
  await pg.waitForFunction(() => !document.querySelector('#resultado').hidden, null, { timeout: 60000 });
  const fs_ = await pg.evaluate(() => window.__limpiar.fotos.map((f) => ({ n: f.nombre, borrar: f.borrar, razon: f.razon, grupo: f.grupo, mejor: f.mejor, nit: Math.round(f.nitidez || 0), fecha: f.fecha, tipo: f.tipo, captura: !!f.captura })));
  const de = (n) => fs_.find((f) => f.n === n);
  if (process.env.VER) console.log(await pg.evaluate(() => { const A = window.__limpiar.fotos; const d = (a, b) => { let n = 0; for (const k of [0, 1]) { let x = (a[k] ^ b[k]) >>> 0; while (x) { n += x & 1; x >>>= 1; } } return n; }; return A.filter(f => f.huella).map(f => f.nombre + " g" + f.grupo + " " + A.filter(g => g.huella).map(g => d(f.huella, g.huella)).join(",")).join("\n"); }));
  ok(fs_.length === 11, `revisa las 11 (${fs_.length})`);
  const r1 = de('IMG_0001.jpg'), r2 = de('IMG_0002.jpg'), r3 = de('IMG_0003.jpg');
  ok(r1.grupo >= 0 && r1.grupo === r2.grupo && r2.grupo === r3.grupo, 'la ráfaga de tres queda en un grupo');
  ok(r1.mejor && !r1.borrar && r2.borrar && r3.borrar, `de la ráfaga se queda la nítida y se van las otras dos (nitidez ${r1.nit} · ${r2.nit} · ${r3.nit})`);
  const b = de('IMG_0100.jpg'), wa = de('IMG-20260802-WA0007.jpg');
  ok(b.grupo >= 0 && b.grupo === wa.grupo && b.mejor && wa.borrar && /Repetida/.test(wa.razon), `la copia chica de WhatsApp es «${wa.razon}» y se queda la original`);
  ok(b.grupo !== r1.grupo, 'escenas distintas no se juntan');
  ok(de('IMG_0200.jpg').borrar && /Borrosa/.test(de('IMG_0200.jpg').razon), `la borrosa se va (nitidez ${de('IMG_0200.jpg').nit})`);
  ok(de('IMG_0300.jpg').borrar && /negra/.test(de('IMG_0300.jpg').razon), 'la de bolsillo se va: «' + de('IMG_0300.jpg').razon + '»');
  ok(!de('IMG_0400.jpg').borrar && de('IMG_0400.jpg').razon === '', `la buena se queda (nitidez ${de('IMG_0400.jpg').nit})`);
  const vieja = de('captura-vieja.png'), nueva = de('captura-nueva.png');
  ok(vieja.captura && nueva.captura, 'reconoce las capturas de pantalla');
  ok(vieja.borrar && /hace \d+ días/.test(vieja.razon) && !nueva.borrar, `la captura vieja se va («${vieja.razon}») y la de hace dos días se queda`);
  ok(de('video.webm').tipo === 'video' && !de('video.webm').borrar, 'el video aparece y no va marcado');
  ok(r1.fecha === new Date('2026-09-20T10:00:00').getTime() && wa.fecha === null, 'la fecha sale del EXIF; la de WhatsApp no tiene');

  // la pantalla
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/limpiar-${ancho}.png`, fullPage: true });
  ok(await desborde(pg) <= 0, 'el resultado no se sale de la pantalla');
  const chicos = await pg.evaluate(() => [...document.querySelectorAll('button, .soltar')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 20)));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.join(', ') : ''));
  const cats = await pg.evaluate(() => [...document.querySelectorAll('section.cat')].map((s) => s.dataset.cat));
  ok(['parecidas', 'borrosas', 'negras', 'capturas', 'videos'].every((c) => cats.includes(c)), `salen las cinco secciones (${cats.join(', ')})`);
  ok(/Y 1 foto más que está bien/.test(await pg.textContent('#categorias')), 'y dice que la buena se queda sin tocarla');
  const cuenta = () => pg.evaluate(() => +document.querySelector('#cuenta b')?.textContent || 0);
  ok(await cuenta() === 6, `el pie dice que se van 6 (${await cuenta()})`);
  ok((await pg.evaluate(() => [...document.querySelectorAll('.foto img')].filter((i) => !i.complete || !i.naturalWidth).length)) <= 0, 'todas las miniaturas se ven');

  await pg.click('.foto[data-id] >> nth=0');            // la mejor de la ráfaga
  ok(await cuenta() === 7, 'tocar una foto la marca y la cuenta sube');
  await pg.click('.foto[data-id] >> nth=0');
  ok(await cuenta() === 6, 'tocarla otra vez la regresa');
  await pg.click('section[data-cat="borrosas"] [data-todas="queda"]');
  ok(await cuenta() === 5, '«Todas se quedan» desmarca la sección');
  await pg.click('section[data-cat="borrosas"] [data-todas="va"]');
  ok(await cuenta() === 6, '«Todas se van» la vuelve a marcar');

  // ver en grande
  await pg.click('section[data-cat="negras"] .foto .lupa');
  await pg.waitForFunction(() => document.querySelector('#dlgVer').open && document.querySelector('#grande img')?.complete);
  ok(/negra/.test(await pg.textContent('#razonVer')) && await pg.evaluate(() => document.querySelector('#grande img').naturalWidth) === 1600, 'la lupa la abre en grande, con su razón');
  await pg.click('#alternarVer');
  ok(await cuenta() === 5, '«Mejor que se quede» desde la vista grande');
  await pg.click('#alternarVer'); await pg.click('#cerrarVer');

  // borrar
  await pg.click('#borrar');
  ok(await pg.evaluate(() => document.querySelector('#dlgBorrar').open), '«Borrarlas del iPhone» abre las instrucciones');
  ok(await desborde(pg) <= 0, 'y no se salen de la pantalla');
  if (process.env.CAPTURA) { await pg.evaluate(() => document.querySelectorAll('#dlgBorrar details').forEach((d) => d.open = true)); await pg.screenshot({ path: `${process.env.CAPTURA}/limpiar-borrar-${ancho}.png` }); }
  ok(/^1 de ellas no trae$/.test(await pg.textContent('#nSinFecha')) && await pg.isVisible('#listaSinFecha img'), 'avisa de la que no trae fecha (la de WhatsApp): ésa va a mano');
  await pg.evaluate(() => { window.__abierta = ''; window.__abrir = (u) => { window.__abierta = u; }; });
  await pg.click('#copiarAbrir');
  const pegado = await pg.evaluate(() => navigator.clipboard.readText());
  const esperado = ['2026-09-20 10:00:02', '2026-09-20 10:00:04', '2026-07-15 18:30:00', '2026-07-16 09:10:11', '2026-07-01 09:00:00'];
  const renglones = pegado.split('\n');
  ok(renglones.length === 5 && esperado.every((f) => renglones.includes(f)), `copia exactamente las 5 fechas de las que se van (${renglones.join(' | ')})`);
  ok(await pg.evaluate(() => window.__abierta) === 'shortcuts://run-shortcut?name=Limpiar%20fotos%20Mazi&input=clipboard', 'y abre el atajo «Limpiar fotos Mazi» con el portapapeles');
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#bajarLista')]);
  const txt = fs.readFileSync(await dl.path(), 'utf8').trim().split('\n');
  ok(dl.suggestedFilename() === 'fotos-para-borrar.txt' && txt.length === 5, '«Bajar la lista» da el mismo .txt');
  await pg.click('#cerrarBorrar');

  ok(!errores.length, 'ni un error en la consola' + (errores.length ? ' — ' + errores.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
