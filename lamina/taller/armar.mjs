/* Arma la lámina: un archivo autónomo con la fuente, el logo y las 350 piezas
   dentro. Sin build, sin CDN, sin una sola petición ajena.
     node lamina/taller/armar.mjs <raíz del repo> <salida.html> */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const RAIZ = process.argv[2], SALIDA = process.argv[3];
const AQUI = dirname(new URL(import.meta.url).pathname);
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ── las 350 · sólo las áreas nuevas del departamento de diseño ───────── */
const yaEstaban = execSync('git ls-tree --name-only origin/main cerebro/neuronas/', { cwd:RAIZ })
  .toString().trim().split('\n').map(x => x.split('/').pop());
const areas = [], neuronas = [];
for(const f of readdirSync(join(RAIZ,'cerebro/neuronas')).sort()){
  if(yaEstaban.includes(f)) continue;
  const j = JSON.parse(readFileSync(join(RAIZ,'cerebro/neuronas',f),'utf8'));
  areas.push({ a:j.area, nombre:j.nombre, que:j.que, n:j.neuronas.length });
  j.neuronas.forEach(n => neuronas.push(Object.assign({ area:j.area }, n)));
}
if(neuronas.length < 350) throw new Error('esperaba 350 piezas y hay ' + neuronas.length);

/* ── el atlas, en HTML de verdad ─────────────────────────────────────── */
const atlas = areas.map((x,i) =>
  `<button class="area" type="button" data-area="${esc(x.a)}">`
  + `<span class="n">${('0'+(i+1)).slice(-2)}</span>`
  + `<span class="nom">${esc(x.nombre)}</span>`
  + `<span class="cuenta">${x.n} ${x.n===1?'pieza':'piezas'}</span></button>`).join('');

/* ── el índice de las 350, agrupado por área ─────────────────────────── */
const indice = areas.map(x => {
  const suyas = neuronas.filter(n => n.area === x.a);
  return `<a class="clase" style="border:0;color:var(--tenue);margin-top:1rem" href="#consulta">${esc(x.a)}</a>`
       + suyas.map(n => `<a href="#consulta" data-id="${esc(n.id)}">${esc(n.titulo)}</a>`).join('');
}).join('');

/* ── los instrumentos, leídos de las skills ──────────────────────────── */
const DEL_DEPARTAMENTO = ['entrega-de-diseno','color-que-se-lee','tipografia-de-oficio',
  'reticula-y-ritmo','jerarquia-que-guia','profundidad-y-sombra','movimiento-honesto',
  'estados-completos','pantalla-vacia','formulario-que-no-pierde','foco-y-teclado',
  'imagen-que-no-empuja','rendimiento-que-se-siente','modo-oscuro','sistema-de-iconos',
  'tabla-en-un-telefono','texto-de-interfaz','marca-en-la-interfaz',
  'antes-de-copiar-un-estilo','detalles-finales','ojos'];
const skills = DEL_DEPARTAMENTO.map(nombre => {
  const t = readFileSync(join(RAIZ,'.claude/skills',nombre,'SKILL.md'),'utf8');
  const d = /^description:\s*(.+)$/m.exec(t)[1];
  /* del «description» se toma sólo la primera frase: la lista de disparadores
     es para el enrutador, no para una tabla que alguien lee */
  const corta = d.split(/\s+Úsala\s/)[0].replace(/\s*—\s*$/,'');
  return `<tr><td><code>${esc(nombre)}</code></td><td>${esc(corta)}</td></tr>`;
}).join('');

/* ── las fuentes, con el conteo real de la cosecha ───────────────────── */
const FUENTES = [
  ['W3C · WAI', 'Norma', 262], ['MDN', 'Motor', 718], ['web.dev', 'Motor', 52],
  ['Smashing Magazine', 'Oficio', 1268], ['CSS-Tricks', 'Oficio', 2855],
  ['A List Apart', 'Oficio', 61], ['Nielsen Norman Group', 'Oficio', 298],
  ['Practical Typography', 'Oficio', 156],
];
const fuentes = FUENTES.map(([casa,papel,n]) =>
  `<tr><td>${esc(casa)}</td><td>${esc(papel)}</td><td class="cifra">${n.toLocaleString('es-MX')}</td></tr>`).join('');

/* ── la fuente y el logo, dentro del archivo ─────────────────────────── */
const fuente = readFileSync(join(RAIZ,'sitio/fuente/mazi.woff2')).toString('base64');
const logo = readFileSync(join(RAIZ,'marca/logo/paloma-simple.svg'),'utf8')
  .replace(/<\?xml[^>]*\?>/g,'').replace(/<!--[\s\S]*?-->/g,'')
  .replace(/\s*width="[^"]*"/,'').replace(/\s*height="[^"]*"/,'')
  .replace(/<svg /,'<svg style="width:100%;height:100%;display:block;fill:currentColor" ').trim();

const css = readFileSync(join(AQUI,'estilo.css'),'utf8').replace('__FUENTE__', fuente);
const cuerpo = readFileSync(join(AQUI,'cuerpo.html'),'utf8')
  .replace('__ATLAS__', atlas).replace('__INDICE__', indice)
  .replace('__SKILLS__', skills).replace('__FUENTES__', fuentes)
  .replace('__LOGO__', logo);
const motor = readFileSync(join(AQUI,'motor.js'),'utf8');

const html = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Lámina · Atlas de los defectos del diseño web · Grupo Mazi</title>
<meta name="description" content="350 piezas de conocimiento sobre lo que se rompe en una pantalla, por qué se rompe y cómo se caza antes de que llegue al papel. Departamento de diseño de Grupo Mazi.">
<meta name="theme-color" content="#F2EFE9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#12101A" media="(prefers-color-scheme: dark)">
<script>
/* El tema se aplica ANTES de pintar. Aplicarlo después deja un destello del
   tema equivocado en cada carga, y ese destello se ve siempre. */
try{ var t = localStorage.getItem('lamina_tema');
     if(t) document.documentElement.setAttribute('data-tema', t); }catch(e){}
</script>
<style>
${css}
</style>
</head>
<body>
${cuerpo}
<script>
var NEURONAS = ${JSON.stringify(neuronas)};
${motor}
</script>
</body>
</html>
`;

writeFileSync(SALIDA, html);
console.log('lámina escrita · ' + (html.length/1024).toFixed(0) + ' KB'
  + ' · comprimida ' + (gzipSync(html).length/1024).toFixed(0) + ' KB'
  + ' · ' + neuronas.length + ' piezas en ' + areas.length + ' áreas');
