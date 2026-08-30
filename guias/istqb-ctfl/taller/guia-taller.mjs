/* Carga la guía en la herramienta de reportes, la pagina, saca el PDF y
   fotografía las hojas que se le pidan.
     node guia-taller.mjs <texto> <salida.pdf> [hojas separadas por coma]

   DOS COSAS QUE YA FALLARON Y ESTÁN AQUÍ POR ESO:
   1 · El selector de institución escucha `input`, NO `change`. Mandando
       `change` el documento salió entero con el membrete del Rembrandt y su
       marca de agua, en un documento de Grupo Mazi. Se llama a `cambiarPapel`,
       que es la función que los dos caminos de la herramienta comparten.
   2 · Los campos de grupo, semestre y tutor vienen guardados de un reporte
       escolar anterior: si no se vacían, el membrete dice «Grupo 3.1». */
import { readFileSync, writeFileSync } from 'node:fs';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

import { dirname } from 'node:path';
/* las capturas caen junto al PDF, o en el directorio actual si no se pide PDF */
const S = (process.argv[3] && process.argv[3] !== '-') ? dirname(process.argv[3]) : '.';
const TEXTO  = readFileSync(process.argv[2],'utf8');
const SALIDA = process.argv[3];
const HOJAS  = (process.argv[4]||'').split(',').filter(Boolean).map(Number);

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const page = await (await b.newContext({ viewport:{width:1440,height:1000}, deviceScaleFactor:2 })).newPage();
const err=[]; page.on('pageerror',e=>err.push(String(e)));
await page.goto('http://127.0.0.1:8791/reportes/',{waitUntil:'networkidle'});

const campos = {
  fTitulo:'Guía de estudio ISTQB Foundation Level (CTFL)',
  fFecha:'2026-08-30',
  fGrupo:'', fSemestre:'', fTutor:'',
  fPara:'Candidatas y candidatos a Grupo Mazi',
  fLugar:'Santiago de Querétaro, Qro.',
  fPeriodo:'Temario oficial v4.0 · curso completo, guía y tres exámenes',
  fAutor:'Grupo Mazi',
  fCargo:'Departamento de formación',
};
for(const [id,v] of Object.entries(campos))
  await page.evaluate(([id,v])=>{ const e=document.querySelector('#'+id);
    if(!e) throw new Error('no existe #'+id);
    e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); },[id,v]);

await page.evaluate(t=>{ const c=document.querySelector('#fCuerpo'); c.value=t;
  c.dispatchEvent(new Event('input',{bubbles:true})); }, TEXTO);

/* Tres ajustes EN MEMORIA. Ninguno toca el repo de Carlos; los tres son de una
   línea si algún día quiere dejarlos fijos.
   · el lema de fábrica de `mazi` dice «Jefatura de grupo · 3.1»
   · el rótulo sobre el título salía «REPORTE DE INCIDENCIA»
   · el folio empieza en «IR-» (Instituto Rembrandt) en un documento de Mazi
   ORDEN IMPORTANTE: primero el tipo, después el papel. Cambiar de tipo mueve
   el papel solo (PAPEL_POR_AREA), así que si se hace al revés el documento se
   vuelve a poner en papel del Rembrandt. */
await page.evaluate(()=>{
  R.tipo = 'libre';
  const T = TIPOS.find(t=>t.id==='libre');
  T.etiqueta = 'Guía de estudio y curso completo';
  INSTITUCIONES.mazi.compuesta.lema = 'Formación y certificación';
  const folioOriginal = folio;
  folio = (r)=> folioOriginal(r).replace(/^IR-/, 'GM-');
  cambiarPapel('mazi');
  pintarTipos(); guardar(); repintar();
});
await page.waitForTimeout(1500);

const papel = await page.evaluate(()=>R.formato.institucion);
if(papel !== 'mazi') throw new Error('el papel quedó en «'+papel+'», no en mazi');
console.log('papel:', papel);

await page.evaluate(()=>document.querySelector('#bImprimir').click());
await page.waitForTimeout(3000);
await page.evaluate(()=>{ const p=document.querySelector('.pila')||document.querySelector('#pila');
  if(p){ p.style.transform='none'; p.style.height=''; } });

const total = await page.evaluate(()=>document.querySelectorAll('.hoja').length);
console.log('hojas:', total);

if(SALIDA && SALIDA !== '-'){
  const pdf = await page.pdf({ format:'Letter', printBackground:true,
    margin:{top:'12.7mm',bottom:'12.7mm',left:'12.7mm',right:'12.7mm'} });
  writeFileSync(SALIDA, pdf);
  console.log('PDF:', SALIDA, (pdf.length/1048576).toFixed(1)+' MB');
}
for(const n of HOJAS){
  const h = page.locator('.hoja').nth(n-1);
  if(await h.count()===0){ console.log('  no existe la hoja', n); continue; }
  await h.screenshot({ path:`${S}/hoja-${n}.png` });
  console.log('  hoja', n);
}
if(err.length) console.log('ERRORES:\n'+err.join('\n'));
await b.close();
