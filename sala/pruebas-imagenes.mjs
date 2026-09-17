/* pruebas-imagenes.mjs — CUÁNTO PESAN DE VERDAD LAS IMÁGENES DE LA SALA
 * ===========================================================================
 * Carlos: «necesito que hagas que las imágenes de la sala se compriman de algún
 * modo para poder guardarlas en ese servidor como texto liviano y que se
 * carguen en la sala más económicamente para que yo pueda verlas».
 *
 * Esto NO se puede probar leyendo el código. `toDataURL` es del navegador, su
 * compresión depende del navegador, y el ahorro real depende de la imagen: una
 * captura de pantalla y una foto de la calle se comprimen distintísimo. Así que
 * se corre en un Chromium de verdad, se le dan imágenes de verdad, y se cuentan
 * los bytes.
 *
 * Arranca su propio servidor. Uso:
 *     node sala/pruebas-imagenes.mjs
 * ===========================================================================*/
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const PUERTO = 8793;
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO)],
                  { cwd: process.cwd(), stdio: 'ignore' });
const alFinal = () => { try { srv.kill(); } catch {} };
process.on('exit', alFinal);

let pasan = 0, fallan = 0;
const ok = (t, c, extra) => {
  if (c) { pasan++; console.log('  ✓ ' + t + (extra ? '  · ' + extra : '')); }
  else { fallan++; console.log('  ✗ ' + t + (extra ? '  → ' + extra : '')); }
};
const kb = n => (n / 1024).toFixed(1) + ' KB';

await new Promise(r => setTimeout(r, 900));

const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await pg.goto(`http://127.0.0.1:${PUERTO}/sala/?sala=PRUEBA`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1200);

/* Dos imágenes que se comprimen de forma MUY distinta, y por eso van las dos:
   · la FOTO tiene ruido y degradados — se comprime bien y se nota poco.
   · la CAPTURA tiene bordes duros y texto — es el caso malo de una compresión
     con pérdida, y es justo lo que más se manda en esta sala. Probar sólo con
     una foto bonita daría un número optimista que no se parece al uso real. */
const hacerArchivo = async (clase, w, h) => pg.evaluate(async ({ clase, w, h }) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (clase === 'foto') {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2b1055'); g.addColorStop(.5, '#7597de'); g.addColorStop(1, '#f9a825');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const d = x.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const r = (Math.random() - .5) * 46;
      d.data[i] += r; d.data[i + 1] += r; d.data[i + 2] += r;
    }
    x.putImageData(d, 0, 0);
  } else {
    x.fillStyle = '#12121a'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#e9e4e4'; x.font = '16px monospace';
    for (let y = 30; y < h; y += 26) x.fillText('const asi = seVeUnaCaptura(' + y + ');', 24, y);
    x.strokeStyle = '#AC27FF'; x.lineWidth = 2;
    for (let i = 0; i < 8; i++) x.strokeRect(20 + i * 30, 20, 120, h - 40);
  }
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const f = new File([blob], clase + '.png', { type: 'image/png' });
  window.__f = window.__f || {}; window.__f[clase] = f;
  return f.size;
}, { clase, w, h });

console.log('\n── cuánto pesaba y cuánto pesa ──');

for (const [clase, w, h] of [['foto', 3024, 4032], ['captura', 1170, 2532]]) {
  const antes = await hacerArchivo(clase, w, h);
  const r = await pg.evaluate(async (clase) => {
    const t0 = performance.now();
    const a = await window.SALA.encoger(window.__f[clase]);
    return { ms: performance.now() - t0, mime: a.mime, ancho: a.ancho, alto: a.alto,
             datos: a.datos.length, mini: (a.mini || '').length };
  }, clase);

  const razon = antes / r.datos;
  console.log(`\n  ${clase.toUpperCase()} ${w}×${h}`);
  console.log(`    original ${kb(antes)}  →  ${kb(r.datos)} en base64  (${razon.toFixed(1)}× menos)`);
  console.log(`    quedó en ${r.ancho}×${r.alto} · ${r.mime} · miniatura ${r.mini} bytes · ${r.ms.toFixed(0)} ms`);

  ok(`la ${clase} cabe en el presupuesto de 180 KB`, r.datos <= 180_000, kb(r.datos));
  ok(`y pesa menos que el original`, r.datos < antes, `${kb(antes)} → ${kb(r.datos)}`);
  ok(`no se pasa de 1280 de lado`, Math.max(r.ancho, r.alto) <= 1280, `${r.ancho}×${r.alto}`);
  ok(`trae miniatura, y es MINIATURA (< 8 KB)`, r.mini > 0 && r.mini < 8000, r.mini + ' bytes');
  /* ⚠ ESTA ES LA QUE MÁS IMPORTA DE TODO EL ARCHIVO. `toDataURL` con un tipo
     que el navegador no conoce NO falla: devuelve un PNG tan tranquilo. O sea
     que se puede creer que se manda webp y estar mandando PNGs enormes, y
     todo lo demás seguiría verde. */
  ok(`y salió en webp de verdad, no un PNG disfrazado`,
     r.mime === 'image/webp' || r.mime === 'image/jpeg', r.mime);
}

console.log('\n── lo que NO se debe tocar ──');
{
  const r = await pg.evaluate(async () => {
    const gif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const bin = atob(gif);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const f = new File([u], 'x.gif', { type: 'image/gif' });
    const a = await window.SALA.encoger(f);
    return { mime: a.mime, intacta: !!a.intacta };
  });
  /* Dibujar un GIF animado en un canvas lo aplasta a UN cuadro. Entregar una
     animación convertida en foto fija, sin avisar, es peor que no comprimirla. */
  ok('un GIF se pasa tal cual: comprimirlo lo dejaría en un solo cuadro',
     r.mime === 'image/gif' && r.intacta, JSON.stringify(r));
}
{
  const r = await pg.evaluate(async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">' +
                '<circle cx="20" cy="20" r="18" fill="#AC27FF"/></svg>';
    const f = new File([svg], 'x.svg', { type: 'image/svg+xml' });
    const a = await window.SALA.encoger(f);
    return { mime: a.mime, intacta: !!a.intacta };
  });
  ok('un SVG también: ya es texto, y rasterizarlo lo engorda y le quita la escala',
     r.mime === 'image/svg+xml' && r.intacta, JSON.stringify(r));
}
{
  const r = await pg.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 60; c.height = 40;
    c.getContext('2d').fillRect(0, 0, 60, 40);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const a = await window.SALA.encoger(new File([blob], 'chica.png', { type: 'image/png' }));
    return { ancho: a.ancho, alto: a.alto };
  });
  ok('una imagen chica NO se agranda', r.ancho === 60 && r.alto === 40,
     `${r.ancho}×${r.alto}`);
}

console.log('\n' + (fallan ? '✗' : '✓') + `  ${pasan} pasan · ${fallan} fallan`);
await b.close();
alFinal();
process.exit(fallan ? 1 : 0);
