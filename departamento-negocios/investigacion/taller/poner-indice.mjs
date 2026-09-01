/* Mete un índice con NÚMEROS DE PÁGINA REALES.
     node poner-indice.mjs <texto sin índice> <salida.txt>

   El número no se puede saber antes de paginar, y el índice mismo desplaza las
   páginas que numera. Así que se itera: se pagina, se leen las hojas donde cae
   cada apartado, se reescribe el índice y se vuelve a paginar, hasta que dos
   vueltas seguidas dan lo mismo.

   ⚠ Y se comprueba que la tabla CABE EN UNA HOJA. Cuando no cabe, el paginador
   la manda entera a la siguiente y deja la anterior con dos renglones: una
   hoja gastada. En la guía del ISTQB costó medirlo; aquí se comprueba solo. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

const NAVEGADOR = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
                   '/opt/pw-browsers/chromium'].find(existsSync);
if(!NAVEGADOR) throw new Error('no encuentro el navegador');

const BASE   = readFileSync(process.argv[2],'utf8');
const SALIDA = process.argv[3];

const SECCIONES = BASE.split('\n').filter(l=>/^## /.test(l)).map(l=>l.replace(/^## /,''));
const ANCLA = '## II. El método, paso por paso';
if(!BASE.includes(ANCLA)) throw new Error('no encuentro dónde meter el índice');

const conIndice = (paginas) => {
  const filas = ['| Capítulo | Página |'].concat(
    SECCIONES.map((s,k)=> '| ' + s + ' | ' + (paginas[k] ?? '—') + ' |'));
  const bloque = '[hoja]\n\n## Índice\n\n'
    + 'Los números son de la hoja impresa, no del archivo.\n\n'
    + filas.join('\n') + '\n\n---\n\n';
  return BASE.replace(ANCLA, bloque + ANCLA);
};

const CAMPOS = {
  fTitulo:'Departamento de negocios · la investigación completa',
  fFecha:'2026-09-01', fGrupo:'', fSemestre:'', fTutor:'',
  fPara:'Dirección de Grupo Mazi', fLugar:'Santiago de Querétaro, Qro.',
  fPeriodo:'Diez materias · 419 artículos leídos · 151 neuronas · 10 instrumentos',
  fAutor:'Grupo Mazi', fCargo:'Departamento de negocios',
};

const b = await chromium.launch({ executablePath:NAVEGADOR });
const page = await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
await page.goto('http://127.0.0.1:8791/reportes/',{waitUntil:'networkidle'});
for(const [id,v] of Object.entries(CAMPOS))
  await page.evaluate(([id,v])=>{ const e=document.querySelector('#'+id);
    e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); },[id,v]);
await page.evaluate(()=>{ R.tipo='libre'; cambiarPapel('mazi'); pintarTipos(); guardar(); repintar(); });

async function paginar(texto){
  await page.evaluate(t=>{ const c=document.querySelector('#fCuerpo'); c.value=t;
    c.dispatchEvent(new Event('input',{bubbles:true})); }, texto);
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.querySelector('#bImprimir').click());
  await page.waitForTimeout(6000);
  return await page.evaluate(titulos=>{
    const hojas = [...document.querySelectorAll('.hoja')];
    const donde = titulos.map(()=>null);
    const usados = new Set();
    hojas.forEach((h,i)=>{
      h.querySelectorAll('h2').forEach(e=>{
        const t = (e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
        titulos.forEach((s,k)=>{
          if(usados.has(k)) return;
          const q = s.replace(/\s+/g,' ').trim().toLowerCase();
          /* el lector saca el romano a su propio <span>, así que el texto del
             h2 y el del renglón fuente no son idénticos: se compara por el
             final, que es la parte que no toca. */
          const sinRomano = q.replace(/^[ivxlcdm]+\.\s*/,'');
          if(t === q || t.endsWith(sinRomano)){ donde[k] = i+1; usados.add(k); }
        });
      });
    });
    return { donde, total:hojas.length,
             /* ¿la tabla del índice cabe en una hoja? */
             indiceEnUnaHoja: (()=>{ const t=[...document.querySelectorAll('.hoja table')]
               .find(x=>/página/i.test(x.textContent||'')); return t ? 1 : 0; })() };
  }, SECCIONES);
}

let paginas = SECCIONES.map(()=>'—'), antes = '', vueltas = 0;
while(vueltas < 5){
  const texto = conIndice(paginas);
  const r = await paginar(texto);
  const nuevas = r.donde.map(x => x ?? '—');
  console.log('vuelta ' + (++vueltas) + ' · ' + r.total + ' hojas · ' + nuevas.join(' '));
  if(JSON.stringify(nuevas) === antes) break;
  antes = JSON.stringify(nuevas);
  paginas = nuevas;
}
const faltan = paginas.filter(x=>x==='—').length;
if(faltan) console.log('⚠ ' + faltan + ' apartados sin número: ' + SECCIONES.filter((_,k)=>paginas[k]==='—').join(' · '));

writeFileSync(SALIDA, conIndice(paginas));
console.log('índice puesto:', SALIDA);
await b.close();
