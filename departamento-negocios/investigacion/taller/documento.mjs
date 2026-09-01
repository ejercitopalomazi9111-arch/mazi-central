/* Carga el texto en la herramienta de reportes, lo pagina, saca el PDF y
   fotografía las hojas que se le pidan.
     node documento.mjs <texto> <salida.pdf> [hojas separadas por coma]

   Hace falta el repo servido en http://127.0.0.1:8791 (por ejemplo con
   `python3 -m http.server 8791` desde la raíz).

   TRES COSAS QUE YA FALLARON Y ESTÁN AQUÍ POR ESO:
   1 · Los campos escuchan `input`, NO `change`. Mandando `change` el documento
       salió entero con el membrete del Rembrandt en un documento de Mazi.
   2 · ORDEN: primero el tipo de reporte, después el papel. Cambiar de tipo
       mueve el papel solo (PAPEL_POR_AREA), así que al revés se vuelve a poner
       en papel del Rembrandt.
   3 · La ruta del navegador se busca en una lista en vez de estar clavada, y
       si ninguna existe se dice cuál se buscó en vez de morir con un «no such
       file» que no explica nada. Hoy `/opt/pw-browsers/chromium` es un enlace
       a la carpeta con versión y las dos valen; el día que el enlace no esté,
       esto sigue corriendo. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

const RUTAS = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
               '/opt/pw-browsers/chromium'];
const NAVEGADOR = RUTAS.find(existsSync);
if(!NAVEGADOR) throw new Error('no encuentro el navegador; busqué en:\n  ' + RUTAS.join('\n  '));

const S = (process.argv[3] && process.argv[3] !== '-') ? dirname(process.argv[3]) : '.';
const TEXTO  = readFileSync(process.argv[2],'utf8');
const SALIDA = process.argv[3];
const HOJAS  = (process.argv[4]||'').split(',').filter(Boolean).map(Number);

export const CAMPOS = {
  fTitulo:'Departamento de negocios · la investigación completa',
  fFecha:'2026-09-01',
  fGrupo:'', fSemestre:'', fTutor:'',
  fPara:'Dirección de Grupo Mazi',
  fLugar:'Santiago de Querétaro, Qro.',
  fPeriodo:'Diez materias · 419 artículos leídos · 151 neuronas · 10 instrumentos',
  fAutor:'Grupo Mazi',
  fCargo:'Departamento de negocios',
};

const b = await chromium.launch({ executablePath:NAVEGADOR });
const page = await (await b.newContext({ viewport:{width:1440,height:1000}, deviceScaleFactor:2 })).newPage();
const err=[]; page.on('pageerror',e=>err.push(String(e)));
await page.goto('http://127.0.0.1:8791/reportes/',{waitUntil:'networkidle'});

for(const [id,v] of Object.entries(CAMPOS))
  await page.evaluate(([id,v])=>{ const e=document.querySelector('#'+id);
    if(!e) throw new Error('no existe #'+id);
    e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); },[id,v]);

await page.evaluate(t=>{ const c=document.querySelector('#fCuerpo'); c.value=t;
  c.dispatchEvent(new Event('input',{bubbles:true})); }, TEXTO);

/* Ajustes EN MEMORIA. Ninguno toca el repo de Carlos. */
await page.evaluate(()=>{
  R.tipo = 'libre';
  const T = TIPOS.find(t=>t.id==='libre');
  T.etiqueta = 'Expediente de investigación';
  INSTITUCIONES.mazi.compuesta.lema = 'Departamento de negocios';
  const folioOriginal = folio;
  folio = (r)=> folioOriginal(r).replace(/^IR-/, 'GM-');
  cambiarPapel('mazi');
  pintarTipos(); guardar(); repintar();
});
await page.waitForTimeout(1500);

const papel = await page.evaluate(()=>R.formato.institucion);
if(papel !== 'mazi') throw new Error('el papel quedó en «'+papel+'», no en mazi');

await page.evaluate(()=>document.querySelector('#bImprimir').click());
await page.waitForTimeout(6000);
await page.evaluate(()=>{ const p=document.querySelector('.pila')||document.querySelector('#pila');
  if(p){ p.style.transform='none'; p.style.height=''; } });

const total = await page.evaluate(()=>document.querySelectorAll('.hoja').length);
console.log('papel:', papel, '· hojas:', total);

/* ¿algo se sale de su hoja? lo contesta el navegador, no yo.

   ⚠ DOS VECES ME MINTIÓ ESTA MISMA COMPROBACIÓN, Y LAS DOS ESTÁN AQUÍ:
   1 · La primera versión sólo miraba el ANCHO. Dijo «ninguno» sobre un
       documento en el que la última fila de varias tablas salía cortada por el
       pie. Se vio mirando la foto de la hoja 75, no ejecutando nada.
   2 · La segunda ya medía el alto, y siguió diciendo «ninguno» — porque medía
       contra `.doc`, que es el contenedor del texto y SE DESBORDA TAMBIÉN. Un
       elemento nunca se sale de una caja que se sale con él. Hay que medir
       contra la hoja, que es lo que recorta, y contra el pie, que es lo que
       tapa. Medido: hoja 88, la última celda acababa 9 461 px por debajo. */
const desbordes = await page.evaluate(()=>{
  const out=[];
  document.querySelectorAll('.hoja').forEach((h,i)=>{
    const rh = h.getBoundingClientRect();
    const pie = h.querySelector('.folio-pie');
    const tope = pie ? Math.min(rh.bottom, pie.getBoundingClientRect().top) : rh.bottom;
    h.querySelectorAll('td,th,li,p,h1,h2,h3').forEach(e=>{
      if(e.closest('.folio-pie') || e.closest('.membrete-sup') || e.closest('.membrete-inf')) return;
      const r=e.getBoundingClientRect();
      const lados = r.right > rh.right - 1 || r.left < rh.left - 1;
      const abajo = r.bottom > tope + 1;
      if(lados || abajo)
        out.push({hoja:i+1, tag:e.tagName, eje:abajo?'abajo':'lados',
                  sobra:Math.round(r.bottom - tope),
                  txt:(e.textContent||'').replace(/\s+/g,' ').slice(0,46)});
    });
  });
  out.sort((a,b)=>b.sobra-a.sobra);
  /* una fila cortada arrastra a sus hermanas: se cuenta por hoja */
  const hojas = [...new Set(out.map(x=>x.hoja))];
  return { out, hojas };
});
console.log('desbordes:', desbordes.out.length
  ? desbordes.out.length + ' en ' + desbordes.hojas.length + ' hojas: ' +
    desbordes.hojas.join(', ') + '\n' + JSON.stringify(desbordes.out.slice(0,6),null,1)
  : 'ninguno');

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
