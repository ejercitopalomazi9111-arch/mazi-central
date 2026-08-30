/* Mete un índice con NÚMEROS DE PÁGINA REALES.
   El número no se puede saber antes de paginar, y el índice mismo desplaza las
   páginas que numera. Así que se itera: se pagina, se leen las hojas donde cae
   cada apartado, se reescribe el índice y se vuelve a paginar, hasta que dos
   vueltas seguidas dan lo mismo. Converge en dos o tres. */
import { readFileSync, writeFileSync } from 'node:fs';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

const BASE   = readFileSync(process.argv[2],'utf8');
const SALIDA = process.argv[3];

/* Los tres apartados del directorio son partes de un mismo capítulo: en el
   índice sobran, y con ellos la tabla pasa de 21 renglones y ya no cabe en una
   hoja. Cuando no cabe, el paginador la manda ENTERA a la siguiente y deja la
   anterior con dos renglones: una hoja gastada. Medido, no supuesto. */
const FUERA = ['Centros acreditados con CTFL', 'Otros centros del mismo padrón',
               'Los consejos, que es a donde se llama cuando nadie contesta'];
const SECCIONES = BASE.split('\n').filter(l=>/^## /.test(l)).map(l=>l.replace(/^## /,''))
                      .filter(s=>!FUERA.includes(s));
const ANCLA = '## I. Fundamentos de las pruebas';
if(!BASE.includes(ANCLA)) throw new Error('no encuentro dónde meter el índice');

const conIndice = (paginas) => {
  const filas = ['| Apartado | Página |'].concat(
    SECCIONES.map((s,k)=> '| ' + s + ' | ' + (paginas[k] ?? '—') + ' |'));
  const bloque = '[hoja]\n\n## Índice\n\n'
    + 'Los números son de la hoja impresa, no del archivo.\n\n'
    + filas.join('\n') + '\n\n---\n\n';
  return BASE.replace(ANCLA, bloque + ANCLA);
};

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const page = await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
const err=[]; page.on('pageerror',e=>err.push(String(e)));
await page.goto('http://127.0.0.1:8791/reportes/',{waitUntil:'networkidle'});
const campos = { fTitulo:'Guía de estudio ISTQB Foundation Level (CTFL)', fFecha:'2026-08-30',
  fGrupo:'', fSemestre:'', fTutor:'', fPara:'Candidatas y candidatos a Grupo Mazi',
  fLugar:'Santiago de Querétaro, Qro.', fPeriodo:'Temario oficial v4.0 · curso completo, guía y tres exámenes',
  fAutor:'Grupo Mazi', fCargo:'Departamento de formación' };
for(const [id,v] of Object.entries(campos))
  await page.evaluate(([id,v])=>{ const e=document.querySelector('#'+id); e.value=v;
    e.dispatchEvent(new Event('input',{bubbles:true})); },[id,v]);
await page.evaluate(()=>{ R.tipo='libre'; TIPOS.find(t=>t.id==='libre').etiqueta='Guía de estudio y curso completo';
  INSTITUCIONES.mazi.compuesta.lema='Formación y certificación';
  const fo=folio; folio=(r)=>fo(r).replace(/^IR-/,'GM-'); cambiarPapel('mazi');
  pintarTipos(); guardar(); repintar(); });

const paginar = async (texto) => {
  await page.evaluate(t=>{ const c=document.querySelector('#fCuerpo'); c.value=t;
    c.dispatchEvent(new Event('input',{bubbles:true})); }, texto);
  await page.waitForTimeout(1200);
  await page.evaluate(()=>document.querySelector('#bImprimir').click());
  await page.waitForTimeout(2500);
  return await page.evaluate((SEC)=>{
    const hojas = [...document.querySelectorAll('.hoja')];
    /* se busca el H2 exacto, no el texto suelto: «Examen 1» aparece también en
       el plan de estudio y devolvería la hoja equivocada */
    return { total: hojas.length, paginas: SEC.map(s=>{
      const i = hojas.findIndex(h => [...h.querySelectorAll('h2')]
        .some(t => t.textContent.trim() === s.replace(/^([IVX]+)\.\s+/, '$1. ')));
      return i < 0 ? null : i+1;
    })};
  }, SECCIONES);
};

let paginas = SECCIONES.map(()=>'—'), previo = '', texto = '';
for(let v=1; v<=5; v++){
  texto = conIndice(paginas);
  const r = await paginar(texto);
  console.log('vuelta '+v+': '+r.total+' hojas · '+r.paginas.filter(x=>x).length+'/'+SECCIONES.length+' apartados localizados');
  const firma = r.paginas.join(',');
  if(firma === previo){ console.log('estable'); break; }
  previo = firma; paginas = r.paginas;
}
const faltan = paginas.filter(x=>!x).length;
if(faltan) console.log('⚠ ' + faltan + ' apartados sin número');
writeFileSync(SALIDA, conIndice(paginas));
if(err.length) console.log('ERRORES:\n'+err.join('\n'));
await b.close();
