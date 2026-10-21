/* EL DOCUMENTO DE RADIO DIVERGENTES, hecho con la herramienta de Reportes.
   Llena Reportes como lo haría Carlos en el teléfono —tipo «Proyecto», los
   datos, el texto de proyecto.md y el logo como evidencia 1— y lo guarda en
   PDF con el membrete oficial del Bachillerato Rembrandt.

     python3 -m http.server 8800        (desde la raíz del repo)
     node podcast/presentacion/pdf.mjs [http://localhost:8800] [salida.pdf] */
import fs from 'fs'; import path from 'path';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const BASE = process.argv[2] || 'http://localhost:8800';
const SAL = process.argv[3] || path.join(AQUI, 'Radio-Divergentes-proyecto.pdf');

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await br.newPage({ viewport: { width: 390, height: 844 } });
const errores = []; pg.on('pageerror', e => errores.push(String(e)));
await pg.goto(BASE + '/reportes/', { waitUntil: 'networkidle' });
await pg.click('[data-modo="reporte"].modo');
await pg.click('[data-tipo="proyecto"]');
const poner = (sel, v) => pg.evaluate(([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
/* Carlos, 21 de octubre: «Proyecto podcast Radio Divergentes», de la materia
   de Ética para el grupo 3.1; Bachillerato Rembrandt, no Instituto */
await poner('#fTitulo', 'Proyecto podcast Radio Divergentes');
await poner('#fFecha', '2026-10-21');
await poner('#fGrupo', '3.1');
await poner('#fPara', 'Dirección y padres de familia');
await poner('#fLugar', 'Santiago de Querétaro, Qro.');
await poner('#fSemestre', 'Tercero');
await poner('#fTutor', '');
await poner('#fPeriodo', 'Materia de Ética · ciclo 2026-2027 · modalidad STEAM');
await poner('#fAutor', 'Omar Ávila Cruz');
await poner('#fCargo', 'Profesor encargado del proyecto');
await poner('#fAutor2', 'Carlos Eduardo Gutiérrez Guevara');
await poner('#fCargo2', 'Jefe de grupo 3.1');
await poner('#fCuerpo', fs.readFileSync(path.join(AQUI, 'proyecto.md'), 'utf8'));
await pg.setInputFiles('#fFoto', path.join(AQUI, '..', 'marca', 'radio-divergentes.png'));
await pg.waitForTimeout(800);
await poner('[data-pie="0"]', 'Logo oficial de Radio Divergentes');
/* un logotipo no quiere los 156 mm de la columna */
await pg.evaluate(() => { R.evidencias[0].ancho = 62; document.querySelector('#fCuerpo').dispatchEvent(new Event('input', { bubbles: true })); });
await pg.waitForTimeout(400);
/* la hoja completa, sin el encogido para Safari: esto sale directo a PDF */
/* el membrete real del Instituto (salió de su .docx), no el de la Sociedad */
await pg.evaluate(() => { const s = document.querySelector('#oInstitucion'); s.value = 'rembrandt'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
await pg.evaluate(() => { const s = document.querySelector('#oImpresion'); s.value = '1'; s.dispatchEvent(new Event('input', { bubbles: true })); });
await pg.click('[data-vista="ver"]');
await pg.waitForTimeout(900);
const hojas = await pg.evaluate(() => document.querySelectorAll('.hoja').length);
await pg.emulateMedia({ media: 'print' });
fs.writeFileSync(SAL, await pg.pdf({ width: '215.9mm', height: '279.4mm', margin: { top: 0, bottom: 0, left: 0, right: 0 }, printBackground: true, preferCSSPageSize: true }));
await br.close();
console.log('✓', SAL, hojas + ' hojas', errores.length ? '· errores: ' + errores.join(' | ') : '');
