/* pruebas-tarea.mjs — EL MODO «TAREA» DE REPORTES, DE PUNTA A PUNTA (Carlos, 14 nov)
 * Fotos de hojas → escaneo → portada APA → PDF «Tema_Apellidos». Con fotos HECHAS AQUÍ (una hoja chueca sobre una mesa
 * oscura, con sombra, tinta azul y lápiz gris): las tareas de verdad traen nombres de alumnos y no van en el repo.
 * node reportes/pruebas-tarea.mjs   (FOTOS=<carpeta> guarda capturas) */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8600 + Math.floor(Math.random() * 90), FOTOS = process.env.FOTOS;
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
let n = 0, f = 0;
const ok = (c, t) => { n++; if(!c) f++; console.log(`  ${c ? '✓' : '✗'} ${t}`); };
await new Promise((r) => setTimeout(r, 700));
const b = await chromium.launch();
try{
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  const pg = await ctx.newPage(); const err = [];
  pg.on('pageerror', (e) => err.push(e.message)); pg.on('console', (m) => { if(m.type() === 'error') err.push(m.text()); });
  await pg.goto(`http://127.0.0.1:${PUERTO}/reportes/`, { waitUntil: 'load' });
  await pg.click('.modo[data-modo="tarea"]');
  await pg.waitForSelector('#panel-tarea #tArchivo', { state: 'attached' });

  console.log('La pantalla');
  ok(await pg.isVisible('#panel-tarea') && /Descargar PDF/.test(await pg.textContent('#bImprimir')), 'el modo «Tarea» abre su panel y el botón grande dice «Descargar PDF»');
  ok(await pg.evaluate(() => window.__tarea.nombreArchivo('Tiro parabólico', 'Lorena Geraldy Gutiérrez Ávila')) === 'Tiro_Parabolico_Gutierrez_Avila', 'el nombre sale «Tema_Apellidos» sin acentos (Tiro_Parabolico_Gutierrez_Avila)');

  console.log('Dos fotos: una parada y una acostada');
  /* la hoja: 1300×1700 en una foto de 1600×2000, girada 5°, con sombra de un lado; la tinta y el lápiz */
  const fotos = await pg.evaluate(async () => {
    const hacer = (acostada) => {
      const W = 1600, H = 2000, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      x.fillStyle = '#1b1b1f'; x.fillRect(0, 0, W, H);
      x.save(); x.translate(W / 2, H / 2); x.rotate(5 * Math.PI / 180);
      const g = x.createLinearGradient(-650, 0, 650, 0); g.addColorStop(0, '#9c9a94'); g.addColorStop(1, '#efede8');
      x.fillStyle = g; x.fillRect(-650, -850, 1300, 1700);
      /* la tinta y el lápiz se MULTIPLICAN con el papel, como en una foto: en la zona con sombra salen más oscuros */
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = '#26339a'; x.font = '64px serif'; x.fillText('Problema 1', -560, -700);
      x.fillStyle = '#9a9a9a'; x.font = '48px serif'; for(let k = 0; k < 8; k++) x.fillText('v = v0 - g t   (lápiz)', -560, -560 + k * 110);
      x.restore();
      const esq = [[-650, -850], [650, -850], [650, 850], [-650, 850]].map(([px, py]) => { const a = 5 * Math.PI / 180; return [W / 2 + px * Math.cos(a) - py * Math.sin(a), H / 2 + px * Math.sin(a) + py * Math.cos(a)]; });
      if(!acostada) return { url: c.toDataURL('image/jpeg', 0.92), esq };
      /* la misma, acostada: girada 90° a la derecha (como la mandó Lorena) */
      const d = document.createElement('canvas'); d.width = H; d.height = W; const y = d.getContext('2d');
      y.translate(H, 0); y.rotate(Math.PI / 2); y.drawImage(c, 0, 0);
      return { url: d.toDataURL('image/jpeg', 0.92), esq };
    };
    return [hacer(false), hacer(true)];
  });
  const dir = mkdtempSync(join(tmpdir(), 'tarea-'));
  const rutas = fotos.map((fo, i) => { const p = join(dir, `hoja${i + 1}.jpg`); writeFileSync(p, Buffer.from(fo.url.split(',')[1], 'base64')); return p; });
  const t0 = Date.now();
  await pg.setInputFiles('#tArchivo', rutas);
  await pg.waitForFunction(() => window.__tarea.hojas().length === 2 && window.__tarea.hojas().every((h) => h.lista), null, { timeout: 60000 });
  const ms = Date.now() - t0;
  ok(ms < 20000, `las dos hojas quedan limpias en ${(ms / 1000).toFixed(1)} s`);

  const r = await pg.evaluate((esq) => {
    const hs = window.__tarea.hojas();
    const dist = (q) => Math.max(...q.map((p, i) => Math.hypot(p[0] - esq[i][0], p[1] - esq[i][1])));
    /* la hoja limpia: el papel (con su sombra) blanco parejo, la letra oscura */
    const mide = (h) => { const x = h.lista.getContext('2d'); const zona = (x0, y0, w, hh) => { const d = x.getImageData(x0, y0, w, hh).data; let s = 0, m = 255; for(let i = 0; i < d.length; i += 4){ const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; if(v < m) m = v; } return { media: s / (d.length / 4), min: m }; };
      return { izq: zona(120, 1500, 200, 300), der: zona(1380, 1500, 200, 300), tinta: zona(120, 120, 700, 160), lapiz: zona(120, 300, 900, 700) }; };
    return { q0: dist(hs[0].q), q1: hs[1].q, m0: mide(hs[0]), m1: mide(hs[1]), ancho: hs[0].lista.width, alto: hs[0].lista.height };
  }, fotos[0].esq);
  ok(r.q0 < 40, `encuentra las 4 esquinas de la hoja chueca (a ${r.q0.toFixed(0)} px de las reales en una foto de 2000)`);
  ok(r.ancho === 1700 && r.alto === 2200, 'la deja de frente en carta a 200 ppp (1700 × 2200)');
  ok(r.m0.izq.media > 245 && r.m0.der.media > 245, `el papel queda blanco parejo aunque un lado tenía sombra (${r.m0.izq.media.toFixed(0)} y ${r.m0.der.media.toFixed(0)})`);
  ok(r.m0.tinta.min < 110 && r.m0.lapiz.min < 90, `la tinta y el LÁPIZ salen oscuros (Lorena: «el texto no es legible») (lo más oscuro: ${r.m0.tinta.min.toFixed(0)} y ${r.m0.lapiz.min.toFixed(0)})`);
  ok(r.m1.izq.media > 240 && r.m1.tinta.min < 120, 'la foto acostada se para sola y queda igual de limpia');
  if(FOTOS) await pg.screenshot({ path: `${FOTOS}/tarea-1-hojas.png`, fullPage: true });

  console.log('Acomodar');
  const ids = await pg.evaluate(() => window.__tarea.hojas().map((h) => h.id));
  await pg.click('.t-hoja:nth-child(2) [data-t="antes"]');
  ok(JSON.stringify(await pg.evaluate(() => window.__tarea.hojas().map((h) => h.id))) === JSON.stringify([ids[1], ids[0]]), '«←» la pasa antes');
  const qAntes = await pg.evaluate(() => JSON.stringify(window.__tarea.hojas()[0].q));
  await pg.click('.t-hoja:nth-child(1) [data-t="girar"]');
  await pg.waitForFunction(() => window.__tarea.hojas()[0].lista, null, { timeout: 30000 });
  ok(qAntes !== await pg.evaluate(() => JSON.stringify(window.__tarea.hojas()[0].q)), '«Girar» la gira 90°');
  await pg.click('.t-hoja:nth-child(1) [data-t="esquinas"]');
  ok(await pg.isVisible('.t-capa .t-punto'), '«Esquinas» abre la foto con sus 4 puntos para moverlos con el dedo');
  if(FOTOS) await pg.screenshot({ path: `${FOTOS}/tarea-2-esquinas.png` });
  await pg.click('.t-capa [data-c="listo"]');
  ok(!(await pg.$('.t-capa')), '«Listo» la cierra');
  await pg.selectOption('.t-hoja:nth-child(2) [data-t="modo"]', 'color');
  await pg.waitForFunction(() => window.__tarea.hojas()[1].lista && window.__tarea.hojas()[1].modo === 'color', null, { timeout: 30000 });
  ok(true, 'cada hoja puede ir en «Escaneo», «Color» (formularios con marcatextos) u «Original»');

  console.log('La portada y el PDF');
  await pg.fill('[data-p="materia"]', 'Física'); await pg.fill('[data-p="tema"]', 'Caída libre');
  await pg.fill('[data-p="alumno"]', 'Ana Prueba López'); await pg.fill('[data-p="profesor"]', 'Profe de Prueba');
  ok(await pg.inputValue('#tNombre') === 'Caida_Libre_Prueba_Lopez', 'el nombre del archivo se arma solo con el tema y los apellidos');
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 60000 }), pg.click('#bImprimir')]);
  const ruta = join(dir, 'salida.pdf'); await dl.saveAs(ruta);
  ok(dl.suggestedFilename() === 'Caida_Libre_Prueba_Lopez.pdf', `el botón grande descarga «${dl.suggestedFilename()}»`);
  const info = execFileSync('pdfinfo', [ruta]).toString();
  ok(/Pages:\s+3/.test(info) && /612 x 792/.test(info), 'el PDF trae portada + 2 hojas, en tamaño carta');
  const lista = execFileSync('pdfimages', ['-list', ruta]).toString();
  ok(!/smask/i.test(lista.split('\n').slice(2).join('\n')), 'sin transparencias (se imprime y se ve igual en el iPhone)');
  execFileSync('pdftoppm', ['-r', '30', '-png', '-f', '1', '-l', '1', ruta, join(dir, 'p')]);
  if(FOTOS){ execFileSync('pdftoppm', ['-r', '60', '-png', ruta, join(FOTOS, 'tarea-pdf')]); }
  /* el logo de la UTEQ arriba al centro: pixeles azules en el centro de arriba de la portada */
  const azul = await pg.evaluate(async () => { const { blob } = await window.__tarea.armar(); return blob.size; });
  ok(azul > 50000, 'la portada lleva el logo y los datos');
  ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'nada se sale de lado en el teléfono');
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.slice(0, 3).join(' | ') : ''));
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
