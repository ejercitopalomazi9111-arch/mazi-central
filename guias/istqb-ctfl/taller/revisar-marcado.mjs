/* Comprueba el texto de la guía contra los MISMOS regex del lector de marcado
   de reportes/index.html, para cazar renglones que se van a interpretar como
   algo que no son: ficha de datos, renglón de incidencia, apartado en
   mayúsculas o subtítulo numerado. */
import { readFileSync } from 'node:fs';
const lineas = readFileSync(process.argv[2],'utf8').replace(/\r/g,'').split('\n');

const ETIQUETAS = /^(tipo|fecha|hora|momento|frecuencia|periodo|per[ií]odo|lugar|semestre|tutor|grupo|jefe de grupo|responsables?|involucrados?|reportado por|firma|asunto|dirigido a|elaborado por|instituto)$/i;
const esCampo = (x)=>{
  if(/^\s*\*\*[^*]{1,42}?(:\*\*|\*\*:)\s*/.test(x)) return true;
  const m = x.trim().match(/^([^:*|>#]{2,30}):\s+(\S.{0,110})$/);
  return !!m && (ETIQUETAS.test(m[1].trim()) || (m[1].trim().split(/\s+/).length <= 3 && m[2].length <= 70));
};
const esViñeta = (x)=> /^\s*([-*•·–]|•)\s+/.test(x);
const esNum = (x)=> /^\s*\d+[.)]\s+/.test(x);

let n = 0;
const avisa = (i, que) => { n++; console.log(`  ${que}  línea ${i+1}: ${lineas[i]}`); };

for(let i=0;i<lineas.length;i++){
  const t = lineas[i].trim();
  if(!t) continue;
  /* OJO: aquí saltaba también los renglones que empiezan por `#`, y por eso
     este revisor NO pudo ver el defecto que sí se vio en la hoja impresa:
     «### ECOSISTEMAS» salía con los tres gatos delante. Un revisor que se
     salta justo el caso que falla no revisa nada. Se saltan tablas y citas,
     nada más; los títulos se comprueban con la misma regla del lector. */
  if(/^\|/.test(t) || /^>\s?/.test(t)) continue;

  /* apartado en mayúsculas — la regla del lector corre ANTES que la de `###` */
  if(t.length > 3 && t.length < 90 && !/[.;]$/.test(t) &&
     t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(t) && !/^\||^#|^\d+[.)]/.test(t))
    avisa(i,'MAYÚSCULAS→h2');

  if(/^#{1,6}\s/.test(t)) continue;

  /* romano al principio */
  const mr = t.match(/^([IVXLCDM]{1,7})[.)]\s+(\S.*)$/);
  if(mr && mr[2].length < 110) avisa(i,'ROMANO→h2');

  /* numerado corto seguido de línea en blanco → h3 en vez de lista */
  if(esNum(t) && t.length < 64 && !/[.;:]$/.test(t) &&
     (i+1 >= lineas.length || !lineas[i+1].trim()) && !esNum((lineas[i+2]||'').trim()))
    avisa(i,'NUMERADO→h3');

  if(esViñeta(t) || esNum(t)) continue;

  /* "Marco — 09:42 h" */
  const mq = t.match(/^([^—–\-|*#>][^—–]{0,60}?)\s+[—–]\s+(.{1,44})$/);
  if(mq && !/[;:]$/.test(mq[1]) && !/\w{4,}\.$/.test(mq[1].trim()) &&
     (i+1 < lineas.length) && lineas[i+1].trim())
    avisa(i,'GUIÓN→incidencia');

  /* ficha de datos donde debería haber prosa */
  if(esCampo(t)) avisa(i,'CAMPO→ficha');
}
console.log(n ? `\n${n} renglones que hay que revisar` : '\nsin sorpresas de marcado');
