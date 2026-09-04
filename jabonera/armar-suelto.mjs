#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · LA VERSIÓN DE UN SOLO ARCHIVO
   ──────────────────────────────────────────────────────────────────────────
   `node jabonera/armar-suelto.mjs` → `jabonera/jabonera.html`

   Un archivo suelto que se copia a una memoria, se manda por correo o se
   abre con doble clic en la computadora del salón, sin internet y sin
   servidor. Para un proyecto escolar eso no es un lujo: es la diferencia
   entre que exista el día del examen y que no.

   Se genera, no se escribe a mano — igual que `sitio.html` en la raíz del
   repo. Si hay que cambiarle algo, se cambia el original y se vuelve a
   correr esto.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const leer = f => readFile(join(DIR, f), 'utf8');

const [html, css, motor, excel, datos, app] = await Promise.all(
  ['index.html','estilo.css','motor.js','excel.js','datos.js','app.js'].map(leer));

/* `</script>` dentro de una cadena de JavaScript cierra la etiqueta del HTML
   y parte el archivo por la mitad. Pasa de verdad y es de las que cuesta
   media hora encontrar, así que se escapa siempre. */
const seguro = js => js.replace(/<\/script>/gi, '<\\/script>');

/* ⚠ SE REEMPLAZA CON UNA FUNCIÓN, NO CON UNA CADENA, y aquí está el porqué
   porque costó encontrarlo: `String.replace` interpreta `$&`, `$'`, `` $` ``
   y `$$` DENTRO del texto de reemplazo. Y nuestro propio código los
   contiene: `excel.js` lleva `"$"#,##0.00` —el formato de moneda— que
   contiene `$&`, y `app.js` lleva `'$' + x.toLocaleString(...)`, que
   contiene `$'`. Con reemplazo por cadena, `$&` volvía a pegar el trozo
   original —las etiquetas `<script src=…>`— dentro del archivo, y el
   resultado era un HTML que pedía archivos que no estaban. Pasar una
   función apaga esa expansión por completo. */
const pon = txt => () => txt;

let out = html
  .replace('<link rel="stylesheet" href="estilo.css">', pon(`<style>\n${css}\n</style>`))
  .replace(/<script src="motor\.js"><\/script>\s*<script src="excel\.js"><\/script>\s*<script src="datos\.js"><\/script>\s*<script src="app\.js"><\/script>/,
    pon(`<script>\n${seguro(motor)}\n</script>\n<script>\n${seguro(excel)}\n</script>\n` +
        `<script>\n${seguro(datos)}\n</script>\n<script>\n${seguro(app)}\n</script>`));

/* Si alguna sustitución no encajó, el archivo saldría pidiendo archivos que
   no existen y fallaría EN SILENCIO al abrirlo. Mejor reventar aquí. */
const problemas = [];
if(out.includes('href="estilo.css"')) problemas.push('el CSS no se incrustó');
if(out.includes('src="motor.js"'))    problemas.push('los scripts no se incrustaron');
if(problemas.length){ console.error('✗ ' + problemas.join(' · ')); process.exit(1); }

out = out.replace('<title>', `<!-- Archivo GENERADO por armar-suelto.mjs · ${new Date().toISOString().slice(0,10)}.
     No se edita a mano: se cambian los originales y se vuelve a generar. -->
<title>`);

await writeFile(join(DIR, 'jabonera.html'), out);
console.log(`✓ jabonera.html · ${(out.length/1024).toFixed(1)} KB · un solo archivo, sin internet`);
