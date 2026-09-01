import { readFileSync } from 'node:fs';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
const TEXTO = readFileSync(process.argv[2],'utf8');
const NS = process.argv[3].split(',').map(Number);
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const page = await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
await page.goto('http://127.0.0.1:8791/reportes/',{waitUntil:'networkidle'});
const campos = { fTitulo:'Guía de estudio ISTQB Foundation Level (CTFL)', fFecha:'2026-08-30',
  fGrupo:'', fSemestre:'', fTutor:'', fPara:'Candidatas y candidatos a Grupo Mazi',
  fLugar:'Santiago de Querétaro, Qro.', fPeriodo:'Temario oficial v4.0 · curso completo, guía y tres exámenes',
  fAutor:'Grupo Mazi', fCargo:'Departamento de formación' };
for(const [id,v] of Object.entries(campos))
  await page.evaluate(([id,v])=>{ const e=document.querySelector('#'+id); e.value=v;
    e.dispatchEvent(new Event('input',{bubbles:true})); },[id,v]);
await page.evaluate(t=>{ const c=document.querySelector('#fCuerpo'); c.value=t;
  c.dispatchEvent(new Event('input',{bubbles:true})); }, TEXTO);
await page.evaluate(()=>{ R.tipo='libre'; TIPOS.find(t=>t.id==='libre').etiqueta='Guía de estudio y curso completo';
  INSTITUCIONES.mazi.compuesta.lema='Formación y certificación';
  const fo=folio; folio=(r)=>fo(r).replace(/^IR-/,'GM-'); cambiarPapel('mazi');
  pintarTipos(); guardar(); repintar(); });
await page.waitForTimeout(1400);
await page.evaluate(()=>document.querySelector('#bImprimir').click());
await page.waitForTimeout(2800);
const out = await page.evaluate(()=>{
  const h=[...document.querySelectorAll('.hoja')];
  return h.map((x,i)=>{
    const z=x.querySelector('.doc')||x;
    const alto=x.querySelector('.zona')?.clientHeight||1;
    const usado=Math.round(z.getBoundingClientRect().height);
    return { n:i+1, pct:Math.round(usado*100/alto), usado,
             txt:z.textContent.replace(/\s+/g,' ').trim().slice(0,60) };
  });
});
const flojas = out.filter(o=>o.pct < 45);
const llenas = out.filter(o=>o.pct > 100);
console.log('hojas: '+out.length+' · media de ocupación '
  + Math.round(out.reduce((a,o)=>a+o.pct,0)/out.length) + '%');
console.log('hojas con menos del 45% usado:');
for(const o of flojas) console.log('  '+o.n+'  '+o.pct+'%  '+o.txt);
if(!flojas.length) console.log('  ninguna');
console.log('hojas DESBORDADAS (contenido recortado):');
for(const o of llenas) console.log('  '+o.n+'  '+o.pct+'%  '+o.txt);
if(!llenas.length) console.log('  ninguna');
await b.close();
