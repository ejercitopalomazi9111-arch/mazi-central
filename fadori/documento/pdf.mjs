/* EL DOCUMENTO DEL PROYECTO SIN FILAS, hecho con la herramienta de Reportes.
   La retroalimentación (7.0, 21 de octubre) pidió la estructura de Metodología
   de la Investigación; Carlos: «usa la herramienta de reportes» y «usa
   mayoritariamente fotos actuales». Llena Reportes como en el teléfono —tipo
   «Proyecto», los datos, el texto de proyecto.md y las imágenes con su pie—,
   saca el PDF con el membrete del Bachillerato Rembrandt y rellena el índice
   con la página real de cada apartado (dos pasadas).

     python3 -m http.server 8800        (desde la raíz del repo)
     VIEJAS=<carpeta con 11-cooperativa.jpg> node fadori/documento/pdf.mjs [salida.pdf]

   Las fotos de la cooperativa (VIEJAS) no van al repo: es público y salen
   personas. Sin ellas, el documento sale igual sin la Imagen 11. */
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const BASE = process.env.BASE || 'http://localhost:8800';
const SAL = process.argv[2] || path.join(AQUI, 'Fadori-Proyecto-Sin-Filas.pdf');
const VIEJAS = process.env.VIEJAS || '';

const IMAGENES = [
  ['01-logo.jpg', 'Logotipo de Fadori', 45],
  ['02-alumno.jpg', 'La vista del alumno: el menú con fotos y su número de turno', 125],
  ['03-credencial.jpg', 'El paso de la credencial para crear la cuenta', 62],
  ['04-pantalla.jpg', 'La pantalla de turnos mientras pasa un anuncio de la escuela', 150],
  ['05-tablet.jpg', 'El modo tableta: quien no trae teléfono pide tocando la pantalla', 150],
  ['06-mostrador.jpg', 'La fila de pedidos en el mostrador de la cooperativa', 130],
  ['07-cobro.jpg', 'El cobro con calculadora de botones grandes', 70],
  ['08-estado-cuenta.jpg', 'Estado de cuenta de un fiado para los padres de familia (datos de prueba)', 85],
  ['09-medidor.jpg', 'El medidor: cifras del día y fila minuto a minuto (datos de prueba)', 68],
  ['10-carteles.jpg', 'Carteles de difusión con el código QR para abrir la aplicación', 150],
];
if(VIEJAS && fs.existsSync(path.join(VIEJAS, '11-cooperativa.jpg')))
  IMAGENES.push([path.join(VIEJAS, '11-cooperativa.jpg'), 'Evidencia de uso: la pantalla de turnos y el modo tableta en la cooperativa (primeras versiones, octubre de 2026)', 150]);

const TITULOS = [...fs.readFileSync(path.join(AQUI, 'proyecto.md'), 'utf8').matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]);

