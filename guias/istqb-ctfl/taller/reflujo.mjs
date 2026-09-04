/* El lector de marcado de reportes/index.html junta los renglones sueltos de un
   párrafo, PERO no los de una viñeta: una lista sólo absorbe renglones que
   empiezan con guion. Un texto envuelto a 78 columnas se parte en «lista de una
   línea + párrafo suelto» en CADA viñeta larga.
   Y hay un segundo mordisco: un renglón de continuación con dos puntos temprano
   ("cuatro cosas distintas: esta pregunta se cae sola") pasa la prueba de
   «ficha de datos» y rompe el párrafo en una etiqueta.
   Los dos se evitan igual: un bloque, un renglón. */
import { readFileSync, writeFileSync } from 'node:fs';

/* Las únicas fichas de datos de verdad del documento. Todo lo demás que tenga
   dos puntos es prosa y se junta. */
const CAMPO = /^(País|Teléfono|Correo|Sitio|Formato|Duración|Puntaje para aprobar|Idioma|Tiempo extra|Material):\s/;
const SOLO  = (t)=> !t || /^\|/.test(t) || /^#{1,6}\s/.test(t) ||
                    /^\[(hoja|img:\d+)\]$/i.test(t) || /^-{3,}$/.test(t) || CAMPO.test(t);
const VINETA = /^([-*•·–])\s+/;
const NUM    = /^\d+[.)]\s+/;

const src = readFileSync(process.argv[2],'utf8').replace(/\r/g,'').split('\n');
const out = [];
let i = 0;
while(i < src.length){
  const t = src[i].trim();

  if(SOLO(t)){ out.push(t); i++; continue; }

  if(/^>\s?/.test(t)){
    const p = [];
    while(i < src.length && /^\s*>\s?/.test(src[i])){ p.push(src[i].trim().replace(/^>\s?/,'')); i++; }
    out.push('> ' + p.join(' ')); continue;
  }

  if(VINETA.test(t) || NUM.test(t)){
    const p = [t];
    i++;
    /* la continuación de una viñeta viene sangrada y no abre viñeta nueva */
    while(i < src.length && /^\s{1,}\S/.test(src[i]) && !SOLO(src[i].trim()) &&
          !VINETA.test(src[i].trim()) && !NUM.test(src[i].trim()) && !/^>/.test(src[i].trim())){
      p.push(src[i].trim()); i++;
    }
    out.push(p.join(' ')); continue;
  }

  const p = [];
  while(i < src.length){
    const x = src[i].trim();
    if(SOLO(x) || VINETA.test(x) || NUM.test(x) || /^>/.test(x)) break;
    p.push(x); i++;
  }
  out.push(p.join(' '));
}
writeFileSync(process.argv[3], out.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n');
console.log('renglones', src.length, '→', out.length);
