/* SECRE · lo que sabe de los negocios de Carlos (Grupo Mazi, All's, Geraldmed y él).
   Vive en secre/conocimiento/*.md: se cambia ahí, en palabras normales, y Secre lo lee al
   arrancar. Es el mismo para sus dos cuentas (Carlos, 4 nov: «que se pueda intercomunicar su
   memoria de negocios con la personal»). */
import fs from 'fs'; import path from 'path';
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'conocimiento');
export function cargarConocimiento(dir = DIR){
  try{ return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8').trim()).join('\n\n'); }
  catch{ return ''; }
}
