/* Arma la lámina: un archivo autónomo con las fuentes y las piezas dentro.
     node lamina/taller/armar.mjs <raíz del repo> <salida.html>

   ⚠ LAS ÁREAS YA NO SE DEDUCEN DE UNA RAMA. La versión anterior las sacaba
   comparando contra `origin/main` con un `git ls-tree`: servía mientras las
   áreas nuevas estuvieran sin fusionar, y el día que se fusionaron el atlas se
   habría quedado vacío sin que nada avisara. Ahora la agrupación está escrita
   en `sistemas.js`, que además es lo correcto: qué área pertenece a qué
   sistema es una decisión editorial, no un efecto secundario de git. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { SISTEMAS } from './sistemas.js';

const RAIZ = process.argv[2], SALIDA = process.argv[3];
if(!RAIZ || !SALIDA){ console.error('uso: node armar.mjs <raíz> <salida.html>'); process.exit(1); }
const AQUI = dirname(new URL(import.meta.url).pathname);
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ── las piezas: sólo las áreas que algún sistema reclama ─────────────── */
const QUIERE = new Set(SISTEMAS.flatMap(s => s.areas));
const areas = [], neuronas = [];
for(const f of readdirSync(join(RAIZ,'cerebro/neuronas')).sort()){
  if(!f.endsWith('.json')) continue;
  const j = JSON.parse(readFileSync(join(RAIZ,'cerebro/neuronas',f),'utf8'));
  if(!QUIERE.has(j.area)) continue;
  areas.push({ a:j.area, nombre:j.nombre, que:j.que, n:j.neuronas.length });
  j.neuronas.forEach(n => neuronas.push(Object.assign({ area:j.area }, n)));
}
/* ⚠ QUE REVIENTE SI FALTA UN ÁREA. Si `sistemas.js` nombra un área que no
   existe, el menú se queda con un hueco silencioso: una tarjeta que no lleva a
   ningún sitio y que nadie relaciona con un fichero renombrado. */
const faltan = [...QUIERE].filter(a => !areas.some(x => x.a === a));
if(faltan.length) throw new Error('sistemas.js nombra áreas que no existen: ' + faltan.join(', '));
if(neuronas.length < 300) throw new Error('esperaba 300+ piezas y hay ' + neuronas.length);

/* ── las cuatro caras, dentro del archivo ─────────────────────────────── */
const empotrar = (n) => readFileSync(join(AQUI,'fuentes',n)).toString('base64');
const css = readFileSync(join(AQUI,'estilo.css'),'utf8')
  .replace('__ROTULO__',  empotrar('rotulo.woff2'))
  .replace('__TEXTO__',   empotrar('texto.woff2'))
  .replace('__TEXTO_B__', empotrar('texto-b.woff2'))
  .replace('__CIFRA__',   empotrar('cifra.woff2'));

/* ── EL ATLAS SIN JAVASCRIPT ───────────────────────────────────────────
   ⚠ SIN ESTO LA PÁGINA SE QUEDA VACÍA CON EL JS APAGADO, y la regla de la casa
   es que el contenido se vea completo y quieto, nunca a medias. Los tres
   niveles del menú los pinta el motor, así que sin motor no hay ni una pieza:
   ni se lee, ni se busca con Ctrl+F, ni sale en un buscador.

   Se hornea el atlas entero —los seis sistemas, sus áreas y las 353 piezas con
   su síntoma— en HTML de verdad. Las fichas completas sí necesitan JavaScript
   y la propia página lo dice: prometer menos y cumplirlo es mejor que
   prometerlo todo. */
const atlasPlano = SISTEMAS.map(s => {
  const suyas = s.areas.map(a => {
    const d = areas.find(x => x.a === a);
    const piezas = neuronas.filter(n => n.area === a);
    return `<h4>${esc(d.nombre)} <span>${piezas.length} piezas</span></h4>`
      + `<ul>${piezas.map(n =>
          `<li><b>${esc(n.titulo)}</b><br>${esc(n.sintoma || '')}</li>`).join('')}</ul>`;
  }).join('');
  return `<section><h3>${s.n} · ${esc(s.nombre)}</h3><p>${esc(s.lema)}</p>${suyas}</section>`;
}).join('');

const cuerpo = readFileSync(join(AQUI,'cuerpo.html'),'utf8')
  .replace('__ATLAS_PLANO__', atlasPlano);
const motor  = readFileSync(join(AQUI,'motor.js'),'utf8');

const html = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Lámina · Atlas de los defectos del diseño web</title>
<meta name="description" content="${esc(neuronas.length)} piezas de conocimiento sobre lo que se rompe en una pantalla, por qué se rompe y cómo se caza antes de que llegue al papel. Departamento de diseño de Grupo Mazi.">
<meta name="theme-color" content="#050D0C">
<link rel="icon" href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23050D0C"/><circle cx="16" cy="16" r="9" fill="none" stroke="%2352D9C0" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="%2352D9C0"/></svg>'>
<style>
${css}
</style>
</head>
<body>
${cuerpo}
<script>
var SISTEMAS = ${JSON.stringify(SISTEMAS)};
var AREAS    = ${JSON.stringify(areas)};
var NEURONAS = ${JSON.stringify(neuronas)};
</script>
<script>
${motor}
</script>
</body>
</html>
`;
writeFileSync(SALIDA, html);
const kb = (n) => (n/1024).toFixed(0) + ' KB';
console.log(`lámina escrita · ${kb(Buffer.byteLength(html))} · comprimida ${kb(gzipSync(html).length)}`);
console.log(`  ${neuronas.length} piezas · ${areas.length} áreas · ${SISTEMAS.length} sistemas`);
for(const s of SISTEMAS)
  console.log(`  ${s.n} · ${s.nombre.padEnd(20)} ${String(s.areas.length).padStart(2)} áreas · ` +
    s.areas.reduce((t,a) => t + (areas.find(x => x.a === a)?.n || 0), 0) + ' piezas');