async function armar(paginas){
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await br.newPage({ viewport: { width: 390, height: 844 } });
  const errores = []; pg.on('pageerror', e => errores.push(String(e)));
  await pg.goto(BASE + '/reportes/', { waitUntil: 'networkidle' });
  await pg.click('[data-modo="reporte"].modo');
  await pg.click('[data-tipo="proyecto"]');
  const poner = (sel, v) => pg.evaluate(([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
  let cuerpo = fs.readFileSync(path.join(AQUI, 'proyecto.md'), 'utf8');
  cuerpo = cuerpo.replace(/\{\{([^}]+)\}\}/g, (_, t) => String(paginas[t] || '—'));
  if(IMAGENES.length < 11) cuerpo = cuerpo.replace(/ \(Imagen 11\)/, '').replace(/\n\[img:11\]\n/, '\n');
  await poner('#fTitulo', 'Fadori · Proyecto Sin Filas');
  await poner('#fFecha', '2026-10-21');
  await poner('#fGrupo', '3.1');
  await poner('#fPara', 'Docente de Metodología de la Investigación');
  await poner('#fLugar', 'Santiago de Querétaro, Qro.');
  await poner('#fSemestre', 'Tercero');
  await poner('#fTutor', '');
  await poner('#fPeriodo', 'Proyecto STEAM · ciclo agosto – diciembre 2026');
  await poner('#fAutor', 'Equipo del Proyecto Sin Filas');
  await poner('#fCargo', 'Grupo 3.1 · Bachillerato Rembrandt');
  await poner('#fAutor2', '');
  await poner('#fCargo2', '');
  await poner('#fCuerpo', cuerpo);
  await pg.setInputFiles('#fFoto', IMAGENES.map(([f]) => path.isAbsolute(f) ? f : path.join(AQUI, 'img', f)));
  await pg.waitForFunction(n => typeof R !== 'undefined' && R.evidencias.length >= n, IMAGENES.length, { timeout: 30000 });
  await pg.waitForTimeout(800);
  for(let k = 0; k < IMAGENES.length; k++) await poner(`[data-pie="${k}"]`, IMAGENES[k][1]);
  await pg.evaluate((anchos) => { anchos.forEach((a, k) => { R.evidencias[k].ancho = a; }); document.querySelector('#fCuerpo').dispatchEvent(new Event('input', { bubbles: true })); }, IMAGENES.map(i => i[2]));
  await pg.evaluate(() => { const s = document.querySelector('#oInstitucion'); s.value = 'rembrandt'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
  await pg.evaluate(() => { const s = document.querySelector('#oImpresion'); s.value = '1'; s.dispatchEvent(new Event('input', { bubbles: true })); });
  await pg.click('[data-vista="ver"]');
  await pg.waitForTimeout(1200);
  const hojas = await pg.evaluate(() => document.querySelectorAll('.hoja').length);
  await pg.emulateMedia({ media: 'print' });
  fs.writeFileSync(SAL, await pg.pdf({ width: '215.9mm', height: '279.4mm', margin: { top: 0, bottom: 0, left: 0, right: 0 }, printBackground: true, preferCSSPageSize: true }));
  await br.close();
  return { hojas, errores };
}

/* en qué página cae cada apartado: se busca después del índice */
function paginasDe(pdf){
  const n = +/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf]).toString())[1];
  const txt = Array.from({ length: n }, (_, i) => execFileSync('pdftotext', ['-f', String(i + 1), '-l', String(i + 1), '-layout', pdf, '-']).toString());
  const ind = txt.findIndex(t => /Índice/.test(t));
  const limpio = (s) => s.replace(/\s+/g, ' ').trim();
  const out = {};
  for(const t of TITULOS){
    for(let i = ind + 1; i < n; i++){
      /* los apartados salen en mayúsculas en la hoja */
      /* basta el principio («5. PREGUNTA DE»): un título largo se parte en dos renglones */
      const ini = t.toUpperCase().split(' ').slice(0, 3).join(' ');
      if(txt[i].split('\n').some(l => limpio(l).startsWith(ini))){ out[t] = i + 1; break; }   /* la marca de agua se cuela al final del renglón */
    }
  }
  return out;
}

let pag = {}, r;
for(let vuelta = 1; vuelta <= 3; vuelta++){
  r = await armar(pag);
  const nuevo = paginasDe(SAL);
  const igual = JSON.stringify(nuevo) === JSON.stringify(pag);
  pag = nuevo;
  console.log('vuelta', vuelta, '·', r.hojas, 'hojas ·', Object.keys(pag).length, 'de', TITULOS.length, 'apartados ubicados', igual ? '· índice estable' : '');
  if(igual) break;
}
const faltan = TITULOS.filter(t => !pag[t]);
console.log('✓', SAL, faltan.length ? '· sin página: ' + faltan.join(', ') : '', r.errores.length ? '· errores: ' + r.errores.join(' | ') : '');
