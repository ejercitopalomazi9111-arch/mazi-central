/* Arma los diez instrumentos del taller de negocios, cada uno en un archivo
   autónomo, más el índice. Sin build, sin CDN y sin peticiones ajenas.
     node taller-negocios/taller/armar.mjs <raíz del repo> <carpeta de salida>

   Cada instrumento es un módulo en `piezas/` que exporta:
     { id, n, materia, nombre, que, intro, campos, calcular, ayuda }
   El motor es el mismo para los diez: pinta los campos, recalcula al mover
   cualquiera, y enseña la lectura con su veredicto. Diez motores distintos
   habrían sido diez sitios donde arreglar el mismo defecto. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const RAIZ = process.argv[2], SALIDA = process.argv[3];
const AQUI = dirname(new URL(import.meta.url).pathname);
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* Las cuatro caras van empotradas: el taller es un archivo por instrumento y
   tiene que abrirse desde un correo o una memoria, sin red. */
const empotrar = (n) => readFileSync(join(AQUI,'fuentes',n)).toString('base64');
const logo = readFileSync(join(RAIZ,'marca/logo/paloma-simple.svg'),'utf8')
  .replace(/<\?xml[^>]*\?>/g,'').replace(/<!--[\s\S]*?-->/g,'')
  .replace(/\s*width="[^"]*"/,'').replace(/\s*height="[^"]*"/,'')
  .replace(/<svg /,'<svg style="width:100%;height:100%;display:block;fill:currentColor" ').trim();
const css = readFileSync(join(AQUI,'estilo.css'),'utf8')
  .replace('__UI__',      empotrar('ui.woff2'))
  .replace('__UI_B__',    empotrar('ui-b.woff2'))
  .replace('__CIFRA__',   empotrar('cifra.woff2'))
  .replace('__CIFRA_B__', empotrar('cifra-b.woff2'));
const motor = readFileSync(join(AQUI,'motor.js'),'utf8');

const PIEZAS = readdirSync(join(AQUI,'piezas')).filter(f => f.endsWith('.js')).sort();
const piezas = [];
for(const f of PIEZAS){
  const m = await import(join(AQUI,'piezas',f));
  piezas.push(m.PIEZA);
}
piezas.sort((a,b) => a.n - b.n);

const tapa = (volver) => `<header class="tapa"><div class="caja fila">
<a href="${volver ? './' : '#'}" class="paloma" aria-label="Índice del taller">${logo}</a>
<a href="${volver ? './' : '#'}" class="casa">Grupo Mazi · El taller</a>
${volver ? '<a class="volver" href="./">Los diez</a>' : ''}
</div></header>`;

const pagina = (titulo, desc, cuerpo, guion) => `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0E0A14" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F3F1F5" media="(prefers-color-scheme: light)">
<style>
${css}
</style>
</head>
<body>
${cuerpo}
${guion || ''}
</body>
</html>
`;

mkdirSync(SALIDA, { recursive:true });

/* ── el índice ───────────────────────────────────────────────────────── */
const rejilla = piezas.map(p =>
  `<a class="pieza" href="./${esc(p.id)}.html">`
  + `<span class="n">${String(p.n).padStart(2,'0')} · ${esc(p.materia)}</span>`
  + `<span class="m">${esc(p.nombre)}</span>`
  + `<span class="q">${esc(p.que)}</span></a>`).join('');

writeFileSync(join(SALIDA,'index.html'), pagina(
  'El taller · diez instrumentos de negocio · Grupo Mazi',
  'Diez herramientas que calculan algo y dan un veredicto, una por cada materia del programa de Grupo Mazi.',
  `${tapa(false)}
<main class="caja">
  <div class="encabeza">
    <p class="num">Grupo Mazi · Departamento de negocios</p>
    <h1>El taller</h1>
    <p>Diez instrumentos, uno por materia. Ninguno es un cuestionario:
    cada uno <b>calcula algo</b> con lo que le das y devuelve un veredicto que
    se puede discutir.</p>
  </div>
  <h2>Los diez</h2>
  <div class="rejilla">${rejilla}</div>
  <div class="nota"><b>Todos funcionan sin conexión y sin cuenta.</b> Cada uno
  es un archivo: la tipografía va dentro y no hay una sola petición a un
  servidor ajeno. Lo que escribes no sale de tu aparato — no hay a dónde
  mandarlo.</div>
  <div class="nota"><b>Y ninguno decide por ti.</b> Un instrumento que da un
  número exacto sobre algo que no se puede medir con exactitud está mintiendo.
  Éstos dicen de dónde sale cada cifra y qué NO están midiendo.</div>
</main>
<footer class="caja">Grupo Mazi · si no existe la herramienta, se construye la herramienta.</footer>`));

/* ── los diez ────────────────────────────────────────────────────────── */
for(const p of piezas){
  writeFileSync(join(SALIDA, p.id + '.html'), pagina(
    p.nombre + ' · El taller · Grupo Mazi', p.que,
    `${tapa(true)}
<main class="caja">
  <div class="encabeza">
    <p class="num">${String(p.n).padStart(2,'0')} · ${esc(p.materia)}</p>
    <h1>${esc(p.nombre)}</h1>
    <p>${esc(p.que)}</p>
  </div>
  ${p.intro || ''}
  <div id="campos"></div>
  <div id="lectura"></div>
  <div class="acciones">
    <button class="btn" id="bImprimir" type="button">Imprimir la hoja</button>
    <button class="btn hueco" id="bLimpiar" type="button">Empezar de nuevo</button>
  </div>
  ${p.ayuda || ''}
</main>
<footer class="caja">Grupo Mazi · El taller · instrumento ${String(p.n).padStart(2,'0')} de 10.</footer>`,
    `<script>\nvar PIEZA = ${JSON.stringify({ id:p.id, campos:p.campos })};\n`
    + `PIEZA.calcular = ${p.calcular.toString()};\n${motor}\n</script>`));
}

console.log('taller armado · ' + (piezas.length + 1) + ' páginas en ' + SALIDA);
for(const p of piezas) console.log('  ' + String(p.n).padStart(2,'0') + ' · ' + p.nombre);
